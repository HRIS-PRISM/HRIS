/**
 * CSC filing notices shown before a leave request is submitted — same rules as
 * backend/services/leaveRequestRules.filingNotices (warnings only, never blocking).
 *  - VL should be filed at least 5 days ahead (CSC MC 41 s.1998, Sec. 51).
 *  - SL of more than 5 days needs a medical certificate (Sec. 53).
 */
const parseIso = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
};

export const filingNotices = (leaveCode, dates, today = new Date()) => {
  const code = String(leaveCode || "").trim().toUpperCase();
  const list = [...(dates || [])].map((d) => String(d).slice(0, 10)).filter(Boolean).sort();
  if (!list.length) return [];
  const notes = [];
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (code === "VL") {
    const lead = Math.round((parseIso(list[0]) - t0) / 86400000);
    if (lead < 5) {
      notes.push(
        `Vacation leave should be filed at least 5 days ahead (CSC MC 41 s.1998, Sec. 51). This one is ${
          lead < 0 ? "filed after the date" : `${lead} day(s) ahead`
        }.`,
      );
    }
  }
  if (code === "SL" && list.length > 5) {
    notes.push(
      `Sick leave of more than 5 days needs a medical certificate (CSC MC 41 s.1998, Sec. 53). ${list.length} days selected.`,
    );
  }
  return notes;
};

/** Note for leave types the employee's CSC category does not earn (existing balance only). */
export const categoryLeaveNote = (leaveCode, cscCategory) => {
  const code = String(leaveCode || "").trim().toUpperCase();
  if (cscCategory === "academic_30" && (code === "VL" || code === "SL")) {
    return "30-hour faculty earn service credits, not VL/SL — only an existing balance can be used.";
  }
  return null;
};
