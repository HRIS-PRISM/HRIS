/**
 * Idempotent migration for running-ledger columns:
 *   leave_assignment.earning_status
 *   leave_earnings.is_applied
 *
 * Usage: node backend/scripts/run-ledger-migration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const db = require('../db');

const dbName = process.env.DB_NAME;
const sqlPath = path.join(__dirname, '..', 'migrations', 'leave_ledger_running_balance.sql');

const columnExists = (table, column) =>
  new Promise((resolve, reject) => {
    db.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, table, column],
      (err, rows) => (err ? reject(err) : resolve(Number(rows[0]?.c) > 0)),
    );
  });

const runSqlFile = () =>
  new Promise((resolve, reject) => {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--'));
    let i = 0;
    const next = () => {
      if (i >= statements.length) return resolve();
      const stmt = statements[i++];
      db.query(stmt, (err) => {
        if (err) return reject(err);
        next();
      });
    };
    next();
  });

(async () => {
  try {
    const hasEarningStatus = await columnExists('leave_assignment', 'earning_status');
    const hasIsApplied = await columnExists('leave_earnings', 'is_applied');

    if (hasEarningStatus && hasIsApplied) {
      console.log('Running-ledger columns already exist; nothing to migrate.');
      console.log('To reconcile balances, run: node backend/scripts/backfill_running_ledger_balances.js');
      process.exit(0);
      return;
    }

    await runSqlFile();
    console.log('Running-ledger migration applied successfully.');
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
