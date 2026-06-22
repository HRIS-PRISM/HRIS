/**
 * commutationRoute.js
 *
 * Key change vs. previous version:
 *   OLD → UPDATE leave_assignment SET remaining_hours = 0, used_hours = total_hours
 *   NEW → INSERT leave_credit_usage (hours_delta = -remaining)
 *         UPDATE leave_assignment SET commuted = 1   ← lock flag only, no balance mutation
 *
 * Required one-time migration (see migration_leave_credit_usage.sql):
 *   ALTER TABLE leave_assignment ADD COLUMN commuted TINYINT(1) NOT NULL DEFAULT 0;
 *
 *   CREATE TABLE leave_credit_usage (
 *     id INT AUTO_INCREMENT PRIMARY KEY,
 *     leave_assignment_id INT NOT NULL,
 *     source_type VARCHAR(50) NOT NULL,  -- 'commutation' | 'leave_request'
 *     source_id   INT DEFAULT NULL,
 *     hours_delta DECIMAL(10,4) NOT NULL, -- negative = deduction
 *     voided_at   DATETIME DEFAULT NULL,
 *     created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *     KEY idx_lcu_assignment (leave_assignment_id)
 *   );
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const jwt     = require('jsonwebtoken');
const { logAudit } = require('../middleware/auth');

let io;
router.setSocketIO = (socketIO) => { io = socketIO; };

// ─── helpers ──────────────────────────────────────────────────────────────────

const parseDbHours = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const s = String(val).trim();
  if (!s) return 0;
  if (s.includes(':')) {
    const [hh, mm, ss] = s.split(':');
    return (Number(hh) || 0) + (Number(mm) || 0) / 60 + (Number(ss) || 0) / 3600;
  }
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result))),
  );

const getConnection = () =>
  new Promise((resolve, reject) => {
    db.getConnection((err, conn) => (err ? reject(err) : resolve(conn)));
  });

const connQuery = (conn, sql, params = []) =>
  new Promise((resolve, reject) => {
    conn.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });

const getActorEmployeeNumber = (req, fallback = null) => {
  if (req.user?.employeeNumber) return String(req.user.employeeNumber);
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded?.employeeNumber) return String(decoded.employeeNumber);
      if (decoded?.username)       return String(decoded.username);
    } catch (_) { /* ignore */ }
  }
  return fallback ? String(fallback) : 'unknown';
};

const insertTransactionLog = async (employeeId, message) => {
  try {
    await query(
      'INSERT INTO transaction_table (employee_id, message) VALUES (?, ?)',
      [employeeId, message],
    );
  } catch (_) { /* non-fatal */ }
};

const getEmployeeFullName = async (employeeNumber) => {
  try {
    const rows = await query(
      `SELECT CONCAT_WS(' ', firstName, middleName, lastName, nameExtension) AS fullName
         FROM person_table WHERE agencyEmployeeNum = ? LIMIT 1`,
      [employeeNumber],
    );
    return rows[0]?.fullName?.trim() || String(employeeNumber);
  } catch (_) { return String(employeeNumber); }
};

const formatUserDisplayName = (num, name) =>
  name && name !== String(num) ? `${name} (${num})` : String(num);

const emitChange = (eventName) => {
  if (io) { io.emit(eventName); console.log(`[Socket.IO] Emitted ${eventName}`); }
};

let commutedColumnChecked = false;

const ensureCommutedColumn = async () => {
  if (commutedColumnChecked) return true;
  const dbName = process.env.DB_NAME;
  if (!dbName) return false;
  const rows = await query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leave_assignment' AND COLUMN_NAME = 'commuted'`,
    [dbName],
  );
  if (Number(rows[0]?.c) > 0) {
    commutedColumnChecked = true;
    return true;
  }
  await query(
    `ALTER TABLE leave_assignment
     ADD COLUMN commuted TINYINT(1) NOT NULL DEFAULT 0
     COMMENT '1 = locked after transfer to leave_commutation'`,
  );
  commutedColumnChecked = true;
  return true;
};

