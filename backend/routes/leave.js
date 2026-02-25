const express = require("express");
const router = express.Router();
const db = require("../db");

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
  const { leave_code, leave_description, leave_hours } = req.body;
  db.query(
    "INSERT INTO leave_table (leave_code, leave_description, leave_hours) VALUES (?, ?, ?)",
    [leave_code, leave_description, leave_hours || 0],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to create leave type" });
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
  const { leave_code, leave_description, leave_hours } = req.body;
  db.query(
    "UPDATE leave_table SET leave_code = ?, leave_description = ?, leave_hours = ? WHERE id = ?",
    [leave_code, leave_description, leave_hours, id],
    (err) => {
      if (err)
        return res.status(500).json({ error: "Failed to update leave type" });
      res.json({ id, leave_code, leave_description, leave_hours });
    },
  );
});

router.delete("/leave_table/:id", (req, res) => {
  db.query("DELETE FROM leave_table WHERE id = ?", [req.params.id], (err) => {
    if (err)
      return res.status(500).json({ error: "Failed to delete leave type" });
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
        const customHours = Number(total_hours);
        const carriedForward = Number(carried_forward_hours) || 0;
        const allocated = Number(allocated_hours) || customHours;
        const currentYear = period_year || new Date().getFullYear();
        const semester = period_semester || null;

        const insertQuery = `INSERT INTO leave_assignment (leave_code, employeeNumber, total_hours, remaining_hours, used_hours, approve_date, carried_forward_hours, allocated_hours, period_year, period_semester) VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)`;
        db.query(
          insertQuery,
          [
            leave_code,
            employeeNumber,
            customHours,
            customHours,
            carriedForward,
            allocated,
            currentYear,
            semester,
          ],
          (insertErr, result) => {
            if (insertErr)
              return res
                .status(500)
                .json({
                  error:
                    "Failed to create leave assignment: " + insertErr.message,
                });
            emitLeaveChange("leaveAssignmentChanged");
            res.json({
              id: result.insertId,
              leave_code,
              employeeNumber,
              total_hours: customHours,
              remaining_hours: customHours,
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
            const carriedForward = Number(carried_forward_hours) || 0;
            const allocated = Number(allocated_hours) || defaultHours;
            const currentYear = period_year || new Date().getFullYear();
            const semester = period_semester || null;

            const insertQuery = `INSERT INTO leave_assignment (leave_code, employeeNumber, total_hours, remaining_hours, used_hours, approve_date, carried_forward_hours, allocated_hours, period_year, period_semester) VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)`;
            db.query(
              insertQuery,
              [
                leave_code,
                employeeNumber,
                defaultHours,
                defaultHours,
                carriedForward,
                allocated,
                currentYear,
                semester,
              ],
              (insertErr, result) => {
                if (insertErr)
                  return res
                    .status(500)
                    .json({ error: "Failed to create leave assignment" });
                emitLeaveChange("leaveAssignmentChanged");
                res.json({
                  id: result.insertId,
                  leave_code,
                  employeeNumber,
                  total_hours: defaultHours,
                  remaining_hours: defaultHours,
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

      const newTotal =
        total_hours !== undefined && total_hours !== ''
          ? parseDbHours(total_hours)
          : currentTotal;

      const newRemaining =
        remaining_hours !== undefined && remaining_hours !== ''
          ? parseDbHours(remaining_hours)
          : (parseDbHours(current[0].remaining_hours) || 0);

      const newUsed = Math.max(0, newTotal - newRemaining);

      const newCarriedForward =
        carried_forward_hours !== undefined && carried_forward_hours !== ''
          ? parseDbHours(carried_forward_hours)
          : currentCarried;

      const newAllocated =
        allocated_hours !== undefined && allocated_hours !== ''
          ? parseDbHours(allocated_hours)
          : currentAllocated;
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
          if (updateErr)
            return res
              .status(500)
              .json({ error: "Failed to update leave assignment" });
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
  db.query(
    "DELETE FROM leave_assignment WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Failed to delete leave assignment" });
      emitLeaveChange("leaveAssignmentChanged");
      res.json({ message: "Leave assignment deleted successfully" });
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
  const dates = Array.isArray(leave_dates) ? leave_dates : [leave_dates];

  if (!dates.length)
    return res
      .status(400)
      .json({ error: "At least one leave date is required" });

  const hoursNeeded = dates.length * 8;

  // Find the ALLOCATED assignment row only (carried_forward_hours = 0 or NULL)
  // Falls back to latest row if none found.
  const allocatedQuery = `
    SELECT *
    FROM leave_assignment
    WHERE employeeNumber = ?
      AND TRIM(leave_code) = TRIM(?)
      AND (carried_forward_hours IS NULL OR carried_forward_hours = 0)
    ORDER BY period_year DESC,
      CASE WHEN period_semester IN ('2nd','2nd semester') THEN 2
           WHEN period_semester IN ('1st','1st semester') THEN 1 ELSE 0 END DESC
    LIMIT 1
  `;
  const fallbackQuery = `
    SELECT *
    FROM leave_assignment
    WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
    ORDER BY period_year DESC,
      CASE WHEN period_semester IN ('2nd','2nd semester') THEN 2
           WHEN period_semester IN ('1st','1st semester') THEN 1 ELSE 0 END DESC
    LIMIT 1
  `;

  const proceed = (assignmentRow) => {
    const currentRemaining = assignmentRow ? parseDbHours(assignmentRow.remaining_hours) : 0;

    // ── BALANCE CHECK ──────────────────────────────────────────
    if (!assignmentRow || currentRemaining < hoursNeeded) {
      const remainingDays = (currentRemaining / 8).toFixed(1);
      const neededDays = dates.length;
      return res.status(400).json({
        error: "Insufficient Leave Balance",
        detail: `You requested ${neededDays} day(s) but only have ${remainingDays} allocated day(s) remaining.`,
        remaining_hours: currentRemaining,
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
        emitLeaveChange("leaveRequestChanged");
        res.json({
          message: "Leave requests created successfully",
          count: dates.length,
        });
      })
      .catch((err) => {
        console.error("Error creating leave requests:", err);
        res.status(500).json({ error: "Failed to create leave requests" });
      });
  };

  db.query(allocatedQuery, [employeeNumber, leave_code], (err, rows) => {
    if (err || !rows.length) {
      return db.query(
        fallbackQuery,
        [employeeNumber, leave_code],
        (err2, rows2) => {
          proceed(rows2 && rows2.length ? rows2[0] : null);
        },
      );
    }
    proceed(rows[0]);
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
  if (!Array.isArray(ids) || !ids.length)
    return res.status(400).json({ error: "ids must be a non-empty array" });
  const newStatus = Number(status);
  if (![0, 1, 2, 3, 4].includes(newStatus))
    return res.status(400).json({ error: "Invalid status value" });

  const placeholders = ids.map(() => "?").join(",");
  db.query(
    `SELECT id, employeeNumber, leave_code, leave_date, status FROM leave_request WHERE id IN (${placeholders})`,
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
              emitLeaveChange("leaveRequestChanged");
              return res.json({
                message: "Bulk update successful",
                updated: requests.length,
                newStatus,
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
            emitLeaveChange("leaveRequestChanged");
            return res.json({
              message: "Bulk update successful",
              updated: requests.length,
              newStatus,
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
          (updateErr) => {
            if (updateErr)
              return res.status(500).json({ error: "Failed to update status" });
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
        const findAndDeduct = (row) => {
          if (!row) {
            console.warn(
              `[Deduct] No allocation row for ${employeeNumber}/${leave_code}`,
            );
            return updateStatus();
          }
            const currentRem = parseDbHours(row.remaining_hours);
            const currentUsed = parseDbHours(row.used_hours);
            const newRemaining = Math.max(0, currentRem - 8);
            const newUsed = currentUsed + 8;
          db.query(
            "UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?",
            [newRemaining, newUsed, row.id],
            (err) => {
              if (err) console.error("[Deduct] Error:", err);
              else emitLeaveChange("leaveAssignmentChanged");
              updateStatus();
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
                  findAndDeduct(rows2 && rows2.length ? rows2[0] : null);
                },
              );
            }
            findAndDeduct(rows[0]);
          },
        );
      }
      // RESTORE: was HR Approved (2), now denied/cancelled
      else if (oldStatus === 2 && (newStatus === 3 || newStatus === 4)) {
        const findAndRestore = (row) => {
          if (!row) {
            console.warn(
              `[Restore] No allocation row for ${employeeNumber}/${leave_code}`,
            );
            return updateStatus();
          }
          const currentRem = parseDbHours(row.remaining_hours);
          const currentUsed = parseDbHours(row.used_hours);
          const newRemaining = currentRem + 8;
          const newUsed = Math.max(0, currentUsed - 8);
          db.query(
            "UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?",
            [newRemaining, newUsed, row.id],
            (err) => {
              if (err) console.error("[Restore] Error:", err);
              else emitLeaveChange("leaveAssignmentChanged");
              updateStatus();
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
                  findAndRestore(rows2 && rows2.length ? rows2[0] : null);
                },
              );
            }
            findAndRestore(rows[0]);
          },
        );
      } else {
        updateStatus();
      }
    },
  );
});

// DELETE leave request
router.delete("/leave_request/:id", (req, res) => {
  db.query("DELETE FROM leave_request WHERE id = ?", [req.params.id], (err) => {
    if (err)
      return res.status(500).json({ error: "Failed to delete leave request" });
    emitLeaveChange("leaveRequestChanged");
    res.json({ message: "Leave request deleted successfully" });
  });
});

module.exports = router;
