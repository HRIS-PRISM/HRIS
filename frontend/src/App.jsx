import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  AppBar,
  Toolbar,
  createTheme,
  ThemeProvider,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Link,
  IconButton,
} from "@mui/material";
import { AccessTime, Lock, Logout, Email, Facebook, ContactSupport, LoginOutlined } from "@mui/icons-material";
import axios from "axios";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  SystemSettingsProvider,
  useSystemSettings,
} from "./contexts/SystemSettingsContext";
import { SocketProvider } from "./contexts/SocketContext";
import "@fontsource/poppins";
import earistLogo from "./assets/earistLogo.jpg";

import Login from "./components/Login";
import Register from "./components/Register";
import ResetPassword from "./components/ResetPassword";
import LoadingOverlay from "./components/LoadingOverlay";
import SuccessfulOverlay from "./components/SuccessfulOverlay";
import AccessDenied from "./components/AccessDenied";
import SystemSetting from "./SystemSettings";
import PayrollFormulas from "./components/PAYROLL/PayrollFormulas";

import Home from "./components/Home";
import Sidebar from "./components/Sidebar";
import AdminHome from "./components/HomeAdmin";
import ForgotPassword from "./components/ForgotPassword";
import AnnouncementForm from "./components/Announcement";
import Profile from "./components/DASHBOARD/Profile";
import BulkRegister from "./components/BulkRegister";
import Registration from "./components/Registration";
import Reports from "./components/Reports";
import EmployeeReports from "./components/EmployeeReports";

import PersonalTable from "./components/DASHBOARD/PersonTable";
import Children from "./components/DASHBOARD/Children";
import College from "./components/DASHBOARD/College";
import OtherSkills from "./components/DASHBOARD/OtheInformation";
import WorkExperience from "./components/DASHBOARD/WorkExperience";
import Vocational from "./components/DASHBOARD/Vocational";
import LearningAndDevelopment from "./components/DASHBOARD/LearningAndDevelopment";
import VoluntaryWork from "./components/DASHBOARD/Voluntary";
import Eligibility from "./components/DASHBOARD/Eligibility";
import GraduateTable from "./components/DASHBOARD/GraduateStudies";

import ViewAttendanceRecord from "./components/ATTENDANCE/AttendanceDevice";
import AttendanceModification from "./components/ATTENDANCE/AttendanceModification";
import AttendanceUserState from "./components/ATTENDANCE/AttendanceUserState";
import DailyTimeRecord from "./components/ATTENDANCE/DailyTimeRecord";
import DailyTimeRecordHonorarium from "./components/ATTENDANCE/DailyTimeRecordHonorarium";
import DailyTimeRecordServiceCredits from "./components/ATTENDANCE/DailyTimeRecordServiceCredits";

import DailyTimeRecordOvertime from "./components/ATTENDANCE/DailyTimeRecordOvertime";
import DailyTimeRecordEditor from "./components/ATTENDANCE/DailyTimeRecordEditor";
import AttendanceForm from "./components/ATTENDANCE/AttendanceState";
import AttendanceModule from "./components/ATTENDANCE/AttendanceModuleNonTeaching";
import AttendanceModuleFaculty from "./components/ATTENDANCE/AttendanceModuleFaculty30hrs";
import AttendanceModuleFaculty40 from "./components/ATTENDANCE/AttendanceModuleFacultyDesignated";
import OverallAttendancePage from "./components/ATTENDANCE/AttendanceSummary";
import OfficialTimeForm from "./components/ATTENDANCE/OfficialTimeForm";
import MyAttendance from "./components/MyAttendance";
import AttendanceAdjustmentReports from "./components/ATTENDANCE/AttendanceAdjustmentReports";

import Remittances from "./components/PAYROLL/Remittances";
import ItemTable from "./components/PAYROLL/ItemTable";
import SalaryGradeTable from "./components/PAYROLL/SalaryGradeTable";
import DepartmentTable from "./components/PAYROLL/DepartmentTable";
import DepartmentAssignment from "./components/PAYROLL/DepartmentAssignment";
import Holiday from "./components/PAYROLL/Holiday";
import PhilHealthTable from "./components/PAYROLL/PhilHealth";
import PayrollProcess from "./components/PAYROLL/PayrollProcessing";
import PayrollProcessed from "./components/PAYROLL/PayrollProcessed";
import PayrollProcessedJO from "./components/PAYROLL/PayrollProcessedJO";
import PayrollReleased from "./components/PAYROLL/PayrollReleased";

