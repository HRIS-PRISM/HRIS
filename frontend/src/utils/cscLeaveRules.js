/**
 * CSC leave rules per employment category, used by Earnings Management's stepper and
 * "Rules for this category" panel.
 *
 * Categories marked `confirmed: true` are settled by CSC issuances and are ENFORCED in the
 * UI (disallowed pools are locked). Categories marked `confirmed: false` are pending HR
 * confirmation: their rules are shown with a "Confirm" badge and only WARN.
 *
 * Mapping is from employment_type_config { parentGroup, typeName }. Anything that does not
 * match is "unmapped": no rules are enforced and the panel asks HR to classify it.
 */

export const POOLS = ["VL", "SL", "CTO", "SC"];
export const CONTEXTS = ["earns", "absence", "half_day", "tardiness"];

/** Rule values: yes = allowed, if = allowed with a condition, no = not allowed, confirm = pending HR. */
export const RULE = { YES: "yes", IF: "if", NO: "no", CONFIRM: "confirm" };

export const POOL_META = {
  VL: { label: "Vacation Leave", color: "#185FA5" },
  SL: { label: "Sick Leave", color: "#0D7377" },
  CTO: { label: "Comp. Time Off", color: "#534AB7" },
  SC: { label: "Service Credit", color: "#3B6D11" },
};

const SALARY_ROW = { earns: null, absence: RULE.YES, half_day: RULE.YES, tardiness: RULE.YES };

const cell = (value, note = "") => ({ value, note });

