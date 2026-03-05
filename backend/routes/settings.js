const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');
const { upload } = require('../middleware/upload');

// ── Generalized default settings ─────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  primaryColor:                '#894444',
  secondaryColor:              '#6d2323',
  accentColor:                 '#FFFFFF',
  textColor:                   '#FFFFFF',
  textPrimaryColor:            '#6D2323',
  textSecondaryColor:          '#FFFFFF',
  hoverColor:                  '#512424',
  backgroundColor:             '#FFFFFF',
  sidebarGradientEnd:          '#3a0f0f',
  institutionLogo:             '',
  hrisLogo:                    '',
  institutionName:             'Institution Name',
  systemName:                  'Human Resource Information System',
  institutionAbbreviation:     'INST',
  footerText:                  '© 2026 - HUMAN RESOURCE INFORMATION SYSTEM.  ALL RIGHTS RESERVED.',
  copyrightSymbol:             '©',
  enableWatermark:             'true',
  actionButtonColor:           '#6d2323',
  actionButtonHoverColor:      '#a31d1d',
  destructiveButtonColor:      '#6c757d',
  destructiveButtonHoverColor: '#5a6268',
  // Modal / Dialog colors
  modalBackgroundColor:        '#FFFFFF',
  modalHeaderColor:            '#6d2323',
  modalHeaderTextColor:        '#FFFFFF',
  modalBodyTextColor:          '#333333',
  modalBorderColor:            '#894444',
  // Footer contact
  adminEmail:                  'hrinformationsystemhris@gmail.com',
};

// ── Helper: convert DB rows array → settings object ──────────────────────────
const rowsToSettings = (rows) => {
  const settings = {};
  rows.forEach((row) => {
    settings[row.setting_key] =
      row.setting_key === 'enableWatermark'
        ? row.setting_value === 'true'
        : row.setting_value;
  });
  return settings;
};

// ── Helper: merge fetched settings with defaults (fills any missing keys) ─────
const mergeWithDefaults = (fetched) => {
  const merged = { ...DEFAULT_SETTINGS };
  Object.keys(fetched).forEach((key) => {
    merged[key] = fetched[key];
  });
  return merged;
};

// ============================================
// SYSTEM SETTINGS ROUTES
// ============================================

// GET all system settings
router.get('/api/system-settings', (req, res) => {
  console.log('GET /api/system-settings called');

  db.query("SHOW TABLES LIKE 'system_settings'", (err, tables) => {
    if (err) {
      console.error('Error checking table:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (tables.length === 0) {
      console.warn('system_settings table does not exist — returning defaults');
      return res.json(DEFAULT_SETTINGS);
    }

    db.query('SELECT * FROM system_settings', (err, rows) => {
      if (err) {
        console.error('Error fetching system settings:', err);
        return res.status(500).json({ error: 'Failed to fetch system settings', details: err.message });
      }

      if (rows.length === 0) {
        console.log('No settings rows found — returning defaults');
        return res.json(DEFAULT_SETTINGS);
      }

      const settings = mergeWithDefaults(rowsToSettings(rows));
      console.log('Returning settings');
      res.json(settings);
    });
  });
});

// GET single setting by key
router.get('/api/system-settings/:key', (req, res) => {
  const { key } = req.params;

  db.query(
    'SELECT * FROM system_settings WHERE setting_key = ?',
    [key],
    (err, rows) => {
      if (err) {
        console.error('Error fetching setting:', err);
        return res.status(500).json({ error: 'Failed to fetch setting', details: err.message });
      }

      if (rows.length === 0) {
        if (DEFAULT_SETTINGS[key] !== undefined) {
          return res.json({ setting_key: key, setting_value: DEFAULT_SETTINGS[key] });
        }
        return res.status(404).json({ error: 'Setting not found' });
      }

      res.json(rows[0]);
    }
  );
});

// UPDATE system settings (bulk upsert)
router.put('/api/system-settings', (req, res) => {
  console.log('PUT /api/system-settings called');

  const settings = req.body;

  if (!settings || Object.keys(settings).length === 0) {
    return res.status(400).json({ error: 'No settings provided' });
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection:', err);
      return res.status(500).json({ error: 'Database connection error', details: err.message });
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        console.error('Error starting transaction:', err);
        return res.status(500).json({ error: 'Transaction error', details: err.message });
      }

      const entries = Object.entries(settings);
      let completed = 0;
      let hasError = false;

      entries.forEach(([key, value]) => {
        if (hasError) return;

        const settingValue = typeof value === 'boolean' ? value.toString() : value;

        connection.query(
          `INSERT INTO system_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = ?`,
          [key, settingValue, settingValue],
          (err) => {
            if (err && !hasError) {
              hasError = true;
              console.error('Error upserting setting:', key, err);
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ error: 'Failed to update settings', details: err.message });
              });
            }

            completed++;

            if (completed === entries.length && !hasError) {
              connection.commit((err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    console.error('Error committing transaction:', err);
                    res.status(500).json({ error: 'Failed to commit changes', details: err.message });
                  });
                }

                connection.release();
                console.log('Settings updated successfully');
                res.json({ success: true, message: 'Settings updated successfully' });
              });
            }
          }
        );
      });
    });
  });
});

