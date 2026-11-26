const { app, BrowserWindow, shell, ipcMain, session, nativeTheme, Menu, MenuItem, dialog, screen, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

function getHardwareProfile() {
  try {
    const totalMemGB = Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10;
    const freeMemGB = Math.round((os.freemem() / (1024 ** 3)) * 10) / 10;
    const cpuCount = Array.isArray(os.cpus()) ? os.cpus().length : 2;
    const isChromeOS = Boolean(
      process.platform === 'linux' &&
        (process.env.CHROMEOS_RELEASE_VERSION ||
          (fs.existsSync('/etc/lsb-release') &&
            /CHROMEOS/i.test(fs.readFileSync('/etc/lsb-release', 'utf8'))))
    );
    const isLowPowerDevice = Boolean(isChromeOS || totalMemGB <= 4 || cpuCount <= 4);
    return { totalMemGB, freeMemGB, cpuCount, isChromeOS, isLowPowerDevice };
  } catch {
    return { totalMemGB: null, freeMemGB: null, cpuCount: null, isChromeOS: false, isLowPowerDevice: false };
  }
}

// Generate per-launch cryptographic secret for desktop loopback verification
const DESKTOP_IPC_SECRET = crypto.randomBytes(32).toString('hex');

// Ensure App name and userData path are set immediately before any lock checks
app.setName('Klarity');
const userDataDir = path.join(app.getPath('appData'), 'Klarity');
const krystalUserDataDir = path.join(app.getPath('appData'), 'Krystal');

// Seamless migration: preserve data if a user previously ran a Krystal build
if (!fs.existsSync(userDataDir) && fs.existsSync(krystalUserDataDir)) {
  try {
    fs.cpSync(krystalUserDataDir, userDataDir, { recursive: true });
  } catch (err) {
    console.warn('Migration from Krystal to Klarity directory note:', err.message);
  }
}

if (!fs.existsSync(userDataDir)) {
  try { fs.mkdirSync(userDataDir, { recursive: true }); } catch {}
}
app.setPath('userData', userDataDir);
process.env.KLARITY_USER_DATA_DIR = userDataDir;
process.env.KLARITY_DESKTOP_APP = 'true';
process.env.KLARITY_DESKTOP_IPC_SECRET = DESKTOP_IPC_SECRET;

const CHROME_MAJOR_VERSION = String(process.versions?.chrome || '134.0.0.0').split('.')[0] || '134';
const STANDARD_SEC_CH_UA = `"Chromium";v="${CHROME_MAJOR_VERSION}", "Google Chrome";v="${CHROME_MAJOR_VERSION}", "Not-A.Brand";v="99"`;

function buildStandardDesktopUserAgent() {
  const chromeVer = `${CHROME_MAJOR_VERSION}.0.0.0`;
  if (process.platform === 'darwin') {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;
  }
  if (process.platform === 'linux') {
    return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;
  }
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;
}

const STANDARD_BROWSER_UA = buildStandardDesktopUserAgent();
try {
  app.userAgentFallback = STANDARD_BROWSER_UA;
} catch {}

try { if (nativeTheme) nativeTheme.themeSource = 'system'; } catch (e) {}
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

let adBlockBroadcastTimer = null;

function broadcastAdBlockStats(immediate = false) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const sendNow = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('klarity:adblock-stats', {
        adsBlockedCount: browserAdsBlockedCount,
        enabled: adBlockerEnabled
      });
    }
  };
  if (immediate) {
    if (adBlockBroadcastTimer) {
      clearTimeout(adBlockBroadcastTimer);
      adBlockBroadcastTimer = null;
    }
    sendNow();
    return;
  }
  if (adBlockBroadcastTimer) return;
  adBlockBroadcastTimer = setTimeout(() => {
    adBlockBroadcastTimer = null;
    sendNow();
  }, 500);
}

let runningCommitSha = null;
let runningAppVersion = null;
let checkUpdateInFlight = null;
let lastAutoCheckAt = 0;
let pendingPackagedAutoInstall = false;

function initRunningBuildIdentity() {
  const repoDir = path.join(__dirname, '..');

  // When running from git repo (!app.isPackaged), snap actual git HEAD & repo package.json at launch
  // BEFORE any future commits or background fetches happen while the app stays open.
  if (!app.isPackaged) {
    try {
      const sha = require('child_process')
        .execSync('git rev-parse HEAD', { cwd: repoDir, windowsHide: true })
        .toString()
        .trim();
      if (sha) runningCommitSha = sha;
    } catch {}

    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
      if (pkg && pkg.version) runningAppVersion = pkg.version;
    } catch {}
  }

  // Fallback to persisted installed_version.json
  if (!runningCommitSha || !runningAppVersion) {
    try {
      const versionFile = path.join(app.getPath('userData'), 'installed_version.json');
      if (fs.existsSync(versionFile)) {
        const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
        if (!runningCommitSha && data && data.commitSha) {
          runningCommitSha = data.commitSha;
        }
        if (!runningAppVersion && data && data.version) {
          runningAppVersion = data.version;
        }
      }
    } catch {}
  }

  if (!runningAppVersion) {
    runningAppVersion = app.getVersion() || '3.12.74';
  }
  if (!runningCommitSha) {
    runningCommitSha = 'v' + runningAppVersion;
  }
}

initRunningBuildIdentity();
updateStatusState.version = runningAppVersion;

