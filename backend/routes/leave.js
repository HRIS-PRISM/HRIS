const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const {
  logAudit,
  authenticateToken,
  requireAdmin,
  requireSelfOrAdmin,
  isAdminRole,
  employeeNumbersMatch,
} = require("../middleware/auth");
const { notifyAttendanceChanged } = require("../socket/socketService");
const {
  SALARY_VALUE: DEDUCTION_SALARY,
  buildHalfDayPolicySuggestionCore,
} = require("../services/deductionPolicyService");
const {
  getPromiseConnection,
  insertCreditUsageLine,
  refreshLeaveAssignmentCacheFromLedger,
  fetchLedgerSumForAssignment,
} = require("../services/leaveCreditUsageService");
const attendanceWriter = require("../services/attendanceResultWriter");
const { getCtoCreditRunningTotals } = require("../services/ctoCreditRunningTotals");
const { appendCtoDeductionSnapshotRowAsync } = require("../services/ctoLedgerSnapshots");
const {
  getServiceCreditRunningTotals,
  getScRemainingHoursTotal,
} = require("../services/serviceCreditRunningTotals");
const {
  toNum,
  getActivePeriods,
  sortPeriodsDesc,
  getLeaveTypeStatsActive,
  getPriorPeriodCarryForwardHoursForEmployee,
  recomputeAssignmentLedgerFields,
  buildNewPeriodAssignmentFields,
  repairPeriodCarryForwardIfEmpty,
  isCommutedLocked,
  isPeriodVoided,
  assertPeriodIsCurrentDisplay,
  resolveCurrentDisplayPeriod,
  latestPeriodsByKey,
  loadLeavePeriodHistoryAsync,
} = require("../utils/leaveAssignmentBalanceUtils");
const { isApprovedHalfDayInReviewJson } = require("../utils/halfDayReviewUtils");
const { resolveHoursPerDay } = require("../services/hoursPerDayService");
const leaveRules = require("../services/leaveRequestRules");

let io;
router.setSocketIO = (socketIO) => {
  io = socketIO;
};

const emitLeaveChange = (eventName) => {
  if (io) {
    io.emit(eventName);
    console.log(`[Socket.IO] Emitted ${eventName}`);
  }
};

router.use(authenticateToken);

// Convert DB hour values to numeric hours.
// Supports numeric values (number or numeric string) and HH:MM[:SS] strings like "33:29:49".
const parseDbHours = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;

  const s = String(val).trim();
  if (!s) return 0;

  // Handle HH:MM or HH:MM:SS
  if (s.includes(":")) {
    const [hh, mm, ss] = s.split(":");
    const h = Number(hh) || 0;
    const m = Number(mm) || 0;
    const sec = Number(ss) || 0;
    return h + m / 60 + sec / 3600;
  }

  // Handle "1,234.50"
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const normalizeAssignmentRow = (r) => ({
  ...r,
  total_hours: parseDbHours(r.total_hours),
  remaining_hours: parseDbHours(r.remaining_hours),
  used_hours: parseDbHours(r.used_hours),
  carried_forward_hours: parseDbHours(r.carried_forward_hours),
  allocated_hours: parseDbHours(r.allocated_hours),
  commuted_hours: parseDbHours(r.commuted_hours),
  commuted_days: parseDbHours(r.commuted_days),
});

const semRank = (s) => {
  const v = String(s || "").toLowerCase().trim();
  if (!v) return 0;
  if (v.includes("2nd") || v === "2") return 3;
  if (v.includes("1st") || v === "1") return 2;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 1;
};

/**
 * HR modal context: employee employment type (label only). Hours/day comes from
 * resolveHoursPerDay (hoursPerDayService), never from leave_table.leave_hours, which is an
 * entitlement. Actual deduction is always what HR saves on leave_request
 * (deduction_applied_hours / hr_approval_rate).
 */
const fetchEmploymentTypeName = (employeeNumber) =>
  new Promise((resolve) => {
    db.query(
      `SELECT etc.typeName AS employment_type_name
       FROM users u
       LEFT JOIN employment_category ec
         ON CAST(ec.employeeNumber AS CHAR) = CAST(u.employeeNumber AS CHAR)
       LEFT JOIN employment_type_config etc
         ON etc.id = COALESCE(ec.employmentCategory, u.employmentCategory)
       WHERE CAST(u.employeeNumber AS CHAR) = CAST(? AS CHAR)
       LIMIT 1`,
      [employeeNumber],
      (err, rows) => resolve((!err && rows?.[0]?.employment_type_name) || null),
    );
  });

const getScRemainingHours = (employeeNumber, scType = "non_commutative") =>
  new Promise((resolve, reject) => {
    const emp = String(employeeNumber || "").trim();
    const st = String(scType || "non_commutative").trim() || "non_commutative";
    if (!emp) return resolve(0);
    getServiceCreditRunningTotals(emp, st, (err, cur) => {
      if (err) return reject(err);
      const n = Number(cur?.remaining);
      resolve(Number.isFinite(n) ? n : 0);
    });
  });

const getScRemainingHoursAllTypes = (employeeNumber) =>
  new Promise((resolve, reject) => {
    const emp = String(employeeNumber || "").trim();
    if (!emp) return resolve(0);
    getScRemainingHoursTotal(emp, (err, total) => {
      if (err) return reject(err);
      const n = Number(total);
      resolve(Number.isFinite(n) ? n : 0);
    });
  });

/**
 * Apply SC balance delta via service_credit ledger (NOT leave_assignment).
 * deltaHours > 0: deduct remaining; deltaHours < 0: restore remaining.
 */
const applyHoursDeltaAcrossServiceCredit = async ({
  req,
  employeeNumber,
  deltaHours,
  leaveDateOnly,
  requestId = null,
  reason,
  scType = "non_commutative",
  actorEmployeeNumber = null,
}) => {
  const emp = String(employeeNumber || "").trim();
  const st = String(scType || "non_commutative").trim() || "non_commutative";
  const abs = Math.abs(Number(deltaHours) || 0);
  if (!emp || !abs) return;

  const y = parseInt(String(leaveDateOnly || "").slice(0, 4), 10);
  const m = parseInt(String(leaveDateOnly || "").slice(5, 7), 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error("Invalid leave_date for SC ledger period");
  }

  const cur = await new Promise((resolve, reject) => {
    getServiceCreditRunningTotals(emp, st, (err, totals) =>
      err ? reject(err) : resolve(totals || { earned: 0, used: 0, remaining: 0 }),
    );
  });

  const remainingBefore = Number(cur.remaining) || 0;
  const earnedSnap = Number(cur.earned) || 0;
  const usedBefore = Number(cur.used) || 0;

  let apply = abs;
  if (deltaHours > 0) {
    if (remainingBefore + 1e-6 < abs) {
      throw new Error(
        `Insufficient Service Credit (SC) balance. Need ${abs} hours but only ${remainingBefore} available.`,
      );
    }
  } else {
    // restore: don't restore more than what has been used
    apply = Math.min(abs, Math.max(0, usedBefore));
    if (apply <= 0) return;
  }

  const remainingAfter = deltaHours > 0 ? remainingBefore - apply : remainingBefore + apply;
  const usedAfter = deltaHours > 0 ? usedBefore + apply : Math.max(0, usedBefore - apply);
  const action = deltaHours > 0 ? "offset" : "restore";
  const remarks = [
    requestId != null ? `leave_request:${requestId}` : null,
    "SC",
    action === "offset" ? "deduct" : "restore",
    leaveDateOnly ? String(leaveDateOnly) : null,
    reason || null,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 500);

  const newScId = await new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO service_credit
        (employeeNumber, sc_type, ot_hours_regular, ot_hours_holiday, ot_hours_night_diff, total_ot_hours,
         earned_hours, remaining_hours, used_hours, period_year, period_month, remarks, emp_category_snapshot)
       VALUES (?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emp,
        st,
        earnedSnap,
        remainingAfter,
        usedAfter,
        y,
        m,
        remarks,
        null,
      ],
      (err, res) => {
        if (err) return reject(err);
        resolve(res.insertId);
      },
    );
  });

  // Minimal column set (matches serviceCredit.js inserts; other columns may exist but are optional).
  db.query(
    `INSERT INTO service_credit_usage
     (service_credit_id, employeeNumber, action, hours_applied, target_leave_code)
     VALUES (?,?,?,?,?)`,
    [newScId, emp, action, apply, null],
    (e) => {
      if (e) console.error("[leave] SC usage insert:", e.message);
    },
  );
};

/** Normalize leave_date / DB date to YYYY-MM-DD */
const toMysqlDateOnly = (leaveDateRaw) => {
  if (leaveDateRaw == null) return null;
  if (leaveDateRaw instanceof Date && !isNaN(leaveDateRaw.getTime())) {
    const y = leaveDateRaw.getFullYear();
    const m = String(leaveDateRaw.getMonth() + 1).padStart(2, "0");
    const d = String(leaveDateRaw.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(leaveDateRaw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const dt = new Date(t);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
};

const punchFieldEmpty = (v) =>
  v == null ||
  String(v).trim() === "" ||
  String(v).trim().toUpperCase() === "N/A";

/**
 * When HR approves leave, ensure attendancerecord exists for that date with official
 * schedule times so DTR / modules show a full day (tardiness already zeroed in UI when ON LEAVE).
 * Only inserts or fills rows that have no punch data yet (does not overwrite real device punches).
 */
const syncApprovedLeaveToAttendanceRecord = (employeeNumber, leaveDateRaw) =>
  new Promise((resolve, reject) => {
    const leaveDate = toMysqlDateOnly(leaveDateRaw);
    const emp = String(employeeNumber || "").trim();
    if (!leaveDate || !emp) return resolve({ skipped: true, reason: "bad-args" });

    const otSql = `
      SELECT officialTimeIN, officialTimeOUT, officialBreaktimeIN, officialBreaktimeOUT
      FROM officialtime
      WHERE employeeID = ?
        AND day = DAYNAME(?)
        AND ? BETWEEN startDate AND endDate
      ORDER BY startDate DESC
      LIMIT 1
    `;
    db.query(otSql, [emp, leaveDate, leaveDate], (e1, otRows) => {
      if (e1) return reject(e1);
      const ot = otRows?.[0];
      if (
        !ot ||
        punchFieldEmpty(ot.officialTimeIN) ||
        punchFieldEmpty(ot.officialTimeOUT)
      ) {
        return resolve({ skipped: true, reason: "no-official-time" });
      }

      const timeIN = ot.officialTimeIN;
      const timeOUT = ot.officialTimeOUT;
      const breaktimeIN = ot.officialBreaktimeIN || null;
      const breaktimeOUT = ot.officialBreaktimeOUT || null;

      const exSql = `SELECT id, timeIN, breaktimeIN, breaktimeOUT, timeOUT FROM attendancerecord WHERE personID = ? AND date = ? LIMIT 1`;
      db.query(exSql, [emp, leaveDate], (e2, exRows) => {
        if (e2) return reject(e2);
        const ex = exRows?.[0];

        const notifyUpdated = (recordId) => {
          notifyAttendanceChanged("updated", {
            scope: "leave-hr-approved",
            personIDs: [emp],
            recordIds: recordId ? [recordId] : [],
          });
        };

        if (ex) {
          const allEmpty =
            punchFieldEmpty(ex.timeIN) &&
            punchFieldEmpty(ex.breaktimeIN) &&
            punchFieldEmpty(ex.breaktimeOUT) &&
            punchFieldEmpty(ex.timeOUT);
          if (!allEmpty) {
            return resolve({ skipped: true, reason: "existing-punches" });
          }
          const up = `UPDATE attendancerecord SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ? WHERE id = ?`;
          db.query(
            up,
            [timeIN, breaktimeIN, breaktimeOUT, timeOUT, ex.id],
            (e3) => {
              if (e3) return reject(e3);
              notifyUpdated(ex.id);
              resolve({ updated: true });
            },
          );
          return;
        }

        db.query(`SELECT DAYNAME(?) AS dow`, [leaveDate], (e4, drows) => {
          if (e4) return reject(e4);
          const dow = drows?.[0]?.dow || "Monday";
          const ins = `INSERT INTO attendancerecord (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT) VALUES (?, ?, ?, ?, ?, ?, ?)`;
          db.query(
            ins,
            [emp, leaveDate, dow, timeIN, breaktimeIN, breaktimeOUT, timeOUT],
            (e5) => {
              if (e5) return reject(e5);
              notifyAttendanceChanged("updated", {
                scope: "leave-hr-approved",
                personIDs: [emp],
              });
              resolve({ inserted: true });
            },
          );
        });
      });
    });
  });

const getLeaveAssignmentsForCode = (employeeNumber, leave_code) =>
  new Promise((resolve) => {
    db.query(
      `SELECT *
       FROM leave_assignment
       WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
       ORDER BY period_year DESC,
         CASE
           WHEN period_semester IN ('2nd','2nd semester','2') THEN 3
           WHEN period_semester IN ('1st','1st semester','1') THEN 2
           ELSE 1
         END DESC,
         id DESC`,
      [employeeNumber, leave_code],
      (err, rows) => {
        if (err) return resolve([]);
        resolve(Array.isArray(rows) ? rows.map(normalizeAssignmentRow) : []);
      },
    );
  });

/** Matches Assignment Management: latest active period only (not SUM of all historical rows). */
const getTotalRemainingHours = async (employeeNumber, leave_code) => {
  const rows = await getLeaveAssignmentsForCode(employeeNumber, leave_code);
  return getLeaveTypeStatsActive(rows).remainingHours;
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value ?? null);
  } catch (_e) {
    return null;
  }
};

const nearlyEqual = (a, b, tolerance = 0.0001) => {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.abs(x - y) <= tolerance;
};

const getActorEmployeeNumber = (req, fallback = null) => {
  if (req.user?.employeeNumber) return String(req.user.employeeNumber);

  const authHeader = req.headers?.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded?.employeeNumber) return String(decoded.employeeNumber);
      if (decoded?.username) return String(decoded.username);
    } catch (err) {
      console.warn("[leave] Failed to decode auth token:", err.message);
    }
  }

  return fallback ? String(fallback) : "unknown";
};

const buildDeductionSuggestion = async ({
  employeeNumber,
  leave_code,
  leave_date = null,
  has_leave_form = true,
  is_half_day_absence = false,
  requested_rate_decimal = null,
}) => {
  const hasLeaveForm = has_leave_form !== false;
  const isHalfDayAbsence = Boolean(is_half_day_absence);

  const suggestedLeaveCode = hasLeaveForm
    ? leave_code
    : isHalfDayAbsence
      ? "VL"
      : leave_code || "VL";

  const { hoursPerDay } = await resolveHoursPerDay(employeeNumber);

  const requestedRate = parseFloat(requested_rate_decimal);
  const defaultRate = isHalfDayAbsence ? 0.5 : 1;
  const recommendedRate =
    Number.isFinite(requestedRate) && requestedRate > 0
      ? requestedRate
      : defaultRate;
  const recommendedHours = Number((recommendedRate * hoursPerDay).toFixed(4));

  const availableHours = suggestedLeaveCode
    ? await getTotalRemainingHours(employeeNumber, suggestedLeaveCode)
    : 0;
  let hasSufficientBalance = availableHours >= recommendedHours;
  let recommendedChargeTo = hasSufficientBalance
    ? suggestedLeaveCode
    : DEDUCTION_SALARY;
  let fallbackNote = null;
  // CSC MC 41 s.1998, Sec. 56: sick leave may be charged to VL once SL runs out.
  if (!hasSufficientBalance && hasLeaveForm && suggestedLeaveCode) {
    for (const alt of leaveRules.allowedChargeCodes(suggestedLeaveCode).slice(1)) {
      const altHours = await getTotalRemainingHours(employeeNumber, alt);
      if (altHours >= recommendedHours) {
        recommendedChargeTo = alt;
        hasSufficientBalance = true;
        fallbackNote = `${String(suggestedLeaveCode).toUpperCase()} balance is short; charged to ${alt} (CSC MC 41 s.1998, Sec. 56).`;
        break;
      }
    }
  }

  return {
    employeeNumber: String(employeeNumber || ""),
    leave_code: leave_code || null,
    leave_date: toMysqlDateOnly(leave_date),
    has_leave_form: hasLeaveForm,
    is_half_day_absence: isHalfDayAbsence,
    recommended_leave_code: suggestedLeaveCode || null,
    recommended_charge_to: recommendedChargeTo,
    recommended_rate_decimal: Number(recommendedRate.toFixed(3)),
    recommended_hours: recommendedHours,
    hours_per_day: Number(hoursPerDay.toFixed(4)),
    available_hours: Number((availableHours || 0).toFixed(4)),
    has_sufficient_balance: hasSufficientBalance,
    recommendation_reason: fallbackNote
      ? fallbackNote
      : hasLeaveForm
      ? "Leave form exists; prefill based on selected leave type."
      : isHalfDayAbsence
        ? "No leave form + half-day absence; prefill VL 0.5 day."
        : "No leave form; default prefill applied.",
  };
};

