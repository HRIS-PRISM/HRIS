import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import {
  Typography, TextField, Button, Box, Grid, Chip, Modal, IconButton,
  Select, MenuItem, FormControl, Alert, InputAdornment, Card, Avatar,
  Divider, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
  TablePagination, LinearProgress, Tooltip, Fade, CircularProgress,
  ToggleButton, ToggleButtonGroup, Collapse, Paper, Tabs, Tab,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon, Cancel as CancelIcon, Close, EventNote,
  Search as SearchIcon, Person as PersonIcon, History as HistoryIcon,
  CalendarToday as CalendarIcon, MonetizationOn as CommutationIcon,
  CheckCircle as CheckIcon, AutoFixHigh as AutoAssignIcon,
  Male as MaleIcon, Female as FemaleIcon, Wc as GenderIcon,
  Warning as WarningIcon, PlayArrow as RunIcon,
  TableRows as TableRowsIcon, Refresh as RefreshIcon,
  AccessTime as HoursIcon, Today as DaysIcon, Reorder,
  ViewModule as ViewModuleIcon, ViewList as ViewListIcon,
  Info as InfoIcon, Settings as SettingsIcon, FilterList as FilterListIcon,
  Domain as DomainIcon, Work as WorkIcon,
  Calculate as CalculateIcon, OpenInNew as OpenInNewIcon,
  SwapHoriz as ConvertIcon,
  TrendingUp as EarnIcon,
  Pending as PendingIcon,
} from "@mui/icons-material";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover:  "rgba(109,35,35,0.10)",
  headerGrad:   "linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)",
  rowEven:      "#ffffff",
  rowOdd:       "rgba(109,35,35,0.025)",
  rowHover:     "rgba(109,35,35,0.055)",
  text:         "#1a1a1a",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  surface:      "#ffffff",
  divider:      "rgba(0,0,0,0.08)",
  poppins:      "'Poppins', sans-serif",
  // Earnings colours
  earnPending:  { bg: "rgba(237,108,2,0.10)", color: "#bf360c", border: "rgba(237,108,2,0.30)" },
  earnApproved: { bg: "rgba(46,125,50,0.10)", color: "#1b5e20", border: "rgba(46,125,50,0.30)" },
};

const shimmerKeyframes = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
@keyframes laShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes laPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.60; }
}
@keyframes converterSlideIn {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
`;

// ─── Styled primitives ─────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: T.surface,
});

const FieldInput = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8, fontSize: "0.875rem", backgroundColor: "#fff",
    "& fieldset": { borderColor: T.accentBorder },
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
    "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: T.text },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8, textTransform: "none", fontWeight: 600,
  fontSize: "0.875rem", letterSpacing: "0.01em", transition: "all 0.18s ease",
  "&:hover":  { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

const selectSx = {
  borderRadius: "8px", fontSize: "0.875rem", bgcolor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.accent },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: T.accent, borderWidth: "1.5px" },
};

const fieldLabelSx = {
  fontSize: "0.68rem", fontWeight: 700, color: alpha(T.accent, 0.45),
  textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.5,
  fontFamily: T.poppins,
};

const fieldValueSx = {
  fontSize: "0.82rem", color: T.text, p: "8px 12px",
  border: `1px solid ${T.accentBorder}`, borderRadius: "8px",
  backgroundColor: T.accentFaint, minHeight: 36, display: "flex",
  alignItems: "center", lineHeight: 1.4, fontFamily: T.poppins,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
  { value: "", label: "No specific month" },
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const MONTH_NAMES = {
  "01": "January", "02": "February", "03": "March", "04": "April",
  "05": "May", "06": "June", "07": "July", "08": "August",
  "09": "September", "10": "October", "11": "November", "12": "December",
  "1": "January", "2": "February", "3": "March", "4": "April",
  "5": "May", "6": "June", "7": "July", "8": "August",
  "9": "September",
};

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const semOrder = (s) => { if (!s) return 0; const l = String(s).toLowerCase(); if (l.includes("2nd")) return 2; if (l.includes("1st")) return 1; return 0; };

const periodLabel = (year, sem) => {
  const fallbackYear = parseInt(year, 10) || new Date().getFullYear();
  if (!sem) return `${fallbackYear}`;
  const monthName = MONTH_NAMES[String(sem)] || MONTH_NAMES[String(sem).padStart(2, "0")];
  if (monthName) return `${fallbackYear} ${monthName}`;
  return `${fallbackYear} ${sem}`;
};

const getStatusColor = (remaining, total) => { if (!total || total === 0) return "#9e9e9e"; const pct = (remaining / total) * 100; if (pct > 50) return "#2e7d32"; if (pct > 20) return "#ed6c02"; return "#d32f2f"; };
const hoursToDisplay = (hours, unit) => unit === "hours" ? parseFloat(hours || 0).toFixed(3) : (parseFloat(hours || 0) / 8).toFixed(3);
const displayToHours = (val, unit) => unit === "hours" ? parseFloat(val || 0) : parseFloat((parseFloat(val || 0) * 8).toFixed(3));
const hoursToLabel = (h, unit) => unit === "hours" ? `${parseFloat(h || 0).toFixed(3)} hrs` : `${(parseFloat(h || 0) / 8).toFixed(3)} days`;
const isCommutedLocked = (row) => toNum(row?.remaining_hours) === 0 && toNum(row?.total_hours) > 0 && toNum(row?.used_hours) > 0 && toNum(row?.used_hours) >= toNum(row?.total_hours);
const getActivePeriods = (periods = []) => (Array.isArray(periods) ? periods : []).filter((p) => !isCommutedLocked(p));
const getLeaveTypeStatsActive = (periods) => getActivePeriods(periods).reduce((s, p) => ({ totalHours: s.totalHours + toNum(p.total_hours), usedHours: s.usedHours + toNum(p.used_hours), remainingHours: s.remainingHours + toNum(p.remaining_hours) }), { totalHours: 0, usedHours: 0, remainingHours: 0 });
const getLeaveGenderRestriction = (lt) => { if (!lt?.gender_restriction) return null; return lt.gender_restriction.toLowerCase(); };
const isLeaveAllowedForGender = (lt, g) => { const r = getLeaveGenderRestriction(lt); if (!r) return true; if (!g) return false; const gl = g.toLowerCase(); if (r === "male") return gl === "male" || gl === "m"; if (r === "female") return gl === "female" || gl === "f"; return true; };
const getLeaveLabel = (code, types) => { if (!code) return "—"; const f = Array.isArray(types) ? types.find((t) => t.leave_code === code) : null; const d = f?.leave_description || f?.description || f?.leave_name || ""; return d ? `${code} — ${d}` : `${code}`; };

// ─── Conversion defaults ──────────────────────────────────────────────────────
const DEFAULT_HOURS_8 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour", day_type: "8hr", rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.125).toFixed(3)),
}));
const DEFAULT_HOURS_6 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour", day_type: "6hr", rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.167).toFixed(3)),
}));
const DEFAULT_MINUTES = Array.from({ length: 60 }, (_, i) => ({
  rate_type: "minute", day_type: "minute", rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.002).toFixed(3)),
}));
const DEFAULT_LWP_TABLE = Array.from({ length: 30 }, (_, i) => ({
  d: i + 1, e: Number(((i + 1) * 0.04167).toFixed(3)),
}));
const DEFAULT_ABS_TABLE = [
  { a: 0.5,  e: 1.229 }, { a: 1.0,  e: 1.208 }, { a: 1.5,  e: 1.188 },
  { a: 2.0,  e: 1.167 }, { a: 2.5,  e: 1.146 }, { a: 3.0,  e: 1.125 },
  { a: 3.5,  e: 1.104 }, { a: 4.0,  e: 1.083 }, { a: 4.5,  e: 1.063 },
  { a: 5.0,  e: 1.042 }, { a: 5.5,  e: 1.021 }, { a: 6.0,  e: 1.0   },
  { a: 6.5,  e: 0.979 }, { a: 7.0,  e: 0.958 }, { a: 7.5,  e: 0.938 },
  { a: 8.0,  e: 0.917 }, { a: 8.5,  e: 0.854 }, { a: 9.0,  e: 0.833 },
  { a: 9.5,  e: 0.875 }, { a: 10.0, e: 0.833 }, { a: 10.5, e: 0.813 },
  { a: 11.0, e: 0.792 }, { a: 11.5, e: 0.771 }, { a: 12.0, e: 0.75  },
  { a: 12.5, e: 0.729 }, { a: 13.0, e: 0.708 }, { a: 13.5, e: 0.687 },
  { a: 14.0, e: 0.667 }, { a: 14.5, e: 0.646 }, { a: 15.0, e: 0.625 },
  { a: 15.5, e: 0.604 }, { a: 16.0, e: 0.583 }, { a: 16.5, e: 0.562 },
  { a: 17.0, e: 0.542 }, { a: 17.5, e: 0.521 }, { a: 18.0, e: 0.5   },
  { a: 18.5, e: 0.479 }, { a: 19.0, e: 0.458 }, { a: 19.5, e: 0.437 },
  { a: 20.0, e: 0.417 }, { a: 20.5, e: 0.396 }, { a: 21.0, e: 0.375 },
  { a: 21.5, e: 0.354 }, { a: 22.0, e: 0.333 }, { a: 22.5, e: 0.312 },
  { a: 23.0, e: 0.292 }, { a: 23.5, e: 0.271 }, { a: 24.0, e: 0.25  },
  { a: 24.5, e: 0.229 }, { a: 25.0, e: 0.208 }, { a: 25.5, e: 0.187 },
  { a: 26.0, e: 0.167 }, { a: 26.5, e: 0.146 }, { a: 27.0, e: 0.125 },
  { a: 27.5, e: 0.104 }, { a: 28.0, e: 0.083 }, { a: 28.5, e: 0.062 },
  { a: 29.0, e: 0.042 }, { a: 29.5, e: 0.021 },
];

function sanitizeDecimal(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Number(n.toFixed(3));
}

// ─── Dept badge ────────────────────────────────────────────────────────────────
const DeptBadge = ({ code, light = false }) => {
  if (!code) return null;
  if (light) return (
    <Chip size="small" icon={<DomainIcon style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }} />} label={code}
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", "& .MuiChip-label": { px: 0.75 } }} />
  );
  return (
    <Chip size="small" icon={<DomainIcon style={{ fontSize: 10, color: T.accentMid }} />} label={code}
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, "& .MuiChip-label": { px: 0.75 } }} />
  );
};

const EmpCatBadge = ({ label, colorHex, light = false }) => {
  if (!label) return null;
  const color = colorHex || "#757575";
  if (light) return (
    <Chip size="small" icon={<WorkIcon style={{ fontSize: 10, color: "rgba(255,255,255,0.85)" }} />} label={label}
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", maxWidth: 160, "& .MuiChip-label": { px: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }} />
  );
  return (
    <Chip size="small" icon={<WorkIcon style={{ fontSize: 10, color }} />} label={label}
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: alpha(color, 0.1), color, border: `1px solid ${alpha(color, 0.3)}`, maxWidth: 180, "& .MuiChip-label": { px: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }} />
  );
};

const GenderBadge = ({ gender, light = false }) => {
  if (!gender) return null;
  const isMale = gender.toLowerCase() === "male";
  if (light) return (
    <Chip size="small"
      icon={isMale ? <MaleIcon style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }} /> : <FemaleIcon style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }} />}
      label={gender}
      sx={{ height: 20, fontSize: "0.65rem", bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 900, border: "1px solid rgba(255,255,255,0.35)" }} />
  );
  return (
    <Chip size="small"
      icon={isMale ? <MaleIcon style={{ fontSize: 11, color: "#1565C0" }} /> : <FemaleIcon style={{ fontSize: 11, color: "#c2185b" }} />}
      label={gender}
      sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800, letterSpacing: 0.3, bgcolor: isMale ? "rgba(21,101,192,0.08)" : "rgba(194,24,91,0.08)", color: isMale ? "#1565C0" : "#c2185b", border: `1px solid ${isMale ? "rgba(21,101,192,0.25)" : "rgba(194,24,91,0.25)"}`, borderRadius: "4px" }} />
  );
};

// ─── NEW: Earnings Banner shown in period modal cards ─────────────────────────
// Shows pending + approved (non-commuted) earnings beside the assignment row.
// "approved" ones are already baked into total_hours — we show them with a note.
// "pending" ones are NOT yet in total_hours — we show how much extra is incoming.
const EarningsBanner = ({ employeeNumber, leaveCode, periodYear, periodSemester, unit }) => {
  const [earnings, setEarnings] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!employeeNumber || !leaveCode) return;
    let cancelled = false;
    setLoading(true);
    const token = localStorage.getItem("token");
    // Fetch all earnings for this employee + leave code (no month filter — show all)
    axios
      .get(`${API_BASE_URL}/api/earnings/leave/${employeeNumber}?all=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => {
        if (cancelled) return;
        const all = Array.isArray(r.data?.earnings) ? r.data.earnings : [];
        // Filter to this leave code only, and not rejected
        const relevant = all.filter(
          (e) =>
            e.leave_code === leaveCode &&
            e.earn_status !== "rejected" &&
            (
              // Match by period_year
              !periodYear ||
              String(e.period_year) === String(periodYear) ||
              // If no match on year, still show so user knows earnings exist
              true
            )
        );
        // Only keep entries whose period_year matches the assignment period
        const filtered = relevant.filter(
          (e) => !periodYear || String(e.period_year) === String(periodYear)
        );
        setEarnings(filtered.length > 0 ? filtered : relevant.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [employeeNumber, leaveCode, periodYear]);

  if (loading) return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.75, mt: 0.75, borderRadius: 1.5, bgcolor: "rgba(25,118,210,0.04)", border: "1px dashed rgba(25,118,210,0.2)" }}>
      <CircularProgress size={10} sx={{ color: "#1565c0" }} />
      <Typography sx={{ fontSize: "0.62rem", color: "#1565c0", fontFamily: T.poppins }}>Checking earnings…</Typography>
    </Box>
  );

  if (earnings.length === 0) return null;

  const pendingEarnings  = earnings.filter((e) => e.earn_status === "pending");
  const approvedEarnings = earnings.filter((e) => e.earn_status === "approved");

  const pendingHrs  = pendingEarnings.reduce((s, e) => s + toNum(e.earned_hours), 0);
  const approvedHrs = approvedEarnings.reduce((s, e) => s + toNum(e.earned_hours), 0);

  const fmt = (h) => unit === "hours"
    ? `${h.toFixed(3)} hrs`
    : `${(h / 8).toFixed(3)} days`;

  return (
    <Box sx={{ mt: 0.75 }}>
      {/* Summary row */}
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap",
          px: 1.25, py: 0.65, borderRadius: "8px",
          bgcolor: pendingHrs > 0 ? T.earnPending.bg : "rgba(46,125,50,0.06)",
          border: `1px solid ${pendingHrs > 0 ? T.earnPending.border : "rgba(46,125,50,0.22)"}`,
          cursor: "pointer",
          "&:hover": { filter: "brightness(0.97)" },
        }}
      >
        <EarnIcon sx={{ fontSize: 12, color: pendingHrs > 0 ? T.earnPending.color : "#2e7d32", flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: pendingHrs > 0 ? T.earnPending.color : "#2e7d32", fontFamily: T.poppins }}>
          Earnings for this leave type
        </Typography>

        {approvedHrs > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, px: 0.75, py: 0.2, borderRadius: "5px", bgcolor: T.earnApproved.bg, border: `1px solid ${T.earnApproved.border}` }}>
            <CheckIcon sx={{ fontSize: 10, color: T.earnApproved.color }} />
            <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, color: T.earnApproved.color, fontFamily: T.poppins }}>{fmt(approvedHrs)} approved</Typography>
          </Box>
        )}
        {pendingHrs > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, px: 0.75, py: 0.2, borderRadius: "5px", bgcolor: T.earnPending.bg, border: `1px solid ${T.earnPending.border}` }}>
            <PendingIcon sx={{ fontSize: 10, color: T.earnPending.color }} />
            <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, color: T.earnPending.color, fontFamily: T.poppins }}>{fmt(pendingHrs)} pending</Typography>
          </Box>
        )}

        {approvedHrs > 0 && (
          <Tooltip title="Approved earnings are already included in the Total shown above.">
            <Typography sx={{ fontSize: "0.58rem", color: "#2e7d32", fontFamily: T.poppins, ml: "auto", fontStyle: "italic" }}>
              ✓ included in total
            </Typography>
          </Tooltip>
        )}
        {pendingHrs > 0 && approvedHrs === 0 && (
          <Tooltip title="These pending earnings are NOT yet added to the assignment total. They will be added once approved.">
            <Typography sx={{ fontSize: "0.58rem", color: T.earnPending.color, fontFamily: T.poppins, ml: "auto", fontStyle: "italic" }}>
              ⏳ not yet in total
            </Typography>
          </Tooltip>
        )}

        <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins, ml: approvedHrs > 0 || pendingHrs > 0 ? 0 : "auto" }}>
          {expanded ? "▲ hide" : "▼ details"}
        </Typography>
      </Box>

      {/* Expanded detail rows */}
      {expanded && (
        <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 0.4, px: 0.5 }}>
          {earnings.map((e) => {
            const isPending  = e.earn_status === "pending";
            const isApproved = e.earn_status === "approved";
            const meta = isPending ? T.earnPending : T.earnApproved;
            return (
              <Box key={e.id} sx={{
                display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap",
                px: 1.25, py: 0.5, borderRadius: "7px",
                bgcolor: meta.bg, border: `1px solid ${meta.border}`,
              }}>
                {isPending  && <PendingIcon sx={{ fontSize: 11, color: meta.color, flexShrink: 0 }} />}
                {isApproved && <CheckIcon   sx={{ fontSize: 11, color: meta.color, flexShrink: 0 }} />}
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: meta.color, fontFamily: T.poppins }}>
                  {fmt(toNum(e.earned_hours))}
                </Typography>
                <Typography sx={{ fontSize: "0.62rem", color: T.muted, fontFamily: T.poppins }}>
                  {e.period_year}{e.period_month ? ` · Month ${e.period_month}` : ""}
                </Typography>
                <Chip
                  label={isPending ? "Pending" : "Approved"}
                  size="small"
                  sx={{ height: 14, fontSize: "0.55rem", fontWeight: 700, bgcolor: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                />
                {isApproved && (
                  <Typography sx={{ fontSize: "0.58rem", color: "#4caf50", fontFamily: T.poppins, fontStyle: "italic" }}>
                    already in assignment total
                  </Typography>
                )}
                {isPending && (
                  <Typography sx={{ fontSize: "0.58rem", color: T.earnPending.color, fontFamily: T.poppins, fontStyle: "italic" }}>
                    will be added on approval
                  </Typography>
                )}
                {e.remarks && (
                  <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins, ml: "auto", fontStyle: "italic" }}>
                    {e.remarks}
                  </Typography>
                )}
              </Box>
            );
          })}

          {/* Grand total row if mixed */}
          {pendingHrs > 0 && approvedHrs > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.5, borderRadius: "7px", bgcolor: "rgba(25,118,210,0.07)", border: "1px solid rgba(25,118,210,0.2)", mt: 0.25 }}>
              <InfoIcon sx={{ fontSize: 11, color: "#1565c0" }} />
              <Typography sx={{ fontSize: "0.63rem", fontWeight: 700, color: "#1565c0", fontFamily: T.poppins }}>
                If all approved: total would be {fmt(approvedHrs + pendingHrs)}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

