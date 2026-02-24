// Quick script to check leave_table for 'SPL' entry
const db = require('./db');

console.log('Checking leave_table for SPL entry...\n');

// Query to find SPL
db.query('SELECT * FROM leave_table WHERE leave_code = "SPL"', (err, results) => {
  if (err) {
    console.error('Error querying database:', err);
    process.exit(1);
  }

  console.log('Results for SPL:');
  console.log(results);
  console.log(`\nTotal rows found: ${results.length}`);

  // Also get all leave codes to see what exists
  db.query('SELECT id, leave_code, leave_description FROM leave_table ORDER BY leave_code', (err2, allResults) => {
    if (err2) {
      console.error('Error querying all records:', err2);
      process.exit(1);
    }

    console.log('\n=== ALL LEAVE CODES IN DATABASE ===');
    allResults.forEach(row => {
      console.log(`ID: ${row.id}, Code: ${row.leave_code}, Description: ${row.leave_description}`);
    });

    process.exit(0);
  });
});
