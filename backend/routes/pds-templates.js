const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ─── Storage Configuration ────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'pds-templates');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ─── MIME type map ────────────────────────────────────────────────────────────
const MIME_TYPES = {
  '.pdf':  'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc':  'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls':  'application/vnd.ms-excel',
};

// ─── Path resolver ────────────────────────────────────────────────────────────
// Old DB rows stored a full absolute OS path like:
//   /home/ubuntu/app/uploads/pds-templates/1234_file.xlsx
// New rows (after the fix) store only the generated filename like:
//   1234_file.xlsx
// This helper transparently handles both so old rows still work.
const resolveFilePath = (storedPath) => {
  if (path.isAbsolute(storedPath)) {
    return storedPath;                        // legacy row — use as-is
  }
  return path.join(UPLOAD_DIR, storedPath);  // new row — reconstruct full path
};

// ─── POST /pds-templates/upload ───────────────────────────────────────────────
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const { version, notes } = req.body;

  if (!version || version.trim() === '') {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: 'Version label is required.' });
  }

  const adminId = req.user?.id || req.user?.employeeNumber || null;

  db.query(
    `INSERT INTO pds_templates (file_name, file_path, version, uploaded_by, file_size, notes, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      req.file.originalname,  // original display name shown to users
      req.file.filename,      // server-generated filename only — never a local path
      version.trim(),
      adminId,
      req.file.size,
      notes?.trim() || null,
    ],
    (err, result) => {
      if (err) {
        console.error('Upload DB error:', err);
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ success: false, message: 'Server error during upload.' });
      }
      return res.status(201).json({
        success: true,
        message: 'Template uploaded successfully. Activate it to make it live.',
        template: {
          id: result.insertId,
          file_name: req.file.originalname,
          version: version.trim(),
          file_size: req.file.size,
          is_active: false,
        },
      });
    }
  );
});

// ─── GET /pds-templates — list all ───────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  db.query(
    `SELECT t.id, t.file_name, t.version, t.uploaded_at, t.is_active, t.file_size, t.notes,
            p.firstName as uploaded_by_name
     FROM pds_templates t
     LEFT JOIN person_table p ON t.uploaded_by = p.agencyEmployeeNum
     ORDER BY t.uploaded_at DESC`,
    (err, rows) => {
      if (err) {
        console.error('Fetch templates error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch templates.' });
      }
      return res.json({ success: true, templates: rows });
    }
  );
});

// ─── GET /pds-templates/active ────────────────────────────────────────────────
router.get('/active', authenticateToken, (req, res) => {
  db.query(
    `SELECT id, file_name, version, uploaded_at, file_size, notes
     FROM pds_templates WHERE is_active = 1 LIMIT 1`,
    (err, rows) => {
      if (err) {
        console.error('Fetch active template error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch active template.' });
      }
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'No active template found.' });
      }
      return res.json({ success: true, template: rows[0] });
    }
  );
});

// ─── PUT /pds-templates/:id/activate ─────────────────────────────────────────
router.put('/:id/activate', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query(
    'SELECT id, file_name, version FROM pds_templates WHERE id = ?',
    [id],
    (err, rows) => {
      if (err) {
        console.error('Activate check error:', err);
        return res.status(500).json({ success: false, message: 'Failed to activate template.' });
      }
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Template not found.' });
      }

      const template = rows[0];

      db.query('UPDATE pds_templates SET is_active = 0', (err) => {
        if (err) {
          console.error('Deactivate all error:', err);
          return res.status(500).json({ success: false, message: 'Failed to activate template.' });
        }

        db.query('UPDATE pds_templates SET is_active = 1 WHERE id = ?', [id], (err) => {
          if (err) {
            console.error('Activate error:', err);
            return res.status(500).json({ success: false, message: 'Failed to activate template.' });
          }
          return res.json({
            success: true,
            message: `Template "${template.version}" is now active.`,
            activated: template,
          });
        });
      });
    }
  );
});

// ─── DELETE /pds-templates/:id ────────────────────────────────────────────────
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query(
    'SELECT id, file_path, is_active FROM pds_templates WHERE id = ?',
    [id],
    (err, rows) => {
      if (err) {
        console.error('Delete check error:', err);
        return res.status(500).json({ success: false, message: 'Failed to delete template.' });
      }
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Template not found.' });
      }
      if (rows[0].is_active) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the active template. Activate another template first.',
        });
      }

      const filePath = resolveFilePath(rows[0].file_path);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      db.query('DELETE FROM pds_templates WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('Delete error:', err);
          return res.status(500).json({ success: false, message: 'Failed to delete template.' });
        }
        return res.json({ success: true, message: 'Template deleted successfully.' });
      });
    }
  );
});

// ─── GET /pds-templates/:id/download ─────────────────────────────────────────
router.get('/:id/download', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query(
    'SELECT file_name, file_path FROM pds_templates WHERE id = ?',
    [id],
    (err, rows) => {
      if (err) {
        console.error('Download error:', err);
        return res.status(500).json({ success: false, message: 'Failed to download file.' });
      }
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Template not found.' });
      }

      const filePath = resolveFilePath(rows[0].file_path);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found on server.' });
      }

      res.download(filePath, rows[0].file_name);
    }
  );
});

// ─── GET /pds-templates/:id/preview ──────────────────────────────────────────
// Streams the file with Content-Disposition: inline so the browser renders it
// instead of downloading. PDFs open natively. DOCX/XLSX will still prompt a
// save dialog — that's a browser limitation, not something we can override.
router.get('/:id/preview', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query(
    'SELECT file_name, file_path FROM pds_templates WHERE id = ?',
    [id],
    (err, rows) => {
      if (err) {
        console.error('Preview error:', err);
        return res.status(500).json({ success: false, message: 'Failed to preview file.' });
      }
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Template not found.' });
      }

      const filePath = resolveFilePath(rows[0].file_path);

      if (!fs.existsSync(filePath)) {
        console.error(`Preview 404 — stored: "${rows[0].file_path}" → resolved: "${filePath}"`);
        return res.status(404).json({
          success: false,
          message: 'File not found on server. This template was uploaded before the storage fix — please re-upload it.',
        });
      }

      const ext  = path.extname(rows[0].file_name).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `inline; filename="${rows[0].file_name}"`);
      res.setHeader('Cache-Control', 'no-cache');

      fs.createReadStream(filePath).pipe(res);
    }
  );
});

module.exports = router;