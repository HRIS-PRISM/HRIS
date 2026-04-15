const express = require('express');
const router = express.Router();
const db = require('../db');

const DEFAULTS = {
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

async function getAllRates() {
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
      hours8: hours8.length === 8 ? hours8 : DEFAULTS['8hr'],
      hours6: hours6.length === 8 ? hours6 : DEFAULTS['6hr'],
      minutes: minutes.length === 60 ? minutes : DEFAULTS.minutes,
    };
  } catch (err) {
    return { hours8: DEFAULTS['8hr'], hours6: DEFAULTS['6hr'], minutes: DEFAULTS.minutes };
  }
}

// GET /api/working-hours/rates
router.get('/rates', async (_req, res) => {
  try {
    const rates = await getAllRates();
    res.json({ success: true, ...rates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/working-hours/rates
// Body: { entries: [{ rate_type, day_type, rate_value, decimal_equivalent }] }
router.put('/rates', async (req, res) => {
  try {
    const entries = req.body?.entries;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'entries array is required.' });
    }

    for (const e of entries) {
      const type = String(e.rate_type || '');
      const dayType = String(e.day_type || '');
      const value = Number(e.rate_value);
      const decimal = Number(e.decimal_equivalent);

      if (!['hour', 'minute'].includes(type)) {
        return res.status(400).json({ success: false, message: `Invalid rate_type: ${type}` });
      }
      if (!['8hr', '6hr', 'minute'].includes(dayType)) {
        return res.status(400).json({ success: false, message: `Invalid day_type: ${dayType}` });
      }
      if (!Number.isFinite(value) || value < 1) {
        return res.status(400).json({ success: false, message: `Invalid rate_value: ${value}` });
      }
      if (!Number.isFinite(decimal) || decimal < 0) {
        return res.status(400).json({ success: false, message: `Invalid decimal_equivalent: ${decimal}` });
      }
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
       ON DUPLICATE KEY UPDATE decimal_equivalent = VALUES(decimal_equivalent)`,
      [values],
    );

    const rates = await getAllRates();
    res.json({ success: true, ...rates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/working-hours/convert
// Body: { hours, minutes, dayType }
router.post('/convert', async (req, res) => {
  try {
    const rawHours = Math.max(0, Math.trunc(Number(req.body?.hours ?? 0)));
    const rawMinutes = Math.max(0, Math.trunc(Number(req.body?.minutes ?? 0)));
    const dayType = req.body?.dayType === '6hr' ? '6hr' : '8hr';

    const { hours8, hours6, minutes: minutesTable } = await getAllRates();
    const hoursTable = dayType === '6hr' ? hours6 : hours8;

    const hourEntry = hoursTable.find((h) => h.rate_value === rawHours);
    const minuteEntry = minutesTable.find((m) => m.rate_value === rawMinutes);

    const hDec = rawHours === 0 ? 0 : (hourEntry?.decimal_equivalent ?? 0);
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

module.exports = router;