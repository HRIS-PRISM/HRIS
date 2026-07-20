import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import { isScEarningVoided } from "../serviceCreditBalanceUtils";
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
} from "@mui/icons-material";
import { useOfficialAttendanceMetrics } from "./useOfficialAttendanceMetrics";

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

  const fetchBalance = useCallback(async (opts) => {
    const silent = opts?.silent === true;
    if (!employee) {
      setScBalance(null);
      return;
    }
    if (!silent) setBalLoading(true);
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
      if (!silent) setBalLoading(false);
    }
  }, [employee]);
  const fetchExistingDeductions = useCallback(async (opts) => {
    const silent = opts?.silent === true;
    if (!employee) {
      setExistingDeductions([]);
      return;
    }
    if (!silent) setDeductionsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const r = await axios.get(
        `${API_BASE_URL}/api/earnings/sc/${employee.employeeNumber}?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const all = r.data?.earnings || [];
      const ledger = r.data?.ledger_sc_deductions || [];
      setExistingDeductions([
        ...all.filter(
          (e) =>
            e.entry_type === "DEDUCTION" &&
            e.earn_status !== "rejected" &&
            !isScEarningVoided(e),
        ),
        ...ledger,
      ]);
    } catch {
      setExistingDeductions([]);
    } finally {
      if (!silent) setDeductionsLoading(false);
    }
  }, [employee, year, month]);

  useEffect(() => {
    fetchBalance({ silent: false });
    fetchExistingDeductions({ silent: false });
  }, [fetchBalance, fetchExistingDeductions, employee, year, month]);

  useEffect(() => {
    if (refreshKey === 0 || !employee) return;
    fetchBalance({ silent: true });
    fetchExistingDeductions({ silent: true });
  }, [refreshKey, employee, fetchBalance, fetchExistingDeductions]);

  const officialStart = attendanceData?.summary?.startDate || attendanceData?.period?.start;
  const officialEnd = attendanceData?.summary?.endDate || attendanceData?.period?.end;
  const { absentDays: absentDaysOfficial, lateHrs: lateHrsOfficial } =
    useOfficialAttendanceMetrics({
      employeeNumber: employee?.employeeNumber,
      startDate: officialStart,
      endDate: officialEnd,
    });

  const absentDays = absentDaysOfficial || toNum(attendanceData?.stats?.absent_days);

  // Total to deduct: absences (in days) + late-only deficit (converted to days)
  const tardHrs = lateHrsOfficial > 0 ? lateHrsOfficial : (() => {
    const tardHrsRaw = attendanceData?.summary
      ? parseHHMM(attendanceData.summary.overallRenderedOfficialTimeTardiness)
      : 0;
    return Math.max(0, tardHrsRaw - absentDays * 8);
  })();
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
          {isLoading && <CircularProgress size={10} sx={{ color: T.accent }} />}
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
              <Typography
                sx={{
                  fontSize: "0.63rem",
                  fontWeight: 700,
                  color: "#7a4a00",
                  fontFamily: T.poppins,
                }}
              >
                Partial: {alreadyDeductedDec.toFixed(3)}d already deducted —{" "}
                {remainingToDeductDec.toFixed(3)}d remaining
              </Typography>
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
                value={tardDays > 0 ? `− ${tardDays.toFixed(3)} d` : "0.000 d"}
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
                  sx={{ mb: 0.5, py: 0, fontSize: "0.65rem", borderRadius: 1 }}
                >
                  {deductError}
                </Alert>
              )}
              {deductSuccess && (
                <Alert
                  severity="success"
                  sx={{ mb: 0.5, py: 0, fontSize: "0.65rem", borderRadius: 1 }}
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
                startIcon={<DeductIcon sx={{ fontSize: "13px !important" }} />}
                sx={{
                  height: 30,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "none",
                  fontFamily: T.poppins,
                  borderRadius: 1.5,
                  bgcolor:
                    checked && remainingToDeductDec > 0 ? T.accent : "#c0c0c0",
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
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
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


export { SCDeductionReceipt };