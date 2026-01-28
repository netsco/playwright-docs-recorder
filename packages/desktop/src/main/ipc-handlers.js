const { ipcMain, dialog } = require('electron');
const path = require('path');
const { getSettingsStore, addRecentUrl } = require('./settings-store');
const {
  saveRecording,
  saveScreenshot,
  loadHistory,
  addToHistory,
  deleteRecording,
  loadRecording,
  loadRecordingMarkdown,
  saveRecordingMarkdown
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
      recordActions: options.recordActions !== false, // default true
      customCSS: options.customCSS || null,
      actions: [],
      screenshots: [],
      screenshotCounter: 0,
      startTime: new Date().toISOString()
    };

    addRecentUrl(url);

    const mode = currentRecording.recordActions ? 'full recording' : 'screenshots-only';
    console.log(`Started ${mode}: ${url}`);
    return { success: true, id: currentRecording.id, recordActions: currentRecording.recordActions };
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

    // If recordActions is false, only record goto, screenshot, and note actions
    if (!currentRecording.recordActions) {
      if (!['goto', 'screenshot', 'note'].includes(action.type)) {
        return; // Skip click/fill actions in screenshots-only mode
      }
    }

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
      recentUrls: settings.get('recentUrls'),
      separator: settings.get('separator'),
      showLog: settings.get('showLog'),
      showShortcuts: settings.get('showShortcuts'),
      injectCSS: settings.get('injectCSS'),
      customCSS: settings.get('customCSS')
    };
  });

  ipcMain.handle('save-settings', (event, newSettings) => {
    const settings = getSettingsStore();
    if (newSettings.outputDir !== undefined) settings.set('outputDir', newSettings.outputDir);
    if (newSettings.viewport !== undefined) settings.set('viewport', newSettings.viewport);
    if (newSettings.separator !== undefined) settings.set('separator', newSettings.separator);
    if (newSettings.showLog !== undefined) settings.set('showLog', newSettings.showLog);
    if (newSettings.showShortcuts !== undefined) settings.set('showShortcuts', newSettings.showShortcuts);
    if (newSettings.injectCSS !== undefined) settings.set('injectCSS', newSettings.injectCSS);
    if (newSettings.customCSS !== undefined) settings.set('customCSS', newSettings.customCSS);
    return { success: true };
  });

  // ===== Markdown Editor =====

  ipcMain.handle('get-recording-markdown', (event, recordingId) => {
    const settings = getSettingsStore();
    return loadRecordingMarkdown(settings.get('outputDir'), recordingId);
  });

  ipcMain.handle('save-recording-markdown', (event, recordingId, content) => {
    const settings = getSettingsStore();
    return saveRecordingMarkdown(settings.get('outputDir'), recordingId, content);
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

  ipcMain.handle('select-css-file', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'CSS Files', extensions: ['css'] }],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const fs = require('fs');
      try {
        const content = fs.readFileSync(result.filePaths[0], 'utf8');
        return { success: true, content, path: result.filePaths[0] };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false };
  });

  // ===== Refetch =====

  ipcMain.handle('save-refetched-screenshot', async (event, { recordingId, filename, imageDataUrl }) => {
    const settings = getSettingsStore();
    const screenshotsDir = path.join(settings.get('outputDir'), recordingId, 'screenshots');

    try {
      // Convert data URL to buffer
      const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      saveScreenshot(screenshotsDir, filename, imageBuffer);
      return { success: true };
    } catch (error) {
      console.error('Failed to save refetched screenshot:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('regenerate-markdown', async (event, recordingId) => {
    const settings = getSettingsStore();
    const recordingDir = path.join(settings.get('outputDir'), recordingId);
    const actionsPath = path.join(recordingDir, 'actions.json');

    try {
      const fs = require('fs');
      const recording = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
      const { generateMarkdown } = require('@doc-recorder/shared');

      const actions = recording.screenshots || recording.actions.filter(a => a.type === 'screenshot');
      const markdown = generateMarkdown({
        title: recording.title,
        actions,
        separator: recording.separator
      });

      const mdFilename = recording.mdFilename || 'screenshots.md';
      fs.writeFileSync(path.join(recordingDir, mdFilename), markdown);

      return { success: true };
    } catch (error) {
      console.error('Failed to regenerate markdown:', error);
      return { success: false, error: error.message };
    }
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