const getFiledLeaveRequestForDate = ({ employeeNumber, leave_date }) =>
  new Promise((resolve, reject) => {
    const dateOnly = toMysqlDateOnly(leave_date);
    if (!employeeNumber || !dateOnly) return resolve(null);
    db.query(
      `SELECT lr.id, lr.leave_code, lr.status, lt.leave_description
       FROM leave_request lr
       LEFT JOIN leave_table lt ON TRIM(lt.leave_code) = TRIM(lr.leave_code)
       WHERE CAST(lr.employeeNumber AS CHAR) = CAST(? AS CHAR)
         AND DATE(lr.leave_date) = DATE(?)
         AND lr.status IN (0, 1, 2)
       ORDER BY lr.status DESC, lr.id DESC
       LIMIT 1`,
      [employeeNumber, dateOnly],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows?.[0] || null);
      },
    );
  });

/** Latest CTO snapshot remaining (aligned with ctoCreditRunningTotals / earnings module). */
const getCtoRemainingHours = (employeeNumber) =>
  new Promise((resolve) => {
    const emp = String(employeeNumber || "").trim();
    if (!emp) return resolve(0);
    getCtoCreditRunningTotals(emp, (err, cur) => {
      if (err) return resolve(0);
      const n = Number(cur?.remaining);
      resolve(Number.isFinite(n) ? n : 0);
    });
  });

const buildHalfDayPolicySuggestion = async ({
  employeeNumber,
  leave_date,
  preferred_charge_to = null,
}) => {
  const core = await buildHalfDayPolicySuggestionCore({
    employeeNumber,
    leave_date: toMysqlDateOnly(leave_date),
    preferred_charge_to,
    getFiledLeaveRequestForDate,
  });
  return core;
};

const insertDeductionDecisionLog = ({
  leaveRequestId = null,
  employeeNumber,
  leave_code = null,
  leave_date = null,
  decision = "accepted",
  decisionSource = "hr_approval",
  actorEmployeeNumber = null,
  systemRecommendation = null,
  finalApplied = null,
  overrideReason = null,
}) =>
  new Promise((resolve) => {
    const sql = `
      INSERT INTO deduction_decision_log (
        leave_request_id,
        employeeNumber,
        leave_code,
        leave_date,
        decision,
        decision_source,
        actor_employeeNumber,
        system_recommendation_json,
        final_applied_json,
        override_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(
      sql,
      [
        leaveRequestId,
        String(employeeNumber || ""),
        leave_code || null,
        toMysqlDateOnly(leave_date),
        decision || "accepted",
        decisionSource || "hr_approval",
        actorEmployeeNumber ? String(actorEmployeeNumber) : null,
        safeJsonStringify(systemRecommendation),
        safeJsonStringify(finalApplied),
        overrideReason || null,
      ],
      (err, result) => {
        if (err) {
          console.error("[leave] Failed to insert deduction decision log:", err.message);
          return resolve(null);
        }
        resolve(result && result.insertId != null ? result.insertId : null);
      },
    );
  });

/** Half-day policy applies are logged via transaction_table + audit_log (leave_transaction) only;
 *  earnings_audit_log is reserved for leave / SC / CTO ledger rows. */

/** Mirrors POST /api/leave-salary-shortfall so SalaryShortfallRegistry lists half-day salary applies. */
const insertLeaveSalaryShortfallForHalfDaySalary = ({
  employeeNumber,
  leaveDateOnly,
  shortfallDaysDecimal,
  shortfallHours,
  decisionLogId,
}) =>
  new Promise((resolve) => {
    const s = String(leaveDateOnly || "").slice(0, 10);
    const parts = s.split("-");
    const py = parseInt(parts[0], 10);
    const pm = parseInt(parts[1], 10);
    if (!Number.isFinite(py) || !Number.isFinite(pm) || pm < 1 || pm > 12) {
      return resolve();
    }
    const daysFromPolicy = Math.abs(Number(shortfallDaysDecimal));
    const hrsIn = Number(shortfallHours);
    const posDays =
      daysFromPolicy > 0
        ? Number(daysFromPolicy.toFixed(6))
        : Number.isFinite(hrsIn) && hrsIn > 0
          ? Number((hrsIn / 8).toFixed(6))
          : 0;
    if (!(posDays > 0)) return resolve();
    const posHrs =
      Number.isFinite(hrsIn) && hrsIn > 0
        ? Number(hrsIn.toFixed(6))
        : Number((posDays * 8).toFixed(6));
    const negDays = Number((-posDays).toFixed(6));
    const remarks = `Half-day attendance charged to salary — date ${s}${
      decisionLogId != null ? ` (policy ref #${decisionLogId})` : ""
    }`;
    db.query(
      `INSERT INTO leave_salary_shortfall (
        employee_number, period_year, period_month,
        negative_balance_days, shortfall_days, shortfall_hours,
        leave_code, entry_type, leave_earning_id, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        String(employeeNumber || ""),
        py,
        pm,
        negDays,
        posDays,
        posHrs,
        "HALF_DAY",
        "HALF_DAY_POLICY_SALARY",
        remarks.slice(0, 4000),
      ],
      (err) => {
        if (err) {
          console.error("[leave] leave_salary_shortfall insert (half-day salary):", err.message);
        }
        resolve();
      },
    );
  });

const getHalfDayDeductionAppliedLogs = ({
  employeeNumber,
  leave_code,
  leave_date,
  decisionSource = "half_day_policy_manual_apply",
}) =>
  new Promise((resolve) => {
    const sql = `
      SELECT id, decision, decision_source, leave_date
      FROM deduction_decision_log
      WHERE employeeNumber = ?
        AND leave_code = ?
        AND leave_date = ?
        AND decision_source = ?
        AND decision IN ('accepted','overridden')
      ORDER BY id DESC
    `;
    db.query(
      sql,
      [
        String(employeeNumber || ""),
        String(leave_code || ""),
        toMysqlDateOnly(leave_date),
        decisionSource,
      ],
      (err, rows) => {
        if (err) {
          console.error("[leave] Failed to fetch half-day applied logs:", err.message);
          return resolve([]);
        }
        resolve(Array.isArray(rows) ? rows : []);
      },
    );
  });

const getHalfDayDeductionAppliedDates = ({
  employeeNumber,
  leave_code = "VL",
  startDate,
  endDate,
  decisionSource = "half_day_policy_manual_apply",
}) =>
  new Promise((resolve) => {
    const allCodes =
      !leave_code ||
      String(leave_code).trim() === "*" ||
      String(leave_code).trim().toUpperCase() === "__ALL__";
    const sql = `
      SELECT DISTINCT DATE_FORMAT(leave_date, '%Y-%m-%d') AS leave_date
      FROM deduction_decision_log
      WHERE employeeNumber = ?
        ${allCodes ? "" : "AND leave_code = ?"}
        AND decision_source = ?
        AND decision IN ('accepted','overridden')
        AND leave_date BETWEEN ? AND ?
      ORDER BY leave_date ASC
    `;
    const params = allCodes
      ? [
          String(employeeNumber || ""),
          decisionSource,
          toMysqlDateOnly(startDate),
          toMysqlDateOnly(endDate),
        ]
      : [
          String(employeeNumber || ""),
          String(leave_code || ""),
          decisionSource,
          toMysqlDateOnly(startDate),
          toMysqlDateOnly(endDate),
        ];
    db.query(
      sql,
      params,
      (err, rows) => {
        if (err) {
          console.error("[leave] Failed to fetch half-day applied dates:", err.message);
          return resolve([]);
        }
        resolve(
          (Array.isArray(rows) ? rows : [])
            .map((r) => r?.leave_date)
            .filter(Boolean),
        );
      },
    );
  });

/** Business-rule failure carrying the HTTP status to return (e.g. 409 insufficient credits). */
class LeaveRuleError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const periodFieldsOf = (row) => {
  let periodMonth = null;
  if (row.period_semester != null && String(row.period_semester).trim() !== "") {
    const n = parseInt(String(row.period_semester).replace(/\D/g, "") || "0", 10);
    periodMonth = Number.isFinite(n) && n > 0 ? n : null;
  }
  const y = row.period_year != null ? parseInt(row.period_year, 10) : NaN;
  return { period_year: Number.isFinite(y) ? y : null, period_month: periodMonth };
};

/**
 * Periods that predate the ledger keep usage only in leave_assignment.used_hours. Before the
 * first ledger line touches such a period, write that usage as a LEGACY_OPENING line (same
 * convention as scripts/backfill_leave_credit_usage.js) so the ledger total stays correct.
 */
const ensureLegacyOpeningLine = async (conn, assignmentId, lockedRow, employeeNumber, leave_code) => {
  const legacyUsed = parseDbHours(lockedRow.used_hours) || 0;
  if (legacyUsed <= 0) return;
  const [cnt] = await conn.execute(
    `SELECT COUNT(*) AS c FROM leave_credit_usage
     WHERE leave_assignment_id = ? AND LOWER(source_type) <> 'commutation'`,
    [assignmentId],
  );
  if ((parseInt(cnt?.[0]?.c, 10) || 0) > 0) return;
  await insertCreditUsageLine(conn, {
    leave_assignment_id: assignmentId,
    employee_number: employeeNumber,
    leave_code,
    ...periodFieldsOf(lockedRow),
    hours_delta: -legacyUsed,
    source_type: "LEGACY_OPENING",
    source_id: null,
    remarks: "Materialized from leave_assignment.used_hours before first ledger entry",
    created_by: "system",
  });
};

/**
 * Deduct (deltaHours > 0) from, or restore (deltaHours < 0) to, the CURRENT active period.
 * Prior periods are never charged: their remaining was already carried into the current
 * period's opening balance, so charging them would consume the same credits twice.
 * A deduction larger than the available balance is rejected (409), never truncated.
 *
 * Pass `conn` to join the caller's transaction; pass `afterCommit` (array) to defer the
 * audit entry until the caller commits. Returns the hours actually applied.
 */
const applyHoursDeltaAcrossAssignments = async ({
  req,
  actorEmployeeNumber,
  employeeNumber,
  leave_code,
  deltaHours,
  requestId = null,
  reason,
  sourceType = null,
  conn: outerConn = null,
  afterCommit = null,
}) => {
  const abs = Math.abs(Number(deltaHours) || 0);
  if (!employeeNumber || !leave_code || !abs) return 0;

  const allRows = await getLeaveAssignmentsForCode(employeeNumber, leave_code);
  const current = sortPeriodsDesc(getActivePeriods(allRows))[0];
  if (!current) {
    if (Number(deltaHours) > 0) {
      throw new LeaveRuleError(
        409,
        "NO_ACTIVE_ASSIGNMENT",
        `No active leave_assignment for leave code "${leave_code}". Assign credits first or choose a different charge-to balance.`,
      );
    }
    return 0;
  }

  const resolvedSourceType =
    sourceType ||
    (requestId != null ? "LEAVE_REQUEST" : "LEAVE_BALANCE_ADJUSTMENT");
  const createdBy = String(actorEmployeeNumber || getActorEmployeeNumber(req));

  const conn = outerConn || (await getPromiseConnection());
  const ownsTx = !outerConn;
  try {
    if (ownsTx) await conn.beginTransaction();

    const [freshRows] = await conn.execute(
      `SELECT remaining_hours, used_hours, period_year, period_semester
       FROM leave_assignment WHERE id = ? FOR UPDATE`,
      [current.id],
    );
    const fr = freshRows?.[0];
    if (!fr) {
      throw new LeaveRuleError(409, "NO_ACTIVE_ASSIGNMENT", `Leave assignment for "${leave_code}" not found.`);
    }
    const curRem = parseDbHours(fr.remaining_hours) || 0;
    const curUsed = parseDbHours(fr.used_hours) || 0;

    let applied;
    if (deltaHours > 0) {
      if (curRem + 1e-6 < abs) {
        throw new LeaveRuleError(
          409,
          "INSUFFICIENT_CREDITS",
          `Insufficient ${leave_code} balance: ${Number(abs.toFixed(4))} hours requested but only ${curRem.toFixed(3)} hours available.`,
        );
      }
      applied = abs;
    } else {
      applied = Math.min(abs, curUsed);
      if (applied <= 0) {
        if (ownsTx) await conn.commit();
        return 0;
      }
    }
    const signedDelta = deltaHours > 0 ? -applied : applied;

    await ensureLegacyOpeningLine(conn, current.id, fr, employeeNumber, leave_code);
    await insertCreditUsageLine(conn, {
      leave_assignment_id: current.id,
      employee_number: employeeNumber,
      leave_code,
      ...periodFieldsOf(fr),
      hours_delta: signedDelta,
      source_type: resolvedSourceType,
      source_id: requestId,
      remarks: reason || null,
      created_by: createdBy,
    });
    const refreshed = await refreshLeaveAssignmentCacheFromLedger(conn, current.id);

    const audit = () =>
      auditLeaveBalanceAdjustment({
        req,
        actorEmployeeNumber,
        employeeNumber,
        leave_code,
        requestId,
        reason,
        oldRemaining: curRem,
        newRemaining: refreshed?.remaining ?? curRem + signedDelta,
        oldUsed: curUsed,
        newUsed: refreshed?.used ?? curUsed - signedDelta,
        deltaHours: signedDelta,
        assignmentRowId: current.id,
      });

    if (ownsTx) {
      await conn.commit();
      audit();
    } else if (Array.isArray(afterCommit)) {
      afterCommit.push(audit);
    }
    return applied;
  } catch (e) {
    if (ownsTx) await conn.rollback();
    throw e;
  } finally {
    if (ownsTx) conn.release();
  }
};

/**
 * Reverse every active ledger line posted for a leave request, on the exact assignment rows
 * it was charged to. Inserts one opposite line per assignment so the request nets to zero;
 * running it again is a no-op. Returns total hours restored.
 */
const reverseLeaveRequestLedger = async ({
  conn,
  requestId,
  employeeNumber,
  actorEmployeeNumber,
  reason,
  afterCommit = null,
  req = null,
}) => {
  const [lines] = await conn.execute(
    `SELECT leave_assignment_id, leave_code, SUM(hours_delta) AS net
     FROM leave_credit_usage
     WHERE source_type = 'LEAVE_REQUEST' AND source_id = ? AND voided_at IS NULL
     GROUP BY leave_assignment_id, leave_code`,
    [requestId],
  );
  let restored = 0;
  for (const line of lines || []) {
    const net = parseDbHours(line.net);
    if (net >= -1e-6) continue;
    const [locked] = await conn.execute(
      `SELECT remaining_hours, used_hours, period_year, period_semester
       FROM leave_assignment WHERE id = ? FOR UPDATE`,
      [line.leave_assignment_id],
    );
    const fr = locked?.[0];
    if (!fr) continue;
    const putBack = -net;
    await insertCreditUsageLine(conn, {
      leave_assignment_id: line.leave_assignment_id,
      employee_number: employeeNumber,
      leave_code: line.leave_code,
      ...periodFieldsOf(fr),
      hours_delta: putBack,
      source_type: "LEAVE_REQUEST",
      source_id: requestId,
      remarks: reason || null,
      metadata: { reversal: true },
      created_by: String(actorEmployeeNumber || "unknown"),
    });
    const refreshed = await refreshLeaveAssignmentCacheFromLedger(conn, line.leave_assignment_id);
    restored += putBack;
    const audit = () =>
      auditLeaveBalanceAdjustment({
        req,
        actorEmployeeNumber,
        employeeNumber,
        leave_code: line.leave_code,
        requestId,
        reason,
        oldRemaining: parseDbHours(fr.remaining_hours),
        newRemaining: refreshed?.remaining,
        oldUsed: parseDbHours(fr.used_hours),
        newUsed: refreshed?.used,
        deltaHours: putBack,
        assignmentRowId: line.leave_assignment_id,
      });
    if (Array.isArray(afterCommit)) afterCommit.push(audit);
    else audit();
  }
  return restored;
};

