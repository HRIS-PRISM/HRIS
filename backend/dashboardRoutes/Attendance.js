const db = require('../db');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { notifyAttendanceChanged } = require('../socket/socketService');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

function logAudit(
  user,
  action,
  tableName,
  recordId,
  targetEmployeeNumber = null,
) {
  const auditQuery = `
    INSERT INTO audit_log (employeeNumber, action, table_name, record_id, targetEmployeeNumber, timestamp)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  const employeeNumber =
    user && typeof user === 'object' && user.employeeNumber
      ? user.employeeNumber
      : user || null;

  db.query(
    auditQuery,
    [employeeNumber, action, tableName, recordId, targetEmployeeNumber],
    (err) => {
      if (err) {
        console.error('Error inserting audit log:', err);
      }
    },
  );
}

// Helper function to format time
const formatTime = (time) => {
  if (!time) return null;
  if (time.includes('AM') || time.includes('PM')) {
    const [hour, minute, second] = time.split(/[: ]/);
    const paddedHour = hour.padStart(2, '0');
    return `${paddedHour}:${minute}:${second} ${time.slice(-2)}`;
  }
  const [hour, minute, second] = time.split(':');
  const hour24 = parseInt(hour, 10);
  const hour12 = hour24 % 12 || 12;
  const ampm = hour24 < 12 ? 'AM' : 'PM';
  return `${String(hour12).padStart(2, '0')}:${minute}:${second} ${ampm}`;
};

// Helper function to get day of week
const getDayOfWeek = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// Helper function to parse time string to minutes for comparison
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[4]?.toUpperCase();

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

// Helper function to check if time falls within a range
const timeIsInRange = (attendanceTime, startTime, endTime) => {
  const attMinutes = parseTimeToMinutes(attendanceTime);
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (attMinutes === null || startMinutes === null || endMinutes === null) {
    return false;
  }

  if (endMinutes < startMinutes) {
    return attMinutes >= startMinutes || attMinutes <= endMinutes;
  }

  return attMinutes >= startMinutes && attMinutes <= endMinutes;
};

// Helper function to determine special type based on time and officialtime data
const determineSpecialType = (attendanceTime, officialTimeData) => {
  if (!attendanceTime || !officialTimeData) {
    return { type: 'UNCATEGORIZED', isSpecial: true };
  }

  if (
    officialTimeData.officialHonorariumTimeIN &&
    officialTimeData.officialHonorariumTimeOUT &&
    timeIsInRange(
      attendanceTime,
      officialTimeData.officialHonorariumTimeIN,
      officialTimeData.officialHonorariumTimeOUT,
    )
  ) {
    return { type: 'HONORARIUM', isSpecial: true };
  }

  if (
    officialTimeData.officialServiceCreditTimeIN &&
    officialTimeData.officialServiceCreditTimeOUT &&
    timeIsInRange(
      attendanceTime,
      officialTimeData.officialServiceCreditTimeIN,
      officialTimeData.officialServiceCreditTimeOUT,
    )
  ) {
    return { type: 'SERVICE', isSpecial: true };
  }

  if (
    officialTimeData.officialOverTimeIN &&
    officialTimeData.officialOverTimeOUT &&
    timeIsInRange(
      attendanceTime,
      officialTimeData.officialOverTimeIN,
      officialTimeData.officialOverTimeOUT,
    )
  ) {
    return { type: 'OVERTIME', isSpecial: true };
  }

  return { type: 'UNCATEGORIZED', isSpecial: true };
};

// Endpoint to fetch attendance records
router.get('/api/attendance', authenticateToken, (req, res) => {
  const { personId, startDate, endDate } = req.query;
  const sql = `
    SELECT DISTINCT attendancerecord.*, users.employeeNumber, users.username,
    users.employmentCategory, officialtime.*
    FROM attendancerecord
    JOIN users ON attendancerecord.personID = users.employeeNumber
    JOIN officialtime ON attendancerecord.Day = officialtime.day
      AND attendancerecord.personID = officialtime.employeeID
      AND attendancerecord.date BETWEEN officialtime.startDate AND officialtime.endDate
    WHERE attendancerecord.personID = ?
    AND attendancerecord.date BETWEEN ? AND ?
  `;
  db.query(sql, [personId, startDate, endDate], (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).json({ error: 'Error fetching data' });
      return;
    }

    // HR-approved leave days with no attendancerecord yet (no device row / sync not run):
    // expose one row per date using official time so attendance modules can display the day.
    const leaveGapSql = `
      SELECT
        lr.id AS leave_request_id,
        lr.employeeNumber,
        DATE_FORMAT(lr.leave_date, '%Y-%m-%d') AS leave_day,
        DAYNAME(lr.leave_date) AS dow,
        u.username,
        u.employmentCategory,
        ot.id AS ot_row_id,
        ot.employeeID,
        ot.day AS ot_day,
        ot.startDate AS ot_startDate,
        ot.endDate AS ot_endDate,
        ot.officialTimeIN,
        ot.officialTimeOUT,
        ot.officialBreaktimeIN,
        ot.officialBreaktimeOUT,
        ot.officialHonorariumTimeIN,
        ot.officialHonorariumTimeOUT,
        ot.officialServiceCreditTimeIN,
        ot.officialServiceCreditTimeOUT,
        ot.officialOverTimeIN,
        ot.officialOverTimeOUT
      FROM leave_request lr
      INNER JOIN users u
        ON CAST(u.employeeNumber AS CHAR) = CAST(lr.employeeNumber AS CHAR)
      INNER JOIN officialtime ot
        ON CAST(ot.employeeID AS CHAR) = CAST(lr.employeeNumber AS CHAR)
        AND ot.day = DAYNAME(lr.leave_date)
        AND lr.leave_date BETWEEN ot.startDate AND ot.endDate
        AND ot.id = (
          SELECT MAX(ot2.id)
          FROM officialtime ot2
          WHERE CAST(ot2.employeeID AS CHAR) = CAST(lr.employeeNumber AS CHAR)
            AND ot2.day = DAYNAME(lr.leave_date)
            AND lr.leave_date BETWEEN ot2.startDate AND ot2.endDate
        )
      WHERE lr.status = 2
        AND CAST(lr.employeeNumber AS CHAR) = CAST(? AS CHAR)
        AND lr.leave_date BETWEEN ? AND ?
        AND NOT EXISTS (
          SELECT 1 FROM attendancerecord ar
          WHERE CAST(ar.personID AS CHAR) = CAST(lr.employeeNumber AS CHAR)
            AND ar.date = DATE_FORMAT(lr.leave_date, '%Y-%m-%d')
        )
    `;

    db.query(leaveGapSql, [personId, startDate, endDate], (err2, leaveRows) => {
      if (err2) {
        console.error('Error fetching leave-only attendance rows:', err2);
        logAudit(
          req.user,
          `Viewed Attendance Records`,
          'Attendance Module (Non-Teaching/30hrs/40hrs)',
          `${startDate} to ${endDate}`,
          personId,
        );
        return res.json(results || []);
      }

      const normDate = (d) => {
        if (!d) return '';
        const s = String(d);
        return s.length >= 10 ? s.slice(0, 10) : s;
      };
      const seenDates = new Set((results || []).map((r) => normDate(r.date)));
      const extras = [];

      for (const r of leaveRows || []) {
        const d = r.leave_day;
        if (!d || seenDates.has(d)) continue;
        seenDates.add(d);
        extras.push({
          id: null,
          personID: String(r.employeeNumber),
          date: d,
          Day: r.dow,
          day: r.dow,
          timeIN: r.officialTimeIN,
          breaktimeIN: r.officialBreaktimeIN,
          breaktimeOUT: r.officialBreaktimeOUT,
          timeOUT: r.officialTimeOUT,
          specialType: null,
          specialTimeIN: null,
          specialTimeOUT: null,
          employeeNumber: r.employeeNumber,
          username: r.username,
          employmentCategory: r.employmentCategory,
          officialTimeIN: r.officialTimeIN,
          officialTimeOUT: r.officialTimeOUT,
          officialBreaktimeIN: r.officialBreaktimeIN,
          officialBreaktimeOUT: r.officialBreaktimeOUT,
          officialHonorariumTimeIN: r.officialHonorariumTimeIN,
          officialHonorariumTimeOUT: r.officialHonorariumTimeOUT,
          officialServiceCreditTimeIN: r.officialServiceCreditTimeIN,
          officialServiceCreditTimeOUT: r.officialServiceCreditTimeOUT,
          officialOverTimeIN: r.officialOverTimeIN,
          officialOverTimeOUT: r.officialOverTimeOUT,
          _syntheticLeaveDay: true,
        });
      }

      // Scheduled workdays in range with no attendancerecord row (no punch / not synced):
      // return official time only so modules can show full official tardiness.
      const scheduleGapSql = `
        WITH RECURSIVE date_series AS (
          SELECT CAST(? AS DATE) AS cal_date
          UNION ALL
          SELECT DATE_ADD(cal_date, INTERVAL 1 DAY)
          FROM date_series
          WHERE cal_date < CAST(? AS DATE)
        )
        SELECT
          DATE_FORMAT(ds.cal_date, '%Y-%m-%d') AS gap_date,
          DAYNAME(ds.cal_date) AS dow,
          u.employeeNumber,
          u.username,
          u.employmentCategory,
          ot.officialTimeIN,
          ot.officialTimeOUT,
          ot.officialBreaktimeIN,
          ot.officialBreaktimeOUT,
          ot.officialHonorariumTimeIN,
          ot.officialHonorariumTimeOUT,
          ot.officialServiceCreditTimeIN,
          ot.officialServiceCreditTimeOUT,
          ot.officialOverTimeIN,
          ot.officialOverTimeOUT
        FROM date_series ds
        INNER JOIN officialtime ot
          ON CAST(ot.employeeID AS CHAR) = CAST(? AS CHAR)
          AND ot.day = DAYNAME(ds.cal_date)
          AND ds.cal_date BETWEEN ot.startDate AND ot.endDate
          AND ot.id = (
            SELECT MAX(ot2.id)
            FROM officialtime ot2
            WHERE CAST(ot2.employeeID AS CHAR) = CAST(? AS CHAR)
              AND ot2.day = DAYNAME(ds.cal_date)
              AND ds.cal_date BETWEEN ot2.startDate AND ot2.endDate
          )
        INNER JOIN users u
          ON CAST(u.employeeNumber AS CHAR) = CAST(? AS CHAR)
        WHERE ds.cal_date BETWEEN ? AND ?
          AND NOT EXISTS (
            SELECT 1 FROM attendancerecord ar
            WHERE CAST(ar.personID AS CHAR) = CAST(? AS CHAR)
              AND ar.date = DATE_FORMAT(ds.cal_date, '%Y-%m-%d')
          )
          AND NOT EXISTS (
            SELECT 1 FROM leave_request lr
            WHERE lr.status = 2
              AND CAST(lr.employeeNumber AS CHAR) = CAST(? AS CHAR)
              AND DATE_FORMAT(lr.leave_date, '%Y-%m-%d') = DATE_FORMAT(ds.cal_date, '%Y-%m-%d')
          )
      `;

      const scheduleGapParams = [
        startDate,
        endDate,
        personId,
        personId,
        personId,
        startDate,
        endDate,
        personId,
        personId,
      ];

      db.query(scheduleGapSql, scheduleGapParams, (err3, scheduleRows) => {
        if (err3) {
          console.error('Error fetching schedule-only attendance rows:', err3);
        } else {
          for (const r of scheduleRows || []) {
            const d = r.gap_date;
            if (!d || seenDates.has(d)) continue;
            seenDates.add(d);
            extras.push({
              id: null,
              personID: String(r.employeeNumber),
              date: d,
              Day: r.dow,
              day: r.dow,
              timeIN: null,
              breaktimeIN: null,
              breaktimeOUT: null,
              timeOUT: null,
              specialType: null,
              specialTimeIN: null,
              specialTimeOUT: null,
              employeeNumber: r.employeeNumber,
              username: r.username,
              employmentCategory: r.employmentCategory,
              officialTimeIN: r.officialTimeIN,
              officialTimeOUT: r.officialTimeOUT,
              officialBreaktimeIN: r.officialBreaktimeIN,
              officialBreaktimeOUT: r.officialBreaktimeOUT,
              officialHonorariumTimeIN: r.officialHonorariumTimeIN,
              officialHonorariumTimeOUT: r.officialHonorariumTimeOUT,
              officialServiceCreditTimeIN: r.officialServiceCreditTimeIN,
              officialServiceCreditTimeOUT: r.officialServiceCreditTimeOUT,
              officialOverTimeIN: r.officialOverTimeIN,
              officialOverTimeOUT: r.officialOverTimeOUT,
              _syntheticNoRecordDay: true,
            });
          }
        }

        const merged = [...(results || []), ...extras].sort((a, b) =>
          normDate(a.date).localeCompare(normDate(b.date)),
        );

        logAudit(
          req.user,
          `Viewed Attendance Records`,
          'Attendance Module (Non-Teaching/30hrs/40hrs)',
          `${startDate} to ${endDate}`,
          personId,
        );
        res.json(merged);
      });
    });
  });
});

// Endpoint to check if attendance record exists
router.get('/api/check-attendance', authenticateToken, (req, res) => {
  const { personID, date } = req.query;
  const sql = `SELECT EXISTS(SELECT * FROM attendancerecord WHERE personID = ? AND date = ?) AS exists`;
  db.query(sql, [personID, date], (err, results) => {
    if (err) throw err;
    logAudit(req.user, 'search', 'attendance', date, personID);
    res.json(results[0]);
  });
});

// Endpoint to update attendance records
router.post('/api/update-attendance', authenticateToken, (req, res) => {
  const { records } = req.body;

  const promises = records.map((record) => {
    const sql = `UPDATE attendancerecord SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ? WHERE id = ?`;
    return new Promise((resolve, reject) => {
      db.query(
        sql,
        [
          record.timeIN,
          record.breaktimeIN,
          record.breaktimeOUT,
          record.timeOUT,
          record.id,
        ],
        (err) => {
          if (err) return reject(err);
          logAudit(
            req.user,
            'update',
            'Attendance Module',
            record.id,
            record.personID,
          );
          resolve();
        },
      );
    });
  });

  Promise.all(promises)
    .then(() => {
      const personIDs = Array.isArray(records)
        ? [...new Set(records.map((r) => r.personID).filter(Boolean))]
        : [];
      const recordIds = Array.isArray(records)
        ? records.map((r) => r.id).filter(Boolean)
        : [];

      notifyAttendanceChanged('updated', {
        scope: 'attendancerecord',
        personIDs,
        recordIds,
      });

      res.json({ message: 'Records updated successfully' });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// Additional endpoint for attendance with date filtering
router.post('/api/attendance', authenticateToken, (req, res) => {
  const { personID, startDate, endDate } = req.body;

  const query = `
    SELECT PersonID, AttendanceDateTime, AttendanceState
    FROM AttendanceRecordInfo
    WHERE PersonID = ?
    AND AttendanceDateTime BETWEEN ? AND ?`;

  const startTimestamp = new Date(startDate).getTime();
  const endTimestamp = new Date(endDate).getTime();

  db.query(query, [personID, startTimestamp, endTimestamp], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    logAudit(
      req.user,
      `Searched Attendance Record State`,
      'Attendance State',
      `${startDate} to ${endDate}`,
      personID,
    );

    const records = results.map((record) => {
      const date = new Date(record.AttendanceDateTime);
      const options = {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      };
      const manilaDate = date.toLocaleString('en-PH', options);

      return {
        PersonID: record.PersonID,
        Date: manilaDate.split(',')[0],
        Time: manilaDate.split(',')[1].trim(),
        AttendanceState: record.AttendanceState,
      };
    });

    res.json(records);
  });
});

// Send to DTR Module endpoint
router.post('/api/send-to-dtr', authenticateToken, async (req, res) => {
  const { personID, startDate, endDate } = req.body;

  try {
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM attendancerecord
      WHERE personID = ? AND date BETWEEN ? AND ?
    `;

    const recordCount = await new Promise((resolve, reject) => {
      db.query(checkQuery, [personID, startDate, endDate], (err, result) => {
        if (err) reject(err);
        else resolve(result[0].count);
      });
    });

    if (recordCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance records found for this period',
      });
    }

    logAudit(
      req.user,
      'send-to-dtr',
      'Device Attendance Records',
      `${startDate} && ${endDate}`,
      personID,
    );

    res.json({
      success: true,
      message: `Successfully prepared ${recordCount} records for DTR viewing`,
      recordCount,
    });
  } catch (error) {
    console.error('Error sending to DTR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk send to DTR for multiple users
router.post('/api/bulk-send-to-dtr', authenticateToken, async (req, res) => {
  const { userIDs, startDate, endDate } = req.body;

  if (!Array.isArray(userIDs) || userIDs.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: 'No users selected' });
  }

  try {
    const results = [];

    for (const personID of userIDs) {
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM attendancerecord
        WHERE personID = ? AND date BETWEEN ? AND ?
      `;

      const recordCount = await new Promise((resolve, reject) => {
        db.query(checkQuery, [personID, startDate, endDate], (err, result) => {
          if (err) reject(err);
          else resolve(result[0].count);
        });
      });

      results.push({
        personID,
        recordCount,
        success: recordCount > 0,
      });

      if (recordCount > 0) {
        logAudit(
          req.user,
          'bulk-send-to-dtr',
          'Device Attendance Records',
          `${startDate} && ${endDate}`,
          personID,
        );
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalRecords = results.reduce((sum, r) => sum + r.recordCount, 0);

    res.json({
      success: true,
      message: `Successfully prepared DTR for ${successCount} users with ${totalRecords} total records`,
      results,
    });
  } catch (error) {
    console.error('Error bulk sending to DTR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to save attendance records
router.post('/api/save-attendance', authenticateToken, (req, res) => {
  const { records } = req.body;

  const promises = records.map((record) => {
    return new Promise((resolve, reject) => {
      const checkSql = `SELECT EXISTS(SELECT * FROM attendancerecord WHERE personID = ? AND date = ?) AS recordExists`;
      db.query(checkSql, [record.personID, record.date], (err, checkResult) => {
        if (err) return reject(err);

        const exists = checkResult[0].recordExists;
        if (exists) {
          resolve({
            status: 'exists',
            personID: record.personID,
            date: record.date,
          });
        } else {
          const insertSql = `INSERT INTO attendancerecord (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT) VALUES (?, ?, ?, ?, ?, ?, ?)`;
          db.query(
            insertSql,
            [
              record.personID,
              record.date,
              record.Day,
              record.timeIN,
              record.breaktimeIN,
              record.breaktimeOUT,
              record.timeOUT,
            ],
            (err) => {
              if (err) return reject(err);
              logAudit(
                req.user,
                'create',
                'Attendance Management',
                record.date,
                record.personID,
              );
              resolve({
                status: 'saved',
                personID: record.personID,
                date: record.date,
              });
            },
          );
        }
      });
    });
  });

  Promise.all(promises)
    .then((results) => {
      const saved = Array.isArray(results)
        ? results.filter((r) => r && r.status === 'saved')
        : [];

      if (saved.length > 0) {
        notifyAttendanceChanged('created', {
          scope: 'attendancerecord',
          personIDs: [...new Set(saved.map((r) => r.personID).filter(Boolean))],
          dates: [...new Set(saved.map((r) => r.date).filter(Boolean))],
        });
      }

      res.json(results);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// Fetch records
router.post('/api/view-attendance', authenticateToken, (req, res) => {
  const { personID, startDate, endDate } = req.body;

  const query = `
    SELECT
      ar.personID,
      ar.date,
      DAYNAME(ar.date) AS Day,
      ar.timeIN, ar.breaktimeIN, ar.breaktimeOUT, ar.timeOUT,
      ar.specialType, ar.specialTimeIN, ar.specialTimeOUT,
      p.*,
      ot.officialTimeIN,
      ot.officialTimeOUT,
      ot.officialBreaktimeIN,
      ot.officialBreaktimeOUT,
      ot.officialHonorariumTimeIN,
      ot.officialHonorariumTimeOUT,
      ot.officialServiceCreditTimeIN,
      ot.officialServiceCreditTimeOUT,
      ot.officialOverTimeIN,
      ot.officialOverTimeOUT,
      CASE
        WHEN ari_daily.PersonID IS NULL THEN 1
        ELSE 0
      END AS manualEntry
    FROM attendancerecord ar
    INNER JOIN person_table p ON ar.personID = p.agencyEmployeeNum
    LEFT JOIN (
      SELECT
        PersonID,
        DATE(FROM_UNIXTIME(AttendanceDateTime / 1000)) AS attDate
      FROM AttendanceRecordInfo
      WHERE PersonID = ?
        AND AttendanceDateTime >= UNIX_TIMESTAMP(?) * 1000
        AND AttendanceDateTime < UNIX_TIMESTAMP(DATE_ADD(?, INTERVAL 1 DAY)) * 1000
      GROUP BY PersonID, DATE(FROM_UNIXTIME(AttendanceDateTime / 1000))
    ) ari_daily ON ari_daily.PersonID = ar.personID AND ari_daily.attDate = ar.date
    LEFT JOIN officialtime ot ON DAYNAME(ar.date) = ot.day
      AND ar.personID = ot.employeeID
      AND ar.date BETWEEN ot.startDate AND ot.endDate
    WHERE ar.personID = ? AND ar.date BETWEEN ? AND ?
    ORDER BY ar.date ASC;
  `;

  db.query(query, [personID, startDate, endDate, personID, startDate, endDate], (err, results) => {
    if (err) return res.status(500).send(err);
    logAudit(
      req.user,
      `Viewed DTR Records`,
      'Daily Time Record Overall',
      `${startDate} to ${endDate}`,
      personID,
    );
    res.send(results);
  });
});

// ─── OPTIMIZED: Lightweight employee list for instant table render ────────────
// Returns only names/IDs — no time columns, no officialtime join.
// Runs ~5-10x faster than the full query.
router.get('/api/dtr-employee-list', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  const query = `
    SELECT DISTINCT
      ar.personID,
      p.firstName,
      p.lastName,
      p.middleName,
      CASE
        WHEN p.agencyEmployeeNum IS NOT NULL THEN 'Registered'
        ELSE 'Not Registered'
      END AS registrationStatus,
      ari_names.PersonName AS devicePersonName
    FROM attendancerecord ar
    LEFT JOIN person_table p
      ON ar.personID = p.agencyEmployeeNum
    LEFT JOIN (
      SELECT PersonID, MAX(PersonName) AS PersonName
      FROM attendancerecordinfo
      GROUP BY PersonID
    ) ari_names ON ar.personID = ari_names.PersonID
    WHERE ar.date BETWEEN ? AND ?
    ORDER BY
      CASE WHEN p.lastName IS NULL THEN 1 ELSE 0 END,
      p.lastName  ASC,
      p.firstName ASC,
      ar.personID ASC
  `;

  db.query(query, [startDate, endDate], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    logAudit(
      req.user,
      'Viewed DTR Employee List',
      'Daily Time Record Overall',
      `${startDate} to ${endDate}`,
      'all-users',
    );

    res.json(results);
  });
});

// ─── OPTIMIZED: Paginated attendance — 30 employees at a time ────────────────
// Returns attendance rows for one page of employees.
// body: { startDate, endDate, page (1-based), pageSize (default 30) }
router.post('/api/view-attendance-all-users-paged', authenticateToken, (req, res) => {
  const { startDate, endDate, page = 1, pageSize = 30 } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  const offset = (page - 1) * pageSize;

  // Step 1: fast count of distinct employees
  const countQuery = `
    SELECT COUNT(DISTINCT ar.personID) AS total
    FROM attendancerecord ar
    WHERE ar.date BETWEEN ? AND ?
  `;

  db.query(countQuery, [startDate, endDate], (countErr, countResult) => {
    if (countErr) {
      console.error('Count query error:', countErr);
      return res.status(500).json({ error: countErr.message });
    }

    const total      = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    if (total === 0) {
      return res.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
    }

    // Step 2: get attendance rows for just this page's employees
    const pageQuery = `
      WITH ranked_employees AS (
        SELECT DISTINCT
          ar.personID,
          p.lastName,
          p.firstName
        FROM attendancerecord ar
        LEFT JOIN person_table p ON ar.personID = p.agencyEmployeeNum
        WHERE ar.date BETWEEN ? AND ?
        ORDER BY
          CASE WHEN p.lastName IS NULL THEN 1 ELSE 0 END,
          p.lastName  ASC,
          p.firstName ASC,
          ar.personID ASC
        LIMIT ? OFFSET ?
      )
      SELECT
        ar.personID,
        ar.date,
        DAYNAME(ar.date)                AS Day,
        ar.timeIN, ar.breaktimeIN, ar.breaktimeOUT, ar.timeOUT,
        ar.specialType, ar.specialTimeIN, ar.specialTimeOUT,
        p.firstName, p.lastName, p.middleName,
        p.agencyEmployeeNum,
        ot.officialTimeIN,
        ot.officialTimeOUT,
        ot.officialBreaktimeIN,
        ot.officialBreaktimeOUT,
        ot.officialHonorariumTimeIN,
        ot.officialHonorariumTimeOUT,
        ot.officialServiceCreditTimeIN,
        ot.officialServiceCreditTimeOUT,
        ot.officialOverTimeIN,
        ot.officialOverTimeOUT,
        CASE
          WHEN p.agencyEmployeeNum IS NOT NULL THEN 'Registered'
          ELSE 'Not Registered'
        END AS registrationStatus,
        ari_names.PersonName AS devicePersonName
      FROM ranked_employees re
      JOIN attendancerecord ar
        ON ar.personID = re.personID
       AND ar.date BETWEEN ? AND ?
      LEFT JOIN person_table p
        ON ar.personID = p.agencyEmployeeNum
      LEFT JOIN officialtime ot
        ON DAYNAME(ar.date) = ot.day
       AND ar.personID      = ot.employeeID
       AND ar.date BETWEEN ot.startDate AND ot.endDate
      LEFT JOIN (
        SELECT PersonID, MAX(PersonName) AS PersonName
        FROM attendancerecordinfo
        GROUP BY PersonID
      ) ari_names ON ar.personID = ari_names.PersonID
      ORDER BY
        CASE WHEN p.lastName IS NULL THEN 1 ELSE 0 END,
        p.lastName  ASC,
        p.firstName ASC,
        ar.personID ASC,
        ar.date     ASC
    `;

    db.query(
      pageQuery,
      [startDate, endDate, pageSize, offset, startDate, endDate],
      (err, results) => {
        if (err) {
          console.error('Page query error:', err);
          return res.status(500).json({ error: err.message });
        }

        logAudit(
          req.user,
          `Viewed DTR Records (paged ${page}/${totalPages})`,
          'Daily Time Record Overall',
          `${startDate} to ${endDate}`,
          'all-users',
        );

        res.json({ data: results, total, page, pageSize, totalPages });
      },
    );
  });
});

// Get all attendance records for date range (original — kept for compatibility)
router.post('/api/view-attendance-all-users', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ error: 'Start date and end date are required' });
  }

  const query = `
    SELECT
      ar.personID,
      ar.date,
      DAYNAME(ar.date) AS Day,
      ar.timeIN, ar.breaktimeIN, ar.breaktimeOUT, ar.timeOUT,
      ar.specialType, ar.specialTimeIN, ar.specialTimeOUT,
      p.*,
      ot.officialTimeIN,
      ot.officialTimeOUT,
      ot.officialBreaktimeIN,
      ot.officialBreaktimeOUT,
      ot.officialHonorariumTimeIN,
      ot.officialHonorariumTimeOUT,
      ot.officialServiceCreditTimeIN,
      ot.officialServiceCreditTimeOUT,
      ot.officialOverTimeIN,
      ot.officialOverTimeOUT,
      CASE 
        WHEN p.agencyEmployeeNum IS NOT NULL THEN 'Registered'
        ELSE 'Not Registered'
      END AS registrationStatus,
      ari_names.PersonName as devicePersonName
    FROM attendancerecord ar
    LEFT JOIN person_table p ON ar.personID = p.agencyEmployeeNum
    LEFT JOIN officialtime ot ON DAYNAME(ar.date) = ot.day
      AND ar.personID = ot.employeeID
      AND ar.date BETWEEN ot.startDate AND ot.endDate
    LEFT JOIN (
      SELECT PersonID, MAX(PersonName) as PersonName
      FROM attendancerecordinfo
      GROUP BY PersonID
    ) ari_names ON ar.personID = ari_names.PersonID
    WHERE ar.date BETWEEN ? AND ?
    ORDER BY 
      CASE WHEN p.lastName IS NULL THEN 1 ELSE 0 END,
      p.lastName ASC, 
      p.firstName ASC, 
      ar.personID ASC,
      ar.date ASC;
  `;

  db.query(query, [startDate, endDate], (err, results) => {
    if (err) {
      console.error('Error fetching attendance records for all users:', err);
      return res.status(500).send(err);
    }

    logAudit(
      req.user,
      `Viewed DTR Records - All Users`,
      'Daily Time Record Overall',
      `${startDate} to ${endDate}`,
      'all-users',
    );

    res.send(results);
  });
});

// Update records
router.put('/api/view-attendance', authenticateToken, (req, res) => {
  const { records } = req.body;

  const updatePromises = records.map((record) => {
    const fetchQuery = `
      SELECT timeIN, breaktimeIN, breaktimeOUT, timeOUT
      FROM attendancerecord
      WHERE personID = ? AND date = ?
    `;

    return new Promise((resolve, reject) => {
      db.query(fetchQuery, [record.personID, record.date], (fetchErr, existing) => {
        if (fetchErr) return reject(fetchErr);

        const old = existing[0] || {};
        const normalize = (val) => (val == null ? '' : String(val).trim());

        const fields = [
          { key: 'timeIN',       label: 'Time IN'       },
          { key: 'breaktimeIN',  label: 'Breaktime IN'  },
          { key: 'breaktimeOUT', label: 'Breaktime OUT' },
          { key: 'timeOUT',      label: 'Time OUT'      },
        ];

        const changes = fields
          .filter(({ key }) => normalize(old[key]) !== normalize(record[key]))
          .map(({ key, label }) =>
            `${label}: [${normalize(old[key]) || 'empty'} → ${normalize(record[key]) || 'empty'}]`
          )
          .join(' | ');

        const hasChanged = changes.length > 0;

        const updateQuery = `
          UPDATE attendancerecord
          SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ?
          WHERE personID = ? AND date = ?
        `;

        const params = [
          record.timeIN,
          record.breaktimeIN,
          record.breaktimeOUT,
          record.timeOUT,
          record.personID,
          record.date,
        ];

        db.query(updateQuery, params, (updateErr, result) => {
          if (updateErr) return reject(updateErr);

          if (hasChanged) {
            logAudit(
              req.user,
              `Updated Attendance Record | ${record.date} | ${changes}`,
              'Attendance Modification',
              record.date,
              record.personID,
            );
          }

          resolve(result);
        });
      });
    });
  });

  Promise.all(updatePromises)
    .then(() => res.send({ message: 'Records updated successfully.' }))
    .catch((err) => res.status(500).send(err));
});

// GET API for fetching attendance records
router.get('/api/dtr', authenticateToken, (req, res) => {
  const { personID, startDate, endDate } = req.query;

  if (!personID || !startDate || !endDate) {
    return res
      .status(400)
      .json({ error: 'Missing required query parameters.' });
  }

  const query = `
    SELECT
      id, date, personID, time
    FROM
      attendancerecord
    WHERE
      personID = ? AND date BETWEEN ? AND ?
  `;

  db.query(query, [personID, startDate, endDate], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Database query failed.' });
    }
    logAudit(
      req.user,
      'view',
      'attendancerecord',
      `${startDate} && ${endDate}`,
      personID,
    );
    res.json(results);
  });
});

// Insert overall attendance record
router.post('/api/overall_attendance', authenticateToken, (req, res) => {
  const {
    personID,
    startDate,
    endDate,
    totalRenderedTimeMorning,
    totalRenderedTimeMorningTardiness,
    totalRenderedTimeAfternoon,
    totalRenderedTimeAfternoonTardiness,
    totalRenderedHonorarium,
    totalRenderedHonorariumTardiness,
    totalRenderedServiceCredit,
    totalRenderedServiceCreditTardiness,
    totalRenderedOvertime,
    totalRenderedOvertimeTardiness,
    overallRenderedOfficialTime,
    overallRenderedOfficialTimeTardiness,
    overallTotalOfficialSchedule,
  } = req.body;

  const query = `
    INSERT INTO overall_attendance_record (
      personID, startDate, endDate,
      totalRenderedTimeMorning, totalRenderedTimeMorningTardiness,
      totalRenderedTimeAfternoon, totalRenderedTimeAfternoonTardiness,
      totalRenderedHonorarium, totalRenderedHonorariumTardiness,
      totalRenderedServiceCredit, totalRenderedServiceCreditTardiness,
      totalRenderedOvertime, totalRenderedOvertimeTardiness,
      overallRenderedOfficialTime, overallRenderedOfficialTimeTardiness,
      overallTotalOfficialSchedule
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      personID,
      startDate,
      endDate,
      totalRenderedTimeMorning,
      totalRenderedTimeMorningTardiness,
      totalRenderedTimeAfternoon,
      totalRenderedTimeAfternoonTardiness,
      totalRenderedHonorarium,
      totalRenderedHonorariumTardiness,
      totalRenderedServiceCredit,
      totalRenderedServiceCreditTardiness,
      totalRenderedOvertime,
      totalRenderedOvertimeTardiness,
      overallRenderedOfficialTime,
      overallRenderedOfficialTimeTardiness,
      overallTotalOfficialSchedule,
    ],
    (error, results) => {
      if (error) {
        console.error('Error inserting data:', error);
        return res.status(500).json({ message: 'Database error', error });
      }
      logAudit(
        req.user,
        `Saved Overall Attendance Record`,
        'Attendance Module (Non-Teaching/30hrs/40hrs)',
        `${startDate} to ${endDate}`,
        personID,
      );
      notifyAttendanceChanged('overall-created', {
        scope: 'overall_attendance_record',
        personID,
        startDate,
        endDate,
      });
      res.status(201).json({
        message: 'Attendance record saved successfully',
        data: results,
      });
    },
  );
});

// Fetch overall attendance record
router.get('/api/overall_attendance_record', authenticateToken, (req, res) => {
  const { personID, startDate, endDate } = req.query;

  const query = `
    SELECT
      overall_attendance_record.*,
      department_assignment.code
    FROM
      overall_attendance_record
    LEFT JOIN
      department_assignment
    ON
      department_assignment.employeeNumber = overall_attendance_record.personID
    WHERE
      overall_attendance_record.personID = ?
      AND overall_attendance_record.startDate >= ?
      AND overall_attendance_record.endDate <= ?
  `;

  db.query(query, [personID, startDate, endDate], (error, results) => {
    if (error) {
      console.error('Error Fetching data:', error);
      return res.status(500).json({ message: 'Database error', error });
    }
    logAudit(
      req.user,
      `Search Overall Attendance Record`,
      'Attendance Summary',
      `${startDate} to ${endDate}`,
      personID,
    );
    res.status(200).json({
      message: 'Overall attendance record fetched successfully',
      data: results,
    });
  });
});

// Update overall attendance record
router.put(
  '/api/overall_attendance_record/:id',
  authenticateToken,
  (req, res) => {
    const {
      personID,
      startDate,
      endDate,
      totalRenderedTimeMorning,
      totalRenderedTimeMorningTardiness,
      totalRenderedTimeAfternoon,
      totalRenderedTimeAfternoonTardiness,
      totalRenderedHonorarium,
      totalRenderedHonorariumTardiness,
      totalRenderedServiceCredit,
      totalRenderedServiceCreditTardiness,
      totalRenderedOvertime,
      totalRenderedOvertimeTardiness,
      overallRenderedOfficialTime,
      overallRenderedOfficialTimeTardiness,
      overallTotalOfficialSchedule,
    } = req.body;

    const { id } = req.params;

    const checkQuery = `SELECT * FROM overall_attendance_record WHERE personID = ? AND startDate = ? AND endDate = ? AND id != ?`;

    db.query(
      checkQuery,
      [personID, startDate, endDate, id],
      (checkError, checkResults) => {
        if (checkError) {
          return res.status(500).json({
            message: 'Database error while checking for duplicates',
            error: checkError,
          });
        }

        if (checkResults.length > 0) {
          return res.status(400).json({
            message:
              'Duplicate record found with the same personID, startDate, and endDate',
          });
        }

        const query = `
      UPDATE overall_attendance_record SET
      personID = ?, startDate = ?, endDate = ?,
      totalRenderedTimeMorning = ?, totalRenderedTimeMorningTardiness = ?,
      totalRenderedTimeAfternoon = ?, totalRenderedTimeAfternoonTardiness = ?,
      totalRenderedHonorarium = ?, totalRenderedHonorariumTardiness = ?,
      totalRenderedServiceCredit = ?, totalRenderedServiceCreditTardiness = ?,
      totalRenderedOvertime = ?, totalRenderedOvertimeTardiness = ?,
      overallRenderedOfficialTime = ?, overallRenderedOfficialTimeTardiness = ?,
      overallTotalOfficialSchedule = ?
      WHERE id = ?
    `;

        db.query(
          query,
          [
            personID,
            startDate,
            endDate,
            totalRenderedTimeMorning,
            totalRenderedTimeMorningTardiness,
            totalRenderedTimeAfternoon,
            totalRenderedTimeAfternoonTardiness,
            totalRenderedHonorarium,
            totalRenderedHonorariumTardiness,
            totalRenderedServiceCredit,
            totalRenderedServiceCreditTardiness,
            totalRenderedOvertime,
            totalRenderedOvertimeTardiness,
            overallRenderedOfficialTime,
            overallRenderedOfficialTimeTardiness,
            overallTotalOfficialSchedule,
            id,
          ],
          (error, results) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ message: 'Database error', error });
            }
            logAudit(
              req.user,
              `Updated Overall Attendance Record`,
              'AttendanceSummary',
              `${startDate} to ${endDate}`,
              personID,
            );
            notifyAttendanceChanged('overall-updated', {
              scope: 'overall_attendance_record',
              id,
              personID,
              startDate,
              endDate,
            });
            res
              .status(200)
              .json({ message: 'Record updated successfully', data: results });
          },
        );
      },
    );
  },
);

