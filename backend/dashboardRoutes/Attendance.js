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
  targetEmployeeNumber = null
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
    }
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

// Endpoint to fetch attendance records
router.get('/api/attendance', authenticateToken, (req, res) => {
  const { personId, startDate, endDate } = req.query;
  const sql = `
    SELECT DISTINCT attendanceRecord.*, users.employeeNumber, users.username,
    users.employmentCategory, officialtime.*
    FROM attendanceRecord
    JOIN users ON attendanceRecord.personID = users.employeeNumber
    JOIN officialtime ON attendanceRecord.Day = officialtime.day
      AND attendanceRecord.personID = officialtime.employeeID
      AND attendanceRecord.date BETWEEN officialtime.startDate AND officialtime.endDate
    WHERE attendanceRecord.personID = ?
    AND attendanceRecord.date BETWEEN ? AND ?
  `;
  db.query(sql, [personId, startDate, endDate], (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).json({ error: 'Error fetching data' });
      return;
    }
    logAudit(
      req.user,
      'view',
      'Attendance Module',
      `${startDate} && ${endDate}`,
      personId
    );
    res.json(results);
  });
});

// Endpoint to check if attendance record exists
router.get('/api/check-attendance', authenticateToken, (req, res) => {
  const { personID, date } = req.query;
  const sql = `SELECT EXISTS(SELECT * FROM attendanceRecord WHERE personID = ? AND date = ?) AS exists`;
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
    const sql = `UPDATE attendanceRecord SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ? WHERE id = ?`;
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
            record.personID
          );
          resolve();
        }
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
        scope: 'attendanceRecord',
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
      'search',
      'Device Attendance Records',
      `${startDate} && ${endDate}`,
      personID
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

