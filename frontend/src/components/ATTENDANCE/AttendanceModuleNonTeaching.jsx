import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Card, Avatar, IconButton, Fade, Alert, Chip, styled, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Snackbar, Collapse, Paper,
  TextField, InputAdornment, List, ListItemButton, Switch, Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Announcement as AnnouncementIcon,
  Add as AddIcon,
  FilterList,
  Refresh,
  Search as SearchIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Event as EventIcon,
  Block as BlockIcon,
  AdminPanelSettings as HrIcon,
  AccessTime as FlexiIcon,
  CheckCircle as CheckCircleIcon,
  CalendarToday,
  Clear,
  Info as InfoIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  DeleteOutline,
} from "@mui/icons-material";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";
import SuccessfulOverlay from "../SuccessfulOverlay";

// ─── Theme tokens (mirrors AttendanceNonTeachingStaff exactly) ────────────
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover:  "rgba(109,35,35,0.10)",
  rowOdd:       "#f9f9f9",
  rowHover:     "#f3f3f3",
  text:         "#1a1a1a",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  surface:      "#ffffff",
  divider:      "rgba(0,0,0,0.08)",
  holiday:   { bg: "rgba(245,124,0,0.10)",  color: "#f57c00", border: "rgba(245,124,0,0.35)"  },
  leave:     { bg: "rgba(46,125,50,0.10)",  color: "#2e7d32", border: "rgba(46,125,50,0.35)"  },
  suspended: { bg: "rgba(211,47,47,0.10)",  color: "#d32f2f", border: "rgba(211,47,47,0.35)"  },
  halfDay:   { bg: "rgba(255,152,0,0.10)",  color: "#e65100", border: "rgba(255,152,0,0.35)"  },
  absent:    { bg: "rgba(183,28,28,0.08)",  color: "#b71c1c", border: "rgba(183,28,28,0.25)"  },
  rendered:  { bg: "rgba(27,94,32,0.08)",   color: "#1b5e20", border: "rgba(27,94,32,0.25)"   },
  tardiness: { bg: "rgba(183,28,28,0.08)",  color: "#b71c1c", border: "rgba(183,28,28,0.25)"  },
};

// ─── Auth helper ──────────────────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}` } };
};

// ─── Shimmer keyframes ────────────────────────────────────────────────────
const shimmerKf = `
@keyframes shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}`;

// ─── Styled primitives ─────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: "#fff",
});

const FieldInput = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    fontSize: "0.875rem",
    backgroundColor: "#fff",
    "& fieldset": { borderColor: T.accentBorder },
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.accent },
});

// ─── Panel header ──────────────────────────────────────────────────────────
const PanelHeader = ({ icon: Icon, title, rightContent }) => (
  <Box sx={{
    px: 2.5, py: 1.5,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    borderBottom: `1px solid ${T.divider}`,
    bgcolor: T.accentFaint,
  }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Icon sx={{ fontSize: 15, color: T.accent }} />
      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent }}>{title}</Typography>
    </Box>
    {rightContent}
  </Box>
);

// ─── Row button (matches RowBtn from attendance) ───────────────────────────
const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    onClick={onClick} disabled={disabled}
    style={{ background: "transparent", border: `1px solid ${color}40`, borderRadius: "8px", padding: "9px 18px", cursor: disabled ? "default" : "pointer", color, display: "flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", fontWeight: 700, fontFamily: "inherit", transition: "background-color 0.15s, border-color 0.15s", whiteSpace: "nowrap", opacity: disabled ? 0.5 : 1 }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.borderColor = color; } }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = `${color}40`; }}
  >
    {icon}{label}
  </button>
);

// ─── Native date input (matches attendance style) ─────────────────────────
const NativeInput = ({ value, onChange, type = "text", placeholder, disabled, icon }) => (
  <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
    {icon && (
      <Box sx={{ position: "absolute", left: 10, color: T.accentMid, display: "flex", alignItems: "center", zIndex: 1, pointerEvents: "none" }}>
        {icon}
      </Box>
    )}
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      style={{
        width: "100%", padding: icon ? "9px 13px 9px 34px" : "9px 13px",
        borderRadius: "8px", border: `1px solid ${T.accentBorder}`,
        fontSize: "0.875rem", outline: "none", fontFamily: "inherit",
        boxSizing: "border-box", transition: "border-color 0.18s",
        background: disabled ? "#f5f5f5" : "#fff", color: T.text,
        cursor: disabled ? "not-allowed" : "text",
      }}
      onFocus={e => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; } }}
      onBlur={e => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = "none"; }}
    />
  </Box>
);

// ─── Time input helper ─────────────────────────────────────────────────────
const toTimeInput = (val) => (!val ? "" : String(val).slice(0, 5));

