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
  onRefresh, onRecordsRefresh, empCat, vlReceiptRefreshKey, balanceRefreshKey,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fields, setFields] = useState({});

  const [liveBalances, setLiveBalances] = useState({ vl: null, sc: null, cto: null });
const [balLoading, setBalLoading] = useState(false);

const fetchLiveBalances = useCallback(async () => {
  if (!employee) return;
  setBalLoading(true);
  const token = localStorage.getItem("token");
  try {
    const [assignRes, scRes, ctoRes] = await Promise.allSettled([
      axios.get(`${API_BASE_URL}/api/earnings/assignment-balances/${employee.employeeNumber}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_BASE_URL}/api/earnings/sc/${employee.employeeNumber}/balance`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_BASE_URL}/api/earnings/cto/${employee.employeeNumber}/balance`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    setLiveBalances({
      vl: assignRes.status === "fulfilled" ? (toNum(assignRes.value.data?.VL?.remaining_hours) / 8).toFixed(3) : "—",
      sc: scRes.status === "fulfilled" ? (toNum(scRes.value.data?.totalRemaining) / 8).toFixed(3) : "—",
      cto: ctoRes.status === "fulfilled" ? (toNum(ctoRes.value.data?.totalRemaining) / 8).toFixed(3) : "—",
    });
  } catch {
    setLiveBalances({ vl: "—", sc: "—", cto: "—" });
  } finally {
    setBalLoading(false);
  }
}, [employee]);

useEffect(() => { fetchLiveBalances(); }, [fetchLiveBalances, balanceRefreshKey]);

  const raw = attendanceData?.summary;
  const calDays = getCalendarDays(year, month);

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

  const handleSave = async () => {
    if (!raw?.id) {
      setError("No record to update.");
      return;
    }
    setSaving(true);
    setError("");
    const token = localStorage.getItem("token");
    const payload = {
      personID: employee.employeeNumber,
      startDate: raw.startDate,
      endDate: raw.endDate,
    };
    ATTEND_FIELDS.forEach(({ key }) => {
      payload[key] = hoursToHHMM(toNum(fields[key]));
    });
    try {
      await axios.put(
        `${API_BASE_URL}/attendance/api/overall_attendance_record/${raw.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSuccess("Saved!");
      setEditing(false);
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Save failed: " + (err.response?.data?.message || err.message));
    }
    setSaving(false);
  };

  if (!employee)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ColHeader
          icon={DateRangeIcon}
          label="Attendance Summary"
          color={T.muted}
        />
      </Box>
    );

    

  if (attendanceLoading)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ColHeader
          icon={DateRangeIcon}
          label="Attendance Summary"
          color={T.muted}
        />
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

  const overallHrs = raw ? parseHHMM(raw.overallRenderedOfficialTime) : 0;
  const tardHrs = raw ? parseHHMM(raw.overallRenderedOfficialTimeTardiness) : 0;
  const stats = attendanceData?.stats || {};
  const lateDays = toNum(stats.late_days);
  const absentDays = toNum(stats.absent_days);
  const presentDays = toNum(stats.present_days);
  const hasWarning = absentDays > 0 || tardHrs > 0;

  const editOverallHrs = toNum(
    fields.overallRenderedOfficialTime ?? overallHrs,
  );
  const editTardHrs = toNum(
    fields.overallRenderedOfficialTimeTardiness ?? tardHrs,
  );

  const half = Math.ceil(ATTEND_FIELDS.length / 2);
  const col1 = ATTEND_FIELDS.slice(0, half);
  const col2 = ATTEND_FIELDS.slice(half);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <ColHeader icon={DateRangeIcon} label="Attendance Summary" color={T.muted}>
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
    {success && (
      <Typography sx={{ fontSize: "0.58rem", color: "#2e7d32", fontFamily: T.poppins, fontWeight: 700 }}>
        {success}
      </Typography>
    )}
    {!editing ? (
      <Button
        variant="contained"
        size="small"
        onClick={() => setEditing(true)}
        sx={{
          fontSize: "0.7rem", fontWeight: 700, color: "#fff",
          textTransform: "none", fontFamily: T.poppins,
          px: 1, py: 0.4, minWidth: 0, borderRadius: 1,
          bgcolor: T.accent, boxShadow: "none", lineHeight: 1.6,
          "&:hover": { bgcolor: T.accentDark, boxShadow: "none" },
        }}
      >
        Edit
      </Button>
    ) : (
      <>
        <Button
          size="small"
          onClick={() => setEditing(false)}
          sx={{
            fontSize: "0.7rem", fontWeight: 600, color: T.muted,
            textTransform: "none", fontFamily: T.poppins,
            px: 1, py: 0.4, minWidth: 0, borderRadius: 1, lineHeight: 1.6,
          }}
        >
          Cancel
        </Button>
        <Button
          size="small"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={10} /> : <SaveIcon sx={{ fontSize: "12px !important" }} />}
          sx={{
            fontSize: "0.7rem", fontWeight: 700, color: "#fff",
            textTransform: "none", fontFamily: T.poppins,
            px: 1.5, py: 0.4, minWidth: 0, borderRadius: 1, lineHeight: 1.6,
            bgcolor: T.accent, "&:hover": { bgcolor: T.accentDark },
          }}
        >
          {saving ? "…" : "Save"}
        </Button>
      </>
    )}
    <IconButton
      size="small"
      onClick={onRefresh}
      sx={{ p: 0.3, color: T.muted }}
    >
      <RefreshIcon sx={{ fontSize: 13 }} />
    </IconButton>
  </Box>
</ColHeader>

      {/* ── Scrollable content area ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1.25,
          pt: 1,
          pb: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
          "&::-webkit-scrollbar": { width: 3 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(0,0,0,0.12)",
            borderRadius: 2,
          },
        }}
      >
        {!raw ? (
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
        ) : (
          <>
           {/* Date range + cal days + Edit button in one row */}
<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
  <CalIcon sx={{ fontSize: 10, color: T.faint }} />
  <Typography
    sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins, flex: 1 }}
  >
    {raw.startDate} → {raw.endDate} · <strong>{calDays} cal. days</strong>
  </Typography>
