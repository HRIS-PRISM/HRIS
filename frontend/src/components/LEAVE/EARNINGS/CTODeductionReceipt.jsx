import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import {
  employmentCategoryAllowsCompensatoryTimeOff,
  employmentCategoryLabel,
} from "../../../utils/earningsEmpCatRules";
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
  FormControlLabel,
  InputLabel,
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
  Policy as PolicyIcon,
  MoneyOff as MoneyOffIcon,
  InfoOutlined as InfoOutlinedIcon,
} from "@mui/icons-material";
import { useOfficialAttendanceMetrics } from "./useOfficialAttendanceMetrics";
import {
  getDeductionSourceBalanceDays,
  isDeductionSourceSufficient,
  canApplyAttendanceDeductionToCreditSource,
} from "../../../utils/deductionSourceBalances";

/** Skip applying this bucket (absence or tardiness) for the current confirmation only. */
const DEDUCTION_SKIP_VALUE = "__DEDUCTION_SKIP__";

/** Shown when assessed absence days are zero — no SC/CTO/salary absence charge applies. */
const NO_ABSENCES_RECORDED_MESSAGE = "No absences — no deduction.";

const isDeductionSkipSource = (v) => String(v ?? "").trim() === DEDUCTION_SKIP_VALUE;

/** Confirm / breakdown copy — never surface the internal sentinel. */
const humanizeDeductionCharge = (src) => {
  if (isDeductionSkipSource(src)) return "Skipped";
  const u = String(src ?? "").trim().toUpperCase();
  if (u === "SALARY_DEDUCTION") return "Salary";
  return u || "—";
};