export const CSC_CATEGORIES = {
  non_academic: {
    code: "non_academic",
    title: "Non-Academic (regular, casual, temporary)",
    confirmed: true,
    rules: {
      VL: {
        earns: cell(RULE.YES, "1.25 days per month of service."),
        absence: cell(RULE.YES),
        half_day: cell(RULE.YES),
        tardiness: cell(RULE.YES, "Tardiness and undertime are charged to VL."),
      },
      SL: {
        earns: cell(RULE.YES, "1.25 days per month of service."),
        absence: cell(RULE.IF, "Only for sickness; more than 5 days needs a medical certificate."),
        half_day: cell(RULE.IF, "Only for sickness."),
        tardiness: cell(RULE.IF, "Only for health-related cases with a medical certificate."),
      },
      CTO: {
        earns: cell(RULE.YES, "Only from authorized overtime (Office Order + Certificate of COC Earned)."),
        absence: cell(RULE.IF, "Only with an approved CTO application, in 4- or 8-hour blocks."),
        half_day: cell(RULE.IF, "Only as a 4-hour block with an approved CTO application."),
        tardiness: cell(RULE.NO, "CTO cannot offset tardiness or undertime."),
      },
      SC: {
        earns: cell(RULE.NO, "Service credits are for teaching staff."),
        absence: cell(RULE.NO, "Service credits are for teaching staff."),
        half_day: cell(RULE.NO, "Service credits are for teaching staff."),
        tardiness: cell(RULE.NO, "Service credits are for teaching staff."),
      },
    },
    basis: [
      { kind: "basis", text: "VL and SL: 1.25 days each per month (CSC MC 41 s.1998)." },
      {
        kind: "basis",
        text: "CTO is earned only from authorized overtime. COC = weekday OT hours × 1.0, weekend/holiday/day-off hours × 1.5, up to 40 hours a month and a 120-hour balance (CSC-DBM JC 2 s.2004 §5.4–5.5).",
      },
      {
        kind: "basis",
        text: "CTO is optional here. Each credit needs an Office Order authorizing the overtime and a Certificate of COC Earned (§5.2, §5.8), so a reason and an attachment are required.",
      },
      {
        kind: "basis",
        text: "CTO cannot offset tardiness or undertime (§5.6.1) and is used in 4- or 8-hour blocks after approval (§5.9).",
      },
      {
        kind: "basis",
        text: "Tardiness and undertime are charged to VL. SL only for health-related cases with a medical certificate (CSC MC 41 s.1998).",
      },
      { kind: "confirm", text: "Half-day rules (CSC MC 17 s.2010) were not verified. Treated like a half day of VL." },
    ],
  },

  academic_40: {
    code: "academic_40",
    title: "Academic — 40 hours / designated",
    confirmed: false,
    rules: {
      VL: {
        earns: cell(RULE.YES, "1.25 days per month of service, less leave without pay (agency decision, 2026-09-29)."),
        absence: cell(RULE.CONFIRM),
        half_day: cell(RULE.CONFIRM),
        tardiness: cell(RULE.CONFIRM),
      },
      SL: {
        earns: cell(RULE.YES, "1.25 days per month of service, less leave without pay (agency decision, 2026-09-29)."),
        absence: cell(RULE.CONFIRM),
        half_day: cell(RULE.CONFIRM),
        tardiness: cell(RULE.CONFIRM),
      },
      CTO: {
        earns: cell(RULE.YES, "Only from authorized overtime (Office Order + Certificate of COC Earned)."),
        absence: cell(RULE.IF, "Only with an approved CTO application, in 4- or 8-hour blocks."),
        half_day: cell(RULE.IF, "Only as a 4-hour block with an approved CTO application."),
        tardiness: cell(RULE.NO, "CTO cannot offset tardiness or undertime."),
      },
      SC: {
        earns: cell(RULE.YES, "Teaching staff earn service credits for work beyond the regular load."),
        absence: cell(RULE.CONFIRM),
        half_day: cell(RULE.CONFIRM),
        tardiness: cell(RULE.CONFIRM),
      },
    },
    basis: [
      { kind: "basis", text: "Teachers earn service credits rather than the usual VL/SL (CSC MC 41 s.1998, Rule XVI §6)." },
      { kind: "basis", text: "CTO rules follow CSC-DBM JC 2 s.2004 (40 h/month, 120 h balance, no offset of tardiness)." },
      {
        kind: "basis",
        text: "Agency decision (2026-09-29): 40-hour / designated faculty earn VL and SL like regular employees.",
      },
      {
        kind: "confirm",
        text: "How absences and half-days are charged for this category is still pending HR confirmation. Those rules only warn.",
      },
    ],
  },

  academic_30: {
    code: "academic_30",
    title: "Academic — 30 hours",
    confirmed: false,
    rules: {
      VL: {
        earns: cell(RULE.NO, "30-hour faculty earn service credits, not VL/SL (CSC MC 41 §6; agency decision, 2026-09-29)."),
        absence: cell(RULE.CONFIRM),
        half_day: cell(RULE.CONFIRM),
        tardiness: cell(RULE.CONFIRM),
      },
      SL: {
        earns: cell(RULE.NO, "30-hour faculty earn service credits, not VL/SL (CSC MC 41 §6; agency decision, 2026-09-29)."),
        absence: cell(RULE.CONFIRM),
        half_day: cell(RULE.CONFIRM),
        tardiness: cell(RULE.CONFIRM),
      },
      CTO: {
        earns: cell(RULE.CONFIRM, "Pending HR confirmation."),
        absence: cell(RULE.CONFIRM),
        half_day: cell(RULE.CONFIRM),
        tardiness: cell(RULE.NO, "CTO cannot offset tardiness or undertime."),
      },
      SC: {
        earns: cell(RULE.YES, "Teaching staff earn service credits for work beyond the regular load."),
        absence: cell(RULE.CONFIRM),
        half_day: cell(RULE.CONFIRM),
        tardiness: cell(RULE.CONFIRM),
      },
    },
    basis: [
      { kind: "basis", text: "Teachers earn service credits rather than the usual VL/SL (CSC MC 41 s.1998, Rule XVI §6)." },
      { kind: "basis", text: "Agency decision (2026-09-29): 30-hour faculty earn service credits only; VL/SL are not earned." },
      { kind: "confirm", text: "How absences are charged and the hours-per-day used for conversion are pending HR confirmation. Those rules only warn." },
    ],
  },

  jo_cos: {
    code: "jo_cos",
    title: "Job Order / Contract of Service",
    confirmed: true,
    rules: Object.fromEntries(
      POOLS.map((p) => [
        p,
        Object.fromEntries(
          CONTEXTS.map((c) => [c, cell(RULE.NO, "Job Order / COS workers do not earn or use leave credits.")]),
        ),
      ]),
    ),
    basis: [
      {
        kind: "basis",
        text: "Contract of service and job order workers do not enjoy leave benefits (CSC-COA-DBM Joint Circular No. 1 s.2017). Absences and tardiness are unpaid.",
      },
    ],
  },
};

