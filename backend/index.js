const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyparser = require('body-parser');
require('dotenv').config();

const db = require('./db');
const { initializeSocket } = require('./socket/socketServer');

// Import existing route modules
const childrenRouter = require('./dashboardRoutes/Children');
const EligibilityRoute = require('./dashboardRoutes/Eligibility');
const VoluntaryWork = require('./dashboardRoutes/Voluntary');
const CollegeRoute = require('./dashboardRoutes/College');
const VocationalRoute = require('./dashboardRoutes/Vocational');
const PersonalRoute = require('./dashboardRoutes/PersonalInfo');
const WorkExperienceRoute = require('./dashboardRoutes/WorkExperience');
const OtherInfo = require('./dashboardRoutes/OtherSkills');
const GraduateRoute = require('./dashboardRoutes/Graduate');
const AllData = require('./dashboardRoutes/DataRoute');
const Attendance = require('./dashboardRoutes/Attendance');
const SalaryGradeTable = require('./payrollRoutes/SalaryGradeTable');
const Remittance = require('./payrollRoutes/Remittance');
const SendPayslip = require('./payrollRoutes/SendPayslip');
const Payroll = require('./payrollRoutes/Payroll');
const PayrollReleased = require('./payrollRoutes/PayrollReleased');
const PayrollJO = require('./payrollRoutes/PayrollJO');
const PayrollFormulas = require('./payrollRoutes/PayrollFormulas');
const EmployeeCategory = require('./dashboardRoutes/EmployeeCategory');

// Import new organized routes
const authRoutes = require('./routes/auth');
const passwordRoutes = require('./routes/password');
const settingsRoutes = require('./routes/settings');
const learningRoutes = require('./routes/learning');
const userRoutes = require('./routes/users');
const pageRoutes = require('./routes/pages');
const officialtimeRoutes = require('./routes/officialtime');
const remittanceRoutes = require('./routes/remittance');
const itemRoutes = require('./routes/item');
const salaryRoutes = require('./routes/salary');
const departmentRoutes = require('./routes/department');
const leaveRoutes = require('./routes/leave');
const holidayRoutes = require('./routes/holiday');
const philhealthRoutes = require('./routes/philhealth');
const profileRoutes = require('./routes/profile');
const announcementsRoutes = require('./routes/announcements');
const suspensionsRoutes = require('./routes/suspensions');
const auditRoutes = require('./routes/audit');
const tasksRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
const notesRoutes = require('./routes/notes');
const eventsRoutes = require('./routes/events');
const notificationsRoutes = require('./routes/notifications');
const reportsRoutes = require('./routes/reports');
const settingsExtendedRoutes = require('./routes/settings-extended');
const confidentialPasswordRoutes = require('./routes/confidential-password');
const commutationRoute = require('./routes/commutation');
const pdsTemplatesRoutes = require('./routes/pds-templates');


const app = express();

// CORS configuration - MUST be before body parsing middleware
// Allow localhost, any 192.168.* (LAN), and specific public origins so other devices can load data
const allowedOrigins = [
  'http://localhost:5137',
  'http://192.168.50.36:5137',
  'http://192.168.50.45:5137',
  'http://136.239.248.42:5137',
  'http://192.168.50.97:5137',
  'http://192.168.50.86:5173',
  'http://192.168.50.62:5173',
  'http://192.168.50.65:5173'
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.indexOf(origin) !== -1) return true;
  // Allow any device on LAN (192.168.x.x) and localhost with any port
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    if (u.hostname.startsWith('192.168.')) return true;
  } catch (_) {}
  return false;
}

