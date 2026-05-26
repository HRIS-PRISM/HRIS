import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CircularProgress,
  Chip,
  Button,
  Tooltip,
  Alert,
  IconButton,
  Dialog,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
  EventNote as LeaveIcon,
  WorkHistory as SCIcon,
  AccessTime as CTOIcon,
  Close as CloseIcon,
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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  CheckCircleOutline as ApproveIcon,
  CancelOutlined as RejectIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  DateRange as DateRangeIcon,
  Calculate as CalculateIcon,
  SwapHoriz as ConvertIcon,
  OpenInNew as OpenInNewIcon,
  RemoveCircleOutline as DeductIcon,
  Receipt as ReceiptIcon,
  ArrowForward as ArrowForwardIcon,
  People as PeopleIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
} from "@mui/icons-material";
import {
  useOfficialAttendanceMetrics,
  listHalfDayDatesFromDailyRows,
} from "./useOfficialAttendanceMetrics";
import { listEarningsHalfDayDatesForDisplay } from "../../../utils/halfDayReview";
import { fetchDeductionCreditSnapshots } from "../../../utils/deductionSourceBalances";
import OverallAttendanceCompareModal from "../../ATTENDANCE/OverallAttendanceCompareModal";
import {
  buildOverallPutPayloadFromRow,
  mergeEarningsSummaryChoices,
  overallRecordsDiffer,
} from "../../ATTENDANCE/overallAttendanceMerge";

/** Align half-day row dates with API `deductedVlHalfDates` (handles YYYY-M-D vs YYYY-MM-DD). */
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
  rowOdd: "rgba(109,35,35,0.025)",
  rowHover: "rgba(109,35,35,0.055)",
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

const getCalendarDays = (year, month) => new Date(year, month, 0).getDate();

const monthName = (m) =>
  MONTHS.find((x) => x.value === String(m))?.label || `Month ${m}`;

const formatPeriodDate = (iso) => {
  const s = String(iso ?? "")
    .trim()
    .split("T")[0];
  const parts = s.split("-").map(Number);
  const y = parts[0];
  const mo = parts[1];
  const day = parts[2];
  if (!y || !mo || !day) return s || "—";
  const d = new Date(y, mo - 1, day);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

const EARNINGS_OVERALL_COMPARE_FIELDS = [
  { key: "overallRenderedOfficialTime", label: "Overall — rendered" },
  { key: "overallRenderedOfficialTimeTardiness", label: "Overall — tardiness" },
];
const EARNINGS_COMPARE_KEYS = EARNINGS_OVERALL_COMPARE_FIELDS.map((f) => f.key);

// ─── All editable columns — mirrors OverallAttendance COLUMN_GROUPS ──────────
const EDIT_COLUMN_GROUPS = [
  {
    key: "overall",
    label: "Overall",
    headerBg: "#0f4a26",
    columns: [
      { label: "Overall Rendered",  key: "overallRenderedOfficialTime",          group: "overall" },
      { label: "Overall Tardiness", key: "overallRenderedOfficialTimeTardiness", group: "overallTard" },
      { label: "Late Total",        key: "lateTotalTime",                        group: "tardiness" },
    ],
  },
  {
    key: "morning",
    label: "Morning",
    headerBg: "#166534",
    columns: [
      { label: "Morning Hours",     key: "totalRenderedTimeMorning",          group: "rendered" },
      { label: "Morning Tardiness", key: "totalRenderedTimeMorningTardiness", group: "tardiness" },
    ],
  },
  {
    key: "afternoon",
    label: "Afternoon",
    headerBg: "#166534",
    columns: [
      { label: "Afternoon Hours",     key: "totalRenderedTimeAfternoon",          group: "rendered" },
      { label: "Afternoon Tardiness", key: "totalRenderedTimeAfternoonTardiness", group: "tardiness" },
    ],
  },
  {
    key: "honorarium",
    label: "Honorarium",
    headerBg: "#0369a1",
    columns: [
      { label: "Honorarium",   key: "totalRenderedHonorarium",          group: "rendered" },
      { label: "HN Tardiness", key: "totalRenderedHonorariumTardiness", group: "tardiness" },
    ],
  },
  {
    key: "serviceCredit",
    label: "Service Credit",
    headerBg: "#6b21a8",
    columns: [
      { label: "Service Credit", key: "totalRenderedServiceCredit",          group: "rendered" },
      { label: "SC Tardiness",   key: "totalRenderedServiceCreditTardiness", group: "tardiness" },
    ],
  },
  {
    key: "overtime",
    label: "Overtime",
    headerBg: "#92400e",
    columns: [
      { label: "Overtime",     key: "totalRenderedOvertime",          group: "rendered" },
      { label: "OT Tardiness", key: "totalRenderedOvertimeTardiness", group: "tardiness" },
    ],
  },
];

const getCellColor = (group) => {
  if (group === "rendered")    return "#166534";
  if (group === "tardiness")   return "#991b1b";
  if (group === "overall")     return "#166534";
  if (group === "overallTard") return "#991b1b";
  return T.text;
};

const getColHeaderBg = (group) => {
  if (group === "rendered")    return "#166534";
  if (group === "tardiness")   return "#991b1b";
  if (group === "overall")     return "#0f4a26";
  if (group === "overallTard") return "#6b0f0f";
  return T.accentDark;
};

// ─── Attendance module navigation shortcuts (used only inside EditAttendanceSummaryModal) ──
const ATTENDANCE_MODULES = [
  {
    key: "non-teaching",
    label: "Non-Teaching",
    sublabel: "8hrs staff",
    path: "/attendance_module",
    lsPrefix: "attendanceNonTeaching",
    color: "#185FA5",
    bg: "#E6F1FB",
    border: "#B5D4F4",
  },
  {
    key: "faculty-30",
    label: "Faculty 30hrs",
    sublabel: "JO faculty",
    path: "/attendance_module_faculty",
    lsPrefix: "attendanceFaculty30",
    color: "#3B6D11",
    bg: "#EAF3DE",
    border: "#C0DD97",
  },
  {
    key: "faculty-40",
    label: "Faculty 40hrs",
    sublabel: "Designated",
    path: "/attendance_module_faculty_40hrs",
    lsPrefix: "attendanceDesignated",
    color: "#534AB7",
    bg: "#EEEDFE",
    border: "#AFA9EC",
  },
];

const GROUP_ROW_H = 28;

const SectionCard = styled(Card)({
  borderRadius: 12,
  overflow: "hidden",
  background: T.surface,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 24px rgba(0,0,0,0.04)",
  border: "0.5px solid rgba(0,0,0,0.09)",
});

const ColHeader = ({ icon: Icon, label, color = T.accent, children }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      px: 1.5,
      py: 1,
      flexWrap: "nowrap",
      borderBottom: `1px solid ${T.divider}`,
      flexShrink: 0,
      bgcolor: alpha(T.accent, 0.03),
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
        minWidth: 0,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        flexShrink: 0,
        flexWrap: "nowrap",
      }}
    >
      {children}
    </Box>
  </Box>
);

