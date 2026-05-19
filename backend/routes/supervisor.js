/**
 * supervisorLeaveRoute.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Supervisor Leave Approval — intermediate approval layer between
 * Employee and Admin/HR in the Leave Management System.
 *
 * Tables expected:
 *   supervisor_assignment  (id, supervisorEmployeeNumber, departmentCode, role, createdAt, updatedAt)
 *   leave_request          (existing — status: 0=pending, 1=supervisor approved, 2=HR approved, 3=denied, 4=cancelled)
 *   transaction_table      (existing)
 *   audit_log              (existing — via logAudit middleware)
 *
 * SQL to create supervisor_assignment:
 *   CREATE TABLE supervisor_assignment (
 *     id                       INT AUTO_INCREMENT PRIMARY KEY,
 *     supervisorEmployeeNumber VARCHAR(50) NOT NULL,
 *     departmentCode           VARCHAR(50) NOT NULL,
 *     role                     ENUM('Dean','Department Head','Supervisor') NOT NULL DEFAULT 'Supervisor',
 *     createdAt                DATETIME DEFAULT CURRENT_TIMESTAMP,
 *     updatedAt                DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *     UNIQUE KEY uq_sup_dept (supervisorEmployeeNumber, departmentCode)
 *   );
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const jwt     = require('jsonwebtoken');
const { authenticateToken, logAudit } = require('../middleware/auth');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getActorEmployeeNumber = (req, fallback = null) => {
  if (req.user?.employeeNumber) return String(req.user.employeeNumber);
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded?.employeeNumber) return String(decoded.employeeNumber);
      if (decoded?.username)       return String(decoded.username);
    } catch { /* silent */ }
  }
  return fallback ? String(fallback) : 'unknown';
};

const getEmployeeFullName = (employeeNumber) =>
  new Promise((resolve) => {
    if (!employeeNumber) return resolve('');
    db.query(
      `SELECT CONCAT_WS(' ', firstName, middleName, lastName, nameExtension) AS fullName
       FROM person_table WHERE agencyEmployeeNum = ? LIMIT 1`,
      [employeeNumber],
      (err, rows) => resolve((rows && rows[0] && rows[0].fullName) || ''),
    );
  });

const formatUserDisplayName = (employeeNumber, fullName) => {
  const emp  = employeeNumber ? String(employeeNumber) : 'unknown';
  const name = (fullName || '').trim();
  return name ? `${name} (${emp})` : emp;
};

const insertTransactionLog = (employeeId, message, actorEmployeeNumber = null, auditDetailsPayload = null) =>
  new Promise((resolve) => {
    if (!employeeId || !message) return resolve();
    db.query(
      'INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)',
      [employeeId, message],
      (err, result) => {
        if (err) { console.error('[supervisor-leave] transaction log error:', err.message); return resolve(); }
        try {
          let detailsJson = null;
          if (auditDetailsPayload != null) {
            detailsJson = typeof auditDetailsPayload === 'string'
              ? auditDetailsPayload
              : JSON.stringify({ message, ...auditDetailsPayload });
          }
          logAudit(
            { employeeNumber: actorEmployeeNumber || employeeId },
            auditDetailsPayload != null ? 'Supervisor leave action' : message,
            'leave_request',
            result.insertId,
            employeeId,
            detailsJson,
          );
        } catch (e) { console.error('[supervisor-leave] audit mirror error:', e.message); }
        resolve();
      },
    );
  });

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — Supervisor Assignment CRUD  (Admin/HR manages these)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/supervisor-assignment
 * Returns all supervisor assignments, enriched with person names and dept description.
 */
