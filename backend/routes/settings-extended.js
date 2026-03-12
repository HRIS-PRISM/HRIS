const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { notifyContactThreadChanged } = require('../socket/socketService');

// ============================================
// FAQs ROUTES
// ============================================

// GET all FAQs
router.get('/api/faqs', (req, res) => {
  const { category } = req.query;
  let query = 'SELECT * FROM faqs WHERE is_active = 1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY display_order ASC, id ASC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching FAQs:', err);
      return res.status(500).json({ error: 'Failed to fetch FAQs' });
    }
    res.json(results);
  });
});

// GET single FAQ
router.get('/api/faqs/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM faqs WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Error fetching FAQ:', err);
      return res.status(500).json({ error: 'Failed to fetch FAQ' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    res.json(results[0]);
  });
});

// POST create FAQ (admin only)
router.post('/api/faqs', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'superadmin' && userRole !== 'administrator' && userRole !== 'technical' && userRole !== 'technical') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  const { question, answer, category, display_order } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required' });
  }

  const query = `
    INSERT INTO faqs (question, answer, category, display_order)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    query,
    [question, answer, category || 'general', display_order || 0],
    (err, result) => {
      if (err) {
        console.error('Error creating FAQ:', err);
        return res.status(500).json({ error: 'Failed to create FAQ' });
      }
      res.status(201).json({ id: result.insertId, message: 'FAQ created successfully' });
    }
  );
});

// PUT update FAQ (admin only)
router.put('/api/faqs/:id', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'superadmin' && userRole !== 'administrator' && userRole !== 'technical') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  const { id } = req.params;
  const { question, answer, category, display_order, is_active } = req.body;

  const updates = [];
  const params = [];

  if (question !== undefined) {
    updates.push('question = ?');
    params.push(question);
  }
  if (answer !== undefined) {
    updates.push('answer = ?');
    params.push(answer);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    params.push(category);
  }
  if (display_order !== undefined) {
    updates.push('display_order = ?');
    params.push(display_order);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);

  const query = `UPDATE faqs SET ${updates.join(', ')} WHERE id = ?`;

  db.query(query, params, (err) => {
    if (err) {
      console.error('Error updating FAQ:', err);
      return res.status(500).json({ error: 'Failed to update FAQ' });
    }
    res.json({ message: 'FAQ updated successfully' });
  });
});

// DELETE FAQ (admin only)
router.delete('/api/faqs/:id', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'superadmin' && userRole !== 'administrator' && userRole !== 'technical') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  const { id } = req.params;
  db.query('DELETE FROM faqs WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting FAQ:', err);
      return res.status(500).json({ error: 'Failed to delete FAQ' });
    }
    res.json({ message: 'FAQ deleted successfully' });
  });
});

// ============================================
// USER PREFERENCES ROUTES
// ============================================

// GET user preferences (public endpoint for login check, also supports authenticated)
router.get('/api/user-preferences/:employeeNumber', (req, res) => {
  const { employeeNumber } = req.params;

  db.query(
    'SELECT * FROM user_preferences WHERE employee_number = ?',
    [employeeNumber],
    (err, results) => {
      if (err) {
        console.error('Error fetching user preferences:', err);
        return res.status(500).json({ error: 'Failed to fetch user preferences' });
      }

      if (results.length === 0) {
        // Return default preferences if none exist
        return res.json({
          employee_number: employeeNumber,
          enable_mfa: 1, // Default to enabled
        });
      }

      res.json(results[0]);
    }
  );
});

// PUT update user preferences
router.put('/api/user-preferences/:employeeNumber', authenticateToken, (req, res) => {
  const { employeeNumber } = req.params;
  const { enable_mfa } = req.body;

  // Check if preferences exist
  db.query(
    'SELECT * FROM user_preferences WHERE employee_number = ?',
    [employeeNumber],
    (err, results) => {
      if (err) {
        console.error('Error checking user preferences:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        // Insert new preferences
        db.query(
          'INSERT INTO user_preferences (employee_number, enable_mfa) VALUES (?, ?)',
          [employeeNumber, enable_mfa !== undefined ? (enable_mfa ? 1 : 0) : 1],
          (err, result) => {
            if (err) {
              console.error('Error creating user preferences:', err);
              return res.status(500).json({ error: 'Failed to create preferences' });
            }
            res.json({ message: 'Preferences updated successfully' });
          }
        );
      } else {
        // Update existing preferences
        const updates = [];
        const params = [];

        if (enable_mfa !== undefined) {
          updates.push('enable_mfa = ?');
          params.push(enable_mfa ? 1 : 0);
        }

        if (updates.length === 0) {
          return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(employeeNumber);

        db.query(
          `UPDATE user_preferences SET ${updates.join(', ')} WHERE employee_number = ?`,
          params,
          (err) => {
            if (err) {
              console.error('Error updating user preferences:', err);
              return res.status(500).json({ error: 'Failed to update preferences' });
            }
            res.json({ message: 'Preferences updated successfully' });
          }
        );
      }
    }
  );
});

// ============================================
// ABOUT US ROUTES
// ============================================

// GET About Us content
router.get('/api/about-us', (req, res) => {
  db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1', (err, results) => {
    if (err) {
      console.error('Error fetching About Us:', err);
      return res.status(500).json({ error: 'Failed to fetch About Us content' });
    }

    if (results.length === 0) {
      return res.json({
        title: 'About Us',
        content: '<p>Content coming soon...</p>',
        version: null,
      });
    }

    res.json(results[0]);
  });
});

// PUT update About Us (admin only)
router.put('/api/about-us', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'superadmin' && userRole !== 'administrator' && userRole !== 'technical') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  const { title, content, version } = req.body;
  const employeeNumber = req.user?.employeeNumber || 'system';

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  // Check if About Us exists
  db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1', (err, results) => {
    if (err) {
      console.error('Error checking About Us:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      // Insert new About Us
      db.query(
        'INSERT INTO about_us (title, content, version, last_updated_by) VALUES (?, ?, ?, ?)',
        [title, content, version || null, employeeNumber],
        (err, result) => {
          if (err) {
            console.error('Error creating About Us:', err);
            return res.status(500).json({ error: 'Failed to create About Us' });
          }
          res.json({ id: result.insertId, message: 'About Us created successfully' });
        }
      );
    } else {
      // Update existing About Us
      const id = results[0].id;
      db.query(
        'UPDATE about_us SET title = ?, content = ?, version = ?, last_updated_by = ? WHERE id = ?',
        [title, content, version || null, employeeNumber, id],
        (err) => {
          if (err) {
            console.error('Error updating About Us:', err);
            return res.status(500).json({ error: 'Failed to update About Us' });
          }
          res.json({ message: 'About Us updated successfully' });
        }
      );
    }
  });
});

// ============================================
// CONTACT US ROUTES
// ============================================

// POST create contact message (public - anyone can submit)
router.post('/api/contact-us', authenticateToken, upload.single('attachment'), (req, res) => {
  const { name, email, subject, message } = req.body;
  const attachment = req.file ? `/uploads/${req.file.filename}` : null;
  const employeeNumber = req.user?.employeeNumber || null;
  const senderRole = req.user?.role || 'staff';

  if (!name || !email || (!message && !attachment)) {
    return res.status(400).json({ error: 'Name, email, and message or attachment are required' });
  }

  const query = `
    INSERT INTO contact_us (name, email, subject, message, employee_number)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [name, email, subject || null, message || '', employeeNumber],
    (err, result) => {
      if (err) {
        console.error('Error creating contact message:', err);
        return res.status(500).json({ error: 'Failed to submit contact message' });
      }

      const contactId = result.insertId;
      const submitterName = name || 'A user';
      const notificationDescription = `${submitterName} submitted a new ticket${subject ? `: ${subject}` : ''}. Click to view details.`;

      // Insert initial message into thread
      db.query(
        `INSERT INTO contact_us_messages
          (contact_id, sender_role, sender_employee_number, sender_name, sender_email, message, attachment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [contactId, senderRole, employeeNumber, name, email, message || '', attachment],
        (msgErr) => {
          if (msgErr) {
            console.error('Error creating contact message thread:', msgErr);
          }
        }
      );

      notifyContactThreadChanged('created', {
        contactId,
        employeeNumber,
      });

      // Send response immediately (don't wait for notifications)
      res.status(201).json({ id: contactId, message: 'Contact message submitted successfully' });

      // Create notifications for all admins, superadmins, and technical (async, non-blocking)
      db.query(
        'SELECT employeeNumber FROM users WHERE role IN (?, ?, ?)',
        ['superadmin', 'administrator', 'technical'],
        (adminErr, admins) => {
          if (adminErr) {
            console.error('Error fetching admins for notification:', adminErr);
            return; // Don't block response
          }

          // Create notifications for each admin
          if (Array.isArray(admins) && admins.length > 0) {
            const notificationPromises = admins.map((admin) => {
              return new Promise((resolve) => {
                const adminEmpNum = String(admin.employeeNumber).trim();
                if (!adminEmpNum) {
                  resolve({ success: false });
                  return;
                }

                // Try with notification_type and action_link
                db.query(
                  `INSERT INTO notifications (employeeNumber, description, read_status, notification_type, action_link) 
                   VALUES (?, ?, 0, 'contact', '/settings')`,
                  [adminEmpNum, notificationDescription],
                  (notifErr) => {
                    if (notifErr) {
                      // Fallback: try without notification_type and action_link
                      db.query(
                        `INSERT INTO notifications (employeeNumber, description, read_status) 
                         VALUES (?, ?, 0)`,
                        [adminEmpNum, notificationDescription],
                        (fallbackErr) => {
                          if (fallbackErr) {
                            console.error(`Error creating notification for admin ${adminEmpNum}:`, fallbackErr);
                            resolve({ success: false });
                          } else {
                            resolve({ success: true });
                          }
                        }
                      );
                    } else {
                      resolve({ success: true });
                    }
                  }
                );
              });
            });

            Promise.all(notificationPromises).then(() => {
              console.log(`Created notifications for ${admins.length} admin(s) about new ticket ${contactId}`);
            }).catch((err) => {
              console.error('Error creating notifications:', err);
            });
          }
        }
      );
    }
  );
});

// GET all contact messages (admin only)
router.get('/api/contact-us', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  const isAdmin =
    userRole === 'superadmin' ||
    userRole === 'administrator' ||
    userRole === 'technical';

  if (!isAdmin && userRole !== 'staff') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT * FROM contact_us WHERE 1=1';
  const params = [];

  if (!isAdmin) {
    query += ' AND employee_number = ?';
    params.push(req.user?.employeeNumber || '');
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching contact messages:', err);
      return res.status(500).json({ error: 'Failed to fetch contact messages' });
    }

    let countQuery = 'SELECT COUNT(*) as total FROM contact_us WHERE 1=1';
    const countParams = [];

    if (!isAdmin) {
      countQuery += ' AND employee_number = ?';
      countParams.push(req.user?.employeeNumber || '');
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    db.query(countQuery, countParams, (err, countResult) => {
      if (err) {
        console.error('Error counting contact messages:', err);
        return res.status(500).json({ error: 'Failed to count contact messages' });
      }

      res.json({
        data: results,
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    });
  });
});

// GET single contact message (admin only)
router.get('/api/contact-us/:id', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  const isAdmin =
    userRole === 'superadmin' ||
    userRole === 'administrator' ||
    userRole === 'technical';

  if (!isAdmin && userRole !== 'staff') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { id } = req.params;
  db.query('SELECT * FROM contact_us WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Error fetching contact message:', err);
      return res.status(500).json({ error: 'Failed to fetch contact message' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    const ticket = results[0];
    if (!isAdmin && ticket.employee_number !== req.user?.employeeNumber) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(ticket);
  });
});

// GET contact message thread (admin can view all, staff only own)
router.get('/api/contact-us/:id/messages', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  const isAdmin =
    userRole === 'superadmin' ||
    userRole === 'administrator' ||
    userRole === 'technical';

  const { id } = req.params;

  db.query('SELECT employee_number FROM contact_us WHERE id = ?', [id], (fetchErr, rows) => {
    if (fetchErr) {
      console.error('Error fetching contact message:', fetchErr);
      return res.status(500).json({ error: 'Failed to fetch contact message' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    const owner = rows[0].employee_number;
    if (!isAdmin && owner !== req.user?.employeeNumber) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    db.query(
      'SELECT * FROM contact_us_messages WHERE contact_id = ? ORDER BY created_at ASC',
      [id],
      (err, results) => {
        if (err) {
          console.error('Error fetching contact message thread:', err);
          return res.status(500).json({ error: 'Failed to fetch contact messages' });
        }
        res.json({ data: results });
      },
    );
  });
});

// POST add message to thread (admin or staff on own ticket)
router.post('/api/contact-us/:id/messages', authenticateToken, upload.single('attachment'), (req, res) => {
  const userRole = req.user?.role;
  const isAdmin =
    userRole === 'superadmin' ||
    userRole === 'administrator' ||
    userRole === 'technical';

  const { id } = req.params;
  const { message, status } = req.body;
  const attachment = req.file ? `/uploads/${req.file.filename}` : null;

  if (!message && !attachment) {
    return res.status(400).json({ error: 'Message or attachment is required' });
  }

  db.query('SELECT employee_number, name, email, status FROM contact_us WHERE id = ?', [id], (fetchErr, rows) => {
    if (fetchErr) {
      console.error('Error fetching contact message:', fetchErr);
      return res.status(500).json({ error: 'Failed to fetch contact message' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    const owner = rows[0].employee_number;
    const currentStatus = rows[0].status;
    if (!isAdmin && owner !== req.user?.employeeNumber) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (currentStatus === 'resolved') {
      return res.status(403).json({ error: 'Ticket is resolved. You can no longer reply.' });
    }

    const senderName = req.user?.username || rows[0].name || 'User';
    const senderEmail = req.user?.email || rows[0].email || null;
    const senderEmployeeNumber = req.user?.employeeNumber || owner || null;

    db.query(
      `INSERT INTO contact_us_messages
        (contact_id, sender_role, sender_employee_number, sender_name, sender_email, message, attachment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userRole || 'staff', senderEmployeeNumber, senderName, senderEmail, message || '', attachment],
      (msgErr, result) => {
        if (msgErr) {
          console.error('Error creating contact message thread:', msgErr);
          return res.status(500).json({ error: 'Failed to send message' });
        }

        // Update status based on sender
        const nextStatus = status || (isAdmin ? 'replied' : (currentStatus === 'resolved' ? 'on_process' : 'new'));
        db.query('UPDATE contact_us SET status = ? WHERE id = ?', [nextStatus, id], (stErr) => {
          if (stErr) {
            console.error('Error updating contact status:', stErr);
          }
        });

        // Update admin_notes for compatibility when admin replies
        if (isAdmin && message) {
          db.query('UPDATE contact_us SET admin_notes = ? WHERE id = ?', [message, id], (noteErr) => {
            if (noteErr) console.error('Error updating admin notes:', noteErr);
          });
        }

        // Notify admins on staff reply
        if (!isAdmin) {
          db.query(
            'SELECT employeeNumber FROM users WHERE role IN (?, ?, ?)',
            ['superadmin', 'administrator', 'technical'],
            (adminErr, admins) => {
              if (adminErr) {
                console.error('Error fetching admins for notification:', adminErr);
                return;
              }
              if (Array.isArray(admins) && admins.length > 0) {
                const description = `New reply from ${senderName}. Click to view details.`;
                admins.forEach((admin) => {
                  const adminEmpNum = String(admin.employeeNumber).trim();
                  if (!adminEmpNum) return;
                  db.query(
                    `INSERT INTO notifications (employeeNumber, description, read_status, notification_type, action_link) 
                     VALUES (?, ?, 0, 'contact', '/settings')`,
                    [adminEmpNum, description],
                    (notifErr) => {
                      if (notifErr) {
                        db.query(
                          `INSERT INTO notifications (employeeNumber, description, read_status) 
                           VALUES (?, ?, 0)`,
                          [adminEmpNum, description],
                          () => {},
                        );
                      }
                    },
                  );
                });
              }
            },
          );
        } else if (owner) {
          const description = `Admin ${senderName} replied to your ticket. Click to view response.`;
          db.query(
            `INSERT INTO notifications (employeeNumber, description, read_status, notification_type, action_link) 
             VALUES (?, ?, 0, 'contact', '/settings')`,
            [String(owner).trim(), description],
            (notifErr) => {
              if (notifErr) {
                db.query(
                  `INSERT INTO notifications (employeeNumber, description, read_status) 
                   VALUES (?, ?, 0)`,
                  [String(owner).trim(), description],
                  () => {},
                );
              }
            },
          );
        }

        notifyContactThreadChanged('message', {
          contactId: Number(id),
          employeeNumber: owner,
        });

        res.status(201).json({ id: result.insertId, message: 'Message sent' });
      },
    );
  });
});