import { DeductionReceiptSwitcher } from './CTODeductionReceipt';

// ─── Inline editable HH:MM:SS cell ───────────────────────────────────────────
const EditableTimeCell = ({ fieldKey, value, onChange, group }) => {
  const [focused, setFocused] = useState(false);
  const [localVal, setLocalVal] = useState("");
  const displayVal = value || "";
  const color = getCellColor(group);
  const isActive = !!displayVal && displayVal !== "00:00:00";

  return (
    <TableCell
      sx={{
        minWidth: 130,
        px: 1,
        py: 0.75,
        textAlign: "center",
        bgcolor: isActive
          ? group === "rendered" || group === "overall"
            ? "rgba(21,128,61,0.07)"
            : group === "tardiness" || group === "overallTard"
            ? "rgba(153,27,27,0.07)"
            : "rgba(0,0,0,0.03)"
          : "rgba(0,0,0,0.015)",
        transition: "background 0.1s",
      }}
    >
      <Box sx={{ position: "relative", display: "inline-block" }}>
        <input
          type="text"
          placeholder="HH:MM:SS"
          value={focused ? localVal : displayVal}
          onFocus={() => {
            setFocused(true);
            setLocalVal(displayVal);
          }}
          onChange={(e) => {
            setLocalVal(e.target.value);
            onChange(fieldKey, e.target.value);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          style={{
            width: 110,
            padding: "5px 8px",
            borderRadius: 6,
            border: `1.5px solid ${focused ? color : isActive ? `${color}55` : "rgba(0,0,0,0.13)"}`,
            fontSize: "0.78rem",
            fontWeight: 700,
            fontFamily: "monospace",
            textAlign: "center",
            background: "#fff",
            color: isActive ? color : T.faint,
            outline: "none",
            transition: "border-color 0.14s",
            boxSizing: "border-box",
          }}
        />
      </Box>
    </TableCell>
  );
};

// ─── Full-table Edit Attendance Summary Modal ────────────────────────────────
const EditAttendanceSummaryModal = ({
  open,
  onClose,
  raw,
  month,
  year,
  fields,
  onChange,
  onSave,
  saving,
  error,
  onNavigateToModule,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState(
    new Set(["honorarium", "serviceCredit", "overtime"])
  );

  const toggleGroup = (key) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (!raw) return null;

  const btnBase = {
    textTransform: "none",
    fontFamily: T.poppins,
    fontSize: "0.78rem",
    fontWeight: 600,
    py: 0.6,
    px: 1.5,
    borderRadius: 1.5,
    minWidth: 0,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
          overflow: "hidden",
          border: "0.5px solid rgba(0,0,0,0.09)",
          bgcolor: "#fff",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          maxHeight: "90vh",
        },
      }}
    >
      {/* ── Modal Header ── */}
      <Box
        sx={{
          px: 3,
          py: 2,
          background: "linear-gradient(135deg,#fdf5f5 0%,#f0dede 100%)",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            position: "absolute", top: -40, right: -40,
            width: 160, height: 160, borderRadius: "50%",
            background: `radial-gradient(circle,${alpha(T.accent, 0.1)} 0%,transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: "absolute", top: 10, right: 10,
            color: T.accent, opacity: 0.45,
            "&:hover": { opacity: 1, bgcolor: alpha(T.accent, 0.08) },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 1 }}>
          <Box
            sx={{
              width: 42, height: 42, borderRadius: "11px",
              bgcolor: alpha(T.accent, 0.1),
              border: `1px solid ${alpha(T.accent, 0.2)}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <EditIcon sx={{ fontSize: 19, color: T.accent }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.98rem", color: T.accent, fontFamily: T.poppins, lineHeight: 1.2 }}>
                Edit Attendance Summary
              </Typography>
              <Chip
                label="All Fields"
                size="small"
                sx={{
                  bgcolor: alpha(T.accent, 0.1), color: T.accent, fontWeight: 700,
                  fontSize: "0.56rem", letterSpacing: "0.07em", textTransform: "uppercase",
                  height: 16, borderRadius: "5px", border: `1px solid ${alpha(T.accent, 0.22)}`,
                  fontFamily: T.poppins,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: "0.69rem", color: T.faint, fontWeight: 500, fontFamily: T.poppins }}>
              {monthName(month)} {year} · {formatPeriodDate(raw.startDate)} → {formatPeriodDate(raw.endDate)}
            </Typography>
          </Box>

          {/* ── Module navigation buttons ── */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
            <Typography sx={{ fontSize: "0.58rem", fontWeight: 700, color: T.faint, fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.08em", mr: 0.25 }}>
              Go to
            </Typography>
            {ATTENDANCE_MODULES.map((mod) => (
              <Tooltip key={mod.key} title={`Open ${mod.label} attendance module`} placement="bottom" arrow enterDelay={400}>
                <Box
                  onClick={() => onNavigateToModule(mod)}
                  sx={{
                    display: "flex", alignItems: "center", gap: 0.4,
                    px: 1, py: 0.5, borderRadius: 1.5,
                    border: `1px solid ${mod.border}`, bgcolor: mod.bg,
                    cursor: "pointer", userSelect: "none",
                    transition: "all 0.14s ease",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: `0 3px 10px ${alpha(mod.color, 0.22)}`,
                      filter: "brightness(0.97)",
                    },
                    "&:active": { transform: "translateY(0)" },
                  }}
                >
                  <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: mod.color, fontFamily: T.poppins, whiteSpace: "nowrap", lineHeight: 1 }}>
                    {mod.label}
                  </Typography>
                  <ArrowForwardIcon sx={{ fontSize: 9, color: alpha(mod.color, 0.6) }} />
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── Modal Body — scrollable table ── */}
      <Box
        sx={{
          overflowY: "auto",
          overflowX: "auto",
          flex: 1,
          borderTop: `1px solid ${T.divider}`,
          "&::-webkit-scrollbar": { width: 5, height: 5 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(0,0,0,0.14)", borderRadius: 3 },
        }}
      >
        {/* Info hint */}
        <Box
          sx={{
            display: "flex", alignItems: "center", gap: 0.75,
            mx: 2.5, mt: 1.5, mb: 1,
            px: 1.25, py: 0.75, borderRadius: 1.5,
            bgcolor: "rgba(0,0,0,0.025)", border: "1px solid rgba(0,0,0,0.07)",
          }}
        >
          <CalculateIcon sx={{ fontSize: 12, color: T.muted }} />
          <Typography sx={{ fontSize: "0.67rem", color: T.muted, fontFamily: T.poppins, fontWeight: 500 }}>
            Edit values directly in the cells below — input in <strong>HH:MM:SS</strong> format. Click column group headers to expand / collapse sections.
          </Typography>
        </Box>

        {/* ── Full attendance table — matches OverallAttendance style ── */}
        <Box sx={{ px: 2.5, pb: 2 }}>
          <Box
            sx={{
              borderRadius: "8px",
              border: `1px solid ${T.accentBorder}`,
              overflow: "hidden",
            }}
          >
            <Box sx={{ overflowX: "auto" }}>
              <Table
                sx={{
                  minWidth: EDIT_COLUMN_GROUPS.reduce((sum, grp) => {
                    const isCollapsed = collapsedGroups.has(grp.key);
                    return sum + (isCollapsed ? 0 : grp.columns.length * 140);
                  }, 0),
                  borderCollapse: "collapse",
                }}
              >
                <TableHead>
                  {/* ── Row 1: Group toggle headers ── */}
                  <TableRow>
                    {EDIT_COLUMN_GROUPS.map((grp) => {
                      const isCollapsed = collapsedGroups.has(grp.key);
                      const colSpan = isCollapsed ? 1 : grp.columns.length;
                      return (
                        <TableCell
                          key={grp.key}
                          colSpan={colSpan}
                          onClick={() => toggleGroup(grp.key)}
                          sx={{
                            position: "sticky", top: 0, zIndex: 3,
                            background: grp.headerBg,
                            color: "#fff",
                            textAlign: "center",
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            py: 0.6, px: 1,
                            height: `${GROUP_ROW_H}px`,
                            cursor: "pointer",
                            borderBottom: "1px solid rgba(255,255,255,0.12)",
                            borderRight: "2px solid rgba(255,255,255,0.22)",
                            whiteSpace: "nowrap",
                            userSelect: "none",
                            transition: "opacity 0.15s",
                            "&:hover": { opacity: 0.84 },
                            fontFamily: T.poppins,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                            {isCollapsed
                              ? <KeyboardArrowRightIcon sx={{ fontSize: 12, opacity: 0.9 }} />
                              : <KeyboardArrowDownIcon  sx={{ fontSize: 12, opacity: 0.9 }} />
                            }
                            <span>{grp.label}</span>
                            <Box component="span" sx={{ fontSize: "0.5rem", bgcolor: "rgba(255,255,255,0.18)", borderRadius: "3px", px: 0.5, py: 0.1, ml: 0.25 }}>
                              {isCollapsed ? "show" : "hide"}
                            </Box>
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {/* ── Row 2: Column labels ── */}
                  <TableRow>
                    {EDIT_COLUMN_GROUPS.map((grp) => {
                      const isCollapsed = collapsedGroups.has(grp.key);
                      if (isCollapsed) {
                        return (
                          <TableCell
                            key={grp.key + "_lbl_ph"}
                            sx={{
                              padding: 0, width: 0, minWidth: 0, maxWidth: 0,
                              overflow: "hidden",
                              position: "sticky", top: GROUP_ROW_H, zIndex: 2,
                              background: grp.headerBg,
                              borderBottom: `2px solid ${alpha(T.accent, 0.25)}`,
                            }}
                          />
                        );
                      }
                      return grp.columns.map(({ label, key, group }) => (
                        <TableCell
                          key={key}
                          sx={{
                            minWidth: 130, textAlign: "center",
                            position: "sticky", top: GROUP_ROW_H, zIndex: 2,
                            fontSize: "0.61rem", fontWeight: 700,
                            py: 0.85, px: 1.5, whiteSpace: "nowrap",
                            letterSpacing: "0.06em", textTransform: "uppercase",
                            borderBottom: `2px solid ${alpha(T.accent, 0.25)}`,
                            color: "#fff",
                            background: getColHeaderBg(group),
                            fontFamily: T.poppins,
                          }}
                        >
                          {label}
                        </TableCell>
                      ));
                    })}
                  </TableRow>
                </TableHead>

                <TableBody>
                  <TableRow
                    sx={{
                      "&:hover td": { bgcolor: `${T.rowHover} !important` },
                    }}
                  >
                    {EDIT_COLUMN_GROUPS.flatMap((grp) => {
                      const isCollapsed = collapsedGroups.has(grp.key);
                      if (isCollapsed) {
                        return (
                          <TableCell
                            key={grp.key + "_data_ph"}
                            sx={{
                              padding: 0, width: 0, minWidth: 0, maxWidth: 0,
                              overflow: "hidden",
                              borderBottom: `1px solid ${T.divider}`,
                            }}
                          />
                        );
                      }
                      return grp.columns.map(({ key, group }) => (
                        <EditableTimeCell
                          key={key}
                          fieldKey={key}
                          value={fields[key] ?? ""}
                          onChange={onChange}
                          group={group}
                        />
                      ));
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Box>

          {/* Footer legend */}
          <Box sx={{ pt: 1.25, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { bg: "rgba(21,128,61,0.1)",   border: "rgba(21,128,61,0.3)",   label: "Rendered time" },
              { bg: "rgba(153,27,27,0.08)",  border: "rgba(153,27,27,0.3)",   label: "Tardiness" },
              { bg: "rgba(21,128,61,0.14)",  border: "rgba(21,128,61,0.4)",   label: "Overall rendered" },
              { bg: "rgba(153,27,27,0.14)",  border: "rgba(153,27,27,0.4)",   label: "Overall tardiness" },
            ].map((item, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: item.bg, border: `1px solid ${item.border}` }} />
                <Typography sx={{ fontSize: "0.67rem", color: T.faint, fontFamily: T.poppins }}>{item.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 1.5, fontSize: "0.67rem", py: 0.25, borderRadius: 1.5 }}>
            {error}
          </Alert>
        )}
      </Box>

      {/* ── Modal Footer ── */}
      <Box
        sx={{
          px: 3, py: 1.75,
          display: "flex", justifyContent: "flex-end", gap: 1,
          bgcolor: "rgba(0,0,0,0.015)",
          borderTop: `1px solid ${T.divider}`,
          flexShrink: 0,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          disabled={saving}
          sx={{
            textTransform: "none",
            fontFamily: T.poppins,
            fontSize: "0.78rem",
            fontWeight: 600,
            py: 0.6,
            px: 1.5,
            borderRadius: 1.5,
            minWidth: 0,
            borderColor: "rgba(0,0,0,0.18)", color: T.muted,
            "&:hover": { borderColor: "rgba(0,0,0,0.35)", bgcolor: "rgba(0,0,0,0.03)" },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={onSave}
          disabled={saving}
          startIcon={
            saving
              ? <CircularProgress size={12} color="inherit" />
              : <SaveIcon sx={{ fontSize: "14px !important" }} />
          }
          sx={{
            textTransform: "none",
            fontFamily: T.poppins,
            fontSize: "0.78rem",
            fontWeight: 600,
            py: 0.6,
            px: 1.5,
            borderRadius: 1.5,
            minWidth: 0,
            bgcolor: T.accent, color: "#fff",
            boxShadow: `0 2px 8px ${alpha(T.accent, 0.3)}`,
            "&:hover": { bgcolor: T.accentDark, boxShadow: `0 4px 12px ${alpha(T.accent, 0.4)}` },
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </Box>
    </Dialog>
  );
};

// ─── AttendanceSummary Main Component ─────────────────────────────────────────
const AttendanceSummary = ({
  employee, year, month, attendanceData, attendanceLoading,
  onRefresh, onRecordsRefresh, empCat, vlReceiptRefreshKey, balanceRefreshKey = 0,
  onBalancesInvalidate,
  deductedVlHalfDates = [],
  onDeductHalfDayVLRequested,
  filedLeaveByDate = {},
}) => {
  const navigate = useNavigate();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fields, setFields] = useState({});
  const [liveBalances, setLiveBalances] = useState({ vl: null, sc: null, cto: null });
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareFormProposal, setCompareFormProposal] = useState(null);
  const [compareTertiary, setCompareTertiary] = useState(null);
  const [summaryUpdateNote, setSummaryUpdateNote] = useState("");

  const ALL_EDIT_KEYS = EDIT_COLUMN_GROUPS.flatMap((g) => g.columns.map((c) => c.key));

  const fetchLiveBalances = useCallback(async () => {
    if (!employee) return;
    const token = localStorage.getItem("token");
    try {
      const snaps = await fetchDeductionCreditSnapshots(employee.employeeNumber, token);
      const vlHours = toNum(snaps?.assignmentMap?.VL?.remaining_hours);
      setLiveBalances({
        vl: (vlHours / 8).toFixed(3),
        sc: (toNum(snaps?.scRemainingHours) / 8).toFixed(3),
        cto: (toNum(snaps?.ctoRemainingHours) / 8).toFixed(3),
      });
    } catch {
      setLiveBalances({ vl: "—", sc: "—", cto: "—" });
    }
  }, [employee]);

  useEffect(() => { fetchLiveBalances(); }, [fetchLiveBalances, balanceRefreshKey]);

  const raw = attendanceData?.summary;
  const calDays = getCalendarDays(year, month);
  const officialStart = raw?.startDate;
  const officialEnd = raw?.endDate;

  const {
    absentDays: absentDaysOfficial,
    halfDayDatesOfficial,
    rows: officialRows,
    calendarMaps: officialCalendarMaps,
    absentTimeHrs: absentTimeHrsOfficial,
    halfDayShortfallHrs: halfDayShortfallHrsOfficial,
    renderedHrs: renderedHrsOfficial,
    loading: officialMetricsLoading,
  } = useOfficialAttendanceMetrics({
    employeeNumber: employee?.employeeNumber,
    startDate: officialStart,
    endDate: officialEnd,
  });

  const canTrustOfficialMetrics =
    !officialMetricsLoading &&
    Boolean(officialStart && officialEnd && employee?.employeeNumber);

  const tardHrs = useMemo(() => {
    if (!raw) return 0;
    const fromDbLate =
      raw.lateTotalTime != null && String(raw.lateTotalTime).trim() !== ""
        ? parseHHMM(raw.lateTotalTime)
        : null;
    if (fromDbLate != null) return fromDbLate;
    const fromInjected =
      raw._lateTotal != null && String(raw._lateTotal).trim() !== ""
        ? parseHHMM(raw._lateTotal)
        : null;
    if (fromInjected != null) return fromInjected;
    const savedOverall = parseHHMM(raw.overallRenderedOfficialTimeTardiness);
    if (!canTrustOfficialMetrics) return savedOverall;
    const absentH = toNum(absentTimeHrsOfficial);
    const halfH = toNum(halfDayShortfallHrsOfficial);
    return Math.max(0, savedOverall - absentH - halfH);
  }, [raw, canTrustOfficialMetrics, absentTimeHrsOfficial, halfDayShortfallHrsOfficial]);

  const buildFieldsFromRaw = useCallback(() => {
    if (!raw) return {};
    const init = {};
    ALL_EDIT_KEYS.forEach((key) => {
      if (key === "lateTotalTime") {
        init[key] = raw.lateTotalTime || hoursToHHMM(tardHrs);
      } else {
        init[key] = raw[key] || "";
      }
    });
    return init;
  }, [raw, tardHrs]);

  useEffect(() => {
    if (!raw) {
      setFields({});
      setEditModalOpen(false);
      return;
    }
    setFields(buildFieldsFromRaw());
    setEditModalOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, tardHrs]);

  useEffect(() => {
    if (editModalOpen && raw) {
      setError("");
      setFields(buildFieldsFromRaw());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editModalOpen]);

  const handleChange = (key, val) =>
    setFields((p) => ({ ...p, [key]: val }));

  const putSummaryPayload = async (payload) => {
    const token = localStorage.getItem("token");
    await axios.put(
      `${API_BASE_URL}/attendance/api/overall_attendance_record/${raw.id}`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setSuccess("Saved!");
    setEditModalOpen(false);
    setSummaryUpdateNote(`Summary updated · ${new Date().toLocaleString()}`);
    if (onRefresh) onRefresh();
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleSave = async () => {
    if (!raw?.id) {
      setError("No record to update.");
      return;
    }
    setSaving(true);
    setError("");

    const formProposal = {
      overallRenderedOfficialTime: fields.overallRenderedOfficialTime || raw.overallRenderedOfficialTime || "",
      overallRenderedOfficialTimeTardiness: fields.overallRenderedOfficialTimeTardiness || raw.overallRenderedOfficialTimeTardiness || "",
    };
    const tertiaryProposal = canTrustOfficialMetrics
      ? {
          overallRenderedOfficialTime: hoursToHHMM(toNum(renderedHrsOfficial)),
          overallRenderedOfficialTimeTardiness: raw.overallRenderedOfficialTimeTardiness,
        }
      : null;
    const diffSavedForm = overallRecordsDiffer(raw, formProposal, EARNINGS_COMPARE_KEYS);
    const diffSavedTert =
      tertiaryProposal &&
      overallRecordsDiffer(raw, tertiaryProposal, EARNINGS_COMPARE_KEYS);

    try {
      if (diffSavedForm || diffSavedTert) {
        setCompareFormProposal(formProposal);
        setCompareTertiary(tertiaryProposal);
        setEditModalOpen(false);
        setCompareOpen(true);
        return;
      }
      const payload = buildOverallPutPayloadFromRow(raw, formProposal);
      ALL_EDIT_KEYS.forEach((key) => {
        if (fields[key] != null && fields[key] !== "") {
          payload[key] = fields[key];
        }
      });
      payload.lateTotalTime = fields.lateTotalTime || hoursToHHMM(tardHrs);
      await putSummaryPayload(payload);
    } catch (err) {
      setError("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCompareClose = () => {
    setCompareOpen(false);
    setCompareFormProposal(null);
    setCompareTertiary(null);
    setSaving(false);
  };

  const handleCompareConfirm = async (choices) => {
    if (!raw?.id || !compareFormProposal) {
      handleCompareClose();
      return;
    }
    setCompareOpen(false);
    setSaving(true);
    setError("");
    try {
      const payload = mergeEarningsSummaryChoices(
        raw,
        compareFormProposal,
        compareTertiary || {},
        choices,
      );
      ALL_EDIT_KEYS.forEach((key) => {
        if (fields[key] != null && fields[key] !== "") {
          payload[key] = fields[key];
        }
      });
      payload.lateTotalTime = fields.lateTotalTime || hoursToHHMM(tardHrs);
      await putSummaryPayload(payload);
    } catch (err) {
      setError("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
      setCompareFormProposal(null);
      setCompareTertiary(null);
    }
  };

  const handleNavigateToModule = useCallback(
    (module) => {
      const en = String(employee?.employeeNumber || "");
      const sd = raw?.startDate ? String(raw.startDate).split("T")[0] : "";
      const ed = raw?.endDate ? String(raw.endDate).split("T")[0] : "";
      if (en) {
        localStorage.setItem(`${module.lsPrefix}EmployeeNumber`, en);
        if (sd) localStorage.setItem(`${module.lsPrefix}StartDate`, sd);
        if (ed) localStorage.setItem(`${module.lsPrefix}EndDate`, ed);
      }
      navigate(module.path, { state: { employeeNumber: en, startDate: sd, endDate: ed } });
    },
    [employee, raw, navigate],
  );

  const overallHrs = raw ? parseHHMM(raw.overallRenderedOfficialTime) : 0;
  const stats = attendanceData?.stats || {};

  const lateDays = toNum(stats.late_days);
  const absentDays = canTrustOfficialMetrics ? absentDaysOfficial : toNum(stats.absent_days);
  const totalAbsentDays = absentDays;
  const totalAbsentHrs = totalAbsentDays * 8;
  const presentDays = toNum(stats.present_days);

  /** Same source as ATTENDANCE/AttendanceSummary: saved overall_attendance_record buckets only. */
  const halfDayDates = useMemo(() => {
    if (raw) {
      const fromStoredField = [
        ...new Set(
          (String(raw.halfDayDates || "").match(/\d{4}-\d{2}-\d{2}/g) || [])
            .map(normalizeHalfDayDateKey)
            .filter(Boolean),
        ),
      ].sort();
      if (fromStoredField.length) return fromStoredField;
      const fromRecord = listEarningsHalfDayDatesForDisplay(raw);
      return [
        ...new Set(
          (Array.isArray(fromRecord) ? fromRecord : [])
            .map(normalizeHalfDayDateKey)
            .filter(Boolean),
        ),
      ].sort();
    }
    const merge = new Set();
    if (canTrustOfficialMetrics) {
      (Array.isArray(halfDayDatesOfficial) ? halfDayDatesOfficial : []).forEach((d) => {
        const n = normalizeHalfDayDateKey(d);
        if (n) merge.add(n);
      });
    }
    if (!merge.size) {
      let dates = listHalfDayDatesFromDailyRows(officialRows, null);
      if (!dates.length) {
        dates = listHalfDayDatesFromDailyRows(
          Array.isArray(attendanceData?.dailyRecords) ? attendanceData.dailyRecords : [],
          null,
        );
      }
      dates.forEach((d) => merge.add(normalizeHalfDayDateKey(d)));
      const statsHalf = toNum(attendanceData?.stats?.half_days ?? attendanceData?.stats?.halfDays);
      if (!merge.size && statsHalf > 0.0001) {
        const fallback =
          (officialStart && String(officialStart).slice(0, 10)) ||
          `${year}-${String(month).padStart(2, "0")}-01`;
        if (fallback) merge.add(normalizeHalfDayDateKey(fallback));
      }
    }
    return [...merge].filter(Boolean).sort();
  }, [
    raw,
    canTrustOfficialMetrics,
    halfDayDatesOfficial,
    officialRows,
    attendanceData?.dailyRecords,
    attendanceData?.stats,
    officialStart,
    year,
    month,
  ]);

  const halfDays = useMemo(() => {
    if (raw?.halfDays != null && String(raw.halfDays).trim() !== "") {
      const stored = toNum(raw.halfDays);
      if (Number.isFinite(stored)) return stored;
    }
    if (halfDayDates.length) return halfDayDates.length;
    if (!raw) {
      if (canTrustOfficialMetrics) {
        return Array.isArray(halfDayDatesOfficial) ? halfDayDatesOfficial.length : 0;
      }
      return toNum(stats.half_days ?? stats.halfDays);
    }
    return 0;
  }, [
    raw,
    halfDayDates.length,
    canTrustOfficialMetrics,
    halfDayDatesOfficial,
    stats.half_days,
    stats.halfDays,
  ]);

  const halfDayHrs = useMemo(() => {
    if (raw?.halfDayShortfallTime != null && String(raw.halfDayShortfallTime).trim() !== "") {
      return parseHHMM(raw.halfDayShortfallTime);
    }
    if (halfDayDates.length) {
      return canTrustOfficialMetrics
        ? toNum(halfDayShortfallHrsOfficial)
        : halfDays * 4;
    }
    if (!raw && canTrustOfficialMetrics) return toNum(halfDayShortfallHrsOfficial);
    return halfDays * 4;
  }, [
    raw,
    halfDayDates.length,
    halfDays,
    canTrustOfficialMetrics,
    halfDayShortfallHrsOfficial,
  ]);

  const deductedNormSet = useMemo(
    () => new Set((deductedVlHalfDates || []).map(normalizeHalfDayDateKey).filter(Boolean)),
    [deductedVlHalfDates],
  );
  const leaveByDateMap = officialCalendarMaps?.leaveByDate || {};
  const isHalfDayCoveredByLeave = useCallback(
    (d) => {
      const key = normalizeHalfDayDateKey(d);
      if (!key) return false;
      if (leaveByDateMap[key]) return true;
      if (filedLeaveByDate?.[key]) return true;
      return false;
    },
    [leaveByDateMap, filedLeaveByDate],
  );
  const nextUndeductedVlHalfDate =
    halfDayDates.find(
      (d) =>
        !deductedNormSet.has(normalizeHalfDayDateKey(d)) &&
        !isHalfDayCoveredByLeave(d),
    ) || null;

  // ── Early returns ──────────────────────────────────────────────────────────
  if (!employee) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ColHeader icon={DateRangeIcon} label="Attendance Summary" color={T.accent} />
      </Box>
    );
  }

  if (attendanceLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ColHeader icon={DateRangeIcon} label="Attendance Summary" color={T.accent} />
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress size={20} sx={{ color: T.accent }} />
        </Box>
      </Box>
    );
  }

  const btnOutlineSx = {
    textTransform: "none",
    fontFamily: T.poppins,
    fontSize: "0.75rem",
    fontWeight: 600,
    py: 0.4,
    px: 1.1,
    borderRadius: 1,
    borderColor: "rgba(0,0,0,0.18)",
    color: T.muted,
    minWidth: 0,
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Scrollable content ── */}
      <Box
        sx={{
          flex: 1, overflowY: "auto", px: 1, pt: 0.5, pb: 1,
          display: "flex", flexDirection: "column",
          "&::-webkit-scrollbar": { width: 3 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(0,0,0,0.12)", borderRadius: 2 },
        }}
      >
        {success && (
          <Alert
            severity="success"
            sx={{ py: 0, px: 1, mb: 1, fontSize: "0.65rem", borderRadius: 1.25, "& .MuiAlert-icon": { mr: 0.75 } }}
          >
            {success}
          </Alert>
        )}

        {!raw ? (
          /* ── Empty state — no attendance record ── */
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <ColHeader icon={DateRangeIcon} label="Attendance Summary" color={T.accent} />
            <Box
              sx={{
                px: 1.5, py: 2, borderRadius: 2, bgcolor: "rgba(0,0,0,0.03)",
                border: "1px dashed rgba(0,0,0,0.15)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5,
              }}
            >
              <DateRangeIcon sx={{ fontSize: 20, color: T.faint, opacity: 0.5 }} />
              <Typography sx={{ fontSize: "0.73rem", fontWeight: 700, color: "#333", fontFamily: T.poppins }}>
                {monthName(month)} {year}
              </Typography>
              <Typography sx={{ fontSize: "0.62rem", color: T.faint, fontFamily: T.poppins, textAlign: "center" }}>
                {calDays} cal. days · No attendance record found
              </Typography>
            </Box>
          </Box>
        ) : (
          /* ── Main content ── */
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {/* ── Col Header with Edit + Refresh ── */}
            <ColHeader icon={DateRangeIcon} label="Attendance Summary" color={T.accent}>
              <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexShrink: 0 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon sx={{ fontSize: "12px !important" }} />}
                  onClick={() => setEditModalOpen(true)}
                  sx={{
                    ...btnOutlineSx,
                    borderColor: alpha(T.accent, 0.3),
                    color: T.accent,
                    "&:hover": { bgcolor: alpha(T.accent, 0.05), borderColor: T.accent },
                  }}
                >
                  Edit
                </Button>
                <IconButton
                  size="small"
                  onClick={onRefresh}
                  sx={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 1, p: 0.35 }}
                >
                  <RefreshIcon sx={{ fontSize: 16, color: T.muted }} />
                </IconButton>
              </Box>
            </ColHeader>

            <Box sx={{ px: 0.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
              {/* Period info */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap", rowGap: 0.5 }}>
                <Typography sx={{ fontSize: "0.6875rem", color: T.muted, fontFamily: T.poppins, flex: "1 1 auto", minWidth: 0 }}>
                  {monthName(month)} {year} | {formatPeriodDate(raw.startDate)} → {formatPeriodDate(raw.endDate)}
                </Typography>
                <Typography sx={{ fontSize: "0.6875rem", color: T.muted, fontFamily: T.poppins, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {calDays} Calendar Days
                </Typography>
              </Box>

              {/* ── Metrics card — unified LeaveInputColumn style ── */}
              <Box sx={{
                bgcolor: "rgba(0,0,0,0.01)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 1.5,
                overflow: "hidden",
              }}>
                {/* Card header — matches ColHeader style */}
                <Box sx={{
                  px: 1.5, py: 0.85,
                  bgcolor: alpha(T.accent, 0.03),
                  borderBottom: `1px solid ${T.divider}`,
                  display: "flex", alignItems: "center", gap: 0.75,
                }}>
                  <CalIcon sx={{ fontSize: 13, color: T.accent }} />
                  <Typography sx={{
                    fontSize: "0.65rem", fontWeight: 800, color: T.accent,
                    fontFamily: T.poppins, textTransform: "uppercase", letterSpacing: "0.07em",
                  }}>
                    Metrics
                  </Typography>
                </Box>

                <Box sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
                  {/* 5-column stat grid */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 0.625 }}>
                    {[
                      { label: "Days rendered", primary: `${(overallHrs / 8).toFixed(3)} d`,    hint: hrsToHMS(overallHrs),                                          bad: false, good: false },
                      { label: "Tardiness",     primary: `${(tardHrs / 8).toFixed(3)} d`,       hint: tardHrs > 0 ? hrsToHMS(tardHrs) : "—",                         bad: tardHrs > 0, good: false },
                      { label: "Absences",      primary: `${totalAbsentDays.toFixed(3)} d`,     hint: totalAbsentDays > 0 ? `${totalAbsentHrs.toFixed(3)} hrs` : "—", bad: totalAbsentDays > 0, good: false },
                      { label: "Half days",     primary: `${halfDays.toFixed(3)} d`,            hint: halfDays > 0 ? hrsToHMS(halfDayHrs) : "—",                     bad: false, good: false },
                      { label: "Days present",  primary: `${presentDays.toFixed(0)} d`,         hint: presentDays > 0 ? hrsToHMS(presentDays * 8) : "—",             bad: false, good: presentDays > 0 },
                    ].map(({ label, primary, hint, bad, good }) => (
                      <Box
                        key={label}
                        sx={{
                          bgcolor: "rgba(0,0,0,0.025)",
                          borderRadius: 1.5,
                          p: "7px 9px",
                          border: `1.5px solid ${bad ? "rgba(107,26,26,0.2)" : "rgba(0,0,0,0.08)"}`,
                          transition: "all 0.15s",
                        }}
                      >
                        <Typography sx={{ fontSize: "0.6rem", color: T.faint, fontFamily: T.poppins, mb: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {label}
                        </Typography>
                        <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: bad ? "#A32D2D" : good ? "#3B6D11" : T.text, fontFamily: T.poppins, lineHeight: 1.2 }}>
                          {primary}
                        </Typography>
                        <Typography sx={{ fontSize: "0.6rem", color: T.muted, fontFamily: T.poppins, mt: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {hint}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* ── Leave balances — unified style ── */}
                  <Box>
                    <Typography sx={{
                      fontSize: "0.6rem", fontWeight: 800, color: T.faint,
                      fontFamily: T.poppins, textTransform: "uppercase",
                      letterSpacing: "0.07em", mb: "5px",
                    }}>
                      Leave balances
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 0.625 }}>
                      {[
                        {
                          title: "Vacation leave (VL)",
                          val: liveBalances.vl,
                          nameColor: "#185FA5",
                          valColor: "#0C447C",
                          bg: "rgba(21,95,165,0.06)",
                          border: "rgba(21,95,165,0.22)",
                        },
                        {
                          title: "Service credit (SC)",
                          val: liveBalances.sc,
                          nameColor: "#3B6D11",
                          valColor: "#27500A",
                          bg: "rgba(59,109,17,0.06)",
                          border: "rgba(59,109,17,0.22)",
                        },
                        {
                          title: "Comp. time off (CTO)",
                          val: liveBalances.cto,
                          nameColor: "#534AB7",
                          valColor: "#3C3489",
                          bg: "rgba(83,74,183,0.06)",
                          border: "rgba(83,74,183,0.22)",
                        },
                      ].map((b) => {
                        const num = parseFloat(b.val);
                        const isNeg = Number.isFinite(num) && num < 0;
                        const displayColor = isNeg ? "#c62828" : b.valColor;
                        return (
                          <Box
                            key={b.title}
                            sx={{
                              textAlign: "center",
                              p: "7px 8px",
                              borderRadius: 1.5,
                              border: `1.5px solid ${isNeg ? "rgba(198,40,40,0.25)" : b.border}`,
                              bgcolor: isNeg ? "rgba(198,40,40,0.04)" : b.bg,
                              transition: "all 0.15s",
                            }}
                          >
                            <Typography sx={{
                              fontSize: "0.58rem", color: b.nameColor, fontFamily: T.poppins,
                              mb: "2px", fontWeight: 700, lineHeight: 1.2,
                            }}>
                              {b.title}
                            </Typography>
                            <Typography sx={{
                              fontSize: "1rem", fontWeight: 700,
                              color: displayColor, fontFamily: T.poppins, lineHeight: 1.2,
                            }}>
                              {b.val ?? "—"}
                            </Typography>
                            <Typography sx={{
                              fontSize: "0.58rem", color: b.nameColor, fontFamily: T.poppins,
                              mt: "1px", opacity: 0.7,
                            }}>
                              days remaining
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* ── Deduction receipt switcher ── */}
              <DeductionReceiptSwitcher
                employee={employee}
                attendanceData={attendanceData}
                year={year}
                month={month}
                onDeductSuccess={() => {
                  if (onRefresh) onRefresh();
                  if (onRecordsRefresh) onRecordsRefresh();
                  if (onBalancesInvalidate) onBalancesInvalidate();
                }}
                refreshKey={(vlReceiptRefreshKey ?? 0) + (balanceRefreshKey ?? 0)}
                empCat={empCat}
                onDeductHalfDayVLRequested={onDeductHalfDayVLRequested}
                halfDayDeductDate={nextUndeductedVlHalfDate || null}
                halfDayPendingDates={halfDayDates}
                deductedVlHalfDates={deductedVlHalfDates}
                leaveByDate={officialCalendarMaps?.leaveByDate || {}}
                filedLeaveByDate={filedLeaveByDate}
                metricsTardinessHrs={tardHrs}
              />

              {summaryUpdateNote ? (
                <Typography sx={{ fontSize: "0.58rem", color: T.muted, fontFamily: T.poppins, textAlign: "center", pt: 0.75, pb: 0.25 }}>
                  {summaryUpdateNote}
                </Typography>
              ) : null}
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Full-table Edit Attendance Summary Modal ── */}
      <EditAttendanceSummaryModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setError(""); }}
        raw={raw}
        month={month}
        year={year}
        fields={fields}
        onChange={handleChange}
        onSave={handleSave}
        saving={saving}
        error={error}
        onNavigateToModule={handleNavigateToModule}
      />

      {/* ── Overall attendance compare modal ── */}
      <OverallAttendanceCompareModal
        open={compareOpen}
        onClose={handleCompareClose}
        onConfirm={handleCompareConfirm}
        savedRow={raw}
        proposedRecord={compareFormProposal}
        tertiaryRecord={compareTertiary}
        fields={EARNINGS_OVERALL_COMPARE_FIELDS}
        title="Compare summary vs your edit"
      />
    </Box>
  );
};

export { AttendanceSummary };