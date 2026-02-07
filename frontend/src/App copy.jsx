import React, { useState, createContext, useContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  createTheme,
  ThemeProvider,
  Typography,
  Box,
  IconButton,
  CssBaseline,
} from '@mui/material';
import {
  AccountCircle,
  DarkMode,
  LightMode
} from '@mui/icons-material';
import axios from 'axios';
import ProtectedRoute from './components/ProtectedRoute';
import '@fontsource/poppins';
import earistLogo from './assets/earistLogo.jpg';
import hrisLogo from './assets/hrisLogo.png';

// Create context for dark mode
const DarkModeContext = createContext();

// Custom hook to use dark mode
export const useDarkMode = () => useContext(DarkModeContext);

// Import all components (keeping all your imports)
import Login from './components/Login';
import Register from './components/Register';
import LoadingOverlay from './components/LoadingOverlay';
import SuccessfulOverlay from './components/SuccessfulOverlay';
import AccessDenied from './components/AccessDenied';
import Home from './components/Home';
import Sidebar from './components/Sidebar';
import AdminHome from './components/HomeAdmin';
import ForgotPassword from './components/ForgotPassword';
import AnnouncementForm from './components/Announcement';
import Profile from './components/DASHBOARD/Profile';
import BulkRegister from './components/BulkRegister';
import Registration from './components/Registration';

//DASHBOARD
import PersonalTable from './components/DASHBOARD/PersonTable';
import Children from './components/DASHBOARD/Children';
import College from './components/DASHBOARD/College';
import OtherSkills from './components/DASHBOARD/OtheInformation';
import WorkExperience from './components/DASHBOARD/WorkExperience';
import Vocational from './components/DASHBOARD/Vocational';
import LearningAndDevelopment from './components/DASHBOARD/LearningAndDevelopment';
import VoluntaryWork from './components/DASHBOARD/Voluntary';
import Eligibility from './components/DASHBOARD/Eligibility';
import GraduateTable from './components/DASHBOARD/GraduateStudies';

//ATTENDANCE RECORDS
import ViewAttendanceRecord from './components/ATTENDANCE/AttendanceDevice';
import AttendanceModification from './components/ATTENDANCE/AttendanceModification';
import AttendanceUserState from './components/ATTENDANCE/AttendanceUserState';
import DailyTimeRecord from './components/ATTENDANCE/DailyTimeRecord';
import DailyTimeRecordFaculty from './components/ATTENDANCE/DailyTimeRecordOverall';
import AttendanceForm from './components/ATTENDANCE/AttendanceState';
import AttendanceModule from './components/ATTENDANCE/AttendanceModuleNonTeaching';
import AttendanceModuleFaculty from './components/ATTENDANCE/AttendanceModuleFaculty30hrs';
import AttendanceModuleFaculty40 from './components/ATTENDANCE/AttendanceModuleFacultyDesignated';
import OverallAttendancePage from './components/ATTENDANCE/AttendanceSummary';
import OfficialTimeForm from './components/ATTENDANCE/OfficialTimeForm';

//PAYROLL
import PayrollProcess from './components/PAYROLL/PayrollProcessing';
import Remittances from './components/PAYROLL/Remittances';
import ItemTable from './components/PAYROLL/ItemTable';
import SalaryGradeTable from './components/PAYROLL/SalaryGradeTable';
import DepartmentTable from './components/PAYROLL/DepartmentTable';
import DepartmentAssignment from './components/PAYROLL/DepartmentAssignment';
import Holiday from './components/PAYROLL/Holiday';
import PhilHealthTable from './components/PAYROLL/PhilHealth';
import PayrollProcessed from './components/PAYROLL/PayrollProcessed';
import PayrollReleased from './components/PAYROLL/PayrollReleased';

