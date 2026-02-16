const { autoUpdater } = require('electron-updater');
const { ipcMain, app } = require('electron');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.forceDevUpdateConfig = !app.isPackaged;

function initAutoUpdater(mainWindow) {
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
