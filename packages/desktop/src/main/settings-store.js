const Store = require('electron-store');
const path = require('path');
const { app } = require('electron');

let store = null;

/**
 * Initialize the settings store.
 * Must be called after app.whenReady()
 */
function initSettingsStore() {
  store = new Store({
    name: 'settings',
    defaults: {
      outputDir: path.join(app.getPath('documents'), 'DocRecorder'),
      viewport: { width: 1680, height: 950 },
      viewportPresets: [
        { name: 'WSXGA+ (1680x950)', width: 1680, height: 950 },
        { name: 'Full HD (1920x980)', width: 1920, height: 980 },
        { name: 'HD (1280x620)', width: 1280, height: 620 },
        { name: 'Mobile (375x667)', width: 375, height: 667 },
        { name: 'Mobile Landscape (667x375)', width: 667, height: 375 },
        { name: 'Tablet (768x1024)', width: 768, height: 1024 },
        { name: 'Tablet Landscape (1024x768)', width: 1024, height: 768 }
      ],
      recentUrls: [],
      windowBounds: { width: 1400, height: 900 },
      separator: '---',
      showLog: false,
      showShortcuts: true,
      injectCSS: false,
      customCSS: '',
      lastOpenedProjectId: null
    }
  });
  return store;
}

/**
 * Get the settings store instance.
 * @returns {Store} Electron store instance
 */
function getSettingsStore() {
  if (!store) {
    throw new Error('Settings store not initialized. Call initSettingsStore() first.');
  }
  return store;
}

/**
 * Add a URL to recent URLs list (max 10)
 * @param {string} url - URL to add
 */
function addRecentUrl(url) {
  const store = getSettingsStore();
  const recent = store.get('recentUrls', []);
  const filtered = recent.filter(u => u !== url);
  filtered.unshift(url);
  store.set('recentUrls', filtered.slice(0, 10));
}

/**
 * Get the last opened project ID
 * @returns {string|null}
 */
function getLastOpenedProjectId() {
  const store = getSettingsStore();
  return store.get('lastOpenedProjectId', null);
}

/**
 * Set the last opened project ID
 * @param {string|null} projectId
 */
function setLastOpenedProjectId(projectId) {
  const store = getSettingsStore();
  store.set('lastOpenedProjectId', projectId);
}

module.exports = {
  initSettingsStore,
  getSettingsStore,
  addRecentUrl,
  getLastOpenedProjectId,
  setLastOpenedProjectId
};
