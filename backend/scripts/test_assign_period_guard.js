/**
 * Unit tests for assertScPeriodAssignableForCredits / assertCtoPeriodAssignableForCredits.
 * Run: node backend/scripts/test_assign_period_guard.js
 */
const {
  assertScPeriodAssignableForCredits,
} = require('../utils/serviceCreditBalanceUtils');
const {
  assertCtoPeriodAssignableForCredits,
} = require('../utils/ctoBalanceUtils');

let passed = 0;
let failed = 0;

const assert = (label, cond) => {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
};

const scRow = (id, year, month, extra = {}) => ({
  id,
  employeeNumber: 'E001',
  sc_type: 'non_commutative',
  period_year: year,
  period_month: month,
  earned_hours: 8,
  total_hours: 8,
  remaining_hours: 8,
  used_hours: 0,
  commuted: 0,
  voided_at: null,
  ...extra,
});

const ctoRow = (id, year, month, extra = {}) => ({
  id,
  employeeNumber: 'E001',
  period_year: year,
  period_month: month,
  earned_hours: 8,
  total_hours: 8,
  remaining_hours: 8,
  used_hours: 0,
  commuted: 0,
  voided_at: null,
  ...extra,
});

console.log('SC assign guard');
{
  const commuted2025 = [
    scRow(1, 2025, 1, { commuted: 1 }),
    scRow(2, 2026, 1),
  ];
  const r1 = assertScPeriodAssignableForCredits(commuted2025, 2025, 1);
  assert('blocks assign to commuted 2025', !r1.ok);

  const r2 = assertScPeriodAssignableForCredits(commuted2025, 2026, 1);
  assert('allows assign to current 2026 after commute', r2.ok);

  const superseded = [scRow(1, 2025, 1), scRow(2, 2026, 1)];
  const r3 = assertScPeriodAssignableForCredits(superseded, 2025, 1);
  assert('blocks assign to superseded 2025', !r3.ok);

  const r4 = assertScPeriodAssignableForCredits(superseded, 2027, 1);
  assert('allows opening newer 2027 period', r4.ok);

  const r5 = assertScPeriodAssignableForCredits([], 2025, 1);
  assert('allows first period ever', r5.ok);

  const activeOnly = [scRow(1, 2026, 1)];
  const r6 = assertScPeriodAssignableForCredits(activeOnly, 2026, 1);
  assert('allows append to current active period', r6.ok);

  const voided = [scRow(1, 2025, 1, { voided_at: '2025-06-01' })];
  const r7 = assertScPeriodAssignableForCredits(voided, 2025, 1);
  assert('blocks assign to voided period', !r7.ok);

  const janActiveFebVoided = [
    scRow(1, 2026, 1),
    scRow(2, 2026, 2, { voided_at: '2026-06-01' }),
  ];
  const r8 = assertScPeriodAssignableForCredits(janActiveFebVoided, 2026, 1);
  assert('reopens January as current after voided February (no March)', r8.ok);

  const r9 = assertScPeriodAssignableForCredits(janActiveFebVoided, 2026, 2);
  assert('blocks assign to voided February', !r9.ok);
}

console.log('CTO assign guard');
{
  const commuted2025 = [
    ctoRow(1, 2025, 1, { commuted: 1 }),
    ctoRow(2, 2026, 1),
  ];
  const r1 = assertCtoPeriodAssignableForCredits(commuted2025, 2025, 1);
  assert('blocks assign to commuted 2025', !r1.ok);

  const r2 = assertCtoPeriodAssignableForCredits(commuted2025, 2026, 1);
  assert('allows assign to current 2026 after commute', r2.ok);

  const superseded = [ctoRow(1, 2025, 1), ctoRow(2, 2026, 1)];
  const r3 = assertCtoPeriodAssignableForCredits(superseded, 2025, 1);
  assert('blocks assign to superseded 2025', !r3.ok);

  const r4 = assertCtoPeriodAssignableForCredits(superseded, 2027, 1);
  assert('allows opening newer 2027 period', r4.ok);

  const r5 = assertCtoPeriodAssignableForCredits([], 2025, 1);
  assert('allows first period ever', r5.ok);

  const janActiveFebVoided = [
    ctoRow(1, 2026, 1),
    ctoRow(2, 2026, 2, { voided_at: '2026-06-01' }),
  ];
  const r6 = assertCtoPeriodAssignableForCredits(janActiveFebVoided, 2026, 1);
  assert('reopens January as current after voided February (no March)', r6.ok);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
