// Script to retroactively deduct leave credits for already HR Approved requests
const db = require('./db');

async function deductApprovedLeaves() {
  // Find all HR Approved leave requests
  const approvedRequestsQuery = `
    SELECT id, employeeNumber, leave_code, leave_date
    FROM leave_request
    WHERE status = 2
  `;

  db.query(approvedRequestsQuery, async (err, requests) => {
    if (err) {
      console.error('Error fetching approved leave requests:', err);
      return;
    }
    console.log(`Found ${requests.length} HR Approved requests.`);
    for (const req of requests) {
      const { employeeNumber, leave_code, leave_date } = req;
      const parsedDate = leave_date ? new Date(leave_date) : null;
      const targetYear = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getFullYear() : null;
      const targetSemester = parsedDate && !isNaN(parsedDate.getTime()) ? (parsedDate.getMonth() < 6 ? '1st semester' : '2nd semester') : null;
      // Find current period assignment
      const getAssignmentQuery = `
        SELECT * FROM leave_assignment
        WHERE employeeNumber = ? AND TRIM(leave_code) = TRIM(?)
          AND (? IS NULL OR period_year = ?)
          AND (? IS NULL OR period_semester <=> ? OR period_semester IS NULL)
        ORDER BY period_year DESC,
          CASE WHEN period_semester IN ('2nd', '2nd semester') THEN 2 WHEN period_semester IN ('1st', '1st semester') THEN 1 ELSE 0 END DESC
        LIMIT 1
      `;
      db.query(getAssignmentQuery, [employeeNumber, leave_code, targetYear, targetYear, targetSemester, targetSemester], (assignErr, assignment) => {
        if (assignErr || assignment.length === 0) {
          console.warn(`No current period assignment found for employee ${employeeNumber} / ${leave_code}, skipping.`);
          return;
        }
        const assignmentRow = assignment[0];
        const currentRemaining = parseFloat(assignmentRow.remaining_hours) || 0;
        const currentUsed = parseFloat(assignmentRow.used_hours) || 0;
        const hoursToDeduct = 8;
        const newRemaining = Math.max(0, currentRemaining - hoursToDeduct);
        const newUsed = currentUsed + hoursToDeduct;
        db.query('UPDATE leave_assignment SET remaining_hours = ?, used_hours = ? WHERE id = ?', [newRemaining, newUsed, assignmentRow.id], (updateErr) => {
          if (updateErr) {
            console.error('Error deducting credits:', updateErr);
          } else {
            console.log(`Deducted ${hoursToDeduct} hours for employee ${employeeNumber} | Period: ${assignmentRow.period_year} ${assignmentRow.period_semester}`);
          }
        });
      });
    }
  });
}

deductApprovedLeaves();
