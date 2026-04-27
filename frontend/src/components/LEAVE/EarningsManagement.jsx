import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
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

// ─── Theme ────────────────────────────────────────────────────────────────────
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
  const displayVal = draft !== null ? draft : value === 0 ? "" : String(value);
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder ?? String(min)}
      value={displayVal}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const num = parseInt(raw, 10);
        if (!isNaN(num)) {
          let c = Math.max(num, min);
          if (max !== undefined) c = Math.min(c, max);
          onChange(c);
        }
      }}
      onFocus={(e) => {
        setDraft(value === 0 ? "" : String(value));
        e.target.select();
      }}
      onBlur={() => {
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
  const displayVal = draft !== null ? draft : value === 0 ? "" : String(value);
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder ?? "0"}
      value={displayVal}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const num = parseFloat(raw);
        if (!isNaN(num)) {
          let c = Math.max(num, min);
          if (max !== undefined) c = Math.min(c, max);
          onChange(c);
        }
      }}
      onFocus={(e) => {
        setDraft(value === 0 ? "" : String(value));
        e.target.select();
      }}
      onBlur={() => {
        let num = parseFloat(draft ?? "") || 0;
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
            position: "fixed",
            bottom: 70,
            right: 32,
            zIndex: 9999,
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
    </Box>
  );
};