// Delete overall attendance record
router.delete(
  '/api/overall_attendance_record/:id/:personID',
  authenticateToken,
  (req, res) => {
    const { id, personID } = req.params;

    const query = `DELETE FROM overall_attendance_record WHERE id = ? AND personID = ?`;

    db.query(query, [id, personID], (err, result) => {
      if (err) {
        console.error('Error deleting attendance entry:', err);
        return res.status(500).send({ message: 'Internal Server Error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).send({
          message: 'Attendance record not found or personID mismatch',
        });
      }
      logAudit(
        req.user,
        `Deleted Overall Attendance Record`,
        'AttendanceSummary',
        id,
        personID,
      );
      notifyAttendanceChanged('overall-deleted', {
        scope: 'overall_attendance_record',
        id,
        personID,
      });
      res.status(200).send({ message: 'Attendance entry deleted' });
    });
  },
);

// fetch audit logs
router.get('/api/audit-log', (req, res) => {
  const sql = `SELECT * FROM audit_log ORDER BY timestamp DESC`;
  db.query(sql, (err, results) => {
    if (err)
      return res.status(500).json({ error: 'Error fetching audit logs' });
    res.json(results);
  });
});

// GET TIME IN TIME OUT FOR PERIOD
router.post('/api/attendance-records', authenticateToken, (req, res) => {
  const { personID, startDate, endDate } = req.body;

  if (!personID || !startDate || !endDate) {
    return res
      .status(400)
      .json({ error: 'personID, startDate, and endDate are required' });
  }

  const sql = `
    SELECT
      id, personID, date, Day,
      timeIN, breaktimeIN, breaktimeOUT, timeOUT
    FROM attendancerecord
    WHERE personID = ?
      AND date >= ?
      AND date <= ?
    ORDER BY date ASC
  `;

  db.query(sql, [personID, startDate, endDate], (err, result) => {
    if (err) {
      console.error('Error fetching attendance records:', err);
      return res
        .status(500)
        .json({ message: 'Error fetching attendance records' });
    }
    res.json(result);
  });
});

