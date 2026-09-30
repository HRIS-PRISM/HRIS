/**
 * CSC rules for filing and approving leave requests (CSC MC 41 s.1998 as amended).
 *
 *  - Leave is counted on working days only (Sec. 1 note): the employee's official-time
 *    schedule decides which weekdays are working days (Mon–Fri when none is on file);
 *    active holidays are never working days.
 *  - Sick leave may be charged to vacation leave when SL is exhausted, never the other
 *    way round (Sec. 56). Every other leave type is charged to its own balance.
 *    30-hour faculty (who earn service credits, not VL/SL) may also charge SC.
 *  - Job Order / Contract of Service workers have no leave benefits (CSC-COA-DBM JC 1 s.2017).
 *  - Gender-restricted leave types follow leave_table.gender_restriction.
 *  - A month already in Payroll Processing can no longer change (same lock as Void).
 *  - Filing notices (not blocking): VL filed < 5 days ahead (Sec. 51); SL > 5 days
 *    needs a medical certificate (Sec. 53).
 */
const db = require("../db");
const { fetchEmployeeCategory } = require("./leaveAccrualService");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

class LeaveRequestRuleError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const up = (v) => String(v || "").trim().toUpperCase();
const pad2 = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseIso = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
};

// ── Charge direction (Sec. 56) ──────────────────────────────────────────────────
const CSC_CHARGE_FALLBACK = { SL: ["VL"] };

/**
 * Balances a request filed as `filedCode` may be charged to, in preference order.
 * `categoryCode` is the CSC category from leaveAccrualService (academic_30 adds SC).
 */
const allowedChargeCodes = (filedCode, categoryCode = null) => {
  const f = up(filedCode);
  if (!f) return [];
  const out = [f, ...(CSC_CHARGE_FALLBACK[f] || [])];
  if (categoryCode === "academic_30" && !out.includes("SC")) out.push("SC");
  return out;
};

const assertChargeAllowed = (filedCode, chargeCode, categoryCode = null) => {
  const allowed = allowedChargeCodes(filedCode, categoryCode);
  if (allowed.includes(up(chargeCode))) return;
  const f = up(filedCode);
  const hint = allowed.length > 1 ? `${allowed.join(" or ")}` : f;
  throw new LeaveRequestRuleError(
    409,
    "CHARGE_NOT_ALLOWED",
    `A ${f} request can only be charged to ${hint} (CSC MC 41 s.1998${f === "SL" ? ", Sec. 56: sick leave may use VL when SL runs out" : ""}). ${up(chargeCode)} is not allowed.`,
  );
};

// ── Working days ────────────────────────────────────────────────────────────────
const hasClock = (v) => {
  const s = String(v || "").trim();
  return s !== "" && !/^0?0:00(:00)?\s*(AM)?$/i.test(s);
};

/** Weekday names the employee works per official time, or null when no schedule is on file. */
const fetchWorkingWeekdays = async (employeeNumber, onDate) => {
  const rows = await query(
    `SELECT id, day, startDate, endDate, officialTimeIN, officialTimeOUT
       FROM officialtime
      WHERE TRIM(employeeID) = TRIM(?)`,
    [String(employeeNumber || "").trim()],
  ).catch(() => []);
  if (!rows.length) return null;
  const d = onDate ? String(onDate).slice(0, 10) : null;
  const inRange = (r) => {
    const s = r.startDate ? isoOf(new Date(r.startDate)) : null;
    const e = r.endDate ? isoOf(new Date(r.endDate)) : null;
    return d && s && e && s <= d && d <= e;
  };
  const scoped = rows.filter(inRange);
  const pool = scoped.length ? scoped : rows;
  const byDay = new Map();
  [...pool].sort((a, b) => a.id - b.id).forEach((r) => byDay.set(String(r.day || "").trim().toLowerCase(), r));
  const days = new Set();
  byDay.forEach((r, day) => {
    if (hasClock(r.officialTimeIN) && hasClock(r.officialTimeOUT)) days.add(day);
  });
  return days.size ? days : null;
};

