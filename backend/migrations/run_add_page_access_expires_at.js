/**
 * Add expires_at to page_access.
 * Usage: node migrations/run_add_page_access_expires_at.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');
const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, 'add_page_access_expires_at.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

const statements = sql
  .split(';')
  .map((s) => s.replace(/^\s*--[^\n]*\n/gm, '').trim())
  .filter((s) => s.length > 0);

async function run() {
  console.log(`Running ${statements.length} statement(s)...`);
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.replace(/\s+/g, ' ').slice(0, 72);
    try {
      await new Promise((resolve, reject) => {
        db.query(statement, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
      console.log(`  [${i + 1}/${statements.length}] OK — ${preview}...`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
        console.log(`  [${i + 1}/${statements.length}] SKIP — ${preview}...`);
        continue;
      }
      console.error(err.message);
      process.exit(1);
    }
  }
  console.log('Done.');
  process.exit(0);
}

run();
