import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Button, CircularProgress, IconButton, Tooltip } from "@mui/material";
import {
  WarningAmber, CheckCircleOutline, ErrorOutline, Coffee,
  ArrowBackIosNew, ArrowForwardIos,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { fetchAttendanceCalendarMaps } from "./ATTENDANCE/attendanceLeaveIntegration";
import {
  fetchDailyLateUndertime,
  isDtrDateScheduledByOfficialTime,
  getDayNameFromYmd,
} from "../utils/dtrLateUndertimeFromOverall";
import { fetchOfficialTimesBatch } from "../utils/fetchOfficialTimesBatch";
import {
  isDtrNonWorkingDayRow,
  dtrTimeValueEmpty,
} from "../utils/dtrFormatHelpers";
import { isDtrAbsentRow, MODULE_TYPES } from "../utils/halfDayReview";

const T = {
  accent: "#6d2323",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.18)",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  text: "#1a1a1a",
  divider: "rgba(0,0,0,0.07)",
  surface: "#ffffff",
};

/* ─── date helpers (same convention as AttendanceCalendar) ─────────── */
const toISODate = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

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
    const y = parts.find((p) => p.type === "year")?.value;
    const mo = parts.find((p) => p.type === "month")?.value;
    const da = parts.find((p) => p.type === "day")?.value;
    if (y && mo && da) return `${y}-${mo}-${da}`;
  } catch {
    /* ignore */
  }
  return s.split("T")[0];
};

/**
 * Does this weekday's Official Time schedule actually define a break window?
 * If no break is configured for the day (e.g. a 30-hour/continuous-shift
 * schedule), we never flag a "missing break punch" for that day — this is
 * how the "30-hour employees don't need break in/out" rule is honored
 * without needing a separate employee-type field.
 */
const dayScheduleHasBreak = (daySchedule) => {
  if (!daySchedule) return false;
  const bIn =
    daySchedule.breakTimeIn ?? daySchedule.breaktimeIN ?? daySchedule.break_time_in ?? daySchedule.breakIn;
  const bOut =
    daySchedule.breakTimeOut ?? daySchedule.breaktimeOUT ?? daySchedule.break_time_out ?? daySchedule.breakOut;
  return !dtrTimeValueEmpty(bIn) && !dtrTimeValueEmpty(bOut);
};

const expandHolidayDates = (h) => {
  const parse = (v) => { const d = new Date(v); return isNaN(d) ? null : d; };
  const s = parse(h?.date_start || h?.date);
  const e = parse(h?.date_end || h?.date);
  if (!s) return [];
  const out = [];
  for (let d = new Date(s); d <= (e || s); d.setDate(d.getDate() + 1)) out.push(toISODate(d));
  return out;
};

const getAuthHeaders = () => {
  const t = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } };
};

const ISSUE_META = {
  absent: { label: "Absent", icon: ErrorOutline, color: "#b71c1c", bg: "#fdecea" },
  no_timeout: { label: "No Time-Out", icon: WarningAmber, color: "#c17f24", bg: "#fff6e5" },
  no_break: { label: "No Break Punch", icon: Coffee, color: "#8B4545", bg: "rgba(109,35,35,0.06)" },
};

/**
 * DtrNoticePanel
 *
 * Scans the employee's own attendance for the given period against their
 * Official Time schedule and surfaces punch problems that will otherwise
 * turn into unexplained absences / payroll deductions:
 *   - Absent (scheduled day, no time-in recorded, not covered by leave/holiday/suspension)
 *   - No time-out (time-in recorded but time-out missing)
 *   - No break punch (break window scheduled for that day, but break-in/out missing)
 *
 * Reuses the exact same data source + helpers as AttendanceCalendar so the
 * two views can never disagree about a given day's status.
 *
 * NOTE on period: when `startDate`/`endDate` aren't explicitly passed, the
 * panel shows a browsable calendar-month window (width `monthsSpan`, default
 * 1) with Prev/Next arrows in the header — e.g. `monthsSpan=2` shows
 * two-month windows like Jul–Aug, Aug–Sep, etc. It opens on the window
 * ending `initialOffsetMonths` months before the current month (default 1,
 * i.e. the previous month), since a payroll cutoff is normally reviewed only
 * after the month has ended. "Next" is disabled once the window's end would
 * reach the current, still-in-progress month. Pass explicit `startDate`/
 * `endDate` (YYYY-MM-DD) instead if you need a fixed, non-browsable period.
 */