// ─── CreditInput ───────────────────────────────────────────────────────────────
const CreditInput = ({
  label, valueHours, onChangeHours, unit,
  required = false, disabled = false, color = T.accent, autoFilled = false,
}) => {
  const [inputVal, setInputVal] = useState("");
  const isFocused = useRef(false);

  const toDisplayStr = useCallback((hrs) => {
    if (hrs === "" || hrs == null || hrs === 0) return "";
    const n = parseFloat(hrs);
    if (isNaN(n) || n === 0) return "";
    if (unit === "hours") return String(n);
    const days = n / 8;
    return String(parseFloat(days.toFixed(10))).replace(/\.?0+$/, "") || "";
  }, [unit]);

  useEffect(() => {
    if (!isFocused.current) {
      setInputVal(toDisplayStr(valueHours));
    }
  }, [valueHours, toDisplayStr]);

  useEffect(() => {
    if (!isFocused.current) {
      setInputVal(toDisplayStr(valueHours));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  const handleFocus = (e) => {
    isFocused.current = true;
    if (!inputVal || parseFloat(inputVal) === 0) setInputVal("");
    e.target.select();
  };

  const handleChange = (e) => {
    setInputVal(e.target.value);
  };

  const handleBlur = () => {
    isFocused.current = false;
    const num = parseFloat(inputVal);
    const hrs = isNaN(num) || inputVal.trim() === ""
      ? 0
      : unit === "hours"
        ? num
        : parseFloat((num * 8).toFixed(6));
    onChangeHours(hrs);
    setInputVal(hrs === 0 ? "" : toDisplayStr(hrs));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  const rawNum = parseFloat(inputVal) || 0;
  const equivalentLabel = unit === "hours"
    ? `= ${(rawNum / 8).toFixed(3)} days`
    : `= ${(rawNum * 8).toFixed(3)} hrs`;

  return (
    <Box>
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: autoFilled ? "#2e7d32" : T.accent, mb: 0.75, fontFamily: T.poppins }}>
        {label}{required && <span style={{ color: "#c62828" }}> *</span>}
        {autoFilled && <span style={{ color: "#2e7d32", marginLeft: 6, fontSize: "0.65rem", fontWeight: 800 }}>● auto-filled</span>}
      </Typography>
      <FieldInput
        type="text"
        inputMode="decimal"
        size="small"
        fullWidth
        disabled={disabled}
        value={inputVal}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderColor: autoFilled ? "rgba(46,125,50,0.5)" : T.accentBorder,
            bgcolor: autoFilled ? "rgba(46,125,50,0.03)" : "#fff",
          },
          "& .MuiInputBase-input": { color, fontWeight: 700 },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontWeight: 700, whiteSpace: "nowrap" }}>
                {equivalentLabel}
              </Typography>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};

// ─── RemainingBalance ─────────────────────────────────────────────────────────
const RemainingBalance = ({ hoursLike, color, unit = "days", alignItems = "flex-end", large = false }) => {
  const h = toNum(hoursLike);
  const days = (h / 8).toFixed(3);
  const hrs  = h.toFixed(3);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems }}>
      <Typography sx={{ fontWeight: 900, color: color || "inherit", fontSize: large ? "1.4rem" : "0.95rem", lineHeight: 1.2, fontFamily: T.poppins }}>
        {unit === "hours" ? `${hrs} hrs` : `${days} days`}
      </Typography>
      <Typography sx={{ fontWeight: 600, color: color || "inherit", fontSize: "0.68rem", opacity: 0.75, fontFamily: T.poppins }}>
        {unit === "hours" ? `(${days} days)` : `(${hrs} hrs)`}
      </Typography>
    </Box>
  );
};

// ─── CommuteDialog ─────────────────────────────────────────────────────────────
const CommuteDialog = ({ open, period, onClose, onConfirm, loading, unit }) => {
  const remHrs = toNum(period?.remaining_hours);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", fontFamily: T.poppins } }}>
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CommutationIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", lineHeight: 1.2, fontFamily: T.poppins }}>Transfer Leave to Commutation</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", fontFamily: T.poppins }}>This action cannot be undone</Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "rgba(255,255,255,0.75)", position: "relative", zIndex: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: 2, p: 2.5, mb: 2.5 }}>
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, mb: 1.25, fontFamily: T.poppins }}>Summary</Typography>
          {[
            ["Employee",                      period?.fullName || period?.employeeNumber],
            ["Leave Type",                    period?.leave_code],
            ["Period",                        periodLabel(period?.period_year, period?.period_semester)],
            ["Unused Balance to Transfer",    `${remHrs.toFixed(3)} hrs (${(remHrs / 8).toFixed(3)} days)`],
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.6, borderBottom: "1px solid rgba(0,0,0,0.05)", "&:last-child": { borderBottom: "none" } }}>
              <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontWeight: 700, fontFamily: T.poppins }}>{label}</Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>{value}</Typography>
            </Box>
          ))}
        </Box>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins }}>
            The remaining unused leave balance will be transferred to a Commutation record, and this assignment will be marked as fully used.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", gap: 1 }}>
        <AccentButton onClick={onClose} variant="outlined" sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
        <AccentButton onClick={onConfirm} variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <CommutationIcon sx={{ fontSize: "14px !important" }} />} sx={{ fontSize: "0.8rem", fontFamily: T.poppins, bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark }, "&:disabled": { bgcolor: "#ccc" } }}>
          {loading ? "Transferring…" : "Confirm Transfer"}
        </AccentButton>
      </DialogActions>
    </Dialog>
  );
};

