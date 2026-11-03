const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
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
    exec(cmd, { cwd, windowsHide: true }, (err, stdout) => {
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

// Check GitHub (ByZizo/Klarity) for any newly pushed updates
async function checkForGitHubUpdate() {
  const repoDir = path.join(__dirname, '..');
  try {
    broadcastUpdateStatus({ state: 'checking', message: 'Checking for updates...' });

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

// Start the embedded Express backend
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
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://localhost') ||
      url.includes('plaid.com')
    ) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://localhost:${port}`);

  setupAutoUpdater();

  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      checkForGitHubUpdate();
    }, 1200);
  });

  setInterval(() => {
    checkForGitHubUpdate();
  }, 5 * 60 * 1000);
}

// Native Desktop Google Sign-In (RFC 8252 Loopback via Default System Browser — Bypasses all WebView/Passkey blocks)
ipcMain.handle('klarity:google-sign-in', async () => {
  const sid = 'dsk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const clientId = '207624653160-vbp60vuujhl2h8jshvnosad9m2ft75jq.apps.googleusercontent.com';
  const port = localServerPort || 5173;
  const redirectUri = `http://localhost:${port}/api/auth/google/callback`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email&state=${sid}&prompt=select_account`;

  // Open real system browser (Chrome/Edge) where user is already logged in with full passkey support
  shell.openExternal(authUrl);

  return new Promise((resolve) => {
    let checkInterval = null;
    let timeoutTimer = null;

    const cleanup = () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutTimer) clearTimeout(timeoutTimer);
    };

    checkInterval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:${port}/api/auth/google/check-session?sid=${sid}`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.user) {
            cleanup();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.show();
              mainWindow.restore();
              mainWindow.setAlwaysOnTop(true);
              mainWindow.focus();
              mainWindow.setAlwaysOnTop(false);
              mainWindow.flashFrame(true);
            }
            const fullSession = { ...(json.session || {}), user: json.user };
            writePersistentSession(fullSession);
            resolve({ ok: true, user: json.user, session: fullSession });
          }
        }
      } catch {}
    }, 400);

    timeoutTimer = setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: 'Google sign-in timed out. Please try again.' });
    }, 120000);
  });
});


// ============================================================================
// 1-WEEK PERSISTENT DESKTOP AUTHENTICATION SESSION STORE
// ============================================================================
function getSessionFilePath() {
  const dir = app.getPath('userData');
  return path.join(dir, 'klarity_session.json');
}

function readPersistentSession() {
  try {
    const file = getSessionFilePath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data && data.expiresAt && Date.now() < data.expiresAt) {
        return data;
      }
      try { fs.unlinkSync(file); } catch {}
    }
  } catch {}
  return null;
}

function writePersistentSession(sessionData) {
  try {
    const file = getSessionFilePath();
    fs.writeFileSync(file, JSON.stringify(sessionData), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function clearPersistentSession() {
  try {
    const file = getSessionFilePath();
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return true;
  } catch {
    return false;
  }
}

ipcMain.handle('klarity:get-session', () => readPersistentSession());
ipcMain.handle('klarity:save-session', (_e, s) => writePersistentSession(s));
ipcMain.handle('klarity:clear-session', () => clearPersistentSession());

ipcMain.handle('klarity:get-app-info', () => ({
  isDesktopApp: true,
  version: app.getVersion(),
  userDataDir: app.getPath('userData'),
  repo: 'ByZizo/Klarity',
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

    await runShell('git fetch origin main --quiet', repoDir);
    await runShell('git reset --hard origin/main', repoDir);

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

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createDesktopWindow).catch(err => {
    console.error('Fatal desktop window launch error:', err);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
