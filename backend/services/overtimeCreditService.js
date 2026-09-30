/**
 * Monthly CTO (compensatory overtime credit) and Service Credit proposals.
 *
 * CTO — CSC-DBM Joint Circular No. 2, s. 2004:
 *  - Only overtime authorized in advance by the head of office (office order) earns COC.
 *  - Workday overtime × 1.0; weekend, holiday or scheduled day off × 1.5.
 *  - At most 40 hours of COC in a month; the unused balance may never exceed 120 hours.
 *  - Use within the year earned or the following year; unused COC is forfeited after that.
 *
 * Service Credit — not a CSC benefit. Modelled on DepEd DO 53 s.2003 (1 day per 8 hours of
 * service beyond regular duties/days); EARIST's own SUC policy must confirm it.
 *
 * Rendered overtime / service-credit hours per day follow the attendance modules: the overlap
 * between the day's actual time in/out and the official overtime (or service-credit) window in
 * officialtime. The per-day total is checked against the saved monthly attendance summary; if
 * they disagree, the saved total is used at the workday rate and a warning is returned.
 *
 * The proposal is advisory: a different amount needs an override reason
 * (assertOvertimeCreditMatchesProposal).
 */

const db = require("../db");

const CTO_MONTHLY_CAP_HOURS = 40;
const CTO_BALANCE_CAP_HOURS = 120;
const WEEKDAY_RATE = 1.0;
const OFFDAY_RATE = 1.5;
const TOLERANCE_HOURS = 0.0005;
const RECONCILE_TOLERANCE_HOURS = 1 / 60; // one minute

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const round3 = (n) => Math.round(n * 1000) / 1000;
const query = (sql, params = []) =>
  new Promise((resolve, reject) => db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));

/** "07:50:55 AM" | "21:05" | "00:00:00 PM" → minutes after midnight (same rules as the attendance modules). */
const clockToMinutes = (v) => {
  if (v == null) return null;
  const s = String(v).trim().toUpperCase();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0);
  if (m[4] === "PM" && h < 12) h += 12;
  if (m[4] === "AM" && h === 12) h = 0;
  return h * 60 + min;
};

/** Hours of [in, out] that fall inside the official window [offIn, offOut] (calcSeg). */
const overlapHours = (tIn, tOut, offIn, offOut) => {
  const s = clockToMinutes(tIn);
  const e = clockToMinutes(tOut);
  const os = clockToMinutes(offIn);
  const oe = clockToMinutes(offOut);
  if (s == null || e == null || os == null || oe == null || oe <= os || e <= s) return 0;
  const a = Math.max(s, os);
  const b = Math.min(e, oe);
  return b > a ? (b - a) / 60 : 0;
};

const hhmmToHours = (v) => {
  const s = String(v || "").trim();
  if (!s) return 0;
  const [h, m, sec] = s.split(":").map((x) => parseInt(x, 10) || 0);
  return h + m / 60 + sec / 3600;
};
const isoDate = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const monthRange = (year, month) => {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  return { start, end };
};

/** Active holidays in the month as a Set of YYYY-MM-DD (single day or date_start..date_end). */
const fetchHolidayDates = async (year, month) => {
  const { start, end } = monthRange(year, month);
  const rows = await query(
    `SELECT date, date_start, date_end FROM holiday
     WHERE (status IS NULL OR status = 'Active')
       AND (date BETWEEN ? AND ? OR (date_start IS NOT NULL AND DATE(date_start) <= ? AND DATE(COALESCE(date_end, date_start)) >= ?))`,
    [start, end, end, start],
  ).catch(() => []);
  const out = new Set();
  for (const r of rows) {
    if (r.date) out.add(isoDate(r.date));
    if (r.date_start) {
      const a = new Date(r.date_start);
      const b = new Date(r.date_end || r.date_start);
      for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) out.add(isoDate(d));
    }
  }
  return out;
};

/**
 * Per-day rendered OT and SC hours for the month, with each day's rate class.
 * @returns {{ days: Array<{date, weekday, offDay, holiday, otHours, scHours}>, summaryOt, summarySc, hasSummary }}
 */
