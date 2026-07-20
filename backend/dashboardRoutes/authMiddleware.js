// Re-export centralized auth middleware (single source of truth)
const { authenticateToken } = require('../middleware/auth');

module.exports = authenticateToken;