/** Whether any ledger line (active or voided) was ever posted for this leave request. */
const hasLeaveRequestLedgerHistory = async (conn, requestId) => {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS c FROM leave_credit_usage WHERE source_type = 'LEAVE_REQUEST' AND source_id = ?`,
    [requestId],
  );
  return (parseInt(rows?.[0]?.c, 10) || 0) > 0;
};

const insertTransactionLog = (
  employeeId,
  message,
  actorEmployeeNumber = null,
  auditDetailsPayload = null,
) =>
  new Promise((resolve) => {
    if (!employeeId || !message) return resolve();

    db.query(
      "INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)",
      [employeeId, message],
      (err, result) => {
        if (err) {
          console.error("[leave] Failed to insert transaction log:", err.message);
          return resolve();
        }
        // Mirror to audit_log so it appears in the Audit Trail in real-time
        try {
          let detailsJson = null;
          if (auditDetailsPayload != null) {
            try {
              detailsJson =
                typeof auditDetailsPayload === "string"
                  ? auditDetailsPayload
                  : JSON.stringify({
                      message,
                      ...auditDetailsPayload,
                    });
            } catch (e) {
              detailsJson = JSON.stringify({ message });
            }
          }
          const auditLabel =
            (auditDetailsPayload &&
              typeof auditDetailsPayload === "object" &&
              auditDetailsPayload.audit_action) ||
            (auditDetailsPayload != null
              ? "Half-day deduction applied"
              : message);
          logAudit(
            { employeeNumber: actorEmployeeNumber || employeeId },
            auditLabel,
            "leave_transaction",
            result.insertId,
            employeeId,
            detailsJson,
          );
        } catch (e) {
          console.error("[leave] Failed to mirror to audit_log:", e.message);
        }
        resolve();
      },
    );
  });

const getEmployeeFullName = (employeeNumber) =>
  new Promise((resolve) => {
    if (!employeeNumber) return resolve("");

    db.query(
      `SELECT CONCAT_WS(' ', firstName, middleName, lastName, nameExtension) AS fullName
       FROM person_table
       WHERE agencyEmployeeNum = ?
       LIMIT 1`,
      [employeeNumber],
      (err, rows) => {
        if (err) {
          console.error("[leave] Failed to fetch employee full name:", err.message);
          return resolve("");
        }
        resolve((rows && rows[0] && rows[0].fullName) || "");
      },
    );
  });

const formatUserDisplayName = (employeeNumber, fullName) => {
  const emp = employeeNumber ? String(employeeNumber) : "unknown";
  const name = (fullName || "").trim();
  return name ? `${name} (${emp})` : emp;
};

/** Same pattern as earnings transaction logs (before → after, signed delta). */
const formatBalanceUpdatedSuffix = (beforeH, afterH, deltaH) => {
  const before = Number(beforeH || 0);
  const after = Number(afterH || 0);
  const delta = Number(deltaH || 0);
  const sign = delta >= 0 ? "−" : "+";
  return ` Balance updated: ${before.toFixed(3)} hrs → ${after.toFixed(3)} hrs (${sign}${Math.abs(delta).toFixed(3)} hrs).`;
};

/** HR modal "charge to" — may differ from leave_code on the filed request (e.g. Half Day form → VL balance). */
const resolveHrDeductionChargeCode = ({
  charge_to = null,
  decision_context = null,
  requestLeaveCode = null,
  systemRecommendation = null,
}) => {
  const raw =
    charge_to ||
    decision_context?.charge_to ||
    systemRecommendation?.recommended_charge_to ||
    requestLeaveCode;
  const code = String(raw || requestLeaveCode || "").trim();
  return code || String(requestLeaveCode || "").trim();
};

const buildLeaveTransactionMessage = ({
  action,
  actorDisplayName,
  requesterDisplayName,
  leaveDesc,
  leaveDates,
}) => {
  if (!action) return null;

  const dateStr = (() => {
    if (!leaveDates) return '';
    const arr = Array.isArray(leaveDates)
      ? leaveDates.filter(Boolean)
      : String(leaveDates).split(',').map((s) => s.trim()).filter(Boolean);
    if (!arr.length) return '';
    if (arr.length === 1) return ` on ${arr[0]}`;
    const sorted = [...arr].sort();
    return ` from ${sorted[0]} to ${sorted[sorted.length - 1]} (${arr.length} day(s))`;
  })();

  if (action === "request") {
    if (
      requesterDisplayName &&
      actorDisplayName &&
      requesterDisplayName !== actorDisplayName
    ) {
      return `${actorDisplayName} submitted a ${leaveDesc} request${dateStr} for ${requesterDisplayName}.`;
    }
    return `${actorDisplayName} submitted a ${leaveDesc} request${dateStr}.`;
  }

  if (action === "denied") {
    return `${actorDisplayName} denied ${requesterDisplayName}'s ${leaveDesc} request.`;
  }

  if (action === "immediateSupervisor_approved") {
    return `Immediate Supervisor ${actorDisplayName} approved ${requesterDisplayName}'s ${leaveDesc} request.`;
  }

  if (action === "hr_approved") {
    return `HR Officer ${actorDisplayName} fully approved ${requesterDisplayName}'s ${leaveDesc} request.`;
  }

  if (action === "cancelled") {
    return `${actorDisplayName} cancelled their ${leaveDesc} request.`;
  }

  return null;
};

const statusToLeaveAction = (statusValue) => {
  const s = Number(statusValue);
  if (s === 1) return "immediateSupervisor_approved";
  if (s === 2) return "hr_approved";
  if (s === 3) return "denied";
  if (s === 4) return "cancelled";
  return null;
};

const auditLeaveBalanceAdjustment = ({
  req,
  actorEmployeeNumber,
  employeeNumber,
  leave_code,
  requestId = null,
  reason,
  oldRemaining,
  newRemaining,
  oldUsed,
  newUsed,
  deltaHours,
  assignmentRowId = null,
}) => {
  try {
    const details = {
      reason,
      source: "leave_request_status_change",
      request_id: requestId,
      employeeNumber,
      leave_code,
      delta_hours: deltaHours,
      before: {
        remaining_hours: oldRemaining,
        used_hours: oldUsed,
      },
      after: {
        remaining_hours: newRemaining,
        used_hours: newUsed,
      },
      assignment_row_id: assignmentRowId,
    };
    logAudit(
      { employeeNumber: actorEmployeeNumber },
      `Auto-adjust leave balance (${deltaHours >= 0 ? "+" : ""}${deltaHours} hrs)`,
      "leave_assignment",
      assignmentRowId,
      employeeNumber,
      details,
    );
  } catch (e) {
    console.error("[leave] Failed to audit leave balance adjustment:", e.message);
  }
};

// ============================================
// EMPLOYEES
// ============================================
router.get("/employees", requireAdmin, (req, res) => {
  const query = `
    SELECT u.employeeNumber, u.email, u.role,
      p.firstName, p.middleName, p.lastName, p.nameExtension,
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) as fullName
    FROM users u
    LEFT JOIN person_table p ON u.employeeNumber = p.agencyEmployeeNum
    WHERE u.role != 'superadmin'
    ORDER BY p.lastName, p.firstName
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching employees:", err);
      return res.status(500).json({ error: "Failed to fetch employees" });
    }
    res.json(results);
  });
});

// ============================================
// LEAVE TABLE
// ============================================
router.get("/leave_table", requireAdmin, (req, res) => {
  db.query("SELECT * FROM leave_table ORDER BY leave_code", (err, results) => {
    if (err)
      return res.status(500).json({ error: "Failed to fetch leave types" });
    res.json(results);
  });
});

const normalizeLeaveTableHours = (leave_hours) => {
  if (leave_hours === null || leave_hours === undefined || leave_hours === "") return 0;
  if (typeof leave_hours === "number")
    return Number.isFinite(leave_hours) ? leave_hours : 0;
  const n = parseFloat(String(leave_hours).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

router.post("/leave_table", requireAdmin, (req, res) => {
  const { leave_code, leave_description, leave_hours, gender_restriction } = req.body;
  const hoursVal = normalizeLeaveTableHours(leave_hours);
  const genderVal =
    gender_restriction && String(gender_restriction).trim()
      ? String(gender_restriction).trim()
      : null;
  db.query(
    "INSERT INTO leave_table (leave_code, leave_description, leave_hours, gender_restriction) VALUES (?, ?, ?, ?)",
    [leave_code, leave_description, hoursVal, genderVal],
    (err, result) => {
      if (err) {
        console.error("[leave_table] INSERT error:", err.code, err.sqlMessage || err.message);
        logAudit(
          { employeeNumber: getActorEmployeeNumber(req) },
          "Insert Failed",
          "leave_table",
          null,
          null,
        );
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ error: "A leave type with this code already exists." });
        }
        if (err.code === "ER_BAD_FIELD_ERROR") {
          return res.status(500).json({
            error:
              "Database schema is missing column gender_restriction on leave_table. Run backend/migrations/add_leave_table_gender_restriction.sql",
          });
        }
        return res.status(500).json({ error: "Failed to create leave type" });
      }
      logAudit({ employeeNumber: getActorEmployeeNumber(req) }, 'Insert', 'leave_table', result.insertId, null);
      res.json({
        id: result.insertId,
        leave_code,
        leave_description,
        leave_hours: hoursVal,
      });
    },
  );
});

router.put("/leave_table/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { leave_code, leave_description, leave_hours, gender_restriction } = req.body;
  const hoursVal = normalizeLeaveTableHours(leave_hours);
  const genderVal =
    gender_restriction && String(gender_restriction).trim()
      ? String(gender_restriction).trim()
      : null;
  db.query(
    "UPDATE leave_table SET leave_code = ?, leave_description = ?, leave_hours = ?, gender_restriction = ? WHERE id = ?",
    [leave_code, leave_description, hoursVal, genderVal, id],
    (err) => {
      if (err) {
        console.error("[leave_table] UPDATE error:", err.code, err.sqlMessage || err.message);
        logAudit(
          { employeeNumber: getActorEmployeeNumber(req) },
          "Update Failed",
          "leave_table",
          id,
          null,
        );
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ error: "A leave type with this code already exists." });
        }
        if (err.code === "ER_BAD_FIELD_ERROR") {
          return res.status(500).json({
            error:
              "Database schema is missing column gender_restriction on leave_table. Run backend/migrations/add_leave_table_gender_restriction.sql",
          });
        }
        return res.status(500).json({ error: "Failed to update leave type" });
      }
      logAudit({ employeeNumber: getActorEmployeeNumber(req) }, "Update", "leave_table", id, null);
      res.json({ id, leave_code, leave_description, leave_hours: hoursVal });
    },
  );
});

router.delete("/leave_table/:id", requireAdmin, (req, res) => {
  db.query("DELETE FROM leave_table WHERE id = ?", [req.params.id], (err) => {
    if (err) {
      logAudit({ employeeNumber: getActorEmployeeNumber(req) }, 'Delete Failed', 'leave_table', req.params.id, null);
      return res.status(500).json({ error: "Failed to delete leave type" });
    }
    logAudit({ employeeNumber: getActorEmployeeNumber(req) }, 'Delete', 'leave_table', req.params.id, null);
    res.json({ message: "Leave type deleted successfully" });
  });
});

// ============================================
// LEAVE ASSIGNMENT
// ============================================
router.get("/leave_assignment", requireAdmin, (req, res) => {
  const query = `
    SELECT la.id, la.employeeNumber, la.leave_code, la.total_hours, la.remaining_hours, la.used_hours,
      la.approve_date AS approved_date, la.carried_forward_hours, la.allocated_hours, la.period_year, la.period_semester,
      COALESCE(la.commuted, 0) AS commuted, la.voided_at,
      lc.commuted_hours, lc.commuted_days, lc.commutation_id,
      lt.leave_description, lt.leave_hours as default_hours,
      p.firstName, p.middleName, p.lastName, p.nameExtension,
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) as fullName
    FROM leave_assignment la
    LEFT JOIN (
      SELECT leave_assignment_id,
             MAX(id) AS commutation_id,
             MAX(commuted_hours) AS commuted_hours,
             MAX(commuted_days) AS commuted_days
      FROM leave_commutation
      WHERE status != 3
      GROUP BY leave_assignment_id
    ) lc ON lc.leave_assignment_id = la.id
    LEFT JOIN leave_table lt ON la.leave_code = lt.leave_code
    LEFT JOIN person_table p ON la.employeeNumber = p.agencyEmployeeNum
    ORDER BY p.lastName, p.firstName, la.leave_code
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("[GET /leave_assignment] DB Error:", err.message);
      return res
        .status(500)
        .json({ error: "Failed to fetch leave assignments: " + err.message });
    }
    // Normalize hour fields so frontend receives numeric hour values
    const out = Array.isArray(results) ? results.map(normalizeAssignmentRow) : results;
    res.json(out);
  });
});

router.get("/leave_assignment/employee/:employeeNumber", requireSelfOrAdmin('employeeNumber'), (req, res) => {
  const query = `
    SELECT la.id, la.employeeNumber, la.leave_code, la.total_hours, la.remaining_hours, la.used_hours,
      la.approve_date AS approved_date, la.carried_forward_hours, la.allocated_hours, la.period_year, la.period_semester,
      COALESCE(la.commuted, 0) AS commuted, la.voided_at,
      lc.commuted_hours, lc.commuted_days, lc.commutation_id,
      lt.leave_description
    FROM leave_assignment la
    LEFT JOIN (
      SELECT leave_assignment_id,
             MAX(id) AS commutation_id,
             MAX(commuted_hours) AS commuted_hours,
             MAX(commuted_days) AS commuted_days
      FROM leave_commutation
      WHERE status != 3
      GROUP BY leave_assignment_id
    ) lc ON lc.leave_assignment_id = la.id
    LEFT JOIN leave_table lt ON la.leave_code = lt.leave_code
    WHERE la.employeeNumber = ?
  `;
  db.query(query, [req.params.employeeNumber], (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Failed to fetch leave assignments" });
    const out = Array.isArray(results) ? results.map(normalizeAssignmentRow) : results;
    res.json(out);
  });
});

router.get(
  "/leave_assignment/calculate-carryforward/:employeeNumber/:leave_code",
  requireSelfOrAdmin('employeeNumber'),
  async (req, res) => {
    const { employeeNumber, leave_code } = req.params;
    const { period_year, period_month } = req.query;
    const targetYear = period_year ? parseInt(period_year, 10) : new Date().getFullYear();
    const targetMonth =
      period_month != null && String(period_month).trim() !== ""
        ? parseInt(period_month, 10)
        : null;

    try {
      const suggestedCarryForward = await getPriorPeriodCarryForwardHoursForEmployee(
        db,
        employeeNumber,
        leave_code,
        targetYear,
        targetMonth,
      );
      res.json({
        hasHistory: suggestedCarryForward > 0,
        suggestedCarryForward,
        previousPeriod: null,
      });
    } catch (err) {
      console.error("[GET calculate-carryforward]", err.message);
      res.status(500).json({ error: "Failed to calculate carry forward" });
    }
  },
);