// NEW: Send to DTR Module endpoint
router.post('/api/send-to-dtr', authenticateToken, async (req, res) => {
  const { personID, startDate, endDate } = req.body;

  try {
    // Check if records exist in attendanceRecord table
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM attendanceRecord
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
      personID
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

// NEW: Bulk send to DTR for multiple users
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
        FROM attendanceRecord
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
          personID
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

// Endpoint to save attendance records (keep for manual saves if needed)
router.post('/api/save-attendance', authenticateToken, (req, res) => {
  const { records } = req.body;

  const promises = records.map((record) => {
    return new Promise((resolve, reject) => {
      const checkSql = `SELECT EXISTS(SELECT * FROM attendanceRecord WHERE personID = ? AND date = ?) AS recordExists`;
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
          const insertSql = `INSERT INTO attendanceRecord (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT) VALUES (?, ?, ?, ?, ?, ?, ?)`;
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
                record.personID
              );
              resolve({
                status: 'saved',
                personID: record.personID,
                date: record.date,
              });
            }
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
          scope: 'attendanceRecord',
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
      p.*,
      ot.officialTimeIN, ot.officialTimeOUT
    FROM attendanceRecord ar
    INNER JOIN person_table p ON ar.personID = p.agencyEmployeeNum
    INNER JOIN (
      SELECT day, MIN(officialTimeIN) AS officialTimeIN, MIN(officialTimeOUT) AS officialTimeOUT
      FROM officialtime
      GROUP BY day
    ) ot ON DAYNAME(ar.date) = ot.day
    WHERE ar.personID = ? AND ar.date BETWEEN ? AND ?
    ORDER BY ar.date ASC;
  `;

  db.query(query, [personID, startDate, endDate], (err, results) => {
    if (err) return res.status(500).send(err);
    logAudit(
      req.user,
      'view',
      'Overall DTR',
      `${startDate} && ${endDate}`,
      personID
    );
    res.send(results);
  });
});

// Update records
router.put('/api/view-attendance', authenticateToken, (req, res) => {
  const { records } = req.body;

  const updatePromises = records.map((record) => {
    const query = `
      UPDATE attendanceRecord
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

    return new Promise((resolve, reject) => {
      db.query(query, params, (err, result) => {
        if (err) reject(err);
        else {
          logAudit(
            req.user,
            'update',
            'Overall DTR',
            record.date,
            record.personID
          );
          resolve(result);
        }
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
      personID
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
  } = req.body;

  const query = `
    INSERT INTO overall_attendance_record (
      personID, startDate, endDate,
      totalRenderedTimeMorning, totalRenderedTimeMorningTardiness,
      totalRenderedTimeAfternoon, totalRenderedTimeAfternoonTardiness,
      totalRenderedHonorarium, totalRenderedHonorariumTardiness,
      totalRenderedServiceCredit, totalRenderedServiceCreditTardiness,
      totalRenderedOvertime, totalRenderedOvertimeTardiness,
      overallRenderedOfficialTime, overallRenderedOfficialTimeTardiness
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    ],
    (error, results) => {
      if (error) {
        console.error('Error inserting data:', error);
        return res.status(500).json({ message: 'Database error', error });
      }
      logAudit(
        req.user,
        'create',
        'Overall Attendance Record',
        `${startDate} && ${endDate}`,
        personID
      );
      notifyAttendanceChanged('overall-created', {
        scope: 'overall_attendance_record',
        personID,
        startDate,
        endDate,
      });
      res
        .status(201)
        .json({
          message: 'Attendance record saved successfully',
          data: results,
        });
    }
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
      'search',
      'Overall Attendance Record',
      `${startDate} && ${endDate}`,
      personID
    );
    res
      .status(200)
      .json({
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
    } = req.body;

    const { id } = req.params;

    const checkQuery = `SELECT * FROM overall_attendance_record WHERE personID = ? AND startDate = ? AND endDate = ? AND id != ?`;

    db.query(
      checkQuery,
      [personID, startDate, endDate, id],
      (checkError, checkResults) => {
        if (checkError) {
          return res
            .status(500)
            .json({
              message: 'Database error while checking for duplicates',
              error: checkError,
            });
        }

        if (checkResults.length > 0) {
          return res
            .status(400)
            .json({
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
      overallRenderedOfficialTime = ?, overallRenderedOfficialTimeTardiness = ?
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
            id,
          ],
          (error, results) => {
            if (error) {
              console.error(error);
              return res.status(500).json({ message: 'Database error', error });
            }
            logAudit(
              req.user,
              'update',
              'Overall Attendance Record',
              id,
              personID
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
          }
        );
      }
    );
  }
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
        return res
          .status(404)
          .send({
            message: 'Attendance record not found or personID mismatch',
          });
      }

      logAudit(req.user, 'delete', 'overall_attendance_record', id, personID);
      notifyAttendanceChanged('overall-deleted', {
        scope: 'overall_attendance_record',
        id,
        personID,
      });
      res.status(200).send({ message: 'Attendance entry deleted' });
    });
  }
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

  // Default to September 2025 if no month provided
  let startDate = '2025-09-01';
  let endDate = '2025-09-30';

  if (month) {
    // Parse month parameter (expected format: YYYY-MM)
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

// NEW: Get all unique PersonIDs from attendancerecordinfo (not just registered users)
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

// IMPROVED: Auto-save and fetch attendance records with better date handling
router.post('/api/all-attendance', authenticateToken, async (req, res) => {
  const { personID, startDate, endDate } = req.body;

  // Convert dates to timestamps (UTC)
  const startTimestamp = new Date(startDate + 'T00:00:00Z').getTime();
  const endTimestamp = new Date(endDate + 'T23:59:59Z').getTime();

  const query = `
    SELECT
      PersonID, PersonName,
      DATE_FORMAT(FROM_UNIXTIME(AttendanceDateTime/1000), '%Y-%m-%d') AS Date,
      MIN(CASE WHEN AttendanceState = 1 THEN AttendanceDateTime END) AS Time1,
      MIN(CASE WHEN AttendanceState = 2 THEN AttendanceDateTime END) AS Time2,
      MIN(CASE WHEN AttendanceState = 3 THEN AttendanceDateTime END) AS Time3,
      MAX(CASE WHEN AttendanceState = 4 THEN AttendanceDateTime END) AS Time4
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
        'search',
        'Device Attendance Records',
        `${startDate} && ${endDate}`,
        personID
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
      }));

      // AUTO-SAVE: Save records to attendanceRecord table
      try {
        let savedCount = 0;
        let updatedCount = 0;

        for (const record of records) {
          // Get existing record with all fields to compare
          const checkSql = `SELECT id, timeIN, breaktimeIN, breaktimeOUT, timeOUT, day FROM attendanceRecord WHERE personID = ? AND date = ?`;
          const existingRecord = await new Promise((resolve, reject) => {
            db.query(
              checkSql,
              [record.PersonID, record.Date],
              (err, result) => {
                if (err) reject(err);
                else resolve(result);
              }
            );
          });

          const newTimeIN = formatTime(record.Time1);
          const newBreaktimeIN = formatTime(record.Time3);
          const newBreaktimeOUT = formatTime(record.Time2);
          const newTimeOUT = formatTime(record.Time4);
          const newDay = getDayOfWeek(record.Date);

          if (existingRecord.length === 0) {
            // Insert new record if it doesn't exist
            const insertSql = `
            INSERT INTO attendanceRecord (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
            await new Promise((resolve, reject) => {
              db.query(
                insertSql,
                [
                  record.PersonID,
                  record.Date,
                  newDay,
                  newTimeIN,
                  newBreaktimeIN,
                  newBreaktimeOUT,
                  newTimeOUT,
                ],
                (err) => {
                  if (err) {
                    console.error('Error auto-saving record:', err);
                    reject(err);
                  } else {
                    logAudit(
                      req.user,
                      'auto-create',
                      'Device Attendance Auto-Save',
                      record.Date,
                      record.PersonID
                    );
                    savedCount++;
                    resolve();
                  }
                }
              );
            });
          } else {
            // Only UPDATE if there are actual changes
            const existing = existingRecord[0];
            const hasChanges =
              (existing.timeIN || 'N/A') !== (newTimeIN || 'N/A') ||
              (existing.breaktimeIN || 'N/A') !== (newBreaktimeIN || 'N/A') ||
              (existing.breaktimeOUT || 'N/A') !== (newBreaktimeOUT || 'N/A') ||
              (existing.timeOUT || 'N/A') !== (newTimeOUT || 'N/A') ||
              (existing.day || '') !== newDay;

            if (hasChanges) {
              const updateSql = `
              UPDATE attendanceRecord
              SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ?, day = ?
              WHERE personID = ? AND date = ?
            `;
              await new Promise((resolve, reject) => {
                db.query(
                  updateSql,
                  [
                    newTimeIN,
                    newBreaktimeIN,
                    newBreaktimeOUT,
                    newTimeOUT,
                    newDay,
                    record.PersonID,
                    record.Date,
                  ],
                  (err) => {
                    if (err) {
                      console.error('Error updating record:', err);
                      reject(err);
                    } else {
                      logAudit(
                        req.user,
                        'auto-update',
                        'Device Attendance Auto-Save',
                        record.Date,
                        record.PersonID
                      );
                      updatedCount++;
                      resolve();
                    }
                  }
                );
              });
            }
            // If no changes, skip update (no duplicate, no unnecessary write)
          }
        }

        if (savedCount > 0 || updatedCount > 0) {
          notifyAttendanceChanged('auto-sync', {
            scope: 'device-auto-save',
            personID,
            startDate,
            endDate,
            saved: savedCount,
            updated: updatedCount,
          });
        }
      } catch (saveError) {
        console.error('Error auto-saving records:', saveError);
        // Continue even if save fails
      }

      res.json(records);
    }
  );
});

// NEW: Bulk auto-save for all users in date range
router.post('/api/bulk-auto-save', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ error: 'Start date and end date are required' });
  }

  try {
    // Get all unique PersonIDs from device
    const getAllUsersQuery = `
      SELECT DISTINCT PersonID, PersonName
      FROM AttendanceRecordInfo
    `;

    const allUsers = await new Promise((resolve, reject) => {
      db.query(getAllUsersQuery, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Process each user
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
            MAX(CASE WHEN AttendanceState = 4 THEN AttendanceDateTime END) AS Time4
          FROM AttendanceRecordInfo
          WHERE PersonID = ? AND AttendanceDateTime BETWEEN ? AND ?
          GROUP BY Date, PersonID, PersonName
        `;

        const records = await new Promise((resolve, reject) => {
          db.query(
            query,
            [user.PersonID, startTimestamp, endTimestamp],
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
        });

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

        for (const record of records) {
          // Get existing record with all fields to compare
          const checkSql = `SELECT id, timeIN, breaktimeIN, breaktimeOUT, timeOUT, day FROM attendanceRecord WHERE personID = ? AND date = ?`;
          const existingRecord = await new Promise((resolve, reject) => {
            db.query(
              checkSql,
              [record.PersonID, record.Date],
              (err, result) => {
                if (err) reject(err);
                else resolve(result);
              }
            );
          });

          const newTimeIN = formatTime(convertToManilaTime(record.Time1));
          const newBreaktimeIN = formatTime(convertToManilaTime(record.Time3));
          const newBreaktimeOUT = formatTime(convertToManilaTime(record.Time2));
          const newTimeOUT = formatTime(convertToManilaTime(record.Time4));
          const newDay = getDayOfWeek(record.Date);

          if (existingRecord.length === 0) {
            // Insert new record if it doesn't exist
            const insertSql = `
              INSERT INTO attendanceRecord (personID, date, day, timeIN, breaktimeIN, breaktimeOUT, timeOUT)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            await new Promise((resolve, reject) => {
              db.query(
                insertSql,
                [
                  record.PersonID,
                  record.Date,
                  newDay,
                  newTimeIN,
                  newBreaktimeIN,
                  newBreaktimeOUT,
                  newTimeOUT,
                ],
                (err) => {
                  if (err) reject(err);
                  else {
                    savedCount++;
                    resolve();
                  }
                }
              );
            });
          } else {
            // Only UPDATE if there are actual changes
            const existing = existingRecord[0];
            const hasChanges =
              (existing.timeIN || 'N/A') !== (newTimeIN || 'N/A') ||
              (existing.breaktimeIN || 'N/A') !== (newBreaktimeIN || 'N/A') ||
              (existing.breaktimeOUT || 'N/A') !== (newBreaktimeOUT || 'N/A') ||
              (existing.timeOUT || 'N/A') !== (newTimeOUT || 'N/A') ||
              (existing.day || '') !== newDay;

            if (hasChanges) {
              const updateSql = `
                UPDATE attendanceRecord
                SET timeIN = ?, breaktimeIN = ?, breaktimeOUT = ?, timeOUT = ?, day = ?
                WHERE personID = ? AND date = ?
              `;
              await new Promise((resolve, reject) => {
                db.query(
                  updateSql,
                  [
                    newTimeIN,
                    newBreaktimeIN,
                    newBreaktimeOUT,
                    newTimeOUT,
                    newDay,
                    record.PersonID,
                    record.Date,
                  ],
                  (err) => {
                    if (err) reject(err);
                    else {
                      updatedCount++;
                      resolve();
                    }
                  }
                );
              });
            }
            // If no changes, skip update (no duplicate, no unnecessary write)
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user.PersonID}:`, userError);
        errorCount++;
      }
    }

    logAudit(
      req.user,
      'bulk-auto-save',
      'Device Attendance Records',
      `${startDate} && ${endDate}`,
      null
    );

    if (savedCount > 0 || updatedCount > 0) {
      notifyAttendanceChanged('bulk-auto-sync', {
        scope: 'device-bulk-auto-save',
        startDate,
        endDate,
        saved: savedCount,
        updated: updatedCount,
        errors: errorCount,
      });
    }

    res.json({
      success: true,
      message: `Processed ${allUsers.length} users: ${savedCount} new records saved, ${updatedCount} records updated${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      stats: {
        totalUsers: allUsers.length,
        saved: savedCount,
        updated: updatedCount,
        errors: errorCount,
      },
    });
  } catch (error) {
    console.error('Error in bulk auto-save:', error);
    res.status(500).json({ error: error.message });
  }
});

// DTR Print Status Tracking API Endpoints

// Get print status for multiple employees
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
  
  const values = employeeNumbers.map(empNum => [
    empNum, year, month, startDate, endDate, printedBy
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
    
    // Log audit trail
    logAudit(
      req.user,
      'print',
      'DTR',
      `${employeeNumbers.length} records for ${year}-${month}`,
      employeeNumbers.join(', ')
    );

    notifyAttendanceChanged('dtr-printed', {
      scope: 'dtr_print_history',
      employeeNumbers,
      year,
      month,
      startDate,
      endDate,
      printedBy,
    });
    
    res.json({ 
      success: true, 
      count: result.affectedRows,
      message: `Successfully marked ${employeeNumbers.length} DTR(s) as printed`
    });
  });
});

module.exports = router;
