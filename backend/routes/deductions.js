const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { getDeductionOptions } = require("../services/deductionPolicyService");

const parseBool = (v) => {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  const s = String(v ?? "").trim().toLowerCase();
  if (["true", "1", "yes"].includes(s)) return true;
  if (["false", "0", "no"].includes(s)) return false;
  return null;
};

/**
 * GET /api/deductions/options
 * Query: employeeNumber, context=ABSENCE|HALF_DAY|TARDINESS, hasLeaveForm
 */
router.get("/options", authenticateToken, async (req, res) => {
  const employeeNumber = String(req.query.employeeNumber || "").trim();
  const context = String(req.query.context || "").trim().toUpperCase();
  const hasLeaveForm = parseBool(req.query.hasLeaveForm);

  if (!employeeNumber) {
    return res.status(400).json({ error: "employeeNumber is required" });
  }
  if (hasLeaveForm === null) {
    return res
      .status(400)
      .json({ error: "hasLeaveForm is required (true or false)" });
  }
  if (!["ABSENCE", "HALF_DAY", "TARDINESS"].includes(context)) {
    return res
      .status(400)
      .json({ error: "context must be ABSENCE, HALF_DAY, or TARDINESS" });
  }

  try {
    const { options } = await getDeductionOptions({
      employeeNumber,
      context,
      hasLeaveForm,
    });
    const values = options.map((o) => o.value);
    if (!values.length) {
      return res.json({ options: [{ value: "SALARY_DEDUCTION", label: "Salary Deduction" }] });
    }
    res.json({ options });
  } catch (e) {
    console.error("[deductions/options]", e.message);
    res.status(500).json({ error: "Failed to load deduction options" });
  }
});

module.exports = router;
