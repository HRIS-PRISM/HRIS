const { getIO } = require('./socketServer');

/**
 * Socket Service - Helper functions to emit events to users
 * This service provides a centralized way to send real-time notifications
 */

/**
 * Broadcast to multiple role rooms
 * @param {Array<string>} roles - e.g. ['administrator', 'superadmin', 'technical']
 * @param {string} eventName - Event name to emit
 * @param {object} data - Data to send with the event
 */
function broadcastToRoles(roles, eventName, data) {
  try {
    const io = getIO();
    const timestamp = new Date().toISOString();

    roles.forEach((role) => {
      io.to(`role:${role}`).emit(eventName, { ...data, timestamp });
    });

    console.log(`✓ Broadcasted to roles [${roles.join(', ')}]: ${eventName}`);
  } catch (error) {
    console.error(`Failed to broadcast to roles:`, error.message);
  }
}

/**
 * Notify a user that their page access has been granted
 * @param {string} employeeNumber - Employee number of the user
 * @param {object} pageData - Page information that was granted
 */
function notifyPageAccessGranted(employeeNumber, pageData) {
  try {
    const io = getIO();
    
    io.to(employeeNumber).emit('pageAccessGranted', {
      action: 'granted',
      page: pageData,
      timestamp: new Date().toISOString(),
      message: `Access granted to ${pageData.page_name}`,
    });

    console.log(`✓ Notified ${employeeNumber}: Access granted to page ${pageData.page_name} (ID: ${pageData.page_id})`);
  } catch (error) {
    console.error(`Failed to notify page access granted for ${employeeNumber}:`, error.message);
  }
}

/**
 * Notify a user that their page access has been revoked
 * @param {string} employeeNumber - Employee number of the user
 * @param {object} pageData - Page information that was revoked
 */
function notifyPageAccessRevoked(employeeNumber, pageData) {
  try {
    const io = getIO();
    
    io.to(employeeNumber).emit('pageAccessRevoked', {
      action: 'revoked',
      page: pageData,
      timestamp: new Date().toISOString(),
      message: `Access revoked from ${pageData.page_name}`,
    });

    console.log(`✓ Notified ${employeeNumber}: Access revoked from page ${pageData.page_name} (ID: ${pageData.page_id})`);
  } catch (error) {
    console.error(`Failed to notify page access revoked for ${employeeNumber}:`, error.message);
  }
}

/**
 * Notify a user that their page access has been updated
 * @param {string} employeeNumber - Employee number of the user
 * @param {object} pageData - Page information
 * @param {string} action - Action performed ('granted' or 'revoked')
 */
function notifyPageAccessChanged(employeeNumber, action, pageData) {
  if (action === 'granted') {
    notifyPageAccessGranted(employeeNumber, pageData);
  } else if (action === 'revoked') {
    notifyPageAccessRevoked(employeeNumber, pageData);
  } else {
    console.warn(`Unknown action "${action}" for page access notification`);
  }
}

/**
 * Notify multiple users about page access changes
 * @param {Array<string>} employeeNumbers - Array of employee numbers
 * @param {string} eventName - Event name to emit
 * @param {object} data - Data to send with the event
 */
function notifyMultipleUsers(employeeNumbers, eventName, data) {
  try {
    const io = getIO();
    
    employeeNumbers.forEach((employeeNumber) => {
      io.to(employeeNumber).emit(eventName, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    console.log(`✓ Notified ${employeeNumbers.length} users: ${eventName}`);
  } catch (error) {
    console.error(`Failed to notify multiple users:`, error.message);
  }
}

/**
 * Broadcast to all connected users (use sparingly)
 * @param {string} eventName - Event name to emit
 * @param {object} data - Data to send with the event
 */
function broadcastToAll(eventName, data) {
  try {
    const io = getIO();
    
    io.emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    console.log(`✓ Broadcasted to all users: ${eventName}`);
  } catch (error) {
    console.error(`Failed to broadcast:`, error.message);
  }
}

/**
 * Broadcast to users with a specific role
 * @param {string} role - User role (superadmin, administrator, staff)
 * @param {string} eventName - Event name to emit
 * @param {object} data - Data to send with the event
 */
function broadcastToRole(role, eventName, data) {
  try {
    const io = getIO();
    
    io.to(`role:${role}`).emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    console.log(`✓ Broadcasted to role ${role}: ${eventName}`);
  } catch (error) {
    console.error(`Failed to broadcast to role ${role}:`, error.message);
  }
}

/**
 * College table realtime notifier (Option A pattern)
 * Called by college routes after DB changes.
 *
 * @param {'created'|'updated'|'deleted'} action
 * @param {object} data - event payload (e.g. { id, person_id })
 */
function notifyCollegeTableChanged(action, data) {
  broadcastToRoles(['administrator', 'superadmin', 'technical'], 'collegeTableChanged', {
    action,
    ...data,
  });
}

/**
 * Supervisor assignment realtime notifier
 * Frontend pattern: listen to 'supervisorAssignmentChanged' then re-fetch.
 *
 * @param {'created'|'updated'|'deleted'} action
 * @param {object} data - { id, supervisorEmployeeNumber, departmentCode }
 */
function notifySupervisorAssignmentChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'supervisorAssignmentChanged',
    { action, ...data },
  );
}

/**
 * Personal Info realtime notifier (Option A pattern)
 * Called by personal info routes after DB changes.
 *
 * @param {'created'|'updated'|'deleted'} action
 * @param {object} data - event payload (e.g. { id, employeeNumber })
 */
function notifyPersonalInfoChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'personalInfoChanged',
    {
      action,
      ...data,
    },
  );
}