import AssessmentClearance from "./components/FORMS/AssessmentClearance";
import Clearance from "./components/FORMS/Clearance";
import ClearanceBack from "./components/FORMS/ClearanceBack";
import FacultyClearance from "./components/FORMS/FacultyClearance";
import FacultyClearance70Days from "./components/FORMS/FacultyClearance70Days";
import InServiceTraining from "./components/FORMS/InServiceTraining";
import LeaveCard from "./components/FORMS/LeaveCard";
import LeaveCardBack from "./components/FORMS/LeaveCardBack";
import LocatorSlip from "./components/FORMS/LocatorSlip";
import PermissionToTeach from "./components/FORMS/PermissionToTeach";
import RequestForID from "./components/FORMS/RequestForID";
import SalnFront from "./components/FORMS/SalnFront";
import SalnBack from "./components/FORMS/SalnBack";
import ScholarshipAgreement from "./components/FORMS/ScholarshipAgreement";
import SubjectStillToBeTaken from "./components/FORMS/SubjectStillToBeTaken";
import IndividualFacultyLoading from "./components/FORMS/IndividualFacultyLoading";
import HrmsRequestForms from "./components/FORMS/HRMSRequestForms";
import EmploymentCategoryManagement from "./components/EmploymentCategory";
import AbsencesReport from "./components/LEAVE/AbsencesReport";

import PDSTemplates from "./components/PDS/PDSTemplates";
import PDS1 from "./components/PDS/PDS1";
import PDS2 from "./components/PDS/PDS2";
import PDS3 from "./components/PDS/PDS3";
import PDS4 from "./components/PDS/PDS4";
import File201Admin from "./components/FILE201/File201Admin";

import Payslip from "./components/PAYROLL/Payslip";
import PayslipOverall from "./components/PAYROLL/RETIRED-PayslipOverall";
import PayslipDistribution from "./components/PAYROLL/PayslipDistribution";

import LeaveRequestUser from "./components/LEAVE/LeaveRequestUser";
import LeaveTable from "./components/LEAVE/LeaveTable";
import LeaveRequest from "./components/LEAVE/LeaveRequest";
import LeaveDatePickerModal from "./components/LEAVE/LeaveDatePicker";
import LeaveAssignment from "./components/LEAVE/LeaveAssignment";
import LeaveCredits from "./components/LEAVE/LeaveCredits";
import Leave from "./components/FORMS/Leave";
import LeaveBack from "./components/FORMS/LeaveBack";
import LeaveCommutation from "./components/LEAVE/LeaveCommutation";
import ServiceCredits from "./components/LEAVE/ServiceCredits";
import LeaveRequestSupervisor from "./components/LEAVE/LeaveRequestSupervisor";
import SupervisorAssignment from "./components/LEAVE/SupervisorAssignment";
import DailyTimeRecordSupervisor from "./components/ATTENDANCE/DailyTimeRecordSupervisor";

import UsersList from "./components/UsersList";
import PagesList from "./components/PagesList";
import AuditLogs from "./components/AuditLogs";
import Settings from "./components/Settings";
import AdminSecurity from "./components/AdminManagement";
import PayrollJO from "./components/PAYROLL/PayrollJO";
import UnderConstruction from "./components/UnderConstruction";
import DailyTimeRecordFaculty from "./components/ATTENDANCE/DailyTimeRecordOverall";
import WorkingHoursConverter from "./components/WorkingHoursConverter";
import CompensatoryTimeOff from "./components/LEAVE/CompensatoryTimeOff";
import AssignmentManagement from "./components/LEAVE/AssignmentManagement";
import EarningsManagement from "./components/LEAVE/EarningsManagement";

import RecordsPanel from "./components/LEAVE/RecordsPanel";
import { adminPage, allUserPage, superTechPage, technicalPage, ADMIN_ROUTE_ROLES } from "./utils/gatedRoutes";


function applySystemCSSVariables(s) {
  const root = document.documentElement;

  root.style.setProperty("--color-primary", s.primaryColor || "#894444");
  root.style.setProperty("--color-secondary", s.secondaryColor || "#6d2323");
  root.style.setProperty("--color-accent", s.accentColor || "#FEF9E1");
  root.style.setProperty("--color-hover", s.hoverColor || "#6D2323");
  root.style.setProperty("--color-background", s.backgroundColor || "#FFFFFF");
  root.style.setProperty("--color-text", s.textColor || "#FFFFFF");
  root.style.setProperty(
    "--color-text-primary",
    s.textPrimaryColor || "#6D2323",
  );
  root.style.setProperty(
    "--color-text-secondary",
    s.textSecondaryColor || "#FEF9E1",
  );

  root.style.setProperty(
    "--sidebar-gradient-start",
    s.primaryColor || "#894444",
  );
  root.style.setProperty(
    "--sidebar-gradient-end",
    s.sidebarGradientEnd || "#3a0f0f",
  );

  root.style.setProperty("--btn-action", s.actionButtonColor || "#6d2323");
  root.style.setProperty(
    "--btn-action-hover",
    s.actionButtonHoverColor || "#a31d1d",
  );
  root.style.setProperty(
    "--btn-destructive",
    s.destructiveButtonColor || "#6c757d",
  );
  root.style.setProperty(
    "--btn-destructive-hover",
    s.destructiveButtonHoverColor || "#5a6268",
  );

  root.style.setProperty("--modal-bg", s.modalBackgroundColor || "#FFFFFF");
  root.style.setProperty("--modal-header-bg", s.modalHeaderColor || "#6d2323");
  root.style.setProperty(
    "--modal-header-text",
    s.modalHeaderTextColor || "#FFFFFF",
  );
  root.style.setProperty(
    "--modal-body-text",
    s.modalBodyTextColor || "#333333",
  );
  root.style.setProperty("--modal-border", s.modalBorderColor || "#894444");
}

