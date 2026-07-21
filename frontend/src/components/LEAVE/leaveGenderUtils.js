/**
 * Shared leave-type gender rules — same as Leave Assignment.
 * `gender_restriction` comes from the Leave Table API (`GET /leaveRoute/leave_table`),
 * the same rows admins maintain in LeaveTable.jsx (Male / Female / no restriction).
 */

/**
 * @param {object|null|undefined} lt Row from leave table (must include gender_restriction when restricted)
 * @returns {string|null} Lowercase "male" | "female", or null if no restriction
 */
export const getLeaveGenderRestriction = (lt) => {
  if (!lt?.gender_restriction) return null;
  const r = String(lt.gender_restriction).trim().toLowerCase();
  return r || null;
};

/**
 * Same logic as LeaveAssignment — employee gender must match; m/f accepted.
 * @param {object} lt leave table row
 * @param {string|null|undefined} g employee sex / gender from personnel
 */
export const isLeaveAllowedForGender = (lt, g) => {
  const r = getLeaveGenderRestriction(lt);
  if (!r) return true;
  if (!g) return false;
  const gl = String(g).trim().toLowerCase();
  if (r === "male") return gl === "male" || gl === "m";
  if (r === "female") return gl === "female" || gl === "f";
  return true;
};

/** For Earnings UI when filtering leave rows */
export const genderIneligibilityReason = (lt, g) => {
  const r = getLeaveGenderRestriction(lt);
  if (!r) return null;
  if (g == null || !String(g).trim()) return "Not eligible — employee gender is not on file.";
  if (isLeaveAllowedForGender(lt, g)) return null;
  const pretty = r === "male" ? "Male only" : r === "female" ? "Female only" : r;
  return `Not eligible — ${pretty}.`;
};
