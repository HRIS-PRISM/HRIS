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
 * @returns {{ assignmentMap: object, scRemainingHours: number, ctoRemainingHours: number }}
 */
export async function fetchDeductionCreditSnapshots(employeeNumber, token) {
  const headers = { Authorization: `Bearer ${token}` };
  const emp = String(employeeNumber || "").trim();
  if (!emp) {
    return { assignmentMap: {}, scRemainingHours: 0, ctoRemainingHours: 0 };
  }
  const [assignRes, scRes, ctoRes] = await Promise.allSettled([
    axios.get(`${API_BASE_URL}/api/earnings/assignment-balances/${emp}`, { headers }),
    axios.get(`${API_BASE_URL}/api/earnings/sc/${emp}/balance`, { headers }),
    axios.get(`${API_BASE_URL}/api/earnings/cto/${emp}/balance`, { headers }),
  ]);
  return {
    assignmentMap:
      assignRes.status === "fulfilled" &&
      assignRes.value.data &&
      typeof assignRes.value.data === "object"
        ? assignRes.value.data
        : {},
    scRemainingHours:
      scRes.status === "fulfilled" ? toNum(scRes.value.data?.totalRemaining) : 0,
    ctoRemainingHours:
      ctoRes.status === "fulfilled" ? toNum(ctoRes.value.data?.totalRemaining) : 0,
  };
}
