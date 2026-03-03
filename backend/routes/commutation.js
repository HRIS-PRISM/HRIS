const express = require("express");
const router = express.Router();
const db = require("../db");

let io;
router.setSocketIO = (socketIO) => {
  io = socketIO;
};

const emitChange = (eventName) => {
  if (io) {
    io.emit(eventName);
    console.log(`[Socket.IO] Emitted ${eventName}`);
  }
};

// ─── helpers ────────────────────────────────────────────────
const parseDbHours = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const s = String(val).trim();
  if (!s) return 0;
  if (s.includes(":")) {
    const [hh, mm, ss] = s.split(":");
    return (Number(hh) || 0) + (Number(mm) || 0) / 60 + (Number(ss) || 0) / 3600;
  }
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// Status labels
const STATUS = { 0: "Pending", 1: "Approved", 2: "Released", 3: "Cancelled" };

// ============================================================
// GET /leave_commutation
// All commutation records (with employee & leave info)
// ============================================================
router.get("/leave_commutation", (req, res) => {
  const query = `
    SELECT
      lc.*,
      lt.leave_description,
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) AS fullName,
      p.firstName, p.lastName,
      DATE_FORMAT(lc.commuted_at, '%Y-%m-%d %H:%i:%s') AS commuted_at_fmt,
      DATE_FORMAT(lc.approved_at, '%Y-%m-%d %H:%i:%s') AS approved_at_fmt
    FROM leave_commutation lc
    LEFT JOIN leave_table      lt ON lc.leave_code     = lt.leave_code
    LEFT JOIN person_table     p  ON lc.employeeNumber = p.agencyEmployeeNum
    ORDER BY lc.commuted_at DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("[GET /leave_commutation]", err.message);
      return res.status(500).json({ error: "Failed to fetch commutation records: " + err.message });
    }
    res.json(results);
  });
});

// ============================================================
// GET /leave_commutation/employee/:employeeNumber
// Commutation records for a specific employee
// ============================================================
router.get("/leave_commutation/employee/:employeeNumber", (req, res) => {
  const query = `
    SELECT
      lc.*,
      lt.leave_description,
      DATE_FORMAT(lc.commuted_at, '%Y-%m-%d %H:%i:%s') AS commuted_at_fmt,
      DATE_FORMAT(lc.approved_at, '%Y-%m-%d %H:%i:%s') AS approved_at_fmt
    FROM leave_commutation lc
    LEFT JOIN leave_table lt ON lc.leave_code = lt.leave_code
    WHERE lc.employeeNumber = ?
    ORDER BY lc.commuted_at DESC
  `;
  db.query(query, [req.params.employeeNumber], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch records" });
    res.json(results);
  });
});

// ============================================================
// GET /leave_commutation/carried-forward/:employeeNumber/:leave_code
// Returns total commuted_hours not yet "carried" to a new period
// so LeaveAssignment can auto-fill Carried Balance.
// ============================================================
router.get("/leave_commutation/carried-forward/:employeeNumber/:leave_code", (req, res) => {
  const { employeeNumber, leave_code } = req.params;

  // Sum approved/pending commuted hours that haven't been assigned yet
  const query = `
    SELECT COALESCE(SUM(commuted_hours), 0) AS total_commuted_hours,
           COALESCE(SUM(commuted_days),  0) AS total_commuted_days
    FROM leave_commutation
    WHERE employeeNumber = ?
      AND TRIM(leave_code) = TRIM(?)
      AND status IN (0, 1)
  `;
  db.query(query, [employeeNumber, leave_code], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to compute carry-forward" });
    res.json({
      commuted_hours: parseDbHours(rows[0]?.total_commuted_hours),
      commuted_days:  parseDbHours(rows[0]?.total_commuted_days),
    });
  });
});

// ============================================================
// POST /leave_commutation/commute/:assignmentId
// Main action: commute remaining hours from a leave assignment.
//
//  1. Fetch the leave_assignment row.
//  2. Validate remaining_hours > 0.
//  3. INSERT into leave_commutation.
//  4. Zero out remaining_hours & set used_hours = total_hours in leave_assignment.
//  5. Emit socket events.
// ============================================================
router.post("/leave_commutation/commute/:assignmentId", (req, res) => {
  const { assignmentId } = req.params;
  const { commuted_by, remarks } = req.body || {};

  db.query(
    "SELECT * FROM leave_assignment WHERE id = ?",
    [assignmentId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB error: " + err.message });
      if (!rows.length) return res.status(404).json({ error: "Leave assignment not found" });

      const asgn = rows[0];
      const remainingHours = parseDbHours(asgn.remaining_hours);

      if (remainingHours <= 0) {
        return res.status(400).json({
          error: "No remaining hours to commute",
          detail: "This assignment already has zero remaining hours.",
        });
      }

      const commutedDays = remainingHours / 8;

      // INSERT commutation record
      const insertQuery = `
        INSERT INTO leave_commutation
          (leave_assignment_id, employeeNumber, leave_code, period_year, period_semester,
           commuted_hours, commuted_days, status, commuted_by, commuted_at, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), ?)
      `;
      db.query(
        insertQuery,
        [
          asgn.id,
          asgn.employeeNumber,
          asgn.leave_code,
          asgn.period_year,
          asgn.period_semester || null,
          remainingHours,
          commutedDays,
          commuted_by || null,
          remarks || null,
        ],
        (insertErr, insertResult) => {
          if (insertErr) {
            console.error("[POST /commute] Insert error:", insertErr.message);
            return res.status(500).json({ error: "Failed to create commutation record: " + insertErr.message });
          }

          // Zero out remaining_hours; used_hours = total_hours
          const totalHours = parseDbHours(asgn.total_hours);
          db.query(
            "UPDATE leave_assignment SET remaining_hours = 0, used_hours = ? WHERE id = ?",
            [totalHours, asgn.id],
            (updateErr) => {
              if (updateErr) {
                console.error("[POST /commute] Zero-out error:", updateErr.message);
                return res.status(500).json({ error: "Commutation recorded but failed to zero out assignment: " + updateErr.message });
              }

              emitChange("leaveCommutationChanged");
              emitChange("leaveAssignmentChanged");

              res.json({
                message: "Leave commuted successfully",
                commutation_id: insertResult.insertId,
                leave_assignment_id: asgn.id,
                employeeNumber: asgn.employeeNumber,
                leave_code: asgn.leave_code,
                period_year: asgn.period_year,
                period_semester: asgn.period_semester,
                commuted_hours: remainingHours,
                commuted_days: commutedDays,
                status: 0,
              });
            }
          );
        }
      );
    }
  );
});

// ============================================================
// PUT /leave_commutation/:id
// Update status, approver, or remarks
// ============================================================
router.put("/leave_commutation/:id", (req, res) => {
  const { id } = req.params;
  const { status, approved_by, remarks } = req.body;

  db.query("SELECT * FROM leave_commutation WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: "Record not found" });

    const current = rows[0];
    const newStatus = status !== undefined ? Number(status) : current.status;
    const approvedAt =
      newStatus === 1 && current.status !== 1 ? new Date() : current.approved_at;

    db.query(
      `UPDATE leave_commutation
          SET status = ?, approved_by = ?, approved_at = ?, remarks = ?
        WHERE id = ?`,
      [
        newStatus,
        approved_by !== undefined ? approved_by : current.approved_by,
        approvedAt,
        remarks !== undefined ? remarks : current.remarks,
        id,
      ],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        emitChange("leaveCommutationChanged");
        res.json({ id, status: newStatus, approved_by, approved_at: approvedAt, remarks });
      }
    );
  });
});

// ============================================================
// DELETE /leave_commutation/:id
// Remove a commutation record (admin only; does NOT restore hours)
// ============================================================
router.delete("/leave_commutation/:id", (req, res) => {
  db.query("DELETE FROM leave_commutation WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "Failed to delete record" });
    emitChange("leaveCommutationChanged");
    res.json({ message: "Commutation record deleted" });
  });
});

module.exports = router;