/**
 * CompensatoryTimeOff.jsx
 * Styled 100% identical to LeaveAssignment.jsx — same dark-red theme, same
 * card/panel/button/pagination patterns. No blue anywhere.
 *
 * FIX: fetchEmpCatMap now derives is40hrs / isDesignated from the
 * parentGroup + typeName strings returned by the backend, instead of
 * reading nonexistent boolean flags (isTempo, is40hrs, isDesignated)
 * that the /employment-category endpoint never sends.
 *
 * INPUT DEFAULT: All input fields default to DAYS. Toggle switches between days/hours.
 */

import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import useLeaveRealtimeRefresh from "../../hooks/useLeaveRealtimeRefresh";
import {
  Typography, TextField, Button, Box, Grid, Chip, Modal, IconButton,
  Select, MenuItem, FormControl, Alert, InputAdornment, Card, Avatar,
  Divider, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
  TablePagination, Tooltip, Fade, CircularProgress,
  ToggleButton, ToggleButtonGroup,
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
  AccessTime as CTOIcon,
  Domain as DomainIcon,
  Work as WorkIcon,
  Info as InfoIcon,
  MonetizationOn as CommutationIcon,
  CalendarToday as CalIcon,
  Warning as WarnIcon,
} from "@mui/icons-material";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";

// ─── Theme tokens — 100% identical to LeaveAssignment ────────────────────────
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
};

const shimmerKeyframes = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
@keyframes ctoFadeIn {
  from { opacity:0; transform:translateY(5px); }
  to   { opacity:1; transform:translateY(0); }
}
`;

// ─── Styled primitives — identical to LeaveAssignment ────────────────────────
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

// ─── Month helpers ─────────────────────────────────────────────────────────────
const MONTHS = [
  { value: "",   label: "No specific month" },
  { value: "1",  label: "January"   }, { value: "2",  label: "February"  },
  { value: "3",  label: "March"     }, { value: "4",  label: "April"     },
  { value: "5",  label: "May"       }, { value: "6",  label: "June"      },
  { value: "7",  label: "July"      }, { value: "8",  label: "August"    },
  { value: "9",  label: "September" }, { value: "10", label: "October"   },
  { value: "11", label: "November"  }, { value: "12", label: "December"  },
];
const monthName   = (m) => MONTHS.find((x) => x.value === String(m))?.label || `Month ${m}`;
const periodLabel = (year, month) => {
  if (!year)  return "Unknown";
  if (!month) return String(year);
  return `${year} · ${monthName(month)}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNum  = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// Always store/pass hours internally; display converts to days when unit="days"
const toHours = (val, unit) => unit === "days" ? val * 8 : val;
const toDays  = (val, unit) => unit === "days" ? val / 8 : val;

const fmtHrs = (h, unit) => unit === "hours"
  ? `${toNum(h).toFixed(3)} hrs`
  : `${(toNum(h) / 8).toFixed(3)} days`;

const getStatusColor = (rem, total) => {
  if (!total) return "#9e9e9e";
  const p = (rem / total) * 100;
  return p > 50 ? "#2e7d32" : p > 20 ? "#ed6c02" : "#d32f2f";
};
const isExpired = (d) => d ? new Date(d) < new Date() : false;

/** Ledger rows that are balance snapshots, not accrual “periods” — hide from grid chips. */
const isCtoLedgerSnapshotChip = (r) => {
  const rm = String(r?.remarks || "");
  return /cto_direct_deduction/i.test(rm) || /cto_earning_delete_reversal/i.test(rm);
};

/** Backend stores tokens like cto_earning:12 in remarks for reconciliation; keep in DB, hide in UI. */
const INTERNAL_CTO_REMARK_RE = /\b(cto_earning:\d+|cto_earning_delete_reversal:\d+|cto_direct_deduction:\d+)\b/gi;

const internalCtoLedgerRemarkToken = (remarks) => {
  const m = String(remarks || "").match(/\b(cto_earning:\d+|cto_earning_delete_reversal:\d+|cto_direct_deduction:\d+)\b/i);
  return m ? m[1] : "";
};

/** Auto-generated when tardiness is applied to CTO (see CTODeductionReceipt); hide in this screen. */
const AUTO_CTO_TARDINESS_REMARK_RE = /\s*Tardiness deduction:\s*[\d.]+d\s+for\s+[A-Za-z]+\s+\d{4}\s*/gi;

const formatCtoRemarksForDisplay = (remarks) => {
  let s = String(remarks || "")
    .replace(INTERNAL_CTO_REMARK_RE, "")
    .replace(AUTO_CTO_TARDINESS_REMARK_RE, "");
  return s.split("·").map((p) => p.trim()).filter(Boolean).join(" · ").trim();
};

/**
 * Running balance = latest cto_credit row by id (remaining is cumulative there).
 * earnedForColor ≈ remaining + cumulative used (mirrors backend getCtoCreditRunningTotals).
 */
const getCtoEmployeeLedgerSummary = (records) => {
  const list = [...(records || [])].filter((r) => r != null);
  if (!list.length) return { remaining: 0, earnedForColor: 0 };
  list.sort((a, b) => toNum(b.id) - toNum(a.id));
  const latest = list[0];
  const remaining = toNum(latest.remaining_hours);
  let used = toNum(latest.used_hours);
  if (used <= 0) {
    for (let i = 1; i < list.length; i++) {
      const u = toNum(list[i].used_hours);
      if (u > 0) {
        used = u;
        break;
      }
    }
  }
  const earnedForColor = remaining + used;
  return { remaining, earnedForColor };
};

const normalizeCtoPeriodMonth = (month) => {
  if (month == null || month === "") return "";
  const n = parseInt(month, 10);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? String(n) : String(month).trim();
};

const ctoPeriodKey = (year, month) =>
  `${parseInt(year, 10) || 0}|${normalizeCtoPeriodMonth(month)}`;

const ctoAccrualRecords = (records, employeeNumber) => {
  const emp = String(employeeNumber || "").trim();
  return (records || []).filter(
    (r) => String(r.employeeNumber) === emp && !isCtoLedgerSnapshotChip(r),
  );
};

/** Latest accrual row per period (append-only DB; one logical period in UI). */
const latestCtoRecordsByPeriod = (records, employeeNumber) => {
  const byKey = new Map();
  ctoAccrualRecords(records, employeeNumber).forEach((r) => {
    const key = ctoPeriodKey(r.period_year, r.period_month);
    const prev = byKey.get(key);
    if (!prev || toNum(r.id) > toNum(prev.id)) byKey.set(key, r);
  });
  return [...byKey.values()];
};

const findLatestCtoForPeriod = (records, employeeNumber, periodYear, periodMonth) => {
  const key = ctoPeriodKey(periodYear, periodMonth);
  return (
    latestCtoRecordsByPeriod(records, employeeNumber).find(
      (r) => ctoPeriodKey(r.period_year, r.period_month) === key,
    ) || null
  );
};

const isPerMonthCtoTracking = (periodMonth) => Boolean(normalizeCtoPeriodMonth(periodMonth));

/** Per-month: one row per month. No month: update existing CTO for employee/year. */
const findCtoSaveTarget = (records, employeeNumber, periodYear, periodMonth) => {
  const emp = String(employeeNumber || "").trim();
  if (!emp) return null;
  const py = parseInt(periodYear, 10) || 0;

  if (isPerMonthCtoTracking(periodMonth)) {
    return findLatestCtoForPeriod(records, emp, py, periodMonth);
  }

  const accrual = ctoAccrualRecords(records, emp);
  if (!accrual.length) return null;

  const noMonthForYear = accrual.filter(
    (r) => !normalizeCtoPeriodMonth(r.period_month) && toNum(r.period_year) === py,
  );
  if (noMonthForYear.length) {
    return [...noMonthForYear].sort((a, b) => toNum(b.id) - toNum(a.id))[0];
  }

  const sameYear = accrual.filter((r) => toNum(r.period_year) === py);
  const pool = sameYear.length ? sameYear : accrual;
  return [...pool].sort((a, b) => toNum(b.id) - toNum(a.id))[0];
};

// ─── Badges — identical to LeaveAssignment ───────────────────────────────────
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

const ExpiryBadge = ({ expiryDate }) => {
  if (!expiryDate) return null;
  const expired = isExpired(expiryDate);
  const d = new Date(expiryDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  return (
    <Chip size="small"
      icon={expired ? <WarnIcon style={{ fontSize: 10, color: "#d32f2f" }} /> : <CalIcon style={{ fontSize: 10, color: "#e65100" }} />}
      label={expired ? `Expired ${d}` : `Expires ${d}`}
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700,
        bgcolor: expired ? "rgba(211,47,47,0.08)" : "rgba(230,81,0,0.08)",
        color: expired ? "#d32f2f" : "#e65100",
        border: `1px solid ${expired ? "rgba(211,47,47,0.25)" : "rgba(230,81,0,0.25)"}`,
        "& .MuiChip-label": { px: 0.75 } }} />
  );
};