function App() {
  const [open, setOpen] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);
  const [open4, setOpen4] = useState(false);
  const [open5, setOpen5] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [open6, setOpen6] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const { settings: systemSettings } = useSystemSettings();

  const handleClick = () => setOpen(!open);
  const handleClickAttendance = () => setOpen2(!open2);
  const handleClickPayroll = () => setOpen3(!open3);
  const handleClickForms = () => setOpen4(!open4);
  const handleClickPDSFiles = () => setOpen5(!open5);

  const handleDrawerStateChange = (isOpen) => {
    setDrawerOpen(isOpen);
  };

  const handleMainContentClick = (e) => {
    if (isLocked && drawerOpen) {
      setDrawerOpen(false);
      setIsLocked(false);
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  const drawerWidth = 270;
  const collapsedWidth = 60;

  useEffect(() => {
    applySystemCSSVariables(systemSettings);
  }, [systemSettings]);

  const dynamicTheme = createTheme({
    typography: {
      fontFamily: "Poppins, sans-serif",
      body1: { fontSize: "13px" },
    },
    palette: {
      primary: {
        main: systemSettings.primaryColor,
        dark: systemSettings.hoverColor,
        light: systemSettings.accentColor,
      },
      secondary: {
        main: systemSettings.secondaryColor,
      },
      background: {
        default: "#f5f5f5",
        paper: "#ffffff",
      },
      text: {
        primary: "#333333",
        secondary: "#666666",
      },
      crudButtons: {
        action: {
          main: systemSettings.actionButtonColor || "#6d2323",
          hover: systemSettings.actionButtonHoverColor || "#a31d1d",
        },
        destructive: {
          main: systemSettings.destructiveButtonColor || "#6c757d",
          hover: systemSettings.destructiveButtonHoverColor || "#5a6268",
        },
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          contained: {
            backgroundColor: systemSettings.primaryColor,
            color: systemSettings.textColor,
            "&:hover": {
              backgroundColor: systemSettings.hoverColor,
            },
          },
          outlined: {
            borderColor: systemSettings.primaryColor,
            color: systemSettings.primaryColor,
            "&:hover": {
              borderColor: systemSettings.hoverColor,
              backgroundColor: `${systemSettings.accentColor}33`,
            },
          },
        },
        variants: [
          ...["create", "read", "update"].map((action) => ({
            props: { "data-action": action },
            style: {
              backgroundColor: systemSettings.actionButtonColor || "#6d2323",
              color: "#fff",
              "&:hover": {
                backgroundColor:
                  systemSettings.actionButtonHoverColor || "#a31d1d",
              },
            },
          })),
          ...["delete", "cancel"].map((action) => ({
            props: { "data-action": action },
            style: {
              backgroundColor:
                systemSettings.destructiveButtonColor || "#6c757d",
              color: "#fff",
              "&:hover": {
                backgroundColor:
                  systemSettings.destructiveButtonHoverColor || "#5a6268",
              },
            },
          })),
          {
            props: { "data-action": "cancel", variant: "outlined" },
            style: {
              borderColor: systemSettings.destructiveButtonColor || "#6c757d",
              color: systemSettings.destructiveButtonColor || "#6c757d",
              backgroundColor: "transparent",
              "&:hover": {
                borderColor:
                  systemSettings.destructiveButtonHoverColor || "#5a6268",
                backgroundColor: `${systemSettings.destructiveButtonColor || "#6c757d"}18`,
              },
            },
          },
        ],
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: systemSettings.primaryColor,
          },
        },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            "& .MuiTableCell-head": {
              backgroundColor: systemSettings.primaryColor,
              color: systemSettings.textColor,
              fontWeight: "bold",
            },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          filled: {
            backgroundColor: systemSettings.accentColor,
            color: "#000000",
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            "&.Mui-selected": {
              color: systemSettings.primaryColor,
            },
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: {
            backgroundColor: `${systemSettings.accentColor}88`,
          },
          bar: {
            backgroundColor: systemSettings.primaryColor,
          },
        },
      },

      MuiFab: {
        styleOverrides: {
          root: {
            backgroundColor:
              systemSettings.actionButtonColor || systemSettings.primaryColor,
            color: "#fff",
            "&:hover": {
              backgroundColor:
                systemSettings.actionButtonHoverColor ||
                systemSettings.hoverColor,
            },
          },
        },
      },

      MuiIconButton: {
        variants: [
          {
            props: { "data-action": "delete" },
            style: {
              color: systemSettings.destructiveButtonColor || "#6c757d",
              "&:hover": {
                backgroundColor: `${systemSettings.destructiveButtonColor || "#6c757d"}18`,
              },
            },
          },
          {
            props: { "data-action": "cancel" },
            style: {
              color: systemSettings.destructiveButtonColor || "#6c757d",
              "&:hover": {
                backgroundColor: `${systemSettings.destructiveButtonColor || "#6c757d"}18`,
              },
            },
          },
          {
            props: { "data-action": "update" },
            style: {
              color: systemSettings.actionButtonColor || "#6d2323",
              "&:hover": {
                backgroundColor: `${systemSettings.actionButtonColor || "#6d2323"}18`,
              },
            },
          },
          {
            props: { "data-action": "create" },
            style: {
              color: systemSettings.actionButtonColor || "#6d2323",
              "&:hover": {
                backgroundColor: `${systemSettings.actionButtonColor || "#6d2323"}18`,
              },
            },
          },
          {
            props: { "data-action": "read" },
            style: {
              color: systemSettings.actionButtonColor || "#6d2323",
              "&:hover": {
                backgroundColor: `${systemSettings.actionButtonColor || "#6d2323"}18`,
              },
            },
          },
        ],
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: systemSettings.modalBackgroundColor || "#FFFFFF",
            border: `1.5px solid ${systemSettings.modalBorderColor || "#894444"}`,
            borderRadius: 12,
            boxShadow: `0 8px 40px ${systemSettings.modalBorderColor || "#894444"}33`,
            // Custom attendance modals use Box/Typography instead of DialogTitle; inherit Poppins here so body + native buttons match the app.
            fontFamily: "Poppins, sans-serif",
          },
        },
      },

      MuiDialogTitle: {
        styleOverrides: {
          root: {
            backgroundColor: systemSettings.modalHeaderColor || "#6d2323",
            color: systemSettings.modalHeaderTextColor || "#FFFFFF",
            fontWeight: 700,
            fontFamily: "Poppins, sans-serif",
          },
        },
      },

      MuiDialogContent: {
        styleOverrides: {
          root: {
            backgroundColor: systemSettings.modalBackgroundColor || "#FFFFFF",
            color: systemSettings.modalBodyTextColor || "#333333",
          },
        },
      },

      MuiDialogContentText: {
        styleOverrides: {
          root: {
            color: systemSettings.modalBodyTextColor || "#333333",
          },
        },
      },

      MuiDialogActions: {
        styleOverrides: {
          root: {
            backgroundColor: systemSettings.modalBackgroundColor || "#FFFFFF",
            borderTop: `1px solid ${systemSettings.modalBorderColor || "#894444"}22`,
            padding: "12px 24px",
          },
        },
      },
    },
  });

  const [idleWarningOpen, setIdleWarningOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionExpired, setSessionExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const idleTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);

  const IDLE_WARNING_TIME = 20 * 60 * 1000;
  const AUTO_LOGOUT_TIME = 30 * 60 * 1000;
  const COUNTDOWN_SECONDS = (AUTO_LOGOUT_TIME - IDLE_WARNING_TIME) / 1000;

  const isAuthenticatedPage = ![
    "/",
    "/login",
    "/register",
    "/forgot-password",
  ].includes(location.pathname);

  const clearTimers = () => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
    idleTimeoutRef.current = null;
    logoutTimeoutRef.current = null;
  };

  const resetIdleTimer = () => {
    if (!isAuthenticatedPage) return;
    clearTimers();
    idleTimeoutRef.current = setTimeout(() => {
      setIdleWarningOpen(true);
      logoutTimeoutRef.current = setTimeout(() => {
        handleAutoLogout();
      }, AUTO_LOGOUT_TIME - IDLE_WARNING_TIME);
    }, IDLE_WARNING_TIME);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setIdleWarningOpen(false);
    setSessionExpired(false);
    clearTimers();
    navigate("/");
  };

  const handleAutoLogout = () => {
    setIdleWarningOpen(false);
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    clearTimers();
    setSessionExpired(true);
  };

  const handleSessionExpiredClose = () => {
    setSessionExpired(false);
    navigate("/");
  };

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    let interval;
    if (idleWarningOpen) {
      setTimeLeft(COUNTDOWN_SECONDS);
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeft(0);
    }
    return () => clearInterval(interval);
  }, [idleWarningOpen]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  useEffect(() => {
    if (!isAuthenticatedPage) {
      setIdleWarningOpen(false);
      clearTimers();
      return;
    }
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => {
      window.addEventListener(event, resetIdleTimer);
    });
    resetIdleTimer();
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
      clearTimers();
    };
  }, [location.pathname]);

  return (
    <ThemeProvider theme={dynamicTheme}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "10vh",
          overflow: "hidden",
        }}
      >
        <AppBar
          position="fixed"
          sx={{
            zIndex: 1201,
            bgcolor: systemSettings.secondaryColor,
            height: "62px",
            overflow: "hidden",
          }}
        >
          <Toolbar sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* LEFT: Logo + System Name */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  marginRight: "10px",
                  marginLeft: "-15px",
                  borderRadius: "50%",
                  border: "1px solid white",
                  overflow: "hidden",
                  flexShrink: 0,
                  bgcolor: "rgba(255,255,255,0.15)",
                }}
              >
                {systemSettings.institutionLogo && (
                  <img
                    src={systemSettings.institutionLogo}
                    alt="Institution Logo"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      imageRendering: "auto",
                    }}
                  />
                )}
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    lineHeight: 1.2,
                    color: systemSettings.textColor,
                    marginTop: "8px",
                  }}
                >
                  {systemSettings.institutionName}
                </Typography>
                <Typography
                  variant="subtitle1"
                  noWrap
                  sx={{
                    color: systemSettings.textColor,
                    fontWeight: "bold",
                    marginTop: "-5px",
                  }}
                >
                  {systemSettings.systemName}
                </Typography>
              </Box>
            </Box>

            {/* RIGHT: Live Clock */}
            {isAuthenticatedPage && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  px: 2,
                  py: 0.5,
                }}
              >
                <AccessTime sx={{ fontSize: 18, color: systemSettings.textColor, opacity: 0.85 }} />
                <Box>
                  <Typography
                    sx={{
                      fontWeight: "bold",
                      fontFamily: "monospace",
                      fontSize: "1rem",
                      letterSpacing: 1.5,
                      color: systemSettings.textColor,
                      lineHeight: 1.2,
                    }}
                  >
                    {currentTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      color: systemSettings.textColor,
                      opacity: 0.75,
                      letterSpacing: 0.5,
                      lineHeight: 1,
                    }}
                  >
                    {currentTime.toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Typography>
                </Box>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        {!["/", "/login", "/register", "/forgot-password"].includes(
          location.pathname,
        ) && (
          <Sidebar
            open={open}
            handleClick={handleClick}
            open2={open2}
            handleClickAttendance={handleClickAttendance}
            open3={open3}
            handleClickPayroll={handleClickPayroll}
            open4={open4}
            handleClickForms={handleClickForms}
            open5={open5}
            handleClickPDSFiles={handleClickPDSFiles}
            onDrawerStateChange={handleDrawerStateChange}
            systemSettings={systemSettings}
          />
        )}

        <Box
          component="main"
          onClick={handleMainContentClick}
          sx={{
            flexGrow: 1,
            bgcolor: "transparent",
            p: { xs: 1, sm: 1, md: 5 },
            marginLeft: drawerOpen ? `${drawerWidth}px` : `${collapsedWidth}px`,
            transition: "margin-left 0.3s ease",
            fontFamily: "Poppins, sans-serif",
            minHeight: "fit-content",
            "& .MuiPaper-root": { borderColor: systemSettings.primaryColor },
            "& .MuiButton-contained": {
              backgroundColor: systemSettings.primaryColor,
              "&:hover": { backgroundColor: systemSettings.hoverColor },
            },
            "& .MuiTableHead-root": {
              "& .MuiTableCell-head": {
                backgroundColor: systemSettings.primaryColor,
                color: systemSettings.textColor,
                fontWeight: "bold",
              },
            },
          }}
        >
          <Toolbar />
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route
              path="/bulk-register"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <BulkRegister />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registration"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <Registration />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/reset-password"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <ResetPassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "administrator",
                    "superadmin",
                    "staff",
                    "technical",
                  ]}
                >
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/children"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <Children />
                </ProtectedRoute>
              }
            />
            <Route
              path="/voluntarywork"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <VoluntaryWork />
                </ProtectedRoute>
              }
            />
            <Route
              path="/learningdev"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <LearningAndDevelopment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/eligibility"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <Eligibility />
                </ProtectedRoute>
              }
            />
            <Route
              path="/college"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <College />
                </ProtectedRoute>
              }
            />
            <Route
              path="/graduate"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <GraduateTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vocational"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <Vocational />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workexperience"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <WorkExperience />
                </ProtectedRoute>
              }
            />
            <Route
              path="/personalinfo"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <PersonalTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/other-information"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <OtherSkills />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-attendance"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <MyAttendance />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/view_attendance"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <ViewAttendanceRecord />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search_attendance"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <AttendanceModification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance-user-state"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "administrator",
                    "superadmin",
                    "staff",
                    "technical",
                  ]}
                >
                  <AttendanceUserState />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily_time_record"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <DailyTimeRecord />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily_time_record_honorarium"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <DailyTimeRecordHonorarium />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily_time_record_service_credits"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <DailyTimeRecordServiceCredits />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily_time_record_overtime"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <DailyTimeRecordOvertime />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily_time_record_faculty"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <DailyTimeRecordFaculty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily_time_record_editor"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <DailyTimeRecordEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance_form"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <AttendanceForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance_module"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <AttendanceModule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance_module_faculty"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <AttendanceModuleFaculty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance_module_faculty_40hrs"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <AttendanceModuleFaculty40 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance_summary"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <OverallAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/official_time"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <OfficialTimeForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pds-templates"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "superadmin",
                    "technical",
                  ]}
                >
                  <PDSTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/file201"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <File201Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pds1"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <PDS1 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pds2"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <PDS2 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pds3"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <PDS3 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pds4"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <PDS4 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll-table"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <PayrollProcess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll-processed"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <PayrollProcessed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll-processed-jo"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <PayrollProcessedJO />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll-released"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <PayrollReleased />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll-jo"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <PayrollJO />
                </ProtectedRoute>
              }
            />
            <Route
              path="/remittance-table"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <Remittances />
                </ProtectedRoute>
              }
            />
            <Route
              path="/philhealth-table"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <PhilHealthTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/item-table"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <ItemTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/salary-grade"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <SalaryGradeTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/department-table"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <DepartmentTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/department-assignment"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <DepartmentAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/holiday"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <Holiday />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment-clearance"
              element={adminPage(AssessmentClearance, 'assessment-clearance', 'You do not have permission to access Assessment Clearance forms.')}
            />
            <Route
              path="/clearance"
              element={adminPage(Clearance, 'clearance', 'You do not have permission to access Clearance forms.')}
            />
            <Route
              path="/clearance-back"
              element={adminPage(ClearanceBack, 'clearance-back', 'You do not have permission to access Clearance forms.')}
            />
            <Route
              path="/faculty-clearance"
              element={adminPage(FacultyClearance, 'faculty-clearance', 'You do not have permission to access Faculty Clearance forms.')}
            />
            <Route
              path="/faculty-clearance-70-days"
              element={adminPage(FacultyClearance70Days, 'faculty-clearance-70-days', 'You do not have permission to access Faculty Clearance forms.')}
            />
            <Route
              path="/hrms-request-forms"
              element={adminPage(HrmsRequestForms, 'hrms-request-forms', 'You do not have permission to access HRMS Request forms.')}
            />
            <Route
              path="/individual-faculty-loading"
              element={adminPage(IndividualFacultyLoading, 'individual-faculty-loading', 'You do not have permission to access Individual Faculty Loading forms.')}
            />
            <Route
              path="/in-service-training"
              element={adminPage(InServiceTraining, 'in-service-training', 'You do not have permission to access In-Service Training forms.')}
            />
            <Route
              path="/leave-card"
              element={adminPage(LeaveCard, 'leave-card', 'You do not have permission to access Leave Card forms.')}
            />
            <Route
              path="/leave-card-back"
              element={adminPage(LeaveCardBack, 'leave-card-back', 'You do not have permission to access Leave Card forms.')}
            />
            <Route
              path="/leave-form"
              element={adminPage(Leave, 'leave-form', 'You do not have permission to access Leave forms.')}
            />
            <Route
              path="/leave-back"
              element={adminPage(LeaveBack, 'leave-back', 'You do not have permission to access Leave forms.')}
            />
            <Route
              path="/locator-slip"
              element={adminPage(LocatorSlip, 'locator-slip', 'You do not have permission to access Locator Slip forms.')}
            />
            <Route
              path="/permission-to-teach"
              element={adminPage(PermissionToTeach, 'permission-to-teach', 'You do not have permission to access Permission to Teach forms.')}
            />
            <Route
              path="/request-for-id"
              element={adminPage(RequestForID, 'request-for-id', 'You do not have permission to access Request for ID forms.')}
            />
            <Route
              path="/saln-front"
              element={adminPage(SalnFront, 'saln-front', 'You do not have permission to access SALN forms.')}
            />
            <Route
              path="/saln-back"
              element={adminPage(SalnBack, 'saln-back', 'You do not have permission to access SALN forms.')}
            />
            <Route
              path="/scholarship-agreement"
              element={adminPage(ScholarshipAgreement, 'scholarship-agreement', 'You do not have permission to access Scholarship Agreement forms.')}
            />
            <Route
              path="/subject"
              element={adminPage(SubjectStillToBeTaken, 'subject', 'You do not have permission to access Subject forms.')}
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcement"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <AnnouncementForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payslip"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <Payslip />
                </ProtectedRoute>
              }
            />
            <Route
              path="/distribution-payslip"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <PayslipDistribution />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loading-overlay"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <LoadingOverlay />
                </ProtectedRoute>
              }
            />
            <Route
              path="/successful-overlay"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <SuccessfulOverlay />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-home"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "staff",
                    "administrator",
                    "superadmin",
                    "technical",
                  ]}
                >
                  <AdminHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-category"
              element={adminPage(EmploymentCategoryManagement, 'employee-category', 'You do not have permission to access Employee Category.')}
            />
            <Route
              path="/leave-table"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <LeaveTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leave-request"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <LeaveRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/absences-report"
              element={adminPage(AbsencesReport, 'absences-report', 'You do not have permission to access Absences Report.')}
            />
            <Route
              path="/attendance-adjustment-reports"
              element={adminPage(AttendanceAdjustmentReports, 'attendance-adjustment-reports', 'You do not have permission to access Attendance Adjustment Reports.')}
            />
              
            <Route
              path="/leave-request-user"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "administrator",
                    "superadmin",
                    "technical",
                    "staff",
                  ]}
                >
                  <LeaveRequestUser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leave-assignment"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <LeaveAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leave-commutation"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <LeaveCommutation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/service-credits"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <ServiceCredits />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cto"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <CompensatoryTimeOff />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignment-management"
              element={adminPage(AssignmentManagement, 'assignment-management', 'You do not have permission to access Assignment Management.')}
            />
            <Route
              path="/earnings-management"
              element={adminPage(EarningsManagement, 'earnings-management', 'You do not have permission to access Earnings Management.')}
            />
            <Route
              path="/supervisor-assignment"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical"]}
                >
                  <SupervisorAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leave-request-supervisor"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical", "staff"]}
                >
                  <LeaveRequestSupervisor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily-time-record-supervisor"
              element={
                <ProtectedRoute
                  allowedRoles={["administrator", "superadmin", "technical", "staff"]}
                >
                  <DailyTimeRecordSupervisor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users-list"
              element={superTechPage(UsersList, 'users-list', 'You do not have permission to access User Management.')}
            />
            <Route
              path="/pages-list"
              element={technicalPage(PagesList, 'pages-list', 'You do not have permission to access Page Management.')}
            />
            <Route
              path="/audit-logs"
              element={adminPage(AuditLogs, 'audit-logs', 'You do not have permission to access Audit Logs.')}
            />
            <Route
              path="/reports"
              element={adminPage(Reports, 'reports', 'You do not have permission to access Reports.')}
            />
            <Route
              path="/employee-reports"
              element={allUserPage(EmployeeReports, 'employee-reports', 'You do not have permission to access Employee Reports.')}
            />
            <Route
              path="/system-settings"
              element={technicalPage(SystemSetting, 'system-settings', 'You do not have permission to access System Settings.')}
            />
            <Route
              path="/payroll-formulas"
              element={superTechPage(PayrollFormulas, 'payroll-formulas', 'You do not have permission to access Payroll Formulas.')}
            />
            <Route
              path="/admin-security"
              element={superTechPage(AdminSecurity, 'admin-security', 'You do not have permission to access Admin Security.')}
            />
            <Route
              path="/working-hours"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROUTE_ROLES}>
                  <WorkingHoursConverter />
                </ProtectedRoute>
              }
            />
            <Route path="/under-construction" element={<UnderConstruction />} />
            <Route path="/access-denied" element={<AccessDenied />} />
          </Routes>
        </Box>

        {/* ── IDLE WARNING DIALOG ─────────────────────────────────────────────── */}
        <Dialog
          open={idleWarningOpen && isAuthenticatedPage}
          PaperProps={{
            sx: {
              borderRadius: "20px",
              overflow: "hidden",
              background: "rgba(255,248,231,0.98)",
              border: "1px solid rgba(128,0,32,0.15)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              maxWidth: 400,
              width: "100%",
            },
          }}
        >
          {/* Crimson header */}
          <Box
            sx={{
              background: "#800020",
              px: 3,
              py: 2.5,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AccessTime sx={{ color: "#fff", fontSize: 20 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.65)",
                  textTransform: "uppercase",
                  mb: 0.25,
                }}
              >
                Security Notice
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.2,
                }}
              >
                Session Expiring Soon
              </Typography>
            </Box>
          </Box>

          {/* Gradient accent bar */}
          <Box
            sx={{
              height: 3,
              background: "linear-gradient(90deg, #800020, #e84a4a)",
            }}
          />

          <DialogContent
            sx={{
              background: "transparent",
              pt: 3,
              pb: 2,
              px: 3,
            }}
          >
            <Typography
              sx={{
                color: "rgba(75,0,0,0.65)",
                fontSize: "0.82rem",
                textAlign: "center",
                lineHeight: 1.6,
                mb: 2,
              }}
            >
              You have been inactive. For security purposes, you will be logged
              out in:
            </Typography>

            <Box sx={{ textAlign: "center", mb: 2 }}>
              <Typography
                sx={{
                  fontSize: "2.8rem",
                  fontWeight: 800,
                  color: "#800020",
                  fontFamily: "monospace",
                  letterSpacing: "2px",
                  lineHeight: 1,
                }}
              >
                {formatTime(timeLeft)}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  color: "rgba(128,0,32,0.45)",
                  mt: 0.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                minutes remaining
              </Typography>
            </Box>

            {/* Progress bar */}
            <Box
              sx={{
                height: 6,
                bgcolor: "rgba(128,0,32,0.1)",
                borderRadius: "4px",
                overflow: "hidden",
                mb: 0.5,
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  bgcolor: "#800020",
                  borderRadius: "4px",
                  width: `${(timeLeft / COUNTDOWN_SECONDS) * 100}%`,
                  transition: "width 1s linear",
                }}
              />
            </Box>
          </DialogContent>

          <DialogActions
            sx={{
              background: "transparent",
              px: 3,
              pb: 3,
              pt: 0,
              gap: 1.25,
              borderTop: "none",
            }}
          >
            <Box
              component="button"
              onClick={handleLogout}
              sx={{
                flex: 1,
                height: 46,
                background: "transparent",
                border: "1px solid rgba(128,0,32,0.35)",
                borderRadius: "12px",
                color: "#800020",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s",
                "&:hover": { background: "rgba(128,0,32,0.05)" },
              }}
            >
              Logout Now
            </Box>
            <Box
              component="button"
              onClick={() => {
                setIdleWarningOpen(false);
                resetIdleTimer();
              }}
              sx={{
                flex: 1.5,
                height: 46,
                background: "#800020",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s",
                "&:hover": { background: "#6a001a" },
              }}
            >
              Stay Logged In
            </Box>
          </DialogActions>
        </Dialog>

        {/* ── SESSION EXPIRED DIALOG ──────────────────────────────────────────── */}
        <Dialog
          open={sessionExpired}
          PaperProps={{
            sx: {
              borderRadius: "20px",
              overflow: "hidden",
              background: "rgba(255,248,231,0.98)",
              border: "1px solid rgba(128,0,32,0.15)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              maxWidth: 480,
              width: "100%",
            },
          }}
        >
          {/* Crimson header */}
          <Box
            sx={{
              background: "#800020",
              px: 3.5,
              py: 3,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Lock sx={{ color: "#fff", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  color: "rgba(255,255,255,0.65)",
                  textTransform: "uppercase",
                  mb: 0.3,
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Authentication
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.2,
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Session Expired
              </Typography>
            </Box>
          </Box>

          {/* Gradient accent bar */}
          <Box
            sx={{
              height: 3,
              background: "linear-gradient(90deg, #800020, #e84a4a)",
            }}
          />

          <DialogContent
            sx={{
              background: "transparent",
              pt: 4,
              pb: 2,
              px: 4,
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "rgba(128,0,32,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2.5,
              }}
            >
              <Lock sx={{ color: "#800020", fontSize: 30 }} />
            </Box>
            <Typography
              sx={{
                color: "rgba(75,0,0,0.65)",
                fontSize: "0.88rem",
                lineHeight: 1.75,
                fontFamily: "Poppins, sans-serif",
              }}
            >
              You have been inactive for an extended period. For security
              purposes, your session has expired. Please sign in again to
              continue.
            </Typography>
          </DialogContent>

          <DialogActions
            sx={{
              background: "transparent",
              px: 4,
              pb: 4,
              pt: 1,
              borderTop: "none",
            }}
          >
            <Box
              component="button"
              onClick={handleSessionExpiredClose}
              sx={{
                width: "100%",
                height: 52,
                background: "#800020",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "0.92rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                letterSpacing: "0.04em",
                transition: "background 0.2s",
                "&:hover": { background: "#6a001a" },
              }}
            >
              Back to Sign In
            </Box>
          </DialogActions>
        </Dialog>
      </Box>

      <Box
        component="footer"
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: systemSettings.secondaryColor,
          color: systemSettings.textColor,
          py: 1.5,
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: "45px",
          boxSizing: "border-box",
        }}
      >
        <Box sx={{ width: "50px" }} />

        <Typography
          sx={{ fontWeight: "bold", textAlign: "center", flexGrow: 1 }}
        >
          {systemSettings.footerText}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={() => {
              window.location.href = "/settings?tab=contactus";
            }}
            color="inherit"
            size="small"
            title="Contact Us"
          >
            <ContactSupport fontSize="small" />
          </IconButton>
          <IconButton
            component="a"
            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${systemSettings.adminEmail}`}
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            size="small"
            title="Email Admin"
          >
            <Email fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default function WrappedApp() {
  return (
    <SystemSettingsProvider>
      <SocketProvider>
        <Router>
          <App />
        </Router>
      </SocketProvider>
    </SystemSettingsProvider>
  );
}