// ─── Attendance Edit Field Cell ───────────────────────────────────────────────
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
          py: 0.3,
          bgcolor: isActive ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.02)",
          borderBottom: `1px solid ${isActive ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)"}`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.62rem",
            fontWeight: 700,
            color: isActive ? "#333" : T.faint,
            fontFamily: T.poppins,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {" "}
          {f.label}
        </Typography>
      </Box>
      {/* Input + hints */}
      <Box
        sx={{
          px: 0.85,
          py: 0.55,
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
              padding: "5px 24px 5px 8px",
              borderRadius: 6,
              border: `1.5px solid ${focused ? T.accent : isActive ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.1)"}`,
              fontSize: "0.8rem",
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
              fontSize: "0.62rem",
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
            minWidth: 62,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.63rem",
              color: isActive ? T.muted : T.faint,
              fontFamily: T.poppins,
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {isActive ? `${valueHrs.toFixed(3)} hrs` : "—"}
          </Typography>
          {hms && (
            <Typography
              sx={{
                fontSize: "0.63rem",
                color: "#1565c0",
                fontFamily: T.poppins,
                fontWeight: 700,
                lineHeight: 1.4,
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

// ─── VL Deduction Receipt ─────────────────────────────────────────────────────
const VLDeductionReceipt = ({
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
  const [vlBalance, setVlBalance] = useState(null);
  const [balLoading, setBalLoading] = useState(false);
  const [existingDeductions, setExistingDeductions] = useState([]);
  const [deductionsLoading, setDeductionsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!employee) {
      setVlBalance(null);
      return;
    }
    setBalLoading(true);
    const token = localStorage.getItem("token");
    try {
      const r = await axios.get(
        `${API_BASE_URL}/api/earnings/assignment-balances/${employee.employeeNumber}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const vl = r.data?.VL;
      setVlBalance(vl ? toNum(vl.remaining_hours) / 8 : 0);
    } catch {
      setVlBalance(0);
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
        `${API_BASE_URL}/api/earnings/leave/${employee.employeeNumber}?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const all = r.data?.earnings || [];
      setExistingDeductions(
        all.filter(
          (e) =>
            e.entry_type === "TARDINESS_DEDUCTION" &&
            e.leave_code === "VL" &&
            e.earn_status !== "rejected",
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
  const tardDays = tardHrs / 8;
  const tardDec = Number(tardDays.toFixed(3));
  const alreadyDeductedDays = existingDeductions.reduce(
    (sum, e) => sum + Math.abs(toNum(e.earned_hours)) / 8,
    0,
  );
  const alreadyDeductedDec = Number(alreadyDeductedDays.toFixed(3));
  const remainingToDeductDec = Number(
    Math.max(0, tardDec - alreadyDeductedDec).toFixed(3),
  );
  const vlBal = vlBalance !== null ? vlBalance : 0;
  const newBalance = Number((vlBal - remainingToDeductDec).toFixed(3));
  const isNegative = newBalance < 0;

  const hasFullyDeducted = tardDec > 0 && alreadyDeductedDec >= tardDec;
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
        `${API_BASE_URL}/api/earnings/leave`,
        {
          employeeNumber: employee.employeeNumber,
          leave_code: "VL",
          earned_hours: -(remainingToDeductDec * 8),
          period_year: parseInt(year, 10),
          period_month: parseInt(month, 10),
          entry_type: "TARDINESS_DEDUCTION",
          remarks: `Auto-deduction: tardiness ${remainingToDeductDec.toFixed(3)}d (${(remainingToDeductDec * 8).toFixed(3)}h / ${hrsToHMS(remainingToDeductDec * 8)}) for ${monthName(month)} ${year}`,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const newVL = Number(
        Math.max(0, vlBal - remainingToDeductDec).toFixed(3),
      );
      setDeductSuccess(
        `Deducted ${remainingToDeductDec.toFixed(3)}d from VL. New balance ≈ ${newVL.toFixed(3)}d.`,
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
  const isLoading = balLoading || deductionsLoading;

  // ── Receipt row helper ───────────────────────────────────────────────────────
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
            lineHeight: 1.4,
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
            VL Tardiness Deduction
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
          {/* Fully deducted banner */}
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
                  sx={{
                    fontSize: 13,
                    color: "#2e7d32",
                    flexShrink: 0,
                    mt: "1px",
                  }}
                />
              ) : (
                <PendingIcon
                  sx={{
                    fontSize: 13,
                    color: "#e65100",
                    flexShrink: 0,
                    mt: "1px",
                  }}
                />
              )}
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: hasApprovedDeduction ? "#1b5e20" : "#7a4a00",
                  fontFamily: T.poppins,
                  lineHeight: 1.4,
                }}
              >
                {hasApprovedDeduction
                  ? "Tardiness fully deducted & applied to VL balance."
                  : "Deduction submitted — pending approval."}
              </Typography>
            </Box>
          )}
          {/* Partial notice */}
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

          {/* ── INNER RECEIPT CARD ── */}
          <Box
            sx={{
              borderRadius: 1.25,
              border: "1px solid rgba(109,35,35,0.13)",
              bgcolor: "#fff",
              overflow: "hidden",
            }}
          >
            {/* Section: Deduct with */}
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
                label="Vacation Leave (VL)"
                sublabel={balLoading ? "Loading…" : "Current balance"}
                value={balLoading ? "…" : `${vlBal.toFixed(3)} d`}
                valueColor={vlBal > 0 ? "#1e4d20" : T.faint}
                bold
              />
            </Box>

            <Box
              sx={{ mx: 1.25, borderTop: "1px dashed rgba(109,35,35,0.15)" }}
            />

            {/* Section: You're about to deduct */}
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
                label="Tardiness (ABS)"
                sublabel={
                  tardHrs > 0
                    ? `${tardHrs.toFixed(3)} hrs · ${hrsToHMS(tardHrs)}`
                    : "No tardiness on record"
                }
                value={tardDec > 0 ? `− ${tardDec.toFixed(3)} d` : "0.000 d"}
                valueColor={tardDec > 0 ? "#c62828" : T.faint}
                dimmed={tardDec === 0}
              />
              {alreadyDeductedDec > 0 && (
                <RRow
                  label={`Already deducted (${existingDeductions[0]?.earn_status || "pending"})`}
                  value={`− ${alreadyDeductedDec.toFixed(3)} d `}
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

            {/* Total / New Balance */}
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
                    lineHeight: 1.3,
                  }}
                >
                  Total (New Balance)
                </Typography>
                {(isNegative ||
                  (hasFullyDeducted && vlBal - alreadyDeductedDec < 0)) && (
                  <Typography
                    sx={{
                      fontSize: "0.57rem",
                      color: "#c62828",
                      fontFamily: T.poppins,
                      fontWeight: 600,
                      mt: 0.2,
                      lineHeight: 1.4,
                      maxWidth: 160,
                    }}
                  >
                    Negative balance — excess will be deducted from salary
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
                    ? vlBal - alreadyDeductedDec < 0
                      ? "#c62828"
                      : vlBal - alreadyDeductedDec === 0
                        ? "#7a4a00"
                        : "#1e4d20"
                    : isNegative
                      ? "#c62828"
                      : newBalance === 0
                        ? "#7a4a00"
                        : "#1e4d20",
                }}
              >
                {hasFullyDeducted
                  ? `${Number((vlBal - alreadyDeductedDec).toFixed(3)).toFixed(3)} d`
                  : `${newBalance.toFixed(3)} d`}
              </Typography>
            </Box>
          </Box>

          {/* Note (only when about to deduct) */}
          {!hasFullyDeducted && tardDec > 0 && (
            <Box
              sx={{
                mt: 0.75,
                px: 1,
                py: 0.6,
                borderRadius: 1,
                bgcolor: "rgba(0,0,0,0.03)",
                border: "1px solid rgba(0,0,0,0.09)",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  color: T.faint,
                  fontFamily: T.poppins,
                  lineHeight: 1.55,
                }}
              >
                <strong style={{ color: "#c62828" }}>Note:</strong> If the new
                balance is negative (e.g. <em>−0.xxx d</em>), the employee does
                not have enough balance — the shortfall will be directly
                deducted from their salary.
              </Typography>
            </Box>
          )}

          {/* Action area */}
          {!hasFullyDeducted && tardDec > 0 && (
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
                  tardiness from VL balance
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
                Deduct to VL
              </Button>
            </Box>
          )}
          {deductSuccess && hasFullyDeducted && (
            <Alert
              severity="success"
              sx={{ mt: 0.75, py: 0, fontSize: "0.65rem", borderRadius: 1 }}
            >
              {deductSuccess}
            </Alert>
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
          Confirm VL Deduction
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
              Deduct tardiness from VL for{" "}
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
                  Vacation Leave (VL)
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#1e4d20",
                    fontFamily: T.poppins,
                  }}
                >
                  {vlBal.toFixed(3)} d
                </Typography>
              </Box>
              <Box
                sx={{ mx: 1.5, borderTop: "1px dashed rgba(109,35,35,0.15)" }}
              />
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
                      Tardiness (ABS)
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
                    − {remainingToDeductDec.toFixed(3)} d
                  </Typography>
                </Box>
              </Box>
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

// ─── Attendance Column ────────────────────────────────────────────────────────
const AttendanceColumn = ({
  employee,
  year,
  month,
  attendanceData,
  attendanceLoading,
  onRefresh,
  onRecordsRefresh,
  empCat,
  vlReceiptRefreshKey,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fields, setFields] = useState({});

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
      <ColHeader
        icon={DateRangeIcon}
        label="Attendance Summary"
        color={T.muted}
      >
        <IconButton
          size="small"
          onClick={onRefresh}
          sx={{ p: 0.3, color: T.muted }}
        >
          <RefreshIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </ColHeader>

      {/* ── NON-SCROLLABLE content area ── */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          px: 1.5,
          pt: 1.5,
          pb: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
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
            {raw.startDate && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CalIcon sx={{ fontSize: 11, color: T.faint }} />
                <Typography
                  sx={{
                    fontSize: "0.6rem",
                    color: T.faint,
                    fontFamily: T.poppins,
                  }}
                >
                  {raw.startDate} → {raw.endDate}
                </Typography>
              </Box>
            )}

            {/* ── Summary card ── */}
            <Box
              sx={{
                borderRadius: 2,
                border: `1px solid rgba(0,0,0,0.1)`,
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                flexShrink: 0,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "stretch" }}>
                {/* Month */}
                <Box
                  sx={{
                    px: 1.25,
                    py: 1.25,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 52,
                    flexShrink: 0,
                    borderRight: "1px solid rgba(0,0,0,0.07)",
                    bgcolor: hasWarning ? "#fdf6f6" : "#f7faf7",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
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
                      fontSize: "0.6rem",
                      color: T.faint,
                      fontFamily: T.poppins,
                      mt: 0.3,
                      fontWeight: 500,
                    }}
                  >
                    {year}
                  </Typography>
                  <Box
                    sx={{
                      mt: 0.6,
                      width: 18,
                      height: 2,
                      borderRadius: 1,
                      bgcolor: hasWarning ? T.accent : "#2e7d32",
                      opacity: 0.5,
                    }}
                  />
                </Box>

                {/* Rendered */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRight: "1px solid rgba(0,0,0,0.07)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    minWidth: 90,
                    bgcolor: "#fff",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.56rem",
                      fontWeight: 700,
                      color: T.faint,
                      fontFamily: T.poppins,
                      textTransform: "uppercase",
                      letterSpacing: "0.09em",
                      mb: 0.4,
                    }}
                  >
                    Rendered
                  </Typography>
                  <Box
                    sx={{ display: "flex", alignItems: "baseline", gap: 0.3 }}
                  >
                    <Typography
                      sx={{
                        fontSize: "1.15rem",
                        fontWeight: 800,
                        color: "#111",
                        fontFamily: T.poppins,
                        lineHeight: 1,
                      }}
                    >
                      {(overallHrs / 8).toFixed(3)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        color: T.faint,
                        fontFamily: T.poppins,
                      }}
                    >
                      d
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      color: T.muted,
                      fontFamily: T.poppins,
                      mt: 0.25,
                      fontWeight: 500,
                    }}
                  >
                    {overallHrs.toFixed(3)} hrs
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      color: "#1565c0",
                      fontFamily: T.poppins,
                      fontWeight: 700,
                      mt: 0.1,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {hrsToHMS(overallHrs)}
                  </Typography>
                </Box>

                {/* Cal days */}
                <Box
                  sx={{
                    px: 1.25,
                    py: 1.25,
                    borderRight: "1px solid rgba(0,0,0,0.07)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    minWidth: 48,
                    bgcolor: "#fff",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.56rem",
                      fontWeight: 700,
                      color: T.faint,
                      fontFamily: T.poppins,
                      textTransform: "uppercase",
                      letterSpacing: "0.09em",
                      mb: 0.4,
                    }}
                  >
                    Cal.
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1.15rem",
                      fontWeight: 800,
                      color: "#222",
                      fontFamily: T.poppins,
                      lineHeight: 1,
                    }}
                  >
                    {calDays}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.56rem",
                      color: T.faint,
                      fontFamily: T.poppins,
                      mt: 0.25,
                      fontWeight: 500,
                    }}
                  >
                    days
                  </Typography>
                </Box>

                {/* Stats */}
                <Box sx={{ flex: 1, display: "flex", alignItems: "stretch" }}>
                  {[
                    presentDays > 0 && {
                      count: presentDays,
                      sub1: `${(presentDays * 8).toFixed(3)} hrs`,
                      sub2: hrsToHMS(presentDays * 8),
                      label: "Present",
                      Icon: PresentIcon,
                      accent: "#2e7d32",
                      bg: "#f7faf7",
                      border: "rgba(46,125,50,0.18)",
                    },
                    tardHrs > 0 && {
                      count: (tardHrs / 8).toFixed(3),
                      sub1: `${tardHrs.toFixed(3)} hrs`,
                      sub2: hrsToHMS(tardHrs),
                      label: "Tardiness",
                      Icon: LateIcon,
                      accent: "#c62828",
                      bg: "#fdf6f6",
                      border: "rgba(198,40,40,0.18)",
                    },
                    absentDays > 0 && {
                      count: absentDays,
                      sub1: `${(absentDays * 8).toFixed(3)} hrs`,
                      sub2: hrsToHMS(absentDays * 8),
                      label: "Absent",
                      Icon: AbsentIcon,
                      accent: "#6a1b9a",
                      bg: "#faf5fd",
                      border: "rgba(106,27,154,0.18)",
                    },
                  ]
                    .filter(Boolean)
                    .map(
                      ({
                        count,
                        sub1,
                        sub2,
                        label,
                        Icon,
                        accent,
                        bg,
                        border,
                      }) => (
                        <Box
                          key={label}
                          sx={{
                            flex: 1,
                            py: 1.1,
                            px: 0.75,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: bg,
                            borderRight: `1px solid ${border}`,
                            borderLeft: `1px solid ${border}`,
                            gap: 0,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.4,
                              mb: 0.5,
                            }}
                          >
                            <Icon
                              sx={{ fontSize: 11, color: accent, opacity: 0.7 }}
                            />
                            <Typography
                              sx={{
                                fontSize: "0.56rem",
                                fontWeight: 700,
                                color: accent,
                                fontFamily: T.poppins,
                                textTransform: "uppercase",
                                letterSpacing: "0.09em",
                                opacity: 0.85,
                              }}
                            >
                              {label}
                            </Typography>
                          </Box>
                          <Typography
                            sx={{
                              fontSize: "1.2rem",
                              fontWeight: 800,
                              color: accent,
                              fontFamily: T.poppins,
                              lineHeight: 1,
                            }}
                          >
                            {count}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.56rem",
                              color: T.faint,
                              fontFamily: T.poppins,
                              mt: 0.3,
                              fontWeight: 500,
                            }}
                          >
                            {sub1}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.6rem",
                              color: "#1565c0",
                              fontFamily: T.poppins,
                              fontWeight: 700,
                              mt: 0.1,
                              letterSpacing: "0.02em",
                            }}
                          >
                            {sub2}
                          </Typography>
                        </Box>
                      ),
                    )}
                  {presentDays === 0 && absentDays === 0 && tardHrs === 0 && (
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.65rem",
                          color: T.faint,
                          fontFamily: T.poppins,
                          fontStyle: "italic",
                        }}
                      >
                        No stats
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

            {/* ── Edit Record ── */}
            <Box
              sx={{
                borderRadius: 1.5,
                border: "1px solid rgba(0,0,0,0.1)",
                bgcolor: "#fafafa",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  px: 1.25,
                  py: 0.6,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  bgcolor: "rgba(0,0,0,0.03)",
                  borderBottom: editing ? "1px solid rgba(0,0,0,0.1)" : "none",
                }}
              >
                <EditIcon sx={{ fontSize: 13, color: T.muted }} />
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    color: T.muted,
                    fontFamily: T.poppins,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    flex: 1,
                  }}
                >
                  Edit Record
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                  {success && (
                    <Typography
                      sx={{
                        fontSize: "0.6rem",
                        color: "#2e7d32",
                        fontFamily: T.poppins,
                        fontWeight: 700,
                      }}
                    >
                      {success}
                    </Typography>
                  )}
                  {!editing ? (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setEditing(true)}
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#fff",
                        textTransform: "none",
                        fontFamily: T.poppins,
                        px: 1.25,
                        py: 0.4,
                        minWidth: 0,
                        borderRadius: 1,
                        bgcolor: T.accent,
                        boxShadow: "none",
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
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: T.muted,
                          textTransform: "none",
                          fontFamily: T.poppins,
                          px: 1.25,
                          py: 0.4,
                          minWidth: 0,
                          borderRadius: 1,
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={
                          saving ? (
                            <CircularProgress size={10} />
                          ) : (
                            <SaveIcon sx={{ fontSize: "13px !important" }} />
                          )
                        }
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#fff",
                          textTransform: "none",
                          fontFamily: T.poppins,
                          px: 1.25,
                          py: 0.4,
                          minWidth: 0,
                          borderRadius: 1,
                          bgcolor: T.accent,
                          "&:hover": { bgcolor: T.accentDark },
                        }}
                      >
                        {saving ? "…" : "Save"}
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
              {editing && (
                <Box sx={{ px: 1, pb: 1 }}>
                  {error && (
                    <Alert
                      severity="error"
                      sx={{
                        mt: 0.5,
                        mb: 0.5,
                        fontSize: "0.68rem",
                        py: 0,
                        borderRadius: 1,
                      }}
                    >
                      {error}
                    </Alert>
                  )}
                  <Typography
                    sx={{
                      fontSize: "0.56rem",
                      fontWeight: 700,
                      color: "#1565c0",
                      fontFamily: T.poppins,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      mt: 0.75,
                      mb: 0.5,
                    }}
                  >
                    Input in days · hrs + HH:MM:SS shown as hint · {calDays}{" "}
                    calendar days
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2fr 2fr",
                      gap: "0 8px",
                    }}
                  >
                    <Box>
                      {col1.map((f) => (
                        <AttendanceFieldCell
                          key={f.key}
                          f={f}
                          valueHrs={toNum(fields[f.key])}
                          onChange={handleChange}
                        />
                      ))}
                    </Box>
                    <Box>
                      {col2.map((f) => (
                        <AttendanceFieldCell
                          key={f.key}
                          f={f}
                          valueHrs={toNum(fields[f.key])}
                          onChange={handleChange}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
              {!editing && (
                <Box sx={{ px: 1.25, py: 0.75 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: "rgba(46,125,50,0.05)",
                        border: "1px solid rgba(46,125,50,0.15)",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.54rem",
                          color: T.faint,
                          fontFamily: T.poppins,
                          textTransform: "uppercase",
                          mb: 0.15,
                        }}
                      >
                        Overall
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          color: "#2e7d32",
                          fontFamily: T.poppins,
                          lineHeight: 1,
                        }}
                      >
                        {(editOverallHrs / 8).toFixed(3)}
                        <span
                          style={{
                            fontSize: "0.52rem",
                            fontWeight: 500,
                            marginLeft: 2,
                          }}
                        >
                          d
                        </span>
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.56rem",
                          color: "#1565c0",
                          fontFamily: T.poppins,
                          fontWeight: 700,
                          mt: 0.2,
                        }}
                      >
                        {hrsToHMS(editOverallHrs)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor:
                          tardHrs > 0
                            ? "rgba(198,40,40,0.05)"
                            : "rgba(0,0,0,0.02)",
                        border: `1px solid ${tardHrs > 0 ? "rgba(198,40,40,0.2)" : "rgba(0,0,0,0.08)"}`,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.54rem",
                          color: T.faint,
                          fontFamily: T.poppins,
                          textTransform: "uppercase",
                          mb: 0.15,
                        }}
                      >
                        Late
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          color: tardHrs > 0 ? "#c62828" : T.faint,
                          fontFamily: T.poppins,
                          lineHeight: 1,
                        }}
                      >
                        {tardHrs > 0 ? `${(editTardHrs / 8).toFixed(3)}` : "—"}
                        {tardHrs > 0 && (
                          <span
                            style={{
                              fontSize: "0.52rem",
                              fontWeight: 500,
                              marginLeft: 2,
                            }}
                          >
                            d
                          </span>
                        )}
                      </Typography>
                      {tardHrs > 0 && (
                        <Typography
                          sx={{
                            fontSize: "0.56rem",
                            color: "#1565c0",
                            fontFamily: T.poppins,
                            fontWeight: 700,
                            mt: 0.2,
                          }}
                        >
                          {hrsToHMS(editTardHrs)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

            {/* ── Smart Deduction Receipt (scrollable within its own bounds) ── */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: 3 },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "rgba(0,0,0,0.12)",
                  borderRadius: 2,
                },
              }}
            >
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
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

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
  const [deducting, setDeducting] = useState(false);
  const [deductError, setDeductError] = useState("");
  const [deductSuccess, setDeductSuccess] = useState("");
  const [ctoBalance, setCtoBalance] = useState(null);
  const [vlBalance, setVlBalance] = useState(null);
  const [scBuffer, setScBuffer] = useState(0);
  const [balLoading, setBalLoading] = useState(false);
  // CTO absence deductions already in the DB this period
  const [existingCtoDeductions, setExistingCtoDeductions] = useState([]);
  // VL tardiness deductions already in the DB this period
  const [existingVlDeductions, setExistingVlDeductions] = useState([]);
  const [deductionsLoading, setDeductionsLoading] = useState(false);

  // ── fetch balances ──────────────────────────────────────────────────────────
  const fetchBalances = useCallback(async () => {
    if (!employee) {
      setCtoBalance(null);
      setVlBalance(null);
      setScBuffer(0);
      return;
    }
    setBalLoading(true);
    const token = localStorage.getItem("token");
    try {
      const [assignRes, scRes, ctoRes] = await Promise.allSettled([
        axios.get(
          `${API_BASE_URL}/api/earnings/assignment-balances/${employee.employeeNumber}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
        axios.get(
          `${API_BASE_URL}/api/earnings/sc/${employee.employeeNumber}/balance`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
        axios.get(
          `${API_BASE_URL}/api/earnings/cto/${employee.employeeNumber}/balance`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ]);
      setVlBalance(
        assignRes.status === "fulfilled"
          ? toNum(assignRes.value.data?.VL?.remaining_hours) / 8
          : 0,
      );
      setCtoBalance(
        ctoRes.status === "fulfilled"
          ? toNum(ctoRes.value.data?.totalRemaining) / 8
          : 0,
      );
      setScBuffer(
        scRes.status === "fulfilled"
          ? toNum(scRes.value.data?.totalRemaining) / 8
          : 0,
      );
    } catch {
      setCtoBalance(0);
      setVlBalance(0);
      setScBuffer(0);
    } finally {
      setBalLoading(false);
    }
  }, [employee]);

  // ── fetch existing deductions for this period ───────────────────────────────
  const fetchExistingDeductions = useCallback(async () => {
    if (!employee) {
      setExistingCtoDeductions([]);
      setExistingVlDeductions([]);
      return;
    }
    setDeductionsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const [ctoRes, leaveRes] = await Promise.allSettled([
        axios.get(
          `${API_BASE_URL}/api/earnings/cto/${employee.employeeNumber}?year=${year}&month=${month}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
        axios.get(
          `${API_BASE_URL}/api/earnings/leave/${employee.employeeNumber}?year=${year}&month=${month}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ]);
      // CTO DEDUCTION entries for absence offsets
      setExistingCtoDeductions(
        ctoRes.status === "fulfilled"
          ? (ctoRes.value.data?.earnings || []).filter(
              (e) =>
                e.entry_type === "DEDUCTION" && e.earn_status !== "rejected",
            )
          : [],
      );
      // VL TARDINESS_DEDUCTION entries
      setExistingVlDeductions(
        leaveRes.status === "fulfilled"
          ? (leaveRes.value.data?.earnings || []).filter(
              (e) =>
                e.entry_type === "TARDINESS_DEDUCTION" &&
                e.leave_code === "VL" &&
                e.earn_status !== "rejected",
            )
          : [],
      );
    } catch {
      setExistingCtoDeductions([]);
      setExistingVlDeductions([]);
    } finally {
      setDeductionsLoading(false);
    }
  }, [employee, year, month]);

  useEffect(() => {
    fetchBalances();
    fetchExistingDeductions();
  }, [fetchBalances, fetchExistingDeductions, refreshKey]);

  // ── derive numbers ──────────────────────────────────────────────────────────
  // Tardiness: total tardiness hours from the attendance summary record
  const tardHrs = attendanceData?.summary
    ? parseHHMM(attendanceData.summary.overallRenderedOfficialTimeTardiness)
    : 0;
  const tardDays = tardHrs / 8; // convert hours → fractional days

  // Absent days: already computed by backend (absent rows + unrecorded absences)
  const absentDays = toNum(attendanceData?.stats?.absent_days);

  // SC covers the first chunk of absences (if the employee has leftover SC buffer)
  const absenceFromSc = Number(Math.min(scBuffer, absentDays).toFixed(3));
  const absenceFromCto = Number(
    Math.max(0, absentDays - absenceFromSc).toFixed(3),
  );

  // What's already been deducted/offset this period
  const alreadyCtoDeducted = existingCtoDeductions.reduce(
    (s, e) => s + Math.abs(toNum(e.earned_hours)) / 8,
    0,
  );
  const alreadyVlDeducted = existingVlDeductions.reduce(
    (s, e) => s + Math.abs(toNum(e.earned_hours)) / 8,
    0,
  );

  // Remaining (what still needs to be processed)
  const remainingAbsenceCto = Number(
    Math.max(0, absenceFromCto - alreadyCtoDeducted).toFixed(3),
  );
  const remainingTardVl = Number(
    Math.max(0, tardDays - alreadyVlDeducted).toFixed(3),
  );

  // Per-section fully-deducted flags
  const absenceFullyDeducted =
    absentDays > 0 &&
    absenceFromCto > 0 &&
    alreadyCtoDeducted >= absenceFromCto;
  const absenceCoveredBySC = absentDays > 0 && absenceFromCto === 0; // all covered by SC, nothing to do in CTO
  const tardinessFullyDeducted = tardDays > 0 && alreadyVlDeducted >= tardDays;

  // Per-section pending / approved status
  const absencePending = existingCtoDeductions.some(
    (e) => e.earn_status === "pending",
  );
  const absenceApproved = existingCtoDeductions.some(
    (e) => e.earn_status === "approved",
  );
  const tardinessPending = existingVlDeductions.some(
    (e) => e.earn_status === "pending",
  );
  const tardinessApproved = existingVlDeductions.some(
    (e) => e.earn_status === "approved",
  );

  // Projected new balances
  const ctoBal = ctoBalance !== null ? ctoBalance : 0;
  const vlBal = vlBalance !== null ? vlBalance : 0;
  const newCtoBalance = Number((ctoBal - remainingAbsenceCto).toFixed(3));
  const newVlBalance = Number((vlBal - remainingTardVl).toFixed(3));

  // ── handlers ────────────────────────────────────────────────────────────────
  const handleDeduct = async () => {
    if (!employee) return;
    setDeducting(true);
    setDeductError("");
    const token = localStorage.getItem("token");
    try {
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
            remarks: `Tardiness deduction: ${remainingTardVl.toFixed(3)}d (${(remainingTardVl * 8).toFixed(3)}h / ${hrsToHMS(remainingTardVl * 8)}) for ${monthName(month)} ${year}`,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      setDeductSuccess("Deductions submitted successfully.");
      setConfirmOpen(false);
      setCheckedAbsence(false);
      setCheckedTardiness(false);
      await Promise.all([fetchBalances(), fetchExistingDeductions()]);
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

  // ── guard: nothing to show ──────────────────────────────────────────────────
  if (!attendanceData?.summary) return null;
  const hasAnything =
    absentDays > 0 ||
    tardDays > 0 ||
    absenceFullyDeducted ||
    tardinessFullyDeducted ||
    ctoBal > 0 ||
    scBuffer > 0;
  if (!hasAnything && !balLoading) return null;

  const isLoading = balLoading || deductionsLoading;
  const canDeduct =
    (checkedAbsence && remainingAbsenceCto > 0) ||
    (checkedTardiness && remainingTardVl > 0);
  const bothDone =
    (absentDays === 0 || absenceCoveredBySC || absenceFullyDeducted) &&
    (tardDays === 0 || tardinessFullyDeducted);

  // ── small receipt-row helper ─────────────────────────────────────────────────
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
            lineHeight: 1.4,
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  );

  // ── section status chip helper ───────────────────────────────────────────────
  const SectionStatusChip = ({ pending, approved }) => {
    if (!pending && !approved) return null;
    return (
      <Chip
        size="small"
        icon={
          approved ? (
            <CheckIcon style={{ fontSize: 9 }} />
          ) : (
            <PendingIcon style={{ fontSize: 9 }} />
          )
        }
        label={approved ? "Applied" : "Pending"}
        sx={{
          height: 16,
          fontSize: "0.56rem",
          fontWeight: 700,
          bgcolor: approved ? "rgba(46,125,50,0.14)" : "rgba(255,160,0,0.14)",
          color: approved ? "#1b5e20" : "#7a4a00",
          border: `1px solid ${approved ? "rgba(46,125,50,0.28)" : "rgba(255,160,0,0.28)"}`,
        }}
      />
    );
  };

  return (
    <>
      {/* ── OUTER CARD ── */}
      <Box
        sx={{
          mt: 1,
          borderRadius: 1.5,
          border: `1px solid ${bothDone ? "rgba(46,125,50,0.25)" : "rgba(109,35,35,0.18)"}`,
          bgcolor: bothDone ? "rgba(46,125,50,0.025)" : "rgba(109,35,35,0.025)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 1.25,
            py: 0.65,
            bgcolor: bothDone ? "rgba(46,125,50,0.09)" : "rgba(109,35,35,0.07)",
            borderBottom: `1px solid ${bothDone ? "rgba(46,125,50,0.16)" : "rgba(109,35,35,0.13)"}`,
            display: "flex",
            alignItems: "center",
            gap: 0.6,
          }}
        >
          <ReceiptIcon
            sx={{ fontSize: 11, color: bothDone ? "#2e7d32" : T.accent }}
          />
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 800,
              color: bothDone ? "#2e7d32" : T.accent,
              fontFamily: T.poppins,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              flex: 1,
            }}
          >
            Compensatory Time Off | Vacation Leave Deductions
          </Typography>
          {isLoading && <CircularProgress size={10} sx={{ color: T.accent }} />}
          {scBuffer > 0 && (
            <Chip
              size="small"
              label={`SC buffer: ${scBuffer.toFixed(3)}d`}
              sx={{
                height: 16,
                fontSize: "0.56rem",
                fontWeight: 700,
                bgcolor: "rgba(21,101,192,0.1)",
                color: "#1565c0",
                border: "1px solid rgba(21,101,192,0.25)",
              }}
            />
          )}
        </Box>

        <Box sx={{ px: 1.5, pt: 1, pb: 1.25 }}>
          {/* SC buffer notice */}
          {scBuffer > 0 && absentDays > 0 && (
            <Box
              sx={{
                mb: 0.75,
                px: 1,
                py: 0.6,
                borderRadius: 1.25,
                bgcolor: "rgba(21,101,192,0.05)",
                border: "1px solid rgba(21,101,192,0.2)",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.63rem",
                  fontWeight: 700,
                  color: "#1565c0",
                  fontFamily: T.poppins,
                }}
              >
                Transition: {absenceFromSc.toFixed(3)}d of absences covered by
                remaining SC first
              </Typography>
            </Box>
          )}

          {/* ── INNER RECEIPT CARD ── */}
          <Box
            sx={{
              borderRadius: 1.25,
              border: "1px solid rgba(109,35,35,0.13)",
              bgcolor: "#fff",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: absentDays > 0 && tardDays > 0 ? "1fr 1fr" : "1fr",
                },
              }}
            >
              {/* ════ TARDINESS SECTION ════ */}
              {tardDays > 0 && (
                <Box>
                  {/* Section header */}
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.45,
                      bgcolor: "rgba(198,40,40,0.05)",
                      borderBottom: "1px solid rgba(198,40,40,0.1)",
                      borderTop: {
                        xs:
                          absentDays > 0
                            ? "1px solid rgba(0,0,0,0.06)"
                            : "none",
                        md: "none",
                      },
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.55rem",
                        fontWeight: 800,
                        color: "rgba(198,40,40,0.6)",
                        fontFamily: T.poppins,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        flex: 1,
                      }}
                    >
                      Tardiness → VL Deduction
                    </Typography>
                    <SectionStatusChip
                      pending={tardinessPending}
                      approved={tardinessApproved}
                    />
                  </Box>

                  {/* Fully-deducted banner for this section */}
                  {tardinessFullyDeducted && (
                    <Box
                      sx={{
                        mx: 1.25,
                        mt: 0.75,
                        px: 1,
                        py: 0.6,
                        borderRadius: 1.25,
                        bgcolor: tardinessApproved
                          ? "rgba(46,125,50,0.07)"
                          : "rgba(255,160,0,0.07)",
                        border: `1px solid ${tardinessApproved ? "rgba(46,125,50,0.2)" : "rgba(255,160,0,0.22)"}`,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 0.75,
                      }}
                    >
                      {tardinessApproved ? (
                        <CheckIcon
                          sx={{
                            fontSize: 13,
                            color: "#2e7d32",
                            flexShrink: 0,
                            mt: "1px",
                          }}
                        />
                      ) : (
                        <PendingIcon
                          sx={{
                            fontSize: 13,
                            color: "#e65100",
                            flexShrink: 0,
                            mt: "1px",
                          }}
                        />
                      )}
                      <Typography
                        sx={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: tardinessApproved ? "#1b5e20" : "#7a4a00",
                          fontFamily: T.poppins,
                        }}
                      >
                        {tardinessApproved
                          ? "Tardiness fully deducted & applied to VL balance."
                          : "Tardiness deduction submitted — pending approval."}
                      </Typography>
                    </Box>
                  )}

                  {/* Partial notice */}
                  {!tardinessFullyDeducted && alreadyVlDeducted > 0 && (
                    <Box
                      sx={{
                        mx: 1.25,
                        mt: 0.75,
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
                        Partial: {alreadyVlDeducted.toFixed(3)}d already
                        deducted — {remainingTardVl.toFixed(3)}d remaining
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ px: 1.25, py: 0.75 }}>
                    <RRow
                      label="VL Balance"
                      sublabel={balLoading ? "Loading…" : "Available"}
                      value={balLoading ? "…" : `${vlBal.toFixed(3)} d`}
                      valueColor={vlBal > 0 ? "#1e4d20" : T.faint}
                      bold
                    />
                    <RRow
                      label="Tardiness"
                      sublabel={
                        tardHrs > 0
                          ? `${tardHrs.toFixed(3)} hrs · ${hrsToHMS(tardHrs)}`
                          : "No tardiness"
                      }
                      value={`− ${tardDays.toFixed(3)} d`}
                      valueColor="#c62828"
                    />
                    {alreadyVlDeducted > 0 && (
                      <RRow
                        label={`Already deducted (${existingVlDeductions[0]?.earn_status || "pending"})`}
                        value={`− ${alreadyVlDeducted.toFixed(3)} d`}
                        valueColor="#2e7d32"
                        dimmed
                      />
                    )}
                    {!tardinessFullyDeducted && remainingTardVl > 0 && (
                      <RRow
                        label="Remaining to deduct now"
                        value={`− ${remainingTardVl.toFixed(3)} d`}
                        valueColor="#c62828"
                      />
                    )}
                    <Box
                      sx={{
                        mt: 0.5,
                        pt: 0.5,
                        borderTop: "1px dashed rgba(0,0,0,0.1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.67rem",
                          fontWeight: 800,
                          color: "#1a1a1a",
                          fontFamily: T.poppins,
                        }}
                      >
                        VL New Balance (Total)
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.82rem",
                          fontWeight: 900,
                          fontFamily: T.poppins,
                          color: tardinessFullyDeducted
                            ? vlBal - alreadyVlDeducted < 0
                              ? "#c62828"
                              : vlBal - alreadyVlDeducted === 0
                                ? "#7a4a00"
                                : "#1e4d20"
                            : newVlBalance < 0
                              ? "#c62828"
                              : newVlBalance === 0
                                ? "#7a4a00"
                                : "#1e4d20",
                        }}
                      >
                        {tardinessFullyDeducted
                          ? `${Number((vlBal - alreadyVlDeducted).toFixed(3)).toFixed(3)} d`
                          : `${newVlBalance.toFixed(3)} d`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ════ ABSENCE SECTION ════ */}
              {absentDays > 0 && (
                <Box
                  sx={{
                    borderRight: {
                      xs: "none",
                      md:
                        tardDays > 0
                          ? "1px dashed rgba(109,35,35,0.15)"
                          : "none",
                    },
                  }}
                >
                  {/* Section header */}
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.45,
                      bgcolor: "rgba(106,27,154,0.05)",
                      borderBottom: "1px solid rgba(106,27,154,0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.55rem",
                        fontWeight: 800,
                        color: "rgba(106,27,154,0.6)",
                        fontFamily: T.poppins,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        flex: 1,
                      }}
                    >
                      Absence → CTO Offset
                    </Typography>
                    <SectionStatusChip
                      pending={absencePending}
                      approved={absenceApproved}
                    />
                    {absenceCoveredBySC && (
                      <Chip
                        size="small"
                        icon={<CheckIcon style={{ fontSize: 9 }} />}
                        label="Covered by SC"
                        sx={{
                          height: 16,
                          fontSize: "0.56rem",
                          fontWeight: 700,
                          bgcolor: "rgba(21,101,192,0.1)",
                          color: "#1565c0",
                          border: "1px solid rgba(21,101,192,0.25)",
                        }}
                      />
                    )}
                  </Box>

                  {/* Fully-deducted banner for this section */}
                  {absenceFullyDeducted && (
                    <Box
                      sx={{
                        mx: 1.25,
                        mt: 0.75,
                        px: 1,
                        py: 0.6,
                        borderRadius: 1.25,
                        bgcolor: absenceApproved
                          ? "rgba(46,125,50,0.07)"
                          : "rgba(255,160,0,0.07)",
                        border: `1px solid ${absenceApproved ? "rgba(46,125,50,0.2)" : "rgba(255,160,0,0.22)"}`,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 0.75,
                      }}
                    >
                      {absenceApproved ? (
                        <CheckIcon
                          sx={{
                            fontSize: 13,
                            color: "#2e7d32",
                            flexShrink: 0,
                            mt: "1px",
                          }}
                        />
                      ) : (
                        <PendingIcon
                          sx={{
                            fontSize: 13,
                            color: "#e65100",
                            flexShrink: 0,
                            mt: "1px",
                          }}
                        />
                      )}
                      <Typography
                        sx={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: absenceApproved ? "#1b5e20" : "#7a4a00",
                          fontFamily: T.poppins,
                        }}
                      >
                        {absenceApproved
                          ? "Absences fully offset & applied to CTO balance."
                          : "Absence offset submitted — pending approval."}
                      </Typography>
                    </Box>
                  )}
                  {absenceCoveredBySC && (
                    <Box
                      sx={{
                        mx: 1.25,
                        mt: 0.75,
                        px: 1,
                        py: 0.6,
                        borderRadius: 1.25,
                        bgcolor: "rgba(21,101,192,0.06)",
                        border: "1px solid rgba(21,101,192,0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                      }}
                    >
                      <CheckIcon sx={{ fontSize: 13, color: "#1565c0" }} />
                      <Typography
                        sx={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "#1565c0",
                          fontFamily: T.poppins,
                        }}
                      >
                        All {absentDays}d absence(s) covered by SC buffer — no
                        CTO deduction needed.
                      </Typography>
                    </Box>
                  )}

                  {/* Partial notice */}
                  {!absenceFullyDeducted &&
                    !absenceCoveredBySC &&
                    alreadyCtoDeducted > 0 && (
                      <Box
                        sx={{
                          mx: 1.25,
                          mt: 0.75,
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
                          Partial: {alreadyCtoDeducted.toFixed(3)}d already
                          offset — {remainingAbsenceCto.toFixed(3)}d remaining
                        </Typography>
                      </Box>
                    )}

                  <Box sx={{ px: 1.25, py: 0.75 }}>
                    <RRow
                      label="CTO Balance"
                      sublabel={balLoading ? "Loading…" : "Available"}
                      value={balLoading ? "…" : `${ctoBal.toFixed(3)} d`}
                      valueColor={ctoBal > 0 ? "#1e4d20" : T.faint}
                      bold
                    />
                    {scBuffer > 0 && (
                      <RRow
                        label="SC buffer (covered first)"
                        value={`− ${absenceFromSc.toFixed(3)} d`}
                        valueColor="#1565c0"
                        dimmed
                      />
                    )}
                    <RRow
                      label="Absences (offset from CTO)"
                      sublabel={`${absentDays} day(s) recorded · ${absenceFromCto.toFixed(3)}d to offset`}
                      value={
                        absenceFromCto > 0
                          ? `− ${absenceFromCto.toFixed(3)} d`
                          : "Covered by SC"
                      }
                      valueColor={absenceFromCto > 0 ? "#6a1b9a" : "#2e7d32"}
                    />
                    {alreadyCtoDeducted > 0 && (
                      <RRow
                        label={`Already offset (${existingCtoDeductions[0]?.earn_status || "pending"})`}
                        value={`− ${alreadyCtoDeducted.toFixed(3)} d`}
                        valueColor="#2e7d32"
                        dimmed
                      />
                    )}
                    {!absenceFullyDeducted &&
                      !absenceCoveredBySC &&
                      remainingAbsenceCto > 0 && (
                        <RRow
                          label="Remaining to offset now"
                          value={`− ${remainingAbsenceCto.toFixed(3)} d`}
                          valueColor="#6a1b9a"
                        />
                      )}
                    <Box
                      sx={{
                        mt: 0.5,
                        pt: 0.5,
                        borderTop: "1px dashed rgba(0,0,0,0.1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.67rem",
                          fontWeight: 800,
                          color: "#1a1a1a",
                          fontFamily: T.poppins,
                        }}
                      >
                        CTO New Balance (Total)
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.82rem",
                          fontWeight: 900,
                          fontFamily: T.poppins,
                          color: absenceFullyDeducted
                            ? ctoBal - alreadyCtoDeducted < 0
                              ? "#c62828"
                              : ctoBal - alreadyCtoDeducted === 0
                                ? "#7a4a00"
                                : "#1e4d20"
                            : newCtoBalance < 0
                              ? "#c62828"
                              : newCtoBalance === 0
                                ? "#7a4a00"
                                : "#1e4d20",
                        }}
                      >
                        {absenceFullyDeducted || absenceCoveredBySC
                          ? `${Number((ctoBal - alreadyCtoDeducted).toFixed(3)).toFixed(3)} d`
                          : `${newCtoBalance.toFixed(3)} d`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

            {(newCtoBalance < 0 || newVlBalance < 0) && (
              <Box
                sx={{
                  mx: 1.25,
                  mb: 1,
                  px: 1,
                  py: 0.65,
                  borderRadius: 1.25,
                  bgcolor: "rgba(198,40,40,0.06)",
                  border: "1px solid rgba(198,40,40,0.22)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.6rem",
                    color: T.faint,
                    fontFamily: T.poppins,
                    lineHeight: 1.55,
                  }}
                >
                  {" "}
                  <strong style={{ color: "#c62828" }}>Note:</strong> If the new
                  balance is negative (e.g. <em>−0.xxx d</em>), it will be directly
                  deducted from their salary.{" "}
                </Typography>
              </Box>
            )}

            {/* Case: nothing to deduct at all */}
            {absentDays === 0 && tardDays === 0 && (
              <Box sx={{ px: 1.25, py: 1.25, textAlign: "center" }}>
                <Typography
                  sx={{
                    fontSize: "0.68rem",
                    color: T.faint,
                    fontFamily: T.poppins,
                    fontStyle: "italic",
                  }}
                >
                  No absences or tardiness recorded for this period.
                </Typography>
              </Box>
            )}
          </Box>

          {/* ── ACTION AREA ── */}
          <Box
            sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md:
                    absentDays > 0 &&
                    !absenceCoveredBySC &&
                    !absenceFullyDeducted &&
                    remainingAbsenceCto > 0 &&
                    tardDays > 0 &&
                    !tardinessFullyDeducted &&
                    remainingTardVl > 0
                      ? "1fr 1fr"
                      : "1fr",
                },
                gap: 0.75,
              }}
            >
              {/* Tardiness checkbox */}
              {tardDays > 0 &&
                !tardinessFullyDeducted &&
                remainingTardVl > 0 && (
                  <Box
                    sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}
                  >
                    <Checkbox
                      checked={checkedTardiness}
                      onChange={(e) => setCheckedTardiness(e.target.checked)}
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
                        color: "#333",
                        fontFamily: T.poppins,
                        lineHeight: 1.55,
                        mt: "3px",
                      }}
                    >
                      Confirm deduct{" "}
                      <strong style={{ color: T.accent }}>
                        {remainingTardVl.toFixed(3)}d
                      </strong>{" "}
                      tardiness from VL
                    </Typography>
                  </Box>
                )}

              {/* Absence checkbox — only when there's something left to offset */}
              {absentDays > 0 &&
                !absenceCoveredBySC &&
                !absenceFullyDeducted &&
                remainingAbsenceCto > 0 && (
                  <Box
                    sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}
                  >
                    <Checkbox
                      checked={checkedAbsence}
                      onChange={(e) => setCheckedAbsence(e.target.checked)}
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
                        color: "#333",
                        fontFamily: T.poppins,
                        lineHeight: 1.55,
                        mt: "3px",
                      }}
                    >
                      Confirm offset{" "}
                      <strong style={{ color: T.accent }}>
                        {remainingAbsenceCto.toFixed(3)}d
                      </strong>{" "}
                      absence from CTO
                    </Typography>
                  </Box>
                )}
            </Box>

            {deductError && (
              <Alert
                severity="error"
                sx={{ py: 0, fontSize: "0.65rem", borderRadius: 1 }}
              >
                {deductError}
              </Alert>
            )}
            {deductSuccess && (
              <Alert
                severity="success"
                sx={{ py: 0, fontSize: "0.65rem", borderRadius: 1 }}
              >
                {deductSuccess}
              </Alert>
            )}

            {/* All-done banner */}
            {bothDone && !deductSuccess && (
              <Box
                sx={{
                  px: 1,
                  py: 0.6,
                  borderRadius: 1.25,
                  bgcolor: "rgba(46,125,50,0.07)",
                  border: "1px solid rgba(46,125,50,0.2)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "#1b5e20",
                    fontFamily: T.poppins,
                  }}
                >
                  All deductions applied for this period.
                </Typography>
              </Box>
            )}

            {canDeduct && (
              <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={() => setConfirmOpen(true)}
                startIcon={<DeductIcon sx={{ fontSize: "13px !important" }} />}
                sx={{
                  height: 30,
                  mt: 0.5,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "none",
                  fontFamily: T.poppins,
                  borderRadius: 1.5,
                  bgcolor: T.accent,
                  color: "#fff",
                  "&:hover": { bgcolor: T.accentDark },
                }}
              >
                Apply Deductions
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── CONFIRM DIALOG ── */}
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
          Confirm Deductions
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
              For{" "}
              <strong>
                {monthName(month)} {year}
              </strong>
              . These will be <strong>immediately applied</strong>.
            </Typography>

            {/* Absence block */}
            {checkedAbsence && remainingAbsenceCto > 0 && (
              <Box
                sx={{
                  borderRadius: 2,
                  border: "1px solid rgba(109,35,35,0.2)",
                  bgcolor: "rgba(109,35,35,0.025)",
                  overflow: "hidden",
                  mb: 1,
                }}
              >
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
                    Absence → CTO Offset
                  </Typography>
                </Box>
                <Box sx={{ px: 1.5, py: 0.75 }}>
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
                        {absentDays} day(s) recorded
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
                      − {absenceFromCto.toFixed(3)} d
                    </Typography>
                  </Box>
                  {alreadyCtoDeducted > 0 && (
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
                        Already offset
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#2e7d32",
                          fontFamily: T.poppins,
                        }}
                      >
                        − {alreadyCtoDeducted.toFixed(3)} d
                      </Typography>
                    </Box>
                  )}
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        color: "#6a1b9a",
                        fontFamily: T.poppins,
                        fontWeight: 700,
                      }}
                    >
                      Offsetting now
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#6a1b9a",
                        fontFamily: T.poppins,
                      }}
                    >
                      − {remainingAbsenceCto.toFixed(3)} d
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    bgcolor:
                      newCtoBalance < 0
                        ? "rgba(198,40,40,0.05)"
                        : "rgba(30,77,32,0.05)",
                    borderTop: "1.5px solid rgba(109,35,35,0.14)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
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
                      CTO New Balance (Total)
                    </Typography>
                    {newCtoBalance < 0 && (
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
                        newCtoBalance < 0
                          ? "#c62828"
                          : newCtoBalance === 0
                            ? "#7a4a00"
                            : "#1e4d20",
                      fontFamily: T.poppins,
                    }}
                  >
                    {newCtoBalance.toFixed(3)} d
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Tardiness block */}
            {checkedTardiness && remainingTardVl > 0 && (
              <Box
                sx={{
                  borderRadius: 2,
                  border: "1px solid rgba(109,35,35,0.2)",
                  bgcolor: "rgba(109,35,35,0.025)",
                  overflow: "hidden",
                  mb: 1,
                }}
              >
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
                    Tardiness → VL Deduction
                  </Typography>
                </Box>
                <Box sx={{ px: 1.5, py: 0.75 }}>
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
                        Tardiness
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.6rem",
                          color: T.faint,
                          fontFamily: T.poppins,
                        }}
                      >
                        {tardHrs.toFixed(3)} hrs · {hrsToHMS(tardHrs)}
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
                  {alreadyVlDeducted > 0 && (
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
                        − {alreadyVlDeducted.toFixed(3)} d
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
                      − {remainingTardVl.toFixed(3)} d (
                      {(remainingTardVl * 8).toFixed(3)}h)
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    bgcolor:
                      newVlBalance < 0
                        ? "rgba(198,40,40,0.05)"
                        : "rgba(30,77,32,0.05)",
                    borderTop: "1.5px solid rgba(109,35,35,0.14)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
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
                      VL New Balance (Total)
                    </Typography>
                    {newVlBalance < 0 && (
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
                        newVlBalance < 0
                          ? "#c62828"
                          : newVlBalance === 0
                            ? "#7a4a00"
                            : "#1e4d20",
                      fontFamily: T.poppins,
                    }}
                  >
                    {newVlBalance.toFixed(3)} d
                  </Typography>
                </Box>
              </Box>
            )}

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
              Deductions are <strong>auto-approved</strong> — balances update
              immediately.
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
              "Confirm"
            )}
          </AccentButton>
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

  const label = (empCat?.label || "").toLowerCase();
  const parentGroup = (empCat?.parentGroup || "").toLowerCase();

  // CTO applies to: 40hr/designated, Temporary (any subcat), Non-Teaching
  const usesCTO =
    label.includes("40") ||
    label.includes("designated") ||
    label.includes("temporary") ||
    parentGroup.includes("temporary") ||
    label.includes("non-teaching") ||
    label.includes("non teaching") ||
    parentGroup.includes("non-teaching") ||
    label.includes("non teaching");

  if (usesCTO) {
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
  }

  // 30hr or unclassified → SC covers everything
  return (
    <SCDeductionReceipt
      employee={employee}
      attendanceData={attendanceData}
      year={year}
      month={month}
      onDeductSuccess={onDeductSuccess}
      refreshKey={refreshKey}
    />
  );
};

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const meta = EARN_STATUS[status] || EARN_STATUS.pending;
  const Icon = meta.icon;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.4,
        px: 0.9,
        py: 0.2,
        borderRadius: "20px",
        bgcolor: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    >
      <Icon sx={{ fontSize: 9, color: meta.color }} />
      <Typography
        sx={{
          fontSize: "0.6rem",
          fontWeight: 700,
          color: meta.color,
          fontFamily: T.poppins,
        }}
      >
        {meta.label}
      </Typography>
    </Box>
  );
};

const DeptBadge = ({ code }) =>
  !code ? null : (
    <Chip
      size="small"
      icon={<DeptIcon style={{ fontSize: 10, color: T.muted }} />}
      label={code}
      sx={{
        height: 18,
        fontSize: "0.62rem",
        fontWeight: 700,
        bgcolor: "rgba(0,0,0,0.05)",
        color: "#333",
        border: "1px solid rgba(0,0,0,0.1)",
        "& .MuiChip-label": { px: 0.75 },
      }}
    />
  );

const EmpCatBadge = ({ label, colorHex }) => {
  if (!label) return null;
  const color = colorHex || "#757575";
  return (
    <Chip
      size="small"
      icon={<WorkIcon style={{ fontSize: 10, color }} />}
      label={label}
      sx={{
        height: 18,
        fontSize: "0.62rem",
        fontWeight: 700,
        bgcolor: alpha(color, 0.08),
        color: "#333",
        border: `1px solid ${alpha(color, 0.25)}`,
        maxWidth: 180,
        "& .MuiChip-label": {
          px: 0.75,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
      }}
    />
  );
};

// ─── Reject Dialog ─────────────────────────────────────────────────────────────
const RejectDialog = ({ open, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        }}
      >
        Reject Earning Entry
      </DialogTitle>
      <DialogContent>
        <FieldInput
          fullWidth
          multiline
          rows={3}
          size="small"
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Insufficient OT documentation…"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: "none", color: T.muted, fontFamily: T.poppins }}
        >
          Cancel
        </Button>
        <AccentButton
          variant="contained"
          onClick={() => onConfirm(reason)}
          disabled={loading}
          sx={{ bgcolor: "#6b1a1a", "&:hover": { bgcolor: "#4a1010" } }}
        >
          {loading ? (
            <CircularProgress size={14} sx={{ color: "#fff" }} />
          ) : (
            "Reject"
          )}
        </AccentButton>
      </DialogActions>
    </Dialog>
  );
};

// ─── Earning Record Row ────────────────────────────────────────────────────────
const EarningRow = ({ record, unit, type, onApprove, onReject }) => {
  const earnH = toNum(record.earned_hours ?? record.total_hours);
  const status = record.earn_status || "pending";
  const isTardinessDeduction = record.entry_type === "TARDINESS_DEDUCTION";
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        border: `1px solid ${isTardinessDeduction ? "rgba(198,40,40,0.15)" : "rgba(0,0,0,0.08)"}`,
        borderRadius: 2,
        bgcolor: isTardinessDeduction ? "rgba(198,40,40,0.02)" : "#fff",
        mb: 0.75,
        animation: "emFadeUp 0.25s ease",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexWrap: "wrap",
              mb: 0.4,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#1a1a1a",
                fontFamily: T.poppins,
              }}
            >
              {record.period_year}
              {record.period_month
                ? ` · ${monthShort(record.period_month)}`
                : ""}
              {record.leave_code && ` · ${record.leave_code}`}
              {record.sc_type && ` · SC (${record.sc_type.replace("_", "-")})`}
              {type === "cto" && ` · CTO`}
            </Typography>
            <StatusBadge status={status} />
            {isTardinessDeduction && (
              <Chip
                size="small"
                icon={<DeductIcon style={{ fontSize: 9, color: "#c62828" }} />}
                label="Tardiness Deduction"
                sx={{
                  height: 16,
                  fontSize: "0.56rem",
                  fontWeight: 700,
                  bgcolor: "rgba(198,40,40,0.08)",
                  color: "#c62828",
                  border: "1px solid rgba(198,40,40,0.2)",
                }}
              />
            )}
          </Box>
          <Box
            sx={{ display: "flex", alignItems: "baseline", gap: 0.4, mb: 0.25 }}
          >
            <Typography
              sx={{
                fontSize: "0.58rem",
                color: T.faint,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: T.poppins,
              }}
            >
              {earnH < 0 ? "Deducted" : "Earned"}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.82rem",
                fontWeight: 800,
                color: earnH < 0 ? "#c62828" : "#1a1a1a",
                fontFamily: T.poppins,
              }}
            >
              {earnH < 0 ? "−" : ""}
              {fmtHrs(Math.abs(earnH), unit)}
            </Typography>
          </Box>
          {record.created_at && (
            <Typography
              sx={{
                fontSize: "0.6rem",
                color: T.faint,
                fontFamily: T.poppins,
                mt: 0.15,
              }}
            >
              Added{" "}
              {new Date(record.created_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              {" · "}
              {new Date(record.created_at).toLocaleTimeString("en-PH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          )}
          {record.remarks && (
            <Typography
              sx={{
                fontSize: "0.65rem",
                color: T.muted,
                fontFamily: T.poppins,
              }}
            >
              {record.remarks}
            </Typography>
          )}
          {record.approved_by && (
            <Typography
              sx={{
                fontSize: "0.6rem",
                color: T.faint,
                fontFamily: T.poppins,
                mt: 0.2,
              }}
            >
              {status === "approved" ? "Approved" : "Rejected"} by{" "}
              {record.approved_by}
              {record.rejected_reason ? ` — "${record.rejected_reason}"` : ""}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.4,
            flexShrink: 0,
          }}
        >
          <StatusBadge status={status} />

          {status === "pending" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box
                onClick={() => onApprove(record)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.6,
                  px: 1,
                  py: 0.4,
                  borderRadius: 1.5,
                  bgcolor: "rgba(46,125,50,0.07)",
                  border: "1px solid rgba(46,125,50,0.22)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: "rgba(46,125,50,0.14)",
                    border: "1px solid rgba(46,125,50,0.4)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <ApproveIcon sx={{ fontSize: 11, color: "#2e7d32" }} />
                <Typography
                  sx={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: "#2e7d32",
                    fontFamily: T.poppins,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Approve
                </Typography>
              </Box>

              <Box
                onClick={() => onReject(record)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.6,
                  px: 1,
                  py: 0.4,
                  borderRadius: 1.5,
                  bgcolor: "rgba(198,40,40,0.07)",
                  border: "1px solid rgba(198,40,40,0.22)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: "rgba(198,40,40,0.14)",
                    border: "1px solid rgba(198,40,40,0.4)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <RejectIcon sx={{ fontSize: 11, color: "#c62828" }} />
                <Typography
                  sx={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: "#c62828",
                    fontFamily: T.poppins,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Reject
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Pagination Controls ───────────────────────────────────────────────────────
const PaginationControls = ({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalCount,
  filteredCount,
}) => {
  const start = totalPages === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filteredCount);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 1.5,
        py: 0.75,
        borderTop: `1px solid ${T.divider}`,
        bgcolor: "rgba(0,0,0,0.015)",
        flexShrink: 0,
        flexWrap: "wrap",
        gap: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography
          sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}
        >
          Rows:
        </Typography>
        <FormControl size="small" sx={{ minWidth: 54 }}>
          <Select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            sx={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: T.accent,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: T.accentBorder,
              },
              bgcolor: "#fff",
              borderRadius: 1,
              height: 22,
              "& .MuiSelect-select": { py: "1px", pl: "6px" },
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <MenuItem key={n} value={n} sx={{ fontSize: "0.72rem" }}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography
          sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins }}
        >
          {filteredCount > 0 ? `${start}–${end} of ${filteredCount}` : "0"}
          {filteredCount !== totalCount && (
            <span style={{ color: T.faint }}>
              {" "}
              (filtered from {totalCount})
            </span>
          )}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
        <IconButton
          size="small"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          sx={{ p: 0.25, color: page === 1 ? T.faint : T.accent }}
        >
          <PrevIcon sx={{ fontSize: 13 }} />
          <PrevIcon sx={{ fontSize: 13, ml: -1 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          sx={{ p: 0.25, color: page === 1 ? T.faint : T.accent }}
        >
          <PrevIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let p;
            if (totalPages <= 5) p = i + 1;
            else if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
            return (
              <Box
                key={p}
                onClick={() => onPageChange(p)}
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  bgcolor: p === page ? T.accent : "transparent",
                  border: `1px solid ${p === page ? T.accent : T.accentBorder}`,
                  "&:hover": {
                    bgcolor: p === page ? T.accentDark : "rgba(109,35,35,0.06)",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.58rem",
                    fontWeight: p === page ? 800 : 500,
                    color: p === page ? "#fff" : T.accent,
                    fontFamily: T.poppins,
                  }}
                >
                  {p}
                </Typography>
              </Box>
            );
          })}
        </Box>
        <IconButton
          size="small"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || totalPages === 0}
          sx={{ p: 0.25, color: page >= totalPages ? T.faint : T.accent }}
        >
          <NextIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages || totalPages === 0}
          sx={{ p: 0.25, color: page >= totalPages ? T.faint : T.accent }}
        >
          <NextIcon sx={{ fontSize: 13 }} />
          <NextIcon sx={{ fontSize: 13, ml: -1 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

// ─── Status Filter Bar ─────────────────────────────────────────────────────────
const StatusFilterBar = ({ statusFilter, onStatusFilter, counts }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.5,
      px: 1.5,
      py: 0.6,
      borderBottom: `1px solid ${T.divider}`,
      bgcolor: "rgba(0,0,0,0.015)",
      flexShrink: 0,
      flexWrap: "wrap",
    }}
  >
    <FilterIcon sx={{ fontSize: 11, color: T.faint }} />
    {STATUS_FILTER_OPTIONS.map((opt) => {
      const count = counts[opt.value] ?? 0;
      const active = statusFilter === opt.value;
      return (
        <Box
          key={opt.value}
          onClick={() => onStatusFilter(opt.value)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.4,
            px: 0.9,
            py: 0.25,
            borderRadius: "20px",
            cursor: "pointer",
            border: `1px solid ${active ? opt.color : "rgba(0,0,0,0.1)"}`,
            bgcolor: active ? alpha(opt.color, 0.1) : "transparent",
            transition: "all 0.15s",
            "&:hover": {
              bgcolor: alpha(opt.color, 0.08),
              borderColor: opt.color,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: active ? 800 : 500,
              color: active ? opt.color : T.faint,
              fontFamily: T.poppins,
            }}
          >
            {opt.label}
          </Typography>
          {opt.value !== "all" && (
            <Box
              sx={{
                minWidth: 14,
                height: 14,
                borderRadius: "7px",
                bgcolor: active ? opt.color : "rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.5rem",
                  fontWeight: 800,
                  color: active ? "#fff" : T.faint,
                  fontFamily: T.poppins,
                  lineHeight: 1,
                }}
              >
                {count}
              </Typography>
            </Box>
          )}
        </Box>
      );
    })}
  </Box>
);

// ─── Records List (Column 2) ───────────────────────────────────────────────────
const RecordsList = ({
  employeeNumber,
  type,
  unit,
  refreshKey,
  year,
  month,
  onApproved,
  standalone,
  onStatusChange,
}) => {
  const [data, setData] = useState({ earnings: [], balances: [] });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    record: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEarnings = useCallback(async () => {
    if (!employeeNumber) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/api/earnings/${type}/${employeeNumber}?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setData({
        earnings: res.data.earnings || [],
        balances: res.data.balances || [],
      });
    } catch {
      setData({ earnings: [], balances: [] });
    }
    setLoading(false);
  }, [employeeNumber, type, year, month]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings, refreshKey]);

  // Reset to page 1 when filter or data changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, employeeNumber, year, month, type]);

  const sortedEarnings = useMemo(
    () =>
      [...data.earnings].sort((a, b) => {
        const bd = new Date(b.created_at || b.approved_at || 0).getTime();
        const ad = new Date(a.created_at || a.approved_at || 0).getTime();
        if (bd !== ad) return bd - ad;
        return toNum(b.id) - toNum(a.id);
      }),
    [data.earnings],
  );

  const statusCounts = useMemo(() => {
    const counts = {
      all: sortedEarnings.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    sortedEarnings.forEach((e) => {
      const s = e.earn_status || "pending";
      if (s in counts) counts[s]++;
    });
    return counts;
  }, [sortedEarnings]);

  const filteredEarnings = useMemo(
    () =>
      statusFilter === "all"
        ? sortedEarnings
        : sortedEarnings.filter(
            (e) => (e.earn_status || "pending") === statusFilter,
          ),
    [sortedEarnings, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredEarnings.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pagedEarnings = filteredEarnings.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize,
  );

  const handleApprove = async (record) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/earnings/${type}/${record.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchEarnings();
      if (onApproved) onApproved();
      if (onStatusChange) onStatusChange();
    } catch {}
    setActionLoading(false);
  };

  const handleReject = async (reason) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/earnings/${type}/${rejectDialog.record.id}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setRejectDialog({ open: false, record: null });
      await fetchEarnings();
      if (onApproved) onApproved();
      if (onStatusChange) onStatusChange();
    } catch {}
    setActionLoading(false);
  };

  if (!employeeNumber) {
    if (standalone)
      return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <ColHeader icon={HistoryIcon} label="Earnings Records" />
        </Box>
      );
    return null;
  }

  const pendingCount = statusCounts.pending;

  const content = (
    <>
      {loading ? (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <CircularProgress size={18} sx={{ color: T.accent }} />
        </Box>
      ) : filteredEarnings.length === 0 ? (
        <Box
          sx={{
            py: 2.5,
            textAlign: "center",
            bgcolor: "rgba(0,0,0,0.03)",
            borderRadius: 2,
            border: "1px dashed rgba(0,0,0,0.12)",
          }}
        >
          <Typography
            sx={{ fontSize: "0.73rem", color: T.faint, fontFamily: T.poppins }}
          >
            {statusFilter === "all"
              ? `No earnings for ${monthName(month)} ${year}`
              : `No ${statusFilter} earnings`}
          </Typography>
        </Box>
      ) : (
        pagedEarnings.map((record) => (
          <EarningRow
            key={record.id}
            record={record}
            unit={unit}
            type={type}
            onApprove={handleApprove}
            onReject={(r) => setRejectDialog({ open: true, record: r })}
          />
        ))
      )}
      <RejectDialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, record: null })}
        onConfirm={handleReject}
        loading={actionLoading}
      />
    </>
  );

  if (standalone)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ColHeader icon={HistoryIcon} label="Earnings Records">
          {pendingCount > 0 && (
            <Chip
              size="small"
              label={`${pendingCount} pending`}
              sx={{
                height: 16,
                fontSize: "0.56rem",
                fontWeight: 700,
                bgcolor: "rgba(0,0,0,0.06)",
                color: "#7a4a00",
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
          )}
          <IconButton
            size="small"
            onClick={fetchEarnings}
            disabled={loading}
            sx={{ p: 0.25 }}
          >
            <RefreshIcon
              sx={{ fontSize: 13, color: loading ? T.faint : T.accent }}
            />
          </IconButton>
        </ColHeader>

        {/* Status filter bar */}
        <StatusFilterBar
          statusFilter={statusFilter}
          onStatusFilter={(v) => setStatusFilter(v)}
          counts={statusCounts}
        />

        {/* Scrollable records list */}
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
          {content}
        </Box>

        {/* Pagination */}
        <PaginationControls
          page={clampedPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          totalCount={sortedEarnings.length}
          filteredCount={filteredEarnings.length}
        />
      </Box>
    );

  return <Box sx={{ mt: 1 }}>{content}</Box>;
};

// ─── Compact Input Grid ────────────────────────────────────────────────────────
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
const LeaveInputColumn = ({
  employee,
  deptMap,
  empCatMap,
  unit,
  year,
  month,
  onBalanceChanged,
  refreshKey: externalRefreshKey,
  onRecordsRefresh,
}) => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [assignmentMap, setAssignmentMap] = useState({});
  const [earnedHours, setEarnedHours] = useState({});
  const [earnedDraft, setEarnedDraft] = useState({});
  const [userTouched, setUserTouched] = useState({});
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const calDays = getCalendarDays(year, month);

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

  useEffect(() => {
    if (!employee) {
      setAssignmentMap({});
      return;
    }
    fetchBalances();
  }, [employee, year, month, fetchBalances]);

  useEffect(() => {
    if (!employee || leaveTypes.length === 0) {
      setEarnedHours({});
      setEarnedDraft({});
      setUserTouched({});
      setRemarks("");
      setError("");
      return;
    }
    const defaults = {};
    leaveTypes.forEach((lt) => {
      if (SL_VL_AUTO_CODES.includes(lt.leave_code))
        defaults[lt.leave_code] = SL_VL_DEFAULT_HOURS;
    });
    setEarnedHours(defaults);
    setEarnedDraft({});
    setUserTouched({});
    setRemarks("");
    setError("");
  }, [employee, year, month, leaveTypes]);

  const activeLeaves = useMemo(
    () =>
      leaveTypes.filter((lt) => {
        const hrs = toNum(earnedHours[lt.leave_code]);
        if (hrs <= 0) return false;
        const isAuto = SL_VL_AUTO_CODES.includes(lt.leave_code);
        const isTouched = !!userTouched[lt.leave_code];
        return isTouched || !isAuto;
      }),
    [leaveTypes, earnedHours, userTouched],
  );

  const autoDefaultCodes = useMemo(
    () =>
      leaveTypes
        .filter((lt) => SL_VL_AUTO_CODES.includes(lt.leave_code))
        .map((lt) => lt.leave_code),
    [leaveTypes],
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
    const token = localStorage.getItem("token");
    let created = 0;
    for (const lt of activeLeaves) {
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
      } catch {}
    }
    setLoading(false);
    if (created > 0) {
      setSuccess(
        `${created} leave earning(s) submitted for ${monthName(month)} ${year}.`,
      );
      const defaults = {};
      leaveTypes.forEach((lt) => {
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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
          {[...leaveTypes]
            .sort((a, b) => {
              const aB = assignmentMap[a.leave_code];
              const bB = assignmentMap[b.leave_code];
              return (
                toNum(bB?.total_hours) - toNum(aB?.total_hours) ||
                a.leave_code.localeCompare(b.leave_code)
              );
            })
            .map((lt) => {
              const balance = assignmentMap[lt.leave_code];
              const remaining = toNum(balance?.remaining_hours);
              const total = toNum(balance?.total_hours);
              const isAuto = SL_VL_AUTO_CODES.includes(lt.leave_code);
              const isTouched = !!userTouched[lt.leave_code];
              const valHrs = toNum(earnedHours[lt.leave_code]);
              const isActive = valHrs > 0 && (isTouched || !isAuto);
              const isAutoUnconfirmed = isAuto && !isTouched && valHrs > 0;
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
                    border: `1.5px solid ${isActive ? "rgba(0,0,0,0.18)" : isAutoUnconfirmed ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.08)"}`,
                    bgcolor: isActive
                      ? "rgba(0,0,0,0.03)"
                      : isAutoUnconfirmed
                        ? "rgba(0,0,0,0.02)"
                        : "rgba(0,0,0,0.01)",
                    transition: "all 0.15s",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
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
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={isAuto ? "1.250" : "0.000"}
                        value={displayVal}
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
                          border: `1.5px solid ${isActive ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.14)"}`,
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          outline: "none",
                          fontFamily: T.poppins,
                          boxSizing: "border-box",
                          background: "#fff",
                          color: "#1a1a1a",
                        }}
                      />
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
              leaveTypes.forEach((lt) => {
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

// ─── SC Input Column ───────────────────────────────────────────────────────────
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
  const [scType, setSCType] = useState("auto");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const calDays = getCalendarDays(year, month);
  const empCat = employee ? empCatMap[String(employee.employeeNumber)] : null;

  const SC_TYPES = {
    commutative: { label: "Commutative", color: "#2a5a2a" },
    non_commutative: { label: "Non-Commutative", color: "#3a2a1a" },
    tempo: { label: "Leave-Only (Tempo)", color: "#1a3a5a" },
  };

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
    setSCType("auto");
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

  const derivedSCType = useMemo(() => {
    if (!empCat) return "non_commutative";
    const l = (empCat.label || "").toLowerCase();
    if (l.includes("tempo")) return "tempo";
    if (l.includes("designated") || l.includes("40")) return "commutative";
    return "non_commutative";
  }, [empCat]);

  const effectiveSCType = scType === "auto" ? derivedSCType : scType;

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
          sc_type: effectiveSCType,
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
        <Box
          sx={{
            mb: 1,
            p: 0.75,
            borderRadius: 1.5,
            border: "1px solid rgba(0,0,0,0.1)",
            bgcolor: "rgba(0,0,0,0.02)",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.66rem",
              fontWeight: 700,
              color: SC_TYPES[effectiveSCType]?.color || "#333",
              fontFamily: T.poppins,
            }}
          >
            SC Rule: {SC_TYPES[effectiveSCType]?.label}
            {scType !== "auto" && (
              <span
                style={{ color: "#9a5000", marginLeft: 6, fontSize: "0.6rem" }}
              >
                (manual override)
              </span>
            )}
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
const CTOInputColumn = ({
  employee,
  empCatMap,
  unit,
  year,
  month,
  onRecordsRefresh,
}) => {
  const [otHours, setOtHours] = useState(0);
  const [otDraft, setOtDraft] = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const calDays = getCalendarDays(year, month);
  const empCat = employee ? empCatMap[String(employee.employeeNumber)] : null;

  const isEligible = useMemo(() => {
    if (!empCat) return true;
    const l = (empCat.label || "").toLowerCase();
    return l.includes("40") || l.includes("designated");
  }, [empCat]);

  useEffect(() => {
    setOtHours(0);
    setOtDraft(null);
    setRemarks("");
    setExpiryDate("");
    setError("");
  }, [employee, year, month]);

  const earned = toNum(otHours);
  const otDisplay =
    otDraft !== null
      ? otDraft
      : earned === 0
        ? ""
        : unit === "days"
          ? String(parseFloat((earned / 8).toFixed(3)))
          : String(earned);

  const handleSave = async () => {
    if (!employee) {
      setError("Select an employee first");
      return;
    }
    if (earned <= 0) {
      setError("OT hours must be > 0");
      return;
    }
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_BASE_URL}/api/earnings/cto`,
        {
          employeeNumber: employee.employeeNumber,
          ot_hours: earned,
          earned_hours: earned,
          period_year: parseInt(year, 10) || new Date().getFullYear(),
          period_month: parseInt(month, 10),
          expiry_date: expiryDate || null,
          remarks: remarks || null,
          emp_category_snapshot: {
            label: empCat?.label || "",
            colorHex: empCat?.colorHex,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSuccess(
        `${fmtHrs(earned, unit)} CTO submitted for ${monthName(month)} ${year}.`,
      );
      setOtHours(0);
      setOtDraft(null);
      setRemarks("");
      setExpiryDate("");
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
        <ColHeader icon={CTOIcon} label="CTO Input" color={T.accent} />
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
          <CTOIcon sx={{ fontSize: 36, color: alpha(T.accent, 0.15), mb: 1 }} />
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
      <ColHeader icon={CTOIcon} label="CTO Input" color={T.accent} />
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
        <Box
          sx={{
            mb: 1,
            p: 0.75,
            borderRadius: 1.5,
            bgcolor: "rgba(0,0,0,0.02)",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.66rem",
              fontWeight: 700,
              color: "#333",
              fontFamily: T.poppins,
            }}
          >
            CTO Rule — 40-hr / Designated only · 1:1 OT accrual
          </Typography>
          {!isEligible && (
            <Typography
              sx={{
                fontSize: "0.6rem",
                color: "#9a5000",
                fontWeight: 700,
                fontFamily: T.poppins,
                mt: 0.2,
              }}
            >
              ⚠ Not a 40-hr / Designated employee — CTO may not apply
            </Typography>
          )}
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
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0.75,
            mb: 1,
          }}
        >
          <Box
            sx={{
              borderRadius: 1.5,
              border: `1.5px solid ${earned > 0 ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.1)"}`,
              bgcolor: earned > 0 ? "rgba(0,0,0,0.02)" : "#fafafa",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: 0.75,
                py: 0.35,
                bgcolor: earned > 0 ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.03)",
                borderBottom: `1px solid ${earned > 0 ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.07)"}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: earned > 0 ? "#1a1a1a" : T.muted,
                  fontFamily: T.poppins,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                OT Hours
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.54rem",
                  color: T.faint,
                  fontFamily: T.poppins,
                }}
              >
                1:1 ratio → CTO
              </Typography>
            </Box>
            <Box sx={{ px: 0.65, py: 0.4 }}>
              <input
                type="text"
                inputMode="decimal"
                placeholder={unit === "days" ? "0.000 days" : "0.000 hrs"}
                value={otDisplay}
                onChange={(e) => {
                  setOtDraft(e.target.value);
                  const n = parseFloat(e.target.value);
                  if (!isNaN(n)) setOtHours(toHours(n, unit));
                }}
                onFocus={() => setOtDraft(otDisplay)}
                onBlur={() => {
                  const n = parseFloat(otDraft);
                  setOtHours(isNaN(n) ? 0 : toHours(n, unit));
                  setOtDraft(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                style={{
                  width: "100%",
                  padding: "4px 6px",
                  borderRadius: 5,
                  border: `1px solid ${earned > 0 ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.1)"}`,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  outline: "none",
                  fontFamily: T.poppins,
                  boxSizing: "border-box",
                  background: "#fff",
                  color: "#1a1a1a",
                }}
              />
              {earned > 0 && (
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
                    ? `${(earned / 8).toFixed(3)}d`
                    : `${earned.toFixed(3)}h`}
                </Typography>
              )}
            </Box>
          </Box>
          <Box
            sx={{
              borderRadius: 1.5,
              border: `1.5px solid ${earned > 0 ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.1)"}`,
              bgcolor: earned > 0 ? "rgba(0,0,0,0.03)" : "#fafafa",
              px: 1.25,
              py: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.58rem",
                color: T.faint,
                fontFamily: T.poppins,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              CTO Earned
            </Typography>
            <Typography
              sx={{
                fontSize: "1rem",
                fontWeight: 900,
                color: earned > 0 ? "#1a1a1a" : T.faint,
                fontFamily: T.poppins,
              }}
            >
              {earned > 0 ? fmtHrs(earned, unit) : "—"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mb: 1 }}>
          <Typography
            sx={{
              fontSize: "0.66rem",
              fontWeight: 700,
              color: "#333",
              mb: 0.4,
              fontFamily: T.poppins,
            }}
          >
            Expiry Date{" "}
            <span
              style={{ color: T.faint, fontSize: "0.6rem", fontWeight: 400 }}
            >
              (optional)
            </span>
          </Typography>
          <FieldInput
            type="date"
            size="small"
            fullWidth
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: new Date().toISOString().split("T")[0] }}
          />
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
          disabled={loading || earned <= 0}
          startIcon={
            loading ? (
              <CircularProgress size={14} sx={{ color: "#fff" }} />
            ) : (
              <AddIcon sx={{ fontSize: "15px !important" }} />
            )
          }
          sx={{
            height: 36,
            bgcolor: earned > 0 ? T.accent : "#c0c0c0",
            color: "#fff",
            fontFamily: T.poppins,
            fontSize: "0.78rem",
            "&:hover": { bgcolor: earned > 0 ? T.accentDark : "#c0c0c0" },
            "&:disabled": {
              bgcolor: "#c0c0c0 !important",
              color: "#888 !important",
            },
          }}
        >
          {loading
            ? "Saving…"
            : earned > 0
              ? `Submit ${fmtHrs(earned, unit)} CTO →`
              : "Enter OT hours above"}
        </AccentButton>
      </Box>
    </Box>
  );
};

// ─── Tab defs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "leave", label: "Leaves", shortLabel: "Leave", icon: LeaveIcon },
  { id: "sc", label: "Service Credit", shortLabel: "SC", icon: SCIcon },
  {
    id: "cto",
    label: "Compensatory Time Off",
    shortLabel: "CTO",
    icon: CTOIcon,
  },
];