function getRunningCommitSha() {
  return runningCommitSha;
}

function getRunningAppVersion() {
  return runningAppVersion;
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

function isActualBugFix(str) {
  const s = String(str || '').toLowerCase();
  return /\b(bug|bugfix|crash|crashes|crashed|crashing|error|errors|exception|exceptions|fail|fails|failed|failure|broken|unhandled|regression|freeze|freezing|not loading|cannot delete|unable to|prevent crash|glitch)\b/i.test(s);
}

function isMovementOrMinorTweak(str) {
  const s = String(str || '').toLowerCase();
  return /\b(move|moving|moved|reposition|repositioned|repositioning|reorder|reordered|reordering|swap|swapped|swapping|switch|switched|switching|places|left side|right side|layout|align|alignment|spacing|padding|margin|tweak|tweaks|minor|polish|clean up|cleanup|refactor|cosmetic|styling|restyle|label|wording|subtle)\b/i.test(s);
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
  let hasActualBug = false;
  let hasMinorFix = false;

  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const clean = raw.trim();
    if (!clean) continue;

    if (isActualBugFix(clean)) {
      hasActualBug = true;
    } else if (isMovementOrMinorTweak(clean)) {
      hasMinorFix = true;
    } else {
      const formatted = formatUserFacingReleaseNote(clean);
      if (formatted && !items.some(existing => existing.toLowerCase() === formatted.toLowerCase())) {
        items.push(formatted);
      }
    }
  }

  // Keep 'Bug fixes' strictly for things that were actually causing bugs
  if (hasActualBug && !items.some(i => i.toLowerCase() === 'bug fixes')) {
    items.push('Bug fixes');
  }

  // Small changes that don't affect the app on a major scale are known as 'Minor fixes'
  if (hasMinorFix && !items.some(i => i.toLowerCase() === 'minor fixes')) {
    items.push('Minor fixes');
  }

  if (items.length > 0) {
    return items.slice(0, 4);
  }

  return ['Minor fixes'];
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

    const rawList = Array.isArray(changes)
      ? changes.filter((c) => typeof c === 'string' && c.trim())
      : (changes && Array.isArray(changes.changes) ? changes.changes : []);

    const data = {
      shown: false,
      version: cleanVer,
      commitSha: versionOrSha || cleanVer,
      title: "What's New in Klarity",
      changes: formatWhatsNewHighlights(changes),
      rawChanges: rawList,
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
async function checkForGitHubUpdate(options = {}) {
  if (checkUpdateInFlight) {
    return checkUpdateInFlight;
  }

  checkUpdateInFlight = (async () => {
    const repoDir = path.join(__dirname, '..');
    const isManual = Boolean(options && options.manual);
    lastAutoCheckAt = Date.now();

    try {
      // Avoid overwriting an already discovered 'available' or 'ready' state during silent background polls
      if (isManual || (updateStatusState.state !== 'available' && updateStatusState.state !== 'ready' && updateStatusState.state !== 'installing')) {
        broadcastUpdateStatus({ state: 'checking', message: 'Checking GitHub for updates...' });
      }

      const currentSha = getRunningCommitSha();
      const currentVersion = getRunningAppVersion();

      let remoteSha = null;
      let commitTitle = '';
      let commitDate = '';
      let recentCommits = [];
      let remoteVersion = null;

      // 1. In git-backed mode, fetch directly from origin/main FIRST (zero GitHub REST 60/hr rate limit & zero raw CDN lag)
      if (!app.isPackaged) {
        try {
          await runShell('git fetch origin main --quiet', repoDir);
          const gitRemote = await runShell('git rev-parse origin/main', repoDir);
          if (gitRemote) {
            remoteSha = gitRemote;
            commitTitle = await runShell('git log -1 --pretty=%s origin/main', repoDir).catch(() => '');
            commitDate = await runShell('git log -1 --pretty=%cI origin/main', repoDir).catch(() => '');
            const multiLog = await runShell('git log -5 --pretty=%s origin/main', repoDir).catch(() => '');
            if (multiLog) {
              recentCommits = multiLog.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            } else if (commitTitle) {
              recentCommits = [commitTitle];
            }
          }
          const localPkgStr = await runShell('git show origin/main:package.json', repoDir).catch(() => '');
          if (localPkgStr) {
            const pkgData = JSON.parse(localPkgStr);
            if (pkgData && pkgData.version) remoteVersion = pkgData.version;
          }
        } catch {}
      }

      // 2. Fallback: Check GitHub Releases latest tag redirect (zero REST API rate limit, instant tag resolution)
      if (!remoteVersion) {
        try {
          const relRes = await fetch(`https://github.com/ByZizo/Klarity/releases/latest?_t=${Date.now()}`, {
            method: 'HEAD',
            redirect: 'follow',
            headers: {
              'User-Agent': 'KlarityDesktopApp',
              'Cache-Control': 'no-cache'
            }
          });
          const finalUrl = relRes?.url || '';
          const tagMatch = finalUrl.match(/\/releases\/tag\/v?([0-9]+\.[0-9]+\.[0-9]+[^\s/?#]*)/i);
          if (tagMatch && tagMatch[1]) {
            remoteVersion = tagMatch[1];
          }
        } catch {}
      }

      // 3. Fallback: Fetch remote package.json if still needed
      if (!remoteVersion) {
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
        } catch {}
      }

      // 4. Fallback: Fetch latest commits from GitHub REST API only if git fetch did not already populate remoteSha/commitTitle
      if (!remoteSha || !commitTitle) {
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
              if (!remoteSha) remoteSha = commits[0].sha;
              if (!commitTitle) commitTitle = commits[0].commit?.message?.split('\n')[0] || '';
              if (!commitDate) commitDate = commits[0].commit?.author?.date || '';
              if (recentCommits.length === 0) {
                recentCommits = commits
                  .map(c => c?.commit?.message?.split('\n')[0] || '')
                  .filter(Boolean);
              }
            }
          }
        } catch (apiErr) {
          console.warn('GitHub API commit check note:', apiErr.message);
        }
      }

      const versionNum = remoteVersion || currentVersion || app.getVersion() || '3.12.74';
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

      // Always kick off packaged electron-updater check so binary downloads happen automatically in background
      if (app.isPackaged && autoUpdater) {
        autoUpdater.checkForUpdates().catch(() => {});
      }

      // 5. Verify whether an update is available via either SemVer bump OR a newer commit SHA on GitHub
      const semverIsNewer = Boolean(remoteVersion && currentVersion && isSemverNewer(remoteVersion, currentVersion));
      const localSemverIsNewer = Boolean(remoteVersion && currentVersion && isSemverNewer(currentVersion, remoteVersion));
      let alreadyUpToDate = false;

      const sameCommitSha = Boolean(
        remoteSha &&
        currentSha &&
        !currentSha.startsWith('v') &&
        (remoteSha.startsWith(currentSha) || currentSha.startsWith(remoteSha))
      );

      if (sameCommitSha && !semverIsNewer) {
        alreadyUpToDate = true;
      } else if (semverIsNewer) {
        alreadyUpToDate = false;
      } else if (localSemverIsNewer) {
        alreadyUpToDate = true;
      } else if (remoteSha && currentSha && !currentSha.startsWith('v')) {
        // Compare commit SHAs when both are real git hashes (exit code 0 => remoteSha is ancestor of currentSha)
        try {
          await runShell(`git merge-base --is-ancestor ${remoteSha} ${currentSha}`, repoDir);
          alreadyUpToDate = true;
        } catch {
          alreadyUpToDate = false;
        }
      } else {
        // Packaged build without git SHA: rely on semantic version comparison
        alreadyUpToDate = !semverIsNewer;
      }

      if (!alreadyUpToDate && (remoteSha || semverIsNewer)) {
        const nextState = updateStatusState.state === 'ready' ? 'ready' : 'available';
        broadcastUpdateStatus({
          state: nextState,
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

      if (updateStatusState.state === 'ready' || updateStatusState.state === 'installing') {
        return updateStatusState;
      }

      // 6. Up to date
      broadcastUpdateStatus({
        state: 'up-to-date',
        version: currentVersion,
        currentSha: currentSha ? currentSha.slice(0, 7) : 'latest',
        commitSha: currentSha ? currentSha.slice(0, 7) : 'latest',
        message: `Up to date — v${currentVersion} (${currentSha ? currentSha.slice(0, 7) : 'latest'})`
      });
    } catch (err) {
      if (updateStatusState.state !== 'available' && updateStatusState.state !== 'ready') {
        broadcastUpdateStatus({
          state: 'up-to-date',
          version: getRunningAppVersion(),
          message: `Up to date — v${getRunningAppVersion()}`
        });
      }
    }
    return updateStatusState;
  })().finally(() => {
    checkUpdateInFlight = null;
  });

  return checkUpdateInFlight;
}

function triggerThrottledAutoUpdateCheck(minIntervalMs = 30 * 1000) {
  if (Date.now() - lastAutoCheckAt < minIntervalMs) return;
  if (updateStatusState.state === 'installing') return;
  checkForGitHubUpdate({ manual: false }).catch(() => {});
}

function setupAutoUpdater() {
  if (!autoUpdater) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    const cleanVer = info?.version ? `v${String(info.version).replace(/^v/i, '')}` : updateStatusState.latestVersion;
    broadcastUpdateStatus({
      state: updateStatusState.state === 'installing' ? 'installing' : 'available',
      latestVersion: cleanVer,
      commitSha: updateStatusState.commitSha || cleanVer,
      message: `A new update (${cleanVer || 'latest'}) is available! Would you like to update now?`
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    const cleanVer = info?.version ? `v${String(info.version).replace(/^v/i, '')}` : updateStatusState.latestVersion;
    broadcastUpdateStatus({
      state: 'ready',
      latestVersion: cleanVer,
      commitSha: updateStatusState.commitSha || cleanVer,
      message: `Update ${cleanVer || 'new'} is ready to install!`
    });
    if (pendingPackagedAutoInstall) {
      pendingPackagedAutoInstall = false;
      saveWhatsNewData(updateStatusState.recentChanges || [], cleanVer || app.getVersion(), cleanVer);
      setTimeout(() => {
        autoUpdater.quitAndInstall(false, true);
      }, 400);
    }
  });

  autoUpdater.on('error', () => {
    pendingPackagedAutoInstall = false;
  });
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

let browserRuntimePrefs = {
  doNotTrack: false,
  cookiePolicy: 'allow',
  downloadPath: app.getPath('downloads'),
  askWhereToSave: false
};
const browserPrefsFile = path.join(app.getPath('userData'), 'browser_prefs.json');
try {
  if (fs.existsSync(browserPrefsFile)) {
    const savedPrefs = JSON.parse(fs.readFileSync(browserPrefsFile, 'utf8'));
    browserRuntimePrefs = { ...browserRuntimePrefs, ...(savedPrefs || {}) };
  }
} catch {}

function saveBrowserRuntimePrefs(nextPrefs) {
  browserRuntimePrefs = { ...browserRuntimePrefs, ...nextPrefs };
  try {
    fs.writeFileSync(browserPrefsFile, JSON.stringify(browserRuntimePrefs, null, 2), 'utf8');
  } catch {}
  return browserRuntimePrefs;
}

const MAX_BROWSER_DOWNLOADS = 100;
const browserDownloadsFile = path.join(app.getPath('userData'), 'browser_downloads.json');
const activeBrowserDownloadItems = new Map();
let browserDownloadsListenerAttached = false;
let browserDownloads = [];
try {
  if (fs.existsSync(browserDownloadsFile)) {
    const savedDownloads = JSON.parse(fs.readFileSync(browserDownloadsFile, 'utf8'));
    if (Array.isArray(savedDownloads)) {
      browserDownloads = savedDownloads.slice(0, MAX_BROWSER_DOWNLOADS).map((d) => ({
        ...d,
        state: d.state === 'progressing' || d.state === 'paused' ? 'interrupted' : d.state
      }));
    }
  }
} catch {}

function saveBrowserDownloads() {
  try {
    const persistable = browserDownloads.slice(0, MAX_BROWSER_DOWNLOADS).map(({ exists, ...rest }) => rest);
    fs.writeFileSync(browserDownloadsFile, JSON.stringify(persistable, null, 2), 'utf8');
  } catch {}
}

function getSerializedBrowserDownloads() {
  return browserDownloads.slice(0, MAX_BROWSER_DOWNLOADS).map((d) => ({
    ...d,
    exists:
      d.state === 'progressing' || d.state === 'paused'
        ? true
        : Boolean(d.savePath && fs.existsSync(d.savePath))
  }));
}

function broadcastBrowserDownloads() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('klarity:browser-downloads', getSerializedBrowserDownloads());
  }
}

function ensureDownloadDirectory(targetDir) {
  let resolvedDir = targetDir || app.getPath('downloads');
  try {
    fs.mkdirSync(resolvedDir, { recursive: true });
    return resolvedDir;
  } catch {
    const fallbackDir = app.getPath('downloads');
    try {
      fs.mkdirSync(fallbackDir, { recursive: true });
    } catch {}
    return fallbackDir;
  }
}

function getUniqueDownloadPath(targetDir, rawFileName) {
  const safeName =
    path.basename(String(rawFileName || 'download')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'download';
  const resolvedDir = ensureDownloadDirectory(targetDir);
  const parsed = path.parse(safeName);
  const baseName = parsed.name || 'download';
  const ext = parsed.ext || '';
  let candidate = path.join(resolvedDir, safeName);
  let counter = 1;
  while (fs.existsSync(candidate) && counter < 1000) {
    candidate = path.join(resolvedDir, `${baseName} (${counter})${ext}`);
    counter += 1;
  }
  return candidate;
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
  browserSession.setUserAgent(STANDARD_BROWSER_UA);

  browserSession.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    const requestHeaders = { ...(details.requestHeaders || {}) };
    requestHeaders['User-Agent'] = STANDARD_BROWSER_UA;
    for (const key of Object.keys(requestHeaders)) {
      if (key.toLowerCase() === 'sec-ch-ua') {
        requestHeaders[key] = STANDARD_SEC_CH_UA;
      } else if (/^sec-ch-ua/i.test(key) && typeof requestHeaders[key] === 'string') {
        requestHeaders[key] = requestHeaders[key]
          .replace(/"Electron";v="([^"]*)"/gi, `"Google Chrome";v="${CHROME_MAJOR_VERSION}"`)
          .replace(/,?\s*"klarity";v="[^"]*"/gi, '');
      }
    }
    if (browserRuntimePrefs.doNotTrack) {
      requestHeaders['DNT'] = '1';
      requestHeaders['Sec-GPC'] = '1';
    }
    if (browserRuntimePrefs.cookiePolicy === 'block_all') {
      delete requestHeaders['Cookie'];
      delete requestHeaders['cookie'];
    }
    callback({ requestHeaders });
  });

  browserSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    const responseHeaders = { ...(details.responseHeaders || {}) };
    if (browserRuntimePrefs.cookiePolicy === 'block_all') {
      delete responseHeaders['set-cookie'];
      delete responseHeaders['Set-Cookie'];
    } else if (browserRuntimePrefs.cookiePolicy === 'block_third_party' && details.resourceType !== 'mainFrame') {
      try {
        const reqHost = new URL(details.url).hostname;
        const refHost = details.referrer ? new URL(details.referrer).hostname : reqHost;
        if (reqHost && refHost && !reqHost.endsWith(refHost) && !refHost.endsWith(reqHost)) {
          delete responseHeaders['set-cookie'];
          delete responseHeaders['Set-Cookie'];
        }
      } catch {}
    }
    callback({ responseHeaders });
  });

  if (!browserDownloadsListenerAttached) {
    browserDownloadsListenerAttached = true;
    browserSession.on('will-download', (_event, item) => {
      const targetDir = browserRuntimePrefs.downloadPath || app.getPath('downloads');
      let savePath;
      if (browserRuntimePrefs.askWhereToSave && mainWindow && !mainWindow.isDestroyed()) {
        const chosen = dialog.showSaveDialogSync(mainWindow, {
          defaultPath: getUniqueDownloadPath(targetDir, item.getFilename())
        });
        if (!chosen) {
          item.cancel();
          return;
        }
        savePath = chosen;
      } else {
        savePath = getUniqueDownloadPath(targetDir, item.getFilename());
      }

      item.setSavePath(savePath);

      const downloadId = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const record = {
        id: downloadId,
        filename: path.basename(savePath),
        savePath,
        url: item.getURL() || '',
        mimeType: item.getMimeType() || '',
        totalBytes: item.getTotalBytes() || 0,
        receivedBytes: item.getReceivedBytes() || 0,
        state: 'progressing',
        startedAt: Date.now(),
        completedAt: null
      };

      browserDownloads = [record, ...browserDownloads].slice(0, MAX_BROWSER_DOWNLOADS);
      activeBrowserDownloadItems.set(downloadId, item);
      saveBrowserDownloads();
      broadcastBrowserDownloads();

      let lastBroadcastAt = Date.now();
      let lastBroadcastState = record.state;

      item.on('updated', (_e, state) => {
        record.receivedBytes = item.getReceivedBytes() || 0;
        record.totalBytes = item.getTotalBytes() || record.totalBytes;
        const nextState =
          state === 'interrupted' ? 'interrupted' : item.isPaused() ? 'paused' : 'progressing';
        record.state = nextState;
        const now = Date.now();
        if (nextState !== lastBroadcastState || now - lastBroadcastAt >= 150) {
          lastBroadcastState = nextState;
          lastBroadcastAt = now;
          broadcastBrowserDownloads();
        }
      });

      item.once('done', (_e, state) => {
        activeBrowserDownloadItems.delete(downloadId);
        record.receivedBytes = item.getReceivedBytes() || record.receivedBytes;
        record.totalBytes = item.getTotalBytes() || record.totalBytes;
        record.state =
          state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'interrupted';
        record.completedAt = Date.now();
        saveBrowserDownloads();
        broadcastBrowserDownloads();
      });
    });
  }

  const AD_BLOCK_DOMAINS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'ad.youtube.com', 'adservice.google.com', 'pagead2.googlesyndication.com',
    'stats.g.doubleclick.net', 'adclick.g.doubleclick.net', 'video-stats.l.google.com',
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
    /\/telemetry\./i,
    /\/api\/stats\/ads/i,
    /\/youtubei\/v1\/player\/ad_break/i,
    /\/youtubei\/v1\/ad_break/i,
    /\/ptracking/i,
    /\/get_midroll_info/i
  ];

  browserSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (!adBlockerEnabled || details.resourceType === 'mainFrame') {
      return callback({ cancel: false });
    }
    try {
      const parsedUrl = new URL(details.url);
      const host = parsedUrl.hostname.toLowerCase();
      const urlPath = parsedUrl.pathname + parsedUrl.search;

      // EXPLICIT WHITELIST: Always allow YouTube timedtext / subtitles / captions, video playback, and player core scripts
      if (
        host.includes('youtube.com') ||
        host.includes('googlevideo.com') ||
        host.includes('ytimg.com')
      ) {
        if (
          urlPath.includes('timedtext') ||
          urlPath.includes('caption') ||
          urlPath.includes('subtitle') ||
          urlPath.includes('/videoplayback') ||
          urlPath.includes('/player') ||
          urlPath.includes('/watch') ||
          urlPath.includes('/initplayback')
        ) {
          return callback({ cancel: false });
        }
      }

      // Check known ad network domains
      const isAdDomain = AD_BLOCK_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
      if (isAdDomain) {
        browserAdsBlockedCount++;
        broadcastAdBlockStats();
        return callback({ cancel: true });
      }

      // Check ad URL patterns
      const isAdPattern = AD_BLOCK_PATTERNS.some(regex => regex.test(urlPath));
      if (isAdPattern) {
        browserAdsBlockedCount++;
        broadcastAdBlockStats();
        return callback({ cancel: true });
      }
    } catch {}

    callback({ cancel: false });
  });

  let winWidth = 1400;
  let winHeight = 900;
  try {
    const workArea = screen.getPrimaryDisplay()?.workAreaSize;
    if (workArea?.width && workArea?.height) {
      winWidth = Math.min(1400, Math.max(760, workArea.width - 24));
      winHeight = Math.min(900, Math.max(540, workArea.height - 24));
    }
  } catch {}

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 720,
    minHeight: 500,
    title: 'Klarity Finance — Private Financial & Password Suite',
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
      webviewTag: true,
      backgroundThrottling: true
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

  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences) => {
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.partition = 'persist:klarity_browser';
    webPreferences.preload = path.join(__dirname, 'browserGuestPreload.js');
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { action: 'deny' };
      }
      const host = parsed.hostname.toLowerCase();
      if (
        (parsed.protocol === 'http:' && (host === '127.0.0.1' || host === 'localhost')) ||
        (parsed.protocol === 'https:' && (host === 'plaid.com' || host.endsWith('.plaid.com')))
      ) {
        return { action: 'allow' };
      }
      shell.openExternal(parsed.toString());
    } catch {}
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://localhost:${port}`);

  setupAutoUpdater();

  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      checkForGitHubUpdate({ manual: false }).catch(() => {});
    }, 1000);
  });

  mainWindow.on('focus', () => triggerThrottledAutoUpdateCheck(30 * 1000));
  mainWindow.on('restore', () => triggerThrottledAutoUpdateCheck(15 * 1000));
  mainWindow.on('show', () => triggerThrottledAutoUpdateCheck(15 * 1000));

  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    triggerThrottledAutoUpdateCheck(60 * 1000);
  }, 2 * 60 * 1000);
}

