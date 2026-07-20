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
import usePayrollPeriodLock from "../../hooks/usePayrollPeriodLock";
import { PAYROLL_LOCK_TOOLTIP } from "../../utils/payrollPeriodLock";
import {
  Typography, TextField, Button, Box, Grid, Chip, Modal, IconButton,
  Select, MenuItem, FormControl, Alert, InputAdornment, Card, Avatar,
  Autocomplete, TablePagination, Tooltip, Fade, CircularProgress,
  ToggleButton, ToggleButtonGroup, Paper,
  Table, TableBody, TableCell, TableHead, TableRow,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  Add as AddIcon,
  Block as BlockIcon,
  Close,
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
  Undo as UndoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import LoadingOverlay from "../LoadingOverlay";
import SuccessfulOverlay from "../SuccessfulOverlay";
import usePageAccess from "../../hooks/usePageAccess";
import AccessDenied from "../AccessDenied";
import { useSocket } from "../../contexts/SocketContext";
import {
  normalizeCtoPeriodKey,
  ctoRecordsForDisplay,
  computeCtoBalances,
  getPriorPeriodCtoCarryForward,
  recomputeCtoLedgerFields,
  isCtoPeriodVoided,
  isCtoCommutedLocked,
  isCtoPeriodSuperseded,
  resolveCtoCurrentDisplayPeriod,
  assertCtoPeriodIsCurrentDisplay,
  buildCtoPeriodSnapshotHistory,
  getCtoPeriodForwardToLabel,
  getCtoDisplayRemainingHours,
  getCtoEmployeeDisplayRemaining,
  getCtoEmployeeLedgerSummary,
  findCtoSaveTarget,
  findLatestCtoForPeriod,
  isPerMonthCtoTracking,
  CTO_UNDO_MAX_PER_PERIOD,
  CTO_LEDGER_ENTRY_LABELS,
  assertCtoPeriodAssignableForCredits,
} from "./ctoBalanceUtils";

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

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const getStatusColor = (rem, total) => {
  if (!total) return "#9e9e9e";
  const p = (rem / total) * 100;
  return p > 50 ? "#2e7d32" : p > 20 ? "#ed6c02" : "#d32f2f";
};
const isExpired = (d) => d ? new Date(d) < new Date() : false;

const MONTHS = [
  { value: "",   label: "No specific month" },
  { value: "1",  label: "January"   }, { value: "2",  label: "February"  },
  { value: "3",  label: "March"     }, { value: "4",  label: "April"     },
  { value: "5",  label: "May"       }, { value: "6",  label: "June"      },
  { value: "7",  label: "July"      }, { value: "8",  label: "August"    },
  { value: "9",  label: "September" }, { value: "10", label: "October"   },
  { value: "11", label: "November"  }, { value: "12", label: "December"  },
];
const monthName = (m) => MONTHS.find((x) => x.value === String(m))?.label || `Month ${m}`;
const periodLabel = (year, month) => {
  if (!year) return "Unknown";
  if (!month) return String(year);
  return `${year} · ${monthName(month)}`;
};

const AccentButton = styled(Button)({
  borderRadius: 8, textTransform: "none", fontWeight: 600,
  fontSize: "0.875rem", letterSpacing: "0.01em", transition: "all 0.18s ease",
  "&:hover":  { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
@keyframes ctoFadeIn {
  from { opacity:0; transform:translateY(5px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes ctoShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position:  800px 0; }
}
@keyframes ctoPulse {
  0%,100% { opacity:1; }
  50%     { opacity:0.55; }
}
`;

const CURRENT = {
  main:   "#2e7d32",
  dark:   "#1b5e20",
  faint:  "rgba(46,125,50,0.08)",
  border: "rgba(46,125,50,0.25)",
};

const COMMUTED_ROW = {
  bg:     "rgba(109,35,35,0.07)",
  bgAlt:  "rgba(109,35,35,0.04)",
  border: "rgba(109,35,35,0.28)",
  stripe: "repeating-linear-gradient(-45deg, rgba(109,35,35,0.03) 0px, rgba(109,35,35,0.03) 4px, transparent 4px, transparent 10px)",
};

const FORWARDED_ROW = {
  bg:     "rgba(95,99,104,0.05)",
  bgAlt:  "rgba(95,99,104,0.07)",
  border: "rgba(95,99,104,0.2)",
  stripe: "repeating-linear-gradient(-45deg, rgba(95,99,104,0.04) 0px, rgba(95,99,104,0.04) 4px, transparent 4px, transparent 10px)",
};

const VOIDED_ROW = {
  bg:     "rgba(95,99,104,0.06)",
  bgAlt:  "rgba(95,99,104,0.09)",
  border: "rgba(95,99,104,0.22)",
};

const CTO_BALANCE_LABELS = {
  previousBalance: { label: "Previous Balance", subtitle: "Carried forward" },
  ctoEarned:       { label: "CTO Credits Earned", subtitle: "OT entered on CTO" },
  totalCto:        { label: "Total CTO Credits", subtitle: "Previous + Earned" },
  ctoUsed:         { label: "CTO Credits Used", subtitle: "Deductions applied" },
  postDed:         { label: "Post-Deduction", subtitle: "Total − Used (+ approved earnings)" },
  remaining:       { label: "Remaining Balance", subtitle: "Post-Deduction + approved earnings" },
};

const COMMUTATION_COPY = {
  action: "Commute",
  status: "Commuted",
  statusTooltip: "This balance has been recorded for commutation.",
  modalTitle: "CTO Commutation",
  modalSubtitle: "For in-service use or retirement benefit",
  amountLabel: "Balance for commutation",
  purpose:
    "Commutation is not an immediate cash payout. Unused CTO credits are recorded so they can be used while the employee still has rendered hours, or applied upon retirement — with payment based on the employee's salary grade.",
  carryOverNote: (amt) =>
    `Opening balance of ${amt} carries from the prior period's remaining balance.`,
  irreversible:
    "This action is irreversible. The period will be locked and a commutation record will be created for HR processing.",
  locked: "Locked — balance recorded for commutation",
  confirm: "Confirm commutation",
  confirming: "Recording…",
};

const CTO_BALANCE_COLUMNS = [
  { key: "period",    label: "Period",                         align: "left",  width: "14%" },
  { key: "previous",  ...CTO_BALANCE_LABELS.previousBalance, align: "right", width: "11%", groupPos: "start" },
  { key: "earned",    ...CTO_BALANCE_LABELS.ctoEarned,        align: "right", width: "11%", groupPos: "mid" },
  { key: "total",     ...CTO_BALANCE_LABELS.totalCto,        align: "right", width: "11%", groupPos: "end" },
  { key: "used",      ...CTO_BALANCE_LABELS.ctoUsed,          align: "right", width: "11%", groupPos: "start" },
  { key: "postDed",   ...CTO_BALANCE_LABELS.postDed,          align: "right", width: "12%", groupPos: "mid" },
  { key: "remaining", ...CTO_BALANCE_LABELS.remaining,       align: "right", width: "12%", groupPos: "end" },
  { key: "actions",   label: "",                               align: "right", width: "10%" },
];

const BALANCE_ROW_MIN_H = 56;

const fmtCtoPeriodVal = (h, unit) => (unit === "hours" ? `${toNum(h).toFixed(3)} h` : `${(toNum(h) / 8).toFixed(3)} d`);
const fmtCtoPeriodAlt = (h, unit) => (unit === "hours" ? `${(toNum(h) / 8).toFixed(3)} d` : `${toNum(h).toFixed(3)} h`);

const getCtoColumnGroupSx = (groupPos, { isHeader = false, isCurrent = false } = {}) => {
  if (!groupPos) return {};
  const edge = isHeader
    ? "rgba(255,255,255,0.45)"
    : isCurrent
      ? alpha(CURRENT.main, 0.35)
      : alpha(T.accent, 0.2);
  const border = `1px solid ${edge}`;
  const sx = {};
  if (groupPos === "start") sx.borderLeft = border;
  if (groupPos === "end") sx.borderRight = border;
  if (isHeader) sx.borderTop = `1px solid rgba(255,255,255,0.35)`;
  else if (!isCurrent && groupPos === "start") sx.bgcolor = alpha(T.accent, 0.025);
  return sx;
};

const ctoDataCellSx = (locked, voided, isActiveHighlight, groupPos) => ({
  py: 0, px: 0, verticalAlign: "middle",
  borderBottom: `1px solid ${locked ? COMMUTED_ROW.border : voided ? VOIDED_ROW.border : T.divider}`,
  bgcolor: locked ? COMMUTED_ROW.bgAlt : voided ? VOIDED_ROW.bgAlt : isActiveHighlight ? CURRENT.faint : "inherit",
  ...getCtoColumnGroupSx(groupPos, { isCurrent: isActiveHighlight }),
  ...(isActiveHighlight && groupPos ? { bgcolor: alpha(CURRENT.main, 0.05) } : {}),
});

const CtoBalanceRowPlain = ({ children, align = "right", compact = false }) => (
  <Box sx={{
    minHeight: BALANCE_ROW_MIN_H, display: "flex", flexDirection: "column",
    alignItems: align === "right" ? "flex-end" : "flex-start",
    justifyContent: "center", px: 1.5, py: compact ? 0.85 : 1.1, gap: compact ? 0.15 : 0,
  }}>
    {children}
  </Box>
);

const CtoPeriodAmtDisplay = ({ hours, unit, strong = false, muted = false, voided = false, locked = false }) => (
  <>
    <Typography sx={{
      fontSize: "0.8rem", fontWeight: strong && !locked ? 700 : 500,
      color: locked || voided ? T.faint : strong ? CURRENT.main : muted ? T.muted : T.text,
      fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums",
      textDecoration: voided ? "line-through" : "none",
      ...(locked ? { fontStyle: "italic" } : {}),
    }}>
      {fmtCtoPeriodVal(hours, unit)}
    </Typography>
    <Typography sx={{
      fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums",
      textDecoration: voided ? "line-through" : "none",
    }}>
      {fmtCtoPeriodAlt(hours, unit)}
    </Typography>
  </>
);

const CtoBalanceHeaderCell = ({ label, subtitle, align, width, groupPos }) => (
  <TableCell align={align} sx={{
    py: 1, px: 1.5, bgcolor: `${T.accent} !important`, color: "#fff !important",
    borderBottom: `1px solid ${T.accentDark}`, fontFamily: T.poppins, verticalAlign: "bottom", width,
    ...getCtoColumnGroupSx(groupPos, { isHeader: true }),
  }}>
    {label && (
      <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.3 }}>
        {label}
      </Typography>
    )}
    {subtitle && (
      <Typography sx={{ fontSize: "0.52rem", fontWeight: 500, color: "rgba(255,255,255,0.82)", lineHeight: 1.35, mt: label ? 0.2 : 0, textTransform: "none", letterSpacing: 0 }}>
        {subtitle}
      </Typography>
    )}
  </TableCell>
);

const CtoPeriodAmtCell = ({ hours, unit, strong = false, highlight = false, muted = false, voided = false, locked = false, groupPos }) => {
  const isActiveHighlight = highlight && !voided && !locked;
  return (
    <TableCell align="right" sx={ctoDataCellSx(locked, voided, isActiveHighlight, groupPos)}>
      <CtoBalanceRowPlain>
        <CtoPeriodAmtDisplay hours={hours} unit={unit} strong={strong} muted={muted} voided={voided} locked={locked} />
      </CtoBalanceRowPlain>
    </TableCell>
  );
};

const fmtCtoEarnedCreditsNote = (hours, unit) => {
  const h = toNum(hours);
  if (h <= 0) return null;
  return `+ ${fmtCtoPeriodVal(h, unit)} earned`;
};

const CtoPostDedCell = ({ hours, unit, highlight, voided, locked, earnedBalance }) => {
  const isActiveHighlight = highlight && !voided && !locked;
  const hasEarned = toNum(earnedBalance) > 0;
  return (
    <TableCell align="right" sx={ctoDataCellSx(locked, voided, isActiveHighlight, "mid")}>
      <CtoBalanceRowPlain compact={hasEarned}>
        <CtoPeriodAmtDisplay hours={hours} unit={unit} muted voided={voided} locked={locked} />
        {hasEarned && (
          <Typography sx={{ fontSize: "0.58rem", color: "#2e7d32", fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
            {fmtCtoEarnedCreditsNote(earnedBalance, unit)}
          </Typography>
        )}
      </CtoBalanceRowPlain>
    </TableCell>
  );
};

const CtoRemainingCell = ({ hours, unit, highlight, voided, locked, forwarded, forwardToLabel, groupPos, totalCto = 0 }) => {
  if (locked) {
    return (
      <TableCell align="right" sx={ctoDataCellSx(true, false, false, groupPos)}>
        <CtoBalanceRowPlain compact>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
            {fmtCtoPeriodVal(hours, unit)}
          </Typography>
          <Typography sx={{ fontSize: "0.62rem", color: T.muted, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
            {fmtCtoPeriodAlt(hours, unit)}
          </Typography>
          <Typography sx={{ fontSize: "0.58rem", color: T.accentMid, fontFamily: T.poppins, fontWeight: 600 }}>Commuted</Typography>
        </CtoBalanceRowPlain>
      </TableCell>
    );
  }
  if (forwarded) {
    return (
      <TableCell align="right" sx={{ ...ctoDataCellSx(false, false, false, groupPos), bgcolor: FORWARDED_ROW.bgAlt, borderBottom: `1px solid ${FORWARDED_ROW.border}` }}>
        <CtoBalanceRowPlain compact>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
            {fmtCtoPeriodVal(hours, unit)}
          </Typography>
          <Typography sx={{ fontSize: "0.58rem", color: "#5f6368", fontFamily: T.poppins, fontWeight: 600, lineHeight: 1.25 }}>
            {forwardToLabel ? `Forwarded to ${forwardToLabel}` : "Forwarded"}
          </Typography>
        </CtoBalanceRowPlain>
      </TableCell>
    );
  }
  if (voided) {
    return (
      <TableCell align="right" sx={ctoDataCellSx(false, true, false, groupPos)}>
        <CtoBalanceRowPlain compact>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.faint, fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums", textDecoration: "line-through" }}>
            {fmtCtoPeriodVal(hours, unit)}
          </Typography>
          <Typography sx={{ fontSize: "0.58rem", color: "#5f6368", fontFamily: T.poppins, fontWeight: 600 }}>Voided</Typography>
        </CtoBalanceRowPlain>
      </TableCell>
    );
  }
  const isActiveHighlight = highlight && !voided;
  const sc = getStatusColor(hours, totalCto);
  return (
    <TableCell align="right" sx={ctoDataCellSx(false, false, isActiveHighlight, groupPos)}>
      <CtoBalanceRowPlain>
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: sc, fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
          {fmtCtoPeriodVal(hours, unit)}
        </Typography>
        <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
          {fmtCtoPeriodAlt(hours, unit)}
        </Typography>
      </CtoBalanceRowPlain>
    </TableCell>
  );
};

const CtoPeriodSectionRow = ({ label, variant = "section", colSpan = 8 }) => (
  <TableRow>
    <TableCell colSpan={colSpan} sx={{
      py: variant === "divider" ? 1 : 0.65, px: 1.5,
      bgcolor: variant === "divider" ? "#eef0f3" : variant === "year" ? "#fafbfc" : variant === "current" ? "rgba(46,125,50,0.08)" : alpha(T.accent, 0.06),
      borderBottom: `1px solid ${variant === "divider" ? "rgba(0,0,0,0.12)" : variant === "current" ? CURRENT.border : T.divider}`,
      borderTop: variant === "divider" ? "2px solid rgba(0,0,0,0.08)" : "none",
    }}>
      <Typography sx={{
        fontSize: variant === "year" ? "0.72rem" : "0.62rem", fontWeight: 600,
        color: variant === "current" ? CURRENT.dark : variant === "year" ? T.text : T.muted,
        textTransform: "uppercase", letterSpacing: variant === "year" ? "0.04em" : "0.08em", fontFamily: T.poppins,
      }}>
        {label}
      </Typography>
    </TableCell>
  </TableRow>
);

const formatCtoVoidedAt = (voidedAt) => {
  if (!voidedAt) return "";
  const d = new Date(voidedAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatCtoSnapshotDate = (dt) => {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
};

const CtoCommutationWarningModal = ({
  open, onClose, onConfirm, period, unit = "days", earningsList = [], loading = false,
}) => {
  if (!period) return null;
  const fmt = (h) => (unit === "hours" ? fmtCtoPeriodVal(h, "hours") : fmtCtoPeriodVal(h, "days"));
  const fmtAlt = (h) => (unit === "hours" ? fmtCtoPeriodAlt(h, "hours") : fmtCtoPeriodAlt(h, "days"));
  const flow = computeCtoBalances(period, { earningsList });
  const remHrs = flow.remainingBalance;
  const periodName = periodLabel(period.period_year, period.period_month);
  const flowRows = [
    { label: CTO_BALANCE_LABELS.previousBalance.label, value: flow.previousBalance },
    { label: CTO_BALANCE_LABELS.ctoEarned.label, value: flow.ctoCreditsEarned },
    { label: CTO_BALANCE_LABELS.totalCto.label, value: flow.totalCtoCredits },
    { label: CTO_BALANCE_LABELS.ctoUsed.label, value: flow.usedHrs },
    { label: CTO_BALANCE_LABELS.postDed.label, value: flow.totalHours },
    { label: CTO_BALANCE_LABELS.remaining.label, value: remHrs, accent: true },
  ];

  return (
    <Modal open={open} onClose={!loading ? onClose : undefined} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, zIndex: 1400 }}>
      <Fade in={open}>
        <Paper elevation={0} sx={{
          width: "100%", maxWidth: 520, display: "flex", flexDirection: "column",
          borderRadius: "10px", overflow: "hidden", fontFamily: T.poppins,
          border: "1px solid rgba(0,0,0,0.1)", boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
        }}>
          <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid ${T.divider}`, bgcolor: "#fafbfc" }}>
            <Box sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CommutationIcon sx={{ fontSize: 18, color: T.accent }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: T.text, fontFamily: T.poppins }}>{COMMUTATION_COPY.modalTitle}</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>
                {COMMUTATION_COPY.modalSubtitle} · CTO · {periodName}
              </Typography>
            </Box>
            <IconButton onClick={onClose} disabled={loading} size="small"><Close sx={{ fontSize: 16 }} /></IconButton>
          </Box>
          <Box sx={{ px: 3, py: 2.5 }}>
            <Box sx={{ mb: 2.5, p: 2, borderRadius: "8px", border: `1px solid ${T.accentBorder}`, bgcolor: T.accentFaint }}>
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>{COMMUTATION_COPY.amountLabel}</Typography>
              <Typography sx={{ fontWeight: 700, color: T.accent, fontSize: "1.75rem", fontFamily: T.poppins }}>{fmt(remHrs)}</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins, mt: 0.35 }}>{fmtAlt(remHrs)}</Typography>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75, mb: 2 }}>
              {flowRows.map(({ label, value, accent }) => (
                <Box key={label} sx={{ p: 1, borderRadius: "6px", textAlign: "center", bgcolor: "#fafbfc", border: `1px solid ${T.divider}` }}>
                  <Typography sx={{ fontSize: "0.52rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", mb: 0.35, lineHeight: 1.2 }}>{label}</Typography>
                  <Typography sx={{ fontWeight: accent ? 700 : 600, color: accent ? T.accent : T.text, fontSize: "0.72rem", fontFamily: T.poppins }}>{fmt(value)}</Typography>
                </Box>
              ))}
            </Box>
            <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins, mb: 1 }}>{COMMUTATION_COPY.purpose}</Typography>
            {flow.previousBalance > 0 && (
              <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins, mb: 1 }}>
                {COMMUTATION_COPY.carryOverNote(fmt(flow.previousBalance))}
              </Typography>
            )}
            <Typography sx={{ fontSize: "0.68rem", color: "#c62828", fontFamily: T.poppins }}>{COMMUTATION_COPY.irreversible}</Typography>
          </Box>
          <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${T.divider}`, bgcolor: "#fafbfc", display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={onClose} disabled={loading} sx={{ textTransform: "none", fontFamily: T.poppins }}>Cancel</Button>
            <AccentButton onClick={onConfirm} disabled={loading || remHrs <= 0} variant="contained"
              startIcon={loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <CommutationIcon sx={{ fontSize: 16 }} />}
              sx={{ textTransform: "none", fontFamily: T.poppins }}>
              {loading ? COMMUTATION_COPY.confirming : COMMUTATION_COPY.confirm}
            </AccentButton>
          </Box>
        </Paper>
      </Fade>
    </Modal>
  );
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

const VoidedStatusChip = ({ size = "sm" }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", px: size === "sm" ? 0.65 : 0.85, py: size === "sm" ? 0.12 : 0.2, borderRadius: "4px", border: "1px dashed rgba(95,99,104,0.4)", bgcolor: "rgba(95,99,104,0.08)" }}>
    <Typography sx={{ fontSize: size === "sm" ? "0.58rem" : "0.68rem", fontWeight: 600, color: "#5f6368", fontFamily: T.poppins }}>Voided</Typography>
  </Box>
);

const CommutedStatusChip = ({ size = "sm" }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", px: size === "sm" ? 0.65 : 0.85, py: size === "sm" ? 0.12 : 0.2, borderRadius: "4px", border: `1px dashed ${alpha(T.accent, 0.45)}`, bgcolor: alpha(T.accent, 0.05) }}>
    <Typography sx={{ fontSize: size === "sm" ? "0.58rem" : "0.68rem", fontWeight: 600, color: T.accentMid, fontFamily: T.poppins }}>{COMMUTATION_COPY.status}</Typography>
  </Box>
);

const ForwardedStatusChip = ({ forwardToLabel, size = "sm" }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", px: size === "sm" ? 0.65 : 0.85, py: size === "sm" ? 0.12 : 0.2, borderRadius: "4px", border: "1px dashed rgba(95,99,104,0.35)", bgcolor: "rgba(95,99,104,0.06)", maxWidth: "100%" }}>
    <Typography noWrap sx={{ fontSize: size === "sm" ? "0.58rem" : "0.68rem", fontWeight: 600, color: "#5f6368", fontFamily: T.poppins }}>
      {forwardToLabel ? `Forwarded · ${forwardToLabel}` : "Forwarded"}
    </Typography>
  </Box>
);

const CtoPeriodHistoryPanel = ({
  history, unit, loading, isCurrentPeriod = false, periodRecord = null,
  isPeriodVoided = false, isPeriodLocked = false, onUndoSnapshot = null,
  undoLoadingId = null, voidLoadingId = null, commuteLoadingId = null,
}) => {
  const [previousRecordsOpen, setPreviousRecordsOpen] = useState(false);
  useEffect(() => { setPreviousRecordsOpen(false); }, [history?.period_year, history?.period_month, history?.employeeNumber]);

  if (loading) {
    return (
      <Box sx={{ py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={14} sx={{ color: T.faint }} />
        <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins }}>Loading period details…</Typography>
      </Box>
    );
  }
  if (!history) {
    return <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins, py: 1 }}>Could not load period details.</Typography>;
  }

  const snapshots = Array.isArray(history.snapshots) ? history.snapshots : [];
  const currentLines = Array.isArray(history.ledger_lines_active) && history.ledger_lines_active.length
    ? history.ledger_lines_active
    : (Array.isArray(history.ledger_lines) ? history.ledger_lines : snapshots.filter((s) => !s.is_voided));
  const previousLines = Array.isArray(history.ledger_lines_voided) ? history.ledger_lines_voided : snapshots.filter((s) => s.is_voided);
  const undoRemaining = history.undo_clicks_remaining ?? CTO_UNDO_MAX_PER_PERIOD;
  const activeSnapshotCount = history.active_snapshot_count ?? 0;
  const periodCanUndo = isCurrentPeriod && !isPeriodVoided && !isPeriodLocked && history.can_undo && undoRemaining > 0 && activeSnapshotCount > 1;
  const showUndoColumn = isCurrentPeriod && !isPeriodVoided && !isPeriodLocked;

  const undoTooltip = (snap) => {
    if (!isCurrentPeriod) return "Undo is only available while this period is still the current month";
    if (isPeriodVoided || isPeriodLocked) return "Period is voided or commuted";
    if (snap.is_voided) return "Entry already voided";
    if (!snap.is_active) return "Only the latest active entry can be undone";
    if (undoRemaining <= 0) return `Undo limit reached (${CTO_UNDO_MAX_PER_PERIOD} per period)`;
    if (activeSnapshotCount <= 1) return "Cannot undo the first entry";
    return `Remove this OT entry (${undoRemaining} of ${CTO_UNDO_MAX_PER_PERIOD} undos remaining)`;
  };

  const fmtLedgerAmt = (hours, unit, { prefix = "", voided = false } = {}) => {
    if (hours == null || !Number.isFinite(toNum(hours))) return "—";
    return (
      <Typography component="span" sx={{ fontSize: "0.68rem", fontWeight: 600, color: voided ? T.faint : T.text, textDecoration: voided ? "line-through" : "none", fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
        {prefix}{fmtCtoPeriodVal(hours, unit)}
      </Typography>
    );
  };

  const renderLedgerTable = (lines, { showUndo = false, voidedSection = false } = {}) => {
    if (!lines.length) return null;
    const headers = ["#", "Date", "Event", CTO_BALANCE_LABELS.previousBalance.label, CTO_BALANCE_LABELS.ctoEarned.label, CTO_BALANCE_LABELS.totalCto.label, CTO_BALANCE_LABELS.ctoUsed.label, CTO_BALANCE_LABELS.postDed.label, CTO_BALANCE_LABELS.remaining.label, "Status", ...(showUndo ? ["Undo"] : [])];
    return (
      <Box sx={{ overflowX: "auto", mb: voidedSection ? 0 : 1.5 }}>
        <Table size="small" sx={{ minWidth: 920, "& .MuiTableCell-root": { py: 0.45, px: 0.6, fontSize: "0.65rem", fontFamily: T.poppins, borderColor: T.divider } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: voidedSection ? VOIDED_ROW.bg : "#f5f6f8" }}>
              {headers.map((h) => <TableCell key={h} sx={{ fontWeight: 700, color: T.muted, whiteSpace: "nowrap", fontSize: "0.62rem" }}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, idx) => {
              const isEarning = line.line_type === "earning";
              const rowCanUndo = !isEarning && periodCanUndo && line.is_active && !line.is_voided && line.can_undo;
              const isUndoLoading = undoLoadingId === line.id;
              const voided = voidedSection || !!line.is_voided;
              const eventLabel = CTO_LEDGER_ENTRY_LABELS[line.entry_kind] || line.entry_kind || "Entry";
              return (
                <TableRow key={`${voidedSection ? "prev" : "cur"}-${line.id}`} sx={{ opacity: voided ? 0.8 : 1, bgcolor: line.is_active && !voidedSection ? "rgba(46,125,50,0.06)" : voided ? VOIDED_ROW.bgAlt : "inherit" }}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{voided && line.voided_at ? formatCtoVoidedAt(line.voided_at) : formatCtoSnapshotDate(line.created_at)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{eventLabel}</TableCell>
                  {isEarning ? (
                    <>
                      <TableCell sx={{ color: T.faint }}>—</TableCell><TableCell sx={{ color: T.faint }}>—</TableCell><TableCell sx={{ color: T.faint }}>—</TableCell><TableCell sx={{ color: T.faint }}>—</TableCell>
                      <TableCell>{fmtLedgerAmt(line.earnings_delta ?? line.approved_earnings_delta, unit, { prefix: line.earnings_delta_prefix || "+", voided })}</TableCell>
                      <TableCell>{fmtLedgerAmt(line.remaining_balance, unit, { voided })}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{fmtLedgerAmt(line.previous_balance, unit, { voided })}</TableCell>
                      <TableCell>{line.entry_kind === "ot_add" && toNum(line.cto_delta) > 0 ? fmtLedgerAmt(line.cto_delta, unit, { prefix: "+", voided }) : fmtLedgerAmt(line.cto_credits_earned, unit, { voided })}</TableCell>
                      <TableCell>{fmtLedgerAmt(line.total_cto_credits, unit, { voided })}</TableCell>
                      <TableCell>{line.entry_kind === "deduction" && toNum(line.used_delta) > 0 ? fmtLedgerAmt(line.used_delta, unit, { prefix: "−", voided }) : fmtLedgerAmt(line.used_hours, unit, { voided })}</TableCell>
                      <TableCell>{fmtLedgerAmt(line.post_deduction, unit, { voided })}</TableCell>
                      <TableCell sx={{ color: T.faint }}>—</TableCell>
                    </>
                  )}
                  <TableCell>
                    {voided ? <Chip label="Voided" size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: VOIDED_ROW.bg, color: T.faint, fontFamily: T.poppins }} />
                      : line.is_active ? <Chip label="Active" size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: CURRENT.faint, color: CURRENT.dark, fontFamily: T.poppins }} />
                      : isEarning ? <Chip label={line.earn_status || "approved"} size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: "rgba(46,125,50,0.1)", color: CURRENT.dark, fontFamily: T.poppins }} />
                      : <Chip label="Superseded" size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: "#eee", color: T.faint, fontFamily: T.poppins }} />}
                  </TableCell>
                  {showUndo && (
                    <TableCell align="center">
                      {rowCanUndo && onUndoSnapshot && periodRecord ? (
                        <Tooltip title={undoTooltip(line)} placement="top">
                          <span>
                            <IconButton size="small" disabled={isUndoLoading || !!voidLoadingId || !!commuteLoadingId}
                              onClick={() => onUndoSnapshot(periodRecord, line)}
                              sx={{ p: 0.5, color: T.text, border: `1px solid ${T.divider}`, borderRadius: "6px" }}>
                              {isUndoLoading ? <CircularProgress size={14} sx={{ color: T.muted }} /> : <UndoIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    );
  };

  return (
    <Box sx={{ py: 1, px: 0.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.75, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.poppins }}>
          Period transaction record ({currentLines.length})
        </Typography>
        {showUndoColumn && periodCanUndo && (
          <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>
            {undoRemaining} of {CTO_UNDO_MAX_PER_PERIOD} undos remaining (OT only)
          </Typography>
        )}
      </Box>
      {currentLines.length === 0
        ? <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins, mb: 1.5 }}>No current ledger entries for this period.</Typography>
        : renderLedgerTable(currentLines, { showUndo: showUndoColumn })}
      {previousLines.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.poppins }}>
              Previous records ({previousLines.length})
            </Typography>
            <IconButton size="small" onClick={() => setPreviousRecordsOpen((o) => !o)} sx={{ p: 0.4, color: T.muted, border: `1px solid ${T.divider}`, borderRadius: "6px" }}>
              {previousRecordsOpen ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <HistoryIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Box>
          {previousRecordsOpen && renderLedgerTable(previousLines, { voidedSection: true })}
        </Box>
      )}
    </Box>
  );
};

const CtoPeriodTableRow = ({
  record, unit, isCurrent, rowIndex, onCommute, onVoidPeriod, onUndoEntry, commuteLoadingId, earningsList, voidLoadingId, undoLoadingId, chainRecords = [],
  expanded = false, onToggleExpand, periodHistory = null, historyLoading = false, payrollLocked = false,
}) => {
  const flow = computeCtoBalances(record, { earningsList, chainRecords });
  const isVoided = flow.isVoided;
  const isCommuted = isCtoCommutedLocked(record);
  const isForwarded = isCtoPeriodSuperseded(record, chainRecords) && !isCommuted;
  const forwardToLabel = isForwarded ? getCtoPeriodForwardToLabel(record, chainRecords) : null;
  const isActionLocked = isCommuted || isForwarded;
  const rowStyle = isCommuted ? COMMUTED_ROW : isForwarded ? FORWARDED_ROW : null;
  const remH = flow.remainingBalance;
  const closingDisplayHrs = isCommuted ? flow.commutedHrs : isForwarded ? Math.max(0, flow.totalHours + flow.earnedBalance) : remH;
  let catSnap = null;
  try { catSnap = record.emp_category_snapshot ? JSON.parse(record.emp_category_snapshot) : null; } catch {}
  const periodRemarks = formatCtoPeriodRowRemarks(record.remarks);
  const expired = isExpired(record.expiry_date);

  return (
    <>
      <TableRow sx={{
        bgcolor: rowStyle ? rowStyle.bg : isVoided ? VOIDED_ROW.bg : isCurrent ? "rgba(46,125,50,0.12)" : rowIndex % 2 === 1 ? "#fafbfc" : "#fff",
        backgroundImage: rowStyle?.stripe || "none",
        outline: rowStyle ? `1px solid ${rowStyle.border}` : isCurrent && !isVoided ? `1px solid ${CURRENT.border}` : "none",
        outlineOffset: -1, opacity: isVoided ? 0.9 : 1,
      }}>
        <TableCell sx={{ py: 0, px: 0, verticalAlign: "middle", borderBottom: `1px solid ${rowStyle ? rowStyle.border : isVoided ? VOIDED_ROW.border : T.divider}`, borderLeft: rowStyle ? `3px solid ${isCommuted ? T.accent : "#9e9e9e"}` : isCurrent && !isVoided ? `3px solid ${CURRENT.main}` : "3px solid transparent", bgcolor: rowStyle ? rowStyle.bgAlt : isVoided ? VOIDED_ROW.bgAlt : "inherit" }}>
          <CtoBalanceRowPlain align="left">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
              {onToggleExpand && (
                <IconButton size="small" onClick={() => onToggleExpand(record)} sx={{ p: 0.25, color: T.muted }}>
                  {expanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              )}
              <Typography sx={{ fontSize: "0.82rem", fontWeight: isCurrent && !isVoided && !isActionLocked ? 600 : 500, color: isVoided ? T.faint : isActionLocked ? T.muted : isCurrent ? CURRENT.dark : T.text, fontFamily: T.poppins, textDecoration: isVoided ? "line-through" : "none" }}>
                {periodLabel(record.period_year, record.period_month)}
              </Typography>
              {catSnap?.is40hrs && <Chip label="40hr" size="small" sx={{ height: 16, fontSize: "0.55rem", fontWeight: 700, bgcolor: "rgba(46,125,50,0.08)", color: "#2e7d32", fontFamily: T.poppins }} />}
              {catSnap?.isDesignated && <Chip label="Designated" size="small" sx={{ height: 16, fontSize: "0.55rem", fontWeight: 700, bgcolor: T.accentFaint, color: T.accent, fontFamily: T.poppins }} />}
              {expired && <Chip label="Expired" size="small" sx={{ height: 16, fontSize: "0.55rem", fontWeight: 700, bgcolor: "rgba(211,47,47,0.08)", color: "#d32f2f" }} />}
              {record.expiry_date && !expired && <ExpiryBadge expiryDate={record.expiry_date} />}
            </Box>
            {!isVoided && !isActionLocked && periodRemarks && (
              <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, mt: 0.3 }} noWrap title={periodRemarks}>{periodRemarks}</Typography>
            )}
          </CtoBalanceRowPlain>
        </TableCell>
        <CtoPeriodAmtCell hours={flow.previousBalance} unit={unit} highlight={isCurrent} muted={!isCurrent && flow.previousBalance === 0} voided={isVoided} locked={isActionLocked} groupPos="start" />
        <CtoPeriodAmtCell hours={flow.ctoCreditsEarned} unit={unit} highlight={isCurrent} voided={isVoided} locked={isActionLocked} groupPos="mid" />
        <CtoPeriodAmtCell hours={flow.totalCtoCredits} unit={unit} highlight={isCurrent} strong={isCurrent && !isActionLocked && !isVoided} voided={isVoided} locked={isActionLocked} groupPos="end" />
        <CtoPeriodAmtCell hours={flow.usedHrs} unit={unit} highlight={isCurrent} voided={isVoided} locked={isActionLocked} groupPos="start" />
        <CtoPostDedCell hours={flow.totalHours} unit={unit} highlight={isCurrent} voided={isVoided} locked={isActionLocked} earnedBalance={flow.earnedBalance} />
        <CtoRemainingCell hours={closingDisplayHrs} unit={unit} highlight={isCurrent} voided={isVoided} locked={isCommuted} forwarded={isForwarded} forwardToLabel={forwardToLabel} groupPos="end" totalCto={flow.totalCtoCredits} />
        <TableCell align="right" sx={{ py: 0, px: 0, verticalAlign: "middle", borderBottom: `1px solid ${rowStyle ? rowStyle.border : isVoided ? VOIDED_ROW.border : T.divider}`, bgcolor: rowStyle ? rowStyle.bgAlt : isVoided ? VOIDED_ROW.bgAlt : isCurrent ? CURRENT.faint : "inherit" }}>
          <CtoBalanceRowPlain>
            {isCurrent && !isVoided && !isActionLocked && (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 0.5, width: "100%", minWidth: 96 }}>
                {onVoidPeriod && (
                  <Tooltip title={payrollLocked ? PAYROLL_LOCK_TOOLTIP : "Void current period (ledger + earnings)"}>
                    <span>
                      <Button size="small" variant="outlined" disabled={voidLoadingId === record.id || payrollLocked}
                        onClick={() => onVoidPeriod(record)}
                        startIcon={voidLoadingId === record.id ? <CircularProgress size={12} sx={{ color: "#c62828" }} /> : <BlockIcon sx={{ fontSize: "14px !important" }} />}
                        sx={{ textTransform: "none", fontSize: "0.72rem", fontWeight: 600, fontFamily: T.poppins, py: 0.4, px: 1.5, minWidth: 96, width: "100%", borderColor: payrollLocked ? "rgba(21,101,192,0.35)" : "#c62828", color: payrollLocked ? "#1565c0" : "#c62828" }}>
                        {voidLoadingId === record.id ? "…" : payrollLocked ? "In payroll" : "Void"}
                      </Button>
                    </span>
                  </Tooltip>
                )}
                {remH > 0 && onCommute && (
                  <Tooltip title={payrollLocked ? PAYROLL_LOCK_TOOLTIP : COMMUTATION_COPY.purpose}>
                    <span>
                      <Button size="small" variant="contained" disabled={!!commuteLoadingId || payrollLocked}
                        onClick={() => onCommute(record)}
                        startIcon={commuteLoadingId === record.id ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <CommutationIcon sx={{ fontSize: "14px !important" }} />}
                        sx={{ textTransform: "none", fontSize: "0.72rem", fontWeight: 600, fontFamily: T.poppins, py: 0.4, px: 1.5, minWidth: 96, width: "100%", bgcolor: T.accent, color: "#fff" }}>
                        {commuteLoadingId === record.id ? "…" : payrollLocked ? "In payroll" : COMMUTATION_COPY.action}
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Box>
            )}
            {isVoided && <VoidedStatusChip size="sm" />}
            {isCommuted && !isVoided && <CommutedStatusChip size="sm" />}
            {isForwarded && !isVoided && <ForwardedStatusChip forwardToLabel={forwardToLabel} size="sm" />}
          </CtoBalanceRowPlain>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={CTO_BALANCE_COLUMNS.length} sx={{ py: 0, px: 2, bgcolor: "#fafbfc", borderBottom: `1px solid ${T.divider}` }}>
            <CtoPeriodHistoryPanel history={periodHistory} unit={unit} loading={historyLoading} isCurrentPeriod={isCurrent}
              periodRecord={record} isPeriodVoided={isVoided} isPeriodLocked={isActionLocked}
              onUndoSnapshot={onUndoEntry} undoLoadingId={undoLoadingId} voidLoadingId={voidLoadingId} commuteLoadingId={commuteLoadingId} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const groupCtoPreviousPeriodsByYear = (previousPeriods) => {
  const items = [];
  let lastYear = null;
  previousPeriods.forEach((period) => {
    const year = parseInt(period.period_year, 10) || 0;
    if (year !== lastYear) { items.push({ kind: "year", year }); lastYear = year; }
    items.push({ kind: "period", period });
  });
  return items;
};

const EmployeeCTOModal = ({
  open, onClose, employeeCTO, unit, setUnit, deptMap, empCatLabelMap, actionSuccess, error,
  commuteLoadingId, voidLoadingId, undoLoadingId, onCommute, onVoidPeriod, onUndoEntry,
  onTogglePeriodExpand, periodHistoryCache = {}, historyLoadingKeys = {}, expandedPeriodKeys = {},
  earningsList = [], isPeriodLockedForPayroll = null,
}) => {
  if (!employeeCTO) return null;
  const deptCode = deptMap[employeeCTO.employeeNumber] || null;
  const empCat = empCatLabelMap[employeeCTO.employeeNumber] || null;
  const modalRecords = employeeCTO.displayRecords || ctoRecordsForDisplay(employeeCTO.records);
  const sortedRecords = [...modalRecords].sort((a, b) => {
    if (b.period_year !== a.period_year) return b.period_year - a.period_year;
    return (toNum(b.period_month) || 0) - (toNum(a.period_month) || 0);
  });
  const currentPeriod = resolveCtoCurrentDisplayPeriod(sortedRecords);
  const currentKey = currentPeriod ? normalizeCtoPeriodKey(currentPeriod) : null;
  const previousPeriods = sortedRecords.filter(
    (p) => !currentKey || normalizeCtoPeriodKey(p) !== currentKey,
  );
  const previousGrouped = groupCtoPreviousPeriodsByYear(previousPeriods);
  const empEarnings = earningsList.filter((e) => String(e.employee_number) === String(employeeCTO.employeeNumber));
  const balRemModal = getCtoEmployeeDisplayRemaining(employeeCTO.records, empEarnings);

  const periodRowProps = (record, isCurrent, rowIndex) => {
    const key = normalizeCtoPeriodKey(record);
    return {
      record, unit, isCurrent, rowIndex, onCommute, onVoidPeriod, onUndoEntry,
      commuteLoadingId, voidLoadingId, undoLoadingId, earningsList: empEarnings,
      chainRecords: sortedRecords, expanded: !!expandedPeriodKeys[key],
      onToggleExpand: onTogglePeriodExpand, periodHistory: periodHistoryCache[key] || null,
      historyLoading: !!historyLoadingKeys[key],
      payrollLocked: typeof isPeriodLockedForPayroll === "function"
        ? isPeriodLockedForPayroll(record.employeeNumber, record.period_year, record.period_month) : false,
    };
  };

  return (
    <Modal open={open} onClose={onClose} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 1, sm: 2 } }}>
      <Fade in={open}>
        <Paper elevation={0} sx={{ width: "100%", maxWidth: 1140, height: "min(82vh, 720px)", display: "flex", flexDirection: "column", borderRadius: "10px", overflow: "hidden", fontFamily: T.poppins, border: "1px solid rgba(0,0,0,0.1)", boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}>
          <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", gap: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: "#fafbfc", flexShrink: 0 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: T.poppins, mb: 0.35 }}>CTO balance</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: "1.05rem", color: T.text, fontFamily: T.poppins, lineHeight: 1.25 }} noWrap>{employeeCTO.fullName}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}>
                <Typography sx={{ fontSize: "0.75rem", color: T.muted, fontFamily: T.poppins }}>ID {employeeCTO.employeeNumber}</Typography>
                {deptCode && <DeptBadge code={deptCode} />}
                {empCat && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
              </Box>
            </Box>
            <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
              sx={{ flexShrink: 0, bgcolor: "#fff", "& .MuiToggleButton-root": { px: 1.5, py: 0.45, fontSize: "0.72rem", fontWeight: 500, textTransform: "none", fontFamily: T.poppins, borderColor: "rgba(0,0,0,0.12)", color: T.muted, "&.Mui-selected": { bgcolor: T.text, color: "#fff", borderColor: T.text } } }}>
              <ToggleButton value="days">Days</ToggleButton>
              <ToggleButton value="hours">Hours</ToggleButton>
            </ToggleButtonGroup>
            <IconButton onClick={onClose} size="small" sx={{ color: T.muted, border: `1px solid ${T.divider}`, borderRadius: "6px" }}><Close sx={{ fontSize: 16 }} /></IconButton>
          </Box>
          <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            {sortedRecords.length === 0 ? (
              <Box sx={{ py: 8, textAlign: "center" }}><Typography sx={{ color: T.muted, fontSize: "0.85rem", fontFamily: T.poppins }}>No CTO records on file.</Typography></Box>
            ) : (
              <>
                <Box sx={{ px: 3, py: 1, borderBottom: `1px solid ${T.divider}`, bgcolor: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>
                    <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>Compensatory Time Off</Box> — OT-based balance by period
                  </Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>{sortedRecords.length} period{sortedRecords.length !== 1 ? "s" : ""} on record</Typography>
                </Box>
                {actionSuccess && <Box sx={{ px: 3, pt: 1.25 }}><Alert severity="success" icon={<CheckIcon />} sx={{ borderRadius: "8px", fontFamily: T.poppins }}>{actionSuccess}</Alert></Box>}
                {error && <Box sx={{ px: 3, pt: 1.25 }}><Alert severity="error" sx={{ borderRadius: "8px", fontFamily: T.poppins }}>{error}</Alert></Box>}
                <Table size="small" stickyHeader sx={{ tableLayout: "fixed", minWidth: 980, "& .MuiTableCell-head": { bgcolor: `${T.accent} !important`, color: "#fff !important" } }}>
                  <TableHead>
                    <TableRow>
                      {CTO_BALANCE_COLUMNS.map((col) => (
                        <CtoBalanceHeaderCell key={col.key} label={col.label} subtitle={col.subtitle} align={col.align} width={col.width} groupPos={col.groupPos} />
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentPeriod && (
                      <>
                        <CtoPeriodSectionRow label="Current period" variant="current" />
                        <CtoPeriodTableRow {...periodRowProps(currentPeriod, true, 0)} />
                      </>
                    )}
                    {previousPeriods.length > 0 && (
                      <>
                        <CtoPeriodSectionRow label="Previous balances" variant="divider" />
                        {previousGrouped.map((item, idx) => item.kind === "year"
                          ? <CtoPeriodSectionRow key={`year-${item.year}`} label={String(item.year)} variant="year" />
                          : <CtoPeriodTableRow key={item.period.id} {...periodRowProps(item.period, false, idx)} />)}
                      </>
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </Box>
          {sortedRecords.length > 0 && (
            <Box sx={{ px: 3, py: 1, borderTop: `1px solid ${T.divider}`, bgcolor: "#fafbfc", flexShrink: 0 }}>
              <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>
                Total remaining across all periods:{" "}
                <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>{fmtCtoPeriodVal(balRemModal, unit)}</Box>
                <Box component="span" sx={{ color: T.faint, ml: 0.5 }}>({fmtCtoPeriodAlt(balRemModal, unit)})</Box>
              </Typography>
            </Box>
          )}
        </Paper>
      </Fade>
    </Modal>
  );
};

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

const selectSx = {
  borderRadius: "8px", fontSize: "0.875rem", bgcolor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.accent },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: T.accent, borderWidth: "1.5px" },
};

// ─── Display helpers ───────────────────────────────────────────────────────────
const toHours = (val, unit) => unit === "days" ? val * 8 : val;
const fmtHrs = (h, unit) => unit === "hours"
  ? `${toNum(h).toFixed(3)} hrs`
  : `${(toNum(h) / 8).toFixed(3)} days`;

const isCtoLedgerSnapshotChip = (r) => {
  const rm = String(r?.remarks || "");
  return /cto_direct_deduction/i.test(rm) || /cto_earning_delete_reversal/i.test(rm);
};

const INTERNAL_CTO_REMARK_RE = /\b(cto_earning:\d+|cto_earning_delete_reversal:\d+|cto_direct_deduction:\d+)\b/gi;
const AUTO_CTO_TARDINESS_REMARK_RE = /\s*Tardiness deduction:\s*[\d.]+d\s+for\s+[A-Za-z]+\s+\d{4}\s*/gi;

const formatCtoRemarksForDisplay = (remarks) => {
  let s = String(remarks || "")
    .replace(INTERNAL_CTO_REMARK_RE, "")
    .replace(AUTO_CTO_TARDINESS_REMARK_RE, "");
  return s.split("·").map((p) => p.trim()).filter(Boolean).join(" · ").trim();
};

const formatCtoPeriodRowRemarks = (remarks) => formatCtoRemarksForDisplay(remarks);

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
  const [actionSuccess,        setActionSuccess]        = useState("");
  const [commuteLoadingId,     setCommuteLoadingId]     = useState(null);
  const [voidLoadingId,        setVoidLoadingId]        = useState(null);
  const [undoLoadingId,        setUndoLoadingId]        = useState(null);
  const [periodHistoryCache,   setPeriodHistoryCache]   = useState({});
  const [expandedPeriodKeys,   setExpandedPeriodKeys]   = useState({});
  const [historyLoadingKeys,   setHistoryLoadingKeys]   = useState({});
  const [commutationWarning,   setCommutationWarning]   = useState(null);
  const [ctoEarnings,          setCtoEarnings]          = useState([]);

  const { socket } = useSocket();
  const { isPeriodLockedForPayroll, refreshPayrollKeys } = usePayrollPeriodLock();

  useEffect(() => {
    (async () => {
      await Promise.all([fetchCTORecords(), fetchCtoEarnings(), fetchEmployees(), fetchDeptMap(), fetchEmpCatMap()]);
      setPageLoading(false);
    })();
  }, []);

  useEffect(() => { setRecordsPage(0); }, [searchTerm, deptFilter]);
  useEffect(() => { setOtHours(0); setRemarks(""); setExpiryDate(""); setError(""); }, [selectedEmployee, periodYear, periodMonth]);
  useEffect(() => { if (employeeCTOModalOpen) refreshPayrollKeys(); }, [employeeCTOModalOpen, refreshPayrollKeys]);

  const clearPeriodHistoryCache = (record) => {
    if (!record) { setPeriodHistoryCache({}); return; }
    const key = normalizeCtoPeriodKey(record);
    setPeriodHistoryCache((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };

  const fetchPeriodHistory = async (record, { force = false } = {}) => {
    if (!record?.employeeNumber) return null;
    const key = normalizeCtoPeriodKey(record);
    if (!force && periodHistoryCache[key]) return periodHistoryCache[key];
    setHistoryLoadingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/cto/cto/period-history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { employeeNumber: record.employeeNumber, period_year: record.period_year, period_month: record.period_month },
      });
      setPeriodHistoryCache((prev) => ({ ...prev, [key]: r.data }));
      return r.data;
    } catch {
      const empRecords = ctoRecords.filter((row) => String(row.employeeNumber) === String(record.employeeNumber));
      const fallback = buildCtoPeriodSnapshotHistory(
        ctoRecords,
        ctoEarnings,
        {
          employeeNumber: record.employeeNumber,
          periodYear: record.period_year,
          periodMonth: record.period_month,
          chainRecords: empRecords,
        },
      );
      setPeriodHistoryCache((prev) => ({ ...prev, [key]: fallback }));
      return fallback;
    } finally {
      setHistoryLoadingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  const togglePeriodExpand = async (record) => {
    const key = normalizeCtoPeriodKey(record);
    if (expandedPeriodKeys[key]) {
      setExpandedPeriodKeys((prev) => ({ ...prev, [key]: false }));
      return;
    }
    setExpandedPeriodKeys((prev) => ({ ...prev, [key]: true }));
    await fetchPeriodHistory(record);
  };

  const refreshModalEmployeeRecords = (allRecords, employeeNumber) => {
    const fresh = allRecords.filter((r) => String(r.employeeNumber) === String(employeeNumber));
    setSelectedEmployeeCTO((prev) => {
      if (!prev || String(prev.employeeNumber) !== String(employeeNumber)) return prev;
      return { ...prev, records: fresh, displayRecords: ctoRecordsForDisplay(fresh) };
    });
    return fresh;
  };

  const mergeEmployeeCtoRecords = (prev, empNum, newRows, fullName = "") => {
    const emp = String(empNum);
    const others = prev.filter((r) => String(r.employeeNumber) !== emp);
    const name = fullName || prev.find((r) => String(r.employeeNumber) === emp)?.fullName || "";
    const merged = (Array.isArray(newRows) ? newRows : []).map((r) => ({ ...r, fullName: r.fullName || name }));
    return [...others, ...merged];
  };

  const prefetchCurrentPeriodHistory = async (records, employeeNumber) => {
    const display = ctoRecordsForDisplay(records);
    const current = resolveCtoCurrentDisplayPeriod(display);
    if (current) {
      const key = normalizeCtoPeriodKey(current);
      setExpandedPeriodKeys((prev) => ({ ...prev, [key]: true }));
      await fetchPeriodHistory(current, { force: true });
    }
  };

  const fetchCTORecords = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/cto/cto`, { headers: { Authorization: `Bearer ${token}` } });
      setCTORecords(Array.isArray(r.data) ? r.data : []);
    } catch { setCTORecords([]); }
  };

  const fetchCtoEarnings = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/earnings/cto/all`, { headers: { Authorization: `Bearer ${token}` } });
      const list = Array.isArray(r.data?.earnings) ? r.data.earnings : Array.isArray(r.data) ? r.data : [];
      setCtoEarnings(list);
    } catch { setCtoEarnings([]); }
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
    fetchCtoEarnings();
    fetchEmployees();
    fetchDeptMap();
    fetchEmpCatMap();
  });

  useEffect(() => {
    if (!socket) return undefined;
    const onEarnings = (payload) => {
      if (!payload || payload.module === "cto" || !payload.module) {
        fetchCTORecords();
        fetchCtoEarnings();
      }
    };
    const onCommutation = () => {
      fetchCTORecords();
      fetchCtoEarnings();
    };
    socket.on("earningsChanged", onEarnings);
    socket.on("leaveCommutationChanged", onCommutation);
    return () => {
      socket.off("earningsChanged", onEarnings);
      socket.off("leaveCommutationChanged", onCommutation);
    };
  }, [socket]);

  useEffect(() => {
    if (!employeeCTOModalOpen || !selectedEmployeeCTO?.employeeNumber) return;
    const emp = String(selectedEmployeeCTO.employeeNumber);
    const fresh = ctoRecords.filter((r) => String(r.employeeNumber) === emp);
    setSelectedEmployeeCTO((prev) => {
      if (!prev || String(prev.employeeNumber) !== emp) return prev;
      return { ...prev, records: fresh, displayRecords: ctoRecordsForDisplay(fresh) };
    });
  }, [ctoRecords, employeeCTOModalOpen, selectedEmployeeCTO?.employeeNumber]);

  const earningsByEmployee = useMemo(() => {
    const map = {};
    ctoEarnings.forEach((e) => {
      const k = String(e.employee_number);
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    return map;
  }, [ctoEarnings]);

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
        displayRecords: ctoRecordsForDisplay(grp.records),
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

  const assignPeriodGuard = useMemo(() => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    if (!empNum) return { ok: true, error: "" };
    const chainRecs = ctoRecords.filter((r) => String(r.employeeNumber) === empNum);
    return assertCtoPeriodAssignableForCredits(chainRecs, periodYear, periodMonth);
  }, [ctoRecords, selectedEmployee, periodYear, periodMonth]);

  const handleAddCTO = async () => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    if (!empNum)              { setError("Please select an employee"); return; }
    if (toNum(otHours) <= 0) { setError(`OT ${unit === "days" ? "days" : "hours"} must be > 0`); return; }
    const py = parseInt(periodYear, 10) || new Date().getFullYear();
    const pm = periodMonth || null;

    const chainRecsForGuard = ctoRecords.filter((r) => String(r.employeeNumber) === empNum);
    const assignCheck = assertCtoPeriodAssignableForCredits(chainRecsForGuard, py, pm);
    if (!assignCheck.ok) {
      setError(assignCheck.error);
      return;
    }

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
      const empEarnings = ctoEarnings.filter((e) => String(e.employee_number) === empNum);
      const chainRecs = ctoRecords.filter((r) => String(r.employeeNumber) === empNum);
      const carryForward = getPriorPeriodCtoCarryForward(chainRecs, empEarnings, py, pm);

      if (existing?.id) {
        const mergedOtEarned = toNum(existing.earned_hours) + earned;
        const usedHours = toNum(existing.used_hours);
        const working = {
          ...existing,
          earned_hours: mergedOtEarned,
          used_hours: usedHours,
          carried_forward_hours: toNum(existing.carried_forward_hours) || carryForward,
          ot_hours: toNum(existing.ot_hours) + earned,
        };
        const ledger = recomputeCtoLedgerFields(working, empEarnings);
        const mergedRemarks = [existing.remarks, remarks].filter(Boolean).join(" · ").trim() || null;

        await axios.put(
          `${API_BASE_URL}/api/cto/cto/${existing.id}`,
          {
            ot_hours: toNum(existing.ot_hours) + earned,
            earned_hours: ledger.earned_hours,
            used_hours: ledger.used_hours,
            carried_forward_hours: ledger.carried_forward_hours,
            total_hours: ledger.total_hours,
            remaining_hours: ledger.remaining_hours,
            earning_status: ledger.earning_status,
            expiry_date: expiryDate || existing.expiry_date || null,
            remarks: mergedRemarks,
          },
          { headers },
        );
        setSuccessAction("edit");
      } else {
        const addEarned = carryForward + earned;
        const ledger = recomputeCtoLedgerFields(
          {
            earned_hours: addEarned,
            used_hours: 0,
            carried_forward_hours: carryForward,
            ot_hours: earned,
            period_year: py,
            period_month: pm,
            employeeNumber: empNum,
          },
          empEarnings,
        );

        await axios.post(
          `${API_BASE_URL}/api/cto/cto`,
          {
            employeeNumber: empNum,
            ot_hours: earned,
            earned_hours: ledger.earned_hours,
            used_hours: ledger.used_hours,
            carried_forward_hours: ledger.carried_forward_hours,
            total_hours: ledger.total_hours,
            remaining_hours: ledger.remaining_hours,
            earning_status: ledger.earning_status,
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

      await Promise.all([fetchCTORecords(), fetchCtoEarnings()]);
      if (employeeCTOModalOpen && selectedEmployeeCTO && String(selectedEmployeeCTO.employeeNumber) === empNum) {
        clearPeriodHistoryCache({ employeeNumber: empNum, period_year: py, period_month: pm });
        const ctoRes = await axios.get(`${API_BASE_URL}/api/cto/cto`, { headers });
        const all = Array.isArray(ctoRes.data) ? ctoRes.data : [];
        setCTORecords(all);
        const fresh = refreshModalEmployeeRecords(all, empNum);
        await prefetchCurrentPeriodHistory(fresh, empNum);
        const key = normalizeCtoPeriodKey({ period_year: py, period_month: pm });
        if (expandedPeriodKeys[key]) {
          await fetchPeriodHistory({ employeeNumber: empNum, period_year: py, period_month: pm }, { force: true });
        }
      }
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

  const handleOpenCommutationWarning = useCallback((record) => {
    if (!record?.id || isCtoPeriodVoided(record) || isCtoCommutedLocked(record)) return;
    const empRecords = ctoRecords.filter((r) => String(r.employeeNumber) === String(record.employeeNumber));
    const currentCheck = assertCtoPeriodIsCurrentDisplay(record, empRecords);
    if (!currentCheck.ok) return;
    if (typeof isPeriodLockedForPayroll === "function" && isPeriodLockedForPayroll(record.employeeNumber, record.period_year, record.period_month)) {
      setError(PAYROLL_LOCK_TOOLTIP);
      return;
    }
    const latestRow = findLatestCtoForPeriod(ctoRecords, record.employeeNumber, record.period_year, record.period_month) || record;
    const empEarnings = ctoEarnings.filter((e) => String(e.employee_number) === String(record.employeeNumber));
    const remH = getCtoDisplayRemainingHours(latestRow, empEarnings);
    if (remH <= 0) return;
    setCommutationWarning({ period: latestRow });
  }, [ctoRecords, ctoEarnings, isPeriodLockedForPayroll]);

  const handleTransferToCommutation = useCallback(async () => {
    if (!commutationWarning?.period?.id) return;
    const period = commutationWarning.period;
    setCommuteLoadingId(period.id);
    setError("");
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.post(
        `${API_BASE_URL}/commutationRoute/leave_commutation/commute-cto/${period.id}`,
        {},
        { headers },
      );
      setCommutationWarning(null);
      const [ctoRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/cto/cto`, { headers }),
        fetchCtoEarnings(),
      ]);
      const fresh = Array.isArray(ctoRes.data) ? ctoRes.data : [];
      setCTORecords(fresh);
      if (selectedEmployeeCTO) {
        const empRecords = fresh.filter((r) => String(r.employeeNumber) === String(selectedEmployeeCTO.employeeNumber));
        setSelectedEmployeeCTO({
          ...selectedEmployeeCTO,
          records: empRecords,
          displayRecords: ctoRecordsForDisplay(empRecords),
        });
      }
      setActionSuccess("CTO balance recorded for commutation.");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setError("Commutation failed: " + (err.response?.data?.error || err.message));
    } finally {
      setCommuteLoadingId(null);
    }
  }, [commutationWarning, selectedEmployeeCTO]);

  const handleCommute = handleOpenCommutationWarning;

  const handleVoidPeriod = async (record) => {
    const latest = findLatestCtoForPeriod(ctoRecords, record.employeeNumber, record.period_year, record.period_month) || record;
    if (!latest?.id) return;
    const empDisplay = ctoRecords.filter((r) => String(r.employeeNumber) === String(latest.employeeNumber));
    const currentCheck = assertCtoPeriodIsCurrentDisplay(latest, empDisplay);
    if (!currentCheck.ok) {
      setError(currentCheck.error || "Only the latest CTO period can be voided. Prior periods were superseded.");
      return;
    }
    if (isPeriodLockedForPayroll(latest.employeeNumber, latest.period_year, latest.period_month)) {
      setError(PAYROLL_LOCK_TOOLTIP);
      return;
    }
    const label = periodLabel(latest.period_year, latest.period_month);
    if (!window.confirm(`This will void the current period CTO ledger and all earnings for ${label}. Balances will be recalculated. This cannot be undone.`)) return;
    setVoidLoadingId(latest.id);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_BASE_URL}/api/cto/cto/${latest.id}/void-period`, { headers });
      clearPeriodHistoryCache(latest);
      await Promise.all([fetchCTORecords(), fetchCtoEarnings()]);
      if (selectedEmployeeCTO) {
        const ctoRes = await axios.get(`${API_BASE_URL}/api/cto/cto`, { headers });
        const all = Array.isArray(ctoRes.data) ? ctoRes.data : [];
        setCTORecords(all);
        const fresh = refreshModalEmployeeRecords(all, selectedEmployeeCTO.employeeNumber);
        await prefetchCurrentPeriodHistory(fresh, selectedEmployeeCTO.employeeNumber);
        const empChain = all.filter((r) => String(r.employeeNumber) === String(selectedEmployeeCTO.employeeNumber));
        const reopened = resolveCtoCurrentDisplayPeriod(ctoRecordsForDisplay(empChain));
        if (reopened?.period_year != null) {
          setPeriodYear(String(reopened.period_year));
          setPeriodMonth(
            reopened.period_month != null && String(reopened.period_month).trim() !== ""
              ? String(reopened.period_month)
              : "",
          );
        }
      }
      setActionSuccess(`Voided CTO period ${label}.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setError("Void failed: " + (err.response?.data?.error || err.message));
    } finally {
      setVoidLoadingId(null);
    }
  };

  const handleUndoEntry = async (record, snapshot = null) => {
    const targetId = snapshot?.id ?? record?.id;
    if (!targetId) return;
    const label = periodLabel(record.period_year, record.period_month);
    const periodKey = normalizeCtoPeriodKey(record);
    const empNum = record.employeeNumber;
    const empName = selectedEmployeeCTO?.fullName || "";
    setUndoLoadingId(targetId);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const undoRes = await axios.post(
        `${API_BASE_URL}/api/cto/cto/${targetId}/undo-entry`,
        {},
        { headers, timeout: 60000 },
      );
      const { period_history: periodHistory, employee_records: employeeRecords } = undoRes.data || {};
      if (periodHistory) setPeriodHistoryCache((prev) => ({ ...prev, [periodKey]: periodHistory }));
      if (Array.isArray(employeeRecords) && employeeRecords.length) {
        setCTORecords((prev) => mergeEmployeeCtoRecords(prev, empNum, employeeRecords, empName));
        setSelectedEmployeeCTO((prev) => {
          if (!prev || String(prev.employeeNumber) !== String(empNum)) return prev;
          return { ...prev, records: employeeRecords, displayRecords: ctoRecordsForDisplay(employeeRecords) };
        });
      }
      setActionSuccess(`Undid last OT entry for ${label}.`);
      setTimeout(() => setActionSuccess(""), 4000);
      Promise.all([
        axios.get(`${API_BASE_URL}/api/cto/cto`, { headers, params: { employeeNumber: empNum } }),
        fetchCtoEarnings(),
      ]).then(([ctoRes]) => {
        if (!Array.isArray(ctoRes?.data)) return;
        setCTORecords((prev) => mergeEmployeeCtoRecords(prev, empNum, ctoRes.data, empName));
        setSelectedEmployeeCTO((prev) => {
          if (!prev || String(prev.employeeNumber) !== String(empNum)) return prev;
          return { ...prev, records: ctoRes.data, displayRecords: ctoRecordsForDisplay(ctoRes.data) };
        });
      }).catch(() => {});
    } catch (err) {
      setError("Undo failed: " + (err.response?.data?.error || err.message));
    } finally {
      setUndoLoadingId(null);
    }
  };

  const openEmployeeCTOModal = async (grp) => {
    setEmployeeCTOModalOpen(true);
    setExpandedPeriodKeys({});
    setPeriodHistoryCache({});
    refreshPayrollKeys();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/cto/cto/sync-carries/${grp.employeeNumber}`, {}, { headers });
      const [ctoRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/cto/cto`, { headers }),
        fetchCtoEarnings(),
      ]);
      const all = Array.isArray(ctoRes.data) ? ctoRes.data : [];
      setCTORecords(all);
      const fresh = all.filter((r) => String(r.employeeNumber) === String(grp.employeeNumber));
      const display = ctoRecordsForDisplay(fresh);
      setSelectedEmployeeCTO({ ...grp, records: fresh, displayRecords: display });
      await prefetchCurrentPeriodHistory(fresh, grp.employeeNumber);
    } catch {
      const display = grp.displayRecords || ctoRecordsForDisplay(grp.records);
      setSelectedEmployeeCTO({ ...grp, displayRecords: display });
      await prefetchCurrentPeriodHistory(grp.records || [], grp.employeeNumber);
    }
  };

if (accessLoading || pageLoading) {
    return <CompensatoryTimeOffWireframe />;
  }
  if (!hasAccess) return <AccessDenied />;

  const selectedMonthLabel = MONTHS.find((m) => m.value === periodMonth)?.label || "";

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
                  <IconButton onClick={() => { fetchCTORecords(); fetchCtoEarnings(); fetchDeptMap(); fetchEmpCatMap(); }}
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

                      {!assignPeriodGuard.ok && (
                        <Alert severity="warning" sx={{ mb: 1.5, fontSize: "0.75rem", fontFamily: T.poppins }}>
                          {assignPeriodGuard.error}
                        </Alert>
                      )}
                      <Tooltip title={!assignPeriodGuard.ok ? assignPeriodGuard.error : ""} disableHoverListener={assignPeriodGuard.ok}>
                      <span>
                      <AccentButton onClick={handleAddCTO} variant="contained" fullWidth
                        startIcon={loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
                        disabled={loading || toNum(otHours) <= 0 || !assignPeriodGuard.ok}
                        sx={{ height: 40, bgcolor: T.accent, color: "#fff", boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, fontFamily: T.poppins, "&:hover": { bgcolor: T.accentDark }, "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important", boxShadow: "none" } }}>
                        {loading
                          ? "Saving…"
                          : toNum(otHours) > 0
                            ? existingPeriodRecord
                              ? `Add ${fmtHrs(otHours, unit)} to existing CTO · ${periodYear}${perMonthTracking && selectedMonthLabel ? ` · ${selectedMonthLabel}` : perMonthTracking ? "" : " (year total)"}`
                              : `Record ${fmtHrs(otHours, unit)} CTO for ${periodYear}${selectedMonthLabel ? ` · ${selectedMonthLabel}` : ""}`
                            : `Enter OT ${unit === "days" ? "days" : "hours"} to compute CTO`}
                      </AccentButton>
                      </span>
                      </Tooltip>
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
                        const empEarn = earningsByEmployee[grp.employeeNumber] || [];
                        const { remaining: balRem, earnedForColor } = getCtoEmployeeLedgerSummary(grp.records, empEarn);
                        const overallColor = getStatusColor(balRem, earnedForColor);
                        const chipRecords = (grp.displayRecords || []).filter((r) => !isCtoLedgerSnapshotChip(r));
                        const initials = `${grp.firstName?.[0] || ""}${grp.lastName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const deptCode = deptMap[grp.employeeNumber] || null;
                        const empCat = empCatLabelMap[grp.employeeNumber] || null;
                        const hasExpired = chipRecords.some((r) => isExpired(r.expiry_date));
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
                                  const flow = computeCtoBalances(r, { earningsList: empEarn, chainRecords: grp.displayRecords });
                                  const rsc = getStatusColor(flow.remainingBalance, flow.totalCtoCredits);
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
                                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>
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
                        const empEarn = earningsByEmployee[grp.employeeNumber] || [];
                        const { remaining: balRem, earnedForColor } = getCtoEmployeeLedgerSummary(grp.records, empEarn);
                        const overallColor = getStatusColor(balRem, earnedForColor);
                        const chipRecords = (grp.displayRecords || []).filter((r) => !isCtoLedgerSnapshotChip(r));
                        const initials = `${grp.firstName?.[0] || ""}${grp.lastName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const deptCode = deptMap[grp.employeeNumber] || null;
                        const empCat = empCatLabelMap[grp.employeeNumber] || null;
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
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>{fmtHrs(balRem, unit)}</Typography>
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              {chipRecords.slice(0, 3).map((r) => {
                                const flow = computeCtoBalances(r, { earningsList: empEarn, chainRecords: grp.displayRecords });
                                const rsc = getStatusColor(flow.remainingBalance, flow.totalCtoCredits);
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

          <EmployeeCTOModal
            open={employeeCTOModalOpen}
            onClose={() => {
              setEmployeeCTOModalOpen(false);
              setSelectedEmployeeCTO(null);
              setExpandedPeriodKeys({});
              setPeriodHistoryCache({});
            }}
            employeeCTO={selectedEmployeeCTO}
            unit={unit}
            setUnit={setUnit}
            deptMap={deptMap}
            empCatLabelMap={empCatLabelMap}
            actionSuccess={actionSuccess}
            error={error}
            commuteLoadingId={commuteLoadingId}
            voidLoadingId={voidLoadingId}
            undoLoadingId={undoLoadingId}
            earningsList={selectedEmployeeCTO ? (earningsByEmployee[selectedEmployeeCTO.employeeNumber] || []) : []}
            onCommute={handleCommute}
            onVoidPeriod={handleVoidPeriod}
            onUndoEntry={handleUndoEntry}
            onTogglePeriodExpand={togglePeriodExpand}
            periodHistoryCache={periodHistoryCache}
            historyLoadingKeys={historyLoadingKeys}
            expandedPeriodKeys={expandedPeriodKeys}
            isPeriodLockedForPayroll={isPeriodLockedForPayroll}
          />

          <CtoCommutationWarningModal
            open={!!commutationWarning}
            onClose={() => !commuteLoadingId && setCommutationWarning(null)}
            onConfirm={handleTransferToCommutation}
            period={commutationWarning?.period ?? null}
            unit={unit}
            earningsList={commutationWarning?.period
              ? ctoEarnings.filter((e) => String(e.employee_number) === String(commutationWarning.period.employeeNumber))
              : []}
            loading={!!commuteLoadingId}
          />

        </Box>
      </Fade>
    </>
  );
};

export default CompensatoryTimeOff;