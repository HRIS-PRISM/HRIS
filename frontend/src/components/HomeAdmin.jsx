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

// Get user role from token
const getUserRole = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    // Parse JWT token to get user role
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    const payload = JSON.parse(jsonPayload);
    return payload.role || payload.userRole || null;
  } catch (error) {
    console.error("Error parsing token:", error);
    return null;
  }
};

// Helper to build correct base URL for static assets (like /uploads)
const getStaticBaseUrl = () => {
  if (!API_BASE_URL) return "";

  // Normalize trailing slashes
  let base = API_BASE_URL.replace(/\/+$/, "");

  // If API_BASE_URL already includes '/api' at the end (with or without trailing slash), strip it for static files
  base = base.replace(/\/api$/i, "");

  return base;
};

// Helper to build image URL from stored path (e.g. '/uploads/filename')
const buildImageUrl = (imagePath) => {
  if (!imagePath) return "";

  if (typeof imagePath === "string") {
    // Already an absolute URL
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    // Stored as '/uploads/...'
    if (imagePath.startsWith("/uploads")) {
      return `${getStaticBaseUrl()}${imagePath}`;
    }
  }

  return imagePath;
};

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
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error("Error parsing stored settings:", error);
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
  {
    label: "Users",
    link: "/users-list",
    icon: <Group />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
  },
  {
    label: "Payroll",
    link: "/payroll-table",
    icon: <PaymentsIcon />,
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
  },
  {
    label: "Category",
    link: "/employee-category",
    icon: <CategoryIcon />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
  },
  {
    label: "DTRs",
    link: "/daily_time_record_faculty",
    icon: <AccessTimeIcon />,
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
  },
  {
    label: "Announcements",
    link: "/announcement",
    icon: <CampaignIcon />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
  },
  {
    label: "Holidays",
    link: "/holiday",
    icon: <AcUnit />,
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
  },
  {
    label: "Audit Logs",
    link: "/audit-logs",
    icon: <History />,
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
    restricted: true, // Mark as restricted
  },
  {
    label: "Registration",
    link: "/registration",
    icon: <PersonAdd />,
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
  },
  {
    label: "Payslip",
    link: "/distribution-payslip",
    icon: <PersonAdd />,
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`,
  },
];

const COLORS = (settings) => [
  settings.primaryColor,
  settings.secondaryColor,
  settings.hoverColor,
  settings.primaryColor,
  settings.secondaryColor,
];

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
    } catch (err) {
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
          `${API_BASE_URL}/personalinfo/person_table`
        );
        const list = Array.isArray(res.data) ? res.data : [];
        const match = list.find(
          (p) => String(p.agencyEmployeeNum) === String(employeeNumber)
        );
        if (match) {
          if (match.profile_picture) setProfilePicture(match.profile_picture);
          const fullNameFromPerson = `${match.firstName || ""} ${
            match.middleName || ""
          } ${match.lastName || ""} ${match.nameExtension || ""}`.trim();
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

const useDashboardData = (settings) => {
  const { socket, connected } = useSocket();
  const isRefreshingRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const didInitialLoadRef = useRef(false);

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

  const [payrollTrendData, setPayrollTrendData] = useState([
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (attendanceChartData.length > 0) {
      setAttendanceChartData((prev) =>
        prev.map((item, idx) => ({
          ...item,
          fill:
            idx === 0
              ? settings.primaryColor
              : idx === 1
              ? settings.secondaryColor
              : settings.hoverColor,
        }))
      );
    }

    if (payrollStatusData.length > 0) {
      setPayrollStatusData((prev) =>
        prev.map((item, idx) => ({
          ...item,
          fill:
            idx === 0
              ? settings.primaryColor
              : idx === 1
              ? settings.secondaryColor
              : settings.hoverColor,
        }))
      );
    }
  }, [settings]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        console.log(" Starting data fetch...");

        try {
          console.log(" Fetching dashboard stats...");
          const dashboardStatsRes = await axios.get(
            `${API_BASE_URL}/api/dashboard/stats`,
            { headers }
          );
          const dashStats = dashboardStatsRes.data;

          console.log(" Dashboard stats received:", dashStats);

          setStats((prev) => ({
            ...prev,
            employees: dashStats.totalEmployees || 0,
            todayAttendance: dashStats.presentToday || 0,
          }));

          const totalEmp = dashStats.totalEmployees || 0;
          const presentToday = dashStats.presentToday || 0;
          const absentToday = totalEmp - presentToday;

          setAttendanceChartData([
            {
              name: "Present",
              value: presentToday,
              fill: settings.primaryColor,
            },
            {
              name: "Absent",
              value: absentToday,
              fill: settings.secondaryColor,
            },
            { name: "Late", value: 0, fill: settings.hoverColor },
          ]);

          console.log(" Attendance chart data updated:", {
            present: presentToday,
            absent: absentToday,
          });
        } catch (err) {
          console.error(" Failed to fetch dashboard stats:", err?.message);
        }

        try {
          console.log(" Fetching weekly attendance...");
          const weeklyAttendanceRes = await axios.get(
            `${API_BASE_URL}/api/dashboard/attendance-overview?days=5`,
            { headers }
          );
          const weeklyData = weeklyAttendanceRes.data;

          console.log(" Weekly attendance received:", weeklyData);

          const transformedWeekly = Array.isArray(weeklyData)
            ? weeklyData.map((item) => ({
                day: item.day,
                present: item.present,
                absent: 0,
                late: 0,
              }))
            : [];

          setWeeklyAttendanceData(transformedWeekly);
          console.log(
            "Weekly chart updated with",
            transformedWeekly.length,
            "days"
          );
        } catch (err) {
          console.error(" Failed to fetch weekly attendance:", err?.message);

          setWeeklyAttendanceData([]);
        }

        try {
          console.log("Fetching department distribution...");
          const deptDistRes = await axios.get(
            `${API_BASE_URL}/api/dashboard/department-distribution`,
            { headers }
          );
          const deptData = deptDistRes.data;

          console.log(" Department data received:", deptData);

          const transformedDept = Array.isArray(deptData)
            ? deptData.map((item) => ({
                department: item.department,
                present: item.employeeCount,
                absent: 0,
                rate: item.employeeCount > 0 ? 100 : 0,
              }))
            : [];

          setDepartmentAttendanceData(transformedDept);
          console.log(
            "Department chart updated with",
            transformedDept.length,
            "departments"
          );
        } catch (err) {
          console.error(
            "Failed to fetch department distribution:",
            err?.message
          );
          setDepartmentAttendanceData([]);
        }

        try {
          console.log("Fetching payroll summary...");
          const payrollSummaryRes = await axios.get(
            `${API_BASE_URL}/api/dashboard/payroll-summary`,
            { headers }
          );
          const payrollSummary = payrollSummaryRes.data;

          console.log("Payroll summary received:", payrollSummary);

          setStats((prev) => ({
            ...prev,
            pendingPayroll: payrollSummary.pending || 0,
            processedPayroll: payrollSummary.processed || 0,
          }));

          const newPayrollStatus = [
            {
              status: "Processed",
              value: payrollSummary.processed || 0,
              fill: settings.primaryColor,
            },
            {
              status: "Pending",
              value: payrollSummary.pending || 0,
              fill: settings.secondaryColor,
            },
            { status: "Failed", value: 0, fill: settings.hoverColor },
          ];
          setPayrollStatusData(newPayrollStatus);

          console.log(" Payroll charts updated");
        } catch (err) {
          console.error(" Failed to fetch payroll summary:", err?.message);

          setPayrollStatusData([
            { status: "Processed", value: 0, fill: settings.primaryColor },
            { status: "Pending", value: 0, fill: settings.secondaryColor },
            { status: "Failed", value: 0, fill: settings.hoverColor },
          ]);
        }

        try {
          console.log("Fetching monthly attendance trend...");
          const monthlyAttendanceRes = await axios.get(
            `${API_BASE_URL}/api/dashboard/monthly-attendance`,
            { headers }
          );
          const monthlyData = monthlyAttendanceRes.data;

          console.log(
            " Monthly attendance received:",
            monthlyData.length,
            "days"
          );

          const weeklyAverages = [];
          let weekData = [];

          if (Array.isArray(monthlyData)) {
            monthlyData.forEach((day, index) => {
              weekData.push(day.present);

              if ((index + 1) % 7 === 0 || index === monthlyData.length - 1) {
                const avg =
                  weekData.reduce((a, b) => a + b, 0) / weekData.length;
                weeklyAverages.push({
                  week: `Week ${weeklyAverages.length + 1}`,
                  attendance: avg.toFixed(1),
                  leaves: 0,
                  overtime: 0,
                });
                weekData = [];
              }
            });
          }

          if (weeklyAverages.length > 0) {
            setMonthlyAttendanceTrend(weeklyAverages);
            console.log(
              "Monthly trend updated with",
              weeklyAverages.length,
              "weeks"
            );
          }
        } catch (err) {
          console.error("Failed to fetch monthly attendance:", err?.message);
        }

        try {
          console.log(" Fetching payslip count...");
          const finalizedPayrollRes = await axios.get(
            `${API_BASE_URL}/PayrollRoute/finalized-payroll`,
            { headers }
          );
          const payslipCount = Array.isArray(finalizedPayrollRes.data)
            ? finalizedPayrollRes.data.length
            : 0;

          setStats((prev) => ({ ...prev, payslipCount }));
          console.log(" Payslip count:", payslipCount);
        } catch (err) {
          console.error(" Failed to fetch payslip count:", err?.message);

          setStats((prev) => ({ ...prev, payslipCount: 0 }));
        }

        try {
          console.log(" Fetching announcements...");
          const annRes = await axios.get(`${API_BASE_URL}/api/announcements`, {
            headers,
          });
          const announcementData = Array.isArray(annRes.data)
            ? annRes.data
            : [];
          setAnnouncements(announcementData);
          console.log("Announcements loaded:", announcementData.length);
        } catch (err) {
          console.error(" Failed to fetch announcements:", err?.message);
          setAnnouncements([]);
        }

        try {
          console.log(" Fetching suspensions...");
          const suspRes = await axios.get(`${API_BASE_URL}/api/suspensions`, { headers });
          const suspensionData = Array.isArray(suspRes.data) ? suspRes.data : [];
          setSuspensions(suspensionData);
          console.log("Suspensions loaded:", suspensionData.length);
        } catch (err) {
          console.error(" Failed to fetch suspensions:", err?.message);
          setSuspensions([]);
        }

        try {
          console.log(" Fetching holidays...");
          const res = await axios.get(`${API_BASE_URL}/holiday`, { headers });
          if (Array.isArray(res.data)) {
            setRawHolidays(res.data);
            const transformedHolidays = res.data.map((item) => {
              const d = new Date(item.date);
              const normalizedDate = !isNaN(d)
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
                    2,
                    "0"
                  )}-${String(d.getDate()).padStart(2, "0")}`
                : item.date;
              return {
                date: normalizedDate,
                name: item.description,
                status: item.status,
              };
            });
            setHolidays(transformedHolidays);
            console.log(" Holidays loaded:", transformedHolidays.length);
          }
        } catch (err) {
          console.error(" Error fetching holidays:", err);
        }

        console.log(" All data fetch completed!");
      } catch (err) {
        console.error(" Critical error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    // Avoid overlapping refreshes if a request runs long, and coalesce bursts
    const refreshAllData = async () => {
      if (isRefreshingRef.current) {
        refreshQueuedRef.current = true;
        return;
      }

      isRefreshingRef.current = true;
      try {
        await fetchAllData();
      } finally {
        isRefreshingRef.current = false;
        if (refreshQueuedRef.current) {
          refreshQueuedRef.current = false;
          // Run one extra time to cover any updates that arrived mid-fetch
          refreshAllData();
        }
      }
    };

    // Initial load (do not re-run just because socket connects)
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
      refreshAllData();
    }

    // Real-time: refresh dashboard when server emits an update event
    const onDashboardUpdated = (payload) => {
      console.log(" Dashboard update received via Socket.IO:", payload);
      refreshAllData();
    };

    if (socket && connected) {
      socket.on("adminDashboardUpdated", onDashboardUpdated);
      socket.on("attendanceChanged", onDashboardUpdated);
    }

    return () => {
      if (socket) {
        socket.off("adminDashboardUpdated", onDashboardUpdated);
        socket.off("attendanceChanged", onDashboardUpdated);
      }
    };
  }, [settings, socket, connected]);

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
  };
};

