import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import {
  Typography, TextField, Button, Box, Grid, Chip, Modal, IconButton,
  Select, MenuItem, FormControl, Alert, InputAdornment, Card, Avatar,
  Divider, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
  TablePagination, LinearProgress, Tooltip, Fade, CircularProgress,
  ToggleButton, ToggleButtonGroup, Paper, Tabs, Tab,
  Table, TableBody, TableCell, TableHead, TableRow,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon, Cancel as CancelIcon, Close, EventNote,
  Search as SearchIcon, Person as PersonIcon, History as HistoryIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon, AutoFixHigh as AutoAssignIcon,
  Male as MaleIcon, Female as FemaleIcon, Wc as GenderIcon,
  Warning as WarningIcon, PlayArrow as RunIcon,
  TableRows as TableRowsIcon, Refresh as RefreshIcon,
  AccessTime as HoursIcon, Today as DaysIcon, Reorder,
  ViewModule as ViewModuleIcon, ViewList as ViewListIcon,
  Info as InfoIcon, Settings as SettingsIcon, FilterList as FilterListIcon,
  Domain as DomainIcon, Work as WorkIcon,
  East as ForwardIcon,
  TrendingUp as EarnIcon,
  Pending as PendingIcon,
  CurrencyExchange as CommutationIcon,
} from "@mui/icons-material";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import { useSocket } from "../../contexts/SocketContext";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";
import { getLeaveGenderRestriction, isLeaveAllowedForGender } from "./leaveGenderUtils";
import {
  toNum,
  isCommutedLocked,
  latestPeriodsByKey,
  getLatestPeriodSnapshot,
  getPriorPeriodCarryForwardHours,
  normalizePeriodKey,
  sortPeriodsDesc as sortPeriodsDescBalance,
  getPriorPeriodSnapshot,
  getApprovedEarningsHoursForPeriod,
  computeAssignmentBalances,
  getAssignFormRemainingHours,
  getLeaveTypeDisplayRemaining,
} from "./leaveAssignmentBalanceUtils";

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

const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)`,
    backgroundSize: "800px 100%",
    animation: "laShimmer 1.6s infinite linear",
    flexShrink: 0, ...sx,
  }} />
);

const LeaveAssignmentWireframe = () => (
  <>
    <style>{shimmerKeyframes}</style>
    <Box
      sx={{
        py: { xs: 1, md: 2 },
        mt: { xs: 0, md: -2 },
        width: "100vw",
        maxWidth: "100%",
        position: "relative",
        left: "63%",
        transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
      }}
    >
      <Box sx={{ mb: 2, borderRadius: "12px", overflow: "hidden", border: `1px solid rgba(109,35,35,0.12)`, animation: "laPulse 2s ease-in-out infinite" }}>
        <Box sx={{ p: 3, background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, position: "relative", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.06)" }} />
          <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.04)" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.1)", flexShrink: 0 }} />
            <Box><Bone w={240} h={16} sx={{ mb: 1 }} /><Bone w={360} h={10} /></Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, position: "relative", zIndex: 1 }}>
            <Bone w={120} h={30} r={20} /><Bone w={36} h={36} r={8} />
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "4fr 8fr", gap: 2 }}>
        <Box sx={{ borderRadius: "12px", border: `1px solid rgba(109,35,35,0.12)`, overflow: "hidden", bgcolor: "#fff", height: "calc(100vh - 280px)", minHeight: 480, display: "flex", flexDirection: "column", animation: "laPulse 2s ease-in-out 0.05s infinite" }}>
          <Box sx={{ px: 2.5, py: 1.25, borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(109,35,35,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Box sx={{ width: 13, height: 13, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.2)" }} /><Bone w={160} h={10} /></Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Bone w={50} h={9} /><Bone w={100} h={26} r={6} /></Box>
          </Box>
          <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5, flex: 1, overflowY: "hidden" }}>
            <Box><Bone w={130} h={10} sx={{ mb: 0.75 }} /><Bone w="100%" h={36} r={8} /></Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "4fr 8fr", gap: 1.5 }}>
              <Box><Bone w={80} h={10} sx={{ mb: 0.75 }} /><Bone w="100%" h={36} r={8} /></Box>
              <Box><Bone w={100} h={10} sx={{ mb: 0.75 }} /><Bone w="100%" h={36} r={8} /></Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr 90px", gap: 1, px: 1.5, py: 0.75, bgcolor: "rgba(109,35,35,0.04)", borderRadius: 1 }}>
              {[70, 90, 50].map((w, i) => <Bone key={i} w={w} h={9} />)}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Box key={i} sx={{ display: "grid", gridTemplateColumns: "140px 1fr 90px", gap: 1, px: 1.5, py: 0.85, borderRadius: 1.5, border: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(0,0,0,0.01)", animation: `laPulse 1.6s ease-in-out ${i * 0.07}s infinite` }}>
                  <Box><Bone w={55} h={12} sx={{ mb: 0.4 }} /><Bone w={75} h={8} /></Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Bone w={70} h={28} r={6} /></Box>
                  <Box sx={{ display: "flex", alignItems: "center" }}><Bone w="100%" h={30} r={6} /></Box>
                </Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ px: 2.5, pb: 2, pt: 1, borderTop: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}><Bone w="100%" h={40} r={8} /></Box>
        </Box>
        <Box sx={{ borderRadius: "12px", border: `1px solid rgba(109,35,35,0.12)`, overflow: "hidden", bgcolor: "#fff", height: "calc(100vh - 280px)", minHeight: 480, display: "flex", flexDirection: "column", animation: "laPulse 2s ease-in-out 0.1s infinite" }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(109,35,35,0.05)", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Box sx={{ width: 15, height: 15, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.2)" }} /><Bone w={180} h={12} /></Box>
              <Box sx={{ display: "flex", gap: 0.75 }}><Bone w={130} h={22} r={20} /><Bone w={56} h={28} r={6} /></Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}><Bone w="100%" h={32} r={8} /><Bone w={130} h={32} r={8} sx={{ flexShrink: 0 }} /></Box>
          </Box>
          <Box sx={{ flex: 1, overflowY: "hidden", p: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <Box key={i} sx={{ p: 1.75, borderRadius: 2, border: "1px solid rgba(109,35,35,0.12)", bgcolor: "#fff", display: "flex", flexDirection: "column", gap: 0.75, animation: `laPulse 1.6s ease-in-out ${i * 0.06}s infinite` }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "rgba(109,35,35,0.1)", flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}><Bone w="85%" h={12} sx={{ mb: 0.4 }} /><Box sx={{ display: "flex", gap: 0.4 }}><Bone w={40} h={9} /><Bone w={32} h={14} r={20} /><Bone w={36} h={14} r={20} /></Box></Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.4, flexWrap: "wrap" }}>{[28, 32, 24].map((w, j) => <Bone key={j} w={w} h={18} r={4} />)}</Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", pt: 0.75, borderTop: "1px solid rgba(0,0,0,0.06)" }}><Bone w={70} h={9} /><Bone w={60} h={9} /></Box>
                </Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ px: 2, py: 0.75, borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "flex-end", flexShrink: 0 }}><Bone w={220} h={28} r={6} /></Box>
        </Box>
      </Box>
    </Box>
  </>
);

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

const assignFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    fontSize: "0.8rem",
    bgcolor: "#fff",
    fontFamily: T.poppins,
    minHeight: 34,
    "& fieldset": { borderColor: "rgba(0,0,0,0.1)" },
    "&:hover fieldset": { borderColor: alpha(T.accent, 0.45) },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: "1.5px" },
  },
};

const assignSelectSx = {
  borderRadius: "8px",
  fontSize: "0.8rem",
  bgcolor: "#fff",
  fontFamily: T.poppins,
  minHeight: 34,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.1)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(T.accent, 0.45) },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: T.accent, borderWidth: "1.5px" },
};

const AssignFieldLabel = ({ children, required = false, hint, compact = false }) => (
  <Box sx={{ mb: compact ? 0.35 : 0.85 }}>
    <Typography sx={{
      fontSize: compact ? "0.6rem" : "0.68rem", fontWeight: 700, color: alpha(T.text, 0.5),
      textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins, lineHeight: 1.2,
    }}>
      {children}
      {required && <Box component="span" sx={{ color: "#c62828", ml: 0.25 }}>*</Box>}
    </Typography>
    {hint && (
      <Typography sx={{ fontSize: compact ? "0.6rem" : "0.65rem", color: T.faint, fontFamily: T.poppins, mt: compact ? 0.25 : 0.35, lineHeight: 1.35 }}>
        {hint}
      </Typography>
    )}
  </Box>
);

const AssignFormPanel = ({ children, sx = {} }) => (
  <Box sx={{
    p: 1.15,
    borderRadius: "8px",
    bgcolor: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    ...sx,
  }}>
    {children}
  </Box>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_LEAVE_CODES = ["SL", "VL"];

const sortLeaveTypesForAssign = (list) => {
  const rank = (code) => {
    const i = PRIORITY_LEAVE_CODES.indexOf(String(code || "").trim().toUpperCase());
    return i === -1 ? 999 : i;
  };
  return [...list].sort((a, b) => {
    const rd = rank(a.leave_code) - rank(b.leave_code);
    if (rd !== 0) return rd;
    return String(a.leave_code || "").localeCompare(String(b.leave_code || ""));
  });
};
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

const normalizeMonth = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};
const sameMonth = (a, b) => {
  const na = normalizeMonth(a);
  const nb = normalizeMonth(b);
  if (na === null || nb === null) return false;
  return na === nb;
};
const semOrder = (s) => { if (!s) return 0; const l = String(s).toLowerCase(); if (l.includes("2nd")) return 2; if (l.includes("1st")) return 1; return 0; };

const periodLabel = (year, sem) => {
  const fallbackYear = parseInt(year, 10) || new Date().getFullYear();
  if (!sem) return `${fallbackYear}`;
  const monthName = MONTH_NAMES[String(sem)] || MONTH_NAMES[String(sem).padStart(2, "0")];
  if (monthName) return `${fallbackYear} ${monthName}`;
  return `${fallbackYear} ${sem}`;
};

const assignmentPeriodLabel = (row) => {
  if (!row) return "";
  return periodLabel(row.period_year, row.period_semester ?? row.period_month);
};

const toMonthSelectValue = (raw) => {
  const n = normalizeMonth(raw);
  if (n == null) return null;
  return String(n).padStart(2, "0");
};

const getStatusColor = (remaining, total) => { if (!total || total === 0) return "#9e9e9e"; const pct = (remaining / total) * 100; if (pct > 50) return "#2e7d32"; if (pct > 20) return "#ed6c02"; return "#d32f2f"; };
const hoursToDisplay = (hours, unit) => unit === "hours" ? parseFloat(hours || 0).toFixed(3) : (parseFloat(hours || 0) / 8).toFixed(3);
const displayToHours = (val, unit) => unit === "hours" ? parseFloat(val || 0) : parseFloat((parseFloat(val || 0) * 8).toFixed(3));
const hoursToLabel = (h, unit) => unit === "hours" ? `${parseFloat(h || 0).toFixed(3)} hrs` : `${(parseFloat(h || 0) / 8).toFixed(3)} days`;
const hoursToDaysInputStr = (hrs) => {
  const h = parseFloat(hrs);
  if (!Number.isFinite(h) || h === 0) return "";
  const days = parseFloat((h / 8).toFixed(10));
  if (!Number.isFinite(days) || days === 0) return "";
  if (Number.isInteger(days)) return String(days);
  return String(days).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
};
const getLeaveLabel = (code, types) => { if (!code) return "—"; const f = Array.isArray(types) ? types.find((t) => t.leave_code === code) : null; const d = f?.leave_description || f?.description || f?.leave_name || ""; return d ? `${code} — ${d}` : `${code}`; };

// ─── Sort periods: latest first ───────────────────────────────────────────────
const sortPeriodsDesc = (periods) =>
  [...periods].sort((a, b) => {
    if (b.period_year !== a.period_year) return b.period_year - a.period_year;
    const aM = parseInt(a.period_semester ?? a.period_month, 10) || 0;
    const bM = parseInt(b.period_semester ?? b.period_month, 10) || 0;
    if (aM !== bM) return bM - aM;
    const semDiff = semOrder(b.period_semester ?? b.period_month) - semOrder(a.period_semester ?? a.period_month);
    if (semDiff !== 0) return semDiff;
    return toNum(b.id) - toNum(a.id);
  });

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

// ─── EarningsBanner ───────────────────────────────────────────────────────────
const EarningsBanner = ({
  employeeNumber, leaveCode, periodYear, periodSemester, unit,
  baseRemainingHours = null, baseTotalHours = null,
  subtle = false,
}) => {
  const [earnings, setEarnings] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!employeeNumber || !leaveCode) return;
    let cancelled = false;
    setLoading(true);
    const token = localStorage.getItem("token");
    axios.get(`${API_BASE_URL}/api/earnings/leave/${employeeNumber}?all=true`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (cancelled) return;
        const all = Array.isArray(r.data?.earnings) ? r.data.earnings : [];
        const relevant = all.filter((e) => e.leave_code === leaveCode && e.earn_status !== "rejected");
        const filtered = relevant.filter((e) => !periodYear || String(e.period_year) === String(periodYear));
        setEarnings(filtered.length > 0 ? filtered : relevant.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [employeeNumber, leaveCode, periodYear]);

  if (loading) return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1, py: 0.4 }}>
      <CircularProgress size={10} sx={{ color: T.faint }} />
      <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>Checking earnings…</Typography>
    </Box>
  );
  if (earnings.length === 0) return null;

  const pendingEarnings  = earnings.filter((e) => e.earn_status === "pending");
  const approvedEarnings = earnings.filter((e) => e.earn_status === "approved");
  const pendingHrs  = pendingEarnings.reduce((s, e) => s + toNum(e.earned_hours), 0);
  const approvedHrs = approvedEarnings.reduce((s, e) => s + toNum(e.earned_hours), 0);
  const fmt = (h) => unit === "hours" ? `${h.toFixed(3)} hrs` : `${(h / 8).toFixed(3)} days`;

  return (
    <Box sx={{ mt: subtle ? 0 : 0.25 }}>
      <Box onClick={() => setExpanded((v) => !v)}
        sx={{
          display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap",
          px: subtle ? 0 : 1, py: subtle ? 0.25 : 0.5, borderRadius: subtle ? 0 : "6px",
          bgcolor: subtle ? "transparent" : (pendingHrs > 0 ? T.earnPending.bg : "rgba(46,125,50,0.06)"),
          border: subtle ? "none" : `1px solid ${pendingHrs > 0 ? T.earnPending.border : "rgba(46,125,50,0.22)"}`,
          cursor: "pointer",
        }}>
        <EarnIcon sx={{ fontSize: subtle ? 13 : 11, color: subtle ? T.muted : (pendingHrs > 0 ? T.earnPending.color : "#2e7d32"), flexShrink: 0 }} />
        <Typography sx={{ fontSize: subtle ? "0.72rem" : "0.62rem", fontWeight: subtle ? 500 : 700, color: subtle ? T.muted : (pendingHrs > 0 ? T.earnPending.color : "#2e7d32"), fontFamily: T.poppins }}>Earnings</Typography>
        {approvedHrs > 0 && <Typography sx={{ fontSize: subtle ? "0.7rem" : "0.58rem", fontWeight: 500, color: subtle ? T.text : T.earnApproved.color, fontFamily: T.poppins }}>{fmt(approvedHrs)} approved</Typography>}
        {pendingHrs > 0 && <Typography sx={{ fontSize: subtle ? "0.7rem" : "0.58rem", fontWeight: 500, color: subtle ? T.muted : T.earnPending.color, fontFamily: T.poppins }}>{fmt(pendingHrs)} pending</Typography>}
        <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins, ml: "auto" }}>{expanded ? "Hide" : "Show"}</Typography>
      </Box>
      {expanded && (
        <Box sx={{ mt: 0.4, display: "flex", flexDirection: "column", gap: 0.3 }}>
          {earnings.map((e) => {
            const isPending = e.earn_status === "pending";
            const meta = isPending ? T.earnPending : T.earnApproved;
            return (
              <Box key={e.id} sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1, py: 0.35, borderRadius: "5px", bgcolor: meta.bg, border: `1px solid ${meta.border}` }}>
                <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: meta.color, fontFamily: T.poppins }}>{fmt(toNum(e.earned_hours))}</Typography>
                <Typography sx={{ fontSize: "0.58rem", color: T.muted, fontFamily: T.poppins }}>{e.period_year}{e.period_month ? ` · M${e.period_month}` : ""}</Typography>
                <Typography sx={{ fontSize: "0.55rem", color: meta.color, fontFamily: T.poppins, ml: "auto" }}>{isPending ? "pending" : "in total"}</Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

// ─── CreditInput ───────────────────────────────────────────────────────────────
const CreditInput = ({ label, valueHours, onChangeHours, unit, required = false, disabled = false, color = T.accent, autoFilled = false }) => {
  const [inputVal, setInputVal] = useState("");
  const isFocused = useRef(false);

  const toDisplayStr = useCallback((hrs) => {
    if (hrs === "" || hrs == null || hrs === 0) return "";
    const n = parseFloat(hrs);
    if (isNaN(n) || n === 0) return "";
    if (unit === "hours") return String(n);
    return hoursToDaysInputStr(n) || "";
  }, [unit]);

  useEffect(() => { if (!isFocused.current) setInputVal(toDisplayStr(valueHours)); }, [valueHours, toDisplayStr]);
  useEffect(() => { if (!isFocused.current) setInputVal(toDisplayStr(valueHours)); }, [unit]); // eslint-disable-line

  const handleFocus = () => { isFocused.current = true; if (!inputVal || parseFloat(inputVal) === 0) setInputVal(""); };
  const handleChange = (e) => { setInputVal(e.target.value); };
  const handleBlur = () => {
    isFocused.current = false;
    const num = parseFloat(inputVal);
    const hrs = isNaN(num) || inputVal.trim() === "" ? 0 : unit === "hours" ? num : parseFloat((num * 8).toFixed(6));
    onChangeHours(hrs);
    setInputVal(hrs === 0 ? "" : toDisplayStr(hrs));
  };
  const handleKeyDown = (e) => { if (e.key === "Enter") e.currentTarget.blur(); };
  const rawNum = parseFloat(inputVal) || 0;
  const equivalentLabel = unit === "hours" ? `= ${(rawNum / 8).toFixed(3)} days` : `= ${(rawNum * 8).toFixed(3)} hrs`;

  return (
    <Box>
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: autoFilled ? "#2e7d32" : T.accent, mb: 0.75, fontFamily: T.poppins }}>
        {label}{required && <span style={{ color: "#c62828" }}> *</span>}
        {autoFilled && <span style={{ color: "#2e7d32", marginLeft: 6, fontSize: "0.65rem", fontWeight: 800 }}>● auto-filled</span>}
      </Typography>
      <FieldInput type="text" inputMode="decimal" size="small" fullWidth disabled={disabled} value={inputVal}
        onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
        sx={{ "& .MuiOutlinedInput-root": { borderColor: autoFilled ? "rgba(46,125,50,0.5)" : T.accentBorder, bgcolor: autoFilled ? "rgba(46,125,50,0.03)" : "#fff" }, "& .MuiInputBase-input": { color, fontWeight: 700 } }}
        InputProps={{ endAdornment: (<InputAdornment position="end"><Typography sx={{ fontSize: "0.68rem", color: T.faint, fontWeight: 700, whiteSpace: "nowrap" }}>{equivalentLabel}</Typography></InputAdornment>) }}
      />
    </Box>
  );
};

// ─── RemainingBalance ─────────────────────────────────────────────────────────
const RemainingBalance = ({ hoursLike, color, unit = "days", alignItems = "flex-end", large = false }) => {
  const h    = toNum(hoursLike);
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

// ─── Employee leave modal — table layout (tabs + dense rows) ───────────────────
const CURRENT = {
  main:   "#2e7d32",
  dark:   "#1b5e20",
  faint:  "rgba(46,125,50,0.10)",
  border: "rgba(46,125,50,0.28)",
};

const COMMUTED_ROW = {
  bg:     "rgba(109,35,35,0.07)",
  bgAlt:  "rgba(109,35,35,0.04)",
  border: "rgba(109,35,35,0.28)",
  stripe: "repeating-linear-gradient(-45deg, rgba(109,35,35,0.03) 0px, rgba(109,35,35,0.03) 4px, transparent 4px, transparent 10px)",
};

/** User-facing commutation terminology — not immediate cash; for in-service or retirement per salary grade */
const COMMUTATION_COPY = {
  action: "Commute",
  status: "Commuted",
  statusTooltip: "This balance has been recorded for commutation.",
  modalTitle: "Leave Commutation",
  modalSubtitle: "For in-service use or retirement benefit",
  amountLabel: "Balance for commutation",
  purpose:
    "Commutation is not an immediate cash payout. Unused leave is recorded so it can be used while the employee still has rendered hours, or applied upon retirement — with payment based on the employee's salary grade.",
  carryOverNote: (amt) =>
    `Opening balance of ${amt} carries from the prior period's remaining balance into the next assignment.`,
  irreversible:
    "This action is irreversible. The period will be locked and a commutation record will be created for HR processing.",
  locked: "Locked — balance recorded for commutation",
  confirm: "Confirm commutation",
  confirming: "Recording…",
};

