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

// Check GitHub (zeoe13/Klarity) for any newly pushed updates
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
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

// Native Desktop Google Sign-In Window (Uses real accounts.google.com login + password/2FA with zero origin_mismatch)
ipcMain.handle('klarity:google-sign-in', async () => {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    const authWin = new BrowserWindow({
      width: 500,
      height: 680,
      parent: mainWindow || undefined,
      modal: true,
      autoHideMenuBar: true,
      title: 'Sign in with Google — Klarity',
      icon: path.join(__dirname, 'klarity.ico'),
      webPreferences: {
        preload: path.join(__dirname, 'google-preload.js'),
        nodeIntegration: false,
        contextIsolation: false
      }
    });

    authWin.webContents.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
    );

    const targetContinueUrl = 'https://myaccount.google.com/personal-info';
    const loginUrl = `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(targetContinueUrl)}`;

    const tryExtractAuthenticatedProfile = async () => {
      if (resolved || authWin.isDestroyed()) return;
      const currentUrl = authWin.webContents.getURL() || '';
      // Only extract once Google has finished authenticating and redirected to myaccount.google.com
      if (!currentUrl.startsWith('https://myaccount.google.com')) return;

      try {
        const profile = await authWin.webContents.executeJavaScript(`
          (() => {
            // Look for Google Account badge aria-label: "Google Account: Full Name (email@gmail.com)"
            const acctEl = document.querySelector('[aria-label*="Google Account:"][aria-label*="@"]');
            if (acctEl) {
              const label = acctEl.getAttribute('aria-label') || '';
              const m = label.match(/Google Account:\\s*([^\\n(]+?)\\s*\\(([^)]+@[^)]+)\\)/i);
              if (m) {
                return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
              }
            }
            const emailEl = document.querySelector('[data-email]');
            if (emailEl && emailEl.getAttribute('data-email')) {
              return {
                email: emailEl.getAttribute('data-email').trim().toLowerCase(),
                name: document.querySelector('h1, h2')?.innerText?.replace(/Welcome,\\s*/i, '').trim() || ''
              };
            }
            const html = document.body ? document.body.innerText : '';
            const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@(?:gmail\\.com|googlemail\\.com|[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}))/);
            if (emailMatch) {
              return { email: emailMatch[1].toLowerCase(), name: '' };
            }
            return null;
          })();
        `);

        if (profile && profile.email) {
          finish({ ok: true, profile });
          setTimeout(() => {
            if (!authWin.isDestroyed()) authWin.close();
          }, 150);
        }
      } catch {}
    };

    authWin.webContents.on('did-navigate', tryExtractAuthenticatedProfile);
    authWin.webContents.on('did-navigate-in-page', tryExtractAuthenticatedProfile);
    authWin.webContents.on('did-finish-load', tryExtractAuthenticatedProfile);

    authWin.on('closed', () => {
      finish({ ok: false, cancelled: true });
    });

    authWin.loadURL(loginUrl);
  });
});

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

app.whenReady().then(createDesktopWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