const useCarousel = (items, autoPlay = true, interval = 5000) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (!Array.isArray(items) || items.length === 0 || !isPlaying) return;
    const timer = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % items.length);
    }, interval);
    return () => clearInterval(timer);
  }, [items, isPlaying, interval]);

  const handlePrevSlide = useCallback(() => {
    if (!Array.isArray(items)) return;
    setCurrentSlide((s) => (s - 1 + items.length) % items.length);
  }, [items]);

  const handleNextSlide = useCallback(() => {
    if (!Array.isArray(items)) return;
    setCurrentSlide((s) => (s + 1) % items.length);
  }, [items]);

  const handleSlideSelect = useCallback(
    (index) => {
      if (!Array.isArray(items)) return;
      setCurrentSlide(index);
    },
    [items]
  );

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return {
    currentSlide,
    isPlaying,
    handlePrevSlide,
    handleNextSlide,
    handleSlideSelect,
    togglePlayPause,
  };
};

const useTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return currentTime;
};

const StatCard = ({
  card,
  index,
  stats,
  loading,
  hoveredCard,
  setHoveredCard,
  settings,
}) => (
  <Grow in timeout={500 + index * 100}>
    <Card
      onMouseEnter={() => setHoveredCard(index)}
      onMouseLeave={() => setHoveredCard(null)}
      sx={{
        background:
          hoveredCard === index ? card.gradient : settings.accentColor,
        backdropFilter: "blur(15px)",
        border:
          hoveredCard === index
            ? "none"
            : `1px solid ${settings.primaryColor}26`,
        borderRadius: 4,
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        transform:
          hoveredCard === index
            ? "translateY(-12px) scale(1.02)"
            : "translateY(0)",
        boxShadow:
          hoveredCard === index ? card.shadow : "0 4px 12px rgba(0,0,0,0.1)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: hoveredCard === index ? "none" : card.gradient,
          opacity: 0.1,
          transition: "opacity 0.5s",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          top: -50,
          right: -50,
          width: 150,
          height: 150,
          background:
            "radial-gradient(circle, rgba(254,249,225,0.2) 0%, transparent 70%)",
          borderRadius: "50%",
          transform: hoveredCard === index ? "scale(2)" : "scale(0)",
          transition: "transform 0.6s ease-out",
        },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                hoveredCard === index
                  ? "rgba(254, 249, 225, 0.2)"
                  : `${settings.primaryColor}1A`,
              backdropFilter: "blur(10px)",
              color:
                hoveredCard === index ? "#ffffff" : settings.textPrimaryColor,
              transition: "all 0.5s",
              transform:
                hoveredCard === index
                  ? "rotate(360deg) scale(1.1)"
                  : "rotate(0) scale(1)",
              boxShadow:
                hoveredCard === index ? "0 8px 24px rgba(0,0,0,0.2)" : "none",
            }}
          >
            {React.cloneElement(card.icon, { sx: { fontSize: 36 } })}
          </Box>
          <Chip
            icon={card.trendUp ? <TrendingUp /> : <TrendingDown />}
            label={card.trend}
            size="small"
            sx={{
              bgcolor:
                hoveredCard === index
                  ? "rgba(254,249,225,0.15)"
                  : `${settings.primaryColor}1A`,
              backdropFilter: "blur(10px)",
              color:
                hoveredCard === index ? "#ffffff" : settings.textPrimaryColor,
              fontWeight: 700,
              border:
                hoveredCard === index
                  ? "1px solid rgba(254,249,225,0.2)"
                  : `1px solid ${settings.primaryColor}26`,
              "& .MuiChip-icon": {
                color:
                  hoveredCard === index ? "#ffffff" : settings.textPrimaryColor,
              },
            }}
          />
        </Box>
        <Typography
          variant="h2"
          sx={{
            fontWeight: 800,
            mb: 0.5,
            color:
              hoveredCard === index ? "#ffffff" : settings.textPrimaryColor,
            textShadow:
              hoveredCard === index ? "0 2px 10px rgba(0,0,0,0.3)" : "none",
          }}
        >
          {loading ? (
            <Skeleton
              variant="text"
              width={80}
              sx={{ bgcolor: "rgba(128, 0, 32, 0.1)" }}
            />
          ) : stats[card.valueKey] !== undefined ? (
            stats[card.valueKey]
          ) : (
            card.defaultValue
          )}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 0.5,
            color:
              hoveredCard === index
                ? "rgba(254,249,225,0.9)"
                : settings.textPrimaryColor,
            textShadow:
              hoveredCard === index ? "0 1px 5px rgba(0,0,0,0.3)" : "none",
          }}
        >
          {card.textValue}
        </Typography>
        <Typography
          sx={{
            color:
              hoveredCard === index
                ? "rgba(254,249,225,0.9)"
                : settings.textSecondaryColor,
            fontSize: "1rem",
            fontWeight: 600,
            mb: 0.5,
          }}
        >
          {card.label}
        </Typography>
        <Typography
          sx={{
            color:
              hoveredCard === index
                ? "rgba(254,249,225,0.6)"
                : settings.textSecondaryColor,
            fontSize: "0.85rem",
          }}
        >
          {card.subtitle}
        </Typography>
        {loading && (
          <LinearProgress
            sx={{
              mt: 2,
              borderRadius: 1,
              height: 4,
              bgcolor: "rgba(128, 0, 32, 0.1)",
              "& .MuiLinearProgress-bar": {
                bgcolor:
                  hoveredCard === index ? "#ffffff" : settings.primaryColor,
                borderRadius: 1,
              },
            }}
          />
        )}
      </CardContent>
    </Card>
  </Grow>
);

