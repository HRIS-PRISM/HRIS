import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import { useSocket } from "../../contexts/SocketContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Button,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  Autocomplete,
  TextField,
  Alert,
  Fade,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  InputLabel,
  Collapse,
  Paper,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Snackbar,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  EventNote as LeaveIcon,
  WorkHistory as SCIcon,
  AccessTime as CTOIcon,
  Close,
  Person as PersonIcon,
  Search as SearchIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
  CalendarToday as CalIcon,
  MonetizationOn as EarnIcon,
  Pending as PendingIcon,
  Domain as DeptIcon,
  Work as WorkIcon,
  Today as DayIcon,
  Schedule as HourIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  CheckCircleOutline as ApproveIcon,
  CancelOutlined as RejectIcon,
  AccessTimeFilled as LateIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  PersonOff as AbsentIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  DateRange as DateRangeIcon,
  EventAvailable as PresentIcon,
  Calculate as CalculateIcon,
  SwapHoriz as ConvertIcon,
  OpenInNew as OpenInNewIcon,
  RemoveCircleOutline as DeductIcon,
  Receipt as ReceiptIcon,
  MoneyOff as SalaryShortfallIcon,
  Assignment as PayrollAssignmentIcon,
  ViewStream as AbstractTabIcon,
  PlaylistAdd as PlaylistAddIcon,
} from "@mui/icons-material";
import { LeaveInputColumn } from "./EARNINGS/LeaveEarnings";
import { SCInputColumn } from "./EARNINGS/SCEarnings";
import { CTOInputColumn } from "./EARNINGS/CTOEarnings";
import { AttendanceSummary } from "./EARNINGS/AttendanceSummary";
import { RecordsList, DeptBadge, EmpCatBadge } from "./EARNINGS/RecordsList";
import { SalaryShortfallRegistry } from "./EARNINGS/SalaryShortfallRegistry";
import { Abstract } from "./EARNINGS/Abstract";
import { useEarningsRealtimeRefresh } from "./EARNINGS/useEarningsRealtimeRefresh";
import { useRef } from "react";
import {
  getDeductionSourceBalanceDays,
  isDeductionSourceSufficient,
  fetchDeductionCreditSnapshots,
} from "../../utils/deductionSourceBalances";
import { buildFiledLeaveByDate } from "../ATTENDANCE/attendanceLeaveIntegration";
import {
  isApprovedHalfDayDateInSummary,
  buildHalfDayDeductionModalContext,
  formatOfficialClockDisplay,
  MODULE_TYPES,
} from "../../utils/halfDayReview";
import {
  filterRecordsForRegularPayroll,
  postRegularPayrollSubmission,
  payrollAuthHeaders,
} from "../../utils/regularPayrollFromAttendance";
import {
  formatOfficialAttendanceSeconds,
  parseOfficialTimeToSeconds,
} from "../../utils/officialAttendanceFromDailyRows";
import { sortEmployeesByLastName } from "../../utils/sortEmployeesByLastName";
import { fetchOverallAttendanceRow } from "./EARNINGS/SalaryShortfallRegistry";
import { aggregateAttendanceResultsForAbstract } from "./EARNINGS/aggregateAttendanceResultsForAbstract";
import { StepRow, StepProgress, StepPill } from "./EARNINGS/EarningsStepper";
import { LeaveCreditsPanel } from "./EARNINGS/LeaveCreditsPanel";
import { BalanceOverviewPanel } from "./EARNINGS/BalanceOverviewPanel";
import { CategoryRulesPanel } from "./EARNINGS/CategoryRulesPanel";
import { SidePanelTabs } from "./EARNINGS/SidePanelTabs";
import {
  D,
  DeductionDialog,
  DSection,
  EmployeeStrip,
  Tag,
  DayTimeline,
  StatRow,
  AmountLine,
  BalanceAfter,
  NoteToggle,
  ConfirmBlock,
  DialogFooter,
} from "./EARNINGS/DeductionDialogKit";
import { useLeavePeriodData } from "./EARNINGS/useLeavePeriodData";
import {
  resolveCscCategory,
  applyCategoryToDeductionOptions,
  ruleFor,
  RULE,
} from "../../utils/cscLeaveRules";

/**
 * Align with ATTENDANCE/AttendanceSummary: keep saved overall tardiness as-is;
 * expose late-only on `_lateTotal` (from lateTotalTime, else overall − absent − half).
 * Never rewrite overallRenderedOfficialTimeTardiness — that belongs to Attendance Summary.
 */
async function mergeSummaryLateOnlyTardiness(summary) {
  if (!summary) return summary;
  const absentStr =
    summary?.absentTime != null ? String(summary.absentTime).trim() : "";
  const halfStr =
    summary?.halfDayShortfallTime != null
      ? String(summary.halfDayShortfallTime).trim()
      : "";
  let lateStr =
    summary?.lateTotalTime != null &&
    String(summary.lateTotalTime).trim() !== ""
      ? String(summary.lateTotalTime).trim()
      : "";
  if (!lateStr) {
    const overallStr =
      summary?.overallRenderedOfficialTimeTardiness != null
        ? String(summary.overallRenderedOfficialTimeTardiness).trim()
        : "";
    const overallSec = parseOfficialTimeToSeconds(overallStr);
    const absentSec = parseOfficialTimeToSeconds(absentStr) ?? 0;
    const halfSec = parseOfficialTimeToSeconds(halfStr) ?? 0;
    if (overallSec != null) {
      lateStr = formatOfficialAttendanceSeconds(
        Math.max(0, overallSec - absentSec - halfSec),
      );
    }
  }
  return {
    ...summary,
    _lateTotal: lateStr || "",
  };
}

const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.05)",
  accentBorder: "rgba(109,35,35,0.12)",
  headerGrad: "linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)",
  divider: "rgba(0,0,0,0.08)",
  surface: "#ffffff",
  text: "#1a1a1a",
  muted: "#555555",
  faint: "#888888",
  poppins: "'Poppins', sans-serif",
  statusPending: {
    bg: "rgba(0,0,0,0.04)",
    color: "#7a4a00",
    border: "rgba(0,0,0,0.12)",
  },
  statusApproved: {
    bg: "rgba(0,0,0,0.04)",
    color: "#1e4d20",
    border: "rgba(0,0,0,0.12)",
  },
  statusRejected: {
    bg: "rgba(0,0,0,0.04)",
    color: "#6b1a1a",
    border: "rgba(0,0,0,0.12)",
  },
};

const MONTHS = [
  { value: "1", label: "January", short: "Jan" },
  { value: "2", label: "February", short: "Feb" },
  { value: "3", label: "March", short: "Mar" },
  { value: "4", label: "April", short: "Apr" },
  { value: "5", label: "May", short: "May" },
  { value: "6", label: "June", short: "Jun" },
  { value: "7", label: "July", short: "Jul" },
  { value: "8", label: "August", short: "Aug" },
  { value: "9", label: "September", short: "Sep" },
  { value: "10", label: "October", short: "Oct" },
  { value: "11", label: "November", short: "Nov" },
  { value: "12", label: "December", short: "Dec" },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

const getCalendarDays = (year, month) => new Date(year, month, 0).getDate();

const EARN_STATUS = {
  pending: { label: "Pending", ...T.statusPending, icon: PendingIcon },
  approved: { label: "Approved", ...T.statusApproved, icon: CheckIcon },
  rejected: { label: "Rejected", ...T.statusRejected, icon: WarnIcon },
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All", color: "#555" },
  { value: "pending", label: "Pending", color: "#7a4a00" },
  { value: "approved", label: "Approved", color: "#1e4d20" },
  { value: "rejected", label: "Rejected", color: "#6b1a1a" },
];

const monthName = (m) =>
  MONTHS.find((x) => x.value === String(m))?.label || `Month ${m}`;
const monthShort = (m) =>
  MONTHS.find((x) => x.value === String(m))?.short || `M${m}`;
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toHours = (val, unit) => (unit === "days" ? val * 8 : val);
const fmtHrs = (h, unit) =>
  unit === "hours"
    ? `${toNum(h).toFixed(3)} hrs`
    : `${(toNum(h) / 8).toFixed(3)} days`;

const parseHHMM = (val) => {
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes(":")) {
    const parts = str.split(":");
    return (
      Number(parts[0]) +
      Number(parts[1] || 0) / 60 +
      Number(parts[2] || 0) / 3600
    );
  }
  return parseFloat(str) || 0;
};