// ─── BulkAutoAssignDialog ──────────────────────────────────────────────────────
const BulkAutoAssignDialog = ({
  open, onClose, leaveTypes, assignments, employees, commutationMap = {}, onSuccess, deptMap = {},
}) => {
  const [targetYear,         setTargetYear]         = useState(new Date().getFullYear() + 1);
  const [selectedLeaveCodes, setSelectedLeaveCodes] = useState([]);
  const [running,            setRunning]            = useState(false);
  const [progress,           setProgress]           = useState(0);
  const [progressMsg,        setProgressMsg]        = useState("");
  const [results,            setResults]            = useState(null);
  const [filterGender,       setFilterGender]       = useState("all");
  const [filterDept,         setFilterDept]         = useState("all");
  const [empSearch,          setEmpSearch]          = useState("");
  const [ltSearch,           setLtSearch]           = useState("");
  const [empFilterStatus,    setEmpFilterStatus]    = useState("all");

  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = new Date().getFullYear() - 2; y <= new Date().getFullYear() + 5; y++)
      opts.push({
        value: y,
        label: y === new Date().getFullYear()     ? `${y} — Current`
             : y === new Date().getFullYear() + 1 ? `${y} — Next Year`
             : String(y),
      });
    return opts;
  }, []);

  const allDeptCodes = useMemo(() => {
    const codes = [...new Set(Object.values(deptMap).filter(Boolean))].sort();
    return codes;
  }, [deptMap]);

  const employeesWithAssignments = useMemo(() => {
    const nums = [...new Set(assignments.map((a) => a.employeeNumber?.toString()))];
    return nums.map((num) => {
      const info = employees.find((e) => e.employeeNumber?.toString() === num);
      return {
        employeeNumber: num,
        fullName: info?.fullName || num,
        sex: info?.sex || info?.gender || null,
        deptCode: deptMap[num] || null,
      };
    });
  }, [assignments, employees, deptMap]);

  const filteredLeaveTypesForDropdown = useMemo(() => leaveTypes.filter((lt) => {
    const r = getLeaveGenderRestriction(lt);
    if (filterGender === "male")   return r === "male"   || !r;
    if (filterGender === "female") return r === "female" || !r;
    return true;
  }), [leaveTypes, filterGender]);

  const searchedLeaveTypes = useMemo(() => {
    if (!ltSearch.trim()) return filteredLeaveTypesForDropdown;
    const s = ltSearch.toLowerCase();
    return filteredLeaveTypesForDropdown.filter(
      (lt) => lt.leave_code.toLowerCase().includes(s) ||
               (lt.leave_description || "").toLowerCase().includes(s)
    );
  }, [filteredLeaveTypesForDropdown, ltSearch]);

  useEffect(() => {
    const validCodes = new Set(filteredLeaveTypesForDropdown.map((lt) => lt.leave_code));
    setSelectedLeaveCodes((prev) => prev.filter((c) => validCodes.has(c)));
  }, [filteredLeaveTypesForDropdown]);

  const selectedLeaveTypeObjects = useMemo(
    () => leaveTypes.filter((lt) => selectedLeaveCodes.includes(lt.leave_code)),
    [leaveTypes, selectedLeaveCodes],
  );

  const pendingByEmployee = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      if (a.period_year?.toString() === targetYear.toString()) return;
      if (toNum(a.remaining_hours) <= 0) return;
      if (toNum(commutationMap[`${a.employeeNumber}_${a.leave_code}`]) > 0) return;
      const empNum = a.employeeNumber?.toString();
      if (!map[empNum]) {
        const info = employees.find((e) => e.employeeNumber?.toString() === empNum);
        map[empNum] = { employeeNumber: empNum, fullName: a.fullName || info?.fullName || empNum, leaveCodes: [], totalRemainingHours: 0 };
      }
      if (!map[empNum].leaveCodes.includes(a.leave_code)) map[empNum].leaveCodes.push(a.leave_code);
      map[empNum].totalRemainingHours += toNum(a.remaining_hours);
    });
    return Object.values(map);
  }, [assignments, commutationMap, targetYear, employees]);

  const pendingEmpNums = useMemo(() => new Set(pendingByEmployee.map((e) => e.employeeNumber)), [pendingByEmployee]);

  const allEmployeesAnnotated = useMemo(() => {
    return employeesWithAssignments.map((emp) => {
      const hasPending = pendingEmpNums.has(emp.employeeNumber);
      const pendingInfo = hasPending ? pendingByEmployee.find((p) => p.employeeNumber === emp.employeeNumber) : null;
      const alreadyDoneCount = selectedLeaveTypeObjects.filter((lt) =>
        isLeaveAllowedForGender(lt, emp.sex) &&
        assignments.some((a) =>
          a.employeeNumber?.toString() === emp.employeeNumber &&
          a.leave_code === lt.leave_code &&
          a.period_year?.toString() === targetYear.toString()
        )
      ).length;
      const eligibleCount = selectedLeaveTypeObjects.filter((lt) => isLeaveAllowedForGender(lt, emp.sex)).length;
      return { ...emp, hasPending, pendingInfo, alreadyDoneCount, eligibleCount };
    });
  }, [employeesWithAssignments, pendingEmpNums, pendingByEmployee, selectedLeaveTypeObjects, assignments, targetYear]);

  const filteredEmployees = useMemo(() => {
    let list = allEmployeesAnnotated;
    if (filterDept !== "all") list = list.filter((e) => (e.deptCode || "") === filterDept);
    if (empSearch.trim()) {
      const s = empSearch.toLowerCase();
      list = list.filter((e) => e.fullName.toLowerCase().includes(s) || e.employeeNumber.includes(s));
    }
    if (empFilterStatus === "pending") list = list.filter((e) => e.hasPending);
    if (empFilterStatus === "ready")   list = list.filter((e) => !e.hasPending);
    return list;
  }, [allEmployeesAnnotated, empSearch, empFilterStatus, filterDept]);

  const preview = useMemo(() => {
    if (!selectedLeaveCodes.length) return { toCreate: 0, skipped: 0 };
    let toCreate = 0, toSkip = 0;
    selectedLeaveTypeObjects.forEach((lt) => {
      employeesWithAssignments
        .filter((emp) => isLeaveAllowedForGender(lt, emp.sex))
        .forEach((emp) => {
          const exists = assignments.some(
            (a) => a.employeeNumber?.toString() === emp.employeeNumber &&
                   a.leave_code === lt.leave_code &&
                   a.period_year?.toString() === targetYear.toString()
          );
          if (exists) toSkip++; else toCreate++;
        });
    });
    return { toCreate, skipped: toSkip };
  }, [selectedLeaveTypeObjects, employeesWithAssignments, assignments, targetYear, selectedLeaveCodes]);

  const allVisibleSelected = searchedLeaveTypes.length > 0 &&
    searchedLeaveTypes.every((lt) => selectedLeaveCodes.includes(lt.leave_code));

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      const visibleCodes = new Set(searchedLeaveTypes.map((lt) => lt.leave_code));
      setSelectedLeaveCodes((prev) => prev.filter((c) => !visibleCodes.has(c)));
    } else {
      const toAdd = searchedLeaveTypes.map((lt) => lt.leave_code);
      setSelectedLeaveCodes((prev) => [...new Set([...prev, ...toAdd])]);
    }
  };

  const handleToggleOne = (code) => {
    setSelectedLeaveCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleRun = async () => {
    if (!selectedLeaveCodes.length || pendingByEmployee.length > 0) return;
    setRunning(true); setProgress(0); setResults(null);
    let created = 0, skipped = 0, errors = 0;
    const total = preview.toCreate;
    for (const lt of selectedLeaveTypeObjects) {
      const eligible = employeesWithAssignments.filter((emp) => isLeaveAllowedForGender(lt, emp.sex));
      for (const emp of eligible) {
        const exists = assignments.some(
          (a) => a.employeeNumber?.toString() === emp.employeeNumber &&
                 a.leave_code === lt.leave_code &&
                 a.period_year?.toString() === targetYear.toString()
        );
        if (exists) { skipped++; continue; }
        setProgressMsg(`${lt.leave_code} → ${emp.fullName}`);
        try {
          const key = `${emp.employeeNumber}_${lt.leave_code}`;
          const commutedHrs = toNum(commutationMap[key]) * 8;
          const prevRem = commutedHrs > 0
            ? commutedHrs
            : assignments.filter((a) => a.employeeNumber?.toString() === emp.employeeNumber && a.leave_code === lt.leave_code).reduce((s, a) => s + toNum(a.remaining_hours), 0);
          await axios.post(
            `${API_BASE_URL}/leaveRoute/leave_assignment`,
            { leave_code: lt.leave_code, employeeNumber: emp.employeeNumber, total_hours: 0, carried_forward_hours: prevRem, allocated_hours: 0, period_year: parseInt(targetYear, 10), period_semester: null },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
          created++;
        } catch { errors++; }
        setProgress(total > 0 ? Math.round(((created + errors) / total) * 100) : 100);
      }
    }
    setRunning(false); setProgress(100); setProgressMsg("");
    setResults({ created, skipped, errors });
    onSuccess?.();
  };

  const handleClose = () => {
    if (running) return;
    setResults(null); setProgress(0); setProgressMsg("");
    setSelectedLeaveCodes([]); setFilterGender("all"); setFilterDept("all");
    setEmpSearch(""); setLtSearch(""); setEmpFilterStatus("all");
    onClose();
  };

  const blocked = pendingByEmployee.length > 0;
  const canRun  = !running && selectedLeaveCodes.length > 0 && preview.toCreate > 0 && !blocked;

  if (results) return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: "12px", fontFamily: T.poppins, overflow: "hidden" } }}>
      <Box sx={{ px: 4, pt: 4.5, pb: 3.5, textAlign: "center" }}>
        <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: results.errors > 0 ? "rgba(237,108,2,0.1)" : "rgba(46,125,50,0.1)", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
          {results.errors > 0 ? <WarningIcon sx={{ fontSize: 24, color: "#ed6c02" }} /> : <CheckIcon sx={{ fontSize: 24, color: "#2e7d32" }} />}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#1a1a1a", mb: 0.5, fontFamily: T.poppins }}>
          {results.errors > 0 ? "Completed with errors" : "Assignments created"}
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontFamily: T.poppins }}>
          Period: <strong>{targetYear}</strong>
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", gap: 4, mt: 3.5, pt: 3, borderTop: `1px solid ${T.divider}` }}>
          {[["Created", results.created, "#2e7d32"], ["Skipped", results.skipped, T.muted], ["Errors", results.errors, "#d32f2f"]].map(([label, val, color]) => (
            <Box key={label} sx={{ textAlign: "center" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", color, lineHeight: 1, fontFamily: T.poppins }}>{val}</Typography>
              <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontWeight: 600, mt: 0.5, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${T.divider}`, display: "flex", justifyContent: "flex-end" }}>
        <AccentButton onClick={handleClose} variant="contained" sx={{ bgcolor: T.accent, color: "#fff", fontFamily: T.poppins, fontSize: "0.82rem", "&:hover": { bgcolor: T.accentDark } }}>Done</AccentButton>
      </Box>
    </Dialog>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: "14px", fontFamily: T.poppins,
          boxShadow: "0 24px 72px rgba(0,0,0,0.22)",
          width: "min(1320px, 96vw)",
          maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }
      }}>
      <Box sx={{ px: 3.5, py: 2, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AutoAssignIcon sx={{ fontSize: 16, color: "#fff" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.92rem", fontFamily: T.poppins, lineHeight: 1.2 }}>Reset to Default</Typography>
            <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontFamily: T.poppins }}>
              Create new-period assignments for all employees with existing records
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} disabled={running} size="small" sx={{ color: "rgba(255,255,255,0.65)", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}>
          <Close sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* Column 1: Configuration */}
        <Box sx={{ width: 240, flexShrink: 0, borderRight: `1px solid ${T.divider}`, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#fafafa" }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: "#f3f3f3" }}>
            <Typography sx={{ fontSize: "0.63rem", fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.poppins }}>Configuration</Typography>
          </Box>
          <Box sx={{ px: 2, py: 2, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
            <Box>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.text, mb: 0.5, fontFamily: T.poppins }}>Period Year <span style={{ color: "#c62828" }}>*</span></Typography>
              <FormControl fullWidth size="small">
                <Select value={targetYear} onChange={(e) => !running && setTargetYear(e.target.value)} disabled={running}
                  sx={{ ...selectSx, "& .MuiSelect-select": { py: "8px", fontWeight: 700, fontFamily: T.poppins, fontSize: "0.82rem" } }}>
                  {yearOptions.map((y) => (
                    <MenuItem key={y.value} value={y.value} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>{y.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {allDeptCodes.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.text, mb: 0.5, fontFamily: T.poppins }}>Department</Typography>
                <FormControl fullWidth size="small">
                  <Select value={filterDept} onChange={(e) => !running && setFilterDept(e.target.value)} disabled={running}
                    sx={{ ...selectSx, "& .MuiSelect-select": { py: "8px", fontFamily: T.poppins, fontSize: "0.82rem" } }}>
                    <MenuItem value="all" sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>All departments</MenuItem>
                    {allDeptCodes.map((c) => (
                      <MenuItem key={c} value={c} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><DomainIcon sx={{ fontSize: 13, color: T.accent }} />{c}</Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            <Box>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.text, mb: 0.5, fontFamily: T.poppins }}>Gender Filter</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {[
                  { val: "all",    label: "All genders",  icon: <GenderIcon sx={{ fontSize: 13 }} /> },
                  { val: "male",   label: "Male only",    icon: <MaleIcon   sx={{ fontSize: 13, color: filterGender === "male"   ? "#fff" : "#1565C0" }} /> },
                  { val: "female", label: "Female only",  icon: <FemaleIcon sx={{ fontSize: 13, color: filterGender === "female" ? "#fff" : "#c2185b" }} /> },
                ].map(({ val, label, icon }) => (
                  <Box key={val} onClick={() => !running && setFilterGender(val)}
                    sx={{
                      display: "flex", alignItems: "center", gap: 0.75,
                      px: 1.25, py: 0.75, borderRadius: "7px", cursor: running ? "default" : "pointer",
                      fontSize: "0.78rem", fontWeight: filterGender === val ? 700 : 500,
                      fontFamily: T.poppins, transition: "all 0.12s",
                      bgcolor: filterGender === val ? (val === "male" ? "#1565C0" : val === "female" ? "#c2185b" : T.accent) : "#fff",
                      color: filterGender === val ? "#fff" : T.text,
                      border: `1px solid ${filterGender === val ? (val === "male" ? "#1565C0" : val === "female" ? "#c2185b" : T.accent) : T.divider}`,
                      "&:hover": filterGender !== val && !running ? { bgcolor: "rgba(0,0,0,0.04)" } : {},
                    }}>
                    {icon}
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: "inherit", fontFamily: T.poppins, color: "inherit" }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Divider sx={{ borderColor: T.divider }} />
            <Box>
              <Typography sx={{ fontSize: "0.63rem", fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.poppins, mb: 1 }}>Summary</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
                {[
                  { label: "Employees",  val: filteredEmployees.length,  color: T.accent },
                  { label: "Types Sel.", val: selectedLeaveCodes.length,  color: "#1976d2" },
                  { label: "To Create",  val: preview.toCreate,          color: "#2e7d32" },
                  { label: "Exist",      val: preview.skipped,           color: T.muted },
                ].map(({ label, val, color }) => (
                  <Box key={label} sx={{ textAlign: "center", py: 1, px: 0.5, borderRadius: "7px", bgcolor: "#fff", border: `1px solid ${T.divider}` }}>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color, lineHeight: 1, fontFamily: T.poppins }}>{val}</Typography>
                    <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins, mt: 0.25, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            {pendingByEmployee.length > 0 ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, py: 1, borderRadius: "7px", bgcolor: "rgba(230,81,0,0.07)", border: "1px solid rgba(230,81,0,0.2)" }}>
                <WarningIcon sx={{ fontSize: 14, color: "#e65100", flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#bf360c", fontFamily: T.poppins }}>{pendingByEmployee.length} pending balance{pendingByEmployee.length !== 1 ? "s" : ""}</Typography>
                  <Typography sx={{ fontSize: "0.62rem", color: "#e65100", fontFamily: T.poppins }}>Transfer to Commutation first</Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, py: 1, borderRadius: "7px", bgcolor: "rgba(46,125,50,0.07)", border: "1px solid rgba(46,125,50,0.2)" }}>
                <CheckIcon sx={{ fontSize: 14, color: "#2e7d32" }} />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#2e7d32", fontFamily: T.poppins }}>No pending balances</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Column 2: Employees */}
        <Box sx={{ width: 300, flexShrink: 0, borderRight: `1px solid ${T.divider}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: "#f3f3f3" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ fontSize: "0.63rem", fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.poppins }}>
                Employees <span style={{ color: T.muted, fontWeight: 600, textTransform: "none", letterSpacing: 0, marginLeft: 4 }}>({filteredEmployees.length})</span>
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {[{ val: "all", label: "All" }, { val: "pending", label: "⚠ Pending" }, { val: "ready", label: "✓ Ready" }].map(({ val, label }) => (
                  <Box key={val} onClick={() => setEmpFilterStatus(val)}
                    sx={{
                      px: 0.75, py: 0.2, borderRadius: "5px", cursor: "pointer",
                      fontSize: "0.6rem", fontWeight: 700, fontFamily: T.poppins,
                      bgcolor: empFilterStatus === val ? (val === "pending" ? "rgba(230,81,0,0.15)" : val === "ready" ? "rgba(46,125,50,0.12)" : T.accentFaint) : "transparent",
                      color: empFilterStatus === val ? (val === "pending" ? "#bf360c" : val === "ready" ? "#2e7d32" : T.accent) : T.faint,
                      border: `1px solid ${empFilterStatus === val ? (val === "pending" ? "rgba(230,81,0,0.3)" : val === "ready" ? "rgba(46,125,50,0.25)" : T.accentBorder) : "transparent"}`,
                      "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                    }}>{label}</Box>
                ))}
              </Box>
            </Box>
            <FieldInput size="small" placeholder="Search employees…" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} fullWidth
              InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 13, color: T.faint, mr: 0.5 }} /> }} />
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: 3 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
            {filteredEmployees.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center" }}><Typography sx={{ fontSize: "0.78rem", color: T.faint, fontFamily: T.poppins }}>No employees match</Typography></Box>
            ) : filteredEmployees.map((emp) => {
              const initials = emp.fullName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
              return (
                <Box key={emp.employeeNumber} sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2, py: 1.1, borderBottom: `1px solid ${T.divider}`, bgcolor: emp.hasPending ? "rgba(255,243,224,0.5)" : "#fff", "&:hover": { bgcolor: emp.hasPending ? "rgba(255,235,200,0.7)" : T.rowHover } }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: "0.62rem", fontWeight: 800, bgcolor: emp.hasPending ? "rgba(230,81,0,0.12)" : T.accentFaint, color: emp.hasPending ? "#bf360c" : T.accent, borderRadius: "6px", flexShrink: 0 }}>{initials}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: emp.hasPending ? "#bf360c" : T.text, fontFamily: T.poppins }} noWrap>{emp.fullName}</Typography>
                      {emp.sex && <GenderBadge gender={emp.sex} />}
                    </Box>
                    <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>#{emp.employeeNumber}</Typography>
                    {emp.hasPending && emp.pendingInfo && (
                      <Typography sx={{ fontSize: "0.62rem", color: "#e65100", fontFamily: T.poppins, fontWeight: 700 }}>
                        {emp.pendingInfo.totalRemainingHours.toFixed(1)} hrs pending
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ flexShrink: 0 }}>
                    {emp.hasPending ? (
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ed6c02", mx: "auto" }} />
                    ) : selectedLeaveCodes.length > 0 && emp.eligibleCount > 0 ? (
                      <Typography sx={{ fontSize: "0.6rem", color: emp.alreadyDoneCount === emp.eligibleCount ? "#9e9e9e" : "#2e7d32", fontFamily: T.poppins, fontWeight: 700 }}>
                        {emp.alreadyDoneCount === emp.eligibleCount ? "done" : `+${emp.eligibleCount - emp.alreadyDoneCount}`}
                      </Typography>
                    ) : (
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ccc", mx: "auto" }} />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Column 3: Leave Types */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: "#f3f3f3", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ fontSize: "0.63rem", fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.poppins }}>
                Leave Types <span style={{ color: T.muted, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>({selectedLeaveCodes.length} selected)</span>
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Typography onClick={() => !running && handleToggleAll()} sx={{ fontSize: "0.7rem", color: T.accent, fontWeight: 700, cursor: running ? "default" : "pointer", fontFamily: T.poppins, "&:hover": { textDecoration: "underline" } }}>
                  {allVisibleSelected ? "Deselect All" : "Select All"}
                </Typography>
                {selectedLeaveCodes.length > 0 && (
                  <Typography onClick={() => !running && setSelectedLeaveCodes([])} sx={{ fontSize: "0.7rem", color: T.muted, fontWeight: 700, cursor: running ? "default" : "pointer", fontFamily: T.poppins, "&:hover": { textDecoration: "underline" } }}>Clear</Typography>
                )}
              </Box>
            </Box>
            <FieldInput size="small" fullWidth placeholder="Search leave types…" value={ltSearch} onChange={(e) => setLtSearch(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 13, color: T.faint, mr: 0.5 }} /> }} />
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5, display: "flex", flexDirection: "column", gap: 0.5, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
            {searchedLeaveTypes.map((lt) => {
              const isSelected  = selectedLeaveCodes.includes(lt.leave_code);
              const restriction = getLeaveGenderRestriction(lt);
              const ltDesc      = lt.leave_description || lt.leave_name || "";
              const eligibleEmps  = employeesWithAssignments.filter((emp) => isLeaveAllowedForGender(lt, emp.sex));
              const alreadyExists = eligibleEmps.filter((emp) =>
                assignments.some((a) =>
                  a.employeeNumber?.toString() === emp.employeeNumber &&
                  a.leave_code === lt.leave_code &&
                  a.period_year?.toString() === targetYear.toString()
                )
              ).length;
              const toCreateCount = eligibleEmps.length - alreadyExists;
              return (
                <Box key={lt.leave_code} onClick={() => !running && handleToggleOne(lt.leave_code)}
                  sx={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 1.25, alignItems: "center", px: 1.5, py: 1, borderRadius: "8px", cursor: running ? "default" : "pointer", transition: "all 0.1s", border: `1px solid ${isSelected ? alpha(T.accent, 0.3) : T.divider}`, bgcolor: isSelected ? T.accentFaint : "#fafafa", "&:hover": running ? {} : { bgcolor: isSelected ? alpha(T.accent, 0.08) : "rgba(0,0,0,0.03)" } }}>
                  <Box sx={{ width: 16, height: 16, borderRadius: "4px", border: `2px solid ${isSelected ? T.accent : "#ccc"}`, bgcolor: isSelected ? T.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isSelected && <Box sx={{ width: 7, height: 5, borderBottom: "2px solid #fff", borderRight: "2px solid #fff", transform: "rotate(45deg) translateY(-1.5px)" }} />}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                      {restriction === "male"   && <MaleIcon   sx={{ fontSize: 12, color: "#1565C0", flexShrink: 0 }} />}
                      {restriction === "female" && <FemaleIcon sx={{ fontSize: 12, color: "#c2185b", flexShrink: 0 }} />}
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: isSelected ? 700 : 500, color: isSelected ? T.accent : T.text, fontFamily: T.poppins }}>{lt.leave_code}</Typography>
                      {ltDesc && <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>— {ltDesc}</Typography>}
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right", flexShrink: 0, minWidth: 52 }}>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: toCreateCount > 0 ? "#2e7d32" : T.faint, fontFamily: T.poppins }}>
                      {toCreateCount > 0 ? `+${toCreateCount}` : "—"}
                    </Typography>
                    {alreadyExists > 0 && <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}>{alreadyExists} exist</Typography>}
                  </Box>
                </Box>
              );
            })}
          </Box>
          {running && (
            <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${T.divider}`, flexShrink: 0 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>{progressMsg || "Running…"}</Typography>
                <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontWeight: 700, fontFamily: T.poppins }}>{progress}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 2, height: 5, bgcolor: T.accentFaint, "& .MuiLinearProgress-bar": { bgcolor: T.accent, borderRadius: 2 } }} />
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins }}>
          {blocked ? `⚠ Resolve ${pendingByEmployee.length} pending balance${pendingByEmployee.length !== 1 ? "s" : ""} first`
          : !selectedLeaveCodes.length ? "Select at least one leave type to continue"
          : preview.toCreate === 0 ? "All assignments already exist for this period"
          : `Ready to create ${preview.toCreate} assignment${preview.toCreate !== 1 ? "s" : ""} across ${filteredEmployees.length} employees`}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <AccentButton onClick={handleClose} disabled={running} variant="outlined" sx={{ fontSize: "0.82rem", fontFamily: T.poppins, borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
          <Tooltip title={blocked ? "Resolve pending balances first" : !selectedLeaveCodes.length ? "Select at least one leave type" : preview.toCreate === 0 ? "All assignments already exist" : ""} disableHoverListener={canRun}>
            <span>
              <AccentButton onClick={handleRun} disabled={!canRun} variant="contained"
                startIcon={running ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : blocked ? <WarningIcon sx={{ fontSize: "14px !important" }} /> : <RunIcon sx={{ fontSize: "14px !important" }} />}
                sx={{ fontSize: "0.82rem", fontFamily: T.poppins, bgcolor: canRun ? T.accent : undefined, color: "#fff", "&:hover": { bgcolor: canRun ? T.accentDark : undefined }, "&:disabled": { bgcolor: "#e0e0e0 !important", color: "#aaa !important" } }}>
                {running ? `Running… ${progress}%` : blocked ? "Resolve Pending First" : canRun ? `Create ${preview.toCreate} Assignment${preview.toCreate !== 1 ? "s" : ""}` : "Run"}
              </AccentButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Dialog>
  );
};

// ─── BulkLeaveRow ──────────────────────────────────────────────────────────────
const BulkLeaveRow = ({ lt, unit, allocatedHours, onChangeAllocated, carriedHours, isDuplicate }) => {
  const [inputVal, setInputVal] = useState("");
  const isFocused = useRef(false);

  const toDisplayStr = useCallback((hrs) => {
    if (!hrs || hrs === 0) return "";
    if (unit === "hours") return String(hrs);
    const days = hrs / 8;
    return String(parseFloat(days.toFixed(10))).replace(/\.?0+$/, "") || "";
  }, [unit]);

  useEffect(() => {
    if (!isFocused.current) {
      setInputVal(toDisplayStr(allocatedHours));
    }
  }, [allocatedHours, toDisplayStr]);

  useEffect(() => {
    if (!isFocused.current) {
      setInputVal(toDisplayStr(allocatedHours));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  const handleFocus = (e) => {
    isFocused.current = true;
    if (!inputVal || parseFloat(inputVal) === 0) setInputVal("");
    e.target.select();
  };

  const handleChange = (e) => {
    setInputVal(e.target.value);
  };

  const handleBlur = () => {
    isFocused.current = false;
    const num = parseFloat(inputVal);
    if (isNaN(num) || inputVal.trim() === "") {
      onChangeAllocated(0);
      setInputVal("");
    } else {
      const hrs = unit === "hours" ? num : parseFloat((num * 8).toFixed(6));
      onChangeAllocated(hrs);
      setInputVal(toDisplayStr(hrs));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  const numericVal = parseFloat(inputVal) || 0;
  const equivalentAdornment = inputVal === ""
    ? (unit === "hours" ? "hrs" : "days")
    : unit === "hours"
      ? `= ${(numericVal / 8).toFixed(3)} days`
      : `= ${(numericVal * 8).toFixed(3)} hrs`;

  const total    = allocatedHours + carriedHours;
  const restriction = getLeaveGenderRestriction(lt);
  const hasValue = allocatedHours > 0;

  return (
    <Box sx={{
      display: "grid", gridTemplateColumns: "110px 90px 1fr 90px", gap: 1, alignItems: "center",
      px: 1.5, py: 1, borderRadius: 1.5,
      border: isDuplicate ? "1px solid rgba(237,108,2,0.35)" : hasValue ? `1px solid rgba(46,125,50,0.25)` : `1px solid ${T.accentBorder}`,
      bgcolor: isDuplicate ? "rgba(237,108,2,0.04)" : hasValue ? "rgba(46,125,50,0.03)" : T.rowEven,
    }}>
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {restriction === "male"   && <MaleIcon   sx={{ fontSize: 12, color: "#1565C0" }} />}
          {restriction === "female" && <FemaleIcon sx={{ fontSize: 12, color: "#C2185B" }} />}
          <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: isDuplicate ? "#ed6c02" : T.accent, fontFamily: T.poppins }}>{lt.leave_code}</Typography>
        </Box>
        <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, lineHeight: 1.3 }} noWrap>{lt.leave_description || lt.leave_name || ""}</Typography>
        {isDuplicate && <Typography sx={{ fontSize: "0.6rem", color: "#ed6c02", fontWeight: 700, fontFamily: T.poppins }}>already exists</Typography>}
      </Box>
      <Box sx={{ textAlign: "center", px: 1, py: 0.5, borderRadius: 1, bgcolor: carriedHours > 0 ? "rgba(46,125,50,0.08)" : T.accentFaint, border: `1px solid ${carriedHours > 0 ? "rgba(46,125,50,0.2)" : T.accentBorder}` }}>
        <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}>carry-over</Typography>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: carriedHours > 0 ? "#2e7d32" : T.muted, fontFamily: T.poppins }}>
          {unit === "hours" ? `${carriedHours.toFixed(3)}h` : `${(carriedHours / 8).toFixed(3)}d`}
        </Typography>
      </Box>
      <Box>
        <FieldInput
          type="text"
          inputMode="decimal"
          size="small"
          fullWidth
          disabled={isDuplicate}
          value={inputVal}
          placeholder={isDuplicate ? "skip" : unit === "hours" ? "0 hrs" : "0 days"}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          sx={{ "& .MuiInputBase-input": { fontWeight: 700, color: isDuplicate ? T.faint : "#1976d2", fontSize: "0.82rem" } }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontWeight: 700, fontFamily: T.poppins, whiteSpace: "nowrap" }}>
                  {equivalentAdornment}
                </Typography>
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}>total</Typography>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: hasValue ? "#1976d2" : T.faint, fontFamily: T.poppins }}>
          {unit === "hours" ? `${total.toFixed(3)}h` : `${(total / 8).toFixed(3)}d`}
        </Typography>
      </Box>
    </Box>
  );
};

// ─── ResultPill ───────────────────────────────────────────────────────────────
const ResultPill = ({ label, value, primary = false }) => (
  <Box sx={{
    flex: 1, py: 1, px: 0.75, borderRadius: "8px", textAlign: "center",
    bgcolor: primary ? T.accent : T.accentFaint,
    border: `1px solid ${primary ? T.accent : T.accentBorder}`,
  }}>
    <Typography sx={{ fontSize: "0.56rem", fontWeight: 700, color: primary ? "rgba(255,255,255,0.6)" : alpha(T.accent, 0.5), textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.4, fontFamily: T.poppins }}>{label}</Typography>
    <Typography sx={{ fontWeight: 900, fontSize: primary ? "1.05rem" : "0.95rem", color: primary ? "#fff" : T.accent, lineHeight: 1, fontFamily: T.poppins }}>{value}</Typography>
  </Box>
);

const ClearableIntField = ({ value, onChange, placeholder, min = 0, max, label, widgetInputSx, inputLabelSx }) => {
  const [draft, setDraft] = useState(null);
  const displayVal = draft !== null ? draft : (value === 0 ? "" : String(value));
  return (
    <Box>
      {label && <Typography sx={inputLabelSx}>{label}</Typography>}
      <TextField
        size="small" type="text" inputMode="numeric" fullWidth
        placeholder={placeholder ?? String(min)}
        value={displayVal}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const num = parseInt(raw, 10);
          if (!isNaN(num)) {
            let clamped = Math.max(num, min);
            if (max !== undefined) clamped = Math.min(clamped, max);
            onChange(clamped);
          }
        }}
        onFocus={(e) => { setDraft(value === 0 ? "" : String(value)); e.target.select(); }}
        onBlur={() => {
          let num = parseInt(draft ?? "", 10);
          if (isNaN(num)) num = min;
          if (max !== undefined) num = Math.min(num, max);
          num = Math.max(num, min);
          onChange(num);
          setDraft(null);
        }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        sx={widgetInputSx}
      />
    </Box>
  );
};

const ClearableDecimalField = ({ value, onChange, placeholder, min = 0, max, step = 0.5, label, snapToStep = false, widgetInputSx, inputLabelSx }) => {
  const [draft, setDraft] = useState(null);
  const displayVal = draft !== null ? draft : (value === 0 ? "" : String(value));
  return (
    <Box>
      {label && <Typography sx={inputLabelSx}>{label}</Typography>}
      <TextField
        size="small" type="text" inputMode="decimal" fullWidth
        placeholder={placeholder ?? "0"}
        value={displayVal}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const num = parseFloat(raw);
          if (!isNaN(num)) {
            let clamped = Math.max(num, min);
            if (max !== undefined) clamped = Math.min(clamped, max);
            onChange(clamped);
          }
        }}
        onFocus={(e) => { setDraft(value === 0 ? "" : String(value)); e.target.select(); }}
        onBlur={() => {
          let num = parseFloat(draft ?? "") || 0;
          if (snapToStep && step) num = Math.round(num / step) * step;
          if (max !== undefined) num = Math.min(num, max);
          num = Math.max(num, min);
          onChange(num);
          setDraft(null);
        }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        sx={widgetInputSx}
      />
    </Box>
  );
};

// ─── Floating Conversion Widget ───────────────────────────────────────────────
function FloatingConversionWidget({ onNavigateToModule }) {
  const [open, setOpen]           = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const [hours8Table,  setHours8Table]  = useState(DEFAULT_HOURS_8);
  const [hours6Table,  setHours6Table]  = useState(DEFAULT_HOURS_6);
  const [minutesTable, setMinutesTable] = useState(DEFAULT_MINUTES);
  const [lwpTable,     setLwpTable]     = useState(DEFAULT_LWP_TABLE);
  const [absTable,     setAbsTable]     = useState(DEFAULT_ABS_TABLE);
  const [ratesLoaded,  setRatesLoaded]  = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [whRes, lcRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/working-hours/rates`),
          axios.get(`${API_BASE_URL}/api/working-hours/leave-credits/rates`),
        ]);
        if (whRes.status === "fulfilled") {
          const d = whRes.value.data;
          const ensureHours = (rows, dayType, fallback) => {
            const byHour = new Map((rows || []).map((r) => [Number(r.rate_value), r]));
            const baseRate = Number(byHour.get(1)?.decimal_equivalent ?? fallback);
            return Array.from({ length: 8 }, (_, i) => {
              const h = i + 1;
              const found = byHour.get(h);
              return found
                ? { ...found, rate_type: "hour", day_type: dayType, rate_value: h, decimal_equivalent: sanitizeDecimal(found.decimal_equivalent) }
                : { rate_type: "hour", day_type: dayType, rate_value: h, decimal_equivalent: sanitizeDecimal(h * baseRate) };
            });
          };
          if (Array.isArray(d.hours8)  && d.hours8.length  > 0)   setHours8Table(ensureHours(d.hours8,  "8hr", 0.125));
          if (Array.isArray(d.hours6)  && d.hours6.length  > 0)   setHours6Table(ensureHours(d.hours6,  "6hr", 0.167));
          if (Array.isArray(d.minutes) && d.minutes.length === 60) setMinutesTable(d.minutes);
        }
        if (lcRes.status === "fulfilled") {
          const d = lcRes.value.data;
          if (Array.isArray(d.lwp) && d.lwp.length === 30) setLwpTable(d.lwp);
          if (Array.isArray(d.abs) && d.abs.length  >= 1)  setAbsTable(d.abs);
        }
      } catch { /* keep defaults silently */ }
      setRatesLoaded(true);
    })();
  }, []);

  const [whDayType, setWhDayType] = useState("8hr");
  const [whHours,   setWhHours]   = useState(0);
  const [whMinutes, setWhMinutes] = useState(0);
  const [lcDays,    setLcDays]    = useState(1);
  const [lcAbs,     setLcAbs]     = useState(0);

  const inputLabelSx = useMemo(() => ({
    fontSize: "0.62rem", fontWeight: 700, color: alpha(T.accent, 0.45),
    textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.5, fontFamily: T.poppins,
  }), []);

  const widgetInputSx = useMemo(() => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: "7px", height: 34, fontSize: "0.82rem", bgcolor: "#fff",
      "& fieldset": { borderColor: T.accentBorder },
      "&:hover fieldset": { borderColor: T.accent },
      "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
    },
    "& .MuiInputBase-input": { fontWeight: 700, color: T.text, p: "6px 10px", fontFamily: T.poppins },
  }), []);

  const activeHoursTable = whDayType === "6hr" ? hours6Table : hours8Table;

  const whResult = useMemo(() => {
    const defaultHourlyRate = whDayType === "6hr" ? 0.167 : 0.125;
    const hourlyRate = Number(
      activeHoursTable.find((h) => h.rate_value === 1)?.decimal_equivalent ?? defaultHourlyRate,
    );
    const hEntry = activeHoursTable.find((h) => h.rate_value === whHours);
    const mEntry = minutesTable.find((m) => m.rate_value === whMinutes);
    const hDec   = whHours   === 0 ? 0 : Number((hEntry?.decimal_equivalent ?? whHours * hourlyRate).toFixed(3));
    const mDec   = whMinutes === 0 ? 0 : (mEntry?.decimal_equivalent ?? 0);
    return { hDec, mDec, total: Number((hDec + mDec).toFixed(3)) };
  }, [whHours, whMinutes, whDayType, activeHoursTable, minutesTable]);

  const lcResult = useMemo(() => {
    const daysEntry = lwpTable.find((r) => r.d === lcDays);
    const earned    = daysEntry ? daysEntry.e : parseFloat((lcDays * 0.04167).toFixed(3));
    const absEntry  = lcAbs > 0 ? absTable.find((r) => Math.abs(r.a - lcAbs) < 0.001) : null;
    const absEarned = absEntry ? absEntry.e : earned;
    return { earned, absEarned };
  }, [lcDays, lcAbs, lwpTable, absTable]);

  return (
    <>
      <Tooltip title="Quick Conversion Tool" placement="left">
        <Box
          onClick={() => setOpen((v) => !v)}
          sx={{
            position: "fixed", bottom: 128, right: 32, zIndex: 1200,
            width: 48, height: 48, borderRadius: "50%",
            bgcolor: open ? T.accentDark : T.accent, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            boxShadow: `0 4px 16px ${alpha(T.accent, 0.45)}`,
            transition: "all 0.2s ease",
            "&:hover": { bgcolor: T.accentDark, transform: "scale(1.08)" },
          }}
        >
          {open ? <Close sx={{ fontSize: 20 }} /> : <CalculateIcon sx={{ fontSize: 22 }} />}
        </Box>
      </Tooltip>

      <Collapse in={open} timeout={200}>
        <Paper elevation={0} sx={{
          position: "fixed", bottom: 186, right: 32, zIndex: 1199, width: 310,
          borderRadius: "12px", border: `1px solid ${T.accentBorder}`,
          boxShadow: `0 8px 32px ${alpha(T.accent, 0.18)}, 0 2px 8px rgba(0,0,0,0.08)`,
          overflow: "hidden", fontFamily: T.poppins,
        }}>
          <Box sx={{ px: 2, py: 1.25, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ConvertIcon sx={{ fontSize: 15, color: "rgba(255,255,255,0.85)" }} />
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff", fontFamily: T.poppins }}>Quick Converter</Typography>
              {!ratesLoaded && <CircularProgress size={10} sx={{ color: "rgba(255,255,255,0.6)" }} />}
            </Box>
            <Button
              onClick={onNavigateToModule} size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: "12px !important" }} />}
              sx={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "none", fontFamily: T.poppins, px: 1, py: 0.25, borderRadius: "5px", minWidth: 0, border: "1px solid rgba(255,255,255,0.25)", "&:hover": { bgcolor: "rgba(255,255,255,0.12)", color: "#fff" } }}
            >
              View Tables
            </Button>
          </Box>

          <Box sx={{ borderBottom: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth"
              sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, fontSize: "0.7rem", fontWeight: 700, textTransform: "none", fontFamily: T.poppins, color: T.muted, py: 0, "&.Mui-selected": { color: T.accent } }, "& .MuiTabs-indicator": { bgcolor: T.accent, height: 2 } }}>
              <Tab label="Working Hours" />
              <Tab label="Leave Credits" />
            </Tabs>
          </Box>

          <Box sx={{ display: activeTab === 0 ? "flex" : "none", p: 1.75, flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography sx={inputLabelSx}>Day type</Typography>
              <ToggleButtonGroup value={whDayType} exclusive onChange={(_, v) => v && setWhDayType(v)} size="small"
                sx={{ "& .MuiToggleButton-root": { px: 1.25, py: 0.2, border: `1px solid ${T.accentBorder}`, fontSize: "0.68rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins, minHeight: 26, "&.Mui-selected": { bgcolor: T.accent, color: "#fff", borderColor: T.accent } } }}>
                <ToggleButton value="8hr">8-hr</ToggleButton>
                <ToggleButton value="6hr">6-hr</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <ClearableIntField label="Hours" value={whHours} onChange={setWhHours} placeholder="0" min={0} widgetInputSx={widgetInputSx} inputLabelSx={inputLabelSx} />
              <ClearableIntField label="Minutes (0–59)" value={whMinutes} onChange={setWhMinutes} placeholder="0" min={0} max={59} widgetInputSx={widgetInputSx} inputLabelSx={inputLabelSx} />
            </Box>
            <Box sx={{ display: "flex", gap: 0.75 }}>
              <ResultPill label="Hours" value={Number(whResult.hDec).toFixed(3)} />
              <ResultPill label="Total" value={whResult.total.toFixed(3)} primary />
              <ResultPill label="Mins." value={Number(whResult.mDec).toFixed(3)} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, p: "6px 10px", borderRadius: "7px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
              <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontWeight: 600, fontFamily: T.poppins }}>Equivalent:</Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>{whHours}h {whMinutes}m = {whResult.total.toFixed(3)}</Typography>
              <Chip label={whDayType} size="small" sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: T.accent, color: "#fff", fontFamily: T.poppins }} />
            </Box>
          </Box>

          <Box sx={{ display: activeTab === 1 ? "flex" : "none", p: 1.75, flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <ClearableIntField label="LWP Days (1–30)" value={lcDays} onChange={(v) => setLcDays(Math.min(30, Math.max(1, v || 1)))} placeholder="1" min={1} max={30} widgetInputSx={widgetInputSx} inputLabelSx={inputLabelSx} />
              <ClearableDecimalField label="Abs w/o Pay (0–29.5)" value={lcAbs} onChange={setLcAbs} placeholder="0" min={0} max={29.5} step={0.5} snapToStep widgetInputSx={widgetInputSx} inputLabelSx={inputLabelSx} />
            </Box>
            <Box sx={{ display: "flex", gap: 0.75 }}>
              <ResultPill label="LWP Earned" value={lcResult.earned.toFixed(3)} primary />
              <ResultPill label="Abs w/o Pay Earned" value={lcResult.absEarned.toFixed(3)} />
            </Box>
            <Box sx={{ p: "6px 10px", borderRadius: "7px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
              <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontWeight: 600, fontFamily: T.poppins, textAlign: "center" }}>
                Earned at <strong style={{ color: T.accent }}>1.250/mo</strong> · Absents w/o pay reduce credits
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.62rem", color: T.faint, textAlign: "center", fontFamily: T.poppins }}>
              For the full absence deduction table, click <strong style={{ color: T.accent }}>View Tables</strong> above.
            </Typography>
          </Box>
        </Paper>
      </Collapse>
    </>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
const LeaveAssignment = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess("leave-assignment");

  const [assignments,       setAssignments]       = useState([]);
  const [leaveTypes,        setLeaveTypes]        = useState([]);
  const [employees,         setEmployees]         = useState([]);
  const [selectedEmployee,  setSelectedEmployee]  = useState(null);
  const [unit,              setUnit]              = useState("days");

  const [deptMap,    setDeptMap]    = useState({});
  const [deptFilter, setDeptFilter] = useState("all");
  const [empCatMap,  setEmpCatMap]  = useState({});

  const [bulkCredits,    setBulkCredits]    = useState({});
  const [periodYear,     setPeriodYear]     = useState(new Date().getFullYear().toString());
  const [periodMonth,    setPeriodMonth]    = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResults,    setBulkResults]    = useState(null);

  const [editAssignment,      setEditAssignment]      = useState(null);
  const [originalAssignment,  setOriginalAssignment]  = useState(null);
  const [isEditing,           setIsEditing]           = useState(false);
  const [editCarriedHours,    setEditCarriedHours]    = useState(0);
  const [editAllocatedHours,  setEditAllocatedHours]  = useState(0);

  const [searchTerm,    setSearchTerm]    = useState("");
  const [loading,       setLoading]       = useState(false);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [successOpen,   setSuccessOpen]   = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [error,         setError]         = useState("");
  const [employeeAssignments, setEmployeeAssignments] = useState([]);

  const [employeeLeavesModalOpen,    setEmployeeLeavesModalOpen]    = useState(false);
  const [selectedEmployeeLeaves,     setSelectedEmployeeLeaves]     = useState(null);
  const [selectedLeaveTypeInModal,   setSelectedLeaveTypeInModal]   = useState(null);

  const [commuteDialogOpen, setCommuteDialogOpen] = useState(false);
  const [commutePeriod,     setCommutePeriod]     = useState(null);
  const [commuteLoading,    setCommuteLoading]    = useState(false);
  const [commuteSuccess,    setCommuteSuccess]    = useState("");
  const [commutationMap,    setCommutationMap]    = useState({});

  const [recordsPage,         setRecordsPage]         = useState(0);
  const [recordsRowsPerPage,  setRecordsRowsPerPage]  = useState(24);
  const [bulkAssignOpen,      setBulkAssignOpen]      = useState(false);
  const [viewMode,            setViewMode]            = useState("grid");

  const handleNavigateToConversionModule = useCallback(() => {
    window.location.href = "/working-hours";
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchAssignments(), fetchLeaveTypes(), fetchEmployees(),
        fetchAllCommutations(), fetchDeptMap(), fetchEmpCatMap(),
      ]);
      setPageLoading(false);
    };
    init();
  }, []);

  useEffect(() => { setRecordsPage(0); }, [searchTerm, deptFilter]);

  const fetchDeptMap = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/department-assignment`, { headers: { Authorization: `Bearer ${token}` } });
      const map = {};
      (Array.isArray(r.data) ? r.data : []).forEach((item) => {
        if (item.employeeNumber && item.code) map[item.employeeNumber.toString()] = item.code;
      });
      setDeptMap(map);
    } catch { /* non-fatal */ }
  };

  const fetchEmpCatMap = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, { headers: { Authorization: `Bearer ${token}` } });
      const map = {};
      (Array.isArray(r.data) ? r.data : []).forEach((item) => {
        if (!item.employeeNumber) return;
        const label = item.parentGroup && item.typeName ? `${item.parentGroup} | ${item.typeName}` : item.categoryLabel || "";
        if (label) map[item.employeeNumber.toString()] = { label, colorHex: item.colorHex || "#757575" };
      });
      setEmpCatMap(map);
    } catch { /* non-fatal */ }
  };

  const allDeptCodes = useMemo(() => {
    const codes = [...new Set(Object.values(deptMap).filter(Boolean))].sort();
    return codes;
  }, [deptMap]);

  const buildDisplayName = useCallback((e) => {
    const last = (e?.lastName       || "").trim();
    const first = (e?.firstName      || "").trim();
    const mid   = (e?.middleName     || "").trim();
    const ext   = (e?.nameExtension  || e?.suffix || "").trim();
    if (!last && !first) return (e?.fullName || "").trim() || `#${e?.employeeNumber}`;
    const givenParts = [first, mid].filter(Boolean).join(" ");
    const extSuffix  = ext ? ` ${ext}` : "";
    return last ? `${last.toUpperCase()}, ${givenParts}${extSuffix}` : `${givenParts}${extSuffix}`;
  }, []);

  const employeeOptions = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    const withMeta = list.map((e) => {
      const displayName = buildDisplayName(e);
      const empNo       = (e?.employeeNumber || "").toString().trim();
      const sortLast    = (e?.lastName || "").trim().toLowerCase();
      return { ...e, _displayName: displayName, _searchKey: `${displayName} ${empNo}`.toLowerCase(), _sortLast: sortLast };
    });
    return withMeta.sort((a, b) => a._sortLast.localeCompare(b._sortLast));
  }, [employees, buildDisplayName]);

  const selectedEmployeeGender = useMemo(() => selectedEmployee?.sex || selectedEmployee?.gender || null, [selectedEmployee]);
  const filteredLeaveTypesForNew = useMemo(
    () => leaveTypes.filter((lt) => isLeaveAllowedForGender(lt, selectedEmployeeGender)),
    [leaveTypes, selectedEmployeeGender],
  );

  const carryOverMap = useMemo(() => {
    if (!selectedEmployee?.employeeNumber) return {};
    const empNum = selectedEmployee.employeeNumber.toString();
    const map = {};
    filteredLeaveTypesForNew.forEach((lt) => {
      const key     = `${empNum}_${lt.leave_code}`;
      const commHrs = toNum(commutationMap[key]) * 8;
      if (commHrs > 0) map[lt.leave_code] = commHrs;
      else {
        const rows = assignments.filter((a) => a.employeeNumber?.toString() === empNum && a.leave_code === lt.leave_code);
        map[lt.leave_code] = rows.reduce((s, r) => s + toNum(r.remaining_hours), 0);
      }
    });
    return map;
  }, [selectedEmployee, filteredLeaveTypesForNew, assignments, commutationMap]);

  const duplicateSet = useMemo(() => {
    if (!selectedEmployee?.employeeNumber) return new Set();
    const empNum = selectedEmployee.employeeNumber.toString();
    return new Set(
      assignments.filter((a) => {
        if (a.employeeNumber?.toString() !== empNum) return false;
        if (a.period_year?.toString() !== periodYear) return false;
        if (periodMonth) return a.period_month?.toString() === periodMonth || a.period_semester?.toString() === periodMonth;
        return true;
      }).map((a) => a.leave_code),
    );
  }, [selectedEmployee, assignments, periodYear, periodMonth]);

  useEffect(() => {
    if (!selectedEmployee?.employeeNumber) { setEmployeeAssignments([]); return; }
    setEmployeeAssignments(assignments.filter((a) => a.employeeNumber?.toString() === selectedEmployee.employeeNumber?.toString()));
  }, [selectedEmployee, assignments]);

  useEffect(() => {
    setBulkCredits({}); setBulkResults(null); setError("");
  }, [selectedEmployee, periodYear, periodMonth]);

  const fetchAssignments = async () => {
    try { const r = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`); setAssignments(Array.isArray(r.data) ? r.data : []); setError(""); }
    catch { setAssignments([]); setError("Failed to fetch assignments"); }
  };
  const fetchLeaveTypes = async () => {
    try { const r = await axios.get(`${API_BASE_URL}/leaveRoute/leave_table`); setLeaveTypes(Array.isArray(r.data) ? r.data : []); }
    catch { setLeaveTypes([]); }
  };
  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { setEmployees([]); return; }
      const [usersRes, personalRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/personalinfo/person_table`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      let usersData = [];
      if (usersRes.status === "fulfilled") {
        const d = usersRes.value.data;
        if (Array.isArray(d)) usersData = d;
        else if (d?.users) usersData = d.users;
        else if (d?.data)  usersData = d.data;
      }
      const sexMap = {};
      if (personalRes.status === "fulfilled") {
        const pd = personalRes.value.data;
        const list = Array.isArray(pd) ? pd : pd?.data || pd?.personalInfo || [];
        list.forEach((p) => { const num = p.agencyEmployeeNum?.toString() || p.employeeNumber?.toString(); const sex = p.sex || p.gender; if (num && sex) sexMap[num] = sex; });
      }
      setEmployees(usersData.map((u) => { const num = u.employeeNumber?.toString(); return { ...u, sex: (num ? sexMap[num] : null) || u.sex || u.gender || null }; }));
    } catch { setEmployees([]); }
  };
  const fetchAllCommutations = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/commutationRoute/leave_commutation`);
      const records = Array.isArray(r.data) ? r.data : [];
      const map = {};
      records.filter((r) => r.status === 0 || r.status === 1).forEach((r) => { const key = `${r.employeeNumber}_${r.leave_code}`; map[key] = (map[key] || 0) + toNum(r.commuted_days); });
      setCommutationMap(map);
    } catch { /* non-fatal */ }
  };

  const isDuplicateAssignment = (empNum, leaveCode, year, excludeId = null, month = null) => {
    if (!empNum || !leaveCode) return false;
    const py = (year !== undefined && year !== null) ? year.toString() : new Date().getFullYear().toString();
    return assignments.some((a) => {
      if (excludeId && String(a.id) === String(excludeId)) return false;
      if (a.employeeNumber?.toString() !== empNum.toString()) return false;
      if (a.leave_code !== leaveCode) return false;
      if (a.period_year?.toString() !== py) return false;
      if (month) return a.period_month?.toString() === month || a.period_semester?.toString() === month;
      return true;
    });
  };

  const handleBulkAdd = async () => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    if (!empNum) { setError("Please select an employee first"); return; }
    const toSubmit = filteredLeaveTypesForNew.filter((lt) => {
      if (duplicateSet.has(lt.leave_code)) return false;
      return toNum(bulkCredits[lt.leave_code]) > 0;
    });
    if (!toSubmit.length) { setError("Enter credits for at least one leave type (must be > 0)"); return; }
    setBulkSubmitting(true); setError("");
    let created = 0, errors = 0;
    const token = localStorage.getItem("token");
    for (const lt of toSubmit) {
      const allocHrs = toNum(bulkCredits[lt.leave_code]);
      const carryHrs = toNum(carryOverMap[lt.leave_code]);
      try {
        await axios.post(
          `${API_BASE_URL}/leaveRoute/leave_assignment`,
          { leave_code: lt.leave_code, employeeNumber: empNum, total_hours: allocHrs, carried_forward_hours: carryHrs, allocated_hours: allocHrs, period_year: parseInt(periodYear, 10) || new Date().getFullYear(), period_semester: periodMonth || null, period_month: periodMonth || null },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        created++;
      } catch { errors++; }
    }
    await fetchAssignments(); await fetchAllCommutations();
    setBulkCredits({}); setBulkSubmitting(false);
    setBulkResults({ created, errors, skipped: filteredLeaveTypesForNew.length - toSubmit.length });
    if (errors === 0) { setSuccessAction("adding"); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000); }
  };

  const handleUpdate = async () => {
    const id      = editAssignment?.id;
    const empNum  = editAssignment?.employeeNumber?.toString().trim();
    const lc      = editAssignment?.leave_code;
    const usedHrs = toNum(editAssignment.used_hours);
    const remHrs  = Math.max(0, editAllocatedHours - usedHrs);
    if (!id || !empNum || !lc) { setError("Please fill in all required fields"); return; }
    if (isDuplicateAssignment(empNum, lc, editAssignment.period_year, editAssignment.id)) { setError("This employee already has an assignment for this leave type and period"); return; }
    try {
      await axios.put(
        `${API_BASE_URL}/leaveRoute/leave_assignment/${id}`,
        { leave_code: lc, employeeNumber: empNum, total_hours: editAllocatedHours, remaining_hours: remHrs, carried_forward_hours: editCarriedHours, allocated_hours: editAllocatedHours, period_year: parseInt(editAssignment.period_year, 10) || new Date().getFullYear(), period_semester: null },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError("");
      await fetchAssignments();
      if (selectedEmployeeLeaves) {
        const updated = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`);
        const all = Array.isArray(updated.data) ? updated.data : [];
        const empData = all.filter((a) => a.employeeNumber?.toString() === selectedEmployeeLeaves.employeeNumber?.toString());
        const grouped = empData.reduce((acc, a) => { if (!acc[a.leave_code]) acc[a.leave_code] = { leave_code: a.leave_code, periods: [] }; acc[a.leave_code].periods.push(a); return acc; }, {});
        setSelectedEmployeeLeaves((p) => ({ ...p, leaveTypes: Object.values(grouped) }));
        if (selectedLeaveTypeInModal) { const r = grouped[selectedLeaveTypeInModal.leave_code]; if (r) setSelectedLeaveTypeInModal(r); }
      }
      setSuccessAction("edit"); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 500);
    } catch (err) { setError("Error updating: " + (err.response?.data?.error || err.message)); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/leaveRoute/leave_assignment/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError("");
      setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null);
      await fetchAssignments();
      setSuccessAction("delete"); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 1000);
    } catch (err) { setError("Error deleting: " + (err.response?.data?.error || err.message)); }
  };

  const handleOpenModal = (assignment) => {
    setEditAssignment({ ...assignment }); setOriginalAssignment({ ...assignment });
    setEditCarriedHours(toNum(assignment.carried_forward_hours));
    setEditAllocatedHours(toNum(assignment.allocated_hours));
    setIsEditing(false); setError("");
  };
  const handleCancelEdit = () => {
    setEditAssignment({ ...originalAssignment });
    setEditCarriedHours(toNum(originalAssignment.carried_forward_hours));
    setEditAllocatedHours(toNum(originalAssignment.allocated_hours));
    setIsEditing(false); setError("");
  };
  const handleCloseModal = () => {
    setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError("");
    setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null);
  };

  const handleCommute = async () => {
    if (!commutePeriod) return;
    setCommuteLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/commutationRoute/leave_commutation/commute/${commutePeriod.id}`,
        { commuted_by: token ? "admin" : null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommuteDialogOpen(false); setCommuteLoading(false);
      setCommuteSuccess(`Successfully transferred ${(toNum(commutePeriod.remaining_hours)).toFixed(3)} hrs to Commutation.`);
      await fetchAssignments(); await fetchAllCommutations();
      if (selectedEmployeeLeaves) {
        const updated = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`);
        const all = Array.isArray(updated.data) ? updated.data : [];
        const empData = all.filter((a) => a.employeeNumber?.toString() === selectedEmployeeLeaves.employeeNumber?.toString());
        const grouped = empData.reduce((acc, a) => { if (!acc[a.leave_code]) acc[a.leave_code] = { leave_code: a.leave_code, periods: [] }; acc[a.leave_code].periods.push(a); return acc; }, {});
        setSelectedEmployeeLeaves((p) => ({ ...p, leaveTypes: Object.values(grouped) }));
        if (selectedLeaveTypeInModal) { const r = grouped[selectedLeaveTypeInModal.leave_code]; if (r) setSelectedLeaveTypeInModal(r); }
      }
      if (editAssignment) setEditAssignment((p) => ({ ...p, remaining_hours: 0, used_hours: p.total_hours }));
      setTimeout(() => setCommuteSuccess(""), 4000);
    } catch (e) { setCommuteLoading(false); setError("Transfer failed: " + (e.response?.data?.error || e.message)); }
  };

  const filteredAssignments = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return assignments.filter((a) => {
      const matchSearch =
        (a.fullName?.toLowerCase() || "").includes(s) ||
        (a.employeeNumber?.toString().toLowerCase() || "").includes(s) ||
        (a.leave_code?.toString().toLowerCase() || "").includes(s);
      const matchDept = deptFilter === "all" || (deptMap[a.employeeNumber?.toString()] || "") === deptFilter;
      return matchSearch && matchDept;
    });
  }, [assignments, searchTerm, deptFilter, deptMap]);

  const getEmployeeInfo = (num) => employees.find((e) => e.employeeNumber?.toString() === num?.toString()) || { fullName: num || "Unknown" };

  const groupedByEmployee = filteredAssignments.reduce((acc, a) => {
    const num = a.employeeNumber?.toString() || "Unknown";
    if (!acc[num]) { const info = getEmployeeInfo(num); acc[num] = { employeeNumber: num, fullName: buildDisplayName(info) || num, firstName: info.firstName, lastName: info.lastName, leaveTypes: {} }; }
    const lc = a.leave_code;
    if (!acc[num].leaveTypes[lc]) acc[num].leaveTypes[lc] = { leave_code: lc, periods: [] };
    acc[num].leaveTypes[lc].periods.push(a);
    return acc;
  }, {});

  const employeeGroups  = Object.values(groupedByEmployee).map((e) => ({ ...e, leaveTypes: Object.values(e.leaveTypes) })).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  const paginatedGroups = useMemo(() => { const s = recordsPage * recordsRowsPerPage; return employeeGroups.slice(s, s + recordsRowsPerPage); }, [employeeGroups, recordsPage, recordsRowsPerPage]);

  const canCommute = (period) => toNum(period?.remaining_hours) > 0;

  const pendingCount = useMemo(
    () => filteredLeaveTypesForNew.filter((lt) => !duplicateSet.has(lt.leave_code) && toNum(bulkCredits[lt.leave_code]) > 0).length,
    [filteredLeaveTypesForNew, duplicateSet, bulkCredits],
  );

  const openEmployeeLeavesModal = (grp) => {
    const sortedLeaveTypes = [...grp.leaveTypes].sort((a, b) => a.leave_code.localeCompare(b.leave_code));
    setSelectedEmployeeLeaves({ ...grp, leaveTypes: sortedLeaveTypes });
    setSelectedLeaveTypeInModal(sortedLeaveTypes[0] || null);
    setEmployeeLeavesModalOpen(true);
  };

  if (accessLoading || pageLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8 }}>
        <CircularProgress sx={{ color: T.accent, mb: 2 }} />
        <Typography sx={{ color: T.accent, fontFamily: T.poppins }}>Loading leave assignments…</Typography>
      </Box>
    );
  }
  if (!hasAccess) return <AccessDenied />;

  const StatCard = ({ label, sublabel, value, valueHours, color, bg, borderC, dashed = false, unit: u }) => {
    const h         = toNum(valueHours ?? value);
    const primary   = u === "hours" ? `${h.toFixed(3)} hrs`        : `${(h / 8).toFixed(3)} days`;
    const secondary = u === "hours" ? `${(h / 8).toFixed(3)} days` : `${h.toFixed(3)} hrs`;
    return (
      <Box sx={{ p: 1.5, borderRadius: 2, textAlign: "center", bgcolor: bg, border: `${dashed ? "1.5px dashed" : "1px solid"} ${borderC}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, color: alpha(color, 0.75), textTransform: "uppercase", letterSpacing: 0.4, mb: 0.5, lineHeight: 1.3, fontFamily: T.poppins, textAlign: "center" }}>{label}</Typography>
        <Typography sx={{ fontWeight: 900, color, fontSize: "1rem", lineHeight: 1, fontFamily: T.poppins }}>{primary}</Typography>
        <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, mt: 0.25 }}>({secondary})</Typography>
        {sublabel && (<Typography sx={{ fontSize: "0.58rem", color: alpha(color, 0.6), fontFamily: T.poppins, mt: 0.5, lineHeight: 1.3, fontStyle: "italic" }}>{sublabel}</Typography>)}
      </Box>
    );
  };

  const selectedMonthLabel = MONTHS.find((m) => m.value === periodMonth)?.label || "";

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Fade in timeout={400}>
        <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 }, width: "100vw", maxWidth: "100%", position: "relative", left: "63%", transform: "translateX(-61%)", px: { xs: 2, sm: 3, md: 6 } }}>
          <LoadingOverlay open={loading} message="Processing leave assignment…" />
          <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
          <CommuteDialog open={commuteDialogOpen} period={commutePeriod} onClose={() => setCommuteDialogOpen(false)} onConfirm={handleCommute} loading={commuteLoading} unit={unit} />
          <BulkAutoAssignDialog open={bulkAssignOpen} onClose={() => setBulkAssignOpen(false)} leaveTypes={leaveTypes} assignments={assignments} employees={employees} commutationMap={commutationMap} deptMap={deptMap} onSuccess={async () => { await fetchAssignments(); }} />

          {/* Page Header */}
          <SectionCard sx={{ mb: 2, overflow: "hidden" }}>
            <Box sx={{ px: 4, py: 3, background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
              <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${alpha(T.accent, 0.1)} 0%, transparent 70%)` }} />
              <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: `radial-gradient(circle, ${alpha(T.accent, 0.07)} 0%, transparent 70%)` }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, position: "relative", zIndex: 1 }}>
                <EventNote sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: T.accent, lineHeight: 1.2, mb: 0.3, fontFamily: T.poppins }}>Leave Assignment Management</Typography>
                  <Typography sx={{ fontSize: "0.82rem", color: T.accentMid, fontWeight: 700, opacity: 0.9, fontFamily: T.poppins }}>Administrative Panel • Assign leave types and manage leave credits</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
                <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                  <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>
                    {assignments.length} {assignments.length === 1 ? "assignment" : "assignments"}
                  </Typography>
                </Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => { fetchAssignments(); fetchAllCommutations(); fetchDeptMap(); fetchEmpCatMap(); }} sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, "&:hover": { bgcolor: alpha(T.accent, 0.15) } }}>
                    <RefreshIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          <Grid container spacing={2}>
            {/* LEFT: Add Assignment Form */}
            <Grid item xs={12} lg={5}>
              <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>
                <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>Assign Leave to Employee</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins }}>Input in:</Typography>
                    <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                      sx={{ "& .MuiToggleButton-root": { px: 1.25, py: 0.3, border: `1px solid ${T.accentBorder}`, fontSize: "0.72rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins, "&.Mui-selected": { bgcolor: T.accent, color: "#fff", borderColor: T.accent } } }}>
                      <ToggleButton value="hours"><HoursIcon sx={{ fontSize: 13, mr: 0.5 }} />Hours</ToggleButton>
                      <ToggleButton value="days"><DaysIcon sx={{ fontSize: 13, mr: 0.5 }} />Days</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>

                <Box sx={{ px: 3, py: 2, flexGrow: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                  {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontFamily: T.poppins }}>{error}</Alert>}
                  {commuteSuccess && <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2, borderRadius: 2, fontFamily: T.poppins }}>{commuteSuccess}</Alert>}

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
                        Select Employee <span style={{ color: "#c62828" }}>*</span>
                        <Box component="span" sx={{ ml: 1, fontSize: "0.65rem", fontWeight: 400, color: T.faint }}>
                          — sorted by last name A → Z
                        </Box>
                      </Typography>
                      <Autocomplete
                        value={selectedEmployee}
                        onChange={(e, v) => { setSelectedEmployee(v); setError(""); setBulkCredits({}); setBulkResults(null); }}
                        options={employeeOptions}
                        autoHighlight
                        getOptionLabel={(o) => `${o._displayName || o.fullName || `${o.firstName || ""} ${o.lastName || ""}`.trim()} (${o.employeeNumber})`}
                        filterOptions={(opts, { inputValue: iv }) => opts.filter((o) => (o._searchKey || "").includes(iv.toLowerCase().trim())).slice(0, 80)}
                        isOptionEqualToValue={(o, v) => o.employeeNumber === v.employeeNumber}
                        noOptionsText="No employees found"
                        renderOption={(props, option) => {
                          const { key, ...rest } = props;
                          const name     = option._displayName || option.fullName || `${option.firstName || ""} ${option.lastName || ""}`.trim();
                          const initials = `${option.lastName?.[0] || ""}${option.firstName?.[0] || ""}`.toUpperCase() || "?";
                          const deptCode = deptMap[option.employeeNumber?.toString()];
                          const empCat   = empCatMap[option.employeeNumber?.toString()];
                          return (
                            <li key={key} {...rest}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Avatar sx={{ width: 30, height: 30, bgcolor: T.accent, fontSize: "0.75rem", fontWeight: 700, borderRadius: "6px" }}>{initials}</Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins, fontSize: "0.82rem" }}>{name}</Typography>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                                    <Typography variant="caption" sx={{ color: "#888", fontFamily: T.poppins }}>#{option.employeeNumber}</Typography>
                                    {(option.sex || option.gender) && <GenderBadge gender={option.sex || option.gender} />}
                                    {deptCode && <DeptBadge code={deptCode} />}
                                    {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
                                  </Box>
                                </Box>
                              </Box>
                            </li>
                          );
                        }}
                        renderInput={(params) => (
                          <FieldInput {...params} size="small" placeholder="Type last name, first name, or employee number…"
                            InputProps={{ ...params.InputProps, startAdornment: <><SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} />{params.InputProps.startAdornment}</> }}
                          />
                        )}
                        slotProps={{
                          paper: { sx: { borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: `1px solid ${T.accentBorder}` } },
                        }}
                        sx={{ width: "100%" }}
                      />
                      {selectedEmployee && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.75, flexWrap: "wrap" }}>
                          {selectedEmployeeGender && (<><Typography variant="caption" sx={{ color: "#888", fontWeight: 700, fontFamily: T.poppins }}>Gender:</Typography><GenderBadge gender={selectedEmployeeGender} /></>)}
                          {deptMap[selectedEmployee.employeeNumber?.toString()] && (<><Typography variant="caption" sx={{ color: "#888", fontWeight: 700, fontFamily: T.poppins, ml: selectedEmployeeGender ? 1 : 0 }}>Dept:</Typography><DeptBadge code={deptMap[selectedEmployee.employeeNumber?.toString()]} /></>)}
                          {empCatMap[selectedEmployee.employeeNumber?.toString()] && (<><Typography variant="caption" sx={{ color: "#888", fontWeight: 700, fontFamily: T.poppins, ml: 1 }}>Category:</Typography><EmpCatBadge label={empCatMap[selectedEmployee.employeeNumber?.toString()].label} colorHex={empCatMap[selectedEmployee.employeeNumber?.toString()].colorHex} /></>)}
                        </Box>
                      )}
                      {selectedEmployee && !selectedEmployeeGender && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.75 }}>
                          <WarningIcon sx={{ fontSize: 13, color: "#e65100" }} />
                          <Typography variant="caption" sx={{ color: "#e65100", fontWeight: 700, fontFamily: T.poppins }}>No gender on file — gender-restricted types hidden.</Typography>
                        </Box>
                      )}
                    </Box>

                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={5}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Period Year <span style={{ color: "#c62828" }}>*</span></Typography>
                        <FieldInput type="number" size="small" fullWidth value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} inputProps={{ min: 2020, max: 2035 }} />
                      </Grid>
                      <Grid item xs={12} sm={7}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Period Month <span style={{ color: T.faint, fontWeight: 500, marginLeft: 4, fontSize: "0.68rem" }}>(optional)</span></Typography>
                        <FormControl fullWidth size="small">
                          <Select value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} displayEmpty
                            sx={{ ...selectSx, "& .MuiSelect-select": { py: "8px", fontFamily: T.poppins, fontSize: "0.875rem", fontWeight: periodMonth ? 700 : 400, color: periodMonth ? T.text : T.faint } }}>
                            {MONTHS.map((m) => (
                              <MenuItem key={m.value} value={m.value} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>
                                {m.value ? (
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Box sx={{ width: 20, height: 20, borderRadius: "4px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>{m.value}</Typography>
                                    </Box>
                                    {m.label}
                                  </Box>
                                ) : (
                                  <Typography sx={{ color: T.faint, fontStyle: "italic", fontFamily: T.poppins, fontSize: "0.82rem" }}>{m.label}</Typography>
                                )}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    {(periodYear || periodMonth) && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1 }}>
                        <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>Assigning for:</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.3, borderRadius: "5px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                          <CalendarIcon sx={{ fontSize: 11, color: T.accent }} />
                          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>
                            {periodYear}{selectedMonthLabel ? ` · ${selectedMonthLabel}` : ""}
                          </Typography>
                        </Box>
                        {duplicateSet.size > 0 && (
                          <Typography sx={{ fontSize: "0.68rem", color: "#e65100", fontFamily: T.poppins, fontWeight: 600 }}>
                            · {duplicateSet.size} type{duplicateSet.size !== 1 ? "s" : ""} already assigned
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>

                  {selectedEmployee ? (
                    filteredLeaveTypesForNew.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins }}>No eligible leave types for this employee's gender.</Typography>
                      </Alert>
                    ) : (
                      <>
                        <Box sx={{ display: "grid", gridTemplateColumns: "110px 90px 1fr 90px", gap: 1, px: 1.5, py: 0.75, mb: 0.75, bgcolor: alpha(T.accent, 0.04), borderRadius: 1 }}>
                          {["Leave Type", "Carry-Over", "New Credits ★", "Total"].map((h) => (
                            <Typography key={h} sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins }}>{h}</Typography>
                          ))}
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                          {filteredLeaveTypesForNew.map((lt) => (
                            <BulkLeaveRow
                              key={lt.leave_code} lt={lt} unit={unit}
                              allocatedHours={toNum(bulkCredits[lt.leave_code])}
                              onChangeAllocated={(hrs) => setBulkCredits((p) => ({ ...p, [lt.leave_code]: hrs }))}
                              carriedHours={toNum(carryOverMap[lt.leave_code])}
                              isDuplicate={duplicateSet.has(lt.leave_code)}
                            />
                          ))}
                        </Box>
                        {bulkResults && (
                          <Alert severity={bulkResults.errors > 0 ? "warning" : "success"} sx={{ mt: 2, borderRadius: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins }}>
                              {bulkResults.created} assigned · {bulkResults.skipped} skipped (duplicates) · {bulkResults.errors} error{bulkResults.errors !== 1 ? "s" : ""}
                            </Typography>
                          </Alert>
                        )}
                        <Box sx={{ mt: 2 }}>
                          <AccentButton
                            onClick={handleBulkAdd} variant="contained"
                            startIcon={bulkSubmitting ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
                            disabled={bulkSubmitting || pendingCount === 0} fullWidth
                            sx={{ height: 40, bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, fontFamily: T.poppins, "&:hover": { bgcolor: T.accentDark }, "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important", boxShadow: "none" } }}>
                            {bulkSubmitting ? "Assigning…" : pendingCount > 0
                              ? `Assign ${pendingCount} Leave Type${pendingCount !== 1 ? "s" : ""}${selectedMonthLabel ? ` for ${selectedMonthLabel} ${periodYear}` : ` for ${periodYear}`}`
                              : "Enter credits to assign"}
                          </AccentButton>
                          {duplicateSet.size > 0 && (
                            <Typography sx={{ fontSize: "0.68rem", color: T.faint, mt: 0.75, textAlign: "center", fontFamily: T.poppins }}>
                              {duplicateSet.size} type{duplicateSet.size !== 1 ? "s" : ""} already assigned for {periodYear}{selectedMonthLabel ? ` · ${selectedMonthLabel}` : ""} — shown but skipped
                            </Typography>
                          )}
                        </Box>
                      </>
                    )
                  ) : (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <PersonIcon sx={{ fontSize: 40, color: alpha(T.accent, 0.2), mb: 1 }} />
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>Select an employee to begin</Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: T.faint, mt: 0.5, fontFamily: T.poppins }}>All eligible leave types will appear below</Typography>
                    </Box>
                  )}
                </Box>
              </SectionCard>
            </Grid>

            {/* RIGHT: Records Panel */}
            <Grid item xs={12} lg={7}>
              <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>
                <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Reorder sx={{ fontSize: 17, color: T.accent }} />
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>Leave Assignment Records</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Box sx={{ px: 1.5, py: 0.4, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.15)}` }}>
                        <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>
                          {employeeGroups.length} employees · {filteredAssignments.length} records
                        </Typography>
                      </Box>
                      <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small"
                        sx={{ "& .MuiToggleButton-root": { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`, color: T.muted, "&.Mui-selected": { bgcolor: T.accentFaint, color: T.accent } } }}>
                        <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                        <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 14 }} /></ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <FieldInput size="small" placeholder="Search by name or employee number…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1 }}
                      InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }} />
                    {allDeptCodes.length > 0 && (
                      <FormControl size="small" sx={{ minWidth: 130, flexShrink: 0 }}>
                        <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} displayEmpty
                          startAdornment={<DomainIcon sx={{ fontSize: 14, color: T.accent, mr: 0.5, ml: 0.25 }} />}
                          sx={{ ...selectSx, "& .MuiSelect-select": { py: "7px", fontSize: "0.8rem", fontWeight: deptFilter !== "all" ? 700 : 400, color: deptFilter !== "all" ? T.accent : T.muted, display: "flex", alignItems: "center" } }}>
                          <MenuItem value="all" sx={{ fontFamily: T.poppins, fontSize: "0.82rem", color: T.muted }}>All depts</MenuItem>
                          {allDeptCodes.map((c) => (
                            <MenuItem key={c} value={c} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: T.text }}>{c}</Typography></Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                  {deptFilter !== "all" && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1 }}>
                      <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>Filtered by:</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: "5px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, cursor: "pointer" }} onClick={() => setDeptFilter("all")}>
                        <DomainIcon sx={{ fontSize: 10, color: T.accent }} />
                        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>{deptFilter}</Typography>
                        <Close sx={{ fontSize: 10, color: T.accent }} />
                      </Box>
                    </Box>
                  )}
                </Box>

                <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                  {paginatedGroups.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: "center" }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                        <EventNote sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: T.muted, mb: 0.5, fontFamily: T.poppins }}>{assignments.length === 0 ? "No Leave Assignments Found" : "No Matching Records"}</Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: T.faint, fontFamily: T.poppins }}>{assignments.length === 0 ? "Assign leave credits using the form on the left." : "Try adjusting your search or department filter."}</Typography>
                    </Box>
                  ) : viewMode === "grid" ? (
                    <Grid container spacing={1.5} alignItems="stretch">
                      {paginatedGroups.map((grp) => {
                        const allActive    = grp.leaveTypes.flatMap((lt) => getActivePeriods(lt.periods));
                        const remH         = allActive.reduce((s, p) => s + toNum(p.remaining_hours), 0);
                        const totalH       = allActive.reduce((s, p) => s + toNum(p.total_hours), 0);
                        const overallColor = getStatusColor(remH, totalH);
                        const initials     = `${grp.lastName?.[0] || ""}${grp.firstName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const info         = getEmployeeInfo(grp.employeeNumber);
                        const empGender    = info?.sex || info?.gender;
                        const deptCode     = deptMap[grp.employeeNumber] || null;
                        const empCat       = empCatMap[grp.employeeNumber] || null;
                        return (
                          <Grid item xs={12} sm={6} md={4} key={grp.employeeNumber} sx={{ display: "flex" }}>
                            <Box onClick={() => openEmployeeLeavesModal(grp)}
                              sx={{ width: "100%", display: "flex", flexDirection: "column", p: 2, borderRadius: 2, cursor: "pointer", bgcolor: "#fff", border: `1px solid ${T.accentBorder}`, transition: "all 0.13s", "&:hover": { bgcolor: T.rowHover, borderColor: T.accent, transform: "translateY(-2px)", boxShadow: `0 4px 14px ${alpha(T.accent, 0.1)}` } }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
                                <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", fontWeight: 800, bgcolor: T.accent, color: "#fff", borderRadius: "8px", flexShrink: 0 }}>{initials}</Avatar>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, lineHeight: 1.25, fontFamily: T.poppins }} noWrap>{grp.fullName}</Typography>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                    <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>#{grp.employeeNumber}</Typography>
                                    {empGender && <GenderBadge gender={empGender} />}
                                    {deptCode && <DeptBadge code={deptCode} />}
                                    {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
                                  </Box>
                                </Box>
                              </Box>
                              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 0.75 }}>
                                {grp.leaveTypes.slice(0, 3).map((lt) => {
                                  const stats    = getLeaveTypeStatsActive(lt.periods);
                                  const key      = `${grp.employeeNumber}_${lt.leave_code}`;
                                  const commDays = toNum(commutationMap[key]);
                                  const displayH = commDays > 0 ? commDays * 8 : stats.remainingHours;
                                  const sc       = commDays > 0 ? T.accent : getStatusColor(stats.remainingHours, stats.totalHours);
                                  return (
                                    <Box key={lt.leave_code} sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: `${sc}12`, border: `1px solid ${sc}30` }}>
                                      <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: sc, whiteSpace: "nowrap", fontFamily: T.poppins }}>
                                        {lt.leave_code} {unit === "hours" ? `${displayH.toFixed(3)}h` : `${(displayH / 8).toFixed(3)}d`}
                                      </Typography>
                                    </Box>
                                  );
                                })}
                                {grp.leaveTypes.length > 3 && (
                                  <Box sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                                    <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>+{grp.leaveTypes.length - 3}</Typography>
                                  </Box>
                                )}
                              </Box>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 0.75, borderTop: `1px solid ${T.divider}` }}>
                                <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>{grp.leaveTypes.length} leave type{grp.leaveTypes.length !== 1 ? "s" : ""}</Typography>
                                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>
                                  {unit === "hours" ? `${remH.toFixed(3)}h left` : `${(remH / 8).toFixed(3)}d left`}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <>
                      <Box sx={{ px: 1.5, py: 1, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr", gap: 1, alignItems: "center", bgcolor: alpha(T.accent, 0.04), borderRadius: 1.5, mb: 1 }}>
                        {["Employee", "Dept / Category", "Types", "Balance", "Leave Credits"].map((col) => (
                          <Typography key={col} sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins }}>{col}</Typography>
                        ))}
                      </Box>
                      {paginatedGroups.map((grp, idx) => {
                        const allActive    = grp.leaveTypes.flatMap((lt) => getActivePeriods(lt.periods));
                        const remH         = allActive.reduce((s, p) => s + toNum(p.remaining_hours), 0);
                        const totalH       = allActive.reduce((s, p) => s + toNum(p.total_hours), 0);
                        const overallColor = getStatusColor(remH, totalH);
                        const initials     = `${grp.lastName?.[0] || ""}${grp.firstName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const info         = getEmployeeInfo(grp.employeeNumber);
                        const empGender    = info?.sex || info?.gender;
                        const deptCode     = deptMap[grp.employeeNumber] || null;
                        const empCat       = empCatMap[grp.employeeNumber] || null;
                        return (
                          <Box key={grp.employeeNumber} onClick={() => openEmployeeLeavesModal(grp)}
                            sx={{ px: 1.5, py: 1.25, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr", gap: 1, alignItems: "center", borderRadius: 1.5, cursor: "pointer", bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, border: "1px solid transparent", transition: "background 0.13s ease", "&:hover": { bgcolor: T.rowHover } }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: "0.68rem", fontWeight: 800, bgcolor: T.accent, color: "#fff", borderRadius: "6px", flexShrink: 0 }}>{initials}</Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }} noWrap>{grp.fullName}</Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>#{grp.employeeNumber}</Typography>
                                  {empGender && <GenderBadge gender={empGender} />}
                                </Box>
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                              {deptCode ? <DeptBadge code={deptCode} /> : <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>—</Typography>}
                              {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
                            </Box>
                            <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "inline-block", width: "fit-content" }}>
                              <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>{grp.leaveTypes.length}</Typography>
                            </Box>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>
                              {unit === "hours" ? `${remH.toFixed(3)}h` : `${(remH / 8).toFixed(3)}d`}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              {grp.leaveTypes.slice(0, 3).map((lt) => {
                                const sc = getStatusColor(getLeaveTypeStatsActive(lt.periods).remainingHours, getLeaveTypeStatsActive(lt.periods).totalHours);
                                return (
                                  <Box key={lt.leave_code} sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: `${sc}12`, border: `1px solid ${sc}30` }}>
                                    <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: sc, fontFamily: T.poppins }}>{lt.leave_code}</Typography>
                                  </Box>
                                );
                              })}
                              {grp.leaveTypes.length > 3 && <Box sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: T.accentFaint }}><Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>+{grp.leaveTypes.length - 3}</Typography></Box>}
                            </Box>
                          </Box>
                        );
                      })}
                    </>
                  )}
                </Box>

                {employeeGroups.length > 0 && (
                  <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}`, flexShrink: 0 }}>
                    <TablePagination component="div" count={employeeGroups.length} page={recordsPage}
                      onPageChange={(e, p) => setRecordsPage(p)}
                      rowsPerPage={recordsRowsPerPage}
                      onRowsPerPageChange={(e) => { setRecordsRowsPerPage(parseInt(e.target.value, 10)); setRecordsPage(0); }}
                      rowsPerPageOptions={[12, 24, 48, 96]} labelRowsPerPage="Rows:"
                      sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: "0.78rem", fontWeight: 600, color: T.accent, fontFamily: T.poppins } }}
                    />
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>

          {/* Employee Leaves Modal */}
          <Modal open={employeeLeavesModalOpen} onClose={() => { setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null); }} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <Fade in={employeeLeavesModalOpen}>
              <Box sx={{ backgroundColor: "#fff", borderRadius: "12px", width: "95%", maxWidth: "1080px", height: "84vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", fontFamily: T.poppins }}>
                {selectedEmployeeLeaves && (() => {
                  const empInfo   = getEmployeeInfo(selectedEmployeeLeaves.employeeNumber);
                  const empGender = empInfo?.sex || empInfo?.gender;
                  const empDept   = deptMap[selectedEmployeeLeaves.employeeNumber] || null;
                  const empCat    = empCatMap[selectedEmployeeLeaves.employeeNumber] || null;
                  return (
                    <>
                      <Box sx={{ px: 3.5, py: 2, background: T.headerGrad, display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontSize: "0.85rem", fontWeight: 800, borderRadius: "8px", border: "1px solid rgba(255,255,255,0.25)" }}>
                          {`${selectedEmployeeLeaves.lastName?.[0] || ""}${selectedEmployeeLeaves.firstName?.[0] || ""}`.toUpperCase() || selectedEmployeeLeaves.fullName?.[0] || "?"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.92rem", fontFamily: T.poppins }} noWrap>{selectedEmployeeLeaves.fullName}</Typography>
                            {empGender && <GenderBadge gender={empGender} light />}
                            {empDept && <DeptBadge code={empDept} light />}
                            {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} light />}
                          </Box>
                          <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontFamily: T.poppins }}>
                            #{selectedEmployeeLeaves.employeeNumber} · {selectedEmployeeLeaves.leaveTypes.length} leave type{selectedEmployeeLeaves.leaveTypes.length !== 1 ? "s" : ""}
                          </Typography>
                        </Box>
                        <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                          sx={{ "& .MuiToggleButton-root": { px: 1.5, py: 0.3, border: "1px solid rgba(255,255,255,0.22)", fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", fontFamily: T.poppins, "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.18)", color: "#fff", borderColor: "rgba(255,255,255,0.4)" } } }}>
                          <ToggleButton value="hours">Hours</ToggleButton>
                          <ToggleButton value="days">Days</ToggleButton>
                        </ToggleButtonGroup>
                        <IconButton onClick={() => { setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null); }} size="small" sx={{ color: "rgba(255,255,255,0.65)", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}>
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
                        {/* Sidebar */}
                        <Box sx={{ width: 210, flexShrink: 0, borderRight: `1px solid ${T.divider}`, display: "flex", flexDirection: "column", bgcolor: "#fafafa" }}>
                          <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${T.divider}` }}>
                            <Typography sx={{ fontSize: "0.63rem", fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: T.poppins }}>Leave Type</Typography>
                          </Box>
                          <Box sx={{ flex: 1, overflowY: "auto" }}>
                            {selectedEmployeeLeaves.leaveTypes.map((lt) => {
                              const stats    = getLeaveTypeStatsActive(lt.periods);
                              const sc       = getStatusColor(stats.remainingHours, stats.totalHours);
                              const isActive = selectedLeaveTypeInModal?.leave_code === lt.leave_code;
                              const ltObj    = leaveTypes.find((x) => x.leave_code === lt.leave_code);
                              const restriction = ltObj ? getLeaveGenderRestriction(ltObj) : null;
                              const ltDesc   = ltObj?.leave_description || ltObj?.leave_name || "";
                              return (
                                <Box key={lt.leave_code} onClick={() => setSelectedLeaveTypeInModal(lt)}
                                  sx={{ px: 2, py: 1.1, cursor: "pointer", borderLeft: `3px solid ${isActive ? T.accent : "transparent"}`, bgcolor: isActive ? T.accentFaint : "transparent", transition: "all 0.1s", "&:hover": { bgcolor: T.accentFaint } }}>
                                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                      {restriction === "male"   && <MaleIcon   sx={{ fontSize: 11, color: "#1565C0" }} />}
                                      {restriction === "female" && <FemaleIcon sx={{ fontSize: 11, color: "#C2185B" }} />}
                                      <Typography sx={{ fontSize: "0.82rem", fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.text, fontFamily: T.poppins }}>{lt.leave_code}</Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: sc, fontFamily: T.poppins }}>
                                      {unit === "hours" ? `${stats.remainingHours.toFixed(1)}h` : `${(stats.remainingHours / 8).toFixed(2)}d`}
                                    </Typography>
                                  </Box>
                                  {ltDesc && <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins, mt: 0.1 }} noWrap>{ltDesc}</Typography>}
                                  <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>{lt.periods.length} period{lt.periods.length !== 1 ? "s" : ""}</Typography>
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>
                        {/* Main content */}
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                          {!selectedLeaveTypeInModal ? (
                            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Box sx={{ textAlign: "center" }}>
                                <EventNote sx={{ fontSize: 38, color: alpha(T.accent, 0.12), mb: 1.5 }} />
                                <Typography sx={{ fontWeight: 600, color: T.muted, fontSize: "0.88rem", fontFamily: T.poppins }}>Select a leave type</Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
                              {commuteSuccess && (
                                <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2, borderRadius: 2 }}>
                                  <Typography sx={{ fontFamily: T.poppins }}>{commuteSuccess}</Typography>
                                </Alert>
                              )}
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {[...selectedLeaveTypeInModal.periods]
                                  .sort((a, b) => {
                                    if (b.period_year !== a.period_year) return b.period_year - a.period_year;
                                    const aM = parseInt(a.period_semester, 10) || 0;
                                    const bM = parseInt(b.period_semester, 10) || 0;
                                    if (aM !== bM) return bM - aM;
                                    return semOrder(b.period_semester) - semOrder(a.period_semester);
                                  })
                                  .map((period, index) => {
                                    const sc         = getStatusColor(period.remaining_hours, period.total_hours);
                                    const isLatest   = index === 0;
                                    const isLocked   = isCommutedLocked(period);
                                    const remHrs     = toNum(period.remaining_hours);
                                    const totalHrs   = toNum(period.total_hours);
                                    const usedHrs    = toNum(period.used_hours);
                                    const carriedHrs = toNum(period.carried_forward_hours);
                                    const allocRawHrs = toNum(period.allocated_hours);
                                    const allocHrs   = allocRawHrs > 0
                                      ? allocRawHrs
                                      : Math.max(0, totalHrs - carriedHrs);
                                    const pctUsed    = isLocked ? 0 : (totalHrs > 0 ? Math.min((usedHrs / totalHrs) * 100, 100) : 0);
                                    const fmt = (h) => unit === "hours" ? `${toNum(h).toFixed(3)} h` : `${(toNum(h) / 8).toFixed(3)} d`;
                                    return (
                                      <Box key={period.id} sx={{ borderRadius: "10px", border: `1px solid ${isLatest ? "#2E7D32" : T.divider}`, overflow: "hidden", bgcolor: "#fff" }}>
                                        <Box sx={{ px: 2.5, py: 1.25, display: "flex", alignItems: "center", gap: 1.5, bgcolor: isLatest ? "rgba(46,125,50,0.04)" : "#fafafa", borderBottom: `1px solid ${T.divider}` }}>
                                          <Typography sx={{ fontWeight: 700, color: isLatest ? "#2e7d32" : T.text, fontSize: "0.88rem", fontFamily: T.poppins }}>{periodLabel(period.period_year, period.period_semester)}</Typography>
                                          {isLatest && <Chip label="Current" size="small" sx={{ height: 20, fontSize: "0.65rem", bgcolor: "#2E7D32", color: "#fff", fontWeight: 700, fontFamily: T.poppins }} />}
                                          {isLocked && <Chip size="small" icon={<CommutationIcon style={{ fontSize: 11 }} />} label="Transferred to Commutation" sx={{ height: 20, fontSize: "0.65rem", bgcolor: T.accentFaint, color: T.accent, fontWeight: 700, fontFamily: T.poppins }} />}
                                          <Box sx={{ flex: 1 }} />
                                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 130 }}>
                                            <Box sx={{ flex: 1, height: 5, bgcolor: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
                                              <Box sx={{ height: "100%", width: `${pctUsed}%`, bgcolor: isLocked ? "#bdbdbd" : sc, borderRadius: 3, transition: "width 0.3s" }} />
                                            </Box>
                                            {!isLocked && <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins, whiteSpace: "nowrap" }}>{pctUsed.toFixed(0)}% used</Typography>}
                                          </Box>
                                        </Box>

                                        {/* ─── Stats grid ─── */}
                                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
                                          {[
                                            ["Carried Over",   carriedHrs, carriedHrs > 0 ? "#2e7d32" : T.faint],
                                            ["Balance Given",  allocHrs,   "#1565c0"],
                                            ["Used",           usedHrs,    "#e65100"],
                                            ["Remaining",      remHrs,     sc],
                                            ["Total",          totalHrs,   "#2e7d32"],
                                          ].map(([label, val, color], i) => (
                                            <Box key={label} sx={{ px: 1.75, py: 1.5, borderRight: i < 4 ? `1px solid ${T.divider}` : "none", borderBottom: `1px solid ${T.divider}`, textAlign: "center" }}>
                                              <Typography sx={{ fontSize: "0.59rem", fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins, mb: 0.5 }}>{label}</Typography>
                                              <Typography sx={{ fontWeight: 800, color, fontSize: "0.9rem", lineHeight: 1, fontFamily: T.poppins }}>{fmt(val)}</Typography>
                                              <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, mt: 0.25 }}>
                                                {unit === "hours" ? `${(toNum(val) / 8).toFixed(3)} d` : `${toNum(val).toFixed(3)} h`}
                                              </Typography>
                                            </Box>
                                          ))}
                                        </Box>

                                        {/* ─── NEW: Earnings Banner ─── */}
                                        {!isLocked && (
                                          <Box sx={{ px: 2.5, py: 1, borderBottom: `1px solid ${T.divider}` }}>
                                            <EarningsBanner
                                              employeeNumber={selectedEmployeeLeaves.employeeNumber}
                                              leaveCode={selectedLeaveTypeInModal.leave_code}
                                              periodYear={period.period_year}
                                              periodSemester={period.period_semester}
                                              unit={unit}
                                            />
                                          </Box>
                                        )}

                                        <Box sx={{ px: 2.5, py: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                                          <Typography sx={{ fontSize: "0.72rem", color: isLocked ? T.faint : remHrs > 0 ? "#2e7d32" : T.faint, fontFamily: T.poppins }}>
                                            {isLocked ? "Transferred to Commutation." : remHrs > 0 ? `${fmt(remHrs)} remaining · Can be transferred to Commutation.` : "All leave credits for this period have been used."}
                                          </Typography>
                                          <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
                                            {!isLocked && (
                                              <AccentButton onClick={(e) => { e.stopPropagation(); handleOpenModal(period); setIsEditing(true); }} variant="outlined" size="small"
                                                startIcon={<EditIcon sx={{ fontSize: "12px !important" }} />}
                                                sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28, borderColor: T.accentBorder, color: T.accent, "&:hover": { borderColor: T.accent, bgcolor: T.accentFaint, transform: "none" } }}>
                                                Edit
                                              </AccentButton>
                                            )}
                                            <Tooltip title={!canCommute(period) ? (isLocked ? "Already transferred" : "No remaining balance") : "Transfer to Commutation"}>
                                              <span>
                                                <AccentButton onClick={(e) => { e.stopPropagation(); setCommutePeriod({ ...period, fullName: selectedEmployeeLeaves.fullName }); setCommuteDialogOpen(true); setCommuteSuccess(""); }}
                                                  disabled={!canCommute(period)}
                                                  variant={canCommute(period) ? "contained" : "outlined"} size="small"
                                                  startIcon={<CommutationIcon sx={{ fontSize: "12px !important" }} />}
                                                  sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28, bgcolor: canCommute(period) ? T.accent : "transparent", color: canCommute(period) ? "#fff" : "#ccc", borderColor: canCommute(period) ? T.accent : "#e0e0e0", "&:hover": { bgcolor: canCommute(period) ? T.accentDark : "transparent", transform: "none" }, "&:disabled": { bgcolor: "transparent !important", color: "#ccc !important", borderColor: "#eee !important" } }}>
                                                  {isLocked ? "Transferred" : canCommute(period) ? "Transfer to Commutation" : "No Balance"}
                                                </AccentButton>
                                              </span>
                                            </Tooltip>
                                          </Box>
                                        </Box>
                                      </Box>
                                    );
                                  })}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </>
                  );
                })()}
              </Box>
            </Fade>
          </Modal>

          {/* Edit Assignment Modal */}
          <Modal open={!!editAssignment} onClose={handleCloseModal} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <Fade in={!!editAssignment}>
              <Box sx={{ backgroundColor: "#fff", borderRadius: 3, width: "100%", maxWidth: "560px", maxHeight: "90vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", fontFamily: T.poppins }}>
                {editAssignment && (() => {
                  const isEditLocked = isCommutedLocked(editAssignment);
                  const editDept     = deptMap[editAssignment.employeeNumber?.toString()] || null;
                  const editEmpCat   = empCatMap[editAssignment.employeeNumber?.toString()] || null;
                  return (
                    <>
                      <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                        <Box sx={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <EditIcon sx={{ fontSize: 18, color: "#fff" }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", lineHeight: 1.2, fontFamily: T.poppins }}>Edit Leave Assignment</Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                              <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", fontFamily: T.poppins }}>{editAssignment.fullName || editAssignment.employeeNumber} · {editAssignment.leave_code}</Typography>
                              {editDept && <DeptBadge code={editDept} light />}
                              {editEmpCat && <EmpCatBadge label={editEmpCat.label} colorHex={editEmpCat.colorHex} light />}
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, position: "relative", zIndex: 1 }}>
                          <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                            sx={{ "& .MuiToggleButton-root": { px: 1, py: 0.25, border: "1px solid rgba(255,255,255,0.3)", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: T.poppins, "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.2)", color: "#fff", borderColor: "rgba(255,255,255,0.5)" } } }}>
                            <ToggleButton value="hours">hrs</ToggleButton>
                            <ToggleButton value="days">days</ToggleButton>
                          </ToggleButtonGroup>
                          <IconButton onClick={handleCloseModal} size="small" sx={{ color: "rgba(255,255,255,0.75)", "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
                            <Close sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ px: 3.5, py: 3, overflowY: "auto", flexGrow: 1 }}>
                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}><Typography sx={{ fontFamily: T.poppins }}>{error}</Typography></Alert>}
                        {isEditLocked && (
                          <Alert severity="info" sx={{ mb: 2, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontWeight: 700, color: T.accent, mb: 0.25, fontFamily: T.poppins }}>Locked — already transferred to Commutation</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#666", fontFamily: T.poppins }}>To add new credits, create a new assignment for a new period.</Typography>
                          </Alert>
                        )}
                        <Box sx={{ mb: 2.5, p: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box>
                            <Typography sx={fieldLabelSx}>Still Available</Typography>
                            <RemainingBalance hoursLike={toNum(editAssignment.remaining_hours)} color={getStatusColor(toNum(editAssignment.remaining_hours), toNum(editAssignment.total_hours))} unit={unit} alignItems="flex-start" large />
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography sx={fieldLabelSx}>Period</Typography>
                            <Typography sx={{ fontWeight: 800, color: T.text, fontSize: "1rem", fontFamily: T.poppins }}>{periodLabel(editAssignment.period_year, editAssignment.period_semester)}</Typography>
                            <Box sx={{ mt: 0.5, display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                              <Box sx={{ px: 1.25, py: 0.3, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "inline-block" }}>
                                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>{editAssignment.leave_code}</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: 2.5 }}>
                          {[["Total Credits", toNum(editAssignment.total_hours), T.accent], ["Used So Far", toNum(editAssignment.used_hours), "#ed6c02"], ["Still Available", toNum(editAssignment.remaining_hours), getStatusColor(toNum(editAssignment.remaining_hours), toNum(editAssignment.total_hours))]].map(([label, val, color]) => (
                            <Box key={label} sx={{ p: 1.5, borderRadius: 2, textAlign: "center", bgcolor: `${color}08`, border: `1px solid ${color}20` }}>
                              <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, mb: 0.25, fontFamily: T.poppins }}>{label}</Typography>
                              <Typography sx={{ fontWeight: 900, color, fontSize: "0.95rem", lineHeight: 1, fontFamily: T.poppins }}>{unit === "hours" ? `${val.toFixed(3)}h` : `${(val / 8).toFixed(3)}d`}</Typography>
                              <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>{unit === "hours" ? `(${(val / 8).toFixed(3)}d)` : `(${val.toFixed(3)} hrs)`}</Typography>
                            </Box>
                          ))}
                        </Box>
                        {/* Earnings banner in edit modal too */}
                        {!isEditLocked && (
                          <Box sx={{ mb: 2 }}>
                            <EarningsBanner
                              employeeNumber={editAssignment.employeeNumber}
                              leaveCode={editAssignment.leave_code}
                              periodYear={editAssignment.period_year}
                              periodSemester={editAssignment.period_semester}
                              unit={unit}
                            />
                          </Box>
                        )}
                        <Divider sx={{ mb: 2.5, borderColor: T.divider }}>
                          <Chip label="Edit Fields" size="small" sx={{ height: 18, fontSize: "0.68rem", bgcolor: T.accentFaint, color: T.accent, fontWeight: 700, border: `1px solid ${T.accentBorder}`, fontFamily: T.poppins }} />
                        </Divider>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Employee Number</Typography>
                            <FieldInput value={editAssignment.employeeNumber || ""} onChange={(e) => setEditAssignment({ ...editAssignment, employeeNumber: e.target.value })} fullWidth size="small" disabled={isEditLocked} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Leave Type</Typography>
                            <FormControl fullWidth size="small">
                              <Select value={editAssignment.leave_code || ""} onChange={(e) => setEditAssignment({ ...editAssignment, leave_code: e.target.value })} disabled={isEditLocked} displayEmpty sx={selectSx}>
                                <MenuItem value=""><em style={{ fontFamily: T.poppins }}>Select</em></MenuItem>
                                {leaveTypes.map((t) => <MenuItem key={t.id || t.leave_code} value={t.leave_code} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>{getLeaveLabel(t.leave_code, leaveTypes)}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <CreditInput label="Brought Forward" valueHours={editCarriedHours} onChangeHours={setEditCarriedHours} unit={unit} disabled={isEditLocked} color="#2E7D32" />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <CreditInput label="Allocated Credits" valueHours={editAllocatedHours} onChangeHours={setEditAllocatedHours} unit={unit} disabled={isEditLocked} color="#1976d2" />
                          </Grid>
                          {!isEditLocked && (
                            <Grid item xs={12}>
                              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Override: Still Available (hours)</Typography>
                              <FieldInput type="number" value={toNum(editAssignment.remaining_hours)} onChange={(e) => setEditAssignment({ ...editAssignment, remaining_hours: parseFloat(e.target.value) || 0 })} fullWidth size="small" inputProps={{ min: 0, step: "any" }}
                                InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: "#888", fontWeight: 700, fontFamily: T.poppins }}>hrs</Typography></InputAdornment> }} />
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                      <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", display: "flex", justifyContent: "flex-end", gap: 1, flexShrink: 0 }}>
                        {!isEditLocked && (
                          <AccentButton onClick={() => handleDelete(editAssignment.id)} variant="outlined" startIcon={<DeleteIcon sx={{ fontSize: "13px !important" }} />} sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: "#ffcdd2", color: "#c62828", mr: "auto", "&:hover": { bgcolor: "rgba(198,40,40,0.04)", borderColor: "#c62828", transform: "none" } }}>Delete</AccentButton>
                        )}
                        <AccentButton onClick={handleCloseModal} variant="outlined" sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>{isEditLocked ? "Close" : "Cancel"}</AccentButton>
                        {!isEditLocked && (
                          <AccentButton onClick={handleUpdate} variant="contained" startIcon={<SaveIcon sx={{ fontSize: "13px !important" }} />} sx={{ fontSize: "0.8rem", fontFamily: T.poppins, bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark } }}>Save Changes</AccentButton>
                        )}
                      </Box>
                    </>
                  );
                })()}
              </Box>
            </Fade>
          </Modal>
        </Box>
      </Fade>

      {/* Floating Reset to Default button */}
      <Tooltip title={`Auto-assign leave types to all ${[...new Set(assignments.map((a) => a.employeeNumber))].length} employees with existing records`} placement="left">
        <Button
          onClick={() => setBulkAssignOpen(true)}
          variant="contained"
          startIcon={<AutoAssignIcon />}
          sx={{ position: "fixed", bottom: 70, right: 32, zIndex: 1200, bgcolor: T.accent, color: "#fff", borderRadius: 3, fontWeight: 700, fontFamily: T.poppins, px: 3, py: 1.5, fontSize: "0.875rem", boxShadow: `0 6px 20px ${alpha(T.accent, 0.45)}`, whiteSpace: "nowrap", "&:hover": { bgcolor: T.accentDark, boxShadow: `0 8px 28px ${alpha(T.accent, 0.55)}`, transform: "translateY(-2px)" }, transition: "all 0.2s ease" }}>
          Reset to Default
        </Button>
      </Tooltip>

      {/* Floating Conversion Widget */}
      <FloatingConversionWidget onNavigateToModule={handleNavigateToConversionModule} />
    </>
  );
};

export default LeaveAssignment;