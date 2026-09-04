/**

 * Grants / revokes supervisor module page_access when supervisor_assignment changes.

 * Login role (staff, etc.) is unchanged — only page_access is added/removed.

 */

const db = require("../db");

const socketService = require("../socket/socketService");

const {
  notifySupervisorAssignmentChanged,
} = require("../socket/socketService");

const LEAVE_SUPERVISOR_IDENTIFIER = "leave-request-supervisor";

const DTR_SUPERVISOR_IDENTIFIER = "daily-time-record-supervisor";
const OFFICIAL_TIME_SUPERVISOR_IDENTIFIER = "official-time-supervisor";

const DEFAULT_PRIVILEGE = "1";

/** Pages whose page_access is owned by supervisor_assignment — not UsersList. */

const ASSIGNMENT_MANAGED_IDENTIFIERS = [
  LEAVE_SUPERVISOR_IDENTIFIER,

  DTR_SUPERVISOR_IDENTIFIER,
  OFFICIAL_TIME_SUPERVISOR_IDENTIFIER,
];

const SUPERVISOR_PAGE_SEEDS = [
  {
    identifier: LEAVE_SUPERVISOR_IDENTIFIER,

    page_name: "Leave Request Approval - Supervisor",

    page_description: "Supervisor leave approval for assigned departments",

    page_url: "/leave-request-supervisor",

    page_group: "staff,administrator,superadmin,technical",
  },

  {
    identifier: DTR_SUPERVISOR_IDENTIFIER,

    page_name: "Daily Time Record - Supervisor",

    page_description: "Attendance Management",

    page_url: "/daily-time-record-supervisor",

    page_group: "staff,administrator,superadmin,technical",
  },

  {
    identifier: OFFICIAL_TIME_SUPERVISOR_IDENTIFIER,

    page_name: "Official Time - Supervisor",

    page_description: "Official Time Management",

    page_url: "/official-time-supervisor",

    page_group: "staff,administrator,superadmin,technical",
  },
];

/** Match employee numbers including numeric IDs with/without leading zeros (e.g. 1234 vs 001234). */

const empMatchSql = (column) =>
  `(

    TRIM(CAST(${column} AS CHAR)) = TRIM(CAST(? AS CHAR))

    OR (

      TRIM(CAST(${column} AS CHAR)) REGEXP '^[0-9]+$'

      AND TRIM(CAST(? AS CHAR)) REGEXP '^[0-9]+$'

      AND CAST(TRIM(${column}) AS UNSIGNED) = CAST(TRIM(?) AS UNSIGNED)

    )

  )`;

const bindEmpMatchParams = (employeeNumber) => {
  const e = String(employeeNumber ?? "").trim();

  return [e, e, e];
};

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);

      resolve(rows);
    });
  });

async function resolveCanonicalEmployeeNumber(employeeNumber) {
  const emp = String(employeeNumber || "").trim();

  if (!emp) return null;

  const rows = await queryAsync(
    `SELECT employeeNumber FROM users WHERE ${empMatchSql("employeeNumber")} LIMIT 1`,

    bindEmpMatchParams(emp),
  );

  return rows[0]?.employeeNumber ? String(rows[0].employeeNumber).trim() : emp;
}

/**

 * Load supervisor_assignment rows for an employee (tries canonical + raw id).

 */

async function fetchSupervisorDepartments(employeeNumber) {
  const emp = String(employeeNumber || "").trim();

  if (!emp) return { supervisorEmployeeNumber: null, departments: [] };

  const canonical = await resolveCanonicalEmployeeNumber(emp);

  const candidates = [...new Set([canonical, emp].filter(Boolean))];

  for (const candidate of candidates) {
    const rows = await queryAsync(
      `SELECT sa.departmentCode, sa.role, dt.description AS departmentDescription

       FROM supervisor_assignment sa

       LEFT JOIN department_table dt ON dt.code = sa.departmentCode

       WHERE ${empMatchSql("sa.supervisorEmployeeNumber")} AND sa.status = 0`,

      bindEmpMatchParams(candidate),
    );

    if (rows.length) {
      return {
        supervisorEmployeeNumber: candidate,

        departments: rows.map((r) => ({
          code: r.departmentCode,

          description: r.departmentDescription || r.departmentCode,

          role: r.role,
        })),
      };
    }
  }

  return { supervisorEmployeeNumber: null, departments: [] };
}

