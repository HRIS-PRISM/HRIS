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

const CompactInputGrid = ({
  fields,
  unit,
  values,
  drafts,
  onDraftChange,
  onCommit,
}) => {
  const rows = [];
  for (let i = 0; i < fields.length; i += 4) rows.push(fields.slice(i, i + 4));
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {rows.map((row, ri) => (
        <Box
          key={ri}
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${row.length}, 1fr)`,
            gap: 0.75,
          }}
        >
          {row.map((field) => {
            const val = toNum(values[field.key]);
            const draft = drafts[field.key];
            const isActive = val > 0;
            const displayVal =
              draft !== undefined
                ? draft
                : val === 0
                  ? ""
                  : unit === "days"
                    ? String(parseFloat((val / 8).toFixed(3)))
                    : String(val);
            return (
              <Box
                key={field.key}
                sx={{
                  borderRadius: 1.5,
                  border: `1.5px solid ${isActive ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.1)"}`,
                  bgcolor: isActive ? "rgba(0,0,0,0.02)" : "#fafafa",
                  overflow: "hidden",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.35,
                    bgcolor: isActive ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.03)",
                    borderBottom: `1px solid ${isActive ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.07)"}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      color: isActive ? "#1a1a1a" : T.muted,
                      fontFamily: T.poppins,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                    noWrap
                  >
                    {field.label}
                  </Typography>
                  {field.subtitle && (
                    <Typography
                      sx={{
                        fontSize: "0.54rem",
                        color: T.faint,
                        fontFamily: T.poppins,
                      }}
                      noWrap
                    >
                      {field.subtitle}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ px: 0.65, py: 0.4 }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={unit === "days" ? "0.000 d" : "0.000 h"}
                    value={displayVal}
                    onChange={(e) => {
                      onDraftChange(field.key, e.target.value);
                      const n = parseFloat(e.target.value);
                      if (!isNaN(n)) onCommit(field.key, toHours(n, unit));
                      else onCommit(field.key, 0);
                    }}
                    onFocus={() => onDraftChange(field.key, displayVal)}
                    onBlur={() => {
                      const n = parseFloat(draft ?? displayVal);
                      onCommit(field.key, isNaN(n) ? 0 : toHours(n, unit));
                      onDraftChange(field.key, undefined);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    style={{
                      width: "100%",
                      padding: "4px 6px",
                      borderRadius: 5,
                      border: `1px solid ${isActive ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.1)"}`,
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      outline: "none",
                      fontFamily: T.poppins,
                      boxSizing: "border-box",
                      background: "#fff",
                      color: "#1a1a1a",
                    }}
                  />
                  {isActive && (
                    <Typography
                      sx={{
                        fontSize: "0.58rem",
                        color: "#444",
                        fontWeight: 700,
                        fontFamily: T.poppins,
                        textAlign: "right",
                        mt: 0.2,
                      }}
                    >
                      {unit === "days"
                        ? `${(val / 8).toFixed(3)}d`
                        : `${val.toFixed(3)}h`}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

// ─── Shared attendance fetcher ─────────────────────────────────────────────────
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
  } catch {}
  if (earningsData?.summary) return earningsData;
  const attempts = [
    { s: startOfMonth, e: endOfMonth },
    {
      s: `${year}-${String(month).padStart(2, "0")}-01`,
      e: (() => {
        const d = new Date(year, month, 5);
        return d.toISOString().split("T")[0];
      })(),
    },
  ];
  for (const { s, e } of attempts) {
    try {
      const r2 = await axios.get(
        `${API_BASE_URL}/attendance/api/overall_attendance_record`,
        {
          params: { personID: employeeNumber, startDate: s, endDate: e },
          headers,
        },
      );
      const rows = r2.data?.data || (Array.isArray(r2.data) ? r2.data : []);
      if (rows.length > 0)
        return {
          ...(earningsData || {}),
          summary: rows[0],
          stats: earningsData?.stats || {},
          dailyRecords: earningsData?.dailyRecords || [],
        };
    } catch {}
  }
  return earningsData;
};

// ─── Leave Input Column ────────────────────────────────────────────────────────

