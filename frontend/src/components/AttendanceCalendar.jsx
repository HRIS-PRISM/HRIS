import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, IconButton, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import { CalendarMonth, ArrowBackIosNew, ArrowForwardIos, AccessTime } from "@mui/icons-material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { fetchAttendanceCalendarMaps } from "./ATTENDANCE/attendanceLeaveIntegration";
// ─── DTR-aligned data source: same late/undertime + schedule computation the DTR module uses ──
import {
  fetchDailyLateUndertime,
  isDtrDateScheduledByOfficialTime,
  getDayNameFromYmd,
} from "../utils/dtrLateUndertimeFromOverall";
import { fetchOfficialTimesBatch } from "../utils/fetchOfficialTimesBatch";
import {
  isDtrNonWorkingDayRow,
  getDtrUnscheduledWeekdayBanner,
  dtrTimeValueEmpty,
} from "../utils/dtrFormatHelpers";
import { isDtrAbsentRow, MODULE_TYPES } from "../utils/halfDayReview";

const T = {
  accent:       "#6d2323",
  accentFaint:  "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.18)",
  muted:        "#6b6b6b",
  faint:        "#a0a0a0",
  text:         "#1a1a1a",
  divider:      "rgba(0,0,0,0.07)",
  surface:      "#ffffff",
};

/* ─── date helpers ─────────────────────────────────────────────────── */
const toISODate = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/**
 * Normalize any date value (Date object, "YYYY-MM-DD", or ISO timestamp string)
 * to a Philippines-calendar "YYYY-MM-DD" string.
 * Mirrors the `toPhCalendarYmd` helper used by the DTR module, so both
 * components agree on which calendar day an attendancerecord row belongs to
 * (avoids UTC-midnight off-by-one issues).
 */
const toPhYmd = (value) => {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const y  = parts.find((p) => p.type === "year")?.value;
    const mo = parts.find((p) => p.type === "month")?.value;
    const da = parts.find((p) => p.type === "day")?.value;
    if (y && mo && da) return `${y}-${mo}-${da}`;
  } catch {
    /* ignore */
  }
  return s.split("T")[0];
};

const expandHolidayDates = (h) => {
  const parse = (v) => { const d = new Date(v); return isNaN(d) ? null : d; };
  const s = parse(h?.date_start || h?.date);
  const e = parse(h?.date_end   || h?.date);
  if (!s) return [];
  const out = [];
  for (let d = new Date(s); d <= (e || s); d.setDate(d.getDate() + 1))
    out.push(toISODate(d));
  return out;
};

const inferLeaveCode = (obj) => {
  const r = String(obj?.leave_type || obj?.leaveType || obj?.type || "").toLowerCase();
  return r.includes("sick") || r.includes("sl") ? "SL" : "VL";
};

/** "00:00:00" / "00:00" / falsy all count as "not late". Anything else = late. */
const isLateTotalNonZero = (lateTotal) => {
  if (!lateTotal) return false;
  const s = String(lateTotal).trim();
  if (!s) return false;
  return !/^0{1,2}:0{2}(:0{2})?$/.test(s);
};

/* ─── chip palette ─────────────────────────────────────────────────── */
const CHIPS = {
  P:   { bg: "#dcfce7", fg: "#166534", label: "Present" },
  A:   { bg: "#fee2e2", fg: "#991b1b", label: "Absent" },
  VL:  { bg: "#dbeafe", fg: "#1e3a8a", label: "Vacation leave" },
  SL:  { bg: "#fef9c3", fg: "#854d0e", label: "Sick leave" },
  NWD: { bg: "#f1f5f9", fg: "#64748b", label: "Non-working day" },
  H:   { bg: "#fde8d8", fg: "#9a3412", label: "Holiday" },
  L:   { bg: "#fef3c7", fg: "#92400e", label: "Late" },
};

const Chip = ({ code }) => {
  if (!code) return <Box sx={{ width: 28, height: 24 }} />;
  const c = CHIPS[code] || {};
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 24, borderRadius: "5px",
      fontSize: "11px", fontWeight: 800, lineHeight: 1,
      bgcolor: c.bg, color: c.fg, userSelect: "none", flexShrink: 0,
    }}>
      {code}
    </Box>
  );
};