/** Active holidays touching [start, end] → Map(date → description). */
const fetchHolidaysBetween = async (start, end) => {
  const rows = await query(
    `SELECT description, title, date, date_start, date_end FROM holiday
      WHERE (status IS NULL OR status = 'Active')
        AND (LEFT(date, 10) BETWEEN ? AND ?
             OR (date_start IS NOT NULL AND DATE(date_start) <= ? AND DATE(COALESCE(date_end, date_start)) >= ?))`,
    [start, end, end, start],
  ).catch(() => []);
  const out = new Map();
  for (const r of rows) {
    const label = r.title || r.description || "Holiday";
    if (r.date && /^\d{4}-\d{2}-\d{2}/.test(String(r.date))) out.set(String(r.date).slice(0, 10), label);
    if (r.date_start) {
      const a = new Date(r.date_start);
      const b = new Date(r.date_end || r.date_start);
      for (let x = new Date(a); x <= b; x.setDate(x.getDate() + 1)) out.set(isoOf(x), label);
    }
  }
  return out;
};

/** Dates (YYYY-MM-DD) that are not working days for the employee, with the reason. */
const findNonWorkingDates = async (employeeNumber, dates) => {
  const list = [...new Set((dates || []).map((d) => String(d).slice(0, 10)))].sort();
  if (!list.length) return [];
  const [schedule, holidays] = await Promise.all([
    fetchWorkingWeekdays(employeeNumber, list[0]),
    fetchHolidaysBetween(list[0], list[list.length - 1]),
  ]);
  const out = [];
  for (const d of list) {
    const wd = WEEKDAYS[parseIso(d).getDay()];
    if (holidays.has(d)) {
      out.push({ date: d, kind: "holiday", reason: `Holiday (${holidays.get(d)})` });
    } else if (schedule ? !schedule.has(wd.toLowerCase()) : wd === "Saturday" || wd === "Sunday") {
      out.push({ date: d, kind: "no_schedule", reason: schedule ? `${wd} — not in the official time schedule` : wd });
    }
  }
  return out;
};

/** Non-working days in [start, end] for the date picker: { holidays: [{date, label}], workingWeekdays: [...] | null }. */
const describeCalendar = async (employeeNumber, start, end) => {
  const [schedule, holidays] = await Promise.all([
    fetchWorkingWeekdays(employeeNumber, start),
    fetchHolidaysBetween(start, end),
  ]);
  return {
    workingWeekdays: schedule ? [...schedule] : null,
    holidays: [...holidays.entries()].map(([date, label]) => ({ date, label })).sort((a, b) => a.date.localeCompare(b.date)),
  };
};

// ── Eligibility (category + gender) ─────────────────────────────────────────────
/** { categoryCode, categoryLabel, isJobOrder, sex } — category mapping shared with Earnings. */
const fetchEmployeeProfile = async (employeeNumber) => {
  const emp = String(employeeNumber || "").trim();
  const [{ category, typeLabel }, [person]] = await Promise.all([
    fetchEmployeeCategory(emp).catch(() => ({ category: null, typeLabel: null })),
    query(`SELECT sex FROM person_table WHERE TRIM(CAST(agencyEmployeeNum AS CHAR)) = ? LIMIT 1`, [emp]).catch(() => []),
  ]);
  return {
    categoryCode: category?.code || null,
    categoryLabel: typeLabel,
    isJobOrder: category?.code === "jo_cos",
    sex: person?.sex ? String(person.sex).trim() : null,
  };
};

const genderMismatch = (restriction, sex) => {
  const r = String(restriction || "").trim().toLowerCase();
  if (!r || !sex) return false; // unknown gender is not blocked (most personnel records have none yet)
  const s = String(sex).trim().toLowerCase();
  if (r === "male") return !(s === "male" || s === "m");
  if (r === "female") return !(s === "female" || s === "f");
  return false;
};

