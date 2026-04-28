const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const { logAudit } = require("../middleware/auth");

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
// Deducts / restores ONLY from the ALLOCATED row
// (carried_forward_hours = 0 or NULL). Never touches carry rows.
// ============================================================
router.put("/leave_request/bulk-update", (req, res) => {
  const { ids, status } = req.body;
  const actorEmployeeNumber = getActorEmployeeNumber(req);
  if (!Array.isArray(ids) || !ids.length)
    return res.status(400).json({ error: "ids must be a non-empty array" });
  const newStatus = Number(status);
  if (![0, 1, 2, 3, 4].includes(newStatus))
    return res.status(400).json({ error: "Invalid status value" });

  const placeholders = ids.map(() => "?").join(",");
  db.query(
    `SELECT lr.id, lr.employeeNumber, lr.leave_code, lr.leave_date, lr.status, lt.leave_description FROM leave_request lr LEFT JOIN leave_table lt ON lr.leave_code = lt.leave_code WHERE lr.id IN (${placeholders})`,
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

          const operations = requests
            .map((request) => {
              const { employeeNumber, leave_code, status: oldStatus } = request;
              const oldStatusNum = Number(oldStatus);
              let deltaHours = null;
              if (newStatus === 2 && oldStatusNum !== 2) deltaHours = 8;
              else if (
                oldStatusNum === 2 &&
                (newStatus === 3 || newStatus === 4)
              )
                deltaHours = -8;
              return { employeeNumber, leave_code, deltaHours };
            })
            .filter((op) => op.deltaHours !== null);

          // Query for ALLOCATED row only (carried_forward_hours = 0 or NULL)
          const getAllocatedQuery = `
        SELECT * FROM leave_assignment
        WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
          AND (carried_forward_hours IS NULL OR carried_forward_hours = 0)
        ORDER BY period_year DESC,
          CASE WHEN period_semester IN ('2nd','2nd semester') THEN 2
               WHEN period_semester IN ('1st','1st semester') THEN 1 ELSE 0 END DESC
        LIMIT 1
      `;
          const fallbackQuery = `
        SELECT * FROM leave_assignment
        WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
        ORDER BY period_year DESC,
          CASE WHEN period_semester IN ('2nd','2nd semester') THEN 2
               WHEN period_semester IN ('1st','1st semester') THEN 1 ELSE 0 END DESC
        LIMIT 1
      `;

          const processNext = (index) => {
            if (index >= operations.length) {
              const action = statusToLeaveAction(newStatus);
              const transactionInsertsPromise = (async () => {
                if (!action) return [];

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

                return Promise.all(
                  requests.map(async (request) => {
                    const requesterDisplayName = await getRequesterDisplayName(
                      request.employeeNumber,
                    );
                    const message = buildLeaveTransactionMessage({
                      action,
                      actorDisplayName,
                      requesterDisplayName,
                      leaveDesc: request.leave_description,
                    });
                    return insertTransactionLog(String(request.employeeNumber), message, actorEmployeeNumber);
                  }),
                );
              })();

              return transactionInsertsPromise.finally(() => {
                emitLeaveChange("leaveRequestChanged");
                return res.json({
                  message: "Bulk update successful",
                  updated: requests.length,
                  newStatus,
                });
              });
            }
            const { employeeNumber, leave_code, deltaHours } =
              operations[index];

            const applyDelta = (row) => {
                const currentRem = parseDbHours(row.remaining_hours);
                const currentUsed = parseDbHours(row.used_hours);
                const newRemaining = Math.max(0, currentRem - deltaHours);
                const newUsed = Math.max(0, currentUsed + deltaHours);
              db.query(
                "UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?",
                [newRemaining, newUsed, row.id],
                (err) => {
                  if (err) console.error("[Bulk Credit] Update error:", err);
                  else {
                    auditLeaveBalanceAdjustment({
                      req,
                      actorEmployeeNumber,
                      employeeNumber,
                      leave_code,
                      requestId: null,
                      reason:
                        newStatus === 2
                          ? "HR Approved (bulk) — deducted 8 hours"
                          : "HR approval reversed (bulk) — restored 8 hours",
                      oldRemaining: currentRem,
                      newRemaining,
                      oldUsed: currentUsed,
                      newUsed,
                      deltaHours: -deltaHours, // remaining decreases when deltaHours is +8
                      assignmentRowId: row.id,
                    });
                  }
                  processNext(index + 1);
                },
              );
            };

            db.query(
              getAllocatedQuery,
              [employeeNumber, leave_code],
              (err, rows) => {
                if (err || !rows.length) {
                  return db.query(
                    fallbackQuery,
                    [employeeNumber, leave_code],
                    (err2, rows2) => {
                      if (err2 || !rows2.length) {
                        console.warn(
                          `[Bulk] No assignment for ${employeeNumber}/${leave_code}`,
                        );
                        return processNext(index + 1);
                      }
                      applyDelta(rows2[0]);
                    },
                  );
                }
                applyDelta(rows[0]);
              },
            );
          };

          if (!operations.length) {
            const action = statusToLeaveAction(newStatus);
            const transactionInsertsPromise = (async () => {
              if (!action) return [];

              const actorFullName = await getEmployeeFullName(actorEmployeeNumber);
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

              return Promise.all(
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
                  return insertTransactionLog(String(request.employeeNumber), message, actorEmployeeNumber);
                }),
              );
            })();

            return transactionInsertsPromise.finally(() => {
              emitLeaveChange("leaveRequestChanged");
              return res.json({
                message: "Bulk update successful",
                updated: requests.length,
                newStatus,
              });
            });
          }
          processNext(0);
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
  const { employeeNumber, leave_code, leave_date, status } = req.body;
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

      const updateStatus = () => {
        db.query(
          "UPDATE leave_request SET employeeNumber = ?, leave_code = ?, leave_date = ?, status = ? WHERE id = ?",
          [employeeNumber, leave_code, leave_date, newStatus, id],
          async (updateErr) => {
            if (updateErr) {
              logAudit({ employeeNumber: actorEmployeeNumber }, 'Update Leave Request Failed', 'leave_request', id, employeeNumber);
              return res.status(500).json({ error: "Failed to update status" });
            }
            db.query(
              "SELECT leave_description FROM leave_table WHERE leave_code = ?",
              [leave_code], async (err, leaveRows) => {
                if (err) {
                  console.error("[Update Status] Error fetching leave description:", err);
                  return res.status(500).json({ error: "Failed to fetch leave description" });
                }

                const leave_description = leaveRows[0]?.leave_description || "Unknown Leave Type";
                const action = statusToLeaveAction(newStatus);
                if (action) {
                  const actorFullName = await getEmployeeFullName(actorEmployeeNumber);
                  const requesterFullName = await getEmployeeFullName(employeeNumber);
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
                await insertTransactionLog(String(employeeNumber), message, actorEmployeeNumber);
            }

            const auditActionStr = {
              immediateSupervisor_approved: 'Supervisor Approved Leave',
              hr_approved: 'HR Approved Leave',
              denied: 'Leave Request Denied',
              cancelled: 'Cancel Leave Request',
            }[statusToLeaveAction(newStatus)] || 'Update Leave Request';
            logAudit({ employeeNumber: actorEmployeeNumber }, `${auditActionStr} - ${leave_description}`, 'leave_request', id, employeeNumber);

            emitLeaveChange("leaveRequestChanged");
            res.json({
              id,
              employeeNumber,
              leave_code,
              leave_date,
              status: newStatus,
              message: "Status updated successfully",
            });
          })}
          ,
        );
      };

      // ALLOCATED row only
      const getAllocatedQuery = `
      SELECT * FROM leave_assignment
      WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
        AND (carried_forward_hours IS NULL OR carried_forward_hours = 0)
      ORDER BY period_year DESC,
        CASE WHEN period_semester IN ('2nd','2nd semester') THEN 2
             WHEN period_semester IN ('1st','1st semester') THEN 1 ELSE 0 END DESC
      LIMIT 1
    `;
      const fallbackQuery = `
      SELECT * FROM leave_assignment
      WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
      ORDER BY period_year DESC,
        CASE WHEN period_semester IN ('2nd','2nd semester') THEN 2
             WHEN period_semester IN ('1st','1st semester') THEN 1 ELSE 0 END DESC
      LIMIT 1
    `;

      // DEDUCT: status → 2 (HR Approved)
      if (newStatus === 2 && oldStatus !== 2) {
        (async () => {
          await applyHoursDeltaAcrossAssignments({
            req,
            actorEmployeeNumber,
            employeeNumber,
            leave_code,
            deltaHours: 8,
            requestId: id,
            reason: "HR Approved — deducted 8 hours from leave balance",
          });

          // Transaction log entry for the auto-deduction (so it appears in Transaction Logs too)
          try {
            const [empName, actorName] = await Promise.all([
              getEmployeeFullName(String(employeeNumber)),
              getEmployeeFullName(actorEmployeeNumber),
            ]);
            const leaveDesc = await new Promise((resolve) =>
              db.query(
                "SELECT leave_description FROM leave_table WHERE TRIM(leave_code) = TRIM(?) LIMIT 1",
                [leave_code],
                (e, r) => resolve((r && r[0] && r[0].leave_description) || leave_code),
              ),
            );
            const actorDisplay = formatUserDisplayName(actorEmployeeNumber, actorName);
            const empDisplay = formatUserDisplayName(String(employeeNumber), empName);
            await insertTransactionLog(
              String(employeeNumber),
              `${actorDisplay} deducted 8 hrs from ${leaveDesc} balance for ${empDisplay} (system auto-deduction after HR approval).`,
              actorEmployeeNumber,
            );
          } catch (e) {
            console.error("[leave] Failed to insert deduction transaction log:", e.message);
          }

          emitLeaveChange("leaveAssignmentChanged");
          updateStatus();
        })().catch((e) => {
          console.error("[Deduct] Error:", e.message);
          updateStatus();
        });
      }
      // RESTORE: was HR Approved (2), now denied/cancelled
      else if (oldStatus === 2 && (newStatus === 3 || newStatus === 4)) {
        (async () => {
          await applyHoursDeltaAcrossAssignments({
            req,
            actorEmployeeNumber,
            employeeNumber,
            leave_code,
            deltaHours: -8,
            requestId: id,
            reason: `HR approval reversed (${newStatus === 3 ? "denied" : "cancelled"}) — restored 8 hours`,
          });

          // Transaction log entry for the auto-restoration
          try {
            const [empName, actorName] = await Promise.all([
              getEmployeeFullName(String(employeeNumber)),
              getEmployeeFullName(actorEmployeeNumber),
            ]);
            const leaveDesc = await new Promise((resolve) =>
              db.query(
                "SELECT leave_description FROM leave_table WHERE TRIM(leave_code) = TRIM(?) LIMIT 1",
                [leave_code],
                (e, r) => resolve((r && r[0] && r[0].leave_description) || leave_code),
              ),
            );
            const actorDisplay = formatUserDisplayName(actorEmployeeNumber, actorName);
            const empDisplay = formatUserDisplayName(String(employeeNumber), empName);
            await insertTransactionLog(
              String(employeeNumber),
              `${actorDisplay} restored 8 hrs to ${leaveDesc} balance for ${empDisplay} (system auto-restoration after reversal).`,
              actorEmployeeNumber,
            );
          } catch (e) {
            console.error("[leave] Failed to insert restoration transaction log:", e.message);
          }

          emitLeaveChange("leaveAssignmentChanged");
          updateStatus();
        })().catch((e) => {
          console.error("[Restore] Error:", e.message);
          updateStatus();
        });
      } else {
        updateStatus();
      }
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
