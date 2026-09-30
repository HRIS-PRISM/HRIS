/**
 * Monthly VL/SL accrual proposal (CSC MC 41 s.1998, as amended).
 *
 *  - 15 days VL + 15 days SL a year = 1.25 days each per month of service (Sec. 1).
 *  - Leave without pay is not actual service (Sec. 28), so it reduces the month's credit:
 *      earned = 1.25 × (30 − days LWOP) ÷ 30      (CSC Table III, 30-day month basis)
 *  - Tardiness / undertime is charged to VL (Sec. 34). While VL covers it the employee is paid,
 *    so earning is unaffected; once it is charged to salary it is unpaid time and counts as LWOP.
 *
 * "Days LWOP" for a month = unpaid hours recorded in attendance_result for that month (absences,
 * half-days and tardiness charged to salary), converted with the single hours-per-day resolver.
 *
 * Category entitlement (employment_type_config):
 *  - Non-Academic (regular, casual, temporary): VL + SL.
 *  - Academic 40 hours / designated: VL + SL (agency decision, 2026-09-29).
 *  - Academic 30 hours: service credits only, no VL/SL (CSC MC 41 Sec. 6; agency decision, 2026-09-29).
 *  - Job Order / Contract of Service: no leave credits (CSC-COA-DBM JC 1 s.2017).
 *
 * The proposal is advisory: HR can post a different amount, but only with an override reason
 * (see assertEarningMatchesProposal).
 */

const db = require("../db");
const { resolveHoursPerDay } = require("./hoursPerDayService");

const MONTHLY_CREDIT_DAYS = 1.25;
const MONTH_BASIS_DAYS = 30;
const ACCRUING_CODES = ["VL", "SL"];
const OVERRIDE_TOLERANCE_HOURS = 0.0005;

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const round3 = (n) => Math.round(n * 1000) / 1000;

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

const CATEGORY = {
  non_academic: { code: "non_academic", label: "Non-Academic", earnsVlSl: true },
  academic_40: { code: "academic_40", label: "Academic — 40 hours / designated", earnsVlSl: true },
  academic_30: { code: "academic_30", label: "Academic — 30 hours", earnsVlSl: false, note: "30-hour faculty earn service credits, not VL/SL." },
  jo_cos: { code: "jo_cos", label: "Job Order / Contract of Service", earnsVlSl: false, note: "Job Order / COS workers do not earn leave credits." },
};

/** Same mapping as the frontend (utils/cscLeaveRules.resolveCscCategory). */
const categoryFromText = (parentGroup, typeName) => {
  const blob = `${String(parentGroup || "").toLowerCase()} ${String(typeName || "").toLowerCase()}`;
  if (!blob.trim()) return null;
  if (/job\s*order|contract\s*of\s*service|\bcos\b/.test(blob)) return CATEGORY.jo_cos;
  if (/non[\s-]*academic|non[\s-]*teaching/.test(blob)) return CATEGORY.non_academic;
  if (/40\s*hours?|designated/.test(blob)) return CATEGORY.academic_40;
  if (/30\s*hours?|\bacademic\b|\bteaching\b/.test(blob)) return CATEGORY.academic_30;
  return null;
};

const fetchEmployeeCategory = async (employeeNumber) => {
  const rows = await query(
    `SELECT etc.parentGroup, etc.typeName
     FROM users u
     LEFT JOIN employment_category ec
       ON CAST(ec.employeeNumber AS CHAR) = CAST(u.employeeNumber AS CHAR)
     LEFT JOIN employment_type_config etc
       ON etc.id = COALESCE(ec.employmentCategory, u.employmentCategory)
     WHERE CAST(u.employeeNumber AS CHAR) = CAST(? AS CHAR)
     LIMIT 1`,
    [String(employeeNumber || "").trim()],
  );
  const r = rows[0] || {};
  return {
    category: categoryFromText(r.parentGroup, r.typeName),
    typeLabel: [r.parentGroup, r.typeName].filter(Boolean).join(" | ") || null,
  };
};

/** Unpaid (salary-charged) hours for the month, split into absences and tardiness. */
const fetchUnpaidHours = async (employeeNumber, year, month) => {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  const rows = await query(
    `SELECT source_type, COALESCE(SUM(unpaid_hours), 0) AS h
     FROM attendance_result
     WHERE TRIM(CAST(employee_number AS CHAR)) = TRIM(?)
       AND result_date >= ? AND result_date <= ?
     GROUP BY source_type`,
    [String(employeeNumber).trim(), start, end],
  );
  let absent = 0;
  let tardiness = 0;
  for (const r of rows) {
    if (String(r.source_type || "").toUpperCase().includes("TARD")) tardiness += toNum(r.h);
    else absent += toNum(r.h);
  }
  return { absent, tardiness, total: absent + tardiness };
};

