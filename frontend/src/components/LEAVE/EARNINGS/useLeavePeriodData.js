import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../../apiConfig";
import {
  latestPeriodsByKey,
  isPeriodVoided,
  isCommutedLocked,
  computeAssignmentBalances,
  getLeaveTypeDisplayRemaining,
} from "../leaveAssignmentBalanceUtils";

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Month number from period_semester (month numbers); 0 for annual/legacy rows. */
export const periodMonthOf = (row) => {
  const raw = row?.period_semester != null ? String(row.period_semester).trim() : "";
  return /^\d+$/.test(raw) ? parseInt(raw, 10) : 0;
};

export const periodKeyOf = (year, month) => (parseInt(year, 10) || 0) * 100 + (parseInt(month, 10) || 0);

/**
 * Leave Assignment periods computed exactly like LeaveAssignment.jsx: latest snapshot per
 * (leave code, period), voided periods dropped, balances from computeAssignmentBalances with the
 * employee's approved leave earnings. Commuted periods show zero remaining, as on that page.
 */
export const normalizeAssignmentPeriods = (rows, earningsList = []) => {
  const byCode = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const code = String(r?.leave_code || "").trim().toUpperCase();
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(r);
  }
  const out = [];
  for (const [code, list] of byCode.entries()) {
    // Only this leave type's earnings: the per-period matcher checks year/month, not leave_code,
    // so passing every earning would add e.g. SL's +1.25 into VL's month as well.
    const codeEarnings = (Array.isArray(earningsList) ? earningsList : []).filter(
      (e) => String(e?.leave_code || "").trim().toUpperCase() === code,
    );
    for (const r of latestPeriodsByKey(list)) {
      if (isPeriodVoided(r)) continue;
      const commuted = isCommutedLocked(r);
      const b = computeAssignmentBalances(r, { earningsList: codeEarnings });
      const month = periodMonthOf(r);
      const year = parseInt(r.period_year, 10) || 0;
      out.push({
        id: r.id,
        code,
        year,
        month,
        key: periodKeyOf(year, month),
        commuted,
        allocated: commuted ? 0 : b.currentBalance,
        carried: toNum(r.carried_forward_hours),
        used: b.usedHrs,
        total: commuted ? 0 : b.postDeduction,
        earned: commuted ? 0 : b.earnedBalance,
        remaining: commuted ? 0 : b.remainingBalance,
      });
    }
  }
  return out.sort((a, b) => a.key - b.key || toNum(a.id) - toNum(b.id));
};

/**
 * Current balance per leave code, exactly as Leave Assignment displays it
 * (getLeaveTypeDisplayRemaining: latest active period + its approved earnings).
 * Independent of the month selected in Earnings Management.
 */
export const currentTotalsByCode = (rows, earningsList = []) => {
  const byCode = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const code = String(r?.leave_code || "").trim().toUpperCase();
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(r);
  }
  const out = {};
  for (const [code, list] of byCode.entries()) {
    if (list.every((r) => r?.voided_at)) continue;
    out[code] = getLeaveTypeDisplayRemaining(list, earningsList);
  }
  return out;
};

/** Periods for one leave code, oldest first. */
export const periodsFor = (periods, code) => periods.filter((p) => p.code === code);

/** The period row for year/month, the latest usable period before it, and whether any exist. */
export const monthContext = (periods, code, year, month) => {
  const list = periodsFor(periods, code);
  const key = periodKeyOf(year, month);
  const current = list.find((p) => p.key === key) || null;
  const prior = [...list].reverse().find((p) => p.key < key && !p.commuted) || null;
  const later = list.some((p) => p.key > key);
  return { current, prior, hasAny: list.length > 0, later };
};

/**
 * Leave Assignment data for one employee (same sources as LeaveAssignment.jsx), plus the SC/CTO
 * balances shown on the right-hand cards.
 * @returns {{ loading, error, loadedFor, periods, leaveTypes, currentTotals, sc, cto, reload }}
 */
export function useLeavePeriodData(employeeNumber, refreshKey = 0) {
  const [state, setState] = useState({
    loading: false,
    error: "",
    /** Employee the loaded data belongs to (guards against using the previous employee's data). */
    loadedFor: "",
    periods: [],
    /** leave_code → leave_description */
    leaveTypes: {},
    /** leave_code → current balance in hours (Leave Assignment display value) */
    currentTotals: {},
    sc: { hasRows: false, remainingHours: 0 },
    cto: { hasRows: false, remainingHours: 0 },
  });

  // Only the newest request may update state: switching employees while a slower
  // request for the previous one is still running must not show that employee's
  // balances on the new one's cards.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const emp = String(employeeNumber || "").trim();
    if (!emp) {
      setState((s) => ({ ...s, loading: false, error: "", loadedFor: "", periods: [], currentTotals: {} }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: "" }));
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    const [asg, earn, types, sc, cto] = await Promise.allSettled([
      axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment/employee/${emp}`, { headers }),
      axios.get(`${API_BASE_URL}/api/earnings/leave/${emp}?all=true`, { headers }),
      axios.get(`${API_BASE_URL}/leaveRoute/leave_table`, { headers }),
      axios.get(`${API_BASE_URL}/api/earnings/sc/${emp}/balance`, { headers }),
      axios.get(`${API_BASE_URL}/api/earnings/cto/${emp}/balance`, { headers }),
    ]);
    if (requestId !== requestIdRef.current) return; // a newer load has started — drop this result
    const earningsList =
      earn.status === "fulfilled" && Array.isArray(earn.value.data?.earnings) ? earn.value.data.earnings : [];
    const leaveTypes = {};
    if (types.status === "fulfilled" && Array.isArray(types.value.data)) {
      for (const t of types.value.data) {
        const code = String(t?.leave_code || "").trim().toUpperCase();
        if (code) leaveTypes[code] = t.leave_description || code;
      }
    }
    setState({
      loading: false,
      loadedFor: emp,
      error: asg.status === "rejected" ? asg.reason?.response?.data?.error || "Could not load leave assignments." : "",
      periods: asg.status === "fulfilled" ? normalizeAssignmentPeriods(asg.value.data, earningsList) : [],
      currentTotals: asg.status === "fulfilled" ? currentTotalsByCode(asg.value.data, earningsList) : {},
      leaveTypes,
      sc: {
        hasRows: sc.status === "fulfilled" && (sc.value.data?.balances || []).length > 0,
        remainingHours: sc.status === "fulfilled" ? toNum(sc.value.data?.totalRemaining) : 0,
      },
      cto: {
        hasRows: cto.status === "fulfilled" && Boolean(cto.value.data?.periodRow),
        remainingHours: cto.status === "fulfilled" ? toNum(cto.value.data?.totalRemaining) : 0,
      },
    });
  }, [employeeNumber]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return { ...state, reload: load };
}
