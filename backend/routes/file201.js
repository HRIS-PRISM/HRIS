const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const db = require('../db');
const { authenticateToken, logAudit } = require('../middleware/auth');

const router = express.Router();

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const FILE201_ROOT = path.join(UPLOADS_ROOT, 'file201');

if (!fs.existsSync(FILE201_ROOT)) {
  fs.mkdirSync(FILE201_ROOT, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]);

const sanitizeFilename = (input) => {
  return String(input || '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 180);
};

const sanitizeEmployeeNumber = (input) => {
  return String(input || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
};

const buildRelativePath = (employeeNumber, storedFileName) => {
  const safeEmployeeNumber = sanitizeEmployeeNumber(employeeNumber);
  return path.posix.join('file201', `employee_${safeEmployeeNumber}`, storedFileName);
};

const toAbsolutePath = (relativePath) => {
  const resolved = path.resolve(UPLOADS_ROOT, relativePath);
  const uploadsRootResolved = path.resolve(UPLOADS_ROOT);
  if (!resolved.startsWith(uploadsRootResolved)) {
    return null;
  }
  return resolved;
};

const getDownloadName = (doc) => {
  return sanitizeFilename(doc.file_name) || doc.stored_file_name;
};

const canManageFile201 = (req) => {
  const role = String(req.user?.role || '').toLowerCase();
  return role === 'superadmin' || role === 'technical' || role === 'administrator';
};

const denyIfNotManager = (req, res) => {
  if (!canManageFile201(req)) {
    res.status(403).json({ success: false, message: 'Unauthorized for FILE 201 admin actions.' });
    return true;
  }
  return false;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const employeeNumber = req.body?.employeeNumber;
    const safeEmployeeNumber = sanitizeEmployeeNumber(employeeNumber);

    if (!safeEmployeeNumber) {
      return cb(new Error('Employee number is required for upload destination.'));
    }

    const targetDir = path.join(FILE201_ROOT, `employee_${safeEmployeeNumber}`);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = sanitizeFilename(path.basename(file.originalname || '', ext));
    const generatedName = `${Date.now()}_${base || 'document'}${ext}`;
    cb(null, generatedName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG.'));
    }
    cb(null, true);
  },
});

const uploadSingle = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File exceeds 50MB size limit.' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    }
    next();
  });
};

