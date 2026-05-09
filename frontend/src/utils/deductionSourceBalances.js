import axios from "axios";
import API_BASE_URL from "../apiConfig";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 8h-equivalent days from the same sources as CTODeductionReceipt / AttendanceSummary:
 * - Leave types: SUM(remaining_hours) per leave_code from GET /api/earnings/assignment-balances/:en
 * - SC: totalRemaining hours from GET /api/earnings/sc/:en/balance
 * - CTO: totalRemaining hours from GET /api/earnings/cto/:en/balance
 *
 * @param {string} sourceValue - option value e.g. VL, SC, CTO, SALARY_DEDUCTION
 * @param {object} ctx
 * @param {Record<string, { remaining_hours?: string|number }>} [ctx.assignmentMap]
 * @param {number} [ctx.scRemainingHours]
 * @param {number} [ctx.ctoRemainingHours]
 * @param {number|null} [ctx.salaryFallbackDays] - tardiness UI uses VL days when source is salary
 * @returns {number|null} days (8h basis), or null for salary without fallback
 */
export function getDeductionSourceBalanceDays(
  sourceValue,
  {
    assignmentMap = {},
    scRemainingHours = 0,
    ctoRemainingHours = 0,
    salaryFallbackDays = null,
  } = {},
) {
  const code = String(sourceValue || "").trim().toUpperCase();
  if (!code) return null;
  if (code === "SALARY_DEDUCTION") {
    return salaryFallbackDays != null && Number.isFinite(Number(salaryFallbackDays))
      ? Number(salaryFallbackDays)
      : null;
  }
  if (code === "CTO") return toNum(ctoRemainingHours) / 8;
  if (code === "SC") return toNum(scRemainingHours) / 8;
  const row = assignmentMap[code] ?? assignmentMap[String(code)];
  return toNum(row?.remaining_hours) / 8;
}

/**
 * @param {number|null} balanceDays
 * @param {number} needDays
 * @param {string} sourceValue
 */
export function isDeductionSourceSufficient(balanceDays, needDays, sourceValue) {
  const code = String(sourceValue || "").trim().toUpperCase();
  if (code === "SALARY_DEDUCTION") return true;
  if (needDays == null || !Number.isFinite(needDays) || needDays <= 1e-6) return true;
  if (balanceDays == null || !Number.isFinite(balanceDays)) return false;
  return balanceDays + 1e-6 >= needDays;
}

/**
 * True when this source can receive an attendance deduction on a **credit** ledger
 * (leave assignment, SC, CTO). Always false for salary — use salary shortfall / attendance_result instead.
 *
 * @param {string} sourceValue e.g. VL, SC, CTO (not SALARY_DEDUCTION)
 * @param {number} needDays amount to deduct in 8h-equivalent days
 * @param {object} ctx same shape as {@link getDeductionSourceBalanceDays}
 */
export function canApplyAttendanceDeductionToCreditSource(sourceValue, needDays, ctx) {
  const code = String(sourceValue || "").trim().toUpperCase();
  if (!code || code === "SALARY_DEDUCTION") return false;
  const n = Number(needDays);
  if (!Number.isFinite(n) || n <= 1e-6) return true;
  const bal = getDeductionSourceBalanceDays(sourceValue, ctx);
  return isDeductionSourceSufficient(bal, n, sourceValue);
}

/**
 * @returns {{ assignmentMap: object, scRemainingHours: number, ctoRemainingHours: number }}
 */
export async function fetchDeductionCreditSnapshots(employeeNumber, token) {
  const headers = { Authorization: `Bearer ${token}` };
  const emp = String(employeeNumber || "").trim();
  if (!emp) {
    return { assignmentMap: {}, scRemainingHours: 0, ctoRemainingHours: 0 };
  }

  // IMPORTANT:
  // leave_assignment is append-only (history snapshots). The backend summary endpoint
  // `/api/earnings/assignment-balances/:emp` uses SUM(...) and will double-count snapshots.
  // For correct UI balances, compute totals from the latest snapshot per period.
  const buildAssignmentMapFromRows = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    // For UI "current balance" chips, we want the latest running-balance snapshot per leave_code
    // (service_credit style), NOT a sum across periods.
    const latestByCode = new Map(); // code -> latest row

    const periodScore = (r) => {
      const y = toNum(r?.period_year);
      const semRaw = r?.period_semester != null ? String(r.period_semester).trim() : "";
      const semNum = semRaw !== "" && /^[0-9]+$/.test(semRaw) ? parseInt(semRaw, 10) : NaN;
      const m = Number.isFinite(semNum) ? semNum : 0;
      const id = toNum(r?.id);
      return { y, m, id };
    };

    for (const r of list) {
      const code = String(r?.leave_code || "").trim();
      if (!code) continue;
      const prev = latestByCode.get(code);
      if (!prev) {
        latestByCode.set(code, r);
        continue;
      }
      const A = periodScore(r);
      const B = periodScore(prev);
      const isNewer =
        A.y > B.y ||
        (A.y === B.y && A.m > B.m) ||
        (A.y === B.y && A.m === B.m && A.id > B.id);
      if (isNewer) latestByCode.set(code, r);
    }

    const map = {};
    for (const [code, r] of latestByCode.entries()) {
      map[code] = {
        leave_code: code,
        remaining_hours: toNum(r?.remaining_hours),
        total_hours: toNum(r?.total_hours),
        used_hours: toNum(r?.used_hours),
        period_year: r?.period_year ?? null,
        period_semester: r?.period_semester ?? null,
      };
    }
    return map;
  };

  const [assignRowsRes, scRes, ctoRes] = await Promise.allSettled([
    axios.get(`${API_BASE_URL}/leaveRoute/leave_assignment/employee/${emp}`, { headers }),
    axios.get(`${API_BASE_URL}/api/earnings/sc/${emp}/balance`, { headers }),
    axios.get(`${API_BASE_URL}/api/earnings/cto/${emp}/balance`, { headers }),
  ]);

  const assignmentMap =
    assignRowsRes.status === "fulfilled"
      ? buildAssignmentMapFromRows(assignRowsRes.value.data)
      : {};

  return {
    assignmentMap,
    scRemainingHours:
      scRes.status === "fulfilled" ? toNum(scRes.value.data?.totalRemaining) : 0,
    ctoRemainingHours:
      ctoRes.status === "fulfilled" ? toNum(ctoRes.value.data?.totalRemaining) : 0,
  };
}