const LEAVE_BALANCE_LABELS = {
  pCredit:   { label: "Current Balance", subtitle: "Opening balance for period" },
  deducted:  { label: "Deducted",          subtitle: "Absences & undertime" },
  adjusted:  { label: "Post-Deduction Balance", subtitle: "Current − Deducted" },
  earned:    { label: "Earned Balance",           subtitle: "Earnings Management" },
  remaining: { label: "Remaining Balance",        subtitle: "Post-Deduction + Earned" },
};

const LEAVE_BALANCE_COLUMNS = [
  { key: "period",     label: "Period",                         align: "left",  width: "14%" },
  { key: "prevCredit", ...LEAVE_BALANCE_LABELS.pCredit,         align: "right", width: "12%", groupPos: "start" },
  { key: "deducted",   ...LEAVE_BALANCE_LABELS.deducted,        align: "right", width: "13%", groupPos: "mid" },
  { key: "adjusted",   ...LEAVE_BALANCE_LABELS.adjusted,        align: "right", width: "13%", groupPos: "end" },
  { key: "earned",     ...LEAVE_BALANCE_LABELS.earned,          align: "right", width: "12%", groupPos: "start" },
  { key: "remaining",  ...LEAVE_BALANCE_LABELS.remaining,      align: "right", width: "13%", groupPos: "end" },
  { key: "actions",    label: "",                               align: "right", width: "11%" },
];

/** Fixed row height for split balance columns (P. Credit → Earned) */
const BALANCE_ROW_H = 72;
const BALANCE_MID_Y = BALANCE_ROW_H / 2;

const balanceRowLineColor = (highlight, commuted) => {
  if (commuted) return alpha(T.accent, 0.35);
  if (highlight) return alpha(CURRENT.main, 0.45);
  return "rgba(0,0,0,0.14)";
};

/** Top = row 1 above line; bottom = row 2 below line (earned only). Line at exact mid Y. */
const BalanceRowLayout = ({ slot = "top", children, showLine = false, highlight = false, commuted = false }) => {
  const line = balanceRowLineColor(highlight, commuted);

  if (slot === "center") {
    return (
      <Box sx={{
        height: BALANCE_ROW_H,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        justifyContent: "center",
        px: 1.5,
      }}>
        {children}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: BALANCE_ROW_H,
        position: "relative",
        px: 1.5,
        ...(showLine && {
          "&::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            top: BALANCE_MID_Y,
            borderTop: `1px solid ${line}`,
            pointerEvents: "none",
          },
        }),
      }}
    >
      {slot === "top" ? (
        <Box sx={{
          height: BALANCE_MID_Y,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          {children}
        </Box>
      ) : (
        <Box sx={{ height: BALANCE_ROW_H, display: "flex", flexDirection: "column" }}>
          <Box sx={{ height: BALANCE_MID_Y, flexShrink: 0 }} aria-hidden />
          <Box sx={{
            height: BALANCE_MID_Y,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: "hidden",
          }}>
            {children}
          </Box>
        </Box>
      )}
    </Box>
  );
};

const BalanceRowPlain = ({ children, align = "right" }) => (
  <Box sx={{
    height: BALANCE_ROW_H,
    display: "flex",
    flexDirection: "column",
    alignItems: align === "right" ? "flex-end" : "flex-start",
    justifyContent: "center",
    px: 1.5,
  }}>
    {children}
  </Box>
);

/** Visual outline for grouped column sets (deduction flow + earnings flow) */
const getColumnGroupSx = (groupPos, { isHeader = false, isCurrent = false } = {}) => {
  if (!groupPos) return {};
  const edge = isHeader
    ? "rgba(255,255,255,0.55)"
    : isCurrent
      ? alpha(CURRENT.main, 0.55)
      : alpha(T.accent, 0.38);
  const border = `2px solid ${edge}`;
  const sx = {};
  if (groupPos === "start" || groupPos === "both") sx.borderLeft = border;
  if (groupPos === "end" || groupPos === "both") sx.borderRight = border;
  if (isHeader) {
    sx.borderTop = border;
    sx.bgcolor = `${T.accentDark} !important`;
  } else if (!isCurrent) {
    sx.bgcolor = alpha(T.accent, 0.045);
  }
  return sx;
};

const BALANCE_HRS_EPS = 0.02;

const getCommutedHours = (period) => {
  if (!period) return 0;
  const hrs = toNum(period.commuted_hours);
  if (hrs > 0) return hrs;
  const days = toNum(period.commuted_days);
  if (days > 0) return days * 8;
  return 0;
};

/**
 * Running-ledger balance breakdown for one period row.
 */
const computePeriodBalanceFlow = (period, { earningsList } = {}) => {
  const usedHrs = toNum(period?.used_hours);

  if (isCommutedLocked(period)) {
    const commutedHrs = getCommutedHours(period);
    return {
      carriedHrs: 0,
      currentBalance: 0,
      usedHrs,
      earnedHrs: 0,
      adjustedHrs: 0,
      remHrs: 0,
      commutedHrs,
      computedRemainingHrs: 0,
    };
  }

  const balances = computeAssignmentBalances(period, { earningsList });
  return {
    carriedHrs: balances.currentBalance,
    currentBalance: balances.currentBalance,
    usedHrs: balances.usedHrs,
    earnedHrs: balances.earnedBalance,
    adjustedHrs: balances.postDeduction,
    remHrs: balances.remainingBalance,
    commutedHrs: 0,
    computedRemainingHrs: balances.remainingBalance,
  };
};

const LeaveBalanceHeaderCell = ({ label, subtitle, align, width, groupPos }) => (
  <TableCell
    align={align}
    sx={{
      py: 1.1, px: 1.5,
      bgcolor: `${T.accent} !important`,
      color: "#fff !important",
      borderBottom: `1px solid ${T.accentDark}`,
      fontFamily: T.poppins,
      verticalAlign: "bottom",
      width,
      ...getColumnGroupSx(groupPos, { isHeader: true }),
    }}
  >
    {label && (
      <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.25 }}>
        {label}
      </Typography>
    )}
    {subtitle && (
      <Typography sx={{ fontSize: "0.55rem", fontWeight: 500, color: "rgba(255,255,255,0.85)", lineHeight: 1.35, mt: label ? 0.25 : 0, textTransform: "none", letterSpacing: 0 }}>
        {subtitle}
      </Typography>
    )}
  </TableCell>
);
const fmtHours3 = (h) => toNum(h).toFixed(3);
const fmtDays3  = (h) => (toNum(h) / 8).toFixed(3);
const fmtPeriodVal = (h, unit) => (unit === "hours" ? `${fmtHours3(h)} h` : `${fmtDays3(h)} d`);
const fmtPeriodAlt = (h, unit) => (unit === "hours" ? `${fmtDays3(h)} d` : `${fmtHours3(h)} h`);

const PeriodAmtDisplay = ({ hours, unit, strong = false, highlight = false, muted = false, commuted = false }) => (
  <>
    <Typography sx={{
      fontSize: "0.8rem",
      fontWeight: strong && !commuted ? 700 : 500,
      color: commuted ? T.faint : strong ? CURRENT.main : muted ? T.muted : T.text,
      fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums",
      ...(commuted ? { fontStyle: "italic" } : {}),
    }}>
      {fmtPeriodVal(hours, unit)}
    </Typography>
    <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
      {fmtPeriodAlt(hours, unit)}
    </Typography>
  </>
);

const splitCellSx = (commuted, isActiveHighlight, groupPos) => ({
  py: 0.75, px: 1.5, verticalAlign: "top",
  borderBottom: `1px solid ${commuted ? COMMUTED_ROW.border : T.divider}`,
  bgcolor: commuted ? COMMUTED_ROW.bgAlt : isActiveHighlight ? CURRENT.faint : "inherit",
  ...getColumnGroupSx(groupPos, { isCurrent: isActiveHighlight }),
  ...(isActiveHighlight && groupPos ? { bgcolor: alpha(CURRENT.main, 0.06) } : {}),
});

const PeriodAmtCell = ({ hours, unit, strong = false, highlight = false, muted = false, commuted = false, groupPos, splitRow }) => {
  const isActiveHighlight = highlight && !commuted;
  const content = <PeriodAmtDisplay hours={hours} unit={unit} strong={strong} highlight={highlight} muted={muted} commuted={commuted} />;
  return (
  <TableCell
    align="right"
    sx={{
      ...splitCellSx(commuted, isActiveHighlight, groupPos),
      ...(splitRow ? { verticalAlign: "top", p: 0 } : { verticalAlign: "middle" }),
    }}
  >
    {splitRow ? (
      <BalanceRowLayout
        slot={splitRow}
        showLine
        highlight={isActiveHighlight}
        commuted={commuted}
      >
        {content}
      </BalanceRowLayout>
    ) : content}
  </TableCell>
  );
};

const CommutedStatusChip = ({ size = "sm" }) => (
  <Box
    sx={{
      display: "inline-flex", alignItems: "center", lineHeight: 1,
      px: size === "sm" ? 0.65 : 0.85,
      py: size === "sm" ? 0.12 : 0.2,
      borderRadius: "4px",
      border: `1px dashed ${alpha(T.accent, 0.45)}`,
      bgcolor: alpha(T.accent, 0.05),
      cursor: "default",
      userSelect: "none",
    }}
  >
    <Typography sx={{
      fontSize: size === "sm" ? "0.58rem" : "0.68rem",
      fontWeight: 600,
      color: T.accentMid,
      fontFamily: T.poppins,
      letterSpacing: "0.04em",
    }}>
      {COMMUTATION_COPY.status}
    </Typography>
  </Box>
);

