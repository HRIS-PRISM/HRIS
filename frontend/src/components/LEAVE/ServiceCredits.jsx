/**
 * ServiceCredit.jsx — Redesigned to match LeaveAssignment style
 *
 * New features:
 *  - Matches LeaveAssignment dark-red theme (#6d2323)
 *  - Month names instead of numbers
 *  - Dynamic OT types (fetched from DB, not hardcoded)
 *  - Employment category filter on records panel
 *  - Compact, filterable records list
 *  - SC records isolated by employment category snapshot
 *    (30hr SC and 40hr SC cannot be mixed)
 *
 * PATCHED: Employee names displayed as "LASTNAME, Firstname Middlename Ext"
 *          in both the selector dropdown and the record cards.
 */

import API_BASE_URL from "../../apiConfig";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import useLeaveRealtimeRefresh from "../../hooks/useLeaveRealtimeRefresh";
import usePayrollPeriodLock from "../../hooks/usePayrollPeriodLock";
import { PAYROLL_LOCK_TOOLTIP } from "../../utils/payrollPeriodLock";
import { compareEmployeesByLastName, sortEmployeesByLastName } from "../../utils/sortEmployeesByLastName";
import {
  Typography, TextField, Button, Box, Grid, Chip, Modal, IconButton,
  Select, MenuItem, FormControl, Alert, InputAdornment, Card, Avatar,
  Divider, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
  TablePagination, Tooltip, Fade, CircularProgress,
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
  CalendarToday as CalendarIcon,
  ViewModule as ViewModuleIcon, ViewList as ViewListIcon,
  Reorder,
  CheckCircle as CheckIcon,
  WorkHistory as SCIcon,
  AccountBalance as CommIcon,
  Lock as LockIcon,
  FlashOn as OTIcon,
  Domain as DomainIcon,
  Work as WorkIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  MonetizationOn as CommutationIcon,
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
  computeScBalances,
  getScDisplayRemainingHours,
  getScEmployeeDisplayRemaining,
  getPriorPeriodScCarryForward,
  recomputeScLedgerFields,
  isScPeriodVoided,
  isScCommutedLocked,
  isScPeriodSuperseded,
  resolveScCurrentDisplayPeriod,
  getScPeriodForwardToLabel,
  scRecordsForDisplay,
  normalizeScPeriodKey,
  SC_UNDO_MAX_PER_PERIOD,
  SC_LEDGER_ENTRY_LABELS,
  pickActiveScPeriodSnapshot,
  assertScPeriodAssignableForCredits,
} from "./serviceCreditBalanceUtils";

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

const CURRENT = {
  main:   "#2e7d32",
  dark:   "#1b5e20",
  faint:  "rgba(46,125,50,0.08)",
  border: "rgba(46,125,50,0.25)",
};

const fieldLabelSx = {
  fontSize: "0.68rem", fontWeight: 700, color: alpha(T.accent, 0.45),
  textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.5,
  fontFamily: T.poppins,
};

const fmtScPeriodVal = (h, unit) => (unit === "hours" ? `${toNum(h).toFixed(3)} h` : `${(toNum(h) / 8).toFixed(3)} d`);
const fmtScPeriodAlt = (h, unit) => (unit === "hours" ? `${(toNum(h) / 8).toFixed(3)} d` : `${toNum(h).toFixed(3)} h`);

const ScPeriodAmtDisplay = ({ hours, unit, strong = false, muted = false, voided = false, locked = false }) => (
  <>
    <Typography sx={{
      fontSize: "0.8rem",
      fontWeight: strong && !locked ? 700 : 500,
      color: locked || voided ? T.faint : strong ? CURRENT.main : muted ? T.muted : T.text,
      fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums",
      textDecoration: voided ? "line-through" : "none",
      ...(locked ? { fontStyle: "italic" } : {}),
    }}>
      {fmtScPeriodVal(hours, unit)}
    </Typography>
    <Typography sx={{
      fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums",
      textDecoration: voided ? "line-through" : "none",
    }}>
      {fmtScPeriodAlt(hours, unit)}
    </Typography>
  </>
);

