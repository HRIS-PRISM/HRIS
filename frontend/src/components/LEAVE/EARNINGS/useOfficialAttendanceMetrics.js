import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return null;
  const trimmed = String(timeStr).trim();
  if (!trimmed) return null;
  const m = trimmed.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i,
  );
  if (!m) return null;
  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3] ?? 0);
  const mer = (m[4] || "").toUpperCase();
  if ([hh, mm, ss].some(Number.isNaN)) return null;
  if (mer) {
    if (hh === 12) hh = 0;
    if (mer === "PM") hh += 12;
  }
  return hh * 3600 + mm * 60 + ss;
}

function empty(v) {
  return !v || String(v).trim() === "";
}

function isScheduledByOfficialTime(row) {
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

function hasMorningPunch(row) {
  return !empty(row?.timeIN) || !empty(row?.breaktimeIN);
}

function hasAfternoonPunch(row) {
  return !empty(row?.breaktimeOUT) || !empty(row?.timeOUT);
}

function computeMetricsFromDailyRows(rows) {
  let absentDays = 0;
  let halfDays = 0;
  let lateDeficitSecTotal = 0;
  let renderedSecTotal = 0;

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!isScheduledByOfficialTime(row)) return;

    if (hasNoPunches(row)) {
      absentDays += 1;
      return;
    }

    // Semi-absence handling:
    // when only one session has punches, treat as half-day absence.
    const hasMorning = hasMorningPunch(row);
    const hasAfternoon = hasAfternoonPunch(row);
    if (hasMorning !== hasAfternoon) {
      absentDays += 0.5;
      halfDays += 1;
    }

    const offInSec = parseTimeToSeconds(row?.officialTimeIN);
    const offOutSec = parseTimeToSeconds(row?.officialTimeOUT);
    if (offInSec == null || offOutSec == null) return;

    const schedTotal = Math.max(0, offOutSec - offInSec);

    const offBreakInSec = parseTimeToSeconds(row?.officialBreaktimeIN);
    const offBreakOutSec = parseTimeToSeconds(row?.officialBreaktimeOUT);
    const breakSec =
      offBreakInSec != null && offBreakOutSec != null
        ? Math.max(0, offBreakOutSec - offBreakInSec)
        : 0;
    const schedWorkSec = Math.max(0, schedTotal - breakSec);

    const inSec = parseTimeToSeconds(row?.timeIN);
    const outSec = parseTimeToSeconds(row?.timeOUT);
    const breakInSec = parseTimeToSeconds(row?.breaktimeIN);
    const breakOutSec = parseTimeToSeconds(row?.breaktimeOUT);

    let renderedSec = 0;
    if (inSec != null && outSec != null) {
      if (breakInSec != null && breakOutSec != null && breakOutSec >= breakInSec) {
        renderedSec = Math.max(0, breakInSec - inSec) + Math.max(0, outSec - breakOutSec);
      } else {
        renderedSec = Math.max(0, outSec - inSec);
      }
    } else {
      renderedSec = 0;
    }

    lateDeficitSecTotal += Math.max(0, schedWorkSec - renderedSec);
    renderedSecTotal += renderedSec;
  });

  const lateHrs = lateDeficitSecTotal / 3600;
  const renderedHrs = renderedSecTotal / 3600;
  return { absentDays, halfDays, lateHrs, renderedHrs };
}

export function useOfficialAttendanceMetrics({
  employeeNumber,
  startDate,
  endDate,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!employeeNumber || !startDate || !endDate) {
        setRows(null);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const r = await axios.get(`${API_BASE_URL}/attendance/api/attendance`, {
          params: { personId: employeeNumber, startDate, endDate },
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled)
          setError(e?.response?.data?.message || e?.message || "Failed to load attendance");
        if (!cancelled) setRows(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [employeeNumber, startDate, endDate]);

  const metrics = useMemo(
    () => computeMetricsFromDailyRows(rows),
    [rows],
  );

  return {
    loading,
    error,
    rows,
    absentDays: metrics.absentDays,
    halfDays: metrics.halfDays,
    lateHrs: metrics.lateHrs,
    renderedHrs: metrics.renderedHrs,
  };
}