const fetchRenderedExtraHours = async (employeeNumber, year, month) => {
  const { start, end } = monthRange(year, month);
  const emp = String(employeeNumber).trim();
  const [rows, summaryRows, holidays] = await Promise.all([
    query(
      `SELECT ar.date, ar.timeIN, ar.timeOUT,
              ot.officialTimeIN, ot.officialTimeOUT,
              ot.officialOverTimeIN, ot.officialOverTimeOUT,
              ot.officialServiceCreditTimeIN, ot.officialServiceCreditTimeOUT
       FROM attendancerecord ar
       LEFT JOIN officialtime ot
         ON ar.personID = ot.employeeID
        AND TRIM(DAYNAME(ar.date)) = TRIM(ot.day)
        AND ar.date BETWEEN ot.startDate AND ot.endDate
       WHERE ar.personID = ? AND ar.date >= ? AND ar.date <= ?
       ORDER BY ar.date ASC`,
      [emp, start, end],
    ),
    query(
      `SELECT totalRenderedOvertime, totalRenderedServiceCredit
       FROM overall_attendance_record
       WHERE personID = ? AND startDate <= ? AND endDate >= ?
       ORDER BY ABS(DATEDIFF(startDate, ?)) ASC, startDate DESC LIMIT 1`,
      [emp, end, start, start],
    ),
    fetchHolidayDates(year, month),
  ]);
  const days = [];
  for (const r of rows) {
    const date = isoDate(r.date);
    const dow = new Date(`${date}T00:00:00`).getDay();
    const weekend = dow === 0 || dow === 6;
    const scheduled = Boolean(String(r.officialTimeIN || "").trim() && String(r.officialTimeOUT || "").trim());
    const holiday = holidays.has(date);
    const otHours = overlapHours(r.timeIN, r.timeOUT, r.officialOverTimeIN, r.officialOverTimeOUT);
    const scHours = overlapHours(r.timeIN, r.timeOUT, r.officialServiceCreditTimeIN, r.officialServiceCreditTimeOUT);
    if (otHours <= 0 && scHours <= 0) continue;
    days.push({
      date,
      weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow],
      // Weekend, holiday or a day with no official schedule (scheduled day off) → 1.5 rate.
      offDay: weekend || holiday || !scheduled,
      holiday,
      otHours: round3(otHours),
      scHours: round3(scHours),
    });
  }
  const s = summaryRows[0];
  return {
    days,
    hasSummary: Boolean(s),
    summaryOt: s ? hhmmToHours(s.totalRenderedOvertime) : 0,
    summarySc: s ? hhmmToHours(s.totalRenderedServiceCredit) : 0,
  };
};

const fetchCategoryText = async (employeeNumber) => {
  const rows = await query(
    `SELECT etc.parentGroup, etc.typeName
     FROM users u
     LEFT JOIN employment_category ec ON CAST(ec.employeeNumber AS CHAR) = CAST(u.employeeNumber AS CHAR)
     LEFT JOIN employment_type_config etc ON etc.id = COALESCE(ec.employmentCategory, u.employmentCategory)
     WHERE CAST(u.employeeNumber AS CHAR) = CAST(? AS CHAR) LIMIT 1`,
    [String(employeeNumber).trim()],
  );
  return `${String(rows[0]?.parentGroup || "").toLowerCase()} ${String(rows[0]?.typeName || "").toLowerCase()}`.trim();
};
const isJobOrder = (blob) => /job\s*order|contract\s*of\s*service|\bcos\b/.test(blob);
const isNonAcademic = (blob) => /non[\s-]*academic|non[\s-]*teaching/.test(blob);

/** COC already earned in the month (pending or approved, not voided/rejected). */
const fetchCtoEarnedThisMonth = async (employeeNumber, year, month) => {
  const rows = await query(
    `SELECT COALESCE(SUM(earned_hours), 0) AS h FROM cto_earnings
     WHERE employee_number = ? AND period_year = ? AND period_month = ?
       AND earned_hours > 0 AND voided_at IS NULL AND COALESCE(voided, 0) = 0
       AND earn_status IN ('pending','approved')`,
    [String(employeeNumber).trim(), year, month],
  ).catch(() => [{ h: 0 }]);
  return toNum(rows[0]?.h);
};

const fetchCtoBalance = (employeeNumber) =>
  new Promise((resolve) => {
    try {
      const { getCtoCreditRunningTotals } = require("./ctoCreditRunningTotals");
      getCtoCreditRunningTotals(String(employeeNumber).trim(), (err, cur) => resolve(err ? 0 : toNum(cur?.remaining)));
    } catch (_e) {
      resolve(0);
    }
  });

const validateArgs = ({ employeeNumber, year, month }) => {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (!employeeNumber || !Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    const err = new Error("employeeNumber, year and month (1-12) are required");
    err.status = 400;
    throw err;
  }
  return { y, m };
};

/**
 * CTO proposal for the month.
 * @returns {Promise<{ eligible, reason, hours, days, formula, breakdown, caps, expiryDate, warnings, basis, days: [] }>}
 */
