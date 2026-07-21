const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, logAudit, requireAdmin, ADMIN_ROLES } = require('../middleware/auth');

// Helper function to get current month and year
const getCurrentPeriod = () => {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
};

// Helper function to check if report exists for current month
const checkReportExists = async (reportType, month, year) => {
  try {
    const [results] = await db
      .promise()
      .query(
        'SELECT id FROM reports WHERE report_type = ? AND report_month = ? AND report_year = ?',
        [reportType, month, year]
      );
    return results.length > 0 ? results[0].id : null;
  } catch (error) {
    console.error('Error checking report existence:', error);
    return null;
  }
};

// GET Dashboard Statistics (for reports)
router.get('/api/reports/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();

    // Check if report exists
    const reportId = await checkReportExists('dashboard', period.month, period.year);
    if (!reportId) {
      return res.json({ success: false, message: 'No report generated for this period' });
    }

    // Get report data
    const [reports] = await db
      .promise()
      .query('SELECT data FROM reports WHERE id = ?', [reportId]);

    if (reports.length === 0) {
      return res.json({ success: false, message: 'Report not found' });
    }

    const stats = JSON.parse(reports[0].data || '{}');

    logAudit(req.user, 'View', 'reports_dashboard_stats', reportId, null);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics' });
  }
});

// GET Attendance Overview (for reports)
router.get('/api/reports/attendance-overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year, days = 7 } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();

    const reportId = await checkReportExists('attendance', period.month, period.year);
    if (!reportId) {
      return res.json({ success: false, message: 'No report generated for this period' });
    }

    const [reports] = await db
      .promise()
      .query('SELECT data FROM reports WHERE id = ?', [reportId]);

    if (reports.length === 0) {
      return res.json({ success: false, message: 'Report not found' });
    }

    const reportData = JSON.parse(reports[0].data || '{}');
    const overview = reportData.overview || [];

    logAudit(req.user, 'View', 'reports_attendance_overview', reportId, null);
    res.json({ success: true, data: overview.slice(0, parseInt(days)) });
  } catch (error) {
    console.error('Error fetching attendance overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance overview' });
  }
});

// GET Department Distribution (for reports)
router.get('/api/reports/department-distribution', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();

    const reportId = await checkReportExists('attendance', period.month, period.year);
    if (!reportId) {
      return res.json({ success: false, message: 'No report generated for this period' });
    }

    const [reports] = await db
      .promise()
      .query('SELECT data FROM reports WHERE id = ?', [reportId]);

    if (reports.length === 0) {
      return res.json({ success: false, message: 'Report not found' });
    }

    const reportData = JSON.parse(reports[0].data || '{}');
    const departments = reportData.departments || [];

    logAudit(req.user, 'View', 'reports_department_distribution', reportId, null);
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('Error fetching department distribution:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch department distribution' });
  }
});

// GET Payroll Summary (for reports)
router.get('/api/reports/payroll-summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();

    const reportId = await checkReportExists('payroll', period.month, period.year);
    if (!reportId) {
      return res.json({ success: false, message: 'No report generated for this period' });
    }

    const [reports] = await db
      .promise()
      .query('SELECT data FROM reports WHERE id = ?', [reportId]);

    if (reports.length === 0) {
      return res.json({ success: false, message: 'Report not found' });
    }

    const reportData = JSON.parse(reports[0].data || '{}');
    const summary = reportData.summary || {};

    logAudit(req.user, 'View', 'reports_payroll_summary', reportId, null);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching payroll summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payroll summary' });
  }
});

// GET Monthly Attendance Trend (for reports)
router.get('/api/reports/monthly-attendance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();

    const reportId = await checkReportExists('attendance', period.month, period.year);
    if (!reportId) {
      return res.json({ success: false, message: 'No report generated for this period' });
    }

    const [reports] = await db
      .promise()
      .query('SELECT data FROM reports WHERE id = ?', [reportId]);

    if (reports.length === 0) {
      return res.json({ success: false, message: 'Report not found' });
    }

    const reportData = JSON.parse(reports[0].data || '{}');
    const monthlyTrend = reportData.monthlyTrend || [];

    logAudit(req.user, 'View', 'reports_monthly_attendance', reportId, null);
    res.json({ success: true, data: monthlyTrend });
  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch monthly attendance' });
  }
});