// GET /attendance/monthly - Monthly attendance statistics
router.get('/attendance/monthly', authenticateToken, (req, res) => {
  const { month } = req.query;

  let startDate = '2025-09-01';
  let endDate = '2025-09-30';

  if (month) {
    const [year, monthNum] = month.split('-');
    const lastDay = new Date(year, monthNum, 0).getDate();
    startDate = `${year}-${monthNum}-01`;
    endDate = `${year}-${monthNum}-${lastDay}`;
  }

  const sql = `
    SELECT DATE(Date) as day, COUNT(DISTINCT PersonID) as present
    FROM AttendanceRecordInfo
    WHERE AttendanceState = 1
      AND Date BETWEEN ? AND ?
    GROUP BY DATE(Date)
    ORDER BY day ASC
  `;

  db.query(sql, [startDate, endDate], (err, results) => {
    if (err) {
      console.error('Error fetching monthly attendance:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get all unique PersonIDs from attendancerecordinfo
router.get('/api/all-device-users', authenticateToken, (req, res) => {
  const query = `
    SELECT DISTINCT
      PersonID,
      PersonName,
      MIN(AttendanceDateTime) as firstSeen,
      MAX(AttendanceDateTime) as lastSeen
    FROM AttendanceRecordInfo
    GROUP BY PersonID, PersonName
    ORDER BY PersonName ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching device users:', err);
      return res.status(500).json({ error: err.message });
    }

    logAudit(req.user, 'view', 'Device Users List', null, null);
    res.json(results);
  });
});

// Auto-save and fetch attendance records
// When syncDeviceToRecords is false, only returns device-derived rows + DB special fields
// without INSERT/UPDATE on attendancerecord (avoids overwriting manual edits from Attendance Modification).
router.post('/api/all-attendance', authenticateToken, async (req, res) => {
  const { personID, startDate, endDate } = req.body;
  const syncDeviceToRecords = req.body.syncDeviceToRecords !== false;

  const startTimestamp = new Date(startDate + 'T00:00:00Z').getTime();
  const endTimestamp = new Date(endDate + 'T23:59:59Z').getTime();

  const query = `
    SELECT
      PersonID, PersonName,
      DATE_FORMAT(FROM_UNIXTIME(AttendanceDateTime/1000), '%Y-%m-%d') AS Date,
      MIN(CASE WHEN AttendanceState = 1 THEN AttendanceDateTime END) AS Time1,
      MIN(CASE WHEN AttendanceState = 2 THEN AttendanceDateTime END) AS Time2,
      MIN(CASE WHEN AttendanceState = 3 THEN AttendanceDateTime END) AS Time3,
      MAX(CASE WHEN AttendanceState = 4 THEN AttendanceDateTime END) AS Time4,
      MIN(CASE WHEN AttendanceState = 5 THEN AttendanceDateTime END) AS Time5,
      MAX(CASE WHEN AttendanceState = 6 THEN AttendanceDateTime END) AS Time6
    FROM AttendanceRecordInfo
    WHERE PersonID = ? AND AttendanceDateTime BETWEEN ? AND ?
    GROUP BY Date, PersonID, PersonName
    ORDER BY Date ASC
  `;

  db.query(
    query,
    [personID, startTimestamp, endTimestamp],
    async (err, results) => {
      if (err) {
        console.error('Error fetching attendance:', err);
        return res.status(500).json({ error: err.message });
      }

      logAudit(
        req.user,
        `Searched Attendance Device Records`,
        'Attendance Device',
        `${startDate} to ${endDate}`,
        personID,
      );

      const convertToManilaTime = (timestamp) => {
        if (!timestamp) return null;
        const date = new Date(timestamp);
        return date.toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      };

      const records = results.map((record) => ({
        PersonID: record.PersonID,
        PersonName: record.PersonName,
        Date: record.Date,
        Time1: convertToManilaTime(record.Time1),
        Time2: convertToManilaTime(record.Time2),
        Time3: convertToManilaTime(record.Time3),
        Time4: convertToManilaTime(record.Time4),
        Time5: convertToManilaTime(record.Time5),
        Time6: convertToManilaTime(record.Time6),
      }));

      let savedCount = 0;
      let updatedCount = 0;

      try {
        if (syncDeviceToRecords) {
          for (const record of records) {
            const officialTimeQuery = `
            SELECT 
              officialTimeIN, officialTimeOUT,
              officialBreaktimeIN, officialBreaktimeOUT,
              officialHonorariumTimeIN, officialHonorariumTimeOUT,
              officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
              officialOverTimeIN, officialOverTimeOUT
            FROM officialtime
            WHERE employeeID = ? 
              AND DAYNAME(?) = day
              AND ? BETWEEN startDate AND endDate
          `;

            const officialTimeData = await new Promise((resolve, reject) => {
              db.query(
                officialTimeQuery,
                [record.PersonID, record.Date, record.Date],
                (err, result) => {
                  if (err) reject(err);
                  else resolve(result[0] || null);
                },
              );
            });

            const checkSql = `SELECT id, timeIN, breaktimeIN, breaktimeOUT, timeOUT, specialType, specialTimeIN, specialTimeOUT, day FROM attendancerecord WHERE personID = ? AND date = ?`;
            const existingRecord = await new Promise((resolve, reject) => {
              db.query(
                checkSql,
                [record.PersonID, record.Date],
                (err, result) => {
                  if (err) reject(err);
                  else resolve(result);
                },
              );
            });

            const newTimeIN = formatTime(record.Time1);
            const newBreaktimeIN = formatTime(record.Time3);
            const newBreaktimeOUT = formatTime(record.Time2);
            const newTimeOUT = formatTime(record.Time4);
            const newDay = getDayOfWeek(record.Date);

            let specialType = null;
            let specialTimeIN = null;
            let specialTimeOUT = null;

            if (record.Time5 || record.Time6) {
              const specialTime = record.Time5 || record.Time6;
              const specialResult = determineSpecialType(specialTime, officialTimeData);
              specialType = specialResult.type;
              specialTimeIN = record.Time5 ? formatTime(record.Time5) : null;
              specialTimeOUT = record.Time6 ? formatTime(record.Time6) : null;
            }

            if (existingRecord.length === 0) {
              const insertSql = `
              INSERT INTO attendancerecord 
              (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT, specialType, specialTimeIN, specialTimeOUT)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
              await new Promise((resolve, reject) => {
                db.query(
                  insertSql,
                  [
                    record.PersonID, record.Date, newDay,
                    newTimeIN, newBreaktimeIN, newBreaktimeOUT, newTimeOUT,
                    specialType, specialTimeIN, specialTimeOUT,
                  ],
                  (err) => {
                    if (err) { console.error('Error auto-saving record:', err); reject(err); }
                    else {
                      logAudit(req.user, `Auto-Saved New Attendance Record`, 'Attendance Device', record.Date, record.PersonID);
                      savedCount++;
                      resolve();
                    }
                  },
                );
              });
            } else {
              const existing = existingRecord[0];
              const hasChanges =
              (existing.timeIN || 'N/A') !== (newTimeIN || 'N/A') ||
              (existing.breaktimeIN || 'N/A') !== (newBreaktimeIN || 'N/A') ||
              (existing.breaktimeOUT || 'N/A') !== (newBreaktimeOUT || 'N/A') ||
              (existing.timeOUT || 'N/A') !== (newTimeOUT || 'N/A') ||
              (existing.specialType || null) !== (specialType || null) ||
              (existing.specialTimeIN || null) !== (specialTimeIN || null) ||
              (existing.specialTimeOUT || null) !== (specialTimeOUT || null) ||
              (existing.day || '') !== newDay;

              if (hasChanges) {
                const updateSql = `
                UPDATE attendancerecord
                SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ?, 
                    specialType = ?, specialTimeIN = ?, specialTimeOUT = ?, day = ?
                WHERE personID = ? AND date = ?
              `;
                await new Promise((resolve, reject) => {
                  db.query(
                    updateSql,
                    [
                      newTimeIN, newBreaktimeIN, newBreaktimeOUT, newTimeOUT,
                      specialType, specialTimeIN, specialTimeOUT, newDay,
                      record.PersonID, record.Date,
                    ],
                    (err) => {
                      if (err) { console.error('Error updating record:', err); reject(err); }
                      else {
                        logAudit(req.user, `Auto-Updated Existing Attendance Record`, 'Attendance Device', record.Date, record.PersonID);
                        updatedCount++;
                        resolve();
                      }
                    },
                  );
                });
              }
            }
          }

          if (savedCount > 0 || updatedCount > 0) {
            notifyAttendanceChanged('auto-sync', {
              scope: 'device-auto-save',
              personID, startDate, endDate,
              saved: savedCount, updated: updatedCount,
            });
          }
        }
      } catch (saveError) {
        console.error('Error auto-saving records:', saveError);
      }

      const normYmd = (d) => {
        if (!d) return '';
        if (d instanceof Date && !Number.isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
        const s = String(d);
        return s.length >= 10 ? s.slice(0, 10) : s;
      };

      let enrichedRecords = records;
      if (records.length > 0) {
        const uniqueDates = [
          ...new Set(
            records.map((r) => normYmd(r.Date)).filter(Boolean),
          ),
        ];
        const specialByDate = {};
        if (uniqueDates.length > 0) {
          await new Promise((resolve, reject) => {
            const placeholders = uniqueDates.map(() => '?').join(',');
            const batchSql = `
              SELECT date, specialType, specialTimeIN, specialTimeOUT
              FROM attendancerecord
              WHERE personID = ? AND date IN (${placeholders})
            `;
            db.query(
              batchSql,
              [personID, ...uniqueDates],
              (err, rows) => {
                if (err) return reject(err);
                for (const row of rows || []) {
                  const key = normYmd(row.date);
                  if (key) specialByDate[key] = row;
                }
                resolve();
              },
            );
          });
        }
        enrichedRecords = records.map((record) => {
          const key = normYmd(record.Date);
          const specialData = key ? specialByDate[key] : null;
          return {
            ...record,
            specialType: specialData?.specialType || null,
            savedSpecialTimeIN: specialData?.specialTimeIN || null,
            savedSpecialTimeOUT: specialData?.specialTimeOUT || null,
          };
        });
      }

      res.json(enrichedRecords);
    },
  );
});

// Bulk auto-save for all users in date range
router.post('/api/bulk-auto-save', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  try {
    const getAllUsersQuery = `SELECT DISTINCT PersonID, PersonName FROM AttendanceRecordInfo`;

    const allUsers = await new Promise((resolve, reject) => {
      db.query(getAllUsersQuery, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
      try {
        const startTimestamp = new Date(startDate + 'T00:00:00Z').getTime();
        const endTimestamp = new Date(endDate + 'T23:59:59Z').getTime();

        const query = `
          SELECT
            PersonID, PersonName,
            DATE_FORMAT(FROM_UNIXTIME(AttendanceDateTime/1000), '%Y-%m-%d') AS Date,
            MIN(CASE WHEN AttendanceState = 1 THEN AttendanceDateTime END) AS Time1,
            MIN(CASE WHEN AttendanceState = 2 THEN AttendanceDateTime END) AS Time2,
            MIN(CASE WHEN AttendanceState = 3 THEN AttendanceDateTime END) AS Time3,
            MAX(CASE WHEN AttendanceState = 4 THEN AttendanceDateTime END) AS Time4,
            MIN(CASE WHEN AttendanceState = 5 THEN AttendanceDateTime END) AS Time5,
            MAX(CASE WHEN AttendanceState = 6 THEN AttendanceDateTime END) AS Time6
          FROM AttendanceRecordInfo
          WHERE PersonID = ? AND AttendanceDateTime BETWEEN ? AND ?
          GROUP BY Date, PersonID, PersonName
        `;

        const records = await new Promise((resolve, reject) => {
          db.query(query, [user.PersonID, startTimestamp, endTimestamp], (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        const convertToManilaTime = (timestamp) => {
          if (!timestamp) return null;
          const date = new Date(timestamp);
          return date.toLocaleString('en-PH', {
            timeZone: 'Asia/Manila',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
          });
        };

        for (const record of records) {
          const officialTimeQuery = `
            SELECT 
              officialTimeIN, officialTimeOUT,
              officialBreaktimeIN, officialBreaktimeOUT,
              officialHonorariumTimeIN, officialHonorariumTimeOUT,
              officialServiceCreditTimeIN, officialServiceCreditTimeOUT,
              officialOverTimeIN, officialOverTimeOUT
            FROM officialtime
            WHERE employeeID = ? 
              AND DAYNAME(?) = day
              AND ? BETWEEN startDate AND endDate
          `;

          const officialTimeData = await new Promise((resolve, reject) => {
            db.query(officialTimeQuery, [record.PersonID, record.Date, record.Date], (err, result) => {
              if (err) reject(err);
              else resolve(result[0] || null);
            });
          });

          const checkSql = `SELECT id, timeIN, breaktimeIN, breaktimeOUT, timeOUT, specialType, specialTimeIN, specialTimeOUT, day FROM attendancerecord WHERE personID = ? AND date = ?`;
          const existingRecord = await new Promise((resolve, reject) => {
            db.query(checkSql, [record.PersonID, record.Date], (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          });

          const newTimeIN = formatTime(convertToManilaTime(record.Time1));
          const newBreaktimeIN = formatTime(convertToManilaTime(record.Time3));
          const newBreaktimeOUT = formatTime(convertToManilaTime(record.Time2));
          const newTimeOUT = formatTime(convertToManilaTime(record.Time4));
          const newDay = getDayOfWeek(record.Date);

          let specialType = null;
          let specialTimeIN = null;
          let specialTimeOUT = null;

          if (record.Time5 || record.Time6) {
            const specialTime = convertToManilaTime(record.Time5 || record.Time6);
            const specialResult = determineSpecialType(specialTime, officialTimeData);
            specialType = specialResult.type;
            specialTimeIN = record.Time5 ? formatTime(convertToManilaTime(record.Time5)) : null;
            specialTimeOUT = record.Time6 ? formatTime(convertToManilaTime(record.Time6)) : null;
          }

          if (existingRecord.length === 0) {
            const insertSql = `
              INSERT INTO attendancerecord (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT, specialType, specialTimeIN, specialTimeOUT)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await new Promise((resolve, reject) => {
              db.query(
                insertSql,
                [record.PersonID, record.Date, newDay, newTimeIN, newBreaktimeIN, newBreaktimeOUT, newTimeOUT, specialType, specialTimeIN, specialTimeOUT],
                (err) => { if (err) reject(err); else { savedCount++; resolve(); } },
              );
            });
          } else {
            const existing = existingRecord[0];
            const hasChanges =
              (existing.timeIN || 'N/A') !== (newTimeIN || 'N/A') ||
              (existing.breaktimeIN || 'N/A') !== (newBreaktimeIN || 'N/A') ||
              (existing.breaktimeOUT || 'N/A') !== (newBreaktimeOUT || 'N/A') ||
              (existing.timeOUT || 'N/A') !== (newTimeOUT || 'N/A') ||
              (existing.specialType || null) !== (specialType || null) ||
              (existing.specialTimeIN || null) !== (specialTimeIN || null) ||
              (existing.specialTimeOUT || null) !== (specialTimeOUT || null) ||
              (existing.day || '') !== newDay;

            if (hasChanges) {
              const updateSql = `
                UPDATE attendancerecord
                SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ?, 
                    specialType = ?, specialTimeIN = ?, specialTimeOUT = ?, day = ?
                WHERE personID = ? AND date = ?
              `;
              await new Promise((resolve, reject) => {
                db.query(
                  updateSql,
                  [newTimeIN, newBreaktimeIN, newBreaktimeOUT, newTimeOUT, specialType, specialTimeIN, specialTimeOUT, newDay, record.PersonID, record.Date],
                  (err) => { if (err) reject(err); else { updatedCount++; resolve(); } },
                );
              });
            }
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user.PersonID}:`, userError);
        errorCount++;
      }
    }

    logAudit(req.user, 'bulk-auto-save', 'Device Attendance Records', `${startDate} && ${endDate}`, null);

    if (savedCount > 0 || updatedCount > 0) {
      notifyAttendanceChanged('bulk-auto-sync', {
        scope: 'device-bulk-auto-save',
        startDate, endDate,
        saved: savedCount, updated: updatedCount, errors: errorCount,
      });
    }

    res.json({
      success: true,
      message: `Processed ${allUsers.length} users: ${savedCount} new records saved, ${updatedCount} records updated${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      stats: { totalUsers: allUsers.length, saved: savedCount, updated: updatedCount, errors: errorCount },
    });
  } catch (error) {
    console.error('Error in bulk auto-save:', error);
    res.status(500).json({ error: error.message });
  }
});

// DTR Print Status — get print status for multiple employees
router.post('/api/dtr-print-status', authenticateToken, async (req, res) => {
  const { employeeNumbers, year, month } = req.body;

  if (!employeeNumbers || !Array.isArray(employeeNumbers) || employeeNumbers.length === 0) {
    return res.status(400).json({ error: 'employeeNumbers array is required' });
  }

  if (!year || !month) {
    return res.status(400).json({ error: 'year and month are required' });
  }

  const query = `
    SELECT employee_number, year, month, printed_at, printed_by
    FROM dtr_print_history
    WHERE employee_number IN (?) AND year = ? AND month = ?
  `;

  db.query(query, [employeeNumbers, year, month], (err, results) => {
    if (err) {
      console.error('Error fetching print status:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Mark DTRs as printed
router.post('/api/mark-dtr-printed', authenticateToken, async (req, res) => {
  const { employeeNumbers, year, month, startDate, endDate } = req.body;

  if (!employeeNumbers || !Array.isArray(employeeNumbers) || employeeNumbers.length === 0) {
    return res.status(400).json({ error: 'employeeNumbers array is required' });
  }

  if (!year || !month || !startDate || !endDate) {
    return res.status(400).json({ error: 'year, month, startDate, and endDate are required' });
  }

  const printedBy = req.user.employeeNumber || req.user.username;

  const values = employeeNumbers.map((empNum) => [
    empNum, year, month, startDate, endDate, printedBy,
  ]);

  const query = `
    INSERT INTO dtr_print_history 
    (employee_number, year, month, start_date, end_date, printed_by)
    VALUES ?
    ON DUPLICATE KEY UPDATE 
      printed_at = CURRENT_TIMESTAMP,
      printed_by = VALUES(printed_by),
      start_date = VALUES(start_date),
      end_date = VALUES(end_date)
  `;

  db.query(query, [values], (err, result) => {
    if (err) {
      console.error('Error marking DTRs as printed:', err);
      return res.status(500).json({ error: err.message });
    }

    logAudit(
      req.user,
      `Printed DTR Records`,
      'Daily Time Record Overall',
      `${startDate} to ${endDate}`,
      employeeNumbers.join(', '),
    );

    notifyAttendanceChanged('dtr-printed', {
      scope: 'dtr_print_history',
      employeeNumbers, year, month, startDate, endDate, printedBy,
    });

    res.json({
      success: true,
      count: result.affectedRows,
      message: `Successfully marked ${employeeNumbers.length} DTR(s) as printed`,
    });
  });
});

// Get suspensions within date range
router.get('/api/suspensions', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  const query = `
    SELECT id, title, reason, date, date_start, date_end, image
    FROM suspensions
    WHERE
      (date IS NOT NULL AND date BETWEEN ? AND ?)
      OR
      (date_start IS NOT NULL AND date_end IS NOT NULL AND date_start <= ? AND date_end >= ?)
  `;

  const params = [startDate, endDate, endDate, startDate];

  db.query(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching holidays:', err);
      return res.status(500).json({ error: err.message });
    }

    const byDate = {};

    const toISO = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const classify = (title = '', reason = '') => {
      const t = `${title} ${reason}`.toLowerCase();
      if (t.includes('work') && t.includes('susp')) return 'WORK SUSPENDED';
      if (t.includes('susp')) return 'WORK SUSPENDED';
      return 'ON LEAVE';
    };

    (rows || []).forEach((r) => {
      const single = toISO(r.date);
      const start = toISO(r.date_start);
      const end = toISO(r.date_end);
      const label = classify(r.title, r.reason);

      if (start && end) {
        let cur = new Date(start);
        const last = new Date(end);
        while (cur <= last) {
          const key = cur.toISOString().slice(0, 10);
          if (!byDate[key]) byDate[key] = { label, title: r.title, reason: r.reason, id: r.id };
          cur.setDate(cur.getDate() + 1);
        }
      } else if (single) {
        if (!byDate[single]) byDate[single] = { label, title: r.title, reason: r.reason, id: r.id };
      }
    });

    const requestedBy = req.user?.employeeNumber || req.user?.username || 'unknown';
    logAudit(req.user, 'view', 'SUSPENSIONS', `range ${startDate} to ${endDate}`, requestedBy);
    notifyAttendanceChanged('suspensions-fetched', { scope: 'suspensions', startDate, endDate, requestedBy });

    return res.json({ success: true, count: Object.keys(byDate).length, byDate });
  });
});

// Get approved leaves within date range (optionally scoped to one employee for attendance UI)
router.get('/api/leaves', authenticateToken, (req, res) => {
  const { startDate, endDate, personId, employeeNumber } = req.query;
  const employeeKey = String(personId || employeeNumber || '').trim();

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  let leaveQuery = `
    SELECT lr.id, lr.leave_date, lt.leave_description
    FROM leave_request lr
    JOIN leave_table lt ON lr.leave_code = lt.leave_code
    WHERE lr.status = 2
    AND lr.leave_date BETWEEN ? AND ?
  `;
  const leaveParams = [startDate, endDate];
  if (employeeKey) {
    leaveQuery += ' AND lr.employeeNumber = ?';
    leaveParams.push(employeeKey);
  }

  db.query(leaveQuery, leaveParams, (err, rows) => {
    if (err) {
      console.error('Error fetching leaves:', err);
      return res.status(500).json({ error: err.message });
    }

    const toISO = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    const byDate = {};
    (rows || []).forEach((leave) => {
      const leaveDate = toISO(leave.leave_date);
      if (!leaveDate || byDate[leaveDate]) return;
      byDate[leaveDate] = { label: 'ON LEAVE', title: leave.leave_description, reason: 'Approved Leave', id: leave.id };
    });

    const requestedBy = req.user?.employeeNumber || req.user?.username || 'unknown';
    const scopeNote = employeeKey ? ` employee ${employeeKey}` : '';
    logAudit(req.user, 'view', 'LEAVES', `range ${startDate} to ${endDate}${scopeNote}`, requestedBy);
    notifyAttendanceChanged('leaves-fetched', { scope: 'leaves', startDate, endDate, personId: employeeKey || undefined, requestedBy });

    return res.json({ success: true, count: Object.keys(byDate).length, byDate });
  });
});

// Get holidays within date range
router.get('/api/holiday', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  const query = `
    SELECT id, title, about, description, date, date_start, date_end, image
    FROM holiday
    WHERE
      (date IS NOT NULL AND date BETWEEN ? AND ?)
      OR
      (date_start IS NOT NULL AND date_end IS NOT NULL AND date_start <= ? AND date_end >= ?)
  `;

  const params = [startDate, endDate, endDate, startDate];

  db.query(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching suspensions:', err);
      return res.status(500).json({ error: err.message });
    }

    const byDate = {};

    const toISO = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    (rows || []).forEach((r) => {
      const single = toISO(r.date);
      const start = toISO(r.date_start);
      const end = toISO(r.date_end);
      const label = 'HOLIDAY';
      const reason = r.about || r.description || 'Holiday';

      if (start && end) {
        let cur = new Date(start);
        const last = new Date(end);
        while (cur <= last) {
          const key = cur.toISOString().slice(0, 10);
          if (!byDate[key]) byDate[key] = { label, title: r.title, reason, id: r.id };
          cur.setDate(cur.getDate() + 1);
        }
      } else if (single) {
        if (!byDate[single]) byDate[single] = { label, title: r.title, reason, id: r.id };
      }
    });

    const requestedBy = req.user?.employeeNumber || req.user?.username || 'unknown';
    logAudit(req.user, 'view', 'HOLIDAYS', `range ${startDate} to ${endDate}`, requestedBy);
    notifyAttendanceChanged('holidays-fetched', { scope: 'holiday', startDate, endDate, requestedBy });

    return res.json({ success: true, count: Object.keys(byDate).length, byDate });
  });
});

// Fetch ALL days in range (including days with no record)
router.post('/api/view-attendance-full', authenticateToken, (req, res) => {
  const { personID, startDate, endDate } = req.body;

  if (!personID || !startDate || !endDate) {
    return res.status(400).json({ error: 'personID, startDate, endDate are required.' });
  }

  const query = `
    WITH RECURSIVE date_series AS (
      SELECT CAST(? AS DATE) AS cal_date
      UNION ALL
      SELECT DATE_ADD(cal_date, INTERVAL 1 DAY)
      FROM   date_series
      WHERE  cal_date < CAST(? AS DATE)
    )
    SELECT
      ? AS personID,
      DATE_FORMAT(ds.cal_date, '%Y-%m-%d')  AS date,
      DAYNAME(ds.cal_date)                   AS Day,
      ar.id          AS recordId,
      ar.timeIN, ar.breaktimeIN, ar.breaktimeOUT, ar.timeOUT,
      ar.specialType, ar.specialTimeIN, ar.specialTimeOUT,
      p.firstName, p.lastName, p.middleName, p.agencyEmployeeNum,
      ot.officialTimeIN, ot.officialTimeOUT,
      ot.officialBreaktimeIN, ot.officialBreaktimeOUT,
      ot.officialHonorariumTimeIN, ot.officialHonorariumTimeOUT,
      ot.officialServiceCreditTimeIN, ot.officialServiceCreditTimeOUT,
      ot.officialOverTimeIN, ot.officialOverTimeOUT
    FROM date_series ds
    LEFT JOIN person_table p   ON p.agencyEmployeeNum = ?
    LEFT JOIN attendancerecord ar ON ar.personID = ? AND ar.date = DATE_FORMAT(ds.cal_date, '%Y-%m-%d')
    LEFT JOIN officialtime ot
           ON ot.employeeID = ?
          AND ot.day        = DAYNAME(ds.cal_date)
          AND ds.cal_date   BETWEEN ot.startDate AND ot.endDate
    ORDER BY ds.cal_date ASC;
  `;

  db.query(
    query,
    [startDate, endDate, personID, personID, personID, personID],
    (err, results) => {
      if (err) {
        console.error('view-attendance-full error:', err);
        return res.status(500).json({ error: err.message });
      }

      logAudit(
        req.user,
        'Viewed Full-Month Attendance (all days)',
        'Attendance Modification – Full View',
        `${startDate} to ${endDate}`,
        personID,
      );

      const tagged = results.map((row) => ({
        ...row,
        isNew:       row.recordId == null,
        timeIN:       row.timeIN       ?? '',
        breaktimeIN:  row.breaktimeIN  ?? '',
        breaktimeOUT: row.breaktimeOUT ?? '',
        timeOUT:      row.timeOUT      ?? '',
      }));

      res.json(tagged);
    },
  );
});

// Upsert full-month records
router.put('/api/view-attendance-full', authenticateToken, async (req, res) => {
  const { records } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records array is required.' });
  }

  const isEmpty = (v) => !v || String(v).trim() === '';

  try {
    let inserted = 0, updated = 0, skipped = 0;

    for (const record of records) {
      const allEmpty =
        isEmpty(record.timeIN) && isEmpty(record.breaktimeIN) &&
        isEmpty(record.breaktimeOUT) && isEmpty(record.timeOUT);

      if (record.isNew) {
        if (allEmpty) { skipped++; continue; }

        const checkSql = `SELECT id FROM attendancerecord WHERE personID = ? AND date = ? LIMIT 1`;
        const existing = await new Promise((resolve, reject) => {
          db.query(checkSql, [record.personID, record.date], (err, rows) => {
            if (err) reject(err); else resolve(rows[0] ?? null);
          });
        });

        if (existing) {
          const updateSql = `UPDATE attendancerecord SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ? WHERE id = ?`;
          await new Promise((resolve, reject) => {
            db.query(updateSql, [record.timeIN || null, record.breaktimeIN || null, record.breaktimeOUT || null, record.timeOUT || null, existing.id], (err) => { if (err) reject(err); else resolve(); });
          });
          updated++;
          logAudit(req.user, `Updated Attendance Record (full-month, race-condition) | ${record.date}`, 'Attendance Modification – Full View', record.date, record.personID);
        } else {
          const insertSql = `INSERT INTO attendancerecord (personID, date, Day, timeIN, breaktimeIN, breaktimeOUT, timeOUT) VALUES (?, ?, ?, ?, ?, ?, ?)`;
          await new Promise((resolve, reject) => {
            db.query(insertSql, [record.personID, record.date, record.Day, record.timeIN || null, record.breaktimeIN || null, record.breaktimeOUT || null, record.timeOUT || null], (err) => { if (err) reject(err); else resolve(); });
          });
          inserted++;
          logAudit(req.user, `Inserted New Attendance Record (full-month) | ${record.date}`, 'Attendance Modification – Full View', record.date, record.personID);
        }
      } else {
        const fetchSql = `SELECT timeIN, breaktimeIN, breaktimeOUT, timeOUT FROM attendancerecord WHERE personID = ? AND date = ?`;
        const oldRow = await new Promise((resolve, reject) => {
          db.query(fetchSql, [record.personID, record.date], (err, rows) => {
            if (err) reject(err); else resolve(rows[0] ?? {});
          });
        });

        const normalize = (v) => (v == null ? '' : String(v).trim());
        const fields = [
          { key: 'timeIN', label: 'Time IN' }, { key: 'breaktimeIN', label: 'Breaktime IN' },
          { key: 'breaktimeOUT', label: 'Breaktime OUT' }, { key: 'timeOUT', label: 'Time OUT' },
        ];
        const diff = fields
          .filter(({ key }) => normalize(oldRow[key]) !== normalize(record[key]))
          .map(({ key, label }) => `${label}: [${normalize(oldRow[key]) || 'empty'} → ${normalize(record[key]) || 'empty'}]`)
          .join(' | ');

        const updateSql = `UPDATE attendancerecord SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ? WHERE personID = ? AND date = ?`;
        await new Promise((resolve, reject) => {
          db.query(updateSql, [record.timeIN || null, record.breaktimeIN || null, record.breaktimeOUT || null, record.timeOUT || null, record.personID, record.date], (err) => { if (err) reject(err); else resolve(); });
        });
        updated++;

        if (diff) {
          logAudit(req.user, `Updated Attendance Record (full-month) | ${record.date} | ${diff}`, 'Attendance Modification – Full View', record.date, record.personID);
        }
      }
    }

    const personIDs = [...new Set(records.map((r) => r.personID).filter(Boolean))];
    notifyAttendanceChanged('full-month-updated', { scope: 'attendancerecord', personIDs, inserted, updated });

    res.json({ message: `Saved successfully. ${inserted} inserted, ${updated} updated, ${skipped} skipped.`, inserted, updated, skipped });
  } catch (err) {
    console.error('view-attendance-full PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;