/**
 * Single source of truth for converting leave days <-> hours.
 *
 * Leave earnings are posted as 1.25 days = 10 hours (8-hour day), and the CSC conversion
 * tables treat 8 hours as one day, so every deduction must use the same rate or balances
 * drift. leave_table.leave_hours is a leave-type ENTITLEMENT (e.g. ML 840 = 105 days x 8)
 * and must never be used as a per-day rate.
 *
 * Per-category overrides (compressed / 30-hour schedules) are pending HR confirmation.
 * Once confirmed, map employment_type_config.id -> hours per day below.
 */

const db = require("../db");

const DEFAULT_HOURS_PER_DAY = 8;

/** employment_type_config.id -> hours per day. Empty until HR confirms per-category values. */
const HOURS_PER_DAY_BY_EMPLOYMENT_TYPE = {};

const getEmploymentTypeId = (employeeNumber) =>
  new Promise((resolve) => {
    db.query(
      `SELECT COALESCE(ec.employmentCategory, u.employmentCategory) AS type_id
       FROM users u
       LEFT JOIN employment_category ec
         ON CAST(ec.employeeNumber AS CHAR) = CAST(u.employeeNumber AS CHAR)
       WHERE CAST(u.employeeNumber AS CHAR) = CAST(? AS CHAR)
       LIMIT 1`,
      [String(employeeNumber || "").trim()],
      (err, rows) => {
        if (err || !rows?.length) return resolve(null);
        const n = parseInt(rows[0].type_id, 10);
        resolve(Number.isFinite(n) ? n : null);
      },
    );
  });

/**
 * @returns {Promise<{ hoursPerDay: number, rateSource: "employment_type" | "default" }>}
 */
const resolveHoursPerDay = async (employeeNumber) => {
  if (Object.keys(HOURS_PER_DAY_BY_EMPLOYMENT_TYPE).length && employeeNumber) {
    const typeId = await getEmploymentTypeId(employeeNumber);
    const override = typeId != null ? Number(HOURS_PER_DAY_BY_EMPLOYMENT_TYPE[typeId]) : NaN;
    if (Number.isFinite(override) && override > 0) {
      return { hoursPerDay: override, rateSource: "employment_type" };
    }
  }
  return { hoursPerDay: DEFAULT_HOURS_PER_DAY, rateSource: "default" };
};

module.exports = {
  DEFAULT_HOURS_PER_DAY,
  resolveHoursPerDay,
};
