const express = require("express");
  const router = express.Router();
  const db = require("../db");
  const { authenticateToken, requireAdmin, logAudit } = require("../middleware/auth");
  const jwt = require("jsonwebtoken");

  const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

  const getIo = (req) => {
    // Primary wiring in backend/index.js: app.locals.io = io
    if (req?.app?.locals?.io) return req.app.locals.io;
    // Back-compat if some deployments still use app.set("io", io)
    try {
      return req.app.get("io");
    } catch {
      return null;
    }
  };

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

  const semRank = (s) => {
    const v = String(s || "").trim().toLowerCase();
    if (!v) return 0;
    if (v.includes("2nd") || v === "2") return 3;
    if (v.includes("1st") || v === "1") return 2;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 1;
  };

  const isBeforePeriod = (row, targetYear, targetMonth) => {
    const y = Number(row?.period_year);
    const m = semRank(row?.period_semester);
    if (!Number.isFinite(y)) return true;
    if (y < targetYear) return true;
    if (y > targetYear) return false;
    return m < targetMonth;
  };

  const findTargetRow = (rows, targetYear, targetMonth) => {
    const mStr = String(targetMonth);
    const mPad = String(targetMonth).padStart(2, "0");
    const filtered = (rows || []).filter(
      (r) =>
        Number(r?.period_year) === Number(targetYear) &&
        (String(r?.period_semester || "") === mStr ||
          String(r?.period_semester || "") === mPad),
    );
    // Prefer newest id if multiple
    return filtered.sort((a, b) => Number(b.id) - Number(a.id))[0] || null;
  };

  // Option A: roll-forward remaining from earlier rows into the target period row,
  // and zero-out earlier rows' remaining_hours to prevent double-counting.
  const rollForwardLeaveBalance = async ({
    req,
    employeeNumber,
    leaveCode,
    periodYear,
    periodMonth,
  }) => {
    const month = parseInt(periodMonth, 10);
    const year = parseInt(periodYear, 10);
    if (!employeeNumber || !leaveCode || !Number.isFinite(month) || !Number.isFinite(year)) {
      return null;
    }

    const rows = await new Promise((resolve) => {
      db.query(
        `SELECT * FROM leave_assignment
         WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
         ORDER BY period_year DESC,
           CASE
             WHEN period_semester IN ('2nd','2nd semester','2') THEN 3
             WHEN period_semester IN ('1st','1st semester','1') THEN 2
             ELSE 1
           END DESC,
           id DESC`,
        [employeeNumber, leaveCode],
        (err, r) => resolve(!err && Array.isArray(r) ? r : []),
      );
    });

    const earlier = rows.filter((r) => isBeforePeriod(r, year, month));
    const carryHours = earlier.reduce(
      (sum, r) => sum + (toNum(r.remaining_hours) || 0),
      0,
    );

    // Nothing to roll forward
    if (carryHours <= 0) {
      return findTargetRow(rows, year, month);
    }

    let target = findTargetRow(rows, year, month);

    const actorEmpNum = getActorEmployeeNumber(req);
    const auditDetails = {
      mode: "roll-forward",
      employeeNumber,
      leave_code: leaveCode,
      from_periods: earlier.map((r) => ({
        id: r.id,
        period_year: r.period_year,
        period_semester: r.period_semester,
        remaining_hours: r.remaining_hours,
      })),
      to_period: { period_year: year, period_semester: String(month) },
      carried_hours: carryHours,
    };

    if (!target) {
      // Create target period row that absorbs the carry as carried_forward_hours
      const insertedId = await new Promise((resolve) => {
        db.query(
          `INSERT INTO leave_assignment
            (employeeNumber, leave_code, total_hours, remaining_hours, used_hours, carried_forward_hours, allocated_hours, period_year, period_semester)
           VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?)`,
          [
            employeeNumber,
            leaveCode,
            carryHours,
            carryHours,
            carryHours,
            year,
            String(month),
          ],
          (err, result) => resolve(!err ? result?.insertId : null),
        );
      });
      if (insertedId) {
        try {
          logAudit(
            { employeeNumber: actorEmpNum },
            `Roll forward leave balance (${carryHours} hrs)`,
            "leave_assignment",
            insertedId,
            employeeNumber,
            auditDetails,
          );
        } catch (e) {}
        target = { id: insertedId };
      }
    } else {
      // Add carry into existing target row (without touching allocated/used)
      await new Promise((resolve) => {
        db.query(
          `UPDATE leave_assignment SET
             carried_forward_hours = GREATEST(0, carried_forward_hours + ?),
             total_hours           = GREATEST(0, total_hours + ?),
             remaining_hours       = GREATEST(0, remaining_hours + ?)
           WHERE id = ?`,
          [carryHours, carryHours, carryHours, target.id],
          () => resolve(),
        );
      });
      try {
        logAudit(
          { employeeNumber: actorEmpNum },
          `Roll forward leave balance (${carryHours} hrs)`,
          "leave_assignment",
          target.id,
          employeeNumber,
          auditDetails,
        );
      } catch (e) {}
    }

    // Zero-out earlier rows remaining_hours so totals aren't double-counted
    await Promise.all(
      earlier.map(
        (r) =>
          new Promise((resolve) => {
            db.query(
              `UPDATE leave_assignment SET remaining_hours = 0 WHERE id = ?`,
              [r.id],
              () => resolve(),
            );
          }),
      ),
    );

    return target;
  };

  // When earnings are approved out-of-order (e.g., April approved before January),
  // we need later period rows to reflect the additional carry-in.
  // This applies ONLY to rows after the approved earning month within the same year.
  const propagateEarnedHoursToLaterPeriods = async ({
    employeeNumber,
    leaveCode,
    periodYear,
    periodMonth,
    earnedHours,
  }) => {
    const y = parseInt(periodYear, 10);
    const m = parseInt(periodMonth, 10);
    const hrs = toNum(earnedHours);
    if (!employeeNumber || !leaveCode || !Number.isFinite(y) || !Number.isFinite(m) || !hrs) return;

    await new Promise((resolve) => {
      db.query(
        `UPDATE leave_assignment
         SET
           carried_forward_hours = GREATEST(0, carried_forward_hours + ?),
           total_hours           = GREATEST(0, total_hours + ?),
           remaining_hours       = GREATEST(0, remaining_hours + ?)
         WHERE employeeNumber = ?
           AND TRIM(leave_code) = TRIM(?)
           AND period_year = ?
           AND period_semester IS NOT NULL
           AND CAST(period_semester AS UNSIGNED) > ?`,
        [hrs, hrs, hrs, employeeNumber, leaveCode, y, m],
        () => resolve(),
      );
    });
  };

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
          if (err) return resolve("");
          resolve((rows && rows[0] && rows[0].fullName) || "");
        },
      );
    });

  const formatUserDisplayName = (employeeNumber, fullName) => {
    const emp = employeeNumber ? String(employeeNumber) : "unknown";
    const name = (fullName || "").trim();
    return name ? `${name} (${emp})` : emp;
  };

  const insertTransactionLog = (employeeId, message, actorEmployeeNumber = null) =>
    new Promise((resolve) => {
      if (!employeeId || !message) return resolve();
      db.query(
        "INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)",
        [employeeId, message],
        (err) => {
          if (err) return resolve();
          resolve();
        },
      );
    });

  const buildEarningsTransactionMessage = ({
    actionLabel,
    actorDisplay,
    targetDisplay,
    earningTypeLabel,
    hoursValue,
    leaveCode,
    periodYear,
    periodMonth,
  }) => {
    const hoursPart =
      typeof hoursValue === "number" && Number.isFinite(hoursValue)
        ? ` (${hoursValue} hrs)`
        : "";
    const leavePart = leaveCode ? ` [${leaveCode}]` : "";
    const periodPart =
      periodYear && periodMonth
        ? ` for ${periodYear}-${String(periodMonth).padStart(2, "0")}`
        : "";
    return `${actorDisplay} ${actionLabel} ${earningTypeLabel}${hoursPart}${leavePart}${periodPart} for ${targetDisplay}`;
  };

  // ─── AUDIT LOG ────────────────────────────────────────────────────────────────
  const insertEarningsAuditLog = (
    earningType,
    earningId,
    action,
    oldStatus,
    newStatus,
    actor,
    notes,
    payload,
  ) =>
    new Promise((resolve) => {
      if (!earningType || !earningId || !action) return resolve();
      const safePayload =
        payload == null
          ? null
          : typeof payload === "string"
            ? payload
            : (() => {
                try {
                  return JSON.stringify(payload);
                } catch (e) {
                  return null;
                }
              })();
      db.query(
        `INSERT INTO earnings_audit_log
          (earning_type, earning_id, action, old_status, new_status, actor, notes, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(earningType).toLowerCase(),
          parseInt(earningId, 10),
          String(action),
          oldStatus != null ? String(oldStatus) : null,
          newStatus != null ? String(newStatus) : null,
          actor != null ? String(actor) : null,
          notes != null ? String(notes) : null,
          safePayload,
        ],
        (err) => {
          if (err) {
            // Non-fatal: keep app working even if audit table is missing.
            console.error("[earnings] Failed to insert earnings_audit_log:", err.message);
          }
          resolve();
        },
      );
    });

  const getEarningsAuditMeta = (type, payload) => {
    const t = String(type || "").toLowerCase();
    const p = payload && typeof payload === "object" ? payload : {};

    if (t === "leave") {
      const leaveCode = (p.leave_code || p.leaveCode || p.leave_code_snapshot || "")
        .toString()
        .trim()
        .toUpperCase();
      const suffix = leaveCode ? ` (${leaveCode})` : "";
      return {
        actionSuffix: suffix,
        notes: leaveCode ? `Leave Code: ${leaveCode}` : null,
      };
    }

    if (t === "sc") {
      const scType = (p.sc_type || p.scType || "")
        .toString()
        .trim()
        .toLowerCase();
      if (scType === "non_commutative" || scType === "commutative") {
        return { actionSuffix: "", notes: null };
      }
      const pretty = scType ? scType.replace(/_/g, " ") : "";
      const suffix = pretty ? ` (${pretty})` : "";
      return { actionSuffix: suffix, notes: pretty ? `SC Type: ${pretty}` : null };
    }

    // cto + others
    return { actionSuffix: "", notes: null };
  };

  const auditEarning = (req, action, type, id, oldStatus, newStatus, payload = {}) => {
    const actor = getActorEmployeeNumber(req);
    const targetEmployeeNumber =
      payload?.employeeNumber || payload?.employee_number || null;
    const details = JSON.stringify({
      type,
      actor_employeeNumber: actor,
      target_employeeNumber: targetEmployeeNumber,
      old_status: oldStatus,
      new_status: newStatus,
      payload,
    });
    // Store also in earnings_audit_log (dedicated earnings audit trail)
    const { actionSuffix, notes } = getEarningsAuditMeta(type, payload);
    insertEarningsAuditLog(
      type,
      id,
      `${action}${actionSuffix}`,
      oldStatus,
      newStatus,
      actor,
      notes,
      { ...payload, targetEmployeeNumber },
    );
    logAudit(
      { employeeNumber: actor },
      action,
      `earnings_${type}`,
      id,
      targetEmployeeNumber,
      details,
    );
  };

  // ─── Earnings audit trail API ────────────────────────────────────────────────
  // GET /api/earnings/audit/:type/:earningId
  router.get("/audit/:type/:earningId", authenticateToken, requireAdmin, (req, res) => {
    const { type, earningId } = req.params;
    if (!type || !earningId) return res.status(400).json({ error: "type and earningId are required" });
    db.query(
      `SELECT *
       FROM earnings_audit_log
       WHERE earning_type = ? AND earning_id = ?
       ORDER BY id ASC`,
      [String(type).toLowerCase(), parseInt(earningId, 10)],
      (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch earnings audit log" });
        res.json(Array.isArray(rows) ? rows : []);
      },
    );
  });

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
            const io = getIo(req);
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

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const respond = (earnings) => {
      const balQuery = `
        SELECT * FROM leave_balance_summary
        WHERE employee_number = ?
          AND (? IS NULL OR period_year = ?)
          AND (? IS NULL OR period_month = ?)
      `;
      db.query(balQuery, [employeeNumber, year || null, year || null, month || null, month || null], (err2, balances) => {
        res.json({
          earnings,
          balances: err2 ? [] : (balances || []),
          period: { year: parseInt(year, 10), month: parseInt(month, 10) },
        });
      });
    };

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

      // When viewing a calendar month, also surface ADJUSTMENT rows posted in a *different* month
      // that explicitly cover this month (remarks from LeaveEarnings: "ADJUSTMENT (missed {Month}) …").
      const yNum = parseInt(year, 10);
      const mNum = parseInt(month, 10);
      const shouldMerge =
        all !== "true" &&
        Number.isFinite(yNum) &&
        Number.isFinite(mNum) &&
        mNum >= 1 &&
        mNum <= 12;
      if (!shouldMerge) {
        return respond(Array.isArray(earnings) ? earnings : []);
      }

      const missedToken = `ADJUSTMENT (missed ${monthNames[mNum - 1]})`;
      let q2 = `
        SELECT le.*, lt.leave_description
        FROM leave_earnings le
        LEFT JOIN leave_table lt ON lt.leave_code = le.leave_code
        WHERE le.employee_number = ?
          AND le.period_year = ?
          AND UPPER(IFNULL(le.entry_type, '')) = 'ADJUSTMENT'
          AND le.earn_status IN ('pending','approved')
          AND le.period_month IS NOT NULL
          AND le.period_month <> ?
          AND le.remarks LIKE ?
      `;
      const p2 = [employeeNumber, yNum, mNum, `%${missedToken}%`];
      if (status) {
        q2 += ` AND le.earn_status = ?`;
        p2.push(status);
      }
      q2 += ` ORDER BY le.period_year DESC, le.period_month DESC, le.created_at DESC`;

      db.query(q2, p2, (e2, extra) => {
        const base = Array.isArray(earnings) ? earnings : [];
        const add = Array.isArray(extra) ? extra : [];
        if (e2 || !add.length) return respond(base);

        const byId = new Map();
        base.forEach((r) => {
          if (r && r.id != null) byId.set(Number(r.id), r);
        });
        add.forEach((r) => {
          if (!r || r.id == null) return;
          const id = Number(r.id);
          if (byId.has(id)) return;
          byId.set(id, {
            ...r,
            _covers_month: mNum,
            _posted_period_month: r.period_month,
          });
        });
        const merged = Array.from(byId.values()).sort((a, b) => {
          const tb = new Date(b.created_at || b.approved_at || 0).getTime();
          const ta = new Date(a.created_at || a.approved_at || 0).getTime();
          if (tb !== ta) return tb - ta;
          return Number(b.id) - Number(a.id);
        });
        respond(merged);
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
  const py = parseInt(period_year, 10);
  const pm = parseInt(period_month, 10);
  const normalizedEntry = String(entry_type || "EARNED").toUpperCase();
  const isAdjustment = normalizedEntry === "ADJUSTMENT";

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

  const doInsert = () => {
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
        normalizedEntry,
        remarks || null,
        req.user?.username || null,
      ],
      (err, result) => {
        if (err) {
          console.error("Leave earning insert error:", err);
          return res.status(500).json({ error: "Failed to create leave earning" });
        }

        const earningPayload = {
          employeeNumber,
          leave_code,
          earned_hours: hrs,
          entry_type: normalizedEntry,
          period_year,
          period_month: parseInt(period_month),
          remarks: remarks || null,
        };
        auditEarning(
          req,
          "created leave earnings",
          "leave",
          result.insertId,
          null,
          "pending",
          earningPayload,
        );

        (async () => {
          const actorEmpNum = getActorEmployeeNumber(req);
          const [actorName, targetName] = await Promise.all([
            getEmployeeFullName(actorEmpNum),
            getEmployeeFullName(employeeNumber),
          ]);
          const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
          const targetDisplay = formatUserDisplayName(employeeNumber, targetName);
          const txMessage = buildEarningsTransactionMessage({
            actionLabel: "created",
            actorDisplay,
            targetDisplay,
            earningTypeLabel: "leave earnings",
            hoursValue: hrs,
            leaveCode: leave_code,
            periodYear: period_year,
            periodMonth: parseInt(period_month),
          });
          await insertTransactionLog(employeeNumber, txMessage, actorEmpNum);
        })();

        res.status(201).json({
          id: result.insertId,
          employee_number: employeeNumber,
          leave_code,
          earned_hours: hrs,
          period_year,
          period_month: parseInt(period_month),
          entry_type: normalizedEntry,
          earn_status: "pending",
          remarks: remarks || null,
        });
      },
    );
  };

  // Rule 1 (Production): No backdated insert if later period exists.
  // If an admin needs to record a missed earning for a closed month, use ADJUSTMENT in the current period.
  if (!isDeduction && !isAdjustment && Number.isFinite(py) && Number.isFinite(pm)) {
    db.query(
      `SELECT
         MAX(CAST(period_semester AS UNSIGNED)) AS max_month
       FROM leave_assignment
       WHERE employeeNumber = ?
         AND TRIM(leave_code) = TRIM(?)
         AND period_year = ?
         AND period_semester IS NOT NULL`,
      [employeeNumber, leave_code, py],
      (mxErr, mxRows) => {
        const maxMonth = !mxErr && mxRows && mxRows[0] ? parseInt(mxRows[0].max_month, 10) : null;
        if (Number.isFinite(maxMonth) && maxMonth > pm) {
          // Suggest the month where earnings "stopped" (latest existing earning month),
          // falling back to the latest assignment month when no earnings exist.
          db.query(
            `SELECT MAX(period_month) AS last_earn_month
             FROM leave_earnings
             WHERE employee_number = ?
               AND TRIM(leave_code) = TRIM(?)
               AND period_year = ?
               AND period_month IS NOT NULL
               AND earn_status IN ('pending','approved')
               AND entry_type IN ('EARNED','ADJUSTMENT')`,
            [employeeNumber, leave_code, py],
            (e2, r2) => {
              const lastEarnMonth =
                !e2 && r2 && r2[0] && r2[0].last_earn_month != null
                  ? parseInt(r2[0].last_earn_month, 10)
                  : null;
              const suggested =
                Number.isFinite(lastEarnMonth) && lastEarnMonth >= pm
                  ? lastEarnMonth
                  : maxMonth;
              return res.status(409).json({
                code: "PERIOD_CLOSED",
                error:
                  "This period is already closed. Please add the missed earning as an adjustment in the month where earnings stopped.",
                period_year: py,
                requested_month: pm,
                suggested_month: suggested,
              });
            },
          );
          return;
        }

        return doInsert();
      }
    );
    return;
  }

  // Non-backdated case: insert immediately
  return doInsert();
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

          (async () => {
            // Roll-forward first so the target period row reflects prior remaining balance
            await rollForwardLeaveBalance({
              req,
              employeeNumber: rec.employee_number,
              leaveCode: rec.leave_code,
              periodYear: rec.period_year,
              periodMonth: periodMonth || 0,
            });

            const mStr = periodMonth ? String(periodMonth) : null;
            const mPad = periodMonth ? String(periodMonth).padStart(2, "0") : null;
            const findQuery = periodMonth
              ? `SELECT * FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ? AND period_year = ? AND (period_semester = ? OR period_semester = ?) ORDER BY id DESC LIMIT 1`
              : `SELECT * FROM leave_assignment WHERE employeeNumber = ? AND leave_code = ? AND period_year = ? ORDER BY id DESC LIMIT 1`;
            const findParams = periodMonth
              ? [rec.employee_number, rec.leave_code, rec.period_year, mStr, mPad]
              : [rec.employee_number, rec.leave_code, rec.period_year];

            const matched = await new Promise((resolve) => {
              db.query(findQuery, findParams, (e3, laRows) =>
                resolve((!e3 && laRows && laRows[0]) ? laRows[0] : null),
              );
            });

            const afterUpdate = async () => {
              // If a later period (e.g. April) already exists, make it reflect this newly-approved earlier month.
              // This is what prevents "separate 10 hours record" from looking like it didn't add to the later running balance.
              if (periodMonth) {
                await propagateEarnedHoursToLaterPeriods({
                  employeeNumber: rec.employee_number,
                  leaveCode: rec.leave_code,
                  periodYear: rec.period_year,
                  periodMonth,
                  earnedHours: earnedHrs,
                });
              }

              auditEarning(req, "approved leave earnings", "leave", parseInt(id), rec.earn_status, "approved", rec);

              // Notify clients (LeaveAssignment listens to this) so totals refresh immediately.
              try {
                const io = getIo(req);
                if (io) {
                  io.emit("leaveAssignmentChanged", {
                    scope: "leave_assignment",
                    action: "updated-from-earnings-approval",
                    employeeNumber: rec.employee_number,
                    leave_code: rec.leave_code,
                    period_year: rec.period_year,
                    period_month: rec.period_month,
                    earning_id: parseInt(id, 10),
                  });
                }
              } catch (emitErr) {
                // non-fatal
              }

              (async () => {
                const actorEmpNum = getActorEmployeeNumber(req);
                const [actorName, targetName] = await Promise.all([
                  getEmployeeFullName(actorEmpNum),
                  getEmployeeFullName(rec.employee_number),
                ]);
                const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
                const targetDisplay = formatUserDisplayName(rec.employee_number, targetName);
                const txMessage = buildEarningsTransactionMessage({
                  actionLabel: "approved",
                  actorDisplay,
                  targetDisplay,
                  earningTypeLabel: "leave earnings",
                  hoursValue: toNum(rec.earned_hours),
                  leaveCode: rec.leave_code,
                  periodYear: rec.period_year,
                  periodMonth: rec.period_month,
                });
                await insertTransactionLog(rec.employee_number, txMessage, actorEmpNum);
              })();
              db.query("SELECT * FROM leave_earnings WHERE id = ?", [id], (e, r) => res.json(r ? r[0] : { id }));
            };

            if (matched) {
              db.query(
                `UPDATE leave_assignment
SET
  total_hours     = GREATEST(0, total_hours + ?),
  remaining_hours = GREATEST(0, remaining_hours + ?),
  allocated_hours = GREATEST(0, allocated_hours + ?)
WHERE id = ?`,
                [earnedHrs, earnedHrs, earnedHrs, matched.id],
                () => { afterUpdate(); },
              );
            } else {
              db.query(
                `INSERT INTO leave_assignment (employeeNumber, leave_code, total_hours, remaining_hours, used_hours, carried_forward_hours, allocated_hours, period_year, period_semester)
                 VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)`,
                [
                  rec.employee_number,
                  rec.leave_code,
                  earnedHrs,
                  earnedHrs,
                  earnedHrs,
                  rec.period_year,
                  periodMonth ? String(periodMonth) : null,
                ],
                () => { afterUpdate(); },
              );
            }
          })().catch((e) => {
            console.error("[earnings] roll-forward/approve error:", e.message);
            // Still respond with a safe error
            res.status(500).json({ error: "Failed to approve earning", detail: e.message });
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
          auditEarning(req, "rejected leave earnings", "leave", parseInt(id), oldStatus, "rejected", { ...rows[0], reason });
          (async () => {
            const actorEmpNum = getActorEmployeeNumber(req);
            const [actorName, targetName] = await Promise.all([
              getEmployeeFullName(actorEmpNum),
              getEmployeeFullName(rows[0].employee_number),
            ]);
            const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
            const targetDisplay = formatUserDisplayName(rows[0].employee_number, targetName);
            const txMessage = buildEarningsTransactionMessage({
              actionLabel: "rejected",
              actorDisplay,
              targetDisplay,
              earningTypeLabel: "leave earnings",
              hoursValue: toNum(rows[0].earned_hours),
              leaveCode: rows[0].leave_code,
              periodYear: rows[0].period_year,
              periodMonth: rows[0].period_month,
            });
            await insertTransactionLog(rows[0].employee_number, txMessage, actorEmpNum);
          })();
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
          auditEarning(req, "deleted leave earnings", "leave", parseInt(id), rec.earn_status, null, rec);
          (async () => {
            const actorEmpNum = getActorEmployeeNumber(req);
            const [actorName, targetName] = await Promise.all([
              getEmployeeFullName(actorEmpNum),
              getEmployeeFullName(rec.employee_number),
            ]);
            const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
            const targetDisplay = formatUserDisplayName(rec.employee_number, targetName);
            const txMessage = buildEarningsTransactionMessage({
              actionLabel: "deleted",
              actorDisplay,
              targetDisplay,
              earningTypeLabel: "leave earnings",
              hoursValue: toNum(rec.earned_hours),
              leaveCode: rec.leave_code,
              periodYear: rec.period_year,
              periodMonth: rec.period_month,
            });
            await insertTransactionLog(rec.employee_number, txMessage, actorEmpNum);
          })();
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
      auditEarning(req, "created service credit earnings", "sc", result.insertId, null, "pending", { employeeNumber, sc_type, earnedHrs, period_year, period_month: parseInt(period_month) });
      (async () => {
        const actorEmpNum = getActorEmployeeNumber(req);
        const [actorName, targetName] = await Promise.all([
          getEmployeeFullName(actorEmpNum),
          getEmployeeFullName(employeeNumber),
        ]);
        const txMessage = buildEarningsTransactionMessage({
          actionLabel: "created",
          actorDisplay: formatUserDisplayName(actorEmpNum, actorName),
          targetDisplay: formatUserDisplayName(employeeNumber, targetName),
          earningTypeLabel: "service credit earnings",
          hoursValue: earnedHrs,
          periodYear: period_year,
          periodMonth: parseInt(period_month),
        });
        await insertTransactionLog(employeeNumber, txMessage, actorEmpNum);
      })();
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
              auditEarning(req, "approved service credit earnings", "sc", parseInt(id), rec.earn_status, "approved", rec);
              (async () => {
                const actorEmpNum = getActorEmployeeNumber(req);
                const [actorName, targetName] = await Promise.all([
                  getEmployeeFullName(actorEmpNum),
                  getEmployeeFullName(rec.employee_number),
                ]);
                const txMessage = buildEarningsTransactionMessage({
                  actionLabel: "approved",
                  actorDisplay: formatUserDisplayName(actorEmpNum, actorName),
                  targetDisplay: formatUserDisplayName(rec.employee_number, targetName),
                  earningTypeLabel: "service credit earnings",
                  hoursValue: toNum(rec.earned_hours),
                  periodYear: rec.period_year,
                  periodMonth: rec.period_month,
                });
                await insertTransactionLog(rec.employee_number, txMessage, actorEmpNum);
              })();
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
          auditEarning(req, "rejected service credit earnings", "sc", parseInt(id), oldStatus, "rejected", { ...rows[0], reason });
          (async () => {
            const actorEmpNum = getActorEmployeeNumber(req);
            const [actorName, targetName] = await Promise.all([
              getEmployeeFullName(actorEmpNum),
              getEmployeeFullName(rows[0].employee_number),
            ]);
            const txMessage = buildEarningsTransactionMessage({
              actionLabel: "rejected",
              actorDisplay: formatUserDisplayName(actorEmpNum, actorName),
              targetDisplay: formatUserDisplayName(rows[0].employee_number, targetName),
              earningTypeLabel: "service credit earnings",
              hoursValue: toNum(rows[0].earned_hours),
              periodYear: rows[0].period_year,
              periodMonth: rows[0].period_month,
            });
            await insertTransactionLog(rows[0].employee_number, txMessage, actorEmpNum);
          })();
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
          auditEarning(req, "deleted service credit earnings", "sc", parseInt(id), rec.earn_status, null, rec);
          (async () => {
            const actorEmpNum = getActorEmployeeNumber(req);
            const [actorName, targetName] = await Promise.all([
              getEmployeeFullName(actorEmpNum),
              getEmployeeFullName(rec.employee_number),
            ]);
            const txMessage = buildEarningsTransactionMessage({
              actionLabel: "deleted",
              actorDisplay: formatUserDisplayName(actorEmpNum, actorName),
              targetDisplay: formatUserDisplayName(rec.employee_number, targetName),
              earningTypeLabel: "service credit earnings",
              hoursValue: toNum(rec.earned_hours),
              periodYear: rec.period_year,
              periodMonth: rec.period_month,
            });
            await insertTransactionLog(rec.employee_number, txMessage, actorEmpNum);
          })();
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
      auditEarning(req, "created cto earnings", "cto", result.insertId, null, "pending", { employeeNumber, earnedHrs, period_year, period_month: parseInt(period_month) });
      (async () => {
        const actorEmpNum = getActorEmployeeNumber(req);
        const [actorName, targetName] = await Promise.all([
          getEmployeeFullName(actorEmpNum),
          getEmployeeFullName(employeeNumber),
        ]);
        const txMessage = buildEarningsTransactionMessage({
          actionLabel: "created",
          actorDisplay: formatUserDisplayName(actorEmpNum, actorName),
          targetDisplay: formatUserDisplayName(employeeNumber, targetName),
          earningTypeLabel: "CTO earnings",
          hoursValue: earnedHrs,
          periodYear: period_year,
          periodMonth: parseInt(period_month),
        });
        await insertTransactionLog(employeeNumber, txMessage, actorEmpNum);
      })();
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
              auditEarning(req, "approved cto earnings", "cto", parseInt(id), rec.earn_status, "approved", rec);
              (async () => {
                const actorEmpNum = getActorEmployeeNumber(req);
                const [actorName, targetName] = await Promise.all([
                  getEmployeeFullName(actorEmpNum),
                  getEmployeeFullName(rec.employee_number),
                ]);
                const txMessage = buildEarningsTransactionMessage({
                  actionLabel: "approved",
                  actorDisplay: formatUserDisplayName(actorEmpNum, actorName),
                  targetDisplay: formatUserDisplayName(rec.employee_number, targetName),
                  earningTypeLabel: "CTO earnings",
                  hoursValue: toNum(rec.earned_hours),
                  periodYear: rec.period_year,
                  periodMonth: rec.period_month,
                });
                await insertTransactionLog(rec.employee_number, txMessage, actorEmpNum);
              })();
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
          auditEarning(req, "rejected cto earnings", "cto", parseInt(id), oldStatus, "rejected", { ...rows[0], reason });
          (async () => {
            const actorEmpNum = getActorEmployeeNumber(req);
            const [actorName, targetName] = await Promise.all([
              getEmployeeFullName(actorEmpNum),
              getEmployeeFullName(rows[0].employee_number),
            ]);
            const txMessage = buildEarningsTransactionMessage({
              actionLabel: "rejected",
              actorDisplay: formatUserDisplayName(actorEmpNum, actorName),
              targetDisplay: formatUserDisplayName(rows[0].employee_number, targetName),
              earningTypeLabel: "CTO earnings",
              hoursValue: toNum(rows[0].earned_hours),
              periodYear: rows[0].period_year,
              periodMonth: rows[0].period_month,
            });
            await insertTransactionLog(rows[0].employee_number, txMessage, actorEmpNum);
          })();
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
          auditEarning(req, "deleted cto earnings", "cto", parseInt(id), rec.earn_status, null, rec);
          (async () => {
            const actorEmpNum = getActorEmployeeNumber(req);
            const [actorName, targetName] = await Promise.all([
              getEmployeeFullName(actorEmpNum),
              getEmployeeFullName(rec.employee_number),
            ]);
            const txMessage = buildEarningsTransactionMessage({
              actionLabel: "deleted",
              actorDisplay: formatUserDisplayName(actorEmpNum, actorName),
              targetDisplay: formatUserDisplayName(rec.employee_number, targetName),
              earningTypeLabel: "CTO earnings",
              hoursValue: toNum(rec.earned_hours),
              periodYear: rec.period_year,
              periodMonth: rec.period_month,
            });
            await insertTransactionLog(rec.employee_number, txMessage, actorEmpNum);
          })();
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