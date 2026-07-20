let express,
  router,
  db,
  authenticateToken,
  logAudit,
  upload,
  xlsx,
  fs,
  fillExemptAttendance;
try {
  express = require('express');
  router = express.Router();
  db = require('../db');
  ({ authenticateToken, logAudit } = require('../middleware/auth'));
  ({ upload } = require('../middleware/upload'));
  ({ fillExemptAttendance } = require('../services/autoAttendanceService'));
  xlsx = require('xlsx');
  fs = require('fs');
} catch (depErr) {
  console.error(
    '[officialtime] FATAL: Failed to load dependency —',
    depErr.message,
  );
  const fallback = require('express').Router();
  fallback.use((req, res) =>
    res.status(503).json({
      error: 'Official Time module failed to load. Check server logs.',
    }),
  );
  module.exports = fallback;
  return;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // #15: 10 MB hard cap
const VALID_TIME_RE = /^\d{1,2}:\d{2}:\d{2}\s*(AM|PM)$/i; // #10: strict time format

function beginTransaction(conn) {
  return new Promise((resolve, reject) =>
    conn.beginTransaction((err) => (err ? reject(err) : resolve())),
  );
}

function commitTransaction(conn) {
  return new Promise((resolve, reject) =>
    conn.commit((err) => (err ? reject(err) : resolve())),
  );
}

function rollbackTransaction(conn) {
  return new Promise((resolve) => {
    if (!conn || typeof conn.rollback !== 'function') {
      console.error('[officialtime] Invalid connection for rollback');
      return resolve();
    }
    conn.rollback(() => resolve());
  });
}

function queryAsync(conn, sql, params) {
  return new Promise((resolve, reject) =>
    conn.query(sql, params, (err, result) =>
      err ? reject(err) : resolve(result),
    ),
  );
}

function getConnectionAsync(pool) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      resolve(connection);
    });
  });
}

function releaseConnection(conn) {
  if (conn && typeof conn.release === 'function') conn.release();
}

function getField(r, dbField, aliases = []) {
  const dbLower = dbField.toLowerCase();
  if (r[dbLower] != null) return r[dbLower];
  for (const alias of aliases) {
    if (r[alias] != null) return r[alias];
  }
  return null;
}

function normaliseRow(row) {
  const out = {};
  for (const key in row) {
    const cleanKey = String(key)
      .replace(/\u00A0/g, '')
      .trim()
      .toLowerCase();
    out[cleanKey] = row[key];
  }
  return out;
}

// FUNCTION TO NORMALIZE FIRSTNAME, LASTNAME ROW
// Trims whitespace/NBSP and upper-cases so DB name matching is case/space
// insensitive (payroll table stores names in caps).
function normaliseName(val) {
  if (val == null) return '';
  return String(val)
    .replace(/\u00A0/g, ' ')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function toNumberOrNull(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

// Extracts the fields this route needs from a single normalised row.
function extractOfficialTimeFields(rawRow) {
  const row = normaliseRow(rawRow);

  const lastname = getField(row, 'lastname', ['last name', 'last_name']);
  const firstname = getField(row, 'firstname', ['first name', 'first_name']);

  return {
    lastname: normaliseName(lastname),
    firstname: normaliseName(firstname),
    ps: toNumberOrNull(getField(row, 'ps')),
    gs: toNumberOrNull(getField(row, 'gs')),
    ec: toNumberOrNull(getField(row, 'ec')),
    consoloan: toNumberOrNull(getField(row, 'consoloan')),
    plreg: toNumberOrNull(getField(row, 'plreg')),
    gfal: toNumberOrNull(getField(row, 'gfal')),
    mpl: toNumberOrNull(getField(row, 'mpl')),
    mpl_lite: toNumberOrNull(getField(row, 'mpl_lite')),
    emrgyln: toNumberOrNull(getField(row, 'emrgyln')),
    rel: toNumberOrNull(getField(row, 'rel')),
    gsl: toNumberOrNull(getField(row, 'gsl')),
    gbk: toNumberOrNull(getField(row, 'gbk')),
  };
}

// Reads the workbook and returns clean row objects. Handles the fact that
// this file has metadata rows (Remitting Agency, Office Code, Due Month)
// ABOVE the real header row, so a plain sheet_to_json() call would treat
// "Remitting Agency" as column headers and silently return garbage.
function extractRowsFromWorkbook(filePath) {
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawRows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: null,
  });

  const headerRowIndex = rawRows.findIndex((r) =>
    r.some((cell) => String(cell).trim().toUpperCase() === 'LASTNAME'),
  );

  if (headerRowIndex === -1) {
    throw new Error('Could not locate LASTNAME header row in uploaded file.');
  }

  const headers = rawRows[headerRowIndex].map((h) => String(h ?? '').trim());
  const dataRows = rawRows.slice(headerRowIndex + 1);

  const rowObjects = [];
  for (const rowArr of dataRows) {
    if (rowArr.every((cell) => cell === '' || cell == null)) continue; // skip blank trailing rows
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rowArr[idx];
    });
    rowObjects.push(rowObj);
  }
  return rowObjects;
}

