const { app, BrowserWindow, shell, ipcMain, session, nativeTheme, Menu, MenuItem } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure App name and userData path are set immediately before any lock checks
app.setName('Klarity');
const userDataDir = path.join(app.getPath('appData'), 'Klarity');
if (!fs.existsSync(userDataDir)) {
  try { fs.mkdirSync(userDataDir, { recursive: true }); } catch {}
}
app.setPath('userData', userDataDir);
process.env.KLARITY_USER_DATA_DIR = userDataDir;
process.env.KLARITY_DESKTOP_APP = 'true';
try { if (nativeTheme) nativeTheme.themeSource = 'light'; } catch (e) {}
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
  message: 'Up to date'
};

let runningCommitSha = null;

function getRunningCommitSha() {
  if (runningCommitSha) return runningCommitSha;
  const versionFile = path.join(app.getPath('userData'), 'installed_version.json');
  try {
    if (fs.existsSync(versionFile)) {
      const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
      if (data && data.commitSha) {
        runningCommitSha = data.commitSha;
        return runningCommitSha;
      }
    }
  } catch {}

  const repoDir = path.join(__dirname, '..');
  try {
    const sha = require('child_process').execSync('git rev-parse HEAD', { cwd: repoDir, windowsHide: true }).toString().trim();
    if (sha) {
      runningCommitSha = sha;
      try {
        fs.writeFileSync(versionFile, JSON.stringify({
          version: app.getVersion(),
          commitSha: sha,
          installedAt: Date.now()
        }, null, 2), 'utf8');
      } catch {}
      return runningCommitSha;
    }
  } catch {}

  runningCommitSha = 'v' + app.getVersion();
  return runningCommitSha;
}

function formatWhatsNewHighlights(changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return [
      "Visual theme system with Dark Mode & High Contrast",
      "Household Hub & Statements Management",
      "Password Vault enhancements",
      "Bug fixes & performance improvements"
    ];
  }

  const isMinor = (text) => {
    return /(fix|bug|typo|patch|minor|tweak|adjust|chore|test|clean|format|style|spacing|padding|margin|remove.*button|remove.*message|bump|deps|refactor)/i.test(text);
  };

  const isMajor = (text) => {
    return /(dark mode|high contrast|theme|appearance|household|vault|password|retirement|ai advisor|report|statement|upload|overview|budget|bills|redesign|add.*feature|introduce)/i.test(text);
  };

  const majorItems = [];

  for (const raw of changes) {
    if (typeof raw !== 'string') continue;
    const clean = raw.trim();
    if (!clean) continue;

    if (isMajor(clean)) {
      let formatted = clean;
      if (formatted.toLowerCase().startsWith('feat:')) formatted = formatted.slice(5).trim();
      if (formatted.toLowerCase().startsWith('feature:')) formatted = formatted.slice(8).trim();
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

      if (!majorItems.some(item => item.toLowerCase() === formatted.toLowerCase())) {
        majorItems.push(formatted);
      }
    }
  }

  if (majorItems.length === 0) {
    for (const raw of changes) {
      if (typeof raw === 'string' && raw.trim() && !isMinor(raw)) {
        majorItems.push(raw.trim());
        if (majorItems.length >= 2) break;
      }
    }
  }

  const finalHighlights = majorItems.slice(0, 3);
  if (finalHighlights.length === 0) {
    finalHighlights.push("Latest feature enhancements & interface upgrades");
  }

  finalHighlights.push("Bug fixes & performance improvements");
  return finalHighlights;
}

