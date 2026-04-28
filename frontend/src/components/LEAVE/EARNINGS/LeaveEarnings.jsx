import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import {
  getLeaveGenderRestriction,
  isLeaveAllowedForGender,
} from "../leaveGenderUtils";
import { DeptBadge, EmpCatBadge } from "./RecordsList";
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
  Male as MaleIcon,
  Female as FemaleIcon,
  Wc as GenderIcon,
  Warning as WarningIcon,
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

const GenderBadge = ({ gender }) => {
  if (!gender) return null;
  const isMale = String(gender).trim().toLowerCase() === "male";
  return (
    <Chip
      size="small"
      icon={
        isMale ? (
          <MaleIcon style={{ fontSize: 11, color: "#1565C0" }} />
        ) : (
          <FemaleIcon style={{ fontSize: 11, color: "#c2185b" }} />
        )
      }
      label={gender}
      sx={{
        height: 18,
        fontSize: "0.6rem",
        fontWeight: 800,
        letterSpacing: 0.3,
        bgcolor: isMale ? "rgba(21,101,192,0.08)" : "rgba(194,24,91,0.08)",
        color: isMale ? "#1565C0" : "#c2185b",
        border: `1px solid ${isMale ? "rgba(21,101,192,0.25)" : "rgba(194,24,91,0.25)"}`,
        borderRadius: "4px",
      }}
    />
  );
};

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

const SL_VL_AUTO_CODES = ["SL", "VL"];
const SL_VL_DEFAULT_HOURS = 1.25 * 8;

