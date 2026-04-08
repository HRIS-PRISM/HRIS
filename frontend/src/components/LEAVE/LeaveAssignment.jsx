import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  Modal,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Alert,
  InputAdornment,
  Card,
  Avatar,
  Divider,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  LinearProgress,
  Tooltip,
  Fade,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close,
  EventNote,
  Search as SearchIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  CalendarToday as CalendarIcon,
  MonetizationOn as CommutationIcon,
  CheckCircle as CheckIcon,
  AutoFixHigh as AutoAssignIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  Wc as GenderIcon,
  Warning as WarningIcon,
  PlayArrow as RunIcon,
  TableRows as TableRowsIcon,
  Refresh as RefreshIcon,
  AccessTime as HoursIcon,
  Today as DaysIcon,
  Reorder,
} from "@mui/icons-material";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";

// ─── Theme tokens (matching PersonTable exactly) ──────────────────────────────
const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover: "rgba(109,35,35,0.10)",
  headerGrad: "linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)",
  rowEven: "#ffffff",
  rowOdd: "rgba(109,35,35,0.025)",
  rowHover: "rgba(109,35,35,0.055)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  surface: "#ffffff",
  divider: "rgba(0,0,0,0.08)",
  poppins: "'Poppins', sans-serif",
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
`;

// ─── Styled primitives ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
  overflow: "hidden",
  background: T.surface,
});

const FieldInput = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    fontSize: "0.875rem",
    backgroundColor: "#fff",
    "& fieldset": { borderColor: T.accentBorder },
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
    "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: T.text },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.875rem",
  letterSpacing: "0.01em",
  transition: "all 0.18s ease",
  "&:hover": { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

const selectSx = {
  borderRadius: "8px",
  fontSize: "0.875rem",
  bgcolor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.accent },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: T.accent,
    borderWidth: "1.5px",
  },
};

const fieldLabelSx = {
  fontSize: "0.68rem",
  fontWeight: 700,
  color: alpha(T.accent, 0.45),
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  mb: 0.5,
  fontFamily: T.poppins,
};

const fieldValueSx = {
  fontSize: "0.82rem",
  color: T.text,
  p: "8px 12px",
  border: `1px solid ${T.accentBorder}`,
  borderRadius: "8px",
  backgroundColor: T.accentFaint,
  minHeight: 36,
  display: "flex",
  alignItems: "center",
  lineHeight: 1.4,
  fontFamily: T.poppins,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const semOrder = (s) => { if (!s) return 0; const l = String(s).toLowerCase(); if (l.includes("2nd")) return 2; if (l.includes("1st")) return 1; return 0; };
const periodLabel = (year, sem) => { if (!year) return "Unknown period"; return sem ? `${year} ${sem}` : `${year}`; };
const getStatusColor = (remaining, total) => { if (!total || total === 0) return "#9e9e9e"; const pct = (remaining / total) * 100; if (pct > 50) return "#2e7d32"; if (pct > 20) return "#ed6c02"; return "#d32f2f"; };
const hoursToDisplay = (hours, unit) => unit === "hours" ? parseFloat(hours || 0).toFixed(1) : (parseFloat(hours || 0) / 8).toFixed(2);
const displayToHours = (val, unit) => unit === "hours" ? parseFloat(val || 0) : parseFloat(val || 0) * 8;
const hoursToLabel = (h, unit) => unit === "hours" ? `${parseFloat(h || 0).toFixed(1)} hrs` : `${(parseFloat(h || 0) / 8).toFixed(2)} days`;
const isCommutedLocked = (row) => toNum(row?.remaining_hours) === 0 && toNum(row?.total_hours) > 0 && toNum(row?.used_hours) > 0 && toNum(row?.used_hours) >= toNum(row?.total_hours);
const getActivePeriods = (periods = []) => (Array.isArray(periods) ? periods : []).filter((p) => !isCommutedLocked(p));
const getLeaveTypeStatsActive = (periods) => getActivePeriods(periods).reduce((s, p) => ({ totalHours: s.totalHours + toNum(p.total_hours), usedHours: s.usedHours + toNum(p.used_hours), remainingHours: s.remainingHours + toNum(p.remaining_hours) }), { totalHours: 0, usedHours: 0, remainingHours: 0 });
const getLeaveGenderRestriction = (lt) => { if (!lt?.gender_restriction) return null; return lt.gender_restriction.toLowerCase(); };
const isLeaveAllowedForGender = (lt, g) => { const r = getLeaveGenderRestriction(lt); if (!r) return true; if (!g) return false; const gl = g.toLowerCase(); if (r === "male") return gl === "male" || gl === "m"; if (r === "female") return gl === "female" || gl === "f"; return true; };
const getLeaveLabel = (code, types) => { if (!code) return "—"; const f = Array.isArray(types) ? types.find((t) => t.leave_code === code) : null; const d = f?.leave_description || f?.description || f?.leave_name || ""; return d ? `${code} — ${d}` : `${code}`; };

// ─── Gender badge ─────────────────────────────────────────────────────────────
const GenderBadge = ({ gender, light = false }) => {
  if (!gender) return null;
  const isMale = gender.toLowerCase() === "male";
  if (light) return (
    <Chip size="small"
      icon={isMale ? <MaleIcon style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }} /> : <FemaleIcon style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }} />}
      label={gender}
      sx={{ height: 20, fontSize: "0.65rem", bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 900, border: "1px solid rgba(255,255,255,0.35)" }}
    />
  );
  return (
    <Chip size="small"
      icon={isMale ? <MaleIcon style={{ fontSize: 11, color: "#1565C0" }} /> : <FemaleIcon style={{ fontSize: 11, color: "#c2185b" }} />}
      label={gender}
      sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800, letterSpacing: 0.3, bgcolor: isMale ? "rgba(21,101,192,0.08)" : "rgba(194,24,91,0.08)", color: isMale ? "#1565C0" : "#c2185b", border: `1px solid ${isMale ? "rgba(21,101,192,0.25)" : "rgba(194,24,91,0.25)"}`, borderRadius: "4px" }}
    />
  );
};

// ─── Hours/Days input with unit toggle ────────────────────────────────────────
const CreditInput = ({ label, valueHours, onChangeHours, unit, required = false, disabled = false, color = T.accent, autoFilled = false }) => {
  const displayVal = unit === "hours" ? (valueHours === "" ? "" : parseFloat(valueHours || 0).toFixed(1)) : (valueHours === "" ? "" : (parseFloat(valueHours || 0) / 8).toFixed(2));
  const equivalentLabel = unit === "hours" ? `= ${(parseFloat(valueHours || 0) / 8).toFixed(2)} days` : `= ${parseFloat(valueHours || 0).toFixed(1)} hrs`;
  return (
    <Box>
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: autoFilled ? "#2e7d32" : T.accent, mb: 0.75, fontFamily: T.poppins }}>
        {label}{required && <span style={{ color: "#c62828" }}> *</span>}
        {autoFilled && <span style={{ color: "#2e7d32", marginLeft: 6, fontSize: "0.65rem", fontWeight: 800 }}>● auto-filled</span>}
      </Typography>
      <FieldInput
        type="number"
        size="small"
        fullWidth
        disabled={disabled}
        value={displayVal}
        onChange={(e) => {
          const raw = parseFloat(e.target.value) || 0;
          onChangeHours(unit === "hours" ? raw : raw * 8);
        }}
        inputProps={{ min: 0, step: unit === "hours" ? 1 : 0.5 }}
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
const RemainingBalance = ({ hoursLike, color, unit = "hours", alignItems = "flex-end", large = false }) => {
  const h = toNum(hoursLike);
  const days = (h / 8).toFixed(2);
  const hrs = h.toFixed(1);
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

// ─── CarryForwardSummary ──────────────────────────────────────────────────────
const CarryForwardSummary = ({ leaveCode, employeeAssignments, commutedHours, unit }) => {
  if (!leaveCode || !employeeAssignments?.length) return null;
  const allRows = employeeAssignments.filter((a) => a.leave_code === leaveCode);
  if (!allRows.length) return null;
  const sorted = [...allRows].sort((a, b) => { const yd = (b.period_year || 0) - (a.period_year || 0); if (yd !== 0) return yd; return semOrder(b.period_semester) - semOrder(a.period_semester); });
  const totalRemainingHours = sorted.reduce((s, r) => s + toNum(r.remaining_hours), 0);
  const hasCommuted = toNum(commutedHours) > 0;
  const effectiveHours = hasCommuted ? toNum(commutedHours) : totalRemainingHours;
  const hasBalance = effectiveHours > 0;
  return (
    <Box sx={{ border: `1px solid ${T.accentBorder}`, borderRadius: 2, overflow: "hidden", bgcolor: "#fafafa" }}>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", gap: 1.25 }}>
        <HistoryIcon sx={{ fontSize: 16, color: T.accent }} />
        <Typography sx={{ fontWeight: 700, color: T.accent, fontSize: "0.82rem", fontFamily: T.poppins }}>
          Leave History — {leaveCode}
        </Typography>
        <Typography sx={{ color: "#999", fontSize: "0.72rem", fontFamily: T.poppins }}>
          ({sorted.length} period{sorted.length !== 1 ? "s" : ""})
        </Typography>
        {hasCommuted && <Chip label="Has Commutation" size="small" icon={<CommutationIcon style={{ fontSize: 12 }} />} sx={{ ml: "auto", height: 22, fontSize: "0.65rem", bgcolor: T.accentFaint, color: T.accent, fontWeight: 700, fontFamily: T.poppins }} />}
      </Box>
      <Box sx={{ px: 2.5, py: 1.75 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 160, overflowY: "auto", pr: 1 }}>
          {sorted.map((row, idx) => {
            const remHrs = toNum(row.remaining_hours);
            const usedHrs = toNum(row.used_hours);
            const totalHrs = toNum(row.total_hours);
            const pct = totalHrs > 0 ? Math.min((usedHrs / totalHrs) * 100, 100) : 0;
            const barColor = getStatusColor(remHrs, totalHrs);
            const isLatest = idx === 0;
            return (
              <Box key={row.id} sx={{ py: 0.6, borderBottom: idx < sorted.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontWeight: 800, color: "#2c2c2c", fontSize: "0.78rem", fontFamily: T.poppins }}>{periodLabel(row.period_year, row.period_semester)}</Typography>
                    {isLatest && <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}><Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.accent, letterSpacing: 0.3, fontFamily: T.poppins }}>MOST RECENT</Typography></Box>}
                  </Box>
                  {remHrs <= 0 ? (
                    <Typography sx={{ fontWeight: 700, color: barColor, fontSize: "0.8rem", fontFamily: T.poppins }}>No balance</Typography>
                  ) : (
                    <RemainingBalance hoursLike={remHrs} color={barColor} unit={unit} alignItems="flex-end" />
                  )}
                </Box>
                <Box sx={{ position: "relative", height: 5, bgcolor: "rgba(0,0,0,0.07)", borderRadius: 4, overflow: "hidden", mb: 0.4 }}>
                  <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, bgcolor: barColor, borderRadius: 4, transition: "width 0.4s ease" }} />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "0.65rem", color: "#888", fontFamily: T.poppins }}>{remHrs <= 0 ? "Fully used" : `${hoursToLabel(remHrs, unit)} available`}</Typography>
                  <Typography sx={{ fontSize: "0.65rem", color: "#aaa", fontFamily: T.poppins }}>{hoursToLabel(usedHrs, unit)} used · {hoursToLabel(totalHrs, unit)} total</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
      <Box sx={{ px: 2.5, py: 1.75, bgcolor: hasBalance ? (hasCommuted ? T.accentFaint : "rgba(46,125,50,0.04)") : "rgba(0,0,0,0.02)", borderTop: `1px solid ${hasBalance ? (hasCommuted ? T.accentBorder : "rgba(46,125,50,0.14)") : "rgba(0,0,0,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: hasBalance ? (hasCommuted ? T.accent : "#2E7D32") : "#888", mb: 0.25, fontFamily: T.poppins }}>
            {hasBalance ? (hasCommuted ? "Carried balance from commutation." : "Unused leave will be carried over.") : "No unused leave to carry over."}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#777", fontFamily: T.poppins }}>
            {hasBalance ? 'The "Carry-Over" field above is auto-filled.' : "All allocated leave was used in prior periods."}
          </Typography>
        </Box>
        {hasBalance && (
          <Box sx={{ flexShrink: 0, textAlign: "center", px: 2.5, py: 1, bgcolor: hasCommuted ? T.accentFaint : "rgba(46,125,50,0.09)", border: `1px solid ${hasCommuted ? T.accentBorder : "rgba(46,125,50,0.2)"}`, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 900, color: hasCommuted ? T.accent : "#2E7D32", fontSize: "1.3rem", lineHeight: 1, fontFamily: T.poppins }}>
              {unit === "hours" ? `${effectiveHours.toFixed(1)}h` : `${(effectiveHours / 8).toFixed(2)}d`}
            </Typography>
            <Typography sx={{ fontSize: "0.65rem", color: hasCommuted ? T.accentMid : "#4a9d55", fontWeight: 700, mt: 0.25, fontFamily: T.poppins }}>
              carry forward
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── CommuteDialog ────────────────────────────────────────────────────────────
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
              <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", lineHeight: 1.2, fontFamily: T.poppins }}>Commute Leave Balance</Typography>
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
            ["Employee", period?.fullName || period?.employeeNumber],
            ["Leave Code", period?.leave_code],
            ["Period", periodLabel(period?.period_year, period?.period_semester)],
            ["Balance to Commute", `${remHrs.toFixed(1)} hrs (${(remHrs / 8).toFixed(2)} days)`],
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.6, borderBottom: "1px solid rgba(0,0,0,0.05)", "&:last-child": { borderBottom: "none" } }}>
              <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontWeight: 700, fontFamily: T.poppins }}>{label}</Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>{value}</Typography>
            </Box>
          ))}
        </Box>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins }}>Remaining leave balance will be moved to Leave Commutation and this assignment cleared.</Typography>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", gap: 1 }}>
        <AccentButton onClick={onClose} variant="outlined" sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
        <AccentButton onClick={onConfirm} variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <CommutationIcon sx={{ fontSize: "14px !important" }} />} sx={{ fontSize: "0.8rem", fontFamily: T.poppins, bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark }, "&:disabled": { bgcolor: "#ccc" } }}>
          {loading ? "Processing…" : "Confirm Commutation"}
        </AccentButton>
      </DialogActions>
    </Dialog>
  );
};