// ─── Main Component ────────────────────────────────────────────────────────────
const EarningsManagement = () => {
  const now = new Date();
  const [activeTab, setActiveTab] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
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

  const fetchAttendance = useCallback(async () => {
    if (!selectedEmployee) {
      setAttendanceData(null);
      return;
    }
    setAttLoading(true);
    const token = localStorage.getItem("token");
    setAttendanceData(
      await fetchAttendanceForEmployee(
        selectedEmployee.employeeNumber,
        periodYear,
        periodMonth,
        token,
      ),
    );
    setAttLoading(false);
  }, [selectedEmployee, periodYear, periodMonth]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const h = { Authorization: `Bearer ${token}` };
        const [usersRes, personsRes, deptRes, empCatRes, typeConfigRes] =
          await Promise.allSettled([
            axios.get(`${API_BASE_URL}/users`, { headers: h }),
            axios.get(`${API_BASE_URL}/personalinfo/person_table`, {
              headers: h,
            }),
            axios.get(`${API_BASE_URL}/api/department-assignment`, {
              headers: h,
            }),
            axios.get(
              `${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,
              { headers: h },
            ),
            axios.get(
              `${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`,
              { headers: h },
            ),
          ]);
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
            if (num)
              sexMap[num] = {
                firstName: p.firstName,
                middleName: p.middleName,
                lastName: p.lastName,
              };
          });
        }
        setEmployees(
          usersData.map((u) => {
            const num = u.employeeNumber?.toString();
            return { ...u, ...(num ? sexMap[num] || {} : {}) };
          }),
        );
        if (deptRes.status === "fulfilled") {
          const map = {};
          (Array.isArray(deptRes.value.data) ? deptRes.value.data : []).forEach(
            (item) => {
              if (item.employeeNumber && item.code)
                map[String(item.employeeNumber)] = item.code;
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
      }
      setPageLoading(false);
    })();
  }, []);

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
    let list = employees
      .map((e) => ({
        ...e,
        _displayName: buildDisplayName(e),
        _searchKey:
          `${buildDisplayName(e)} ${e.employeeNumber || ""}`.toLowerCase(),
        _sortLast: (e.lastName || "").toLowerCase(),
      }))
      .sort((a, b) => a._sortLast.localeCompare(b._sortLast));
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

  if (pageLoading)
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress sx={{ color: T.accent }} />
      </Box>
    );

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
  };

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
                  Earnings Management
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
              <Autocomplete
                value={selectedEmployee}
                onChange={(_, v) => setSelectedEmployee(v)}
                options={employeeOptions}
                autoHighlight
                getOptionLabel={(o) =>
                  `${o._displayName} (${o.employeeNumber})`
                }
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
                            sx={{ display: "flex", gap: 0.4, flexWrap: "wrap" }}
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
              <Box sx={{ ml: "auto" }}>
                <MonthYearNavigator
                  year={periodYear}
                  month={periodMonth}
                  onChange={handleMonthChange}
                />
              </Box>
              {/* Selected employee chip */}
              {selectedEmployee && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    pl: 1,
                    borderLeft: `1px solid ${T.divider}`,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 20,
                      height: 20,
                      bgcolor: T.accent,
                      fontSize: "0.58rem",
                      fontWeight: 800,
                      borderRadius: "4px",
                    }}
                  >
                    {`${selectedEmployee.lastName?.[0] || ""}${selectedEmployee.firstName?.[0] || ""}`.toUpperCase() ||
                      "?"}
                  </Avatar>
                  <Box>
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: T.text,
                        fontFamily: T.poppins,
                        lineHeight: 1,
                      }}
                    >
                      {`${(selectedEmployee.lastName || "").toUpperCase()}, ${selectedEmployee.firstName || ""}`.trim()}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.35 }}>
                      {deptCode && <DeptBadge code={deptCode} />}
                      {empCat && (
                        <EmpCatBadge
                          label={empCat.label}
                          colorHex={empCat.colorHex}
                        />
                      )}
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedEmployee(null)}
                    sx={{
                      color: T.faint,
                      p: 0.2,
                      "&:hover": { color: T.accent },
                    }}
                  >
                    <Close sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              )}
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

          {/* Tab row */}
          <Box
            sx={{
              background: T.headerGrad,
              px: { xs: 0, sm: 1 },
              pt: 0.75,
              pb: 0,
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            {TABS.map((t, idx) => {
              const Icon = t.icon;
              const isActive = idx === activeTab;
              return (
                <Box
                  key={t.id}
                  onClick={() => setActiveTab(idx)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    px: { xs: 1.5, sm: 2.5 },
                    py: 0.85,
                    cursor: "pointer",
                    position: "relative",
                    borderRadius: "8px 8px 0 0",
                    transition: "background 0.15s",
                    bgcolor: isActive
                      ? "rgba(255,255,255,0.97)"
                      : "transparent",
                    "&:hover": isActive
                      ? {}
                      : { bgcolor: "rgba(255,255,255,0.1)" },
                    "&::after": isActive
                      ? {
                          content: '""',
                          position: "absolute",
                          bottom: -1,
                          left: 0,
                          right: 0,
                          height: 2,
                          bgcolor: "rgba(255,255,255,0.97)",
                        }
                      : {},
                  }}
                >
                  <Icon
                    sx={{
                      fontSize: 13,
                      color: isActive ? T.accent : "rgba(255,255,255,0.6)",
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.73rem",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? T.accent : "rgba(255,255,255,0.7)",
                      fontFamily: T.poppins,
                      whiteSpace: "nowrap",
                      display: { xs: "none", sm: "block" },
                    }}
                  >
                    {t.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.73rem",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? T.accent : "rgba(255,255,255,0.7)",
                      fontFamily: T.poppins,
                      whiteSpace: "nowrap",
                      display: { xs: "block", sm: "none" },
                    }}
                  >
                    {t.shortLabel}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </SectionCard>
      </Box>

      {/* ── 3-Column Content ── */}
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
        <SectionCard sx={{ borderRadius: "0 0 12px 12px", borderTop: "none" }}>
          <Fade
            in
            key={`${activeTab}-${periodYear}-${periodMonth}`}
            timeout={250}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                height: "calc(100vh - 340px)",
                minHeight: 480,
                overflow: "hidden",
              }}
            >
              {/* Column 1: Attendance */}
              <Box
                sx={{
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <AttendanceColumn
                  employee={selectedEmployee}
                  year={periodYear}
                  month={periodMonth}
                  attendanceData={attendanceData}
                  attendanceLoading={attendanceLoading}
                  onRefresh={fetchAttendance}
                  onRecordsRefresh={handleRecordsRefresh}
                  empCat={empCat}
                  vlReceiptRefreshKey={vlReceiptRefreshKey}
                />
              </Box>
              {/* Column 2: Input Earnings */}
              <Box
                sx={{
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {activeTab === 0 && (
                  <LeaveInputColumn
                    {...sharedTabProps}
                    onBalanceChanged={handleBalanceChanged}
                    refreshKey={balanceKey}
                    onRecordsRefresh={handleRecordsRefresh}
                  />
                )}
                {activeTab === 1 && (
                  <SCInputColumn
                    {...sharedTabProps}
                    onRecordsRefresh={handleRecordsRefresh}
                  />
                )}
                {activeTab === 2 && (
                  <CTOInputColumn
                    {...sharedTabProps}
                    onRecordsRefresh={handleRecordsRefresh}
                  />
                )}
              </Box>
              {/* Column 3: Records Earnings*/}
              <Box
                sx={{
                  borderRight: `1px solid ${T.divider}`,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <RecordsList
                  employeeNumber={selectedEmployee?.employeeNumber}
                  type={TABS[activeTab].id}
                  unit={unit}
                  refreshKey={recordsRefreshKey}
                  year={periodYear}
                  month={periodMonth}
                  onApproved={handleBalanceChanged}
                  standalone
                  onStatusChange={() => setVlReceiptRefreshKey((k) => k + 1)}
                />
              </Box>
            </Box>
          </Fade>
        </SectionCard>
      </Box>

      <FloatingConversionWidget />
    </Box>
  );
};

export default EarningsManagement;