router.post("/leave_assignment", requireAdmin, async (req, res) => {
  const {
    employeeNumber,
    leave_code,
    total_hours,
    allocated_hours,
    period_year,
    period_semester,
  } = req.body;

  const currentYear = period_year || new Date().getFullYear();
  const semester = period_semester ?? null;
  const semNum = semester != null && String(semester).trim() !== ""
    ? parseInt(String(semester), 10)
    : null;
  const targetMonth = Number.isFinite(semNum) && semNum > 0 ? semNum : null;

  const queryAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });

  try {
    const existing = await queryAsync(
  "SELECT id FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ? AND period_year = ? AND period_semester <=> ? AND voided_at IS NULL",
  [employeeNumber, leave_code, currentYear, semester],
);
if (existing.length > 0) {
  return res.status(400).json({
    error: "This employee already has an assignment for this leave type and period",
  });
}

    const openingBalance = await getPriorPeriodCarryForwardHoursForEmployee(
      db,
      employeeNumber,
      leave_code,
      currentYear,
      targetMonth,
    );

    let clientAllocated = null;
    const hasAllocated =
      allocated_hours !== undefined && allocated_hours !== null && allocated_hours !== "";
    const hasTotal =
      req.body.hasOwnProperty("total_hours") &&
      total_hours !== null &&
      total_hours !== undefined &&
      total_hours !== "";

    if (hasAllocated) {
      clientAllocated = Math.max(0, parseDbHours(allocated_hours));
    } else if (hasTotal) {
      clientAllocated = Math.max(0, parseDbHours(total_hours));
    }

    const fields = await buildNewPeriodAssignmentFields(db, {
      employeeNumber,
      leave_code,
      period_year: currentYear,
      period_semester: semester,
      allocated_hours: clientAllocated ?? openingBalance,
      used_hours: 0,
    });

    const insertResult = await new Promise((resolve, reject) => {
      db.query(
        `INSERT INTO leave_assignment
          (leave_code, employeeNumber, total_hours, remaining_hours, used_hours,
           approve_date, carried_forward_hours, allocated_hours, period_year, period_semester, earning_status)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
        [
          leave_code,
          employeeNumber,
          fields.total_hours,
          fields.remaining_hours,
          fields.used_hours,
          fields.carried_forward_hours,
          fields.allocated_hours,
          currentYear,
          semester,
          fields.earning_status,
        ],
        (err, result) => (err ? reject(err) : resolve(result)),
      );
    });

    const insertedId = insertResult.insertId;
    const actorEmpNum = getActorEmployeeNumber(req, employeeNumber);
    try {
      const [empName, actorName] = await Promise.all([
        getEmployeeFullName(String(employeeNumber)),
        getEmployeeFullName(actorEmpNum),
      ]);
      const ltRows = await queryAsync(
        "SELECT leave_description FROM leave_table WHERE leave_code = ? LIMIT 1",
        [leave_code],
      );
      const leaveDesc = ltRows[0]?.leave_description || leave_code;
      const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
      const empDisplay = formatUserDisplayName(String(employeeNumber), empName);
      logAudit(
        { employeeNumber: actorEmpNum },
        `Assign Leave - ${leaveDesc} (${fields.allocated_hours} hrs)`,
        "leave_assignment",
        insertedId,
        employeeNumber,
      );
      await insertTransactionLog(
        String(employeeNumber),
        `${actorDisplay} assigned ${leaveDesc} (${fields.allocated_hours} hrs) to ${empDisplay}`,
        actorEmpNum,
      );
    } catch (e) {
      console.error("[leave] Assign log error:", e.message);
    }

    emitLeaveChange("leaveAssignmentChanged");
    res.json({
      id: insertedId,
      leave_code,
      employeeNumber,
      total_hours: fields.total_hours,
      remaining_hours: fields.remaining_hours,
      used_hours: fields.used_hours,
      approved_date: null,
      carried_forward_hours: fields.carried_forward_hours,
      allocated_hours: fields.allocated_hours,
      period_year: currentYear,
      period_semester: semester,
      earning_status: fields.earning_status,
    });
  } catch (err) {
    console.error("[POST leave_assignment]", err.message);
    logAudit(
      { employeeNumber: getActorEmployeeNumber(req, employeeNumber) },
      "Assign Leave Failed",
      "leave_assignment",
      null,
      employeeNumber,
    );
    res.status(500).json({ error: "Failed to create leave assignment: " + err.message });
  }
});

router.put("/leave_assignment/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    employeeNumber,
    leave_code,
    allocated_hours,
    period_year,
    period_semester,
  } = req.body;

  const queryAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });

  try {
    const current = await queryAsync("SELECT * FROM leave_assignment WHERE id = ?", [id]);
    if (!current.length) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    const row = current[0];

    if (isCommutedLocked(row)) {
      return res.status(400).json({ error: "This assignment is commuted and cannot be modified" });
    }

    const newAllocated =
      allocated_hours !== undefined && allocated_hours !== ""
        ? parseDbHours(allocated_hours)
        : parseDbHours(row.allocated_hours);

    const currentUsed = parseDbHours(row.used_hours) || 0;
    const newYear = period_year !== undefined ? period_year : row.period_year;
    const newSemester =
      period_semester !== undefined ? period_semester : row.period_semester;

    let working = {
      ...row,
      employeeNumber: employeeNumber ?? row.employeeNumber,
      leave_code: leave_code ?? row.leave_code,
      allocated_hours: newAllocated,
      used_hours: currentUsed,
      period_year: newYear,
      period_semester: newSemester,
      carried_forward_hours: toNum(row.carried_forward_hours),
    };

    working = await repairPeriodCarryForwardIfEmpty(db, working);
    working.allocated_hours = Math.max(toNum(working.allocated_hours), newAllocated);

    const recomputed = await recomputeAssignmentLedgerFields(db, working, currentUsed);

    await queryAsync(
      `UPDATE leave_assignment SET
         leave_code = ?, employeeNumber = ?, total_hours = ?, remaining_hours = ?,
         used_hours = ?, carried_forward_hours = ?, allocated_hours = ?,
         period_year = ?, period_semester = ?, earning_status = ?
       WHERE id = ?`,
      [
        working.leave_code,
        working.employeeNumber,
        recomputed.total_hours,
        recomputed.remaining_hours,
        recomputed.used_hours,
        recomputed.carried_forward_hours,
        recomputed.allocated_hours,
        newYear,
        newSemester,
        recomputed.earning_status,
        id,
      ],
    );

    const actorEmpNum = getActorEmployeeNumber(req);
try {
      const [empName, actorName] = await Promise.all([
        getEmployeeFullName(String(working.employeeNumber)),
        getEmployeeFullName(actorEmpNum),
      ]);
      const ltRows = await queryAsync(
        "SELECT leave_description FROM leave_table WHERE leave_code = ? LIMIT 1",
        [working.leave_code],
      );
      const leaveDesc = ltRows[0]?.leave_description || working.leave_code;
      const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
      const empDisplay = formatUserDisplayName(String(working.employeeNumber), empName);

      // Capture before/after for the transaction log
      const beforeRemaining = parseDbHours(row.remaining_hours);
      const afterRemaining = recomputed.remaining_hours;
      const beforeAllocated = parseDbHours(row.allocated_hours);
      const afterAllocated = recomputed.allocated_hours;
      const deltaHrs = afterRemaining - beforeRemaining;
      const sign = deltaHrs >= 0 ? "+" : "−";
      const balanceSuffix = ` Balance updated: ${beforeRemaining.toFixed(3)} hrs → ${afterRemaining.toFixed(3)} hrs (${sign}${Math.abs(deltaHrs).toFixed(3)} hrs).`;

      logAudit(
        { employeeNumber: actorEmpNum },
        `Update Leave Assignment - ${leaveDesc} (${recomputed.allocated_hours} hrs)`,
        "leave_assignment",
        id,
        working.employeeNumber,
      );
      await insertTransactionLog(
        String(working.employeeNumber),
        `${actorDisplay} updated ${leaveDesc} assignment for ${empDisplay} (allocated: ${beforeAllocated.toFixed(3)} hrs → ${afterAllocated.toFixed(3)} hrs).${balanceSuffix}`,
        actorEmpNum,
      );
    } catch (e) {
      console.error("[leave] Update assignment log error:", e.message);
    }

    emitLeaveChange("leaveAssignmentChanged");
    res.json({
      id,
      leave_code: working.leave_code,
      employeeNumber: working.employeeNumber,
      total_hours: recomputed.total_hours,
      remaining_hours: recomputed.remaining_hours,
      used_hours: recomputed.used_hours,
      carried_forward_hours: 0,
      allocated_hours: recomputed.allocated_hours,
      period_year: newYear,
      period_semester: newSemester,
      earning_status: recomputed.earning_status,
    });
  } catch (err) {
    console.error("[PUT leave_assignment]", err.message);
    logAudit(
      { employeeNumber: getActorEmployeeNumber(req) },
      "Update Leave Assignment Failed",
      "leave_assignment",
      id,
      employeeNumber,
    );
    res.status(500).json({ error: "Failed to update leave assignment" });
  }
});

router.delete("/leave_assignment/:id", requireAdmin, (req, res) => {
  const actorEmpNum = getActorEmployeeNumber(req);
  // Fetch first so we have employee info for logging
  db.query(
    `SELECT la.employeeNumber, la.leave_code,
            (SELECT COUNT(*) FROM leave_credit_usage lcu WHERE lcu.leave_assignment_id = la.id) AS ledger_lines,
            (SELECT COUNT(*) FROM leave_earnings le
              WHERE le.employee_number = la.employeeNumber AND TRIM(le.leave_code) = TRIM(la.leave_code)
                AND le.period_year <=> la.period_year
                AND (le.period_month = la.period_semester OR (le.period_month IS NULL AND la.period_semester IS NULL))
                AND le.earn_status = 'approved' AND COALESCE(le.is_applied, 0) = 1
                AND COALESCE(le.voided, 0) = 0) AS applied_earnings
     FROM leave_assignment la WHERE la.id = ?`,
    [req.params.id],
    (fetchErr, rows) => {
      if (fetchErr) return res.status(500).json({ error: "Failed to load leave assignment" });
      const targetRecord = rows && rows[0] ? rows[0] : null;
      if (!targetRecord) return res.status(404).json({ error: "Leave assignment not found" });
      if (Number(targetRecord.ledger_lines) > 0 || Number(targetRecord.applied_earnings) > 0) {
        return res.status(409).json({
          error: "This period has posted deductions or earnings. Void the period instead so its history is kept.",
          code: "HAS_LEDGER_HISTORY",
        });
      }
      db.query(
        "DELETE FROM leave_assignment WHERE id = ?",
        [req.params.id],
        (err) => {
          if (err) {
            if (targetRecord) logAudit({ employeeNumber: actorEmpNum }, 'Delete Leave Assignment Failed', 'leave_assignment', req.params.id, targetRecord.employeeNumber);
            return res
              .status(500)
              .json({ error: "Failed to delete leave assignment" });
          }
          if (targetRecord) {
            (async () => {
              try {
                const [empName, actorName] = await Promise.all([
                  getEmployeeFullName(String(targetRecord.employeeNumber)),
                  getEmployeeFullName(actorEmpNum),
                ]);
                const leaveDesc = await new Promise(resolve =>
                  db.query('SELECT leave_description FROM leave_table WHERE leave_code = ? LIMIT 1', [targetRecord.leave_code], (e, r) =>
                    resolve((r && r[0] && r[0].leave_description) || targetRecord.leave_code)
                  )
                );
                const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
                const empDisplay = formatUserDisplayName(String(targetRecord.employeeNumber), empName);
                logAudit({ employeeNumber: actorEmpNum }, `Delete Leave Assignment - ${leaveDesc}`, 'leave_assignment', req.params.id, targetRecord.employeeNumber);
                await insertTransactionLog(String(targetRecord.employeeNumber), `${actorDisplay} deleted ${leaveDesc} assignment for ${empDisplay}`, actorEmpNum);
              } catch (e) { console.error('[leave] Delete assignment log error:', e.message); }
            })();
          }
          emitLeaveChange("leaveAssignmentChanged");
          res.json({ message: "Leave assignment deleted successfully" });
        },
      );
    },
  );
});

// ─── GET /leave_assignment/period-history ─────────────────────────────────────
router.get("/leave_assignment/period-history", requireAdmin, async (req, res) => {
  const emp = String(req.query.employeeNumber || "").trim();
  const leaveCode = String(req.query.leave_code || "").trim();
  const py = req.query.period_year;
  const semRaw = req.query.period_semester ?? req.query.period_month;

  if (!emp || !leaveCode || py == null || String(py).trim() === "") {
    return res.status(400).json({ error: "employeeNumber, leave_code, and period_year are required" });
  }

  const sem =
    semRaw != null && String(semRaw).trim() !== ""
      ? (/^\d+$/.test(String(semRaw).trim()) ? parseInt(String(semRaw), 10) : semRaw)
      : null;

  try {
    const history = await loadLeavePeriodHistoryAsync(db, emp, leaveCode, py, sem);
    res.json(history);
  } catch (e) {
    console.error("[leave] period-history:", e.message);
    res.status(500).json({ error: e.message || "Failed to load period transaction record" });
  }
});

// ─── DELETE /leave_assignment/:id/void-period ───────────────────────────────
// Roll back attendance deductions (absence / tardiness / half-day) and earnings for this leave
// type and year; the assignment and approved leave requests / commutations are kept.
const voidPeriodHandler = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const queryAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });

  try {
    const seedRows = await queryAsync("SELECT * FROM leave_assignment WHERE id = ? LIMIT 1", [id]);
    const seed = seedRows[0];
    if (!seed) {
      return res.status(404).json({ error: "Leave assignment period not found" });
    }

    let rec = seed.voided_at ? null : seed;
    if (!rec) {
      const latestRows = await queryAsync(
        `SELECT * FROM leave_assignment
         WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
           AND period_year <=> ? AND period_semester <=> ?
         ORDER BY id DESC LIMIT 1`,
        [seed.employeeNumber, seed.leave_code, seed.period_year, seed.period_semester],
      );
      if (latestRows[0] && !latestRows[0].voided_at) rec = latestRows[0];
    }
    if (!rec) {
      return res.status(404).json({ error: "Period not found or already voided" });
    }

    if (isCommutedLocked(rec)) {
      return res.status(400).json({ error: "Cannot void a commuted period" });
    }
    if (isPeriodVoided(rec)) {
      return res.status(400).json({ error: "Period is already voided" });
    }

    const allRows = (await queryAsync(
      `SELECT * FROM leave_assignment WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)`,
      [rec.employeeNumber, rec.leave_code],
    )).map(normalizeAssignmentRow);

    const currentCheck = assertPeriodIsCurrentDisplay(rec, allRows);
    if (!currentCheck.ok) {
      return res.status(400).json({ error: currentCheck.error });
    }

    const voidId = rec.id;
    const emp = String(rec.employeeNumber || "").trim();
    const leaveCode = String(rec.leave_code || "").trim();
    const py = rec.period_year;
    const sem = rec.period_semester ?? rec.period_month;
    const beforeRemaining = toNum(rec.remaining_hours);
    const actorEmpNum = getActorEmployeeNumber(req);

    // Rollback-only void: undo the attendance deductions (absence / tardiness / half-day) and the
    // earnings for this leave type and year, and keep the assignment itself. Leave requests,
    // commutations and legacy opening lines stay, so the balance returns to what HR assigned
    // minus any approved leave actually taken.
    const KEPT_LEDGER_SOURCES = ["leave_request", "commutation", "legacy_opening"];
    const periodRank = (r) => {
      const s = r.period_semester ?? r.period_month;
      return s == null || String(s).trim() === "" ? 0 : parseInt(s, 10) || 0;
    };

    // Payroll lock: refuse when any month this rollback touches is already in Payroll Processing
    // (same rule the Leave Assignment and Abstract screens show). Months come from the deduction
    // lines, earnings and half-day decisions that would be rolled back.
    {
      const monthRows = await queryAsync(
        `SELECT DISTINCT m FROM (
           SELECT lcu.period_month AS m FROM leave_credit_usage lcu
             JOIN leave_assignment la ON la.id = lcu.leave_assignment_id
            WHERE la.employeeNumber = ? AND TRIM(la.leave_code) = TRIM(?) AND la.period_year <=> ?
              AND la.voided_at IS NULL AND lcu.voided_at IS NULL
              AND LOWER(lcu.source_type) NOT IN ('leave_request','commutation','legacy_opening')
           UNION
           SELECT period_month FROM leave_earnings
            WHERE employee_number = ? AND TRIM(leave_code) = TRIM(?) AND period_year <=> ?
              AND voided_at IS NULL AND earn_status IN ('approved','pending')
           UNION
           SELECT MONTH(leave_date) FROM deduction_decision_log
            WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?) AND YEAR(leave_date) = ?
              AND decision_source = 'half_day_policy_manual_apply' AND decision IN ('accepted','overridden')
         ) t WHERE m BETWEEN 1 AND 12`,
        [emp, leaveCode, py, emp, leaveCode, py, emp, leaveCode, py],
      );
      const months = monthRows.map((r) => parseInt(r.m, 10)).filter((m) => Number.isFinite(m));
      if (months.length) {
        const bounds = months.map((m) => {
          const mm = String(m).padStart(2, "0");
          return [`${py}-${mm}-01`, `${py}-${mm}-${String(new Date(py, m, 0).getDate()).padStart(2, "0")}`];
        });
        const locked = await queryAsync(
          `SELECT startDate FROM payroll_processing
            WHERE TRIM(CAST(employeeNumber AS CHAR)) IN (?, ?)
              AND (${bounds.map(() => "(LEFT(startDate,10) = ? AND LEFT(endDate,10) = ?)").join(" OR ")})`,
          [emp, emp.replace(/^0+/, "") || emp, ...bounds.flat()],
        );
        if (locked.length) {
          const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const names = [...new Set(locked.map((l) => MONTHS[parseInt(String(l.startDate).slice(5, 7), 10) - 1]).filter(Boolean))];
          return res.status(409).json({
            code: "PAYROLL_LOCKED",
            error: `Cannot void: ${names.join(", ")} ${py} is already in Payroll Processing. Remove it there first.`,
          });
        }
      }
    }

    let summary;
    const conn = await getPromiseConnection();
    try {
      await conn.beginTransaction();

      const [chainRaw] = await conn.execute(
        `SELECT * FROM leave_assignment
         WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
           AND period_year <=> ? AND voided_at IS NULL
         FOR UPDATE`,
        [emp, leaveCode, py],
      );
      // Oldest period first (annual row before monthly rows), then by id.
      const chain = [...chainRaw].sort((a, b) => periodRank(a) - periodRank(b) || a.id - b.id);
      if (!chain.some((r) => r.id === voidId)) {
        await conn.rollback();
        return res.status(409).json({ error: "Period changed while voiding; reload and try again." });
      }
      const chainIds = chain.map((r) => r.id);
      const ph = (arr) => arr.map(() => "?").join(",");

      // 1) Attendance deduction ledger lines.
      const [usageRows] = await conn.execute(
        `SELECT id FROM leave_credit_usage
         WHERE leave_assignment_id IN (${ph(chainIds)}) AND voided_at IS NULL
           AND LOWER(source_type) NOT IN (${ph(KEPT_LEDGER_SOURCES)})`,
        [...chainIds, ...KEPT_LEDGER_SOURCES],
      );
      const usageIds = usageRows.map((r) => r.id);
      if (usageIds.length) {
        await conn.execute(
          `UPDATE leave_credit_usage SET voided_at = NOW() WHERE id IN (${ph(usageIds)})`,
          usageIds,
        );
      }

      // 2) Earnings (positive earned/adjustments and the negative deduction entries).
      const [earnRows] = await conn.execute(
        `SELECT id FROM leave_earnings
         WHERE employee_number = ? AND TRIM(leave_code) = TRIM(?) AND period_year <=> ?
           AND voided_at IS NULL AND earn_status IN ('approved','pending')
         FOR UPDATE`,
        [emp, leaveCode, py],
      );
      const earningIds = earnRows.map((r) => r.id);
      if (earningIds.length) {
        await conn.execute(
          `UPDATE leave_earnings SET voided_at = NOW(), voided = 1, is_applied = 0 WHERE id IN (${ph(earningIds)})`,
          earningIds,
        );
      }

      // 3) Half-day decisions charged to this leave: reopen those dates for deduction.
      const [ddlRows] = await conn.execute(
        `SELECT id FROM deduction_decision_log
         WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
           AND decision_source = 'half_day_policy_manual_apply'
           AND decision IN ('accepted','overridden')
           AND YEAR(leave_date) = ?
         FOR UPDATE`,
        [emp, leaveCode, py],
      );
      const decisionIds = ddlRows.map((r) => r.id);
      if (decisionIds.length) {
        await conn.execute(
          `UPDATE deduction_decision_log
           SET decision = 'voided',
               override_reason = CONCAT_WS(' | ', NULLIF(override_reason, ''), ?)
           WHERE id IN (${ph(decisionIds)})`,
          [`Rolled back by leave void (${actorEmpNum}, ${new Date().toISOString().slice(0, 10)})`, ...decisionIds],
        );
      }

      // 4) Derived rows that pointed at what was rolled back (attendance coverage, salary shortfall).
      const sourceKeys = [
        ...usageIds.map((i) => `LEAVE_CREDIT_USAGE:${i}`),
        ...earningIds.map((i) => `LEAVE_EARNING:${i}`),
        ...decisionIds.map((i) => `HALF_DAY_DDL:${i}`),
      ];
      let attendanceRemoved = 0;
      if (sourceKeys.length) {
        const [r] = await conn.execute(
          `DELETE FROM attendance_result
           WHERE source_key IN (${ph(sourceKeys)})
              ${earningIds.length ? `OR leave_earning_id IN (${ph(earningIds)})` : ""}`,
          [...sourceKeys, ...earningIds],
        );
        attendanceRemoved = r.affectedRows || 0;
      }
      // Every attendance deduction on this leave type for the year is now rolled back, so any
      // remaining coverage row for it is stale (e.g. pointing at a rejected earning or a deleted
      // decision). Keep only rows tied to ledger lines that are still active (leave requests).
      const [keptUsage] = await conn.execute(
        `SELECT id FROM leave_credit_usage WHERE leave_assignment_id IN (${ph(chainIds)}) AND voided_at IS NULL`,
        chainIds,
      );
      const keptKeys = keptUsage.map((r) => `LEAVE_CREDIT_USAGE:${r.id}`);
      const [stale] = await conn.execute(
        `DELETE FROM attendance_result
         WHERE TRIM(CAST(employee_number AS CHAR)) = ? AND TRIM(leave_used) = TRIM(?) AND YEAR(result_date) = ?
           AND (source_key LIKE 'LEAVE_EARNING:%' OR source_key LIKE 'HALF_DAY_DDL:%' OR source_key LIKE 'LEAVE_CREDIT_USAGE:%')
           ${keptKeys.length ? `AND source_key NOT IN (${ph(keptKeys)})` : ""}`,
        [emp, leaveCode, py, ...keptKeys],
      );
      attendanceRemoved += stale.affectedRows || 0;
      let shortfallRemoved = 0;
      if (earningIds.length) {
        const [r] = await conn.execute(
          `DELETE FROM leave_salary_shortfall WHERE leave_earning_id IN (${ph(earningIds)})`,
          earningIds,
        );
        shortfallRemoved = r.affectedRows || 0;
      }

      // 5) Rebuild the balances down the chain. Carry-forward rows (allocated == carried) were
      //    snapshots of the prior period's remaining, so re-base them on the refreshed prior row.
      let prevRemaining = null;
      for (const row of chain) {
        const alloc = toNum(row.allocated_hours);
        const carried = toNum(row.carried_forward_hours);
        if (prevRemaining != null && carried > 0 && Math.abs(alloc - carried) < 1e-6) {
          await conn.execute(
            `UPDATE leave_assignment SET allocated_hours = ?, carried_forward_hours = ? WHERE id = ?`,
            [prevRemaining, prevRemaining, row.id],
          );
        }
        const refreshed = await refreshLeaveAssignmentCacheFromLedger(conn, row.id);
        if (refreshed && !refreshed.skipped) prevRemaining = refreshed.remaining;
      }

      const [[after]] = await conn.execute(
        `SELECT remaining_hours FROM leave_assignment WHERE id = ?`,
        [voidId],
      );
      summary = {
        ledgerLines: usageIds.length,
        earnings: earningIds.length,
        halfDays: decisionIds.length,
        attendanceRemoved,
        shortfallRemoved,
        remainingAfter: toNum(after?.remaining_hours),
      };

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    try {
      const [empName, actorName, leaveDesc] = await Promise.all([
        getEmployeeFullName(emp),
        getEmployeeFullName(actorEmpNum),
        new Promise((resolve) =>
          db.query(
            "SELECT leave_description FROM leave_table WHERE leave_code = ? LIMIT 1",
            [leaveCode],
            (e, r) => resolve((r && r[0] && r[0].leave_description) || leaveCode),
          ),
        ),
      ]);
      const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
      const empDisplay = formatUserDisplayName(emp, empName);
      const periodLbl = `${py}${sem != null ? ` / ${sem}` : ""}`;
      logAudit(
        { employeeNumber: actorEmpNum },
        `Void (roll back) Leave Deductions & Earnings - ${leaveDesc}`,
        "leave_assignment",
        voidId,
        emp,
      );
      await insertTransactionLog(
        String(emp),
        `${actorDisplay} rolled back ${leaveDesc} ${periodLbl} for ${empDisplay}: ` +
          `${summary.ledgerLines} deduction line(s), ${summary.earnings} earning(s), ${summary.halfDays} half-day decision(s) voided; ` +
          `${summary.attendanceRemoved} attendance result(s) and ${summary.shortfallRemoved} salary shortfall(s) removed. ` +
          `Remaining ${beforeRemaining.toFixed(3)} → ${summary.remainingAfter.toFixed(3)} hrs.`,
        actorEmpNum,
      );
    } catch (e) {
      console.error("[leave] void-period audit:", e.message);
    }

    emitLeaveChange("leaveAssignmentChanged");
    res.json({
      message: "Deductions and earnings rolled back",
      id: voidId,
      employeeNumber: emp,
      leave_code: leaveCode,
      ...summary,
    });
  } catch (e) {
    console.error("[leave] void-period:", e.message);
    res.status(500).json({ error: e.message || "Failed to void period" });
  }
};
router.delete("/leave_assignment/:id/void-period", requireAdmin, voidPeriodHandler);

// ─── POST /leave_assignment/void-rollback ───────────────────────────────────
// Same rollback as Void in Leave Assignment, addressed by employee + leave type + year
// (used by the Abstract tab). Resolves the leave type's current period and voids that.
router.post("/leave_assignment/void-rollback", requireAdmin, async (req, res) => {
  const emp = String(req.body?.employeeNumber || "").trim();
  const leaveCode = String(req.body?.leave_code || "").trim().toUpperCase();
  const year = parseInt(req.body?.year, 10);
  if (!emp || !leaveCode || !Number.isFinite(year)) {
    return res.status(400).json({ error: "employeeNumber, leave_code and year are required" });
  }
  try {
    const rows = await new Promise((resolve, reject) =>
      db.query(
        `SELECT * FROM leave_assignment WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)`,
        [emp, leaveCode],
        (err, r) => (err ? reject(err) : resolve((r || []).map(normalizeAssignmentRow))),
      ),
    );
    const current = resolveCurrentDisplayPeriod(latestPeriodsByKey(rows));
    if (!current) {
      return res.status(404).json({ error: `${leaveCode} has no active assignment for this employee.` });
    }
    if (parseInt(current.period_year, 10) !== year) {
      return res.status(409).json({
        error: `The current ${leaveCode} period is in ${current.period_year}, not ${year}. Void it from Leave Assignment instead.`,
      });
    }
    req.params.id = String(current.id);
    return voidPeriodHandler(req, res);
  } catch (e) {
    console.error("[leave] void-rollback:", e.message);
    return res.status(500).json({ error: e.message || "Failed to void" });
  }
});

// ============================================
// LEAVE REQUESTS
// ============================================
router.get("/leave_request", requireAdmin, (req, res) => {
  const query = `
    SELECT lr.*, lt.leave_description, p.firstName, p.lastName,
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) as fullName,
      DATE_FORMAT(lr.leave_date, '%Y-%m-%d') as leave_date,
      DATE_FORMAT(lr.created_at, '%Y-%m-%d %H:%i:%s') as created_at
    FROM leave_request lr
    LEFT JOIN leave_table lt ON lr.leave_code = lt.leave_code
    LEFT JOIN person_table p ON lr.employeeNumber = p.agencyEmployeeNum
    ORDER BY lr.created_at DESC
  `;
  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Failed to fetch leave requests" });
    res.json(results);
  });
});

router.get("/leave_request/transactions", requireAdmin, (req, res) => {
  const query = `
    SELECT *
    FROM transaction_table
    ORDER BY id ASC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching all transaction logs:", err);
      return res.status(500).json({ error: "Failed to fetch transaction logs" });
    }
    res.json(results);
  });
});

