const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const { logAudit } = require("../middleware/auth");
const { notifyAttendanceChanged } = require("../socket/socketService");

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
 * HR modal context: employee employment type (label only) + hours/day for decimal↔hours sync.
 * Hours/day comes from leave_table.leave_hours for this leave_code (not a separate column on
 * employment types). Actual deduction is always what HR saves on leave_request
 * (deduction_applied_hours / hr_approval_rate).
 */
const fetchLeaveDeductionMeta = (employeeNumber, leave_code) =>
  new Promise((resolve) => {
    db.query(
      `SELECT etc.typeName AS employment_type_name,
              lt.leave_hours AS leave_type_hours
       FROM users u
       LEFT JOIN employment_category ec
         ON CAST(ec.employeeNumber AS CHAR) = CAST(u.employeeNumber AS CHAR)
       LEFT JOIN employment_type_config etc
         ON etc.id = COALESCE(ec.employmentCategory, u.employmentCategory)
       LEFT JOIN leave_table lt ON TRIM(lt.leave_code) = TRIM(?)
       WHERE CAST(u.employeeNumber AS CHAR) = CAST(? AS CHAR)
       LIMIT 1`,
      [leave_code, employeeNumber],
      (err, rows) => {
        if (!err && rows?.length) return resolve(rows[0]);
        db.query(
          `SELECT NULL AS employment_type_name,
                  leave_hours AS leave_type_hours
           FROM leave_table WHERE TRIM(leave_code) = TRIM(?) LIMIT 1`,
          [leave_code],
          (e2, r2) => resolve(r2?.[0] || {}),
        );
      },
    );
  });