const hoursToHHMM = (h) => {
  const total = Math.round(h * 3600);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const hrsToHMS = (h) => {
  const totalSec = Math.round(Math.abs(h) * 3600);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
  @keyframes emFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes attPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
  `;

const shimmerKf = `
  @keyframes shimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.55; }
  }`;

const Bone = ({ w = "100%", h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      height: h,
      borderRadius: r,
      background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
      backgroundSize: "800px 100%",
      animation: "shimmer 1.6s infinite linear",
      flexShrink: 0,
      ...sx,
    }}
  />
);

// ─── Conversion defaults ──────────────────────────────────────────────────────
const DEFAULT_HOURS_8 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour",
  day_type: "8hr",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.125).toFixed(3)),
}));
const DEFAULT_HOURS_6 = Array.from({ length: 8 }, (_, i) => ({
  rate_type: "hour",
  day_type: "6hr",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.167).toFixed(3)),
}));
const DEFAULT_MINUTES = Array.from({ length: 60 }, (_, i) => ({
  rate_type: "minute",
  day_type: "minute",
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.002).toFixed(3)),
}));
const DEFAULT_LWP_TABLE = Array.from({ length: 30 }, (_, i) => ({
  d: i + 1,
  e: Number(((i + 1) * 0.04167).toFixed(3)),
}));
const DEFAULT_ABS_TABLE = [
  { a: 0.5, e: 1.229 },
  { a: 1.0, e: 1.208 },
  { a: 1.5, e: 1.188 },
  { a: 2.0, e: 1.167 },
  { a: 2.5, e: 1.146 },
  { a: 3.0, e: 1.125 },
  { a: 3.5, e: 1.104 },
  { a: 4.0, e: 1.083 },
  { a: 4.5, e: 1.063 },
  { a: 5.0, e: 1.042 },
  { a: 5.5, e: 1.021 },
  { a: 6.0, e: 1.0 },
  { a: 6.5, e: 0.979 },
  { a: 7.0, e: 0.958 },
  { a: 7.5, e: 0.938 },
  { a: 8.0, e: 0.917 },
  { a: 8.5, e: 0.854 },
  { a: 9.0, e: 0.833 },
  { a: 9.5, e: 0.875 },
  { a: 10.0, e: 0.833 },
  { a: 10.5, e: 0.813 },
  { a: 11.0, e: 0.792 },
  { a: 11.5, e: 0.771 },
  { a: 12.0, e: 0.75 },
  { a: 12.5, e: 0.729 },
  { a: 13.0, e: 0.708 },
  { a: 13.5, e: 0.687 },
  { a: 14.0, e: 0.667 },
  { a: 14.5, e: 0.646 },
  { a: 15.0, e: 0.625 },
  { a: 15.5, e: 0.604 },
  { a: 16.0, e: 0.583 },
  { a: 16.5, e: 0.562 },
  { a: 17.0, e: 0.542 },
  { a: 17.5, e: 0.521 },
  { a: 18.0, e: 0.5 },
  { a: 18.5, e: 0.479 },
  { a: 19.0, e: 0.458 },
  { a: 19.5, e: 0.437 },
  { a: 20.0, e: 0.417 },
  { a: 20.5, e: 0.396 },
  { a: 21.0, e: 0.375 },
  { a: 21.5, e: 0.354 },
  { a: 22.0, e: 0.333 },
  { a: 22.5, e: 0.312 },
  { a: 23.0, e: 0.292 },
  { a: 23.5, e: 0.271 },
  { a: 24.0, e: 0.25 },
  { a: 24.5, e: 0.229 },
  { a: 25.0, e: 0.208 },
  { a: 25.5, e: 0.187 },
  { a: 26.0, e: 0.167 },
  { a: 26.5, e: 0.146 },
  { a: 27.0, e: 0.125 },
  { a: 27.5, e: 0.104 },
  { a: 28.0, e: 0.083 },
  { a: 28.5, e: 0.062 },
  { a: 29.0, e: 0.042 },
  { a: 29.5, e: 0.021 },
];

function sanitizeDecimal(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Number(n.toFixed(3));
}

const EarningsWireframe = () => (
  <>
    <style>{shimmerKf}</style>
    {/* ── Header card skeleton ── */}
    <Box
      sx={{
        width: "100vw",
        maxWidth: "100%",
        position: "relative",
        left: "63%",
        transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
        pt: { xs: 2, md: 4 },
        pb: 0,
        mt: { xs: 0, md: -5 },
      }}
    >
      {/* Header card skeleton */}
      <Box
        sx={{
          mb: 0,
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
          border: `1px solid rgba(109,35,35,0.12)`,
          animation: "blink 2s ease-in-out infinite",
        }}
      >
        {/* Gradient top bar */}
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
          <Box
            sx={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: "50%",
              bgcolor: "rgba(109,35,35,0.06)",
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.1)",
                flexShrink: 0,
              }}
            />
            <Box>
              <Bone w={220} h={16} sx={{ mb: 1 }} />
              <Bone w={340} h={10} />
            </Box>
          </Box>
          <Bone w={140} h={30} r={8} />
        </Box>

        {/* Employee selector row */}
        <Box
          sx={{
            px: 4,
            py: 2,
            bgcolor: "rgba(109,35,35,0.05)",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: "rgba(109,35,35,0.15)",
              flexShrink: 0,
            }}
          />
          <Bone w={240} h={32} r={8} sx={{ flex: 1, maxWidth: 340 }} />
          <Bone w={160} h={32} r={8} />
          <Bone w={260} h={28} r={8} sx={{ ml: "auto" }} />
        </Box>

        {/* Tab row */}
        <Box
          sx={{
            background: "linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)",
            px: 1,
            pt: 0.75,
            pb: 0,
            display: "flex",
            alignItems: "flex-end",
            gap: 0.5,
          }}
        >
          {[100, 130, 180].map((w, i) => (
            <Box
              key={i}
              sx={{
                px: 2.5,
                py: 1.1,
                borderRadius: "8px 8px 0 0",
                bgcolor: i === 0 ? "rgba(255,255,255,0.95)" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              <Box
                sx={{
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  bgcolor:
                    i === 0 ? "rgba(109,35,35,0.2)" : "rgba(255,255,255,0.25)",
                }}
              />
              <Bone
                w={w}
                h={11}
                sx={{
                  background:
                    i === 0
                      ? `linear-gradient(90deg, rgba(109,35,35,0.1) 25%, rgba(109,35,35,0.2) 50%, rgba(109,35,35,0.1) 75%)`
                      : `linear-gradient(90deg, rgba(255,255,255,0.15) 25%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.15) 75%)`,
                  backgroundSize: "800px 100%",
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>

    {/* ── 3-Column Content skeleton ── */}
    <Box
      sx={{
        width: "100vw",
        maxWidth: "100%",
        position: "relative",
        left: "63%",
        transform: "translateX(-61%)",
        px: { xs: 2, sm: 3, md: 6 },
        pb: 4,
      }}
    >
      <Box
        sx={{
          borderRadius: "0 0 12px 12px",
          border: `1px solid rgba(109,35,35,0.12)`,
          borderTop: "none",
          overflow: { xs: "visible", md: "hidden" },
          bgcolor: "#fff",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          height: { xs: "auto", md: "calc(100vh - 340px)" },
          minHeight: { xs: "unset", md: 480 },
          rowGap: { xs: 2, md: 0 },
          animation: "blink 2s ease-in-out 0.1s infinite",
        }}
      >
        {/* Col 1 — Attendance */}
        <Box
          sx={{
            borderRight: { xs: "none", md: "1px solid rgba(0,0,0,0.08)" },
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* col header */}
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              bgcolor: "rgba(0,0,0,0.02)",
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 13,
                height: 13,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.12)",
              }}
            />
            <Bone w={160} h={10} />
          </Box>
          <Box
            sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            {/* summary card skeleton */}
            <Box
              sx={{
                borderRadius: 2,
                border: "1px solid rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              <Box sx={{ display: "flex", height: 72 }}>
                <Box
                  sx={{
                    width: 52,
                    bgcolor: "rgba(109,35,35,0.04)",
                    borderRight: "1px solid rgba(0,0,0,0.07)",
                  }}
                />
                <Box
                  sx={{
                    flex: 1,
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    justifyContent: "center",
                    borderRight: "1px solid rgba(0,0,0,0.07)",
                  }}
                >
                  <Bone w="70%" h={18} />
                  <Bone w="50%" h={10} />
                </Box>
                <Box
                  sx={{
                    width: 48,
                    bgcolor: "rgba(0,0,0,0.02)",
                    borderRight: "1px solid rgba(0,0,0,0.07)",
                  }}
                />
                <Box sx={{ flex: 1, bgcolor: "rgba(46,125,50,0.04)" }} />
              </Box>
            </Box>
            {/* edit record skeleton */}
            <Box
              sx={{
                borderRadius: 1.5,
                border: "1px solid rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.85,
                  bgcolor: "rgba(0,0,0,0.03)",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Bone w={90} h={10} />
                <Bone w={40} h={22} r={6} />
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1,
                }}
              >
                {[1, 2].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      borderRadius: 1.5,
                      border: "1px solid rgba(0,0,0,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        px: 1,
                        py: 0.4,
                        bgcolor: "rgba(0,0,0,0.03)",
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <Bone w="60%" h={8} />
                    </Box>
                    <Box sx={{ p: 1 }}>
                      <Bone w="80%" h={16} />
                      <Bone w="50%" h={9} sx={{ mt: 0.5 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
            {/* deduction receipt skeleton */}
            <Box
              sx={{
                borderRadius: 1.5,
                border: "1px solid rgba(109,35,35,0.15)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.75,
                  bgcolor: "rgba(109,35,35,0.06)",
                  borderBottom: "1px solid rgba(109,35,35,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
                <Box
                  sx={{
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    bgcolor: "rgba(109,35,35,0.2)",
                  }}
                />
                <Bone w={180} h={9} />
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    borderRadius: 1.25,
                    border: "1px solid rgba(109,35,35,0.12)",
                    overflow: "hidden",
                  }}
                >
                  {[80, 120, 100].map((w, i) => (
                    <Box
                      key={i}
                      sx={{
                        px: 1.25,
                        py: 0.85,
                        borderBottom:
                          i < 2 ? "1px solid rgba(0,0,0,0.06)" : "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Bone w={w} h={10} />
                      <Bone w={50} h={13} r={4} />
                    </Box>
                  ))}
                </Box>
                <Bone w="100%" h={30} r={6} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Col 2 — Input */}
        <Box
          sx={{
            borderRight: { xs: "none", md: "1px solid rgba(0,0,0,0.08)" },
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              bgcolor: "rgba(0,0,0,0.02)",
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 13,
                height: 13,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.12)",
              }}
            />
            <Bone w={180} h={10} />
          </Box>
          <Box
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              flex: 1,
            }}
          >
            <Bone w="55%" h={10} />
            {[1, 2, 3, 4, 5].map((i) => (
              <Box
                key={i}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 1,
                  px: 1.25,
                  py: 0.85,
                  borderRadius: 1.5,
                  border: "1px solid rgba(0,0,0,0.08)",
                  bgcolor: "rgba(0,0,0,0.01)",
                }}
              >
                <Box>
                  <Bone w={80} h={11} sx={{ mb: 0.5 }} />
                  <Bone w={120} h={8} />
                </Box>
                <Bone w={80} h={32} r={6} />
              </Box>
            ))}
          </Box>
          <Box
            sx={{
              px: 2,
              pb: 2,
              pt: 1,
              borderTop: "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
            }}
          >
            <Bone w="100%" h={32} r={8} />
            <Bone w="100%" h={36} r={8} />
          </Box>
        </Box>

        {/* Col 3 — Records */}
        <Box
          sx={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              bgcolor: "rgba(0,0,0,0.02)",
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 13,
                height: 13,
                borderRadius: "50%",
                bgcolor: "rgba(109,35,35,0.12)",
              }}
            />
            <Bone w={150} h={10} />
          </Box>
          {/* type filter bar */}
          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              bgcolor: "rgba(109,35,35,0.02)",
              display: "flex",
              gap: 0.75,
              flexShrink: 0,
            }}
          >
            {[50, 55, 40, 55].map((w, i) => (
              <Bone key={i} w={w} h={20} r={20} />
            ))}
          </Box>
          {/* status filter bar */}
          <Box
            sx={{
              px: 1.5,
              py: 0.6,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              bgcolor: "rgba(0,0,0,0.015)",
              display: "flex",
              gap: 0.75,
              flexShrink: 0,
            }}
          >
            {[60, 65, 68, 65].map((w, i) => (
              <Bone key={i} w={w} h={18} r={20} />
            ))}
          </Box>
          {/* record rows */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 1.5,
              pt: 1.25,
              pb: 1,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid rgba(0,0,0,0.08)",
                  bgcolor: "#fff",
                  animation: `blink 1.6s ease-in-out ${i * 0.1}s infinite`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.75,
                  }}
                >
                  <Box
                    sx={{ display: "flex", gap: 0.75, alignItems: "center" }}
                  >
                    <Bone w={40} h={16} r={20} />
                    <Bone w={80} h={14} />
                    <Bone w={55} h={16} r={20} />
                  </Box>
                  <Bone w={55} h={22} r={6} />
                </Box>
                <Bone w="35%" h={18} sx={{ mb: 0.5 }} />
                <Bone w="60%" h={9} />
              </Box>
            ))}
          </Box>
          {/* pagination */}
          <Box
            sx={{
              px: 1.5,
              py: 0.85,
              borderTop: "1px solid rgba(0,0,0,0.08)",
              bgcolor: "rgba(0,0,0,0.015)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <Bone w={120} h={10} />
            <Box sx={{ display: "flex", gap: 0.4 }}>
              {[1, 2, 3, 4].map((i) => (
                <Bone key={i} w={20} h={20} r={4} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  </>
);

// ─── Styled components ────────────────────────────────────────────────────────
const SectionCard = styled(Card)({
  borderRadius: 12,
  overflow: "hidden",
  background: T.surface,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
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

const AccentButton = styled(Button)({
  borderRadius: 8,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.875rem",
  transition: "all 0.18s ease",
  "&:hover": { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

// ─── Result Pill ──────────────────────────────────────────────────────────────
const ResultPill = ({ label, value, primary = false }) => (
  <Box
    sx={{
      flex: 1,
      py: 1,
      px: 0.75,
      borderRadius: "8px",
      textAlign: "center",
      bgcolor: primary ? T.accent : "rgba(109,35,35,0.06)",
      border: `1px solid ${primary ? T.accent : "rgba(109,35,35,0.14)"}`,
    }}
  >
    <Typography
      sx={{
        fontSize: "0.56rem",
        fontWeight: 700,
        color: primary ? "rgba(255,255,255,0.6)" : alpha(T.accent, 0.5),
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        mb: 0.4,
        fontFamily: T.poppins,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontWeight: 900,
        fontSize: primary ? "1.05rem" : "0.95rem",
        color: primary ? "#fff" : T.accent,
        lineHeight: 1,
        fontFamily: T.poppins,
      }}
    >
      {value}
    </Typography>
  </Box>
);

// ─── Clearable Int Field ──────────────────────────────────────────────────────
const ClearableIntField = ({
  value,
  onChange,
  placeholder,
  min = 0,
  max,
  widgetInputSx,
}) => {
  const [draft, setDraft] = useState(null);
  const [focused, setFocused] = useState(false);
  const displayVal =
    focused && draft !== null ? draft : value === 0 ? "" : String(value);
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder ?? String(min)}
      value={displayVal}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d]/g, "");
        setDraft(raw);
      }}
      onFocus={() => {
        setFocused(true);
        setDraft(value === 0 ? "" : String(value));
      }}
      onBlur={() => {
        setFocused(false);
        let num = parseInt(draft ?? "", 10);
        if (isNaN(num)) num = min;
        if (max !== undefined) num = Math.min(num, max);
        num = Math.max(num, min);
        onChange(num);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={widgetInputSx?.__raw}
    />
  );
};

// ─── Clearable Decimal Field ──────────────────────────────────────────────────
const ClearableDecimalField = ({
  value,
  onChange,
  placeholder,
  min = 0,
  max,
  step = 0.5,
  snapToStep = false,
  widgetInputSx,
}) => {
  const [draft, setDraft] = useState(null);
  const [focused, setFocused] = useState(false);
  const displayVal =
    focused && draft !== null ? draft : value === 0 ? "" : String(value);
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder ?? "0"}
      value={displayVal}
      onChange={(e) => {
        let raw = e.target.value.replace(",", ".");
        raw = raw.replace(/[^\d.]/g, "");
        const dot = raw.indexOf(".");
        if (dot !== -1)
          raw = raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, "");
        setDraft(raw);
      }}
      onFocus={() => {
        setFocused(true);
        setDraft(value === 0 ? "" : String(value));
      }}
      onBlur={() => {
        setFocused(false);
        let num = parseFloat((draft ?? "").replace(",", "."));
        if (!Number.isFinite(num)) num = 0;
        if (snapToStep && step) num = Math.round(num / step) * step;
        if (max !== undefined) num = Math.min(num, max);
        num = Math.max(num, min);
        onChange(num);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={widgetInputSx?.__raw}
    />
  );
};

// ─── Floating Conversion Widget ───────────────────────────────────────────────
const FloatingConversionWidget = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [hours8Table, setHours8Table] = useState(DEFAULT_HOURS_8);
  const [hours6Table, setHours6Table] = useState(DEFAULT_HOURS_6);
  const [minutesTable, setMinutesTable] = useState(DEFAULT_MINUTES);
  const [lwpTable, setLwpTable] = useState(DEFAULT_LWP_TABLE);
  const [absTable, setAbsTable] = useState(DEFAULT_ABS_TABLE);
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [whMode, setWhMode] = useState("forward");
  const [whDayType, setWhDayType] = useState("8hr");
  const [whHours, setWhHours] = useState(0);
  const [whMinutes, setWhMinutes] = useState(0);
  const [revInput, setRevInput] = useState("");
  const [revDraft, setRevDraft] = useState(null);
  const [lcDays, setLcDays] = useState(1);
  const [lcAbs, setLcAbs] = useState(0);

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
            const byHour = new Map(
              (rows || []).map((r) => [Number(r.rate_value), r]),
            );
            const baseRate = Number(
              byHour.get(1)?.decimal_equivalent ?? fallback,
            );
            return Array.from({ length: 8 }, (_, i) => {
              const h = i + 1;
              const found = byHour.get(h);
              return found
                ? {
                    ...found,
                    rate_type: "hour",
                    day_type: dayType,
                    rate_value: h,
                    decimal_equivalent: sanitizeDecimal(
                      found.decimal_equivalent,
                    ),
                  }
                : {
                    rate_type: "hour",
                    day_type: dayType,
                    rate_value: h,
                    decimal_equivalent: sanitizeDecimal(h * baseRate),
                  };
            });
          };
          if (Array.isArray(d.hours8) && d.hours8.length > 0)
            setHours8Table(ensureHours(d.hours8, "8hr", 0.125));
          if (Array.isArray(d.hours6) && d.hours6.length > 0)
            setHours6Table(ensureHours(d.hours6, "6hr", 0.167));
          if (Array.isArray(d.minutes) && d.minutes.length === 60)
            setMinutesTable(d.minutes);
        }
        if (lcRes.status === "fulfilled") {
          const d = lcRes.value.data;
          if (Array.isArray(d.lwp) && d.lwp.length === 30) setLwpTable(d.lwp);
          if (Array.isArray(d.abs) && d.abs.length >= 1) setAbsTable(d.abs);
        }
      } catch {
        /* keep defaults */
      }
      setRatesLoaded(true);
    })();
  }, []);

  const activeHoursTable = whDayType === "6hr" ? hours6Table : hours8Table;

  const whResult = useMemo(() => {
    const defaultHourlyRate = whDayType === "6hr" ? 0.167 : 0.125;
    const hourlyRate = Number(
      activeHoursTable.find((h) => h.rate_value === 1)?.decimal_equivalent ??
        defaultHourlyRate,
    );
    const hEntry = activeHoursTable.find((h) => h.rate_value === whHours);
    const mEntry = minutesTable.find((m) => m.rate_value === whMinutes);
    const hDec =
      whHours === 0
        ? 0
        : Number(
            (hEntry?.decimal_equivalent ?? whHours * hourlyRate).toFixed(3),
          );
    const mDec = whMinutes === 0 ? 0 : (mEntry?.decimal_equivalent ?? 0);
    return { hDec, mDec, total: Number((hDec + mDec).toFixed(3)) };
  }, [whHours, whMinutes, whDayType, activeHoursTable, minutesTable]);

  const reverseConvertLocal = useCallback(
    (totalDecimal) => {
      const defaultRate = whDayType === "6hr" ? 0.167 : 0.125;
      let bestH = 0,
        bestM = 0,
        bestDiff = Infinity;
      for (let h = 0; h <= 8; h++) {
        const hEntry =
          h === 0 ? null : activeHoursTable.find((r) => r.rate_value === h);
        const hDec =
          h === 0
            ? 0
            : Number(
                (hEntry?.decimal_equivalent ?? h * defaultRate).toFixed(3),
              );
        const remainder = Number((totalDecimal - hDec).toFixed(4));
        if (remainder < -0.0015) continue;
        if (remainder <= 0.0015) {
          const diff = Math.abs(remainder);
          if (diff < bestDiff) {
            bestH = h;
            bestM = 0;
            bestDiff = diff;
          }
        } else {
          const mEntry = minutesTable.reduce((best, r) => {
            const d = Math.abs(r.decimal_equivalent - remainder);
            return best === null ||
              d < Math.abs(best.decimal_equivalent - remainder)
              ? r
              : best;
          }, null);
          if (mEntry) {
            const diff = Math.abs(mEntry.decimal_equivalent - remainder);
            if (diff < bestDiff) {
              bestH = h;
              bestM = mEntry.rate_value;
              bestDiff = diff;
            }
          }
        }
      }
      return { hours: bestH, minutes: bestM };
    },
    [whDayType, activeHoursTable, minutesTable],
  );

  const revTotal = parseFloat(revInput) || 0;
  const revResult = useMemo(
    () =>
      whMode === "reverse"
        ? reverseConvertLocal(revTotal)
        : { hours: 0, minutes: 0 },
    [whMode, revTotal, reverseConvertLocal],
  );

  const lcResult = useMemo(() => {
    const daysEntry = lwpTable.find((r) => r.d === lcDays);
    const earned = daysEntry
      ? daysEntry.e
      : parseFloat((lcDays * 0.04167).toFixed(3));
    const absEntry =
      lcAbs > 0 ? absTable.find((r) => Math.abs(r.a - lcAbs) < 0.001) : null;
    const absEarned = absEntry ? absEntry.e : earned;
    return { earned, absEarned };
  }, [lcDays, lcAbs, lwpTable, absTable]);

  const inputLabelSx = {
    fontSize: "0.62rem",
    fontWeight: 700,
    color: alpha(T.accent, 0.45),
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    mb: 0.5,
    fontFamily: T.poppins,
    display: "block",
  };
  const inputStyle = {
    width: "100%",
    height: 34,
    borderRadius: 7,
    fontSize: "0.82rem",
    fontWeight: 700,
    color: T.text,
    padding: "6px 10px",
    border: `1px solid rgba(109,35,35,0.14)`,
    outline: "none",
    backgroundColor: "#fff",
    fontFamily: T.poppins,
    boxSizing: "border-box",
  };
  const toggleGroupSx = {
    "& .MuiToggleButton-root": {
      px: 1.1,
      py: 0.2,
      border: `1px solid rgba(109,35,35,0.14)`,
      fontSize: "0.62rem",
      fontWeight: 700,
      color: T.muted,
      fontFamily: T.poppins,
      minHeight: 26,
      "&.Mui-selected": {
        bgcolor: T.accent,
        color: "#fff",
        borderColor: T.accent,
      },
    },
  };
  const dayTypeToggleSx = {
    "& .MuiToggleButton-root": {
      px: 1.25,
      py: 0.2,
      border: `1px solid rgba(109,35,35,0.14)`,
      fontSize: "0.68rem",
      fontWeight: 700,
      color: T.muted,
      fontFamily: T.poppins,
      minHeight: 26,
      "&.Mui-selected": {
        bgcolor: T.accent,
        color: "#fff",
        borderColor: T.accent,
      },
    },
  };

  return (
    <>
      <Tooltip title="Quick Conversion Tool" placement="left">
        <Box
          onClick={() => setOpen((v) => !v)}
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: open ? T.accentDark : T.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: `0 4px 16px ${alpha(T.accent, 0.45)}`,
            transition: "all 0.2s ease",
            "&:hover": { bgcolor: T.accentDark, transform: "scale(1.08)" },
          }}
        >
          {open ? (
            <Close sx={{ fontSize: 20 }} />
          ) : (
            <CalculateIcon sx={{ fontSize: 22 }} />
          )}
        </Box>
      </Tooltip>
      <Collapse in={open} timeout={200}>
        <Paper
          elevation={0}
          sx={{
            position: "fixed",
            bottom: 125,
            right: 32,
            zIndex: 9998,
            width: 310,
            borderRadius: "12px",
            border: `1px solid rgba(109,35,35,0.14)`,
            boxShadow: `0 8px 32px ${alpha(T.accent, 0.18)}, 0 2px 8px rgba(0,0,0,0.08)`,
            overflow: "hidden",
            fontFamily: T.poppins,
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              background: T.headerGrad,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ConvertIcon
                sx={{ fontSize: 15, color: "rgba(255,255,255,0.85)" }}
              />
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: T.poppins,
                }}
              >
                Quick Converter
              </Typography>
              {!ratesLoaded && (
                <CircularProgress
                  size={10}
                  sx={{ color: "rgba(255,255,255,0.6)" }}
                />
              )}
            </Box>
            <Button
              onClick={() => {
                window.location.href = "/working-hours";
              }}
              size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: "12px !important" }} />}
              sx={{
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "rgba(255,255,255,0.75)",
                textTransform: "none",
                fontFamily: T.poppins,
                px: 1,
                py: 0.25,
                borderRadius: "5px",
                minWidth: 0,
                border: "1px solid rgba(255,255,255,0.25)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.12)", color: "#fff" },
              }}
            >
              View Tables
            </Button>
          </Box>
          <Box
            sx={{
              borderBottom: `1px solid rgba(109,35,35,0.14)`,
              bgcolor: "rgba(109,35,35,0.06)",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="fullWidth"
              sx={{
                minHeight: 36,
                "& .MuiTab-root": {
                  minHeight: 36,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "none",
                  fontFamily: T.poppins,
                  color: T.muted,
                  py: 0,
                  "&.Mui-selected": { color: T.accent },
                },
                "& .MuiTabs-indicator": { bgcolor: T.accent, height: 2 },
              }}
            >
              <Tab label="Working Hours" />
              <Tab label="Leave Credits" />
            </Tabs>
          </Box>
          <Box
            sx={{
              display: activeTab === 0 ? "flex" : "none",
              p: 1.75,
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 0.75,
                flexWrap: "wrap",
              }}
            >
              <ToggleButtonGroup
                value={whDayType}
                exclusive
                onChange={(_, v) => v && setWhDayType(v)}
                size="small"
                sx={dayTypeToggleSx}
              >
                <ToggleButton value="8hr">8-hr</ToggleButton>
                <ToggleButton value="6hr">6-hr</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                value={whMode}
                exclusive
                onChange={(_, v) => v && setWhMode(v)}
                size="small"
                sx={toggleGroupSx}
              >
                <ToggleButton value="forward">H:M → Dec</ToggleButton>
                <ToggleButton value="reverse">Dec → H:M</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {whMode === "forward" && (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography sx={inputLabelSx}>Hours</Typography>
                    <ClearableIntField
                      value={whHours}
                      onChange={setWhHours}
                      placeholder="0"
                      min={0}
                      widgetInputSx={{ __raw: inputStyle }}
                    />
                  </Box>
                  <Box>
                    <Typography sx={inputLabelSx}>Minutes (0–59)</Typography>
                    <ClearableIntField
                      value={whMinutes}
                      onChange={setWhMinutes}
                      placeholder="0"
                      min={0}
                      max={59}
                      widgetInputSx={{ __raw: inputStyle }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 0.75 }}>
                  <ResultPill
                    label="Hours"
                    value={Number(whResult.hDec).toFixed(3)}
                  />
                  <ResultPill
                    label="Total"
                    value={whResult.total.toFixed(3)}
                    primary
                  />
                  <ResultPill
                    label="Mins."
                    value={Number(whResult.mDec).toFixed(3)}
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    p: "6px 10px",
                    borderRadius: "7px",
                    bgcolor: "rgba(109,35,35,0.06)",
                    border: `1px solid rgba(109,35,35,0.14)`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.68rem",
                      color: T.muted,
                      fontWeight: 600,
                      fontFamily: T.poppins,
                    }}
                  >
                    Equivalent:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: T.accent,
                      fontFamily: T.poppins,
                    }}
                  >
                    {whHours}h {whMinutes}m = {whResult.total.toFixed(3)}
                  </Typography>
                  <Chip
                    label={whDayType}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      bgcolor: T.accent,
                      color: "#fff",
                      fontFamily: T.poppins,
                    }}
                  />
                </Box>
              </>
            )}
            {whMode === "reverse" && (
              <>
                <Box>
                  <Typography sx={inputLabelSx}>
                    Decimal total (e.g. 0.875)
                  </Typography>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.000"
                    value={revDraft !== null ? revDraft : revInput}
                    onChange={(e) => {
                      setRevDraft(e.target.value);
                      const n = parseFloat(e.target.value);
                      if (Number.isFinite(n) && n >= 0) setRevInput(String(n));
                    }}
                    onFocus={() => setRevDraft(revInput)}
                    onBlur={() => {
                      const n = parseFloat(revDraft ?? "");
                      setRevInput(
                        Number.isFinite(n) && n >= 0 ? String(n) : "",
                      );
                      setRevDraft(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                </Box>
                <Box sx={{ display: "flex", gap: 0.6 }}>
                  <ResultPill label="Hours" value={`${revResult.hours}h`} />
                  <ResultPill label="Minutes" value={`${revResult.minutes}m`} />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    p: "9px 12px",
                    borderRadius: "9px",
                    bgcolor: T.accent,
                    border: `1px solid ${T.accent}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      color: "rgba(255,255,255,0.78)",
                      fontWeight: 600,
                      fontFamily: T.poppins,
                    }}
                  >
                    Converted:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 850,
                      color: "#fff",
                      fontFamily: T.poppins,
                    }}
                  >
                    {revTotal.toFixed(3)} ≈ {revResult.hours}h{" "}
                    {revResult.minutes}m
                  </Typography>
                  <Chip
                    label={whDayType}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      bgcolor: "#fff",
                      color: T.accent,
                      fontFamily: T.poppins,
                    }}
                  />
                </Box>
              </>
            )}
          </Box>
          <Box
            sx={{
              display: activeTab === 1 ? "flex" : "none",
              p: 1.75,
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}
            >
              <Box>
                <Typography sx={inputLabelSx}>LWP Days (1–30)</Typography>
                <ClearableIntField
                  value={lcDays}
                  onChange={(v) => setLcDays(Math.min(30, Math.max(1, v || 1)))}
                  placeholder="1"
                  min={1}
                  max={30}
                  widgetInputSx={{ __raw: inputStyle }}
                />
              </Box>
              <Box>
                <Typography sx={inputLabelSx}>Abs w/o Pay (0–29.5)</Typography>
                <ClearableDecimalField
                  value={lcAbs}
                  onChange={setLcAbs}
                  placeholder="0"
                  min={0}
                  max={29.5}
                  step={0.5}
                  snapToStep
                  widgetInputSx={{ __raw: inputStyle }}
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 0.75 }}>
              <ResultPill
                label="LWP Earned"
                value={lcResult.earned.toFixed(3)}
                primary
              />
              <ResultPill
                label="Abs w/o Pay Earned"
                value={lcResult.absEarned.toFixed(3)}
              />
            </Box>
            <Box
              sx={{
                p: "6px 10px",
                borderRadius: "7px",
                bgcolor: "rgba(109,35,35,0.06)",
                border: `1px solid rgba(109,35,35,0.14)`,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  color: T.muted,
                  fontWeight: 600,
                  fontFamily: T.poppins,
                  textAlign: "center",
                }}
              >
                Earned at <strong style={{ color: T.accent }}>1.250/mo</strong>{" "}
                · Absents w/o pay reduce credits
              </Typography>
            </Box>
            <Typography
              sx={{
                fontSize: "0.62rem",
                color: T.faint,
                textAlign: "center",
                fontFamily: T.poppins,
              }}
            >
              For the full absence deduction table, click{" "}
              <strong style={{ color: T.accent }}>View Tables</strong> above.
            </Typography>
          </Box>
        </Paper>
      </Collapse>
    </>
  );
};

