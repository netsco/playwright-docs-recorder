const { autoUpdater } = require('electron-updater');
const { ipcMain, app, net, shell } = require('electron');

// macOS auto-update via Squirrel.Mac requires a code-signed + notarized build
// and a zip target. The published builds are unsigned, so electron-updater
// cannot install updates on macOS. Instead we do a lightweight version check
// against the GitHub releases API and direct the user to download manually.
const isMac = process.platform === 'darwin';
const REPO = 'netsco/playwright-docs-recorder';
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.forceDevUpdateConfig = !app.isPackaged;

// Returns true when `remote` is a strictly higher version than `local`.
function isNewer(remote, local) {
  const parse = (v) =>
    String(v)
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const r = parse(remote);
  const l = parse(local);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const a = r[i] || 0;
    const b = l[i] || 0;
    if (a !== b) return a > b;
  }
  return false;
}

// Fetch the latest published release tag from GitHub (drafts/prereleases excluded
// by the /releases/latest endpoint).
function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const request = net.request({ url: LATEST_API });
    request.setHeader('User-Agent', 'doc-recorder-updater');
    request.setHeader('Accept', 'application/vnd.github+json');
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`GitHub API returned ${response.statusCode}`));
        response.resume();
        return;
      }
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({
            version: String(data.tag_name || '').replace(/^v/, ''),
            releaseNotes: data.body || '',
          });
        } catch (err) {
          reject(err);
        }
      });
    });
    request.on('error', reject);
    request.end();
  });
}

async function checkForUpdatesMac(mainWindow) {
  try {
    const { version, releaseNotes } = await fetchLatestRelease();
    if (version && isNewer(version, app.getVersion())) {
      mainWindow.webContents.send('update-available', {
        version,
        releaseNotes,
        manual: true,
        downloadUrl: RELEASES_PAGE,
      });
    } else {
      mainWindow.webContents.send('update-not-available');
    }
  } catch (err) {
    mainWindow.webContents.send('update-error', err?.message || String(err));
  }
}

function initAutoUpdater(mainWindow) {
  if (isMac) {
    ipcMain.handle('check-for-updates', () => checkForUpdatesMac(mainWindow));
    // No in-app download/install on macOS — open the releases page instead.
    ipcMain.handle('download-update', () => shell.openExternal(RELEASES_PAGE));
    ipcMain.handle('install-update', () => shell.openExternal(RELEASES_PAGE));

    // Background check on startup; ignore failures (offline, etc.).
    checkForUpdatesMac(mainWindow).catch(() => {});
    return;
  }

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('download-progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-downloaded');
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-not-available');
  });

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update-error', err?.message || String(err));
  });

  ipcMain.handle('download-update', () => {
    return autoUpdater.downloadUpdate();
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle('check-for-updates', () => {
    return autoUpdater.checkForUpdates();
  });

  autoUpdater.checkForUpdates().catch(() => {
    // Silently ignore errors on startup (e.g. no internet, dev mode)
  });
}

module.exports = { initAutoUpdater };