// HR: employment category hours/day for leave deduction (LeaveRequest.jsx modal).
router.post("/leave_request/deduction-suggestion", requireAdmin, (req, res) => {
  const {
    employeeNumber,
    leave_code,
    leave_date = null,
    has_leave_form = true,
    is_half_day_absence = false,
    requested_rate_decimal = null,
  } = req.body || {};

  if (!employeeNumber) {
    return res.status(400).json({ error: "employeeNumber is required" });
  }
  if (has_leave_form !== false && !leave_code) {
    return res
      .status(400)
      .json({ error: "leave_code is required when has_leave_form is true" });
  }

  (async () => {
    try {
      if (Boolean(is_half_day_absence)) {
        const suggestion = await buildHalfDayPolicySuggestion({
          employeeNumber,
          leave_date,
        });
        return res.json(suggestion);
      }
      const suggestion = await buildDeductionSuggestion({
        employeeNumber,
        leave_code,
        leave_date,
        has_leave_form,
        is_half_day_absence,
        requested_rate_decimal,
      });
      res.json(suggestion);
    } catch (e) {
      console.error("[deduction-suggestion]", e.message);
      res.status(500).json({ error: "Failed to compute deduction suggestion" });
    }
  })();
});

router.post("/leave_request/halfday-deduction-suggestion", requireAdmin, (req, res) => {
  const { employeeNumber, leave_date, preferred_charge_to = null } = req.body || {};
  if (!employeeNumber || !leave_date) {
    return res
      .status(400)
      .json({ error: "employeeNumber and leave_date are required" });
  }
  (async () => {
    try {
      const suggestion = await buildHalfDayPolicySuggestion({
        employeeNumber,
        leave_date,
        preferred_charge_to,
      });
      res.json(suggestion);
    } catch (e) {
      console.error("[halfday-deduction-suggestion]", e.message);
      res.status(500).json({ error: "Failed to compute half-day deduction suggestion" });
    }
  })();
});

// Fetch already-applied half-day deductions (used to disable duplicate UI actions after reload)
router.post("/leave_request/halfday-deduction-applied-dates", requireAdmin, (req, res) => {
  const { employeeNumber, leave_code = "VL", startDate, endDate } = req.body || {};
  if (!employeeNumber || !startDate || !endDate) {
    return res.status(400).json({
      error: "employeeNumber, startDate, and endDate are required",
    });
  }

  (async () => {
    try {
      const dates = await getHalfDayDeductionAppliedDates({
        employeeNumber,
        leave_code,
        startDate,
        endDate,
        decisionSource: "half_day_policy_manual_apply",
      });
      res.json({ dates });
    } catch (e) {
      console.error("[halfday-deduction-applied-dates]", e.message);
      res.status(500).json({ error: "Failed to fetch applied half-day dates" });
    }
  })();
});

