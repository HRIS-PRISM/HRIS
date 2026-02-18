import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  IconButton, Modal, Tooltip, Container, Box, Grid, Menu, MenuItem, Divider, Dialog, Typography, Avatar, Button, Badge, Chip, Fade, Grow, Card, CardContent, Skeleton, LinearProgress
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  Notifications as NotificationsIcon,
  ArrowDropDown as ArrowDropDownIcon,
  AccessTime, AccountBalance, Description, Download, KeyboardArrowDown, Person, ContactPage, Receipt, UploadFile,
  PlayArrow, Pause, Close as CloseIcon, TrendingUp, TrendingDown,
  AccountCircle, Settings, HelpOutline, PrivacyTip, Logout, Autorenew as AutorenewIcon
} from '@mui/icons-material';
import logo from "../assets/logo.PNG";

// Color palette from AdminHome
const primaryGradient = "linear-gradient(135deg, #800020, #A52A2A)";
const primaryHoverGradient = "linear-gradient(135deg, #A52A2A, #800020)";
const darkText = "#4B0000";
const mediumText = "#800020";
const cardBackground = "rgba(255,248,231,0.85)";
const cardBorder = "rgba(128,0,32,0.15)";
const cardShadow = "0 15px 40px rgba(128,0,32,0.2)";

