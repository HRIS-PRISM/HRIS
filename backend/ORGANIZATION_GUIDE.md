# Backend Organization Guide

## Overview

The backend has been partially organized. The goal is to move all route handlers from `index.js` into organized route files.

## Current Structure

```
backend/
├── index.js                    # Main entry point (CLEAN - only imports and mounts routes)
├── index.old.js                # Backup of  original file (4841 lines)
├── middleware/
│   ├── auth.js                 # Authentication middleware
│   └── upload.js               # File upload configuration
├── config/
│   └── email.js               # Email transporter configuration
├── utils/
│   ├── verificationCodes.js   # Verification code storage
│   └── excelDate.js           # Excel date utilities
├── routes/
│   ├── index.js               # Route exports
│   ├── auth.js                # ✅ Authentication routes (login, 2FA)
│   └── password.js            # ✅ Password routes (forgot, reset, change)
├── dashboardRoutes/           # Existing dashboard routes
└── payrollRoutes/             # Existing payroll routes
```

## ✅ Completed Organization

### Middleware

- ✅ `middleware/auth.js` - Authentication and audit logging
- ✅ `middleware/upload.js` - File upload configurations

### Config

- ✅ `config/email.js` - Email transporter

### Utils

- ✅ `utils/verificationCodes.js` - Verification code storage
- ✅ `utils/excelDate.js` - Excel date conversion

### Routes

- ✅ `routes/auth.js` - Login, 2FA routes
- ✅ `routes/password.js` - Password management routes

## 📋 Routes Still To Be Organized

The following routes are still in `index.old.js` and need to be moved to organized route files:

### Users (`routes/users.js`)

- `POST /register`
- `POST /excel-register`
- `GET /users`
- `GET /users/:employeeNumber`

### Pages (`routes/pages.js`)

- `GET /pages`
- `POST /pages`
- `PUT /pages/:id`
- `DELETE /pages/:id`
- `GET /page_access/:employeeNumber`
- `POST /page_access`
- `PUT /page_access/:employeeNumber/:pageId`

### Learning & Development (`routes/learning.js`)

- `GET /learning_and_development_table`
- `GET /learning_and_development_table/by-person/:person_id`
- `POST /learning_and_development_table`
- `PUT /learning_and_development_table/:id`
- `DELETE /learning_and_development_table/:id`
- `POST /upload_learning_and_development_table`

### Official Time (`routes/officialtime.js`)

- `GET /officialtimetable/:employeeID`
- `POST /officialtimetable`
- `POST /upload-excel-faculty-official-time`

### Remittance (`routes/remittance.js`)

- `GET /employee-remittance`
- `POST /employee-remittance`
- `PUT /employee-remittance/:id`
- `DELETE /employee-remittance/:id`

### Item Table (`routes/item.js`)

- `GET /api/item-table`
- `POST /api/item-table`
- `PUT /api/item-table/:id`
- `DELETE /api/item-table/:id`

### Salary Grade (`routes/salary.js`)

- `GET /api/salary-grade-status`
- `POST /api/salary-grade-status`
- `PUT /api/salary-grade-status/:id`
- `DELETE /api/salary-grade-status/:id`

### Department (`routes/department.js`)

- `GET /api/department-table`
- `GET /api/department-table/:id`
- `POST /api/department-table`
- `PUT /api/department-table/:id`
- `DELETE /api/department-table/:id`
- `GET /api/department-assignment`
- `GET /api/department-assignment/:id`
- `POST /api/department-assignment` — the body also accepts the optional payroll charge
  override `budgetCode` + `budgetType` (`department` | `employment_category`). Both must be
  enabled in the Appendix 33 layout, and a blank `budgetCode` means "use the assigned department".
- `PUT /api/department-assignment/:id`
- `DELETE /api/department-assignment/:id`

### Leave (`routes/leave.js`)

- `GET /leave`
- `POST /leave`
- `PUT /leave/:id`
- `DELETE /leave/:id`
- `POST /leave_assignment`
- `GET /leave_assignment`
- `PUT /leave_assignment/:id`
- `DELETE /leave_assignment/:id`

### Holiday (`routes/holiday.js`)

- `GET /holiday`
- `POST /holiday`
- `PUT /holiday/:id`
- `DELETE /holiday/:id`

### PhilHealth (`routes/philhealth.js`)

- `POST /api/philhealth`
- `GET /api/philhealth`
- `PUT /api/philhealth/:id`
- `DELETE /api/philhealth/:id`

### Profile (`routes/profile.js`)

- `POST /upload-profile-picture/:employeeNumber`

### Announcements (`routes/announcements.js`)

- `GET /api/announcements`
- `POST /api/announcements`
- `PUT /api/announcements/:id`
- `DELETE /api/announcements/:id`

### Audit (`routes/audit.js`)

- `GET /audit-logs`

### Tasks (`routes/tasks.js`)

- `GET /tasks`
- `POST /tasks`
- `PUT /tasks/:id/toggle`
- `DELETE /tasks/:id`

### Dashboard (`routes/dashboard.js`)

- `GET /api/dashboard/stats`
- `GET /api/dashboard/attendance-overview`
- `GET /api/dashboard/department-distribution`
- `GET /api/dashboard/leave-stats`
- `GET /api/dashboard/recent-activities`
- `GET /api/dashboard/payroll-summary`
- `GET /api/dashboard/monthly-attendance`
- `GET /api/dashboard/employee-growth`
- `GET /api/dashboard/employee-stats/:employeeNumber`

### Notes (`routes/notes.js`)

- `GET /api/notes/:employeeNumber`
- `POST /api/notes`
- `DELETE /api/notes/:id`

### Events (`routes/events.js`)

- `GET /api/events/:employeeNumber`
- `POST /api/events`
- `DELETE /api/events/:id`

### Settings (`routes/settings.js`)

- `GET /api/system-settings`
- `GET /api/system-settings/:key`
- `PUT /api/system-settings`
- `PUT /api/system-settings/:key`
- `DELETE /api/system-settings/:key`
- `POST /api/system-settings/reset`
- `GET /api/settings`
- `POST /api/settings`

## How To Organize Remaining Routes

1. **Create a new route file** in `routes/` directory (e.g., `routes/users.js`)

2. **Copy route definitions** from `index.old.js` to the new file:

   ```javascript
   const express = require('express');
   const router = express.Router();
   const db = require('../db');
   const { authenticateToken } = require('../middleware/auth');

   // Route definitions here
   router.post('/register', async (req, res) => {
     // ... route handler
   });

   module.exports = router;
   ```

3. **Import and mount** in `index.js`:

   ```javascript
   const userRoutes = require('./routes/users');
   // ...
   app.use('/users', userRoutes); // or appropriate base path
   ```

4. **Update route paths** if needed (some routes might need path adjustments)

5. **Test** to ensure routes still work

6. **Remove** the route definitions from `index.old.js` (or mark as moved)

## Notes

- The old `index.js` has been backed up as `index.old.js`
- Current `index.js` is clean and only imports/mounts routes
- All route definitions are still in `index.old.js` for reference
- As routes are organized, update `index.js` to import them
- Keep route paths consistent with existing frontend expectations