const markAssignmentCommuted = async (assignmentId) => {
  try {
    await ensureCommutedColumn();
    await query('UPDATE leave_assignment SET commuted = 1 WHERE id = ?', [assignmentId]);
  } catch (err) {
    if (!/unknown column/i.test(err.message)) throw err;
    console.warn('[commute] leave_assignment.commuted column missing — run migrations/add_leave_assignment_commuted.sql');
  }
};

const unmarkAssignmentCommuted = async (assignmentId) => {
  try {
    await ensureCommutedColumn();
    await query('UPDATE leave_assignment SET commuted = 0 WHERE id = ?', [assignmentId]);
  } catch (err) {
    if (!/unknown column/i.test(err.message)) throw err;
  }
};

const parsePeriodMonth = (semester) => {
  const raw = String(semester ?? '').trim();
  if (!raw) return null;
  const n = parseInt(raw.replace(/\D/g, '') || '0', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const hasActiveCommutation = async (assignmentId) => {
  const rows = await query(
    `SELECT id FROM leave_commutation
     WHERE leave_assignment_id = ? AND status != 3
     LIMIT 1`,
    [assignmentId],
  );
  return rows.length > 0;
};

// ─── GET /leave_commutation ───────────────────────────────────────────────────

router.get('/leave_commutation', (req, res) => {
  const sql = `
    SELECT lc.*,
           lt.leave_description,
           CONCAT_WS(' ', p.firstName, p.middleName, p.lastName, p.nameExtension) AS fullName,
           p.firstName, p.lastName,
           DATE_FORMAT(lc.commuted_at, '%Y-%m-%d %H:%i:%s') AS commuted_at_fmt,
           DATE_FORMAT(lc.approved_at, '%Y-%m-%d %H:%i:%s') AS approved_at_fmt
    FROM leave_commutation lc
    LEFT JOIN leave_table  lt ON lc.leave_code     = lt.leave_code
    LEFT JOIN person_table p  ON lc.employeeNumber = p.agencyEmployeeNum
    ORDER BY lc.commuted_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('[GET /leave_commutation]', err.message);
      return res.status(500).json({ error: 'Failed to fetch commutation records: ' + err.message });
    }
    res.json(results);
  });
});

// ─── GET /leave_commutation/employee/:employeeNumber ─────────────────────────

router.get('/leave_commutation/employee/:employeeNumber', (req, res) => {
  const sql = `
    SELECT lc.*,
           lt.leave_description,
           DATE_FORMAT(lc.commuted_at, '%Y-%m-%d %H:%i:%s') AS commuted_at_fmt,
           DATE_FORMAT(lc.approved_at, '%Y-%m-%d %H:%i:%s') AS approved_at_fmt
    FROM leave_commutation lc
    LEFT JOIN leave_table lt ON lc.leave_code = lt.leave_code
    WHERE lc.employeeNumber = ?
    ORDER BY lc.commuted_at DESC
  `;
  db.query(sql, [req.params.employeeNumber], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch records' });
    res.json(results);
  });
});

// ─── GET /leave_commutation/carried-forward/:employeeNumber/:leave_code ───────

router.get('/leave_commutation/carried-forward/:employeeNumber/:leave_code', (req, res) => {
  const { employeeNumber, leave_code } = req.params;
  const sql = `
    SELECT COALESCE(SUM(commuted_hours), 0) AS total_commuted_hours,
           COALESCE(SUM(commuted_days),  0) AS total_commuted_days
    FROM leave_commutation
    WHERE employeeNumber = ?
      AND TRIM(leave_code) = TRIM(?)
      AND status IN (0, 1)
  `;
  db.query(sql, [employeeNumber, leave_code], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to compute carry-forward' });
    res.json({
      commuted_hours: parseDbHours(rows[0]?.total_commuted_hours),
      commuted_days:  parseDbHours(rows[0]?.total_commuted_days),
    });
  });
});

// ─── POST /leave_commutation/commute/:assignmentId ───────────────────────────

router.post('/leave_commutation/commute/:assignmentId', async (req, res) => {
  const { assignmentId } = req.params;
  const { commuted_by, remarks } = req.body || {};
  const actorEmpNum = getActorEmployeeNumber(req, commuted_by);

  try {
    await ensureCommutedColumn();

    // 1. Load the assignment
    const rows = await query('SELECT * FROM leave_assignment WHERE id = ?', [assignmentId]);
    if (!rows.length) return res.status(404).json({ error: 'Leave assignment not found' });

    const asgn = rows[0];

    if (Number(asgn.commuted) === 1) {
      return res.status(400).json({
        error: 'This assignment is already commuted',
        detail: 'This period has already been transferred to Commutation.',
      });
    }

    if (await hasActiveCommutation(asgn.id)) {
      await markAssignmentCommuted(asgn.id);
      return res.status(400).json({
        error: 'This assignment is already commuted',
        detail: 'A commutation record already exists for this assignment.',
      });
    }

    // 2. Compute effective remaining (base + any prior usage transactions)
    const usageRows = await query(
      'SELECT * FROM leave_credit_usage WHERE leave_assignment_id = ? AND voided_at IS NULL',
      [asgn.id],
    );
    const priorDelta     = usageRows.reduce((s, u) => s + parseDbHours(u.hours_delta), 0);
    const remainingHours = Math.max(0, parseDbHours(asgn.remaining_hours) + priorDelta);

    if (remainingHours <= 0) {
      return res.status(400).json({
        error:  'No remaining hours to commute',
        detail: 'This assignment already has zero effective remaining hours.',
      });
    }

    const commutedDays = remainingHours / 8;
    const periodMonth  = parsePeriodMonth(asgn.period_semester);

    // 3–5. Insert commutation + ledger + lock flag (transactional)
    const conn = await getConnection();
    let commutationId;
    try {
      await connQuery(conn, 'START TRANSACTION');

      const insertResult = await connQuery(
        conn,
        `INSERT INTO leave_commutation
           (leave_assignment_id, employeeNumber, leave_code, period_year, period_semester,
            commuted_hours, commuted_days, status, commuted_by, commuted_at, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), ?)`,
        [
          asgn.id,
          asgn.employeeNumber,
          asgn.leave_code,
          asgn.period_year,
          asgn.period_semester || null,
          remainingHours,
          commutedDays,
          commuted_by || null,
          remarks     || null,
        ],
      );
      commutationId = insertResult.insertId;

      await connQuery(
        conn,
        `INSERT INTO leave_credit_usage
           (leave_assignment_id, employee_number, leave_code, period_year, period_month,
            hours_delta, source_type, source_id, remarks, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'commutation', ?, ?, ?, NOW())`,
        [
          asgn.id,
          String(asgn.employeeNumber || ''),
          String(asgn.leave_code || ''),
          asgn.period_year ?? null,
          periodMonth,
          -remainingHours,
          commutationId,
          remarks || `Commutation of ${remainingHours.toFixed(3)} hrs`,
          actorEmpNum,
        ],
      );

      await ensureCommutedColumn();
      const usedHrs = parseDbHours(asgn.used_hours);
      const allocHrs = parseDbHours(asgn.allocated_hours);
      await connQuery(
        conn,
        `UPDATE leave_assignment
         SET commuted = 1,
             remaining_hours = 0,
             carried_forward_hours = 0,
             total_hours = ?
         WHERE id = ?`,
        [Math.max(0, usedHrs + allocHrs), asgn.id],
      );
      await connQuery(conn, 'COMMIT');
    } catch (txErr) {
      try { await connQuery(conn, 'ROLLBACK'); } catch (_) { /* ignore */ }
      throw txErr;
    } finally {
      conn.release();
    }

    // 6. Audit + transaction log
    try {
      const ltRows = await query(
        'SELECT leave_description FROM leave_table WHERE leave_code = ? LIMIT 1',
        [asgn.leave_code],
      );
      const leaveDesc       = ltRows[0]?.leave_description || asgn.leave_code;
      const commutedDaysStr = commutedDays.toFixed(2);

      logAudit(
        { employeeNumber: actorEmpNum },
        `Commute Leave - ${leaveDesc} (${commutedDaysStr} days)`,
        'leave_commutation',
        commutationId,
        asgn.employeeNumber,
      );

      const [actorName, empName] = await Promise.all([
        getEmployeeFullName(actorEmpNum),
        getEmployeeFullName(String(asgn.employeeNumber)),
      ]);
      await insertTransactionLog(
        String(asgn.employeeNumber),
        `${formatUserDisplayName(actorEmpNum, actorName)} transferred ${leaveDesc} ` +
        `(${commutedDaysStr} days) to Leave Commutation for ` +
        `${formatUserDisplayName(String(asgn.employeeNumber), empName)}`,
      );
    } catch (logErr) {
      console.error('[commute] log error:', logErr.message);
    }

    emitChange('leaveCommutationChanged');
    emitChange('leaveAssignmentChanged');

    res.json({
      message:             'Leave commuted successfully',
      commutation_id:      commutationId,
      leave_assignment_id: asgn.id,
      employeeNumber:      asgn.employeeNumber,
      leave_code:          asgn.leave_code,
      period_year:         asgn.period_year,
      period_semester:     asgn.period_semester,
      commuted_hours:      remainingHours,
      commuted_days:       commutedDays,
      status:              0,
    });
  } catch (err) {
    console.error('[POST /commute] error:', err.message);
    res.status(500).json({ error: 'Commutation failed: ' + err.message });
  }
});

// ─── PUT /leave_commutation/:id ───────────────────────────────────────────────

router.put('/leave_commutation/:id', (req, res) => {
  const { id } = req.params;
  const { status, approved_by, remarks } = req.body;

  db.query('SELECT * FROM leave_commutation WHERE id = ?', [id], (err, rows) => {
    if (err)          return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Record not found' });

    const current    = rows[0];
    const newStatus  = status !== undefined ? Number(status) : current.status;
    const approvedAt =
      newStatus === 1 && current.status !== 1 ? new Date() : current.approved_at;

    db.query(
      `UPDATE leave_commutation
          SET status = ?, approved_by = ?, approved_at = ?, remarks = ?
        WHERE id = ?`,
      [
        newStatus,
        approved_by !== undefined ? approved_by : current.approved_by,
        approvedAt,
        remarks     !== undefined ? remarks     : current.remarks,
        id,
      ],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        emitChange('leaveCommutationChanged');
        res.json({ id, status: newStatus, approved_by, approved_at: approvedAt, remarks });
      },
    );
  });
});

// ─── DELETE /leave_commutation/:id ────────────────────────────────────────────
// Voids the usage row and unlocks the assignment so the balance is restored.

router.delete('/leave_commutation/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await query(
      `UPDATE leave_credit_usage SET voided_at = NOW()
        WHERE source_type = 'commutation' AND source_id = ?`,
      [id],
    );

    const lcRows = await query(
      'SELECT leave_assignment_id FROM leave_commutation WHERE id = ?',
      [id],
    );
    if (lcRows.length) {
      await unmarkAssignmentCommuted(lcRows[0].leave_assignment_id);
    }

    await query('DELETE FROM leave_commutation WHERE id = ?', [id]);

    emitChange('leaveCommutationChanged');
    emitChange('leaveAssignmentChanged');
    res.json({ message: 'Commutation record deleted and balance restored' });
  } catch (err) {
    console.error('[DELETE /leave_commutation]', err.message);
    res.status(500).json({ error: 'Failed to delete record: ' + err.message });
  }
});

module.exports = router;