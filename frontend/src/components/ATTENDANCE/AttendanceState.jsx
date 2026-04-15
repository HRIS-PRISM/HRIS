import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useSocket } from "../../contexts/SocketContext";
import {
  Box,
  Typography,
  Alert,
  Collapse,
  Chip,
  CircularProgress,
  Fade,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  alpha,
  styled,
  Card,
  Button,
  Fab,
  Zoom,
  Badge,
} from "@mui/material";
import {
  Search,
  Person,
  CalendarToday,
  AccessTime,
  CheckCircle,
  Cancel,
  Info,
  Refresh,
  Today,
  ArrowBackIos,
  Clear,
  KeyboardArrowUp,
  KeyboardArrowDown,
  FilterList,
} from "@mui/icons-material";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";


// ─── Theme tokens (mirrors AttendanceUserState T object) ───────────────────
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover:  "rgba(109,35,35,0.10)",
  rowOdd:       "rgba(109,35,35,0.025)",
  rowHover:     "rgba(109,35,35,0.055)",
  text:         "#1a1a1a",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  surface:      "#ffffff",
  divider:      "rgba(0,0,0,0.08)",
};

// ─── Shimmer keyframes ─────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

// ─── Shimmer bone ──────────────────────────────────────────────────────────
const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      width: w, height: h, borderRadius: r,
      background:
        "linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)",
      backgroundSize: "800px 100%",
      animation: "shimmer 1.6s infinite linear",
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Wireframe skeleton ────────────────────────────────────────────────────
const AllAttendanceWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box
      sx={{
        py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
        width: "100vw", maxWidth: "100%",
        position: "relative", left: "63%", transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2, borderRadius: "12px", overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.09)", animation: "blink 2s ease-in-out infinite" }}>
        <Box sx={{ px: 4, py: 3, background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)", display: "flex", alignItems: "center", gap: 2.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.12)" }} />
          <Box><Bone w={280} h={18} sx={{ mb: 1 }} /><Bone w={380} h={11} /></Box>
        </Box>
      </Box>
      {/* Controls */}
      <Box sx={{ mb: 2, borderRadius: "12px", overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.09)", bgcolor: "#fff", animation: "blink 2s ease-in-out 0.1s infinite" }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.25, minHeight: 42 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.2)" }} />
          <Bone w={180} h={12} />
        </Box>
        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ flex: 1, height: 40, borderRadius: "8px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }} />
            ))}
          </Box>
          <Box sx={{ border: `2px dashed ${T.accentBorder}`, borderRadius: "8px", p: 3 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Box key={i} sx={{ width: 64, height: 36, borderRadius: "6px", bgcolor: T.accentFaint }} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
      {/* Table */}
      <Box sx={{ borderRadius: "12px", overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.09)", bgcolor: "#fff", animation: "blink 2s ease-in-out 0.2s infinite" }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accent, display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: 2 }}>
          {[100, 60, 80].map((w, i) => (
            <Box key={i} sx={{ height: 10, width: w, borderRadius: 3, bgcolor: "rgba(255,255,255,0.22)" }} />
          ))}
        </Box>
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ px: 2.5, py: 2, display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: 2, alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.05)", bgcolor: i % 2 === 0 ? "#fff" : T.rowOdd }}>
            <Bone w={160} h={12} /><Bone w={70} h={12} />
            <Box sx={{ width: 90, height: 24, borderRadius: "12px", bgcolor: T.accentFaint }} />
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── Styled primitives (mirrors AttendanceUserState) ───────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: "#fff",
});

// ─── Shared panel header bar ───────────────────────────────────────────────
const PanelHeader = ({ icon: Icon, title, right }) => (
  <Box
    sx={{
      px: 2.5, py: 1.25,
      borderBottom: `1px solid ${T.divider}`,
      display: "flex", alignItems: "center", gap: 1.25,
      bgcolor: T.accentFaint, minHeight: 42,
    }}
  >
    <Icon sx={{ fontSize: 14, color: T.accent }} />
    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent }}>
      {title}
    </Typography>
    {right && (
      <>
        <Box sx={{ flex: 1 }} />
        {right}
      </>
    )}
  </Box>
);

