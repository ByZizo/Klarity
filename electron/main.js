const { app, BrowserWindow, shell, ipcMain, session, nativeTheme, Menu, MenuItem } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Generate per-launch cryptographic secret for desktop loopback verification
const DESKTOP_IPC_SECRET = crypto.randomBytes(32).toString('hex');

// Ensure App name and userData path are set immediately before any lock checks
app.setName('Klarity');
const userDataDir = path.join(app.getPath('appData'), 'Klarity');
if (!fs.existsSync(userDataDir)) {
  try { fs.mkdirSync(userDataDir, { recursive: true }); } catch {}
}
app.setPath('userData', userDataDir);
process.env.KLARITY_USER_DATA_DIR = userDataDir;
process.env.KLARITY_DESKTOP_APP = 'true';
process.env.KLARITY_DESKTOP_IPC_SECRET = DESKTOP_IPC_SECRET;
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

let browserAdsBlockedCount = 0;
let adBlockerEnabled = true;

function broadcastAdBlockStats() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('klarity:adblock-stats', {
      adsBlockedCount: browserAdsBlockedCount,
      enabled: adBlockerEnabled
    });
  }
}

let runningCommitSha = null;

function getRunningCommitSha() {
  // 1. Return in-memory cache if already determined for this process lifetime
  if (runningCommitSha) return runningCommitSha;

  const repoDir = path.join(__dirname, '..');
  // 2. When running from repository, the local HEAD commit at startup is the ground truth
  try {
    const sha = require('child_process').execSync('git rev-parse HEAD', { cwd: repoDir, windowsHide: true }).toString().trim();
    if (sha) {
      runningCommitSha = sha;
      const versionFile = path.join(app.getPath('userData'), 'installed_version.json');
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

  // 3. Fall back to persisted installed_version.json (for packaged production environments without .git)
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

  runningCommitSha = 'v' + app.getVersion();
  return runningCommitSha;
}

function formatUserFacingReleaseNote(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let text = rawText.trim();
  text = text.replace(/^(?:feat|fix|perf|refactor|chore|style|docs|build|ci)(?:\([^)]*\))?:\s*/i, '');
  text = text.replace(/^merge\s+(?:branch|pull\s+request).*$/i, '');
  if (!text) return '';

  const verbReplacements = [
    [/^streamline\b/i, 'Streamlined'],
    [/^enhance\b/i, 'Enhanced'],
    [/^bring\s+back\b/i, 'Brought back'],
    [/^add\b/i, 'Added'],
    [/^fix\b/i, 'Fixed'],
    [/^resolve\b/i, 'Resolved'],
    [/^update\b/i, 'Updated'],
    [/^improve\b/i, 'Improved'],
    [/^optimize\b/i, 'Optimized'],
    [/^remove\b/i, 'Removed'],
    [/^support\b/i, 'Added support for'],
    [/^integrate\b/i, 'Integrated'],
    [/^polish\b/i, 'Polished'],
    [/^clean\s+up\b/i, 'Cleaned up'],
    [/^cleanup\b/i, 'Cleaned up'],
    [/^restyle\b/i, 'Restyled'],
    [/^reorganize\b/i, 'Reorganized'],
    [/^allow\b/i, 'Added ability to'],
    [/^show\b/i, 'Added view for'],
    [/^hide\b/i, 'Removed display of'],
    [/^change\b/i, 'Updated']
  ];

  for (const [pattern, replacement] of verbReplacements) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
      break;
    }
  }

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  text = text.replace(/[.;,]+$/, '');
  return text;
}

function isMovementOrMinorTweak(str) {
  const s = String(str || '').toLowerCase();
  return /\b(move|moving|moved|reposition|repositioned|repositioning|reorder|reordered|reordering|swap|swapped|swapping|switch|switched|switching|places|left side|right side|layout|align|alignment|spacing|tweak|tweaks|minor|fix|fixes|fixed|glitch|bug|bugfix|polish|clean up|cleanup)\b/i.test(s);
}

