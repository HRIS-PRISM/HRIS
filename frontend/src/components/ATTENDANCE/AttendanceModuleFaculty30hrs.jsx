import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Container,
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
  Grid,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from "@mui/material";
import {
  WorkHistory,
  Person,
  CalendarToday,
  Clear,
  SaveAs,
  Refresh,
  DateRange,
} from "@mui/icons-material";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";
import { getAuthHeaders } from "../../utils/auth";

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
@keyframes amsShimmer {
  0%   { background-position: -900px 0; }
  100% { background-position:  900px 0; }
}
@keyframes amsPulse {
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
      animation: "amsShimmer 1.6s infinite linear",
      ...sx,
    }}
  />
);

const Placeholder = ({ w, h, r = 4, color = "rgba(109,35,35,0.08)", sx = {} }) => (
  <Box sx={{ width: w, height: h, borderRadius: r, bgcolor: color, flexShrink: 0, ...sx }} />
);

const AttendanceFacultyWireframe = ({
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
          animation: "amsPulse 2.2s ease-in-out infinite",
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
                <S w={160} h={26} r={13} accent={ac} />
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
          animation: "amsPulse 2.2s ease-in-out 0.08s infinite",
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
              {/* Header row: title+desc left, year selector right */}
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
                  <S key={i} w={64} h={44} r={10} accent={ac} sx={{ animation: `amsShimmer 1.6s infinite linear ${i * 0.05}s` }} />
                ))}
              </Box>
            </Box>

            {/* Action buttons row: Clear left, Search right */}
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
          animation: "amsPulse 2.2s ease-in-out 0.15s infinite",
          bgcolor: `rgba(${hexToRgb(primaryColor)},0.95)`,
        }}>
          {/* Table header banner */}
          <Box sx={{ p: 4, background: grad, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <S w={200} h={10} r={3} accent={ac} sx={{ mb: "6px" }} />
              <S w={160} h={20} r={4} accent={ac} sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <S w={110} h={22} r={11} accent={ac} />
                <S w={140} h={10} r={3} accent={ac} />
              </Box>
            </Box>
            <Placeholder w={80} h={80} r="50%" color={alpha(ac, 0.13)} />
          </Box>

          {/* Table column headers — multiple cols */}
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
              animation: `amsPulse 2.2s ease-in-out ${i * 0.06}s infinite`,
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
          animation: "amsPulse 2.2s ease-in-out 0.2s infinite",
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
const AttendanceModuleFaculty = () => {
  const [suspensionByDate, setSuspensionByDate] = useState({});
  const [leaveByDate, setLeaveByDate] = useState({});
  const [holidayByDate, setHolidayByDate] = useState({});
  const { settings } = useSystemSettings();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showNoOfficialTimeModal, setShowNoOfficialTimeModal] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();

  // Colors from system settings
  const primaryColor       = settings.accentColor        || "#FEF9E1";
  const secondaryColor     = settings.backgroundColor    || "#FFF8E7";
  const accentColor        = settings.primaryColor       || "#6d2323";
  const accentDark         = settings.secondaryColor     || "#8B3333";
  const textPrimaryColor   = settings.textPrimaryColor   || "#6d2323";
  const textSecondaryColor = settings.textSecondaryColor || "#FEF9E1";
  const whiteColor         = "#FFFFFF";

  const today = new Date();

  // Access control
  const { hasAccess, loading: accessLoading } = usePageAccess("attendance-module-faculty");

  // Month / year selectors
  const currentYear = new Date().getFullYear();
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
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

  // ── Furlough helper ───────────────────────────────────────────────────────
  const isFurloughDate = (date, suspMap, leaveMap, holidayMap) =>
    Boolean(suspMap?.[date] || leaveMap?.[date] || holidayMap?.[date]);

  // ── handleSubmit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    localStorage.setItem("employeeNumber", employeeNumber);
    localStorage.setItem("startDate", startDate);
    localStorage.setItem("endDate", endDate);

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.get(`${API_BASE_URL}/attendance/api/attendance`, {
        params: { personId: employeeNumber, startDate, endDate },
        ...getAuthHeaders(),
      });

      const dateOnly = (val) => (val ? String(val).split("T")[0] : "");
      const byDateRange = (response.data || []).filter((row) => {
        const d     = dateOnly(row.date);
        const start = dateOnly(row.startDate);
        const end   = dateOnly(row.endDate);
        if (!d) return true;
        if (!start || !end) return true;
        return d >= start && d <= end;
      });
      const seen      = new Set();
      const onePerDate = byDateRange.filter((row) => {
        const d = dateOnly(row.date);
        if (seen.has(d)) return false;
        seen.add(d);
        return true;
      });

      const hasOfficialTime = onePerDate.some(
        (row) => row.officialTimeIN && row.officialTimeOUT &&
                 row.officialTimeIN !== "00:00:00 AM" && row.officialTimeOUT !== "00:00:00 AM"
      );

      if (!hasOfficialTime || onePerDate.length === 0) {
        setShowNoOfficialTimeModal(true);
        setLoading(false);
        return;
      }

      const processedData = onePerDate.map((row) => {
        const {
          timeIN, timeOUT, breaktimeIN, breaktimeOUT,
          officialBreaktimeIN, officialBreaktimeOUT,
          officialTimeIN, officialTimeOUT,
          officialHonorariumTimeIN, officialHonorariumTimeOUT,
          officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
          officialOverTimeIN, officialOverTimeOUT,
        } = row;

        const parsedTimeIN                      = dayjs(`2024-01-01 ${timeIN}`,                      "YYYY-MM-DD hh:mm:ss A");
        const parsedTimeOUT                     = dayjs(`2024-01-01 ${timeOUT}`,                     "YYYY-MM-DD hh:mm:ss A");
        const parsedBreaktimeIN                 = dayjs(`2024-01-01 ${breaktimeIN}`,                 "YYYY-MM-DD hh:mm:ss A");
        const parsedBreaktimeOUT                = dayjs(`2024-01-01 ${breaktimeOUT}`,                "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialBreaktimeIN         = dayjs(`2024-01-01 ${officialBreaktimeIN}`,         "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialBreaktimeOUT        = dayjs(`2024-01-01 ${officialBreaktimeOUT}`,        "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialTimeIN              = dayjs(`2024-01-01 ${officialTimeIN}`,              "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialTimeOUT             = dayjs(`2024-01-01 ${officialTimeOUT}`,             "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialHonorariumTimeIN    = dayjs(`2024-01-01 ${officialHonorariumTimeIN}`,    "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialHonorariumTimeOUT   = dayjs(`2024-01-01 ${officialHonorariumTimeOUT}`,   "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialServiceCreditTimeIN = dayjs(`2024-01-01 ${officialServiceCreditTimeIN}`, "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialServiceCreditTimeOUT= dayjs(`2024-01-01 ${officialServiceCreditTimeOUT}`,"YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialOverTimeIN          = dayjs(`2024-01-01 ${officialOverTimeIN}`,          "YYYY-MM-DD hh:mm:ss A");
        const parsedOfficialOverTimeOUT         = dayjs(`2024-01-01 ${officialOverTimeOUT}`,         "YYYY-MM-DD hh:mm:ss A");

        const OfficialTimeMorning      = parsedTimeIN.isBefore(parsedOfficialTimeIN)              ? parsedOfficialTimeIN.format("hh:mm:ss A")              : parsedTimeIN.format("hh:mm:ss A");
        const OfficialTimeAfternoon    = parsedTimeOUT.isAfter(parsedOfficialTimeOUT)             ? parsedOfficialTimeOUT.format("hh:mm:ss A")             : parsedTimeOUT.format("hh:mm:ss A");
        const HonorariumTimeIN         = parsedTimeIN.isBefore(parsedOfficialHonorariumTimeIN)    ? parsedOfficialHonorariumTimeIN.format("hh:mm:ss A")    : parsedTimeIN.format("hh:mm:ss A");
        const HonorariumTimeOUT        = parsedTimeOUT.isAfter(parsedOfficialHonorariumTimeOUT)   ? parsedOfficialHonorariumTimeOUT.format("hh:mm:ss A")   : parsedTimeOUT.format("hh:mm:ss A");
        const ServiceCreditTimeIN      = parsedTimeIN.isBefore(parsedOfficialServiceCreditTimeIN) ? parsedOfficialServiceCreditTimeIN.format("hh:mm:ss A") : parsedTimeIN.format("hh:mm:ss A");
        const ServiceCreditTimeOUT     = parsedTimeOUT.isAfter(parsedOfficialServiceCreditTimeOUT)? parsedOfficialServiceCreditTimeOUT.format("hh:mm:ss A"): parsedTimeOUT.format("hh:mm:ss A");
        const OverTimeIN               = parsedTimeIN.isBefore(parsedOfficialOverTimeIN)          ? parsedOfficialOverTimeIN.format("hh:mm:ss A")          : parsedTimeIN.format("hh:mm:ss A");
        const OverTimeOUT              = parsedTimeOUT.isAfter(parsedOfficialOverTimeOUT)         ? parsedOfficialOverTimeOUT.format("hh:mm:ss A")         : parsedTimeOUT.format("hh:mm:ss A");
        const OfficialBreakAM          = parsedBreaktimeIN.isAfter(parsedOfficialBreaktimeIN)     ? parsedOfficialBreaktimeIN.format("hh:mm:ss A")         : parsedBreaktimeIN.format("hh:mm:ss A");
        const OfficialBreakPM          = parsedBreaktimeOUT.isAfter(parsedOfficialBreaktimeOUT)   ? parsedBreaktimeOUT.format("hh:mm:ss A")                : parsedOfficialBreaktimeOUT.format("hh:mm:ss A");

        // ── Regular Duty ──────────────────────────────────────────────────
        const startDateFaculty         = new Date(`01/01/2000 ${timeIN}`);
        const endDateFaculty           = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFaculty = new Date(`01/01/2000 ${officialTimeIN}`);
        const endOfficialTimeFaculty   = new Date(`01/01/2000 ${officialTimeOUT}`);
        const midnightFaculty          = new Date(`01/01/2000 00:00:00 AM`);

        const timeinfaculty  = startDateFaculty > endOfficialTimeFaculty ? midnightFaculty : startDateFaculty < startOfficialTimeFaculty ? startOfficialTimeFaculty : startDateFaculty;
        const timeoutfaculty = timeinfaculty === midnightFaculty ? midnightFaculty : endDateFaculty < endOfficialTimeFaculty ? endDateFaculty : endOfficialTimeFaculty;

        const diffMs            = timeoutfaculty - timeinfaculty;
        const hoursFaculty      = Math.floor(diffMs / (1000 * 60 * 60));
        const minutesFaculty    = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFaculty    = Math.floor((diffMs % (1000 * 60)) / 1000);
        const formattedFacultyRenderedTime = [String(hoursFaculty).padStart(2,"0"), String(minutesFaculty).padStart(2,"0"), String(secondsFaculty).padStart(2,"0")].join(":");

        const diffMsFaculty         = endOfficialTimeFaculty - startOfficialTimeFaculty;
        const hoursFacultyMRT       = Math.floor(diffMsFaculty / (1000 * 60 * 60));
        const minutesFacultyMRT     = Math.floor((diffMsFaculty % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRT     = Math.floor((diffMsFaculty % (1000 * 60)) / 1000);
        const formattedFacultyMaxRenderedTime = [String(hoursFacultyMRT).padStart(2,"0"), String(minutesFacultyMRT).padStart(2,"0"), String(secondsFacultyMRT).padStart(2,"0")].join(":");

        const tardFinal    = new Date(`01/01/2000 ${formattedFacultyRenderedTime}`);
        const tardFinalMax = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTime}`);
        const finalcalcFaculty = tardFinalMax - tardFinal;
        const hoursfinalcalcFaculty   = Math.floor(finalcalcFaculty / (1000 * 60 * 60));
        const minutesfinalcalcFaculty = Math.floor((finalcalcFaculty % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalcalcFaculty = Math.floor((finalcalcFaculty % (1000 * 60)) / 1000);
        const formattedfinalcalcFaculty = [String(hoursfinalcalcFaculty).padStart(2,"0"), String(minutesfinalcalcFaculty).padStart(2,"0"), String(secondsfinalcalcFaculty).padStart(2,"0")].join(":");

        // ── Honorarium ────────────────────────────────────────────────────
        const startDateFacultyHN         = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultyHN           = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultyHN = new Date(`01/01/2000 ${officialHonorariumTimeIN}`);
        const endOfficialTimeFacultyHN   = new Date(`01/01/2000 ${officialHonorariumTimeOUT}`);
        const midnightFacultyHN          = new Date(`01/01/2000 00:00:00 AM`);

        const timeinfacultyHN  = endDateFacultyHN < startOfficialTimeFacultyHN ? midnightFacultyHN : startDateFacultyHN > endOfficialTimeFacultyHN ? midnightFacultyHN : startDateFacultyHN < startOfficialTimeFacultyHN ? startOfficialTimeFacultyHN : startDateFacultyHN;
        const timeoutfacultyHN = timeinfacultyHN === midnightFacultyHN ? midnightFacultyHN : endDateFacultyHN < startOfficialTimeFacultyHN ? midnightFacultyHN : endDateFacultyHN < endOfficialTimeFacultyHN ? endDateFacultyHN : endOfficialTimeFacultyHN;

        const diffMsHN              = timeoutfacultyHN - timeinfacultyHN;
        const hoursFacultyHN        = Math.floor(diffMsHN / (1000 * 60 * 60));
        const minutesFacultyHN      = Math.floor((diffMsHN % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyHN      = Math.floor((diffMsHN % (1000 * 60)) / 1000);
        const formattedFacultyRenderedTimeHN = [String(hoursFacultyHN).padStart(2,"0"), String(minutesFacultyHN).padStart(2,"0"), String(secondsFacultyHN).padStart(2,"0")].join(":");

        const diffMsFacultyHN         = endOfficialTimeFacultyHN - startOfficialTimeFacultyHN;
        const hoursFacultyMRTHN       = Math.floor(diffMsFacultyHN / (1000 * 60 * 60));
        const minutesFacultyMRTHN     = Math.floor((diffMsFacultyHN % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTHN     = Math.floor((diffMsFacultyHN % (1000 * 60)) / 1000);
        const formattedFacultyMaxRenderedTimeHN = [String(hoursFacultyMRTHN).padStart(2,"0"), String(minutesFacultyMRTHN).padStart(2,"0"), String(secondsFacultyMRTHN).padStart(2,"0")].join(":");

        const tardFinalHN    = new Date(`01/01/2000 ${formattedFacultyRenderedTimeHN}`);
        const tardFinalMaxHN = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeHN}`);
        const finalcalcFacultyHN = tardFinalMaxHN - tardFinalHN;
        const hoursfinalcalcFacultyHN   = Math.floor(finalcalcFacultyHN / (1000 * 60 * 60));
        const minutesfinalcalcFacultyHN = Math.floor((finalcalcFacultyHN % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalcalcFacultyHN = Math.floor((finalcalcFacultyHN % (1000 * 60)) / 1000);
        const formattedfinalcalcFacultyHN = [String(hoursfinalcalcFacultyHN).padStart(2,"0"), String(minutesfinalcalcFacultyHN).padStart(2,"0"), String(secondsfinalcalcFacultyHN).padStart(2,"0")].join(":");

        // ── Service Credit ────────────────────────────────────────────────
        const startDateFacultySC         = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultySC           = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultySC = new Date(`01/01/2000 ${officialServiceCreditTimeIN}`);
        const endOfficialTimeFacultySC   = new Date(`01/01/2000 ${officialServiceCreditTimeOUT}`);
        const midnightFacultySC          = new Date(`01/01/2000 00:00:00 AM`);

        const timeinfacultySC  = endDateFacultySC < startOfficialTimeFacultySC ? midnightFacultySC : startDateFacultySC > endOfficialTimeFacultySC ? midnightFacultySC : startDateFacultySC < startOfficialTimeFacultySC ? startOfficialTimeFacultySC : startDateFacultySC;
        const timeoutfacultySC = timeinfacultySC === midnightFacultySC ? midnightFacultySC : endDateFacultySC < startOfficialTimeFacultySC ? midnightFacultySC : endDateFacultySC < endOfficialTimeFacultySC ? endDateFacultySC : endOfficialTimeFacultySC;

        const diffMsSC              = timeoutfacultySC - timeinfacultySC;
        const hoursFacultySC        = Math.floor(diffMsSC / (1000 * 60 * 60));
        const minutesFacultySC      = Math.floor((diffMsSC % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultySC      = Math.floor((diffMsSC % (1000 * 60)) / 1000);
        const formattedFacultyRenderedTimeSC = [String(hoursFacultySC).padStart(2,"0"), String(minutesFacultySC).padStart(2,"0"), String(secondsFacultySC).padStart(2,"0")].join(":");

        const diffMsFacultySC         = endOfficialTimeFacultySC - startOfficialTimeFacultySC;
        const hoursFacultyMRTSC       = Math.floor(diffMsFacultySC / (1000 * 60 * 60));
        const minutesFacultyMRTSC     = Math.floor((diffMsFacultySC % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTSC     = Math.floor((diffMsFacultySC % (1000 * 60)) / 1000);
        const formattedFacultyMaxRenderedTimeSC = [String(hoursFacultyMRTSC).padStart(2,"0"), String(minutesFacultyMRTSC).padStart(2,"0"), String(secondsFacultyMRTSC).padStart(2,"0")].join(":");

        const tardFinalSC    = new Date(`01/01/2000 ${formattedFacultyRenderedTimeSC}`);
        const tardFinalMaxSC = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeSC}`);
        const finalcalcFacultySC = tardFinalMaxSC - tardFinalSC;
        const hoursfinalcalcFacultySC   = Math.floor(finalcalcFacultySC / (1000 * 60 * 60));
        const minutesfinalcalcFacultySC = Math.floor((finalcalcFacultySC % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalcalcFacultySC = Math.floor((finalcalcFacultySC % (1000 * 60)) / 1000);
        const formattedfinalcalcFacultySC = [String(hoursfinalcalcFacultySC).padStart(2,"0"), String(minutesfinalcalcFacultySC).padStart(2,"0"), String(secondsfinalcalcFacultySC).padStart(2,"0")].join(":");

        // ── Overtime ──────────────────────────────────────────────────────
        const startDateFacultyOT         = new Date(`01/01/2000 ${timeIN}`);
        const endDateFacultyOT           = new Date(`01/01/2000 ${timeOUT}`);
        const startOfficialTimeFacultyOT = new Date(`01/01/2000 ${officialOverTimeIN}`);
        const endOfficialTimeFacultyOT   = new Date(`01/01/2000 ${officialOverTimeOUT}`);
        const midnightFacultyOT          = new Date(`01/01/2000 00:00:00 AM`);

        const timeinfacultyOT  = endDateFacultyOT < startOfficialTimeFacultyOT ? midnightFacultyOT : startDateFacultyOT > endOfficialTimeFacultyOT ? midnightFacultyOT : startDateFacultyOT < startOfficialTimeFacultyOT ? startOfficialTimeFacultyOT : startDateFacultyOT;
        const timeoutfacultyOT = timeinfacultyOT === midnightFacultyOT ? midnightFacultyOT : endDateFacultyOT < startOfficialTimeFacultyOT ? midnightFacultyOT : endDateFacultyOT < endOfficialTimeFacultyOT ? endDateFacultyOT : endOfficialTimeFacultyOT;

        const diffMsOT              = timeoutfacultyOT - timeinfacultyOT;
        const hoursFacultyOT        = Math.floor(diffMsOT / (1000 * 60 * 60));
        const minutesFacultyOT      = Math.floor((diffMsOT % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyOT      = Math.floor((diffMsOT % (1000 * 60)) / 1000);
        const formattedFacultyRenderedTimeOT = [String(hoursFacultyOT).padStart(2,"0"), String(minutesFacultyOT).padStart(2,"0"), String(secondsFacultyOT).padStart(2,"0")].join(":");

        const diffMsFacultyOT         = endOfficialTimeFacultyOT - startOfficialTimeFacultyOT;
        const hoursFacultyMRTOT       = Math.floor(diffMsFacultyOT / (1000 * 60 * 60));
        const minutesFacultyMRTOT     = Math.floor((diffMsFacultyOT % (1000 * 60 * 60)) / (1000 * 60));
        const secondsFacultyMRTOT     = Math.floor((diffMsFacultyOT % (1000 * 60)) / 1000);
        const formattedFacultyMaxRenderedTimeOT = [String(hoursFacultyMRTOT).padStart(2,"0"), String(minutesFacultyMRTOT).padStart(2,"0"), String(secondsFacultyMRTOT).padStart(2,"0")].join(":");

        const tardFinalOT    = new Date(`01/01/2000 ${formattedFacultyRenderedTimeOT}`);
        const tardFinalMaxOT = new Date(`01/01/2000 ${formattedFacultyMaxRenderedTimeOT}`);
        const finalcalcFacultyOT = tardFinalMaxOT - tardFinalOT;
        const hoursfinalcalcFacultyOT   = Math.floor(finalcalcFacultyOT / (1000 * 60 * 60));
        const minutesfinalcalcFacultyOT = Math.floor((finalcalcFacultyOT % (1000 * 60 * 60)) / (1000 * 60));
        const secondsfinalcalcFacultyOT = Math.floor((finalcalcFacultyOT % (1000 * 60)) / 1000);
        const formattedfinalcalcFacultyOT = [String(hoursfinalcalcFacultyOT).padStart(2,"0"), String(minutesfinalcalcFacultyOT).padStart(2,"0"), String(secondsfinalcalcFacultyOT).padStart(2,"0")].join(":");

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
          OfficialBreakPM,
          breaktimeIN, breaktimeOUT,
          midnightFaculty,
          finalcalcFaculty,
          formattedfinalcalcFaculty,
          formattedFacultyRenderedTime,
          formattedFacultyMaxRenderedTime,
          formattedfinalcalcFacultyHN,
          formattedFacultyRenderedTimeHN,
          formattedFacultyMaxRenderedTimeHN,
          formattedfinalcalcFacultySC,
          formattedFacultyRenderedTimeSC,
          formattedFacultyMaxRenderedTimeSC,
          formattedfinalcalcFacultyOT,
          formattedFacultyRenderedTimeOT,
          formattedFacultyMaxRenderedTimeOT,
        };
      });

      // Fetch suspension / leave / holiday maps
      const [suspRes, leaveRes, holidayRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/attendance/api/suspensions`,  { params: { startDate, endDate }, ...getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/attendance/api/leaves`,       { params: { startDate, endDate }, ...getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/attendance/api/holiday`,      { params: { startDate, endDate }, ...getAuthHeaders() }),
      ]);

      setSuspensionByDate(suspRes.data?.byDate    || {});
      setLeaveByDate(leaveRes.data?.byDate         || {});
      setHolidayByDate(holidayRes.data?.byDate     || {});
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
    setAttendanceData([]); setError(""); setSuccess("");
    setSelectedMonth(null);
  };

  // ── Status helpers ────────────────────────────────────────────────────────
  const getStatusLabelForDate = (date) => {
    if (suspensionByDate?.[date]) return "WORK SUSPENDED";
    if (holidayByDate?.[date])    return "HOLIDAY";
    if (leaveByDate?.[date])      return "ON LEAVE";
    return "";
  };

  const getStatusStyle = (label) => {
    if (label === "WORK SUSPENDED") return { bgcolor: alpha("#d32f2f", 0.12), color: "#d32f2f", border: `1px solid ${alpha("#d32f2f", 0.4)}` };
    if (label === "HOLIDAY")        return { bgcolor: alpha("#f57c00", 0.12), color: "#f57c00", border: `1px solid ${alpha("#f57c00", 0.4)}` };
    if (label === "ON LEAVE")       return { bgcolor: alpha("#2e7d32", 0.12), color: "#2e7d32", border: `1px solid ${alpha("#2e7d32", 0.4)}` };
    return {};
  };

  // ── Furlough rendered time rows ───────────────────────────────────────────
  const getFurloughRowsWithRenderedTime = () =>
    (attendanceData || [])
      .filter((row) => Boolean(getStatusLabelForDate(row.date)))
      .map((row) => ({
        ...row,
        furloughRenderedTime:
          !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTime === "NaN:NaN:NaN"
            ? "00:00:00"
            : row.formattedFacultyRenderedTime,
      }));

  const calculateOverallFurloughRenderedTime = () => {
    let totalSeconds = 0;
    getFurloughRowsWithRenderedTime().forEach((row) => {
      const [h, m, s] = row.furloughRenderedTime.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  // ── Total calculations ────────────────────────────────────────────────────
  const sumTime = (rows, getTime) => {
    let totalSeconds = 0;
    rows.forEach((row) => {
      const t = getTime(row) || "00:00:00";
      const [h, m, s] = t.split(":").map(Number);
      if (!isNaN(h)) totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const calculateTotalRenderedTime = () =>
    sumTime(attendanceData, (row) => {
      const isFurlough = Boolean(getStatusLabelForDate(row.date));
      if (isFurlough) return !row.formattedFacultyMaxRenderedTime || row.formattedFacultyMaxRenderedTime === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTime;
      return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTime === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTime;
    });

  const calculateTotalRenderedTimeTardiness = () =>
    sumTime(attendanceData, (row) => {
      if (Boolean(getStatusLabelForDate(row.date))) return null; // skip furlough
      return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFaculty === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTime : row.formattedfinalcalcFaculty;
    });

  const calculateTotalRenderedTimeHN = () =>
    sumTime(attendanceData, (row) => {
      const isFurlough = Boolean(getStatusLabelForDate(row.date));
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeHN || row.formattedFacultyMaxRenderedTimeHN === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimeHN;
      return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeHN;
    });

  const calculateTotalRenderedTimeTardinessHN = () =>
    sumTime(attendanceData, (row) => {
      if (Boolean(getStatusLabelForDate(row.date))) return null;
      return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeHN : row.formattedfinalcalcFacultyHN;
    });

  const calculateTotalRenderedTimeSC = () =>
    sumTime(attendanceData, (row) => {
      const isFurlough = Boolean(getStatusLabelForDate(row.date));
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeSC || row.formattedFacultyMaxRenderedTimeSC === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimeSC;
      return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeSC === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeSC;
    });

  const calculateTotalRenderedTimeTardinessSC = () =>
    sumTime(attendanceData, (row) => {
      if (Boolean(getStatusLabelForDate(row.date))) return null;
      return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeSC : row.formattedfinalcalcFacultySC;
    });

  const calculateTotalRenderedTimeOT = () =>
    sumTime(attendanceData, (row) => {
      const isFurlough = Boolean(getStatusLabelForDate(row.date));
      if (isFurlough) return !row.formattedFacultyMaxRenderedTimeOT || row.formattedFacultyMaxRenderedTimeOT === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimeOT;
      return !row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeOT;
    });

  const calculateTotalRenderedTimeTardinessOT = () =>
    sumTime(attendanceData, (row) => {
      if (Boolean(getStatusLabelForDate(row.date))) return null;
      return !row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeOT : row.formattedfinalcalcFacultyOT;
    });

  const calculateTotalFullOfficialSchedule = () => {
    let totalSeconds = 0;
    attendanceData.forEach((row) => {
      const t = !row.formattedFacultyMaxRenderedTime || row.formattedFacultyMaxRenderedTime === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTime;
      const [h, m, s] = t.split(":").map(Number);
      totalSeconds += h * 3600 + m * 60 + s;
    });
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    if (hh === 0 && mm === 0) return "0 Hours";
    if (mm === 0) return `${hh} Hours`;
    return `${hh} Hours ${mm} Mins`;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveOverallAttendance = async () => {
    try {
      const dup = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        { params: { personID: employeeNumber, startDate, endDate }, ...getAuthHeaders() }
      );
      if (dup.data?.data?.length) {
        alert(`Record for Employee Number ${employeeNumber} covering ${startDate}–${endDate} already exists. Please check Overall Attendance to manage.`);
        navigate("/attendance_summary");
        return;
      }
    } catch (e) {
      console.error("Duplicate-check failed:", e);
      alert("Could not verify duplicates. Saving aborted.");
      return;
    }

    const record = {
      personID:    employeeNumber,
      startDate,
      endDate,
      totalRenderedTimeMorning:              "00:00:00",
      totalRenderedTimeMorningTardiness:     "00:00:00",
      totalRenderedTimeAfternoon:            "00:00:00",
      totalRenderedTimeAfternoonTardiness:   "00:00:00",
      totalRenderedHonorarium:               calculateTotalRenderedTimeHN(),
      totalRenderedHonorariumTardiness:      calculateTotalRenderedTimeTardinessHN(),
      totalRenderedServiceCredit:            calculateTotalRenderedTimeSC(),
      totalRenderedServiceCreditTardiness:   calculateTotalRenderedTimeTardinessSC(),
      totalRenderedOvertime:                 calculateTotalRenderedTimeOT(),
      totalRenderedOvertimeTardiness:        calculateTotalRenderedTimeTardinessOT(),
      overallRenderedOfficialTime:           calculateTotalRenderedTime(),
      overallRenderedOfficialTimeTardiness:  calculateTotalRenderedTimeTardiness(),
      calculateOverallFurloughRenderedTime,
      overallTotalOfficialSchedule:          calculateTotalFullOfficialSchedule(),
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

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(attendanceData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_${employeeNumber}_${startDate}_${endDate}.xlsx`);
  };

  // ── Wireframe / access guards ─────────────────────────────────────────────
  if (pageLoading || accessLoading) return (
    <AttendanceFacultyWireframe
      accentColor={accentColor}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    />
  );

  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Attendance Module for Faculty (30 hours). Contact your administrator to request access."
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

        {/* ── Snackbar ── */}
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

        {/* ── Loading Backdrop ── */}
        <Backdrop
          sx={{ color: primaryColor, zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 2, color: primaryColor }}>
              Generating attendance records...
            </Typography>
          </Box>
        </Backdrop>

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
                        Attendance Records (30hrs)
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, color: textPrimaryColor }}>
                        Generate and review all attendance records of 30 hours faculty employees
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label="30hrs | Job Order (JO)"
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
                  { label: "Start Date",      value: startDate,      onChange: (e) => setStartDate(e.target.value),      type: "date",  icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
                  { label: "End Date",        value: endDate,        onChange: (e) => setEndDate(e.target.value),        type: "date",  icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
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

              {/* Month picker */}
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
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={handleSubmit}
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
        {success && (
          <Fade in timeout={300}>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 3, "& .MuiAlert-message": { fontWeight: 500 } }} onClose={() => setSuccess("")}>
              {success}
            </Alert>
          </Fade>
        )}

        {/* ── Results Table ── */}
        {attendanceData.length > 0 && (
          <Fade in={!loading} timeout={500}>
            <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor,0.1)}` }}>
              <Box sx={{
                p: 4,
                background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
                color: accentColor, display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, textTransform: "uppercase", letterSpacing: "0.1em", color: accentDark }}>
                    30hrs | Job Order (JO) Attendance Records
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
                  <Table sx={{ minWidth: 1620 }}>
                    <TableHead sx={{ bgcolor: alpha(primaryColor,0.7) }}>
                      <TableRow>
                        {[
                          { label: "Date",                                minWidth: 120, bg: null },
                          { label: "Day",                                 minWidth: 100, bg: alpha(primaryColor,0.5) },
                          { label: "Time IN",                             minWidth: 120, bg: null },
                          { label: "Official Time IN",                    minWidth: 140, bg: alpha(primaryColor,0.5) },
                          { label: "Time OUT",                            minWidth: 120, bg: null },
                          { label: "Official Time OUT",                   minWidth: 140, bg: alpha(primaryColor,0.5) },
                          { label: "Official Regular Duty Rendered Time", minWidth: 180, bg: alpha(accentColor,0.2) },
                          { label: "Tardiness (Official Regular Duty)",   minWidth: 180, bg: alpha(accentColor,0.3) },
                          { label: "Honorarium Time IN",                  minWidth: 140, bg: null },
                          { label: "OFFICIAL Honorarium Time IN",         minWidth: 180, bg: alpha(primaryColor,0.5) },
                          { label: "Honorarium Time OUT",                 minWidth: 150, bg: null },
                          { label: "OFFICIAL Honorarium Time OUT",        minWidth: 190, bg: alpha(primaryColor,0.5) },
                          { label: "Honorarium Rendered Time",            minWidth: 160, bg: alpha(accentColor,0.2) },
                          { label: "TARDINESS (HONORARIUM)",              minWidth: 160, bg: alpha(accentColor,0.3) },
                          { label: "Service Credit Time IN",              minWidth: 160, bg: null },
                          { label: "OFFICIAL Service Credit Time IN",     minWidth: 200, bg: alpha(primaryColor,0.5) },
                          { label: "Service Credit Time OUT",             minWidth: 170, bg: null },
                          { label: "OFFICIAL Service Credit Time OUT",    minWidth: 210, bg: alpha(primaryColor,0.5) },
                          { label: "Service Credit Rendered Time",        minWidth: 180, bg: alpha(accentColor,0.2) },
                          { label: "TARDINESS (SERVICE CREDIT)",          minWidth: 180, bg: alpha(accentColor,0.3) },
                          { label: "Overtime Time IN",                    minWidth: 130, bg: null },
                          { label: "OFFICIAL Overtime Time IN",           minWidth: 170, bg: alpha(primaryColor,0.5) },
                          { label: "Overtime Time OUT",                   minWidth: 140, bg: null },
                          { label: "OFFICIAL Overtime Time OUT",          minWidth: 180, bg: alpha(primaryColor,0.5) },
                          { label: "Overtime Rendered Time",              minWidth: 150, bg: alpha(accentColor,0.2) },
                          { label: "TARDINESS (OVERTIME)",                minWidth: 150, bg: alpha(accentColor,0.3) },
                        ].map(({ label, minWidth, bg }) => (
                          <PremiumTableCell key={label} isHeader bgColor={bg} sx={{ color: accentColor, minWidth }}>
                            {label}
                          </PremiumTableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceData.map((row, index) => {
                        const statusLabel = getStatusLabelForDate(row.date);
                        const isFurlough  = Boolean(statusLabel);

                        return (
                          <TableRow
                            key={index}
                            sx={{
                              "&:nth-of-type(even)": { bgcolor: alpha(primaryColor,0.3) },
                              "&:hover": { bgcolor: alpha(accentColor,0.05) },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <PremiumTableCell sx={{ fontWeight: "bold", textAlign: "center" }}>
                              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                                <span>{row.date}</span>
                                {statusLabel && (
                                  <Chip size="small" label={statusLabel} sx={{ mt: 0.5, fontWeight: 700, fontSize: "0.70rem", height: 20, ...getStatusStyle(statusLabel) }} />
                                )}
                              </Box>
                            </PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.day}</PremiumTableCell>
                            <PremiumTableCell>{row.timeIN}</PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.officialTimeIN}</PremiumTableCell>
                            <PremiumTableCell>{row.timeOUT}</PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>{row.officialTimeOUT}</PremiumTableCell>

                            {/* Regular Duty rendered */}
                            <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {isFurlough
                                ? (!row.formattedFacultyMaxRenderedTime || row.formattedFacultyMaxRenderedTime === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTime)
                                : (!row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTime === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTime)}
                            </PremiumTableCell>
                            {/* Regular Duty tardiness */}
                            <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {isFurlough
                                ? "00:00:00"
                                : (!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFaculty === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTime : row.formattedfinalcalcFaculty)}
                            </PremiumTableCell>

                            <PremiumTableCell>{row.officialHonorariumTimeIN === "00:00:00 AM" ? "N/A" : row.timeIN}</PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {row.officialHonorariumTimeIN === "00:00:00 AM" ? "N/A" : row.officialHonorariumTimeIN}
                            </PremiumTableCell>
                            <PremiumTableCell>{row.officialHonorariumTimeOUT === "00:00:00 AM" ? "N/A" : row.timeOUT}</PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {row.officialHonorariumTimeOUT === "00:00:00 AM" ? "N/A" : row.officialHonorariumTimeOUT}
                            </PremiumTableCell>

                            {/* Honorarium rendered */}
                            <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {isFurlough
                                ? (!row.formattedFacultyMaxRenderedTimeHN || row.formattedFacultyMaxRenderedTimeHN === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimeHN)
                                : (!row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeHN === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeHN)}
                            </PremiumTableCell>
                            {/* Honorarium tardiness */}
                            <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {isFurlough
                                ? "00:00:00"
                                : (!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyHN === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeHN : row.formattedfinalcalcFacultyHN)}
                            </PremiumTableCell>

                            <PremiumTableCell>{row.officialServiceCreditTimeIN === "00:00:00 AM" ? "N/A" : row.timeIN}</PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {row.officialServiceCreditTimeIN === "00:00:00 AM" ? "N/A" : row.officialServiceCreditTimeIN}
                            </PremiumTableCell>
                            <PremiumTableCell>{row.officialServiceCreditTimeOUT === "00:00:00 AM" ? "N/A" : row.timeOUT}</PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {row.officialServiceCreditTimeOUT === "00:00:00 AM" ? "N/A" : row.officialServiceCreditTimeOUT}
                            </PremiumTableCell>

                            {/* Service Credit rendered */}
                            <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {isFurlough
                                ? (!row.formattedFacultyMaxRenderedTimeSC || row.formattedFacultyMaxRenderedTimeSC === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimeSC)
                                : (!row.officialTimeSC || !row.timeOUT || row.formattedFacultyRenderedTimeSC === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeSC)}
                            </PremiumTableCell>
                            {/* Service Credit tardiness */}
                            <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {isFurlough
                                ? "00:00:00"
                                : (!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultySC === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeSC : row.formattedfinalcalcFacultySC)}
                            </PremiumTableCell>

                            <PremiumTableCell>{row.officialOverTimeIN === "00:00:00 AM" ? "N/A" : row.timeIN}</PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {row.officialOverTimeIN === "00:00:00 AM" ? "N/A" : row.officialOverTimeIN}
                            </PremiumTableCell>
                            <PremiumTableCell>{row.officialOverTimeOUT === "00:00:00 AM" ? "N/A" : row.timeOUT}</PremiumTableCell>
                            <PremiumTableCell bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {row.officialOverTimeOUT === "00:00:00 AM" ? "N/A" : row.officialOverTimeOUT}
                            </PremiumTableCell>

                            {/* Overtime rendered */}
                            <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {isFurlough
                                ? (!row.formattedFacultyMaxRenderedTimeOT || row.formattedFacultyMaxRenderedTimeOT === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyMaxRenderedTimeOT)
                                : (!row.officialTimeIN || !row.timeOUT || row.formattedFacultyRenderedTimeOT === "NaN:NaN:NaN" ? "00:00:00" : row.formattedFacultyRenderedTimeOT)}
                            </PremiumTableCell>
                            {/* Overtime tardiness */}
                            <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                              {isFurlough
                                ? "00:00:00"
                                : (!row.officialTimeIN || !row.timeOUT || row.formattedfinalcalcFacultyOT === "NaN:NaN:NaN" ? row.formattedFacultyMaxRenderedTimeOT : row.formattedfinalcalcFacultyOT)}
                            </PremiumTableCell>
                          </TableRow>
                        );
                      })}

                      {/* Totals row */}
                      <TableRow>
                        <PremiumTableCell colSpan={6} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Total Rendered Time (Regular Duty):
                        </PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTime()}
                        </PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeTardiness()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Total Rendered Time (Honorarium):
                        </PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeHN()}
                        </PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeTardinessHN()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Total Rendered Time (Service Credit):
                        </PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeSC()}
                        </PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeTardinessSC()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={4} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Total Rendered Time (Overtime):
                        </PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.2)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeOT()}
                        </PremiumTableCell>
                        <PremiumTableCell bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeTardinessOT()}
                        </PremiumTableCell>
                      </TableRow>

                      {/* Overall summary row */}
                      <TableRow>
                        <PremiumTableCell colSpan={2} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Overall Rendered Official Time<br />{startDate} to {endDate}:
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={2} bgColor={alpha(primaryColor,0.5)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTime()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={3} sx={{ fontWeight: "bold", textAlign: "right" }}>
                          Overall Tardiness Official Time<br />{startDate} to {endDate}:
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={1} bgColor={alpha(accentColor,0.3)} sx={{ fontWeight: "bold", textAlign: "center" }}>
                          {calculateTotalRenderedTimeTardiness()}
                        </PremiumTableCell>
                        <PremiumTableCell colSpan={19} sx={{ fontWeight: "bold", textAlign: "right" }} />
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

        {/* ── No Official Time Modal ── */}
        <Dialog
          open={showNoOfficialTimeModal}
          onClose={() => setShowNoOfficialTimeModal(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4, boxShadow: `0 8px 32px ${alpha(accentColor,0.2)}` } }}
        >
          <DialogTitle sx={{ bgcolor: alpha(accentColor,0.1), color: accentColor, fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "#ff9800", width: 56, height: 56 }}>
              <WorkHistory sx={{ fontSize: 32, color: whiteColor }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>No Official Time Schedule</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>Employee #{employeeNumber}</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 3, px: 4 }}>
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Cannot generate attendance records. This employee needs an official time schedule set up first.
              </Typography>
            </Alert>
            <Box sx={{ bgcolor: alpha(primaryColor,0.3), p: 2.5, borderRadius: 2, border: `1px solid ${alpha(accentColor,0.2)}` }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: accentColor }}>
                Please set up the official time schedule in the Official Time Management module.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 4, pb: 3, gap: 2 }}>
            <ProfessionalButton
              variant="outlined"
              onClick={() => setShowNoOfficialTimeModal(false)}
              sx={{ borderColor: accentColor, color: accentColor, "&:hover": { borderColor: accentDark, bgcolor: alpha(accentColor,0.05) } }}
            >
              Close
            </ProfessionalButton>
            <ProfessionalButton
              variant="contained"
              onClick={() => { setShowNoOfficialTimeModal(false); navigate("/official_time"); }}
              sx={{ bgcolor: accentColor, color: primaryColor, "&:hover": { bgcolor: accentDark } }}
            >
              Go to Official Time Setup
            </ProfessionalButton>
          </DialogActions>
        </Dialog>

      </Box>
    </Fade>
  );
};

export default AttendanceModuleFaculty;