router.post(
  '/import-payroll',
  authenticateToken,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const filePath = req.file.path;

    let conn;
    try {
      // STEP 1: validate file size
      if (req.file.size > MAX_UPLOAD_BYTES) {
        return res.status(400).json({
          message: `File too large. Maximum allowed size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
        });
      }

      // STEP 2: read + normalise rows
      const rawRows = extractRowsFromWorkbook(filePath);

      if (!rawRows.length) {
        return res.status(400).json({ message: 'Excel file is empty.' });
      }

      const cleanedSheet = rawRows.map(extractOfficialTimeFields);

      let updatedCount = 0;
      const processedRecords = [];
      const insertWarnings = [];
      const skippedRows = [];

      conn = await getConnectionAsync(db);
      await beginTransaction(conn);

      for (let i = 0; i < cleanedSheet.length; i++) {
        const row = cleanedSheet[i];
        const rowNum = i + 1;

        if (!row.lastname || !row.firstname) {
          skippedRows.push({
            row: rowNum,
            reason: 'Missing lastname/firstname.',
          });
          continue;
        }

        // STEP 3: look up employee number by name
        const personRows = await queryAsync(
          conn,
          'SELECT agencyEmployeeNum FROM person_table WHERE lastName = ? AND firstName = ?',
          [row.lastname, row.firstname],
        );

        if (personRows.length === 0) {
          insertWarnings.push(
            `Row ${rowNum}: No matching person found for ${row.firstname} ${row.lastname}.`,
          );
          continue;
        }

        const employeeNumber = personRows[0].agencyEmployeeNum;

        // STEP 4: update remittance
        const remittanceQuery = `
          UPDATE remittance_table
          SET gsisSalaryLoan = ?, gsisPolicyLoan = ?, gfal = ?, mpl = ?,
              mplLite = ?, emergencyLoan = ?, rel = ?, gsl = ?, gbk = ?
          WHERE employeeNumber = ?
        `;
        const remResult = await queryAsync(conn, remittanceQuery, [
          row.consoloan,
          row.plreg,
          row.gfal,
          row.mpl,
          row.mpl_lite,
          row.emrgyln,
          row.rel,
          row.gsl,
          row.gbk,
          employeeNumber,
        ]);

        let action = 'updated';
        if (!remResult || remResult.affectedRows === 0) {
          const insertRemSql = `
            INSERT INTO remittance_table (
              employeeNumber, gsisSalaryLoan, gsisPolicyLoan, gfal, mpl, mplLite,
              emergencyLoan, rel, gsl, gbk
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          await queryAsync(conn, insertRemSql, [
            employeeNumber,
            row.consoloan,
            row.plreg,
            row.gfal,
            row.mpl,
            row.mpl_lite,
            row.emrgyln,
            row.rel,
            row.gsl,
            row.gbk,
          ]);
          action = 'inserted';
        }

        // STEP 5: update payroll_processing
        const payrollQuery = `
          UPDATE payroll_processing
          SET personalLifeRetIns = ?, rtIns = ?, ec = ?
          WHERE employeeNumber = ?
        `;
        await queryAsync(conn, payrollQuery, [
          row.ps,
          row.gs,
          row.ec,
          employeeNumber,
        ]);

        updatedCount++;
        processedRecords.push({
          lastname: row.lastname,
          firstname: row.firstname,
          employeeNumber,
          action,
        });
      }

      await commitTransaction(conn);

      try {
        logAudit(
          req.user,
          `Import payroll deductions (${updatedCount} of ${cleanedSheet.length} rows)`,
          'Remittance/Payroll',
          null,
          processedRecords.length === 1 ? processedRecords[0].employeeNumber : null,
          {
            module: 'import-payroll',
            source: 'excel-upload',
            fileName: req.file.originalname,
            totalRows: cleanedSheet.length,
            updatedCount,
            skippedCount: skippedRows.length,
            warningCount: insertWarnings.length,
            recordedAt: new Date().toISOString(),
          },
        );
      } catch (auditErr) {
        console.error('Audit log error:', auditErr);
      }

      const allWarnings = [
        ...skippedRows.map((r) => `Row ${r.row} skipped: ${r.reason}`),
        ...insertWarnings,
      ];

      res.json({
        message: `Upload complete. ${updatedCount} record(s) updated.`,
        updated: updatedCount,
        records: processedRecords,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      });
    } catch (err) {
      console.error('[officialtime] import-payroll error:', err);
      await rollbackTransaction(conn);
      res.status(500).json({ message: 'Failed to process payroll import.' });
    } finally {
      releaseConnection(conn);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr)
          console.error(
            '[officialtime] Failed to delete temp upload:',
            unlinkErr,
          );
      });
    }
  },
);

module.exports = router;
