/**
 * In-memory tests for SC undo delta display (no DB).
 * Usage: node backend/scripts/test_sc_undo_delta.js
 */
const { buildScPeriodSnapshotHistory } = require("../utils/serviceCreditBalanceUtils");

const mk = (id, earned, carry, voided, remarks) => ({
  id,
  employeeNumber: "E001",
  sc_type: "non_commutative",
  period_year: 2026,
  period_month: 2,
  earned_hours: earned,
  carried_forward_hours: carry,
  total_ot_hours: 10,
  voided_at: voided ? "2026-02-01" : null,
  remarks,
});

const rows = [
  mk(102, 120, 80, false, "sc_entry_delta_hours:40"),
  mk(103, 144, 80, false, "sc_entry_delta_hours:24"),
  mk(104, 160, 80, false, "sc_entry_delta_hours:16"),
];

const afterUndo = [
  mk(102, 120, 80, false, "sc_entry_delta_hours:40"),
  mk(103, 144, 80, false, "sc_entry_delta_hours:24"),
  { ...mk(104, 160, 80, true, "sc_entry_delta_hours:16"), voided_at: "2026-06-01" },
];

const hist = buildScPeriodSnapshotHistory(afterUndo, [], {
  employeeNumber: "E001",
  periodYear: 2026,
  periodMonth: 2,
  scType: "non_commutative",
});

const active = hist.snapshots.find((s) => s.is_active);
if (active.sc_delta !== 24) {
  throw new Error(`Active row should show +3d (24h), got ${active.sc_delta}`);
}
const voided = hist.snapshots.find((s) => s.id === 104);
if (voided.sc_delta !== 16) {
  throw new Error(`Voided row should keep +2d (16h), got ${voided.sc_delta}`);
}

const dupRows = [
  mk(102, 120, 80, false, null),
  mk(103, 144, 80, false, null),
  { ...mk(104, 144, 80, true, null), voided_at: "2026-06-01" },
];
const hist2 = buildScPeriodSnapshotHistory(dupRows, [], {
  employeeNumber: "E001",
  periodYear: 2026,
  periodMonth: 2,
  scType: "non_commutative",
});
const active2 = hist2.snapshots.find((s) => s.is_active);
if (active2.sc_delta === 0) {
  throw new Error("Active should not be +0 when prev voided had same cumulative");
}

console.log("SC undo delta tests passed");
