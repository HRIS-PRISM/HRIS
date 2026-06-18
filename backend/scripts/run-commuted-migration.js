require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

const dbName = process.env.DB_NAME;

db.query(
  `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leave_assignment' AND COLUMN_NAME = 'commuted'`,
  [dbName],
  (err, rows) => {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
    if (Number(rows[0]?.c) > 0) {
      console.log('leave_assignment.commuted already exists');
      process.exit(0);
    }
    db.query(
      `ALTER TABLE leave_assignment
       ADD COLUMN commuted TINYINT(1) NOT NULL DEFAULT 0
       COMMENT '1 = locked after transfer to leave_commutation'`,
      (alterErr) => {
        if (alterErr) {
          console.error(alterErr.message);
          process.exit(1);
        }
        console.log('Added leave_assignment.commuted');
        process.exit(0);
      },
    );
  },
);