const ForwardedStatusChip = ({ label, size = "sm" }) => (
  <Box
    sx={{
      display: "inline-flex", alignItems: "center", gap: 0.3, lineHeight: 1,
      px: size === "sm" ? 0.65 : 0.85,
      py: size === "sm" ? 0.12 : 0.2,
      borderRadius: "4px",
      border: "1px dashed rgba(92,107,192,0.45)",
      bgcolor: "rgba(92,107,192,0.07)",
      maxWidth: "100%",
    }}
  >
    <ForwardIcon sx={{ fontSize: size === "sm" ? 10 : 12, color: "#5c6bc0", flexShrink: 0 }} />
    <Typography sx={{
      fontSize: size === "sm" ? "0.58rem" : "0.68rem",
      fontWeight: 600,
      color: "#5c6bc0",
      fontFamily: T.poppins,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}>
      {label}
    </Typography>
  </Box>
);

const hoursClose = (a, b) => Math.abs(toNum(a) - toNum(b)) < BALANCE_HRS_EPS;

const getPeriodForwardInfo = (period, periodIndex, allPeriods) => {
  if (periodIndex <= 0 || isCommutedLocked(period)) return null;

  const { adjustedHrs, remHrs, computedRemainingHrs } = computePeriodBalanceFlow(period);
  const closingBalance = computedRemainingHrs;
  const newer = allPeriods[periodIndex - 1];
  const currentPeriod = allPeriods[0] ?? null;
  if (!newer || !currentPeriod) return null;

  const newerOpening = toNum(newer.allocated_hours);
  const newerCarry =
    toNum(newer.carried_forward_hours) > BALANCE_HRS_EPS
      ? toNum(newer.carried_forward_hours)
      : newerOpening;

  // Rolled forward when next period's Current Balance matches this period's closing balance
  const rolledToNext =
    newerOpening > BALANCE_HRS_EPS &&
    (hoursClose(newerOpening, remHrs) ||
      hoursClose(newerOpening, closingBalance) ||
      (remHrs <= BALANCE_HRS_EPS && closingBalance > BALANCE_HRS_EPS));

  if (!rolledToNext) return null;

  const forwardedHours = hoursClose(newerCarry, remHrs) || hoursClose(newerCarry, closingBalance)
    ? newerCarry
    : remHrs <= BALANCE_HRS_EPS
      ? closingBalance
      : remHrs;

  const targetIsCurrent =
    normalizePeriodKey(newer) === normalizePeriodKey(currentPeriod) ||
    Number(newer.id) === Number(currentPeriod.id);

  return {
    forwardedHours,
    targetLabel: periodLabel(newer.period_year, newer.period_semester),
    targetIsCurrent,
  };
};

const CommutedRemainingCell = ({ hours, unit, groupPos }) => (
  <TableCell
    align="right"
    sx={{
      ...splitCellSx(true, false, groupPos),
      py: 0, px: 0,
    }}
  >
    <BalanceRowLayout slot="center">
        <Typography sx={{
          fontSize: "0.8rem", fontWeight: 700, color: T.accent,
          fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums",
        }}>
          {fmtPeriodVal(hours, unit)}
        </Typography>
        <Typography sx={{ fontSize: "0.62rem", color: T.muted, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
          {fmtPeriodAlt(hours, unit)}
        </Typography>
        <Typography sx={{ fontSize: "0.6rem", color: T.accentMid, fontFamily: T.poppins, mt: 0.35, fontWeight: 600 }}>
          Commuted
        </Typography>
    </BalanceRowLayout>
  </TableCell>
);

const RemainingSplitCell = ({ hours, unit, forwardInfo, highlight = false, groupPos }) => {
  const isActiveHighlight = highlight;
  return (
    <TableCell
      align="right"
      sx={{ ...splitCellSx(false, isActiveHighlight, groupPos), py: 0, px: 0 }}
    >
      <BalanceRowLayout slot="center">
          {forwardInfo ? (
            <>
              <PeriodAmtDisplay hours={forwardInfo.forwardedHours} unit={unit} />
              <Tooltip
                title={`This balance was added to the P. Credit Balance of ${forwardInfo.targetIsCurrent ? "the current period" : forwardInfo.targetLabel}.`}
                placement="top"
                arrow
              >
                <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 0.35, mt: 0.45, maxWidth: "100%", cursor: "default", width: "100%" }}>
                  <ForwardIcon sx={{ fontSize: 11, color: "#5c6bc0", flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.6rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.3, textAlign: "right" }}>
                    {forwardInfo.targetIsCurrent ? "Forwarded to current period" : `Forwarded to ${forwardInfo.targetLabel}`}
                  </Typography>
                </Box>
              </Tooltip>
            </>
          ) : (
            <PeriodAmtDisplay hours={hours} unit={unit} strong={highlight} highlight={highlight} />
          )}
        </BalanceRowLayout>
    </TableCell>
  );
};

const LeavePeriodSectionRow = ({ label, variant = "section" }) => (
  <TableRow>
    <TableCell
      colSpan={7}
      sx={{
        py: variant === "divider" ? 1 : 0.65, px: 1.5,
        bgcolor: variant === "divider" ? "#eef0f3" : variant === "year" ? "#fafbfc" : variant === "current" ? "rgba(46,125,50,0.08)" : alpha(T.accent, 0.06),
        borderBottom: `1px solid ${variant === "divider" ? "rgba(0,0,0,0.12)" : variant === "current" ? CURRENT.border : T.divider}`,
        borderTop: variant === "divider" ? `2px solid rgba(0,0,0,0.08)` : "none",
      }}
    >
      <Typography sx={{
        fontSize: variant === "year" ? "0.72rem" : "0.62rem",
        fontWeight: 600,
        color: variant === "current" ? CURRENT.dark : variant === "year" ? T.text : T.muted,
        textTransform: "uppercase",
        letterSpacing: variant === "year" ? "0.04em" : "0.08em",
        fontFamily: T.poppins,
      }}>
        {label}
      </Typography>
    </TableCell>
  </TableRow>
);

const LeavePeriodTableRow = ({ period, unit, isCurrent, rowIndex, periodIndex, allPeriods, onTransferPeriod, commuteLoadingId, earningsList }) => {
  const isLocked = isCommutedLocked(period);
  const { carriedHrs, usedHrs, earnedHrs, adjustedHrs, remHrs, commutedHrs } = computePeriodBalanceFlow(period, { earningsList });
  const creditPool = Math.max(0, carriedHrs + earnedHrs);
  const pctUsed = isLocked ? 0 : (creditPool > 0 ? Math.min((usedHrs / creditPool) * 100, 100) : 0);
  const forwardInfo = getPeriodForwardInfo(period, periodIndex, allPeriods);

  return (
    <TableRow
      sx={{
        bgcolor: isLocked
          ? COMMUTED_ROW.bg
          : isCurrent
            ? "rgba(46,125,50,0.12)"
            : rowIndex % 2 === 1 ? "#fafbfc" : "#fff",
        backgroundImage: isLocked ? COMMUTED_ROW.stripe : "none",
        outline: isLocked
          ? `1px solid ${COMMUTED_ROW.border}`
          : isCurrent
            ? `1px solid ${CURRENT.border}`
            : "none",
        outlineOffset: -1,
        "& td": isCurrent && !isLocked ? { borderBottomColor: "rgba(46,125,50,0.15)" } : undefined,
        "&:hover": { bgcolor: isLocked ? COMMUTED_ROW.bg : isCurrent ? "rgba(46,125,50,0.16)" : "#f5f6f8" },
      }}
    >
      <TableCell sx={{
        py: 0, px: 0, verticalAlign: "top",
        borderBottom: `1px solid ${isLocked ? COMMUTED_ROW.border : T.divider}`,
        borderLeft: isLocked ? `3px solid ${T.accent}` : isCurrent ? `3px solid ${CURRENT.main}` : "3px solid transparent",
        bgcolor: isLocked ? COMMUTED_ROW.bgAlt : "inherit",
      }}>
        <BalanceRowPlain align="left">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography sx={{
              fontSize: "0.82rem",
              fontWeight: isCurrent && !isLocked ? 600 : 500,
              color: isLocked ? T.muted : isCurrent ? CURRENT.dark : T.text,
              fontFamily: T.poppins, lineHeight: 1.2,
            }}>
              {periodLabel(period.period_year, period.period_semester ?? period.period_month)}
            </Typography>
            {isCurrent && !isLocked && (
              <Box sx={{ px: 0.75, py: 0.15, borderRadius: "4px", bgcolor: CURRENT.main, lineHeight: 1 }}>
                <Typography sx={{ fontSize: "0.58rem", fontWeight: 600, color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: T.poppins }}>Current</Typography>
              </Box>
            )}
            {isLocked && (
              <Tooltip title={COMMUTATION_COPY.statusTooltip} placement="top" arrow>
                <Box component="span" sx={{ display: "inline-flex" }}>
                  <CommutedStatusChip size="sm" />
                </Box>
              </Tooltip>
            )}
          </Box>
          {!isLocked && creditPool > 0 && (
            <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, mt: 0.3 }}>{pctUsed.toFixed(0)}% utilized</Typography>
          )}
          </BalanceRowPlain>
      </TableCell>
      <PeriodAmtCell hours={carriedHrs} unit={unit} highlight={isCurrent} muted={!isCurrent && carriedHrs === 0} commuted={isLocked} groupPos="start" splitRow="top" />
      <PeriodAmtCell hours={usedHrs} unit={unit} highlight={isCurrent} commuted={isLocked} groupPos="mid" splitRow="top" />
      <PeriodAmtCell hours={adjustedHrs} unit={unit} highlight={isCurrent} strong={isCurrent && !isLocked} commuted={isLocked} groupPos="end" splitRow="top" />
      <PeriodAmtCell hours={earnedHrs} unit={unit} highlight={isCurrent} commuted={isLocked} groupPos="start" splitRow="bottom" />
      {isLocked ? (
        <CommutedRemainingCell hours={commutedHrs} unit={unit} groupPos="end" />
      ) : (
        <RemainingSplitCell
          hours={remHrs}
          unit={unit}
          forwardInfo={forwardInfo}
          highlight={isCurrent}
          groupPos="end"
        />
      )}
      <TableCell align="right" sx={{
        py: 0, px: 0, verticalAlign: "top",
        borderBottom: `1px solid ${isLocked ? COMMUTED_ROW.border : T.divider}`,
        bgcolor: isLocked ? COMMUTED_ROW.bgAlt : isCurrent ? CURRENT.faint : "inherit",
      }}>
        <BalanceRowPlain>
          {isCurrent && !isLocked && remHrs > 0 && (
          <Tooltip title={COMMUTATION_COPY.purpose} placement="top" arrow>
            <Button
              size="small"
              variant="contained"
              disabled={!!commuteLoadingId}
              onClick={(e) => onTransferPeriod(e, period)}
              startIcon={commuteLoadingId === period.id ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <CommutationIcon sx={{ fontSize: "14px !important" }} />}
              sx={{
                textTransform: "none", fontSize: "0.72rem", fontWeight: 600, fontFamily: T.poppins,
                py: 0.4, px: 1.5, minWidth: 0,
                bgcolor: T.accent, color: "#fff",
                boxShadow: `0 1px 4px ${alpha(T.accent, 0.35)}`,
                "&:hover": { bgcolor: T.accentDark, boxShadow: `0 2px 8px ${alpha(T.accent, 0.4)}` },
                "&.Mui-disabled": { bgcolor: alpha(T.accent, 0.45), color: "#fff" },
              }}
            >
              {commuteLoadingId === period.id ? "…" : COMMUTATION_COPY.action}
            </Button>
          </Tooltip>
          )}
        </BalanceRowPlain>
      </TableCell>
    </TableRow>
  );
};

const groupPreviousPeriodsByYear = (previousPeriods) => {
  const items = [];
  let lastYear = null;
  previousPeriods.forEach((period) => {
    const year = parseInt(period.period_year, 10) || 0;
    if (year !== lastYear) {
      items.push({ kind: "year", year });
      lastYear = year;
    }
    items.push({ kind: "period", period });
  });
  return items;
};

