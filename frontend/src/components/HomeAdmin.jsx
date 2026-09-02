import API_BASE_URL from "../apiConfig";
import { getAuthHeaders } from "../utils/auth";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../contexts/SocketContext";
import useAttendanceRecordInfoSocket from "../hooks/useAttendanceRecordInfoSocket";
import {
  Container,
  Box,
  Grid,
  Dialog,
  Typography,
  Avatar,
  Button,
  IconButton,
  Tooltip,
  Modal,
  Badge,
  Paper,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Fade,
  Grow,
  Skeleton,
  Menu,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  TextField,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  alpha,
  styled,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  ArrowDropDown as ArrowDropDownIcon,
  AccessTime,
  Receipt,
  ContactPage,
  UploadFile,
  Person,
  GroupAdd,
  TransferWithinAStation,
  Group,
  Pages,
  ReceiptLong,
  AcUnit,
  TrendingUp,
  TrendingDown,
  ArrowForward,
  PlayArrow,
  Pause,
  MoreVert,
  AccountCircle,
  Settings,
  HelpOutline,
  PrivacyTip,
  Logout,
  Login,
  Event,
  Schedule,
  Lock,
  Star,
  Upgrade,
  Add,
  Close,
  Money,
  Work,
  Assessment,
  Timeline,
  Delete,
  Edit,
  Build,
  PersonAdd,
  Save,
  Flag,
  Category as CategoryIcon,
  CalendarMonth,
  Note,
  Refresh,
  Face,
  FiberManualRecord,
} from "@mui/icons-material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import PeopleIcon from "@mui/icons-material/People";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import PaymentIcon from "@mui/icons-material/Payment";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DescriptionIcon from "@mui/icons-material/Description";
import CampaignIcon from "@mui/icons-material/Campaign";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CloseIcon from "@mui/icons-material/Close";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import {
  WorkHistory as WorkHistoryIcon,
  ReceiptLong as ReceiptLongIcon,
  HourglassBottom as HourglassBottomIcon,
  History,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
} from "recharts";
import logo from "../assets/logo.PNG";
import SuccessfulOverlay from "./SuccessfulOverlay";

// ─── Design tokens (mirroring AttendanceUserState) ───────────────────────────
const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover: "rgba(109,35,35,0.10)",
  rowOdd: "rgba(109,35,35,0.025)",
  rowHover: "rgba(109,35,35,0.055)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  surface: "#ffffff",
  divider: "rgba(0,0,0,0.08)",
};

// ─── Shimmer keyframes ────────────────────────────────────────────────────────
const shimmerKf = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
* { font-family: 'Poppins', sans-serif !important; }
@keyframes shimmer { 0% { background-position: -800px 0; } 100% { background-position: 800px 0; } }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
`;

// ─── Shimmer bone ─────────────────────────────────────────────────────────────
const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w,
      height: h,
      borderRadius: r,
      background:
        "linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)",
      backgroundSize: "800px 100%",
      animation: "shimmer 1.6s infinite linear",
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Styled primitives ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: "#fff",
});

// ─── Panel header bar ─────────────────────────────────────────────────────────
const PanelHeader = ({ icon: Icon, title, right }) => (
  <Box
    sx={{
      px: 2.5,
      py: 1.25,
      borderBottom: `1px solid ${T.divider}`,
      display: "flex",
      alignItems: "center",
      gap: 1.25,
      bgcolor: T.accentFaint,
      minHeight: 42,
    }}
  >
    {Icon && <Icon sx={{ fontSize: 14, color: T.accent }} />}
    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent }}>
      {title}
    </Typography>
    {right && (
      <>
        <Box sx={{ flex: 1 }} />
        {right}
      </>
    )}
  </Box>
);

// ─── Flat tab component ───────────────────────────────────────────────────────
const FlatTab = ({ label, icon: Icon, badge, active, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 0.75,
      py: 0.9,
      px: 1,
      cursor: "pointer",
      userSelect: "none",
      borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
      color: active ? T.accent : T.muted,
      bgcolor: "transparent",
      transition: "all 0.16s ease",
      "&:hover": {
        color: T.accent,
        bgcolor: T.accentFaint,
      },
      "&:active": { transform: "scale(0.98)" },
    }}
  >
    {Icon && <Icon sx={{ fontSize: 13, color: "inherit" }} />}
    <Typography
      sx={{
        fontSize: "0.75rem",
        fontWeight: active ? 700 : 500,
        color: "inherit",
        lineHeight: 1,
      }}
    >
      {label}
    </Typography>
    {badge !== undefined && (
      <Box
        sx={{
          fontSize: "0.6rem",
          fontWeight: 700,
          px: 0.75,
          py: 0.1,
          borderRadius: "99px",
          bgcolor: active ? `${T.accent}18` : `${T.accent}0D`,
          color: active ? T.accent : T.muted,
          lineHeight: 1.7,
          minWidth: 20,
          textAlign: "center",
          transition: "all 0.16s",
        }}
      >
        {badge}
      </Box>
    )}
  </Box>
);

// ─── Tab bar container ────────────────────────────────────────────────────────
const TabBar = ({ children, right }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "stretch",
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: "#fff",
      px: 0.5,
      minHeight: 40,
      flexShrink: 0,
    }}
  >
    {children}
    {right && (
      <>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: "flex", alignItems: "center", pr: 0.75 }}>
          {right}
        </Box>
      </>
    )}
  </Box>
);

// ─── helpers ──────────────────────────────────────────────────────────────────
const getUserRole = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const payload = JSON.parse(jsonPayload);
    return payload.role || payload.userRole || null;
  } catch (error) {
    console.error("Error parsing token:", error);
    return null;
  }
};

const getStaticBaseUrl = () => {
  if (!API_BASE_URL) return "";
  let base = API_BASE_URL.replace(/\/+$/, "");
  base = base.replace(/\/api$/i, "");
  return base;
};

const buildImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (typeof imagePath === "string") {
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
      return imagePath;
    if (imagePath.startsWith("/uploads"))
      return `${getStaticBaseUrl()}${imagePath}`;
  }
  return imagePath;
};

// ─── session-storage cache helpers ───────────────────────────────────────────
const CACHE_TTL_MS = 60_000;
const readCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};
const writeCache = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* quota */
  }
};

// ─── Ticket status badge ──────────────────────────────────────────────────────
const TICKET_STATUS_STYLE = {
  new: { bg: "#fef3c7", color: "#92400e", border: "#d97706" },
  read: { bg: "#dbeafe", color: "#1e3a5f", border: "#2563eb" },
  replied: { bg: "#dcfce7", color: "#14532d", border: "#16a34a" },
  on_process: { bg: "#ffedd5", color: "#7c2d12", border: "#fb923c" },
  resolved: { bg: "#f3f4f6", color: "#374151", border: "#6b7280" },
};
const TICKET_STATUS_LABEL = {
  new: "New",
  read: "Read",
  replied: "Replied",
  on_process: "On Process",
  resolved: "Resolved",
};

const TicketStatusBadge = ({ notifId, contactTicketStatuses }) => {
  const ticketStatus = (contactTicketStatuses || {})[notifId] || "new";
  const s = TICKET_STATUS_STYLE[ticketStatus] || TICKET_STATUS_STYLE.new;
  return (
    <Box
      sx={{
        px: 1.25,
        py: 0.2,
        bgcolor: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: "20px",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <Typography
        sx={{
          fontSize: "0.6rem",
          fontWeight: 900,
          color: s.color,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {TICKET_STATUS_LABEL[ticketStatus] || ticketStatus}
      </Typography>
    </Box>
  );
};

// ─── Notification Filter Dropdown ─────────────────────────────────────────────
const NOTIF_FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "payslip", label: "Payslip" },
  { key: "contact", label: "Tickets" },
  { key: "announcement", label: "Announcements" },
  { key: "holiday", label: "Holidays" },
  { key: "suspension", label: "Suspensions" },
];

const NotifFilterChips = ({
  activeFilter,
  onChange,
  settings,
  unreadCount,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const activeLabel =
    NOTIF_FILTERS.find((f) => f.key === activeFilter)?.label || "All";

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={
          <ArrowDropDownIcon
            sx={{
              fontSize: 15,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
        }
        sx={{
          minWidth: 74,
          height: 26,
          px: 0.85,
          py: 0.35,
          borderRadius: "8px",
          textTransform: "none",
          fontSize: "0.68rem",
          fontWeight: 500,
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.28)",
          bgcolor: "rgba(255,255,255,0.15)",
          "&:hover": {
            bgcolor: "rgba(255,255,255,0.22)",
            borderColor: "rgba(255,255,255,0.32)",
          },
          "& .MuiButton-endIcon": { ml: 0.3 },
        }}
      >
        {activeLabel}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 0.6,
            minWidth: 170,
            borderRadius: "10px",
            border: `1px solid ${T.accentBorder}`,
            boxShadow: "0 10px 28px rgba(0,0,0,0.14)",
            overflow: "hidden",
          },
        }}
      >
        {NOTIF_FILTERS.map(({ key, label }) => {
          const active = key === activeFilter;
          return (
            <MenuItem
              key={key}
              onClick={() => {
                onChange(key);
                setAnchorEl(null);
              }}
              sx={{
                py: 0.9,
                fontSize: "0.74rem",
                color: active ? T.accent : T.text,
                fontWeight: active ? 700 : 400,
                bgcolor: active ? T.accentFaint : "transparent",
                "&:hover": { bgcolor: T.accentHover },
                display: "flex",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <Typography sx={{ fontSize: "0.74rem", fontWeight: "inherit" }}>
                  {label}
                </Typography>
                {key === "unread" && unreadCount > 0 && (
                  <Typography
                    sx={{
                      fontSize: "0.66rem",
                      color: T.accent,
                      fontWeight: 700,
                    }}
                  >
                    {unreadCount}
                  </Typography>
                )}
              </Box>
              {active && (
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    bgcolor: T.accent,
                    color: "#fff",
                    fontSize: "0.62rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  ✓
                </Box>
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

// ─── system settings ──────────────────────────────────────────────────────────
const useSystemSettings = () => {
  const [settings, setSettings] = useState({
    primaryColor: "#894444",
    secondaryColor: "#6d2323",
    accentColor: "#FEF9E1",
    textColor: "#FFFFFF",
    textPrimaryColor: "#6D2323",
    textSecondaryColor: "#FEF9E1",
    hoverColor: "#6D2323",
    backgroundColor: "#FFFFFF",
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem("systemSettings");
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch {
        /* ignore */
      }
    }
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes("/api")
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;
        const response = await axios.get(url);
        setSettings(response.data);
        localStorage.setItem("systemSettings", JSON.stringify(response.data));
      } catch (error) {
        console.error("Error fetching system settings:", error);
      }
    };
    fetchSettings();
  }, []);

  return settings;
};

// ─── static config ────────────────────────────────────────────────────────────
const STAT_CARDS = (settings) => [
  {
    label: "Total Employees",
    valueKey: "employees",
    defaultValue: 0,
    textValue: "Total Employees",
    icon: <PeopleIcon />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
    shadow: `0 15px 40px ${settings.primaryColor}33`,
  },
  {
    label: "Present Today",
    valueKey: "todayAttendance",
    defaultValue: 0,
    textValue: "Today's Attendance",
    icon: <EventAvailableIcon />,
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
    shadow: `0 15px 40px ${settings.primaryColor}33`,
  },
  {
    label: "Pending Payroll",
    valueKey: "pendingPayroll",
    defaultValue: 0,
    textValue: "Payroll Processing",
    icon: <PendingActionsIcon />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
    shadow: `0 15px 40px ${settings.primaryColor}33`,
  },
  {
    label: "Processed Payroll",
    valueKey: "processedPayroll",
    defaultValue: 0,
    textValue: "Payroll Processed",
    icon: <WorkHistoryIcon />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
    shadow: `0 15px 40px ${settings.primaryColor}33`,
  },
  {
    label: "Released Payslips",
    valueKey: "payslipCount",
    defaultValue: 0,
    textValue: "Payslip Released",
    icon: <ReceiptLongIcon />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
    shadow: `0 15px 40px ${settings.primaryColor}33`,
  },
];

const QUICK_ACTIONS = (settings) => [
  {
    label: "Users",
    link: "/users-list",
    icon: <Group />,
    tooltip: "Users Management",
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
  },
  {
    label: "Payroll",
    link: "/payroll-table",
    icon: <PaymentsIcon />,
    tooltip: "Payroll Processing",
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
  },
  {
    label: "Category",
    link: "/employee-category",
    icon: <CategoryIcon />,
    tooltip: "Employment Category",
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
  },
  {
    label: "O-DTRs",
    link: "/daily_time_record_faculty",
    icon: <AccessTimeIcon />,
    tooltip: "Overall Daily Time Records",
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
  },
  {
    label: "Announce",
    link: "/announcement",
    icon: <CampaignIcon />,
    tooltip: "Announcements/Suspensions/Holidays",
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
  },
  {
    label: "Audit Logs",
    link: "/audit-logs",
    icon: <History />,
    tooltip: "Audit Logs",
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
    restricted: true,
  },
  {
    label: "Registration",
    link: "/registration",
    icon: <PersonAdd />,
    tooltip: "Registration",
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
  },
  {
    label: "Payslip",
    link: "/distribution-payslip",
    icon: <PersonAdd />,
    tooltip: "Payslip Distribution",
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
  },
  {
    label: "Leaves",
    link: "/leave-request",
    icon: <EventAvailableIcon />,
    tooltip: "Leaves Management",
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
  },
];

// ─── auth hook ────────────────────────────────────────────────────────────────
const useAuth = () => {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);

  const getUserInfo = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      return {
        role: decoded.role,
        employeeNumber: decoded.employeeNumber,
        username: decoded.username,
      };
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const u = getUserInfo();
    if (u.username) setUsername(u.username);
    if (u.employeeNumber) setEmployeeNumber(u.employeeNumber);
  }, [getUserInfo]);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/personalinfo/person_table`,
          getAuthHeaders(),
        );
        const list = Array.isArray(res.data) ? res.data : [];
        const match = list.find(
          (p) => String(p.agencyEmployeeNum) === String(employeeNumber),
        );
        if (match) {
          if (match.profile_picture) setProfilePicture(match.profile_picture);
          const fullNameFromPerson =
            `${match.firstName || ""} ${match.middleName || ""} ${match.lastName || ""} ${match.nameExtension || ""}`.trim();
          if (fullNameFromPerson) setFullName(fullNameFromPerson);
        }
      } catch (err) {
        console.error("Error loading profile picture:", err);
      }
    };
    if (employeeNumber) fetchProfilePicture();
  }, [employeeNumber]);

  return { username, fullName, employeeNumber, profilePicture };
};

