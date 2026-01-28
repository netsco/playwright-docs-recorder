/* global marked */

// DOM Elements
const historyList = document.getElementById('historyList');
const webview = document.getElementById('webview');
const urlInput = document.getElementById('urlInput');
const toolbar = document.getElementById('toolbar');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const refreshBtn = document.getElementById('refreshBtn');
const recordBtn = document.getElementById('recordBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const statusText = document.getElementById('statusText');
const recordingStatus = document.getElementById('recordingStatus');
const actionCount = document.getElementById('actionCount');
const screenshotCount = document.getElementById('screenshotCount');
const viewportInfo = document.getElementById('viewportInfo');

// Panel buttons
const panelStopBtn = document.getElementById('panelStopBtn');
const panelScreenshotBtn = document.getElementById('panelScreenshotBtn');
const panelNoteBtn = document.getElementById('panelNoteBtn');
const panelClearBtn = document.getElementById('panelClearBtn');

// Note dialog elements
const noteModal = document.getElementById('noteModal');
const noteInput = document.getElementById('noteInput');
const closeNote = document.getElementById('closeNote');
const cancelNote = document.getElementById('cancelNote');
const saveNote = document.getElementById('saveNote');
const mdToolbar = document.querySelector('.md-toolbar');

// Welcome panel elements
const welcomePanel = document.getElementById('welcomePanel');
const welcomeUrl = document.getElementById('welcomeUrl');
const welcomeRecentUrls = document.getElementById('welcomeRecentUrls');
const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeOutputDir = document.getElementById('welcomeOutputDir');
const welcomeBrowseDir = document.getElementById('welcomeBrowseDir');
const welcomeViewportPreset = document.getElementById('welcomeViewportPreset');
const customViewportInputs = document.getElementById('customViewportInputs');
const welcomeViewportWidth = document.getElementById('welcomeViewportWidth');
const welcomeViewportHeight = document.getElementById('welcomeViewportHeight');
const welcomeSeparator = document.getElementById('welcomeSeparator');
const welcomeInjectCSS = document.getElementById('welcomeInjectCSS');
const welcomeCSSOptions = document.getElementById('welcomeCSSOptions');
const welcomeCustomCSS = document.getElementById('welcomeCustomCSS');
const welcomeLoadCssFile = document.getElementById('welcomeLoadCssFile');
const welcomeRecordActions = document.getElementById('welcomeRecordActions');
const welcomeStartBtn = document.getElementById('welcomeStartBtn');

// Shortcuts panel
const shortcutsPanel = document.getElementById('shortcutsPanel');
const shortcutsPanelHeader = document.getElementById('shortcutsPanelHeader');
const closeShortcuts = document.getElementById('closeShortcuts');

// New recording button
const newRecordingBtn = document.getElementById('newRecordingBtn');

// Editor panel elements
const editorPanel = document.getElementById('editorPanel');
const editorBackBtn = document.getElementById('editorBackBtn');
const editorTitle = document.getElementById('editorTitle');
const editorStatus = document.getElementById('editorStatus');
const editorSaveBtn = document.getElementById('editorSaveBtn');
const editorDiscardBtn = document.getElementById('editorDiscardBtn');
const editorTextarea = document.getElementById('editorTextarea');
const editorPreview = document.getElementById('editorPreview');
const editorMdToolbar = document.querySelector('#editorPanel [data-editor-md]')?.parentElement;

// Log panel elements
const logPanel = document.getElementById('logPanel');
const logContent = document.getElementById('logContent');
const toggleLogBtn = document.getElementById('toggleLogBtn');
const toggleShortcutsBtn = document.getElementById('toggleShortcutsBtn');

// State
let isRecording = false;
let currentSettings = null;
let pendingScreenshot = null;
// eslint-disable-next-line no-unused-vars -- reserved for future use
let _currentRecordingId = null;
let activeHistoryId = null;
let editorOriginalContent = '';
// eslint-disable-next-line no-unused-vars -- reserved for future use
let _editorFilePath = '';
let editorRecordingDir = '';

// ===== Undo/Redo Manager =====

class UndoManager {
  constructor(maxHistory = 100) {
    this.history = [];
    this.index = -1;
    this.maxHistory = maxHistory;
  }

  push(state) {
    // Truncate forward history when new state is pushed
    this.history = this.history.slice(0, this.index + 1);
    this.history.push({ ...state });
    // Enforce max history limit
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.index++;
    }
  }

  undo() {
    if (this.index > 0) {
      this.index--;
      return { ...this.history[this.index] };
    }
    return null;
  }

  redo() {
    if (this.index < this.history.length - 1) {
      this.index++;
      return { ...this.history[this.index] };
    }
    return null;
  }

  clear() {
    this.history = [];
    this.index = -1;
  }

  canUndo() {
    return this.index > 0;
  }

  canRedo() {
    return this.index < this.history.length - 1;
  }
}

// Undo managers for textareas
const editorUndoManager = new UndoManager();
const noteUndoManager = new UndoManager();

// Debounce helper for input tracking
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Push state to undo manager for a textarea
function pushUndoState(textarea, undoManager) {
  undoManager.push({
    value: textarea.value,
    selectionStart: textarea.selectionStart,
    selectionEnd: textarea.selectionEnd
  });
}

// Restore state from undo manager to a textarea
function restoreUndoState(textarea, state, updatePreview = null) {
  if (!state) return;
  textarea.value = state.value;
  textarea.selectionStart = state.selectionStart;
  textarea.selectionEnd = state.selectionEnd;
  if (updatePreview) updatePreview();
}

// ===== Initialization =====

async function init() {
  try {
    console.log('Initializing renderer...');

    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI not available - preload script may have failed');
      statusText.textContent = 'Error: electronAPI not available';
      return;
    }

    // Set webview preload script and webpreferences
    const preloadPath = window.electronAPI.getWebviewPreloadPath();
    console.log('Webview preload path:', preloadPath);
    webview.setAttribute('preload', preloadPath);
    webview.setAttribute('webpreferences', 'contextIsolation=no, nodeIntegration=no');

    currentSettings = await window.electronAPI.getSettings();
    console.log('Settings loaded:', currentSettings);

    updateViewportInfo();
    populateViewportPresets();
    loadHistory();

    // Populate welcome panel with settings
    populateWelcomePanel();

    // Set webview size based on viewport
    updateWebviewSize();

    // Hide record button initially (welcome panel handles starting)
    recordBtn.style.display = 'none';

    console.log('Renderer initialized successfully');
  } catch (error) {
    console.error('Init error:', error);
    statusText.textContent = `Error: ${error.message}`;
  }
}

function populateWelcomePanel() {
  if (currentSettings) {
    welcomeOutputDir.value = currentSettings.outputDir || '';
    welcomeViewportWidth.value = currentSettings.viewport?.width || 1280;
    welcomeViewportHeight.value = currentSettings.viewport?.height || 720;
    welcomeSeparator.value = currentSettings.separator || '---';

    // CSS injection settings
    welcomeInjectCSS.checked = currentSettings.injectCSS || false;
    welcomeCustomCSS.value = currentSettings.customCSS || '';
    welcomeCSSOptions.style.display = welcomeInjectCSS.checked ? 'block' : 'none';

    // Populate recent URLs datalist
    populateWelcomeRecentUrls();
  }
}

function populateWelcomeRecentUrls() {
  welcomeRecentUrls.innerHTML = '';
  if (currentSettings?.recentUrls) {
    currentSettings.recentUrls.forEach(url => {
      const option = document.createElement('option');
      option.value = url;
      welcomeRecentUrls.appendChild(option);
    });
  }
}

function updateViewportInfo() {
  if (currentSettings) {
    const { width, height } = currentSettings.viewport;
    viewportInfo.textContent = `${width} x ${height}`;
  }
}

// populateRecentUrls now moved to populateWelcomeRecentUrls

function populateViewportPresets() {
  // Settings modal removed - viewport is set in welcome panel
}

function updateWebviewSize() {
  // Webview now fills container via CSS flexbox
  // Viewport setting is used for screenshot capture dimensions
}

async function loadHistory() {
  const history = await window.electronAPI.getHistory();
  renderHistory(history);
}

