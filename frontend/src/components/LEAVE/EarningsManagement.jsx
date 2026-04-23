import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import {
  Box, Typography, Card, CircularProgress,
  ToggleButton, ToggleButtonGroup, Chip,
  Button, Tooltip, Select, MenuItem, FormControl,
  Avatar, Autocomplete, TextField, Alert,
  Fade, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions,
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
  Delete as DeleteIcon,
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
  AccessTime as ClockIcon,
  TrendingDown as TardyIcon,
  EventAvailable as PresentIcon,
} from "@mui/icons-material";

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  accent:       "#6d2323",
  accentDark:   "#5a1d1d",
  accentMid:    "#8B4545",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  headerGrad:   "linear-gradient(135deg,#6d2323 0%,#7e2c2c 100%)",
  divider:      "rgba(0,0,0,0.08)",
  surface:      "#ffffff",
  text:         "#1a1a1a",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  poppins:      "'Poppins', sans-serif",
  statusPending:  { bg: "rgba(237,108,2,0.1)",  color: "#bf360c", border: "rgba(237,108,2,0.3)"  },
  statusApproved: { bg: "rgba(46,125,50,0.1)",  color: "#1b5e20", border: "rgba(46,125,50,0.3)"  },
  statusRejected: { bg: "rgba(211,47,47,0.1)",  color: "#b71c1c", border: "rgba(211,47,47,0.3)"  },
};

const MONTHS = [
  { value: "1",  label: "January",   short: "Jan" },
  { value: "2",  label: "February",  short: "Feb" },
  { value: "3",  label: "March",     short: "Mar" },
  { value: "4",  label: "April",     short: "Apr" },
  { value: "5",  label: "May",       short: "May" },
  { value: "6",  label: "June",      short: "Jun" },
  { value: "7",  label: "July",      short: "Jul" },
  { value: "8",  label: "August",    short: "Aug" },
  { value: "9",  label: "September", short: "Sep" },
  { value: "10", label: "October",   short: "Oct" },
  { value: "11", label: "November",  short: "Nov" },
  { value: "12", label: "December",  short: "Dec" },
];

const getCalendarDays = (year, month) => new Date(year, month, 0).getDate();

const EARN_STATUS = {
  pending:  { label: "Pending",  ...T.statusPending,  icon: PendingIcon },
  approved: { label: "Approved", ...T.statusApproved, icon: CheckIcon   },
  rejected: { label: "Rejected", ...T.statusRejected, icon: WarnIcon    },
};

const monthName  = (m) => MONTHS.find((x) => x.value === String(m))?.label || `Month ${m}`;
const monthShort = (m) => MONTHS.find((x) => x.value === String(m))?.short || `M${m}`;
const toNum      = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const toHours    = (val, unit) => unit === "days" ? val * 8 : val;
const fmtHrs     = (h, unit) => unit === "hours" ? `${toNum(h).toFixed(3)} hrs` : `${(toNum(h) / 8).toFixed(3)} days`;