/**
 * @returns {Promise<{
 *   employeeNumber, year, month, hoursPerDay,
 *   category: { code, label } | null, typeLabel,
 *   lwop: { hours, days, absentHours, tardinessHours },
 *   codes: { VL: Proposal, SL: Proposal },
 *   warnings: string[], basis: string[]
 * }>}  Proposal = { eligible, days, hours, formula, reason }
 */
const computeLeaveEarningProposal = async ({ employeeNumber, year, month }) => {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (!employeeNumber || !Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    const err = new Error("employeeNumber, year and month (1-12) are required");
    err.status = 400;
    throw err;
  }

  const [{ category, typeLabel }, { hoursPerDay }, unpaid] = await Promise.all([
    fetchEmployeeCategory(employeeNumber),
    resolveHoursPerDay(employeeNumber),
    fetchUnpaidHours(employeeNumber, y, m),
  ]);

  const warnings = [];
  const lwopDaysRaw = unpaid.total / hoursPerDay;
  const lwopDays = Math.min(MONTH_BASIS_DAYS, Math.max(0, lwopDaysRaw));
  const earnedDays = round3((MONTHLY_CREDIT_DAYS * (MONTH_BASIS_DAYS - lwopDays)) / MONTH_BASIS_DAYS);
  const formula =
    lwopDays > 0
      ? `1.25 × (30 − ${round3(lwopDays).toFixed(3)} LWOP) ÷ 30 = ${earnedDays.toFixed(3)} d`
      : "Full month of service = 1.250 d";

  const eligible = category ? category.earnsVlSl : true;
  if (!category) {
    warnings.push("Employment category is not mapped to a CSC rule; the standard 1.25 d rate is proposed. Check with HR.");
  }

  const codes = {};
  for (const code of ACCRUING_CODES) {
    codes[code] = eligible
      ? { eligible: true, days: earnedDays, hours: round3(earnedDays * hoursPerDay), formula, reason: null }
      : { eligible: false, days: 0, hours: 0, formula: null, reason: category.note || "Not earned by this category." };
  }

  return {
    employeeNumber: String(employeeNumber),
    year: y,
    month: m,
    hoursPerDay,
    category: category ? { code: category.code, label: category.label } : null,
    typeLabel,
    lwop: {
      hours: round3(unpaid.total),
      days: round3(lwopDays),
      absentHours: round3(unpaid.absent),
      tardinessHours: round3(unpaid.tardiness),
    },
    codes,
    warnings,
    basis: [
      "CSC MC 41 s.1998 Sec. 1: 15 days VL + 15 days SL a year (1.25 d per month of service).",
      "Sec. 28 / Table III: leave without pay is not service; earned = 1.25 × (30 − days LWOP) ÷ 30.",
      "Sec. 34: tardiness is charged to VL; only tardiness charged to salary counts as LWOP.",
    ],
  };
};

class OverrideRequiredError extends Error {
  constructor(message, proposal) {
    super(message);
    this.status = 400;
    this.code = "OVERRIDE_REASON_REQUIRED";
    this.proposal = proposal;
  }
}

/**
 * For a new EARNED VL/SL entry: returns the text to append to remarks describing the proposal and,
 * when the posted amount differs (or the category does not earn), the override. Throws
 * OverrideRequiredError when the amount differs and no override reason was given.
 */
const assertEarningMatchesProposal = async ({ employeeNumber, leaveCode, year, month, earnedHours, overrideReason }) => {
  const code = String(leaveCode || "").trim().toUpperCase();
  if (!ACCRUING_CODES.includes(code)) return { remarksSuffix: null, proposal: null };
  const proposal = await computeLeaveEarningProposal({ employeeNumber, year, month });
  const p = proposal.codes[code];
  const posted = toNum(earnedHours);
  const differs = !p.eligible || Math.abs(posted - p.hours) > OVERRIDE_TOLERANCE_HOURS;
  const reason = String(overrideReason || "").trim();
  const hpd = proposal.hoursPerDay;

  if (differs && !reason) {
    throw new OverrideRequiredError(
      p.eligible
        ? `${code} for this month computes to ${p.days.toFixed(3)} d (${p.formula}). Posting a different amount needs an override reason.`
        : `${code} is not earned by this category (${String(p.reason || "").replace(/\.$/, "")}). Posting it needs an override reason.`,
      proposal,
    );
  }

  const auto = p.eligible ? `Auto: ${p.formula}` : `Auto: not earned (${String(p.reason || "").replace(/\.$/, "")})`;
  const remarksSuffix = differs
    ? `${auto}; OVERRIDE to ${(posted / hpd).toFixed(3)} d — ${reason}`
    : auto;
  return { remarksSuffix, proposal, overridden: differs };
};

module.exports = {
  fetchEmployeeCategory,
  computeLeaveEarningProposal,
  assertEarningMatchesProposal,
  OverrideRequiredError,
  ACCRUING_CODES,
};