// ─── Toggle option card ────────────────────────────────────────────────────
const OptionToggleCard = ({ icon: Icon, title, description, checked, onChange, activeColor }) => (
  <Box
    onClick={() => onChange(!checked)}
    sx={{
      display: "flex", alignItems: "flex-start", gap: 1.5,
      p: 1.75, borderRadius: 2, cursor: "pointer",
      border: `1.5px solid ${checked ? activeColor : T.accentBorder}`,
      bgcolor: checked ? alpha(activeColor, 0.06) : "transparent",
      transition: "all 0.2s",
      flex: "1 1 220px",
      "&:hover": { borderColor: activeColor, bgcolor: alpha(activeColor, 0.04) },
    }}
  >
    <Icon sx={{ fontSize: 18, color: checked ? activeColor : T.faint, mt: 0.25, flexShrink: 0 }} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.25 }}>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: checked ? activeColor : T.text }}>
          {title}
        </Typography>
        <Switch
          size="small" checked={!!checked}
          onChange={e => { e.stopPropagation(); onChange(e.target.checked); }}
          onClick={e => e.stopPropagation()}
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": { color: activeColor },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: activeColor },
          }}
        />
      </Box>
      <Typography sx={{ fontSize: "0.7rem", color: T.faint, lineHeight: 1.4 }}>{description}</Typography>
    </Box>
  </Box>
);

// ─── Flexi detail panel ────────────────────────────────────────────────────
const FlexiDetailPanel = ({ values, onChange }) => (
  <Box sx={{
    mt: 1.5, p: 2, borderRadius: 2,
    border: `1.5px dashed ${alpha("#2e7d32", 0.35)}`,
    bgcolor: alpha("#2e7d32", 0.03),
  }}>
    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#2e7d32", mb: 1.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      Flexi Schedule Settings
    </Typography>
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
      <Box sx={{ flex: "1 1 160px" }}>
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Grace Period (hours)
        </Typography>
        <NativeInput
          type="number"
          value={values.flexi_hours ?? 2}
          onChange={e => onChange("flexi_hours", e.target.value)}
          placeholder="2"
        />
        <Typography sx={{ fontSize: "0.65rem", color: T.faint, mt: 0.5 }}>
          e.g. 2 = clock-in allowed up to 2 hrs after official time
        </Typography>
      </Box>
      <Box sx={{ flex: "1 1 160px" }}>
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Override Cut-off Time
        </Typography>
        <NativeInput
          type="time"
          value={toTimeInput(values.flexi_custom_time)}
          onChange={e => onChange("flexi_custom_time", e.target.value)}
        />
        <Typography sx={{ fontSize: "0.65rem", color: T.faint, mt: 0.5 }}>
          Leave blank to auto-compute. E.g. 7:00 AM + 2h → 9:00 AM cutoff.
        </Typography>
      </Box>
    </Box>
  </Box>
);

// ─── System settings hook ──────────────────────────────────────────────────
const useSystemSettings = () => {
  const [settings, setSettings] = useState({ primaryColor: "#894444", secondaryColor: "#6d2323", accentColor: "#FEF9E1" });
  useEffect(() => {
    const stored = localStorage.getItem("systemSettings");
    if (stored) { try { setSettings(JSON.parse(stored)); } catch {} }
    const fetchSettings = async () => {
      try {
        const url = API_BASE_URL.includes("/api") ? `${API_BASE_URL}/system-settings` : `${API_BASE_URL}/api/system-settings`;
        const res = await axios.get(url, getAuthHeaders());
        if (res.data && typeof res.data === "object") { setSettings(res.data); localStorage.setItem("systemSettings", JSON.stringify(res.data)); }
      } catch {}
    };
    fetchSettings();
  }, []);
  return settings;
};

// ─── Type chip config ──────────────────────────────────────────────────────
const getTypeChipProps = (item) => {
  if (item.isSuspension) return { label: "Suspension", icon: <BlockIcon sx={{ fontSize: 13 }} />, style: T.suspended };
  if (item.isHoliday)    return { label: "Holiday",    icon: <EventIcon sx={{ fontSize: 13 }} />, style: T.holiday  };
  return { label: "Announcement", icon: <AnnouncementIcon sx={{ fontSize: 13 }} />, style: { bg: T.accentFaint, color: T.accent, border: T.accentBorder } };
};

// ─── Date helpers ──────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
};
const formatDateRange = (s, e) => {
  if (!s && !e) return "—";
  const fs = formatDate(s), fe = formatDate(e);
  return fs === fe ? fs : `${fs} – ${fe}`;
};
const isItemEnded = (item) => {
  if (item.isHoliday && (item.status || "").toLowerCase() === "inactive") return true;
  const end = item.date_end || item.date;
  if (!end) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const endD  = new Date(end);  endD.setHours(0, 0, 0, 0);
  return today > endD;
};

// ─── Form field helper ─────────────────────────────────────────────────────
const buildFormData = (src) => {
  const fd = new FormData();
  fd.append("title",     src.title     || "");
  fd.append("about",     src.about     || "");
  fd.append("date_start", src.date_start || "");
  fd.append("date_end",  src.date_end  || "");
  fd.append("hr_only",   src.hr_only ? "true" : "false");
  fd.append("is_flexi",  src.is_flexi  ? "true" : "false");
  if (src.is_flexi) {
    fd.append("flexi_hours", src.flexi_hours ?? 2);
    if (src.flexi_custom_time) fd.append("flexi_custom_time", src.flexi_custom_time);
  }
  if (src.image) fd.append("image", src.image);
  return fd;
};