async function ensureSupervisorPage(componentIdentifier) {
  const seed = SUPERVISOR_PAGE_SEEDS.find(
    (p) => p.identifier === componentIdentifier,
  );

  if (!seed) return null;

  let rows = await queryAsync(
    "SELECT id, page_name, page_description, page_url, component_identifier FROM pages WHERE component_identifier = ? LIMIT 1",

    [componentIdentifier],
  );

  if (rows[0]) return rows[0];

  await queryAsync(
    `INSERT INTO pages (page_name, page_description, page_url, page_group, component_identifier)

     SELECT ?, ?, ?, ?, ?

     WHERE NOT EXISTS (SELECT 1 FROM pages WHERE component_identifier = ?)`,

    [
      seed.page_name,

      seed.page_description,

      seed.page_url,

      seed.page_group,

      seed.identifier,

      seed.identifier,
    ],
  );

  rows = await queryAsync(
    "SELECT id, page_name, page_description, page_url, component_identifier FROM pages WHERE component_identifier = ? LIMIT 1",

    [componentIdentifier],
  );

  return rows[0] || null;
}

async function countSupervisorAssignments(employeeNumber) {
  const rows = await queryAsync(
    `SELECT COUNT(*) AS cnt FROM supervisor_assignment WHERE ${empMatchSql("supervisorEmployeeNumber")} AND status = 0`,

    bindEmpMatchParams(employeeNumber),
  );

  return Number(rows[0]?.cnt || 0);
}

function notifyGranted(employeeNumber, page) {
  socketService.notifyPageAccessGranted(employeeNumber, {
    page_id: page.id,

    page_name: page.page_name,

    component_identifier: page.component_identifier,
  });
}

function notifyRevoked(employeeNumber, page) {
  socketService.notifyPageAccessRevoked(employeeNumber, {
    page_id: page.id,

    page_name: page.page_name,

    component_identifier: page.component_identifier,
  });
}

async function grantSupervisorPageAccess(employeeNumber, componentIdentifier) {
  const canonical = await resolveCanonicalEmployeeNumber(employeeNumber);

  if (!canonical) return;

  const page = await ensureSupervisorPage(componentIdentifier);

  if (!page) {
    console.warn(
      `[supervisorPageAccess] Could not register page: ${componentIdentifier}`,
    );

    return;
  }

  const existing = await queryAsync(
    `SELECT page_id, page_privilege, expires_at FROM page_access

     WHERE ${empMatchSql("employeeNumber")} AND page_id = ? LIMIT 1`,

    [...bindEmpMatchParams(canonical), page.id],
  );

  if (existing.length > 0) {
    const privilege = String(existing[0].page_privilege || "0");

    if (privilege === "0" || privilege === "") {
      await queryAsync(
        `UPDATE page_access SET page_privilege = ?, expires_at = NULL

         WHERE ${empMatchSql("employeeNumber")} AND page_id = ?`,

        [DEFAULT_PRIVILEGE, ...bindEmpMatchParams(canonical), page.id],
      );

      notifyGranted(canonical, page);
    }

    return;
  }

  await queryAsync(
    "INSERT INTO page_access (employeeNumber, page_id, page_privilege, expires_at) VALUES (?, ?, ?, NULL)",

    [canonical, page.id, DEFAULT_PRIVILEGE],
  );

  notifyGranted(canonical, page);
}

async function revokeSupervisorPageAccess(employeeNumber, componentIdentifier) {
  const canonical = await resolveCanonicalEmployeeNumber(employeeNumber);

  if (!canonical) return false;

  const page = await ensureSupervisorPage(componentIdentifier);

  if (!page) return false;

  const result = await queryAsync(
    `DELETE FROM page_access WHERE ${empMatchSql("employeeNumber")} AND page_id = ?`,

    [...bindEmpMatchParams(canonical), page.id],
  );

  if (result.affectedRows > 0) {
    notifyRevoked(canonical, page);

    return true;
  }

  return false;
}

/** Grant all supervisor-module pages (leave + DTR). */