router.post("/leave_request/halfday-deduction-apply", requireAdmin, (req, res) => {
  const {
    employeeNumber,
    leave_date,
    chosen_charge_to,
    rate_decimal,
    deduction_hours,
    decision_context = {},
  } = req.body || {};
  const actorEmployeeNumber = getActorEmployeeNumber(req);
  if (!employeeNumber || !leave_date || !chosen_charge_to) {
    return res.status(400).json({
      error: "employeeNumber, leave_date, and chosen_charge_to are required",
    });
  }

  (async () => {
    try {
      const leaveDateNorm = String(leave_date).trim().slice(0, 10);
      const attendanceRows = await new Promise((resolve, reject) => {
        db.query(
          `SELECT half_day_review
           FROM overall_attendance_record
           WHERE CAST(personID AS CHAR) = CAST(? AS CHAR)
             AND startDate <= ?
             AND endDate >= ?
           ORDER BY startDate DESC
           LIMIT 1`,
          [employeeNumber, leaveDateNorm, leaveDateNorm],
          (err, rows) => (err ? reject(err) : resolve(rows || [])),
        );
      });
      const reviewRaw = attendanceRows[0]?.half_day_review;
      if (!isApprovedHalfDayInReviewJson(reviewRaw, leaveDateNorm)) {
        return res.status(400).json({
          error:
            "Half-day leave deduction requires HR approval in the attendance module (rendered hours confirmed).",
        });
      }

      const suggestion = await buildHalfDayPolicySuggestion({
        employeeNumber,
        leave_date,
        preferred_charge_to: chosen_charge_to,
      });
      const chargeTo = String(chosen_charge_to || "").trim().toUpperCase();
      if (!suggestion.allowed_charge_to.includes(chargeTo)) {
        return res.status(400).json({
          error: `Invalid charge_to for half-day policy. Allowed: ${suggestion.allowed_charge_to.join(", ")}`,
        });
      }

      // Prevent duplicates even if the UI state resets after reload.
      // We consider duplicates as any prior accepted/overridden half-day policy apply for the same employee/date/leave_code.
      const alreadyAppliedLogs = await getHalfDayDeductionAppliedLogs({
        employeeNumber,
        leave_code: chargeTo,
        leave_date,
        decisionSource: "half_day_policy_manual_apply",
      });
      if (alreadyAppliedLogs.length > 0) {
        await insertDeductionDecisionLog({
          leaveRequestId: suggestion?.filed_leave_request?.id || null,
          employeeNumber,
          leave_code: chargeTo,
          leave_date,
          decision: "duplicate_rejected",
          decisionSource: "half_day_policy_manual_apply",
          actorEmployeeNumber,
          systemRecommendation: suggestion,
          finalApplied: {
            charge_to: chargeTo,
            attempted_rate_decimal: rate_decimal,
            attempted_deduction_hours: deduction_hours,
            available_hours_before: Number(suggestion.available_hours || 0),
            hours_per_day: Number(suggestion.hours_per_day || 8),
            has_leave_form: suggestion.has_leave_form,
            duplicate_check: {
              already_applied_count: alreadyAppliedLogs.length,
              existing_decisions: alreadyAppliedLogs.map((r) => r?.decision).filter(Boolean),
            },
          },
          overrideReason: null,
        });

        return res.status(400).json({
          error: "This half-day is already deducted.",
          already_applied: alreadyAppliedLogs,
        });
      }

      if (chargeTo !== DEDUCTION_SALARY && !suggestion.has_sufficient_balance) {
        return res.status(400).json({
          error: `Insufficient ${chargeTo} balance for half-day deduction`,
          suggestion,
        });
      }

      const inputHours = parseFloat(deduction_hours);
      const inputRate = parseFloat(rate_decimal);
      const effectiveHoursPerDay = Number(suggestion.hours_per_day || 8);
      const hours = Number.isFinite(inputHours) && inputHours > 0
        ? Number(inputHours.toFixed(4))
        : Number.isFinite(inputRate) && inputRate > 0
          ? Number((inputRate * effectiveHoursPerDay).toFixed(4))
          : Number(suggestion.recommended_hours || 0);
      if (!(Number.isFinite(hours) && hours > 0)) {
        return res.status(400).json({
          error: "A positive rate_decimal and/or deduction_hours is required",
        });
      }
      const appliedRate = Number((hours / (effectiveHoursPerDay || 8)).toFixed(3));
      const availableBefore = Number(suggestion.available_hours || 0);
      if (chargeTo !== DEDUCTION_SALARY && availableBefore < hours) {
        return res.status(400).json({
          error: `Insufficient ${chargeTo} balance for ${hours} hours deduction`,
          suggestion,
        });
      }
      let availableAfter = availableBefore;
      const leaveDateOnly = toMysqlDateOnly(leave_date);
      let ctoHalfDayLedger = null;

      if (chargeTo === DEDUCTION_SALARY) {
        const overrideReason = String(decision_context?.override_reason || "").trim() || null;
        const systemRecommendation = decision_context?.system_recommendation || suggestion;
        const decision =
          overrideReason ||
          String(systemRecommendation?.recommended_charge_to || "").toUpperCase() !== chargeTo
            ? "overridden"
            : "accepted";

        const decisionLogId = await insertDeductionDecisionLog({
          leaveRequestId: suggestion?.filed_leave_request?.id || null,
          employeeNumber,
          leave_code: chargeTo,
          leave_date,
          decision,
          decisionSource: "half_day_policy_manual_apply",
          actorEmployeeNumber,
          systemRecommendation,
          finalApplied: {
            charge_to: chargeTo,
            applied_rate_decimal: appliedRate,
            applied_hours: hours,
            requested_rate_decimal: rate_decimal,
            requested_deduction_hours: deduction_hours,
            effective_hours_per_day: effectiveHoursPerDay,
            available_hours_before: availableBefore,
            available_hours_after: availableBefore,
            has_leave_form: suggestion.has_leave_form,
            salary_deduction: true,
          },
          overrideReason,
        });

        const [empName, actorName] = await Promise.all([
          getEmployeeFullName(String(employeeNumber)),
          getEmployeeFullName(actorEmployeeNumber),
        ]);
        const actorDisplay = formatUserDisplayName(actorEmployeeNumber, actorName);
        const empDisplay = formatUserDisplayName(String(employeeNumber), empName);
        const txMsg = `${actorDisplay} recorded half-day as salary deduction (${hours} hrs policy equivalent) for ${empDisplay} (${leaveDateOnly}). Balance unchanged (salary deduction).`;
        await insertTransactionLog(String(employeeNumber), txMsg, actorEmployeeNumber, {
          deduction_decision_log_id: decisionLogId,
          charge_to: chargeTo,
          deducted_hours: hours,
          leave_date: leaveDateOnly,
          salary_deduction: true,
        });

        await insertLeaveSalaryShortfallForHalfDaySalary({
          employeeNumber,
          leaveDateOnly,
          shortfallDaysDecimal: appliedRate,
          shortfallHours: hours,
          decisionLogId,
        });

        try {
          await attendanceWriter.upsertFromHalfDaySalary({
            employee_number: String(employeeNumber),
            leave_date_only: leaveDateOnly,
            hours,
            deduction_decision_log_id: decisionLogId,
            remarks: `Half-day salary (policy ref #${decisionLogId})`,
          });
        } catch (e) {
          console.error("[leave] attendance_result (half-day salary):", e.message);
        }

        return res.json({
          message: "Half-day recorded as salary deduction (no leave credits posted).",
          employeeNumber,
          leave_date: leaveDateOnly,
          charge_to: chargeTo,
          deducted_hours: hours,
        });
      }

      if (chargeTo === "CTO") {
        const y = parseInt(String(leaveDateOnly).slice(0, 4), 10);
        const m = parseInt(String(leaveDateOnly).slice(5, 7), 10);
        if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
          return res.status(400).json({ error: "Invalid leave_date for CTO ledger period" });
        }
        const baseRemark = `Half-day policy · ${leaveDateOnly}`;
        ctoHalfDayLedger = await appendCtoDeductionSnapshotRowAsync({
          employeeNumber,
          needHours: hours,
          period_year: y,
          period_month: m,
          expiry_date: null,
          remarksForLedger: baseRemark,
          emp_category_snapshot: null,
          usageDateUsed: leaveDateOnly,
          usageAction: "offset",
        });
        if (
          !Number.isFinite(ctoHalfDayLedger?.deducted) ||
          ctoHalfDayLedger.deducted + 1e-6 < hours
        ) {
          return res.status(400).json({
            error: "CTO deduction failed due to insufficient remaining credits",
          });
        }
        availableAfter = await getCtoRemainingHours(employeeNumber);
      } else if (chargeTo === "SC") {
        await applyHoursDeltaAcrossServiceCredit({
          req,
          actorEmployeeNumber,
          employeeNumber,
          deltaHours: hours,
          leaveDateOnly,
          requestId: null,
          reason: `Half-day policy deduction (SC) — deducted ${hours} hours`,
          scType: "non_commutative",
        });
        availableAfter = await getScRemainingHoursAllTypes(employeeNumber);
      } else {
        await applyHoursDeltaAcrossAssignments({
          req,
          actorEmployeeNumber,
          employeeNumber,
          leave_code: chargeTo,
          deltaHours: hours,
          requestId: null,
          reason: `Half-day policy deduction (${chargeTo}) — deducted ${hours} hours`,
          sourceType: "HALF_DAY_POLICY",
        });
        availableAfter = await getTotalRemainingHours(employeeNumber, chargeTo);
      }

      const overrideReason = String(decision_context?.override_reason || "").trim() || null;
      const systemRecommendation = decision_context?.system_recommendation || suggestion;
      const decision =
        overrideReason ||
        String(systemRecommendation?.recommended_charge_to || "").toUpperCase() !== chargeTo
          ? "overridden"
          : "accepted";

      const decisionLogId = await insertDeductionDecisionLog({
        leaveRequestId: suggestion?.filed_leave_request?.id || null,
        employeeNumber,
        leave_code: chargeTo,
        leave_date,
        decision,
        decisionSource: "half_day_policy_manual_apply",
        actorEmployeeNumber,
        systemRecommendation,
        finalApplied: {
          charge_to: chargeTo,
          applied_rate_decimal: appliedRate,
          applied_hours: hours,
          requested_rate_decimal: rate_decimal,
          requested_deduction_hours: deduction_hours,
          effective_hours_per_day: effectiveHoursPerDay,
          available_hours_before: availableBefore,
          available_hours_after: Number((availableAfter || 0).toFixed(4)),
          has_leave_form: suggestion.has_leave_form,
          ...(ctoHalfDayLedger?.newCtoCreditId
            ? {
                cto_credit_id: ctoHalfDayLedger.newCtoCreditId,
                cto_usage_id: ctoHalfDayLedger.usageId,
              }
            : {}),
        },
        overrideReason,
      });

      if (
        chargeTo === "CTO" &&
        decisionLogId &&
        ctoHalfDayLedger?.usageId &&
        ctoHalfDayLedger?.newCtoCreditId
      ) {
        const rmk = `Half-day policy · ${leaveDateOnly} · deduction_decision_log #${decisionLogId}`;
        await new Promise((resolve, reject) => {
          db.query(
            `UPDATE cto_usage SET remarks = ? WHERE id = ?`,
            [rmk, ctoHalfDayLedger.usageId],
            (e) => (e ? reject(e) : resolve()),
          );
        });
        await new Promise((resolve, reject) => {
          db.query(
            `UPDATE cto_credit SET remarks = ? WHERE id = ?`,
            [rmk, ctoHalfDayLedger.newCtoCreditId],
            (e) => (e ? reject(e) : resolve()),
          );
        });
      }

      const [empName, actorName] = await Promise.all([
        getEmployeeFullName(String(employeeNumber)),
        getEmployeeFullName(actorEmployeeNumber),
      ]);
      const actorDisplay = formatUserDisplayName(actorEmployeeNumber, actorName);
      const empDisplay = formatUserDisplayName(String(employeeNumber), empName);
      const beforeH = Number(availableBefore || 0);
      const afterH = Number(availableAfter || 0);
      const txMsg = `${actorDisplay} applied half-day deduction of ${hours} hrs to ${chargeTo} for ${empDisplay} (${leaveDateOnly}). Balance updated: ${beforeH.toFixed(3)} hrs → ${afterH.toFixed(3)} hrs (−${Number(hours).toFixed(3)} hrs).`;
      await insertTransactionLog(String(employeeNumber), txMsg, actorEmployeeNumber, {
        deduction_decision_log_id: decisionLogId,
        charge_to: chargeTo,
        deducted_hours: hours,
        leave_date: leaveDateOnly,
        salary_deduction: false,
        available_hours_after: Number((availableAfter || 0).toFixed(4)),
      });

      try {
        await attendanceWriter.upsertFromHalfDayLeaveCovered({
          employee_number: String(employeeNumber),
          leave_date_only: leaveDateOnly,
          hours,
          charge_to: chargeTo,
          deduction_decision_log_id: decisionLogId,
          remarks: `Half-day leave-covered (policy ref #${decisionLogId})`,
        });
      } catch (e) {
        console.error("[leave] attendance_result (half-day leave):", e.message);
      }

      emitLeaveChange("leaveAssignmentChanged");
      res.json({
        message: "Half-day deduction applied successfully",
        employeeNumber,
        leave_date: leaveDateOnly,
        charge_to: chargeTo,
        deducted_hours: hours,
      });
    } catch (e) {
      sendLeaveError(res, e, "Half-day deduction apply failed");
    }
  })();
});

// HR: employment category hours/day for leave deduction (LeaveRequest.jsx modal).
router.post("/leave_request/hr-deduction-context", requireAdmin, (req, res) => {
  const { employeeNumber, leave_code } = req.body || {};
  if (!employeeNumber || !leave_code) {
    return res
      .status(400)
      .json({ error: "employeeNumber and leave_code are required" });
  }
  (async () => {
    try {
      const [{ hoursPerDay, rateSource }, employmentTypeName, profile] = await Promise.all([
        resolveHoursPerDay(employeeNumber),
        fetchEmploymentTypeName(employeeNumber),
        leaveRules.fetchEmployeeProfile(employeeNumber),
      ]);
      res.json({
        hoursPerDay,
        rateSource,
        employmentTypeName,
        cscCategory: profile.categoryCode,
        allowed_charge_codes: leaveRules.allowedChargeCodes(leave_code, profile.categoryCode),
      });
    } catch (e) {
      console.error("[hr-deduction-context]", e.message);
      res.status(500).json({ error: "Failed to load deduction context" });
    }
  })();
});

// Non-working days (holidays + days outside the official time schedule) for the date picker.
router.get("/leave_request/calendar/:employeeNumber", requireSelfOrAdmin('employeeNumber'), async (req, res) => {
  const start = String(req.query.start || "").slice(0, 10);
  const end = String(req.query.end || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    return res.status(400).json({ error: "start and end (YYYY-MM-DD) are required" });
  }
  try {
    const [cal, profile] = await Promise.all([
      leaveRules.describeCalendar(req.params.employeeNumber, start, end),
      leaveRules.fetchEmployeeProfile(req.params.employeeNumber),
    ]);
    res.json({
      ...cal,
      cscCategory: profile.categoryCode,
      categoryLabel: profile.categoryLabel,
      noLeaveBenefits: profile.isJobOrder,
      sex: profile.sex,
    });
  } catch (e) {
    console.error("[leave_request/calendar]", e.message);
    res.status(500).json({ error: "Failed to load leave calendar" });
  }
});

router.get("/leave_request/:employeeNumber", requireSelfOrAdmin('employeeNumber'), (req, res) => {
  const query = `
    SELECT lr.*, lt.leave_description,
      DATE_FORMAT(lr.leave_date, '%Y-%m-%d') as leave_date,
      DATE_FORMAT(lr.created_at, '%Y-%m-%d %H:%i:%s') as created_at
    FROM leave_request lr
    LEFT JOIN leave_table lt ON lr.leave_code = lt.leave_code
    WHERE lr.employeeNumber = ?
    ORDER BY lr.created_at DESC
  `;
  db.query(query, [req.params.employeeNumber], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Failed to fetch leave requests" });
    res.json(results);
  });
});

router.get("/leave_request/transactions/:employeeNumber", requireSelfOrAdmin('employeeNumber'), (req, res) => {
  const query = `
    SELECT *
    FROM transaction_table
    WHERE employee_id = ?
    ORDER BY id ASC
  `;
  db.query(query, [req.params.employeeNumber], (err, results) => {
    if (err) {
      console.error("Error fetching transaction logs:", err);
      return res.status(500).json({ error: "Failed to fetch transaction logs" });
    }
    res.json(results);
  });
});

// ============================================================
// Leave request lifecycle
//
// Status: 0 Pending, 1 Approved by Supervisor, 2 Approved by HR, 3 Denied, 4 Cancelled.
// Credits move only on HR approval (-> 2, deduct) and on reversal of an HR approval
// (2 -> 3/4, restore the exact ledger lines). Every transition runs in one transaction
// with the request row locked, so a deduction can never be applied twice.
// ============================================================
const LEAVE_STATUS_LABELS = {
  0: "Pending",
  1: "Approved by Supervisor",
  2: "Approved by HR",
  3: "Denied",
  4: "Cancelled",
};
const ALLOWED_LEAVE_TRANSITIONS = { 0: [1, 2, 3, 4], 1: [2, 3, 4], 2: [3, 4], 3: [], 4: [] };

const assertLeaveStatusTransition = (oldStatus, newStatus) => {
  if (!Object.prototype.hasOwnProperty.call(LEAVE_STATUS_LABELS, newStatus)) {
    throw new LeaveRuleError(400, "INVALID_STATUS", "Invalid status value");
  }
  if (!(ALLOWED_LEAVE_TRANSITIONS[oldStatus] || []).includes(newStatus)) {
    throw new LeaveRuleError(
      409,
      "INVALID_TRANSITION",
      `Cannot change a leave request from "${LEAVE_STATUS_LABELS[oldStatus] ?? oldStatus}" to "${LEAVE_STATUS_LABELS[newStatus]}".`,
    );
  }
};

const isCtoCode = (code) => String(code || "").trim().toUpperCase() === "CTO";
const isScCode = (code) => String(code || "").trim().toUpperCase() === "SC";

const getRemainingForChargeCode = (employeeNumber, code) =>
  isCtoCode(code)
    ? getCtoRemainingHours(employeeNumber)
    : isScCode(code)
      ? getScRemainingHours(employeeNumber)
      : getTotalRemainingHours(employeeNumber, code);

const sendLeaveError = (res, e, fallback) => {
  const status = Number(e?.status) || 500;
  if (status >= 500) console.error(`[leave] ${fallback}:`, e?.message);
  if (!res.headersSent) {
    res.status(status).json({ error: e?.message || fallback, code: e?.code || null });
  }
};

const resolveDeductionHours = ({ deduction_hours, rate_decimal, hoursPerDay }) => {
  const dh = parseFloat(deduction_hours);
  const rr = parseFloat(rate_decimal);
  if (Number.isFinite(dh) && dh > 0) {
    return {
      delta: dh,
      storedRate:
        Number.isFinite(rr) && rr > 0
          ? Number(rr.toFixed(3))
          : Number((dh / hoursPerDay).toFixed(3)),
    };
  }
  if (Number.isFinite(rr) && rr > 0) {
    return { delta: Number((rr * hoursPerDay).toFixed(4)), storedRate: Number(rr.toFixed(3)) };
  }
  throw new LeaveRuleError(
    400,
    "DEDUCTION_REQUIRED",
    "HR approval requires a positive deduction_hours and/or rate_decimal in the request body.",
  );
};

/** SC/CTO ledgers use their own connections; surface their shortfalls as 409s. */
const applyScDelta = async (args) => {
  try {
    await applyHoursDeltaAcrossServiceCredit(args);
  } catch (e) {
    if (/insufficient/i.test(e?.message || "")) {
      throw new LeaveRuleError(409, "INSUFFICIENT_CREDITS", e.message);
    }
    throw e;
  }
};

const ctoPeriodOf = (leaveDateOnly) => {
  const y = parseInt(String(leaveDateOnly).slice(0, 4), 10);
  const m = parseInt(String(leaveDateOnly).slice(5, 7), 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new LeaveRuleError(400, "INVALID_DATE", "Invalid leave_date for CTO ledger period");
  }
  return { y, m };
};

/**
 * Move one leave request to `newStatus`. Authorization, transition rules, the credit
 * movement and the status update all happen while the request row is locked.
 * Non-admins may only cancel their own request while it is still Pending/Supervisor-approved.
 * Employee, leave type and date always come from the stored request, never the payload.
 */