const Home = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const [logoutOpen, setLogoutOpen] = useState(false);
  
  const navigate = useNavigate();
  const month = calendarDate.getMonth();
  const year = calendarDate.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const [attendance, setAttendance] = useState({
    timeIn: '00:00:00',
    breakIn: '00:00:00',
    breakOut: '00:00:00',
    timeOut: '00:00:00',
  });

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    setLogoutOpen(true);
    setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/";
    }, 500); 
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
      setCurrentTime(new Date());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getUserInfo = () => {
    const token = localStorage.getItem('token');
    if (!token) return {};
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return {
        role: decoded.role,
        employeeNumber: decoded.employeeNumber,
        username: decoded.username,
      };
    } catch (err) {
      console.error('Error decoding token:', err);
      return {};
    }
  };

  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo.username) setUsername(userInfo.username);
    if (userInfo.employeeNumber) setEmployeeNumber(userInfo.employeeNumber);
  }, []);

  // Fetch today's attendance - using same logic as AttendanceUserState
  useEffect(() => {
    if (!employeeNumber) return;
    
    const fetchAttendance = async () => {
      try {
        const token = localStorage.getItem('token');
        const today = new Date();
        const formattedToday = today.toISOString().substring(0, 10);
        
        // Adjust dates to ensure records are captured (backend quirk workaround)
        const adjustedStartDate = new Date(formattedToday);
        adjustedStartDate.setDate(adjustedStartDate.getDate() - 1);
        const adjustedStart = adjustedStartDate.toISOString().substring(0, 10);
        
        const adjustedEndDate = new Date(formattedToday);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
        const adjustedEnd = adjustedEndDate.toISOString().substring(0, 10);
        
        const response = await axios.post(
          `${API_BASE_URL}/attendance/api/attendance`,
          { 
            personID: employeeNumber, 
            startDate: adjustedStart, 
            endDate: adjustedEnd 
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        console.log('Attendance response:', response.data);
        
        if (response.data && response.data.length > 0) {
          // Filter for today's records - handle MM/DD/YYYY format from API
          const todayRecords = response.data.filter(record => {
            // Convert MM/DD/YYYY to YYYY-MM-DD for comparison
            const dateParts = record.Date.split('/');
            if (dateParts.length === 3) {
              const month = dateParts[0].padStart(2, '0');
              const day = dateParts[1].padStart(2, '0');
              const year = dateParts[2];
              const recordDate = `${year}-${month}-${day}`;
              console.log('Comparing:', recordDate, 'with', formattedToday);
              return recordDate === formattedToday;
            }
            return false;
          });
          
          console.log('Today\'s filtered records:', todayRecords);
          
          const timeIn = todayRecords.find(r => r.AttendanceState === 1)?.Time || '00:00:00';
          const breakIn = todayRecords.find(r => r.AttendanceState === 3)?.Time || '00:00:00';
          const breakOut = todayRecords.find(r => r.AttendanceState === 2)?.Time || '00:00:00';
          const timeOut = todayRecords.find(r => r.AttendanceState === 4)?.Time || '00:00:00';
          
          console.log('Extracted times:', { timeIn, breakIn, breakOut, timeOut });
          
          setAttendance({
            timeIn,
            breakIn,
            breakOut,
            timeOut,
          });
        } else {
          setAttendance({
            timeIn: '00:00:00',
            breakIn: '00:00:00',
            breakOut: '00:00:00',
            timeOut: '00:00:00',
          });
        }
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setAttendance({
          timeIn: '00:00:00',
          breakIn: '00:00:00',
          breakOut: '00:00:00',
          timeOut: '00:00:00',
        });
      }
    };

  fetchAttendance();
  const intervalId = setInterval(fetchAttendance, 1000);
  return () => clearInterval(intervalId);
}, [employeeNumber]);
  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/announcements`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setAnnouncements(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setAnnouncements([]);
      }
    };
    fetchAnnouncements();
  }, []);

  // Auto slide
  useEffect(() => {
    if (announcements.length === 0 || !autoPlay) return;
    const t = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(t);
  }, [announcements, autoPlay]);

  const handlePrevSlide = () => {
    if (announcements.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + announcements.length) % announcements.length);
  };
  
  const handleNextSlide = () => {
    if (announcements.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % announcements.length);
  };

  const handleOpenModal = (announcement) => {
    setSelectedAnnouncement(announcement);
    setOpenModal(true);
  };
  
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedAnnouncement(null);
  };

  // Fetch profile picture
  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/personalinfo/person_table`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const list = Array.isArray(res.data) ? res.data : [];
        const match = list.find((p) => String(p.agencyEmployeeNum) === String(employeeNumber));
        if (match && match.profile_picture) setProfilePicture(match.profile_picture);
        const fullNameFromPerson = `${match.firstName || ''} ${match.middleName || ''} ${match.lastName || ''} ${match.nameExtension || ''}`.trim();
        if (fullNameFromPerson) {
          setFullName(fullNameFromPerson);
        }
      } catch (err) {
        console.error('Error loading profile picture:', err);
      }
    };
    if (employeeNumber) fetchProfilePicture();
  }, [employeeNumber]);

  // Fetch payroll
  useEffect(() => {
    const fetchPayrollData = async () => {
      if (!employeeNumber) return;
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/finalized-payroll`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const list = Array.isArray(res.data) ? res.data : [];
        const userPayroll = list.find((p) =>
          String(p.employeeNumber) === String(employeeNumber) ||
          String(p.agencyEmployeeNum) === String(employeeNumber)
        );
        setPayrollData(userPayroll || null);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching payroll:', err);
        setLoading(false);
      }
    };
    fetchPayrollData();
  }, [employeeNumber]);

  const formatCurrency = (value) => {
    if (value === undefined || value === null || value === '' || value === '0') return '₱0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '₱0.00';
    return `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/holiday`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
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
        }
      } catch (err) {
        console.error("Error fetching holidays:", err);
      }
    };
    fetchHolidays();
  }, []);

  // Calendar generation
  const generateCalendar = () => {
    const days = [];
    const totalCells = 42;
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < adjustedFirstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    const remaining = totalCells - days.length;
    for (let i = 0; i < remaining; i++) days.push(null);
    return days;
  };
  
  const calendarDays = generateCalendar();

  return (
    <Box sx={{ 
      background: '#6d2323', 
      minHeight: '85%', 
      py: 1.5, 
      borderRadius: '14px',
      mt: -2,
    }}>
      <Container maxWidth="xl" sx={{ px: 2, pt: 2 }}>
        {/* Header */}
        <Grow in timeout={300}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              background: cardBackground,
              backdropFilter: 'blur(15px)',
              borderRadius: 4,
              p: 2,
              border: `1px solid ${cardBorder}`,
              boxShadow: cardShadow,
            }}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: darkText,
                  fontWeight: 700,
                }}
              >
                Hello, {fullName || username}!
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#666666',
                  mt: 0.25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <AccessTime sx={{ fontSize: 14 }} />
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                <span style={{ marginLeft: '8px' }}>
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Tooltip title="Refresh">
                <IconButton
                  size="small"
                  sx={{
                    bgcolor: 'rgba(128, 0, 32, 0.1)',
                    '&:hover': { bgcolor: 'rgba(128, 0, 32, 0.2)' },
                    color: mediumText,
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
                    bgcolor: 'rgba(128, 0, 32, 0.1)',
                    '&:hover': { bgcolor: 'rgba(128, 0, 32, 0.2)' },
                    color: mediumText,
                  }}
                  onClick={() => setNotifModalOpen(true)}
                >
                  <Badge badgeContent={announcements.length} color="error" max={9}>
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Box
                sx={{
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: -2,
                    borderRadius: '50%',
                    padding: '2px',
                    background: primaryGradient,
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
                    minWidth: 180, 
                    backgroundColor: '#FEF9E1',
                    border: `1px solid ${cardBorder}`,
                    boxShadow: cardShadow,
                    '& .MuiMenuItem-root': { 
                      fontSize: '0.875rem',
                      '&:hover': { 
                        background: 'rgba(128, 0, 32, 0.1)' 
                      }, 
                    }, 
                  }, 
                }} 
              > 
                <MenuItem onClick={() => { handleMenuClose(); navigate("/profile"); }}>
                  <AccountCircle sx={{ mr: 1, fontSize: 20 }} /> Profile
                </MenuItem> 
                <MenuItem onClick={() => { handleMenuClose(); navigate("/settings"); }}>
                  <Settings sx={{ mr: 1, fontSize: 20 }} /> Settings
                </MenuItem> 
                <MenuItem onClick={() => { handleMenuClose(); navigate("/faqs"); }}>
                  <HelpOutline sx={{ mr: 1, fontSize: 20 }} /> FAQs
                </MenuItem> 
                <MenuItem onClick={() => { handleMenuClose(); navigate("/privacy-policy"); }}>
                  <PrivacyTip sx={{ mr: 1, fontSize: 20 }} /> Privacy Policy
                </MenuItem> 
                <Divider sx={{ borderColor: cardBorder }} /> 
                <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }}>
                  <Logout sx={{ mr: 1, fontSize: 20 }} /> Sign Out
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Grow>

        {/* Main Content Area */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Grow in timeout={400}>
              <Card sx={{
                background: cardBackground,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${cardBorder}`,
                borderRadius: 4,
                boxShadow: cardShadow,
                height: '80%',
                transition: 'all 0.3s',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  boxShadow: '0 20px 50px rgba(128,0,32,0.3)' 
                }
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ color: darkText, fontWeight: 700, mb: 2 }}>
                    Today's Attendance
                  </Typography>
                  <Link to="/attendance-user-state" style={{ textDecoration: 'none' }}>
                  <Grid container spacing={1}>
                      {[
                        { label: 'TIME IN', value: attendance.timeIn },
                        { label: 'BREAK IN', value: attendance.breakIn },      // Going to lunch
                        { label: 'BREAK OUT', value: attendance.breakOut },    // Returning from lunch
                        { label: 'TIME OUT', value: attendance.timeOut },
                      ].map((item, idx) => (
                        <Grid item xs={6} key={idx}>
                          <Box sx={{
                            background: `${mediumText}10`,
                            backdropFilter: 'blur(10px)',
                            border: `1px solid ${cardBorder}`,
                            borderRadius: 2,
                            p: 1.5,
                            textAlign: 'center',
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              background: `${mediumText}20`,
                            }
                          }}>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: mediumText, mb: 0.5 }}>
                              {item.label}
                            </Typography>
                            <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: darkText }}>
                              {item.value}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Link>
                </CardContent>
              </Card>
            </Grow>
          </Grid>

          <Grid item xs={12} md={3}>
            <Grow in timeout={500}>
              <Card sx={{
                background: cardBackground,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${cardBorder}`,
                borderRadius: 4,
                boxShadow: cardShadow,
                height: '80%',
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 20px 50px rgba(128,0,32,0.3)' }
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ color: darkText, fontWeight: 600}}>
                    Payslip
                  </Typography>
                  
                  {/* Payslip Section */}
                  <Box sx={{ mb: 1 }}>
                    <Link to="/payslip" style={{ textDecoration: 'none' }}>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Box sx={{
                            background: `${mediumText}10`,
                            backdropFilter: 'blur(10px)',
                            borderRadius: 2,
                            p: 1,
                            textAlign: 'center',
                            transition: 'all 0.3s',
                            '&:hover': { transform: 'scale(1.05)' }
                          }}>
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: mediumText, mb: 0.5 }}>
                              1st Pay
                            </Typography>
                            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: darkText }}>
                              {payrollData ? formatCurrency(payrollData.pay1st) : '₱00.00'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{
                            background: `${mediumText}10`,
                            backdropFilter: 'blur(10px)',
                            borderRadius: 2,
                            p: 1,
                            textAlign: 'center',
                            transition: 'all 0.3s',
                            '&:hover': { transform: 'scale(1.05)' }
                          }}>
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: mediumText, mb: 0.5 }}>
                              2nd Pay
                            </Typography>
                            <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: darkText }}>
                              {payrollData ? formatCurrency(payrollData.pay2nd) : '₱00.00'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Link>
                  </Box>

                  {/* Leave Balance Section */}
                  <Box>
                    <Typography variant="h6" sx={{ color: darkText, fontWeight: 600 }}>
                    Leave Balance
                    </Typography>
                    <Box sx={{
                      background: `${mediumText}10`,
                      backdropFilter: 'blur(10px)',
                      borderRadius: 2,
                      p: 1,
                      textAlign: 'center'
                    }}>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: mediumText, mb: 0.5 }}>
                        All Leaves
                      </Typography>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: darkText }}>
                        386
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grow>
          </Grid>

          {/* Calendar - Now aligned with top row */}
          <Grid item xs={12} md={4}>
            <Grow in timeout={600}>
              <Card sx={{
                background: cardBackground,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${cardBorder}`,
                borderRadius: 4,
                p: 2,
                boxShadow: cardShadow,
                height: '90%',
                transition: 'all 0.3s',
                '&:hover': { boxShadow: '0 20px 50px rgba(128,0,32,0.3)' }
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <IconButton size="small"
                    onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                    sx={{ bgcolor: `${mediumText}10`, '&:hover': { bgcolor: `${mediumText}20` }, color: mediumText }}>
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: darkText }}>
                    {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Typography>
                  <IconButton size="small"
                    onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                    sx={{ bgcolor: `${mediumText}10`, '&:hover': { bgcolor: `${mediumText}20` }, color: mediumText }}>
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Grid container spacing={0.5} sx={{ mb: 1 }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <Grid item xs={12 / 7} key={day}>
                      <Typography sx={{ textAlign: 'center', fontWeight: 700, fontSize: '0.7rem', color: '#666666', py: 0.5 }}>
                        {day}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                <Grid container spacing={0.5}>
                  {calendarDays.map((day, index) => {
                    const currentDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const holidayData = holidays.find(h => h.date === currentDate && h.status === "Active");
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                    return (
                      <Grid item xs={12 / 7} key={index}>
                        <Tooltip title={holidayData ? holidayData.name : isToday ? "Today" : ""} arrow>
                          <Box sx={{
                            textAlign: 'center',
                            py: 0.8,
                            fontSize: '0.8rem',
                            borderRadius: 1,
                            color: holidayData ? '#ffffff' : day ? darkText : 'transparent',
                            background: holidayData ? primaryGradient : isToday ? `${mediumText}20` : 'transparent',
                            fontWeight: holidayData || isToday ? 700 : 400,
                            cursor: holidayData ? 'pointer' : 'default',
                            transition: 'all 0.3s',
                            border: isToday && !holidayData ? `1px solid ${mediumText}` : 'none',
                            '&:hover': holidayData || isToday ? {
                              transform: 'scale(1.15)',
                              boxShadow: holidayData ? '0 4px 12px rgba(128,0,32,0.3)' : '0 4px 12px rgba(128,0,32,0.2)',
                              zIndex: 10
                            } : {}
                          }}>
                            {day || ""}
                          </Box>
                        </Tooltip>
                      </Grid>
                    );
                  })}
                </Grid>
              </Card>
            </Grow>
          </Grid>

          {/* Bottom Row - Slideshow and Quick Actions */}
          <Grid item xs={12} md={8}>
            <Fade in timeout={800}>
              <Card sx={{
                background: cardBackground,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${cardBorder}`,
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: cardShadow,
                position: 'relative',
                mt: -7
              }}>
                <Box sx={{ position: 'relative', height: 450, cursor: 'pointer' }} onClick={() => {
                  const announcement = announcements[currentSlide];
                  if (announcement) handleOpenModal(announcement);
                }}>
                  {announcements.length > 0 ? (
                    <>
                      <Box component="img"
                        src={announcements[currentSlide]?.image ? `${API_BASE_URL}${announcements[currentSlide].image}` : "/api/placeholder/800/400"}
                        alt={announcements[currentSlide]?.title || "Announcement"}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s ease' }}
                      />
                      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 70%)' }} />
                      
                      <IconButton onClick={(e) => { e.stopPropagation(); handlePrevSlide(); }}
                        sx={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(128, 0, 32, 0.3)', backdropFilter: 'blur(10px)', border: `1px solid ${cardBorder}`, '&:hover': { bgcolor: 'rgba(128, 0, 32, 0.5)', transform: 'translateY(-50%) scale(1.1)' }, color: '#ffffff', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', transition: 'all 0.3s' }}>
                        <ArrowBackIosNewIcon />
                      </IconButton>
                      
                      <IconButton onClick={(e) => { e.stopPropagation(); handleNextSlide(); }}
                        sx={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(128, 0, 32, 0.3)', backdropFilter: 'blur(10px)', border: `1px solid ${cardBorder}`, '&:hover': { bgcolor: 'rgba(128, 0, 32, 0.5)', transform: 'translateY(-50%) scale(1.1)' }, color: '#ffffff', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', transition: 'all 0.3s' }}>
                        <ArrowForwardIosIcon />
                      </IconButton>
                      
                      <IconButton onClick={(e) => { e.stopPropagation(); setAutoPlay(!autoPlay); }}
                        sx={{ position: 'absolute', top: 24, right: 24, bgcolor: 'rgba(128, 0, 32, 0.3)', backdropFilter: 'blur(10px)', border: `1px solid ${cardBorder}`, '&:hover': { bgcolor: 'rgba(128, 0, 32, 0.5)', transform: 'scale(1.1)' }, color: '#ffffff', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', transition: 'all 0.3s' }}>
                        {autoPlay ? <Pause /> : <PlayArrow />}
                      </IconButton>

                      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 4, color: '#ffffff' }}>
                        <Chip label="ANNOUNCEMENT" size="small" sx={{ mb: 2, bgcolor: 'rgba(128, 0, 32, 0.5)', backdropFilter: 'blur(10px)', color: '#ffffff', fontWeight: 700, fontSize: '0.7rem', border: '1px solid rgba(254, 249, 225, 0.3)' }} />
                        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, textShadow: '0 4px 12px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
                          {announcements[currentSlide]?.title}
                        </Typography>
                        <Typography sx={{ opacity: 0.95, fontSize: '1rem', textShadow: '0 2px 8px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTime sx={{ fontSize: 18 }} />
                          {new Date(announcements[currentSlide]?.date).toDateString()}
                        </Typography>
                      </Box>

                      <Box sx={{ position: 'absolute', bottom: 24, right: 24, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        {announcements.map((_, idx) => (
                          <Box key={idx}
                            sx={{ width: currentSlide === idx ? 32 : 10, height: 10, borderRadius: 5, bgcolor: currentSlide === idx ? '#ffffff' : 'rgba(254,249,225,0.4)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', border: '1px solid rgba(254,249,225,0.3)', '&:hover': { bgcolor: 'rgba(254,249,225,0.7)', transform: 'scale(1.2)' } }}
                            onClick={(e) => { e.stopPropagation(); setCurrentSlide(idx); }}
                          />
                        ))}
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
                      <NotificationsIcon sx={{ fontSize: 80, color: 'rgba(128, 0, 32, 0.3)' }} />
                      <Typography variant="h5" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>No announcements available</Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Fade>
          </Grid>

          {/* Quick Actions - Now below the calendar */}
          <Grid item xs={12} md={4}>
            <Grow in timeout={700}>
              <Card sx={{
                background: cardBackground,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${cardBorder}`,
                borderRadius: 4,
                p: 2,
                boxShadow: cardShadow,
                height: '91%'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: darkText }}>
                  Quick Actions
                </Typography>
                <Grid container spacing={1}>
                  {[
                    { label: "DTR", link: "/daily_time_record", icon: <AccessTime /> },
                    { label: "PDS", link: "/pds1", icon: <ContactPage /> },
                    { label: "Payslip", link: "/payslip", icon: <Receipt /> },
                    { label: "Leave", link: "/leave-request-user", icon: <UploadFile /> },
                    { label: "Attendance", link: "/attendance-user-state", icon: <Person /> },
                  ].map((item, i) => (
                    <Grid item xs={6} key={i}>
                      <Grow in timeout={800 + i * 100}>
                        <Link to={item.link} style={{ textDecoration: "none" }}>
                          <Box sx={{
                            p: 1.5,
                            borderRadius: 2,
                            background: `${mediumText}10`,
                            border: `1px solid ${cardBorder}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1,
                            transition: 'all 0.3s',
                            cursor: 'pointer',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              background: `${mediumText}20`,
                              boxShadow: '0 8px 24px rgba(128,0,32,0.2)'
                            }
                          }}>
                            <Box sx={{
                              color: mediumText,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'transform 0.3s',
                              '&:hover': { transform: 'rotate(360deg)' }
                            }}>
                              {React.cloneElement(item.icon, { sx: { fontSize: 24 } })}
                            </Box>
                            <Typography sx={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: darkText,
                              textAlign: 'center'
                            }}>
                              {item.label}
                            </Typography>
                          </Box>
                        </Link>
                      </Grow>
                    </Grid>
                  ))}
                </Grid>
              </Card>
            </Grow>
          </Grid>
        </Grid>
      </Container>

      {/* Announcement Modal */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <Fade in={openModal}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: 800,
            bgcolor: cardBackground,
            backdropFilter: 'blur(40px)',
            border: `1px solid ${cardBorder}`,
            boxShadow: '0 24px 64px rgba(128,0,32,0.5)',
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
                    <Box component="img"
                      src={`${API_BASE_URL}${selectedAnnouncement.image}`}
                      alt={selectedAnnouncement.title}
                      sx={{ width: '100%', height: 350, objectFit: 'cover' }}
                    />
                  )}
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(128,0,32,0.7) 100%)' }} />
                  <IconButton onClick={handleCloseModal}
                    sx={{ position: 'absolute', top: 20, right: 20, bgcolor: 'rgba(128, 0, 32, 0.3)', backdropFilter: 'blur(10px)', border: `1px solid ${cardBorder}`, color: '#ffffff', '&:hover': { bgcolor: 'rgba(128, 0, 32, 0.5)', transform: 'rotate(90deg)' }, transition: 'all 0.3s' }}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Box sx={{ p: 4, overflowY: 'auto' }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, color: darkText, textShadow: '0 2px 10px rgba(128,0,32,0.3)' }}>
                    {selectedAnnouncement.title}
                  </Typography>
                  <Chip icon={<AccessTime style={{ color: mediumText }} />}
                    label={new Date(selectedAnnouncement.date).toLocaleDateString()}
                    sx={{ mb: 3, bgcolor: 'rgba(128, 0, 32, 0.3)', backdropFilter: 'blur(10px)', color: mediumText, border: `1px solid ${cardBorder}` }}
                  />
                  <Typography variant="body1" sx={{ color: mediumText, lineHeight: 1.8, fontSize: '1.05rem' }}>
                    {selectedAnnouncement.about}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Fade>
      </Modal>

      {/* Notifications Modal */}
      <Modal open={notifModalOpen} onClose={() => setNotifModalOpen(false)}>
        <Fade in={notifModalOpen}>
          <Box sx={{
            position: 'absolute',
            top: 100,
            right: 24,
            width: 420,
            maxWidth: '90vw',
            bgcolor: cardBackground,
            backdropFilter: 'blur(40px)',
            border: `1px solid ${cardBorder}`,
            boxShadow: '0 24px 64px rgba(128,0,32,0.5)',
            borderRadius: 4,
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 140px)'
          }}>
            <Box sx={{
              p: 3,
              borderBottom: `1px solid ${cardBorder}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(128, 0, 32, 0.1) 0%, rgba(165, 42, 42, 0.05) 100%)'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: darkText }}>
                Notifications
              </Typography>
              <IconButton size="small" onClick={() => setNotifModalOpen(false)}
                sx={{ color: mediumText, '&:hover': { bgcolor: 'rgba(128, 0, 32, 0.1)', transform: 'rotate(90deg)' }, transition: 'all 0.3s' }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', p: 2 }}>
              {announcements.slice(0, 8).map((item, idx) => (
                <Grow in timeout={300 + idx * 50} key={idx}>
                  <Box sx={{
                    mb: 2,
                    p: 2.5,
                    borderRadius: 3,
                    background: 'rgba(128, 0, 32, 0.05)',
                    border: `1px solid ${cardBorder}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: 'rgba(128, 0, 32, 0.1)',
                      transform: 'translateX(8px)',
                      boxShadow: '0 8px 24px rgba(128,0,32,0.2)'
                    }
                  }}
                    onClick={() => {
                      setSelectedAnnouncement(item);
                      setNotifModalOpen(false);
                      setOpenModal(true);
                    }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: darkText, mb: 0.5, lineHeight: 1.4 }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#666666', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime sx={{ fontSize: 14 }} />
                      {item.date ? new Date(item.date).toLocaleDateString() : ""}
                    </Typography>
                  </Box>
                </Grow>
              ))}
              {announcements.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <NotificationsIcon sx={{ fontSize: 80, color: 'rgba(128, 0, 32, 0.2)', mb: 2 }} />
                  <Typography sx={{ color: '#666666', fontSize: '1rem' }}>
                    No notifications at the moment
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* Logout Dialog */}
      <Dialog
        open={logoutOpen}
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
                background: i % 2 === 0 ? "rgba(128,0,32,0.8)" : "rgba(255,248,225,0.8)",
                position: "absolute",
                top: "50%",
                left: "50%",
                transformOrigin: "-60px 0px",
                animation: `orbit${i} ${3 + i}s linear infinite`,
                boxShadow: "0 0 15px rgba(128,0,32,0.5), 0 0 8px rgba(255,248,225,0.5)",
              }}
            />
          ))}

          <Box sx={{ position: "relative", width: 120, height: 120 }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, #A52A2A, #800020)",
                boxShadow: "0 0 40px rgba(128,0,32,0.7), 0 0 80px rgba(128,0,32,0.5)",
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
                  boxShadow: "0 0 20px rgba(128,0,32,0.7), 0 0 10px #FFF8E1",
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
              color: "#FFF8E1",
              textShadow: "0 0 10px #800020",
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
    </Box>
  );
};

export default Home;