const EmployeeLeavesModal = ({
  open,
  onClose,
  employeeLeaves,
  leaveTypes,
  unit,
  setUnit,
  selectedLeaveType,
  onSelectLeaveType,
  deptMap,
  empCatMap,
  getEmployeeInfo,
  onTransferPeriod,
  commuteLoadingId,
  approvedEarnings = [],
}) => {
  const [earningsList, setEarningsList] = useState([]);

  useEffect(() => {
    if (!open || !employeeLeaves?.employeeNumber || !selectedLeaveType?.leave_code) {
      setEarningsList([]);
      return;
    }
    let cancelled = false;
    const token = localStorage.getItem("token");
    axios.get(
      `${API_BASE_URL}/api/earnings/leave/${employeeLeaves.employeeNumber}?all=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
      .then((r) => {
        if (cancelled) return;
        const all = Array.isArray(r.data?.earnings) ? r.data.earnings : [];
        setEarningsList(all.filter((e) => e.leave_code === selectedLeaveType.leave_code && e.earn_status !== "rejected"));
      })
      .catch(() => { if (!cancelled) setEarningsList([]); });
    return () => { cancelled = true; };
  }, [open, employeeLeaves?.employeeNumber, selectedLeaveType?.leave_code]);

  if (!employeeLeaves) return null;

  const empInfo   = getEmployeeInfo(employeeLeaves.employeeNumber);
  const empGender = empInfo?.sex || empInfo?.gender;
  const empDept   = deptMap[employeeLeaves.employeeNumber] || null;
  const empCat    = empCatMap[employeeLeaves.employeeNumber] || null;
  const activeTab = selectedLeaveType?.leave_code ?? false;

  const periods = selectedLeaveType
    ? sortPeriodsDescBalance(latestPeriodsByKey(selectedLeaveType.periods))
    : [];
  const latestPeriod = periods[0] ?? null;
  const currentPeriod = latestPeriod ?? null;
  const previousPeriods = periods.slice(1);
  const previousGrouped = groupPreviousPeriodsByYear(previousPeriods);
  const ltObj = selectedLeaveType ? leaveTypes.find((x) => x.leave_code === selectedLeaveType.leave_code) : null;
  const leaveTypeDesc = ltObj?.leave_description || selectedLeaveType?.leave_code || "";

  return (
    <Modal open={open} onClose={onClose} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 1, sm: 2 } }}>
      <Fade in={open}>
        <Paper
          elevation={0}
          sx={{
            width: "100%", maxWidth: 1140, height: "min(82vh, 720px)", display: "flex", flexDirection: "column",
            borderRadius: "10px", overflow: "hidden", fontFamily: T.poppins,
            border: `1px solid rgba(0,0,0,0.1)`, boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          }}
        >
          {/* Header */}
          <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", gap: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: "#fafbfc", flexShrink: 0 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: T.poppins, mb: 0.35 }}>
                Leave balance
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: "1.05rem", color: T.text, fontFamily: T.poppins, lineHeight: 1.25 }} noWrap>
                {employeeLeaves.fullName}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}>
                <Typography sx={{ fontSize: "0.75rem", color: T.muted, fontFamily: T.poppins }}>ID {employeeLeaves.employeeNumber}</Typography>
                {empGender && <GenderBadge gender={empGender} />}
                {empDept && <DeptBadge code={empDept} />}
                {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
              </Box>
            </Box>
            <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
              sx={{
                flexShrink: 0, bgcolor: "#fff",
                "& .MuiToggleButton-root": {
                  px: 1.5, py: 0.45, fontSize: "0.72rem", fontWeight: 500, textTransform: "none",
                  fontFamily: T.poppins, borderColor: "rgba(0,0,0,0.12)", color: T.muted,
                  "&.Mui-selected": { bgcolor: T.text, color: "#fff", borderColor: T.text, "&:hover": { bgcolor: "#333" } },
                },
              }}>
              <ToggleButton value="days">Days</ToggleButton>
              <ToggleButton value="hours">Hours</ToggleButton>
            </ToggleButtonGroup>
            <IconButton onClick={onClose} size="small" sx={{ color: T.muted, border: `1px solid ${T.divider}`, borderRadius: "6px", "&:hover": { bgcolor: "#fff" } }}>
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* Leave type tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, code) => {
              const lt = employeeLeaves.leaveTypes.find((x) => x.leave_code === code);
              if (lt) onSelectLeaveType(lt);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44, px: 2, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.accentBorder}`, flexShrink: 0,
              "& .MuiTab-root": {
                minHeight: 44, py: 0, px: 1.5, mr: 0.5, fontSize: "0.8rem", fontWeight: 500,
                textTransform: "none", fontFamily: T.poppins, color: T.muted,
                borderRadius: "6px 6px 0 0",
                transition: "background-color 0.15s, color 0.15s",
                "&:hover": { color: T.accent, bgcolor: alpha(T.accent, 0.08) },
              },
              "& .Mui-selected": {
                color: "#fff !important", fontWeight: 700,
                bgcolor: `${T.accent} !important`,
                "&:hover": { bgcolor: `${T.accentDark} !important`, color: "#fff !important" },
              },
              "& .MuiTabs-indicator": { bgcolor: T.accentDark, height: 3 },
            }}
          >
            {employeeLeaves.leaveTypes.map((lt) => {
              const remH = getLeaveTypeDisplayRemaining(lt.periods, approvedEarnings);
              const bal    = fmtPeriodVal(remH, unit);
              const ltObj  = leaveTypes.find((x) => x.leave_code === lt.leave_code);
              const desc   = ltObj?.leave_description || lt.leave_code;
              return (
                <Tab
                  key={lt.leave_code}
                  value={lt.leave_code}
                  label={
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                      <span>{lt.leave_code}</span>
                      <Typography component="span" sx={{ fontSize: "0.72rem", color: "inherit", opacity: 0.85, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{bal}</Typography>
                    </Box>
                  }
                  title={desc}
                />
              );
            })}
          </Tabs>

          {/* Period table */}
          <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            {!selectedLeaveType ? (
              <Box sx={{ py: 8, textAlign: "center" }}>
                <Typography sx={{ color: T.muted, fontSize: "0.85rem", fontFamily: T.poppins }}>No leave type selected.</Typography>
              </Box>
            ) : periods.length === 0 ? (
              <Box sx={{ py: 8, textAlign: "center" }}>
                <Typography sx={{ color: T.muted, fontSize: "0.85rem", fontFamily: T.poppins }}>No leave assignments on record for this type.</Typography>
              </Box>
            ) : (
              <>
                {leaveTypeDesc && (
                  <Box sx={{ px: 3, py: 1, borderBottom: `1px solid ${T.divider}`, bgcolor: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                    <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>
                      <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>{selectedLeaveType.leave_code}</Box>
                      {" — "}{leaveTypeDesc}
                    </Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>
                      {periods.length} period{periods.length !== 1 ? "s" : ""} on record
                    </Typography>
                  </Box>
                )}
                {currentPeriod && !isCommutedLocked(currentPeriod) && (() => {
                  const flow = computePeriodBalanceFlow(currentPeriod, { earningsList });
                  return (
                  <Box sx={{ px: 3, py: 1.25, borderBottom: `1px solid ${CURRENT.border}`, bgcolor: "rgba(46,125,50,0.06)", display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                    {[
                      { label: "Active period", value: periodLabel(currentPeriod.period_year, currentPeriod.period_semester ?? currentPeriod.period_month) },
                      { label: LEAVE_BALANCE_LABELS.pCredit.label, value: fmtPeriodVal(flow.carriedHrs, unit) },
                      { label: LEAVE_BALANCE_LABELS.adjusted.label, value: fmtPeriodVal(flow.adjustedHrs, unit) },
                      { label: LEAVE_BALANCE_LABELS.earned.label, value: fmtPeriodVal(flow.earnedHrs, unit) },
                      { label: LEAVE_BALANCE_LABELS.remaining.label, value: fmtPeriodVal(flow.remHrs, unit), accent: true },
                    ].map(({ label, value, accent }) => (
                      <Box key={label}>
                        <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.poppins }}>{label}</Typography>
                        <Typography sx={{ fontSize: "0.82rem", fontWeight: accent ? 700 : 600, color: accent ? CURRENT.main : T.text, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
                      </Box>
                    ))}
                  </Box>
                  );
                })()}
              <Table
                size="small"
                stickyHeader
                sx={{
                  tableLayout: "fixed",
                  minWidth: 980,
                  "& .MuiTableCell-head": {
                    bgcolor: `${T.accent} !important`,
                    color: "#fff !important",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    {LEAVE_BALANCE_COLUMNS.map((col) => (
                      <LeaveBalanceHeaderCell
                        key={col.key}
                        label={col.label}
                        subtitle={col.subtitle}
                        align={col.align}
                        width={col.width}
                        groupPos={col.groupPos}
                      />
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentPeriod && (
                    <>
                      <LeavePeriodSectionRow label="Current period" variant="current" />
                      <LeavePeriodTableRow
                        period={currentPeriod}
                        unit={unit}
                        isCurrent
                        rowIndex={0}
                        periodIndex={0}
                        allPeriods={periods}
                        onTransferPeriod={onTransferPeriod}
                        commuteLoadingId={commuteLoadingId}
                        earningsList={earningsList}
                      />
                    </>
                  )}
                  {previousPeriods.length > 0 && (
                    <>
                      <LeavePeriodSectionRow label="Previous balances" variant="divider" />
                      {previousGrouped.map((item, idx) => {
                        if (item.kind === "year") {
                          return <LeavePeriodSectionRow key={`year-${item.year}`} label={String(item.year)} variant="year" />;
                        }
                        const rowIndex = idx;
                        const periodIndex = periods.findIndex(
                          (p) => normalizePeriodKey(p) === normalizePeriodKey(item.period),
                        );
                        return (
                          <LeavePeriodTableRow
                            key={item.period.id}
                            period={item.period}
                            unit={unit}
                            isCurrent={false}
                            rowIndex={rowIndex}
                            periodIndex={periodIndex}
                            allPeriods={periods}
                            onTransferPeriod={onTransferPeriod}
                            commuteLoadingId={commuteLoadingId}
                            earningsList={earningsList}
                          />
                        );
                      })}
                    </>
                  )}
                </TableBody>
              </Table>
              </>
            )}
          </Box>

          {/* Earnings — current period only, pinned footer */}
          {selectedLeaveType && latestPeriod && !isCommutedLocked(latestPeriod) && (
            <Box sx={{ px: 3, py: 1, borderTop: `1px solid ${T.divider}`, bgcolor: "#fafbfc", flexShrink: 0 }}>
              <EarningsBanner
                employeeNumber={employeeLeaves.employeeNumber}
                leaveCode={selectedLeaveType.leave_code}
                periodYear={latestPeriod.period_year}
                periodSemester={latestPeriod.period_semester}
                unit={unit}
                baseRemainingHours={latestPeriod.remaining_hours}
                baseTotalHours={latestPeriod.total_hours}
                subtle
              />
            </Box>
          )}
        </Paper>
      </Fade>
    </Modal>
  );
};

// ─── BulkAutoAssignDialog ──────────────────────────────────────────────────────
const BulkAutoAssignDialog = ({ open, onClose, leaveTypes, assignments, employees, onSuccess, deptMap = {} }) => {
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
      opts.push({ value: y, label: y === new Date().getFullYear() ? `${y} — Current` : y === new Date().getFullYear() + 1 ? `${y} — Next Year` : String(y) });
    return opts;
  }, []);

  const allDeptCodes = useMemo(() => [...new Set(Object.values(deptMap).filter(Boolean))].sort(), [deptMap]);

  const employeesWithAssignments = useMemo(() => {
    const nums = [...new Set(assignments.map((a) => a.employeeNumber?.toString()))];
    return nums.map((num) => {
      const info = employees.find((e) => e.employeeNumber?.toString() === num);
      return { employeeNumber: num, fullName: info?.fullName || num, sex: info?.sex || info?.gender || null, deptCode: deptMap[num] || null };
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
    return filteredLeaveTypesForDropdown.filter((lt) => lt.leave_code.toLowerCase().includes(s) || (lt.leave_description || "").toLowerCase().includes(s));
  }, [filteredLeaveTypesForDropdown, ltSearch]);

  useEffect(() => {
    const validCodes = new Set(filteredLeaveTypesForDropdown.map((lt) => lt.leave_code));
    setSelectedLeaveCodes((prev) => prev.filter((c) => validCodes.has(c)));
  }, [filteredLeaveTypesForDropdown]);

  const selectedLeaveTypeObjects = useMemo(() => leaveTypes.filter((lt) => selectedLeaveCodes.includes(lt.leave_code)), [leaveTypes, selectedLeaveCodes]);

  const pendingByEmployee = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      if (a.period_year?.toString() === targetYear.toString()) return;
      if (toNum(a.remaining_hours) <= 0) return;
      const empNum = a.employeeNumber?.toString();
      if (!map[empNum]) {
        const info = employees.find((e) => e.employeeNumber?.toString() === empNum);
        map[empNum] = { employeeNumber: empNum, fullName: a.fullName || info?.fullName || empNum, leaveCodes: [], totalRemainingHours: 0 };
      }
      if (!map[empNum].leaveCodes.includes(a.leave_code)) map[empNum].leaveCodes.push(a.leave_code);
      map[empNum].totalRemainingHours += toNum(a.remaining_hours);
    });
    return Object.values(map);
  }, [assignments, targetYear, employees]);

  const pendingEmpNums = useMemo(() => new Set(pendingByEmployee.map((e) => e.employeeNumber)), [pendingByEmployee]);

  const allEmployeesAnnotated = useMemo(() => {
    return employeesWithAssignments.map((emp) => {
      const hasPending = pendingEmpNums.has(emp.employeeNumber);
      const pendingInfo = hasPending ? pendingByEmployee.find((p) => p.employeeNumber === emp.employeeNumber) : null;
      const alreadyDoneCount = selectedLeaveTypeObjects.filter((lt) =>
        isLeaveAllowedForGender(lt, emp.sex) && assignments.some((a) => a.employeeNumber?.toString() === emp.employeeNumber && a.leave_code === lt.leave_code && a.period_year?.toString() === targetYear.toString())
      ).length;
      const eligibleCount = selectedLeaveTypeObjects.filter((lt) => isLeaveAllowedForGender(lt, emp.sex)).length;
      return { ...emp, hasPending, pendingInfo, alreadyDoneCount, eligibleCount };
    });
  }, [employeesWithAssignments, pendingEmpNums, pendingByEmployee, selectedLeaveTypeObjects, assignments, targetYear]);

  const filteredEmployees = useMemo(() => {
    let list = allEmployeesAnnotated;
    if (filterDept !== "all") list = list.filter((e) => (e.deptCode || "") === filterDept);
    if (empSearch.trim()) { const s = empSearch.toLowerCase(); list = list.filter((e) => e.fullName.toLowerCase().includes(s) || e.employeeNumber.includes(s)); }
    if (empFilterStatus === "pending") list = list.filter((e) => e.hasPending);
    if (empFilterStatus === "ready")   list = list.filter((e) => !e.hasPending);
    return list;
  }, [allEmployeesAnnotated, empSearch, empFilterStatus, filterDept]);

  const preview = useMemo(() => {
    if (!selectedLeaveCodes.length) return { toCreate: 0, skipped: 0 };
    let toCreate = 0, toSkip = 0;
    selectedLeaveTypeObjects.forEach((lt) => {
      employeesWithAssignments.filter((emp) => isLeaveAllowedForGender(lt, emp.sex)).forEach((emp) => {
        const exists = assignments.some((a) => a.employeeNumber?.toString() === emp.employeeNumber && a.leave_code === lt.leave_code && a.period_year?.toString() === targetYear.toString());
        if (exists) toSkip++; else toCreate++;
      });
    });
    return { toCreate, skipped: toSkip };
  }, [selectedLeaveTypeObjects, employeesWithAssignments, assignments, targetYear, selectedLeaveCodes]);

  const allVisibleSelected = searchedLeaveTypes.length > 0 && searchedLeaveTypes.every((lt) => selectedLeaveCodes.includes(lt.leave_code));

  const handleToggleAll = () => {
    if (allVisibleSelected) { const visibleCodes = new Set(searchedLeaveTypes.map((lt) => lt.leave_code)); setSelectedLeaveCodes((prev) => prev.filter((c) => !visibleCodes.has(c))); }
    else { const toAdd = searchedLeaveTypes.map((lt) => lt.leave_code); setSelectedLeaveCodes((prev) => [...new Set([...prev, ...toAdd])]); }
  };
  const handleToggleOne = (code) => setSelectedLeaveCodes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);

  const handleRun = async () => {
    if (!selectedLeaveCodes.length || pendingByEmployee.length > 0) return;
    setRunning(true); setProgress(0); setResults(null);
    let created = 0, skipped = 0, errors = 0;
    const total = preview.toCreate;
    for (const lt of selectedLeaveTypeObjects) {
      const eligible = employeesWithAssignments.filter((emp) => isLeaveAllowedForGender(lt, emp.sex));
      for (const emp of eligible) {
        const exists = assignments.some((a) => a.employeeNumber?.toString() === emp.employeeNumber && a.leave_code === lt.leave_code && a.period_year?.toString() === targetYear.toString());
        if (exists) { skipped++; continue; }
        setProgressMsg(`${lt.leave_code} → ${emp.fullName}`);
        try {
          const prevRem = getPriorPeriodCarryForwardHours(
            assignments.filter((a) => a.employeeNumber?.toString() === emp.employeeNumber && a.leave_code === lt.leave_code),
            parseInt(targetYear, 10),
          );
          await axios.post(`${API_BASE_URL}/leaveRoute/leave_assignment`,
            { leave_code: lt.leave_code, employeeNumber: emp.employeeNumber, allocated_hours: prevRem, period_year: parseInt(targetYear, 10), period_semester: null },
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
    setResults(null); setProgress(0); setProgressMsg(""); setSelectedLeaveCodes([]); setFilterGender("all"); setFilterDept("all"); setEmpSearch(""); setLtSearch(""); setEmpFilterStatus("all");
    onClose();
  };

  const blocked = pendingByEmployee.length > 0;
  const canRun  = !running && selectedLeaveCodes.length > 0 && preview.toCreate > 0 && !blocked;

  if (results) return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "12px", fontFamily: T.poppins, overflow: "hidden" } }}>
      <Box sx={{ px: 4, pt: 4.5, pb: 3.5, textAlign: "center" }}>
        <Box sx={{ width: 52, height: 52, borderRadius: "50%", bgcolor: results.errors > 0 ? "rgba(237,108,2,0.1)" : "rgba(46,125,50,0.1)", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
          {results.errors > 0 ? <WarningIcon sx={{ fontSize: 24, color: "#ed6c02" }} /> : <CheckIcon sx={{ fontSize: 24, color: "#2e7d32" }} />}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#1a1a1a", mb: 0.5, fontFamily: T.poppins }}>{results.errors > 0 ? "Completed with errors" : "Assignments created"}</Typography>
        <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontFamily: T.poppins }}>Period: <strong>{targetYear}</strong></Typography>
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
      PaperProps={{ sx: { borderRadius: "14px", fontFamily: T.poppins, boxShadow: "0 24px 72px rgba(0,0,0,0.22)", width: "min(1320px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" } }}>
      <Box sx={{ px: 3.5, py: 2, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><AutoAssignIcon sx={{ fontSize: 16, color: "#fff" }} /></Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.92rem", fontFamily: T.poppins, lineHeight: 1.2 }}>Reset to Default</Typography>
            <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontFamily: T.poppins }}>Create new-period assignments for all employees with existing records</Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} disabled={running} size="small" sx={{ color: "rgba(255,255,255,0.65)", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}><Close sx={{ fontSize: 16 }} /></IconButton>
      </Box>
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* Column 1: Configuration */}
        <Box sx={{ width: 240, flexShrink: 0, borderRight: `1px solid ${T.divider}`, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#fafafa" }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: "#f3f3f3" }}><Typography sx={{ fontSize: "0.63rem", fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.poppins }}>Configuration</Typography></Box>
          <Box sx={{ px: 2, py: 2, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
            <Box>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.text, mb: 0.5, fontFamily: T.poppins }}>Period Year <span style={{ color: "#c62828" }}>*</span></Typography>
              <FormControl fullWidth size="small">
                <Select value={targetYear} onChange={(e) => !running && setTargetYear(e.target.value)} disabled={running} sx={{ ...selectSx, "& .MuiSelect-select": { py: "8px", fontWeight: 700, fontFamily: T.poppins, fontSize: "0.82rem" } }}>
                  {yearOptions.map((y) => <MenuItem key={y.value} value={y.value} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>{y.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            {allDeptCodes.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.text, mb: 0.5, fontFamily: T.poppins }}>Department</Typography>
                <FormControl fullWidth size="small">
                  <Select value={filterDept} onChange={(e) => !running && setFilterDept(e.target.value)} disabled={running} sx={{ ...selectSx, "& .MuiSelect-select": { py: "8px", fontFamily: T.poppins, fontSize: "0.82rem" } }}>
                    <MenuItem value="all" sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>All departments</MenuItem>
                    {allDeptCodes.map((c) => <MenuItem key={c} value={c} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}><Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><DomainIcon sx={{ fontSize: 13, color: T.accent }} />{c}</Box></MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            )}
            <Box>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.text, mb: 0.5, fontFamily: T.poppins }}>Gender Filter</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {[{ val: "all", label: "All genders", icon: <GenderIcon sx={{ fontSize: 13 }} /> }, { val: "male", label: "Male only", icon: <MaleIcon sx={{ fontSize: 13, color: filterGender === "male" ? "#fff" : "#1565C0" }} /> }, { val: "female", label: "Female only", icon: <FemaleIcon sx={{ fontSize: 13, color: filterGender === "female" ? "#fff" : "#c2185b" }} /> }].map(({ val, label, icon }) => (
                  <Box key={val} onClick={() => !running && setFilterGender(val)}
                    sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.75, borderRadius: "7px", cursor: running ? "default" : "pointer", fontSize: "0.78rem", fontWeight: filterGender === val ? 700 : 500, fontFamily: T.poppins, transition: "all 0.12s", bgcolor: filterGender === val ? (val === "male" ? "#1565C0" : val === "female" ? "#c2185b" : T.accent) : "#fff", color: filterGender === val ? "#fff" : T.text, border: `1px solid ${filterGender === val ? (val === "male" ? "#1565C0" : val === "female" ? "#c2185b" : T.accent) : T.divider}`, "&:hover": filterGender !== val && !running ? { bgcolor: "rgba(0,0,0,0.04)" } : {} }}>
                    {icon}<Typography sx={{ fontSize: "0.78rem", fontWeight: "inherit", fontFamily: T.poppins, color: "inherit" }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Divider sx={{ borderColor: T.divider }} />
            <Box>
              <Typography sx={{ fontSize: "0.63rem", fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.poppins, mb: 1 }}>Summary</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
                {[{ label: "Employees", val: filteredEmployees.length, color: T.accent }, { label: "Types Sel.", val: selectedLeaveCodes.length, color: "#1976d2" }, { label: "To Create", val: preview.toCreate, color: "#2e7d32" }, { label: "Exist", val: preview.skipped, color: T.muted }].map(({ label, val, color }) => (
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
                <Box><Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#bf360c", fontFamily: T.poppins }}>{pendingByEmployee.length} pending balance{pendingByEmployee.length !== 1 ? "s" : ""}</Typography><Typography sx={{ fontSize: "0.62rem", color: "#e65100", fontFamily: T.poppins }}>Resolve existing balances first</Typography></Box>
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
              <Typography sx={{ fontSize: "0.63rem", fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.poppins }}>Employees <span style={{ color: T.muted, fontWeight: 600, textTransform: "none", letterSpacing: 0, marginLeft: 4 }}>({filteredEmployees.length})</span></Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {[{ val: "all", label: "All" }, { val: "pending", label: "⚠ Pending" }, { val: "ready", label: "✓ Ready" }].map(({ val, label }) => (
                  <Box key={val} onClick={() => setEmpFilterStatus(val)}
                    sx={{ px: 0.75, py: 0.2, borderRadius: "5px", cursor: "pointer", fontSize: "0.6rem", fontWeight: 700, fontFamily: T.poppins, bgcolor: empFilterStatus === val ? (val === "pending" ? "rgba(230,81,0,0.15)" : val === "ready" ? "rgba(46,125,50,0.12)" : T.accentFaint) : "transparent", color: empFilterStatus === val ? (val === "pending" ? "#bf360c" : val === "ready" ? "#2e7d32" : T.accent) : T.faint, border: `1px solid ${empFilterStatus === val ? (val === "pending" ? "rgba(230,81,0,0.3)" : val === "ready" ? "rgba(46,125,50,0.25)" : T.accentBorder) : "transparent"}`, "&:hover": { bgcolor: "rgba(0,0,0,0.04)" } }}>{label}</Box>
                ))}
              </Box>
            </Box>
            <FieldInput size="small" placeholder="Search employees…" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} fullWidth InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 13, color: T.faint, mr: 0.5 }} /> }} />
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
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: emp.hasPending ? "#bf360c" : T.text, fontFamily: T.poppins }} noWrap>{emp.fullName}</Typography>{emp.sex && <GenderBadge gender={emp.sex} />}</Box>
                    <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>#{emp.employeeNumber}</Typography>
                    {emp.hasPending && emp.pendingInfo && <Typography sx={{ fontSize: "0.62rem", color: "#e65100", fontFamily: T.poppins, fontWeight: 700 }}>{emp.pendingInfo.totalRemainingHours.toFixed(1)} hrs pending</Typography>}
                  </Box>
                  <Box sx={{ flexShrink: 0 }}>
                    {emp.hasPending ? <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ed6c02", mx: "auto" }} />
                      : selectedLeaveCodes.length > 0 && emp.eligibleCount > 0 ? <Typography sx={{ fontSize: "0.6rem", color: emp.alreadyDoneCount === emp.eligibleCount ? "#9e9e9e" : "#2e7d32", fontFamily: T.poppins, fontWeight: 700 }}>{emp.alreadyDoneCount === emp.eligibleCount ? "done" : `+${emp.eligibleCount - emp.alreadyDoneCount}`}</Typography>
                      : <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ccc", mx: "auto" }} />}
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
              <Typography sx={{ fontSize: "0.63rem", fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.poppins }}>Leave Types <span style={{ color: T.muted, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>({selectedLeaveCodes.length} selected)</span></Typography>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Typography onClick={() => !running && handleToggleAll()} sx={{ fontSize: "0.7rem", color: T.accent, fontWeight: 700, cursor: running ? "default" : "pointer", fontFamily: T.poppins, "&:hover": { textDecoration: "underline" } }}>{allVisibleSelected ? "Deselect All" : "Select All"}</Typography>
                {selectedLeaveCodes.length > 0 && <Typography onClick={() => !running && setSelectedLeaveCodes([])} sx={{ fontSize: "0.7rem", color: T.muted, fontWeight: 700, cursor: running ? "default" : "pointer", fontFamily: T.poppins, "&:hover": { textDecoration: "underline" } }}>Clear</Typography>}
              </Box>
            </Box>
            <FieldInput size="small" fullWidth placeholder="Search leave types…" value={ltSearch} onChange={(e) => setLtSearch(e.target.value)} InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 13, color: T.faint, mr: 0.5 }} /> }} />
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5, display: "flex", flexDirection: "column", gap: 0.5, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
            {searchedLeaveTypes.map((lt) => {
              const isSelected  = selectedLeaveCodes.includes(lt.leave_code);
              const restriction = getLeaveGenderRestriction(lt);
              const ltDesc      = lt.leave_description || lt.leave_name || "";
              const eligibleEmps  = employeesWithAssignments.filter((emp) => isLeaveAllowedForGender(lt, emp.sex));
              const alreadyExists = eligibleEmps.filter((emp) => assignments.some((a) => a.employeeNumber?.toString() === emp.employeeNumber && a.leave_code === lt.leave_code && a.period_year?.toString() === targetYear.toString())).length;
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
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: toCreateCount > 0 ? "#2e7d32" : T.faint, fontFamily: T.poppins }}>{toCreateCount > 0 ? `+${toCreateCount}` : "—"}</Typography>
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
const BulkAmtReadonly = ({ hours, unit, preview = false }) => (
  <Box sx={{ textAlign: "right", minWidth: 62, flexShrink: 0, px: 0.5, py: 0.25 }}>
    <Typography sx={{
      fontSize: "0.78rem", fontWeight: 700,
      color: preview ? CURRENT.dark : T.text,
      fontFamily: T.poppins, lineHeight: 1.25, fontVariantNumeric: "tabular-nums",
    }}>
      {unit === "hours" ? `${toNum(hours).toFixed(3)} h` : `${(toNum(hours) / 8).toFixed(3)} d`}
    </Typography>
    <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
      {unit === "hours" ? `${(toNum(hours) / 8).toFixed(3)} d` : `${toNum(hours).toFixed(3)} h`}
    </Typography>
  </Box>
);

const BulkLeaveStatusChip = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: { color: T.muted },
    active:  { color: CURRENT.dark },
    warn:    { color: T.accentMid },
    muted:   { color: T.faint },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <Typography component="span" sx={{ fontSize: "0.58rem", fontWeight: 700, color: t.color, fontFamily: T.poppins, whiteSpace: "nowrap" }}>
      · {children}
    </Typography>
  );
};

const BulkLeaveRow = ({
  lt, unit, remainingHours, addHours, onChangeAdd, onAdd, adding, hasExisting, isCommuted, carryHours, balancePeriodLabel,
}) => {
  const [inputVal, setInputVal] = useState("");
  const isFocused = useRef(false);

  const toDisplayStr = useCallback((hrs) => {
    if (!hrs || hrs === 0) return "";
    if (unit === "hours") return String(parseFloat(hrs));
    return hoursToDaysInputStr(hrs) || "";
  }, [unit]);

  const parseInputToHrs = useCallback((raw) => {
    const num = parseFloat(raw);
    if (isNaN(num) || String(raw).trim() === "") return 0;
    return unit === "hours" ? num : parseFloat((num * 8).toFixed(6));
  }, [unit]);

  useEffect(() => { if (!isFocused.current) setInputVal(toDisplayStr(addHours)); }, [addHours, toDisplayStr]);
  useEffect(() => { if (!isFocused.current) setInputVal(toDisplayStr(addHours)); }, [unit]); // eslint-disable-line

  const handleFocus = () => { isFocused.current = true; if (!inputVal || parseFloat(inputVal) === 0) setInputVal(""); };
  const handleChange = (e) => {
    const v = e.target.value;
    setInputVal(v);
    onChangeAdd(parseInputToHrs(v));
  };
  const handleBlur = () => {
    isFocused.current = false;
    const hrs = parseInputToHrs(inputVal);
    if (hrs <= 0) { onChangeAdd(0); setInputVal(""); }
    else { onChangeAdd(hrs); setInputVal(toDisplayStr(hrs)); }
  };
  const handleAddClick = () => {
    const hrs = parseInputToHrs(inputVal);
    onChangeAdd(hrs);
    if (hrs > 0) onAdd();
  };
  const handleKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); handleAddClick(); } };

  const numericVal = parseFloat(inputVal) || 0;
  const equivalentAdornment = inputVal === "" ? (unit === "hours" ? "h" : "d") : unit === "hours" ? `= ${(numericVal / 8).toFixed(3)} d` : `= ${(numericVal * 8).toFixed(3)} h`;
  const inputPlaceholder = "0.000";
  const restriction = getLeaveGenderRestriction(lt);
  const pendingHrs = parseInputToHrs(inputVal) || addHours;
  const hasAdd = pendingHrs > 0;
  const previewRemaining = remainingHours + pendingHrs;
  const disabled = isCommuted || adding;

  return (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) auto minmax(88px, 1.1fr) auto",
      gap: 1,
      alignItems: "center",
      px: 1.15,
      py: 0.85,
      minHeight: 52,
      borderRadius: "8px",
      border: `1px solid ${isCommuted ? alpha(T.accent, 0.15) : hasExisting ? alpha(CURRENT.main, 0.2) : "rgba(0,0,0,0.08)"}`,
      bgcolor: isCommuted ? alpha(T.accent, 0.02) : hasExisting ? alpha(CURRENT.main, 0.03) : "#fff",
      "&:hover": { borderColor: disabled ? undefined : alpha(T.accent, 0.22) },
    }}>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.25 }}>
          <Typography sx={{ fontSize: "0.76rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins, flexShrink: 0 }}>
            {lt.leave_code}
          </Typography>
          {restriction === "male"   && <MaleIcon   sx={{ fontSize: 12, color: "#1565C0", flexShrink: 0 }} />}
          {restriction === "female" && <FemaleIcon sx={{ fontSize: 12, color: "#C2185B", flexShrink: 0 }} />}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.35, minWidth: 0, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "0.64rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.3 }} noWrap title={lt.leave_description || lt.leave_name || ""}>
            {lt.leave_description || lt.leave_name || ""}
          </Typography>
          {hasExisting && !isCommuted && balancePeriodLabel && (
            <BulkLeaveStatusChip tone="active">bal · {balancePeriodLabel}</BulkLeaveStatusChip>
          )}
          {!hasExisting && carryHours > 0 && balancePeriodLabel && (
            <BulkLeaveStatusChip tone="active">from · {balancePeriodLabel}</BulkLeaveStatusChip>
          )}
          {isCommuted && balancePeriodLabel && (
            <BulkLeaveStatusChip tone="warn">commuted · {balancePeriodLabel}</BulkLeaveStatusChip>
          )}
          {isCommuted && !balancePeriodLabel && (
            <BulkLeaveStatusChip tone="warn">commuted</BulkLeaveStatusChip>
          )}
        </Box>
      </Box>

      <BulkAmtReadonly hours={hasAdd ? previewRemaining : remainingHours} unit={unit} preview={hasAdd} />

      <FieldInput
        type="text"
        inputMode="decimal"
        size="small"
        disabled={disabled}
        value={inputVal}
        placeholder={inputPlaceholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        sx={{
          minWidth: 0, ...assignFieldSx,
          "& .MuiOutlinedInput-root": { ...assignFieldSx["& .MuiOutlinedInput-root"], minHeight: 36 },
          "& .MuiInputBase-input": { fontWeight: 600, color: T.text, fontSize: "0.8rem", py: "7px", fontVariantNumeric: "tabular-nums" },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontWeight: 600, fontFamily: T.poppins, whiteSpace: "nowrap" }}>
                {equivalentAdornment}
              </Typography>
            </InputAdornment>
          ),
        }}
      />
      <Button
        size="small"
        variant="contained"
        disableElevation
        disabled={disabled || !hasAdd}
        onClick={handleAddClick}
        sx={{
          flexShrink: 0,
          minWidth: 52,
          height: 36,
          textTransform: "none",
          fontSize: "0.72rem",
          fontWeight: 700,
          fontFamily: T.poppins,
          px: 1.25,
          borderRadius: "7px",
          bgcolor: T.accent,
          "&:hover": { bgcolor: T.accentDark },
          "&.Mui-disabled": { bgcolor: alpha(T.accent, 0.2), color: alpha("#fff", 0.85) },
        }}
      >
        {adding ? <CircularProgress size={13} sx={{ color: "#fff" }} /> : "Add"}
      </Button>
    </Box>
  );
};

