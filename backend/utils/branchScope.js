/**
 * Shared branch parsing for holiday / suspension APIs.
 * null = all campuses; 0 = Manila; 1 = Cavite (matches users.branch).
 */
function parseBranchField(value) {
  if (value === undefined || value === null || value === '' || value === 'all' || value === 'null') {
    return null;
  }
  const n = Number(value);
  if (n === 0 || n === 1) return n;
  return null;
}

module.exports = { parseBranchField };
