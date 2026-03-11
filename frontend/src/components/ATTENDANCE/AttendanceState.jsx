import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useSocket } from "../../contexts/SocketContext";
import {
  Box,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Fade,
  Container,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  Badge,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Fab,
  Zoom,
  alpha,
  styled,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
} from "@mui/material";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePageAccess from '../../hooks/usePageAccess';
import AccessDenied from '../AccessDenied';
import CircularProgress from '@mui/material/CircularProgress';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '109, 35, 35';
};

import {
  FilterList,
  Search,
  Person,
  CalendarToday,
  Today,
  ArrowBackIos,
  ArrowForwardIos,
  Clear,
  Refresh,
  MoreVert,
  Info,
  CheckCircle,
  Cancel,
  AccessTime,
  KeyboardArrowUp,
  KeyboardArrowDown,
} from "@mui/icons-material";

// ─────────────────────────────────────────────
// WIREFRAME — matches AttendanceUserState style
// ─────────────────────────────────────────────
const ausShimmerKeyframes = `
@keyframes ausShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes ausPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
`;

const SkeletonBox = ({ width = '100%', height = 16, borderRadius = 8, sx = {} }) => (
  <Box sx={{
    width, height, borderRadius: `${borderRadius}px`,
    background: 'linear-gradient(90deg,rgba(109,35,35,0.08) 25%,rgba(109,35,35,0.18) 50%,rgba(109,35,35,0.08) 75%)',
    backgroundSize: '800px 100%',
    animation: 'ausShimmer 1.5s infinite linear',
    flexShrink: 0,
    ...sx,
  }} />
);