// ─── CommutationWarningModal ───────────────────────────────────────────────────
const CommutationWarningModal = ({
  open, onClose, onConfirm,
  period,
  unit = "days",
  leaveTypes = [],
  loading = false,
}) => {
  const [earningsList, setEarningsList] = useState([]);

  useEffect(() => {
    if (!open || !period?.employeeNumber || !period?.leave_code) {
      setEarningsList([]);
      return;
    }
    let cancelled = false;
    const token = localStorage.getItem("token");
    axios.get(
      `${API_BASE_URL}/api/earnings/leave/${period.employeeNumber}?all=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
      .then((r) => {
        if (cancelled) return;
        const all = Array.isArray(r.data?.earnings) ? r.data.earnings : [];
        setEarningsList(all.filter((e) => e.leave_code === period.leave_code && e.earn_status !== "rejected"));
      })
      .catch(() => { if (!cancelled) setEarningsList([]); });
    return () => { cancelled = true; };
  }, [open, period?.employeeNumber, period?.leave_code]);

  if (!period) return null;

  const fmt = (h) => (unit === "hours" ? fmtPeriodVal(h, "hours") : fmtPeriodVal(h, "days"));
  const fmtAlt = (h) => (unit === "hours" ? fmtPeriodAlt(h, "hours") : fmtPeriodAlt(h, "days"));

  const { carriedHrs, usedHrs, earnedHrs, adjustedHrs, remHrs } = computePeriodBalanceFlow(period, { earningsList });
  const hasCarryOver = carriedHrs > 0;

  const ltObj = leaveTypes.find((lt) => lt.leave_code === period.leave_code);
  const leaveDesc = ltObj?.leave_description || ltObj?.leave_name || period.leave_code;
  const periodName = periodLabel(period.period_year, period.period_semester);

  const flowRows = [
    { label: LEAVE_BALANCE_LABELS.pCredit.label, value: carriedHrs },
    { label: LEAVE_BALANCE_LABELS.deducted.label, value: usedHrs },
    { label: LEAVE_BALANCE_LABELS.adjusted.label, value: adjustedHrs },
    { label: LEAVE_BALANCE_LABELS.earned.label, value: earnedHrs },
    { label: LEAVE_BALANCE_LABELS.remaining.label, value: remHrs, accent: true },
  ];

  return (
    <Modal open={open} onClose={!loading ? onClose : undefined} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, zIndex: 1400 }}>
      <Fade in={open}>
        <Paper
          elevation={0}
          sx={{
            width: "100%", maxWidth: 520, display: "flex", flexDirection: "column",
            borderRadius: "10px", overflow: "hidden", fontFamily: T.poppins,
            border: `1px solid rgba(0,0,0,0.1)`, boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
          }}
        >
          {/* Header */}
          <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: "#fafbfc", flexShrink: 0 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CommutationIcon sx={{ fontSize: 18, color: T.accent }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: T.text, fontFamily: T.poppins, lineHeight: 1.25 }}>
                {COMMUTATION_COPY.modalTitle}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>
                {COMMUTATION_COPY.modalSubtitle} · {leaveDesc} · {periodName}
              </Typography>
            </Box>
            <IconButton onClick={onClose} disabled={loading} size="small" sx={{ color: T.muted, border: `1px solid ${T.divider}`, borderRadius: "6px", "&:hover": { bgcolor: "#fff" } }}>
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* Body */}
          <Box sx={{ px: 3, py: 2.5, overflowY: "auto", flex: 1 }}>
            {/* Amount summary */}
            <Box sx={{ mb: 2.5, p: 2, borderRadius: "8px", border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }}>
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.poppins, mb: 0.5 }}>
                {COMMUTATION_COPY.amountLabel}
              </Typography>
              <Typography sx={{ fontWeight: 700, color: T.accent, fontSize: "1.75rem", lineHeight: 1, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
                {fmt(remHrs)}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins, mt: 0.35, fontVariantNumeric: "tabular-nums" }}>
                {fmtAlt(remHrs)}
              </Typography>
            </Box>

            {/* Balance breakdown */}
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins, mb: 0.75 }}>
                Current period breakdown
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0.75 }}>
                {flowRows.map(({ label, value, accent }) => (
                  <Box key={label} sx={{ p: 1, borderRadius: "6px", textAlign: "center", bgcolor: "#fafbfc", border: `1px solid ${T.divider}` }}>
                    <Typography sx={{ fontSize: "0.52rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.35, fontFamily: T.poppins, lineHeight: 1.2 }}>
                      {label}
                    </Typography>
                    <Typography sx={{ fontWeight: accent ? 700 : 600, color: accent ? T.accent : T.text, fontSize: "0.72rem", fontFamily: T.poppins, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                      {fmt(value)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Notes */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ px: 1.5, py: 1.25, borderRadius: "6px", bgcolor: "#fafbfc", border: `1px solid ${T.divider}`, display: "flex", gap: 1 }}>
                <InfoIcon sx={{ fontSize: 15, color: T.muted, flexShrink: 0, mt: 0.1 }} />
                <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.55 }}>
                  {COMMUTATION_COPY.purpose}
                </Typography>
              </Box>
              {hasCarryOver && (
                <Box sx={{ px: 1.5, py: 1.25, borderRadius: "6px", bgcolor: "#fafbfc", border: `1px solid ${T.divider}`, display: "flex", gap: 1 }}>
                  <InfoIcon sx={{ fontSize: 15, color: T.muted, flexShrink: 0, mt: 0.1 }} />
                  <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.55 }}>
                    {COMMUTATION_COPY.carryOverNote(fmt(carriedHrs))}
                  </Typography>
                </Box>
              )}
              <Box sx={{ px: 1.5, py: 1.25, borderRadius: "6px", bgcolor: alpha(T.accent, 0.04), border: `1px solid ${T.accentBorder}`, display: "flex", gap: 1 }}>
                <WarningIcon sx={{ fontSize: 15, color: T.accent, flexShrink: 0, mt: 0.1 }} />
                <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.55 }}>
                  {COMMUTATION_COPY.irreversible}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Footer */}
          <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#fafbfc", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Button
              onClick={onClose}
              disabled={loading}
              variant="outlined"
              sx={{ textTransform: "none", fontSize: "0.8rem", fontWeight: 500, fontFamily: T.poppins, borderColor: T.divider, color: T.muted, "&:hover": { borderColor: T.accentBorder, bgcolor: "#fff" } }}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              variant="contained"
              startIcon={loading ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <CommutationIcon sx={{ fontSize: "14px !important" }} />}
              sx={{
                textTransform: "none", fontSize: "0.8rem", fontWeight: 600, fontFamily: T.poppins,
                bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
                "&:hover": { bgcolor: T.accentDark },
                "&.Mui-disabled": { bgcolor: alpha(T.accent, 0.4), color: "#fff" },
              }}
            >
              {loading ? COMMUTATION_COPY.confirming : COMMUTATION_COPY.confirm}
            </Button>
          </Box>
        </Paper>
      </Fade>
    </Modal>
  );
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
const LeaveAssignment = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess("leave-assignment");
  const { socket, connected } = useSocket();

  const [assignments,       setAssignments]       = useState([]);
  const [approvedEarnings,  setApprovedEarnings]  = useState([]);
  const [leaveTypes,        setLeaveTypes]        = useState([]);
  const [employees,         setEmployees]         = useState([]);
  const [selectedEmployee,  setSelectedEmployee]  = useState(null);
  const [unit,              setUnit]              = useState("days");

  const [deptMap,    setDeptMap]    = useState({});
  const [deptFilter, setDeptFilter] = useState("all");
  const [empCatMap,  setEmpCatMap]  = useState({});

  const [bulkCredits,    setBulkCredits]    = useState({});
  const [bulkAddingCode, setBulkAddingCode] = useState(null);
  const [periodYear,     setPeriodYear]     = useState(new Date().getFullYear().toString());
  const [periodMonth,    setPeriodMonth]    = useState("");

  const [editAssignment,      setEditAssignment]      = useState(null);
  const [originalAssignment,  setOriginalAssignment]  = useState(null);
  const [isEditing,           setIsEditing]           = useState(false);
  const [editAllocatedHours,  setEditAllocatedHours]  = useState(0);
  const [creditUsageLog,      setCreditUsageLog]      = useState([]);
  const [creditUsageLoading,  setCreditUsageLoading]  = useState(false);

  const [searchTerm,    setSearchTerm]    = useState("");
  const [loading,       setLoading]       = useState(false);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [successOpen,   setSuccessOpen]   = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [error,         setError]         = useState("");
  const [commuteLoadingId, setCommuteLoadingId] = useState(null);
  const [employeeAssignments, setEmployeeAssignments] = useState([]);

  const [employeeLeavesModalOpen,    setEmployeeLeavesModalOpen]    = useState(false);
  const [selectedEmployeeLeaves,     setSelectedEmployeeLeaves]     = useState(null);
  const [selectedLeaveTypeInModal,   setSelectedLeaveTypeInModal]   = useState(null);

  const [commutationWarning, setCommutationWarning] = useState(null);

  const [recordsPage,         setRecordsPage]         = useState(0);
  const [recordsRowsPerPage,  setRecordsRowsPerPage]  = useState(24);
  const [viewMode,            setViewMode]            = useState("grid");

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchAssignments(), fetchApprovedEarnings(), fetchLeaveTypes(), fetchEmployees(), fetchDeptMap(), fetchEmpCatMap()]);
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
      (Array.isArray(r.data) ? r.data : []).forEach((item) => { if (item.employeeNumber && item.code) map[item.employeeNumber.toString()] = item.code; });
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

  const allDeptCodes = useMemo(() => [...new Set(Object.values(deptMap).filter(Boolean))].sort(), [deptMap]);

  const buildDisplayName = useCallback((e) => {
    const last = (e?.lastName      || "").trim();
    const first = (e?.firstName    || "").trim();
    const mid   = (e?.middleName   || "").trim();
    const ext   = (e?.nameExtension || e?.suffix || "").trim();
    if (!last && !first) return (e?.fullName || "").trim() || `#${e?.employeeNumber}`;
    const givenParts = [first, mid].filter(Boolean).join(" ");
    const extSuffix  = ext ? ` ${ext}` : "";
    return last ? `${last.toUpperCase()}, ${givenParts}${extSuffix}` : `${givenParts}${extSuffix}`;
  }, []);

  const employeeOptions = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    return list.map((e) => {
      const displayName = buildDisplayName(e);
      const empNo = (e?.employeeNumber || "").toString().trim();
      return { ...e, _displayName: displayName, _searchKey: `${displayName} ${empNo}`.toLowerCase(), _sortLast: (e?.lastName || "").trim().toLowerCase() };
    }).sort((a, b) => a._sortLast.localeCompare(b._sortLast));
  }, [employees, buildDisplayName]);

  const selectedEmployeeGender = useMemo(() => selectedEmployee?.sex || selectedEmployee?.gender || null, [selectedEmployee]);
  const filteredLeaveTypesForNew = useMemo(
    () => sortLeaveTypesForAssign(leaveTypes.filter((lt) => isLeaveAllowedForGender(lt, selectedEmployeeGender))),
    [leaveTypes, selectedEmployeeGender],
  );

  const carryOverMap = useMemo(() => {
    if (!selectedEmployee?.employeeNumber) return {};
    const empNum = selectedEmployee.employeeNumber.toString();
    const map = {};
    const periodMonthInt = normalizeMonth(periodMonth);
    filteredLeaveTypesForNew.forEach((lt) => {
      const rows = assignments.filter((a) => a.employeeNumber?.toString() === empNum && a.leave_code === lt.leave_code);
      const empEarnings = approvedEarnings.filter(
        (e) =>
          String(e.employee_number) === empNum &&
          String(e.leave_code || "").trim() === String(lt.leave_code || "").trim(),
      );
      map[lt.leave_code] = getPriorPeriodCarryForwardHours(
        rows,
        periodYear,
        periodMonthInt,
        [],
        empEarnings,
      );
    });
    return map;
  }, [selectedEmployee, filteredLeaveTypesForNew, assignments, periodYear, periodMonth, approvedEarnings]);

  const carrySourceMap = useMemo(() => {
    if (!selectedEmployee?.employeeNumber) return {};
    const empNum = selectedEmployee.employeeNumber.toString();
    const map = {};
    const periodMonthInt = normalizeMonth(periodMonth);
    filteredLeaveTypesForNew.forEach((lt) => {
      const rows = assignments.filter((a) => a.employeeNumber?.toString() === empNum && a.leave_code === lt.leave_code);
      const prior = getPriorPeriodSnapshot(rows, periodYear, periodMonthInt);
      map[lt.leave_code] = prior ? assignmentPeriodLabel(prior) : "";
    });
    return map;
  }, [selectedEmployee, filteredLeaveTypesForNew, assignments, periodYear, periodMonth]);

  const monthsWithBalanceSet = useMemo(() => {
    if (!selectedEmployee?.employeeNumber || !periodYear) return new Set();
    const empNum = selectedEmployee.employeeNumber.toString();
    const months = new Set();
    assignments.forEach((a) => {
      if (a.employeeNumber?.toString() !== empNum) return;
      if (a.period_year?.toString() !== periodYear.toString()) return;
      const mv = toMonthSelectValue(a.period_month ?? a.period_semester);
      if (mv) months.add(mv);
    });
    return months;
  }, [selectedEmployee, assignments, periodYear]);

  /** Prior month(s) whose balance rolls into the currently selected assignment period. */
  const monthsForwardingToSelected = useMemo(() => {
    const result = new Map();
    if (!selectedEmployee?.employeeNumber || !periodMonth || !periodYear) return result;

    const periodMonthInt = normalizeMonth(periodMonth);
    if (!periodMonthInt) return result;

    const targetLabel = periodLabel(parseInt(periodYear, 10) || new Date().getFullYear(), periodMonthInt);
    const empNum = selectedEmployee.employeeNumber.toString();
    const py = periodYear.toString();

    filteredLeaveTypesForNew.forEach((lt) => {
      if (toNum(carryOverMap[lt.leave_code]) <= 0) return;
      const rows = assignments.filter(
        (a) => a.employeeNumber?.toString() === empNum && a.leave_code === lt.leave_code,
      );
      const prior = getPriorPeriodSnapshot(rows, periodYear, periodMonthInt);
      if (!prior || isCommutedLocked(prior)) return;
      if (prior.period_year?.toString() !== py) return;
      const mv = toMonthSelectValue(prior.period_semester ?? prior.period_month);
      if (mv) result.set(mv, targetLabel);
    });

    return result;
  }, [
    selectedEmployee,
    periodYear,
    periodMonth,
    filteredLeaveTypesForNew,
    carryOverMap,
    assignments,
  ]);

  const periodAssignmentMap = useMemo(() => {
    if (!selectedEmployee?.employeeNumber) return {};
    const empNum = selectedEmployee.employeeNumber.toString();
    const map = {};
assignments.forEach((a) => {
  if (a.employeeNumber?.toString() !== empNum) return;
  if (a.voided_at) return;   // ← add this line
  if (a.period_year?.toString() !== periodYear?.toString()) return;
  if (periodMonth) {
    if (!sameMonth(a.period_month, periodMonth) && !sameMonth(a.period_semester, periodMonth)) return;
  }
  const prev = map[a.leave_code];
  if (!prev || Number(a.id) > Number(prev.id)) map[a.leave_code] = a;
});
    return map;
  }, [selectedEmployee, assignments, periodYear, periodMonth]);

  const duplicateSet = useMemo(() => new Set(Object.keys(periodAssignmentMap)), [periodAssignmentMap]);

  useEffect(() => {
    if (!selectedEmployee?.employeeNumber) { setEmployeeAssignments([]); return; }
    setEmployeeAssignments(assignments.filter((a) => a.employeeNumber?.toString() === selectedEmployee.employeeNumber?.toString()));
  }, [selectedEmployee, assignments]);

  useEffect(() => { setBulkCredits({}); setError(""); }, [selectedEmployee, periodYear, periodMonth]);

  useEffect(() => {
    const aid = editAssignment?.id;
    if (!aid) { setCreditUsageLog([]); return; }
    let cancelled = false;
    (async () => {
      setCreditUsageLoading(true);
      try {
        const r = await axios.get(`${API_BASE_URL}/leaveRoute/leave_credit_usage`, { params: { leave_assignment_id: aid } });
        if (!cancelled) setCreditUsageLog(Array.isArray(r.data) ? r.data : []);
      } catch { if (!cancelled) setCreditUsageLog([]); }
      finally { if (!cancelled) setCreditUsageLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [editAssignment?.id]);

  const fetchAssignments = async () => {
    try { const r = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`); setAssignments(Array.isArray(r.data) ? r.data : []); setError(""); }
    catch { setAssignments([]); setError("Failed to fetch assignments"); }
  };
  const fetchApprovedEarnings = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/earnings/leave/approved-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApprovedEarnings(Array.isArray(r.data) ? r.data : []);
    } catch {
      setApprovedEarnings([]);
    }
  };

  const fetchAssignmentsRef = useRef(fetchAssignments);
  const fetchApprovedEarningsRef = useRef(fetchApprovedEarnings);
  useEffect(() => {
    fetchAssignmentsRef.current = fetchAssignments;
    fetchApprovedEarningsRef.current = fetchApprovedEarnings;
  });

  const refreshLeaveAssignmentData = useCallback(() => {
    fetchAssignmentsRef.current();
    fetchApprovedEarningsRef.current();
  }, []);

  useEffect(() => {
    if (!socket || !connected) return;
    let debounceTimer = null;
    const handler = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refreshLeaveAssignmentData, 200);
    };
    socket.on("leaveAssignmentChanged", handler);
    socket.on("leaveRequestChanged", handler);
    socket.on("earningsChanged", handler);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off("leaveAssignmentChanged", handler);
      socket.off("leaveRequestChanged", handler);
      socket.off("earningsChanged", handler);
    };
  }, [socket, connected, refreshLeaveAssignmentData]);

  useEffect(() => {
    if (!selectedEmployee?.employeeNumber) return;
    refreshLeaveAssignmentData();
  }, [selectedEmployee?.employeeNumber, periodYear, periodMonth, refreshLeaveAssignmentData]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!selectedEmployee?.employeeNumber) return;
      refreshLeaveAssignmentData();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [selectedEmployee?.employeeNumber, refreshLeaveAssignmentData]);

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

  const isDuplicateAssignment = (empNum, leaveCode, year, excludeId = null, month = null) => {
    if (!empNum || !leaveCode) return false;
    const py = (year !== undefined && year !== null) ? year.toString() : new Date().getFullYear().toString();
    return assignments.some((a) => {
      if (excludeId && String(a.id) === String(excludeId)) return false;
      if (a.employeeNumber?.toString() !== empNum.toString()) return false;
      if (a.leave_code !== leaveCode) return false;
      if (a.period_year?.toString() !== py) return false;
      if (month) return sameMonth(a.period_month, month) || sameMonth(a.period_semester, month);
      return true;
    });
  };

  const handleAddLeaveCredit = async (lt) => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    if (!empNum) { setError("Please select an employee first"); return; }
    const addHrs = toNum(bulkCredits[lt.leave_code]);
    const carryHrs = toNum(carryOverMap[lt.leave_code]);
    const existing = periodAssignmentMap[lt.leave_code];
    if (addHrs <= 0 && !(carryHrs > 0 && !existing)) {
      setError("Enter an amount greater than 0, or open a period with a carry-forward balance");
      return;
    }

    if (existing && isCommutedLocked(existing)) {
      setError(`${lt.leave_code} is commuted for this period and cannot be modified`);
      return;
    }

    setBulkAddingCode(lt.leave_code);
    setError("");
    const token = localStorage.getItem("token");
    const periodMonthInt = normalizeMonth(periodMonth);

    try {
      if (existing) {
        const newAllocated = toNum(existing.allocated_hours) + addHrs;
        await axios.put(
          `${API_BASE_URL}/leaveRoute/leave_assignment/${existing.id}`,
          {
            leave_code: lt.leave_code,
            employeeNumber: empNum,
            allocated_hours: newAllocated,
            period_year: parseInt(periodYear, 10) || new Date().getFullYear(),
            period_semester: periodMonthInt ?? existing.period_semester ?? null,
            period_month: periodMonthInt ?? existing.period_month ?? null,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        const carryHrs = toNum(carryOverMap[lt.leave_code]);
        const newAllocated = carryHrs + addHrs;
        await axios.post(
          `${API_BASE_URL}/leaveRoute/leave_assignment`,
          {
            leave_code: lt.leave_code,
            employeeNumber: empNum,
            allocated_hours: newAllocated,
            period_year: parseInt(periodYear, 10) || new Date().getFullYear(),
            period_semester: periodMonthInt ?? null,
            period_month: periodMonthInt ?? null,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      setBulkCredits((p) => ({ ...p, [lt.leave_code]: 0 }));
      await fetchAssignments();
      setSuccessAction(existing ? "edit" : "adding");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add leave credits");
    } finally {
      setBulkAddingCode(null);
    }
  };

  const handleUpdate = async () => {
    const id      = editAssignment?.id;
    const empNum  = editAssignment?.employeeNumber?.toString().trim();
    const lc      = editAssignment?.leave_code;
    if (!id || !empNum || !lc) { setError("Please fill in all required fields"); return; }
    if (isDuplicateAssignment(empNum, lc, editAssignment.period_year, editAssignment.id)) { setError("This employee already has an assignment for this leave type and period"); return; }
    try {
      await axios.put(`${API_BASE_URL}/leaveRoute/leave_assignment/${id}`,
        { leave_code: lc, employeeNumber: empNum, allocated_hours: editAllocatedHours, period_year: parseInt(editAssignment.period_year, 10) || new Date().getFullYear(), period_semester: normalizeMonth(editAssignment?.period_semester ?? editAssignment?.period_month) ?? null, period_month: normalizeMonth(editAssignment?.period_month ?? editAssignment?.period_semester) ?? null },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError("");
      await fetchAssignments();
      if (selectedEmployeeLeaves) {
        const updated = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`);
        const all = Array.isArray(updated.data) ? updated.data : [];
        const empData = all.filter((a) => a.employeeNumber?.toString() === selectedEmployeeLeaves.employeeNumber?.toString());
        const grouped = empData.reduce((acc, a) => {
          if (!acc[a.leave_code]) acc[a.leave_code] = { leave_code: a.leave_code, periods: [] };
          acc[a.leave_code].periods.push(a);
          return acc;
        }, {});
        Object.values(grouped).forEach((g) => { g.periods = latestPeriodsByKey(g.periods); });
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

  const refreshModalState = useCallback(async (empNum, leaveCode) => {
    await fetchAssignments();
    const updated = await axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment`);
    const all = Array.isArray(updated.data) ? updated.data : [];
    const empData = all.filter((a) => a.employeeNumber?.toString() === empNum?.toString());
    const grouped = empData.reduce((acc, a) => {
      if (!acc[a.leave_code]) acc[a.leave_code] = { leave_code: a.leave_code, periods: [] };
      acc[a.leave_code].periods.push(a);
      return acc;
    }, {});
    Object.values(grouped).forEach((g) => { g.periods = latestPeriodsByKey(g.periods); });
    setSelectedEmployeeLeaves((prev) => {
      if (!prev) return prev;
      return { ...prev, leaveTypes: Object.values(grouped) };
    });
    if (leaveCode) {
      const r = grouped[leaveCode];
      if (r) setSelectedLeaveTypeInModal(r);
    }
    return grouped;
  }, []); // eslint-disable-line

  const handleOpenCommutationWarning = useCallback((period) => {
    if (!period?.id) return;
    const rem = toNum(period.remaining_hours);
    if (rem <= 0) return;

    const siblings = assignments.filter(
      (a) => a.employeeNumber?.toString() === period.employeeNumber?.toString() && a.leave_code === period.leave_code
    );

    const allPeriods = sortPeriodsDescBalance(latestPeriodsByKey(siblings));
    const currentPeriod = allPeriods[0] ?? null;
    if (!currentPeriod) return;

    const isCurrent = normalizePeriodKey(period) === normalizePeriodKey(currentPeriod);
    if (!isCurrent) return;

    setCommutationWarning({ period: currentPeriod });
  }, [assignments]);

  const handleTransferToCommutation = useCallback(async () => {
    if (!commutationWarning) return;
    const { period } = commutationWarning;
    if (!period?.id) return;

    const rem = toNum(period.remaining_hours);
    if (rem <= 0) { setCommutationWarning(null); return; }

    setCommuteLoadingId(period.id);
    setError("");

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      await axios.post(`${API_BASE_URL}/commutationRoute/leave_commutation/commute/${period.id}`, {}, { headers });

      setCommutationWarning(null);
      const empNum = period.employeeNumber?.toString();
      const leaveCode = period.leave_code;
      if (selectedEmployeeLeaves?.employeeNumber) {
        await refreshModalState(empNum, leaveCode);
      } else {
        await fetchAssignments();
      }

      setSuccessAction("edit");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 800);
    } catch (err) {
      setError("Commutation failed: " + (err.response?.data?.error || err.message));
    } finally {
      setCommuteLoadingId(null);
    }
  }, [commutationWarning, selectedEmployeeLeaves, refreshModalState]);

  const handleOpenModal = (assignment) => {
    setEditAssignment({ ...assignment }); setOriginalAssignment({ ...assignment });
    setEditAllocatedHours(toNum(assignment.allocated_hours));
    setIsEditing(false); setError("");
  };
  const handleCancelEdit = () => {
    setEditAssignment({ ...originalAssignment });
    setEditAllocatedHours(toNum(originalAssignment.allocated_hours));
    setIsEditing(false); setError("");
  };
  const handleCloseModal = () => {
    setEditAssignment(null); setOriginalAssignment(null); setIsEditing(false); setError("");
    setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null);
  };

  const filteredAssignments = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return assignments.filter((a) => {
      const matchSearch = (a.fullName?.toLowerCase() || "").includes(s) || (a.employeeNumber?.toString().toLowerCase() || "").includes(s) || (a.leave_code?.toString().toLowerCase() || "").includes(s);
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

  const getAssignRemainingHours = useCallback((leaveCode) => {
    return getAssignFormRemainingHours({
      existingPeriod: periodAssignmentMap[leaveCode] ?? null,
      carryOverHours: carryOverMap[leaveCode],
      earningsList: approvedEarnings,
      targetYear: periodYear,
      targetMonth: normalizeMonth(periodMonth),
      employeeNumber: selectedEmployee?.employeeNumber?.toString() ?? null,
      leaveCode,
    });
  }, [periodAssignmentMap, carryOverMap, approvedEarnings, periodYear, periodMonth, selectedEmployee]);

  const openEmployeeLeavesModal = (grp) => {
    const sortedLeaveTypes = [...grp.leaveTypes].sort((a, b) => a.leave_code.localeCompare(b.leave_code));
    setSelectedEmployeeLeaves({ ...grp, leaveTypes: sortedLeaveTypes });
    setSelectedLeaveTypeInModal(sortedLeaveTypes[0] || null);
    setEmployeeLeavesModalOpen(true);
  };

  if (accessLoading || pageLoading) return <LeaveAssignmentWireframe />;
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
        {sublabel && <Typography sx={{ fontSize: "0.58rem", color: alpha(color, 0.6), fontFamily: T.poppins, mt: 0.5, lineHeight: 1.3, fontStyle: "italic" }}>{sublabel}</Typography>}
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
                  <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>{assignments.length} {assignments.length === 1 ? "assignment" : "assignments"}</Typography>
                </Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => { fetchAssignments(); fetchApprovedEarnings(); fetchDeptMap(); fetchEmpCatMap(); }} sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, "&:hover": { bgcolor: alpha(T.accent, 0.15) } }}>
                    <RefreshIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          <Grid container spacing={2}>
            {/* LEFT: Add Assignment Form */}
            <Grid item xs={12} lg={4}>
              <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
                <Box sx={{
                  px: 2.5, py: 1.5, borderBottom: `1px solid ${T.divider}`,
                  display: "flex", alignItems: "center", gap: 1.5,
                  background: `linear-gradient(135deg, ${T.accentFaint} 0%, #fff 100%)`,
                  flexShrink: 0,
                }}>
                  <Box sx={{
                    width: 32, height: 32, borderRadius: 1.5,
                    bgcolor: alpha(T.accent, 0.1),
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <AddIcon sx={{ fontSize: 17, color: T.accent }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins, lineHeight: 1.2 }}>
                      Assign Leave to Employee
                    </Typography>
                    <Typography sx={{ fontSize: "0.65rem", color: T.muted, fontFamily: T.poppins }}>
                      Add P. Credit balance per leave type and period
                    </Typography>
                  </Box>
                  <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                    sx={{
                      "& .MuiToggleButton-root": {
                        px: 1.15, py: 0.3, border: `1px solid ${T.accentBorder}`,
                        fontSize: "0.65rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins,
                        textTransform: "none",
                        "&.Mui-selected": { bgcolor: T.accent, color: "#fff", borderColor: T.accent },
                      },
                    }}>
                    <ToggleButton value="hours"><HoursIcon sx={{ fontSize: 12, mr: 0.35 }} />Hours</ToggleButton>
                    <ToggleButton value="days"><DaysIcon sx={{ fontSize: 12, mr: 0.35 }} />Days</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Box sx={{
                  px: 1.5, py: 1.25, flexGrow: 1, overflowY: "auto",
                  bgcolor: "#f4f6f8",
                  "&::-webkit-scrollbar": { width: 5 },
                  "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(0,0,0,0.15)", borderRadius: 3 },
                }}>
                  {error && (
                    <Alert severity="error" sx={{ mb: 1.25, py: 0.25, borderRadius: "8px", fontFamily: T.poppins, "& .MuiAlert-message": { py: 0.5 } }}>
                      {error}
                    </Alert>
                  )}

                  <AssignFormPanel sx={{ mb: 1.25 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <AssignFieldLabel required compact hint="Last name, first name, or employee number">
                          Employee
                        </AssignFieldLabel>
                        <Autocomplete
                          value={selectedEmployee}
                          onChange={(e, v) => { setSelectedEmployee(v); setError(""); setBulkCredits({}); }}
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
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.15 }}>
                                  <Avatar sx={{ width: 28, height: 28, bgcolor: T.accent, fontSize: "0.65rem", fontWeight: 700, borderRadius: "6px" }}>{initials}</Avatar>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins, fontSize: "0.78rem", lineHeight: 1.2 }}>{name}</Typography>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                      <Typography variant="caption" sx={{ color: T.faint, fontFamily: T.poppins, fontSize: "0.65rem" }}>#{option.employeeNumber}</Typography>
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
                            <FieldInput
                              {...params}
                              size="small"
                              placeholder="Name or employee #…"
                              sx={assignFieldSx}
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                  <>
                                    <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5, ml: 0.15 }} />
                                    {params.InputProps.startAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                          slotProps={{ paper: { sx: { borderRadius: "8px", boxShadow: "0 6px 24px rgba(0,0,0,0.1)", border: "1px solid rgba(0,0,0,0.08)", mt: 0.25 } } }}
                          sx={{ width: "100%" }}
                        />
                        {selectedEmployee && (
                          <Box sx={{
                            display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap",
                            mt: 0.75, pt: 0.75, borderTop: "1px solid rgba(0,0,0,0.06)",
                          }}>
                            <Avatar sx={{ width: 26, height: 26, bgcolor: T.accent, fontSize: "0.6rem", fontWeight: 800, borderRadius: "6px" }}>
                              {`${selectedEmployee.lastName?.[0] || ""}${selectedEmployee.firstName?.[0] || ""}`.toUpperCase() || "?"}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, color: T.text, fontFamily: T.poppins, lineHeight: 1.15 }} noWrap>
                                {selectedEmployee._displayName || selectedEmployee.fullName || `${selectedEmployee.firstName || ""} ${selectedEmployee.lastName || ""}`.trim()}
                              </Typography>
                              <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}>#{selectedEmployee.employeeNumber}</Typography>
                            </Box>
                            {selectedEmployeeGender && <GenderBadge gender={selectedEmployeeGender} />}
                            {deptMap[selectedEmployee.employeeNumber?.toString()] && (
                              <DeptBadge code={deptMap[selectedEmployee.employeeNumber?.toString()]} />
                            )}
                            {empCatMap[selectedEmployee.employeeNumber?.toString()] && (
                              <EmpCatBadge label={empCatMap[selectedEmployee.employeeNumber?.toString()].label} colorHex={empCatMap[selectedEmployee.employeeNumber?.toString()].colorHex} />
                            )}
                          </Box>
                        )}
                        {selectedEmployee && !selectedEmployeeGender && (
                          <Typography sx={{ fontSize: "0.6rem", color: "#bf360c", fontFamily: T.poppins, mt: 0.4, display: "flex", alignItems: "center", gap: 0.35 }}>
                            <WarningIcon sx={{ fontSize: 11 }} /> Gender-restricted types hidden
                          </Typography>
                        )}
                      </Grid>

                      <Grid item xs={12}>
                        <Box sx={{ borderTop: "1px solid rgba(0,0,0,0.06)", pt: 1, mt: 0.25 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
                            <CalendarIcon sx={{ fontSize: 13, color: T.accent }} />
                            <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: alpha(T.text, 0.5), fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                              Assignment Period
                            </Typography>
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={4}>
                        <AssignFieldLabel required compact>Year</AssignFieldLabel>
                        <FieldInput
                          type="number"
                          size="small"
                          fullWidth
                          value={periodYear}
                          onChange={(e) => setPeriodYear(e.target.value)}
                          inputProps={{ min: 2020, max: 2035 }}
                          sx={assignFieldSx}
                        />
                      </Grid>
                      <Grid item xs={8}>
                        <AssignFieldLabel compact>Month</AssignFieldLabel>
                        <FormControl fullWidth size="small">
                          <Select
                            value={periodMonth}
                            onChange={(e) => setPeriodMonth(e.target.value)}
                            displayEmpty
                            sx={{
                              ...assignSelectSx,
                              "& .MuiSelect-select": {
                                py: "6px", fontFamily: T.poppins, fontSize: "0.8rem",
                                fontWeight: periodMonth ? 600 : 400,
                                color: periodMonth ? T.text : T.faint,
                              },
                            }}
                          >
                            {MONTHS.map((m) => {
                              const hasBalance = m.value && monthsWithBalanceSet.has(m.value);
                              const forwardTarget = m.value ? monthsForwardingToSelected.get(m.value) : null;
                              return (
                              <MenuItem key={m.value} value={m.value} sx={{ fontFamily: T.poppins, fontSize: "0.8rem", py: 0.5 }}>
                                {m.value ? (
                                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontFamily: T.poppins, fontSize: "0.8rem", flexShrink: 0 }}>{m.label}</Typography>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 1, minWidth: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                      {forwardTarget && (
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.35, flexShrink: 0 }}>
                                          <ForwardIcon sx={{ fontSize: 11, color: "#5c6bc0" }} />
                                          <Typography sx={{ fontSize: "0.58rem", fontWeight: 700, color: "#5c6bc0", fontFamily: T.poppins, whiteSpace: "nowrap" }}>
                                            forwarded to · {forwardTarget}
                                          </Typography>
                                        </Box>
                                      )}
                                      {hasBalance && (
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, flexShrink: 0 }}>
                                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: CURRENT.main }} />
                                          <Typography sx={{ fontSize: "0.58rem", fontWeight: 700, color: CURRENT.dark, fontFamily: T.poppins, whiteSpace: "nowrap" }}>
                                            has balance
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                ) : (
                                  <Typography sx={{ color: T.faint, fontStyle: "italic", fontFamily: T.poppins, fontSize: "0.8rem" }}>{m.label}</Typography>
                                )}
                              </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      </Grid>
                          </Grid>
                        </Box>
                      </Grid>

                      {(periodYear || periodMonth) && (
                        <Grid item xs={12}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                            <Chip
                              size="small"
                              icon={<CalendarIcon sx={{ fontSize: "12px !important" }} />}
                              label={`${periodYear}${selectedMonthLabel ? ` · ${selectedMonthLabel}` : ""}`}
                              sx={{
                                height: 22, fontSize: "0.65rem", fontWeight: 700, fontFamily: T.poppins,
                                bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`,
                                "& .MuiChip-icon": { color: T.accent },
                              }}
                            />
                            {duplicateSet.size > 0 && (
                              <Chip
                                size="small"
                                label={`${duplicateSet.size} type${duplicateSet.size !== 1 ? "s" : ""} · ${selectedMonthLabel || periodYear}`}
                                sx={{
                                  height: 22, fontSize: "0.62rem", fontWeight: 700, fontFamily: T.poppins,
                                  bgcolor: alpha(CURRENT.main, 0.1), color: CURRENT.dark,
                                  border: `1px solid ${alpha(CURRENT.main, 0.22)}`,
                                }}
                              />
                            )}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </AssignFormPanel>

                  {selectedEmployee ? (
                    filteredLeaveTypesForNew.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: "10px", fontFamily: T.poppins }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: T.poppins }}>
                          No eligible leave types for this employee&apos;s gender.
                        </Typography>
                      </Alert>
                    ) : (
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75, px: 0.25 }}>
                          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.text, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Leave Credits
                          </Typography>
                          <Chip
                            size="small"
                            label={`${filteredLeaveTypesForNew.length} type${filteredLeaveTypesForNew.length !== 1 ? "s" : ""}`}
                            sx={{ height: 22, fontSize: "0.65rem", fontWeight: 700, fontFamily: T.poppins, bgcolor: "#fff", border: "1px solid rgba(0,0,0,0.1)" }}
                          />
                        </Box>
                        <Box sx={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1fr) auto minmax(88px, 1.1fr) auto",
                          gap: 1,
                          px: 1.15,
                          py: 0.75,
                          bgcolor: alpha(T.accent, 0.88),
                          borderRadius: "8px 8px 0 0",
                        }}>
                          {["Leave Type", "Remaining", "Credits", ""].map((h, i) => (
                            h ? (
                            <Typography key={h} sx={{
                              fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.92)",
                              textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins,
                              textAlign: i === 1 ? "right" : "left",
                            }}>
                              {h}
                            </Typography>
                            ) : <span key="add-btn-spacer" />
                          ))}
                        </Box>
                        <Box sx={{
                          display: "flex", flexDirection: "column", gap: 0.6,
                          p: 0.85, bgcolor: "#fff", borderRadius: "0 0 8px 8px",
                          border: "1px solid rgba(0,0,0,0.08)", borderTop: "none",
                        }}>
                          {filteredLeaveTypesForNew.map((lt) => {
                            const existing = periodAssignmentMap[lt.leave_code];
                            const balancePeriodLabel = existing
                              ? assignmentPeriodLabel(existing)
                              : (carrySourceMap[lt.leave_code] || "");
                            return (
                              <BulkLeaveRow
                                key={lt.leave_code}
                                lt={lt}
                                unit={unit}
                                remainingHours={getAssignRemainingHours(lt.leave_code)}
                                addHours={toNum(bulkCredits[lt.leave_code])}
                                onChangeAdd={(hrs) => setBulkCredits((p) => ({ ...p, [lt.leave_code]: hrs }))}
                                onAdd={() => handleAddLeaveCredit(lt)}
                                adding={bulkAddingCode === lt.leave_code}
                                hasExisting={!!existing}
                                isCommuted={existing ? isCommutedLocked(existing) : false}
                                carryHours={toNum(carryOverMap[lt.leave_code])}
                                balancePeriodLabel={balancePeriodLabel}
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    )
                  ) : (
                    <Box sx={{
                      py: 5, px: 2, textAlign: "center",
                      borderRadius: "10px", bgcolor: "#fff",
                      border: "1px dashed rgba(0,0,0,0.12)",
                    }}>
                      <Box sx={{
                        width: 52, height: 52, borderRadius: "12px", mx: "auto", mb: 1.5,
                        bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <PersonIcon sx={{ fontSize: 26, color: alpha(T.accent, 0.45) }} />
                      </Box>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>
                        Select an employee
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: T.faint, mt: 0.5, fontFamily: T.poppins, maxWidth: 220, mx: "auto", lineHeight: 1.45 }}>
                        Choose an employee above to view eligible leave types and add credits
                      </Typography>
                    </Box>
                  )}
                </Box>
              </SectionCard>
            </Grid>

            {/* RIGHT: Records Panel */}
            <Grid item xs={12} lg={8}>
              <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>
                <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Reorder sx={{ fontSize: 17, color: T.accent }} />
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>Leave Assignment Records</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Box sx={{ px: 1.5, py: 0.4, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.15)}` }}>
                        <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>{employeeGroups.length} employees · {filteredAssignments.length} records</Typography>
                      </Box>
                      <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small"
                        sx={{ "& .MuiToggleButton-root": { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`, color: T.muted, "&.Mui-selected": { bgcolor: T.accentFaint, color: T.accent } } }}>
                        <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                        <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 14 }} /></ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <FieldInput size="small" placeholder="Search by name or employee number…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1 }} InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }} />
                    {allDeptCodes.length > 0 && (
                      <FormControl size="small" sx={{ minWidth: 130, flexShrink: 0 }}>
                        <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} displayEmpty startAdornment={<DomainIcon sx={{ fontSize: 14, color: T.accent, mr: 0.5, ml: 0.25 }} />}
                          sx={{ ...selectSx, "& .MuiSelect-select": { py: "7px", fontSize: "0.8rem", fontWeight: deptFilter !== "all" ? 700 : 400, color: deptFilter !== "all" ? T.accent : T.muted, display: "flex", alignItems: "center" } }}>
                          <MenuItem value="all" sx={{ fontFamily: T.poppins, fontSize: "0.82rem", color: T.muted }}>All depts</MenuItem>
                          {allDeptCodes.map((c) => <MenuItem key={c} value={c} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}><Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: T.text }}>{c}</Typography></Box></MenuItem>)}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                  {deptFilter !== "all" && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1 }}>
                      <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>Filtered by:</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: "5px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, cursor: "pointer" }} onClick={() => setDeptFilter("all")}>
                        <DomainIcon sx={{ fontSize: 10, color: T.accent }} /><Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>{deptFilter}</Typography><Close sx={{ fontSize: 10, color: T.accent }} />
                      </Box>
                    </Box>
                  )}
                </Box>

                <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                  {paginatedGroups.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: "center" }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}><EventNote sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} /></Box>
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: T.muted, mb: 0.5, fontFamily: T.poppins }}>{assignments.length === 0 ? "No Leave Assignments Found" : "No Matching Records"}</Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: T.faint, fontFamily: T.poppins }}>{assignments.length === 0 ? "Assign leave credits using the form on the left." : "Try adjusting your search or department filter."}</Typography>
                    </Box>
                  ) : viewMode === "grid" ? (
                    <Grid container spacing={1.5} alignItems="stretch">
                      {paginatedGroups.map((grp) => {
                        const remH = grp.leaveTypes.reduce(
                          (s, lt) => s + getLeaveTypeDisplayRemaining(lt.periods, approvedEarnings),
                          0,
                        );
                        const totalH = grp.leaveTypes.reduce((s, lt) => {
                          const latest = getLatestPeriodSnapshot(lt.periods);
                          const displayH = getLeaveTypeDisplayRemaining(lt.periods, approvedEarnings);
                          return s + displayH + toNum(latest?.used_hours);
                        }, 0);
                        const overallColor = getStatusColor(remH, totalH);
                        const initials = `${grp.lastName?.[0] || ""}${grp.firstName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const info = getEmployeeInfo(grp.employeeNumber);
                        const empGender = info?.sex || info?.gender;
                        const deptCode = deptMap[grp.employeeNumber] || null;
                        const empCat   = empCatMap[grp.employeeNumber] || null;
                        return (
                          <Grid item xs={12} sm={6} md={3} key={grp.employeeNumber} sx={{ display: "flex" }}>
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
                                  const latest = getLatestPeriodSnapshot(lt.periods);
                                  const displayH = getLeaveTypeDisplayRemaining(lt.periods, approvedEarnings);
                                  const sc = getStatusColor(displayH, displayH + toNum(latest?.used_hours));
                                  return (
                                    <Box key={lt.leave_code} sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: `${sc}12`, border: `1px solid ${sc}30` }}>
                                      <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: sc, whiteSpace: "nowrap", fontFamily: T.poppins }}>{lt.leave_code} {unit === "hours" ? `${displayH.toFixed(3)}h` : `${(displayH / 8).toFixed(3)}d`}</Typography>
                                    </Box>
                                  );
                                })}
                                {grp.leaveTypes.length > 3 && <Box sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}><Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>+{grp.leaveTypes.length - 3}</Typography></Box>}
                              </Box>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 0.75, borderTop: `1px solid ${T.divider}` }}>
                                <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>{grp.leaveTypes.length} leave type{grp.leaveTypes.length !== 1 ? "s" : ""}</Typography>
                                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>{unit === "hours" ? `${remH.toFixed(3)}h left` : `${(remH / 8).toFixed(3)}d left`}</Typography>
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
                        const remH = grp.leaveTypes.reduce(
                          (s, lt) => s + getLeaveTypeDisplayRemaining(lt.periods, approvedEarnings),
                          0,
                        );
                        const totalH = grp.leaveTypes.reduce((s, lt) => {
                          const latest = getLatestPeriodSnapshot(lt.periods);
                          const displayH = getLeaveTypeDisplayRemaining(lt.periods, approvedEarnings);
                          return s + displayH + toNum(latest?.used_hours);
                        }, 0);
                        const overallColor = getStatusColor(remH, totalH);
                        const initials = `${grp.lastName?.[0] || ""}${grp.firstName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const info = getEmployeeInfo(grp.employeeNumber);
                        const empGender = info?.sex || info?.gender;
                        const deptCode = deptMap[grp.employeeNumber] || null;
                        const empCat   = empCatMap[grp.employeeNumber] || null;
                        return (
                          <Box key={grp.employeeNumber} onClick={() => openEmployeeLeavesModal(grp)}
                            sx={{ px: 1.5, py: 1.25, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr", gap: 1, alignItems: "center", borderRadius: 1.5, cursor: "pointer", bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, border: "1px solid transparent", transition: "background 0.13s ease", "&:hover": { bgcolor: T.rowHover } }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: "0.68rem", fontWeight: 800, bgcolor: T.accent, color: "#fff", borderRadius: "6px", flexShrink: 0 }}>{initials}</Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }} noWrap>{grp.fullName}</Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>#{grp.employeeNumber}</Typography>{empGender && <GenderBadge gender={empGender} />}</Box>
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                              {deptCode ? <DeptBadge code={deptCode} /> : <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>—</Typography>}
                              {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
                            </Box>
                            <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "inline-block", width: "fit-content" }}>
                              <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>{grp.leaveTypes.length}</Typography>
                            </Box>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>{unit === "hours" ? `${remH.toFixed(3)}h` : `${(remH / 8).toFixed(3)}d`}</Typography>
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              {grp.leaveTypes.slice(0, 3).map((lt) => {
                                const latest = getLatestPeriodSnapshot(lt.periods);
                                const displayH = getLeaveTypeDisplayRemaining(lt.periods, approvedEarnings);
                                const sc = getStatusColor(displayH, displayH + toNum(latest?.used_hours));
                                return <Box key={lt.leave_code} sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: `${sc}12`, border: `1px solid ${sc}30` }}><Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: sc, fontFamily: T.poppins }}>{lt.leave_code}</Typography></Box>;
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
                      onPageChange={(e, p) => setRecordsPage(p)} rowsPerPage={recordsRowsPerPage}
                      onRowsPerPageChange={(e) => { setRecordsRowsPerPage(parseInt(e.target.value, 10)); setRecordsPage(0); }}
                      rowsPerPageOptions={[12, 24, 48, 96]} labelRowsPerPage="Rows:"
                      sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: "0.78rem", fontWeight: 600, color: T.accent, fontFamily: T.poppins } }}
                    />
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>

          <EmployeeLeavesModal
            open={employeeLeavesModalOpen}
            onClose={() => { setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null); }}
            employeeLeaves={selectedEmployeeLeaves}
            leaveTypes={leaveTypes}
            unit={unit}
            setUnit={setUnit}
            selectedLeaveType={selectedLeaveTypeInModal}
            onSelectLeaveType={setSelectedLeaveTypeInModal}
            deptMap={deptMap}
            empCatMap={empCatMap}
            getEmployeeInfo={getEmployeeInfo}
            commuteLoadingId={commuteLoadingId}
            onTransferPeriod={(e, period) => { e.stopPropagation(); handleOpenCommutationWarning(period); }}
            approvedEarnings={approvedEarnings}
          />

          {/* Edit Assignment Modal */}
          <Modal open={!!editAssignment} onClose={handleCloseModal} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <Fade in={!!editAssignment}>
              <Box sx={{ backgroundColor: "#fff", borderRadius: 3, width: "100%", maxWidth: "640px", maxHeight: "90vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", fontFamily: T.poppins }}>
                {editAssignment && (() => {
                  const isEditLocked = isCommutedLocked(editAssignment);
                  const editDept     = deptMap[editAssignment.employeeNumber?.toString()] || null;
                  const editEmpCat   = empCatMap[editAssignment.employeeNumber?.toString()] || null;
                  return (
                    <>
                      <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                        <Box sx={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><EditIcon sx={{ fontSize: 18, color: "#fff" }} /></Box>
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
                          <IconButton onClick={handleCloseModal} size="small" sx={{ color: "rgba(255,255,255,0.75)", "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}><Close sx={{ fontSize: 17 }} /></IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ px: 3.5, py: 3, overflowY: "auto", flexGrow: 1 }}>
                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}><Typography sx={{ fontFamily: T.poppins }}>{error}</Typography></Alert>}
                        {isEditLocked && (
                          <Alert severity="info" sx={{ mb: 2, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontWeight: 700, color: T.accent, mb: 0.25, fontFamily: T.poppins }}>{COMMUTATION_COPY.locked}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#666", fontFamily: T.poppins }}>To add new credits, create a new assignment for a new period.</Typography>
                          </Alert>
                        )}
                        <Box sx={{ mb: 2.5, p: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box>
                            <Typography sx={fieldLabelSx}>Still Available</Typography>
                            <RemainingBalance hoursLike={toNum(editAssignment.remaining_hours)} color={getStatusColor(toNum(editAssignment.remaining_hours), toNum(editAssignment.remaining_hours) + toNum(editAssignment.used_hours))} unit={unit} alignItems="flex-start" large />
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
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5, mb: 2.5 }}>
                          {[["Total Credits", toNum(editAssignment.remaining_hours) + toNum(editAssignment.used_hours), T.accent], ["Used So Far", toNum(editAssignment.used_hours), "#ed6c02"], ["Still Available", toNum(editAssignment.remaining_hours), getStatusColor(toNum(editAssignment.remaining_hours), toNum(editAssignment.remaining_hours) + toNum(editAssignment.used_hours))]].map(([label, val, color]) => (
                            <Box key={label} sx={{ p: 1.5, borderRadius: 2, textAlign: "center", bgcolor: `${color}08`, border: `1px solid ${color}20` }}>
                              <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, mb: 0.25, fontFamily: T.poppins }}>{label}</Typography>
                              <Typography sx={{ fontWeight: 900, color, fontSize: "0.95rem", lineHeight: 1, fontFamily: T.poppins }}>{unit === "hours" ? `${val.toFixed(3)}h` : `${(val / 8).toFixed(3)}d`}</Typography>
                              <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>{unit === "hours" ? `(${(val / 8).toFixed(3)}d)` : `(${val.toFixed(3)} hrs)`}</Typography>
                            </Box>
                          ))}
                        </Box>
                        {!isEditLocked && (
                          <Box sx={{ mb: 2 }}>
                            <EarningsBanner employeeNumber={editAssignment.employeeNumber} leaveCode={editAssignment.leave_code} periodYear={editAssignment.period_year} periodSemester={editAssignment.period_semester} unit={unit} baseRemainingHours={editAssignment.remaining_hours} baseTotalHours={editAssignment.total_hours} />
                          </Box>
                        )}
                        <Box sx={{ mb: 2.5 }}>
                          <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: T.accent, mb: 1, fontFamily: T.poppins }}>Credit usage log (this assignment)</Typography>
                          {creditUsageLoading ? (
                            <LinearProgress sx={{ borderRadius: 1 }} />
                          ) : creditUsageLog.length === 0 ? (
                            <Typography variant="body2" sx={{ color: T.muted, fontFamily: T.poppins }}>No ledger lines yet. Usage from HR-approved leave and approved earnings deductions will appear here after you run the DB migration for <Box component="span" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>leave_credit_usage</Box>.</Typography>
                          ) : (
                            <Table size="small" sx={{ border: `1px solid ${T.divider}`, borderRadius: 1, "& .MuiTableCell-root": { fontFamily: T.poppins, fontSize: "0.72rem" } }}>
                              <TableHead sx={{ bgcolor: T.accentFaint }}>
                                <TableRow><TableCell>When</TableCell><TableCell>Source</TableCell><TableCell align="right">Δ hrs</TableCell><TableCell align="right">Ref</TableCell></TableRow>
                              </TableHead>
                              <TableBody>
                                {creditUsageLog.map((row) => (
                                  <TableRow key={row.id} sx={{ opacity: row.voided_at ? 0.45 : 1 }}>
                                    <TableCell>{row.created_at ? String(row.created_at).replace("T", " ").slice(0, 19) : "—"}</TableCell>
                                    <TableCell>{row.source_type || "—"}{row.voided_at ? " (voided)" : ""}</TableCell>
                                    <TableCell align="right">{Number(row.hours_delta).toFixed(4)}</TableCell>
                                    <TableCell align="right">{row.source_id != null ? row.source_id : "—"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </Box>
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
                            <CreditInput label="Current Balance" valueHours={editAllocatedHours} onChangeHours={setEditAllocatedHours} unit={unit} disabled={isEditLocked} color="#1976d2" />
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
                        {!isEditLocked && <AccentButton onClick={() => handleDelete(editAssignment.id)} variant="outlined" startIcon={<DeleteIcon sx={{ fontSize: "13px !important" }} />} sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: "#ffcdd2", color: "#c62828", mr: "auto", "&:hover": { bgcolor: "rgba(198,40,40,0.04)", borderColor: "#c62828", transform: "none" } }}>Delete</AccentButton>}
                        <AccentButton onClick={handleCloseModal} variant="outlined" sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>{isEditLocked ? "Close" : "Cancel"}</AccentButton>
                        {!isEditLocked && <AccentButton onClick={handleUpdate} variant="contained" startIcon={<SaveIcon sx={{ fontSize: "13px !important" }} />} sx={{ fontSize: "0.8rem", fontFamily: T.poppins, bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark } }}>Save Changes</AccentButton>}
                      </Box>
                    </>
                  );
                })()}
              </Box>
            </Fade>
          </Modal>

          {/* Commutation Warning Modal */}
          <CommutationWarningModal
            open={!!commutationWarning}
            onClose={() => !commuteLoadingId && setCommutationWarning(null)}
            onConfirm={handleTransferToCommutation}
            period={commutationWarning?.period ?? null}
            unit={unit}
            leaveTypes={leaveTypes}
            loading={!!commuteLoadingId}
          />
        </Box>
      </Fade>
    </>
  );
};

export default LeaveAssignment;