import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  InputAdornment,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  Fade,
  Alert,
  alpha,
  Chip,
  styled,
  Backdrop,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from "@mui/material";
import {
  WorkHistory,
  Person,
  CalendarToday,
  Clear,
  SaveAs,
  Refresh,
} from "@mui/icons-material";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "109, 35, 35";
};

// ─────────────────────────────────────────────
// WIREFRAME
// ─────────────────────────────────────────────
const SHIMMER_CSS = `
@keyframes ntsShimmer {
  0%   { background-position: -900px 0; }
  100% { background-position:  900px 0; }
}
@keyframes ntsPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

const S = ({ w = "100%", h = 14, r = 6, sx = {}, accent = "#6d2323" }) => (
  <Box
    sx={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: `linear-gradient(90deg,
        ${alpha(accent, 0.07)} 25%,
        ${alpha(accent, 0.18)} 50%,
        ${alpha(accent, 0.07)} 75%)`,
      backgroundSize: "900px 100%",
      animation: "ntsShimmer 1.6s infinite linear",
      ...sx,
    }}
  />
);

const Placeholder = ({ w, h, r = 4, color = "rgba(109,35,35,0.08)", sx = {} }) => (
  <Box sx={{ width: w, height: h, borderRadius: r, bgcolor: color, flexShrink: 0, ...sx }} />
);

const AttendanceNonTeachingWireframe = ({
  accentColor    = "#6d2323",
  primaryColor   = "#FEF9E1",
  secondaryColor = "#FFF8E7",
}) => {
  const ac   = accentColor;
  const grad = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <Box sx={{
        py: { xs: 2, md: 4 },
        width: "100vw", mx: "auto", maxWidth: "100%",
        overflow: "hidden", position: "relative",
        left: "53%", transform: "translateX(-51%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}>

        {/* 1. Hero header */}
        <Box sx={{
          mb: 4, borderRadius: "20px", overflow: "hidden",
          border: `1px solid ${alpha(ac, 0.1)}`,
          boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
          animation: "ntsPulse 2.2s ease-in-out infinite",
        }}>
          <Box sx={{ p: 5, background: grad, position: "relative", overflow: "hidden" }}>
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle,${alpha(ac,0.1)} 0%,${alpha(ac,0)} 70%)` }} />
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Placeholder w={64} h={64} r="50%" color={alpha(ac, 0.13)} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <S w={280} h={26} r={6} accent={ac} />
                  <S w={340} h={13} r={4} accent={ac} />
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <S w={120} h={26} r={13} accent={ac} />
                <Placeholder w={48} h={48} r="50%" color={alpha(ac, 0.12)} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* 2. Controls card */}
        <Box sx={{
          mb: 4, borderRadius: "20px", overflow: "hidden",
          border: `1px solid ${alpha(ac, 0.1)}`,
          boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
          animation: "ntsPulse 2.2s ease-in-out 0.08s infinite",
          bgcolor: `rgba(${hexToRgb(primaryColor)},0.95)`,
        }}>
          <Box sx={{ p: 4 }}>
            {/* 3 input fields */}
            <Box sx={{ display: "flex", gap: 3, mb: 3, flexWrap: "wrap" }}>
              {[0, 1, 2].map((fi) => (
                <Box key={fi} sx={{ flex: 1, minWidth: 160 }}>
                  <S w={fi === 0 ? 130 : 80} h={12} r={3} accent={ac} sx={{ mb: "6px" }} />
                  <Box sx={{ height: 56, borderRadius: "12px", border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", px: 1.5, gap: 1 }}>
                    <Placeholder w={20} h={20} r="50%" color={alpha(ac, 0.12)} />
                    <S w={fi === 0 ? "45%" : "55%"} h={13} r={4} accent={ac} />
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ height: 1, bgcolor: alpha(ac, 0.1), my: 3 }} />

            {/* Dashed month picker box */}
            <Box sx={{ p: 3, borderRadius: 2, border: `2px dashed ${alpha(ac, 0.20)}`, bgcolor: alpha(primaryColor, 0.30), mb: 4 }}>
              {/* Header row */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <S w={185} h={14} r={4} accent={ac} />
                  <S w={300} h={11} r={3} accent={ac} />
                </Box>
                <Box sx={{ width: 140, height: 40, borderRadius: "8px", border: `1px solid ${alpha(ac, 0.25)}`, bgcolor: "white", display: "flex", alignItems: "center", px: 1.5, gap: 1 }}>
                  <S w="50%" h={12} r={3} accent={ac} />
                  <Placeholder w={18} h={18} r={3} color={alpha(ac, 0.15)} sx={{ ml: "auto" }} />
                </Box>
              </Box>
              {/* Month buttons */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <S key={i} w={64} h={44} r={10} accent={ac} sx={{ animation: `ntsShimmer 1.6s infinite linear ${i * 0.05}s` }} />
                ))}
              </Box>
            </Box>

            {/* Action buttons row */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ width: 160, height: 48, borderRadius: "12px", border: "1px solid rgba(211,47,47,0.30)" }} />
              <Box sx={{ width: 180, height: 48, borderRadius: "12px", bgcolor: alpha(ac, 0.85) }} />
            </Box>
          </Box>
        </Box>

        {/* 3. Table card skeleton */}
        <Box sx={{
          mb: 4, borderRadius: "20px", overflow: "hidden",
          border: `1px solid ${alpha(ac, 0.1)}`,
          boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
          animation: "ntsPulse 2.2s ease-in-out 0.15s infinite",
          bgcolor: `rgba(${hexToRgb(primaryColor)},0.95)`,
        }}>
          {/* Table header banner */}
          <Box sx={{ p: 4, background: grad, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <S w={220} h={10} r={3} accent={ac} sx={{ mb: "6px" }} />
              <S w={160} h={20} r={4} accent={ac} sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <S w={110} h={22} r={11} accent={ac} />
                <S w={140} h={10} r={3} accent={ac} />
              </Box>
            </Box>
            <Placeholder w={80} h={80} r="50%" color={alpha(ac, 0.13)} />
          </Box>

          {/* Table column headers */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1, px: 3, py: 2, bgcolor: alpha(primaryColor, 0.7), borderBottom: `2px solid ${alpha(ac, 0.1)}` }}>
            {[100, 70, 90, 120, 90, 120, 160, 160].map((w, i) => (
              <S key={i} w={w} h={10} r={3} accent={ac} />
            ))}
          </Box>

          {/* Table rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{
              display: "grid", gridTemplateColumns: "repeat(8, 1fr)",
              gap: 1, px: 3, py: 2.25, alignItems: "center",
              borderBottom: i < 4 ? `1px solid ${alpha(ac, 0.06)}` : "none",
              bgcolor: i % 2 === 0 ? "#fff" : alpha(primaryColor, 0.3),
              animation: `ntsPulse 2.2s ease-in-out ${i * 0.06}s infinite`,
            }}>
              {[80, 60, 80, 110, 80, 110, 80, 80].map((w, ci) => (
                <S key={ci} w={w} h={12} r={3} accent={ac} />
              ))}
            </Box>
          ))}
        </Box>

        {/* 4. Save card */}
        <Box sx={{
          mb: 4, borderRadius: "20px", overflow: "hidden",
          border: `1px solid ${alpha(ac, 0.1)}`,
          boxShadow: `0 8px 40px ${alpha(ac, 0.08)}`,
          animation: "ntsPulse 2.2s ease-in-out 0.2s infinite",
          bgcolor: `rgba(${hexToRgb(primaryColor)},0.95)`,
        }}>
          <Box sx={{ p: 2.5, bgcolor: alpha(primaryColor, 0.5), borderBottom: `1px solid ${alpha(ac, 0.1)}`, display: "flex", alignItems: "center", gap: 2 }}>
            <Placeholder w={40} h={40} r="50%" color={alpha(ac, 0.13)} />
            <S w={300} h={12} r={3} accent={ac} />
          </Box>
          <Box sx={{ p: 4 }}>
            <Box sx={{ height: 52, borderRadius: "12px", bgcolor: alpha(ac, 0.85) }} />
          </Box>
        </Box>

      </Box>
    </>
  );
};