async function grantSupervisorLeavePageAccess(employeeNumber) {
  for (const identifier of ASSIGNMENT_MANAGED_IDENTIFIERS) {
    await grantSupervisorPageAccess(employeeNumber, identifier);
  }
}

/** Remove all supervisor-module page_access when no assignments remain. */

async function revokeSupervisorLeavePageAccessIfUnassigned(employeeNumber) {
  const canonical = await resolveCanonicalEmployeeNumber(employeeNumber);

  if (!canonical) return false;

  const remaining = await countSupervisorAssignments(canonical);

  if (remaining > 0) return false;

  let revoked = false;

  for (const identifier of ASSIGNMENT_MANAGED_IDENTIFIERS) {
    const didRevoke = await revokeSupervisorPageAccess(canonical, identifier);

    revoked = revoked || didRevoke;
  }

  return revoked;
}

function isAssignmentManagedIdentifier(componentIdentifier) {
  return ASSIGNMENT_MANAGED_IDENTIFIERS.includes(
    String(componentIdentifier || "").trim(),
  );
}

/**

 * Reject manual page_access changes for supervisor-assignment-managed pages.

 */

async function assertNotAssignmentManagedPage(pageId) {
  const rows = await queryAsync(
    "SELECT component_identifier, page_name FROM pages WHERE id = ? LIMIT 1",

    [pageId],
  );

  const page = rows[0];

  if (!page) {
    return { ok: false, status: 404, error: "Page not found" };
  }

  if (isAssignmentManagedIdentifier(page.component_identifier)) {
    return {
      ok: false,

      status: 403,

      error:
        `Access to "${page.page_name}" is managed via Supervisor Assignment. ` +
        "Add or remove department assignments there — manual page access changes are not allowed.",
    };
  }

  return { ok: true };
}

async function expireSupervisorAssignments() {
  try {
    // Find rows that are due to expire but haven't been marked yet
    const rows = await queryAsync(
      `SELECT id, supervisorEmployeeNumber, departmentCode, role
       FROM supervisor_assignment
       WHERE end < NOW() AND status = 0`,
    );

    if (!rows || !rows.length) return; // nothing expired this tick

    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");

    await queryAsync(
      `UPDATE supervisor_assignment
       SET status = 1, updatedAt = NOW()
       WHERE id IN (${placeholders})`,
      ids,
    );

    console.log(
      `[expire-supervisor] expired ${rows.length} assignment(s): ${ids.join(", ")}`,
    );

    // Notify the UI for every expired row.
    rows.forEach((r) => {
      try {
        notifySupervisorAssignmentChanged("expired", {
          id: r.id,
          supervisorEmployeeNumber: r.supervisorEmployeeNumber,
          departmentCode: r.departmentCode,
          role: r.role,
        });
      } catch (e) {
        console.error("[expire-supervisor] socket notify error:", e.message);
      }
    });
  } catch (err) {
    console.error("[expire-supervisor] error:", err.message);
  }
}

async function hasSupervisorAssignment(employeeNumber) {
  const emp = String(employeeNumber || "").trim();

  if (!emp) return false;

  const canonical = await resolveCanonicalEmployeeNumber(emp);
  const candidates = [...new Set([canonical, emp].filter(Boolean))];

  for (const candidate of candidates) {
    const rows = await queryAsync(
      `SELECT id
       FROM supervisor_assignment
       WHERE ${empMatchSql("supervisorEmployeeNumber")}
       LIMIT 1`,
      bindEmpMatchParams(candidate),
    );

    if (rows.length) {
      return true;
    }
  }

  return false;
}

module.exports = {
  LEAVE_SUPERVISOR_IDENTIFIER,

  DTR_SUPERVISOR_IDENTIFIER,
  OFFICIAL_TIME_SUPERVISOR_IDENTIFIER,
  ASSIGNMENT_MANAGED_IDENTIFIERS,
  empMatchSql,
  bindEmpMatchParams,

  resolveCanonicalEmployeeNumber,

  fetchSupervisorDepartments,
  grantSupervisorPageAccess,

  grantSupervisorLeavePageAccess,

  revokeSupervisorLeavePageAccessIfUnassigned,

  isAssignmentManagedIdentifier,

  assertNotAssignmentManagedPage,
  expireSupervisorAssignments,
  hasSupervisorAssignment,
};
