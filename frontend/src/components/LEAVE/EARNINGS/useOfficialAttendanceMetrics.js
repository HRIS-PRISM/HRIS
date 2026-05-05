import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import {
  computeOfficialAwareAbsenceAndLate,
  listHalfDayDatesFromDailyRows,
} from "../../../utils/officialAttendanceFromDailyRows";
import { fetchAttendanceCalendarMaps } from "../../ATTENDANCE/attendanceLeaveIntegration";

export { listHalfDayDatesFromDailyRows };

export function useOfficialAttendanceMetrics({
  employeeNumber,
  startDate,
  endDate,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState(null);
  const [calendarMaps, setCalendarMaps] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!employeeNumber || !startDate || !endDate) {
        setRows(null);
        setCalendarMaps(null);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const getAuthHeaders = () => ({
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const [r, maps] = await Promise.all([
          axios.get(`${API_BASE_URL}/attendance/api/attendance`, {
            params: { personId: employeeNumber, startDate, endDate },
            ...getAuthHeaders(),
          }),
          fetchAttendanceCalendarMaps({
            apiBaseUrl: API_BASE_URL,
            getAuthHeaders,
            startDate,
            endDate,
            personId: employeeNumber,
          }),
        ]);
        const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
        const mapsPayload = {
          suspensionByDate: maps.suspensionByDate,
          holidayByDate: maps.holidayByDate,
          leaveByDate: maps.leaveByDate,
        };
        if (!cancelled) {
          setRows(list);
          setCalendarMaps(mapsPayload);
        }
      } catch (e) {
        if (!cancelled)
          setError(e?.response?.data?.message || e?.message || "Failed to load attendance");
        if (!cancelled) {
          setRows(null);
          setCalendarMaps(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [employeeNumber, startDate, endDate]);

  const metrics = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const m = computeOfficialAwareAbsenceAndLate(list, calendarMaps);
    return {
      absentDays: m.absentDays,
      halfDays: m.halfDays,
      /** Raw full-day late bucket from daily rows; with absent/half-day, Attendance/Earnings use DB overall minus those buckets for “Late Total”. */
      lateHrs: m.lateShortfallSecTotal / 3600,
      absentTimeHrs: m.absentSecTotal / 3600,
      halfDayShortfallHrs: m.halfDayShortfallSecTotal / 3600,
      overallShortfallHrs: m.overallShortfallSecTotal / 3600,
      renderedHrs: m.renderedSecTotal / 3600,
    };
  }, [rows, calendarMaps]);

  /** Same rules as ATTENDANCE/AttendanceSummary: excludes approved leave, holidays, suspensions. */
  const halfDayDatesOfficial = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return listHalfDayDatesFromDailyRows(list, calendarMaps);
  }, [rows, calendarMaps]);

  return {
    loading,
    error,
    rows,
    halfDayDatesOfficial,
    absentDays: metrics.absentDays,
    halfDays: metrics.halfDays,
    lateHrs: metrics.lateHrs,
    absentTimeHrs: metrics.absentTimeHrs,
    halfDayShortfallHrs: metrics.halfDayShortfallHrs,
    overallShortfallHrs: metrics.overallShortfallHrs,
    renderedHrs: metrics.renderedHrs,
  };
}