// ─────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────
const GlassCard = styled(Card)(() => ({
  borderRadius: 20,
  backdropFilter: "blur(10px)",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": { transform: "translateY(-4px)" },
}));

const ProfessionalButton = styled(Button)(({ variant }) => ({
  borderRadius: 12,
  fontWeight: 600,
  padding: "12px 24px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  textTransform: "none",
  fontSize: "0.95rem",
  letterSpacing: "0.025em",
  boxShadow: variant === "contained" ? "0 4px 14px rgba(254,249,225,0.25)" : "none",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: variant === "contained" ? "0 6px 20px rgba(254,249,225,0.35)" : "none",
  },
  "&:active": { transform: "translateY(0)" },
}));

const ModernTextField = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: "rgba(255,255,255,0.8)",
    "&:hover": { transform: "translateY(-1px)", backgroundColor: "rgba(255,255,255,0.95)" },
    "&.Mui-focused": { transform: "translateY(-1px)", boxShadow: "0 4px 20px rgba(254,249,225,0.25)", backgroundColor: "rgba(255,255,255,1)" },
  },
  "& .MuiInputLabel-root": { fontWeight: 500 },
}));

const PremiumTableContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  overflow: "auto",
  boxShadow: "0 4px 24px rgba(109,35,35,0.06)",
  border: "1px solid rgba(109,35,35,0.08)",
  maxHeight: "600px",
  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
  "&::-webkit-scrollbar-track": { background: "rgba(254,249,225,0.3)", borderRadius: "4px" },
  "&::-webkit-scrollbar-thumb": {
    background: "rgba(109,35,35,0.4)", borderRadius: "4px",
    "&:hover": { background: "rgba(109,35,35,0.6)" },
  },
}));