const computeCtoProposal = async ({ employeeNumber, year, month }) => {
  const { y, m } = validateArgs({ employeeNumber, year, month });
  const [blob, rendered, earnedAlready, balance] = await Promise.all([
    fetchCategoryText(employeeNumber),
    fetchRenderedExtraHours(employeeNumber, y, m),
    fetchCtoEarnedThisMonth(employeeNumber, y, m),
    fetchCtoBalance(employeeNumber),
  ]);
  const warnings = [];
  const expiryDate = `${y + 1}-12-31`;
  const basis = [
    "CSC-DBM JC 2 s.2004: authorized overtime only; workday × 1.0, weekend/holiday/day off × 1.5.",
    "At most 40 h of COC a month; the unused balance may not exceed 120 h.",
    `Use within ${y} or ${y + 1}; unused COC is forfeited after ${expiryDate}.`,
  ];
  if (isJobOrder(blob)) {
    return { eligible: false, reason: "Job Order / COS workers do not earn CTO.", hours: 0, days: 0, formula: null, breakdown: null, caps: null, expiryDate, warnings, basis, perDay: [] };
  }

  let weekdayOt = rendered.days.filter((d) => !d.offDay).reduce((s, d) => s + d.otHours, 0);
  let offDayOt = rendered.days.filter((d) => d.offDay).reduce((s, d) => s + d.otHours, 0);
  const perDayTotal = weekdayOt + offDayOt;
  if (rendered.hasSummary && Math.abs(perDayTotal - rendered.summaryOt) > RECONCILE_TOLERANCE_HOURS) {
    warnings.push(
      `The per-day overtime (${round3(perDayTotal).toFixed(3)} h) does not match the saved attendance summary (${round3(rendered.summaryOt).toFixed(3)} h). The saved total is used at the workday rate; override if needed.`,
    );
    weekdayOt = rendered.summaryOt;
    offDayOt = 0;
  }
  if (!rendered.hasSummary) warnings.push("No saved attendance summary for this month; overtime comes from the daily records.");

  const raw = weekdayOt * WEEKDAY_RATE + offDayOt * OFFDAY_RATE;
  const monthRoom = Math.max(0, CTO_MONTHLY_CAP_HOURS - earnedAlready);
  const balanceRoom = Math.max(0, CTO_BALANCE_CAP_HOURS - balance);
  const hours = round3(Math.max(0, Math.min(raw, monthRoom, balanceRoom)));
  const cappedBy = hours + TOLERANCE_HOURS < raw ? (monthRoom <= balanceRoom ? "monthly" : "balance") : null;
  if (cappedBy === "monthly") warnings.push(`Capped at the 40 h monthly limit (${round3(earnedAlready).toFixed(3)} h already earned this month).`);
  if (cappedBy === "balance") warnings.push(`Capped so the CTO balance stays within 120 h (current balance ${round3(balance).toFixed(3)} h).`);
  warnings.push("CTO needs an office order authorizing the overtime; enter its reference when posting.");

  const formula =
    `${round3(weekdayOt).toFixed(3)} h × 1.0 + ${round3(offDayOt).toFixed(3)} h × 1.5 = ${round3(raw).toFixed(3)} h` +
    (cappedBy ? ` → capped to ${hours.toFixed(3)} h` : "");
  return {
    eligible: true,
    reason: null,
    hours,
    days: round3(hours / 8),
    formula,
    breakdown: { weekdayOtHours: round3(weekdayOt), offDayOtHours: round3(offDayOt), rawHours: round3(raw) },
    caps: { monthlyCap: CTO_MONTHLY_CAP_HOURS, balanceCap: CTO_BALANCE_CAP_HOURS, earnedThisMonth: round3(earnedAlready), currentBalance: round3(balance), cappedBy },
    expiryDate,
    warnings,
    basis,
    perDay: rendered.days.filter((d) => d.otHours > 0).map(({ date, weekday, offDay, holiday, otHours }) => ({ date, weekday, offDay, holiday, hours: otHours })),
  };
};

