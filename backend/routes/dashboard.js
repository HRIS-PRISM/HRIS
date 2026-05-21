const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET Dashboard Statistics
router.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {};

    // Total Employees
    const [employeeCount] = await db
      .promise()
      .query(
        'SELECT COUNT(DISTINCT agencyEmployeeNum) as total FROM person_table WHERE agencyEmployeeNum IS NOT NULL'
      );
    stats.totalEmployees = employeeCount[0].total;

    // Active Users (those who have logged in)
    const [activeUsers] = await db
      .promise()
      .query('SELECT COUNT(*) as total FROM users WHERE role != "admin"');
    stats.activeUsers = activeUsers[0].total;

    // Today's Attendance (Time In records for today)
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const [attendanceToday] = await db
      .promise()
      .query(
        'SELECT COUNT(DISTINCT PersonID) as total FROM attendancerecordinfo WHERE AttendanceState = 1 AND AttendanceDateTime BETWEEN ? AND ?',
        [todayStart, todayEnd]
      );
    stats.presentToday = attendanceToday[0].total;

    // Pending Leave Requests (checking both 'pending' and 'Pending')
    const [pendingLeaves] = await db
      .promise()
      .query(
        'SELECT COUNT(*) as total FROM leave_request WHERE LOWER(status) = "pending"'
      );
    stats.pendingLeaves = pendingLeaves[0]?.total || 0;

    // Departments Count
    const [departments] = await db
      .promise()
      .query('SELECT COUNT(*) as total FROM department_table');
    stats.totalDepartments = departments[0].total;

    // Active Announcements (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [announcements] = await db
      .promise()
      .query('SELECT COUNT(*) as total FROM announcements WHERE date >= ?', [
        thirtyDaysAgo.toISOString().split('T')[0],
      ]);
    stats.recentAnnouncements = announcements[0].total;

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get Attendance Overview (for charts)
router.get(
  '/api/dashboard/attendance-overview',
  authenticateToken,
  async (req, res) => {
    try {
      const { days = 7 } = req.query; // Default to 7 days
      const data = [];

      for (let i = parseInt(days) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayStart = new Date(dateStr).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        const [result] = await db
          .promise()
          .query(
            'SELECT COUNT(DISTINCT PersonID) as count FROM attendancerecordinfo WHERE AttendanceState = 1 AND AttendanceDateTime BETWEEN ? AND ?',
            [dayStart, dayEnd]
          );

        data.push({
          date: dateStr,
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          present: result[0].count,
        });
      }

      res.json(data);
    } catch (error) {
      console.error('Error fetching attendance overview:', error);
      res.status(500).json({ error: 'Failed to fetch attendance overview' });
    }
  }
);

// Get Department Distribution
router.get(
  '/api/dashboard/department-distribution',
  authenticateToken,
  async (req, res) => {
    try {
      const [results] = await db.promise().query(`
      SELECT 
        dt.description as department,
        dt.code,
        COUNT(DISTINCT da.employeeNumber) as employeeCount
      FROM department_table dt
      LEFT JOIN department_assignment da ON dt.code = da.code
      GROUP BY dt.code, dt.description
      ORDER BY employeeCount DESC
    `);

      res.json(results);
    } catch (error) {
      console.error('Error fetching department distribution:', error);
      res
        .status(500)
        .json({ error: 'Failed to fetch department distribution' });
    }
  }
);

// Get Leave Statistics
router.get('/api/dashboard/leave-stats', authenticateToken, async (req, res) => {
  try {
    const [pending] = await db
      .promise()
      .query(
        'SELECT COUNT(*) as count FROM leave_request WHERE LOWER(status) = "pending"'
      );

    const [approved] = await db
      .promise()
      .query(
        'SELECT COUNT(*) as count FROM leave_request WHERE LOWER(status) = "approved"'
      );

    const [rejected] = await db
      .promise()
      .query(
        'SELECT COUNT(*) as count FROM leave_request WHERE LOWER(status) = "rejected"'
      );

    const stats = {
      pending: pending[0]?.count || 0,
      approved: approved[0]?.count || 0,
      rejected: rejected[0]?.count || 0,
      total:
        (pending[0]?.count || 0) +
        (approved[0]?.count || 0) +
        (rejected[0]?.count || 0),
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching leave stats:', error);
    res.status(500).json({ error: 'Failed to fetch leave statistics' });
  }
});

// Get Recent Activities (Audit Log Summary)
router.get(
  '/api/dashboard/recent-activities',
  authenticateToken,
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const [activities] = await db.promise().query(
        `
      SELECT 
        al.action,
        al.table_name,
        al.timestamp,
        al.employeeNumber,
        CONCAT(pt.firstName, ' ', COALESCE(pt.lastName, '')) as userName
      FROM audit_log al
      LEFT JOIN person_table pt ON al.employeeNumber = pt.agencyEmployeeNum
      ORDER BY al.timestamp DESC
      LIMIT ?
    `,
        [parseInt(limit)]
      );

      res.json(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      res.status(500).json({ error: 'Failed to fetch recent activities' });
    }
  }
);

