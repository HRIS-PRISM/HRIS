import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
} from "@mui/material";
import { CalendarMonth, ArrowBackIosNew, ArrowForwardIos } from "@mui/icons-material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import {
  fetchAttendanceCalendarMaps,
  postAttendanceDevicePreflightNoSync,
} from "./ATTENDANCE/attendanceLeaveIntegration";

const T = {
  accent: "#6d2323",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  muted: "#6b6b6b",
  text: "#1a1a1a",
  divider: "rgba(0,0,0,0.08)",
};

function toDateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toISODate(d) {
  const x = toDateOnly(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeParseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function expandHolidayDates(rawHoliday) {
  const start = safeParseDate(rawHoliday?.date_start || rawHoliday?.date);
  const end = safeParseDate(rawHoliday?.date_end || rawHoliday?.date);
  if (!start) return [];
  const s = toDateOnly(start);
  const e = toDateOnly(end || start);
  const out = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) out.push(toISODate(d));
  return out;
}

function empty(v) {
  return v == null || String(v).trim() === "";
}

function hasOfficialSchedule(row) {
  const offIn = row?.officialTimeIN;
  const offOut = row?.officialTimeOUT;
  return (
    !empty(offIn) &&
    !empty(offOut) &&
    String(offIn).trim() !== "00:00:00 AM" &&
    String(offOut).trim() !== "00:00:00 PM"
  );
}

function hasNoPunches(row) {
  const ti = row?.timeIN;
  const bi = row?.breaktimeIN;
  const bo = row?.breaktimeOUT;
  const to = row?.timeOUT;
  return empty(ti) && empty(bi) && empty(bo) && empty(to);
}

function normalizeRowDateKey(row) {
  const raw = row?.date;
  if (!raw) return "";
  return String(raw).split("T")[0];
}

function inferLeaveCode(leaveObj) {
  const raw =
    leaveObj?.leave_type ||
    leaveObj?.leaveType ||
    leaveObj?.type ||
    leaveObj?.leave ||
    "";
  const s = String(raw).toLowerCase();
  if (s.includes("sick")) return "SL";
  if (s.includes("vacation")) return "VL";
  if (s.includes("vl")) return "VL";
  if (s.includes("sl")) return "SL";
  return "VL";
}

export default function AttendanceCalendar({ employeeNumber, holidays = [] }) {
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [suspensionByDate, setSuspensionByDate] = useState({});
  const [leaveByDate, setLeaveByDate] = useState({});
  const [holidayByDateApi, setHolidayByDateApi] = useState({});

  const holidayByDate = useMemo(() => {
    const map = new Map();
    for (const h of holidays || []) {
      if ((h?.status || "").toLowerCase() !== "active") continue;
      const dates = expandHolidayDates(h);
      for (const iso of dates) {
        if (!map.has(iso)) map.set(iso, []);
        map.get(iso).push(h);
      }
    }
    return map;
  }, [holidays]);

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth(); // 0-based

  const monthLabel = useMemo(() => new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }), [year, month]);
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`, [today]);

  const scheduleLabel = "8:00 AM – 5:00 PM";

  const chipStyle = (bg, fg) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 22,
    borderRadius: "5px",
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: 1,
    bgcolor: bg,
    color: fg,
    userSelect: "none",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
  };

  const range = useMemo(() => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      startDate: toISODate(start),
      endDate: toISODate(end),
    };
  }, [year, month]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const emp = String(employeeNumber || "").trim();
      if (!emp) return;
      setLoading(true);
      try {
        const [deviceRows, maps] = await Promise.all([
          postAttendanceDevicePreflightNoSync({
            apiBaseUrl: API_BASE_URL,
            getAuthHeaders,
            personID: emp,
            startDate: range.startDate,
            endDate: range.endDate,
          }),
          fetchAttendanceCalendarMaps({
            apiBaseUrl: API_BASE_URL,
            getAuthHeaders,
            startDate: range.startDate,
            endDate: range.endDate,
            personId: emp,
          }),
        ]);
        if (cancelled) return;
        setAttendanceRows(Array.isArray(deviceRows) ? deviceRows : []);
        setSuspensionByDate(maps?.suspensionByDate || {});
        setLeaveByDate(maps?.leaveByDate || {});
        setHolidayByDateApi(maps?.holidayByDate || {});
      } catch {
        if (cancelled) return;
        setAttendanceRows([]);
        setSuspensionByDate({});
        setLeaveByDate({});
        setHolidayByDateApi({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [employeeNumber, range.startDate, range.endDate]);

  const attendanceByDate = useMemo(() => {
    const map = new Map();
    for (const r of Array.isArray(attendanceRows) ? attendanceRows : []) {
      const key = normalizeRowDateKey(r);
      if (!key) continue;
      map.set(key, r);
    }
    return map;
  }, [attendanceRows]);

  const getStatusForDate = (iso, dow) => {
    // Weekends first (same as preview)
    if (dow === 0) return { code: "SU", tt: "Weekend (Sunday)" };
    if (dow === 6) return { code: "SA", tt: "Weekend (Saturday)" };

    // Work suspension overlay
    if (suspensionByDate?.[iso]) return { code: "H", tt: "Work suspended" };

    // Holiday: prefer API map if present, else fallback to rawHolidays map
    if (holidayByDateApi?.[iso] || (holidayByDate.get(iso)?.length || 0) > 0) {
      const hs = holidayByDate.get(iso) || [];
      const tt =
        holidayByDateApi?.[iso]?.title ||
        holidayByDateApi?.[iso]?.description ||
        (hs.length === 1 ? (hs[0]?.title || hs[0]?.description || "Holiday") : hs.length > 1 ? `${hs.length} holidays` : "Holiday");
      return { code: "H", tt };
    }

    // Leave overlay
    if (leaveByDate?.[iso]) {
      const leaveObj = leaveByDate[iso];
      const code = inferLeaveCode(leaveObj);
      const tt = leaveObj?.reason || leaveObj?.leave_type || leaveObj?.leaveType || "On leave";
      return { code, tt };
    }

    // Attendance row
    const row = attendanceByDate.get(iso);
    if (!row) {
      // If we have an official schedule row but no punches, treat as Absent; otherwise blank.
      return { code: "A", tt: "Absent – no log found" };
    }

    if (hasOfficialSchedule(row) && hasNoPunches(row)) return { code: "A", tt: "Absent – no log found" };

    const late =
      Number(row?.hours || 0) > 0 ||
      Number(row?.minutes || 0) > 0 ||
      Number(row?.lateMinutes || 0) > 0 ||
      Number(row?.late || 0) > 0;
    if (late) return { code: "L", tt: `Late arrival · ${scheduleLabel}` };
    return { code: "P", tt: `Present · ${scheduleLabel}` };
  };

  return (
    <Box>
      <Box
        sx={{
          px: 2.5,
          py: 1.25,
          borderBottom: `1px solid ${T.divider}`,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          bgcolor: T.accentFaint,
          minHeight: 42,
        }}
      >
        <CalendarMonth sx={{ fontSize: 14, color: T.accent }} />
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: T.accent }}>
          My attendance
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Chip
          size="small"
          label={loading ? "Loading…" : scheduleLabel}
          sx={{
            height: 22,
            fontSize: "0.68rem",
            fontWeight: 700,
            color: T.muted,
            bgcolor: "#fff",
            border: `1px solid ${T.accentBorder}`,
          }}
        />
      </Box>

      <Box sx={{ px: 2, py: 1.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Tooltip title="Previous month" arrow>
              <IconButton
                size="small"
                onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
                sx={{ color: T.muted, border: `1px solid ${T.accentBorder}`, borderRadius: 1, p: "4px 10px", "&:hover": { bgcolor: T.accentFaint } }}
              >
                <ArrowBackIosNew sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: T.text, minWidth: 120, textAlign: "center" }}>
              {monthLabel}
            </Typography>
            <Tooltip title="Next month" arrow>
              <IconButton
                size="small"
                onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
                sx={{ color: T.muted, border: `1px solid ${T.accentBorder}`, borderRadius: 1, p: "4px 10px", "&:hover": { bgcolor: T.accentFaint } }}
              >
                <ArrowForwardIos sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ overflowX: "auto", border: `1px solid ${T.divider}`, borderRadius: 2 }}>
          <Table size="small" sx={{ minWidth: 620, borderCollapse: "collapse" }}>
            <TableHead>
              <TableRow sx={{ bgcolor: T.accent }}>
                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "11px",
                    whiteSpace: "nowrap",
                    borderRight: "1px solid rgba(255,255,255,0.15)",
                    textAlign: "left",
                    pl: 1.5,
                    minWidth: 160,
                  }}
                >
                  Employee
                </TableCell>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const date = new Date(year, month, d);
                  const dow = date.getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const isToday = `${year}-${month}-${d}` === todayKey;
                  const dayShort = ["Su", "M", "T", "W", "Th", "F", "Sa"][dow];
                  return (
                    <TableCell
                      key={d}
                      sx={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "11px",
                        textAlign: "center",
                        borderRight: "1px solid rgba(255,255,255,0.15)",
                        p: "6px 3px",
                        minWidth: 32,
                        bgcolor: isToday ? "#8B4545" : T.accent,
                      }}
                    >
                      <Typography sx={{ fontSize: "10px", lineHeight: 1.2, color: isWeekend ? "rgba(255,200,200,0.9)" : "rgba(255,255,255,0.85)" }}>
                        {dayShort}
                      </Typography>
                      <Typography sx={{ fontSize: "12px", fontWeight: 700, color: isWeekend ? "rgba(255,200,200,1)" : "#fff" }}>
                        {d}
                      </Typography>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              <TableRow sx={{ "&:nth-of-type(even)": { bgcolor: "rgba(109,35,35,0.025)" }, "&:hover": { bgcolor: "rgba(109,35,35,0.055)" } }}>
                <TableCell sx={{ borderRight: `1px solid ${T.divider}`, borderBottom: `1px solid ${T.divider}`, textAlign: "left", pl: 1.5, py: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "13px", color: T.text, lineHeight: 1.3 }}>
                    My attendance
                  </Typography>
                  <Typography sx={{ fontSize: "11px", color: T.muted }}>
                    {employeeNumber ? `Emp #: ${employeeNumber}` : ""}
                  </Typography>
                </TableCell>

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const date = new Date(year, month, d);
                  const dow = date.getDay();
                  const iso = toISODate(date);
                  const isToday = `${year}-${month}-${d}` === todayKey;
                  const { code, tt } = getStatusForDate(iso, dow);
                  const label = code;
                  const chip =
                    code === "P"
                      ? chipStyle("#dcfce7", "#166534")
                      : code === "A"
                        ? chipStyle("#fee2e2", "#991b1b")
                        : code === "VL"
                          ? chipStyle("#dbeafe", "#1e3a8a")
                          : code === "SL"
                            ? chipStyle("#fef9c3", "#854d0e")
                            : code === "SA" || code === "SU"
                              ? chipStyle("#f3f4f6", "#374151")
                              : code === "H"
                                ? chipStyle("#fde8d8", "#9a3412")
                                : code === "L"
                                  ? chipStyle("#fef3c7", "#92400e")
                                  : chipStyle("transparent", "transparent");

                  return (
                    <TableCell
                      key={d}
                      title={tt || undefined}
                      sx={{
                        borderRight: `1px solid ${T.divider}`,
                        borderBottom: `1px solid ${T.divider}`,
                        textAlign: "center",
                        verticalAlign: "middle",
                        py: 0.75,
                        bgcolor: isToday ? "rgba(109,35,35,0.04)" : "transparent",
                      }}
                    >
                      <Box sx={chip}>{label || "·"}</Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.25,
            mt: 1.25,
            p: 1,
            bgcolor: "rgba(0,0,0,0.03)",
            borderRadius: 1.5,
            border: `1px solid ${T.divider}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, fontSize: "11px", color: T.muted }}>
            <Box sx={chipStyle("#dcfce7", "#166534")}>P</Box> Present
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, fontSize: "11px", color: T.muted }}>
            <Box sx={chipStyle("#fee2e2", "#991b1b")}>A</Box> Absent
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, fontSize: "11px", color: T.muted }}>
            <Box sx={chipStyle("#dbeafe", "#1e3a8a")}>VL</Box> Vacation leave
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, fontSize: "11px", color: T.muted }}>
            <Box sx={chipStyle("#fef9c3", "#854d0e")}>SL</Box> Sick leave
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, fontSize: "11px", color: T.muted }}>
            <Box sx={chipStyle("#f3f4f6", "#374151")}>SA</Box> Saturday
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, fontSize: "11px", color: T.muted }}>
            <Box sx={chipStyle("#f3f4f6", "#374151")}>SU</Box> Sunday
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, fontSize: "11px", color: T.muted }}>
            <Box sx={chipStyle("#fde8d8", "#9a3412")}>H</Box> Holiday
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, fontSize: "11px", color: T.muted }}>
            <Box sx={chipStyle("#fef3c7", "#92400e")}>L</Box> Late
          </Box>
        </Box>

        <Divider sx={{ mt: 1.25, borderColor: T.divider }} />
        <Typography sx={{ mt: 1, fontSize: "0.72rem", color: T.muted }}>
          This now pulls month data using your existing attendance utilities: device preflight (punches) + calendar maps (leaves/holidays/suspensions).
        </Typography>
      </Box>
    </Box>
  );
}

