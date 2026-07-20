const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// WORKING HOURS — defaults
// ─────────────────────────────────────────────────────────────────────────────
const WH_DEFAULTS = {
  '8hr': Array.from({ length: 8 }, (_, i) => ({
    rate_type: 'hour', day_type: '8hr', rate_value: i + 1,
    decimal_equivalent: Number(((i + 1) * 0.125).toFixed(3)),
  })),
  '6hr': Array.from({ length: 8 }, (_, i) => ({
    rate_type: 'hour', day_type: '6hr', rate_value: i + 1,
    decimal_equivalent: Number(((i + 1) * 0.167).toFixed(3)),
  })),
  minutes: Array.from({ length: 60 }, (_, i) => ({
    rate_type: 'minute', day_type: 'minute', rate_value: i + 1,
    decimal_equivalent: Number(((i + 1) * 0.002).toFixed(3)),
  })),
};

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE CREDITS — defaults
// ─────────────────────────────────────────────────────────────────────────────
const LC_DEFAULT_LWP = Array.from({ length: 30 }, (_, i) => ({
  rate_type: 'lwp',
  rate_value: i + 1,
  decimal_equivalent: Number(((i + 1) * 0.04167).toFixed(3)),
}));

// abs rate_value stored as absence_days * 10 to keep it an integer PK
// e.g. 0.5 days → 5 | 1.0 → 10 | 29.5 → 295
const LC_DEFAULT_ABS = [
  { a: 0.5,  e: 1.229 }, { a: 1.0,  e: 1.208 }, { a: 1.5,  e: 1.188 },
  { a: 2.0,  e: 1.167 }, { a: 2.5,  e: 1.146 }, { a: 3.0,  e: 1.125 },
  { a: 3.5,  e: 1.104 }, { a: 4.0,  e: 1.083 }, { a: 4.5,  e: 1.063 },
  { a: 5.0,  e: 1.042 }, { a: 5.5,  e: 1.021 }, { a: 6.0,  e: 1.000 },
  { a: 6.5,  e: 0.979 }, { a: 7.0,  e: 0.958 }, { a: 7.5,  e: 0.938 },
  { a: 8.0,  e: 0.917 }, { a: 8.5,  e: 0.854 }, { a: 9.0,  e: 0.833 },
  { a: 9.5,  e: 0.875 }, { a: 10.0, e: 0.833 }, { a: 10.5, e: 0.813 },
  { a: 11.0, e: 0.792 }, { a: 11.5, e: 0.771 }, { a: 12.0, e: 0.750 },
  { a: 12.5, e: 0.729 }, { a: 13.0, e: 0.708 }, { a: 13.5, e: 0.687 },
  { a: 14.0, e: 0.667 }, { a: 14.5, e: 0.646 }, { a: 15.0, e: 0.625 },
  { a: 15.5, e: 0.604 }, { a: 16.0, e: 0.583 }, { a: 16.5, e: 0.562 },
  { a: 17.0, e: 0.542 }, { a: 17.5, e: 0.521 }, { a: 18.0, e: 0.500 },
  { a: 18.5, e: 0.479 }, { a: 19.0, e: 0.458 }, { a: 19.5, e: 0.437 },
  { a: 20.0, e: 0.417 }, { a: 20.5, e: 0.396 }, { a: 21.0, e: 0.375 },
  { a: 21.5, e: 0.354 }, { a: 22.0, e: 0.333 }, { a: 22.5, e: 0.312 },
  { a: 23.0, e: 0.292 }, { a: 23.5, e: 0.271 }, { a: 24.0, e: 0.250 },
  { a: 24.5, e: 0.229 }, { a: 25.0, e: 0.208 }, { a: 25.5, e: 0.187 },
  { a: 26.0, e: 0.167 }, { a: 26.5, e: 0.146 }, { a: 27.0, e: 0.125 },
  { a: 27.5, e: 0.104 }, { a: 28.0, e: 0.083 }, { a: 28.5, e: 0.062 },
  { a: 29.0, e: 0.042 }, { a: 29.5, e: 0.021 },
].map(({ a, e }) => ({
  rate_type: 'abs',
  rate_value: Math.round(a * 10),
  decimal_equivalent: e,
}));

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function getWorkingHoursRates() {
  try {
    const [rows] = await db.promise().query(
      `SELECT rate_type, day_type, rate_value, decimal_equivalent
       FROM working_hours_rates
       ORDER BY rate_type, day_type, rate_value`,
    );

    const hours8 = [], hours6 = [], minutes = [];
    rows.forEach((row) => {
      const entry = {
        rate_type: row.rate_type,
        day_type: row.day_type,
        rate_value: Number(row.rate_value),
        decimal_equivalent: Number(parseFloat(row.decimal_equivalent).toFixed(3)),
      };
      if (row.rate_type === 'hour' && row.day_type === '8hr') hours8.push(entry);
      else if (row.rate_type === 'hour' && row.day_type === '6hr') hours6.push(entry);
      else if (row.rate_type === 'minute') minutes.push(entry);
    });

    return {
      hours8:   hours8.length   === 8  ? hours8   : WH_DEFAULTS['8hr'],
      hours6:   hours6.length   === 8  ? hours6   : WH_DEFAULTS['6hr'],
      minutes:  minutes.length  === 60 ? minutes  : WH_DEFAULTS.minutes,
    };
  } catch {
    return {
      hours8:  WH_DEFAULTS['8hr'],
      hours6:  WH_DEFAULTS['6hr'],
      minutes: WH_DEFAULTS.minutes,
    };
  }
}