router.get('/admin/employees', authenticateToken, (req, res) => {
  if (denyIfNotManager(req, res)) return;

  const query = `
    SELECT
      u.employeeNumber,
      p.firstName,
      p.middleName,
      p.lastName
    FROM users u
    LEFT JOIN person_table p ON p.agencyEmployeeNum = u.employeeNumber
    ORDER BY p.lastName ASC, p.firstName ASC, u.employeeNumber ASC
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error('FILE201 employee list error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch employees.' });
    }

    const employees = (rows || []).map((row) => {
      const fullName = [row.lastName, row.firstName, row.middleName].filter(Boolean).join(', ');
      return {
        employeeNumber: row.employeeNumber,
        fullName: fullName || row.employeeNumber,
      };
    });

    res.json({ success: true, employees });
  });
});

router.post('/admin/documents', authenticateToken, (req, res, next) => {
  if (denyIfNotManager(req, res)) return;
  next();
}, uploadSingle, (req, res) => {
  const actorEmployeeNumber = String(req.user?.employeeNumber || '').trim();
  const employeeNumber = sanitizeEmployeeNumber(req.body?.employeeNumber);
  const remarks = String(req.body?.remarks || '').trim() || null;
  const fileType = String(req.body?.fileType || '').trim();

  if (!employeeNumber) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: 'Employee number is required.' });
  }

  if (!fileType) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: 'File type is required.' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const displayName = sanitizeFilename(req.file.originalname) || req.file.filename;
  const relativePath = buildRelativePath(employeeNumber, req.file.filename);

  const insertQuery = `
    INSERT INTO file201_documents
      (employee_number, file_name, file_type, stored_file_name, relative_path, uploaded_by_employee_number, upload_date, remarks)
    VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
  `;

  db.query(
    insertQuery,
    [
      employeeNumber,
      displayName,
      fileType,
      req.file.filename,
      relativePath,
      actorEmployeeNumber || null,
      remarks,
    ],
    (err, result) => {
      if (err) {
        console.error('FILE201 insert error:', err);
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ success: false, message: 'Failed to save document metadata.' });
      }

      logAudit(
        req.user,
        'Create',
        'file201_documents',
        result.insertId,
        employeeNumber,
        {
          fileName: displayName,
          fileType,
        },
      );

      return res.status(201).json({
        success: true,
        message: 'FILE 201 document uploaded successfully.',
        documentId: result.insertId,
      });
    },
  );
});

router.get('/admin/documents', authenticateToken, (req, res) => {
  if (denyIfNotManager(req, res)) return;

  const employeeNumberFilter = sanitizeEmployeeNumber(req.query?.employeeNumber);
  const fileTypeFilter = String(req.query?.fileType || '').trim();

  let query = `
    SELECT
      d.id,
      d.employee_number,
      d.file_name,
      d.file_type,
      d.stored_file_name,
      d.relative_path,
      d.uploaded_by_employee_number,
      d.upload_date,
      d.remarks,
      d.updated_at,
      TRIM(CONCAT(p.firstName, ' ', COALESCE(p.middleName, ''), ' ', p.lastName)) AS employee_name
    FROM file201_documents d
    LEFT JOIN person_table p ON p.agencyEmployeeNum = d.employee_number
    WHERE 1=1
  `;

  const params = [];

  if (employeeNumberFilter) {
    query += ' AND d.employee_number = ?';
    params.push(employeeNumberFilter);
  }

  if (fileTypeFilter) {
    query += ' AND d.file_type = ?';
    params.push(fileTypeFilter);
  }

  query += ' ORDER BY d.upload_date DESC';

  db.query(query, params, (err, rows) => {
    if (err) {
      console.error('FILE201 admin list error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch FILE 201 documents.' });
    }

    res.json({ success: true, documents: rows || [] });
  });
});

router.put('/admin/documents/:id', authenticateToken, (req, res) => {
  if (denyIfNotManager(req, res)) return;

  const { id } = req.params;
  const fileType = String(req.body?.fileType || '').trim();
  const remarks = String(req.body?.remarks || '').trim() || null;

  if (!fileType) {
    return res.status(400).json({ success: false, message: 'File type is required.' });
  }

  const findQuery = 'SELECT id, employee_number, file_type, remarks FROM file201_documents WHERE id = ? LIMIT 1';
  db.query(findQuery, [id], (findErr, rows) => {
    if (findErr) {
      console.error('FILE201 update find error:', findErr);
      return res.status(500).json({ success: false, message: 'Failed to update document.' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const updateQuery = 'UPDATE file201_documents SET file_type = ?, remarks = ?, updated_at = NOW() WHERE id = ?';
    db.query(updateQuery, [fileType, remarks, id], (updateErr) => {
      if (updateErr) {
        console.error('FILE201 update error:', updateErr);
        return res.status(500).json({ success: false, message: 'Failed to update document.' });
      }

      const previous = rows[0];
      logAudit(
        req.user,
        'Update',
        'file201_documents',
        id,
        previous.employee_number,
        {
          before: { fileType: previous.file_type, remarks: previous.remarks },
          after: { fileType, remarks },
        },
      );

      return res.json({ success: true, message: 'FILE 201 document updated.' });
    });
  });
});

router.delete('/admin/documents/:id', authenticateToken, (req, res) => {
  if (denyIfNotManager(req, res)) return;

  const { id } = req.params;
  const findQuery = 'SELECT id, employee_number, file_name, stored_file_name, relative_path FROM file201_documents WHERE id = ? LIMIT 1';

  db.query(findQuery, [id], (findErr, rows) => {
    if (findErr) {
      console.error('FILE201 delete find error:', findErr);
      return res.status(500).json({ success: false, message: 'Failed to delete document.' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = rows[0];
    const absolutePath = toAbsolutePath(doc.relative_path);

    if (absolutePath && fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (fsErr) {
        console.error('FILE201 delete file error:', fsErr);
        return res.status(500).json({ success: false, message: 'Failed to remove file from storage.' });
      }
    }

    db.query('DELETE FROM file201_documents WHERE id = ?', [id], (deleteErr) => {
      if (deleteErr) {
        console.error('FILE201 delete row error:', deleteErr);
        return res.status(500).json({ success: false, message: 'Failed to delete document metadata.' });
      }

      logAudit(req.user, 'Delete', 'file201_documents', id, doc.employee_number, {
        fileName: doc.file_name,
        storedFileName: doc.stored_file_name,
      });

      return res.json({ success: true, message: 'FILE 201 document deleted.' });
    });
  });
});

const streamDocument = (res, doc, options = {}) => {
  const absolutePath = toAbsolutePath(doc.relative_path);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return res.status(404).json({ success: false, message: 'File not found on server.' });
  }

  const downloadName = getDownloadName(doc);
  if (options.inline) {
    res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
    return fs.createReadStream(absolutePath).pipe(res);
  }
  return res.download(absolutePath, downloadName);
};

router.get('/admin/documents/:id/download', authenticateToken, (req, res) => {
  if (denyIfNotManager(req, res)) return;

  const { id } = req.params;
  const inline = String(req.query?.inline || '').toLowerCase() === '1';

  db.query(
    'SELECT id, employee_number, file_name, stored_file_name, relative_path FROM file201_documents WHERE id = ? LIMIT 1',
    [id],
    (err, rows) => {
      if (err) {
        console.error('FILE201 admin download error:', err);
        return res.status(500).json({ success: false, message: 'Failed to download document.' });
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Document not found.' });
      }

      return streamDocument(res, rows[0], { inline });
    },
  );
});

router.get('/me/documents', authenticateToken, (req, res) => {
  const employeeNumber = sanitizeEmployeeNumber(req.user?.employeeNumber);
  if (!employeeNumber) {
    return res.status(401).json({ success: false, message: 'Employee identity is missing from token.' });
  }

  const query = `
    SELECT
      id,
      employee_number,
      file_name,
      file_type,
      upload_date,
      remarks,
      updated_at
    FROM file201_documents
    WHERE employee_number = ?
    ORDER BY upload_date DESC
  `;

  db.query(query, [employeeNumber], (err, rows) => {
    if (err) {
      console.error('FILE201 self list error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch your FILE 201 documents.' });
    }
    return res.json({ success: true, documents: rows || [] });
  });
});

router.get('/me/documents/:id/download', authenticateToken, (req, res) => {
  const employeeNumber = sanitizeEmployeeNumber(req.user?.employeeNumber);
  const { id } = req.params;
  const inline = String(req.query?.inline || '').toLowerCase() === '1';

  if (!employeeNumber) {
    return res.status(401).json({ success: false, message: 'Employee identity is missing from token.' });
  }

  db.query(
    'SELECT id, employee_number, file_name, stored_file_name, relative_path FROM file201_documents WHERE id = ? AND employee_number = ? LIMIT 1',
    [id, employeeNumber],
    (err, rows) => {
      if (err) {
        console.error('FILE201 self download error:', err);
        return res.status(500).json({ success: false, message: 'Failed to download document.' });
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Document not found for your account.' });
      }

      return streamDocument(res, rows[0], { inline });
    },
  );
});

module.exports = router;