/* ─── component ────────────────────────────────────────────────────── */
export default function AttendanceCalendar({ employeeNumber, holidays = [] }) {
  const [cursor,        setCursor]        = useState(() => new Date());
  const [loading,       setLoading]       = useState(false);
  const [punches,       setPunches]       = useState([]);       // attendancerecord rows (same source as DTR)
  const [lateByDate,    setLateByDate]    = useState({});        // { iso: { lateTotal, undertimeTotal } } — same as DTR
  const [suspension,    setSuspension]    = useState({});
  const [leaves,        setLeaves]        = useState({});
  const [apiHols,       setApiHols]       = useState({});
  const [officialTimes, setOfficialTimes] = useState({});         // { Monday: {...}, ..., Saturday: {...} } — same as DTR

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();

  const monthLabel  = useMemo(() => new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }), [year, month]);
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const todayISO    = useMemo(() => toISODate(new Date()), []);

  const range = useMemo(() => ({
    startDate: toISODate(new Date(year, month, 1)),
    endDate:   toISODate(new Date(year, month + 1, 0)),
  }), [year, month]);

  /* prop holidays → map */
  const propHolMap = useMemo(() => {
    const m = new Map();
    for (const h of holidays || []) {
      if ((h?.status || "").toLowerCase() !== "active") continue;
      expandHolidayDates(h).forEach(iso => {
        if (!m.has(iso)) m.set(iso, []);
        m.get(iso).push(h);
      });
    }
    return m;
  }, [holidays]);

  const getAuthHeaders = () => {
    const t = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } };
  };

  /* fetch — same endpoints/params the DTR module uses for this employee + period */
  useEffect(() => {
    let dead = false;
    (async () => {
      const emp = String(employeeNumber || "").trim();
      if (!emp) return;
      setLoading(true);
      setPunches([]);
      setLateByDate({});
      try {
        const h = getAuthHeaders().headers;

        const [pr, maps, lateRes, otMap] = await Promise.all([
          // Same source DTR reads from: attendancerecord (processed / admin-adjusted),
          // NOT the raw device table.
          axios.post(`${API_BASE_URL}/attendance/api/view-attendance`, {
            personID: emp,
            startDate: range.startDate,
            endDate: range.endDate,
          }, { headers: h }),
          fetchAttendanceCalendarMaps({
            apiBaseUrl: API_BASE_URL, getAuthHeaders,
            startDate: range.startDate, endDate: range.endDate, personId: emp,
          }),
          // Same late/undertime computation DTR reads (overall_attendance_record.daily_late_undertime)
          fetchDailyLateUndertime(emp, range.startDate, range.endDate),
          // Same Official Time schedule DTR reads — determines which days are actually worked
          fetchOfficialTimesBatch([emp], range.startDate, range.endDate, getAuthHeaders),
        ]);

        if (dead) return;
        setPunches(Array.isArray(pr.data) ? pr.data : []);
        setSuspension(maps?.suspensionByDate || {});
        setLeaves(maps?.leaveByDate         || {});
        setApiHols(maps?.holidayByDate      || {});
        setLateByDate(lateRes?.byDate || {});
        setOfficialTimes(otMap?.[emp] || otMap?.[String(emp)] || {});
      } catch {
        if (!dead) { setPunches([]); setLateByDate({}); setOfficialTimes({}); }
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, [employeeNumber, range.startDate, range.endDate]);

  /* punch map — one attendancerecord row per calendar day (PH time) */
  const punchMap = useMemo(() => {
    const m = new Map();
    punches.forEach((r) => {
      const iso = toPhYmd(r.date);
      if (!iso) return;
      m.set(iso, r);
    });
    return m;
  }, [punches]);

  /** Same priority DTR's getDateIndicator uses: leave > suspension > holiday. */
  const getDateIndicator = (iso) => {
    if (leaves?.[iso]) {
      return { code: inferLeaveCode(leaves[iso]), indicator: { type: "leave", label: "LEAVE" } };
    }
    if (suspension?.[iso]) {
      return { code: "H", indicator: { type: "suspension", label: "SUSPENSION" } };
    }
    if (apiHols?.[iso] || propHolMap.has(iso)) {
      return { code: "H", indicator: { type: "holiday", label: "HOLIDAY" } };
    }
    return { code: null, indicator: null };
  };

  const hasPeriodRecords = punches.length > 0;

  const getCode = (iso) => {
    const { code: indicatorCode, indicator } = getDateIndicator(iso);
    if (indicator) return indicatorCode;

    const rec = punchMap.get(iso);
    const dayName = getDayNameFromYmd(iso);

    // Same schedule check DTR uses — respects the employee's actual Official Time
    // days (e.g. Mon–Sat employees have Saturday scheduled, so it's never flagged
    // as non-working; falls back to "scheduled" if no Official Time is configured
    // at all, matching DTR's behavior of not blanking the whole month).
    const isNotScheduledDay = !isDtrDateScheduledByOfficialTime({
      record: rec,
      officialTimesByDay: officialTimes,
      fullDate: iso,
    });

    const timeFields = {
      timeIN: rec?.timeIN || "",
      breaktimeIN: rec?.breaktimeIN || "",
      breaktimeOUT: rec?.breaktimeOUT || "",
      timeOUT: rec?.timeOUT || "",
    };

    // Sat/Sun, unscheduled, no punches → non-working day.
    if (
      isDtrNonWorkingDayRow({
        isNotScheduledDay,
        indicator,
        timeFields,
        hasPeriodRecords,
        fullDate: iso,
        dayName,
      })
    ) {
      return "NWD";
    }

    // Mon–Fri, unscheduled, no punches (rare — e.g. a workday with no Official
    // Time set up for that weekday). DTR shows the weekday name as its own
    // banner here; the calendar reuses the same NWD chip for simplicity.
    const unscheduledWeekdayLabel = getDtrUnscheduledWeekdayBanner({
      isNotScheduledDay,
      indicator,
      timeFields,
      hasPeriodRecords,
      fullDate: iso,
      dayName,
    });
    if (unscheduledWeekdayLabel) return "NWD";

    // Scheduled day, no calendar indicator, no punches → absent.
    const rowIsAbsent = isDtrAbsentRow({
      record: rec,
      dateIndicator: indicator,
      isNotScheduledDay,
      moduleType: MODULE_TYPES.NON_TEACHING,
      hasPeriodRecords,
    });
    if (rowIsAbsent) return "A";

    const hasTimeIn = !dtrTimeValueEmpty(rec?.timeIN);
    if (!hasTimeIn) return "";

    // Late determination matches DTR exactly: computed lateTotal from
    // overall_attendance_record, not a hardcoded 8:00 AM cutoff.
    const lateTotal = lateByDate?.[iso]?.lateTotal;
    return isLateTotalNonZero(lateTotal) ? "L" : "P";
  };

  const days = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) => {
      const d    = i + 1;
      const date = new Date(year, month, d);
      const dow  = date.getDay();
      const iso  = toISODate(date);
      return { d, dow, iso, isToday: iso === todayISO, isWeekend: dow === 0 || dow === 6 };
    }),
  [daysInMonth, year, month, todayISO]);

  const navBtn = (dir) => (
    <IconButton
      size="small"
      onClick={() => setCursor(new Date(year, month + dir, 1))}
      sx={{
        width: 24, height: 24, borderRadius: "6px",
        border: `1px solid ${T.accentBorder}`,
        color: T.accent,
        "&:hover": { bgcolor: T.accentFaint },
      }}
    >
      {dir === -1
        ? <ArrowBackIosNew  sx={{ fontSize: 11 }} />
        : <ArrowForwardIos  sx={{ fontSize: 11 }} />}
    </IconButton>
  );

  /* ─── render ──────────────────────────────────────────────────────── */
  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      bgcolor: T.surface,
      minWidth: 0,
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      borderRadius: "16px",
      border: "0 !important",
      outline: "none",
      boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06), 0 14px 28px rgba(15,23,42,0.07) !important",
      overflow: "hidden",
      transition: "box-shadow 0.22s ease, transform 0.22s ease",
      willChange: "transform, box-shadow",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 0 0 1.5px rgba(109,35,35,0.22), 0 6px 16px rgba(15,23,42,0.08), 0 20px 40px rgba(15,23,42,0.12) !important",
      },
    }}>

      {/* ── HEADER ── */}
      <Box sx={{
        px: 1.75, py: 1.1,
        display: "flex", alignItems: "center", gap: 1,
        bgcolor: "#fff",
        borderBottom: `1px solid ${T.divider}`,
        flexShrink: 0,
        minHeight: 44,
      }}>
        <Box sx={{ width: 26, height: 26, borderRadius: "8px", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CalendarMonth sx={{ fontSize: 14, color: T.accent }} />
        </Box>
        <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, lineHeight: 1, flexShrink: 0, letterSpacing: "-0.01em" }}>
          My Attendance
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {navBtn(-1)}
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: T.text, minWidth: 92, textAlign: "center" }}>
            {loading ? "…" : monthLabel}
          </Typography>
          {navBtn(1)}
        </Box>
        <Box sx={{
          display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 0.4,
          ml: 0.5, px: 1, py: 0.35, borderRadius: "99px",
          bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`,
          flexShrink: 0,
        }}>
          <AccessTime sx={{ fontSize: 11, color: T.accent }} />
          <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.accent, whiteSpace: "nowrap" }}>
            8:00 AM – 5:00 PM
          </Typography>
        </Box>
      </Box>

      {/* ── TABLE (hugs content; scroll horizontally only) ── */}
      <Box sx={{
        overflowX: "auto",
        overflowY: "hidden",
        flexShrink: 0,
        minWidth: 0,
        width: "100%",
        "&::-webkit-scrollbar": { height: 5 },
        "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(109,35,35,0.35)", borderRadius: 3 },
        "&::-webkit-scrollbar-track": { bgcolor: "rgba(109,35,35,0.06)" },
      }}>
        <Table size="small" sx={{
          borderCollapse: "separate",
          borderSpacing: 0,
          tableLayout: "fixed",
          width: "max-content",
          "& th, & td": { boxSizing: "border-box" },
        }}>
          <colgroup>
            <col style={{ width: 120 }} />
            {days.map(({ d }) => <col key={d} style={{ width: 32 }} />)}
          </colgroup>

          <TableHead>
            <TableRow>
              <TableCell sx={{
                bgcolor: T.accent, color: "#fff", fontWeight: 700, fontSize: "0.7rem",
                pl: 1.25, pr: 1, py: 0.85,
                borderRight: "1px solid rgba(255,255,255,0.22)",
                position: "sticky", left: 0, zIndex: 4,
                boxShadow: "2px 0 6px rgba(0,0,0,0.12)",
              }}>
                Employee
              </TableCell>

              {days.map(({ d, dow, isToday, isWeekend }) => (
                <TableCell key={d} sx={{
                  bgcolor: isToday ? "#8B4545" : T.accent,
                  color: "#fff", textAlign: "center",
                  p: "4px 1px", lineHeight: 1.1,
                  borderRight: "1px solid rgba(255,255,255,0.12)",
                }}>
                  <Box sx={{ fontSize: "0.55rem", fontWeight: 600, color: isWeekend ? "rgba(255,200,200,0.85)" : "rgba(255,255,255,0.72)" }}>
                    {["Su","M","T","W","Th","F","Sa"][dow]}
                  </Box>
                  <Box sx={{ fontSize: "0.72rem", color: "#fff", fontWeight: 800 }}>{d}</Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            <TableRow sx={{ "&:hover td:not(:first-of-type)": { bgcolor: T.accentFaint } }}>
              <TableCell sx={{
                pl: 1.25, pr: 1, py: 1.1,
                borderRight: `1px solid ${T.accentBorder}`,
                position: "sticky", left: 0, bgcolor: "#fff", zIndex: 3,
                boxShadow: "2px 0 6px rgba(0,0,0,0.06)",
              }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", color: T.text, lineHeight: 1.25 }}>
                  My attendance
                </Typography>
                {employeeNumber && (
                  <Typography sx={{ fontSize: "0.62rem", color: T.faint, mt: 0.15 }}>#{employeeNumber}</Typography>
                )}
              </TableCell>

              {days.map(({ d, iso, isToday }) => (
                <TableCell key={d}
                  title={CHIPS[getCode(iso)]?.label}
                  sx={{
                    textAlign: "center", verticalAlign: "middle", p: "6px 1px",
                    borderRight: `1px solid ${T.divider}`,
                    bgcolor: isToday ? "rgba(109,35,35,0.04)" : "#fff",
                  }}
                >
                  <Chip code={getCode(iso)} />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      {/* ── LEGEND ── */}
      <Box sx={{
        mt: "auto",
        px: 1.5, py: 1,
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px 10px",
        borderTop: `1px solid ${T.divider}`,
        bgcolor: "#fff", flexShrink: 0,
      }}>
        {Object.entries(CHIPS).map(([code, { bg, fg, label }]) => (
          <Box key={code} sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Box sx={{
              width: 18, height: 16, borderRadius: "3px",
              bgcolor: bg, color: fg, fontSize: "0.55rem", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{code}</Box>
            <Typography sx={{ fontSize: "0.62rem", color: T.muted, lineHeight: 1, whiteSpace: "nowrap" }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── FOOTER NOTE ── */}
      <Box sx={{
        px: 1.5, py: 0.75,
        borderTop: `1px solid ${T.divider}`,
        bgcolor: "#fff", flexShrink: 0,
      }}>
        <Typography sx={{ fontSize: "0.6rem", color: T.faint, lineHeight: 1.4 }}>
          Blank cells = no biometric punch recorded — not counted as absent.
        </Typography>
      </Box>

    </Box>
  );
}