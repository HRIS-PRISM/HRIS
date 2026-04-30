/**
 * Shared working-hours ↔ decimal logic (same rules as WorkingHoursConverter).
 * Linear leave deduction: hours × (decimal for 1h) = decimal; decimal ÷ that rate = hours.
 * e.g. 8hr defaults: 1h = 0.125 dec → 10h = 1.25 dec.
 */

export function sanitizeDecimal(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Number(n.toFixed(3));
}

/** Decimal per one clock hour from the configured table (row rate_value === 1), else 0.125 / 0.167. */
export function getHourlyDecimalRate(hoursTable, dayType) {
  const fallback = dayType === "6hr" ? 0.167 : 0.125;
  const rows = Array.isArray(hoursTable) ? hoursTable : [];
  const row = rows.find((h) => Number(h.rate_value) === 1);
  const v = row != null ? Number(row.decimal_equivalent) : NaN;
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/** Leave deduction hours from total decimal (inverse of hours × hourlyRate). */
export function decimalToLeaveDeductionHours(decimal, hoursTable, dayType) {
  const rate = getHourlyDecimalRate(hoursTable, dayType);
  if (!Number.isFinite(decimal) || decimal < 0 || !rate || rate <= 0) return 0;
  return Number((decimal / rate).toFixed(4));
}

/** Total decimal from leave deduction hours (matches forward “hours × rate” extension in Quick Converter). */
export function leaveDeductionHoursToDecimal(hours, hoursTable, dayType) {
  const rate = getHourlyDecimalRate(hoursTable, dayType);
  if (!Number.isFinite(hours) || hours < 0 || !rate || rate <= 0) return 0;
  return Number((hours * rate).toFixed(3));
}

/** Reverse: decimal → closest whole hours + minutes on the tables (Quick Converter reverse mode). */
export function reverseConvert(totalDecimal, hoursTable, minutesTable, dayType) {
  const defaultRate = dayType === "6hr" ? 0.167 : 0.125;
  let bestH = 0;
  let bestM = 0;
  let bestDiff = Infinity;
  const hoursArr = Array.isArray(hoursTable) ? hoursTable : [];
  const minutesArr = Array.isArray(minutesTable) ? minutesTable : [];

  for (let h = 0; h <= 8; h++) {
    const hEntry = h === 0 ? null : hoursArr.find((r) => r.rate_value === h);
    const hDec =
      h === 0
        ? 0
        : Number((hEntry?.decimal_equivalent ?? h * defaultRate).toFixed(3));
    const remainder = Number((totalDecimal - hDec).toFixed(4));

    if (remainder < -0.0015) continue;

    if (remainder <= 0.0015) {
      const diff = Math.abs(remainder);
      if (diff < bestDiff) {
        bestH = h;
        bestM = 0;
        bestDiff = diff;
      }
    } else {
      const mEntry = minutesArr.reduce(
        (best, r) => {
          const d = Math.abs(r.decimal_equivalent - remainder);
          const bd = best
            ? Math.abs(best.decimal_equivalent - remainder)
            : Infinity;
          return d < bd ? r : best;
        },
        null,
      );
      if (mEntry) {
        const diff = Math.abs(mEntry.decimal_equivalent - remainder);
        if (diff < bestDiff) {
          bestH = h;
          bestM = mEntry.rate_value;
          bestDiff = diff;
        }
      }
    }
  }
  return { hours: bestH, minutes: bestM };
}
