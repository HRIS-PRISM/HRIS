import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Box, Typography, Button, Skeleton, alpha,
} from "@mui/material";
import {
  Checklist as ChecklistIcon,
  AccessTime as AccessTimeIcon,
  BeachAccess as BeachAccessIcon,
  Receipt as ReceiptIcon,
  WorkHistory as WorkHistoryIcon,
  SupportAgent as SupportAgentIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  WarningAmber as WarningAmberIcon,
  HourglassEmpty as HourglassEmptyIcon,
  CancelOutlined as CancelOutlinedIcon,
  NoteAdd as NoteAddIcon,
} from "@mui/icons-material";
import API_BASE_URL from "../apiConfig";
import { getAuthHeaders } from "../utils/auth";
import useAttendanceRealtimeRefresh from "../hooks/useAttendanceRealtimeRefresh";

const T = {
  accent: "#6d2323",
  accentFaint: "rgba(109,35,35,0.06)",
  accentBorder: "rgba(109,35,35,0.14)",
  accentHover: "rgba(109,35,35,0.10)",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  faint: "#a0a0a0",
  divider: "rgba(0,0,0,0.08)",
};

const LEAVE_STATUS = {
  0: { label: "Pending", color: "#F57C00" },
  1: { label: "Sup. Approved", color: "#1565C0" },
  2: { label: "HR Approved", color: "#2E7D32" },
  3: { label: "Denied", color: "#C62828" },
  4: { label: "Cancelled", color: "#757575" },
};

const TICKET_STATUS = {
  new: { label: "New", color: "#F57C00" },
  read: { label: "Read", color: "#1565C0" },
  replied: { label: "Replied", color: "#1565C0" },
  on_process: { label: "In progress", color: "#6d2323" },
  resolved: { label: "Resolved", color: "#2E7D32" },
};

const toYmd = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const fmtTime = (val) => {
  if (val == null || val === "" || val === "00:00:00" || val === "0") return "—";
  const s = String(val).trim();
  if (!s) return "—";
  if (/am|pm/i.test(s)) return s;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    let h = Number(m[1]);
    const min = m[2];
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${min} ${ap}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return s;
};

const formatLeaveDates = (leaveDate) => {
  const parts = String(leaveDate || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return { label: "—", count: 0, dates: [] };
  const dates = parts
    .map((p) => new Date(p))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);
  if (!dates.length) return { label: parts[0], count: parts.length, dates: parts };
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (dates.length === 1) return { label: fmt(dates[0]), count: 1, dates: parts };
  return { label: `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`, count: dates.length, dates: parts };
};

const StatusPill = ({ label, color }) => (
  <Box sx={{
    display: "inline-flex", alignItems: "center", px: 0.7, py: 0.12, flexShrink: 0,
    borderRadius: "99px", fontSize: "0.55rem", fontWeight: 700, whiteSpace: "nowrap",
    bgcolor: `${color}18`, color, border: `1px solid ${color}33`,
  }}>
    {label}
  </Box>
);

const cardShadowRest = [
  "0 1px 2px rgba(15,23,42,0.04)",
  "0 4px 12px rgba(15,23,42,0.06)",
  "0 14px 28px rgba(15,23,42,0.07)",
].join(", ");
const cardShadowHover = [
  "0 0 0 1.5px rgba(109,35,35,0.22)",
  "0 6px 16px rgba(15,23,42,0.08)",
  "0 20px 40px rgba(15,23,42,0.12)",
].join(", ");