// ─── Column Header ─────────────────────────────────────────────────────────────
const ColHeader = ({ icon: Icon, label, color = T.accent, children }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      px: 1.5,
      py: 1,
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: "rgba(0,0,0,0.02)",
      flexShrink: 0,
    }}
  >
    <Icon sx={{ fontSize: 13, color }} />
    <Typography
      sx={{
        fontSize: "0.65rem",
        fontWeight: 800,
        color,
        fontFamily: T.poppins,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        flex: 1,
      }}
    >
      {label}
    </Typography>
    {children}
  </Box>
);

// ─── Month/Year Navigator ─────────────────────────────────────────────────────
const MonthYearNavigator = ({ year, month, onChange }) => {
  const now = new Date();
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
  const isFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1);
  const prevMonth = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const nextMonth = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };
  const yearOptions = Array.from(
    { length: 10 },
    (_, i) => now.getFullYear() - 5 + i,
  );
  const calDays = getCalendarDays(year, month);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
        <IconButton
          size="small"
          onClick={prevMonth}
          sx={{ color: T.accent, p: 0.5 }}
        >
          <PrevIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select
            value={month}
            onChange={(e) => onChange(year, Number(e.target.value))}
            sx={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: isCurrent ? "#fff" : T.accent,
              bgcolor: isCurrent ? T.accent : "#fff",
              borderRadius: 2,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: isCurrent ? T.accent : T.accentBorder,
              },
              "& .MuiSelect-icon": { color: isCurrent ? "#fff" : T.accent },
            }}
          >
            {MONTHS.map((m) => (
              <MenuItem
                key={m.value}
                value={Number(m.value)}
                sx={{ fontSize: "0.8rem" }}
              >
                {m.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton
          size="small"
          onClick={nextMonth}
          disabled={isFuture}
          sx={{ color: isFuture ? T.faint : T.accent, p: 0.5 }}
        >
          <NextIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      <Chip
        icon={<DateRangeIcon style={{ fontSize: 11, color: "#555" }} />}
        label={`${calDays} cal. days`}
        size="small"
        sx={{
          height: 20,
          fontSize: "0.62rem",
          fontWeight: 600,
          bgcolor: "rgba(0,0,0,0.05)",
          color: "#444",
          border: "1px solid rgba(0,0,0,0.12)",
        }}
      />
      <FormControl size="small" sx={{ minWidth: 86 }}>
        <Select
          value={year}
          onChange={(e) => onChange(Number(e.target.value), month)}
          sx={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: T.accent,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: T.accentBorder,
            },
            bgcolor: "#fff",
            borderRadius: 2,
          }}
        >
          {yearOptions.map((y) => (
            <MenuItem
              key={y}
              value={y}
              sx={{
                fontSize: "0.8rem",
                fontWeight: y === now.getFullYear() ? 700 : 400,
              }}
            >
              {y}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {!isCurrent && (
        <Tooltip title="Go to current month">
          <IconButton
            size="small"
            onClick={() => onChange(now.getFullYear(), now.getMonth() + 1)}
            sx={{ color: T.accent, p: 0.5 }}
          >
            <CalIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
      {isCurrent && (
        <Chip
          label="Now"
          size="small"
          sx={{
            height: 18,
            fontSize: "0.6rem",
            fontWeight: 700,
            bgcolor: alpha(T.accent, 0.1),
            color: T.accent,
            border: `1px solid ${T.accentBorder}`,
          }}
        />
      )}
    </Box>
  );
};

/**
 * Earnings must consume the Attendance Summary source of truth only:
 * GET /attendance/api/overall_attendance_record (same as ATTENDANCE/AttendanceSummary).
 * Supplemental daily/stats may come from /api/earnings/attendance, but never invent a summary.
 */
const fetchAttendanceForEmployee = async (
  employeeNumber,
  year,
  month,
  token,
) => {
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const headers = { Authorization: `Bearer ${token}` };

  let earningsData = null;
  try {
    const r = await axios.get(
      `${API_BASE_URL}/api/earnings/attendance/${employeeNumber}?year=${year}&month=${month}`,
      { headers },
    );
    earningsData = r.data;
  } catch {
    /* optional enrichment only */
  }

  let summaryRow = null;
  try {
    const r2 = await axios.get(
      `${API_BASE_URL}/attendance/api/overall_attendance_record`,
      {
        params: {
          personID: employeeNumber,
          startDate: startOfMonth,
          endDate: endOfMonth,
        },
        headers,
      },
    );
    const rows = r2.data?.data || (Array.isArray(r2.data) ? r2.data : []);
    if (rows.length > 0) {
      // Prefer exact calendar-month window when multiple overlap; else closest start.
      const exact = rows.find(
        (row) =>
          String(row.startDate || "").slice(0, 10) === startOfMonth &&
          String(row.endDate || "").slice(0, 10) === endOfMonth,
      );
      summaryRow =
        exact ||
        [...rows].sort(
          (a, b) =>
            Math.abs(
              new Date(String(a.startDate).slice(0, 10)) -
                new Date(startOfMonth),
            ) -
            Math.abs(
              new Date(String(b.startDate).slice(0, 10)) -
                new Date(startOfMonth),
            ),
        )[0];
    }
  } catch {
    /* no saved Attendance Summary for this period */
  }

  // Last resort: earnings overlap query also reads overall_attendance_record
  if (!summaryRow && earningsData?.summary) {
    summaryRow = earningsData.summary;
  }

  if (!summaryRow) {
    return earningsData
      ? { ...earningsData, summary: null }
      : {
          employeeNumber,
          year,
          month,
          summary: null,
          stats: {},
          dailyRecords: [],
        };
  }

  const summary = await mergeSummaryLateOnlyTardiness(summaryRow);
  return {
    ...(earningsData || {}),
    employeeNumber,
    year,
    month,
    summary,
    stats: earningsData?.stats || {},
    dailyRecords: earningsData?.dailyRecords || [],
  };
};

// ─── Leave Input Column ────────────────────────────────────────────────────────

const TABS = [
  { id: "deductions", label: "Deductions", shortLabel: "Deduct", icon: DeductIcon },
  { id: "earnings", label: "Earnings", shortLabel: "Earn", icon: EarnIcon },
  {
    id: "salary_shortfall",
    label: "Salary Shortfall",
    shortLabel: "Salary",
    icon: SalaryShortfallIcon,
  },
  {
    id: "abstract",
    label: "ABSTRACT",
    shortLabel: "ABS",
    icon: AbstractTabIcon,
  },
];

/** Tab index → view. The first two share the workspace layout (left column + side panel). */
const TAB_VIEWS = ["deductions", "earnings", "shortfall", "abstract"];

/** Pools shown on the Earnings tab; hidden when the employee's category does not earn them. */
const EARN_POOLS = [
  { id: "leave", label: "Leave (VL / SL)", codes: ["VL", "SL"], icon: LeaveIcon },
  { id: "sc", label: "Service Credit", codes: ["SC"], icon: SCIcon },
  { id: "cto", label: "Compensatory Time Off", codes: ["CTO"], icon: CTOIcon },
];

const inferAttendanceModuleType = (empCat) => {
  const s = String(
    empCat?.typeName || empCat?.category || empCat?.empCat || "",
  ).toLowerCase();
  if (/\b30\b|30\s*hr|30\s*hour/.test(s)) return MODULE_TYPES.FACULTY_30HRS;
  if (s.includes("faculty") || s.includes("designated")) {
    return MODULE_TYPES.DESIGNATED_40HRS;
  }
  return MODULE_TYPES.NON_TEACHING;
};

/**
 * DeductHalfDayModal (half-day attendance deduction)
 *
 * Props:
 *   open      {boolean}  – controls dialog visibility
 *   onClose   {function}  – called when user cancels / closes
 *   onConfirm {function}  – async ({ remark: string, rateDecimal: number }) => void
 *   employee  {object}    – { employeeNumber, fullName, category/empCat }
 *   date      {string}    – ISO date string "YYYY-MM-DD"
 *   creditSnapshots – from assignment-balances + SC + CTO APIs (remaining_hours / totalRemaining)
 *   creditsLoading – while true, balance chips are indeterminate and confirm stays disabled
 *   suggestedRateDecimal {string|number} – suggested half-day rate decimal (relative to `hoursPerDay`)
 *   hoursPerDay {number}               – normalized clock-hours per day for this policy row
 *   deductionOptions {Array<{value:string,label:string}>} – from GET /api/deductions/options
 *   chargeTo {string} – selected deduction source code (e.g. VL, CTO, SALARY_DEDUCTION)
 *   onChargeToChange {(code: string) => void} – refetch policy suggestion when source changes
 *   attendanceContext – from buildHalfDayDeductionModalContext (official times, system tardiness)
 */
const DeductHalfDayVLModal = ({
  open,
  onClose,
  onConfirm,
  employee,
  date,
  creditSnapshots = null,
  creditsLoading = false,
  suggestedRateDecimal,
  hoursPerDay = 8,
  deductionOptions = [],
  chargeTo = "VL",
  onChargeToChange,
  attendanceContext = null,
}) => {
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeduction, setConfirmDeduction] = useState(false);
  const BASE_HOURS_PER_DAY = 8;
  const effectiveHoursPerDay =
    Number.isFinite(hoursPerDay) && hoursPerDay > 0
      ? hoursPerDay
      : BASE_HOURS_PER_DAY;
  const initPolicyRate =
    toNum(suggestedRateDecimal) > 0 ? toNum(suggestedRateDecimal) : 0.5;
  const initDisplayDays =
    (initPolicyRate * effectiveHoursPerDay) / BASE_HOURS_PER_DAY;

  const [deductDaysRaw, setDeductDaysRaw] = useState(String(initDisplayDays));
  const [deductHoursRaw, setDeductHoursRaw] = useState(
    String(Number((initDisplayDays * BASE_HOURS_PER_DAY).toFixed(3))),
  );

  const handleDeductDaysChange = (raw) => {
    setDeductDaysRaw(raw);
    const n = Number(raw);
    if (raw === "") {
      setDeductHoursRaw("");
      return;
    }
    if (Number.isFinite(n)) {
      setDeductHoursRaw(String(Number((n * BASE_HOURS_PER_DAY).toFixed(3))));
    }
  };

  const handleDeductHoursChange = (raw) => {
    setDeductHoursRaw(raw);
    const n = Number(raw);
    if (raw === "") {
      setDeductDaysRaw("");
      return;
    }
    if (Number.isFinite(n)) {
      setDeductDaysRaw(String(Number((n / BASE_HOURS_PER_DAY).toFixed(3))));
    }
  };

  const MODAL_T = {
    accent: "#6d2323",
    accentDark: "#5a1d1d",
    accentFaint: "rgba(109,35,35,0.05)",
    accentBorder: "rgba(109,35,35,0.12)",
    divider: "rgba(0,0,0,0.08)",
    surface: "#ffffff",
    text: "#1a1a1a",
    muted: "#555555",
    faint: "#888888",
    poppins: "'Poppins', sans-serif",
    balOk: "#2e7d32",
    balBad: "#c62828",
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name = "") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("");

  const creditCtx = useMemo(
    () => ({
      assignmentMap: creditSnapshots?.assignmentMap ?? {},
      scRemainingHours: creditSnapshots?.scRemainingHours ?? 0,
      ctoRemainingHours: creditSnapshots?.ctoRemainingHours ?? 0,
      salaryFallbackDays: null,
    }),
    [creditSnapshots],
  );

  const chargeU = String(chargeTo || "").toUpperCase();
  const balanceBefore =
    chargeU === "SALARY_DEDUCTION"
      ? null
      : getDeductionSourceBalanceDays(chargeTo, creditCtx);
  const deductDaysNum = toNum(deductDaysRaw);
  const balanceAfter =
    balanceBefore == null ? null : balanceBefore - deductDaysNum;
  const chargeLabel =
    deductionOptions.find((o) => o.value === chargeTo)?.label || chargeTo;
  const showCreditLedgerPreview =
    chargeU !== "SALARY_DEDUCTION" && balanceBefore != null;
  const selectedSufficient =
    creditsLoading ||
    chargeU === "SALARY_DEDUCTION" ||
    isDeductionSourceSufficient(balanceBefore, deductDaysNum, chargeTo);
  const selectedHasBalance =
    chargeU !== "SALARY_DEDUCTION" && (balanceBefore ?? 0) > 1e-6;
  const selectedBalancePositive =
    chargeU === "SALARY_DEDUCTION" || selectedSufficient || selectedHasBalance;

  const applySystemDeductionAmount = () => {
    const hrs = toNum(attendanceContext?.suggestedDeductionHours);
    const days = toNum(attendanceContext?.suggestedDeductionDays);
    if (hrs > 0) {
      setDeductHoursRaw(String(Number(hrs.toFixed(3))));
      setDeductDaysRaw(
        String(Number((days > 0 ? days : hrs / BASE_HOURS_PER_DAY).toFixed(3))),
      );
      return;
    }
    const initPolicyRate =
      toNum(suggestedRateDecimal) > 0 ? toNum(suggestedRateDecimal) : 0.5;
    const initDisplayDays =
      (initPolicyRate * effectiveHoursPerDay) / BASE_HOURS_PER_DAY;
    setDeductDaysRaw(String(initDisplayDays));
    setDeductHoursRaw(
      String(Number((initDisplayDays * BASE_HOURS_PER_DAY).toFixed(3))),
    );
  };

  useEffect(() => {
    if (!open) return;
    applySystemDeductionAmount();
    setRemark("");
    setError("");
    setConfirmDeduction(false);
  }, [open, suggestedRateDecimal, effectiveHoursPerDay, attendanceContext]);

  const sched = attendanceContext?.officialSchedule;
  const showOfficialSchedule =
    sched &&
    (sched.officialTimeIN ||
      sched.officialBreaktimeIN ||
      sched.officialBreaktimeOUT ||
      sched.officialTimeOUT);

  const handleConfirm = async () => {
    try {
      const displayDaysNum =
        toNum(deductDaysRaw) > 0
          ? toNum(deductDaysRaw)
          : toNum(deductHoursRaw) / BASE_HOURS_PER_DAY;
      if (!(displayDaysNum > 0)) {
        setError("Enter a valid deduction amount (days or hours).");
        return;
      }
      const deductionHours = displayDaysNum * BASE_HOURS_PER_DAY;
      const rateDecimalNum =
        effectiveHoursPerDay > 0 ? deductionHours / effectiveHoursPerDay : 0;
      if (!(rateDecimalNum > 0)) {
        setError("Deduction amount could not be converted for policy apply.");
        return;
      }
      setSaving(true);
      setError("");
      await onConfirm({ remark: remark.trim(), rateDecimal: rateDecimalNum });
      setRemark("");
      onClose();
    } catch (err) {
      setError(
        "Deduction failed: " +
          (err?.response?.data?.message || err?.message || "Unknown error"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setRemark("");
    setError("");
    onClose();
  };

  const empName = employee?.fullName || employee?.full_name || "—";
  const empNum = employee?.employeeNumber || employee?.employee_number || "—";
  const empCat = employee?.category || employee?.empCat || "";

  const clock = (v) => {
    const s = String(v || "").trim();
    if (!s) return "—";
    const m = s.match(/^(\d{1,3}):(\d{2})/);
    return m ? `${parseInt(m[1], 10)}:${m[2]}` : s;
  };
  const systemHours = toNum(attendanceContext?.suggestedDeductionHours);
  const hoursNum = toNum(deductHoursRaw);
  const poolName = chargeU === "SALARY_DEDUCTION" ? "salary" : chargeLabel;

  return (
    <DeductionDialog
      open={open}
      onClose={handleClose}
      busy={saving}
      title="Half-day deduction"
      subtitle={`Charged to ${chargeLabel}`}
      footer={
        <DialogFooter
          onCancel={handleClose}
          onConfirm={handleConfirm}
          busy={saving}
          disabled={creditsLoading || !confirmDeduction || (!selectedSufficient && chargeU !== "SALARY_DEDUCTION")}
        />
      }
    >
      <DSection>
        <EmployeeStrip
          name={empName}
          meta={`${empNum}${empCat ? ` · ${empCat}` : ""}`}
          balanceLabel={showCreditLedgerPreview ? `${chargeU} balance` : null}
          balanceText={creditsLoading ? "…" : showCreditLedgerPreview ? `${balanceBefore.toFixed(3)} d` : ""}
          balanceColor={selectedBalancePositive ? D.vl : D.bad}
        />
      </DSection>

      {deductionOptions.length > 1 && (
        <DSection title="Charge to">
          <Select
            fullWidth
            size="small"
            value={chargeTo}
            onChange={(e) => onChargeToChange?.(e.target.value)}
            disabled={saving}
            sx={{ borderRadius: "10px", fontFamily: D.font, fontSize: "0.85rem" }}
          >
            {deductionOptions.map((o) => {
              const oCode = String(o.value || "").toUpperCase();
              const bal = getDeductionSourceBalanceDays(o.value, creditCtx);
              const ok = oCode === "SALARY_DEDUCTION" || isDeductionSourceSufficient(bal, deductDaysNum, o.value) || (bal ?? 0) > 1e-6;
              return (
                <MenuItem key={o.value} value={o.value}>
                  <Box sx={{ width: "100%" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, width: "100%" }}>
                      <span>{o.label}</span>
                      <Box component="span" sx={{ fontSize: "0.72rem", fontWeight: 700, color: ok ? D.ok : D.bad }}>
                        {oCode === "SALARY_DEDUCTION" ? "—" : creditsLoading ? "…" : `${(bal ?? 0).toFixed(3)} d`}
                      </Box>
                    </Box>
                    {o.existingBalanceOnly && (
                      <Box sx={{ fontSize: "0.66rem", color: "#8a5d06" }}>Existing balance only · not earned by this category</Box>
                    )}
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
          {deductionOptions.find((o) => o.value === chargeTo)?.existingBalanceOnly && (
            <Typography sx={{ mt: 0.75, fontSize: "0.72rem", color: "#8a5d06", fontFamily: D.font }}>
              {deductionOptions.find((o) => o.value === chargeTo)?.categoryNote}
            </Typography>
          )}
        </DSection>
      )}

      <DSection title="What happened">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, fontFamily: D.font }}>{fmtDate(date)}</Typography>
          <Tag>Half day detected</Tag>
        </Box>
        {showOfficialSchedule ? (
          <DayTimeline
            timeIn={sched.officialTimeIN}
            breakIn={sched.officialBreaktimeIN}
            breakOut={sched.officialBreaktimeOUT}
            timeOut={sched.officialTimeOUT}
          />
        ) : (
          <Typography sx={{ fontSize: "0.74rem", color: D.mute, fontFamily: D.font, my: 1.25 }}>No official schedule on file for this date.</Typography>
        )}
        {attendanceContext && (
          <StatRow
            items={[
              { label: "Scheduled", value: clock(attendanceContext.maxOfficialTotal) },
              { label: "Worked", value: clock(attendanceContext.renderedTotal), tone: "ok" },
              { label: "Short", value: clock(attendanceContext.totalTardiness), tone: "bad" },
            ]}
          />
        )}
      </DSection>

      <DSection title="What will be deducted">
        <AmountLine
          hours={deductHoursRaw}
          days={deductDaysNum}
          onHoursChange={handleDeductHoursChange}
          disabled={saving}
          onReset={systemHours > 0 ? applySystemDeductionAmount : null}
          resetLabel={`Reset to ${clock(attendanceContext?.totalTardiness)}`}
        />
        {systemHours > 0 && Math.abs(hoursNum - systemHours) > 1e-6 && (
          <Typography sx={{ fontSize: "0.72rem", color: "#8a5d06", fontFamily: D.font, mt: 1 }}>
            Changed from the system value ({clock(attendanceContext?.totalTardiness)} short time).
          </Typography>
        )}
      </DSection>

      <DSection title="Balance after">
        <BalanceAfter
          before={showCreditLedgerPreview && !creditsLoading ? balanceBefore : null}
          after={showCreditLedgerPreview && !creditsLoading ? balanceAfter : null}
          poolLabel={chargeLabel}
          salaryText={
            chargeU === "SALARY_DEDUCTION"
              ? `Recorded as a salary deduction (${deductDaysNum.toFixed(3)} day). No leave credits are used.`
              : creditsLoading
                ? "Loading balance…"
                : undefined
          }
        />
        <NoteToggle value={remark} onChange={setRemark} disabled={saving} />
      </DSection>

      <DSection last>
        <ConfirmBlock
          warning={
            chargeU === "SALARY_DEDUCTION" ? (
              <>This records <b>{deductDaysNum.toFixed(3)} day</b> of salary deduction for this half day. No leave credits are posted.</>
            ) : (
              <>This deducts <b>{deductDaysNum.toFixed(3)} days</b>{" "}from the employee&apos;s {poolName} balance. It can only be undone by a manual adjustment.</>
            )
          }
          checked={confirmDeduction}
          onChange={setConfirmDeduction}
          disabled={saving || creditsLoading}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1.25, py: 0.25, fontSize: "0.72rem", borderRadius: "10px" }}>{error}</Alert>
        )}
      </DSection>
    </DeductionDialog>
  );
};

/** Shared reference-data load (dedupes React Strict Mode double mount). */
let earningsReferenceBootstrap = null;

async function loadEarningsReferenceData(token) {
  if (earningsReferenceBootstrap) return earningsReferenceBootstrap;
  const h = { Authorization: `Bearer ${token}` };
  earningsReferenceBootstrap = Promise.allSettled([
    axios.get(`${API_BASE_URL}/users`, { headers: h }),
    axios.get(`${API_BASE_URL}/personalinfo/person_table`, { headers: h }),
    axios.get(`${API_BASE_URL}/api/department-assignment`, { headers: h }),
    axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`, {
      headers: h,
    }),
    axios.get(
      `${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`,
      {
        headers: h,
      },
    ),
  ]).catch((err) => {
    earningsReferenceBootstrap = null;
    throw err;
  });
  return earningsReferenceBootstrap;
}

// ─── Main Component ────────────────────────────────────────────────────────────
const EarningsManagement = () => {
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const now = new Date();
  /** "deductions" | "earnings" (shared workspace) | "shortfall" | "abstract" */
  const [view, setView] = useState("deductions");
  /** Earn step pool: index into TABS (0 Leave, 1 SC, 2 CTO). */
  const [earnPool, setEarnPool] = useState(0);
  const [recordsCount, setRecordsCount] = useState(0);

  /**
   * Content area fills the space between its top edge and the page footer, so the bottom of the
   * panels (e.g. "Ready for payroll") is never hidden behind the footer. The header above it varies
   * in height (employee row, wrapping), so a fixed calc() is not reliable.
   */
  const contentNodeRef = useRef(null);
  const headerObserverRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);
  const measureContentArea = useCallback(() => {
    const el = contentNodeRef.current;
    if (!el) return;
    const FOOTER_AND_GAP = 76; // app footer (~52px) + breathing room
    const top = el.getBoundingClientRect().top + window.scrollY;
    setContentHeight(Math.max(480, Math.round(window.innerHeight - top - FOOTER_AND_GAP)));
  }, []);
  // Callback ref: the area mounts only after the loading placeholder, so measure on attach and
  // re-measure whenever the header block above it changes height.
  const contentAreaRef = useCallback(
    (node) => {
      headerObserverRef.current?.disconnect();
      headerObserverRef.current = null;
      contentNodeRef.current = node;
      if (!node) return;
      measureContentArea();
      const header = node.parentElement?.parentElement?.previousElementSibling;
      if (header && typeof ResizeObserver !== "undefined") {
        headerObserverRef.current = new ResizeObserver(measureContentArea);
        headerObserverRef.current.observe(header);
      }
    },
    [measureContentArea],
  );
  useEffect(() => {
    window.addEventListener("resize", measureContentArea);
    return () => {
      window.removeEventListener("resize", measureContentArea);
      headerObserverRef.current?.disconnect();
    };
  }, [measureContentArea]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeAutocomplete, setShowEmployeeAutocomplete] =
    useState(true);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const employeePickerInputRef = useRef(null);
  const [deptMap, setDeptMap] = useState({});
  const [empCatMap, setEmpCatMap] = useState({});
  const [typeConfigs, setTypeConfigs] = useState([]);
  const [catFilter, setCatFilter] = useState("");
  const [unit, setUnit] = useState("days");
  const [pageLoading, setPageLoading] = useState(true);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [balanceKey, setBalanceKey] = useState(0);
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttLoading] = useState(false);
  const [vlReceiptRefreshKey, setVlReceiptRefreshKey] = useState(0);

  const [payrollHandoffRecords, setPayrollHandoffRecords] = useState(null);
  const [payrollInfoDialog, setPayrollInfoDialog] = useState({
    open: false,
    title: "",
    message: "",
    isError: false,
    /** When true, show Continue to payroll (clears handoff, navigates to payroll table). */
    continueToPayroll: false,
  });
  const [payrollPartialOpen, setPayrollPartialOpen] = useState(false);
  const [payrollPartialPayload, setPayrollPartialPayload] = useState(null);

  // ── Add to Abstract — lifted up so it persists across tab switches and can
  // render below the Earnings Records card on the Leave/SC/CTO tabs ─────────
  const [manualAbstractRows, setManualAbstractRows] = useState([]);
  /** attendance_result rows on file for the selected employee/month — the Abstract lists these on its own. */
  const [abstractPersisted, setAbstractPersisted] = useState({ key: "", count: 0, loading: false });
  const [addingManualAbstract, setAddingManualAbstract] = useState(false);
  const [manualAbstractSnackbar, setManualAbstractSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  // Gate: Add to Abstract only unlocks once at least one Leave/SC/CTO earning
  // has been approved for the selected employee/period.
  const [approvedEarningsInfo, setApprovedEarningsInfo] = useState({
    checking: false,
    hasApproved: false,
    approvedCount: 0,
  });

  // ── VL Half-Day Deduction (parent-owned to control placement) ─────────────────
  const [deductedVlHalfDates, setDeductedVlHalfDates] = useState([]);
  const [vlHalfModalOpen, setVlHalfModalOpen] = useState(false);
  const [vlHalfModalLoading, setVlHalfModalLoading] = useState(false);
  const [vlHalfCertify, setVlHalfCertify] = useState(false);
  const [vlHalfRateDecimal, setVlHalfRateDecimal] = useState("0.5");
  const [vlHalfSuggestion, setVlHalfSuggestion] = useState(null);
  const [vlHalfSelectedDate, setVlHalfSelectedDate] = useState("");
  const [vlHalfError, setVlHalfError] = useState("");
  const [vlHalfDeductionOptions, setVlHalfDeductionOptions] = useState([]);
  const [vlHalfChargeTo, setVlHalfChargeTo] = useState("VL");
  const [vlHalfCreditSnapshots, setVlHalfCreditSnapshots] = useState(null);
  const [vlHalfAttendanceContext, setVlHalfAttendanceContext] = useState(null);
  const [filedLeaveByDate, setFiledLeaveByDate] = useState({});

  // ── Stepper workflow (Leave assignment → Attendance → Deduct → Earn) ─────────
  /** Open step key (one at a time): "att" | "ded" | "earn" | null */
  const [openStep, setOpenStep] = useState(null);
  const [balancePool, setBalancePool] = useState("VL");
  const [deductStatus, setDeductStatus] = useState(null);
  const [attendanceLoadedAt, setAttendanceLoadedAt] = useState(null);
  /** "employee|year|month" the current attendanceData was loaded for. */
  const [attendanceLoadedFor, setAttendanceLoadedFor] = useState("");
  const autoOpenRef = useRef({ key: "", next: null });

  const handleMonthChange = useCallback((y, m) => {
    setPeriodYear(y);
    setPeriodMonth(m);
  }, []);
  const handleBalanceChanged = useCallback(
    () => setBalanceKey((k) => k + 1),
    [],
  );
  const handleRecordsRefresh = useCallback(
    () => setRecordsRefreshKey((k) => k + 1),
    [],
  );

  const fetchAttendance = useCallback(
    async (opts) => {
      const silent = opts?.silent === true;
      if (!selectedEmployee) {
        setAttendanceData(null);
        return;
      }
      if (!silent) setAttLoading(true);
      const token = localStorage.getItem("token");
      try {
        const data = await fetchAttendanceForEmployee(
          selectedEmployee.employeeNumber,
          periodYear,
          periodMonth,
          token,
        );
        setAttendanceData(data);
        setAttendanceLoadedAt(new Date());
      } finally {
        setAttendanceLoadedFor(
          `${selectedEmployee.employeeNumber}|${periodYear}|${periodMonth}`,
        );
        if (!silent) setAttLoading(false);
      }
    },
    [selectedEmployee, periodYear, periodMonth],
  );

  /** Records sent to regular payroll: navigation handoff from Attendance Summary, or current month summary when you open Earnings directly. */
  const payrollRecordsForSubmit = useMemo(() => {
    if (
      Array.isArray(payrollHandoffRecords) &&
      payrollHandoffRecords.length > 0
    ) {
      return payrollHandoffRecords;
    }
    const summary = attendanceData?.summary;
    if (!summary || !selectedEmployee?.employeeNumber) return null;
    const personID =
      summary.personID ??
      summary.employeeNumber ??
      selectedEmployee.employeeNumber;
    const { startDate, endDate } = summary;
    if (!personID || !startDate || !endDate) return null;
    return [{ ...summary, personID: String(personID) }];
  }, [
    payrollHandoffRecords,
    attendanceData?.summary,
    selectedEmployee?.employeeNumber,
  ]);

  const fetchDeductedVlHalfDates = useCallback(async () => {
    if (!selectedEmployee?.employeeNumber) {
      setDeductedVlHalfDates([]);
      return;
    }

    const y = parseInt(periodYear, 10);
    const m = parseInt(periodMonth, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      setDeductedVlHalfDates([]);
      return;
    }

    const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    setDeductedVlHalfDates([]);
    const token = localStorage.getItem("token");

    try {
      const r = await axios.post(
        `${API_BASE_URL}/leaveRoute/leave_request/halfday-deduction-applied-dates`,
        {
          employeeNumber: selectedEmployee.employeeNumber,
          leave_code: "*",
          startDate,
          endDate,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const dates = Array.isArray(r.data?.dates) ? r.data.dates : [];
      setDeductedVlHalfDates(dates);
    } catch (e) {
      setDeductedVlHalfDates([]);
    }
  }, [selectedEmployee, periodYear, periodMonth]);

  const fetchFiledLeaveByDate = useCallback(async () => {
    if (!selectedEmployee?.employeeNumber) {
      setFiledLeaveByDate({});
      return;
    }
    const y = parseInt(periodYear, 10);
    const m = parseInt(periodMonth, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      setFiledLeaveByDate({});
      return;
    }
    const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const token = localStorage.getItem("token");
    try {
      const r = await axios.get(
        `${API_BASE_URL}/leaveRoute/leave_request/${selectedEmployee.employeeNumber}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const rows = Array.isArray(r.data) ? r.data : [];
      setFiledLeaveByDate(buildFiledLeaveByDate(rows, startDate, endDate));
    } catch {
      setFiledLeaveByDate({});
    }
  }, [selectedEmployee, periodYear, periodMonth]);

  // ── Add to Abstract — the only way rows enter the Abstract tab. Pulls real
  // attendance_result data for the employee/period if it exists; otherwise stages
  // a zero-deduction placeholder. Nothing is ever added automatically. ──────────
  const getManualAbstractMonthBounds = useCallback((y, m) => {
    const yy = parseInt(y, 10);
    const mm = parseInt(m, 10);
    const pad2 = (n) => String(n).padStart(2, "0");
    const startDate = `${yy}-${pad2(mm)}-01`;
    const lastDay = new Date(yy, mm, 0).getDate();
    const endDate = `${yy}-${pad2(mm)}-${pad2(lastDay)}`;
    return { startDate, endDate };
  }, []);

  // ── Earned-first gate: employee must have at least one approved Leave/SC/CTO
  // earning for this period before Add to Abstract unlocks. ─────────────────────
  const normalizeEarnStatusLocal = (record) => {
    if (record?.voided_at || Number(record?.voided) === 1) return "voided";
    const x = String(record?.earn_status || "pending").toLowerCase();
    if (x === "accepted" || x === "posted") return "approved";
    return x;
  };

  const fetchApprovedEarningsInfo = useCallback(async () => {
    if (!selectedEmployee?.employeeNumber) {
      setApprovedEarningsInfo({
        checking: false,
        hasApproved: false,
        approvedCount: 0,
      });
      return;
    }
    setApprovedEarningsInfo((p) => ({ ...p, checking: true }));
    const token = localStorage.getItem("token");
    const h = { headers: { Authorization: `Bearer ${token}` } };
    const qs = `?year=${periodYear}&month=${periodMonth}`;
    try {
      const [leaveRes, scRes, ctoRes] = await Promise.allSettled([
        axios.get(
          `${API_BASE_URL}/api/earnings/leave/${selectedEmployee.employeeNumber}${qs}`,
          h,
        ),
        axios.get(
          `${API_BASE_URL}/api/earnings/sc/${selectedEmployee.employeeNumber}${qs}`,
          h,
        ),
        axios.get(
          `${API_BASE_URL}/api/earnings/cto/${selectedEmployee.employeeNumber}${qs}`,
          h,
        ),
      ]);
      const allEarnings = [
        ...(leaveRes.status === "fulfilled"
          ? leaveRes.value.data?.earnings || []
          : []),
        ...(scRes.status === "fulfilled"
          ? scRes.value.data?.earnings || []
          : []),
        ...(ctoRes.status === "fulfilled"
          ? ctoRes.value.data?.earnings || []
          : []),
      ];
      const approvedCount = allEarnings.filter(
        (e) => normalizeEarnStatusLocal(e) === "approved",
      ).length;
      setApprovedEarningsInfo({
        checking: false,
        hasApproved: approvedCount > 0,
        approvedCount,
      });
    } catch {
      setApprovedEarningsInfo({
        checking: false,
        hasApproved: false,
        approvedCount: 0,
      });
    }
  }, [selectedEmployee, periodYear, periodMonth]);

  useEffect(() => {
    fetchApprovedEarningsInfo();
  }, [fetchApprovedEarningsInfo, balanceKey, recordsRefreshKey]);

  const handleAddToAbstract = useCallback(async () => {
    if (!selectedEmployee?.employeeNumber) {
      setManualAbstractSnackbar({
        open: true,
        severity: "warning",
        message: "Select an employee first.",
      });
      return;
    }
    const y = parseInt(periodYear, 10);
    const m = parseInt(periodMonth, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      setManualAbstractSnackbar({
        open: true,
        severity: "warning",
        message: "Select a valid year and month first.",
      });
      return;
    }
    if (!approvedEarningsInfo.hasApproved) {
      setManualAbstractSnackbar({
        open: true,
        severity: "warning",
        message:
          "This employee needs at least one approved Leave/SC/CTO earning for this period before they can be staged in Abstract.",
      });
      return;
    }
    const emp = String(selectedEmployee.employeeNumber).trim();
    const placeholderKey = `manual-${emp}-${y}-${m}`;
    const existingKeys = new Set(manualAbstractRows.map((r) => r.key));

    setAddingManualAbstract(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Pull the employee's real attendance_result rows for this period, if any exist.
      const { data } = await axios.get(
        `${API_BASE_URL}/api/leave-salary-shortfall`,
        {
          headers,
          params: { year: y, month: m, employeeNumber: emp },
        },
      );
      const ar = Array.isArray(data?.attendanceResults)
        ? data.attendanceResults
        : [];
      const merged = aggregateAttendanceResultsForAbstract(ar, y, m);
      // Only rows with active (not voided) entries; a fully voided month is staged like an empty one.
      const empMergedRows = merged.filter(
        (r) => String(r.employeeNumber).trim() === emp && r.activeCount !== 0,
      );

      let rowsToAdd = [];

      if (empMergedRows.length > 0) {
        // Real deduction/covered rows exist — stage them as-is (colors/labels stay accurate).
        rowsToAdd = empMergedRows.filter((r) => !existingKeys.has(r.key));
        if (rowsToAdd.length === 0) {
          setManualAbstractSnackbar({
            open: true,
            severity: "info",
            message: "Already added for this period.",
          });
          return;
        }
      } else {
        // No attendance_result rows on file — stage a "no deduction" placeholder instead.
        if (existingKeys.has(placeholderKey)) {
          setManualAbstractSnackbar({
            open: true,
            severity: "info",
            message: "Already added for this period.",
          });
          return;
        }
        const { startDate, endDate } = getManualAbstractMonthBounds(y, m);
        const oar = await fetchOverallAttendanceRow(
          emp,
          startDate,
          endDate,
          startDate,
          endDate,
        );
        if (!oar) {
          setManualAbstractSnackbar({
            open: true,
            severity: "error",
            message: `No overall attendance record found for ${emp} (${startDate} → ${endDate}). Generate the attendance summary first.`,
          });
          return;
        }

        rowsToAdd = [
          {
            key: placeholderKey,
            employeeNumber: emp,
            name: buildDisplayName(selectedEmployee),
            leaveCode: "—",
            chargeTo: "No salary deduction",
            halfDayDate: startDate,
            period: `${monthShort(m)} ${y}`,
            periodYear: y,
            periodMonth: m,
            toSalaryDays: 0,
            hours: 0,
            unpaidHours: 0,
            originalHours: 0,
            leaveHoursUsed: 0,
            paidHoursTotal: 0,
            resultStatus: "No deduction",
            createdAt: new Date().toISOString(),
            isDeduction: false,
            source: "MANUAL",
            isManual: true,
            abstractEventCount: 0,
            abstractSourceTypes: "Manual — no deduction",
            abstractRemarksShort:
              "Manually added: no absences/tardiness this period",
            abstractRemarksTooltip:
              "Manually staged for payroll — this employee had no attendance deductions recorded for this period.",
            abstractSourceRows: [],
          },
        ];
      }

      setManualAbstractRows((prev) => [...prev, ...rowsToAdd]);
      setManualAbstractSnackbar({
        open: true,
        severity: "success",
        message: `Added ${emp} to Abstract for review.`,
      });
    } catch (e) {
      setManualAbstractSnackbar({
        open: true,
        severity: "error",
        message: e.response?.data?.error || e.message || "Failed to add.",
      });
    } finally {
      setAddingManualAbstract(false);
    }
  }, [
    selectedEmployee,
    periodYear,
    periodMonth,
    manualAbstractRows,
    getManualAbstractMonthBounds,
    approvedEarningsInfo.hasApproved,
  ]);

  const openVlHalfModalForDate = useCallback(
    async (dateVal) => {
      const targetDate = String(dateVal || "")
        .trim()
        .slice(0, 10);
      if (!selectedEmployee?.employeeNumber || !targetDate) return;

      const norm = targetDate.slice(0, 10);
      if (filedLeaveByDate[norm]) return;

      const summary = attendanceData?.summary;
      if (!isApprovedHalfDayDateInSummary(summary, norm)) {
        setVlHalfError(
          "Half-day leave deduction requires HR approval in the attendance module (rendered hours confirmed).",
        );
        return;
      }

      setVlHalfSelectedDate(targetDate);
      setVlHalfCertify(false);
      setVlHalfRateDecimal("0.5");
      setVlHalfSuggestion(null);
      setVlHalfError("");
      setVlHalfDeductionOptions([]);
      setVlHalfChargeTo("VL");
      setVlHalfCreditSnapshots(null);
      setVlHalfAttendanceContext(null);
      setVlHalfModalOpen(true);
      setVlHalfModalLoading(true);

      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        let dailyRow = (attendanceData?.dailyRecords || []).find(
          (r) =>
            String(r?.date ?? "")
              .trim()
              .slice(0, 10) === norm,
        );
        if (!dailyRow?.officialBreaktimeIN && !dailyRow?.officialBreaktimeOUT) {
          try {
            const ar = await axios.get(
              `${API_BASE_URL}/attendance/api/attendance`,
              {
                params: {
                  personId: selectedEmployee.employeeNumber,
                  startDate: targetDate,
                  endDate: targetDate,
                },
                headers,
              },
            );
            const list = Array.isArray(ar.data) ? ar.data : ar.data?.data || [];
            dailyRow =
              list.find(
                (r) =>
                  String(r?.date ?? "")
                    .trim()
                    .slice(0, 10) === norm,
              ) || dailyRow;
          } catch {
            /* keep earnings daily row if attendance fetch fails */
          }
        }
        const empCatRow = empCatMap[String(selectedEmployee.employeeNumber)];
        const halfCtx = buildHalfDayDeductionModalContext(
          summary,
          dailyRow,
          inferAttendanceModuleType(empCatRow),
        );
        setVlHalfAttendanceContext(halfCtx);

        const [snapshots, r0] = await Promise.all([
          fetchDeductionCreditSnapshots(selectedEmployee.employeeNumber, token),
          axios.post(
            `${API_BASE_URL}/leaveRoute/leave_request/halfday-deduction-suggestion`,
            {
              employeeNumber: selectedEmployee.employeeNumber,
              leave_date: targetDate,
            },
            { headers },
          ),
        ]);
        setVlHalfCreditSnapshots(snapshots);
        const hasForm = r0.data?.has_leave_form === true;
        const optRes = await axios.get(
          `${API_BASE_URL}/api/deductions/options`,
          {
            params: {
              employeeNumber: selectedEmployee.employeeNumber,
              context: "HALF_DAY",
              hasLeaveForm: hasForm ? "true" : "false",
            },
            headers,
          },
        );
        const opts = Array.isArray(optRes.data?.options)
          ? optRes.data.options
          : [];
        setVlHalfDeductionOptions(opts);

        const findOpt = (code) =>
          opts.find(
            (o) =>
              String(o?.value ?? "")
                .trim()
                .toUpperCase() ===
              String(code ?? "")
                .trim()
                .toUpperCase(),
          );
        const recRaw = String(r0.data?.recommended_charge_to || "").trim();
        const recOpt = recRaw ? findOpt(recRaw) : null;
        const vlOpt = findOpt("VL");
        // Prefer a pool this employee's category earns (e.g. SC for 30-hour faculty); pools it
        // does not earn stay selectable in the dialog while they have a balance.
        const catOpts = applyCategoryToDeductionOptions(
          opts,
          resolveCscCategory(empCatMap[String(selectedEmployee.employeeNumber)] || null),
          "half_day",
          (v) =>
            getDeductionSourceBalanceDays(v, {
              assignmentMap: snapshots?.assignmentMap ?? {},
              scRemainingHours: snapshots?.scRemainingHours ?? 0,
              ctoRemainingHours: snapshots?.ctoRemainingHours ?? 0,
              salaryFallbackDays: null,
            }),
        );
        const isEarnedPool = (o) =>
          o && !o.existingBalanceOnly && String(o.value || "").toUpperCase() !== "SALARY_DEDUCTION";
        const recCat = recOpt ? catOpts.find((o) => o.value === recOpt.value) : null;
        const vlCat = vlOpt ? catOpts.find((o) => o.value === vlOpt.value) : null;
        const pick =
          (isEarnedPool(recCat) && recCat.value) ||
          (isEarnedPool(vlCat) && vlCat.value) ||
          catOpts.find(isEarnedPool)?.value ||
          recOpt?.value ||
          vlOpt?.value ||
          opts[0]?.value ||
          "SALARY_DEDUCTION";
        setVlHalfChargeTo(pick);

        const r = await axios.post(
          `${API_BASE_URL}/leaveRoute/leave_request/halfday-deduction-suggestion`,
          {
            employeeNumber: selectedEmployee.employeeNumber,
            leave_date: targetDate,
            preferred_charge_to: pick,
          },
          { headers },
        );
        const suggestion = r.data || null;
        setVlHalfSuggestion(suggestion);

        const recRate = parseFloat(suggestion?.recommended_rate_decimal);
        const ctxRate = halfCtx?.suggestedRateDecimal;
        const rateToUse =
          Number.isFinite(ctxRate) && ctxRate > 0
            ? ctxRate
            : Number.isFinite(recRate) && recRate > 0
              ? recRate
              : 0.5;
        setVlHalfRateDecimal(String(rateToUse));
      } catch (e) {
        setVlHalfError(
          e.response?.data?.error ||
            e.message ||
            "Failed to load half-day deduction options.",
        );
      } finally {
        setVlHalfModalLoading(false);
      }
    },
    [
      selectedEmployee,
      attendanceData?.summary,
      attendanceData?.dailyRecords,
      filedLeaveByDate,
      empCatMap,
    ],
  );

  const handleVlHalfChargeChange = useCallback(
    async (code) => {
      if (!selectedEmployee?.employeeNumber || !vlHalfSelectedDate) return;
      const next = String(code || "")
        .trim()
        .toUpperCase();
      setVlHalfChargeTo(next);
      const token = localStorage.getItem("token");
      try {
        const r = await axios.post(
          `${API_BASE_URL}/leaveRoute/leave_request/halfday-deduction-suggestion`,
          {
            employeeNumber: selectedEmployee.employeeNumber,
            leave_date: vlHalfSelectedDate,
            preferred_charge_to: next,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setVlHalfSuggestion(r.data || null);
        const recRate = parseFloat(r.data?.recommended_rate_decimal);
        setVlHalfRateDecimal(
          Number.isFinite(recRate) && recRate > 0 ? String(recRate) : "0.5",
        );
      } catch (e) {
        setVlHalfError(
          e.response?.data?.error ||
            e.message ||
            "Failed to refresh deduction policy for the selected source.",
        );
      }
    },
    [selectedEmployee, vlHalfSelectedDate],
  );

  const applyVlHalfDeduction = useCallback(
    async ({ remark = "", rateDecimal } = {}) => {
      if (!selectedEmployee?.employeeNumber || !vlHalfSelectedDate) return;

      const rateDecimalNum = toNum(rateDecimal);
      if (!(rateDecimalNum > 0)) {
        const msg = "Enter a valid deduction amount (days).";
        setVlHalfError(msg);
        throw new Error(msg);
      }

      // Server-resolved clock hours per day (hoursPerDayService).
      const clockHoursPerDay = toNum(vlHalfSuggestion?.hours_per_day) || 8;
      const deductHours = rateDecimalNum * clockHoursPerDay;

      if (deductedVlHalfDates.includes(vlHalfSelectedDate)) {
        throw new Error("This half-day is already deducted.");
      }

      const normApply = String(vlHalfSelectedDate).trim().slice(0, 10);
      if (!isApprovedHalfDayDateInSummary(attendanceData?.summary, normApply)) {
        const msg =
          "Half-day leave deduction requires HR approval in the attendance module first.";
        setVlHalfError(msg);
        throw new Error(msg);
      }

      setVlHalfModalLoading(true);
      setVlHalfError("");

      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `${API_BASE_URL}/leaveRoute/leave_request/halfday-deduction-apply`,
          {
            employeeNumber: selectedEmployee.employeeNumber,
            leave_date: vlHalfSelectedDate,
            chosen_charge_to: String(vlHalfChargeTo || "VL")
              .trim()
              .toUpperCase(),
            rate_decimal: rateDecimalNum,
            deduction_hours: deductHours,
            decision_context: {
              override_reason: String(remark || "").trim() || null,
              system_recommendation: vlHalfSuggestion,
            },
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        // Prevent duplicates in the UI.
        setDeductedVlHalfDates((prev) =>
          Array.from(new Set([...prev, vlHalfSelectedDate])),
        );

        setVlHalfModalOpen(false);
        setVlHalfCertify(false);
        setVlHalfSuggestion(null);
        setVlHalfCreditSnapshots(null);
        setVlHalfAttendanceContext(null);
        setVlHalfError("");

        // Keep AttendanceSummary in sync with updated official metrics/balances.
        await fetchAttendance();
        handleBalanceChanged();
        handleRecordsRefresh();
        await fetchDeductedVlHalfDates();
      } catch (e) {
        const msg =
          e.response?.data?.error ||
          e.response?.data?.message ||
          e.message ||
          "Failed to deduct half-day to VL.";
        setVlHalfError(msg);
        throw new Error(msg);
      } finally {
        setVlHalfModalLoading(false);
      }
    },
    [
      selectedEmployee,
      vlHalfSelectedDate,
      vlHalfSuggestion,
      vlHalfChargeTo,
      deductedVlHalfDates,
      filedLeaveByDate,
      fetchAttendance,
      handleBalanceChanged,
      handleRecordsRefresh,
      fetchDeductedVlHalfDates,
      attendanceData?.summary,
    ],
  );

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Clear local "already deducted" tracking when switching employee/period.
  // NOTE: manualAbstractRows is intentionally NOT reset here. It is meant to
  // accumulate staged rows across multiple employees/periods over the course
  // of a session (see Abstract.js), so it must survive employee/period switches.
  useEffect(() => {
    setDeductedVlHalfDates([]);
    setFiledLeaveByDate({});
    setVlHalfModalOpen(false);
    setVlHalfSuggestion(null);
    setVlHalfCreditSnapshots(null);
    setVlHalfError("");
    setVlHalfCertify(false);
    fetchDeductedVlHalfDates();
    fetchFiledLeaveByDate();
  }, [
    selectedEmployee?.employeeNumber,
    periodYear,
    periodMonth,
    fetchDeductedVlHalfDates,
    fetchFiledLeaveByDate,
  ]);

  const refreshEarningsRealtime = useCallback(() => {
    setBalanceKey((k) => k + 1);
    setRecordsRefreshKey((k) => k + 1);
    setVlReceiptRefreshKey((k) => k + 1);
    // Background sync: avoid toggling attendanceLoading on every socket burst (prevents UI blink).
    fetchAttendance({ silent: true });
    fetchDeductedVlHalfDates();
    fetchFiledLeaveByDate();
  }, [fetchAttendance, fetchDeductedVlHalfDates, fetchFiledLeaveByDate]);

  useEarningsRealtimeRefresh({
    socket,
    connected,
    onRefresh: refreshEarningsRealtime,
    selectedEmployeeNumber: selectedEmployee?.employeeNumber,
  });

  // If attendance was changed in another tab/window, refresh when this tab becomes visible.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible" || !selectedEmployee) return;
      fetchAttendance({ silent: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchAttendance, selectedEmployee]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const [usersRes, personsRes, deptRes, empCatRes, typeConfigRes] =
          await loadEarningsReferenceData(token);
        if (cancelled) return;
        let usersData = [];
        if (usersRes.status === "fulfilled") {
          const d = usersRes.value.data;
          usersData = Array.isArray(d) ? d : d?.users || d?.data || [];
        }
        const sexMap = {};
        if (personsRes.status === "fulfilled") {
          const list = Array.isArray(personsRes.value.data)
            ? personsRes.value.data
            : personsRes.value.data?.data || [];
          list.forEach((p) => {
            const num =
              p.agencyEmployeeNum?.toString() || p.employeeNumber?.toString();
            if (!num) return;
            sexMap[num] = {
              firstName: p.firstName,
              middleName: p.middleName,
              lastName: p.lastName,
              sex: p.sex || p.gender || null,
            };
          });
        }
        setEmployees(
          usersData.map((u) => {
            const num = u.employeeNumber?.toString();
            const pi = num ? sexMap[num] || {} : {};
            return { ...u, ...pi, sex: pi.sex || u.sex || u.gender || null };
          }),
        );
        if (deptRes.status === "fulfilled") {
          const map = {};
          (Array.isArray(deptRes.value.data) ? deptRes.value.data : []).forEach(
            (item) => {
              if (!item.employeeNumber) return;
              const num = String(item.employeeNumber);
              if (item.code) map[num] = item.code;
            },
          );
          setDeptMap(map);
        }
        if (empCatRes.status === "fulfilled") {
          const map = {};
          (Array.isArray(empCatRes.value.data)
            ? empCatRes.value.data
            : []
          ).forEach((item) => {
            if (!item.employeeNumber) return;
            const label =
              item.parentGroup && item.typeName
                ? `${item.parentGroup} | ${item.typeName}`
                : item.categoryLabel || "";
            if (label)
              map[String(item.employeeNumber)] = {
                label,
                colorHex: item.colorHex || "#757575",
                parentGroup: item.parentGroup,
                typeName: item.typeName,
              };
          });
          setEmpCatMap(map);
        }
        if (typeConfigRes.status === "fulfilled")
          setTypeConfigs(typeConfigRes.value.data?.flat || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const st = location.state;
    if (
      st?.fromAttendanceSummaryRegular &&
      Array.isArray(st.payrollAttendanceRecords) &&
      st.payrollAttendanceRecords.length > 0
    ) {
      setPayrollHandoffRecords(st.payrollAttendanceRecords);
      const first = st.payrollAttendanceRecords[0];
      const sd = first?.startDate;
      if (sd && typeof sd === "string" && /^\d{4}-\d{2}/.test(sd)) {
        const [yStr, mStr] = sd.split("-");
        const y = parseInt(yStr, 10);
        const mo = parseInt(mStr, 10);
        if (Number.isFinite(y) && Number.isFinite(mo) && mo >= 1 && mo <= 12) {
          setPeriodYear(y);
          setPeriodMonth(mo);
        }
      }
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!payrollHandoffRecords?.length || !employees.length) return;
    const en = String(
      payrollHandoffRecords[0].personID ||
        payrollHandoffRecords[0].employeeNumber ||
        "",
    ).trim();
    if (!en) return;
    const emp = employees.find((e) => String(e.employeeNumber).trim() === en);
    if (emp) {
      setSelectedEmployee(emp);
      setShowEmployeeAutocomplete(false);
    }
  }, [payrollHandoffRecords, employees]);

  const runPostRegularPayroll = useCallback(
    async (filteredRecords) => {
      const result = await postRegularPayrollSubmission(
        filteredRecords,
        payrollAuthHeaders,
      );
      if (!result.ok) {
        const continueToPayroll =
          result.code === "NONE_ADDED" || result.code === "DUPLICATE";
        let title = "Payroll submission";
        if (result.code === "NONE_ADDED") title = "Already exists";
        else if (result.code === "DUPLICATE") title = "Duplicate payroll entry";
        setPayrollInfoDialog({
          open: true,
          title,
          message: result.message,
          isError: !continueToPayroll,
          continueToPayroll,
        });
        return;
      }
      setPayrollHandoffRecords(null);
      navigate("/payroll-table");
    },
    [navigate],
  );

  const executeRegularPayrollFromHandoff = useCallback(async () => {
    if (!payrollRecordsForSubmit?.length) return;
    setPayrollSubmitting(true);
    try {
      const { filteredRecords, invalidRecords } =
        await filterRecordsForRegularPayroll(
          payrollRecordsForSubmit,
          payrollAuthHeaders,
        );
      if (invalidRecords.length > 0 && filteredRecords.length === 0) {
        setPayrollSubmitDialogOpen(false);
        setPayrollInfoDialog({
          open: true,
          title: "Submission blocked — Regular payroll",
          message: `The following employee(s) could not be processed:\n\n${invalidRecords.map((r) => `• Employee ${r.employeeNumber}: ${r.reason}`).join("\n")}\n\nPlease verify employment category before resubmitting.`,
          isError: true,
          continueToPayroll: false,
        });
        return;
      }
      if (invalidRecords.length > 0 && filteredRecords.length > 0) {
        setPayrollSubmitDialogOpen(false);
        setPayrollPartialPayload({ filteredRecords, invalidRecords });
        setPayrollPartialOpen(true);
        return;
      }
      setPayrollSubmitDialogOpen(false);
      await runPostRegularPayroll(filteredRecords);
    } finally {
      setPayrollSubmitting(false);
    }
  }, [payrollRecordsForSubmit, runPostRegularPayroll]);

  const buildDisplayName = (e) => {
    const last = (e?.lastName || "").trim();
    const first = (e?.firstName || "").trim();
    const mid = (e?.middleName || "").trim();
    if (!last && !first)
      return (e?.fullName || "").trim() || `#${e?.employeeNumber}`;
    return last
      ? `${last.toUpperCase()}, ${[first, mid].filter(Boolean).join(" ")}`
      : [first, mid].filter(Boolean).join(" ");
  };

  /** Resolve employee numbers in earning records (approved_by, audit actor) to display names. */
  const approverNameLookup = useMemo(() => {
    const m = {};
    (employees || []).forEach((e) => {
      const num = String(e?.employeeNumber ?? "").trim();
      if (!num) return;
      m[num] = buildDisplayName(e);
    });
    return m;
  }, [employees]);

  const selectedEmployeeDisplay = useMemo(() => {
    if (!selectedEmployee) return null;
    const initials =
      `${selectedEmployee.lastName?.[0] || ""}${selectedEmployee.firstName?.[0] || ""}`.toUpperCase() ||
      "?";
    const dc = deptMap[selectedEmployee.employeeNumber?.toString()];
    const ec = empCatMap[selectedEmployee.employeeNumber?.toString()];
    return { initials, dc, ec, name: buildDisplayName(selectedEmployee) };
  }, [selectedEmployee, deptMap, empCatMap]);

  const openEmployeePicker = useCallback(() => {
    setShowEmployeeAutocomplete(true);
    setSelectedEmployee(null);
    setEmployeePickerOpen(true);
    setTimeout(() => {
      try {
        employeePickerInputRef.current?.focus?.();
      } catch {
        /* noop */
      }
    }, 0);
  }, []);

  const groupedTypeConfigs = useMemo(() => {
    const g = {};
    typeConfigs
      .filter((t) => t.isActive)
      .forEach((t) => {
        if (!g[t.parentGroup]) g[t.parentGroup] = [];
        g[t.parentGroup].push(t);
      });
    return g;
  }, [typeConfigs]);

  const employeeOptions = useMemo(() => {
    let list = sortEmployeesByLastName(
      employees.map((e) => ({
        ...e,
        _displayName: buildDisplayName(e),
        _searchKey:
          `${buildDisplayName(e)} ${e.employeeNumber || ""}`.toLowerCase(),
      })),
    );
    if (catFilter) {
      const [filterType, filterValue] = catFilter.split("||");
      list = list.filter((emp) => {
        const cat = empCatMap[String(emp.employeeNumber)];
        if (!cat) return false;
        if (filterType === "group") return cat.parentGroup === filterValue;
        const [pg, tn] = filterValue.split("|");
        return cat.parentGroup === pg && cat.typeName === tn;
      });
    }
    return list;
  }, [employees, empCatMap, catFilter]);

  // ── Stepper workflow state (hooks must stay above the early return) ─────────
  const selectedEmpCat = selectedEmployee
    ? empCatMap[String(selectedEmployee.employeeNumber)] || null
    : null;
  const cscCategory = useMemo(
    () => resolveCscCategory(selectedEmpCat),
    [selectedEmpCat],
  );
  const periodData = useLeavePeriodData(
    selectedEmployee?.employeeNumber,
    balanceKey + recordsRefreshKey,
  );
  const attendanceSaved = Boolean(attendanceData?.summary);

  useEffect(() => {
    setDeductStatus(null);
  }, [selectedEmployee?.employeeNumber, periodYear, periodMonth]);

  /** Every attendance gap is charged (approvals of posted entries happen in Earn, so they do not block). */
  const deductDone = Boolean(
    deductStatus &&
      !deductStatus.loading &&
      deductStatus.remainingAbsenceDays <= 1e-5 &&
      deductStatus.remainingTardinessDays <= 1e-5 &&
      deductStatus.halfDayPending === 0,
  );

  /** Deductions tab steps: attendance → deduct. status: done | current | todo | locked. */
  const stepStatuses = useMemo(() => {
    const statuses = {
      att: attendanceSaved ? "done" : "todo",
      ded: !attendanceSaved ? "locked" : deductDone ? "done" : "todo",
    };
    const next = ["att", "ded"].find((k) => statuses[k] === "todo") || null;
    if (next) statuses[next] = "current";
    return { statuses, next };
  }, [attendanceSaved, deductDone]);

  // Open the next step on its own: when a different employee/month finishes loading, and
  // whenever finishing a step moves "next" forward.
  useEffect(() => {
    if (!selectedEmployee?.employeeNumber || periodData.loading || attendanceLoading) return;
    const key = `${selectedEmployee.employeeNumber}|${periodYear}|${periodMonth}`;
    // Wait until both data sets belong to this employee/month, not the previous selection.
    if (periodData.loadedFor !== String(selectedEmployee.employeeNumber)) return;
    if (attendanceLoadedFor !== key) return;
    if (autoOpenRef.current.key === key && autoOpenRef.current.next === stepStatuses.next) return;
    autoOpenRef.current = { key, next: stepStatuses.next };
    if (stepStatuses.next) setOpenStep(stepStatuses.next);
  }, [selectedEmployee?.employeeNumber, periodYear, periodMonth, periodData.loading, periodData.loadedFor, attendanceLoading, attendanceLoadedFor, stepStatuses.next]);

  // Earnings tab pools: a pool is off when every code in it is "not earned" for this category.
  const earnPoolLocked = useCallback(
    (idx) => EARN_POOLS[idx].codes.every((c) => ruleFor(cscCategory, c, "earns")?.value === RULE.NO),
    [cscCategory],
  );
  useEffect(() => {
    if (!earnPoolLocked(earnPool)) return;
    const firstOpen = [0, 1, 2].find((i) => !earnPoolLocked(i));
    if (firstOpen != null) setEarnPool(firstOpen);
  }, [earnPool, earnPoolLocked]);

  // Is this employee/month already in the Abstract? Either staged this session, or it has
  // attendance_result rows (the Abstract loads those by itself).
  useEffect(() => {
    const emp = String(selectedEmployee?.employeeNumber || "").trim();
    const y = parseInt(periodYear, 10);
    const m = parseInt(periodMonth, 10);
    if (!emp || !Number.isFinite(y) || !Number.isFinite(m)) {
      setAbstractPersisted({ key: "", count: 0, loading: false });
      return undefined;
    }
    const key = `${emp}|${y}|${m}`;
    let cancelled = false;
    setAbstractPersisted((p) => ({ ...p, key, loading: true }));
    axios
      .get(`${API_BASE_URL}/api/leave-salary-shortfall`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { year: y, month: m, employeeNumber: emp },
      })
      .then(({ data }) => {
        if (cancelled) return;
        const ar = Array.isArray(data?.attendanceResults) ? data.attendanceResults : [];
        const rows = aggregateAttendanceResultsForAbstract(ar, y, m).filter(
          (r) => String(r.employeeNumber).trim() === emp && r.activeCount !== 0,
        );
        setAbstractPersisted({ key, count: rows.length, loading: false });
      })
      .catch(() => !cancelled && setAbstractPersisted({ key, count: 0, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [selectedEmployee?.employeeNumber, periodYear, periodMonth, recordsRefreshKey, balanceKey]);

  // Half-day charge choices by category: earned pools first; pools the category does not earn only
  // while the employee still has a balance there (flagged in the dialog).
  const halfDayOptionsUi = applyCategoryToDeductionOptions(vlHalfDeductionOptions, cscCategory, "half_day", (v) =>
    getDeductionSourceBalanceDays(v, {
      assignmentMap: vlHalfCreditSnapshots?.assignmentMap ?? {},
      scRemainingHours: vlHalfCreditSnapshots?.scRemainingHours ?? 0,
      ctoRemainingHours: vlHalfCreditSnapshots?.ctoRemainingHours ?? 0,
      salaryFallbackDays: null,
    }),
  );

  if (pageLoading) return <EarningsWireframe />;

  // Server-resolved clock hours per day (hoursPerDayService); no client-side rescaling.
  const hoursPerDay = toNum(vlHalfSuggestion?.hours_per_day) || 8;

  const deptCode = selectedEmployee
    ? deptMap[String(selectedEmployee.employeeNumber)]
    : null;
  const empCat = selectedEmployee
    ? empCatMap[String(selectedEmployee.employeeNumber)]
    : null;
  const sharedTabProps = {
    employee: selectedEmployee,
    deptMap,
    empCatMap,
    unit,
    year: periodYear,
    month: periodMonth,
    onRedirectMonth: (m) => {
      const n = parseInt(m, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 12) setPeriodMonth(n);
    },
  };

  const toggleStep = (k) => setOpenStep((p) => (p === k ? null : k));
  /** Tabs: 0 Deductions, 1 Earnings (shared workspace), 2 Salary Shortfall, 3 Abstract. */
  const activeTabIndex = Math.max(0, TAB_VIEWS.indexOf(view));
  const handleTabChange = (idx) => setView(TAB_VIEWS[idx]);
  const isWorkspace = view === "deductions" || view === "earnings";
  const earningsTabLocked = selectedEmployee ? [0, 1, 2].every((i) => earnPoolLocked(i)) : false;
  const earningsLockedByDeductions = Boolean(selectedEmployee) && !deductDone;
  const attSummary = attendanceData?.summary;
  const attendanceStepSubtitle = attSummary
    ? `${attendanceLoadedAt ? `Loaded ${attendanceLoadedAt.toLocaleString()} · ` : ""}late ${String(attSummary.lateTotalTime || attSummary._lateTotal || "00:00").slice(0, 5)}, absent ${toNum(attSummary.absentDays)} d, OT ${parseHHMM(attSummary.totalRenderedOvertime).toFixed(3)} h`
    : attendanceLoading
      ? "Loading attendance…"
      : `No saved attendance summary for ${monthName(periodMonth)} ${periodYear}`;

  const abstractKeyNow = selectedEmployee ? `${String(selectedEmployee.employeeNumber).trim()}|${parseInt(periodYear, 10)}|${parseInt(periodMonth, 10)}` : "";
  const stagedInAbstract = Boolean(selectedEmployee) && manualAbstractRows.some(
    (r) =>
      String(r.employeeNumber).trim() === String(selectedEmployee.employeeNumber).trim() &&
      Number(r.periodYear) === parseInt(periodYear, 10) &&
      Number(r.periodMonth) === parseInt(periodMonth, 10),
  );
  const persistedInAbstract = abstractPersisted.key === abstractKeyNow && abstractPersisted.count > 0;
  const inAbstract = stagedInAbstract || persistedInAbstract;
  const checkingAbstract = abstractPersisted.loading && abstractPersisted.key === abstractKeyNow;

  const addToAbstractBar = (
    <Box
      sx={{
        flexShrink: 0,
        borderTop: `1px solid ${T.divider}`,
        bgcolor: T.accentFaint,
        px: 1.5,
        py: 1.1,
        display: "flex",
        flexDirection: "column", // stacked: the bar sits in the narrow side panel
        alignItems: "stretch",
        gap: 0.9,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: T.accent,
            fontFamily: T.poppins,
            lineHeight: 1.3,
          }}
        >
          Ready for payroll?
        </Typography>
        <Typography
          sx={{
            fontSize: "0.62rem",
            color: approvedEarningsInfo.checking
              ? T.faint
              : approvedEarningsInfo.hasApproved
                ? T.muted
                : "#7a4a00",
            fontFamily: T.poppins,
            lineHeight: 1.3,
          }}
        >
          {inAbstract
            ? `Already in the Abstract for ${monthName(periodMonth)} ${periodYear}${persistedInAbstract && !stagedInAbstract ? " (from this month's attendance records)" : ""}.`
            : approvedEarningsInfo.checking
              ? "Checking earnings approval status…"
              : approvedEarningsInfo.hasApproved
                ? "Stage this employee/period in the Abstract — required even if they have deductions."
                : "Needs at least one approved Leave/SC/CTO earning before this can be staged."}
        </Typography>
      </Box>
      <Tooltip
        title={
          !selectedEmployee?.employeeNumber
            ? ""
            : inAbstract
              ? "This employee/period is already listed in the Abstract tab."
              : approvedEarningsInfo.checking
              ? "Checking approval status…"
              : !approvedEarningsInfo.hasApproved
                ? "Approve at least one Leave/SC/CTO earning for this employee/period first — Add to Abstract stays locked until then."
                : ""
        }
      >
        <span style={{ display: "block" }}>
          <Button
            size="small"
            variant="contained"
            fullWidth
            startIcon={
              addingManualAbstract ||
              approvedEarningsInfo.checking ||
              checkingAbstract ? (
                <CircularProgress
                  size={11}
                  sx={{ color: "#fff" }}
                />
              ) : inAbstract ? (
                <CheckIcon sx={{ fontSize: 15 }} />
              ) : (
                <PlaylistAddIcon sx={{ fontSize: 15 }} />
              )
            }
            onClick={handleAddToAbstract}
            disabled={
              inAbstract ||
              checkingAbstract ||
              addingManualAbstract ||
              !selectedEmployee?.employeeNumber ||
              approvedEarningsInfo.checking ||
              !approvedEarningsInfo.hasApproved
            }
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "none",
              fontFamily: T.poppins,
              color: "#fff",
              borderRadius: "8px",
              px: 1.75,
              py: 0.75,
              bgcolor: T.accent,
              boxShadow: `0 2px 8px ${alpha(T.accent, 0.35)}`,
              whiteSpace: "nowrap",
              flexShrink: 0,
              "&:hover": {
                bgcolor: T.accentDark,
                boxShadow: `0 3px 10px ${alpha(T.accent, 0.45)}`,
              },
              "&.Mui-disabled": inAbstract
                ? { color: "#1b5e20", bgcolor: "rgba(46,125,50,0.14)", boxShadow: "none" }
                : {
                    color: "rgba(255,255,255,0.7)",
                    bgcolor: alpha(T.accent, 0.35),
                    boxShadow: "none",
                  },
            }}
          >
            {addingManualAbstract
              ? "Adding…"
              : inAbstract
                ? "Already in Abstract"
                : "Add to Abstract"}
          </Button>
        </span>
      </Tooltip>
    </Box>
  );

  return (
    <Box sx={{ fontFamily: T.poppins }}>
      <style>{globalCss}</style>

      {/* ── Header card ── */}
      <Box
        sx={{
          width: "100vw",
          maxWidth: "100%",
          position: "relative",
          left: "63%",
          transform: "translateX(-61%)",
          px: { xs: 2, sm: 3, md: 6 },
          pt: { xs: 2, md: 4 },
          pb: 0,
          mt: { xs: 0, md: -5 },
        }}
      >
        <SectionCard sx={{ borderRadius: "12px 12px 0 0" }}>
          {/* Gradient header */}
          <Box
            sx={{
              px: 4,
              py: 2,
              background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle,rgba(109,35,35,0.08) 0%,transparent 70%)",
              }}
            />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                position: "relative",
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  bgcolor: alpha(T.accent, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <EarnIcon sx={{ fontSize: 18, color: T.accent }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    fontWeight: 900,
                    color: T.accent,
                    lineHeight: 1.2,
                    mb: 0.2,
                    fontFamily: T.poppins,
                  }}
                >
                  Deductions & Earnings Management
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: T.accentMid,
                    fontWeight: 600,
                    fontFamily: T.poppins,
                  }}
                >
                  Earned Leave · Service Credits (SC) · Compensatory Time Off
                  (CTO)
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* {connected && (
                <Tooltip title="Realtime updates: connected — refreshes when attendance, leave, SC/CTO, payroll, or salary shortfall data changes.">
                  <Chip
                    size="small"
                    label="Live"
                    sx={{
                      height: 22,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      fontFamily: T.poppins,
                      bgcolor: "rgba(46,125,50,0.12)",
                      color: "#2e7d32",
                      "& .MuiChip-label": { px: 0.85 },
                    }}
                  />
                </Tooltip>
              )} */}
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: T.faint,
                  fontFamily: T.poppins,
                }}
              >
                Input in:
              </Typography>
              <ToggleButtonGroup
                value={unit}
                exclusive
                onChange={(_, v) => v && setUnit(v)}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    px: 1.25,
                    py: 0.25,
                    border: `1px solid ${T.accentBorder}`,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: T.muted,
                    fontFamily: T.poppins,
                    "&.Mui-selected": {
                      bgcolor: T.accent,
                      color: "#fff",
                      borderColor: T.accent,
                    },
                  },
                }}
              >
                <ToggleButton value="hours">
                  <HourIcon sx={{ fontSize: 12, mr: 0.4 }} />
                  Hours
                </ToggleButton>
                <ToggleButton value="days">
                  <DayIcon sx={{ fontSize: 12, mr: 0.4 }} />
                  Days
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Employee selector row */}
          <Box
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: T.accentFaint,
              borderBottom: `1px solid ${T.divider}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                flexWrap: "wrap",
              }}
            >
              <PersonIcon
                sx={{ fontSize: 14, color: T.accent, flexShrink: 0 }}
              />
              {showEmployeeAutocomplete || !selectedEmployee ? (
                <Autocomplete
                  value={selectedEmployee}
                  onChange={(_, v) => {
                    setSelectedEmployee(v);
                    setShowEmployeeAutocomplete(!v);
                  }}
                  open={employeePickerOpen}
                  onOpen={() => setEmployeePickerOpen(true)}
                  onClose={() => setEmployeePickerOpen(false)}
                  options={employeeOptions}
                  autoHighlight
                  getOptionLabel={(o) => {
                    if (!o) return "";
                    const num = String(o.employeeNumber ?? "").trim();
                    const fromOpt =
                      o._displayName != null &&
                      String(o._displayName).trim() !== ""
                        ? String(o._displayName).trim()
                        : "";
                    const label =
                      fromOpt || buildDisplayName(o) || (num ? `#${num}` : "");
                    return num ? `${label} (${num})` : label;
                  }}
                  filterOptions={(opts, { inputValue: iv }) => {
                    const q = iv.toLowerCase().trim();
                    return (
                      !q
                        ? opts
                        : opts.filter((o) => (o._searchKey || "").includes(q))
                    ).slice(0, 80);
                  }}
                  isOptionEqualToValue={(o, v) =>
                    o.employeeNumber === v.employeeNumber
                  }
                  noOptionsText="No employees found"
                  renderOption={(props, option) => {
                    const { key, ...rest } = props;
                    const initials =
                      `${option.lastName?.[0] || ""}${option.firstName?.[0] || ""}`.toUpperCase() ||
                      "?";
                    const dc = deptMap[option.employeeNumber?.toString()];
                    const ec = empCatMap[option.employeeNumber?.toString()];
                    return (
                      <li key={key} {...rest}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              bgcolor: T.accent,
                              fontSize: "0.6rem",
                              fontWeight: 800,
                              borderRadius: "4px",
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                fontFamily: T.poppins,
                                fontSize: "0.8rem",
                              }}
                            >
                              {option._displayName}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 0.4,
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ color: T.faint, fontFamily: T.poppins }}
                              >
                                #{option.employeeNumber}
                              </Typography>
                              {dc && <DeptBadge code={dc} />}
                              {ec && (
                                <EmpCatBadge
                                  label={ec.label}
                                  colorHex={ec.colorHex}
                                />
                              )}
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
                      placeholder="Search employee by name or number…"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          bgcolor: "#fff",
                          borderRadius: 2,
                        },
                      }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <SearchIcon
                              sx={{ fontSize: 14, color: T.muted, mr: 0.4 }}
                            />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        inputRef: employeePickerInputRef,
                      }}
                    />
                  )}
                  slotProps={{
                    paper: {
                      sx: {
                        borderRadius: 2,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                        border: `1px solid ${T.accentBorder}`,
                      },
                    },
                  }}
                  sx={{ flex: 1, maxWidth: 340 }}
                />
              ) : (
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={openEmployeePicker}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      openEmployeePicker();
                  }}
                  sx={{
                    flex: 1,
                    maxWidth: 340,
                    height: 40,
                    bgcolor: "#fff",
                    borderRadius: 2,
                    border: `1px solid ${T.accentBorder}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1,
                    cursor: "pointer",
                    "&:hover": {
                      borderColor: T.accent,
                      bgcolor: "rgba(109,35,35,0.02)",
                    },
                    "&:active": { bgcolor: "rgba(109,35,35,0.04)" },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: T.accent,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      borderRadius: "4px",
                      flexShrink: 0,
                    }}
                  >
                    {selectedEmployeeDisplay?.initials || "?"}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontFamily: T.poppins,
                        fontSize: "0.78rem",
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: T.text,
                      }}
                    >
                      {selectedEmployeeDisplay?.name}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.4,
                        flexWrap: "nowrap",
                        mt: 0.2,
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: T.faint,
                          fontFamily: T.poppins,
                          whiteSpace: "nowrap",
                        }}
                      >
                        #{selectedEmployee?.employeeNumber}
                      </Typography>
                      {selectedEmployeeDisplay?.dc && (
                        <DeptBadge code={selectedEmployeeDisplay.dc} />
                      )}
                      {selectedEmployeeDisplay?.ec && (
                        <EmpCatBadge
                          label={selectedEmployeeDisplay.ec.label}
                          colorHex={selectedEmployeeDisplay.ec.colorHex}
                        />
                      )}
                    </Box>
                  </Box>
                  <ExpandMoreIcon
                    sx={{ fontSize: 18, color: T.faint, flexShrink: 0 }}
                  />
                </Box>
              )}
              {/* Category filter */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <FilterIcon sx={{ fontSize: 13, color: T.accent }} />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={catFilter}
                    onChange={(e) => {
                      setCatFilter(e.target.value);
                      setSelectedEmployee(null);
                    }}
                    displayEmpty
                    sx={{
                      fontSize: "0.76rem",
                      bgcolor: "#fff",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: catFilter ? T.accent : T.accentBorder,
                      },
                      color: catFilter ? T.accent : T.faint,
                      fontWeight: catFilter ? 700 : 400,
                    }}
                    renderValue={(val) => {
                      if (!val)
                        return (
                          <Typography
                            sx={{ fontSize: "0.76rem", color: T.faint }}
                          >
                            All Categories
                          </Typography>
                        );
                      const [ft, fv] = val.split("||");
                      if (ft === "group")
                        return (
                          <Typography
                            sx={{
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              color: T.accent,
                            }}
                          >
                            {fv}
                          </Typography>
                        );
                      const [, tn] = fv.split("|");
                      return (
                        <Typography
                          sx={{
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            color: T.accent,
                          }}
                        >
                          {tn}
                        </Typography>
                      );
                    }}
                  >
                    <MenuItem value="">
                      <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>
                        All Categories
                      </Typography>
                    </MenuItem>
                    {Object.entries(groupedTypeConfigs).flatMap(
                      ([group, items]) => [
                        <MenuItem
                          key={`gh-${group}`}
                          value={`group||${group}`}
                          sx={{ py: 0.6, bgcolor: alpha(T.accent, 0.04) }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              color: T.accent,
                            }}
                          >
                            {group} (all)
                          </Typography>
                        </MenuItem>,
                        ...items.map((item) => (
                          <MenuItem
                            key={`t-${item.id}`}
                            value={`type||${item.parentGroup}|${item.typeName}`}
                            sx={{ py: 0.4, pl: 3 }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.6,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  bgcolor: item.colorHex,
                                }}
                              />
                              <Typography sx={{ fontSize: "0.76rem" }}>
                                {item.typeName}
                              </Typography>
                            </Box>
                          </MenuItem>
                        )),
                      ],
                    )}
                  </Select>
                </FormControl>
                {catFilter && (
                  <Tooltip title="Clear filter">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCatFilter("");
                        setSelectedEmployee(null);
                      }}
                      sx={{ p: 0.3, color: T.accent }}
                    >
                      <Close sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {/* Month/Year Navigator */}
              <Box>
                <MonthYearNavigator
                  year={periodYear}
                  month={periodMonth}
                  onChange={handleMonthChange}
                />
              </Box>
            </Box>
            {catFilter && (
              <Typography
                sx={{
                  mt: 0.6,
                  fontSize: "0.66rem",
                  color: T.muted,
                  fontFamily: T.poppins,
                }}
              >
                Showing {employeeOptions.length} employee
                {employeeOptions.length !== 1 ? "s" : ""} in selected category
              </Typography>
            )}
          </Box>

          {/* Tab row — same style as Assignment Management */}
          <Box sx={{ background: T.headerGrad, px: { xs: 0, sm: 1 }, pt: 0.75, pb: 0, display: "flex", alignItems: "flex-end" }}>
            {TABS.map((t, idx) => {
              const Icon = t.icon;
              const isActive = idx === activeTabIndex;
              const locked = t.id === "earnings" && earningsTabLocked;
              return (
                <Tooltip key={t.id} title={locked ? "This employee's category does not earn leave, service credits or CTO." : ""}>
                  <Box
                    role="tab"
                    aria-selected={isActive}
                    aria-disabled={locked}
                    tabIndex={locked ? -1 : 0}
                    onClick={() => !locked && handleTabChange(idx)}
                    onKeyDown={(e) => {
                      if (!locked && (e.key === "Enter" || e.key === " ")) handleTabChange(idx);
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.6,
                      px: { xs: 1.5, sm: 2.5 },
                      py: 0.85,
                      cursor: locked ? "not-allowed" : "pointer",
                      opacity: locked ? 0.45 : 1,
                      position: "relative",
                      borderRadius: "8px 8px 0 0",
                      transition: "background 0.15s",
                      bgcolor: isActive ? "rgba(255,255,255,0.97)" : "transparent",
                      "&:hover": isActive || locked ? {} : { bgcolor: "rgba(255,255,255,0.1)" },
                      "&::after": isActive ? { content: '""', position: "absolute", bottom: -1, left: 0, right: 0, height: 2, bgcolor: "rgba(255,255,255,0.97)" } : {},
                    }}
                  >
                    <Icon sx={{ fontSize: 13, color: isActive ? T.accent : "rgba(255,255,255,0.6)", flexShrink: 0 }} />
                    <Typography sx={{ fontSize: "0.73rem", fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : "rgba(255,255,255,0.7)", fontFamily: T.poppins, whiteSpace: "nowrap", display: { xs: "none", sm: "block" } }}>
                      {t.label}
                    </Typography>
                    <Typography sx={{ fontSize: "0.73rem", fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : "rgba(255,255,255,0.7)", fontFamily: T.poppins, whiteSpace: "nowrap", display: { xs: "block", sm: "none" } }}>
                      {t.shortLabel}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </SectionCard>
      </Box>

      {/* ── Content area: stepper (left) + balances & category rules (right).
             Salary Shortfall and Abstract open as full-width views. ── */}
      <Box
        sx={{
          width: "100vw",
          maxWidth: "100%",
          position: "relative",
          left: "63%",
          transform: "translateX(-61%)",
          px: { xs: 2, sm: 3, md: 6 },
          pb: 0,
        }}
      >
        <SectionCard
          sx={{
            borderRadius: "0 0 12px 12px",
            borderTop: "none",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Box
            ref={contentAreaRef}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 390px" },
              gap: { xs: 0, lg: 2.5 },
              height: { xs: "auto", md: contentHeight ? `${contentHeight}px` : "calc(100vh - 360px)" },
              minHeight: { xs: "unset", md: 480 },
              overflow: { xs: "visible", md: "hidden" },
              visibility: isWorkspace ? "visible" : "hidden",
              bgcolor: "#faf8f8",
            }}
          >
            {/* ── Left: workflow stepper ── */}
            <Box
              sx={{
                overflowY: "auto",
                overflowX: "hidden",
                px: { xs: 1.5, md: 2.5 },
                py: 2,
              }}
            >
              {!selectedEmployee ? (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontFamily: T.poppins }}>
                    Select an employee to start this month&apos;s leave workflow.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ bgcolor: "#fff", border: `1px solid ${T.divider}`, borderRadius: "14px", p: { xs: 2, md: "22px 22px 24px" } }}>
                  <LeaveCreditsPanel
                    employee={selectedEmployee}
                    year={periodYear}
                    month={periodMonth}
                    unit={unit}
                    hoursPerDay={hoursPerDay}
                    category={cscCategory}
                    periods={periodData.periods}
                    currentTotals={periodData.currentTotals}
                    leaveTypes={periodData.leaveTypes}
                    sc={periodData.sc}
                    cto={periodData.cto}
                    loading={periodData.loading}
                  />

                  {/* Deductions stay mounted (hidden) on the Earnings tab so their status keeps updating. */}
                  <Box sx={{ display: view === "deductions" ? "block" : "none" }}>
                  <StepProgress
                    steps={[
                      { key: "att", short: "Attendance", title: "Attendance & overtime", status: stepStatuses.statuses.att },
                      { key: "ded", short: "Deduct", title: "Deduct", status: stepStatuses.statuses.ded },
                    ]}
                    onSelect={setOpenStep}
                    allDoneText={`Deductions for ${monthName(periodMonth)} ${periodYear} are done.`}
                  />

                  <StepRow
                    index={1}
                    stepKey="att"
                    title="Attendance & overtime"
                    subtitle={attendanceStepSubtitle}
                    status={stepStatuses.statuses.att}
                    open={openStep === "att"}
                    onToggle={toggleStep}
                    pills={
                      attSummary ? (
                        <>
                          <StepPill tone="ok" icon="✓">Saved</StepPill>
                          <StepPill tone="late" icon="◔">Late {String(attSummary.lateTotalTime || attSummary._lateTotal || "00:00").slice(0, 5)}</StepPill>
                          <StepPill tone="abs" icon="✕">Absent {toNum(attSummary.absentDays)} d</StepPill>
                          <StepPill tone="ot" icon="⚡">OT {parseHHMM(attSummary.totalRenderedOvertime).toFixed(3)} h</StepPill>
                        </>
                      ) : null
                    }
                  >
                    <AttendanceSummary
                      section="metrics"
                      hideBalances
                      employee={selectedEmployee}
                      year={periodYear}
                      month={periodMonth}
                      attendanceData={attendanceData}
                      attendanceLoading={attendanceLoading}
                      onRefresh={fetchAttendance}
                      onRecordsRefresh={handleRecordsRefresh}
                      onBalancesInvalidate={handleBalanceChanged}
                      empCat={empCat}
                      vlReceiptRefreshKey={vlReceiptRefreshKey}
                      balanceRefreshKey={balanceKey}
                      deductedVlHalfDates={deductedVlHalfDates}
                      filedLeaveByDate={filedLeaveByDate}
                      onDeductHalfDayVLRequested={openVlHalfModalForDate}
                    />
                  </StepRow>

                  <StepRow
                    index={2}
                    stepKey="ded"
                    title="Deduct"
                    subtitle="Charge the gaps to the right balance"
                    status={stepStatuses.statuses.ded}
                    lockedReason="Save the attendance summary for this month first"
                    open={openStep === "ded"}
                    onToggle={toggleStep}
                    isLast
                    pills={
                      <>
                        <StepPill tone="ok" icon="✓">Applied</StepPill>
                        {deductStatus?.awaitingApproval && <StepPill tone="warn" icon="!">Awaiting approval in Records</StepPill>}
                      </>
                    }
                  >
                    <AttendanceSummary
                      section="deduct"
                      employee={selectedEmployee}
                      year={periodYear}
                      month={periodMonth}
                      attendanceData={attendanceData}
                      attendanceLoading={attendanceLoading}
                      onRefresh={fetchAttendance}
                      onRecordsRefresh={handleRecordsRefresh}
                      onBalancesInvalidate={handleBalanceChanged}
                      empCat={empCat}
                      vlReceiptRefreshKey={vlReceiptRefreshKey}
                      balanceRefreshKey={balanceKey}
                      deductedVlHalfDates={deductedVlHalfDates}
                      filedLeaveByDate={filedLeaveByDate}
                      onDeductHalfDayVLRequested={openVlHalfModalForDate}
                      cscCategory={cscCategory}
                      onDeductStatusChange={setDeductStatus}
                    />
                  </StepRow>

                  {/* End of the Deductions steps: go straight to the Earnings tab. */}
                  <Box
                    sx={{
                      mt: 2,
                      p: "12px 14px",
                      borderRadius: "12px",
                      border: `1px solid ${deductDone ? "rgba(46,125,50,0.35)" : T.divider}`,
                      bgcolor: deductDone ? "rgba(46,125,50,0.06)" : "rgba(0,0,0,0.02)",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: T.poppins, color: T.text }}>
                        {earningsTabLocked
                          ? "No earnings for this category"
                          : deductDone
                            ? "Deductions are done"
                            : "Next: Earnings"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.7rem", color: T.muted, fontFamily: T.poppins }}>
                        {earningsTabLocked
                          ? "This employee's category does not earn leave, service credits or CTO."
                          : deductDone
                            ? `Post the ${monthName(periodMonth)} ${periodYear} earnings next.`
                            : "Finish the attendance and deductions above to unlock Earnings."}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      disableElevation
                      onClick={() => setView("earnings")}
                      disabled={!deductDone || earningsTabLocked}
                      sx={{ textTransform: "none", fontFamily: T.poppins, fontWeight: 700, fontSize: "0.78rem", borderRadius: "9px", px: 2, bgcolor: T.accent, "&:hover": { bgcolor: T.accentDark } }}
                    >
                      Continue to Earnings →
                    </Button>
                  </Box>
                  </Box>

                  {view === "earnings" && (
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                        <Box>
                          <Typography component="h2" sx={{ m: 0, fontSize: "1rem", fontWeight: 700, fontFamily: T.poppins, color: T.text }}>
                            Earnings · {monthName(periodMonth)} {periodYear}
                          </Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins }}>
                            Only the credits this employee&apos;s category earns are shown.
                          </Typography>
                        </Box>
                        {approvedEarningsInfo.hasApproved && <StepPill tone="ok" icon="✓">Posted</StepPill>}
                      </Box>

                      {earningsTabLocked ? (
                        <Box sx={{ p: 2, borderRadius: "12px", border: `1px dashed ${T.divider}`, textAlign: "center" }}>
                          <Typography sx={{ fontSize: "0.8rem", color: T.muted, fontFamily: T.poppins }}>
                            This employee&apos;s category does not earn leave, service credits or CTO.
                          </Typography>
                        </Box>
                      ) : earningsLockedByDeductions ? (
                        <Box sx={{ p: 2, borderRadius: "12px", border: `1px dashed ${T.divider}`, bgcolor: "rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                          <Typography sx={{ flex: 1, minWidth: 200, fontSize: "0.8rem", color: T.muted, fontFamily: T.poppins }}>
                            Apply this month&apos;s deductions first. Earnings unlock once every absence, tardiness and half day is charged.
                          </Typography>
                          <Button
                            variant="outlined"
                            onClick={() => setView("deductions")}
                            sx={{ textTransform: "none", fontFamily: T.poppins, fontWeight: 700, fontSize: "0.76rem", borderRadius: "9px", color: T.accent, borderColor: T.accentBorder }}
                          >
                            ← Back to Deductions
                          </Button>
                        </Box>
                      ) : (
                        <>
                          <Box role="tablist" aria-label="Credit to earn" sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5 }}>
                            {EARN_POOLS.map((pool, idx) => {
                              if (earnPoolLocked(idx)) return null;
                              const Icon = pool.icon;
                              const on = earnPool === idx;
                              return (
                                <Box
                                  key={pool.id}
                                  component="button"
                                  type="button"
                                  role="tab"
                                  aria-selected={on}
                                  onClick={() => setEarnPool(idx)}
                                  sx={{
                                    all: "unset",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                    px: 1.5,
                                    py: 0.75,
                                    borderRadius: "10px",
                                    fontSize: "0.76rem",
                                    fontWeight: 600,
                                    fontFamily: T.poppins,
                                    border: `1.5px solid ${on ? T.accent : T.divider}`,
                                    bgcolor: on ? T.accent : "#fff",
                                    color: on ? "#fff" : T.text,
                                    "&:focus-visible": { outline: `2px solid ${T.accent}`, outlineOffset: 2 },
                                  }}
                                >
                                  <Icon sx={{ fontSize: 15 }} />
                                  {pool.label}
                                </Box>
                              );
                            })}
                          </Box>
                          {EARN_POOLS.some((_, idx) => earnPoolLocked(idx)) && (
                            <Typography sx={{ fontSize: "0.7rem", color: T.muted, fontFamily: T.poppins, mb: 1.25 }}>
                              Not earned by this category:{" "}
                              {EARN_POOLS.filter((_, idx) => earnPoolLocked(idx)).map((pl) => pl.label).join(", ")}.
                            </Typography>
                          )}
                          <Box sx={earnPool === 0 ? {} : { border: `1px solid ${T.divider}`, borderRadius: 1.5, overflow: "hidden" }}>
                            {earnPool === 0 && (
                              <LeaveInputColumn
                                {...sharedTabProps}
                                onBalanceChanged={handleBalanceChanged}
                                refreshKey={balanceKey}
                                onRecordsRefresh={handleRecordsRefresh}
                              />
                            )}
                            {earnPool === 1 && <SCInputColumn {...sharedTabProps} onRecordsRefresh={handleRecordsRefresh} />}
                            {earnPool === 2 && <CTOInputColumn {...sharedTabProps} onRecordsRefresh={handleRecordsRefresh} />}
                          </Box>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* ── Right: Records | Logs | Monthly | Policy ── */}
            <Box sx={{ boxSizing: "border-box", minHeight: 0, px: { xs: 1.5, lg: 0 }, pr: { lg: 2 }, py: 2, height: { xs: 640, lg: "100%" } }}>
              <SidePanelTabs
                employeeNumber={selectedEmployee?.employeeNumber}
                year={periodYear}
                month={periodMonth}
                hoursPerDay={hoursPerDay}
                refreshKey={recordsRefreshKey + balanceKey}
                recordsCount={selectedEmployee ? recordsCount : null}
                records={
                  <>
                    <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                      <RecordsList
                        employeeNumber={selectedEmployee?.employeeNumber}
                        type={EARN_POOLS[earnPool].id}
                        unit={unit}
                        refreshKey={recordsRefreshKey}
                        year={periodYear}
                        month={periodMonth}
                        onApproved={handleBalanceChanged}
                        standalone
                        onStatusChange={() => setVlReceiptRefreshKey((k) => k + 1)}
                        approverNameLookup={approverNameLookup}
                        onCountChange={setRecordsCount}
                      />
                    </Box>
                    {selectedEmployee && addToAbstractBar}
                  </>
                }
                monthly={
                  selectedEmployee ? (
                    <BalanceOverviewPanel
                      periods={periodData.periods}
                      loading={periodData.loading}
                      year={periodYear}
                      month={periodMonth}
                      unit={unit}
                      hoursPerDay={hoursPerDay}
                      selectedPool={balancePool}
                      onSelectPool={setBalancePool}
                      onSelectMonth={handleMonthChange}
                    />
                  ) : (
                    <Typography sx={{ textAlign: "center", color: T.muted, py: 3, fontSize: "0.74rem", fontFamily: T.poppins }}>
                      Select an employee to see the monthly balance.
                    </Typography>
                  )
                }
                policy={<CategoryRulesPanel category={selectedEmployee ? cscCategory : null} empCatLabel={selectedEmployee ? empCat?.label : ""} />}
              />
            </Box>
          </Box>

          {!isWorkspace && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                bgcolor: T.surface,
                zIndex: 2,
                overflow: "hidden",
              }}
            >
              <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" }}>
                {view === "abstract" ? (
                  <Abstract
                    employee={selectedEmployee}
                    year={periodYear}
                    month={periodMonth}
                    manualRows={manualAbstractRows}
                  />
                ) : (
                  <SalaryShortfallRegistry
                    employee={selectedEmployee}
                    year={periodYear}
                    month={periodMonth}
                  />
                )}
              </Box>
            </Box>
          )}
        </SectionCard>
      </Box>

      <DeductHalfDayVLModal
        open={vlHalfModalOpen}
        onClose={() => {
          setVlHalfModalOpen(false);
          setVlHalfDeductionOptions([]);
          setVlHalfChargeTo("VL");
          setVlHalfSuggestion(null);
          setVlHalfCreditSnapshots(null);
          setVlHalfAttendanceContext(null);
        }}
        onConfirm={applyVlHalfDeduction}
        attendanceContext={vlHalfAttendanceContext}
        employee={
          selectedEmployee
            ? {
                ...selectedEmployee,
                fullName: buildDisplayName(selectedEmployee),
                category:
                  empCat?.typeName || empCat?.category || empCat?.empCat || "",
              }
            : null
        }
        date={vlHalfSelectedDate}
        creditSnapshots={vlHalfCreditSnapshots}
        creditsLoading={vlHalfModalLoading}
        suggestedRateDecimal={vlHalfRateDecimal}
        hoursPerDay={hoursPerDay}
        deductionOptions={halfDayOptionsUi}
        chargeTo={vlHalfChargeTo}
        onChargeToChange={handleVlHalfChargeChange}
      />

      <Snackbar
        open={manualAbstractSnackbar.open}
        autoHideDuration={6000}
        onClose={() =>
          setManualAbstractSnackbar((s) => ({ ...s, open: false }))
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() =>
            setManualAbstractSnackbar((s) => ({ ...s, open: false }))
          }
          severity={manualAbstractSnackbar.severity}
          sx={{
            width: "100%",
            fontFamily: T.poppins,
            fontSize: "0.78rem",
            borderRadius: "10px",
          }}
        >
          {manualAbstractSnackbar.message}
        </Alert>
      </Snackbar>

      {/* Floating buttons stack — bottom right */}
      <Box
        sx={{
          position: "fixed",
          bottom: 60,
          right: 10,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        {/* Submit to Payroll floating button */}
        <Tooltip
          title={
            payrollRecordsForSubmit?.length
              ? "Submit to Regular Payroll"
              : "No payroll records ready"
          }
          placement="left"
        >
          <Box
            sx={{
              position: "fixed",
              bottom: 60,
              right: 10,
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <FloatingConversionWidget />
          </Box>
        </Tooltip>

        {/* Conversion widget trigger */}
        <FloatingConversionWidget />
      </Box>
    </Box>
  );
};

export default EarningsManagement;