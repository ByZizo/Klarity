const { contextBridge, ipcRenderer } = require('electron');

// Hardened Context-Isolated Preload Bridge (Zero direct Node.js access exposed to DOM)
contextBridge.exposeInMainWorld('klarityDesktop', {
  isDesktopApp: true,
  platform: process.platform,
  getAppInfo: () => ipcRenderer.invoke('klarity:get-app-info'),
  checkForUpdates: () => ipcRenderer.invoke('klarity:check-for-updates'),
  installUpdateNow: () => ipcRenderer.invoke('klarity:install-update-now'),
  signInWithGoogle: () => ipcRenderer.invoke('klarity:google-sign-in'),
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('klarity:update-status', handler);
    return () => ipcRenderer.removeListener('klarity:update-status', handler);
  }
});