const PremiumTableCell = styled(TableCell)(({ isHeader = false, bgColor = null }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: "14px 16px",
  borderBottom: isHeader ? "2px solid rgba(254,249,225,0.5)" : "1px solid rgba(109,35,35,0.06)",
  fontSize: "0.85rem",
  letterSpacing: "0.025em",
  backgroundColor: bgColor ? bgColor : "transparent",
  whiteSpace: "nowrap",
}));

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const AttendanceModuleNonTeachingStaff = () => {
  const { settings } = useSystemSettings();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [startDate, setStartDate]           = useState("");
  const [endDate, setEndDate]               = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [pageLoading, setPageLoading]       = useState(true);
  const navigate = useNavigate();

  // ── Auto-scroll ref ───────────────────────────────────────────────────────
  const resultsRef = useRef(null);

  // Colors from system settings
  const primaryColor       = settings.accentColor        || "#FEF9E1";
  const secondaryColor     = settings.backgroundColor    || "#FFF8E7";
  const accentColor        = settings.primaryColor       || "#6d2323";
  const accentDark         = settings.secondaryColor     || "#8B3333";
  const textPrimaryColor   = settings.textPrimaryColor   || "#6d2323";
  const textSecondaryColor = settings.textSecondaryColor || "#FEF9E1";

  // Access control
  const { hasAccess, loading: accessLoading } = usePageAccess("attendance-module");

  // Month / year selectors
  const currentYear = new Date().getFullYear();
  const months      = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar]                   = useState({ open: false, message: "", severity: "success" });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

  const showSnackbar = (message, severity = "success") => {
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

  // Dismiss wireframe once access resolves
  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  // Restore persisted inputs
  useEffect(() => {
    const storedEmployeeNumber = localStorage.getItem("employeeNumber");
    const storedStartDate      = localStorage.getItem("startDate");
    const storedEndDate        = localStorage.getItem("endDate");
    if (storedEmployeeNumber) setEmployeeNumber(storedEmployeeNumber);
    if (storedStartDate)      setStartDate(storedStartDate);
    if (storedEndDate)        setEndDate(storedEndDate);
  }, []);

  // ── Auto-scroll when data loads ───────────────────────────────────────────
  useEffect(() => {
    if (attendanceData.length > 0 && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [attendanceData]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
  };

  // ── handleSubmit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    localStorage.setItem("employeeNumber", employeeNumber);
    localStorage.setItem("startDate", startDate);
    localStorage.setItem("endDate", endDate);

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_BASE_URL}/attendance/api/attendance`, {
        params: { personId: employeeNumber, startDate, endDate },
        ...getAuthHeaders(),
      });

      const processedData = response.data.map((row) => {
        const {
          timeIN, timeOUT, breaktimeIN, breaktimeOUT,
          officialBreaktimeIN, officialBreaktimeOUT,
          officialTimeIN, officialTimeOUT,
          officialHonorariumTimeIN, officialHonorariumTimeOUT,
          officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
          officialOverTimeIN, officialOverTimeOUT,
        } = row;

        const parsedTimeIN                       = dayjs(`2024-01-01 ${timeIN}`,                       "YYYY-MM-DD hh:mm:ss A");
        const parsedTimeOUT                      = dayjs(`2024-01-01 ${timeOUT}`,                      "YYYY-MM-DD hh:mm:ss A");
        const parsedBreaktimeIN                  = dayjs(`2024-01-01 ${breaktimeIN}`,                  "YYYY-MM-DD hh:mm:ss A");
        const parsedBreaktimeOUT                 = dayjs(`2024-01-01 ${breaktimeOUT}`,                 "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialBreaktimeIN          = dayjs(`2024-01-01 ${officialBreaktimeIN}`,          "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialBreaktimeOUT         = dayjs(`2024-01-01 ${officialBreaktimeOUT}`,         "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialTimeIN               = dayjs(`2024-01-01 ${officialTimeIN}`,               "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialTimeOUT              = dayjs(`2024-01-01 ${officialTimeOUT}`,              "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialHonorariumTimeIN     = dayjs(`2024-01-01 ${officialHonorariumTimeIN}`,     "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialHonorariumTimeOUT    = dayjs(`2024-01-01 ${officialHonorariumTimeOUT}`,    "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialServiceCreditTimeIN  = dayjs(`2024-01-01 ${officialServiceCreditTimeIN}`,  "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialServiceCreditTimeOUT = dayjs(`2024-01-01 ${officialServiceCreditTimeOUT}`, "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialOverTimeIN           = dayjs(`2024-01-01 ${officialOverTimeIN}`,           "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialOverTimeOUT          = dayjs(`2024-01-01 ${officialOverTimeOUT}`,          "YYYY-MM-DD hh:mm:ss A");

        const OfficialTimeMorning   = parsedTimeIN.isBefore(parsedOfficialTimeIN)              ? parsedOfficialTimeIN.format("hh:mm:ss A")              : parsedTimeIN.format("hh:mm:ss A");
        const OfficialTimeAfternoon = parsedTimeOUT.isAfter(parsedOfficialTimeOUT)             ? parsedOfficialTimeOUT.format("hh:mm:ss A")             : parsedTimeOUT.format("hh:mm:ss A");
        const HonorariumTimeIN      = parsedTimeIN.isBefore(parsedOfficialHonorariumTimeIN)    ? parsedOfficialHonorariumTimeIN.format("hh:mm:ss A")    : parsedTimeIN.format("hh:mm:ss A");
        const HonorariumTimeOUT     = parsedTimeOUT.isAfter(parsedOfficialHonorariumTimeOUT)   ? parsedOfficialHonorariumTimeOUT.format("hh:mm:ss A")   : parsedTimeOUT.format("hh:mm:ss A");
        const ServiceCreditTimeIN   = parsedTimeIN.isBefore(parsedOfficialServiceCreditTimeIN) ? parsedOfficialServiceCreditTimeIN.format("hh:mm:ss A") : parsedTimeIN.format("hh:mm:ss A");
        const ServiceCreditTimeOUT  = parsedTimeOUT.isAfter(parsedOfficialServiceCreditTimeOUT)? parsedOfficialServiceCreditTimeOUT.format("hh:mm:ss A"): parsedTimeOUT.format("hh:mm:ss A");
        const OverTimeIN            = parsedTimeIN.isBefore(parsedOfficialOverTimeIN)          ? parsedOfficialOverTimeIN.format("hh:mm:ss A")          : parsedTimeIN.format("hh:mm:ss A");
        const OverTimeOUT           = parsedTimeOUT.isAfter(parsedOfficialOverTimeOUT)         ? parsedOfficialOverTimeOUT.format("hh:mm:ss A")         : parsedTimeOUT.format("hh:mm:ss A");
        const OfficialBreakAM       = parsedBreaktimeIN.isAfter(parsedOfficialBreaktimeIN)     ? parsedOfficialBreaktimeIN.format("hh:mm:ss A")         : parsedBreaktimeIN.format("hh:mm:ss A");
        const OfficialBreakPM       = parsedBreaktimeOUT.isAfter(parsedOfficialBreaktimeOUT)   ? parsedBreaktimeOUT.format("hh:mm:ss A")                : parsedOfficialBreaktimeOUT.format("hh:mm:ss A");

        const defaultTimeFaculty = "00:00:00 AM";
        const midnightFaculty    = new Date(`01/01/2000 ${defaultTimeFaculty}`);

        // ── AM ────────────────────────────────────────────────────────────
        const startDateFacultyAM         = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultyAM           = new Date(`01/01/2000 ${breaktimeIN}`);
        const startOfficialTimeFacultyAM = new Date(`01/01/2000 ${officialTimeIN}`);
        const endOfficialTimeFacultyAM   = new Date(`01/01/2000 ${officialBreaktimeIN}`);
        const midnightFacultyAM          = new Date(`01/01/2000 00:00:00 AM`);

        const timeinfacultyAM =
          startDateFacultyAM === midnightFacultyAM ? midnightFacultyAM
          : endDateFacultyAM < startOfficialTimeFacultyAM ? midnightFacultyAM
          : startDateFacultyAM > endOfficialTimeFacultyAM ? midnightFacultyAM
          : startDateFacultyAM < startOfficialTimeFacultyAM ? startOfficialTimeFacultyAM
          : startDateFacultyAM;

        const timeoutfacultyAM = timeinfacultyAM === midnightFacultyAM ? midnightFacultyAM
          : endDateFacultyAM < startOfficialTimeFacultyAM ? midnightFacultyAM
          : endDateFacultyAM < endOfficialTimeFacultyAM ? endDateFacultyAM : endOfficialTimeFacultyAM;

        const diffMsAM         = timeoutfacultyAM - timeinfacultyAM;
        const hoursFacultyAM   = Math.floor(diffMsAM / (1000 * 60 * 60));
        const minutesFacultyAM = Math.floor((diffMsAM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyAM = Math.floor((diffMsAM % (1000 * 60)) / 1000);
        const formattedFacultyRenderedTimeAM = [String(hoursFacultyAM).padStart(2,"0"), String(minutesFacultyAM).padStart(2,"0"), String(secondsFacultyAM).padStart(2,"0")].join(":");

        const diffMsAMFacultyAM    = endOfficialTimeFacultyAM - startOfficialTimeFacultyAM;
        const hoursFacultyMRTAM    = Math.floor(diffMsAMFacultyAM / (1000 * 60 * 60));
        const minutesFacultyMRTAM  = Math.floor((diffMsAMFacultyAM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTAM  = Math.floor((diffMsAMFacultyAM % (1000 * 60)) / 1000);
        const formattedFacultyMaxRenderedTimeAM = [String(hoursFacultyMRTAM).padStart(2,"0"), String(minutesFacultyMRTAM).padStart(2,"0"), String(secondsFacultyMRTAM).padStart(2,"0")].join(":");

        const tardFinalAM    = new Date(`01/01/2000 ${formattedFacultyRenderedTimeAM}`);
        const tardFinalMaxAM = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeAM}`);
        const finalcalcFacultyAM = tardFinalMaxAM - tardFinalAM;
        const hoursfinalAM   = Math.floor(finalcalcFacultyAM / (1000 * 60 * 60));
        const minutesfinalAM = Math.floor((finalcalcFacultyAM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalAM = Math.floor((finalcalcFacultyAM % (1000 * 60)) / 1000);
        const formattedfinalcalcFacultyAM = [String(hoursfinalAM).padStart(2,"0"), String(minutesfinalAM).padStart(2,"0"), String(secondsfinalAM).padStart(2,"0")].join(":");

        // ── PM ────────────────────────────────────────────────────────────
        const startDateFacultyPM         = new Date(`01/01/2000 ${breaktimeOUT}`);
        const endDateFacultyPM           = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultyPM = new Date(`01/01/2000 ${officialBreaktimeOUT}`);
        const endOfficialTimeFacultyPM   = new Date(`01/01/2000 ${officialTimeOUT}`);
        const midnightFacultyPM          = new Date(`01/01/2000 00:00:00 PM`);

        const timeinfacultyPM =
          startDateFacultyPM === null ? midnightFacultyPM
          : endDateFacultyPM < startOfficialTimeFacultyPM ? midnightFacultyPM
          : startDateFacultyPM > endOfficialTimeFacultyPM ? midnightFacultyPM
          : startDateFacultyPM < startOfficialTimeFacultyPM ? startOfficialTimeFacultyPM
          : startDateFacultyPM;

        const timeoutfacultyPM = timeinfacultyPM === midnightFacultyPM ? midnightFacultyPM
          : endDateFacultyPM < startOfficialTimeFacultyPM ? midnightFacultyPM
          : endDateFacultyPM < endOfficialTimeFacultyPM ? endDateFacultyPM : endOfficialTimeFacultyPM;

        const diffMsPM         = timeoutfacultyPM - timeinfacultyPM;
        const hoursFacultyPM   = Math.floor(diffMsPM / (1000 * 60 * 60));
        const minutesFacultyPM = Math.floor((diffMsPM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyPM = Math.floor((diffMsPM % (1000 * 60)) / 1000);
        const formattedFacultyRenderedTimePM = [String(hoursFacultyPM).padStart(2,"0"), String(minutesFacultyPM).padStart(2,"0"), String(secondsFacultyPM).padStart(2,"0")].join(":");

        const diffMsPMFacultyPM    = endOfficialTimeFacultyPM - startOfficialTimeFacultyPM;
        const hoursFacultyMRTPM    = Math.floor(diffMsPMFacultyPM / (1000 * 60 * 60));
        const minutesFacultyMRTPM  = Math.floor((diffMsPMFacultyPM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTPM  = Math.floor((diffMsPMFacultyPM % (1000 * 60)) / 1000);
        const formattedFacultyMaxRenderedTimePM = [String(hoursFacultyMRTPM).padStart(2,"0"), String(minutesFacultyMRTPM).padStart(2,"0"), String(secondsFacultyMRTPM).padStart(2,"0")].join(":");

        const tardFinalPM    = new Date(`01/01/2000 ${formattedFacultyRenderedTimePM}`);
        const tardFinalMaxPM = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimePM}`);
        const finalcalcFacultyPM = tardFinalMaxPM - tardFinalPM;
        const hoursfinalPM   = Math.floor(finalcalcFacultyPM / (1000 * 60 * 60));
        const minutesfinalPM = Math.floor((finalcalcFacultyPM % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalPM = Math.floor((finalcalcFacultyPM % (1000 * 60)) / 1000);
        const formattedfinalcalcFacultyPM = [String(hoursfinalPM).padStart(2,"0"), String(minutesfinalPM).padStart(2,"0"), String(secondsfinalPM).padStart(2,"0")].join(":");

        // ── Honorarium ────────────────────────────────────────────────────
        const startDateFacultyHN         = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultyHN           = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultyHN = new Date(`01/01/2000 ${officialHonorariumTimeIN}`);
        const endOfficialTimeFacultyHN   = new Date(`01/01/2000 ${officialHonorariumTimeOUT}`);
        const midnightFacultyHN          = new Date(`01/01/2000 00:00:00 AM`);

        const timeinfacultyHN  = endDateFacultyHN < startOfficialTimeFacultyHN ? midnightFacultyHN : startDateFacultyHN > endOfficialTimeFacultyHN ? midnightFacultyHN : startDateFacultyHN < startOfficialTimeFacultyHN ? startOfficialTimeFacultyHN : startDateFacultyHN;
        const timeoutfacultyHN = timeinfacultyHN === midnightFacultyHN ? midnightFacultyHN : endDateFacultyHN < startOfficialTimeFacultyHN ? midnightFacultyHN : endDateFacultyHN < endOfficialTimeFacultyHN ? endDateFacultyHN : endOfficialTimeFacultyHN;

        const diffMsHN         = timeoutfacultyHN - timeinfacultyHN;
        const hoursFacultyHN   = Math.floor(diffMsHN / (1000 * 60 * 60));
        const minutesFacultyHN = Math.floor((diffMsHN % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyHN = Math.floor((diffMsHN % (1000 * 60)) / 1000);
        const formattedFacultyRenderedTimeHN = [String(hoursFacultyHN).padStart(2,"0"), String(minutesFacultyHN).padStart(2,"0"), String(secondsFacultyHN).padStart(2,"0")].join(":");

        const diffMsFacultyHN    = endOfficialTimeFacultyHN - startOfficialTimeFacultyHN;
        const hoursFacultyMRTHN  = Math.floor(diffMsFacultyHN / (1000 * 60 * 60));
        const minutesFacultyMRTHN= Math.floor((diffMsFacultyHN % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTHN= Math.floor((diffMsFacultyHN % (1000 * 60)) / 1000);
        const formattedFacultyMaxRenderedTimeHN = [String(hoursFacultyMRTHN).padStart(2,"0"), String(minutesFacultyMRTHN).padStart(2,"0"), String(secondsFacultyMRTHN).padStart(2,"0")].join(":");

        const tardFinalHN    = new Date(`01/01/2000 ${formattedFacultyRenderedTimeHN}`);
        const tardFinalMaxHN = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeHN}`);
        const finalcalcFacultyHN = tardFinalMaxHN - tardFinalHN;
        const hoursfinalHN   = Math.floor(finalcalcFacultyHN / (1000 * 60 * 60));
        const minutesfinalHN = Math.floor((finalcalcFacultyHN % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalHN = Math.floor((finalcalcFacultyHN % (1000 * 60)) / 1000);
        const formattedfinalcalcFacultyHN = [String(hoursfinalHN).padStart(2,"0"), String(minutesfinalHN).padStart(2,"0"), String(secondsfinalHN).padStart(2,"0")].join(":");

        // ── Service Credit ────────────────────────────────────────────────
        const startDateFacultySC         = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultySC           = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultySC = new Date(`01/01/2000 ${officialServiceCreditTimeIN}`);
        const endOfficialTimeFacultySC   = new Date(`01/01/2000 ${officialServiceCreditTimeOUT}`);
        const midnightFacultySC          = new Date(`01/01/2000 00:00:00 AM`);

        const timeinfacultySC  = endDateFacultySC < startOfficialTimeFacultySC ? midnightFacultySC : startDateFacultySC > endOfficialTimeFacultySC ? midnightFacultySC : startDateFacultySC < startOfficialTimeFacultySC ? startOfficialTimeFacultySC : startDateFacultySC;
        const timeoutfacultySC = timeinfacultySC === midnightFacultySC ? midnightFacultySC : endDateFacultySC < startOfficialTimeFacultySC ? midnightFacultySC : endDateFacultySC < endOfficialTimeFacultySC ? endDateFacultySC : endOfficialTimeFacultySC;

        const diffMsSC         = timeoutfacultySC - timeinfacultySC;
        const hoursFacultySC   = Math.floor(diffMsSC / (1000 * 60 * 60));
        const minutesFacultySC = Math.floor((diffMsSC % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultySC = Math.floor((diffMsSC % (1000 * 60)) / 1000);
        const formattedFacultyRenderedTimeSC = [String(hoursFacultySC).padStart(2,"0"), String(minutesFacultySC).padStart(2,"0"), String(secondsFacultySC).padStart(2,"0")].join(":");

        const diffMsFacultySC    = endOfficialTimeFacultySC - startOfficialTimeFacultySC;
        const hoursFacultyMRTSC  = Math.floor(diffMsFacultySC / (1000 * 60 * 60));
        const minutesFacultyMRTSC= Math.floor((diffMsFacultySC % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTSC= Math.floor((diffMsFacultySC % (1000 * 60)) / 1000);
        const formattedFacultyMaxRenderedTimeSC = [String(hoursFacultyMRTSC).padStart(2,"0"), String(minutesFacultyMRTSC).padStart(2,"0"), String(secondsFacultyMRTSC).padStart(2,"0")].join(":");

        const tardFinalSC    = new Date(`01/01/2000 ${formattedFacultyRenderedTimeSC}`);
        const tardFinalMaxSC = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeSC}`);
        const finalcalcFacultySC = tardFinalMaxSC - tardFinalSC;
        const hoursfinalSC   = Math.floor(finalcalcFacultySC / (1000 * 60 * 60));
        const minutesfinalSC = Math.floor((finalcalcFacultySC % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalSC = Math.floor((finalcalcFacultySC % (1000 * 60)) / 1000);
        const formattedfinalcalcFacultySC = [String(hoursfinalSC).padStart(2,"0"), String(minutesfinalSC).padStart(2,"0"), String(secondsfinalSC).padStart(2,"0")].join(":");

        // ── Overtime ──────────────────────────────────────────────────────
        const startDateFacultyOT         = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultyOT           = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultyOT = new Date(`01/01/2000 ${officialOverTimeIN}`);
        const endOfficialTimeFacultyOT   = new Date(`01/01/2000 ${officialOverTimeOUT}`);
        const midnightFacultyOT          = new Date(`01/01/2000 00:00:00 AM`);

        const timeinfacultyOT  = endDateFacultyOT < startOfficialTimeFacultyOT ? midnightFacultyOT : startDateFacultyOT > endOfficialTimeFacultyOT ? midnightFacultyOT : startDateFacultyOT < startOfficialTimeFacultyOT ? startOfficialTimeFacultyOT : startDateFacultyOT;
        const timeoutfacultyOT = timeinfacultyOT === midnightFacultyOT ? midnightFacultyOT : endDateFacultyOT < startOfficialTimeFacultyOT ? midnightFacultyOT : endDateFacultyOT < endOfficialTimeFacultyOT ? endDateFacultyOT : endOfficialTimeFacultyOT;

        const diffMsOT         = timeoutfacultyOT - timeinfacultyOT;
        const hoursFacultyOT   = Math.floor(diffMsOT / (1000 * 60 * 60));
        const minutesFacultyOT = Math.floor((diffMsOT % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyOT = Math.floor((diffMsOT % (1000 * 60)) / 1000);
        const formattedFacultyRenderedTimeOT = [String(hoursFacultyOT).padStart(2,"0"), String(minutesFacultyOT).padStart(2,"0"), String(secondsFacultyOT).padStart(2,"0")].join(":");

        const diffMsFacultyOT    = endOfficialTimeFacultyOT - startOfficialTimeFacultyOT;
        const hoursFacultyMRTOT  = Math.floor(diffMsFacultyOT / (1000 * 60 * 60));
        const minutesFacultyMRTOT= Math.floor((diffMsFacultyOT % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTOT= Math.floor((diffMsFacultyOT % (1000 * 60)) / 1000);
        const formattedFacultyMaxRenderedTimeOT = [String(hoursFacultyMRTOT).padStart(2,"0"), String(minutesFacultyMRTOT).padStart(2,"0"), String(secondsFacultyMRTOT).padStart(2,"0")].join(":");

        const tardFinalOT    = new Date(`01/01/2000 ${formattedFacultyRenderedTimeOT}`);
        const tardFinalMaxOT = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeOT}`);
        const finalcalcFacultyOT = tardFinalMaxOT - tardFinalOT;
        const hoursfinalOT   = Math.floor(finalcalcFacultyOT / (1000 * 60 * 60));
        const minutesfinalOT = Math.floor((finalcalcFacultyOT % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalOT = Math.floor((finalcalcFacultyOT % (1000 * 60)) / 1000);
        const formattedfinalcalcFacultyOT = [String(hoursfinalOT).padStart(2,"0"), String(minutesfinalOT).padStart(2,"0"), String(secondsfinalOT).padStart(2,"0")].join(":");

        return {
          ...row,
          HonorariumTimeIN, HonorariumTimeOUT,
          ServiceCreditTimeIN, ServiceCreditTimeOUT,
          OverTimeIN, OverTimeOUT,
          officialTimeIN, officialTimeOUT,
          officialHonorariumTimeIN, officialHonorariumTimeOUT,
          officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
          officialOverTimeIN, officialOverTimeOUT,
          OfficialTimeMorning, OfficialTimeAfternoon,
          timeIN, timeOUT,
          OfficialBreakAM, OfficialBreakPM,
          breaktimeIN, breaktimeOUT,
          formattedfinalcalcFacultyAM, formattedFacultyMaxRenderedTimeAM, finalcalcFacultyAM, formattedFacultyRenderedTimeAM,
          formattedFacultyRenderedTimePM, formattedfinalcalcFacultyPM, formattedFacultyMaxRenderedTimePM, finalcalcFacultyPM,
          formattedfinalcalcFacultyHN, formattedFacultyRenderedTimeHN, formattedFacultyMaxRenderedTimeHN,
          formattedfinalcalcFacultySC, formattedFacultyRenderedTimeSC, formattedFacultyMaxRenderedTimeSC,
          formattedfinalcalcFacultyOT, formattedFacultyRenderedTimeOT, formattedFacultyMaxRenderedTimeOT,
        };
      });

      setAttendanceData(processedData);
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      const msg = "Failed to fetch attendance data. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Total calculations ────────────────────────────────────────────────────
  const calculateTotalRenderedTimeAM = () => {
    if (!attendanceData || attendanceData.length === 0) return "00:00:00";
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.officialTimeIN || !row.breaktimeIN || row.formattedFacultyRenderedTimeAM === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeAM;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600), mm = Math.floor((totalSeconds % 3600) / 60), ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const calculateTotalRenderedTimeTardinessAM = () => {
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.officialTimeIN || !row.breaktimeIN || row.formattedfinalcalcFacultyAM === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeAM : row.formattedfinalcalcFacultyAM;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600), mm = Math.floor((totalSeconds % 3600) / 60), ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const calculateTotalRenderedTimePM = () => {
    if (!attendanceData || attendanceData.length === 0) return "00:00:00";
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.officialBreaktimeOUT || !row.timeOUT || row.formattedFacultyRenderedTimePM === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimePM;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600), mm = Math.floor((totalSeconds % 3600) / 60), ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const calculateTotalRenderedTimeTardinessPM = () => {
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.officialBreaktimeOUT || !row.timeOUT || row.formattedfinalcalcFacultyPM === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimePM : row.formattedfinalcalcFacultyPM;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600), mm = Math.floor((totalSeconds % 3600) / 60), ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const totalRenderedDay = (() => {
    const am = calculateTotalRenderedTimeAM(), pm = calculateTotalRenderedTimePM();
    const [ah, am2, as2] = am.split(":").map(Number);
    const [ph, pm2, ps]  = pm.split(":").map(Number);
    let ts = as2 + ps, tm = am2 + pm2 + Math.floor(ts / 60), th = ah + ph + Math.floor(tm / 60);
    ts = ts % 60; tm = tm % 60;
    return `${String(th).padStart(2,"0")}:${String(tm).padStart(2,"0")}:${String(ts).padStart(2,"0")}`;
  })();

  const totalTardinessDay = (() => {
    const am = calculateTotalRenderedTimeTardinessAM(), pm = calculateTotalRenderedTimeTardinessPM();
    const [ah, am2, as2] = am.split(":").map(Number);
    const [ph, pm2, ps]  = pm.split(":").map(Number);
    let ts = as2 + ps, tm = am2 + pm2 + Math.floor(ts / 60), th = ah + ph + Math.floor(tm / 60);
    ts = ts % 60; tm = tm % 60;
    return `${String(th).padStart(2,"0")}:${String(tm).padStart(2,"0")}:${String(ts).padStart(2,"0")}`;
  })();

  const calculateTotalRenderedTimeHN = () => {
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeHN;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600), mm = Math.floor((totalSeconds % 3600) / 60), ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const calculateTotalRenderedTimeTardinessHN = () => {
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeHN : row.formattedfinalcalcFacultyHN;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600), mm = Math.floor((totalSeconds % 3600) / 60), ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const calculateTotalRenderedTimeSC = () => {
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeSC === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeSC;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600), mm = Math.floor((totalSeconds % 3600) / 60), ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const calculateTotalRenderedTimeTardinessSC = () => {
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeSC : row.formattedfinalcalcFacultySC;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600), mm = Math.floor((totalSeconds % 3600) / 60), ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const calculateTotalRenderedTimeOT = () => {
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeOT;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600), mm = Math.floor((totalSeconds % 3600) / 60), ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const calculateTotalRenderedTimeTardinessOT = () => {
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeOT : row.formattedfinalcalcFacultyOT;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600), mm = Math.floor((totalSeconds % 3600) / 60), ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveOverallAttendance = async () => {
    try {
      const dup = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        { params: { personID: employeeNumber, startDate, endDate }, ...getAuthHeaders() }
      );
      if (dup.data?.data?.length) {
        showSnackbar(
          `Record for Employee Number ${employeeNumber} covering ${startDate}–${endDate} already exists. Please check Overall Attendance to manage.`,
          "warning"
        );
        setTimeout(() => navigate("/attendance_summary"), 2500);
        return;
      }
    } catch (e) {
      console.error("Duplicate-check failed:", e);
      showSnackbar("Could not verify duplicates. Saving aborted.", "error");
      return;
    }

    const record = {
      personID:    employeeNumber,
      startDate,
      endDate,
      totalRenderedTimeMorning:            calculateTotalRenderedTimeAM(),
      totalRenderedTimeMorningTardiness:   calculateTotalRenderedTimeTardinessAM(),
      totalRenderedTimeAfternoon:          calculateTotalRenderedTimePM(),
      totalRenderedTimeAfternoonTardiness: calculateTotalRenderedTimeTardinessPM(),
      totalRenderedHonorarium:             calculateTotalRenderedTimeHN(),
      totalRenderedHonorariumTardiness:    calculateTotalRenderedTimeTardinessHN(),
      totalRenderedServiceCredit:          calculateTotalRenderedTimeSC(),
      totalRenderedServiceCreditTardiness: calculateTotalRenderedTimeTardinessSC(),
      totalRenderedOvertime:               calculateTotalRenderedTimeOT(),
      totalRenderedOvertimeTardiness:      calculateTotalRenderedTimeTardinessOT(),
      overallRenderedOfficialTime:         totalRenderedDay,
      overallRenderedOfficialTimeTardiness: totalTardinessDay,
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/overall_attendance`,
        record,
        getAuthHeaders()
      );
      showSnackbar(response.data.message || "Attendance record saved successfully!", "success");
      setTimeout(() => navigate("/attendance_summary"), 1500);
    } catch (err) {
      console.error("Error saving overall attendance:", err);
      showSnackbar("Failed to save attendance record.", "error");
    }
  };

  // ── Month / date helpers ──────────────────────────────────────────────────
  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleClearFilters = () => {
    setEmployeeNumber(""); setStartDate(""); setEndDate("");
    setAttendanceData([]); setError(""); setSelectedMonth(null);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(attendanceData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_${employeeNumber}_${startDate}_${endDate}.xlsx`);
  };

  // ── Wireframe / access guards ─────────────────────────────────────────────
  if (pageLoading || accessLoading) return (
    <AttendanceNonTeachingWireframe
      accentColor={accentColor}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    />
  );

  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Attendance Module for Non-Teaching Staff. Contact your administrator to request access."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <Fade in timeout={500}>
      <Box sx={{
        py: { xs: 2, md: 4 },
        width: "100vw", mx: "auto", maxWidth: "100%",
        overflow: "hidden", position: "relative",
        left: "53%", transform: "translateX(-51%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}>

        {/* ── Snackbar — top center ── */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{
              width: "100%", fontWeight: 600,
              backgroundColor: snackbar.severity === "success" ? "#4caf50" : undefined,
              color:           snackbar.severity === "success" ? "#ffffff" : undefined,
              "& .MuiAlert-icon": { color: snackbar.severity === "success" ? "#ffffff" : undefined },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip
                  label={`${snackbarCountdown}s`}
                  size="small"
                  sx={{
                    backgroundColor: snackbar.severity === "success" ? "rgba(255,255,255,0.3)" : undefined,
                    color:           snackbar.severity === "success" ? "#ffffff" : undefined,
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
              background: `rgba(${hexToRgb(primaryColor)},0.95)`,
              boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`,
              border: `1px solid ${alpha(accentColor,0.1)}`,
              "&:hover": { boxShadow: `0 12px 48px ${alpha(accentColor,0.15)}` },
            }}>
              <Box sx={{
                p: 5,
                background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
                color: textPrimaryColor, position: "relative", overflow: "hidden",
              }}>
                <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle,${alpha(accentColor,0.1)} 0%,${alpha(accentColor,0)} 70%)` }} />
                <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, background: `radial-gradient(circle,${alpha(accentColor,0.08)} 0%,${alpha(accentColor,0)} 70%)` }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(accentColor,0.15), mr: 4, width: 64, height: 64, boxShadow: `0 8px 24px ${alpha(accentColor,0.15)}` }}>
                      <WorkHistory sx={{ color: textPrimaryColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>
                        Attendance Records (Non-teaching)
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, color: textPrimaryColor }}>
                        Generate and review all attendance records of Non-Teaching employees
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label="Non-Teaching"
                      size="small"
                      sx={{ bgcolor: alpha(accentColor,0.15), color: textPrimaryColor, fontWeight: 500, "& .MuiChip-label": { px: 1 } }}
                    />
                    <Tooltip title="Refresh Data">
                      <IconButton
                        onClick={handleSubmit}
                        disabled={!employeeNumber || !startDate || !endDate}
                        sx={{
                          bgcolor: alpha(accentColor,0.1), "&:hover": { bgcolor: alpha(accentColor,0.2) },
                          color: textPrimaryColor, width: 48, height: 48,
                          "&:disabled": { bgcolor: alpha(accentColor,0.05), color: alpha(accentColor,0.3) },
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

        {/* ── Controls Card ── */}
        <Fade in timeout={700}>
          <GlassCard sx={{
            mb: 4,
            background: `rgba(${hexToRgb(primaryColor)},0.95)`,
            boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`,
            border: `1px solid ${alpha(accentColor,0.1)}`,
            "&:hover": { boxShadow: `0 12px 48px ${alpha(accentColor,0.15)}` },
          }}>
            <CardContent sx={{ p: 4, "&:last-child": { pb: 4 } }}>

              {/* Input fields */}
              <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
                {[
                  { label: "Employee Number", value: employeeNumber, onChange: (e) => setEmployeeNumber(e.target.value), type: "text",  icon: <Person sx={{ color: textPrimaryColor }} /> },
                  { label: "Start Date",       value: startDate,      onChange: (e) => setStartDate(e.target.value),      type: "date",  icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
                  { label: "End Date",         value: endDate,        onChange: (e) => setEndDate(e.target.value),        type: "date",  icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
                ].map(({ label, value, onChange, type, icon }) => (
                  <Box key={label} sx={{ flex: 1, minWidth: 160 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: textPrimaryColor }}>{label}</Typography>
                    <ModernTextField
                      type={type} value={value} onChange={onChange} required
                      InputLabelProps={type === "date" ? { shrink: true } : {}}
                      InputProps={{ startAdornment: <InputAdornment position="start">{icon}</InputAdornment> }}
                      fullWidth
                    />
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 3, borderColor: alpha(accentColor,0.1) }} />

              {/* Month picker — dashed box */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ p: 3, borderRadius: 2, border: `2px dashed ${alpha(accentColor,0.2)}`, backgroundColor: alpha(primaryColor,0.3) }}>
                  <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2, mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: textPrimaryColor, fontWeight: 600, mb: 0.5 }}>
                        Select Entire Month
                      </Typography>
                      <Typography variant="body2" sx={{ color: alpha(textPrimaryColor,0.7) }}>
                        Choose a year, then click any month to view records for that entire month
                      </Typography>
                    </Box>
                    <FormControl sx={{ minWidth: 140 }}>
                      <InputLabel sx={{ fontWeight: 600 }}>Year</InputLabel>
                      <Select
                        value={selectedYear} label="Year"
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setSelectedMonth(null);
                          showSnackbar("Year changed — please click a month to load records.", "info");
                        }}
                        sx={{ backgroundColor: "white", "& .MuiOutlinedInput-notchedOutline": { borderColor: accentColor }, borderRadius: 2, fontWeight: 600 }}
                      >
                        {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                    {months.map((month, index) => {
                      const sel = selectedMonth === index;
                      return (
                        <ProfessionalButton
                          key={month} variant={sel ? "contained" : "outlined"} size="medium"
                          onClick={() => handleMonthClick(index)}
                          sx={{
                            borderColor: accentColor,
                            backgroundColor: sel ? accentColor : "transparent",
                            color: sel ? textSecondaryColor : textPrimaryColor,
                            py: 1.5, px: 4.5, fontWeight: 600,
                            "&:hover": { backgroundColor: sel ? accentDark : alpha(accentColor,0.1), borderWidth: 2 },
                            transition: "all 0.3s ease",
                            boxShadow: sel ? `0 4px 12px ${alpha(accentColor,0.3)}` : "none",
                          }}
                        >
                          {month}
                        </ProfessionalButton>
                      );
                    })}
                  </Box>
                </Box>
              </Box>

              {/* Action buttons row */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3, flexWrap: "wrap", gap: 2 }}>
                <ProfessionalButton
                  variant="outlined" startIcon={<Clear />} onClick={handleClearFilters}
                  sx={{ borderColor: "#d32f2f", color: "#d32f2f", "&:hover": { borderColor: "#b71c1c", backgroundColor: alpha("#d32f2f",0.05) } }}
                >
                  Clear All Filters
                </ProfessionalButton>
                <ProfessionalButton
                  variant="contained" startIcon={<Refresh />} onClick={handleSubmit}
                  disabled={!employeeNumber || !startDate || !endDate}
                  sx={{ py: 1.5, px: 4, bgcolor: accentColor, color: primaryColor, fontSize: "1rem", "&:hover": { bgcolor: accentDark } }}
                >
                  Search Records
                </ProfessionalButton>
              </Box>

            </CardContent>
          </GlassCard>
        </Fade>

        {error && (
          <Fade in timeout={300}>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3, "& .MuiAlert-message": { fontWeight: 500 } }} onClose={() => setError("")}>
              {error}
            </Alert>
          </Fade>
        )}

        {/* ── Results Table ── */}
        {attendanceData.length > 0 && (
          <Fade in={!loading} timeout={500}>
            <GlassCard ref={resultsRef} sx={{ mb: 4, border: `1px solid ${alpha(accentColor,0.1)}` }}>
              <Box sx={{
                p: 4,
                background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
                color: accentColor, display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, textTransform: "uppercase", letterSpacing: "0.1em", color: accentDark }}>
                    Non-Teaching Staff Attendance Records
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: accentColor }}>
                    <b>{employeeNumber}</b>
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
                    <Chip
                      icon={<WorkHistory />}
                      label={`${attendanceData.length} Records`}
                      size="small"
                      sx={{ bgcolor: alpha(accentColor,0.15), color: accentColor, fontWeight: 500 }}
                    />
                    <Typography variant="body2" sx={{ opacity: 0.8, color: accentDark }}>
                      {startDate} to {endDate}
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: alpha(accentColor,0.15), width: 80, height: 80, color: accentColor }}>
                  <WorkHistory sx={{ fontSize: 36 }} />
                </Avatar>
              </Box>

              <PremiumTableContainer sx={{ mt: 3 }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table sx={{ minWidth: 1800 }}>
                    <TableHead sx={{ bgcolor: alpha(primaryColor,0.7) }}>
                      <TableRow>
                        {[
                          { label: "Date",                                      minWidth: 150, bg: null },
                          { label: "Day",                                       minWidth: 100, bg: alpha(primaryColor,0.5) },
                          { label: "Time IN",                                   minWidth: 150, bg: null },
                          { label: "Official Time IN",                          minWidth: 120, bg: alpha(primaryColor,0.5) },
                          { label: "Breaktime IN",                              minWidth: 150, bg: null },
                          { label: "Official Breaktime IN",                     minWidth: 120, bg: alpha(primaryColor,0.5) },
                          { label: "Official Time (MORNING) Rendered Time",     minWidth: 100, bg: alpha(accentColor,0.2) },
                          { label: "Tardiness (MORNING)",                       minWidth: 100, bg: alpha(accentColor,0.3) },
                          { label: "Breaktime OUT",                             minWidth: 120, bg: null },
                          { label: "Official Breaktime OUT",                    minWidth: 120, bg: alpha(primaryColor,0.5) },
                          { label: "Time OUT",                                  minWidth: 120, bg: null },
                          { label: "Official Time OUT",                         minWidth: 120, bg: alpha(primaryColor,0.5) },
                          { label: "Official Time (AFTERNOON) Rendered Time",   minWidth: 100, bg: alpha(accentColor,0.2) },
                          { label: "TARDINESS (AFTERNOON)",                     minWidth: 100, bg: alpha(accentColor,0.3) },
                          { label: "Honorarium Time IN",                        minWidth: 140, bg: null },
                          { label: "OFFICIAL Honorarium Time IN",               minWidth: 120, bg: alpha(primaryColor,0.5) },
                          { label: "Honorarium Time OUT",                       minWidth: 150, bg: null },
                          { label: "OFFICIAL Honorarium Time OUT",              minWidth: 120, bg: alpha(primaryColor,0.5) },
                          { label: "Honorarium Rendered Time",                  minWidth: 100, bg: alpha(accentColor,0.2) },
                          { label: "TARDINESS (HONORARIUM)",                    minWidth: 100, bg: alpha(accentColor,0.3) },
                          { label: "Service Credit Time IN",                    minWidth: 160, bg: null },
                          { label: "OFFICIAL Service Credit Time IN",           minWidth: 120, bg: alpha(primaryColor,0.5) },
                          { label: "Service Credit Time OUT",                   minWidth: 170, bg: null },
                          { label: "OFFICIAL Service Credit Time OUT",          minWidth: 120, bg: alpha(primaryColor,0.5) },
                          { label: "Service Credit Rendered Time",              minWidth: 100, bg: alpha(accentColor,0.2) },
                          { label: "TARDINESS (SERVICE CREDIT)",                minWidth: 100, bg: alpha(accentColor,0.3) },
                          { label: "Overtime Time IN",                          minWidth: 130, bg: null },
                          { label: "OFFICIAL Overtime Time IN",                 minWidth: 120, bg: alpha(primaryColor,0.5) },
                          { label: "Overtime Time OUT",                         minWidth: 140, bg: null },
                          { label: "OFFICIAL Overtime Time OUT",                minWidth: 120, bg: alpha(primaryColor,0.5) },
                          { label: "Overtime Rendered Time",                    minWidth: 100, bg: alpha(accentColor,0.2) },
                          { label: "TARDINESS (OVERTIME)",                      minWidth: 100, bg: alpha(accentColor,0.3) },
                        ].map(({ label, minWidth, bg }) => (
                          <PremiumTableCell key={label} isHeader bgColor={bg} sx={{ color: accentColor, minWidth }}>
                            {label}
                          </PremiumTableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceData.map((row, index) => (
                        <TableRow
                          key={index}
                          sx={{
                            "&:nth-of-type(even)": { bgcolor: alpha(primaryColor,0.3) },
                            "&:hover": { bgcolor: alpha(accentColor,0.05) },
                            transition: "all 0.2s ease",
                          }}
                        >
                          <PremiumTableCell sx={{ fontWeight: "bold", textAlign: "center" }}>{row.date}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.day}</PremiumTableCell>
                          <PremiumTableCell>{row.timeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.officialTimeIN}</PremiumTableCell>
                          <PremiumTableCell>{row.breaktimeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.officialBreaktimeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.breaktimeIN || row.formattedFacultyRenderedTimeAM === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeAM}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.breaktimeIN || row.formattedfinalcalcFacultyAM === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeAM : row.formattedfinalcalcFacultyAM}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.breaktimeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.officialBreaktimeOUT}</PremiumTableCell>
                          <PremiumTableCell>{row.timeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.officialTimeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialBreaktimeOUT || !row.timeOUT || row.formattedFacultyRenderedTimePM === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimePM}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialBreaktimeOUT || !row.timeOUT || row.formattedfinalcalcFacultyPM === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimePM : row.formattedfinalcalcFacultyPM}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialHonorariumTimeIN === "00:00:00 AM" ? "N/A" : row.timeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialHonorariumTimeIN === "00:00:00 AM" ? "N/A" : row.officialHonorariumTimeIN}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialHonorariumTimeOUT === "00:00:00 AM" ? "N/A" : row.timeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialHonorariumTimeOUT === "00:00:00 AM" ? "N/A" : row.officialHonorariumTimeOUT}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeHN}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeHN : row.formattedfinalcalcFacultyHN}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialServiceCreditTimeIN === "00:00:00 AM" ? "N/A" : row.timeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialServiceCreditTimeIN === "00:00:00 AM" ? "N/A" : row.officialServiceCreditTimeIN}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialServiceCreditTimeOUT === "00:00:00 AM" ? "N/A" : row.timeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialServiceCreditTimeOUT === "00:00:00 AM" ? "N/A" : row.officialServiceCreditTimeOUT}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeSC || !row.timeOUT || row.formattedFacultyRenderedTimeSC === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeSC}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeSC : row.formattedfinalcalcFacultySC}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialOverTimeIN === "00:00:00 AM" ? "N/A" : row.timeIN}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialOverTimeIN === "00:00:00 AM" ? "N/A" : row.officialOverTimeIN}
                          </PremiumTableCell>
                          <PremiumTableCell>{row.officialOverTimeOUT === "00:00:00 AM" ? "N/A" : row.timeOUT}</PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {row.officialOverTimeOUT === "00:00:00 AM" ? "N/A" : row.officialOverTimeOUT}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeOT}
                          </PremiumTableCell>
                          <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                            {!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeOT : row.formattedfinalcalcFacultyOT}
                          </PremiumTableCell>
                        </TableRow>
                      ))}

                      {/* Totals row */}
                      <TableRow>
                        <PremiumTableCell colSpan={6} sx={{ fontWeight: "bold", textAlign: "right" }}>Total Rendered Time (Morning):</PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>{calculateTotalRenderedTimeAM()}</PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>{calculateTotalRenderedTimeTardinessAM()}</PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>Total Rendered Time (Afternoon):</PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>{calculateTotalRenderedTimePM()}</PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>{calculateTotalRenderedTimeTardinessPM()}</PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>Total Rendered Time (Honorarium):</PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>{calculateTotalRenderedTimeHN()}</PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>{calculateTotalRenderedTimeTardinessHN()}</PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>Total Rendered Time (Service Credit):</PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>{calculateTotalRenderedTimeSC()}</PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>{calculateTotalRenderedTimeTardinessSC()}</PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>Total Rendered Time (Overtime):</PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>{calculateTotalRenderedTimeOT()}</PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>{calculateTotalRenderedTimeTardinessOT()}</PremiumTableCell>
                      </TableRow>

                      {/* Overall summary row */}
                      <TableRow>
                        <PremiumTableCell colSpan={2} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Overall Rendered Time<br />{startDate} to {endDate}:
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={3} bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "left" }}>
                          {totalRenderedDay}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={2} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Overall Tardiness Official Time<br />{startDate} to {endDate}:
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={2} bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "left" }}>
                          {totalTardinessDay}
                        </PremiumTableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
              </PremiumTableContainer>
            </GlassCard>
          </Fade>
        )}

        {/* ── Save Button Card ── */}
        {attendanceData.length > 0 && (
          <Fade in timeout={900}>
            <GlassCard sx={{
              background: `rgba(${hexToRgb(primaryColor)},0.95)`,
              boxShadow: `0 8px 40px ${alpha(accentColor,0.08)}`,
              border: `1px solid ${alpha(accentColor,0.1)}`,
            }}>
              <CardHeader
                title={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(primaryColor,0.8), color: accentColor }}>
                      <SaveAs />
                    </Avatar>
                    <Typography variant="body2" sx={{ color: accentDark }}>
                      Save the computed overall attendance record to the database
                    </Typography>
                  </Box>
                }
                sx={{ bgcolor: alpha(primaryColor,0.5), pb: 2, borderBottom: `1px solid ${alpha(accentColor,0.1)}` }}
              />
              <CardContent sx={{ p: 4, "&:last-child": { pb: 4 } }}>
                <ProfessionalButton
                  variant="contained" fullWidth startIcon={<SaveAs />}
                  onClick={saveOverallAttendance} disabled={loading}
                  sx={{ py: 2, fontSize: "1rem", bgcolor: accentColor, color: primaryColor, "&:hover": { bgcolor: accentDark } }}
                >
                  Save Record
                </ProfessionalButton>
              </CardContent>
            </GlassCard>
          </Fade>
        )}

      </Box>
    </Fade>
  );
};

export default AttendanceModuleNonTeachingStaff;