// ─── dashboard data hook ──────────────────────────────────────────────────────
const useDashboardData = (settings) => {
  const { socket, connected } = useSocket();
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [stats, setStats] = useState({
    employees: 0,
    turnoverRate: 32,
    happinessRate: 78,
    teamKPI: 84.45,
    todayAttendance: 0,
    pendingPayroll: 0,
    processedPayroll: 0,
    payslipCount: 0,
  });
  const [weeklyAttendanceData, setWeeklyAttendanceData] = useState([]);
  const [departmentAttendanceData, setDepartmentAttendanceData] = useState([]);
  const [payrollStatusData, setPayrollStatusData] = useState([
    { status: "Processed", value: 0, fill: "#800020" },
    { status: "Pending", value: 0, fill: "#A52A2A" },
    { status: "Failed", value: 0, fill: "#f44336" },
  ]);
  const [monthlyAttendanceTrend, setMonthlyAttendanceTrend] = useState([
    { month: "Jan", attendance: 94.2, leaves: 8.5, overtime: 12.3 },
    { month: "Feb", attendance: 93.8, leaves: 9.2, overtime: 11.8 },
    { month: "Mar", attendance: 95.1, leaves: 7.8, overtime: 13.5 },
    { month: "Apr", attendance: 94.7, leaves: 8.9, overtime: 12.1 },
    { month: "May", attendance: 93.5, leaves: 10.2, overtime: 10.8 },
    { month: "Jun", attendance: 94.0, leaves: 9.1, overtime: 11.5 },
  ]);
  const [payrollTrendData] = useState([
    { month: "Jan", grossPay: 2450000, netPay: 1980000, deductions: 470000 },
    { month: "Feb", grossPay: 2480000, netPay: 2005000, deductions: 475000 },
    { month: "Mar", grossPay: 2520000, netPay: 2030000, deductions: 490000 },
    { month: "Apr", grossPay: 2490000, netPay: 2010000, deductions: 480000 },
    { month: "May", grossPay: 2550000, netPay: 2050000, deductions: 500000 },
    { month: "Jun", grossPay: 2580000, netPay: 2075000, deductions: 505000 },
  ]);
  const [attendanceChartData, setAttendanceChartData] = useState([
    { name: "Present", value: 0, fill: "#800020" },
    { name: "Absent", value: 0, fill: "#A52A2A" },
    { name: "Late", value: 0, fill: "#8B0000" },
  ]);
  const [announcements, setAnnouncements] = useState([]);
  const [suspensions, setSuspensions] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [rawHolidays, setRawHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCarousel, setLoadingCarousel] = useState(true);
  const [loadingPayroll, setLoadingPayroll] = useState(true);

  useEffect(() => {
    setAttendanceChartData((prev) =>
      prev.map((item, idx) => ({
        ...item,
        fill:
          idx === 0
            ? settings.primaryColor
            : idx === 1
              ? settings.secondaryColor
              : settings.hoverColor,
      })),
    );
    setPayrollStatusData((prev) =>
      prev.map((item, idx) => ({
        ...item,
        fill:
          idx === 0
            ? settings.primaryColor
            : idx === 1
              ? settings.secondaryColor
              : settings.hoverColor,
      })),
    );
  }, [settings.primaryColor, settings.secondaryColor, settings.hoverColor]);

  const fetchAllDataRef = useRef(null);
  fetchAllDataRef.current = () => {
    const s = settingsRef.current;
    const auth = getAuthHeaders();

    setLoading(true);
    setLoadingPayroll(true);
    setLoadingCarousel(true);

    axios
      .get(`${API_BASE_URL}/api/dashboard/stats`, auth)
      .then((res) => {
        const dashStats = res.data;
        const totalEmp = dashStats.totalEmployees || 0;
        const presentToday = dashStats.presentToday || 0;
        setStats((prev) => ({
          ...prev,
          employees: totalEmp,
          todayAttendance: presentToday,
        }));
        setAttendanceChartData([
          { name: "Present", value: presentToday, fill: s.primaryColor },
          {
            name: "Absent",
            value: totalEmp - presentToday,
            fill: s.secondaryColor,
          },
          { name: "Late", value: 0, fill: s.hoverColor },
        ]);
      })
      .catch((err) => console.error("dashboard stats failed:", err?.message))
      .finally(() => setLoading(false));

    axios
      .get(`${API_BASE_URL}/api/dashboard/payroll-summary`, auth)
      .then((res) => {
        const p = res.data;
        setStats((prev) => ({
          ...prev,
          pendingPayroll: p.pending || 0,
          processedPayroll: p.processed || 0,
        }));
        setPayrollStatusData([
          {
            status: "Processed",
            value: p.processed || 0,
            fill: s.primaryColor,
          },
          { status: "Pending", value: p.pending || 0, fill: s.secondaryColor },
          { status: "Failed", value: 0, fill: s.hoverColor },
        ]);
      })
      .catch((err) => console.error("payroll summary failed:", err?.message))
      .finally(() => setLoadingPayroll(false));

    Promise.allSettled([
      axios.get(`${API_BASE_URL}/api/announcements`, auth),
      axios.get(`${API_BASE_URL}/api/suspensions`, auth),
      axios.get(`${API_BASE_URL}/holiday`, auth),
    ])
      .then(([annRes, suspRes, holidayRes]) => {
        if (annRes.status === "fulfilled") {
          const data = Array.isArray(annRes.value.data)
            ? annRes.value.data
            : [];
          setAnnouncements(data);
          writeCache("announcements", data);
        } else {
          const cached = readCache("announcements");
          if (cached) setAnnouncements(cached);
        }
        if (suspRes.status === "fulfilled") {
          const data = Array.isArray(suspRes.value.data)
            ? suspRes.value.data
            : [];
          setSuspensions(data);
          writeCache("suspensions", data);
        } else {
          const cached = readCache("suspensions");
          if (cached) setSuspensions(cached);
        }
        if (holidayRes.status === "fulfilled") {
          const raw = Array.isArray(holidayRes.value.data)
            ? holidayRes.value.data
            : [];
          setRawHolidays(raw);
          const toLocalDateStr = (rawDate) => {
            if (!rawDate) return null;
            const d = new Date(rawDate);
            if (isNaN(d.getTime())) return null;
            const offset = d.getTimezoneOffset();
            d.setMinutes(d.getMinutes() - offset);
            return d.toISOString().split("T")[0];
          };
          const transformed = raw.flatMap((item) => {
            const startStr = toLocalDateStr(item.date_start || item.date);
            const endStr = toLocalDateStr(
              item.date_end || item.date_start || item.date,
            );
            if (!startStr) return [];
            if (!endStr || endStr === startStr)
              return [
                {
                  date: startStr,
                  date_start: startStr,
                  date_end: endStr || startStr,
                  name: item.description || item.title || "",
                  status: item.status,
                },
              ];
            const entries = [];
            const cur = new Date(startStr);
            const end = new Date(endStr);
            while (cur <= end) {
              entries.push({
                date: cur.toISOString().split("T")[0],
                date_start: startStr,
                date_end: endStr,
                name: item.description || item.title || "",
                status: item.status,
              });
              cur.setDate(cur.getDate() + 1);
            }
            return entries;
          });
          setHolidays(transformed);
          writeCache("holidays_raw", raw);
          writeCache("holidays", transformed);
        } else {
          const cachedRaw = readCache("holidays_raw");
          const cachedHolidays = readCache("holidays");
          if (cachedRaw) setRawHolidays(cachedRaw);
          if (cachedHolidays) setHolidays(cachedHolidays);
        }
      })
      .finally(() => setLoadingCarousel(false));

    axios
      .get(`${API_BASE_URL}/PayrollReleasedRoute/released-payroll`, auth)
      .then((res) => {
        const payslipCount = Array.isArray(res.data) ? res.data.length : 0;
        setStats((prev) => ({ ...prev, payslipCount }));
      })
      .catch((err) => console.error("payslip count failed:", err?.message));

    axios
      .get(`${API_BASE_URL}/api/dashboard/attendance-overview?days=5`, auth)
      .then((res) => {
        setWeeklyAttendanceData(
          Array.isArray(res.data)
            ? res.data.map((item) => ({
                day: item.day,
                present: item.present,
                absent: 0,
                late: 0,
              }))
            : [],
        );
      })
      .catch((err) => console.error("weekly attendance failed:", err?.message));

    axios
      .get(`${API_BASE_URL}/api/dashboard/department-distribution`, auth)
      .then((res) => {
        setDepartmentAttendanceData(
          Array.isArray(res.data)
            ? res.data.map((item) => ({
                department: item.department,
                present: item.employeeCount,
                absent: 0,
                rate: item.employeeCount > 0 ? 100 : 0,
              }))
            : [],
        );
      })
      .catch((err) => console.error("dept distribution failed:", err?.message));

    axios
      .get(`${API_BASE_URL}/api/dashboard/monthly-attendance`, auth)
      .then((res) => {
        const monthlyData = res.data;
        if (Array.isArray(monthlyData) && monthlyData.length > 0) {
          const weeklyAverages = [];
          let weekData = [];
          monthlyData.forEach((day, index) => {
            weekData.push(day.present);
            if ((index + 1) % 7 === 0 || index === monthlyData.length - 1) {
              const avg = weekData.reduce((a, b) => a + b, 0) / weekData.length;
              weeklyAverages.push({
                week: `Week ${weeklyAverages.length + 1}`,
                attendance: avg.toFixed(1),
                leaves: 0,
                overtime: 0,
              });
              weekData = [];
            }
          });
          if (weeklyAverages.length > 0)
            setMonthlyAttendanceTrend(weeklyAverages);
        }
      })
      .catch((err) =>
        console.error("monthly attendance failed:", err?.message),
      );
  };

  const refreshAllData = useCallback(() => {
    fetchAllDataRef.current();
  }, []);

  /** Ignore punch noise / light events; debounce real attendance updates. */
  const DASHBOARD_ATTENDANCE_IGNORE = useMemo(
    () =>
      new Set([
        "leaves-fetched",
        "holidays-fetched",
        "suspensions-fetched",
        "dtr-printed",
        "overall-daily-late-updated",
        "overall-daily-late-created",
      ]),
    [],
  );

  useEffect(() => {
    const cachedAnn = readCache("announcements");
    const cachedSusp = readCache("suspensions");
    const cachedHolidays = readCache("holidays");
    const cachedHolidaysRaw = readCache("holidays_raw");
    if (cachedAnn) setAnnouncements(cachedAnn);
    if (cachedSusp) setSuspensions(cachedSusp);
    if (cachedHolidays) setHolidays(cachedHolidays);
    if (cachedHolidaysRaw) setRawHolidays(cachedHolidaysRaw);
    refreshAllData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;

    const onAdminDashboardUpdated = () => {
      refreshAllData();
    };

    const onAttendanceChanged = (payload) => {
      const action = payload?.action;
      if (payload?.light || DASHBOARD_ATTENDANCE_IGNORE.has(action)) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refreshAllData(), 1500);
    };

    socket.on("adminDashboardUpdated", onAdminDashboardUpdated);
    socket.on("attendanceChanged", onAttendanceChanged);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off("adminDashboardUpdated", onAdminDashboardUpdated);
      socket.off("attendanceChanged", onAttendanceChanged);
    };
  }, [socket, connected, refreshAllData, DASHBOARD_ATTENDANCE_IGNORE]);

  return {
    stats,
    weeklyAttendanceData,
    departmentAttendanceData,
    payrollStatusData,
    monthlyAttendanceTrend,
    payrollTrendData,
    attendanceChartData,
    announcements,
    suspensions,
    holidays,
    rawHolidays,
    loading,
    loadingCarousel,
    loadingPayroll,
    refreshAllData,
  };
};

// ─── carousel hook ────────────────────────────────────────────────────────────
const useCarousel = (items, autoPlay = true, interval = 5000) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    if (!isPlaying || !itemsRef.current || itemsRef.current.length === 0)
      return;
    const timer = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % itemsRef.current.length);
    }, interval);
    return () => clearInterval(timer);
  }, [isPlaying, interval, items.length]);
  const handlePrevSlide = useCallback(() => {
    if (!itemsRef.current?.length) return;
    setCurrentSlide(
      (s) => (s - 1 + itemsRef.current.length) % itemsRef.current.length,
    );
  }, []);
  const handleNextSlide = useCallback(() => {
    if (!itemsRef.current?.length) return;
    setCurrentSlide((s) => (s + 1) % itemsRef.current.length);
  }, []);
  const handleSlideSelect = useCallback((index) => {
    if (!itemsRef.current?.length) return;
    setCurrentSlide(index);
  }, []);
  const togglePlayPause = useCallback(() => setIsPlaying((prev) => !prev), []);
  return {
    currentSlide,
    isPlaying,
    handlePrevSlide,
    handleNextSlide,
    handleSlideSelect,
    togglePlayPause,
  };
};

// ─── time hook ────────────────────────────────────────────────────────────────
const useTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return currentTime;
};

// ─── Wireframe loading ────────────────────────────────────────────────────────
const AdminWireframeLoading = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        py: -1,
        px: { xs: -5, sm: -5, md: -5 },
        width: "100vw",
        maxWidth: "100%",
        position: "relative",
        left: "55%",
        transform: "translateX(-53%)",
      }}
    >
      {/* Header skeleton */}
      <Box
        sx={{
          mb: 2,
          borderRadius: "12px",
          overflow: "hidden",
          border: "0.5px solid rgba(0,0,0,0.09)",
          animation: "blink 2s ease-in-out infinite",
        }}
      >
        <Box
          sx={{
            px: 4,
            py: 3,
            background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.12)",
              }}
            />
            <Box>
              <Bone w={220} h={16} sx={{ mb: 1 }} />
              <Bone w={300} h={11} />
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
      {/* Stat cards skeleton */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: 90,
              borderRadius: "12px",
              bgcolor: "#fff",
              border: "0.5px solid rgba(0,0,0,0.09)",
              p: 2,
              animation: "blink 2s ease-in-out 0.1s infinite",
            }}
          >
            <Bone w={24} h={24} r={6} sx={{ mb: 1.5 }} />
            <Bone w={60} h={18} sx={{ mb: 0.75 }} />
            <Bone w="60%" h={10} />
          </Box>
        ))}
      </Box>
      {/* Main grid skeleton */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Box
            sx={{
              height: "calc(100vh - 400px)",
              borderRadius: "12px",
              bgcolor: "#fff",
              border: "0.5px solid rgba(0,0,0,0.09)",
              animation: "blink 2s ease-in-out 0.15s infinite",
            }}
          >
            <Bone w="100%" h="100%" r={12} />
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Box
            sx={{ display: "flex", gap: 1.5, height: "calc(100vh - 400px)" }}
          >
            {[1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    height: 200,
                    borderRadius: "12px",
                    bgcolor: "#fff",
                    border: "0.5px solid rgba(0,0,0,0.09)",
                    p: 2,
                    animation: "blink 2s ease-in-out 0.2s infinite",
                  }}
                >
                  <Bone w="60%" h={12} sx={{ mb: 1 }} />
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    borderRadius: "12px",
                    bgcolor: "#fff",
                    border: "0.5px solid rgba(0,0,0,0.09)",
                    p: 2,
                    animation: "blink 2s ease-in-out 0.25s infinite",
                  }}
                >
                  <Bone w="40%" h={12} />
                </Box>
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

// ─── CompactStatCard ──────────────────────────────────────────────────────────
const CompactStatCard = ({
  card,
  index,
  stats,
  loading,
  hoveredCard,
  setHoveredCard,
}) => (
  <Grow in timeout={300 + index * 50}>
    <SectionCard
      onMouseEnter={() => setHoveredCard(index)}
      onMouseLeave={() => setHoveredCard(null)}
      sx={{
        height: { xs: 70, sm: 80, md: 90 },
        transition: "all 0.2s ease",
        transform: hoveredCard === index ? "translateY(-3px)" : "translateY(0)",
        boxShadow:
          hoveredCard === index
            ? `0 8px 24px ${T.accent}22`
            : "0 1px 4px rgba(0,0,0,0.07)",
        cursor: "default",
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.25, md: 1.75 },
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          "&:last-child": { pb: { xs: 1.25, md: 1.75 } },
        }}
      >
<Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: T.accentFaint,
            color: T.accent,
          }}
        >
          {React.cloneElement(card.icon, { sx: { fontSize: 16 } })}
        </Box>
        <Box>
          <Typography
            sx={{
              fontWeight: 700,
              color: T.text,
              lineHeight: 1,
              fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.6rem" },
              mb: 0.25,
            }}
          >
            {loading ? (
              <Skeleton variant="text" width={50} height={28} />
            ) : stats[card.valueKey] !== undefined ? (
              stats[card.valueKey]
            ) : (
              card.defaultValue
            )}
          </Typography>
          <Typography
            sx={{
              color: T.muted,
              fontSize: "0.7rem",
              fontWeight: 500,
              display: { xs: "none", sm: "block" },
            }}
          >
            {card.textValue}
          </Typography>
          <Typography sx={{ color: T.faint, fontSize: "0.62rem" }}>
            {card.label}
          </Typography>
        </Box>
      </CardContent>
    </SectionCard>
  </Grow>
);

// ─── Facial Recognition live feed ─────────────────────────────────────────────
// AttendanceState codes (from AttendanceUserState):
// 0 = Uncategorized, 1 = Time IN, 2 = Breaktime OUT, 3 = Breaktime IN,
// 4 = Time OUT, 5 = Special Time IN, 6 = Special Time OUT
const FR_STATE_STYLE = {
  0: { bg: T.accentFaint, color: T.accent, icon: Face, label: "Uncategorized" },
  1: { bg: "#e8f5e9", color: "#2e7d32", icon: Login, label: "Time In" },
  2: { bg: "#fff3e0", color: "#ef6c00", icon: Logout, label: "Break Out" },
  3: { bg: "#fff3e0", color: "#ef6c00", icon: Login, label: "Break In" },
  4: { bg: "#ffebee", color: "#c62828", icon: Logout, label: "Time Out" },
  5: { bg: "#e3f2fd", color: "#1565c0", icon: Login, label: "Special Time In" },
  6: { bg: "#e3f2fd", color: "#1565c0", icon: Logout, label: "Special Time Out" },
};
const FR_STATE_DEFAULT = {
  bg: T.accentFaint,
  color: T.accent,
  icon: Face,
  label: "Detected",
};

function resolveFrState(rawState) {
  if (rawState === null || rawState === undefined || rawState === "")
    return FR_STATE_DEFAULT;
  const code = Number(rawState);
  if (Number.isFinite(code) && FR_STATE_STYLE[code]) {
    return FR_STATE_STYLE[code];
  }
  return FR_STATE_DEFAULT;
}

function recordKey(row) {
  return `${row.PersonID}-${row.AttendanceDateTime}`;
}

function formatFrTime(timestamp) {
  if (!timestamp) return "";
  const ms = Number(timestamp);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Manila",
  });
}

function formatFrDate(timestamp) {
  if (!timestamp) return "";
  const ms = Number(timestamp);
  if (!Number.isFinite(ms)) return "";
  const rowDate = new Date(ms).toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
  const todayDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
  if (rowDate === todayDate) return "Today";
  return new Date(ms).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  });
}

const MAX_FR_ROWS = 50;
const NEW_ROW_HIGHLIGHT_MS = 4000;

const FacialRecognitionFeed = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeys, setNewKeys] = useState(() => new Set());
  const highlightTimersRef = useRef(new Map());

  const flagAsNew = useCallback((keys) => {
    if (!keys.length) return;
    setNewKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });
    keys.forEach((key) => {
      const existingTimer = highlightTimersRef.current.get(key);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(() => {
        setNewKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        highlightTimersRef.current.delete(key);
      }, NEW_ROW_HIGHLIGHT_MS);
      highlightTimersRef.current.set(key, timer);
    });
  }, []);

  useEffect(() => {
    const timers = highlightTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  useAttendanceRecordInfoSocket(
    (payload) => {
      const incoming = Array.isArray(payload?.records) ? payload.records : [];
      if (payload?.action === "latest") {
        const sorted = [...incoming].sort(
          (a, b) => Number(b.AttendanceDateTime) - Number(a.AttendanceDateTime),
        );
        setRecords(sorted.slice(0, MAX_FR_ROWS));
        setLoading(false);
        return;
      }

      if (payload?.action === "inserted" && incoming.length > 0) {
        setRecords((prev) => {
          const existingKeys = new Set(prev.map(recordKey));
          const fresh = incoming.filter((r) => !existingKeys.has(recordKey(r)));
          if (fresh.length === 0) return prev;
          flagAsNew(fresh.map(recordKey));
          const merged = [...fresh.reverse(), ...prev].sort(
            (a, b) => Number(b.AttendanceDateTime) - Number(a.AttendanceDateTime),
          );
          return merged.slice(0, MAX_FR_ROWS);
        });
        setLoading(false);
      }
    },
    { fetchLatestOnConnect: true, latestLimit: MAX_FR_ROWS },
  );

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  };

  return (
    <SectionCard
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <PanelHeader
        icon={Face}
        title="Facial Recognition Device "
        right={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <FiberManualRecord
              sx={{
                fontSize: 8,
                color: "#4caf50",
                animation: "blink 1.8s ease-in-out infinite",
              }}
            />
            <Typography
              sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.muted }}
            >
              Real-time attendance activity
            </Typography>
          </Box>
        }
      />

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          "&::-webkit-scrollbar": { width: "3px" },
          "&::-webkit-scrollbar-track": { background: T.accentFaint },
          "&::-webkit-scrollbar-thumb": {
            background: T.accentBorder,
            borderRadius: "2px",
          },
        }}
      >
        {loading ? (
          <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Bone w={32} h={32} r="50%" />
                <Box sx={{ flex: 1 }}>
                  <Bone w="70%" h={11} sx={{ mb: 0.5 }} />
                  <Bone w="40%" h={9} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : records.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 1,
              px: 2,
            }}
          >
            <Face sx={{ fontSize: 40, color: T.accentBorder }} />
            <Typography sx={{ fontSize: "0.75rem", color: T.faint, textAlign: "center" }}>
              No attendance detections yet
            </Typography>
          </Box>
        ) : (
          records.map((row) => {
            const key = recordKey(row);
            const stateInfo = resolveFrState(row.AttendanceState);
            const StateIcon = stateInfo.icon;
            const isNew = newKeys.has(key);
            return (
              <Box
                key={key}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  borderBottom: `1px solid ${T.divider}`,
                  bgcolor: isNew ? T.accentFaint : "transparent",
                  transition: "background-color 0.6s ease",
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    bgcolor: T.accentFaint,
                    color: T.accent,
                    border: `1px solid ${T.accentBorder}`,
                  }}
                >
                  {getInitials(row.PersonName)}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      color: T.text,
                      lineHeight: 1.3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.PersonName || `Person #${row.PersonID}`}
                  </Typography>
                  <Typography sx={{ fontSize: "0.62rem", color: T.faint }}>
                    ID: {row.PersonID} · {formatFrDate(row.AttendanceDateTime)}{" "}
                    {formatFrTime(row.AttendanceDateTime)}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                    px: 1,
                    py: 0.3,
                    borderRadius: "20px",
                    bgcolor: stateInfo.bg,
                    flexShrink: 0,
                  }}
                >
                  <StateIcon sx={{ fontSize: 11, color: stateInfo.color }} />
                  <Typography
                    sx={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: stateInfo.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stateInfo.label}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <Box
        onClick={() =>
          navigate("/view_attendance", {
            state: { activeTab: "device-list", viewMode: "multiple" },
          })
        }
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          py: 1,
          borderTop: `1px solid ${T.divider}`,
          bgcolor: T.accentFaint,
          cursor: "pointer",
          transition: "background 0.15s",
          "&:hover": { bgcolor: T.accentHover },
        }}
      >
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent }}>
          View more
        </Typography>
        <ArrowForward sx={{ fontSize: 13, color: T.accent }} />
      </Box>
    </SectionCard>
  );
};

