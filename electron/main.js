const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (err) {
  console.warn('electron-updater note:', err.message);
}

let mainWindow = null;
let localServerPort = null;
let httpServerInstance = null;
let updateStatusState = {
  state: 'idle',
  version: app.getVersion(),
  message: 'Up to date (v' + app.getVersion() + ')'
};

function runShell(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd, windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(String(stdout || '').trim());
    });
  });
}

function broadcastUpdateStatus(patch) {
  updateStatusState = { ...updateStatusState, ...patch };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('klarity:update-status', updateStatusState);
  }
}

// Check GitHub (zeoe13/Klarity) for any newly pushed updates
async function checkForGitHubUpdate() {
  const repoDir = path.join(__dirname, '..');
  try {
    broadcastUpdateStatus({ state: 'checking', message: 'Checking for updates...' });

    // 1. Check local git SHA vs GitHub origin/main SHA
    await runShell('git fetch origin main --quiet', repoDir);
    const localSha = await runShell('git rev-parse HEAD', repoDir);
    const remoteSha = await runShell('git rev-parse origin/main', repoDir);

    if (localSha && remoteSha && localSha !== remoteSha) {
      let commitTitle = '';
      try {
        commitTitle = await runShell('git log -1 --pretty=%s origin/main', repoDir);
      } catch {}
      broadcastUpdateStatus({
        state: 'available',
        latestVersion: remoteSha.slice(0, 7),
        commitTitle,
        message: 'A new update for Klarity is available! Would you like to update the app now?'
      });
      return updateStatusState;
    }

    // 2. If packaged with electron-updater, also check GitHub Releases
    if (app.isPackaged && autoUpdater) {
      await autoUpdater.checkForUpdates();
      return updateStatusState;
    }

    broadcastUpdateStatus({
      state: 'up-to-date',
      message: `Up to date — v${app.getVersion()} (${localSha ? localSha.slice(0, 7) : 'latest'})`
    });
  } catch (err) {
    broadcastUpdateStatus({
      state: 'up-to-date',
      message: `Up to date — v${app.getVersion()}`
    });
  }
  return updateStatusState;
}

function setupAutoUpdater() {
  if (!autoUpdater) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    broadcastUpdateStatus({
      state: 'available',
      latestVersion: info?.version,
      message: `A new update (v${info?.version || 'latest'}) is available! Would you like to update now?`
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateStatus({
      state: 'ready',
      latestVersion: info?.version,
      message: `Update v${info?.version || 'new'} is ready to install!`
    });
  });

  autoUpdater.on('error', () => {});
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
          httpServerInstance = server;
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

  // Automatically check for updates every time the user opens the app (and every 5 minutes)
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      checkForGitHubUpdate();
    }, 1200);
  });

  setInterval(() => {
    checkForGitHubUpdate();
  }, 5 * 60 * 1000);
}

// IPC Handlers for Desktop App Info & On-The-Spot Auto-Updater
ipcMain.handle('klarity:get-app-info', () => ({
  isDesktopApp: true,
  version: app.getVersion(),
  userDataDir: app.getPath('userData'),
  repo: 'zeoe13/Klarity',
  updateStatus: updateStatusState
}));

ipcMain.handle('klarity:check-for-updates', async () => {
  return await checkForGitHubUpdate();
});

ipcMain.handle('klarity:install-update-now', async () => {
  const repoDir = path.join(__dirname, '..');
  try {
    broadcastUpdateStatus({
      state: 'installing',
      message: 'Installing update & reopening Klarity...'
    });

    if (app.isPackaged && autoUpdater && updateStatusState.state === 'ready') {
      autoUpdater.quitAndInstall(false, true);
      return { ok: true };
    }

    // Pull latest update from GitHub origin/main on the spot
    await runShell('git fetch origin main --quiet', repoDir);
    await runShell('git reset --hard origin/main', repoDir);

    // Close local server port cleanly before relaunching so the reopened app binds to 5173
    if (httpServerInstance) {
      try { httpServerInstance.close(); } catch {}
    }

    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 400);

    return { ok: true };
  } catch (err) {
    broadcastUpdateStatus({
      state: 'available',
      message: 'Update failed: ' + (err.message || 'Please try again.')
    });
    return { ok: false, error: err.message };
  }
});

app.whenReady().then(createDesktopWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