app.use(
  cors({
    origin: function (origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parsing middleware - AFTER CORS
// Increase payload size limit to handle bulk operations (default is 100kb)
app.use(express.json({ limit: '50mb' }));
app.use(bodyparser.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use('/uploads', express.static('uploads'));

// Ensure audit log table exists
const ensureAuditLogTableSQL = `
  CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employeeNumber VARCHAR(64) NULL,
    action VARCHAR(512) NOT NULL,
    table_name VARCHAR(128) NULL,
    record_id INT NULL,
    targetEmployeeNumber VARCHAR(64) NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

db.query(ensureAuditLogTableSQL, (err) => {
  if (err) {
    console.error('Failed to ensure audit_log table exists:', err);
  } else {
    console.log('Audit log table ready');
  }
});

// Ensure auth_sessions table exists
const ensureAuthSessionsTableSQL = `
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    employee_number VARCHAR(64) NOT NULL COMMENT 'Employee number of the user',
    email VARCHAR(255) NOT NULL COMMENT 'Email address of the user',
    ip_address VARCHAR(45) NULL DEFAULT NULL COMMENT 'IP address from which the user logged in',
    user_agent TEXT NULL DEFAULT NULL COMMENT 'User agent/browser information',
    login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the user logged in',
    logout_time DATETIME NULL DEFAULT NULL COMMENT 'When the user logged out (NULL if still active)',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether the session is still active (1 = active, 0 = logged out)',
    token_expires_at DATETIME NULL DEFAULT NULL COMMENT 'When the JWT token expires',
    PRIMARY KEY (id),
    INDEX idx_employee_number (employee_number),
    INDEX idx_email (email),
    INDEX idx_login_time (login_time),
    INDEX idx_is_active (is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Stores user authentication sessions for login tracking';
`;

db.query(ensureAuthSessionsTableSQL, (err) => {
  if (err) {
    console.error('Failed to ensure auth_sessions table exists:', err);
  } else {
    console.log('Auth sessions table ready');
  }
});

// Ensure holiday table exists (create if missing, then add optional columns)
const ensureHolidayTableSQL = `
  CREATE TABLE IF NOT EXISTS holiday (
    id INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(512) NULL,
    date DATE NULL,
    status VARCHAR(64) NULL DEFAULT 'Active',
    title VARCHAR(255) NULL,
    about TEXT NULL,
    date_start DATE NULL,
    date_end DATE NULL,
    image VARCHAR(500) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
db.query(ensureHolidayTableSQL, (err) => {
  if (err) {
    console.error('Failed to ensure holiday table exists:', err.message);
  } else {
    db.query('ALTER TABLE holiday ADD COLUMN title VARCHAR(255) NULL', (e) => {
      if (e && e.code !== 'ER_DUP_FIELDNAME')
        console.error('Holiday migration title:', e.message);
    });
    db.query('ALTER TABLE holiday ADD COLUMN about TEXT NULL', (e) => {
      if (e && e.code !== 'ER_DUP_FIELDNAME')
        console.error('Holiday migration about:', e.message);
    });
    db.query('ALTER TABLE holiday ADD COLUMN date_start DATE NULL', (e) => {
      if (e && e.code !== 'ER_DUP_FIELDNAME')
        console.error('Holiday migration date_start:', e.message);
    });
    db.query('ALTER TABLE holiday ADD COLUMN date_end DATE NULL', (e) => {
      if (e && e.code !== 'ER_DUP_FIELDNAME')
        console.error('Holiday migration date_end:', e.message);
    });
    db.query('ALTER TABLE holiday ADD COLUMN image VARCHAR(500) NULL', (e) => {
      if (e && e.code !== 'ER_DUP_FIELDNAME')
        console.error('Holiday migration image:', e.message);
    });
  }
});

// Announcements: Date Range for carousel visibility
[
  'ALTER TABLE announcements ADD COLUMN date_start DATE NULL',
  'ALTER TABLE announcements ADD COLUMN date_end DATE NULL',
].forEach((sql) => {
  db.query(sql, (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME')
      console.error('Announcements migration:', err.message);
  });
});

// Ensure suspensions table exists (for suspension creation visible on HomeAdmin carousel)
const ensureSuspensionsTableSQL = `
  CREATE TABLE IF NOT EXISTS suspensions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(512) NULL,
    about TEXT NULL,
    date DATE NULL,
    date_start DATE NULL,
    date_end DATE NULL,
    reason VARCHAR(512) NULL,
    image VARCHAR(500) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
db.query(ensureSuspensionsTableSQL, (err) => {
  if (err)
    console.error('Failed to ensure suspensions table exists:', err.message);
  else console.log('Suspensions table ready');
});

// Ensure contact messages table exists (threaded replies)
const ensureContactMessagesTableSQL = `
  CREATE TABLE IF NOT EXISTS contact_us_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    sender_role VARCHAR(32) NULL,
    sender_employee_number VARCHAR(64) NULL,
    sender_name VARCHAR(255) NULL,
    sender_email VARCHAR(255) NULL,
    message TEXT NOT NULL,
    attachment VARCHAR(512) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contact_id (contact_id),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Stores threaded replies for contact_us';
`;

db.query(ensureContactMessagesTableSQL, (err) => {
  if (err)
    console.error('Failed to ensure contact_us_messages table exists:', err.message);
  else console.log('Contact messages table ready');
});

// Ensure contact_us_messages has attachment column
db.query('ALTER TABLE contact_us_messages ADD COLUMN attachment VARCHAR(512) NULL', (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') {
    console.error('Contact messages attachment migration:', err.message);
  }
});

// Ensure feedbacks table exists
const ensureFeedbacksTableSQL = `
  CREATE TABLE IF NOT EXISTS feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    sender_role VARCHAR(32) NULL,
    sender_employee_number VARCHAR(64) NULL,
    sender_name VARCHAR(255) NULL,
    sender_email VARCHAR(255) NULL,
    message TEXT NOT NULL,
    attachment VARCHAR(512) NULL,
    rating TINYINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contact_id (contact_id),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Stores feedback threads for resolved contact tickets';
`;

db.query(ensureFeedbacksTableSQL, (err) => {
  if (err)
    console.error('Failed to ensure feedbacks table exists:', err.message);
  else console.log('Feedbacks table ready');
});

// Ensure feedbacks has rating column
db.query('ALTER TABLE feedbacks ADD COLUMN rating TINYINT NULL', (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') {
    console.error('Feedbacks rating migration:', err.message);
  }
});

// Ensure contact_us status enum includes on_process
const ensureContactStatusEnumSQL = `
  ALTER TABLE contact_us
  MODIFY COLUMN status ENUM('new','on_process','read','replied','resolved')
  NOT NULL DEFAULT 'new'
  COMMENT 'Status of the contact message';
`;
db.query(ensureContactStatusEnumSQL, (err) => {
  if (err && err.code !== 'ER_BAD_FIELD_ERROR') {
    console.error('Contact status enum migration:', err.message);
  }
});

// existing routes
app.use('/ChildrenRoute', childrenRouter);
app.use('/VoluntaryRoute', VoluntaryWork);
app.use('/eligibilityRoute', EligibilityRoute);
app.use('/college', CollegeRoute);
app.use('/GraduateRoute', GraduateRoute);
app.use('/vocational', VocationalRoute);
app.use('/personalinfo', PersonalRoute);
app.use('/WorkExperienceRoute', WorkExperienceRoute);
app.use('/OtherInfo', OtherInfo);
app.use('/allData', AllData);
app.use('/attendance', Attendance);
app.use('/SalaryGradeTable', SalaryGradeTable);
app.use('/Remittance', Remittance);
app.use('/leaveRoute', leaveRoutes);
app.use('/SendPayslipRoute', SendPayslip);
app.use('/PayrollRoute', Payroll);
app.use('/PayrollReleasedRoute', PayrollReleased);
app.use('/PayrollJORoutes', PayrollJO);
app.use('/EmploymentCategoryRoutes', EmployeeCategory);
app.use('/', authRoutes);
app.use('/', passwordRoutes);
app.use('/', settingsRoutes);
app.use('/', learningRoutes);
app.use('/', userRoutes);
app.use('/', pageRoutes);
app.use('/', officialtimeRoutes);
app.use('/', remittanceRoutes);
app.use('/', itemRoutes);
app.use('/', salaryRoutes);
app.use('/', departmentRoutes);
app.use('/', leaveRoutes);
app.use('/', holidayRoutes);
app.use('/', philhealthRoutes);
app.use('/', profileRoutes);
app.use('/', announcementsRoutes);
app.use('/', suspensionsRoutes);
app.use('/', auditRoutes);
app.use('/', tasksRoutes);
app.use('/', dashboardRoutes);
app.use('/', notesRoutes);
app.use('/', eventsRoutes);
app.use('/', notificationsRoutes);
app.use('/', reportsRoutes);
app.use('/', settingsExtendedRoutes);
app.use('/', confidentialPasswordRoutes);
app.use('/', PayrollFormulas);
app.use('/commutationRoute', commutationRoute);
app.use('/pds-templates', pdsTemplatesRoutes);

// Server startup with Socket.IO
const PORT = process.env.WEB_PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Make io accessible to routes via app.locals
app.locals.io = io;

// Start server - listen on 0.0.0.0 so other devices on the network can connect
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`========================================`);
  console.log(`✓ HTTP Server running on http://${HOST}:${PORT}`);
  console.log(`✓ Socket.IO server ready`);
  console.log(`========================================`);
});

module.exports = { app, server, io };