//FORMS
import AssessmentClearance from './components/FORMS/AssessmentClearance';
import Clearance from './components/FORMS/Clearance';
import ClearanceBack from './components/FORMS/ClearanceBack';
import FacultyClearance from './components/FORMS/FacultyClearance';
import FacultyClearance70Days from './components/FORMS/FacultyClearance70Days';
import InServiceTraining from './components/FORMS/InServiceTraining';
import LeaveCard from './components/FORMS/LeaveCard';
import LeaveCardBack from './components/FORMS/LeaveCardBack';
import LocatorSlip from './components/FORMS/LocatorSlip';
import PermissionToTeach from './components/FORMS/PermissionToTeach';
import RequestForID from './components/FORMS/RequestForID';
import SalnFront from './components/FORMS/SalnFront';
import SalnBack from './components/FORMS/SalnBack';
import ScholarshipAgreement from './components/FORMS/ScholarshipAgreement';
import SubjectStillToBeTaken from './components/FORMS/SubjectStillToBeTaken';
import IndividualFacultyLoading from './components/FORMS/IndividualFacultyLoading';
import HrmsRequestForms from './components/FORMS/HRMSRequestForms';

// PDS
import PDS1 from './components/PDS/PDS1';
import PDS2 from './components/PDS/PDS2';
import PDS3 from './components/PDS/PDS3';
import PDS4 from './components/PDS/PDS4';

//PAYSLIP
import Payslip from './components/PAYROLL/Payslip';
import PayslipOverall from './components/PAYROLL/PayslipOverall';
import PayslipDistribution from './components/PAYROLL/PayslipDistribution';

//LEAVE
import LeaveRequestUser from './components/LEAVE/LeaveRequestUser';
import LeaveTable from './components/LEAVE/LeaveTable';
import LeaveRequest from './components/LEAVE/LeaveRequest';
import LeaveDatePickerModal from './components/LEAVE/LeaveDatePicker';
import LeaveAssignment from './components/LEAVE/LeaveAssignment';
import LeaveCredits from './components/LEAVE/LeaveCredits';

import UsersList from './components/UsersList';
import PagesList from './components/PagesList';
import AuditLogs from './components/AuditLogs';
import SetupDashboard from './components/SetupDashboard';
import Settings from './components/Settings';

