import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import {
  getLeaveGenderRestriction,
  isLeaveAllowedForGender,
} from "../leaveGenderUtils";
import { DeptBadge, EmpCatBadge } from "./RecordsList";
import { fetchDeductionCreditSnapshots } from "../../../utils/deductionSourceBalances";
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
  InfoOutlined as InfoOutlinedIcon,
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
  const [scTotalRemaining, setScTotalRemaining] = useState(0);
  const [ctoTotalRemaining, setCtoTotalRemaining] = useState(0);
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
  /** CSC accrual proposal from the server (1.25 d less leave without pay, by category). */
  const [proposal, setProposal] = useState(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
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
      setScTotalRemaining(0);
      setCtoTotalRemaining(0);
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const snapshots = await fetchDeductionCreditSnapshots(employee.employeeNumber, token);
      setAssignmentMap(
        snapshots && typeof snapshots.assignmentMap === "object"
          ? snapshots.assignmentMap
          : {},
      );
      setScTotalRemaining(toNum(snapshots?.scRemainingHours));
      setCtoTotalRemaining(toNum(snapshots?.ctoRemainingHours));
    } catch {
      setAssignmentMap({});
      setScTotalRemaining(0);
      setCtoTotalRemaining(0);
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
        // Voided earnings (e.g. rolled back by Leave Assignment → Void) no longer block re-posting.
        if (e.voided_at || Number(e.voided) === 1) continue;
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
      setScTotalRemaining(0);
      setCtoTotalRemaining(0);
      setExistingEarnedByCode({});
      return;
    }
    fetchBalances();
    fetchExistingEarned();
  }, [employee, year, month, fetchBalances, fetchExistingEarned, refreshKey, externalRefreshKey]);

  useEffect(() => {
    if (!employee) {
      setProposal(null);
      return;
    }
    let cancelled = false;
    setProposalLoading(true);
    axios
      .get(`${API_BASE_URL}/api/earnings/leave/proposal/${employee.employeeNumber}`, {
        params: { year, month },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((r) => {
        if (!cancelled) setProposal(r.data || null);
      })
      .catch(() => {
        if (!cancelled) setProposal(null);
      })
      .finally(() => {
        if (!cancelled) setProposalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employee, year, month, refreshKey, externalRefreshKey]);

  /** SL/VL start at the computed amount (0 when the category does not earn them). */
  const accrualDefaults = useCallback(() => {
    const defaults = {};
    visibleLeaveTypes.forEach((lt) => {
      if (!SL_VL_AUTO_CODES.includes(lt.leave_code)) return;
      const p = proposal?.codes?.[lt.leave_code];
      defaults[lt.leave_code] = p ? (p.eligible ? toNum(p.hours) : 0) : SL_VL_DEFAULT_HOURS;
    });
    return defaults;
  }, [visibleLeaveTypes, proposal]);
  // Only reset the inputs when the computed amounts actually change (not on every refetch).
  const proposalSig = proposal
    ? SL_VL_AUTO_CODES.map((c) => `${c}:${proposal.codes?.[c]?.eligible ? 1 : 0}:${proposal.codes?.[c]?.hours ?? ""}`).join("|")
    : "none";

  useEffect(() => {
    if (!employee || visibleLeaveTypes.length === 0) {
      setEarnedHours({});
      setEarnedDraft({});
      setUserTouched({});
      setRemarks("");
      setOverrideReason("");
      setError("");
      return;
    }
    const defaults = accrualDefaults();
    setEarnedHours(defaults);
    setEarnedDraft({});
    setUserTouched(Object.fromEntries(Object.keys(defaults).filter((c) => defaults[c] > 0).map((c) => [c, true])));
    setRemarks("");
    setOverrideReason("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, year, month, visibleLeaveTypes, proposalSig]);

  const proposalFor = (code) => proposal?.codes?.[String(code).toUpperCase()] || null;
  /** True when the posted amount is not the CSC computation (or the category does not earn it). */
  const differsFromProposal = (code, hrs) => {
    const p = proposalFor(code);
    if (!p) return false;
    if (!p.eligible) return hrs > 0;
    return Math.abs(hrs - toNum(p.hours)) > 0.0005;
  };

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
    const needsOverride = activeLeaves.some((lt) => {
      const st = existingEarnedByCode[String(lt.leave_code).toUpperCase()];
      if (st === "approved" || st === "pending") return false;
      return differsFromProposal(lt.leave_code, toNum(earnedHours[lt.leave_code]));
    });
    if (needsOverride && !overrideReason.trim()) {
      setError("Enter an override reason — the amount differs from the CSC computation.");
      return;
    }
    setLoading(true);
    setError("");
    setPeriodClosed(null);
    const token = localStorage.getItem("token");
    let created = 0;

    const failures = [];
    for (const lt of activeLeaves) {
      const status = existingEarnedByCode[String(lt.leave_code).toUpperCase()];
      if (status === "approved" || status === "pending") continue;
      const postHrs = toNum(earnedHours[lt.leave_code]);
      try {
        await axios.post(
          `${API_BASE_URL}/api/earnings/leave`,
          {
            employeeNumber: employee.employeeNumber,
            leave_code: lt.leave_code,
            earned_hours: postHrs,
            period_year: parseInt(year, 10) || new Date().getFullYear(),
            period_month: parseInt(month, 10),
            entry_type: "EARNED",
            remarks: remarks || null,
            override_reason: differsFromProposal(lt.leave_code, postHrs) ? overrideReason.trim() : undefined,
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
        failures.push(`${lt.leave_code}: ${d?.error || e.message}`);
      }
    }
    setLoading(false);
    if (failures.length) setError(failures.join(" · "));
    if (created > 0) {
      setSuccess(
        `${created} leave earning(s) submitted for ${monthName(month)} ${year}.`,
      );
      const defaults = accrualDefaults();
      setEarnedHours(defaults);
      setEarnedDraft({});
      setUserTouched(Object.fromEntries(Object.keys(defaults).filter((c) => defaults[c] > 0).map((c) => [c, true])));
      setRemarks("");
      setOverrideReason("");
      setRefreshKey((k) => k + 1);
      if (onRecordsRefresh) onRecordsRefresh();
      setTimeout(() => setSuccess(""), 3500);
    } else {
      if (!periodClosed && !failures.length) {
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

  // ── Card grid (SL/VL on top, other leaves below) ──────────────────────────
  const unitWord = unit === "days" ? "d" : "h";
  const stepSize = unit === "days" ? 0.25 : 2;
  const toUnit = (h) => (unit === "days" ? h / 8 : h);
  const fmtU = (h) => toUnit(h).toFixed(3);
  const statusOf = (code) => existingEarnedByCode[String(code).toUpperCase()];
  const isLockedCode = (code) => {
    const s = statusOf(code);
    return s === "approved" || s === "pending";
  };
  /** What "Post earnings" will actually create: selected, and not already pending/approved. */
  const postable = activeLeaves.filter((lt) => !isLockedCode(lt.leave_code));
  const overrideCodes = postable
    .filter((lt) => differsFromProposal(lt.leave_code, toNum(earnedHours[lt.leave_code])))
    .map((lt) => lt.leave_code);
  const overrideMissing = overrideCodes.length > 0 && !overrideReason.trim();
  const totalToAddHrs = postable.reduce((s, lt) => s + toNum(earnedHours[lt.leave_code]), 0);

  const setValueHrs = (code, hrs) => {
    setEarnedHours((p) => ({ ...p, [code]: Math.max(0, hrs) }));
    setUserTouched((p) => ({ ...p, [code]: true }));
  };
  const toggleLeave = (lt, isActive) => {
    const code = lt.leave_code;
    if (isLockedCode(code)) return;
    setEarnedDraft((p) => {
      const { [code]: _, ...rest } = p;
      return rest;
    });
    if (isActive) setValueHrs(code, 0);
    else {
      const p = proposalFor(code);
      setValueHrs(code, SL_VL_AUTO_CODES.includes(code) ? (p?.eligible ? toNum(p.hours) : SL_VL_DEFAULT_HOURS) : 8);
    }
  };

  const sortedLeaves = [...visibleLeaveTypes].sort((a, b) => a.leave_code.localeCompare(b.leave_code));
  const baseLeaves = SL_VL_AUTO_CODES.map((c) => sortedLeaves.find((lt) => lt.leave_code === c)).filter(Boolean);
  const otherLeaves = sortedLeaves.filter((lt) => !SL_VL_AUTO_CODES.includes(lt.leave_code));

  const renderCard = (lt, big) => {
    const code = lt.leave_code;
    const restriction = getLeaveGenderRestriction(lt);
    const balance = assignmentMap[code];
    const remaining = toNum(balance?.remaining_hours);
    const hasBalance = balance != null && toNum(balance?.total_hours) > 0;
    const valHrs = toNum(earnedHours[code]);
    const isAuto = SL_VL_AUTO_CODES.includes(code);
    const isTouched = !!userTouched[code];
    const status = statusOf(code);
    const isLocked = status === "approved" || status === "pending";
    const isActive = !isLocked && valHrs > 0 && (isTouched || !isAuto);
    const draft = earnedDraft[code];
    const displayVal = draft !== undefined ? draft : String(parseFloat(toUnit(valHrs).toFixed(3)));

    return (
      <Box
        key={code}
        sx={{
          position: "relative",
          border: `1.5px solid ${isActive ? T.accent : T.divider}`,
          borderRadius: "11px",
          bgcolor: isActive ? alpha(T.accent, 0.07) : "#fff",
          boxShadow: isActive ? `0 10px 22px -16px ${T.accent}` : "none",
          opacity: isLocked ? 0.75 : 1,
          transition: "all .2s",
          "&:hover": isLocked ? {} : { transform: "translateY(-2px)" },
        }}
      >
        <Box
          component="button"
          type="button"
          aria-pressed={isActive}
          disabled={isLocked}
          onClick={() => toggleLeave(lt, isActive)}
          sx={{
            all: "unset",
            boxSizing: "border-box",
            display: "block",
            width: "100%",
            p: "8px 28px 8px 10px",
            borderRadius: "11px",
            cursor: isLocked ? "default" : "pointer",
            "&:focus-visible": { outline: `2px solid ${T.accent}` },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
            {restriction === "male" && <MaleIcon sx={{ fontSize: 12, color: "#1565C0" }} />}
            {restriction === "female" && <FemaleIcon sx={{ fontSize: 12, color: "#c2185b" }} />}
            <Typography component="b" sx={{ fontSize: big ? "0.95rem" : "0.88rem", fontWeight: 800, fontFamily: T.poppins, color: T.text }}>
              {code}
            </Typography>
          </Box>
          <Typography component="small" sx={{ display: "block", color: T.muted, fontSize: "0.66rem", lineHeight: 1.3, fontFamily: T.poppins }}>
            {lt.leave_description}
          </Typography>
          {isAuto && !isLocked && (() => {
            const p = proposalFor(code);
            if (proposalLoading && !p) {
              return <Typography sx={{ fontSize: "0.64rem", color: T.faint, fontFamily: T.poppins }}>Computing…</Typography>;
            }
            if (!p) return null;
            if (!p.eligible) {
              return (
                <Typography sx={{ fontSize: "0.64rem", color: "#b4283f", fontWeight: 600, fontFamily: T.poppins, lineHeight: 1.3 }}>
                  Not earned: {p.reason}
                </Typography>
              );
            }
            const overridden = isActive && differsFromProposal(code, valHrs);
            // Status: the amount is the automatic computation, or HR changed it (override).
            const chip = overridden
              ? { label: "Override", bg: "#fdebc8", fg: "#8a5d06", tip: `Changed from the computed ${fmtU(toNum(p.hours))} ${unitWord}. A reason is required to post.` }
              : isActive
                ? { label: "Auto-computed", bg: "rgba(46,125,50,0.12)", fg: "#1b5e20", tip: p.formula || "" }
                : null;
            const lwop = proposal?.lwop;
            const explain = (
              <Box sx={{ fontFamily: T.poppins, fontSize: "0.72rem", lineHeight: 1.5, maxWidth: 300 }}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>How {fmtU(toNum(p.hours))} {unitWord} was computed</Box>
                <Box>• Base: 1.25 d a month (15 days a year ÷ 12) — CSC MC 41 s.1998, Sec. 1.</Box>
                <Box>
                  • Leave without pay this month: {lwop ? `${Number(lwop.days).toFixed(3)} d (${Number(lwop.hours).toFixed(3)} h charged to salary)` : "none"}.
                </Box>
                <Box>• Formula: 1.25 × (30 − days without pay) ÷ 30.</Box>
                <Box sx={{ mt: 0.5, fontWeight: 600 }}>{p.formula}</Box>
                <Box sx={{ mt: 0.5, opacity: 0.8 }}>
                  Absences, half days and tardiness covered by VL, SL, SC or CTO are paid, so they do not lower the earning. Only time charged to salary does (Sec. 28 / Table III).
                </Box>
              </Box>
            );
            return (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", mt: 0.25 }}>
                <Typography component="span" sx={{ fontSize: "0.64rem", color: T.muted, fontFamily: T.poppins }}>
                  Computed {fmtU(toNum(p.hours))} {unitWord}
                </Typography>
                <Tooltip title={explain} arrow enterTouchDelay={0} leaveTouchDelay={6000}>
                  {/* span, not <button>: it sits inside the card's toggle button */}
                  <IconButton
                    component="span"
                    role="button"
                    tabIndex={0}
                    size="small"
                    aria-label={`How the ${code} earning is computed`}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    sx={{ p: 0.15, color: T.accent }}
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                {chip && (
                  <Tooltip title={chip.tip} arrow>
                    <Box component="span" sx={{ px: 0.8, borderRadius: 99, fontSize: "0.58rem", fontWeight: 700, bgcolor: chip.bg, color: chip.fg, fontFamily: T.poppins, cursor: "help" }}>
                      {chip.label}
                    </Box>
                  </Tooltip>
                )}
              </Box>
            );
          })()}
          {isLocked ? (
            <Box component="span" sx={{ display: "inline-block", mt: 0.4, px: 0.9, borderRadius: 99, fontSize: "0.6rem", fontWeight: 700, fontFamily: T.poppins, ...(status === "approved" ? { bgcolor: "rgba(46,125,50,0.12)", color: "#1b5e20" } : { bgcolor: "#fdebc8", color: "#8a5d06" }) }}>
              {status === "approved" ? "Approved" : "Pending"} this month
            </Box>
          ) : !isActive ? (
            hasBalance ? (
              <Typography sx={{ fontSize: "0.66rem", color: "#2e7d32", fontWeight: 600, fontFamily: T.poppins }}>
                {fmtU(remaining)} {unitWord} now
              </Typography>
            ) : (
              <Typography sx={{ fontSize: "0.66rem", color: T.muted, fontStyle: "italic", fontFamily: T.poppins }}>
                No balance yet
              </Typography>
            )
          ) : null}
        </Box>

        {/* check mark */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            width: 17,
            height: 17,
            borderRadius: "50%",
            border: `2px solid ${isActive ? T.accent : T.divider}`,
            bgcolor: isActive ? T.accent : "transparent",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: "9px",
            pointerEvents: "none",
          }}
        >
          {isActive ? "✓" : ""}
        </Box>

        {isActive && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: "10px", pb: 1 }}>
              <Box
                component="button"
                type="button"
                aria-label={`Less ${code}`}
                onClick={() => setValueHrs(code, valHrs - toHours(stepSize, unit))}
                sx={stepBtnSx}
              >
                −
              </Box>
              <input
                type="text"
                inputMode="decimal"
                aria-label={`${unit === "days" ? "Days" : "Hours"} for ${code}`}
                value={displayVal}
                onChange={(e) => {
                  setEarnedDraft((p) => ({ ...p, [code]: e.target.value }));
                  const n = parseFloat(e.target.value);
                  setEarnedHours((p) => ({ ...p, [code]: isNaN(n) ? 0 : toHours(n, unit) }));
                  setUserTouched((p) => ({ ...p, [code]: true }));
                }}
                onFocus={() => setEarnedDraft((p) => ({ ...p, [code]: displayVal }))}
                onBlur={() => {
                  const n = parseFloat(earnedDraft[code] ?? displayVal);
                  setEarnedHours((p) => ({ ...p, [code]: isNaN(n) ? 0 : Math.max(0, toHours(n, unit)) }));
                  setEarnedDraft((p) => {
                    const { [code]: _, ...rest } = p;
                    return rest;
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "center",
                  font: `700 13px ${T.poppins}`,
                  padding: "2px",
                  height: 26,
                  boxSizing: "border-box",
                  borderRadius: 9,
                  border: `1.5px solid ${T.divider}`,
                  background: "#fff",
                  color: T.text,
                  outline: "none",
                }}
              />
              <Box
                component="button"
                type="button"
                aria-label={`More ${code}`}
                onClick={() => setValueHrs(code, valHrs + toHours(stepSize, unit))}
                sx={stepBtnSx}
              >
                +
              </Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "end", mx: "10px", mb: 1, pt: 1, borderTop: `1px solid ${T.divider}`, fontFamily: T.poppins }}>
              <Box>
                <Typography component="small" sx={{ display: "block", fontSize: "0.6rem", color: T.muted, fontFamily: T.poppins }}>Before</Typography>
                <Typography component="b" sx={{ fontSize: "0.8rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", fontFamily: T.poppins }}>{fmtU(remaining)}</Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography component="small" sx={{ display: "block", fontSize: "0.6rem", color: T.muted, fontFamily: T.poppins }}>After</Typography>
                <Typography component="b" sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#2e7d32", fontVariantNumeric: "tabular-nums", fontFamily: T.poppins }}>{fmtU(remaining + valHrs)}</Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, p: "4px 2px 2px" }}>
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
      {!employeeGender && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, mb: 0.75 }}>
          <WarningIcon sx={{ fontSize: 12, color: "#e65100" }} />
          <Typography sx={{ fontSize: "0.64rem", color: "#e65100", fontWeight: 700, fontFamily: T.poppins }}>
            No gender on file — gender-restricted leave types are hidden.
          </Typography>
        </Box>
      )}
      {error && <Alert severity="error" sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.75rem", py: 0 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.75rem", py: 0 }}>{success}</Alert>}
      {leaveTypes.length > 0 && visibleLeaveTypes.length === 0 && (
        <Alert severity="warning" sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.75rem", py: 0 }}>
          No leave types available for this employee — gender missing or none match. Update Leave Table or personnel gender.
        </Alert>
      )}

      <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins, mb: 1 }}>
        SL and VL are computed from this month&apos;s attendance (1.25 d a month, less leave without pay). Tap a leave to add it or skip it.
      </Typography>
      {baseLeaves.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: "9px" }}>
          {baseLeaves.map((lt) => renderCard(lt, true))}
        </Box>
      )}
      {otherLeaves.length > 0 && (
        <>
          <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontFamily: T.poppins, mt: 1.75, mb: 1 }}>
            Other leaves
            {hiddenLeaveTypesForPrompt.length > 0 && (
              <Tooltip title={hiddenLeaveTypesForPrompt.map((r) => `${r.code} (${r.who})`).join(" · ")} arrow>
                <Box component="span" sx={{ ml: 0.75, fontSize: "0.62rem", color: T.faint, cursor: "help" }}>
                  · {hiddenLeaveTypesForPrompt.length} hidden by gender
                </Box>
              </Tooltip>
            )}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: "7px" }}>
            {otherLeaves.map((lt) => renderCard(lt, false))}
          </Box>
        </>
      )}

      {proposal && (
        <Box sx={{ mt: 1.5, p: 1.1, borderRadius: "10px", bgcolor: "rgba(0,0,0,0.025)", border: `1px solid ${T.divider}` }}>
          <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontFamily: T.poppins, lineHeight: 1.5 }}>
            <b>{proposal.category?.label || proposal.typeLabel || "Category not mapped"}</b>
            {" · "}Leave without pay this month: <b>{proposal.lwop.days.toFixed(3)} d</b> ({proposal.lwop.hours.toFixed(3)} h unpaid
            {proposal.lwop.tardinessHours > 0 ? `, incl. ${proposal.lwop.tardinessHours.toFixed(3)} h tardiness charged to salary` : ""})
            {" · "}{proposal.codes?.VL?.formula || proposal.codes?.SL?.formula || proposal.codes?.VL?.reason}
          </Typography>
          {(proposal.warnings || []).map((w) => (
            <Typography key={w} sx={{ fontSize: "0.66rem", color: "#8a5d06", fontFamily: T.poppins, mt: 0.4 }}>{w}</Typography>
          ))}
        </Box>
      )}

      {overrideCodes.length > 0 && (
        <Box sx={{ mt: 1.25, p: 1.25, borderRadius: "10px", bgcolor: "#fff8e6", border: "1px solid #f3d38a" }}>
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#8a5d06", fontFamily: T.poppins, mb: 0.75 }}>
            Override: {overrideCodes.join(", ")} differ{overrideCodes.length === 1 ? "s" : ""} from the CSC computation
          </Typography>
          <FieldInput
            size="small"
            fullWidth
            required
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Reason for the override (required, saved with the earning)"
            error={overrideMissing}
          />
        </Box>
      )}

      <FieldInput
        size="small"
        fullWidth
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Remarks (optional)"
        sx={{ mt: 1.5 }}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 1.5, pt: 1.25, borderTop: `1px solid ${T.divider}`, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1 }}>
          <Typography component="small" sx={{ display: "block", color: T.muted, fontSize: "0.72rem", fontFamily: T.poppins }}>You will add</Typography>
          <Typography component="b" sx={{ fontSize: "1.15rem", fontWeight: 800, color: "#2e7d32", fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
            {toUnit(totalToAddHrs).toFixed(2)} {unitWord}
          </Typography>
        </Box>
        <Button
          size="small"
          onClick={() => {
            setEarnedHours({});
            setEarnedDraft({});
            setUserTouched({});
          }}
          sx={{ textTransform: "none", fontFamily: T.poppins, fontWeight: 600, fontSize: "0.74rem", color: T.accent, border: `1.5px solid ${T.accent}`, borderRadius: "9px", px: 1.75, "&:hover": { bgcolor: T.accent, color: "#fff" } }}
        >
          Clear all
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          disabled={loading || postable.length === 0 || overrideMissing}
          startIcon={loading ? <CircularProgress size={13} sx={{ color: "#fff" }} /> : null}
          sx={{ textTransform: "none", fontFamily: T.poppins, fontWeight: 600, fontSize: "0.74rem", bgcolor: T.accent, borderRadius: "9px", px: 1.75, boxShadow: "none", "&:hover": { bgcolor: T.accentDark, boxShadow: "none" } }}
        >
          {loading ? "Posting…" : "Post earnings"}
        </Button>
      </Box>
    </Box>
  );
};

const stepBtnSx = {
  all: "unset",
  boxSizing: "border-box",
  flex: "none",
  width: 26,
  height: 26,
  borderRadius: "9px",
  border: `1.5px solid ${T.divider}`,
  bgcolor: "#fff",
  color: T.text,
  textAlign: "center",
  lineHeight: "22px",
  font: `600 14px ${T.poppins}`,
  cursor: "pointer",
  "&:hover": { bgcolor: T.accent, color: "#fff" },
  "&:focus-visible": { outline: `2px solid ${T.accent}` },
};

export { LeaveInputColumn };