const WidgetCard = ({ icon: Icon, title, children, actionLabel, onAction, sx = {}, dense = false, fit = false }) => (
  <Box sx={{
    height: "100%", minHeight: 0, display: "flex", flexDirection: "column",
    borderRadius: "16px", border: "0 !important", outline: "none", bgcolor: "#fff",
    boxShadow: `${cardShadowRest} !important`,
    overflow: "hidden",
    transition: "box-shadow 0.22s ease, transform 0.22s ease",
    willChange: "transform, box-shadow",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: `${cardShadowHover} !important`,
    },
    ...sx,
  }}>
    <Box sx={{
      px: dense ? 1.5 : 1.75, py: dense ? 0.85 : 1, borderBottom: `1px solid ${T.divider}`,
      bgcolor: "#fff", display: "flex", alignItems: "center", gap: 1, flexShrink: 0, minHeight: dense ? 38 : 44,
    }}>
      {Icon && (
        <Box sx={{ width: dense ? 22 : 26, height: dense ? 22 : 26, borderRadius: "8px", bgcolor: T.accentFaint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon sx={{ fontSize: dense ? 13 : 14, color: T.accent }} />
        </Box>
      )}
      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, flex: 1, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{title}</Typography>
      {onAction && (
        <Button
          size="small"
          onClick={onAction}
          endIcon={<ArrowForwardIcon sx={{ fontSize: "12px !important" }} />}
          sx={{
            minWidth: 0, px: 0.75, py: 0, height: 24, textTransform: "none",
            fontSize: "0.64rem", fontWeight: 700, color: T.accent, borderRadius: "8px",
            "&:hover": { bgcolor: T.accentHover },
          }}
        >
          {actionLabel || "Open"}
        </Button>
      )}
    </Box>
    <Box sx={{
      p: dense ? 1 : 1.1, flex: 1, minHeight: 0,
      overflow: fit || dense ? "hidden" : "auto",
      display: "flex", flexDirection: "column",
      "&::-webkit-scrollbar": { width: 3 },
      "&::-webkit-scrollbar-thumb": { bgcolor: alpha(T.accent, 0.3), borderRadius: 2 },
    }}>
      {children}
    </Box>
  </Box>
);

const RowItem = ({ icon, title, meta, right, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex", alignItems: "center", gap: 1, py: 0.7, px: 0.6,
      borderRadius: "10px", cursor: onClick ? "pointer" : "default",
      "&:hover": onClick ? { bgcolor: T.accentFaint } : {},
    }}
  >
    <Box sx={{
      width: 28, height: 28, borderRadius: "8px", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      bgcolor: T.accentFaint, color: T.accent,
    }}>
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography noWrap sx={{ fontSize: "0.78rem", fontWeight: 650, color: T.text, lineHeight: 1.3 }}>{title}</Typography>
      {meta && <Typography noWrap sx={{ fontSize: "0.64rem", color: T.muted, lineHeight: 1.3 }}>{meta}</Typography>}
    </Box>
    {right}
  </Box>
);

const EmptyLine = ({ text }) => (
  <Box sx={{
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    flex: 1, minHeight: 100, textAlign: "center", px: 2, gap: 1,
  }}>
    <NoteAddIcon sx={{ fontSize: 48, color: "rgba(0,0,0,0.14)" }} />
    <Typography sx={{ fontSize: "0.72rem", color: T.muted, fontWeight: 600 }}>{text}</Typography>
  </Box>
);

const LoadingBlock = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6, py: 0.25 }}>
    <Skeleton variant="rounded" height={22} />
    <Skeleton variant="rounded" height={22} />
    <Skeleton variant="rounded" height={22} />
  </Box>
);

