const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
const path = require('path');
const http = require('http');

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (err) {
  console.warn('electron-updater note:', err.message);
}

let mainWindow = null;
let localServerPort = null;
let updateStatusState = {
  state: 'idle',
  version: app.getVersion(),
  message: 'Up to date (v' + app.getVersion() + ')'
};

function broadcastUpdateStatus(patch) {
  updateStatusState = { ...updateStatusState, ...patch };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('klarity:update-status', updateStatusState);
  }
}

function setupAutoUpdater() {
  if (!autoUpdater) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    broadcastUpdateStatus({ state: 'checking', message: 'Checking GitHub Releases for updates...' });
  });

  autoUpdater.on('update-available', (info) => {
    broadcastUpdateStatus({
      state: 'downloading',
      latestVersion: info?.version,
      message: `Downloading update v${info?.version || 'latest'} in background...`
    });
  });

  autoUpdater.on('update-not-available', () => {
    broadcastUpdateStatus({
      state: 'up-to-date',
      message: `Klarity Desktop v${app.getVersion()} is on the latest version.`
    });
  });

  autoUpdater.on('download-progress', (prog) => {
    const pct = Math.round(prog?.percent || 0);
    broadcastUpdateStatus({
      state: 'downloading',
      progress: pct,
      message: `Downloading update... (${pct}%)`
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateStatus({
      state: 'ready',
      latestVersion: info?.version,
      message: `Update v${info?.version || 'new'} ready! Click Restart to apply.`
    });
  });

  autoUpdater.on('error', (err) => {
    const msg = String(err?.message || '');
    if (msg.includes('404') || msg.includes('No published versions') || msg.includes('dev-app-update')) {
      broadcastUpdateStatus({
        state: 'up-to-date',
        message: `Klarity Desktop v${app.getVersion()} (Connected to GitHub: zeoe13/Klarity)`
      });
    } else {
      broadcastUpdateStatus({
        state: 'idle',
        message: `Klarity Desktop v${app.getVersion()}`
      });
    }
  });
}

// Start the embedded Express backend on localhost:5173 (matches Google OAuth Authorized Origin)
async function startEmbeddedBackend() {
  const userDataDir = app.getPath('userData');
  process.env.KLARITY_USER_DATA_DIR = userDataDir;
  process.env.KLARITY_DESKTOP_APP = 'true';

  const expressApp = require('../server/index.js');
  const preferredPorts = [5173, 5000, 3000, 0];

  for (const candidatePort of preferredPorts) {
    try {
      const port = await new Promise((resolve, reject) => {
        const server = http.createServer(expressApp);
        server.once('error', reject);
        server.listen(candidatePort, '127.0.0.1', () => {
          resolve(server.address().port);
        });
      });
      localServerPort = port;
      console.log(`Klarity Desktop Embedded Engine bound to http://localhost:${localServerPort}`);
      return localServerPort;
    } catch (err) {
      // Port busy, try next preferred port
    }
  }
  throw new Error('Could not bind local Klarity engine port');
}

async function createDesktopWindow() {
  const port = await startEmbeddedBackend();

  // Enforce security headers while permitting Google OAuth popups
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'X-Content-Type-Options': ['nosniff'],
        'Referrer-Policy': ['strict-origin-when-cross-origin']
      }
    });
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Klarity — Private Financial & Password Suite',
    icon: path.join(__dirname, 'klarity.ico'),
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });

  // Allow real Google OAuth & Plaid popups inside Electron; open other external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://localhost') ||
      url.includes('accounts.google.com') ||
      url.includes('google.com/o/oauth2') ||
      url.includes('gstatic.com') ||
      url.includes('plaid.com') ||
      url === 'about:blank'
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 680,
          autoHideMenuBar: true,
          title: 'Sign in with Google — Klarity'
        }
      };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://localhost:${port}`);

  setupAutoUpdater();
  if (app.isPackaged && autoUpdater) {
    setTimeout(() => {
      try { autoUpdater.checkForUpdatesAndNotify(); } catch {}
    }, 3000);
  }
}

// IPC Handlers for Desktop App Info & Auto-Updater
ipcMain.handle('klarity:get-app-info', () => ({
  isDesktopApp: true,
  version: app.getVersion(),
  userDataDir: app.getPath('userData'),
  repo: 'zeoe13/Klarity',
  updateStatus: updateStatusState
}));

ipcMain.handle('klarity:check-for-updates', async () => {
  if (!autoUpdater || !app.isPackaged) {
    try {
      broadcastUpdateStatus({ state: 'checking', message: 'Checking GitHub (zeoe13/Klarity) for updates...' });
      const res = await fetch('https://api.github.com/repos/zeoe13/Klarity/releases/latest', {
        headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'Klarity-Desktop-App' }
      });
      if (res.ok) {
        const release = await res.json();
        const latestTag = (release.tag_name || '').replace(/^v/, '');
        if (latestTag && latestTag !== app.getVersion()) {
          broadcastUpdateStatus({
            state: 'available',
            latestVersion: latestTag,
            message: `New release v${latestTag} available on GitHub!`
          });
        } else {
          broadcastUpdateStatus({
            state: 'up-to-date',
            message: `Up to date — running latest v${app.getVersion()}`
          });
        }
      } else {
        broadcastUpdateStatus({
          state: 'up-to-date',
          message: `Up to date — running latest v${app.getVersion()} (GitHub connected)`
        });
      }
    } catch {
      broadcastUpdateStatus({
        state: 'up-to-date',
        message: `Running v${app.getVersion()} (Local Desktop Engine)`
      });
    }
    return updateStatusState;
  }

  try {
    await autoUpdater.checkForUpdates();
  } catch {}
  return updateStatusState;
});

ipcMain.handle('klarity:install-update-now', () => {
  if (autoUpdater && updateStatusState.state === 'ready') {
    autoUpdater.quitAndInstall();
  }
});

app.whenReady().then(createDesktopWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
