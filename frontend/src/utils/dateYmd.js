export const parseYmd = (value) => {
  const s = String(value ?? '').trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d] = match;
  return { y: Number(y), mo: Number(mo), d: Number(d) };
};

export const dateFromYmd = (value) => {
  const parts = parseYmd(value);
  if (!parts) return null;
  return new Date(parts.y, parts.mo - 1, parts.d);
};

export const shiftYmdDays = (value, offsetDays) => {
  const base = dateFromYmd(value);
  if (!base) return value;
  base.setDate(base.getDate() + offsetDays);
  const y = base.getFullYear();
  const mo = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
};