const parseHHMM = (val) => {
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes(":")) {
    const parts = str.split(":");
    return Number(parts[0]) + Number(parts[1] || 0) / 60 + Number(parts[2] || 0) / 3600;
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

const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
@keyframes emFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes attPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
`;

const SectionCard = styled(Card)({
  borderRadius: 12, overflow: "hidden", background: T.surface,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
});

const FieldInput = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8, fontSize: "0.875rem", backgroundColor: "#fff",
    "& fieldset": { borderColor: T.accentBorder },
    "&:hover fieldset": { borderColor: T.accent },
    "&.Mui-focused fieldset": { borderColor: T.accent, borderWidth: 1.5 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: T.accent },
});

const AccentButton = styled(Button)({
  borderRadius: 8, textTransform: "none", fontWeight: 600, fontSize: "0.875rem",
  transition: "all 0.18s ease",
  "&:hover":  { transform: "translateY(-1px)" },
  "&:active": { transform: "translateY(0)" },
});

// ─── Month/Year Navigator ─────────────────────────────────────────────────────
const MonthYearNavigator = ({ year, month, onChange }) => {
  const now = new Date();
  const isCurrent = year === now.getFullYear() && month === (now.getMonth() + 1);
  const isFuture  = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
  const prevMonth = () => { if (month === 1) onChange(year - 1, 12); else onChange(year, month - 1); };
  const nextMonth = () => { if (month === 12) onChange(year + 1, 1); else onChange(year, month + 1); };
  const yearOptions = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i);
  const calDays = getCalendarDays(year, month);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
      <FormControl size="small" sx={{ minWidth: 86 }}>
        <Select value={year} onChange={(e) => onChange(Number(e.target.value), month)}
          sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.accent, "& .MuiOutlinedInput-notchedOutline": { borderColor: T.accentBorder }, bgcolor: "#fff", borderRadius: 2 }}>
          {yearOptions.map(y => <MenuItem key={y} value={y} sx={{ fontSize: "0.8rem", fontWeight: y === now.getFullYear() ? 700 : 400 }}>{y}</MenuItem>)}
        </Select>
      </FormControl>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
        <IconButton size="small" onClick={prevMonth} sx={{ color: T.accent, p: 0.5 }}><PrevIcon sx={{ fontSize: 16 }} /></IconButton>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select value={month} onChange={(e) => onChange(year, Number(e.target.value))}
            sx={{ fontSize: "0.78rem", fontWeight: 700, color: isCurrent ? "#fff" : T.accent, bgcolor: isCurrent ? T.accent : "#fff", borderRadius: 2, "& .MuiOutlinedInput-notchedOutline": { borderColor: isCurrent ? T.accent : T.accentBorder }, "& .MuiSelect-icon": { color: isCurrent ? "#fff" : T.accent } }}>
            {MONTHS.map(m => <MenuItem key={m.value} value={Number(m.value)} sx={{ fontSize: "0.8rem" }}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <IconButton size="small" onClick={nextMonth} disabled={isFuture} sx={{ color: isFuture ? T.faint : T.accent, p: 0.5 }}><NextIcon sx={{ fontSize: 16 }} /></IconButton>
      </Box>
      {!isCurrent && (
        <Tooltip title="Go to current month">
          <IconButton size="small" onClick={() => onChange(now.getFullYear(), now.getMonth() + 1)} sx={{ color: T.accent, p: 0.5 }}><CalIcon sx={{ fontSize: 14 }} /></IconButton>
        </Tooltip>
      )}
      {isCurrent && <Chip label="Now" size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700, bgcolor: alpha(T.accent, 0.12), color: T.accent, border: `1px solid ${T.accentBorder}` }} />}
      <Chip
        icon={<DateRangeIcon style={{ fontSize: 11, color: "#1565c0" }} />}
        label={`${calDays} cal. days`} size="small"
        sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(25,118,210,0.08)", color: "#1565c0", border: "1px solid rgba(25,118,210,0.22)" }}
      />
    </Box>
  );
};

// ─── Attendance Edit Field Cell ───────────────────────────────────────────────
const AttendanceFieldCell = ({ f, valueHrs, onChange }) => {
  const days = valueHrs / 8;
  const [local, setLocal] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <Box sx={{
      display: "grid", gridTemplateColumns: "1fr 72px 38px",
      alignItems: "center", gap: 0.5, px: 0.75, py: 0.35,
      borderRadius: 1, mb: 0.25,
      bgcolor: valueHrs > 0 ? "rgba(46,125,50,0.04)" : "transparent",
      border: `1px solid ${valueHrs > 0 ? "rgba(46,125,50,0.18)" : "transparent"}`,
    }}>
      <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: valueHrs > 0 ? "#2e7d32" : T.muted, fontFamily: T.poppins, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {f.label}
      </Typography>
      <Box sx={{ position: "relative" }}>
        <input
          type="text" inputMode="decimal"
          placeholder="0.000"
          value={focused ? local : (valueHrs > 0 ? days.toFixed(3) : "")}
          onFocus={() => { setFocused(true); setLocal(valueHrs > 0 ? days.toFixed(3) : ""); }}
          onChange={(e) => { setLocal(e.target.value); const n = parseFloat(e.target.value); onChange(f.key, isNaN(n) ? 0 : n * 8); }}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: "3px 22px 3px 6px", borderRadius: 4,
            border: `1px solid ${valueHrs > 0 ? "rgba(46,125,50,0.4)" : "rgba(0,0,0,0.18)"}`,
            fontSize: "0.74rem", fontWeight: 700, outline: "none",
            fontFamily: T.poppins, boxSizing: "border-box",
            background: "#fff", color: valueHrs > 0 ? "#2e7d32" : "#1565c0",
          }}
        />
        <span style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", fontSize: "0.55rem", color: T.faint, pointerEvents: "none" }}>d</span>
      </Box>
      <Typography sx={{ fontSize: "0.58rem", color: valueHrs > 0 ? "#4caf50" : T.faint, fontFamily: T.poppins, textAlign: "right", lineHeight: 1.2 }}>
        {valueHrs > 0 ? `${valueHrs.toFixed(1)}h` : "—"}
      </Typography>
    </Box>
  );
};

// ─── Attendance Edit Panel ────────────────────────────────────────────────────
const AttendanceEditPanel = ({ employee, year, month, attendanceData, onRefresh }) => {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [fields,  setFields]  = useState({});

  const raw = attendanceData?.summary;

  const ATTEND_FIELDS = [
    { key: "totalRenderedTimeMorning",             label: "Morning"          },
    { key: "totalRenderedTimeMorningTardiness",    label: "Morning Late"     },
    { key: "totalRenderedTimeAfternoon",           label: "Afternoon"        },
    { key: "totalRenderedTimeAfternoonTardiness",  label: "Afternoon Late"   },
    { key: "totalRenderedHonorarium",              label: "Honorarium"       },
    { key: "totalRenderedHonorariumTardiness",     label: "Hon. Tardiness"   },
    { key: "totalRenderedServiceCredit",           label: "Service Credit"   },
    { key: "totalRenderedServiceCreditTardiness",  label: "SC Tardiness"     },
    { key: "totalRenderedOvertime",                label: "Overtime"         },
    { key: "totalRenderedOvertimeTardiness",       label: "OT Tardiness"     },
    { key: "overallRenderedOfficialTime",          label: "Overall Rendered" },
    { key: "overallRenderedOfficialTimeTardiness", label: "Overall Late"     },
    { key: "overallTotalOfficialSchedule",         label: "Total Schedule"   },
  ];

  useEffect(() => {
    if (!raw) { setFields({}); return; }
    const init = {};
    ATTEND_FIELDS.forEach(({ key }) => { init[key] = parseHHMM(raw[key]); });
    setFields(init);
  }, [raw]);

  const handleChange = (key, val) => setFields(p => ({ ...p, [key]: toNum(val) }));

  const handleSave = async () => {
    if (!raw?.id) { setError("No record to update."); return; }
    setSaving(true); setError("");
    const token = localStorage.getItem("token");
    const payload = { personID: employee.employeeNumber, startDate: raw.startDate, endDate: raw.endDate };
    ATTEND_FIELDS.forEach(({ key }) => { payload[key] = hoursToHHMM(toNum(fields[key])); });
    try {
      await axios.put(`${API_BASE_URL}/attendance/api/overall_attendance_record/${raw.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess("Saved!"); setEditing(false);
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError("Save failed: " + (err.response?.data?.message || err.message)); }
    setSaving(false);
  };

  if (!raw) return null;

  const calDays    = getCalendarDays(year, month);
  const overallHrs = toNum(fields.overallRenderedOfficialTime ?? parseHHMM(raw.overallRenderedOfficialTime));
  const overallDays = overallHrs / 8;
  const tardHrs    = toNum(fields.overallRenderedOfficialTimeTardiness ?? parseHHMM(raw.overallRenderedOfficialTimeTardiness));
  const tardDays   = tardHrs / 8;
  const stats      = attendanceData?.stats || {};

  const half = Math.ceil(ATTEND_FIELDS.length / 2);
  const col1 = ATTEND_FIELDS.slice(0, half);
  const col2 = ATTEND_FIELDS.slice(half);

  return (
    <Box sx={{ mb: 0.5, borderRadius: 1.5, border: "1px solid rgba(25,118,210,0.2)", bgcolor: "#f8fbff", overflow: "hidden" }}>
      <Box sx={{ px: 1.25, py: 0.6, display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", bgcolor: "rgba(25,118,210,0.05)", borderBottom: editing ? "1px solid rgba(25,118,210,0.15)" : "none" }}>
        <EditIcon sx={{ fontSize: 11, color: "#1565c0", flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, color: "#1565c0", fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
          Attendance Record
        </Typography>
        {raw.startDate && (
          <Typography sx={{ fontSize: "0.58rem", color: "#5c85c7", fontFamily: T.poppins, flexShrink: 0 }}>
            {raw.startDate} → {raw.endDate}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 0.4, flexWrap: "wrap", flex: 1, alignItems: "center" }}>
          <Box sx={{ px: 0.6, py: 0.15, borderRadius: 0.75, bgcolor: "rgba(25,118,210,0.1)", border: "1px solid rgba(25,118,210,0.22)", display: "flex", alignItems: "baseline", gap: 0.25 }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 900, color: "#1565c0", fontFamily: T.poppins, lineHeight: 1 }}>{calDays}</Typography>
            <Typography sx={{ fontSize: "0.52rem", color: "#1565c0", fontFamily: T.poppins }}>cal d</Typography>
          </Box>
          <Box sx={{ px: 0.6, py: 0.15, borderRadius: 0.75, bgcolor: "rgba(46,125,50,0.1)", border: "1px solid rgba(46,125,50,0.28)", display: "flex", alignItems: "baseline", gap: 0.25 }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 900, color: "#2e7d32", fontFamily: T.poppins, lineHeight: 1 }}>{overallDays.toFixed(2)}</Typography>
            <Typography sx={{ fontSize: "0.52rem", color: "#2e7d32", fontFamily: T.poppins }}>d</Typography>
            <Typography sx={{ fontSize: "0.5rem", color: "#66bb6a", fontFamily: T.poppins }}>/ {overallHrs.toFixed(1)}h</Typography>
          </Box>
          {tardHrs > 0 && (
            <Box sx={{ px: 0.6, py: 0.15, borderRadius: 0.75, bgcolor: "rgba(211,47,47,0.08)", border: "1px solid rgba(211,47,47,0.28)", display: "flex", alignItems: "baseline", gap: 0.25 }}>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 900, color: "#c62828", fontFamily: T.poppins, lineHeight: 1 }}>{tardDays.toFixed(2)}</Typography>
              <Typography sx={{ fontSize: "0.52rem", color: "#c62828", fontFamily: T.poppins }}>d late</Typography>
            </Box>
          )}
          {[
            { label: "present", val: stats.present_days, color: "#2e7d32" },
            { label: "absent",  val: stats.absent_days,  color: "#7b1fa2" },
            { label: "late",    val: stats.late_days,    color: "#e65100" },
          ].filter(s => toNum(s.val) > 0).map(s => (
            <Box key={s.label} sx={{ px: 0.6, py: 0.15, borderRadius: 0.75, bgcolor: alpha(s.color, 0.07), border: `1px solid ${alpha(s.color, 0.22)}`, display: "flex", alignItems: "baseline", gap: 0.25 }}>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: s.color, fontFamily: T.poppins, lineHeight: 1 }}>{s.val}</Typography>
              <Typography sx={{ fontSize: "0.52rem", color: s.color, fontFamily: T.poppins }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
          {success && <Typography sx={{ fontSize: "0.6rem", color: "#2e7d32", fontFamily: T.poppins, fontWeight: 700 }}>✓ {success}</Typography>}
          {!editing ? (
            <Button size="small" onClick={() => setEditing(true)}
              sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#1565c0", textTransform: "none", fontFamily: T.poppins, px: 0.75, py: 0.15, minWidth: 0, borderRadius: 0.75, bgcolor: "rgba(25,118,210,0.1)", "&:hover": { bgcolor: "rgba(25,118,210,0.18)" } }}>
              Edit
            </Button>
          ) : (
            <>
              <Button size="small" onClick={() => setEditing(false)}
                sx={{ fontSize: "0.6rem", fontWeight: 600, color: T.muted, textTransform: "none", fontFamily: T.poppins, px: 0.75, py: 0.15, minWidth: 0, borderRadius: 0.75 }}>
                Cancel
              </Button>
              <Button size="small" onClick={handleSave} disabled={saving}
                startIcon={saving ? <CircularProgress size={9} /> : <SaveIcon sx={{ fontSize: "11px !important" }} />}
                sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff", textTransform: "none", fontFamily: T.poppins, px: 0.75, py: 0.15, minWidth: 0, borderRadius: 0.75, bgcolor: "#1565c0", "&:hover": { bgcolor: "#0d47a1" } }}>
                {saving ? "…" : "Save"}
              </Button>
            </>
          )}
        </Box>
      </Box>
      {editing && (
        <Box sx={{ px: 1, pb: 1 }}>
          {error && <Alert severity="error" sx={{ mt: 0.5, mb: 0.5, fontSize: "0.68rem", py: 0, borderRadius: 1 }}>{error}</Alert>}
          <Typography sx={{ fontSize: "0.58rem", fontWeight: 700, color: "#1565c0", fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em", mt: 0.75, mb: 0.5 }}>
            Input in days · hours shown as hint · {calDays} calendar days this month
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Box>{col1.map(f => <AttendanceFieldCell key={f.key} f={f} valueHrs={toNum(fields[f.key])} onChange={handleChange} />)}</Box>
            <Box>{col2.map(f => <AttendanceFieldCell key={f.key} f={f} valueHrs={toNum(fields[f.key])} onChange={handleChange} />)}</Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// ─── Attendance Context Banner — redesigned ────────────────────────────────────
const AttendanceContextBanner = ({ attendanceData, loading, year, month, employee, onRefresh }) => {
  const calDays = getCalendarDays(year, month);

  if (loading) return (
    <Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
      <CircularProgress size={12} sx={{ color: T.accent }} />
      <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins }}>Loading {monthName(month)} {year} attendance…</Typography>
    </Box>
  );

  if (!attendanceData?.summary) return (
    <Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: "rgba(25,118,210,0.05)", border: "1px dashed rgba(25,118,210,0.25)", display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
      <DateRangeIcon sx={{ fontSize: 14, color: "#1565c0" }} />
      <Box>
        <Typography sx={{ fontSize: "0.73rem", fontWeight: 700, color: "#1565c0", fontFamily: T.poppins, lineHeight: 1.2 }}>
          {monthName(month)} {year}
        </Typography>
        <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins }}>
          {calDays} cal. days · No attendance record
        </Typography>
      </Box>
    </Box>
  );

  const raw        = attendanceData.summary;
  const overallHrs = parseHHMM(raw.overallRenderedOfficialTime);
  const tardHrs    = parseHHMM(raw.overallRenderedOfficialTimeTardiness);
  const morningHrs = parseHHMM(raw.totalRenderedTimeMorning);
  const pmHrs      = parseHHMM(raw.totalRenderedTimeAfternoon);
  const otHrs      = parseHHMM(raw.totalRenderedOvertime);
  const stats      = attendanceData.stats || {};
  const lateDays   = toNum(stats.late_days);
  const absentDays = toNum(stats.absent_days);
  const presentDays = toNum(stats.present_days);
  const hasWarning = lateDays > 0 || absentDays > 0 || tardHrs > 0;

  return (
    <Box sx={{ mb: 1 }}>
      {/* ── Attendance Edit Panel (collapsible edit) ── */}
      <AttendanceEditPanel employee={employee} year={year} month={month} attendanceData={attendanceData} onRefresh={onRefresh} />

      {/* ── Main attendance summary card ── */}
      <Box sx={{
        borderRadius: 2,
        border: `1px solid ${hasWarning ? "rgba(230,81,0,0.25)" : "rgba(46,125,50,0.2)"}`,
        bgcolor: "#fff",
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        mb: 0.5,
      }}>
        {/* Top row: month label + key metrics */}
        <Box sx={{
          display: "flex", alignItems: "stretch",
          background: hasWarning
            ? "linear-gradient(90deg, rgba(230,81,0,0.06) 0%, rgba(255,255,255,0) 40%)"
            : "linear-gradient(90deg, rgba(46,125,50,0.06) 0%, rgba(255,255,255,0) 40%)",
          borderBottom: `1px solid ${hasWarning ? "rgba(230,81,0,0.1)" : "rgba(46,125,50,0.1)"}`,
        }}>
          {/* Month pill */}
          <Box sx={{
            px: 1.25, py: 0.75,
            bgcolor: hasWarning ? "rgba(230,81,0,0.08)" : "rgba(46,125,50,0.08)",
            borderRight: `1px solid ${hasWarning ? "rgba(230,81,0,0.15)" : "rgba(46,125,50,0.15)"}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            minWidth: 54, flexShrink: 0,
          }}>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 900, color: hasWarning ? "#bf360c" : "#2e7d32", fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1 }}>
              {monthShort(month)}
            </Typography>
            <Typography sx={{ fontSize: "0.56rem", color: hasWarning ? "#e64a19" : "#4caf50", fontFamily: T.poppins, lineHeight: 1.3 }}>
              {year}
            </Typography>
            {hasWarning
              ? <WarnIcon sx={{ fontSize: 11, color: "#e65100", mt: 0.25 }} />
              : <CheckIcon sx={{ fontSize: 11, color: "#43a047", mt: 0.25 }} />
            }
          </Box>

          {/* Rendered days — main hero metric */}
          <Box sx={{ px: 1.5, py: 0.75, borderRight: `1px solid rgba(0,0,0,0.07)`, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 80 }}>
            <Typography sx={{ fontSize: "0.56rem", fontWeight: 600, color: T.faint, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1, mb: 0.2 }}>
              Rendered
            </Typography>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.3 }}>
              <Typography sx={{ fontSize: "1.05rem", fontWeight: 900, color: "#2e7d32", fontFamily: T.poppins, lineHeight: 1 }}>
                {(overallHrs / 8).toFixed(2)}
              </Typography>
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 600, color: "#66bb6a", fontFamily: T.poppins }}>d</Typography>
            </Box>
            <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins, lineHeight: 1 }}>
              {overallHrs.toFixed(1)} hrs
            </Typography>
          </Box>

          {/* Session breakdown: AM / PM / OT */}
          {[
            { label: "AM",  hrs: morningHrs, color: "#1565c0" },
            { label: "PM",  hrs: pmHrs,      color: "#6a1b9a" },
            { label: "OT",  hrs: otHrs,      color: "#e65100" },
          ].map(({ label, hrs, color }) => (
            <Box key={label} sx={{ px: 1, py: 0.75, borderRight: `1px solid rgba(0,0,0,0.06)`, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 52, alignItems: "center" }}>
              <Typography sx={{ fontSize: "0.54rem", fontWeight: 700, color: alpha(color, 0.65), fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1, mb: 0.2 }}>{label}</Typography>
              {hrs > 0 ? (
                <>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color, fontFamily: T.poppins, lineHeight: 1 }}>
                    {(hrs / 8).toFixed(2)}
                  </Typography>
                  <Typography sx={{ fontSize: "0.54rem", color: alpha(color, 0.55), fontFamily: T.poppins }}>d</Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: "0.78rem", color: T.faint, fontFamily: T.poppins, lineHeight: 1.6 }}>—</Typography>
              )}
            </Box>
          ))}

          {/* Day stats: present / absent / late */}
          <Box sx={{ flex: 1, px: 1, py: 0.75, display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {presentDays > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, px: 0.75, py: 0.3, borderRadius: 1, bgcolor: "rgba(46,125,50,0.08)", border: "1px solid rgba(46,125,50,0.2)" }}>
                <PresentIcon sx={{ fontSize: 11, color: "#2e7d32" }} />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#2e7d32", fontFamily: T.poppins }}>{presentDays}</Typography>
                <Typography sx={{ fontSize: "0.58rem", color: "#66bb6a", fontFamily: T.poppins }}>present</Typography>
              </Box>
            )}
            {absentDays > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, px: 0.75, py: 0.3, borderRadius: 1, bgcolor: "rgba(123,31,162,0.08)", border: "1px solid rgba(123,31,162,0.2)" }}>
                <AbsentIcon sx={{ fontSize: 11, color: "#7b1fa2" }} />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#7b1fa2", fontFamily: T.poppins }}>{absentDays}</Typography>
                <Typography sx={{ fontSize: "0.58rem", color: "#ab47bc", fontFamily: T.poppins }}>absent</Typography>
              </Box>
            )}
            {lateDays > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, px: 0.75, py: 0.3, borderRadius: 1, bgcolor: "rgba(230,81,0,0.08)", border: "1px solid rgba(230,81,0,0.2)" }}>
                <LateIcon sx={{ fontSize: 11, color: "#e65100" }} />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#e65100", fontFamily: T.poppins }}>{lateDays}</Typography>
                <Typography sx={{ fontSize: "0.58rem", color: "#ff8a65", fontFamily: T.poppins }}>late</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Bottom row: tardiness only — shown when present */}
        {tardHrs > 0 && (
          <Box sx={{ px: 1.25, py: 0.5, display: "flex", alignItems: "center", gap: 0.75, borderTop: "1px solid rgba(198,40,40,0.1)", bgcolor: "rgba(198,40,40,0.02)" }}>
            <TardyIcon sx={{ fontSize: 12, color: "#c62828" }} />
            <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#c62828", fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Tardiness
            </Typography>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.3 }}>
              <Typography sx={{ fontSize: "0.86rem", fontWeight: 900, color: "#c62828", fontFamily: T.poppins, lineHeight: 1 }}>
                {(tardHrs / 8).toFixed(3)}
              </Typography>
              <Typography sx={{ fontSize: "0.6rem", color: "#ef9a9a", fontFamily: T.poppins }}>d</Typography>
              <Typography sx={{ fontSize: "0.58rem", color: "#ef9a9a", fontFamily: T.poppins, ml: 0.25 }}>/ {tardHrs.toFixed(3)}h</Typography>
            </Box>
            <Tooltip title="Tardiness/absences detected — reduce earned credits accordingly.">
              <WarnIcon sx={{ fontSize: 13, color: "#e65100", ml: 0.25 }} />
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const meta = EARN_STATUS[status] || EARN_STATUS.pending;
  const Icon = meta.icon;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.3, borderRadius: "20px", bgcolor: meta.bg, border: `1px solid ${meta.border}` }}>
      <Icon sx={{ fontSize: 11, color: meta.color }} />
      <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: meta.color, fontFamily: T.poppins }}>{meta.label}</Typography>
    </Box>
  );
};

const DeptBadge = ({ code }) => !code ? null : (
  <Chip size="small" icon={<DeptIcon style={{ fontSize: 10, color: T.accentMid }} />} label={code}
    sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: T.accentFaint, color: T.accent, border: `1px solid ${T.accentBorder}`, "& .MuiChip-label": { px: 0.75 } }} />
);

const EmpCatBadge = ({ label, colorHex }) => {
  if (!label) return null;
  const color = colorHex || "#757575";
  return (
    <Chip size="small" icon={<WorkIcon style={{ fontSize: 10, color }} />} label={label}
      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: alpha(color, 0.1), color, border: `1px solid ${alpha(color, 0.3)}`, maxWidth: 180, "& .MuiChip-label": { px: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }} />
  );
};

// ─── Reject Dialog ─────────────────────────────────────────────────────────────
const RejectDialog = ({ open, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontFamily: T.poppins, fontWeight: 700, fontSize: "0.95rem", color: T.accent }}>Reject Earning Entry</DialogTitle>
      <DialogContent>
        <FieldInput fullWidth multiline rows={3} size="small" label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Insufficient OT documentation…" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", color: T.muted, fontFamily: T.poppins }}>Cancel</Button>
        <AccentButton variant="contained" onClick={() => onConfirm(reason)} disabled={loading}
          sx={{ bgcolor: "#d32f2f", "&:hover": { bgcolor: "#b71c1c" } }}>
          {loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : "Reject"}
        </AccentButton>
      </DialogActions>
    </Dialog>
  );
};

// ─── Earning Record Row ────────────────────────────────────────────────────────
const EarningRow = ({ record, unit, type, onApprove, onReject, onDelete }) => {
  const earnH  = toNum(record.earned_hours ?? record.total_hours);
  const status = record.earn_status || "pending";
  const typeColor = type === "leave" ? "#1976d2" : type === "sc" ? "#2e7d32" : T.accent;
  return (
    <Box sx={{ px: 2, py: 1.5, border: `1px solid ${T.accentBorder}`, borderRadius: 2, bgcolor: "#fff", mb: 0.75, animation: "emFadeUp 0.25s ease" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: typeColor, fontFamily: T.poppins }}>
              {record.period_year}{record.period_month ? ` · ${monthShort(record.period_month)}` : ""}
              {record.leave_code && ` · ${record.leave_code}`}
              {record.sc_type   && ` · SC (${record.sc_type.replace("_", "-")})`}
              {type === "cto"   && ` · CTO`}
            </Typography>
            <StatusBadge status={status} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.58rem", color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.poppins }}>Earned</Typography>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: typeColor, fontFamily: T.poppins }}>{fmtHrs(earnH, unit)}</Typography>
          </Box>
          {record.remarks && <Typography sx={{ fontSize: "0.68rem", color: T.muted, fontFamily: T.poppins, mt: 0.5 }}>{record.remarks}</Typography>}
          {record.approved_by && (
            <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, mt: 0.25 }}>
              {status === "approved" ? "✓ Approved" : "✗ Rejected"} by {record.approved_by}
              {record.rejected_reason ? ` — "${record.rejected_reason}"` : ""}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
          {status === "pending" && (
            <>
              <Tooltip title="Approve">
                <IconButton size="small" onClick={() => onApprove(record)} sx={{ width: 26, height: 26, bgcolor: "rgba(46,125,50,0.08)", color: "#2e7d32", border: "1px solid rgba(46,125,50,0.25)" }}>
                  <ApproveIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton size="small" onClick={() => onReject(record)} sx={{ width: 26, height: 26, bgcolor: "rgba(211,47,47,0.06)", color: "#d32f2f", border: "1px solid rgba(211,47,47,0.2)" }}>
                  <RejectIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(record)} sx={{ width: 26, height: 26, color: T.faint, border: `1px solid ${T.accentBorder}`, "&:hover": { color: "#d32f2f" } }}>
              <DeleteIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

// ─── Records List ──────────────────────────────────────────────────────────────
const RecordsList = ({ employeeNumber, type, unit, refreshKey, year, month, onApproved }) => {
  const [data,          setData]          = useState({ earnings: [], balances: [] });
  const [loading,       setLoading]       = useState(false);
  const [showAll,       setShowAll]       = useState(false);
  const [rejectDialog,  setRejectDialog]  = useState({ open: false, record: null });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEarnings = useCallback(async () => {
    if (!employeeNumber) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/earnings/${type}/${employeeNumber}?year=${year}&month=${month}`, { headers: { Authorization: `Bearer ${token}` } });
      setData({ earnings: res.data.earnings || [], balances: res.data.balances || [] });
    } catch { setData({ earnings: [], balances: [] }); }
    setLoading(false);
  }, [employeeNumber, type, year, month]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings, refreshKey]);

  const handleApprove = async (record) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_BASE_URL}/api/earnings/${type}/${record.id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchEarnings(); if (onApproved) onApproved();
    } catch {}
    setActionLoading(false);
  };

  const handleReject = async (reason) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_BASE_URL}/api/earnings/${type}/${rejectDialog.record.id}/reject`, { reason }, { headers: { Authorization: `Bearer ${token}` } });
      setRejectDialog({ open: false, record: null }); fetchEarnings();
    } catch {}
    setActionLoading(false);
  };

  const handleDelete = async (record) => {
    if (!window.confirm("Delete this earning record? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/earnings/${type}/${record.id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchEarnings(); if (onApproved) onApproved();
    } catch {}
  };

  if (!employeeNumber) return null;
  const displayed    = showAll ? data.earnings : data.earnings.slice(0, 5);
  const pendingCount = data.earnings.filter((e) => e.earn_status === "pending").length;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box sx={{ flex: 1, height: 1, bgcolor: T.divider }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <HistoryIcon sx={{ fontSize: 13, color: T.accent }} />
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>{monthName(month)} {year} — Records</Typography>
          {pendingCount > 0 && (
            <Chip size="small" label={`${pendingCount} pending`} sx={{ height: 16, fontSize: "0.58rem", fontWeight: 700, bgcolor: T.statusPending.bg, color: T.statusPending.color, border: `1px solid ${T.statusPending.border}` }} />
          )}
        </Box>
        <IconButton size="small" onClick={fetchEarnings} disabled={loading} sx={{ p: 0.25 }}>
          <RefreshIcon sx={{ fontSize: 14, color: loading ? T.faint : T.accent }} />
        </IconButton>
        <Box sx={{ flex: 1, height: 1, bgcolor: T.divider }} />
      </Box>
      {loading ? (
        <Box sx={{ py: 2, textAlign: "center" }}><CircularProgress size={18} sx={{ color: T.accent }} /></Box>
      ) : data.earnings.length === 0 ? (
        <Box sx={{ py: 1.5, textAlign: "center", bgcolor: T.accentFaint, borderRadius: 2, border: `1px dashed ${T.accentBorder}` }}>
          <Typography sx={{ fontSize: "0.75rem", color: T.faint, fontFamily: T.poppins }}>No earnings recorded for {monthName(month)} {year}</Typography>
        </Box>
      ) : (
        <>
          {displayed.map((record) => (
            <EarningRow key={record.id} record={record} unit={unit} type={type}
              onApprove={handleApprove}
              onReject={(r) => setRejectDialog({ open: true, record: r })}
              onDelete={handleDelete}
            />
          ))}
          {data.earnings.length > 5 && (
            <Box sx={{ textAlign: "center", mt: 0.5 }}>
              <Button size="small" onClick={() => setShowAll((v) => !v)} endIcon={showAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ fontSize: "0.72rem", color: T.accent, textTransform: "none", fontFamily: T.poppins }}>
                {showAll ? "Show less" : `Show all ${data.earnings.length} records`}
              </Button>
            </Box>
          )}
        </>
      )}
      <RejectDialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, record: null })} onConfirm={handleReject} loading={actionLoading} />
    </Box>
  );
};

// ─── Compact Input Grid ────────────────────────────────────────────────────────
// AUTO_DEFAULTS: leave codes that get a default of 1.25 days (= 10 hours) on employee load
const SL_VL_AUTO_CODES = ["SL", "VL"];
const SL_VL_DEFAULT_HOURS = 1.25 * 8; // 10 hours

const CompactInputGrid = ({ fields, unit, values, drafts, onDraftChange, onCommit, autoDefaultCodes = [] }) => {
  const rows = [];
  for (let i = 0; i < fields.length; i += 4) { rows.push(fields.slice(i, i + 4)); }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {rows.map((row, ri) => (
        <Box key={ri} sx={{ display: "grid", gridTemplateColumns: `repeat(${row.length}, 1fr)`, gap: 1 }}>
          {row.map((field) => {
            const val = toNum(values[field.key]);
            const draft = drafts[field.key];
            const isActive = val > 0;
            const isAutoDefault = autoDefaultCodes.includes(field.key);
            const displayVal = draft !== undefined
              ? draft
              : (val === 0 ? "" : (unit === "days" ? String(parseFloat((val / 8).toFixed(3))) : String(val)));
            return (
              <Box key={field.key} sx={{
                borderRadius: 2,
                border: `1.5px solid ${isActive ? "rgba(46,125,50,0.35)" : isAutoDefault ? "rgba(25,118,210,0.3)" : T.accentBorder}`,
                bgcolor: isActive ? "rgba(46,125,50,0.03)" : isAutoDefault ? "rgba(25,118,210,0.02)" : "#fafafa",
                overflow: "hidden",
                transition: "border-color 0.15s, background 0.15s",
                position: "relative",
              }}>
                {/* Auto-default indicator badge */}
                {isAutoDefault && !isActive && (
                  <Tooltip title="Auto-filled with 1.25 days default. You can change this value.">
                    <Box sx={{
                      position: "absolute", top: 3, right: 3, zIndex: 1,
                      width: 6, height: 6, borderRadius: "50%",
                      bgcolor: "#1565c0", opacity: 0.6,
                    }} />
                  </Tooltip>
                )}
                <Box sx={{ px: 1, py: 0.4, bgcolor: isActive ? "rgba(46,125,50,0.07)" : isAutoDefault ? "rgba(25,118,210,0.07)" : T.accentFaint, borderBottom: `1px solid ${isActive ? "rgba(46,125,50,0.15)" : isAutoDefault ? "rgba(25,118,210,0.15)" : T.accentBorder}` }}>
                  <Typography sx={{ fontSize: "0.64rem", fontWeight: 700, color: isActive ? "#2e7d32" : isAutoDefault ? "#1565c0" : T.accent, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.04em" }} noWrap>
                    {field.label}
                    {isAutoDefault && <span style={{ fontSize: "0.52rem", opacity: 0.65, marginLeft: 3 }}>★</span>}
                  </Typography>
                  {field.subtitle && <Typography sx={{ fontSize: "0.56rem", color: T.faint, fontFamily: T.poppins }} noWrap>{field.subtitle}</Typography>}
                </Box>
                <Box sx={{ px: 0.75, py: 0.5 }}>
                  <input type="text" inputMode="decimal"
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
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: `1px solid ${isActive ? "rgba(46,125,50,0.3)" : isAutoDefault ? "rgba(25,118,210,0.25)" : T.accentBorder}`, fontSize: "0.82rem", fontWeight: 700, outline: "none", fontFamily: T.poppins, boxSizing: "border-box", background: "#fff", color: isActive ? "#2e7d32" : "#1976d2", transition: "border-color 0.15s" }}
                  />
                  {isActive && (
                    <Typography sx={{ fontSize: "0.6rem", color: "#2e7d32", fontWeight: 700, fontFamily: T.poppins, textAlign: "right", mt: 0.25 }}>
                      {unit === "days" ? `${(val / 8).toFixed(3)}d` : `${val.toFixed(3)}h`}
                    </Typography>
                  )}
                  {isAutoDefault && !isActive && (
                    <Typography sx={{ fontSize: "0.56rem", color: "#90a4ae", fontFamily: T.poppins, textAlign: "right", mt: 0.15, fontStyle: "italic" }}>
                      default: 1.25d
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
const fetchAttendanceForEmployee = async (employeeNumber, year, month, token) => {
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const headers = { Authorization: `Bearer ${token}` };
  let earningsData = null;
  try {
    const r = await axios.get(`${API_BASE_URL}/api/earnings/attendance/${employeeNumber}?year=${year}&month=${month}`, { headers });
    earningsData = r.data;
  } catch {}
  if (earningsData?.summary) return earningsData;
  const attempts = [
    { s: startOfMonth, e: endOfMonth },
    { s: `${year}-${String(month).padStart(2, "0")}-01`, e: (() => { const d = new Date(year, month, 5); return d.toISOString().split("T")[0]; })() },
  ];
  for (const { s, e } of attempts) {
    try {
      const r2 = await axios.get(`${API_BASE_URL}/attendance/api/overall_attendance_record`, { params: { personID: employeeNumber, startDate: s, endDate: e }, headers });
      const rows = r2.data?.data || (Array.isArray(r2.data) ? r2.data : []);
      if (rows.length > 0) return { ...(earningsData || {}), summary: rows[0], stats: earningsData?.stats || {}, dailyRecords: earningsData?.dailyRecords || [] };
    } catch {}
  }
  return earningsData;
};

// ─── Leave Earnings Panel ──────────────────────────────────────────────────────
const LeaveEarningsPanel = ({ employee, deptMap, empCatMap, unit, year, month, onMonthChange, onBalanceChanged }) => {
  const [leaveTypes,        setLeaveTypes]       = useState([]);
  const [assignmentMap,     setAssignmentMap]    = useState({});
  const [earnedHours,       setEarnedHours]      = useState({});
  const [earnedDraft,       setEarnedDraft]      = useState({});
  const [remarks,           setRemarks]          = useState("");
  const [loading,           setLoading]          = useState(false);
  const [error,             setError]            = useState("");
  const [success,           setSuccess]          = useState("");
  const [refreshKey,        setRefreshKey]       = useState(0);
  const [attendanceData,    setAttendanceData]   = useState(null);
  const [attendanceLoading, setAttLoading]       = useState(false);

  const calDays = getCalendarDays(year, month);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/leaveRoute/leave_table`).then((r) => setLeaveTypes(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const fetchAttendance = useCallback(async () => {
    if (!employee) { setAttendanceData(null); return; }
    setAttLoading(true);
    const token = localStorage.getItem("token");
    setAttendanceData(await fetchAttendanceForEmployee(employee.employeeNumber, year, month, token));
    setAttLoading(false);
  }, [employee, year, month]);

  const fetchBalances = useCallback(async () => {
    if (!employee) { setAssignmentMap({}); return; }
    const token = localStorage.getItem("token");
    try {
      const r = await axios.get(`${API_BASE_URL}/api/earnings/assignment-balances/${employee.employeeNumber}`, { headers: { Authorization: `Bearer ${token}` } });
      setAssignmentMap(r.data || {});
    } catch { setAssignmentMap({}); }
  }, [employee]);

  // Auto-populate SL and VL with 1.25 days default when employee or period changes
  useEffect(() => {
    if (!employee) { setAttendanceData(null); setAssignmentMap({}); setEarnedHours({}); return; }
    fetchAttendance(); fetchBalances();
  }, [employee, year, month, fetchAttendance, fetchBalances]);

  // Set SL/VL defaults when leaveTypes load or employee/period changes
  useEffect(() => {
    if (!employee || leaveTypes.length === 0) { setEarnedHours({}); setEarnedDraft({}); setRemarks(""); setError(""); return; }
    const defaults = {};
    leaveTypes.forEach((lt) => {
      if (SL_VL_AUTO_CODES.includes(lt.leave_code)) {
        defaults[lt.leave_code] = SL_VL_DEFAULT_HOURS;
      }
    });
    setEarnedHours(defaults);
    setEarnedDraft({});
    setRemarks("");
    setError("");
  }, [employee, year, month, leaveTypes]);

  // Determine which leave codes are active (SL/VL only count if > 0 but we already prefilled them)
  const activeLeaves = useMemo(() => leaveTypes.filter((lt) => toNum(earnedHours[lt.leave_code]) > 0), [leaveTypes, earnedHours]);

  // Leave codes that get auto-defaults (only ones that actually exist in the leave types list)
  const autoDefaultCodes = useMemo(() => leaveTypes.filter(lt => SL_VL_AUTO_CODES.includes(lt.leave_code)).map(lt => lt.leave_code), [leaveTypes]);

  const handleSave = async () => {
    if (!employee) { setError("Select an employee first"); return; }
    if (!activeLeaves.length) { setError("Enter earned hours for at least one leave type"); return; }
    setLoading(true); setError("");
    const token = localStorage.getItem("token");
    let created = 0;
    for (const lt of activeLeaves) {
      try {
        await axios.post(`${API_BASE_URL}/api/earnings/leave`, {
          employeeNumber: employee.employeeNumber, leave_code: lt.leave_code,
          earned_hours: toNum(earnedHours[lt.leave_code]),
          period_year: parseInt(year, 10) || new Date().getFullYear(),
          period_month: parseInt(month, 10), entry_type: "EARNED", remarks: remarks || null,
        }, { headers: { Authorization: `Bearer ${token}` } });
        created++;
      } catch {}
    }
    setLoading(false);
    if (created > 0) {
      setSuccess(`${created} leave earning(s) submitted (${monthName(month)} ${year}).`);
      // Reset to defaults after save
      const defaults = {};
      leaveTypes.forEach((lt) => { if (SL_VL_AUTO_CODES.includes(lt.leave_code)) defaults[lt.leave_code] = SL_VL_DEFAULT_HOURS; });
      setEarnedHours(defaults);
      setEarnedDraft({}); setRemarks("");
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccess(""), 3500);
    }
  };

  const handleApproved = useCallback(() => { fetchBalances(); if (onBalanceChanged) onBalanceChanged(); }, [fetchBalances, onBalanceChanged]);

  if (!employee) return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <LeaveIcon sx={{ fontSize: 40, color: alpha(T.accent, 0.18), mb: 1 }} />
      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>Select an employee to begin</Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", gap: 2, height: "100%", overflow: "hidden" }}>
        {/* LEFT */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {error   && <Alert severity="error"   sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.78rem" }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.78rem" }}>{success}</Alert>}
          <AttendanceContextBanner attendanceData={attendanceData} loading={attendanceLoading} year={year} month={month} employee={employee} onRefresh={fetchAttendance} />
          <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5, mb: 1.5, "&::-webkit-scrollbar": { width: 3 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
            {leaveTypes.length === 0 ? (
              <Box sx={{ py: 2, textAlign: "center" }}>
                <Typography sx={{ fontSize: "0.75rem", color: T.faint, fontFamily: T.poppins }}>No leave types configured</Typography>
              </Box>
            ) : (
              <Box>
                <Box sx={{ mb: 0.75, px: 0.75, py: 0.4, borderRadius: 1.5, bgcolor: "rgba(25,118,210,0.05)", border: "1px solid rgba(25,118,210,0.15)", display: "flex", alignItems: "center", gap: 0.75 }}>
                  <DateRangeIcon sx={{ fontSize: 11, color: "#1565c0" }} />
                  <Typography sx={{ fontSize: "0.63rem", color: "#1565c0", fontFamily: T.poppins, fontWeight: 600 }}>
                    {monthName(month)} {year} · {calDays} calendar days = {calDays * 8} working hours
                  </Typography>
                  {autoDefaultCodes.length > 0 && (
                    <Tooltip title={`${autoDefaultCodes.join(" & ")} are pre-filled with 1.25 days default. You can modify these before submitting.`}>
                      <Chip
                        size="small"
                        label={`${autoDefaultCodes.join("+")} auto 1.25d`}
                        sx={{ height: 16, fontSize: "0.56rem", fontWeight: 700, bgcolor: "rgba(25,118,210,0.12)", color: "#1565c0", border: "1px solid rgba(25,118,210,0.25)", cursor: "help", ml: "auto" }}
                      />
                    </Tooltip>
                  )}
                </Box>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.75 }}>
                  Earned This Month
                </Typography>
                <CompactInputGrid
                  fields={leaveTypes.map(lt => ({ key: lt.leave_code, label: lt.leave_code, subtitle: lt.leave_description?.substring(0, 20) }))}
                  unit={unit} values={earnedHours} drafts={earnedDraft}
                  autoDefaultCodes={autoDefaultCodes}
                  onDraftChange={(key, val) => setEarnedDraft(p => val === undefined ? (({ [key]: _, ...rest }) => rest)(p) : { ...p, [key]: val })}
                  onCommit={(key, val) => setEarnedHours(p => ({ ...p, [key]: val }))}
                />
                <RecordsList employeeNumber={employee?.employeeNumber} type="leave" unit={unit} refreshKey={refreshKey} year={year} month={month} onApproved={handleApproved} />
              </Box>
            )}
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <FieldInput size="small" fullWidth multiline rows={1} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks for all entries (optional)" sx={{ mb: 0.75 }} />
            <AccentButton variant="contained" fullWidth onClick={handleSave} disabled={loading || activeLeaves.length === 0}
              startIcon={loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
              sx={{ height: 40, bgcolor: activeLeaves.length > 0 ? T.accent : "#d0d0d0", color: "#fff", fontFamily: T.poppins, "&:hover": { bgcolor: activeLeaves.length > 0 ? T.accentDark : "#d0d0d0" }, "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important" } }}>
              {loading ? "Saving…" : activeLeaves.length > 0 ? `Submit ${activeLeaves.length} Earning(s) for ${monthName(month)} ${year}` : "Enter hours above to submit"}
            </AccentButton>
          </Box>
        </Box>
        {/* RIGHT: balances */}
        <Box sx={{ width: 200, flexShrink: 0, overflowY: "auto", borderLeft: `1px solid ${T.divider}`, pl: 1.5, "&::-webkit-scrollbar": { width: 3 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em", mb: 1, position: "sticky", top: 0, bgcolor: "#fff", py: 0.5 }}>
            Leave Balances
          </Typography>
          {leaveTypes.map((lt) => {
            const balance   = assignmentMap[lt.leave_code];
            const remaining = toNum(balance?.remaining_hours);
            const used      = toNum(balance?.used_hours);
            const total     = toNum(balance?.total_hours);
            const hasBalance = remaining > 0 || total > 0;
            const isActive  = toNum(earnedHours[lt.leave_code]) > 0;
            return (
              <Box key={lt.leave_code} sx={{ mb: 0.75, p: 1, borderRadius: 1.5, border: `1px solid ${isActive ? "rgba(46,125,50,0.3)" : T.accentBorder}`, bgcolor: isActive ? "rgba(46,125,50,0.04)" : T.accentFaint }}>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: isActive ? "#2e7d32" : T.accent, fontFamily: T.poppins, lineHeight: 1 }}>{lt.leave_code}</Typography>
                {lt.leave_description && <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins, mb: 0.5 }} noWrap>{lt.leave_description}</Typography>}
                {hasBalance ? (
                  <>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: remaining > 0 ? "#2e7d32" : "#d32f2f", fontFamily: T.poppins }}>
                      {unit === "days" ? `${(remaining / 8).toFixed(2)}d` : `${remaining.toFixed(2)}h`}
                      <Typography component="span" sx={{ fontSize: "0.58rem", color: T.faint, fontWeight: 400, ml: 0.4 }}>left</Typography>
                    </Typography>
                    {total > 0 && (
                      <Typography sx={{ fontSize: "0.58rem", color: T.faint, fontFamily: T.poppins }}>
                        {unit === "days" ? `${(used / 8).toFixed(2)}d / ${(total / 8).toFixed(2)}d` : `${used.toFixed(2)}h / ${total.toFixed(2)}h`}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, fontStyle: "italic" }}>No balance</Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

// ─── SC Earnings Panel ─────────────────────────────────────────────────────────
const SCEarningsPanel = ({ employee, deptMap, empCatMap, unit, year, month }) => {
  const [otTypes,    setOtTypes]    = useState([]);
  const [otValues,   setOtValues]   = useState({});
  const [otDrafts,   setOtDrafts]   = useState({});
  const [scType,     setSCType]     = useState("auto");
  const [remarks,    setRemarks]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [attendanceData,    setAttendanceData]   = useState(null);
  const [attendanceLoading, setAttLoading]       = useState(false);

  const calDays = getCalendarDays(year, month);
  const empCat = employee ? empCatMap[String(employee.employeeNumber)] : null;

  const SC_TYPES = {
    commutative:     { label: "Commutative",        color: "#2E7D32" },
    non_commutative: { label: "Non-Commutative",    color: "#5D4037" },
    tempo:           { label: "Leave-Only (Tempo)", color: "#1565C0" },
  };

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/ot-types`).then((r) => setOtTypes(Array.isArray(r.data) && r.data.length > 0 ? r.data : [
      { id: "regular",    name: "Regular OT",           multiplier: 1 },
      { id: "holiday",    name: "Holiday OT",           multiplier: 1 },
      { id: "night_diff", name: "Night Differential OT", multiplier: 1 },
    ])).catch(() => setOtTypes([
      { id: "regular",    name: "Regular OT",           multiplier: 1 },
      { id: "holiday",    name: "Holiday OT",           multiplier: 1 },
      { id: "night_diff", name: "Night Differential OT", multiplier: 1 },
    ]));
  }, []);

  const fetchAttendance = useCallback(async () => {
    if (!employee) { setAttendanceData(null); return; }
    setAttLoading(true);
    const token = localStorage.getItem("token");
    setAttendanceData(await fetchAttendanceForEmployee(employee.employeeNumber, year, month, token));
    setAttLoading(false);
  }, [employee, year, month]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  useEffect(() => { setOtValues({}); setOtDrafts({}); setRemarks(""); setSCType("auto"); setError(""); }, [employee, year, month]);

  const computedSC = useMemo(() => {
    let totalOT = 0, totalSC = 0;
    otTypes.forEach(t => { const ot = toNum(otValues[t.id]); totalOT += ot; totalSC += ot * (t.multiplier || 1); });
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
    if (!employee) { setError("Select an employee first"); return; }
    if (computedSC.total <= 0) { setError("OT hours must be > 0"); return; }
    setLoading(true); setError("");
    const token = localStorage.getItem("token");
    try {
      await axios.post(`${API_BASE_URL}/api/earnings/sc`, {
        employeeNumber: employee.employeeNumber, sc_type: effectiveSCType,
        ot_hours_regular: toNum(otValues["regular"] || otValues[otTypes[0]?.id]),
        ot_hours_holiday: toNum(otValues["holiday"] || otValues[otTypes[1]?.id]),
        ot_hours_night_diff: toNum(otValues["night_diff"] || otValues[otTypes[2]?.id]),
        total_ot_hours: computedSC.totalOT, earned_hours: computedSC.total,
        period_year: parseInt(year, 10) || new Date().getFullYear(), period_month: parseInt(month, 10),
        remarks: remarks || null, emp_category_snapshot: { label: empCat?.label || "", colorHex: empCat?.colorHex },
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`${fmtHrs(computedSC.total, unit)} SC submitted for ${monthName(month)} ${year}.`);
      setOtValues({}); setOtDrafts({}); setRemarks("");
      setRefreshKey(k => k + 1);
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) { setError("Failed to save SC: " + (err.response?.data?.error || err.message)); }
    finally { setLoading(false); }
  };

  if (!employee) return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <SCIcon sx={{ fontSize: 40, color: alpha(T.accent, 0.18), mb: 1 }} />
      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>Select an employee to begin</Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5, "&::-webkit-scrollbar": { width: 3 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
        {error   && <Alert severity="error"   sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.78rem" }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.78rem" }}>{success}</Alert>}
        <AttendanceContextBanner attendanceData={attendanceData} loading={attendanceLoading} year={year} month={month} employee={employee} onRefresh={fetchAttendance} />
        <Box sx={{ mb: 0.75, px: 0.75, py: 0.4, borderRadius: 1.5, bgcolor: "rgba(25,118,210,0.05)", border: "1px solid rgba(25,118,210,0.15)", display: "flex", alignItems: "center", gap: 0.75 }}>
          <DateRangeIcon sx={{ fontSize: 11, color: "#1565c0" }} />
          <Typography sx={{ fontSize: "0.63rem", color: "#1565c0", fontFamily: T.poppins, fontWeight: 600 }}>
            {monthName(month)} {year} — {calDays} days ({calDays * 8}h max)
          </Typography>
        </Box>
        <Box sx={{ mb: 1, p: 1, borderRadius: 1.5, border: `1px solid ${alpha(SC_TYPES[effectiveSCType]?.color || T.accent, 0.3)}`, bgcolor: alpha(SC_TYPES[effectiveSCType]?.color || T.accent, 0.05) }}>
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: SC_TYPES[effectiveSCType]?.color || T.accent, fontFamily: T.poppins }}>
            SC Rule: {SC_TYPES[effectiveSCType]?.label || "Non-Commutative"}
            {scType !== "auto" && <span style={{ color: "#bf360c", marginLeft: 6, fontSize: "0.62rem" }}>(manual override)</span>}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.75 }}>OT Hours Input</Typography>
        <CompactInputGrid
          fields={otTypes.map(t => ({ key: t.id, label: t.name, subtitle: `×${t.multiplier || 1} → SC` }))}
          unit={unit} values={otValues} drafts={otDrafts}
          onDraftChange={(key, val) => setOtDrafts(p => val === undefined ? (({ [key]: _, ...rest }) => rest)(p) : { ...p, [key]: val })}
          onCommit={(key, val) => setOtValues(p => ({ ...p, [key]: val }))}
        />
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, mt: 0.75, px: 1, py: 0.75, borderRadius: 1.5, bgcolor: T.accentFaint, border: `1.5px solid ${T.accentBorder}` }}>
          <Box>
            <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, textTransform: "uppercase" }}>Total OT</Typography>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: T.accent, fontFamily: T.poppins }}>{computedSC.totalOT.toFixed(3)}h</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, textTransform: "uppercase" }}>SC Earned</Typography>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 900, color: computedSC.total > 0 ? "#2e7d32" : T.faint, fontFamily: T.poppins }}>
              {computedSC.total > 0 ? fmtHrs(computedSC.total, unit) : "—"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "flex-end" }}>
            <Typography sx={{ fontSize: "0.62rem", color: T.muted, fontFamily: T.poppins, fontStyle: "italic" }}>Auto-computed</Typography>
          </Box>
        </Box>
        <RecordsList employeeNumber={employee?.employeeNumber} type="sc" unit={unit} refreshKey={refreshKey} year={year} month={month} />
      </Box>
      <Box sx={{ flexShrink: 0, pt: 1, borderTop: `1px solid ${T.divider}`, mt: 1 }}>
        <FieldInput size="small" fullWidth multiline rows={1} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)" sx={{ mb: 0.75 }} />
        <AccentButton variant="contained" fullWidth onClick={handleSave} disabled={loading || computedSC.total <= 0}
          startIcon={loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
          sx={{ height: 40, bgcolor: computedSC.total > 0 ? T.accent : "#d0d0d0", color: "#fff", fontFamily: T.poppins, "&:hover": { bgcolor: computedSC.total > 0 ? T.accentDark : "#d0d0d0" }, "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important" } }}>
          {loading ? "Saving…" : computedSC.total > 0 ? `Submit ${fmtHrs(computedSC.total, unit)} SC for ${monthName(month)} ${year}` : "Enter OT hours above to submit"}
        </AccentButton>
      </Box>
    </Box>
  );
};

// ─── CTO Earnings Panel ────────────────────────────────────────────────────────
const CTOEarningsPanel = ({ employee, deptMap, empCatMap, unit, year, month }) => {
  const [otHours,    setOtHours]    = useState(0);
  const [otDraft,    setOtDraft]    = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [remarks,    setRemarks]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [attendanceData,    setAttendanceData]   = useState(null);
  const [attendanceLoading, setAttLoading]       = useState(false);

  const calDays = getCalendarDays(year, month);
  const empCat = employee ? empCatMap[String(employee.employeeNumber)] : null;

  const isEligible = useMemo(() => {
    if (!empCat) return true;
    const l = (empCat.label || "").toLowerCase();
    return l.includes("40") || l.includes("designated");
  }, [empCat]);

  const fetchAttendance = useCallback(async () => {
    if (!employee) { setAttendanceData(null); return; }
    setAttLoading(true);
    const token = localStorage.getItem("token");
    setAttendanceData(await fetchAttendanceForEmployee(employee.employeeNumber, year, month, token));
    setAttLoading(false);
  }, [employee, year, month]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  useEffect(() => { setOtHours(0); setOtDraft(null); setRemarks(""); setExpiryDate(""); setError(""); }, [employee, year, month]);

  const earned = toNum(otHours);
  const otDisplay = otDraft !== null ? otDraft : (earned === 0 ? "" : (unit === "days" ? String(parseFloat((earned / 8).toFixed(3))) : String(earned)));

  const handleSave = async () => {
    if (!employee) { setError("Select an employee first"); return; }
    if (earned <= 0) { setError("OT hours must be > 0"); return; }
    setLoading(true); setError("");
    const token = localStorage.getItem("token");
    try {
      await axios.post(`${API_BASE_URL}/api/earnings/cto`, {
        employeeNumber: employee.employeeNumber, ot_hours: earned, earned_hours: earned,
        period_year: parseInt(year, 10) || new Date().getFullYear(), period_month: parseInt(month, 10),
        expiry_date: expiryDate || null, remarks: remarks || null,
        emp_category_snapshot: { label: empCat?.label || "", colorHex: empCat?.colorHex },
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`${fmtHrs(earned, unit)} CTO submitted for ${monthName(month)} ${year}.`);
      setOtHours(0); setOtDraft(null); setRemarks(""); setExpiryDate("");
      setRefreshKey(k => k + 1);
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) { setError("Failed to save CTO: " + (err.response?.data?.error || err.message)); }
    finally { setLoading(false); }
  };

  if (!employee) return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <CTOIcon sx={{ fontSize: 40, color: alpha(T.accent, 0.18), mb: 1 }} />
      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins }}>Select an employee to begin</Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5, "&::-webkit-scrollbar": { width: 3 }, "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 } }}>
        {error   && <Alert severity="error"   sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.78rem" }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ borderRadius: 2, mb: 0.75, fontSize: "0.78rem" }}>{success}</Alert>}
        <AttendanceContextBanner attendanceData={attendanceData} loading={attendanceLoading} year={year} month={month} employee={employee} onRefresh={fetchAttendance} />
        <Box sx={{ mb: 0.75, px: 0.75, py: 0.4, borderRadius: 1.5, bgcolor: "rgba(25,118,210,0.05)", border: "1px solid rgba(25,118,210,0.15)", display: "flex", alignItems: "center", gap: 0.75 }}>
          <DateRangeIcon sx={{ fontSize: 11, color: "#1565c0" }} />
          <Typography sx={{ fontSize: "0.63rem", color: "#1565c0", fontFamily: T.poppins, fontWeight: 600 }}>
            {monthName(month)} {year} — {calDays} days ({calDays * 8}h max)
          </Typography>
        </Box>
        <Box sx={{ mb: 1, p: 1, borderRadius: 1.5, bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}` }}>
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins }}>
            CTO Rule — 40-hr / Designated only · 1:1 OT accrual
          </Typography>
          {!isEligible && (
            <Typography sx={{ fontSize: "0.63rem", color: "#e65100", fontWeight: 700, fontFamily: T.poppins, mt: 0.25 }}>
              ⚠ Not a 40-hr / Designated employee — CTO may not apply
            </Typography>
          )}
        </Box>
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.75 }}>OT Hours Input</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1 }}>
          <Box sx={{ borderRadius: 2, border: `1.5px solid ${earned > 0 ? "rgba(46,125,50,0.35)" : T.accentBorder}`, bgcolor: earned > 0 ? "rgba(46,125,50,0.03)" : "#fafafa", overflow: "hidden" }}>
            <Box sx={{ px: 1, py: 0.4, bgcolor: earned > 0 ? "rgba(46,125,50,0.07)" : T.accentFaint, borderBottom: `1px solid ${earned > 0 ? "rgba(46,125,50,0.15)" : T.accentBorder}` }}>
              <Typography sx={{ fontSize: "0.64rem", fontWeight: 700, color: earned > 0 ? "#2e7d32" : T.accent, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.04em" }}>OT Hours</Typography>
              <Typography sx={{ fontSize: "0.56rem", color: T.faint, fontFamily: T.poppins }}>1:1 ratio → CTO</Typography>
            </Box>
            <Box sx={{ px: 0.75, py: 0.5 }}>
              <input type="text" inputMode="decimal" placeholder={unit === "days" ? "0.000 days" : "0.000 hrs"} value={otDisplay}
                onChange={(e) => { setOtDraft(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n)) setOtHours(toHours(n, unit)); }}
                onFocus={() => setOtDraft(otDisplay)}
                onBlur={() => { const n = parseFloat(otDraft); setOtHours(isNaN(n) ? 0 : toHours(n, unit)); setOtDraft(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: `1px solid ${earned > 0 ? "rgba(46,125,50,0.3)" : T.accentBorder}`, fontSize: "0.82rem", fontWeight: 700, outline: "none", fontFamily: T.poppins, boxSizing: "border-box", background: "#fff", color: "#1976d2" }}
              />
              {earned > 0 && (
                <Typography sx={{ fontSize: "0.6rem", color: "#2e7d32", fontWeight: 700, fontFamily: T.poppins, textAlign: "right", mt: 0.25 }}>
                  {unit === "days" ? `${(earned / 8).toFixed(3)}d` : `${earned.toFixed(3)}h`}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ borderRadius: 2, border: `1.5px solid ${earned > 0 ? "rgba(46,125,50,0.35)" : T.accentBorder}`, bgcolor: earned > 0 ? "rgba(46,125,50,0.05)" : "#fafafa", px: 1.25, py: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.04em" }}>CTO Earned</Typography>
            <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: earned > 0 ? "#2e7d32" : T.faint, fontFamily: T.poppins }}>
              {earned > 0 ? fmtHrs(earned, unit) : "—"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: T.accent, mb: 0.4, fontFamily: T.poppins }}>
            Expiry Date <span style={{ color: T.faint, fontSize: "0.63rem", fontWeight: 400 }}>(optional)</span>
          </Typography>
          <FieldInput type="date" size="small" fullWidth value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: new Date().toISOString().split("T")[0] }} />
        </Box>
        <RecordsList employeeNumber={employee?.employeeNumber} type="cto" unit={unit} refreshKey={refreshKey} year={year} month={month} />
      </Box>
      <Box sx={{ flexShrink: 0, pt: 1, borderTop: `1px solid ${T.divider}`, mt: 1 }}>
        <FieldInput size="small" fullWidth multiline rows={1} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)" sx={{ mb: 0.75 }} />
        <AccentButton variant="contained" fullWidth onClick={handleSave} disabled={loading || earned <= 0}
          startIcon={loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
          sx={{ height: 40, bgcolor: earned > 0 ? T.accent : "#d0d0d0", color: "#fff", fontFamily: T.poppins, "&:hover": { bgcolor: earned > 0 ? T.accentDark : "#d0d0d0" }, "&:disabled": { bgcolor: "#d0d0d0 !important", color: "#888 !important" } }}>
          {loading ? "Saving…" : earned > 0 ? `Submit ${fmtHrs(earned, unit)} CTO for ${monthName(month)} ${year}` : "Enter OT hours above to submit"}
        </AccentButton>
      </Box>
    </Box>
  );
};

