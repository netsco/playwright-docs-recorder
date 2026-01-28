const { ipcMain, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { getSettingsStore, addRecentUrl } = require('./settings-store');
const {
  saveRecording,
  saveScreenshot,
  loadHistory,
  addToHistory,
  deleteRecording,
  loadRecording
} = require('./file-manager');

// Current recording state
let currentRecording = null;

/**
 * Register all IPC handlers for the main process.
 */
function registerIpcHandlers() {
  // ===== Recording Controls =====

  ipcMain.handle('start-recording', async (event, url, options = {}) => {
    const settings = getSettingsStore();

    currentRecording = {
      id: Date.now().toString(),
      title: options.title || null,
      url: url,
      viewport: options.viewport || settings.get('viewport'),
      actions: [],
      screenshots: [],
      screenshotCounter: 0,
      startTime: new Date().toISOString()
    };

    addRecentUrl(url);

    console.log(`Started recording: ${url}`);
    return { success: true, id: currentRecording.id };
  });

  ipcMain.handle('stop-recording', async () => {
    if (!currentRecording) {
      return { success: false, error: 'No recording in progress' };
    }

    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    try {
      const paths = saveRecording(outputDir, currentRecording);
      addToHistory(outputDir, currentRecording);

      console.log(`Saved recording: ${paths.recordingDir}`);

      const result = {
        success: true,
        recording: {
          id: currentRecording.id,
          title: currentRecording.title,
          actionCount: currentRecording.actions.length,
          screenshotCount: currentRecording.screenshots.length,
          paths
        }
      };

      currentRecording = null;
      return result;
    } catch (error) {
      console.error('Failed to save recording:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-recording-status', () => {
    if (!currentRecording) {
      return { recording: false };
    }
    return {
      recording: true,
      id: currentRecording.id,
      actionCount: currentRecording.actions.length,
      screenshotCount: currentRecording.screenshots.length
    };
  });

  // ===== Action Recording =====

  ipcMain.on('record-action', (event, action) => {
    if (!currentRecording) return;

    currentRecording.actions.push(action);
    console.log(`Recorded: ${action.type} - ${action.selector || action.url || ''}`);

    // Notify renderer of the new action
    event.sender.send('action-recorded', action);
  });

  // ===== Screenshot Capture =====

  ipcMain.handle('capture-screenshot', async (event, { selector, note, imageDataUrl }) => {
    if (!currentRecording) {
      return { success: false, error: 'No recording in progress' };
    }

    try {
      currentRecording.screenshotCounter++;
      const filename = `screenshot-${String(currentRecording.screenshotCounter).padStart(3, '0')}.png`;

      const settings = getSettingsStore();
      const outputDir = settings.get('outputDir');
      const screenshotsDir = path.join(outputDir, currentRecording.id, 'screenshots');

      // Convert data URL to buffer
      const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const filepath = saveScreenshot(screenshotsDir, filename, imageBuffer);

      const screenshotData = { filename, highlight: selector, note };
      currentRecording.screenshots.push(screenshotData);
      currentRecording.actions.push({ type: 'screenshot', ...screenshotData });

      console.log(`Screenshot: ${filename}${selector ? ` [${selector}]` : ''}${note ? ` - ${note}` : ''}`);

      return { success: true, filename, filepath };
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== History Management =====

  ipcMain.handle('get-history', () => {
    const settings = getSettingsStore();
    return loadHistory(settings.get('outputDir'));
  });

  ipcMain.handle('load-recording', (event, recordingId) => {
    const settings = getSettingsStore();
    return loadRecording(settings.get('outputDir'), recordingId);
  });

  ipcMain.handle('delete-recording', (event, recordingId) => {
    const settings = getSettingsStore();
    try {
      deleteRecording(settings.get('outputDir'), recordingId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ===== Settings =====

  ipcMain.handle('get-settings', () => {
    const settings = getSettingsStore();
    return {
      outputDir: settings.get('outputDir'),
      viewport: settings.get('viewport'),
      viewportPresets: settings.get('viewportPresets'),
      recentUrls: settings.get('recentUrls')
    };
  });

  ipcMain.handle('save-settings', (event, newSettings) => {
    const settings = getSettingsStore();
    if (newSettings.outputDir) settings.set('outputDir', newSettings.outputDir);
    if (newSettings.viewport) settings.set('viewport', newSettings.viewport);
    return { success: true };
  });

  ipcMain.handle('select-output-dir', async () => {
    const settings = getSettingsStore();
    const result = await dialog.showOpenDialog({
      defaultPath: settings.get('outputDir'),
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      settings.set('outputDir', result.filePaths[0]);
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
  });

  // ===== Utility =====

  ipcMain.handle('open-recording-folder', async (event, recordingId) => {
    const settings = getSettingsStore();
    const recordingDir = path.join(settings.get('outputDir'), recordingId);
    const { shell } = require('electron');
    await shell.openPath(recordingDir);
    return { success: true };
  });
}

module.exports = { registerIpcHandlers };