// Get Payroll Summary
router.get(
  '/api/dashboard/payroll-summary',
  authenticateToken,
  async (req, res) => {
    try {
      const [totalProcessed] = await db
        .promise()
        .query(
          'SELECT COUNT(*) as count FROM payroll_processing WHERE status = 1'
        );

      const [totalPending] = await db
        .promise()
        .query(
          'SELECT COUNT(*) as count FROM payroll_processing WHERE status = 0'
        );

      const [latestPayroll] = await db.promise().query(`
      SELECT startDate, endDate, COUNT(*) as employeeCount 
      FROM payroll_processing 
      GROUP BY startDate, endDate 
      ORDER BY startDate DESC 
      LIMIT 1
    `);

      const summary = {
        processed: totalProcessed[0]?.count || 0,
        pending: totalPending[0]?.count || 0,
        latestPeriod: latestPayroll[0] || null,
      };

      res.json(summary);
    } catch (error) {
      console.error('Error fetching payroll summary:', error);
      res.status(500).json({ error: 'Failed to fetch payroll summary' });
    }
  }
);

// Get Monthly Attendance Trend
router.get(
  '/api/dashboard/monthly-attendance',
  authenticateToken,
  async (req, res) => {
    try {
      const {
        year = new Date().getFullYear(),
        month = new Date().getMonth() + 1,
      } = req.query;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const daysInMonth = endDate.getDate();

      const data = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayStart = currentDate.getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        const [result] = await db
          .promise()
          .query(
            'SELECT COUNT(DISTINCT PersonID) as count FROM attendancerecordinfo WHERE AttendanceState = 1 AND AttendanceDateTime BETWEEN ? AND ?',
            [dayStart, dayEnd]
          );

        data.push({
          day: day,
          date: dateStr,
          present: result[0].count,
        });
      }

      res.json(data);
    } catch (error) {
      console.error('Error fetching monthly attendance:', error);
      res.status(500).json({ error: 'Failed to fetch monthly attendance' });
    }
  }
);

// Get Employee Growth Trend (last 6 months)
router.get(
  '/api/dashboard/employee-growth',
  authenticateToken,
  async (req, res) => {
    try {
      const data = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1); // First day of month

        const monthStr = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });

        // Count employees registered up to this month
        const [result] = await db
          .promise()
          .query('SELECT COUNT(*) as count FROM users WHERE created_at <= ?', [
            date.toISOString(),
          ]);

        data.push({
          month: monthStr,
          total: result[0].count,
        });
      }

      res.json(data);
    } catch (error) {
      console.error('Error fetching employee growth:', error);
      res.status(500).json({ error: 'Failed to fetch employee growth data' });
    }
  }
);

// Get Quick Stats for specific employee (for user dashboard)
router.get(
  '/api/dashboard/employee-stats/:employeeNumber',
  authenticateToken,
  async (req, res) => {
    try {
      const { employeeNumber } = req.params;
      const stats = {};

      // Total attendance days this month
      const currentMonth = new Date();
      const monthStart = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const monthStartTimestamp = monthStart.getTime();
      const monthEndTimestamp = new Date().getTime();

      const [attendanceCount] = await db
        .promise()
        .query(
          'SELECT COUNT(DISTINCT DATE(FROM_UNIXTIME(AttendanceDateTime/1000))) as days FROM attendancerecordinfo WHERE PersonID = ? AND AttendanceState = 1 AND AttendanceDateTime BETWEEN ? AND ?',
          [employeeNumber, monthStartTimestamp, monthEndTimestamp]
        );
      stats.attendanceDaysThisMonth = attendanceCount[0].days;

      // Leave balance
      const [leaveBalance] = await db
        .promise()
        .query(
          'SELECT SUM(noOfLeaves) as total FROM leave_assignment WHERE employeeID = ?',
          [employeeNumber]
        );
      stats.leaveBalance = leaveBalance[0]?.total || 0;

      // Pending leave requests
      const [pendingLeaves] = await db
        .promise()
        .query(
          'SELECT COUNT(*) as count FROM leave_request WHERE employeeNumber = ? AND LOWER(status) = "pending"',
          [employeeNumber]
        );
      stats.pendingLeaveRequests = pendingLeaves[0]?.count || 0;

      // Last payroll
      const [lastPayroll] = await db
        .promise()
        .query(
          'SELECT pay1st, pay2nd, startDate, endDate FROM payroll_processed WHERE employeeNumber = ? ORDER BY dateCreated DESC LIMIT 1',
          [employeeNumber]
        );
      stats.lastPayroll = lastPayroll[0] || null;

      res.json(stats);
    } catch (error) {
      console.error('Error fetching employee stats:', error);
      res.status(500).json({ error: 'Failed to fetch employee statistics' });
    }
  }
);

module.exports = router;