// ─── CompactCalendar ──────────────────────────────────────────────────────────
const CompactCalendar = ({
  calendarDate,
  setCalendarDate,
  holidays,
  announcements,
  settings,
  setSelectedDate,
}) => {
  const month = calendarDate.getMonth();
  const year = calendarDate.getFullYear();
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < adjustedFirst; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length < 35) days.push(null);
    return days;
  }, [month, year]);

  const normalizeDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - offset);
    return d.toISOString().split("T")[0];
  };

  const getAnnouncementsForDate = useCallback(
    (dateStr) =>
      Array.isArray(announcements)
        ? announcements.filter((a) => normalizeDate(a.date) === dateStr)
        : [],
    [announcements],
  );

  return (
    <SectionCard sx={{ flexShrink: 0, minHeight: 190, maxHeight: 230 }}>
      <PanelHeader
        icon={CalendarMonth}
        title={new Date(year, month).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
        right={
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
              sx={{
                color: T.accent,
                p: 0.4,
                borderRadius: "6px",
                "&:hover": { bgcolor: T.accentFaint },
              }}
            >
              <ArrowBackIosNewIcon sx={{ fontSize: 15 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
              sx={{
                color: T.accent,
                p: 0.4,
                borderRadius: "6px",
                "&:hover": { bgcolor: T.accentFaint },
              }}
            >
              <ArrowForwardIosIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        }
      />
      <Box sx={{ p: 2, }}>
        <Grid container spacing={1} sx={{ mb: 0.5 }}>
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
            <Grid item xs={12 / 7} key={day}>
              <Typography
                sx={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "0.55rem",
                  color: T.accent,
                  letterSpacing: "0.04em",
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={0.52}>
          {calendarDays.map((day, index) => {
            const currentDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const holidayData = Array.isArray(holidays)
              ? holidays.find(
                  (h) => h.date === currentDate && h.status === "Active",
                )
              : null;
            const dayAnnouncements = getAnnouncementsForDate(currentDate);
            const hasAnnouncements = dayAnnouncements.length > 0;
            const isToday =
              new Date().toDateString() ===
              new Date(year, month, day).toDateString();
            return (
              <Grid item xs={12 / 7} key={index}>
                <Tooltip
                  title={
                    isToday
                      ? `Today${holidayData ? ` · ${holidayData.name}` : hasAnnouncements ? ` · ${dayAnnouncements[0].title}` : ""}`
                      : holidayData
                        ? `Holiday: ${holidayData.name}`
                        : hasAnnouncements
                          ? `${dayAnnouncements[0].title}`
                          : ""
                  }
                  arrow
                >
                 <Box
  onClick={() => {
    if (day) setSelectedDate(currentDate);
  }}
  sx={{
    textAlign: "center",
    fontSize: "0.65rem",
    borderRadius: "4px",
    color: holidayData
      ? "#fff"
      : isToday
        ? "#fff"          // ← added: white text on today's burgundy background
        : day
          ? T.text
          : "transparent",
    background: holidayData
      ? T.accent
      : isToday
        ? T.accentMid
        : hasAnnouncements
          ? T.accentFaint
          : "transparent",
    fontWeight:
      holidayData || isToday || hasAnnouncements ? 700 : 400,
    border: isToday
      ? `1.5px solid ${T.accent}`
      : hasAnnouncements
        ? `1px solid ${T.accentBorder}`
        : "none",
    cursor: day ? "pointer" : "default",
    transition: "all 0.15s",
    py: "1px",
    "&:hover": day
      ? {
          background: holidayData
            ? T.accentDark
            : isToday
              ? T.accentDark   // ← optional: keep white text legible on hover too
              : T.accentFaint,
          color: (holidayData || isToday) ? "#fff" : undefined,
          transform: "scale(1.1)",
        }
      : {},
  }}
>
  {day || ""}
</Box>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </SectionCard>
  );
};

// ─── Compact audit log preview (dashboard) ────────────────────────────────────
const AUDIT_PREVIEW_HIDDEN_TABLES = new Set([
  "dashboard_stats",
  "attendance_overview",
  "department_distribution",
  "leave_stats",
  "recent_activities",
  "payroll_summary",
  "monthly_attendance",
  "employee_growth",
  "employee_stats",
]);

const shouldShowAuditPreviewEntry = (log) => {
  const table = String(log?.table_name || "").toLowerCase();
  if (table === "leave_transaction") return false;
  const action = String(log?.action || "").toLowerCase();
  if (action === "view" && AUDIT_PREVIEW_HIDDEN_TABLES.has(table)) return false;
  if (table === "users" && action.includes("search")) return false;
  if (
    (table === "holidays" || table === "suspensions" || table === "leaves") &&
    action === "view"
  )
    return false;
  return true;
};

const getAuditPreviewColor = (action) => {
  if (!action) return "#10b981";
  const a = action.toUpperCase();
  if (["DELETE", "REMOVE", "DESTROY"].some((k) => a.includes(k))) return "#ef4444";
  if (a.includes("REJECT")) return "#b91c1c";
  if (["RESTORE", "REVERS"].some((k) => a.includes(k))) return "#ec4899";
  if (["DEDUCT", "TARDINESS"].some((k) => a.includes(k))) return "#f97316";
  if (a.includes("ASSIGN")) return "#6366f1";
  if (["UPDATE", "EDIT", "MODIFY", "CHANGE"].some((k) => a.includes(k)))
    return "#3b82f6";
  if (["VIEW", "OPEN", "READ"].some((k) => a.includes(k))) return "#06b6d4";
  if (a.includes("LOGOUT")) return "#7c3aed";
  if (a.includes("LOGIN")) return "#8b5cf6";
  return "#10b981";
};

const getAuditPreviewIcon = (action) => {
  if (!action) return Add;
  const a = action.toUpperCase();
  if (["DELETE", "REMOVE", "DESTROY"].some((k) => a.includes(k))) return Delete;
  if (["UPDATE", "EDIT", "MODIFY", "CHANGE"].some((k) => a.includes(k)))
    return Edit;
  if (a.includes("ASSIGN")) return Flag;
  return Add;
};

const formatAuditPreviewModule = (tableName) => {
  if (!tableName) return "SYSTEM";
  return String(tableName).toUpperCase().replace(/[\s-]+/g, "_");
};

const CompactAuditLogs = ({ userRole }) => {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const canView = ["superadmin", "technical", "administrator", "admin"].includes(
    userRole,
  );

  const canAccess = ["superadmin", "technical"].includes(
    userRole,
  );

  const fetchLogs = useCallback(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    axios
      .get(`${API_BASE_URL}/audit-logs`, getAuthHeaders())
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setLogs(list.filter(shouldShowAuditPreviewEntry).slice(0, 8));
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [canView]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!socket || !connected || !canView) return;
    const handleNew = (newLog) => {
      if (!shouldShowAuditPreviewEntry(newLog)) return;
      setLogs((prev) => {
        if (prev.some((l) => l.id === newLog.id)) return prev;
        return [newLog, ...prev].slice(0, 8);
      });
    };
    socket.on("auditLogCreated", handleNew);
    return () => socket.off("auditLogCreated", handleNew);
  }, [socket, connected, canView]);

  const timeAgo = (ts) => {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  return (
    <SectionCard
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <PanelHeader
        icon={History}
        title="System Recent Activity"
        right={
          canView && canAccess && (
            <Tooltip title="View all" arrow>
              <IconButton
                size="small"
                onClick={() => navigate("/audit-logs")}
                sx={{
                  color: T.accent,
                  p: 0.4,
                  borderRadius: "6px",
                  "&:hover": { bgcolor: T.accentFaint },
                }}
              >
                <ArrowForward sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )
        }
      />
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          "&::-webkit-scrollbar": { width: "3px" },
          "&::-webkit-scrollbar-track": { background: T.accentFaint },
          "&::-webkit-scrollbar-thumb": {
            background: T.accentBorder,
            borderRadius: "2px",
          },
        }}
      >
        {!canView ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              px: 2,
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: "0.72rem", color: T.faint }}>
              You don't have access to view audit activity.
            </Typography>
          </Box>
        ) : loading ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <CircularProgress size={16} sx={{ color: T.accent }} />
          </Box>
        ) : logs.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Typography sx={{ fontSize: "0.75rem", color: T.faint }}>
              No recent activity
            </Typography>
          </Box>
        ) : (
          logs.map((log, idx) => {
            const color = getAuditPreviewColor(log.action);
            const Icon = getAuditPreviewIcon(log.action);
            return (
              <Box
                key={log.id || idx}
                onClick={() => canAccess && navigate("/audit-logs")}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  borderBottom: `1px solid ${T.divider}`,
                  cursor: "pointer",
                  transition: "background 0.12s",
                  "&:hover": { bgcolor: T.accentFaint },
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: "7px",
                    bgcolor: `${color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    mt: 0.1,
                  }}
                >
                  <Icon sx={{ fontSize: 13, color }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.66rem",
                        fontWeight: 700,
                        color,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {(log.action || "ACTIVITY").toString()}
                    </Typography>
                    <Typography
                      sx={{ fontSize: "0.6rem", color: T.faint, flexShrink: 0 }}
                    >
                      {timeAgo(log.timestamp)}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      color: T.muted,
                      lineHeight: 1.35,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {(log.actorName && log.actorName.trim()) ||
                      `Employee #${log.employeeNumber || "—"}`}
                    {" · "}
                    {formatAuditPreviewModule(log.table_name)}
                    {log.targetEmployeeNumber
                      ? ` → #${log.targetEmployeeNumber}`
                      : ""}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </SectionCard>
  );
};

// ─── QuickActions ─────────────────────────────────────────────────────────────
const QuickActions = ({ settings, userRole }) => {
  const isSuperAdmin = userRole === "superadmin" || userRole === "technical";
  const filteredActions = QUICK_ACTIONS(settings).filter(
    (action) => !action.restricted || isSuperAdmin,
  );
  return (
    <Card
      sx={{
        background: settings.accentColor,
        backdropFilter: "blur(15px)",
        border: `1px solid ${settings.primaryColor}26`,
        borderRadius: 4,
        flexShrink: 0,
        minHeight: 180,
        maxHeight: 220,
        overflow: "hidden",
      }}
    >
      <CardContent
        sx={{
          p: 1.5,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
       <Typography
  variant="h6"
  sx={{
    fontWeight: 700,
    mb: 1,
    color: settings.textPrimaryColor,
    fontSize: "0.85rem",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 0.75,
  }}
>
  {React.createElement(Build, {
    sx: { fontSize: 16, color: settings.textPrimaryColor },
  })}
  Admin Panel
</Typography>
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          <Grid container spacing={0.75}>
            {filteredActions.map((item, i) => (
              <Grid item xs={4} key={i}>
                <Grow in timeout={400 + i * 50}>
                  <Tooltip title={item.tooltip || item.label} arrow>
                    <Link to={item.link} style={{ textDecoration: "none" }}>
                      <Box
                        sx={{
                          p: { xs: 0.5, md: 0.5 },
                          borderRadius: 1.5,
                          background: `${settings.primaryColor}0A`,
                          border: `1px solid ${settings.primaryColor}26`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          transition: "all 0.3s",
                          cursor: "pointer",
                          "&:hover": {
                            background: `${settings.primaryColor}1A`,
                            transform: "translateY(-2px)",
                            boxShadow: `0 4px 12px ${settings.primaryColor}33`,
                          },
                        }}
                      >
                        <Box sx={{ color: settings.textPrimaryColor }}>
                          {React.cloneElement(item.icon, {
                            sx: { fontSize: { xs: 16, md: 20 } },
                          })}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: { xs: "0.5rem", md: "0.6rem" },
                            fontWeight: 600,
                            color: settings.textPrimaryColor,
                            textAlign: "center",
                            lineHeight: 1.2,
                          }}
                        >
                          {item.label}
                        </Typography>
                      </Box>
                    </Link>
                  </Tooltip>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── ModalCard ────────────────────────────────────────────────────────────────
const ModalCard = ({
  open,
  onClose,
  title,
  icon,
  primaryColor,
  secondaryColor,
  children,
  actions,
}) => {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      BackdropProps={{
        sx: { background: "rgba(0,0,0,0.52)", backdropFilter: "blur(4px)" },
      }}
    >
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 1400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 1.5,
        }}
      >
        <Grow in={open} timeout={220}>
          <Box
            sx={{
              width: { xs: "92%", sm: 420 },
              bgcolor: "#fff",
              borderRadius: "12px",
              boxShadow: "0 28px 64px rgba(0,0,0,0.18)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              border: "0.5px solid rgba(0,0,0,0.09)",
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                background: T.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {icon && (
                  <Box sx={{ color: "#fff", display: "flex" }}>{icon}</Box>
                )}
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "#fff",
                    letterSpacing: "0.01em",
                  }}
                >
                  {title}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  color: "rgba(255,255,255,0.85)",
                  p: 0.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                  borderRadius: "6px",
                }}
              >
                <Close sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
            <Box sx={{ px: 2.5, pt: 2.25, pb: 0.5 }}>{children}</Box>
            {actions && (
              <Box
                sx={{
                  px: 2.5,
                  py: 1.75,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 1,
                }}
              >
                {actions}
              </Box>
            )}
          </Box>
        </Grow>
      </Box>
    </Modal>
  );
};

// ─── TasksAndEvents ───────────────────────────────────────────────────────────
const TasksAndEvents = ({ settings, employeeNumber }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "medium" });
  const [events, setEvents] = useState([]);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    date: new Date().toISOString().split("T")[0],
    title: "",
    description: "",
  });

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/tasks`, getAuthHeaders())
      .then((res) => {
        if (Array.isArray(res.data)) setTasks(res.data);
      })
      .catch(() => setTasks([]));
  }, []);

  useEffect(() => {
    if (!employeeNumber) return;
    axios
      .get(`${API_BASE_URL}/api/events/${employeeNumber}`, getAuthHeaders())
      .then((res) => setEvents(Array.isArray(res.data) ? res.data : []))
      .catch(() => setEvents([]));
  }, [employeeNumber]);

  const handleToggleTask = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/tasks/${id}/toggle`, {}, getAuthHeaders());
      setTasks(
        tasks.map((task) =>
          task.id === id ? { ...task, completed: !task.completed } : task,
        ),
      );
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };
  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/tasks`, newTask, getAuthHeaders());
      setTasks([res.data, ...tasks]);
      setNewTask({ title: "", priority: "medium" });
      setAddTaskOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };
  const handleDeleteTask = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${id}`, getAuthHeaders());
      setTasks(tasks.filter((task) => task.id !== id));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };
  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/events`, {
        employee_number: employeeNumber,
        date: newEvent.date,
        title: newEvent.title,
        description: newEvent.description || "",
      }, getAuthHeaders());
      setEvents([res.data, ...events]);
      setNewEvent({
        date: new Date().toISOString().split("T")[0],
        title: "",
        description: "",
      });
      setAddEventOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error("Error adding event:", err);
    }
  };
  const handleDeleteEvent = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/events/${id}`, getAuthHeaders());
      setEvents(events.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  const getPriorityLabel = (priority) =>
    priority === "high" ? "Urgent" : priority === "medium" ? "Soon" : "Later";
  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
  const getEventStatus = (dateStr) => {
    if (!dateStr) return "past";
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate.getTime() === today.getTime()) return "today";
    return eventDate > today ? "upcoming" : "past";
  };
  const getStatusLabel = (status) =>
    status === "upcoming" ? "Upcoming" : status === "today" ? "Today" : "Past";

  return (
    <>
      <SectionCard
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <SuccessfulOverlay
          open={showSuccess}
          action="create"
          onClose={() => setShowSuccess(false)}
        />

        {/* Professional flat tab bar */}
        <TabBar
          right={
            <Tooltip title={activeTab === 0 ? "Add task" : "Add event"} arrow>
              <IconButton
                size="small"
                onClick={() =>
                  activeTab === 0 ? setAddTaskOpen(true) : setAddEventOpen(true)
                }
                sx={{
                  width: 26,
                  height: 26,
                  border: `1px solid ${T.accentBorder}`,
                  color: T.accent,
                  borderRadius: "6px",
                  "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent },
                  "&:active": { transform: "scale(0.9)" },
                }}
              >
                <Add sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          }
        >
          <FlatTab
            label="Tasks"
            icon={AssignmentTurnedInIcon}
            badge={tasks.length}
            active={activeTab === 0}
            onClick={() => setActiveTab(0)}
          />
          <FlatTab
            label="Events"
            icon={Event}
            badge={events.length}
            active={activeTab === 1}
            onClick={() => setActiveTab(1)}
          />
        </TabBar>

        <CardContent
          sx={{
            p: 1.25,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              pr: 0.5,
              minHeight: 0,
              "&::-webkit-scrollbar": { width: "3px" },
              "&::-webkit-scrollbar-track": { background: T.accentFaint },
              "&::-webkit-scrollbar-thumb": {
                background: T.accentBorder,
                borderRadius: "2px",
              },
            }}
          >
            {activeTab === 0 && (
              <List dense sx={{ p: 0 }}>
                {Array.isArray(tasks) && tasks.length > 0 ? (
                  tasks.map((task) => (
                    <ListItem
                      key={task.id}
                      sx={{
                        p: 0,
                        mb: 0.75,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Checkbox
                        checked={task.completed}
                        onChange={() => handleToggleTask(task.id)}
                        size="small"
                        sx={{
                          p: 0.5,
                          color: T.accentBorder,
                          "&.Mui-checked": { color: T.accent },
                        }}
                      />
                      <ListItemText
                        primary={task.title}
                        primaryTypographyProps={{
                          sx: {
                            fontSize: "0.78rem",
                            color: T.text,
                            textDecoration: task.completed
                              ? "line-through"
                              : "none",
                            lineHeight: 1.3,
                          },
                        }}
                      />
                      <Chip
                        label={getPriorityLabel(task.priority)}
                        size="small"
                        sx={{
                          fontSize: "0.6rem",
                          height: 18,
                          mr: 0.5,
                          bgcolor:
                            task.priority === "high"
                              ? "#f4433610"
                              : task.priority === "medium"
                                ? "#ff980010"
                                : "#4caf5010",
                          color:
                            task.priority === "high"
                              ? "#f44336"
                              : task.priority === "medium"
                                ? "#ff9800"
                                : "#4caf50",
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteTask(task.id)}
                        sx={{
                          color: T.faint,
                          p: 0.25,
                          borderRadius: "4px",
                          "&:hover": { bgcolor: "#FCEBEB", color: T.accent },
                          "&:active": { transform: "scale(0.88)" },
                        }}
                      >
                        <Delete sx={{ fontSize: 13 }} />
                      </IconButton>
                    </ListItem>
                  ))
                ) : (
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: T.faint,
                      textAlign: "center",
                      py: 3,
                    }}
                  >
                    No tasks yet
                  </Typography>
                )}
              </List>
            )}
            {activeTab === 1 && (
              <List dense sx={{ p: 0 }}>
                {Array.isArray(events) && events.length > 0 ? (
                  events.map((event) => {
                    const status = getEventStatus(event.date);
                    return (
                      <ListItem
                        key={event.id}
                        sx={{
                          p: 0,
                          mb: 0.75,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <Event
                          sx={{
                            fontSize: 15,
                            color:
                              status === "upcoming"
                                ? "#4caf50"
                                : status === "today"
                                  ? "#ff9800"
                                  : T.faint,
                            mr: 0.75,
                            flexShrink: 0,
                          }}
                        />
                        <ListItemText
                          primary={event.title}
                          secondary={formatDate(event.date)}
                          primaryTypographyProps={{
                            sx: {
                              fontSize: "0.78rem",
                              color: T.text,
                              lineHeight: 1.3,
                            },
                          }}
                          secondaryTypographyProps={{
                            sx: { fontSize: "0.65rem", color: T.faint },
                          }}
                        />
                        <Chip
                          label={getStatusLabel(status)}
                          size="small"
                          sx={{
                            fontSize: "0.6rem",
                            height: 18,
                            mr: 0.5,
                            bgcolor:
                              status === "upcoming"
                                ? "#4caf5010"
                                : status === "today"
                                  ? "#ff980010"
                                  : "#f4433610",
                            color:
                              status === "upcoming"
                                ? "#4caf50"
                                : status === "today"
                                  ? "#ff9800"
                                  : "#f44336",
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteEvent(event.id)}
                          sx={{
                            color: T.faint,
                            p: 0.25,
                            borderRadius: "4px",
                            "&:hover": { bgcolor: "#FCEBEB", color: T.accent },
                            "&:active": { transform: "scale(0.88)" },
                          }}
                        >
                          <Delete sx={{ fontSize: 13 }} />
                        </IconButton>
                      </ListItem>
                    );
                  })
                ) : (
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: T.faint,
                      textAlign: "center",
                      py: 3,
                    }}
                  >
                    No events yet
                  </Typography>
                )}
              </List>
            )}
          </Box>
        </CardContent>
      </SectionCard>

      <ModalCard
        open={addTaskOpen}
        onClose={() => {
          setAddTaskOpen(false);
          setNewTask({ title: "", priority: "medium" });
        }}
        title="Add New Task"
        icon={<Note sx={{ fontSize: 16 }} />}
        primaryColor={T.accent}
        secondaryColor={T.accentDark}
        actions={
          <>
            <Button
              onClick={() => {
                setAddTaskOpen(false);
                setNewTask({ title: "", priority: "medium" });
              }}
              size="small"
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                color: T.muted,
                border: `1px solid ${T.divider}`,
                "&:hover": { bgcolor: T.accentFaint },
                px: 2,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTask}
              variant="contained"
              size="small"
              disabled={!newTask.title.trim()}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
                bgcolor: T.accent,
                color: "#fff",
                px: 2.5,
                "&:hover": { bgcolor: T.accentDark },
              }}
            >
              Add Task
            </Button>
          </>
        }
      >
        <TextField
          autoFocus
          fullWidth
          label="Task Title"
          variant="outlined"
          size="small"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "0.72rem",
            color: T.muted,
            mb: 1,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Priority
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
          {["low", "medium", "high"].map((p) => {
            const col =
              p === "high" ? "#f44336" : p === "medium" ? "#ff9800" : "#4caf50";
            const selected = newTask.priority === p;
            return (
              <Button
                key={p}
                size="small"
                onClick={() => setNewTask({ ...newTask, priority: p })}
                sx={{
                  flex: 1,
                  textTransform: "capitalize",
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  border: `1.5px solid ${col}`,
                  bgcolor: selected ? col : "transparent",
                  color: selected ? "#fff" : col,
                  "&:hover": { bgcolor: selected ? col : `${col}14` },
                }}
              >
                {p === "high" ? "Urgent" : p === "medium" ? "Soon" : "Later"}
              </Button>
            );
          })}
        </Box>
      </ModalCard>

      <ModalCard
        open={addEventOpen}
        onClose={() => {
          setAddEventOpen(false);
          setNewEvent({
            date: new Date().toISOString().split("T")[0],
            title: "",
            description: "",
          });
        }}
        title="Add New Event"
        icon={<Event sx={{ fontSize: 16 }} />}
        primaryColor={T.accent}
        secondaryColor={T.accentDark}
        actions={
          <>
            <Button
              onClick={() => {
                setAddEventOpen(false);
                setNewEvent({
                  date: new Date().toISOString().split("T")[0],
                  title: "",
                  description: "",
                });
              }}
              size="small"
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                color: T.muted,
                border: `1px solid ${T.divider}`,
                "&:hover": { bgcolor: T.accentFaint },
                px: 2,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEvent}
              variant="contained"
              size="small"
              disabled={!newEvent.title.trim() || !newEvent.date}
              startIcon={<Save sx={{ fontSize: 14 }} />}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
                bgcolor: T.accent,
                color: "#fff",
                px: 2.5,
                "&:hover": { bgcolor: T.accentDark },
              }}
            >
              Save Event
            </Button>
          </>
        }
      >
        <TextField
          autoFocus
          fullWidth
          label="Event Title"
          variant="outlined"
          size="small"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <TextField
          fullWidth
          label="Event Date"
          type="date"
          variant="outlined"
          size="small"
          value={newEvent.date}
          onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <TextField
          fullWidth
          label="Description (Optional)"
          multiline
          rows={2}
          variant="outlined"
          size="small"
          value={newEvent.description}
          onChange={(e) =>
            setNewEvent({ ...newEvent, description: e.target.value })
          }
          sx={{ mb: 0.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </ModalCard>
    </>
  );
};