export default function DtrNoticePanel({
  employeeNumber, holidays = [], startDate, endDate,
  monthsSpan = 1, initialOffsetMonths = 1,
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [punches, setPunches] = useState([]);
  const [lateByDate, setLateByDate] = useState({});
  const [suspension, setSuspension] = useState({});
  const [leaves, setLeaves] = useState({});
  const [apiHols, setApiHols] = useState({});
  const [officialTimes, setOfficialTimes] = useState({});

  // How many months back from the current month the *end* of the window
  // sits. 1 = window ends at the previous month (the earliest the "next"
  // arrow will allow, since the current month isn't over yet).
  const [offsetMonths, setOffsetMonths] = useState(Math.max(1, initialOffsetMonths));
  const isBrowsable = !startDate && !endDate;
  const canGoNewer = isBrowsable && offsetMonths > 1;
  const canGoOlder = isBrowsable; // no fixed limit going further into the past

  const todayISO = useMemo(() => toISODate(new Date()), []);

  // Period window: width `monthsSpan` months, ending `offsetMonths` months
  // before the current month — e.g. now=September, offsetMonths=1,
  // monthsSpan=2 → Jul 1 – Aug 31. Explicit startDate/endDate always win.
  const range = useMemo(() => {
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - offsetMonths + 1, 0); // last day of end month
    const periodStart = new Date(now.getFullYear(), now.getMonth() - offsetMonths - monthsSpan + 1, 1);
    return {
      startDate: startDate || toISODate(periodStart),
      endDate: endDate || toISODate(periodEnd),
    };
  }, [startDate, endDate, offsetMonths, monthsSpan]);

  const periodLabel = useMemo(() => {
    const s = new Date(range.startDate);
    const e = new Date(range.endDate);
    if (isNaN(s) || isNaN(e)) return "";
    const sm = s.toLocaleDateString("en-US", { month: "short" });
    const em = e.toLocaleDateString("en-US", { month: "short" });
    const sy = s.getFullYear();
    const ey = e.getFullYear();
    if (sm === em && sy === ey) return `${sm} ${sy}`;
    if (sy === ey) return `${sm}–${em} ${sy}`;
    return `${sm} ${sy} – ${em} ${ey}`;
  }, [range.startDate, range.endDate]);

  const propHolMap = useMemo(() => {
    const m = new Map();
    for (const h of holidays || []) {
      if ((h?.status || "").toLowerCase() !== "active") continue;
      expandHolidayDates(h).forEach((iso) => {
        if (!m.has(iso)) m.set(iso, []);
        m.get(iso).push(h);
      });
    }
    return m;
  }, [holidays]);

  useEffect(() => {
    let dead = false;
    (async () => {
      const emp = String(employeeNumber || "").trim();
      if (!emp) { setLoading(false); return; }
      setLoading(true);
      try {
        const h = getAuthHeaders().headers;
        const [pr, maps, lateRes, otMap] = await Promise.all([
          axios.post(`${API_BASE_URL}/attendance/api/view-attendance`, {
            personID: emp,
            startDate: range.startDate,
            endDate: range.endDate,
          }, { headers: h }),
          fetchAttendanceCalendarMaps({
            apiBaseUrl: API_BASE_URL, getAuthHeaders,
            startDate: range.startDate, endDate: range.endDate, personId: emp,
          }),
          fetchDailyLateUndertime(emp, range.startDate, range.endDate),
          fetchOfficialTimesBatch([emp], range.startDate, range.endDate, getAuthHeaders),
        ]);

        if (dead) return;
        setPunches(Array.isArray(pr.data) ? pr.data : []);
        setSuspension(maps?.suspensionByDate || {});
        setLeaves(maps?.leaveByDate || {});
        setApiHols(maps?.holidayByDate || {});
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

  const punchMap = useMemo(() => {
    const m = new Map();
    punches.forEach((r) => {
      const iso = toPhYmd(r.date);
      if (!iso) return;
      m.set(iso, r);
    });
    return m;
  }, [punches]);

  const getDateIndicator = (iso) => {
    if (leaves?.[iso]) return { type: "leave" };
    if (suspension?.[iso]) return { type: "suspension" };
    if (apiHols?.[iso] || propHolMap.has(iso)) return { type: "holiday" };
    return null;
  };

  const hasPeriodRecords = punches.length > 0;

  const issues = useMemo(() => {
    if (!range.startDate || !range.endDate) return [];
    const out = [];
    const start = new Date(range.startDate);
    const end = new Date(range.endDate < todayISO ? range.endDate : todayISO); // never flag future days
    if (isNaN(start) || isNaN(end)) return out;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = toISODate(d);
      const indicator = getDateIndicator(iso);
      if (indicator) continue; // on leave / holiday / suspension → not an issue

      const rec = punchMap.get(iso);
      const dayName = getDayNameFromYmd(iso);
      const daySchedule = officialTimes?.[dayName];

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

      const isNonWorking = isDtrNonWorkingDayRow({
        isNotScheduledDay, indicator: null, timeFields, hasPeriodRecords, fullDate: iso, dayName,
      });
      if (isNonWorking) continue;

      const rowIsAbsent = isDtrAbsentRow({
        record: rec,
        dateIndicator: null,
        isNotScheduledDay,
        moduleType: MODULE_TYPES.NON_TEACHING,
        hasPeriodRecords,
      });
      if (rowIsAbsent) {
        out.push({ iso, type: "absent" });
        continue;
      }

      const hasTimeIn = !dtrTimeValueEmpty(rec?.timeIN);
      if (!hasTimeIn) continue; // no record at all but not flagged absent by DTR rule — skip

      const hasTimeOut = !dtrTimeValueEmpty(rec?.timeOUT);
      if (!hasTimeOut && iso !== todayISO) {
        out.push({ iso, type: "no_timeout" });
      }

      if (dayScheduleHasBreak(daySchedule)) {
        const hasBreakIn = !dtrTimeValueEmpty(rec?.breaktimeIN);
        const hasBreakOut = !dtrTimeValueEmpty(rec?.breaktimeOUT);
        if ((!hasBreakIn || !hasBreakOut) && hasTimeOut) {
          out.push({ iso, type: "no_break" });
        }
      }
    }
    return out.sort((a, b) => (a.iso < b.iso ? 1 : -1)); // most recent first
  }, [range.startDate, range.endDate, todayISO, punchMap, officialTimes, leaves, suspension, apiHols, propHolMap, hasPeriodRecords]);

  const fmtDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <Box sx={{
      display: "flex", flexDirection: "column", height: "100%", minHeight: 0,
      bgcolor: T.surface, borderRadius: "12px", border: `2px solid ${T.accentBorder}`,
      boxShadow: "0 1px 6px rgba(109,35,35,0.10)", overflow: "hidden",
    }}>
      {/* ── HEADER ── */}
      <Box sx={{
        px: 2.5, py: 1.4, display: "flex", alignItems: "center", gap: 1.25,
        bgcolor: T.accentFaint, borderBottom: `1.5px solid ${T.accentBorder}`, flexShrink: 0,
      }}>
        <WarningAmber sx={{ fontSize: 16, color: T.accent, flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: T.accent, lineHeight: 1 }}>
          Daily Time Record (DTR) Notice:
        </Typography>
        <Box sx={{ flex: 1 }} />
        {isBrowsable && (
          <Tooltip title="Older month">
            <span>
              <IconButton
                size="small"
                disabled={!canGoOlder}
                onClick={() => setOffsetMonths((v) => v + 1)}
                sx={{ color: T.accent, p: 0.4, borderRadius: "6px", "&:hover": { bgcolor: "rgba(109,35,35,0.10)" }, "&.Mui-disabled": { color: T.faint } }}
              >
                <ArrowBackIosNew sx={{ fontSize: 13 }} />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.text, minWidth: 0, textAlign: "center" }}>
          {periodLabel}
        </Typography>
        {isBrowsable && (
          <Tooltip title="Newer month">
            <span>
              <IconButton
                size="small"
                disabled={!canGoNewer}
                onClick={() => setOffsetMonths((v) => Math.max(1, v - 1))}
                sx={{ color: T.accent, p: 0.4, borderRadius: "6px", "&:hover": { bgcolor: "rgba(109,35,35,0.10)" }, "&.Mui-disabled": { color: T.faint } }}
              >
                <ArrowForwardIos sx={{ fontSize: 13 }} />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* ── BODY ── */}
      <Box sx={{
        flex: 1, minHeight: 0, overflowY: "auto", p: loading || issues.length === 0 ? 0 : 1.5,
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-thumb": { bgcolor: T.accentBorder, borderRadius: 2 },
      }}>
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.5 }}>
            <CircularProgress size={26} sx={{ color: T.accent }} />
            <Typography sx={{ fontSize: "0.75rem", color: T.muted }}>Checking your DTR…</Typography>
          </Box>
        ) : issues.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", px: 3 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}>
              <CheckCircleOutline sx={{ fontSize: 28, color: "#2e7d32" }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: T.text, fontSize: "0.85rem", mb: 0.5 }}>
              No DTR issues this period
            </Typography>
            <Typography sx={{ color: T.muted, fontSize: "0.75rem", maxWidth: 240 }}>
              All scheduled days have complete time-in, time-out{"" /* and break punches where required */}, no unexplained absences.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Box sx={{ px: 0.5, pb: 0.5 }}>
              <Typography sx={{ fontSize: "0.72rem", color: T.muted }}>
                {issues.length} day{issues.length !== 1 ? "s" : ""} need attention. Unresolved days may be treated as unpaid absence in payroll — file a leave to cover them if applicable.
              </Typography>
            </Box>
            {issues.map((issue, idx) => {
              const meta = ISSUE_META[issue.type];
              const Icon = meta.icon;
              return (
                <Box key={`${issue.iso}-${issue.type}-${idx}`} sx={{
                  display: "flex", alignItems: "center", gap: 1, p: 1, borderRadius: "8px",
                  bgcolor: meta.bg, border: `1px solid ${meta.color}30`,
                }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: "6px", bgcolor: `${meta.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon sx={{ fontSize: 15, color: meta.color }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: meta.color }}>{meta.label}</Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: T.muted }}>{fmtDate(issue.iso)}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* ── FOOTER CTA ── */}
      {/* {!loading && issues.length > 0 && (
        <Box sx={{ px: 2, py: 1.25, borderTop: `1px solid ${T.divider}`, bgcolor: T.accentFaint, flexShrink: 0 }}>
          <Button
            fullWidth
            size="small"
            onClick={() => navigate("/leave-request-user")}
            sx={{
              textTransform: "none", fontWeight: 700, fontSize: "0.78rem", color: "#fff",
              bgcolor: T.accent, borderRadius: "8px", py: 0.75,
              "&:hover": { bgcolor: "#5a1d1d" },
            }}
          >
            File a Leave
          </Button>
        </Box>
      )} */}
    </Box>
  );
}