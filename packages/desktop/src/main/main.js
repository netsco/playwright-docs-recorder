const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc-handlers');
const { initSettingsStore, getSettingsStore } = require('./settings-store');
const { initAutoUpdater } = require('./auto-updater');

let mainWindow;

function createWindow() {
  const settings = getSettingsStore();
  const windowBounds = settings.get('windowBounds', { width: 1400, height: 900 });

  const windowOptions = {
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,  // Required for Node.js modules in preload
      webviewTag: true
    },
    icon: path.join(__dirname, '../../assets/icons/icon.ico'),
    title: 'Documentation Recorder'
  };

  // macOS: position native traffic lights
  if (process.platform === 'darwin') {
    windowOptions.trafficLightPosition = { x: 12, y: 10 };
  }

  // Windows/Linux: native window controls overlay
  if (process.platform !== 'darwin') {
    windowOptions.titleBarOverlay = {
      color: '#00000000',
      symbolColor: '#94a3b8',
      height: 38
    };
  }

  mainWindow = new BrowserWindow(windowOptions);

  // In production/packaged, load the Vite-built output
  // In development, load the Vite-built output (run `npm run build:renderer` first)
  const rendererPath = path.join(__dirname, '../renderer/dist/index.html');
  const fs = require('fs');
  if (fs.existsSync(rendererPath)) {
    mainWindow.loadFile(rendererPath);
  } else {
    // Fallback: try loading from Vite dev server
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      // Final fallback: load source index.html directly (won't work with JSX)
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    });
  }

  // Save window bounds on close
  mainWindow.on('close', () => {
    settings.set('windowBounds', mainWindow.getBounds());
  });

  // Open DevTools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Notify renderer of maximize state changes (for Linux window controls)
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-change', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-change', false);
  });
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    initSettingsStore();
    registerIpcHandlers();
    createWindow();
    initAutoUpdater(mainWindow);
    Menu.setApplicationMenu(null);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Export for IPC handlers to access
module.exports = { getMainWindow: () => mainWindow };
