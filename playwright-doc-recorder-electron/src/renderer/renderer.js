// DOM Elements
const sidebar = document.getElementById('sidebar');
const historyList = document.getElementById('historyList');
const webview = document.getElementById('webview');
const urlInput = document.getElementById('urlInput');
const recentUrlsDatalist = document.getElementById('recentUrls');
const goBtn = document.getElementById('goBtn');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const refreshBtn = document.getElementById('refreshBtn');
const recordBtn = document.getElementById('recordBtn');
const screenshotBtn = document.getElementById('screenshotBtn');
const noteBtn = document.getElementById('noteBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const statusText = document.getElementById('statusText');
const recordingStatus = document.getElementById('recordingStatus');
const actionCount = document.getElementById('actionCount');
const screenshotCount = document.getElementById('screenshotCount');
const viewportInfo = document.getElementById('viewportInfo');

// Panel buttons
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

// New Project modal elements (keeping for compatibility)
const newProjectModal = document.getElementById('newProjectModal');
const closeNewProject = document.getElementById('closeNewProject');
const cancelNewProject = document.getElementById('cancelNewProject');
const startProject = document.getElementById('startProject');
const projectUrl = document.getElementById('projectUrl');
const projectTitle = document.getElementById('projectTitle');
const projectOutputDir = document.getElementById('projectOutputDir');
const browseProjectDir = document.getElementById('browseProjectDir');
const projectViewportPreset = document.getElementById('projectViewportPreset');
const projectViewportWidth = document.getElementById('projectViewportWidth');
const projectViewportHeight = document.getElementById('projectViewportHeight');

// Welcome panel elements
const welcomePanel = document.getElementById('welcomePanel');
const welcomeUrl = document.getElementById('welcomeUrl');
const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeOutputDir = document.getElementById('welcomeOutputDir');
const welcomeBrowseDir = document.getElementById('welcomeBrowseDir');
const welcomeViewportWidth = document.getElementById('welcomeViewportWidth');
const welcomeViewportHeight = document.getElementById('welcomeViewportHeight');
const welcomeStartBtn = document.getElementById('welcomeStartBtn');

// Shortcuts panel
const shortcutsPanel = document.getElementById('shortcutsPanel');
const closeShortcuts = document.getElementById('closeShortcuts');

// State
let isRecording = false;
let currentSettings = null;
let pendingScreenshot = null;

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

    // Set webview preload script
    const preloadPath = window.electronAPI.getWebviewPreloadPath();
    console.log('Webview preload path:', preloadPath);
    webview.setAttribute('preload', preloadPath);

    currentSettings = await window.electronAPI.getSettings();
    console.log('Settings loaded:', currentSettings);

    updateViewportInfo();
    populateRecentUrls();
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
  }
}

function updateViewportInfo() {
  if (currentSettings) {
    const { width, height } = currentSettings.viewport;
    viewportInfo.textContent = `${width} x ${height}`;
  }
}

function populateRecentUrls() {
  recentUrlsDatalist.innerHTML = '';
  if (currentSettings?.recentUrls) {
    currentSettings.recentUrls.forEach(url => {
      const option = document.createElement('option');
      option.value = url;
      recentUrlsDatalist.appendChild(option);
    });
  }
}

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