function renderHistory(history) {
  if (!history || history.length === 0) {
    historyList.innerHTML = '<div class="text-center py-8 text-slate-600 text-sm">No recordings yet</div>';
    return;
  }

  historyList.innerHTML = history.map(recording => `
    <div class="group p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 cursor-pointer transition-all" data-id="${recording.id}">
      <div class="font-medium text-sm text-slate-300 truncate mb-1">${recording.title || 'Untitled'}</div>
      <div class="flex items-center gap-3 text-xs text-slate-600">
        <span>${new Date(recording.startTime).toLocaleDateString()}</span>
        <span>${recording.actionCount} actions</span>
        <span>${recording.screenshotCount} shots</span>
      </div>
      <div class="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors" data-action="open" title="Open folder">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
          </svg>
        </button>
        <button class="p-1.5 rounded-md hover:bg-teal-500/20 text-slate-500 hover:text-teal-400 transition-colors" data-action="refetch" title="Refetch screenshots">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
        <button class="p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors" data-action="delete" title="Delete">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// ===== Navigation =====

function navigateTo(url) {
  if (!url) return;

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  loadingOverlay.style.display = 'flex';
  statusText.textContent = `Loading ${url}...`;
  webview.src = url;
  urlInput.value = url;
}

// Navigation is now done via welcome panel only

backBtn.addEventListener('click', () => {
  if (webview.canGoBack()) webview.goBack();
});

forwardBtn.addEventListener('click', () => {
  if (webview.canGoForward()) webview.goForward();
});

refreshBtn.addEventListener('click', () => {
  webview.reload();
});

// ===== Webview Events =====

webview.addEventListener('did-start-loading', () => {
  loadingOverlay.style.display = 'flex';
});

webview.addEventListener('did-stop-loading', () => {
  loadingOverlay.style.display = 'none';
  statusText.textContent = 'Ready';
});

webview.addEventListener('did-navigate', (e) => {
  urlInput.value = e.url;
  // Don't record internal/blank URLs
  if (isRecording && e.url && !e.url.startsWith('about:') && !e.url.startsWith('data:')) {
    window.electronAPI.recordAction({ type: 'goto', url: e.url });
  }
});

webview.addEventListener('did-fail-load', (e) => {
  if (e.errorCode !== -3) { // -3 is aborted, ignore
    loadingOverlay.style.display = 'none';
    statusText.textContent = `Failed to load: ${e.errorDescription}`;
  }
});

webview.addEventListener('page-title-updated', (e) => {
  document.title = `${e.title} - Documentation Recorder`;
});

// Auto-focus webview on mouse enter so keyboard events (Ctrl+hover/click) work
webview.addEventListener('mouseenter', () => {
  if (isRecording) {
    webview.focus();
  }
});

// IPC from webview
webview.addEventListener('ipc-message', async (e) => {
  const { channel, args } = e;

  switch (channel) {
    case 'record-action':
      if (isRecording) {
        window.electronAPI.recordAction(args[0]);
      }
      break;

    case 'request-screenshot':
      if (isRecording) {
        const { selector, note, withNote, fullPage = false } = args[0];
        if (withNote) {
          pendingScreenshot = { selector, fullPage };
          showNoteDialog();
        } else {
          await captureScreenshot(selector, note, fullPage);
        }
      }
      break;

    case 'highlight-changed':
      statusText.textContent = args[0] ? `Highlighted: ${args[0]}` : 'Ready';
      break;
  }
});

// ===== Recording Controls =====

recordBtn.addEventListener('click', async () => {
  if (isRecording) {
    await stopRecording();
  }
  // When not recording, the welcome panel handles starting
});

// ===== Shortcuts Panel =====

if (closeShortcuts) {
  closeShortcuts.addEventListener('click', () => {
    shortcutsPanel.classList.add('hidden');
  });
}

// Shortcuts panel drag functionality
if (shortcutsPanelHeader && shortcutsPanel) {
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  shortcutsPanelHeader.addEventListener('mousedown', (e) => {
    // Don't start drag if clicking on close button
    if (e.target.closest('button')) return;

    isDragging = true;
    const rect = shortcutsPanel.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    // Switch to absolute positioning
    shortcutsPanel.style.position = 'absolute';
    shortcutsPanel.style.left = rect.left + 'px';
    shortcutsPanel.style.top = rect.top + 'px';
    shortcutsPanel.style.right = 'auto';
    shortcutsPanel.style.bottom = 'auto';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const container = shortcutsPanel.parentElement;
    const containerRect = container.getBoundingClientRect();
    const panelRect = shortcutsPanel.getBoundingClientRect();

    let newX = e.clientX - dragOffset.x - containerRect.left;
    let newY = e.clientY - dragOffset.y - containerRect.top;

    // Constrain to container bounds
    const maxX = containerRect.width - panelRect.width;
    const maxY = containerRect.height - panelRect.height;
    newX = Math.max(0, Math.min(maxX, newX));
    newY = Math.max(0, Math.min(maxY, newY));

    shortcutsPanel.style.left = newX + 'px';
    shortcutsPanel.style.top = newY + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

// ===== New Recording Button =====

if (newRecordingBtn) {
  newRecordingBtn.addEventListener('click', () => {
    // Show welcome panel
    welcomePanel.style.display = '';
    editorPanel.style.display = 'none';
    toolbar.style.display = 'none';
    webview.classList.add('hidden');

    // Reset form
    welcomeUrl.value = '';
    welcomeTitle.value = '';

    // Reset shortcuts panel position
    shortcutsPanel.style.position = '';
    shortcutsPanel.style.left = '';
    shortcutsPanel.style.top = '';
    shortcutsPanel.style.right = '';
    shortcutsPanel.style.bottom = '';

    // Focus URL input
    welcomeUrl.focus();
  });
}

// ===== Welcome Panel =====

welcomeBrowseDir.addEventListener('click', async () => {
  const result = await window.electronAPI.selectOutputDir();
  if (result.success) {
    welcomeOutputDir.value = result.path;
    // Also update settings
    await window.electronAPI.saveSettings({ outputDir: result.path });
    if (currentSettings) currentSettings.outputDir = result.path;
  }
});

// Viewport preset handler
welcomeViewportPreset.addEventListener('change', () => {
  const value = welcomeViewportPreset.value;
  if (value === 'custom') {
    customViewportInputs.style.display = 'flex';
    welcomeViewportWidth.focus();
  } else {
    customViewportInputs.style.display = 'none';
    const [width, height] = value.split('x').map(Number);
    welcomeViewportWidth.value = width;
    welcomeViewportHeight.value = height;
  }
});

// CSS injection checkbox toggle
welcomeInjectCSS.addEventListener('change', () => {
  welcomeCSSOptions.style.display = welcomeInjectCSS.checked ? 'block' : 'none';
});

// Load CSS from file
welcomeLoadCssFile.addEventListener('click', async () => {
  const result = await window.electronAPI.selectCssFile();
  if (result.success) {
    welcomeCustomCSS.value = result.content;
  }
});

welcomeStartBtn.addEventListener('click', async () => {
  await startFromWelcomePanel();
});

// Handle Enter key in welcome URL field
welcomeUrl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    startFromWelcomePanel();
  }
});

async function startFromWelcomePanel() {
  const url = welcomeUrl.value.trim();
  const title = welcomeTitle.value.trim();

  // Validate required fields
  if (!url) {
    welcomeUrl.focus();
    statusText.textContent = 'URL is required';
    return;
  }

  if (!title) {
    welcomeTitle.focus();
    statusText.textContent = 'Project title is required';
    return;
  }

  // Get viewport from form
  const viewport = {
    width: parseInt(welcomeViewportWidth.value) || 1280,
    height: parseInt(welcomeViewportHeight.value) || 720
  };

  // Get separator (empty string means no separator)
  const separator = welcomeSeparator.value;

  // Get record actions preference
  const recordActions = welcomeRecordActions.checked;

  // Get CSS injection settings
  const injectCSS = welcomeInjectCSS.checked;
  const customCSS = injectCSS ? welcomeCustomCSS.value.trim() : '';

  // Update settings if output dir changed
  if (welcomeOutputDir.value && welcomeOutputDir.value !== currentSettings.outputDir) {
    await window.electronAPI.saveSettings({ outputDir: welcomeOutputDir.value });
    currentSettings.outputDir = welcomeOutputDir.value;
  }

  // Save separator setting
  await window.electronAPI.saveSettings({ separator });
  currentSettings.separator = separator;

  // Save CSS injection settings
  if (injectCSS !== currentSettings.injectCSS) {
    await window.electronAPI.saveSettings({ injectCSS });
    currentSettings.injectCSS = injectCSS;
  }
  if (customCSS !== currentSettings.customCSS) {
    await window.electronAPI.saveSettings({ customCSS });
    currentSettings.customCSS = customCSS;
  }

  // Hide welcome panel and show webview
  welcomePanel.style.display = 'none';
  webview.classList.remove('hidden');

  // Show toolbar
  toolbar.style.display = 'flex';

  // Navigate to URL first (toggle buttons shown after recording starts)
  navigateTo(url);

  // Wait for page to load, then start recording
  webview.addEventListener('did-stop-loading', async function onLoad() {
    webview.removeEventListener('did-stop-loading', onLoad);
    await startRecording(url, title, viewport, separator, recordActions, customCSS);
  }, { once: true });
}

function showWelcomePanel() {
  // Reset form
  welcomeUrl.value = '';
  welcomeTitle.value = '';
  populateWelcomePanel();

  // Show welcome panel, hide webview and editor
  welcomePanel.style.display = '';
  editorPanel.style.display = 'none';
  webview.classList.add('hidden');
  webview.src = 'data:text/html,';

  // Hide toolbar and toggle buttons
  toolbar.style.display = 'none';
  toggleLogBtn.style.display = 'none';
  toggleShortcutsBtn.style.display = 'none';
  logPanel.style.display = 'none';

  // Clear active history selection
  activeHistoryId = null;
  _currentRecordingId = null;
  updateHistoryHighlight();

  // Focus URL input
  setTimeout(() => welcomeUrl.focus(), 100);
}


async function startRecording(url, title, viewport, separator, recordActions = true, customCSS = '') {
  const result = await window.electronAPI.startRecording(url || webview.src, {
    title: title || null,
    viewport: viewport || currentSettings.viewport,
    separator: separator !== undefined ? separator : currentSettings.separator,
    recordActions: recordActions,
    customCSS: customCSS || null
  });

  if (result.success) {
    isRecording = true;
    _currentRecordingId = result.id;

    // Hide new recording button during recording
    if (newRecordingBtn) newRecordingBtn.style.display = 'none';

    // Ensure webview is visible and welcome panel is hidden
    welcomePanel.style.display = 'none';
    editorPanel.style.display = 'none';
    webview.classList.remove('hidden');

    // Show toolbar
    toolbar.style.display = 'flex';

    // Update record button styling for active state
    recordBtn.classList.add('recording-active', 'bg-coral-500', 'hover:bg-coral-400', 'border-coral-500');
    recordBtn.classList.remove('bg-slate-800', 'hover:bg-slate-700', 'border-slate-700');
    recordBtn.querySelector('.record-dot').classList.add('bg-white', 'animate-pulse-recording');
    recordBtn.querySelector('.record-dot').classList.remove('bg-slate-500', 'group-hover:bg-coral-500');
    recordBtn.querySelector('.record-text').textContent = 'Stop';

    recordingStatus.style.display = 'flex';
    actionCount.textContent = '0';
    screenshotCount.textContent = '0';
    statusText.textContent = 'Recording...';

    // Show screenshot section and clear previous
    const screenshotSection = document.getElementById('screenshotSection');
    const screenshotPreviews = document.getElementById('screenshotPreviews');
    if (screenshotSection) screenshotSection.style.display = 'block';
    if (screenshotPreviews) screenshotPreviews.innerHTML = '';

    // Show shortcuts panel based on preference
    if (shortcutsPanel && currentSettings.showShortcuts !== false) {
      shortcutsPanel.classList.remove('hidden');
    }

    // Show log panel based on preference
    if (currentSettings.showLog) {
      logPanel.style.display = 'block';
    }

    // Clear log content
    logContent.innerHTML = '';
    addLogEntry(recordActions ? 'Recording started' : 'Screenshots-only mode started', 'info');
    statusText.textContent = recordActions ? 'Recording...' : 'Screenshots-only mode...';

    // Show toggle buttons
    toggleLogBtn.style.display = 'block';
    toggleShortcutsBtn.style.display = 'block';

    // Notify webview that recording started (with recordActions preference)
    webview.send('recording-started', { recordActions });

    // Inject custom CSS if enabled
    if (customCSS) {
      webview.send('inject-custom-css', customCSS);
    }
  }
}

async function stopRecording() {
  const result = await window.electronAPI.stopRecording();

  isRecording = false;

  // Show new recording button
  if (newRecordingBtn) newRecordingBtn.style.display = '';

  // Reset record button styling
  recordBtn.classList.remove('recording-active', 'bg-coral-500', 'hover:bg-coral-400', 'border-coral-500');
  recordBtn.classList.add('bg-slate-800', 'hover:bg-slate-700', 'border-slate-700');
  recordBtn.querySelector('.record-dot').classList.remove('bg-white', 'animate-pulse-recording');
  recordBtn.querySelector('.record-dot').classList.add('bg-slate-500', 'group-hover:bg-coral-500');
  recordBtn.querySelector('.record-text').textContent = 'Record';

  recordingStatus.style.display = 'none';

  // Hide shortcuts panel and log panel
  if (shortcutsPanel) shortcutsPanel.classList.add('hidden');
  logPanel.style.display = 'none';

  // Hide toolbar
  toolbar.style.display = 'none';

  // Notify webview that recording stopped
  webview.send('recording-stopped');

  if (result.success) {
    addLogEntry('Recording stopped', 'info');

    statusText.textContent = `Saved: ${result.recording.actionCount} actions, ${result.recording.screenshotCount} screenshots`;

    await loadHistory();

    // Set active recording and highlight in history
    activeHistoryId = result.recording.id;
    updateHistoryHighlight();

    // Open the markdown editor for the recording
    await openEditor(result.recording.id);
  } else {
    statusText.textContent = `Error: ${result.error}`;
    showWelcomePanel();
  }
}

// ===== Screenshots =====

// Screenshot and Note buttons are now in the shortcuts panel (panelScreenshotBtn, panelNoteBtn)

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
  if (!isRecording) return;

  // Escape to stop recording
  if (e.code === 'Escape') {
    e.preventDefault();
    await stopRecording();
    return;
  }

  if (!e.ctrlKey || !e.shiftKey) return;

  if (e.code === 'KeyK') {
    e.preventDefault();
    pendingScreenshot = { selector: null };
    showNoteDialog('Screenshot with Note', true);
  }
  if (e.code === 'KeyS') {
    e.preventDefault();
    await captureScreenshot(null, null, false);
  }
  if (e.code === 'KeyF') {
    e.preventDefault();
    await captureScreenshot(null, null, true);
  }
  if (e.code === 'KeyN') {
    e.preventDefault();
    pendingScreenshot = null;
    showNoteDialog('Add Note', false);
  }
});

async function captureScreenshot(selector, note, fullPage = false) {
  try {
    console.log('Capturing screenshot...', { selector, note, fullPage });

    let dataUrl;

    if (fullPage) {
      // Full page capture using scroll-and-stitch
      dataUrl = await captureFullPage();
    } else {
      // Standard viewport capture
      const image = await webview.capturePage();
      dataUrl = image.toDataURL();
    }

    console.log('Image captured, size:', dataUrl.length);

    const result = await window.electronAPI.captureScreenshot({
      selector,
      note,
      fullPage,
      imageDataUrl: dataUrl
    });

    if (result.success) {
      const count = parseInt(screenshotCount.textContent) + 1;
      screenshotCount.textContent = count;
      const fullPageLabel = fullPage ? ' (full page)' : '';
      statusText.textContent = `Screenshot saved: ${result.filename}${fullPageLabel}`;

      // Add to preview list
      addScreenshotPreview(result.filename, dataUrl, note);
    } else {
      console.error('Screenshot failed:', result.error);
      statusText.textContent = `Screenshot failed: ${result.error}`;
    }
  } catch (error) {
    console.error('Screenshot error:', error);
    statusText.textContent = `Screenshot error: ${error.message}`;
  }
}

/**
 * Capture full page by scrolling and stitching screenshots
 */
async function captureFullPage() {
  // Get page dimensions
  const dimensions = await webview.executeJavaScript(`
    (function() {
      return {
        scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      };
    })()
  `);

  const { scrollHeight, viewportHeight, viewportWidth, scrollX, scrollY } = dimensions;

  // If page fits in viewport, just capture normally
  if (scrollHeight <= viewportHeight) {
    const image = await webview.capturePage();
    return image.toDataURL();
  }

  // Calculate number of captures needed
  const numCaptures = Math.ceil(scrollHeight / viewportHeight);
  const captures = [];

  statusText.textContent = `Capturing full page (0/${numCaptures})...`;

  // Capture each viewport section
  for (let i = 0; i < numCaptures; i++) {
    const scrollTo = i * viewportHeight;

    // Scroll to position
    await webview.executeJavaScript(`window.scrollTo(${scrollX}, ${scrollTo})`);

    // Wait for scroll and render
    await new Promise(r => setTimeout(r, 100));

    // Capture this section
    const image = await webview.capturePage();
    const dataUrl = image.toDataURL();

    // Calculate how much of this capture to use
    const isLastCapture = i === numCaptures - 1;
    const captureHeight = isLastCapture
      ? scrollHeight - (i * viewportHeight)
      : viewportHeight;

    captures.push({
      dataUrl,
      y: scrollTo,
      height: captureHeight,
      isLast: isLastCapture
    });

    statusText.textContent = `Capturing full page (${i + 1}/${numCaptures})...`;
  }

  // Restore original scroll position
  await webview.executeJavaScript(`window.scrollTo(${scrollX}, ${scrollY})`);

  // Stitch images together using canvas
  const canvas = document.createElement('canvas');
  canvas.width = viewportWidth;
  canvas.height = scrollHeight;
  const ctx = canvas.getContext('2d');

  for (const capture of captures) {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = capture.dataUrl;
    });

    // For the last capture, we may need to offset from bottom
    if (capture.isLast && capture.height < viewportHeight) {
      // Draw only the visible portion from the bottom of the captured image
      const sourceY = viewportHeight - capture.height;
      ctx.drawImage(
        img,
        0, sourceY, viewportWidth, capture.height,
        0, capture.y, viewportWidth, capture.height
      );
    } else {
      ctx.drawImage(img, 0, capture.y);
    }
  }

  return canvas.toDataURL('image/png');
}

function addScreenshotPreview(filename, dataUrl, note) {
  const preview = document.getElementById('screenshotPreviews');
  if (!preview) return;

  const item = document.createElement('div');
  item.className = 'rounded-lg overflow-hidden bg-slate-800/30 border border-slate-700/30 hover:border-teal-500/50 cursor-pointer transition-all';
  item.innerHTML = `
    <img src="${dataUrl}" alt="${filename}" title="${note || filename}" class="w-full h-auto block">
    <div class="px-2 py-1.5 text-[10px] font-mono text-slate-500 truncate">${filename}</div>
  `;
  preview.insertBefore(item, preview.firstChild);
}

// ===== Action Counter =====

window.electronAPI.onActionRecorded((action) => {
  if (action.type !== 'screenshot') {
    const count = parseInt(actionCount.textContent) + 1;
    actionCount.textContent = count;
  }

  // Add to log panel
  let logMessage = action.type;
  if (action.type === 'click' && action.selector) {
    logMessage = `click → ${action.selector}`;
  } else if (action.type === 'fill' && action.selector) {
    logMessage = `fill → ${action.selector} → "${action.value?.substring(0, 20)}${action.value?.length > 20 ? '...' : ''}"`;
  } else if (action.type === 'goto' && action.url) {
    logMessage = `goto → ${action.url}`;
  } else if (action.type === 'screenshot') {
    logMessage = `screenshot → ${action.filename || 'captured'}`;
  } else if (action.type === 'note') {
    logMessage = `note → "${action.note?.substring(0, 30)}${action.note?.length > 30 ? '...' : ''}"`;
  }

  addLogEntry(logMessage);
});

// ===== Note Dialog =====

let isScreenshotWithNote = false;

function showNoteDialog(title = 'Add Note', withScreenshot = false) {
  isScreenshotWithNote = withScreenshot;
  noteInput.value = '';
  const titleEl = document.getElementById('noteModalTitle');
  if (titleEl) titleEl.textContent = title;
  saveNote.textContent = withScreenshot ? 'Save Screenshot' : 'Add Note';
  noteModal.style.display = 'flex';
  noteInput.focus();
  // Initialize undo state for note input
  noteUndoManager.clear();
  pushUndoState(noteInput, noteUndoManager);
}

function hideNoteDialog() {
  noteModal.style.display = 'none';
  pendingScreenshot = null;
  isScreenshotWithNote = false;
}

closeNote.addEventListener('click', hideNoteDialog);
cancelNote.addEventListener('click', hideNoteDialog);

saveNote.addEventListener('click', async () => {
  const noteText = noteInput.value?.trim();

  if (isScreenshotWithNote) {
    // Screenshot with note
    await captureScreenshot(pendingScreenshot?.selector || null, noteText || null, pendingScreenshot?.fullPage || false);
  } else if (noteText) {
    // Standalone note
    await addStandaloneNote(noteText);
  }

  hideNoteDialog();
});

async function addStandaloneNote(note) {
  try {
    await window.electronAPI.recordAction({ type: 'note', note });
    statusText.textContent = 'Note added';

    // Add to preview
    const preview = document.getElementById('screenshotPreviews');
    if (preview) {
      const item = document.createElement('div');
      item.className = 'flex items-start gap-2 p-2.5 rounded-lg bg-slate-800/30 border-l-2 border-teal-500';
      item.innerHTML = `
        <svg class="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
        <span class="text-xs text-slate-400 leading-relaxed">${note.substring(0, 60)}${note.length > 60 ? '...' : ''}</span>
      `;
      preview.insertBefore(item, preview.firstChild);
    }
  } catch (error) {
    console.error('Failed to add note:', error);
    statusText.textContent = `Error: ${error.message}`;
  }
}

noteInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    saveNote.click();
  }
  if (e.key === 'Escape') {
    hideNoteDialog();
  }
  // Undo/Redo handling
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    const state = noteUndoManager.undo();
    restoreUndoState(noteInput, state);
  }
  if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
    e.preventDefault();
    const state = noteUndoManager.redo();
    restoreUndoState(noteInput, state);
  }
});

// Debounced input handler for note undo tracking
const debouncedNoteUndoPush = debounce(() => {
  pushUndoState(noteInput, noteUndoManager);
}, 300);

noteInput.addEventListener('input', () => {
  debouncedNoteUndoPush();
});

// Markdown toolbar
mdToolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-md]');
  if (!btn) return;

  // Push state before toolbar modification for undo
  pushUndoState(noteInput, noteUndoManager);

  const type = btn.dataset.md;
  const start = noteInput.selectionStart;
  const end = noteInput.selectionEnd;
  const text = noteInput.value;
  const selected = text.substring(start, end);

  let before = '', after = '', insert = '';

  switch (type) {
    case 'bold': before = '**'; after = '**'; insert = selected || 'text'; break;
    case 'italic': before = '*'; after = '*'; insert = selected || 'text'; break;
    case 'code': before = '`'; after = '`'; insert = selected || 'code'; break;
    case 'link': before = '['; after = '](url)'; insert = selected || 'link text'; break;
    case 'h1': before = '# '; after = ''; insert = selected || 'Heading'; break;
    case 'h2': before = '## '; after = ''; insert = selected || 'Heading'; break;
    case 'ul': before = '- '; after = ''; insert = selected || 'item'; break;
    case 'ol': before = '1. '; after = ''; insert = selected || 'item'; break;
  }

  noteInput.value = text.substring(0, start) + before + insert + after + text.substring(end);
  noteInput.focus();
  noteInput.selectionStart = start + before.length;
  noteInput.selectionEnd = start + before.length + insert.length;

  // Push state after toolbar modification for redo
  pushUndoState(noteInput, noteUndoManager);
});

// Note toolbar undo/redo buttons
const noteUndoBtn = document.getElementById('noteUndoBtn');
const noteRedoBtn = document.getElementById('noteRedoBtn');

if (noteUndoBtn) {
  noteUndoBtn.addEventListener('click', () => {
    const state = noteUndoManager.undo();
    restoreUndoState(noteInput, state);
  });
}

if (noteRedoBtn) {
  noteRedoBtn.addEventListener('click', () => {
    const state = noteUndoManager.redo();
    restoreUndoState(noteInput, state);
  });
}

// ===== Panel Buttons =====

if (panelStopBtn) {
  panelStopBtn.addEventListener('click', async () => {
    if (isRecording) {
      await stopRecording();
    }
  });
}

if (panelScreenshotBtn) {
  panelScreenshotBtn.addEventListener('click', async () => {
    if (isRecording) {
      await captureScreenshot(null, null, false);
    }
  });
}

// Full page screenshot button
const panelFullPageBtn = document.getElementById('panelFullPageBtn');
if (panelFullPageBtn) {
  panelFullPageBtn.addEventListener('click', async () => {
    if (isRecording) {
      await captureScreenshot(null, null, true);
    }
  });
}

if (panelNoteBtn) {
  panelNoteBtn.addEventListener('click', () => {
    if (isRecording) {
      pendingScreenshot = { selector: null };
      showNoteDialog('Screenshot with Note', true);
    }
  });
}

if (panelClearBtn) {
  panelClearBtn.addEventListener('click', () => {
    if (isRecording) {
      webview.send('clear-highlight');
      statusText.textContent = 'Ready';
    }
  });
}

// ===== Refetch Screenshots =====

async function refetchRecordingScreenshots(recordingId, actionBtn) {
  if (isRecording) {
    statusText.textContent = 'Cannot refetch while recording';
    return;
  }

  statusText.textContent = 'Loading recording...';
  actionBtn.disabled = true;

  try {
    // Load the recording data
    const recording = await window.electronAPI.loadRecording(recordingId);
    if (!recording || !recording.actions) {
      throw new Error('Invalid recording data');
    }

    const { viewport = { width: 1280, height: 720 }, actions = [] } = recording;

    // Filter to only goto and screenshot actions
    const relevantActions = actions.filter(a => ['goto', 'screenshot'].includes(a.type));
    if (relevantActions.length === 0) {
      statusText.textContent = 'No actions to refetch';
      actionBtn.disabled = false;
      return;
    }

    // Show webview and hide other panels
    welcomePanel.style.display = 'none';
    editorPanel.style.display = 'none';
    webview.classList.remove('hidden');
    toolbar.style.display = 'flex';

    // Set viewport
    viewportInfo.textContent = `${viewport.width}x${viewport.height}`;

    let screenshotCount = 0;
    const totalScreenshots = relevantActions.filter(a => a.type === 'screenshot').length;

    // Process each action
    for (let i = 0; i < relevantActions.length; i++) {
      const action = relevantActions[i];
      statusText.textContent = `Refetching ${screenshotCount}/${totalScreenshots}...`;

      if (action.type === 'goto') {
        // Navigate to URL
        webview.src = action.url;
        urlInput.value = action.url;

        // Wait for page to load
        await new Promise((resolve, _reject) => {
          const timeout = setTimeout(() => {
            webview.removeEventListener('did-finish-load', onLoad);
            webview.removeEventListener('did-fail-load', onFail);
            resolve(); // Continue even on timeout
          }, 30000);

          const onLoad = () => {
            clearTimeout(timeout);
            webview.removeEventListener('did-fail-load', onFail);
            resolve();
          };

          const onFail = (e) => {
            clearTimeout(timeout);
            webview.removeEventListener('did-finish-load', onLoad);
            console.warn('Page load failed:', e);
            resolve(); // Continue even on failure
          };

          webview.addEventListener('did-finish-load', onLoad, { once: true });
          webview.addEventListener('did-fail-load', onFail, { once: true });
        });

        // Small delay for rendering
        await new Promise(r => setTimeout(r, 500));

      } else if (action.type === 'screenshot') {
        // Apply highlight if present
        if (action.highlight) {
          webview.send('apply-highlight', action.highlight);
          await new Promise(r => setTimeout(r, 200));
        }

        // Capture screenshot
        const image = await webview.capturePage();
        const dataUrl = image.toDataURL();

        // Save screenshot via IPC (reuse existing handler)
        await window.electronAPI.saveRefetchedScreenshot({
          recordingId,
          filename: action.filename,
          imageDataUrl: dataUrl
        });

        screenshotCount++;

        // Clear highlight
        if (action.highlight) {
          webview.send('clear-highlight');
        }
      }
    }

    // Regenerate markdown
    await window.electronAPI.regenerateMarkdown(recordingId);

    statusText.textContent = `Refetched ${screenshotCount} screenshots`;

    // Refresh editor if viewing this recording
    if (activeHistoryId === recordingId) {
      await openEditor(recordingId);
    } else {
      showWelcomePanel();
    }

  } catch (error) {
    console.error('Refetch error:', error);
    statusText.textContent = `Refetch failed: ${error.message}`;
  }

  actionBtn.disabled = false;
}

// ===== History Actions =====

historyList.addEventListener('click', async (e) => {
  const item = e.target.closest('[data-id]');
  if (!item) return;

  const id = item.dataset.id;
  const actionBtn = e.target.closest('button[data-action]');

  if (actionBtn) {
    const action = actionBtn.dataset.action;
    if (action === 'open') {
      await window.electronAPI.openRecordingFolder(id);
    } else if (action === 'refetch') {
      await refetchRecordingScreenshots(id, actionBtn);
    } else if (action === 'delete') {
      if (confirm('Delete this recording?')) {
        await window.electronAPI.deleteRecording(id);
        loadHistory();
        // If we're viewing this recording, go back to welcome
        if (activeHistoryId === id) {
          showWelcomePanel();
        }
      }
    }
  } else {
    // Clicked on the item itself - open the editor
    if (!isRecording) {
      await openEditor(id);
    }
  }
});

// ===== Action Log =====

function addLogEntry(message, type = 'action') {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const entry = document.createElement('div');
  entry.className = type === 'info' ? 'text-slate-500' : 'text-slate-400';
  entry.innerHTML = `<span class="text-slate-600">[${timestamp}]</span> ${escapeHtml(message)}`;
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Toggle Buttons =====

toggleLogBtn.addEventListener('click', async () => {
  const isVisible = logPanel.style.display !== 'none';
  logPanel.style.display = isVisible ? 'none' : 'block';
  toggleLogBtn.classList.toggle('text-teal-400', !isVisible);
  toggleLogBtn.classList.toggle('text-slate-600', isVisible);

  // Save preference
  await window.electronAPI.saveSettings({ showLog: !isVisible });
  currentSettings.showLog = !isVisible;
});

toggleShortcutsBtn.addEventListener('click', async () => {
  const isVisible = !shortcutsPanel.classList.contains('hidden');
  shortcutsPanel.classList.toggle('hidden');
  toggleShortcutsBtn.classList.toggle('text-teal-400', !isVisible);
  toggleShortcutsBtn.classList.toggle('text-slate-600', isVisible);

  // Save preference
  await window.electronAPI.saveSettings({ showShortcuts: !isVisible });
  currentSettings.showShortcuts = !isVisible;
});

// ===== History Highlight =====

function updateHistoryHighlight() {
  const items = historyList.querySelectorAll('[data-id]');
  items.forEach(item => {
    if (item.dataset.id === activeHistoryId) {
      item.classList.add('ring-2', 'ring-teal-500/50', 'bg-slate-800/70');
    } else {
      item.classList.remove('ring-2', 'ring-teal-500/50', 'bg-slate-800/70');
    }
  });
}

// ===== Markdown Editor =====

async function openEditor(recordingId) {
  try {
    // Get the markdown file path for this recording
    const result = await window.electronAPI.getRecordingMarkdown(recordingId);

    if (!result.success) {
      statusText.textContent = result.error || 'Failed to load markdown';
      showWelcomePanel();
      return;
    }

    // Store state
    activeHistoryId = recordingId;
    _editorFilePath = result.filePath;
    editorRecordingDir = result.recordingDir;
    editorOriginalContent = result.content;

    // Set editor content
    editorTextarea.value = result.content;
    editorTitle.textContent = result.title || 'Untitled';
    editorStatus.textContent = '';

    // Initialize undo state for editor
    editorUndoManager.clear();
    pushUndoState(editorTextarea, editorUndoManager);

    // Update preview
    updateEditorPreview();

    // Show editor panel, hide others
    welcomePanel.style.display = 'none';
    webview.classList.add('hidden');
    toolbar.style.display = 'none';
    editorPanel.style.display = 'flex';
    toggleLogBtn.style.display = 'none';
    toggleShortcutsBtn.style.display = 'none';
    logPanel.style.display = 'none';
    shortcutsPanel.classList.add('hidden');

    // Update history highlight
    updateHistoryHighlight();

    statusText.textContent = 'Editing markdown';
  } catch (error) {
    console.error('Error opening editor:', error);
    statusText.textContent = `Error: ${error.message}`;
  }
}

// Cache buster for forcing image reload after edits
let imageCacheBuster = Date.now();

// Configure marked with custom renderer for styling
const markedRenderer = {
  image(token) {
    let src = token.href;
    const filename = token.href; // Original href is the filename (e.g., "screenshots/screenshot-001.png")
    if (editorRecordingDir && !src.startsWith('http') && !src.startsWith('file://')) {
      src = 'file:///' + editorRecordingDir.replace(/\\/g, '/') + '/' + token.href;
    }
    // Add cache buster to force reload after edits
    src += '?t=' + imageCacheBuster;
    // Wrap image in container with edit button overlay
    return `
      <div class="relative group inline-block my-4">
        <img src="${src}" alt="${token.text || ''}" class="max-w-full rounded-lg" data-screenshot="${filename}">
        <button class="absolute top-2 right-2 px-2 py-1 bg-slate-900/80 hover:bg-teal-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity" data-edit-screenshot="${filename}">
          ✏️ Edit
        </button>
      </div>
    `;
  },
  link(token) {
    const text = token.tokens ? this.parser.parseInline(token.tokens) : token.text;
    return `<a href="${token.href}" class="text-teal-400 hover:underline">${text}</a>`;
  },
  code(token) {
    return `<pre class="my-3 p-3 bg-slate-800 rounded-lg overflow-x-auto"><code>${token.text}</code></pre>`;
  },
  codespan(token) {
    return `<code class="px-1.5 py-0.5 bg-slate-800 rounded text-sm">${token.text}</code>`;
  },
  heading(token) {
    const styles = {
      1: 'text-2xl font-bold mt-6 mb-3',
      2: 'text-xl font-semibold mt-5 mb-2',
      3: 'text-lg font-semibold mt-4 mb-2',
      4: 'text-base font-semibold mt-3 mb-2',
      5: 'text-sm font-semibold mt-3 mb-1',
      6: 'text-sm font-medium mt-2 mb-1'
    };
    const text = token.tokens ? this.parser.parseInline(token.tokens) : token.text;
    return `<h${token.depth} class="${styles[token.depth] || ''}">${text}</h${token.depth}>`;
  },
  paragraph(token) {
    const text = token.tokens ? this.parser.parseInline(token.tokens) : token.text;
    return `<p class="mb-3">${text}</p>`;
  },
  list(token) {
    const type = token.ordered ? 'ol' : 'ul';
    const listClass = token.ordered ? 'list-decimal' : 'list-disc';
    return `<${type} class="${listClass} list-inside space-y-1 my-3">${token.body}</${type}>`;
  },
  hr() {
    return '<hr class="border-slate-700 my-6">';
  },
  br() {
    return '<br>';
  },
  space() {
    return '';
  }
};

marked.use({ renderer: markedRenderer, gfm: true, breaks: true });

function updateEditorPreview() {
  const markdown = editorTextarea.value;
  const html = renderMarkdownWithFrontmatter(markdown);
  editorPreview.innerHTML = html;
}

function renderMarkdownWithFrontmatter(markdown) {
  // Extract and render frontmatter separately (marked doesn't handle YAML frontmatter)
  let content = markdown;
  let frontmatterHtml = '';

  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (frontmatterMatch) {
    content = markdown.slice(frontmatterMatch[0].length);
    const frontmatterLines = frontmatterMatch[1].split('\n');
    const fields = frontmatterLines
      .filter(line => line.includes(':'))
      .map(line => {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        return `<div class="flex gap-2"><span class="text-slate-500">${key.trim()}:</span><span class="text-slate-300">${value}</span></div>`;
      })
      .join('');
    frontmatterHtml = `<div class="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm font-mono">${fields}</div>`;
  }

  // Preserve multiple blank lines by converting them to visible breaks
  // Use a placeholder that won't interfere with markdown parsing
  content = content.replace(/\n{3,}/g, (match) => {
    const extraBreaks = match.length - 2;
    return '\n\n' + '&blank;\n'.repeat(extraBreaks);
  });

  // Ensure images on their own lines are treated as separate paragraphs
  // This must run after blank line handling to catch images after &blank; markers
  content = content.replace(/\n(!\[)/g, '\n\n$1');

  // Parse markdown first, then replace placeholders with <br>
  let html = marked.parse(content);
  html = html.replace(/&blank;/g, '<br>');

  return frontmatterHtml + html;
}

// Debounced input handler for editor undo tracking
const debouncedEditorUndoPush = debounce(() => {
  pushUndoState(editorTextarea, editorUndoManager);
}, 300);

// Editor event handlers
editorTextarea.addEventListener('input', () => {
  updateEditorPreview();

  // Show unsaved indicator
  const hasChanges = editorTextarea.value !== editorOriginalContent;
  editorStatus.textContent = hasChanges ? 'Unsaved changes' : '';

  // Track changes for undo
  debouncedEditorUndoPush();
});

// Editor undo/redo keyboard handler
editorTextarea.addEventListener('keydown', (e) => {
  // Undo: Ctrl+Z
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    const state = editorUndoManager.undo();
    restoreUndoState(editorTextarea, state, updateEditorPreview);
    // Update unsaved indicator
    const hasChanges = editorTextarea.value !== editorOriginalContent;
    editorStatus.textContent = hasChanges ? 'Unsaved changes' : '';
  }
  // Redo: Ctrl+Y or Ctrl+Shift+Z
  if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
    e.preventDefault();
    const state = editorUndoManager.redo();
    restoreUndoState(editorTextarea, state, updateEditorPreview);
    // Update unsaved indicator
    const hasChanges = editorTextarea.value !== editorOriginalContent;
    editorStatus.textContent = hasChanges ? 'Unsaved changes' : '';
  }
});

// Screenshot edit button click handler (delegated)
editorPreview.addEventListener('click', (e) => {
  const editBtn = e.target.closest('[data-edit-screenshot]');
  if (editBtn && activeHistoryId) {
    const screenshotPath = editBtn.dataset.editScreenshot;
    // Extract just the filename from "screenshots/screenshot-001.png"
    const filename = screenshotPath.includes('/') ? screenshotPath.split('/').pop() : screenshotPath;
    openScreenshotEditor(activeHistoryId, filename);
  }
});

editorBackBtn.addEventListener('click', () => {
  const hasChanges = editorTextarea.value !== editorOriginalContent;
  if (hasChanges) {
    if (!confirm('You have unsaved changes. Discard them?')) {
      return;
    }
  }
  showWelcomePanel();
});

editorSaveBtn.addEventListener('click', async () => {
  try {
    const result = await window.electronAPI.saveRecordingMarkdown(activeHistoryId, editorTextarea.value);

    if (result.success) {
      editorOriginalContent = editorTextarea.value;
      editorStatus.textContent = 'Saved';
      statusText.textContent = 'Markdown saved';
      setTimeout(() => {
        if (editorStatus.textContent === 'Saved') {
          editorStatus.textContent = '';
        }
      }, 2000);
    } else {
      statusText.textContent = result.error || 'Failed to save';
    }
  } catch (error) {
    console.error('Error saving:', error);
    statusText.textContent = `Error: ${error.message}`;
  }
});

editorDiscardBtn.addEventListener('click', () => {
  if (editorTextarea.value === editorOriginalContent) {
    return;
  }
  if (confirm('Discard all changes?')) {
    editorTextarea.value = editorOriginalContent;
    updateEditorPreview();
    editorStatus.textContent = '';
  }
});

// Editor markdown toolbar
if (editorMdToolbar) {
  editorMdToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-editor-md]');
    if (!btn) return;

    // Push state before toolbar modification for undo
    pushUndoState(editorTextarea, editorUndoManager);

    const type = btn.dataset.editorMd;
    const start = editorTextarea.selectionStart;
    const end = editorTextarea.selectionEnd;
    const text = editorTextarea.value;
    const selected = text.substring(start, end);

    let before = '', after = '', insert = '';

    switch (type) {
      case 'bold': before = '**'; after = '**'; insert = selected || 'text'; break;
      case 'italic': before = '*'; after = '*'; insert = selected || 'text'; break;
      case 'code': before = '`'; after = '`'; insert = selected || 'code'; break;
      case 'link': before = '['; after = '](url)'; insert = selected || 'link text'; break;
      case 'h1': before = '# '; after = ''; insert = selected || 'Heading'; break;
      case 'h2': before = '## '; after = ''; insert = selected || 'Heading'; break;
      case 'ul': before = '- '; after = ''; insert = selected || 'item'; break;
      case 'ol': before = '1. '; after = ''; insert = selected || 'item'; break;
    }

    editorTextarea.value = text.substring(0, start) + before + insert + after + text.substring(end);
    editorTextarea.focus();
    editorTextarea.selectionStart = start + before.length;
    editorTextarea.selectionEnd = start + before.length + insert.length;
    updateEditorPreview();

    // Push state after toolbar modification for redo
    pushUndoState(editorTextarea, editorUndoManager);

    // Update unsaved indicator
    const hasChanges = editorTextarea.value !== editorOriginalContent;
    editorStatus.textContent = hasChanges ? 'Unsaved changes' : '';
  });
}

// Editor toolbar undo/redo buttons
const editorUndoBtn = document.getElementById('editorUndoBtn');
const editorRedoBtn = document.getElementById('editorRedoBtn');

if (editorUndoBtn) {
  editorUndoBtn.addEventListener('click', () => {
    const state = editorUndoManager.undo();
    restoreUndoState(editorTextarea, state, updateEditorPreview);
    // Update unsaved indicator
    const hasChanges = editorTextarea.value !== editorOriginalContent;
    editorStatus.textContent = hasChanges ? 'Unsaved changes' : '';
  });
}

if (editorRedoBtn) {
  editorRedoBtn.addEventListener('click', () => {
    const state = editorUndoManager.redo();
    restoreUndoState(editorTextarea, state, updateEditorPreview);
    // Update unsaved indicator
    const hasChanges = editorTextarea.value !== editorOriginalContent;
    editorStatus.textContent = hasChanges ? 'Unsaved changes' : '';
  });
}

// Keyboard shortcuts are now handled above in the screenshot button section

// ===== Screenshot Editor =====

const screenshotEditor = {
  isOpen: false,
  recordingId: null,
  filename: null,
  imagePath: null,
  originalImage: null,
  canvas: null,
  ctx: null,
  regions: [],       // blur/redact regions
  annotations: [],   // arrows, circles, etc.
  currentTool: 'blur',
  isDrawing: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  strokeColor: '#ff0000',
  strokeWidth: 3,
  redactColor: '#000000',
  calloutCounter: 1,
  scale: 1,
};

// Screenshot editor DOM elements
const screenshotEditorModal = document.getElementById('screenshotEditorModal');
const editorCanvasEl = document.getElementById('editorCanvas');
const editorCanvasContainer = document.getElementById('editorCanvasContainer');

// Tool buttons
const editorToolBlur = document.getElementById('editorToolBlur');
const editorToolRedact = document.getElementById('editorToolRedact');
const editorToolPixelate = document.getElementById('editorToolPixelate');
const editorToolArrow = document.getElementById('editorToolArrow');
const editorToolCircle = document.getElementById('editorToolCircle');
const editorToolRect = document.getElementById('editorToolRect');
const editorToolText = document.getElementById('editorToolText');
const editorToolCallout = document.getElementById('editorToolCallout');

// Controls - IDs must match index.html (prefixed with ss_ to avoid conflicts with markdown editor)
const ssEditorColorInput = document.getElementById('editorColor');
const ssEditorStrokeWidthSelect = document.getElementById('editorStrokeWidth');
const ssEditorUndoBtn = document.getElementById('editorUndo');
const ssEditorClearBtn = document.getElementById('editorClear');
const ssEditorSaveBtn = document.getElementById('editorSave');
const ssEditorCancelBtn = document.getElementById('editorCancel');

// Text input modal
const textInputModal = document.getElementById('textInputModal');
const textInputField = document.getElementById('textInputField');
const textInputSizeSelect = document.getElementById('textInputSize');
const textInputCancelBtn = document.getElementById('textInputCancel');
const textInputSaveBtn = document.getElementById('textInputSave');

/**
 * Open screenshot editor for a specific screenshot
 */
async function openScreenshotEditor(recordingId, filename) {
  try {
    // Get the full path to the screenshot and any existing edits
    const result = await window.electronAPI.getScreenshotPath(recordingId, filename);
    if (!result.success) {
      statusText.textContent = result.error || 'Failed to load screenshot';
      return;
    }

    screenshotEditor.recordingId = recordingId;
    screenshotEditor.filename = filename;
    screenshotEditor.imagePath = result.path;
    // Load existing edits if any
    screenshotEditor.regions = result.blurRegions || [];
    screenshotEditor.annotations = result.annotations || [];
    // Set callout counter to continue from existing callouts
    const maxCallout = screenshotEditor.annotations
      .filter(a => a.type === 'callout')
      .reduce((max, a) => Math.max(max, a.number || 0), 0);
    screenshotEditor.calloutCounter = maxCallout + 1;
    screenshotEditor.currentTool = 'blur';
    screenshotEditor.isOpen = true;

    // Load the image
    const img = new Image();
    img.onload = () => {
      screenshotEditor.originalImage = img;

      // Set canvas size to image size
      screenshotEditor.canvas = editorCanvasEl;
      screenshotEditor.ctx = editorCanvasEl.getContext('2d');

      editorCanvasEl.width = img.width;
      editorCanvasEl.height = img.height;

      // Calculate scale to fit in container
      const container = editorCanvasContainer;
      const maxWidth = container.clientWidth - 32;
      const maxHeight = container.clientHeight - 32;
      const scaleX = maxWidth / img.width;
      const scaleY = maxHeight / img.height;
      screenshotEditor.scale = Math.min(1, scaleX, scaleY);

      // Set display size (scaled)
      editorCanvasEl.style.width = (img.width * screenshotEditor.scale) + 'px';
      editorCanvasEl.style.height = (img.height * screenshotEditor.scale) + 'px';

      // Draw the image
      redrawEditorCanvas();

      // Update tool selection
      updateEditorToolSelection();
    };

    img.onerror = () => {
      statusText.textContent = 'Failed to load image';
      screenshotEditor.isOpen = false;
    };

    // Load image with file:// protocol
    img.src = 'file:///' + result.path.replace(/\\/g, '/');

    // Show modal
    screenshotEditorModal.classList.remove('hidden');

  } catch (error) {
    console.error('Error opening screenshot editor:', error);
    statusText.textContent = `Error: ${error.message}`;
  }
}

/**
 * Close screenshot editor
 */
function closeScreenshotEditor() {
  screenshotEditor.isOpen = false;
  screenshotEditorModal.classList.add('hidden');
}

/**
 * Redraw the canvas with image, regions, and annotations
 */
function redrawEditorCanvas() {
  const { ctx, canvas, originalImage, regions, annotations } = screenshotEditor;
  if (!ctx || !originalImage) return;

  // Clear and draw original image
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(originalImage, 0, 0);

  // Draw blur/redact region previews (actual blur applied on save)
  for (const region of regions) {
    drawRegionPreview(ctx, region);
  }

  // Draw annotations
  for (const anno of annotations) {
    drawAnnotation(ctx, anno);
  }

  // Draw current selection preview
  if (screenshotEditor.isDrawing) {
    drawCurrentSelection(ctx);
  }
}

/**
 * Draw a blur/redact region preview
 */
function drawRegionPreview(ctx, region) {
  const { x, y, width, height, type, color } = region;

  ctx.save();

  if (type === 'redact') {
    ctx.fillStyle = color || '#000000';
    ctx.fillRect(x, y, width, height);
  } else if (type === 'pixelate') {
    // Draw pixelation preview (simplified grid pattern)
    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    const gridSize = 10;
    for (let gx = x; gx < x + width; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + height);
      ctx.stroke();
    }
    for (let gy = y; gy < y + height; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + width, gy);
      ctx.stroke();
    }
  } else {
    // Blur preview (semi-transparent overlay)
    ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  ctx.restore();
}

/**
 * Draw an annotation
 */
function drawAnnotation(ctx, anno) {
  ctx.save();

  const color = anno.color || '#ff0000';
  const strokeWidth = anno.strokeWidth || 3;

  switch (anno.type) {
    case 'arrow':
      drawArrowShape(ctx, anno.x1, anno.y1, anno.x2, anno.y2, color, strokeWidth);
      break;
    case 'circle':
      drawCircleShape(ctx, anno.cx, anno.cy, anno.radius, color, strokeWidth);
      break;
    case 'rectangle':
      drawRectOutline(ctx, anno.x, anno.y, anno.width, anno.height, color, strokeWidth);
      break;
    case 'text':
      drawTextShape(ctx, anno.x, anno.y, anno.text, color, anno.fontSize || 16);
      break;
    case 'callout':
      drawCalloutShape(ctx, anno.x, anno.y, anno.number, color);
      break;
  }

  ctx.restore();
}

/**
 * Draw an arrow
 */
function drawArrowShape(ctx, x1, y1, x2, y2, color, strokeWidth) {
  const headLen = 15;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';

  // Line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

/**
 * Draw a circle
 */
function drawCircleShape(ctx, cx, cy, radius, color, strokeWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Draw a rectangle outline
 */
function drawRectOutline(ctx, x, y, width, height, color, strokeWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.strokeRect(x, y, width, height);
}

/**
 * Draw text with outline for readability
 */
function drawTextShape(ctx, x, y, text, color, fontSize) {
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'top';

  // White outline
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);

  // Colored fill
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/**
 * Draw a numbered callout badge
 */
function drawCalloutShape(ctx, x, y, number, color) {
  const radius = 14;

  // Circle background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Number
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), x, y);
}

/**
 * Draw the current selection being drawn
 */
function drawCurrentSelection(ctx) {
  const { currentTool, startX, startY, currentX, currentY, strokeColor, strokeWidth, redactColor } = screenshotEditor;

  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  ctx.save();
  ctx.setLineDash([5, 5]);

  if (['blur', 'redact', 'pixelate'].includes(currentTool)) {
    ctx.strokeStyle = currentTool === 'redact' ? redactColor : '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  } else if (currentTool === 'arrow') {
    drawArrowShape(ctx, startX, startY, currentX, currentY, strokeColor, strokeWidth);
  } else if (currentTool === 'circle') {
    const cx = (startX + currentX) / 2;
    const cy = (startY + currentY) / 2;
    const radius = Math.sqrt(width * width + height * height) / 2;
    drawCircleShape(ctx, cx, cy, radius, strokeColor, strokeWidth);
  } else if (currentTool === 'rectangle') {
    drawRectOutline(ctx, x, y, width, height, strokeColor, strokeWidth);
  }

  ctx.restore();
}

/**
 * Get canvas coordinates from mouse event
 */
function getCanvasCoords(e) {
  const rect = editorCanvasEl.getBoundingClientRect();
  const scale = screenshotEditor.scale;
  return {
    x: (e.clientX - rect.left) / scale,
    y: (e.clientY - rect.top) / scale
  };
}

/**
 * Update tool button selection state
 */
function updateEditorToolSelection() {
  const tools = [
    editorToolBlur, editorToolRedact, editorToolPixelate,
    editorToolArrow, editorToolCircle, editorToolRect,
    editorToolText, editorToolCallout
  ];

  const toolNames = ['blur', 'redact', 'pixelate', 'arrow', 'circle', 'rectangle', 'text', 'callout'];

  tools.forEach((btn, i) => {
    if (btn) {
      const isActive = toolNames[i] === screenshotEditor.currentTool;
      btn.classList.toggle('active', isActive);
    }
  });
}

// Text input modal state
let pendingTextPosition = null;

function showTextInputModal() {
  if (textInputField) textInputField.value = '';
  if (textInputModal) {
    textInputModal.classList.remove('hidden');
    textInputField?.focus();
  }
}

function hideTextInputModal() {
  if (textInputModal) textInputModal.classList.add('hidden');
  pendingTextPosition = null;
}

// Canvas event handlers
if (editorCanvasEl) {
  editorCanvasEl.addEventListener('mousedown', (e) => {
    if (!screenshotEditor.isOpen) return;

    const coords = getCanvasCoords(e);
    screenshotEditor.startX = coords.x;
    screenshotEditor.startY = coords.y;
    screenshotEditor.currentX = coords.x;
    screenshotEditor.currentY = coords.y;

    // For text and callout, we just need a single click
    if (screenshotEditor.currentTool === 'text') {
      pendingTextPosition = { x: coords.x, y: coords.y };
      showTextInputModal();
      return;
    }

    if (screenshotEditor.currentTool === 'callout') {
      screenshotEditor.annotations.push({
        type: 'callout',
        x: coords.x,
        y: coords.y,
        number: screenshotEditor.calloutCounter++,
        color: screenshotEditor.strokeColor
      });
      redrawEditorCanvas();
      return;
    }

    screenshotEditor.isDrawing = true;
  });

  editorCanvasEl.addEventListener('mousemove', (e) => {
    if (!screenshotEditor.isDrawing) return;

    const coords = getCanvasCoords(e);
    screenshotEditor.currentX = coords.x;
    screenshotEditor.currentY = coords.y;
    redrawEditorCanvas();
  });

  editorCanvasEl.addEventListener('mouseup', (e) => {
    if (!screenshotEditor.isDrawing) return;
    screenshotEditor.isDrawing = false;

    const coords = getCanvasCoords(e);
    const { currentTool, startX, startY, strokeColor, strokeWidth, redactColor } = screenshotEditor;

    const x = Math.min(startX, coords.x);
    const y = Math.min(startY, coords.y);
    const width = Math.abs(coords.x - startX);
    const height = Math.abs(coords.y - startY);

    // Ignore tiny selections
    if (width < 5 && height < 5) {
      redrawEditorCanvas();
      return;
    }

    if (['blur', 'redact', 'pixelate'].includes(currentTool)) {
      screenshotEditor.regions.push({
        type: currentTool,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        color: currentTool === 'redact' ? redactColor : undefined
      });
    } else if (currentTool === 'arrow') {
      screenshotEditor.annotations.push({
        type: 'arrow',
        x1: Math.round(startX),
        y1: Math.round(startY),
        x2: Math.round(coords.x),
        y2: Math.round(coords.y),
        color: strokeColor,
        strokeWidth: strokeWidth
      });
    } else if (currentTool === 'circle') {
      const cx = (startX + coords.x) / 2;
      const cy = (startY + coords.y) / 2;
      const radius = Math.sqrt(width * width + height * height) / 2;
      screenshotEditor.annotations.push({
        type: 'circle',
        cx: Math.round(cx),
        cy: Math.round(cy),
        radius: Math.round(radius),
        color: strokeColor,
        strokeWidth: strokeWidth
      });
    } else if (currentTool === 'rectangle') {
      screenshotEditor.annotations.push({
        type: 'rectangle',
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        color: strokeColor,
        strokeWidth: strokeWidth
      });
    }

    redrawEditorCanvas();
  });

  editorCanvasEl.addEventListener('mouseleave', () => {
    if (screenshotEditor.isDrawing) {
      screenshotEditor.isDrawing = false;
      redrawEditorCanvas();
    }
  });
}

// Tool button handlers
const toolButtons = [
  [editorToolBlur, 'blur'],
  [editorToolRedact, 'redact'],
  [editorToolPixelate, 'pixelate'],
  [editorToolArrow, 'arrow'],
  [editorToolCircle, 'circle'],
  [editorToolRect, 'rectangle'],
  [editorToolText, 'text'],
  [editorToolCallout, 'callout']
];

toolButtons.forEach(([btn, tool]) => {
  if (btn) {
    btn.addEventListener('click', () => {
      screenshotEditor.currentTool = tool;
      updateEditorToolSelection();
    });
  }
});

// Color and stroke controls
if (ssEditorColorInput) {
  ssEditorColorInput.addEventListener('input', (e) => {
    screenshotEditor.strokeColor = e.target.value;
  });
}

if (ssEditorStrokeWidthSelect) {
  ssEditorStrokeWidthSelect.addEventListener('change', (e) => {
    screenshotEditor.strokeWidth = parseInt(e.target.value) || 3;
  });
}

// Undo button
if (ssEditorUndoBtn) {
  ssEditorUndoBtn.addEventListener('click', () => {
    // Remove last item (either region or annotation)
    const lastAnno = screenshotEditor.annotations.length > 0 ? screenshotEditor.annotations[screenshotEditor.annotations.length - 1] : null;

    // Simple undo: prefer removing from whichever array has items
    if (screenshotEditor.annotations.length > 0 && screenshotEditor.annotations.length >= screenshotEditor.regions.length) {
      screenshotEditor.annotations.pop();
      // Decrement callout counter if we removed a callout
      if (lastAnno && lastAnno.type === 'callout') {
        screenshotEditor.calloutCounter = Math.max(1, screenshotEditor.calloutCounter - 1);
      }
    } else if (screenshotEditor.regions.length > 0) {
      screenshotEditor.regions.pop();
    }

    redrawEditorCanvas();
  });
}

// Clear button
if (ssEditorClearBtn) {
  ssEditorClearBtn.addEventListener('click', () => {
    if (confirm('Clear all edits?')) {
      screenshotEditor.regions = [];
      screenshotEditor.annotations = [];
      screenshotEditor.calloutCounter = 1;
      redrawEditorCanvas();
    }
  });
}

// Reset to Original button
const ssEditorResetBtn = document.getElementById('editorReset');
if (ssEditorResetBtn) {
  ssEditorResetBtn.addEventListener('click', async () => {
    if (!confirm('Reset to original? This will permanently remove all saved edits for this screenshot.')) {
      return;
    }

    try {
      statusText.textContent = 'Resetting to original...';

      const result = await window.electronAPI.resetScreenshotToOriginal({
        recordingId: screenshotEditor.recordingId,
        filename: screenshotEditor.filename
      });

      if (result.success) {
        // Clear local state
        screenshotEditor.regions = [];
        screenshotEditor.annotations = [];
        screenshotEditor.calloutCounter = 1;

        // Reload the image
        const img = new Image();
        img.onload = () => {
          screenshotEditor.originalImage = img;
          redrawEditorCanvas();
          statusText.textContent = 'Reset to original successfully';
        };
        img.onerror = () => {
          statusText.textContent = 'Failed to reload image';
        };
        // Add cache buster to force reload
        img.src = 'file:///' + screenshotEditor.imagePath.replace(/\\/g, '/') + '?t=' + Date.now();

        // Update cache buster for markdown preview
        imageCacheBuster = Date.now();
      } else {
        statusText.textContent = result.error || 'Failed to reset';
      }
    } catch (error) {
      console.error('Error resetting screenshot:', error);
      statusText.textContent = `Error: ${error.message}`;
    }
  });
}

// Cancel button
if (ssEditorCancelBtn) {
  ssEditorCancelBtn.addEventListener('click', () => {
    const hasEdits = screenshotEditor.regions.length > 0 || screenshotEditor.annotations.length > 0;
    if (hasEdits && !confirm('Discard all edits?')) {
      return;
    }
    closeScreenshotEditor();
  });
}

// Save button
if (ssEditorSaveBtn) {
  ssEditorSaveBtn.addEventListener('click', async () => {
    try {
      statusText.textContent = 'Saving edits...';

      const result = await window.electronAPI.saveScreenshotEdits({
        recordingId: screenshotEditor.recordingId,
        filename: screenshotEditor.filename,
        blurRegions: screenshotEditor.regions,
        annotations: screenshotEditor.annotations
      });

      if (result.success) {
        statusText.textContent = 'Screenshot edits saved';
        closeScreenshotEditor();

        // Update cache buster to force image reload
        imageCacheBuster = Date.now();

        // Refresh the editor preview if viewing this recording
        if (activeHistoryId === screenshotEditor.recordingId) {
          await openEditor(screenshotEditor.recordingId);
        }
      } else {
        statusText.textContent = result.error || 'Failed to save edits';
      }
    } catch (error) {
      console.error('Error saving screenshot edits:', error);
      statusText.textContent = `Error: ${error.message}`;
    }
  });
}

// Text input modal handlers
if (textInputCancelBtn) {
  textInputCancelBtn.addEventListener('click', hideTextInputModal);
}

if (textInputSaveBtn) {
  textInputSaveBtn.addEventListener('click', () => {
    const text = textInputField?.value?.trim();
    const fontSize = parseInt(textInputSizeSelect?.value) || 18;
    if (text && pendingTextPosition) {
      screenshotEditor.annotations.push({
        type: 'text',
        x: Math.round(pendingTextPosition.x),
        y: Math.round(pendingTextPosition.y),
        text: text,
        color: screenshotEditor.strokeColor,
        fontSize: fontSize
      });
      redrawEditorCanvas();
    }
    hideTextInputModal();
  });
}

if (textInputField) {
  textInputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textInputSaveBtn?.click();
    }
    if (e.key === 'Escape') {
      hideTextInputModal();
    }
  });
}

// Escape key to close editor
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && screenshotEditor.isOpen && textInputModal && !textInputModal.classList.contains('hidden')) {
    hideTextInputModal();
  } else if (e.key === 'Escape' && screenshotEditor.isOpen) {
    ssEditorCancelBtn?.click();
  }
});

// ===== Initialize =====

init();
