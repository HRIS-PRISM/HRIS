const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const transporter = require('../config/email');
const { authenticateToken } = require('../middleware/auth');
const { verificationCodes, generateVerificationCode } = require('../utils/verificationCodes');

const RECAPTCHA_SECRET_KEY = '6LczLdwrAAAAAOJjTxN85KXGfCSZfM68l4YOYMr9';

// Update email
router.post('/update-email', authenticateToken, (req, res) => {
  const { email } = req.body;
  const userId = req.user.id;
  const employeeNumber = req.user.employeeNumber;

  if (!email) return res.status(400).json({ error: 'Email is required.' });
  if (!employeeNumber)
    return res.status(400).json({ error: 'employeeNumber missing in JWT' });

  db.query('UPDATE users SET email = ? WHERE id = ?', [email, userId], (err, userResult) => {
    if (err)
      return res.status(500).json({ error: 'Failed to update users table.' });

    if (userResult.affectedRows === 0)
      return res.status(404).json({ error: 'User not found in users table.' });

    db.query(
      'UPDATE person_table SET emailAddress = ? WHERE agencyEmployeeNum = ?',
      [email, employeeNumber],
      (err, personResult) => {
        if (err)
          return res.status(500).json({ error: 'Failed to update person_table.' });

        if (personResult.affectedRows === 0)
          return res.status(404).json({
            error: 'User not found in person_table. Check employeeNumber.',
          });

        res.json({ message: 'Email updated in both users and person_table.' });
      }
    );
  });
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  const { email, recaptchaToken } = req.body;

  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!recaptchaToken)
    return res.status(400).json({ error: 'Please verify that you are not a robot.' });

  try {
    const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;
    const response = await fetch(verificationURL, { method: 'POST' });
    const data = await response.json();

    if (!data.success) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed.' });
    }
  } catch (err) {
    console.error('reCAPTCHA error:', err);
    return res.status(500).json({ error: 'Server error during reCAPTCHA verification.' });
  }

  try {
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'No account found with this email address' });
      }

      const user = results[0];
      const verificationCode = generateVerificationCode();

      verificationCodes.set(email, {
        code: verificationCode,
        expires: Date.now() + 15 * 60 * 1000,
        userId: user.id,
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #A31D1D;">Password Reset Request</h2>
            <p>Hello ${user.username},</p>
            <p>You requested to reset your password. Below is the verification code:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <h1 style="color: #A31D1D; font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
            </div>
            <p>This code will expire in 15 minutes. Make sure to use it before expiration.</p>
            <p>Please ignore this message if you didn't request this password reset.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message from your HRIS system.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: 'Verification code sent to your email' });
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify reset code
router.post('/verify-reset-code', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  const storedData = verificationCodes.get(email);

  if (!storedData) {
    return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
  }

  if (Date.now() > storedData.expires) {
    verificationCodes.delete(email);
    return res.status(400).json({
      error: 'Verification code has expired. Please request a new one.',
    });
  }

  if (storedData.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  res.json({
    message: 'Code verified successfully',
    userId: storedData.userId,
    verified: true,
  });
});

// Reset password
router.post('/reset-password', async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  if (!email || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const storedData = verificationCodes.get(email);

  if (!storedData) {
    return res.status(400).json({ error: 'Invalid or expired session. Please start over.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password = ? WHERE email = ?';
    db.query(query, [hashedPassword, email], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to update password' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      verificationCodes.delete(email);
      res.json({ message: 'Password updated successfully' });
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Verify reCAPTCHA
router.post('/verify-recaptcha', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'reCAPTCHA token is required.' });
  }

  try {
    const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`;
    const response = await fetch(verificationURL, { method: 'POST' });
    const data = await response.json();

    if (data.success) {
      return res.json({ success: true, message: 'reCAPTCHA verified.' });
    } else {
      return res.status(400).json({ success: false, error: 'reCAPTCHA verification failed.' });
    }
  } catch (err) {
    console.error('Error verifying reCAPTCHA:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error during reCAPTCHA verification.',
    });
  }
});

// Verify current password
router.post('/verify-current-password', authenticateToken, async (req, res) => {
  try {
    const { email, employeeNumber, currentPassword } = req.body;

    if (!email || !employeeNumber || !currentPassword) {
      return res.status(400).json({
        error: 'Email, employee number, and current password are required',
      });
    }

    const query = 'SELECT password FROM users WHERE email = ? AND employeeNumber = ? LIMIT 1';
    db.query(query, [email, employeeNumber], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      res.json({ message: 'Password verified', verified: true });
    });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send password change code
router.post('/send-password-change-code', authenticateToken, async (req, res) => {
  try {
    const { email, employeeNumber } = req.body;

    if (!email || !employeeNumber) {
      return res.status(400).json({
        error: 'Email and employee number are required',
      });
    }

    const query = `
      SELECT p.firstName, p.middleName, p.lastName, p.nameExtension,
             CONCAT(
               p.firstName,
               CASE WHEN p.middleName IS NOT NULL AND p.middleName != '' THEN CONCAT(' ', p.middleName) ELSE '' END,
               ' ',
               p.lastName,
               CASE WHEN p.nameExtension IS NOT NULL AND p.nameExtension != '' THEN CONCAT(' ', p.nameExtension) ELSE '' END
             ) as fullName
      FROM users u
      LEFT JOIN person_table p ON u.employeeNumber = p.agencyEmployeeNum
      WHERE u.email = ? AND u.employeeNumber = ?
      LIMIT 1
    `;

    db.query(query, [email, employeeNumber], async (err, result) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result[0];
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      verificationCodes.set(`${email}:${employeeNumber}`, {
        code,
        expires: Date.now() + 10 * 60 * 1000,
      });

      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: email,
          subject: 'Password Change Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #A31D1D;">Password Change Request</h2>
              <p>Hello ${user.fullName},</p>
              <p>You requested to change your password. Your verification code is:</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                <h1 style="color: #A31D1D; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
              </div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this, please ignore this email and contact HRIS immediately.</p>
              <hr style="margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">This is an automated message from your HRIS system.</p>
            </div>
          `,
        });

        res.json({ message: 'Verification code sent successfully' });
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
        res.status(500).json({ error: 'Failed to send email' });
      }
    });
  } catch (error) {
    console.error('Error sending password change code:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify password change code
router.post('/verify-password-change-code', async (req, res) => {
  try {
    const { email, employeeNumber, code } = req.body;

    if (!email || !employeeNumber || !code) {
      return res.status(400).json({
        error: 'Email, employee number, and code are required',
      });
    }

    const storedData = verificationCodes.get(`${email}:${employeeNumber}`);

    if (!storedData) {
      return res.status(400).json({
        error: 'No verification code found. Please request a new one.',
      });
    }

    if (Date.now() > storedData.expires) {
      verificationCodes.delete(`${email}:${employeeNumber}`);
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new one.',
      });
    }

    if (storedData.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    res.json({ verified: true, message: 'Code verified successfully' });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Complete password change
router.post('/complete-password-change', async (req, res) => {
  try {
    const { email, employeeNumber, newPassword, confirmPassword } = req.body;

    if (!email || !employeeNumber || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'Email, employee number, new password, and confirm password are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const storedData = verificationCodes.get(`${email}:${employeeNumber}`);
    if (!storedData) {
      return res.status(400).json({ error: 'Invalid or expired session. Please start over.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password = ?, isDefaultPassword = 0 WHERE email = ? AND employeeNumber = ?';
    db.query(query, [hashedPassword, email, employeeNumber], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to update password' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      verificationCodes.delete(`${email}:${employeeNumber}`);
      res.json({ message: 'Password changed successfully' });
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;