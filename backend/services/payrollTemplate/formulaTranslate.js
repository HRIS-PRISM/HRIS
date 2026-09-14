/**
 * A1-style formula reference translation.
 *
 * Used in two places: expanding Excel's shared formulas into explicit ones, and
 * stamping a department's first-row formula pattern down onto every employee row.
 * Both are "take this formula and shift its relative references by (dRow, dCol)".
 */

/** @param {string} letters @returns {number} 1-based column index */
function colToIndex(letters) {
  let n = 0;
  const up = letters.toUpperCase();
  for (let i = 0; i < up.length; i++) n = n * 26 + (up.charCodeAt(i) - 64);
  return n;
}

/** @param {number} index 1-based @returns {string} column letters */
function indexToCol(index) {
  let n = index;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** @param {string} ref e.g. "AB12" @returns {{col:number,row:number}} */
function parseRef(ref) {
  const m = /^([A-Za-z]{1,3})(\d+)$/.exec(ref);
  if (!m) throw new Error(`Not a cell reference: ${ref}`);
  return { col: colToIndex(m[1]), row: Number(m[2]) };
}

/** @param {number} col 1-based @param {number} row 1-based @returns {string} */
function makeRef(col, row) {
  return indexToCol(col) + row;
}

// Anchored at the scan position. Column ranges (B:N) are tried first because a
// cell reference can never contain a colon.
const COL_RANGE_AT = /^(\$?)([A-Za-z]{1,3}):(\$?)([A-Za-z]{1,3})(?![\w.$(])/;
const CELL_AT = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![\w.(])/;
const IDENT_AT = /^[A-Za-z_][\w.$]*/;
const NUMBER_AT = /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;

/**
 * Shift every relative reference in a formula. Absolute ($) parts, quoted sheet
 * names, string literals, function names and numeric literals are left alone.
 *
 * @param {string} formula formula body, without the leading "="
 * @param {number} dRow rows to shift by
 * @param {number} dCol columns to shift by
 * @returns {string}
 */
function translateFormula(formula, dRow, dCol) {
  if (!formula || (dRow === 0 && dCol === 0)) return formula;

  let out = '';
  let i = 0;
  const n = formula.length;

  while (i < n) {
    const ch = formula[i];

    // String literal: "" is an escaped quote inside it.
    if (ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (formula[j] === '"') {
          if (formula[j + 1] === '"') { j += 2; continue; }
          break;
        }
        j++;
      }
      out += formula.slice(i, Math.min(j + 1, n));
      i = j + 1;
      continue;
    }

    // Quoted sheet name: '' is an escaped apostrophe inside it.
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (formula[j] === "'") {
          if (formula[j + 1] === "'") { j += 2; continue; }
          break;
        }
        j++;
      }
      out += formula.slice(i, Math.min(j + 1, n));
      i = j + 1;
      continue;
    }

    // Consume numbers whole so an exponent like 1E5 is never read as a reference.
    if (ch >= '0' && ch <= '9') {
      const m = NUMBER_AT.exec(formula.slice(i));
      out += m[0];
      i += m[0].length;
      continue;
    }

    if (/[A-Za-z_$]/.test(ch)) {
      const rest = formula.slice(i);

      const range = COL_RANGE_AT.exec(rest);
      if (range) {
        const [full, a1, c1, a2, c2] = range;
        const left = a1 ? a1 + c1 : indexToCol(colToIndex(c1) + dCol);
        const right = a2 ? a2 + c2 : indexToCol(colToIndex(c2) + dCol);
        out += `${left}:${right}`;
        i += full.length;
        continue;
      }

      const cell = CELL_AT.exec(rest);
      if (cell) {
        const [full, colAbs, colLetters, rowAbs, rowDigits] = cell;
        const col = colAbs ? colLetters.toUpperCase() : indexToCol(colToIndex(colLetters) + dCol);
        const row = rowAbs ? rowDigits : String(Number(rowDigits) + dRow);
        out += `${colAbs}${col}${rowAbs}${row}`;
        i += full.length;
        continue;
      }

      // Not a reference: a function name, defined name or sheet name. Consume the
      // whole run so we never try to match a reference inside it.
      const ident = IDENT_AT.exec(rest);
      if (ident) {
        out += ident[0];
        i += ident[0].length;
        continue;
      }
    }

    out += ch;
    i++;
  }

  return out;
}

module.exports = { colToIndex, indexToCol, parseRef, makeRef, translateFormula };
