/* global marked */

// DOM Elements
const sidebar = document.getElementById('sidebar');
const historyList = document.getElementById('historyList');
const webview = document.getElementById('webview');
const webviewContainer = document.getElementById('webviewContainer');
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

// Project list elements
const projectListPanel = document.getElementById('projectListPanel');
const projectGrid = document.getElementById('projectGrid');
const newProjectBtn = document.getElementById('newProjectBtn');

// Project header elements (sidebar)
const projectHeader = document.getElementById('projectHeader');
const recordingsHeader = document.getElementById('recordingsHeader');
const backToProjectsBtn = document.getElementById('backToProjectsBtn');
const projectColorDot = document.getElementById('projectColorDot');
const projectInitials = document.getElementById('projectInitials');
const projectHeaderName = document.getElementById('projectHeaderName');
const editProjectBtn = document.getElementById('editProjectBtn');
const refetchAllBtn = document.getElementById('refetchAllBtn');
const historySection = document.getElementById('historySection');
const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
const sidebarExpandBtn = document.getElementById('sidebarExpandBtn');

// Project modal elements
const projectModal = document.getElementById('projectModal');
const projectModalTitle = document.getElementById('projectModalTitle');
const projectNameInput = document.getElementById('projectNameInput');
const projectFolderInput = document.getElementById('projectFolderInput');
const projectBrowseFolder = document.getElementById('projectBrowseFolder');
const projectDescInput = document.getElementById('projectDescInput');
const projectColorPicker = document.getElementById('projectColorPicker');
const projectSiteUrl = document.getElementById('projectSiteUrl');
const projectViewportPreset = document.getElementById('projectViewportPreset');
const projectCustomViewport = document.getElementById('projectCustomViewport');
const projectViewportWidth = document.getElementById('projectViewportWidth');
const projectViewportHeight = document.getElementById('projectViewportHeight');
const projectInjectCSS = document.getElementById('projectInjectCSS');
const projectCSSOptions = document.getElementById('projectCSSOptions');
const projectCustomCSS = document.getElementById('projectCustomCSS');
const closeProjectModal = document.getElementById('closeProjectModal');
const cancelProjectBtn = document.getElementById('cancelProjectBtn');
const saveProjectBtn = document.getElementById('saveProjectBtn');
const deleteProjectBtn = document.getElementById('deleteProjectBtn');

// Move recording modal elements
const moveRecordingModal = document.getElementById('moveRecordingModal');
const closeMoveModal = document.getElementById('closeMoveModal');
const moveProjectList = document.getElementById('moveProjectList');

// Refetch progress modal elements
const refetchProgressModal = document.getElementById('refetchProgressModal');
const refetchModalTitle = document.getElementById('refetchModalTitle');
const refetchProgressView = document.getElementById('refetchProgressView');
const refetchProgressText = document.getElementById('refetchProgressText');
const refetchProgressCount = document.getElementById('refetchProgressCount');
const refetchProgressBar = document.getElementById('refetchProgressBar');
const refetchCurrentItem = document.getElementById('refetchCurrentItem');
const refetchSummaryView = document.getElementById('refetchSummaryView');
const refetchSummaryIcon = document.getElementById('refetchSummaryIcon');
const refetchSummaryText = document.getElementById('refetchSummaryText');
const refetchSummaryDetails = document.getElementById('refetchSummaryDetails');
const refetchErrorList = document.getElementById('refetchErrorList');
const refetchErrorItems = document.getElementById('refetchErrorItems');
const cancelRefetchBtn = document.getElementById('cancelRefetchBtn');
const doneRefetchBtn = document.getElementById('doneRefetchBtn');

// Welcome panel elements (new recording form)
const welcomePanel = document.getElementById('welcomePanel');
const welcomeUrl = document.getElementById('welcomeUrl');
const welcomeRecentUrls = document.getElementById('welcomeRecentUrls');
const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeOutputDir = document.getElementById('welcomeOutputDir');
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
const projectDefaultsInfo = document.getElementById('projectDefaultsInfo');
const customizeSettingsBtn = document.getElementById('customizeSettingsBtn');
const useDefaultsBtn = document.getElementById('useDefaultsBtn');
const customSettingsSection = document.getElementById('customSettingsSection');
const defaultViewportDisplay = document.getElementById('defaultViewportDisplay');
const defaultSeparatorDisplay = document.getElementById('defaultSeparatorDisplay');
const defaultCSSDisplay = document.getElementById('defaultCSSDisplay');

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
let activeHistoryId = null;
let currentRecordActions = true; // Track recordActions for re-sync after navigation
let currentCustomCSS = ''; // Track custom CSS for re-sync after navigation
let editorOriginalContent = '';
let editorRecordingDir = '';

// Project state
let allProjects = [];
let currentProjectId = null;
let currentProject = null;
let editingProjectId = null; // For project modal
let selectedProjectColor = '#14b8a6';
let useCustomSettings = false; // For new recording form
let pendingMoveRecordingId = null; // For move recording modal
let refetchCancelled = false; // For bulk refetch

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