async function getLeaveCreditsRates() {
  try {
    const [rows] = await db.promise().query(
      `SELECT rate_type, rate_value, decimal_equivalent
       FROM leave_credits_rates
       ORDER BY rate_type, rate_value`,
    );

    const lwpRows = rows.filter((r) => r.rate_type === 'lwp');
    const absRows = rows.filter((r) => r.rate_type === 'abs');

    const lwp = (lwpRows.length === 30 ? lwpRows : LC_DEFAULT_LWP).map((r) => ({
      d: Number(r.rate_value),
      e: Number(parseFloat(r.decimal_equivalent).toFixed(3)),
    }));

    const abs = (absRows.length === 60 ? absRows : LC_DEFAULT_ABS).map((r) => ({
      a: Number(r.rate_value) / 10,
      e: Number(parseFloat(r.decimal_equivalent).toFixed(3)),
    }));

    return { lwp, abs };
  } catch {
    return {
      lwp: LC_DEFAULT_LWP.map((r) => ({ d: r.rate_value, e: r.decimal_equivalent })),
      abs: LC_DEFAULT_ABS.map((r) => ({ a: r.rate_value / 10, e: r.decimal_equivalent })),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKING HOURS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/working-hours/rates
router.get('/rates', authenticateToken, async (_req, res) => {
  try {
    const rates = await getWorkingHoursRates();
    res.json({ success: true, ...rates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/working-hours/rates
// Body: { entries: [{ rate_type, day_type, rate_value, decimal_equivalent }] }
router.put('/rates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const entries = req.body?.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'entries array is required.' });
    }

    for (const e of entries) {
      const type    = String(e.rate_type || '');
      const dayType = String(e.day_type  || '');
      const value   = Number(e.rate_value);
      const decimal = Number(e.decimal_equivalent);

      if (!['hour', 'minute'].includes(type))
        return res.status(400).json({ success: false, message: `Invalid rate_type: ${type}` });
      if (!['8hr', '6hr', 'minute'].includes(dayType))
        return res.status(400).json({ success: false, message: `Invalid day_type: ${dayType}` });
      if (!Number.isFinite(value) || value < 1)
        return res.status(400).json({ success: false, message: `Invalid rate_value: ${value}` });
      if (!Number.isFinite(decimal) || decimal < 0)
        return res.status(400).json({ success: false, message: `Invalid decimal_equivalent: ${decimal}` });
    }

    const values = entries.map((e) => [
      String(e.rate_type),
      String(e.day_type),
      Math.trunc(Number(e.rate_value)),
      Number(Number(e.decimal_equivalent).toFixed(3)),
    ]);

    await db.promise().query(
      `INSERT INTO working_hours_rates (rate_type, day_type, rate_value, decimal_equivalent)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         decimal_equivalent = VALUES(decimal_equivalent),
         updated_at         = current_timestamp()`,
      [values],
    );

    const rates = await getWorkingHoursRates();
    res.json({ success: true, ...rates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/working-hours/convert
// Body: { hours, minutes, dayType }
router.post('/convert', authenticateToken, async (req, res) => {
  try {
    const rawHours   = Math.max(0, Math.trunc(Number(req.body?.hours   ?? 0)));
    const rawMinutes = Math.max(0, Math.trunc(Number(req.body?.minutes ?? 0)));
    const dayType    = req.body?.dayType === '6hr' ? '6hr' : '8hr';

    const { hours8, hours6, minutes: minutesTable } = await getWorkingHoursRates();
    const hoursTable = dayType === '6hr' ? hours6 : hours8;

    const hourEntry   = hoursTable.find((h) => h.rate_value === rawHours);
    const minuteEntry = minutesTable.find((m) => m.rate_value === rawMinutes);

    const hDec = rawHours   === 0 ? 0 : (hourEntry?.decimal_equivalent   ?? 0);
    const mDec = rawMinutes === 0 ? 0 : (minuteEntry?.decimal_equivalent ?? 0);
    const total = Number((hDec + mDec).toFixed(3));

    res.json({
      success: true,
      decimal: total,
      totalMinutes: rawHours * 60 + rawMinutes,
      dayType,
      breakdown: { hours: hDec, minutes: mDec },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE CREDITS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/working-hours/leave-credits/rates
router.get('/leave-credits/rates', authenticateToken, async (_req, res) => {
  try {
    const rates = await getLeaveCreditsRates();
    res.json({ success: true, ...rates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/working-hours/leave-credits/rates
// Body: { lwp: [{ d, e }], abs: [{ a, e }] }
router.put('/leave-credits/rates', authenticateToken, requireAdmin, async (req, res) => {
  const { lwp, abs } = req.body || {};

  if (!Array.isArray(lwp) || !Array.isArray(abs)) {
    return res.status(400).json({ success: false, message: 'Body must contain lwp and abs arrays.' });
  }

  for (const row of lwp) {
    const d = Number(row.d);
    const e = Number(row.e);
    if (!Number.isFinite(d) || d < 1 || d > 30 || !Number.isInteger(d))
      return res.status(400).json({ success: false, message: `Invalid lwp day: ${row.d}` });
    if (!Number.isFinite(e) || e < 0)
      return res.status(400).json({ success: false, message: `Invalid lwp decimal: ${row.e}` });
  }

  for (const row of abs) {
    const a = Number(row.a);
    const e = Number(row.e);
    if (!Number.isFinite(a) || a < 0.5 || a > 29.5)
      return res.status(400).json({ success: false, message: `Invalid abs value: ${row.a}` });
    if (Math.round(a * 10) % 5 !== 0)
      return res.status(400).json({ success: false, message: `abs must be in 0.5 steps: ${row.a}` });
    if (!Number.isFinite(e) || e < 0)
      return res.status(400).json({ success: false, message: `Invalid abs decimal: ${row.e}` });
  }

  try {
    const values = [
      ...lwp.map((row) => [
        'lwp',
        Math.trunc(Number(row.d)),
        Number(Number(row.e).toFixed(3)),
      ]),
      ...abs.map((row) => [
        'abs',
        Math.round(Number(row.a) * 10),
        Number(Number(row.e).toFixed(3)),
      ]),
    ];

    await db.promise().query(
      `INSERT INTO leave_credits_rates (rate_type, rate_value, decimal_equivalent)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         decimal_equivalent = VALUES(decimal_equivalent),
         updated_at         = current_timestamp()`,
      [values],
    );

    const rates = await getLeaveCreditsRates();
    res.json({ success: true, ...rates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;