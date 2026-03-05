import API_BASE_URL from '../apiConfig';
import axios from 'axios';

/**
 * Payroll Calculator Utility
 * Handles formula evaluation and payroll calculations on the frontend
 */

// Whitelist of allowed functions for formula evaluation
const ALLOWED_FUNCTIONS = {
  Math: {
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    abs: Math.abs,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
    sqrt: Math.sqrt,
  },
  parseFloat: parseFloat,
  parseInt: parseInt,
  Number: Number,
};

/**
 * Safely evaluate a formula expression
 * @param {string} formula - The formula expression to evaluate
 * @param {object} context - The data context (employee payroll data)
 * @returns {number} - The calculated result
 */
export function evaluateFormula(formula, context) {
  if (!formula || typeof formula !== 'string') {
    console.error('Invalid formula:', formula);
    return 0;
  }

  if (!context || typeof context !== 'object') {
    console.error('Invalid context:', context);
    return 0;
  }

  try {
    // Create a safe context with field names as direct variables
    // This allows simple syntax like "rateNbc594 + nbcDiffl597" instead of "parseFloat(item.rateNbc594 || 0) + parseFloat(item.nbcDiffl597 || 0)"
    const safeContext = {
      item: context,
      ...ALLOWED_FUNCTIONS,
    };

    // Add all context fields as direct variables for simple access
    // This makes formulas readable: "rateNbc594 + nbcDiffl597" instead of "parseFloat(item.rateNbc594 || 0) + parseFloat(item.nbcDiffl597 || 0)"
    Object.keys(context).forEach((key) => {
      const value = context[key];
      // Convert to number, default to 0 if invalid
      safeContext[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
    });

    // Create a function that evaluates the formula
    const funcParams = ['item', 'Math', 'parseFloat', 'parseInt', 'Number', ...Object.keys(context)];
    const funcBody = `"use strict"; return (${formula});`;
    
    const func = new Function(...funcParams, funcBody);

    const result = func(
      safeContext.item,
      safeContext.Math,
      safeContext.parseFloat,
      safeContext.parseInt,
      safeContext.Number,
      ...Object.keys(context).map(key => safeContext[key])
    );

    // Validate result is a number
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      console.warn(`Formula evaluation returned invalid result: ${result}`, {
        formula,
        context,
      });
      return 0;
    }

    return result;
  } catch (error) {
    console.error(`Error evaluating formula: ${formula}`, error, {
      context,
    });
    return 0;
  }
}

/**
 * Load formulas from API
 * @returns {Promise<Array>} - Array of formula objects
 */
export async function loadFormulas() {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/api/payroll-formulas`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error loading formulas:', error);
    throw error;
  }
}

/**
 * Calculate all payroll fields for an employee using formulas
 * @param {object} item - Employee payroll data
 * @param {Array} formulas - Array of formula objects from database
 * @returns {object} - Employee data with all calculated fields
 */
export function calculateAllFields(item, formulas) {
  if (!formulas || !Array.isArray(formulas) || formulas.length === 0) {
    console.warn('No formulas provided, returning original item');
    return item;
  }

  // Create a map of formulas by key for easy lookup
  const formulaMap = {};
  formulas.forEach((formula) => {
    formulaMap[formula.formula_key] = formula;
  });

  // Define calculation order based on dependencies
  // This ensures formulas are calculated in the correct order
  const calculationOrder = [
    'grossSalary',
    'abs',
    // TEVL/DVLT/VLB are salary components and must be calculated early
    // so they appear in the computed rows on the frontend.
    'tevl',
    'dvlt',
    'vlb',
    'PhilHealthContribution',
    'personalLifeRetIns',
    'netSalary',
    'totalGsisDeds',
    'totalPagibigDeds',
    'totalOtherDeds',
    'totalDeductions',
    'pay1stCompute',
    'pay2ndCompute',
    'pay1st',
    'pay2nd',
    'rtIns',
  ];

  // Create a result object starting with the original item data
  // Ensure all numeric fields are properly parsed
  const result = {
    ...item,
    // Ensure numeric fields are numbers
    h: parseInt(item.h) || 0,
    m: parseInt(item.m) || 0,
    s: parseInt(item.s) || 0,
    rateNbc594: parseFloat(item.rateNbc594) || 0,
    nbcDiffl597: parseFloat(item.nbcDiffl597) || 0,
    increment: parseFloat(item.increment) || 0,
    withholdingTax: parseFloat(item.withholdingTax) || 0,
    gsisSalaryLoan: parseFloat(item.gsisSalaryLoan) || 0,
    gsisPolicyLoan: parseFloat(item.gsisPolicyLoan) || 0,
    gsisArrears: parseFloat(item.gsisArrears) || 0,
    cpl: parseFloat(item.cpl) || 0,
    mpl: parseFloat(item.mpl) || 0,
    eal: parseFloat(item.eal) || 0,
    mplLite: parseFloat(item.mplLite) || 0,
    emergencyLoan: parseFloat(item.emergencyLoan) || 0,
    pagibigFundCont: parseFloat(item.pagibigFundCont) || 0,
    pagibig2: parseFloat(item.pagibig2) || 0,
    multiPurpLoan: parseFloat(item.multiPurpLoan) || 0,
    liquidatingCash: parseFloat(item.liquidatingCash) || 0,
    landbankSalaryLoan: parseFloat(item.landbankSalaryLoan) || 0,
    earistCreditCoop: parseFloat(item.earistCreditCoop) || 0,
    feu: parseFloat(item.feu) || 0,
    ec: parseFloat(item.ec) || 0,
  };

  // Calculate each field in order
  for (const key of calculationOrder) {
    const formula = formulaMap[key];
    if (formula && formula.is_active) {
      try {
        result[key] = evaluateFormula(formula.formula_expression, result);
      } catch (error) {
        console.error(`Error calculating ${key}:`, error);
        // Set to 0 if calculation fails
        result[key] = 0;
      }
    }
  }

  return result;
}

/**
 * Format a number with locale string formatting
 * @param {number} value - The number to format
 * @param {object} options - Formatting options
 * @returns {string} - Formatted string
 */
export function formatCurrency(value, options = {}) {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }

  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

