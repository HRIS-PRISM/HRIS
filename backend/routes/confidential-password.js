const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { authenticateToken, logAudit, requireSuperAdmin, requireAdmin } = require('../middleware/auth');
const {
  getCurrentTemporaryPassword,
  verifyTemporaryPassword,
} = require('../utils/temporaryConfidentialPassword');

// GET: Check if password exists (superadmin only)
router.get('/api/confidential-password/exists', authenticateToken, requireSuperAdmin, (req, res) => {
  const query = 'SELECT id, created_at, updated_at, created_by, updated_by FROM confidential_password ORDER BY id DESC LIMIT 1';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error checking password existence:', err);
      return res.status(500).json({ error: 'Failed to check password existence' });
    }

    res.json({ exists: results.length > 0, passwordInfo: results[0] || null });
  });
});

// POST: Create or update confidential password (superadmin only)
router.post('/api/confidential-password', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { password } = req.body;
  const employeeNumber = req.user.employeeNumber;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if password already exists
    const checkQuery = 'SELECT id FROM confidential_password ORDER BY id DESC LIMIT 1';
    db.query(checkQuery, async (err, results) => {
      if (err) {
        console.error('Error checking existing password:', err);
        return res.status(500).json({ error: 'Failed to check existing password' });
      }

      if (results.length > 0) {
        // Update existing password
        const updateQuery = `
          UPDATE confidential_password 
          SET password_hash = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        db.query(updateQuery, [hashedPassword, employeeNumber, results[0].id], (updateErr) => {
          if (updateErr) {
            console.error('Error updating password:', updateErr);
            return res.status(500).json({ error: 'Failed to update password' });
          }

          // Log audit
          try {
            logAudit(req.user, 'Update', 'confidential_password', results[0].id, null);
          } catch (e) {
            console.error('Audit log error:', e);
          }

          res.json({ message: 'Confidential password updated successfully' });
        });
      } else {
        // Create new password
        const insertQuery = `
          INSERT INTO confidential_password (password_hash, created_by, updated_by) 
          VALUES (?, ?, ?)
        `;
        db.query(insertQuery, [hashedPassword, employeeNumber, employeeNumber], (insertErr, insertResult) => {
          if (insertErr) {
            console.error('Error creating password:', insertErr);
            return res.status(500).json({ error: 'Failed to create password' });
          }

          // Log audit
          try {
            logAudit(req.user, 'Create', 'confidential_password', insertResult.insertId, null);
          } catch (e) {
            console.error('Audit log error:', e);
          }

          res.json({ message: 'Confidential password created successfully' });
        });
      }
    });
  } catch (error) {
    console.error('Error processing password:', error);
    res.status(500).json({ error: 'Failed to process password' });
  }
});

// GET: Current rotating temporary password (admin roles — shown in module unlock modals)
router.get('/api/confidential-password/temporary', authenticateToken, requireAdmin, (req, res) => {
  try {
    const info = getCurrentTemporaryPassword();
    res.json({
      ...info,
      note: 'This password rotates automatically. The permanent password from System Administration still works.',
    });
  } catch (error) {
    console.error('Error generating temporary password:', error);
    res.status(500).json({ error: 'Failed to generate temporary password' });
  }
});

// POST: Verify confidential password (static or current rotating temporary)
router.post('/api/confidential-password/verify', authenticateToken, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    if (verifyTemporaryPassword(password)) {
      return res.json({
        verified: true,
        message: 'Temporary password verified successfully',
        method: 'temporary',
      });
    }

    const query = 'SELECT password_hash FROM confidential_password ORDER BY id DESC LIMIT 1';
    db.query(query, async (err, results) => {
      if (err) {
        console.error('Error fetching password:', err);
        return res.status(500).json({ error: 'Failed to verify password' });
      }

      if (results.length === 0) {
        return res.status(401).json({
          error:
            'Incorrect password. Use the current temporary password shown in this dialog, or ask superadmin to set a permanent confidential password.',
        });
      }

      const isMatch = await bcrypt.compare(password, results[0].password_hash);

      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password' });
      }

      res.json({
        verified: true,
        message: 'Password verified successfully',
        method: 'permanent',
      });
    });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

module.exports = router;




