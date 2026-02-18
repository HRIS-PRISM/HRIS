import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container, Box, Grid, Dialog, Typography, Avatar, Button, IconButton, Tooltip, Modal, Badge, Paper, Card, CardContent, LinearProgress, Chip, Fade, Grow, Skeleton, Menu, MenuItem, Divider, List, ListItem, ListItemText, ListItemIcon, Checkbox, Tab, Tabs, TextField, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel,
} from "@mui/material";
import {
  Notifications as NotificationsIcon, ArrowDropDown as ArrowDropDownIcon, AccessTime, Receipt, ContactPage, UploadFile, Person, GroupAdd, TransferWithinAStation, Group, Pages, ReceiptLong, AcUnit, TrendingUp, TrendingDown, ArrowForward, PlayArrow, Pause, MoreVert,
  AccountCircle, Settings, HelpOutline, PrivacyTip, Logout, Event, Schedule, Lock, Star, Upgrade, Add, Close, Money, Work, Assessment, Timeline, Delete, Edit, Build,
  PersonAdd, Info, Lightbulb
} from "@mui/icons-material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
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
  History
} from "@mui/icons-material";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend, LineChart, Line, Area, AreaChart, RadialBarChart, RadialBar,
} from "recharts";
import logo from "../assets/logo.PNG";
import SuccessfulOverlay from "./SuccessfulOverlay";

// Enhanced Custom Tooltip Component with tutorial-style information
const CustomTooltip = ({ children, title, description, steps, link, settings, tooltipsEnabled, ...props }) => {
  if (!tooltipsEnabled) {
    return <>{children}</>;
  }
  
  return (
    <Tooltip 
      title={
        <Box sx={{ maxWidth: 320 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Info sx={{ fontSize: 16 }} />
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" sx={{ mb: 1, fontSize: '0.8rem', lineHeight: 1.4 }}>
              {description}
            </Typography>
          )}
          {steps && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Lightbulb sx={{ fontSize: 14 }} />
                How to use:
              </Typography>
              {steps.map((step, index) => (
                <Typography key={index} variant="body2" sx={{ ml: 1, fontSize: '0.75rem', lineHeight: 1.3 }}>
                  {index + 1}. {step}
                </Typography>
              ))}
            </Box>
          )}
          {link && (
            <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block', mt: 1, opacity: 0.9 }}>
              📚 Learn more: {link}
            </Typography>
          )}
        </Box>
      } 
      arrow 
      placement="top"
      componentsProps={{
        tooltip: {
          sx: {
            backgroundColor: settings.primaryColor,
            color: settings.accentColor,
            fontSize: '0.8rem',
            fontWeight: 500,
            padding: '12px 16px',
            borderRadius: '8px',
            maxWidth: '350px',
            '& .MuiTooltip-arrow': {
              color: settings.primaryColor,
            }
          }
        }
      }}
      {...props}
    >
      {children}
    </Tooltip>
  );
};

const useSystemSettings = () => {
  const [settings, setSettings] = useState({
    primaryColor: '#894444',
    secondaryColor: '#6d2323',
    accentColor: '#FEF9E1',
    textColor: '#FFFFFF',
    textPrimaryColor: '#6D2323', 
    textSecondaryColor: '#FEF9E1', 
    hoverColor: '#6D2323',
    backgroundColor: '#FFFFFF',
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem('systemSettings');
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Error parsing stored settings:', error);
      }
    }

    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes('/api') 
          ? `${API_BASE_URL}/system-settings`
          : `${API_BASE_URL}/api/system-settings`;
        
        const response = await axios.get(url);
        setSettings(response.data);
        localStorage.setItem('systemSettings', JSON.stringify(response.data));
      } catch (error) {
        console.error('Error fetching system settings:', error);
      }
    };

    fetchSettings();
  }, []);

  return settings;
};

const useTooltipSettings = () => {
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);

  useEffect(() => {
    const storedPreference = localStorage.getItem('tooltipsEnabled');
    if (storedPreference !== null) {
      setTooltipsEnabled(JSON.parse(storedPreference));
    }
  }, []);

  const toggleTooltips = useCallback(() => {
    const newValue = !tooltipsEnabled;
    setTooltipsEnabled(newValue);
    localStorage.setItem('tooltipsEnabled', JSON.stringify(newValue));
  }, [tooltipsEnabled]);

  return { tooltipsEnabled, toggleTooltips };
};

// Enhanced STAT_CARDS with detailed tooltips
const STAT_CARDS = (settings) => [
  {
    label: "Total Employees",
    valueKey: "employees",
    defaultValue: 0,
    textValue: "Total Employees",
    icon: <PeopleIcon />,
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
    shadow: `0 15px 40px ${settings.primaryColor}33`,
    tooltip: {
      title: "Total Employees",
      description: "This shows the total number of employees registered in the system across all departments.",
      steps: [
        "Click to view detailed employee list",
        "Filter by department or employment status",
        "Export data for reporting purposes",
        "Add new employees from the Registration module"
      ],
      link: "User Guide: Employee Management"
    }
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
    tooltip: {
      title: "Today's Attendance",
      description: "Real-time count of employees who have marked their attendance for today.",
      steps: [
        "View attendance details by department",
        "Check late arrivals and absences",
        "Generate daily attendance reports",
        "Mark manual attendance if needed"
      ],
      link: "Tutorial: Attendance Tracking"
    }
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
    tooltip: {
      title: "Pending Payroll",
      description: "Number of payroll records awaiting processing for the current period.",
      steps: [
        "Review payroll calculations",
        "Verify deductions and bonuses",
        "Approve for processing",
        "Schedule payment dates"
      ],
      link: "Guide: Payroll Processing"
    }
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
    tooltip: {
      title: "Processed Payroll",
      description: "Successfully processed payroll transactions ready for payment.",
      steps: [
        "View payment status",
        "Download payment advices",
        "Generate bank transfer files",
        "Send payslip notifications"
      ],
      link: "Tutorial: Payroll Distribution"
    }
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
    tooltip: {
      title: "Released Payslips",
      description: "Number of payslips distributed to employees for the current period.",
      steps: [
        "Track payslip delivery status",
        "Resend failed notifications",
        "Download payslip copies",
        "Maintain payslip history"
      ],
      link: "Guide: Payslip Management"
    }
  },
];