const SCInputColumn = ({
  employee,
  empCatMap,
  unit,
  year,
  month,
  onRecordsRefresh,
}) => {
  const [otTypes, setOtTypes] = useState([]);
  const [otValues, setOtValues] = useState({});
  const [otDrafts, setOtDrafts] = useState({});
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const calDays = getCalendarDays(year, month);
  const empCat = employee ? empCatMap[String(employee.employeeNumber)] : null;

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${API_BASE_URL}/api/earnings/ot-types`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) =>
        setOtTypes(
          Array.isArray(r.data) && r.data.length > 0
            ? r.data
            : [
                { id: "regular", name: "Regular OT", multiplier: 1 },
                { id: "holiday", name: "Holiday OT", multiplier: 1 },
                {
                  id: "night_diff",
                  name: "Night Differential OT",
                  multiplier: 1,
                },
              ],
        ),
      )
      .catch(() =>
        setOtTypes([
          { id: "regular", name: "Regular OT", multiplier: 1 },
          { id: "holiday", name: "Holiday OT", multiplier: 1 },
          { id: "night_diff", name: "Night Differential OT", multiplier: 1 },
        ]),
      );
  }, []);

  useEffect(() => {
    setOtValues({});
    setOtDrafts({});
    setRemarks("");
    setError("");
  }, [employee, year, month]);

  const computedSC = useMemo(() => {
    let totalOT = 0,
      totalSC = 0;
    otTypes.forEach((t) => {
      const ot = toNum(otValues[t.id]);
      totalOT += ot;
      totalSC += ot * (t.multiplier || 1);
    });
    return { totalOT, total: parseFloat(totalSC.toFixed(3)) };
  }, [otValues, otTypes]);

  /** Stored on `sc_earnings.sc_type` — same default for all employment categories (no tempo/leave-only split). */
  const payloadScType = "non_commutative";

  const handleSave = async () => {
    if (!employee) {
      setError("Select an employee first");
      return;
    }
    if (computedSC.total <= 0) {
      setError("OT hours must be > 0");
      return;
    }
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_BASE_URL}/api/earnings/sc`,
        {
          employeeNumber: employee.employeeNumber,
          sc_type: payloadScType,
          ot_hours_regular: toNum(
            otValues["regular"] || otValues[otTypes[0]?.id],
          ),
          ot_hours_holiday: toNum(
            otValues["holiday"] || otValues[otTypes[1]?.id],
          ),
          ot_hours_night_diff: toNum(
            otValues["night_diff"] || otValues[otTypes[2]?.id],
          ),
          total_ot_hours: computedSC.totalOT,
          earned_hours: computedSC.total,
          period_year: parseInt(year, 10) || new Date().getFullYear(),
          period_month: parseInt(month, 10),
          remarks: remarks || null,
          emp_category_snapshot: {
            label: empCat?.label || "",
            colorHex: empCat?.colorHex,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSuccess(
        `${fmtHrs(computedSC.total, unit)} SC submitted for ${monthName(month)} ${year}.`,
      );
      setOtValues({});
      setOtDrafts({});
      setRemarks("");
      if (onRecordsRefresh) onRecordsRefresh();
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError("Failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!employee)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ColHeader
          icon={SCIcon}
          label="Service Credit Input"
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
          <SCIcon sx={{ fontSize: 36, color: alpha(T.accent, 0.15), mb: 1 }} />
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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ColHeader icon={SCIcon} label="Service Credit Input" color={T.accent} />
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1.5,
          pt: 1.25,
          pb: 1,
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
        <Box
          sx={{
            mb: 0.75,
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
            {monthName(month)} {year} — {calDays} days ({calDays * 8}h max)
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: "0.6rem",
            fontWeight: 800,
            color: T.faint,
            fontFamily: T.poppins,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            mb: 0.5,
          }}
        >
          OT Hours Input
        </Typography>
        <CompactInputGrid
          fields={otTypes.map((t) => ({
            key: t.id,
            label: t.name,
            subtitle: `×${t.multiplier || 1} → SC`,
          }))}
          unit={unit}
          values={otValues}
          drafts={otDrafts}
          onDraftChange={(key, val) =>
            setOtDrafts((p) =>
              val === undefined
                ? (({ [key]: _, ...rest }) => rest)(p)
                : { ...p, [key]: val },
            )
          }
          onCommit={(key, val) => setOtValues((p) => ({ ...p, [key]: val }))}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0.75,
            mt: 1,
            px: 1,
            py: 0.75,
            borderRadius: 1.5,
            bgcolor: "rgba(0,0,0,0.03)",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "0.58rem",
                color: T.faint,
                fontFamily: T.poppins,
                textTransform: "uppercase",
              }}
            >
              Total OT
            </Typography>
            <Typography
              sx={{
                fontSize: "0.82rem",
                fontWeight: 800,
                color: "#1a1a1a",
                fontFamily: T.poppins,
              }}
            >
              {computedSC.totalOT.toFixed(3)}h
            </Typography>
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: "0.58rem",
                color: T.faint,
                fontFamily: T.poppins,
                textTransform: "uppercase",
              }}
            >
              SC Earned
            </Typography>
            <Typography
              sx={{
                fontSize: "0.82rem",
                fontWeight: 900,
                color: computedSC.total > 0 ? "#1a1a1a" : T.faint,
                fontFamily: T.poppins,
              }}
            >
              {computedSC.total > 0 ? fmtHrs(computedSC.total, unit) : "—"}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          px: 1.5,
          pb: 1.5,
          pt: 0.75,
          borderTop: `1px solid ${T.divider}`,
        }}
      >
        <FieldInput
          size="small"
          fullWidth
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Remarks (optional)"
          sx={{ mb: 0.75 }}
        />
        <AccentButton
          variant="contained"
          fullWidth
          onClick={handleSave}
          disabled={loading || computedSC.total <= 0}
          startIcon={
            loading ? (
              <CircularProgress size={14} sx={{ color: "#fff" }} />
            ) : (
              <AddIcon sx={{ fontSize: "15px !important" }} />
            )
          }
          sx={{
            height: 36,
            bgcolor: computedSC.total > 0 ? T.accent : "#c0c0c0",
            color: "#fff",
            fontFamily: T.poppins,
            fontSize: "0.78rem",
            "&:hover": {
              bgcolor: computedSC.total > 0 ? T.accentDark : "#c0c0c0",
            },
            "&:disabled": {
              bgcolor: "#c0c0c0 !important",
              color: "#888 !important",
            },
          }}
        >
          {loading
            ? "Saving…"
            : computedSC.total > 0
              ? `Submit ${fmtHrs(computedSC.total, unit)} SC →`
              : "Enter OT hours above"}
        </AccentButton>
      </Box>
    </Box>
  );
};

// ─── CTO Input Column ──────────────────────────────────────────────────────────

export { SCInputColumn };