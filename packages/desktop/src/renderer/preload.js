const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  // App version from package.json
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Get webview preload path (file:/// with three slashes for Windows)
  getWebviewPreloadPath: () => {
    const p = path.join(__dirname, '../webview/webview-preload.js').replace(/\\/g, '/');
    return `file:///${p}`;
  },

  // ===== Project Management =====
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (options) => ipcRenderer.invoke('create-project', options),
  updateProject: (projectId, updates) => ipcRenderer.invoke('update-project', projectId, updates),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),
  getProject: (projectId) => ipcRenderer.invoke('get-project', projectId),
  getProjectRecordings: (projectId) => ipcRenderer.invoke('get-project-recordings', projectId),
  moveRecording: (recordingId, fromProjectId, toProjectId) =>
    ipcRenderer.invoke('move-recording', recordingId, fromProjectId, toProjectId),
  setLastOpenedProject: (projectId) => ipcRenderer.invoke('set-last-opened-project', projectId),
  openProjectFolder: (projectId) => ipcRenderer.invoke('open-project-folder', projectId),
  exportProject: (projectId) => ipcRenderer.invoke('export-project', projectId),
  importProject: () => ipcRenderer.invoke('import-project'),
  getRefetchQueue: (projectId) => ipcRenderer.invoke('get-refetch-queue', projectId),

  // ===== Recording controls =====
  startRecording: (url, options) => ipcRenderer.invoke('start-recording', url, options),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  getRecordingStatus: () => ipcRenderer.invoke('get-recording-status'),

  // Action recording (called from webview via message passing or directly)
  recordAction: (action) => {
    ipcRenderer.send('record-action', action);
    return Promise.resolve({ success: true });
  },

  // Screenshot capture
  captureScreenshot: (data) => ipcRenderer.invoke('capture-screenshot', data),

  // ===== Recordings (now project-aware) =====
  loadRecording: (id, projectId) => ipcRenderer.invoke('load-recording', id, projectId),
  deleteRecording: (id, projectId) => ipcRenderer.invoke('delete-recording', id, projectId),
  openRecordingFolder: (id, projectId) => ipcRenderer.invoke('open-recording-folder', id, projectId),

  // ===== Markdown Editor =====
  getRecordingMarkdown: (id, projectId) => ipcRenderer.invoke('get-recording-markdown', id, projectId),
  saveRecordingMarkdown: (id, content, projectId) => ipcRenderer.invoke('save-recording-markdown', id, content, projectId),

  // ===== Refetch =====
  saveRefetchedScreenshot: (data) => ipcRenderer.invoke('save-refetched-screenshot', data),
  regenerateMarkdown: (id, projectId) => ipcRenderer.invoke('regenerate-markdown', id, projectId),

  // ===== Screenshot Editor =====
  getScreenshotPath: (recordingId, filename, projectId) =>
    ipcRenderer.invoke('get-screenshot-path', recordingId, filename, projectId),
  saveScreenshotEdits: (data) => ipcRenderer.invoke('save-screenshot-edits', data),
  resetScreenshotToOriginal: (data) => ipcRenderer.invoke('reset-screenshot-to-original', data),

  // ===== Settings =====
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  selectCssFile: () => ipcRenderer.invoke('select-css-file'),
  selectProjectFolder: () => ipcRenderer.invoke('select-project-folder'),

  // ===== Event listeners =====
  onActionRecorded: (callback) => {
    ipcRenderer.on('action-recorded', (event, action) => callback(action));
  },
  onScreenshotTaken: (callback) => {
    ipcRenderer.on('screenshot-taken', (event, data) => callback(data));
  },

  // ===== Auto-updater =====
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', () => callback());
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => callback(progress));
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, message) => callback(message));
  }
});
