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
      viewport: { width: 1280, height: 720 },
      viewportPresets: [
        { name: 'HD (1280x720)', width: 1280, height: 720 },
        { name: 'Full HD (1920x1080)', width: 1920, height: 1080 },
        { name: 'Mobile (375x667)', width: 375, height: 667 },
        { name: 'Tablet (768x1024)', width: 768, height: 1024 }
      ],
      recentUrls: [],
      windowBounds: { width: 1400, height: 900 }
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

module.exports = {
  initSettingsStore,
  getSettingsStore,
  addRecentUrl
};
