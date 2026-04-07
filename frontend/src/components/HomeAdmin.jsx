import API_BASE_URL from "../apiConfig";
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

// ─── helpers ────────────────────────────────────────────────────────────────

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

// ─── session-storage cache helpers ──────────────────────────────────────────

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

// ─── Ticket status badge ─────────────────────────────────────────────────────

const TICKET_STATUS_STYLE = {
  new:        { bg: "#fef3c7", color: "#92400e", border: "#d97706" },
  read:       { bg: "#dbeafe", color: "#1e3a5f", border: "#2563eb" },
  replied:    { bg: "#dcfce7", color: "#14532d", border: "#16a34a" },
  on_process: { bg: "#ffedd5", color: "#7c2d12", border: "#fb923c" },
  resolved:   { bg: "#f3f4f6", color: "#374151", border: "#6b7280" },
};
const TICKET_STATUS_LABEL = {
  new: "New", read: "Read", replied: "Replied",
  on_process: "On Process", resolved: "Resolved",
};

const TicketStatusBadge = ({ notifId, contactTicketStatuses }) => {
  const ticketStatus = (contactTicketStatuses || {})[notifId] || "new";
  const s = TICKET_STATUS_STYLE[ticketStatus] || TICKET_STATUS_STYLE.new;
  return (
    <Box sx={{ px: 1.25, py: 0.2, bgcolor: s.bg, border: `1px solid ${s.border}`, borderRadius: "20px", display: "inline-flex", alignItems: "center" }}>
      <Typography sx={{ fontSize: "0.6rem", fontWeight: 900, color: s.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {TICKET_STATUS_LABEL[ticketStatus] || ticketStatus}
      </Typography>
    </Box>
  );
};

// ─── Notification Filter Dropdown ────────────────────────────────────────────
const NOTIF_FILTERS = [
  { key: "all",          label: "All" },
  { key: "unread",       label: "Unread" },
  { key: "payslip",      label: "Payslip" },
  { key: "contact",      label: "Tickets" },
  { key: "announcement", label: "Announcements" },
  { key: "holiday",      label: "Holidays" },
  { key: "suspension",   label: "Suspensions" },
];

const NotifFilterChips = ({ activeFilter, onChange, settings, unreadCount }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const activeLabel = NOTIF_FILTERS.find((f) => f.key === activeFilter)?.label || "All";

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<ArrowDropDownIcon sx={{ fontSize: 15, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />}
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
          "&:hover": { bgcolor: "rgba(255,255,255,0.22)", borderColor: "rgba(255,255,255,0.32)" },
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
            border: `1px solid ${settings.primaryColor}26`,
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
              onClick={() => { onChange(key); setAnchorEl(null); }}
              sx={{
                py: 0.9,
                fontSize: "0.74rem",
                color: active ? settings.secondaryColor : settings.textPrimaryColor,
                fontWeight: active ? 600 : 400,
                bgcolor: active ? `${settings.primaryColor}14` : "transparent",
                "&:hover": { bgcolor: `${settings.primaryColor}0D` },
                display: "flex",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <Typography sx={{ fontSize: "0.74rem", fontWeight: "inherit" }}>{label}</Typography>
                {key === "unread" && unreadCount > 0 && (
                  <Typography sx={{ fontSize: "0.66rem", color: settings.secondaryColor, fontWeight: 700 }}>
                    {unreadCount}
                  </Typography>
                )}
              </Box>
              {active && (
                <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: settings.secondaryColor, color: "#fff", fontSize: "0.62rem", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
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

// ─── system settings ─────────────────────────────────────────────────────────

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
      } catch { /* ignore */ }
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

// ─── static config ───────────────────────────────────────────────────────────

const STAT_CARDS = (settings) => [
  { label: "Total Employees", valueKey: "employees", defaultValue: 0, textValue: "Total Employees", icon: <PeopleIcon />, gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, shadow: `0 15px 40px ${settings.primaryColor}33` },
  { label: "Present Today", valueKey: "todayAttendance", defaultValue: 0, textValue: "Today's Attendance", icon: <EventAvailableIcon />, gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`, shadow: `0 15px 40px ${settings.primaryColor}33`, trend: "+12%", trendUp: true },
  { label: "Pending Payroll", valueKey: "pendingPayroll", defaultValue: 0, textValue: "Payroll Processing", icon: <PendingActionsIcon />, gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, shadow: `0 15px 40px ${settings.primaryColor}33`, trend: "-8%", trendUp: false },
  { label: "Processed Payroll", valueKey: "processedPayroll", defaultValue: 0, textValue: "Payroll Processed", icon: <WorkHistoryIcon />, gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, shadow: `0 15px 40px ${settings.primaryColor}33`, trend: "+6%", trendUp: true },
  { label: "Released Payslips", valueKey: "payslipCount", defaultValue: 0, textValue: "Payslip Released", icon: <ReceiptLongIcon />, gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, shadow: `0 15px 40px ${settings.primaryColor}33`, trend: "+2%", trendUp: true },
];

const QUICK_ACTIONS = (settings) => [
  { label: "Users", link: "/users-list", icon: <Group />, tooltip: "Users Management", gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})` },
  { label: "Payroll", link: "/payroll-table", icon: <PaymentsIcon />, tooltip: "Payroll Processing", gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})` },
  { label: "Category", link: "/employee-category", icon: <CategoryIcon />, tooltip: "Employment Category", gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})` },
  { label: "O-DTRs", link: "/daily_time_record_faculty", icon: <AccessTimeIcon />, tooltip: "Overall Daily Time Records", gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})` },
  { label: "Announcements", link: "/announcement", icon: <CampaignIcon />, tooltip: "Announcements/Suspensions/Holidays", gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})` },
  { label: "Audit Logs", link: "/audit-logs", icon: <History />, tooltip: "Audit Logs", gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`, restricted: true },
  { label: "Registration", link: "/registration", icon: <PersonAdd />, tooltip: "Registration", gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})` },
  { label: "Payslip", link: "/distribution-payslip", icon: <PersonAdd />, tooltip: "Payslip Distribution", gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})` },
  { label: "Leaves", link: "/leave-request", icon: <EventAvailableIcon />, tooltip: "Leaves Management", gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})` },
];

// ─── auth hook ───────────────────────────────────────────────────────────────

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
      return { role: decoded.role, employeeNumber: decoded.employeeNumber, username: decoded.username };
    } catch { return {}; }
  }, []);

  useEffect(() => {
    const u = getUserInfo();
    if (u.username) setUsername(u.username);
    if (u.employeeNumber) setEmployeeNumber(u.employeeNumber);
  }, [getUserInfo]);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/personalinfo/person_table`);
        const list = Array.isArray(res.data) ? res.data : [];
        const match = list.find((p) => String(p.agencyEmployeeNum) === String(employeeNumber));
        if (match) {
          if (match.profile_picture) setProfilePicture(match.profile_picture);
          const fullNameFromPerson = `${match.firstName || ""} ${match.middleName || ""} ${match.lastName || ""} ${match.nameExtension || ""}`.trim();
          if (fullNameFromPerson) setFullName(fullNameFromPerson);
        }
      } catch (err) { console.error("Error loading profile picture:", err); }
    };
    if (employeeNumber) fetchProfilePicture();
  }, [employeeNumber]);

  return { username, fullName, employeeNumber, profilePicture };
};

// ─── dashboard data hook ─────────────────────────────────────────────────────

const useDashboardData = (settings) => {
  const { socket, connected } = useSocket();
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const [stats, setStats] = useState({ employees: 0, turnoverRate: 32, happinessRate: 78, teamKPI: 84.45, todayAttendance: 0, pendingPayroll: 0, processedPayroll: 0, payslipCount: 0 });
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
    setAttendanceChartData((prev) => prev.map((item, idx) => ({ ...item, fill: idx === 0 ? settings.primaryColor : idx === 1 ? settings.secondaryColor : settings.hoverColor })));
    setPayrollStatusData((prev) => prev.map((item, idx) => ({ ...item, fill: idx === 0 ? settings.primaryColor : idx === 1 ? settings.secondaryColor : settings.hoverColor })));
  }, [settings.primaryColor, settings.secondaryColor, settings.hoverColor]);

  const fetchAllDataRef = useRef(null);
  fetchAllDataRef.current = () => {
    const s = settingsRef.current;
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    setLoading(true); setLoadingPayroll(true); setLoadingCarousel(true);

    axios.get(`${API_BASE_URL}/api/dashboard/stats`, { headers })
      .then((res) => {
        const dashStats = res.data;
        const totalEmp = dashStats.totalEmployees || 0;
        const presentToday = dashStats.presentToday || 0;
        setStats((prev) => ({ ...prev, employees: totalEmp, todayAttendance: presentToday }));
        setAttendanceChartData([
          { name: "Present", value: presentToday, fill: s.primaryColor },
          { name: "Absent", value: totalEmp - presentToday, fill: s.secondaryColor },
          { name: "Late", value: 0, fill: s.hoverColor },
        ]);
      })
      .catch((err) => console.error("dashboard stats failed:", err?.message))
      .finally(() => setLoading(false));

    axios.get(`${API_BASE_URL}/api/dashboard/payroll-summary`, { headers })
      .then((res) => {
        const p = res.data;
        setStats((prev) => ({ ...prev, pendingPayroll: p.pending || 0, processedPayroll: p.processed || 0 }));
        setPayrollStatusData([
          { status: "Processed", value: p.processed || 0, fill: s.primaryColor },
          { status: "Pending", value: p.pending || 0, fill: s.secondaryColor },
          { status: "Failed", value: 0, fill: s.hoverColor },
        ]);
      })
      .catch((err) => console.error("payroll summary failed:", err?.message))
      .finally(() => setLoadingPayroll(false));

    Promise.allSettled([
      axios.get(`${API_BASE_URL}/api/announcements`, { headers }),
      axios.get(`${API_BASE_URL}/api/suspensions`, { headers }),
      axios.get(`${API_BASE_URL}/holiday`, { headers }),
    ]).then(([annRes, suspRes, holidayRes]) => {
      if (annRes.status === "fulfilled") { const data = Array.isArray(annRes.value.data) ? annRes.value.data : []; setAnnouncements(data); writeCache("announcements", data); }
      else { const cached = readCache("announcements"); if (cached) setAnnouncements(cached); }
      if (suspRes.status === "fulfilled") { const data = Array.isArray(suspRes.value.data) ? suspRes.value.data : []; setSuspensions(data); writeCache("suspensions", data); }
      else { const cached = readCache("suspensions"); if (cached) setSuspensions(cached); }
      if (holidayRes.status === "fulfilled") {
        const raw = Array.isArray(holidayRes.value.data) ? holidayRes.value.data : [];
        setRawHolidays(raw);

        // ── FIX: expand each holiday into one entry per day in its date range ──
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
          const endStr   = toLocalDateStr(item.date_end   || item.date_start || item.date);

          if (!startStr) return [];

          // Single-day or no range — return one entry
          if (!endStr || endStr === startStr) {
            return [{
              date:       startStr,
              date_start: startStr,
              date_end:   endStr || startStr,
              name:       item.description || item.title || "",
              status:     item.status,
            }];
          }

          // Multi-day range — expand into one entry per calendar day
          const entries = [];
          const cur     = new Date(startStr);
          const end     = new Date(endStr);
          while (cur <= end) {
            entries.push({
              date:       cur.toISOString().split("T")[0],
              date_start: startStr,
              date_end:   endStr,
              name:       item.description || item.title || "",
              status:     item.status,
            });
            cur.setDate(cur.getDate() + 1);
          }
          return entries;
        });

        setHolidays(transformed);
        writeCache("holidays_raw", raw);
        writeCache("holidays", transformed);
      } else {
        const cachedRaw = readCache("holidays_raw"); const cachedHolidays = readCache("holidays");
        if (cachedRaw) setRawHolidays(cachedRaw); if (cachedHolidays) setHolidays(cachedHolidays);
      }
    }).finally(() => setLoadingCarousel(false));

    axios.get(`${API_BASE_URL}/PayrollRoute/finalized-payroll`, { headers })
      .then((res) => { const payslipCount = Array.isArray(res.data) ? res.data.length : 0; setStats((prev) => ({ ...prev, payslipCount })); })
      .catch((err) => console.error("payslip count failed:", err?.message));

    axios.get(`${API_BASE_URL}/api/dashboard/attendance-overview?days=5`, { headers })
      .then((res) => { setWeeklyAttendanceData(Array.isArray(res.data) ? res.data.map((item) => ({ day: item.day, present: item.present, absent: 0, late: 0 })) : []); })
      .catch((err) => console.error("weekly attendance failed:", err?.message));

    axios.get(`${API_BASE_URL}/api/dashboard/department-distribution`, { headers })
      .then((res) => { setDepartmentAttendanceData(Array.isArray(res.data) ? res.data.map((item) => ({ department: item.department, present: item.employeeCount, absent: 0, rate: item.employeeCount > 0 ? 100 : 0 })) : []); })
      .catch((err) => console.error("dept distribution failed:", err?.message));

    axios.get(`${API_BASE_URL}/api/dashboard/monthly-attendance`, { headers })
      .then((res) => {
        const monthlyData = res.data;
        if (Array.isArray(monthlyData) && monthlyData.length > 0) {
          const weeklyAverages = []; let weekData = [];
          monthlyData.forEach((day, index) => {
            weekData.push(day.present);
            if ((index + 1) % 7 === 0 || index === monthlyData.length - 1) {
              const avg = weekData.reduce((a, b) => a + b, 0) / weekData.length;
              weeklyAverages.push({ week: `Week ${weeklyAverages.length + 1}`, attendance: avg.toFixed(1), leaves: 0, overtime: 0 });
              weekData = [];
            }
          });
          if (weeklyAverages.length > 0) setMonthlyAttendanceTrend(weeklyAverages);
        }
      })
      .catch((err) => console.error("monthly attendance failed:", err?.message));
  };

  const refreshAllData = useCallback(() => { fetchAllDataRef.current(); }, []);

  useEffect(() => {
    const cachedAnn = readCache("announcements"); const cachedSusp = readCache("suspensions");
    const cachedHolidays = readCache("holidays"); const cachedHolidaysRaw = readCache("holidays_raw");
    if (cachedAnn) setAnnouncements(cachedAnn); if (cachedSusp) setSuspensions(cachedSusp);
    if (cachedHolidays) setHolidays(cachedHolidays); if (cachedHolidaysRaw) setRawHolidays(cachedHolidaysRaw);
    refreshAllData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket || !connected) return;
    socket.on("adminDashboardUpdated", refreshAllData);
    socket.on("attendanceChanged", refreshAllData);
    return () => { socket.off("adminDashboardUpdated", refreshAllData); socket.off("attendanceChanged", refreshAllData); };
  }, [socket, connected, refreshAllData]);

  return { stats, weeklyAttendanceData, departmentAttendanceData, payrollStatusData, monthlyAttendanceTrend, payrollTrendData, attendanceChartData, announcements, suspensions, holidays, rawHolidays, loading, loadingCarousel, loadingPayroll, refreshAllData };
};

// ─── carousel hook ────────────────────────────────────────────────────────────

const useCarousel = (items, autoPlay = true, interval = 5000) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => {
    if (!isPlaying || !itemsRef.current || itemsRef.current.length === 0) return;
    const timer = setInterval(() => { setCurrentSlide((s) => (s + 1) % itemsRef.current.length); }, interval);
    return () => clearInterval(timer);
  }, [isPlaying, interval, items.length]);
  const handlePrevSlide = useCallback(() => { if (!itemsRef.current?.length) return; setCurrentSlide((s) => (s - 1 + itemsRef.current.length) % itemsRef.current.length); }, []);
  const handleNextSlide = useCallback(() => { if (!itemsRef.current?.length) return; setCurrentSlide((s) => (s + 1) % itemsRef.current.length); }, []);
  const handleSlideSelect = useCallback((index) => { if (!itemsRef.current?.length) return; setCurrentSlide(index); }, []);
  const togglePlayPause = useCallback(() => setIsPlaying((prev) => !prev), []);
  return { currentSlide, isPlaying, handlePrevSlide, handleNextSlide, handleSlideSelect, togglePlayPause };
};

// ─── time hook ────────────────────────────────────────────────────────────────

const useTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);
  return currentTime;
};

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

const adminShimmerKeyframes = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
* { font-family: 'Poppins', sans-serif !important; }
@keyframes adminShimmer { 0% { background-position: -800px 0; } 100% { background-position: 800px 0; } }
@keyframes adminPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
`;
const SkeletonBox = ({ width = "100%", height = 16, borderRadius = 8, sx = {}, light = false }) => (
  <Box sx={{ width, height, borderRadius: `${borderRadius}px`, background: light ? "linear-gradient(90deg,rgba(255,255,255,0.22) 25%,rgba(255,255,255,0.42) 50%,rgba(255,255,255,0.22) 75%)" : "linear-gradient(90deg,#ede5e5 25%,#f7f2f2 50%,#ede5e5 75%)", backgroundSize: "800px 100%", animation: "adminShimmer 1.5s infinite linear", flexShrink: 0, ...sx }} />
);