/**
 * Dashboard modules realtime notifiers (Option A pattern)
 * These emit lightweight events; frontend re-fetches data.
 */
function notifyChildrenTableChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'childrenTableChanged',
    { action, ...data },
  );
}

function notifyEligibilityChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'eligibilityChanged',
    { action, ...data },
  );
}

function notifyVoluntaryWorkChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'voluntaryWorkChanged',
    { action, ...data },
  );
}

function notifyVocationalChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'vocationalChanged',
    { action, ...data },
  );
}

function notifyWorkExperienceChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'workExperienceChanged',
    { action, ...data },
  );
}

function notifyOtherInformationChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'otherInformationChanged',
    { action, ...data },
  );
}

function notifyGraduateChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'graduateChanged',
    { action, ...data },
  );
}

function notifyLearningChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'learningChanged',
    { action, ...data },
  );
}

/** Read-only / noise actions that must not trigger campus-wide refetches. */
const ATTENDANCE_SILENT_ACTIONS = new Set([
  'leaves-fetched',
  'holidays-fetched',
  'suspensions-fetched',
]);

/** Actions that only affect print status UI — still emit, but mark as light. */
const ATTENDANCE_LIGHT_ACTIONS = new Set([
  'dtr-printed',
]);

let lastBulkAttendanceEmitAt = 0;
const BULK_ATTENDANCE_DEBOUNCE_MS = 2000;

/**
 * Attendance realtime notifier
 * Called by attendance routes after DB changes.
 *
 * Frontend pattern: listen to 'attendanceChanged' then re-fetch (filtered).
 *
 * @param {string} action
 * @param {object} data - event payload (keep lightweight)
 * @returns {boolean} whether an event was emitted
 */
function notifyAttendanceChanged(action, data = {}) {
  if (ATTENDANCE_SILENT_ACTIONS.has(action)) {
    return false;
  }

  // Debounce identical bulk storms (many tabs finishing sync at once)
  if (action === 'bulk-auto-sync' || action === 'auto-sync') {
    const now = Date.now();
    if (now - lastBulkAttendanceEmitAt < BULK_ATTENDANCE_DEBOUNCE_MS) {
      return false;
    }
    lastBulkAttendanceEmitAt = now;
  }

  const light = ATTENDANCE_LIGHT_ACTIONS.has(action);
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'attendanceChanged',
    { action, light, ...data },
  );
  return true;
}

/**
 * Payroll realtime notifier (universal)
 * Called by payroll-related routes after DB changes.
 *
 * Frontend pattern: listen to 'payrollChanged' then re-fetch.
 *
 * @param {'created'|'updated'|'deleted'|'processed'|'finalized'|'released'|'sent'|'imported'|'sync'} action
 * @param {object} data - event payload (keep lightweight)
 */
function notifyPayrollChanged(action, data) {
  broadcastToRoles(
    ['staff', 'administrator', 'superadmin', 'technical'],
    'payrollChanged',
    { action, ...data },
  );
}

/**
 * Earnings / leave balances / SC / CTO / salary shortfall registry.
 * Frontend pattern: listen to 'earningsChanged' then re-fetch the open employee period.
 *
 * @param {'created'|'updated'|'deleted'|'approved'|'rejected'} action
 * @param {object} data - include employeeNumber when known for targeted refresh
 */
