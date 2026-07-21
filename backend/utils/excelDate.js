function normalizeExcelDateValue(value) {
  if (value == null || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }

  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.split('T')[0];

  const numeric = Number(s);
  if (Number.isFinite(numeric)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 31));
    const corrected = numeric > 59 ? numeric - 1 : numeric;
    const ms = excelEpoch.getTime() + corrected * 86400000;
    const date = new Date(ms);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    }
  }

  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
}

function excelDateToUTCDate(excelDate) {
  const normalized = normalizeExcelDateValue(excelDate);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map((part) => parseInt(part, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

module.exports = {
  excelDateToUTCDate,
  normalizeExcelDateValue,
  parseExcelDateValue: normalizeExcelDateValue,
};