// ─── AdminWireframeLoading ────────────────────────────────────────────────────

const AdminWireframeLoading = ({ settings }) => (
  <>
    <style>{adminShimmerKeyframes}</style>
    <Box sx={{ pt: 4, px: 4, mx: "auto", maxWidth: "1600px" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, background: settings.accentColor, borderRadius: 4, p: 2, border: `1px solid ${settings.primaryColor}26`, mt: -4, animation: "adminPulse 2s ease-in-out infinite" }}>
        <Box><SkeletonBox width={240} height={26} borderRadius={6} sx={{ mb: 1 }} /><SkeletonBox width={200} height={14} borderRadius={4} /></Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}><SkeletonBox width={36} height={36} borderRadius={18} /><SkeletonBox width={36} height={36} borderRadius={18} /><SkeletonBox width={36} height={36} borderRadius={18} /></Box>
      </Box>
      <Box sx={{ display: "flex", gap: 1, pb: 1.5, animation: "adminPulse 2s ease-in-out 0.05s infinite" }}>
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ flex: "1 1 0" }}>
            <Box sx={{ height: { xs: 55, sm: 70, md: 100 }, background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, p: { xs: 1, sm: 1.5, md: 2 }, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <SkeletonBox width={30} height={24} borderRadius={4} />
              <Box><SkeletonBox width={60} height={28} borderRadius={4} sx={{ mb: 0.5 }} /><SkeletonBox width="70%" height={10} borderRadius={3} sx={{ mb: 0.25 }} /><SkeletonBox width="50%" height={9} borderRadius={3} /></Box>
            </Box>
          </Box>
        ))}
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Box sx={{ height: "calc(100vh - 362px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, overflow: "hidden", position: "relative" }}>
            <SkeletonBox width="100%" height="100%" borderRadius={0} sx={{ position: "absolute", inset: 0 }} />
            <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `linear-gradient(to top, ${settings.secondaryColor}55 0%, transparent 100%)`, p: 4 }}>
              <SkeletonBox light width={110} height={22} borderRadius={11} sx={{ mb: 2 }} />
              <SkeletonBox light width="65%" height={36} borderRadius={6} sx={{ mb: 1.5 }} />
              <SkeletonBox light width="42%" height={36} borderRadius={6} sx={{ mb: 2 }} />
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, height: "calc(100vh - 355px)" }}>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, p: 1.5, height: { xs: 185, sm: 200, md: 215 }, flexShrink: 0, animation: "adminPulse 2s ease-in-out 0.1s infinite" }}>
                <SkeletonBox width="70%" height={13} borderRadius={4} sx={{ mb: 1 }} />
              </Box>
              <Box sx={{ flex: 1, background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, p: 2, overflow: "hidden", animation: "adminPulse 2s ease-in-out 0.2s infinite" }}>
                <SkeletonBox width={60} height={14} borderRadius={4} sx={{ mb: 2 }} />
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </>
);

// ─── CompactStatCard ──────────────────────────────────────────────────────────

const CompactStatCard = ({ card, index, stats, loading, hoveredCard, setHoveredCard, settings }) => (
  <Grow in timeout={300 + index * 50}>
    <Card onMouseEnter={() => setHoveredCard(index)} onMouseLeave={() => setHoveredCard(null)}
      sx={{ height: { xs: 55, sm: 70, md: 100 }, background: settings.accentColor, border: `1px solid ${hoveredCard === index ? settings.primaryColor : settings.primaryColor}26`, borderRadius: 4, transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transform: hoveredCard === index ? "translateY(-4px) scale(1.02)" : "translateY(0)", boxShadow: hoveredCard === index ? card.shadow : "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer", position: "relative", overflow: "hidden" }}>
      <CardContent sx={{ p: { xs: 1, sm: 1.5, md: 2 }, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", "&:last-child": { pb: { xs: 1, sm: 1.5, md: 2 } } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ width: { xs: 28, md: 40 }, height: { xs: 24, md: 30 }, borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", background: `${settings.primaryColor}1A`, color: settings.textPrimaryColor, transition: "all 0.3s", transform: hoveredCard === index ? "rotate(360deg) scale(1.1)" : "rotate(0) scale(1)" }}>
            {React.cloneElement(card.icon, { sx: { fontSize: { xs: 16, md: 24 } } })}
          </Box>
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: settings.textPrimaryColor, lineHeight: 1, fontSize: { xs: "1.1rem", sm: "1.4rem", md: "2.125rem" } }}>
            {loading ? <Skeleton variant="text" width={60} height={32} /> : stats[card.valueKey] !== undefined ? stats[card.valueKey] : card.defaultValue}
          </Typography>
          <Typography sx={{ color: settings.textPrimaryColor, fontSize: { xs: "0.6rem", md: "0.75rem" }, fontWeight: 500, display: { xs: "none", sm: "block" } }}>{card.textValue}</Typography>
          <Typography sx={{ color: settings.textSecondaryColor, fontSize: { xs: "0.55rem", md: "0.7rem" }, fontWeight: 500 }}>{card.label}</Typography>
        </Box>
      </CardContent>
    </Card>
  </Grow>
);

// ─── CompactCalendar ──────────────────────────────────────────────────────────