const ScPeriodSectionRow = ({ label, variant = "section", colSpan = 8 }) => (
  <TableRow>
    <TableCell
      colSpan={colSpan}
      sx={{
        py: variant === "divider" ? 1 : 0.65, px: 1.5,
        bgcolor: variant === "divider" ? "#eef0f3" : variant === "year" ? "#fafbfc" : variant === "current" ? "rgba(46,125,50,0.08)" : alpha(T.accent, 0.06),
        borderBottom: `1px solid ${variant === "divider" ? "rgba(0,0,0,0.12)" : variant === "current" ? CURRENT.border : T.divider}`,
        borderTop: variant === "divider" ? "2px solid rgba(0,0,0,0.08)" : "none",
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

const SC_BALANCE_LABELS = {
  previousBalance:    { label: "Previous Balance", subtitle: "Carried forward" },
  scEarned:           { label: "Service Credits Earned", subtitle: "OT entered on Service Credits" },
  totalSc:            { label: "Total Service Credits", subtitle: "Previous + Earned" },
  scUsed:             { label: "Service Credits Used", subtitle: "Deductions applied" },
  postDed:            { label: "Post-Deduction", subtitle: "Total − Used (+ approved earnings)" },
  remaining:          { label: "Remaining Balance", subtitle: "Post-Deduction + approved earnings" },
};

const COMMUTATION_COPY = {
  action: "Commute",
  status: "Commuted",
  statusTooltip: "This balance has been recorded for commutation.",
  modalTitle: "Service Credit Commutation",
  modalSubtitle: "For in-service use or retirement benefit",
  amountLabel: "Balance for commutation",
  purpose:
    "Commutation is not an immediate cash payout. Unused service credits are recorded so they can be used while the employee still has rendered hours, or applied upon retirement — with payment based on the employee's salary grade.",
  carryOverNote: (amt) =>
    `Opening balance of ${amt} carries from the prior period's remaining balance.`,
  irreversible:
    "This action is irreversible. The period will be locked and a commutation record will be created for HR processing.",
  locked: "Locked — balance recorded for commutation",
  confirm: "Confirm commutation",
  confirming: "Recording…",
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

const SC_BALANCE_COLUMNS = [
  { key: "period",     label: "Period",                         align: "left",  width: "14%" },
  { key: "previous",   ...SC_BALANCE_LABELS.previousBalance,   align: "right", width: "11%", groupPos: "start" },
  { key: "earned",     ...SC_BALANCE_LABELS.scEarned,          align: "right", width: "11%", groupPos: "mid" },
  { key: "total",      ...SC_BALANCE_LABELS.totalSc,           align: "right", width: "11%", groupPos: "end" },
  { key: "used",       ...SC_BALANCE_LABELS.scUsed,            align: "right", width: "11%", groupPos: "start" },
  { key: "postDed",    ...SC_BALANCE_LABELS.postDed,           align: "right", width: "12%", groupPos: "mid" },
  { key: "remaining",  ...SC_BALANCE_LABELS.remaining,         align: "right", width: "12%", groupPos: "end" },
  { key: "actions",    label: "",                               align: "right", width: "10%" },
];

const BALANCE_ROW_MIN_H = 56;

const getScColumnGroupSx = (groupPos, { isHeader = false, isCurrent = false } = {}) => {
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
  if (isHeader) {
    sx.borderTop = `1px solid rgba(255,255,255,0.35)`;
  } else if (!isCurrent && groupPos === "start") {
    sx.bgcolor = alpha(T.accent, 0.025);
  }
  return sx;
};

const scDataCellSx = (locked, voided, isActiveHighlight, groupPos) => ({
  py: 0,
  px: 0,
  verticalAlign: "middle",
  borderBottom: `1px solid ${locked ? COMMUTED_ROW.border : voided ? VOIDED_ROW.border : T.divider}`,
  bgcolor: locked ? COMMUTED_ROW.bgAlt : voided ? VOIDED_ROW.bgAlt : isActiveHighlight ? CURRENT.faint : "inherit",
  ...getScColumnGroupSx(groupPos, { isCurrent: isActiveHighlight }),
  ...(isActiveHighlight && groupPos ? { bgcolor: alpha(CURRENT.main, 0.05) } : {}),
});

const ScBalanceRowPlain = ({ children, align = "right", compact = false }) => (
  <Box sx={{
    minHeight: BALANCE_ROW_MIN_H,
    display: "flex",
    flexDirection: "column",
    alignItems: align === "right" ? "flex-end" : "flex-start",
    justifyContent: "center",
    px: 1.5,
    py: compact ? 0.85 : 1.1,
    gap: compact ? 0.15 : 0,
  }}>
    {children}
  </Box>
);

const ScBalanceHeaderCell = ({ label, subtitle, align, width, groupPos }) => (
  <TableCell
    align={align}
    sx={{
      py: 1,
      px: 1.5,
      bgcolor: `${T.accent} !important`,
      color: "#fff !important",
      borderBottom: `1px solid ${T.accentDark}`,
      fontFamily: T.poppins,
      verticalAlign: "bottom",
      width,
      ...getScColumnGroupSx(groupPos, { isHeader: true }),
    }}
  >
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

const ScPeriodAmtCell = ({ hours, unit, strong = false, highlight = false, muted = false, voided = false, locked = false, groupPos }) => {
  const isActiveHighlight = highlight && !voided && !locked;
  return (
    <TableCell align="right" sx={scDataCellSx(locked, voided, isActiveHighlight, groupPos)}>
      <ScBalanceRowPlain>
        <ScPeriodAmtDisplay hours={hours} unit={unit} strong={strong} muted={muted} voided={voided} locked={locked} />
      </ScBalanceRowPlain>
    </TableCell>
  );
};

const ScPostDedCell = ({ hours, unit, highlight, voided, locked, earnedBalance }) => {
  const isActiveHighlight = highlight && !voided && !locked;
  const hasEarned = toNum(earnedBalance) > 0;
  return (
    <TableCell align="right" sx={scDataCellSx(locked, voided, isActiveHighlight, "mid")}>
      <ScBalanceRowPlain compact={hasEarned}>
        <ScPeriodAmtDisplay hours={hours} unit={unit} muted voided={voided} locked={locked} />
        {hasEarned && (
          <Typography sx={{ fontSize: "0.58rem", color: "#2e7d32", fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
            {fmtScEarnedCreditsNote(earnedBalance, unit)}
          </Typography>
        )}
      </ScBalanceRowPlain>
    </TableCell>
  );
};

const ScCommutedRemainingCell = ({ hours, unit, groupPos }) => (
  <TableCell align="right" sx={scDataCellSx(true, false, false, groupPos)}>
    <ScBalanceRowPlain compact>
      <Typography sx={{
        fontSize: "0.8rem", fontWeight: 700, color: T.accent,
        fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums",
      }}>
        {fmtScPeriodVal(hours, unit)}
      </Typography>
      <Typography sx={{ fontSize: "0.62rem", color: T.muted, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
        {fmtScPeriodAlt(hours, unit)}
      </Typography>
      <Typography sx={{ fontSize: "0.58rem", color: T.accentMid, fontFamily: T.poppins, fontWeight: 600 }}>
        Commuted
      </Typography>
    </ScBalanceRowPlain>
  </TableCell>
);

const ScForwardedRemainingCell = ({ hours, unit, groupPos, forwardToLabel }) => (
  <TableCell align="right" sx={{
    ...scDataCellSx(false, false, false, groupPos),
    bgcolor: FORWARDED_ROW.bgAlt,
    borderBottom: `1px solid ${FORWARDED_ROW.border}`,
  }}>
    <ScBalanceRowPlain compact>
      <Typography sx={{
        fontSize: "0.8rem", fontWeight: 700, color: T.muted,
        fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums",
      }}>
        {fmtScPeriodVal(hours, unit)}
      </Typography>
      <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
        {fmtScPeriodAlt(hours, unit)}
      </Typography>
      <Typography sx={{ fontSize: "0.58rem", color: "#5f6368", fontFamily: T.poppins, fontWeight: 600, lineHeight: 1.25 }}>
        {forwardToLabel ? `Forwarded to ${forwardToLabel}` : "Forwarded"}
      </Typography>
    </ScBalanceRowPlain>
  </TableCell>
);

const ScVoidedRemainingCell = ({ hours, unit, groupPos }) => (
  <TableCell align="right" sx={scDataCellSx(false, true, false, groupPos)}>
    <ScBalanceRowPlain compact>
      <Typography sx={{
        fontSize: "0.8rem", fontWeight: 700, color: T.faint,
        fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums",
        textDecoration: "line-through",
      }}>
        {fmtScPeriodVal(hours, unit)}
      </Typography>
      <Typography sx={{
        fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums",
        textDecoration: "line-through",
      }}>
        {fmtScPeriodAlt(hours, unit)}
      </Typography>
      <Typography sx={{ fontSize: "0.58rem", color: "#5f6368", fontFamily: T.poppins, fontWeight: 600 }}>
        Voided
      </Typography>
    </ScBalanceRowPlain>
  </TableCell>
);

const ScRemainingCell = ({ hours, unit, highlight, voided, locked, forwarded, forwardToLabel, groupPos, totalSc = 0 }) => {
  if (locked) return <ScCommutedRemainingCell hours={hours} unit={unit} groupPos={groupPos} />;
  if (forwarded) return <ScForwardedRemainingCell hours={hours} unit={unit} groupPos={groupPos} forwardToLabel={forwardToLabel} />;
  if (voided) return <ScVoidedRemainingCell hours={hours} unit={unit} groupPos={groupPos} />;
  const isActiveHighlight = highlight && !voided;
  const sc = getStatusColor(hours, totalSc);
  return (
    <TableCell align="right" sx={scDataCellSx(false, false, isActiveHighlight, groupPos)}>
      <ScBalanceRowPlain>
        <Typography sx={{
          fontSize: "0.8rem", fontWeight: 700, color: sc,
          fontFamily: T.poppins, lineHeight: 1.2, fontVariantNumeric: "tabular-nums",
        }}>
          {fmtScPeriodVal(hours, unit)}
        </Typography>
        <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
          {fmtScPeriodAlt(hours, unit)}
        </Typography>
      </ScBalanceRowPlain>
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

const ForwardedStatusChip = ({ forwardToLabel, size = "sm" }) => (
  <Box
    sx={{
      display: "inline-flex", alignItems: "center", lineHeight: 1,
      px: size === "sm" ? 0.65 : 0.85,
      py: size === "sm" ? 0.12 : 0.2,
      borderRadius: "4px",
      border: "1px dashed rgba(95,99,104,0.35)",
      bgcolor: "rgba(95,99,104,0.06)",
      cursor: "default",
      userSelect: "none",
      maxWidth: "100%",
    }}
  >
    <Typography
      noWrap
      sx={{
      fontSize: size === "sm" ? "0.58rem" : "0.68rem",
      fontWeight: 600,
      color: "#5f6368",
      fontFamily: T.poppins,
      letterSpacing: "0.02em",
    }}
    >
      {forwardToLabel ? `Forwarded · ${forwardToLabel}` : "Forwarded"}
    </Typography>
  </Box>
);

const VoidedStatusChip = ({ size = "sm" }) => (
  <Box
    sx={{
      display: "inline-flex", alignItems: "center", lineHeight: 1,
      px: size === "sm" ? 0.65 : 0.85,
      py: size === "sm" ? 0.12 : 0.2,
      borderRadius: "4px",
      border: "1px dashed rgba(95,99,104,0.4)",
      bgcolor: "rgba(95,99,104,0.08)",
    }}
  >
    <Typography sx={{
      fontSize: size === "sm" ? "0.58rem" : "0.68rem",
      fontWeight: 600,
      color: "#5f6368",
      fontFamily: T.poppins,
      letterSpacing: "0.04em",
    }}>
      Voided
    </Typography>
  </Box>
);

const fmtScEarnedCreditsNote = (hours, unit) => {
  const h = toNum(hours);
  if (h <= 0) return null;
  return `+ ${fmtScPeriodVal(h, unit)} earned`;
};

const formatScVoidedAt = (voidedAt) => {
  if (!voidedAt) return "";
  const d = new Date(voidedAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const ScCommutationWarningModal = ({
  open, onClose, onConfirm, period, unit = "days", earningsList = [], loading = false,
}) => {
  if (!period) return null;

  const fmt = (h) => (unit === "hours" ? fmtScPeriodVal(h, "hours") : fmtScPeriodVal(h, "days"));
  const fmtAlt = (h) => (unit === "hours" ? fmtScPeriodAlt(h, "hours") : fmtScPeriodAlt(h, "days"));
  const flow = computeScBalances(period, { earningsList });
  const remHrs = flow.remainingBalance;
  const periodName = periodLabel(period.period_year, period.period_month);
  const flowRows = [
    { label: SC_BALANCE_LABELS.previousBalance.label, value: flow.previousBalance },
    { label: SC_BALANCE_LABELS.scEarned.label, value: flow.serviceCreditsEarned },
    { label: SC_BALANCE_LABELS.totalSc.label, value: flow.totalServiceCredits },
    { label: SC_BALANCE_LABELS.scUsed.label, value: flow.usedHrs },
    { label: SC_BALANCE_LABELS.postDed.label, value: flow.totalHours },
    { label: SC_BALANCE_LABELS.remaining.label, value: remHrs, accent: true },
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
                {COMMUTATION_COPY.modalSubtitle} · Service Credit · {periodName}
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

const formatScSnapshotDate = (dt) => {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
};

const ScPeriodHistoryPanel = ({
  history,
  unit,
  loading,
  isCurrentPeriod = false,
  periodRecord = null,
  isPeriodVoided = false,
  isPeriodLocked = false,
  onUndoSnapshot = null,
  undoLoadingId = null,
  voidLoadingId = null,
  commuteLoadingId = null,
}) => {
  const [previousRecordsOpen, setPreviousRecordsOpen] = useState(false);

  useEffect(() => {
    setPreviousRecordsOpen(false);
  }, [history?.period_year, history?.period_month, history?.employeeNumber]);

  if (loading) {
    return (
      <Box sx={{ py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={14} sx={{ color: T.faint }} />
        <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins }}>Loading period details…</Typography>
      </Box>
    );
  }
  if (!history) {
    return (
      <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins, py: 1 }}>
        Could not load period details.
      </Typography>
    );
  }

  const snapshots = Array.isArray(history.snapshots) ? history.snapshots : [];
  const currentLines = Array.isArray(history.ledger_lines_active) && history.ledger_lines_active.length
    ? history.ledger_lines_active
    : (Array.isArray(history.ledger_lines) ? history.ledger_lines : snapshots.filter((s) => !s.is_voided));
  const previousLines = Array.isArray(history.ledger_lines_voided)
    ? history.ledger_lines_voided
    : snapshots.filter((s) => s.is_voided);
  const undoRemaining = history.undo_clicks_remaining ?? SC_UNDO_MAX_PER_PERIOD;
  const activeSnapshotCount = history.active_snapshot_count ?? 0;
  const periodCanUndo =
    isCurrentPeriod &&
    !isPeriodVoided &&
    !isPeriodLocked &&
    history.can_undo &&
    undoRemaining > 0 &&
    activeSnapshotCount > 1;

  const undoTooltip = (snap) => {
    if (!isCurrentPeriod) return "Undo is only available while this period is still the current month";
    if (isPeriodVoided || isPeriodLocked) return "Period is voided or commuted";
    if (snap.is_voided) return "Entry already voided";
    if (!snap.is_active) return "Only the latest active entry can be undone";
    if (undoRemaining <= 0) return `Undo limit reached (${SC_UNDO_MAX_PER_PERIOD} per period)`;
    if (activeSnapshotCount <= 1) return "Cannot undo the first entry";
    return `Remove this OT entry (${undoRemaining} of ${SC_UNDO_MAX_PER_PERIOD} undos remaining)`;
  };

  const showUndoColumn = isCurrentPeriod && !isPeriodVoided && !isPeriodLocked;

  const fmtLedgerAmt = (hours, unit, { prefix = "", voided = false } = {}) => {
    if (hours == null || !Number.isFinite(toNum(hours))) return "—";
    const val = fmtScPeriodVal(hours, unit);
    return (
      <Typography
        component="span"
        sx={{
          fontSize: "0.68rem",
          fontWeight: 600,
          color: voided ? T.faint : T.text,
          textDecoration: voided ? "line-through" : "none",
          fontFamily: T.poppins,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {prefix}{val}
      </Typography>
    );
  };

  const renderLedgerTable = (lines, { showUndo = false, voidedSection = false } = {}) => {
    if (!lines.length) return null;

    const headers = [
      "#",
      "Date",
      "Event",
      SC_BALANCE_LABELS.previousBalance.label,
      SC_BALANCE_LABELS.scEarned.label,
      SC_BALANCE_LABELS.totalSc.label,
      SC_BALANCE_LABELS.scUsed.label,
      SC_BALANCE_LABELS.postDed.label,
      SC_BALANCE_LABELS.remaining.label,
      "Status",
      ...(showUndo ? ["Undo"] : []),
    ];

    return (
      <Box sx={{ overflowX: "auto", mb: voidedSection ? 0 : 1.5 }}>
        <Table size="small" sx={{ minWidth: 920, "& .MuiTableCell-root": { py: 0.45, px: 0.6, fontSize: "0.65rem", fontFamily: T.poppins, borderColor: T.divider } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: voidedSection ? VOIDED_ROW.bg : "#f5f6f8" }}>
              {headers.map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: T.muted, whiteSpace: "nowrap", fontSize: "0.62rem" }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, idx) => {
              const isEarning = line.line_type === "earning";
              const rowCanUndo =
                !isEarning &&
                periodCanUndo &&
                line.is_active &&
                !line.is_voided &&
                line.can_undo;
              const isUndoLoading = undoLoadingId === line.id;
              const voided = voidedSection || !!line.is_voided;
              const eventLabel = SC_LEDGER_ENTRY_LABELS[line.entry_kind] || line.entry_kind || "Entry";

              return (
                <TableRow
                  key={`${voidedSection ? "prev" : "cur"}-${line.id}`}
                  sx={{
                    opacity: voided ? 0.8 : 1,
                    bgcolor: line.is_active && !voidedSection
                      ? "rgba(46,125,50,0.06)"
                      : voided ? VOIDED_ROW.bgAlt : "inherit",
                  }}
                >
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {voided && line.voided_at
                      ? formatScVoidedAt(line.voided_at)
                      : formatScSnapshotDate(line.created_at)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{eventLabel}</TableCell>
                  {isEarning ? (
                    <>
                      <TableCell sx={{ color: T.faint }}>—</TableCell>
                      <TableCell sx={{ color: T.faint }}>—</TableCell>
                      <TableCell sx={{ color: T.faint }}>—</TableCell>
                      <TableCell sx={{ color: T.faint }}>—</TableCell>
                      <TableCell>
                        {fmtLedgerAmt(
                          line.earnings_delta ?? line.approved_earnings_delta,
                          unit,
                          { prefix: line.earnings_delta_prefix || "+", voided },
                        )}
                      </TableCell>
                      <TableCell>{fmtLedgerAmt(line.remaining_balance, unit, { voided })}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{fmtLedgerAmt(line.previous_balance, unit, { voided })}</TableCell>
                      <TableCell>
                        {line.entry_kind === "ot_add" && toNum(line.sc_delta) > 0
                          ? fmtLedgerAmt(line.sc_delta, unit, { prefix: "+", voided })
                          : fmtLedgerAmt(line.service_credits_earned, unit, { voided })}
                      </TableCell>
                      <TableCell>{fmtLedgerAmt(line.total_service_credits, unit, { voided })}</TableCell>
                      <TableCell>
                        {line.entry_kind === "deduction" && toNum(line.used_delta) > 0
                          ? fmtLedgerAmt(line.used_delta, unit, { prefix: "−", voided })
                          : fmtLedgerAmt(line.used_hours, unit, { voided })}
                      </TableCell>
                      <TableCell>{fmtLedgerAmt(line.post_deduction, unit, { voided })}</TableCell>
                      <TableCell sx={{ color: T.faint }}>—</TableCell>
                    </>
                  )}
                  <TableCell>
                    {voided ? (
                      <Chip label="Voided" size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: VOIDED_ROW.bg, color: T.faint, fontFamily: T.poppins }} />
                    ) : line.is_active ? (
                      <Chip label="Active" size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: CURRENT.faint, color: CURRENT.dark, fontFamily: T.poppins }} />
                    ) : isEarning ? (
                      <Chip label={line.earn_status || "approved"} size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: "rgba(46,125,50,0.1)", color: CURRENT.dark, fontFamily: T.poppins }} />
                    ) : (
                      <Chip label="Superseded" size="small" sx={{ height: 18, fontSize: "0.58rem", bgcolor: "#eee", color: T.faint, fontFamily: T.poppins }} />
                    )}
                  </TableCell>
                  {showUndo && (
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      {rowCanUndo && onUndoSnapshot && periodRecord ? (
                        <Tooltip title={undoTooltip(line)} placement="top">
                          <span>
                            <IconButton
                              size="small"
                              disabled={isUndoLoading || !!voidLoadingId || !!commuteLoadingId}
                              onClick={() => onUndoSnapshot(periodRecord, line)}
                              sx={{
                                p: 0.5,
                                color: T.text,
                                border: `1px solid ${T.divider}`,
                                borderRadius: "6px",
                                "&:hover": { bgcolor: "rgba(0,0,0,0.04)", borderColor: T.muted },
                              }}
                              aria-label="Undo this OT entry"
                            >
                              {isUndoLoading
                                ? <CircularProgress size={14} sx={{ color: T.muted }} />
                                : <UndoIcon sx={{ fontSize: 16 }} />}
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
            {undoRemaining} of {SC_UNDO_MAX_PER_PERIOD} undos remaining (OT only)
          </Typography>
        )}
        {!isCurrentPeriod && snapshots.some((s) => !s.is_voided) && (
          <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, fontStyle: "italic" }}>
            Undo unavailable — current period has moved to a later month
          </Typography>
        )}
      </Box>
      {currentLines.length === 0 ? (
        <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins, mb: 1.5 }}>No current ledger entries for this period.</Typography>
      ) : (
        renderLedgerTable(currentLines, { showUndo: showUndoColumn })
      )}

      {previousLines.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              mb: 0.75,
            }}
          >
            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.poppins }}>
              Previous records ({previousLines.length})
            </Typography>
            <Tooltip title={previousRecordsOpen ? "Hide voided audit" : "Show voided audit"} placement="top">
              <IconButton
                size="small"
                onClick={() => setPreviousRecordsOpen((o) => !o)}
                aria-label={previousRecordsOpen ? "Hide voided audit" : "Show voided audit"}
                aria-expanded={previousRecordsOpen}
                sx={{
                  p: 0.4,
                  color: T.muted,
                  border: `1px solid ${T.divider}`,
                  borderRadius: "6px",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.04)", color: T.text },
                }}
              >
                {previousRecordsOpen
                  ? <VisibilityOffIcon sx={{ fontSize: 16 }} />
                  : <HistoryIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          </Box>
          {previousRecordsOpen && renderLedgerTable(previousLines, { voidedSection: true })}
        </Box>
      )}
    </Box>
  );
};

const ScPeriodTableRow = ({
  record, unit, isCurrent, rowIndex, onCommute, onVoidPeriod, onUndoEntry, commuteLoadingId, earningsList, voidLoadingId, undoLoadingId, chainRecords = [],
  expanded = false, onToggleExpand, periodHistory = null, historyLoading = false, payrollLocked = false,
}) => {
  const flow = computeScBalances(record, { earningsList, chainRecords });
  const isVoided = flow.isVoided;
  const isCommuted = isScCommutedLocked(record);
  const isForwarded = isScPeriodSuperseded(record, chainRecords) && !isCommuted;
  const forwardToLabel = isForwarded ? getScPeriodForwardToLabel(record, chainRecords) : null;
  const isActionLocked = isCommuted || isForwarded;
  const rowTone = isCommuted ? "commuted" : isForwarded ? "forwarded" : null;
  const rowStyle = rowTone === "commuted" ? COMMUTED_ROW : rowTone === "forwarded" ? FORWARDED_ROW : null;
  const remH = flow.remainingBalance;
  const closingDisplayHrs = isCommuted
    ? flow.commutedHrs
    : isForwarded
      ? Math.max(0, flow.totalHours + flow.earnedBalance)
      : remH;
  let catSnap = null;
  try { catSnap = record.emp_category_snapshot ? JSON.parse(record.emp_category_snapshot) : null; } catch {}
  const periodRemarks = formatScPeriodRowRemarks(record.remarks);

  return (
    <>
    <TableRow
      sx={{
        bgcolor: rowStyle
          ? rowStyle.bg
          : isVoided
            ? VOIDED_ROW.bg
            : isCurrent
              ? "rgba(46,125,50,0.12)"
              : rowIndex % 2 === 1 ? "#fafbfc" : "#fff",
        backgroundImage: rowStyle?.stripe || "none",
        outline: rowStyle
          ? `1px solid ${rowStyle.border}`
          : isCurrent && !isVoided
            ? `1px solid ${CURRENT.border}`
            : "none",
        outlineOffset: -1,
        opacity: isVoided ? 0.9 : 1,
        "& td": isCurrent && !isVoided && !isActionLocked ? { borderBottomColor: "rgba(46,125,50,0.15)" } : undefined,
        "&:hover": {
          bgcolor: rowStyle ? rowStyle.bg : isVoided ? VOIDED_ROW.bgAlt : isCurrent ? "rgba(46,125,50,0.16)" : "#f5f6f8",
        },
      }}
    >
      <TableCell sx={{
        py: 0, px: 0, verticalAlign: "middle",
        borderBottom: `1px solid ${rowStyle ? rowStyle.border : isVoided ? VOIDED_ROW.border : T.divider}`,
        borderLeft: rowStyle ? `3px solid ${isCommuted ? T.accent : "#9e9e9e"}` : isCurrent && !isVoided ? `3px solid ${CURRENT.main}` : "3px solid transparent",
        bgcolor: rowStyle ? rowStyle.bgAlt : isVoided ? VOIDED_ROW.bgAlt : "inherit",
      }}>
        <ScBalanceRowPlain align="left">
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
            {onToggleExpand && (
              <IconButton
                size="small"
                onClick={() => onToggleExpand(record)}
                sx={{ p: 0.25, color: T.muted, "&:hover": { bgcolor: "rgba(0,0,0,0.04)" } }}
                aria-label={expanded ? "Collapse period details" : "Expand period details"}
              >
                {expanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            )}
            <Typography sx={{
              fontSize: "0.82rem",
              fontWeight: isCurrent && !isVoided && !isActionLocked ? 600 : 500,
              color: isVoided ? T.faint : isActionLocked ? T.muted : isCurrent ? CURRENT.dark : T.text,
              fontFamily: T.poppins, lineHeight: 1.2,
              textDecoration: isVoided ? "line-through" : "none",
            }}>
              {periodLabel(record.period_year, record.period_month)}
            </Typography>
            {catSnap?.is30hrs && <Chip label="30hr" size="small" sx={{ height: 16, fontSize: "0.55rem", fontWeight: 700, bgcolor: "rgba(103,58,183,0.08)", color: "#6a1b9a", fontFamily: T.poppins }} />}
            {catSnap?.is40hrs && <Chip label="40hr" size="small" sx={{ height: 16, fontSize: "0.55rem", fontWeight: 700, bgcolor: "rgba(46,125,50,0.08)", color: "#2e7d32", fontFamily: T.poppins }} />}
          </Box>
          {!isVoided && !isActionLocked && periodRemarks && (
            <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, mt: 0.3 }} noWrap title={periodRemarks}>
              {periodRemarks}
            </Typography>
          )}
        </ScBalanceRowPlain>
      </TableCell>
      <ScPeriodAmtCell hours={flow.previousBalance} unit={unit} highlight={isCurrent} muted={!isCurrent && flow.previousBalance === 0} voided={isVoided} locked={isActionLocked} groupPos="start" />
      <ScPeriodAmtCell hours={flow.serviceCreditsEarned} unit={unit} highlight={isCurrent} voided={isVoided} locked={isActionLocked} groupPos="mid" />
      <ScPeriodAmtCell hours={flow.totalServiceCredits} unit={unit} highlight={isCurrent} strong={isCurrent && !isActionLocked && !isVoided} voided={isVoided} locked={isActionLocked} groupPos="end" />
      <ScPeriodAmtCell hours={flow.usedHrs} unit={unit} highlight={isCurrent} voided={isVoided} locked={isActionLocked} groupPos="start" />
      <ScPostDedCell
        hours={flow.totalHours}
        unit={unit}
        highlight={isCurrent}
        voided={isVoided}
        locked={isActionLocked}
        earnedBalance={flow.earnedBalance}
      />
      <ScRemainingCell
        hours={closingDisplayHrs}
        unit={unit}
        highlight={isCurrent}
        voided={isVoided}
        locked={isCommuted}
        forwarded={isForwarded}
        forwardToLabel={forwardToLabel}
        groupPos="end"
        totalSc={flow.totalServiceCredits}
      />
      <TableCell align="right" sx={{
        py: 0, px: 0, verticalAlign: "middle",
        borderBottom: `1px solid ${rowStyle ? rowStyle.border : isVoided ? VOIDED_ROW.border : T.divider}`,
        bgcolor: rowStyle ? rowStyle.bgAlt : isVoided ? VOIDED_ROW.bgAlt : isCurrent ? CURRENT.faint : "inherit",
      }}>
        <ScBalanceRowPlain>
          {isCurrent && !isVoided && !isActionLocked && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 0.5, width: "100%", minWidth: 96 }}>
              {onVoidPeriod && (
                <Tooltip title={payrollLocked ? PAYROLL_LOCK_TOOLTIP : "Void current period (ledger + earnings)"}>
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={voidLoadingId === record.id || payrollLocked}
                      onClick={() => onVoidPeriod(record)}
                      startIcon={
                        payrollLocked
                          ? <CheckIcon sx={{ fontSize: "14px !important", color: "#1565c0" }} />
                          : voidLoadingId === record.id
                            ? <CircularProgress size={12} sx={{ color: "#c62828" }} />
                            : <BlockIcon sx={{ fontSize: "14px !important" }} />
                      }
                      sx={{
                        textTransform: "none", fontSize: "0.72rem", fontWeight: 600, fontFamily: T.poppins,
                        py: 0.4, px: 1.5, minWidth: 96, width: "100%",
                        borderColor: payrollLocked ? "rgba(21,101,192,0.35)" : "#c62828",
                        color: payrollLocked ? "#1565c0" : "#c62828",
                        bgcolor: payrollLocked ? "rgba(21,101,192,0.06)" : "transparent",
                        "&:hover": payrollLocked
                          ? { bgcolor: "rgba(21,101,192,0.06)" }
                          : { borderColor: "#b71c1c", bgcolor: "rgba(198,40,40,0.06)" },
                        "&.Mui-disabled": payrollLocked
                          ? { borderColor: "rgba(21,101,192,0.35)", color: "#1565c0", bgcolor: "rgba(21,101,192,0.06)" }
                          : undefined,
                        "& .MuiButton-startIcon": { mr: 0.5 },
                      }}
                    >
                      {voidLoadingId === record.id ? "…" : payrollLocked ? "In payroll" : "Void"}
                    </Button>
                  </span>
                </Tooltip>
              )}
              {remH > 0 && onCommute && (
                <Tooltip title={payrollLocked ? PAYROLL_LOCK_TOOLTIP : COMMUTATION_COPY.purpose}>
                  <span>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!!commuteLoadingId || payrollLocked}
                      onClick={() => onCommute(record)}
                      startIcon={
                        commuteLoadingId === record.id
                          ? <CircularProgress size={12} sx={{ color: "#fff" }} />
                          : <CommutationIcon sx={{ fontSize: "14px !important" }} />
                      }
                      sx={{
                        textTransform: "none", fontSize: "0.72rem", fontWeight: 600, fontFamily: T.poppins,
                        py: 0.4, px: 1.5, minWidth: 96, width: "100%",
                        bgcolor: T.accent, color: "#fff",
                        boxShadow: `0 1px 4px ${alpha(T.accent, 0.35)}`,
                        "&:hover": { bgcolor: T.accentDark, boxShadow: `0 2px 8px ${alpha(T.accent, 0.4)}` },
                        "&.Mui-disabled": { bgcolor: alpha(T.accent, 0.45), color: "#fff" },
                        "& .MuiButton-startIcon": { mr: 0.5 },
                      }}
                    >
                      {commuteLoadingId === record.id ? "…" : payrollLocked ? "In payroll" : COMMUTATION_COPY.action}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Box>
          )}
          {isVoided && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.35 }}>
              <Tooltip title="This period has been voided. Amounts are shown for audit only." placement="top" arrow>
                <Box component="span" sx={{ display: "inline-flex" }}>
                  <VoidedStatusChip size="sm" />
                </Box>
              </Tooltip>
              {record.voided_at && (
                <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins, lineHeight: 1.2 }}>
                  {formatScVoidedAt(record.voided_at)}
                </Typography>
              )}
            </Box>
          )}
          {isCommuted && !isVoided && (
            <Tooltip title={COMMUTATION_COPY.statusTooltip} placement="top" arrow>
              <Box component="span" sx={{ display: "inline-flex" }}>
                <CommutedStatusChip size="sm" />
              </Box>
            </Tooltip>
          )}
          {isForwarded && !isVoided && (
            <Tooltip
              title={forwardToLabel ? `Balance carried forward to ${forwardToLabel}` : "Balance carried forward to a later period"}
              placement="top"
              arrow
            >
              <Box component="span" sx={{ display: "inline-flex" }}>
                <ForwardedStatusChip forwardToLabel={forwardToLabel} size="sm" />
              </Box>
            </Tooltip>
          )}
        </ScBalanceRowPlain>
      </TableCell>
    </TableRow>
    {expanded && (
      <TableRow>
        <TableCell
          colSpan={SC_BALANCE_COLUMNS.length}
          sx={{ py: 0, px: 2, bgcolor: "#fafbfc", borderBottom: `1px solid ${T.divider}` }}
        >
          <ScPeriodHistoryPanel
            history={periodHistory}
            unit={unit}
            loading={historyLoading}
            isCurrentPeriod={isCurrent}
            periodRecord={record}
            isPeriodVoided={isVoided}
            isPeriodLocked={isActionLocked}
            onUndoSnapshot={onUndoEntry}
            undoLoadingId={undoLoadingId}
            voidLoadingId={voidLoadingId}
            commuteLoadingId={commuteLoadingId}
          />
        </TableCell>
      </TableRow>
    )}
    </>
  );
};