const CompactStatCard = ({
  card,
  index,
  stats,
  loading,
  hoveredCard,
  setHoveredCard,
  settings,
}) => (
  <Grow in timeout={300 + index * 50}>
    <Card
      onMouseEnter={() => setHoveredCard(index)}
      onMouseLeave={() => setHoveredCard(null)}
      sx={{
        height: 120,
        background: settings.accentColor,
        border: `1px solid ${
          hoveredCard === index ? settings.primaryColor : settings.primaryColor
        }26`,
        borderRadius: 4,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform:
          hoveredCard === index
            ? "translateY(-4px) scale(1.02)"
            : "translateY(0)",
        boxShadow:
          hoveredCard === index ? card.shadow : "0 2px 8px rgba(0,0,0,0.08)",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <CardContent
        sx={{
          p: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 30,
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${settings.primaryColor}1A`,
              color: settings.textPrimaryColor,
              transition: "all 0.3s",
              transform:
                hoveredCard === index
                  ? "rotate(360deg) scale(1.1)"
                  : "rotate(0) scale(1)",
            }}
          >
            {React.cloneElement(card.icon, { sx: { fontSize: 24 } })}
          </Box>
        </Box>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: settings.textPrimaryColor,
              lineHeight: 1,
            }}
          >
            {loading ? (
              <Skeleton variant="text" width={60} height={32} />
            ) : stats[card.valueKey] !== undefined ? (
              stats[card.valueKey]
            ) : (
              card.defaultValue
            )}
          </Typography>
          <Typography
            sx={{
              color: settings.textPrimaryColor,
              fontSize: "0.75rem",
              fontWeight: 500,
            }}
          >
            {card.textValue}
          </Typography>
          <Typography
            sx={{
              color: settings.textSecondaryColor,
              fontSize: "0.7rem",
              fontWeight: 500,
            }}
          >
            {card.label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  </Grow>
);

const AnnouncementCarousel = ({
  announcements,
  currentSlide,
  isPlaying,
  handlePrevSlide,
  handleNextSlide,
  handleSlideSelect,
  togglePlayPause,
  handleOpenModal,
  settings,
}) => (
  <Fade in timeout={600}>
    <Card
      sx={{
        background: settings.accentColor,
        backdropFilter: "blur(15px)",
        border: `1px solid ${settings.primaryColor}26`,
        borderRadius: 4,
        mb: 3,
        overflow: "hidden",
        boxShadow: `0 15px 40px ${settings.primaryColor}33`,
        position: "relative",
      }}
    >
      <Box sx={{ position: "relative", height: 550 }}>
        {Array.isArray(announcements) && announcements.length > 0 ? (
          <>
                  <Box
                    component="img"
                    src={
                      announcements[currentSlide]?.image
                        ? buildImageUrl(announcements[currentSlide].image)
                        : "/api/placeholder/800/400"
                    }
              alt={announcements[currentSlide]?.title || (announcements[currentSlide]?.id?.toString().startsWith("holiday-") ? "Holiday" : announcements[currentSlide]?.id?.toString().startsWith("suspension-") ? "Suspension" : "Announcement")}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.7s ease",
                transform: "scale(1)",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 70%)",
              }}
            />
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handlePrevSlide();
              }}
              sx={{
                position: "absolute",
                left: 24,
                top: "50%",
                transform: "translateY(-50%)",
                bgcolor: `${settings.primaryColor}4D`,
                backdropFilter: "blur(10px)",
                border: `1px solid ${settings.primaryColor}26`,
                "&:hover": {
                  bgcolor: `${settings.primaryColor}80`,
                  transform: "translateY(-50%) scale(1.1)",
                },
                color: "#ffffff",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                transition: "all 0.3s",
              }}
            >
              <ArrowBackIosNewIcon />
            </IconButton>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleNextSlide();
              }}
              sx={{
                position: "absolute",
                right: 24,
                top: "50%",
                transform: "translateY(-50%)",
                bgcolor: `${settings.primaryColor}4D`,
                backdropFilter: "blur(10px)",
                border: `1px solid ${settings.primaryColor}26`,
                "&:hover": {
                  bgcolor: `${settings.primaryColor}80`,
                  transform: "translateY(-50%) scale(1.1)",
                },
                color: "#ffffff",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                transition: "all 0.3s",
              }}
            >
              <ArrowForwardIosIcon />
            </IconButton>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              sx={{
                position: "absolute",
                top: 24,
                right: 24,
                bgcolor: `${settings.primaryColor}4D`,
                backdropFilter: "blur(10px)",
                border: `1px solid ${settings.primaryColor}26`,
                "&:hover": {
                  bgcolor: `${settings.primaryColor}80`,
                  transform: "scale(1.1)",
                },
                color: "#ffffff",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                transition: "all 0.3s",
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            <Box
              onClick={() => handleOpenModal(announcements[currentSlide])}
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                p: 4,
                color: "#ffffff",
                cursor: "pointer",
                transition: "transform 0.3s",
                "&:hover": { transform: "translateY(-4px)" },
              }}
            >
              <Chip
                label={announcements[currentSlide]?.id?.toString().startsWith("holiday-") ? "HOLIDAY" : announcements[currentSlide]?.id?.toString().startsWith("suspension-") ? "SUSPENSION" : "ANNOUNCEMENT"}
                size="small"
                sx={{
                  mb: 2,
                  bgcolor: `${settings.primaryColor}80`,
                  backdropFilter: "blur(10px)",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  border: "1px solid rgba(254, 249, 225, 0.3)",
                }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  mb: 1,
                  textShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  lineHeight: 1.2,
                }}
              >
                {announcements[currentSlide]?.title}
              </Typography>
              <Typography
                sx={{
                  opacity: 0.95,
                  fontSize: "1rem",
                  textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <AccessTimeIcon sx={{ fontSize: 18 }} />
                {new Date(announcements[currentSlide]?.date).toDateString()}
              </Typography>
            </Box>
            <Box
              sx={{
                position: "absolute",
                bottom: 24,
                right: 24,
                display: "flex",
                gap: 1.5,
                alignItems: "center",
              }}
            >
              {announcements.map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: currentSlide === idx ? 32 : 10,
                    height: 10,
                    borderRadius: 5,
                    bgcolor:
                      currentSlide === idx
                        ? "#ffffff"
                        : "rgba(254,249,225,0.4)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: "pointer",
                    border: "1px solid rgba(254,249,225,0.3)",
                    "&:hover": {
                      bgcolor: "rgba(254,249,225,0.7)",
                      transform: "scale(1.2)",
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSlideSelect(idx);
                  }}
                />
              ))}
            </Box>
          </>
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
              sx={{ fontSize: 80, color: `${settings.primaryColor}4D` }}
            />
            <Typography variant="h5" sx={{ color: settings.textPrimaryColor }}>
              No announcements, suspensions, or holidays available
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  </Fade>
);

const CompactChart = ({ title, children, height = 200, settings }) => (
  <Card
    sx={{
      background: settings.accentColor,
      backdropFilter: "blur(15px)",
      border: `1px solid ${settings.primaryColor}26`,
      borderRadius: 4,
      height: height + 80,
      boxShadow: `0 15px 40px ${settings.primaryColor}33`,
      transition: "all 0.3s",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: `0 20px 50px ${settings.primaryColor}4D`,
      },
    }}
  >
    <CardContent sx={{ p: 2 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          mb: 1,
          color: settings.textPrimaryColor,
          fontSize: "0.95rem",
        }}
      >
        {title}
      </Typography>
      <Box sx={{ height }}>{children}</Box>
    </CardContent>
  </Card>
);

// Updated CompactCalendar component to include announcements
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

  const generateCalendar = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < adjustedFirst; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length < 35) days.push(null);
    return days;
  };

  const calendarDays = useMemo(
    () => generateCalendar(month, year),
    [month, year]
  );

  // Function to normalize date to YYYY-MM-DD
  const normalizeDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - offset);
    return d.toISOString().split("T")[0];
  };

  // Get announcements for a specific date
  const getAnnouncementsForDate = (dateStr) => {
    if (!Array.isArray(announcements)) return [];

    return announcements.filter((announcement) => {
      const announcementDate = normalizeDate(announcement.date);
      return announcementDate === dateStr;
    });
  };

  return (
    <Card
      sx={{
        background: settings.accentColor,
        backdropFilter: "blur(15px)",
        border: `1px solid ${settings.primaryColor}26`,
        borderRadius: 4,
        boxShadow: `0 15px 40px ${settings.primaryColor}33`,
        height: 260,
      }}
    >
      <CardContent
        sx={{
          p: 1.5,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
            sx={{ color: settings.textPrimaryColor, p: 0.5 }}
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "0.8rem",
              color: settings.textPrimaryColor,
            }}
          >
            {new Date(year, month).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
            sx={{ color: settings.textPrimaryColor, p: 0.5 }}
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
        <Grid container spacing={0.3} sx={{ mb: 0.3 }}>
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
            <Grid item xs={12 / 7} key={day}>
              <Typography
                sx={{
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: "0.55rem",
                  color: settings.textPrimaryColor,
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={0.3} sx={{ flex: 1 }}>
          {calendarDays.map((day, index) => {
            const currentDate = `${year}-${String(month + 1).padStart(
              2,
              "0"
            )}-${String(day).padStart(2, "0")}`;
            const holidayData = Array.isArray(holidays)
              ? holidays.find(
                  (h) => h.date === currentDate && h.status === "Active"
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
                    // Check if it's today
                    isToday
                      ? `Today` +
                        (holidayData
                          ? `Holiday: ${holidayData.name}` // If it's a holiday, show "Holiday: [Holiday Name]"
                          : hasAnnouncements && dayAnnouncements.length > 0
                          ? `Announcement: ${dayAnnouncements[0].title}` // If there are announcements, show "Announcement: [Title]"
                          : "") // If neither, just show "Today:"
                      : holidayData
                      ? `Holiday: ${holidayData.name}` // If it's not today but there's a holiday
                      : hasAnnouncements && dayAnnouncements.length > 0
                      ? `Announcement: ${dayAnnouncements[0].title}` // If it's not today but there are announcements
                      : "" // If neither holiday nor announcement, show nothing
                  }
                  arrow
                >
                  <Box
                    onClick={() => {
                      if (day) {
                        setSelectedDate(currentDate);
                      }
                    }}
                    sx={{
                      textAlign: "center",
                      py: 0.3,
                      fontSize: "0.65rem",
                      borderRadius: 0.5,
                      color: holidayData
                        ? "#ffffff"
                        : day
                        ? settings.textPrimaryColor
                        : "transparent",
                      background: holidayData
                        ? `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`
                        : isToday
                        ? "#c4c4c4ff" // Highlight today's date
                        : hasAnnouncements
                        ? `${settings.primaryColor}15`
                        : "transparent",
                      fontWeight:
                        holidayData || isToday || hasAnnouncements ? 600 : 400,
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
                              ? "#e0e0e0" // Hover effect for today
                              : hasAnnouncements
                              ? `${settings.primaryColor}25`
                              : "#e0e0e0",
                            transform: "scale(1.1)",
                          }
                        : {},
                    }}
                  >
                    {day || ""}
                    {hasAnnouncements && day && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 2,
                          left: 0,
                          right: 0,
                          display: "flex",
                          justifyContent: "center",
                        }}
                      ></Box>
                    )}
                  </Box>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>
        <Box
          sx={{
            mt: 1,
            display: "flex",
            gap: 2,
            justifyContent: "center",
            fontSize: "0.65rem",
          }}
        ></Box>
      </CardContent>
    </Card>
  );
};

// New component to display announcements for a selected date
const DateAnnouncements = ({ selectedDate, announcements, settings }) => {
  // Function to normalize date to YYYY-MM-DD
  const normalizeDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - offset);
    return d.toISOString().split("T")[0];
  };

  // Get announcements for selected date
  const dateAnnouncements = Array.isArray(announcements)
    ? announcements.filter((announcement) => {
        const announcementDate = normalizeDate(announcement.date);
        return announcementDate === selectedDate;
      })
    : [];

  return (
    <Card
      sx={{
        background: settings.accentColor,
        backdropFilter: "blur(15px)",
        border: `1px solid ${settings.primaryColor}26`,
        borderRadius: 4,
        boxShadow: `0 15px 40px ${settings.primaryColor}33`,
        height: 270,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 1,
            color: settings.textPrimaryColor,
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
          }}
        >
          <CampaignIcon sx={{ mr: 1, fontSize: 20 }} />
          Announcements
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mb: 1,
            color: settings.textSecondaryColor,
            fontSize: "0.8rem",
          }}
        >
          {selectedDate &&
            new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
        </Typography>
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            pr: 1,
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: `${settings.primaryColor}1A`,
              borderRadius: "3px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: `${settings.primaryColor}4D`,
              borderRadius: "3px",
              "&:hover": {
                background: `${settings.primaryColor}80`,
              },
            },
          }}
        >
          {dateAnnouncements.length > 0 ? (
            dateAnnouncements.map((announcement, index) => (
              <Grow
                in
                timeout={300 + index * 50}
                key={announcement.id || index}
              >
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: 2,
                    background: `${settings.primaryColor}1A`,
                    border: `1px solid ${settings.primaryColor}26`,
                    cursor: "pointer",
                    transition: "all 0.3s",
                    "&:hover": {
                      background: `${settings.primaryColor}25`,
                      transform: "translateX(4px)",
                    },
                  }}
                  onClick={() => {
                    // This would open to announcement detail modal
                    // Implementation depends on how you want to handle this
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: settings.textPrimaryColor,
                      mb: 0.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {announcement.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: settings.textSecondaryColor,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {announcement.about}
                  </Typography>
                </Box>
              </Grow>
            ))
          ) : (
            <Typography
              sx={{
                fontSize: "0.85rem",
                color: settings.textSecondaryColor,
                textAlign: "center",
                py: 2,
              }}
            >
              No announcements for this date
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const RecentActivity = ({ settings }) => {
  const activities = [
    {
      id: 1,
      user: "John Doe",
      action: "Processed payroll for June 2024",
      time: "2 minutes ago",
      icon: <PaymentsIcon />,
      color: settings.textPrimaryColor,
    },
    {
      id: 2,
      user: "Jane Smith",
      action: "Updated employee records",
      time: "15 minutes ago",
      icon: <Person />,
      color: settings.textPrimaryColor,
    },
    {
      id: 3,
      user: "Robert Johnson",
      action: "Generated monthly attendance report",
      time: "1 hour ago",
      icon: <Assessment />,
      color: settings.textPrimaryColor,
    },
    {
      id: 4,
      user: "Emily Davis",
      action: "New announcement posted: Company Holiday Schedule",
      time: "2 hours ago",
      icon: <CampaignIcon />,
      color: settings.textPrimaryColor,
    },
    {
      id: 5,
      user: "System",
      action: "Database backup completed successfully",
      time: "3 hours ago",
      icon: <CheckCircleIcon />,
      color: settings.textPrimaryColor,
    },
  ];

  return (
    <Card
      sx={{
        background: settings.accentColor,
        backdropFilter: "blur(15px)",
        border: `1px solid ${settings.primaryColor}26`,
        borderRadius: 4,
        boxShadow: `0 15px 40px ${settings.primaryColor}33`,
        height: 320,
      }}
    >
      <CardContent
        sx={{
          p: 1.5,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 1.5,
            color: settings.textPrimaryColor,
            fontSize: "0.85rem",
          }}
        >
          Recent Activity
        </Typography>
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          {activities.map((activity, index) => (
            <Grow in timeout={300 + index * 50} key={activity.id}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                  mb: 1.5,
                  p: 0.5,
                  borderRadius: 1,
                  transition: "all 0.2s",
                  "&:hover": {
                    background: `${settings.primaryColor}0A`,
                    transform: "translateX(2px)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${activity.color}1A`,
                    color: activity.color,
                    flexShrink: 0,
                  }}
                >
                  {React.cloneElement(activity.icon, { sx: { fontSize: 16 } })}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: settings.textPrimaryColor,
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {activity.action}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.6rem",
                      color: settings.textSecondaryColor,
                      mt: 0.25,
                    }}
                  >
                    {activity.user} • {activity.time}
                  </Typography>
                </Box>
              </Box>
            </Grow>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

const TaskList = ({ settings }) => {
  const [tasks, setTasks] = useState([]);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "medium" });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/tasks`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setTasks(res.data);
        }
      })
      .catch((err) => {
        console.error("Error fetching tasks:", err);
        setTasks([]);
      });
  }, []);

  const handleToggle = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/tasks/${id}/toggle`);
      setTasks(
        tasks.map((task) =>
          task.id === id ? { ...task, completed: !task.completed } : task
        )
      );
    } catch (err) {
      console.error("Error toggling task:", err);
    }
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
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${id}`);
      setTasks(tasks.filter((task) => task.id !== id));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case "high":
        return "Urgent";
      case "medium":
        return "Soon";
      case "low":
        return "Later";
      default:
        return priority;
    }
  };

  return (
    <>
      <Card
        sx={{
          background: settings.accentColor,
          backdropFilter: "blur(15px)",
          border: `1px solid ${settings.primaryColor}26`,
          borderRadius: 4,
          mb: 2,
          boxShadow: `0 15px 40px ${settings.primaryColor}33`,
          height: 270,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SuccessfulOverlay 
          open={showSuccess} 
          action="create" 
          onClose={() => setShowSuccess(false)} 
        />
        <CardContent
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: settings.textPrimaryColor,
                fontSize: "0.95rem",
              }}
            >
              Tasks
            </Typography>
            <IconButton
              size="small"
              onClick={() => setAddTaskOpen(true)}
              sx={{
                bgcolor: settings.textPrimaryColor,
                color: "#ffffff",
                "&:hover": { bgcolor: settings.hoverColor },
                width: 28,
                height: 28,
              }}
            >
              <Add fontSize="small" />
            </IconButton>
          </Box>

          {}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              pr: 1,
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-track": {
                background: `${settings.primaryColor}1A`,
                borderRadius: "3px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: `${settings.primaryColor}4D`,
                borderRadius: "3px",
                "&:hover": {
                  background: `${settings.primaryColor}80`,
                },
              },
            }}
          >
            <List dense sx={{ p: 0 }}>
              {Array.isArray(tasks) &&
                tasks.map((task) => (
                  <ListItem
                    key={task.id}
                    sx={{ p: 0, mb: 1, display: "flex", alignItems: "center" }}
                  >
                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggle(task.id)}
                      size="small"
                      sx={{
                        color: settings.textPrimaryColor,
                        "&.Mui-checked": { color: settings.textPrimaryColor },
                      }}
                    />
                    <ListItemText
                      primary={task.title}
                      primaryTypographyProps={{
                        sx: {
                          fontSize: "0.85rem",
                          color: task.completed
                            ? settings.textPrimaryColor
                            : settings.textPrimaryColor,
                          textDecoration: task.completed
                            ? "line-through"
                            : "none",
                        },
                      }}
                    />
                    <Chip
                      label={getPriorityLabel(task.priority)}
                      size="small"
                      sx={{
                        fontSize: "0.65rem",
                        height: 20,
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
                        mr: 1,
                      }}
                    />
                    {}
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(task.id)}
                      sx={{ color: settings.textPrimaryColor }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
            </List>
          </Box>
        </CardContent>
      </Card>

      {}
      <Dialog
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
            bgcolor: settings.accentColor,
            backdropFilter: "blur(12px)",
            border: `1px solid ${settings.primaryColor}26`,
            boxShadow: `0 15px 40px ${settings.primaryColor}33`,
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            fontSize: "1rem",
            fontWeight: 600,
            color: settings.textPrimaryColor,
          }}
        >
          Add New Task
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            fullWidth
            variant="outlined"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <Typography
            variant="body2"
            sx={{ mb: 1, color: settings.textSecondaryColor, fontWeight: 500 }}
          >
            Priority
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {["low", "medium", "high"].map((priority) => (
              <Button
                key={priority}
                variant={
                  newTask.priority === priority ? "contained" : "outlined"
                }
                size="small"
                onClick={() => setNewTask({ ...newTask, priority })}
                sx={{
                  textTransform: "capitalize",
                  borderRadius: 2,
                  borderColor:
                    priority === "high"
                      ? "#f44336"
                      : priority === "medium"
                      ? "#ff9800"
                      : "#4caf50",
                  color:
                    priority === "high"
                      ? "#f44336"
                      : priority === "medium"
                      ? "#ff9800"
                      : "#4caf50",
                  ...(newTask.priority === priority && {
                    bgcolor:
                      priority === "high"
                        ? "#f44336"
                        : priority === "medium"
                        ? "#ff9800"
                        : "#4caf50",
                    color: "#ffffff",
                    "&:hover": {
                      opacity: 0.9,
                    },
                  }),
                }}
              >
                {getPriorityLabel(priority)} {}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setAddTaskOpen(false)}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 500,
              color: "#FFFFFF",
              bgcolor: settings.primaryColor,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddTask}
            variant="contained"
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              bgcolor: settings.primaryColor,
              textTransform: "none",
              "&:hover": { bgcolor: settings.hoverColor },
            }}
          >
            Add Task
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const EventsList = ({ settings, employeeNumber }) => {
  const [events, setEvents] = useState([]);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    date: new Date().toISOString().split("T")[0],
    title: "",
    description: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!employeeNumber) return;

    const fetchEvents = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/events/${employeeNumber}`
        );
        setEvents(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching events:", err);
        setEvents([]);
      }
    };

    fetchEvents();
  }, [employeeNumber]);

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    try {
      const eventData = {
        employee_number: employeeNumber,
        date: newEvent.date,
        title: newEvent.title,
        description: newEvent.description || "",
      };

      const res = await axios.post(`${API_BASE_URL}/api/events`, eventData);
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

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/events/${id}`);
      setEvents(events.filter((event) => event.id !== id));
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isUpcoming = (dateStr) => {
    if (!dateStr) return false;
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  };

  const getEventStatus = (dateStr) => {
    if (!dateStr) return "past";
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() === today.getTime()) return "today";
    if (eventDate > today) return "upcoming";
    return "past";
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "upcoming":
        return "Upcoming";
      case "today":
        return "Today";
      case "past":
        return "Past";
      default:
        return status;
    }
  };

  return (
    <>
      <Card
        sx={{
          background: settings.accentColor,
          backdropFilter: "blur(15px)",
          border: `1px solid ${settings.primaryColor}26`,
          borderRadius: 4,
          mb: 2,
          boxShadow: `0 15px 40px ${settings.primaryColor}33`,
          height: 270,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SuccessfulOverlay 
          open={showSuccess} 
          action="create" 
          onClose={() => setShowSuccess(false)} 
        />
        <CardContent
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: settings.textPrimaryColor,
                fontSize: "0.95rem",
              }}
            >
              Events
            </Typography>
            <IconButton
              size="small"
              onClick={() => setAddEventOpen(true)}
              sx={{
                bgcolor: settings.textPrimaryColor,
                color: "#ffffff",
                "&:hover": { bgcolor: settings.hoverColor },
                width: 28,
                height: 28,
              }}
            >
              <Add fontSize="small" />
            </IconButton>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              pr: 1,
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-track": {
                background: `${settings.primaryColor}1A`,
                borderRadius: "3px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: `${settings.primaryColor}4D`,
                borderRadius: "3px",
                "&:hover": {
                  background: `${settings.primaryColor}80`,
                },
              },
            }}
          >
            <List dense sx={{ p: 0 }}>
              {Array.isArray(events) && events.length > 0 ? (
                events.map((event) => {
                  const status = getEventStatus(event.date);
                  return (
                    <ListItem
                      key={event.id}
                      sx={{
                        p: 0,
                        mb: 1,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Event
                        sx={{
                          fontSize: 18,
                          color:
                            status === "upcoming"
                              ? "#4caf50"
                              : status === "today"
                              ? "#ff9800"
                              : settings.textPrimaryColor,
                          mr: 1,
                          flexShrink: 0,
                        }}
                      />
                      <ListItemText
                        primary={event.title}
                        secondary={formatDate(event.date)}
                        primaryTypographyProps={{
                          sx: {
                            fontSize: "0.85rem",
                            color: settings.textPrimaryColor,
                          },
                        }}
                        secondaryTypographyProps={{
                          sx: {
                            fontSize: "0.7rem",
                            color: settings.textPrimaryColor,
                          },
                        }}
                      />
                      <Chip
                        label={getStatusLabel(status)}
                        size="small"
                        sx={{
                          fontSize: "0.65rem",
                          height: 20,
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
                          mr: 1,
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(event.id)}
                        sx={{ color: settings.textPrimaryColor }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItem>
                  );
                })
              ) : (
                <Typography
                  sx={{
                    fontSize: "0.85rem",
                    color: settings.textSecondaryColor,
                    textAlign: "center",
                    py: 2,
                  }}
                >
                  No events yet
                </Typography>
              )}
            </List>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={addEventOpen}
        onClose={() => setAddEventOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
            bgcolor: settings.accentColor,
            backdropFilter: "blur(12px)",
            border: `1px solid ${settings.primaryColor}26`,
            boxShadow: `0 15px 40px ${settings.primaryColor}33`,
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            fontSize: "1rem",
            fontWeight: 600,
            color: settings.textPrimaryColor,
          }}
        >
          Add New Event
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Event Title"
            fullWidth
            variant="outlined"
            value={newEvent.title}
            onChange={(e) =>
              setNewEvent({ ...newEvent, title: e.target.value })
            }
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            margin="dense"
            label="Event Date"
            type="date"
            fullWidth
            variant="outlined"
            value={newEvent.date}
            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newEvent.description}
            onChange={(e) =>
              setNewEvent({ ...newEvent, description: e.target.value })
            }
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setAddEventOpen(false)}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 500,
              color: "#FFFFFF",
              bgcolor: settings.primaryColor,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddEvent}
            variant="contained"
            startIcon={<Save />}
            disabled={!newEvent.title.trim() || !newEvent.date}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              bgcolor: settings.primaryColor,
              textTransform: "none",
              "&:hover": { bgcolor: settings.hoverColor },
              "&:disabled": {
                bgcolor: `${settings.primaryColor}66`,
                color: "#ffffff",
              },
            }}
          >
            Save Event
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Modified QuickActions component to filter out Audit Logs for non-superadmins
const QuickActions = ({ settings, userRole }) => {
  const isSuperAdmin = userRole === "superadmin" || userRole === "technical";

  // Filter out Audit Logs if user is not a superadmin
  const filteredActions = QUICK_ACTIONS(settings).filter(
    (action) => !action.restricted || isSuperAdmin
  );

  return (
    <Card
      sx={{
        background: settings.accentColor,
        backdropFilter: "blur(15px)",
        border: `1px solid ${settings.primaryColor}26`,
        borderRadius: 4,
        boxShadow: `0 15px 40px ${settings.primaryColor}33`,
        height: 260,
      }}
    >
      <CardContent
        sx={{
          p: 1.5,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 1.5,
            color: settings.textPrimaryColor,
            fontSize: "0.85rem",
          }}
        >
          Admin Panel
        </Typography>
        <Grid container spacing={1}>
          {filteredActions.map((item, i) => (
            <Grid item xs={4} key={i}>
              <Grow in timeout={400 + i * 50}>
                <Link to={item.link} style={{ textDecoration: "none" }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      background: `${settings.primaryColor}0A`,
                      border: `1px solid ${settings.primaryColor}26`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0.5,
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
                      {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        color: settings.textPrimaryColor,
                        textAlign: "center",
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                </Link>
              </Grow>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

const UpgradeCard = ({ settings }) => (
  <Card
    sx={{
      background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
      borderRadius: 4,
      p: 2,
      mt: 2,
      color: "#ffffff",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <Box sx={{ position: "absolute", top: -20, right: -20, opacity: 0.1 }}>
      <Lock sx={{ fontSize: 120 }} />
    </Box>
    <Box sx={{ position: "relative", zIndex: 1 }}>
      <Typography
        variant="h6"
        sx={{ fontWeight: 700, mb: 1, fontSize: "0.95rem" }}
      >
        HR Analytics Pro
      </Typography>
      <Typography
        variant="body2"
        sx={{ mb: 2, fontSize: "0.75rem", opacity: 0.9 }}
      >
        Unlock advanced payroll analytics and reporting
      </Typography>
      <Button
        variant="contained"
        size="small"
        endIcon={<Upgrade />}
        sx={{
          background: "#ffffff",
          color: settings.textPrimaryColor,
          fontWeight: 600,
          fontSize: "0.75rem",
          px: 2,
          py: 0.5,
          "&:hover": {
            background: "#f5f5f5",
            transform: "translateY(-1px)",
          },
        }}
      >
        Upgrade Now
      </Button>
    </Box>
  </Card>
);

const LogoutDialog = ({ open, settings }) => (
  <Dialog
    open={open}
    fullScreen
    PaperProps={{
      sx: { backgroundColor: "transparent", boxShadow: "none" },
    }}
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
            boxShadow: `0 0 15px ${settings.primaryColor}, 0 0 8px ${settings.accentColor}`,
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
            boxShadow: `0 0 40px ${settings.primaryColor}, 0 0 80px ${settings.primaryColor}`,
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
              boxShadow: `0 0 20px ${settings.primaryColor}, 0 0 10px ${settings.accentColor}`,
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
          textShadow: `0 0 10px ${settings.primaryColor}`,
          animation: "pulse 1.5s infinite",
        }}
      >
        Signing out...
      </Typography>

      <Box
        component="style"
        children={`
          @keyframes heartbeat {
            0%,100% { transform: scale(1); }
            25%,75% { transform: scale(1.15); }
            50% { transform: scale(1.05); }
          }
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
          @keyframes floatSphere {
            0% { transform: translate(-50%, -50%) translateY(0); }
            50% { transform: translate(-50%, -50%) translateY(-15px); }
            100% { transform: translate(-50%, -50%) translateY(0); }
          }
          @keyframes orbit0 { 0% { transform: rotate(0deg) translateX(60px); } 100% { transform: rotate(360deg) translateX(60px); } }
          @keyframes orbit1 { 0% { transform: rotate(90deg) translateX(60px); } 100% { transform: rotate(450deg) translateX(60px); } }
          @keyframes orbit2 { 0% { transform: rotate(180deg) translateX(60px); } 100% { transform: rotate(540deg) translateX(60px); } }
          @keyframes orbit3 { 0% { transform: rotate(270deg) translateX(60px); } 100% { transform: rotate(630deg) translateX(60px); } }
        `}
      />
    </Box>
  </Dialog>
);

const AdminHome = () => {
  const { username, fullName, employeeNumber, profilePicture } = useAuth();
  const settings = useSystemSettings();
  const { socket, connected } = useSocket();
  const lastNotifFetchEmpRef = useRef(null);
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
  } = useDashboardData(settings);

  // Only show in carousel when today is within the item's date range
  const todayInRange = (start, end, fallbackDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    const fb = fallbackDate ? new Date(fallbackDate) : null;
    if (s) s.setHours(0, 0, 0, 0);
    if (e) e.setHours(0, 0, 0, 0);
    if (fb) fb.setHours(0, 0, 0, 0);
    if (s && e) return today >= s && today <= e;
    if (s && !e) return today >= s;
    if (!s && e) return today <= e;
    if (fb) return today >= fb;
    return false;
  };
  // Show holidays when: status is active AND (today in range OR not yet ended); fallback to recent
  let scheduledHolidaysForCarousel = (rawHolidays || [])
    .filter((h) => (h.status || "").toLowerCase() === "active")
    .filter((h) => {
      if (todayInRange(h.date_start, h.date_end, h.date)) return true;
      const endDate = h.date_end || h.date;
      if (!endDate) return true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      return today <= end;
    })
    .map((h) => ({
      id: `holiday-${h.id}`,
      title: h.title || h.description || "",
      about: h.about || "Official holiday.",
      date: h.date_start || h.date_end || h.date,
      date_start: h.date_start || h.date,
      date_end: h.date_end || h.date,
      image: h.image || null,
    }));
  if (scheduledHolidaysForCarousel.length === 0 && Array.isArray(rawHolidays) && rawHolidays.length > 0) {
    const active = rawHolidays.filter((h) => (h.status || "").toLowerCase() === "active");
    scheduledHolidaysForCarousel = active
      .slice()
      .sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date))
      .slice(0, 10)
      .map((h) => ({
        id: `holiday-${h.id}`,
        title: h.title || h.description || "",
        about: h.about || "Official holiday.",
        date: h.date_start || h.date_end || h.date,
        date_start: h.date_start || h.date,
        date_end: h.date_end || h.date,
        image: h.image || null,
      }));
  }
  // Show announcements when: today is in range OR announcement hasn't ended yet (date_end >= today)
  // This ensures single-date and past-range announcements still show until end date
  let announcementsInRange = (announcements || []).filter((a) => {
    if (todayInRange(a.date_start, a.date_end, a.date)) return true;
    const endDate = a.date_end || a.date;
    if (!endDate) return true; // no end date: include so something shows
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return today <= end; // still "active" (not yet ended)
  });
  // Fallback: if no announcements pass the filter, show most recent so carousel isn't empty
  if (announcementsInRange.length === 0 && Array.isArray(announcements) && announcements.length > 0) {
    announcementsInRange = announcements
      .slice()
      .sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date))
      .slice(0, 10);
  }
  // Show suspensions when: today is in range OR suspension hasn't ended yet; fallback to recent
  let suspensionsInRange = (suspensions || []).filter((s) => {
    if (todayInRange(s.date_start, s.date_end, s.date)) return true;
    const endDate = s.date_end || s.date;
    if (!endDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return today <= end;
  });
  if (suspensionsInRange.length === 0 && Array.isArray(suspensions) && suspensions.length > 0) {
    suspensionsInRange = suspensions
      .slice()
      .sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date))
      .slice(0, 10);
  }
  const suspensionsForCarousel = suspensionsInRange.map((s) => ({
    id: `suspension-${s.id}`,
    title: s.title || "",
    about: s.about || "",
    date: s.date_start || s.date_end || s.date,
    date_start: s.date_start || s.date,
    date_end: s.date_end || s.date,
    image: s.image || null,
  }));
  const carouselItems = [
    ...scheduledHolidaysForCarousel,
    ...suspensionsForCarousel,
    ...announcementsInRange,
  ].sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date));

  const {
    currentSlide,
    isPlaying,
    handlePrevSlide,
    handleNextSlide,
    handleSlideSelect,
    togglePlayPause,
  } = useCarousel(carouselItems);
  const currentTime = useTime();

  // Add user role state
  const [userRole, setUserRole] = useState(null);

  // Check if user is superadmin
  const isSuperAdmin = userRole === "superadmin" || userRole === "technical";

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [openModal, setOpenModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcementDetails, setAnnouncementDetails] = useState({}); // Store announcement details by notification id

  // Add state for selected date in calendar
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const openMenu = Boolean(anchorEl);
  const navigate = useNavigate();

  // Get user role on component mount
  useEffect(() => {
    const role = getUserRole();
    setUserRole(role);
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

  const radialAttendanceData = Array.isArray(attendanceChartData)
    ? attendanceChartData.map((item, idx) => ({
        ...item,
        fill: COLORS(settings)[idx % COLORS(settings).length],
      }))
    : [];

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!employeeNumber) {
        console.log("No employeeNumber, skipping notification fetch");
        return;
      }

      // Ensure employeeNumber is a string
      const empNum = String(employeeNumber).trim();
      if (!empNum) return;

      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        console.log(`Fetching notifications for employeeNumber: ${empNum}`);
        const [notifRes, unreadRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/notifications/${empNum}`, { headers }),
          axios.get(
            `${API_BASE_URL}/api/notifications/${empNum}/unread-count`,
            { headers }
          ),
        ]);

        // Filter notifications to ensure they belong to logged-in employee
        const filteredNotifications = Array.isArray(notifRes.data)
          ? notifRes.data.filter(
              (notif) => String(notif.employeeNumber).trim() === empNum
            )
          : [];

        console.log(
          `Found ${filteredNotifications.length} notifications for employee ${empNum}`
        );
        setNotifications(filteredNotifications);
        setUnreadCount(unreadRes.data?.count || 0);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    // Initial load for this user (avoid re-fetch just because socket connects)
    if (employeeNumber && lastNotifFetchEmpRef.current !== employeeNumber) {
      lastNotifFetchEmpRef.current = employeeNumber;
      fetchNotifications();
    }

    // Real-time: refresh notifications when server emits an event to this user room
    const onNotificationCreated = (payload) => {
      console.log(" Notification received via Socket.IO:", payload);
      fetchNotifications();
    };

    if (socket && connected) {
      socket.on("notificationCreated", onNotificationCreated);
    }

    return () => {
      if (socket) {
        socket.off("notificationCreated", onNotificationCreated);
      }
    };
  }, [employeeNumber, socket, connected]);

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (notification.read_status === 0) {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        await axios.put(
          `${API_BASE_URL}/api/notifications/${notification.id}/read`,
          {},
          { headers }
        );
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read_status: 1 } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }

    // Handle based on notification type
    if (
      notification.notification_type === "payslip" ||
      (notification.action_link && notification.action_link.includes("payslip"))
    ) {
      setNotifModalOpen(false);
      navigate("/payslip");
    } else if (
      notification.notification_type === "contact" ||
      (notification.action_link &&
        notification.action_link.includes("settings"))
    ) {
      setNotifModalOpen(false);
      navigate("/settings");
    } else if (
      notification.notification_type === "announcement" ||
      (notification.action_link &&
        notification.action_link.includes("announcement"))
    ) {
      // Fetch announcement details
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const annRes = await axios.get(`${API_BASE_URL}/api/announcements`, {
          headers,
        });
        const announcementList = Array.isArray(annRes.data) ? annRes.data : [];

        // Try to find by announcement_id first, then fallback to title matching
        let matchingAnnouncement = null;
        if (notification.announcement_id) {
          matchingAnnouncement = announcementList.find(
            (ann) =>
              ann.id === notification.announcement_id ||
              ann.id === parseInt(notification.announcement_id)
          );
        }

        // If not found by ID, try to get from announcementDetails state
        if (!matchingAnnouncement && notification.announcement_id) {
          const cachedAnnouncement = announcementDetails[notification.id];
          if (cachedAnnouncement) {
            matchingAnnouncement = cachedAnnouncement;
          }
        }

        // If still not found, get the most recent announcement
        if (!matchingAnnouncement && announcementList.length > 0) {
          matchingAnnouncement = announcementList[0]; // Most recent
        }

        if (matchingAnnouncement) {
          setNotifModalOpen(false);
          setSelectedAnnouncement(matchingAnnouncement);
          setOpenModal(true);
        } else {
          // If not found, just close notification modal
          setNotifModalOpen(false);
        }
      } catch (err) {
        console.error("Error fetching announcement:", err);
        setNotifModalOpen(false);
      }
    } else if (notification.notification_type === "holiday") {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const holidayRes = await axios.get(`${API_BASE_URL}/holiday`, { headers });
        const holidayList = Array.isArray(holidayRes.data) ? holidayRes.data : [];
        let matchingHoliday = null;
        if (holidayList.length > 0) {
          matchingHoliday = holidayList[0]; // Most recent
        }
        if (matchingHoliday) {
          const holidayItem = {
            id: `holiday-${matchingHoliday.id}`,
            title: matchingHoliday.title || matchingHoliday.description || "",
            about: matchingHoliday.about || "Official holiday.",
            date: matchingHoliday.date_start || matchingHoliday.date_end || matchingHoliday.date,
            date_start: matchingHoliday.date_start || matchingHoliday.date,
            date_end: matchingHoliday.date_end || matchingHoliday.date,
            image: matchingHoliday.image || null,
          };
          setNotifModalOpen(false);
          setSelectedAnnouncement(holidayItem);
          setOpenModal(true);
        } else {
          setNotifModalOpen(false);
        }
      } catch (err) {
        console.error("Error fetching holiday:", err);
        setNotifModalOpen(false);
      }
    } else if (notification.notification_type === "suspension") {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const suspRes = await axios.get(`${API_BASE_URL}/api/suspensions`, { headers });
        const suspensionList = Array.isArray(suspRes.data) ? suspRes.data : [];
        let matchingSuspension = null;
        if (suspensionList.length > 0) {
          matchingSuspension = suspensionList[0]; // Most recent
        }
        if (matchingSuspension) {
          const suspensionItem = {
            id: `suspension-${matchingSuspension.id}`,
            title: matchingSuspension.title || "",
            about: matchingSuspension.about || "",
            date: matchingSuspension.date_start || matchingSuspension.date_end || matchingSuspension.date,
            date_start: matchingSuspension.date_start || matchingSuspension.date,
            date_end: matchingSuspension.date_end || matchingSuspension.date,
            image: matchingSuspension.image || null,
          };
          setNotifModalOpen(false);
          setSelectedAnnouncement(suspensionItem);
          setOpenModal(true);
        } else {
          setNotifModalOpen(false);
        }
      } catch (err) {
        console.error("Error fetching suspension:", err);
        setNotifModalOpen(false);
      }
    } else if (notification.action_link) {
      setNotifModalOpen(false);
      navigate(notification.action_link);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "90%",
        py: 2,
        borderRadius: "14px",
        mt: -2,
        width: "100vw",
        mx: "auto",
        maxWidth: "100%",
        overflow: "hidden",
        position: "relative",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      <Box sx={{ pt: 4, px: 6, mx: "auto", maxWidth: "1600px" }}>
        <Grow in timeout={300}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
              background: settings.accentColor,
              backdropFilter: "blur(15px)",
              borderRadius: 4,
              p: 2,
              border: `1px solid ${settings.secondaryColor}`,
              boxShadow: `0 15px 40px ${settings.primaryColor}33`,
              mt: -5,
            }}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: settings.textPrimaryColor,
                  fontWeight: 700,
                }}
              >
                Hello, {fullName || username}!
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: settings.textPrimaryColor,
                  mt: 0.25,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <AccessTimeIcon sx={{ fontSize: 14 }} />
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                <span style={{ marginLeft: "8px" }}>
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <Tooltip title="Refresh">
                <IconButton
                  size="small"
                  sx={{
                    bgcolor: `${settings.primaryColor}1A`,
                    "&:hover": { bgcolor: `${settings.primaryColor}33` },
                    color: settings.textPrimaryColor,
                  }}
                  onClick={() => window.location.reload()}
                >
                  <AutorenewIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Notifications">
                <IconButton
                  size="small"
                  sx={{
                    bgcolor: `${settings.primaryColor}1A`,
                    "&:hover": { bgcolor: `${settings.primaryColor}33` },
                    color: settings.textPrimaryColor,
                  }}
                  onClick={async () => {
                    // Immediately fetch latest notifications when opening modal
                    if (employeeNumber) {
                      try {
                        const empNum = String(employeeNumber).trim();
                        const token = localStorage.getItem("token");
                        const headers = token
                          ? { Authorization: `Bearer ${token}` }
                          : {};
                        const [notifRes, unreadRes] = await Promise.all([
                          axios.get(
                            `${API_BASE_URL}/api/notifications/${empNum}`,
                            { headers }
                          ),
                          axios.get(
                            `${API_BASE_URL}/api/notifications/${empNum}/unread-count`,
                            { headers }
                          ),
                        ]);

                        // Filter notifications to ensure they belong to logged-in employee
                        const filteredNotifications = Array.isArray(
                          notifRes.data
                        )
                          ? notifRes.data.filter(
                              (notif) =>
                                String(notif.employeeNumber).trim() === empNum
                            )
                          : [];

                        setNotifications(filteredNotifications);
                        setUnreadCount(unreadRes.data?.count || 0);
                      } catch (err) {
                        console.error("Error fetching notifications:", err);
                      }
                    }
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
                    src={profilePicture ? buildImageUrl(profilePicture) : undefined}
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
                    backgroundColor: settings.accentColor,
                    border: `1px solid ${settings.primaryColor}26`,
                    boxShadow: `0 15px 40px ${settings.primaryColor}33`,
                    "& .MuiMenuItem-root": {
                      fontSize: "0.875rem",
                      color: settings.textPrimaryColor,
                      "&:hover": {
                        background: `${settings.primaryColor}0A`,
                      },
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
                    sx={{
                      mr: 1,
                      fontSize: 20,
                      color: settings.textPrimaryColor,
                    }}
                  />{" "}
                  Profile
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/settings");
                  }}
                >
                  <Settings
                    sx={{
                      mr: 1,
                      fontSize: 20,
                      color: settings.textPrimaryColor,
                    }}
                  />{" "}
                  Settings
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/faqs");
                  }}
                >
                  <HelpOutline
                    sx={{
                      mr: 1,
                      fontSize: 20,
                      color: settings.textPrimaryColor,
                    }}
                  />{" "}
                  FAQs
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/privacy-policy");
                  }}
                >
                  <PrivacyTip
                    sx={{
                      mr: 1,
                      fontSize: 20,
                      color: settings.textPrimaryColor,
                    }}
                  />{" "}
                  Privacy Policy
                </MenuItem>
                <Divider sx={{ borderColor: `${settings.primaryColor}26` }} />
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    handleLogout();
                  }}
                >
                  <Logout
                    sx={{
                      mr: 1,
                      fontSize: 20,
                      color: settings.textPrimaryColor,
                    }}
                  />{" "}
                  Sign Out
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Grow>

        {}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "nowrap",
            gap: 1,
            pb: 3,
          }}
        >
          {STAT_CARDS(settings).map((card, index) => (
            <Box
              key={card.label}
              sx={{
                flex: "1 1 0",
                maxWidth: "19%",
                minWidth: "140px",
              }}
            >
              <CompactStatCard
                card={card}
                index={index}
                stats={stats}
                loading={loading}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
                settings={settings}
              />
            </Box>
          ))}
        </Box>

        {}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={7}>
            <AnnouncementCarousel
              announcements={carouselItems}
              currentSlide={currentSlide}
              isPlaying={isPlaying}
              handlePrevSlide={handlePrevSlide}
              handleNextSlide={handleNextSlide}
              handleSlideSelect={handleSlideSelect}
              togglePlayPause={togglePlayPause}
              handleOpenModal={handleOpenModal}
              settings={settings}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            {}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <CompactCalendar
                  calendarDate={calendarDate}
                  setCalendarDate={setCalendarDate}
                  holidays={holidays}
                  announcements={announcements} // Pass announcements to the calendar
                  settings={settings}
                  setSelectedDate={setSelectedDate} // Pass setSelectedDate to the calendar
                />
              </Grid>
              <Grid item xs={6}>
                <QuickActions settings={settings} userRole={userRole} />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TaskList settings={settings} />
              </Grid>
              <Grid item xs={6}>
                <EventsList
                  settings={settings}
                  employeeNumber={employeeNumber}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>

      <Modal open={openModal} onClose={handleCloseModal}>
        <Fade in={openModal}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              maxWidth: 800,
              bgcolor: settings.accentColor,
              backdropFilter: "blur(40px)",
              border: `1px solid ${settings.primaryColor}26`,
              boxShadow: `0 24px 64px ${settings.primaryColor}4D`,
              borderRadius: 4,
              overflow: "hidden",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {selectedAnnouncement && (
              <>
                <Box sx={{ position: "relative" }}>
                  {selectedAnnouncement.image && (
                    <Box
                      component="img"
                      src={buildImageUrl(selectedAnnouncement.image)}
                      alt={selectedAnnouncement.title}
                      sx={{ width: "100%", height: 350, objectFit: "cover" }}
                    />
                  )}
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0, 0, 0, 0.7) 100%)",
                    }}
                  />
                  <IconButton
                    onClick={handleCloseModal}
                    sx={{
                      position: "absolute",
                      top: 20,
                      right: 20,
                      bgcolor: `${settings.primaryColor}4D`,
                      backdropFilter: "blur(10px)",
                      border: `1px solid ${settings.primaryColor}26`,
                      color: "#ffffff",
                      "&:hover": {
                        bgcolor: `${settings.primaryColor}80`,
                        transform: "rotate(90deg)",
                      },
                      transition: "all 0.3s",
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Box sx={{ p: 4, overflowY: "auto" }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      mb: 2,
                      color: settings.textPrimaryColor,
                    }}
                  >
                    {selectedAnnouncement.title}
                  </Typography>
                  <Chip
                    icon={
                      <AccessTimeIcon
                        style={{ color: settings.textPrimaryColor }}
                      />
                    }
                    label={new Date(
                      selectedAnnouncement.date
                    ).toLocaleDateString()}
                    sx={{
                      mb: 3,
                      bgcolor: `${settings.primaryColor}1A`,
                      color: settings.textPrimaryColor,
                      border: `1px solid ${settings.primaryColor}26`,
                    }}
                  />
                  <Typography
                    variant="body1"
                    sx={{
                      color: settings.textPrimaryColor,
                      lineHeight: 1.8,
                      fontSize: "1.05rem",
                    }}
                  >
                    {selectedAnnouncement.about}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Fade>
      </Modal>

      <Modal open={notifModalOpen} onClose={() => setNotifModalOpen(false)}>
        <Fade in={notifModalOpen}>
          <Box
            sx={{
              position: "absolute",
              top: 100,
              right: 24,
              width: 420,
              maxWidth: "90vw",
              bgcolor: settings.accentColor,
              backdropFilter: "blur(40px)",
              border: `1px solid ${settings.primaryColor}26`,
              boxShadow: `0 24px 64px ${settings.primaryColor}4D`,
              borderRadius: 4,
              overflow: "hidden",
              maxHeight: "calc(100vh - 140px)",
            }}
          >
            <Box
              sx={{
                p: 3,
                borderBottom: `1px solid ${settings.primaryColor}26`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: `linear-gradient(135deg, ${settings.primaryColor}1A 0%, ${settings.secondaryColor}0D 100%)`,
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: settings.textPrimaryColor }}
              >
                Notifications
              </Typography>
              <IconButton
                size="small"
                onClick={() => setNotifModalOpen(false)}
                sx={{
                  color: settings.textPrimaryColor,
                  "&:hover": {
                    bgcolor: `${settings.primaryColor}1A`,
                    transform: "rotate(90deg)",
                  },
                  transition: "all 0.3s",
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            <Box
              sx={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto", p: 2 }}
            >
              {/* System Notifications (Payslip, Announcements, etc.) */}
              {Array.isArray(notifications) &&
                notifications.slice(0, 10).map((notif, idx) => {
                  const announcement =
                    notif.notification_type === "announcement"
                      ? announcementDetails[notif.id]
                      : null;

                  // For announcement notifications, show full image with overlaid title
                  if (
                    notif.notification_type === "announcement" &&
                    announcement
                  ) {
                    return (
                      <Grow
                        in
                        timeout={300 + idx * 50}
                        key={`notif-${notif.id}`}
                      >
                        <Box
                          sx={{
                            mb: 2,
                            borderRadius: 3,
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            boxShadow: `0 2px 8px ${settings.primaryColor}33`,
                            opacity: notif.read_status === 1 ? 0.7 : 1,
                            position: "relative",
                            height: 200,
                            "&:hover": {
                              transform: "translateY(-4px)",
                              boxShadow: `0 8px 24px ${settings.primaryColor}4D`,
                              opacity: 1,
                            },
                          }}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <Box
                            component="img"
                            src={
                              announcement.image
                                ? buildImageUrl(announcement.image)
                                : "/api/placeholder/400/200"
                            }
                            alt={announcement.title}
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background:
                                "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
                              p: 2,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 0.5,
                              }}
                            >
                              <Flag
                                sx={{
                                  color: "#ff69b4",
                                  fontSize: 18,
                                }}
                              />
                              <Typography
                                fontSize="0.75rem"
                                sx={{
                                  color: "#fff",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.5,
                                }}
                              >
                                New Announcement
                              </Typography>
                            </Box>
                            <Typography
                              fontWeight={700}
                              fontSize="1.1rem"
                              sx={{
                                color: "#fff",
                                mb: 0.5,
                                lineHeight: 1.3,
                                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                              }}
                            >
                              {announcement.title}
                            </Typography>
                            <Typography
                              fontSize="0.75rem"
                              sx={{
                                color: "rgba(255,255,255,0.9)",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <AccessTimeIcon sx={{ fontSize: 12 }} />
                              {notif.created_at
                                ? new Date(notif.created_at).toLocaleDateString(
                                    "en-GB",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    }
                                  )
                                : ""}
                            </Typography>
                          </Box>
                        </Box>
                      </Grow>
                    );
                  }

                  // For other notifications (payslip, etc.), use the regular style
                  return (
                    <Grow in timeout={300 + idx * 50} key={`notif-${notif.id}`}>
                      <Box
                        sx={{
                          mb: 2,
                          p: 2.5,
                          borderRadius: 3,
                          background:
                            notif.read_status === 0
                              ? notif.notification_type === "payslip"
                                ? "rgba(76, 175, 80, 0.1)"
                                : notif.notification_type === "contact"
                                ? "rgba(255, 152, 0, 0.1)"
                                : notif.notification_type === "holiday"
                                ? "rgba(237, 108, 2, 0.1)"
                                : notif.notification_type === "suspension"
                                ? "rgba(211, 47, 47, 0.1)"
                                : `${settings.primaryColor}1A`
                              : `${settings.primaryColor}0A`,
                          border: `1px solid ${settings.primaryColor}26`,
                          borderLeft:
                            notif.read_status === 0
                              ? notif.notification_type === "payslip"
                                ? "4px solid #4caf50"
                                : notif.notification_type === "contact"
                                ? "4px solid #ff9800"
                                : notif.notification_type === "holiday"
                                ? "4px solid #ed6c02"
                                : notif.notification_type === "suspension"
                                ? "4px solid #d32f2f"
                                : `4px solid ${settings.primaryColor}`
                              : `1px solid ${settings.primaryColor}26`,
                          cursor: "pointer",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          position: "relative",
                          overflow: "hidden",
                          "&:hover": {
                            background: `${settings.primaryColor}1A`,
                            transform: "translateX(8px)",
                            boxShadow: `0 8px 24px ${settings.primaryColor}33`,
                          },
                        }}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background:
                                notif.notification_type === "payslip"
                                  ? `linear-gradient(135deg, #4caf50, #2e7d32)`
                                  : notif.notification_type === "contact"
                                  ? `linear-gradient(135deg, #ff9800, #f57c00)`
                                  : notif.notification_type === "holiday"
                                  ? `linear-gradient(135deg, #ed6c02, #e65100)`
                                  : notif.notification_type === "suspension"
                                  ? `linear-gradient(135deg, #d32f2f, #b71c1c)`
                                  : `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                              mt: 0.5,
                              flexShrink: 0,
                              boxShadow: `0 0 12px ${settings.primaryColor}99`,
                              opacity: notif.read_status === 0 ? 1 : 0.5,
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: "1rem",
                                color: settings.textPrimaryColor,
                                mb: 0.5,
                                lineHeight: 1.4,
                              }}
                            >
                              {notif.notification_type === "payslip"
                                ? "Payslip Available"
                                : notif.notification_type === "contact"
                                ? "New Ticket"
                                : notif.notification_type === "holiday"
                                ? "New Holiday"
                                : notif.notification_type === "suspension"
                                ? "New Suspension"
                                : "Notification"}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.85rem",
                                color: settings.textPrimaryColor,
                                mb: 0.5,
                              }}
                            >
                              {notif.description}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.8rem",
                                color: settings.textPrimaryColor,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <AccessTimeIcon sx={{ fontSize: 14 }} />
                              {notif.created_at
                                ? new Date(notif.created_at).toLocaleDateString(
                                    "en-GB",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    }
                                  )
                                : ""}
                            </Typography>
                          </Box>
                          <ArrowForward
                            sx={{
                              color: settings.textPrimaryColor,
                              fontSize: 20,
                              transition: "transform 0.3s",
                              mt: 0.5,
                              flexShrink: 0,
                            }}
                          />
                        </Box>
                      </Box>
                    </Grow>
                  );
                })}
              {(!Array.isArray(notifications) ||
                notifications.length === 0) && (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <NotificationsIcon
                    sx={{ fontSize: 80, color: `${settings.primaryColor}33` }}
                  />
                  <Typography
                    sx={{
                      color: settings.textSecondaryColor,
                      fontSize: "1rem",
                    }}
                  >
                    No notifications at the moment
                  </Typography>
                  <Typography
                    sx={{
                      color: settings.textSecondaryColor,
                      fontSize: "0.85rem",
                      mt: 1,
                    }}
                  >
                    You're all caught up!
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>

      <LogoutDialog open={logoutOpen} settings={settings} />
    </Box>
  );
};

export default AdminHome;
