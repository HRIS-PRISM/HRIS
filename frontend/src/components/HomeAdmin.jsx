import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Tab,
  Tabs,
  TextField,
  DialogTitle,
  DialogContent,
  DialogActions,
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
        .join("")
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
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
    if (imagePath.startsWith("/uploads")) return `${getStaticBaseUrl()}${imagePath}`;
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
    if (Date.now() - ts > CACHE_TTL_MS) { sessionStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
};

const writeCache = (key, data) => {
  try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch { /* quota */ }
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
      try { setSettings(JSON.parse(storedSettings)); } catch { /* ignore */ }
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
    trend: "+12%",
    trendUp: true,
  },
  {
    label: "Pending Payroll",
    valueKey: "pendingPayroll",
    defaultValue: 0,
    textValue: "Payroll Processing",
    icon: <PendingActionsIcon />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
    shadow: `0 15px 40px ${settings.primaryColor}33`,
    trend: "-8%",
    trendUp: false,
  },
  {
    label: "Processed Payroll",
    valueKey: "processedPayroll",
    defaultValue: 0,
    textValue: "Payroll Processed",
    icon: <WorkHistoryIcon />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
    shadow: `0 15px 40px ${settings.primaryColor}33`,
    trend: "+6%",
    trendUp: true,
  },
  {
    label: "Released Payslips",
    valueKey: "payslipCount",
    defaultValue: 0,
    textValue: "Payslip Released",
    icon: <ReceiptLongIcon />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
    shadow: `0 15px 40px ${settings.primaryColor}33`,
    trend: "+2%",
    trendUp: true,
  },
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
      } catch (err) {
        console.error("Error loading profile picture:", err);
      }
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
        fill: idx === 0 ? settings.primaryColor : idx === 1 ? settings.secondaryColor : settings.hoverColor,
      }))
    );
    setPayrollStatusData((prev) =>
      prev.map((item, idx) => ({
        ...item,
        fill: idx === 0 ? settings.primaryColor : idx === 1 ? settings.secondaryColor : settings.hoverColor,
      }))
    );
  }, [settings.primaryColor, settings.secondaryColor, settings.hoverColor]);

  const fetchAllDataRef = useRef(null);
  fetchAllDataRef.current = () => {
    const s = settingsRef.current;
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    setLoading(true);
    setLoadingPayroll(true);
    setLoadingCarousel(true);

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
        setStats((prev) => ({
          ...prev,
          pendingPayroll: p.pending || 0,
          processedPayroll: p.processed || 0,
        }));
        setPayrollStatusData([
          { status: "Processed", value: p.processed || 0, fill: s.primaryColor },
          { status: "Pending",   value: p.pending   || 0, fill: s.secondaryColor },
          { status: "Failed",    value: 0,                fill: s.hoverColor },
        ]);
      })
      .catch((err) => console.error("payroll summary failed:", err?.message))
      .finally(() => setLoadingPayroll(false));

    Promise.allSettled([
      axios.get(`${API_BASE_URL}/api/announcements`, { headers }),
      axios.get(`${API_BASE_URL}/api/suspensions`, { headers }),
      axios.get(`${API_BASE_URL}/holiday`, { headers }),
    ]).then(([annRes, suspRes, holidayRes]) => {
      if (annRes.status === "fulfilled") {
        const data = Array.isArray(annRes.value.data) ? annRes.value.data : [];
        setAnnouncements(data);
        writeCache("announcements", data);
      } else {
        const cached = readCache("announcements");
        if (cached) setAnnouncements(cached);
      }
      if (suspRes.status === "fulfilled") {
        const data = Array.isArray(suspRes.value.data) ? suspRes.value.data : [];
        setSuspensions(data);
        writeCache("suspensions", data);
      } else {
        const cached = readCache("suspensions");
        if (cached) setSuspensions(cached);
      }
      if (holidayRes.status === "fulfilled") {
        const raw = Array.isArray(holidayRes.value.data) ? holidayRes.value.data : [];
        setRawHolidays(raw);
        const transformed = raw.map((item) => {
          const d = new Date(item.date);
          const normalizedDate = !isNaN(d)
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : item.date;
          return { date: normalizedDate, name: item.description, status: item.status };
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
    }).finally(() => setLoadingCarousel(false));

    axios.get(`${API_BASE_URL}/PayrollRoute/finalized-payroll`, { headers })
      .then((res) => {
        const payslipCount = Array.isArray(res.data) ? res.data.length : 0;
        setStats((prev) => ({ ...prev, payslipCount }));
      })
      .catch((err) => console.error("payslip count failed:", err?.message));

    axios.get(`${API_BASE_URL}/api/dashboard/attendance-overview?days=5`, { headers })
      .then((res) => {
        setWeeklyAttendanceData(
          Array.isArray(res.data)
            ? res.data.map((item) => ({ day: item.day, present: item.present, absent: 0, late: 0 }))
            : []
        );
      })
      .catch((err) => console.error("weekly attendance failed:", err?.message));

    axios.get(`${API_BASE_URL}/api/dashboard/department-distribution`, { headers })
      .then((res) => {
        setDepartmentAttendanceData(
          Array.isArray(res.data)
            ? res.data.map((item) => ({ department: item.department, present: item.employeeCount, absent: 0, rate: item.employeeCount > 0 ? 100 : 0 }))
            : []
        );
      })
      .catch((err) => console.error("dept distribution failed:", err?.message));

    axios.get(`${API_BASE_URL}/api/dashboard/monthly-attendance`, { headers })
      .then((res) => {
        const monthlyData = res.data;
        if (Array.isArray(monthlyData) && monthlyData.length > 0) {
          const weeklyAverages = [];
          let weekData = [];
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

  const refreshAllData = useCallback(() => {
    fetchAllDataRef.current();
  }, []);

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
    socket.on("adminDashboardUpdated", refreshAllData);
    socket.on("attendanceChanged", refreshAllData);
    return () => {
      socket.off("adminDashboardUpdated", refreshAllData);
      socket.off("attendanceChanged", refreshAllData);
    };
  }, [socket, connected, refreshAllData]);

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

  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    if (!isPlaying || !itemsRef.current || itemsRef.current.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % itemsRef.current.length);
    }, interval);
    return () => clearInterval(timer);
  }, [isPlaying, interval, items.length]);

  const handlePrevSlide = useCallback(() => {
    if (!itemsRef.current?.length) return;
    setCurrentSlide((s) => (s - 1 + itemsRef.current.length) % itemsRef.current.length);
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

  return { currentSlide, isPlaying, handlePrevSlide, handleNextSlide, handleSlideSelect, togglePlayPause };
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

// ─── Skeleton / Wireframe shimmer ────────────────────────────────────────────

const adminShimmerKeyframes = `
@keyframes adminShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes adminPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
`;

const SkeletonBox = ({ width = "100%", height = 16, borderRadius = 8, sx = {}, light = false }) => (
  <Box
    sx={{
      width,
      height,
      borderRadius: `${borderRadius}px`,
      background: light
        ? "linear-gradient(90deg,rgba(255,255,255,0.22) 25%,rgba(255,255,255,0.42) 50%,rgba(255,255,255,0.22) 75%)"
        : "linear-gradient(90deg,#ede5e5 25%,#f7f2f2 50%,#ede5e5 75%)",
      backgroundSize: "800px 100%",
      animation: "adminShimmer 1.5s infinite linear",
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── AdminWireframeLoading ────────────────────────────────────────────────────

const AdminWireframeLoading = ({ settings }) => (
  <>
    <style>{adminShimmerKeyframes}</style>
    <Box sx={{ pt: 4, px: 4, mx: "auto", maxWidth: "1600px" }}>

      {/* Header skeleton */}
      <Box sx={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        mb: 3, background: settings.accentColor, borderRadius: 4, p: 2,
        border: `1px solid ${settings.primaryColor}26`, mt: -4,
        animation: "adminPulse 2s ease-in-out infinite",
      }}>
        <Box>
          <SkeletonBox width={240} height={26} borderRadius={6} sx={{ mb: 1 }} />
          <SkeletonBox width={200} height={14} borderRadius={4} />
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <SkeletonBox width={36} height={36} borderRadius={18} />
          <SkeletonBox width={36} height={36} borderRadius={18} />
          <SkeletonBox width={36} height={36} borderRadius={18} />
        </Box>
      </Box>

      {/* Stat cards row skeleton */}
      <Box sx={{ display: "flex", gap: 1, pb: 1.5, animation: "adminPulse 2s ease-in-out 0.05s infinite" }}>
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ flex: "1 1 0" }}>
            <Box sx={{
              height: { xs: 55, sm: 70, md: 100 },
              background: settings.accentColor,
              border: `1px solid ${settings.primaryColor}26`,
              borderRadius: 4, p: { xs: 1, sm: 1.5, md: 2 },
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              <SkeletonBox width={30} height={24} borderRadius={4} />
              <Box>
                <SkeletonBox width={60} height={28} borderRadius={4} sx={{ mb: 0.5 }} />
                <SkeletonBox width="70%" height={10} borderRadius={3} sx={{ mb: 0.25 }} />
                <SkeletonBox width="50%" height={9} borderRadius={3} />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Main grid */}
      <Grid container spacing={2}>

        {/* LEFT — Carousel skeleton */}
        <Grid item xs={12} md={7}>
          <Box sx={{
            height: "calc(100vh - 362px)",
            border: `1px solid ${settings.primaryColor}26`,
            borderRadius: 4, overflow: "hidden", position: "relative",
          }}>
            {/* Image shimmer */}
            <SkeletonBox width="100%" height="100%" borderRadius={0} sx={{ position: "absolute", inset: 0 }} />

            {/* Arrow ghosts */}
            <Box sx={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", border: `1px dashed ${settings.primaryColor}40`, bgcolor: `${settings.primaryColor}12` }} />
            <Box sx={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", border: `1px dashed ${settings.primaryColor}40`, bgcolor: `${settings.primaryColor}12` }} />
            {/* Play ghost */}
            <Box sx={{ position: "absolute", top: 24, right: 24, width: 40, height: 40, borderRadius: "50%", border: `1px dashed ${settings.primaryColor}40`, bgcolor: `${settings.primaryColor}12` }} />

            {/* Bottom text overlay */}
            <Box sx={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: `linear-gradient(to top, ${settings.secondaryColor}55 0%, transparent 100%)`,
              p: 4,
            }}>
              <SkeletonBox light width={110} height={22} borderRadius={11} sx={{ mb: 2 }} />
              <SkeletonBox light width="65%" height={36} borderRadius={6} sx={{ mb: 1.5 }} />
              <SkeletonBox light width="42%" height={36} borderRadius={6} sx={{ mb: 2 }} />
              <SkeletonBox light width={200} height={16} borderRadius={4} />
            </Box>

            {/* Dot indicators */}
            <Box sx={{ position: "absolute", bottom: 24, right: 24, display: "flex", gap: 1.5 }}>
              {[32, 10, 10, 10].map((w, i) => (
                <SkeletonBox key={i} light width={w} height={10} borderRadius={5} />
              ))}
            </Box>
          </Box>
        </Grid>

        {/* RIGHT column */}
        <Grid item xs={12} md={5}>
          <Box sx={{
            display: "flex", flexDirection: { xs: "column", md: "row" },
            gap: 2, height: "calc(100vh - 355px)",
          }}>

            {/* Left sub-column: Calendar + Tasks */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>

              {/* Calendar skeleton */}
              <Box sx={{
                background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4, p: 1.5,
                height: { xs: 185, sm: 200, md: 215 }, flexShrink: 0,
                animation: "adminPulse 2s ease-in-out 0.1s infinite",
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <SkeletonBox width={14} height={14} borderRadius={4} />
                  <SkeletonBox width={90} height={13} borderRadius={4} />
                  <SkeletonBox width={14} height={14} borderRadius={4} />
                </Box>
                {/* Day headers */}
                <Grid container sx={{ mb: 0.5 }}>
                  {[...Array(7)].map((_, i) => (
                    <Grid item xs={12 / 7} key={i}>
                      <Box sx={{ display: "flex", justifyContent: "center", py: 0.3 }}>
                        <SkeletonBox width={20} height={9} borderRadius={3} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                {/* Calendar cells */}
                <Grid container spacing={0.3}>
                  {[...Array(35)].map((_, i) => (
                    <Grid item xs={12 / 7} key={i}>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        {i >= 0 && i < 30 ? (
                          <SkeletonBox
                            width={18} height={16} borderRadius={i === 7 ? 8 : 2}
                            sx={i === 7 ? {
                              background: `${settings.primaryColor}40`,
                              backgroundSize: "initial",
                              animation: "adminPulse 2s ease-in-out infinite",
                            } : {}}
                          />
                        ) : <Box sx={{ width: 18, height: 16 }} />}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Tasks skeleton */}
              <Box sx={{
                flex: 1, background: settings.accentColor,
                border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4, p: 2, overflow: "hidden",
                animation: "adminPulse 2s ease-in-out 0.2s infinite",
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <SkeletonBox width={60} height={14} borderRadius={4} />
                  <SkeletonBox width={28} height={28} borderRadius={14} />
                </Box>
                {[...Array(4)].map((_, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <SkeletonBox width={20} height={20} borderRadius={4} />
                    <SkeletonBox width="55%" height={12} borderRadius={4} sx={{ flex: 1 }} />
                    <SkeletonBox width={40} height={18} borderRadius={9} />
                    <SkeletonBox width={20} height={20} borderRadius={10} />
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Right sub-column: QuickActions + Events */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>

              {/* Quick Actions skeleton */}
              <Box sx={{
                background: settings.accentColor, border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4, p: 1.5,
                height: { xs: 185, sm: 200, md: 215 }, flexShrink: 0,
                animation: "adminPulse 2s ease-in-out 0.15s infinite",
              }}>
                <SkeletonBox width={80} height={13} borderRadius={4} sx={{ mb: 1 }} />
                <Grid container spacing={0.75}>
                  {[...Array(9)].map((_, i) => (
                    <Grid item xs={4} key={i}>
                      <Box sx={{
                        p: 0.5, borderRadius: 1.5,
                        border: `1px dashed ${settings.primaryColor}28`,
                        bgcolor: `${settings.primaryColor}06`,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5,
                      }}>
                        <SkeletonBox width={20} height={20} borderRadius={10} />
                        <SkeletonBox width={28} height={9} borderRadius={3} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Events skeleton */}
              <Box sx={{
                flex: 1, background: settings.accentColor,
                border: `1px solid ${settings.primaryColor}26`,
                borderRadius: 4, p: 2, overflow: "hidden",
                animation: "adminPulse 2s ease-in-out 0.25s infinite",
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <SkeletonBox width={55} height={14} borderRadius={4} />
                  <SkeletonBox width={28} height={28} borderRadius={14} />
                </Box>
                {[["#4caf50", "70%"], ["#ff9800", "55%"], ["#f44336", "80%"]].map(([color, w], i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: `${color}30`, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <SkeletonBox width={w} height={11} borderRadius={3} sx={{ mb: 0.3 }} />
                      <SkeletonBox width="40%" height={9} borderRadius={3} />
                    </Box>
                    <SkeletonBox width={45} height={18} borderRadius={9} />
                    <SkeletonBox width={20} height={20} borderRadius={10} />
                  </Box>
                ))}
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
    <Card
      onMouseEnter={() => setHoveredCard(index)}
      onMouseLeave={() => setHoveredCard(null)}
      sx={{
        height: { xs: 55, sm: 70, md: 100 },
        background: settings.accentColor,
        border: `1px solid ${hoveredCard === index ? settings.primaryColor : settings.primaryColor}26`,
        borderRadius: 4,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hoveredCard === index ? "translateY(-4px) scale(1.02)" : "translateY(0)",
        boxShadow: hoveredCard === index ? card.shadow : "0 2px 8px rgba(0,0,0,0.08)",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1, sm: 1.5, md: 2 },
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          "&:last-child": { pb: { xs: 1, sm: 1.5, md: 2 } },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box
            sx={{
              width: { xs: 28, md: 40 },
              height: { xs: 24, md: 30 },
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${settings.primaryColor}1A`,
              color: settings.textPrimaryColor,
              transition: "all 0.3s",
              transform: hoveredCard === index ? "rotate(360deg) scale(1.1)" : "rotate(0) scale(1)",
            }}
          >
            {React.cloneElement(card.icon, { sx: { fontSize: { xs: 16, md: 24 } } })}
          </Box>
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: settings.textPrimaryColor, lineHeight: 1, fontSize: { xs: "1.1rem", sm: "1.4rem", md: "2.125rem" } }}>
            {loading ? <Skeleton variant="text" width={60} height={32} /> : stats[card.valueKey] !== undefined ? stats[card.valueKey] : card.defaultValue}
          </Typography>
          <Typography sx={{ color: settings.textPrimaryColor, fontSize: { xs: "0.6rem", md: "0.75rem" }, fontWeight: 500, display: { xs: "none", sm: "block" } }}>
            {card.textValue}
          </Typography>
          <Typography sx={{ color: settings.textSecondaryColor, fontSize: { xs: "0.55rem", md: "0.7rem" }, fontWeight: 500 }}>
            {card.label}
          </Typography>
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

  const getAnnouncementsForDate = useCallback(
    (dateStr) => (Array.isArray(announcements) ? announcements.filter((a) => normalizeDate(a.date) === dateStr) : []),
    [announcements]
  );

  return (
    <Card
      sx={{
        background: settings.accentColor,
        backdropFilter: "blur(15px)",
        border: `1px solid ${settings.primaryColor}26`,
        borderRadius: 4,
        boxShadow: `0 15px 40px ${settings.primaryColor}33`,
        height: { xs: 185, sm: 200, md: 215 },
        flexShrink: 0,
      }}
    >
      <CardContent sx={{ p: 1.5, height: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <IconButton size="small" onClick={() => setCalendarDate(new Date(year, month - 1, 1))} sx={{ color: settings.textPrimaryColor, p: 0.5 }}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ fontWeight: 600, fontSize: "0.8rem", color: settings.textPrimaryColor }}>
            {new Date(year, month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </Typography>
          <IconButton size="small" onClick={() => setCalendarDate(new Date(year, month + 1, 1))} sx={{ color: settings.textPrimaryColor, p: 0.5 }}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
        <Grid container spacing={0.3} sx={{ mb: 0.5 }}>
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
            <Grid item xs={12 / 7} key={day}>
              <Typography sx={{ textAlign: "center", fontWeight: 600, fontSize: "0.55rem", color: settings.textPrimaryColor }}>
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={0.3} sx={{ flex: 0.935 }}>
          {calendarDays.map((day, index) => {
            const currentDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const holidayData = Array.isArray(holidays) ? holidays.find((h) => h.date === currentDate && h.status === "Active") : null;
            const dayAnnouncements = getAnnouncementsForDate(currentDate);
            const hasAnnouncements = dayAnnouncements.length > 0;
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            return (
              <Grid item xs={12 / 7} key={index}>
                <Tooltip
                  title={
                    isToday
                      ? `Today` + (holidayData ? ` Holiday: ${holidayData.name}` : hasAnnouncements ? ` Announcement: ${dayAnnouncements[0].title}` : "")
                      : holidayData
                      ? `Holiday: ${holidayData.name}`
                      : hasAnnouncements
                      ? `Announcement: ${dayAnnouncements[0].title}`
                      : ""
                  }
                  arrow
                >
                  <Box
                    onClick={() => { if (day) setSelectedDate(currentDate); }}
                    sx={{
                      textAlign: "center",
                      fontSize: "0.65rem",
                      borderRadius: 0.5,
                      color: holidayData ? "#ffffff" : day ? settings.textPrimaryColor : "transparent",
                      background: holidayData
                        ? `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`
                        : isToday
                        ? "#c4c4c4ff"
                        : hasAnnouncements
                        ? `${settings.primaryColor}15`
                        : "transparent",
                      fontWeight: holidayData || isToday || hasAnnouncements ? 600 : 400,
                      border: isToday
                        ? `2px solid ${settings.accentColor}`
                        : hasAnnouncements
                        ? `1px solid ${settings.primaryColor}40`
                        : "none",
                      cursor: day ? "pointer" : "default",
                      position: "relative",
                      transition: "all 0.2s",
                      "&:hover": day
                        ? {
                            background: holidayData
                              ? `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`
                              : isToday
                              ? "#e0e0e0"
                              : hasAnnouncements
                              ? `${settings.primaryColor}25`
                              : "#e0e0e0",
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
      </CardContent>
    </Card>
  );
};

// ─── QuickActions ─────────────────────────────────────────────────────────────

const QuickActions = ({ settings, userRole }) => {
  const isSuperAdmin = userRole === "superadmin" || userRole === "technical";
  const filteredActions = QUICK_ACTIONS(settings).filter((action) => !action.restricted || isSuperAdmin);

  return (
    <Card
      sx={{
        background: settings.accentColor,
        backdropFilter: "blur(15px)",
        border: `1px solid ${settings.primaryColor}26`,
        borderRadius: 4,
        boxShadow: `0 15px 40px ${settings.primaryColor}33`,
        height: { xs: 185, sm: 200, md: 215 },
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <CardContent sx={{ p: 1.5, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: settings.textPrimaryColor, fontSize: "0.85rem", flexShrink: 0 }}>
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
                          {React.cloneElement(item.icon, { sx: { fontSize: { xs: 16, md: 20 } } })}
                        </Box>
                        <Typography sx={{ fontSize: { xs: "0.5rem", md: "0.6rem" }, fontWeight: 600, color: settings.textPrimaryColor, textAlign: "center", lineHeight: 1.2 }}>
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

// ─── TaskList ─────────────────────────────────────────────────────────────────

const TaskList = ({ settings }) => {
  const [tasks, setTasks] = useState([]);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "medium" });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/tasks`)
      .then((res) => { if (Array.isArray(res.data)) setTasks(res.data); })
      .catch((err) => { console.error("Error fetching tasks:", err); setTasks([]); });
  }, []);

  const handleToggle = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/tasks/${id}/toggle`);
      setTasks(tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
    } catch (err) { console.error("Error toggling task:", err); }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/tasks`, newTask);
      setTasks([res.data, ...tasks]);
      setNewTask({ title: "", priority: "medium" });
      setAddTaskOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) { console.error("Error adding task:", err); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${id}`);
      setTasks(tasks.filter((task) => task.id !== id));
    } catch (err) { console.error("Error deleting task:", err); }
  };

  const getPriorityLabel = (priority) =>
    priority === "high" ? "Urgent" : priority === "medium" ? "Soon" : "Later";

  return (
    <>
      <Card
        sx={{
          flex: 1, display: "flex", flexDirection: "column",
          background: settings.accentColor, backdropFilter: "blur(15px)",
          border: `1px solid ${settings.primaryColor}26`, borderRadius: 4,
          boxShadow: `0 15px 40px ${settings.primaryColor}33`, minHeight: 0, overflow: "hidden",
        }}
      >
        <SuccessfulOverlay open={showSuccess} action="create" onClose={() => setShowSuccess(false)} />
        <CardContent sx={{ p: 2, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexShrink: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: settings.textPrimaryColor, fontSize: "0.95rem" }}>
              Tasks
            </Typography>
            <IconButton
              size="small" onClick={() => setAddTaskOpen(true)}
              sx={{ bgcolor: settings.textPrimaryColor, color: "#ffffff", "&:hover": { bgcolor: settings.hoverColor }, width: 28, height: 28 }}
            >
              <Add fontSize="small" />
            </IconButton>
          </Box>
          <Box
            sx={{
              flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0,
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-track": { background: `${settings.primaryColor}1A`, borderRadius: "3px" },
              "&::-webkit-scrollbar-thumb": { background: `${settings.primaryColor}4D`, borderRadius: "3px", "&:hover": { background: `${settings.primaryColor}80` } },
            }}
          >
            <List dense sx={{ p: 0 }}>
              {Array.isArray(tasks) && tasks.map((task) => (
                <ListItem key={task.id} sx={{ p: 0, mb: 1, display: "flex", alignItems: "center" }}>
                  <Checkbox
                    checked={task.completed} onChange={() => handleToggle(task.id)} size="small"
                    sx={{ color: settings.textPrimaryColor, "&.Mui-checked": { color: settings.textPrimaryColor } }}
                  />
                  <ListItemText
                    primary={task.title}
                    primaryTypographyProps={{ sx: { fontSize: "0.85rem", color: settings.textPrimaryColor, textDecoration: task.completed ? "line-through" : "none" } }}
                  />
                  <Chip
                    label={getPriorityLabel(task.priority)} size="small"
                    sx={{
                      fontSize: "0.65rem", height: 20,
                      bgcolor: task.priority === "high" ? "#f4433610" : task.priority === "medium" ? "#ff980010" : "#4caf5010",
                      color: task.priority === "high" ? "#f44336" : task.priority === "medium" ? "#ff9800" : "#4caf50",
                    }}
                  />
                  <IconButton size="small" onClick={() => handleDelete(task.id)} sx={{ color: settings.textPrimaryColor }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={addTaskOpen} onClose={() => setAddTaskOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 2, bgcolor: settings.accentColor, backdropFilter: "blur(12px)", border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33` } }}
      >
        <DialogTitle sx={{ pb: 1, fontSize: "1rem", fontWeight: 600, color: settings.textPrimaryColor }}>Add New Task</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus margin="dense" label="Task Title" fullWidth variant="outlined"
            value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <Typography variant="body2" sx={{ mb: 1, color: settings.textSecondaryColor, fontWeight: 500 }}>Priority</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {["low", "medium", "high"].map((priority) => (
              <Button
                key={priority} variant={newTask.priority === priority ? "contained" : "outlined"} size="small"
                onClick={() => setNewTask({ ...newTask, priority })}
                sx={{
                  textTransform: "capitalize", borderRadius: 2,
                  borderColor: priority === "high" ? "#f44336" : priority === "medium" ? "#ff9800" : "#4caf50",
                  color: priority === "high" ? "#f44336" : priority === "medium" ? "#ff9800" : "#4caf50",
                  ...(newTask.priority === priority && {
                    bgcolor: priority === "high" ? "#f44336" : priority === "medium" ? "#ff9800" : "#4caf50",
                    color: "#ffffff", "&:hover": { opacity: 0.9 },
                  }),
                }}
              >
                {getPriorityLabel(priority)}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddTaskOpen(false)} variant="contained" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: "#FFFFFF", bgcolor: settings.primaryColor }}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained" sx={{ borderRadius: 2, fontWeight: 600, bgcolor: settings.primaryColor, textTransform: "none", "&:hover": { bgcolor: settings.hoverColor } }}>Add Task</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ─── EventsList ───────────────────────────────────────────────────────────────

const EventsList = ({ settings, employeeNumber }) => {
  const [events, setEvents] = useState([]);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ date: new Date().toISOString().split("T")[0], title: "", description: "" });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!employeeNumber) return;
    axios
      .get(`${API_BASE_URL}/api/events/${employeeNumber}`)
      .then((res) => setEvents(Array.isArray(res.data) ? res.data : []))
      .catch((err) => { console.error("Error fetching events:", err); setEvents([]); });
  }, [employeeNumber]);

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/events`, {
        employee_number: employeeNumber, date: newEvent.date, title: newEvent.title, description: newEvent.description || "",
      });
      setEvents([res.data, ...events]);
      setNewEvent({ date: new Date().toISOString().split("T")[0], title: "", description: "" });
      setAddEventOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) { console.error("Error adding event:", err); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/events/${id}`);
      setEvents(events.filter((e) => e.id !== id));
    } catch (err) { console.error("Error deleting event:", err); }
  };

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  const getEventStatus = (dateStr) => {
    if (!dateStr) return "past";
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate.getTime() === today.getTime()) return "today";
    return eventDate > today ? "upcoming" : "past";
  };

  const getStatusLabel = (status) => status === "upcoming" ? "Upcoming" : status === "today" ? "Today" : "Past";

  return (
    <>
      <Card
        sx={{
          flex: 1, display: "flex", flexDirection: "column",
          background: settings.accentColor, backdropFilter: "blur(15px)",
          border: `1px solid ${settings.primaryColor}26`, borderRadius: 4,
          boxShadow: `0 15px 40px ${settings.primaryColor}33`, minHeight: 0, overflow: "hidden",
        }}
      >
        <SuccessfulOverlay open={showSuccess} action="create" onClose={() => setShowSuccess(false)} />
        <CardContent sx={{ p: 2, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexShrink: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: settings.textPrimaryColor, fontSize: "0.95rem" }}>Events</Typography>
            <IconButton
              size="small" onClick={() => setAddEventOpen(true)}
              sx={{ bgcolor: settings.textPrimaryColor, color: "#ffffff", "&:hover": { bgcolor: settings.hoverColor }, width: 28, height: 28 }}
            >
              <Add fontSize="small" />
            </IconButton>
          </Box>
          <Box
            sx={{
              flex: 1, overflowY: "auto", overflowX: "hidden", pr: 1, minHeight: 0,
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-track": { background: `${settings.primaryColor}1A`, borderRadius: "3px" },
              "&::-webkit-scrollbar-thumb": { background: `${settings.primaryColor}4D`, borderRadius: "3px", "&:hover": { background: `${settings.primaryColor}80` } },
            }}
          >
            <List dense sx={{ p: 0 }}>
              {Array.isArray(events) && events.length > 0 ? (
                events.map((event) => {
                  const status = getEventStatus(event.date);
                  return (
                    <ListItem key={event.id} sx={{ p: 0, mb: 1, display: "flex", alignItems: "center" }}>
                      <Event sx={{ fontSize: 18, color: status === "upcoming" ? "#4caf50" : status === "today" ? "#ff9800" : settings.textPrimaryColor, mr: 1, flexShrink: 0 }} />
                      <ListItemText
                        primary={event.title} secondary={formatDate(event.date)}
                        primaryTypographyProps={{ sx: { fontSize: "0.85rem", color: settings.textPrimaryColor } }}
                        secondaryTypographyProps={{ sx: { fontSize: "0.7rem", color: settings.textPrimaryColor } }}
                      />
                      <Chip
                        label={getStatusLabel(status)} size="small"
                        sx={{
                          fontSize: "0.65rem", height: 20, mr: 1,
                          bgcolor: status === "upcoming" ? "#4caf5010" : status === "today" ? "#ff980010" : "#f4433610",
                          color: status === "upcoming" ? "#4caf50" : status === "today" ? "#ff9800" : "#f44336",
                        }}
                      />
                      <IconButton size="small" onClick={() => handleDelete(event.id)} sx={{ color: settings.textPrimaryColor }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItem>
                  );
                })
              ) : (
                <Typography sx={{ fontSize: "0.85rem", color: settings.textSecondaryColor, textAlign: "center", py: 2 }}>
                  No events yet
                </Typography>
              )}
            </List>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={addEventOpen} onClose={() => setAddEventOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 2, bgcolor: settings.accentColor, backdropFilter: "blur(12px)", border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33` } }}
      >
        <DialogTitle sx={{ pb: 1, fontSize: "1rem", fontWeight: 600, color: settings.textPrimaryColor }}>Add New Event</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField autoFocus margin="dense" label="Event Title" fullWidth variant="outlined" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
          <TextField margin="dense" label="Event Date" type="date" fullWidth variant="outlined" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
          <TextField margin="dense" label="Description (Optional)" fullWidth multiline rows={3} variant="outlined" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddEventOpen(false)} variant="contained" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, color: "#FFFFFF", bgcolor: settings.primaryColor }}>Cancel</Button>
          <Button onClick={handleAddEvent} variant="contained" startIcon={<Save />} disabled={!newEvent.title.trim() || !newEvent.date}
            sx={{ borderRadius: 2, fontWeight: 600, bgcolor: settings.primaryColor, textTransform: "none", "&:hover": { bgcolor: settings.hoverColor }, "&:disabled": { bgcolor: `${settings.primaryColor}66`, color: "#ffffff" } }}>
            Save Event
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ─── LogoutDialog ─────────────────────────────────────────────────────────────

const LogoutDialog = ({ open, settings }) => (
  <Dialog
    open={open} fullScreen
    PaperProps={{ sx: { backgroundColor: "transparent", boxShadow: "none" } }}
    BackdropProps={{ sx: { backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" } }}
  >
    <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          sx={{
            width: 20, height: 20, borderRadius: "50%",
            background: i % 2 === 0 ? settings.primaryColor : settings.accentColor,
            position: "absolute", top: "50%", left: "50%",
            transformOrigin: "-60px 0px",
            animation: `orbit${i} ${3 + i}s linear infinite`,
            boxShadow: `0 0 15px ${settings.primaryColor}, 0 0 8px ${settings.accentColor}`,
          }}
        />
      ))}
      <Box sx={{ position: "relative", width: 120, height: 120 }}>
        <Box
          sx={{
            width: 120, height: 120, borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, ${settings.secondaryColor}, ${settings.primaryColor})`,
            boxShadow: `0 0 40px ${settings.primaryColor}, 0 0 80px ${settings.accentColor}`,
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "floatSphere 2s ease-in-out infinite alternate",
          }}
        >
          <Box component="img" src={logo} alt="Logo" sx={{ width: 60, height: 60, borderRadius: "50%", boxShadow: `0 0 20px ${settings.primaryColor}, 0 0 10px ${settings.accentColor}`, animation: "heartbeat 1s infinite" }} />
        </Box>
      </Box>
      <Typography variant="h6" sx={{ mt: 3, fontWeight: "bold", color: settings.accentColor, textShadow: `0 0 10px ${settings.primaryColor}`, animation: "pulse 1.5s infinite" }}>
        Signing out...
      </Typography>
      <Box
        component="style"
        children={`
          @keyframes heartbeat { 0%,100% { transform: scale(1); } 25%,75% { transform: scale(1.15); } 50% { transform: scale(1.05); } }
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
          @keyframes floatSphere { 0% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-15px); } 100% { transform: translate(-50%, -50%) translateY(0); } }
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
  const lastNotifFetchEmpRef = useRef(null);

  const {
    stats, weeklyAttendanceData, departmentAttendanceData, payrollStatusData,
    monthlyAttendanceTrend, payrollTrendData, attendanceChartData,
    announcements, suspensions, holidays, rawHolidays, loading, loadingCarousel, loadingPayroll, refreshAllData,
  } = useDashboardData(settings);

  // ── pageLoading: true until the first round of data resolves ─────────────
  const [pageLoading, setPageLoading] = useState(true);
  const pageLoadingResolvedRef = useRef(false);

  // Watch the three loading flags; once all three flip to false, reveal UI
  useEffect(() => {
    if (pageLoadingResolvedRef.current) return;
    if (!loading && !loadingCarousel && !loadingPayroll) {
      pageLoadingResolvedRef.current = true;
      // Small extra delay so skeleton is always visibly shown
      setTimeout(() => setPageLoading(false), 400);
    }
  }, [loading, loadingCarousel, loadingPayroll]);

  const isActiveToday = (date_start, date_end, fallbackDate) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = date_start || fallbackDate;
    const end   = date_end   || fallbackDate;
    const s = start ? new Date(start) : null;
    const e = end   ? new Date(end)   : null;
    if (s) s.setHours(0, 0, 0, 0);
    if (e) e.setHours(0, 0, 0, 0);
    if (e && today > e) return false;
    if (s && today < s) return false;
    return true;
  };

  const isNotExpired = (date_end) => {
  if (!date_end) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const e = new Date(date_end);
  e.setHours(0, 0, 0, 0);
  return today <= e;
};

  const scheduledHolidaysForCarousel = useMemo(() =>
    (rawHolidays || [])
      .filter((h) =>
  (h.status || "").toLowerCase() === "active" &&
  isNotExpired(h.date_end || h.date)
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
  [rawHolidays]);

  const suspensionsForCarousel = useMemo(() =>
    (suspensions || [])
      .filter((s) => !s.date_end || new Date(s.date_end) >= new Date(new Date().setHours(0,0,0,0)))
      .map((s) => ({
        id: `suspension-${s.id}`,
        title: s.title || "",
        about: s.about || "",
        date: s.date_start || s.date_end || s.date,
        date_start: s.date_start || s.date,
        date_end: s.date_end || s.date,
        image: s.image || null,
      })),
  [suspensions]);

  const announcementsInRange = useMemo(() =>
    (announcements || []).filter((a) => !a.date_end || new Date(a.date_end) >= new Date(new Date().setHours(0,0,0,0))),
  [announcements]);

  const carouselItems = useMemo(() =>
    [...scheduledHolidaysForCarousel, ...suspensionsForCarousel, ...announcementsInRange]
      .sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date)),
  [scheduledHolidaysForCarousel, suspensionsForCarousel, announcementsInRange]);

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const openMenu = Boolean(anchorEl);
  const navigate = useNavigate();

  useEffect(() => { setUserRole(getUserRole()); }, []);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleOpenModal = (announcement) => { setSelectedAnnouncement(announcement); setOpenModal(true); };
  const handleCloseModal = () => { setOpenModal(false); setSelectedAnnouncement(null); };
  const handleLogout = () => {
    setLogoutOpen(true);
    setTimeout(() => { localStorage.removeItem("token"); window.location.href = "/"; }, 500);
  };

  const fetchNotificationsRef = useRef(null);
  fetchNotificationsRef.current = async (empNum) => {
    if (!empNum) return;
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [notifRes, unreadRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/notifications/${empNum}`, { headers }),
        axios.get(`${API_BASE_URL}/api/notifications/${empNum}/unread-count`, { headers }),
      ]);
      const filtered = Array.isArray(notifRes.data)
        ? notifRes.data.filter((n) => String(n.employeeNumber).trim() === String(empNum).trim())
        : [];
      setNotifications(filtered);
      setUnreadCount(unreadRes.data?.count || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const fetchNotifications = useCallback((empNum) => {
    fetchNotificationsRef.current(empNum);
  }, []);

  useEffect(() => {
    if (!employeeNumber || lastNotifFetchEmpRef.current === employeeNumber) return;
    lastNotifFetchEmpRef.current = employeeNumber;
    fetchNotifications(employeeNumber);
  }, [employeeNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket || !connected || !employeeNumber) return;
    const onNotif = () => fetchNotificationsRef.current(employeeNumber);
    socket.on("notificationCreated", onNotif);
    return () => socket.off("notificationCreated", onNotif);
  }, [socket, connected, employeeNumber]);

  const handleNotificationClick = async (notification) => {
    if (notification.read_status === 0) {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        await axios.put(`${API_BASE_URL}/api/notifications/${notification.id}/read`, {}, { headers });
        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read_status: 1 } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) { console.error("Error marking notification as read:", err); }
    }

    const type = notification.notification_type;
    const link = notification.action_link || "";

    if (type === "payslip" || link.includes("payslip")) { setNotifModalOpen(false); navigate("/payslip"); }
    else if (type === "contact" || link.includes("settings")) { setNotifModalOpen(false); navigate("/settings"); }
    else if (type === "announcement" || link.includes("announcement")) {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const annRes = await axios.get(`${API_BASE_URL}/api/announcements`, { headers });
        const list = Array.isArray(annRes.data) ? annRes.data : [];
        let match = notification.announcement_id
          ? list.find((a) => a.id === notification.announcement_id || a.id === parseInt(notification.announcement_id))
          : null;
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
        if (list.length > 0) {
          const h = list[0];
          setSelectedAnnouncement({ id: `holiday-${h.id}`, title: h.title || h.description || "", about: h.about || "Official holiday.", date: h.date_start || h.date_end || h.date, image: h.image || null });
          setOpenModal(true);
        }
      } catch (err) { console.error("Error fetching holiday:", err); setNotifModalOpen(false); }
    } else if (type === "suspension") {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE_URL}/api/suspensions`, { headers });
        const list = Array.isArray(res.data) ? res.data : [];
        setNotifModalOpen(false);
        if (list.length > 0) {
          const s = list[0];
          setSelectedAnnouncement({ id: `suspension-${s.id}`, title: s.title || "", about: s.about || "", date: s.date_start || s.date_end || s.date, image: s.image || null });
          setOpenModal(true);
        }
      } catch (err) { console.error("Error fetching suspension:", err); setNotifModalOpen(false); }
    } else if (link) { setNotifModalOpen(false); navigate(link); }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; document.documentElement.style.overflow = ""; };
  }, []);

  // ── Show wireframe until all initial data resolves ────────────────────────
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
            <Box
              sx={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                mb: 3, background: settings.accentColor, backdropFilter: "blur(15px)",
                borderRadius: 4, p: 2, border: `1px solid ${settings.secondaryColor}`,
                boxShadow: `0 15px 40px ${settings.primaryColor}33`, mt: -4,
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ color: settings.textPrimaryColor }}>
                  Hello, <b>{fullName || username}</b>
                </Typography>
                <Typography variant="body2" sx={{ color: settings.textPrimaryColor, mt: 0.25, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 14 }} />
                  {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  <span style={{ marginLeft: "8px" }}>
                    {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Tooltip title="Refresh">
                  <IconButton
                    size="small"
                    sx={{ bgcolor: `${settings.primaryColor}1A`, "&:hover": { bgcolor: `${settings.primaryColor}33` }, color: settings.textPrimaryColor }}
                    onClick={refreshAllData}
                  >
                    <AutorenewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Notifications">
                  <IconButton
                    size="small"
                    sx={{ bgcolor: `${settings.primaryColor}1A`, "&:hover": { bgcolor: `${settings.primaryColor}33` }, color: settings.textPrimaryColor }}
                    onClick={async () => {
                      await fetchNotifications(employeeNumber);
                      setNotifModalOpen(true);
                    }}
                  >
                    <Badge badgeContent={unreadCount} color="error" max={9}>
                      <NotificationsIcon fontSize="small" />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Box
                  sx={{
                    position: "relative",
                    "&::before": {
                      content: '""', position: "absolute", inset: -2, borderRadius: "50%", padding: "2px",
                      background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                      WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor", maskComposite: "exclude",
                    },
                  }}
                >
                  <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                    <Avatar alt={username} src={profilePicture ? buildImageUrl(profilePicture) : undefined} sx={{ width: 36, height: 36 }} />
                  </IconButton>
                </Box>
                <Menu
                  anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  PaperProps={{
                    sx: {
                      borderRadius: 2, minWidth: 180, backgroundColor: settings.accentColor,
                      border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 15px 40px ${settings.primaryColor}33`,
                      "& .MuiMenuItem-root": { fontSize: "0.875rem", color: settings.textPrimaryColor, "&:hover": { background: `${settings.primaryColor}0A` } },
                    },
                  }}
                >
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
                <CompactStatCard
                  card={card} index={index} stats={stats}
                  loading={
                    ["pendingPayroll","processedPayroll","payslipCount"].includes(card.valueKey)
                      ? loadingPayroll
                      : loading
                  }
                  hoveredCard={hoveredCard} setHoveredCard={setHoveredCard} settings={settings}
                />
              </Box>
            ))}
          </Box>

          {/* ── MAIN GRID ── */}
          <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>

            {/* LEFT — Carousel */}
            <Grid item xs={12} md={7} sx={{ minHeight: 0, height: { xs: "auto", md: "calc(100vh - 362px)" }, display: "flex", flexDirection: "column" }}>
              <Fade in timeout={600} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <Card
                  sx={{
                    height: "100%", background: settings.accentColor, backdropFilter: "blur(15px)",
                    border: `1px solid ${settings.primaryColor}26`, borderRadius: 4, overflow: "hidden",
                    boxShadow: `0 15px 40px ${settings.primaryColor}33`, position: "relative",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  <Box sx={{ position: "relative", height: "100%", flex: 1 }}>
                    {Array.isArray(carouselItems) && carouselItems.length > 0 ? (
                      <Fade in={true} key={currentSlide} timeout={{ enter: 800, exit: 400 }}>
                        <Box sx={{ position: "relative", height: "100%", width: "100%" }}>
                          <Box
                            component="img"
                            src={carouselItems[currentSlide]?.image ? buildImageUrl(carouselItems[currentSlide].image) : "/api/placeholder/800/400"}
                            alt={carouselItems[currentSlide]?.title || "Announcement"}
                            sx={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.7s ease", transform: "scale(1)" }}
                          />
                          <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 70%)" }} />
                          <IconButton onClick={(e) => { e.stopPropagation(); handlePrevSlide(); }}
                            sx={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "translateY(-50%) scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}>
                            <ArrowBackIosNewIcon />
                          </IconButton>
                          <IconButton onClick={(e) => { e.stopPropagation(); handleNextSlide(); }}
                            sx={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "translateY(-50%) scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}>
                            <ArrowForwardIosIcon />
                          </IconButton>
                          <IconButton onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                            sx={{ position: "absolute", top: 24, right: 24, bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "scale(1.1)" }, color: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", transition: "all 0.3s", zIndex: 10 }}>
                            {isPlaying ? <Pause /> : <PlayArrow />}
                          </IconButton>
                          <Box
                            onClick={() => handleOpenModal(carouselItems[currentSlide])}
                            sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: 4, color: "#ffffff", cursor: "pointer", transition: "transform 0.3s", "&:hover": { transform: "translateY(-4px)" }, zIndex: 10 }}
                          >
                            <Chip
                              label={
                                carouselItems[currentSlide]?.id?.toString().startsWith("holiday-") ? "HOLIDAY"
                                  : carouselItems[currentSlide]?.id?.toString().startsWith("suspension-") ? "SUSPENSION"
                                  : "ANNOUNCEMENT"
                              }
                              size="small"
                              sx={{ mb: 2, bgcolor: `${settings.primaryColor}80`, backdropFilter: "blur(10px)", color: "#ffffff", fontWeight: 700, fontSize: "0.7rem", border: "1px solid rgba(254, 249, 225, 0.3)" }}
                            />
                            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, textShadow: "0 4px 12px rgba(0,0,0,0.5)", lineHeight: 1.2 }}>
                              {carouselItems[currentSlide]?.title}
                            </Typography>
                            <Typography sx={{ opacity: 0.95, fontSize: "1rem", textShadow: "0 2px 8px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 1 }}>
                              <AccessTimeIcon sx={{ fontSize: 18 }} />
                              {new Date(carouselItems[currentSlide]?.date).toDateString()}
                            </Typography>
                          </Box>
                          <Box sx={{ position: "absolute", bottom: 24, right: 24, display: "flex", gap: 1.5, alignItems: "center", zIndex: 10 }}>
                            {carouselItems.map((_, idx) => (
                              <Box key={idx}
                                sx={{ width: currentSlide === idx ? 32 : 10, height: 10, borderRadius: 5, bgcolor: currentSlide === idx ? "#ffffff" : "rgba(254,249,225,0.4)", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", cursor: "pointer", border: "1px solid rgba(254,249,225,0.3)", "&:hover": { bgcolor: "rgba(254,249,225,0.7)", transform: "scale(1.2)" } }}
                                onClick={(e) => { e.stopPropagation(); handleSlideSelect(idx); }}
                              />
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

            {/* RIGHT — Calendar / Tasks / QuickActions / Events */}
            <Grid item xs={12} md={5}
              sx={{ minHeight: 0, height: { xs: "65vh", md: "calc(100vh - 355px)" }, display: "flex", flexDirection: "column", overflow: { xs: "auto", md: "visible" }, mt: { xs: 2, md: 0 } }}
            >
              <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, flex: 1, minHeight: 0, height: "100%" }}>

                {/* Left sub-column */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0, minHeight: 0, height: "100%" }}>
                  <CompactCalendar calendarDate={calendarDate} setCalendarDate={setCalendarDate} holidays={holidays} announcements={announcements} settings={settings} setSelectedDate={setSelectedDate} />
                  <Box sx={{ flex: 0.98, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <TaskList settings={settings} />
                  </Box>
                </Box>

                {/* Right sub-column */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0, minHeight: 0, height: "100%" }}>
                  <QuickActions settings={settings} userRole={userRole} />
                  <Box sx={{ flex: 0.98, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <EventsList settings={settings} employeeNumber={employeeNumber} />
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
                  position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                  width: "90%", maxWidth: 800, bgcolor: settings.accentColor, backdropFilter: "blur(40px)",
                  border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 24px 64px ${settings.primaryColor}4D`,
                  borderRadius: 4, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column",
                }}
              >
                {selectedAnnouncement && (
                  <>
                    <Box sx={{ position: "relative" }}>
                      {selectedAnnouncement.image && (
                        <Box component="img" src={buildImageUrl(selectedAnnouncement.image)} alt={selectedAnnouncement.title} sx={{ width: "100%", height: 350, objectFit: "cover" }} />
                      )}
                      <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)" }} />
                      <IconButton onClick={handleCloseModal}
                        sx={{ position: "absolute", top: 20, right: 20, bgcolor: `${settings.primaryColor}4D`, backdropFilter: "blur(10px)", border: `1px solid ${settings.primaryColor}26`, color: "#ffffff", "&:hover": { bgcolor: `${settings.primaryColor}80`, transform: "rotate(90deg)" }, transition: "all 0.3s" }}>
                        <CloseIcon />
                      </IconButton>
                    </Box>
                    <Box sx={{ p: 4, overflowY: "auto" }}>
                      <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, color: settings.textPrimaryColor }}>{selectedAnnouncement.title}</Typography>
                      <Chip icon={<AccessTimeIcon style={{ color: settings.textPrimaryColor }} />} label={new Date(selectedAnnouncement.date).toLocaleDateString()} sx={{ mb: 3, bgcolor: `${settings.primaryColor}1A`, color: settings.textPrimaryColor, border: `1px solid ${settings.primaryColor}26` }} />
                      <Typography variant="body1" sx={{ color: settings.textPrimaryColor, lineHeight: 1.8, fontSize: "1.05rem" }}>{selectedAnnouncement.about}</Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Fade>
          </Modal>

          {/* ── NOTIFICATIONS MODAL ── */}
          <Modal open={notifModalOpen} onClose={() => setNotifModalOpen(false)}>
            <Fade in={notifModalOpen}>
              <Box
                sx={{
                  position: "absolute", top: 100, right: 24, width: 420, maxWidth: "90vw",
                  bgcolor: settings.accentColor, backdropFilter: "blur(40px)",
                  border: `1px solid ${settings.primaryColor}26`, boxShadow: `0 24px 64px ${settings.primaryColor}4D`,
                  borderRadius: 4, overflow: "hidden", maxHeight: "calc(100vh - 140px)",
                }}
              >
                <Box sx={{ p: 3, borderBottom: `1px solid ${settings.primaryColor}26`, display: "flex", justifyContent: "space-between", alignItems: "center", background: `linear-gradient(135deg, ${settings.primaryColor}1A 0%, ${settings.secondaryColor}0D 100%)` }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: settings.textPrimaryColor }}>Notifications</Typography>
                  <IconButton size="small" onClick={() => setNotifModalOpen(false)} sx={{ color: settings.textPrimaryColor, "&:hover": { backgroundColor: `${settings.primaryColor}1A`, transform: "rotate(90deg)" }, transition: "all 0.3s" }}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Box sx={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto", p: 2 }}>
                  {Array.isArray(notifications) && notifications.slice(0, 10).map((notif, idx) => {
                    const announcement = notif.notification_type === "announcement" ? announcementDetails[notif.id] : null;

                    if (notif.notification_type === "announcement" && announcement) {
                      return (
                        <Grow in timeout={300 + idx * 50} key={`notif-${notif.id}`}>
                          <Box
                            sx={{
                              mb: 2, borderRadius: 3, overflow: "hidden", cursor: "pointer",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: `0 2px 8px ${settings.primaryColor}33`,
                              opacity: notif.read_status === 1 ? 0.7 : 1, position: "relative", height: 200,
                              "&:hover": { transform: "translateY(-4px)", boxShadow: `0 8px 24px ${settings.primaryColor}4D`, opacity: 1 },
                            }}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <Box component="img" src={announcement.image ? buildImageUrl(announcement.image) : "/api/placeholder/400/200"} alt={announcement.title} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)", p: 2 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                <Flag sx={{ color: "#ff69b4", fontSize: 18 }} />
                                <Typography fontSize="0.75rem" sx={{ color: "#fff", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>New Announcement</Typography>
                              </Box>
                              <Typography fontWeight={700} fontSize="1.1rem" sx={{ color: "#fff", mb: 0.5, lineHeight: 1.3, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{announcement.title}</Typography>
                              <Typography fontSize="0.75rem" sx={{ color: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", gap: 0.5 }}>
                                <AccessTimeIcon sx={{ fontSize: 12 }} />
                                {notif.created_at ? new Date(notif.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}
                              </Typography>
                            </Box>
                          </Box>
                        </Grow>
                      );
                    }

                    return (
                      <Grow in timeout={300 + idx * 50} key={`notif-${notif.id}`}>
                        <Box
                          sx={{
                            mb: 2, p: 2.5, borderRadius: 3,
                            background: notif.read_status === 0
                              ? notif.notification_type === "payslip" ? "rgba(76, 175, 80, 0.1)"
                              : notif.notification_type === "contact" ? "rgba(255, 152, 0, 0.1)"
                              : notif.notification_type === "holiday" ? "rgba(237, 108, 2, 0.1)"
                              : notif.notification_type === "suspension" ? "rgba(211, 47, 47, 0.1)"
                              : `${settings.primaryColor}1A`
                              : `${settings.primaryColor}0A`,
                            border: `1px solid ${settings.primaryColor}26`,
                            borderLeft: notif.read_status === 0
                              ? notif.notification_type === "payslip" ? "4px solid #4caf50"
                              : notif.notification_type === "contact" ? "4px solid #ff9800"
                              : notif.notification_type === "holiday" ? "4px solid #ed6c02"
                              : notif.notification_type === "suspension" ? "4px solid #d32f2f"
                              : `4px solid ${settings.primaryColor}`
                              : `1px solid ${settings.primaryColor}26`,
                            cursor: "pointer",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", position: "relative", overflow: "hidden",
                            "&:hover": { background: `${settings.primaryColor}1A`, transform: "translateX(8px)", boxShadow: `0 8px 24px ${settings.primaryColor}33` },
                          }}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 12, height: 12, borderRadius: "50%", mt: 0.5, flexShrink: 0,
                                background: notif.notification_type === "payslip" ? "linear-gradient(135deg,#4caf50,#2e7d32)"
                                  : notif.notification_type === "contact" ? "linear-gradient(135deg,#ff9800,#f57c00)"
                                  : notif.notification_type === "holiday" ? "linear-gradient(135deg,#ed6c02,#e65100)"
                                  : notif.notification_type === "suspension" ? "linear-gradient(135deg,#d32f2f,#b71c1c)"
                                  : `linear-gradient(135deg,${settings.primaryColor},${settings.secondaryColor})`,
                                boxShadow: `0 0 12px ${settings.primaryColor}99`,
                                opacity: notif.read_status === 0 ? 1 : 0.5,
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: settings.textPrimaryColor, mb: 0.5, lineHeight: 1.4 }}>
                                {notif.notification_type === "payslip" ? "Payslip Available"
                                  : notif.notification_type === "contact" ? "New Ticket"
                                  : notif.notification_type === "holiday" ? "New Holiday"
                                  : notif.notification_type === "suspension" ? "New Suspension"
                                  : "Notification"}
                              </Typography>
                              <Typography sx={{ fontSize: "0.85rem", color: settings.textPrimaryColor, mb: 0.5 }}>{notif.description}</Typography>
                              <Typography sx={{ fontSize: "0.8rem", color: settings.textPrimaryColor, display: "flex", alignItems: "center", gap: 0.5 }}>
                                <AccessTimeIcon sx={{ fontSize: 14 }} />
                                {notif.created_at ? new Date(notif.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}
                              </Typography>
                            </Box>
                            <ArrowForward sx={{ color: settings.textPrimaryColor, fontSize: 20, transition: "transform 0.3s", mt: 0.5, flexShrink: 0 }} />
                          </Box>
                        </Box>
                      </Grow>
                    );
                  })}
                  {(!Array.isArray(notifications) || notifications.length === 0) && (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                      <NotificationsIcon sx={{ fontSize: 80, color: `${settings.primaryColor}33` }} />
                      <Typography sx={{ color: settings.textSecondaryColor, fontSize: "1rem" }}>No notifications at the moment</Typography>
                      <Typography sx={{ color: settings.textSecondaryColor, fontSize: "0.85rem", mt: 1 }}>You're all caught up!</Typography>
                    </Box>
                  )}
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