// ─── AdminPayslipAndLeave ─────────────────────────────────────────────────────
const AdminPayslipAndLeave = ({ settings, employeeNumber }) => {
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const [allPayroll, setAllPayroll] = useState([]);
  const [payslipMonth, setPayslipMonth] = useState(new Date().getMonth());
  const [payslipYear] = useState(new Date().getFullYear());
  const [leaveCredits, setLeaveCredits] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  useEffect(() => {
    if (!employeeNumber) return;
    const fetchPayroll = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`,
          getAuthHeaders(),
        );
        setAllPayroll(Array.isArray(res.data) ? res.data : []);
      } catch {}
    };
    fetchPayroll();
  }, [employeeNumber]);

  useEffect(() => {
    const fetchLeaveCredits = async () => {
      if (!employeeNumber) return;
      setLeaveLoading(true);
      try {
        const [typesRes, assignmentsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/leaveRoute/leave_table`, getAuthHeaders()),
          axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`, getAuthHeaders()),
        ]);
        const userAssignments = assignmentsRes.data.filter(
          (a) => a.employeeNumber?.toString() === employeeNumber?.toString(),
        );
        const byCode = {};
        userAssignments.forEach((a) => {
          if (!byCode[a.leave_code]) byCode[a.leave_code] = [];
          byCode[a.leave_code].push(a);
        });
        const grouped = Object.entries(byCode).map(([code, entries]) => {
          const leaveType = typesRes.data.find((lt) => lt.leave_code === code);
          const sorted = entries.sort((a, b) => {
            const yearDiff = (b.period_year || 0) - (a.period_year || 0);
            if (yearDiff !== 0) return yearDiff;
            const semVal = (s) =>
              s?.includes("2nd") ? 2 : s?.includes("1st") ? 1 : 0;
            return semVal(b.period_semester) - semVal(a.period_semester);
          });
          const current = sorted[0];
          const previous = sorted.slice(1);
          const currRemaining = (parseFloat(current?.remaining_hours) || 0) / 8;
          const currTotal = (parseFloat(current?.total_hours) || 0) / 8;
          const currAllocated =
            (parseFloat(current?.allocated_hours) ||
              parseFloat(current?.total_hours) ||
              0) / 8;
          const prevRemaining = previous.reduce(
            (s, e) => s + (parseFloat(e.remaining_hours) || 0) / 8,
            0,
          );
          return {
            code,
            name: leaveType?.leave_description || code,
            currRemaining,
            currTotal,
            currAllocated,
            prevRemaining,
          };
        });
        setLeaveCredits(grouped);
      } catch {
        setLeaveCredits([]);
      } finally {
        setLeaveLoading(false);
      }
    };
    fetchLeaveCredits();
  }, [employeeNumber]);

  const payrollData = useMemo(() => {
    if (!allPayroll.length || !employeeNumber) return null;
    const resolveDate = (p) => {
      const raw =
        p.startDate ??
        p.start_date ??
        p.payroll_date ??
        p.period_start ??
        p.date ??
        null;
      if (!raw) return null;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    };
    const resolveEmpNum = (p) =>
      String(
        p.employeeNumber ?? p.employee_number ?? p.agencyEmployeeNum ?? "",
      ).trim();
    const matches = allPayroll.filter((p) => {
      const d = resolveDate(p);
      if (!d) return false;
      return (
        resolveEmpNum(p) === String(employeeNumber).trim() &&
        d.getMonth() === payslipMonth &&
        d.getFullYear() === payslipYear
      );
    });
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    return matches.reduce((acc, curr) => ({
      ...acc,
      pay1st: acc.pay1st ?? curr.pay1st ?? null,
      pay2nd: acc.pay2nd ?? curr.pay2nd ?? null,
    }));
  }, [allPayroll, employeeNumber, payslipMonth, payslipYear]);

  const getLeaveStatusColor = (remaining, total) => {
    if (total === 0 || remaining === 0) return "#B71C1C";
    const pct = (remaining / total) * 100;
    if (pct > 50) return "#2E7D32";
    if (pct > 20) return "#EF6C00";
    return "#B71C1C";
  };
  const totalLeave = leaveCredits.reduce(
    (s, g) => s + g.currRemaining + g.prevRemaining,
    0,
  );
  const fmt = (val) => {
    const n = parseFloat(val);
    return !isNaN(n) && n !== 0
      ? `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "₱0.00";
  };

  return (
    <SectionCard
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Professional flat tab bar */}
      <TabBar>
        <FlatTab
          label="Payslip"
          icon={Receipt}
          badge={monthNames[payslipMonth]?.slice(0, 3)}
          active={activeTab === 0}
          onClick={() => setActiveTab(0)}
        />
        <FlatTab
          label="Leave"
          icon={CalendarMonth}
          badge={`${totalLeave.toFixed(1)}d`}
          active={activeTab === 1}
          onClick={() => setActiveTab(1)}
        />
      </TabBar>

      {activeTab === 0 && (
        <Box
          onClick={() =>
            navigate("/payslip", {
              state: { selectedMonth: payslipMonth, selectedYear: payslipYear },
            })
          }
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            p: 1.25,
            minHeight: 0,
            gap: 1,
            cursor: "pointer",
            transition: "background 0.15s",
            "&:hover": { background: T.accentFaint },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Receipt sx={{ color: T.accent, fontSize: 13 }} />
              <Typography
                sx={{ fontWeight: 700, color: T.text, fontSize: "0.75rem" }}
              >
                My Payslip
              </Typography>
            </Box>
            <FormControl
              size="small"
              variant="outlined"
              sx={{
                minWidth: 100,
                "& .MuiOutlinedInput-root": {
                  fontSize: "0.7rem",
                  borderRadius: 2,
                  height: 26,
                  color: T.text,
                  "& fieldset": { borderColor: T.accentBorder },
                  "&:hover fieldset": { borderColor: T.accent },
                  "&.Mui-focused fieldset": { borderColor: T.accent },
                },
                "& .MuiSelect-icon": { color: T.accent, fontSize: 16 },
              }}
            >
              <Select
                value={payslipMonth}
                onChange={(e) => setPayslipMonth(e.target.value)}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      borderRadius: 2,
                      mt: 0.5,
                      bgcolor: "#fff",
                      border: `1px solid ${T.accentBorder}`,
                      boxShadow: `0 8px 24px rgba(0,0,0,0.1)`,
                      maxHeight: 220,
                    },
                  },
                }}
              >
                {monthNames.map((name, i) => (
                  <MenuItem
                    key={i}
                    value={i}
                    sx={{
                      fontSize: "0.72rem",
                      color: T.text,
                      py: 0.5,
                      fontWeight: payslipMonth === i ? 700 : 400,
                      bgcolor:
                        payslipMonth === i ? T.accentFaint : "transparent",
                      "&:hover": { bgcolor: T.accentHover },
                    }}
                  >
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Grid container spacing={0.75} sx={{ flexShrink: 0 }}>
            {[
              { label: "1st Quinceña", key: "pay1st" },
              { label: "2nd Quinceña", key: "pay2nd" },
            ].map(({ label, key }) => (
              <Grid item xs={6} key={key}>
                <Box
                  sx={{
                    bgcolor: T.accentFaint,
                    border: `1px solid ${T.accentBorder}`,
                    borderRadius: 2,
                    p: 1.25,
                  }}
                >
                  <Typography
                    sx={{
                      color: T.faint,
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      mb: 0.3,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      color: payrollData ? T.accent : T.muted,
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      lineHeight: 1,
                    }}
                  >
                    {payrollData ? fmt(payrollData[key]) : "₱-.--"}
                  </Typography>
                  {payrollData && (
                    <Typography
                      sx={{ color: T.faint, fontSize: "0.55rem", mt: 0.2 }}
                    >
                      {monthNames[payslipMonth]} {payslipYear}
                    </Typography>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>

          {!payrollData && (
            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 0.75,
                borderRadius: "8px",
                bgcolor: T.accentFaint,
                border: `1px dashed ${T.accentBorder}`,
              }}
            >
              <Typography sx={{ fontSize: "0.62rem", color: T.muted }}>
                No payslip for {monthNames[payslipMonth]}
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              opacity: 0.4,
              flexShrink: 0,
            }}
          >
            <ArrowForward sx={{ fontSize: 11, color: T.muted }} />
            <Typography
              sx={{ fontSize: "0.6rem", color: T.muted, fontWeight: 600 }}
            >
              Tap to view full payslip
            </Typography>
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            p: 1.25,
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <CalendarMonth sx={{ color: T.accent, fontSize: 13 }} />
              <Typography
                sx={{ fontWeight: 700, color: T.text, fontSize: "0.75rem" }}
              >
                Leave Credits
              </Typography>
            </Box>
            {!leaveLoading && leaveCredits.length > 0 && (
              <Box
                sx={{
                  px: 1.25,
                  py: 0.2,
                  borderRadius: "20px",
                  bgcolor: T.accentFaint,
                  border: `1px solid ${T.accentBorder}`,
                }}
              >
                <Typography
                  sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.accent }}
                >
                  {totalLeave.toFixed(1)} Days
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
              pr: 0.25,
              "&::-webkit-scrollbar": { width: 3 },
              "&::-webkit-scrollbar-thumb": {
                background: T.accentBorder,
                borderRadius: 2,
              },
            }}
          >
            {leaveLoading ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  py: 3,
                }}
              >
                <CircularProgress size={14} sx={{ color: T.accent }} />
                <Typography sx={{ color: T.muted, fontSize: "0.72rem" }}>
                  Loading...
                </Typography>
              </Box>
            ) : leaveCredits.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <Typography
                  sx={{
                    color: T.faint,
                    textAlign: "center",
                    fontSize: "0.7rem",
                  }}
                >
                  No leave credits assigned
                </Typography>
              </Box>
      ) : (
              <Grid container spacing={1}>
                {leaveCredits.map((leave, idx) => {
                  const pct =
                    leave.currTotal > 0
                      ? (leave.currRemaining / leave.currTotal) * 100
                      : 0;
                  const statusColor = getLeaveStatusColor(
                    leave.currRemaining,
                    leave.currTotal,
                  );
                  const usedDays = leave.currAllocated - leave.currRemaining;
                  return (
<Grid item xs={4} key={idx}>
                      <Box
                        sx={{
                          borderRadius: "10px",
                          border: `1px solid ${T.accentBorder}`,
                          bgcolor: "#fff",
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.4,
                          p: 0.9,
                          transition: "all 0.15s",
                          "&:hover": {
                            boxShadow: `0 4px 14px ${statusColor}22`,
                            borderColor: `${statusColor}50`,
                          },
                        }}
                      >
                        {/* Header: name */}
                        <Typography
                          sx={{
                            fontWeight: 700,
                            color: T.text,
                            fontSize: "0.55rem",
                            lineHeight: 1.25,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {leave.name}
                        </Typography>

                        {/* Big number */}
                        <Box sx={{ textAlign: "center" }}>
                          <Typography
                            sx={{
                              color: statusColor,
                              fontWeight: 800,
                              fontSize: "1.25rem",
                              lineHeight: 1,
                            }}
                          >
                            {leave.currRemaining.toFixed(1)}
                          </Typography>
                          <Typography
                            sx={{
                              color: T.faint,
                              fontSize: "0.5rem",
                              fontWeight: 600,
                              mt: 0.1,
                            }}
                          >
                            days left
                          </Typography>
                        </Box>

                        {/* Footer: progress + meta */}
                        <Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(pct, 100)}
                            sx={{
                              height: 3.5,
                              borderRadius: 2,
                              bgcolor: `${statusColor}18`,
                              mb: 0.3,
                              ".MuiLinearProgress-bar": {
                                bgcolor: statusColor,
                                borderRadius: 2,
                              },
                            }}
                          />
                          <Typography
                            sx={{
                              color: T.faint,
                              fontSize: "0.48rem",
                              fontWeight: 500,
                              textAlign: "center",
                              lineHeight: 1.2,
                            }}
                          >
                            {usedDays < 0 ? 0 : usedDays.toFixed(1)} /{" "}
                            {leave.currAllocated.toFixed(1)} used
                          </Typography>
                          {leave.prevRemaining > 0 && (
                            <Typography
                              sx={{
                                color: "#E65100",
                                fontWeight: 700,
                                fontSize: "0.46rem",
                                textAlign: "center",
                                mt: 0.15,
                                lineHeight: 1.2,
                              }}
                            >
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </Box>
      )}
    </SectionCard>
  );
};

// ─── LogoutDialog ─────────────────────────────────────────────────────────────
const LogoutDialog = ({ open, settings }) => (
  <Dialog
    open={open}
    fullScreen
    PaperProps={{ sx: { backgroundColor: "transparent", boxShadow: "none" } }}
    BackdropProps={{
      sx: {
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      },
    }}
  >
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          sx={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background:
              i % 2 === 0 ? settings.primaryColor : settings.accentColor,
            position: "absolute",
            top: "50%",
            left: "50%",
            transformOrigin: "-60px 0px",
            animation: `orbit${i} ${3 + i}s linear infinite`,
            boxShadow: `0 0 15px ${settings.primaryColor}`,
          }}
        />
      ))}
      <Box sx={{ position: "relative", width: 120, height: 120 }}>
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, ${settings.secondaryColor}, ${settings.primaryColor})`,
            boxShadow: `0 0 40px ${settings.primaryColor}`,
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "floatSphere 2s ease-in-out infinite alternate",
          }}
        >
          <Box
            component="img"
            src={logo}
            alt="Logo"
            sx={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              animation: "heartbeat 1s infinite",
            }}
          />
        </Box>
      </Box>
      <Typography
        variant="h6"
        sx={{
          mt: 3,
          fontWeight: "bold",
          color: settings.accentColor,
          animation: "pulse 1.5s infinite",
        }}
      >
        Signing out...
      </Typography>
      <Box
        component="style"
        children={`
        @keyframes heartbeat { 0%,100% { transform: scale(1); } 25%,75% { transform: scale(1.15); } 50% { transform: scale(1.05); } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        @keyframes floatSphere { 0% { transform: translate(-50%, -50%) translateY(0); } 100% { transform: translate(-50%, -50%) translateY(-15px); } }
        @keyframes orbit0 { 0% { transform: rotate(0deg) translateX(60px); } 100% { transform: rotate(360deg) translateX(60px); } }
        @keyframes orbit1 { 0% { transform: rotate(90deg) translateX(60px); } 100% { transform: rotate(450deg) translateX(60px); } }
        @keyframes orbit2 { 0% { transform: rotate(180deg) translateX(60px); } 100% { transform: rotate(540deg) translateX(60px); } }
        @keyframes orbit3 { 0% { transform: rotate(270deg) translateX(60px); } 100% { transform: rotate(630deg) translateX(60px); } }
      `}
      />
    </Box>
  </Dialog>
);

// ─── AdminHome ────────────────────────────────────────────────────────────────
const AdminHome = () => {
  const { username, fullName, employeeNumber, profilePicture } = useAuth();
  const settings = useSystemSettings();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    stats,
    weeklyAttendanceData,
    departmentAttendanceData,
    payrollStatusData,
    monthlyAttendanceTrend,
    payrollTrendData,
    attendanceChartData,
    announcements,
    suspensions,
    holidays,
    rawHolidays,
    loading,
    loadingCarousel,
    loadingPayroll,
    refreshAllData,
  } = useDashboardData(settings);

  const [pageLoading, setPageLoading] = useState(true);
  const pageLoadingResolvedRef = useRef(false);

  useEffect(() => {
    if (pageLoadingResolvedRef.current) return;
    if (!loading && !loadingCarousel && !loadingPayroll) {
      pageLoadingResolvedRef.current = true;
      setTimeout(() => setPageLoading(false), 400);
    }
  }, [loading, loadingCarousel, loadingPayroll]);

  const isNotExpired = (date_end) => {
    if (!date_end) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const e = new Date(date_end);
    e.setHours(0, 0, 0, 0);
    return today <= e;
  };

  const scheduledHolidaysForCarousel = useMemo(
    () =>
      (rawHolidays || [])
        .filter(
          (h) =>
            (h.status || "").toLowerCase() === "active" &&
            isNotExpired(h.date_end || h.date),
        )
        .map((h) => ({
          id: `holiday-${h.id}`,
          title: h.title || h.description || "",
          about: h.about || "Official holiday.",
          date: h.date_start || h.date_end || h.date,
          date_start: h.date_start || h.date,
          date_end: h.date_end || h.date,
          image: h.image || null,
        })),
    [rawHolidays],
  );
  const suspensionsForCarousel = useMemo(
    () =>
      (suspensions || [])
        .filter(
          (s) =>
            !s.date_end ||
            new Date(s.date_end) >= new Date(new Date().setHours(0, 0, 0, 0)),
        )
        .map((s) => ({
          id: `suspension-${s.id}`,
          title: s.title || "",
          about: s.about || "",
          date: s.date_start || s.date_end || s.date,
          date_start: s.date_start || s.date,
          date_end: s.date_end || s.date,
          image: s.image || null,
        })),
    [suspensions],
  );
  const announcementsInRange = useMemo(
    () =>
      (announcements || []).filter(
        (a) =>
          !a.date_end ||
          new Date(a.date_end) >= new Date(new Date().setHours(0, 0, 0, 0)),
      ),
    [announcements],
  );
  const carouselItems = useMemo(
    () =>
      [
        ...scheduledHolidaysForCarousel,
        ...suspensionsForCarousel,
        ...announcementsInRange,
      ].sort(
        (a, b) =>
          new Date(b.date_start || b.date) - new Date(a.date_start || a.date),
      ),
    [
      scheduledHolidaysForCarousel,
      suspensionsForCarousel,
      announcementsInRange,
    ],
  );

  const {
    currentSlide,
    isPlaying,
    handlePrevSlide,
    handleNextSlide,
    handleSlideSelect,
    togglePlayPause,
  } = useCarousel(carouselItems);
  const currentTime = useTime();

  const [userRole, setUserRole] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [openModal, setOpenModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [announcementDetails, setAnnouncementDetails] = useState({});
  const [contactTicketStatuses, setContactTicketStatuses] = useState({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notifFilter, setNotifFilter] = useState("all");

  const openMenu = Boolean(anchorEl);
  useEffect(() => {
    setUserRole(getUserRole());
  }, []);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleOpenModal = (announcement) => {
    setSelectedAnnouncement(announcement);
    setOpenModal(true);
  };
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedAnnouncement(null);
  };
  const handleLogout = () => {
    setLogoutOpen(true);
    setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/";
    }, 500);
  };

  const fetchNotifications = useCallback(async () => {
    if (!employeeNumber) return;
    const empNum = String(employeeNumber).trim();
    if (!empNum) return;
    try {
      const notifRes = await axios.get(
        `${API_BASE_URL}/api/notifications/${empNum}`,
        getAuthHeaders(),
      );
      const filteredNotifications = Array.isArray(notifRes.data)
        ? notifRes.data.filter(
            (notif) => String(notif.employeeNumber).trim() === empNum,
          )
        : [];
      setNotifications((prev) => {
        const localReadIds = new Set(
          prev.filter((n) => n.read_status === 1).map((n) => n.id),
        );
        return filteredNotifications.map((n) =>
          localReadIds.has(n.id) ? { ...n, read_status: 1 } : n,
        );
      });
      const contactNotifs = filteredNotifications.filter(
        (n) =>
          n.notification_type === "contact" || n.notification_type === "ticket",
      );
      if (contactNotifs.length > 0) {
        try {
          const ticketsRes = await axios.get(`${API_BASE_URL}/api/contact-us`, getAuthHeaders());
          const ticketList = ticketsRes.data?.data || ticketsRes.data || [];
          const ticketIdMap = {};
          ticketList.forEach((t) => {
            ticketIdMap[t.id] = t.status;
          });
          const notifStatusMap = {};
          contactNotifs.forEach((notif) => {
            const contactMatch = (notif.action_link || "").match(
              /\/settings\/contact\/(\d+)/,
            );
            const ticketId = contactMatch ? Number(contactMatch[1]) : null;
            if (ticketId && ticketIdMap[ticketId]) {
              notifStatusMap[notif.id] = ticketIdMap[ticketId];
            } else {
              const empNum2 = String(notif.employeeNumber || "").trim();
              const empTickets = ticketList.filter(
                (t) => String(t.employee_number || "").trim() === empNum2,
              );
              if (empTickets.length > 0) {
                const latest = empTickets.sort(
                  (a, b) =>
                    new Date(b.updated_at || b.created_at) -
                    new Date(a.updated_at || a.created_at),
                )[0];
                notifStatusMap[notif.id] = latest.status;
              }
            }
          });
          setContactTicketStatuses(notifStatusMap);
        } catch {}
      }
      const announcementNotifs = filteredNotifications.filter(
        (n) => n.notification_type === "announcement" && n.announcement_id,
      );
      if (announcementNotifs.length > 0) {
        try {
          const annRes = await axios.get(`${API_BASE_URL}/api/announcements`, getAuthHeaders());
          const announcementList = Array.isArray(annRes.data)
            ? annRes.data
            : [];
          const detailsMap = {};
          announcementNotifs.forEach((notif) => {
            const announcement = announcementList.find(
              (ann) =>
                ann.id === notif.announcement_id ||
                ann.id === parseInt(notif.announcement_id),
            );
            if (announcement) detailsMap[notif.id] = announcement;
          });
          setAnnouncementDetails(detailsMap);
        } catch {}
      }
    } catch {
      setNotifications([]);
    }
  }, [employeeNumber]);

  const fetchNotificationsRef = useRef(fetchNotifications);
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket || !connected) return;
    const scheduleRefresh = () => {
      setTimeout(() => {
        if (typeof fetchNotificationsRef.current === "function")
          fetchNotificationsRef.current();
      }, 250);
    };
    socket.on("notificationCreated", scheduleRefresh);
    return () => socket.off("notificationCreated", scheduleRefresh);
  }, [socket, connected]);

  const handleNotificationClick = async (notification) => {
    if (notification.read_status === 0) {
      try {
        await axios.put(
          `${API_BASE_URL}/api/notifications/${notification.id}/read`,
          {},
          getAuthHeaders(),
        );
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read_status: 1 } : n,
          ),
        );
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }
    const type = notification.notification_type;
    const link = notification.action_link || "";
    if (type === "payslip" || link.includes("payslip")) {
      setNotifModalOpen(false);
      navigate("/payslip");
    } else if (
      type === "contact" ||
      type === "ticket" ||
      link.includes("settings")
    ) {
      setNotifModalOpen(false);
      const contactMatch = (notification.action_link || "").match(
        /\/settings\/contact\/(\d+)/,
      );
      const ticketIdFromLink = contactMatch ? Number(contactMatch[1]) : null;
      const statusMatch = (notification.action_link || "").match(
        /[?&]status=([^&]+)/,
      );
      const liveStatus = ticketIdFromLink
        ? contactTicketStatuses[ticketIdFromLink]
        : null;
      const ticketStatusFromLink =
        liveStatus || (statusMatch ? statusMatch[1] : null);
      navigate("/settings", {
        state: {
          section: "contact",
          ticketId: ticketIdFromLink,
          ticketStatus: ticketStatusFromLink,
        },
      });
    } else if (type === "announcement" || link.includes("announcement")) {
      try {
        const annRes = await axios.get(`${API_BASE_URL}/api/announcements`, getAuthHeaders());
        const list = Array.isArray(annRes.data) ? annRes.data : [];
        let match = notification.announcement_id
          ? list.find(
              (a) =>
                a.id === notification.announcement_id ||
                a.id === parseInt(notification.announcement_id),
            )
          : null;
        if (!match && notification.announcement_id)
          match = announcementDetails[notification.id];
        if (!match && list.length > 0) match = list[0];
        setNotifModalOpen(false);
        if (match) {
          setSelectedAnnouncement(match);
          setOpenModal(true);
        }
      } catch (err) {
        console.error("Error fetching announcement:", err);
        setNotifModalOpen(false);
      }
    } else if (type === "holiday" || type === "suspension") {
      setNotifModalOpen(false);
    } else if (link) {
      setNotifModalOpen(false);
      navigate(link);
    }
  };

  const derivedUnreadCount = notifications.filter(
    (n) => n.read_status === 0,
  ).length;

  const getCarouselItemForNotif = useCallback(
    (notif) => {
      const type = notif.notification_type;
      if (type === "announcement") return announcementDetails[notif.id] || null;
      if (type === "holiday") return scheduledHolidaysForCarousel[0] || null;
      if (type === "suspension") return suspensionsForCarousel[0] || null;
      return null;
    },
    [announcementDetails, scheduledHolidaysForCarousel, suspensionsForCarousel],
  );

  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    return notifications.filter((n) => {
      if (notifFilter === "all") return true;
      if (notifFilter === "unread") return n.read_status === 0;
      if (notifFilter === "contact")
        return (
          n.notification_type === "contact" || n.notification_type === "ticket"
        );
      return n.notification_type === notifFilter;
    });
  }, [notifications, notifFilter]);

  const getNotificationDayLabel = useCallback((createdAt) => {
    if (!createdAt) return "Earlier";
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return "Earlier";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return "Today";
    if (d.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    const unread = (notifications || []).filter((n) => n.read_status === 0);
    if (!unread.length) return;
    const auth = getAuthHeaders();
    try {
      await Promise.allSettled(
        unread.map((n) =>
          axios.put(
            `${API_BASE_URL}/api/notifications/${n.id}/read`,
            {},
            auth,
          ),
        ),
      );
    } finally {
      setNotifications((prev) =>
        prev.map((n) => (n.read_status === 0 ? { ...n, read_status: 1 } : n)),
      );
    }
  }, [notifications]);

  const handleCloseNotifModal = () => {
    setNotifModalOpen(false);
    setNotifFilter("all");
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (pageLoading)
    return (
      <Box
        sx={{
          width: "100vw",
          maxWidth: "100%",
          position: "relative",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <AdminWireframeLoading />
      </Box>
    );

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          width: "100vw",
          maxWidth: "100%",
          position: "relative",
          left: "55%",
          transform: "translateX(-53.5%)",
        }}
      >
        <style>{shimmerKf}</style>
        <Box sx={{ py: -1, px: { xs: -5, sm: -5, md: -5 }, mx: "auto" }}>
          {/* ── HEADER ── */}
          <SectionCard sx={{ mb: 2 }}>
            <Box
              sx={{
                px: 4,
                py: 3,
                background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* decorative circles */}
              <Box
                sx={{
                  position: "absolute",
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: -30,
                  left: "30%",
                  width: 150,
                  height: 150,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)",
                }}
              />

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2.5,
                  position: "relative",
                  zIndex: 1,
                }}
              >
            
                <Box>
                  <Typography
                    sx={{
                      fontSize: "1.1rem",
                      color: T.accent,
                      lineHeight: 1.2,
                    }}
                  >
                    Hello,{" "}
                    <span style={{ color: T.text, fontWeight: 700 }}>
                      {fullName || username} !
                    </span>
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: T.muted,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.25,
                    }}
                  >
                    <AccessTimeIcon sx={{ fontSize: 13 }} />
                    {currentTime.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span
                      style={{
                        marginLeft: 6,
                        color: T.accent,
                        fontWeight: 700,
                      }}
                    >
                      {currentTime.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Tooltip title="Notifications">
                  <IconButton
                    size="small"
                    onClick={async () => {
                      if (!notifications.length) await fetchNotifications();
                      setNotifModalOpen(true);
                    }}
                    sx={{
                      bgcolor: T.accentFaint,
                      border: `1px solid ${T.accentBorder}`,
                      color: T.accent,
                      borderRadius: "8px",
                      width: 36,
                      height: 36,
                      "&:hover": { bgcolor: T.accentHover },
                    }}
                  >
                    <Badge
                      badgeContent={derivedUnreadCount}
                      color="error"
                      max={9}
                    >
                      <NotificationsIcon sx={{ fontSize: 18 }} />
                    </Badge>
                  </IconButton>
                </Tooltip>

                {/* Profile icon — untouched */}
                <Box
                  sx={{
                    position: "relative",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      inset: -2,
                      borderRadius: "50%",
                      padding: "2px",
                      background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                      WebkitMask:
                        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    },
                  }}
                >
                  <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                    <Avatar
                      alt={username}
                      src={
                        profilePicture
                          ? buildImageUrl(profilePicture)
                          : undefined
                      }
                      sx={{ width: 36, height: 36 }}
                    />
                  </IconButton>
                </Box>

                <Menu
                  anchorEl={anchorEl}
                  open={openMenu}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  PaperProps={{
                    sx: {
                      borderRadius: 2,
                      minWidth: 180,
                      bgcolor: "#fff",
                      border: `1px solid ${T.accentBorder}`,
                      boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                      "& .MuiMenuItem-root": {
                        fontSize: "0.875rem",
                        color: T.text,
                        "&:hover": { background: T.accentFaint },
                      },
                    },
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      navigate("/profile");
                    }}
                  >
                    <AccountCircle
                      sx={{ mr: 1, fontSize: 18, color: T.accent }}
                    />{" "}
                    Profile
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      navigate("/settings");
                    }}
                  >
                    <Settings sx={{ mr: 1, fontSize: 18, color: T.accent }} />{" "}
                    Settings
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      navigate("/faqs");
                    }}
                  >
                    <HelpOutline
                      sx={{ mr: 1, fontSize: 18, color: T.accent }}
                    />{" "}
                    FAQs
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      navigate("/privacy-policy");
                    }}
                  >
                    <PrivacyTip sx={{ mr: 1, fontSize: 18, color: T.accent }} />{" "}
                    Privacy Policy
                  </MenuItem>
                  <Divider sx={{ borderColor: T.divider }} />
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      handleLogout();
                    }}
                  >
                    <Logout sx={{ mr: 1, fontSize: 18, color: T.accent }} />{" "}
                    Sign Out
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          </SectionCard>

          {/* ── STAT CARDS ── */}
          <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "nowrap" }}>
            {STAT_CARDS(settings).map((card, index) => (
              <Box key={card.label} sx={{ flex: "1 1 0", minWidth: 0 }}>
                <CompactStatCard
                  card={card}
                  index={index}
                  stats={stats}
                  loading={
                    [
                      "pendingPayroll",
                      "processedPayroll",
                      "payslipCount",
                    ].includes(card.valueKey)
                      ? loadingPayroll
                      : loading
                  }
                  hoveredCard={hoveredCard}
                  setHoveredCard={setHoveredCard}
                />
              </Box>
            ))}
          </Box>

          {/* ── MAIN GRID ── */}
          <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            {/* LEFT — Facial Recognition */}
            <Grid
              item
              xs={12}
              md={4}
              sx={{
                height: { xs: "60vw", md: "calc(100vh - 360px)" },
                minHeight: 0,
              }}
            >
              <FacialRecognitionFeed />
            </Grid>

            {/* CENTER — Carousel & Audit*/}
            <Grid
              item
              xs={12}
              md={3}
              sx={{
                height: { xs: "52vw", md: "calc(100vh - 360px)" },
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                minHeight: 0,
              }}
            >
              <Grid
                fullWidth
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                  <SectionCard
                    sx={{
                      height: "100%",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <Box sx={{ position: "relative", height: "100%" }}>
                      {Array.isArray(carouselItems) && carouselItems.length > 0 ? (
                        <Fade
                          in={true}
                          key={currentSlide}
                          timeout={{ enter: 800, exit: 400 }}
                        >
                          <Box
                            sx={{
                              position: "relative",
                              height: "100%",
                              width: "100%",
                            }}
                          >
                            <Box
                              component="img"
                              src={
                                carouselItems[currentSlide]?.image
                                  ? buildImageUrl(carouselItems[currentSlide].image)
                                  : "/api/placeholder/800/400"
                              }
                              alt={
                                carouselItems[currentSlide]?.title || "Announcement"
                              }
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                            <Box
                              sx={{
                                position: "absolute",
                                inset: 0,
                                background:
                                  "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0) 70%)",
                              }}
                            />

                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrevSlide();
                              }}
                              sx={{
                                position: "absolute",
                                left: 16,
                                top: "50%",
                                transform: "translateY(-50%)",
                                bgcolor: "rgba(0,0,0,0.35)",
                                backdropFilter: "blur(4px)",
                                border: "0.5px solid rgba(255,255,255,0.2)",
                                "&:hover": {
                                  bgcolor: "rgba(0,0,0,0.55)",
                                  transform: "translateY(-50%) scale(1.05)",
                                },
                                color: "#fff",
                                zIndex: 10,
                                width: 36,
                                height: 36,
                              }}
                            >
                              <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNextSlide();
                              }}
                              sx={{
                                position: "absolute",
                                right: 16,
                                top: "50%",
                                transform: "translateY(-50%)",
                                bgcolor: "rgba(0,0,0,0.35)",
                                backdropFilter: "blur(4px)",
                                border: "0.5px solid rgba(255,255,255,0.2)",
                                "&:hover": {
                                  bgcolor: "rgba(0,0,0,0.55)",
                                  transform: "translateY(-50%) scale(1.05)",
                                },
                                color: "#fff",
                                zIndex: 10,
                                width: 36,
                                height: 36,
                              }}
                            >
                              <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlayPause();
                              }}
                              sx={{
                                position: "absolute",
                                top: 14,
                                right: 14,
                                bgcolor: "rgba(0,0,0,0.35)",
                                backdropFilter: "blur(4px)",
                                border: "0.5px solid rgba(255,255,255,0.2)",
                                "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
                                color: "#fff",
                                zIndex: 10,
                                width: 30,
                                height: 30,
                              }}
                            >
                              {isPlaying ? (
                                <Pause sx={{ fontSize: 14 }} />
                              ) : (
                                <PlayArrow sx={{ fontSize: 14 }} />
                              )}
                            </IconButton>

                            <Box
                              onClick={() =>
                                handleOpenModal(carouselItems[currentSlide])
                              }
                              sx={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                p: 3,
                                color: "#fff",
                                cursor: "pointer",
                                zIndex: 10,
                              }}
                            >
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  px: 1.5,
                                  py: 0.3,
                                  borderRadius: "20px",
                                  bgcolor: "rgba(109,35,35,0.75)",
                                  backdropFilter: "blur(8px)",
                                  border: "0.5px solid rgba(255,255,255,0.2)",
                                  mb: 1.5,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: "0.62rem",
                                    fontWeight: 700,
                                    color: "#fff",
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {carouselItems[currentSlide]?.id
                                    ?.toString()
                                    .startsWith("holiday-")
                                    ? "Holiday"
                                    : carouselItems[currentSlide]?.id
                                          ?.toString()
                                          .startsWith("suspension-")
                                      ? "Suspension"
                                      : "Announcement"}
                                </Typography>
                              </Box>
                              <Typography
                                variant="h4"
                                sx={{
                                  fontWeight: 800,
                                  mb: 0.75,
                                  lineHeight: 1.2,
                                  textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                                }}
                              >
                                {carouselItems[currentSlide]?.title}
                              </Typography>
                              <Typography
                                sx={{
                                  opacity: 0.85,
                                  fontSize: "0.85rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                }}
                              >
                                <AccessTimeIcon sx={{ fontSize: 14 }} />
                                {(() => {
                                  const raw = carouselItems[currentSlide]?.date;
                                  if (!raw) return "";
                                  const d = new Date(raw);
                                  return isNaN(d)
                                    ? raw
                                    : d.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      });
                                })()}
                              </Typography>
                            </Box>

                            {/* dot indicators */}
                            <Box
                              sx={{
                                position: "absolute",
                                bottom: 16,
                                right: 16,
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                                zIndex: 10,
                              }}
                            >
                              {carouselItems.map((_, idx) => (
                                <Box
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSlideSelect(idx);
                                  }}
                                  sx={{
                                    width: currentSlide === idx ? 24 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor:
                                      currentSlide === idx
                                        ? "#fff"
                                        : "rgba(255,255,255,0.4)",
                                    transition: "all 0.3s ease",
                                    cursor: "pointer",
                                    border: "0.5px solid rgba(255,255,255,0.3)",
                                    "&:hover": { bgcolor: "rgba(255,255,255,0.7)" },
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        </Fade>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <CampaignIcon
                            sx={{ fontSize: 64, color: T.accentBorder }}
                          />
                          <Typography sx={{ fontSize: "0.9rem", color: T.muted }}>
                            No announcements is currently available.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </SectionCard>
              </Grid>
              <Grid
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <CompactAuditLogs userRole={userRole} />
              </Grid>
            </Grid>

            {/* RIGHT */}
            <Grid
              item
              xs={12}
              md={5}
              sx={{
                height: { xs: "auto", md: "calc(100vh - 360px)" },
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 1.5,
                  flex: 1,
                  minHeight: 0,
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    minWidth: 0,
                    minHeight: 0,
                    overflow: "hidden",
                  }}
                >
                  <CompactCalendar
                    calendarDate={calendarDate}
                    setCalendarDate={setCalendarDate}
                    holidays={holidays}
                    announcements={announcements}
                    settings={settings}
                    setSelectedDate={setSelectedDate}
                  />
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <TasksAndEvents
                      settings={settings}
                      employeeNumber={employeeNumber}
                    />
                  </Box>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    minWidth: 0,
                    minHeight: 0,
                    overflow: "hidden",
                  }}
                >
                  <QuickActions settings={settings} userRole={userRole} />
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <AdminPayslipAndLeave
                      settings={settings}
                      employeeNumber={employeeNumber}
                    />
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* ── ANNOUNCEMENT DETAIL MODAL ── */}
          <Modal open={openModal} onClose={handleCloseModal}>
            <Fade in={openModal}>
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: { xs: "96%", sm: "82%", md: "68%" },
                  maxWidth: 720,
                  bgcolor: "background.paper",
                  borderRadius: "16px",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.32)",
                  maxHeight: "90vh",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  border: "0.5px solid rgba(0,0,0,0.09)",
                }}
              >
                {selectedAnnouncement &&
                  (() => {
                    const isHoliday = selectedAnnouncement.id
                      ?.toString()
                      .startsWith("holiday-");
                    const isSuspension = selectedAnnouncement.id
                      ?.toString()
                      .startsWith("suspension-");
                    const type = isHoliday
                      ? "HOLIDAY"
                      : isSuspension
                        ? "SUSPENSION"
                        : "ANNOUNCEMENT";
                    const accentColor = isHoliday
                      ? "#FB8C00"
                      : isSuspension
                        ? "#B71C1C"
                        : "#1976D2";
                    const fmtDate = (raw) => {
                      if (!raw) return null;
                      const d = new Date(raw);
                      if (isNaN(d)) return null;
                      return d.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                    };
                    const dateStart = fmtDate(
                      selectedAnnouncement.date_start ||
                        selectedAnnouncement.date,
                    );
                    const dateEnd = fmtDate(selectedAnnouncement.date_end);
                    const dateRange =
                      dateEnd && dateEnd !== dateStart
                        ? `${dateStart} — ${dateEnd}`
                        : dateStart;
                    const shortStart =
                      selectedAnnouncement.date_start ||
                      selectedAnnouncement.date
                        ? new Date(
                            selectedAnnouncement.date_start ||
                              selectedAnnouncement.date,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : null;
                    const shortEnd = selectedAnnouncement.date_end
                      ? new Date(
                          selectedAnnouncement.date_end,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : null;
                    const dateChip =
                      shortEnd && shortEnd !== shortStart
                        ? `${shortStart} – ${shortEnd}`
                        : shortStart;
                    return (
                      <>
                        <Box
                          sx={{
                            position: "relative",
                            height: { xs: 220, sm: 290, md: 330 },
                            flexShrink: 0,
                            bgcolor: "#0d0d0d",
                            overflow: "hidden",
                          }}
                        >
                          {selectedAnnouncement.image ? (
                            <Box
                              component="img"
                              src={buildImageUrl(selectedAnnouncement.image)}
                              alt={selectedAnnouncement.title}
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                opacity: 0.42,
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: "100%",
                                height: "100%",
                                background: `linear-gradient(135deg, ${accentColor}dd 0%, #050505 100%)`,
                              }}
                            />
                          )}
                          <Box
                            sx={{
                              position: "absolute",
                              inset: 0,
                              background:
                                "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.5) 48%, rgba(0,0,0,0.04) 100%)",
                            }}
                          />
                          <Box
                            sx={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              px: 2.5,
                              pt: 2,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.75,
                                bgcolor: `${accentColor}55`,
                                border: "0.5px solid rgba(255,255,255,0.2)",
                                backdropFilter: "blur(10px)",
                                borderRadius: "20px",
                                px: 1.4,
                                py: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  bgcolor: accentColor,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: "0.6rem",
                                  fontWeight: 700,
                                  letterSpacing: "0.12em",
                                  color: "#fff",
                                  textTransform: "uppercase",
                                }}
                              >
                                {type}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={handleCloseModal}
                              sx={{
                                bgcolor: "rgba(0,0,0,0.4)",
                                color: "#fff",
                                backdropFilter: "blur(8px)",
                                border: "0.5px solid rgba(255,255,255,0.15)",
                                width: 28,
                                height: 28,
                                "&:hover": {
                                  bgcolor: "rgba(0,0,0,0.65)",
                                  transform: "rotate(90deg)",
                                },
                                transition: "all 0.2s",
                              }}
                            >
                              <CloseIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Box>
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              px: 3,
                              pb: 2.5,
                            }}
                          >
                            {dateRange && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                  mb: 1,
                                }}
                              >
                                <AccessTimeIcon
                                  sx={{
                                    fontSize: 12,
                                    color: "rgba(255,255,255,0.5)",
                                  }}
                                />
                                <Typography
                                  sx={{
                                    fontSize: "0.72rem",
                                    color: "rgba(255,255,255,0.5)",
                                  }}
                                >
                                  {dateRange}
                                </Typography>
                              </Box>
                            )}
                            <Typography
                              sx={{
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: {
                                  xs: "1.2rem",
                                  sm: "1.5rem",
                                  md: "1.8rem",
                                },
                                lineHeight: 1.2,
                              }}
                            >
                              {selectedAnnouncement.title}
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            height: "3px",
                            flexShrink: 0,
                            background: `linear-gradient(90deg, ${accentColor} 0%, transparent 100%)`,
                          }}
                        />
                        <Box
                          sx={{
                            px: 3,
                            py: 1.25,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flexWrap: "wrap",
                            borderBottom: `1px solid ${T.divider}`,
                            flexShrink: 0,
                          }}
                        >
                          {dateChip && (
                            <Chip
                              icon={
                                <Event
                                  sx={{
                                    fontSize: "12px !important",
                                    color: `${accentColor} !important`,
                                  }}
                                />
                              }
                              label={dateChip}
                              size="small"
                              sx={{
                                fontSize: "0.68rem",
                                height: 22,
                                fontWeight: 600,
                                bgcolor: `${accentColor}0F`,
                                border: `1px solid ${accentColor}28`,
                                color: accentColor,
                              }}
                            />
                          )}
                        </Box>
                        <Box
                          sx={{
                            flex: 1,
                            overflowY: "auto",
                            px: 3,
                            py: 2.25,
                            "&::-webkit-scrollbar": { width: 3 },
                            "&::-webkit-scrollbar-thumb": {
                              bgcolor: T.accentBorder,
                              borderRadius: 2,
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.9rem",
                              color: T.text,
                              lineHeight: 1.9,
                              whiteSpace: "pre-line",
                            }}
                          >
                            {selectedAnnouncement.about ||
                              "No additional details provided."}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            px: 3,
                            py: 1.5,
                            borderTop: `1px solid ${T.divider}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexShrink: 0,
                            bgcolor: T.accentFaint,
                            gap: 2,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              flexWrap: "wrap",
                            }}
                          >
                            {[
                              ["#FB8C00", "Holiday"],
                              ["#B71C1C", "Suspension"],
                              ["#1976D2", "Announcement"],
                            ].map(([color, label]) => (
                              <Box
                                key={label}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: color,
                                  }}
                                />
                                <Typography
                                  sx={{ fontSize: "0.68rem", color: T.muted }}
                                >
                                  {label}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                          <Button
                            onClick={handleCloseModal}
                            size="small"
                            sx={{
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              color: "#fff",
                              bgcolor: accentColor,
                              borderRadius: "8px",
                              px: 2.5,
                              py: 0.65,
                              "&:hover": {
                                bgcolor: "transparent",
                                color: accentColor,
                                border: `1px solid ${accentColor}`,
                              },
                            }}
                          >
                            Dismiss
                          </Button>
                        </Box>
                      </>
                    );
                  })()}
              </Box>
            </Fade>
          </Modal>

          {/* ── NOTIFICATIONS MODAL ── */}
          <Modal open={notifModalOpen} onClose={handleCloseNotifModal}>
            <Fade in={notifModalOpen}>
              <Box
                sx={{
                  position: "absolute",
                  top: { xs: "50%", md: "76px" },
                  right: { xs: "50%", md: "20px" },
                  transform: { xs: "translate(50%, -50%)", md: "none" },
                  width: { xs: "92%", sm: "400px" },
                  maxHeight: "85vh",
                  display: "flex",
                  flexDirection: "column",
                  bgcolor: "#fff",
                  border: `0.5px solid rgba(0,0,0,0.09)`,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <Box
                  sx={{ px: 2, py: 1.25, background: T.accent, flexShrink: 0 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "8px",
                        bgcolor: "rgba(255,255,255,0.12)",
                        border: "0.5px solid rgba(255,255,255,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <NotificationsIcon sx={{ fontSize: 14, color: "#fff" }} />
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      Notifications
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    {derivedUnreadCount > 0 && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.15,
                          borderRadius: "20px",
                          bgcolor: "rgba(255,255,255,0.2)",
                          border: "0.5px solid rgba(255,255,255,0.25)",
                          color: "#fff",
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          lineHeight: 1.7,
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {derivedUnreadCount} unread
                      </Box>
                    )}
                    <NotifFilterChips
                      activeFilter={notifFilter}
                      onChange={setNotifFilter}
                      settings={settings}
                      unreadCount={derivedUnreadCount}
                    />
                    <IconButton
                      size="small"
                      onClick={handleCloseNotifModal}
                      sx={{
                        color: "rgba(255,255,255,0.8)",
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                        bgcolor: "rgba(255,255,255,0.12)",
                        border: "0.5px solid rgba(255,255,255,0.2)",
                        borderRadius: "6px",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                      }}
                    >
                      <Close sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  onClick={markAllNotificationsAsRead}
                  disabled={derivedUnreadCount === 0}
                  sx={{
                    justifyContent: "flex-end",
                    textTransform: "none",
                    borderRadius: 0,
                    py: 0.6,
                    px: 2,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: T.accent,
                    bgcolor: T.accentFaint,
                    borderBottom: `1px solid ${T.divider}`,
                    "&:hover": { bgcolor: T.accentHover },
                  }}
                >
                  Mark all as read
                </Button>

                <Box
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    bgcolor: "#fff",
                    "&::-webkit-scrollbar": { width: 3 },
                    "&::-webkit-scrollbar-thumb": {
                      bgcolor: T.accentBorder,
                      borderRadius: 2,
                    },
                  }}
                >
                  {Array.isArray(notifications) && notifications.length > 0 ? (
                    filteredNotifications.length > 0 ? (
                      filteredNotifications
                        .slice(0, 15)
                        .map((notif, idx, arr) => {
                          const isContact =
                            notif.notification_type === "contact" ||
                            notif.notification_type === "ticket";
                          const isRead = notif.read_status === 1;
                          const TYPE_CONFIG = {
                            payslip: {
                              label: "Payroll",
                              accent: "#2e7d32",
                              iconBg: "#e8f5e9",
                            },
                            contact: {
                              label: "Ticket",
                              accent: "#c17f24",
                              iconBg: "#fff8e1",
                            },
                            ticket: {
                              label: "Ticket",
                              accent: "#c17f24",
                              iconBg: "#fff8e1",
                            },
                            holiday: {
                              label: "Holiday",
                              accent: "#1565c0",
                              iconBg: "#e3f2fd",
                            },
                            suspension: {
                              label: "Suspension",
                              accent: "#c62828",
                              iconBg: "#ffebee",
                            },
                            announcement: {
                              label: "Announcement",
                              accent: T.accent,
                              iconBg: T.accentFaint,
                            },
                          };
                          const cfg = TYPE_CONFIG[notif.notification_type] || {
                            label: "Notification",
                            accent: T.accent,
                            iconBg: T.accentFaint,
                          };
                          const ICON_MAP = {
                            payslip: (
                              <Receipt
                                sx={{ fontSize: 14, color: cfg.accent }}
                              />
                            ),
                            contact: (
                              <ContactPage
                                sx={{ fontSize: 14, color: cfg.accent }}
                              />
                            ),
                            ticket: (
                              <ContactPage
                                sx={{ fontSize: 14, color: cfg.accent }}
                              />
                            ),
                            holiday: (
                              <CalendarMonth
                                sx={{ fontSize: 14, color: cfg.accent }}
                              />
                            ),
                            suspension: (
                              <Event sx={{ fontSize: 14, color: cfg.accent }} />
                            ),
                            announcement: (
                              <NotificationsIcon
                                sx={{ fontSize: 14, color: cfg.accent }}
                              />
                            ),
                          };
                          const icon = ICON_MAP[notif.notification_type] || (
                            <NotificationsIcon
                              sx={{ fontSize: 14, color: cfg.accent }}
                            />
                          );
                          const rawDesc = notif.description || "";
                          const cleanDesc = rawDesc
                            .replace(/\. Click to view details\.?$/i, ".")
                            .replace(/\. Click to view response\.?$/i, ".")
                            .replace(
                              /submitted a new ticket:\s*/i,
                              "opened a ticket — ",
                            )
                            .replace(
                              /has responded to your ticket\./i,
                              "responded to your ticket.",
                            )
                            .replace(
                              /replied to your ticket\./i,
                              "replied to your ticket.",
                            )
                            .replace(
                              /has been marked as replied by /i,
                              "was marked as replied by ",
                            )
                            .replace(
                              /has been resolved by /i,
                              "was resolved by ",
                            )
                            .trim();
                          const timeAgo = (() => {
                            if (!notif.created_at) return "";
                            const diff =
                              Date.now() - new Date(notif.created_at).getTime();
                            const m = Math.floor(diff / 60000);
                            if (m < 1) return "just now";
                            if (m < 60) return `${m}m ago`;
                            const h = Math.floor(m / 60);
                            if (h < 24) return `${h}h ago`;
                            const d = Math.floor(h / 24);
                            if (d < 7) return `${d}d ago`;
                            return new Date(
                              notif.created_at,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            });
                          })();
                          const dayLabel = getNotificationDayLabel(
                            notif.created_at,
                          );
                          const prevDayLabel =
                            idx > 0
                              ? getNotificationDayLabel(
                                  arr[idx - 1]?.created_at,
                                )
                              : null;
                          const showDayLabel =
                            idx === 0 || dayLabel !== prevDayLabel;
                          const isImageType =
                            notif.notification_type === "announcement" ||
                            notif.notification_type === "holiday" ||
                            notif.notification_type === "suspension";
                          const isAnnouncementCard =
                            notif.notification_type === "announcement";
                          const carouselItem = isImageType
                            ? getCarouselItemForNotif(notif)
                            : null;
                          const itemImage = carouselItem?.image
                            ? buildImageUrl(carouselItem.image)
                            : null;
                          const itemTitle =
                            carouselItem?.title || notif.title || "";
                          const itemAbout = carouselItem?.about || "";

                          if (isImageType) {
                            return (
                              <React.Fragment key={`notif-wrap-${notif.id}`}>
                                {showDayLabel && (
                                  <Box
                                    sx={{
                                      px: 2,
                                      pt: idx === 0 ? 0.9 : 1.2,
                                      pb: 0.45,
                                      fontSize: "0.58rem",
                                      fontWeight: 700,
                                      letterSpacing: "0.08em",
                                      textTransform: "uppercase",
                                      color: T.faint,
                                      bgcolor: T.accentFaint,
                                      borderBottom: `1px solid ${T.divider}`,
                                    }}
                                  >
                                    {dayLabel}
                                  </Box>
                                )}
                                <Box
                                  onClick={() => handleNotificationClick(notif)}
                                  sx={{
                                    borderBottom: `1px solid ${T.divider}`,
                                    bgcolor: isRead ? "#fff" : T.accentFaint,
                                    cursor: "pointer",
                                    transition: "background 0.12s",
                                    "&:hover": {
                                      bgcolor: isRead
                                        ? "#fdf8f8"
                                        : T.accentHover,
                                    },
                                    borderLeft: isRead
                                      ? "none"
                                      : `3px solid ${T.accent}`,
                                  }}
                                >
                                  {isAnnouncementCard ? (
                                    <Box
                                      sx={{
                                        position: "relative",
                                        height: 90,
                                        overflow: "hidden",
                                        mx: 1.5,
                                        mt: 1.25,
                                        borderRadius: "8px",
                                      }}
                                    >
                                      {itemImage ? (
                                        <Box
                                          component="img"
                                          src={itemImage}
                                          alt={itemTitle}
                                          sx={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block",
                                          }}
                                        />
                                      ) : (
                                        <Box
                                          sx={{
                                            width: "100%",
                                            height: "100%",
                                            background: `linear-gradient(135deg,${T.accent},${T.accentDark})`,
                                          }}
                                        />
                                      )}
                                      <Box
                                        sx={{
                                          position: "absolute",
                                          inset: 0,
                                          background:
                                            "linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 60%)",
                                        }}
                                      />
                                      <Box
                                        sx={{
                                          position: "absolute",
                                          top: 7,
                                          left: 8,
                                          px: 1,
                                          py: 0.15,
                                          borderRadius: "12px",
                                          bgcolor: T.accent,
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: "0.55rem",
                                            fontWeight: 700,
                                            color: "#fff",
                                            letterSpacing: "0.08em",
                                            textTransform: "uppercase",
                                          }}
                                        >
                                          {cfg.label}
                                        </Typography>
                                      </Box>
                                      {!isRead && (
                                        <Box
                                          sx={{
                                            position: "absolute",
                                            top: 7,
                                            right: 8,
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            bgcolor: "#fff",
                                            outline: `2px solid ${T.accent}`,
                                          }}
                                        />
                                      )}
                                      {itemTitle && (
                                        <Typography
                                          sx={{
                                            position: "absolute",
                                            bottom: 7,
                                            left: 10,
                                            right: 10,
                                            fontSize: "0.72rem",
                                            fontWeight: 600,
                                            color: "#fff",
                                            lineHeight: 1.3,
                                          }}
                                        >
                                          {itemTitle}
                                        </Typography>
                                      )}
                                    </Box>
                                  ) : (
                                    <Box
                                      sx={{
                                        mx: 1.5,
                                        mt: 1.1,
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        height: 60,
                                        display: "flex",
                                        alignItems: "center",
                                        px: 1.5,
                                        gap: 1.25,
                                        border: `1px solid ${cfg.accent}30`,
                                        bgcolor: `${cfg.accent}0A`,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: 32,
                                          height: 32,
                                          borderRadius: "6px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          bgcolor: `${cfg.accent}15`,
                                        }}
                                      >
                                        {icon}
                                      </Box>
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                          sx={{
                                            fontSize: "0.55rem",
                                            fontWeight: 700,
                                            letterSpacing: "0.08em",
                                            textTransform: "uppercase",
                                            mb: 0.2,
                                            color: cfg.accent,
                                          }}
                                        >
                                          {cfg.label}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: "0.74rem",
                                            fontWeight: 600,
                                            color: T.text,
                                            lineHeight: 1.3,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                          }}
                                        >
                                          {itemTitle || cleanDesc}
                                        </Typography>
                                      </Box>
                                      {!isRead && (
                                        <Box
                                          sx={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            bgcolor: T.accent,
                                            flexShrink: 0,
                                          }}
                                        />
                                      )}
                                    </Box>
                                  )}
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 1,
                                      px: 1.5,
                                      py: 1,
                                      pb: 1.25,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        flex: 1,
                                        fontSize: "0.73rem",
                                        color: T.muted,
                                        lineHeight: 1.45,
                                      }}
                                    >
                                      {cleanDesc || itemAbout}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: "0.62rem",
                                        color: T.faint,
                                        flexShrink: 0,
                                        mt: 0.1,
                                      }}
                                    >
                                      {timeAgo}
                                    </Typography>
                                  </Box>
                                </Box>
                              </React.Fragment>
                            );
                          }

                          return (
                            <React.Fragment key={`notif-wrap-${notif.id}`}>
                              {showDayLabel && (
                                <Box
                                  sx={{
                                    px: 2,
                                    pt: idx === 0 ? 0.9 : 1.2,
                                    pb: 0.45,
                                    fontSize: "0.58rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    color: T.faint,
                                    bgcolor: T.accentFaint,
                                    borderBottom: `1px solid ${T.divider}`,
                                  }}
                                >
                                  {dayLabel}
                                </Box>
                              )}
                              <Box
                                onClick={() => handleNotificationClick(notif)}
                                sx={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 1.25,
                                  pl: isRead ? 2.25 : 2,
                                  pr: 2.25,
                                  py: 1.5,
                                  borderBottom: `1px solid ${T.divider}`,
                                  borderLeft: isRead
                                    ? "none"
                                    : `3px solid ${T.accent}`,
                                  bgcolor: isRead ? "#fff" : T.accentFaint,
                                  cursor: "pointer",
                                  transition: "background 0.12s",
                                  "&:hover": {
                                    bgcolor: isRead ? "#fdf8f8" : T.accentHover,
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "8px",
                                    bgcolor: cfg.iconBg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    mt: 0.15,
                                  }}
                                >
                                  {icon}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      mb: 0.3,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.75,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: "0.6rem",
                                          fontWeight: 700,
                                          color: cfg.accent,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.07em",
                                        }}
                                      >
                                        {cfg.label}
                                      </Typography>
                                      {isContact && (
                                        <TicketStatusBadge
                                          notifId={notif.id}
                                          contactTicketStatuses={
                                            contactTicketStatuses
                                          }
                                        />
                                      )}
                                    </Box>
                                    <Typography
                                      sx={{
                                        fontSize: "0.62rem",
                                        color: T.faint,
                                        flexShrink: 0,
                                        ml: 1,
                                      }}
                                    >
                                      {timeAgo}
                                    </Typography>
                                  </Box>
                                  <Typography
                                    sx={{
                                      fontSize: "0.8rem",
                                      color: T.text,
                                      fontWeight: isRead ? 400 : 600,
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {cleanDesc}
                                  </Typography>
                                </Box>
                                {!isRead && (
                                  <Box
                                    sx={{
                                      width: 7,
                                      height: 7,
                                      borderRadius: "50%",
                                      bgcolor: T.accent,
                                      flexShrink: 0,
                                      mt: 0.5,
                                    }}
                                  />
                                )}
                              </Box>
                            </React.Fragment>
                          );
                        })
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          py: 7,
                          px: 3,
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            bgcolor: T.accentFaint,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mb: 1.5,
                          }}
                        >
                          <NotificationsIcon
                            sx={{ fontSize: 22, color: T.accentBorder }}
                          />
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            color: T.text,
                            mb: 0.4,
                          }}
                        >
                          No results
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.72rem",
                            color: T.faint,
                            textAlign: "center",
                          }}
                        >
                          No notifications match this filter.
                        </Typography>
                      </Box>
                    )
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        py: 8,
                        px: 3,
                      }}
                    >
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          bgcolor: T.accentFaint,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 1.5,
                        }}
                      >
                        <NotificationsIcon
                          sx={{ fontSize: 26, color: T.accentBorder }}
                        />
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          color: T.text,
                          mb: 0.4,
                        }}
                      >
                        All caught up
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: T.faint,
                          textAlign: "center",
                        }}
                      >
                        No new notifications at this time.
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.5,
                    py: 1,
                    bgcolor: T.accentFaint,
                    borderTop: `1px solid ${T.divider}`,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: T.faint,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Legend:
                  </Typography>
                  {[
                    {
                      label: "Holiday",
                      bg: "rgba(237,108,2,0.2)",
                      border: "#ed6c02",
                    },
                    {
                      label: "Suspension",
                      bg: "rgba(211,47,47,0.15)",
                      border: "#d32f2f",
                    },
                    {
                      label: "On Leave",
                      bg: "rgba(46,125,50,0.15)",
                      border: "#2e7d32",
                    },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "3px",
                          bgcolor: item.bg,
                          border: `1.5px solid ${item.border}`,
                        }}
                      />
                      <Typography sx={{ fontSize: "0.64rem", color: T.muted }}>
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Fade>
          </Modal>

          <LogoutDialog open={logoutOpen} settings={settings} />
        </Box>
      </Box>
    </Fade>
  );
};

export default AdminHome;
