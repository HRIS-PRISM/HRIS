import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, IconButton, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import { CalendarMonth, ArrowBackIosNew, ArrowForwardIos, AccessTime } from "@mui/icons-material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { fetchAttendanceCalendarMaps } from "./ATTENDANCE/attendanceLeaveIntegration";

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

const punchDateToISO = (raw) => {
  const p = String(raw || "").split("/");
  return p.length === 3 ? `${p[2]}-${p[0].padStart(2, "0")}-${p[1].padStart(2, "0")}` : "";
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

/* ─── chip palette ─────────────────────────────────────────────────── */
const CHIPS = {
  P:  { bg: "#dcfce7", fg: "#166534", label: "Present" },
  A:  { bg: "#fee2e2", fg: "#991b1b", label: "Absent" },
  VL: { bg: "#dbeafe", fg: "#1e3a8a", label: "Vacation leave" },
  SL: { bg: "#fef9c3", fg: "#854d0e", label: "Sick leave" },
  SA: { bg: "#f1f5f9", fg: "#64748b", label: "Saturday" },
  SU: { bg: "#f1f5f9", fg: "#64748b", label: "Sunday" },
  H:  { bg: "#fde8d8", fg: "#9a3412", label: "Holiday" },
  L:  { bg: "#fef3c7", fg: "#92400e", label: "Late" },
};

const Chip = ({ code }) => {
  if (!code) return <Box sx={{ width: 34, height: 28 }} />;
  const c = CHIPS[code] || {};
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 34, height: 28, borderRadius: "5px",
      fontSize: "13px", fontWeight: 800, lineHeight: 1,
      bgcolor: c.bg, color: c.fg, userSelect: "none", flexShrink: 0,
    }}>
      {code}
    </Box>
  );
};

