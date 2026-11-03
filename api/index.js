// ============================================================================
// KLARITY VERCEL SERVERLESS FUNCTION ENTRYPOINT
// Re-exports the unified Express application from server/app.js.
// Included files in vercel.json bundle the entire server/ directory.
// ============================================================================

const app = require('../server/app');

module.exports = app;