const transitionLeaveRequest = async ({
  req,
  requestId,
  newStatus,
  actorEmployeeNumber,
  isAdmin,
  deductionInput = {},
}) => {
  const { deduction_hours, rate_decimal, charge_to, decision_context } = deductionInput;
  const conn = await getPromiseConnection();
  const afterCommit = [];
  // SC/CTO ledgers write through the pool (outside this transaction). If anything after
  // that write fails, this undoes it so the balance and the request stay in step.
  let undoExternal = null;
  let result;
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute("SELECT * FROM leave_request WHERE id = ? FOR UPDATE", [requestId]);
    const request = rows?.[0];
    if (!request) throw new LeaveRuleError(404, "NOT_FOUND", "Leave request not found");
    const oldStatus = parseInt(request.status, 10);

    if (!isAdmin) {
      const own = employeeNumbersMatch(request.employeeNumber, req.user?.employeeNumber);
      if (!own || newStatus !== 4 || ![0, 1].includes(oldStatus)) {
        throw new LeaveRuleError(
          403,
          "FORBIDDEN",
          "You can only cancel your own leave requests that are not yet approved by HR.",
        );
      }
    }
    assertLeaveStatusTransition(oldStatus, newStatus);

    const employeeNumber = String(request.employeeNumber);
    const leave_code = request.leave_code;
    const leave_date = toMysqlDateOnly(request.leave_date);
    const base = { requestId, employeeNumber, leave_code, leave_date, oldStatus, newStatus };

    // Payroll lock: once the leave date's month is in Payroll Processing, its credits are final.
    if (newStatus === 2 || oldStatus === 2) {
      await leaveRules.assertNotPayrollLocked(
        employeeNumber,
        [leave_date],
        newStatus === 2 ? "approve this leave" : "reverse this HR-approved leave",
      );
    }

    if (newStatus === 2) {
      const fallbackSuggestion = await buildDeductionSuggestion({
        employeeNumber,
        leave_code,
        leave_date,
        has_leave_form: true,
        is_half_day_absence: false,
        requested_rate_decimal: parseFloat(rate_decimal) || null,
      });
      const systemRecommendation = decision_context?.system_recommendation || fallbackSuggestion;
      const chargeCode = resolveHrDeductionChargeCode({
        charge_to,
        decision_context,
        requestLeaveCode: leave_code,
        systemRecommendation,
      });
      if (!chargeCode || chargeCode === DEDUCTION_SALARY) {
        throw new LeaveRuleError(
          409,
          "INSUFFICIENT_CREDITS",
          "This leave cannot be approved as a salary deduction. Choose a leave balance with enough credits, or deny the request.",
        );
      }
      const profile = await leaveRules.fetchEmployeeProfile(employeeNumber);
      leaveRules.assertChargeAllowed(leave_code, chargeCode, profile.categoryCode);
      const { hoursPerDay } = await resolveHoursPerDay(employeeNumber);
      const { delta, storedRate } = resolveDeductionHours({ deduction_hours, rate_decimal, hoursPerDay });
      const availableBefore = await getRemainingForChargeCode(employeeNumber, chargeCode);

      if (isCtoCode(chargeCode)) {
        const { y, m } = ctoPeriodOf(leave_date);
        const ctoLedger = await appendCtoDeductionSnapshotRowAsync({
          employeeNumber,
          needHours: delta,
          period_year: y,
          period_month: m,
          expiry_date: null,
          remarksForLedger: `Leave request HR approval · ${leave_date} · leave_request:${requestId}`,
          emp_category_snapshot: null,
          usageDateUsed: leave_date,
          usageAction: "offset",
        });
        const ctoTaken = Number(ctoLedger?.deducted) || 0;
        if (ctoTaken > 0) {
          undoExternal = () =>
            appendCtoDeductionSnapshotRowAsync({
              employeeNumber,
              needHours: -ctoTaken,
              period_year: y,
              period_month: m,
              expiry_date: null,
              remarksForLedger: `Leave request approval rolled back · ${leave_date} · leave_request:${requestId}`,
              emp_category_snapshot: null,
              usageDateUsed: leave_date,
              usageAction: "restore",
            });
        }
        if (!Number.isFinite(ctoLedger?.deducted) || ctoLedger.deducted + 1e-6 < delta) {
          throw new LeaveRuleError(409, "INSUFFICIENT_CREDITS", "CTO deduction failed due to insufficient remaining credits");
        }
      } else if (isScCode(chargeCode)) {
        await applyScDelta({
          req,
          actorEmployeeNumber,
          employeeNumber,
          deltaHours: delta,
          leaveDateOnly: leave_date,
          requestId,
          reason: `HR Approved — deducted ${delta} hours from SC balance`,
          scType: "non_commutative",
        });
        undoExternal = () =>
          applyScDelta({
            req,
            actorEmployeeNumber,
            employeeNumber,
            deltaHours: -delta,
            leaveDateOnly: leave_date,
            requestId,
            reason: `HR approval rolled back — restored ${delta} hours to SC`,
            scType: "non_commutative",
          });
      } else {
        await applyHoursDeltaAcrossAssignments({
          req,
          actorEmployeeNumber,
          employeeNumber,
          leave_code: chargeCode,
          deltaHours: delta,
          requestId,
          reason: `HR Approved — deducted ${delta} hours from ${chargeCode} balance`,
          conn,
          afterCommit,
        });
      }

      // Leave balances are read through the pool, which cannot see this uncommitted
      // transaction, so derive the after-balance; SC/CTO ledgers are already committed.
      const availableAfter =
        isCtoCode(chargeCode) || isScCode(chargeCode)
          ? await getRemainingForChargeCode(employeeNumber, chargeCode)
          : Math.max(0, availableBefore - delta);

      await conn.execute(
        `UPDATE leave_request
            SET status = 2, deduction_applied_hours = ?, hr_approval_rate = ?, deduction_charge_to = ?,
                deduction_balance_before_hours = ?, deduction_balance_after_hours = ?
          WHERE id = ?`,
        [
          delta,
          storedRate,
          chargeCode,
          Number(availableBefore.toFixed(4)),
          Number(availableAfter.toFixed(4)),
          requestId,
        ],
      );
      result = {
        ...base,
        kind: "deduct",
        chargeCode,
        delta,
        storedRate,
        availableBefore,
        availableAfter,
        systemRecommendation,
      };
    } else if (oldStatus === 2) {
      const chargeCode = String(request.deduction_charge_to || "").trim() || leave_code;
      const recorded = parseFloat(request.deduction_applied_hours);
      const recordedHours = Number.isFinite(recorded) && recorded > 0 ? recorded : 0;
      const reason = `HR approval reversed (${newStatus === 3 ? "denied" : "cancelled"})`;
      const availableBefore = await getRemainingForChargeCode(employeeNumber, chargeCode);
      let restored = 0;

      if (isCtoCode(chargeCode)) {
        if (recordedHours > 0) {
          const { y, m } = ctoPeriodOf(leave_date);
          await appendCtoDeductionSnapshotRowAsync({
            employeeNumber,
            needHours: -recordedHours,
            period_year: y,
            period_month: m,
            expiry_date: null,
            remarksForLedger: `Leave request HR reversal · ${leave_date} · leave_request:${requestId}`,
            emp_category_snapshot: null,
            usageDateUsed: leave_date,
            usageAction: "restore",
          });
          restored = recordedHours;
          undoExternal = () =>
            appendCtoDeductionSnapshotRowAsync({
              employeeNumber,
              needHours: recordedHours,
              period_year: y,
              period_month: m,
              expiry_date: null,
              remarksForLedger: `Leave request reversal rolled back · ${leave_date} · leave_request:${requestId}`,
              emp_category_snapshot: null,
              usageDateUsed: leave_date,
              usageAction: "offset",
            });
        }
      } else if (isScCode(chargeCode)) {
        if (recordedHours > 0) {
          await applyScDelta({
            req,
            actorEmployeeNumber,
            employeeNumber,
            deltaHours: -recordedHours,
            leaveDateOnly: leave_date,
            requestId,
            reason: `${reason} — restored ${recordedHours} hours to SC`,
            scType: "non_commutative",
          });
          restored = recordedHours;
          undoExternal = () =>
            applyScDelta({
              req,
              actorEmployeeNumber,
              employeeNumber,
              deltaHours: recordedHours,
              leaveDateOnly: leave_date,
              requestId,
              reason: `Reversal rolled back — deducted ${recordedHours} hours from SC again`,
              scType: "non_commutative",
            });
        }
      } else {
        restored = await reverseLeaveRequestLedger({
          conn,
          requestId,
          employeeNumber,
          actorEmployeeNumber,
          reason,
          afterCommit,
          req,
        });
        if (restored === 0 && recordedHours > 0 && !(await hasLeaveRequestLedgerHistory(conn, requestId))) {
          // Approved before the credit ledger existed: restore the recorded hours.
          restored = await applyHoursDeltaAcrossAssignments({
            req,
            actorEmployeeNumber,
            employeeNumber,
            leave_code: chargeCode,
            deltaHours: -recordedHours,
            requestId,
            reason: `${reason} — restored ${recordedHours} hours to ${chargeCode}`,
            conn,
            afterCommit,
          });
        }
      }

      const availableAfter =
        isCtoCode(chargeCode) || isScCode(chargeCode)
          ? await getRemainingForChargeCode(employeeNumber, chargeCode)
          : availableBefore + restored;

      await conn.execute(
        `UPDATE leave_request
            SET status = ?, deduction_applied_hours = NULL, hr_approval_rate = NULL, deduction_charge_to = NULL,
                deduction_balance_before_hours = NULL, deduction_balance_after_hours = NULL
          WHERE id = ?`,
        [newStatus, requestId],
      );
      result = { ...base, kind: "restore", chargeCode, restored, availableBefore, availableAfter };
    } else {
      await conn.execute("UPDATE leave_request SET status = ? WHERE id = ?", [newStatus, requestId]);
      result = { ...base, kind: "status" };
    }

    await conn.commit();
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_r) {}
    if (undoExternal) {
      try {
        await undoExternal();
      } catch (undoErr) {
        console.error(`[leave] could not undo SC/CTO write for leave_request:${requestId}:`, undoErr.message);
      }
    }
    throw e;
  } finally {
    conn.release();
  }

  afterCommit.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error("[leave] post-commit audit:", e.message);
    }
  });
  return result;
};

const getLeaveDescription = (code) =>
  new Promise((resolve) =>
    db.query(
      "SELECT leave_description FROM leave_table WHERE TRIM(leave_code) = TRIM(?) LIMIT 1",
      [code],
      (e, r) => resolve((r && r[0] && r[0].leave_description) || code),
    ),
  );

/** Logs, decision record and DTR sync after a committed transition. Never throws. */
const runLeaveTransitionSideEffects = async ({ result, actorEmployeeNumber, mode, decision_context }) => {
  const { requestId, employeeNumber, leave_code, leave_date, newStatus } = result;
  try {
    const [empName, actorName, leaveDesc] = await Promise.all([
      getEmployeeFullName(employeeNumber),
      getEmployeeFullName(actorEmployeeNumber),
      getLeaveDescription(leave_code),
    ]);
    const actorDisplay = formatUserDisplayName(actorEmployeeNumber, actorName);
    const empDisplay = formatUserDisplayName(employeeNumber, empName);

    if (result.kind === "deduct") {
      const { chargeCode, delta, storedRate, availableBefore, availableAfter, systemRecommendation } = result;
      try {
        await syncApprovedLeaveToAttendanceRecord(employeeNumber, leave_date);
      } catch (syncErr) {
        console.error("[leave] attendance sync (HR approve):", syncErr.message);
      }
      const overrideReason = (decision_context?.override_reason || "").trim() || null;
      const chargeDiffers =
        mode === "single" &&
        String(chargeCode).trim().toUpperCase() !==
          String(systemRecommendation?.recommended_charge_to || "").trim().toUpperCase();
      const decision =
        overrideReason ||
        !nearlyEqual(systemRecommendation?.recommended_hours, delta) ||
        !nearlyEqual(systemRecommendation?.recommended_rate_decimal, storedRate) ||
        chargeDiffers
          ? "overridden"
          : "accepted";
      await insertDeductionDecisionLog({
        leaveRequestId: requestId,
        employeeNumber,
        leave_code,
        leave_date,
        decision,
        decisionSource: mode === "bulk" ? "hr_bulk_approval" : "hr_single_approval",
        actorEmployeeNumber,
        systemRecommendation,
        finalApplied: {
          applied_rate_decimal: storedRate,
          applied_hours: delta,
          charge_to: chargeCode,
          request_leave_code: leave_code,
          available_hours_before: availableBefore,
          available_hours_after: availableAfter,
        },
        overrideReason,
      });
      const chargeDesc = await getLeaveDescription(chargeCode);
      const txMsg = `${actorDisplay} deducted ${delta} hrs from ${chargeDesc} (${chargeCode}) balance for ${empDisplay} (${mode === "bulk" ? "HR bulk approval" : "HR approval"}).${formatBalanceUpdatedSuffix(availableBefore, availableAfter, delta)}`;
      await insertTransactionLog(employeeNumber, txMsg, actorEmployeeNumber, {
        audit_action: mode === "bulk" ? "HR leave bulk approval deduction" : "HR leave approval deduction",
        transaction_message: txMsg,
        leave_request_id: requestId,
        request_leave_code: leave_code,
        charge_to: chargeCode,
        deducted_hours: delta,
        available_hours_before: availableBefore,
        available_hours_after: availableAfter,
      });
    } else {
      if (result.kind === "restore") {
        // The date counts as a working day again; attendance/earnings screens recount it.
        try {
          notifyAttendanceChanged("updated", {
            scope: "leave-hr-reversed",
            personIDs: [employeeNumber],
            dates: [leave_date],
          });
        } catch (_n) {}
        const { chargeCode, restored, availableBefore, availableAfter } = result;
        const chargeDesc = await getLeaveDescription(chargeCode);
        const txMsg = `${actorDisplay} restored ${restored} hrs to ${chargeDesc} (${chargeCode}) balance for ${empDisplay} (reversal).${formatBalanceUpdatedSuffix(availableBefore, availableAfter, -restored)}`;
        await insertTransactionLog(employeeNumber, txMsg, actorEmployeeNumber, {
          audit_action: "HR leave approval reversal",
          transaction_message: txMsg,
          leave_request_id: requestId,
          charge_to: chargeCode,
          restored_hours: restored,
          available_hours_before: availableBefore,
          available_hours_after: availableAfter,
        });
      }
      const action = statusToLeaveAction(newStatus);
      const message =
        action &&
        buildLeaveTransactionMessage({
          action,
          actorDisplayName: actorDisplay,
          requesterDisplayName: empDisplay,
          leaveDesc,
          leaveDates: leave_date,
        });
      if (message) await insertTransactionLog(employeeNumber, message, actorEmployeeNumber);
    }

    const auditActionStr =
      {
        immediateSupervisor_approved: "Supervisor Approved Leave",
        hr_approved: "HR Approved Leave",
        denied: "Leave Request Denied",
        cancelled: "Cancel Leave Request",
      }[statusToLeaveAction(newStatus)] || "Update Leave Request";
    logAudit(
      { employeeNumber: actorEmployeeNumber },
      `${auditActionStr} - ${leaveDesc}`,
      "leave_request",
      requestId,
      employeeNumber,
    );
  } catch (e) {
    console.error("[leave] transition side effects:", e.message);
  }
};