router.get('/api/supervisor-assignment', authenticateToken, (req, res) => {
  const sql = `
    SELECT
      sa.id,
      sa.supervisorEmployeeNumber,
      sa.departmentCode,
      sa.role,
      sa.createdAt,
      sa.updatedAt,
      CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) AS supervisorName,
      dt.description AS departmentDescription
    FROM supervisor_assignment sa
    LEFT JOIN person_table pt
      ON pt.agencyEmployeeNum = sa.supervisorEmployeeNumber
    LEFT JOIN person_table p
      ON p.agencyEmployeeNum = sa.supervisorEmployeeNumber
    LEFT JOIN department_table dt
      ON dt.code = sa.departmentCode
    ORDER BY sa.role, sa.departmentCode, sa.supervisorEmployeeNumber
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch supervisor assignments' });
    res.json(Array.isArray(rows) ? rows : []);
  });
});

/**
 * GET /api/supervisor-assignment/by-supervisor/:employeeNumber
 * Returns all department assignments for a given supervisor.
 */
router.get('/api/supervisor-assignment/by-supervisor/:employeeNumber', authenticateToken, (req, res) => {
  const sql = `
    SELECT sa.*, dt.description AS departmentDescription
    FROM supervisor_assignment sa
    LEFT JOIN department_table dt ON dt.code = sa.departmentCode
    WHERE sa.supervisorEmployeeNumber = ?
    ORDER BY sa.departmentCode
  `;
  db.query(sql, [req.params.employeeNumber], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch assignments' });
    res.json(Array.isArray(rows) ? rows : []);
  });
});

/**
 * POST /api/supervisor-assignment
 * Assigns an employee as supervisor for a department.
 * Body: { supervisorEmployeeNumber, departmentCode, role }
 */
router.post('/api/supervisor-assignment', authenticateToken, async (req, res) => {
  const { supervisorEmployeeNumber, departmentCode, role } = req.body;
  const actorEmpNum = getActorEmployeeNumber(req);

  if (!supervisorEmployeeNumber || !departmentCode) {
    return res.status(400).json({ error: 'supervisorEmployeeNumber and departmentCode are required' });
  }
  const validRoles = ['Dean', 'Department Head', 'Supervisor'];
  const assignedRole = validRoles.includes(role) ? role : 'Supervisor';

  const sql = `
    INSERT INTO supervisor_assignment (supervisorEmployeeNumber, departmentCode, role)
    VALUES (?, ?, ?)
  `;
  db.query(sql, [supervisorEmployeeNumber, departmentCode, assignedRole], async (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'This supervisor is already assigned to this department.' });
      }
      logAudit({ employeeNumber: actorEmpNum }, 'Insert Failed', 'supervisor_assignment', null, supervisorEmployeeNumber);
      return res.status(500).json({ error: 'Failed to create supervisor assignment' });
    }
    const insertedId = result.insertId;
    try {
      const [supName, actorName] = await Promise.all([
        getEmployeeFullName(supervisorEmployeeNumber),
        getEmployeeFullName(actorEmpNum),
      ]);
      const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
      const supDisplay   = formatUserDisplayName(supervisorEmployeeNumber, supName);
      logAudit({ employeeNumber: actorEmpNum }, `Assign Supervisor - ${assignedRole} for dept ${departmentCode}`, 'supervisor_assignment', insertedId, supervisorEmployeeNumber);
      await insertTransactionLog(
        String(supervisorEmployeeNumber),
        `${actorDisplay} assigned ${supDisplay} as ${assignedRole} for department ${departmentCode}.`,
        actorEmpNum,
        { action: 'supervisor_assigned', departmentCode, role: assignedRole, assignment_id: insertedId },
      );
    } catch (e) { console.error('[supervisor-leave] post-insert log error:', e.message); }

    res.status(201).json({ id: insertedId, supervisorEmployeeNumber, departmentCode, role: assignedRole });
  });
});

/**
 * PUT /api/supervisor-assignment/:id
 * Update role for an existing supervisor assignment.
 * Body: { role }
 */
router.put('/api/supervisor-assignment/:id', authenticateToken, async (req, res) => {
  const { id }  = req.params;
  const { role } = req.body;
  const actorEmpNum = getActorEmployeeNumber(req);
  const validRoles  = ['Dean', 'Department Head', 'Supervisor'];
  const assignedRole = validRoles.includes(role) ? role : 'Supervisor';

  db.query(
    'SELECT * FROM supervisor_assignment WHERE id = ?',
    [id],
    async (fetchErr, rows) => {
      if (fetchErr || !rows.length) return res.status(404).json({ error: 'Assignment not found' });
      const current = rows[0];
      db.query(
        'UPDATE supervisor_assignment SET role = ? WHERE id = ?',
        [assignedRole, id],
        async (updateErr) => {
          if (updateErr) {
            logAudit({ employeeNumber: actorEmpNum }, 'Update Failed', 'supervisor_assignment', id, current.supervisorEmployeeNumber);
            return res.status(500).json({ error: 'Failed to update supervisor assignment' });
          }
          try {
            const [supName, actorName] = await Promise.all([
              getEmployeeFullName(current.supervisorEmployeeNumber),
              getEmployeeFullName(actorEmpNum),
            ]);
            const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
            const supDisplay   = formatUserDisplayName(current.supervisorEmployeeNumber, supName);
            logAudit({ employeeNumber: actorEmpNum }, `Update Supervisor Role to ${assignedRole}`, 'supervisor_assignment', id, current.supervisorEmployeeNumber);
            await insertTransactionLog(
              String(current.supervisorEmployeeNumber),
              `${actorDisplay} updated ${supDisplay}'s role to ${assignedRole} for department ${current.departmentCode}.`,
              actorEmpNum,
              { action: 'supervisor_role_updated', departmentCode: current.departmentCode, old_role: current.role, new_role: assignedRole },
            );
          } catch (e) { console.error('[supervisor-leave] update log error:', e.message); }
          res.json({ id, supervisorEmployeeNumber: current.supervisorEmployeeNumber, departmentCode: current.departmentCode, role: assignedRole });
        },
      );
    },
  );
});