// Enhanced QUICK_ACTIONS with tutorial-style tooltips
const QUICK_ACTIONS = (settings) => [
  { 
    label: "Users", 
    link: "/users-list", 
    icon: <Group />, 
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, 
    tooltip: {
      title: "User Management",
      description: "Manage user accounts, permissions, and access levels for the HR system.",
      steps: [
        "Add new users or edit existing ones",
        "Assign roles and department permissions",
        "Reset passwords or deactivate accounts",
        "Monitor user activity and login history"
      ],
      link: "Tutorial: User Administration"
    }
  },
  { 
    label: "Payroll", 
    link: "/payroll-table", 
    icon: <PaymentsIcon />, 
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`, 
    tooltip: {
      title: "Payroll Management",
      description: "Process and manage employee payroll with automated calculations.",
      steps: [
        "Select pay period and employees",
        "Review salary calculations",
        "Process deductions and taxes",
        "Generate payment reports"
      ],
      link: "Guide: Payroll Processing"
    }
  },
  { 
    label: "Leaves", 
    link: "/leave-request", 
    icon: <TransferWithinAStation />, 
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, 
    tooltip: {
      title: "Leave Management",
      description: "Review and approve employee leave requests and track leave balances.",
      steps: [
        "Approve/reject leave applications",
        "View leave calendar and history",
        "Update leave policies",
        "Generate leave reports"
      ],
      link: "Tutorial: Leave Management"
    }
  },
  { 
    label: "DTRs", 
    link: "/daily_time_record_faculty", 
    icon: <AccessTimeIcon />, 
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`, 
    tooltip: {
      title: "Daily Time Records",
      description: "View and manage daily time records and attendance logs.",
      steps: [
        "View employee check-in/out times",
        "Edit time entries if needed",
        "Generate attendance reports",
        "Export timesheet data"
      ],
      link: "Guide: Time Tracking"
    }
  },
  { 
    label: "Announcements", 
    link: "/announcement", 
    icon: <CampaignIcon />, 
    gradient: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, 
    tooltip: {
      title: "Announcements",
      description: "Create and manage company announcements for all employees.",
      steps: [
        "Create new announcements",
        "Schedule publication dates",
        "Target specific departments",
        "Track view statistics"
      ],
      link: "Tutorial: Communication"
    }
  },
  { 
    label: "Holidays", 
    link: "/holiday", 
    icon: <AcUnit />, 
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`, 
    tooltip: {
      title: "Holiday Management",
      description: "Manage company holidays and special non-working days.",
      steps: [
        "Add company holidays",
        "Set recurring holidays",
        "Notify employees in advance",
        "Update payroll calendars"
      ],
      link: "Guide: Calendar Management"
    }
  },
  { 
    label: "Audit Logs", 
    link: "/audit-logs", 
    icon: <History />, 
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`, 
    tooltip: {
      title: "Audit Logs",
      description: "View system activity logs and track all user actions.",
      steps: [
        "Monitor system access",
        "Track data changes",
        "Generate audit reports",
        "Ensure compliance"
      ],
      link: "Guide: Security & Compliance"
    }
  },
  { 
    label: "Registration", 
    link: "/registration", 
    icon: <PersonAdd />, 
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`, 
    tooltip: {
      title: "Employee Registration",
      description: "Register new employees and set up their profiles.",
      steps: [
        "Enter employee details",
        "Upload required documents",
        "Set initial permissions",
        "Create login credentials"
      ],
      link: "Tutorial: Onboarding"
    }
  },
  { 
    label: "Payslip", 
    link: "/distribution-payslip", 
    icon: <ReceiptLongIcon />, 
    gradient: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})`, 
    tooltip: {
      title: "Payslip Distribution",
      description: "Distribute payslips to employees through various channels.",
      steps: [
        "Select distribution method",
        "Email payslips to employees",
        "Generate printed copies",
        "Track delivery status"
      ],
      link: "Guide: Payslip Distribution"
    }
  },
];

const COLORS = (settings) => [settings.primaryColor, settings.secondaryColor, settings.hoverColor, settings.primaryColor, settings.secondaryColor];

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
        const res = await axios.get(`${API_BASE_URL}/personalinfo/person_table`);
        const list = Array.isArray(res.data) ? res.data : [];
        const match = list.find((p) => String(p.agencyEmployeeNum) === String(employeeNumber));
        if (match) {
          if (match.profile_picture) setProfilePicture(match.profile_picture);
          const fullNameFromPerson = `${match.firstName || ''} ${match.middleName || ''} ${match.lastName || ''} ${match.nameExtension || ''}`.trim();
          if (fullNameFromPerson) setFullName(fullNameFromPerson);
        }
      } catch (err) {
        console.error('Error loading profile picture:', err);
      }
    };
    if (employeeNumber) fetchProfilePicture();
  }, [employeeNumber]);

  return { username, fullName, employeeNumber, profilePicture };
};