function formatWhatsNewHighlights(changes) {
  let list = [];
  if (Array.isArray(changes)) {
    list = changes;
  } else if (changes && typeof changes === 'object') {
    if (Array.isArray(changes.changes)) {
      list = changes.changes;
    } else if (typeof changes.message === 'string' && changes.message.trim()) {
      list = [changes.message];
    } else if (typeof changes.commitTitle === 'string' && changes.commitTitle.trim()) {
      list = [changes.commitTitle];
    }
  }

  const items = [];
  let hasMinorOrMovement = false;

  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const clean = raw.trim();
    if (!clean) continue;

    if (isMovementOrMinorTweak(clean)) {
      hasMinorOrMovement = true;
    } else {
      const formatted = formatUserFacingReleaseNote(clean);
      if (formatted && !items.some(existing => existing.toLowerCase() === formatted.toLowerCase())) {
        items.push(formatted);
      }
    }
  }

  if (hasMinorOrMovement && !items.some(i => i.toLowerCase() === 'bug fixes')) {
    items.push('Bug fixes');
  }

  if (items.length > 0) {
    return items.slice(0, 4);
  }

  return ["Bug fixes"];
}

function saveWhatsNewData(changes, versionOrSha, explicitVersion) {
  try {
    const whatsNewFile = path.join(app.getPath('userData'), 'whats_new.json');
    const repoDir = path.join(__dirname, '..');
    let ver = explicitVersion;
    if (!ver) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
        if (pkg && pkg.version) ver = pkg.version;
      } catch {}
    }
    if (!ver || ver === '1.8.10') ver = '3.12.14';
    const cleanVer = ver.startsWith('v') ? ver.slice(1) : ver;

    const data = {
      shown: false,
      version: cleanVer,
      commitSha: versionOrSha || cleanVer,
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
    let currentVersion = app.getVersion();
    let foundLocalPkg = false;
    try {
      const localPkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
      if (localPkg && localPkg.version) {
        currentVersion = localPkg.version;
        foundLocalPkg = true;
      }
    } catch {}
    if (!foundLocalPkg) {
      try {
        const versionFile = path.join(app.getPath('userData'), 'installed_version.json');
        if (fs.existsSync(versionFile)) {
          const iv = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
          if (iv && iv.version) currentVersion = iv.version;
        }
      } catch {}
    }

    let remoteSha = null;
    let commitTitle = '';
    let commitDate = '';
    let recentCommits = [];

    // 1. Fetch latest commits on main from GitHub API (with cache-busting so newly pushed commits appear immediately)
    try {
      const ghRes = await fetch(`https://api.github.com/repos/ByZizo/Klarity/commits?per_page=5&_t=${Date.now()}`, {
        headers: {
          'User-Agent': 'KlarityDesktopApp',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (ghRes.ok) {
        const commits = await ghRes.json();
        if (Array.isArray(commits) && commits.length > 0) {
          remoteSha = commits[0].sha;
          commitTitle = commits[0].commit?.message?.split('\n')[0] || '';
          commitDate = commits[0].commit?.author?.date || '';
          const newCommits = [];
          for (const c of commits) {
            if (currentSha && (c.sha.startsWith(currentSha) || currentSha.startsWith(c.sha))) {
              break;
            }
            const msg = c.commit?.message?.split('\n')[0];
            if (msg) newCommits.push(msg);
          }
          recentCommits = newCommits.length > 0 ? newCommits : (commitTitle ? [commitTitle] : []);
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

    // Fetch remote package.json to get semantic version (with cache-buster for GitHub raw CDN)
    let remoteVersion = null;
    try {
      const pkgRes = await fetch(`https://raw.githubusercontent.com/ByZizo/Klarity/main/package.json?_t=${Date.now()}`, {
        headers: {
          'User-Agent': 'KlarityDesktopApp',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        if (pkgData && pkgData.version) {
          remoteVersion = pkgData.version;
        }
      }
    } catch (pkgErr) {}

    if (!remoteVersion) {
      try {
        const localPkgStr = await runShell('git show origin/main:package.json', repoDir);
        if (localPkgStr) {
          const pkgData = JSON.parse(localPkgStr);
          if (pkgData && pkgData.version) remoteVersion = pkgData.version;
        }
      } catch (e) {}
    }

    const versionNum = remoteVersion || currentVersion || app.getVersion() || '3.12.24';
    const cleanSemVer = versionNum.startsWith('v') ? versionNum.slice(1) : versionNum;
    const formattedSemVer = `v${cleanSemVer}`;

    function isSemverNewer(remoteVer, currentVer) {
      if (!remoteVer || !currentVer) return false;
      const rParts = String(remoteVer).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
      const cParts = String(currentVer).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
      for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
        const r = rParts[i] || 0;
        const c = cParts[i] || 0;
        if (r > c) return true;
        if (r < c) return false;
      }
      return false;
    }

    // 3. Verify whether an update is available via either SemVer bump OR a newer commit SHA on GitHub
    const semverIsNewer = Boolean(remoteVersion && currentVersion && isSemverNewer(remoteVersion, currentVersion));
    const localSemverIsNewer = Boolean(remoteVersion && currentVersion && isSemverNewer(currentVersion, remoteVersion));
    let alreadyUpToDate = false;

    if (semverIsNewer) {
      alreadyUpToDate = false;
    } else if (localSemverIsNewer) {
      alreadyUpToDate = true;
    } else if (remoteSha && currentSha && !currentSha.startsWith('v')) {
      // Compare commit SHAs when both are real git hashes
      if (remoteSha.startsWith(currentSha) || currentSha.startsWith(remoteSha)) {
        alreadyUpToDate = true;
      } else {
        try {
          const isAncestor = await runShell(`git merge-base --is-ancestor ${remoteSha} ${currentSha} && echo yes`, repoDir).catch(() => '');
          if (isAncestor && isAncestor.includes('yes')) {
            alreadyUpToDate = true;
          }
        } catch {}
      }
    } else {
      // Packaged build without git SHA: rely on semantic version comparison
      alreadyUpToDate = !semverIsNewer;
    }

    if (!alreadyUpToDate && (remoteSha || semverIsNewer)) {
      broadcastUpdateStatus({
        state: 'available',
        latestVersion: formattedSemVer,
        currentVersion: currentVersion,
        currentSha: currentSha ? currentSha.slice(0, 7) : '',
        fullSha: remoteSha || '',
        commitSha: remoteSha ? remoteSha.slice(0, 7) : formattedSemVer,
        commitTitle: commitTitle || 'New GitHub update available',
        commitDate,
        recentChanges: recentCommits,
        message: commitTitle
          ? `New update available (${formattedSemVer}): ${commitTitle}`
          : `A new version of Klarity (${formattedSemVer}) is available!`
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
      currentSha: currentSha ? currentSha.slice(0, 7) : 'latest',
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
  process.env.KLARITY_DESKTOP_IPC_SECRET = DESKTOP_IPC_SECRET;

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

  // Set up dedicated In-App Browser Partition with Built-in Ad Blocker
  const browserSession = session.fromPartition('persist:klarity_browser');

  const AD_BLOCK_DOMAINS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'adnxs.com', 'pubmatic.com', 'taboola.com', 'outbrain.com',
    'adroll.com', 'criteo.com', 'criteo.net', 'scorecardresearch.com',
    'amazon-adsystem.com', 'rubiconproject.com', 'openx.net',
    'casalemedia.com', 'moatads.com', 'advertising.com', 'quantserve.com',
    'zedo.com', 'adtech.de', 'bidswitch.net', 'smartadserver.com',
    'adform.net', 'adzerk.net', 'tribalfusion.com', 'yieldmo.com',
    'media.net', 'adblade.com', 'sharethrough.com', 'popads.net',
    'propellerads.com', 'revcontent.com', 'exoclick.com', 'mgid.com',
    'infolinks.com', 'adcolony.com', 'vungle.com', 'unityads.unity3d.com',
    'chartboost.com', 'appsflyer.com', 'branch.io', 'singular.net',
    'adjust.com', 'hotjar.com', 'clarity.ms', 'fullstory.com'
  ];

  const AD_BLOCK_PATTERNS = [
    /\/ads?\//i,
    /\/ad_server\//i,
    /\/pagead\//i,
    /googleads/i,
    /\/adsystem\//i,
    /\/adzerk\//i,
    /\/banner_ads?\//i,
    /\/advert(?:s|ing)?\//i,
    /\/popunder/i,
    /\/tracking_pixel/i,
    /\/telemetry\./i
  ];

  browserSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (!adBlockerEnabled) {
      return callback({ cancel: false });
    }
    try {
      const parsedUrl = new URL(details.url);
      const host = parsedUrl.hostname.toLowerCase();

      // Check known ad network domains
      const isAdDomain = AD_BLOCK_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
      if (isAdDomain) {
        browserAdsBlockedCount++;
        broadcastAdBlockStats();
        return callback({ cancel: true });
      }

      // Check ad URL patterns
      const urlPath = parsedUrl.pathname + parsedUrl.search;
      const isAdPattern = AD_BLOCK_PATTERNS.some(regex => regex.test(urlPath));
      if (isAdPattern) {
        browserAdsBlockedCount++;
        broadcastAdBlockStats();
        return callback({ cancel: true });
      }
    } catch {}

    callback({ cancel: false });
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
      spellcheck: true,
      webviewTag: true
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
  }, 60 * 1000);
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
        const res = await fetch(`http://localhost:${port}/api/auth/google/check-session?sid=${sid}`, {
          headers: { 'x-klarity-desktop-secret': DESKTOP_IPC_SECRET }
        });
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

    // Capture previous HEAD SHA before updating to extract exact incoming commits
    const previousSha = await runShell('git rev-parse HEAD', repoDir).catch(() => '');

    if (app.isPackaged && autoUpdater && updateStatusState.state === 'ready') {
      saveWhatsNewData(updateStatusState.recentChanges || [], updateStatusState.latestVersion || app.getVersion());
      autoUpdater.quitAndInstall(false, true);
      return { ok: true };
    }

    // Safety backup of local data so user data is never lost across git resets or updates
    const localDataPath = path.join(repoDir, 'server', 'data.json');
    let localDataBackup = null;
    if (fs.existsSync(localDataPath)) {
      try {
        localDataBackup = fs.readFileSync(localDataPath, 'utf8');
      } catch {}
    }

    // Pull latest code
    await runShell('git fetch origin main --quiet', repoDir);
    await runShell('git reset --hard origin/main', repoDir);

    // Restore user data if it existed so user data is permanently preserved across updates
    if (localDataBackup) {
      try {
        fs.writeFileSync(localDataPath, localDataBackup, 'utf8');
      } catch {}
    }

    // Rebuild client so frontend reflects new code
    try {
      await runShell('npm --prefix client run build', repoDir);
    } catch (bErr) {
      console.warn('Frontend rebuild during update note:', bErr.message);
    }

    const newSha = await runShell('git rev-parse HEAD', repoDir).catch(() => 'latest');

    // Gather the exact commits applied in this update
    let recentChanges = [];
    try {
      if (previousSha && newSha && previousSha !== newSha && previousSha !== 'latest' && newSha !== 'latest') {
        const rangeLog = await runShell(`git log ${previousSha}..${newSha} --pretty=format:"%s"`, repoDir).catch(() => '');
        if (rangeLog) {
          recentChanges = rangeLog.split('\n').map(s => s.trim()).filter(Boolean);
        }
      }
      // Only look at the single most recent commit if no range (never previous history)
      if (recentChanges.length === 0) {
        const headLog = await runShell('git log -1 --pretty=format:"%s" HEAD', repoDir);
        if (headLog) {
          recentChanges = [headLog.trim()];
        }
      }
    } catch {}

    if (recentChanges.length === 0 && updateStatusState.recentChanges?.length > 0) {
      recentChanges = updateStatusState.recentChanges;
    }

    let updatedVersion = null;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
      if (pkg && pkg.version) updatedVersion = pkg.version;
    } catch {}

    // Save What's New data to userDataDir so the pop-up appears on restart
    saveWhatsNewData(recentChanges, newSha ? newSha.slice(0, 7) : app.getVersion(), updatedVersion);

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

    broadcastUpdateStatus({
      state: 'up-to-date',
      version: updatedVersion || app.getVersion(),
      commitSha: newSha ? newSha.slice(0, 7) : 'latest',
      message: `Up to date — v${updatedVersion || app.getVersion()}`
    });

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

// In-App Browser Ad Blocker IPC Handlers
ipcMain.handle('klarity:browser-get-adblock-stats', () => {
  return {
    adsBlockedCount: browserAdsBlockedCount,
    enabled: adBlockerEnabled
  };
});

ipcMain.handle('klarity:browser-toggle-adblock', (_e, enabled) => {
  adBlockerEnabled = enabled !== undefined ? Boolean(enabled) : !adBlockerEnabled;
  broadcastAdBlockStats();
  return {
    adsBlockedCount: browserAdsBlockedCount,
    enabled: adBlockerEnabled
  };
});

ipcMain.handle('klarity:browser-reset-adblock-count', () => {
  browserAdsBlockedCount = 0;
  broadcastAdBlockStats();
  return {
    adsBlockedCount: browserAdsBlockedCount,
    enabled: adBlockerEnabled
  };
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