const AllAttendanceWireframe = ({ accentColor = '#6d2323', primaryColor = '#FEF9E1', secondaryColor = '#FFF8E7' }) => (
  <>
    <style>{ausShimmerKeyframes}</style>
    <Box sx={{ py: 4, width: '100vw', maxWidth: '100%', position: 'relative', left: '53%', transform: 'translateX(-51%)', px: { xs: 2, sm: 3, md: 6 } }}>

      {/* Header card skeleton */}
      <Box sx={{ mb: 4, borderRadius: '20px', overflow: 'hidden', border: `1px solid ${alpha(accentColor, 0.1)}`, animation: 'ausPulse 2s ease-in-out infinite' }}>
        <Box sx={{ p: 5, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: alpha(accentColor, 0.12), mr: 4, flexShrink: 0 }} />
              <Box>
                <SkeletonBox width={220} height={28} borderRadius={6} sx={{ mb: 1.5 }} />
                <SkeletonBox width={280} height={14} borderRadius={4} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <SkeletonBox width={120} height={24} borderRadius={12} />
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: alpha(accentColor, 0.10) }} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Controls card skeleton */}
      <Box sx={{ mb: 4, borderRadius: '20px', overflow: 'hidden', border: `1px solid ${alpha(accentColor, 0.1)}`, bgcolor: primaryColor, animation: 'ausPulse 2s ease-in-out 0.08s infinite' }}>
        <Box sx={{ p: 4 }}>
          {/* 3 input fields */}
          <Grid container spacing={4} sx={{ mb: 3 }}>
            {[...Array(3)].map((_, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Box sx={{ height: 56, borderRadius: '12px', border: `1px solid ${alpha(accentColor, 0.15)}`, bgcolor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', px: 2, gap: 1.5 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: alpha(accentColor, 0.18), flexShrink: 0 }} />
                  <SkeletonBox width="55%" height={13} borderRadius={4} />
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ borderBottom: `1px solid ${alpha(accentColor, 0.1)}`, mb: 3 }} />

          {/* Month & year row */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: alpha(accentColor, 0.15) }} />
              <SkeletonBox width={260} height={16} borderRadius={4} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(13, minmax(0, 1fr))', gap: 1.25 }}>
              {[...Array(12)].map((_, i) => (
                <SkeletonBox key={i} height={36} borderRadius={8} />
              ))}
              <Box sx={{ height: 36, borderRadius: '8px', border: `1px solid ${alpha(accentColor, 0.2)}`, bgcolor: 'white' }} />
            </Box>
          </Box>

          {/* Quick filter buttons */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: alpha(accentColor, 0.15) }} />
              <SkeletonBox width={80} height={16} borderRadius={4} />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[90, 110, 120, 130, 100].map((w, i) => (
                <SkeletonBox key={i} width={w} height={40} borderRadius={10} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Results table skeleton */}
      <Box sx={{ borderRadius: '20px', overflow: 'hidden', border: `1px solid ${alpha(accentColor, 0.1)}`, animation: 'ausPulse 2s ease-in-out 0.15s infinite' }}>
        <Box sx={{ p: 4, background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <SkeletonBox width={120} height={11} borderRadius={3} sx={{ mb: 1 }} />
            <SkeletonBox width={180} height={28} borderRadius={6} />
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <SkeletonBox width={90} height={11} borderRadius={3} sx={{ mb: 0.5, ml: 'auto' }} />
            <SkeletonBox width={140} height={11} borderRadius={3} sx={{ ml: 'auto' }} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', bgcolor: `rgba(254,249,225,0.7)`, px: 3, py: 2, gap: 4, borderBottom: `2px solid ${alpha(accentColor, 0.15)}` }}>
          {['Date', 'Time', 'Status'].map((col) => (
            <SkeletonBox key={col} width={col === 'Date' ? 80 : col === 'Time' ? 60 : 90} height={13} borderRadius={4} />
          ))}
        </Box>
        {[...Array(6)].map((_, i) => (
          <Box key={i} sx={{ display: 'flex', px: 3, py: 2.5, gap: 4, alignItems: 'center', bgcolor: i % 2 === 0 ? 'transparent' : alpha(primaryColor, 0.3), borderBottom: `1px solid ${alpha(accentColor, 0.06)}`, animation: `ausPulse 2s ease-in-out ${0.05 * i}s infinite` }}>
            <SkeletonBox width={160} height={13} borderRadius={4} />
            <SkeletonBox width={80} height={13} borderRadius={4} />
            <Box sx={{ width: 90, height: 26, borderRadius: '13px', bgcolor: i % 3 === 0 ? 'rgba(76,175,80,0.12)' : i % 3 === 1 ? 'rgba(255,152,0,0.12)' : 'rgba(244,67,54,0.12)' }} />
          </Box>
        ))}
      </Box>

    </Box>
  </>
);

// ─────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  backdropFilter: "blur(10px)",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-4px)",
  },
}));

const ProfessionalButton = styled(Button)(
  ({ theme, variant, color = "primary" }) => ({
    borderRadius: 12,
    fontWeight: 600,
    padding: "12px 24px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    textTransform: "none",
    fontSize: "0.95rem",
    letterSpacing: "0.025em",
    boxShadow:
      variant === "contained" ? "0 4px 14px rgba(254, 249, 225, 0.25)" : "none",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow:
        variant === "contained"
          ? "0 6px 20px rgba(254, 249, 225, 0.35)"
          : "none",
    },
    "&:active": {
      transform: "translateY(0)",
    },
  })
);

const ModernTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    "&:hover": {
      transform: "translateY(-1px)",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
    },
    "&.Mui-focused": {
      transform: "translateY(-1px)",
      boxShadow: "0 4px 20px rgba(254, 249, 225, 0.25)",
      backgroundColor: "rgba(255, 255, 255, 1)",
    },
  },
  "& .MuiInputLabel-root": {
    fontWeight: 500,
  },
}));

const PremiumTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 16,
  overflow: "auto",
  boxShadow: "0 4px 24px rgba(109, 35, 35, 0.06)",
  border: "1px solid rgba(109, 35, 35, 0.08)",
  maxHeight: "600px",
  "&::-webkit-scrollbar": {
    width: "8px",
    height: "8px",
  },
  "&::-webkit-scrollbar-track": {
    background: "rgba(254, 249, 225, 0.3)",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "rgba(109, 35, 35, 0.4)",
    borderRadius: "4px",
    "&:hover": {
      background: "rgba(109, 35, 35, 0.6)",
    },
  },
}));