// (Forfeit dialog removed; only "Transfer to Commutation" is allowed)

// ─── Bone skeleton primitive ──────────────────────────────────────────────────
const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box sx={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg,rgba(109,35,35,0.07) 25%,rgba(109,35,35,0.14) 50%,rgba(109,35,35,0.07) 75%)`,
    backgroundSize: "800px 100%",
    animation: "ctoShimmer 1.6s infinite linear",
    flexShrink: 0, ...sx,
  }} />
);

// ─── Full-page wireframe ──────────────────────────────────────────────────────
const CompensatoryTimeOffWireframe = () => (
  <>
    <style>{`
      @keyframes ctoShimmer {
        0%   { background-position: -800px 0; }
        100% { background-position:  800px 0; }
      }
      @keyframes ctoPulse {
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
          animation: "ctoPulse 2s ease-in-out infinite",
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
              <Bone w={280} h={16} sx={{ mb: 1 }} />
              <Bone w={360} h={10} />
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, position: "relative", zIndex: 1, alignItems: "center" }}>
            <Bone w={100} h={30} r={20} />
            <Bone w={36} h={36} r={8} />
          </Box>
        </Box>
      </Box>

      {/* ── Two-column body skeleton ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "4fr 8fr", gap: 2 }}>

        {/* ── Left col — Record CTO Form ── */}
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
            animation: "ctoPulse 2s ease-in-out 0.05s infinite",
          }}
        >
          {/* Col header */}
          <Box sx={{ px: 2.5, py: 1.25, borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(109,35,35,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 13, height: 13, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.2)" }} />
              <Bone w={150} h={10} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Bone w={50} h={9} />
              <Bone w={100} h={26} r={6} />
            </Box>
          </Box>

          <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5, flex: 1, overflowY: "hidden" }}>
            {/* CTO rule info box */}
            <Box sx={{ borderRadius: 2, border: "1px solid rgba(109,35,35,0.14)", bgcolor: "rgba(109,35,35,0.05)", p: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                <Box sx={{ width: 11, height: 11, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.2)" }} />
                <Bone w={80} h={9} />
                <Bone w={120} h={16} r={20} sx={{ ml: 0.5 }} />
              </Box>
              <Bone w="90%" h={9} sx={{ mb: 0.4 }} />
              <Bone w="75%" h={9} />
            </Box>

            {/* Employee autocomplete */}
            <Box>
              <Bone w={150} h={10} sx={{ mb: 0.75 }} />
              <Bone w="100%" h={36} r={8} />
            </Box>

            {/* Period row */}
            <Box sx={{ display: "grid", gridTemplateColumns: "4fr 8fr", gap: 1.5 }}>
              <Box>
                <Bone w={80} h={10} sx={{ mb: 0.75 }} />
                <Bone w="100%" h={36} r={8} />
              </Box>
              <Box>
                <Bone w={100} h={10} sx={{ mb: 0.75 }} />
                <Bone w="100%" h={36} r={8} />
              </Box>
            </Box>

            {/* Expiry date */}
            <Box>
              <Bone w={90} h={10} sx={{ mb: 0.75 }} />
              <Bone w="100%" h={36} r={8} />
            </Box>

            {/* OT input col headers */}
            <Box sx={{ display: "grid", gridTemplateColumns: "110px 1fr 90px", gap: 1, px: 1.5, py: 0.75, bgcolor: "rgba(109,35,35,0.04)", borderRadius: 1 }}>
              {[70, 90, 65].map((w, i) => <Bone key={i} w={w} h={9} />)}
            </Box>

            {/* Single OT input row */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "110px 1fr 90px",
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: "1px solid rgba(0,0,0,0.08)",
                bgcolor: "rgba(0,0,0,0.01)",
              }}
            >
              <Box>
                <Bone w={75} h={12} sx={{ mb: 0.5 }} />
                <Bone w={90} h={8} />
              </Box>
              <Bone w="100%" h={32} r={6} />
              <Box sx={{ textAlign: "center" }}>
                <Bone w={50} h={8} sx={{ mb: 0.4, mx: "auto" }} />
                <Bone w={60} h={16} sx={{ mx: "auto" }} />
                <Bone w={45} h={8} sx={{ mt: 0.4, mx: "auto" }} />
              </Box>
            </Box>

            {/* Remarks */}
            <Box>
              <Bone w={110} h={10} sx={{ mb: 0.75 }} />
              <Bone w="100%" h={56} r={8} />
            </Box>
          </Box>

          {/* Submit button */}
          <Box sx={{ px: 2.5, pb: 2, pt: 1, borderTop: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}>
            <Bone w="100%" h={40} r={8} />
          </Box>
        </Box>

        {/* ── Right col — CTO Records Panel ── */}
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
            animation: "ctoPulse 2s ease-in-out 0.1s infinite",
          }}
        >
          {/* Records header */}
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(109,35,35,0.05)", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 15, height: 15, borderRadius: "50%", bgcolor: "rgba(109,35,35,0.2)" }} />
                <Bone w={110} h={12} />
              </Box>
              <Box sx={{ display: "flex", gap: 0.75 }}>
                <Bone w={150} h={22} r={20} />
                <Bone w={56} h={28} r={6} />
              </Box>
            </Box>
            {/* Search + dept filter — no tabs (CTO has no tab bar unlike SC) */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Bone w="100%" h={32} r={8} />
              <Bone w={130} h={32} r={8} sx={{ flexShrink: 0 }} />
            </Box>
          </Box>

          {/* Grid of employee cards */}
          <Box sx={{ flex: 1, overflowY: "hidden", p: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5 }}>
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
                    animation: `ctoPulse 1.6s ease-in-out ${i * 0.06}s infinite`,
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
                        <Bone w={44} h={14} r={20} />
                      </Box>
                    </Box>
                  </Box>
                  {/* Period chips */}
                  <Box sx={{ display: "flex", gap: 0.4, flexWrap: "wrap" }}>
                    {[60, 65, 55].map((w, j) => (
                      <Bone key={j} w={w} h={18} r={4} />
                    ))}
                  </Box>
                  {/* Expiry badge */}
                  <Bone w={90} h={16} r={20} />
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

// ─── OT Input Row ──────────────────────────────────────────────────────────────
// otHours is always stored in HOURS internally.
// When unit="days", the input field accepts DAYS and converts to hours on blur.
const OTInputRow = ({ otHours, onChangeOT, unit }) => {
  const [draft, setDraft] = useState(null);

  // Convert internal hours value to the current display unit for the committed display
  const committedInUnit = otHours === 0 ? 0 : (unit === "days" ? otHours / 8 : otHours);
  const committedDisplay = otHours === 0 ? "" : String(parseFloat(committedInUnit.toFixed(3)));
  const displayValue = draft !== null ? draft : committedDisplay;

  const handleBlur = () => {
    const num = parseFloat(draft);
    if (isNaN(num) || draft?.trim() === "") {
      onChangeOT(0);
    } else {
      // Convert input (which is in display unit) back to hours for storage
      onChangeOT(toHours(num, unit));
    }
    setDraft(null);
  };

  // When unit changes, reset draft so display updates correctly
  useEffect(() => { setDraft(null); }, [unit]);

  const ctoHrs = toNum(otHours); // always in hours

  return (
    <Box sx={{
      display: "grid", gridTemplateColumns: "110px 1fr 90px", gap: 1, alignItems: "center",
      px: 1.5, py: 1, borderRadius: 1.5,
      border: ctoHrs > 0 ? `1px solid rgba(46,125,50,0.25)` : `1px solid ${T.accentBorder}`,
      bgcolor: ctoHrs > 0 ? "rgba(46,125,50,0.03)" : T.rowEven,
    }}>
      <Box>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>
          OT {unit === "days" ? "Days" : "Hours"} Worked
        </Typography>
        <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>
          1 OT {unit === "days" ? "day" : "hr"} = 1 CTO {unit === "days" ? "day" : "hr"}
        </Typography>
      </Box>
      <FieldInput type="text" inputMode="decimal" size="small" fullWidth
        value={displayValue}
        placeholder={unit === "days" ? "0.000 days" : "0.000 hrs"}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setDraft(committedDisplay)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        sx={{ "& .MuiInputBase-input": { fontWeight: 700, color: "#1976d2" } }}
        InputProps={{ endAdornment:
          <InputAdornment position="end">
            <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontWeight: 700, fontFamily: T.poppins }}>
              {unit === "days" ? "days" : "OT hrs"}
            </Typography>
          </InputAdornment>
        }}
      />
      <Box sx={{ textAlign: "center" }}>
        <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}>CTO earned</Typography>
        <Typography sx={{ fontSize: "0.88rem", fontWeight: 800, color: ctoHrs > 0 ? "#2e7d32" : T.faint, fontFamily: T.poppins }}>
          {fmtHrs(ctoHrs, unit)}
        </Typography>
        {ctoHrs > 0 && (
          <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins }}>
            {unit === "days" ? `${ctoHrs.toFixed(3)} hrs` : `${(ctoHrs / 8).toFixed(3)} days`}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const CompensatoryTimeOff = () => {
  const { hasAccess, loading: accessLoading } = usePageAccess("compensatory-time-off");

  const [ctoRecords,     setCTORecords]     = useState([]);
  const [employees,      setEmployees]      = useState([]);
  const [empCatRawMap,   setEmpCatRawMap]   = useState({});
  const [empCatLabelMap, setEmpCatLabelMap] = useState({});
  const [deptMap,        setDeptMap]        = useState({});

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [periodYear,       setPeriodYear]        = useState(new Date().getFullYear().toString());
  const [periodMonth,      setPeriodMonth]       = useState("");
  const [otHours,          setOtHours]           = useState(0); // always stored in HOURS internally
  const [expiryDate,       setExpiryDate]        = useState("");
  const [remarks,          setRemarks]           = useState("");
  // ── DEFAULT IS DAYS ──
  const [unit,             setUnit]              = useState("days");

  const [loading,       setLoading]       = useState(false);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [successOpen,   setSuccessOpen]   = useState(false);
  const [successAction, setSuccessAction] = useState("");
  const [error,         setError]         = useState("");
  const [searchTerm,    setSearchTerm]    = useState("");
  const [deptFilter,    setDeptFilter]    = useState("all");
  const [viewMode,      setViewMode]      = useState("grid");
  const [recordsPage,   setRecordsPage]   = useState(0);
  const [rowsPerPage,   setRowsPerPage]   = useState(24);

  const [employeeCTOModalOpen, setEmployeeCTOModalOpen] = useState(false);
  const [selectedEmployeeCTO,  setSelectedEmployeeCTO]  = useState(null);
  const [selectedCTORecord,    setSelectedCTORecord]    = useState(null);
  const [editRecord,           setEditRecord]           = useState(null);
  // editHours is always stored in HOURS internally
  const [editHours,            setEditHours]            = useState(0);
  const [actionSuccess,        setActionSuccess]        = useState("");
  const [commuteLoadingId,     setCommuteLoadingId]     = useState(null);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchCTORecords(), fetchEmployees(), fetchDeptMap(), fetchEmpCatMap()]);
      setPageLoading(false);
    })();
  }, []);

  useEffect(() => { setRecordsPage(0); }, [searchTerm, deptFilter]);
  useEffect(() => { setOtHours(0); setRemarks(""); setExpiryDate(""); setError(""); }, [selectedEmployee, periodYear, periodMonth]);

  const fetchCTORecords = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/cto/cto`, { headers: { Authorization: `Bearer ${token}` } });
      setCTORecords(Array.isArray(r.data) ? r.data : []);
    } catch { setCTORecords([]); }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const [usersRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (usersRes.status === "fulfilled") {
        const d = usersRes.value.data;
        setEmployees(Array.isArray(d) ? d : d?.users || d?.data || []);
      }
    } catch { setEmployees([]); }
  };

  const fetchDeptMap = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/department-assignment`, { headers: { Authorization: `Bearer ${token}` } });
      const map = {};
      (Array.isArray(r.data) ? r.data : []).forEach((item) => {
        if (item.employeeNumber && item.code) map[item.employeeNumber.toString()] = item.code;
      });
      setDeptMap(map);
    } catch {}
  };

  // ─── FIXED: derive is40hrs / isDesignated from the strings the backend
  //     actually returns (parentGroup, typeName, categoryLabel) instead of
  //     reading boolean flags that the endpoint never sends.
  const fetchEmpCatMap = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(
        `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const labelMap = {}, rawMap = {};
      (Array.isArray(r.data) ? r.data : []).forEach((item) => {
        if (!item.employeeNumber) return;
        const num = item.employeeNumber.toString();

        const label =
          item.parentGroup && item.typeName
            ? `${item.parentGroup} | ${item.typeName}`
            : item.categoryLabel || "";

        if (label) labelMap[num] = { label, colorHex: item.colorHex || "#757575" };

        const labelLower = label.toLowerCase();
        const groupLower = (item.parentGroup || "").toLowerCase();
        const typeLower  = (item.typeName    || "").toLowerCase();

        const is40hrs = (
          labelLower.includes("40") ||
          groupLower.includes("40") ||
          typeLower.includes("40")
        );

        const isDesignated = (
          labelLower.includes("designated") ||
          groupLower.includes("designated") ||
          typeLower.includes("designated")
        );

        rawMap[num] = {
          is40hrs,
          isDesignated,
          isTempo:  false,
          is30hrs:  false,
          colorHex: item.colorHex || "#757575",
          label,
        };
      });
      setEmpCatLabelMap(labelMap);
      setEmpCatRawMap(rawMap);
    } catch (err) {
      console.error("fetchEmpCatMap error:", err);
    }
  };

  useLeaveRealtimeRefresh(() => {
    fetchCTORecords();
    fetchEmployees();
    fetchDeptMap();
    fetchEmpCatMap();
  });

  const allDeptCodes = useMemo(() => [...new Set(Object.values(deptMap).filter(Boolean))].sort(), [deptMap]);

  const buildDisplayName = useCallback((e) => {
    const last = (e?.lastName  || "").trim();
    const first = (e?.firstName || "").trim();
    const mid   = (e?.middleName || "").trim();
    if (!last && !first) return (e?.fullName || "").trim() || `#${e?.employeeNumber}`;
    const given = [first, mid].filter(Boolean).join(" ");
    return last ? `${last.toUpperCase()}, ${given}` : given;
  }, []);

  const employeeOptions = useMemo(() => {
    const withMeta = employees.map((e) => {
      const displayName = buildDisplayName(e);
      const empNo       = (e?.employeeNumber || "").toString();
      const cat         = empCatRawMap[empNo];
      const eligible    = cat ? (cat.is40hrs || cat.isDesignated) : false;
      const sortLast    = (e?.lastName || "").trim().toLowerCase();
      return { ...e, _displayName: displayName, _searchKey: `${displayName} ${empNo}`.toLowerCase(), _eligible: eligible, _sortLast: sortLast };
    });
    return withMeta.sort((a, b) => {
      if (a._eligible !== b._eligible) return a._eligible ? -1 : 1;
      return a._sortLast.localeCompare(b._sortLast);
    });
  }, [employees, empCatRawMap, buildDisplayName]);

  const selectedEmpCatData = useMemo(
    () => selectedEmployee ? (empCatRawMap[selectedEmployee.employeeNumber?.toString()] || null) : null,
    [selectedEmployee, empCatRawMap],
  );

  const isEligibleForCTO = useMemo(() => {
    if (!selectedEmpCatData) return true;
    return selectedEmpCatData.is40hrs || selectedEmpCatData.isDesignated;
  }, [selectedEmpCatData]);

  const filteredRecords = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return ctoRecords.filter((r) => {
      const matchSearch =
        (r.fullName?.toLowerCase() || "").includes(s) ||
        (r.employeeNumber?.toString() || "").includes(s);
      const matchDept = deptFilter === "all" || (deptMap[r.employeeNumber?.toString()] || "") === deptFilter;
      return matchSearch && matchDept;
    });
  }, [ctoRecords, searchTerm, deptFilter, deptMap]);

  const getEmployeeInfo = useCallback(
    (num) => employees.find((e) => e.employeeNumber?.toString() === num?.toString()) || { fullName: num || "Unknown" },
    [employees],
  );

  const groupedByEmployee = useMemo(() => {
    const acc = {};
    filteredRecords.forEach((r) => {
      const num = r.employeeNumber?.toString() || "Unknown";
      if (!acc[num]) {
        const info = getEmployeeInfo(num);
        acc[num] = { employeeNumber: num, fullName: buildDisplayName(info) || num, firstName: info.firstName, lastName: info.lastName, records: [] };
      }
      acc[num].records.push(r);
    });
    return Object.values(acc)
      .map((grp) => ({
        ...grp,
        displayRecords: latestCtoRecordsByPeriod(grp.records, grp.employeeNumber),
      }))
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  }, [filteredRecords, getEmployeeInfo, buildDisplayName]);

  const paginatedGroups = useMemo(() => {
    const s = recordsPage * rowsPerPage;
    return groupedByEmployee.slice(s, s + rowsPerPage);
  }, [groupedByEmployee, recordsPage, rowsPerPage]);

  const perMonthTracking = isPerMonthCtoTracking(periodMonth);

  const existingPeriodRecord = useMemo(() => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    if (!empNum) return null;
    return findCtoSaveTarget(ctoRecords, empNum, periodYear, periodMonth);
  }, [ctoRecords, selectedEmployee, periodYear, periodMonth]);

  const handleAddCTO = async () => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    if (!empNum)              { setError("Please select an employee"); return; }
    if (toNum(otHours) <= 0) { setError(`OT ${unit === "days" ? "days" : "hours"} must be > 0`); return; }
    const py = parseInt(periodYear, 10) || new Date().getFullYear();
    const pm = periodMonth || null;
    const earned = toNum(otHours);
    const catSnapshot = JSON.stringify({
      label: selectedEmpCatData?.label || "",
      is40hrs: selectedEmpCatData?.is40hrs || false,
      isDesignated: selectedEmpCatData?.isDesignated || false,
    });

    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const existing = findCtoSaveTarget(ctoRecords, empNum, py, pm);
      const chainRecs = ctoRecords.filter(
        (r) => String(r.employeeNumber) === empNum,
      );
      const chain = getCtoEmployeeLedgerSummary(chainRecs);
      const usedHours = Math.max(0, chain.earnedForColor - chain.remaining);
      const addEarned = earned;

      if (existing?.id) {
        const mergedRemarks = [existing.remarks, remarks]
          .filter(Boolean)
          .join(" · ")
          .trim() || null;
        await axios.put(
          `${API_BASE_URL}/api/cto/cto/${existing.id}`,
          {
            ot_hours: toNum(existing.ot_hours) + addEarned,
            earned_hours: chain.earnedForColor + addEarned,
            remaining_hours: chain.remaining + addEarned,
            used_hours: usedHours,
            expiry_date: expiryDate || existing.expiry_date || null,
            remarks: mergedRemarks,
          },
          { headers },
        );
        setSuccessAction("edit");
      } else {
        await axios.post(
          `${API_BASE_URL}/api/cto/cto`,
          {
            employeeNumber: empNum,
            ot_hours: addEarned,
            earned_hours: addEarned,
            remaining_hours: chain.remaining + addEarned,
            used_hours: usedHours,
            period_year: py,
            period_month: pm,
            expiry_date: expiryDate || null,
            remarks: remarks || null,
            emp_category_snapshot: catSnapshot,
          },
          { headers },
        );
        setSuccessAction("adding");
      }

      await fetchCTORecords();
      setOtHours(0);
      setRemarks("");
      setExpiryDate("");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      setError("Error saving CTO: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // editHours is always stored in hours internally
      await axios.put(
        `${API_BASE_URL}/api/cto/cto/${editRecord.id}`,
        { ...editRecord, earned_hours: editHours, ot_hours: editHours,
          remaining_hours: Math.max(0, editHours - toNum(editRecord.used_hours)) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchCTORecords();
      setEditRecord(null); setError("");
      setSuccessAction("edit"); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 500);
    } catch (err) { setError("Error updating: " + (err.response?.data?.error || err.message)); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this CTO record?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/cto/cto/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchCTORecords();
      setEditRecord(null); setEmployeeCTOModalOpen(false);
      setSuccessAction("delete"); setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 1000);
    } catch (err) { setError("Error deleting: " + (err.response?.data?.error || err.message)); }
  };

  const handleTransferToCommutation = async (record, ledgerRemainingHours) => {
    if (!record?.id) return;
    const remH =
      ledgerRemainingHours != null
        ? toNum(ledgerRemainingHours)
        : toNum(record.remaining_hours);
    if (remH <= 0) return;
    if (!window.confirm(`Transfer remaining ${fmtHrs(remH, unit)} to Leave Commutation?`)) return;
    setCommuteLoadingId(record.id);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/cto/cto/${record.id}/commute`,
        { commuted_by: token ? "admin" : null },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchCTORecords();
      setActionSuccess(`Transferred ${fmtHrs(remH, unit)} to Leave Commutation.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) { setError("Transfer failed: " + (err.response?.data?.error || err.message)); }
    finally { setCommuteLoadingId(null); }
  };

  const openEmployeeCTOModal = (grp) => {
    const display =
      grp.displayRecords || latestCtoRecordsByPeriod(grp.records, grp.employeeNumber);
    setSelectedEmployeeCTO({ ...grp, displayRecords: display });
    setSelectedCTORecord(display[0] || null);
    setEmployeeCTOModalOpen(true);
  };

