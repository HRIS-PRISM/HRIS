/**
 * ServiceCredit.jsx — Redesigned to match LeaveAssignment style
 *
 * New features:
 *  - Matches LeaveAssignment dark-red theme (#6d2323)
 *  - Month names instead of numbers
 *  - Dynamic OT types (fetched from DB, not hardcoded)
 *  - Employment category filter on records panel
 *  - 40hr employees default to Commutative but can be overridden
 *  - Manual SC type override (commutative / non_commutative / tempo)
 *  - Tabs: Commutative vs Non-Commutative SC records
 *  - SC records isolated by employment category snapshot
 *    (30hr SC and 40hr SC cannot be mixed)
 *
 * PATCHED: Employee names displayed as "LASTNAME, Firstname Middlename Ext"
 *          in both the selector dropdown and the record cards.
 */

import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Typography, TextField, Button, Box, Grid, Chip, Modal, IconButton,
  Select, MenuItem, FormControl, Alert, InputAdornment, Card, Avatar,
  Divider, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
  TablePagination, Tooltip, Fade, CircularProgress,
  ToggleButton, ToggleButtonGroup, Tabs, Tab,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon, Close,
  Search as SearchIcon, Person as PersonIcon,
  Refresh as RefreshIcon,
  AccessTime as HoursIcon, Today as DaysIcon,
  ViewModule as ViewModuleIcon, ViewList as ViewListIcon,
  Reorder,
  CheckCircle as CheckIcon,
  MonetizationOn as MonetizeIcon,
  SwapHoriz as ConvertIcon,
  Block as BlockIcon,
  WorkHistory as SCIcon,
  AccountBalance as CommIcon,
  Lock as LockIcon,
  FlashOn as OTIcon,
  Domain as DomainIcon,
  Work as WorkIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";

// ─── Google Font + keyframes ──────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
@keyframes scFadeUp {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes scPulse {
  0%,100% { opacity:1; }
  50%      { opacity:0.55; }
}
`;

// ─── Theme tokens — matching LeaveAssignment dark-red ────────────────────────
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover:  "rgba(109,35,35,0.10)",
  headerGrad:   "linear-gradient(180deg,#6d2323 0%,#7e2c2c 100%)",
  // SC-type colours
  commColor:    "#2E7D32",
  nonCommColor: "#5D4037",
  tempoColor:   "#1565C0",
  // Neutrals
  rowEven:   "#ffffff",
  rowOdd:    "rgba(109,35,35,0.025)",
  rowHover:  "rgba(109,35,35,0.055)",
  text:      "#1a1a1a",
  muted:     "#6b6b6b",
  faint:     "#a0a0a0",
  surface:   "#ffffff",
  divider:   "rgba(0,0,0,0.08)",
  poppins:   "'Poppins', sans-serif",
};

// ─── Month helpers ────────────────────────────────────────────────────────────
const MONTHS = [
  { value: "",   label: "No specific month" },
  { value: "1",  label: "January"   },
  { value: "2",  label: "February"  },
  { value: "3",  label: "March"     },
  { value: "4",  label: "April"     },
  { value: "5",  label: "May"       },
  { value: "6",  label: "June"      },
  { value: "7",  label: "July"      },
  { value: "8",  label: "August"    },
  { value: "9",  label: "September" },
  { value: "10", label: "October"   },
  { value: "11", label: "November"  },
  { value: "12", label: "December"  },
];

const monthName = (m) => {
  if (!m) return "";
  return MONTHS.find((x) => x.value === String(m))?.label || `Month ${m}`;
};

const periodLabel = (year, month) => {
  if (!year) return "Unknown period";
  if (!month) return String(year);
  return `${year} · ${monthName(month)}`;
};

// ─── SC Type meta ─────────────────────────────────────────────────────────────
const SC_TYPE = {
  commutative:     { label: "Commutative",        color: "#2E7D32", bg: "rgba(46,125,50,0.08)",  border: "rgba(46,125,50,0.25)",  icon: <CommIcon sx={{ fontSize: 13 }} /> },
  non_commutative: { label: "Non-Commutative",    color: "#5D4037", bg: "rgba(93,64,55,0.08)",   border: "rgba(93,64,55,0.25)",   icon: <LockIcon sx={{ fontSize: 13 }} /> },
  tempo:           { label: "Leave-Only (Tempo)", color: "#1565C0", bg: "rgba(21,101,192,0.08)", border: "rgba(21,101,192,0.25)", icon: <SCIcon   sx={{ fontSize: 13 }} /> },
};

const SC_ACTIONS = {
  commutative:     ["convert_to_sl", "convert_to_vl", "monetize"],
  non_commutative: ["offset"],
  tempo:           ["use_as_leave"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNum    = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmtHrs   = (h, unit) => unit === "hours"
  ? `${toNum(h).toFixed(3)} hrs`
  : `${(toNum(h) / 8).toFixed(3)} days`;
const getStatusColor = (rem, total) => {
  if (!total || total === 0) return "#9e9e9e";
  const p = (rem / total) * 100;
  return p > 50 ? "#2e7d32" : p > 20 ? "#ed6c02" : "#d32f2f";
};

const deriveSCType = (empCatData) => {
  if (!empCatData) return "non_commutative";
  if (empCatData.isTempo || empCatData.is_tempo) return "tempo";
  if (empCatData.isDesignated || empCatData.is_designated) return "commutative";
  if (empCatData.is40hrs || empCatData.isFortyHours) return "commutative";
  return "non_commutative";
};

const computeSCFromOT = (otHours, empCatData) => {
  const ot = toNum(otHours);
  if (!empCatData) return ot;
  const isThirtyHr = empCatData.is30hrs || empCatData.isThirtyHours;
  const multiplier = isThirtyHr ? (40 / 30) : 1;
  return parseFloat((ot * multiplier).toFixed(3));
};

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
    borderRadius: 8, fontSize: "0.875rem", backgroundColor: "#fff",
    "& fieldset": { borderColor: T.accentBorder },
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
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

// ─── Badges ───────────────────────────────────────────────────────────────────
const SCTypeBadge = ({ scType, size = "small" }) => {
  const meta = SC_TYPE[scType] || null;
  if (!meta) return null;
  return (
    <Chip size="small" label={meta.label}
      sx={{ height: size === "large" ? 24 : 18, fontSize: size === "large" ? "0.72rem" : "0.62rem", fontWeight: 700,
        bgcolor: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontFamily: T.poppins,
        "& .MuiChip-label": { px: 0.75 } }} />
  );
};

const DeptBadge = ({ code, light = false }) => {
  if (!code) return null;
  if (light) return (
    <Chip size="small" icon={<DomainIcon style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }} />} label={code}
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(255,255,255,0.15)", color: "#fff",
        border: "1px solid rgba(255,255,255,0.3)", "& .MuiChip-label": { px: 0.75 } }} />
  );
  return (
    <Chip size="small" icon={<DomainIcon style={{ fontSize: 10, color: T.accentMid }} />} label={code}
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: T.accentFaint, color: T.accent,
        border: `1px solid ${T.accentBorder}`, "& .MuiChip-label": { px: 0.75 } }} />
  );
};

const EmpCatBadge = ({ label, colorHex, light = false }) => {
  if (!label) return null;
  const color = colorHex || "#757575";
  if (light) return (
    <Chip size="small" icon={<WorkIcon style={{ fontSize: 10, color: "rgba(255,255,255,0.85)" }} />} label={label}
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(255,255,255,0.15)", color: "#fff",
        border: "1px solid rgba(255,255,255,0.3)", maxWidth: 160,
        "& .MuiChip-label": { px: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }} />
  );
  return (
    <Chip size="small" icon={<WorkIcon style={{ fontSize: 10, color }} />} label={label}
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: alpha(color, 0.1), color,
        border: `1px solid ${alpha(color, 0.3)}`, maxWidth: 180,
        "& .MuiChip-label": { px: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }} />
  );
};

// ─── SC Rule Engine Panel ─────────────────────────────────────────────────────
const SCRuleEnginePanel = ({ scType, empCatData, employee }) => {
  if (!employee) return null;
  const meta = SC_TYPE[scType] || SC_TYPE.non_commutative;
  const descriptions = {
    commutative:     ["✔ Can be converted to SL or VL credits", "✔ Eligible for Monetization", "✔ Credited based on OT hours rendered"],
    non_commutative: ["⚠ For offset use only (no SL/VL conversion)", "⚠ Cannot be monetized", "✔ Credited based on OT hours rendered"],
    tempo:           ["✔ SC functions as Leave credits only", "✗ No SL/VL assignment allowed", "✔ SC earns through OT; used like leave days"],
  };
  const lines = descriptions[scType] || descriptions.non_commutative;
  return (
    <Box sx={{ p: 2, borderRadius: 2, border: `1.5px solid ${meta.border || T.accentBorder}`,
      bgcolor: meta.bg || T.accentFaint, mb: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box sx={{ color: meta.color }}>{meta.icon}</Box>
        <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: meta.color, fontFamily: T.poppins }}>
          SC Rule: {meta.label}
        </Typography>
        {empCatData?.isTempo      && <Chip label="Tempo"      size="small" sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: alpha(T.tempoColor, 0.12),    color: T.tempoColor,    border: `1px solid ${alpha(T.tempoColor, 0.3)}`,    fontFamily: T.poppins }} />}
        {empCatData?.isDesignated && <Chip label="Designated" size="small" sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: alpha(T.commColor,  0.12),    color: T.commColor,     border: `1px solid ${alpha(T.commColor,  0.3)}`,    fontFamily: T.poppins }} />}
        {empCatData?.is40hrs      && <Chip label="40-hr week" size="small" sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: "rgba(46,125,50,0.1)",         color: "#2E7D32",       border: "1px solid rgba(46,125,50,0.25)",           fontFamily: T.poppins }} />}
        {empCatData?.is30hrs      && <Chip label="30-hr week" size="small" sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: "rgba(103,58,183,0.1)",         color: "#6a1b9a",       border: "1px solid rgba(103,58,183,0.25)",          fontFamily: T.poppins }} />}
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
        {lines.map((l, i) => (
          <Typography key={i} sx={{ fontSize: "0.72rem", color: meta.color, fontFamily: T.poppins,
            fontWeight: l.startsWith("✗") ? 700 : 500, opacity: l.startsWith("✗") ? 1 : 0.85 }}>{l}</Typography>
        ))}
      </Box>
    </Box>
  );
};

// ─── Dynamic OT Input Row ─────────────────────────────────────────────────────
const OTInputRow = ({ label, otHours, onChangeOT, scHours, unit, note = "" }) => {
  const [draft, setDraft] = useState(null);

  // otHours is always stored in hours internally.
  // Display converts to days when unit === "days".
  const committedInUnit = otHours === 0 ? "" : unit === "days"
    ? String(parseFloat((otHours / 8).toFixed(3)))
    : String(otHours);
  const displayValue = draft !== null ? draft : committedInUnit;

  const handleBlur = () => {
    const num = parseFloat(draft);
    if (isNaN(num) || draft?.trim() === "") { onChangeOT(0); }
    else { onChangeOT(unit === "days" ? parseFloat((num * 8).toFixed(3)) : num); }
    setDraft(null);
  };

  const unitLabel   = unit === "days" ? "OT days" : "OT hrs";
  const placeholder = unit === "days" ? "0.000 days" : "0.000 hrs";

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", gap: 1, alignItems: "center",
      px: 1.5, py: 1, borderRadius: 1.5,
      border: scHours > 0 ? "1px solid rgba(46,125,50,0.3)" : `1px solid ${T.accentBorder}`,
      bgcolor: scHours > 0 ? "rgba(46,125,50,0.03)" : T.rowEven }}>
      <Box>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>{label}</Typography>
        {note && <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>{note}</Typography>}
      </Box>
      <FieldInput type="text" inputMode="decimal" size="small" fullWidth
        value={displayValue} placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setDraft(committedInUnit)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        sx={{ "& .MuiInputBase-input": { fontWeight: 700, color: "#1976d2" } }}
        InputProps={{ endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: "0.65rem", color: T.faint, fontWeight: 700 }}>{unitLabel}</Typography></InputAdornment> }}
      />
      <Box sx={{ textAlign: "center" }}>
        <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}>SC earned</Typography>
        <Typography sx={{ fontSize: "0.82rem", fontWeight: 800,
          color: scHours > 0 ? "#2e7d32" : T.faint, fontFamily: T.poppins }}>
          {fmtHrs(scHours, unit)}
        </Typography>
      </Box>
    </Box>
  );
};

// ─── SC Action Dialog ─────────────────────────────────────────────────────────
const SCActionDialog = ({ open, record, action, onClose, onConfirm, loading }) => {
  const [hoursToConvert, setHoursToConvert] = useState(0);

  useEffect(() => {
    if (open) setHoursToConvert(toNum(record?.remaining_hours));
  }, [open, record]);

  if (!record) return null;
  const remHrs = toNum(record.remaining_hours);
  const titles = {
    convert_to_sl: "Convert SC → Sick Leave",
    convert_to_vl: "Convert SC → Vacation Leave",
    monetize:      "Monetize Service Credit",
    offset:        "Apply SC as Offset",
    use_as_leave:  "Use SC as Leave",
  };
  const title      = titles[action] || "SC Action";
  const isConvert  = action === "convert_to_sl" || action === "convert_to_vl";
  const isMonetize = action === "monetize";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", fontFamily: T.poppins } }}>
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isConvert ? <ConvertIcon sx={{ fontSize: 18, color: "#fff" }} /> : isMonetize ? <MonetizeIcon sx={{ fontSize: 18, color: "#fff" }} /> : <SCIcon sx={{ fontSize: 18, color: "#fff" }} />}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.92rem", fontFamily: T.poppins }}>{title}</Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", fontFamily: T.poppins }}>{record.fullName || record.employeeNumber}</Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "rgba(255,255,255,0.75)" }}><Close sx={{ fontSize: 16 }} /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, borderRadius: 2, p: 2, mb: 2 }}>
          {[
            ["Employee",          record.fullName || record.employeeNumber],
            ["SC Type",           SC_TYPE[record.sc_type]?.label || record.sc_type],
            ["Period",            periodLabel(record.period_year, record.period_month)],
            ["Available Balance", `${toNum(remHrs).toFixed(3)} hrs (${(toNum(remHrs) / 8).toFixed(3)} days)`],
          ].map(([lbl, val]) => (
            <Box key={lbl} sx={{ display: "flex", justifyContent: "space-between", py: 0.5,
              borderBottom: "1px solid rgba(0,0,0,0.05)", "&:last-child": { borderBottom: "none" } }}>
              <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontWeight: 700, fontFamily: T.poppins }}>{lbl}</Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>{val}</Typography>
            </Box>
          ))}
        </Box>
        {isConvert && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
              Hours to Convert (max {remHrs.toFixed(3)})
            </Typography>
            <FieldInput type="number" size="small" fullWidth
              value={hoursToConvert || ""} inputProps={{ min: 0, max: remHrs, step: 0.001 }}
              onChange={(e) => setHoursToConvert(Math.min(parseFloat(e.target.value) || 0, remHrs))}
              InputProps={{ endAdornment: <InputAdornment position="end">
                <Typography sx={{ fontSize: "0.7rem", color: T.faint, fontWeight: 700 }}>hrs = {(hoursToConvert / 8).toFixed(3)} days</Typography>
              </InputAdornment> }}
            />
          </Box>
        )}
        <Alert severity={isMonetize ? "success" : "info"} sx={{ borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins }}>
            {isMonetize
              ? "The remaining SC balance will be converted to monetary equivalent based on the employee's daily rate."
              : isConvert
              ? `${hoursToConvert.toFixed(3)} hrs of SC will be credited to the employee's ${action === "convert_to_sl" ? "Sick Leave" : "Vacation Leave"} balance.`
              : "SC balance will be applied as an offset. This action cannot be undone."}
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", gap: 1 }}>
        <AccentButton onClick={onClose} variant="outlined"
          sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: T.accentBorder, color: T.muted }}>Cancel</AccentButton>
        <AccentButton
          onClick={() => onConfirm({ action, hoursToConvert, targetLeaveCode: action === "convert_to_sl" ? "SL" : action === "convert_to_vl" ? "VL" : null })}
          disabled={loading || (isConvert && hoursToConvert <= 0)}
          variant="contained"
          startIcon={loading ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : isConvert ? <ConvertIcon sx={{ fontSize: "14px !important" }} /> : <MonetizeIcon sx={{ fontSize: "14px !important" }} />}
          sx={{ fontSize: "0.8rem", fontFamily: T.poppins, bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark } }}>
          {loading ? "Processing…" : "Confirm"}
        </AccentButton>
      </DialogActions>
    </Dialog>
  );
};

