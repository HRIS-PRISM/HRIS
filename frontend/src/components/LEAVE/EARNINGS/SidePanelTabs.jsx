import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Box, Typography, CircularProgress } from "@mui/material";
import API_BASE_URL from "../../../apiConfig";

const T = {
  accent: "#6d2323",
  line: "rgba(0,0,0,0.09)",
  soft: "#faf6f6",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  ok: "#2e7d32",
  okBg: "rgba(46,125,50,0.1)",
  poppins: "'Poppins', sans-serif",
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const FilterChip = ({ on, onClick, children }) => (
  <Box
    component="button"
    type="button"
    aria-pressed={on}
    onClick={onClick}
    sx={{ all: "unset", cursor: "pointer", fontSize: "0.68rem", fontFamily: T.poppins, px: 1.1, py: "1px", borderRadius: 99, border: `1px solid ${on ? T.text : T.line}`, bgcolor: on ? T.text : "#fff", color: on ? "#fff" : T.muted, "&:focus-visible": { outline: `2px solid ${T.accent}` } }}
  >
    {children}
  </Box>
);

const fmtStamp = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
};
const fmtDay = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(5, 10);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Read-only attendance_result rows for the employee and month (absence / tardiness coverage log). */
const AttendanceLogList = ({ employeeNumber, year, month, hoursPerDay = 8, refreshKey, onCount }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    if (!employeeNumber) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/leave-salary-shortfall`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { year, month, employeeNumber },
      });
      setRows(Array.isArray(data?.attendanceResults) ? data.attendanceResults : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [employeeNumber, year, month]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => {
    onCount?.(rows.length);
  }, [rows.length, onCount]);

  const kindOf = (r) => (String(r.source_type || "").toUpperCase().includes("TARD") ? "Tardiness" : "Absent");
  const shown = useMemo(() => (filter === "All" ? rows : rows.filter((r) => kindOf(r) === filter)), [rows, filter]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      <Box sx={{ px: 1.5, pt: 1.1, display: "flex", gap: 0.6, flexWrap: "wrap" }}>
        {["All", "Tardiness", "Absent"].map((f) => (
          <FilterChip key={f} on={filter === f} onClick={() => setFilter(f)}>{f}</FilterChip>
        ))}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: "10px 12px 14px", display: "grid", gap: 1, alignContent: "start" }}>
        {loading ? (
          <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={18} sx={{ color: T.accent }} />
          </Box>
        ) : shown.length === 0 ? (
          <Typography sx={{ textAlign: "center", color: T.muted, py: 3, fontSize: "0.74rem", fontFamily: T.poppins }}>
            No attendance logs for this month.
          </Typography>
        ) : (
          shown.map((r) => {
            const kind = kindOf(r);
            const days = toNum(r.leave_hours_used || r.original_hours) / hoursPerDay;
            const status = String(r.status || "").replace(/_/g, " ").toLowerCase();
            return (
              <Box key={r.id} sx={{ border: `1px solid ${T.line}`, borderRadius: "12px", bgcolor: "#fff", p: "9px 12px", fontFamily: T.poppins }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.9, flexWrap: "wrap" }}>
                  <Typography component="b" sx={{ fontSize: "0.74rem", fontWeight: 700, fontFamily: T.poppins }}>#{r.id}</Typography>
                  <Box component="span" sx={{ fontSize: "0.64rem", fontWeight: 600, px: 1, borderRadius: 99, ...(kind === "Absent" ? { bgcolor: "#fdeaed", color: "#c4324a" } : { bgcolor: "#fdebc8", color: "#8a5d06" }) }}>
                    {kind}
                  </Box>
                  {r.leave_used && (
                    <Typography component="span" sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#185FA5", fontFamily: T.poppins }}>{r.leave_used}</Typography>
                  )}
                  <Typography component="b" sx={{ ml: "auto", fontSize: "0.8rem", fontWeight: 700, color: T.ok, fontFamily: T.poppins, fontVariantNumeric: "tabular-nums" }}>
                    {days.toFixed(3)} d
                  </Typography>
                </Box>
                {r.remarks && <Typography sx={{ fontSize: "0.74rem", my: "3px", fontFamily: T.poppins }}>{r.remarks}</Typography>}
                <Typography sx={{ fontSize: "0.66rem", color: T.muted, fontFamily: T.poppins }}>
                  For {fmtDay(r.result_date)} · paid {toNum(r.paid_hours).toFixed(3)} h{status ? ` · ${status}` : ""}{r.processed_at ? ` · ${fmtStamp(r.processed_at)}` : ""}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

/**
 * Right-hand panel: Records | Logs | Monthly | Policy.
 * `records`, `monthly` and `policy` are rendered by the page; Logs is loaded here.
 */
export const SidePanelTabs = ({ records, recordsCount, monthly, policy, employeeNumber, year, month, hoursPerDay, refreshKey }) => {
  const [tab, setTab] = useState("records");
  const [logCount, setLogCount] = useState(0);

  const tabs = [
    { id: "records", label: "Records", count: recordsCount },
    { id: "logs", label: "Logs", count: logCount },
    { id: "monthly", label: "Monthly" },
    { id: "policy", label: "Policy" },
  ];

  return (
    <Box
      component="aside"
      aria-label="Records and logs"
      sx={{ border: `1px solid ${T.line}`, borderRadius: "16px", bgcolor: T.soft, display: "flex", flexDirection: "column", minHeight: 0, height: "100%", overflow: "hidden" }}
    >
      <Box role="tablist" sx={{ display: "flex", borderBottom: `1px solid ${T.line}`, bgcolor: "#fff", flexShrink: 0 }}>
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <Box
              key={t.id}
              component="button"
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              sx={{ all: "unset", flex: 1, textAlign: "center", py: "10px", px: "6px", fontWeight: 600, fontSize: "0.74rem", fontFamily: T.poppins, cursor: "pointer", color: on ? T.accent : T.muted, borderBottom: `3px solid ${on ? T.accent : "transparent"}`, "&:focus-visible": { outline: `2px solid ${T.accent}`, outlineOffset: -2 } }}
            >
              {t.label}
              {t.count != null && (
                <Box component="span" sx={{ ml: 0.6, px: 0.8, borderRadius: 99, bgcolor: T.line, color: T.text, fontSize: "0.62rem" }}>{t.count}</Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Records stays mounted so its filters and list are kept when switching tabs. */}
      <Box role="tabpanel" sx={{ display: tab === "records" ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {records}
      </Box>
      <Box role="tabpanel" sx={{ display: tab === "logs" ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <AttendanceLogList
          employeeNumber={employeeNumber}
          year={year}
          month={month}
          hoursPerDay={hoursPerDay}
          refreshKey={refreshKey}
          onCount={setLogCount}
        />
      </Box>
      {tab === "monthly" && (
        <Box role="tabpanel" sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: "10px 12px 14px" }}>{monthly}</Box>
      )}
      {tab === "policy" && (
        <Box role="tabpanel" sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: "10px 12px 14px" }}>{policy}</Box>
      )}
    </Box>
  );
};

export default SidePanelTabs;
