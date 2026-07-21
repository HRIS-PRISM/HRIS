const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireSelfOrAdmin } = require('../middleware/auth');
const { profileUpload } = require('../middleware/upload');

// Profile picture upload endpoint
router.post(
  '/upload-profile-picture/:employeeNumber',
  authenticateToken,
  requireSelfOrAdmin('employeeNumber'),
  profileUpload.single('profile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { employeeNumber } = req.params;
      const filePath = `/uploads/profile_pictures/${req.file.filename}`;

      // Update the person_table with the new profile picture path
      const query =
        'UPDATE person_table SET profile_picture = ? WHERE agencyEmployeeNum = ?';

      db.query(query, [filePath, employeeNumber], (err, result) => {
        if (err) {
          console.error('Error updating profile picture:', err);
          return res
            .status(500)
            .json({ error: 'Failed to update profile picture' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({
          message: 'Profile picture updated successfully',
          filePath: filePath,
        });
      });
    } catch (error) {
      console.error('Error in profile picture upload:', error);
      res.status(500).json({ error: 'Failed to upload profile picture' });
    }
  }
);

module.exports = router;