const groupScPreviousPeriodsByYear = (previousPeriods) => {
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

const EmployeeSCModal = ({
  open,
  onClose,
  employeeSC,
  unit,
  setUnit,
  deptMap,
  empCatLabelMap,
  actionSuccess,
  error,
  commuteLoadingId,
  voidLoadingId,
  undoLoadingId,
  onCommute,
  onVoidPeriod,
  onUndoEntry,
  onTogglePeriodExpand,
  periodHistoryCache = {},
  historyLoadingKeys = {},
  expandedPeriodKeys = {},
  earningsList = [],
  isPeriodLockedForPayroll = null,
}) => {
  if (!employeeSC) return null;

  const deptCode = deptMap[employeeSC.employeeNumber] || null;
  const empCat   = empCatLabelMap[employeeSC.employeeNumber] || null;
  const modalRecords =
    employeeSC.displayRecords || scRecordsForDisplay(employeeSC.records);
  const sortedRecords = [...modalRecords].sort((a, b) => {
    if (b.period_year !== a.period_year) return b.period_year - a.period_year;
    return (toNum(b.period_month) || 0) - (toNum(a.period_month) || 0);
  });
  const currentPeriod = resolveScCurrentDisplayPeriod(sortedRecords);
  const currentKey = currentPeriod ? normalizeScPeriodKey(currentPeriod) : null;
  const previousPeriods = sortedRecords.filter(
    (p) => !currentKey || normalizeScPeriodKey(p) !== currentKey,
  );
  const previousGrouped = groupScPreviousPeriodsByYear(previousPeriods);
  const empEarnings = earningsList.filter(
    (e) => String(e.employee_number) === String(employeeSC.employeeNumber),
  );
  const balRemModal = getScEmployeeDisplayRemaining(employeeSC.records, empEarnings);

  const periodRowProps = (record, isCurrent, rowIndex) => {
    const key = normalizeScPeriodKey(record);
    return {
      record,
      unit,
      isCurrent,
      rowIndex,
      onCommute,
      onVoidPeriod,
      onUndoEntry,
      commuteLoadingId,
      voidLoadingId,
      undoLoadingId,
      earningsList: empEarnings,
      chainRecords: sortedRecords,
      expanded: !!expandedPeriodKeys[key],
      onToggleExpand: onTogglePeriodExpand,
      periodHistory: periodHistoryCache[key] || null,
      historyLoading: !!historyLoadingKeys[key],
      payrollLocked: typeof isPeriodLockedForPayroll === "function"
        ? isPeriodLockedForPayroll(record.employeeNumber, record.period_year, record.period_month)
        : false,
    };
  };

  return (
    <Modal open={open} onClose={onClose} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 1, sm: 2 } }}>
      <Fade in={open}>
        <Paper
          elevation={0}
          sx={{
            width: "100%", maxWidth: 1140, height: "min(82vh, 720px)", display: "flex", flexDirection: "column",
            borderRadius: "10px", overflow: "hidden", fontFamily: T.poppins,
            border: "1px solid rgba(0,0,0,0.1)", boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          }}
        >
          <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", gap: 2, borderBottom: `1px solid ${T.divider}`, bgcolor: "#fafbfc", flexShrink: 0 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: T.poppins, mb: 0.35 }}>
                Service credit balance
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: "1.05rem", color: T.text, fontFamily: T.poppins, lineHeight: 1.25 }} noWrap>
                {employeeSC.fullName}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}>
                <Typography sx={{ fontSize: "0.75rem", color: T.muted, fontFamily: T.poppins }}>ID {employeeSC.employeeNumber}</Typography>
                {deptCode && <DeptBadge code={deptCode} />}
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

          <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            {sortedRecords.length === 0 ? (
              <Box sx={{ py: 8, textAlign: "center" }}>
                <Typography sx={{ color: T.muted, fontSize: "0.85rem", fontFamily: T.poppins }}>No service credit records on file.</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ px: 3, py: 1, borderBottom: `1px solid ${T.divider}`, bgcolor: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                  <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>
                    <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>Service Credit</Box>
                    {" — "}OT-based balance by period
                  </Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>
                    {sortedRecords.length} period{sortedRecords.length !== 1 ? "s" : ""} on record
                  </Typography>
                </Box>

                {actionSuccess && (
                  <Box sx={{ px: 3, pt: 1.25 }}>
                    <Alert severity="success" icon={<CheckIcon />} sx={{ borderRadius: "8px", py: 0.25, fontFamily: T.poppins, "& .MuiAlert-message": { py: 0.5 } }}>
                      {actionSuccess}
                    </Alert>
                  </Box>
                )}
                {error && (
                  <Box sx={{ px: 3, pt: 1.25 }}>
                    <Alert severity="error" sx={{ borderRadius: "8px", py: 0.25, fontFamily: T.poppins, "& .MuiAlert-message": { py: 0.5 } }}>
                      {error}
                    </Alert>
                  </Box>
                )}

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
                      {SC_BALANCE_COLUMNS.map((col) => (
                        <ScBalanceHeaderCell
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
                        <ScPeriodSectionRow label="Current period" variant="current" />
                        <ScPeriodTableRow
                          {...periodRowProps(currentPeriod, true, 0)}
                        />
                      </>
                    )}
                    {previousPeriods.length > 0 && (
                      <>
                        <ScPeriodSectionRow label="Previous balances" variant="divider" />
                        {previousGrouped.map((item, idx) => {
                          if (item.kind === "year") {
                            return <ScPeriodSectionRow key={`year-${item.year}`} label={String(item.year)} variant="year" />;
                          }
                          return (
                            <ScPeriodTableRow
                              key={item.period.id}
                              {...periodRowProps(item.period, false, idx)}
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

          {sortedRecords.length > 0 && (
            <Box sx={{ px: 3, py: 1, borderTop: `1px solid ${T.divider}`, bgcolor: "#fafbfc", flexShrink: 0 }}>
              <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>
                Total remaining across all periods:{" "}
                <Box component="span" sx={{ fontWeight: 700, color: T.accent }}>{fmtScPeriodVal(balRemModal, unit)}</Box>
                <Box component="span" sx={{ color: T.faint, ml: 0.5 }}>({fmtScPeriodAlt(balRemModal, unit)})</Box>
              </Typography>
            </Box>
          )}
        </Paper>
      </Fade>
    </Modal>
  );
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

// Note: SC type UI removed.

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

/** Backend stores audit tokens in remarks; keep in DB, hide in UI. */
const INTERNAL_SC_REMARK_RE =
  /\b(sc_earning:\d+|sc_direct_deduction:\d+|sc_earning_reversal:\d+|sc_earning_delete_reversal:\d+|service_credit_manual_adjust:source_row_\d+|sc_entry_delta_hours:[0-9.]+|sc_used_delta_hours:[0-9.]+)\b/gi;

const SC_TARDINESS_REMARK_RE = /Tardiness deduction:\s*[\d.]+d\s+for\s+[A-Za-z]+\s+\d{4}/gi;

const formatScRemarksForDisplay = (remarks) => {
  let s = String(remarks || "").replace(INTERNAL_SC_REMARK_RE, "");
  return s.split("·").map((p) => p.trim()).filter(Boolean).join(" · ").trim();
};

/** Period row subtitle — hide ledger/voided audit text (shown in Previous records). */
const formatScPeriodRowRemarks = (remarks) => {
  let s = formatScRemarksForDisplay(remarks).replace(SC_TARDINESS_REMARK_RE, "");
  return s.split("·").map((p) => p.trim()).filter(Boolean).join(" · ").trim();
};

/** Per sc_type chain — display remaining uses sc_earnings-aware utils (see serviceCreditBalanceUtils). */
const getScEmployeeLedgerSummary = (records, earningsList = []) => {
  const remaining = getScEmployeeDisplayRemaining(records, earningsList);
  const earnedForColor = remaining;
  return { remaining, earnedForColor };
};

const normalizeScPeriodMonth = (month) => {
  if (month == null || month === "") return "";
  const n = parseInt(month, 10);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? String(n) : String(month).trim();
};

const scPeriodKey = (year, month) =>
  `${parseInt(year, 10) || 0}|${normalizeScPeriodMonth(month)}`;

/** Latest active ledger row per employee + period + sc_type (for save/update targeting). */
const findLatestScForPeriod = (records, employeeNumber, periodYear, periodMonth, scType = "non_commutative") => {
  const emp = String(employeeNumber || "").trim();
  if (!emp) return null;
  const key = scPeriodKey(periodYear, periodMonth);
  const matches = (records || []).filter(
    (r) =>
      String(r.employeeNumber) === emp &&
      String(r.sc_type || "non_commutative") === scType &&
      !r.voided_at &&
      !isScCommutedLocked(r) &&
      scPeriodKey(r.period_year, r.period_month) === key,
  );
  if (!matches.length) return null;
  return pickActiveScPeriodSnapshot(matches);
};

/** Per-month: one ledger row per month. No month: update existing SC for employee/year (no new rows). */
const isPerMonthScTracking = (periodMonth) => Boolean(normalizeScPeriodMonth(periodMonth));

const findScSaveTarget = (
  records,
  employeeNumber,
  periodYear,
  periodMonth,
  scType = "non_commutative",
) => {
  const emp = String(employeeNumber || "").trim();
  if (!emp) return null;
  const py = parseInt(periodYear, 10) || 0;

  if (isPerMonthScTracking(periodMonth)) {
    return findLatestScForPeriod(records, emp, py, periodMonth, scType);
  }

  const chain = (records || []).filter(
    (r) =>
      String(r.employeeNumber) === emp &&
      String(r.sc_type || "non_commutative") === scType &&
      !r.voided_at &&
      !isScCommutedLocked(r),
  );
  if (!chain.length) return null;

  const noMonthForYear = chain.filter(
    (r) =>
      !normalizeScPeriodMonth(r.period_month) && toNum(r.period_year) === py,
  );
  if (noMonthForYear.length) {
    return [...noMonthForYear].sort((a, b) => toNum(b.id) - toNum(a.id))[0];
  }

  const sameYear = chain.filter((r) => toNum(r.period_year) === py);
  const pool = sameYear.length ? sameYear : chain;
  return [...pool].sort((a, b) => toNum(b.id) - toNum(a.id))[0];
};

const getOtFieldFromValues = (otValues, otTypes, key, index) =>
  toNum(otValues[key] ?? otValues[otTypes[index]?.id]);

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
const SCRuleEnginePanel = ({ empCatData, employee }) => {
  if (!employee) return null;
  return (
    <Box sx={{ p: 2, borderRadius: 2, border: `1.5px solid ${T.accentBorder}`, bgcolor: T.accentFaint, mb: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <InfoIcon sx={{ fontSize: 14, color: T.accent }} />
        <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: T.accent, fontFamily: T.poppins }}>
          Service Credit Rules
        </Typography>
        {empCatData?.isDesignated && <Chip label="Designated" size="small" sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: alpha(T.accent, 0.12), color: T.accent, border: `1px solid ${alpha(T.accent, 0.25)}`, fontFamily: T.poppins }} />}
        {empCatData?.is40hrs      && <Chip label="40-hr week" size="small" sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: alpha(T.accent, 0.08), color: T.accent, border: `1px solid ${alpha(T.accent, 0.18)}`, fontFamily: T.poppins }} />}
        {empCatData?.is30hrs      && <Chip label="30-hr week" size="small" sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: alpha(T.accent, 0.08), color: T.accent, border: `1px solid ${alpha(T.accent, 0.18)}`, fontFamily: T.poppins }} />}
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
        {["✔ Credited based on OT hours rendered", "✔ Tracked as Service Credit balance"].map((l, i) => (
          <Typography key={i} sx={{ fontSize: "0.72rem", color: T.accentMid, fontFamily: T.poppins, fontWeight: 600, opacity: 0.9 }}>{l}</Typography>
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
            <Bone w={90} h={30} r={20} />
            <Bone w={36} h={36} r={8} />
          </Box>
        </Box>
      </Box>

      {/* ── Two-column body skeleton ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "4fr 8fr", gap: 2 }}>

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
            {/* SC Type override panel removed */}
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
            {/* Tabs removed */}
            {/* Search + filters */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Bone w="100%" h={32} r={8} />
              <Bone w={120} h={32} r={8} sx={{ flexShrink: 0 }} />
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
                  {/* SC type badges removed */}
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

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [employeeSCModalOpen, setEmployeeSCModalOpen] = useState(false);
  const [selectedEmployeeSC,  setSelectedEmployeeSC]  = useState(null);
  const [actionSuccess,       setActionSuccess]       = useState("");
  const [commuteLoadingId,    setCommuteLoadingId]    = useState(null);
  const [voidLoadingId,       setVoidLoadingId]       = useState(null);
  const [undoLoadingId,       setUndoLoadingId]       = useState(null);
  const [periodHistoryCache,  setPeriodHistoryCache]  = useState({});
  const [expandedPeriodKeys,  setExpandedPeriodKeys]  = useState({});
  const [historyLoadingKeys,  setHistoryLoadingKeys]  = useState({});
  const [commutationWarning,  setCommutationWarning]  = useState(null);
  const [scEarnings,          setScEarnings]          = useState([]);

  const { socket } = useSocket();
  const { isPeriodLockedForPayroll, refreshPayrollKeys } = usePayrollPeriodLock();

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await Promise.all([
        fetchSCRecords(), fetchScEarnings(), fetchEmployees(),
        fetchDeptMap(), fetchEmpCatMap(), fetchOtTypes(),
      ]);
      setPageLoading(false);
    })();
  }, []);

  useEffect(() => { setRecordsPage(0); }, [searchTerm, deptFilter, empCatFilter]);

  useEffect(() => {
    if (employeeSCModalOpen) refreshPayrollKeys();
  }, [employeeSCModalOpen, refreshPayrollKeys]);

  useEffect(() => {
    setOtValues({});
    setOtRemarks("");
    setError("");
  }, [selectedEmployee, periodYear, periodMonth]);

  const clearPeriodHistoryCache = (record) => {
    if (!record) {
      setPeriodHistoryCache({});
      return;
    }
    const key = normalizeScPeriodKey(record);
    setPeriodHistoryCache((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const fetchPeriodHistory = async (record, { force = false } = {}) => {
    if (!record?.employeeNumber) return null;
    const key = normalizeScPeriodKey(record);
    if (!force && periodHistoryCache[key]) return periodHistoryCache[key];

    setHistoryLoadingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/service-credits/service_credit/period-history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          employeeNumber: record.employeeNumber,
          period_year: record.period_year,
          period_month: record.period_month,
          sc_type: record.sc_type || "non_commutative",
        },
      });
      setPeriodHistoryCache((prev) => ({ ...prev, [key]: r.data }));
      return r.data;
    } catch {
      return null;
    } finally {
      setHistoryLoadingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  const togglePeriodExpand = async (record) => {
    const key = normalizeScPeriodKey(record);
    const isOpen = !!expandedPeriodKeys[key];
    if (isOpen) {
      setExpandedPeriodKeys((prev) => ({ ...prev, [key]: false }));
      return;
    }
    setExpandedPeriodKeys((prev) => ({ ...prev, [key]: true }));
    await fetchPeriodHistory(record);
  };

  const refreshModalEmployeeRecords = (allRecords, employeeNumber) => {
    const fresh = allRecords.filter((r) => String(r.employeeNumber) === String(employeeNumber));
    setSelectedEmployeeSC((prev) => {
      if (!prev || String(prev.employeeNumber) !== String(employeeNumber)) return prev;
      return {
        ...prev,
        records: fresh,
        displayRecords: scRecordsForDisplay(fresh),
      };
    });
    return fresh;
  };

  const mergeEmployeeScRecords = (prev, empNum, newRows, fullName = "") => {
    const emp = String(empNum);
    const others = prev.filter((r) => String(r.employeeNumber) !== emp);
    const name = fullName || prev.find((r) => String(r.employeeNumber) === emp)?.fullName || "";
    const merged = (Array.isArray(newRows) ? newRows : []).map((r) => ({
      ...r,
      fullName: r.fullName || name,
    }));
    return [...others, ...merged];
  };

  const prefetchCurrentPeriodHistory = async (records, employeeNumber) => {
    const display = scRecordsForDisplay(records);
    const current = resolveScCurrentDisplayPeriod(display);
    if (current) {
      const key = normalizeScPeriodKey(current);
      setExpandedPeriodKeys((prev) => ({ ...prev, [key]: true }));
      await fetchPeriodHistory(current, { force: true });
    }
  };

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

  const fetchScEarnings = async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await axios.get(`${API_BASE_URL}/api/earnings/sc/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(r.data?.earnings) ? r.data.earnings : Array.isArray(r.data) ? r.data : [];
      setScEarnings(list);
    } catch {
      setScEarnings([]);
    }
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
      const r = await axios.get(`${API_BASE_URL}/api/service-credits/ot-types`, {
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

  useLeaveRealtimeRefresh(() => {
    fetchSCRecords();
    fetchScEarnings();
    fetchEmployees();
    fetchDeptMap();
    fetchEmpCatMap();
    fetchOtTypes();
  });

  useEffect(() => {
    if (!socket) return undefined;
    const handler = (payload) => {
      if (!payload || payload.module === "sc" || !payload.module) {
        fetchSCRecords();
        fetchScEarnings();
      }
    };
    socket.on("earningsChanged", handler);
    return () => socket.off("earningsChanged", handler);
  }, [socket]);

  useEffect(() => {
    if (!employeeSCModalOpen || !selectedEmployeeSC?.employeeNumber) return;
    const emp = String(selectedEmployeeSC.employeeNumber);
    const fresh = scRecords.filter((r) => String(r.employeeNumber) === emp);
    setSelectedEmployeeSC((prev) => {
      if (!prev || String(prev.employeeNumber) !== emp) return prev;
      return {
        ...prev,
        records: fresh,
        displayRecords: scRecordsForDisplay(fresh),
      };
    });
  }, [scRecords, employeeSCModalOpen, selectedEmployeeSC?.employeeNumber]);

  const earningsByEmployee = useMemo(() => {
    const map = {};
    scEarnings.forEach((e) => {
      const k = String(e.employee_number);
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    return map;
  }, [scEarnings]);

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

  // ── Employee options — sorted A→Z by lastName (letters first; specials last) ──
  const employeeOptions = useMemo(() => {
    const withMeta = (Array.isArray(employees) ? employees : []).map((e) => {
      const displayName = buildDisplayName(e);
      const empNo       = (e?.employeeNumber || "").toString().trim();
      return {
        ...e,
        _displayName: displayName,
        _searchKey:   `${displayName} ${empNo}`.toLowerCase(),
      };
    });
    return sortEmployeesByLastName(withMeta);
  }, [employees, buildDisplayName]);

  const selectedEmpCatData = useMemo(
    () => selectedEmployee
      ? (empCatRawMap[selectedEmployee.employeeNumber?.toString()] || null)
      : null,
    [selectedEmployee, empCatRawMap],
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

    return scRecords.filter((r) => {
      const matchSearch =
        (r.fullName?.toLowerCase() || "").includes(s) ||
        (r.employeeNumber?.toString().toLowerCase() || "").includes(s);
      const matchDept = deptFilter === "all" ||
        (deptMap[r.employeeNumber?.toString()] || "") === deptFilter;
      const matchEmpCat = empCatFilter === "all" ||
        (empCatLabelMap[r.employeeNumber?.toString()]?.label || "") === empCatFilter;
      return matchSearch && matchDept && matchEmpCat;
    });
  }, [scRecords, searchTerm, deptFilter, empCatFilter, deptMap, empCatLabelMap]);

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
    return Object.values(acc)
      .map((grp) => ({
        ...grp,
        displayRecords: scRecordsForDisplay(grp.records),
      }))
      .sort((a, b) => compareEmployeesByLastName(a, b));
  }, [filteredRecords, getEmployeeInfo, buildDisplayName]);

  const paginatedGroups = useMemo(() => {
    const s = recordsPage * rowsPerPage;
    return groupedByEmployee.slice(s, s + rowsPerPage);
  }, [groupedByEmployee, recordsPage, rowsPerPage]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const perMonthTracking = isPerMonthScTracking(periodMonth);

  const existingPeriodRecord = useMemo(() => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    if (!empNum) return null;
    return findScSaveTarget(scRecords, empNum, periodYear, periodMonth);
  }, [scRecords, selectedEmployee, periodYear, periodMonth]);

  const assignPeriodGuard = useMemo(() => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    if (!empNum) return { ok: true, error: "" };
    const scType = "non_commutative";
    const chainRecs = scRecords.filter(
      (r) =>
        String(r.employeeNumber) === empNum &&
        String(r.sc_type || "non_commutative") === scType,
    );
    return assertScPeriodAssignableForCredits(chainRecs, periodYear, periodMonth, scType);
  }, [scRecords, selectedEmployee, periodYear, periodMonth]);

  const handleAddSC = async () => {
    const empNum = selectedEmployee?.employeeNumber?.toString().trim();
    if (!empNum) { setError("Please select an employee"); return; }
    if (computedSC.total <= 0) { setError("OT hours must be > 0 to compute SC"); return; }

    const py = parseInt(periodYear, 10) || new Date().getFullYear();
    const pm = periodMonth || null;
    const scType = "non_commutative";

    const chainRecsForGuard = scRecords.filter(
      (r) =>
        String(r.employeeNumber) === empNum &&
        String(r.sc_type || "non_commutative") === scType,
    );
    const assignCheck = assertScPeriodAssignableForCredits(
      chainRecsForGuard,
      py,
      pm,
      scType,
    );
    if (!assignCheck.ok) {
      setError(assignCheck.error);
      return;
    }
    const otRegular = getOtFieldFromValues(otValues, otTypes, "regular", 0);
    const otHoliday = getOtFieldFromValues(otValues, otTypes, "holiday", 1);
    const otNight = getOtFieldFromValues(otValues, otTypes, "night_diff", 2);
    const catSnapshot = JSON.stringify({
      label: selectedEmpCatData?.label || "",
      is30hrs: selectedEmpCatData?.is30hrs || false,
      is40hrs: selectedEmpCatData?.is40hrs || false,
      isTempo: selectedEmpCatData?.isTempo || false,
      isDesignated: selectedEmpCatData?.isDesignated || false,
    });

    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const existing = findScSaveTarget(scRecords, empNum, py, pm, scType);
      const empEarnings = scEarnings.filter((e) => String(e.employee_number) === empNum);
      const chainRecs = scRecords.filter(
        (r) =>
          String(r.employeeNumber) === empNum &&
          String(r.sc_type || "non_commutative") === scType,
      );
      const carryForward = getPriorPeriodScCarryForward(chainRecs, empEarnings, py, pm);

      if (existing?.id) {
        const mergedOtEarned = toNum(existing.earned_hours) + computedSC.total;
        const usedHours = toNum(existing.used_hours);
        const working = {
          ...existing,
          earned_hours: mergedOtEarned,
          used_hours: usedHours,
          carried_forward_hours: toNum(existing.carried_forward_hours) || carryForward,
        };
        const ledger = recomputeScLedgerFields(working, empEarnings);
        const mergedRemarks = [existing.remarks, otRemarks].filter(Boolean).join(" · ").trim() || null;

        await axios.put(
          `${API_BASE_URL}/api/service-credits/service_credit/${existing.id}`,
          {
            sc_type: scType,
            ot_hours_regular: toNum(existing.ot_hours_regular) + otRegular,
            ot_hours_holiday: toNum(existing.ot_hours_holiday) + otHoliday,
            ot_hours_night_diff: toNum(existing.ot_hours_night_diff) + otNight,
            total_ot_hours: toNum(existing.total_ot_hours) + computedSC.totalOT,
            earned_hours: ledger.earned_hours,
            used_hours: ledger.used_hours,
            carried_forward_hours: ledger.carried_forward_hours,
            total_hours: ledger.total_hours,
            remaining_hours: ledger.remaining_hours,
            earning_status: ledger.earning_status,
            remarks: mergedRemarks,
          },
          { headers },
        );
        setSuccessAction("edit");
      } else {
        const addEarned = carryForward + computedSC.total;
        const ledger = recomputeScLedgerFields(
          {
            earned_hours: addEarned,
            used_hours: 0,
            carried_forward_hours: carryForward,
            period_year: py,
            period_month: pm,
            employeeNumber: empNum,
            sc_type: scType,
          },
          empEarnings,
        );

        await axios.post(
          `${API_BASE_URL}/api/service-credits/service_credit`,
          {
            employeeNumber: empNum,
            sc_type: scType,
            ot_hours_regular: otRegular,
            ot_hours_holiday: otHoliday,
            ot_hours_night_diff: otNight,
            total_ot_hours: computedSC.totalOT,
            earned_hours: ledger.earned_hours,
            used_hours: ledger.used_hours,
            carried_forward_hours: ledger.carried_forward_hours,
            total_hours: ledger.total_hours,
            remaining_hours: ledger.remaining_hours,
            earning_status: ledger.earning_status,
            period_year: py,
            period_month: pm,
            remarks: otRemarks || null,
            emp_category_snapshot: catSnapshot,
          },
          { headers },
        );
        setSuccessAction("adding");
      }

      await Promise.all([fetchSCRecords(), fetchScEarnings()]);
      if (employeeSCModalOpen && selectedEmployeeSC && String(selectedEmployeeSC.employeeNumber) === empNum) {
        clearPeriodHistoryCache({ employeeNumber: empNum, period_year: py, period_month: pm, sc_type: scType });
        const scRes = await axios.get(`${API_BASE_URL}/api/service-credits/service_credit`, { headers });
        const all = Array.isArray(scRes.data) ? scRes.data : [];
        setSCRecords(all);
        const fresh = refreshModalEmployeeRecords(all, empNum);
        await prefetchCurrentPeriodHistory(fresh, empNum);
        const key = normalizeScPeriodKey({ period_year: py, period_month: pm });
        if (expandedPeriodKeys[key]) {
          await fetchPeriodHistory(
            { employeeNumber: empNum, period_year: py, period_month: pm, sc_type: scType },
            { force: true },
          );
        }
      }
      setOtValues({});
      setOtRemarks("");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (err) {
      setError(
        "Error saving SC: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCommutationWarning = useCallback((record) => {
    if (!record?.id || isScPeriodVoided(record) || isScCommutedLocked(record)) return;
    const empRecords = scRecords.filter(
      (r) => String(r.employeeNumber) === String(record.employeeNumber),
    );
    const display = scRecordsForDisplay(empRecords, record.sc_type);
    const latest = resolveScCurrentDisplayPeriod(display);
    if (!latest || normalizeScPeriodKey(latest) !== normalizeScPeriodKey(record)) return;
    if (
      typeof isPeriodLockedForPayroll === "function" &&
      isPeriodLockedForPayroll(record.employeeNumber, record.period_year, record.period_month)
    ) {
      setError(PAYROLL_LOCK_TOOLTIP);
      return;
    }
    const latestRow = findLatestScForPeriod(
      scRecords,
      record.employeeNumber,
      record.period_year,
      record.period_month,
      record.sc_type,
    ) || record;
    const empEarnings = scEarnings.filter(
      (e) => String(e.employee_number) === String(record.employeeNumber),
    );
    const remH = getScDisplayRemainingHours(latestRow, empEarnings);
    if (remH <= 0) return;
    setCommutationWarning({ period: latestRow });
  }, [scRecords, scEarnings, isPeriodLockedForPayroll]);

  const handleTransferToCommutation = useCallback(async () => {
    if (!commutationWarning?.period?.id) return;
    const period = commutationWarning.period;
    setCommuteLoadingId(period.id);
    setError("");
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.post(
        `${API_BASE_URL}/commutationRoute/leave_commutation/commute-sc/${period.id}`,
        {},
        { headers },
      );
      setCommutationWarning(null);
      const [scRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/service-credits/service_credit`, { headers }),
        fetchScEarnings(),
      ]);
      const fresh = Array.isArray(scRes.data) ? scRes.data : [];
      setSCRecords(fresh);
      if (selectedEmployeeSC) {
        const empRecords = fresh.filter(
          (r) => String(r.employeeNumber) === String(selectedEmployeeSC.employeeNumber),
        );
        setSelectedEmployeeSC({
          ...selectedEmployeeSC,
          records: empRecords,
          displayRecords: scRecordsForDisplay(empRecords),
        });
      }
      setActionSuccess("Service credit balance recorded for commutation.");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setError("Commutation failed: " + (err.response?.data?.error || err.message));
    } finally {
      setCommuteLoadingId(null);
    }
  }, [commutationWarning, selectedEmployeeSC, scRecords]);

  const handleCommute = handleOpenCommutationWarning;

  const handleVoidPeriod = async (record) => {
    const latest =
      findLatestScForPeriod(
        scRecords,
        record.employeeNumber,
        record.period_year,
        record.period_month,
        record.sc_type,
      ) || record;
    if (!latest?.id) return;
    const empDisplay = scRecordsForDisplay(
      scRecords.filter((r) => String(r.employeeNumber) === String(latest.employeeNumber)),
      latest.sc_type,
    );
    const current = resolveScCurrentDisplayPeriod(empDisplay);
    if (!current || normalizeScPeriodKey(current) !== normalizeScPeriodKey(latest)) {
      setError("Only the latest service credit period can be voided. Prior periods were superseded.");
      return;
    }
    if (isPeriodLockedForPayroll(latest.employeeNumber, latest.period_year, latest.period_month)) {
      setError(PAYROLL_LOCK_TOOLTIP);
      return;
    }
    const label = periodLabel(latest.period_year, latest.period_month);
    if (!window.confirm(
      `This will void the current period SC ledger and all earnings for ${label}. Balances will be recalculated. This cannot be undone.`,
    )) return;
    setVoidLoadingId(latest.id);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(
        `${API_BASE_URL}/api/service-credits/service_credit/${latest.id}/void-period`,
        { headers },
      );
      clearPeriodHistoryCache(latest);
      await Promise.all([fetchSCRecords(), fetchScEarnings()]);
      if (selectedEmployeeSC) {
        const scRes = await axios.get(`${API_BASE_URL}/api/service-credits/service_credit`, { headers });
        const all = Array.isArray(scRes.data) ? scRes.data : [];
        setSCRecords(all);
        const fresh = refreshModalEmployeeRecords(all, selectedEmployeeSC.employeeNumber);
        await prefetchCurrentPeriodHistory(fresh, selectedEmployeeSC.employeeNumber);
        const empChain = all.filter((r) => String(r.employeeNumber) === String(selectedEmployeeSC.employeeNumber));
        const reopened = resolveScCurrentDisplayPeriod(
          scRecordsForDisplay(empChain, latest.sc_type || "non_commutative"),
        );
        if (reopened?.period_year != null) {
          setPeriodYear(String(reopened.period_year));
          setPeriodMonth(
            reopened.period_month != null && String(reopened.period_month).trim() !== ""
              ? String(reopened.period_month)
              : "",
          );
        }
      }
      setActionSuccess(`Voided service credit period ${label}.`);
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
    const periodKey = normalizeScPeriodKey(record);
    const empNum = record.employeeNumber;
    const empName = selectedEmployeeSC?.fullName || "";
    setUndoLoadingId(targetId);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const undoRes = await axios.post(
        `${API_BASE_URL}/api/service-credits/service_credit/${targetId}/undo-entry`,
        {},
        { headers, timeout: 60000 },
      );

      const { period_history: periodHistory, employee_records: employeeRecords } = undoRes.data || {};

      if (periodHistory) {
        setPeriodHistoryCache((prev) => ({ ...prev, [periodKey]: periodHistory }));
      }

      if (Array.isArray(employeeRecords) && employeeRecords.length) {
        setSCRecords((prev) => mergeEmployeeScRecords(prev, empNum, employeeRecords, empName));
        setSelectedEmployeeSC((prev) => {
          if (!prev || String(prev.employeeNumber) !== String(empNum)) return prev;
          return {
            ...prev,
            records: employeeRecords,
            displayRecords: scRecordsForDisplay(employeeRecords),
          };
        });
      }

      setActionSuccess(`Undid last OT entry for ${label}.`);
      setTimeout(() => setActionSuccess(""), 4000);

      // Light background refresh (one employee only) — does not block the undo spinner
      Promise.all([
        axios.get(`${API_BASE_URL}/api/service-credits/service_credit`, {
          headers,
          params: { employeeNumber: empNum },
        }),
        fetchScEarnings(),
      ])
        .then(([scRes]) => {
          if (!Array.isArray(scRes?.data)) return;
          setSCRecords((prev) => mergeEmployeeScRecords(prev, empNum, scRes.data, empName));
          setSelectedEmployeeSC((prev) => {
            if (!prev || String(prev.employeeNumber) !== String(empNum)) return prev;
            return {
              ...prev,
              records: scRes.data,
              displayRecords: scRecordsForDisplay(scRes.data),
            };
          });
        })
        .catch(() => {});
    } catch (err) {
      setError("Undo failed: " + (err.response?.data?.error || err.message));
    } finally {
      setUndoLoadingId(null);
    }
  };

  const openEmployeeSCModal = async (grp) => {
    setEmployeeSCModalOpen(true);
    setExpandedPeriodKeys({});
    setPeriodHistoryCache({});
    refreshPayrollKeys();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_BASE_URL}/api/service-credits/service_credit/sync-carries/${grp.employeeNumber}`,
        {},
        { headers },
      );
      const [scRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/service-credits/service_credit`, { headers }),
        fetchScEarnings(),
      ]);
      const all = Array.isArray(scRes.data) ? scRes.data : [];
      setSCRecords(all);
      const fresh = all.filter((r) => String(r.employeeNumber) === String(grp.employeeNumber));
      const display = scRecordsForDisplay(fresh);
      setSelectedEmployeeSC({ ...grp, records: fresh, displayRecords: display });
      await prefetchCurrentPeriodHistory(fresh, grp.employeeNumber);
    } catch {
      const display = grp.displayRecords || scRecordsForDisplay(grp.records);
      setSelectedEmployeeSC({ ...grp, displayRecords: display });
      await prefetchCurrentPeriodHistory(grp.records || [], grp.employeeNumber);
    }
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
                    <OTIcon sx={{ fontSize: 17, color: T.accent }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins, lineHeight: 1.2 }}>
                      Record Service Credit (OT)
                    </Typography>
                    <Typography sx={{ fontSize: "0.65rem", color: T.muted, fontFamily: T.poppins }}>
                      Enter OT hours to compute and save SC balance
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
                          onChange={(_, v) => { setSelectedEmployee(v); setError(""); }}
                          options={employeeOptions}
                          autoHighlight
                          getOptionLabel={(o) => `${o._displayName || o.fullName || `${o.firstName || ""} ${o.lastName || ""}`.trim()} (${o.employeeNumber})`}
                          filterOptions={(opts, { inputValue: iv }) =>
                            opts.filter((o) => (o._searchKey || "").includes(iv.toLowerCase().trim())).slice(0, 80)}
                          isOptionEqualToValue={(o, v) => o.employeeNumber === v.employeeNumber}
                          noOptionsText="No employees found"
                          renderOption={(props, option) => {
                            const { key, ...rest } = props;
                            const name     = option._displayName || option.fullName || `${option.firstName || ""} ${option.lastName || ""}`.trim();
                            const initials = `${option.lastName?.[0] || ""}${option.firstName?.[0] || ""}`.toUpperCase() || "?";
                            const deptCode = deptMap[option.employeeNumber?.toString()];
                            const empCat   = empCatLabelMap[option.employeeNumber?.toString()];
                            return (
                              <li key={key} {...rest}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.15 }}>
                                  <Avatar sx={{ width: 28, height: 28, bgcolor: T.accent, fontSize: "0.65rem", fontWeight: 700, borderRadius: "6px" }}>{initials}</Avatar>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins, fontSize: "0.78rem", lineHeight: 1.2 }}>{name}</Typography>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                      <Typography variant="caption" sx={{ color: T.faint, fontFamily: T.poppins, fontSize: "0.65rem" }}>#{option.employeeNumber}</Typography>
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
                            {deptMap[selectedEmployee.employeeNumber?.toString()] && (
                              <DeptBadge code={deptMap[selectedEmployee.employeeNumber?.toString()]} />
                            )}
                            {empCatLabelMap[selectedEmployee.employeeNumber?.toString()] && (
                              <EmpCatBadge label={empCatLabelMap[selectedEmployee.employeeNumber?.toString()].label} colorHex={empCatLabelMap[selectedEmployee.employeeNumber?.toString()].colorHex} />
                            )}
                          </Box>
                        )}
                      </Grid>

                      <Grid item xs={12}>
                        <Box sx={{ borderTop: "1px solid rgba(0,0,0,0.06)", pt: 1, mt: 0.25 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
                            <CalendarIcon sx={{ fontSize: 13, color: T.accent }} />
                            <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: alpha(T.text, 0.5), fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                              Recording Period
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
                              <AssignFieldLabel compact hint="Optional — separate record per month">
                                Month
                              </AssignFieldLabel>
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
                                  {MONTHS.map((m) => (
                                    <MenuItem key={m.value} value={m.value} sx={{ fontFamily: T.poppins, fontSize: "0.8rem", py: 0.5 }}>
                                      {m.value ? m.label : (
                                        <Typography sx={{ color: T.faint, fontStyle: "italic", fontFamily: T.poppins, fontSize: "0.8rem" }}>{m.label}</Typography>
                                      )}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>

                      {(periodYear || periodMonth) && (
                        <Grid item xs={12}>
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
                        </Grid>
                      )}
                    </Grid>
                  </AssignFormPanel>

                  {selectedEmployee ? (
                    <>
                      <SCRuleEnginePanel empCatData={selectedEmpCatData} employee={selectedEmployee} />

                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75, px: 0.25 }}>
                        <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.text, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          OT Hours & SC Earned
                        </Typography>
                        <Chip
                          size="small"
                          label={`${otTypes.length} OT type${otTypes.length !== 1 ? "s" : ""}`}
                          sx={{ height: 22, fontSize: "0.65rem", fontWeight: 700, fontFamily: T.poppins, bgcolor: "#fff", border: "1px solid rgba(0,0,0,0.1)" }}
                        />
                      </Box>

                      <Box sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 0.7fr",
                        gap: 1,
                        px: 1.15,
                        py: 0.75,
                        bgcolor: alpha(T.accent, 0.88),
                        borderRadius: "8px 8px 0 0",
                      }}>
                        {["OT Source", "OT Hours Worked", "SC Earned"].map((h, i) => (
                          <Typography key={h} sx={{
                            fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.92)",
                            textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins,
                            textAlign: i === 2 ? "center" : "left",
                          }}>
                            {h}
                          </Typography>
                        ))}
                      </Box>

                      {otTypes.length === 0 ? (
                        <Alert severity="info" sx={{ mb: 1.25, borderRadius: "10px", fontFamily: T.poppins }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: T.poppins }}>
                            No OT types configured. Add OT types via the <strong>/api/service-credits/ot-types</strong> endpoint.
                          </Typography>
                        </Alert>
                      ) : (
                        <Box sx={{
                          display: "flex", flexDirection: "column", gap: 0.6,
                          p: 0.85, mb: 1.25, bgcolor: "#fff", borderRadius: "0 0 8px 8px",
                          border: "1px solid rgba(0,0,0,0.08)", borderTop: "none",
                        }}>
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
                            px: 1.15, py: 1, mt: 0.25, borderRadius: 1.5,
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

                      <Box sx={{ mb: 0.5 }}>
                        <AssignFieldLabel compact>Remarks / Reference</AssignFieldLabel>
                        <FieldInput size="small" fullWidth multiline rows={2} value={otRemarks}
                          onChange={(e) => setOtRemarks(e.target.value)}
                          placeholder="e.g. OT Order No. 2024-01, event name…"
                          sx={assignFieldSx} />
                      </Box>
                    </>
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
                        Choose an employee above to enter OT hours and record Service Credits
                      </Typography>
                    </Box>
                  )}
                </Box>

                {selectedEmployee && (
                  <Box sx={{ px: 2.5, pb: 2, pt: 1, borderTop: `1px solid ${T.divider}`, flexShrink: 0, bgcolor: "#fff" }}>
                    {!assignPeriodGuard.ok && (
                      <Alert severity="warning" sx={{ mb: 1.5, fontSize: "0.75rem", fontFamily: T.poppins }}>
                        {assignPeriodGuard.error}
                      </Alert>
                    )}
                    <Tooltip title={!assignPeriodGuard.ok ? assignPeriodGuard.error : ""} disableHoverListener={assignPeriodGuard.ok}>
                    <span>
                    <AccentButton onClick={handleAddSC} variant="contained" fullWidth
                      startIcon={loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
                      disabled={loading || computedSC.total <= 0 || !assignPeriodGuard.ok}
                      sx={{ height: 40, bgcolor: T.accent, color: "#fff",
                        boxShadow: `0 2px 10px ${alpha(T.accent, 0.32)}`, fontFamily: T.poppins,
                        "&:hover": { bgcolor: T.accentDark },
                        "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important" } }}>
                      {loading
                        ? "Saving…"
                        : computedSC.total > 0
                          ? existingPeriodRecord
                            ? `Add ${fmtHrs(computedSC.total, unit)} to existing SC · ${periodYear}${perMonthTracking && selectedMonthLabel ? ` · ${selectedMonthLabel}` : perMonthTracking ? "" : " (year total)"}`
                            : `Record ${fmtHrs(computedSC.total, unit)} SC for ${periodYear}${selectedMonthLabel ? ` · ${selectedMonthLabel}` : ""}`
                          : "Enter OT hours to compute SC"}
                    </AccentButton>
                    </span>
                    </Tooltip>
                  </Box>
                )}
              </SectionCard>
            </Grid>

            {/* ── RIGHT: Records Panel ── */}
            <Grid item xs={12} lg={8}>
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
                        sx={{ "& .MuiToggleButton-root": { px: 1, py: 0.35, border: `1px solid ${T.accentBorder}`, color: T.muted, "&.Mui-selected": { bgcolor: T.accentFaint, color: T.accent } } }}>
                        <ToggleButton value="grid"><ViewModuleIcon sx={{ fontSize: 14 }} /></ToggleButton>
                        <ToggleButton value="list"><ViewListIcon sx={{ fontSize: 14 }} /></ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <FieldInput size="small" placeholder="Search by name or employee number…"
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: 1, minWidth: 160 }}
                      InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} /> }} />
                    {allDeptCodes.length > 0 && (
                      <FormControl size="small" sx={{ minWidth: 130, flexShrink: 0 }}>
                        <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} displayEmpty
                          startAdornment={<DomainIcon sx={{ fontSize: 14, color: T.accent, mr: 0.5, ml: 0.25 }} />}
                          sx={{ ...selectSx, "& .MuiSelect-select": { py: "7px", fontSize: "0.8rem",
                            fontWeight: deptFilter !== "all" ? 700 : 400,
                            color: deptFilter !== "all" ? T.accent : T.muted, display: "flex", alignItems: "center" } }}>
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
                  {(deptFilter !== "all" || empCatFilter !== "all") && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1, flexWrap: "wrap" }}>
                      <Typography sx={{ fontSize: "0.68rem", color: T.faint, fontFamily: T.poppins }}>Filtered by:</Typography>
                      {deptFilter !== "all" && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: "5px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, cursor: "pointer" }} onClick={() => setDeptFilter("all")}>
                          <DomainIcon sx={{ fontSize: 10, color: T.accent }} />
                          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>{deptFilter}</Typography>
                          <Close sx={{ fontSize: 10, color: T.accent }} />
                        </Box>
                      )}
                      {empCatFilter !== "all" && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: "5px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, cursor: "pointer" }} onClick={() => setEmpCatFilter("all")}>
                          <WorkIcon sx={{ fontSize: 10, color: T.accent }} />
                          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>{empCatFilter}</Typography>
                          <Close sx={{ fontSize: 10, color: T.accent }} />
                        </Box>
                      )}
                    </Box>
                  )}
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
                        const empEarn = earningsByEmployee[grp.employeeNumber] || [];
                        const { remaining: balRem, earnedForColor } = getScEmployeeLedgerSummary(grp.records, empEarn);
                        const overallColor = getStatusColor(balRem, earnedForColor);
                        const initials     = `${grp.lastName?.[0] || ""}${grp.firstName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const deptCode     = deptMap[grp.employeeNumber] || null;
                        const empCat       = empCatLabelMap[grp.employeeNumber] || null;
                        return (
                          <Grid item xs={12} sm={6} md={3} key={grp.employeeNumber} sx={{ display: "flex" }}>
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
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                                pt: 0.75, borderTop: `1px solid ${T.divider}` }}>
                                <Typography sx={{ fontSize: "0.65rem", color: T.faint, fontFamily: T.poppins }}>
                                  {(grp.displayRecords || grp.records).length} period{(grp.displayRecords || grp.records).length !== 1 ? "s" : ""}
                                </Typography>
                                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>
                                  {unit === "hours" ? `${balRem.toFixed(3)}h left` : `${(balRem / 8).toFixed(3)}d left`}
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
                        gridTemplateColumns: "2fr 1fr 1fr 1.2fr", gap: 1, alignItems: "center",
                        bgcolor: alpha(T.accent, 0.04), borderRadius: 1.5, mb: 1 }}>
                        {["Employee", "Dept / Category", "Records", "Balance"].map((col) => (
                          <Typography key={col} sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent,
                            textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: T.poppins }}>{col}</Typography>
                        ))}
                      </Box>
                      {paginatedGroups.map((grp, idx) => {
                        const empEarn = earningsByEmployee[grp.employeeNumber] || [];
                        const { remaining: balRem, earnedForColor } = getScEmployeeLedgerSummary(grp.records, empEarn);
                        const overallColor = getStatusColor(balRem, earnedForColor);
                        const initials     = `${grp.lastName?.[0] || ""}${grp.firstName?.[0] || ""}`.toUpperCase() || grp.fullName?.[0] || "?";
                        const deptCode     = deptMap[grp.employeeNumber] || null;
                        const empCat       = empCatLabelMap[grp.employeeNumber] || null;
                        return (
                          <Box key={grp.employeeNumber} onClick={() => openEmployeeSCModal(grp)}
                            sx={{ px: 1.5, py: 1.25, display: "grid",
                              gridTemplateColumns: "2fr 1fr 1fr 1.2fr", gap: 1, alignItems: "center",
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
                                {(grp.displayRecords || grp.records).length}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: overallColor, fontFamily: T.poppins }}>
                              {unit === "hours" ? `${balRem.toFixed(3)}h` : `${(balRem / 8).toFixed(3)}d`}
                            </Typography>
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

          <EmployeeSCModal
            open={employeeSCModalOpen}
            onClose={() => {
              setEmployeeSCModalOpen(false);
              setSelectedEmployeeSC(null);
              setExpandedPeriodKeys({});
              setPeriodHistoryCache({});
            }}
            employeeSC={selectedEmployeeSC}
            unit={unit}
            setUnit={setUnit}
            deptMap={deptMap}
            empCatLabelMap={empCatLabelMap}
            actionSuccess={actionSuccess}
            error={error}
            commuteLoadingId={commuteLoadingId}
            voidLoadingId={voidLoadingId}
            undoLoadingId={undoLoadingId}
            earningsList={selectedEmployeeSC ? (earningsByEmployee[selectedEmployeeSC.employeeNumber] || []) : []}
            onCommute={handleCommute}
            onVoidPeriod={handleVoidPeriod}
            onUndoEntry={handleUndoEntry}
            onTogglePeriodExpand={togglePeriodExpand}
            periodHistoryCache={periodHistoryCache}
            historyLoadingKeys={historyLoadingKeys}
            expandedPeriodKeys={expandedPeriodKeys}
            isPeriodLockedForPayroll={isPeriodLockedForPayroll}
          />

          <ScCommutationWarningModal
            open={!!commutationWarning}
            onClose={() => !commuteLoadingId && setCommutationWarning(null)}
            onConfirm={handleTransferToCommutation}
            period={commutationWarning?.period ?? null}
            unit={unit}
            earningsList={commutationWarning?.period
              ? scEarnings.filter((e) => String(e.employee_number) === String(commutationWarning.period.employeeNumber))
              : []}
            loading={!!commuteLoadingId}
          />
        </Box>
      </Fade>
    </>
  );
};

export default ServiceCredit;