goBtn.addEventListener('click', () => navigateTo(urlInput.value));

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    navigateTo(urlInput.value);
  }
});

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
  if (isRecording && e.url !== 'about:blank') {
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
        const { selector, note, withNote } = args[0];
        if (withNote) {
          pendingScreenshot = { selector };
          showNoteDialog();
        } else {
          await captureScreenshot(selector, note);
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

// ===== Welcome Panel =====

welcomeBrowseDir.addEventListener('click', async () => {
  const result = await window.electronAPI.selectOutputDir();
  if (result.success) {
    welcomeOutputDir.value = result.path;
    // Also update settings
    await window.electronAPI.saveSettings({ outputDir: result.path });
    currentSettings.outputDir = result.path;
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
  if (!url) {
    welcomeUrl.focus();
    return;
  }

  // Get viewport from form
  const viewport = {
    width: parseInt(welcomeViewportWidth.value) || 1280,
    height: parseInt(welcomeViewportHeight.value) || 720
  };

  // Update settings if output dir changed
  if (welcomeOutputDir.value && welcomeOutputDir.value !== currentSettings.outputDir) {
    await window.electronAPI.saveSettings({ outputDir: welcomeOutputDir.value });
    currentSettings.outputDir = welcomeOutputDir.value;
  }

  // Hide welcome panel and show webview
  welcomePanel.style.display = 'none';
  webview.classList.remove('hidden');

  // Show record button in toolbar
  recordBtn.style.display = 'flex';

  // Navigate to URL first
  navigateTo(url);

  // Wait for page to load, then start recording
  webview.addEventListener('did-stop-loading', async function onLoad() {
    webview.removeEventListener('did-stop-loading', onLoad);
    await startRecording(url, welcomeTitle.value, viewport);
  }, { once: true });
}

function showWelcomePanel() {
  // Reset form
  welcomeUrl.value = '';
  welcomeTitle.value = '';
  populateWelcomePanel();

  // Show welcome panel, hide webview
  welcomePanel.style.display = 'flex';
  webview.classList.add('hidden');
  webview.src = 'about:blank';

  // Hide record button
  recordBtn.style.display = 'none';

  // Focus URL input
  setTimeout(() => welcomeUrl.focus(), 100);
}

// ===== New Project Modal (legacy, keeping for compatibility) =====

function showNewProjectModal() {
  // Now we use the welcome panel instead
  showWelcomePanel();
}

function hideNewProjectModal() {
  if (newProjectModal) newProjectModal.style.display = 'none';
}

if (closeNewProject) closeNewProject.addEventListener('click', hideNewProjectModal);
if (cancelNewProject) cancelNewProject.addEventListener('click', hideNewProjectModal);

if (browseProjectDir) {
  browseProjectDir.addEventListener('click', async () => {
    const result = await window.electronAPI.selectOutputDir();
    if (result.success) {
      projectOutputDir.value = result.path;
    }
  });
}

if (projectViewportPreset) {
  projectViewportPreset.addEventListener('change', (e) => {
    if (e.target.value) {
      const [width, height] = e.target.value.split('x').map(Number);
      projectViewportWidth.value = width;
      projectViewportHeight.value = height;
    }
  });
}

if (startProject) {
  startProject.addEventListener('click', async () => {
    const url = projectUrl.value.trim();
    if (!url) {
      projectUrl.focus();
      return;
    }

    const viewport = {
      width: parseInt(projectViewportWidth.value) || 1280,
      height: parseInt(projectViewportHeight.value) || 720
    };

    if (projectOutputDir.value && projectOutputDir.value !== currentSettings.outputDir) {
      await window.electronAPI.saveSettings({ outputDir: projectOutputDir.value });
      currentSettings.outputDir = projectOutputDir.value;
    }

    hideNewProjectModal();
    navigateTo(url);

    webview.addEventListener('did-stop-loading', async function onLoad() {
      webview.removeEventListener('did-stop-loading', onLoad);
      await startRecording(url, projectTitle.value, viewport);
    }, { once: true });
  });
}

if (projectUrl) {
  projectUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      startProject.click();
    }
  });
}

async function startRecording(url, title, viewport) {
  const result = await window.electronAPI.startRecording(url || webview.src, {
    title: title || null,
    viewport: viewport || currentSettings.viewport
  });

  if (result.success) {
    isRecording = true;

    // Ensure webview is visible and welcome panel is hidden
    welcomePanel.style.display = 'none';
    webview.classList.remove('hidden');
    recordBtn.style.display = 'flex';

    // Update record button styling for active state
    recordBtn.classList.add('recording-active', 'bg-coral-500', 'hover:bg-coral-400', 'border-coral-500');
    recordBtn.classList.remove('bg-slate-800', 'hover:bg-slate-700', 'border-slate-700');
    recordBtn.querySelector('.record-dot').classList.add('bg-white', 'animate-pulse-recording');
    recordBtn.querySelector('.record-dot').classList.remove('bg-slate-500', 'group-hover:bg-coral-500');
    recordBtn.querySelector('.record-text').textContent = 'Stop';

    screenshotBtn.disabled = false;
    noteBtn.disabled = false;
    recordingStatus.style.display = 'flex';
    actionCount.textContent = '0';
    screenshotCount.textContent = '0';
    statusText.textContent = 'Recording...';

    // Show screenshot section and clear previous
    const screenshotSection = document.getElementById('screenshotSection');
    const screenshotPreviews = document.getElementById('screenshotPreviews');
    if (screenshotSection) screenshotSection.style.display = 'block';
    if (screenshotPreviews) screenshotPreviews.innerHTML = '';

    // Show shortcuts panel
    if (shortcutsPanel) shortcutsPanel.classList.remove('hidden');

    // Notify webview that recording started
    webview.send('recording-started');
  }
}

async function stopRecording() {
  const result = await window.electronAPI.stopRecording();

  isRecording = false;

  // Reset record button styling
  recordBtn.classList.remove('recording-active', 'bg-coral-500', 'hover:bg-coral-400', 'border-coral-500');
  recordBtn.classList.add('bg-slate-800', 'hover:bg-slate-700', 'border-slate-700');
  recordBtn.querySelector('.record-dot').classList.remove('bg-white', 'animate-pulse-recording');
  recordBtn.querySelector('.record-dot').classList.add('bg-slate-500', 'group-hover:bg-coral-500');
  recordBtn.querySelector('.record-text').textContent = 'Record';

  screenshotBtn.disabled = true;
  noteBtn.disabled = true;
  recordingStatus.style.display = 'none';

  // Hide shortcuts panel
  if (shortcutsPanel) shortcutsPanel.classList.add('hidden');

  // Notify webview that recording stopped
  webview.send('recording-stopped');

  if (result.success) {
    statusText.innerHTML = `Saved: ${result.recording.actionCount} actions, ${result.recording.screenshotCount} screenshots - <a href="#" id="openLastRecording">Open folder</a>`;

    // Add click handler for the link
    document.getElementById('openLastRecording')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.electronAPI.openRecordingFolder(result.recording.id);
    });

    loadHistory();

    // Show welcome panel again after a brief delay
    setTimeout(() => {
      showWelcomePanel();
      statusText.textContent = 'Ready';
    }, 2000);
  } else {
    statusText.textContent = `Error: ${result.error}`;
  }
}

