// ============================================================================
// KLARITY LOCAL & DESKTOP SERVER ENTRYPOINT
// Imports the shared Express application from server/app.js.
// When executed directly, listens on PORT (default 5000).
// When required by Electron (electron/main.js), exports the Express app instance.
// ============================================================================

const app = require('./app');
const { localModelEngine } = require('./services/localModelService');

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Klarity backend running locally on port ${PORT}`);
    // Automatically verify/download local GGUF model & initialize persistent context session on launch
    localModelEngine.ensureInitialized({ autoDownload: true }).catch(err => {
      console.warn('[Klarity Local AI] Startup initialization notice:', err.message);
    });
  });
}

module.exports = app;
