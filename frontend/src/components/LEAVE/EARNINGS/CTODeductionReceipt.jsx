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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Paper,
  Tabs,
  Tab,
  Checkbox,
  Menu,
  Divider,
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
   KeyboardArrowDown as ArrowDownIcon, 
   Policy as PolicyIcon
} from "@mui/icons-material";

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

const fmtDays3 = (n, { allowNegZero = true } = {}) => {
  const fixed = Number(toNum(n).toFixed(3));
  const safe = (!allowNegZero && Object.is(fixed, -0)) ? 0 : fixed;
  return `${safe.toFixed(3)} d`;
};

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

// ─── CTODeductionReceipt (FIXED: compact, no-scroll, aligned side-by-side) ────

const CTODeductionReceipt = ({
  employee,
  attendanceData,
  year,
  month,
  onDeductSuccess,
  refreshKey,
  empCat,
}) => {
  const [checkedAbsence, setCheckedAbsence] = useState(false);
  const [checkedTardiness, setCheckedTardiness] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deductSource, setDeductSource] = useState(null); // "sc" | "cto" | "normal"
  const [deducting, setDeducting] = useState(false);
  const [deductError, setDeductError] = useState("");
  const [deductSuccess, setDeductSuccess] = useState("");
  const [policySelection, setPolicySelection] = useState(null); // 'sc' | 'cto' | null
  const [policyMenuAnchor, setPolicyMenuAnchor] = useState(null);
  const [ctoBalance, setCtoBalance] = useState(null);
  const [vlBalance, setVlBalance] = useState(null);
  const [scBuffer, setScBuffer] = useState(0);
  const [balLoading, setBalLoading] = useState(false);
  const [existingCtoDeductions, setExistingCtoDeductions] = useState([]);
  const [existingVlDeductions, setExistingVlDeductions] = useState([]);
  const [existingScDeductions, setExistingScDeductions] = useState([]);
  const [deductionsLoading, setDeductionsLoading] = useState(false);
 
  // ── Fetch balances ──────────────────────────────────────────────────────────
  const fetchBalances = useCallback(async () => {
    if (!employee) {
      setCtoBalance(null); setVlBalance(null); setScBuffer(0);
      return;
    }
    setBalLoading(true);
    const token = localStorage.getItem("token");
    try {
      const [assignRes, scRes, ctoRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/earnings/assignment-balances/${employee.employeeNumber}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/earnings/sc/${employee.employeeNumber}/balance`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/earnings/cto/${employee.employeeNumber}/balance`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setVlBalance(assignRes.status === "fulfilled" ? toNum(assignRes.value.data?.VL?.remaining_hours) / 8 : 0);
      setCtoBalance(ctoRes.status === "fulfilled" ? toNum(ctoRes.value.data?.totalRemaining) / 8 : 0);
      setScBuffer(scRes.status === "fulfilled" ? toNum(scRes.value.data?.totalRemaining) / 8 : 0);
    } catch {
      setCtoBalance(0); setVlBalance(0); setScBuffer(0);
    } finally {
      setBalLoading(false);
    }
  }, [employee]);
 
  // ── Fetch existing deductions (SC + CTO + VL) ──────────────────────────────
  const fetchExistingDeductions = useCallback(async () => {
    if (!employee) {
      setExistingCtoDeductions([]); setExistingVlDeductions([]); setExistingScDeductions([]);
      return;
    }
    setDeductionsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const [ctoRes, leaveRes, scRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/earnings/cto/${employee.employeeNumber}?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/earnings/leave/${employee.employeeNumber}?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/earnings/sc/${employee.employeeNumber}?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setExistingCtoDeductions(
        ctoRes.status === "fulfilled"
          ? (ctoRes.value.data?.earnings || []).filter(e => e.entry_type === "DEDUCTION" && e.earn_status !== "rejected")
          : []
      );
      setExistingVlDeductions(
        leaveRes.status === "fulfilled"
          ? (leaveRes.value.data?.earnings || []).filter(e => e.entry_type === "TARDINESS_DEDUCTION" && e.leave_code === "VL" && e.earn_status !== "rejected")
          : []
      );
      setExistingScDeductions(
        scRes.status === "fulfilled"
          ? (scRes.value.data?.earnings || []).filter(e => e.entry_type === "DEDUCTION" && e.earn_status !== "rejected")
          : []
      );
    } catch {
      setExistingCtoDeductions([]); setExistingVlDeductions([]); setExistingScDeductions([]);
    } finally {
      setDeductionsLoading(false);
    }
  }, [employee, year, month]);
 
  useEffect(() => {
    fetchBalances();
    fetchExistingDeductions();
  }, [fetchBalances, fetchExistingDeductions, refreshKey]);
 
  // ── Derived numbers ─────────────────────────────────────────────────────────
  const tardHrs = attendanceData?.summary
    ? parseHHMM(attendanceData.summary.overallRenderedOfficialTimeTardiness)
    : 0;
  const tardDays = tardHrs / 8;
  const absentDays = toNum(attendanceData?.stats?.absent_days);
 
  // Use ACTUAL posted deductions, NOT the available balance, for coverage logic
  const alreadyScDeducted = existingScDeductions.reduce((s, e) => s + Math.abs(toNum(e.earned_hours)) / 8, 0);
  const alreadyCtoDeducted = existingCtoDeductions.reduce((s, e) => s + Math.abs(toNum(e.earned_hours)) / 8, 0);
  const alreadyVlDeducted = existingVlDeductions.reduce((s, e) => s + Math.abs(toNum(e.earned_hours)) / 8, 0);
 
  // How much absence SC has actually covered via posted deductions
  const scActuallyCovered = Number(Math.min(alreadyScDeducted, absentDays).toFixed(3));
  const absenceAfterSc = Number(Math.max(0, absentDays - scActuallyCovered).toFixed(3));
 
  // CTO covers whatever SC hasn't
  const remainingAbsenceCto = Number(Math.max(0, absenceAfterSc - alreadyCtoDeducted).toFixed(3));
  const remainingTardVl = Number(Math.max(0, tardDays - alreadyVlDeducted).toFixed(3));
 
  // Status flags — based on actual posted deductions only
  const absenceCoveredBySC = absentDays > 0 && scActuallyCovered >= absentDays;
  const absenceFullyDeducted = absentDays > 0 && absenceAfterSc > 0 && alreadyCtoDeducted >= absenceAfterSc;
  const tardinessFullyDeducted = tardDays > 0 && alreadyVlDeducted >= tardDays;
 
  const absencePending = existingCtoDeductions.some(e => e.earn_status === "pending");
  const absenceApproved = existingCtoDeductions.some(e => e.earn_status === "approved");
  const scPending = existingScDeductions.some(e => e.earn_status === "pending");
  const scApproved = existingScDeductions.some(e => e.earn_status === "approved");
  const tardinessPending = existingVlDeductions.some(e => e.earn_status === "pending");
  const tardinessApproved = existingVlDeductions.some(e => e.earn_status === "approved");
 
  const ctoBal = ctoBalance !== null ? ctoBalance : 0;
  const vlBal = vlBalance !== null ? vlBalance : 0;
 
  const newCtoBalance = Number((ctoBal - remainingAbsenceCto).toFixed(3));
  const newVlBalance = Number((vlBal - remainingTardVl).toFixed(3));
  // SC preview: what balance will look like after SC deduction
  const absenceAmountForSource = remainingAbsenceCto > 0 ? remainingAbsenceCto : absentDays;
  const newScBalance = Number((scBuffer - absenceAmountForSource).toFixed(3));
  const newCtoBalanceOverride = Number((ctoBal - absenceAmountForSource).toFixed(3));
  const allowScNegZero = ctoBal <= 0;
 
  const bothDone =
    (absentDays === 0 || absenceCoveredBySC || absenceFullyDeducted) &&
    (tardDays === 0 || tardinessFullyDeducted);
 
  // KEY CONDITION: show SC warning + two buttons when:
  //   scBuffer > 0  AND  absence exists  AND  not yet SC-deducted this period
  const showScWarningButtons =
    scBuffer > 0 &&
    absentDays > 0 &&
    !absenceCoveredBySC &&
    alreadyScDeducted < absentDays;
 
  const canDeductNormal =
    (checkedAbsence && remainingAbsenceCto > 0) ||
    (checkedTardiness && remainingTardVl > 0);
 
  const isLoading = balLoading || deductionsLoading;
 
  useEffect(() => {
    if (showScWarningButtons) setPolicySelection("sc");
    else setPolicySelection(null);
  }, [showScWarningButtons]);
 
  // ── Handlers ────────────────────────────────────────────────────────────────
  const openConfirm = (source) => {
    setDeductSource(source);
    setDeductError("");
    setConfirmOpen(true);
  };
 
  const closeConfirm = () => {
    setConfirmOpen(false);
    setDeductSource(null);
    setDeductError("");
  };
 
  const handleDeduct = async () => {
    if (!employee) return;
    setDeducting(true);
    setDeductError("");
    const token = localStorage.getItem("token");
    try {
      if (deductSource === "sc") {
        await axios.post(
          `${API_BASE_URL}/api/earnings/sc`,
          {
            employeeNumber: employee.employeeNumber,
            sc_type: "non_commutative",
            earned_hours: -(absenceAmountForSource * 8),
            total_ot_hours: 0,
            period_year: parseInt(year, 10),
            period_month: parseInt(month, 10),
            entry_type: "DEDUCTION",
            remarks: `SC-first policy: ${absenceAmountForSource.toFixed(3)}d absence offset from SC for ${monthName(month)} ${year}`,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else if (deductSource === "cto") {
        await axios.post(
          `${API_BASE_URL}/api/earnings/cto`,
          {
            employeeNumber: employee.employeeNumber,
            ot_hours: 0,
            earned_hours: -(absenceAmountForSource * 8),
            period_year: parseInt(year, 10),
            period_month: parseInt(month, 10),
            entry_type: "DEDUCTION",
            remarks: `CTO override (SC not depleted): ${absenceAmountForSource.toFixed(3)}d absence offset from CTO for ${monthName(month)} ${year}`,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        // Normal: CTO for absence + VL for tardiness (checkboxes)
        if (checkedAbsence && remainingAbsenceCto > 0) {
          await axios.post(
            `${API_BASE_URL}/api/earnings/cto`,
            {
              employeeNumber: employee.employeeNumber,
              ot_hours: 0,
              earned_hours: -(remainingAbsenceCto * 8),
              period_year: parseInt(year, 10),
              period_month: parseInt(month, 10),
              entry_type: "DEDUCTION",
              remarks: `Absence offset: ${remainingAbsenceCto.toFixed(3)}d for ${monthName(month)} ${year}`,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        }
        if (checkedTardiness && remainingTardVl > 0) {
          await axios.post(
            `${API_BASE_URL}/api/earnings/leave`,
            {
              employeeNumber: employee.employeeNumber,
              leave_code: "VL",
              earned_hours: -(remainingTardVl * 8),
              period_year: parseInt(year, 10),
              period_month: parseInt(month, 10),
              entry_type: "TARDINESS_DEDUCTION",
              remarks: `Tardiness deduction: ${remainingTardVl.toFixed(3)}d for ${monthName(month)} ${year}`,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        }
      }
 
      setDeductSuccess("Deduction submitted successfully.");
      closeConfirm();
      setCheckedAbsence(false);
      setCheckedTardiness(false);
      await Promise.all([fetchBalances(), fetchExistingDeductions()]);
      if (onDeductSuccess) onDeductSuccess();
      setTimeout(() => setDeductSuccess(""), 5000);
    } catch (err) {
      setDeductError("Deduction failed: " + (err.response?.data?.error || err.message));
    } finally {
      setDeducting(false);
    }
  };
 
  if (!attendanceData?.summary) return null;
  const hasAnything =
    absentDays > 0 || tardDays > 0 || absenceFullyDeducted ||
    tardinessFullyDeducted || ctoBal > 0 || scBuffer > 0;
  if (!hasAnything && !balLoading) return null;
 
  // ── Sub-components ──────────────────────────────────────────────────────────
  const SBadge = ({ label, approved }) => (
    <Chip size="small" label={label || (approved ? "Applied" : "Pending")}
      sx={{
        height: 16, fontSize: "0.56rem", fontWeight: 700,
        bgcolor: approved ? "rgba(46,125,50,0.14)" : "rgba(255,160,0,0.14)",
        color: approved ? "#1b5e20" : "#7a4a00",
        border: `1px solid ${approved ? "rgba(46,125,50,0.28)" : "rgba(255,160,0,0.28)"}`,
      }}
    />
  );
 
  const R = ({ label, value, valueColor, sub, bold, faded }) => (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", opacity: faded ? 0.5 : 1, mb: 0.4 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: bold ? "0.67rem" : "0.65rem", fontWeight: bold ? 700 : 500, color: "#2a2a2a", fontFamily: T.poppins, lineHeight: 1.4 }}>
          {label}
        </Typography>
        {sub && <Typography sx={{ fontSize: "0.57rem", color: T.faint, fontFamily: T.poppins, lineHeight: 1.3, mt: 0.1 }}>{sub}</Typography>}
      </Box>
      {value !== undefined && (
        <Typography sx={{ fontSize: bold ? "0.82rem" : "0.7rem", fontWeight: bold ? 900 : 600, color: valueColor || "#1a1a1a", fontFamily: T.poppins, ml: 1, flexShrink: 0, lineHeight: 1.4 }}>
          {value}
        </Typography>
      )}
    </Box>
  );
 
  const SectionLabel = ({ children }) => (
    <Box sx={{ px: 1.25, py: 0.45, bgcolor: "rgba(109,35,35,0.04)", borderBottom: "1px solid rgba(109,35,35,0.1)", borderTop: "1px solid rgba(109,35,35,0.1)" }}>
      <Typography sx={{ fontSize: "0.55rem", fontWeight: 800, color: alpha(T.accent, 0.5), fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {children}
      </Typography>
    </Box>
  );
 
  const BalanceFooter = ({ bal, label }) => {
    const color = bal < 0 ? "#c62828" : bal === 0 ? "#7a4a00" : "#1e4d20";
    return (
      <Box sx={{ px: 1.25, py: 0.85, borderTop: "1.5px solid rgba(109,35,35,0.14)", bgcolor: bal < 0 ? "rgba(198,40,40,0.05)" : bal === 0 ? "rgba(122,74,0,0.05)" : "rgba(30,77,32,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {label && <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: "#555", fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Typography>}
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 900, color, fontFamily: T.poppins, ml: "auto" }}>{bal.toFixed(3)} d</Typography>
      </Box>
    );
  };
 
  const showAbsence = absentDays > 0;
  const showTardiness = tardDays > 0;
  const columns = (showAbsence ? 1 : 0) + (showTardiness ? 1 : 0);
 
  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          MAIN CARD
      ══════════════════════════════════════════════════════════════ */}
      <Box sx={{
        mt: 1, borderRadius: 1.5,
        border: `1px solid ${bothDone ? "rgba(46,125,50,0.22)" : "rgba(109,35,35,0.16)"}`,
        bgcolor: bothDone ? "rgba(46,125,50,0.02)" : "rgba(109,35,35,0.02)",
        overflow: "hidden",
      }}>
 
        {/* Header */}
        <Box sx={{ px: 1.25, py: 0.65, bgcolor: bothDone ? "rgba(46,125,50,0.08)" : "rgba(109,35,35,0.06)", borderBottom: `1px solid ${bothDone ? "rgba(46,125,50,0.14)" : "rgba(109,35,35,0.11)"}`, display: "flex", alignItems: "center", gap: 0.6, flexWrap: "wrap" }}>
          <ReceiptIcon sx={{ fontSize: 11, color: bothDone ? "#2e7d32" : T.accent }} />
          <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, color: bothDone ? "#2e7d32" : T.accent, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.07em", flex: 1 }}>
            Compensatory Time Off | Vacation Leave Deductions
          </Typography>
          {isLoading && <CircularProgress size={10} sx={{ color: T.accent }} />}
          {scBuffer > 0 && (
            <Chip size="small" label={`SC buffer: ${scBuffer.toFixed(3)}d`}
              sx={{ height: 16, fontSize: "0.56rem", fontWeight: 700, bgcolor: "rgba(21,101,192,0.1)", color: "#1565c0", border: "1px solid rgba(21,101,192,0.25)" }}
            />
          )}
          {bothDone && <SBadge label="All done" approved />}
        </Box>
 
        {/* ── SC WARNING BANNER + BUTTONS ────────────────────────────────
            Shown when: scBuffer > 0, absence exists, not yet SC-deducted
        ── */}
        {showScWarningButtons && (
          <Box sx={{ px: 1.5, py: 1.1, bgcolor: "rgba(255,152,0,0.06)", borderBottom: "1px solid rgba(255,152,0,0.2)", display: "flex", alignItems: "flex-start", gap: 0.9 }}>
            <WarnIcon sx={{ fontSize: 14, color: "#e65100", mt: "2px", flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
             
              <Typography sx={{ fontSize: "0.61rem", color: "#e65100", fontFamily: T.poppins, lineHeight: 1.5}}>
              Absences should be deducted from Service Credits first before Compensatory Time Off.
                           </Typography>
            </Box>
          </Box>
        )}
 
        {/* ── Columns ── */}
        <Box sx={{ display: "grid", gridTemplateColumns: columns === 2 ? "1fr 1fr" : "1fr" }}>
 
          {/* ════ ABSENCE COL ════ */}
          {showAbsence && (
            <Box sx={{ borderRight: columns === 2 ? "1px dashed rgba(109,35,35,0.14)" : "none", display: "flex", flexDirection: "column" }}>
              <Box sx={{ px: 1.25, py: 0.45, bgcolor: "rgba(106,27,154,0.05)", borderBottom: "1px solid rgba(106,27,154,0.1)", display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography sx={{ fontSize: "0.55rem", fontWeight: 800, color: "rgba(106,27,154,0.65)", fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.08em", flex: 1 }}>
                  Absence → CTO Offset
                </Typography>
                {(absencePending || absenceApproved) && <SBadge approved={absenceApproved} />}
                {(scPending || scApproved) && <SBadge label={scApproved ? "SC Applied" : "SC Pending"} approved={scApproved} />}
              </Box>
 
              {absenceCoveredBySC && (
                <Box sx={{ mx: 1.25, mt: 0.75, display: "flex", alignItems: "flex-start", gap: 0.75 }}>
                  <CheckIcon sx={{ fontSize: 13, color: "#2e7d32", flexShrink: 0, mt: "1px" }} />
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#1b5e20", fontFamily: T.poppins }}>
                    All {absentDays}d absence(s) covered by SC deduction — no CTO needed.
                  </Typography>
                </Box>
              )}
              {absenceFullyDeducted && !absenceCoveredBySC && (
                <Box sx={{ mx: 1.25, mt: 0.75, display: "flex", alignItems: "flex-start", gap: 0.75 }}>
                  <CheckIcon sx={{ fontSize: 13, color: absenceApproved ? "#2e7d32" : "#e65100", flexShrink: 0, mt: "1px" }} />
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: absenceApproved ? "#1b5e20" : "#7a4a00", fontFamily: T.poppins }}>
                    {absenceApproved ? "Absences fully offset & applied to CTO balance." : "Absence offset submitted — pending approval."}
                  </Typography>
                </Box>
              )}
              
 
              <SectionLabel>Deduct with</SectionLabel>
              <Box sx={{ px: 1.25, py: 0.75 }}>
                <R label="CTO Balance" sub={balLoading ? "Loading…" : "Current balance"} value={balLoading ? "…" : `${ctoBal.toFixed(3)} d`} valueColor={ctoBal > 0 ? "#1e4d20" : T.faint} bold />
                {scBuffer > 0 && (
                  <R label="SC buffer (should deduct first)" sub={`${scBuffer.toFixed(3)}d available`} value={fmtDays3(scBuffer, { allowNegZero: allowScNegZero })} valueColor="#1565c0" faded />
                )}
              </Box>
 
              <SectionLabel>You're about to deduct</SectionLabel>
              <Box sx={{ px: 1.25, py: 0.75 }}>
                <R
                  label="Absences"
                  sub={`${absentDays} day(s) recorded · ${remainingAbsenceCto.toFixed(3)}d to offset`}
                  value={
                    absenceCoveredBySC ? "Covered by SC"
                    : remainingAbsenceCto > 0 ? `− ${remainingAbsenceCto.toFixed(3)} d`
                    : "0.000 d"
                  }
                  valueColor={absenceCoveredBySC ? "#2e7d32" : remainingAbsenceCto > 0 ? "#6a1b9a" : T.faint}
                  faded={remainingAbsenceCto === 0 && !absenceCoveredBySC}
                />
                {alreadyCtoDeducted > 0 && (
                  <R label={`CTO offset (${existingCtoDeductions[0]?.earn_status || "pending"})`} value={`− ${alreadyCtoDeducted.toFixed(3)} d`} valueColor="#2e7d32" faded />
                )}
                {alreadyScDeducted > 0 && (
                  <R label={`SC deducted (${existingScDeductions[0]?.earn_status || "pending"})`} value={`− ${alreadyScDeducted.toFixed(3)} d`} valueColor="#1565c0" faded />
                )}
              </Box>
 
              <Box sx={{ mt: "auto" }}>
                <BalanceFooter
                  bal={absenceFullyDeducted || absenceCoveredBySC ? Number((ctoBal - alreadyCtoDeducted).toFixed(3)) : newCtoBalance}
                  label="New CTO Bal"
                />
              </Box>
            </Box>
          )}
 
          {/* ════ TARDINESS COL ════ */}
          {showTardiness && (
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Box sx={{ px: 1.25, py: 0.45, bgcolor: "rgba(198,40,40,0.05)", borderBottom: "1px solid rgba(198,40,40,0.1)", borderTop: { xs: showAbsence ? "1px solid rgba(0,0,0,0.06)" : "none", md: "none" }, display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography sx={{ fontSize: "0.55rem", fontWeight: 800, color: "rgba(198,40,40,0.65)", fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.08em", flex: 1 }}>
                  Tardiness → VL Deduction
                </Typography>
                {(tardinessPending || tardinessApproved) && <SBadge approved={tardinessApproved} />}
              </Box>
 
              {tardinessFullyDeducted && (
                <Box sx={{ mx: 1.25, mt: 0.75, px: 1, py: 0.6, borderRadius: 1.25, bgcolor: tardinessApproved ? "rgba(46,125,50,0.07)" : "rgba(255,160,0,0.07)", border: `1px solid ${tardinessApproved ? "rgba(46,125,50,0.2)" : "rgba(255,160,0,0.22)"}`, display: "flex", alignItems: "flex-start", gap: 0.75 }}>
                  <CheckIcon sx={{ fontSize: 13, color: tardinessApproved ? "#2e7d32" : "#e65100", flexShrink: 0, mt: "1px" }} />
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: tardinessApproved ? "#1b5e20" : "#7a4a00", fontFamily: T.poppins }}>
                    {tardinessApproved ? "Tardiness fully deducted & applied to VL balance." : "Tardiness deduction submitted — pending approval."}
                  </Typography>
                </Box>
              )}
             
 
              <SectionLabel>Deduct with</SectionLabel>
              <Box sx={{ px: 1.25, py: 0.75 }}>
                <R label="Vacation Leave (VL)" sub={balLoading ? "Loading…" : "Current balance"} value={balLoading ? "…" : `${vlBal.toFixed(3)} d`} valueColor={vlBal > 0 ? "#1e4d20" : T.faint} bold />
                {/* Keep section headers aligned with Absence column when SC buffer row is shown */}
                {scBuffer > 0 && (
                  <Box sx={{ visibility: "hidden" }}>
                    <R
                      label="SC buffer (placeholder)"
                      sub="—"
                      value="—"
                      valueColor={T.faint}
                      faded
                    />
                  </Box>
                )}
              </Box>

              <SectionLabel>You're about to deduct</SectionLabel>
              <Box sx={{ px: 1.25, py: 0.75 }}>
                <R label="Tardiness (ABS)" sub={tardHrs > 0 ? `${tardHrs.toFixed(3)} hrs · ${hrsToHMS(tardHrs)}` : "No tardiness"} value={tardDays > 0 ? `− ${tardDays.toFixed(3)} d` : "0.000 d"} valueColor={tardDays > 0 ? "#c62828" : T.faint} faded={tardDays === 0} />
                {alreadyVlDeducted > 0 && <R label={`Deducted (${existingVlDeductions[0]?.earn_status || "pending"})`} value={`− ${alreadyVlDeducted.toFixed(3)} d`} valueColor="#2e7d32" faded />}
               
              </Box>
 
              <Box sx={{ mt: "auto" }}>
                <BalanceFooter bal={tardinessFullyDeducted ? Number((vlBal - alreadyVlDeducted).toFixed(3)) : newVlBalance} label="New VL Bal" />
              </Box>
            </Box>
          )}
        </Box>
 
        {/* Negative balance note */}
        {(newCtoBalance < 0 || newVlBalance < 0) && (
          <Box sx={{ mx: 1.25, mb: 1, mt: 0.3, px: 1, py: 0.65, borderRadius: 1.25, bgcolor: "rgba(198,40,40,0.06)", border: "1px solid rgba(198,40,40,0.22)" }}>
            <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, lineHeight: 1.55 }}>
              <strong style={{ color: "#c62828" }}>Note:</strong> Negative balance will be directly deducted from salary.
            </Typography>
          </Box>
        )}
 
        {/* ── Normal CTO/VL action area (always visible; policy dropdown shows when SC policy applies) ── */}
        <Box sx={{ px: 1.25, pb: 0.75, pt: 0.75, borderTop: "1px solid rgba(109,35,35,0.08)", bgcolor: "rgba(109,35,35,0.02)" }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, alignItems: "center" }}>
              {tardDays > 0 && !tardinessFullyDeducted && remainingTardVl > 0 && !(tardinessPending || tardinessApproved) && (
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
                  <Checkbox checked={checkedTardiness} onChange={(e) => setCheckedTardiness(e.target.checked)} size="small"
                    sx={{ p: 0, mt: "1px", flexShrink: 0, color: T.accent, "&.Mui-checked": { color: T.accent } }}
                  />
                  <Typography sx={{ fontSize: "0.63rem", color: "#333", fontFamily: T.poppins, lineHeight: 1.55, mt: "3px" }}>
                    Confirm deduct <strong style={{ color: T.accent }}>{remainingTardVl.toFixed(3)}d</strong> tardiness from VL
                  </Typography>
                </Box>
              )}
              {(tardinessPending || tardinessApproved) && tardDays > 0 && !tardinessFullyDeducted && (
                <Box/>
                 
    
              )}
              {/* CTO checkbox OR Policy dropdown — mutually exclusive */}
              {absentDays > 0 && !absenceCoveredBySC && !absenceFullyDeducted && remainingAbsenceCto > 0 && !showScWarningButtons && !(absencePending || absenceApproved || scPending || scApproved) && (
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
                  <Checkbox checked={checkedAbsence} onChange={(e) => setCheckedAbsence(e.target.checked)} size="small"
                    sx={{ p: 0, mt: "1px", flexShrink: 0, color: T.accent, "&.Mui-checked": { color: T.accent } }}
                  />
                  <Typography sx={{ fontSize: "0.63rem", color: "#333", fontFamily: T.poppins, lineHeight: 1.55, mt: "3px" }}>
                    Confirm offset <strong style={{ color: T.accent }}>{remainingAbsenceCto.toFixed(3)}d</strong> absence from CTO
                  </Typography>
                </Box>
              )}
              {(absencePending || absenceApproved || scPending || scApproved) && absentDays > 0 && !absenceCoveredBySC && !absenceFullyDeducted && remainingAbsenceCto > 0 && !showScWarningButtons && (
                <Box sx={{ px: 1, py: 0.6, borderRadius: 1.25, bgcolor: "rgba(109,35,35,0.05)", border: "1px solid rgba(109,35,35,0.14)" }}>
                  <Typography sx={{ fontSize: "0.63rem", fontWeight: 700, color: T.accentDark, fontFamily: T.poppins }}>
                    Absence deduction is already {absenceApproved || scApproved ? "approved" : "pending"}.
                  </Typography>
                </Box>
              )}
              {/* Policy selection dropdown replaces CTO checkbox when SC buffer exists */}
              {showScWarningButtons && absentDays > 0 && !absenceCoveredBySC && !absenceFullyDeducted && remainingAbsenceCto > 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <Tooltip
                    title={
                      policySelection === "cto"
                        ? "Deduct from Compensatory Time Off (CTO)"
                        : "Deduct from Service Credit (SC)"
                    }
                    arrow
                    placement="top"
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<ArrowDownIcon sx={{ fontSize: "14px !important" }} />}
                      onClick={(e) => setPolicyMenuAnchor(e.currentTarget)}
                      disabled={deducting || isLoading || scPending || scApproved || absencePending || absenceApproved}
                      sx={{
                        height: 30,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "none",
                        fontFamily: T.poppins,
                        borderRadius: 2,
                        color: T.accent,
                        borderColor: T.accentBorder,
                        bgcolor: "#fff",
                        justifyContent: "space-between",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                        maxWidth: { xs: "100%", sm: 270 },
                        flex: "1 1 220px",
                        px: 1.25,
                        boxShadow: "none",
                        "& .MuiButton-endIcon": { ml: 0.75, flexShrink: 0 },
                        "&:hover": { bgcolor: "rgba(109,35,35,0.04)", borderColor: T.accent },
                        "&:active": { bgcolor: "rgba(109,35,35,0.06)" },
                        "&.Mui-disabled": { opacity: 0.4 },
                      }}
                    >
                      {policySelection === "cto"
                        ? "Deduct from CTO"
                        : "Deduct from Service Credits"}
                    </Button>
                  </Tooltip>
                  <Menu
                    anchorEl={policyMenuAnchor}
                    open={Boolean(policyMenuAnchor)}
                    onClose={() => setPolicyMenuAnchor(null)}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 0.75,
                          borderRadius: 2,
                          border: `1px solid ${T.accentBorder}`,
                          boxShadow:
                            "0 10px 28px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
                          overflow: "hidden",
                        },
                      },
                    }}
                  >
                    <MenuItem
                      selected={policySelection === "sc"}
                      onClick={() => {
                        setPolicySelection("sc");
                        setPolicyMenuAnchor(null);
                      }}
                      sx={{
                        fontSize: "0.78rem",
                        fontFamily: T.poppins,
                        py: 1,
                        "&.Mui-selected": { bgcolor: "rgba(109,35,35,0.06)" },
                        "&.Mui-selected:hover": { bgcolor: "rgba(109,35,35,0.09)" },
                      }}
                    >
                      <SCIcon sx={{ fontSize: "14px", mr: 0.8, color: "#2e7d32" }} />
                      Service Credit (SC) — Deduct first (Recommended)
                    </MenuItem>
                    <MenuItem
                      selected={policySelection === "cto"}
                      onClick={() => {
                        setPolicySelection("cto");
                        setPolicyMenuAnchor(null);
                      }}
                      sx={{
                        fontSize: "0.78rem",
                        fontFamily: T.poppins,
                        py: 1,
                        "&.Mui-selected": { bgcolor: "rgba(109,35,35,0.06)" },
                        "&.Mui-selected:hover": { bgcolor: "rgba(109,35,35,0.09)" },
                      }}
                    >
                      <CTOIcon sx={{ fontSize: "14px", mr: 0.8, color: "#6a1b9a" }} />
                      Compensatory Time Off (CTO) — Override
                    </MenuItem>
                  </Menu>
                </Box>
              )}
            </Box>
 
            {deductError && <Alert severity="error" sx={{ mb: 0.5, py: 0, fontSize: "0.65rem", borderRadius: 1 }}>{deductError}</Alert>}
            {deductSuccess && <Alert severity="success" sx={{ mb: 0.5, py: 0, fontSize: "0.65rem", borderRadius: 1 }}>{deductSuccess}</Alert>}

            {bothDone && !deductSuccess && (
              <Box sx={{ px: 1, py: 0.6, borderRadius: 1.25, bgcolor: "rgba(46,125,50,0.07)", border: "1px solid rgba(46,125,50,0.2)" }}>
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#1b5e20", fontFamily: T.poppins }}>All deductions applied for this period.</Typography>
              </Box>
            )}

            {(() => {
              const canDeductNormal =
                (checkedAbsence && remainingAbsenceCto > 0) ||
                (checkedTardiness && remainingTardVl > 0);
              const lockedAbsence = absencePending || absenceApproved || scPending || scApproved;
              const lockedTardiness = tardinessPending || tardinessApproved;
              const canApply =
                !bothDone &&
                (
                  ((canDeductNormal && !lockedAbsence && !lockedTardiness) ||
                    (checkedAbsence && remainingAbsenceCto > 0 && !lockedAbsence) ||
                    (checkedTardiness && remainingTardVl > 0 && !lockedTardiness)) ||
                  (showScWarningButtons && (policySelection === "sc" || policySelection === "cto") && !lockedAbsence)
                );
              return (
                canApply && (
                  <Button fullWidth variant="contained" size="small"
                    onClick={() => {
                      if (showScWarningButtons && (policySelection === "sc" || policySelection === "cto")) openConfirm(policySelection);
                      else openConfirm("normal");
                    }}
                    startIcon={<DeductIcon sx={{ fontSize: "13px !important" }} />}
                    sx={{ height: 30, mt: 0.3, fontSize: "0.68rem", fontWeight: 700, textTransform: "none", fontFamily: T.poppins, borderRadius: 1.5, bgcolor: T.accent, color: "#fff", boxShadow: "none", "&:hover": { bgcolor: T.accentDark } }}
                  >
                    Apply Deductions
                  </Button>
                )
              );
            })()}
          </Box>
 
        {/* Success message when SC warning buttons are shown */}
        {showScWarningButtons && deductSuccess && (
          <Box sx={{ px: 1.25, py: 0.75, borderTop: "1px solid rgba(109,35,35,0.08)" }}>
            <Alert severity="success" sx={{ py: 0, fontSize: "0.65rem", borderRadius: 1 }}>{deductSuccess}</Alert>
          </Box>
        )}
      </Box>
 
      {/* ══════════════════════════════════════════════════════════════
          CONFIRMATION MODAL — styled, color-coded per source
      ══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={confirmOpen}
        onClose={() => !deducting && closeConfirm()}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.2)" },
        }}
      >
        {/* Colored header */}
        <Box sx={{
          px: 2.5, py: 2,
          background: T.headerGrad,
          display: "flex", alignItems: "center", gap: 1.5,
        }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {deductSource === "sc"
              ? <SCIcon sx={{ fontSize: 18, color: "#fff" }} />
              : deductSource === "cto"
                ? <CTOIcon sx={{ fontSize: 18, color: "#fff" }} />
                : <DeductIcon sx={{ fontSize: 18, color: "#fff" }} />
            }
          </Box>
          <Box>
            <Typography sx={{ fontFamily: T.poppins, fontWeight: 800, fontSize: "0.95rem", color: "#fff", lineHeight: 1.25 }}>
              {deductSource === "sc" && "Confirm SC Deduction"}
              {deductSource === "cto" && "Confirm CTO Override"}
              {deductSource === "normal" && "Confirm Deductions"}
            </Typography>
            <Typography sx={{ fontFamily: T.poppins, fontSize: "0.62rem", color: "rgba(255,255,255,0.7)", mt: 0.2 }}>
              {monthName(month)} {year} · {employee?.fullName || employee?.employeeNumber || "Employee"}
            </Typography>
          </Box>
        </Box>
 
        <DialogContent sx={{ px: 2.5, pt: 2, pb: 0 }}>
 
          {/* CTO override warning */}
          {deductSource === "cto" && (
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.8, mb: 1.75, px: 1.25, py: 1, borderRadius: 2, bgcolor: "rgba(255,152,0,0.08)", border: "1px solid rgba(255,152,0,0.3)" }}>
              <WarnIcon sx={{ fontSize: 15, color: "#e65100", flexShrink: 0, mt: "1px" }} />
              <Typography sx={{ fontSize: "0.7rem", color: "#bf360c", fontFamily: T.poppins, fontWeight: 600, lineHeight: 1.6 }}>
                <strong>Policy override:</strong> SC balance of <strong>{scBuffer.toFixed(3)}d</strong> has not been depleted. Proceeding will deduct from CTO instead.
              </Typography>
            </Box>
          )}
 
          {/* SC policy note */}
          {deductSource === "sc" && (
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.8, mb: 1.75, px: 1.25, py: 1, borderRadius: 2, bgcolor: "rgba(109,35,35,0.06)", border: "1px solid rgba(109,35,35,0.18)" }}>
              <PolicyIcon sx={{ fontSize: 15, color: T.accent, flexShrink: 0, mt: "1px" }} />
              <Typography sx={{ fontSize: "0.7rem", color: T.accentDark, fontFamily: T.poppins, fontWeight: 600, lineHeight: 1.6 }}>
                Following SC-first policy. This will deduct from your SC balance before using CTO.
              </Typography>
            </Box>
          )}
 
          {/* ── Breakdown card ── */}
          <Box sx={{ borderRadius: 2, border: "1px solid rgba(0,0,0,0.1)", overflow: "hidden", mb: 1.75 }}>
 
            {/* Source row */}
            <Box sx={{ px: 1.75, py: 0.55, bgcolor: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
              <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, color: "#999", fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Deducting from
              </Typography>
            </Box>
            <Box sx={{ px: 1.75, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(0,0,0,0.08)" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
                {deductSource === "sc"
                  ? <SCIcon sx={{ fontSize: 15, color: T.accent }} />
                  : <CTOIcon sx={{ fontSize: 15, color: T.accent }} />
                }
                <Typography sx={{ fontSize: "0.76rem", fontWeight: 600, color: "#1a1a1a", fontFamily: T.poppins }}>
                  {deductSource === "sc" ? "Service Credit (SC)" : deductSource === "cto" ? "Compensatory Time Off (CTO)" : "CTO / VL"}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={`${deductSource === "sc" ? scBuffer.toFixed(3) : ctoBal.toFixed(3)} d available`}
                sx={{
                  height: 20, fontSize: "0.63rem", fontWeight: 700,
                  bgcolor: "rgba(109,35,35,0.06)",
                  color: T.accent,
                  border: `1px solid ${T.accentBorder}`,
                }}
              />
            </Box>
 
            {/* Breakdown */}
            <Box sx={{ px: 1.75, py: 0.55, bgcolor: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
              <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, color: "#999", fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Breakdown
              </Typography>
            </Box>
            <Box sx={{ px: 1.75, py: 1 }}>
              {(deductSource === "sc" || deductSource === "cto") && (
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.74rem", fontWeight: 600, color: T.accent, fontFamily: T.poppins }}>Absences</Typography>
                    <Typography sx={{ fontSize: "0.61rem", color: T.faint, fontFamily: T.poppins }}>{absentDays} day(s) × 8h</Typography>
                  </Box>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>
                    − {absenceAmountForSource.toFixed(3)} d
                  </Typography>
                </Box>
              )}
              {deductSource === "normal" && (
                <>
                  {checkedAbsence && remainingAbsenceCto > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.6 }}>
                      <Box>
                        <Typography sx={{ fontSize: "0.74rem", fontWeight: 600, color: "#6a1b9a", fontFamily: T.poppins }}>Absence → CTO</Typography>
                        <Typography sx={{ fontSize: "0.61rem", color: T.faint, fontFamily: T.poppins }}>{absentDays} day(s)</Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#6a1b9a", fontFamily: T.poppins }}>− {remainingAbsenceCto.toFixed(3)} d</Typography>
                    </Box>
                  )}
                  {checkedTardiness && remainingTardVl > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Box>
                        <Typography sx={{ fontSize: "0.74rem", fontWeight: 600, color: "#c62828", fontFamily: T.poppins }}>Tardiness → VL</Typography>
                        <Typography sx={{ fontSize: "0.61rem", color: T.faint, fontFamily: T.poppins }}>{tardHrs.toFixed(3)} hrs · {hrsToHMS(tardHrs)}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#c62828", fontFamily: T.poppins }}>− {remainingTardVl.toFixed(3)} d</Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
 
            {/* New balance preview */}
            {(deductSource === "sc" || deductSource === "cto") && (() => {
              const newBalRaw = deductSource === "sc" ? newScBalance : newCtoBalanceOverride;
              const newBal = (deductSource === "sc" && !allowScNegZero && Object.is(newBalRaw, -0)) ? 0 : newBalRaw;
              const balColor = newBal < 0 ? "#c62828" : newBal === 0 ? "#7a4a00" : "#1e4d20";
              const bgColor = newBal < 0 ? "rgba(198,40,40,0.06)" : newBal === 0 ? "rgba(122,74,0,0.05)" : "rgba(46,125,50,0.06)";
              return (
                <Box sx={{ px: 1.75, py: 1, bgcolor: bgColor, borderTop: "1.5px solid rgba(0,0,0,0.09)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#1a1a1a", fontFamily: T.poppins }}>
                      New {deductSource === "sc" ? "SC" : "CTO"} Balance
                    </Typography>
                    {newBal < 0 && <Typography sx={{ fontSize: "0.6rem", color: "#c62828", fontFamily: T.poppins, fontWeight: 600, mt: 0.15 }}>Shortfall → salary deduction</Typography>}
                  </Box>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, color: balColor, fontFamily: T.poppins }}>
                    {newBal.toFixed(3)} d
                  </Typography>
                </Box>
              );
            })()}
            {deductSource === "normal" && checkedAbsence && remainingAbsenceCto > 0 && (() => {
              const balColor = newCtoBalance < 0 ? "#c62828" : newCtoBalance === 0 ? "#7a4a00" : "#1e4d20";
              return (
                <Box sx={{ px: 1.75, py: 1, bgcolor: newCtoBalance < 0 ? "rgba(198,40,40,0.06)" : "rgba(46,125,50,0.06)", borderTop: "1.5px solid rgba(0,0,0,0.09)", display: "flex", justifyContent: "space-between" }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#1a1a1a", fontFamily: T.poppins }}>New CTO Balance</Typography>
                    {newCtoBalance < 0 && <Typography sx={{ fontSize: "0.6rem", color: "#c62828", fontFamily: T.poppins, fontWeight: 600 }}>Shortfall → salary deduction</Typography>}
                  </Box>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, color: balColor, fontFamily: T.poppins }}>{newCtoBalance.toFixed(3)} d</Typography>
                </Box>
              );
            })()}
          </Box>
 
          {/* Auto-approved note */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, px: 1.25, py: 1, borderRadius: 1.75, bgcolor: "rgba(46,125,50,0.07)", border: "1px solid rgba(46,125,50,0.2)", mb: 2 }}>
            <CheckIcon sx={{ fontSize: 14, color: T.accent, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.68rem", color: T.accentDark, fontFamily: T.poppins, fontWeight: 600 }}>
              Auto-approved — balance updates immediately upon confirmation.
            </Typography>
          </Box>
 
          {deductError && (
            <Alert severity="error" sx={{ mb: 1.5, py: 0.25, fontSize: "0.68rem", borderRadius: 1.5 }}>{deductError}</Alert>
          )}
        </DialogContent>
 
        <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0.5, gap: 1 }}>
          <Button
            onClick={closeConfirm}
            disabled={deducting}
            sx={{
              textTransform: "none", color: T.muted, fontFamily: T.poppins,
              fontWeight: 600, fontSize: "0.82rem", borderRadius: 1.5, px: 2,
              "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeduct}
            disabled={deducting}
            startIcon={deducting ? <CircularProgress size={13} sx={{ color: "#fff" }} /> : null}
            sx={{
              textTransform: "none", fontFamily: T.poppins, fontWeight: 700,
              fontSize: "0.82rem", borderRadius: 1.5, px: 2.5, boxShadow: "none",
              background: T.headerGrad,
              color: "#fff",
              "&:hover": {
                background: "linear-gradient(135deg, #5a1d1d 0%, #7a2525 100%)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              },
              "&.Mui-disabled": { bgcolor: "#c0c0c0 !important", background: "#c0c0c0 !important", color: "#888 !important" },
            }}
          >
            {deducting
              ? "Processing…"
              : deductSource === "sc" ? "Confirm SC Deduction"
              : deductSource === "cto" ? "Confirm CTO Override"
              : "Confirm Deductions"
            }
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ─── Smart Deduction Receipt Switcher ────────────────────────────────────────
const DeductionReceiptSwitcher = ({
  employee,
  attendanceData,
  year,
  month,
  onDeductSuccess,
  refreshKey,
  empCat,
}) => {
  if (!employee || !attendanceData?.summary) return null;

  if (false) {
  const SCDeductionReceipt = ({
    employee,
    attendanceData,
    year,
    month,
    onDeductSuccess,
    refreshKey,
  }) => {
    const [checked, setChecked] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deducting, setDeducting] = useState(false);
    const [deductError, setDeductError] = useState("");
    const [deductSuccess, setDeductSuccess] = useState("");
    const [scBalance, setScBalance] = useState(null);
    const [balLoading, setBalLoading] = useState(false);
    const [existingDeductions, setExistingDeductions] = useState([]);
    const [deductionsLoading, setDeductionsLoading] = useState(false);

    const fetchBalance = useCallback(async () => {
      if (!employee) {
        setScBalance(null);
        return;
      }
      setBalLoading(true);
      const token = localStorage.getItem("token");
      try {
        const r = await axios.get(
          `${API_BASE_URL}/api/earnings/sc/${employee.employeeNumber}/balance`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setScBalance(toNum(r.data?.totalRemaining) / 8);
      } catch {
        setScBalance(0);
      } finally {
        setBalLoading(false);
      }
    }, [employee]);
    const fetchExistingDeductions = useCallback(async () => {
      if (!employee) {
        setExistingDeductions([]);
        return;
      }
      setDeductionsLoading(true);
      const token = localStorage.getItem("token");
      try {
        const r = await axios.get(
          `${API_BASE_URL}/api/earnings/sc/${employee.employeeNumber}?year=${year}&month=${month}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const all = r.data?.earnings || [];
        setExistingDeductions(
          all.filter(
            (e) => e.entry_type === "DEDUCTION" && e.earn_status !== "rejected",
          ),
        );
      } catch {
        setExistingDeductions([]);
      } finally {
        setDeductionsLoading(false);
      }
    }, [employee, year, month]);

    useEffect(() => {
      fetchBalance();
      fetchExistingDeductions();
    }, [fetchBalance, fetchExistingDeductions, refreshKey]);

    const tardHrs = attendanceData?.summary
      ? parseHHMM(attendanceData.summary.overallRenderedOfficialTimeTardiness)
      : 0;
    const absentDays = toNum(attendanceData?.stats?.absent_days);

    // Total to deduct: absences (in days) + tardiness (converted to days)
    const tardDays = tardHrs / 8;
    const totalDeductDays = Number((absentDays + tardDays).toFixed(3));

    const alreadyDeductedDays = existingDeductions.reduce(
      (sum, e) => sum + Math.abs(toNum(e.earned_hours)) / 8,
      0,
    );
    const alreadyDeductedDec = Number(alreadyDeductedDays.toFixed(3));
    const remainingToDeductDec = Number(
      Math.max(0, totalDeductDays - alreadyDeductedDec).toFixed(3),
    );

    const scBal = scBalance !== null ? scBalance : 0;
    const newBalance = Number((scBal - remainingToDeductDec).toFixed(3));
    const isNegative = newBalance < 0;
    const hasFullyDeducted =
      totalDeductDays > 0 && alreadyDeductedDec >= totalDeductDays;
    const hasPendingDeduction = existingDeductions.some(
      (e) => e.earn_status === "pending",
    );
    const hasApprovedDeduction = existingDeductions.some(
      (e) => e.earn_status === "approved",
    );

    const handleDeduct = async () => {
      if (!employee || remainingToDeductDec <= 0) return;
      setDeducting(true);
      setDeductError("");
      const token = localStorage.getItem("token");
      try {
        await axios.post(
          `${API_BASE_URL}/api/earnings/sc`,
          {
            employeeNumber: employee.employeeNumber,
            sc_type: "non_commutative",
            earned_hours: -(remainingToDeductDec * 8),
            total_ot_hours: 0,
            period_year: parseInt(year, 10),
            period_month: parseInt(month, 10),
            entry_type: "DEDUCTION",
            remarks: `Auto-deduction: ${absentDays > 0 ? `${absentDays}d absent` : ""}${absentDays > 0 && tardDays > 0 ? " + " : ""}${tardDays > 0 ? `${tardDays.toFixed(3)}d tardiness` : ""} = ${remainingToDeductDec.toFixed(3)}d for ${monthName(month)} ${year}`,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setDeductSuccess(
          `Deducted ${remainingToDeductDec.toFixed(3)}d from SC. New balance ≈ ${Math.max(0, scBal - remainingToDeductDec).toFixed(3)}d.`,
        );
        setConfirmOpen(false);
        setChecked(false);
        await Promise.all([fetchBalance(), fetchExistingDeductions()]);
        if (onDeductSuccess) onDeductSuccess();
        setTimeout(() => setDeductSuccess(""), 5000);
      } catch (err) {
        setDeductError(
          "Deduction failed: " + (err.response?.data?.error || err.message),
        );
      } finally {
        setDeducting(false);
      }
    };

    if (!attendanceData?.summary) return null;
    if (totalDeductDays <= 0 && !hasFullyDeducted) return null;

    const isLoading = balLoading || deductionsLoading;

    const RRow = ({ label, sublabel, value, valueColor, bold, dimmed }) => (
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 0.4,
          opacity: dimmed ? 0.55 : 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "0.67rem",
              fontWeight: bold ? 700 : 500,
              color: dimmed ? T.faint : "#2a2a2a",
              fontFamily: T.poppins,
              lineHeight: 1.4,
            }}
          >
            {label}
          </Typography>
          {sublabel && (
            <Typography
              sx={{
                fontSize: "0.56rem",
                color: T.faint,
                fontFamily: T.poppins,
                lineHeight: 1.3,
                mt: 0.1,
              }}
            >
              {sublabel}
            </Typography>
          )}
        </Box>
        {value !== undefined && (
          <Typography
            sx={{
              fontSize: bold ? "0.82rem" : "0.72rem",
              fontWeight: bold ? 900 : 600,
              color: valueColor || "#1a1a1a",
              fontFamily: T.poppins,
              ml: 1,
              flexShrink: 0,
            }}
          >
            {value}
          </Typography>
        )}
      </Box>
    );

    return (
      <>
        <Box
          sx={{
            mt: 1,
            borderRadius: 1.5,
            border: `1px solid ${hasFullyDeducted ? "rgba(46,125,50,0.25)" : "rgba(109,35,35,0.18)"}`,
            bgcolor: hasFullyDeducted
              ? "rgba(46,125,50,0.025)"
              : "rgba(109,35,35,0.025)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 1.25,
              py: 0.65,
              bgcolor: hasFullyDeducted
                ? "rgba(46,125,50,0.09)"
                : "rgba(109,35,35,0.07)",
              borderBottom: `1px solid ${hasFullyDeducted ? "rgba(46,125,50,0.16)" : "rgba(109,35,35,0.13)"}`,
              display: "flex",
              alignItems: "center",
              gap: 0.6,
            }}
          >
            <ReceiptIcon
              sx={{
                fontSize: 11,
                color: hasFullyDeducted ? "#2e7d32" : T.accent,
              }}
            />
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 800,
                color: hasFullyDeducted ? "#2e7d32" : T.accent,
                fontFamily: T.poppins,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                flex: 1,
              }}
            >
              SC Deduction (Absences + Tardiness)
            </Typography>
            {isLoading && (
              <CircularProgress size={10} sx={{ color: T.accent }} />
            )}
            {hasFullyDeducted && (
              <Chip
                size="small"
                icon={<CheckIcon style={{ fontSize: 9 }} />}
                label={hasApprovedDeduction ? "Applied" : "Pending"}
                sx={{
                  height: 16,
                  fontSize: "0.56rem",
                  fontWeight: 700,
                  bgcolor: hasApprovedDeduction
                    ? "rgba(46,125,50,0.14)"
                    : "rgba(255,160,0,0.14)",
                  color: hasApprovedDeduction ? "#1b5e20" : "#7a4a00",
                  border: `1px solid ${hasApprovedDeduction ? "rgba(46,125,50,0.28)" : "rgba(255,160,0,0.28)"}`,
                }}
              />
            )}
          </Box>

          <Box sx={{ px: 1.5, pt: 1, pb: 1.25 }}>
            {hasFullyDeducted && (
              <Box
                sx={{
                  mb: 1,
                  px: 1,
                  py: 0.75,
                  borderRadius: 1.25,
                  bgcolor: hasApprovedDeduction
                    ? "rgba(46,125,50,0.07)"
                    : "rgba(255,160,0,0.07)",
                  border: `1px solid ${hasApprovedDeduction ? "rgba(46,125,50,0.2)" : "rgba(255,160,0,0.22)"}`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 0.75,
                }}
              >
                {hasApprovedDeduction ? (
                  <CheckIcon
                    sx={{ fontSize: 13, color: "#2e7d32", flexShrink: 0 }}
                  />
                ) : (
                  <PendingIcon
                    sx={{ fontSize: 13, color: "#e65100", flexShrink: 0 }}
                  />
                )}
                <Typography
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: hasApprovedDeduction ? "#1b5e20" : "#7a4a00",
                    fontFamily: T.poppins,
                  }}
                >
                  {hasApprovedDeduction
                    ? "Fully deducted & applied to SC balance."
                    : "Deduction submitted — pending approval."}
                </Typography>
              </Box>
            )}

            {!hasFullyDeducted && alreadyDeductedDec > 0 && (
              <Box
                sx={{
                  mb: 0.75,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1.25,
                  bgcolor: "rgba(255,160,0,0.07)",
                  border: "1px solid rgba(255,160,0,0.22)",
                }}
              >
               
              </Box>
            )}

            {/* Inner receipt */}
            <Box
              sx={{
                borderRadius: 1.25,
                border: "1px solid rgba(109,35,35,0.13)",
                bgcolor: "#fff",
                overflow: "hidden",
              }}
            >
              {/* SC Balance */}
              <Box
                sx={{
                  px: 1.25,
                  py: 0.45,
                  bgcolor: "rgba(109,35,35,0.04)",
                  borderBottom: "1px solid rgba(109,35,35,0.1)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.55rem",
                    fontWeight: 800,
                    color: alpha(T.accent, 0.5),
                    fontFamily: T.poppins,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Deduct with
                </Typography>
              </Box>
              <Box sx={{ px: 1.25, py: 0.75 }}>
                <RRow
                  label="Service Credit (SC)"
                  sublabel={balLoading ? "Loading…" : "Current balance"}
                  value={balLoading ? "…" : `${scBal.toFixed(3)} d`}
                  valueColor={scBal > 0 ? "#1e4d20" : T.faint}
                  bold
                />
              </Box>

              <Box
                sx={{ mx: 1.25, borderTop: "1px dashed rgba(109,35,35,0.15)" }}
              />

              {/* Breakdown */}
              <Box
                sx={{
                  px: 1.25,
                  py: 0.45,
                  bgcolor: "rgba(109,35,35,0.04)",
                  borderTop: "1px solid rgba(109,35,35,0.1)",
                  borderBottom: "1px solid rgba(109,35,35,0.1)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.55rem",
                    fontWeight: 800,
                    color: alpha(T.accent, 0.5),
                    fontFamily: T.poppins,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  You're about to deduct
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.75,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.1,
                }}
              >
                <RRow
                  label="Absences"
                  sublabel={`${absentDays} day(s) × 8h`}
                  value={
                    absentDays > 0 ? `− ${absentDays.toFixed(3)} d` : "0.000 d"
                  }
                  valueColor={absentDays > 0 ? "#6a1b9a" : T.faint}
                  dimmed={absentDays === 0}
                />
                <RRow
                  label="Tardiness / Undertime"
                  sublabel={
                    tardHrs > 0
                      ? `${tardHrs.toFixed(3)} hrs · ${hrsToHMS(tardHrs)}`
                      : "No tardiness"
                  }
                  value={
                    tardDays > 0 ? `− ${tardDays.toFixed(3)} d` : "0.000 d"
                  }
                  valueColor={tardDays > 0 ? "#c62828" : T.faint}
                  dimmed={tardDays === 0}
                />
                {alreadyDeductedDec > 0 && (
                  <RRow
                    label={`Already deducted (${existingDeductions[0]?.earn_status || "pending"})`}
                    value={`− ${alreadyDeductedDec.toFixed(3)} d`}
                    valueColor="#2e7d32"
                    dimmed
                  />
                )}
                {alreadyDeductedDec > 0 && remainingToDeductDec > 0 && (
                  <RRow
                    label="Remaining to deduct now"
                    value={`− ${remainingToDeductDec.toFixed(3)} d`}
                    valueColor="#c62828"
                  />
                )}
              </Box>

              {/* New balance */}
              <Box
                sx={{
                  px: 1.25,
                  py: 0.85,
                  borderTop: "1.5px solid rgba(109,35,35,0.14)",
                  bgcolor: isNegative
                    ? "rgba(198,40,40,0.05)"
                    : newBalance === 0
                      ? "rgba(122,74,0,0.05)"
                      : "rgba(30,77,32,0.05)",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.67rem",
                      fontWeight: 800,
                      color: "#1a1a1a",
                      fontFamily: T.poppins,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Total (New Balance)
                  </Typography>
                  {isNegative && (
                    <Typography
                      sx={{
                        fontSize: "0.57rem",
                        color: "#c62828",
                        fontFamily: T.poppins,
                        fontWeight: 600,
                        mt: 0.2,
                      }}
                    >
                      Negative — excess deducted from salary
                    </Typography>
                  )}
                </Box>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    fontWeight: 900,
                    fontFamily: T.poppins,
                    ml: 1,
                    flexShrink: 0,
                    color: hasFullyDeducted
                      ? scBal - alreadyDeductedDec < 0
                        ? "#c62828"
                        : "#1e4d20"
                      : isNegative
                        ? "#c62828"
                        : newBalance === 0
                          ? "#7a4a00"
                          : "#1e4d20",
                  }}
                >
                  {hasFullyDeducted
                    ? `${Number((scBal - alreadyDeductedDec).toFixed(3)).toFixed(3)} d`
                    : `${newBalance.toFixed(3)} d`}
                </Typography>
              </Box>
            </Box>

            {/* Action area */}
            {!hasFullyDeducted && totalDeductDays > 0 && (
              <Box sx={{ mt: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 0.5,
                    mb: 0.6,
                  }}
                >
                  <Checkbox
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    disabled={remainingToDeductDec <= 0}
                    size="small"
                    sx={{
                      p: 0,
                      mt: "1px",
                      flexShrink: 0,
                      color: T.accent,
                      "&.Mui-checked": { color: T.accent },
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.63rem",
                      color: remainingToDeductDec > 0 ? "#333" : T.faint,
                      fontFamily: T.poppins,
                      lineHeight: 1.55,
                      mt: "3px",
                    }}
                  >
                    Confirm deduction of{" "}
                    <strong style={{ color: T.accent }}>
                      {remainingToDeductDec.toFixed(3)}d
                    </strong>{" "}
                    from SC balance
                  </Typography>
                </Box>
                {deductError && (
                  <Alert
                    severity="error"
                    sx={{
                      mb: 0.5,
                      py: 0,
                      fontSize: "0.65rem",
                      borderRadius: 1,
                    }}
                  >
                    {deductError}
                  </Alert>
                )}
                {deductSuccess && (
                  <Alert
                    severity="success"
                    sx={{
                      mb: 0.5,
                      py: 0,
                      fontSize: "0.65rem",
                      borderRadius: 1,
                    }}
                  >
                    {deductSuccess}
                  </Alert>
                )}
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  disabled={!checked || remainingToDeductDec <= 0 || isLoading}
                  onClick={() => setConfirmOpen(true)}
                  startIcon={
                    <DeductIcon sx={{ fontSize: "13px !important" }} />
                  }
                  sx={{
                    height: 30,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    textTransform: "none",
                    fontFamily: T.poppins,
                    borderRadius: 1.5,
                    bgcolor:
                      checked && remainingToDeductDec > 0
                        ? T.accent
                        : "#c0c0c0",
                    color: "#fff",
                    "&:hover": {
                      bgcolor:
                        checked && remainingToDeductDec > 0
                          ? T.accentDark
                          : "#c0c0c0",
                    },
                    "&:disabled": {
                      bgcolor: "#c0c0c0 !important",
                      color: "#888 !important",
                    },
                  }}
                >
                  Deduct to SC
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {/* Confirm Dialog */}
        <Dialog
          open={confirmOpen}
          onClose={() => !deducting && setConfirmOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle
            sx={{
              fontFamily: T.poppins,
              fontWeight: 700,
              fontSize: "0.95rem",
              color: T.accent,
              pb: 0.5,
            }}
          >
            Confirm SC Deduction
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 0.5 }}>
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  color: "#333",
                  fontFamily: T.poppins,
                  mb: 1,
                }}
              >
                Deduct absences + tardiness from SC for{" "}
                <strong>
                  {monthName(month)} {year}
                </strong>
                . This will be <strong>immediately applied</strong> to the
                balance.
              </Typography>

              <Box
                sx={{
                  borderRadius: 2,
                  border: "1px solid rgba(109,35,35,0.2)",
                  bgcolor: "rgba(109,35,35,0.025)",
                  overflow: "hidden",
                  mb: 1,
                }}
              >
                {/* Deduct with */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.45,
                    bgcolor: "rgba(109,35,35,0.06)",
                    borderBottom: "1px solid rgba(109,35,35,0.12)",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      color: alpha(T.accent, 0.6),
                      fontFamily: T.poppins,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    Deduct with
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      color: T.muted,
                      fontFamily: T.poppins,
                    }}
                  >
                    Service Credit (SC)
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#1e4d20",
                      fontFamily: T.poppins,
                    }}
                  >
                    {scBal.toFixed(3)} d
                  </Typography>
                </Box>

                <Box
                  sx={{ mx: 1.5, borderTop: "1px dashed rgba(109,35,35,0.15)" }}
                />

                {/* You're about to deduct */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.45,
                    bgcolor: "rgba(109,35,35,0.06)",
                    borderTop: "1px solid rgba(109,35,35,0.12)",
                    borderBottom: "1px solid rgba(109,35,35,0.12)",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      color: alpha(T.accent, 0.6),
                      fontFamily: T.poppins,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    You're about to deduct
                  </Typography>
                </Box>
                <Box sx={{ px: 1.5, py: 0.75 }}>
                  {absentDays > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.3,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontSize: "0.72rem",
                            color: "#6a1b9a",
                            fontFamily: T.poppins,
                          }}
                        >
                          Absences
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.6rem",
                            color: T.faint,
                            fontFamily: T.poppins,
                          }}
                        >
                          {absentDays} day(s) × 8h
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#6a1b9a",
                          fontFamily: T.poppins,
                        }}
                      >
                        − {absentDays.toFixed(3)} d
                      </Typography>
                    </Box>
                  )}
                  {tardDays > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.3,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontSize: "0.72rem",
                            color: "#c62828",
                            fontFamily: T.poppins,
                          }}
                        >
                          Tardiness / Undertime
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.6rem",
                            color: T.faint,
                            fontFamily: T.poppins,
                          }}
                        >
                          {(remainingToDeductDec * 8).toFixed(3)}h ·{" "}
                          {hrsToHMS(remainingToDeductDec * 8)}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#c62828",
                          fontFamily: T.poppins,
                        }}
                      >
                        − {tardDays.toFixed(3)} d
                      </Typography>
                    </Box>
                  )}
                  {alreadyDeductedDec > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.3,
                        opacity: 0.6,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          color: "#2e7d32",
                          fontFamily: T.poppins,
                        }}
                      >
                        Already deducted
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#2e7d32",
                          fontFamily: T.poppins,
                        }}
                      >
                        − {alreadyDeductedDec.toFixed(3)} d
                      </Typography>
                    </Box>
                  )}
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        color: "#c62828",
                        fontFamily: T.poppins,
                        fontWeight: 700,
                      }}
                    >
                      Deducting now
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#c62828",
                        fontFamily: T.poppins,
                      }}
                    >
                      − {remainingToDeductDec.toFixed(3)} d
                    </Typography>
                  </Box>
                </Box>

                {/* New balance */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.85,
                    bgcolor:
                      newBalance < 0
                        ? "rgba(198,40,40,0.05)"
                        : newBalance === 0
                          ? "rgba(122,74,0,0.05)"
                          : "rgba(30,77,32,0.05)",
                    borderTop: "1.5px solid rgba(109,35,35,0.14)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        color: "#1a1a1a",
                        fontFamily: T.poppins,
                      }}
                    >
                      Total (New Balance)
                    </Typography>
                    {newBalance < 0 && (
                      <Typography
                        sx={{
                          fontSize: "0.6rem",
                          color: "#c62828",
                          fontFamily: T.poppins,
                          fontWeight: 600,
                          mt: 0.15,
                        }}
                      >
                        Shortfall deducted from salary
                      </Typography>
                    )}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 900,
                      color:
                        newBalance < 0
                          ? "#c62828"
                          : newBalance === 0
                            ? "#7a4a00"
                            : "#1e4d20",
                      fontFamily: T.poppins,
                    }}
                  >
                    {newBalance.toFixed(3)} d
                  </Typography>
                </Box>
              </Box>

              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "#1b5e20",
                  fontFamily: T.poppins,
                  bgcolor: "rgba(46,125,50,0.07)",
                  border: "1px solid rgba(46,125,50,0.2)",
                  borderRadius: 1.5,
                  p: 1,
                }}
              >
                This deduction is <strong>auto-approved</strong> — the balance
                will update immediately.
              </Typography>

              {deductError && (
                <Alert
                  severity="error"
                  sx={{ mt: 1, py: 0, fontSize: "0.7rem", borderRadius: 1 }}
                >
                  {deductError}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setConfirmOpen(false)}
              disabled={deducting}
              sx={{
                textTransform: "none",
                color: T.muted,
                fontFamily: T.poppins,
              }}
            >
              Cancel
            </Button>
            <AccentButton
              variant="contained"
              onClick={handleDeduct}
              disabled={deducting}
              sx={{ bgcolor: T.accent, "&:hover": { bgcolor: T.accentDark } }}
            >
              {deducting ? (
                <CircularProgress size={14} sx={{ color: "#fff" }} />
              ) : (
                "Confirm Deduction"
              )}
            </AccentButton>
          </DialogActions>
        </Dialog>
      </>
    );
  };
  }

  return (
    <CTODeductionReceipt
      employee={employee}
      attendanceData={attendanceData}
      year={year}
      month={month}
      onDeductSuccess={onDeductSuccess}
      refreshKey={refreshKey}
      empCat={empCat}
    />
  );
};

export { CTODeductionReceipt, DeductionReceiptSwitcher };
