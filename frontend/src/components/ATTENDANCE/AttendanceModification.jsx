import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect } from "react";
import axios from "axios";
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
  Card,
  CardContent,
  CardHeader,
  InputAdornment,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  Chip,
  Fade,
  Alert,
  alpha,
  styled,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import {
  Person,
  CalendarToday,
  Today,
  ArrowBackIos,
  Clear,
  SaveAs,
  Refresh,
  Edit,
  FilterList,
} from "@mui/icons-material";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import { useCRUDButtonStyles } from "../../hooks/useCRUDButtonStyles";
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

const AttendanceSearchWireframe = ({
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
                  <S w={260} h={26} r={6} accent={ac} />
                  <S w={310} h={13} r={4} accent={ac} />
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <S w={145} h={26} r={13} accent={ac} />
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
                  <S w={fi === 0 ? 120 : 72} h={12} r={3} accent={ac} sx={{ mb: "6px" }} />
                  <Box sx={{ height: 56, borderRadius: "12px", border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", px: 1.5, gap: 1 }}>
                    <Placeholder w={20} h={20} r="50%" color={alpha(ac, 0.12)} />
                    <S w={fi === 0 ? "45%" : "55%"} h={13} r={4} accent={ac} />
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ height: 1, bgcolor: alpha(ac, 0.1), my: 3 }} />

            {/* Section label */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Placeholder w={20} h={20} r="50%" color={alpha(ac, 0.15)} />
              <S w={180} h={14} r={4} accent={ac} />
            </Box>
            <S w={320} h={11} r={3} accent={ac} sx={{ mb: 3 }} />

            {/* Quick buttons */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              {[80, 100, 108, 108, 114].map((w, i) => (
                <Box key={i} sx={{ width: w, height: 48, borderRadius: "12px", border: `1px solid ${alpha(ac, 0.20)}`, animation: `amsPulse 2.2s ease-in-out ${i * 0.07}s infinite` }} />
              ))}
            </Box>

            {/* Month picker dashed box */}
            <Box sx={{ p: 3, borderRadius: 2, border: `2px dashed ${alpha(ac, 0.20)}`, bgcolor: alpha(primaryColor, 0.30) }}>
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
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <S key={i} w={64} h={44} r={10} accent={ac} sx={{ animation: `amsShimmer 1.6s infinite linear ${i * 0.05}s` }} />
                ))}
              </Box>
            </Box>

            {/* Clear button */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Box sx={{ width: 160, height: 48, borderRadius: "12px", border: "1px solid rgba(211,47,47,0.30)" }} />
            </Box>
          </Box>
        </Box>

        {/* 3. Editable table card */}
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
              <S w={160} h={10} r={3} accent={ac} sx={{ mb: "6px" }} />
              <S w={140} h={20} r={4} accent={ac} sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <S w={100} h={22} r={11} accent={ac} />
                <S w={130} h={10} r={3} accent={ac} />
              </Box>
            </Box>
            <Placeholder w={80} h={80} r="50%" color={alpha(ac, 0.13)} />
          </Box>

          {/* Table column headers — 7 cols */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1.4fr 1.4fr 1.4fr 1.4fr", gap: 1, px: 3, py: 2, bgcolor: alpha(primaryColor, 0.7), borderBottom: `2px solid ${alpha(ac, 0.1)}` }}>
            {[100, 70, 55, 90, 115, 120, 88].map((w, i) => (
              <S key={i} w={w} h={10} r={3} accent={ac} />
            ))}
          </Box>

          {/* Table rows — editable input ghosts */}
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{
              display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1.4fr 1.4fr 1.4fr 1.4fr",
              gap: 1, px: 3, py: 2.25, alignItems: "center",
              borderBottom: i < 5 ? `1px solid ${alpha(ac, 0.06)}` : "none",
              bgcolor: i % 2 === 0 ? "#fff" : alpha(primaryColor, 0.3),
              animation: `amsPulse 2.2s ease-in-out ${i * 0.06}s infinite`,
            }}>
              <S w={90} h={12} r={3} accent={ac} />
              <S w={70} h={12} r={3} accent={ac} />
              <S w={55} h={12} r={3} accent={ac} />
              {[0, 1, 2, 3].map((ci) => (
                <Box key={ci} sx={{ height: 40, borderRadius: "10px", border: `1px solid ${alpha(ac, 0.18)}`, bgcolor: "rgba(255,255,255,0.7)" }} />
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
            <S w={280} h={12} r={3} accent={ac} />
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

const PremiumTableCell = styled(TableCell)(({ isHeader = false }) => ({
  fontWeight: isHeader ? 600 : 500,
  padding: "18px 20px",
  borderBottom: isHeader ? "2px solid rgba(254,249,225,0.5)" : "1px solid rgba(109,35,35,0.06)",
  fontSize: "0.95rem",
  letterSpacing: "0.025em",
  whiteSpace: "nowrap",
}));

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const AttendanceSearch = () => {
  const { settings }     = useSystemSettings();
  const saveButtonStyles = useCRUDButtonStyles("save");

  const primaryColor       = settings.accentColor        || "#FEF9E1";
  const secondaryColor     = settings.backgroundColor    || "#FFF8E7";
  const accentColor        = settings.primaryColor       || "#6d2323";
  const accentDark         = settings.secondaryColor     || "#8B3333";
  const textPrimaryColor   = settings.textPrimaryColor   || "#6d2323";
  const textSecondaryColor = settings.textSecondaryColor || "#FEF9E1";

  const today          = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const { hasAccess, loading: accessLoading } = usePageAccess("search-attendance");

  const [personID, setPersonID]           = useState("");
  const [startDate, setStartDate]         = useState("");
  const [endDate, setEndDate]             = useState("");
  const [records, setRecords]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [pageLoading, setPageLoading]     = useState(true);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  // ── Snackbar — bottom center ──────────────────────────────────────────────
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

  // ── Dismiss wireframe once access resolves ────────────────────────────────
  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
  };

  const fetchRecords = async (showLoading = true) => {
    if (!personID || !startDate || !endDate) return;
    if (showLoading) setLoading(true);
    setError(""); setSuccess("");
    try {
      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { personID, startDate, endDate },
        getAuthHeaders()
      );
      setRecords(response.data);
    } catch (err) {
      console.error("Axios error:", err.response ? err.response.data : err);
      const msg = "Failed to fetch attendance records. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const saveAll = async () => {
    try {
      setLoading(true); setError(""); setSuccess("");
      const response = await axios.put(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { records },
        getAuthHeaders()
      );
      const msg = response.data.message || "Records saved successfully!";
      setSuccess(msg);
      showSnackbar(msg, "success");
    } catch (err) {
      console.error(err);
      const msg = "Failed to save records. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index, field, value) => {
    const updated = [...records];
    updated[index][field] = value;
    setRecords(updated);
  };

  const handleMonthClick = (monthIndex) => {
    const start = new Date(Date.UTC(selectedYear, monthIndex, 1));
    const end   = new Date(Date.UTC(selectedYear, monthIndex + 1, 0));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
    setSelectedMonth(monthIndex);
  };

  const handleClearFilters = () => {
    setPersonID(""); setStartDate(""); setEndDate("");
    setRecords([]); setError(""); setSuccess("");
    setSelectedMonth(null);
  };

  // Auto-fetch when dates change
  useEffect(() => {
    if (personID && startDate && endDate) fetchRecords(false);
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wireframe guard ───────────────────────────────────────────────────────
  if (pageLoading || accessLoading) return (
    <AttendanceSearchWireframe
      accentColor={accentColor}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    />
  );

  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Attendance Modification. Contact your administrator to request access."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );

  return (
    <Fade in timeout={500}>
      <Box sx={{
        py: { xs: 2, md: 4 },
        width: "100vw", mx: "auto", maxWidth: "100%",
        overflow: "hidden", position: "relative",
        left: "53%", transform: "translateX(-51%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}>

        {/* ── Snackbar — bottom center ── */}
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
              Fetching attendance records...
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
                      <Edit sx={{ color: textPrimaryColor, fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, color: textPrimaryColor }}>
                        Attendance Management
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.8, color: textPrimaryColor }}>
                        Review and manage attendance records
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label="Editable Records"
                      size="small"
                      sx={{ bgcolor: alpha(accentColor,0.15), color: textPrimaryColor, fontWeight: 500, "& .MuiChip-label": { px: 1 } }}
                    />
                    <Tooltip title="Refresh Data">
                      <IconButton
                        onClick={() => fetchRecords(true)}
                        disabled={!personID || !startDate || !endDate}
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
                  { label: "Employee Number", value: personID,  onChange: (e) => setPersonID(e.target.value),  type: "text", icon: <Person sx={{ color: textPrimaryColor }} /> },
                  { label: "Start Date",      value: startDate, onChange: (e) => setStartDate(e.target.value), type: "date", icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
                  { label: "End Date",        value: endDate,   onChange: (e) => setEndDate(e.target.value),   type: "date", icon: <CalendarToday sx={{ color: textPrimaryColor }} /> },
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

              {/* Quick Date Selection section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ color: textPrimaryColor, fontWeight: 600, display: "flex", alignItems: "center", mb: 1 }}>
                  <FilterList sx={{ mr: 2 }} />
                  Quick Date Selection
                </Typography>
                <Typography variant="body2" sx={{ color: alpha(textPrimaryColor,0.7), mb: 2 }}>
                  Click any option below to automatically set the date range:
                </Typography>

                {/* Quick buttons */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
                  {[
                    { label: "Today",        icon: <Today />,        fn: () => { setStartDate(formattedToday); setEndDate(formattedToday); setSelectedMonth(null); } },
                    { label: "Yesterday",    icon: <ArrowBackIos />, fn: () => { const y = new Date(today); y.setDate(y.getDate()-1); const s = y.toISOString().substring(0,10); setStartDate(s); setEndDate(s); setSelectedMonth(null); } },
                    { label: "Last 7 Days",  icon: null,             fn: () => { const d = new Date(today); d.setDate(d.getDate()-7); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                    { label: "Last 15 Days", icon: null,             fn: () => { const d = new Date(today); d.setDate(d.getDate()-15); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                    { label: "Last 30 Days", icon: null,             fn: () => { const d = new Date(today); d.setMonth(d.getMonth()-1); setStartDate(d.toISOString().substring(0,10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                  ].map(({ label, icon, fn }) => (
                    <ProfessionalButton
                      key={label} variant="outlined" size="medium" onClick={fn}
                      startIcon={icon || undefined}
                      sx={{ borderColor: accentColor, color: textPrimaryColor, fontWeight: 600, py: 1.5, "&:hover": { backgroundColor: alpha(accentColor,0.07), borderWidth: 2 }, transition: "all 0.3s ease" }}
                    >
                      {label}
                    </ProfessionalButton>
                  ))}
                </Box>

                {/* Month picker — unified dashed box */}
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

                    {/* Year selector — fires snackbar at bottom center */}
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

                  {/* Month buttons — unified flex wrap centered */}
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

              {/* Clear button */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                <ProfessionalButton
                  variant="outlined" startIcon={<Clear />} onClick={handleClearFilters}
                  sx={{ borderColor: "#d32f2f", color: "#d32f2f", "&:hover": { borderColor: "#b71c1c", backgroundColor: alpha("#d32f2f",0.05) } }}
                >
                  Clear All Filters
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

        {/* ── Results — editable table ── */}
        {records.length > 0 && (
          <Fade in={!loading} timeout={500}>
            <GlassCard sx={{ mb: 4, border: `1px solid ${alpha(accentColor,0.1)}` }}>
              <Box sx={{
                p: 4,
                background: `linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%)`,
                color: accentColor, display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5, textTransform: "uppercase", letterSpacing: "0.1em", color: accentDark }}>
                    Editable Attendance Records
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: accentColor }}>
                    <b>{personID}</b>
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
                    <Chip
                      icon={<Edit />}
                      label={`${records.length} Records`}
                      size="small"
                      sx={{ bgcolor: alpha(accentColor,0.15), color: accentColor, fontWeight: 500 }}
                    />
                    <Typography variant="body2" sx={{ opacity: 0.8, color: accentDark }}>
                      {startDate} to {endDate}
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: alpha(accentColor,0.15), width: 80, height: 80, color: accentColor }}>
                  <Edit sx={{ fontSize: 36 }} />
                </Avatar>
              </Box>

              <PremiumTableContainer>
                <Table sx={{ minWidth: 1000 }}>
                  <TableHead sx={{ bgcolor: alpha(primaryColor,0.7) }}>
                    <TableRow>
                      {[
                        { label: "Employee Number", minWidth: 140 },
                        { label: "Date",            minWidth: 100 },
                        { label: "Day",             minWidth: 80  },
                        { label: "Time IN",         minWidth: 150 },
                        { label: "Breaktime IN",    minWidth: 150 },
                        { label: "Breaktime OUT",   minWidth: 150 },
                        { label: "Time OUT",        minWidth: 150 },
                      ].map(({ label, minWidth }) => (
                        <PremiumTableCell key={label} isHeader sx={{ color: accentColor, minWidth }}>
                          {label}
                        </PremiumTableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((record, index) => (
                      <TableRow
                        key={index}
                        sx={{ "&:nth-of-type(even)": { bgcolor: alpha(primaryColor,0.3) }, "&:hover": { bgcolor: alpha(accentColor,0.05) }, transition: "all 0.2s ease" }}
                      >
                        <PremiumTableCell>{record.personID}</PremiumTableCell>
                        <PremiumTableCell>{record.date}</PremiumTableCell>
                        <PremiumTableCell>{record.Day}</PremiumTableCell>
                        {["timeIN","breaktimeIN","breaktimeOUT","timeOUT"].map((field) => (
                          <PremiumTableCell key={field}>
                            <ModernTextField
                              value={record[field] || ""}
                              onChange={(e) => handleInputChange(index, field, e.target.value)}
                              size="small"
                              sx={{ width: "140px" }}
                            />
                          </PremiumTableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PremiumTableContainer>
            </GlassCard>
          </Fade>
        )}

        {/* ── Save Button Card ── */}
        {records.length > 0 && (
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
                      Apply all modifications to the attendance records
                    </Typography>
                  </Box>
                }
                sx={{ bgcolor: alpha(primaryColor,0.5), pb: 2, borderBottom: `1px solid ${alpha(accentColor,0.1)}` }}
              />
              <CardContent sx={{ p: 4, "&:last-child": { pb: 4 } }}>
                <ProfessionalButton
                  variant="contained" fullWidth startIcon={<SaveAs />}
                  onClick={saveAll} disabled={loading}
                  sx={{ py: 2, fontSize: "1rem", ...saveButtonStyles }}
                >
                  Save All Changes
                </ProfessionalButton>
              </CardContent>
            </GlassCard>
          </Fade>
        )}

      </Box>
    </Fade>
  );
};

export default AttendanceSearch;