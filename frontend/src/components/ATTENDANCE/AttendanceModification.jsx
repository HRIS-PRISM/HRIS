import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
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
  Fab,
  Zoom,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  CalendarToday,
  Today,
  ArrowBackIos,
  Clear,
  SaveAs,
  Refresh,
  Edit,
  FilterList,
  CheckCircle,
  CompareArrows,
  AdminPanelSettings,
  Cancel,
  VerifiedUser,
  Person,
  KeyboardArrowUp,
  Info,
} from "@mui/icons-material";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";

// ─── Theme tokens ──────────────────────────────────────────────────────────
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
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: "linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)",
    backgroundSize: "800px 100%",
    animation: "shimmer 1.6s infinite linear",
    flexShrink: 0, ...sx,
  }} />
);

// ─── Wireframe skeleton ────────────────────────────────────────────────────
const AttendanceSearchWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    <Box sx={{
      py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
      width: "100vw", maxWidth: "100%",
      position: "relative", left: "63%", transform: "translateX(-61%)",
      px: { xs: 2, sm: 3, md: 6 },
    }}>
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
      {/* Table skeleton */}
      <Box sx={{ borderRadius: "12px", overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.09)", bgcolor: "#fff", animation: "blink 2s ease-in-out 0.2s infinite" }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: T.accent, display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 1.4fr 1.4fr 1.4fr 1.4fr", gap: 2 }}>
          {[100, 70, 55, 90, 115, 120, 88].map((w, i) => (
            <Box key={i} sx={{ height: 10, width: w, borderRadius: 3, bgcolor: "rgba(255,255,255,0.22)" }} />
          ))}
        </Box>
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ px: 2.5, py: 2, display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 1.4fr 1.4fr 1.4fr 1.4fr", gap: 2, alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.05)", bgcolor: i % 2 === 0 ? "#fff" : T.rowOdd }}>
            <Bone w={90} h={12} /><Bone w={70} h={12} /><Bone w={55} h={12} />
            {[0, 1, 2, 3].map((ci) => (
              <Box key={ci} sx={{ height: 36, borderRadius: "6px", border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }} />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  </>
);

// ─── Styled primitives ─────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: "#fff",
});

// ─── Panel header bar ──────────────────────────────────────────────────────
const PanelHeader = ({ icon: Icon, title, right }) => (
  <Box sx={{
    px: 2.5, py: 1.25,
    borderBottom: `1px solid ${T.divider}`,
    display: "flex", alignItems: "center", gap: 1.25,
    bgcolor: T.accentFaint, minHeight: 42,
  }}>
    <Icon sx={{ fontSize: 14, color: T.accent }} />
    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent }}>{title}</Typography>
    {right && <><Box sx={{ flex: 1 }} />{right}</>}
  </Box>
);