const useDashboardData = (settings) => {
  const [stats, setStats] = useState({
    employees: 0,
    turnoverRate: 32,
    happinessRate: 78,
    teamKPI: 84.45,
    todayAttendance: 0,
    pendingPayroll: 0,
    processedPayroll: 0,
    payslipCount: 0
  });
  
  const [weeklyAttendanceData, setWeeklyAttendanceData] = useState([]);
  const [departmentAttendanceData, setDepartmentAttendanceData] = useState([]);
  const [payrollStatusData, setPayrollStatusData] = [
    { status: "Processed", value: 0, fill: '#800020' },
    { status: "Pending", value: 0, fill: '#A52A2A' },
    { status: "Failed", value: 0, fill: '#f44336' },
  ];
  
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
    { name: "Present", value: 0, fill: '#800020' },
    { name: "Absent", value: 0, fill: '#A52A2A' },
    { name: "Late", value: 0, fill: '#8B0000' },
  ]);
  
  const [announcements, setAnnouncements] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (attendanceChartData.length > 0) {
      setAttendanceChartData(prev => prev.map((item, idx) => ({
        ...item,
        fill: idx === 0 ? settings.primaryColor : idx === 1 ? settings.secondaryColor : settings.hoverColor
      })));
    }

    if (payrollStatusData.length > 0) {
      setPayrollStatusData(prev => prev.map((item, idx) => ({
        ...item,
        fill: idx === 0 ? settings.primaryColor : idx === 1 ? settings.secondaryColor : settings.hoverColor
      })));
    }
  }, [settings]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        console.log(' Starting data fetch...');

        try {
          console.log(' Fetching dashboard stats...');
          const dashboardStatsRes = await axios.get(`${API_BASE_URL}/api/dashboard/stats`, { headers });
          const dashStats = dashboardStatsRes.data;
          
          console.log(' Dashboard stats received:', dashStats);
          
          setStats(prev => ({
            ...prev,
            employees: dashStats.totalEmployees || 0,
            todayAttendance: dashStats.presentToday || 0,
          }));

          const totalEmp = dashStats.totalEmployees || 0;
          const presentToday = dashStats.presentToday || 0;
          const absentToday = totalEmp - presentToday;
          
          setAttendanceChartData([
            { name: "Present", value: presentToday, fill: settings.primaryColor },
            { name: "Absent", value: absentToday, fill: settings.secondaryColor },
            { name: "Late", value: 0, fill: settings.hoverColor },
          ]);

          console.log(' Attendance chart data updated:', { present: presentToday, absent: absentToday });

        } catch (err) {
          console.error(" Failed to fetch dashboard stats:", err?.message);
        }

        try {
          console.log(' Fetching weekly attendance...');
          const weeklyAttendanceRes = await axios.get(
            `${API_BASE_URL}/api/dashboard/attendance-overview?days=5`, 
            { headers }
          );
          const weeklyData = weeklyAttendanceRes.data;
          
          console.log(' Weekly attendance received:', weeklyData);
          
          const transformedWeekly = Array.isArray(weeklyData) ? weeklyData.map(item => ({
            day: item.day,
            present: item.present,
            absent: 0,
            late: 0
          })) : [];
          
          setWeeklyAttendanceData(transformedWeekly);
          console.log('Weekly chart updated with', transformedWeekly.length, 'days');

        } catch (err) {
          console.error(" Failed to fetch weekly attendance:", err?.message);
          setWeeklyAttendanceData([]);
        }

        try {
          console.log('Fetching department distribution...');
          const deptDistRes = await axios.get(
            `${API_BASE_URL}/api/dashboard/department-distribution`, 
            { headers }
          );
          const deptData = deptDistRes.data;
          
          console.log(' Department data received:', deptData);
          
          const transformedDept = Array.isArray(deptData) ? deptData.map(item => ({
            department: item.department,
            present: item.employeeCount,
            absent: 0,
            rate: item.employeeCount > 0 ? 100 : 0
          })) : [];
          
          setDepartmentAttendanceData(transformedDept);
          console.log('Department chart updated with', transformedDept.length, 'departments');

        } catch (err) {
          console.error("Failed to fetch department distribution:", err?.message);
          setDepartmentAttendanceData([]);
        }

        try {
          console.log('Fetching payroll summary...');
          const payrollSummaryRes = await axios.get(
            `${API_BASE_URL}/api/dashboard/payroll-summary`, 
            { headers }
          );
          const payrollSummary = payrollSummaryRes.data;
          
          console.log('Payroll summary received:', payrollSummary);
          
          setStats(prev => ({
            ...prev,
            pendingPayroll: payrollSummary.pending || 0,
            processedPayroll: payrollSummary.processed || 0,
          }));

          const newPayrollStatus = [
            { status: "Processed", value: payrollSummary.processed || 0, fill: settings.primaryColor },
            { status: "Pending", value: payrollSummary.pending || 0, fill: settings.secondaryColor },
            { status: "Failed", value: 0, fill: settings.hoverColor },
          ];
          setPayrollStatusData(newPayrollStatus);
          
          console.log(' Payroll charts updated');

        } catch (err) {
          console.error(" Failed to fetch payroll summary:", err?.message);
          setPayrollStatusData([
            { status: "Processed", value: 0, fill: settings.primaryColor },
            { status: "Pending", value: 0, fill: settings.secondaryColor },
            { status: "Failed", value: 0, fill: settings.hoverColor },
          ]);
        }

        try {
          console.log('Fetching monthly attendance trend...');
          const monthlyAttendanceRes = await axios.get(
            `${API_BASE_URL}/api/dashboard/monthly-attendance`, 
            { headers }
          );
          const monthlyData = monthlyAttendanceRes.data;
          
          console.log(' Monthly attendance received:', monthlyData.length, 'days');
          
          const weeklyAverages = [];
          let weekData = [];
          
          if (Array.isArray(monthlyData)) {
            monthlyData.forEach((day, index) => {
              weekData.push(day.present);
              
              if ((index + 1) % 7 === 0 || index === monthlyData.length - 1) {
                const avg = weekData.reduce((a, b) => a + b, 0) / weekData.length;
                weeklyAverages.push({
                  week: `Week ${weeklyAverages.length + 1}`,
                  attendance: avg.toFixed(1),
                  leaves: 0,
                  overtime: 0
                });
                weekData = [];
              }
            });
          }
          
          if (weeklyAverages.length > 0) {
            setMonthlyAttendanceTrend(weeklyAverages);
            console.log('Monthly trend updated with', weeklyAverages.length, 'weeks');
          }

        } catch (err) {
          console.error("Failed to fetch monthly attendance:", err?.message);
        }

        try {
          console.log(' Fetching payslip count...');
          const finalizedPayrollRes = await axios.get(
            `${API_BASE_URL}/PayrollRoute/finalized-payroll`, 
            { headers }
          );
          const payslipCount = Array.isArray(finalizedPayrollRes.data) 
            ? finalizedPayrollRes.data.length 
            : 0;
          
          setStats(prev => ({ ...prev, payslipCount }));
          console.log(' Payslip count:', payslipCount);

        } catch (err) {
          console.error(" Failed to fetch payslip count:", err?.message);
          setStats(prev => ({ ...prev, payslipCount: 0 }));
        }

        // Fixed announcement fetching
        try {
          console.log(' Fetching announcements...');
          const annRes = await axios.get(`${API_BASE_URL}/api/announcements`, { headers });
          const announcementData = Array.isArray(annRes.data) ? annRes.data : [];
          setAnnouncements(announcementData);
          console.log('Announcements loaded:', announcementData.length);

        } catch (err) {
          console.error(" Failed to fetch announcements:", err?.message);
          setAnnouncements([]);
        }

        // Fixed holiday fetching
        try {
          console.log(' Fetching holidays...');
          const res = await axios.get(`${API_BASE_URL}/holiday`, { headers });
          if (Array.isArray(res.data)) {
            const transformedHolidays = res.data.map(item => {
              const d = new Date(item.date);
              const normalizedDate = !isNaN(d) 
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` 
                : item.date;
              return { 
                date: normalizedDate, 
                name: item.description, 
                status: item.status 
              };
            });
            setHolidays(transformedHolidays);
            console.log(' Holidays loaded:', transformedHolidays.length);
          }
        } catch (err) {
          console.error(" Error fetching holidays:", err);
        }

        console.log(' All data fetch completed!');

      } catch (err) {
        console.error(" Critical error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

    console.log(' Setting up auto-refresh (5 minutes)');
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    return () => {
      console.log(' Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [settings]); 

  return { 
    stats, 
    weeklyAttendanceData, 
    departmentAttendanceData, 
    payrollStatusData,
    monthlyAttendanceTrend,
    payrollTrendData,
    attendanceChartData, 
    announcements, 
    holidays, 
    loading 
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

  const handleSlideSelect = useCallback((index) => {
    if (!Array.isArray(items)) return;
    setCurrentSlide(index);
  }, [items]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  return {
    currentSlide,
    isPlaying,
    handlePrevSlide,
    handleNextSlide,
    handleSlideSelect,
    togglePlayPause
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

const CompactStatCard = ({ card, index, stats, loading, hoveredCard, setHoveredCard, settings, tooltipsEnabled }) => (
  <Grow in timeout={300 + index * 50}>
    <Card 
      onMouseEnter={() => setHoveredCard(index)} 
      onMouseLeave={() => setHoveredCard(null)} 
      sx={{ 
        height: 120,
        background: settings.accentColor, 
        border: `2px solid ${hoveredCard === index ? settings.primaryColor : settings.primaryColor}26`, 
        borderRadius: 4, 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
        transform: hoveredCard === index ? 'translateY(-4px) scale(1.02)' : 'translateY(0)', 
        boxShadow: hoveredCard === index ? card.shadow : '0 2px 8px rgba(0,0,0,0.08)', 
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <CustomTooltip 
        title={card.tooltip.title}
        description={card.tooltip.description}
        steps={card.tooltip.steps}
        link={card.tooltip.link}
        settings={settings} 
        tooltipsEnabled={tooltipsEnabled}
      >
        <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ 
              width: 40, 
              height: 30, 
              borderRadius: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: `${settings.primaryColor}1A`, 
              color: settings.textPrimaryColor, 
              transition: 'all 0.3s', 
              transform: hoveredCard === index ? 'rotate(360deg) scale(1.1)' : 'rotate(0) scale(1)', 
            }}>
              {React.cloneElement(card.icon, { sx: { fontSize: 24 } })}
            </Box>

          </Box>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: settings.textPrimaryColor, 
                lineHeight: 1
              }}
            >
              {loading ? <Skeleton variant="text" width={60} height={32} /> : 
               (stats[card.valueKey] !== undefined ? stats[card.valueKey] : card.defaultValue)}
            </Typography>
            <Typography sx={{ color: settings.textPrimaryColor, fontSize: '0.75rem', fontWeight: 500 }}>
              {card.textValue}
            </Typography>
            <Typography sx={{ color: settings.textSecondaryColor, fontSize: '0.7rem', fontWeight: 500 }}>
              {card.label}
            </Typography>
          </Box>
        </CardContent>
      </CustomTooltip>
    </Card>
  </Grow>
);

const AnnouncementCarousel = ({ announcements, currentSlide, isPlaying, handlePrevSlide, handleNextSlide, handleSlideSelect, togglePlayPause, handleOpenModal, settings, tooltipsEnabled }) => (
  <Fade in timeout={600}>
    <Card sx={{ 
      background: settings.accentColor, 
      backdropFilter: 'blur(15px)', 
      border: `1px solid ${settings.primaryColor}26`, 
      borderRadius: 4, 
      mb: 3, 
      overflow: 'hidden', 
      boxShadow: `0 15px 40px ${settings.primaryColor}33`, 
      position: 'relative' 
    }}>
      <Box sx={{ position: 'relative', height: 550 }}>
        {Array.isArray(announcements) && announcements.length > 0 ? (
          <>
            <Box 
              component="img" 
              src={announcements[currentSlide]?.image ? `${API_BASE_URL}${announcements[currentSlide].image}` : "/api/placeholder/800/400"} 
              alt={announcements[currentSlide]?.title || "Announcement"} 
              sx={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                transition: 'transform 0.7s ease', 
                transform: 'scale(1)' 
              }} 
            />
            <Box sx={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 70%)' 
            }} />
            <CustomTooltip title="Previous announcement" settings={settings} tooltipsEnabled={tooltipsEnabled}>
              <IconButton 
                onClick={(e) => { e.stopPropagation(); handlePrevSlide(); }} 
                sx={{ 
                  position: 'absolute', 
                  left: 24, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  bgcolor: `${settings.primaryColor}4D`, 
                  backdropFilter: 'blur(10px)', 
                  border: `1px solid ${settings.primaryColor}26`, 
                  '&:hover': { bgcolor: `${settings.primaryColor}80`, transform: 'translateY(-50%) scale(1.1)' }, 
                  color: '#ffffff', 
                  boxShadow: '0 4px 24px rgba(0,0,0,0.2)', 
                  transition: 'all 0.3s' 
                }}
              >
                <ArrowBackIosNewIcon />
              </IconButton>
            </CustomTooltip>
            <CustomTooltip title="Next announcement" settings={settings} tooltipsEnabled={tooltipsEnabled}>
              <IconButton 
                onClick={(e) => { e.stopPropagation(); handleNextSlide(); }} 
                sx={{ 
                  position: 'absolute', 
                  right: 24, 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  bgcolor: `${settings.primaryColor}4D`, 
                  backdropFilter: 'blur(10px)', 
                  border: `1px solid ${settings.primaryColor}26`, 
                  '&:hover': { bgcolor: `${settings.primaryColor}80`, transform: 'translateY(-50%) scale(1.1)' }, 
                  color: '#ffffff', 
                  boxShadow: '0 4px 24px rgba(0,0,0,0.2)', 
                  transition: 'all 0.3s' 
                }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </CustomTooltip>
            <CustomTooltip title={isPlaying ? "Pause carousel" : "Play carousel"} settings={settings} tooltipsEnabled={tooltipsEnabled}>
              <IconButton 
                onClick={(e) => { e.stopPropagation(); togglePlayPause(); }} 
                sx={{ 
                  position: 'absolute', 
                  top: 24, 
                  right: 24, 
                  bgcolor: `${settings.primaryColor}4D`, 
                  backdropFilter: 'blur(10px)', 
                  border: `1px solid ${settings.primaryColor}26`, 
                  '&:hover': { bgcolor: `${settings.primaryColor}80`, transform: 'scale(1.1)' }, 
                  color: '#ffffff', 
                  boxShadow: '0 4px 24px rgba(0,0,0,0.2)', 
                  transition: 'all 0.3s' 
                }}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
            </CustomTooltip>
            <Box 
              onClick={() => handleOpenModal(announcements[currentSlide])} 
              sx={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                p: 4, 
                color: '#ffffff', 
                cursor: 'pointer', 
                transition: 'transform 0.3s', 
                '&:hover': { transform: 'translateY(-4px)' } 
              }}
            >
              <Chip 
                label="ANNOUNCEMENT" 
                size="small" 
                sx={{ 
                  mb: 2, 
                  bgcolor: `${settings.primaryColor}80`, 
                  backdropFilter: 'blur(10px)', 
                  color: '#ffffff', 
                  fontWeight: 700, 
                  fontSize: '0.7rem', 
                  border: '1px solid rgba(254, 249, 225, 0.3)' 
                }} 
              />
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800, 
                  mb: 1, 
                  textShadow: '0 4px 12px rgba(0,0,0,0.5)', 
                  lineHeight: 1.2 
                }}
              >
                {announcements[currentSlide]?.title}
              </Typography>
              <Typography 
                sx={{ 
                  opacity: 0.95, 
                  fontSize: '1rem', 
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1 
                }}
              >
                <AccessTimeIcon sx={{ fontSize: 18 }} />
                {announcements[currentSlide]?.date ? new Date(announcements[currentSlide].date).toDateString() : ""}
              </Typography>
            </Box>
            <Box sx={{ 
              position: 'absolute', 
              bottom: 24, 
              right: 24, 
              display: 'flex', 
              gap: 1.5, 
              alignItems: 'center' 
            }}>
              {announcements.map((_, idx) => (
                <CustomTooltip key={idx} title={`Go to slide ${idx + 1}`} settings={settings} tooltipsEnabled={tooltipsEnabled}>
                  <Box 
                    sx={{ 
                      width: currentSlide === idx ? 32 : 10, 
                      height: 10, 
                      borderRadius: 5, 
                      bgcolor: currentSlide === idx ? '#ffffff' : 'rgba(254,249,225,0.4)', 
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
                      cursor: 'pointer', 
                      border: '1px solid rgba(254,249,225,0.3)', 
                      '&:hover': { 
                        bgcolor: 'rgba(254,249,225,0.7)', 
                        transform: 'scale(1.2)' 
                      } 
                    }} 
                    onClick={(e) => { e.stopPropagation(); handleSlideSelect(idx); }} 
                  />
                </CustomTooltip>
              ))}
            </Box>
          </>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%', 
            flexDirection: 'column', 
            gap: 2 
          }}>
            <CampaignIcon sx={{ fontSize: 80, color: `${settings.primaryColor}4D` }} />
            <Typography variant="h5" sx={{ color: settings.textSecondaryColor }}>
              No announcements available
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  </Fade>
);

const CompactChart = ({ title, children, height = 200, settings, tooltipsEnabled }) => (
  <Card sx={{ 
    background: settings.accentColor, 
    backdropFilter: 'blur(15px)', 
    border: `1px solid ${settings.primaryColor}26`, 
    borderRadius: 4, 
    height: height + 80, 
    boxShadow: `0 15px 40px ${settings.primaryColor}33`, 
    transition: 'all 0.3s', 
    '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 20px 50px ${settings.primaryColor}4D` } 
  }}>
    <CardContent sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: settings.textPrimaryColor, fontSize: '0.95rem' }}>
        {title}
      </Typography>
      <Box sx={{ height }}>
        {children}
      </Box>
    </CardContent>
  </Card>
);