// ============================================
// FEEDBACK ROUTES (for resolved tickets)
// ============================================

// GET feedback thread for a ticket (admin can view all, staff only own)
router.get('/api/contact-us/:id/feedback', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  const isAdmin =
    userRole === 'superadmin' ||
    userRole === 'administrator' ||
    userRole === 'technical';

  const { id } = req.params;

  db.query('SELECT employee_number FROM contact_us WHERE id = ?', [id], (fetchErr, rows) => {
    if (fetchErr) {
      console.error('Error fetching contact message:', fetchErr);
      return res.status(500).json({ error: 'Failed to fetch contact message' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    const owner = rows[0].employee_number;
    if (!isAdmin && owner !== req.user?.employeeNumber) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const senderEmployeeNumber = req.user?.employeeNumber || null;
    const senderEmail = req.user?.email || null;
    const query = isAdmin
      ? 'SELECT * FROM feedbacks WHERE contact_id = ? ORDER BY created_at ASC'
      : 'SELECT * FROM feedbacks WHERE contact_id = ? AND (sender_employee_number = ? OR sender_email = ?) ORDER BY created_at ASC';
    const params = isAdmin ? [id] : [id, senderEmployeeNumber, senderEmail];

    db.query(query, params, (err, results) => {
        if (err) {
          console.error('Error fetching feedback thread:', err);
          return res.status(500).json({ error: 'Failed to fetch feedback messages' });
        }
        res.json({ data: results });
      });
  });
});

// POST feedback message (admin or staff on own ticket)
router.post('/api/contact-us/:id/feedback', authenticateToken, upload.single('attachment'), (req, res) => {
  const userRole = req.user?.role;
  const isAdmin =
    userRole === 'superadmin' ||
    userRole === 'administrator' ||
    userRole === 'technical';

  const { id } = req.params;
  const { message, rating } = req.body;
  const attachment = req.file ? `/uploads/${req.file.filename}` : null;

  if (isAdmin) {
    return res.status(403).json({ error: 'Admins can only view feedback.' });
  }

  if (!message && !attachment && !rating) {
    return res.status(400).json({ error: 'Message or attachment is required' });
  }

  db.query('SELECT employee_number, name, email, status FROM contact_us WHERE id = ?', [id], (fetchErr, rows) => {
    if (fetchErr) {
      console.error('Error fetching contact message:', fetchErr);
      return res.status(500).json({ error: 'Failed to fetch contact message' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    const owner = rows[0].employee_number;
    if (!isAdmin && owner !== req.user?.employeeNumber) {
      return res.status(403).json({ error: 'Access denied.' });
    }

  const senderName = req.user?.username || rows[0].name || 'User';
  const senderEmail = req.user?.email || rows[0].email || null;
  const senderEmployeeNumber = req.user?.employeeNumber || owner || null;

    const identifier = senderEmployeeNumber || senderEmail;
    db.query(
      'SELECT COUNT(*) AS cnt FROM feedbacks WHERE contact_id = ? AND (sender_employee_number = ? OR sender_email = ?)',
      [id, identifier, identifier],
      (countErr, countRows) => {
        if (countErr) {
          console.error('Error checking feedback count:', countErr);
          return res.status(500).json({ error: 'Failed to validate feedback submission' });
        }

        if (countRows?.[0]?.cnt > 0) {
          return res.status(409).json({ error: 'You can only submit feedback once per ticket.' });
        }

        const safeRating = rating !== undefined && rating !== null && rating !== '' ? Number(rating) : null;
        db.query(
          `INSERT INTO feedbacks
            (contact_id, sender_role, sender_employee_number, sender_name, sender_email, message, attachment, rating)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, userRole || 'staff', senderEmployeeNumber, senderName, senderEmail, message || '', attachment, Number.isNaN(safeRating) ? null : safeRating],
          (msgErr, result) => {
            if (msgErr) {
              console.error('Error creating feedback message:', msgErr);
              return res.status(500).json({ error: 'Failed to send feedback' });
            }

            notifyContactThreadChanged('feedback', {
              contactId: Number(id),
              employeeNumber: owner,
            });

            res.status(201).json({ id: result.insertId, message: 'Feedback sent' });
          },
        );
      },
    );
  });
});

// PUT update contact message (admin only - for status and notes)
router.put('/api/contact-us/:id', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'superadmin' && userRole !== 'administrator' && userRole !== 'technical') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  const { id } = req.params;
  const { status, admin_notes } = req.body;

  const updates = [];
  const params = [];

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (admin_notes !== undefined) {
    updates.push('admin_notes = ?');
    params.push(admin_notes);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);

  const query = `UPDATE contact_us SET ${updates.join(', ')} WHERE id = ?`;

  // First, get the contact message to find the submitter
  db.query('SELECT employee_number, name, email FROM contact_us WHERE id = ?', [id], (fetchErr, contactResults) => {
    if (fetchErr) {
      console.error('Error fetching contact message:', fetchErr);
      return res.status(500).json({ error: 'Failed to fetch contact message' });
    }

    if (contactResults.length === 0) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    const contactMessage = contactResults[0];
    const submitterEmployeeNumber = contactMessage.employee_number;

      // Update the contact message
      db.query(query, params, (err) => {
        if (err) {
          console.error('Error updating contact message:', err);
          return res.status(500).json({ error: 'Failed to update contact message' });
        }

        notifyContactThreadChanged('status', {
          contactId: Number(id),
          employeeNumber: submitterEmployeeNumber,
        });

      // If admin_notes provided, append to thread for messenger view
      if (admin_notes) {
        const senderName = req.user?.username || 'Admin';
        const senderEmail = req.user?.email || null;
        const senderEmployeeNumber = req.user?.employeeNumber || null;
        db.query(
          `INSERT INTO contact_us_messages
            (contact_id, sender_role, sender_employee_number, sender_name, sender_email, message)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, req.user?.role || 'admin', senderEmployeeNumber, senderName, senderEmail, admin_notes],
          (msgErr) => {
            if (msgErr) console.error('Error appending admin note to thread:', msgErr);
          },
        );
      }

      // Create notification for the staff member who submitted the ticket
      // Only if admin_notes was added (meaning admin responded) or status changed to replied/resolved
      if (submitterEmployeeNumber && (admin_notes || (status && ['replied', 'resolved'].includes(status)))) {
        const adminName = req.user?.username || 'Admin';
        let notificationDescription = '';
        
        if (admin_notes) {
          notificationDescription = `Admin ${adminName} has responded to your ticket. Click to view response.`;
        } else if (status === 'replied') {
          notificationDescription = `Your ticket has been marked as replied by ${adminName}.`;
        } else if (status === 'resolved') {
          notificationDescription = `Your ticket has been resolved by ${adminName}.`;
        }

        if (notificationDescription) {
          const submitterEmpNum = String(submitterEmployeeNumber).trim();
          
          // Try with notification_type and action_link
          db.query(
            `INSERT INTO notifications (employeeNumber, description, read_status, notification_type, action_link) 
             VALUES (?, ?, 0, 'contact', '/settings')`,
            [submitterEmpNum, notificationDescription],
            (notifErr) => {
              if (notifErr) {
                // Fallback: try without notification_type and action_link
                db.query(
                  `INSERT INTO notifications (employeeNumber, description, read_status) 
                   VALUES (?, ?, 0)`,
                  [submitterEmpNum, notificationDescription],
                  (fallbackErr) => {
                    if (fallbackErr) {
                      console.error(`Error creating notification for staff ${submitterEmpNum}:`, fallbackErr);
                    } else {
                      console.log(`Created notification for staff ${submitterEmpNum} about ticket ${id} response`);
                    }
                  }
                );
              } else {
                console.log(`Created notification for staff ${submitterEmpNum} about ticket ${id} response`);
              }
            }
          );
        }
      }

      res.json({ message: 'Contact message updated successfully' });
    });
  });
});

// DELETE contact message (admin only)
router.delete('/api/contact-us/:id', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'superadmin' && userRole !== 'administrator' && userRole !== 'technical') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  const { id } = req.params;
  db.query('DELETE FROM contact_us WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting contact message:', err);
      return res.status(500).json({ error: 'Failed to delete contact message' });
    }
    res.json({ message: 'Contact message deleted successfully' });
  });
});