// ─── Bone skeleton primitive ──────────────────────────────────────────────────
const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)`,
    backgroundSize: "800px 100%",
    animation: "scShimmer 1.6s infinite linear",
    flexShrink: 0, ...sx,
  }} />
);

// ─── Full-page wireframe ──────────────────────────────────────────────────────
const ServiceCreditWireframe = () => (
  <>
    <style>{`
      @keyframes scShimmer {
        0%   { background-position: -800px 0; }
        100% { background-position:  800px 0; }
      }
      @keyframes scPulse {
        0%,100% { opacity:1; }
        50%     { opacity:0.55; }
      }
    `}</style>
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
      {/* ── Page header skeleton ── */}
      <Box
        sx={{
          mb: 2,
          borderRadius: "12px",
          overflow: "hidden",
          border: `1px solid rgba(109,35,35,0.12)`,
          animation: "scPulse 2s ease-in-out infinite",
        }}
      >
        <Box
          sx={{
            p: 3,
            background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box sx={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.06)" }} />
          <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.04)" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.1)", flexShrink: 0 }} />
            <Box>
              <Bone w={240} h={16} sx={{ mb: 1 }} />
              <Bone w={380} h={10} />
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, position: "relative", zIndex: 1, alignItems: "center" }}>
            {/* SC type legend chips skeleton */}
            <Box sx={{ display: "flex", gap: 0.75 }}>
              {[90, 110, 100].map((w, i) => (
                <Bone key={i} w={w} h={24} r={6} />
              ))}
            </Box>
            <Bone w={90} h={30} r={20} />
            <Bone w={36} h={36} r={8} />
          </Box>
        </Box>
      </Box>

      {/* ── Two-column body skeleton ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 2 }}>

        {/* ── Left col — Record SC Form ── */}
        <Box
          sx={{
            borderRadius: "12px",
            border: `1px solid rgba(109,35,35,0.12)`,
            overflow: "hidden",
            bgcolor: "#fff",
            height: "calc(100vh - 280px)",
            minHeight: 480,
            display: "flex",
            flexDirection: "column",
            animation: "scPulse 2s ease-in-out 0.05s infinite",
          }}
        >
          {/* Col header */}
          <Box sx={{ px: 2.5, py: 1.25, borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(109,35,35,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 13, height: 13, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.2)" }} />
              <Bone w={170} h={10} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Bone w={50} h={9} />
              <Bone w={100} h={26} r={6} />
            </Box>
          </Box>

          <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5, flex: 1, overflowY: "hidden" }}>
            {/* Employee autocomplete */}
            <Box>
              <Bone w={130} h={10} sx={{ mb: 0.75 }} />
              <Bone w="100%" h={36} r={8} />
            </Box>
            {/* Period row */}
            <Box sx={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 1.5 }}>
              <Box>
                <Bone w={80} h={10} sx={{ mb: 0.75 }} />
                <Bone w="100%" h={36} r={8} />
              </Box>
              <Box>
                <Bone w={100} h={10} sx={{ mb: 0.75 }} />
                <Bone w="100%" h={36} r={8} />
              </Box>
            </Box>
            {/* SC Rule Engine panel skeleton */}
            <Box sx={{ borderRadius: 2, border: "1px solid rgba(46,125,50,0.25)", bgcolor: "rgba(46,125,50,0.04)", p: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                <Box sx={{ width: 13, height: 13, borderRadius: "50%", bgcolor: "rgba(46,125,50,0.2)" }} />
                <Bone w={160} h={10} />
                <Bone w={60} h={16} r={20} sx={{ ml: "auto" }} />
              </Box>
              {[120, 160, 140].map((w, i) => (
                <Bone key={i} w={w} h={9} sx={{ mb: 0.5 }} />
              ))}
            </Box>
            {/* SC Type override panel skeleton */}
            <Box sx={{ borderRadius: 2, border: "1px solid rgba(109,35,35,0.12)", bgcolor: "rgba(109,35,35,0.04)", p: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: "2px", bgcolor: "rgba(109,35,35,0.2)" }} />
                <Bone w={100} h={9} />
              </Box>
              <Box sx={{ display: "flex", gap: 0.75 }}>
                {[45, 90, 120, 110].map((w, i) => (
                  <Bone key={i} w={w} h={28} r={7} />
                ))}
              </Box>
            </Box>
            {/* OT column headers */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", gap: 1, px: 1.5, py: 0.75, bgcolor: "rgba(109,35,35,0.04)", borderRadius: 1 }}>
              {[80, 100, 65].map((w, i) => <Bone key={i} w={w} h={9} />)}
            </Box>
            {/* OT input rows */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {[1, 2, 3].map((i) => (
                <Box
                  key={i}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 0.7fr",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    border: "1px solid rgba(0,0,0,0.08)",
                    bgcolor: "rgba(0,0,0,0.01)",
                    animation: `scPulse 1.6s ease-in-out ${i * 0.08}s infinite`,
                  }}
                >
                  <Box>
                    <Bone w={70} h={11} sx={{ mb: 0.4 }} />
                    <Bone w={90} h={8} />
                  </Box>
                  <Bone w="100%" h={30} r={6} />
                  <Box sx={{ textAlign: "center" }}>
                    <Bone w={50} h={8} sx={{ mb: 0.4, mx: "auto" }} />
                    <Bone w={60} h={14} sx={{ mx: "auto" }} />
                  </Box>
                </Box>
              ))}
              {/* Total row */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", gap: 1, px: 1.5, py: 1.25, borderRadius: 1.5, bgcolor: "rgba(109,35,35,0.05)", border: "1.5px solid rgba(109,35,35,0.14)" }}>
                <Bone w={50} h={12} />
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bone w={80} h={20} r={4} />
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Bone w={40} h={8} sx={{ mb: 0.4, mx: "auto" }} />
                  <Bone w={55} h={16} sx={{ mx: "auto" }} />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Submit button */}
          <Box sx={{ px: 2.5, pb: 2, pt: 1, borderTop: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}>
            <Bone w="100%" h={40} r={8} />
          </Box>
        </Box>

        {/* ── Right col — SC Records Panel ── */}
        <Box
          sx={{
            borderRadius: "12px",
            border: `1px solid rgba(109,35,35,0.12)`,
            overflow: "hidden",
            bgcolor: "#fff",
            height: "calc(100vh - 280px)",
            minHeight: 480,
            display: "flex",
            flexDirection: "column",
            animation: "scPulse 2s ease-in-out 0.1s infinite",
          }}
        >
          {/* Records header */}
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(109,35,35,0.05)", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 15, height: 15, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.2)" }} />
                <Bone w={160} h={12} />
              </Box>
              <Box sx={{ display: "flex", gap: 0.75 }}>
                <Bone w={140} h={22} r={20} />
                <Bone w={56} h={28} r={6} />
              </Box>
            </Box>
            {/* Tabs skeleton */}
            <Box sx={{ display: "flex", gap: 0.5, mb: 1.25, borderBottom: "2px solid rgba(109,35,35,0.1)", pb: 0.5 }}>
              {[60, 100, 105, 80].map((w, i) => (
                <Bone key={i} w={w} h={20} r={4} sx={{ opacity: i === 0 ? 1 : 0.5 }} />
              ))}
            </Box>
            {/* Search + filters */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Bone w="100%" h={32} r={8} />
              <Bone w={120} h={32} r={8} sx={{ flexShrink: 0 }} />
              <Bone w={130} h={32} r={8} sx={{ flexShrink: 0 }} />
            </Box>
          </Box>

          {/* Grid of employee cards */}
          <Box sx={{ flex: 1, overflowY: "hidden", p: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <Box
                  key={i}
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    border: "1px solid rgba(109,35,35,0.12)",
                    bgcolor: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    animation: `scPulse 1.6s ease-in-out ${i * 0.06}s infinite`,
                  }}
                >
                  {/* Avatar + name */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "rgba(109,35,35,0.1)", flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Bone w="85%" h={12} sx={{ mb: 0.4 }} />
                      <Box sx={{ display: "flex", gap: 0.4 }}>
                        <Bone w={40} h={9} />
                        <Bone w={36} h={14} r={20} />
                      </Box>
                    </Box>
                  </Box>
                  {/* SC type badges */}
                  <Box sx={{ display: "flex", gap: 0.4 }}>
                    <Bone w={80} h={16} r={20} />
                  </Box>
                  {/* Period chips */}
                  <Box sx={{ display: "flex", gap: 0.4, flexWrap: "wrap" }}>
                    {[55, 60, 52].map((w, j) => (
                      <Bone key={j} w={w} h={18} r={4} />
                    ))}
                  </Box>
                  {/* Footer */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", pt: 0.75, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <Bone w={60} h={9} />
                    <Bone w={65} h={9} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Pagination */}
          <Box sx={{ px: 2, py: 0.75, borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "flex-end", flexShrink: 0 }}>
            <Bone w={220} h={28} r={6} />
          </Box>
        </Box>
      </Box>
    </Box>
  </>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const ServiceCredit = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess("service-credits");

  // ── Data state ──────────────────────────────────────────────────────────────
  const [scRecords,       setSCRecords]       = useState([]);
  const [employees,       setEmployees]       = useState([]);
  const [empCatRawMap,    setEmpCatRawMap]    = useState({});
  const [empCatLabelMap,  setEmpCatLabelMap]  = useState({});
  const [deptMap,         setDeptMap]         = useState({});
  const [otTypes,         setOtTypes]         = useState([]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [periodYear,       setPeriodYear]       = useState(new Date().getFullYear().toString());
  const [periodMonth,      setPeriodMonth]      = useState("");
  const [unit,             setUnit]             = useState("days"); // ← DEFAULT CHANGED TO DAYS
  const [otValues,         setOtValues]         = useState({});
  const [otRemarks,        setOtRemarks]        = useState("");
  const [manualSCType,     setManualSCType]     = useState(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(false);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [successOpen,   setSuccessOpen]   = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [error,         setError]         = useState("");
  const [searchTerm,    setSearchTerm]    = useState("");
  const [deptFilter,    setDeptFilter]    = useState("all");
  const [empCatFilter,  setEmpCatFilter]  = useState("all");
  const [viewMode,      setViewMode]      = useState("grid");
  const [recordsPage,   setRecordsPage]   = useState(0);
  const [rowsPerPage,   setRowsPerPage]   = useState(24);
  const [recordsTab,    setRecordsTab]    = useState(0);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [employeeSCModalOpen, setEmployeeSCModalOpen] = useState(false);
  const [selectedEmployeeSC,  setSelectedEmployeeSC]  = useState(null);
  const [selectedSCRecord,    setSelectedSCRecord]    = useState(null);
  const [editRecord,          setEditRecord]          = useState(null);
  const [editHours,           setEditHours]           = useState(0);
  const [actionDialogOpen,    setActionDialogOpen]    = useState(false);
  const [actionRecord,        setActionRecord]        = useState(null);
  const [currentAction,       setCurrentAction]       = useState(null);
  const [actionLoading,       setActionLoading]       = useState(false);
  const [actionSuccess,       setActionSuccess]       = useState("");

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await Promise.all([
        fetchSCRecords(), fetchEmployees(),
        fetchDeptMap(), fetchEmpCatMap(), fetchOtTypes(),
      ]);
      setPageLoading(false);
    })();
  }, []);

  useEffect(() => { setRecordsPage(0); }, [searchTerm, deptFilter, empCatFilter, recordsTab]);

  useEffect(() => {
    setOtValues({});
    setOtRemarks("");
    setManualSCType(null);
    setError("");
  }, [selectedEmployee, periodYear, periodMonth]);

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const fetchSCRecords = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/service-credits/service_credit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSCRecords(Array.isArray(r.data) ? r.data : []);
    } catch { setSCRecords([]); }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
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
        const pd   = personalRes.value.data;
        const list = Array.isArray(pd) ? pd : pd?.data || [];
        list.forEach((p) => {
          const num = p.agencyEmployeeNum?.toString() || p.employeeNumber?.toString();
          if (num && (p.sex || p.gender)) sexMap[num] = p.sex || p.gender;
        });
      }
      setEmployees(usersData.map((u) => {
        const num = u.employeeNumber?.toString();
        return { ...u, sex: (num ? sexMap[num] : null) || u.sex || u.gender || null };
      }));
    } catch { setEmployees([]); }
  };

  const fetchDeptMap = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/department-assignment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const map = {};
      (Array.isArray(r.data) ? r.data : []).forEach((item) => {
        if (item.employeeNumber && item.code) map[item.employeeNumber.toString()] = item.code;
      });
      setDeptMap(map);
    } catch {}
  };

  const fetchEmpCatMap = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const labelMap = {};
      const rawMap   = {};
      (Array.isArray(r.data) ? r.data : []).forEach((item) => {
        if (!item.employeeNumber) return;
        const num   = item.employeeNumber.toString();
        const label = item.parentGroup && item.typeName
          ? `${item.parentGroup} | ${item.typeName}`
          : item.categoryLabel || "";
        if (label) labelMap[num] = { label, colorHex: item.colorHex || "#757575" };
        rawMap[num] = {
          isTempo:      !!(item.isTempo      || item.is_tempo),
          isDesignated: !!(item.isDesignated || item.is_designated),
          isJobOrder:   !!(item.isJobOrder   || item.is_job_order),
          is30hrs:      !!(item.is30hrs      || item.is_30hrs),
          is40hrs:      !!(item.is40hrs      || item.is_40hrs),
          colorHex:     item.colorHex || "#757575",
          label,
        };
      });
      setEmpCatLabelMap(labelMap);
      setEmpCatRawMap(rawMap);
    } catch {}
  };

  const fetchOtTypes = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/ot-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const types = Array.isArray(r.data) ? r.data : [];
      if (types.length > 0) { setOtTypes(types); return; }
    } catch {}
    setOtTypes([
      { id: "regular",    name: "Regular OT",            description: "Standard overtime hours",       multiplier: 1 },
      { id: "holiday",    name: "Holiday OT",             description: "Overtime on holidays",          multiplier: 1 },
      { id: "night_diff", name: "Night Differential OT",  description: "Night differential overtime",   multiplier: 1 },
    ]);
  };

  // ── Name formatter — LASTNAME, Firstname Middlename Ext ──────────────────
  const buildDisplayName = useCallback((e) => {
    const last  = (e?.lastName      || "").trim();
    const first = (e?.firstName     || "").trim();
    const mid   = (e?.middleName    || "").trim();
    const ext   = (e?.nameExtension || e?.suffix || "").trim();
    if (!last && !first) return (e?.fullName || "").trim() || `#${e?.employeeNumber}`;
    const given     = [first, mid].filter(Boolean).join(" ");
    const extSuffix = ext ? ` ${ext}` : "";
    return last ? `${last.toUpperCase()}, ${given}${extSuffix}` : `${given}${extSuffix}`;
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const allDeptCodes = useMemo(
    () => [...new Set(Object.values(deptMap).filter(Boolean))].sort(),
    [deptMap],
  );

  const allEmpCatLabels = useMemo(() => {
    const labels = [...new Set(Object.values(empCatLabelMap).map((x) => x.label).filter(Boolean))].sort();
    return labels;
  }, [empCatLabelMap]);

  // ── Employee options — sorted A→Z by lastName, formatted as LASTNAME, Firstname ──
  const employeeOptions = useMemo(() => {
    const withMeta = (Array.isArray(employees) ? employees : []).map((e) => {
      const displayName = buildDisplayName(e);
      const empNo       = (e?.employeeNumber || "").toString().trim();
      const sortLast    = (e?.lastName || "").trim().toLowerCase();
      return {
        ...e,
        _displayName: displayName,
        _searchKey:   `${displayName} ${empNo}`.toLowerCase(),
        _sortLast:    sortLast,
      };
    });
    return withMeta.sort((a, b) => a._sortLast.localeCompare(b._sortLast));
  }, [employees, buildDisplayName]);

  const selectedEmpCatData = useMemo(
    () => selectedEmployee
      ? (empCatRawMap[selectedEmployee.employeeNumber?.toString()] || null)
      : null,
    [selectedEmployee, empCatRawMap],
  );

  const effectiveSCType = useMemo(
    () => manualSCType || deriveSCType(selectedEmpCatData),
    [manualSCType, selectedEmpCatData],
  );

  const autoDerivedSCType = useMemo(
    () => deriveSCType(selectedEmpCatData),
    [selectedEmpCatData],
  );

  const computedSC = useMemo(() => {
    let totalOT = 0;
    let totalSC = 0;
    const byType = {};
    otTypes.forEach((t) => {
      const ot = toNum(otValues[t.id]);
      const sc = computeSCFromOT(ot * (t.multiplier || 1), selectedEmpCatData);
      byType[t.id] = { ot, sc };
      totalOT += ot;
      totalSC += sc;
    });
    return { byType, totalOT, total: parseFloat(totalSC.toFixed(3)) };
  }, [otValues, otTypes, selectedEmpCatData]);

  // ── Records filtering ─────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    const s = searchTerm.toLowerCase();
    const tabTypeMap = { 1: "commutative", 2: "non_commutative", 3: "tempo" };
    const tabType = tabTypeMap[recordsTab] || null;

    return scRecords.filter((r) => {
      const matchSearch =
        (r.fullName?.toLowerCase() || "").includes(s) ||
        (r.employeeNumber?.toString().toLowerCase() || "").includes(s);
      const matchDept = deptFilter === "all" ||
        (deptMap[r.employeeNumber?.toString()] || "") === deptFilter;
      const matchEmpCat = empCatFilter === "all" ||
        (empCatLabelMap[r.employeeNumber?.toString()]?.label || "") === empCatFilter;
      const matchTab = !tabType || r.sc_type === tabType;
      return matchSearch && matchDept && matchEmpCat && matchTab;
    });
  }, [scRecords, searchTerm, deptFilter, empCatFilter, recordsTab, deptMap, empCatLabelMap]);

  const getEmployeeInfo = useCallback(
    (num) => employees.find((e) => e.employeeNumber?.toString() === num?.toString()) ||
      { fullName: num || "Unknown" },
    [employees],
  );

  // ── PATCHED: use buildDisplayName for record cards ────────────────────────
  const groupedByEmployee = useMemo(() => {
    const acc = {};
    filteredRecords.forEach((r) => {
      const num = r.employeeNumber?.toString() || "Unknown";
      if (!acc[num]) {
        const info = getEmployeeInfo(num);
        acc[num] = {
          employeeNumber: num,
          fullName:  buildDisplayName(info) || num,
          firstName: info.firstName,
          lastName:  info.lastName,
          records:   [],
        };
      }
      acc[num].records.push(r);
    });
    return Object.values(acc).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  }, [filteredRecords, getEmployeeInfo, buildDisplayName]);

  const paginatedGroups = useMemo(() => {
    const s = recordsPage * rowsPerPage;
    return groupedByEmployee.slice(s, s + rowsPerPage);
  }, [groupedByEmployee, recordsPage, rowsPerPage]);

  const tabCounts = useMemo(() => {
    const counts = { all: scRecords.length, commutative: 0, non_commutative: 0, tempo: 0 };
    scRecords.forEach((r) => {
      if (r.sc_type && counts[r.sc_type] !== undefined) counts[r.sc_type]++;
    });
    return counts;
  }, [scRecords]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddSC = async () => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    if (!empNum) { setError("Please select an employee"); return; }
    if (computedSC.total <= 0) { setError("OT hours must be > 0 to compute SC"); return; }

    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE_URL}/api/service-credits/service_credit`,
        {
          employeeNumber:      empNum,
          sc_type:             effectiveSCType,
          ot_hours_regular:    toNum(otValues["regular"]    || otValues[otTypes[0]?.id]),
          ot_hours_holiday:    toNum(otValues["holiday"]    || otValues[otTypes[1]?.id]),
          ot_hours_night_diff: toNum(otValues["night_diff"] || otValues[otTypes[2]?.id]),
          total_ot_hours:      computedSC.totalOT,
          earned_hours:        computedSC.total,
          remaining_hours:     computedSC.total,
          used_hours:          0,
          period_year:         parseInt(periodYear, 10) || new Date().getFullYear(),
          period_month:        periodMonth || null,
          remarks:             otRemarks || null,
          emp_category_snapshot: JSON.stringify({
            label:        selectedEmpCatData?.label || "",
            is30hrs:      selectedEmpCatData?.is30hrs || false,
            is40hrs:      selectedEmpCatData?.is40hrs || false,
            isTempo:      selectedEmpCatData?.isTempo || false,
            isDesignated: selectedEmpCatData?.isDesignated || false,
          }),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchSCRecords();
      setOtValues({}); setOtRemarks(""); setManualSCType(null);
      setSuccessAction("adding"); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      setError("Error adding SC: " + (err.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/service-credits/service_credit/${editRecord.id}`,
        { ...editRecord, earned_hours: editHours,
          remaining_hours: Math.max(0, editHours - toNum(editRecord.used_hours)) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchSCRecords();
      setEditRecord(null); setError("");
      setSuccessAction("edit"); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 500);
    } catch (err) {
      setError("Error updating: " + (err.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this SC record?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/service-credits/service_credit/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchSCRecords();
      setEditRecord(null); setEmployeeSCModalOpen(false);
      setSuccessAction("delete"); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 1000);
    } catch (err) { setError("Error deleting: " + (err.response?.data?.error || err.message)); }
  };

  const handleSCAction = async ({ action, hoursToConvert, targetLeaveCode }) => {
    if (!actionRecord) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/service-credits/service_credit/${actionRecord.id}/action`,
        { action, hours: hoursToConvert, targetLeaveCode },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchSCRecords();
      setActionDialogOpen(false);
      setActionSuccess(`SC action "${action.replace(/_/g, " ")}" completed successfully.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setError("Action failed: " + (err.response?.data?.error || err.message));
    } finally { setActionLoading(false); }
  };

  const openEmployeeSCModal = (grp) => {
    setSelectedEmployeeSC(grp);
    setSelectedSCRecord(grp.records[0] || null);
    setEmployeeSCModalOpen(true);
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
if (accessLoading || pageLoading) {
    return <ServiceCreditWireframe />;
  }
  if (!hasAccess) return <AccessDenied />;

  const selectedMonthLabel = MONTHS.find((m) => m.value === periodMonth)?.label || "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <Fade in timeout={400}>
        <Box sx={{
          py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
          width: "100vw", maxWidth: "100%",
          position: "relative", left: "63%", transform: "translateX(-61%)",
          px: { xs: 2, sm: 3, md: 6 },
        }}>
          <LoadingOverlay open={loading} message="Processing service credit…" />
          <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
          <SCActionDialog
            open={actionDialogOpen} record={actionRecord} action={currentAction}
            onClose={() => setActionDialogOpen(false)}
            onConfirm={handleSCAction} loading={actionLoading}
          />

          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: "hidden" }}>
            <Box sx={{ px: 4, py: 3, background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              position: "relative", overflow: "hidden" }}>
              <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%",
                background: `radial-gradient(circle,${alpha(T.accent, 0.1)} 0%,transparent 70%)` }} />
              <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%",
                background: `radial-gradient(circle,${alpha(T.accent, 0.07)} 0%,transparent 70%)` }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, position: "relative", zIndex: 1 }}>
                <SCIcon sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: T.accent, lineHeight: 1.2, mb: 0.3, fontFamily: T.poppins }}>
                    Service Credit Management
                  </Typography>
                  <Typography sx={{ fontSize: "0.82rem", color: T.accentMid, fontWeight: 700, opacity: 0.9, fontFamily: T.poppins }}>
                    Administrative Panel • Record OT-based Service Credits · Apply SC Rule Engine
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
                <Box sx={{ display: "flex", gap: 0.75, mr: 1 }}>
                  {Object.entries(SC_TYPE).map(([key, meta]) => (
                    <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.3,
                      borderRadius: 1, bgcolor: meta.bg, border: `1px solid ${meta.border}` }}>
                      <Box sx={{ color: meta.color, display: "flex" }}>{meta.icon}</Box>
                      <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: meta.color, fontFamily: T.poppins }}>{meta.label}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                  <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>
                    {scRecords.length} records
                  </Typography>
                </Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => { fetchSCRecords(); fetchDeptMap(); fetchEmpCatMap(); fetchOtTypes(); }}
                    sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36,
                      "&:hover": { bgcolor: alpha(T.accent, 0.15) } }}>
                    <RefreshIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          <Grid container spacing={2}>
            {/* ── LEFT: Add SC Form ── */}
            <Grid item xs={12} lg={5}>
              <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>
                <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`,
                  display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <OTIcon sx={{ fontSize: 15, color: T.accent }} />
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>
                    Record Service Credit (OT)
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins }}>Display in:</Typography>
                    <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                      sx={{ "& .MuiToggleButton-root": { px: 1.25, py: 0.3, border: `1px solid ${T.accentBorder}`,
                        fontSize: "0.72rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins,
                        "&.Mui-selected": { bgcolor: T.accent, color: "#fff", borderColor: T.accent } } }}>
                      <ToggleButton value="hours"><HoursIcon sx={{ fontSize: 13, mr: 0.5 }} />Hours</ToggleButton>
                      <ToggleButton value="days"><DaysIcon sx={{ fontSize: 13, mr: 0.5 }} />Days</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>

                <Box sx={{ px: 3, py: 2, flexGrow: 1, overflowY: "auto",
                  "&::-webkit-scrollbar": { width: 4 },
                  "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                  {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontFamily: T.poppins }}>{error}</Alert>}

                  {/* ── Employee Selector ── */}
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
                      Select Employee <span style={{ color: "#c62828" }}>*</span>
                      <Box component="span" sx={{ ml: 1, fontSize: "0.65rem", fontWeight: 400, color: T.faint }}>
                        — sorted by last name A → Z
                      </Box>
                    </Typography>
                    <Autocomplete
                      value={selectedEmployee}
                      onChange={(_, v) => { setSelectedEmployee(v); setError(""); }}
                      options={employeeOptions}
                      autoHighlight
                      getOptionLabel={(o) => `${o._displayName || o.fullName || ""} (${o.employeeNumber})`}
                      filterOptions={(opts, { inputValue: iv }) =>
                        opts.filter((o) => (o._searchKey || "").includes(iv.toLowerCase().trim())).slice(0, 80)}
                      isOptionEqualToValue={(o, v) => o.employeeNumber === v.employeeNumber}
                      noOptionsText="No employees found"
                      renderOption={(props, option) => {
                        const { key, ...rest } = props;
                        const displayName = option._displayName || option.fullName || `${option.firstName || ""} ${option.lastName || ""}`.trim();
                        const initials    = `${option.lastName?.[0] || ""}${option.firstName?.[0] || ""}`.toUpperCase() || "?";
                        const deptCode    = deptMap[option.employeeNumber?.toString()];
                        const empCat      = empCatLabelMap[option.employeeNumber?.toString()];
                        return (
                          <li key={key} {...rest}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Avatar sx={{ width: 30, height: 30, bgcolor: T.accent, fontSize: "0.75rem", fontWeight: 700, borderRadius: "6px" }}>{initials}</Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins, fontSize: "0.82rem" }}>{displayName}</Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                                  <Typography variant="caption" sx={{ color: "#888", fontFamily: T.poppins }}>#{option.employeeNumber}</Typography>
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
                        {deptMap[selectedEmployee.employeeNumber?.toString()] && <DeptBadge code={deptMap[selectedEmployee.employeeNumber?.toString()]} />}
                        {empCatLabelMap[selectedEmployee.employeeNumber?.toString()] && <EmpCatBadge label={empCatLabelMap[selectedEmployee.employeeNumber?.toString()].label} colorHex={empCatLabelMap[selectedEmployee.employeeNumber?.toString()].colorHex} />}
                        {selectedEmpCatData?.isTempo     && <Chip label="Tempo Employee" size="small" sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: alpha(T.tempoColor, 0.12), color: T.tempoColor }} />}
                        {selectedEmpCatData?.isDesignated && <Chip label="Designated"    size="small" sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: alpha(T.commColor,  0.12), color: T.commColor  }} />}
                        {selectedEmpCatData?.is40hrs     && <Chip label="40-hr week"     size="small" sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(46,125,50,0.1)",  color: "#2E7D32" }} />}
                        {selectedEmpCatData?.is30hrs     && <Chip label="30-hr week"     size="small" sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(0,121,107,0.1)", color: "#00695c" }} />}
                      </Box>
                    )}
                  </Box>

                  {/* Period */}
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    <Grid item xs={5}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
                        Period Year <span style={{ color: "#c62828" }}>*</span>
                      </Typography>
                      <FieldInput type="number" size="small" fullWidth value={periodYear}
                        onChange={(e) => setPeriodYear(e.target.value)} inputProps={{ min: 2020, max: 2035 }} />
                    </Grid>
                    <Grid item xs={7}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
                        Period Month <span style={{ color: T.faint, fontSize: "0.68rem", fontWeight: 400, marginLeft: 4 }}>(optional)</span>
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} displayEmpty
                          sx={{ ...selectSx, "& .MuiSelect-select": { py: "8px", fontFamily: T.poppins,
                            fontSize: "0.875rem", fontWeight: periodMonth ? 700 : 400,
                            color: periodMonth ? T.text : T.faint } }}>
                          {MONTHS.map((m) => (
                            <MenuItem key={m.value} value={m.value} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>
                              {m.value ? (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: "4px", bgcolor: T.accentFaint,
                                    border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2 }}>
                      <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>Recording for:</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.3,
                        borderRadius: "5px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>
                          {periodYear}{selectedMonthLabel ? ` · ${selectedMonthLabel}` : ""}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {selectedEmployee ? (
                    <>
                      <SCRuleEnginePanel scType={effectiveSCType} empCatData={selectedEmpCatData} employee={selectedEmployee} />

                      {/* Manual SC Type Override */}
                      <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <SettingsIcon sx={{ fontSize: 14, color: T.accent }} />
                          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>
                            SC Type Override
                          </Typography>
                          {manualSCType && (
                            <Chip label="Manual" size="small"
                              sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700,
                                bgcolor: "rgba(230,81,0,0.12)", color: "#bf360c",
                                border: "1px solid rgba(230,81,0,0.3)", fontFamily: T.poppins }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins, mb: 1 }}>
                          Auto-detected: <strong style={{ color: T.accent }}>{SC_TYPE[autoDerivedSCType]?.label}</strong>
                          {" "}(from employment category). Override if needed.
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                          <Box onClick={() => setManualSCType(null)}
                            sx={{ px: 1.25, py: 0.5, borderRadius: "7px", cursor: "pointer",
                              border: `1px solid ${!manualSCType ? T.accent : T.accentBorder}`,
                              bgcolor: !manualSCType ? T.accentFaint : "#fff",
                              "&:hover": { bgcolor: T.accentHover } }}>
                            <Typography sx={{ fontSize: "0.68rem", fontWeight: !manualSCType ? 700 : 500,
                              color: !manualSCType ? T.accent : T.muted, fontFamily: T.poppins }}>Auto</Typography>
                          </Box>
                          {Object.entries(SC_TYPE).map(([key, meta]) => (
                            <Box key={key} onClick={() => setManualSCType(key)}
                              sx={{ px: 1.25, py: 0.5, borderRadius: "7px", cursor: "pointer",
                                border: `1px solid ${manualSCType === key ? meta.color : T.accentBorder}`,
                                bgcolor: manualSCType === key ? meta.bg : "#fff",
                                "&:hover": { bgcolor: alpha(meta.color, 0.05) } }}>
                              <Typography sx={{ fontSize: "0.68rem", fontWeight: manualSCType === key ? 700 : 500,
                                color: manualSCType === key ? meta.color : T.muted, fontFamily: T.poppins }}>
                                {meta.label}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      {/* OT Input table */}
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", gap: 1,
                        px: 1.5, py: 0.75, mb: 0.75, bgcolor: alpha(T.accent, 0.04), borderRadius: 1 }}>
                        {["OT Source", "OT Hours Worked", "SC Earned"].map((h) => (
                          <Typography key={h} sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.accent,
                            textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins }}>{h}</Typography>
                        ))}
                      </Box>

                      {otTypes.length === 0 ? (
                        <Alert severity="info" sx={{ mb: 1.5, borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ fontFamily: T.poppins }}>
                            No OT types configured. Add OT types via the <strong>/api/ot-types</strong> endpoint.
                          </Typography>
                        </Alert>
                      ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 1.5 }}>
                          {otTypes.map((t) => (
                            <OTInputRow
                              key={t.id}
                              label={t.name}
                              note={t.description || ""}
                              otHours={toNum(otValues[t.id])}
                              onChangeOT={(v) => setOtValues((p) => ({ ...p, [t.id]: v }))}
                              scHours={computedSC.byType[t.id]?.sc || 0}
                              unit={unit}
                            />
                          ))}
                          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", gap: 1,
                            px: 1.5, py: 1.25, borderRadius: 1.5,
                            bgcolor: T.accentFaint, border: `1.5px solid ${T.accentBorder}` }}>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>TOTAL</Typography>
                            <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: alpha(T.accent, 0.08),
                              border: `1px solid ${T.accentBorder}`, textAlign: "center" }}>
                              <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>
                                {computedSC.totalOT.toFixed(3)} hrs
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "center" }}>
                              <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>SC earned</Typography>
                              <Typography sx={{ fontSize: "0.92rem", fontWeight: 900,
                                color: computedSC.total > 0 ? "#2e7d32" : T.faint, fontFamily: T.poppins }}>
                                {fmtHrs(computedSC.total, unit)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}

                      {/* Remarks */}
                      <Box sx={{ mb: 2 }}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
                          Remarks / Reference <span style={{ color: T.faint, fontSize: "0.68rem", fontWeight: 400 }}>(optional)</span>
                        </Typography>
                        <FieldInput size="small" fullWidth multiline rows={2} value={otRemarks}
                          onChange={(e) => setOtRemarks(e.target.value)}
                          placeholder="e.g. OT Order No. 2024-01, event name…" />
                      </Box>

                      {/* SC Type info box */}
                      <Box sx={{ display: "flex", gap: 1, mb: 2, p: 1.5, borderRadius: 2,
                        bgcolor: SC_TYPE[effectiveSCType]?.bg || T.accentFaint,
                        border: `1px solid ${SC_TYPE[effectiveSCType]?.border || T.accentBorder}` }}>
                        <InfoIcon sx={{ fontSize: 14, color: SC_TYPE[effectiveSCType]?.color || T.accent, mt: 0.1, flexShrink: 0 }} />
                        <Box>
                          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700,
                            color: SC_TYPE[effectiveSCType]?.color || T.accent, fontFamily: T.poppins, mb: 0.3 }}>
                            This SC will be stored as: <strong>{SC_TYPE[effectiveSCType]?.label}</strong>
                            {manualSCType && <span style={{ color: "#bf360c", fontSize: "0.65rem", marginLeft: 6 }}>(manually overridden)</span>}
                          </Typography>
                          <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontFamily: T.poppins }}>
                            {effectiveSCType === "commutative"
                              ? "Designated / 40-hr employees can convert or monetize these credits."
                              : effectiveSCType === "tempo"
                              ? "Tempo employees use SC as leave credits — no SL/VL conversion."
                              : "Non-commutative SC can only be used as offset."}
                          </Typography>
                        </Box>
                      </Box>

                      <AccentButton onClick={handleAddSC} variant="contained" fullWidth
                        startIcon={loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
                        disabled={loading || computedSC.total <= 0}
                        sx={{ height: 40, bgcolor: T.accent, color: "#fff",
                          boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, fontFamily: T.poppins,
                          "&:hover": { bgcolor: T.accentDark },
                          "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important" } }}>
                        {loading ? "Saving…" : computedSC.total > 0
                          ? `Record ${fmtHrs(computedSC.total, unit)} SC for ${periodYear}${selectedMonthLabel ? ` · ${selectedMonthLabel}` : ""}`
                          : "Enter OT hours to compute SC"}
                      </AccentButton>
                    </>
                  ) : (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <PersonIcon sx={{ fontSize: 40, color: alpha(T.accent, 0.2), mb: 1 }} />
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>Select an employee to begin</Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: T.faint, mt: 0.5, fontFamily: T.poppins }}>
                        The SC Rule Engine will automatically determine the SC type
                      </Typography>
                    </Box>
                  )}
                </Box>
              </SectionCard>
            </Grid>

            {/* ── RIGHT: Records Panel ── */}
            <Grid item xs={12} lg={7}>
              <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>
                <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Reorder sx={{ fontSize: 17, color: T.accent }} />
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>
                        Service Credit Records
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Box sx={{ px: 1.5, py: 0.4, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.15)}` }}>
                        <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>
                          {groupedByEmployee.length} employees · {filteredRecords.length} records
                        </Typography>
                      </Box>
                      <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small"
                        sx={{ "& .MuiToggleButton-root": { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`,
                          color: T.muted, "&.Mui-selected": { bgcolor: T.accentFaint, color: T.accent } } }}>
                        <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                        <ToggleButton value="list"><ViewListIcon   sx={{ fontSize: 14 }} /></ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>

                  {/* Tabs */}
                  <Box sx={{ mb: 1.5 }}>
                    <Tabs value={recordsTab} onChange={(_, v) => setRecordsTab(v)} variant="scrollable" scrollButtons={false}
                      sx={{ minHeight: 32,
                        "& .MuiTab-root": { minHeight: 32, fontSize: "0.72rem", fontWeight: 700,
                          textTransform: "none", fontFamily: T.poppins, color: T.muted, py: 0,
                          "&.Mui-selected": { color: T.accent } },
                        "& .MuiTabs-indicator": { bgcolor: T.accent, height: 2 } }}>
                      <Tab label={`All (${tabCounts.all})`} />
                      <Tab label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><CommIcon sx={{ fontSize: 13, color: recordsTab === 1 ? T.commColor : T.faint }} /><span>Commutative ({tabCounts.commutative})</span></Box>} />
                      <Tab label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><LockIcon sx={{ fontSize: 13, color: recordsTab === 2 ? T.nonCommColor : T.faint }} /><span>Non-Comm. ({tabCounts.non_commutative})</span></Box>} />
                      <Tab label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><SCIcon sx={{ fontSize: 13, color: recordsTab === 3 ? T.tempoColor : T.faint }} /><span>Tempo ({tabCounts.tempo})</span></Box>} />
                    </Tabs>
                  </Box>

                  {/* Filters */}
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <FieldInput size="small" placeholder="Search by name or employee number…"
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1, minWidth: 160 }}
                      InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }} />
                    {allDeptCodes.length > 0 && (
                      <FormControl size="small" sx={{ minWidth: 120, flexShrink: 0 }}>
                        <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} displayEmpty
                          startAdornment={<DomainIcon sx={{ fontSize: 14, color: T.accent, mr: 0.5, ml: 0.25 }} />}
                          sx={{ ...selectSx, "& .MuiSelect-select": { py: "7px", fontSize: "0.8rem",
                            fontWeight: deptFilter !== "all" ? 700 : 400,
                            color: deptFilter !== "all" ? T.accent : T.muted } }}>
                          <MenuItem value="all" sx={{ fontFamily: T.poppins, fontSize: "0.82rem", color: T.muted }}>All depts</MenuItem>
                          {allDeptCodes.map((c) => (
                            <MenuItem key={c} value={c} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>{c}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    {allEmpCatLabels.length > 0 && (
                      <FormControl size="small" sx={{ minWidth: 130, flexShrink: 0 }}>
                        <Select value={empCatFilter} onChange={(e) => setEmpCatFilter(e.target.value)} displayEmpty
                          startAdornment={<WorkIcon sx={{ fontSize: 14, color: T.accent, mr: 0.5, ml: 0.25 }} />}
                          sx={{ ...selectSx, "& .MuiSelect-select": { py: "7px", fontSize: "0.78rem",
                            fontWeight: empCatFilter !== "all" ? 700 : 400,
                            color: empCatFilter !== "all" ? T.accent : T.muted } }}>
                          <MenuItem value="all" sx={{ fontFamily: T.poppins, fontSize: "0.78rem", color: T.muted }}>All categories</MenuItem>
                          {allEmpCatLabels.map((l) => (
                            <MenuItem key={l} value={l} sx={{ fontFamily: T.poppins, fontSize: "0.78rem" }}>{l}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                </Box>

                {/* Records body */}
                <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2,
                  "&::-webkit-scrollbar": { width: 4 },
                  "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                  {paginatedGroups.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: "center" }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint,
                        display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                        <SCIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: T.muted, mb: 0.5, fontFamily: T.poppins }}>
                        {scRecords.length === 0 ? "No Service Credit Records" : "No Matching Records"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: T.faint, fontFamily: T.poppins }}>
                        {scRecords.length === 0 ? "Record OT hours using the form on the left." : "Try adjusting your search or filters."}
                      </Typography>
                    </Box>
                  ) : viewMode === "grid" ? (
                    <Grid container spacing={1.5} alignItems="stretch">
                      {paginatedGroups.map((grp) => {
                        const totalRem     = grp.records.reduce((s, r) => s + toNum(r.remaining_hours), 0);
                        const totalEarned  = grp.records.reduce((s, r) => s + toNum(r.earned_hours), 0);
                        const overallColor = getStatusColor(totalRem, totalEarned);
                        const initials     = `${grp.lastName?.[0] || ""}${grp.firstName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const deptCode     = deptMap[grp.employeeNumber] || null;
                        const empCat       = empCatLabelMap[grp.employeeNumber] || null;
                        const scTypes      = [...new Set(grp.records.map((r) => r.sc_type))];
                        return (
                          <Grid item xs={12} sm={6} md={4} key={grp.employeeNumber} sx={{ display: "flex" }}>
                            <Box onClick={() => openEmployeeSCModal(grp)}
                              sx={{ width: "100%", display: "flex", flexDirection: "column", p: 2, borderRadius: 2,
                                cursor: "pointer", bgcolor: "#fff", border: `1px solid ${T.accentBorder}`,
                                transition: "all 0.13s",
                                "&:hover": { bgcolor: T.rowHover, borderColor: T.accent,
                                  transform: "translateY(-2px)", boxShadow: `0 4px 14px ${alpha(T.accent, 0.1)}` } }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
                                <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", fontWeight: 800,
                                  bgcolor: T.accent, color: "#fff", borderRadius: "8px", flexShrink: 0 }}>{initials}</Avatar>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text,
                                    lineHeight: 1.25, fontFamily: T.poppins }} noWrap>{grp.fullName}</Typography>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                    <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>#{grp.employeeNumber}</Typography>
                                    {deptCode && <DeptBadge code={deptCode} />}
                                    {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
                                  </Box>
                                </Box>
                              </Box>
                              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 0.75 }}>
                                {scTypes.map((t) => <SCTypeBadge key={t} scType={t} />)}
                              </Box>
                              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 0.75 }}>
                                {grp.records.slice(0, 3).map((r) => {
                                  const sc = getStatusColor(r.remaining_hours, r.earned_hours);
                                  return (
                                    <Box key={r.id} sx={{ px: 0.75, py: 0.2, borderRadius: "4px",
                                      bgcolor: `${sc}12`, border: `1px solid ${sc}30` }}>
                                      <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: sc,
                                        whiteSpace: "nowrap", fontFamily: T.poppins }}>
                                        {r.period_year}{r.period_month ? `-${monthName(r.period_month).slice(0,3)}` : ""} · {fmtHrs(r.remaining_hours, unit)}
                                      </Typography>
                                    </Box>
                                  );
                                })}
                                {grp.records.length > 3 && (
                                  <Box sx={{ px: 0.75, py: 0.2, borderRadius: "4px",
                                    bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                                    <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>
                                      +{grp.records.length - 3}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                                pt: 0.75, borderTop: `1px solid ${T.divider}` }}>
                                <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>
                                  {grp.records.length} record{grp.records.length !== 1 ? "s" : ""}
                                </Typography>
                                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>
                                  {fmtHrs(totalRem, unit)} left
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <>
                      <Box sx={{ px: 1.5, py: 1, display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr", gap: 1, alignItems: "center",
                        bgcolor: alpha(T.accent, 0.04), borderRadius: 1.5, mb: 1 }}>
                        {["Employee", "Dept / Category", "Records", "Balance", "SC Types"].map((col) => (
                          <Typography key={col} sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent,
                            textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins }}>{col}</Typography>
                        ))}
                      </Box>
                      {paginatedGroups.map((grp, idx) => {
                        const totalRem     = grp.records.reduce((s, r) => s + toNum(r.remaining_hours), 0);
                        const totalEarned  = grp.records.reduce((s, r) => s + toNum(r.earned_hours), 0);
                        const overallColor = getStatusColor(totalRem, totalEarned);
                        const initials     = `${grp.lastName?.[0] || ""}${grp.firstName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const deptCode     = deptMap[grp.employeeNumber] || null;
                        const empCat       = empCatLabelMap[grp.employeeNumber] || null;
                        const scTypes      = [...new Set(grp.records.map((r) => r.sc_type))];
                        return (
                          <Box key={grp.employeeNumber} onClick={() => openEmployeeSCModal(grp)}
                            sx={{ px: 1.5, py: 1.25, display: "grid",
                              gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr", gap: 1, alignItems: "center",
                              borderRadius: 1.5, cursor: "pointer",
                              bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd,
                              border: "1px solid transparent", transition: "background 0.13s",
                              "&:hover": { bgcolor: T.rowHover } }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: "0.68rem", fontWeight: 800,
                                bgcolor: T.accent, color: "#fff", borderRadius: "6px", flexShrink: 0 }}>{initials}</Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }} noWrap>{grp.fullName}</Typography>
                                <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>#{grp.employeeNumber}</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                              {deptCode ? <DeptBadge code={deptCode} /> : <Typography sx={{ fontSize: "0.65rem", color: T.faint }}>—</Typography>}
                              {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
                            </Box>
                            <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: T.accentFaint,
                              border: `1px solid ${T.accentBorder}`, display: "inline-block", width: "fit-content" }}>
                              <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>
                                {grp.records.length}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>
                              {fmtHrs(totalRem, unit)}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              {scTypes.map((t) => <SCTypeBadge key={t} scType={t} />)}
                            </Box>
                          </Box>
                        );
                      })}
                    </>
                  )}
                </Box>

                {groupedByEmployee.length > 0 && (
                  <Box sx={{ px: 2, py: 0.5, borderTop: `1px solid ${T.divider}`, flexShrink: 0 }}>
                    <TablePagination component="div" count={groupedByEmployee.length} page={recordsPage}
                      onPageChange={(_, p) => setRecordsPage(p)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setRecordsPage(0); }}
                      rowsPerPageOptions={[12, 24, 48, 96]} labelRowsPerPage="Rows:"
                      sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                        fontSize: "0.78rem", fontWeight: 600, color: T.accent, fontFamily: T.poppins } }}
                    />
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>

          {/* ── Employee SC Modal ── */}
          <Modal open={employeeSCModalOpen}
            onClose={() => { setEmployeeSCModalOpen(false); setSelectedEmployeeSC(null); setSelectedSCRecord(null); }}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <Fade in={employeeSCModalOpen}>
              <Box sx={{ backgroundColor: "#fff", borderRadius: "12px", width: "95%", maxWidth: "1080px",
                height: "84vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
                display: "flex", flexDirection: "column", fontFamily: T.poppins }}>
                {selectedEmployeeSC && (() => {
                  const deptCode      = deptMap[selectedEmployeeSC.employeeNumber] || null;
                  const empCat        = empCatLabelMap[selectedEmployeeSC.employeeNumber] || null;
                  const sortedRecords = [...selectedEmployeeSC.records].sort((a, b) => {
                    if (b.period_year !== a.period_year) return b.period_year - a.period_year;
                    return (toNum(b.period_month) || 0) - (toNum(a.period_month) || 0);
                  });
                  return (
                    <>
                      <Box sx={{ px: 3.5, py: 2, background: T.headerGrad,
                        display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: "rgba(255,255,255,0.18)", color: "#fff",
                          fontSize: "0.85rem", fontWeight: 800, borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.25)" }}>
                          {`${selectedEmployeeSC.lastName?.[0] || ""}${selectedEmployeeSC.firstName?.[0] || ""}`.toUpperCase() || selectedEmployeeSC.fullName?.[0] || "?"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.92rem", fontFamily: T.poppins }} noWrap>
                              {selectedEmployeeSC.fullName}
                            </Typography>
                            {deptCode && <DeptBadge code={deptCode} light />}
                            {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} light />}
                          </Box>
                          <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontFamily: T.poppins }}>
                            #{selectedEmployeeSC.employeeNumber} · {selectedEmployeeSC.records.length} SC record{selectedEmployeeSC.records.length !== 1 ? "s" : ""}
                          </Typography>
                        </Box>
                        <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                          sx={{ "& .MuiToggleButton-root": { px: 1.5, py: 0.3,
                            border: "1px solid rgba(255,255,255,0.22)", fontSize: "0.72rem", fontWeight: 700,
                            color: "rgba(255,255,255,0.55)", fontFamily: T.poppins,
                            "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.18)", color: "#fff", borderColor: "rgba(255,255,255,0.4)" } } }}>
                          <ToggleButton value="hours">Hours</ToggleButton>
                          <ToggleButton value="days">Days</ToggleButton>
                        </ToggleButtonGroup>
                        <IconButton onClick={() => { setEmployeeSCModalOpen(false); setSelectedEmployeeSC(null); setSelectedSCRecord(null); }}
                          size="small" sx={{ color: "rgba(255,255,255,0.65)" }}>
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>

                      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
                        {/* Sidebar */}
                        <Box sx={{ width: 220, flexShrink: 0, borderRight: `1px solid ${T.divider}`,
                          display: "flex", flexDirection: "column", bgcolor: "#fafafa" }}>
                          <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${T.divider}` }}>
                            <Typography sx={{ fontSize: "0.63rem", fontWeight: 700, color: T.faint,
                              textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: T.poppins }}>SC Records</Typography>
                          </Box>
                          <Box sx={{ flex: 1, overflowY: "auto" }}>
                            {sortedRecords.map((r) => {
                              const sc      = getStatusColor(r.remaining_hours, r.earned_hours);
                              const meta    = SC_TYPE[r.sc_type];
                              const isActive = selectedSCRecord?.id === r.id;
                              let catSnap = null;
                              try { catSnap = r.emp_category_snapshot ? JSON.parse(r.emp_category_snapshot) : null; } catch {}
                              return (
                                <Box key={r.id} onClick={() => setSelectedSCRecord(r)}
                                  sx={{ px: 2, py: 1.1, cursor: "pointer",
                                    borderLeft: `3px solid ${isActive ? T.accent : "transparent"}`,
                                    bgcolor: isActive ? T.accentFaint : "transparent",
                                    "&:hover": { bgcolor: T.accentFaint } }}>
                                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <Typography sx={{ fontSize: "0.82rem", fontWeight: isActive ? 700 : 500,
                                      color: isActive ? T.accent : T.text, fontFamily: T.poppins }}>
                                      {r.period_year}{r.period_month ? ` · ${monthName(r.period_month).slice(0, 3)}` : ""}
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: sc, fontFamily: T.poppins }}>
                                      {fmtHrs(r.remaining_hours, unit)}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3, flexWrap: "wrap" }}>
                                    {meta && <SCTypeBadge scType={r.sc_type} />}
                                    {catSnap?.is30hrs && <Chip label="30hr" size="small" sx={{ height: 14, fontSize: "0.55rem", fontWeight: 700, bgcolor: "rgba(103,58,183,0.08)", color: "#6a1b9a", fontFamily: T.poppins }} />}
                                    {catSnap?.is40hrs && <Chip label="40hr" size="small" sx={{ height: 14, fontSize: "0.55rem", fontWeight: 700, bgcolor: "rgba(46,125,50,0.08)", color: "#2e7d32", fontFamily: T.poppins }} />}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>

                        {/* Main detail pane */}
                        <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
                          {actionSuccess && (
                            <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2, borderRadius: 2 }}>
                              <Typography sx={{ fontFamily: T.poppins }}>{actionSuccess}</Typography>
                            </Alert>
                          )}
                          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}><Typography sx={{ fontFamily: T.poppins }}>{error}</Typography></Alert>}

                          {!selectedSCRecord ? (
                            <Box sx={{ py: 10, textAlign: "center" }}>
                              <SCIcon sx={{ fontSize: 38, color: alpha(T.accent, 0.12), mb: 1.5 }} />
                              <Typography sx={{ fontWeight: 600, color: T.muted, fontSize: "0.88rem", fontFamily: T.poppins }}>Select a record</Typography>
                            </Box>
                          ) : (() => {
                            const r              = selectedSCRecord;
                            const meta           = SC_TYPE[r.sc_type] || SC_TYPE.non_commutative;
                            const sc             = getStatusColor(r.remaining_hours, r.earned_hours);
                            const remH           = toNum(r.remaining_hours);
                            const earnedH        = toNum(r.earned_hours);
                            const usedH          = toNum(r.used_hours);
                            const pctUsed        = earnedH > 0 ? Math.min((usedH / earnedH) * 100, 100) : 0;
                            const fmt            = (h) => fmtHrs(h, unit);
                            const allowedActions = SC_ACTIONS[r.sc_type] || [];
                            let catSnap = null;
                            try { catSnap = r.emp_category_snapshot ? JSON.parse(r.emp_category_snapshot) : null; } catch {}

                            return (
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <Box sx={{ borderRadius: "10px", border: `1.5px solid ${meta.border || T.accentBorder}`,
                                  overflow: "hidden", bgcolor: "#fff" }}>
                                  <Box sx={{ px: 2.5, py: 1.5, display: "flex", alignItems: "center", gap: 1.5,
                                    bgcolor: meta.bg || T.accentFaint, borderBottom: `1px solid ${T.divider}` }}>
                                    <Box sx={{ color: meta.color }}>{meta.icon}</Box>
                                    <Typography sx={{ fontWeight: 700, color: meta.color, fontSize: "0.92rem", fontFamily: T.poppins }}>
                                      {periodLabel(r.period_year, r.period_month)} — {meta.label}
                                    </Typography>
                                    <Chip label={r.sc_type} size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700,
                                      bgcolor: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontFamily: T.poppins }} />
                                    {catSnap?.is30hrs && <Chip label="30-hr SC" size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700, bgcolor: "rgba(103,58,183,0.08)", color: "#6a1b9a", border: "1px solid rgba(103,58,183,0.2)", fontFamily: T.poppins }} />}
                                    {catSnap?.is40hrs && <Chip label="40-hr SC" size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700, bgcolor: "rgba(46,125,50,0.08)", color: "#2e7d32", border: "1px solid rgba(46,125,50,0.2)", fontFamily: T.poppins }} />}
                                    <Box sx={{ flex: 1 }} />
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 150 }}>
                                      <Box sx={{ flex: 1, height: 5, bgcolor: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
                                        <Box sx={{ height: "100%", width: `${pctUsed}%`, bgcolor: sc, borderRadius: 3, transition: "width 0.3s" }} />
                                      </Box>
                                      <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins, whiteSpace: "nowrap" }}>
                                        {pctUsed.toFixed(0)}% used
                                      </Typography>
                                    </Box>
                                  </Box>

                                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
                                    {[
                                      ["OT Hours",   toNum(r.total_ot_hours), "#1565c0"],
                                      ["SC Earned",  earnedH,                  meta.color],
                                      ["Used",       usedH,                    "#e65100"],
                                      ["Remaining",  remH,                     sc],
                                      ["Reg/Hol/ND", `${toNum(r.ot_hours_regular).toFixed(1)}/${toNum(r.ot_hours_holiday).toFixed(1)}/${toNum(r.ot_hours_night_diff).toFixed(1)}`, T.muted],
                                    ].map(([label, val, color], i) => (
                                      <Box key={label} sx={{ px: 1.75, py: 1.5,
                                        borderRight: i < 4 ? `1px solid ${T.divider}` : "none",
                                        borderBottom: `1px solid ${T.divider}`, textAlign: "center" }}>
                                        <Typography sx={{ fontSize: "0.59rem", fontWeight: 700, color: T.faint,
                                          textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins, mb: 0.5 }}>{label}</Typography>
                                        {typeof val === "string" ? (
                                          <Typography sx={{ fontWeight: 800, color, fontSize: "0.75rem", lineHeight: 1, fontFamily: T.poppins }}>{val}</Typography>
                                        ) : (
                                          <>
                                            <Typography sx={{ fontWeight: 800, color, fontSize: "0.9rem", lineHeight: 1, fontFamily: T.poppins }}>{fmt(val)}</Typography>
                                            <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, mt: 0.25 }}>
                                              {unit === "hours" ? `${(toNum(val) / 8).toFixed(3)} d` : `${toNum(val).toFixed(3)} h`}
                                            </Typography>
                                          </>
                                        )}
                                      </Box>
                                    ))}
                                  </Box>

                                  {r.remarks && (
                                    <Box sx={{ px: 2.5, py: 1, borderBottom: `1px solid ${T.divider}`,
                                      display: "flex", alignItems: "center", gap: 0.75 }}>
                                      <InfoIcon sx={{ fontSize: 13, color: T.faint }} />
                                      <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>{r.remarks}</Typography>
                                    </Box>
                                  )}

                                  {catSnap && (
                                    <Box sx={{ px: 2.5, py: 1, borderBottom: `1px solid ${T.divider}`,
                                      bgcolor: "rgba(103,58,183,0.03)", display: "flex", alignItems: "center", gap: 0.75 }}>
                                      <InfoIcon sx={{ fontSize: 12, color: "#6a1b9a" }} />
                                      <Typography sx={{ fontSize: "0.68rem", color: "#6a1b9a", fontFamily: T.poppins }}>
                                        Recorded under: <strong>{catSnap.label || "Unknown category"}</strong>
                                        {catSnap.is30hrs && " (30-hr work week)"}
                                        {catSnap.is40hrs && " (40-hr work week)"}
                                        . This SC cannot be mixed with SC from a different category.
                                      </Typography>
                                    </Box>
                                  )}

                                  <Box sx={{ px: 2.5, py: 1.5, display: "flex", alignItems: "center",
                                    justifyContent: "space-between", gap: 2 }}>
                                    <Typography sx={{ fontSize: "0.72rem",
                                      color: remH > 0 ? meta.color : T.faint, fontFamily: T.poppins }}>
                                      {remH > 0
                                        ? `${fmt(remH)} available · ${meta.label} rules apply.`
                                        : "All SC credits for this period have been used."}
                                    </Typography>
                                    <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0, flexWrap: "wrap" }}>
                                      <AccentButton onClick={() => { setEditRecord({ ...r }); setEditHours(toNum(r.earned_hours)); setError(""); }}
                                        variant="outlined" size="small"
                                        startIcon={<EditIcon sx={{ fontSize: "12px !important" }} />}
                                        sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28,
                                          borderColor: T.accentBorder, color: T.accent,
                                          "&:hover": { borderColor: T.accent, bgcolor: T.accentFaint, transform: "none" } }}>
                                        Edit
                                      </AccentButton>
                                      {allowedActions.includes("convert_to_sl") && remH > 0 && (
                                        <AccentButton onClick={() => { setActionRecord({ ...r, fullName: selectedEmployeeSC.fullName }); setCurrentAction("convert_to_sl"); setActionDialogOpen(true); }}
                                          variant="outlined" size="small"
                                          sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28,
                                            borderColor: alpha(T.commColor, 0.4), color: T.commColor,
                                            "&:hover": { bgcolor: alpha(T.commColor, 0.06), transform: "none" } }}>→ SL</AccentButton>
                                      )}
                                      {allowedActions.includes("convert_to_vl") && remH > 0 && (
                                        <AccentButton onClick={() => { setActionRecord({ ...r, fullName: selectedEmployeeSC.fullName }); setCurrentAction("convert_to_vl"); setActionDialogOpen(true); }}
                                          variant="outlined" size="small"
                                          sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28,
                                            borderColor: alpha(T.commColor, 0.4), color: T.commColor,
                                            "&:hover": { bgcolor: alpha(T.commColor, 0.06), transform: "none" } }}>→ VL</AccentButton>
                                      )}
                                      {allowedActions.includes("monetize") && remH > 0 && (
                                        <AccentButton onClick={() => { setActionRecord({ ...r, fullName: selectedEmployeeSC.fullName }); setCurrentAction("monetize"); setActionDialogOpen(true); }}
                                          variant="contained" size="small"
                                          startIcon={<MonetizeIcon sx={{ fontSize: "12px !important" }} />}
                                          sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28,
                                            bgcolor: T.commColor, color: "#fff",
                                            "&:hover": { bgcolor: "#1b5e20", transform: "none" } }}>Monetize</AccentButton>
                                      )}
                                      {allowedActions.includes("offset") && remH > 0 && (
                                        <AccentButton onClick={() => { setActionRecord({ ...r, fullName: selectedEmployeeSC.fullName }); setCurrentAction("offset"); setActionDialogOpen(true); }}
                                          variant="contained" size="small"
                                          startIcon={<BlockIcon sx={{ fontSize: "12px !important" }} />}
                                          sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28,
                                            bgcolor: T.nonCommColor, color: "#fff",
                                            "&:hover": { bgcolor: "#3e2723", transform: "none" } }}>Apply Offset</AccentButton>
                                      )}
                                      {allowedActions.includes("use_as_leave") && remH > 0 && (
                                        <AccentButton onClick={() => { setActionRecord({ ...r, fullName: selectedEmployeeSC.fullName }); setCurrentAction("use_as_leave"); setActionDialogOpen(true); }}
                                          variant="contained" size="small"
                                          startIcon={<SCIcon sx={{ fontSize: "12px !important" }} />}
                                          sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28,
                                            bgcolor: T.tempoColor, color: "#fff",
                                            "&:hover": { bgcolor: "#0d47a1", transform: "none" } }}>Use as Leave</AccentButton>
                                      )}
                                    </Box>
                                  </Box>
                                </Box>
                              </Box>
                            );
                          })()}
                        </Box>
                      </Box>
                    </>
                  );
                })()}
              </Box>
            </Fade>
          </Modal>

          {/* ── Edit SC Modal ── */}
          <Modal open={!!editRecord}
            onClose={() => { setEditRecord(null); setError(""); }}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <Fade in={!!editRecord}>
              <Box sx={{ backgroundColor: "#fff", borderRadius: 3, width: "100%", maxWidth: "520px",
                maxHeight: "90vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
                display: "flex", flexDirection: "column", fontFamily: T.poppins }}>
                {editRecord && (() => {
                  const meta   = SC_TYPE[editRecord.sc_type] || SC_TYPE.non_commutative;
                  const deptCd = deptMap[editRecord.employeeNumber?.toString()] || null;
                  const empCat = empCatLabelMap[editRecord.employeeNumber?.toString()] || null;
                  return (
                    <>
                      <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad,
                        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)",
                            display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <EditIcon sx={{ fontSize: 18, color: "#fff" }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", fontFamily: T.poppins }}>Edit SC Record</Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                              <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", fontFamily: T.poppins }}>
                                {editRecord.fullName || editRecord.employeeNumber}
                              </Typography>
                              {deptCd && <DeptBadge code={deptCd} light />}
                              {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} light />}
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                            sx={{ "& .MuiToggleButton-root": { px: 1, py: 0.25, border: "1px solid rgba(255,255,255,0.3)",
                              fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: T.poppins,
                              "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.2)", color: "#fff" } } }}>
                            <ToggleButton value="hours">hrs</ToggleButton>
                            <ToggleButton value="days">days</ToggleButton>
                          </ToggleButtonGroup>
                          <IconButton onClick={() => { setEditRecord(null); setError(""); }} size="small" sx={{ color: "rgba(255,255,255,0.75)" }}>
                            <Close sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Box>
                      </Box>

                      <Box sx={{ px: 3.5, py: 3, overflowY: "auto", flexGrow: 1 }}>
                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}><Typography sx={{ fontFamily: T.poppins }}>{error}</Typography></Alert>}

                        <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: meta.bg,
                          border: `1.5px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box>
                            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.faint,
                              textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.4, fontFamily: T.poppins }}>SC Type</Typography>
                            <SCTypeBadge scType={editRecord.sc_type} size="large" />
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.faint,
                              textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.4, fontFamily: T.poppins }}>Period</Typography>
                            <Typography sx={{ fontWeight: 800, color: T.text, fontSize: "0.95rem", fontFamily: T.poppins }}>
                              {periodLabel(editRecord.period_year, editRecord.period_month)}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: 2.5 }}>
                          {[
                            ["Earned",    toNum(editRecord.earned_hours),    meta.color],
                            ["Used",      toNum(editRecord.used_hours),      "#ed6c02"],
                            ["Remaining", toNum(editRecord.remaining_hours), getStatusColor(toNum(editRecord.remaining_hours), toNum(editRecord.earned_hours))],
                          ].map(([lbl, val, col]) => (
                            <Box key={lbl} sx={{ p: 1.5, borderRadius: 2, textAlign: "center",
                              bgcolor: `${col}08`, border: `1px solid ${col}20` }}>
                              <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, color: T.muted,
                                textTransform: "uppercase", letterSpacing: 0.5, mb: 0.25, fontFamily: T.poppins }}>{lbl}</Typography>
                              <Typography sx={{ fontWeight: 900, color: col, fontSize: "0.95rem", fontFamily: T.poppins }}>
                                {fmtHrs(val, unit)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        <Divider sx={{ mb: 2.5, borderColor: T.divider }}>
                          <Chip label="Edit Fields" size="small" sx={{ height: 18, fontSize: "0.68rem",
                            bgcolor: T.accentFaint, color: T.accent, fontWeight: 700, fontFamily: T.poppins }} />
                        </Divider>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Total OT Hours</Typography>
                            <FieldInput type="number" size="small" fullWidth value={toNum(editRecord.total_ot_hours) || ""}
                              inputProps={{ min: 0, step: 0.001 }}
                              onChange={(e) => setEditRecord({ ...editRecord, total_ot_hours: parseFloat(e.target.value) || 0 })} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
                              SC Earned Hours <span style={{ color: "#c62828" }}>*</span>
                            </Typography>
                            <FieldInput type="number" size="small" fullWidth value={editHours || ""}
                              inputProps={{ min: 0, step: 0.001 }}
                              onChange={(e) => setEditHours(parseFloat(e.target.value) || 0)}
                              InputProps={{ endAdornment: <InputAdornment position="end">
                                <Typography sx={{ fontSize: "0.7rem", color: T.faint, fontWeight: 700 }}>
                                  = {(editHours / 8).toFixed(3)} days
                                </Typography>
                              </InputAdornment> }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Remarks</Typography>
                            <FieldInput size="small" fullWidth multiline rows={2} value={editRecord.remarks || ""}
                              onChange={(e) => setEditRecord({ ...editRecord, remarks: e.target.value })} />
                          </Grid>
                        </Grid>
                      </Box>

                      <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9",
                        display: "flex", justifyContent: "flex-end", gap: 1, flexShrink: 0 }}>
                        <AccentButton onClick={() => handleDelete(editRecord.id)} variant="outlined"
                          startIcon={<DeleteIcon sx={{ fontSize: "13px !important" }} />}
                          sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: "#ffcdd2", color: "#c62828",
                            mr: "auto", "&:hover": { bgcolor: "rgba(198,40,40,0.04)", borderColor: "#c62828", transform: "none" } }}>
                          Delete
                        </AccentButton>
                        <AccentButton onClick={() => { setEditRecord(null); setError(""); }} variant="outlined"
                          sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: T.accentBorder, color: T.muted }}>
                          Cancel
                        </AccentButton>
                        <AccentButton onClick={handleUpdate} variant="contained"
                          startIcon={<SaveIcon sx={{ fontSize: "13px !important" }} />}
                          sx={{ fontSize: "0.8rem", fontFamily: T.poppins, bgcolor: T.accent, color: "#fff",
                            "&:hover": { bgcolor: T.accentDark } }}>
                          Save Changes
                        </AccentButton>
                      </Box>
                    </>
                  );
                })()}
              </Box>
            </Fade>
          </Modal>
        </Box>
      </Fade>
    </>
  );
};

export default ServiceCredit;