</Box>
            

          {/* ── Summary card (compact) ── */}
<Box
  sx={{
    borderRadius: 1.5,
    border: `1px solid rgba(0,0,0,0.1)`,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    flexShrink: 0,
    position: "relative",
  }}
>
              <Box sx={{ display: "flex", alignItems: "stretch" }}>
                {/* Month pill */}
                <Box
                  sx={{
                    px: 1,
                    py: 0.85,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 44,
                    flexShrink: 0,
                    borderRight: "1px solid rgba(0,0,0,0.07)",
                    bgcolor: hasWarning ? "#fdf6f6" : "#f7faf7",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: hasWarning ? T.accent : "#2e7d32",
                      fontFamily: T.poppins,
                      letterSpacing: "0.06em",
                      lineHeight: 1,
                    }}
                  >
                    {monthShort(month)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.54rem",
                      color: T.faint,
                      fontFamily: T.poppins,
                      mt: 0.2,
                      fontWeight: 500,
                    }}
                  >
                    {year}
                  </Typography>
                </Box>

                {/* Rendered */}
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.85,
                    borderRight: "1px solid rgba(0,0,0,0.07)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    minWidth: 80,
                    bgcolor: "#fff",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.52rem",
                      fontWeight: 700,
                      color: T.faint,
                      fontFamily: T.poppins,
                      textTransform: "uppercase",
                      letterSpacing: "0.09em",
                      mb: 0.2,
                    }}
                  >
                    Rendered
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.3 }}>
                    <Typography
                      sx={{
                        fontSize: "1rem",
                        fontWeight: 800,
                        color: "#111",
                        fontFamily: T.poppins,
                        lineHeight: 1,
                      }}
                    >
                      {(overallHrs / 8).toFixed(3)}
                    </Typography>
                    <Typography
                      sx={{ fontSize: "0.56rem", fontWeight: 600, color: T.faint, fontFamily: T.poppins }}
                    >
                      d
                    </Typography>
                  </Box>
                  <Typography
                    sx={{ fontSize: "0.58rem", color: "#1565c0", fontFamily: T.poppins, fontWeight: 700, mt: 0.1, letterSpacing: "0.02em" }}
                  >
                    {hrsToHMS(overallHrs)}
                  </Typography>
                </Box>

                {/* Stats */}
                <Box sx={{ flex: 1, display: "flex", alignItems: "stretch" }}>
                  {[
                    presentDays > 0 && {
                      count: presentDays,
                      sub: hrsToHMS(presentDays * 8),
                      label: "Present",
                      Icon: PresentIcon,
                      accent: "#2e7d32",
                      bg: "#f7faf7",
                      border: "rgba(46,125,50,0.18)",
                    },
                    tardHrs > 0 && {
                      count: (tardHrs / 8).toFixed(3),
                      sub: hrsToHMS(tardHrs),
                      label: "Late",
                      Icon: LateIcon,
                      accent: "#c62828",
                      bg: "#fdf6f6",
                      border: "rgba(198,40,40,0.18)",
                    },
                    absentDays > 0 && {
                      count: absentDays,
                      sub: hrsToHMS(absentDays * 8),
                      label: "Absent",
                      Icon: AbsentIcon,
                      accent: "#6a1b9a",
                      bg: "#faf5fd",
                      border: "rgba(106,27,154,0.18)",
                    },
                  ]
                    .filter(Boolean)
                    .map(({ count, sub, label, Icon, accent, bg, border }) => (
                      <Box
                        key={label}
                        sx={{
                          flex: 1,
                          py: 0.75,
                          px: 0.5,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: bg,
                          borderRight: `1px solid ${border}`,
                          borderLeft: `1px solid ${border}`,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, mb: 0.25 }}>
                          <Icon sx={{ fontSize: 9, color: accent, opacity: 0.7 }} />
                          <Typography
                            sx={{
                              fontSize: "0.5rem", fontWeight: 700, color: accent,
                              fontFamily: T.poppins, textTransform: "uppercase",
                              letterSpacing: "0.09em", opacity: 0.85,
                            }}
                          >
                            {label}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{ fontSize: "1.05rem", fontWeight: 800, color: accent, fontFamily: T.poppins, lineHeight: 1 }}
                        >
                          {count}
                        </Typography>
                        <Typography
                          sx={{ fontSize: "0.54rem", color: "#1565c0", fontFamily: T.poppins, fontWeight: 700, mt: 0.2, letterSpacing: "0.02em" }}
                        >
                          {sub}
                        </Typography>
                      </Box>
                    ))}
                  {presentDays === 0 && absentDays === 0 && tardHrs === 0 && (
                    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, fontStyle: "italic" }}>
                        No stats
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