function App() {
  const [open, setOpen] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);
  const [open4, setOpen4] = useState(false);
  const [open5, setOpen5] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const location = useLocation();
  const [open6, setOpen6] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const handleClick = () => setOpen(!open);
  const handleClickAttendance = () => setOpen2(!open2);
  const handleClickPayroll = () => setOpen3(!open3);
  const handleClickForms = () => setOpen4(!open4);
  const handleClickPDSFiles = () => setOpen5(!open5);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Create theme - simple and clean
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#6d2323', // Keeping your original color
      },
    },
    typography: {
      fontFamily: 'Poppins, sans-serif',
      body1: { fontSize: '13px' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: darkMode ? '#2b2b2b' : '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: darkMode ? '#555' : '#888',
              borderRadius: '4px',
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${darkMode ? '#333333' : '#e0e0e0'}`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: darkMode ? 'rgba(109, 35, 35, 0.2)' : 'rgba(109, 35, 35, 0.1)',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(109, 35, 35, 0.3)' : 'rgba(109, 35, 35, 0.15)',
              },
            },
          },
        },
      },
    },
  });

  const handleDrawerStateChange = (isOpen, locked) => {
    setDrawerOpen(isOpen);
    if (locked !== undefined) {
      setIsLocked(locked);
    }
  };

  // const handleMainContentClick = (e) => {
  //   if (isLocked && drawerOpen) {
  //     setDrawerOpen(false);
  //     setIsLocked(false);
  //   }
  // };

  const handleItemClick = (item) => {setSelectedItem(item);};

  const drawerWidth = 270; // Width when open
  const collapsedWidth = 60; // Width when collapsed

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            overflow: 'hidden',
            bgcolor: 'background.default',
            color: 'text.primary',
          }}
        >
          {/* Header */}
          <AppBar
            position="fixed"
            sx={{ 
              zIndex: 1201, 
              bgcolor: darkMode ? '#1e1e1e' : '#6d2323', 
              height: '62px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {/* Watermark inside the AppBar */}
            <Box
              component="img"
              src={hrisLogo}
              alt="Watermark"
              sx={{
                position: 'absolute',    
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.05,             
                width: '100%',             
                pointerEvents: 'none',     
                userSelect: 'none',
              }}
            />

            <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {/* EARIST Logo */}
                  <img
                    src={earistLogo} 
                    alt="EARIST Logo" 
                    width="45" 
                    height="45" 
                    style={{
                      marginRight: '10px',
                      border: '1px solid white',
                      borderRadius: '50px',
                      marginLeft: '-15px'
                    }}
                  />

                  <Box>
                    <Typography variant="body2" noWrap sx={{ lineHeight: 1.2, color: 'white', marginTop: '8px' }}>
                      Eulogio "Amang" Rodriguez Institute of Science and Technology
                    </Typography>
                    <Typography variant="subtitle1" noWrap sx={{ color: 'white', fontWeight: 'bold', marginTop: '-5px' }}>
                      Human Resources Information System
                    </Typography>
                  </Box>
                </Box>

                {/* Right side icons */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {/* Dark mode toggle */}
                  <IconButton 
                    color="inherit" 
                    onClick={toggleDarkMode}
                    sx={{ 
                      mr: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    {darkMode ? <LightMode /> : <DarkMode />}
                  </IconButton>
                  
                  {/* User profile icon */}
                  <IconButton 
                    color="inherit"
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                  >
                    <AccountCircle />
                  </IconButton>
                </Box>
            </Toolbar>
          </AppBar>

          {!['/', '/login', '/register', '/forgot-password'].includes(location.pathname) && (
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
              darkMode={darkMode}
            />
          )}

          {/* Main Content */}
          <Box
            component="main"
            // onClick={handleMainContentClick}
            sx={{
              flexGrow: 1,
              bgcolor: 'background.default',
              p: 5,
              marginLeft: drawerOpen ? `${drawerWidth}px` : `${collapsedWidth}px`,
              transition: 'margin-left 0.3s ease',
              fontFamily: 'Poppins, sans-serif',
              minHeight: '100vh',
              color: 'text.primary',
            }}
          >
            <Toolbar />
            <Routes>
              <Route path="/register" element={<Register />} />
              <Route path="/bulk-register" element={<BulkRegister />} />
              <Route path="/registration" element={<Registration />} />
              <Route path="/" element={<Login />} />
              <Route path='/forgot-password' element={<ForgotPassword />}/>
              <Route path='/settings' element={<Settings/>}/>

              <Route
                path="/home"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin', 'staff']}>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/children"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <Children/>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/voluntarywork"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <VoluntaryWork />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learningdev"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LearningAndDevelopment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/eligibility"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <Eligibility />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/college"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <College />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/graduate"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <GraduateTable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vocational"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <Vocational />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workexperience"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <WorkExperience />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/personalinfo"
                element={
                  <ProtectedRoute allowedRoles={['staff', 'administrator', 'superadmin']}>
                    <PersonalTable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/other-information"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <OtherSkills />
                  </ProtectedRoute>
                }
              />
             
              <Route
                path="/view_attendance"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <ViewAttendanceRecord />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search_attendance"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <AttendanceModification />
                  </ProtectedRoute>
                }
              />

               <Route
                path="/attendance-user-state"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin', 'staff']}>
                    <AttendanceUserState />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/daily_time_record"
                element={
                  <ProtectedRoute
                    allowedRoles={['staff', 'administrator', 'superadmin']}
                  >
                    <DailyTimeRecord />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/daily_time_record_faculty"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <DailyTimeRecordFaculty />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance_form"
                element={
                  <ProtectedRoute
                    allowedRoles={['staff', 'administrator', 'superadmin']}
                  >
                    <AttendanceForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance_module" //non-teaching
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <AttendanceModule />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance_module_faculty" //30hrs
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <AttendanceModuleFaculty />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/attendance_module_faculty_40hrs" //40hrs
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <AttendanceModuleFaculty40 />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/attendance_summary"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <OverallAttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/official_time"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <OfficialTimeForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pds1"
                element={
                  <ProtectedRoute
                    allowedRoles={['staff', 'administrator', 'superadmin']}
                  >
                    <PDS1 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pds2"
                element={
                  <ProtectedRoute
                    allowedRoles={['staff', 'administrator', 'superadmin']}
                  >
                    <PDS2 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pds3"
                element={
                  <ProtectedRoute
                    allowedRoles={['staff', 'administrator', 'superadmin']}
                  >
                    <PDS3 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pds4"
                element={
                  <ProtectedRoute
                    allowedRoles={['staff', 'administrator', 'superadmin']}
                  >
                    <PDS4 />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/payroll-table"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <PayrollProcess />
                  </ProtectedRoute>
                }
              />

               <Route
                path="/payroll-processed"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <PayrollProcessed />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/payroll-released"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <PayrollReleased />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/remittance-table"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <Remittances />
                  </ProtectedRoute>
                }
              />

               <Route
                path="/philhealth-table"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <PhilHealthTable />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/item-table"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <ItemTable />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/salary-grade"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <SalaryGradeTable />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/department-table"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <DepartmentTable />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/department-assignment"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <DepartmentAssignment />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-table"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LeaveTable />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-request"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LeaveRequest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-assignment"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LeaveAssignment />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/holiday"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <Holiday />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/assessment-clearance"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <AssessmentClearance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clearance"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <Clearance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clearance-back"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <ClearanceBack />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/faculty-clearance"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <FacultyClearance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty-clearance-70-days"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <FacultyClearance70Days />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hrms-request-forms"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <HrmsRequestForms />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/individual-faculty-loading"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <IndividualFacultyLoading />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/in-service-training"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <InServiceTraining />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave-card"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LeaveCard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave-card-back"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LeaveCardBack />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/locator-slip"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LocatorSlip />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/permission-to-teach"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <PermissionToTeach />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/request-for-id"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <RequestForID />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saln-front"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <SalnFront />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saln-back"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <SalnBack />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scholarship-agreement"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <ScholarshipAgreement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subject"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <SubjectStillToBeTaken />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={['staff','administrator', 'superadmin']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              
              <Route
                path="/announcement"
                element={
                  <ProtectedRoute allowedRoles={['staff','administrator', 'superadmin']}>
                    <AnnouncementForm />
                  </ProtectedRoute>
                }
              />
             
              <Route
                path="/payslip"
                element={
                  <ProtectedRoute allowedRoles={['staff','administrator', 'superadmin']}>
                    <Payslip />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/overall-payslip"
                element={
                  <ProtectedRoute allowedRoles={['staff','administrator', 'superadmin']}>
                    <PayslipOverall />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/distribution-payslip"
                element={
                  <ProtectedRoute allowedRoles={['staff','administrator', 'superadmin']}>
                    <PayslipDistribution />
                  </ProtectedRoute>
                }
              />

               <Route
                path="/loading-overlay"
                element={
                  <ProtectedRoute allowedRoles={['staff','administrator', 'superadmin']}>
                    <LoadingOverlay/>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/successful-overlay"
                element={
                  <ProtectedRoute allowedRoles={['staff','administrator', 'superadmin']}>
                    <SuccessfulOverlay/>
                  </ProtectedRoute>
                }
              />

               <Route
                path="admin-home"
                element={
                  <ProtectedRoute allowedRoles={['staff','administrator', 'superadmin']}>
                    <AdminHome/>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-table"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LeaveTable />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-request"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LeaveRequest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-request-user"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin', 'staff']}>
                    <LeaveRequestUser />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-assignment"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LeaveAssignment />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-date-picker"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <LeaveDatePickerModal />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leave-credits"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin', 'staff']}>
                    <LeaveCredits />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users-list"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <UsersList />
                  </ProtectedRoute>
                }
              />

               <Route
                path="/pages-list"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin', 'staff']}>
                    <PagesList />
                  </ProtectedRoute>
                }
              />

               <Route
                path="/setup-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <SetupDashboard />
                  </ProtectedRoute>
                }
              />

              
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'superadmin']}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />

              <Route path="/access-denied" element={<AccessDenied />} />
            </Routes>
          </Box>

          {/* Footer */}
          <Box
            component="footer"
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              width: '100%',
              zIndex: (theme) => theme.zIndex.drawer + 1,
              bgcolor: darkMode ? '#1e1e1e' : '#6d2323',
              color: 'white',
              textAlign: 'center',
              padding: '20px',
              height: '10px',
              overflow: 'hidden',
              borderTop: `1px solid ${darkMode ? '#333333' : 'rgba(255,255,255,0.2)'}`,
            }}
          >
            {/* Watermark */}
            <Box
              component="img"
              src={hrisLogo}
              alt="Watermark"
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.05,        
                width: '100%',        
                pointerEvents: 'none', 
                userSelect: 'none',
                zIndex: 0,            
              }}
            />

            {/* Footer Text */}
            <Typography variant="body2" sx={{ zIndex: 1, position: 'relative' }}>
              {'© 2025 EARIST Manila - Human Resources Information System. All rights Reserved.'}
            </Typography>
          </Box>
        </Box>
      </ThemeProvider>
    </DarkModeContext.Provider>
  );
}

export default function WrappedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}



import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Lock as LockIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

{/* 
  --- IDLE WARNING DIALOG --- 
  Features: Countdown timer, progress bar, clear icons.
*/}
<Dialog
  open={idleWarningOpen && isAuthenticatedPage}
  PaperProps={{
    sx: {
      borderRadius: 3, // Softer, modern corners
      px: 2,
      pb: 2,
      width: '100%',
      maxWidth: '450px' // Constrain width for professional look
    }
  }}
>
  {/* Optional: Add a top colored border or accent */}
  <Box sx={{ height: 6, bgcolor: 'warning.main', borderRadius: '12px 12px 0 0' }} />

  <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
      {/* Warning Icon Circle */}
      <Box
        sx={{
          bgcolor: 'warning.lighter',
          color: 'warning.main',
          p: 1.5,
          borderRadius: '50%',
        }}
      >
        <TimeIcon fontSize="large" />
      </Box>
    </Box>
    <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
      Session Expiring Soon
    </Typography>
  </DialogTitle>

  <DialogContent sx={{ textAlign: 'center', py: 1 }}>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
      You have been idle for a while. For your security, you will be logged out in:
    </Typography>
    
    {/* Interactive Countdown Timer */}
    <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold', my: 1 }}>
      {/* {formatTime(countdown)} */}
      00:30 
    </Typography>

    {/* Visual Progress Bar indicating time left */}
    <LinearProgress 
      variant="determinate" 
      value={(30 / 30) * 100} // Map your remaining time to percentage
      sx={{ 
        height: 8, 
        borderRadius: 4,
        bgcolor: 'grey.200',
        mt: 1
      }} 
      color="warning"
    />
  </DialogContent>

  <DialogActions sx={{ justifyContent: 'center', gap: 2, pt: 2 }}>
    <Button
      onClick={() => {
        setIdleWarningOpen(false);
        resetIdleTimer();
      }}
      variant="contained"
      size="large"
      sx={{ px: 4, py: 1, fontWeight: 600 }}
    >
      Stay Logged In
    </Button>
    <Button
      onClick={handleLogout}
      color="inherit"
      startIcon={<LogoutIcon />}
      sx={{ fontWeight: 500 }}
    >
      Logout
    </Button>
  </DialogActions>
</Dialog>


{/* 
  --- SESSION EXPIRED DIALOG --- 
  Features: "Locked" aesthetic, single clear action, serious tone.
*/}
<Dialog
  open={sessionExpired}
  PaperProps={{
    sx: {
      borderRadius: 3,
      px: 2,
      pb: 2,
      width: '100%',
      maxWidth: '400px'
    }
  }}
>
  <Box sx={{ height: 6, bgcolor: 'error.main', borderRadius: '12px 12px 0 0' }} />

  <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
      {/* Lock Icon Circle */}
      <Box
        sx={{
          bgcolor: 'error.lighter',
          color: 'error.main',
          p: 1.5,
          borderRadius: '50%',
        }}
      >
        <LockIcon fontSize="large" />
      </Box>
    </Box>
    <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
      Session Expired
    </Typography>
  </DialogTitle>

  <DialogContent sx={{ textAlign: 'center', py: 1 }}>
    <Typography variant="body1" color="text.secondary">
      You've been inactive for an extended period. For your security, your session has been terminated.
    </Typography>
  </DialogContent>

  <DialogActions sx={{ justifyContent: 'center', pt: 2 }}>
    <Button
      onClick={handleSessionExpiredClose}
      variant="contained"
      color="primary"
      size="large"
      sx={{ px: 4, py: 1, fontWeight: 600 }}
      fullWidth
    >
      Return to Login
    </Button>
  </DialogActions>
</Dialog>