// ─── BulkAutoAssignDialog ─────────────────────────────────────────────────────
const BulkAutoAssignDialog = ({ open, onClose, leaveTypes, assignments, employees, commutationMap = {}, onSuccess }) => {
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [results, setResults] = useState(null);

  const employeesWithAssignments = useMemo(() => {
    const nums = [...new Set(assignments.map((a) => a.employeeNumber?.toString()))];
    return nums.map((num) => {
      const info = employees.find((e) => e.employeeNumber?.toString() === num);
      return { employeeNumber: num, fullName: info?.fullName || num, sex: info?.sex || info?.gender || null };
    });
  }, [assignments, employees]);

  const preview = useMemo(() => {
    if (!selectedLeaveTypes.length) return { total: 0, skipped: 0, toCreate: 0, byLeave: [] };
    let toCreate = 0, toSkip = 0;
    const byLeave = selectedLeaveTypes.map((lt) => {
      const restriction = getLeaveGenderRestriction(lt);
      const eligible = employeesWithAssignments.filter((emp) => isLeaveAllowedForGender(lt, emp.sex));
      let created = 0, skipped = 0;
      eligible.forEach((emp) => {
        const exists = assignments.some((a) => a.employeeNumber?.toString() === emp.employeeNumber && a.leave_code === lt.leave_code && a.period_year?.toString() === targetYear.toString());
        if (exists) skipped++; else created++;
      });
      toCreate += created; toSkip += skipped;
      return { code: lt.leave_code, desc: lt.leave_description, restriction, eligible: eligible.length, toCreate: created, toSkip: skipped };
    });
    return { total: toCreate + toSkip, toCreate, skipped: toSkip, byLeave };
  }, [selectedLeaveTypes, employeesWithAssignments, assignments, targetYear]);

  const pendingCommutations = useMemo(() => {
    const seen = new Set();
    const warnings = [];
    assignments.forEach((a) => {
      if (a.period_year?.toString() === targetYear.toString()) return;
      if (toNum(a.remaining_hours) <= 0) return;
      const key = `${a.employeeNumber}_${a.leave_code}`;
      if (toNum(commutationMap[key]) > 0) return;
      if (seen.has(key)) return;
      seen.add(key);
      const totalRem = assignments.filter((x) => x.employeeNumber?.toString() === a.employeeNumber?.toString() && x.leave_code === a.leave_code && x.period_year?.toString() !== targetYear.toString()).reduce((s, x) => s + toNum(x.remaining_hours), 0);
      const info = employees.find((e) => e.employeeNumber?.toString() === a.employeeNumber?.toString());
      warnings.push({ employeeNumber: a.employeeNumber, fullName: a.fullName || info?.fullName || a.employeeNumber, leaveCode: a.leave_code, remainingHours: totalRem });
    });
    return warnings;
  }, [assignments, commutationMap, targetYear, employees]);

  const handleRun = async () => {
    if (!selectedLeaveTypes.length || pendingCommutations.length > 0) return;
    setRunning(true); setProgress(0); setResults(null);
    let created = 0, skipped = 0, errors = 0;
    const total = preview.toCreate;
    for (const lt of selectedLeaveTypes) {
      const eligible = employeesWithAssignments.filter((emp) => isLeaveAllowedForGender(lt, emp.sex));
      for (const emp of eligible) {
        const exists = assignments.some((a) => a.employeeNumber?.toString() === emp.employeeNumber && a.leave_code === lt.leave_code && a.period_year?.toString() === targetYear.toString());
        if (exists) { skipped++; continue; }
        setProgressMsg(`Creating ${lt.leave_code} for ${emp.fullName}…`);
        try {
          const key = `${emp.employeeNumber}_${lt.leave_code}`;
          const commutedHrs = toNum(commutationMap[key]) * 8;
          const prevRem = commutedHrs > 0 ? commutedHrs : assignments.filter((a) => a.employeeNumber?.toString() === emp.employeeNumber && a.leave_code === lt.leave_code).reduce((s, a) => s + toNum(a.remaining_hours), 0);
          await axios.post(`${API_BASE_URL}/leaveRoute/leave_assignment`, { leave_code: lt.leave_code, employeeNumber: emp.employeeNumber, total_hours: 0, carried_forward_hours: prevRem, allocated_hours: 0, period_year: parseInt(targetYear, 10), period_semester: null }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
          created++;
        } catch { errors++; }
        setProgress(total > 0 ? Math.round(((created + errors) / total) * 100) : 100);
      }
    }
    setRunning(false); setProgress(100); setProgressMsg("");
    setResults({ created, skipped, errors });
    onSuccess?.();
  };

  const handleClose = () => { if (running) return; setResults(null); setProgress(0); setProgressMsg(""); setSelectedLeaveTypes([]); onClose(); };
  const toggleLT = (lt) => setSelectedLeaveTypes((p) => p.find((x) => x.leave_code === lt.leave_code) ? p.filter((x) => x.leave_code !== lt.leave_code) : [...p, lt]);
  const yearOptions = [];
  for (let y = new Date().getFullYear() - 2; y <= new Date().getFullYear() + 5; y++) yearOptions.push(y);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: "90vh", overflow: "hidden", fontFamily: T.poppins } }}>
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AutoAssignIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", lineHeight: 1.2, fontFamily: T.poppins }}>Reset to Default</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", fontFamily: T.poppins }}>Auto-create new period assignments for all employees with existing records</Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} disabled={running} size="small" sx={{ color: "rgba(255,255,255,0.75)", position: "relative", zIndex: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflowY: "auto" }}>
        {results ? (
          <Box sx={{ p: 3 }}>
            <Box sx={{ p: 3, borderRadius: 2, bgcolor: results.errors > 0 ? "rgba(237,108,2,0.06)" : "rgba(46,125,50,0.06)", border: `1px solid ${results.errors > 0 ? "rgba(237,108,2,0.2)" : "rgba(46,125,50,0.2)"}`, mb: 2 }}>
              <Typography sx={{ fontWeight: 700, color: results.errors > 0 ? "#ed6c02" : "#2e7d32", mb: 1.5, fontSize: "0.9rem", fontFamily: T.poppins }}>
                {results.errors > 0 ? "Completed with some errors" : "All done — assignments created"}
              </Typography>
              <Box sx={{ display: "flex", gap: 3 }}>
                {[["Created", results.created, "#2e7d32"], ["Skipped", results.skipped, T.muted], ["Errors", results.errors, "#d32f2f"]].map(([label, val, color]) => (
                  <Box key={label} sx={{ textAlign: "center" }}>
                    <Typography sx={{ fontWeight: 900, fontSize: "1.5rem", color, lineHeight: 1, fontFamily: T.poppins }}>{val}</Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontWeight: 700, fontFamily: T.poppins }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins }}>
                New credits set to <strong>0</strong> by default. Carry-over auto-filled from commutation or prior balance.
              </Typography>
            </Alert>
          </Box>
        ) : (
          <>
            {/* Step 1: Year */}
            <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: `1px solid ${T.divider}` }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff", fontFamily: T.poppins }}>1</Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, color: T.accent, fontSize: "0.85rem", fontFamily: T.poppins }}>Select Target Period Year</Typography>
              </Box>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select value={targetYear} onChange={(e) => setTargetYear(e.target.value)} disabled={running} sx={selectSx}>
                  {yearOptions.map((y) => (
                    <MenuItem key={y} value={y} sx={{ fontFamily: T.poppins, fontSize: "0.875rem" }}>
                      {y}{y === new Date().getFullYear() ? " (Current)" : y === new Date().getFullYear() + 1 ? " (Next Year)" : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Step 2: Leave types */}
            <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${T.divider}` }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff", fontFamily: T.poppins }}>2</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 700, color: T.accent, fontSize: "0.85rem", fontFamily: T.poppins }}>Select Leave Types to Auto-Assign</Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <AccentButton size="small" onClick={() => setSelectedLeaveTypes([...leaveTypes])} disabled={running} sx={{ fontSize: "0.72rem", fontFamily: T.poppins, color: T.accent, borderColor: T.accentBorder, "&:hover": { bgcolor: T.accentFaint } }} variant="outlined">All</AccentButton>
                  <AccentButton size="small" onClick={() => setSelectedLeaveTypes([])} disabled={running} sx={{ fontSize: "0.72rem", fontFamily: T.poppins, color: T.muted, borderColor: T.accentBorder, "&:hover": { bgcolor: T.accentFaint } }} variant="outlined">Clear</AccentButton>
                </Box>
              </Box>
              {(() => {
                const noGender = employeesWithAssignments.filter((e) => !e.sex).length;
                const hasRestricted = leaveTypes.some((lt) => getLeaveGenderRestriction(lt));
                return noGender > 0 && hasRestricted ? (
                  <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2, py: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: T.poppins }}><strong>{noGender} employee{noGender > 1 ? "s" : ""}</strong> have no gender — gender-restricted types will be skipped for them.</Typography>
                  </Alert>
                ) : null;
              })()}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {leaveTypes.map((lt) => {
                  const isSelected = !!selectedLeaveTypes.find((x) => x.leave_code === lt.leave_code);
                  const restriction = getLeaveGenderRestriction(lt);
                  return (
                    <Tooltip key={lt.leave_code} title={restriction ? `${restriction === "male" ? "Male only" : "Female only"}` : "All genders"}>
                      <Chip
                        label={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            {restriction === "male" && <MaleIcon sx={{ fontSize: 13, color: isSelected ? "#fff" : "#1565C0" }} />}
                            {restriction === "female" && <FemaleIcon sx={{ fontSize: 13, color: isSelected ? "#fff" : "#C2185B" }} />}
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: T.poppins }}>{lt.leave_code}</Typography>
                          </Box>
                        }
                        onClick={() => !running && toggleLT(lt)}
                        sx={{ cursor: running ? "not-allowed" : "pointer", bgcolor: isSelected ? T.accent : T.accentFaint, color: isSelected ? "#fff" : T.accent, fontWeight: 700, border: `1px solid ${isSelected ? T.accent : T.accentBorder}`, "&:hover": { bgcolor: isSelected ? T.accentDark : T.accentHover } }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>

            {/* Pending commutations warning */}
            {pendingCommutations.length > 0 && (
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: "rgba(230,81,0,0.03)" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.25 }}>
                  <WarningIcon sx={{ fontSize: 17, color: "#e65100" }} />
                  <Typography sx={{ fontWeight: 700, color: "#e65100", fontSize: "0.85rem", fontFamily: T.poppins }}>
                    {pendingCommutations.length} pending commutation{pendingCommutations.length > 1 ? "s" : ""} must be resolved first
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "#bf360c", fontWeight: 700, display: "block", mb: 1.25, fontFamily: T.poppins }}>
                  These employees have remaining leave hours from prior periods not yet commuted.
                </Typography>
                <Box sx={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {pendingCommutations.map((w, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.6, px: 1.5, borderRadius: 1, bgcolor: "rgba(230,81,0,0.06)", border: "1px solid rgba(230,81,0,0.14)" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#bf360c", fontFamily: T.poppins }}>{w.fullName}</Typography>
                        <Typography sx={{ fontSize: "0.68rem", color: "#999", fontFamily: T.poppins }}>#{w.employeeNumber}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip label={w.leaveCode} size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: "rgba(230,81,0,0.12)", color: "#e65100", fontWeight: 700, fontFamily: T.poppins }} />
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#e65100", fontFamily: T.poppins }}>{w.remainingHours.toFixed(1)} hrs untransferred</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Preview */}
            {selectedLeaveTypes.length > 0 && !running && (
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${T.divider}` }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: alpha(T.accent, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>3</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 700, color: T.accent, fontSize: "0.85rem", fontFamily: T.poppins }}>Preview</Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  {[
                    [`${employeesWithAssignments.length}`, "Employees", T.accent],
                    [`${preview.toCreate}`, "Will Create", "#2e7d32"],
                    [`${preview.skipped}`, "Already Exist", T.muted],
                  ].map(([val, label, color]) => (
                    <Box key={label} sx={{ px: 2, py: 1.25, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, textAlign: "center", minWidth: 80 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: "1.3rem", color, lineHeight: 1, fontFamily: T.poppins }}>{val}</Typography>
                      <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontWeight: 700, mt: 0.3, fontFamily: T.poppins }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ maxHeight: 140, overflowY: "auto" }}>
                  {preview.byLeave.map((bl) => (
                    <Box key={bl.code} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.5, borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {bl.restriction === "male" && <MaleIcon sx={{ fontSize: 13, color: "#1565C0" }} />}
                        {bl.restriction === "female" && <FemaleIcon sx={{ fontSize: 13, color: "#C2185B" }} />}
                        {!bl.restriction && <GenderIcon sx={{ fontSize: 13, color: "#888" }} />}
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#333", fontFamily: T.poppins }}>{bl.code} — {bl.desc}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 0.75 }}>
                        <Chip label={`${bl.toCreate} new`} size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: "rgba(46,125,50,0.1)", color: "#2e7d32", fontWeight: 700, fontFamily: T.poppins }} />
                        {bl.toSkip > 0 && <Chip label={`${bl.toSkip} skip`} size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: "rgba(0,0,0,0.05)", color: "#888", fontWeight: 700, fontFamily: T.poppins }} />}
                        {bl.restriction && <Chip label={`${bl.eligible} eligible`} size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: bl.restriction === "male" ? "rgba(21,101,192,0.1)" : "rgba(194,24,91,0.1)", color: bl.restriction === "male" ? "#1565C0" : "#C2185B", fontWeight: 700, fontFamily: T.poppins }} />}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Progress bar */}
            {running && (
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${T.divider}` }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                  <Typography sx={{ fontSize: "0.78rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>{progressMsg || "Running…"}</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: T.muted, fontWeight: 700, fontFamily: T.poppins }}>{progress}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 2, height: 8, bgcolor: T.accentFaint, "& .MuiLinearProgress-bar": { bgcolor: T.accent } }} />
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9" }}>
        {results ? (
          <AccentButton onClick={handleClose} variant="contained" sx={{ fontSize: "0.8rem", fontFamily: T.poppins, bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark } }}>Done</AccentButton>
        ) : (
          <>
            <AccentButton onClick={handleClose} disabled={running} variant="outlined" sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>Cancel</AccentButton>
            <AccentButton
              onClick={handleRun}
              disabled={running || !selectedLeaveTypes.length || preview.toCreate === 0 || pendingCommutations.length > 0}
              variant="contained"
              startIcon={running ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <RunIcon sx={{ fontSize: "14px !important" }} />}
              sx={{ fontSize: "0.8rem", fontFamily: T.poppins, bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark }, "&:disabled": { bgcolor: "#ccc !important", color: "#666 !important" } }}
            >
              {running ? `Running… (${progress}%)` : pendingCommutations.length > 0 ? `Resolve ${pendingCommutations.length} pending first` : `Run Auto-Assign (${preview.toCreate} records)`}
            </AccentButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const LeaveAssignment = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess("leave-assignment");

  const [assignments, setAssignments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [unit, setUnit] = useState("hours"); // "hours" | "days"

  const [newAssignment, setNewAssignment] = useState({
    leave_code: "",
    employeeNumber: "",
    carried_forward_hours: 0,
    allocated_hours: 0,
    period_year: new Date().getFullYear().toString(),
  });

  const [editAssignment, setEditAssignment] = useState(null);
  const [originalAssignment, setOriginalAssignment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editCarriedHours, setEditCarriedHours] = useState(0);
  const [editAllocatedHours, setEditAllocatedHours] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [error, setError] = useState("");
  const [isCarryAutoSuggested, setIsCarryAutoSuggested] = useState(false);
  const [employeeAssignments, setEmployeeAssignments] = useState([]);

  const [employeeLeavesModalOpen, setEmployeeLeavesModalOpen] = useState(false);
  const [selectedEmployeeLeaves, setSelectedEmployeeLeaves] = useState(null);
  const [selectedLeaveTypeInModal, setSelectedLeaveTypeInModal] = useState(null);

  const [commuteDialogOpen, setCommuteDialogOpen] = useState(false);
  const [commutePeriod, setCommutePeriod] = useState(null);
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [commuteSuccess, setCommuteSuccess] = useState("");
  const [commutationMap, setCommutationMap] = useState({});

  const [recordsPage, setRecordsPage] = useState(0);
  const [recordsRowsPerPage, setRecordsRowsPerPage] = useState(12);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchAssignments(), fetchLeaveTypes(), fetchEmployees(), fetchAllCommutations()]);
      setPageLoading(false);
    };
    init();
  }, []);

  useEffect(() => { setRecordsPage(0); }, [searchTerm]);

  const employeeOptions = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    return list.map((e) => {
      const name = (e?.fullName || `${e?.firstName || ""} ${e?.lastName || ""}`.trim()).trim();
      const empNo = (e?.employeeNumber || "").toString().trim();
      return { ...e, _searchKey: `${name} ${empNo}`.toLowerCase() };
    });
  }, [employees]);

  const selectedEmployeeGender = useMemo(() => selectedEmployee?.sex || selectedEmployee?.gender || null, [selectedEmployee]);
  const filteredLeaveTypesForNew = useMemo(() => leaveTypes.filter((lt) => isLeaveAllowedForGender(lt, selectedEmployeeGender)), [leaveTypes, selectedEmployeeGender]);

  useEffect(() => {
    if (!selectedEmployee?.employeeNumber || !newAssignment.leave_code) {
      setIsCarryAutoSuggested(false);
      setNewAssignment((p) => ({ ...p, carried_forward_hours: 0 }));
      return;
    }
    const empNum = selectedEmployee.employeeNumber?.toString();
    const lc = newAssignment.leave_code;
    const key = `${empNum}_${lc}`;
    const empAssns = assignments.filter((a) => a.employeeNumber?.toString() === empNum);
    setEmployeeAssignments(empAssns);
    const rows = empAssns.filter((a) => a.leave_code === lc);
    if (!rows.length) { setIsCarryAutoSuggested(false); setNewAssignment((p) => ({ ...p, carried_forward_hours: 0 })); return; }
    const commHrs = toNum(commutationMap[key]) * 8;
    if (commHrs > 0) {
      setNewAssignment((p) => ({ ...p, carried_forward_hours: commHrs }));
      setIsCarryAutoSuggested(true);
    } else {
      const remHrs = rows.reduce((s, r) => s + toNum(r.remaining_hours), 0);
      setNewAssignment((p) => ({ ...p, carried_forward_hours: remHrs }));
      setIsCarryAutoSuggested(remHrs > 0);
    }
  }, [selectedEmployee, newAssignment.leave_code, assignments, commutationMap]);

  useEffect(() => {
    if (!selectedEmployee?.employeeNumber) { setEmployeeAssignments([]); return; }
    setEmployeeAssignments(assignments.filter((a) => a.employeeNumber?.toString() === selectedEmployee.employeeNumber?.toString()));
  }, [selectedEmployee, assignments]);

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
      if (usersRes.status === "fulfilled") { const d = usersRes.value.data; if (Array.isArray(d)) usersData = d; else if (d?.users) usersData = d.users; else if (d?.data) usersData = d.data; }
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

  const isDuplicateAssignment = (empNum, leaveCode, year, excludeId = null) => {
    if (!empNum || !leaveCode) return false;
    const py = (year !== undefined && year !== null) ? year.toString() : new Date().getFullYear().toString();
    return assignments.some((a) => { if (excludeId && String(a.id) === String(excludeId)) return false; return a.employeeNumber?.toString() === empNum.toString() && a.leave_code === leaveCode && a.period_year?.toString() === py; });
  };

  const handleAdd = async () => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    const lc = newAssignment.leave_code;
    if (!empNum || !lc) { setError("Please select an employee and leave type"); return; }
    if (!newAssignment.allocated_hours || newAssignment.allocated_hours <= 0) { setError("Please enter a valid allocation (must be greater than 0)"); return; }
    if (isDuplicateAssignment(empNum, lc, newAssignment.period_year)) { setError("This employee already has an assignment for this leave type and period"); return; }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/leaveRoute/leave_assignment`, {
        leave_code: lc, employeeNumber: empNum,
        total_hours: newAssignment.allocated_hours,
        carried_forward_hours: newAssignment.carried_forward_hours,
        allocated_hours: newAssignment.allocated_hours,
        period_year: parseInt(newAssignment.period_year, 10) || new Date().getFullYear(),
        period_semester: null,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setSelectedEmployee(null);
      setNewAssignment({ leave_code: "", employeeNumber: "", carried_forward_hours: 0, allocated_hours: 0, period_year: new Date().getFullYear().toString() });
      setIsCarryAutoSuggested(false);
      await fetchAssignments(); await fetchAllCommutations();
      setTimeout(() => { setLoading(false); setSuccessAction("adding"); setSuccessOpen(true); setTimeout(() => setSuccessOpen(false), 2000); }, 250);
    } catch (err) { setError("Error adding assignment: " + (err.response?.data?.error || err.message)); setLoading(false); }
  };

  const handleUpdate = async () => {
    const id = editAssignment?.id;
    const empNum = editAssignment?.employeeNumber?.toString().trim();
    const lc = editAssignment?.leave_code;
    const usedHrs = toNum(editAssignment.used_hours);
    const remHrs = Math.max(0, editAllocatedHours - usedHrs);
    if (!id || !empNum || !lc) { setError("Please fill in all required fields"); return; }
    if (isDuplicateAssignment(empNum, lc, editAssignment.period_year, editAssignment.id)) { setError("This employee already has an assignment for this leave type and period"); return; }
    try {
      await axios.put(`${API_BASE_URL}/leaveRoute/leave_assignment/${id}`, {
        leave_code: lc, employeeNumber: empNum,
        total_hours: editAllocatedHours,
        remaining_hours: remHrs,
        carried_forward_hours: editCarriedHours,
        allocated_hours: editAllocatedHours,
        period_year: parseInt(editAssignment.period_year, 10) || new Date().getFullYear(),
        period_semester: null,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
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
    setEditAssignment({ ...assignment });
    setOriginalAssignment({ ...assignment });
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
      await axios.post(`${API_BASE_URL}/commutationRoute/leave_commutation/commute/${commutePeriod.id}`, { commuted_by: token ? "admin" : null }, { headers: { Authorization: `Bearer ${token}` } });
      setCommuteDialogOpen(false); setCommuteLoading(false);
      setCommuteSuccess(`Successfully commuted ${(toNum(commutePeriod.remaining_hours)).toFixed(1)} hrs.`);
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
    } catch (e) { setCommuteLoading(false); setError("Commutation failed: " + (e.response?.data?.error || e.message)); }
  };

  const filteredAssignments = assignments.filter((a) => {
    const s = searchTerm.toLowerCase();
    return (a.fullName?.toLowerCase() || "").includes(s) || (a.employeeNumber?.toString().toLowerCase() || "").includes(s) || (a.leave_code?.toString().toLowerCase() || "").includes(s);
  });

  const getEmployeeInfo = (num) => employees.find((e) => e.employeeNumber?.toString() === num?.toString()) || { fullName: num || "Unknown" };

  const groupedByEmployee = filteredAssignments.reduce((acc, a) => {
    const num = a.employeeNumber?.toString() || "Unknown";
    if (!acc[num]) { const info = getEmployeeInfo(num); acc[num] = { employeeNumber: num, fullName: info.fullName || num, firstName: info.firstName, lastName: info.lastName, leaveTypes: {} }; }
    const lc = a.leave_code;
    if (!acc[num].leaveTypes[lc]) acc[num].leaveTypes[lc] = { leave_code: lc, periods: [] };
    acc[num].leaveTypes[lc].periods.push(a);
    return acc;
  }, {});

  const employeeGroups = Object.values(groupedByEmployee).map((e) => ({ ...e, leaveTypes: Object.values(e.leaveTypes) })).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  const paginatedGroups = useMemo(() => { const s = recordsPage * recordsRowsPerPage; return employeeGroups.slice(s, s + recordsRowsPerPage); }, [employeeGroups, recordsPage, recordsRowsPerPage]);

  const mapKey = selectedEmployee ? `${selectedEmployee.employeeNumber}_${newAssignment.leave_code}` : "";
  const commHrsForNew = toNum(commutationMap[mapKey]) * 8;
  const selectedLeaveTypeObj = leaveTypes.find((lt) => lt.leave_code === newAssignment.leave_code);
  const leaveGenderRestriction = selectedLeaveTypeObj ? getLeaveGenderRestriction(selectedLeaveTypeObj) : null;
  const genderMismatch = leaveGenderRestriction && selectedEmployeeGender && !isLeaveAllowedForGender(selectedLeaveTypeObj, selectedEmployeeGender);
  const canCommute = (period) => toNum(period?.remaining_hours) > 0;

  if (accessLoading || pageLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8 }}>
        <CircularProgress sx={{ color: T.accent, mb: 2 }} />
        <Typography sx={{ color: T.accent, fontFamily: T.poppins }}>Loading leave assignments…</Typography>
      </Box>
    );
  }
  if (!hasAccess) return <AccessDenied />;

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Fade in timeout={400}>
        <Box sx={{ py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 }, width: "100vw", maxWidth: "100%", position: "relative", left: "63%", transform: "translateX(-61%)", px: { xs: 2, sm: 3, md: 6 } }}>
          <LoadingOverlay open={loading} message="Processing leave assignment…" />
          <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
          <CommuteDialog open={commuteDialogOpen} period={commutePeriod} onClose={() => setCommuteDialogOpen(false)} onConfirm={handleCommute} loading={commuteLoading} unit={unit} />
          <BulkAutoAssignDialog open={bulkAssignOpen} onClose={() => setBulkAssignOpen(false)} leaveTypes={leaveTypes} assignments={assignments} employees={employees} commutationMap={commutationMap} onSuccess={async () => { await fetchAssignments(); }} />

          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: "hidden" }}>
            <Box sx={{ px: 4, py: 3, background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
              <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${alpha(T.accent, 0.1)} 0%, transparent 70%)` }} />
              <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: `radial-gradient(circle, ${alpha(T.accent, 0.07)} 0%, transparent 70%)` }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, position: "relative", zIndex: 1 }}>
                <EventNote sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.3, fontFamily: T.poppins }}>
                    Leave Assignment Management
                  </Typography>
                  <Typography sx={{ fontSize: "0.82rem", color: T.accentMid, fontWeight: 700, opacity: 0.9, fontFamily: T.poppins }}>
                    Administrative Panel • Assign leave types and manage leave credits
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
                <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                  <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>
                    {assignments.length} {assignments.length === 1 ? "assignment" : "assignments"}
                  </Typography>
                </Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => { fetchAssignments(); fetchAllCommutations(); }} sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, "&:hover": { bgcolor: alpha(T.accent, 0.15) } }}>
                    <RefreshIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Add Assignment ── */}
          <SectionCard sx={{ mb: 2 }}>
            {/* Panel header */}
            <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint, flexShrink: 0 }}>
              <AddIcon sx={{ fontSize: 15, color: T.accent }} />
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>Assign Leave to Employee</Typography>
              <Box sx={{ flex: 1 }} />
              {/* Unit toggle */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins }}>Input in:</Typography>
                <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                  sx={{ "& .MuiToggleButton-root": { px: 1.25, py: 0.3, border: `1px solid ${T.accentBorder}`, fontSize: "0.72rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins, "&.Mui-selected": { bgcolor: T.accent, color: "#fff", borderColor: T.accent } } }}>
                  <ToggleButton value="hours"><HoursIcon sx={{ fontSize: 13, mr: 0.5 }} />Hours</ToggleButton>
                  <ToggleButton value="days"><DaysIcon sx={{ fontSize: 13, mr: 0.5 }} />Days</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Typography sx={{ fontSize: "0.72rem", color: T.faint, ml: 1 }}><Box component="span" sx={{ color: "#c62828" }}>*</Box> required</Typography>
            </Box>

            <Box sx={{ px: 3, py: 2 }}>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontFamily: T.poppins }}>{error}</Alert>}
              {commuteSuccess && <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2, borderRadius: 2, fontFamily: T.poppins }}>{commuteSuccess}</Alert>}
              {genderMismatch && (
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins }}>{selectedLeaveTypeObj?.leave_description} is restricted to <strong>{leaveGenderRestriction}</strong> employees.</Typography>
                </Alert>
              )}

              <Grid container spacing={2} alignItems="flex-end">
                {/* Employee */}
                <Grid item xs={12} md={4}>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Select Employee <span style={{ color: "#c62828" }}>*</span></Typography>
                  <Autocomplete
                    value={selectedEmployee}
                    onChange={(e, v) => { setSelectedEmployee(v); setError(""); setNewAssignment((p) => ({ ...p, leave_code: "", carried_forward_hours: 0, allocated_hours: 0 })); }}
                    options={employeeOptions}
                    autoHighlight
                    getOptionLabel={(o) => `${o.fullName || `${o.firstName || ""} ${o.lastName || ""}`.trim()} (${o.employeeNumber})`}
                    filterOptions={(opts, { inputValue: iv }) => opts.filter((o) => (o._searchKey || "").includes(iv.toLowerCase().trim())).slice(0, 80)}
                    isOptionEqualToValue={(o, v) => o.employeeNumber === v.employeeNumber}
                    noOptionsText="No employees found"
                    renderOption={(props, option) => {
                      const { key, ...rest } = props;
                      const name = option.fullName || `${option.firstName || ""} ${option.lastName || ""}`.trim();
                      const initials = `${option.firstName?.[0] || ""}${option.lastName?.[0] || ""}`.toUpperCase() || "?";
                      return (
                        <li key={key} {...rest}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar sx={{ width: 30, height: 30, bgcolor: T.accent, fontSize: "0.75rem", fontWeight: 700 }}>{initials}</Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins }}>{name}</Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <Typography variant="caption" sx={{ color: "#888", fontFamily: T.poppins }}>{option.employeeNumber}</Typography>
                                {(option.sex || option.gender) && <GenderBadge gender={option.sex || option.gender} />}
                              </Box>
                            </Box>
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <FieldInput {...params} size="small" placeholder="Type employee name or number…" />
                    )}
                    sx={{ width: "100%" }}
                  />
                  {selectedEmployee && selectedEmployeeGender && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.75 }}>
                      <Typography variant="caption" sx={{ color: "#888", fontWeight: 700, fontFamily: T.poppins }}>Gender:</Typography>
                      <GenderBadge gender={selectedEmployeeGender} />
                    </Box>
                  )}
                  {selectedEmployee && !selectedEmployeeGender && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.75 }}>
                      <WarningIcon sx={{ fontSize: 13, color: "#e65100" }} />
                      <Typography variant="caption" sx={{ color: "#e65100", fontWeight: 700, fontFamily: T.poppins }}>No gender on file — gender-restricted types hidden.</Typography>
                    </Box>
                  )}
                </Grid>

                {/* Leave type */}
                <Grid item xs={12} md={5}>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Leave Type <span style={{ color: "#c62828" }}>*</span></Typography>
                  <FormControl fullWidth size="small">
                    <Select value={newAssignment.leave_code || ""} displayEmpty onChange={(e) => { setNewAssignment((p) => ({ ...p, leave_code: e.target.value })); setError(""); }} sx={selectSx}>
                      <MenuItem value=""><em style={{ fontFamily: T.poppins }}>Choose a leave type…</em></MenuItem>
                      {filteredLeaveTypesForNew.map((type) => {
                        const restriction = getLeaveGenderRestriction(type);
                        return (
                          <MenuItem key={type.id || type.leave_code} value={type.leave_code}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins }}>{getLeaveLabel(type.leave_code, leaveTypes)}</Typography>
                              {restriction === "male" && <MaleIcon sx={{ fontSize: 15, color: "#1565C0", flexShrink: 0 }} />}
                              {restriction === "female" && <FemaleIcon sx={{ fontSize: 15, color: "#C2185B", flexShrink: 0 }} />}
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Period year */}
                <Grid item xs={12} md={3}>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Period Year</Typography>
                  <FieldInput
                    type="number"
                    size="small"
                    fullWidth
                    value={newAssignment.period_year}
                    onChange={(e) => setNewAssignment((p) => ({ ...p, period_year: e.target.value }))}
                    inputProps={{ min: 2020, max: 2035 }}
                  />
                </Grid>

                {/* Carry-over (read-only) */}
                <Grid item xs={12} md={4}>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: isCarryAutoSuggested ? "#2e7d32" : T.accent, mb: 0.75, fontFamily: T.poppins }}>
                    Carry-Over
                    {isCarryAutoSuggested && <span style={{ color: "#2e7d32", marginLeft: 6, fontSize: "0.65rem", fontWeight: 800 }}>● auto-filled</span>}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, height: 36, borderRadius: 2, border: `1.5px solid ${isCarryAutoSuggested ? "rgba(46,125,50,0.35)" : T.accentBorder}`, bgcolor: isCarryAutoSuggested ? "rgba(46,125,50,0.04)" : T.accentFaint }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {isCarryAutoSuggested ? <CommutationIcon sx={{ fontSize: 15, color: "#2e7d32" }} /> : <CalendarIcon sx={{ fontSize: 15, color: T.faint }} />}
                      <Typography sx={{ fontWeight: 900, color: isCarryAutoSuggested ? "#2e7d32" : T.muted, fontSize: "0.88rem", fontFamily: T.poppins }}>
                        {unit === "hours" ? `${newAssignment.carried_forward_hours.toFixed(1)} hrs` : `${(newAssignment.carried_forward_hours / 8).toFixed(2)} days`}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>
                      {unit === "hours" ? `(${(newAssignment.carried_forward_hours / 8).toFixed(2)}d)` : `(${newAssignment.carried_forward_hours.toFixed(1)} hrs)`}
                    </Typography>
                  </Box>
                </Grid>

                {/* New credits */}
                <Grid item xs={12} md={4}>
                  <CreditInput
                    label="New Credits (This Period)"
                    valueHours={newAssignment.allocated_hours}
                    onChangeHours={(hrs) => { setNewAssignment((p) => ({ ...p, allocated_hours: hrs })); setError(""); }}
                    unit={unit}
                    required
                    color="#1976d2"
                  />
                </Grid>

                {/* Total */}
                <Grid item xs={12} md={4}>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>This Period Total</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, height: 36, borderRadius: 2, border: `2px solid ${T.accentBorder}`, bgcolor: "#f5f5f5" }}>
                    <Typography sx={{ fontWeight: 900, color: T.accent, fontSize: "0.88rem", fontFamily: T.poppins }}>
                      {unit === "hours" ? `${(newAssignment.allocated_hours || 0).toFixed(1)} hrs` : `${((newAssignment.allocated_hours || 0) / 8).toFixed(2)} days`}
                    </Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>
                      {unit === "hours" ? `(${((newAssignment.allocated_hours || 0) / 8).toFixed(2)}d)` : `(${(newAssignment.allocated_hours || 0).toFixed(1)} hrs)`}
                    </Typography>
                  </Box>
                </Grid>

                {/* Submit */}
                <Grid item xs={12}>
                  <AccentButton
                    onClick={handleAdd}
                    variant="contained"
                    startIcon={<AddIcon sx={{ fontSize: "16px !important" }} />}
                    disabled={loading || !selectedEmployee || !newAssignment.leave_code || !newAssignment.allocated_hours}
                    sx={{
                      height: 38, bgcolor: T.accent, color: "#fff",
                      boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`,
                      fontFamily: T.poppins,
                      "&:hover": { bgcolor: T.accentDark },
                      "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important", boxShadow: "none" },
                    }}
                  >
                    {loading ? "Adding…" : "Assign Leave"}
                  </AccentButton>
                </Grid>
              </Grid>

              {selectedEmployee && newAssignment.leave_code && (
                <Box sx={{ mt: 2.5 }}>
                  {employeeAssignments.filter((a) => a.leave_code === newAssignment.leave_code).length > 0 ? (
                    <CarryForwardSummary leaveCode={newAssignment.leave_code} employeeAssignments={employeeAssignments} commutedHours={commHrsForNew} unit={unit} />
                  ) : (
                    <Alert severity="info" icon={<EventNote />} sx={{ borderRadius: 2, backgroundColor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>No previous assignments found</Typography>
                      <Typography variant="caption" sx={{ color: "#666", fontWeight: 700, fontFamily: T.poppins }}>First time assigning <strong>{newAssignment.leave_code}</strong> to this employee. No carry-over.</Typography>
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          </SectionCard>

          {/* ── Records Table ── */}
          <SectionCard sx={{ mb: { xs: 6, md: 10 }, height: "calc(100vh - 660px)", display: "flex", flexDirection: "column" }}>
            {/* Toolbar */}
            <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Reorder sx={{ fontSize: 17, color: T.accent }} />
                  <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>Leave Assignment Records</Typography>
                  <Box sx={{ px: 1.5, py: 0.3, borderRadius: 4, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${T.accentBorder}` }}>
                    <Typography sx={{ fontSize: "0.7rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>{employeeGroups.length} employees · {filteredAssignments.length} records</Typography>
                  </Box>
                </Box>
              </Box>
              <FieldInput
                size="small"
                placeholder="Search by name or employee number…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }}
              />
            </Box>

            {/* Column headers */}
            <Box sx={{ px: 3.5, py: 1, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.4fr 1.4fr 1fr", gap: 2, alignItems: "center", bgcolor: alpha(T.accent, 0.04), borderBottom: `1px solid ${T.divider}`, flexShrink: 0 }}>
              {["Employee", "Leave Types", "Total", "Used / Remaining", "Leave Credits", "Actions"].map((col) => (
                <Typography key={col} sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins }}>{col}</Typography>
              ))}
            </Box>

            {/* Rows */}
            <Box sx={{ flexGrow: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
              {paginatedGroups.length === 0 ? (
                <Box sx={{ py: 10, textAlign: "center" }}>
                  <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                    <EventNote sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                  </Box>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: T.muted, mb: 0.5, fontFamily: T.poppins }}>{assignments.length === 0 ? "No Leave Assignments Found" : "No Matching Records"}</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: T.faint, fontFamily: T.poppins }}>{assignments.length === 0 ? "Assign leave credits using the form above." : "Try adjusting your search."}</Typography>
                </Box>
              ) : (
                paginatedGroups.map((grp, idx) => {
                  const allActive = grp.leaveTypes.flatMap((lt) => getActivePeriods(lt.periods));
                  const totalH = allActive.reduce((s, p) => s + toNum(p.total_hours), 0);
                  const usedH = allActive.reduce((s, p) => s + toNum(p.used_hours), 0);
                  const remH = allActive.reduce((s, p) => s + toNum(p.remaining_hours), 0);
                  const overallColor = getStatusColor(remH, totalH);
                  const info = getEmployeeInfo(grp.employeeNumber);
                  const empGender = info?.sex || info?.gender;
                  const initials = `${grp.firstName?.[0] || ""}${grp.lastName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                  return (
                    <Box key={grp.employeeNumber} sx={{ px: 3.5, py: 1.5, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.4fr 1.4fr 1fr", gap: 2, alignItems: "center", bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, borderBottom: `1px solid ${T.divider}`, transition: "background 0.13s ease", "&:hover": { bgcolor: T.rowHover } }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        <Avatar sx={{ width: 34, height: 34, fontSize: "0.75rem", fontWeight: 800, bgcolor: T.accent, color: "#fff", borderRadius: "8px", flexShrink: 0 }}>{initials}</Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, lineHeight: 1.25, fontFamily: T.poppins }} noWrap>{grp.fullName}</Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontWeight: 600, fontFamily: T.poppins }}>#{grp.employeeNumber}</Typography>
                            {empGender && <GenderBadge gender={empGender} />}
                          </Box>
                        </Box>
                      </Box>
                      <Box>
                        <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "inline-block" }}>
                          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>{grp.leaveTypes.length} type{grp.leaveTypes.length !== 1 ? "s" : ""}</Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: T.text, lineHeight: 1.2, fontFamily: T.poppins }}>{unit === "hours" ? `${totalH.toFixed(1)}h` : `${(totalH / 8).toFixed(1)}d`}</Typography>
                        <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontWeight: 600, fontFamily: T.poppins }}>{unit === "hours" ? `(${(totalH / 8).toFixed(1)}d)` : `(${totalH.toFixed(0)} hrs)`}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#c25b00", lineHeight: 1.2, fontFamily: T.poppins }}>{unit === "hours" ? `${usedH.toFixed(1)}h` : `${(usedH / 8).toFixed(1)}d`} used</Typography>
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>{unit === "hours" ? `${remH.toFixed(1)}h` : `${(remH / 8).toFixed(1)}d`} left</Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {grp.leaveTypes.slice(0, 4).map((lt) => {
                          const stats = getLeaveTypeStatsActive(lt.periods);
                          const key = `${grp.employeeNumber}_${lt.leave_code}`;
                          const commDays = toNum(commutationMap[key]);
                          const displayH = commDays > 0 ? commDays * 8 : stats.remainingHours;
                          const sc = commDays > 0 ? T.accent : getStatusColor(stats.remainingHours, stats.totalHours);
                          return (
                            <Box key={lt.leave_code} sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: `${sc}12`, border: `1px solid ${sc}30` }}>
                              <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: sc, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontFamily: T.poppins }}>
                                {lt.leave_code} {unit === "hours" ? `${displayH.toFixed(0)}h` : `${(displayH / 8).toFixed(1)}d`}
                              </Typography>
                            </Box>
                          );
                        })}
                        {grp.leaveTypes.length > 4 && <Box sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}><Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>+{grp.leaveTypes.length - 4}</Typography></Box>}
                      </Box>
                      <Box>
                        <AccentButton size="small" variant="outlined" onClick={() => { setSelectedEmployeeLeaves(grp); setSelectedLeaveTypeInModal(null); setEmployeeLeavesModalOpen(true); }}
                          sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28, borderColor: T.accentBorder, color: T.accent, "&:hover": { borderColor: T.accent, bgcolor: T.accentFaint, transform: "none" } }}>
                          View
                        </AccentButton>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>

            {/* Pagination */}
            {employeeGroups.length > 0 && (
              <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}`, flexShrink: 0 }}>
                <TablePagination component="div" count={employeeGroups.length} page={recordsPage} onPageChange={(e, p) => setRecordsPage(p)} rowsPerPage={recordsRowsPerPage} onRowsPerPageChange={(e) => { setRecordsRowsPerPage(parseInt(e.target.value, 10)); setRecordsPage(0); }} rowsPerPageOptions={[8, 12, 16, 24, 48]} labelRowsPerPage="Rows:"
                  sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: "0.78rem", fontWeight: 600, color: T.accent, fontFamily: T.poppins } }}
                />
              </Box>
            )}
          </SectionCard>

          {/* ── Employee Leaves Modal ── */}
          <Modal open={employeeLeavesModalOpen} onClose={() => { setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null); }} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <Fade in={employeeLeavesModalOpen}>
              <Box sx={{ backgroundColor: "#fff", borderRadius: 3, width: "95%", maxWidth: "1100px", height: "85vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", fontFamily: T.poppins }}>
                {selectedEmployeeLeaves && (
                  <>
                    <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                      <Box sx={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                        <Avatar sx={{ bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", width: 44, height: 44, fontSize: "1rem", fontWeight: 800 }}>
                          {`${selectedEmployeeLeaves.firstName?.[0] || ""}${selectedEmployeeLeaves.lastName?.[0] || ""}`.toUpperCase() || selectedEmployeeLeaves.fullName?.[0] || "?"}
                        </Avatar>
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", lineHeight: 1.2, fontFamily: T.poppins }}>{selectedEmployeeLeaves.fullName}</Typography>
                            {(() => { const info = getEmployeeInfo(selectedEmployeeLeaves.employeeNumber); const g = info?.sex || info?.gender; return g ? <GenderBadge gender={g} light /> : null; })()}
                          </Box>
                          <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", mt: 0.25, fontFamily: T.poppins }}>#{selectedEmployeeLeaves.employeeNumber} · {selectedEmployeeLeaves.leaveTypes.length} Leave Type(s)</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, position: "relative", zIndex: 1 }}>
                        <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                          sx={{ "& .MuiToggleButton-root": { px: 1, py: 0.3, border: "1px solid rgba(255,255,255,0.3)", fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: T.poppins, "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.2)", color: "#fff", borderColor: "rgba(255,255,255,0.5)" } } }}>
                          <ToggleButton value="hours">hrs</ToggleButton>
                          <ToggleButton value="days">days</ToggleButton>
                        </ToggleButtonGroup>
                        <IconButton onClick={() => { setEmployeeLeavesModalOpen(false); setSelectedEmployeeLeaves(null); setSelectedLeaveTypeInModal(null); }} size="small" sx={{ color: "rgba(255,255,255,0.75)", "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
                          <Close sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: { xs: "1fr", md: "300px 1fr" }, minHeight: 0 }}>
                      {/* Left: leave types */}
                      <Box sx={{ borderRight: { xs: "none", md: `1px solid ${T.divider}` }, p: 2.5, overflowY: "auto", bgcolor: "rgba(0,0,0,0.015)", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                        <Typography sx={{ fontWeight: 700, color: T.accent, mb: 0.75, fontSize: "0.82rem", fontFamily: T.poppins }}>Leave Types</Typography>
                        <Typography variant="caption" sx={{ color: "#888", display: "block", mb: 2, fontWeight: 600, fontFamily: T.poppins }}>Select a type to see period breakdown.</Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {selectedEmployeeLeaves.leaveTypes.map((lt) => {
                            const stats = getLeaveTypeStatsActive(lt.periods);
                            const sc = getStatusColor(stats.remainingHours, stats.totalHours);
                            const isActive = selectedLeaveTypeInModal?.leave_code === lt.leave_code;
                            const ltObj = leaveTypes.find((x) => x.leave_code === lt.leave_code);
                            const restriction = ltObj ? getLeaveGenderRestriction(ltObj) : null;
                            return (
                              <Box key={lt.leave_code} onClick={() => setSelectedLeaveTypeInModal(lt)} sx={{ p: 2, borderRadius: 2, cursor: "pointer", border: isActive ? `2px solid ${sc}` : `1px solid ${sc}30`, bgcolor: isActive ? `${sc}10` : "#fff", transition: "all 0.18s", "&:hover": { transform: "translateY(-1px)", boxShadow: `0 4px 14px ${sc}20` } }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
                                  {restriction === "male" && <MaleIcon sx={{ fontSize: 13, color: "#1565C0" }} />}
                                  {restriction === "female" && <FemaleIcon sx={{ fontSize: 13, color: "#C2185B" }} />}
                                  <Typography sx={{ fontWeight: 700, color: T.accent, fontSize: "0.82rem", lineHeight: 1.2, fontFamily: T.poppins }}>{getLeaveLabel(lt.leave_code, leaveTypes)}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                  <Box>
                                    <Typography sx={{ fontSize: "0.6rem", color: "#888", fontWeight: 700, mb: 0.25, fontFamily: T.poppins }}>Available</Typography>
                                    <RemainingBalance hoursLike={stats.remainingHours} color={sc} unit={unit} alignItems="flex-start" />
                                  </Box>
                                  <Box sx={{ textAlign: "right" }}>
                                    <Typography sx={{ fontSize: "0.6rem", color: "#888", fontWeight: 700, mb: 0.25, fontFamily: T.poppins }}>Credits / Used</Typography>
                                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#555", fontFamily: T.poppins }}>
                                      {unit === "hours" ? `${stats.totalHours.toFixed(1)}h` : `${(stats.totalHours / 8).toFixed(1)}d`} / {unit === "hours" ? `${stats.usedHours.toFixed(1)}h` : `${(stats.usedHours / 8).toFixed(1)}d`}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Typography sx={{ fontSize: "0.63rem", color: "#aaa", fontWeight: 600, mt: 1, pt: 0.75, borderTop: "1px solid rgba(0,0,0,0.05)", fontFamily: T.poppins }}>{lt.periods.length} period(s)</Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>

                      {/* Right: period detail */}
                      <Box sx={{ p: 2.5, overflowY: "auto", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                        {!selectedLeaveTypeInModal ? (
                          <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
                            <Box sx={{ textAlign: "center", maxWidth: 360 }}>
                              <EventNote sx={{ fontSize: 52, color: alpha(T.accent, 0.2), mb: 1.5 }} />
                              <Typography sx={{ fontWeight: 700, color: T.accent, mb: 0.75, fontSize: "0.9rem", fontFamily: T.poppins }}>Select a leave type</Typography>
                              <Typography variant="body2" sx={{ color: "#888", fontWeight: 600, fontSize: "0.82rem", fontFamily: T.poppins }}>Choose a leave type on the left to see per-period credits, usage, and remaining balance.</Typography>
                            </Box>
                          </Box>
                        ) : (
                          <>
                            <Box sx={{ mb: 2, p: 2, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                              <Box>
                                <Typography sx={{ fontWeight: 700, color: T.accent, fontSize: "0.88rem", fontFamily: T.poppins }}>{getLeaveLabel(selectedLeaveTypeInModal.leave_code, leaveTypes)}</Typography>
                                <Typography variant="caption" sx={{ color: "#777", fontWeight: 600, fontFamily: T.poppins }}>Use Edit to modify · Transfer to commute remaining balance</Typography>
                              </Box>
                              <Chip label={`${selectedLeaveTypeInModal.periods.length} period(s)`} size="small" sx={{ bgcolor: T.accentFaint, color: T.accent, fontWeight: 700, border: `1px solid ${T.accentBorder}`, fontSize: "0.72rem", fontFamily: T.poppins }} />
                            </Box>
                            {commuteSuccess && <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2, borderRadius: 2 }}><Typography sx={{ fontFamily: T.poppins }}>{commuteSuccess}</Typography></Alert>}
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {[...selectedLeaveTypeInModal.periods].sort((a, b) => { if (b.period_year !== a.period_year) return b.period_year - a.period_year; return semOrder(b.period_semester) - semOrder(a.period_semester); }).map((period, index) => {
                                const sc = getStatusColor(period.remaining_hours, period.total_hours);
                                const isLatest = index === 0;
                                const isLocked = isCommutedLocked(period);
                                return (
                                  <Box key={period.id} sx={{ borderRadius: 2, border: isLatest ? "2px solid #2E7D32" : `1px solid ${T.accentBorder}`, bgcolor: isLatest ? "rgba(46,125,50,0.04)" : "#fff", overflow: "hidden" }}>
                                    <Box sx={{ px: 2.5, py: 2, opacity: isLocked ? 0.85 : 1 }}>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5, flexWrap: "wrap" }}>
                                        <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1.5, bgcolor: `${sc}18`, border: `1px solid ${sc}30` }}>
                                          <Typography sx={{ fontWeight: 900, color: sc, fontSize: "0.88rem", fontFamily: T.poppins }}>{periodLabel(period.period_year, period.period_semester)}</Typography>
                                        </Box>
                                        {isLatest && <Chip label="Most Recent" size="small" sx={{ bgcolor: "#2E7D32", color: "#fff", fontWeight: 700, fontSize: "0.68rem", height: 22, fontFamily: T.poppins }} />}
                                        {isLocked && <Chip size="small" icon={<CommutationIcon style={{ fontSize: 11 }} />} label="Commuted" sx={{ height: 22, fontSize: "0.68rem", bgcolor: T.accentFaint, color: T.accent, fontWeight: 700, fontFamily: T.poppins }} />}
                                      </Box>
                                      {isLocked && (
                                        <Alert severity="info" sx={{ borderRadius: 1.5, mb: 1.5, py: 0.5, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                                          <Typography variant="caption" sx={{ fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>Commuted periods are locked. Create a new assignment for additional credits.</Typography>
                                        </Alert>
                                      )}
                                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) 1.25fr", gap: 1 }}>
                                        {[
                                          ["New Credits", toNum(period.allocated_hours), T.accent, T.accentFaint],
                                          ["Used", toNum(period.used_hours), "#ed6c02", "rgba(237,108,2,0.05)"],
                                          ["Available", toNum(period.remaining_hours), sc, `${sc}12`],
                                          ["Total", toNum(period.total_hours), "#2E7D32", "rgba(46,125,50,0.05)"],
                                        ].map(([label, val, color, bg]) => (
                                          <Box key={label} sx={{ textAlign: "center", p: 1, borderRadius: 1.5, bgcolor: bg }}>
                                            <Typography variant="caption" sx={{ color: "#888", display: "block", mb: 0.25, fontSize: "0.58rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, fontFamily: T.poppins }}>{label}</Typography>
                                            <Typography sx={{ fontWeight: 900, color, fontSize: "0.9rem", fontFamily: T.poppins }}>{unit === "hours" ? `${val.toFixed(1)}h` : `${(val / 8).toFixed(2)}d`}</Typography>
                                            <Typography sx={{ fontSize: "0.58rem", color: "#aaa", fontFamily: T.poppins }}>{unit === "hours" ? `(${(val / 8).toFixed(2)}d)` : `(${val.toFixed(1)}h)`}</Typography>
                                          </Box>
                                        ))}
                                        <Box sx={{ textAlign: "center", p: 1, borderRadius: 1.5, bgcolor: toNum(period.carried_forward_hours) > 0 ? "rgba(46,125,50,0.08)" : "rgba(0,0,0,0.02)", border: `1.5px dashed ${toNum(period.carried_forward_hours) > 0 ? "rgba(46,125,50,0.3)" : "rgba(0,0,0,0.1)"}` }}>
                                          <Typography variant="caption" sx={{ color: toNum(period.carried_forward_hours) > 0 ? "#2E7D32" : "#bbb", display: "block", mb: 0.25, fontSize: "0.58rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, fontFamily: T.poppins }}>Carry-Over</Typography>
                                          <Typography sx={{ fontWeight: 900, color: toNum(period.carried_forward_hours) > 0 ? "#2E7D32" : "#ccc", fontSize: "0.9rem", fontFamily: T.poppins }}>{unit === "hours" ? `${toNum(period.carried_forward_hours).toFixed(1)}h` : `${(toNum(period.carried_forward_hours) / 8).toFixed(2)}d`}</Typography>
                                          <Typography sx={{ fontSize: "0.52rem", color: "#aaa", fontWeight: 700, mt: 0.2, fontFamily: T.poppins }}>info only</Typography>
                                        </Box>
                                      </Box>
                                    </Box>
                                    <Box sx={{ borderTop: `1px solid ${T.accentBorder}`, px: 2.5, py: 1.25, bgcolor: canCommute(period) ? T.accentFaint : "rgba(0,0,0,0.02)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                                      <Typography variant="caption" sx={{ color: "#888", fontWeight: 700, fontFamily: T.poppins }}>{canCommute(period) ? `${hoursToLabel(toNum(period.remaining_hours), unit)} available to commute` : "No remaining balance"}</Typography>
                                      <Box sx={{ display: "flex", gap: 1 }}>
                                        {!isLocked && (
                                          <AccentButton onClick={(e) => { e.stopPropagation(); handleOpenModal(period); setIsEditing(true); }} variant="outlined" size="small" startIcon={<EditIcon sx={{ fontSize: "13px !important" }} />}
                                            sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28, borderColor: T.accentBorder, color: T.accent, "&:hover": { borderColor: T.accent, bgcolor: T.accentFaint, transform: "none" } }}>
                                            Edit
                                          </AccentButton>
                                        )}
                                        <AccentButton
                                          onClick={(e) => { e.stopPropagation(); setCommutePeriod({ ...period, fullName: selectedEmployeeLeaves.fullName }); setCommuteDialogOpen(true); setCommuteSuccess(""); }}
                                          disabled={!canCommute(period)}
                                          variant={canCommute(period) ? "contained" : "outlined"}
                                          size="small"
                                          startIcon={<CommutationIcon sx={{ fontSize: "13px !important" }} />}
                                          sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28, bgcolor: canCommute(period) ? T.accent : "transparent", color: canCommute(period) ? "#fff" : "#bbb", borderColor: canCommute(period) ? T.accent : "#ddd", "&:hover": { bgcolor: canCommute(period) ? T.accentDark : "transparent", transform: canCommute(period) ? "translateY(-1px)" : "none" }, "&:disabled": { bgcolor: "transparent !important", color: "#ccc !important", borderColor: "#eee !important" } }}>
                                          {canCommute(period) ? "Transfer" : "Commuted"}
                                        </AccentButton>
                                      </Box>
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </>
                        )}
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </Fade>
          </Modal>

          {/* ── Edit Assignment Modal ── */}
          <Modal open={!!editAssignment} onClose={handleCloseModal} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <Fade in={!!editAssignment}>
              <Box sx={{ backgroundColor: "#fff", borderRadius: 3, width: "100%", maxWidth: "560px", maxHeight: "90vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", fontFamily: T.poppins }}>
                {editAssignment && (() => {
                  const isEditLocked = isCommutedLocked(editAssignment);
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
                            <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", fontFamily: T.poppins }}>{editAssignment.fullName || editAssignment.employeeNumber} · {editAssignment.leave_code}</Typography>
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

                      <Box sx={{ px: 3.5, py: 3, overflowY: "auto", flexGrow: 1, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}><Typography sx={{ fontFamily: T.poppins }}>{error}</Typography></Alert>}
                        {isEditLocked && (
                          <Alert severity="info" sx={{ mb: 2, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontWeight: 700, color: T.accent, mb: 0.25, fontFamily: T.poppins }}>Locked — already commuted</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#666", fontFamily: T.poppins }}>To add credits, create a new assignment for a new period.</Typography>
                          </Alert>
                        )}

                        {/* Summary */}
                        <Box sx={{ mb: 2.5, p: 2.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box>
                            <Typography sx={fieldLabelSx}>Remaining Balance</Typography>
                            <RemainingBalance hoursLike={toNum(editAssignment.remaining_hours)} color={getStatusColor(toNum(editAssignment.remaining_hours), toNum(editAssignment.total_hours))} unit={unit} alignItems="flex-start" large />
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography sx={fieldLabelSx}>Period</Typography>
                            <Typography sx={{ fontWeight: 800, color: T.text, fontSize: "1rem", fontFamily: T.poppins }}>{periodLabel(editAssignment.period_year, editAssignment.period_semester)}</Typography>
                            <Box sx={{ mt: 0.5, px: 1.25, py: 0.3, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "inline-block" }}>
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>{editAssignment.leave_code}</Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Stats row */}
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: 2.5 }}>
                          {[["Total", toNum(editAssignment.total_hours), T.accent], ["Used", toNum(editAssignment.used_hours), "#ed6c02"], ["Remaining", toNum(editAssignment.remaining_hours), getStatusColor(toNum(editAssignment.remaining_hours), toNum(editAssignment.total_hours))]].map(([label, val, color]) => (
                            <Box key={label} sx={{ p: 1.5, borderRadius: 2, textAlign: "center", bgcolor: `${color}08`, border: `1px solid ${color}20` }}>
                              <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, mb: 0.25, fontFamily: T.poppins }}>{label}</Typography>
                              <Typography sx={{ fontWeight: 900, color, fontSize: "0.95rem", lineHeight: 1, fontFamily: T.poppins }}>{unit === "hours" ? `${val.toFixed(1)}h` : `${(val / 8).toFixed(2)}d`}</Typography>
                              <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>{unit === "hours" ? `(${(val / 8).toFixed(2)}d)` : `(${val.toFixed(1)} hrs)`}</Typography>
                            </Box>
                          ))}
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
                            <CreditInput label="Carried Forward" valueHours={editCarriedHours} onChangeHours={setEditCarriedHours} unit={unit} disabled={isEditLocked} color="#2E7D32" />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <CreditInput label="Allocated Credits" valueHours={editAllocatedHours} onChangeHours={setEditAllocatedHours} unit={unit} disabled={isEditLocked} color="#1976d2" />
                          </Grid>
                          {!isEditLocked && (
                            <Grid item xs={12}>
                              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Remaining Hours (manual override)</Typography>
                              <FieldInput
                                type="number"
                                value={toNum(editAssignment.remaining_hours)}
                                onChange={(e) => setEditAssignment({ ...editAssignment, remaining_hours: parseFloat(e.target.value) || 0 })}
                                fullWidth size="small"
                                inputProps={{ min: 0, step: 1 }}
                                InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: "#888", fontWeight: 700, fontFamily: T.poppins }}>hrs</Typography></InputAdornment> }}
                              />
                            </Grid>
                          )}
                        </Grid>
                      </Box>

                      <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", display: "flex", justifyContent: "flex-end", gap: 1, flexShrink: 0 }}>
                        {!isEditLocked && (
                          <AccentButton onClick={() => handleDelete(editAssignment.id)} variant="outlined" startIcon={<DeleteIcon sx={{ fontSize: "13px !important" }} />}
                            sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: "#ffcdd2", color: "#c62828", mr: "auto", "&:hover": { bgcolor: "rgba(198,40,40,0.04)", borderColor: "#c62828", transform: "none" } }}>
                            Delete
                          </AccentButton>
                        )}
                        <AccentButton onClick={handleCloseModal} variant="outlined" sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>
                          {isEditLocked ? "Close" : "Cancel"}
                        </AccentButton>
                        {!isEditLocked && (
                          <AccentButton onClick={handleUpdate} variant="contained" startIcon={<SaveIcon sx={{ fontSize: "13px !important" }} />}
                            sx={{ fontSize: "0.8rem", fontFamily: T.poppins, bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark } }}>
                            Save Changes
                          </AccentButton>
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

      {/* ── Floating Reset to Default button ── */}
      <Tooltip title={`Auto-assign leave types to all ${[...new Set(assignments.map((a) => a.employeeNumber))].length} employees with existing records`} placement="left">
        <Button
          onClick={() => setBulkAssignOpen(true)}
          variant="contained"
          startIcon={<AutoAssignIcon />}
          sx={{
            position: "fixed", bottom: 70, right: 32, zIndex: 1200,
            bgcolor: T.accent, color: "#fff", borderRadius: 3,
            fontWeight: 700, fontFamily: T.poppins, px: 3, py: 1.5,
            fontSize: "0.875rem", boxShadow: `0 6px 20px ${alpha(T.accent, 0.45)}`,
            whiteSpace: "nowrap",
            "&:hover": { bgcolor: T.accentDark, boxShadow: `0 8px 28px ${alpha(T.accent, 0.55)}`, transform: "translateY(-2px)" },
            transition: "all 0.2s ease",
          }}
        >
          Reset to Default
        </Button>
      </Tooltip>
    </>
  );
};

export default LeaveAssignment;