const T = {
  accent: "#6d2323",
  accentDark: "#5a1d1d",
  accentMid: "#8B4545",
  accentFaint: "rgba(109,35,35,0.05)",
  accentBorder: "rgba(109,35,35,0.12)",
  balOk: "#2e7d32",
  balBad: "#c62828",
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

const formatHalfDayHeading = (iso) => {
  if (!iso) return "";
  try {
    const s = String(iso);
    const d = new Date(s.includes("T") ? s : `${s.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
};

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

const CTODeductionReceipt = ({
  employee,
  attendanceData,
  year,
  month,
  onDeductSuccess,
  refreshKey,
  empCat,
  onDeductHalfDayVLRequested,
  halfDayDeductDate,
  halfDayPendingDates,
  deductedVlHalfDates = [],
  /** When set (e.g. from Earnings Attendance Summary “Tardiness” metric), Step 1 uses this instead of re-deriving. */
  metricsTardinessHrs,
}) => {
  const [absenceDeductionOptions, setAbsenceDeductionOptions] = useState([]);
  const [tardinessDeductionOptions, setTardinessDeductionOptions] = useState([]);
  const [absenceSource, setAbsenceSource] = useState("CTO");
  const [tardinessSource, setTardinessSource] = useState("VL");
  const [deductionOptionsLoading, setDeductionOptionsLoading] = useState(false);
  const [assignmentMap, setAssignmentMap] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeductionAcknowledged, setConfirmDeductionAcknowledged] = useState(false);
  const [salaryOnlyModalOpen, setSalaryOnlyModalOpen] = useState(false);
  const [salaryOnlySubmitting, setSalaryOnlySubmitting] = useState(false);
  const [salaryOnlyModalError, setSalaryOnlyModalError] = useState("");
  const [deductSource, setDeductSource] = useState(null); // "sc" | "cto" | "normal"
  const [deducting, setDeducting] = useState(false);
  const [deductError, setDeductError] = useState("");
  const [deductSuccess, setDeductSuccess] = useState("");
  const [remark, setRemark] = useState("");
  const [policySelection, setPolicySelection] = useState(null); // 'sc' | 'cto' | null
  const [ctoBalance, setCtoBalance] = useState(null);
  const [vlBalance, setVlBalance] = useState(null);
  const [scBuffer, setScBuffer] = useState(0);
  const [balLoading, setBalLoading] = useState(false);
  const [existingCtoDeductions, setExistingCtoDeductions] = useState([]);
  const [existingTardinessDeductions, setExistingTardinessDeductions] = useState([]);
  const [existingAbsenceLeaveDeductions, setExistingAbsenceLeaveDeductions] = useState([]);
  const [existingScDeductions, setExistingScDeductions] = useState([]);
  const [deductionsLoading, setDeductionsLoading] = useState(false);
  const [periodSalaryShortfallRows, setPeriodSalaryShortfallRows] = useState([]);
 
  // ── Fetch balances ──────────────────────────────────────────────────────────
  const fetchBalances = useCallback(async (opts) => {
    const silent = opts?.silent === true;
    if (!employee) {
      setCtoBalance(null); setVlBalance(null); setScBuffer(0);
      return;
    }
    if (!silent) setBalLoading(true);
    const token = localStorage.getItem("token");
    try {
      const [assignRes, scRes, ctoRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/earnings/assignment-balances/${employee.employeeNumber}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/earnings/sc/${employee.employeeNumber}/balance`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/earnings/cto/${employee.employeeNumber}/balance`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (assignRes.status === "fulfilled" && assignRes.value.data && typeof assignRes.value.data === "object") {
        setAssignmentMap(assignRes.value.data);
        setVlBalance(toNum(assignRes.value.data?.VL?.remaining_hours) / 8);
      } else {
        setAssignmentMap({});
        setVlBalance(0);
      }
      setCtoBalance(ctoRes.status === "fulfilled" ? toNum(ctoRes.value.data?.totalRemaining) / 8 : 0);
      setScBuffer(scRes.status === "fulfilled" ? toNum(scRes.value.data?.totalRemaining) / 8 : 0);
    } catch {
      setCtoBalance(0); setVlBalance(0); setScBuffer(0);
    } finally {
      if (!silent) setBalLoading(false);
    }
  }, [employee]);
 
  // ── Fetch existing deductions (SC + CTO + VL) ──────────────────────────────
  const fetchExistingDeductions = useCallback(async (opts) => {
    const silent = opts?.silent === true;
    if (!employee) {
      setExistingCtoDeductions([]);
      setExistingTardinessDeductions([]);
      setExistingAbsenceLeaveDeductions([]);
      setExistingScDeductions([]);
      return;
    }
    if (!silent) setDeductionsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const [ctoRes, leaveRes, scRes, tardPostedRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/earnings/cto/${employee.employeeNumber}?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/earnings/leave/${employee.employeeNumber}?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/earnings/sc/${employee.employeeNumber}?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/leaveRoute/leave_credit_usage/tardiness_posted`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            employeeNumber: employee.employeeNumber,
            period_year: year,
            period_month: month,
          },
        }),
      ]);
      setExistingCtoDeductions(
        ctoRes.status === "fulfilled"
          ? (ctoRes.value.data?.earnings || []).filter(e => e.entry_type === "DEDUCTION" && e.earn_status !== "rejected")
          : []
      );
      const postedHours =
        tardPostedRes.status === "fulfilled" ? toNum(tardPostedRes.value.data?.posted_hours) : 0;
      const lastLeaveCode =
        tardPostedRes.status === "fulfilled" && tardPostedRes.value.data?.last_leave_code
          ? String(tardPostedRes.value.data.last_leave_code).trim()
          : "";
      const leaveAll = leaveRes.status === "fulfilled" ? leaveRes.value.data?.earnings || [] : [];
      const pendingTardiness = leaveAll.filter(
        (e) => e.entry_type === "TARDINESS_DEDUCTION" && e.earn_status === "pending",
      );
      const syntheticTard =
        postedHours > 1e-9
          ? [
              {
                id: `lcu-tard-all-${year}-${month}`,
                employee_number: employee.employeeNumber,
                leave_code: lastLeaveCode || "VL",
                earned_hours: -postedHours,
                period_year: parseInt(year, 10),
                period_month: parseInt(month, 10),
                entry_type: "TARDINESS_DEDUCTION",
                earn_status: "approved",
                remarks: "Tardiness offset (leave credit ledger)",
                _ledgerTardinessSynthetic: true,
              },
            ]
          : [];
      setExistingTardinessDeductions([...pendingTardiness, ...syntheticTard]);
      setExistingAbsenceLeaveDeductions(
        leaveRes.status === "fulfilled"
          ? (leaveRes.value.data?.earnings || []).filter(
              (e) =>
                e.entry_type === "DEDUCTION" &&
                e.earn_status !== "rejected" &&
                String(e.remarks || "").includes("Absence offset"),
            )
          : [],
      );
      setExistingScDeductions(
        scRes.status === "fulfilled"
          ? (scRes.value.data?.earnings || []).filter(e => e.entry_type === "DEDUCTION" && e.earn_status !== "rejected")
          : []
      );
    } catch {
      setExistingCtoDeductions([]);
      setExistingTardinessDeductions([]);
      setExistingAbsenceLeaveDeductions([]);
      setExistingScDeductions([]);
    } finally {
      if (!silent) setDeductionsLoading(false);
    }
  }, [employee, year, month]);
 
  useEffect(() => {
    fetchBalances({ silent: false });
    fetchExistingDeductions({ silent: false });
  }, [fetchBalances, fetchExistingDeductions, employee, year, month]);

  useEffect(() => {
    if (refreshKey === 0 || !employee) return;
    fetchBalances({ silent: true });
    fetchExistingDeductions({ silent: true });
  }, [refreshKey, employee, fetchBalances, fetchExistingDeductions]);

  const fetchPeriodSalaryShortfall = useCallback(async () => {
    if (!employee?.employeeNumber) {
      setPeriodSalaryShortfallRows([]);
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/leave-salary-shortfall`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          employeeNumber: String(employee.employeeNumber).trim(),
          year,
          month,
        },
      });
      setPeriodSalaryShortfallRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch {
      setPeriodSalaryShortfallRows([]);
    }
  }, [employee?.employeeNumber, year, month]);

  useEffect(() => {
    fetchPeriodSalaryShortfall();
  }, [fetchPeriodSalaryShortfall]);

  useEffect(() => {
    if (refreshKey === 0 || !employee?.employeeNumber) return;
    fetchPeriodSalaryShortfall();
  }, [refreshKey, fetchPeriodSalaryShortfall, employee?.employeeNumber]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!employee?.employeeNumber) {
        setAbsenceDeductionOptions([]);
        setTardinessDeductionOptions([]);
        return;
      }
      setDeductionOptionsLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const emp = String(employee.employeeNumber).trim();
      try {
        const [absRes, tarRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/deductions/options`, {
            params: { employeeNumber: emp, context: "ABSENCE", hasLeaveForm: "true" },
            headers,
          }),
          axios.get(`${API_BASE_URL}/api/deductions/options`, {
            params: { employeeNumber: emp, context: "TARDINESS", hasLeaveForm: "true" },
            headers,
          }),
        ]);
        if (!alive) return;
        const absOpts = Array.isArray(absRes.data?.options) ? absRes.data.options : [];
        const tarOpts = Array.isArray(tarRes.data?.options) ? tarRes.data.options : [];
        setAbsenceDeductionOptions(absOpts);
        setTardinessDeductionOptions(tarOpts);
      } catch {
        if (alive) {
          setAbsenceDeductionOptions([]);
          setTardinessDeductionOptions([]);
        }
      } finally {
        if (alive) setDeductionOptionsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [employee?.employeeNumber]);

  useEffect(() => {
    if (refreshKey === 0 || !employee?.employeeNumber) return;
    let alive = true;
    (async () => {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const emp = String(employee.employeeNumber).trim();
      try {
        const [absRes, tarRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/deductions/options`, {
            params: { employeeNumber: emp, context: "ABSENCE", hasLeaveForm: "true" },
            headers,
          }),
          axios.get(`${API_BASE_URL}/api/deductions/options`, {
            params: { employeeNumber: emp, context: "TARDINESS", hasLeaveForm: "true" },
            headers,
          }),
        ]);
        if (!alive) return;
        const absOpts = Array.isArray(absRes.data?.options) ? absRes.data.options : [];
        const tarOpts = Array.isArray(tarRes.data?.options) ? tarRes.data.options : [];
        setAbsenceDeductionOptions(absOpts);
        setTardinessDeductionOptions(tarOpts);
      } catch {
        if (alive) {
          setAbsenceDeductionOptions([]);
          setTardinessDeductionOptions([]);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey, employee?.employeeNumber]);

  const empCatAllowsCto = employmentCategoryAllowsCompensatoryTimeOff(empCat);
  const empCatDisplay = employmentCategoryLabel(empCat);

  const absenceOptionsUi = useMemo(() => {
    const list = Array.isArray(absenceDeductionOptions) ? [...absenceDeductionOptions] : [];
    if (!list.some((o) => String(o?.value || "").toUpperCase() === "SC")) {
      list.unshift({ value: "SC", label: "Service Credit (SC)", leave_type_id: null });
    }
    const sal = list.filter((o) => String(o?.value || "").toUpperCase() === "SALARY_DEDUCTION");
    const rest = list.filter((o) => String(o?.value || "").toUpperCase() !== "SALARY_DEDUCTION");
    const ordered = sal.length ? [...rest, ...sal] : rest;
    const skipOpt = {
      value: DEDUCTION_SKIP_VALUE,
      label: "Select...",
      leave_type_id: null,
    };
    return [skipOpt, ...ordered];
  }, [absenceDeductionOptions]);

  const tardinessOptionsUi = useMemo(() => {
    const list = Array.isArray(tardinessDeductionOptions) ? [...tardinessDeductionOptions] : [];
    const sal = list.filter((o) => String(o?.value || "").toUpperCase() === "SALARY_DEDUCTION");
    const rest = list.filter((o) => String(o?.value || "").toUpperCase() !== "SALARY_DEDUCTION");
    const ordered = sal.length ? [...rest, ...sal] : rest;
    const skipOpt = {
      value: DEDUCTION_SKIP_VALUE,
      label: "Select...",
      leave_type_id: null,
    };
    return [skipOpt, ...ordered];
  }, [tardinessDeductionOptions]);

  useEffect(() => {
    if (!absenceOptionsUi.length) return;
    setAbsenceSource((prev) => {
      if (absenceOptionsUi.some((o) => o.value === prev)) return prev;
      const nonSkipNonSal = absenceOptionsUi.find(
        (o) => o.value !== "SALARY_DEDUCTION" && o.value !== DEDUCTION_SKIP_VALUE,
      );
      return (
        nonSkipNonSal?.value ||
        absenceOptionsUi.find((o) => o.value !== DEDUCTION_SKIP_VALUE)?.value ||
        absenceOptionsUi[0].value
      );
    });
  }, [absenceOptionsUi]);

  useEffect(() => {
    if (!tardinessOptionsUi.length) return;
    setTardinessSource((prev) => {
      if (tardinessOptionsUi.some((o) => o.value === prev)) return prev;
      const vlOpt = tardinessOptionsUi.find(
        (o) => String(o?.value || "").toUpperCase() === "VL",
      );
      if (vlOpt && vlOpt.value !== DEDUCTION_SKIP_VALUE) return vlOpt.value;
      const nonSkipNonSal = tardinessOptionsUi.find(
        (o) => o.value !== "SALARY_DEDUCTION" && o.value !== DEDUCTION_SKIP_VALUE,
      );
      return (
        nonSkipNonSal?.value ||
        tardinessOptionsUi.find((o) => o.value !== DEDUCTION_SKIP_VALUE)?.value ||
        tardinessOptionsUi[0].value
      );
    });
  }, [tardinessOptionsUi]);
 
  // ── Derived numbers ─────────────────────────────────────────────────────────
  const officialStart = attendanceData?.summary?.startDate || attendanceData?.period?.start;
  const officialEnd = attendanceData?.summary?.endDate || attendanceData?.period?.end;
  const {
    absentDays: absentDaysOfficial,
    lateHrs: lateHrsOfficial,
    loading: officialMetricsLoading,
  } = useOfficialAttendanceMetrics({
    employeeNumber: employee?.employeeNumber,
    startDate: officialStart,
    endDate: officialEnd,
  });

  /** Match LEAVE/EARNINGS/AttendanceSummary.jsx — do not use `||` (0 official days would incorrectly fall back to stats). */
  const canTrustOfficialMetrics =
    !officialMetricsLoading &&
    Boolean(officialStart && officialEnd && employee?.employeeNumber);
  const absentDays = canTrustOfficialMetrics
    ? absentDaysOfficial
    : toNum(attendanceData?.stats?.absent_days);
  const tardHrsFromSummary = attendanceData?.summary
    ? parseHHMM(attendanceData.summary.overallRenderedOfficialTimeTardiness)
    : 0;
  const tardHrsAdjustedSummary = Math.max(0, tardHrsFromSummary - absentDays * 8);
  const tardHrsDerived = Math.max(
    lateHrsOfficial > 0 ? lateHrsOfficial : 0,
    tardHrsAdjustedSummary,
  );
  const tardHrs =
    metricsTardinessHrs != null && Number.isFinite(Number(metricsTardinessHrs))
      ? Math.max(0, Number(metricsTardinessHrs))
      : tardHrsDerived;
  const tardDays = tardHrs / 8;
 
  const isScTardinessDeductionRow = (e) =>
    String(e?.remarks || "").includes("Tardiness deduction");

  // Use ACTUAL posted deductions, NOT the available balance, for coverage logic
  const postedTardinessScDays = existingScDeductions
    .filter((e) => isScTardinessDeductionRow(e))
    .reduce((s, e) => s + Math.abs(toNum(e.earned_hours)) / 8, 0);
  /** SC rows that offset absence only (tardiness-to-SC uses the same DEDUCTION entry_type). */
  const alreadyScDeductedAbsenceOnly = existingScDeductions
    .filter((e) => !isScTardinessDeductionRow(e))
    .reduce((s, e) => s + Math.abs(toNum(e.earned_hours)) / 8, 0);
  const alreadyCtoDeducted = existingCtoDeductions.reduce((s, e) => s + Math.abs(toNum(e.earned_hours)) / 8, 0);
  const alreadyAbsenceFromLeave = existingAbsenceLeaveDeductions.reduce(
    (s, e) => s + Math.abs(toNum(e.earned_hours)) / 8,
    0,
  );
  const existingCtoTardinessDeductions = existingCtoDeductions.filter((e) =>
    String(e.remarks || "").includes("Tardiness deduction"),
  );
  const totalTardPostedLeave = existingTardinessDeductions.reduce(
    (s, e) => s + Math.abs(toNum(e.earned_hours)) / 8,
    0,
  );
  const postedTardinessCtoDays = existingCtoTardinessDeductions.reduce(
    (s, e) => s + Math.abs(toNum(e.earned_hours)) / 8,
    0,
  );
  const totalTardPostedLeaveAndCto = Number(
    (totalTardPostedLeave + postedTardinessCtoDays + postedTardinessScDays).toFixed(6),
  );
  const postedTardinessLeaveCode = (() => {
    const c = String(existingTardinessDeductions[0]?.leave_code || "").trim().toUpperCase();
    return c || "VL";
  })();

  // How much absence SC has actually covered via posted deductions
  const scActuallyCovered = Number(Math.min(alreadyScDeductedAbsenceOnly, absentDays).toFixed(3));
  const absenceAfterSc = Number(Math.max(0, absentDays - scActuallyCovered).toFixed(3));

  const remainingAbsence = Number(
    Math.max(0, absenceAfterSc - alreadyCtoDeducted - alreadyAbsenceFromLeave).toFixed(3),
  );
  const remainingTardiness = Number(
    Math.max(0, tardDays - totalTardPostedLeaveAndCto).toFixed(3),
  );

  const postedSalaryAbsenceDays = useMemo(
    () =>
      periodSalaryShortfallRows
        .filter(
          (r) =>
            String(r.leave_code || "").toUpperCase() === "ABSENCE" &&
            String(r.entry_type || "").toUpperCase() === "ATTENDANCE_SALARY_DEDUCTION",
        )
        .reduce((s, r) => s + toNum(r.shortfall_days), 0),
    [periodSalaryShortfallRows],
  );
  const postedSalaryTardinessDays = useMemo(
    () =>
      periodSalaryShortfallRows
        .filter(
          (r) =>
            String(r.leave_code || "").toUpperCase() === "TARDINESS" &&
            String(r.entry_type || "").toUpperCase() === "TARDINESS_SALARY_DEDUCTION",
        )
        .reduce((s, r) => s + toNum(r.shortfall_days), 0),
    [periodSalaryShortfallRows],
  );
  const remainingAbsenceForSalaryApply = Number(
    Math.max(0, remainingAbsence - postedSalaryAbsenceDays).toFixed(6),
  );
  const remainingTardinessForSalaryApply = Number(
    Math.max(0, remainingTardiness - postedSalaryTardinessDays).toFixed(6),
  );

  const tardinessSalaryFullyRecovered =
    tardDays > 0.0001 &&
    postedSalaryTardinessDays > 1e-9 &&
    remainingTardinessForSalaryApply <= 1e-5;
  const absenceSalaryFullyRecovered =
    absentDays > 0.0001 &&
    postedSalaryAbsenceDays > 1e-9 &&
    remainingAbsenceForSalaryApply <= 1e-5;
  /** Leave / CTO postings and/or salary shortfall fully cover assessed tardiness for the period. */
  const tardinessFullyDeducted =
    tardDays > 0.0001 &&
    (totalTardPostedLeaveAndCto >= tardDays - 0.0001 ||
      remainingTardinessForSalaryApply <= 1e-5);

  // Status flags — based on actual posted deductions only
  const absenceCoveredBySC = absentDays > 0 && scActuallyCovered >= absentDays;
  const absenceFullyDeducted =
    absentDays > 0 && absenceAfterSc > 0 && remainingAbsence <= 0.0001;

  const absencePending =
    existingCtoDeductions.some((e) => e.earn_status === "pending") ||
    existingAbsenceLeaveDeductions.some((e) => e.earn_status === "pending");
  const absenceApproved =
    existingCtoDeductions.some((e) => e.earn_status === "approved") ||
    existingAbsenceLeaveDeductions.some((e) => e.earn_status === "approved");
  const scPending = existingScDeductions.some((e) => e.earn_status === "pending");
  const scApproved = existingScDeductions.some((e) => e.earn_status === "approved");
  const existingScTardinessDeductions = existingScDeductions.filter((e) =>
    isScTardinessDeductionRow(e),
  );
  const tardinessPending =
    existingTardinessDeductions.some((e) => e.earn_status === "pending") ||
    existingCtoTardinessDeductions.some((e) => e.earn_status === "pending") ||
    existingScTardinessDeductions.some((e) => e.earn_status === "pending");
  const tardinessApproved =
    existingTardinessDeductions.some((e) => e.earn_status === "approved") ||
    existingCtoTardinessDeductions.some((e) => e.earn_status === "approved") ||
    existingScTardinessDeductions.some((e) => e.earn_status === "approved");

  const ctoBal = ctoBalance !== null ? ctoBalance : 0;
  const vlBal = vlBalance !== null ? vlBalance : 0;

  const deductionCreditCtxAbsence = useMemo(
    () => ({
      assignmentMap,
      scRemainingHours: toNum(scBuffer) * 8,
      ctoRemainingHours: toNum(ctoBal) * 8,
      salaryFallbackDays: null,
    }),
    [assignmentMap, scBuffer, ctoBal],
  );

  const deductionCreditCtxTardiness = useMemo(
    () => ({
      assignmentMap,
      scRemainingHours: toNum(scBuffer) * 8,
      ctoRemainingHours: toNum(ctoBal) * 8,
      salaryFallbackDays: vlBal,
    }),
    [assignmentMap, scBuffer, ctoBal, vlBal],
  );

  const absenceIsSkipped = isDeductionSkipSource(absenceSource);
  const tardinessIsSkipped = isDeductionSkipSource(tardinessSource);

  const tardBalDays = (() => {
    if (isDeductionSkipSource(tardinessSource)) return vlBal;
    const code = String(tardinessSource || "").toUpperCase();
    if (!code || code === "SALARY_DEDUCTION") return vlBal;
    const d = getDeductionSourceBalanceDays(
      tardinessSource,
      deductionCreditCtxTardiness,
    );
    return d != null && Number.isFinite(d) ? d : 0;
  })();

  const newCtoBalance = Number(
    (ctoBal - (String(absenceSource).toUpperCase() === "CTO" ? remainingAbsence : 0)).toFixed(3),
  );
  const newTardLeaveBalance = Number(
    (tardBalDays - (tardinessIsSkipped ? 0 : remainingTardiness)).toFixed(3),
  );
  const newVlBalance = newTardLeaveBalance;
  // SC preview: what balance will look like after SC deduction
  const absenceAmountForSource = remainingAbsence > 0 ? remainingAbsence : absentDays;
  const newScBalance = Number((scBuffer - absenceAmountForSource).toFixed(3));
  const newScBalanceAfterAbsence = Number((scBuffer - remainingAbsence).toFixed(3));
  const newCtoBalanceOverride = Number((ctoBal - absenceAmountForSource).toFixed(3));
  const allowScNegZero = ctoBal <= 0;
 
  const bothDone =
    (absentDays === 0 ||
      absenceCoveredBySC ||
      absenceFullyDeducted ||
      remainingAbsenceForSalaryApply <= 1e-5) &&
    (tardDays === 0 || tardinessFullyDeducted || remainingTardinessForSalaryApply <= 1e-5);
 
  // KEY CONDITION: show SC warning + two buttons when:
  //   scBuffer > 0  AND  absence exists  AND  not yet SC-deducted this period
  const showScWarningButtons =
    scBuffer > 0 &&
    absentDays > 0 &&
    !absenceCoveredBySC &&
    alreadyScDeductedAbsenceOnly < absentDays;

  const willApplyAbsence =
    !absenceIsSkipped &&
    absenceSource !== "SALARY_DEDUCTION" &&
    remainingAbsence > 0 &&
    canApplyAttendanceDeductionToCreditSource(
      absenceSource,
      remainingAbsence,
      deductionCreditCtxAbsence,
    );
  const willApplyTardiness =
    !tardinessIsSkipped &&
    tardinessSource !== "SALARY_DEDUCTION" &&
    remainingTardiness > 0 &&
    canApplyAttendanceDeductionToCreditSource(
      tardinessSource,
      remainingTardiness,
      deductionCreditCtxTardiness,
    );
  const willApplyAbsenceToSalary =
    !absenceIsSkipped &&
    String(absenceSource || "").toUpperCase() === "SALARY_DEDUCTION" &&
    remainingAbsenceForSalaryApply > 1e-5 &&
    absentDays > 0 &&
    !absenceCoveredBySC &&
    !absenceFullyDeducted &&
    !(absencePending || absenceApproved);
  const willApplyTardinessToSalary =
    !tardinessIsSkipped &&
    String(tardinessSource || "").toUpperCase() === "SALARY_DEDUCTION" &&
    remainingTardinessForSalaryApply > 1e-5 &&
    tardDays > 0.0001 &&
    !tardinessFullyDeducted &&
    !(tardinessPending || tardinessApproved);
  const lockedAbsenceUi = absencePending || absenceApproved || scPending || scApproved;
  const lockedTardinessUi = tardinessPending || tardinessApproved;
  const anyNonSalaryApplyUi =
    (willApplyAbsence && !lockedAbsenceUi) || (willApplyTardiness && !lockedTardinessUi);
  const anySalaryApplyUi =
    (willApplyAbsenceToSalary && !lockedAbsenceUi) || (willApplyTardinessToSalary && !lockedTardinessUi);
  const applyIsSalaryOnly =
    !showScWarningButtons && anySalaryApplyUi && !anyNonSalaryApplyUi;
  const canDeductNormal = willApplyAbsence || willApplyTardiness;

  /** Credit source selected in step 2 but balance cannot cover the assessed amount — must use salary shortfall path. */
  const absenceCreditSelectedButBlocked =
    !absenceIsSkipped &&
    remainingAbsence > 1e-5 &&
    String(absenceSource || "").toUpperCase() !== "SALARY_DEDUCTION" &&
    !(absencePending || absenceApproved) &&
    !absenceCoveredBySC &&
    !absenceFullyDeducted &&
    !canApplyAttendanceDeductionToCreditSource(
      absenceSource,
      remainingAbsence,
      deductionCreditCtxAbsence,
    );
  const tardinessCreditSelectedButBlocked =
    !tardinessIsSkipped &&
    remainingTardiness > 1e-5 &&
    String(tardinessSource || "").toUpperCase() !== "SALARY_DEDUCTION" &&
    !(tardinessPending || tardinessApproved) &&
    !tardinessFullyDeducted &&
    !canApplyAttendanceDeductionToCreditSource(
      tardinessSource,
      remainingTardiness,
      deductionCreditCtxTardiness,
    );
  const showDeductFromSalaryButton =
    (absenceCreditSelectedButBlocked && remainingAbsenceForSalaryApply > 1e-5) ||
    (tardinessCreditSelectedButBlocked && remainingTardinessForSalaryApply > 1e-5);

  const salaryModalAbsenceDays =
    absenceCreditSelectedButBlocked && remainingAbsenceForSalaryApply > 1e-5
      ? remainingAbsenceForSalaryApply
      : 0;
  const salaryModalTardinessDays =
    tardinessCreditSelectedButBlocked && remainingTardinessForSalaryApply > 1e-5
      ? remainingTardinessForSalaryApply
      : 0;
  const salaryModalTotalDays = Number(
    (salaryModalAbsenceDays + salaryModalTardinessDays).toFixed(6),
  );
  const salaryModalTotalHrs = salaryModalTotalDays * 8;
 
  const isLoading = balLoading || deductionsLoading || deductionOptionsLoading;

  const halfDayRows = useMemo(() => {
    if (Array.isArray(halfDayPendingDates)) {
      const fromArr = halfDayPendingDates.filter(Boolean);
      if (fromArr.length) {
        return [...new Set(fromArr.map(normalizeHalfDayDateKey))].filter(Boolean).sort();
      }
      return [];
    }
    return halfDayDeductDate ? [normalizeHalfDayDateKey(halfDayDeductDate)] : [];
  }, [halfDayPendingDates, halfDayDeductDate]);

  const halfDayDeductedSet = useMemo(
    () =>
      new Set(
        (deductedVlHalfDates || []).map(normalizeHalfDayDateKey).filter(Boolean),
      ),
    [deductedVlHalfDates],
  );

  const halfDayPendingCount = useMemo(
    () => halfDayRows.filter((d) => !halfDayDeductedSet.has(d)).length,
    [halfDayRows, halfDayDeductedSet],
  );
 
  useEffect(() => {
    if (showScWarningButtons) setPolicySelection("sc");
    else setPolicySelection(null);
  }, [showScWarningButtons]);
 
  // ── Handlers ────────────────────────────────────────────────────────────────
  const openConfirm = (source) => {
    setDeductSource(source);
    setDeductError("");
    setRemark("");
    setConfirmDeductionAcknowledged(false);
    setConfirmOpen(true);
  };
 
  const closeConfirm = () => {
    setConfirmOpen(false);
    setDeductSource(null);
    setDeductError("");
    setRemark("");
    setConfirmDeductionAcknowledged(false);
  };
 
  const handleDeduct = async () => {
    if (!employee) return;
    if (!confirmDeductionAcknowledged) return;
    setDeducting(true);
    setDeductError("");
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    const approveIfId = async (kind, id) => {
      const nid = Number(id);
      if (!Number.isFinite(nid) || nid <= 0) return;
      await axios.patch(`${API_BASE_URL}/api/earnings/${kind}/${nid}/approve`, {}, { headers });
    };
    try {
      if (deductSource === "sc") {
        if (
          !canApplyAttendanceDeductionToCreditSource(
            "SC",
            absenceAmountForSource,
            deductionCreditCtxAbsence,
          )
        ) {
          setDeductError(
            "Service Credit has no usable balance for this absence. Use Salary Deduction or “Deduct from salary” instead — credits cannot be posted at zero balance.",
          );
          setDeducting(false);
          return;
        }
        const { data } = await axios.post(
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
          { headers },
        );
        await approveIfId("sc", data?.id);
      } else if (deductSource === "cto") {
        if (
          !canApplyAttendanceDeductionToCreditSource(
            "CTO",
            absenceAmountForSource,
            deductionCreditCtxAbsence,
          )
        ) {
          setDeductError(
            "CTO has no usable balance for this absence. Use Salary Deduction or “Deduct from salary” instead.",
          );
          setDeducting(false);
          return;
        }
        const { data } = await axios.post(
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
          { headers },
        );
        await approveIfId("cto", data?.id);
      } else {
        const absCode = String(absenceSource || "").toUpperCase();
        const tardCodePre = String(tardinessSource || "").toUpperCase();
        if (
          deductSource === "normal" &&
          remainingAbsence > 1e-5 &&
          absCode !== "SALARY_DEDUCTION" &&
          !absenceIsSkipped &&
          !canApplyAttendanceDeductionToCreditSource(
            absenceSource,
            remainingAbsence,
            deductionCreditCtxAbsence,
          )
        ) {
          setDeductError(
            "The selected absence source has no usable balance. Choose Salary Deduction in step 2 or use “Deduct from salary” — only salary shortfall can proceed.",
          );
          setDeducting(false);
          return;
        }
        if (
          deductSource === "normal" &&
          remainingTardiness > 1e-5 &&
          tardCodePre !== "SALARY_DEDUCTION" &&
          !tardinessIsSkipped &&
          !canApplyAttendanceDeductionToCreditSource(
            tardinessSource,
            remainingTardiness,
            deductionCreditCtxTardiness,
          )
        ) {
          setDeductError(
            "The selected tardiness source has no usable balance. Choose Salary Deduction in step 2 or use “Deduct from salary” — only salary shortfall can proceed.",
          );
          setDeducting(false);
          return;
        }
        if (
          remainingAbsenceForSalaryApply > 1e-5 &&
          absCode === "SALARY_DEDUCTION" &&
          !(absencePending || absenceApproved)
        ) {
          await axios.post(
            `${API_BASE_URL}/api/leave-salary-shortfall`,
            {
              employeeNumber: employee.employeeNumber,
              periodYear: parseInt(year, 10),
              periodMonth: parseInt(month, 10),
              shortfallDays: remainingAbsenceForSalaryApply,
              leaveCode: "ABSENCE",
              entryType: "ATTENDANCE_SALARY_DEDUCTION",
              remarks: `Attendance absence charged to salary: ${remainingAbsenceForSalaryApply.toFixed(3)}d for ${monthName(month)} ${year}`,
            },
            { headers },
          );
        } else if (willApplyAbsence && absCode === "SC") {
          const { data } = await axios.post(
            `${API_BASE_URL}/api/earnings/sc`,
            {
              employeeNumber: employee.employeeNumber,
              sc_type: "non_commutative",
              earned_hours: -(remainingAbsence * 8),
              total_ot_hours: 0,
              period_year: parseInt(year, 10),
              period_month: parseInt(month, 10),
              entry_type: "DEDUCTION",
              remarks: `Absence offset from SC: ${remainingAbsence.toFixed(3)}d for ${monthName(month)} ${year}`,
            },
            { headers },
          );
          await approveIfId("sc", data?.id);
        } else if (willApplyAbsence && absCode === "CTO") {
          const { data } = await axios.post(
            `${API_BASE_URL}/api/earnings/cto`,
            {
              employeeNumber: employee.employeeNumber,
              ot_hours: 0,
              earned_hours: -(remainingAbsence * 8),
              period_year: parseInt(year, 10),
              period_month: parseInt(month, 10),
              entry_type: "DEDUCTION",
              remarks: `Absence offset: ${remainingAbsence.toFixed(3)}d for ${monthName(month)} ${year}`,
            },
            { headers },
          );
          await approveIfId("cto", data?.id);
        } else if (willApplyAbsence && absCode && absCode !== "SALARY_DEDUCTION") {
          const { data } = await axios.post(
            `${API_BASE_URL}/api/earnings/leave`,
            {
              employeeNumber: employee.employeeNumber,
              leave_code: absCode,
              earned_hours: -(remainingAbsence * 8),
              period_year: parseInt(year, 10),
              period_month: parseInt(month, 10),
              entry_type: "DEDUCTION",
              remarks: `Absence offset: ${remainingAbsence.toFixed(3)}d for ${monthName(month)} ${year}`,
            },
            { headers },
          );
          await approveIfId("leave", data?.id);
        }
        const tardCode = tardCodePre;
        if (
          remainingTardinessForSalaryApply > 1e-5 &&
          tardCode === "SALARY_DEDUCTION" &&
          !(tardinessPending || tardinessApproved)
        ) {
          await axios.post(
            `${API_BASE_URL}/api/leave-salary-shortfall`,
            {
              employeeNumber: employee.employeeNumber,
              periodYear: parseInt(year, 10),
              periodMonth: parseInt(month, 10),
              shortfallDays: remainingTardinessForSalaryApply,
              leaveCode: "TARDINESS",
              entryType: "TARDINESS_SALARY_DEDUCTION",
              remarks: `Attendance tardiness charged to salary: ${remainingTardinessForSalaryApply.toFixed(3)}d for ${monthName(month)} ${year}`,
            },
            { headers },
          );
        } else if (willApplyTardiness && tardCode === "CTO") {
          const { data } = await axios.post(
            `${API_BASE_URL}/api/earnings/cto`,
            {
              employeeNumber: employee.employeeNumber,
              ot_hours: 0,
              earned_hours: -(remainingTardiness * 8),
              period_year: parseInt(year, 10),
              period_month: parseInt(month, 10),
              entry_type: "DEDUCTION",
              remarks: `Tardiness deduction: ${remainingTardiness.toFixed(3)}d for ${monthName(month)} ${year}`,
            },
            { headers },
          );
          await approveIfId("cto", data?.id);
        } else if (willApplyTardiness && tardCode === "SC") {
          // Must hit sc_earnings → service_credit (same ledger as AssignmentManagement & SC balance chip).
          // Posting leave_code "SC" to /earnings/leave only touches leave_assignment, not service_credit.
          const { data } = await axios.post(
            `${API_BASE_URL}/api/earnings/sc`,
            {
              employeeNumber: employee.employeeNumber,
              sc_type: "non_commutative",
              earned_hours: -(remainingTardiness * 8),
              total_ot_hours: 0,
              period_year: parseInt(year, 10),
              period_month: parseInt(month, 10),
              entry_type: "DEDUCTION",
              remarks: `Tardiness deduction: ${remainingTardiness.toFixed(3)}d for ${monthName(month)} ${year}`,
            },
            { headers },
          );
          await approveIfId("sc", data?.id);
        } else if (willApplyTardiness && tardCode && tardCode !== "SALARY_DEDUCTION") {
          const { data } = await axios.post(
            `${API_BASE_URL}/api/earnings/leave`,
            {
              employeeNumber: employee.employeeNumber,
              leave_code: tardCode,
              earned_hours: -(remainingTardiness * 8),
              period_year: parseInt(year, 10),
              period_month: parseInt(month, 10),
              entry_type: "TARDINESS_DEDUCTION",
              remarks: `Tardiness deduction: ${remainingTardiness.toFixed(3)}d for ${monthName(month)} ${year}`,
            },
            { headers },
          );
          await approveIfId("leave", data?.id);
        }
      }

      setDeductSuccess("Deduction submitted successfully.");
      closeConfirm();
      await Promise.all([fetchBalances(), fetchExistingDeductions(), fetchPeriodSalaryShortfall()]);
      if (onDeductSuccess) onDeductSuccess();
      setTimeout(() => setDeductSuccess(""), 5000);
    } catch (err) {
      setDeductError("Deduction failed: " + (err.response?.data?.error || err.message));
    } finally {
      setDeducting(false);
    }
  };

  const handleSalaryShortcutConfirm = async () => {
    if (!employee || salaryModalTotalDays <= 1e-5) return;
    setSalaryOnlySubmitting(true);
    setSalaryOnlyModalError("");
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      if (salaryModalAbsenceDays > 1e-5 && !(absencePending || absenceApproved)) {
        await axios.post(
          `${API_BASE_URL}/api/leave-salary-shortfall`,
          {
            employeeNumber: employee.employeeNumber,
            periodYear: parseInt(year, 10),
            periodMonth: parseInt(month, 10),
            shortfallDays: salaryModalAbsenceDays,
            leaveCode: "ABSENCE",
            entryType: "ATTENDANCE_SALARY_DEDUCTION",
            remarks: `Attendance absence charged to salary: ${salaryModalAbsenceDays.toFixed(3)}d for ${monthName(month)} ${year}`,
          },
          { headers },
        );
      }
      if (salaryModalTardinessDays > 1e-5 && !(tardinessPending || tardinessApproved)) {
        await axios.post(
          `${API_BASE_URL}/api/leave-salary-shortfall`,
          {
            employeeNumber: employee.employeeNumber,
            periodYear: parseInt(year, 10),
            periodMonth: parseInt(month, 10),
            shortfallDays: salaryModalTardinessDays,
            leaveCode: "TARDINESS",
            entryType: "TARDINESS_SALARY_DEDUCTION",
            remarks: `Attendance tardiness charged to salary: ${salaryModalTardinessDays.toFixed(3)}d for ${monthName(month)} ${year}`,
          },
          { headers },
        );
      }
      setDeductSuccess("Salary shortfall recorded (payroll / attendance audit trail).");
      setSalaryOnlyModalOpen(false);
      await Promise.all([fetchBalances(), fetchExistingDeductions(), fetchPeriodSalaryShortfall()]);
      if (onDeductSuccess) onDeductSuccess();
      setTimeout(() => setDeductSuccess(""), 5000);
    } catch (err) {
      setSalaryOnlyModalError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Request failed",
      );
    } finally {
      setSalaryOnlySubmitting(false);
    }
  };
 
  if (!attendanceData?.summary) return null;
  const hasAnything =
    absentDays > 0 ||
    tardDays > 0 ||
    absenceFullyDeducted ||
    tardinessFullyDeducted ||
    (empCatAllowsCto && ctoBal > 0) ||
    scBuffer > 0 ||
    halfDayRows.length > 0;
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
  const showStep1 = showAbsence || showTardiness || showScWarningButtons;
  const lockedAbsencePolicy =
    absencePending || absenceApproved || scPending || scApproved;
  const useScCtoPolicyPreview =
    showScWarningButtons &&
    remainingAbsence > 0 &&
    !absenceCoveredBySC &&
    !absenceFullyDeducted &&
    !lockedAbsencePolicy;

  const leftAbsLedgerBal = !showAbsence
    ? null
    : useScCtoPolicyPreview
      ? policySelection === "cto"
        ? Number((ctoBal - remainingAbsence).toFixed(3))
        : Number((scBuffer - remainingAbsence).toFixed(3))
      : absenceIsSkipped
        ? Number(ctoBal.toFixed(3))
        : absenceFullyDeducted || absenceCoveredBySC
          ? Number((ctoBal - alreadyCtoDeducted).toFixed(3))
          : String(absenceSource).toUpperCase() === "SC"
            ? newScBalanceAfterAbsence
            : String(absenceSource).toUpperCase() === "CTO"
              ? newCtoBalance
              : String(absenceSource).toUpperCase() !== "SALARY_DEDUCTION"
                ? Number(
                    (
                      toNum(assignmentMap[absenceSource]?.remaining_hours) / 8 -
                      remainingAbsence
                    ).toFixed(3),
                  )
                : newCtoBalance;

  const leftAbsLedgerLabel = !showAbsence
    ? ""
    : useScCtoPolicyPreview
      ? policySelection === "cto"
        ? "New CTO balance"
        : "New SC balance"
      : absenceIsSkipped
        ? "Absence skipped (no change)"
        : absenceFullyDeducted || absenceCoveredBySC
          ? "New CTO Bal"
          : String(absenceSource).toUpperCase() === "SC"
            ? "New SC Bal"
            : String(absenceSource).toUpperCase() === "CTO"
              ? "New CTO Bal"
              : String(absenceSource).toUpperCase() !== "SALARY_DEDUCTION"
                ? `New ${humanizeDeductionCharge(absenceSource)} Bal`
                : "New CTO Bal";

  const rightTardLedgerBal = !showTardiness
    ? null
    : tardinessIsSkipped
      ? Number(tardBalDays.toFixed(3))
      : tardinessFullyDeducted
        ? Number((tardBalDays - totalTardPostedLeave).toFixed(3))
        : newVlBalance;

  const rightTardLedgerLabel = !showTardiness
    ? ""
    : tardinessIsSkipped
      ? "Tardiness skipped (no change)"
      : String(tardinessSource).toUpperCase() === "SALARY_DEDUCTION"
        ? "Salary (no leave)"
        : `New ${humanizeDeductionCharge(tardinessSource)} Bal`;

  const tardinessOptionLabel =
    tardinessOptionsUi.find((o) => o.value === tardinessSource)?.label?.trim() ||
    "";

  const absenceOptionLabel =
    absenceOptionsUi.find((o) => o.value === absenceSource)?.label?.trim() || "";

  const absenceOffsetScopeLabel = (() => {
    if (absenceOptionLabel) {
      const paren = absenceOptionLabel.match(/\(([^)]+)\)\s*$/);
      if (paren?.[1]) return String(paren[1]).trim();
    }
    if (isDeductionSkipSource(absenceSource)) return "—";
    const u = String(absenceSource || "").toUpperCase();
    if (u === "SALARY_DEDUCTION") return "Salary";
    return u || "—";
  })();

  const tardinessLedgerHeading = tardinessIsSkipped
    ? postedTardinessLeaveCode
    : tardinessOptionLabel ||
      (String(tardinessSource).toUpperCase() === "CTO"
        ? "Compensatory Time Off (CTO)"
        : String(tardinessSource).toUpperCase() === "SC"
          ? "Service Credit (SC)"
          : "Leave");

  /** Card title uses the short code only, e.g. (SC) from “Service Credit (SC)” or the source value. */
  const tardinessOffsetScopeLabel = (() => {
    if (tardinessOptionLabel) {
      const paren = tardinessOptionLabel.match(/\(([^)]+)\)\s*$/);
      if (paren?.[1]) return String(paren[1]).trim();
    }
    if (isDeductionSkipSource(tardinessSource)) return "—";
    const u = String(tardinessSource || "").toUpperCase();
    if (u === "SALARY_DEDUCTION") return "Salary";
    return u || "—";
  })();

  const tardinessOffsetTitle = `Tardiness offset (${tardinessOffsetScopeLabel})`;

  /** Balance for confirm-modal chip (matches Step 2 + deductSource). */
  const modalCreditBalanceDays = (() => {
    const ds = deductSource;
    if (ds === "sc") return scBuffer;
    if (ds === "cto") return ctoBal;
    if (ds !== "normal") return 0;
    if (willApplyTardiness && !willApplyAbsence) return tardBalDays;
    if (willApplyAbsence && !willApplyTardiness) {
      const u = String(absenceSource || "").toUpperCase();
      if (u === "SC") return scBuffer;
      if (u === "CTO") return ctoBal;
      if (u !== "SALARY_DEDUCTION")
        return toNum(assignmentMap[absenceSource]?.remaining_hours) / 8;
      return ctoBal;
    }
    const au = String(absenceSource || "").toUpperCase();
    if (au === "SC") return scBuffer;
    if (au === "CTO") return ctoBal;
    if (au !== "SALARY_DEDUCTION")
      return toNum(assignmentMap[absenceSource]?.remaining_hours) / 8;
    return ctoBal;
  })();

  const modalBreakdownPrimaryLabel = (() => {
    const ds = deductSource;
    if (ds === "sc") return "SC";
    if (ds === "cto") return "CTO";
    if (ds !== "normal") return "—";
    if (willApplyTardiness && !willApplyAbsence) return tardinessOffsetScopeLabel;
    if (willApplyAbsence && !willApplyTardiness) return absenceOffsetScopeLabel;
    if (willApplyAbsence && willApplyTardiness)
      return `${absenceOffsetScopeLabel} · ${tardinessOffsetScopeLabel}`;
    return "—";
  })();

  const confirmSlipTotalDays = useMemo(() => {
    if (deductSource === "sc" || deductSource === "cto") return absenceAmountForSource;
    if (deductSource === "normal" && applyIsSalaryOnly) {
      return Number((remainingAbsenceForSalaryApply + remainingTardinessForSalaryApply).toFixed(6));
    }
    return Number(
      ((willApplyAbsence ? remainingAbsence : 0) + (willApplyTardiness ? remainingTardiness : 0)).toFixed(6),
    );
  }, [
    deductSource,
    absenceAmountForSource,
    applyIsSalaryOnly,
    remainingAbsenceForSalaryApply,
    remainingTardinessForSalaryApply,
    willApplyAbsence,
    remainingAbsence,
    willApplyTardiness,
    remainingTardiness,
  ]);

  const confirmSlipTotalHrs = confirmSlipTotalDays * 8;

  const confirmTransactionLines = useMemo(() => {
    const lines = [];
    if (deductSource === "sc" || deductSource === "cto") {
      lines.push({
        key: "abs-policy",
        title: "Absence deduction",
        sub: `Charged to ${deductSource.toUpperCase()} · ${Number(absentDays || 0).toFixed(3)} day(s) assessed`,
        amount: absenceAmountForSource,
      });
      return lines;
    }
    if (deductSource === "normal") {
      if (willApplyAbsence && remainingAbsence > 0) {
        lines.push({
          key: "abs",
          title: "Absence deduction",
          sub: `Charged to ${humanizeDeductionCharge(absenceSource)} · ${Number(absentDays || 0).toFixed(3)} day(s) absent`,
          amount: remainingAbsence,
        });
      } else if (willApplyAbsenceToSalary && remainingAbsenceForSalaryApply > 1e-5) {
        lines.push({
          key: "abs-sal",
          title: "Absence deduction",
          sub: "Charged to salary · assessed absence",
          amount: remainingAbsenceForSalaryApply,
        });
      }
      if (willApplyTardiness && remainingTardiness > 0) {
        lines.push({
          key: "tar",
          title: "Tardiness deduction",
          sub: `Charged to ${tardinessOffsetScopeLabel} · ${tardHrs.toFixed(3)} hrs late`,
          amount: remainingTardiness,
        });
      } else if (willApplyTardinessToSalary && remainingTardinessForSalaryApply > 1e-5) {
        lines.push({
          key: "tar-sal",
          title: "Tardiness deduction",
          sub: "Charged to salary · assessed tardiness",
          amount: remainingTardinessForSalaryApply,
        });
      }
    }
    return lines;
  }, [
    deductSource,
    absentDays,
    absenceAmountForSource,
    willApplyAbsence,
    remainingAbsence,
    absenceSource,
    willApplyAbsenceToSalary,
    remainingAbsenceForSalaryApply,
    willApplyTardiness,
    remainingTardiness,
    tardinessOffsetScopeLabel,
    tardHrs,
    willApplyTardinessToSalary,
    remainingTardinessForSalaryApply,
  ]);

  const confirmModalBalanceTiles = useMemo(() => {
    if (!deductSource) return [];
    const tiles = [];
    if (deductSource === "sc") {
      const nb = allowScNegZero && Object.is(newScBalance, -0) ? 0 : newScBalance;
      tiles.push({
        key: "sc",
        label: "SC before",
        before: scBuffer,
        delta: -absenceAmountForSource,
        after: nb,
      });
    } else if (deductSource === "cto") {
      tiles.push({
        key: "cto",
        label: "CTO before",
        before: ctoBal,
        delta: -absenceAmountForSource,
        after: newCtoBalanceOverride,
      });
    } else if (deductSource === "normal") {
      if (willApplyAbsence && remainingAbsence > 0) {
        const au = String(absenceSource || "").toUpperCase();
        if (au === "CTO") {
          tiles.push({
            key: "cto-a",
            label: "CTO before",
            before: ctoBal,
            delta: -remainingAbsence,
            after: newCtoBalance,
          });
        } else if (au === "SC") {
          tiles.push({
            key: "sc-a",
            label: "SC before",
            before: scBuffer,
            delta: -remainingAbsence,
            after: newScBalanceAfterAbsence,
          });
        } else if (au !== "SALARY_DEDUCTION") {
          const prev = toNum(assignmentMap[absenceSource]?.remaining_hours) / 8;
          tiles.push({
            key: `leave-${au}`,
            label: `${humanizeDeductionCharge(absenceSource)} before`,
            before: prev,
            delta: -remainingAbsence,
            after: prev - remainingAbsence,
          });
        }
      }
      if (willApplyTardiness && remainingTardiness > 0) {
        const code = String(tardinessSource || "").toUpperCase();
        const short =
          code === "VL" ? "VL" : code === "CTO" ? "CTO" : humanizeDeductionCharge(tardinessSource);
        tiles.push({
          key: "tard",
          label: `${short} before`,
          before: tardBalDays,
          delta: -remainingTardiness,
          after: newVlBalance,
        });
      }
    }
    return tiles;
  }, [
    deductSource,
    allowScNegZero,
    newScBalance,
    scBuffer,
    absenceAmountForSource,
    ctoBal,
    newCtoBalanceOverride,
    willApplyAbsence,
    remainingAbsence,
    absenceSource,
    assignmentMap,
    newCtoBalance,
    newScBalanceAfterAbsence,
    willApplyTardiness,
    remainingTardiness,
    tardinessSource,
    tardBalDays,
    newVlBalance,
  ]);

  const slipAfterDotColor = (after) => {
    if (after < 0) return T.balBad;
    if (Math.abs(after) < 1e-9) return "#f59e0b";
    return T.balOk;
  };

  const slipAfterTextColor = (after) => {
    if (after < 0) return T.balBad;
    if (Math.abs(after) < 1e-9) return "#92400e";
    return T.balOk;
  };

  const tardinessLedgerOutline =
    showTardiness && tardinessFullyDeducted
      ? tardinessApproved || tardinessSalaryFullyRecovered
        ? "success"
        : "warning"
      : "default";

  const absenceLedgerOutline =
    showAbsence && absenceCoveredBySC && absentDays > 0
      ? scApproved
        ? "success"
        : "warning"
      : showAbsence && absenceFullyDeducted && !absenceCoveredBySC
        ? absenceApproved
          ? "success"
          : "warning"
      : showAbsence &&
          absentDays > 0 &&
          absenceSalaryFullyRecovered &&
          !absenceCoveredBySC &&
          !absenceFullyDeducted
        ? "success"
        : "default";

  const StepNum = ({ n }) => (
    <Box
      sx={{
        width: 19,
        height: 19,
        borderRadius: "50%",
        bgcolor: T.accent,
        color: "#fff",
        fontSize: "0.69rem",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: T.poppins,
      }}
    >
      {n}
    </Box>
  );

  const LedgerShell = ({ title, children, footer, outline = "default" }) => (
    <Box
      sx={{
        border:
          outline === "success"
            ? "1px solid rgba(46, 125, 50, 0.5)"
            : outline === "warning"
              ? "1px solid rgba(230, 81, 0, 0.42)"
              : "0.5px solid rgba(0,0,0,0.1)",
        borderRadius: 1.25,
        overflow: "hidden",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        alignSelf: "stretch",
      }}
    >
      <Box
        sx={{
          px: "11px",
          py: "7px",
          bgcolor:
            outline === "success"
              ? "rgba(46, 125, 50, 0.08)"
              : outline === "warning"
                ? "rgba(230, 81, 0, 0.08)"
                : "rgba(0,0,0,0.03)",
          borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.6875rem",
            fontWeight: 500,
            color: T.muted,
            fontFamily: T.poppins,
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>
      </Box>
      <Box
        sx={{
          px: "11px",
          py: "6px",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </Box>
      <Box sx={{ flexShrink: 0 }}>{footer}</Box>
    </Box>
  );

  return (
    <>
      <Box sx={{ mt: 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {deductSuccess && (
          <Alert severity="success" sx={{ py: 0.5, fontSize: "0.65rem", borderRadius: 1.25 }}>
            {deductSuccess}
          </Alert>
        )}

        {showStep1 && (
          <Box
            sx={{
              borderRadius: 1.5,
              border: `1px solid ${bothDone ? "rgba(46,125,50,0.22)" : "rgba(109,35,35,0.14)"}`,
              bgcolor: "#fff",
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
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <StepNum n={1} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 500, color: T.text, fontFamily: T.poppins }}>
                    Absence offset — which credit covers absences?
                  </Typography>
                  <Typography sx={{ fontSize: "0.6875rem", color: T.muted, fontFamily: T.poppins, mt: 0.12 }}>
                    {showAbsence
                      ? `${absentDays.toFixed(3)} absent days need to be charged to a leave credit`
                      : "No absences recorded — no absence offset. Tardiness (if any) is handled in the next card."}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                {isLoading && <CircularProgress size={12} sx={{ color: T.accent }} />}
                {scBuffer > 0 && (
                  <Chip
                    size="small"
                    label={`SC buffer: ${scBuffer.toFixed(3)} d`}
                    sx={{
                      height: 22,
                      fontSize: "0.6875rem",
                      fontWeight: 500,
                      bgcolor: "#EAF3DE",
                      color: "#27500A",
                      border: "none",
                    }}
                  />
                )}
                {(absencePending || absenceApproved) && <SBadge approved={absenceApproved} />}
                {(scPending || scApproved) && (
                  <SBadge label={scApproved ? "SC applied" : "SC pending"} approved={scApproved} />
                )}
                {(tardinessPending || tardinessApproved) && showTardiness && (
                  <SBadge approved={tardinessApproved} />
                )}
                {bothDone && <SBadge label="All done" approved />}
              </Box>
            </Box>

            <Box sx={{ px: 1.6, py: 1.25 }}>
              {showScWarningButtons && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.85,
                    alignItems: "flex-start",
                    p: 1,
                    mb: 1.25,
                    borderRadius: 1.25,
                    bgcolor: "#FAEEDA",
                    border: "0.5px solid #FAC775",
                  }}
                >
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      bgcolor: "#FAC775",
                      color: "#633806",
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      mt: "2px",
                    }}
                  >
                    !
                  </Box>
                  <Typography sx={{ fontSize: "0.75rem", color: "#633806", fontFamily: T.poppins, lineHeight: 1.45 }}>
                    Absences should be deducted from Service Credits first before Compensatory Time Off.
                  </Typography>
                </Box>
              )}

              {showScWarningButtons &&
                absentDays > 0 &&
                !absenceCoveredBySC &&
                !absenceFullyDeducted &&
                remainingAbsence > 0 && (
                  <Box
                    sx={{
                      border: "2px solid #185FA5",
                      borderRadius: 1.25,
                      overflow: "hidden",
                      mb: 1.25,
                    }}
                  >
                    <Box
                      sx={{
                        px: 1,
                        py: 0.4,
                        bgcolor: "#E6F1FB",
                        borderBottom: "1px solid #B5D4F4",
                      }}
                    >
                      <Typography sx={{ fontSize: "0.69rem", fontWeight: 600, color: "#0C447C", fontFamily: T.poppins }}>
                        Recommended draw order
                      </Typography>
                    </Box>
                    <Box sx={{ px: 1, py: 0.85, bgcolor: "#fff" }}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="cto-sc-first-pool-step1">SC vs CTO — draw first</InputLabel>
                        <Select
                          labelId="cto-sc-first-pool-step1"
                          label="SC vs CTO — draw first"
                          value={policySelection === "cto" ? "cto" : "sc"}
                          onChange={(e) => setPolicySelection(e.target.value)}
                          disabled={
                            deducting ||
                            isLoading ||
                            scPending ||
                            scApproved ||
                            absencePending ||
                            absenceApproved
                          }
                          sx={{ fontSize: "0.8rem", borderRadius: 1, bgcolor: "#fff" }}
                        >
                          <MenuItem value="sc">
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <SCIcon sx={{ fontSize: 16, color: "#2e7d32" }} />
                              Service Credit (SC) deducts first
                            </Box>
                          </MenuItem>
                          <MenuItem value="cto">
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <CTOIcon sx={{ fontSize: 16, color: "#6a1b9a" }} />
                              CTO deducts first
                            </Box>
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                )}

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  alignItems: "stretch",
                  gap: 1.25,
                }}
              >
                <LedgerShell
                  title="Absence offset (SC / CTO)"
                  outline={absenceLedgerOutline}
                  footer={
                    !showAbsence ? (
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.5,
                          borderTop: "1px solid rgba(46, 125, 50, 0.22)",
                          bgcolor: "rgba(46, 125, 50, 0.06)",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                          minHeight: 28,
                        }}
                      >
                        <CheckIcon sx={{ fontSize: 14, color: "#2e7d32", flexShrink: 0, display: "block" }} />
                        <Typography
                          noWrap
                          component="span"
                          title={NO_ABSENCES_RECORDED_MESSAGE}
                          sx={{
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            color: "#1b5e20",
                            fontFamily: T.poppins,
                            lineHeight: 1.15,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {NO_ABSENCES_RECORDED_MESSAGE}
                        </Typography>
                      </Box>
                    ) : showAbsence && absenceCoveredBySC && absentDays > 0 ? (
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.5,
                          borderTop: scApproved
                            ? "1.5px solid rgba(46, 125, 50, 0.38)"
                            : "1.5px solid rgba(230, 81, 0, 0.35)",
                          bgcolor: scApproved ? "rgba(46, 125, 50, 0.07)" : "rgba(230, 81, 0, 0.07)",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                          minHeight: 28,
                        }}
                      >
                        <CheckIcon
                          sx={{ fontSize: 14, color: scApproved ? "#2e7d32" : "#e65100", flexShrink: 0, display: "block" }}
                        />
                        <Typography
                          noWrap
                          component="span"
                          title={
                            scApproved
                              ? "Absence fully covered by SC for this period."
                              : "Approve for deduction — SC absence offset is pending approval."
                          }
                          sx={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            color: scApproved ? "#1b5e20" : "#7a4a00",
                            fontFamily: T.poppins,
                            lineHeight: 1.15,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {scApproved
                            ? "Absence fully covered by SC for this period."
                            : "Approve for deduction — SC absence offset is pending approval."}
                        </Typography>
                      </Box>
                    ) : showAbsence && absenceFullyDeducted && !absenceCoveredBySC ? (
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.5,
                          borderTop: absenceApproved
                            ? "1.5px solid rgba(46, 125, 50, 0.38)"
                            : "1.5px solid rgba(230, 81, 0, 0.35)",
                          bgcolor: absenceApproved ? "rgba(46, 125, 50, 0.07)" : "rgba(230, 81, 0, 0.07)",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                          minHeight: 28,
                        }}
                      >
                        <CheckIcon
                          sx={{
                            fontSize: 14,
                            color: absenceApproved ? "#2e7d32" : "#e65100",
                            flexShrink: 0,
                            display: "block",
                          }}
                        />
                        <Typography
                          noWrap
                          component="span"
                          title={
                            absenceApproved
                              ? "Absence fully deducted for this period."
                              : "Approve for deduction — absence offset (SC / CTO) is pending approval."
                          }
                          sx={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            color: absenceApproved ? "#1b5e20" : "#7a4a00",
                            fontFamily: T.poppins,
                            lineHeight: 1.15,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {absenceApproved
                            ? "Absence fully deducted for this period."
                            : "Approve for deduction — absence offset (SC / CTO) is pending approval."}
                        </Typography>
                      </Box>
                    ) : showAbsence &&
                      absentDays > 0 &&
                      absenceSalaryFullyRecovered &&
                      !absenceCoveredBySC &&
                      !absenceFullyDeducted ? (
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.5,
                          borderTop: "1.5px solid rgba(46, 125, 50, 0.38)",
                          bgcolor: "rgba(46, 125, 50, 0.07)",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                          minHeight: 28,
                        }}
                      >
                        <CheckIcon sx={{ fontSize: 14, color: "#2e7d32", flexShrink: 0, display: "block" }} />
                        <Typography
                          noWrap
                          component="span"
                          title="Absence fully charged to salary for this period."
                          sx={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            color: "#1b5e20",
                            fontFamily: T.poppins,
                            lineHeight: 1.15,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          Absence fully charged to salary for this period.
                        </Typography>
                      </Box>
                    ) : leftAbsLedgerBal != null ? (
                      <BalanceFooter bal={leftAbsLedgerBal} label={leftAbsLedgerLabel} />
                    ) : (
                      <Box sx={{ px: 1.1, py: 0.75, borderTop: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(0,0,0,0.02)" }}>
                        <Typography sx={{ fontSize: "0.62rem", color: T.muted, fontFamily: T.poppins }}>
                          No absence offset for this period.
                        </Typography>
                      </Box>
                    )
                  }
                >
                  {showAbsence ? (
                    <>
                      {empCatAllowsCto && (
                        <R
                          label="CTO balance"
                          sub={balLoading ? "Loading…" : "Current"}
                          value={balLoading ? "…" : `${ctoBal.toFixed(3)} d`}
                          valueColor={ctoBal > 0 ? "#1e4d20" : T.faint}
                          bold
                        />
                      )}
                      {scBuffer > 0 && (
                        <R
                          label="SC buffer available"
                          sub="Applies before CTO when SC-first"
                          value={fmtDays3(scBuffer, { allowNegZero: allowScNegZero })}
                          valueColor="#185FA5"
                        />
                      )}
                      {!empCatAllowsCto && scBuffer <= 0 && (
                        <Typography sx={{ fontSize: "0.6rem", color: T.muted, fontFamily: T.poppins, mb: 0.5 }}>
                          CTO is not used for this category — choose the leave account in step 2.
                        </Typography>
                      )}
                      <R
                        label="Absences to offset"
                        sub={`${absentDays.toFixed(3)} d recorded`}
                        value={
                          absenceCoveredBySC
                            ? "Covered by SC"
                            : remainingAbsence > 0
                              ? `− ${remainingAbsence.toFixed(3)} d`
                              : "0.000 d"
                        }
                        valueColor={
                          absenceCoveredBySC ? "#2e7d32" : remainingAbsence > 0 ? "#c62828" : T.faint
                        }
                      />
                      {alreadyCtoDeducted > 0 && (
                        <R
                          label={`CTO offset (${existingCtoDeductions[0]?.earn_status || "pending"})`}
                          value={`− ${alreadyCtoDeducted.toFixed(3)} d`}
                          valueColor="#2e7d32"
                          faded
                        />
                      )}
                      {alreadyScDeductedAbsenceOnly > 0 && (
                        <R
                          label={`SC deducted (${
                            existingScDeductions.find((e) => !isScTardinessDeductionRow(e))
                              ?.earn_status || "pending"
                          })`}
                          value={`− ${alreadyScDeductedAbsenceOnly.toFixed(3)} d`}
                          valueColor="#1565c0"
                          faded
                        />
                      )}
                    </>
                  ) : (
                    <Box sx={{ py: 0.5 }}>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 500,
                          color: T.text,
                          fontFamily: T.poppins,
                          lineHeight: 1.5,
                        }}
                      >
                        {NO_ABSENCES_RECORDED_MESSAGE}
                      </Typography>
                    </Box>
                  )}
                </LedgerShell>

                <LedgerShell
                  title={tardinessOffsetTitle}
                  outline={tardinessLedgerOutline}
                  footer={
                    showTardiness && tardinessFullyDeducted ? (
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.5,
                          borderTop:
                            tardinessApproved || tardinessSalaryFullyRecovered
                              ? "1.5px solid rgba(46, 125, 50, 0.38)"
                              : "1.5px solid rgba(230, 81, 0, 0.35)",
                          bgcolor:
                            tardinessApproved || tardinessSalaryFullyRecovered
                              ? "rgba(46, 125, 50, 0.07)"
                              : "rgba(230, 81, 0, 0.07)",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                          minHeight: 28,
                        }}
                      >
                        <CheckIcon
                          sx={{
                            fontSize: 14,
                            color:
                              tardinessApproved || tardinessSalaryFullyRecovered
                                ? "#2e7d32"
                                : "#e65100",
                            flexShrink: 0,
                            display: "block",
                          }}
                        />
                        <Typography
                          noWrap
                          component="span"
                          title={
                            tardinessSalaryFullyRecovered
                              ? "Tardiness fully charged to salary for this period."
                              : tardinessApproved
                                ? "Tardiness fully deducted for this period."
                                : `Approve for deduction — ${tardinessOffsetTitle} is pending approval.`
                          }
                          sx={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            color:
                              tardinessApproved || tardinessSalaryFullyRecovered
                                ? "#1b5e20"
                                : "#7a4a00",
                            fontFamily: T.poppins,
                            lineHeight: 1.15,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {tardinessSalaryFullyRecovered
                            ? "Tardiness fully charged to salary for this period."
                            : tardinessApproved
                              ? "Tardiness fully deducted for this period."
                              : `Approve for deduction — ${tardinessOffsetTitle} is pending approval.`}
                        </Typography>
                      </Box>
                    ) : rightTardLedgerBal != null ? (
                      <BalanceFooter bal={rightTardLedgerBal} label={rightTardLedgerLabel} />
                    ) : (
                      <Box sx={{ px: 1.1, py: 0.75, borderTop: "1px solid rgba(0,0,0,0.08)", bgcolor: "rgba(0,0,0,0.02)" }}>
                        <Typography sx={{ fontSize: "0.62rem", color: T.muted, fontFamily: T.poppins }}>
                          No tardiness this period.
                        </Typography>
                      </Box>
                    )
                  }
                >
                  <R
                    label={`${tardinessLedgerHeading} balance`}
                    sub={
                      balLoading ? "Loading…" : tardinessIsSkipped ? "No new charge this run" : "Current"
                    }
                    value={
                      balLoading
                        ? "…"
                        : `${(String(tardinessSource).toUpperCase() === "SALARY_DEDUCTION" ? 0 : tardBalDays).toFixed(3)} d`
                    }
                    valueColor={
                      tardBalDays > 0 || String(tardinessSource).toUpperCase() === "SALARY_DEDUCTION"
                        ? "#1e4d20"
                        : T.faint
                    }
                    bold
                  />
                  {!tardinessIsSkipped && (
                    <R label="Buffer" sub="—" value="—" valueColor={T.faint} faded />
                  )}
                  {showTardiness && (
                    <R
                      label="Tardiness to offset"
                      sub={tardHrs > 0 ? `${tardHrs.toFixed(3)} hrs` : "—"}
                      value={
                        remainingTardiness > 0.0001
                          ? `− ${remainingTardiness.toFixed(3)} d`
                          : tardDays > 0
                            ? `− ${tardDays.toFixed(3)} d`
                            : "0.000 d"
                      }
                      valueColor={tardDays > 0 ? "#c62828" : T.faint}
                    />
                  )}
                  {(totalTardPostedLeave > 0 || postedTardinessCtoDays > 0) && (
                    <R
                      label={`Posted (${existingTardinessDeductions[0]?.earn_status || existingCtoTardinessDeductions[0]?.earn_status || "pending"})`}
                      value={`− ${totalTardPostedLeaveAndCto.toFixed(3)} d`}
                      valueColor="#2e7d32"
                      faded
                    />
                  )}
                </LedgerShell>
              </Box>
            </Box>
          </Box>
        )}

        <Box
          sx={{
            borderRadius: 1.5,
            border: "1px solid rgba(0,0,0,0.1)",
            bgcolor: "#fff",
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
            <StepNum n={2} />
            <Box>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 500, color: T.text, fontFamily: T.poppins }}>
                Approve for deduction — charge absences & tardiness to which account?
              </Typography>
              <Typography sx={{ fontSize: "0.6875rem", color: T.muted, fontFamily: T.poppins, mt: 0.12, lineHeight: 1.45 }}>
                Step 1 shows the <strong>absence offset (SC / CTO)</strong> and{" "}
                <strong>{tardinessOffsetTitle}</strong>{" "}
                preview. Here, pick where each amount should post. New rows typically need an{" "}
                <strong>approve for deduction</strong> action in Service Credit / CTO / leave earnings before balances
                finalize. <strong>Salary Deduction</strong> records salary shortfall (payroll / attendance audit). If you
                include <strong>both</strong> in one run, <strong>absences apply first</strong>, then tardiness. Leave a
                dropdown on <strong>Select...</strong> to skip that side for this run.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ px: 1.6, py: 1.25 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1,
              }}
            >
              {absentDays > 0 &&
              !absenceCoveredBySC &&
              !absenceFullyDeducted &&
              remainingAbsenceForSalaryApply > 1e-5 &&
              !(absencePending || absenceApproved) ? (
                <Box
                  sx={{
                    borderRadius: 1.25,
                    border: "0.5px solid rgba(0,0,0,0.1)",
                    p: "9px 10px",
                  }}
                >
                <FormControl fullWidth size="small">
                  <InputLabel id="cto-absence-deduction-src">Absences charged to</InputLabel>
                  <Select
                    labelId="cto-absence-deduction-src"
                    label="Absences charged to"
                    value={absenceSource}
                    onChange={(e) => setAbsenceSource(e.target.value)}
                    disabled={deductionOptionsLoading || absenceOptionsUi.length === 0}
                    sx={{ fontSize: "0.8rem", borderRadius: 1, bgcolor: "#fff" }}
                  >
                    {absenceOptionsUi.map((o) => {
                      if (o.value === DEDUCTION_SKIP_VALUE) {
                        return (
                          <MenuItem key={o.value} value={o.value}>
                            <Typography sx={{ fontSize: "0.78rem", fontFamily: T.poppins, color: T.muted }}>
                              {o.label}
                            </Typography>
                          </MenuItem>
                        );
                      }
                      const codeU = String(o.value || "").toUpperCase();
                      const bal = getDeductionSourceBalanceDays(o.value, deductionCreditCtxAbsence);
                      const rowOk = isDeductionSourceSufficient(bal, remainingAbsence, o.value);
                      const hasBalance = codeU !== "SALARY_DEDUCTION" && (bal ?? 0) > 1e-6;
                      const balColor =
                        codeU === "SALARY_DEDUCTION"
                          ? T.balOk
                          : balLoading
                            ? T.muted
                            : rowOk || hasBalance
                              ? T.balOk
                              : T.balBad;
                      return (
                        <MenuItem key={o.value} value={o.value}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 1,
                              width: "100%",
                              pr: 0.5,
                            }}
                          >
                            <Typography sx={{ fontSize: "0.78rem", fontFamily: T.poppins, flex: 1, minWidth: 0 }}>
                              {o.label}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                color: balColor,
                                fontFamily: T.poppins,
                                flexShrink: 0,
                              }}
                            >
                              {codeU === "SALARY_DEDUCTION"
                                ? "—"
                                : balLoading
                                  ? "…"
                                  : `${(bal ?? 0).toFixed(3)} d`}
                            </Typography>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                </Box>
              ) : (
                <Box
                  sx={{
                    border: "1px dashed rgba(0,0,0,0.12)",
                    borderRadius: 1.25,
                    p: 1.25,
                    bgcolor: "rgba(0,0,0,0.02)",
                  }}
                >
                  <Typography sx={{ fontSize: "0.65rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.45 }}>
                    {absentDays <= 1e-9
                      ? NO_ABSENCES_RECORDED_MESSAGE
                      : "No absence charge needed — already covered, not applicable, or awaiting approval."}
                  </Typography>
                </Box>
              )}

              {tardDays > 0.0001 && !tardinessFullyDeducted ? (
                <Box
                  sx={{
                    borderRadius: 1.25,
                    border: "0.5px solid rgba(0,0,0,0.1)",
                    p: "9px 10px",
                  }}
                >
                <FormControl fullWidth size="small">
                  <InputLabel id="cto-tardiness-deduction-src">Tardiness charged to</InputLabel>
                  <Select
                    labelId="cto-tardiness-deduction-src"
                    label="Tardiness charged to"
                    value={tardinessSource}
                    onChange={(e) => setTardinessSource(e.target.value)}
                    disabled={
                      deductionOptionsLoading ||
                      tardinessOptionsUi.length === 0 ||
                      remainingTardiness <= 0.0001 ||
                      tardinessPending ||
                      tardinessApproved
                    }
                    sx={{ fontSize: "0.8rem", borderRadius: 1, bgcolor: "#fff" }}
                  >
                    {tardinessOptionsUi.map((o) => {
                      if (o.value === DEDUCTION_SKIP_VALUE) {
                        return (
                          <MenuItem key={o.value} value={o.value}>
                            <Typography sx={{ fontSize: "0.78rem", fontFamily: T.poppins, color: T.muted }}>
                              {o.label}
                            </Typography>
                          </MenuItem>
                        );
                      }
                      const codeU = String(o.value || "").toUpperCase();
                      const bal = getDeductionSourceBalanceDays(o.value, deductionCreditCtxTardiness);
                      const rowOk = isDeductionSourceSufficient(bal, remainingTardiness, o.value);
                      const hasBalance = codeU !== "SALARY_DEDUCTION" && (bal ?? 0) > 1e-6;
                      const balColor =
                        codeU === "SALARY_DEDUCTION"
                          ? T.balOk
                          : balLoading
                            ? T.muted
                            : rowOk || hasBalance
                              ? T.balOk
                              : T.balBad;
                      return (
                        <MenuItem key={o.value} value={o.value}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 1,
                              width: "100%",
                              pr: 0.5,
                            }}
                          >
                            <Typography sx={{ fontSize: "0.78rem", fontFamily: T.poppins, flex: 1, minWidth: 0 }}>
                              {o.label}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                color: balColor,
                                fontFamily: T.poppins,
                                flexShrink: 0,
                              }}
                            >
                              {codeU === "SALARY_DEDUCTION"
                                ? "—"
                                : balLoading
                                  ? "…"
                                  : `${(bal ?? 0).toFixed(3)} d`}
                            </Typography>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                </Box>
              ) : (
                <Box
                  sx={{
                    border: "1px dashed rgba(0,0,0,0.12)",
                    borderRadius: 1.25,
                    p: 1.25,
                    bgcolor: "rgba(0,0,0,0.02)",
                  }}
                >
                  <Typography sx={{ fontSize: "0.65rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.45 }}>
                    No tardiness charge needed — no tardiness, already posted, or awaiting approval.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {(absenceCreditSelectedButBlocked || tardinessCreditSelectedButBlocked) && !bothDone && (
          <Alert severity="info" sx={{ py: 0.5, fontSize: "0.65rem", borderRadius: 1.25 }}>
            The selected leave or credit has <strong>no usable balance</strong> for this amount. Credits cannot be
            posted at zero balance — use <strong>Salary Deduction</strong> in step 2, or <strong>Deduct from salary</strong>{" "}
            below to record salary shortfall only (same path as Salary Deduction; syncs to payroll / attendance audit).
          </Alert>
        )}

        {(tardinessPending || tardinessApproved) && tardDays > 0 && !tardinessFullyDeducted && (
          <Alert severity={tardinessApproved ? "success" : "warning"} sx={{ py: 0.35, fontSize: "0.65rem" }}>
            Tardiness deduction is already {tardinessApproved ? "approved" : "pending"}.
          </Alert>
        )}
        {(absencePending || absenceApproved || scPending || scApproved) &&
          absentDays > 0 &&
          !absenceCoveredBySC &&
          !absenceFullyDeducted &&
          remainingAbsence > 0 && (
            <Alert severity={absenceApproved || scApproved ? "success" : "warning"} sx={{ py: 0.35, fontSize: "0.65rem" }}>
              Absence deduction is already {absenceApproved || scApproved ? "approved" : "pending"}.
            </Alert>
          )}

        {halfDayRows.length > 0 && typeof onDeductHalfDayVLRequested === "function" && (
          <Box
            sx={{
              borderRadius: 1.5,
              border:
                halfDayPendingCount === 0
                  ? "1px solid rgba(46, 125, 50, 0.45)"
                  : "1px solid rgba(0,0,0,0.1)",
              bgcolor: "#fff",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: 1.6,
                py: 1,
                bgcolor:
                  halfDayPendingCount === 0 ? "rgba(46, 125, 50, 0.07)" : "rgba(0,0,0,0.03)",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <StepNum n={3} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 500, color: T.text, fontFamily: T.poppins }}>
                    Half-day deductions
                  </Typography>
                  <Typography sx={{ fontSize: "0.6875rem", color: T.muted, fontFamily: T.poppins, mt: 0.12 }}>
                    {halfDayPendingCount > 0
                      ? "Dates with a detected half day — use Deduct from VL when ready"
                      : "All listed half days have a recorded deduction for this period"}
                  </Typography>
                </Box>
              </Box>
              <Chip
                size="small"
                label={
                  halfDayPendingCount > 0
                    ? `${halfDayPendingCount} pending`
                    : `${halfDayRows.length} applied`
                }
                sx={{
                  height: 22,
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  bgcolor: halfDayPendingCount > 0 ? "#FCEBEB" : "rgba(46, 125, 50, 0.14)",
                  color: halfDayPendingCount > 0 ? "#791F1F" : "#1b5e20",
                  border: "none",
                }}
              />
            </Box>
            <Box sx={{ px: 1.6, py: 1.25 }}>
              {halfDayRows.map((d) => {
                const isDeducted = halfDayDeductedSet.has(d);
                return (
                  <Box
                    key={d}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      flexWrap: "wrap",
                      py: "9px",
                      px: "11px",
                      mb: 1,
                      border: isDeducted
                        ? "1.5px solid rgba(46, 125, 50, 0.38)"
                        : "0.5px solid rgba(0,0,0,0.1)",
                      borderRadius: 1.25,
                      bgcolor: isDeducted ? "rgba(46, 125, 50, 0.07)" : "transparent",
                      "&:last-of-type": { mb: 0 },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          bgcolor: isDeducted ? "#2e7d32" : "#E24B4A",
                          flexShrink: 0,
                          mt: "5px",
                        }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, fontFamily: T.poppins, color: T.text }}>
                          {formatHalfDayHeading(d)}
                        </Typography>
                        {!isDeducted && (
                          <Typography sx={{ fontSize: "0.6875rem", color: T.muted, fontFamily: T.poppins, mt: 0.12 }}>
                            Half day detected · deduction not yet applied
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {isDeducted ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          py: 0.35,
                          px: 1,
                          borderRadius: 1.25,
                          bgcolor: "rgba(46, 125, 50, 0.12)",
                          border: "1px solid rgba(46, 125, 50, 0.35)",
                          flexShrink: 0,
                        }}
                      >
                        <CheckIcon sx={{ fontSize: 16, color: "#2e7d32" }} />
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#1b5e20",
                            fontFamily: T.poppins,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Successfully deducted
                        </Typography>
                      </Box>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => onDeductHalfDayVLRequested(d)}
                        sx={{
                          textTransform: "none",
                          fontWeight: 500,
                          fontSize: "0.75rem",
                          py: 0.5,
                          px: 1.1,
                          borderRadius: 1.25,
                          borderColor: "rgba(240,149,149,0.9)",
                          color: "#791F1F",
                          bgcolor: "#FCEBEB",
                          "&:hover": { borderColor: "#E24B4A", bgcolor: "#FCE5E5" },
                        }}
                      >
                        Deduct from VL
                      </Button>
                    )}
                  </Box>
                );
              })}
              <Typography sx={{ fontSize: "0.69rem", color: T.muted, fontFamily: T.poppins, mt: 1, lineHeight: 1.45 }}>
                Deducting permanently reduces this employee&apos;s leave balance for the chosen source and cannot be undone
                without a manual adjustment.
              </Typography>
            </Box>
          </Box>
        )}

        {(newCtoBalance < 0 || newVlBalance < 0) && (
          <Box sx={{ px: 1, py: 0.75, borderRadius: 1.25, bgcolor: "rgba(198,40,40,0.06)", border: "1px solid rgba(198,40,40,0.22)" }}>
            <Typography sx={{ fontSize: "0.62rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.55 }}>
              <strong style={{ color: "#c62828" }}>Note:</strong> Negative balance will be directly deducted from salary.
            </Typography>
          </Box>
        )}

        {deductError && (
          <Alert severity="error" sx={{ py: 0.5, fontSize: "0.65rem", borderRadius: 1 }}>
            {deductError}
          </Alert>
        )}

        {bothDone && !deductSuccess && (
          <Box sx={{ px: 1, py: 0.75, borderRadius: 1.25, bgcolor: "rgba(46,125,50,0.07)", border: "1px solid rgba(46,125,50,0.2)" }}>
            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#1b5e20", fontFamily: T.poppins }}>
              All absence and tardiness deductions are applied for this period.
            </Typography>
          </Box>
        )}

        {(() => {
          const lockedAbsence = absencePending || absenceApproved || scPending || scApproved;
          const lockedTardiness = tardinessPending || tardinessApproved;
          const canApply =
            !bothDone &&
            (((willApplyAbsence && !lockedAbsence) || (willApplyTardiness && !lockedTardiness)) ||
              ((willApplyAbsenceToSalary && !lockedAbsence) || (willApplyTardinessToSalary && !lockedTardiness)) ||
              (showScWarningButtons && (policySelection === "sc" || policySelection === "cto") && !lockedAbsence));
          if (!showDeductFromSalaryButton && !canApply) return null;
          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {showDeductFromSalaryButton && (
                <Button
                  fullWidth
                  variant="outlined"
                  size="medium"
                  onClick={() => {
                    setSalaryOnlyModalError("");
                    setSalaryOnlyModalOpen(true);
                  }}
                  startIcon={<MoneyOffIcon sx={{ fontSize: "18px !important" }} />}
                  sx={{
                    py: 1.05,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    textTransform: "none",
                    fontFamily: T.poppins,
                    borderRadius: 1.25,
                    borderColor: T.accent,
                    color: T.accent,
                    borderWidth: 1.5,
                    "&:hover": { borderColor: T.accentDark, bgcolor: "rgba(109,35,35,0.06)" },
                  }}
                >
                  Deduct from salary
                </Button>
              )}
              {canApply && (
                <Button
                  fullWidth
                  variant="contained"
                  size="medium"
                  onClick={() => {
                    if (showScWarningButtons && (policySelection === "sc" || policySelection === "cto"))
                      openConfirm(policySelection);
                    else openConfirm("normal");
                  }}
                  startIcon={<DeductIcon sx={{ fontSize: "18px !important" }} />}
                  sx={{
                    py: 1.1,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    textTransform: "none",
                    fontFamily: T.poppins,
                    borderRadius: 1.25,
                    bgcolor: T.accent,
                    color: "#fff",
                    boxShadow: "none",
                    "&:hover": { bgcolor: T.accentDark, boxShadow: "none" },
                  }}
                >
                  {applyIsSalaryOnly ? "Apply Deduction to Salary" : "Apply all deductions"}
                </Button>
              )}
            </Box>
          );
        })()}
      </Box>
 
      {/* ══════════════════════════════════════════════════════════════
          CONFIRMATION MODAL — styled, color-coded per source
      ══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={confirmOpen}
        onClose={() => !deducting && closeConfirm()}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "100%",
            maxWidth: 400,
            borderRadius: "16px",
            overflow: "hidden",
            border: "0.5px solid rgba(0,0,0,0.09)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            pt: 2.5,
            pb: 2,
            background: T.accent,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 100,
              height: 100,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.06)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -20,
              left: 60,
              width: 70,
              height: 70,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.04)",
              pointerEvents: "none",
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, position: "relative", zIndex: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.69rem",
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 400,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: T.poppins,
                  mb: 0.25,
                }}
              >
                Earnings deduction
              </Typography>
              <Typography
                sx={{
                  fontFamily: T.poppins,
                  fontWeight: 500,
                  fontSize: "1.0625rem",
                  color: "#fff",
                  lineHeight: 1.2,
                }}
              >
                Confirm transaction
              </Typography>
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={closeConfirm}
            disabled={deducting}
            sx={{
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.12)",
              borderRadius: 1,
              p: 0.5,
              position: "relative",
              zIndex: 1,
              "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
            }}
          >
            <Close sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          <Box
            sx={{
              px: 2.5,
              pt: 2,
              pb: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.75,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                bgcolor: "rgba(0,0,0,0.04)",
                borderRadius: "10px",
                px: 1.5,
                py: 1.25,
              }}
            >
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: T.accent,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  fontFamily: T.poppins,
                  flexShrink: 0,
                }}
              >
                {(employee?.fullName || employee?.employeeNumber || "Employee")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0]?.toUpperCase())
                  .join("")}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: T.text,
                    fontFamily: T.poppins,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {employee?.fullName || employee?.employeeNumber || "Employee"}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: T.faint,
                    fontFamily: T.poppins,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  #{employee?.employeeNumber || "—"}
                  {empCatDisplay ? ` · ${empCatDisplay}` : ""}
                </Typography>
              </Box>

              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Typography
                  sx={{
                    fontSize: "0.69rem",
                    color: T.faint,
                    fontFamily: T.poppins,
                    mb: 0.25,
                  }}
                >
                  Period
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: T.text,
                    fontFamily: T.poppins,
                    lineHeight: 1.1,
                  }}
                >
                  {monthName(month)} {year}
                </Typography>
              </Box>
            </Box>

            {deductSource === "normal" &&
              (() => {
                const showOrder = willApplyAbsence && willApplyTardiness;
                const showSalaryNote =
                  String(absenceSource || "").toUpperCase() === "SALARY_DEDUCTION" ||
                  String(tardinessSource || "").toUpperCase() === "SALARY_DEDUCTION";
                if (!showOrder && !showSalaryNote) return null;
                return (
                  <Alert
                    severity="info"
                    icon={false}
                    sx={{
                      py: 0.65,
                      px: 1.15,
                      borderRadius: "10px",
                      bgcolor: "rgba(25,118,210,0.06)",
                      border: "1px solid rgba(25,118,210,0.2)",
                      "& .MuiAlert-message": { width: "100%", padding: 0 },
                    }}
                  >
                    <Typography sx={{ fontSize: "0.68rem", fontFamily: T.poppins, lineHeight: 1.55, color: T.text }}>
                      {showOrder && (
                        <>
                          <strong>Order:</strong> absences are deducted first, then tardiness.
                          {showSalaryNote ? <br /> : null}
                        </>
                      )}
                      {showSalaryNote && (
                        <>
                          <strong>Salary deduction</strong> is saved to salary recovery (shortfall), the transaction log,
                          and earnings audit — the same trail as half-day salary.
                        </>
                      )}
                    </Typography>
                  </Alert>
                );
              })()}

            {/* Policy notes */}
            {deductSource === "cto" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 0.8,
                  px: 1.25,
                  py: 1,
                  borderRadius: "10px",
                  bgcolor: "rgba(255,152,0,0.08)",
                  border: "1px solid rgba(255,152,0,0.3)",
                }}
              >
                <WarnIcon sx={{ fontSize: 15, color: "#e65100", flexShrink: 0, mt: "1px" }} />
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: "#bf360c",
                    fontFamily: T.poppins,
                    fontWeight: 700,
                    lineHeight: 1.55,
                  }}
                >
                  <strong>Policy override:</strong> SC balance of <strong>{scBuffer.toFixed(3)}d</strong>{" "}
                  has not been depleted. Proceeding will deduct from CTO instead.
                </Typography>
              </Box>
            )}

            {deductSource === "sc" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 0.8,
                  px: 1.25,
                  py: 1,
                  borderRadius: "10px",
                  bgcolor: "rgba(109,35,35,0.06)",
                  border: "1px solid rgba(109,35,35,0.18)",
                }}
              >
                <PolicyIcon sx={{ fontSize: 15, color: T.accent, flexShrink: 0, mt: "1px" }} />
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: T.accentDark,
                    fontFamily: T.poppins,
                    fontWeight: 700,
                    lineHeight: 1.55,
                  }}
                >
                  Following SC-first policy. This will deduct from your SC balance before using CTO.
                </Typography>
              </Box>
            )}

            {/* Transaction slip — reference: deduction_transaction_slip_modal */}
            <Box
              sx={{
                bgcolor: "rgba(0,0,0,0.04)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.69rem",
                    fontWeight: 500,
                    color: T.faint,
                    fontFamily: T.poppins,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Transaction summary
                </Typography>
              </Box>
              {(confirmTransactionLines.length
                ? confirmTransactionLines
                : [
                    {
                      key: "fallback",
                      title: "Deduction",
                      sub: modalBreakdownPrimaryLabel,
                      amount: confirmSlipTotalDays,
                    },
                  ]
              ).map((line, idx, arr) => (
                <Box
                  key={line.key}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderBottom: idx < arr.length - 1 ? "0.5px solid rgba(0,0,0,0.08)" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        color: T.text,
                        fontFamily: T.poppins,
                      }}
                    >
                      {line.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.69rem",
                        color: T.faint,
                        fontFamily: T.poppins,
                        mt: 0.125,
                        lineHeight: 1.4,
                      }}
                    >
                      {line.sub}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#c62828",
                      fontFamily: T.poppins,
                      flexShrink: 0,
                    }}
                  >
                    −{Number(line.amount || 0).toFixed(3)} d
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                bgcolor: T.accent,
                borderRadius: "10px",
                px: 1.75,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.69rem",
                    color: "rgba(255,255,255,0.65)",
                    fontFamily: T.poppins,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    mb: 0.375,
                  }}
                >
                  Total deduction
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.69rem",
                    color: "rgba(255,255,255,0.55)",
                    fontFamily: T.poppins,
                  }}
                >
                  {confirmSlipTotalDays.toFixed(3)} days · {confirmSlipTotalHrs.toFixed(3)} hrs
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: "1.375rem",
                  fontWeight: 500,
                  color: "#fff",
                  fontFamily: T.poppins,
                }}
              >
                {confirmSlipTotalDays.toFixed(3)} d
              </Typography>
            </Box>

            {confirmModalBalanceTiles.length > 0 && (
              <Box
                sx={{
                  bgcolor: "rgba(0,0,0,0.04)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ px: 1.5, py: 1, borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
                  <Typography
                    sx={{
                      fontSize: "0.69rem",
                      fontWeight: 500,
                      color: T.faint,
                      fontFamily: T.poppins,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    Balance preview
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      confirmModalBalanceTiles.length > 1 ? "1fr 1fr" : "1fr",
                  }}
                >
                  {confirmModalBalanceTiles.map((tile, i) => (
                    <Box
                      key={tile.key}
                      sx={{
                        p: 1.25,
                        borderRight:
                          confirmModalBalanceTiles.length > 1 && i === 0
                            ? "0.5px solid rgba(0,0,0,0.08)"
                            : "none",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.69rem",
                          color: T.faint,
                          fontFamily: T.poppins,
                          mb: 0.5,
                        }}
                      >
                        {tile.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.9375rem",
                          fontWeight: 500,
                          color: T.text,
                          fontFamily: T.poppins,
                        }}
                      >
                        {tile.before.toFixed(3)} d
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.69rem",
                          color: T.faint,
                          fontFamily: T.poppins,
                          mt: 0.125,
                        }}
                      >
                        {tile.delta.toFixed(3)} d
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.65 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: slipAfterDotColor(tile.after),
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: slipAfterTextColor(tile.after),
                            fontFamily: T.poppins,
                          }}
                        >
                          {tile.after.toFixed(3)} d after
                        </Typography>
                      </Box>
                      {tile.after < 0 && (
                        <Typography
                          sx={{
                            fontSize: "0.65rem",
                            color: "#c62828",
                            fontFamily: T.poppins,
                            fontWeight: 600,
                            mt: 0.5,
                          }}
                        >
                          Shortfall → salary deduction
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <Box
              sx={{
                bgcolor: "#FAEEDA",
                borderRadius: "8px",
                px: 1.5,
                py: 1.25,
                border: "0.5px solid #FAC775",
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
              }}
            >
              <InfoOutlinedIcon
                sx={{ fontSize: 16, color: "#633806", flexShrink: 0, mt: "2px" }}
              />
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "#633806",
                  fontFamily: T.poppins,
                  lineHeight: 1.5,
                }}
              >
                This posts to SC / CTO / leave earnings and requires approval before balances finalize.
              </Typography>
            </Box>

            {/* Remark (optional) */}
            <Box>
              <Typography
                sx={{
                  fontSize: "0.58rem",
                  fontWeight: 800,
                  color: T.muted,
                  fontFamily: T.poppins,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  mb: 0.5,
                }}
              >
                Remark{" "}
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  (optional)
                </span>
              </Typography>
              <TextField
                multiline
                rows={2}
                fullWidth
                placeholder="Add a note for this deduction…"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                disabled={deducting}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    fontSize: "0.78rem",
                    fontFamily: T.poppins,
                    bgcolor: "#fff",
                    "& fieldset": { borderColor: "rgba(0,0,0,0.12)" },
                    "&:hover fieldset": { borderColor: T.accent },
                    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
                  },
                }}
              />
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={confirmDeductionAcknowledged}
                  onChange={(e) => setConfirmDeductionAcknowledged(e.target.checked)}
                  disabled={deducting}
                  sx={{ py: 0, color: T.accent, "&.Mui-checked": { color: T.accent } }}
                />
              }
              label={
                <Typography sx={{ fontSize: "0.75rem", fontFamily: T.poppins, color: T.faint, lineHeight: 1.5 }}>
                  I confirm the deduction source, amounts, and balances shown are correct.
                </Typography>
              }
              sx={{ alignItems: "flex-start", ml: 0, mr: 0, mb: 0 }}
            />

            {deductError && (
              <Alert
                severity="error"
                sx={{
                  mt: 0.2,
                  py: 0.25,
                  fontSize: "0.68rem",
                  borderRadius: 1.5,
                }}
              >
                {deductError}
              </Alert>
            )}
          </Box>
        </DialogContent>

        {/* ── Footer ── */}
        <DialogActions
          sx={{
            display: "flex",
            justifyContent: "stretch",
            gap: 1,
            px: 2.5,
            pt: 0,
            pb: 2.5,
            borderTop: "none",
            bgcolor: "transparent",
          }}
        >
          <Button
            size="medium"
            onClick={closeConfirm}
            disabled={deducting}
            sx={{
              flex: 1,
              fontSize: "0.8125rem",
              fontWeight: 500,
              textTransform: "none",
              fontFamily: T.poppins,
              color: T.text,
              borderRadius: "8px",
              py: 1.25,
              border: "0.5px solid rgba(0,0,0,0.12)",
              bgcolor: "transparent",
            }}
          >
            Cancel
          </Button>
          <Button
            size="medium"
            variant="contained"
            onClick={handleDeduct}
            disabled={deducting || !confirmDeductionAcknowledged}
            disableElevation
            startIcon={
              deducting ? <CircularProgress size={11} sx={{ color: "#fff" }} /> : <SaveIcon sx={{ fontSize: "13px !important" }} />
            }
            sx={{
              flex: 2,
              fontSize: "0.8125rem",
              fontWeight: 500,
              textTransform: "none",
              fontFamily: T.poppins,
              bgcolor: T.accent,
              borderRadius: "8px",
              py: 1.25,
              boxShadow: "none",
              "&:hover": { bgcolor: T.accentDark, boxShadow: "none" },
              "&.Mui-disabled": { bgcolor: "rgba(109,35,35,0.4)", color: "#fff" },
            }}
          >
            {deducting
              ? "Processing…"
              : deductSource === "normal" && applyIsSalaryOnly
                ? "Apply Deduction to Salary"
                : "Confirm deduction"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={salaryOnlyModalOpen}
        onClose={() => !salaryOnlySubmitting && setSalaryOnlyModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.2)" },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.75,
            background: T.headerGrad,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MoneyOffIcon sx={{ fontSize: 16, color: "#fff" }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: T.poppins,
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  color: "#fff",
                  lineHeight: 1.2,
                }}
              >
                Deduct from salary
              </Typography>
              <Typography
                sx={{
                  fontFamily: T.poppins,
                  fontSize: "0.62rem",
                  color: "rgba(255,255,255,0.7)",
                  mt: 0.25,
                }}
              >
                {monthName(month)} {year}
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => !salaryOnlySubmitting && setSalaryOnlyModalOpen(false)}
            disabled={salaryOnlySubmitting}
            sx={{
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.12)",
              borderRadius: 1,
              p: 0.5,
              "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
            }}
          >
            <Close sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 2, py: 1.75, display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                bgcolor: "rgba(0,0,0,0.03)",
                borderRadius: 1.75,
                border: "0.5px solid rgba(0,0,0,0.09)",
                px: 1.5,
                py: 1,
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: T.accent,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  fontFamily: T.poppins,
                  flexShrink: 0,
                }}
              >
                {(employee?.fullName || employee?.employeeNumber || "Employee")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0]?.toUpperCase())
                  .join("")}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    color: T.text,
                    fontFamily: T.poppins,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {employee?.fullName || employee?.employeeNumber || "Employee"}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.62rem",
                    color: T.faint,
                    fontFamily: T.poppins,
                  }}
                >
                  {employee?.employeeNumber || "—"}
                  {empCatDisplay ? ` · ${empCatDisplay}` : ""}
                </Typography>
              </Box>
            </Box>

            <Typography sx={{ fontSize: "0.7rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.5 }}>
              This posts to <strong>salary shortfall</strong> (attendance / payroll audit). No Service Credit, CTO, or
              leave balance will be reduced.
            </Typography>

            <Box
              sx={{
                borderRadius: 1.5,
                border: "0.5px solid rgba(0,0,0,0.1)",
                overflow: "hidden",
                bgcolor: "#fff",
              }}
            >
              <Box sx={{ px: 1.25, py: 0.65, bgcolor: "rgba(109,35,35,0.06)", borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
                <Typography
                  sx={{
                    fontSize: "0.58rem",
                    fontWeight: 800,
                    color: alpha(T.accent, 0.85),
                    fontFamily: T.poppins,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Summary — charge to salary
                </Typography>
              </Box>
              <Box sx={{ px: 1.25, py: 1 }}>
                {salaryModalAbsenceDays > 1e-5 && (
                  <R
                    label="Absence (salary days)"
                    sub="ATTENDANCE_SALARY_DEDUCTION"
                    value={`${salaryModalAbsenceDays.toFixed(3)} d`}
                    valueColor="#c62828"
                    bold
                  />
                )}
                {salaryModalTardinessDays > 1e-5 && (
                  <R
                    label="Tardiness (salary days)"
                    sub="TARDINESS_SALARY_DEDUCTION"
                    value={`${salaryModalTardinessDays.toFixed(3)} d`}
                    valueColor="#c62828"
                    bold
                  />
                )}
                <Divider sx={{ my: 1, borderColor: "rgba(0,0,0,0.08)" }} />
                <R
                  label="Total (8h-equivalent days)"
                  sub={`${salaryModalTotalHrs.toFixed(3)} hours`}
                  value={`${salaryModalTotalDays.toFixed(3)} d`}
                  valueColor={T.accent}
                  bold
                />
              </Box>
            </Box>

            {salaryOnlyModalError && (
              <Alert severity="error" sx={{ py: 0.5, fontSize: "0.65rem", borderRadius: 1.25 }}>
                {salaryOnlyModalError}
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            px: 2,
            py: 1.25,
            borderTop: `1px solid ${T.divider}`,
            bgcolor: "rgba(0,0,0,0.02)",
          }}
        >
          <Button
            size="small"
            onClick={() => !salaryOnlySubmitting && setSalaryOnlyModalOpen(false)}
            disabled={salaryOnlySubmitting}
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "none",
              fontFamily: T.poppins,
              color: T.muted,
              borderRadius: 1.25,
              px: 1.5,
              border: "0.5px solid rgba(0,0,0,0.15)",
            }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSalaryShortcutConfirm}
            disabled={salaryOnlySubmitting || salaryModalTotalDays <= 1e-5}
            startIcon={
              salaryOnlySubmitting ? (
                <CircularProgress size={11} sx={{ color: "#fff" }} />
              ) : (
                <SaveIcon sx={{ fontSize: "13px !important" }} />
              )
            }
            sx={{
              fontSize: "0.72rem",
              fontWeight: 900,
              textTransform: "none",
              fontFamily: T.poppins,
              bgcolor: T.accent,
              borderRadius: 1.25,
              px: 1.75,
              boxShadow: "none",
              "&:hover": { bgcolor: T.accentDark, boxShadow: "none" },
              "&.Mui-disabled": { bgcolor: "rgba(109,35,35,0.4)", color: "#fff" },
            }}
          >
            {salaryOnlySubmitting ? "Recording…" : "Confirm salary deduction"}
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
  onDeductHalfDayVLRequested,
  halfDayDeductDate,
  halfDayPendingDates,
  deductedVlHalfDates,
  metricsTardinessHrs,
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
      onDeductHalfDayVLRequested={onDeductHalfDayVLRequested}
      halfDayDeductDate={halfDayDeductDate}
      halfDayPendingDates={halfDayPendingDates}
      deductedVlHalfDates={deductedVlHalfDates}
      metricsTardinessHrs={metricsTardinessHrs}
    />
  );
};

export { CTODeductionReceipt, DeductionReceiptSwitcher };