// GET Employee Statistics (for reports)
router.get('/api/reports/employee-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();

    const reportId = await checkReportExists('employee', period.month, period.year);
    if (!reportId) {
      return res.json({ success: false, message: 'No report generated for this period' });
    }

    const [reports] = await db
      .promise()
      .query('SELECT data FROM reports WHERE id = ?', [reportId]);

    if (reports.length === 0) {
      return res.json({ success: false, message: 'Report not found' });
    }

    const reportData = JSON.parse(reports[0].data || '{}');
    const stats = reportData.stats || {};

    logAudit(req.user, 'View', 'reports_employee_stats', reportId, null);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employee statistics' });
  }
});

// POST Generate Report
router.post('/api/reports/generate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { report_type } = req.body;
    const period = getCurrentPeriod();
    const employeeNumber = req.user?.employeeNumber || req.user?.username || null;

    // Check if report already exists
    const existingReportId = await checkReportExists(report_type, period.month, period.year);
    if (existingReportId) {
      return res.json({
        success: true,
        message: 'Report already exists for this period',
        report_id: existingReportId,
        month: period.month,
        year: period.year,
      });
    }

    let reportData = {};

    // Generate report data based on type
    switch (report_type) {
      case 'dashboard':
        reportData = await generateDashboardReport(period);
        break;
      case 'attendance':
        reportData = await generateAttendanceReport(period);
        break;
      case 'payroll':
        reportData = await generatePayrollReport(period);
        break;
      case 'employee':
        reportData = await generateEmployeeReport(period);
        break;
      case 'leave':
        reportData = await generateLeaveReport(period);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    // Insert report into database
    const [result] = await db
      .promise()
      .query(
        'INSERT INTO reports (report_type, report_month, report_year, generated_by, data) VALUES (?, ?, ?, ?, ?)',
        [report_type, period.month, period.year, employeeNumber, JSON.stringify(reportData)]
      );

    logAudit(req.user, 'Generate', 'reports', result.insertId, null);

    res.json({
      success: true,
      message: `${report_type} report generated successfully`,
      report_id: result.insertId,
      month: period.month,
      year: period.year,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Helper function to generate dashboard report
async function generateDashboardReport(period) {
  const stats = {};

  // Total Employees
  const [employeeCount] = await db
    .promise()
    .query(
      'SELECT COUNT(DISTINCT agencyEmployeeNum) as total FROM person_table WHERE agencyEmployeeNum IS NOT NULL'
    );
  stats.totalEmployees = employeeCount[0].total;

  // Today's Attendance
  const monthStart = new Date(period.year, period.month - 1, 1);
  const monthEnd = new Date(period.year, period.month, 0);
  const monthStartTimestamp = monthStart.getTime();
  const monthEndTimestamp = monthEnd.getTime() + 24 * 60 * 60 * 1000;

  const [attendanceCount] = await db
    .promise()
    .query(
      'SELECT COUNT(DISTINCT PersonID) as total FROM attendancerecordinfo WHERE AttendanceState = 1 AND AttendanceDateTime BETWEEN ? AND ?',
      [monthStartTimestamp, monthEndTimestamp]
    );
  stats.presentThisMonth = attendanceCount[0].total;

  // Pending Payroll
  const [pendingPayroll] = await db
    .promise()
    .query('SELECT COUNT(*) as total FROM payroll_processing WHERE status = 0');
  stats.pendingPayroll = pendingPayroll[0]?.total || 0;

  // Processed Payroll
  const [processedPayroll] = await db
    .promise()
    .query('SELECT COUNT(*) as total FROM payroll_processing WHERE status = 1');
  stats.processedPayroll = processedPayroll[0]?.total || 0;

  // Payslip Count
  const [payslipCount] = await db
    .promise()
    .query('SELECT COUNT(*) as total FROM payroll_processed');
  stats.payslipCount = payslipCount[0]?.total || 0;

  return stats;
}

// Helper function to generate attendance report
async function generateAttendanceReport(period) {
  const reportData = {};

  // Weekly attendance overview (last 7 days of the month)
  const monthStart = new Date(period.year, period.month - 1, 1);
  const monthEnd = new Date(period.year, period.month, 0);
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(monthEnd);
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
  reportData.overview = data;

  // Department distribution
  const [departments] = await db.promise().query(`
    SELECT 
      dt.description as department,
      dt.code,
      COUNT(DISTINCT da.employeeNumber) as employeeCount
    FROM department_table dt
    LEFT JOIN department_assignment da ON dt.code = da.code
    GROUP BY dt.code, dt.description
    ORDER BY employeeCount DESC
  `);
  reportData.departments = departments;

  // Monthly trend (weekly averages)
  const daysInMonth = monthEnd.getDate();
  const monthlyData = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(period.year, period.month - 1, day);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayStart = currentDate.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const [result] = await db
      .promise()
      .query(
        'SELECT COUNT(DISTINCT PersonID) as count FROM attendancerecordinfo WHERE AttendanceState = 1 AND AttendanceDateTime BETWEEN ? AND ?',
        [dayStart, dayEnd]
      );

    monthlyData.push({
      day: day,
      date: dateStr,
      present: result[0].count,
    });
  }

  // Convert to weekly averages
  const weeklyAverages = [];
  let weekData = [];
  monthlyData.forEach((day, index) => {
    weekData.push(day.present);
    if ((index + 1) % 7 === 0 || index === monthlyData.length - 1) {
      const avg = weekData.reduce((a, b) => a + b, 0) / weekData.length;
      weeklyAverages.push({
        week: `Week ${weeklyAverages.length + 1}`,
        attendance: avg.toFixed(1),
        leaves: 0,
        overtime: 0,
      });
      weekData = [];
    }
  });
  reportData.monthlyTrend = weeklyAverages;

  return reportData;
}

// Helper function to generate payroll report
async function generatePayrollReport(period) {
  const summary = {};

  // Processing (status = 0)
  const [totalProcessing] = await db
    .promise()
    .query('SELECT COUNT(*) as count FROM payroll_processing WHERE status = 0');
  summary.processing = totalProcessing[0]?.count || 0;

  // Processed (status = 1)
  const [totalProcessed] = await db
    .promise()
    .query('SELECT COUNT(*) as count FROM payroll_processing WHERE status = 1');
  summary.processed = totalProcessed[0]?.count || 0;

  // Released (in payroll_released table)
  const [totalReleased] = await db
    .promise()
    .query('SELECT COUNT(*) as count FROM payroll_released');
  summary.released = totalReleased[0]?.count || 0;

  const [latestPayroll] = await db.promise().query(`
    SELECT startDate, endDate, COUNT(*) as employeeCount 
    FROM payroll_processing 
    GROUP BY startDate, endDate 
    ORDER BY startDate DESC 
    LIMIT 1
  `);
  summary.latestPeriod = latestPayroll[0] || null;

  // Payroll budget per department
  const monthStart = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
  const monthEnd = new Date(period.year, period.month, 0).toISOString().split('T')[0];
  
  const [deptBudget] = await db.promise().query(`
    SELECT 
      COALESCE(da.code, fp.department) as department,
      dt.description as departmentName,
      COUNT(DISTINCT fp.employeeNumber) as employeeCount,
      SUM(fp.netSalary) as totalBudget,
      AVG(fp.netSalary) as avgSalary
    FROM payroll_processed fp
    LEFT JOIN (
      SELECT employeeNumber, code, MAX(id) as max_id
      FROM department_assignment
      GROUP BY employeeNumber, code
    ) da ON fp.employeeNumber = da.employeeNumber
    LEFT JOIN department_table dt ON COALESCE(da.code, fp.department) = dt.code
    WHERE fp.startDate >= ? AND fp.endDate <= ?
    GROUP BY COALESCE(da.code, fp.department), dt.description
    ORDER BY totalBudget DESC
  `, [monthStart, monthEnd]);
  summary.departmentBudget = deptBudget || [];

  // Previous month comparison
  const prevMonth = period.month === 1 ? { month: 12, year: period.year - 1 } : { month: period.month - 1, year: period.year };
  const prevMonthStart = `${prevMonth.year}-${String(prevMonth.month).padStart(2, '0')}-01`;
  const prevMonthEnd = new Date(prevMonth.year, prevMonth.month, 0).toISOString().split('T')[0];
  
  const [prevDeptBudget] = await db.promise().query(`
    SELECT 
      COALESCE(da.code, fp.department) as department,
      SUM(fp.netSalary) as totalBudget
    FROM payroll_processed fp
    LEFT JOIN (
      SELECT employeeNumber, code, MAX(id) as max_id
      FROM department_assignment
      GROUP BY employeeNumber, code
    ) da ON fp.employeeNumber = da.employeeNumber
    WHERE fp.startDate >= ? AND fp.endDate <= ?
    GROUP BY COALESCE(da.code, fp.department)
  `, [prevMonthStart, prevMonthEnd]);

  // Calculate changes
  const budgetChanges = summary.departmentBudget.map(current => {
    const prev = prevDeptBudget.find(p => p.department === current.department);
    const change = prev ? current.totalBudget - prev.totalBudget : current.totalBudget;
    const changePercent = prev && prev.totalBudget > 0 
      ? ((change / prev.totalBudget) * 100).toFixed(2) 
      : 100;
    return {
      ...current,
      previousBudget: prev?.totalBudget || 0,
      change: change,
      changePercent: parseFloat(changePercent)
    };
  });
  summary.departmentBudgetWithChanges = budgetChanges;

  return { summary };
}

// Helper function to generate employee report
async function generateEmployeeReport(period) {
  const stats = {};

  // Total Employees
  const [employeeCount] = await db
    .promise()
    .query(
      'SELECT COUNT(DISTINCT agencyEmployeeNum) as total FROM person_table WHERE agencyEmployeeNum IS NOT NULL'
    );
  stats.totalEmployees = employeeCount[0].total;

  // Active Users
  const [activeUsers] = await db
    .promise()
    .query('SELECT COUNT(*) as total FROM users WHERE role != "admin"');
  stats.activeUsers = activeUsers[0].total;

  // Departments Count
  const [departments] = await db
    .promise()
    .query('SELECT COUNT(*) as total FROM department_table');
  stats.totalDepartments = departments[0].total;

  // Employees per department
  const [deptEmployees] = await db.promise().query(`
    SELECT 
      dt.code,
      dt.description as department,
      COUNT(DISTINCT da.employeeNumber) as employeeCount
    FROM department_table dt
    LEFT JOIN department_assignment da ON dt.code = da.code
    GROUP BY dt.code, dt.description
    ORDER BY employeeCount DESC
  `);
  stats.departmentEmployees = deptEmployees || [];

  // Employee demographics
  const [demographics] = await db.promise().query(`
    SELECT 
      CASE 
        WHEN TIMESTAMPDIFF(YEAR, pt.birthDate, CURDATE()) < 30 THEN '20-29'
        WHEN TIMESTAMPDIFF(YEAR, pt.birthDate, CURDATE()) < 40 THEN '30-39'
        WHEN TIMESTAMPDIFF(YEAR, pt.birthDate, CURDATE()) < 50 THEN '40-49'
        WHEN TIMESTAMPDIFF(YEAR, pt.birthDate, CURDATE()) < 60 THEN '50-59'
        ELSE '60+'
      END as ageGroup,
      COUNT(*) as count
    FROM person_table pt
    WHERE pt.birthDate IS NOT NULL
    GROUP BY ageGroup
    ORDER BY ageGroup
  `);
  stats.ageDistribution = demographics || [];

  // Employment status
  const [employmentStatus] = await db.promise().query(`
    SELECT 
      u.employmentCategory,
      COUNT(*) as count
    FROM users u
    WHERE u.employmentCategory IS NOT NULL
    GROUP BY u.employmentCategory
  `);
  stats.employmentStatus = employmentStatus || [];

  // Recent hires (last 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const [recentHires] = await db.promise().query(`
    SELECT COUNT(*) as count
    FROM users
    WHERE created_at >= ?
  `, [threeMonthsAgo]);
  stats.recentHires = recentHires[0]?.count || 0;

  return { stats };
}

// Helper function to generate leave report
async function generateLeaveReport(period) {
  const stats = {};

  const [pending] = await db
    .promise()
    .query('SELECT COUNT(*) as count FROM leave_request WHERE LOWER(status) = "pending"');
  stats.pending = pending[0]?.count || 0;

  const [approved] = await db
    .promise()
    .query('SELECT COUNT(*) as count FROM leave_request WHERE LOWER(status) = "approved"');
  stats.approved = approved[0]?.count || 0;

  const [rejected] = await db
    .promise()
    .query('SELECT COUNT(*) as count FROM leave_request WHERE LOWER(status) = "rejected"');
  stats.rejected = rejected[0]?.count || 0;

  stats.total = stats.pending + stats.approved + stats.rejected;

  return { stats };
}

// GET Department Employee Count
router.get('/api/reports/department-employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();

    const reportId = await checkReportExists('employee', period.month, period.year);
    if (!reportId) {
      return res.json({ success: false, message: 'No report generated for this period' });
    }

    const [reports] = await db
      .promise()
      .query('SELECT data FROM reports WHERE id = ?', [reportId]);

    if (reports.length === 0) {
      return res.json({ success: false, message: 'Report not found' });
    }

    const reportData = JSON.parse(reports[0].data || '{}');
    const deptEmployees = reportData.stats?.departmentEmployees || [];

    logAudit(req.user, 'View', 'reports_department_employees', reportId, null);
    res.json({ success: true, data: deptEmployees });
  } catch (error) {
    console.error('Error fetching department employees:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch department employees' });
  }
});

// GET Payroll Budget per Department
router.get('/api/reports/payroll-budget', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();

    const reportId = await checkReportExists('payroll', period.month, period.year);
    if (!reportId) {
      return res.json({ success: false, message: 'No report generated for this period' });
    }

    const [reports] = await db
      .promise()
      .query('SELECT data FROM reports WHERE id = ?', [reportId]);

    if (reports.length === 0) {
      return res.json({ success: false, message: 'Report not found' });
    }

    const reportData = JSON.parse(reports[0].data || '{}');
    const budget = reportData.summary?.departmentBudgetWithChanges || [];

    logAudit(req.user, 'View', 'reports_payroll_budget', reportId, null);
    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('Error fetching payroll budget:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payroll budget' });
  }
});

// POST Reset Report
router.post('/api/reports/reset', authenticateToken, async (req, res) => {
  try {
    const { report_type, month, year } = req.body;
    const role = String(req.user?.role || '').toLowerCase();
    const isEmployeeReport = String(report_type || '').startsWith('employee_');

    if (!isEmployeeReport && !ADMIN_ROLES.includes(role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();
    const reportType = report_type || 'dashboard';

    const reportId = await checkReportExists(reportType, period.month, period.year);
    if (!reportId) {
      return res.json({ success: false, message: 'No report found to reset' });
    }

    // Delete the report
    await db.promise().query(
      'DELETE FROM reports WHERE id = ?',
      [reportId]
    );

    logAudit(req.user, 'Delete', 'reports', reportId, null);

    res.json({
      success: true,
      message: `${reportType} report reset successfully`,
      month: period.month,
      year: period.year,
    });
  } catch (error) {
    console.error('Error resetting report:', error);
    res.status(500).json({ success: false, error: 'Failed to reset report' });
  }
});

// GET Employee Personal Attendance Report
router.get('/api/reports/employee/attendance', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();
    const employeeNumber = req.user?.employeeNumber || req.user?.username;

    if (!employeeNumber) {
      return res.status(400).json({ success: false, error: 'Employee number not found' });
    }

    const monthStart = new Date(period.year, period.month - 1, 1);
    const monthEnd = new Date(period.year, period.month, 0);
    const startDate = monthStart.toISOString().split('T')[0];
    const endDate = monthEnd.toISOString().split('T')[0];

    // Weekly attendance breakdown
    const weeklyData = [];
    const daysInMonth = monthEnd.getDate();
    const startTimestamp = monthStart.getTime();
    const endTimestamp = monthEnd.getTime() + 24 * 60 * 60 * 1000;
    
    for (let week = 1; week <= 5; week++) {
      const weekStart = Math.min((week - 1) * 7 + 1, daysInMonth);
      const weekEnd = Math.min(week * 7, daysInMonth);
      const weekStartDate = new Date(period.year, period.month - 1, weekStart);
      const weekEndDate = new Date(period.year, period.month - 1, weekEnd);
      const weekStartTimestamp = weekStartDate.getTime();
      const weekEndTimestamp = weekEndDate.getTime() + 24 * 60 * 60 * 1000;
      
      const [attendance] = await db.promise().query(`
        SELECT COUNT(DISTINCT DATE(FROM_UNIXTIME(AttendanceDateTime / 1000))) as present
        FROM attendancerecordinfo
        WHERE PersonID = ? 
          AND AttendanceState = 1
          AND AttendanceDateTime BETWEEN ? AND ?
      `, [employeeNumber, weekStartTimestamp, weekEndTimestamp]);

      weeklyData.push({
        week: `Week ${week}`,
        present: attendance[0]?.present || 0,
        expected: weekEnd - weekStart + 1,
      });
    }

    // Monthly summary - count distinct days
    const [monthlySummary] = await db.promise().query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN AttendanceState = 1 THEN DATE(FROM_UNIXTIME(AttendanceDateTime / 1000)) END) as present,
        COUNT(DISTINCT DATE(FROM_UNIXTIME(AttendanceDateTime / 1000))) as totalDays
      FROM attendancerecordinfo
      WHERE PersonID = ?
        AND AttendanceDateTime BETWEEN ? AND ?
    `, [employeeNumber, startTimestamp, endTimestamp]);
    
    const summary = monthlySummary[0] || {};
    const absent = (summary.totalDays || 0) - (summary.present || 0);

    // Attendance rate
    const attendanceRate = summary.totalDays > 0 ? ((summary.present / summary.totalDays) * 100).toFixed(1) : 0;

    logAudit(req.user, 'View', 'employee_attendance_report', null, employeeNumber);
    res.json({
      success: true,
      data: {
        weekly: weeklyData,
        summary: {
          present: summary.present || 0,
          absent: absent,
          total: summary.totalDays || 0,
          attendanceRate: parseFloat(attendanceRate),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching employee attendance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employee attendance' });
  }
});

// GET Employee Performance Report
router.get('/api/reports/employee/performance', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();
    const employeeNumber = req.user?.employeeNumber || req.user?.username;

    if (!employeeNumber) {
      return res.status(400).json({ success: false, error: 'Employee number not found' });
    }

    const monthStart = new Date(period.year, period.month - 1, 1);
    const monthEnd = new Date(period.year, period.month, 0);
    const startDate = monthStart.toISOString().split('T')[0];
    const endDate = monthEnd.toISOString().split('T')[0];

    // Get employee info
    const [employeeInfo] = await db.promise().query(`
      SELECT 
        pt.agencyEmployeeNum,
        CONCAT_WS(' ', pt.firstName, pt.middleName, pt.lastName, pt.nameExtension) as fullName,
        da.code as departmentCode,
        dt.description as departmentName,
        itt.item_description as position
      FROM person_table pt
      LEFT JOIN (
        SELECT employeeNumber, code, MAX(id) as max_id
        FROM department_assignment
        GROUP BY employeeNumber, code
      ) da ON pt.agencyEmployeeNum = da.employeeNumber
      LEFT JOIN department_table dt ON da.code = dt.code
      LEFT JOIN (
        SELECT employeeID, item_description, MAX(id) as max_id
        FROM item_table
        GROUP BY employeeID, item_description
      ) itt ON pt.agencyEmployeeNum = itt.employeeID
      WHERE pt.agencyEmployeeNum = ?
      LIMIT 1
    `, [employeeNumber]);

      // Attendance performance
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
      
      const [attendancePerf] = await db.promise().query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN AttendanceState = 1 THEN DATE(FROM_UNIXTIME(AttendanceDateTime / 1000)) END) as present,
          COUNT(DISTINCT DATE(FROM_UNIXTIME(AttendanceDateTime / 1000))) as totalDays
        FROM attendancerecordinfo
        WHERE PersonID = ?
          AND AttendanceDateTime BETWEEN ? AND ?
      `, [employeeNumber, startTimestamp, endTimestamp]);
      
      const attPerf = attendancePerf[0] || {};
      const absent = (attPerf.totalDays || 0) - (attPerf.present || 0);

    // Leave records
    const [leaveRecords] = await db.promise().query(`
      SELECT 
        COUNT(CASE WHEN LOWER(status) = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN LOWER(status) = 'rejected' THEN 1 END) as rejected,
        COUNT(*) as total
      FROM leave_request
      WHERE employeeNumber = ?
        AND DATE(created_at) BETWEEN ? AND ?
    `, [employeeNumber, startDate, endDate]);

    // Payroll summary
    const [payrollSummary] = await db.promise().query(`
      SELECT 
        COUNT(*) as totalRecords,
        SUM(netSalary) as totalEarnings,
        AVG(netSalary) as avgSalary
      FROM payroll_processed
      WHERE employeeNumber = ?
        AND startDate >= ? AND endDate <= ?
    `, [employeeNumber, startDate, endDate]);

    const perf = {
      employeeInfo: employeeInfo[0] || {},
      attendance: {
        present: attPerf.present || 0,
        absent: absent,
        total: attPerf.totalDays || 0,
      },
      leave: leaveRecords[0] || {},
      payroll: payrollSummary[0] || {},
    };

    logAudit(req.user, 'View', 'employee_performance_report', null, employeeNumber);
    res.json({ success: true, data: perf });
  } catch (error) {
    console.error('Error fetching employee performance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employee performance' });
  }
});

// GET Employee Payroll History
router.get('/api/reports/employee/payroll-history', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();
    const employeeNumber = req.user?.employeeNumber || req.user?.username;

    if (!employeeNumber) {
      return res.status(400).json({ success: false, error: 'Employee number not found' });
    }

    const monthStart = new Date(period.year, period.month - 1, 1);
    const monthEnd = new Date(period.year, period.month, 0);
    const startDate = monthStart.toISOString().split('T')[0];
    const endDate = monthEnd.toISOString().split('T')[0];

    const [payrollHistory] = await db.promise().query(`
      SELECT 
        startDate,
        endDate,
        netSalary,
        grossSalary,
        totalDeductions,
        pay1st,
        pay2nd,
        status
      FROM payroll_processed
      WHERE employeeNumber = ?
        AND startDate >= ? AND endDate <= ?
      ORDER BY startDate DESC
      LIMIT 12
    `, [employeeNumber, startDate, endDate]);

    logAudit(req.user, 'View', 'employee_payroll_history', null, employeeNumber);
    res.json({ success: true, data: payrollHistory });
  } catch (error) {
    console.error('Error fetching payroll history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payroll history' });
  }
});

// POST Generate Employee Personal Report
router.post('/api/reports/employee/generate', authenticateToken, async (req, res) => {
  try {
    const { report_type } = req.body;
    const period = getCurrentPeriod();
    const employeeNumber = req.user?.employeeNumber || req.user?.username;

    if (!employeeNumber) {
      return res.status(400).json({ success: false, error: 'Employee number not found' });
    }

    // Check if report already exists
    const existingReportId = await checkReportExists(`employee_${report_type}`, period.month, period.year);
    if (existingReportId) {
      return res.json({
        success: true,
        message: 'Report already exists for this period',
        report_id: existingReportId,
      });
    }

    let reportData = {};

    // Generate report data based on type
    if (report_type === 'attendance') {
      // Fetch attendance data
      const monthStart = new Date(period.year, period.month - 1, 1);
      const monthEnd = new Date(period.year, period.month, 0);
      const startDate = monthStart.toISOString().split('T')[0];
      const endDate = monthEnd.toISOString().split('T')[0];

      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
      
      const [weeklyData] = await db.promise().query(`
        SELECT 
          WEEK(DATE(FROM_UNIXTIME(AttendanceDateTime / 1000))) as week,
          COUNT(DISTINCT CASE WHEN AttendanceState = 1 THEN DATE(FROM_UNIXTIME(AttendanceDateTime / 1000)) END) as present
        FROM attendancerecordinfo
        WHERE PersonID = ?
          AND AttendanceDateTime BETWEEN ? AND ?
        GROUP BY week
      `, [employeeNumber, startTimestamp, endTimestamp]);

      const [summary] = await db.promise().query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN AttendanceState = 1 THEN DATE(FROM_UNIXTIME(AttendanceDateTime / 1000)) END) as present,
          COUNT(DISTINCT DATE(FROM_UNIXTIME(AttendanceDateTime / 1000))) as totalDays
        FROM attendancerecordinfo
        WHERE PersonID = ?
          AND AttendanceDateTime BETWEEN ? AND ?
      `, [employeeNumber, startTimestamp, endTimestamp]);
      
      const sumData = summary[0] || {};
      const absent = (sumData.totalDays || 0) - (sumData.present || 0);

      reportData = {
        weekly: weeklyData,
        summary: {
          present: sumData.present || 0,
          absent: absent,
          total: sumData.totalDays || 0,
        },
      };
    } else if (report_type === 'performance') {
      // Fetch performance data
      const monthStart = new Date(period.year, period.month - 1, 1);
      const monthEnd = new Date(period.year, period.month, 0);
      const startDate = monthStart.toISOString().split('T')[0];
      const endDate = monthEnd.toISOString().split('T')[0];

      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
      
      const [attendance] = await db.promise().query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN AttendanceState = 1 THEN DATE(FROM_UNIXTIME(AttendanceDateTime / 1000)) END) as present,
          COUNT(DISTINCT DATE(FROM_UNIXTIME(AttendanceDateTime / 1000))) as totalDays
        FROM attendancerecordinfo
        WHERE PersonID = ?
          AND AttendanceDateTime BETWEEN ? AND ?
      `, [employeeNumber, startTimestamp, endTimestamp]);
      
      const attData = attendance[0] || {};
      const absent = (attData.totalDays || 0) - (attData.present || 0);

      const [leave] = await db.promise().query(`
        SELECT COUNT(*) as total
        FROM leave_request
        WHERE employeeNumber = ? AND DATE(created_at) BETWEEN ? AND ?
      `, [employeeNumber, startDate, endDate]);

      reportData = {
        attendance: {
          present: attData.present || 0,
          absent: absent,
          total: attData.totalDays || 0,
        },
        leave: leave[0] || {},
      };
    }

    // Insert report
    const [result] = await db.promise().query(
      'INSERT INTO reports (report_type, report_month, report_year, generated_by, data) VALUES (?, ?, ?, ?, ?)',
      [`employee_${report_type}`, period.month, period.year, employeeNumber, JSON.stringify(reportData)]
    );

    logAudit(req.user, 'Generate', 'employee_reports', result.insertId, employeeNumber);
    res.json({
      success: true,
      message: `${report_type} report generated successfully`,
      report_id: result.insertId,
    });
  } catch (error) {
    console.error('Error generating employee report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate employee report' });
  }
});

// GET Check if employee report exists
router.get('/api/reports/employee/check', authenticateToken, async (req, res) => {
  try {
    const { report_type, month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();
    const reportType = report_type || 'attendance';
    const employeeNumber = req.user?.employeeNumber || req.user?.username;

    if (!employeeNumber) {
      return res.status(400).json({ success: false, error: 'Employee number not found' });
    }

    const reportId = await checkReportExists(`employee_${reportType}`, period.month, period.year);

    res.json({
      success: true,
      exists: reportId !== null,
      report_id: reportId,
    });
  } catch (error) {
    console.error('Error checking employee report:', error);
    res.status(500).json({ success: false, error: 'Failed to check employee report' });
  }
});

// GET Check if report exists for current period
router.get('/api/reports/check', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { report_type, month, year } = req.query;
    const period = month && year ? { month: parseInt(month), year: parseInt(year) } : getCurrentPeriod();
    const reportType = report_type || 'dashboard';

    const reportId = await checkReportExists(reportType, period.month, period.year);

    res.json({
      success: true,
      exists: reportId !== null,
      report_id: reportId,
      month: period.month,
      year: period.year,
    });
  } catch (error) {
    console.error('Error checking report:', error);
    res.status(500).json({ success: false, error: 'Failed to check report' });
  }
});

module.exports = router;