// ─── Native input ──────────────────────────────────────────────────────────
const NativeInput = ({ value, onChange, type = "text", placeholder, disabled, icon }) => (
  <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
    {icon && (
      <Box sx={{ position: "absolute", left: 10, color: T.accentMid, display: "flex", alignItems: "center", zIndex: 1, pointerEvents: "none" }}>
        {icon}
      </Box>
    )}
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} disabled={disabled}
      style={{
        width: "100%",
        padding: icon ? "9px 13px 9px 34px" : "9px 13px",
        borderRadius: "8px",
        border: `1px solid ${T.accentBorder}`,
        fontSize: "0.875rem", outline: "none",
        fontFamily: "inherit", boxSizing: "border-box",
        transition: "border-color 0.18s",
        background: disabled ? "#f5f5f5" : "#fff",
        color: T.text,
        cursor: disabled ? "not-allowed" : "text",
      }}
      onFocus={(e) => { if (!disabled) { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${T.accent}22`; } }}
      onBlur={(e) => { e.target.style.borderColor = T.accentBorder; e.target.style.boxShadow = "none"; }}
    />
  </Box>
);

// ─── Inline editable time input ────────────────────────────────────────────
const TimeInput = ({ value, onChange, unsaved, savedMod }) => (
  <Box>
    <input
      type="text"
      value={value}
      onChange={onChange}
      style={{
        width: "120px",
        padding: "7px 10px",
        borderRadius: "6px",
        border: `1.5px solid ${unsaved ? "#e65100" : savedMod ? "#2e7d32" : T.accentBorder}`,
        fontSize: "0.8rem",
        outline: "none",
        fontFamily: "inherit",
        boxSizing: "border-box",
        background: unsaved ? "rgba(230,81,0,0.04)" : savedMod ? "rgba(46,125,50,0.04)" : "#fff",
        color: T.text,
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => { e.target.style.borderColor = unsaved ? "#e65100" : T.accent; e.target.style.boxShadow = `0 0 0 1.5px ${unsaved ? "#e65100" : T.accent}22`; }}
      onBlur={(e) => { e.target.style.borderColor = unsaved ? "#e65100" : savedMod ? "#2e7d32" : T.accentBorder; e.target.style.boxShadow = "none"; }}
    />
  </Box>
);

// ─── Row button ────────────────────────────────────────────────────────────
const RowBtn = ({ icon, label, onClick, color, hoverBg, disabled = false }) => (
  <button
    onClick={onClick} disabled={disabled}
    style={{
      background: "transparent", border: `1px solid ${color}40`,
      borderRadius: "6px", padding: "4px 10px",
      cursor: disabled ? "default" : "pointer", color,
      display: "flex", alignItems: "center", gap: "4px",
      fontSize: "0.72rem", fontWeight: 700, fontFamily: "inherit",
      transition: "background-color 0.15s, border-color 0.15s",
      whiteSpace: "nowrap", opacity: disabled ? 0.5 : 1,
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
      borderRadius: "6px", padding: "6px 14px", cursor: "pointer",
      color: active ? "#fff" : T.accent,
      display: "flex", alignItems: "center", gap: "5px",
      fontSize: "0.78rem", fontWeight: 700, fontFamily: "inherit",
      transition: "all 0.15s ease", whiteSpace: "nowrap",
    }}
    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = T.accentFaint; e.currentTarget.style.borderColor = T.accent; } }}
    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = T.accentBorder; } }}
  >
    {icon}{label}
  </button>
);

// ─── Helpers ───────────────────────────────────────────────────────────────
const deepClone = (arr) => arr.map((r) => ({ ...r }));

const EDITABLE_FIELDS = ["timeIN", "breaktimeIN", "breaktimeOUT", "timeOUT"];
const FIELD_LABELS = {
  timeIN:       "Time IN",
  breaktimeIN:  "Breaktime IN",
  breaktimeOUT: "Breaktime OUT",
  timeOUT:      "Time OUT",
};

const getChanges = (current, saved) => {
  if (!saved) return [];
  return EDITABLE_FIELDS.filter((f) => (current[f] || "") !== (saved[f] || "")).map((f) => ({
    field: f, label: FIELD_LABELS[f],
    before: saved[f] || "—", after: current[f] || "—",
  }));
};

const isDirty = (current, saved) => {
  if (!saved) return false;
  return EDITABLE_FIELDS.some((f) => (current[f] || "") !== (saved[f] || ""));
};

// ─── Authorization Dialog ──────────────────────────────────────────────────
const AuthorizationDialog = ({ open, onClose, onConfirm, records, savedRecords }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [showDiff, setShowDiff]         = useState(true);

  useEffect(() => { if (open) { setAcknowledged(false); setShowDiff(true); } }, [open]);

  const changedRows = (savedRecords || [])
    .map((saved, idx) => {
      const current = records[idx];
      if (!current) return null;
      const changes = getChanges(current, saved);
      if (changes.length === 0) return null;
      return { date: saved.date, day: saved.Day, changes };
    })
    .filter(Boolean);

  const canConfirm = acknowledged && changedRows.length > 0;

  return (
    <Dialog
      open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden", border: `1.5px solid ${alpha(T.accent, 0.2)}`, boxShadow: `0 20px 60px ${alpha(T.accent, 0.25)}` } }}
    >
      {/* Header */}
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{
          px: 3, py: 2.5,
          background: `linear-gradient(135deg, #4a0e0e 0%, ${T.accent} 50%, ${T.accentMid} 100%)`,
          display: "flex", alignItems: "center", gap: 2,
          position: "relative", overflow: "hidden",
        }}>
          <Box sx={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: "radial-gradient(circle,rgba(254,249,225,0.1) 0%,transparent 70%)" }} />
          <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "rgba(254,249,225,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid rgba(254,249,225,0.3)", flexShrink: 0, zIndex: 1 }}>
            <AdminPanelSettings sx={{ fontSize: 22, color: "#FEF9E1" }} />
          </Box>
          <Box sx={{ zIndex: 1 }}>
            <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: "#FEF9E1", lineHeight: 1.2 }}>Confirm Modification</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "rgba(254,249,225,0.75)", mt: 0.3 }}>Attendance record modification</Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: "#FFFDF5" }}>
        {/* Change Summary */}
        <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
          <Box
            onClick={() => setShowDiff((p) => !p)}
            sx={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer", px: 2, py: 1.25, borderRadius: "8px",
              bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`,
              "&:hover": { bgcolor: T.accentHover }, transition: "all 0.18s",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CompareArrows sx={{ fontSize: 16, color: T.accent }} />
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent }}>Pending Changes Summary</Typography>
            </Box>
            <Typography sx={{ fontSize: "0.7rem", color: T.faint }}>{showDiff ? "Hide ▲" : "Show ▼"}</Typography>
          </Box>

          <Collapse in={showDiff}>
            <Box sx={{ mt: 1.5, maxHeight: 260, overflowY: "auto", borderRadius: "8px", border: `1px solid ${T.accentBorder}` }}>
              {changedRows.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <CheckCircle sx={{ color: "#4caf50", fontSize: 36, mb: 1 }} />
                  <Typography sx={{ fontSize: "0.82rem", color: T.muted }}>No changes detected.</Typography>
                </Box>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {["Date", "Day", "Field", "Before", "After"].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, color: T.accent, fontSize: "0.72rem", bgcolor: T.accentFaint, py: 1, letterSpacing: "0.05em" }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {changedRows.flatMap((row, ri) =>
                      row.changes.map((ch, ci) => (
                        <TableRow key={`${ri}-${ci}`} sx={{ "&:nth-of-type(even)": { bgcolor: "rgba(109,35,35,0.02)" } }}>
                          {ci === 0 && (
                            <>
                              <TableCell rowSpan={row.changes.length} sx={{ fontWeight: 600, color: T.accent, borderRight: `1px solid ${T.divider}`, verticalAlign: "top", pt: 1.5, fontSize: "0.78rem" }}>{row.date}</TableCell>
                              <TableCell rowSpan={row.changes.length} sx={{ color: T.muted, borderRight: `1px solid ${T.divider}`, verticalAlign: "top", pt: 1.5, fontSize: "0.78rem" }}>{row.day}</TableCell>
                            </>
                          )}
                          <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600, color: T.text }}>{ch.label}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "inline-flex", alignItems: "center", px: 1, py: 0.25, borderRadius: "4px", bgcolor: alpha("#d32f2f", 0.08), border: `1px solid ${alpha("#d32f2f", 0.2)}` }}>
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#b71c1c", fontFamily: "monospace" }}>{ch.before}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "inline-flex", alignItems: "center", px: 1, py: 0.25, borderRadius: "4px", bgcolor: alpha("#2e7d32", 0.08), border: `1px solid ${alpha("#2e7d32", 0.2)}` }}>
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#1b5e20", fontFamily: "monospace" }}>{ch.after}</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </Box>

        {/* Acknowledgement */}
        <Box sx={{ px: 3, pt: 2, pb: 2.5 }}>
          <Box sx={{
            p: 2, borderRadius: "8px",
            border: `1.5px solid ${acknowledged ? alpha("#2e7d32", 0.35) : T.accentBorder}`,
            bgcolor: acknowledged ? alpha("#2e7d32", 0.04) : T.accentFaint,
            transition: "all 0.25s ease",
          }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  sx={{ color: T.accent, "&.Mui-checked": { color: "#2e7d32" }, "& .MuiSvgIcon-root": { fontSize: 20 } }}
                />
              }
              label={
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 500, color: T.text, lineHeight: 1.6 }}>
                  I hereby confirm that the above attendance records are accurate and formally authorize the requested modifications. I acknowledge full responsibility for the accuracy and validity of these changes.
                </Typography>
              }
              sx={{ alignItems: "flex-start", "& .MuiFormControlLabel-label": { mt: 0.3 } }}
            />
          </Box>
        </Box>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ px: 3, py: 2, bgcolor: "#FFFDF5", borderTop: `1px solid ${T.divider}`, gap: 1.5 }}>
        <RowBtn
          icon={<Cancel sx={{ fontSize: 13 }} />}
          label="Cancel"
          onClick={onClose}
          color="#C62828"
          hoverBg="rgba(198,40,40,0.08)"
        />
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          style={{
            flex: 1,
            background: canConfirm ? "linear-gradient(135deg,#2e7d32 0%,#388e3c 100%)" : "rgba(0,0,0,0.08)",
            border: "none", borderRadius: "8px",
            padding: "10px 20px", cursor: canConfirm ? "pointer" : "not-allowed",
            color: canConfirm ? "#fff" : "rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            fontSize: "0.82rem", fontWeight: 700, fontFamily: "inherit",
            transition: "all 0.18s", boxShadow: canConfirm ? "0 4px 14px rgba(46,125,50,0.3)" : "none",
          }}
          onMouseEnter={(e) => { if (canConfirm) e.currentTarget.style.background = "linear-gradient(135deg,#1b5e20 0%,#2e7d32 100%)"; }}
          onMouseLeave={(e) => { if (canConfirm) e.currentTarget.style.background = "linear-gradient(135deg,#2e7d32 0%,#388e3c 100%)"; }}
        >
          <VerifiedUser sx={{ fontSize: 15 }} />
          Confirm &amp; Save Changes
        </button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const AttendanceSearch = () => {
  const { settings } = useSystemSettings();

  const accentColor        = settings.primaryColor       || T.accent;
  const textSecondaryColor = settings.textSecondaryColor || "#FEF9E1";

  const today          = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { hasAccess, loading: accessLoading } = usePageAccess("search-attendance");

  const [personID, setPersonID]                         = useState("");
  const [startDate, setStartDate]                       = useState("");
  const [endDate, setEndDate]                           = useState("");
  const [records, setRecords]                           = useState([]);
  const [savedRecords, setSavedRecords]                 = useState([]);
  const [everModifiedFields, setEverModifiedFields]     = useState(new Set());
  const [loading, setLoading]                           = useState(false);
  const [error, setError]                               = useState("");
  const [success, setSuccess]                           = useState("");
  const [selectedYear, setSelectedYear]                 = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth]               = useState(null);
  const [pageLoading, setPageLoading]                   = useState(true);
  const [authDialogOpen, setAuthDialogOpen]             = useState(false);
  const [showScrollTop, setShowScrollTop]               = useState(false);

  const resultsRef = useRef(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  // ── Snackbar ──
  const [snackbar, setSnackbar]                   = useState({ open: false, message: "", severity: "success" });
  const [snackbarCountdown, setSnackbarCountdown] = useState(6);

  const showSnackbar = (message, severity = "success") => { setSnackbar({ open: true, message, severity }); setSnackbarCountdown(6); };
  const handleCloseSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));

  useEffect(() => {
    let timer;
    if (snackbar.open && snackbarCountdown > 0)
      timer = setInterval(() => setSnackbarCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [snackbar.open, snackbarCountdown]);

  useEffect(() => { if (!accessLoading) setPageLoading(false); }, [accessLoading]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

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
      const fetched = response.data;
      setRecords(fetched);
      setSavedRecords(deepClone(fetched));
      setEverModifiedFields(new Set());
    if (fetched.length > 0) {
  setTimeout(() => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);
}
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
    setAuthDialogOpen(false);
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

      const modSet = new Set();
      records.forEach((rec, i) => {
        EDITABLE_FIELDS.forEach((f) => {
          if ((rec[f] || "") !== (savedRecords[i]?.[f] || ""))
            modSet.add(`${rec.personID}-${rec.date}-${f}`);
        });
      });
      setEverModifiedFields(modSet);
      setSavedRecords(deepClone(records));
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Failed to save records. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index, field, value) => {
    const updated = [...records];
    updated[index] = { ...updated[index], [field]: value };
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
    setRecords([]); setSavedRecords([]); setEverModifiedFields(new Set());
    setError(""); setSuccess(""); setSelectedMonth(null);
  };

  useEffect(() => {
    if (personID && startDate && endDate) fetchRecords(false);
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guards ──
  if (pageLoading || accessLoading) return <AttendanceSearchWireframe />;

  if (hasAccess === false) return (
    <AccessDenied
      title="Access Denied"
      message="You do not have permission to access Attendance Modification. Contact your administrator to request access."
      returnPath="/admin-home"
      returnButtonText="Return to Home"
    />
  );

  return (
    <Fade in timeout={400}>
      <Box sx={{
        py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
        width: "100vw", maxWidth: "100%",
        position: "relative", left: "63%", transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}>
        <style>{shimmerKf}</style>

        {/* ── Authorization Dialog ── */}
        <AuthorizationDialog
          open={authDialogOpen}
          onClose={() => setAuthDialogOpen(false)}
          onConfirm={saveAll}
          records={records}
          savedRecords={savedRecords}
        />

        {/* ── Snackbar ── */}
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%", fontWeight: 600, backgroundColor: snackbar.severity === "success" ? "#4caf50" : undefined, color: snackbar.severity === "success" ? "#ffffff" : undefined, "& .MuiAlert-icon": { color: snackbar.severity === "success" ? "#ffffff" : undefined } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span>{snackbar.message}</span>
              {snackbar.open && snackbarCountdown > 0 && (
                <Chip label={`${snackbarCountdown}s`} size="small" sx={{ backgroundColor: snackbar.severity === "success" ? "rgba(255,255,255,0.3)" : undefined, color: snackbar.severity === "success" ? "#ffffff" : undefined, fontWeight: 700 }} />
              )}
            </Box>
          </Alert>
        </Snackbar>

        {/* ── Loading Backdrop ── */}
        <Backdrop sx={{ color: "#FEF9E1", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading}>
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress color="inherit" size={52} thickness={4} />
            <Typography sx={{ mt: 2, color: "#FEF9E1", fontWeight: 600, fontSize: "0.95rem" }}>
              Processing attendance records...
            </Typography>
          </Box>
        </Backdrop>

        {/* ── Page Header ── */}
        <SectionCard sx={{ mb: 2 }}>
          <Box sx={{
            px: 4, py: 3,
            background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "relative", overflow: "hidden",
          }}>
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.10) 0%,transparent 70%)" }} />
            <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.07) 0%,transparent 70%)" }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
              <Edit sx={{ fontSize: 30, color: T.accent }} />
              <Box>
                <Typography sx={{ fontSize: "1.2rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25 }}>
                  Attendance Management
                </Typography>
                <Typography sx={{ fontSize: "0.78rem", color: T.accentMid, fontWeight: 600 }}>
                  Admin Portal · Review and manage attendance records
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
              <Box sx={{ px: 2, py: 0.6, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                <Typography sx={{ fontSize: "0.75rem", color: T.accent, fontWeight: 700 }}>Editable Records</Typography>
              </Box>
              <button
                onClick={() => fetchRecords(true)}
                disabled={!personID || !startDate || !endDate}
                style={{
                  background: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}`,
                  borderRadius: "8px", padding: "7px 10px",
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
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 1.5, borderRadius: 2, fontSize: "0.82rem" }}>{error}</Alert>
        </Collapse>
        <Collapse in={!!success}>
          <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 1.5, borderRadius: 2, fontSize: "0.82rem" }}>{success}</Alert>
        </Collapse>

        {/* ── Controls Card ── */}
        <SectionCard sx={{ mb: 2 }}>
          <PanelHeader icon={FilterList} title="Filter Attendance Records" />

          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>

            {/* Input fields row */}
            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
              {[
                { label: "Employee Number", value: personID,  onChange: (e) => setPersonID(e.target.value),  type: "text", icon: <Person sx={{ fontSize: 16, color: T.accentBorder }} /> },
                { label: "Start Date",      value: startDate, onChange: (e) => setStartDate(e.target.value), type: "date", icon: <CalendarToday sx={{ fontSize: 15, color: T.accentBorder }} /> },
                { label: "End Date",        value: endDate,   onChange: (e) => setEndDate(e.target.value),   type: "date", icon: <CalendarToday sx={{ fontSize: 15, color: T.accentBorder }} /> },
              ].map(({ label, value, onChange, type, icon }) => (
                <Box key={label} sx={{ flex: 1, minWidth: 160 }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {label}
                  </Typography>
                  <NativeInput type={type} value={value} onChange={onChange} placeholder={type === "text" ? "Enter employee number" : undefined} icon={icon} />
                </Box>
              ))}
            </Box>

            {/* Divider */}
            <Box sx={{ height: 1, bgcolor: T.divider, mb: 2 }} />
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent, mb: 1.25, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 0.75 }}>
              <FilterList sx={{ fontSize: 13 }} />Quick Date Selection
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
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent, mb: 0.3 }}>Select Entire Month</Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>Choose a year, then click any month to set the date range</Typography>
                </Box>
                <FormControl sx={{ minWidth: 130 }} size="small">
                  <InputLabel sx={{ fontWeight: 600, fontSize: "0.8rem" }}>Year</InputLabel>
                  <Select
                    value={selectedYear} label="Year"
                    onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth(null); showSnackbar("Year changed — please click a month to load records.", "info"); }}
                    sx={{ bgcolor: "#fff", borderRadius: 2, fontWeight: 600, fontSize: "0.85rem", "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder } }}
                  >
                    {yearOptions.map((y) => <MenuItem key={y} value={y} sx={{ fontSize: "0.85rem" }}>{y}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
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
                        borderRadius: "6px", padding: "7px 14px", cursor: "pointer",
                        color: sel ? "#fff" : T.accent,
                        fontSize: "0.75rem", fontWeight: 700, fontFamily: "inherit",
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
                color="#C62828" hoverBg="rgba(198,40,40,0.08)"
                onClick={handleClearFilters}
              />
            </Box>
          </Box>
        </SectionCard>

        {/* ── Editable Records Table ── */}
        {records.length > 0 && (
          <Fade in={!loading} timeout={400}>
            <SectionCard sx={{ mb: 2 }} ref={resultsRef}>
              <PanelHeader
                icon={Edit}
                title={`Records for ${personID}`}
                right={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Typography sx={{ fontSize: "0.72rem", color: T.faint }}>{startDate} → {endDate}</Typography>
                    <Box sx={{ px: 1.5, py: 0.3, borderRadius: 5, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.18)}` }}>
                      <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700 }}>
                        {records.length} {records.length === 1 ? "record" : "records"}
                      </Typography>
                    </Box>
                    <button
                      onClick={() => setAuthDialogOpen(true)}
                      disabled={loading}
                      style={{
                        background: loading ? T.accentFaint : T.accent,
                        border: `1px solid ${loading ? T.accentBorder : T.accent}`,
                        borderRadius: "6px", padding: "5px 12px",
                        cursor: loading ? "not-allowed" : "pointer",
                        color: loading ? T.accentMid : "#fff",
                        display: "flex", alignItems: "center", gap: "5px",
                        fontSize: "0.72rem", fontWeight: 700, fontFamily: "inherit",
                        transition: "all 0.15s", opacity: loading ? 0.65 : 1,
                      }}
                      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = T.accentDark; }}
                      onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = T.accent; }}
                    >
                      <SaveAs sx={{ fontSize: 13 }} />
                      Save Changes
                    </button>
                  </Box>
                }
              />

              {/* Legend row */}
              <Box sx={{ px: 2.5, py: 1, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}`, display: "flex", gap: 2.5, flexWrap: "wrap", alignItems: "center" }}>
                {[
                  { color: "#e65100", label: "Unsaved changes" },
                  { color: "#2e7d32", label: "Saved modifications" },
                ].map(({ color, label }) => (
                  <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: "0.68rem", color: T.faint }}>{label}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Sticky column headers */}
              <Box sx={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 0.8fr 1.4fr 1.4fr 1.4fr 1.4fr",
                px: 2.5, py: 1.25, bgcolor: T.accent, gap: 2,
                position: "sticky", top: 0, zIndex: 2,
              }}>
                {["EMPLOYEE #", "DATE", "DAY", "TIME IN", "BREAKTIME IN", "BREAKTIME OUT", "TIME OUT"].map((col) => (
                  <Typography key={col} sx={{ color: "#fff", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em" }}>{col}</Typography>
                ))}
              </Box>

              {/* Scrollable rows */}
              <Box sx={{ maxHeight: 520, overflowY: "auto", overflowX: "auto" }}>
                {records.map((record, index) => {
                  const rowDirty    = isDirty(record, savedRecords[index]);
                  const rowSavedMod = !rowDirty && EDITABLE_FIELDS.some((f) => everModifiedFields.has(`${index}-${f}`));
                  const leftBorder  = rowDirty ? "3px solid #e65100" : rowSavedMod ? "3px solid #2e7d32" : `3px solid transparent`;
                  return (
                    <Box
                      key={index}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr 0.8fr 1.4fr 1.4fr 1.4fr 1.4fr",
                        px: 2.5, py: 1.5, gap: 2,
                        alignItems: "center",
                        bgcolor: rowDirty
                          ? alpha("#e65100", 0.04)
                          : rowSavedMod
                            ? alpha("#2e7d32", 0.04)
                            : index % 2 === 0 ? "#fff" : T.rowOdd,
                        borderBottom: `1px solid ${T.divider}`,
                        borderLeft: leftBorder,
                        transition: "background 0.13s",
                        "&:hover": { bgcolor: T.rowHover },
                        minWidth: 900,
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: "0.8rem", color: T.text }}>{record.personID}</Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontWeight: 500 }}>{record.date}</Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontWeight: 500 }}>{record.Day}</Typography>

                      {EDITABLE_FIELDS.map((field) => {
                        const unsaved  = savedRecords[index] && (record[field] || "") !== (savedRecords[index][field] || "");
                        const savedMod = !unsaved && everModifiedFields.has(`${index}-${field}`);
                        return (
                          <Box key={field}>
                            <TimeInput
                              value={record[field] || ""}
                              onChange={(e) => handleInputChange(index, field, e.target.value)}
                              unsaved={unsaved}
                              savedMod={savedMod}
                            />
                            {unsaved && (
                              <Typography sx={{ fontSize: "0.67rem", mt: 0.3, color: "#b71c1c", fontFamily: "monospace" }}>
                                was: {savedRecords[index][field] || "—"}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  );
                })}
              </Box>
            </SectionCard>
          </Fade>
        )}

        {/* ── Scroll to Top FAB ── */}
        <Zoom in={showScrollTop}>
          <Fab
            size="small"
            sx={{ position: "fixed", bottom: 24, right: 45, zIndex: 1000, bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark }, boxShadow: `0 4px 14px ${alpha(T.accent, 0.35)}` }}
            onClick={scrollToTop}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>

      </Box>
    </Fade>
  );
};

export default AttendanceSearch;