// Get initials from project name (up to 2 characters)
function getProjectInitials(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

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

    // Load projects and show project list
    await loadProjects();

    // Setup project modal event handlers
    setupProjectModalHandlers();

    // Setup move recording modal handlers
    setupMoveRecordingModalHandlers();

    // Setup refetch handlers
    setupRefetchHandlers();

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

// ===== Project Management =====

async function loadProjects() {
  const data = await window.electronAPI.getProjects();
  allProjects = data.projects || [];

  // Check if we should auto-open last project
  if (data.lastOpenedProjectId) {
    const lastProject = allProjects.find(p => p.id === data.lastOpenedProjectId);
    if (lastProject) {
      await selectProject(lastProject);
      return;
    }
  }

  // Show project list
  showProjectList();
}

// Helper to check if editor has unsaved changes and confirm leaving
function isEditorDirty() {
  return editorPanel.style.display !== 'none' && editorTextarea.value !== editorOriginalContent;
}

function confirmLeaveEditor() {
  if (isEditorDirty()) {
    return confirm('You have unsaved changes. Discard them?');
  }
  return true;
}

function showProjectList() {
  if (!confirmLeaveEditor()) return;

  currentProjectId = null;
  currentProject = null;

  // Reset window title
  document.title = 'Documentation Recorder';

  // Hide other panels
  welcomePanel.style.display = 'none';
  editorPanel.style.display = 'none';
  webviewContainer.classList.add('hidden');
  toolbar.style.display = 'none';

  // Hide sidebar completely on projects landing page
  sidebar.style.display = 'none';

  // Show project list
  projectListPanel.style.display = '';
  renderProjectList();

  // Update status
  statusText.textContent = 'Select a project';
}

function renderProjectList() {
  if (!allProjects || allProjects.length === 0) {
    projectGrid.innerHTML = `
      <div class="text-center py-16 col-span-2 text-slate-600">
        <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <p class="text-sm">No projects yet</p>
        <p class="text-xs mt-1">Create a project to organize your recordings</p>
      </div>
    `;
    return;
  }

  projectGrid.innerHTML = allProjects.map(project => {
    const lastModified = new Date(project.updatedAt).toLocaleDateString();
    return `
      <div class="group p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 cursor-pointer transition-all" data-project-id="${project.id}">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" style="background-color: ${project.color}"></div>
            <h3 class="font-medium text-slate-200">${escapeHtml(project.name)}</h3>
          </div>
          <div class="flex items-center gap-1">
            <button class="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-all" data-action="open-folder" title="Open folder">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
            </button>
            <button class="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-all" data-action="edit-project" title="Edit project">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          </div>
        </div>
        ${project.description ? `<p class="text-xs text-slate-500 mb-3 line-clamp-2">${escapeHtml(project.description)}</p>` : ''}
        <div class="flex items-center gap-3 text-xs text-slate-600">
          <span>Modified ${lastModified}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function selectProject(project) {
  currentProjectId = project.id;
  currentProject = project;

  // Save as last opened
  await window.electronAPI.setLastOpenedProject(project.id);

  // Hide project list
  projectListPanel.style.display = 'none';

  // Show sidebar (expanded by default)
  sidebar.style.display = '';
  sidebar.classList.remove('collapsed');
  sidebarExpandBtn.style.display = 'none';

  // Update sidebar
  projectHeader.style.display = '';
  recordingsHeader.style.display = '';
  historySection.style.display = '';
  projectColorDot.style.backgroundColor = project.color;
  projectInitials.textContent = getProjectInitials(project.name);
  projectHeaderName.textContent = project.name;
  document.title = `${project.name} - Documentation Recorder`;

  // Load project recordings
  await loadProjectRecordings();

  // Show welcome panel (new recording form)
  showWelcomePanel();
}

async function loadProjectRecordings() {
  if (!currentProjectId) return;

  const recordings = await window.electronAPI.getProjectRecordings(currentProjectId);
  renderHistory(recordings);
}

// Project list click handler
projectGrid.addEventListener('click', async (e) => {
  const projectCard = e.target.closest('[data-project-id]');
  if (!projectCard) return;

  const projectId = projectCard.dataset.projectId;
  const editBtn = e.target.closest('[data-action="edit-project"]');
  const openFolderBtn = e.target.closest('[data-action="open-folder"]');

  if (openFolderBtn) {
    e.stopPropagation();
    await window.electronAPI.openProjectFolder(projectId);
    return;
  }

  if (editBtn) {
    e.stopPropagation();
    openProjectModal(projectId);
    return;
  }

  // Select the project
  const project = allProjects.find(p => p.id === projectId);
  if (project) {
    await selectProject(project);
  }
});

// New project button
if (newProjectBtn) {
  newProjectBtn.addEventListener('click', () => {
    openProjectModal(null);
  });
}

// Back to projects button
if (backToProjectsBtn) {
  backToProjectsBtn.addEventListener('click', async () => {
    await window.electronAPI.setLastOpenedProject(null);
    showProjectList();
  });
}

// Edit project button (in sidebar header)
if (editProjectBtn) {
  editProjectBtn.addEventListener('click', () => {
    if (currentProjectId) {
      openProjectModal(currentProjectId);
    }
  });
}

// Sidebar collapse/expand
function collapseSidebar() {
  sidebar.classList.add('collapsed');
  sidebarExpandBtn.style.display = '';
}

function expandSidebar() {
  sidebar.classList.remove('collapsed');
  sidebarExpandBtn.style.display = 'none';
}

if (sidebarCollapseBtn) {
  sidebarCollapseBtn.addEventListener('click', collapseSidebar);
}

if (sidebarExpandBtn) {
  sidebarExpandBtn.addEventListener('click', expandSidebar);
}

// ===== Project Modal =====

function openProjectModal(projectId = null) {
  editingProjectId = projectId;

  if (projectId) {
    // Edit mode
    const project = allProjects.find(p => p.id === projectId);
    if (!project) return;

    projectModalTitle.textContent = 'Edit Project';
    projectNameInput.value = project.name;
    projectFolderInput.value = project.folder || '';
    projectFolderInput.disabled = true; // Cannot change folder after creation
    projectBrowseFolder.disabled = true;
    projectBrowseFolder.style.opacity = '0.5';
    projectDescInput.value = project.description || '';
    selectedProjectColor = project.color;

    // Set viewport
    const vp = project.settings?.viewport || { width: 1680, height: 950 };
    const presetValue = `${vp.width}x${vp.height}`;
    const presetOption = projectViewportPreset.querySelector(`option[value="${presetValue}"]`);
    if (presetOption) {
      projectViewportPreset.value = presetValue;
      projectCustomViewport.style.display = 'none';
    } else {
      projectViewportPreset.value = 'custom';
      projectCustomViewport.style.display = 'flex';
      projectViewportWidth.value = vp.width;
      projectViewportHeight.value = vp.height;
    }

    // Set site URL
    projectSiteUrl.value = project.settings?.siteUrl || '';

    // Set CSS injection
    projectInjectCSS.checked = project.settings?.injectCSS || false;
    projectCustomCSS.value = project.settings?.customCSS || '';
    projectCSSOptions.style.display = projectInjectCSS.checked ? 'block' : 'none';

    saveProjectBtn.textContent = 'Save Changes';
    deleteProjectBtn.style.display = '';
  } else {
    // Create mode
    projectModalTitle.textContent = 'New Project';
    projectNameInput.value = '';
    projectNameInput.disabled = false;
    projectNameInput.readOnly = false;
    projectFolderInput.value = '';
    projectFolderInput.disabled = false;
    projectBrowseFolder.disabled = false;
    projectBrowseFolder.style.opacity = '1';
    projectDescInput.value = '';
    selectedProjectColor = '#14b8a6';
    projectSiteUrl.value = '';
    projectViewportPreset.value = '1680x950';
    projectCustomViewport.style.display = 'none';
    projectViewportWidth.value = '';
    projectViewportHeight.value = '';
    projectInjectCSS.checked = false;
    projectCustomCSS.value = '';
    projectCSSOptions.style.display = 'none';
    saveProjectBtn.textContent = 'Create Project';
    deleteProjectBtn.style.display = 'none';
  }

  // Update color picker selection
  updateColorPickerSelection();

  projectModal.style.display = 'flex';

  // Use setTimeout to ensure focus works after confirm dialogs
  setTimeout(() => {
    projectNameInput.focus();
  }, 50);
}

function closeProjectModalFn() {
  projectModal.style.display = 'none';
  editingProjectId = null;
}

function updateColorPickerSelection() {
  const buttons = projectColorPicker.querySelectorAll('button');
  buttons.forEach(btn => {
    const isSelected = btn.dataset.color === selectedProjectColor;
    btn.classList.toggle('ring-white', isSelected);
    btn.classList.toggle('ring-offset-2', isSelected);
    btn.classList.toggle('ring-offset-slate-900', isSelected);
  });
}

function setupProjectModalHandlers() {
  // Color picker
  projectColorPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-color]');
    if (btn) {
      selectedProjectColor = btn.dataset.color;
      updateColorPickerSelection();
    }
  });

  // Folder browse button
  projectBrowseFolder.addEventListener('click', async () => {
    const result = await window.electronAPI.selectProjectFolder();
    if (result.success) {
      projectFolderInput.value = result.path;
    }
  });

  // Viewport preset change
  projectViewportPreset.addEventListener('change', () => {
    projectCustomViewport.style.display = projectViewportPreset.value === 'custom' ? 'flex' : 'none';
  });

  // CSS injection toggle
  projectInjectCSS.addEventListener('change', () => {
    projectCSSOptions.style.display = projectInjectCSS.checked ? 'block' : 'none';
  });

  // Close modal
  closeProjectModal.addEventListener('click', closeProjectModalFn);
  cancelProjectBtn.addEventListener('click', closeProjectModalFn);

  // Save project
  saveProjectBtn.addEventListener('click', async () => {
    const name = projectNameInput.value.trim();
    if (!name) {
      projectNameInput.focus();
      return;
    }

    const folder = projectFolderInput.value.trim();
    if (!editingProjectId && !folder) {
      // Folder required for new projects
      statusText.textContent = 'Please select a project folder';
      projectBrowseFolder.focus();
      return;
    }

    // Get viewport settings
    let viewport = { width: 1680, height: 950 };
    if (projectViewportPreset.value === 'custom') {
      viewport = {
        width: parseInt(projectViewportWidth.value) || 1280,
        height: parseInt(projectViewportHeight.value) || 720
      };
    } else {
      const [w, h] = projectViewportPreset.value.split('x').map(Number);
      viewport = { width: w, height: h };
    }

    const projectData = {
      name,
      folder,
      description: projectDescInput.value.trim(),
      color: selectedProjectColor,
      settings: {
        siteUrl: projectSiteUrl.value.trim(),
        viewport,
        injectCSS: projectInjectCSS.checked,
        customCSS: projectInjectCSS.checked ? projectCustomCSS.value : ''
      }
    };

    try {
      if (editingProjectId) {
        const result = await window.electronAPI.updateProject(editingProjectId, projectData);
        if (result.success) {
          // Update local data
          const idx = allProjects.findIndex(p => p.id === editingProjectId);
          if (idx !== -1) allProjects[idx] = result.project;
          if (currentProjectId === editingProjectId) {
            currentProject = result.project;
            projectColorDot.style.backgroundColor = result.project.color;
            projectInitials.textContent = getProjectInitials(result.project.name);
            projectHeaderName.textContent = result.project.name;
            document.title = `${result.project.name} - Documentation Recorder`;
          }
          statusText.textContent = 'Project updated';
        } else {
          statusText.textContent = result.error || 'Failed to update project';
          return;
        }
      } else {
        const result = await window.electronAPI.createProject(projectData);
        if (result.success) {
          allProjects.push(result.project);
          // Auto-select the new project
          await selectProject(result.project);
          statusText.textContent = 'Project created';
        } else {
          statusText.textContent = result.error || 'Failed to create project';
          return;
        }
      }

      closeProjectModalFn();
      if (!currentProjectId) {
        renderProjectList();
      }
    } catch (error) {
      statusText.textContent = `Error: ${error.message}`;
    }
  });

  // Delete project
  deleteProjectBtn.addEventListener('click', async () => {
    if (!editingProjectId) return;

    const project = allProjects.find(p => p.id === editingProjectId);
    if (!confirm(`Delete project "${project?.name}"? All recordings will be permanently deleted.`)) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteProject(editingProjectId);
      if (result.success) {
        allProjects = allProjects.filter(p => p.id !== editingProjectId);
        closeProjectModalFn();

        if (currentProjectId === editingProjectId) {
          showProjectList();
        } else {
          renderProjectList();
        }

        statusText.textContent = 'Project deleted';
      } else {
        statusText.textContent = result.error || 'Failed to delete project';
      }
    } catch (error) {
      statusText.textContent = `Error: ${error.message}`;
    }
  });
}

// ===== Move Recording Modal =====

function openMoveRecordingModal(recordingId) {
  pendingMoveRecordingId = recordingId;

  // Render project list (excluding current project)
  const otherProjects = allProjects.filter(p => p.id !== currentProjectId);

  if (otherProjects.length === 0) {
    moveProjectList.innerHTML = `
      <div class="text-center py-4 text-slate-500 text-sm">
        No other projects available. Create another project first.
      </div>
    `;
  } else {
    moveProjectList.innerHTML = otherProjects.map(project => `
      <button class="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 text-left transition-all" data-move-to="${project.id}">
        <div class="w-3 h-3 rounded-full" style="background-color: ${project.color}"></div>
        <span class="text-sm text-slate-200">${escapeHtml(project.name)}</span>
      </button>
    `).join('');
  }

  moveRecordingModal.style.display = 'flex';
}

function closeMoveRecordingModalFn() {
  moveRecordingModal.style.display = 'none';
  pendingMoveRecordingId = null;
}

function setupMoveRecordingModalHandlers() {
  closeMoveModal.addEventListener('click', closeMoveRecordingModalFn);

  moveProjectList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-move-to]');
    if (!btn || !pendingMoveRecordingId) return;

    const toProjectId = btn.dataset.moveTo;

    try {
      const result = await window.electronAPI.moveRecording(
        pendingMoveRecordingId,
        currentProjectId,
        toProjectId
      );

      if (result.success) {
        await loadProjectRecordings();
        closeMoveRecordingModalFn();
        statusText.textContent = 'Recording moved';
      } else {
        statusText.textContent = result.error || 'Failed to move recording';
      }
    } catch (error) {
      statusText.textContent = `Error: ${error.message}`;
    }
  });
}

// ===== Bulk Refetch =====

// Track refetch state for modal
let refetchResultCallback = null;

function setupRefetchHandlers() {
  if (refetchAllBtn) {
    refetchAllBtn.addEventListener('click', startBulkRefetch);
  }

  if (cancelRefetchBtn) {
    cancelRefetchBtn.addEventListener('click', () => {
      refetchCancelled = true;
    });
  }

  if (doneRefetchBtn) {
    doneRefetchBtn.addEventListener('click', () => {
      refetchProgressModal.style.display = 'none';
      if (refetchResultCallback) {
        refetchResultCallback();
        refetchResultCallback = null;
      }
    });
  }
}

function showRefetchModal(title) {
  refetchModalTitle.textContent = title;
  refetchProgressView.style.display = '';
  refetchSummaryView.style.display = 'none';
  cancelRefetchBtn.style.display = '';
  doneRefetchBtn.style.display = 'none';
  refetchProgressText.textContent = 'Processing...';
  refetchProgressCount.textContent = '0 / 0';
  refetchProgressBar.style.width = '0%';
  refetchCurrentItem.textContent = '-';
  refetchProgressModal.style.display = 'flex';
}

function showRefetchSummary(success, total, failed, errors = [], onDone = null, options = {}) {
  const { screenshotCount = 0, isBulk = false } = options;
  refetchProgressView.style.display = 'none';
  refetchSummaryView.style.display = '';
  cancelRefetchBtn.style.display = 'none';
  doneRefetchBtn.style.display = '';

  // Update icon based on success/failure
  if (failed > 0) {
    refetchSummaryIcon.className = 'w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4';
    refetchSummaryIcon.innerHTML = '<svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
  } else {
    refetchSummaryIcon.className = 'w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4';
    refetchSummaryIcon.innerHTML = '<svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
  }

  if (!isBulk) {
    // Single recording
    refetchSummaryText.textContent = success ? 'Refetch Complete' : 'Refetch Failed';
    refetchSummaryDetails.textContent = success
      ? `Successfully refreshed ${screenshotCount} screenshot${screenshotCount !== 1 ? 's' : ''}`
      : errors[0] || 'An error occurred';
  } else {
    // Bulk refetch
    refetchSummaryText.textContent = 'Refetch Complete';
    const successCount = total - failed;
    refetchSummaryDetails.textContent = failed > 0
      ? `${successCount} of ${total} recording${total !== 1 ? 's' : ''} succeeded, ${failed} failed`
      : `All ${total} recording${total !== 1 ? 's' : ''} refreshed successfully`;
  }

  // Show error list if there are failures
  if (errors.length > 0 && total > 1) {
    refetchErrorList.style.display = '';
    refetchErrorItems.innerHTML = errors.map(e => `<li>${escapeHtml(e)}</li>`).join('');
  } else {
    refetchErrorList.style.display = 'none';
  }

  refetchResultCallback = onDone;
}

async function startBulkRefetch() {
  if (!currentProjectId || isRecording) return;

  const recordings = await window.electronAPI.getProjectRecordings(currentProjectId);
  if (!recordings || recordings.length === 0) {
    statusText.textContent = 'No recordings to refetch';
    return;
  }

  refetchCancelled = false;
  showRefetchModal('Refetching All Screenshots');

  let completed = 0;
  let failed = 0;
  const total = recordings.length;
  const errors = [];

  for (const recording of recordings) {
    if (refetchCancelled) break;

    refetchProgressText.textContent = `Refetching "${recording.title || 'Untitled'}"...`;
    refetchProgressCount.textContent = `${completed} / ${total}`;
    refetchProgressBar.style.width = `${(completed / total) * 100}%`;
    refetchCurrentItem.textContent = recording.title || recording.id;

    try {
      await refetchRecordingScreenshots(recording.id, null, true);
      completed++;
    } catch (error) {
      console.error(`Failed to refetch ${recording.id}:`, error);
      errors.push(`${recording.title || recording.id}: ${error.message}`);
      failed++;
      completed++;
    }
  }

  // Update progress to 100%
  refetchProgressBar.style.width = '100%';
  refetchProgressCount.textContent = `${completed} / ${total}`;

  if (refetchCancelled) {
    statusText.textContent = `Refetch cancelled. Completed: ${completed - 1} of ${total}`;
    refetchProgressModal.style.display = 'none';
  } else {
    statusText.textContent = failed > 0
      ? `Refetch completed: ${completed - failed} of ${total} (${failed} failed)`
      : `Refetch completed: ${completed} recordings`;

    showRefetchSummary(failed === 0, total, failed, errors, () => {
      showWelcomePanel(true);
    }, { isBulk: true });
  }
}

function populateWelcomePanel() {
  // Set output dir from settings
  if (currentSettings) {
    welcomeOutputDir.value = currentSettings.outputDir || '';
  }

  // Populate recent URLs datalist
  populateWelcomeRecentUrls();

  // Update project defaults display
  if (currentProject) {
    const settings = currentProject.settings || {};
    const vp = settings.viewport || { width: 1680, height: 950 };

    // Set default URL from project if URL field is empty
    if (!welcomeUrl.value && settings.siteUrl) {
      welcomeUrl.value = settings.siteUrl;
    }

    // Display defaults
    defaultViewportDisplay.textContent = `${vp.width}x${vp.height}`;

    // Show separator if set
    const separator = currentSettings?.separator || '---';
    if (separator) {
      defaultSeparatorDisplay.textContent = `sep: ${separator}`;
      defaultSeparatorDisplay.style.display = '';
    } else {
      defaultSeparatorDisplay.style.display = 'none';
    }

    // Show CSS if enabled
    if (settings.injectCSS && settings.customCSS) {
      const cssPreview = settings.customCSS.length > 30
        ? settings.customCSS.substring(0, 30) + '...'
        : settings.customCSS;
      defaultCSSDisplay.textContent = `CSS: ${cssPreview}`;
      defaultCSSDisplay.title = settings.customCSS;
      defaultCSSDisplay.style.display = '';
    } else {
      defaultCSSDisplay.style.display = 'none';
    }

    // Set form values to project defaults
    const presetValue = `${vp.width}x${vp.height}`;
    const presetOption = welcomeViewportPreset?.querySelector(`option[value="${presetValue}"]`);
    if (presetOption) {
      welcomeViewportPreset.value = presetValue;
      customViewportInputs.style.display = 'none';
    } else {
      welcomeViewportPreset.value = 'custom';
      customViewportInputs.style.display = 'flex';
    }
    welcomeViewportWidth.value = vp.width;
    welcomeViewportHeight.value = vp.height;

    welcomeSeparator.value = currentSettings?.separator || '---';
    welcomeInjectCSS.checked = settings.injectCSS || false;
    welcomeCustomCSS.value = settings.customCSS || '';
    welcomeCSSOptions.style.display = welcomeInjectCSS.checked ? 'block' : 'none';
  }

  // Reset custom settings state
  useCustomSettings = false;
  if (projectDefaultsInfo) projectDefaultsInfo.style.display = '';
  if (customSettingsSection) customSettingsSection.style.display = 'none';
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

// loadHistory is now replaced by loadProjectRecordings() defined above

function renderHistory(history) {
  if (!history || history.length === 0) {
    historyList.innerHTML = '<div class="text-center py-8 text-slate-600 text-sm">No recordings yet</div>';
    return;
  }

  historyList.innerHTML = history.map(recording => `
    <div class="group p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 cursor-pointer transition-all" data-id="${recording.id}">
      <div class="font-medium text-sm text-slate-300 truncate mb-1">${escapeHtml(recording.title || 'Untitled')}</div>
      <div class="flex items-center gap-3 text-xs text-slate-600">
        <span>${new Date(recording.startTime).toLocaleDateString()}</span>
        <span>${recording.actionCount || 0} actions</span>
        <span>${recording.screenshotCount || 0} shots</span>
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
        <button class="p-1.5 rounded-md hover:bg-violet-500/20 text-slate-500 hover:text-violet-400 transition-colors" data-action="move" title="Move to project">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
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

// Re-sync recording state after page fully loads (preload script runs fresh on each page)
webview.addEventListener('did-finish-load', () => {
  if (isRecording) {
    webview.send('recording-started', { recordActions: currentRecordActions });
    if (currentCustomCSS) {
      webview.send('inject-custom-css', currentCustomCSS);
    }
  }
});

webview.addEventListener('did-navigate', (e) => {
  urlInput.value = e.url;
  // Don't record internal/blank URLs
  if (isRecording && e.url && !e.url.startsWith('about:') && !e.url.startsWith('data:')) {
    window.electronAPI.recordAction({ type: 'goto', url: e.url });
  }

  // Re-sync recording state after navigation
  if (isRecording) {
    // Small delay to ensure page is ready
    setTimeout(() => {
      webview.send('recording-started', { recordActions: currentRecordActions });
      if (currentCustomCSS) {
        webview.send('inject-custom-css', currentCustomCSS);
      }
    }, 100);
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
    // Use showWelcomePanel which handles project context
    showWelcomePanel();

    // Reset shortcuts panel position
    if (shortcutsPanel) {
      shortcutsPanel.style.position = '';
      shortcutsPanel.style.left = '';
      shortcutsPanel.style.top = '';
      shortcutsPanel.style.right = '';
      shortcutsPanel.style.bottom = '';
    }
  });
}

// ===== Welcome Panel =====

// Customize settings button
if (customizeSettingsBtn) {
  customizeSettingsBtn.addEventListener('click', () => {
    useCustomSettings = true;
    if (projectDefaultsInfo) projectDefaultsInfo.style.display = 'none';
    if (customSettingsSection) customSettingsSection.style.display = '';
  });
}

// Use defaults button
if (useDefaultsBtn) {
  useDefaultsBtn.addEventListener('click', () => {
    useCustomSettings = false;
    if (projectDefaultsInfo) projectDefaultsInfo.style.display = '';
    if (customSettingsSection) customSettingsSection.style.display = 'none';

    // Reset to project defaults
    if (currentProject) {
      const settings = currentProject.settings || {};
      const vp = settings.viewport || { width: 1680, height: 950 };
      welcomeViewportWidth.value = vp.width;
      welcomeViewportHeight.value = vp.height;
      welcomeInjectCSS.checked = settings.injectCSS || false;
      welcomeCustomCSS.value = settings.customCSS || '';
    }
  });
}

// Viewport preset handler
if (welcomeViewportPreset) {
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
}

// CSS injection checkbox toggle
if (welcomeInjectCSS) {
  welcomeInjectCSS.addEventListener('change', () => {
    welcomeCSSOptions.style.display = welcomeInjectCSS.checked ? 'block' : 'none';
  });
}

// Load CSS from file
if (welcomeLoadCssFile) {
  welcomeLoadCssFile.addEventListener('click', async () => {
    const result = await window.electronAPI.selectCssFile();
    if (result.success) {
      welcomeCustomCSS.value = result.content;
    }
  });
}

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
  // Require a project
  if (!currentProjectId) {
    statusText.textContent = 'Please select a project first';
    return;
  }

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
    statusText.textContent = 'Recording title is required';
    return;
  }

  // Get settings - use project defaults or custom overrides
  const projectSettings = currentProject?.settings || {};
  const projectVp = projectSettings.viewport || { width: 1680, height: 950 };

  let viewport, injectCSS, customCSS;
  let settingsOverride = {};

  if (useCustomSettings) {
    // Use custom settings from form
    viewport = {
      width: parseInt(welcomeViewportWidth.value) || projectVp.width,
      height: parseInt(welcomeViewportHeight.value) || projectVp.height
    };
    injectCSS = welcomeInjectCSS.checked;
    customCSS = injectCSS ? welcomeCustomCSS.value.trim() : '';

    // Track which settings are overridden
    if (viewport.width !== projectVp.width || viewport.height !== projectVp.height) {
      settingsOverride.viewport = true;
    }
    if (injectCSS !== (projectSettings.injectCSS || false)) {
      settingsOverride.injectCSS = true;
    }
    if (customCSS !== (projectSettings.customCSS || '')) {
      settingsOverride.customCSS = true;
    }
  } else {
    // Use project defaults
    viewport = projectVp;
    injectCSS = projectSettings.injectCSS || false;
    customCSS = projectSettings.customCSS || '';
  }

  // Get separator (empty string means no separator)
  const separator = welcomeSeparator?.value || currentSettings?.separator || '---';

  // Get record actions preference
  const recordActions = welcomeRecordActions.checked;

  // Hide welcome panel and show webview
  welcomePanel.style.display = 'none';
  webviewContainer.classList.remove('hidden');

  // Set webview to exact viewport dimensions
  webview.style.width = `${viewport.width}px`;
  webview.style.height = `${viewport.height}px`;
  webview.style.minWidth = `${viewport.width}px`;
  webview.style.minHeight = `${viewport.height}px`;

  // Show toolbar
  toolbar.style.display = 'flex';

  // Navigate to URL first (toggle buttons shown after recording starts)
  navigateTo(url);

  // Wait for page to load, then start recording
  webview.addEventListener('did-stop-loading', async function onLoad() {
    webview.removeEventListener('did-stop-loading', onLoad);
    await startRecording(url, title, viewport, separator, recordActions, customCSS, settingsOverride);
  }, { once: true });
}

function showWelcomePanel(skipDirtyCheck = false) {
  // Require a project to be selected
  if (!currentProjectId) {
    showProjectList();
    return;
  }

  // Check for unsaved editor changes
  if (!skipDirtyCheck && !confirmLeaveEditor()) return;

  // Reset form
  welcomeUrl.value = '';
  welcomeTitle.value = '';
  populateWelcomePanel();

  // Show welcome panel, hide webview and editor
  welcomePanel.style.display = '';
  projectListPanel.style.display = 'none';
  editorPanel.style.display = 'none';
  webviewContainer.classList.add('hidden');
  // Don't set empty src - it causes ERR_ABORTED errors

  // Hide toolbar, toggle buttons, and viewport info
  toolbar.style.display = 'none';
  toggleLogBtn.style.display = 'none';
  toggleShortcutsBtn.style.display = 'none';
  logPanel.style.display = 'none';
  viewportInfo.classList.add('hidden');

  // Clear active history selection
  activeHistoryId = null;
  updateHistoryHighlight();

  // Update status
  statusText.textContent = 'Ready';

  // Focus URL input
  setTimeout(() => welcomeUrl.focus(), 100);
}


async function startRecording(url, title, viewport, separator, recordActions = true, customCSS = '', settingsOverride = {}) {
  const result = await window.electronAPI.startRecording(url || webview.src, {
    projectId: currentProjectId,
    title: title || null,
    viewport: viewport || currentSettings.viewport,
    separator: separator !== undefined ? separator : currentSettings.separator,
    recordActions: recordActions,
    customCSS: customCSS || null,
    injectCSS: !!customCSS,
    settingsOverride: settingsOverride
  });

  if (result.success) {
    isRecording = true;

    // Hide new recording button during recording
    if (newRecordingBtn) newRecordingBtn.style.display = 'none';

    // Ensure webview is visible and welcome panel is hidden
    welcomePanel.style.display = 'none';
    editorPanel.style.display = 'none';
    webviewContainer.classList.remove('hidden');

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

    // Always show shortcuts panel at recording start
    if (shortcutsPanel) {
      shortcutsPanel.classList.remove('hidden');
    }

    // Always hide log panel at recording start
    logPanel.style.display = 'none';

    // Show and update viewport info
    const vp = viewport || currentSettings.viewport;
    viewportInfo.textContent = `${vp.width} x ${vp.height}`;
    viewportInfo.classList.remove('hidden');

    // Clear log content
    logContent.innerHTML = '';
    addLogEntry(recordActions ? 'Recording started' : 'Screenshots-only mode started', 'info');
    statusText.textContent = recordActions ? 'Recording...' : 'Screenshots-only mode...';

    // Show toggle buttons
    toggleLogBtn.style.display = 'block';
    toggleShortcutsBtn.style.display = 'block';

    // Store recording options for re-sync after navigation
    currentRecordActions = recordActions;
    currentCustomCSS = customCSS || '';

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

  // Hide toggle buttons and viewport info
  toggleLogBtn.style.display = 'none';
  toggleShortcutsBtn.style.display = 'none';
  viewportInfo.classList.add('hidden');

  // Hide toolbar
  toolbar.style.display = 'none';

  // Clear screenshot previews from sidebar
  const screenshotSection = document.getElementById('screenshotSection');
  const screenshotPreviews = document.getElementById('screenshotPreviews');
  if (screenshotSection) screenshotSection.style.display = 'none';
  if (screenshotPreviews) screenshotPreviews.innerHTML = '';

  // Notify webview that recording stopped
  webview.send('recording-stopped');

  if (result.success) {
    addLogEntry('Recording stopped', 'info');

    statusText.textContent = `Saved: ${result.recording.actionCount} actions, ${result.recording.screenshotCount} screenshots`;

    // Reload project recordings
    await loadProjectRecordings();

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

// Helper to hide scrollbars during screenshot capture
async function hideScrollbarsForScreenshot() {
  await webview.executeJavaScript(`
    (function() {
      const style = document.createElement('style');
      style.id = '__doc-recorder-hide-scrollbars';
      style.textContent = \`
        *::-webkit-scrollbar { display: none !important; }
        * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      \`;
      document.head.appendChild(style);
    })()
  `);
}

// Helper to restore scrollbars after screenshot capture
async function restoreScrollbarsAfterScreenshot() {
  await webview.executeJavaScript(`
    (function() {
      const style = document.getElementById('__doc-recorder-hide-scrollbars');
      if (style) style.remove();
    })()
  `);
}

async function captureScreenshot(selector, note, fullPage = false) {
  try {
    console.log('Capturing screenshot...', { selector, note, fullPage });

    // Hide scrollbars before capture
    await hideScrollbarsForScreenshot();

    let dataUrl;

    if (fullPage) {
      // Full page capture using scroll-and-stitch
      dataUrl = await captureFullPage();
    } else {
      // Standard viewport capture
      const image = await webview.capturePage();
      dataUrl = image.toDataURL();
    }

    // Restore scrollbars after capture
    await restoreScrollbarsAfterScreenshot();

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
    // Ensure scrollbars are restored even on error
    await restoreScrollbarsAfterScreenshot().catch(() => {});
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
  item.className = 'rounded overflow-hidden bg-slate-800/30 border border-slate-700/30 hover:border-teal-500/50 cursor-pointer transition-all';
  item.innerHTML = `
    <img src="${dataUrl}" alt="${filename}" title="${note || filename}" class="w-full h-auto block">
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

async function refetchRecordingScreenshots(recordingId, actionBtn, isBulkRefetch = false) {
  if (isRecording) {
    statusText.textContent = 'Cannot refetch while recording';
    return;
  }

  if (!isBulkRefetch) {
    statusText.textContent = 'Loading recording...';
  }
  if (actionBtn) actionBtn.disabled = true;

  // Load recording data first (before showing modal)
  const recording = await window.electronAPI.loadRecording(recordingId, currentProjectId);
  if (!recording || !recording.actions) {
    throw new Error('Invalid recording data');
  }

  const recordingTitle = recording.title || 'Untitled';
  const { viewport = { width: 1680, height: 950 }, actions = [] } = recording;

  // Filter to only goto and screenshot actions
  const relevantActions = actions.filter(a => ['goto', 'screenshot'].includes(a.type));
  if (relevantActions.length === 0) {
    if (!isBulkRefetch) {
      statusText.textContent = 'No actions to refetch';
    }
    if (actionBtn) actionBtn.disabled = false;
    return;
  }

  const totalScreenshots = relevantActions.filter(a => a.type === 'screenshot').length;

  // Show progress modal for single recording refetch
  if (!isBulkRefetch) {
    showRefetchModal(`Refetching: ${recordingTitle}`);
    refetchProgressText.textContent = 'Initializing...';
    refetchProgressCount.textContent = `0 / ${totalScreenshots}`;
  }

  try {

    // Show webview and hide other panels
    welcomePanel.style.display = 'none';
    projectListPanel.style.display = 'none';
    editorPanel.style.display = 'none';
    webviewContainer.classList.remove('hidden');
    toolbar.style.display = 'flex';

    // Set webview to exact viewport dimensions
    webview.style.width = `${viewport.width}px`;
    webview.style.height = `${viewport.height}px`;
    webview.style.minWidth = `${viewport.width}px`;
    webview.style.minHeight = `${viewport.height}px`;

    // Show and update viewport info
    viewportInfo.textContent = `${viewport.width} x ${viewport.height}`;
    viewportInfo.classList.remove('hidden');

    // Get the first goto action URL to initialize the webview
    const firstGoto = relevantActions.find(a => a.type === 'goto');
    if (firstGoto) {
      webview.src = firstGoto.url;
      urlInput.value = firstGoto.url;

      // Wait for dom-ready to ensure webview is fully attached
      await new Promise((resolve) => {
        const onDomReady = () => {
          webview.removeEventListener('dom-ready', onDomReady);
          resolve();
        };
        // Check if already ready (has web contents attached)
        try {
          webview.getWebContentsId();
          resolve(); // Already ready
        } catch {
          webview.addEventListener('dom-ready', onDomReady, { once: true });
        }
      });

      // Wait for the page to finish loading
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          webview.removeEventListener('did-finish-load', onLoad);
          webview.removeEventListener('did-fail-load', onFail);
          resolve();
        }, 30000);

        const onLoad = () => {
          clearTimeout(timeout);
          webview.removeEventListener('did-fail-load', onFail);
          resolve();
        };

        const onFail = () => {
          clearTimeout(timeout);
          webview.removeEventListener('did-finish-load', onLoad);
          resolve();
        };

        webview.addEventListener('did-finish-load', onLoad, { once: true });
        webview.addEventListener('did-fail-load', onFail, { once: true });
      });

      await new Promise(r => setTimeout(r, 500));
    }

    let screenshotCount = 0;

    // Process each action (skip first goto since we already navigated)
    const actionsToProcess = firstGoto
      ? relevantActions.filter((a, i) => !(a.type === 'goto' && i === relevantActions.indexOf(firstGoto)))
      : relevantActions;

    for (let i = 0; i < actionsToProcess.length; i++) {
      const action = actionsToProcess[i];

      // Update progress
      if (!isBulkRefetch) {
        refetchProgressText.textContent = `Processing screenshot ${screenshotCount + 1} of ${totalScreenshots}...`;
        refetchProgressCount.textContent = `${screenshotCount} / ${totalScreenshots}`;
        refetchProgressBar.style.width = `${(screenshotCount / totalScreenshots) * 100}%`;
      }
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
          imageDataUrl: dataUrl,
          projectId: currentProjectId
        });

        screenshotCount++;

        // Clear highlight
        if (action.highlight) {
          webview.send('clear-highlight');
        }
      }
    }

    // Regenerate markdown
    await window.electronAPI.regenerateMarkdown(recordingId, currentProjectId);

    if (!isBulkRefetch) {
      // Update progress to 100%
      refetchProgressBar.style.width = '100%';
      refetchProgressCount.textContent = `${screenshotCount} / ${totalScreenshots}`;
      statusText.textContent = `Refetched ${screenshotCount} screenshots`;

      // Show summary modal
      showRefetchSummary(true, 1, 0, [], async () => {
        // Open the editor to show the updated markdown when done is clicked
        await openEditor(recordingId);
      }, { screenshotCount });
    }

  } catch (error) {
    console.error('Refetch error:', error);
    if (!isBulkRefetch) {
      statusText.textContent = `Refetch failed: ${error.message}`;
      // Show error summary
      showRefetchSummary(false, 1, 1, [error.message]);
    }
    throw error; // Re-throw for bulk refetch to catch
  }

  if (actionBtn) actionBtn.disabled = false;
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
      await window.electronAPI.openRecordingFolder(id, currentProjectId);
    } else if (action === 'refetch') {
      await refetchRecordingScreenshots(id, actionBtn);
    } else if (action === 'move') {
      openMoveRecordingModal(id);
    } else if (action === 'delete') {
      if (confirm('Delete this recording?')) {
        await window.electronAPI.deleteRecording(id, currentProjectId);
        await loadProjectRecordings();
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
  // Check for unsaved changes if switching to a different recording
  if (activeHistoryId && activeHistoryId !== recordingId && !confirmLeaveEditor()) {
    return;
  }

  try {
    // Get the markdown file path for this recording
    const result = await window.electronAPI.getRecordingMarkdown(recordingId, currentProjectId);

    if (!result.success) {
      statusText.textContent = result.error || 'Failed to load markdown';
      showWelcomePanel();
      return;
    }

    // Store state
    activeHistoryId = recordingId;
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
    projectListPanel.style.display = 'none';
    webviewContainer.classList.add('hidden');
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
  if (!confirmLeaveEditor()) return;
  showWelcomePanel(true); // Skip dirty check since we just confirmed
});

editorSaveBtn.addEventListener('click', async () => {
  try {
    const result = await window.electronAPI.saveRecordingMarkdown(activeHistoryId, editorTextarea.value, currentProjectId);

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
    const result = await window.electronAPI.getScreenshotPath(recordingId, filename, currentProjectId);
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
        filename: screenshotEditor.filename,
        projectId: currentProjectId
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
        annotations: screenshotEditor.annotations,
        projectId: currentProjectId
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