if (accessLoading || pageLoading) {
    return <CompensatoryTimeOffWireframe />;
  }
  if (!hasAccess) return <AccessDenied />;

  const selectedMonthLabel = MONTHS.find((m) => m.value === periodMonth)?.label || "";

  // Helper: display edit hours in current unit for the input field
  const editHoursInUnit = unit === "days" ? editHours / 8 : editHours;

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Fade in timeout={400}>
        <Box sx={{
          py: { xs: 1, md: 2 }, mt: { xs: 0, md: -2 }, mb: { xs: 1, md: 2 },
          width: "100vw", maxWidth: "100%",
          position: "relative", left: "63%", transform: "translateX(-61%)",
          px: { xs: 2, sm: 3, md: 6 },
        }}>
          <LoadingOverlay open={loading} message="Processing CTO record…" />
          <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />
          {/* ── Page Header ── */}
          <SectionCard sx={{ mb: 2, overflow: "hidden" }}>
            <Box sx={{
              px: 4, py: 3,
              background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              position: "relative", overflow: "hidden",
            }}>
              <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${alpha(T.accent, 0.1)} 0%, transparent 70%)` }} />
              <Box sx={{ position: "absolute", bottom: -30, left: "30%", width: 150, height: 150, borderRadius: "50%", background: `radial-gradient(circle, ${alpha(T.accent, 0.07)} 0%, transparent 70%)` }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, position: "relative", zIndex: 1 }}>
                <CTOIcon sx={{ fontSize: 32, color: T.accent }} />
                <Box>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: T.accent, lineHeight: 1.2, mb: 0.3, fontFamily: T.poppins }}>
                    Compensatory Time Off (CTO)
                  </Typography>
                  <Typography sx={{ fontSize: "0.82rem", color: T.accentMid, fontWeight: 700, opacity: 0.9, fontFamily: T.poppins }}>
                    Administrative Panel · 40-hr / Designated Employees · 1:1 OT accrual
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
                <Box sx={{ px: 2.5, py: 0.75, borderRadius: 6, bgcolor: alpha(T.accent, 0.1), border: `1px solid ${alpha(T.accent, 0.2)}` }}>
                  <Typography sx={{ fontSize: "0.8rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>
                    {ctoRecords.length} {ctoRecords.length === 1 ? "record" : "records"}
                  </Typography>
                </Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => { fetchCTORecords(); fetchDeptMap(); fetchEmpCatMap(); }}
                    sx={{ bgcolor: alpha(T.accent, 0.08), color: T.accent, width: 36, height: 36, "&:hover": { bgcolor: alpha(T.accent, 0.15) } }}>
                    <RefreshIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </SectionCard>

          <Grid container spacing={2}>
            {/* ── LEFT: Record CTO Form ── */}
            <Grid item xs={12} lg={4}>
              <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>
                {/* Panel header */}
                <Box sx={{ px: 3.5, py: 1.25, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 1.5, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <AddIcon sx={{ fontSize: 15, color: T.accent }} />
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>Record CTO (Overtime)</Typography>
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

                  {/* CTO rule info box */}
                  <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                      <InfoIcon sx={{ fontSize: 13, color: T.accent }} />
                      <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>CTO Rule</Typography>
                      <Chip label="40-hr / Designated only" size="small"
                        sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: alpha(T.accent, 0.1), color: T.accent, border: `1px solid ${alpha(T.accent, 0.25)}` }} />
                    </Box>
                    <Typography sx={{ fontSize: "0.68rem", color: T.accentMid, fontFamily: T.poppins, opacity: 0.85 }}>
                      CTO accrues at 1:1 with OT hours. Cannot be monetized or converted to SL/VL.
                    </Typography>
                  </Box>

                  {/* ── Employee selector ── */}
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
                      Select Employee <span style={{ color: "#c62828" }}>*</span>
                      <Box component="span" sx={{ ml: 1, fontSize: "0.65rem", fontWeight: 400, color: T.faint }}>
                        — 40-hr / Designated shown first, sorted by last name
                      </Box>
                    </Typography>
                    <Autocomplete
                      value={selectedEmployee}
                      onChange={(_, v) => { setSelectedEmployee(v); setError(""); }}
                      options={employeeOptions}
                      autoHighlight
                      groupBy={(o) => o._eligible ? "✓ Eligible (40-hr / Designated)" : "Other employees"}
                      getOptionLabel={(o) => `${o._displayName} (${o.employeeNumber})`}
                      filterOptions={(opts, { inputValue: iv }) => {
                        const q = iv.toLowerCase().trim();
                        if (!q) return opts.slice(0, 100);
                        return opts.filter((o) => (o._searchKey || "").includes(q)).slice(0, 80);
                      }}
                      isOptionEqualToValue={(o, v) => o.employeeNumber === v.employeeNumber}
                      noOptionsText="No employees found"
                      renderOption={(props, option) => {
                        const { key, ...rest } = props;
                        const initials = `${option.lastName?.[0] || ""}${option.firstName?.[0] || ""}`.toUpperCase() || "?";
                        const deptCode = deptMap[option.employeeNumber?.toString()];
                        const empCat   = empCatLabelMap[option.employeeNumber?.toString()];
                        const catData  = empCatRawMap[option.employeeNumber?.toString()];
                        return (
                          <li key={key} {...rest}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.25 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: option._eligible ? T.accent : alpha(T.accent, 0.3), fontSize: "0.68rem", fontWeight: 700, borderRadius: "6px", flexShrink: 0 }}>{initials}</Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: T.poppins, fontSize: "0.82rem" }}>{option._displayName}</Typography>
                                  {catData?.is40hrs    && <Chip label="40-hr"      size="small" sx={{ height: 14, fontSize: "0.55rem", fontWeight: 700, bgcolor: "rgba(46,125,50,0.1)", color: "#2e7d32" }} />}
                                  {catData?.isDesignated && <Chip label="Designated" size="small" sx={{ height: 14, fontSize: "0.55rem", fontWeight: 700, bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}` }} />}
                                </Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Typography variant="caption" sx={{ color: T.faint, fontFamily: T.poppins }}>#{option.employeeNumber}</Typography>
                                  {deptCode && <DeptBadge code={deptCode} />}
                                  {empCat   && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
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
                      sx={{
                        width: "100%",
                        "& .MuiAutocomplete-groupLabel": {
                          fontSize: "0.65rem", fontWeight: 700, color: T.accent,
                          textTransform: "uppercase", letterSpacing: "0.07em",
                          bgcolor: T.accentFaint, lineHeight: "2.2em",
                          fontFamily: T.poppins,
                        },
                        "& .MuiAutocomplete-groupUl": { p: 0 },
                      }}
                    />
                    {selectedEmployee && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.75, flexWrap: "wrap" }}>
                        {deptMap[selectedEmployee.employeeNumber?.toString()] && <DeptBadge code={deptMap[selectedEmployee.employeeNumber?.toString()]} />}
                        {empCatLabelMap[selectedEmployee.employeeNumber?.toString()] && <EmpCatBadge label={empCatLabelMap[selectedEmployee.employeeNumber?.toString()].label} colorHex={empCatLabelMap[selectedEmployee.employeeNumber?.toString()].colorHex} />}
                        {selectedEmpCatData?.is40hrs     && <Chip label="40-hr week"  size="small" sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(46,125,50,0.1)", color: "#2E7D32" }} />}
                        {selectedEmpCatData?.isDesignated && <Chip label="Designated" size="small" sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}` }} />}
                        {!isEligibleForCTO && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <WarnIcon sx={{ fontSize: 13, color: "#e65100" }} />
                            <Typography sx={{ fontSize: "0.65rem", color: "#e65100", fontWeight: 700, fontFamily: T.poppins }}>Not a 40-hr / Designated employee — CTO may not apply</Typography>
                          </Box>
                        )}
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
                        Period Month <span style={{ color: T.faint, fontSize: "0.68rem", fontWeight: 400 }}>(optional)</span>
                      </Typography>
                      <Typography sx={{ fontSize: "0.65rem", color: T.faint, mb: 0.5, fontFamily: T.poppins, lineHeight: 1.35 }}>
                        Leave as &quot;No specific month&quot; to add to the same CTO record for the year. Pick a month to keep a separate record per month.
                      </Typography>
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

                  {/* Expiry */}
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
                      Expiry Date <span style={{ color: T.faint, fontSize: "0.68rem", fontWeight: 400 }}>(optional)</span>
                    </Typography>
                    <FieldInput type="date" size="small" fullWidth value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: new Date().toISOString().split("T")[0] }}
                    />
                  </Box>

                  {selectedEmployee ? (
                    <>
                      {/* OT input grid header */}
                      <Box sx={{ display: "grid", gridTemplateColumns: "110px 1fr 90px", gap: 1, px: 1.5, py: 0.75, mb: 0.75, bgcolor: alpha(T.accent, 0.04), borderRadius: 1 }}>
                        {[`OT Input (${unit === "days" ? "Days" : "Hours"})`, `OT ${unit === "days" ? "Days" : "Hours"}`, "CTO Earned"].map((h) => (
                          <Typography key={h} sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins }}>{h}</Typography>
                        ))}
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <OTInputRow otHours={otHours} onChangeOT={setOtHours} unit={unit} />
                      </Box>

                      {/* Remarks */}
                      <Box sx={{ mb: 2 }}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
                          Remarks / Reference <span style={{ color: T.faint, fontSize: "0.68rem", fontWeight: 400 }}>(optional)</span>
                        </Typography>
                        <FieldInput size="small" fullWidth multiline rows={2} value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="e.g. OT Order No. 2024-01, event name…" />
                      </Box>

                      {(periodYear || periodMonth) && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2 }}>
                          <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>Recording for:</Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.3, borderRadius: "5px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                            <CalIcon sx={{ fontSize: 11, color: T.accent }} />
                            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>
                              {periodYear}{selectedMonthLabel ? ` · ${selectedMonthLabel}` : ""}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      <AccentButton onClick={handleAddCTO} variant="contained" fullWidth
                        startIcon={loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
                        disabled={loading || toNum(otHours) <= 0}
                        sx={{ height: 40, bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, fontFamily: T.poppins, "&:hover": { bgcolor: T.accentDark }, "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important", boxShadow: "none" } }}>
                        {loading
                          ? "Saving…"
                          : toNum(otHours) > 0
                            ? existingPeriodRecord
                              ? `Add ${fmtHrs(otHours, unit)} to existing CTO · ${periodYear}${perMonthTracking && selectedMonthLabel ? ` · ${selectedMonthLabel}` : perMonthTracking ? "" : " (year total)"}`
                              : `Record ${fmtHrs(otHours, unit)} CTO for ${periodYear}${selectedMonthLabel ? ` · ${selectedMonthLabel}` : ""}`
                            : `Enter OT ${unit === "days" ? "days" : "hours"} to compute CTO`}
                      </AccentButton>
                    </>
                  ) : (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <PersonIcon sx={{ fontSize: 40, color: alpha(T.accent, 0.2), mb: 1 }} />
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>Select an employee to begin</Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: T.faint, mt: 0.5, fontFamily: T.poppins }}>CTO applies to 40-hr / Designated employees</Typography>
                    </Box>
                  )}
                </Box>
              </SectionCard>
            </Grid>

            {/* ── RIGHT: Records Panel ── */}
            <Grid item xs={12} lg={8}>
              <SectionCard sx={{ height: "calc(100vh - 280px)", display: "flex", flexDirection: "column" }}>
                <Box sx={{ px: 3.5, py: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Reorder sx={{ fontSize: 17, color: T.accent }} />
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }}>CTO Records</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Box sx={{ px: 1.5, py: 0.4, borderRadius: 6, bgcolor: alpha(T.accent, 0.08), border: `1px solid ${alpha(T.accent, 0.15)}` }}>
                        <Typography sx={{ fontSize: "0.72rem", color: T.accent, fontWeight: 700, fontFamily: T.poppins }}>
                          {groupedByEmployee.length} employees · {filteredRecords.length} records
                        </Typography>
                      </Box>
                      <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small"
                        sx={{ "& .MuiToggleButton-root": { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`, color: T.muted, "&.Mui-selected": { bgcolor: T.accentFaint, color: T.accent } } }}>
                        <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                        <ToggleButton value="list"><ViewListIcon   sx={{ fontSize: 14 }} /></ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <FieldInput size="small" placeholder="Search by name or employee number…"
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1 }}
                      InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }} />
                    {allDeptCodes.length > 0 && (
                      <FormControl size="small" sx={{ minWidth: 130, flexShrink: 0 }}>
                        <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} displayEmpty
                          startAdornment={<DomainIcon sx={{ fontSize: 14, color: T.accent, mr: 0.5, ml: 0.25 }} />}
                          sx={{ ...selectSx, "& .MuiSelect-select": { py: "7px", fontSize: "0.8rem", fontWeight: deptFilter !== "all" ? 700 : 400, color: deptFilter !== "all" ? T.accent : T.muted, display: "flex", alignItems: "center" } }}>
                          <MenuItem value="all" sx={{ fontFamily: T.poppins, fontSize: "0.82rem", color: T.muted }}>All depts</MenuItem>
                          {allDeptCodes.map((c) => (
                            <MenuItem key={c} value={c} sx={{ fontFamily: T.poppins, fontSize: "0.82rem" }}>{c}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                </Box>

                <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
                  {paginatedGroups.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: "center" }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                        <CTOIcon sx={{ fontSize: 32, color: alpha(T.accent, 0.3) }} />
                      </Box>
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: T.muted, mb: 0.5, fontFamily: T.poppins }}>
                        {ctoRecords.length === 0 ? "No CTO Records" : "No Matching Records"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: T.faint, fontFamily: T.poppins }}>
                        {ctoRecords.length === 0 ? "Record OT hours using the form on the left." : "Try adjusting your search or filter."}
                      </Typography>
                    </Box>
                  ) : viewMode === "grid" ? (
                    <Grid container spacing={1.5} alignItems="stretch">
                      {paginatedGroups.map((grp) => {
                        const { remaining: balRem, earnedForColor } = getCtoEmployeeLedgerSummary(grp.records);
                        const sc = getStatusColor(balRem, earnedForColor);
                        const chipRecords = (grp.displayRecords || latestCtoRecordsByPeriod(grp.records, grp.employeeNumber))
                          .sort((a, b) => toNum(b.id) - toNum(a.id));
                        const initials    = `${grp.firstName?.[0] || ""}${grp.lastName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const deptCode    = deptMap[grp.employeeNumber] || null;
                        const empCat      = empCatLabelMap[grp.employeeNumber] || null;
                        const hasExpired  = chipRecords.some((r) => isExpired(r.expiry_date));
                        return (
                          <Grid item xs={12} sm={6} md={3} key={grp.employeeNumber} sx={{ display: "flex" }}>
                            <Box onClick={() => openEmployeeCTOModal(grp)}
                              sx={{ width: "100%", display: "flex", flexDirection: "column", p: 2, borderRadius: 2, cursor: "pointer", bgcolor: "#fff",
                                border: `1px solid ${hasExpired ? "rgba(211,47,47,0.25)" : T.accentBorder}`,
                                transition: "all 0.13s",
                                "&:hover": { bgcolor: T.rowHover, borderColor: T.accent, transform: "translateY(-2px)", boxShadow: `0 4px 14px ${alpha(T.accent, 0.1)}` } }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
                                <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", fontWeight: 800, bgcolor: T.accent, color: "#fff", borderRadius: "8px", flexShrink: 0 }}>{initials}</Avatar>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, lineHeight: 1.25, fontFamily: T.poppins }} noWrap>{grp.fullName}</Typography>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                    <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>#{grp.employeeNumber}</Typography>
                                    {deptCode && <DeptBadge code={deptCode} />}
                                    {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
                                  </Box>
                                </Box>
                              </Box>
                              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 0.75 }}>
                                {chipRecords.slice(0, 3).map((r) => {
                                  const rsc = getStatusColor(r.remaining_hours, r.earned_hours);
                                  return (
                                    <Box key={r.id} sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: `${rsc}12`, border: `1px solid ${rsc}30` }}>
                                      <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: rsc, fontFamily: T.poppins }}>
                                        {r.period_year}{r.period_month ? `-${monthName(r.period_month).slice(0, 3)}` : ""}
                                      </Typography>
                                    </Box>
                                  );
                                })}
                                {chipRecords.length > 3 && (
                                  <Box sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
                                    <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>+{chipRecords.length - 3}</Typography>
                                  </Box>
                                )}
                              </Box>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 0.75, borderTop: `1px solid ${T.divider}` }}>
                                <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>
                                  {(grp.displayRecords || grp.records).length} period{(grp.displayRecords || grp.records).length !== 1 ? "s" : ""}
                                </Typography>
                                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: sc, fontFamily: T.poppins }}>
                                  Remaining balance: {fmtHrs(balRem, unit)}
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
                        {["Employee", "Dept / Category", "Records", "Balance", "Periods"].map((col) => (
                          <Typography key={col} sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins }}>{col}</Typography>
                        ))}
                      </Box>
                      {paginatedGroups.map((grp, idx) => {
                        const { remaining: balRem, earnedForColor } = getCtoEmployeeLedgerSummary(grp.records);
                        const sc = getStatusColor(balRem, earnedForColor);
                        const chipRecords = (grp.displayRecords || latestCtoRecordsByPeriod(grp.records, grp.employeeNumber))
                          .sort((a, b) => toNum(b.id) - toNum(a.id));
                        const initials    = `${grp.firstName?.[0] || ""}${grp.lastName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const deptCode    = deptMap[grp.employeeNumber] || null;
                        const empCat      = empCatLabelMap[grp.employeeNumber] || null;
                        return (
                          <Box key={grp.employeeNumber} onClick={() => openEmployeeCTOModal(grp)}
                            sx={{ px: 1.5, py: 1.25, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.5fr", gap: 1, alignItems: "center", borderRadius: 1.5, cursor: "pointer", bgcolor: idx % 2 === 0 ? T.rowEven : T.rowOdd, border: "1px solid transparent", transition: "background 0.13s ease", "&:hover": { bgcolor: T.rowHover } }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: "0.68rem", fontWeight: 800, bgcolor: T.accent, color: "#fff", borderRadius: "6px", flexShrink: 0 }}>{initials}</Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text, fontFamily: T.poppins }} noWrap>{grp.fullName}</Typography>
                                <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>#{grp.employeeNumber}</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                              {deptCode ? <DeptBadge code={deptCode} /> : <Typography sx={{ fontSize: "0.65rem", color: T.faint }}>—</Typography>}
                              {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
                            </Box>
                            <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "inline-block", width: "fit-content" }}>
                              <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>
                                {(grp.displayRecords || grp.records).length}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: sc, fontFamily: T.poppins }}>{fmtHrs(balRem, unit)}</Typography>
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              {chipRecords.slice(0, 3).map((r) => {
                                const rsc = getStatusColor(r.remaining_hours, r.earned_hours);
                                return (
                                  <Box key={r.id} sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: `${rsc}12`, border: `1px solid ${rsc}30` }}>
                                    <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: rsc, fontFamily: T.poppins }}>
                                      {r.period_year}{r.period_month ? `-${monthName(r.period_month).slice(0, 3)}` : ""}
                                    </Typography>
                                  </Box>
                                );
                              })}
                              {chipRecords.length > 3 && <Box sx={{ px: 0.75, py: 0.2, borderRadius: "4px", bgcolor: T.accentFaint }}><Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>+{chipRecords.length - 3}</Typography></Box>}
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
                      sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: "0.78rem", fontWeight: 600, color: T.accent, fontFamily: T.poppins } }}
                    />
                  </Box>
                )}
              </SectionCard>
            </Grid>
          </Grid>

          {/* ── Employee CTO Modal ── */}
          <Modal open={employeeCTOModalOpen}
            onClose={() => { setEmployeeCTOModalOpen(false); setSelectedEmployeeCTO(null); setSelectedCTORecord(null); }}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <Fade in={employeeCTOModalOpen}>
              <Box sx={{ backgroundColor: "#fff", borderRadius: "12px", width: "95%", maxWidth: "1080px", height: "84vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", fontFamily: T.poppins }}>
                {selectedEmployeeCTO && (() => {
                  const deptCode      = deptMap[selectedEmployeeCTO.employeeNumber] || null;
                  const empCat        = empCatLabelMap[selectedEmployeeCTO.employeeNumber] || null;
                  const modalRecords =
                    selectedEmployeeCTO.displayRecords ||
                    latestCtoRecordsByPeriod(
                      selectedEmployeeCTO.records,
                      selectedEmployeeCTO.employeeNumber,
                    );
                  const sortedRecords = [...modalRecords].sort((a, b) => {
                    if (b.period_year !== a.period_year) return b.period_year - a.period_year;
                    return (toNum(b.period_month) || 0) - (toNum(a.period_month) || 0);
                  });
                  const ledgerModal = getCtoEmployeeLedgerSummary(
                    selectedEmployeeCTO.records,
                  );
                  const balRemModal = ledgerModal.remaining;
                  const earnedModal = ledgerModal.earnedForColor;
                  const usedModal = Math.max(0, earnedModal - balRemModal);
                  const ledgerStatusColor = getStatusColor(balRemModal, earnedModal);
                  return (
                    <>
                      {/* Modal header */}
                      <Box sx={{ px: 3.5, py: 2, background: T.headerGrad, display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontSize: "0.85rem", fontWeight: 800, borderRadius: "8px", border: "1px solid rgba(255,255,255,0.25)" }}>
                          {`${selectedEmployeeCTO.firstName?.[0] || ""}${selectedEmployeeCTO.lastName?.[0] || ""}`.toUpperCase() || "?"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.92rem", fontFamily: T.poppins }} noWrap>{selectedEmployeeCTO.fullName}</Typography>
                            {deptCode && <DeptBadge code={deptCode} light />}
                            {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} light />}
                          </Box>
                          <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontFamily: T.poppins }}>
                            #{selectedEmployeeCTO.employeeNumber} · {modalRecords.length} CTO period{modalRecords.length !== 1 ? "s" : ""}
                            {balRemModal > 0 ? ` · Remaining ${fmtHrs(balRemModal, unit)}` : ""}
                          </Typography>
                        </Box>
                        <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                          sx={{ "& .MuiToggleButton-root": { px: 1.5, py: 0.3, border: "1px solid rgba(255,255,255,0.22)", fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", fontFamily: T.poppins, "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.18)", color: "#fff", borderColor: "rgba(255,255,255,0.4)" } } }}>
                          <ToggleButton value="hours">Hours</ToggleButton>
                          <ToggleButton value="days">Days</ToggleButton>
                        </ToggleButtonGroup>
                        <IconButton onClick={() => { setEmployeeCTOModalOpen(false); setSelectedEmployeeCTO(null); setSelectedCTORecord(null); }}
                          size="small" sx={{ color: "rgba(255,255,255,0.65)", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}>
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>

                      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
                        {/* Sidebar */}
                        <Box sx={{ width: 210, flexShrink: 0, borderRight: `1px solid ${T.divider}`, display: "flex", flexDirection: "column", bgcolor: "#fafafa" }}>
                          <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${T.divider}` }}>
                            <Typography sx={{ fontSize: "0.63rem", fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: T.poppins }}>CTO Period</Typography>
                          </Box>
                          <Box sx={{ flex: 1, overflowY: "auto" }}>
                            {sortedRecords.map((r) => {
                              const expired  = isExpired(r.expiry_date);
                              const isActive = selectedCTORecord?.id === r.id;
                              return (
                                <Box key={r.id} onClick={() => setSelectedCTORecord(r)}
                                  sx={{ px: 2, py: 1.1, cursor: "pointer", borderLeft: `3px solid ${isActive ? T.accent : "transparent"}`, bgcolor: isActive ? T.accentFaint : "transparent", transition: "all 0.1s", "&:hover": { bgcolor: T.accentFaint } }}>
                                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <Typography sx={{ fontSize: "0.82rem", fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.text, fontFamily: T.poppins }}>
                                      {r.period_year}{r.period_month ? ` · ${monthName(r.period_month).slice(0, 3)}` : ""}
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: expired ? "#d32f2f" : ledgerStatusColor, fontFamily: T.poppins }}>
                                      {fmtHrs(balRemModal, unit)}
                                    </Typography>
                                  </Box>
                                  {expired && <Chip label="Expired" size="small" sx={{ height: 14, fontSize: "0.55rem", fontWeight: 700, bgcolor: "rgba(211,47,47,0.08)", color: "#d32f2f", mt: 0.25 }} />}
                                  {r.expiry_date && !expired && <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}>Exp: {new Date(r.expiry_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</Typography>}
                                  <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>1 record</Typography>
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>

                        {/* Detail pane */}
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                          {!selectedCTORecord ? (
                            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Box sx={{ textAlign: "center" }}>
                                <CTOIcon sx={{ fontSize: 38, color: alpha(T.accent, 0.12), mb: 1.5 }} />
                                <Typography sx={{ fontWeight: 600, color: T.muted, fontSize: "0.88rem", fontFamily: T.poppins }}>Select a record</Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
                              {actionSuccess && <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2, borderRadius: 2 }}><Typography sx={{ fontFamily: T.poppins }}>{actionSuccess}</Typography></Alert>}
                              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}><Typography sx={{ fontFamily: T.poppins }}>{error}</Typography></Alert>}
                              {(() => {
                                const r       = selectedCTORecord;
                                const remH    = balRemModal;
                                const earnedH = earnedModal;
                                const usedH   = usedModal;
                                const rsc     = ledgerStatusColor;
                                const pctUsed = earnedH > 0 ? Math.min((usedH / earnedH) * 100, 100) : 0;
                                const fmt     = (h) => fmtHrs(h, unit);
                                const expired = isExpired(r.expiry_date);
                                const remarksShown = formatCtoRemarksForDisplay(r.remarks);
                                return (
                                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <Box sx={{ borderRadius: "10px", border: `1px solid ${expired ? "rgba(211,47,47,0.3)" : "#2E7D32"}`, overflow: "hidden", bgcolor: "#fff" }}>
                                      {/* Record header */}
                                      <Box sx={{ px: 2.5, py: 1.25, display: "flex", alignItems: "center", gap: 1.5, bgcolor: expired ? "rgba(211,47,47,0.04)" : "rgba(46,125,50,0.04)", borderBottom: `1px solid ${T.divider}` }}>
                                        <Typography sx={{ fontWeight: 700, color: expired ? "#d32f2f" : "#2e7d32", fontSize: "0.88rem", fontFamily: T.poppins }}>
                                          {periodLabel(r.period_year, r.period_month)}
                                        </Typography>
                                        {!expired && <Chip label="Current" size="small" sx={{ height: 20, fontSize: "0.65rem", bgcolor: "#2E7D32", color: "#fff", fontWeight: 700, fontFamily: T.poppins }} />}
                                        {expired && <Chip label="Expired" size="small" sx={{ height: 20, fontSize: "0.65rem", bgcolor: "rgba(211,47,47,0.1)", color: "#d32f2f", fontWeight: 700, fontFamily: T.poppins }} />}
                                        {r.expiry_date && <ExpiryBadge expiryDate={r.expiry_date} />}
                                        <Box sx={{ flex: 1 }} />
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 130 }}>
                                          <Box sx={{ flex: 1, height: 5, bgcolor: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
                                            <Box sx={{ height: "100%", width: `${pctUsed}%`, bgcolor: rsc, borderRadius: 3, transition: "width 0.3s" }} />
                                          </Box>
                                          <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins, whiteSpace: "nowrap" }}>{pctUsed.toFixed(0)}% used</Typography>
                                        </Box>
                                      </Box>

                                      {/* Stats grid */}
                                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
                                        {[
                                          ["OT Hours",   toNum(r.ot_hours),         T.accent],
                                          ["CTO Earned", earnedH,                   T.accent],
                                          ["Used",       usedH,                     "#e65100"],
                                          ["Remaining",  remH,                      rsc],
                                        ].map(([label, val, color], i) => (
                                          <Box key={label} sx={{ px: 1.75, py: 1.5, borderRight: i < 3 ? `1px solid ${T.divider}` : "none", borderBottom: `1px solid ${T.divider}`, textAlign: "center" }}>
                                            <Typography sx={{ fontSize: "0.59rem", fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins, mb: 0.5 }}>{label}</Typography>
                                            <Typography sx={{ fontWeight: 800, color, fontSize: "0.9rem", lineHeight: 1, fontFamily: T.poppins }}>{fmt(val)}</Typography>
                                            <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, mt: 0.25 }}>
                                              {unit === "hours" ? `${(toNum(val) / 8).toFixed(3)} d` : `${toNum(val).toFixed(3)} h`}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </Box>

                                      {remarksShown && (
                                        <Box sx={{ px: 2.5, py: 1, borderBottom: `1px solid ${T.divider}`, display: "flex", alignItems: "center", gap: 0.75 }}>
                                          <InfoIcon sx={{ fontSize: 13, color: T.faint }} />
                                          <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>{remarksShown}</Typography>
                                        </Box>
                                      )}

                                      {/* Action row */}
                                      <Box sx={{ px: 2.5, py: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                                        <Typography sx={{ fontSize: "0.72rem", color: expired ? T.faint : remH > 0 ? "#2e7d32" : T.faint, fontFamily: T.poppins }}>
                                          {expired ? "⚠ This CTO record has expired."
                                            : remH > 0 ? `${fmt(remH)} remaining.`
                                            : "All CTO credits for this period have been used."}
                                        </Typography>
                                        <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
                                          <AccentButton onClick={() => { setEditRecord({ ...r }); setEditHours(toNum(r.earned_hours)); setError(""); }}
                                            variant="outlined" size="small"
                                            startIcon={<EditIcon sx={{ fontSize: "12px !important" }} />}
                                            sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28, borderColor: T.accentBorder, color: T.accent, "&:hover": { borderColor: T.accent, bgcolor: T.accentFaint, transform: "none" } }}>
                                            Edit
                                          </AccentButton>
                                          {remH > 0 && (
                                            <Tooltip title="Transfer remaining balance to Leave Commutation">
                                              <span>
                                                <AccentButton
                                                  onClick={() => handleTransferToCommutation(r, balRemModal)}
                                                  variant="contained"
                                                  size="small"
                                                  disabled={commuteLoadingId === r.id}
                                                  startIcon={commuteLoadingId === r.id ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <CommutationIcon sx={{ fontSize: "12px !important" }} />}
                                                  sx={{ fontSize: "0.72rem", fontFamily: T.poppins, px: 1.5, height: 28, bgcolor: T.accent, color: "#fff", "&:hover": { bgcolor: T.accentDark, transform: "none" }, "&:disabled": { bgcolor: "#ccc" } }}
                                                >
                                                  Transfer to Commutation
                                                </AccentButton>
                                              </span>
                                            </Tooltip>
                                          )}
                                        </Box>
                                      </Box>
                                    </Box>
                                  </Box>
                                );
                              })()}
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

          {/* ── Edit CTO Modal ── */}
          <Modal open={!!editRecord} onClose={() => { setEditRecord(null); setError(""); }}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <Fade in={!!editRecord}>
              <Box sx={{ backgroundColor: "#fff", borderRadius: 3, width: "100%", maxWidth: "560px", maxHeight: "90vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", fontFamily: T.poppins }}>
                {editRecord && (() => {
                  const deptCode = deptMap[editRecord.employeeNumber?.toString()] || null;
                  const empCat   = empCatLabelMap[editRecord.employeeNumber?.toString()] || null;
                  const editLedger = getCtoEmployeeLedgerSummary(
                    ctoRecords.filter(
                      (x) =>
                        String(x.employeeNumber) ===
                        String(editRecord.employeeNumber),
                    ),
                  );
                  const editRemH = editLedger.remaining;
                  const editEarnedH = editLedger.earnedForColor;
                  const editUsedH = Math.max(0, editEarnedH - editRemH);
                  // editHours is always stored internally in hours; display in current unit
                  const editDisplayVal = parseFloat((unit === "days" ? editHours / 8 : editHours).toFixed(3));
                  const editCounterLabel = unit === "days"
                    ? `= ${editHours.toFixed(3)} hrs`
                    : `= ${(editHours / 8).toFixed(3)} days`;
                  return (
                    <>
                      <Box sx={{ px: 3.5, py: 2.5, background: T.headerGrad, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                        <Box sx={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.04)" }} />
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <EditIcon sx={{ fontSize: 18, color: "#fff" }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", lineHeight: 1.2, fontFamily: T.poppins }}>Edit CTO Record</Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                              <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", fontFamily: T.poppins }}>{editRecord.fullName || editRecord.employeeNumber} · {periodLabel(editRecord.period_year, editRecord.period_month)}</Typography>
                              {deptCode && <DeptBadge code={deptCode} light />}
                              {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} light />}
                            </Box>
                          </Box>
                        </Box>
                        <IconButton onClick={() => { setEditRecord(null); setError(""); }} size="small" sx={{ color: "rgba(255,255,255,0.75)", position: "relative", zIndex: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}>
                          <Close sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Box>

                      <Box sx={{ px: 3.5, py: 3, overflowY: "auto", flexGrow: 1 }}>
                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}><Typography sx={{ fontFamily: T.poppins }}>{error}</Typography></Alert>}
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: 2.5 }}>
                          {[
                            ["CTO Earned", editEarnedH,    T.accent],
                            ["Used",       editUsedH,      "#ed6c02"],
                            ["Remaining",  editRemH, getStatusColor(editRemH, editEarnedH)],
                          ].map(([lbl, val, col]) => (
                            <Box key={lbl} sx={{ p: 1.5, borderRadius: 2, textAlign: "center", bgcolor: `${col}08`, border: `1px solid ${col}20` }}>
                              <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, mb: 0.25, fontFamily: T.poppins }}>{lbl}</Typography>
                              <Typography sx={{ fontWeight: 900, color: col, fontSize: "0.95rem", lineHeight: 1, fontFamily: T.poppins }}>{fmtHrs(val, unit)}</Typography>
                              <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>{unit === "hours" ? `(${(val / 8).toFixed(3)}d)` : `(${val.toFixed(3)} hrs)`}</Typography>
                            </Box>
                          ))}
                        </Box>
                        <Divider sx={{ mb: 2.5, borderColor: T.divider }}>
                          <Chip label="Edit Fields" size="small" sx={{ height: 18, fontSize: "0.68rem", bgcolor: T.accentFaint, color: T.accent, fontWeight: 700, border: `1px solid ${T.accentBorder}`, fontFamily: T.poppins }} />
                        </Divider>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>
                              OT / Earned {unit === "days" ? "Days" : "Hours"}
                            </Typography>
                            <FieldInput type="number" size="small" fullWidth
                              value={editDisplayVal || ""}
                              inputProps={{ min: 0, step: 0.001 }}
                              onChange={(e) => {
                                const inputVal = parseFloat(e.target.value) || 0;
                                // Convert back to hours for internal storage
                                setEditHours(toHours(inputVal, unit));
                              }}
                              InputProps={{ endAdornment: <InputAdornment position="end">
                                <Typography sx={{ fontSize: "0.7rem", color: T.faint, fontWeight: 700, fontFamily: T.poppins }}>
                                  {unit === "days" ? "days" : "hrs"} · {editCounterLabel}
                                </Typography>
                              </InputAdornment> }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Expiry Date</Typography>
                            <FieldInput type="date" size="small" fullWidth
                              value={editRecord.expiry_date ? editRecord.expiry_date.split("T")[0] : ""}
                              onChange={(e) => setEditRecord({ ...editRecord, expiry_date: e.target.value || null })}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.accent, mb: 0.75, fontFamily: T.poppins }}>Remarks</Typography>
                            <FieldInput size="small" fullWidth multiline rows={2}
                              value={formatCtoRemarksForDisplay(editRecord.remarks || "")}
                              onChange={(e) => {
                                const token = internalCtoLedgerRemarkToken(editRecord.remarks);
                                const v = e.target.value;
                                const next = token ? (v.trim() ? `${token} · ${v.trim()}` : token) : v;
                                setEditRecord({ ...editRecord, remarks: next });
                              }} />
                          </Grid>
                        </Grid>
                      </Box>

                      <Box sx={{ px: 3.5, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#f9f9f9", display: "flex", justifyContent: "flex-end", gap: 1, flexShrink: 0 }}>
                        <AccentButton onClick={() => handleDelete(editRecord.id)} variant="outlined"
                          startIcon={<DeleteIcon sx={{ fontSize: "13px !important" }} />}
                          sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: "#ffcdd2", color: "#c62828", mr: "auto", "&:hover": { bgcolor: "rgba(198,40,40,0.04)", borderColor: "#c62828", transform: "none" } }}>
                          Delete
                        </AccentButton>
                        <AccentButton onClick={() => { setEditRecord(null); setError(""); }} variant="outlined"
                          sx={{ fontSize: "0.8rem", fontFamily: T.poppins, borderColor: T.accentBorder, color: T.muted, "&:hover": { bgcolor: T.accentFaint, borderColor: T.accent, color: T.accent } }}>
                          Cancel
                        </AccentButton>
                        <AccentButton onClick={handleUpdate} variant="contained"
                          startIcon={<SaveIcon sx={{ fontSize: "13px !important" }} />}
                          sx={{ fontSize: "0.8rem", fontFamily: T.poppins, bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, "&:hover": { bgcolor: T.accentDark } }}>
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

export default CompensatoryTimeOff;