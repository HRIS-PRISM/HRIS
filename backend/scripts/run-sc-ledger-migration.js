/**
 * Idempotent migration for service_credit running-ledger columns.
 * Usage: node backend/scripts/run-sc-ledger-migration.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../db");

const dbName = process.env.DB_NAME;

const columnExists = (table, column) =>
  new Promise((resolve, reject) => {
    db.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, table, column],
      (err, rows) => (err ? reject(err) : resolve(Number(rows[0]?.c) > 0)),
    );
  });

const exec = (sql) =>
  new Promise((resolve, reject) => {
    db.query(sql, (err) => (err ? reject(err) : resolve()));
  });

const migrations = [
  {
    table: "service_credit",
    column: "total_hours",
    sql: `ALTER TABLE service_credit ADD COLUMN total_hours DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT 'Post-deduction: earned_hours - used_hours' AFTER earned_hours`,
  },
  {
    table: "service_credit",
    column: "carried_forward_hours",
    sql: `ALTER TABLE service_credit ADD COLUMN carried_forward_hours DECIMAL(10,3) NOT NULL DEFAULT 0.000 AFTER total_hours`,
  },
  {
    table: "service_credit",
    column: "earning_status",
    sql: `ALTER TABLE service_credit ADD COLUMN earning_status TINYINT NOT NULL DEFAULT 0 COMMENT '1 when period has approved sc_earnings' AFTER carried_forward_hours`,
  },
  {
    table: "service_credit",
    column: "voided_at",
    sql: `ALTER TABLE service_credit ADD COLUMN voided_at DATETIME NULL DEFAULT NULL AFTER earning_status`,
  },
  {
    table: "sc_earnings",
    column: "voided_at",
    sql: `ALTER TABLE sc_earnings ADD COLUMN voided_at DATETIME NULL DEFAULT NULL AFTER earn_status`,
  },
  {
    table: "sc_earnings",
    column: "is_applied",
    sql: `ALTER TABLE sc_earnings ADD COLUMN is_applied TINYINT NOT NULL DEFAULT 0 COMMENT '1 when earning was applied to service_credit period' AFTER voided_at`,
  },
  {
    table: "sc_earnings",
    column: "voided",
    sql: `ALTER TABLE sc_earnings ADD COLUMN voided TINYINT NOT NULL DEFAULT 0 COMMENT '1 when earning is voided (soft-delete)' AFTER is_applied`,
  },
];

(async () => {
  try {
    let applied = 0;
    for (const m of migrations) {
      const exists = await columnExists(m.table, m.column);
      if (exists) continue;
      await exec(m.sql);
      console.log(`Added ${m.table}.${m.column}`);
      applied++;
    }
    if (applied === 0) {
      console.log("SC running-ledger columns already exist; nothing to migrate.");
    } else {
      console.log(`SC running-ledger migration applied (${applied} column(s) added).`);
    }
    const hasVoidedCol = await columnExists("sc_earnings", "voided");
    if (hasVoidedCol) {
      await exec(
        `UPDATE sc_earnings SET voided = 1 WHERE voided_at IS NOT NULL AND (voided IS NULL OR voided = 0)`,
      );
    }
    console.log("To reconcile balances, run: node backend/scripts/backfill_sc_running_ledger_balances.js --apply");
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