/** Prominent Today card for the top row (replaces mini calendar). */
export function EmployeeTodayCard({ employeeNumber, leaveCredits = [] }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayRow, setTodayRow] = useState(null);
  const [todayDeviceRows, setTodayDeviceRows] = useState([]);
  const [todayOfficialSchedule, setTodayOfficialSchedule] = useState(null);

  const fetchToday = useCallback(async () => {
    if (!employeeNumber) return;
    try {
      const today = toYmd();
      const [attendanceRes, deviceRes, officialTimeRes] = await Promise.allSettled([
        axios.post(
          `${API_BASE_URL}/attendance/api/view-attendance`,
          { personID: employeeNumber, startDate: today, endDate: today },
          getAuthHeaders(),
        ),
        // Raw device taps are sourced directly from AttendanceRecordInfo.
        axios.post(
          `${API_BASE_URL}/attendance/api/attendance-raw-batch`,
          { personIDs: [employeeNumber], startDate: today, endDate: today },
          getAuthHeaders(),
        ),
        axios.get(
          `${API_BASE_URL}/officialtimetable/${employeeNumber}`,
          { ...getAuthHeaders(), params: { date: today, skipAudit: true } },
        ),
      ]);
      const rows = attendanceRes.status === "fulfilled" && Array.isArray(attendanceRes.value.data)
        ? attendanceRes.value.data
        : [];
      setTodayRow(rows[0] || null);
      const deviceRows = deviceRes.status === "fulfilled" && Array.isArray(deviceRes.value.data)
        ? deviceRes.value.data
        : [];
      setTodayDeviceRows(deviceRows);
      const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(`${today}T00:00:00`));
      const officialRows = officialTimeRes.status === "fulfilled" && Array.isArray(officialTimeRes.value.data)
        ? officialTimeRes.value.data
        : [];
      setTodayOfficialSchedule(
        officialRows.find((row) => String(row.day || "").toLowerCase() === dayName.toLowerCase()) || null,
      );
    } catch {
      setTodayRow(null);
      setTodayDeviceRows([]);
      setTodayOfficialSchedule(null);
    } finally {
      setLoading(false);
    }
  }, [employeeNumber]);

  useEffect(() => {
    setLoading(true);
    fetchToday();
  }, [fetchToday]);

  // Refresh immediately after a punch, attendance edit, or schedule change.
  useAttendanceRealtimeRefresh(fetchToday, {
    personId: employeeNumber,
    matchMode: "loose",
  });

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchToday();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [fetchToday]);

  const vl = leaveCredits.find((l) => /vacation|^vl$/i.test(l.name || l.code || ""));
  const sl = leaveCredits.find((l) => /sick|^sl$/i.test(l.name || l.code || ""));

  const orderedDeviceRows = [...todayDeviceRows].sort(
    (a, b) => Number(a.AttendanceDateTime) - Number(b.AttendanceDateTime),
  );
  const deviceTime = (state, latest = false) => {
    const matchingRows = orderedDeviceRows.filter((row) => String(row.AttendanceState) === String(state));
    return (latest ? matchingRows.at(-1) : matchingRows[0])?.Time;
  };
  const timeIn = deviceTime(1);
  const breaktimeIn = deviceTime(2);
  const breaktimeOut = deviceTime(3, true);
  const timeOut = deviceTime(4, true);
  const officialTimeIn = todayRow?.officialTimeIN || todayRow?.OfficialTimeIN
    || todayOfficialSchedule?.officialTimeIN || todayOfficialSchedule?.OfficialTimeIN;
  const officialTimeOut = todayRow?.officialTimeOUT || todayRow?.OfficialTimeOUT
    || todayOfficialSchedule?.officialTimeOUT || todayOfficialSchedule?.OfficialTimeOUT;
  const officialTimeLabel = officialTimeIn || officialTimeOut
    ? `${fmtTime(officialTimeIn)} – ${fmtTime(officialTimeOut)}`
    : "No official time assigned";

  const todayStatusLabel = (() => {
    if (!timeIn) return "No record yet";
    if (timeOut) return "Complete";
    if (timeIn) return "Clocked in";
    return "Awaiting time-in";
  })();

  const statusColor = todayStatusLabel === "Complete" ? "#2e7d32"
    : todayStatusLabel === "Clocked in" ? "#1565c0"
      : T.accent;

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  if (!employeeNumber) return null;

  return (
    <WidgetCard
      dense
      fit
      icon={AccessTimeIcon}
      title="Today"
      actionLabel="Attendance"
      onAction={() => navigate("/my-attendance")}
      sx={{ width: "100%" }}
    >
      {loading ? <LoadingBlock /> : (
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 0.6 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Typography sx={{ fontSize: "0.58rem", color: T.muted, fontWeight: 600 }}>{dateLabel}</Typography>
            <StatusPill label={todayStatusLabel} color={statusColor} />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.55, flex: 1, minHeight: 0 }}>
            {[
              { label: "Time in", value: fmtTime(timeIn) },
              { label: "Breaktime in", value: fmtTime(breaktimeOut) },
              { label: "Breaktime out", value: fmtTime(breaktimeIn) },
              { label: "Time out", value: fmtTime(timeOut) },
            ].map((c) => (
              <Box key={c.label} sx={{
                px: 0.85, py: 0.55, borderRadius: "8px", bgcolor: "#f7f5f4",
                border: "1px solid rgba(0,0,0,0.05)",
                display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0,
              }}>
                <Typography sx={{ fontSize: "0.5rem", fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.1 }}>{c.label}</Typography>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: T.text, mt: 0.2, lineHeight: 1.15 }}>{c.value}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ px: 0.85, py: 0.5, borderRadius: "8px", bgcolor: T.accentFaint, border: `1px solid ${T.accentBorder}`, flexShrink: 0 }}>
            <Typography sx={{ fontSize: "0.5rem", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.1 }}>Official time</Typography>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: T.text, mt: 0.18, lineHeight: 1.15 }}>{officialTimeLabel}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexShrink: 0 }}>
            <Typography noWrap sx={{ fontSize: "0.54rem", color: T.muted }}>
              {vl || sl
                ? `Leave left · ${vl ? `VL ${Number(vl.currRemaining).toFixed(1)}` : ""}${vl && sl ? " · " : ""}${sl ? `SL ${Number(sl.currRemaining).toFixed(1)}` : ""}`
                : "Tap Attendance for full day view"}
            </Typography>
            <Box
              onClick={() => navigate("/daily_time_record")}
              sx={{ fontSize: "0.54rem", fontWeight: 800, color: T.accent, cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}
            >
              Open DTR
            </Box>
          </Box>
        </Box>
      )}
    </WidgetCard>
  );
}

