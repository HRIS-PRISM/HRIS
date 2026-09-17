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

/** True when category is Academic / Teaching, not Non-Academic or Non-Teaching. */
function isTeachingEmploymentGroup(parentGroup, typeName) {
  const combined = `${norm(parentGroup)} ${norm(typeName)}`;
  if (!combined.trim()) return false;
  if (/non[\s-]*academic|non[\s-]*teaching/.test(combined)) return false;
  if (/\bacademic\b/.test(combined)) return true;
  return /\bteaching\b/.test(combined);
}

const employmentBlob = (categoryOrMeta) => {
  if (categoryOrMeta == null || categoryOrMeta === '') return '';
  if (typeof categoryOrMeta !== 'object') return norm(categoryOrMeta);
  return norm(
    [
      categoryOrMeta.parentGroup,
      categoryOrMeta.typeName,
      categoryOrMeta.label,
      categoryOrMeta.categoryLabel,
    ]
      .filter(Boolean)
      .join(' '),
  );
};

/**
 * Employment classification → attendance formula.
 * Current labels: Non-Academic, Academic - 30 Hours / Academic | 30 Hours,
 * Academic - 40 Hours / Academic | 40 Hours.
 * Legacy names (Non-Teaching, 30hrs, Designated) still match.
 * Numeric 2/3/4 is legacy only — employment_type_config ids must not use it.
 */
export function resolveAttendanceModuleFromEmployment(categoryOrMeta) {
  if (categoryOrMeta == null || categoryOrMeta === '') return null;

  if (typeof categoryOrMeta !== 'object') {
    const n = Number(categoryOrMeta);
    if (n === 2) return 'NON_TEACHING';
    if (n === 3) return 'FACULTY_30HRS';
    if (n === 4) return 'DESIGNATED_40HRS';
    return null;
  }

  const blob = employmentBlob(categoryOrMeta);
  if (blob) {
    if (/40\s*hours?|designated/.test(blob)) return 'DESIGNATED_40HRS';
    if (/30\s*hours?|\b30\s*hrs?\b/.test(blob)) return 'FACULTY_30HRS';
    if (/non[\s-]*academic|non[\s-]*teaching/.test(blob)) return 'NON_TEACHING';
    if (/\bacademic\b|\bteaching\b/.test(blob)) return null;
  }

  const id = categoryOrMeta.employmentCategory ?? categoryOrMeta.id;
  if (id != null && id !== '' && !categoryOrMeta.parentGroup && !categoryOrMeta.label) {
    return resolveAttendanceModuleFromEmployment(id);
  }
  return null;
}

/** Suspension personnel_scope for the current employment classification. */
export function personnelScopeFromEmployment(categoryOrMeta) {
  const mod = resolveAttendanceModuleFromEmployment(categoryOrMeta);
  if (mod === 'NON_TEACHING') return 'non_teaching';
  if (mod === 'FACULTY_30HRS' || mod === 'DESIGNATED_40HRS') return 'academic';
  const blob = employmentBlob(categoryOrMeta);
  if (/non[\s-]*academic|non[\s-]*teaching/.test(blob)) return 'non_teaching';
  if (/\bacademic\b/.test(blob)) return 'academic';
  return null;
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