function saveWhatsNewData(changes, versionOrSha) {
  try {
    const whatsNewFile = path.join(app.getPath('userData'), 'whats_new.json');
    const data = {
      shown: false,
      version: app.getVersion(),
      commitSha: versionOrSha || app.getVersion(),
      title: "What's New in Klarity",
      changes: formatWhatsNewHighlights(changes),
      updatedAt: Date.now()
    };
    fs.writeFileSync(whatsNewFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('saveWhatsNewData warning:', e.message);
  }
}

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
    broadcastUpdateStatus({ state: 'checking', message: 'Checking GitHub for updates...' });

    const currentSha = getRunningCommitSha();
    const currentVersion = app.getVersion();

    let remoteSha = null;
    let commitTitle = '';
    let commitDate = '';
    let recentCommits = [];

    // 1. Fetch latest commits on main from GitHub API
    try {
      const ghRes = await fetch('https://api.github.com/repos/ByZizo/Klarity/commits?per_page=5', {
        headers: { 'User-Agent': 'KlarityDesktopApp' }
      });
      if (ghRes.ok) {
        const commits = await ghRes.json();
        if (Array.isArray(commits) && commits.length > 0) {
          remoteSha = commits[0].sha;
          commitTitle = commits[0].commit?.message?.split('\n')[0] || '';
          commitDate = commits[0].commit?.author?.date || '';
          recentCommits = commits.map(c => c.commit?.message?.split('\n')[0]).filter(Boolean);
        }
      }
    } catch (apiErr) {
      console.warn('GitHub API commit check note:', apiErr.message);
    }

    // 2. Fallback / local git check
    try {
      await runShell('git fetch origin main --quiet', repoDir);
      const gitRemote = await runShell('git rev-parse origin/main', repoDir);
      if (gitRemote) {
        if (!remoteSha) remoteSha = gitRemote;
        if (!commitTitle) {
          commitTitle = await runShell('git log -1 --pretty=%s origin/main', repoDir);
        }
      }
    } catch {}

    // 3. If remote commit differs from running commit, an update is available!
    if (
      remoteSha &&
      currentSha &&
      !remoteSha.startsWith(currentSha) &&
      !currentSha.startsWith(remoteSha)
    ) {
      broadcastUpdateStatus({
        state: 'available',
        latestVersion: remoteSha.slice(0, 7),
        fullSha: remoteSha,
        commitTitle: commitTitle || 'New GitHub update available',
        commitDate,
        recentChanges: recentCommits,
        message: 'A new version of Klarity is available!'
      });
      return updateStatusState;
    }

    // 4. Packaged electron-updater check
    if (app.isPackaged && autoUpdater) {
      try {
        await autoUpdater.checkForUpdates();
        return updateStatusState;
      } catch {}
    }

    // 5. Up to date
    broadcastUpdateStatus({
      state: 'up-to-date',
      version: currentVersion,
      commitSha: currentSha ? currentSha.slice(0, 7) : 'latest',
      message: `Up to date — v${currentVersion} (${currentSha ? currentSha.slice(0, 7) : 'latest'})`
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

// Start the embedded Express backend & Local AI Engine (node-llama-cpp)
async function startEmbeddedBackend() {
  const userDataDir = app.getPath('userData');
  process.env.KLARITY_USER_DATA_DIR = userDataDir;
  process.env.KLARITY_DESKTOP_APP = 'true';

  const expressApp = require('../server/index.js');
  const { localModelEngine } = require('../server/services/localModelService');

  // Broadcast real-time GGUF download & initialization progress to the desktop UI
  localModelEngine.on('status', (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('klarity:local-ai-status', status);
    }
  });

  // Automatically verify/download default local GGUF model on launch
  localModelEngine.ensureInitialized({ autoDownload: true }).catch(err => {
    console.warn('[Klarity Local AI] Desktop background init notice:', err.message);
  });

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

  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    if (params.selectionText && params.selectionText.trim().length > 0) {
      menu.append(new MenuItem({ label: 'Copy', role: 'copy', accelerator: 'CmdOrCtrl+C' }));
    }
    if (params.isEditable) {
      if (params.selectionText && params.selectionText.trim().length > 0) {
        menu.append(new MenuItem({ label: 'Cut', role: 'cut', accelerator: 'CmdOrCtrl+X' }));
      }
      menu.append(new MenuItem({ label: 'Paste', role: 'paste', accelerator: 'CmdOrCtrl+V' }));
    }
    if (menu.items.length > 0) {
      menu.popup();
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
      message: 'Downloading latest update & rebuilding Klarity...'
    });

    // 1. Gather recent changes for "What's New" modal
    let recentChanges = [];
    try {
      const log = await runShell('git log -5 --pretty=format:"%s" origin/main', repoDir);
      recentChanges = log.split('\n').map(s => s.trim()).filter(Boolean);
    } catch {}

    if (recentChanges.length === 0 && updateStatusState.recentChanges?.length > 0) {
      recentChanges = updateStatusState.recentChanges;
    }
    if (recentChanges.length === 0) {
      recentChanges = [
        "Passwords Vault: Added three-dots card menu with Favorite (yellow card highlight) and Red Delete Confirmation Pop-up",
        "Household Hub: Spacious redesigned layout with sticky navigation bar and real-time bills synchronization",
        "Auto & Health Hub: Upgraded card uploaders with unified scanning and document parsing",
        "Passwords & Accounts: Added website URL fields and custom user-defined sections with full delete support",
        "App Settings: Real-time GitHub auto-update checking and What's New release announcements"
      ];
    }

    if (app.isPackaged && autoUpdater && updateStatusState.state === 'ready') {
      saveWhatsNewData(recentChanges, updateStatusState.latestVersion || app.getVersion());
      autoUpdater.quitAndInstall(false, true);
      return { ok: true };
    }

    // Pull latest code
    await runShell('git fetch origin main --quiet', repoDir);
    await runShell('git reset --hard origin/main', repoDir);

    // Rebuild client so frontend reflects new code
    try {
      await runShell('npm --prefix client run build', repoDir);
    } catch (bErr) {
      console.warn('Frontend rebuild during update note:', bErr.message);
    }

    const newSha = await runShell('git rev-parse HEAD', repoDir).catch(() => 'latest');

    // Save What's New data to userDataDir so the pop-up appears on restart
    saveWhatsNewData(recentChanges, newSha ? newSha.slice(0, 7) : app.getVersion());

    // Update installed_version.json to the new SHA
    const versionFile = path.join(app.getPath('userData'), 'installed_version.json');
    try {
      fs.writeFileSync(versionFile, JSON.stringify({
        version: app.getVersion(),
        commitSha: newSha,
        installedAt: Date.now()
      }, null, 2), 'utf8');
    } catch {}

    runningCommitSha = newSha;

    if (httpServerInstance) {
      try { httpServerInstance.close(); } catch {}
    }

    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 600);

    return { ok: true };
  } catch (err) {
    broadcastUpdateStatus({
      state: 'available',
      message: 'Update failed: ' + (err.message || 'Please try again.')
    });
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('klarity:get-whats-new', () => {
  try {
    const whatsNewFile = path.join(app.getPath('userData'), 'whats_new.json');
    if (fs.existsSync(whatsNewFile)) {
      const data = JSON.parse(fs.readFileSync(whatsNewFile, 'utf8'));
      if (data && data.shown === false) {
        return data;
      }
    }
  } catch {}
  return null;
});

ipcMain.handle('klarity:dismiss-whats-new', () => {
  try {
    const whatsNewFile = path.join(app.getPath('userData'), 'whats_new.json');
    if (fs.existsSync(whatsNewFile)) {
      const data = JSON.parse(fs.readFileSync(whatsNewFile, 'utf8'));
      data.shown = true;
      fs.writeFileSync(whatsNewFile, JSON.stringify(data, null, 2), 'utf8');
      return true;
    }
  } catch {}
  return false;
});

const isDev = !app.isPackaged;
const gotTheLock = isDev ? true : app.requestSingleInstanceLock();

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