// Native Desktop Google Sign-In (RFC 8252 Loopback + Secret-Free OIDC id_token via Default System Browser)
ipcMain.handle('klarity:google-sign-in', async () => {
  const sid = 'dsk-' + Date.now() + '-' + crypto.randomBytes(6).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    '207624653160-vbp60vuujhl2h8jshvnosad9m2ft75jq.apps.googleusercontent.com';
  const port = localServerPort || 5173;
  const redirectUri = `http://localhost:${port}/api/auth/google/callback`;

  try {
    const initRes = await fetch(`http://localhost:${port}/api/auth/google/init-desktop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-klarity-desktop-secret': DESKTOP_IPC_SECRET
      },
      body: JSON.stringify({ sid, nonce })
    });
    if (!initRes.ok) {
      return { ok: false, error: 'Failed to initialize desktop Google Sign-In session.' };
    }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not reach local auth server.' };
  }

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=id_token&scope=openid%20profile%20email` +
    `&state=${encodeURIComponent(sid)}&nonce=${encodeURIComponent(nonce)}&prompt=select_account`;

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
  version: getRunningAppVersion(),
  userDataDir: app.getPath('userData'),
  repo: 'ByZizo/Klarity',
  updateStatus: updateStatusState,
  hardware: getHardwareProfile()
}));

ipcMain.handle('klarity:check-for-updates', async (_e, opts) => {
  return await checkForGitHubUpdate({ manual: Boolean(opts?.manual) });
});

ipcMain.handle('klarity:install-update-now', async () => {
  const repoDir = path.join(__dirname, '..');
  try {
    broadcastUpdateStatus({
      state: 'installing',
      message: 'Downloading latest update & rebuilding Klarity...'
    });

    if (app.isPackaged && autoUpdater) {
      if (updateStatusState.state === 'ready') {
        saveWhatsNewData(updateStatusState.recentChanges || [], updateStatusState.latestVersion || getRunningAppVersion(), updateStatusState.latestVersion);
        autoUpdater.quitAndInstall(false, true);
        return { ok: true };
      }
      pendingPackagedAutoInstall = true;
      await autoUpdater.checkForUpdates();
      return { ok: true, downloading: true };
    }

    // Capture previous HEAD SHA before updating to extract exact incoming commits
    const previousSha = await runShell('git rev-parse HEAD', repoDir).catch(() => '');

    // Safety backup of local data so user data is never lost across git resets or updates
    const localDataPath = path.join(repoDir, 'server', 'data.json');
    let localDataBackup = null;
    if (fs.existsSync(localDataPath)) {
      try {
        localDataBackup = fs.readFileSync(localDataPath, 'utf8');
      } catch {}
    }

    // Pull complete latest code in a single step (handles skipping multiple versions seamlessly)
    try {
      await runShell('git fetch origin main --quiet', repoDir);
    } catch {
      await runShell('git fetch origin main --unshallow --quiet', repoDir).catch(() => {});
    }
    await runShell('git reset --hard origin/main', repoDir);

    // Restore user data if it existed so user data is permanently preserved across updates
    if (localDataBackup) {
      try {
        fs.writeFileSync(localDataPath, localDataBackup, 'utf8');
      } catch {}
    }

    // Rebuild client so frontend reflects new code (install missing dependencies if multi-version jump added packages)
    try {
      await runShell('npm --prefix client run build', repoDir);
    } catch (bErr) {
      console.warn('Frontend rebuild during update note, attempting dependency install first:', bErr.message);
      try {
        await runShell('npm --prefix client install --prefer-offline --no-audit', repoDir);
        await runShell('npm --prefix client run build', repoDir);
      } catch (iErr) {
        console.error('Frontend build after install failed:', iErr.message);
      }
    }

    const newSha = await runShell('git rev-parse HEAD', repoDir).catch(() => 'latest');

    // Gather strictly the single latest update that was just applied (never previous version history)
    let recentChanges = [];
    try {
      const headLog = await runShell('git log -1 --pretty=format:"%s" HEAD', repoDir);
      if (headLog) {
        recentChanges = [headLog.trim()];
      }
    } catch {}

    if (recentChanges.length === 0 && updateStatusState.recentChanges?.length > 0) {
      recentChanges = [updateStatusState.recentChanges[0]];
    }

    let updatedVersion = null;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
      if (pkg && pkg.version) updatedVersion = pkg.version;
    } catch {}

    // Save What's New data to userDataDir so the pop-up appears on restart
    saveWhatsNewData(recentChanges, newSha ? newSha.slice(0, 7) : app.getVersion(), updatedVersion);

    // Update installed_version.json to the new version and SHA
    const versionFile = path.join(app.getPath('userData'), 'installed_version.json');
    try {
      fs.writeFileSync(versionFile, JSON.stringify({
        version: updatedVersion || app.getVersion(),
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
        try {
          fs.writeFileSync(whatsNewFile, JSON.stringify({ ...data, shown: true }, null, 2), 'utf8');
        } catch {}
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
  broadcastAdBlockStats(true);
  return {
    adsBlockedCount: browserAdsBlockedCount,
    enabled: adBlockerEnabled
  };
});

ipcMain.handle('klarity:browser-reset-adblock-count', () => {
  browserAdsBlockedCount = 0;
  broadcastAdBlockStats(true);
  return {
    adsBlockedCount: browserAdsBlockedCount,
    enabled: adBlockerEnabled
  };
});

ipcMain.handle('klarity:browser-clear-data', async () => {
  try {
    const browserSession = session.fromPartition('persist:klarity_browser');
    await browserSession.clearCache();
    await browserSession.clearStorageData();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('klarity:browser-get-prefs', () => {
  return browserRuntimePrefs;
});

ipcMain.handle('klarity:browser-update-prefs', (_e, nextPrefs) => {
  return saveBrowserRuntimePrefs(nextPrefs || {});
});

ipcMain.handle('klarity:browser-get-sponsor-segments', async (_e, videoId) => {
  if (!videoId || typeof videoId !== 'string') return [];
  try {
    const hash = crypto.createHash('sha256').update(videoId).digest('hex').slice(0, 4);
    const res = await fetch(`https://sponsor.ajay.app/api/skipSegments/${hash}?service=YouTube&categories=["sponsor","selfpromo","interaction","intro","outro"]&actionTypes=["skip"]`, {
      headers: { 'User-Agent': 'KlarityBrowser/1.0' }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const match = data.find(item => item.videoID === videoId);
        if (match && Array.isArray(match.segments)) {
          return match.segments;
        }
      }
    }
  } catch (err) {
    console.warn('SponsorBlock error:', err.message);
  }
  return [];
});

ipcMain.handle('klarity:browser-get-dearrow-branding', async (_e, videoId) => {
  if (!videoId || typeof videoId !== 'string') return null;
  try {
    const res = await fetch(`https://sponsor.ajay.app/api/branding?videoID=${encodeURIComponent(videoId)}`, {
      headers: { 'User-Agent': 'KlarityBrowser/1.0' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.titles) && data.titles.length > 0) {
        const cleanTitle = data.titles.find(t => !t.original) || data.titles[0];
        return {
          title: cleanTitle?.title || null,
          thumbnailTimestamp: data.thumbnails?.[0]?.timestamp || null
        };
      }
    }
  } catch (err) {
    console.warn('DeArrow error:', err.message);
  }
  return null;
});

ipcMain.handle('klarity:browser-select-download-dir', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Default Download Folder',
    defaultPath: browserRuntimePrefs.downloadPath || app.getPath('downloads'),
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }
  const updated = saveBrowserRuntimePrefs({ downloadPath: result.filePaths[0] });
  return { canceled: false, downloadPath: updated.downloadPath };
});

function findExistingBrowserDownload(id) {
  const record = browserDownloads.find((d) => d.id === id);
  if (!record || !record.savePath || !fs.existsSync(record.savePath)) {
    broadcastBrowserDownloads();
    return null;
  }
  return record;
}

ipcMain.handle('klarity:browser-get-downloads', () => {
  return getSerializedBrowserDownloads();
});

ipcMain.handle('klarity:browser-open-download', async (_e, id) => {
  const record = findExistingBrowserDownload(id);
  if (!record) return { ok: false, error: 'File not found' };
  const errMsg = await shell.openPath(record.savePath);
  return { ok: !errMsg, error: errMsg || null };
});

ipcMain.handle('klarity:browser-show-download', (_e, id) => {
  const record = findExistingBrowserDownload(id);
  if (!record) return { ok: false, error: 'File not found' };
  shell.showItemInFolder(record.savePath);
  return { ok: true };
});

ipcMain.handle('klarity:browser-open-downloads-folder', async () => {
  const targetDir = ensureDownloadDirectory(browserRuntimePrefs.downloadPath || app.getPath('downloads'));
  const errMsg = await shell.openPath(targetDir);
  return { ok: !errMsg, error: errMsg || null };
});

ipcMain.handle('klarity:browser-cancel-download', (_e, id) => {
  const item = activeBrowserDownloadItems.get(id);
  if (item && typeof item.cancel === 'function') {
    try {
      item.cancel();
    } catch {}
  }
  return { ok: true };
});

ipcMain.handle('klarity:browser-remove-download', (_e, id) => {
  const item = activeBrowserDownloadItems.get(id);
  if (item && typeof item.cancel === 'function') {
    try {
      item.cancel();
    } catch {}
    activeBrowserDownloadItems.delete(id);
  }
  browserDownloads = browserDownloads.filter((d) => d.id !== id);
  saveBrowserDownloads();
  broadcastBrowserDownloads();
  return getSerializedBrowserDownloads();
});

ipcMain.handle('klarity:browser-clear-downloads', () => {
  browserDownloads = browserDownloads.filter((d) => d.state === 'progressing' || d.state === 'paused');
  saveBrowserDownloads();
  broadcastBrowserDownloads();
  return getSerializedBrowserDownloads();
});

ipcMain.handle('klarity:set-theme-source', (_e, mode) => {
  const validModes = ['light', 'dark', 'system'];
  if (!validModes.includes(mode)) {
    return { ok: false, error: 'Invalid theme mode' };
  }
  try {
    if (nativeTheme) nativeTheme.themeSource = mode;
    return { ok: true, themeSource: mode };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

function isOAuthOrPopupUrl(rawUrl, disposition) {
  if (!rawUrl) return false;
  if (disposition === 'new-window') return true;
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    const full = (u.hostname + u.pathname + u.search).toLowerCase();
    if (
      host === 'accounts.google.com' ||
      host.endsWith('.google.com') && /\/o\/oauth|\/signin|\/v3\/signin|\/servicelogin/i.test(u.pathname) ||
      host === 'login.microsoftonline.com' ||
      host === 'login.live.com' ||
      host === 'appleid.apple.com' ||
      (host === 'github.com' && u.pathname.startsWith('/login')) ||
      /\/oauth2?\/|\/authorize\b|\/auth\/|sso|openid/i.test(full)
    ) {
      return true;
    }
  } catch {}
  return false;
}

function openBrowserAuthWindow(targetUrl) {
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return { ok: false, error: 'Invalid URL' };
  }
  const authWin = new BrowserWindow({
    width: 540,
    height: 700,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
    center: true,
    autoHideMenuBar: true,
    title: 'Sign In — Klarity Browser',
    icon: path.join(__dirname, 'klarity.ico'),
    webPreferences: {
      partition: 'persist:klarity_browser',
      preload: path.join(__dirname, 'browserGuestPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  let latestAuthUrl = targetUrl;
  const trackAuthNav = (_e, navUrl) => {
    if (navUrl && /^https?:\/\//i.test(navUrl)) {
      latestAuthUrl = navUrl;
    }
  };
  authWin.webContents.on('did-navigate', trackAuthNav);
  authWin.webContents.on('did-navigate-in-page', trackAuthNav);

  authWin.webContents.setUserAgent(STANDARD_BROWSER_UA);
  authWin.loadURL(targetUrl).catch(() => {});

  authWin.on('closed', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('klarity:browser-auth-window-closed', {
        url: targetUrl,
        finalUrl: latestAuthUrl
      });
    }
  });

  return { ok: true };
}

ipcMain.on('klarity:guest-login-detected', (_event, candidate) => {
  if (!candidate || !candidate.password) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('klarity:browser-login-detected', candidate);
  }
});

ipcMain.handle('klarity:browser-open-auth-window', (_e, url) => {
  return openBrowserAuthWindow(url);
});

ipcMain.handle('klarity:browser-open-external', async (_e, url) => {
  if (!url || !/^https?:\/\//i.test(String(url))) {
    return { ok: false, error: 'Invalid URL' };
  }
  await shell.openExternal(String(url));
  return { ok: true };
});

ipcMain.handle('klarity:browser-capture-rect', async (_e, rect) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, error: 'Desktop window unavailable' };
  }
  try {
    const cleanRect =
      rect &&
      Number.isFinite(rect.x) &&
      Number.isFinite(rect.y) &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width > 2 &&
      rect.height > 2
        ? {
            x: Math.max(0, Math.round(rect.x)),
            y: Math.max(0, Math.round(rect.y)),
            width: Math.max(1, Math.round(rect.width)),
            height: Math.max(1, Math.round(rect.height))
          }
        : undefined;
    const img = await mainWindow.webContents.capturePage(cleanRect);
    if (!img || img.isEmpty()) {
      return { ok: false, error: 'Captured image was empty' };
    }
    return { ok: true, dataUrl: img.toDataURL() };
  } catch (err) {
    return { ok: false, error: err?.message || 'Capture failed' };
  }
});

ipcMain.handle('klarity:browser-copy-image-data-url', (_e, dataUrl) => {
  try {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return { ok: false, error: 'Invalid image data' };
    }
    const img = nativeImage.createFromDataURL(dataUrl);
    if (img.isEmpty()) return { ok: false, error: 'Empty image' };
    clipboard.writeImage(img);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Clipboard copy failed' };
  }
});

// Ensure embedded <webview> instances use a standard desktop UA and support OAuth popups + target=_blank tabs cleanly
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setUserAgent(STANDARD_BROWSER_UA);
    contents.on('did-attach', () => {
      try {
        contents.setUserAgent(STANDARD_BROWSER_UA);
      } catch {}
    });
    contents.setWindowOpenHandler(({ url, disposition }) => {
      if (!url || !/^https?:\/\//i.test(url)) {
        return { action: 'deny' };
      }
      // Allow real OAuth / sign-in popups in a child BrowserWindow sharing persist:klarity_browser so window.opener works
      if (isOAuthOrPopupUrl(url, disposition)) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 520,
            height: 680,
            parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
            center: true,
            autoHideMenuBar: true,
            icon: path.join(__dirname, 'klarity.ico'),
            webPreferences: {
              partition: 'persist:klarity_browser',
              preload: path.join(__dirname, 'browserGuestPreload.js'),
              contextIsolation: true,
              nodeIntegration: false,
              sandbox: true
            }
          }
        };
      }
      // Open regular target=_blank links cleanly as a new tab inside Klarity Browser
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('klarity:browser-open-tab', { url });
      } else {
        contents.loadURL(url);
      }
      return { action: 'deny' };
    });

    contents.on('did-create-window', (childWin) => {
      try {
        childWin.webContents.setUserAgent(STANDARD_BROWSER_UA);
      } catch {}
    });
  }
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