const resolveHoursPerDayFromMeta = (meta) => {
  const lt = parseFloat(meta?.leave_type_hours);
  if (Number.isFinite(lt) && lt > 0)
    return { hoursPerDay: lt, rateSource: "leave_table" };
  return { hoursPerDay: 8, rateSource: "default" };
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

const getTotalRemainingHours = async (employeeNumber, leave_code) => {
  const rows = await getLeaveAssignmentsForCode(employeeNumber, leave_code);
  return rows.reduce((sum, r) => sum + (parseDbHours(r.remaining_hours) || 0), 0);
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

  const meta = await fetchLeaveDeductionMeta(employeeNumber, suggestedLeaveCode);
  const { hoursPerDay } = resolveHoursPerDayFromMeta(meta);

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
  const hasSufficientBalance = availableHours >= recommendedHours;
  const recommendedChargeTo = hasSufficientBalance
    ? suggestedLeaveCode
    : "UNPAID";

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
    recommendation_reason: hasLeaveForm
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

const getCtoRemainingHours = (employeeNumber) =>
  new Promise((resolve) => {
    if (!employeeNumber) return resolve(0);
    db.query(
      `SELECT SUM(COALESCE(remaining_hours, 0)) AS total
       FROM cto_credit
       WHERE CAST(employeeNumber AS CHAR) = CAST(? AS CHAR)`,
      [employeeNumber],
      (err, rows) => {
        if (err) return resolve(0);
        const total = parseFloat(rows?.[0]?.total);
        resolve(Number.isFinite(total) ? total : 0);
      },
    );
  });

const deductCtoHoursAcrossCredits = ({ employeeNumber, hours }) =>
  new Promise((resolve, reject) => {
    const need = Math.abs(Number(hours) || 0);
    if (!employeeNumber || !need) return resolve({ deducted: 0 });
    db.query(
      `SELECT id, remaining_hours, used_hours
       FROM cto_credit
       WHERE CAST(employeeNumber AS CHAR) = CAST(? AS CHAR)
         AND COALESCE(remaining_hours, 0) > 0
       ORDER BY
         CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END ASC,
         expiry_date ASC,
         id ASC`,
      [employeeNumber],
      async (err, rows) => {
        if (err) return reject(err);
        let remaining = need;
        let deducted = 0;
        for (const row of rows || []) {
          if (remaining <= 0) break;
          const rem = parseFloat(row.remaining_hours) || 0;
          const used = parseFloat(row.used_hours) || 0;
          if (rem <= 0) continue;
          const take = Math.min(rem, remaining);
          const newRem = Math.max(0, rem - take);
          const newUsed = used + take;
          await new Promise((res, rej) => {
            db.query(
              `UPDATE cto_credit SET remaining_hours = ?, used_hours = ? WHERE id = ?`,
              [newRem, newUsed, row.id],
              (e) => (e ? rej(e) : res()),
            );
          });
          deducted += take;
          remaining -= take;
        }
        resolve({ deducted });
      },
    );
  });

const buildHalfDayPolicySuggestion = async ({
  employeeNumber,
  leave_date,
  preferred_charge_to = null,
}) => {
  const filedLeave = await getFiledLeaveRequestForDate({ employeeNumber, leave_date });
  const hasLeaveForm = Boolean(filedLeave);

  const filedCode = String(filedLeave?.leave_code || "").trim().toUpperCase();
  const filedDesc = String(filedLeave?.leave_description || "").toLowerCase();
  const filedLooksSL = filedCode.includes("SL") || filedDesc.includes("sick");
  const defaultCharge = hasLeaveForm
    ? filedLooksSL
      ? "SL"
      : "CTO"
    : "VL";

  const preferred = String(preferred_charge_to || "").trim().toUpperCase();
  const chosen = preferred || defaultCharge;
  const allowed = hasLeaveForm ? ["SL", "CTO"] : ["VL"];
  const normalizedChoice = allowed.includes(chosen) ? chosen : defaultCharge;

  let hoursPerDay = 8;
  let availableHours = 0;
  let hasSufficientBalance = false;

  if (normalizedChoice === "CTO") {
    availableHours = await getCtoRemainingHours(employeeNumber);
  } else {
    const meta = await fetchLeaveDeductionMeta(employeeNumber, normalizedChoice);
    const resolved = resolveHoursPerDayFromMeta(meta);
    hoursPerDay = resolved.hoursPerDay;
    availableHours = await getTotalRemainingHours(employeeNumber, normalizedChoice);
  }

  const recommendedHours = Number((hoursPerDay / 2).toFixed(4));
  hasSufficientBalance = availableHours >= recommendedHours;

  return {
    employeeNumber: String(employeeNumber || ""),
    leave_date: toMysqlDateOnly(leave_date),
    is_half_day_absence: true,
    has_leave_form: hasLeaveForm,
    filed_leave_request: filedLeave
      ? {
          id: filedLeave.id,
          leave_code: filedLeave.leave_code,
          leave_description: filedLeave.leave_description || null,
          status: Number(filedLeave.status),
        }
      : null,
    allowed_charge_to: allowed,
    recommended_charge_to: normalizedChoice,
    recommended_rate_decimal: 0.5,
    recommended_hours: recommendedHours,
    hours_per_day: Number(hoursPerDay.toFixed(4)),
    available_hours: Number((availableHours || 0).toFixed(4)),
    has_sufficient_balance: hasSufficientBalance,
    recommendation_reason: hasLeaveForm
      ? "Half-day with leave form filed: charge may be SL or CTO."
      : "Half-day without leave form: charge to VL.",
  };
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
      (err) => {
        if (err) {
          console.error("[leave] Failed to insert deduction decision log:", err.message);
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
    const sql = `
      SELECT DISTINCT DATE_FORMAT(leave_date, '%Y-%m-%d') AS leave_date
      FROM deduction_decision_log
      WHERE employeeNumber = ?
        AND leave_code = ?
        AND decision_source = ?
        AND decision IN ('accepted','overridden')
        AND leave_date BETWEEN ? AND ?
      ORDER BY leave_date ASC
    `;
    db.query(
      sql,
      [
        String(employeeNumber || ""),
        String(leave_code || ""),
        decisionSource,
        toMysqlDateOnly(startDate),
        toMysqlDateOnly(endDate),
      ],
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

// Deduct or restore hours across multiple rows (newest-first).
// deltaHours > 0: deduct from remaining, add to used
// deltaHours < 0: restore to remaining, subtract from used
const applyHoursDeltaAcrossAssignments = async ({
  req,
  actorEmployeeNumber,
  employeeNumber,
  leave_code,
  deltaHours,
  requestId = null,
  reason,
}) => {
  const abs = Math.abs(Number(deltaHours) || 0);
  if (!employeeNumber || !leave_code || !abs) return;

  const rows = await getLeaveAssignmentsForCode(employeeNumber, leave_code);
  if (!rows.length) return;

  let remaining = abs;
  for (const row of rows) {
    if (remaining <= 0) break;

    const curRem = parseDbHours(row.remaining_hours) || 0;
    const curUsed = parseDbHours(row.used_hours) || 0;

    // Deduct
    if (deltaHours > 0) {
      if (curRem <= 0) continue;
      const take = Math.min(curRem, remaining);
      const newRem = Math.max(0, curRem - take);
      const newUsed = Math.max(0, curUsed + take);
      await new Promise((resolve) => {
        db.query(
          "UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?",
          [newRem, newUsed, row.id],
          () => resolve(),
        );
      });
      auditLeaveBalanceAdjustment({
        req,
        actorEmployeeNumber,
        employeeNumber,
        leave_code,
        requestId,
        reason,
        oldRemaining: curRem,
        newRemaining: newRem,
        oldUsed: curUsed,
        newUsed,
        deltaHours: -take,
        assignmentRowId: row.id,
      });
      remaining -= take;
      continue;
    }

    // Restore
    const canRestore = curUsed > 0;
    if (!canRestore) continue;
    const putBack = Math.min(curUsed, remaining);
    const newRem = curRem + putBack;
    const newUsed = Math.max(0, curUsed - putBack);
    await new Promise((resolve) => {
      db.query(
        "UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?",
        [newRem, newUsed, row.id],
        () => resolve(),
      );
    });
    auditLeaveBalanceAdjustment({
      req,
      actorEmployeeNumber,
      employeeNumber,
      leave_code,
      requestId,
      reason,
      oldRemaining: curRem,
      newRemaining: newRem,
      oldUsed: curUsed,
      newUsed,
      deltaHours: +putBack,
      assignmentRowId: row.id,
    });
    remaining -= putBack;
  }
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

const insertTransactionLog = (employeeId, message, actorEmployeeNumber = null) =>
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
          logAudit(
            { employeeNumber: actorEmployeeNumber || employeeId },
            message,
            'leave_transaction',
            result.insertId,
            employeeId,
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
router.get("/employees", (req, res) => {
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
router.get("/leave_table", (req, res) => {
  db.query("SELECT * FROM leave_table ORDER BY leave_code", (err, results) => {
    if (err)
      return res.status(500).json({ error: "Failed to fetch leave types" });
    res.json(results);
  });
});

router.post("/leave_table", (req, res) => {
 const { leave_code, leave_description, leave_hours, gender_restriction } = req.body;
db.query(
  "INSERT INTO leave_table (leave_code, leave_description, leave_hours, gender_restriction) VALUES (?, ?, ?, ?)",
  [leave_code, leave_description, leave_hours || 0, gender_restriction || null],
    (err, result) => {
      if (err) {
        logAudit({ employeeNumber: getActorEmployeeNumber(req) }, 'Insert Failed', 'leave_table', null, null);
        return res.status(500).json({ error: "Failed to create leave type" });
      }
      logAudit({ employeeNumber: getActorEmployeeNumber(req) }, 'Insert', 'leave_table', result.insertId, null);
      res.json({
        id: result.insertId,
        leave_code,
        leave_description,
        leave_hours,
      });
    },
  );
});

router.put("/leave_table/:id", (req, res) => {
  const { id } = req.params;
 const { leave_code, leave_description, leave_hours, gender_restriction } = req.body;
db.query(
  "UPDATE leave_table SET leave_code = ?, leave_description = ?, leave_hours = ?, gender_restriction = ? WHERE id = ?",
  [leave_code, leave_description, leave_hours, gender_restriction || null, id],
    (err) => {
      if (err) {
        logAudit({ employeeNumber: getActorEmployeeNumber(req) }, 'Update Failed', 'leave_table', id, null);
        return res.status(500).json({ error: "Failed to update leave type" });
      }
      logAudit({ employeeNumber: getActorEmployeeNumber(req) }, 'Update', 'leave_table', id, null);
      res.json({ id, leave_code, leave_description, leave_hours });
    },
  );
});

router.delete("/leave_table/:id", (req, res) => {
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
router.get("/leave_assignment", (req, res) => {
  const query = `
    SELECT la.id, la.employeeNumber, la.leave_code, la.total_hours, la.remaining_hours, la.used_hours,
      la.approve_date AS approved_date, la.carried_forward_hours, la.allocated_hours, la.period_year, la.period_semester,
      lt.leave_description, lt.leave_hours as default_hours,
      p.firstName, p.middleName, p.lastName, p.nameExtension,
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) as fullName
    FROM leave_assignment la
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

router.get("/leave_assignment/employee/:employeeNumber", (req, res) => {
  const query = `
    SELECT la.id, la.employeeNumber, la.leave_code, la.total_hours, la.remaining_hours, la.used_hours,
      la.approve_date AS approved_date, la.carried_forward_hours, la.allocated_hours, la.period_year, la.period_semester,
      lt.leave_description
    FROM leave_assignment la
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
  (req, res) => {
    const { employeeNumber, leave_code } = req.params;
    const query = `
    SELECT id, remaining_hours, period_year, period_semester, allocated_hours, carried_forward_hours, total_hours, used_hours
    FROM leave_assignment
    WHERE employeeNumber = ? AND leave_code = ?
    ORDER BY period_year DESC,
      CASE WHEN period_semester = '2nd' THEN 3 WHEN period_semester = '1st' THEN 2 ELSE 1 END DESC
    LIMIT 1
  `;
    db.query(query, [employeeNumber, leave_code], (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Failed to calculate carry forward" });
      if (results.length === 0)
        return res.json({
          hasHistory: false,
          suggestedCarryForward: 0,
          previousPeriod: null,
        });
      const prev = results[0];
      res.json({
        hasHistory: true,
        suggestedCarryForward: parseDbHours(prev.remaining_hours) || 0,
        previousPeriod: normalizeAssignmentRow(prev),
      });
    });
  },
);

router.post("/leave_assignment", (req, res) => {
  const {
    employeeNumber,
    leave_code,
    total_hours,
    carried_forward_hours,
    allocated_hours,
    period_year,
    period_semester,
  } = req.body;

  const checkQuery =
    "SELECT id FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ? AND period_year = ? AND period_semester <=> ?";
  db.query(
    checkQuery,
    [
      employeeNumber,
      leave_code,
      period_year || new Date().getFullYear(),
      period_semester,
    ],
    (checkErr, existing) => {
      if (checkErr)
        return res
          .status(500)
          .json({ error: "Failed to check existing assignment" });
      if (existing.length > 0)
        return res
          .status(400)
          .json({
            error:
              "This employee already has an assignment for this leave type and period",
          });

      const customHoursProvided =
        req.body.hasOwnProperty("total_hours") &&
        total_hours !== null &&
        total_hours !== undefined &&
        total_hours !== "";

      if (customHoursProvided) {
        // If UI sends total_hours, treat it as the intended ALLOCATED amount for the period
        // (carry-forward is stored separately and must be included in total/remaining).
        const customHours = parseDbHours(total_hours);
        const carriedForward = parseDbHours(carried_forward_hours) || 0;
        const allocated = allocated_hours !== undefined && allocated_hours !== null && allocated_hours !== ''
          ? parseDbHours(allocated_hours)
          : customHours;
        const currentYear = period_year || new Date().getFullYear();
        const semester = period_semester || null;
        const computedTotal = Math.max(0, carriedForward + allocated);

        const insertQuery = `INSERT INTO leave_assignment (leave_code, employeeNumber, total_hours, remaining_hours, used_hours, approve_date, carried_forward_hours, allocated_hours, period_year, period_semester) VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)`;
        db.query(
          insertQuery,
          [
            leave_code,
            employeeNumber,
            computedTotal,
            computedTotal,
            carriedForward,
            allocated,
            currentYear,
            semester,
          ],
          (insertErr, result) => {
            if (insertErr) {
              logAudit({ employeeNumber: getActorEmployeeNumber(req, employeeNumber) }, 'Assign Leave Failed', 'leave_assignment', null, employeeNumber);
              return res
                .status(500)
                .json({
                  error:
                    "Failed to create leave assignment: " + insertErr.message,
                });
            }
            const actorEmpNum = getActorEmployeeNumber(req, employeeNumber);
            const insertedId = result.insertId;
            (async () => {
              try {
                const [empName, actorName] = await Promise.all([
                  getEmployeeFullName(String(employeeNumber)),
                  getEmployeeFullName(actorEmpNum),
                ]);
                const leaveDesc = await new Promise(resolve =>
                  db.query('SELECT leave_description FROM leave_table WHERE leave_code = ? LIMIT 1', [leave_code], (e, r) =>
                    resolve((r && r[0] && r[0].leave_description) || leave_code)
                  )
                );
                const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
                const empDisplay = formatUserDisplayName(String(employeeNumber), empName);
                logAudit({ employeeNumber: actorEmpNum }, `Assign Leave - ${leaveDesc} (${customHours} hrs)`, 'leave_assignment', insertedId, employeeNumber);
                await insertTransactionLog(String(employeeNumber), `${actorDisplay} assigned ${leaveDesc} (${customHours} hrs) to ${empDisplay}`, actorEmpNum);
              } catch (e) { console.error('[leave] Assign log error:', e.message); }
            })();
            emitLeaveChange("leaveAssignmentChanged");
            res.json({
              id: result.insertId,
              leave_code,
              employeeNumber,
              total_hours: computedTotal,
              remaining_hours: computedTotal,
              used_hours: 0,
              approved_date: null,
              carried_forward_hours: carriedForward,
              allocated_hours: allocated,
              period_year: currentYear,
              period_semester: semester,
            });
          },
        );
      } else {
        db.query(
          "SELECT leave_hours FROM leave_table WHERE leave_code = ?",
          [leave_code],
          (hoursErr, leaveType) => {
            if (hoursErr)
              return res
                .status(500)
                .json({ error: "Failed to fetch leave type" });
            const defaultHours = leaveType[0]?.leave_hours || 0;
            const carriedForward = parseDbHours(carried_forward_hours) || 0;
            const allocated =
              allocated_hours !== undefined && allocated_hours !== null && allocated_hours !== ''
                ? parseDbHours(allocated_hours)
                : (parseDbHours(defaultHours) || 0);
            const currentYear = period_year || new Date().getFullYear();
            const semester = period_semester || null;
            const computedTotal = Math.max(0, carriedForward + allocated);

            const insertQuery = `INSERT INTO leave_assignment (leave_code, employeeNumber, total_hours, remaining_hours, used_hours, approve_date, carried_forward_hours, allocated_hours, period_year, period_semester) VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)`;
            db.query(
              insertQuery,
              [
                leave_code,
                employeeNumber,
                computedTotal,
                computedTotal,
                carriedForward,
                allocated,
                currentYear,
                semester,
              ],
              (insertErr, result) => {
                if (insertErr) {
                  logAudit({ employeeNumber: getActorEmployeeNumber(req, employeeNumber) }, 'Assign Leave Failed', 'leave_assignment', null, employeeNumber);
                  return res
                    .status(500)
                    .json({ error: "Failed to create leave assignment" });
                }
                const actorEmpNum = getActorEmployeeNumber(req, employeeNumber);
                const insertedId = result.insertId;
                (async () => {
                  try {
                    const [empName, actorName] = await Promise.all([
                      getEmployeeFullName(String(employeeNumber)),
                      getEmployeeFullName(actorEmpNum),
                    ]);
                    const leaveDescDefault = await new Promise(resolve =>
                      db.query('SELECT leave_description FROM leave_table WHERE leave_code = ? LIMIT 1', [leave_code], (e, r) =>
                        resolve((r && r[0] && r[0].leave_description) || leave_code)
                      )
                    );
                    const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
                    const empDisplay = formatUserDisplayName(String(employeeNumber), empName);
                    logAudit({ employeeNumber: actorEmpNum }, `Assign Leave - ${leaveDescDefault} (${defaultHours} hrs)`, 'leave_assignment', insertedId, employeeNumber);
                    await insertTransactionLog(String(employeeNumber), `${actorDisplay} assigned ${leaveDescDefault} (${defaultHours} hrs) to ${empDisplay}`, actorEmpNum);
                  } catch (e) { console.error('[leave] Assign log error:', e.message); }
                })();
                emitLeaveChange("leaveAssignmentChanged");
                res.json({
                  id: result.insertId,
                  leave_code,
                  employeeNumber,
                  total_hours: computedTotal,
                  remaining_hours: computedTotal,
                  used_hours: 0,
                  approved_date: null,
                  carried_forward_hours: carriedForward,
                  allocated_hours: allocated,
                  period_year: currentYear,
                  period_semester: semester,
                });
              },
            );
          },
        );
      }
    },
  );
});

router.put("/leave_assignment/:id", (req, res) => {
  const { id } = req.params;
  const {
    employeeNumber,
    leave_code,
    remaining_hours,
    total_hours,
    carried_forward_hours,
    allocated_hours,
    period_year,
    period_semester,
  } = req.body;

  db.query(
    "SELECT * FROM leave_assignment WHERE id = ?",
    [id],
    (err, current) => {
      if (err)
        return res.status(500).json({ error: "Failed to fetch assignment" });
      if (current.length === 0)
        return res.status(404).json({ error: "Assignment not found" });

      // Safely parse numeric fields to avoid NaN when empty strings are supplied
      const currentTotal = parseDbHours(current[0].total_hours) || 0;
      const currentCarried = parseDbHours(current[0].carried_forward_hours) || 0;
      const currentAllocated = parseDbHours(current[0].allocated_hours) || currentTotal;
      const currentUsed = parseDbHours(current[0].used_hours) || 0;

      const newCarriedForward =
        carried_forward_hours !== undefined && carried_forward_hours !== ''
          ? parseDbHours(carried_forward_hours)
          : currentCarried;

      const newAllocated =
        allocated_hours !== undefined && allocated_hours !== ''
          ? parseDbHours(allocated_hours)
          : currentAllocated;

      // Enforce table invariant:
      // total_hours = carried_forward_hours + allocated_hours
      const computedTotal = Math.max(0, newCarriedForward + newAllocated);

      // If remaining_hours is provided, treat it as the desired balance and derive used.
      // Otherwise keep existing used_hours and recompute remaining from computed total.
      const newRemaining =
        remaining_hours !== undefined && remaining_hours !== ''
          ? Math.min(computedTotal, Math.max(0, parseDbHours(remaining_hours)))
          : Math.max(0, computedTotal - currentUsed);

      const newUsed = Math.max(0, computedTotal - newRemaining);

      // If caller provided total_hours, ignore it (it must be derived from carried+allocated).
      // This prevents "total resets to 8" when carry-forward exists.
      const newTotal = computedTotal;
      const newYear =
        period_year !== undefined ? period_year : current[0].period_year;
      const newSemester =
        period_semester !== undefined
          ? period_semester
          : current[0].period_semester;

      const updateQuery = `UPDATE leave_assignment SET leave_code = ?, employeeNumber = ?, total_hours = ?, remaining_hours = ?, used_hours = ?, carried_forward_hours = ?, allocated_hours = ?, period_year = ?, period_semester = ? WHERE id = ?`;
      db.query(
        updateQuery,
        [
          leave_code,
          employeeNumber,
          newTotal,
          newRemaining,
          newUsed,
          newCarriedForward,
          newAllocated,
          newYear,
          newSemester,
          id,
        ],
        (updateErr) => {
          if (updateErr) {
            logAudit({ employeeNumber: getActorEmployeeNumber(req) }, 'Update Leave Assignment Failed', 'leave_assignment', id, employeeNumber);
            return res
              .status(500)
              .json({ error: "Failed to update leave assignment" });
          }
          const actorEmpNum = getActorEmployeeNumber(req);
          (async () => {
            try {
              const [empName, actorName] = await Promise.all([
                getEmployeeFullName(String(employeeNumber)),
                getEmployeeFullName(actorEmpNum),
              ]);
              const leaveDesc = await new Promise(resolve =>
                db.query('SELECT leave_description FROM leave_table WHERE leave_code = ? LIMIT 1', [leave_code], (e, r) =>
                  resolve((r && r[0] && r[0].leave_description) || leave_code)
                )
              );
              const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
              const empDisplay = formatUserDisplayName(String(employeeNumber), empName);
              logAudit({ employeeNumber: actorEmpNum }, `Update Leave Assignment - ${leaveDesc} (${newTotal} hrs)`, 'leave_assignment', id, employeeNumber);
              await insertTransactionLog(String(employeeNumber), `${actorDisplay} updated ${leaveDesc} assignment for ${empDisplay} (${newTotal} hrs total, ${newRemaining} hrs remaining)`, actorEmpNum);
            } catch (e) { console.error('[leave] Update assignment log error:', e.message); }
          })();
          emitLeaveChange("leaveAssignmentChanged");
          res.json({
            id,
            leave_code,
            employeeNumber,
            total_hours: newTotal,
            remaining_hours: newRemaining,
            used_hours: newUsed,
            carried_forward_hours: newCarriedForward,
            allocated_hours: newAllocated,
            period_year: newYear,
            period_semester: newSemester,
          });
        },
      );
    },
  );
});

router.delete("/leave_assignment/:id", (req, res) => {
  const actorEmpNum = getActorEmployeeNumber(req);
  // Fetch first so we have employee info for logging
  db.query(
    "SELECT employeeNumber, leave_code FROM leave_assignment WHERE id = ?",
    [req.params.id],
    (fetchErr, rows) => {
      const targetRecord = (!fetchErr && rows && rows[0]) ? rows[0] : null;
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

// ============================================
// LEAVE REQUESTS
// ============================================
router.get("/leave_request", (req, res) => {
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

router.get("/leave_request/transactions", (req, res) => {
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
router.post("/leave_request/deduction-suggestion", (req, res) => {
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

router.post("/leave_request/halfday-deduction-suggestion", (req, res) => {
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
router.post("/leave_request/halfday-deduction-applied-dates", (req, res) => {
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

router.post("/leave_request/halfday-deduction-apply", (req, res) => {
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

      if (!suggestion.has_sufficient_balance) {
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
      if (availableBefore < hours) {
        return res.status(400).json({
          error: `Insufficient ${chargeTo} balance for ${hours} hours deduction`,
          suggestion,
        });
      }
      let availableAfter = availableBefore;

      if (chargeTo === "CTO") {
        const result = await deductCtoHoursAcrossCredits({
          employeeNumber,
          hours,
        });
        if (!Number.isFinite(result?.deducted) || result.deducted < hours) {
          return res.status(400).json({
            error: "CTO deduction failed due to insufficient remaining credits",
          });
        }
        availableAfter = await getCtoRemainingHours(employeeNumber);
      } else {
        await applyHoursDeltaAcrossAssignments({
          req,
          actorEmployeeNumber,
          employeeNumber,
          leave_code: chargeTo,
          deltaHours: hours,
          requestId: null,
          reason: `Half-day policy deduction (${chargeTo}) — deducted ${hours} hours`,
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

      await insertDeductionDecisionLog({
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
        },
        overrideReason,
      });

      const [empName, actorName] = await Promise.all([
        getEmployeeFullName(String(employeeNumber)),
        getEmployeeFullName(actorEmployeeNumber),
      ]);
      const actorDisplay = formatUserDisplayName(actorEmployeeNumber, actorName);
      const empDisplay = formatUserDisplayName(String(employeeNumber), empName);
      await insertTransactionLog(
        String(employeeNumber),
        `${actorDisplay} applied half-day deduction of ${hours} hrs to ${chargeTo} for ${empDisplay} (${toMysqlDateOnly(leave_date)}).`,
        actorEmployeeNumber,
      );

      emitLeaveChange("leaveAssignmentChanged");
      res.json({
        message: "Half-day deduction applied successfully",
        employeeNumber,
        leave_date: toMysqlDateOnly(leave_date),
        charge_to: chargeTo,
        deducted_hours: hours,
      });
    } catch (e) {
      console.error("[halfday-deduction-apply]", e);
      res.status(500).json({ error: e.message || "Half-day deduction apply failed" });
    }
  })();
});

// HR: employment category hours/day for leave deduction (LeaveRequest.jsx modal).
router.post("/leave_request/hr-deduction-context", (req, res) => {
  const { employeeNumber, leave_code } = req.body || {};
  if (!employeeNumber || !leave_code) {
    return res
      .status(400)
      .json({ error: "employeeNumber and leave_code are required" });
  }
  (async () => {
    try {
      const meta = await fetchLeaveDeductionMeta(employeeNumber, leave_code);
      const { hoursPerDay, rateSource } = resolveHoursPerDayFromMeta(meta);
      res.json({
        hoursPerDay,
        rateSource,
        employmentTypeName: meta.employment_type_name || null,
      });
    } catch (e) {
      console.error("[hr-deduction-context]", e.message);
      res.status(500).json({ error: "Failed to load deduction context" });
    }
  })();
});

router.get("/leave_request/:employeeNumber", (req, res) => {
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

router.get("/leave_request/transactions/:employeeNumber", (req, res) => {
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
// POST /leave_request
//
// RULES:
//  1. Each requested date = 8 hours.
//  2. We ONLY check and deduct from the ALLOCATED row
//     (the row where carried_forward_hours IS NULL or = 0).
//     Carry-balance rows are NEVER touched.
//  3. If the employee's allocated remaining_hours < hours needed
//     → reject with HTTP 400 "Insufficient Leave Balance".
// ============================================================
router.post("/leave_request", (req, res) => {
  const { employeeNumber, leave_code, leave_dates, status } = req.body;
  const actorEmployeeNumber = getActorEmployeeNumber(req, employeeNumber);
  const dates = Array.isArray(leave_dates) ? leave_dates : [leave_dates];

  if (!dates.length)
    return res
      .status(400)
      .json({ error: "At least one leave date is required" });

  const hoursNeeded = dates.length * 8;

  const proceed = async () => {
    const totalRemaining = await getTotalRemainingHours(employeeNumber, leave_code);
    // ── BALANCE CHECK (TOTAL across rows) ───────────────────────
    if (totalRemaining < hoursNeeded) {
      const remainingDays = (totalRemaining / 8).toFixed(1);
      const neededDays = dates.length;
      return res.status(400).json({
        error: "Insufficient Leave Balance",
        detail: `You requested ${neededDays} day(s) but only have ${remainingDays} allocated day(s) remaining.`,
        remaining_hours: totalRemaining,
        required_hours: hoursNeeded,
      });
    }

    // ── INSERT all leave request rows ──────────────────────────
    const insertPromises = dates.map(
      (date) =>
        new Promise((resolve, reject) => {
          db.query(
            "INSERT INTO leave_request (employeeNumber, leave_code, leave_date, status, created_at) VALUES (?, ?, ?, ?, NOW())",
            [employeeNumber, leave_code, date, status || 0],
            (err, result) => (err ? reject(err) : resolve(result)),
          );
        }),
    );

    Promise.all(insertPromises)
.then(() => {
  db.query(
    "SELECT leave_description FROM leave_table WHERE TRIM(leave_code) = TRIM(?) LIMIT 1",
    [leave_code],
    async (err, leaveTypeRows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Leave type lookup failed" });
      }

      const leave_description =
        (leaveTypeRows &&
          leaveTypeRows[0] &&
          leaveTypeRows[0].leave_description) ||
        leave_code;

      const [actorFullName, requesterFullName] = await Promise.all([
        getEmployeeFullName(actorEmployeeNumber),
        getEmployeeFullName(employeeNumber),
      ]);

      const actorDisplayName = formatUserDisplayName(
        actorEmployeeNumber,
        actorFullName
      );
      const requesterDisplayName = formatUserDisplayName(
        employeeNumber,
        requesterFullName
      );

      const requestMessage = buildLeaveTransactionMessage({
        action: "request",
        actorDisplayName,
        requesterDisplayName,
        leaveDesc: leave_description,
        leaveDates: dates,
      });

      await insertTransactionLog(
        employeeNumber,
        requestMessage,
        actorEmployeeNumber
      );

      logAudit({ employeeNumber: actorEmployeeNumber }, `Submit Leave Request - ${leave_description} (${dates.length} day(s))`, 'leave_request', null, employeeNumber);
      emitLeaveChange("leaveRequestChanged");

      res.json({
        message: "Leave requests created successfully",
        count: dates.length,
      });
    }
  );
})
      .catch((err) => {
        console.error("Error creating leave requests:", err);
        logAudit({ employeeNumber: actorEmployeeNumber }, 'Submit Leave Request Failed', 'leave_request', null, employeeNumber);
        res.status(500).json({ error: "Failed to create leave requests" });
      });
  };
  proceed().catch((e) => {
    console.error("[leave_request] balance check error:", e.message);
    res.status(500).json({ error: "Balance check failed" });
  });
});

// ============================================================
// PUT /leave_request/bulk-update
//
// HR bulk approve (status 2): requires hr_approval_rate and/or deduction_hours_each
// in the body. Per row: hours = deduction_hours_each OR hr_approval_rate × hours/day.
// ============================================================
router.put("/leave_request/bulk-update", (req, res) => {
  const { ids, status, hr_approval_rate, deduction_hours_each, decision_context } =
    req.body;
  const actorEmployeeNumber = getActorEmployeeNumber(req);
  if (!Array.isArray(ids) || !ids.length)
    return res.status(400).json({ error: "ids must be a non-empty array" });
  const newStatus = Number(status);
  if (![0, 1, 2, 3, 4].includes(newStatus))
    return res.status(400).json({ error: "Invalid status value" });

  const bulkRate = parseFloat(hr_approval_rate);
  const bulkHoursEach = parseFloat(deduction_hours_each);
  if (newStatus === 2) {
    const hasRate = Number.isFinite(bulkRate) && bulkRate > 0;
    const hasHours = Number.isFinite(bulkHoursEach) && bulkHoursEach > 0;
    if (!hasRate && !hasHours) {
      return res.status(400).json({
        error:
          "Bulk HR approval requires hr_approval_rate and/or deduction_hours_each in the request body.",
      });
    }
  }

  const placeholders = ids.map(() => "?").join(",");
  db.query(
    `SELECT lr.id, lr.employeeNumber, lr.leave_code, lr.leave_date, lr.status,
            lr.deduction_applied_hours, lt.leave_description
     FROM leave_request lr
     LEFT JOIN leave_table lt ON lr.leave_code = lt.leave_code
     WHERE lr.id IN (${placeholders})`,
    ids,
    (err, requests) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!requests.length)
        return res
          .status(404)
          .json({ error: "No leave requests found with provided IDs" });

      db.query(
        `UPDATE leave_request SET status = ? WHERE id IN (${placeholders})`,
        [newStatus, ...ids],
        (updateErr) => {
          if (updateErr)
            return res.status(500).json({ error: updateErr.message });

          (async () => {
            try {
              const hasRate = Number.isFinite(bulkRate) && bulkRate > 0;
              const hasHours =
                Number.isFinite(bulkHoursEach) && bulkHoursEach > 0;

              if (newStatus === 2) {
                for (const reqRow of requests) {
                  const oldSt = Number(reqRow.status);
                  if (oldSt === 2) continue;
                  const availableBefore = await getTotalRemainingHours(
                    reqRow.employeeNumber,
                    reqRow.leave_code,
                  );
                  const meta = await fetchLeaveDeductionMeta(
                    reqRow.employeeNumber,
                    reqRow.leave_code,
                  );
                  const { hoursPerDay } = resolveHoursPerDayFromMeta(meta);
                  let delta;
                  let storedRate;
                  if (hasHours) {
                    delta = bulkHoursEach;
                    storedRate = hasRate
                      ? Number(bulkRate.toFixed(3))
                      : Number((delta / hoursPerDay).toFixed(3));
                  } else {
                    delta = bulkRate * hoursPerDay;
                    storedRate = Number(bulkRate.toFixed(3));
                  }
                  await applyHoursDeltaAcrossAssignments({
                    req,
                    actorEmployeeNumber,
                    employeeNumber: reqRow.employeeNumber,
                    leave_code: reqRow.leave_code,
                    deltaHours: delta,
                    requestId: reqRow.id,
                    reason: `HR Approved (bulk) — deducted ${delta} hours`,
                  });
                  const availableAfter = await getTotalRemainingHours(
                    reqRow.employeeNumber,
                    reqRow.leave_code,
                  );
                  await new Promise((resolve) => {
                    db.query(
                      `UPDATE leave_request SET deduction_applied_hours = ?, hr_approval_rate = ? WHERE id = ?`,
                      [delta, storedRate, reqRow.id],
                      () => resolve(),
                    );
                  });
                  try {
                    await syncApprovedLeaveToAttendanceRecord(
                      reqRow.employeeNumber,
                      reqRow.leave_date,
                    );
                  } catch (syncErr) {
                    console.error(
                      "[leave] bulk attendance sync:",
                      syncErr.message,
                    );
                  }

                  const fallbackSuggestion = await buildDeductionSuggestion({
                    employeeNumber: reqRow.employeeNumber,
                    leave_code: reqRow.leave_code,
                    leave_date: reqRow.leave_date,
                    has_leave_form: true,
                    is_half_day_absence: false,
                    requested_rate_decimal: storedRate,
                  });
                  const systemRecommendation =
                    decision_context?.system_recommendation || fallbackSuggestion;
                  const overrideReason =
                    (decision_context?.override_reason || "").trim() || null;
                  const decision =
                    overrideReason ||
                    !nearlyEqual(systemRecommendation?.recommended_hours, delta) ||
                    !nearlyEqual(
                      systemRecommendation?.recommended_rate_decimal,
                      storedRate,
                    )
                      ? "overridden"
                      : "accepted";
                  await insertDeductionDecisionLog({
                    leaveRequestId: reqRow.id,
                    employeeNumber: reqRow.employeeNumber,
                    leave_code: reqRow.leave_code,
                    leave_date: reqRow.leave_date,
                    decision,
                    decisionSource: "hr_bulk_approval",
                    actorEmployeeNumber,
                    systemRecommendation,
                    finalApplied: {
                      applied_rate_decimal: storedRate,
                      applied_hours: delta,
                      available_hours_before: availableBefore,
                      available_hours_after: availableAfter,
                    },
                    overrideReason,
                  });
                }
              } else if (newStatus === 3 || newStatus === 4) {
                for (const reqRow of requests) {
                  const oldSt = Number(reqRow.status);
                  if (oldSt !== 2) continue;
                  const applied = parseFloat(reqRow.deduction_applied_hours);
                  const restoreAmt =
                    Number.isFinite(applied) && applied > 0 ? applied : 8;
                  await applyHoursDeltaAcrossAssignments({
                    req,
                    actorEmployeeNumber,
                    employeeNumber: reqRow.employeeNumber,
                    leave_code: reqRow.leave_code,
                    deltaHours: -restoreAmt,
                    requestId: reqRow.id,
                    reason: `HR approval reversed (bulk) — restored ${restoreAmt} hours`,
                  });
                  await new Promise((resolve) => {
                    db.query(
                      `UPDATE leave_request SET deduction_applied_hours = NULL, hr_approval_rate = NULL WHERE id = ?`,
                      [reqRow.id],
                      () => resolve(),
                    );
                  });
                }
              }

              const action = statusToLeaveAction(newStatus);
              if (action) {
                const actorFullName =
                  await getEmployeeFullName(actorEmployeeNumber);
                const actorDisplayName = formatUserDisplayName(
                  actorEmployeeNumber,
                  actorFullName,
                );

                const nameCache = new Map();
                const getRequesterDisplayName = async (empNo) => {
                  const key = String(empNo || "");
                  if (nameCache.has(key)) return nameCache.get(key);
                  const fullName = await getEmployeeFullName(empNo);
                  const display = formatUserDisplayName(empNo, fullName);
                  nameCache.set(key, display);
                  return display;
                };

                await Promise.all(
                  requests.map(async (request) => {
                    const requesterDisplayName = await getRequesterDisplayName(
                      request.employeeNumber,
                    );
                    const message = buildLeaveTransactionMessage({
                      action,
                      actorDisplayName,
                      requesterDisplayName,
                      leaveDesc: request.leave_description,
                      leaveDates: request.leave_date,
                    });
                    return insertTransactionLog(
                      String(request.employeeNumber),
                      message,
                      actorEmployeeNumber,
                    );
                  }),
                );
              }

              emitLeaveChange("leaveRequestChanged");
              emitLeaveChange("leaveAssignmentChanged");
              res.json({
                message: "Bulk update successful",
                updated: requests.length,
                newStatus,
              });
            } catch (e) {
              console.error("[bulk-update]", e);
              res
                .status(500)
                .json({ error: e.message || "Bulk update failed" });
            }
          })();
        },
      );
    },
  );
});

// ============================================================
// PUT /leave_request/:id
//
// Deducts / restores ONLY from the ALLOCATED row.
// ============================================================
router.put("/leave_request/:id", (req, res) => {
  const { id } = req.params;
  const {
    employeeNumber,
    leave_code,
    leave_date,
    status,
    deduction_hours,
    rate_decimal,
    decision_context,
  } = req.body;
  const actorEmployeeNumber = getActorEmployeeNumber(req);

  db.query(
    "SELECT * FROM leave_request WHERE id = ?",
    [id],
    (err, currentReq) => {
      if (err)
        return res.status(500).json({ error: "Failed to fetch request" });
      if (!currentReq.length)
        return res.status(404).json({ error: "Leave request not found" });

      const request = currentReq[0];
      const oldStatus = parseInt(request.status);
      const newStatus = parseInt(status);

      const updateStatus = (opts = {}) => {
        const { setDeduction = null, clearDeduction = false } = opts;
        let sql =
          "UPDATE leave_request SET employeeNumber = ?, leave_code = ?, leave_date = ?, status = ?";
        const params = [
          employeeNumber,
          leave_code,
          leave_date,
          newStatus,
        ];
        if (setDeduction) {
          sql +=
            ", deduction_applied_hours = ?, hr_approval_rate = ?";
          params.push(setDeduction.hours, setDeduction.rate);
        } else if (clearDeduction) {
          sql += ", deduction_applied_hours = NULL, hr_approval_rate = NULL";
        }
        sql += " WHERE id = ?";
        params.push(id);
        db.query(sql, params, async (updateErr) => {
          if (updateErr) {
            logAudit(
              { employeeNumber: actorEmployeeNumber },
              "Update Leave Request Failed",
              "leave_request",
              id,
              employeeNumber,
            );
            return res.status(500).json({ error: "Failed to update status" });
          }
          db.query(
            "SELECT leave_description FROM leave_table WHERE leave_code = ?",
            [leave_code],
            async (err2, leaveRows) => {
              if (err2) {
                console.error(
                  "[Update Status] Error fetching leave description:",
                  err2,
                );
                return res
                  .status(500)
                  .json({ error: "Failed to fetch leave description" });
              }

              const leave_description =
                leaveRows[0]?.leave_description || "Unknown Leave Type";
              const action = statusToLeaveAction(newStatus);
              if (action) {
                const actorFullName = await getEmployeeFullName(
                  actorEmployeeNumber,
                );
                const requesterFullName = await getEmployeeFullName(
                  employeeNumber,
                );
                const actorDisplayName = formatUserDisplayName(
                  actorEmployeeNumber,
                  actorFullName,
                );
                const requesterDisplayName = formatUserDisplayName(
                  employeeNumber,
                  requesterFullName,
                );
                const message = buildLeaveTransactionMessage({
                  action,
                  actorDisplayName,
                  requesterDisplayName,
                  leaveDesc: leave_description,
                  leaveDates: leave_date,
                });
                await insertTransactionLog(
                  String(employeeNumber),
                  message,
                  actorEmployeeNumber,
                );
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
                `${auditActionStr} - ${leave_description}`,
                "leave_request",
                id,
                employeeNumber,
              );

              emitLeaveChange("leaveRequestChanged");
              res.json({
                id,
                employeeNumber,
                leave_code,
                leave_date,
                status: newStatus,
                message: "Status updated successfully",
              });
            },
          );
        });
      };

      // DEDUCT: status → 2 (HR Approved) — hours from HR modal (deduction_hours and/or rate_decimal)
      if (newStatus === 2 && oldStatus !== 2) {
        (async () => {
          try {
            const availableBefore = await getTotalRemainingHours(
              employeeNumber,
              leave_code,
            );
            const meta = await fetchLeaveDeductionMeta(
              request.employeeNumber,
              request.leave_code,
            );
            const { hoursPerDay } = resolveHoursPerDayFromMeta(meta);
            const dh = parseFloat(deduction_hours);
            const rr = parseFloat(rate_decimal);
            let delta;
            let storedRate;
            if (Number.isFinite(dh) && dh > 0) {
              delta = dh;
              storedRate =
                Number.isFinite(rr) && rr > 0
                  ? Number(rr.toFixed(3))
                  : Number((delta / hoursPerDay).toFixed(3));
            } else if (Number.isFinite(rr) && rr > 0) {
              delta = rr * hoursPerDay;
              storedRate = Number(rr.toFixed(3));
            } else {
              return res.status(400).json({
                error:
                  "HR approval requires a positive deduction_hours and/or rate_decimal in the request body.",
              });
            }

            await applyHoursDeltaAcrossAssignments({
              req,
              actorEmployeeNumber,
              employeeNumber,
              leave_code,
              deltaHours: delta,
              requestId: id,
              reason: `HR Approved — deducted ${delta} hours from leave balance`,
            });

            try {
              await syncApprovedLeaveToAttendanceRecord(
                employeeNumber,
                leave_date,
              );
            } catch (syncErr) {
              console.error(
                "[leave] attendance sync (HR approve):",
                syncErr.message,
              );
            }

            const availableAfter = await getTotalRemainingHours(
              employeeNumber,
              leave_code,
            );
            const fallbackSuggestion = await buildDeductionSuggestion({
              employeeNumber,
              leave_code,
              leave_date,
              has_leave_form: true,
              is_half_day_absence: false,
              requested_rate_decimal: storedRate,
            });
            const systemRecommendation =
              decision_context?.system_recommendation || fallbackSuggestion;
            const overrideReason =
              (decision_context?.override_reason || "").trim() || null;
            const decision =
              overrideReason ||
              !nearlyEqual(systemRecommendation?.recommended_hours, delta) ||
              !nearlyEqual(
                systemRecommendation?.recommended_rate_decimal,
                storedRate,
              )
                ? "overridden"
                : "accepted";
            await insertDeductionDecisionLog({
              leaveRequestId: id,
              employeeNumber,
              leave_code,
              leave_date,
              decision,
              decisionSource: "hr_single_approval",
              actorEmployeeNumber,
              systemRecommendation,
              finalApplied: {
                applied_rate_decimal: storedRate,
                applied_hours: delta,
                available_hours_before: availableBefore,
                available_hours_after: availableAfter,
              },
              overrideReason,
            });

            try {
              const [empName, actorName] = await Promise.all([
                getEmployeeFullName(String(employeeNumber)),
                getEmployeeFullName(actorEmployeeNumber),
              ]);
              const leaveDesc = await new Promise((resolve) =>
                db.query(
                  "SELECT leave_description FROM leave_table WHERE TRIM(leave_code) = TRIM(?) LIMIT 1",
                  [leave_code],
                  (e, r) =>
                    resolve(
                      (r && r[0] && r[0].leave_description) || leave_code,
                    ),
                ),
              );
              const actorDisplay = formatUserDisplayName(
                actorEmployeeNumber,
                actorName,
              );
              const empDisplay = formatUserDisplayName(
                String(employeeNumber),
                empName,
              );
              await insertTransactionLog(
                String(employeeNumber),
                `${actorDisplay} deducted ${delta} hrs from ${leaveDesc} balance for ${empDisplay} (HR approval).`,
                actorEmployeeNumber,
              );
            } catch (e) {
              console.error(
                "[leave] Failed to insert deduction transaction log:",
                e.message,
              );
            }

            emitLeaveChange("leaveAssignmentChanged");
            updateStatus({
              setDeduction: { hours: delta, rate: storedRate },
            });
          } catch (e) {
            console.error("[Deduct] Error:", e.message);
            return res.status(500).json({ error: e.message || "Deduction failed" });
          }
        })();
        return;
      }
      // RESTORE: was HR Approved (2), now denied/cancelled
      if (oldStatus === 2 && (newStatus === 3 || newStatus === 4)) {
        (async () => {
          try {
            const applied = parseFloat(request.deduction_applied_hours);
            const restoreAmt =
              Number.isFinite(applied) && applied > 0 ? applied : 8;
            await applyHoursDeltaAcrossAssignments({
              req,
              actorEmployeeNumber,
              employeeNumber,
              leave_code,
              deltaHours: -restoreAmt,
              requestId: id,
              reason: `HR approval reversed (${newStatus === 3 ? "denied" : "cancelled"}) — restored ${restoreAmt} hours`,
            });

            try {
              const [empName, actorName] = await Promise.all([
                getEmployeeFullName(String(employeeNumber)),
                getEmployeeFullName(actorEmployeeNumber),
              ]);
              const leaveDesc = await new Promise((resolve) =>
                db.query(
                  "SELECT leave_description FROM leave_table WHERE TRIM(leave_code) = TRIM(?) LIMIT 1",
                  [leave_code],
                  (e, r) =>
                    resolve(
                      (r && r[0] && r[0].leave_description) || leave_code,
                    ),
                ),
              );
              const actorDisplay = formatUserDisplayName(
                actorEmployeeNumber,
                actorName,
              );
              const empDisplay = formatUserDisplayName(
                String(employeeNumber),
                empName,
              );
              await insertTransactionLog(
                String(employeeNumber),
                `${actorDisplay} restored ${restoreAmt} hrs to ${leaveDesc} balance for ${empDisplay} (reversal).`,
                actorEmployeeNumber,
              );
            } catch (e) {
              console.error(
                "[leave] Failed to insert restoration transaction log:",
                e.message,
              );
            }

            emitLeaveChange("leaveAssignmentChanged");
            updateStatus({ clearDeduction: true });
          } catch (e) {
            console.error("[Restore] Error:", e.message);
            return res
              .status(500)
              .json({ error: e.message || "Restore balance failed" });
          }
        })();
        return;
      }
      updateStatus();
    },
  );
});

// DELETE leave request
router.delete("/leave_request/:id", (req, res) => {
  const actorEmpNum = getActorEmployeeNumber(req);
  // Fetch first so we have employee info for logging
  db.query(
    "SELECT lr.employeeNumber, lr.leave_code, lt.leave_description FROM leave_request lr LEFT JOIN leave_table lt ON lr.leave_code = lt.leave_code WHERE lr.id = ?",
    [req.params.id],
    (fetchErr, rows) => {
      const targetRecord = (!fetchErr && rows && rows[0]) ? rows[0] : null;
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