// ============================================
// POLICIES ROUTES 
// ============================================

// Helper function to generate version
const generateVersion = (category, id) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT CONCAT(COUNT(*) + 1, '.0.0') as version
      FROM policies 
      WHERE category = ? AND id <= ?
    `;
    db.query(query, [category, id], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0].version);
      }
    });
  });
};

// GET all policies
router.get('/api/policies', (req, res) => {
  const { category } = req.query;
  let query = `
    SELECT 
      id, 
      title, 
      content, 
      category, 
      display_order, 
      is_active, 
      created_at, 
      updated_at, 
      last_updated_by,
      (SELECT COUNT(*) + 1 FROM policies p2 WHERE p2.category = policies.category AND p2.id <= policies.id) as version
    FROM policies 
    WHERE is_active = 1
  `;
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY display_order ASC, id ASC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching policies:', err);
      return res.status(500).json({ error: 'Failed to fetch policies' });
    }
    res.json(results);
  });
});

// GET single policy
router.get('/api/policies/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      id, 
      title, 
      content, 
      category, 
      display_order, 
      is_active, 
      created_at, 
      updated_at, 
      last_updated_by,
      (SELECT COUNT(*) + 1 FROM policies p2 WHERE p2.category = policies.category AND p2.id <= policies.id) as version
    FROM policies 
    WHERE id = ?
  `;
  
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error fetching policy:', err);
      return res.status(500).json({ error: 'Failed to fetch policy' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    res.json(results[0]);
  });
});

