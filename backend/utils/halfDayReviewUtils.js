/**
 * Server-side half-day review checks (mirrors frontend halfDayReview.js approval rules).
 */

const normalizeDate = (d) => String(d ?? "").trim().slice(0, 10);

const parseReviewJson = (raw) => {
  if (raw == null || raw === "") return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const hasHrRenderedConfirmation = (entry) => {
  if (!entry || String(entry.status || "").toLowerCase() !== "approved") return false;
  if (entry.detectedReason === "legacy_halfDayDates") return false;
  return (
    entry.renderedTotal != null ||
    entry.renderedRegular != null ||
    entry.renderedMorning != null ||
    entry.renderedAfternoon != null
  );
};

/** True when half_day_review JSON has HR-approved entry for date (earnings may deduct). */
function isApprovedHalfDayInReviewJson(reviewRaw, dateStr) {
  const d = normalizeDate(dateStr);
  if (!d) return false;
  const entry = parseReviewJson(reviewRaw).find(
    (e) => normalizeDate(e?.date) === d,
  );
  return hasHrRenderedConfirmation(entry);
}

module.exports = {
  normalizeDate,
  parseReviewJson,
  hasHrRenderedConfirmation,
  isApprovedHalfDayInReviewJson,
};
