  const express = require("express");
  const router = express.Router();
  const db = require("../db");
  const { authenticateToken, requireAdmin, logAudit } = require("../middleware/auth");
  const jwt = require("jsonwebtoken");

  const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

  const getActorEmployeeNumber = (req, fallback = null) => {
    if (req.user?.employeeNumber) return String(req.user.employeeNumber);
    const authHeader = req.headers?.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded?.employeeNumber) return String(decoded.employeeNumber);
        if (decoded?.username) return String(decoded.username);
      } catch (err) {}
    }
    return fallback ? String(fallback) : "unknown";
  };

  // ─── AUDIT LOG ────────────────────────────────────────────────────────────────
  const auditEarning = (req, action, type, id, oldStatus, newStatus, payload) => {
    const actor = getActorEmployeeNumber(req);
    const details = JSON.stringify({ type, old_status: oldStatus, new_status: newStatus, payload });
    logAudit({ employeeNumber: actor }, action, `earnings_${type}`, id, null, details);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  //  ATTENDANCE CONTEXT — GET
  //  GET /api/earnings/attendance/:employeeNumber?year=2026&month=4
  //  Uses overlap logic so payroll periods don't need to align to calendar month
  // ══════════════════════════════════════════════════════════════════════════════
  router.get("/attendance/:employeeNumber", authenticateToken, (req, res) => {
    const { employeeNumber } = req.params;
    const now   = new Date();
    const year  = parseInt(req.query.year  || now.getFullYear(), 10);
    const month = parseInt(req.query.month || (now.getMonth() + 1), 10);

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Overlap query: find the payroll period whose window overlaps this calendar month
    const summaryQuery = `
      SELECT *
      FROM overall_attendance_record
      WHERE personID = ?
        AND startDate <= ?
        AND endDate   >= ?
      ORDER BY
        ABS(DATEDIFF(startDate, ?)) ASC,
        startDate DESC
      LIMIT 1
    `;

    db.query(summaryQuery, [employeeNumber, endDate, startDate, startDate], (err, summaryRows) => {
      const summary = (!err && summaryRows && summaryRows[0]) ? summaryRows[0] : null;

      const dailyQuery = `
        SELECT
          ar.date,
          ar.personID,
          ar.timeIN,
          ar.breaktimeIN,
          ar.breaktimeOUT,
          ar.timeOUT,
          ar.specialType,
          ar.specialTimeIN,
          ar.specialTimeOUT,
          ot.officialTimeIN,
          ot.officialTimeOUT,
          ot.officialOverTimeIN,
          ot.officialOverTimeOUT,
          CASE WHEN ar.timeIN IS NULL AND ar.timeOUT IS NULL THEN 1 ELSE 0 END AS is_absent,
          CASE
            WHEN ar.timeIN IS NOT NULL AND ot.officialTimeIN IS NOT NULL
              AND ar.timeIN > ot.officialTimeIN THEN 1
            ELSE 0
          END AS is_late,
          CASE
            WHEN ar.timeOUT IS NOT NULL AND ot.officialTimeOUT IS NOT NULL
              AND ar.timeOUT < ot.officialTimeOUT THEN 1
            ELSE 0
          END AS is_undertime,
          CASE WHEN ar.specialType IN ('OVERTIME','SERVICE') THEN 1 ELSE 0 END AS has_ot
        FROM attendancerecord ar
        LEFT JOIN officialtime ot
          ON ar.personID = ot.employeeID
          AND TRIM(DAYNAME(ar.date)) = TRIM(ot.day)
          AND ar.date BETWEEN ot.startDate AND ot.endDate
        WHERE ar.personID = ?
          AND ar.date >= ?
          AND ar.date <= ?
        ORDER BY ar.date ASC
      `;

      db.query(dailyQuery, [employeeNumber, startDate, endDate], (err2, dailyRows) => {
        const dailyRecords = (!err2 && dailyRows) ? dailyRows : [];

        const parseHHMM = (val) => {
          if (!val) return 0;
          const s = String(val).trim();
          if (s.includes(":")) {
            const parts = s.split(":");
            return Number(parts[0]) + Number(parts[1] || 0) / 60 + Number(parts[2] || 0) / 3600;
          }
          return parseFloat(s) || 0;
        };
const presentCount  = dailyRecords.filter(r => !r.is_absent).length;
const absentCount   = dailyRecords.filter(r => r.is_absent).length;

// Also count working days that have NO record at all (truly absent - not even a null row)
// We use the overall_attendance summary to derive this:
// absent_days = (calendar days in period - weekends) - present days
// But simpler: use calendarDays from the summary period if available
const summaryStartDate = summary?.startDate;
const summaryEndDate   = summary?.endDate;

let unrecordedAbsences = 0;
if (summaryStartDate && summaryEndDate) {
  const start = new Date(summaryStartDate);
  const end   = new Date(summaryEndDate);
  let workingDays = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) workingDays++; // exclude Sun=0, Sat=6
  }
  // Days with a record (present or absent row)
  const recordedDays = dailyRecords.length;
  unrecordedAbsences = Math.max(0, workingDays - recordedDays);
}

const stats = {
  total_days:     dailyRecords.length,
  present_days:   presentCount,
  absent_days:    absentCount + unrecordedAbsences,
  late_days:      dailyRecords.filter(r => r.is_late).length,
  undertime_days: dailyRecords.filter(r => r.is_undertime).length,
  ot_days:        dailyRecords.filter(r => r.has_ot).length,
};

        const summaryParsed = summary ? {
          ot_hours:          parseHHMM(summary.totalRenderedOvertime),
          sc_hours:          parseHHMM(summary.totalRenderedServiceCredit),
          morning_hours:     parseHHMM(summary.totalRenderedTimeMorning),
          afternoon_hours:   parseHHMM(summary.totalRenderedTimeAfternoon),
          overall_hours:     parseHHMM(summary.overallRenderedOfficialTime),
          overall_tardiness: parseHHMM(summary.overallRenderedOfficialTimeTardiness),
        } : null;

        const absentDates = dailyRecords
          .filter(r => r.is_absent)
          .map(r => ({ date: r.date }));

        const lateDates = dailyRecords
          .filter(r => r.is_late)
          .map(r => ({
            date: r.date,
            timeIn: r.timeIN,
            officialTimeIn: r.officialTimeIN
          }));

        const otEntries = dailyRecords
          .filter(r => r.has_ot)
          .map(r => ({
            date: r.date,
            specialType: r.specialType,
            specialTimeIn: r.specialTimeIN,
            specialTimeOut: r.specialTimeOUT
          }));

        res.json({
          employeeNumber,
          year,
          month,
          period: { start: startDate, end: endDate },
          summary,
          summaryParsed,
          dailyRecords,
          absentDates,
          lateDates,
          otEntries,
          stats,
          context: "read-only — attendance context for earnings validation.",
          _matched_period: summary ? { startDate: summary.startDate, endDate: summary.endDate } : null,
        });
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  ATTENDANCE CONTEXT — PUT (EDIT & SYNC)
  //  PUT /api/earnings/attendance/:employeeNumber
  //  Body: { year, month, fields: { totalRenderedTimeMorning, ... } }
  //
  //  Finds the overlapping overall_attendance_record row and updates it in place.
  //  Emits a socket event so the Attendance Summary module auto-refreshes.
  // ══════════════════════════════════════════════════════════════════════════════
  router.put("/attendance/:employeeNumber", authenticateToken, requireAdmin, (req, res) => {
    const { employeeNumber } = req.params;
    const { year, month, fields } = req.body;

    if (!year || !month) {
      return res.status(400).json({ error: "year and month are required" });
    }

    if (!fields || typeof fields !== "object") {
      return res.status(400).json({ error: "fields object is required" });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Use same overlap logic as the GET endpoint
    const findQuery = `
      SELECT id, personID, startDate, endDate
      FROM overall_attendance_record
      WHERE personID = ?
        AND startDate <= ?
        AND endDate   >= ?
      ORDER BY
        ABS(DATEDIFF(startDate, ?)) ASC,
        startDate DESC
      LIMIT 1
    `;

    db.query(findQuery, [employeeNumber, endDate, startDate, startDate], (findErr, findRows) => {
      if (findErr) {
        console.error("Attendance find error:", findErr);
        return res.status(500).json({ error: "Database error while finding attendance record" });
      }

      if (!findRows || findRows.length === 0) {
        return res.status(404).json({
          error: `No attendance record found for employee ${employeeNumber} in ${year}-${String(month).padStart(2, "0")}. ` +
                `Make sure the overall_attendance_record exists for this period first.`
        });
      }

      const record = findRows[0];
      const recordId = record.id;

      // Fetch current state for audit diff
      db.query("SELECT * FROM overall_attendance_record WHERE id = ?", [recordId], (fetchErr, fetchRows) => {
        const oldRecord = (!fetchErr && fetchRows && fetchRows[0]) ? fetchRows[0] : {};

        // Build the update — only update fields that were provided (non-empty string)
        // This preserves fields not included in the edit form (e.g. honorarium)
        const updateFields = {};

        const timeFields = [
          "totalRenderedTimeMorning",
          "totalRenderedTimeMorningTardiness",
          "totalRenderedTimeAfternoon",
          "totalRenderedTimeAfternoonTardiness",
          "totalRenderedHonorarium",
          "totalRenderedHonorariumTardiness",
          "totalRenderedServiceCredit",
          "totalRenderedServiceCreditTardiness",
          "totalRenderedOvertime",
          "totalRenderedOvertimeTardiness",
          "overallRenderedOfficialTime",
          "overallRenderedOfficialTimeTardiness",
          "overallTotalOfficialSchedule",
        ];

        timeFields.forEach(field => {
          if (fields[field] !== undefined && fields[field] !== null) {
            // Accept both empty string (to clear) and HH:MM:SS values
            updateFields[field] = fields[field] === "" ? null : fields[field];
          }
        });

        if (Object.keys(updateFields).length === 0) {
          return res.status(400).json({ error: "No valid fields provided for update" });
        }

        // Build dynamic SET clause
        const setClauses = Object.keys(updateFields).map(f => `${f} = ?`).join(", ");
        const setValues  = Object.values(updateFields);

        const updateQuery = `
          UPDATE overall_attendance_record
          SET ${setClauses}
          WHERE id = ?
        `;

        db.query(updateQuery, [...setValues, recordId], (updateErr, updateResult) => {
          if (updateErr) {
            console.error("Attendance update error:", updateErr);
            return res.status(500).json({ error: "Failed to update attendance record" });
          }

          if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: "Record not found or no changes made" });
          }

          // Log audit trail with old vs new values
          const actor = getActorEmployeeNumber(req);
          const auditPayload = {
            record_id:   recordId,
            employee:    employeeNumber,
            period:      `${year}-${String(month).padStart(2, "0")}`,
            matched_period: { startDate: record.startDate, endDate: record.endDate },
            changed_fields: Object.keys(updateFields).reduce((acc, key) => {
              acc[key] = { from: oldRecord[key] || null, to: updateFields[key] };
              return acc;
            }, {}),
            updated_by: actor,
          };
          logAudit(
            { employeeNumber: actor },
            "updated",
            "overall_attendance_record",
            recordId,
            employeeNumber,
            JSON.stringify(auditPayload)
          );

          // Emit socket event so Attendance Summary module auto-refreshes in real time
          // Works if your express app has io attached via app.set("io", io)
          try {
            const io = req.app.get("io");
            if (io) {
              io.emit("attendanceChanged", {
                scope:       "overall_attendance_record",
                action:      "updated",
                personID:    employeeNumber,
                recordId,
                startDate:   record.startDate,
                endDate:     record.endDate,
                updatedBy:   actor,
                year,
                month,
              });
            }
          } catch (socketErr) {
            console.warn("Socket emit failed (non-fatal):", socketErr.message);
          }

          // Return the updated record
          db.query(
            "SELECT * FROM overall_attendance_record WHERE id = ?",
            [recordId],
            (refetchErr, refetchRows) => {
              const updated = (!refetchErr && refetchRows && refetchRows[0]) ? refetchRows[0] : { id: recordId };
              res.json({
                updated: true,
                recordId,
                employeeNumber,
                year,
                month,
                matched_period: { startDate: record.startDate, endDate: record.endDate },
                record: updated,
              });
            }
          );

          const workingDaysQuery = `
  WITH RECURSIVE dates AS (
    SELECT ? AS d
    UNION ALL SELECT DATE_ADD(d, INTERVAL 1 DAY) FROM dates WHERE d < ?
  )
  SELECT COUNT(*) AS working_days
  FROM dates
  WHERE DAYOFWEEK(d) NOT IN (1, 7)
`;
        });
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  LEAVE EARNINGS
  // ══════════════════════════════════════════════════════════════════════════════

  router.get("/leave/:employeeNumber", authenticateToken, (req, res) => {
    const { employeeNumber } = req.params;
    const now = new Date();
    const year  = req.query.year  || now.getFullYear();
    const month = req.query.month || (now.getMonth() + 1);
    const { status, all } = req.query;

    let query = `
      SELECT le.*, lt.leave_description
      FROM leave_earnings le
      LEFT JOIN leave_table lt ON lt.leave_code = le.leave_code
      WHERE le.employee_number = ?
    `;
    const params = [employeeNumber];

    if (all !== "true") {
      params.push(year);  query += ` AND le.period_year = ?`;
      params.push(month); query += ` AND le.period_month = ?`;
    }
    if (status) { params.push(status); query += ` AND le.earn_status = ?`; }
    query += ` ORDER BY le.period_year DESC, le.period_month DESC, le.created_at DESC`;

    db.query(query, params, (err, earnings) => {
      if (err) return res.status(500).json({ error: "Failed to fetch leave earnings" });

      const balQuery = `
        SELECT * FROM leave_balance_summary
        WHERE employee_number = ?
          AND (? IS NULL OR period_year = ?)
          AND (? IS NULL OR period_month = ?)
      `;
      db.query(balQuery, [employeeNumber, year || null, year || null, month || null, month || null], (err2, balances) => {
        res.json({ earnings, balances: err2 ? [] : (balances || []), period: { year: parseInt(year), month: parseInt(month) } });
      });
    });
  });

router.post("/leave", authenticateToken, requireAdmin, (req, res) => {
  const {
    employeeNumber,
    leave_code,
    earned_hours,
    period_year,
    period_month,
    entry_type = "EARNED",
    remarks,
  } = req.body;

  if (!employeeNumber || !leave_code || !period_year || !period_month) {
    return res.status(400).json({
      error: "employeeNumber, leave_code, period_year, period_month are required",
    });
  }

  const hrs = toNum(earned_hours);

  const isDeduction =
    entry_type === "TARDINESS_DEDUCTION" ||
    entry_type === "DEDUCTION" ||
    entry_type === "USED";

  if (!isDeduction && hrs <= 0) {
    return res.status(400).json({ error: "earned_hours must be > 0" });
  }

  if (isDeduction && hrs >= 0) {
    return res.status(400).json({
      error: "Deduction earned_hours must be negative",
    });
  }

  const query = `
    INSERT INTO leave_earnings
      (employee_number, leave_code, earned_hours, period_year, period_month, entry_type, earn_status, remarks, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `;

  db.query(
    query,
    [
      employeeNumber,
      leave_code,
      hrs,
      period_year,
      parseInt(period_month),
      entry_type,
      remarks || null,
      req.user?.username || null,
    ],
    (err, result) => {
      if (err) {
        console.error("Leave earning insert error:", err);
        return res.status(500).json({ error: "Failed to create leave earning" });
      }

      auditEarning(req, "created", "leave", result.insertId, null, "pending", {
        employeeNumber,
        leave_code,
        earned_hours: hrs,
        entry_type,
      });

      res.status(201).json({
        id: result.insertId,
        employee_number: employeeNumber,
        leave_code,
        earned_hours: hrs,
        period_year,
        period_month: parseInt(period_month),
        entry_type,
        earn_status: "pending",
        remarks: remarks || null,
      });
    }
  );
});

  router.patch("/leave/:id/approve", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query("SELECT * FROM leave_earnings WHERE id = ?", [id], (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: "Record not found" });
      const rec = rows[0];
      if (rec.earn_status === "approved") return res.status(400).json({ error: "Already approved" });

      db.query(
        `UPDATE leave_earnings SET earn_status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?`,
        [req.user?.username || null, id],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Failed to approve" });

          const earnedHrs   = toNum(rec.earned_hours);
          const periodMonth = rec.period_month ? parseInt(rec.period_month) : null;

          const findQuery = periodMonth
            ? `SELECT * FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ? AND period_year = ? AND (period_semester = ? OR period_semester = ?) ORDER BY id DESC LIMIT 1`
            : `SELECT * FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ? AND period_year = ? ORDER BY id DESC LIMIT 1`;
          const findParams = periodMonth
            ? [rec.employee_number, rec.leave_code, rec.period_year, String(periodMonth), String(periodMonth).padStart(2, "0")]
            : [rec.employee_number, rec.leave_code, rec.period_year];

          db.query(findQuery, findParams, (err3, laRows) => {
            const matched = (!err3 && laRows && laRows[0]) ? laRows[0] : null;

            const afterUpdate = () => {
              auditEarning(req, "approved", "leave", parseInt(id), rec.earn_status, "approved", null);
              db.query("SELECT * FROM leave_earnings WHERE id = ?", [id], (e, r) => res.json(r ? r[0] : { id }));
            };

            if (matched) {
              db.query(
                `UPDATE leave_assignment
SET
  total_hours = GREATEST(0, total_hours + ?),
  remaining_hours = GREATEST(0, remaining_hours + ?),
  allocated_hours = GREATEST(0, allocated_hours + ?)
WHERE id = ?`,
                [earnedHrs, earnedHrs, earnedHrs, matched.id],
                afterUpdate
              );
            } else {
              db.query(
                `INSERT INTO leave_assignment (employeeNumber, leave_code, total_hours, remaining_hours, used_hours, carried_forward_hours, allocated_hours, period_year, period_semester)
                VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)`,
                [rec.employee_number, rec.leave_code, earnedHrs, earnedHrs, earnedHrs, rec.period_year, periodMonth ? String(periodMonth) : null],
                afterUpdate
              );
            }
          });
        }
      );
    });
  });

  router.patch("/leave/:id/reject", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    db.query("SELECT * FROM leave_earnings WHERE id = ?", [id], (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: "Not found" });
      const oldStatus = rows[0].earn_status;

      db.query(
        `UPDATE leave_earnings SET earn_status = 'rejected', rejected_reason = ?, approved_by = ?, approved_at = NOW() WHERE id = ?`,
        [reason || null, req.user?.username || null, id],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Failed to reject" });
          auditEarning(req, "rejected", "leave", parseInt(id), oldStatus, "rejected", { reason });
          db.query("SELECT * FROM leave_earnings WHERE id = ?", [id], (e, r) => res.json(r ? r[0] : { id }));
        }
      );
    });
  });

  router.delete("/leave/:id", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query("SELECT * FROM leave_earnings WHERE id = ?", [id], (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: "Not found" });
      const rec = rows[0];

      const doDelete = () => {
        db.query("DELETE FROM leave_earnings WHERE id = ?", [id], (err2) => {
          if (err2) return res.status(500).json({ error: "Failed to delete" });
          auditEarning(req, "deleted", "leave", parseInt(id), rec.earn_status, null, rec);
          res.json({ deleted: true, id: parseInt(id) });
        });
      };

      if (rec.earn_status === "approved") {
        const earnedHrs   = toNum(rec.earned_hours);
        const periodMonth = rec.period_month ? parseInt(rec.period_month) : null;
        const findQuery   = periodMonth
          ? `SELECT * FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ? AND period_year = ? AND (period_semester = ? OR period_semester = ?) ORDER BY id DESC LIMIT 1`
          : `SELECT * FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ? AND period_year = ? ORDER BY id DESC LIMIT 1`;
        const findParams  = periodMonth
          ? [rec.employee_number, rec.leave_code, rec.period_year, String(periodMonth), String(periodMonth).padStart(2, "0")]
          : [rec.employee_number, rec.leave_code, rec.period_year];

        db.query(findQuery, findParams, (err2, laRows) => {
          const matched = (!err2 && laRows && laRows[0]) ? laRows[0] : null;
          if (matched) {
            db.query(
              `UPDATE leave_assignment SET
                total_hours      = GREATEST(0, total_hours - ?),
                remaining_hours  = GREATEST(0, remaining_hours - ?),
                allocated_hours  = GREATEST(0, allocated_hours - ?)
              WHERE id = ?`,
              [earnedHrs, earnedHrs, earnedHrs, matched.id],
              doDelete
            );
          } else {
            doDelete();
          }
        });
      } else {
        doDelete();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  SC EARNINGS
  // ══════════════════════════════════════════════════════════════════════════════

  router.get("/sc/:employeeNumber", authenticateToken, (req, res) => {
    const { employeeNumber } = req.params;
    const now = new Date();
    const year  = req.query.year  || now.getFullYear();
    const month = req.query.month || (now.getMonth() + 1);
    const { status, all } = req.query;

    let query = `SELECT * FROM sc_earnings WHERE employee_number = ?`;
    const params = [employeeNumber];

    if (all !== "true") {
      params.push(year);  query += ` AND period_year = ?`;
      params.push(month); query += ` AND period_month = ?`;
    }
    if (status) { params.push(status); query += ` AND earn_status = ?`; }
    query += ` ORDER BY period_year DESC, period_month DESC, created_at DESC`;

    db.query(query, params, (err, earnings) => {
      if (err) return res.status(500).json({ error: "Failed to fetch SC earnings" });

      db.query(
        `SELECT * FROM sc_balance_summary WHERE employee_number = ? AND (? IS NULL OR period_year = ?) AND (? IS NULL OR period_month = ?)`,
        [employeeNumber, year || null, year || null, month || null, month || null],
        (err2, balances) => {
          res.json({ earnings, balances: err2 ? [] : (balances || []), period: { year: parseInt(year), month: parseInt(month) } });
        }
      );
    });
  });

  router.post("/sc", authenticateToken, requireAdmin, (req, res) => {
    const { employeeNumber, sc_type = "non_commutative", ot_hours_regular = 0, ot_hours_holiday = 0, ot_hours_night_diff = 0, total_ot_hours, earned_hours, period_year, period_month, remarks, emp_category_snapshot } = req.body;

    if (!employeeNumber || !period_year || !period_month)
      return res.status(400).json({ error: "employeeNumber, period_year, and period_month are required" });

  const earnedHrs = toNum(earned_hours);
    const entry_type_val = req.body.entry_type || "EARNED";
    const isDeduction = entry_type_val === "DEDUCTION";
    if (!isDeduction && earnedHrs <= 0) return res.status(400).json({ error: "earned_hours must be > 0" });
    if (isDeduction && earnedHrs >= 0) return res.status(400).json({ error: "Deduction earned_hours must be negative" });

    const query = `
      INSERT INTO sc_earnings
        (employee_number, sc_type, ot_hours_regular, ot_hours_holiday, ot_hours_night_diff, total_ot_hours, earned_hours, used_hours, period_year, period_month, earn_status, entry_type, remarks, emp_category_snapshot, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?, ?, ?, ?)
    `;
    db.query(query, [
      employeeNumber, sc_type, toNum(ot_hours_regular), toNum(ot_hours_holiday), toNum(ot_hours_night_diff),
      toNum(total_ot_hours) || earnedHrs, earnedHrs, period_year, parseInt(period_month),
      entry_type_val, remarks || null, emp_category_snapshot ? JSON.stringify(emp_category_snapshot) : null, req.user?.username || null
    ], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to create SC earning" });
      auditEarning(req, "created", "sc", result.insertId, null, "pending", { employeeNumber, sc_type, earnedHrs });
      res.status(201).json({ id: result.insertId, employee_number: employeeNumber, sc_type, earned_hours: earnedHrs, period_year, period_month: parseInt(period_month), earn_status: "pending" });
    });
  });

  router.patch("/sc/:id/approve", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query("SELECT * FROM sc_earnings WHERE id = ?", [id], (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: "Not found" });
      const rec = rows[0];
      if (rec.earn_status === "approved") return res.status(400).json({ error: "Already approved" });

      db.query(
        `UPDATE sc_earnings SET earn_status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?`,
        [req.user?.username || null, id],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Failed to approve SC" });

          const earnedHrs   = toNum(rec.earned_hours);
          const scType      = rec.sc_type || "non_commutative";
          const periodMonth = rec.period_month ? parseInt(rec.period_month) : null;

          const findQuery  = periodMonth
            ? `SELECT * FROM service_credit WHERE employeeNumber = ? AND sc_type = ? AND period_year = ? AND period_month = ? ORDER BY id DESC LIMIT 1`
            : `SELECT * FROM service_credit WHERE employeeNumber = ? AND sc_type = ? AND period_year = ? ORDER BY id DESC LIMIT 1`;
          const findParams = periodMonth
            ? [rec.employee_number, scType, rec.period_year, periodMonth]
            : [rec.employee_number, scType, rec.period_year];

          db.query(findQuery, findParams, (err3, scRows) => {
            const matched = (!err3 && scRows && scRows[0]) ? scRows[0] : null;

            const afterUpdate = () => {
              auditEarning(req, "approved", "sc", parseInt(id), rec.earn_status, "approved", null);
              db.query("SELECT * FROM sc_earnings WHERE id = ?", [id], (e, r) => res.json(r ? r[0] : { id }));
            };

            if (matched) {
              db.query(
                `UPDATE service_credit SET
                  earned_hours       = earned_hours + ?,
                  remaining_hours    = remaining_hours + ?,
                  total_ot_hours     = total_ot_hours + ?,
                  ot_hours_regular   = ot_hours_regular + ?,
                  ot_hours_holiday   = ot_hours_holiday + ?,
                  ot_hours_night_diff = ot_hours_night_diff + ?
                WHERE id = ?`,
                [earnedHrs, earnedHrs, toNum(rec.total_ot_hours), toNum(rec.ot_hours_regular), toNum(rec.ot_hours_holiday), toNum(rec.ot_hours_night_diff), matched.id],
                afterUpdate
              );
            } else {
              db.query(
                `INSERT INTO service_credit
                  (employeeNumber, sc_type, ot_hours_regular, ot_hours_holiday, ot_hours_night_diff, total_ot_hours, earned_hours, remaining_hours, used_hours, period_year, period_month, remarks, emp_category_snapshot)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
                [rec.employee_number, scType, toNum(rec.ot_hours_regular), toNum(rec.ot_hours_holiday), toNum(rec.ot_hours_night_diff), toNum(rec.total_ot_hours), earnedHrs, earnedHrs, rec.period_year, periodMonth, rec.remarks || null, rec.emp_category_snapshot || null],
                afterUpdate
              );
            }
          });
        }
      );
    });
  });

  router.patch("/sc/:id/reject", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    db.query("SELECT * FROM sc_earnings WHERE id = ?", [id], (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: "Not found" });
      const oldStatus = rows[0].earn_status;

      db.query(
        `UPDATE sc_earnings SET earn_status = 'rejected', rejected_reason = ?, approved_by = ?, approved_at = NOW() WHERE id = ?`,
        [reason || null, req.user?.username || null, id],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Failed to reject SC" });
          auditEarning(req, "rejected", "sc", parseInt(id), oldStatus, "rejected", { reason });
          db.query("SELECT * FROM sc_earnings WHERE id = ?", [id], (e, r) => res.json(r ? r[0] : { id }));
        }
      );
    });
  });

  router.delete("/sc/:id", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query("SELECT * FROM sc_earnings WHERE id = ?", [id], (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: "Not found" });
      const rec = rows[0];

      const doDelete = () => {
        db.query("DELETE FROM sc_earnings WHERE id = ?", [id], (err2) => {
          if (err2) return res.status(500).json({ error: "Failed to delete SC" });
          auditEarning(req, "deleted", "sc", parseInt(id), rec.earn_status, null, rec);
          res.json({ deleted: true, id: parseInt(id) });
        });
      };

      if (rec.earn_status === "approved") {
        const earnedHrs   = toNum(rec.earned_hours);
        const periodMonth = rec.period_month ? parseInt(rec.period_month) : null;
        const findQuery   = periodMonth
          ? `SELECT * FROM service_credit WHERE employeeNumber = ? AND sc_type = ? AND period_year = ? AND period_month = ? ORDER BY id DESC LIMIT 1`
          : `SELECT * FROM service_credit WHERE employeeNumber = ? AND sc_type = ? AND period_year = ? ORDER BY id DESC LIMIT 1`;
        const findParams  = periodMonth
          ? [rec.employee_number, rec.sc_type, rec.period_year, periodMonth]
          : [rec.employee_number, rec.sc_type, rec.period_year];

        db.query(findQuery, findParams, (err2, scRows) => {
          const matched = (!err2 && scRows && scRows[0]) ? scRows[0] : null;
          if (matched) {
            db.query(
              `UPDATE service_credit SET
                earned_hours    = GREATEST(0, earned_hours - ?),
                remaining_hours = GREATEST(0, remaining_hours - ?),
                total_ot_hours  = GREATEST(0, total_ot_hours - ?)
              WHERE id = ?`,
              [earnedHrs, earnedHrs, toNum(rec.total_ot_hours), matched.id],
              doDelete
            );
          } else {
            doDelete();
          }
        });
      } else {
        doDelete();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  CTO EARNINGS
  // ══════════════════════════════════════════════════════════════════════════════

  router.get("/cto/:employeeNumber", authenticateToken, (req, res) => {
    const { employeeNumber } = req.params;
    const now = new Date();
    const year  = req.query.year  || now.getFullYear();
    const month = req.query.month || (now.getMonth() + 1);
    const { status, all } = req.query;

    let query = `SELECT * FROM cto_earnings WHERE employee_number = ?`;
    const params = [employeeNumber];

    if (all !== "true") {
      params.push(year);  query += ` AND period_year = ?`;
      params.push(month); query += ` AND period_month = ?`;
    }
    if (status) { params.push(status); query += ` AND earn_status = ?`; }
    query += ` ORDER BY period_year DESC, period_month DESC, created_at DESC`;

    db.query(query, params, (err, earnings) => {
      if (err) return res.status(500).json({ error: "Failed to fetch CTO earnings" });

      db.query(
        `SELECT * FROM cto_balance_summary WHERE employee_number = ? AND (? IS NULL OR period_year = ?) AND (? IS NULL OR period_month = ?)`,
        [employeeNumber, year || null, year || null, month || null, month || null],
        (err2, balances) => {
          res.json({ earnings, balances: err2 ? [] : (balances || []), period: { year: parseInt(year), month: parseInt(month) } });
        }
      );
    });
  });

  router.post("/cto", authenticateToken, requireAdmin, (req, res) => {
    const { employeeNumber, ot_hours, earned_hours, period_year, period_month, expiry_date, remarks, emp_category_snapshot } = req.body;

    if (!employeeNumber || !period_year || !period_month)
      return res.status(400).json({ error: "employeeNumber, period_year, and period_month are required" });

const earnedHrs = toNum(earned_hours || ot_hours);
    const entry_type_val = req.body.entry_type || "EARNED";
    const isDeduction = entry_type_val === "DEDUCTION";
    if (!isDeduction && earnedHrs <= 0) return res.status(400).json({ error: "earned_hours must be > 0" });
    if (isDeduction && earnedHrs >= 0) return res.status(400).json({ error: "Deduction earned_hours must be negative" });

    const query = `
      INSERT INTO cto_earnings
        (employee_number, ot_hours, earned_hours, used_hours, period_year, period_month, expiry_date, earn_status, entry_type, remarks, emp_category_snapshot, created_by)
      VALUES (?, ?, ?, 0, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `;
    db.query(query, [
      employeeNumber, toNum(ot_hours) || earnedHrs, earnedHrs,
      period_year, parseInt(period_month), expiry_date || null,
      entry_type_val, remarks || null, emp_category_snapshot ? JSON.stringify(emp_category_snapshot) : null, req.user?.username || null
    ], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to create CTO earning" });
      auditEarning(req, "created", "cto", result.insertId, null, "pending", { employeeNumber, earnedHrs });
      res.status(201).json({ id: result.insertId, employee_number: employeeNumber, ot_hours: toNum(ot_hours) || earnedHrs, earned_hours: earnedHrs, period_year, period_month: parseInt(period_month), earn_status: "pending" });
    });
  });

  router.patch("/cto/:id/approve", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query("SELECT * FROM cto_earnings WHERE id = ?", [id], (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: "Not found" });
      const rec = rows[0];
      if (rec.earn_status === "approved") return res.status(400).json({ error: "Already approved" });

      db.query(
        `UPDATE cto_earnings SET earn_status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?`,
        [req.user?.username || null, id],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Failed to approve CTO" });

          const earnedHrs   = toNum(rec.earned_hours);
          const otHrs       = toNum(rec.ot_hours) || earnedHrs;
          const periodMonth = rec.period_month ? parseInt(rec.period_month) : null;

          const findQuery  = periodMonth
            ? `SELECT * FROM cto_credit WHERE employeeNumber = ? AND period_year = ? AND period_month = ? ORDER BY id DESC LIMIT 1`
            : `SELECT * FROM cto_credit WHERE employeeNumber = ? AND period_year = ? ORDER BY id DESC LIMIT 1`;
          const findParams = periodMonth
            ? [rec.employee_number, rec.period_year, periodMonth]
            : [rec.employee_number, rec.period_year];

          db.query(findQuery, findParams, (err3, ctoRows) => {
            const matched = (!err3 && ctoRows && ctoRows[0]) ? ctoRows[0] : null;

            const afterUpdate = () => {
              auditEarning(req, "approved", "cto", parseInt(id), rec.earn_status, "approved", null);
              db.query("SELECT * FROM cto_earnings WHERE id = ?", [id], (e, r) => res.json(r ? r[0] : { id }));
            };

            if (matched) {
              db.query(
                `UPDATE cto_credit SET ot_hours = ot_hours + ?, earned_hours = earned_hours + ?, remaining_hours = remaining_hours + ? WHERE id = ?`,
                [otHrs, earnedHrs, earnedHrs, matched.id],
                afterUpdate
              );
            } else {
              db.query(
                `INSERT INTO cto_credit (employeeNumber, ot_hours, earned_hours, remaining_hours, used_hours, period_year, period_month, expiry_date, remarks, emp_category_snapshot)
                VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
                [rec.employee_number, otHrs, earnedHrs, earnedHrs, rec.period_year, periodMonth, rec.expiry_date || null, rec.remarks || null, rec.emp_category_snapshot || null],
                afterUpdate
              );
            }
          });
        }
      );
    });
  });

  router.patch("/cto/:id/reject", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    db.query("SELECT * FROM cto_earnings WHERE id = ?", [id], (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: "Not found" });
      const oldStatus = rows[0].earn_status;

      db.query(
        `UPDATE cto_earnings SET earn_status = 'rejected', rejected_reason = ?, approved_by = ?, approved_at = NOW() WHERE id = ?`,
        [reason || null, req.user?.username || null, id],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Failed to reject CTO" });
          auditEarning(req, "rejected", "cto", parseInt(id), oldStatus, "rejected", { reason });
          db.query("SELECT * FROM cto_earnings WHERE id = ?", [id], (e, r) => res.json(r ? r[0] : { id }));
        }
      );
    });
  });

  router.delete("/cto/:id", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.query("SELECT * FROM cto_earnings WHERE id = ?", [id], (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: "Not found" });
      const rec = rows[0];

      const doDelete = () => {
        db.query("DELETE FROM cto_earnings WHERE id = ?", [id], (err2) => {
          if (err2) return res.status(500).json({ error: "Failed to delete CTO" });
          auditEarning(req, "deleted", "cto", parseInt(id), rec.earn_status, null, rec);
          res.json({ deleted: true, id: parseInt(id) });
        });
      };

      if (rec.earn_status === "approved") {
        const earnedHrs   = toNum(rec.earned_hours);
        const otHrs       = toNum(rec.ot_hours) || earnedHrs;
        const periodMonth = rec.period_month ? parseInt(rec.period_month) : null;
        const findQuery   = periodMonth
          ? `SELECT * FROM cto_credit WHERE employeeNumber = ? AND period_year = ? AND period_month = ? ORDER BY id DESC LIMIT 1`
          : `SELECT * FROM cto_credit WHERE employeeNumber = ? AND period_year = ? ORDER BY id DESC LIMIT 1`;
        const findParams  = periodMonth
          ? [rec.employee_number, rec.period_year, periodMonth]
          : [rec.employee_number, rec.period_year];

        db.query(findQuery, findParams, (err2, ctoRows) => {
          const matched = (!err2 && ctoRows && ctoRows[0]) ? ctoRows[0] : null;
          if (matched) {
            db.query(
              `UPDATE cto_credit SET
                ot_hours        = GREATEST(0, ot_hours - ?),
                earned_hours    = GREATEST(0, earned_hours - ?),
                remaining_hours = GREATEST(0, remaining_hours - ?)
              WHERE id = ?`,
              [otHrs, earnedHrs, earnedHrs, matched.id],
              doDelete
            );
          } else {
            doDelete();
          }
        });
      } else {
        doDelete();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  MONTHLY SUMMARY
  //  GET /api/earnings/monthly/:employeeNumber?year=2026
  // ══════════════════════════════════════════════════════════════════════════════
  router.get("/monthly/:employeeNumber", authenticateToken, (req, res) => {
    const { employeeNumber } = req.params;
    const year = req.query.year || new Date().getFullYear();

    const leaveQ = `
      SELECT period_month, earn_status,
        SUM(earned_hours) as total_earned_hours,
        COUNT(*) as record_count
      FROM leave_earnings
      WHERE employee_number = ? AND period_year = ?
      GROUP BY period_month, earn_status
      ORDER BY period_month ASC
    `;
    const scQ = `
      SELECT period_month, earn_status,
        SUM(earned_hours) as total_earned_hours,
        SUM(total_ot_hours) as total_ot_hours,
        COUNT(*) as record_count
      FROM sc_earnings
      WHERE employee_number = ? AND period_year = ?
      GROUP BY period_month, earn_status
      ORDER BY period_month ASC
    `;
    const ctoQ = `
      SELECT period_month, earn_status,
        SUM(earned_hours) as total_earned_hours,
        SUM(ot_hours) as total_ot_hours,
        COUNT(*) as record_count
      FROM cto_earnings
      WHERE employee_number = ? AND period_year = ?
      GROUP BY period_month, earn_status
      ORDER BY period_month ASC
    `;

    db.query(leaveQ, [employeeNumber, year], (err1, leaveRows) => {
      db.query(scQ, [employeeNumber, year], (err2, scRows) => {
        db.query(ctoQ, [employeeNumber, year], (err3, ctoRows) => {
          res.json({
            employeeNumber,
            year: parseInt(year),
            leave: err1 ? [] : (leaveRows || []),
            sc:    err2 ? [] : (scRows || []),
            cto:   err3 ? [] : (ctoRows || []),
          });
        });
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  COMBINED BALANCE
  //  GET /api/earnings/balance/:employeeNumber?year=2026&month=4
  // ══════════════════════════════════════════════════════════════════════════════
  router.get("/balance/:employeeNumber", authenticateToken, (req, res) => {
    const { employeeNumber } = req.params;
    const now = new Date();
    const year  = req.query.year  || now.getFullYear();
    const month = req.query.month || (now.getMonth() + 1);

    db.query(
      `SELECT * FROM leave_balance_summary WHERE employee_number = ? AND (? IS NULL OR period_year = ?) AND (? IS NULL OR period_month = ?)`,
      [employeeNumber, year || null, year || null, month || null, month || null],
      (err1, leaveRows) => {
        db.query(
          `SELECT * FROM sc_balance_summary WHERE employee_number = ? AND (? IS NULL OR period_year = ?) AND (? IS NULL OR period_month = ?)`,
          [employeeNumber, year || null, year || null, month || null, month || null],
          (err2, scRows) => {
            db.query(
              `SELECT * FROM cto_balance_summary WHERE employee_number = ? AND (? IS NULL OR period_year = ?) AND (? IS NULL OR period_month = ?)`,
              [employeeNumber, year || null, year || null, month || null, month || null],
              (err3, ctoRows) => {
                res.json({
                  employeeNumber,
                  year:  parseInt(year),
                  month: parseInt(month),
                  leave: err1 ? [] : (leaveRows || []),
                  sc:    err2 ? [] : (scRows || []),
                  cto:   err3 ? [] : (ctoRows || []),
                });
              }
            );
          }
        );
      }
    );
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  ASSIGNMENT BALANCES
  //  GET /api/earnings/assignment-balances/:employeeNumber
  // ══════════════════════════════════════════════════════════════════════════════
  router.get("/assignment-balances/:employeeNumber", authenticateToken, (req, res) => {
    const { employeeNumber } = req.params;

    const query = `
      SELECT
        leave_code,
        SUM(remaining_hours) as remaining_hours,
        SUM(total_hours)     as total_hours,
        SUM(used_hours)      as used_hours,
        MAX(period_year)     as period_year
      FROM leave_assignment
      WHERE employeeNumber = ?
      GROUP BY leave_code
    `;

    db.query(query, [employeeNumber], (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to fetch assignment balances" });
      const map = {};
      (rows || []).forEach(r => { map[r.leave_code] = r; });
      res.json(map);
    });
  });


  // ══════════════════════════════════════════════════════════════════════════════
//  SC BALANCE — direct from service_credit table
//  GET /api/earnings/sc/:employeeNumber/balance
// ══════════════════════════════════════════════════════════════════════════════
router.get("/sc/:employeeNumber/balance", authenticateToken, (req, res) => {
  const { employeeNumber } = req.params;
  db.query(
    `SELECT sc_type,
       SUM(earned_hours)    AS earned_hours,
       SUM(remaining_hours) AS remaining_hours,
       SUM(used_hours)      AS used_hours
     FROM service_credit
     WHERE employeeNumber = ?
     GROUP BY sc_type`,
    [employeeNumber],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to fetch SC balance" });
      const balances = rows || [];
      const totalRemaining = balances.reduce((s, r) => s + toNum(r.remaining_hours), 0);
      res.json({ balances, totalRemaining });
    }
  );
});

// ══════════════════════════════════════════════════════════════════════════════
//  CTO BALANCE — direct from cto_credit table
//  GET /api/earnings/cto/:employeeNumber/balance
// ══════════════════════════════════════════════════════════════════════════════
router.get("/cto/:employeeNumber/balance", authenticateToken, (req, res) => {
  const { employeeNumber } = req.params;
  db.query(
    `SELECT
       period_year,
       period_month,
       expiry_date,
       SUM(earned_hours)    AS earned_hours,
       SUM(remaining_hours) AS remaining_hours,
       SUM(used_hours)      AS used_hours
     FROM cto_credit
     WHERE employeeNumber = ?
     GROUP BY period_year, period_month, expiry_date
     ORDER BY period_year DESC, period_month DESC`,
    [employeeNumber],
    (err, rows) => {
      if (err) {
        console.error("CTO balance error:", err);
        return res.status(500).json({ error: "Failed to fetch CTO balance", detail: err.message });
      }
      const balances = rows || [];
      const totalRemaining = balances.reduce((s, r) => s + toNum(r.remaining_hours), 0);
      res.json({ balances, totalRemaining });
    }
  );
});

// ── OT TYPES ──────────────────────────────────────────────────────────────────
router.get("/ot-types", authenticateToken, (req, res) => {
  res.json([
    { id: "regular",    name: "Regular OT",           multiplier: 1 },
    { id: "holiday",    name: "Holiday OT",            multiplier: 1 },
    { id: "night_diff", name: "Night Differential OT", multiplier: 1 },
  ]);
});


  module.exports = router;