const PremiumTableCell = styled(TableCell)(({ theme, isHeader = false }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: "18px 20px",
  borderBottom: isHeader
    ? "2px solid rgba(254, 249, 225, 0.5)"
    : "1px solid rgba(109, 35, 35, 0.06)",
  fontSize: "0.95rem",
  letterSpacing: "0.025em",
  minWidth: "120px",
  whiteSpace: "nowrap",
}));

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const AllAttendanceRecord = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();
  const [personID, setPersonID] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [records, setRecords] = useState([]);
  const [submittedID, setSubmittedID] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);

  // ── Snackbar state (matches ViewAttendanceRecord) ──
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

  // ── Page loading guard for wireframe ──
  const [pageLoading, setPageLoading] = useState(true);

  const fetchRecordsRef = useRef(null);

  // Get colors from system settings
  const primaryColor       = settings.accentColor        || "#FEF9E1";
  const secondaryColor     = settings.backgroundColor    || "#FFF8E7";
  const accentColor        = settings.primaryColor       || "#6d2323";
  const accentDark         = settings.secondaryColor     || "#8B3333";
  const textPrimaryColor   = settings.textPrimaryColor   || "#6d2323";
  const textSecondaryColor = settings.textSecondaryColor || "#FEF9E1";
  const hoverColor         = settings.hoverColor         || "#6D2323";
  const creamColor         = settings.accentColor        || "#FEF9E1";
  const blackColor         = "#1a1a1a";
  const whiteColor         = "#FFFFFF";
  const grayColor          = "#6c757d";

  const today = new Date();
  const year  = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day   = String(today.getDate()).padStart(2, "0");
  const formattedToday = `${year}-${month}-${day}`;

  const { hasAccess, loading: accessLoading, error: accessError } = usePageAccess('attendance-form');

  // ── Dismiss wireframe once access resolves (matches ViewAttendanceRecord) ──
  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
  };

  // ── Snackbar helpers ──
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
    setSnackbarCountdown(6);
  };

  const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0)
      timer = setInterval(() => setSnackbarCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

  const fetchRecords = async (showLoading = true) => {
    if (!personID || !startDate || !endDate) return;

    if (showLoading) setLoading(true);
    setError("");

    try {
      const adjustedStartDate = new Date(startDate);
      adjustedStartDate.setDate(adjustedStartDate.getDate() - 1);
      const adjustedStart = adjustedStartDate.toISOString().substring(0, 10);

      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
      const adjustedEnd = adjustedEndDate.toISOString().substring(0, 10);

      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/attendance`,
        { personID, startDate: adjustedStart, endDate: adjustedEnd },
        getAuthHeaders()
      );

      const filteredData = response.data.filter((record) => {
        const dateParts = record.Date.split("/");
        if (dateParts.length === 3) {
          const recordMonth = dateParts[0].padStart(2, "0");
          const recordDay   = dateParts[1].padStart(2, "0");
          const recordYear  = dateParts[2];
          const recordDate  = `${recordYear}-${recordMonth}-${recordDay}`;
          return recordDate >= startDate && recordDate <= endDate;
        }
        return false;
      });

      const sortedRecords = filteredData.sort((a, b) => {
        const dateTimeA = new Date(a.Date + " " + a.Time);
        const dateTimeB = new Date(b.Date + " " + b.Time);
        return dateTimeB - dateTimeA;
      });

      setRecords(sortedRecords);
      setSubmittedID(personID);
    } catch (err) {
      console.error("Error fetching attendance records:", err);
      setError("Failed to fetch attendance records");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { fetchRecordsRef.current = fetchRecords; });

  useEffect(() => {
    if (!socket || !connected) return;

    const handleAttendanceChanged = (payload) => {
      const changedPersonIDs = Array.isArray(payload?.personIDs)
        ? payload.personIDs
        : payload?.personID
          ? [payload.personID]
          : [];

      if (personID && changedPersonIDs.length > 0 && !changedPersonIDs.includes(personID)) return;

      if (personID && startDate && endDate) {
        fetchRecordsRef.current?.(false);
      }
    };

    socket.on("attendanceChanged", handleAttendanceChanged);
    return () => { socket.off("attendanceChanged", handleAttendanceChanged); };
  }, [socket, connected, personID, startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    fetchRecords(true);
  };

  const handleMoreClick  = (event) => setMoreAnchorEl(event.currentTarget);
  const handleMoreClose  = ()      => setMoreAnchorEl(null);
  const handleRowExpand  = (index) => setExpandedRow(expandedRow === index ? null : index);
  const handleSort       = ()      => setSortOrder(sortOrder === "asc" ? "desc" : "asc");

  const handleClearFilters = () => {
    setPersonID(""); setStartDate(""); setEndDate("");
    setRecords([]); setSubmittedID(""); setSelectedMonth(null);
  };

  useEffect(() => {
    if (personID && startDate && endDate) fetchRecords(false);
  }, [startDate, endDate]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const getAttendanceIcon = (state) => {
    switch (state) {
      case 1: return <CheckCircle sx={{ fontSize: 16, color: "#4caf50" }} />;
      case 2: return <AccessTime  sx={{ fontSize: 16, color: "#ff9800" }} />;
      case 3: return <AccessTime  sx={{ fontSize: 16, color: "#ff9800" }} />;
      case 4: return <CheckCircle sx={{ fontSize: 16, color: "#4caf50" }} />;
      default: return <Cancel     sx={{ fontSize: 16, color: "#f44336" }} />;
    }
  };

  const getAttendanceColor = (state) => {
    switch (state) {
      case 1: return "#4caf50";
      case 2: return "#ff9800";
      case 3: return "#ff9800";
      case 4: return "#4caf50";
      default: return "#f44336";
    }
  };

  const getAttendanceLabel = (state) => {
    switch (state) {
      case 1: return "Time IN";
      case 2: return "Breaktime OUT";
      case 3: return "Breaktime IN";
      case 4: return "Time OUT";
      default: return "Uncategorized";
    }
  };

  const filteredRecords = records.sort((a, b) => {
    const dateA = new Date(a.Date + " " + a.Time);
    const dateB = new Date(b.Date + " " + b.Time);
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  const moreOpen = Boolean(moreAnchorEl);

  // ── Wireframe guard (matches ViewAttendanceRecord) ──
  if (pageLoading || accessLoading) return (
    <AllAttendanceWireframe
      accentColor={accentColor}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    />
  );

  if (hasAccess === false) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You do not have permission to access Attendance Form. Contact your administrator to request access."
        returnPath="/admin-home"
        returnButtonText="Return to Home"
      />
    );
  }

  return (
    <Box sx={{
      py: { xs: 2, md: 4 },
      width: '100vw',
      mx: 'auto',
      maxWidth: '100%',
      overflow: 'hidden',
      position: 'relative',
      left: '53%',
      transform: 'translateX(-51%)',
      px: { xs: 2, sm: 3, md: 6 },
    }}>

        {/* ── Snackbar (matches ViewAttendanceRecord) ── */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{
              width: '100%',
              fontWeight: 600,
              backgroundColor: snackbar.severity === 'success' ? '#4caf50' : undefined,
              color: snackbar.severity === 'success' ? '#ffffff' : undefined,
              '& .MuiAlert-icon': { color: snackbar.severity === 'success' ? '#ffffff' : undefined },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip
                  label={`${snackbarCountdown}s`}
                  size="small"
                  sx={{
                    backgroundColor: snackbar.severity === 'success' ? 'rgba(255,255,255,0.3)' : undefined,
                    color: snackbar.severity === 'success' ? '#ffffff' : undefined,
                    fontWeight: 700,
                  }}
                />
              )}
            </Box>
          </Alert>
        </Snackbar>

        {/* ── Hero Header ── */}
        <Fade in timeout={500}>
          <Box sx={{ mb: 4 }}>
            <GlassCard sx={{
              background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
              boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
              border: `1px solid ${alpha(accentColor, 0.1)}`,
              "&:hover": { boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}` },
            }}>
              <Box sx={{
                p: 5,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                color: textPrimaryColor,
                position: "relative",
                overflow: "hidden",
              }}>
                <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle, ${alpha(accentColor, 0.1)} 0%, ${alpha(accentColor, 0)} 70%)` }} />
                <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, background: `radial-gradient(circle, ${alpha(accentColor, 0.08)} 0%, ${alpha(accentColor, 0)} 70%)` }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(accentColor, 0.15), mr: 4, width: 64, height: 64, boxShadow: `0 8px 24px ${alpha(accentColor, 0.15)}` }}>
                      <Search sx={{ color: textPrimaryColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>
                        Attendance Record State
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 400, color: textPrimaryColor }}>
                        Review attendance records states
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip label="System Generated" size="small" sx={{ bgcolor: alpha(accentColor, 0.15), color: textPrimaryColor, fontWeight: 500, "& .MuiChip-label": { px: 1 } }} />
                    <Tooltip title="Refresh">
                      <IconButton
                        onClick={() => fetchRecords(true)}
                        disabled={!personID || !startDate || !endDate}
                        sx={{
                          bgcolor: alpha(accentColor, 0.1),
                          "&:hover": { bgcolor: alpha(accentColor, 0.2) },
                          color: textPrimaryColor,
                          width: 48, height: 48,
                          "&:disabled": { bgcolor: alpha(accentColor, 0.05), color: alpha(accentColor, 0.3) },
                        }}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Fade>

        {/* ── Controls ── */}
        <Fade in timeout={700}>
          <GlassCard sx={{
            mb: 4,
            background: `rgba(${hexToRgb(primaryColor)}, 0.95)`,
            boxShadow: `0 8px 40px ${alpha(accentColor, 0.08)}`,
            border: `1px solid ${alpha(accentColor, 0.1)}`,
            "&:hover": { boxShadow: `0 12px 48px ${alpha(accentColor, 0.15)}` },
          }}>
            <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={4} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <ModernTextField
                      fullWidth label="Employee Number" value={personID}
                      onChange={(e) => setPersonID(e.target.value)} required
                      InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: textPrimaryColor }} /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <ModernTextField
                      fullWidth label="Start Date" type="date" value={startDate}
                      onChange={(e) => setStartDate(e.target.value)} required
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><CalendarToday sx={{ color: textPrimaryColor }} /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <ModernTextField
                      fullWidth label="End Date" type="date" value={endDate}
                      onChange={(e) => setEndDate(e.target.value)} required
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><CalendarToday sx={{ color: textPrimaryColor }} /></InputAdornment> }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3, borderColor: alpha(accentColor, 0.1) }} />

                {/* Quick Date Selection */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ color: textPrimaryColor, display: "flex", alignItems: "center", mb: 2 }}>
                    <FilterList sx={{ mr: 2 }} />
                    Quick Date Selection
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha(textPrimaryColor, 0.7), mb: 2 }}>
                    Click any option below to automatically set the date range:
                  </Typography>

                  {/* Quick filter buttons */}
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
                    {[
                      { label: 'Today',        icon: <Today />,        fn: () => { setStartDate(formattedToday); setEndDate(formattedToday); } },
                      { label: 'Yesterday',    icon: <ArrowBackIos />, fn: () => { const y = new Date(today); y.setDate(y.getDate()-1); const s = y.toISOString().substring(0,10); setStartDate(s); setEndDate(s); } },
                      { label: 'Last 7 Days',  icon: null,             fn: () => { const d = new Date(today); d.setDate(d.getDate()-7); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); } },
                      { label: 'Last 15 Days', icon: null,             fn: () => { const d = new Date(today); d.setDate(d.getDate()-15); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); } },
                      { label: 'Last 30 Days', icon: null,             fn: () => { const d = new Date(today); d.setMonth(d.getMonth()-1); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); } },
                    ].map(({ label, icon, fn }) => (
                      <ProfessionalButton
                        key={label} variant="outlined" onClick={fn}
                        startIcon={icon || undefined}
                        sx={{ borderColor: accentColor, color: textPrimaryColor }}
                      >
                        {label}
                      </ProfessionalButton>
                    ))}
                  </Box>

                  {/* Month picker — year selector now fires snackbar (matches ViewAttendanceRecord) */}
                  <Box sx={{ p: 3, borderRadius: 2, border: `2px dashed ${alpha(accentColor, 0.2)}`, backgroundColor: alpha(primaryColor, 0.3) }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ color: textPrimaryColor, fontWeight: 600, mb: 0.5 }}>
                          Select Entire Month
                        </Typography>
                        <Typography variant="body2" sx={{ color: alpha(textPrimaryColor, 0.7) }}>
                          Choose a year, then click any month to view records for that entire month
                        </Typography>
                      </Box>

                      {/* ── Year selector with snackbar on change ── */}
                      <FormControl sx={{ minWidth: 140 }}>
                        <InputLabel sx={{ fontWeight: 600 }}>Year</InputLabel>
                        <Select
                          value={selectedYear}
                          label="Year"
                          onChange={(e) => {
                            setSelectedYear(e.target.value);
                            setSelectedMonth(null);
                            showSnackbar('Year changed — please click a month to load records.', 'info');
                          }}
                          sx={{
                            backgroundColor: "white",
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: accentColor },
                            borderRadius: 2,
                            fontWeight: 600,
                          }}
                        >
                          {yearOptions.map((yr) => (
                            <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                      {months.map((month, index) => {
                        const isSelected = selectedMonth === index;
                        return (
                          <ProfessionalButton
                            key={month}
                            variant={isSelected ? "contained" : "outlined"}
                            size="medium"
                            onClick={() => handleMonthClick(index)}
                            sx={{
                              borderColor: accentColor,
                              backgroundColor: isSelected ? accentColor : 'transparent',
                              color: isSelected ? textSecondaryColor : textPrimaryColor,
                              py: 1.5,
                              px: 4.5,
                              fontWeight: 600,
                              '&:hover': { backgroundColor: isSelected ? accentDark : alpha(accentColor, 0.1), borderWidth: 2 },
                              transition: 'all 0.3s ease',
                              boxShadow: isSelected ? `0 4px 12px ${alpha(accentColor, 0.3)}` : 'none',
                            }}
                          >
                            {month}
                          </ProfessionalButton>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>

                {/* Clear button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <ProfessionalButton
                    variant="outlined" startIcon={<Clear />} onClick={handleClearFilters}
                    sx={{ borderColor: "#d32f2f", color: "#d32f2f", "&:hover": { borderColor: "#b71c1c", backgroundColor: alpha("#d32f2f", 0.05) } }}
                  >
                    Clear All Filters
                  </ProfessionalButton>
                </Box>
              </Box>
            </CardContent>
          </GlassCard>
        </Fade>

        {loading && (
          <LinearProgress sx={{ mb: 2, borderRadius: 1, bgcolor: alpha(accentColor, 0.1), "& .MuiLinearProgress-bar": { bgcolor: accentColor } }} />
        )}

        {error && (
          <Fade in timeout={300}>
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
          </Fade>
        )}

        {/* ── Results ── */}
        {submittedID && (
          <Fade in={!loading} timeout={500}>
            <GlassCard sx={{ border: `1px solid ${alpha(accentColor, 0.1)}` }}>
              <Box sx={{
                p: 4,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                color: accentColor,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5, textTransform: "uppercase", letterSpacing: "0.1em", color: accentDark }}>
                    Employee Number
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: accentColor }}>
                    {submittedID}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Badge
                    badgeContent={filteredRecords.length}
                    color="secondary"
                    sx={{ "& .MuiBadge-badge": { fontSize: "0.8rem", height: 24, minWidth: 24 } }}
                  >
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Records Found</Typography>
                  </Badge>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mt: 0.5, color: accentDark }}>
                    {startDate} to {endDate}
                  </Typography>
                </Box>
              </Box>

              <PremiumTableContainer>
                <Table stickyHeader sx={{ minWidth: "800px" }}>
                  <TableHead sx={{ bgcolor: alpha(primaryColor, 0.7) }}>
                    <TableRow>
                      <PremiumTableCell isHeader sx={{ color: accentColor, cursor: "pointer", userSelect: "none", "&:hover": { bgcolor: alpha(accentColor, 0.05) } }} onClick={handleSort}>
                        <Box display="flex" alignItems="center" gap={1}>
                          Date
                          {sortOrder === "asc" ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                        </Box>
                      </PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Time</PremiumTableCell>
                      <PremiumTableCell isHeader sx={{ color: accentColor }}>Status</PremiumTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                          <Box sx={{ textAlign: "center" }}>
                            <Info sx={{ fontSize: 64, color: alpha(accentColor, 0.3), mb: 2 }} />
                            <Typography variant="h5" color={alpha(accentColor, 0.6)} gutterBottom>No records found</Typography>
                            <Typography variant="body2" color={alpha(accentColor, 0.4)}>Try adjusting your date range or search for a different employee</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record, idx) => (
                        <React.Fragment key={idx}>
                          <TableRow
                            sx={{
                              "&:nth-of-type(even)": { bgcolor: alpha(primaryColor, 0.3) },
                              "&:hover": { bgcolor: alpha(accentColor, 0.05) },
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onClick={() => handleRowExpand(idx)}
                          >
                            <PremiumTableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: blackColor }}>
                                {new Date(record.Date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                              </Typography>
                            </PremiumTableCell>
                            <PremiumTableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: blackColor }}>{record.Time}</Typography>
                            </PremiumTableCell>
                            <PremiumTableCell>
                              <Chip
                                icon={getAttendanceIcon(record.AttendanceState)}
                                label={getAttendanceLabel(record.AttendanceState)}
                                size="small"
                                sx={{
                                  bgcolor: alpha(getAttendanceColor(record.AttendanceState), 0.1),
                                  color: getAttendanceColor(record.AttendanceState),
                                  fontWeight: 600,
                                  "& .MuiChip-icon": { color: getAttendanceColor(record.AttendanceState) },
                                }}
                              />
                            </PremiumTableCell>
                          </TableRow>
                          {expandedRow === idx && (
                            <TableRow>
                              <TableCell colSpan={3} sx={{ p: 0, bgcolor: alpha(creamColor, 0.5) }}>
                                <Box sx={{ p: 3 }}>
                                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: blackColor }}>Record Details</Typography>
                                  <Grid container spacing={2}>
                                    {[
                                      { label: 'Employee ID', value: record.PersonID },
                                      { label: 'Date',        value: record.Date },
                                      { label: 'Time',        value: record.Time },
                                      { label: 'Status',      value: getAttendanceLabel(record.AttendanceState) },
                                    ].map(({ label, value }) => (
                                      <Grid item xs={6} md={3} key={label}>
                                        <Typography variant="body2" color="text.secondary">{label}</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500, color: blackColor }}>{value}</Typography>
                                      </Grid>
                                    ))}
                                  </Grid>
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </PremiumTableContainer>
            </GlassCard>
          </Fade>
        )}

        {/* ── Scroll to Top ── */}
        <Zoom in={showScrollTop}>
          <Fab
            sx={{
              position: "fixed", bottom: 24, right: 24, zIndex: 1000,
              bgcolor: accentColor, color: primaryColor,
              "&:hover": { bgcolor: accentDark },
            }}
            onClick={scrollToTop}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>

    </Box>
  );
};

export default AllAttendanceRecord;