{/* ── Edit fields (shown only when editing) ── */}
{editing && (
  <Box
    sx={{
      borderRadius: 1.5,
      border: "1px solid rgba(0,0,0,0.1)",
      bgcolor: "#fafafa",
      overflow: "hidden",
      flexShrink: 0,
    }}
  >
    <Box sx={{ px: 1.25, py: 0.5, bgcolor: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
      <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: T.muted, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Edit Record
      </Typography>
    </Box>
    <Box sx={{ px: 0.85, pb: 0.85 }}>
      {error && (
        <Alert severity="error" sx={{ mt: 0.5, mb: 0.5, fontSize: "0.65rem", py: 0, borderRadius: 1 }}>
          {error}
        </Alert>
      )}
      <Typography sx={{ fontSize: "0.54rem", fontWeight: 700, color: "#1565c0", fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em", mt: 0.6, mb: 0.4 }}>
        Input in days · {calDays} calendar days
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "2fr 2fr", gap: "0 8px" }}>
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
    </Box>
  </Box>
)}

{/* ── Leave Balances (shown when NOT editing) ── */}
{!editing && (
  <Box
    sx={{
      borderRadius: 1.5,
      border: "1px solid rgba(0,0,0,0.1)",
      overflow: "hidden",
      flexShrink: 0,
    }}
  >
    <Box
      sx={{
        px: 1.25, py: 0.5,
        bgcolor: "rgba(0,0,0,0.03)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        display: "flex", alignItems: "center", gap: 0.5,
      }}
    >
      <EarnIcon sx={{ fontSize: 11, color: T.muted }} />
      <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: T.muted, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em", flex: 1 }}>
        Leave Balances
      </Typography>
      {balLoading && <CircularProgress size={9} sx={{ color: T.muted }} />}
    </Box>
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
      {[
        { label: "VL",  icon: LeaveIcon, color: "#1565c0", bg: "rgba(21,101,192,0.05)",  border: "rgba(21,101,192,0.15)",  val: liveBalances.vl },
        { label: "SC",  icon: SCIcon,    color: "#2e7d32", bg: "rgba(46,125,50,0.05)",   border: "rgba(46,125,50,0.15)",   val: liveBalances.sc },
        { label: "CTO", icon: CTOIcon,   color: "#6a1b9a", bg: "rgba(106,27,154,0.05)", border: "rgba(106,27,154,0.15)",  val: liveBalances.cto },
      ].map(({ label, icon: Icon, color, bg, border, val }, idx, arr) => {
        const num = parseFloat(val);
        const isNeg = Number.isFinite(num) && num < 0;
        const displayColor = isNeg ? "#c62828" : color;
        return (
          <Box
            key={label}
            sx={{
              py: 0.85, px: 1,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              bgcolor: bg,
              borderRight: idx < arr.length - 1 ? `1px solid ${border}` : "none",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, mb: 0.3 }}>
              <Icon sx={{ fontSize: 9, color, opacity: 0.75 }} />
              <Typography sx={{ fontSize: "0.5rem", fontWeight: 700, color, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.09em", opacity: 0.85 }}>
                {label}
              </Typography>
            </Box>
            {balLoading ? (
              <Box sx={{ height: 20, display: "flex", alignItems: "center" }}>
                <CircularProgress size={10} sx={{ color }} />
              </Box>
            ) : (
              <Typography sx={{ fontSize: "1.05rem", fontWeight: 800, color: displayColor, fontFamily: T.poppins, lineHeight: 1 }}>
                {val ?? "—"}
              </Typography>
            )}
            <Typography sx={{ fontSize: "0.52rem", color: T.faint, fontFamily: T.poppins, fontWeight: 500, mt: 0.2 }}>
              {isNeg ? "salary deduct" : "balance"}
            </Typography>
          </Box>
        );
      })}
    </Box>
  </Box>
)}
            {/* ── Deduction Receipt ── */}
            <DeductionReceiptSwitcher
              employee={employee}
              attendanceData={attendanceData}
              year={year}
              month={month}
              onDeductSuccess={() => {
                if (onRefresh) onRefresh();
                if (onRecordsRefresh) onRecordsRefresh();
              }}
              refreshKey={vlReceiptRefreshKey}
              empCat={empCat}
            />
          </>
        )}
      </Box>
    </Box>
  );
};


export { AttendanceSummary };