const CompactCalendar = ({ calendarDate, setCalendarDate, holidays, settings, tooltipsEnabled }) => {
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

  const calendarDays = useMemo(() => generateCalendar(month, year), [month, year]);

  return (
    <Card sx={{ 
      background: settings.accentColor, 
      backdropFilter: 'blur(15px)', 
      border: `1px solid ${settings.primaryColor}26`, 
      borderRadius: 4, 
      boxShadow: `0 15px 40px ${settings.primaryColor}33`,
      height: 260
    }}>
      <CardContent sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <CustomTooltip title="Previous month" settings={settings} tooltipsEnabled={tooltipsEnabled}>
            <IconButton 
              size="small" 
              onClick={() => setCalendarDate(new Date(year, month - 1, 1))} 
              sx={{ color: settings.textPrimaryColor, p: 0.5 }}
            >
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
          </CustomTooltip>
          <Typography sx={{ 
            fontWeight: 600, 
            fontSize: '0.8rem', 
            color: settings.textPrimaryColor 
          }}>
            {new Date(year, month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Typography>
          <CustomTooltip title="Next month" settings={settings} tooltipsEnabled={tooltipsEnabled}>
            <IconButton 
              size="small" 
              onClick={() => setCalendarDate(new Date(year, month + 1, 1))} 
              sx={{ color: settings.textPrimaryColor, p: 0.5 }}
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </CustomTooltip>
        </Box>
        <Grid container spacing={0.3} sx={{ mb: 0.3 }}>
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
            <Grid item xs={12 / 7} key={day}>
              <Typography sx={{ 
                textAlign: 'center', 
                fontWeight: 600, 
                fontSize: '0.55rem', 
                color: settings.textSecondaryColor 
              }}>
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={0.3} sx={{ flex: 1 }}>
          {calendarDays.map((day, index) => {
            const currentDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const holidayData = Array.isArray(holidays) ? holidays.find(h => h.date === currentDate && h.status === "Active") : null;
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            return (
              <Grid item xs={12 / 7} key={index}>
                <CustomTooltip 
                  title={holidayData ? holidayData.name : (isToday ? "Today" : day ? `Day ${day}` : "")} 
                  settings={settings} 
                  tooltipsEnabled={tooltipsEnabled}
                >
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 0.3, 
                    fontSize: '0.65rem', 
                    borderRadius: 0.5, 
                    color: holidayData ? '#ffffff' : day ? settings.textPrimaryColor : 'transparent', 
                    background: holidayData ? `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})` : isToday ? '#c4c4c4ff' : 'transparent', 
                    fontWeight: holidayData || isToday ? 600 : 400, 
                    cursor: 'pointer', 
                    transition: 'all 0.2s', 
                    '&:hover': { 
                      background: holidayData ? `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.primaryColor})` : '#e0e0e0', 
                      transform: 'scale(1.1)' 
                    } 
                  }}>
                    {day || ""}
                  </Box>
                </CustomTooltip>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
};

const TaskList = ({ settings, tooltipsEnabled }) => {
  const [tasks, setTasks] = useState([]);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "medium" });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/tasks`).then((res) => {
      if (Array.isArray(res.data)) {
        setTasks(res.data);
      }
    }).catch(err => {
      console.error('Error fetching tasks:', err);
      setTasks([]);
    });
  }, []);

  const handleToggle = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/tasks/${id}/toggle`);
      setTasks(tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      ));
    } catch (err) {
      console.error('Error toggling task:', err);
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
      console.error('Error adding task:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${id}`);
      setTasks(tasks.filter(task => task.id !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const getPriorityLabel = (priority) => {
    switch(priority) {
      case "high": return "Urgent";
      case "medium": return "Soon";
      case "low": return "Later";
      default: return priority;
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
        {showSuccess && <SuccessfulOverlay message="Task added successfully!" />}
        <CardContent sx={{ p: 2, display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: settings.textPrimaryColor, fontSize: "0.95rem" }}>
              Tasks
            </Typography>
            <CustomTooltip title="Add new task" settings={settings} tooltipsEnabled={tooltipsEnabled}>
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
            </CustomTooltip>
          </Box>

          <Box sx={{ 
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
          }}>
            <List dense sx={{ p: 0 }}>
              {Array.isArray(tasks) && tasks.map((task) => (
                <ListItem
                  key={task.id}
                  sx={{ p: 0, mb: 1, display: "flex", alignItems: "center" }}
                >
                  <CustomTooltip title={task.completed ? "Mark as incomplete" : "Mark as complete"} settings={settings} tooltipsEnabled={tooltipsEnabled}>
                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggle(task.id)}
                      size="small"
                      sx={{
                        color: settings.textPrimaryColor,
                        "&.Mui-checked": { color: settings.textPrimaryColor },
                      }}
                    />
                  </CustomTooltip>
                  <ListItemText
                    primary={task.title}
                    primaryTypographyProps={{
                      sx: {
                        fontSize: "0.85rem",
                        color: task.completed ? settings.textSecondaryColor : settings.textPrimaryColor,
                        textDecoration: task.completed ? "line-through" : "none",
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
                  <CustomTooltip title="Delete task" settings={settings} tooltipsEnabled={tooltipsEnabled}>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(task.id)}
                      sx={{ color: settings.textPrimaryColor }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </CustomTooltip>
                </ListItem>
              ))}
            </List>
          </Box>
        </CardContent>
      </Card>

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
            boxShadow: `0 15px 40px ${settings.primaryColor}33}`,
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
          <Typography variant="body2" sx={{ mb: 1, color: settings.textSecondaryColor, fontWeight: 500 }}>
            Priority
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {["low", "medium", "high"].map((priority) => (
              <Button
                key={priority}
                variant={newTask.priority === priority ? "contained" : "outlined"}
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
                {getPriorityLabel(priority)}
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
              bgcolor: settings.primaryColor
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

const QuickActions = ({ settings, tooltipsEnabled }) => (
  <Card sx={{ 
    background: settings.accentColor, 
    backdropFilter: 'blur(15px)', 
    border: `1px solid ${settings.primaryColor}26`, 
    borderRadius: 4, 
    boxShadow: `0 15px 40px ${settings.primaryColor}33`,
    height: 260
  }}>
    <CardContent sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, color: settings.textPrimaryColor, fontSize: '0.85rem' }}>
       Admin Panel
      </Typography>
      <Grid container spacing={1}>
        {QUICK_ACTIONS(settings).map((item, i) => (
          <Grid item xs={4} key={i}>
            <Grow in timeout={400 + i * 50}>
              <Link to={item.link} style={{ textDecoration: "none" }}>
                <CustomTooltip 
                  title={item.tooltip.title}
                  description={item.tooltip.description}
                  steps={item.tooltip.steps}
                  link={item.tooltip.link}
                  settings={settings} 
                  tooltipsEnabled={tooltipsEnabled}
                >
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 1.5, 
                    background: `${settings.primaryColor}0A`, 
                    border: `1px solid ${settings.primaryColor}26`, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: 0.5, 
                    transition: 'all 0.3s', 
                    cursor: 'pointer',
                    height: 43,
                    '&:hover': { 
                      background: `${settings.primaryColor}1A`, 
                      transform: 'translateY(-2px)', 
                      boxShadow: `0 4px 12px ${settings.primaryColor}33` 
                    } 
                  }}>
                    <Box sx={{ color: settings.textPrimaryColor }}>
                      {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                    </Box>
                    <Typography sx={{ 
                      fontSize: '0.6rem', 
                      fontWeight: 600, 
                      color: settings.textPrimaryColor, 
                      textAlign: 'center' 
                    }}>
                      {item.label}
                    </Typography>
                  </Box>
                </CustomTooltip>
              </Link>
            </Grow>
          </Grid>
        ))}
      </Grid>
    </CardContent>
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
            background: i % 2 === 0 ? settings.primaryColor : settings.accentColor,
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

      <Box component="style" children={`
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
      `}/>
    </Box>
  </Dialog>
);

const AdminHome = () => {
  const { username, fullName, employeeNumber, profilePicture } = useAuth();
  const settings = useSystemSettings();
  const { tooltipsEnabled, toggleTooltips } = useTooltipSettings();
  const { 
    stats, 
    weeklyAttendanceData, 
    departmentAttendanceData, 
    payrollStatusData,
    monthlyAttendanceTrend,
    payrollTrendData,
    attendanceChartData, 
    announcements, 
    holidays, 
    loading 
  } = useDashboardData(settings);
  const { currentSlide, isPlaying, handlePrevSlide, handleNextSlide, handleSlideSelect, togglePlayPause } = useCarousel(announcements);
  const currentTime = useTime();
  
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [openModal, setOpenModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [chartView, setChartView] = useState('pie');
  const [anchorEl, setAnchorEl] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  const openMenu = Boolean(anchorEl);
  const navigate = useNavigate();

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

  const radialAttendanceData = Array.isArray(attendanceChartData) ? attendanceChartData.map((item, idx) => ({ 
    ...item, 
    fill: COLORS(settings)[idx % COLORS(settings).length] 
  })) : [];

  return (
    <Box sx={{ 
      background: settings.primaryColor, 
      minHeight: '100vh', 
      py: 2, 
      borderRadius: '14px',
      mt: -2,
      width: '100vw',
      mx: 'auto',
      maxWidth: '100%', 
      overflow: 'hidden',
      position: 'relative',
      left: '50%',
      transform: 'translateX(-50%)', 
    }}>
      <Box sx={{ pt: 4, px: 6, mx: 'auto', maxWidth: '1600px' }}>
        <Grow in timeout={300}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              background: settings.accentColor,
              backdropFilter: 'blur(15px)',
              borderRadius: 4,
              p: 2,
              border: `1px solid ${settings.primaryColor}26`,
              boxShadow: `0 15px 40px ${settings.primaryColor}33}`,
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <AccessTimeIcon sx={{ fontSize: 14 }} />
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                <span style={{ marginLeft: '8px' }}>
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <CustomTooltip title="Refresh page" settings={settings} tooltipsEnabled={tooltipsEnabled}>
                <IconButton
                  size="small"
                  sx={{
                    bgcolor: `${settings.primaryColor}1A`,
                    '&:hover': { bgcolor: `${settings.primaryColor}33` },
                    color: settings.textPrimaryColor,
                  }}
                  onClick={() => window.location.reload()}
                >
                  <AutorenewIcon fontSize="small" />
                </IconButton>
              </CustomTooltip>

              <CustomTooltip title="Notifications" settings={settings} tooltipsEnabled={tooltipsEnabled}>
                <IconButton
                  size="small"
                  sx={{
                    bgcolor: `${settings.primaryColor}1A`,
                    '&:hover': { bgcolor: `${settings.primaryColor}33` },
                    color: settings.textPrimaryColor,
                  }}
                  onClick={() => setNotifModalOpen(true)}
                >
                  <Badge badgeContent={Array.isArray(announcements) ? announcements.length : 0} color="error" max={9}>
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </CustomTooltip>

              <Box
                sx={{
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: -2,
                    borderRadius: '50%',
                    padding: '2px',
                    background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  },
                }}
              >
                <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                  <Avatar
                    alt={username}
                    src={profilePicture ? `${API_BASE_URL}${profilePicture}` : undefined}
                    sx={{ width: 36, height: 36 }}
                  />
                </IconButton>
              </Box>
              
              <Menu 
                anchorEl={anchorEl} 
                open={openMenu} 
                onClose={handleMenuClose} 
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} 
                transformOrigin={{ vertical: 'top', horizontal: 'right' }} 
                PaperProps={{ 
                  sx: { 
                    borderRadius: 2, 
                    minWidth: 200, 
                    backgroundColor: settings.accentColor,
                    border: `1px solid ${settings.primaryColor}26`,
                    boxShadow: `0 15px 40px ${settings.primaryColor}33}`,
                    '& .MuiMenuItem-root': { 
                      fontSize: '0.875rem',
                      color: settings.textPrimaryColor,
                      '&:hover': { 
                        background: `${settings.primaryColor}0A` 
                      }, 
                    }, 
                  }, 
                }} 
              > 
                <MenuItem onClick={() => { handleMenuClose(); navigate("/profile"); }}>
                  <AccountCircle sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Profile
                </MenuItem> 
                <MenuItem onClick={() => { handleMenuClose(); navigate("/settings"); }}>
                  <Settings sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Settings
                </MenuItem> 
                <MenuItem onClick={() => { handleMenuClose(); navigate("/faqs"); }}>
                  <HelpOutline sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> FAQs
                </MenuItem> 
                <MenuItem onClick={() => { handleMenuClose(); navigate("/privacy-policy"); }}>
                  <PrivacyTip sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Privacy Policy
                </MenuItem> 
                <Divider sx={{ borderColor: `${settings.primaryColor}26` }} /> 
                <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }}>
                  <Logout sx={{ mr: 1, fontSize: 20, color: settings.textPrimaryColor }} /> Sign Out
                </MenuItem>
                <Divider sx={{ borderColor: `${settings.primaryColor}26` }} /> 
                <Box sx={{ px: 2, py: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={tooltipsEnabled}
                        onChange={toggleTooltips}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: settings.primaryColor,
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: settings.primaryColor,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: '0.875rem', color: settings.textPrimaryColor }}>
                        Show Tooltips
                      </Typography>
                    }
                  />
                </Box>
              </Menu>
            </Box>
          </Box>
        </Grow>

        {/* Stat Cards */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "nowrap",
            gap: 1,
            pb: 3
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
                settings={settings}
                tooltipsEnabled={tooltipsEnabled}
              />
            </Box>
          ))}
        </Box>

        {/* Main Content Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={7}>
            <AnnouncementCarousel 
              announcements={announcements}
              currentSlide={currentSlide}
              isPlaying={isPlaying}
              handlePrevSlide={handlePrevSlide}
              handleNextSlide={handleNextSlide}
              handleSlideSelect={handleSlideSelect}
              togglePlayPause={togglePlayPause}
              handleOpenModal={handleOpenModal}
              settings={settings}
              tooltipsEnabled={tooltipsEnabled}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <CompactCalendar 
                  calendarDate={calendarDate} 
                  setCalendarDate={setCalendarDate} 
                  holidays={holidays} 
                  settings={settings}
                  tooltipsEnabled={tooltipsEnabled}
                />
              </Grid>
              <Grid item xs={6}>
                <QuickActions settings={settings} tooltipsEnabled={tooltipsEnabled} />
              </Grid>
            </Grid>
            <TaskList settings={settings} tooltipsEnabled={tooltipsEnabled} />
          </Grid>
        </Grid>

        {/* Charts Section */}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Tabs 
              value={tabValue} 
              onChange={(e, v) => setTabValue(v)} 
              sx={{ 
                mb: 2,
                '& .MuiTab-root': {
                  color: settings.textSecondaryColor,
                  '&.Mui-selected': {
                    color: settings.textSecondaryColor,
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: settings.textSecondaryColor,
                }
              }}
            >
              <Tab label="Overview" sx={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'none' }} />
              <Tab label="Analytics" sx={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'none' }} />
            </Tabs>

            {tabValue === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <CompactChart title="Weekly Attendance" height={200} settings={settings} tooltipsEnabled={tooltipsEnabled}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyAttendanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="day" stroke="#666" fontSize={12} />
                        <YAxis stroke="#666" fontSize={12} />
                        <RechartTooltip />
                        <Bar dataKey="present" fill={settings.primaryColor} />
                        <Bar dataKey="absent" fill={settings.secondaryColor} />
                        <Bar dataKey="late" fill={settings.hoverColor} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CompactChart>
                </Grid>

                <Grid item xs={12} md={6}>
                  <CompactChart title="Department Attendance Rate" height={200} settings={settings} tooltipsEnabled={tooltipsEnabled}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentAttendanceData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" stroke="#666" fontSize={12} />
                        <YAxis dataKey="department" type="category" stroke="#666" fontSize={12} width={60} />
                        <RechartTooltip />
                        <Bar dataKey="rate" fill={settings.primaryColor} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CompactChart>
                </Grid>

                <Grid item xs={12} md={6}>
                  <CompactChart title="Payroll Status" height={200} settings={settings} tooltipsEnabled={tooltipsEnabled}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={payrollStatusData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {Array.isArray(payrollStatusData) && payrollStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CompactChart>
                </Grid>

                <Grid item xs={12} md={6}>
                  <CompactChart title="Today's Attendance Summary" height={200} settings={settings} tooltipsEnabled={tooltipsEnabled}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Box sx={{ position: 'relative', width: 140, height: 140 }}>
                        <svg width="140" height="140" viewBox="0 0 140 140">
                          <circle
                            cx="70"
                            cy="70"
                            r="60"
                            fill="none"
                            stroke="#f0f0f0"
                            strokeWidth="12"
                          />
                          <circle
                            cx="70"
                            cy="70"
                            r="60"
                            fill="none"
                            stroke={settings.primaryColor}
                            strokeWidth="12"
                            strokeDasharray={`${2 * Math.PI * 60 * 0.877} ${2 * Math.PI * 60}`}
                            strokeDashoffset="0"
                            strokeLinecap="round"
                            transform="rotate(-90 70 70)"
                          />
                        </svg>
                        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: settings.textPrimaryColor, lineHeight: 1 }}>
                            87.7
                          </Typography>
                          <Typography variant="caption" sx={{ color: settings.textSecondaryColor }}>
                            % Present
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CompactChart>
                </Grid>
              </Grid>
            )}

            {tabValue === 1 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <CompactChart title="Monthly Attendance Trend" height={250} settings={settings} tooltipsEnabled={tooltipsEnabled}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyAttendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" stroke="#666" fontSize={12} />
                        <YAxis stroke="#666" fontSize={12} />
                        <RechartTooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="attendance" 
                          stroke={settings.primaryColor} 
                          strokeWidth={2}
                          dot={{ fill: settings.primaryColor, r: 4 }}
                          name="Attendance %"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="leaves" 
                          stroke={settings.secondaryColor} 
                          strokeWidth={2}
                          dot={{ fill: settings.secondaryColor, r: 4 }}
                          name="Leaves %"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="overtime" 
                          stroke={settings.hoverColor} 
                          strokeWidth={2}
                          dot={{ fill: settings.hoverColor, r: 4 }}
                          name="Overtime %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CompactChart>
                </Grid>

                <Grid item xs={12}>
                  <CompactChart title="Payroll Trend (₱)" height={200} settings={settings} tooltipsEnabled={tooltipsEnabled}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={payrollTrendData}>
                        <defs>
                          <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={settings.primaryColor} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={settings.primaryColor} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={settings.secondaryColor} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={settings.secondaryColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" stroke="#666" fontSize={12} />
                        <YAxis stroke="#666" fontSize={12} />
                        <RechartTooltip formatter={(value) => [`₱${value.toLocaleString()}`, '']} />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="grossPay" 
                          stroke={settings.primaryColor} 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill="url(#colorGross)"
                          name="Gross Pay"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="netPay" 
                          stroke={settings.secondaryColor} 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill="url(#colorNet)"
                          name="Net Pay"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CompactChart>
                </Grid>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Box>

      <Modal open={openModal} onClose={handleCloseModal}>
        <Fade in={openModal}>
          <Box sx={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            width: '90%', 
            maxWidth: 800, 
            bgcolor: settings.accentColor, 
            backdropFilter: 'blur(40px)', 
            border: `1px solid ${settings.primaryColor}26`, 
            boxShadow: `0 24px 64px ${settings.primaryColor}4D`, 
            borderRadius: 4, 
            overflow: 'hidden', 
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            {selectedAnnouncement && (
              <>
                <Box sx={{ position: 'relative' }}>
                  {selectedAnnouncement.image && (
                    <Box 
                      component="img" 
                      src={`${API_BASE_URL}${selectedAnnouncement.image}`} 
                      alt={selectedAnnouncement.title} 
                      sx={{ width: '100%', height: 350, objectFit: 'cover' }} 
                    />
                  )}
                  <Box sx={{ 
                    position: 'absolute', 
                    inset: 0, 
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0, 0, 0, 0.7) 100%)' 
                  }} />
                  <IconButton 
                    onClick={handleCloseModal} 
                    sx={{ 
                      position: 'absolute', 
                      top: 20, 
                      right: 20, 
                      bgcolor: `${settings.primaryColor}4D`, 
                      backdropFilter: 'blur(10px)', 
                      border: `1px solid ${settings.primaryColor}26`, 
                      color: '#ffffff', 
                      '&:hover': { bgcolor: `${settings.primaryColor}80`, transform: 'rotate(90deg)' }, 
                      transition: 'all 0.3s' 
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Box sx={{ p: 4, overflowY: 'auto' }}>
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
                    icon={<AccessTimeIcon style={{color: settings.textPrimaryColor}}/>} 
                    label={new Date(selectedAnnouncement.date).toLocaleDateString()} 
                    sx={{ 
                      mb: 3, 
                      bgcolor: `${settings.primaryColor}4D`, 
                      backdropFilter: 'blur(10px)', 
                      color: settings.textPrimaryColor, 
                      border: `1px solid ${settings.primaryColor}26` 
                    }} 
                  />
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: settings.textPrimaryColor, 
                      lineHeight: 1.8, 
                      fontSize: '1.05rem' 
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
          <Box sx={{ 
            position: 'absolute', 
            top: 100, 
            right: 24, 
            width: 420, 
            maxWidth: '90vw', 
            bgcolor: settings.accentColor, 
            backdropFilter: 'blur(40px)', 
            border: `1px solid ${settings.primaryColor}26`, 
            boxShadow: `0 24px 64px ${settings.primaryColor}4D`, 
            borderRadius: 4, 
            overflow: 'hidden', 
            maxHeight: 'calc(100vh - 140px)' 
          }}>
            <Box sx={{ 
              p: 3, 
              borderBottom: `1px solid ${settings.primaryColor}26`, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: `linear-gradient(135deg, ${settings.primaryColor}1A 0%, ${settings.secondaryColor}0D 100%)` 
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: settings.textPrimaryColor }}>
                Notifications
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => setNotifModalOpen(false)} 
                sx={{ 
                  color: settings.textPrimaryColor,
                  '&:hover': { bgcolor: `${settings.primaryColor}1A`, transform: 'rotate(90deg)' }, 
                  transition: 'all 0.3s' 
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', p: 2 }}>
              {Array.isArray(announcements) && announcements.slice(0, 8).map((item, idx) => (
                <Grow in timeout={300 + idx * 50} key={idx}>
                  <Box 
                    sx={{ 
                      mb: 2, 
                      p: 2.5, 
                      borderRadius: 3, 
                      background: `${settings.primaryColor}0A`, 
                      border: `1px solid ${settings.primaryColor}26`, 
                      cursor: 'pointer', 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      '&::before': { 
                        content: '""', 
                        position: 'absolute', 
                        left: 0, 
                        top: 0, 
                        bottom: 0, 
                        width: 4, 
                        background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, 
                        transform: 'scaleY(0)', 
                        transition: 'transform 0.3s' 
                      }, 
                      '&:hover': { 
                        background: `${settings.primaryColor}1A`, 
                        transform: 'translateX(8px)', 
                        boxShadow: `0 8px 24px ${settings.primaryColor}33` 
                      }, 
                      '&:hover::before': { transform: 'scaleY(1)' } 
                    }} 
                    onClick={() => { 
                      setSelectedAnnouncement(item); 
                      setNotifModalOpen(false); 
                      setOpenModal(true); 
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`, 
                        mt: 0.5, 
                        flexShrink: 0, 
                        boxShadow: `0 0 12px ${settings.primaryColor}99`, 
                        animation: 'pulse 2s infinite', 
                        '@keyframes pulse': { 
                          '0%, 100%': { opacity: 1 }, 
                          '50%': { opacity: 0.5 } 
                        } 
                      }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ 
                          fontWeight: 700, 
                          fontSize: '1rem', 
                          color: settings.textPrimaryColor, 
                          mb: 0.5, 
                          lineHeight: 1.4 
                        }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ 
                          fontSize: '0.8rem', 
                          color: settings.textPrimaryColor, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5 
                        }}>
                          <AccessTimeIcon sx={{ fontSize: 14 }} />
                          {item.date ? new Date(item.date).toLocaleDateString() : ""}
                        </Typography>
                      </Box>
                      <ArrowForward sx={{ 
                        color: settings.textPrimaryColor, 
                        fontSize: 20, 
                        transition: 'transform 0.3s' 
                      }} />
                    </Box>
                  </Box>
                </Grow>
              ))}
              {(!Array.isArray(announcements) || announcements.length === 0) && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <NotificationsIcon sx={{ fontSize: 80, color: `${settings.primaryColor}33` }} />
                  <Typography sx={{ color: settings.textSecondaryColor, fontSize: '1rem' }}>
                    No notifications at the moment
                  </Typography>
                  <Typography sx={{ color: settings.textSecondaryColor, fontSize: '0.85rem', mt: 1 }}>
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