function notifyEarningsChanged(action, data) {
  broadcastToRoles(
    ['staff', 'admin', 'administrator', 'superadmin', 'technical'],
    'earningsChanged',
    { action, ...data },
  );
}

/**
 * Announcement realtime notifier (universal)
 * Called by announcement routes after DB changes.
 *
 * Frontend pattern: listen to 'announcementChanged' and update state directly.
 *
 * @param {'created'|'updated'|'deleted'} action
 * @param {object} announcement - Full announcement object (for created/updated) or { id } (for deleted)
 */
function notifyAnnouncementChanged(action, announcement) {
  // Broadcast to ALL connected users (everyone should see announcements)
  broadcastToAll('announcementChanged', { action, announcement });
}

/**
 * Broadcast a newly created audit log entry in real-time.
 * Admins/superadmins/technical receive ALL logs via role rooms.
 * Each employee also receives their own logs via their personal room.
 * @param {object} logEntry - The new audit log row
 */
function broadcastNewAuditLog(logEntry) {
  try {
    const io = getIO();
    const adminRoles = ['administrator', 'superadmin', 'technical'];

    // Broadcast to admin role rooms
    adminRoles.forEach((role) => {
      io.to(`role:${role}`).emit('auditLogCreated', logEntry);
    });

    // Also push to the employee's own room so non-admins see their logs
    if (logEntry.employeeNumber) {
      io.to(logEntry.employeeNumber).emit('auditLogCreated', logEntry);
    }

    console.log(`✓ Broadcasted new audit log: ${logEntry.action} by ${logEntry.employeeNumber}`);
  } catch (error) {
    console.error('Failed to broadcast audit log:', error.message);
  }
}

/**
 * Contact thread realtime notifier
 * Called by contact routes after new ticket, message, or status change.
 *
 * @param {'created'|'message'|'status'} action
 * @param {object} data - { contactId, employeeNumber }
 */
function notifyContactThreadChanged(action, data) {
  try {
    const io = getIO();
    const payload = { action, ...data, timestamp: new Date().toISOString() };

    // Notify admins/technical
    ['administrator', 'superadmin', 'technical'].forEach((role) => {
      io.to(`role:${role}`).emit('contactThreadChanged', payload);
    });

    // Notify owner/staff
    if (data?.employeeNumber) {
      io.to(String(data.employeeNumber)).emit('contactThreadChanged', payload);
    }

    console.log(
      `✓ Contact thread event: ${action} (contactId=${data?.contactId})`,
    );
  } catch (error) {
    console.error('Failed to notify contact thread change:', error.message);
  }
}



/**
 * Broadcast a newly created audit log entry in real-time.
 * Admins/superadmins/technical receive ALL logs via role rooms.
 * Each employee also receives their own logs via their personal room.
 * @param {object} logEntry - The new audit log row
 */
function broadcastNewAuditLog(logEntry) {
  try {
    const io = getIO();
    const adminRoles = ['administrator', 'superadmin', 'technical'];

    // Broadcast to admin role rooms
    adminRoles.forEach((role) => {
      io.to(`role:${role}`).emit('auditLogCreated', logEntry);
    });

    // Also push to the employee's own room so non-admins see their logs
    if (logEntry.employeeNumber) {
      io.to(logEntry.employeeNumber).emit('auditLogCreated', logEntry);
    }

    console.log(`✓ Broadcasted new audit log: ${logEntry.action} by ${logEntry.employeeNumber}`);
  } catch (error) {
    console.error('Failed to broadcast audit log:', error.message);
  }
}

module.exports = {
  notifyPageAccessGranted,
  notifyPageAccessRevoked,
  notifyPageAccessChanged,
  notifyMultipleUsers,
  broadcastToAll,
  broadcastToRole,
  broadcastToRoles,
  notifyCollegeTableChanged,
  notifyPersonalInfoChanged,
  notifyChildrenTableChanged,
  notifyEligibilityChanged,
  notifyVoluntaryWorkChanged,
  notifyVocationalChanged,
  notifyWorkExperienceChanged,
  notifyOtherInformationChanged,
  notifyGraduateChanged,
  notifyLearningChanged,
  notifyAttendanceChanged,
  notifyPayrollChanged,
  notifyEarningsChanged,
  notifyAnnouncementChanged,
  broadcastNewAuditLog,
  notifyContactThreadChanged,
  notifySupervisorAssignmentChanged,
};