/* ─── component ────────────────────────────────────────────────────── */
export default function AttendanceCalendar({ employeeNumber, holidays = [] }) {
  const [cursor,     setCursor]     = useState(() => new Date());
  const [loading,    setLoading]    = useState(false);
  const [punches,    setPunches]    = useState([]);
  const [suspension, setSuspension] = useState({});
  const [leaves,     setLeaves]     = useState({});
  const [apiHols,    setApiHols]    = useState({});

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

  /* fetch */
  useEffect(() => {
    let dead = false;
    (async () => {
      const emp = String(employeeNumber || "").trim();
      if (!emp) return;
      setLoading(true);
      setPunches([]);
      try {
        const h = getAuthHeaders().headers;
        const s = new Date(range.startDate); s.setDate(s.getDate() - 1);
        const e = new Date(range.endDate);   e.setDate(e.getDate() + 1);

        const [pr, maps] = await Promise.all([
          axios.post(`${API_BASE_URL}/attendance/api/attendance`, {
            personID: emp,
            startDate: s.toISOString().substring(0, 10),
            endDate:   e.toISOString().substring(0, 10),
          }, { headers: h }),
          fetchAttendanceCalendarMaps({
            apiBaseUrl: API_BASE_URL, getAuthHeaders,
            startDate: range.startDate, endDate: range.endDate, personId: emp,
          }),
        ]);

        if (dead) return;
        const filtered = (Array.isArray(pr.data) ? pr.data : []).filter(r => {
          const iso = punchDateToISO(r.Date);
          return iso >= range.startDate && iso <= range.endDate;
        });
        setPunches(filtered);
        setSuspension(maps?.suspensionByDate || {});
        setLeaves(maps?.leaveByDate         || {});
        setApiHols(maps?.holidayByDate      || {});
      } catch { if (!dead) setPunches([]); }
      finally  { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [employeeNumber, range.startDate, range.endDate]);

  /* punch map */
  const punchMap = useMemo(() => {
    const m = new Map();
    punches.forEach(r => {
      const iso = punchDateToISO(r.Date);
      if (!iso) return;
      if (!m.has(iso)) m.set(iso, []);
      m.get(iso).push(r);
    });
    return m;
  }, [punches]);

  const getCode = (iso, dow) => {
    if (dow === 0) return "SU";
    if (dow === 6) return "SA";
    if (suspension?.[iso]) return "H";
    if (apiHols?.[iso] || propHolMap.has(iso)) return "H";
    if (leaves?.[iso]) return inferLeaveCode(leaves[iso]);
    const ps = punchMap.get(iso);
    if (!ps?.length) return "";
    const tin = ps.find(p => p.AttendanceState === 1);
    if (!tin) return "P";
    const [hh, mm] = (tin.Time || "").split(":").map(Number);
    return !isNaN(hh) && (hh > 8 || (hh === 8 && mm > 0)) ? "L" : "P";
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
        width: 26, height: 26, borderRadius: "5px",
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
      borderRadius: "12px",
      border: `2px solid ${T.accentBorder}`,
      boxShadow: "0 1px 6px rgba(109,35,35,0.10)",
      overflow: "hidden",
    }}>

      {/* ── HEADER ── */}
      <Box sx={{
        px: 2.5, py: 1.4,
        display: "flex", alignItems: "center", gap: 1.5,
        bgcolor: T.accentFaint,
        borderBottom: `1.5px solid ${T.accentBorder}`,
        flexShrink: 0,
      }}>
        <CalendarMonth sx={{ fontSize: 16, color: T.accent, flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: T.accent, lineHeight: 1, flexShrink: 0 }}>
          My attendance
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {navBtn(-1)}
          <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text, minWidth: 84, textAlign: "center" }}>
            {loading ? "…" : monthLabel}
          </Typography>
          {navBtn(1)}
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box sx={{
          display: "flex", alignItems: "center", gap: 0.5,
          px: 1.2, py: 0.5, borderRadius: "20px",
          bgcolor: T.surface, border: `1px solid ${T.accentBorder}`,
          flexShrink: 0,
        }}>
          <AccessTime sx={{ fontSize: 12, color: T.accent }} />
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.accent }}>
            8:00 AM – 5:00 PM
          </Typography>
        </Box>
      </Box>

      {/* ── TABLE ── */}
      <Box sx={{
        overflowX: "auto",
        overflowY: "hidden",
        flexShrink: 0,
        "&::-webkit-scrollbar":       { height: 6 },
        "&::-webkit-scrollbar-thumb": { bgcolor: T.accent, borderRadius: 2 },
        "&::-webkit-scrollbar-track": { bgcolor: T.accentFaint },
      }}>
        <Table size="small" sx={{ borderCollapse: "collapse", tableLayout: "fixed", "& th,& td": { boxSizing: "border-box" } }}>
          <colgroup>
            <col style={{ width: 155 }} />
            {days.map(({ d }) => <col key={d} style={{ width: 38 }} />)}
          </colgroup>

          <TableHead>
            <TableRow>
              <TableCell sx={{
                bgcolor: T.accent, color: "#fff", fontWeight: 700, fontSize: "13px",
                pl: 1.5, py: 1,
                borderRight: "1px solid rgba(255,255,255,0.14)",
                position: "sticky", left: 0, zIndex: 3,
              }}>
                Employee
              </TableCell>

              {days.map(({ d, dow, isToday, isWeekend }) => (
                <TableCell key={d} sx={{
                  bgcolor: isToday ? "#8B4545" : T.accent,
                  color: "#fff", textAlign: "center",
                  p: "5px 2px", lineHeight: 1.1,
                  borderRight: "1px solid rgba(255,255,255,0.10)",
                }}>
                  <Box sx={{ fontSize: "10px", color: isWeekend ? "rgba(255,200,200,0.8)" : "rgba(255,255,255,0.7)" }}>{["Su","M","T","W","Th","F","Sa"][dow]}</Box>
                  <Box sx={{ fontSize: "13px", color: isWeekend ? "rgba(255,200,200,1)" : "#fff", fontWeight: 800 }}>{d}</Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            <TableRow sx={{ "&:hover": { bgcolor: T.accentFaint }, transition: "background 0.12s" }}>
              <TableCell sx={{
                pl: 1.5, py: 1.75,
                borderRight: `1px solid ${T.divider}`,
                position: "sticky", left: 0, bgcolor: T.surface, zIndex: 1,
              }}>
                <Typography sx={{ fontWeight: 800, fontSize: "15px", color: T.text, lineHeight: 1.3 }}>
                  My attendance
                </Typography>
                {employeeNumber && (
                  <Typography sx={{ fontSize: "12px", color: T.faint }}>#{employeeNumber}</Typography>
                )}
              </TableCell>

              {days.map(({ d, dow, iso, isToday }) => (
                <TableCell key={d}
                  title={CHIPS[getCode(iso, dow)]?.label}
                  sx={{
                    textAlign: "center", verticalAlign: "middle", p: "10px 3px",
                    borderRight: `1px solid ${T.divider}`,
                    bgcolor: isToday ? "rgba(109,35,35,0.04)" : "transparent",
                  }}
                >
                  <Chip code={getCode(iso, dow)} />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      {/* ── LEGEND ── */}
      <Box sx={{
        px: 2.5, py: 1.25,
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 14px",
        borderTop: `1px solid ${T.divider}`,
        bgcolor: T.surface, flexShrink: 0,
      }}>
        {Object.entries(CHIPS).map(([code, { bg, fg, label }]) => (
          <Box key={code} sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Box sx={{
              width: 20, height: 17, borderRadius: "3px",
              bgcolor: bg, color: fg, fontSize: "9px", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{code}</Box>
            <Typography sx={{ fontSize: "0.68rem", color: T.muted, lineHeight: 1, whiteSpace: "nowrap" }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── FOOTER NOTE ── */}
      <Box sx={{
        px: 2.5, py: 1,
        borderTop: `1px solid ${T.divider}`,
        bgcolor: T.accentFaint, flexShrink: 0,
      }}>
        <Typography sx={{ fontSize: "0.63rem", color: T.faint, lineHeight: 1.4 }}>
          Blank cells = no biometric punch recorded — not counted as absent.
        </Typography>
      </Box>

    </Box>
  );
}