/** Throws when the employee may not file `leaveRow` (JO/COS, or gender restriction). */
const assertEligibleToFile = async (employeeNumber, leaveRow) => {
  const p = await fetchEmployeeProfile(employeeNumber);
  if (p.isJobOrder) {
    throw new LeaveRequestRuleError(
      403,
      "NOT_ELIGIBLE",
      `Job Order / Contract of Service workers have no leave benefits (CSC-COA-DBM JC 1 s.2017)${p.categoryLabel ? ` — category: ${p.categoryLabel}` : ""}.`,
    );
  }
  if (genderMismatch(leaveRow?.gender_restriction, p.sex)) {
    throw new LeaveRequestRuleError(
      403,
      "NOT_ELIGIBLE",
      `${leaveRow.leave_description || leaveRow.leave_code} is for ${String(leaveRow.gender_restriction).toLowerCase()} employees only.`,
    );
  }
  return p;
};

// ── Filing notices (warnings only) ──────────────────────────────────────────────
const filingNotices = (leaveCode, dates, today = new Date()) => {
  const code = up(leaveCode);
  const list = [...(dates || [])].map((d) => String(d).slice(0, 10)).sort();
  const notes = [];
  if (!list.length) return notes;
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (code === "VL") {
    const lead = Math.round((parseIso(list[0]) - t0) / 86400000);
    if (lead < 5) {
      notes.push({
        code: "VL_SHORT_NOTICE",
        message: `Vacation leave should be filed at least 5 days ahead (CSC MC 41 s.1998, Sec. 51). This one is filed ${lead < 0 ? "after the date" : `${lead} day(s) ahead`}.`,
      });
    }
  }
  if (code === "SL" && list.length > 5) {
    notes.push({
      code: "SL_MEDICAL_CERTIFICATE",
      message: `Sick leave of more than 5 days needs a medical certificate (CSC MC 41 s.1998, Sec. 53). ${list.length} days filed.`,
    });
  }
  return notes;
};

// ── Payroll lock ────────────────────────────────────────────────────────────────
/** Month names (e.g. "February 2026") among `dates` that are already in Payroll Processing. */
const findPayrollLockedMonths = async (employeeNumber, dates) => {
  const emp = String(employeeNumber || "").trim();
  const months = [...new Set((dates || []).map((d) => String(d).slice(0, 7)).filter((s) => /^\d{4}-\d{2}$/.test(s)))];
  if (!emp || !months.length) return [];
  const bounds = months.map((ym) => {
    const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
    return [`${ym}-01`, `${ym}-${pad2(new Date(y, m, 0).getDate())}`];
  });
  const rows = await query(
    `SELECT DISTINCT LEFT(startDate, 7) AS ym FROM payroll_processing
      WHERE TRIM(CAST(employeeNumber AS CHAR)) IN (?, ?)
        AND (${bounds.map(() => "(LEFT(startDate,10) = ? AND LEFT(endDate,10) = ?)").join(" OR ")})`,
    [emp, emp.replace(/^0+/, "") || emp, ...bounds.flat()],
  );
  return rows
    .map((r) => {
      const [y, m] = String(r.ym).split("-").map((x) => parseInt(x, 10));
      return MONTHS[m - 1] ? `${MONTHS[m - 1]} ${y}` : null;
    })
    .filter(Boolean);
};

const assertNotPayrollLocked = async (employeeNumber, dates, verb) => {
  const locked = await findPayrollLockedMonths(employeeNumber, dates);
  if (locked.length) {
    throw new LeaveRequestRuleError(
      409,
      "PAYROLL_LOCKED",
      `Cannot ${verb}: ${locked.join(", ")} is already in Payroll Processing. Remove it there first.`,
    );
  }
};

module.exports = {
  LeaveRequestRuleError,
  allowedChargeCodes,
  assertChargeAllowed,
  findNonWorkingDates,
  describeCalendar,
  fetchEmployeeProfile,
  assertEligibleToFile,
  filingNotices,
  findPayrollLockedMonths,
  assertNotPayrollLocked,
};