/**
 * Compact employee essentials for the fixed (non-scrolling) Home viewport.
 */
export default function EmployeeHomeWidgets({
  employeeNumber,
  leaveCredits = [],
  payrollData = null,
  payslipMonthName = "",
  unreadNotifCount = 0,
  holidays = [],
  suspensions = [],
  embedded = false,
  hideToday = false, // kept for callers; Today lives in top row via EmployeeTodayCard
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [todayRow, setTodayRow] = useState(null);
  const [monthOtRows, setMonthOtRows] = useState([]);
  const [scBalance, setScBalance] = useState(null);
  const [tickets, setTickets] = useState([]);

  const fetchAll = useCallback(async () => {
    if (!employeeNumber) return;
    setLoading(true);
    const auth = getAuthHeaders();
    const today = toYmd();
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthEnd = toYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    const results = await Promise.allSettled([
      axios.get(`${API_BASE_URL}/leaveRoute/leave_request/${employeeNumber}`, auth),
      axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { personID: employeeNumber, startDate: today, endDate: today },
        auth,
      ),
      axios.post(
        `${API_BASE_URL}/attendance/api/view-attendance`,
        { personID: employeeNumber, startDate: monthStart, endDate: monthEnd },
        auth,
      ),
      axios.get(`${API_BASE_URL}/api/earnings/sc/${employeeNumber}/balance`, auth),
      axios.get(`${API_BASE_URL}/api/contact-us?limit=20`, auth),
    ]);

    const [leaveRes, todayRes, monthRes, scRes, ticketRes] = results;

    if (leaveRes.status === "fulfilled") {
      const list = Array.isArray(leaveRes.value.data) ? leaveRes.value.data : [];
      setLeaveRequests(list.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    } else setLeaveRequests([]);

    if (todayRes.status === "fulfilled") {
      const rows = Array.isArray(todayRes.value.data) ? todayRes.value.data : [];
      setTodayRow(rows[0] || null);
    } else setTodayRow(null);

    if (monthRes.status === "fulfilled") {
      const rows = Array.isArray(monthRes.value.data) ? monthRes.value.data : [];
      setMonthOtRows(rows.filter((r) => String(r.specialType || "").toUpperCase() === "OVERTIME"));
    } else setMonthOtRows([]);

    if (scRes.status === "fulfilled") setScBalance(scRes.value.data || null);
    else setScBalance(null);

    if (ticketRes.status === "fulfilled") {
      const raw = ticketRes.value.data?.data || ticketRes.value.data || [];
      const list = Array.isArray(raw) ? raw : [];
      setTickets(
        list
          .filter((t) => String(t.employee_number) === String(employeeNumber))
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
      );
    } else setTickets([]);

    setLoading(false);
  }, [employeeNumber]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pendingLeaves = useMemo(
    () => leaveRequests.filter((r) => String(r.status) === "0" || String(r.status) === "1"),
    [leaveRequests],
  );

  const openTickets = useMemo(
    () => tickets.filter((t) => !["resolved"].includes(String(t.status || "").toLowerCase())),
    [tickets],
  );

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 14);
    const items = [];

    (holidays || []).forEach((h) => {
      if ((h.status || "").toLowerCase() === "inactive") return;
      const raw = h.date_start || h.date;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);
      if (d < today || d > limit) return;
      items.push({ kind: "Holiday", title: h.title || h.description || h.name || "Holiday", date: d, color: "#1565c0" });
    });

    (suspensions || []).forEach((s) => {
      const raw = s.date_start || s.date;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);
      if (d < today || d > limit) return;
      items.push({ kind: "Suspension", title: s.title || "Work suspension", date: d, color: "#c62828" });
    });

    leaveRequests
      .filter((r) => ["1", "2"].includes(String(r.status)))
      .forEach((r) => {
        const { dates } = formatLeaveDates(r.leave_date);
        dates.forEach((raw) => {
          const d = new Date(raw);
          if (Number.isNaN(d.getTime())) return;
          d.setHours(0, 0, 0, 0);
          if (d < today || d > limit) return;
          items.push({ kind: "Leave", title: r.leave_description || r.leave_code || "Leave", date: d, color: "#2e7d32" });
        });
      });

    const seen = new Set();
    return items
      .filter((it) => {
        const key = `${it.kind}|${it.title}|${toYmd(it.date)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.date - b.date)
      .slice(0, 4);
  }, [holidays, suspensions, leaveRequests]);

  const actionItems = useMemo(() => {
    const items = [];
    pendingLeaves.slice(0, 2).forEach((r) => {
      const { label, count } = formatLeaveDates(r.leave_date);
      items.push({
        icon: <HourglassEmptyIcon sx={{ fontSize: 13 }} />,
        title: r.leave_description || r.leave_code,
        meta: `${LEAVE_STATUS[r.status]?.label || "Pending"} · ${label} (${count}d)`,
        path: "/leave-request-user",
      });
    });
    openTickets.slice(0, 2).forEach((t) => {
      items.push({
        icon: <SupportAgentIcon sx={{ fontSize: 13 }} />,
        title: t.subject || "Support ticket",
        meta: `#${t.id} · ${TICKET_STATUS[t.status]?.label || t.status || "Open"}`,
        path: "/settings",
        state: { section: "contact", ticketId: t.id },
      });
    });
    if (todayRow?.timeIN && (!todayRow.timeOUT || String(todayRow.timeOUT) === "00:00:00")) {
      items.unshift({
        icon: <WarningAmberIcon sx={{ fontSize: 13 }} />,
        title: "No time-out yet",
        meta: `In ${fmtTime(todayRow.timeIN)}`,
        path: "/daily_time_record",
      });
    }
    if (payrollData) {
      items.push({
        icon: <ReceiptIcon sx={{ fontSize: 13 }} />,
        title: `${payslipMonthName || "Payslip"} ready`,
        meta: "View 1st / 2nd quincena",
        path: "/payslip",
      });
    }
    if (unreadNotifCount > 0) {
      items.push({
        icon: <ChecklistIcon sx={{ fontSize: 13 }} />,
        title: `${unreadNotifCount} unread`,
        meta: "Open notifications",
      });
    }
    return items.slice(0, 4);
  }, [pendingLeaves, openTickets, todayRow, payrollData, payslipMonthName, unreadNotifCount]);

  const scTotal = scBalance?.totalRemaining != null
    ? Number(scBalance.totalRemaining)
    : (scBalance?.balances || []).reduce((s, b) => s + Number(b.remaining_hours || 0), 0);

  if (!employeeNumber) return null;

  return (
    <Box sx={{ width: "100%", height: "100%", minHeight: 0 }}>
      <WidgetCard
        icon={BeachAccessIcon}
        title="Leave Requests"
        actionLabel="Open"
        onAction={() => navigate("/leave-request-user")}
        sx={{ height: "100%" }}
      >
        {loading ? <LoadingBlock /> : leaveRequests.length === 0 ? (
          <EmptyLine text="No leave requests yet." />
        ) : leaveRequests.slice(0, 8).map((r) => {
          const st = LEAVE_STATUS[r.status] || LEAVE_STATUS[0];
          const { label, count } = formatLeaveDates(r.leave_date);
          const Icon =
            String(r.status) === "3" ? CancelOutlinedIcon
              : String(r.status) === "2" || String(r.status) === "1" ? CheckCircleOutlineIcon
                : HourglassEmptyIcon;
          return (
            <RowItem
              key={r.id}
              icon={<Icon sx={{ fontSize: 15 }} />}
              title={r.leave_description || r.leave_code}
              meta={`${label} · ${count} day${count !== 1 ? "s" : ""}`}
              right={<StatusPill label={st.label} color={st.color} />}
            />
          );
        })}
      </WidgetCard>
    </Box>
  );
}