// ===== Screenshots =====

screenshotBtn.addEventListener('click', async () => {
  if (isRecording) {
    await captureScreenshot(null, null);
  }
});

// Note button - add standalone note without screenshot
noteBtn.addEventListener('click', () => {
  if (isRecording) {
    pendingScreenshot = null; // null means standalone note
    showNoteDialog('Add Note', false);
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
  if (!isRecording) return;
  if (!e.ctrlKey || !e.shiftKey) return;

  if (e.code === 'KeyK') {
    e.preventDefault();
    pendingScreenshot = { selector: null };
    showNoteDialog('Screenshot with Note', true);
  }
  if (e.code === 'KeyS') {
    e.preventDefault();
    await captureScreenshot(null, null);
  }
  if (e.code === 'KeyN') {
    e.preventDefault();
    pendingScreenshot = null;
    showNoteDialog('Add Note', false);
  }
});

async function captureScreenshot(selector, note) {
  try {
    console.log('Capturing screenshot...', { selector, note });

    // Capture the webview content
    const image = await webview.capturePage();
    const dataUrl = image.toDataURL();

    console.log('Image captured, size:', dataUrl.length);

    const result = await window.electronAPI.captureScreenshot({
      selector,
      note,
      imageDataUrl: dataUrl
    });

    if (result.success) {
      const count = parseInt(screenshotCount.textContent) + 1;
      screenshotCount.textContent = count;
      statusText.textContent = `Screenshot saved: ${result.filename}`;

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
    await captureScreenshot(pendingScreenshot?.selector || null, noteText || null);
  } else if (noteText) {
    // Standalone note
    await addStandaloneNote(noteText);
  }

  hideNoteDialog();
});

async function addStandaloneNote(note) {
  try {
    const result = await window.electronAPI.recordAction({ type: 'note', note });
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
});

// Markdown toolbar
mdToolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-md]');
  if (!btn) return;

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
});

// ===== Panel Buttons =====

if (panelScreenshotBtn) {
  panelScreenshotBtn.addEventListener('click', async () => {
    if (isRecording) {
      await captureScreenshot(null, null);
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

// ===== History Actions =====

historyList.addEventListener('click', async (e) => {
  const item = e.target.closest('.history-item');
  if (!item) return;

  const id = item.dataset.id;
  const action = e.target.closest('button')?.dataset.action;

  if (action === 'open') {
    await window.electronAPI.openRecordingFolder(id);
  } else if (action === 'delete') {
    if (confirm('Delete this recording?')) {
      await window.electronAPI.deleteRecording(id);
      loadHistory();
    }
  }
});

// ===== Toggle Sidebar =====

document.getElementById('toggleSidebar').addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Keyboard shortcuts are now handled above in the screenshot button section

// ===== Initialize =====

init();