// ============================================================
// POST /leave_request
//
// Files one Pending row per date. Credits are never touched here; they move only when HR
// approves. Non-admins may file only for themselves.
// ============================================================
router.post("/leave_request", async (req, res) => {
  const { employeeNumber, leave_code, leave_dates } = req.body || {};
  const actorEmployeeNumber = getActorEmployeeNumber(req, employeeNumber);
  const emp = String(employeeNumber || "").trim();
  const code = String(leave_code || "").trim();

  if (!emp || !code) {
    return res.status(400).json({ error: "employeeNumber and leave_code are required" });
  }
  if (!isAdminRole(req.user?.role) && !employeeNumbersMatch(emp, req.user?.employeeNumber)) {
    return res.status(403).json({ error: "You can only file leave requests for yourself." });
  }

  const rawDates = (Array.isArray(leave_dates) ? leave_dates : [leave_dates]).filter(
    (d) => d != null && String(d).trim() !== "",
  );
  const dates = [...new Set(rawDates.map(toMysqlDateOnly))];
  if (!rawDates.length || dates.some((d) => !d)) {
    return res.status(400).json({ error: "At least one valid leave date (YYYY-MM-DD) is required" });
  }
  dates.sort();

  const queryAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });

  try {
    const leaveTypeRows = await queryAsync(
      "SELECT leave_code, leave_description, gender_restriction FROM leave_table WHERE TRIM(leave_code) = TRIM(?) LIMIT 1",
      [code],
    ).catch(() =>
      // Older schema without gender_restriction.
      queryAsync("SELECT leave_code, leave_description FROM leave_table WHERE TRIM(leave_code) = TRIM(?) LIMIT 1", [code]),
    );
    if (!leaveTypeRows.length) {
      return res.status(400).json({ error: `Unknown leave type "${code}"` });
    }
    const leave_description = leaveTypeRows[0].leave_description || code;

    // CSC eligibility: JO/COS have no leave benefits; gender-restricted types.
    await leaveRules.assertEligibleToFile(emp, leaveTypeRows[0]);

    // Holidays are refused (HR may override with a reason). Days outside the employee's
    // official-time schedule are allowed, with a warning returned in `notices`.
    const nonWorkingAll = await leaveRules.findNonWorkingDates(emp, dates);
    const nonWorking = nonWorkingAll.filter((n) => n.kind === "holiday");
    const unscheduled = nonWorkingAll.filter((n) => n.kind === "no_schedule");
    const overrideReason = String(req.body?.non_working_override_reason || "").trim();
    const hrOverride = isAdminRole(req.user?.role) && req.body?.allow_non_working_days === true && overrideReason;
    if (nonWorking.length && !hrOverride) {
      return res.status(400).json({
        code: "NON_WORKING_DAY",
        error: `Leave is not counted on holidays (CSC MC 41 s.1998). Holiday: ${nonWorking
          .map((n) => `${n.date} (${n.reason})`)
          .join(", ")}.`,
        dates: nonWorking,
      });
    }
    const notices = leaveRules.filingNotices(code, dates);
    if (unscheduled.length) {
      notices.push({
        code: "NO_SCHEDULE",
        message: `No official time schedule on: ${unscheduled.map((n) => `${n.date} (${n.reason})`).join(", ")}. HR will check these dates.`,
        dates: unscheduled,
      });
    }

    const duplicates = await queryAsync(
      `SELECT DATE_FORMAT(leave_date, '%Y-%m-%d') AS d
       FROM leave_request
       WHERE CAST(employeeNumber AS CHAR) = CAST(? AS CHAR)
         AND leave_date IN (${dates.map(() => "?").join(",")})
         AND status IN (0, 1, 2)`,
      [emp, ...dates],
    );
    if (duplicates.length) {
      const taken = [...new Set(duplicates.map((r) => r.d))].sort();
      return res.status(409).json({
        error: `A leave request already exists for: ${taken.join(", ")}`,
        code: "DUPLICATE_LEAVE_DATE",
        dates: taken,
      });
    }

    const conn = await getPromiseConnection();
    try {
      await conn.beginTransaction();
      for (const date of dates) {
        await conn.execute(
          "INSERT INTO leave_request (employeeNumber, leave_code, leave_date, status, created_at) VALUES (?, ?, ?, 0, NOW())",
          [emp, code, date],
        );
      }
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    try {
      const [actorFullName, requesterFullName] = await Promise.all([
        getEmployeeFullName(actorEmployeeNumber),
        getEmployeeFullName(emp),
      ]);
      const requestMessage = buildLeaveTransactionMessage({
        action: "request",
        actorDisplayName: formatUserDisplayName(actorEmployeeNumber, actorFullName),
        requesterDisplayName: formatUserDisplayName(emp, requesterFullName),
        leaveDesc: leave_description,
        leaveDates: dates,
      });
      await insertTransactionLog(emp, requestMessage, actorEmployeeNumber);
      if (nonWorking.length && hrOverride) {
        await insertTransactionLog(
          emp,
          `Filed on non-working day(s) by HR override: ${nonWorking.map((n) => `${n.date} (${n.reason})`).join(", ")} — reason: ${overrideReason}`,
          actorEmployeeNumber,
        );
      }
      logAudit(
        { employeeNumber: actorEmployeeNumber },
        `Submit Leave Request - ${leave_description} (${dates.length} day(s))`,
        "leave_request",
        null,
        emp,
      );
    } catch (logErr) {
      console.error("[leave_request] submit log:", logErr.message);
    }

    emitLeaveChange("leaveRequestChanged");
    res.json({ message: "Leave requests created successfully", count: dates.length, notices });
  } catch (err) {
    if (err instanceof leaveRules.LeaveRequestRuleError) {
      return sendLeaveError(res, err, "Failed to create leave requests");
    }
    console.error("Error creating leave requests:", err);
    logAudit({ employeeNumber: actorEmployeeNumber }, "Submit Leave Request Failed", "leave_request", null, emp);
    if (!res.headersSent) res.status(500).json({ error: "Failed to create leave requests" });
  }
});

// ============================================================
// PUT /leave_request/bulk-update
//
// Applies the same transition to each id through transitionLeaveRequest (one transaction
// per row). HR bulk approve (status 2) requires hr_approval_rate and/or deduction_hours_each.
// Any row failure is reported with its reason; successful rows stay committed.
// ============================================================
router.put("/leave_request/bulk-update", requireAdmin, async (req, res) => {
  const { ids, status, hr_approval_rate, deduction_hours_each, charge_to, decision_context } = req.body || {};
  const actorEmployeeNumber = getActorEmployeeNumber(req);
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: "ids must be a non-empty array" });
  }
  const newStatus = Number(status);
  if (![0, 1, 2, 3, 4].includes(newStatus)) {
    return res.status(400).json({ error: "Invalid status value" });
  }
  if (newStatus === 2) {
    const rate = parseFloat(hr_approval_rate);
    const hoursEach = parseFloat(deduction_hours_each);
    if (!(Number.isFinite(rate) && rate > 0) && !(Number.isFinite(hoursEach) && hoursEach > 0)) {
      return res.status(400).json({
        error: "Bulk HR approval requires hr_approval_rate and/or deduction_hours_each in the request body.",
      });
    }
  }

  const results = [];
  for (const rawId of ids) {
    const requestId = parseInt(rawId, 10);
    if (!Number.isFinite(requestId)) {
      results.push({ id: rawId, ok: false, error: "Invalid id" });
      continue;
    }
    try {
      const result = await transitionLeaveRequest({
        req,
        requestId,
        newStatus,
        actorEmployeeNumber,
        isAdmin: true,
        deductionInput: {
          deduction_hours: deduction_hours_each,
          rate_decimal: hr_approval_rate,
          charge_to,
          decision_context,
        },
      });
      await runLeaveTransitionSideEffects({ result, actorEmployeeNumber, mode: "bulk", decision_context });
      results.push({ id: requestId, ok: true });
    } catch (e) {
      if ((Number(e?.status) || 500) >= 500) console.error("[bulk-update]", requestId, e?.message);
      results.push({ id: requestId, ok: false, error: e?.message || "Update failed", code: e?.code || null });
    }
  }

  emitLeaveChange("leaveRequestChanged");
  emitLeaveChange("leaveAssignmentChanged");

  const failed = results.filter((r) => !r.ok);
  const updated = results.length - failed.length;
  if (!failed.length) {
    return res.json({ message: "Bulk update successful", updated, newStatus });
  }
  return res.status(409).json({
    error: `${updated} of ${results.length} request(s) updated. Failed: ${failed
      .map((f) => `#${f.id} (${f.error})`)
      .join("; ")}`,
    updated,
    failed,
    newStatus,
  });
});

// ============================================================
// PUT /leave_request/:id
//
// Single status change through transitionLeaveRequest. Admins may apply any allowed
// transition; employees may only cancel their own request before HR approval.
// ============================================================
router.put("/leave_request/:id", async (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  if (!Number.isFinite(requestId)) {
    return res.status(400).json({ error: "Invalid leave request id" });
  }
  const newStatus = parseInt(req.body?.status, 10);
  const { deduction_hours, rate_decimal, charge_to, decision_context } = req.body || {};
  const actorEmployeeNumber = getActorEmployeeNumber(req);

  try {
    const result = await transitionLeaveRequest({
      req,
      requestId,
      newStatus,
      actorEmployeeNumber,
      isAdmin: isAdminRole(req.user?.role),
      deductionInput: { deduction_hours, rate_decimal, charge_to, decision_context },
    });
    await runLeaveTransitionSideEffects({ result, actorEmployeeNumber, mode: "single", decision_context });

    emitLeaveChange("leaveRequestChanged");
    if (result.kind !== "status") emitLeaveChange("leaveAssignmentChanged");
    res.json({
      id: requestId,
      employeeNumber: result.employeeNumber,
      leave_code: result.leave_code,
      leave_date: result.leave_date,
      status: newStatus,
      message: "Status updated successfully",
    });
  } catch (e) {
    logAudit(
      { employeeNumber: actorEmployeeNumber },
      "Update Leave Request Failed",
      "leave_request",
      requestId,
      null,
    );
    sendLeaveError(res, e, "Failed to update leave request");
  }
});

// ─── Leave credit usage ledger (transaction history + reconcile) ─────────────
router.get("/leave_credit_usage", requireAdmin, (req, res) => {
  const { employeeNumber, leave_code, leave_assignment_id } = req.query;
  let sql = `
    SELECT lcu.*
    FROM leave_credit_usage lcu
    WHERE 1 = 1
  `;
  const params = [];
  if (employeeNumber) {
    sql += ` AND lcu.employee_number = ?`;
    params.push(String(employeeNumber));
  }
  if (leave_code) {
    sql += ` AND TRIM(lcu.leave_code) = TRIM(?)`;
    params.push(String(leave_code));
  }
  if (leave_assignment_id) {
    sql += ` AND lcu.leave_assignment_id = ?`;
    params.push(parseInt(leave_assignment_id, 10));
  }
  sql += ` ORDER BY lcu.created_at DESC, lcu.id DESC LIMIT 1000`;
  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("[leave_credit_usage]", err.message);
      return res.status(500).json({ error: "Failed to fetch leave credit usage" });
    }
    res.json(rows || []);
  });
});

/** Sum leave hours posted for attendance tardiness (ledger: TARDINESS_DEDUCTION or legacy LEAVE_EARNING rows). */
router.get("/leave_credit_usage/tardiness_posted", requireAdmin, (req, res) => {
  const { employeeNumber, period_year, period_month, leave_code } = req.query;
  if (!employeeNumber || period_year == null || period_month == null) {
    return res.status(400).json({
      error: "employeeNumber, period_year, and period_month are required",
    });
  }
  const emp = String(employeeNumber).trim();
  const py = parseInt(period_year, 10);
  const pm = parseInt(period_month, 10);
  if (!emp || !Number.isFinite(py) || !Number.isFinite(pm)) {
    return res.status(400).json({ error: "Invalid employeeNumber or period" });
  }
  const lcRaw = leave_code != null ? String(leave_code).trim() : "";

  const tardinessWhere = `
    lcu.employee_number = ?
      AND lcu.voided_at IS NULL
      AND lcu.hours_delta < 0
      AND lcu.period_year = ?
      AND lcu.period_month = ?
      AND (
        lcu.source_type = 'TARDINESS_DEDUCTION'
        OR (lcu.source_type = 'LEAVE_EARNING' AND UPPER(IFNULL(le.entry_type, '')) = 'TARDINESS_DEDUCTION')
      )
  `;
  const paramsBase = [emp, py, pm];
  let sqlSum = `
    SELECT COALESCE(SUM(-lcu.hours_delta), 0) AS posted_hours
    FROM leave_credit_usage lcu
    LEFT JOIN leave_earnings le ON le.id = lcu.source_id AND lcu.source_type = 'LEAVE_EARNING'
    WHERE ${tardinessWhere}
  `;
  const paramsSum = [...paramsBase];
  if (lcRaw) {
    sqlSum += ` AND TRIM(lcu.leave_code) = TRIM(?)`;
    paramsSum.push(lcRaw);
  }
  db.query(sqlSum, paramsSum, (err, sRows) => {
    if (err) {
      console.error("[leave_credit_usage/tardiness_posted]", err.message);
      return res.status(500).json({ error: "Failed to sum tardiness deductions" });
    }
    const posted_hours =
      sRows && sRows[0] != null ? Number(sRows[0].posted_hours) || 0 : 0;

    let sqlLast = `
      SELECT lcu.leave_code
      FROM leave_credit_usage lcu
      LEFT JOIN leave_earnings le ON le.id = lcu.source_id AND lcu.source_type = 'LEAVE_EARNING'
      WHERE ${tardinessWhere}
    `;
    const paramsLast = [...paramsBase];
    if (lcRaw) {
      sqlLast += ` AND TRIM(lcu.leave_code) = TRIM(?)`;
      paramsLast.push(lcRaw);
    }
    sqlLast += ` ORDER BY lcu.id DESC LIMIT 1`;
    db.query(sqlLast, paramsLast, (e2, lRows) => {
      if (e2) {
        console.error("[leave_credit_usage/tardiness_posted:last]", e2.message);
        return res.json({ posted_hours, last_leave_code: null });
      }
      const last_leave_code =
        lRows && lRows[0] && lRows[0].leave_code != null
          ? String(lRows[0].leave_code).trim()
          : null;
      res.json({ posted_hours, last_leave_code });
    });
  });
});

router.post("/leave_credit_usage/reconcile", requireAdmin, async (req, res) => {
  const applyFix = req.body?.fix === true;
  const conn = await getPromiseConnection();
  try {
    const [assignments] = await conn.execute(
      `SELECT id, used_hours, total_hours, remaining_hours FROM leave_assignment`,
    );
    const mismatches = [];
    for (const r of assignments) {
      const { activeLines, usedFromLedger } = await fetchLedgerSumForAssignment(
        conn,
        r.id,
      );
      if (activeLines === 0) continue;
      const stored = parseDbHours(r.used_hours);
      if (Math.abs(stored - usedFromLedger) > 0.02) {
        mismatches.push({
          leave_assignment_id: r.id,
          stored_used_hours: stored,
          ledger_used_hours: usedFromLedger,
          diff: Number((stored - usedFromLedger).toFixed(4)),
        });
        if (applyFix) {
          await refreshLeaveAssignmentCacheFromLedger(conn, r.id);
        }
      }
    }
    res.json({
      checked: assignments.length,
      mismatchCount: mismatches.length,
      mismatches,
      fixed: applyFix,
    });
  } catch (e) {
    console.error("[leave_credit_usage/reconcile]", e.message);
    res.status(500).json({ error: e.message || "reconcile failed" });
  } finally {
    conn.release();
  }
});

// DELETE leave request — only for requests that never moved credits. An HR-approved
// request (or one with ledger history) must be cancelled instead so the deduction is
// reversed and the history is kept.
router.delete("/leave_request/:id", requireAdmin, (req, res) => {
  const actorEmpNum = getActorEmployeeNumber(req);
  // Fetch first so we have employee info for logging
  db.query(
    `SELECT lr.employeeNumber, lr.leave_code, lr.status, lt.leave_description,
            (SELECT COUNT(*) FROM leave_credit_usage lcu
              WHERE lcu.source_type = 'LEAVE_REQUEST' AND lcu.source_id = lr.id) AS ledger_lines
     FROM leave_request lr LEFT JOIN leave_table lt ON lr.leave_code = lt.leave_code WHERE lr.id = ?`,
    [req.params.id],
    (fetchErr, rows) => {
      if (fetchErr) return res.status(500).json({ error: "Failed to load leave request" });
      const targetRecord = rows && rows[0] ? rows[0] : null;
      if (!targetRecord) return res.status(404).json({ error: "Leave request not found" });
      if (Number(targetRecord.status) === 2 || Number(targetRecord.ledger_lines) > 0) {
        return res.status(409).json({
          error: "This request has deducted leave credits. Cancel it instead so the credits are restored and the history is kept.",
          code: "HAS_LEDGER_HISTORY",
        });
      }
      db.query("DELETE FROM leave_request WHERE id = ?", [req.params.id], async (err) => {
        if (err) {
          if (targetRecord) logAudit({ employeeNumber: actorEmpNum }, 'Delete Leave Request Failed', 'leave_request', req.params.id, targetRecord.employeeNumber);
          return res.status(500).json({ error: "Failed to delete leave request" });
        }
        if (targetRecord) {
          logAudit({ employeeNumber: actorEmpNum }, 'Delete Leave Request', 'leave_request', req.params.id, targetRecord.employeeNumber);
          try {
            const [empName, actorName] = await Promise.all([
              getEmployeeFullName(String(targetRecord.employeeNumber)),
              getEmployeeFullName(actorEmpNum),
            ]);
            const leaveDesc = targetRecord.leave_description || targetRecord.leave_code;
            const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
            const empDisplay = formatUserDisplayName(String(targetRecord.employeeNumber), empName);
            await insertTransactionLog(String(targetRecord.employeeNumber), `${actorDisplay} deleted leave request for ${leaveDesc} of ${empDisplay}`, actorEmpNum);
          } catch (e) { console.error('[leave] Delete request log error:', e.message); }
        }
        emitLeaveChange("leaveRequestChanged");
        res.json({ message: "Leave request deleted successfully" });
      });
    },
  );
});


module.exports = router;



