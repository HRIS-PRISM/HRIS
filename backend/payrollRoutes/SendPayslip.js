const db = require('../db');
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const multer = require('multer');
require('dotenv').config();
const { notifyPayrollChanged } = require('../socket/socketService');
const { authenticateToken, logAudit, requireAdmin } = require('../middleware/auth');

// Configure multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ✅ GET all users
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  const sql = 'SELECT username AS name, email, employeeNumber FROM users';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });

    res.json(results);
  });
});

// ✅ TEST endpoint
router.get('/test', (req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    gmailConfigured: !!(process.env.GMAIL_USER && process.env.GMAIL_PASS),
  });
});

// ✅ SEND payslip via Gmail
router.post(
  '/send-payslip',
  authenticateToken,
  requireAdmin,
  upload.single('pdf'),
  async (req, res) => {
    try {
      const { name, employeeNumber } = req.body;
      const pdfFile = req.file;

      if (!name || !employeeNumber || !pdfFile) {
        return res.status(400).json({
          error: 'Missing required fields',
          received: { name, employeeNumber, hasFile: !!pdfFile },
        });
      }

      // ✅ Lookup only by employeeNumber
      const sql = 'SELECT email FROM users WHERE employeeNumber = ?';
      db.query(sql, [employeeNumber], async (err, results) => {
        if (err)
          return res
            .status(500)
            .json({ error: 'Database error', details: err.message });
        if (results.length === 0)
          return res.status(404).json({ error: 'User not found' });

        const email = results[0].email;

        if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
          console.error('❌ Gmail credentials are missing in .env file');
        }

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false, // ✅ allow Gmail cert
          },
        });

        // ✅ Verify Gmail connection at startup
        transporter.verify((error, success) => {
          if (error) {
            console.error('❌ Gmail connection failed:', error);
          } else {
            console.log('✅ Gmail is ready to send emails');
          }
        });

        const mailOptions = {
          from: `"EARIST HR Testing Notice" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: `Payslip for ${name}`,
          text: `Dear ${name},\n\nPlease find your payslip attached. We encourage you to review the details carefully.\n\nIf you have any questions, notice mismatches and errors, or require further clarification, kindly reach out to the\nHR team at earisthrmstesting@gmail.com or go to the HR Office. Your concerns will be addressed promptly.\n\nWe sincerely appreciate your hard work and contributions to the Institution. Thank you for your continued dedication.\n\nBest regards,\nEARIST HR Testing Team`,
          attachments: [
            {
              filename: `${name}_payslip.pdf`,
              content: pdfFile.buffer,
            },
          ],
        };

        await transporter.sendMail(mailOptions);

        try {
          logAudit(
            req.user,
            'Send Payslip',
            'payslip_email',
            null,
            employeeNumber,
          );
        } catch (e) {
          console.error('Audit log error:', e);
        }

        notifyPayrollChanged('sent', {
          module: 'payslip',
          employeeNumber,
        });

        res.json({ success: true, message: 'Payslip sent successfully' });
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ✅ SEND payslips to selected employees only
router.post(
  '/send-bulk',
  authenticateToken,
  requireAdmin,
  upload.array('pdfs'),
  async (req, res) => {
    try {
      // Parse the selected employees sent from frontend
      const payslips = req.body.payslips ? JSON.parse(req.body.payslips) : [];
      const pdfFiles = req.files;

      if (!payslips.length || !pdfFiles.length) {
        return res.status(400).json({ error: 'Missing payslips or pdf files' });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
        tls: { rejectUnauthorized: false },
      });

      let results = [];

      for (let i = 0; i < payslips.length; i++) {
        const { name, employeeNumber } = payslips[i];
        const pdfFile = pdfFiles[i];

        // ✅ Fetch Gmail from DB
        const [rows] = await db
          .promise()
          .query('SELECT email FROM users WHERE employeeNumber = ?', [
            employeeNumber,
          ]);

        if (rows.length === 0) {
          results.push({
            employeeNumber,
            success: false,
            error: 'User not found',
          });
          continue;
        }

        const email = rows[0].email;

        // ✨ Updated HTML email with envelope animation
        const mailOptions = {
          from: `"EARIST HR Testing Notice" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: `Payslip for ${name} - ${payslips[i].period}`,
          text: `Dear ${name},


Please find your payslip attached. We encourage you to review the details carefully.


If you have any questions, notice mismatches or errors, or require clarification, kindly reach out to the HR team at earisthrmstesting@gmail.com or visit the HR Office.


We sincerely appreciate your hard work and dedication.


Best regards,
EARIST HR Testing Team`,
          html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 10px; border: 1px solid #eee; box-shadow: 0 3px 10px rgba(0,0,0,0.05);">
     
      <!-- ✉️ Animated Envelope Header -->
      <div style="text-align: center; padding-top: 20px;">
        <img src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExY25yMXU5MWdvbGF6NWR4YWc2cHJibGc4bTZtNTNjczVhZHE5cGo4YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0JM83bF1jbRsTnNu/giphy.gif" alt="Envelope Animation" width="120" style="border-radius: 8px;" />
      </div>


      <h3 style="color: #6D2323; text-align: center; margin-top: 10px;">EARIST HR - Monthly Payslip</h3>
     
      <div style="padding: 20px;">
        <p>Dear <strong>${name}</strong>,</p>
       
        <p>Please find your payslip attached. We encourage you to review the details carefully.</p>
       
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #6D2323; margin: 20px 0;">
          <p style="margin: 0;"><strong>Important:</strong> If you have any questions, notice mismatches and errors, or require further clarification, kindly reach out to the HR team.</p>
        </div>
       
        <p><strong>Contact Information:</strong><br>
        📧 Email: <a href="mailto:earisthrmstesting@gmail.com">earisthrmstesting@gmail.com</a><br>
        🏢 Visit: HR Office</p>
       
        <p>We sincerely appreciate your hard work and contributions to the Institution. Thank you for your continued dedication.</p>
      </div>
     
      <hr style="border: none; border-top: 1px solid #ddd; margin: 0 30px;">
     
      <div style="text-align: center; padding: 10px 0 20px 0; font-size: 12px; color: #666;">
        Best regards,<br>
        <strong>©Human Resources Information System. All rights Reserved.</strong><br>
        Eulogio "Amang" Rodriguez Institute of Science and Technology
      </div>
    </div>
  `,
          attachments: [
            {
              filename: `${name}_payslip_${new Date()
                .toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })
                .replace(' ', '_')}.pdf`,
              content: pdfFile.buffer,
            },
          ],
        };

        try {
          await transporter.sendMail(mailOptions);

          // Audit log after successful send
          try {
            const periodLabel = new Date().toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            });
            logAudit(
              req.user,
              'insert',
              'Send Payslip (bulk)',
              periodLabel,
              employeeNumber,
            );
          } catch (e) {
            console.error('Audit log error:', e);
          }

          // Create notification for employee
          try {
            const periodLabel = new Date().toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            });
            const notificationDescription = `Your payslip for ${periodLabel} has been processed and sent to your email. Click to view your payslip.`;

            // Check if notification_type and action_link columns exist, if not use description only
            db.query(
              `INSERT INTO notifications (employeeNumber, description, read_status, notification_type, action_link) 
               VALUES (?, ?, 0, 'payslip', '/payslip')`,
              [employeeNumber, notificationDescription],
              (notifErr) => {
                if (notifErr) {
                  // Fallback: try without notification_type and action_link
                  db.query(
                    `INSERT INTO notifications (employeeNumber, description, read_status) 
                     VALUES (?, ?, 0)`,
                    [employeeNumber, notificationDescription],
                    (fallbackErr) => {
                      if (fallbackErr) {
                        console.error('Notification error:', fallbackErr);
                      }
                    },
                  );
                }
              },
            );
          } catch (notifError) {
            console.error('Error creating notification:', notifError);
          }

          results.push({ employeeNumber, success: true });
        } catch (err) {
          results.push({ employeeNumber, success: false, error: err.message });
        }
      }

      const sentCount = results.filter((r) => r.success).length;
      notifyPayrollChanged('sent', {
        module: 'payslip-bulk',
        sentCount,
      });

      res.json({ success: true, results });
    } catch (err) {
      console.error('Bulk send error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

module.exports = router;
