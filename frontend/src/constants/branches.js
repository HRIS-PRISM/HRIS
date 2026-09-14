/** Campus / branch codes — aligned with users.branch (UsersList). */
export const BRANCHES = [
  { code: null, label: "All branches" },
  { code: 0, label: "Manila" },
  { code: 1, label: "Cavite" },
];

export const BRANCH_OPTIONS_SCOPED = BRANCHES;

/** Parse API / form value → null | 0 | 1 */
export function normalizeBranchCode(value) {
  if (value === null || value === undefined || value === "" || value === "all" || value === "null") {
    return null;
  }
  const n = Number(value);
  if (n === 0 || n === 1) return n;
  return null;
}

export function branchLabel(code) {
  const n = normalizeBranchCode(code);
  if (n === null && (code === null || code === undefined || code === "" || code === "all")) {
    return "All branches";
  }
  const found = BRANCHES.find((b) => b.code === n);
  return found?.label || "All branches";
}

/**
 * Whether a holiday/suspension entry applies to an employee branch.
 * NULL/all on the record = all campuses.
 * Employee with unset branch only gets all-campus records (same idea as personnel_scope).
 */
export function calendarAppliesToBranch(entry, employeeBranch) {
  if (!entry) return false;
  const entryBranch = normalizeBranchCode(entry.branch);
  if (entryBranch === null) return true;
  if (employeeBranch === null || employeeBranch === undefined || employeeBranch === "") {
    return false;
  }
  return Number(entryBranch) === Number(employeeBranch);
}
