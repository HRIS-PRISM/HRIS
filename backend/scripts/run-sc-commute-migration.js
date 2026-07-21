/**
 * Run alter_leave_commutation_sc_commute.sql (nullable leave_assignment_id + SC source columns).
 * Usage: node backend/scripts/run-sc-commute-migration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const db = require('../db');

const sqlPath = path.join(__dirname, '../migrations/alter_leave_commutation_sc_commute.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');
const statements = sql
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('--'));

(async () => {
  for (const stmt of statements) {
    if (/^SET @/i.test(stmt) || /^PREPARE/i.test(stmt) || /^EXECUTE/i.test(stmt) || /^DEALLOCATE/i.test(stmt)) {
      await new Promise((resolve, reject) => {
        db.query(stmt, (err) => (err ? reject(err) : resolve()));
      });
    }
  }
  console.log('SC commutation migration completed.');
  process.exit(0);
})().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
