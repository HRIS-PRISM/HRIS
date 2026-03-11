const db = require('../db');
const express = require('express');
const router = express.Router();
const { validateFormula } = require('../services/PayrollCalculator');
const { notifyPayrollChanged } = require('../socket/socketService');
const { authenticateToken, logAudit } = require('../middleware/auth');

/**
 * GET /api/payroll-formulas
 * Get all active payroll formulas
 */
router.get('/api/payroll-formulas', authenticateToken, (req, res) => {
  const { includeInactive } = req.query;
  const query = includeInactive === 'true'
    ? 'SELECT * FROM payroll_formulas ORDER BY id ASC'
    : 'SELECT * FROM payroll_formulas WHERE is_active = TRUE ORDER BY id ASC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching payroll formulas:', err);
      return res.status(500).json({
        error: 'Failed to fetch payroll formulas',
        details: err.message,
      });
    }

    // Parse JSON dependencies
    const formulas = results.map((formula) => ({
      ...formula,
      dependencies: formula.dependencies
        ? JSON.parse(formula.dependencies)
        : [],
    }));

    res.json(formulas);
  });
});

/**
 * GET /api/payroll-formulas/:key
 * Get a specific formula by key
 */
router.get('/api/payroll-formulas/:key', authenticateToken, (req, res) => {
  const { key } = req.params;

  db.query(
    'SELECT * FROM payroll_formulas WHERE formula_key = ?',
    [key],
    (err, results) => {
      if (err) {
        console.error('Error fetching payroll formula:', err);
        return res.status(500).json({
          error: 'Failed to fetch payroll formula',
          details: err.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Formula not found' });
      }

      const formula = results[0];
      formula.dependencies = formula.dependencies
        ? JSON.parse(formula.dependencies)
        : [];

      res.json(formula);
    }
  );
});

/**
 * POST /api/payroll-formulas
 * Create a new payroll formula
 */
router.post('/api/payroll-formulas', authenticateToken, (req, res) => {
  const {
    formula_key,
    formula_expression,
    description,
    dependencies,
    is_active = true,
  } = req.body;

  // Validation
  if (!formula_key || !formula_expression) {
    return res.status(400).json({
      error: 'Missing required fields: formula_key and formula_expression are required',
    });
  }

  // Validate formula syntax
  const validation = validateFormula(formula_expression);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid formula syntax',
      details: validation.error,
    });
  }

  // Check if formula_key already exists
  db.query(
    'SELECT id FROM payroll_formulas WHERE formula_key = ?',
    [formula_key],
    (err, results) => {
      if (err) {
        console.error('Error checking formula existence:', err);
        return res.status(500).json({
          error: 'Database error',
          details: err.message,
        });
      }

      if (results.length > 0) {
        return res.status(409).json({
          error: 'Formula key already exists',
        });
      }

      // Insert new formula
      const dependenciesJson = dependencies
        ? JSON.stringify(dependencies)
        : null;

      db.query(
        `INSERT INTO payroll_formulas 
         (formula_key, formula_expression, description, dependencies, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          formula_key,
          formula_expression,
          description || null,
          dependenciesJson,
          is_active,
          req.user?.employeeNumber || req.user?.username || 'system',
        ],
        (err, result) => {
          if (err) {
            console.error('Error creating payroll formula:', err);
            return res.status(500).json({
              error: 'Failed to create payroll formula',
              details: err.message,
            });
          }

          // Fetch the created formula
          db.query(
            'SELECT * FROM payroll_formulas WHERE id = ?',
            [result.insertId],
            (err2, results2) => {
              if (err2) {
                console.error('Error fetching created formula:', err2);
                return res.status(500).json({
                  error: 'Formula created but failed to fetch',
                  details: err2.message,
                });
              }

              const formula = results2[0];
              formula.dependencies = formula.dependencies
                ? JSON.parse(formula.dependencies)
                : [];

              // Log audit
              logAudit(
                req.user,
                `Created payroll formula: ${formula_key}`,
                'payroll_formulas',
                result.insertId
              );

              notifyPayrollChanged('created', {
                module: 'payroll-formulas',
                id: result.insertId,
                formula_key,
              });

              res.status(201).json(formula);
            }
          );
        }
      );
    }
  );
});

/**
 * PUT /api/payroll-formulas/:key
 * Update an existing payroll formula
 */
router.put('/api/payroll-formulas/:key', authenticateToken, (req, res) => {
  const { key } = req.params;
  const {
    formula_expression,
    description,
    dependencies,
    is_active,
  } = req.body;

  // Check if formula exists
  db.query(
    'SELECT id FROM payroll_formulas WHERE formula_key = ?',
    [key],
    (err, results) => {
      if (err) {
        console.error('Error checking formula existence:', err);
        return res.status(500).json({
          error: 'Database error',
          details: err.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Formula not found' });
      }

      // Validate formula syntax if expression is being updated
      if (formula_expression) {
        const validation = validateFormula(formula_expression);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid formula syntax',
            details: validation.error,
          });
        }
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (formula_expression !== undefined) {
        updates.push('formula_expression = ?');
        values.push(formula_expression);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (dependencies !== undefined) {
        updates.push('dependencies = ?');
        values.push(JSON.stringify(dependencies));
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'No fields to update',
        });
      }

      values.push(key);

      db.query(
        `UPDATE payroll_formulas 
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE formula_key = ?`,
        values,
        (err2) => {
          if (err2) {
            console.error('Error updating payroll formula:', err2);
            return res.status(500).json({
              error: 'Failed to update payroll formula',
              details: err2.message,
            });
          }

          // Fetch the updated formula
          db.query(
            'SELECT * FROM payroll_formulas WHERE formula_key = ?',
            [key],
            (err3, results3) => {
              if (err3) {
                console.error('Error fetching updated formula:', err3);
                return res.status(500).json({
                  error: 'Formula updated but failed to fetch',
                  details: err3.message,
                });
              }

              const formula = results3[0];
              formula.dependencies = formula.dependencies
                ? JSON.parse(formula.dependencies)
                : [];

              notifyPayrollChanged('updated', {
                module: 'payroll-formulas',
                formula_key: key,
              });

              res.json(formula);
            }
          );
        }
      );
    }
  );
});

/**
 * DELETE /api/payroll-formulas/:key
 * Soft delete a payroll formula (set is_active = false)
 */
router.delete('/api/payroll-formulas/:key', authenticateToken, (req, res) => {
  const { key } = req.params;

  db.query(
    'UPDATE payroll_formulas SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE formula_key = ?',
    [key],
    (err, result) => {
      if (err) {
        console.error('Error deleting payroll formula:', err);
        return res.status(500).json({
          error: 'Failed to delete payroll formula',
          details: err.message,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Formula not found' });
      }

      // Log audit
      db.query(
        'SELECT id FROM payroll_formulas WHERE formula_key = ?',
        [key],
        (err2, results2) => {
          if (!err2 && results2.length > 0) {
            logAudit(
              req.user,
              `Deleted payroll formula: ${key}`,
              'payroll_formulas',
              results2[0].id
            );
          }
        }
      );

      notifyPayrollChanged('deleted', { module: 'payroll-formulas', formula_key: key });

      res.json({
        success: true,
        message: 'Formula deleted successfully',
      });
    }
  );
});

module.exports = router;

