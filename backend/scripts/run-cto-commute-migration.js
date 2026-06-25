/**
 * Ensure leave_commutation.cto_credit_id exists (idempotent).
 * Usage: node backend/scripts/run-cto-commute-migration.js
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

(async () => {
  try {
    const hasCtoCol = await columnExists("leave_commutation", "cto_credit_id");
    if (!hasCtoCol) {
      await exec(
        `ALTER TABLE leave_commutation ADD COLUMN cto_credit_id INT NULL DEFAULT NULL
         COMMENT 'Source cto_credit row when leave_code = CTO' AFTER service_credit_id`,
      );
      console.log("Added leave_commutation.cto_credit_id");
    } else {
      console.log("leave_commutation.cto_credit_id already exists");
    }
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
