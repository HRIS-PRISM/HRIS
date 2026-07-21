/**
 * Balance math test for Jan/Feb undo scenario (no DB).
 * Jan +10d, Feb +5/+3/+2d → undo twice → 18d then 15d employee remaining.
 */
const {
  latestScPeriodsByKey,
  getScDisplayRemainingHours,
  getPriorPeriodScCarryForward,
  periodOtScHours,
  recomputeScLedgerFields,
} = require("../utils/serviceCreditBalanceUtils");

const mkPeriod = (id, year, month, earned, carry, voided = false) => ({
  id,
  employeeNumber: "E001",
  sc_type: "non_commutative",
  period_year: year,
  period_month: month,
  earned_hours: earned,
  carried_forward_hours: carry,
  used_hours: 0,
  total_ot_hours: 1,
  voided_at: voided ? "2026-01-01" : null,
});

// All snapshots (append-only log)
let allRows = [
  mkPeriod(101, 2026, 1, 80, 0),
  mkPeriod(102, 2026, 2, 120, 80),
  mkPeriod(103, 2026, 2, 144, 80),
  mkPeriod(104, 2026, 2, 160, 80),
];

const latestPeriodRemaining = (rows) => {
  const latest = latestScPeriodsByKey(rows.filter((r) => !r.voided_at));
  const feb = latest.find((p) => p.period_month === 2);
  return getScDisplayRemainingHours(feb, []);
};

const assertEq = (label, got, want) => {
  if (got !== want) throw new Error(`${label}: expected ${want}, got ${got}`);
};

assertEq("initial 20d", latestPeriodRemaining(allRows), 160);

// Undo +2d (void 104)
allRows = allRows.map((r) => (r.id === 104 ? { ...r, voided_at: "2026-06-01" } : r));
const activeFeb1 = latestScPeriodsByKey(allRows).find((p) => p.period_month === 2);
const expectedCarry1 = getPriorPeriodScCarryForward(allRows, [], 2026, 2);
const otSc1 = periodOtScHours(activeFeb1);
const repaired1 = recomputeScLedgerFields({
  ...activeFeb1,
  carried_forward_hours: expectedCarry1,
  earned_hours: expectedCarry1 + otSc1,
});
assertEq("after undo1 employee 18d", latestPeriodRemaining(allRows), 144);
assertEq("after undo1 Feb earned", repaired1.earned_hours, 144);

// Undo +3d (void 103)
allRows = allRows.map((r) => (r.id === 103 ? { ...r, voided_at: "2026-06-01" } : r));
const activeFeb2 = latestScPeriodsByKey(allRows).find((p) => p.period_month === 2);
const expectedCarry2 = getPriorPeriodScCarryForward(allRows, [], 2026, 2);
const otSc2 = periodOtScHours(activeFeb2);
const repaired2 = recomputeScLedgerFields({
  ...activeFeb2,
  carried_forward_hours: expectedCarry2,
  earned_hours: expectedCarry2 + otSc2,
});
assertEq("after undo2 employee 15d", latestPeriodRemaining(allRows), 120);
assertEq("after undo2 Feb earned", repaired2.earned_hours, 120);

console.log("SC undo balance scenario tests passed");