const LeaveInputColumn = ({
  employee,
  deptMap,
  empCatMap,
  unit,
  year,
  month,
  onRedirectMonth,
  onBalanceChanged,
  refreshKey: externalRefreshKey,
  onRecordsRefresh,
}) => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [assignmentMap, setAssignmentMap] = useState({});
  const [existingEarnedByCode, setExistingEarnedByCode] = useState({});
  const [earnedHours, setEarnedHours] = useState({});
  const [earnedDraft, setEarnedDraft] = useState({});
  const [userTouched, setUserTouched] = useState({});
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [periodClosed, setPeriodClosed] = useState(null); // { requestedMonth, suggestedMonth }
  const [refreshKey, setRefreshKey] = useState(0);
  const calDays = getCalendarDays(year, month);
  const employeeGender = employee?.sex || employee?.gender || null;

  const visibleLeaveTypes = useMemo(
    () =>
      leaveTypes.filter((lt) => isLeaveAllowedForGender(lt, employeeGender)),
    [leaveTypes, employeeGender],
  );

  const hiddenLeaveTypesForPrompt = useMemo(() => {
    return leaveTypes
      .filter((lt) => !isLeaveAllowedForGender(lt, employeeGender))
      .map((lt) => {
        const r = getLeaveGenderRestriction(lt);
        const who =
          r === "male"
            ? "Male employees only"
            : r === "female"
              ? "Female employees only"
              : "Gender restricted";
        return {
          code: lt.leave_code,
          description: (lt.leave_description || "").trim(),
          who,
          restriction: r,
        };
      });
  }, [leaveTypes, employeeGender]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/leaveRoute/leave_table`)
      .then((r) => setLeaveTypes(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!employee) {
      setAssignmentMap({});
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const r = await axios.get(
        `${API_BASE_URL}/api/earnings/assignment-balances/${employee.employeeNumber}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAssignmentMap(r.data || {});
    } catch {
      setAssignmentMap({});
    }
  }, [employee]);

  const fetchExistingEarned = useCallback(async () => {
    if (!employee) {
      setExistingEarnedByCode({});
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const r = await axios.get(
        `${API_BASE_URL}/api/earnings/leave/${employee.employeeNumber}?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const rows = Array.isArray(r.data?.earnings) ? r.data.earnings : [];
      const map = {};
      for (const e of rows) {
        if (!e?.leave_code) continue;
        const et = String(e.entry_type || "EARNED").toUpperCase();
        if (et !== "EARNED" && et !== "ADJUSTMENT") continue;
        if (e.earn_status === "rejected") continue;
        const code = String(e.leave_code).toUpperCase();
        const prev = map[code];
        if (e.earn_status === "approved") map[code] = "approved";
        else if (!prev) map[code] = e.earn_status || "pending";
      }
      setExistingEarnedByCode(map);
    } catch {
      setExistingEarnedByCode({});
    }
  }, [employee, year, month]);

  useEffect(() => {
    if (!employee) {
      setAssignmentMap({});
      setExistingEarnedByCode({});
      return;
    }
    fetchBalances();
    fetchExistingEarned();
  }, [employee, year, month, fetchBalances, fetchExistingEarned, refreshKey, externalRefreshKey]);

  useEffect(() => {
    if (!employee || visibleLeaveTypes.length === 0) {
      setEarnedHours({});
      setEarnedDraft({});
      setUserTouched({});
      setRemarks("");
      setError("");
      return;
    }
    const defaults = {};
    visibleLeaveTypes.forEach((lt) => {
      if (SL_VL_AUTO_CODES.includes(lt.leave_code))
        defaults[lt.leave_code] = SL_VL_DEFAULT_HOURS;
    });
    setEarnedHours(defaults);
    setEarnedDraft({});
    setUserTouched({});
    setRemarks("");
    setError("");
  }, [employee, year, month, visibleLeaveTypes]);

  const activeLeaves = useMemo(
    () =>
      visibleLeaveTypes.filter((lt) => {
        const hrs = toNum(earnedHours[lt.leave_code]);
        if (hrs <= 0) return false;
        const isAuto = SL_VL_AUTO_CODES.includes(lt.leave_code);
        const isTouched = !!userTouched[lt.leave_code];
        return isTouched || !isAuto;
      }),
    [visibleLeaveTypes, earnedHours, userTouched],
  );

  const autoDefaultCodes = useMemo(
    () =>
      visibleLeaveTypes
        .filter((lt) => SL_VL_AUTO_CODES.includes(lt.leave_code))
        .map((lt) => lt.leave_code),
    [visibleLeaveTypes],
  );

  const handleSave = async () => {
    if (!employee) {
      setError("Select an employee first");
      return;
    }
    if (!activeLeaves.length) {
      setError("Enter earned hours for at least one leave type");
      return;
    }
    setLoading(true);
    setError("");
    setPeriodClosed(null);
    const token = localStorage.getItem("token");
    let created = 0;
    for (const lt of activeLeaves) {
      const status = existingEarnedByCode[String(lt.leave_code).toUpperCase()];
      if (status === "approved" || status === "pending") continue;
      try {
        await axios.post(
          `${API_BASE_URL}/api/earnings/leave`,
          {
            employeeNumber: employee.employeeNumber,
            leave_code: lt.leave_code,
            earned_hours: toNum(earnedHours[lt.leave_code]),
            period_year: parseInt(year, 10) || new Date().getFullYear(),
            period_month: parseInt(month, 10),
            entry_type: "EARNED",
            remarks: remarks || null,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        created++;
      } catch (e) {
        const d = e?.response?.data;
        if (d?.code === "PERIOD_CLOSED") {
          setPeriodClosed({
            requestedMonth: d.requested_month,
            suggestedMonth: d.suggested_month,
          });
          setError(d.error || "This period is already closed.");
          break;
        }
      }
    }
    setLoading(false);
    if (created > 0) {
      setSuccess(
        `${created} leave earning(s) submitted for ${monthName(month)} ${year}.`,
      );
      const defaults = {};
      visibleLeaveTypes.forEach((lt) => {
        if (SL_VL_AUTO_CODES.includes(lt.leave_code))
          defaults[lt.leave_code] = SL_VL_DEFAULT_HOURS;
      });
      setEarnedHours(defaults);
      setEarnedDraft({});
      setUserTouched({});
      setRemarks("");
      setRefreshKey((k) => k + 1);
      if (onRecordsRefresh) onRecordsRefresh();
      setTimeout(() => setSuccess(""), 3500);
    } else {
      if (!periodClosed) {
        setError("All selected leave earnings are already submitted (pending/approved).");
      }
    }
  };

  const applyAsAdjustment = async () => {
    if (!employee || !periodClosed?.suggestedMonth) return;
    const token = localStorage.getItem("token");
    const fromLabel = monthName(periodClosed.requestedMonth);
    const toLabel = monthName(periodClosed.suggestedMonth);
    setLoading(true);
    setError("");
    try {
      let created = 0;
      for (const lt of activeLeaves) {
        const status = existingEarnedByCode[String(lt.leave_code).toUpperCase()];
        if (status === "approved" || status === "pending") continue;
        await axios.post(
          `${API_BASE_URL}/api/earnings/leave`,
          {
            employeeNumber: employee.employeeNumber,
            leave_code: lt.leave_code,
            earned_hours: toNum(earnedHours[lt.leave_code]),
            period_year: parseInt(year, 10) || new Date().getFullYear(),
            period_month: parseInt(periodClosed.suggestedMonth, 10),
            entry_type: "ADJUSTMENT",
            remarks: remarks
              ? `ADJUSTMENT (missed ${fromLabel}) • ${remarks}`
              : `ADJUSTMENT (missed ${fromLabel}) • posted to ${toLabel}`,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        created++;
      }
      if (typeof onRedirectMonth === "function") {
        onRedirectMonth(periodClosed.suggestedMonth);
      }
      setPeriodClosed(null);
      setSuccess(`${created} adjustment(s) submitted for ${toLabel} ${year}.`);
      setRefreshKey((k) => k + 1);
      if (onRecordsRefresh) onRecordsRefresh();
      setTimeout(() => setSuccess(""), 3500);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to submit adjustment.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproved = useCallback(() => {
    fetchBalances();
    if (onBalanceChanged) onBalanceChanged();
  }, [fetchBalances, onBalanceChanged]);

  if (!employee)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ColHeader
          icon={LeaveIcon}
          label="Leave Earning Input"
          color={T.accent}
        />
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 6,
          }}
        >
          <LeaveIcon
            sx={{ fontSize: 36, color: alpha(T.accent, 0.15), mb: 1 }}
          />
          <Typography
            sx={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: T.faint,
              fontFamily: T.poppins,
            }}
          >
            Select an employee to begin
          </Typography>
        </Box>
      </Box>
    );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <ColHeader icon={LeaveIcon} label="Leave Earning Input" color={T.accent}>
        {autoDefaultCodes.length > 0 && (
          <Tooltip
            title={`${autoDefaultCodes.join(" & ")} are pre-filled with 1.25d — confirm to include in Step 3`}
          >
            <Chip
              size="small"
              label={`${autoDefaultCodes.join("+")} default 1.25d`}
              sx={{
                height: 15,
                fontSize: "0.54rem",
                fontWeight: 700,
                bgcolor: "rgba(0,0,0,0.05)",
                color: T.muted,
                border: "1px solid rgba(0,0,0,0.1)",
                cursor: "help",
              }}
            />
          </Tooltip>
        )}
      </ColHeader>

      {/* ── Compact employee meta + restrictions bar ── */}
      <Box
        sx={{
          flexShrink: 0,
          px: 1.5,
          py: 0.85,
          borderBottom: `1px solid ${T.divider}`,
          bgcolor: alpha(T.accent, 0.03),
          display: "flex",
          flexDirection: "column",
          gap: 0.55,
        }}
      >
        <Dialog
          open={!!periodClosed}
          onClose={() => setPeriodClosed(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              overflow: "hidden",
              border: `1px solid rgba(109,35,35,0.12)`,
              boxShadow: "0 18px 60px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.08)",
            },
          }}
        >
          <DialogTitle
            sx={{
              fontFamily: T.poppins,
              fontWeight: 800,
              fontSize: "0.95rem",
              color: T.accent,
              pb: 1.25,
              pt: 1.6,
              px: 2.5,
              bgcolor: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 1,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 2,
                bgcolor: "rgba(109,35,35,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <WarnIcon sx={{ fontSize: 16, color: T.accent }} />
            </Box>
            Period closed
          </DialogTitle>
          <DialogContent sx={{ px: 2.25, pt: 2, pb: 0 }}>
            <Typography
              sx={{
                fontSize: "0.82rem",
                lineHeight: 1.6,
                color: "#333",
                fontFamily: T.poppins,
                mb: 1.25,
              }}
            >
              This payroll period is already closed. To keep balances correct, please post the
              missed earning as an <strong>adjustment</strong> in the suggested period.
            </Typography>

            {periodClosed?.suggestedMonth && (
              <Box
                sx={{
                  borderRadius: 2,
                  border: "1px solid rgba(0,0,0,0.10)",
                  bgcolor: "rgba(0,0,0,0.015)",
                  overflow: "hidden",
                  mb: 0.5,
                }}
              >
                <Box
                  sx={{
                    px: 1.75,
                    py: 1.05,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.25,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: T.muted,
                      fontFamily: T.poppins,
                    }}
                  >
                    Suggested period
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 900,
                      color: T.accent,
                      fontFamily: T.poppins,
                    }}
                  >
                    {monthName(periodClosed.suggestedMonth)} {year}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 1.75,
                    py: 1,
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                    bgcolor: "#fff",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      color: T.muted,
                      fontFamily: T.poppins,
                    }}
                  >
                    This will be saved as <strong>ADJUSTMENT</strong>.
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              px: 2.5,
              pb: 2.25,
              pt: 1.75,
              gap: 1,
              bgcolor: "#fff",
            }}
          >
            <Button
              onClick={() => setPeriodClosed(null)}
              sx={{
                textTransform: "none",
                color: T.muted,
                fontFamily: T.poppins,
                fontWeight: 700,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={applyAsAdjustment}
              variant="contained"
              disabled={!periodClosed?.suggestedMonth}
              sx={{
                bgcolor: T.accent,
                textTransform: "none",
                fontFamily: T.poppins,
                fontWeight: 700,
                borderRadius: 2,
                px: 2,
                "&:hover": { bgcolor: T.accentDark },
              }}
            >
              Add as Adjustment to {periodClosed?.suggestedMonth ? `${monthName(periodClosed.suggestedMonth)} ${year}` : "current period"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Row 1: gender / dept / category badges */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexWrap: "wrap" }}>
          {employeeGender && <GenderBadge gender={employeeGender} />}
          {deptMap?.[String(employee.employeeNumber)] && (
            <DeptBadge code={deptMap[String(employee.employeeNumber)]} />
          )}
          {empCatMap?.[String(employee.employeeNumber)]?.label && (
            <EmpCatBadge
              label={empCatMap[String(employee.employeeNumber)].label}
              colorHex={empCatMap[String(employee.employeeNumber)].colorHex}
            />
          )}
          {!employeeGender && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
              <WarningIcon sx={{ fontSize: 11, color: "#e65100" }} />
              <Typography sx={{ fontSize: "0.58rem", color: "#e65100", fontWeight: 700, fontFamily: T.poppins }}>
                No gender — restricted types hidden
              </Typography>
            </Box>
          )}
        </Box>

        {/* Row 2: leave type chips + hidden pill — all in one tight line */}
        {leaveTypes.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, flexWrap: "wrap" }}>
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 800,
                color: T.faint,
                fontFamily: T.poppins,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                flexShrink: 0,
                mr: 0.25,
              }}
            >
              Leaves:
            </Typography>

            {visibleLeaveTypes.map((lt) => {
              const r = getLeaveGenderRestriction(lt);
              const tip = [
                lt.leave_description || lt.leave_name || "",
                r === "male" ? "Male only" : r === "female" ? "Female only" : "No restriction",
                "Shown in earning input.",
              ].filter(Boolean).join(" · ");
              return (
                <Tooltip key={lt.leave_code} title={tip} arrow>
                  <Chip
                    size="small"
                    label={lt.leave_code}
                    icon={
                      r === "male"
                        ? <MaleIcon sx={{ fontSize: 9, color: "#1565C0 !important" }} />
                        : r === "female"
                          ? <FemaleIcon sx={{ fontSize: 9, color: "#c2185b !important" }} />
                          : undefined
                    }
                    sx={{
                      height: 17,
                      fontSize: "0.57rem",
                      fontWeight: 700,
                      fontFamily: T.poppins,
                      bgcolor: "rgba(46,125,50,0.08)",
                      border: "1px solid rgba(46,125,50,0.25)",
                      color: "#1b5e20",
                      cursor: "default",
                      "& .MuiChip-label": { px: 0.55 },
                      "& .MuiChip-icon": { ml: 0.4 },
                    }}
                  />
                </Tooltip>
              );
            })}

            {hiddenLeaveTypesForPrompt.length > 0 && (
              <Tooltip
                arrow
                title={
                  <Box sx={{ p: 0.25 }}>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, mb: 0.6, color: "#fff" }}>
                      Hidden (gender-restricted):
                    </Typography>
                    {hiddenLeaveTypesForPrompt.map((row) => (
                      <Box key={row.code} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.3 }}>
                        {row.restriction === "male"
                          ? <MaleIcon sx={{ fontSize: 11, color: "#90caf9" }} />
                          : <FemaleIcon sx={{ fontSize: 11, color: "#f48fb1" }} />
                        }
                        <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.9)" }}>
                          <strong>{row.code}</strong>
                          {row.description ? ` — ${row.description}` : ""}
                          <span style={{ opacity: 0.7 }}> ({row.who})</span>
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                }
              >
                <Chip
                  size="small"
                  label={`+${hiddenLeaveTypesForPrompt.length} hidden`}
                  icon={<GenderIcon sx={{ fontSize: 10, opacity: 0.55 }} />}
                  sx={{
                    height: 17,
                    fontSize: "0.57rem",
                    fontWeight: 700,
                    fontFamily: T.poppins,
                    bgcolor: "rgba(0,0,0,0.05)",
                    border: "1px dashed rgba(0,0,0,0.2)",
                    color: T.muted,
                    cursor: "help",
                    "& .MuiChip-label": { px: 0.55 },
                    "& .MuiChip-icon": { ml: 0.4 },
                  }}
                />
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      {/* ── Scrollable input area ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1.5,
          pt: 1.25,
          pb: 1,
          minHeight: 0,
          "&::-webkit-scrollbar": { width: 3 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(0,0,0,0.1)",
            borderRadius: 2,
          },
        }}
      >
        {error && (
          <Alert
            severity="error"
            sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.75rem", py: 0 }}
          >
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.75rem", py: 0 }}
          >
            {success}
          </Alert>
        )}
        {leaveTypes.length > 0 && visibleLeaveTypes.length === 0 && (
          <Alert
            severity="warning"
            sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.75rem", py: 0 }}
          >
            No leave types available for this employee — gender missing or none match. Update Leave Table or personnel gender.
          </Alert>
        )}
        <Box
          sx={{
            mb: 1,
            px: 0.75,
            py: 0.4,
            borderRadius: 1.5,
            bgcolor: "rgba(0,0,0,0.03)",
            border: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <DateRangeIcon sx={{ fontSize: 11, color: T.faint }} />
          <Typography
            sx={{
              fontSize: "0.62rem",
              color: "#444",
              fontFamily: T.poppins,
              fontWeight: 600,
            }}
          >
            {monthName(month)} {year} · {calDays} days = {calDays * 8}h
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: "0.6rem",
            fontWeight: 800,
            color: T.faint,
            fontFamily: T.poppins,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            mb: 0.5,
          }}
        >
          Step 1 — Leave Balances · Enter days to earn
        </Typography>
        <Box sx={{ mb: 1.25 }}>
          {[...visibleLeaveTypes]
            .sort((a, b) => {
              const aB = assignmentMap[a.leave_code];
              const bB = assignmentMap[b.leave_code];
              return (
                toNum(bB?.total_hours) - toNum(aB?.total_hours) ||
                a.leave_code.localeCompare(b.leave_code)
              );
            })
            .map((lt) => {
              const restriction = getLeaveGenderRestriction(lt);
              const balance = assignmentMap[lt.leave_code];
              const remaining = toNum(balance?.remaining_hours);
              const total = toNum(balance?.total_hours);
              const isAuto = SL_VL_AUTO_CODES.includes(lt.leave_code);
              const isTouched = !!userTouched[lt.leave_code];
              const valHrs = toNum(earnedHours[lt.leave_code]);
              const isActive = valHrs > 0 && (isTouched || !isAuto);
              const isAutoUnconfirmed = isAuto && !isTouched && valHrs > 0;
              const status = existingEarnedByCode[String(lt.leave_code).toUpperCase()];
              const isLocked = status === "approved" || status === "pending";
              const draft = earnedDraft[lt.leave_code];
              const displayVal =
                draft !== undefined
                  ? draft
                  : valHrs === 0
                    ? ""
                    : unit === "days"
                      ? String(parseFloat((valHrs / 8).toFixed(3)))
                      : String(valHrs);
              return (
                <Box
                  key={lt.leave_code}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.5,
                    px: 1,
                    py: 0.65,
                    borderRadius: 1.5,
                    border: `1.5px solid ${isLocked ? "rgba(0,0,0,0.12)" : isActive ? "rgba(0,0,0,0.18)" : isAutoUnconfirmed ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.08)"}`,
                    bgcolor: isActive
                      ? "rgba(0,0,0,0.03)"
                      : isAutoUnconfirmed
                        ? "rgba(0,0,0,0.02)"
                        : "rgba(0,0,0,0.01)",
                    transition: "all 0.15s",
                    opacity: isLocked ? 0.72 : 1,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      {restriction === "male" && (
                        <MaleIcon
                          sx={{ fontSize: 12, color: "#1565C0", flexShrink: 0 }}
                        />
                      )}
                      {restriction === "female" && (
                        <FemaleIcon
                          sx={{ fontSize: 12, color: "#c2185b", flexShrink: 0 }}
                        />
                      )}
                      <Typography
                        sx={{
                          fontSize: "0.73rem",
                          fontWeight: 800,
                          color: isActive ? "#1a1a1a" : "#444",
                          fontFamily: T.poppins,
                          lineHeight: 1,
                        }}
                      >
                        {lt.leave_code}
                      </Typography>
                      {status === "approved" && (
                        <Chip
                          size="small"
                          label="Approved"
                          sx={{
                            height: 16,
                            fontSize: "0.56rem",
                            fontWeight: 800,
                            bgcolor: "rgba(109,35,35,0.06)",
                            color: T.accent,
                            border: `1px solid ${T.accentBorder}`,
                          }}
                        />
                      )}
                      {status === "pending" && (
                        <Chip
                          size="small"
                          label="Pending"
                          sx={{
                            height: 16,
                            fontSize: "0.56rem",
                            fontWeight: 800,
                            bgcolor: "rgba(0,0,0,0.04)",
                            color: "#7a4a00",
                            border: "1px solid rgba(0,0,0,0.12)",
                          }}
                        />
                      )}
                      {isAuto && (
                        <Tooltip
                          title={
                            isTouched
                              ? "Value confirmed — will appear in Step 3"
                              : "Pre-filled with 1.25d default. Edit or press confirm to include in Step 3."
                          }
                        >
                          <Typography
                            component="span"
                            sx={{
                              fontSize: "0.52rem",
                              color: isTouched ? "#2a6a2a" : "#888",
                              fontFamily: T.poppins,
                              fontWeight: 700,
                              cursor: "help",
                            }}
                          >
                            {isTouched
                              ? "★ confirmed"
                              : "★ auto — not in Step 3"}
                          </Typography>
                        </Tooltip>
                      )}
                    </Box>
                    {lt.leave_description && (
                      <Typography
                        sx={{
                          fontSize: "0.57rem",
                          color: T.faint,
                          fontFamily: T.poppins,
                          lineHeight: 1.2,
                        }}
                        noWrap
                      >
                        {lt.leave_description?.substring(0, 28)}
                      </Typography>
                    )}
                    {total > 0 ? (
                      <Typography
                        sx={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          color: remaining > 0 ? "#1e4d20" : "#6b1a1a",
                          fontFamily: T.poppins,
                          lineHeight: 1.3,
                        }}
                      >
                        {unit === "days"
                          ? `${(remaining / 8).toFixed(3)}d`
                          : `${remaining.toFixed(3)}h`}
                        <span
                          style={{
                            color: T.faint,
                            fontWeight: 400,
                            fontSize: "0.56rem",
                          }}
                        >
                          {" "}
                          remaining
                        </span>
                      </Typography>
                    ) : (
                      <Typography
                        sx={{
                          fontSize: "0.56rem",
                          color: T.faint,
                          fontFamily: T.poppins,
                          fontStyle: "italic",
                          lineHeight: 1.3,
                        }}
                      >
                        No balance
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      flexShrink: 0,
                    }}
                  >
                    <Box sx={{ position: "relative", width: 78 }}>
                      <Tooltip
                        title={isLocked ? "Approved/Pending entries are locked." : ""}
                        arrow
                        disableHoverListener={!isLocked}
                      >
                        <span style={{ display: "block" }}>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder={isAuto ? "1.250" : "0.000"}
                            value={displayVal}
                            disabled={isLocked}
                            onChange={(e) => {
                              setEarnedDraft((p) => ({
                                ...p,
                                [lt.leave_code]: e.target.value,
                              }));
                              const n = parseFloat(e.target.value);
                              setEarnedHours((p) => ({
                                ...p,
                                [lt.leave_code]: isNaN(n) ? 0 : toHours(n, unit),
                              }));
                              setUserTouched((p) => ({
                                ...p,
                                [lt.leave_code]: true,
                              }));
                            }}
                            onFocus={() =>
                              setEarnedDraft((p) => ({
                                ...p,
                                [lt.leave_code]: displayVal,
                              }))
                            }
                            onBlur={() => {
                              const raw = earnedDraft[lt.leave_code] ?? displayVal;
                              const n = parseFloat(raw);
                              setEarnedHours((p) => ({
                                ...p,
                                [lt.leave_code]: isNaN(n) ? 0 : toHours(n, unit),
                              }));
                              setEarnedDraft((p) => {
                                const { [lt.leave_code]: _, ...rest } = p;
                                return rest;
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            style={{
                              width: "100%",
                              padding: "5px 22px 5px 7px",
                              borderRadius: 6,
                              border: `1.5px solid ${isLocked ? "rgba(0,0,0,0.12)" : isActive ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.14)"}`,
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              outline: "none",
                              fontFamily: T.poppins,
                              boxSizing: "border-box",
                              background: isLocked ? "rgba(0,0,0,0.02)" : "#fff",
                              color: isLocked ? "rgba(0,0,0,0.55)" : "#1a1a1a",
                            }}
                          />
                        </span>
                      </Tooltip>
                      <span
                        style={{
                          position: "absolute",
                          right: 6,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "0.58rem",
                          color: T.faint,
                          pointerEvents: "none",
                          fontFamily: T.poppins,
                        }}
                      >
                        {unit === "days" ? "d" : "h"}
                      </span>
                    </Box>
                    {isAuto && !isTouched ? (
                      <Tooltip title="Confirm this value — adds to Step 3">
                        <IconButton
                          size="small"
                          disabled={isLocked}
                          onClick={() =>
                            setUserTouched((p) => ({
                              ...p,
                              [lt.leave_code]: true,
                            }))
                          }
                          sx={{
                            width: 20,
                            height: 20,
                            flexShrink: 0,
                            color: "#2a6a2a",
                            border: "1px solid rgba(0,0,0,0.15)",
                            bgcolor: "rgba(0,0,0,0.03)",
                            "&:hover": { bgcolor: "rgba(0,0,0,0.07)" },
                          }}
                        >
                          <CheckIcon sx={{ fontSize: 11 }} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip
                        title={
                          isAuto
                            ? "Reset to default (removes from Step 3)"
                            : "Clear"
                        }
                      >
                        <IconButton
                          size="small"
                          disabled={isLocked}
                          onClick={() => {
                            const resetVal = isAuto ? SL_VL_DEFAULT_HOURS : 0;
                            setEarnedHours((p) => ({
                              ...p,
                              [lt.leave_code]: resetVal,
                            }));
                            setEarnedDraft((p) => {
                              const { [lt.leave_code]: _, ...rest } = p;
                              return rest;
                            });
                            if (isAuto)
                              setUserTouched((p) => {
                                const { [lt.leave_code]: _, ...rest } = p;
                                return rest;
                              });
                          }}
                          sx={{
                            width: 20,
                            height: 20,
                            flexShrink: 0,
                            color: isActive ? "#6b1a1a" : T.faint,
                            border: `1px solid ${isActive ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.1)"}`,
                            bgcolor: isActive
                              ? "rgba(0,0,0,0.03)"
                              : "transparent",
                            "&:hover": {
                              color: "#6b1a1a",
                              border: "1px solid rgba(0,0,0,0.2)",
                              bgcolor: "rgba(0,0,0,0.05)",
                            },
                          }}
                        >
                          <Close sx={{ fontSize: 10 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              );
            })}
        </Box>
      </Box>

      {/* ── Footer: Step 3 summary + save ── */}
      <Box
        sx={{
          flexShrink: 0,
          px: 1.5,
          pb: 1.5,
          pt: 0.75,
          borderTop: `1px solid ${T.divider}`,
        }}
      >
        {activeLeaves.length > 0 && (
          <Box
            sx={{
              mb: 0.75,
              px: 1,
              py: 0.6,
              borderRadius: 1.5,
              bgcolor: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 800,
                color: T.faint,
                fontFamily: T.poppins,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                mb: 0.4,
              }}
            >
              Step 3 — Confirm &amp; Save
            </Typography>
            {activeLeaves.map((lt) => (
              <Box
                key={lt.leave_code}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    color: "#333",
                    fontFamily: T.poppins,
                    fontWeight: 600,
                  }}
                >
                  {lt.leave_code}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "#1a1a1a",
                    fontFamily: T.poppins,
                  }}
                >
                  {unit === "days"
                    ? `${(toNum(earnedHours[lt.leave_code]) / 8).toFixed(3)}d`
                    : `${toNum(earnedHours[lt.leave_code]).toFixed(3)}h`}
                </Typography>
              </Box>
            ))}
            <Box sx={{ height: 1, bgcolor: T.divider, my: 0.5 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "#333",
                  fontFamily: T.poppins,
                }}
              >
                Total to earn
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: "#1a1a1a",
                  fontFamily: T.poppins,
                }}
              >
                {unit === "days"
                  ? `${(activeLeaves.reduce((s, lt) => s + toNum(earnedHours[lt.leave_code]), 0) / 8).toFixed(3)}d`
                  : `${activeLeaves.reduce((s, lt) => s + toNum(earnedHours[lt.leave_code]), 0).toFixed(3)}h`}
              </Typography>
            </Box>
          </Box>
        )}
        {activeLeaves.length === 0 && (
          <Box
            sx={{
              mb: 0.75,
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              bgcolor: "rgba(0,0,0,0.02)",
              border: "1px dashed rgba(0,0,0,0.1)",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.62rem",
                color: T.faint,
                fontFamily: T.poppins,
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              Step 3 — No leaves confirmed yet. Type a value or check on SL/VL
              to add.
            </Typography>
          </Box>
        )}
        <FieldInput
          size="small"
          fullWidth
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Remarks (optional)"
          sx={{ mb: 0.75 }}
        />
        <Box sx={{ display: "flex", gap: 0.75 }}>
          <Button
            size="small"
            onClick={() => {
              const defaults = {};
              visibleLeaveTypes.forEach((lt) => {
                if (SL_VL_AUTO_CODES.includes(lt.leave_code))
                  defaults[lt.leave_code] = SL_VL_DEFAULT_HOURS;
              });
              setEarnedHours(defaults);
              setEarnedDraft({});
              setUserTouched({});
            }}
            sx={{
              fontSize: "0.68rem",
              color: T.muted,
              textTransform: "none",
              fontFamily: T.poppins,
              border: `1px solid ${T.divider}`,
              borderRadius: 1.5,
              px: 1.25,
              whiteSpace: "nowrap",
              flexShrink: 0,
              minWidth: "fit-content",
            }}
          >
            Clear all
          </Button>
          <AccentButton
            variant="contained"
            fullWidth
            onClick={handleSave}
            disabled={loading || activeLeaves.length === 0}
            startIcon={
              loading ? (
                <CircularProgress size={14} sx={{ color: "#fff" }} />
              ) : (
                <AddIcon sx={{ fontSize: "15px !important" }} />
              )
            }
            sx={{
              height: 36,
              bgcolor: activeLeaves.length > 0 ? T.accent : "#c0c0c0",
              color: "#fff",
              fontFamily: T.poppins,
              fontSize: "0.78rem",
              "&:hover": {
                bgcolor: activeLeaves.length > 0 ? T.accentDark : "#c0c0c0",
              },
              "&:disabled": {
                bgcolor: "#c0c0c0 !important",
                color: "#888 !important",
              },
            }}
          >
            {loading
              ? "Saving…"
              : activeLeaves.length > 0
                ? "Save earnings →"
                : "Confirm a leave above"}
          </AccentButton>
        </Box>
      </Box>
    </Box>
  );
};

export { LeaveInputColumn };