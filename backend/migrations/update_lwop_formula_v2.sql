-- ============================================================================
-- PATCH v2 — Update lwopRatePerDay formula to use payrollMonthDays
-- ============================================================================
-- This migration updates the lwopRatePerDay formula to use the 
-- payrollMonthDays value injected by the frontend month button.
-- If payrollMonthDays is not present, it falls back to deriving 
-- calendar days from the endDate/startDate strings.
-- ============================================================================

UPDATE `payroll_formulas`
SET
  `formula_expression` = '(function() {\n    /* If the month button injected a day count, use it directly */\n    if (item.payrollMonthDays && item.payrollMonthDays > 0) {\n      return parseFloat(item.grossSalary || 0) / item.payrollMonthDays;\n    }\n    /* Fallback: derive from endDate or startDate string */\n    var dateStr = item.endDate || item.startDate || "";\n    var parts   = dateStr.split("-");\n    var year    = parseInt(parts[0], 10);\n    var month   = parseInt(parts[1], 10);\n    var days    = (year && month)\n      ? new Date(year, month, 0).getDate()\n      : 30;\n    return parseFloat(item.grossSalary || 0) / days;\n  })()',
  `description`        = 'LWOP rate per day — uses designated payroll month day count injected by month button (payrollMonthDays), falling back to calendar days derived from endDate/startDate string',
  `dependencies`       = '[\"grossSalary\", \"payrollMonthDays\", \"endDate\", \"startDate\"]',
  `updated_at`         = NOW()
WHERE `formula_key` = 'lwopRatePerDay';