// POST create policy (admin only)
router.post('/api/policies', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'superadmin' && userRole !== 'administrator' && userRole !== 'technical') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  const { title, content, category, display_order } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const query = `
    INSERT INTO policies (title, content, category, display_order, last_updated_by)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [title, content, category || 'general', display_order || 0, req.user?.employeeNumber || 'system'],
    async (err, result) => {
      if (err) {
        console.error('Error creating policy:', err);
        return res.status(500).json({ error: 'Failed to create policy' });
      }
      
      try {
        // Generate version for the new policy
        const version = await generateVersion(category || 'general', result.insertId);
        res.status(201).json({ 
          id: result.insertId, 
          version: version,
          message: 'Policy created successfully' 
        });
      } catch (versionErr) {
        console.error('Error generating version:', versionErr);
        res.status(201).json({ 
          id: result.insertId, 
          message: 'Policy created successfully' 
        });
      }
    }
  );
});

// PUT update policy (admin only)
router.put('/api/policies/:id', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'superadmin' && userRole !== 'administrator' && userRole !== 'technical') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  const { id } = req.params;
  const { title, content, category, display_order, is_active } = req.body;

  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    params.push(category);
  }
  if (display_order !== undefined) {
    updates.push('display_order = ?');
    params.push(display_order);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('last_updated_by = ?');
  params.push(req.user?.employeeNumber || 'system');
  params.push(id);

  const query = `UPDATE policies SET ${updates.join(', ')} WHERE id = ?`;

  db.query(query, params, async (err) => {
    if (err) {
      console.error('Error updating policy:', err);
      return res.status(500).json({ error: 'Failed to update policy' });
    }
    
    try {
      // Generate new version after update
      const version = await generateVersion(category || 'general', parseInt(id));
      res.json({ 
        version: version,
        message: 'Policy updated successfully' 
      });
    } catch (versionErr) {
      console.error('Error generating version:', versionErr);
      res.json({ message: 'Policy updated successfully' });
    }
  });
});

// DELETE policy (admin only)
router.delete('/api/policies/:id', authenticateToken, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'superadmin' && userRole !== 'administrator' && userRole !== 'technical') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  const { id } = req.params;
  
  // First check if the policy exists
  const checkQuery = 'SELECT id FROM policies WHERE id = ?';
  db.query(checkQuery, [id], (err, results) => {
    if (err) {
      console.error('Error checking policy:', err);
      return res.status(500).json({ error: 'Failed to check policy' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    // Delete the policy
    const deleteQuery = 'DELETE FROM policies WHERE id = ?';
    db.query(deleteQuery, [id], (err, result) => {
      if (err) {
        console.error('Error deleting policy:', err);
        return res.status(500).json({ error: 'Failed to delete policy' });
      }
      
      res.json({ message: 'Policy deleted successfully' });
    });
  });
});

module.exports = router;