// UPDATE single setting by key
router.put('/api/system-settings/:key', (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  const settingValue = typeof value === 'boolean' ? value.toString() : value;

  db.query(
    `INSERT INTO system_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = ?`,
    [key, settingValue, settingValue],
    (err) => {
      if (err) {
        console.error('Error updating setting:', err);
        return res.status(500).json({ error: 'Failed to update setting', details: err.message });
      }

      res.json({ success: true, message: 'Setting updated successfully' });
    }
  );
});

// DELETE single setting by key
router.delete('/api/system-settings/:key', (req, res) => {
  const { key } = req.params;

  db.query(
    'DELETE FROM system_settings WHERE setting_key = ?',
    [key],
    (err) => {
      if (err) {
        console.error('Error deleting setting:', err);
        return res.status(500).json({ error: 'Failed to delete setting', details: err.message });
      }

      res.json({ success: true, message: 'Setting deleted successfully' });
    }
  );
});

// RESET all settings to defaults
router.post('/api/system-settings/reset', (req, res) => {
  console.log('POST /api/system-settings/reset called');

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection:', err);
      return res.status(500).json({ error: 'Database connection error', details: err.message });
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: 'Transaction error', details: err.message });
      }

      connection.query('DELETE FROM system_settings', (err) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            console.error('Error deleting settings:', err);
            res.status(500).json({ error: 'Failed to delete settings', details: err.message });
          });
        }

        const defaultEntries = Object.entries(DEFAULT_SETTINGS);
        let completed = 0;
        let hasError = false;

        defaultEntries.forEach(([key, value]) => {
          if (hasError) return;

          connection.query(
            'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)',
            [key, value.toString()],
            (err) => {
              if (err && !hasError) {
                hasError = true;
                return connection.rollback(() => {
                  connection.release();
                  console.error('Error inserting default setting:', key, err);
                  res.status(500).json({ error: 'Failed to insert default settings', details: err.message });
                });
              }

              completed++;

              if (completed === defaultEntries.length && !hasError) {
                connection.commit((err) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      console.error('Error committing reset transaction:', err);
                      res.status(500).json({ error: 'Failed to commit changes', details: err.message });
                    });
                  }

                  connection.release();
                  console.log('Settings reset to defaults successfully');
                  res.json({ success: true, message: 'Settings reset to default successfully' });
                });
              }
            }
          );
        });
      });
    });
  });
});

// ============================================
// LEGACY SETTINGS ROUTES (settings table)
// ============================================

router.get('/api/settings', (req, res) => {
  db.query('SELECT * FROM settings WHERE id = 1', (err, result) => {
    if (err) throw err;
    res.send(result[0]);
  });
});

const deleteOldLogo = (logoUrl) => {
  if (!logoUrl) return;
  const logoPath = path.join(__dirname, logoUrl);
  fs.unlink(logoPath, (err) => {
    if (err) {
      console.error(`Error deleting old logo at ${logoPath}:`, err);
    } else {
      console.log(`Old logo deleted: ${logoPath}`);
    }
  });
};

router.post('/api/settings', upload.single('logo'), (req, res) => {
  const companyName  = req.body.company_name  || '';
  const headerColor  = req.body.header_color  || '#ffffff';
  const footerText   = req.body.footer_text   || '';
  const footerColor  = req.body.footer_color  || '#ffffff';
  const logoUrl      = req.file ? `/uploads/${req.file.filename}` : null;

  db.query('SELECT * FROM settings WHERE id = 1', (err, result) => {
    if (err) throw err;

    if (result.length > 0) {
      const oldLogoUrl = result[0].logo_url;

      const query =
        'UPDATE settings SET company_name = ?, header_color = ?, footer_text = ?, footer_color = ?' +
        (logoUrl ? ', logo_url = ?' : '') +
        ' WHERE id = 1';
      const params = [companyName, headerColor, footerText, footerColor];
      if (logoUrl) params.push(logoUrl);

      db.query(query, params, (err) => {
        if (err) throw err;
        if (logoUrl && oldLogoUrl) deleteOldLogo(oldLogoUrl);
        res.send({ success: true });
      });
    } else {
      const query =
        'INSERT INTO settings (company_name, header_color, footer_text, footer_color, logo_url) VALUES (?, ?, ?, ?, ?)';
      db.query(query, [companyName, headerColor, footerText, footerColor, logoUrl], (err) => {
        if (err) throw err;
        res.send({ success: true });
      });
    }
  });
});

module.exports = router;