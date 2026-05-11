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

// ─── Compact unit toggle ──────────────────────────────────────────────────────
/**
 * Small inline Days/Hours toggle for use inside column headers.
 * Independent of the parent `unit` prop — controls input fields only.
 */
const InputUnitToggle = ({ value, onChange }) => (
  <ToggleButtonGroup
    value={value}
    exclusive
    onChange={(_, v) => v && onChange(v)}
    size="small"
    sx={{
      "& .MuiToggleButton-root": {
        px: 0.9,
        py: 0.15,
        border: `1px solid ${T.accentBorder}`,
        fontSize: "0.6rem",
        fontWeight: 700,
        color: T.muted,
        fontFamily: T.poppins,
        minHeight: 22,
        lineHeight: 1,
        textTransform: "none",
        "&.Mui-selected": {
          bgcolor: T.accent,
          color: "#fff",
          borderColor: T.accent,
        },
        "&:first-of-type": { borderRadius: "5px 0 0 5px" },
        "&:last-of-type": { borderRadius: "0 5px 5px 0" },
      },
    }}
  >
    <ToggleButton value="days">
      <DayIcon sx={{ fontSize: 10, mr: 0.3 }} />
      Days
    </ToggleButton>
    <ToggleButton value="hours">
      <HourIcon sx={{ fontSize: 10, mr: 0.3 }} />
      Hours
    </ToggleButton>
  </ToggleButtonGroup>
);

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

/**
 * CompactInputGrid — renders a grid of OT type input cells.
 *
 * `inputUnit` is now passed explicitly from the parent so each cell
 * displays and commits in the correct unit.
 */
const CompactInputGrid = ({
  fields,
  inputUnit,   // "days" | "hours" — local input unit, NOT the parent display unit
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
            const val = toNum(values[field.key]);  // always stored in hours internally
            const draft = drafts[field.key];
            const isActive = val > 0;

            // Derive the display value in terms of `inputUnit`
            const displayVal =
              draft !== undefined
                ? draft
                : val === 0
                  ? ""
                  : inputUnit === "days"
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
                    placeholder={inputUnit === "days" ? "0.000 d" : "0.000 h"}
                    value={displayVal}
                    onChange={(e) => {
                      onDraftChange(field.key, e.target.value);
                      const n = parseFloat(e.target.value);
                      // Always commit internally as hours
                      if (!isNaN(n)) onCommit(field.key, toHours(n, inputUnit));
                      else onCommit(field.key, 0);
                    }}
                    onFocus={() => onDraftChange(field.key, displayVal)}
                    onBlur={() => {
                      const n = parseFloat(draft ?? displayVal);
                      onCommit(field.key, isNaN(n) ? 0 : toHours(n, inputUnit));
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
                  {/* Always show the alternate unit as a hint */}
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
                      {inputUnit === "days"
                        ? `≈ ${val.toFixed(3)} hrs`
                        : `≈ ${(val / 8).toFixed(3)} days`}
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

// ─── SC Input Column ───────────────────────────────────────────────────────────
const SCInputColumn = ({
  employee,
  empCatMap,
  unit,       // parent display unit (used for success message & records list)
  year,
  month,
  onRecordsRefresh,
}) => {
  // ── Local input unit — defaults to "days", user can switch to "hours" ────────
  const [inputUnit, setInputUnit] = useState("days");

  const [otTypes, setOtTypes] = useState([]);
  const [otValues, setOtValues] = useState({});   // always stored as HOURS internally
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

  // When inputUnit toggles, wipe drafts so each cell recalculates its display
  useEffect(() => {
    setOtDrafts({});
  }, [inputUnit]);

  const computedSC = useMemo(() => {
    let totalOT = 0,
      totalSC = 0;
    otTypes.forEach((t) => {
      const ot = toNum(otValues[t.id]);  // hours
      totalOT += ot;
      totalSC += ot * (t.multiplier || 1);
    });
    return { totalOT, total: parseFloat(totalSC.toFixed(3)) };
  }, [otValues, otTypes]);

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
      // Success message uses the parent unit for consistency with the records list
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
        >
          <InputUnitToggle value={inputUnit} onChange={setInputUnit} />
        </ColHeader>
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
      {/* ── Column header with inline unit toggle ── */}
      <ColHeader icon={SCIcon} label="Service Credit Input" color={T.accent}>
        <Tooltip title="Switch the input fields between Days and Hours. The records list uses the global unit setting." placement="left">
          <Box>
            <InputUnitToggle value={inputUnit} onChange={(v) => {
              setInputUnit(v);
              setOtDrafts({});
            }} />
          </Box>
        </Tooltip>
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
          {/* Active input mode indicator */}
          <Chip
            label={`Input: ${inputUnit}`}
            size="small"
            sx={{
              ml: "auto",
              height: 16,
              fontSize: "0.55rem",
              fontWeight: 700,
              bgcolor: alpha(T.accent, 0.08),
              color: T.accent,
              border: `1px solid ${T.accentBorder}`,
              fontFamily: T.poppins,
              "& .MuiChip-label": { px: 0.6 },
            }}
          />
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
          {/* Label reflects current inputUnit */}
          OT {inputUnit === "days" ? "Days" : "Hours"} Input
        </Typography>

        {/* Pass inputUnit down instead of the parent unit prop */}
        <CompactInputGrid
          fields={otTypes.map((t) => ({
            key: t.id,
            label: t.name,
            subtitle: `×${t.multiplier || 1} → SC`,
          }))}
          inputUnit={inputUnit}
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

        {/* Summary always shows both units */}
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
                lineHeight: 1.15,
              }}
            >
              {(computedSC.totalOT / 8).toFixed(3)} days
            </Typography>
            <Typography
              sx={{
                fontSize: "0.62rem",
                color: T.muted,
                fontFamily: T.poppins,
                fontWeight: 600,
              }}
            >
              {computedSC.totalOT.toFixed(3)} hrs
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
                lineHeight: 1.15,
              }}
            >
              {computedSC.total > 0
                ? `${(computedSC.total / 8).toFixed(3)} days`
                : "—"}
            </Typography>
            {computedSC.total > 0 && (
              <Typography
                sx={{
                  fontSize: "0.62rem",
                  color: T.muted,
                  fontFamily: T.poppins,
                  fontWeight: 600,
                }}
              >
                {computedSC.total.toFixed(3)} hrs
              </Typography>
            )}
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
              // Submit label shows both for confirmation clarity
              ? `Submit ${(computedSC.total / 8).toFixed(3)} days (${computedSC.total.toFixed(3)} hrs) SC →`
              : `Enter OT ${inputUnit} above`}
        </AccentButton>
      </Box>
    </Box>
  );
};

export { SCInputColumn };