/**
 * DELETE /api/supervisor-assignment/:id
 * Removes a supervisor from a department.
 */
router.delete('/api/supervisor-assignment/:id', authenticateToken, async (req, res) => {
  const { id }  = req.params;
  const actorEmpNum = getActorEmployeeNumber(req);

  db.query('SELECT * FROM supervisor_assignment WHERE id = ?', [id], async (fetchErr, rows) => {
    if (fetchErr || !rows.length) return res.status(404).json({ error: 'Assignment not found' });
    const current = rows[0];
    db.query('DELETE FROM supervisor_assignment WHERE id = ?', [id], async (deleteErr) => {
      if (deleteErr) {
        logAudit({ employeeNumber: actorEmpNum }, 'Delete Failed', 'supervisor_assignment', id, current.supervisorEmployeeNumber);
        return res.status(500).json({ error: 'Failed to delete supervisor assignment' });
      }
      try {
        const [supName, actorName] = await Promise.all([
          getEmployeeFullName(current.supervisorEmployeeNumber),
          getEmployeeFullName(actorEmpNum),
        ]);
        const actorDisplay = formatUserDisplayName(actorEmpNum, actorName);
        const supDisplay   = formatUserDisplayName(current.supervisorEmployeeNumber, supName);
        logAudit({ employeeNumber: actorEmpNum }, `Remove Supervisor - ${current.role} from dept ${current.departmentCode}`, 'supervisor_assignment', id, current.supervisorEmployeeNumber);
        await insertTransactionLog(
          String(current.supervisorEmployeeNumber),
          `${actorDisplay} removed ${supDisplay} as ${current.role} from department ${current.departmentCode}.`,
          actorEmpNum,
          { action: 'supervisor_removed', departmentCode: current.departmentCode, role: current.role },
        );
      } catch (e) { console.error('[supervisor-leave] delete log error:', e.message); }
      res.json({ message: 'Supervisor assignment removed successfully' });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — Supervisor Context Queries  (used by supervisor-facing UI)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/supervisor-leave/context/:supervisorEmployeeNumber
 * Returns the supervisor's department codes and assigned role.
 * Used by the front-end to scope which departments' leave requests are visible.
 */
router.get('/api/supervisor-leave/context/:supervisorEmployeeNumber', authenticateToken, (req, res) => {
  const { supervisorEmployeeNumber } = req.params;
  const sql = `
    SELECT sa.departmentCode, sa.role, dt.description AS departmentDescription
    FROM supervisor_assignment sa
    LEFT JOIN department_table dt ON dt.code = sa.departmentCode
    WHERE sa.supervisorEmployeeNumber = ?
  `;
  db.query(sql, [supervisorEmployeeNumber], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch supervisor context' });
    if (!rows || !rows.length) return res.json({ isSupervisor: false, departments: [] });
    res.json({
      isSupervisor: true,
      supervisorEmployeeNumber,
      departments: rows.map((r) => ({
        code: r.departmentCode,
        description: r.departmentDescription || r.departmentCode,
        role: r.role,
      })),
    });
  });
});

/**
 * GET /api/supervisor-leave/requests/:supervisorEmployeeNumber
 * Returns all leave requests that fall under the supervisor's department(s).
 * Joins department_assignment to determine which employees belong to the dept.
 * Optional query params: ?status=0&departmentCode=DEPT01
 */
router.get('/api/supervisor-leave/requests/:supervisorEmployeeNumber', authenticateToken, (req, res) => {
  const { supervisorEmployeeNumber } = req.params;
  const { status, departmentCode }   = req.query;

  // Step 1: Get supervisor's departments
  db.query(
    'SELECT departmentCode, role FROM supervisor_assignment WHERE supervisorEmployeeNumber = ?',
    [supervisorEmployeeNumber],
    (err, depts) => {
      if (err) return res.status(500).json({ error: 'Failed to resolve supervisor departments' });
      if (!depts || !depts.length) return res.json([]);

      const allowedCodes = depts.map((d) => d.departmentCode);
      const deptFilter   = departmentCode && allowedCodes.includes(departmentCode)
        ? [departmentCode]
        : allowedCodes;

      const placeholders = deptFilter.map(() => '?').join(',');

      // Step 2: Fetch leave requests for employees in those departments
      let sql = `
        SELECT
          lr.id,
          lr.employeeNumber,
          lr.leave_code,
          lr.status,
          lr.deduction_applied_hours,
          lr.hr_approval_rate,
          lr.created_at,
          DATE_FORMAT(lr.leave_date, '%Y-%m-%d') AS leave_date,
          lt.leave_description,
          CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) AS employeeName,
          da.code AS departmentCode,
          dt.description AS departmentDescription
        FROM leave_request lr
        LEFT JOIN leave_table lt   ON lt.leave_code = lr.leave_code
        LEFT JOIN person_table p   ON p.agencyEmployeeNum = lr.employeeNumber
        LEFT JOIN department_assignment da
          ON CAST(da.employeeNumber AS CHAR) = CAST(lr.employeeNumber AS CHAR)
          AND da.code IN (${placeholders})
        LEFT JOIN department_table dt ON dt.code = da.code
        WHERE da.code IN (${placeholders})
      `;
      const params = [...deptFilter, ...deptFilter];

      if (status !== undefined && status !== null && status !== '') {
        sql += ' AND lr.status = ?';
        params.push(Number(status));
      }
      sql += ' ORDER BY lr.created_at DESC';

      db.query(sql, params, (err2, rows) => {
        if (err2) return res.status(500).json({ error: 'Failed to fetch supervisor leave requests' });
        res.json(Array.isArray(rows) ? rows : []);
      });
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C — Supervisor Approve / Deny  (status 1 = supervisor approved, 3 = denied)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/supervisor-leave/action/:leaveRequestId
 * Supervisor approves (status → 1) or denies (status → 3) a leave request.
 * Body: { newStatus: 1|3, supervisorEmployeeNumber, remarks? }
 *
 * Guards:
 *  - Only status 0 (pending) requests may be actioned by supervisor.
 *  - Supervisor must have the employee's department in their assignment list.
 *  - Once status is 1/2/3/4, supervisor cannot change it (HR owns 2/3/4).
 */
router.put('/api/supervisor-leave/action/:leaveRequestId', authenticateToken, async (req, res) => {
  const { leaveRequestId } = req.params;
  const { newStatus, supervisorEmployeeNumber, remarks } = req.body;
  const actorEmpNum = getActorEmployeeNumber(req, supervisorEmployeeNumber);

  if (![1, 3].includes(Number(newStatus))) {
    return res.status(400).json({ error: 'Supervisor may only set status to 1 (approved) or 3 (denied).' });
  }
  if (!supervisorEmployeeNumber) {
    return res.status(400).json({ error: 'supervisorEmployeeNumber is required.' });
  }

  // Fetch the leave request
  db.query('SELECT * FROM leave_request WHERE id = ?', [leaveRequestId], async (fetchErr, rows) => {
    if (fetchErr || !rows.length) return res.status(404).json({ error: 'Leave request not found' });
    const request = rows[0];

    if (Number(request.status) !== 0) {
      return res.status(409).json({
        error: `Cannot action this request. Current status is ${request.status}; only Pending (0) requests can be actioned by the supervisor.`,
      });
    }

    // Verify supervisor has authority over the employee's department
    const verifySQL = `
      SELECT sa.departmentCode, sa.role
      FROM supervisor_assignment sa
      INNER JOIN department_assignment da
        ON da.code = sa.departmentCode
        AND CAST(da.employeeNumber AS CHAR) = CAST(? AS CHAR)
      WHERE sa.supervisorEmployeeNumber = ?
      LIMIT 1
    `;
    db.query(verifySQL, [request.employeeNumber, supervisorEmployeeNumber], async (vErr, vRows) => {
      if (vErr) return res.status(500).json({ error: 'Failed to verify supervisor authority' });
      if (!vRows.length) {
        return res.status(403).json({
          error: 'You do not have supervisor authority over this employee\'s department.',
        });
      }
      const supRole        = vRows[0].role;
      const departmentCode = vRows[0].departmentCode;

      // Update leave_request status
      db.query(
        'UPDATE leave_request SET status = ? WHERE id = ?',
        [Number(newStatus), leaveRequestId],
        async (updateErr) => {
          if (updateErr) {
            logAudit({ employeeNumber: actorEmpNum }, 'Supervisor Action Failed', 'leave_request', leaveRequestId, request.employeeNumber);
            return res.status(500).json({ error: 'Failed to update leave request status' });
          }

          const actionLabel = Number(newStatus) === 1 ? 'approved' : 'denied';
          try {
            const [supName, empName, leaveDescRes] = await Promise.all([
              getEmployeeFullName(supervisorEmployeeNumber),
              getEmployeeFullName(request.employeeNumber),
              new Promise((resolve) =>
                db.query(
                  'SELECT leave_description FROM leave_table WHERE leave_code = ? LIMIT 1',
                  [request.leave_code],
                  (e, r) => resolve((r && r[0] && r[0].leave_description) || request.leave_code),
                ),
              ),
            ]);
            const supDisplay = formatUserDisplayName(supervisorEmployeeNumber, supName);
            const empDisplay = formatUserDisplayName(request.employeeNumber, empName);
            const actionMsg  = Number(newStatus) === 1
              ? `${supRole} ${supDisplay} approved ${empDisplay}'s ${leaveDescRes} request (leave date: ${request.leave_date}).`
              : `${supRole} ${supDisplay} denied ${empDisplay}'s ${leaveDescRes} request (leave date: ${request.leave_date}).${remarks ? ' Reason: ' + remarks : ''}`;

            logAudit(
              { employeeNumber: actorEmpNum },
              `Supervisor ${actionLabel === 'approved' ? 'Approved' : 'Denied'} Leave - ${leaveDescRes}`,
              'leave_request',
              leaveRequestId,
              request.employeeNumber,
            );
            await insertTransactionLog(
              String(request.employeeNumber),
              actionMsg,
              actorEmpNum,
              {
                action: `supervisor_${actionLabel}`,
                leave_request_id: leaveRequestId,
                leave_code: request.leave_code,
                leave_date: request.leave_date,
                supervisor_role: supRole,
                departmentCode,
                remarks: remarks || null,
              },
            );
          } catch (e) { console.error('[supervisor-leave] action log error:', e.message); }

          res.json({
            message: `Leave request ${actionLabel} by ${supRole}.`,
            id:     leaveRequestId,
            status: Number(newStatus),
          });
        },
      );
    });
  });
});

/**
 * PUT /api/supervisor-leave/bulk-action
 * Bulk approve or deny by supervisor.
 * Body: { ids: [1,2,3], newStatus: 1|3, supervisorEmployeeNumber, remarks? }
 */
router.put('/api/supervisor-leave/bulk-action', authenticateToken, async (req, res) => {
  const { ids, newStatus, supervisorEmployeeNumber, remarks } = req.body;
  const actorEmpNum = getActorEmployeeNumber(req, supervisorEmployeeNumber);

  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids must be a non-empty array' });
  if (![1, 3].includes(Number(newStatus))) return res.status(400).json({ error: 'newStatus must be 1 or 3' });
  if (!supervisorEmployeeNumber) return res.status(400).json({ error: 'supervisorEmployeeNumber is required' });

  const placeholders = ids.map(() => '?').join(',');
  db.query(
    `SELECT lr.id, lr.employeeNumber, lr.leave_code, lr.leave_date, lr.status, lt.leave_description
     FROM leave_request lr
     LEFT JOIN leave_table lt ON lt.leave_code = lr.leave_code
     WHERE lr.id IN (${placeholders})`,
    ids,
    async (fetchErr, requests) => {
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });
      if (!requests.length) return res.status(404).json({ error: 'No requests found' });

      // Validate only pending ones
      const pending = requests.filter((r) => Number(r.status) === 0);
      if (!pending.length) return res.status(409).json({ error: 'None of the selected requests are in Pending status.' });

      // Verify supervisor authority over all employees
      const empNums      = [...new Set(pending.map((r) => r.employeeNumber))];
      const empPlaceholders = empNums.map(() => '?').join(',');
      const verifySql = `
        SELECT DISTINCT da.employeeNumber
        FROM supervisor_assignment sa
        INNER JOIN department_assignment da ON da.code = sa.departmentCode
        WHERE sa.supervisorEmployeeNumber = ?
          AND CAST(da.employeeNumber AS CHAR) IN (${empPlaceholders})
      `;
      db.query(verifySql, [supervisorEmployeeNumber, ...empNums.map(String)], async (vErr, vRows) => {
        if (vErr) return res.status(500).json({ error: 'Failed to verify supervisor authority' });
        const authorizedEmps = new Set(vRows.map((r) => String(r.employeeNumber)));
        const unauthorized   = empNums.filter((n) => !authorizedEmps.has(String(n)));
        if (unauthorized.length) {
          return res.status(403).json({ error: `Not authorized for employees: ${unauthorized.join(', ')}` });
        }

        const pendingIds = pending.map((r) => r.id);
        const idPH       = pendingIds.map(() => '?').join(',');
        db.query(
          `UPDATE leave_request SET status = ? WHERE id IN (${idPH})`,
          [Number(newStatus), ...pendingIds],
          async (updateErr) => {
            if (updateErr) return res.status(500).json({ error: 'Bulk update failed' });
            const actionLabel = Number(newStatus) === 1 ? 'approved' : 'denied';
            try {
              const [supName] = await Promise.all([getEmployeeFullName(supervisorEmployeeNumber)]);
              const supDisplay = formatUserDisplayName(supervisorEmployeeNumber, supName);
              const [supRole]  = await new Promise((resolve) =>
                db.query(
                  'SELECT role FROM supervisor_assignment WHERE supervisorEmployeeNumber = ? LIMIT 1',
                  [supervisorEmployeeNumber],
                  (e, r) => resolve([r && r[0] && r[0].role ? r[0].role : 'Supervisor']),
                ),
              );
              logAudit(
                { employeeNumber: actorEmpNum },
                `Supervisor Bulk ${actionLabel === 'approved' ? 'Approve' : 'Deny'} Leave (${pendingIds.length} requests)`,
                'leave_request',
                null,
                supervisorEmployeeNumber,
              );
              await Promise.all(
                pending.map(async (r) => {
                  const empName = await getEmployeeFullName(r.employeeNumber);
                  const empDisplay = formatUserDisplayName(r.employeeNumber, empName);
                  const msg = `${supRole} ${supDisplay} bulk ${actionLabel} ${empDisplay}'s ${r.leave_description || r.leave_code} request (leave date: ${r.leave_date}).${remarks ? ' Reason: ' + remarks : ''}`;
                  return insertTransactionLog(String(r.employeeNumber), msg, actorEmpNum, {
                    action: `supervisor_bulk_${actionLabel}`,
                    leave_request_id: r.id,
                    leave_code: r.leave_code,
                    leave_date: r.leave_date,
                    supervisor_role: supRole,
                    remarks: remarks || null,
                  });
                }),
              );
            } catch (e) { console.error('[supervisor-leave] bulk action log error:', e.message); }
            res.json({ message: `${pendingIds.length} request(s) ${actionLabel} by supervisor.`, updated: pendingIds.length, newStatus: Number(newStatus) });
          },
        );
      });
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D — Department employee list  (for supervisor's dashboard overview)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/supervisor-leave/employees/:supervisorEmployeeNumber
 * Returns all employees under the supervisor's department(s), with leave summary.
 */
router.get('/api/supervisor-leave/employees/:supervisorEmployeeNumber', authenticateToken, (req, res) => {
  const { supervisorEmployeeNumber } = req.params;
  const deptSql = `
    SELECT departmentCode FROM supervisor_assignment WHERE supervisorEmployeeNumber = ?
  `;
  db.query(deptSql, [supervisorEmployeeNumber], (err, depts) => {
    if (err) return res.status(500).json({ error: 'Failed to resolve supervisor departments' });
    if (!depts.length) return res.json([]);
    const codes        = depts.map((d) => d.departmentCode);
    const placeholders = codes.map(() => '?').join(',');
    const sql = `
      SELECT
        da.employeeNumber,
        da.code AS departmentCode,
        dt.description AS departmentDescription,
        CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) AS employeeName,
        (SELECT COUNT(*) FROM leave_request lr WHERE CAST(lr.employeeNumber AS CHAR) = CAST(da.employeeNumber AS CHAR) AND lr.status = 0) AS pendingCount,
        (SELECT COUNT(*) FROM leave_request lr WHERE CAST(lr.employeeNumber AS CHAR) = CAST(da.employeeNumber AS CHAR) AND lr.status = 1) AS supervisorApprovedCount,
        (SELECT COUNT(*) FROM leave_request lr WHERE CAST(lr.employeeNumber AS CHAR) = CAST(da.employeeNumber AS CHAR) AND lr.status = 2) AS hrApprovedCount
      FROM department_assignment da
      LEFT JOIN department_table dt ON dt.code = da.code
      LEFT JOIN person_table p      ON p.agencyEmployeeNum = da.employeeNumber
      WHERE da.code IN (${placeholders})
      ORDER BY da.code, p.lastName, p.firstName
    `;
    db.query(sql, codes, (err2, rows) => {
      if (err2) return res.status(500).json({ error: 'Failed to fetch department employees' });
      res.json(Array.isArray(rows) ? rows : []);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION E — Transaction log fetch for supervisor view
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/supervisor-leave/transactions/:supervisorEmployeeNumber
 * Returns transaction logs for employees under the supervisor's departments.
 */
router.get('/api/supervisor-leave/transactions/:supervisorEmployeeNumber', authenticateToken, (req, res) => {
  const { supervisorEmployeeNumber } = req.params;
  db.query(
    'SELECT departmentCode FROM supervisor_assignment WHERE supervisorEmployeeNumber = ?',
    [supervisorEmployeeNumber],
    (err, depts) => {
      if (err) return res.status(500).json({ error: 'Failed to resolve departments' });
      if (!depts.length) return res.json([]);
      const codes = depts.map((d) => d.departmentCode);
      const ph    = codes.map(() => '?').join(',');
      const sql   = `
        SELECT DISTINCT tt.*
        FROM transaction_table tt
        INNER JOIN department_assignment da
          ON CAST(da.employeeNumber AS CHAR) = CAST(tt.employee_id AS CHAR)
          AND da.code IN (${ph})
        ORDER BY tt.id DESC
        LIMIT 500
      `;
      db.query(sql, codes, (err2, rows) => {
        if (err2) return res.status(500).json({ error: 'Failed to fetch transaction logs' });
        res.json(Array.isArray(rows) ? rows : []);
      });
    },
  );
});

module.exports = router;