export const SALARY_RULES = SALARY_ROW;

const norm = (s) => String(s ?? "").trim().toLowerCase();

/**
 * @param {{ parentGroup?: string, typeName?: string, label?: string } | null} empCat
 * @returns {object|null} a CSC_CATEGORIES entry, or null when the type is not mapped
 */
export function resolveCscCategory(empCat) {
  if (!empCat || typeof empCat !== "object") return null;
  const blob = `${norm(empCat.parentGroup)} ${norm(empCat.typeName)} ${norm(empCat.label)}`;
  if (!blob.trim()) return null;
  if (/job\s*order|contract\s*of\s*service|\bcos\b/.test(blob)) return CSC_CATEGORIES.jo_cos;
  if (/non[\s-]*academic|non[\s-]*teaching/.test(blob)) return CSC_CATEGORIES.non_academic;
  if (/40\s*hours?|designated/.test(blob)) return CSC_CATEGORIES.academic_40;
  if (/30\s*hours?|\bacademic\b|\bteaching\b/.test(blob)) return CSC_CATEGORIES.academic_30;
  return null;
}

/** Rule cell for pool × context; salary is handled separately. */
export function ruleFor(category, pool, context) {
  if (!category) return null;
  return category.rules?.[String(pool || "").toUpperCase()]?.[context] || null;
}

/**
 * Whether the UI should LOCK this pool for this context. Only confirmed categories lock;
 * pending categories and unmapped types never lock (they warn instead).
 */
export function isPoolLocked(category, pool, context) {
  if (!category?.confirmed) return false;
  return ruleFor(category, pool, context)?.value === RULE.NO;
}

/**
 * Deduction choices for a context, by employment category:
 *  - pools the category earns come first (e.g. SC for 30-hour faculty, VL for non-academic);
 *  - pools it does NOT earn stay available only while the employee still has a balance there,
 *    listed after the others and flagged (`existingBalanceOnly`, `categoryNote`);
 *  - hard rules still remove options: CTO cannot offset tardiness (CSC-DBM JC 2 s.2004), and
 *    Job Order / COS use no leave credits.
 * Non-pool entries (Select…, Salary Deduction) keep their place: leading ones first, salary last.
 * @param {(value: string) => number|null} balanceDaysFor current balance in days for an option value
 */
export function applyCategoryToDeductionOptions(options, category, context, balanceDaysFor) {
  const list = Array.isArray(options) ? options : [];
  if (!category) return list;
  const lead = [];
  const tail = [];
  const primary = [];
  const secondary = [];
  let seenPool = false;
  for (const o of list) {
    const code = String(o?.value || "").trim().toUpperCase();
    if (!POOLS.includes(code)) {
      (seenPool || code === "SALARY_DEDUCTION" ? tail : lead).push(o);
      continue;
    }
    seenPool = true;
    if (category.code === "jo_cos") continue;
    if (code === "CTO" && context === "tardiness") continue;
    const earns = ruleFor(category, code, "earns")?.value !== RULE.NO;
    if (earns) {
      if (category.confirmed && ruleFor(category, code, context)?.value === RULE.NO) continue;
      primary.push(o);
      continue;
    }
    const bal = Number(balanceDaysFor ? balanceDaysFor(o.value) : 0) || 0;
    if (bal > 1e-6) {
      secondary.push({
        ...o,
        existingBalanceOnly: true,
        categoryNote: `Existing balance only — ${POOL_META[code]?.label || code} is not earned by ${category.title}.`,
      });
    }
  }
  return [...lead, ...primary, ...secondary, ...tail];
}

/** Filter deduction options ({ value }) for a context. Salary and "skip" entries always pass. */
export function filterDeductionOptions(options, category, context) {
  const list = Array.isArray(options) ? options : [];
  if (!category?.confirmed) return list;
  return list.filter((o) => {
    const code = String(o?.value || "").trim().toUpperCase();
    if (!POOLS.includes(code)) return true;
    return !isPoolLocked(category, code, context);
  });
}
