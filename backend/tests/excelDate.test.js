const assert = require('assert');
const { parseExcelDateValue, normalizeExcelDateValue } = require('../utils/excelDate');

const cases = [
  ['2024-01-15', '2024-01-15'],
  [new Date('2024-01-15T00:00:00.000Z'), '2024-01-15'],
  [45292, '2024-01-15'],
  ['45292', '2024-01-15'],
  ['1/15/2024', '2024-01-15'],
  [null, null],
  ['', null],
];

for (const [input, expected] of cases) {
  const actual = normalizeExcelDateValue(input);
  assert.strictEqual(actual, expected, `Expected ${input} -> ${expected}, got ${actual}`);
}

console.log('excelDate tests passed');