const CompactCalendar = ({ calendarDate, setCalendarDate, holidays, announcements, settings, setSelectedDate }) => {
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

  const getAnnouncementsForDate = useCallback((dateStr) => Array.isArray(announcements) ? announcements.filter((a) => normalizeDate(a.date) === dateStr) : [], [announcements]);

  return (
    <Card sx={{ background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, flexShrink: 0, minHeight: 180, maxHeight: 220 }}>
      <CardContent sx={{ p: 1.5, height: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <IconButton size="small" onClick={() => setCalendarDate(new Date(year, month - 1, 1))} sx={{ color: settings.textPrimaryColor, p: 0.5 }}><ArrowBackIosNewIcon fontSize="small" /></IconButton>
          <Typography sx={{ fontWeight: 600, fontSize: "0.8rem", color: settings.textPrimaryColor }}>{new Date(year, month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</Typography>
          <IconButton size="small" onClick={() => setCalendarDate(new Date(year, month + 1, 1))} sx={{ color: settings.textPrimaryColor, p: 0.5 }}><ArrowForwardIosIcon fontSize="small" /></IconButton>
        </Box>
        <Grid container spacing={0.3} sx={{ mb: 0.5 }}>
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
            <Grid item xs={12 / 7} key={day}>
              <Typography sx={{ textAlign: "center", fontWeight: 600, fontSize: "0.55rem", color: settings.textPrimaryColor }}>{day}</Typography>
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={0.3} sx={{ flex: 0.935 }}>
          {calendarDays.map((day, index) => {
            const currentDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            // ── holidays array now has one entry per day, so a simple .find still works ──
            const holidayData = Array.isArray(holidays) ? holidays.find((h) => h.date === currentDate && h.status === "Active") : null;
            const dayAnnouncements = getAnnouncementsForDate(currentDate);
            const hasAnnouncements = dayAnnouncements.length > 0;
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            return (
              <Grid item xs={12 / 7} key={index}>
                <Tooltip title={isToday ? `Today${holidayData ? ` Holiday: ${holidayData.name}` : hasAnnouncements ? ` Announcement: ${dayAnnouncements[0].title}` : ""}` : holidayData ? `Holiday: ${holidayData.name}` : hasAnnouncements ? `Announcement: ${dayAnnouncements[0].title}` : ""} arrow>
                  <Box onClick={() => { if (day) setSelectedDate(currentDate); }}
                    sx={{ textAlign: "center", fontSize: "0.65rem", borderRadius: 0.5, color: holidayData ? "#ffffff" : day ? settings.textPrimaryColor : "transparent", background: holidayData ? `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})` : isToday ? "#c4c4c4ff" : hasAnnouncements ? `${settings.primaryColor}15` : "transparent", fontWeight: holidayData || isToday || hasAnnouncements ? 600 : 400, border: isToday ? `2px solid ${settings.accentColor}` : hasAnnouncements ? `1px solid ${settings.primaryColor}40` : "none", cursor: day ? "pointer" : "default", position: "relative", transition: "all 0.2s", "&:hover": day ? { background: holidayData ? `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})` : isToday ? "#e0e0e0" : hasAnnouncements ? `${settings.primaryColor}25` : "#e0e0e0", transform: "scale(1.1)" } : {} }}>
                    {day || ""}
                  </Box>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
};

// ─── QuickActions ─────────────────────────────────────────────────────────────

const QuickActions = ({ settings, userRole }) => {
  const isSuperAdmin = userRole === "superadmin" || userRole === "technical";
  const filteredActions = QUICK_ACTIONS(settings).filter((action) => !action.restricted || isSuperAdmin);
  return (
    <Card sx={{ background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, flexShrink: 0, minHeight: 180, maxHeight: 220, overflow: "hidden" }}>
      <CardContent sx={{ p: 1.5, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: settings.textPrimaryColor, fontSize: "0.85rem", flexShrink: 0 }}>Admin Panel</Typography>
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          <Grid container spacing={0.75}>
            {filteredActions.map((item, i) => (
              <Grid item xs={4} key={i}>
                <Grow in timeout={400 + i * 50}>
                  <Tooltip title={item.tooltip || item.label} arrow>
                    <Link to={item.link} style={{ textDecoration: "none" }}>
                      <Box sx={{ p: { xs: 0.5, md: 0.5 }, borderRadius: 1.5, background: `${settings.primaryColor}0A`, border: `1px solid ${settings.primaryColor}26`, display: "flex", flexDirection: "column", alignItems: "center", transition: "all 0.3s", cursor: "pointer", "&:hover": { background: `${settings.primaryColor}1A`, transform: "translateY(-2px)", boxShadow: `0 4px 12px ${settings.primaryColor}33` } }}>
                        <Box sx={{ color: settings.textPrimaryColor }}>{React.cloneElement(item.icon, { sx: { fontSize: { xs: 16, md: 20 } } })}</Box>
                        <Typography sx={{ fontSize: { xs: "0.5rem", md: "0.6rem" }, fontWeight: 600, color: settings.textPrimaryColor, textAlign: "center", lineHeight: 1.2 }}>{item.label}</Typography>
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

const ModalCard = ({ open, onClose, title, icon, primaryColor, secondaryColor, children, actions }) => {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      BackdropProps={{
        sx: {
          background: "rgba(0,0,0,0.52)",
          backdropFilter: "blur(4px)",
        },
      }}
    >
      <Box sx={{ position: "fixed", inset: 0, zIndex: 1400, display: "flex", alignItems: "center", justifyContent: "center", px: 1.5 }}>
        <Grow in={open} timeout={220}>
          <Box sx={{ width: { xs: "92%", sm: 420 }, bgcolor: "#fff", borderRadius: "14px", boxShadow: "0 28px 64px rgba(0,0,0,0.24)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <Box sx={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor || primaryColor} 100%)`, px: 2.5, py: 1.6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {icon && <Box sx={{ color: "#fff", display: "flex" }}>{icon}</Box>}
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", letterSpacing: "0.01em" }}>{title}</Typography>
              </Box>
              <IconButton size="small" onClick={onClose} sx={{ color: "rgba(255,255,255,0.85)", p: 0.5, "&:hover": { bgcolor: "rgba(255,255,255,0.18)" } }}>
                <Close sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>
            <Box sx={{ px: 2.5, pt: 2.25, pb: 0.5 }}>{children}</Box>
            {actions && <Box sx={{ px: 2.5, py: 1.75, display: "flex", justifyContent: "flex-end", gap: 1 }}>{actions}</Box>}
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
  const [newEvent, setNewEvent] = useState({ date: new Date().toISOString().split("T")[0], title: "", description: "" });

  useEffect(() => {
    axios.get(`${API_BASE_URL}/tasks`).then((res) => { if (Array.isArray(res.data)) setTasks(res.data); }).catch(() => setTasks([]));
  }, []);

  useEffect(() => {
    if (!employeeNumber) return;
    axios.get(`${API_BASE_URL}/api/events/${employeeNumber}`).then((res) => setEvents(Array.isArray(res.data) ? res.data : [])).catch(() => setEvents([]));
  }, [employeeNumber]);

  const handleToggleTask = async (id) => {
    try { await axios.put(`${API_BASE_URL}/tasks/${id}/toggle`); setTasks(tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task)); } catch (err) { console.error("Error toggling task:", err); }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/tasks`, newTask);
      setTasks([res.data, ...tasks]); setNewTask({ title: "", priority: "medium" }); setAddTaskOpen(false);
      setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) { console.error("Error adding task:", err); }
  };

  const handleDeleteTask = async (id) => {
    try { await axios.delete(`${API_BASE_URL}/tasks/${id}`); setTasks(tasks.filter((task) => task.id !== id)); } catch (err) { console.error("Error deleting task:", err); }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/events`, { employee_number: employeeNumber, date: newEvent.date, title: newEvent.title, description: newEvent.description || "" });
      setEvents([res.data, ...events]); setNewEvent({ date: new Date().toISOString().split("T")[0], title: "", description: "" }); setAddEventOpen(false);
      setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) { console.error("Error adding event:", err); }
  };

  const handleDeleteEvent = async (id) => {
    try { await axios.delete(`${API_BASE_URL}/api/events/${id}`); setEvents(events.filter((e) => e.id !== id)); } catch (err) { console.error("Error deleting event:", err); }
  };

  const getPriorityLabel = (priority) => priority === "high" ? "Urgent" : priority === "medium" ? "Soon" : "Later";
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const getEventStatus = (dateStr) => {
    if (!dateStr) return "past";
    const eventDate = new Date(dateStr); const today = new Date(); today.setHours(0, 0, 0, 0); eventDate.setHours(0, 0, 0, 0);
    if (eventDate.getTime() === today.getTime()) return "today";
    return eventDate > today ? "upcoming" : "past";
  };
  const getStatusLabel = (status) => status === "upcoming" ? "Upcoming" : status === "today" ? "Today" : "Past";

  return (
    <>
      <Card sx={{ flex: 1, display: "flex", flexDirection: "column", background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, minHeight: 0, overflow: "hidden" }}>
        <SuccessfulOverlay open={showSuccess} action="create" onClose={() => setShowSuccess(false)} />
        <Box sx={{ display: "flex", alignItems: "center", px: 1.5, pt: 1.25, pb: 1, gap: 1, flexShrink: 0 }}>
          {["Tasks", "Events"].map((label, i) => {
            const isActive = activeTab === i;
            return (
              <Box
                key={label}
                onClick={() => setActiveTab(i)}
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.75,
                  py: 0.75,
                  px: 1,
                  borderRadius: "8px",
                  border: "1.5px solid",
                  borderColor: isActive ? settings.primaryColor : `${settings.primaryColor}30`,
                  color: isActive ? settings.primaryColor : settings.textPrimaryColor,
                  bgcolor: isActive ? `${settings.primaryColor}08` : "transparent",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.18s ease, transform 0.1s ease",
                  "&:hover": {
                    borderColor: `${settings.primaryColor}70`,
                    color: settings.primaryColor,
                    bgcolor: `${settings.primaryColor}10`,
                  },
                  "&:active": {
                    transform: "scale(0.97)",
                    bgcolor: `${settings.primaryColor}18`,
                    borderColor: settings.primaryColor,
                  },
                }}
              >
                {i === 0
                  ? <AssignmentTurnedInIcon sx={{ fontSize: 14 }} />
                  : <Event sx={{ fontSize: 14 }} />
                }

                <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, lineHeight: 1 }}>
                  {label}
                </Typography>

                <Box sx={{
                  fontSize: "0.6rem",
                  fontWeight: 600,
                  px: 0.75,
                  py: 0.1,
                  borderRadius: "99px",
                  bgcolor: isActive ? `${settings.primaryColor}20` : `${settings.primaryColor}10`,
                  color: isActive ? settings.primaryColor : settings.textPrimaryColor,
                  lineHeight: 1.7,
                  transition: "all 0.18s",
                }}>
                  {i === 0 ? tasks.length : events.length}
                </Box>
              </Box>
            );
          })}

          <IconButton
            size="small"
            onClick={() => activeTab === 0 ? setAddTaskOpen(true) : setAddEventOpen(true)}
            sx={{
              width: 28,
              height: 28,
              bgcolor: "transparent",
              border: `0.5px solid ${settings.primaryColor}40`,
              color: settings.textPrimaryColor,
              borderRadius: "50%",
              flexShrink: 0,
              transition: "all 0.15s ease, transform 0.1s ease",
              "&:hover": {
                bgcolor: `${settings.primaryColor}15`,
                borderColor: `${settings.primaryColor}80`,
                color: settings.primaryColor,
              },
              "&:active": {
                transform: "scale(0.88)",
              },
            }}
          >
            <Add sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Box sx={{ height: "0.5px", bgcolor: `${settings.primaryColor}20`, flexShrink: 0 }} />
        <CardContent sx={{ p: 1.25, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", pr: 0.5, minHeight: 0, "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-track": { background: `${settings.primaryColor}1A`, borderRadius: "2px" }, "&::-webkit-scrollbar-thumb": { background: `${settings.primaryColor}4D`, borderRadius: "2px" } }}>
            {activeTab === 0 && (
              <List dense sx={{ p: 0 }}>
                {Array.isArray(tasks) && tasks.length > 0 ? tasks.map((task) => (
                  <ListItem key={task.id} sx={{ p: 0, mb: 0.75, display: "flex", alignItems: "center" }}>
                    <Checkbox checked={task.completed} onChange={() => handleToggleTask(task.id)} size="small" sx={{ p: 0.5, color: settings.textPrimaryColor, "&.Mui-checked": { color: settings.textPrimaryColor } }} />
                    <ListItemText primary={task.title} primaryTypographyProps={{ sx: { fontSize: "0.78rem", color: settings.textPrimaryColor, textDecoration: task.completed ? "line-through" : "none", lineHeight: 1.3 } }} />
                    <Chip label={getPriorityLabel(task.priority)} size="small" sx={{ fontSize: "0.6rem", height: 18, mr: 0.5, bgcolor: task.priority === "high" ? "#f4433610" : task.priority === "medium" ? "#ff980010" : "#4caf5010", color: task.priority === "high" ? "#f44336" : task.priority === "medium" ? "#ff9800" : "#4caf50" }} />
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTask(task.id)}
                      sx={{
                        color: settings.textPrimaryColor,
                        p: 0.25,
                        borderRadius: "4px",
                        transition: "all 0.15s, transform 0.1s",
                        "&:hover": {
                          bgcolor: "#FCEBEB",
                          color: "#791F1F",
                        },
                        "&:active": {
                          transform: "scale(0.88)",
                        },
                      }}
                    >
                      <Delete sx={{ fontSize: 14 }} />
                    </IconButton>
                  </ListItem>
                )) : <Typography sx={{ fontSize: "0.75rem", color: settings.textPrimaryColor, opacity: 0.5, textAlign: "center", py: 2 }}>No tasks yet</Typography>}
              </List>
            )}
            {activeTab === 1 && (
              <List dense sx={{ p: 0 }}>
                {Array.isArray(events) && events.length > 0 ? events.map((event) => {
                  const status = getEventStatus(event.date);
                  return (
                    <ListItem key={event.id} sx={{ p: 0, mb: 0.75, display: "flex", alignItems: "center" }}>
                      <Event sx={{ fontSize: 16, color: status === "upcoming" ? "#4caf50" : status === "today" ? "#ff9800" : settings.textPrimaryColor, mr: 0.75, flexShrink: 0 }} />
                      <ListItemText primary={event.title} secondary={formatDate(event.date)} primaryTypographyProps={{ sx: { fontSize: "0.78rem", color: settings.textPrimaryColor, lineHeight: 1.3 } }} secondaryTypographyProps={{ sx: { fontSize: "0.65rem", color: settings.textPrimaryColor, opacity: 0.6 } }} />
                      <Chip label={getStatusLabel(status)} size="small" sx={{ fontSize: "0.6rem", height: 18, mr: 0.5, bgcolor: status === "upcoming" ? "#4caf5010" : status === "today" ? "#ff980010" : "#f4433610", color: status === "upcoming" ? "#4caf50" : status === "today" ? "#ff9800" : "#f44336" }} />
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteEvent(event.id)}
                        sx={{
                          color: settings.textPrimaryColor,
                          p: 0.25,
                          borderRadius: "4px",
                          transition: "all 0.15s, transform 0.1s",
                          "&:hover": {
                            bgcolor: "#FCEBEB",
                            color: "#791F1F",
                          },
                          "&:active": {
                            transform: "scale(0.88)",
                          },
                        }}
                      >
                        <Delete sx={{ fontSize: 14 }} />
                      </IconButton>
                    </ListItem>
                  );
                }) : <Typography sx={{ fontSize: "0.75rem", color: settings.textPrimaryColor, opacity: 0.5, textAlign: "center", py: 2 }}>No events yet</Typography>}
              </List>
            )}
          </Box>
        </CardContent>
      </Card>

      <ModalCard open={addTaskOpen} onClose={() => { setAddTaskOpen(false); setNewTask({ title: "", priority: "medium" }); }} title="Add New Task" icon={<Note sx={{ fontSize: 17 }} />} primaryColor={settings.primaryColor} secondaryColor={settings.secondaryColor}
        actions={<>
          <Button onClick={() => { setAddTaskOpen(false); setNewTask({ title: "", priority: "medium" }); }} size="small" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: "#666", border: "1.5px solid #ddd", "&:hover": { bgcolor: "#f5f5f5" }, px: 2 }}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained" size="small" disabled={!newTask.title.trim()} sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", bgcolor: settings.primaryColor, color: "#fff", px: 2.5, "&:hover": { bgcolor: settings.hoverColor } }}>Add Task</Button>
        </>}>
        <TextField autoFocus fullWidth label="Task Title" variant="outlined" size="small" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleAddTask()} sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#555", mb: 1, textTransform: "uppercase", letterSpacing: "0.06em" }}>Priority</Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
          {["low", "medium", "high"].map((p) => {
            const col = p === "high" ? "#f44336" : p === "medium" ? "#ff9800" : "#4caf50";
            const selected = newTask.priority === p;
            return <Button key={p} size="small" onClick={() => setNewTask({ ...newTask, priority: p })} sx={{ flex: 1, textTransform: "capitalize", borderRadius: 2, fontWeight: 600, fontSize: "0.75rem", border: `1.5px solid ${col}`, bgcolor: selected ? col : "transparent", color: selected ? "#fff" : col, "&:hover": { bgcolor: selected ? col : `${col}14` } }}>{p === "high" ? "Urgent" : p === "medium" ? "Soon" : "Later"}</Button>;
          })}
        </Box>
      </ModalCard>

      <ModalCard open={addEventOpen} onClose={() => { setAddEventOpen(false); setNewEvent({ date: new Date().toISOString().split("T")[0], title: "", description: "" }); }} title="Add New Event" icon={<Event sx={{ fontSize: 17 }} />} primaryColor={settings.primaryColor} secondaryColor={settings.secondaryColor}
        actions={<>
          <Button onClick={() => { setAddEventOpen(false); setNewEvent({ date: new Date().toISOString().split("T")[0], title: "", description: "" }); }} size="small" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: "#666", border: "1.5px solid #ddd", "&:hover": { bgcolor: "#f5f5f5" }, px: 2 }}>Cancel</Button>
          <Button onClick={handleAddEvent} variant="contained" size="small" disabled={!newEvent.title.trim() || !newEvent.date} startIcon={<Save sx={{ fontSize: 14 }} />} sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", bgcolor: settings.primaryColor, color: "#fff", px: 2.5, "&:hover": { bgcolor: settings.hoverColor } }}>Save Event</Button>
        </>}>
        <TextField autoFocus fullWidth label="Event Title" variant="outlined" size="small" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
        <TextField fullWidth label="Event Date" type="date" variant="outlined" size="small" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
        <TextField fullWidth label="Description (Optional)" multiline rows={2} variant="outlined" size="small" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} sx={{ mb: 0.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
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

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  useEffect(() => {
    if (!employeeNumber) return;
    const fetchPayroll = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/PayrollReleasedRoute/released-payroll-detailed`, { headers: { Authorization: `Bearer ${token}` } });
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
          axios.get(`${API_BASE_URL}/leaveRoute/leave_table`),
          axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`),
        ]);
        const userAssignments = assignmentsRes.data.filter((a) => a.employeeNumber?.toString() === employeeNumber?.toString());
        const byCode = {};
        userAssignments.forEach((a) => { if (!byCode[a.leave_code]) byCode[a.leave_code] = []; byCode[a.leave_code].push(a); });
        const grouped = Object.entries(byCode).map(([code, entries]) => {
          const leaveType = typesRes.data.find((lt) => lt.leave_code === code);
          const sorted = entries.sort((a, b) => {
            const yearDiff = (b.period_year || 0) - (a.period_year || 0);
            if (yearDiff !== 0) return yearDiff;
            const semVal = (s) => s?.includes("2nd") ? 2 : s?.includes("1st") ? 1 : 0;
            return semVal(b.period_semester) - semVal(a.period_semester);
          });
          const current = sorted[0]; const previous = sorted.slice(1);
          const currRemaining = (parseFloat(current?.remaining_hours) || 0) / 8;
          const currTotal = (parseFloat(current?.total_hours) || 0) / 8;
          const currAllocated = (parseFloat(current?.allocated_hours) || parseFloat(current?.total_hours) || 0) / 8;
          const prevRemaining = previous.reduce((s, e) => s + (parseFloat(e.remaining_hours) || 0) / 8, 0);
          return { code, name: leaveType?.leave_description || code, currRemaining, currTotal, currAllocated, prevRemaining };
        });
        setLeaveCredits(grouped);
      } catch { setLeaveCredits([]); } finally { setLeaveLoading(false); }
    };
    fetchLeaveCredits();
  }, [employeeNumber]);

  const payrollData = useMemo(() => {
    if (!allPayroll.length || !employeeNumber) return null;
    const resolveDate = (p) => { const raw = p.startDate ?? p.start_date ?? p.payroll_date ?? p.period_start ?? p.date ?? null; if (!raw) return null; const d = new Date(raw); return isNaN(d.getTime()) ? null : d; };
    const resolveEmpNum = (p) => String(p.employeeNumber ?? p.employee_number ?? p.agencyEmployeeNum ?? "").trim();
    const matches = allPayroll.filter((p) => { const d = resolveDate(p); if (!d) return false; return resolveEmpNum(p) === String(employeeNumber).trim() && d.getMonth() === payslipMonth && d.getFullYear() === payslipYear; });
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    return matches.reduce((acc, curr) => ({ ...acc, pay1st: acc.pay1st ?? curr.pay1st ?? null, pay2nd: acc.pay2nd ?? curr.pay2nd ?? null }));
  }, [allPayroll, employeeNumber, payslipMonth, payslipYear]);

  const getLeaveStatusColor = (remaining, total) => {
    if (total === 0 || remaining === 0) return "#B71C1C";
    const pct = (remaining / total) * 100;
    if (pct > 50) return "#2E7D32";
    if (pct > 20) return "#EF6C00";
    return "#B71C1C";
  };

  const totalLeave = leaveCredits.reduce((s, g) => s + g.currRemaining + g.prevRemaining, 0);
  const fmt = (val) => { const n = parseFloat(val); return !isNaN(n) && n !== 0 ? `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₱0.00"; };

  return (
    <Card sx={{ flex: 1, display: "flex", flexDirection: "column", background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, boxShadow: `0 15px 40px ${settings.primaryColor}33`, minHeight: 0, overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", px: 1.25, pt: 0.95, pb: 0.85, gap: 0.8, flexShrink: 0 }}>
        {["Payslip", "Leave"].map((label, i) => {
          const isActive = activeTab === i;
          const pillLabel = i === 0
            ? monthNames[payslipMonth]?.slice(0, 3)
            : `${totalLeave.toFixed(1)}d`;

          return (
            <Box
              key={label}
              onClick={() => setActiveTab(i)}
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.6,
                py: 0.62,
                px: 0.8,
                borderRadius: "8px",
                border: "1.5px solid",
                borderColor: isActive ? settings.primaryColor : `${settings.primaryColor}30`,
                color: isActive ? settings.primaryColor : settings.textPrimaryColor,
                bgcolor: isActive ? `${settings.primaryColor}08` : "transparent",
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.18s ease, transform 0.1s ease",
                "&:hover": {
                  borderColor: `${settings.primaryColor}70`,
                  color: settings.primaryColor,
                  bgcolor: `${settings.primaryColor}10`,
                },
                "&:active": {
                  transform: "scale(0.97)",
                  bgcolor: `${settings.primaryColor}18`,
                  borderColor: settings.primaryColor,
                },
              }}
            >
              {i === 0
                ? <Receipt sx={{ fontSize: 13 }} />
                : <CalendarMonth sx={{ fontSize: 13 }} />}

              <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, lineHeight: 1 }}>
                {label}
              </Typography>

              <Box sx={{
                fontSize: "0.56rem",
                fontWeight: 600,
                px: 0.62,
                py: 0.1,
                borderRadius: "99px",
                bgcolor: isActive ? `${settings.primaryColor}20` : `${settings.primaryColor}10`,
                color: isActive ? settings.primaryColor : settings.textPrimaryColor,
                lineHeight: 1.65,
                transition: "all 0.18s",
                minWidth: 26,
                textAlign: "center",
              }}>
                {pillLabel}
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ height: "0.5px", bgcolor: `${settings.primaryColor}20`, flexShrink: 0 }} />

      {activeTab === 0 && (
        <Box onClick={() => navigate("/payslip", { state: { selectedMonth: payslipMonth, selectedYear: payslipYear } })} sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.25, minHeight: 0, gap: 1, cursor: "pointer", transition: "background 0.2s", "&:hover": { background: `${settings.primaryColor}08` } }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Receipt sx={{ color: settings.textPrimaryColor, fontSize: 13 }} />
              <Typography sx={{ fontWeight: 700, color: settings.textPrimaryColor, fontSize: "0.72rem" }}>My Payslip</Typography>
            </Box>
            <FormControl size="small" variant="outlined" sx={{ minWidth: 90, "& .MuiOutlinedInput-root": { fontSize: "0.65rem", borderRadius: 2, height: 24, color: settings.textPrimaryColor, "& fieldset": { borderColor: `${settings.primaryColor}40` }, "&:hover fieldset": { borderColor: settings.primaryColor }, "&.Mui-focused fieldset": { borderColor: settings.primaryColor } }, "& .MuiSelect-icon": { color: settings.textPrimaryColor, fontSize: 16 } }}>
              <Select value={payslipMonth} onChange={(e) => setPayslipMonth(e.target.value)} MenuProps={{ PaperProps: { sx: { borderRadius: 2, mt: 0.5, bgcolor: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 8px 24px ${settings.primaryColor}33`, maxHeight: 220 } } }}>
                {monthNames.map((name, i) => <MenuItem key={i} value={i} sx={{ fontSize: "0.7rem", color: settings.textPrimaryColor, py: 0.5, fontWeight: payslipMonth === i ? 700 : 400, bgcolor: payslipMonth === i ? `${settings.primaryColor}14` : "transparent", "&:hover": { bgcolor: `${settings.primaryColor}1A` } }}>{name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Grid container spacing={0.75} sx={{ flexShrink: 0 }}>
            {[{ label: "1st Quinceña", key: "pay1st", grad: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)` }, { label: "2nd Quinceña", key: "pay2nd", grad: `linear-gradient(135deg, ${settings.secondaryColor} 0%, ${settings.primaryColor} 100%)` }].map(({ label, key, grad }) => (
              <Grid item xs={6} key={key}>
                <Box sx={{ background: grad, borderRadius: 2.5, p: 1.25, display: "flex", flexDirection: "column", gap: 0.25, boxShadow: `0 4px 12px ${settings.primaryColor}33` }}>
                  <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Typography>
                  <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", lineHeight: 1 }}>{payrollData ? fmt(payrollData[key]) : "₱-.--"}</Typography>
                  {payrollData && <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.55rem" }}>{monthNames[payslipMonth]} {payslipYear}</Typography>}
                </Box>
              </Grid>
            ))}
          </Grid>
          {!payrollData && (
            <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", py: 0.5, borderRadius: 1.5, bgcolor: `${settings.primaryColor}08`, border: `1px dashed ${settings.primaryColor}30` }}>
              <Typography sx={{ fontSize: "0.62rem", color: settings.textPrimaryColor, opacity: 0.55 }}>No payslip released for {monthNames[payslipMonth]}</Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, opacity: 0.35, flexShrink: 0 }}>
            <ArrowForward sx={{ fontSize: 11, color: settings.textPrimaryColor }} />
            <Typography sx={{ fontSize: "0.6rem", color: settings.textPrimaryColor, fontWeight: 600 }}>Tap to view full payslip</Typography>
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, p: 1.25, gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <CalendarMonth sx={{ color: settings.textPrimaryColor, fontSize: 13 }} />
              <Typography sx={{ fontWeight: 700, color: settings.textPrimaryColor, fontSize: "0.72rem" }}>Leave Credits</Typography>
            </Box>
            {!leaveLoading && leaveCredits.length > 0 && <Chip label={`${totalLeave.toFixed(1)} Days`} size="small" sx={{ bgcolor: settings.primaryColor, color: "#fff", fontWeight: 700, fontSize: "0.58rem", height: 18 }} />}
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0, pr: 0.25, "&::-webkit-scrollbar": { width: 3 }, "&::-webkit-scrollbar-thumb": { background: `${settings.primaryColor}4D`, borderRadius: 2 } }}>
            {leaveLoading ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 3 }}>
                <CircularProgress size={16} sx={{ color: settings.primaryColor }} />
                <Typography sx={{ color: settings.textPrimaryColor, fontSize: "0.7rem" }}>Loading...</Typography>
              </Box>
            ) : leaveCredits.length === 0 ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <Typography sx={{ color: settings.textPrimaryColor, opacity: 0.45, textAlign: "center", fontSize: "0.68rem" }}>No leave credits assigned</Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {leaveCredits.map((leave, idx) => {
                  const pct = leave.currTotal > 0 ? (leave.currRemaining / leave.currTotal) * 100 : 0;
                  const statusColor = getLeaveStatusColor(leave.currRemaining, leave.currTotal);
                  const usedDays = leave.currAllocated - leave.currRemaining;
                  return (
                    <Box key={idx} sx={{ p: 1, borderRadius: 2, border: `1px solid ${settings.primaryColor}18`, bgcolor: `${settings.primaryColor}05` }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.4 }}>
                        <Typography sx={{ fontWeight: 700, color: settings.textPrimaryColor, fontSize: "0.68rem", lineHeight: 1.2 }}>{leave.name}</Typography>
                        <Chip label={leave.code} size="small" sx={{ height: 15, fontSize: "0.52rem", bgcolor: `${statusColor}18`, color: statusColor, fontWeight: 700 }} />
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", mb: 0.4 }}>
                        <Box>
                          <Typography sx={{ color: statusColor, fontWeight: 800, fontSize: "1rem", lineHeight: 1 }}>{leave.currRemaining.toFixed(1)}</Typography>
                          <Typography sx={{ color: settings.textPrimaryColor, opacity: 0.55, fontSize: "0.57rem" }}>days left</Typography>
                        </Box>
                        <Typography sx={{ color: settings.textPrimaryColor, opacity: 0.45, fontSize: "0.57rem" }}>{usedDays < 0 ? 0 : usedDays.toFixed(1)} used / {leave.currAllocated.toFixed(1)} total</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={Math.min(pct, 100)} sx={{ height: 3, borderRadius: 2, bgcolor: `${statusColor}20`, ".MuiLinearProgress-bar": { bgcolor: statusColor, borderRadius: 2 } }} />
                      {leave.prevRemaining > 0 && (
                        <Box sx={{ mt: 0.5, px: 0.5, py: 0.2, borderRadius: 1, bgcolor: "#FFF3E0", border: "1px dashed #FFB74D", display: "flex", alignItems: "center", gap: 0.4 }}>
                          <Add sx={{ fontSize: 9, color: "#EF6C00" }} />
                          <Typography sx={{ color: "#E65100", fontWeight: 700, fontSize: "0.55rem" }}>+{leave.prevRemaining.toFixed(1)} days carried over</Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Card>
  );
};

// ─── LogoutDialog ─────────────────────────────────────────────────────────────

const LogoutDialog = ({ open, settings }) => (
  <Dialog open={open} fullScreen PaperProps={{ sx: { backgroundColor: "transparent", boxShadow: "none" } }} BackdropProps={{ sx: { backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" } }}>
    <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} sx={{ width: 20, height: 20, borderRadius: "50%", background: i % 2 === 0 ? settings.primaryColor : settings.accentColor, position: "absolute", top: "50%", left: "50%", transformOrigin: "-60px 0px", animation: `orbit${i} ${3 + i}s linear infinite`, boxShadow: `0 0 15px ${settings.primaryColor}, 0 0 8px ${settings.accentColor}` }} />
      ))}
      <Box sx={{ position: "relative", width: 120, height: 120 }}>
        <Box sx={{ width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle at 30% 30%, ${settings.secondaryColor}, ${settings.primaryColor})`, boxShadow: `0 0 40px ${settings.primaryColor}, 0 0 80px ${settings.accentColor}`, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", justifyContent: "center", animation: "floatSphere 2s ease-in-out infinite alternate" }}>
          <Box component="img" src={logo} alt="Logo" sx={{ width: 60, height: 60, borderRadius: "50%", boxShadow: `0 0 20px ${settings.primaryColor}, 0 0 10px ${settings.accentColor}`, animation: "heartbeat 1s infinite" }} />
        </Box>
      </Box>
      <Typography variant="h6" sx={{ mt: 3, fontWeight: "bold", color: settings.accentColor, textShadow: `0 0 10px ${settings.primaryColor}`, animation: "pulse 1.5s infinite" }}>Signing out...</Typography>
      <Box component="style" children={`
        @keyframes heartbeat { 0%,100% { transform: scale(1); } 25%,75% { transform: scale(1.15); } 50% { transform: scale(1.05); } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        @keyframes floatSphere { 0% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-15px); } 100% { transform: translate(-50%, -50%) translateY(0); } }
        @keyframes orbit0 { 0% { transform: rotate(0deg) translateX(60px); } 100% { transform: rotate(360deg) translateX(60px); } }
        @keyframes orbit1 { 0% { transform: rotate(90deg) translateX(60px); } 100% { transform: rotate(450deg) translateX(60px); } }
        @keyframes orbit2 { 0% { transform: rotate(180deg) translateX(60px); } 100% { transform: rotate(540deg) translateX(60px); } }
        @keyframes orbit3 { 0% { transform: rotate(270deg) translateX(60px); } 100% { transform: rotate(630deg) translateX(60px); } }
      `} />
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
  const _pendingTicketId = useRef(null);

  const { stats, weeklyAttendanceData, departmentAttendanceData, payrollStatusData, monthlyAttendanceTrend, payrollTrendData, attendanceChartData, announcements, suspensions, holidays, rawHolidays, loading, loadingCarousel, loadingPayroll, refreshAllData } = useDashboardData(settings);

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
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const e = new Date(date_end); e.setHours(0, 0, 0, 0);
    return today <= e;
  };

  const scheduledHolidaysForCarousel = useMemo(() =>
    (rawHolidays || []).filter((h) => (h.status || "").toLowerCase() === "active" && isNotExpired(h.date_end || h.date)).map((h) => ({ id: `holiday-${h.id}`, title: h.title || h.description || "", about: h.about || "Official holiday.", date: h.date_start || h.date_end || h.date, date_start: h.date_start || h.date, date_end: h.date_end || h.date, image: h.image || null })),
    [rawHolidays]
  );

  const suspensionsForCarousel = useMemo(() =>
    (suspensions || []).filter((s) => !s.date_end || new Date(s.date_end) >= new Date(new Date().setHours(0, 0, 0, 0))).map((s) => ({ id: `suspension-${s.id}`, title: s.title || "", about: s.about || "", date: s.date_start || s.date_end || s.date, date_start: s.date_start || s.date, date_end: s.date_end || s.date, image: s.image || null })),
    [suspensions]
  );

  const announcementsInRange = useMemo(() =>
    (announcements || []).filter((a) => !a.date_end || new Date(a.date_end) >= new Date(new Date().setHours(0, 0, 0, 0))),
    [announcements]
  );

  const carouselItems = useMemo(() =>
    [...scheduledHolidaysForCarousel, ...suspensionsForCarousel, ...announcementsInRange].sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date)),
    [scheduledHolidaysForCarousel, suspensionsForCarousel, announcementsInRange]
  );

  const { currentSlide, isPlaying, handlePrevSlide, handleNextSlide, handleSlideSelect, togglePlayPause } = useCarousel(carouselItems);
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcementDetails, setAnnouncementDetails] = useState({});
  const [contactTicketStatuses, setContactTicketStatuses] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // ── Notification filter state ──
  const [notifFilter, setNotifFilter] = useState("all");

  const openMenu = Boolean(anchorEl);

  useEffect(() => { setUserRole(getUserRole()); }, []);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleOpenModal = (announcement) => { setSelectedAnnouncement(announcement); setOpenModal(true); };
  const handleCloseModal = () => { setOpenModal(false); setSelectedAnnouncement(null); };
  const handleLogout = () => { setLogoutOpen(true); setTimeout(() => { localStorage.removeItem("token"); window.location.href = "/"; }, 500); };

  const fetchNotifications = useCallback(async () => {
    if (!employeeNumber) return;
    const empNum = String(employeeNumber).trim();
    if (!empNum) return;
    try {
      const notifRes = await axios.get(`${API_BASE_URL}/api/notifications/${empNum}`);
      const filteredNotifications = Array.isArray(notifRes.data) ? notifRes.data.filter((notif) => String(notif.employeeNumber).trim() === empNum) : [];
      // Preserve locally-read status so re-fetches don't reset what user already opened
      setNotifications((prev) => {
        const localReadIds = new Set(prev.filter((n) => n.read_status === 1).map((n) => n.id));
        return filteredNotifications.map((n) => localReadIds.has(n.id) ? { ...n, read_status: 1 } : n);
      });

      const contactNotifs = filteredNotifications.filter((n) => n.notification_type === "contact" || n.notification_type === "ticket");
      if (contactNotifs.length > 0) {
        try {
          const token = localStorage.getItem("token");
          const ticketsRes = await axios.get(`${API_BASE_URL}/api/contact-us`, { headers: { Authorization: `Bearer ${token}` } });
          const ticketList = ticketsRes.data?.data || ticketsRes.data || [];
          const ticketIdMap = {};
          ticketList.forEach((t) => { ticketIdMap[t.id] = t.status; });
          const notifStatusMap = {};
          contactNotifs.forEach((notif) => {
            const contactMatch = (notif.action_link || "").match(/\/settings\/contact\/(\d+)/);
            const ticketId = contactMatch ? Number(contactMatch[1]) : null;
            if (ticketId && ticketIdMap[ticketId]) {
              notifStatusMap[notif.id] = ticketIdMap[ticketId];
            } else {
              const empNum = String(notif.employeeNumber || "").trim();
              const empTickets = ticketList.filter((t) => String(t.employee_number || "").trim() === empNum);
              if (empTickets.length > 0) {
                const latest = empTickets.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];
                notifStatusMap[notif.id] = latest.status;
              }
            }
          });
          setContactTicketStatuses(notifStatusMap);
        } catch {}
      }

      const announcementNotifs = filteredNotifications.filter((n) => n.notification_type === "announcement" && n.announcement_id);
      if (announcementNotifs.length > 0) {
        try {
          const annRes = await axios.get(`${API_BASE_URL}/api/announcements`);
          const announcementList = Array.isArray(annRes.data) ? annRes.data : [];
          const detailsMap = {};
          announcementNotifs.forEach((notif) => {
            const announcement = announcementList.find((ann) => ann.id === notif.announcement_id || ann.id === parseInt(notif.announcement_id));
            if (announcement) detailsMap[notif.id] = announcement;
          });
          setAnnouncementDetails(detailsMap);
        } catch {}
      }
    } catch { setNotifications([]); }
  }, [employeeNumber]);

  const fetchNotificationsRef = useRef(fetchNotifications);
  useEffect(() => { fetchNotificationsRef.current = fetchNotifications; }, [fetchNotifications]);
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!socket || !connected) return;
    const scheduleRefresh = () => {
      setTimeout(() => { if (typeof fetchNotificationsRef.current === "function") fetchNotificationsRef.current(); }, 250);
    };
    socket.on("notificationCreated", scheduleRefresh);
    return () => socket.off("notificationCreated", scheduleRefresh);
  }, [socket, connected]);

  const handleNotificationClick = async (notification) => {
    if (notification.read_status === 0) {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        await axios.put(`${API_BASE_URL}/api/notifications/${notification.id}/read`, {}, { headers });
        setNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, read_status: 1 } : n));
      } catch (err) { console.error("Error marking notification as read:", err); }
    }

    const type = notification.notification_type;
    const link = notification.action_link || "";

    if (type === "payslip" || link.includes("payslip")) {
      setNotifModalOpen(false); navigate("/payslip");
    } else if (type === "contact" || type === "ticket" || link.includes("settings")) {
      setNotifModalOpen(false);
      const contactMatch = (notification.action_link || "").match(/\/settings\/contact\/(\d+)/);
      const ticketIdFromLink = contactMatch ? Number(contactMatch[1]) : null;
      const statusMatch = (notification.action_link || "").match(/[?&]status=([^&]+)/);
      const liveStatus = ticketIdFromLink ? contactTicketStatuses[ticketIdFromLink] : null;
      const ticketStatusFromLink = liveStatus || (statusMatch ? statusMatch[1] : null);
      navigate("/settings", { state: { section: "contact", ticketId: ticketIdFromLink, ticketStatus: ticketStatusFromLink } });
    } else if (type === "announcement" || link.includes("announcement")) {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const annRes = await axios.get(`${API_BASE_URL}/api/announcements`, { headers });
        const list = Array.isArray(annRes.data) ? annRes.data : [];
        let match = notification.announcement_id ? list.find((a) => a.id === notification.announcement_id || a.id === parseInt(notification.announcement_id)) : null;
        if (!match && notification.announcement_id) match = announcementDetails[notification.id];
        if (!match && list.length > 0) match = list[0];
        setNotifModalOpen(false);
        if (match) { setSelectedAnnouncement(match); setOpenModal(true); }
      } catch (err) { console.error("Error fetching announcement:", err); setNotifModalOpen(false); }
    } else if (type === "holiday") {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE_URL}/holiday`, { headers });
        const list = Array.isArray(res.data) ? res.data : [];
        setNotifModalOpen(false);
        if (list.length > 0) { const h = list[0]; setSelectedAnnouncement({ id: `holiday-${h.id}`, title: h.title || h.description || "", about: h.about || "Official holiday.", date: h.date_start || h.date_end || h.date, image: h.image || null }); setOpenModal(true); }
      } catch (err) { console.error("Error fetching holiday:", err); setNotifModalOpen(false); }
    } else if (type === "suspension") {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE_URL}/api/suspensions`, { headers });
        const list = Array.isArray(res.data) ? res.data : [];
        setNotifModalOpen(false);
        if (list.length > 0) { const s = list[0]; setSelectedAnnouncement({ id: `suspension-${s.id}`, title: s.title || "", about: s.about || "", date: s.date_start || s.date_end || s.date, image: s.image || null }); setOpenModal(true); }
      } catch (err) { console.error("Error fetching suspension:", err); setNotifModalOpen(false); }
    } else if (link) {
      setNotifModalOpen(false); navigate(link);
    }
  };

  // ── Derived unread count — always in sync with local array ──
  const derivedUnreadCount = notifications.filter((n) => n.read_status === 0).length;

  const getCarouselItemForNotif = useCallback((notif) => {
    const type = notif.notification_type;
    if (type === "announcement") return announcementDetails[notif.id] || null;
    if (type === "holiday") return scheduledHolidaysForCarousel[0] || null;
    if (type === "suspension") return suspensionsForCarousel[0] || null;
    return null;
  }, [announcementDetails, scheduledHolidaysForCarousel, suspensionsForCarousel]);

  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    return notifications.filter((n) => {
      if (notifFilter === "all") return true;
      if (notifFilter === "unread") return n.read_status === 0;
      if (notifFilter === "contact") return n.notification_type === "contact" || n.notification_type === "ticket";
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
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await Promise.allSettled(
        unread.map((n) => axios.put(`${API_BASE_URL}/api/notifications/${n.id}/read`, {}, { headers })),
      );
    } finally {
      setNotifications((prev) => prev.map((n) => (n.read_status === 0 ? { ...n, read_status: 1 } : n)));
    }
  }, [notifications]);

  const handleCloseNotifModal = () => {
    setNotifModalOpen(false);
    setNotifFilter("all");
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; document.documentElement.style.overflow = ""; };
  }, []);

  if (pageLoading) {
    return (
      <Box sx={{ borderRadius: "1px", width: "100vw", maxWidth: "100%", position: "relative", left: "50%", transform: "translateX(-50%)" }}>
        <AdminWireframeLoading settings={settings} />
      </Box>
    );
  }

  return (
    <Fade in timeout={500}>
      <Box sx={{ borderRadius: "1px", width: "100vw", maxWidth: "100%", position: "relative", left: "50%", transform: "translateX(-50%)" }}>
        <Box sx={{ pt: 4, px: 4, mx: "auto", maxWidth: "1600px" }}>

          {/* ── HEADER ── */}
          <Grow in timeout={300}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, background: settings.accentColor, backdropFilter: "blur(15px)", borderRadius: 4, p: 2, border: `1px solid ${settings.secondaryColor}`, boxShadow: `0 15px 40px ${settings.primaryColor}33`, mt: -4 }}>
              <Box>
                <Typography variant="h5" sx={{ color: settings.textPrimaryColor }}>Hello, <b>{fullName || username}</b></Typography>
                <Typography variant="body2" sx={{ color: settings.textPrimaryColor, mt: 0.25, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 14 }} />
                  {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  <span style={{ marginLeft: "8px" }}>{currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Tooltip title="Refresh">
                  <IconButton size="small" sx={{ bgcolor: `${settings.primaryColor}1A`, "&:hover": { bgcolor: `${settings.primaryColor}33` }, color: settings.textPrimaryColor }} onClick={refreshAllData}>
                    <AutorenewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Notifications">
                  <IconButton size="small" sx={{ bgcolor: `${settings.primaryColor}1A`, "&:hover": { bgcolor: `${settings.primaryColor}33` }, color: settings.textPrimaryColor }}
                    onClick={async () => {
                      if (!notifications.length) await fetchNotifications();
                      setNotifModalOpen(true);
                    }}>
                    <Badge badgeContent={derivedUnreadCount} color="error" max={9}><NotificationsIcon fontSize="small" /></Badge>
                  </IconButton>
                </Tooltip>
                <Box sx={{ position: "relative", "&::before": { content: '""', position: "absolute", inset: -2, borderRadius: "50%", padding: "2px", background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" } }}>
                  <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                    <Avatar alt={username} src={profilePicture ? buildImageUrl(profilePicture) : undefined} sx={{ width: 36, height: 36 }} />
                  </IconButton>
                </Box>
                <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}
                  PaperProps={{ sx: { borderRadius: 2, minWidth: 180, backgroundColor: settings.accentColor, border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33`, "& .MuiMenuItem-root": { fontSize: "0.875rem", color: settings.textPrimaryColor, "&:hover": { background: `${settings.primaryColor}0A` } } } }}>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/profile"); }}><AccountCircle sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Profile</MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/settings"); }}><Settings sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Settings</MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/faqs"); }}><HelpOutline sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> FAQs</MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/privacy-policy"); }}><PrivacyTip sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Privacy Policy</MenuItem>
                  <Divider sx={{ borderColor: `${settings.primaryColor}26` }} />
                  <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }}><Logout sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Sign Out</MenuItem>
                </Menu>
              </Box>
            </Box>
          </Grow>

          {/* ── STAT CARDS ── */}
          <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "nowrap", gap: 1, pb: 1.5 }}>
            {STAT_CARDS(settings).map((card, index) => (
              <Box key={card.label} sx={{ flex: "1 1 0", maxWidth: "19%", minWidth: "140px" }}>
                <CompactStatCard card={card} index={index} stats={stats} loading={["pendingPayroll", "processedPayroll", "payslipCount"].includes(card.valueKey) ? loadingPayroll : loading} hoveredCard={hoveredCard} setHoveredCard={setHoveredCard} settings={settings} />
              </Box>
            ))}
          </Box>

          {/* ── MAIN GRID ── */}
          <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>

            {/* LEFT — Carousel */}
            <Grid item xs={12} md={7} sx={{ minHeight: 0, height: { xs: "52vw", md: "calc(100vh - 362px)" }, display: "flex", flexDirection: "column" }}>
              <Fade in timeout={600} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <Card sx={{ height: "100%", background: settings.accentColor, backdropFilter: "blur(15px)", border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, overflow: "hidden", boxShadow: `0 15px 40px ${settings.primaryColor}33`, position: "relative", display: "flex", flexDirection: "column" }}>
                  <Box sx={{ position: "relative", height: "100%", flex: 1 }}>
                    {Array.isArray(carouselItems) && carouselItems.length > 0 ? (
                      <Fade in={true} key={currentSlide} timeout={{ enter: 800, exit: 400 }}>
                        <Box sx={{ position: "relative", height: "100%", width: "100%" }}>
                          <Box component="img" src={carouselItems[currentSlide]?.image ? buildImageUrl(carouselItems[currentSlide].image) : "/api/placeholder/800/400"} alt={carouselItems[currentSlide]?.title || "Announcement"} sx={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.7s ease", transform: "scale(1)" }} />
                          <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 70%)" }} />
                          <IconButton onClick={(e) => { e.stopPropagation(); handlePrevSlide(); }} sx={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "translateY(-50%) scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}><ArrowBackIosNewIcon /></IconButton>
                          <IconButton onClick={(e) => { e.stopPropagation(); handleNextSlide(); }} sx={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "translateY(-50%) scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}><ArrowForwardIosIcon /></IconButton>
                          <IconButton onClick={(e) => { e.stopPropagation(); togglePlayPause(); }} sx={{ position: "absolute", top: 24, right: 24, bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}>{isPlaying ? <Pause /> : <PlayArrow />}</IconButton>
                          <Box onClick={() => handleOpenModal(carouselItems[currentSlide])} sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: 4, color: "#ffffff", cursor: "pointer", transition: "transform 0.3s", "&:hover": { transform: "translateY(-4px)" }, zIndex: 10 }}>
                            <Chip label={carouselItems[currentSlide]?.id?.toString().startsWith("holiday-") ? "HOLIDAY" : carouselItems[currentSlide]?.id?.toString().startsWith("suspension-") ? "SUSPENSION" : "ANNOUNCEMENT"} size="small" sx={{ mb: 2, bgcolor: `${settings.primaryColor}80`, backdropFilter: "blur(10px)", color: "#ffffff", fontWeight: 700, fontSize: "0.7rem", border: "1px solid rgba(254, 249, 225, 0.3)" }} />
                            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, textShadow: "0 4px 12px rgba(0,0,0,0.5)", lineHeight: 1.2 }}>{carouselItems[currentSlide]?.title}</Typography>
                            <Typography sx={{ opacity: 0.95, fontSize: "1rem", textShadow: "0 2px 8px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 1 }}>
                              <AccessTimeIcon sx={{ fontSize: 18 }} />
                              {(() => { const raw = carouselItems[currentSlide]?.date; if (!raw) return ""; const d = new Date(raw); return isNaN(d) ? raw : d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); })()}
                            </Typography>
                          </Box>
                          <Box sx={{ position: "absolute", bottom: 24, right: 24, display: "flex", gap: 1.5, alignItems: "center", zIndex: 10 }}>
                            {carouselItems.map((_, idx) => (
                              <Box key={idx} sx={{ width: currentSlide === idx ? 32 : 10, height: 10, borderRadius: 5, bgcolor: currentSlide === idx ? "#ffffff" : "rgba(254,249,225,0.4)", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", cursor: "pointer", border: "1px solid rgba(254,249,225,0.3)", "&:hover": { bgcolor: "rgba(254,249,225,0.7)", transform: "scale(1.2)" } }} onClick={(e) => { e.stopPropagation(); handleSlideSelect(idx); }} />
                            ))}
                          </Box>
                        </Box>
                      </Fade>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 2 }}>
                        <CampaignIcon sx={{ fontSize: 80, color: `${settings.primaryColor}4D` }} />
                        <Typography variant="h5" sx={{ color: settings.textPrimaryColor }}>No announcements, suspensions, or holidays available</Typography>
                      </Box>
                    )}
                  </Box>
                </Card>
              </Fade>
            </Grid>

            {/* RIGHT */}
            <Grid item xs={12} md={5} sx={{ minHeight: 0, height: { xs: "auto", md: "calc(100vh - 362px)" }, display: "flex", flexDirection: "column", mt: { xs: 2, md: 0 } }}>
              <Box sx={{ display: "flex", flexDirection: "row", gap: 1.5, flex: 1, minHeight: 0, height: "100%" }}>
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
                  <CompactCalendar calendarDate={calendarDate} setCalendarDate={setCalendarDate} holidays={holidays} announcements={announcements} settings={settings} setSelectedDate={setSelectedDate} />
                  <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    <TasksAndEvents settings={settings} employeeNumber={employeeNumber} />
                  </Box>
                </Box>
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
                  <QuickActions settings={settings} userRole={userRole} />
                  <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    <AdminPayslipAndLeave settings={settings} employeeNumber={employeeNumber} />
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* ── ANNOUNCEMENT DETAIL MODAL ── */}
          <Modal open={openModal} onClose={handleCloseModal}>
            <Fade in={openModal}>
              <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "96%", sm: "82%", md: "68%" }, maxWidth: 720, bgcolor: "background.paper", borderRadius: "18px", boxShadow: "0 48px 120px rgba(0,0,0,0.42), 0 8px 32px rgba(0,0,0,0.18)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                {selectedAnnouncement && (() => {
                  const isHoliday = selectedAnnouncement.id?.toString().startsWith("holiday-");
                  const isSuspension = selectedAnnouncement.id?.toString().startsWith("suspension-");
                  const type = isHoliday ? "HOLIDAY" : isSuspension ? "SUSPENSION" : "ANNOUNCEMENT";
                  const accentColor = isHoliday ? "#FB8C00" : isSuspension ? "#B71C1C" : "#1976D2";
                  const badgeBg = `${accentColor}55`;
                  const dotColor = accentColor;
                  const fmtDate = (raw) => { if (!raw) return null; const d = new Date(raw); if (isNaN(d)) return null; return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); };
                  const dateStart = fmtDate(selectedAnnouncement.date_start || selectedAnnouncement.date);
                  const dateEnd = fmtDate(selectedAnnouncement.date_end);
                  const dateRange = dateEnd && dateEnd !== dateStart ? `${dateStart} — ${dateEnd}` : dateStart;
                  const shortStart = selectedAnnouncement.date_start || selectedAnnouncement.date ? new Date(selectedAnnouncement.date_start || selectedAnnouncement.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
                  const shortEnd = selectedAnnouncement.date_end ? new Date(selectedAnnouncement.date_end).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
                  const dateChip = shortEnd && shortEnd !== shortStart ? `${shortStart} – ${shortEnd}` : shortStart;
                  return (
                    <>
                      <Box sx={{ position: "relative", height: { xs: 220, sm: 290, md: 330 }, flexShrink: 0, bgcolor: "#0d0d0d", overflow: "hidden" }}>
                        {selectedAnnouncement.image ? (
                          <Box component="img" src={buildImageUrl(selectedAnnouncement.image)} alt={selectedAnnouncement.title} sx={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.42, display: "block" }} />
                        ) : (
                          <Box sx={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${accentColor}dd 0%, #050505 100%)` }} />
                        )}
                        <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.5) 48%, rgba(0,0,0,0.04) 100%)" }} />
                        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, px: { xs: 2, md: 2.5 }, pt: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.9, bgcolor: badgeBg, border: "0.5px solid rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", borderRadius: "20px", px: 1.4, py: 0.5 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: dotColor, boxShadow: `0 0 6px ${dotColor}`, "@keyframes pulse": { "0%,100%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.4, transform: "scale(0.8)" } }, animation: "pulse 1.6s ease-in-out infinite" }} />
                            <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.92)", textTransform: "uppercase" }}>{type}</Typography>
                          </Box>
                          <IconButton size="small" onClick={handleCloseModal} sx={{ bgcolor: "rgba(0,0,0,0.45)", color: "#fff", backdropFilter: "blur(8px)", border: "0.5px solid rgba(255,255,255,0.18)", width: 30, height: 30, transition: "all 0.2s", "&:hover": { bgcolor: "rgba(0,0,0,0.68)", transform: "rotate(90deg)" } }}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
                        </Box>
                        <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, px: { xs: 2.5, md: 3 }, pb: 2.5 }}>
                          {dateRange && <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}><AccessTimeIcon sx={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }} /><Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.03em" }}>{dateRange}</Typography></Box>}
                          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: { xs: "1.25rem", sm: "1.6rem", md: "1.9rem" }, lineHeight: 1.2, letterSpacing: "-0.01em", textShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>{selectedAnnouncement.title}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ height: "3px", flexShrink: 0, background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}00 100%)` }} />
                      <Box sx={{ px: { xs: 2.5, md: 3 }, py: 1.25, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", borderBottom: `1px solid ${settings.primaryColor}18`, flexShrink: 0 }}>
                        {dateChip && <Chip icon={<Event sx={{ fontSize: "13px !important", color: `${accentColor} !important` }} />} label={dateChip} size="small" sx={{ fontSize: "0.68rem", height: 24, fontWeight: 500, bgcolor: `${accentColor}0F`, border: `1px solid ${accentColor}28`, color: accentColor, "& .MuiChip-icon": { ml: "6px" } }} />}
                      </Box>
                      <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2.5, md: 3 }, py: 2.25, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: `${settings.primaryColor}28`, borderRadius: 2 } }}>
                        <Typography sx={{ fontSize: "0.92rem", color: "text.primary", lineHeight: 1.9, whiteSpace: "pre-line", fontWeight: 400 }}>{selectedAnnouncement.about || "No additional details provided."}</Typography>
                      </Box>
                      <Box sx={{ px: { xs: 2.5, md: 3 }, py: 1.5, borderTop: `1px solid ${settings.primaryColor}18`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, bgcolor: `${settings.primaryColor}04`, gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                          {[["#FB8C00","Holiday"],["#B71C1C","Suspension"],["#1976D2","Announcement"]].map(([color, label]) => (
                            <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                              <Typography sx={{ fontSize: "0.68rem", color: "#6B7280" }}>{label}</Typography>
                            </Box>
                          ))}
                        </Box>
                        <Button onClick={handleCloseModal} size="small" sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.78rem", color: "#fff", bgcolor: accentColor, border: `1.5px solid ${accentColor}`, borderRadius: "8px", px: 2.5, py: 0.65, "&:hover": { bgcolor: "transparent", color: accentColor, transform: "translateY(-1px)" } }}>Dismiss</Button>
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
              <Box sx={{ position: "absolute", top: { xs: "50%", md: "76px" }, right: { xs: "50%", md: "20px" }, transform: { xs: "translate(50%, -50%)", md: "none" }, width: { xs: "92%", sm: "400px" }, maxHeight: "85vh", display: "flex", flexDirection: "column", bgcolor: "#ffffff", border: `1px solid ${settings.primaryColor}30`, boxShadow: `0 16px 48px ${settings.primaryColor}28`, borderRadius: "16px", overflow: "hidden" }}>

                {/* Header — branded maroon background */}
                <Box sx={{ px: 2, py: 1.25, background: `linear-gradient(135deg, ${settings.secondaryColor} 0%, ${settings.primaryColor} 55%, ${settings.secondaryColor} 100%)`, flexShrink: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <NotificationsIcon sx={{ fontSize: 15, color: "#fff" }} />
                    </Box>
                    <Typography sx={{ fontWeight: 500, fontSize: "0.9rem", color: "#fff", flexShrink: 0 }}>
                      Notifications
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    {derivedUnreadCount > 0 && (
                      <Box sx={{ px: 1, py: 0.15, borderRadius: "20px", bgcolor: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "0.62rem", fontWeight: 600, lineHeight: 1.7, flexShrink: 0, whiteSpace: "nowrap" }}>
                        {derivedUnreadCount} unread
                      </Box>
                    )}
                    <NotifFilterChips activeFilter={notifFilter} onChange={setNotifFilter} settings={settings} unreadCount={derivedUnreadCount} />
                    <IconButton size="small" onClick={handleCloseNotifModal} sx={{ color: "rgba(255,255,255,0.8)", width: 26, height: 26, flexShrink: 0, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", "&:hover": { background: "rgba(255,255,255,0.25)", color: "#fff" } }}>
                      <Close sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  onClick={markAllNotificationsAsRead}
                  disabled={derivedUnreadCount === 0}
                  sx={{ justifyContent: "flex-end", textTransform: "none", borderRadius: 0, py: 0.6, px: 2, fontSize: "0.68rem", fontWeight: 600, color: settings.secondaryColor, bgcolor: `${settings.primaryColor}0D`, borderBottom: "1px solid #efe4e4", "&:hover": { bgcolor: `${settings.primaryColor}16` } }}
                >
                  Mark all as read
                </Button>

                {/* Body */}
                <Box sx={{ flex: 1, overflowY: "auto", bgcolor: "#ffffff", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: `${settings.primaryColor}40`, borderRadius: 4 } }}>
                  {Array.isArray(notifications) && notifications.length > 0 ? (
                    filteredNotifications.length > 0 ? (
                      filteredNotifications.slice(0, 15).map((notif, idx, arr) => {
                        const isContact = notif.notification_type === "contact" || notif.notification_type === "ticket";
                        const isRead = notif.read_status === 1;

                        const TYPE_CONFIG = {
                          payslip:      { label: "Payroll",       accent: "#2e7d32", iconBg: "#e8f5e9" },
                          contact:      { label: "Ticket",        accent: "#c17f24", iconBg: "#fff8e1" },
                          ticket:       { label: "Ticket",        accent: "#c17f24", iconBg: "#fff8e1" },
                          holiday:      { label: "Holiday",       accent: "#1565c0", iconBg: "#e3f2fd" },
                          suspension:   { label: "Suspension",    accent: "#c62828", iconBg: "#ffebee" },
                          announcement: { label: "Announcement",  accent: settings.primaryColor, iconBg: `${settings.primaryColor}18` },
                        };
                        const cfg = TYPE_CONFIG[notif.notification_type] || { label: "Notification", accent: settings.primaryColor, iconBg: `${settings.primaryColor}18` };

                        const ICON_MAP = {
                          payslip:      <Receipt sx={{ fontSize: 15, color: cfg.accent }} />,
                          contact:      <ContactPage sx={{ fontSize: 15, color: cfg.accent }} />,
                          ticket:       <ContactPage sx={{ fontSize: 15, color: cfg.accent }} />,
                          holiday:      <CalendarMonth sx={{ fontSize: 15, color: cfg.accent }} />,
                          suspension:   <Event sx={{ fontSize: 15, color: cfg.accent }} />,
                          announcement: <NotificationsIcon sx={{ fontSize: 15, color: cfg.accent }} />,
                        };
                        const icon = ICON_MAP[notif.notification_type] || <NotificationsIcon sx={{ fontSize: 15, color: cfg.accent }} />;

                        const rawDesc = notif.description || "";
                        const cleanDesc = rawDesc
                          .replace(/\. Click to view details\.?$/i, ".")
                          .replace(/\. Click to view response\.?$/i, ".")
                          .replace(/submitted a new ticket:\s*/i, "opened a ticket — ")
                          .replace(/has responded to your ticket\./i, "responded to your ticket.")
                          .replace(/replied to your ticket\./i, "replied to your ticket.")
                          .replace(/has been marked as replied by /i, "was marked as replied by ")
                          .replace(/has been resolved by /i, "was resolved by ")
                          .trim();

                        const timeAgo = (() => {
                          if (!notif.created_at) return "";
                          const diff = Date.now() - new Date(notif.created_at).getTime();
                          const m = Math.floor(diff / 60000);
                          if (m < 1) return "just now";
                          if (m < 60) return `${m}m ago`;
                          const h = Math.floor(m / 60);
                          if (h < 24) return `${h}h ago`;
                          const d = Math.floor(h / 24);
                          if (d < 7) return `${d}d ago`;
                          return new Date(notif.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        })();
                        const dayLabel = getNotificationDayLabel(notif.created_at);
                        const prevDayLabel = idx > 0 ? getNotificationDayLabel(arr[idx - 1]?.created_at) : null;
                        const showDayLabel = idx === 0 || dayLabel !== prevDayLabel;

                        const isImageType = notif.notification_type === "announcement" ||
                          notif.notification_type === "holiday" ||
                          notif.notification_type === "suspension";
                        const isAnnouncementCard = notif.notification_type === "announcement";
                        const carouselItem = isImageType ? getCarouselItemForNotif(notif) : null;
                        const itemImage = carouselItem?.image
                          ? buildImageUrl(carouselItem.image)
                          : null;
                        const itemTitle = carouselItem?.title || notif.title || "";
                        const itemAbout = carouselItem?.about || "";

                        if (isImageType) {
                          return (
                            <React.Fragment key={`notif-wrap-${notif.id}`}>
                              {showDayLabel && (
                                <Box sx={{ px: 2, pt: idx === 0 ? 0.9 : 1.2, pb: 0.45, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8d7f7f", bgcolor: "#faf6f6", borderBottom: "1px solid #f2e9e9" }}>
                                  {dayLabel}
                                </Box>
                              )}
                              <Box
                                onClick={() => handleNotificationClick(notif)}
                                sx={{
                                  borderBottom: "1px solid #f5eeee",
                                  bgcolor: isRead ? "#ffffff" : `${settings.primaryColor}06`,
                                  cursor: "pointer",
                                  transition: "background 0.12s",
                                  "&:hover": { bgcolor: isRead ? "#fdf8f8" : `${settings.primaryColor}0E` },
                                  "&:last-child": { borderBottom: "none" },
                                  borderLeft: isRead ? "none" : `3px solid ${settings.primaryColor}`,
                                }}
                              >
                                {isAnnouncementCard ? (
                                  <Box sx={{ position: "relative", height: 100, overflow: "hidden", mx: 1.5, mt: 1.25, borderRadius: "10px" }}>
                                    {itemImage ? (
                                      <Box component="img" src={itemImage} alt={itemTitle} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                    ) : (
                                      <Box sx={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#3d0c6b,#1a0a3d)" }} />
                                    )}
                                    <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.15) 55%,transparent 100%)" }} />
                                    <Box sx={{ position: "absolute", top: 7, left: 8, px: 1, py: 0.15, borderRadius: "20px", bgcolor: "rgba(123,31,162,0.9)" }}>
                                      <Typography sx={{ fontSize: "0.55rem", fontWeight: 700, color: "#fff", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                        {cfg.label}
                                      </Typography>
                                    </Box>
                                    {!isRead && <Box sx={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: "50%", bgcolor: "#fff", outline: `2px solid ${settings.secondaryColor}` }} />}
                                    {itemTitle && <Typography sx={{ position: "absolute", bottom: 7, left: 10, right: 10, fontSize: "0.72rem", fontWeight: 500, color: "#fff", lineHeight: 1.35 }}>{itemTitle}</Typography>}
                                  </Box>
                                ) : (
                                  <Box sx={{ mx: 1.5, mt: 1.1, borderRadius: "10px", overflow: "hidden", height: 64, display: "flex", alignItems: "center", px: 1.75, gap: 1.5, border: `1px solid ${notif.notification_type === "holiday" ? "rgba(237,108,2,0.3)" : "rgba(211,47,47,0.25)"}`, bgcolor: notif.notification_type === "holiday" ? "rgba(237,108,2,0.12)" : "rgba(211,47,47,0.09)" }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: notif.notification_type === "holiday" ? "rgba(237,108,2,0.18)" : "rgba(211,47,47,0.15)" }}>
                                      {icon}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography sx={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", mb: 0.25, color: notif.notification_type === "holiday" ? "#b45309" : "#b71c1c" }}>
                                        {cfg.label}
                                      </Typography>
                                      <Typography sx={{ fontSize: "0.74rem", fontWeight: 500, color: "#1d1d1d", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {itemTitle || cleanDesc}
                                      </Typography>
                                    </Box>
                                    {!isRead && <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#fff", outline: `2px solid ${settings.secondaryColor}`, flexShrink: 0 }} />}
                                  </Box>
                                )}
                              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, px: 1.5, py: 1, pb: 1.25 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography sx={{ fontSize: "0.75rem", color: "#444", lineHeight: 1.45 }}>
                                    {cleanDesc || itemAbout}
                                  </Typography>
                                </Box>
                                <Typography sx={{ fontSize: "0.62rem", color: "#999", flexShrink: 0, mt: 0.1 }}>{timeAgo}</Typography>
                              </Box>
                              </Box>
                            </React.Fragment>
                          );
                        }

                        return (
                          <React.Fragment key={`notif-wrap-${notif.id}`}>
                            {showDayLabel && (
                              <Box sx={{ px: 2, pt: idx === 0 ? 0.9 : 1.2, pb: 0.45, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8d7f7f", bgcolor: "#faf6f6", borderBottom: "1px solid #f2e9e9" }}>
                                {dayLabel}
                              </Box>
                            )}
                            <Box
                            onClick={() => handleNotificationClick(notif)}
                            sx={{
                              display: "flex", alignItems: "flex-start", gap: 1.25,
                              pl: isRead ? 2.25 : 2, pr: 2.25, py: 1.5,
                              borderBottom: "1px solid #f5eeee",
                              borderLeft: isRead ? "none" : `3px solid ${settings.primaryColor}`,
                              bgcolor: isRead ? "#ffffff" : `${settings.primaryColor}06`,
                              cursor: "pointer",
                              transition: "background 0.12s",
                              "&:hover": { bgcolor: isRead ? "#fdf8f8" : `${settings.primaryColor}0E` },
                              "&:last-child": { borderBottom: "none" },
                            }}
                          >
                            {/* Icon badge */}
                            <Box sx={{ width: 38, height: 38, borderRadius: "10px", bgcolor: cfg.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.15 }}>
                              {icon}
                            </Box>
                            {/* Content */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.35 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                                  <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: cfg.accent, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                    {cfg.label}
                                  </Typography>
                                  {isContact && <TicketStatusBadge notifId={notif.id} contactTicketStatuses={contactTicketStatuses} />}
                                </Box>
                                <Typography sx={{ fontSize: "0.62rem", color: "#999", flexShrink: 0, ml: 1 }}>{timeAgo}</Typography>
                              </Box>
                              <Typography sx={{ fontSize: "0.8rem", color: "#1a1a1a", fontWeight: isRead ? 400 : 600, lineHeight: 1.55 }}>
                                {cleanDesc}
                              </Typography>
                            </Box>
                            {/* Unread dot */}
                            {!isRead && <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: settings.primaryColor, flexShrink: 0, mt: 0.5 }} />}
                            </Box>
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 7, px: 3 }}>
                        <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: `${settings.primaryColor}10`, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}>
                          <NotificationsIcon sx={{ fontSize: 24, color: `${settings.primaryColor}80` }} />
                        </Box>
                        <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: "#1a1a1a", mb: 0.5 }}>No results</Typography>
                        <Typography sx={{ fontSize: "0.73rem", color: "#777", textAlign: "center" }}>No notifications match this filter.</Typography>
                      </Box>
                    )
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, px: 3 }}>
                      <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: `${settings.primaryColor}10`, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}>
                        <NotificationsIcon sx={{ fontSize: 28, color: `${settings.primaryColor}80` }} />
                      </Box>  
                      <Typography sx={{ fontWeight: 600, fontSize: "0.88rem", color: "#1a1a1a", mb: 0.5 }}>All caught up</Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: "#777", textAlign: "center" }}>No new notifications at this time.</Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 1.1, bgcolor: "#faf8f8", borderTop: "1px solid #ece3e3", flexWrap: "wrap" }}>
                  <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#7a6f6f", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Legend:
                  </Typography>
                  {[
                    { label: "Holiday", bg: "rgba(237,108,2,0.25)", border: "#ed6c02" },
                    { label: "Suspension", bg: "rgba(211,47,47,0.2)", border: "#d32f2f" },
                    { label: "On Leave", bg: "rgba(46,125,50,0.2)", border: "#2e7d32" },
                  ].map((item) => (
                    <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: item.bg, border: `1.5px solid ${item.border}` }} />
                      <Typography sx={{ fontSize: "0.64rem", color: "#666" }}>{item.label}</Typography>
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