// ─── Tab defs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "leave", label: "Leave Earning",        shortLabel: "Leave", icon: LeaveIcon },
  { id: "sc",    label: "Service Credit",        shortLabel: "SC",    icon: SCIcon    },
  { id: "cto",   label: "Compensatory Time Off", shortLabel: "CTO",   icon: CTOIcon   },
];

// ─── Main Component ────────────────────────────────────────────────────────────
const EarningsManagement = () => {
  const now = new Date();
  const [activeTab,        setActiveTab]        = useState(0);
  const [employees,        setEmployees]        = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [deptMap,          setDeptMap]          = useState({});
  const [empCatMap,        setEmpCatMap]        = useState({});
  const [typeConfigs,      setTypeConfigs]      = useState([]);
  const [catFilter,        setCatFilter]        = useState("");
  const [unit,             setUnit]             = useState("days");
  const [pageLoading,      setPageLoading]      = useState(true);
  const [periodYear,       setPeriodYear]       = useState(now.getFullYear());
  const [periodMonth,      setPeriodMonth]      = useState(now.getMonth() + 1);
  const [balanceKey,       setBalanceKey]       = useState(0);

  const handleMonthChange   = useCallback((y, m) => { setPeriodYear(y); setPeriodMonth(m); }, []);
  const handleBalanceChanged = useCallback(() => setBalanceKey(k => k + 1), []);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const h = { Authorization: `Bearer ${token}` };
        const [usersRes, personsRes, deptRes, empCatRes, typeConfigRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/users`,                                            { headers: h }),
          axios.get(`${API_BASE_URL}/personalinfo/person_table`,                       { headers: h }),
          axios.get(`${API_BASE_URL}/api/department-assignment`,                       { headers: h }),
          axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-category`,    { headers: h }),
          axios.get(`${API_BASE_URL}/EmploymentCategoryRoutes/employment-type-config`, { headers: h }),
        ]);
        let usersData = [];
        if (usersRes.status === "fulfilled") { const d = usersRes.value.data; usersData = Array.isArray(d) ? d : d?.users || d?.data || []; }
        const sexMap = {};
        if (personsRes.status === "fulfilled") {
          const list = Array.isArray(personsRes.value.data) ? personsRes.value.data : personsRes.value.data?.data || [];
          list.forEach((p) => { const num = p.agencyEmployeeNum?.toString() || p.employeeNumber?.toString(); if (num) sexMap[num] = { firstName: p.firstName, middleName: p.middleName, lastName: p.lastName }; });
        }
        setEmployees(usersData.map((u) => { const num = u.employeeNumber?.toString(); return { ...u, ...(num ? sexMap[num] || {} : {}) }; }));
        if (deptRes.status === "fulfilled") {
          const map = {};
          (Array.isArray(deptRes.value.data) ? deptRes.value.data : []).forEach((item) => { if (item.employeeNumber && item.code) map[String(item.employeeNumber)] = item.code; });
          setDeptMap(map);
        }
        if (empCatRes.status === "fulfilled") {
          const map = {};
          (Array.isArray(empCatRes.value.data) ? empCatRes.value.data : []).forEach((item) => {
            if (!item.employeeNumber) return;
            const label = item.parentGroup && item.typeName ? `${item.parentGroup} | ${item.typeName}` : item.categoryLabel || "";
            if (label) map[String(item.employeeNumber)] = { label, colorHex: item.colorHex || "#757575", parentGroup: item.parentGroup, typeName: item.typeName };
          });
          setEmpCatMap(map);
        }
        if (typeConfigRes.status === "fulfilled") { setTypeConfigs(typeConfigRes.value.data?.flat || []); }
      } catch (e) { console.error(e); }
      setPageLoading(false);
    })();
  }, []);

  const buildDisplayName = (e) => {
    const last = (e?.lastName || "").trim(); const first = (e?.firstName || "").trim(); const mid = (e?.middleName || "").trim();
    if (!last && !first) return (e?.fullName || "").trim() || `#${e?.employeeNumber}`;
    return last ? `${last.toUpperCase()}, ${[first, mid].filter(Boolean).join(" ")}` : [first, mid].filter(Boolean).join(" ");
  };

  const groupedTypeConfigs = useMemo(() => {
    const g = {};
    typeConfigs.filter(t => t.isActive).forEach(t => { if (!g[t.parentGroup]) g[t.parentGroup] = []; g[t.parentGroup].push(t); });
    return g;
  }, [typeConfigs]);

  const employeeOptions = useMemo(() => {
    let list = employees.map((e) => ({
      ...e,
      _displayName: buildDisplayName(e),
      _searchKey: `${buildDisplayName(e)} ${e.employeeNumber || ""}`.toLowerCase(),
      _sortLast: (e.lastName || "").toLowerCase(),
    })).sort((a, b) => a._sortLast.localeCompare(b._sortLast));
    if (catFilter) {
      const [filterType, filterValue] = catFilter.split("||");
      list = list.filter(emp => {
        const cat = empCatMap[String(emp.employeeNumber)];
        if (!cat) return false;
        if (filterType === "group") return cat.parentGroup === filterValue;
        const [pg, tn] = filterValue.split("|");
        return cat.parentGroup === pg && cat.typeName === tn;
      });
    }
    return list;
  }, [employees, empCatMap, catFilter]);

  if (pageLoading) return <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress sx={{ color: T.accent }} /></Box>;

  const panelProps = { employee: selectedEmployee, deptMap, empCatMap, unit, year: periodYear, month: periodMonth, onMonthChange: handleMonthChange, onBalanceChanged: handleBalanceChanged };
  const deptCode = selectedEmployee ? deptMap[String(selectedEmployee.employeeNumber)] : null;
  const empCat   = selectedEmployee ? empCatMap[String(selectedEmployee.employeeNumber)] : null;

  return (
    <Box sx={{ fontFamily: T.poppins }}>
      <style>{globalCss}</style>
      <Box sx={{ width: "100vw", maxWidth: "100%", position: "relative", left: "63%", transform: "translateX(-61%)", px: { xs: 2, sm: 3, md: 6 }, pt: { xs: 2, md: 4 }, pb: 0, mt: { xs: 0, md: -5 } }}>
        <SectionCard sx={{ borderRadius: "12px 12px 0 0" }}>
          {/* Header */}
          <Box sx={{ px: 4, py: 2.5, background: "linear-gradient(135deg, #fdf5f5 0%, #f0dede 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,35,35,0.1) 0%,transparent 70%)" }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
              <Box sx={{ width: 42, height: 42, borderRadius: "50%", bgcolor: alpha(T.accent, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <EarnIcon sx={{ fontSize: 20, color: T.accent }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, color: T.accent, lineHeight: 1.2, mb: 0.25, fontFamily: T.poppins }}>Earnings Management</Typography>
                <Typography sx={{ fontSize: "0.75rem", color: T.accentMid, fontWeight: 600, fontFamily: T.poppins }}>Earned credits based on attendance · Leave · SC · CTO</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
              <Typography sx={{ fontSize: "0.72rem", color: T.faint, fontFamily: T.poppins }}>Input in:</Typography>
              <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} size="small"
                sx={{ "& .MuiToggleButton-root": { px: 1.25, py: 0.3, border: `1px solid ${T.accentBorder}`, fontSize: "0.72rem", fontWeight: 700, color: T.muted, fontFamily: T.poppins, "&.Mui-selected": { bgcolor: T.accent, color: "#fff", borderColor: T.accent } } }}>
                <ToggleButton value="hours"><HourIcon sx={{ fontSize: 13, mr: 0.5 }} />Hours</ToggleButton>
                <ToggleButton value="days"><DayIcon sx={{ fontSize: 13, mr: 0.5 }} />Days</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Employee selector row */}
          <Box sx={{ px: 4, py: 1.75, bgcolor: T.accentFaint, borderBottom: `1px solid ${T.divider}` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <PersonIcon sx={{ fontSize: 15, color: T.accent, flexShrink: 0 }} />
              <Autocomplete
                value={selectedEmployee} onChange={(_, v) => setSelectedEmployee(v)}
                options={employeeOptions} autoHighlight
                getOptionLabel={(o) => `${o._displayName} (${o.employeeNumber})`}
                filterOptions={(opts, { inputValue: iv }) => {
                  const q = iv.toLowerCase().trim();
                  return (!q ? opts : opts.filter(o => (o._searchKey || "").includes(q))).slice(0, 80);
                }}
                isOptionEqualToValue={(o, v) => o.employeeNumber === v.employeeNumber}
                noOptionsText="No employees found"
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  const initials = `${option.lastName?.[0] || ""}${option.firstName?.[0] || ""}`.toUpperCase() || "?";
                  const dc = deptMap[option.employeeNumber?.toString()];
                  const ec = empCatMap[option.employeeNumber?.toString()];
                  return (
                    <li key={key} {...rest}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        <Avatar sx={{ width: 26, height: 26, bgcolor: T.accent, fontSize: "0.65rem", fontWeight: 800, borderRadius: "5px", flexShrink: 0 }}>{initials}</Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: T.poppins, fontSize: "0.82rem" }}>{option._displayName}</Typography>
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            <Typography variant="caption" sx={{ color: T.faint, fontFamily: T.poppins }}>#{option.employeeNumber}</Typography>
                            {dc && <DeptBadge code={dc} />}
                            {ec && <EmpCatBadge label={ec.label} colorHex={ec.colorHex} />}
                          </Box>
                        </Box>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <FieldInput {...params} size="small" placeholder="Search employee by name or number…"
                    sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff", borderRadius: 2 } }}
                    InputProps={{ ...params.InputProps, startAdornment: <><SearchIcon sx={{ fontSize: 15, color: T.muted, mr: 0.5 }} />{params.InputProps.startAdornment}</> }}
                  />
                )}
                slotProps={{ paper: { sx: { borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: `1px solid ${T.accentBorder}` } } }}
                sx={{ flex: 1, maxWidth: 380 }}
              />
              {/* Category filter */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <FilterIcon sx={{ fontSize: 14, color: T.accent }} />
                <FormControl size="small" sx={{ minWidth: 170 }}>
                  <Select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setSelectedEmployee(null); }} displayEmpty
                    sx={{ fontSize: "0.78rem", bgcolor: "#fff", borderRadius: 2, "& .MuiOutlinedInput-notchedOutline": { borderColor: catFilter ? T.accent : T.accentBorder }, color: catFilter ? T.accent : T.faint, fontWeight: catFilter ? 700 : 400 }}
                    renderValue={(val) => {
                      if (!val) return <Typography sx={{ fontSize: "0.78rem", color: T.faint }}>All Categories</Typography>;
                      const [ft, fv] = val.split("||");
                      if (ft === "group") return <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.accent }}>{fv}</Typography>;
                      const [, tn] = fv.split("|");
                      return <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.accent }}>{tn}</Typography>;
                    }}>
                    <MenuItem value=""><Typography sx={{ fontSize: "0.8rem", color: T.faint }}>All Categories</Typography></MenuItem>
                    {Object.entries(groupedTypeConfigs).flatMap(([group, items]) => [
                      <MenuItem key={`gh-${group}`} value={`group||${group}`} sx={{ py: 0.75, bgcolor: alpha(T.accent, 0.04) }}>
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.accent }}>{group} (all)</Typography>
                      </MenuItem>,
                      ...items.map(item => (
                        <MenuItem key={`t-${item.id}`} value={`type||${item.parentGroup}|${item.typeName}`} sx={{ py: 0.5, pl: 3 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: item.colorHex }} />
                            <Typography sx={{ fontSize: "0.78rem" }}>{item.typeName}</Typography>
                          </Box>
                        </MenuItem>
                      )),
                    ])}
                  </Select>
                </FormControl>
                {catFilter && (
                  <Tooltip title="Clear filter">
                    <IconButton size="small" onClick={() => { setCatFilter(""); setSelectedEmployee(null); }} sx={{ p: 0.4, color: T.accent }}>
                      <Close sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {/* Month/Year Navigator */}
              <Box sx={{ ml: "auto" }}>
                <MonthYearNavigator year={periodYear} month={periodMonth} onChange={handleMonthChange} />
              </Box>
              {/* Selected employee chip */}
              {selectedEmployee && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, pl: 1, borderLeft: `1px solid ${T.divider}` }}>
                  <Avatar sx={{ width: 22, height: 22, bgcolor: T.accent, fontSize: "0.6rem", fontWeight: 800, borderRadius: "4px" }}>
                    {`${selectedEmployee.lastName?.[0] || ""}${selectedEmployee.firstName?.[0] || ""}`.toUpperCase() || "?"}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.text, fontFamily: T.poppins, lineHeight: 1 }}>
                      {`${(selectedEmployee.lastName || "").toUpperCase()}, ${selectedEmployee.firstName || ""}`.trim()}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.4 }}>
                      {deptCode && <DeptBadge code={deptCode} />}
                      {empCat   && <EmpCatBadge label={empCat.label} colorHex={empCat.colorHex} />}
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => setSelectedEmployee(null)} sx={{ color: T.faint, p: 0.25, "&:hover": { color: T.accent } }}>
                    <Close sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              )}
            </Box>
            {catFilter && (
              <Typography sx={{ mt: 0.75, fontSize: "0.68rem", color: T.muted, fontFamily: T.poppins }}>
                Showing {employeeOptions.length} employee{employeeOptions.length !== 1 ? "s" : ""} in selected category
              </Typography>
            )}
          </Box>

          {/* Tab row */}
          <Box sx={{ background: T.headerGrad, px: { xs: 0, sm: 1 }, pt: 1, pb: 0, display: "flex", alignItems: "flex-end" }}>
            {TABS.map((t, idx) => {
              const Icon = t.icon; const isActive = idx === activeTab;
              return (
                <Box key={t.id} onClick={() => setActiveTab(idx)}
                  sx={{ display: "flex", alignItems: "center", gap: 0.75, px: { xs: 1.5, sm: 2.5 }, py: 1, cursor: "pointer", position: "relative", borderRadius: "8px 8px 0 0", transition: "background 0.15s", bgcolor: isActive ? "rgba(255,255,255,0.97)" : "transparent", "&:hover": isActive ? {} : { bgcolor: "rgba(255,255,255,0.1)" }, "&::after": isActive ? { content: '""', position: "absolute", bottom: -1, left: 0, right: 0, height: 2, bgcolor: "rgba(255,255,255,0.97)" } : {} }}>
                  <Icon sx={{ fontSize: 14, color: isActive ? T.accent : "rgba(255,255,255,0.6)", flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.76rem", fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : "rgba(255,255,255,0.7)", fontFamily: T.poppins, whiteSpace: "nowrap", display: { xs: "none", sm: "block" } }}>{t.label}</Typography>
                  <Typography sx={{ fontSize: "0.76rem", fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : "rgba(255,255,255,0.7)", fontFamily: T.poppins, whiteSpace: "nowrap", display: { xs: "block", sm: "none" } }}>{t.shortLabel}</Typography>
                </Box>
              );
            })}
          </Box>
        </SectionCard>
      </Box>

      {/* Tab content */}
      <Box sx={{ width: "100vw", maxWidth: "100%", position: "relative", left: "63%", transform: "translateX(-61%)", px: { xs: 2, sm: 3, md: 6 }, pb: 4 }}>
        <SectionCard sx={{ borderRadius: "0 0 12px 12px", borderTop: "none" }}>
          <Box sx={{ p: 2.5, height: "calc(100vh - 385px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Fade in key={`${activeTab}-${periodYear}-${periodMonth}`} timeout={250}>
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {activeTab === 0 && <LeaveEarningsPanel {...panelProps} />}
                {activeTab === 1 && <SCEarningsPanel    {...panelProps} />}
                {activeTab === 2 && <CTOEarningsPanel   {...panelProps} />}
              </Box>
            </Fade>
          </Box>
        </SectionCard>
      </Box>
    </Box>
  );
};

export default EarningsManagement;