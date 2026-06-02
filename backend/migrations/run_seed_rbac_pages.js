/**
 * Run seed_rbac_pages.sql — registers RBAC pages and default page_access grants.
 *
 * Usage (from backend folder):
 *   node migrations/run_seed_rbac_pages.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');
const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, 'seed_rbac_pages.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

const statements = sql
  .split(';')
  .map((s) => s.replace(/^\s*--[^\n]*\n/gm, '').trim())
  .filter((s) => s.length > 0);

async function run() {
  console.log(`Running ${statements.length} statement(s) from seed_rbac_pages.sql...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.replace(/\s+/g, ' ').slice(0, 80);
    try {
      const result = await new Promise((resolve, reject) => {
        db.query(statement, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
      const affected =
        result?.affectedRows !== undefined ? result.affectedRows : '-';
      console.log(`  [${i + 1}/${statements.length}] OK (affected: ${affected}) — ${preview}...`);
    } catch (err) {
      console.error(`  [${i + 1}/${statements.length}] FAILED — ${preview}...`);
      console.error(err.message);
      process.exit(1);
    }
  }

  const countPages = await new Promise((resolve, reject) => {
    db.query(
      `SELECT COUNT(*) AS cnt FROM pages WHERE component_identifier IN (
        'assessment-clearance','clearance','reports','employee-reports',
        'earnings-management','assignment-management','absences-report',
        'attendance-adjustment-reports'
      )`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]?.cnt ?? 0);
      },
    );
  });

  console.log(`\n✅ RBAC pages seed complete. Sample gated pages in DB: ${countPages}`);
  process.exit(0);
}

run();