// ─── Form tabs ─────────────────────────────────────────────────────────────
const FORM_TABS = [
  { key: "announcement", label: "Announcement", icon: <AnnouncementIcon sx={{ fontSize: 13 }} /> },
  { key: "suspension",   label: "Suspension",   icon: <BlockIcon sx={{ fontSize: 13 }} /> },
  { key: "holiday",      label: "Holiday",      icon: <EventIcon sx={{ fontSize: 13 }} /> },
];

const ANNOUNCEMENT_DEFAULTS = { title: "", about: "", date_start: "", date_end: "", image: null, hr_only: false, is_flexi: false, flexi_hours: 2, flexi_custom_time: "" };
const SUSPENSION_DEFAULTS   = { title: "", about: "", date_start: "", date_end: "", reason: "", image: null, hr_only: false, is_flexi: false, flexi_hours: 2, flexi_custom_time: "" };
const HOLIDAY_DEFAULTS      = { title: "", about: "", date_start: "", date_end: "", status: "Active", image: null };

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────
const AnnouncementForm = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [holidays,      setHolidays]      = useState([]);
  const [suspensions,   setSuspensions]   = useState([]);

  const [newAnnouncement, setNewAnnouncement] = useState(ANNOUNCEMENT_DEFAULTS);
  const [newSuspension,   setNewSuspension]   = useState(SUSPENSION_DEFAULTS);
  const [newHoliday,      setNewHoliday]      = useState(HOLIDAY_DEFAULTS);

  const [createFormType, setCreateFormType] = useState("announcement");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [typeFilter,     setTypeFilter]     = useState("all");
  const [loading,        setLoading]        = useState(false);
  const [refreshing,     setRefreshing]     = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showSnackbar = useCallback((message, severity = "success") => setSnackbar({ open: true, message, severity }), []);

  const [successOpen,   setSuccessOpen]   = useState(false);
  const [successAction, setSuccessAction] = useState("create");

  const { hasAccess, loading: accessLoading } = usePageAccess("announcement");
  useSystemSettings(); // keep settings in sync (side-effect)

  // ── Fetch ──────────────────────────────────────────────────
  useEffect(() => { fetchAnnouncements(); fetchHolidays(); fetchSuspensions(); }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true); setRefreshing(true);
      const res = await axios.get(`${API_BASE_URL}/api/announcements`, getAuthHeaders());
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch { showSnackbar("Failed to fetch announcements", "error"); }
    finally { setTimeout(() => { setLoading(false); setRefreshing(false); }, 600); }
  };
  const fetchHolidays = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/holiday`, getAuthHeaders());
      setHolidays(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };
  const fetchSuspensions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/suspensions`, getAuthHeaders());
      setSuspensions(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  // ── Create ─────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newAnnouncement.title || !newAnnouncement.about || !newAnnouncement.date_start || !newAnnouncement.date_end) {
      showSnackbar("Please fill in Title, About, and Date Range", "error"); return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/announcements`, buildFormData(newAnnouncement), {
        headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders().headers },
      });
      fetchAnnouncements();
      setNewAnnouncement(ANNOUNCEMENT_DEFAULTS);
      setSuccessAction("create"); setSuccessOpen(true);
    } catch { showSnackbar("Failed to add announcement", "error"); }
    finally { setLoading(false); }
  };

  const handleAddSuspension = async () => {
    if (!newSuspension.title || !newSuspension.date_start || !newSuspension.date_end) {
      showSnackbar("Please fill in Title and Date Range for suspension", "error"); return;
    }
    setLoading(true);
    try {
      const fd = buildFormData(newSuspension);
      fd.append("reason", newSuspension.reason || "");
      await axios.post(`${API_BASE_URL}/api/suspensions`, fd, {
        headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders().headers },
      });
      fetchSuspensions();
      setNewSuspension(SUSPENSION_DEFAULTS);
      setSuccessAction("create"); setSuccessOpen(true);
    } catch { showSnackbar("Failed to add suspension", "error"); }
    finally { setLoading(false); }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.title || !newHoliday.date_start || !newHoliday.date_end) {
      showSnackbar("Please fill in Title, Date Range, and Status", "error"); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(newHoliday).forEach(([k, v]) => { if (k === "image" && v) fd.append("image", v); else if (k !== "image") fd.append(k, v || ""); });
      await axios.post(`${API_BASE_URL}/holiday`, fd, {
        headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders().headers },
      });
      fetchHolidays();
      setNewHoliday(HOLIDAY_DEFAULTS);
      setSuccessAction("create"); setSuccessOpen(true);
    } catch { showSnackbar("Failed to add holiday", "error"); }
    finally { setLoading(false); }
  };

  // ── Combined records ───────────────────────────────────────
  const allHolidaysMapped = holidays.map((h) => ({
    id: `holiday-${h.id}`, _rawId: h.id,
    title: h.title || h.description || "", about: h.about || "Official holiday.",
    date_start: h.date_start || h.date, date_end: h.date_end || h.date,
    date: h.date_start || h.date, image: h.image || null,
    status: h.status || "Active", isHoliday: true,
  }));

  const suspensionsMapped = suspensions.map((s) => ({
    id: `suspension-${s.id}`, _rawId: s.id,
    title: s.title || "", about: s.about || "",
    date_start: s.date_start || s.date, date_end: s.date_end || s.date,
    date: s.date_start || s.date, image: s.image || null,
    isHoliday: false, isSuspension: true,
    hr_only: s.hr_only || false, is_flexi: s.is_flexi || false,
    flexi_hours: s.flexi_hours || null, flexi_custom_time: s.flexi_custom_time || null,
  }));

  const combinedItems = [
    ...allHolidaysMapped,
    ...suspensionsMapped,
    ...announcements.map((a) => ({ ...a, date_start: a.date_start || a.date, date_end: a.date_end || a.date, isHoliday: false, isSuspension: !!a.isSuspension })),
  ].sort((a, b) => new Date(b.date_start || b.date) - new Date(a.date_start || a.date));

  const filteredByType =
    typeFilter === "holiday"      ? combinedItems.filter(i => i.isHoliday) :
    typeFilter === "announcement" ? combinedItems.filter(i => !i.isHoliday && !i.isSuspension) :
    typeFilter === "suspension"   ? combinedItems.filter(i => i.isSuspension) :
    typeFilter === "hr_only"      ? combinedItems.filter(i => i.hr_only) :
    combinedItems;

  const filteredItems = filteredByType.filter(item =>
    (item.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (item.about?.toLowerCase()  || "").includes(searchQuery.toLowerCase())
  );

  // ── Image URL ──────────────────────────────────────────────
  const getImageUrl = (image) => {
    if (!image) return "";
    if (image instanceof File) return URL.createObjectURL(image);
    if (typeof image === "string") {
      if (image.startsWith("http")) return image;
      if (image.startsWith("/uploads")) return `${API_BASE_URL}${image}`;
    }
    return image;
  };

  // ── Access guard ───────────────────────────────────────────
  if (accessLoading) return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8 }}>
      <CircularProgress sx={{ color: T.accent, mb: 2 }} />
      <Typography sx={{ color: T.accent, fontSize: "0.85rem" }}>Loading access information…</Typography>
    </Box>
  );
  if (hasAccess !== true) return (
    <AccessDenied title="Access Denied" message="You do not have permission to access this page." returnPath="/admin-home" returnButtonText="Return to Home" />
  );

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
        width: "100vw", maxWidth: "100%",
        position: "relative", left: "50%", transform: "translateX(-50%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}>
        <style>{shimmerKf}</style>

        {/* ── Snackbar ────────────────────────────────────── */}
        {createPortal(
          <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
            <Alert onClose={() => setSnackbar(p => ({ ...p, open: false }))} severity={snackbar.severity} variant="filled"
              sx={{ width: "100%", fontWeight: 600 }}>
              {snackbar.message}
            </Alert>
          </Snackbar>,
          document.body
        )}

        <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

        {/* ── Page Header ────────────────────────────────── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{
            px: 4, py: 3,
            background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "relative", overflow: "hidden",
          }}>
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)" }} />
            <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)" }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
              <AnnouncementIcon sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: "1.2rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                  Announcement Management
                </Typography>
                <Typography sx={{ fontSize: "0.78rem", color: T.accentMid, fontWeight: 600 }}>
                  Administrative Panel · Post and manage announcements, suspensions, and holidays
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
              <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha("#4caf50", 0.12), border: "1px solid rgba(76,175,80,0.25)" }}>
                <Typography sx={{ fontSize: "0.72rem", color: "#2e7d32", fontWeight: 700, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <CheckCircleIcon sx={{ fontSize: 12 }} />
                  {announcements.length + holidays.length + suspensions.length} Records
                </Typography>
              </Box>
              <button
                onClick={() => { fetchAnnouncements(); fetchHolidays(); fetchSuspensions(); }}
                disabled={loading}
                style={{ background: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`, borderRadius: "8px", padding: "7px 10px", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "5px", color: T.accent, fontSize: "0.75rem", fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s", opacity: loading ? 0.5 : 1 }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.14); }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = alpha(T.accent, 0.08); }}
              >
                {loading ? <CircularProgress size={13} sx={{ color: T.accent }} /> : <Refresh sx={{ fontSize: 15 }} />}
                Refresh
              </button>
            </Box>
          </Box>
        </SectionCard>

        {/* ── Create Form ─────────────────────────────────── */}
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader
            icon={AddIcon}
            title="Create New Record"
            rightContent={
              <Box sx={{ display: "flex", border: `1px solid ${T.accentBorder}`, borderRadius: "6px", overflow: "hidden" }}>
                {FORM_TABS.map(({ key, label, icon }, i, arr) => (
                  <button key={key} onClick={() => setCreateFormType(key)}
                    style={{ border: "none", borderRight: i < arr.length - 1 ? `1px solid ${T.accentBorder}` : "none", borderRadius: 0, padding: "5px 13px", cursor: "pointer", background: createFormType === key ? T.accent : "transparent", color: createFormType === key ? "#fff" : T.accent, fontSize: "0.72rem", fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s" }}
                    onMouseEnter={e => { if (createFormType !== key) e.currentTarget.style.backgroundColor = T.accentFaint; }}
                    onMouseLeave={e => { if (createFormType !== key) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {icon}{label}
                  </button>
                ))}
              </Box>
            }
          />

          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>

            {/* ── Announcement form ─────────────────── */}
            {createFormType === "announcement" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  <Box sx={{ flex: "2 1 200px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Title *</Typography>
                    <NativeInput value={newAnnouncement.title} onChange={e => setNewAnnouncement(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title…" />
                  </Box>
                  <Box sx={{ flex: "1 1 140px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Start Date *</Typography>
                    <NativeInput type="date" value={newAnnouncement.date_start} onChange={e => setNewAnnouncement(p => ({ ...p, date_start: e.target.value }))} icon={<CalendarToday sx={{ fontSize: 13 }} />} />
                  </Box>
                  <Box sx={{ flex: "1 1 140px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>End Date *</Typography>
                    <NativeInput type="date" value={newAnnouncement.date_end} onChange={e => setNewAnnouncement(p => ({ ...p, date_end: e.target.value }))} icon={<CalendarToday sx={{ fontSize: 13 }} />} />
                  </Box>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>About *</Typography>
                  <textarea
                    value={newAnnouncement.about}
                    onChange={e => setNewAnnouncement(p => ({ ...p, about: e.target.value }))}
                    rows={3}
                    placeholder="Announcement details…"
                    style={{ width: "100%", padding: "9px 13px", borderRadius: "8px", border: `1px solid ${T.accentBorder}`, fontSize: "0.875rem", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", color: T.text, lineHeight: 1.55 }}
                    onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; }}
                    onBlur={e => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = "none"; }}
                  />
                </Box>

                {/* Toggles */}
                <Box>
                  <Box sx={{ height: 1, bgcolor: T.divider, mb: 1.5 }} />
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 1, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Visibility &amp; Schedule Options
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                    <OptionToggleCard icon={HrIcon} title="HR Employees Only" description="Hide from all staff except HR-role employees." checked={newAnnouncement.hr_only} onChange={v => setNewAnnouncement(p => ({ ...p, hr_only: v }))} activeColor="#1565c0" />
                    <OptionToggleCard icon={FlexiIcon} title="Flexible Schedule (Flexi)" description="Grace period for Non-Teaching Faculty — no deduction within the window." checked={newAnnouncement.is_flexi} onChange={v => setNewAnnouncement(p => ({ ...p, is_flexi: v }))} activeColor="#2e7d32" />
                  </Box>
                  <Collapse in={!!newAnnouncement.is_flexi}>
                    <FlexiDetailPanel values={newAnnouncement} onChange={(f, v) => setNewAnnouncement(p => ({ ...p, [f]: v }))} />
                  </Collapse>
                </Box>

                {/* Image upload */}
                <Box>
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Image (optional)</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: "8px", border: `1px solid ${T.accentBorder}`, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, color: T.accent, fontFamily: "inherit", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.accentFaint}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <ImageIcon sx={{ fontSize: 14 }} /> Upload Image
                      <input type="file" hidden accept="image/*" onChange={e => setNewAnnouncement(p => ({ ...p, image: e.target.files?.[0] || null }))} />
                    </label>
                    {newAnnouncement.image && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.75, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                        <img src={getImageUrl(newAnnouncement.image)} alt="preview" style={{ maxWidth: 56, maxHeight: 36, borderRadius: 4, objectFit: "cover" }} />
                        <Typography sx={{ fontSize: "0.72rem", color: T.muted, maxWidth: 120 }} noWrap>{newAnnouncement.image.name}</Typography>
                        <IconButton size="small" onClick={() => setNewAnnouncement(p => ({ ...p, image: null }))} sx={{ p: 0.25 }}>
                          <CloseIcon sx={{ fontSize: 13, color: T.faint }} />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <RowBtn icon={loading ? <CircularProgress size={12} sx={{ color: T.accent }} /> : <AddIcon sx={{ fontSize: 14 }} />} label={loading ? "Adding…" : "Add Announcement"} color={T.accent} hoverBg={T.accentFaint} disabled={loading} onClick={handleAdd} />
                </Box>
              </Box>
            )}

            {/* ── Suspension form ─────────────────────── */}
            {createFormType === "suspension" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  <Box sx={{ flex: "2 1 200px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Title *</Typography>
                    <NativeInput value={newSuspension.title} onChange={e => setNewSuspension(p => ({ ...p, title: e.target.value }))} placeholder="Suspension title…" />
                  </Box>
                  <Box sx={{ flex: "1 1 140px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Reason / Type</Typography>
                    <NativeInput value={newSuspension.reason} onChange={e => setNewSuspension(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Typhoon" />
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  <Box sx={{ flex: "1 1 140px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Start Date *</Typography>
                    <NativeInput type="date" value={newSuspension.date_start} onChange={e => setNewSuspension(p => ({ ...p, date_start: e.target.value }))} icon={<CalendarToday sx={{ fontSize: 13 }} />} />
                  </Box>
                  <Box sx={{ flex: "1 1 140px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>End Date *</Typography>
                    <NativeInput type="date" value={newSuspension.date_end} onChange={e => setNewSuspension(p => ({ ...p, date_end: e.target.value }))} icon={<CalendarToday sx={{ fontSize: 13 }} />} />
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Details / Description</Typography>
                  <textarea value={newSuspension.about} onChange={e => setNewSuspension(p => ({ ...p, about: e.target.value }))} rows={3} placeholder="Suspension details…"
                    style={{ width: "100%", padding: "9px 13px", borderRadius: "8px", border: `1px solid ${T.accentBorder}`, fontSize: "0.875rem", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", color: T.text, lineHeight: 1.55 }}
                    onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; }}
                    onBlur={e => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = "none"; }} />
                </Box>

                {/* Toggles */}
                <Box>
                  <Box sx={{ height: 1, bgcolor: T.divider, mb: 1.5 }} />
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 1, letterSpacing: "0.06em", textTransform: "uppercase" }}>Visibility &amp; Schedule Options</Typography>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                    <OptionToggleCard icon={HrIcon} title="HR Employees Only" description="Hide from all staff except HR-role employees." checked={newSuspension.hr_only} onChange={v => setNewSuspension(p => ({ ...p, hr_only: v }))} activeColor="#1565c0" />
                    <OptionToggleCard icon={FlexiIcon} title="Flexible Schedule (Flexi)" description="Grace period for Non-Teaching Faculty — no deduction within the window." checked={newSuspension.is_flexi} onChange={v => setNewSuspension(p => ({ ...p, is_flexi: v }))} activeColor="#2e7d32" />
                  </Box>
                  <Collapse in={!!newSuspension.is_flexi}>
                    <FlexiDetailPanel values={newSuspension} onChange={(f, v) => setNewSuspension(p => ({ ...p, [f]: v }))} />
                  </Collapse>
                </Box>

                {/* Image */}
                <Box>
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Image (optional)</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: "8px", border: `1px solid ${T.accentBorder}`, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, color: T.accent, fontFamily: "inherit", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.accentFaint}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <ImageIcon sx={{ fontSize: 14 }} /> Upload Image
                      <input type="file" hidden accept="image/*" onChange={e => setNewSuspension(p => ({ ...p, image: e.target.files?.[0] || null }))} />
                    </label>
                    {newSuspension.image && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.75, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                        <img src={getImageUrl(newSuspension.image)} alt="preview" style={{ maxWidth: 56, maxHeight: 36, borderRadius: 4, objectFit: "cover" }} />
                        <Typography sx={{ fontSize: "0.72rem", color: T.muted, maxWidth: 120 }} noWrap>{newSuspension.image.name}</Typography>
                        <IconButton size="small" onClick={() => setNewSuspension(p => ({ ...p, image: null }))} sx={{ p: 0.25 }}><CloseIcon sx={{ fontSize: 13, color: T.faint }} /></IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <RowBtn icon={loading ? <CircularProgress size={12} sx={{ color: T.accent }} /> : <AddIcon sx={{ fontSize: 14 }} />} label={loading ? "Adding…" : "Add Suspension"} color={T.accent} hoverBg={T.accentFaint} disabled={loading} onClick={handleAddSuspension} />
                </Box>
              </Box>
            )}

            {/* ── Holiday form ──────────────────────────── */}
            {createFormType === "holiday" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  <Box sx={{ flex: "2 1 200px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Title *</Typography>
                    <NativeInput value={newHoliday.title} onChange={e => setNewHoliday(p => ({ ...p, title: e.target.value }))} placeholder="Holiday title…" />
                  </Box>
                  <Box sx={{ flex: "1 1 120px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Start Date *</Typography>
                    <NativeInput type="date" value={newHoliday.date_start} onChange={e => setNewHoliday(p => ({ ...p, date_start: e.target.value }))} icon={<CalendarToday sx={{ fontSize: 13 }} />} />
                  </Box>
                  <Box sx={{ flex: "1 1 120px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>End Date *</Typography>
                    <NativeInput type="date" value={newHoliday.date_end} onChange={e => setNewHoliday(p => ({ ...p, date_end: e.target.value }))} icon={<CalendarToday sx={{ fontSize: 13 }} />} />
                  </Box>
                  <Box sx={{ flex: "1 1 100px" }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Status</Typography>
                    <select
                      value={newHoliday.status}
                      onChange={e => setNewHoliday(p => ({ ...p, status: e.target.value }))}
                      style={{ width: "100%", padding: "9px 13px", borderRadius: "8px", border: `1px solid ${T.accentBorder}`, fontSize: "0.875rem", fontFamily: "inherit", outline: "none", color: T.text, background: "#fff", boxSizing: "border-box", cursor: "pointer" }}
                      onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; }}
                      onBlur={e => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = "none"; }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </Box>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>About</Typography>
                  <textarea value={newHoliday.about} onChange={e => setNewHoliday(p => ({ ...p, about: e.target.value }))} rows={2} placeholder="Holiday description…"
                    style={{ width: "100%", padding: "9px 13px", borderRadius: "8px", border: `1px solid ${T.accentBorder}`, fontSize: "0.875rem", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", color: T.text, lineHeight: 1.55 }}
                    onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; }}
                    onBlur={e => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = "none"; }} />
                </Box>

                <Box>
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Image (optional)</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: "8px", border: `1px solid ${T.accentBorder}`, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, color: T.accent, fontFamily: "inherit", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.accentFaint}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <ImageIcon sx={{ fontSize: 14 }} /> Upload Picture
                      <input type="file" hidden accept="image/*" onChange={e => setNewHoliday(p => ({ ...p, image: e.target.files?.[0] || null }))} />
                    </label>
                    {newHoliday.image && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.75, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                        <img src={getImageUrl(newHoliday.image)} alt="preview" style={{ maxWidth: 56, maxHeight: 36, borderRadius: 4, objectFit: "cover" }} />
                        <Typography sx={{ fontSize: "0.72rem", color: T.muted, maxWidth: 120 }} noWrap>{newHoliday.image.name}</Typography>
                        <IconButton size="small" onClick={() => setNewHoliday(p => ({ ...p, image: null }))} sx={{ p: 0.25 }}><CloseIcon sx={{ fontSize: 13, color: T.faint }} /></IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <RowBtn icon={loading ? <CircularProgress size={12} sx={{ color: T.accent }} /> : <AddIcon sx={{ fontSize: 14 }} />} label={loading ? "Adding…" : "Add Holiday"} color={T.accent} hoverBg={T.accentFaint} disabled={loading} onClick={handleAddHoliday} />
                </Box>
              </Box>
            )}
          </Box>
        </SectionCard>

        {/* ── Records Table ───────────────────────────────── */}
        <SectionCard>
          {/* Table header with search + filter */}
          <Box sx={{
            px: 2.5, py: 2,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: `1px solid ${T.divider}`,
            bgcolor: T.accentFaint,
            flexWrap: "wrap", gap: 1.5,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <AnnouncementIcon sx={{ fontSize: 15, color: T.accent }} />
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent }}>Announcement Records</Typography>
              <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.15)}` }}>
                <Typography sx={{ fontSize: "0.7rem", color: T.accent, fontWeight: 700 }}>
                  {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
              {/* Type filter */}
              <Box sx={{ display: "flex", border: `1px solid ${T.accentBorder}`, borderRadius: "6px", overflow: "hidden" }}>
                {[
                  { key: "all",          label: "All" },
                  { key: "announcement", label: "Announcements" },
                  { key: "holiday",      label: "Holidays" },
                  { key: "suspension",   label: "Suspensions" },
                  { key: "hr_only",      label: "HR Only" },
                ].map(({ key, label }, i, arr) => (
                  <button key={key} onClick={() => setTypeFilter(key)}
                    style={{ border: "none", borderRight: i < arr.length - 1 ? `1px solid ${T.accentBorder}` : "none", borderRadius: 0, padding: "5px 11px", cursor: "pointer", background: typeFilter === key ? T.accent : "transparent", color: typeFilter === key ? "#fff" : T.accent, fontSize: "0.7rem", fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s" }}
                    onMouseEnter={e => { if (typeFilter !== key) e.currentTarget.style.backgroundColor = T.accentFaint; }}
                    onMouseLeave={e => { if (typeFilter !== key) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {label}
                  </button>
                ))}
              </Box>

              {/* Search */}
              <FieldInput
                size="small" variant="outlined" placeholder="Search title or about…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                sx={{ width: 240 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.faint, fontSize: 15 }} /></InputAdornment>,
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery("")} sx={{ p: 0.25 }}>
                        <CloseIcon sx={{ fontSize: 13, color: T.faint }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Box>
          </Box>

          {/* Table */}
          <Box sx={{ overflowX: "auto", overflowY: "auto", maxHeight: 520, scrollbarWidth: "thin", "&::-webkit-scrollbar": { height: 5, width: 5 }, "&::-webkit-scrollbar-track": { background: T.accentFaint, borderRadius: 4 }, "&::-webkit-scrollbar-thumb": { background: T.accentMid, borderRadius: 4 } }}>
            <Table sx={{ minWidth: 800, borderCollapse: "collapse" }}>
              <TableHead>
                <TableRow>
                  {["#", "Type", "Status", "Title", "About", "Date Range", "Flags"].map((col, i) => (
                    <TableCell key={col} sx={{
                      position: "sticky", top: 0, zIndex: 2,
                      bgcolor: T.accent, color: "#fff",
                      fontWeight: 700, fontSize: "0.65rem",
                      letterSpacing: "0.05em", textTransform: "uppercase",
                      px: 1.5, py: 1.25, whiteSpace: "nowrap",
                      borderBottom: `2px solid ${T.accentBorder}`,
                      borderRight: "1px solid rgba(255,255,255,0.12)",
                      textAlign: i === 0 ? "center" : "left",
                    }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 7 }}>
                      <InfoIcon sx={{ fontSize: 44, color: alpha(T.accent, 0.2), mb: 1.5, display: "block", mx: "auto" }} />
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: T.muted }}>No items found</Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: T.faint, mt: 0.5 }}>
                        {searchQuery ? "Try adjusting your search" : "Add one using the form above"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredItems.map((item, index) => {
                  const ended   = isItemEnded(item);
                  const isEven  = index % 2 === 0;
                  const tc      = getTypeChipProps(item);

                  return (
                    <TableRow key={item.id} sx={{ "&:hover td": { bgcolor: `${T.rowHover} !important` } }}>

                      {/* # */}
                      <TableCell sx={{ bgcolor: isEven ? "#fff" : T.rowOdd, borderBottom: `1px solid ${T.divider}`, borderRight: `1px solid ${T.divider}`, px: 1.5, py: 1, fontSize: "0.75rem", fontWeight: 600, color: T.faint, textAlign: "center", minWidth: 36 }}>
                        {index + 1}
                      </TableCell>

                      {/* Type */}
                      <TableCell sx={{ bgcolor: isEven ? "#fff" : T.rowOdd, borderBottom: `1px solid ${T.divider}`, borderRight: `1px solid ${T.divider}`, px: 1.5, py: 1, whiteSpace: "nowrap", minWidth: 120 }}>
                        <Chip
                          size="small" icon={tc.icon} label={tc.label}
                          sx={{ bgcolor: tc.style.bg, color: tc.style.color, border: `1px solid ${tc.style.border}`, fontWeight: 700, fontSize: "0.62rem", height: 20, "& .MuiChip-icon": { color: "inherit", fontSize: 12 } }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={{ bgcolor: isEven ? "#fff" : T.rowOdd, borderBottom: `1px solid ${T.divider}`, borderRight: `1px solid ${T.divider}`, px: 1.5, py: 1, minWidth: 80 }}>
                        <Chip
                          size="small"
                          label={ended ? "Ended" : "Active"}
                          sx={{
                            fontWeight: 700, fontSize: "0.62rem", height: 20,
                            bgcolor: ended ? alpha("#9e9e9e", 0.15) : alpha("#4caf50", 0.12),
                            color: ended ? "#757575" : "#2e7d32",
                            border: `1px solid ${ended ? "#9e9e9e" : "#4caf50"}`,
                          }}
                        />
                      </TableCell>

                      {/* Title */}
                      <TableCell sx={{ bgcolor: isEven ? "#fff" : T.rowOdd, borderBottom: `1px solid ${T.divider}`, borderRight: `1px solid ${T.divider}`, px: 1.5, py: 1, fontSize: "0.82rem", fontWeight: 600, color: T.text, minWidth: 180, maxWidth: 240 }}>
                        <Typography noWrap sx={{ fontSize: "inherit", fontWeight: "inherit", maxWidth: 220 }}>{item.title}</Typography>
                      </TableCell>

                      {/* About */}
                      <TableCell sx={{ bgcolor: isEven ? "#fff" : T.rowOdd, borderBottom: `1px solid ${T.divider}`, borderRight: `1px solid ${T.divider}`, px: 1.5, py: 1, fontSize: "0.78rem", color: T.muted, minWidth: 200, maxWidth: 320 }}>
                        <Typography noWrap sx={{ fontSize: "inherit", maxWidth: 300 }}>{item.about}</Typography>
                      </TableCell>

                      {/* Date range */}
                      <TableCell sx={{ bgcolor: isEven ? "#fff" : T.rowOdd, borderBottom: `1px solid ${T.divider}`, borderRight: `1px solid ${T.divider}`, px: 1.5, py: 1, fontSize: "0.75rem", fontFamily: "monospace", color: T.muted, whiteSpace: "nowrap", minWidth: 160 }}>
                        {formatDateRange(item.date_start, item.date_end)}
                      </TableCell>

                      {/* Flags */}
                      <TableCell sx={{ bgcolor: isEven ? "#fff" : T.rowOdd, borderBottom: `1px solid ${T.divider}`, px: 1.5, py: 1, minWidth: 120 }}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {item.hr_only && (
                            <Chip size="small" icon={<HrIcon sx={{ fontSize: 11 }} />} label="HR Only"
                              sx={{ bgcolor: alpha("#1565c0", 0.1), color: "#1565c0", border: "1px solid #1565c0", fontWeight: 700, fontSize: "0.6rem", height: 18, "& .MuiChip-icon": { color: "inherit" } }} />
                          )}
                          {item.is_flexi && (
                            <Chip size="small" icon={<FlexiIcon sx={{ fontSize: 11 }} />}
                              label={item.flexi_custom_time ? `Flexi ≤ ${toTimeInput(item.flexi_custom_time)}` : `Flexi +${item.flexi_hours ?? 2}h`}
                              sx={{ bgcolor: alpha("#2e7d32", 0.1), color: "#2e7d32", border: "1px solid #2e7d32", fontWeight: 700, fontSize: "0.6rem", height: 18, "& .MuiChip-icon": { color: "inherit" } }} />
                          )}
                          {!item.hr_only && !item.is_flexi && (
                            <Typography sx={{ fontSize: "0.72rem", color: T.faint }}>—</Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          {/* Legend */}
          <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${T.divider}`, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { style: { bgcolor: T.holiday.bg,    border: `1px solid ${T.holiday.border}` },   label: "Holiday" },
              { style: { bgcolor: T.suspended.bg,  border: `1px solid ${T.suspended.border}` }, label: "Suspension" },
              { style: { bgcolor: alpha("#1565c0", 0.1), border: "1px solid #1565c0" },          label: "HR Only tag" },
              { style: { bgcolor: alpha("#2e7d32", 0.1), border: "1px solid #2e7d32" },          label: "Flexi Schedule tag" },
              { style: { bgcolor: alpha("#4caf50", 0.12), border: "1px solid #4caf50" },         label: "Active status" },
              { style: { bgcolor: alpha("#9e9e9e", 0.15), border: "1px solid #9e9e9e" },         label: "Ended status" },
            ].map((item, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "2px", ...item.style }} />
                <Typography sx={{ fontSize: "0.68rem", color: T.faint }}>{item.label}</Typography>
              </Box>
            ))}
          </Box>
        </SectionCard>

      </Box>
    </Fade>
  );
};

export default AnnouncementForm;