// ─── Native text / date input ──────────────────────────────────────────────
const NativeInput = ({ value, onChange, type = "text", placeholder, disabled, icon }) => (
  <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
    {icon && (
      <Box sx={{ position: "absolute", left: 10, color: T.accentMid, display: "flex", alignItems: "center", zIndex: 1, pointerEvents: "none" }}>
        {icon}
      </Box>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        padding: icon ? "9px 13px 9px 34px" : "9px 13px",
        borderRadius: "8px",
        border: `1px solid ${T.accentBorder}`,
        fontSize: "0.875rem",
        outline: "none",
        fontFamily: "inherit",
        boxSizing: "border-box",
        transition: "border-color 0.18s",
        background: disabled ? "#f5f5f5" : "#fff",
        color: T.text,
        cursor: disabled ? "not-allowed" : "text",
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.target.style.borderColor = T.accent;
          e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`;
        }
      }}
      onBlur={(e) => {
        e.target.style.borderColor = T.accentBorder;
        e.target.style.boxShadow = "none";
      }}
    />
  </Box>
);

// ─── Small row action button ───────────────────────────────────────────────
const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: "transparent",
      border: `1px solid ${color}40`,
      borderRadius: "6px",
      padding: "4px 10px",
      cursor: disabled ? "default" : "pointer",
      color,
      display: "flex", alignItems: "center", gap: "4px",
      fontSize: "0.72rem", fontWeight: 700,
      fontFamily: "inherit",
      transition: "background-color 0.15s, border-color 0.15s",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; } }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = `${color}40`; }}
  >
    {icon}{label}
  </button>
);

// ─── Quick filter button ───────────────────────────────────────────────────
const QuickBtn = ({ label, icon, onClick, active }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? T.accent : "transparent",
      border: `1px solid ${active ? T.accent : T.accentBorder}`,
      borderRadius: "6px",
      padding: "6px 14px",
      cursor: "pointer",
      color: active ? "#fff" : T.accent,
      display: "flex", alignItems: "center", gap: "5px",
      fontSize: "0.78rem", fontWeight: 700,
      fontFamily: "inherit",
      transition: "all 0.15s ease",
      whiteSpace: "nowrap",
    }}
    onMouseEnter={(e) => {
      if (!active) { e.currentTarget.style.backgroundColor = T.accentFaint; e.currentTarget.style.borderColor = T.accent; }
    }}
    onMouseLeave={(e) => {
      if (!active) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = T.accentBorder; }
    }}
  >
    {icon}{label}
  </button>
);

// ─── Attendance helpers ────────────────────────────────────────────────────
const getAttendanceIcon = (state) => {
  switch (state) {
    case 1: return <CheckCircle sx={{ fontSize: 13, color: "#4caf50" }} />;
    case 2: return <AccessTime  sx={{ fontSize: 13, color: "#ff9800" }} />;
    case 3: return <AccessTime  sx={{ fontSize: 13, color: "#ff9800" }} />;
    case 4: return <CheckCircle sx={{ fontSize: 13, color: "#4caf50" }} />;
    default: return <Cancel     sx={{ fontSize: 13, color: "#f44336" }} />;
  }
};
const getAttendanceColor = (state) => {
  switch (state) {
    case 1: return "#4caf50"; case 2: return "#ff9800";
    case 3: return "#ff9800"; case 4: return "#4caf50";
    default: return "#f44336";
  }
};
const getAttendanceLabel = (state) => {
  switch (state) {
    case 1: return "Time IN";      case 2: return "Breaktime OUT";
    case 3: return "Breaktime IN"; case 4: return "Time OUT";
    default: return "Uncategorized";
  }
};

// ─── Main Component ────────────────────────────────────────────────────────
const AllAttendanceRecord = () => {
  const { socket, connected } = useSocket();
  const { settings } = useSystemSettings();
  const resultsRef = useRef(null);


  const accentColor        = settings.primaryColor       || T.accent;
  const textSecondaryColor = settings.textSecondaryColor || "#FEF9E1";

  const [personID, setPersonID]           = useState("");
  const [startDate, setStartDate]         = useState("");
  const [endDate, setEndDate]             = useState("");
  const [records, setRecords]             = useState([]);
  const [submittedID, setSubmittedID]     = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [expandedRow, setExpandedRow]     = useState(null);
  const [sortOrder, setSortOrder]         = useState("desc");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [pageLoading, setPageLoading]     = useState(true);

  const fetchRecordsRef = useRef(null);

  // ── Snackbar ──
  const [snackbar, setSnackbar]               = useState({ open: false, message: "", severity: "success" });
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

  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { hasAccess, loading: accessLoading } = usePageAccess("attendance-form");

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
  };

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

  const handleSort       = () => setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  const handleRowExpand  = (i) => setExpandedRow(expandedRow === i ? null : i);
  const handleClearFilters = () => {
    setPersonID(""); setStartDate(""); setEndDate("");
    setRecords([]); setSubmittedID(""); setSelectedMonth(null);
  };

  const fetchRecords = async (showLoading = true) => {
    if (!personID || !startDate || !endDate) return;
    if (showLoading) setLoading(true);
    setError("");
    try {
      const adjustedStart = new Date(startDate);
      adjustedStart.setDate(adjustedStart.getDate() - 1);
      const adjustedEnd = new Date(endDate);
      adjustedEnd.setDate(adjustedEnd.getDate() + 1);

      const response = await axios.post(
        `${API_BASE_URL}/attendance/api/attendance`,
        { personID, startDate: adjustedStart.toISOString().substring(0, 10), endDate: adjustedEnd.toISOString().substring(0, 10) },
        getAuthHeaders()
      );

      const filteredData = response.data.filter((record) => {
        const dateParts = record.Date.split("/");
        if (dateParts.length === 3) {
          const recordDate = `${dateParts[2]}-${dateParts[0].padStart(2, "0")}-${dateParts[1].padStart(2, "0")}`;
          return recordDate >= startDate && recordDate <= endDate;
        }
        return false;
      });
setRecords(filteredData);
setSubmittedID(personID);
if (filteredData.length > 0) {
  setTimeout(() => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);
}
    } catch (err) {
      console.error("Error fetching attendance records:", err);
      setError("Failed to fetch attendance records");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { fetchRecordsRef.current = fetchRecords; });

  // ── Socket live-update ──
  useEffect(() => {
    if (!socket || !connected) return;
    const handleAttendanceChanged = (payload) => {
      const changedPersonIDs = Array.isArray(payload?.personIDs)
        ? payload.personIDs
        : payload?.personID ? [payload.personID] : [];
      if (personID && changedPersonIDs.length > 0 && !changedPersonIDs.includes(personID)) return;
      if (personID && startDate && endDate) fetchRecordsRef.current?.(false);
    };
    socket.on("attendanceChanged", handleAttendanceChanged);
    return () => { socket.off("attendanceChanged", handleAttendanceChanged); };
  }, [socket, connected, personID, startDate, endDate]);

  // ── Re-fetch when dates change (if personID present) ──
  useEffect(() => {
    if (personID && startDate && endDate) fetchRecords(false);
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredRecords = [...records].sort((a, b) => {
    const dateA = new Date(a.Date + " " + a.Time);
    const dateB = new Date(b.Date + " " + b.Time);
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // ── Guards ──
  if (pageLoading || accessLoading) return <AllAttendanceWireframe />;

  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Attendance Form. Contact your administrator to request access."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );

  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          py: { xs: 1, md: 2 },
          mt: { xs: 0, md: -2 },
          mb: { xs: 1, md: 2 },
          width: "100vw", maxWidth: "100%",
          position: "relative", left: "63%",
          transform: "translateX(-61%)",
          px: { xs: 2, sm: 3, md: 6 },
        }}
      >
        <style>{shimmerKf}</style>

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
              color: snackbar.severity === "success" ? "#ffffff" : undefined,
              "& .MuiAlert-icon": { color: snackbar.severity === "success" ? "#ffffff" : undefined },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip
                  label={`${snackbarCountdown}s`} size="small"
                  sx={{
                    backgroundColor: snackbar.severity === "success" ? "rgba(255,255,255,0.3)" : undefined,
                    color: snackbar.severity === "success" ? "#ffffff" : undefined,
                    fontWeight: 700,
                  }}
                />
              )}
            </Box>
          </Alert>
        </Snackbar>

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box
            sx={{
              px: 4, py: 3,
              background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              position: "relative", overflow: "hidden",
            }}
          >
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)" }} />
            <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)" }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
              <Search sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: "1.2rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                  Attendance Record State
                </Typography>
                <Typography sx={{ fontSize: "0.78rem", color: T.accentMid, fontWeight: 600 }}>
                  Admin Portal · Review attendance record states
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
              <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                <Typography sx={{ fontSize: "0.75rem", color: T.accent, fontWeight: 700 }}>System Generated</Typography>
              </Box>
              <button
                onClick={() => fetchRecords(true)}
                disabled={!personID || !startDate || !endDate}
                style={{
                  background: alpha(T.accent, 0.08),
                  border: `1px solid ${T.accentBorder}`,
                  borderRadius: "8px",
                  padding: "7px 10px",
                  cursor: (!personID || !startDate || !endDate) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "5px",
                  color: T.accent, fontSize: "0.75rem", fontWeight: 700,
                  fontFamily: "inherit", transition: "all 0.15s",
                  opacity: (!personID || !startDate || !endDate) ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (personID && startDate && endDate) e.currentTarget.style.backgroundColor = alpha(T.accent, 0.14); }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.08); }}
              >
                <Refresh sx={{ fontSize: 15 }} />
                Refresh
              </button>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Alerts ── */}
        <Collapse in={!!error}>
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 1.5, borderRadius: 2, fontSize: "0.82rem" }}>
            {error}
          </Alert>
        </Collapse>

        {/* ── Controls Card ── */}
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader icon={FilterList} title="Filter Attendance Records" />

          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>

            {/* Input fields row */}
            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Employee Number
                </Typography>
                <NativeInput
                  value={personID}
                  onChange={(e) => setPersonID(e.target.value)}
                  placeholder="Enter employee number"
                  icon={<Person sx={{ fontSize: 16, color: T.accentBorder }} />}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Start Date
                </Typography>
                <NativeInput
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  icon={<CalendarToday sx={{ fontSize: 15, color: T.accentBorder }} />}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  End Date
                </Typography>
                <NativeInput
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  icon={<CalendarToday sx={{ fontSize: 15, color: T.accentBorder }} />}
                />
              </Box>
            </Box>

            {/* Divider + section label */}
            <Box sx={{ height: 1, bgcolor: T.divider, mb: 2 }} />
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 1.25, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 0.75 }}>
              <FilterList sx={{ fontSize: 13 }} />
              Quick Date Selection
            </Typography>

            {/* Quick buttons */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2.5 }}>
              {[
                { label: "Today",        icon: <Today sx={{ fontSize: 13 }} />,        fn: () => { setStartDate(formattedToday); setEndDate(formattedToday); setSelectedMonth(null); } },
                { label: "Yesterday",    icon: <ArrowBackIos sx={{ fontSize: 11 }} />, fn: () => { const y = new Date(today); y.setDate(y.getDate() - 1); const s = y.toISOString().substring(0, 10); setStartDate(s); setEndDate(s); setSelectedMonth(null); } },
                { label: "Last 7 Days",  icon: null, fn: () => { const d = new Date(today); d.setDate(d.getDate() - 7); setStartDate(d.toISOString().substring(0, 10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                { label: "Last 15 Days", icon: null, fn: () => { const d = new Date(today); d.setDate(d.getDate() - 15); setStartDate(d.toISOString().substring(0, 10)); setEndDate(formattedToday); setSelectedMonth(null); } },
                { label: "Last 30 Days", icon: null, fn: () => { const d = new Date(today); d.setMonth(d.getMonth() - 1); setStartDate(d.toISOString().substring(0, 10)); setEndDate(formattedToday); setSelectedMonth(null); } },
              ].map(({ label, icon, fn }) => (
                <QuickBtn key={label} label={label} icon={icon} onClick={fn} />
              ))}
            </Box>

            {/* Month picker */}
            <Box sx={{ p: 2.5, borderRadius: 2, border: `2px dashed ${T.accentBorder}`, bgcolor: T.accentFaint }}>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2, mb: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent, mb: 0.3 }}>
                    Select Entire Month
                  </Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>
                    Choose a year, then click any month to set the date range
                  </Typography>
                </Box>

                {/* Year selector */}
                <FormControl sx={{ minWidth: 130 }} size="small">
                  <InputLabel sx={{ fontWeight: 600, fontSize: "0.8rem" }}>Year</InputLabel>
                  <Select
                    value={selectedYear}
                    label="Year"
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setSelectedMonth(null);
                      showSnackbar("Year changed — please click a month to load records.", "info");
                    }}
                    sx={{
                      bgcolor: "#fff", borderRadius: 2, fontWeight: 600, fontSize: "0.85rem",
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder },
                    }}
                  >
                    {yearOptions.map((y) => (
                      <MenuItem key={y} value={y} sx={{ fontSize: "0.85rem" }}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Month buttons */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "center" }}>
                {months.map((month, index) => {
                  const sel = selectedMonth === index;
                  return (
                    <button
                      key={month}
                      onClick={() => handleMonthClick(index)}
                      style={{
                        background: sel ? T.accent : "#fff",
                        border: `1px solid ${sel ? T.accent : T.accentBorder}`,
                        borderRadius: "6px",
                        padding: "7px 14px",
                        cursor: "pointer",
                        color: sel ? "#fff" : T.accent,
                        fontSize: "0.75rem", fontWeight: 700,
                        fontFamily: "inherit",
                        transition: "all 0.15s ease",
                        boxShadow: sel ? `0 2px 8px ${alpha(T.accent, 0.25)}` : "none",
                        letterSpacing: "0.04em",
                      }}
                      onMouseEnter={(e) => { if (!sel) { e.currentTarget.style.backgroundColor = T.accentFaint; e.currentTarget.style.borderColor = T.accent; } }}
                      onMouseLeave={(e) => { if (!sel) { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = T.accentBorder; } }}
                    >
                      {month}
                    </button>
                  );
                })}
              </Box>
            </Box>

            {/* Clear button */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <RowBtn
                icon={<Clear sx={{ fontSize: 13 }} />}
                label="Clear All Filters"
                color="#C62828"
                hoverBg="rgba(198,40,40,0.08)"
                onClick={handleClearFilters}
              />
            </Box>
          </Box>
        </SectionCard>

        {/* ── Loading indicator ── */}
        {loading && (
          <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
            <CircularProgress size={16} sx={{ color: T.accent }} />
            <Typography sx={{ fontSize: "0.78rem", color: T.muted }}>Fetching attendance records…</Typography>
          </Box>
        )}

        {/* ── Results Table ── */}
        {submittedID && (
          <Fade in={!loading} timeout={400}>
<SectionCard ref={resultsRef}>              <PanelHeader
                icon={Search}
                title={`Records for ${submittedID}`}
                right={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Typography sx={{ fontSize: "0.72rem", color: T.faint }}>
                      {startDate} → {endDate}
                    </Typography>
                    <Box sx={{
                      px: 1.5, py: 0.3, borderRadius: 5,
                      bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}`,
                    }}>
                      <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700 }}>
                        {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
                      </Typography>
                    </Box>
                  </Box>
                }
              />

              {/* ── Column headers (sticky) ── */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1.5fr 1fr",
                  px: 2.5, py: 1.25,
                  bgcolor: T.accent,
                  gap: 2,
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                }}
              >
                {[
                  { label: "DATE", sortable: true },
                  { label: "TIME" },
                  { label: "STATUS" },
                  { label: "DETAILS" },
                ].map(({ label, sortable }) => (
                  <Typography
                    key={label}
                    onClick={sortable ? handleSort : undefined}
                    sx={{
                      color: "#fff", fontSize: "0.65rem", fontWeight: 700,
                      letterSpacing: "0.08em",
                      cursor: sortable ? "pointer" : "default",
                      display: "flex", alignItems: "center", gap: 0.5,
                      userSelect: "none",
                      "&:hover": sortable ? { opacity: 0.8 } : {},
                    }}
                  >
                    {label}
                    {sortable && (sortOrder === "asc"
                      ? <KeyboardArrowUp sx={{ fontSize: 14 }} />
                      : <KeyboardArrowDown sx={{ fontSize: 14 }} />
                    )}
                  </Typography>
                ))}
              </Box>

              {/* ── Scrollable rows ── */}
              <Box sx={{ maxHeight: 480, overflowY: "auto" }}>
                {filteredRecords.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Box sx={{ width: 60, height: 60, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                      <Info sx={{ fontSize: 28, color: alpha(T.accent, 0.3) }} />
                    </Box>
                    <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: T.muted, mb: 0.4 }}>No records found</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: T.faint }}>Try adjusting your date range or search for a different employee.</Typography>
                  </Box>
                ) : (
                  filteredRecords.map((record, idx) => (
                    <React.Fragment key={idx}>
                      <Box
                        onClick={() => handleRowExpand(idx)}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 1.5fr 1fr",
                          px: 2.5, py: 1.75, gap: 2,
                          alignItems: "center",
                          bgcolor: idx % 2 === 0 ? "#fff" : T.rowOdd,
                          borderBottom: `1px solid ${T.divider}`,
                          cursor: "pointer",
                          transition: "background 0.13s",
                          "&:hover": { bgcolor: T.rowHover },
                          "&:last-child": { borderBottom: "none" },
                        }}
                      >
                        {/* Date */}
                        <Typography sx={{ fontWeight: 600, fontSize: "0.82rem", color: T.text }}>
                          {new Date(record.Date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                        </Typography>

                        {/* Time */}
                        <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontWeight: 500 }}>
                          {record.Time}
                        </Typography>

                        {/* Status chip */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                          <Box sx={{
                            display: "inline-flex", alignItems: "center", gap: 0.6,
                            px: 1.25, py: 0.4,
                            borderRadius: "12px",
                            bgcolor: alpha(getAttendanceColor(record.AttendanceState), 0.1),
                            border: `1px solid ${alpha(getAttendanceColor(record.AttendanceState), 0.25)}`,
                          }}>
                            {getAttendanceIcon(record.AttendanceState)}
                            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: getAttendanceColor(record.AttendanceState) }}>
                              {getAttendanceLabel(record.AttendanceState)}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Expand toggle */}
                        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                          <RowBtn
                            icon={expandedRow === idx ? <KeyboardArrowUp sx={{ fontSize: 13 }} /> : <KeyboardArrowDown sx={{ fontSize: 13 }} />}
                            label={expandedRow === idx ? "Collapse" : "Details"}
                            color={T.accent}
                            hoverBg={T.accentFaint}
                            onClick={(e) => { e.stopPropagation(); handleRowExpand(idx); }}
                          />
                        </Box>
                      </Box>

                      {/* Expanded detail row */}
                      {expandedRow === idx && (
                        <Box sx={{ px: 2.5, py: 2, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}` }}>
                          <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 1.25, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            Record Details
                          </Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {[
                              { label: "Employee ID", value: record.PersonID },
                              { label: "Date",        value: record.Date },
                              { label: "Time",        value: record.Time },
                              { label: "Status",      value: getAttendanceLabel(record.AttendanceState) },
                            ].map(({ label, value }) => (
                              <Box key={label}>
                                <Typography sx={{ fontSize: "0.68rem", color: T.faint, mb: 0.3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Typography>
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: T.text }}>{value}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </React.Fragment>
                  ))
                )}
              </Box>

              {/* Legend footer */}
              {filteredRecords.length > 0 && (
                <Box sx={{
                  px: 2.5, py: 1.75,
                  borderTop: `1px solid ${T.divider}`,
                  bgcolor: T.accentFaint,
                  display: "flex", gap: 2.5, flexWrap: "wrap", alignItems: "center",
                }}>
                  {[
                    { icon: <CheckCircle sx={{ fontSize: 13, color: "#4caf50" }} />, label: "Time IN / Time OUT" },
                    { icon: <AccessTime  sx={{ fontSize: 13, color: "#ff9800" }} />, label: "Breaktime OUT / Breaktime IN" },
                    { icon: <Cancel      sx={{ fontSize: 13, color: "#f44336" }} />, label: "Uncategorized" },
                    { icon: <KeyboardArrowDown sx={{ fontSize: 13, color: T.accent }} />, label: "Click row to expand details" },
                  ].map((item, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                      {item.icon}
                      <Typography sx={{ fontSize: "0.7rem", color: T.faint }}>{item.label}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </SectionCard>
          </Fade>
        )}

        {/* ── Scroll to Top FAB ── */}
        <Zoom in={showScrollTop}>
          <Fab
            size="small"
            sx={{
              position: "fixed", bottom: 24, right: 45, zIndex: 1000,
              bgcolor: T.accent, color: "#fff",
              "&:hover": { bgcolor: T.accentDark },
              boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}`,
            }}
            onClick={scrollToTop}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>

      </Box>
    </Fade>
  );
};

export default AllAttendanceRecord;