/** Service Credit proposal: 1 day per 8 hours of rendered service-credit time. */
const computeScProposal = async ({ employeeNumber, year, month }) => {
  const { y, m } = validateArgs({ employeeNumber, year, month });
  const [blob, rendered] = await Promise.all([fetchCategoryText(employeeNumber), fetchRenderedExtraHours(employeeNumber, y, m)]);
  const warnings = [];
  const basis = [
    "Service credits are not a CSC benefit; modelled on DepEd DO 53 s.2003: 1 day per 8 hours of service beyond regular duties or days.",
    "EARIST's SUC policy on faculty service credits must confirm this.",
  ];
  if (isJobOrder(blob)) {
    return { eligible: false, reason: "Job Order / COS workers do not earn service credits.", hours: 0, days: 0, formula: null, warnings, basis, perDay: [] };
  }
  if (isNonAcademic(blob)) {
    return { eligible: false, reason: "Non-academic staff earn CTO for overtime, not service credits.", hours: 0, days: 0, formula: null, warnings, basis, perDay: [] };
  }
  let hours = rendered.days.reduce((s, d) => s + d.scHours, 0);
  if (rendered.hasSummary && Math.abs(hours - rendered.summarySc) > RECONCILE_TOLERANCE_HOURS) {
    warnings.push(
      `The per-day service-credit time (${round3(hours).toFixed(3)} h) does not match the saved attendance summary (${round3(rendered.summarySc).toFixed(3)} h). The saved total is used; override if needed.`,
    );
    hours = rendered.summarySc;
  }
  hours = round3(hours);
  return {
    eligible: true,
    reason: null,
    hours,
    days: round3(hours / 8),
    formula: `${hours.toFixed(3)} h rendered ÷ 8 = ${round3(hours / 8).toFixed(3)} d`,
    warnings,
    basis,
    perDay: rendered.days.filter((d) => d.scHours > 0).map(({ date, weekday, scHours }) => ({ date, weekday, hours: scHours })),
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
 * For a new positive CTO / SC earning: returns the remarks suffix (computation + authority
 * reference + override). Throws when the amount differs without an override reason, or when a
 * CTO earning has no office-order reference.
 */
/**
 * Manual entry first (agency decision, 2026-09-29): HR enters CTO / SC amounts directly and the
 * computation is not enforced yet — the overtime windows in officialtime are not reliable enough.
 * Set to false to require the computed amount (or an override reason) again.
 */
const MANUAL_ENTRY_FIRST = true;

const assertOvertimeCreditMatchesProposal = async ({ kind, employeeNumber, year, month, earnedHours, overrideReason, authorityRef }) => {
  if (MANUAL_ENTRY_FIRST) {
    const ref = String(authorityRef || "").trim();
    if (kind === "cto" && !ref) {
      const err = new Error("CTO needs the office order / Certificate of COC Earned reference (CSC-DBM JC 2 s.2004).");
      err.status = 400;
      err.code = "AUTHORITY_REF_REQUIRED";
      throw err;
    }
    const parts = [`Manual entry: ${Number(earnedHours || 0).toFixed(3)} h`];
    if (ref) parts.push(`Authority: ${ref}`);
    const reason = String(overrideReason || "").trim();
    if (reason) parts.push(`Note: ${reason}`);
    return { remarksSuffix: parts.join("; "), proposal: null, overridden: false };
  }
  const proposal = kind === "cto"
    ? await computeCtoProposal({ employeeNumber, year, month })
    : await computeScProposal({ employeeNumber, year, month });
  const label = kind === "cto" ? "CTO" : "Service credit";
  const posted = toNum(earnedHours);
  const differs = !proposal.eligible || Math.abs(posted - proposal.hours) > TOLERANCE_HOURS;
  const reason = String(overrideReason || "").trim();
  const ref = String(authorityRef || "").trim();

  if (kind === "cto" && !ref) {
    const err = new Error("CTO needs the office order / Certificate of COC Earned reference (CSC-DBM JC 2 s.2004).");
    err.status = 400;
    err.code = "AUTHORITY_REF_REQUIRED";
    throw err;
  }
  if (differs && !reason) {
    throw new OverrideRequiredError(
      proposal.eligible
        ? `${label} for this month computes to ${proposal.hours.toFixed(3)} h (${proposal.formula}). Posting a different amount needs an override reason.`
        : `${label} is not earned by this category (${String(proposal.reason || "").replace(/\.$/, "")}). Posting it needs an override reason.`,
      proposal,
    );
  }
  const parts = [proposal.eligible ? `Auto: ${proposal.formula}` : `Auto: not earned (${String(proposal.reason || "").replace(/\.$/, "")})`];
  if (ref) parts.push(`Authority: ${ref}`);
  if (differs) parts.push(`OVERRIDE to ${posted.toFixed(3)} h — ${reason}`);
  return { remarksSuffix: parts.join("; "), proposal, overridden: differs };
};

module.exports = {
  computeCtoProposal,
  computeScProposal,
  assertOvertimeCreditMatchesProposal,
  clockToMinutes,
  overlapHours,
};
