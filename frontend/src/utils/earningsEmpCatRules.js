/**
 * Rules for which earnings "credit" tabs and deduction pools apply, based on
 * `employment_category` join shape: { parentGroup, typeName, label, colorHex }.
 * Adjust string checks if your `employment_type_config.parentGroup` values differ.
 */

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

/** True when category is a Teaching group, not e.g. "Non-teaching" (substring trap). */
function isTeachingEmploymentGroup(parentGroup, typeName) {
  const combined = `${norm(parentGroup)} ${norm(typeName)}`;
  if (!combined.trim()) return false;
  if (/\bnon[\s-]*teaching\b/.test(combined)) return false;
  return /\bteaching\b/.test(combined);
}

/** Service Credit (SC) accrual / SC-first absence pool — Teaching cohort only. */
export function employmentCategoryAllowsServiceCredit(empCat) {
  if (!empCat || typeof empCat !== "object") return false;
  return isTeachingEmploymentGroup(empCat.parentGroup, empCat.typeName);
}

/**
 * Compensatory Time Off (CTO) accrual — most active staff; narrow here if some
 * categories never earn CTO (extend the negative list as needed).
 */
export function employmentCategoryAllowsCompensatoryTimeOff(empCat) {
  if (!empCat || typeof empCat !== "object") return true;
  const pg = norm(empCat.parentGroup);
  const tn = norm(empCat.typeName);
  if (pg.includes("retire") || tn.includes("retire")) return false;
  return true;
}

export function employmentCategoryLabel(empCat) {
  if (!empCat) return "";
  if (typeof empCat === "string") return empCat;
  return String(empCat.label || "").trim();
}
