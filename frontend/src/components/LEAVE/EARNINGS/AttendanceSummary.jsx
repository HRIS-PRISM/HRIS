import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
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
  Collapse,
  Paper,
  Tabs,
  Tab,
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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  CheckCircleOutline as ApproveIcon,
  CancelOutlined as RejectIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  DateRange as DateRangeIcon,
  Calculate as CalculateIcon,
  SwapHoriz as ConvertIcon,
  OpenInNew as OpenInNewIcon,
  RemoveCircleOutline as DeductIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";
import {
  useOfficialAttendanceMetrics,
  listHalfDayDatesFromDailyRows,
} from "./useOfficialAttendanceMetrics";
import { fetchDeductionCreditSnapshots } from "../../../utils/deductionSourceBalances";
import OverallAttendanceCompareModal from "../../ATTENDANCE/OverallAttendanceCompareModal";
import {
  buildOverallPutPayloadFromRow,
  mergeEarningsSummaryChoices,
  overallRecordsDiffer,
} from "../../ATTENDANCE/overallAttendanceMerge";

/** Align half-day row dates with API `deductedVlHalfDates` (handles YYYY-M-D vs YYYY-MM-DD). */
const normalizeHalfDayDateKey = (d) => {
  const s = String(d ?? "").trim().split("T")[0];
  const parts = s.split("-").filter(Boolean);
  if (parts.length !== 3) return s;
  const y = parseInt(parts[0], 10);
  const mo = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (![y, mo, day].every((n) => Number.isFinite(n))) return s;
  return `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

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
/** ISO date string (YYYY-MM-DD) → "January 01, 2026" (local calendar, no UTC shift). */
const formatPeriodDate = (iso) => {
  const s = String(iso ?? "")
    .trim()
    .split("T")[0];
  const parts = s.split("-").map(Number);
  const y = parts[0];
  const mo = parts[1];
  const day = parts[2];
  if (!y || !mo || !day) return s || "—";
  const d = new Date(y, mo - 1, day);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};
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

const EARNINGS_OVERALL_COMPARE_FIELDS = [
  { key: "overallRenderedOfficialTime", label: "Overall — rendered" },
  { key: "overallRenderedOfficialTimeTardiness", label: "Overall — tardiness" },
];
const EARNINGS_COMPARE_KEYS = EARNINGS_OVERALL_COMPARE_FIELDS.map((f) => f.key);

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

const Bone = ({ w = '100%', h = 14, r = 6, sx = {} }) => (
  <Box
    sx={{
      height: h,
      borderRadius: r,
      background: `linear-gradient(90deg, rgba(109,35,35,0.07) 25%, rgba(109,35,35,0.14) 50%, rgba(109,35,35,0.07) 75%)`,
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.6s infinite linear',
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

function sanitizeDecimal(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Number(n.toFixed(3));
}

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

const ColHeader = ({ icon: Icon, label, color = T.accent, children }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      px: 1.5,
      py: 1,
      flexWrap: "nowrap",
      borderBottom: `1px solid ${T.divider}`,
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
        minWidth: 0,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        flexShrink: 0,
        flexWrap: "nowrap",
      }}
    >
      {children}
    </Box>
  </Box>
);

import { DeductionReceiptSwitcher } from './CTODeductionReceipt';

const AttendanceFieldCell = ({ f, valueHrs, onChange }) => {
  const days = valueHrs / 8;
  const [local, setLocal] = useState("");
  const [focused, setFocused] = useState(false);
  const hms = valueHrs > 0 ? hrsToHMS(valueHrs) : null;
  const isActive = valueHrs > 0;
  return (
    <Box
      sx={{
        borderRadius: 1.5,
        border: `1px solid ${isActive ? "rgba(0,0,0,0.13)" : "rgba(0,0,0,0.07)"}`,
        bgcolor: isActive ? "#fff" : "#fafafa",
        overflow: "hidden",
        mb: 0.5,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      {/* Label bar */}
      <Box
        sx={{
          px: 0.85,
          py: 0.25,
          bgcolor: isActive ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.02)",
          borderBottom: `1px solid ${isActive ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)"}`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.58rem",
            fontWeight: 700,
            color: isActive ? "#333" : T.faint,
            fontFamily: T.poppins,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {f.label}
        </Typography>
      </Box>
      {/* Input + hints */}
      <Box
        sx={{
          px: 0.85,
          py: 0.4,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
        }}
      >
        <Box sx={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.000"
            value={focused ? local : isActive ? days.toFixed(3) : ""}
            onFocus={() => {
              setFocused(true);
              setLocal(isActive ? days.toFixed(3) : "");
            }}
            onChange={(e) => {
              setLocal(e.target.value);
              const n = parseFloat(e.target.value);
              onChange(f.key, isNaN(n) ? 0 : n * 8);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            style={{
              width: "100%",
              padding: "4px 24px 4px 8px",
              borderRadius: 6,
              border: `1.5px solid ${focused ? T.accent : isActive ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.1)"}`,
              fontSize: "0.78rem",
              fontWeight: 700,
              fontFamily: T.poppins,
              boxSizing: "border-box",
              background: "#fff",
              color: "#1a1a1a",
              transition: "border-color 0.15s",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.58rem",
              color: T.faint,
              pointerEvents: "none",
              fontFamily: T.poppins,
              fontWeight: 600,
            }}
          >
            d
          </span>
        </Box>
        {/* Converted hints */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
            minWidth: 58,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.58rem",
              color: isActive ? T.muted : T.faint,
              fontFamily: T.poppins,
              fontWeight: 500,
              lineHeight: 1.3,
            }}
          >
            {isActive ? `${valueHrs.toFixed(3)} hrs` : "—"}
          </Typography>
          {hms && (
            <Typography
              sx={{
                fontSize: "0.58rem",
                color: "#1565c0",
                fontFamily: T.poppins,
                fontWeight: 700,
                lineHeight: 1.3,
                letterSpacing: "0.02em",
              }}
            >
              {hms}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};


const AttendanceSummary = ({
  employee, year, month, attendanceData, attendanceLoading,
  onRefresh, onRecordsRefresh, empCat, vlReceiptRefreshKey, balanceRefreshKey = 0,
  /** Bump parent balance refresh (e.g. balanceKey) after SC/CTO/VL deductions so VL·SC·CTO chips refetch. */
  onBalancesInvalidate,
  deductedVlHalfDates = [],
  onDeductHalfDayVLRequested,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fields, setFields] = useState({});

  const [liveBalances, setLiveBalances] = useState({ vl: null, sc: null, cto: null });

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareFormProposal, setCompareFormProposal] = useState(null);
  const [compareTertiary, setCompareTertiary] = useState(null);
  const [summaryUpdateNote, setSummaryUpdateNote] = useState("");

const fetchLiveBalances = useCallback(async () => {
  if (!employee) return;
  // In-place balance updates (no loading swap) to avoid flicker on refreshKey / websocket sync.
  const token = localStorage.getItem("token");
  try {
    const snaps = await fetchDeductionCreditSnapshots(employee.employeeNumber, token);
    const vlHours = toNum(snaps?.assignmentMap?.VL?.remaining_hours);
    setLiveBalances({
      vl: (vlHours / 8).toFixed(3),
      sc: (toNum(snaps?.scRemainingHours) / 8).toFixed(3),
      cto: (toNum(snaps?.ctoRemainingHours) / 8).toFixed(3),
    });
  } catch {
    setLiveBalances({ vl: "—", sc: "—", cto: "—" });
  }
}, [employee]);

useEffect(() => { fetchLiveBalances(); }, [fetchLiveBalances, balanceRefreshKey]);

  const raw = attendanceData?.summary;
  const calDays = getCalendarDays(year, month);
  const officialStart = raw?.startDate;
  const officialEnd = raw?.endDate;
  const {
    absentDays: absentDaysOfficial,
    halfDayDatesOfficial,
    rows: officialRows,
    absentTimeHrs: absentTimeHrsOfficial,
    halfDayShortfallHrs: halfDayShortfallHrsOfficial,
    renderedHrs: renderedHrsOfficial,
    loading: officialMetricsLoading,
  } = useOfficialAttendanceMetrics({
    employeeNumber: employee?.employeeNumber,
    startDate: officialStart,
    endDate: officialEnd,
  });

  /** Same daily-derived metrics as Overall Attendance (ATTENDANCE/AttendanceSummary.jsx). */
  const canTrustOfficialMetrics =
    !officialMetricsLoading &&
    Boolean(officialStart && officialEnd && employee?.employeeNumber);

  /** Matches ATTENDANCE/AttendanceSummary `_lateTotal`: saved overall minus absent/half shortfall when those buckets exist. */
  const noAbsentNoHalfShortfall =
    canTrustOfficialMetrics &&
    Math.abs(toNum(absentTimeHrsOfficial)) < 1e-9 &&
    Math.abs(toNum(halfDayShortfallHrsOfficial)) < 1e-9;

  const ATTEND_FIELDS = [
    { key: "overallRenderedOfficialTime", label: "Overall Rendered" },
    { key: "overallRenderedOfficialTimeTardiness", label: "Overall Tardiness" },
  ];

  useEffect(() => {
    if (!raw) {
      setFields({});
      return;
    }
    const init = {};
    ATTEND_FIELDS.forEach(({ key }) => {
      init[key] = parseHHMM(raw[key]);
    });
    setFields(init);
    setEditing(false);
  }, [raw]);

  const handleChange = (key, val) =>
    setFields((p) => ({ ...p, [key]: toNum(val) }));

  const putSummaryPayload = async (payload) => {
    const token = localStorage.getItem("token");
    await axios.put(
      `${API_BASE_URL}/attendance/api/overall_attendance_record/${raw.id}`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setSuccess("Saved!");
    setEditing(false);
    setSummaryUpdateNote(`Summary updated · ${new Date().toLocaleString()}`);
    if (onRefresh) onRefresh();
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleSave = async () => {
    if (!raw?.id) {
      setError("No record to update.");
      return;
    }
    setSaving(true);
    setError("");
    const formProposal = {
      overallRenderedOfficialTime: hoursToHHMM(
        toNum(fields.overallRenderedOfficialTime),
      ),
      overallRenderedOfficialTimeTardiness: hoursToHHMM(
        toNum(fields.overallRenderedOfficialTimeTardiness),
      ),
    };
    const overallTardStrForDb =
      raw._savedOverallTardinessFromRecord != null &&
      String(raw._savedOverallTardinessFromRecord).trim() !== ""
        ? raw._savedOverallTardinessFromRecord
        : raw.overallRenderedOfficialTimeTardiness;
    const savedTardHrs = parseHHMM(overallTardStrForDb);
    const absentH = toNum(absentTimeHrsOfficial);
    const halfH = toNum(halfDayShortfallHrsOfficial);
    const lateTotalHrsForOar = noAbsentNoHalfShortfall
      ? savedTardHrs
      : Math.max(0, savedTardHrs - absentH - halfH);
    const tertiaryProposal = canTrustOfficialMetrics
      ? {
          overallRenderedOfficialTime: hoursToHHMM(toNum(renderedHrsOfficial)),
          overallRenderedOfficialTimeTardiness: hoursToHHMM(lateTotalHrsForOar),
        }
      : null;
    const diffSavedForm = overallRecordsDiffer(
      raw,
      formProposal,
      EARNINGS_COMPARE_KEYS,
    );
    const diffSavedTert =
      tertiaryProposal &&
      overallRecordsDiffer(raw, tertiaryProposal, EARNINGS_COMPARE_KEYS);

    try {
      if (diffSavedForm || diffSavedTert) {
        setCompareFormProposal(formProposal);
        setCompareTertiary(tertiaryProposal);
        setCompareOpen(true);
        return;
      }
      const payload = buildOverallPutPayloadFromRow(raw, formProposal);
      await putSummaryPayload(payload);
    } catch (err) {
      setError("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCompareClose = () => {
    setCompareOpen(false);
    setCompareFormProposal(null);
    setCompareTertiary(null);
    setSaving(false);
  };

  const handleCompareConfirm = async (choices) => {
    if (!raw?.id || !compareFormProposal) {
      handleCompareClose();
      return;
    }
    setCompareOpen(false);
    setSaving(true);
    setError("");
    try {
      const payload = mergeEarningsSummaryChoices(
        raw,
        compareFormProposal,
        compareTertiary || {},
        choices,
      );
      await putSummaryPayload(payload);
    } catch (err) {
      setError("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
      setCompareFormProposal(null);
      setCompareTertiary(null);
    }
  };

  const showEmployeePlaceholder = !employee;

    

  const showAttendanceLoading = attendanceLoading;

  const overallHrs = raw ? parseHHMM(raw.overallRenderedOfficialTime) : 0;

  const tardHrs = (() => {
    if (!raw) return 0;
    if (
      raw._savedOverallTardinessFromRecord != null &&
      String(raw._savedOverallTardinessFromRecord).trim() !== ""
    ) {
      return parseHHMM(raw.overallRenderedOfficialTimeTardiness);
    }
    const savedTardHrs = parseHHMM(raw.overallRenderedOfficialTimeTardiness);
    if (noAbsentNoHalfShortfall) return savedTardHrs;
    if (canTrustOfficialMetrics) {
      return Math.max(
        0,
        savedTardHrs -
          toNum(absentTimeHrsOfficial) -
          toNum(halfDayShortfallHrsOfficial),
      );
    }
    return savedTardHrs;
  })();
  const stats = attendanceData?.stats || {};
  const lateDays = toNum(stats.late_days);
  /** When official metrics load, match ATTENDANCE/AttendanceSummary: half-days exclude approved leave / holiday / suspension. */
  const halfDays = canTrustOfficialMetrics
    ? (Array.isArray(halfDayDatesOfficial) ? halfDayDatesOfficial.length : 0)
    : toNum(stats.half_days ?? stats.halfDays);
  /** Match ATTENDANCE/AttendanceSummary half-day column: official sched shortfall sum, not fixed 4h × count. */
  const halfDayHrs = canTrustOfficialMetrics
    ? toNum(halfDayShortfallHrsOfficial)
    : halfDays * 4;
  const halfDayDates = useMemo(() => {
    if (canTrustOfficialMetrics) {
      return Array.isArray(halfDayDatesOfficial) ? [...halfDayDatesOfficial] : [];
    }
    let dates = listHalfDayDatesFromDailyRows(officialRows);
    if (!dates.length) {
      dates = listHalfDayDatesFromDailyRows(
        Array.isArray(attendanceData?.dailyRecords) ? attendanceData.dailyRecords : [],
      );
    }
    const statsHalf = toNum(attendanceData?.stats?.half_days ?? attendanceData?.stats?.halfDays);
    if (!dates.length && statsHalf > 0.0001) {
      const fallback =
        (officialStart && String(officialStart).slice(0, 10)) ||
        `${year}-${String(month).padStart(2, "0")}-01`;
      if (fallback) dates = [fallback];
    }
    return [...new Set(dates)].sort();
  }, [
    canTrustOfficialMetrics,
    halfDayDatesOfficial,
    officialRows,
    attendanceData?.dailyRecords,
    attendanceData?.stats,
    officialStart,
    year,
    month,
  ]);

  const deductedNormSet = useMemo(
    () =>
      new Set(
        (deductedVlHalfDates || []).map(normalizeHalfDayDateKey).filter(Boolean),
      ),
    [deductedVlHalfDates],
  );
  const nextUndeductedVlHalfDate =
    halfDayDates.find((d) => !deductedNormSet.has(normalizeHalfDayDateKey(d))) ||
    null;
  const absentDays = canTrustOfficialMetrics
    ? absentDaysOfficial
    : toNum(stats.absent_days);
  const presentDays = toNum(stats.present_days);
  const totalAbsentDays = absentDays;
  const totalAbsentHrs = totalAbsentDays * 8;

  const editOverallHrs = toNum(
    fields.overallRenderedOfficialTime ?? overallHrs,
  );
  const editTardHrs = toNum(
    fields.overallRenderedOfficialTimeTardiness ?? tardHrs,
  );

  // While editing, show the edited values in the summary cards immediately.
  const renderedHrsDisplay = editing ? editOverallHrs : overallHrs;
  const tardHrsDisplay = editing ? editTardHrs : tardHrs;
  const half = Math.ceil(ATTEND_FIELDS.length / 2);
  const col1 = ATTEND_FIELDS.slice(0, half);
  const col2 = ATTEND_FIELDS.slice(half);

  // Safe early returns AFTER all hooks are declared (prevents hook order mismatch).
  if (showEmployeePlaceholder) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ColHeader icon={DateRangeIcon} label="Attendance Summary" color={T.accent} />
      </Box>
    );
  }
  if (showAttendanceLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ColHeader icon={DateRangeIcon} label="Attendance Summary" color={T.accent} />
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={20} sx={{ color: T.accent }} />
        </Box>
      </Box>
    );
  }

  const btnOutlineSx = {
    textTransform: "none",
    fontFamily: T.poppins,
    fontSize: "0.75rem",
    fontWeight: 600,
    py: 0.4,
    px: 1.1,
    borderRadius: 1,
    borderColor: "rgba(0,0,0,0.18)",
    color: T.muted,
    minWidth: 0,
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Scrollable content area ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1,
          pt: 0.5,
          pb: 1,
          display: "flex",
          flexDirection: "column",
          "&::-webkit-scrollbar": { width: 3 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(0,0,0,0.12)",
            borderRadius: 2,
          },
        }}
      >
        {success && (
          <Alert
            severity="success"
            sx={{
              py: 0,
              px: 1,
              mb: 1,
              fontSize: "0.65rem",
              borderRadius: 1.25,
              "& .MuiAlert-icon": { mr: 0.75 },
            }}
          >
            {success}
          </Alert>
        )}
        {!raw ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <ColHeader icon={DateRangeIcon} label="Attendance Summary" color={T.accent} />
            <Box
              sx={{
                px: 1.5,
                py: 2,
                borderRadius: 2,
                bgcolor: "rgba(0,0,0,0.03)",
                border: "1px dashed rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
              }}
            >
            <DateRangeIcon
              sx={{ fontSize: 20, color: T.faint, opacity: 0.5 }}
            />
            <Typography
              sx={{
                fontSize: "0.73rem",
                fontWeight: 700,
                color: "#333",
                fontFamily: T.poppins,
              }}
            >
              {monthName(month)} {year}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.62rem",
                color: T.faint,
                fontFamily: T.poppins,
                textAlign: "center",
              }}
            >
              {calDays} cal. days · No attendance record found
            </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <ColHeader icon={DateRangeIcon} label="Attendance Summary" color={T.accent}>
              <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexShrink: 0 }}>
                {!editing ? (
                  <Button variant="outlined" size="small" onClick={() => setEditing(true)} sx={btnOutlineSx}>
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button variant="outlined" size="small" onClick={() => setEditing(false)} sx={btnOutlineSx}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSave}
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={12} color="inherit" /> : <SaveIcon sx={{ fontSize: "14px !important" }} />}
                      sx={{
                        ...btnOutlineSx,
                        bgcolor: T.accent,
                        color: "#fff",
                        border: "none",
                        "&:hover": { bgcolor: T.accentDark, border: "none" },
                      }}
                    >
                      {saving ? "…" : "Save"}
                    </Button>
                  </>
                )}
                <IconButton size="small" onClick={onRefresh} sx={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 1, p: 0.35 }}>
                  <RefreshIcon sx={{ fontSize: 16, color: T.muted }} />
                </IconButton>
              </Box>
            </ColHeader>
            <Box sx={{ px: 0.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  flexWrap: "wrap",
                  rowGap: 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.6875rem",
                    color: T.muted,
                    fontFamily: T.poppins,
                    flex: "1 1 auto",
                    minWidth: 0,
                  }}
                >
                  {monthName(month)} {year} | {formatPeriodDate(raw.startDate)} -&gt;{" "}
                  {formatPeriodDate(raw.endDate)}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.6875rem",
                    color: T.muted,
                    fontFamily: T.poppins,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {calDays} Calendar Days
                </Typography>
              </Box>

            <Box
              sx={{
                bgcolor: "#fff",
                border: "1px solid rgba(0,0,0,0.09)",
                borderRadius: 1.5,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 1.6,
                  py: 1,
                  bgcolor: "rgba(0,0,0,0.03)",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CalIcon sx={{ fontSize: 16, color: T.muted }} />
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 500, color: T.text, fontFamily: T.poppins }}>
                  Metrics
                </Typography>
              </Box>
              <Box sx={{ p: 1.6, display: "flex", flexDirection: "column", gap: 1.25 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: 0.75,
                  }}
                >
                  {[
                    {
                      label: "Days rendered",
                      primary: `${(renderedHrsDisplay / 8).toFixed(3)} d`,
                      hint: hrsToHMS(renderedHrsDisplay),
                      bad: false,
                      good: false,
                    },
                    {
                      label: "Tardiness",
                      primary: `${(tardHrsDisplay / 8).toFixed(3)} d`,
                      hint: tardHrsDisplay > 0 ? hrsToHMS(tardHrsDisplay) : "—",
                      bad: tardHrsDisplay > 0,
                      good: false,
                    },
                    {
                      label: "Absences",
                      primary: `${totalAbsentDays.toFixed(3)} d`,
                      hint: totalAbsentDays > 0 ? `${totalAbsentHrs.toFixed(3)} hrs` : "—",
                      bad: totalAbsentDays > 0,
                      good: false,
                    },
                    {
                      label: "Half days",
                      primary: `${halfDays.toFixed(3)} d`,
                      hint: halfDays > 0 ? hrsToHMS(halfDayHrs) : "—",
                      bad: false,
                      good: false,
                    },
                    {
                      label: "Days present",
                      primary: `${presentDays.toFixed(0)} d`,
                      hint: presentDays > 0 ? hrsToHMS(presentDays * 8) : "—",
                      bad: false,
                      good: presentDays > 0,
                    },
                  ].map(({ label, primary, hint, bad, good }) => (
                    <Box
                      key={label}
                      sx={{
                        bgcolor: "rgba(0,0,0,0.03)",
                        borderRadius: 1,
                        p: "8px 9px",
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.6875rem",
                          color: T.muted,
                          fontFamily: T.poppins,
                          mb: "3px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: bad ? "#A32D2D" : good ? "#3B6D11" : T.text,
                          fontFamily: T.poppins,
                          lineHeight: 1.2,
                        }}
                      >
                        {primary}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.6875rem",
                          color: T.muted,
                          fontFamily: T.poppins,
                          mt: "1px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {hint}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {editing && (
                  <>
                    <Box sx={{ height: "0.5px", bgcolor: T.divider, my: 0.25 }} />
                    <Typography sx={{ fontSize: "0.69rem", color: T.muted, fontFamily: T.poppins, mb: 0.5 }}>
                      Edit raw values — input in days
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
                      <Box>
                        {col1.map((f) => (
                          <AttendanceFieldCell key={f.key} f={f} valueHrs={toNum(fields[f.key])} onChange={handleChange} />
                        ))}
                      </Box>
                      <Box>
                        {col2.map((f) => (
                          <AttendanceFieldCell key={f.key} f={f} valueHrs={toNum(fields[f.key])} onChange={handleChange} />
                        ))}
                      </Box>
                    </Box>
                    {error && (
                      <Alert severity="error" sx={{ mt: 0.5, fontSize: "0.65rem", py: 0, borderRadius: 1 }}>
                        {error}
                      </Alert>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.75, mt: 0.5 }}>
                      <Button variant="outlined" size="small" onClick={() => setEditing(false)} sx={btnOutlineSx}>
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleSave}
                        disabled={saving}
                        sx={{
                          textTransform: "none",
                          fontFamily: T.poppins,
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          bgcolor: T.accent,
                          borderRadius: 1,
                          "&:hover": { bgcolor: T.accentDark },
                        }}
                      >
                        {saving ? "…" : "Save"}
                      </Button>
                    </Box>
                  </>
                )}

                {!editing && (
                  <Box>
                    <Typography sx={{ fontSize: "0.6875rem", color: T.muted, fontFamily: T.poppins, mb: "6px" }}>
                      Leave balances
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 0.875,
                      }}
                    >
                      {[
                        {
                          title: "Vacation leave (VL)",
                          val: liveBalances.vl,
                          nameColor: "#185FA5",
                          valColor: "#0C447C",
                          subColor: "#185FA5",
                          bg: "#E6F1FB",
                          border: "#B5D4F4",
                        },
                        {
                          title: "Service credit (SC)",
                          val: liveBalances.sc,
                          nameColor: "#3B6D11",
                          valColor: "#27500A",
                          subColor: "#3B6D11",
                          bg: "#EAF3DE",
                          border: "#C0DD97",
                        },
                        {
                          title: "Comp. time off (CTO)",
                          val: liveBalances.cto,
                          nameColor: "#534AB7",
                          valColor: "#3C3489",
                          subColor: "#534AB7",
                          bg: "#EEEDFE",
                          border: "#AFA9EC",
                        },
                      ].map((b) => {
                        const num = parseFloat(b.val);
                        const isNeg = Number.isFinite(num) && num < 0;
                        const displayColor = isNeg ? "#c62828" : b.valColor;
                        return (
                          <Box
                            key={b.title}
                            sx={{
                              textAlign: "center",
                              p: "9px 10px",
                              borderRadius: 1,
                              border: `0.5px solid ${b.border}`,
                              bgcolor: b.bg,
                            }}
                          >
                            <Typography sx={{ fontSize: "0.6875rem", color: b.nameColor, fontFamily: T.poppins, mb: "3px" }}>
                              {b.title}
                            </Typography>
                            <Typography sx={{ fontSize: "1.1875rem", fontWeight: 500, color: displayColor, fontFamily: T.poppins, lineHeight: 1.2 }}>
                              {b.val ?? "—"}
                            </Typography>
                            <Typography sx={{ fontSize: "0.6875rem", color: b.subColor, fontFamily: T.poppins, mt: "2px" }}>
                              days remaining
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Step 1–2 balances: combine keys so SC/CTO refetch when balanceKey bumps (chips), not only vlReceiptRefreshKey */}
            <DeductionReceiptSwitcher
              employee={employee}
              attendanceData={attendanceData}
              year={year}
              month={month}
              onDeductSuccess={() => {
                if (onRefresh) onRefresh();
                if (onRecordsRefresh) onRecordsRefresh();
                if (onBalancesInvalidate) onBalancesInvalidate();
              }}
              refreshKey={
                (vlReceiptRefreshKey ?? 0) + (balanceRefreshKey ?? 0)
              }
              empCat={empCat}
              onDeductHalfDayVLRequested={onDeductHalfDayVLRequested}
              halfDayDeductDate={nextUndeductedVlHalfDate || null}
              halfDayPendingDates={halfDayDates}
              deductedVlHalfDates={deductedVlHalfDates}
              metricsTardinessHrs={tardHrsDisplay}
            />
            {summaryUpdateNote ? (
              <Typography
                sx={{
                  fontSize: "0.58rem",
                  color: T.muted,
                  fontFamily: T.poppins,
                  textAlign: "center",
                  pt: 0.75,
                  pb: 0.25,
                }}
              >
                {summaryUpdateNote}
              </Typography>
            ) : null}
            </Box>
          </Box>
        )}
      </Box>

      <OverallAttendanceCompareModal
        open={compareOpen}
        onClose={handleCompareClose}
        onConfirm={handleCompareConfirm}
        savedRow={raw}
        proposedRecord={compareFormProposal}
        tertiaryRecord={compareTertiary}
        fields={EARNINGS_OVERALL_COMPARE_FIELDS}
        title="Compare summary vs your edit"
      />
    </Box>
  );
};


export { AttendanceSummary };