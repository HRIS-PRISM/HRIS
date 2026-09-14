/**
 * HRIS employee directory sorting: letter surnames A–Z first,
 * empty / punctuation / special-character names last.
 */

/** Extract a sortable last-name key from common name formats. */
export function getLastNameSortKey(nameOrParts) {
  if (nameOrParts && typeof nameOrParts === "object" && !Array.isArray(nameOrParts)) {
    const explicit = String(nameOrParts.lastName || nameOrParts.lastname || "").trim();
    if (explicit) {
      const cleaned = explicit.replace(/^[^A-Za-zÀ-ÿ0-9]+|[^A-Za-zÀ-ÿ0-9]+$/g, "").trim();
      if (!cleaned) return { sort: explicit.toLowerCase(), isLetter: false };
      return { sort: cleaned.toLowerCase(), isLetter: /^[A-Za-zÀ-ÿ]/.test(cleaned) };
    }
    const composed = [nameOrParts.employeeName, nameOrParts.fullName, nameOrParts.displayName, nameOrParts.name]
      .map((v) => String(v || "").trim())
      .find(Boolean);
    return getLastNameSortKey(composed || "");
  }

  const raw = String(nameOrParts || "").trim();
  if (!raw) return { sort: "", isLetter: false };

  // "Last, First Middle" → Last; otherwise final word
  let last = raw.includes(",")
    ? raw.split(",")[0].trim()
    : (raw.split(/\s+/).filter(Boolean).pop() || raw);

  last = last.replace(/^[^A-Za-zÀ-ÿ0-9]+|[^A-Za-zÀ-ÿ0-9]+$/g, "").trim();
  if (!last) return { sort: raw.toLowerCase(), isLetter: false };
  return { sort: last.toLowerCase(), isLetter: /^[A-Za-zÀ-ÿ]/.test(last) };
}

/**
 * Compare two employees for directory order.
 * @param {object|string} a
 * @param {object|string} b
 * @param {(item: object) => string} [getName] optional name resolver for objects
 */
export function compareEmployeesByLastName(a, b, getName) {
  const resolve = (item) => {
    if (typeof getName === "function") return getName(item);
    if (typeof item === "string") return item;
    return item;
  };

  const ka = getLastNameSortKey(resolve(a));
  const kb = getLastNameSortKey(resolve(b));

  if (ka.isLetter !== kb.isLetter) return ka.isLetter ? -1 : 1;

  const byLast = ka.sort.localeCompare(kb.sort, undefined, { sensitivity: "base" });
  if (byLast !== 0) return byLast;

  const nameA = typeof a === "string"
    ? a
    : String(a?.employeeName || a?.fullName || a?.displayName || a?.name || "");
  const nameB = typeof b === "string"
    ? b
    : String(b?.employeeName || b?.fullName || b?.displayName || b?.name || "");
  const byName = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  if (byName !== 0) return byName;

  const numA = String(a?.employeeNumber || a?.agencyEmployeeNum || a?.empNo || "");
  const numB = String(b?.employeeNumber || b?.agencyEmployeeNum || b?.empNo || "");
  return numA.localeCompare(numB, undefined, { numeric: true });
}

/** Stable copy + sort. */
export function sortEmployeesByLastName(arr, getName) {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => compareEmployeesByLastName(a, b, getName));
}
