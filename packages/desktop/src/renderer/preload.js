const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  // Get webview preload path (file:/// with three slashes for Windows)
  getWebviewPreloadPath: () => {
    const p = path.join(__dirname, '../webview/webview-preload.js').replace(/\\/g, '/');
    return `file:///${p}`;
  },

  // Recording controls
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

  // History
  getHistory: () => ipcRenderer.invoke('get-history'),
  loadRecording: (id) => ipcRenderer.invoke('load-recording', id),
  deleteRecording: (id) => ipcRenderer.invoke('delete-recording', id),
  openRecordingFolder: (id) => ipcRenderer.invoke('open-recording-folder', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),

  // Event listeners
  onActionRecorded: (callback) => {
    ipcRenderer.on('action-recorded', (event, action) => callback(action));
  },
  onScreenshotTaken: (callback) => {
    ipcRenderer.on('screenshot-taken', (event, data) => callback(data));
  }
});
