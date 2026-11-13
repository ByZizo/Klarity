const { contextBridge, ipcRenderer } = require('electron');

// Hardened Context-Isolated Preload Bridge (Zero direct Node.js access exposed to DOM)
contextBridge.exposeInMainWorld('klarityDesktop', {
  isDesktopApp: true,
  platform: process.platform,
  getAppInfo: () => ipcRenderer.invoke('klarity:get-app-info'),
  checkForUpdates: () => ipcRenderer.invoke('klarity:check-for-updates'),
  installUpdateNow: () => ipcRenderer.invoke('klarity:install-update-now'),
  getWhatsNew: () => ipcRenderer.invoke('klarity:get-whats-new'),
  dismissWhatsNew: () => ipcRenderer.invoke('klarity:dismiss-whats-new'),
  signInWithGoogle: () => ipcRenderer.invoke('klarity:google-sign-in'),
  getSession: () => ipcRenderer.invoke('klarity:get-session'),
  saveSession: (session) => ipcRenderer.invoke('klarity:save-session', session),
  clearSession: () => ipcRenderer.invoke('klarity:clear-session'),
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('klarity:update-status', handler);
    return () => ipcRenderer.removeListener('klarity:update-status', handler);
  },
  onLocalAiStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('klarity:local-ai-status', handler);
    return () => ipcRenderer.removeListener('klarity:local-ai-status', handler);
  },
  getAdBlockStats: () => ipcRenderer.invoke('klarity:browser-get-adblock-stats'),
  toggleAdBlock: (enabled) => ipcRenderer.invoke('klarity:browser-toggle-adblock', enabled),
  resetAdBlockCount: () => ipcRenderer.invoke('klarity:browser-reset-adblock-count'),
  clearBrowserData: () => ipcRenderer.invoke('klarity:browser-clear-data'),
  getBrowserPrefs: () => ipcRenderer.invoke('klarity:browser-get-prefs'),
  updateBrowserPrefs: (prefs) => ipcRenderer.invoke('klarity:browser-update-prefs', prefs),
  selectBrowserDownloadDir: () => ipcRenderer.invoke('klarity:browser-select-download-dir'),
  getSponsorSegments: (videoId) => ipcRenderer.invoke('klarity:browser-get-sponsor-segments', videoId),
  getDeArrowBranding: (videoId) => ipcRenderer.invoke('klarity:browser-get-dearrow-branding', videoId),
  onAdBlockStats: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, stats) => callback(stats);
    ipcRenderer.on('klarity:adblock-stats', handler);
    return () => ipcRenderer.removeListener('klarity:adblock-stats', handler);
  }
});
