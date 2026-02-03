const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { slugify } = require('@doc-recorder/shared');
const { getSettingsStore, addRecentUrl } = require('./settings-store');
const {
  saveRecording,
  saveScreenshot,
  deleteRecording,
  loadRecording,
  loadRecordingMarkdown,
  saveRecordingMarkdown
} = require('./file-manager');
const {
  loadProjects,
  createProject,
  updateProject,
  deleteProject,
  getProject,
  getProjectRecordings,
  addRecordingToProject,
  removeRecordingFromProject,
  moveRecording,
  setLastOpenedProject,
  getProjectFolderPath,
  migrateExistingRecordings,
  exportProjectAsZip,
  importProjectFromZip
} = require('./project-manager');

// Current recording state
let currentRecording = null;
let currentProjectId = null;
let currentProject = null;

/**
 * Generate a unique recording ID based on slugified title.
 * Appends -2, -3, etc. if the folder already exists.
 * @param {string} title - Recording title
 * @param {string} projectFolder - Project folder path
 * @returns {string} - Unique recording ID (slug)
 */
function generateUniqueRecordingId(title, projectFolder) {
  const baseSlug = slugify(title) || 'recording';
  let slug = baseSlug;
  let counter = 1;

  // Check if folder exists and find unique name
  while (fs.existsSync(path.join(projectFolder, slug))) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}

/**
 * Register all IPC handlers for the main process.
 */
function registerIpcHandlers() {
  // ===== Project Management =====

  ipcMain.handle('get-projects', async () => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    // Run migration on first access
    migrateExistingRecordings(outputDir);

    const data = loadProjects(outputDir);

    // Enrich each project with recording count
    data.projects = data.projects.map(project => {
      const recordings = getProjectRecordings(outputDir, project.id);
      return { ...project, recordingCount: recordings.length };
    });

    return data;
  });

  ipcMain.handle('create-project', async (event, options) => {
    const settings = getSettingsStore();
    try {
      const project = createProject(settings.get('outputDir'), options);
      return { success: true, project };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-project', async (event, projectId, updates) => {
    const settings = getSettingsStore();
    try {
      const project = updateProject(settings.get('outputDir'), projectId, updates);
      return { success: true, project };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-project', async (event, projectId) => {
    const settings = getSettingsStore();
    try {
      deleteProject(settings.get('outputDir'), projectId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-project', async (event, projectId) => {
    const settings = getSettingsStore();
    const project = getProject(settings.get('outputDir'), projectId);
    return project ? { success: true, project } : { success: false, error: 'Project not found' };
  });

  ipcMain.handle('get-project-recordings', async (event, projectId) => {
    const settings = getSettingsStore();
    return getProjectRecordings(settings.get('outputDir'), projectId);
  });

  ipcMain.handle('move-recording', async (event, recordingId, fromProjectId, toProjectId) => {
    const settings = getSettingsStore();
    try {
      moveRecording(settings.get('outputDir'), recordingId, fromProjectId, toProjectId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('set-last-opened-project', async (event, projectId) => {
    const settings = getSettingsStore();
    setLastOpenedProject(settings.get('outputDir'), projectId);
    return { success: true };
  });

  // ===== Project Import/Export =====

  ipcMain.handle('export-project', async (event, projectId) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');
    const project = getProject(outputDir, projectId);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    const result = await dialog.showSaveDialog({
      defaultPath: `${project.name.replace(/[<>:"/\\|?*]/g, '-')}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    try {
      exportProjectAsZip(outputDir, projectId, result.filePath);
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('import-project', async () => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    const result = await dialog.showOpenDialog({
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false, canceled: true };
    }

    try {
      const project = importProjectFromZip(outputDir, result.filePaths[0]);
      return { success: true, project };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ===== Recording Controls =====

  ipcMain.handle('start-recording', async (event, url, options = {}) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    // Project is required
    if (!options.projectId) {
      return { success: false, error: 'Project is required' };
    }

    const project = getProject(outputDir, options.projectId);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    currentProjectId = options.projectId;
    currentProject = project;

    // Determine effective settings (project defaults + overrides)
    const projectSettings = project.settings || {};
    const viewport = options.viewport || projectSettings.viewport || settings.get('viewport');
    const injectCSS = options.injectCSS !== undefined ? options.injectCSS : projectSettings.injectCSS;
    const customCSS = options.customCSS !== undefined ? options.customCSS : projectSettings.customCSS;

    // Generate unique recording ID from slugified title
    const title = options.title || 'Untitled';
    const projectFolder = getProjectFolderPath(outputDir, project);
    const recordingId = generateUniqueRecordingId(title, projectFolder);

    currentRecording = {
      id: recordingId,
      title: title,
      url: url,
      viewport: viewport,
      recordActions: options.recordActions !== false, // default true
      injectCSS: injectCSS,
      customCSS: customCSS || null,
      settingsOverride: options.settingsOverride || {},
      actions: [],
      screenshots: [],
      screenshotCounter: 0,
      startTime: new Date().toISOString()
    };

    addRecentUrl(url);

    const mode = currentRecording.recordActions ? 'full recording' : 'screenshots-only';
    console.log(`Started ${mode}: ${url} (project: ${project.name})`);
    return { success: true, id: currentRecording.id, recordActions: currentRecording.recordActions };
  });

  ipcMain.handle('stop-recording', async () => {
    if (!currentRecording) {
      return { success: false, error: 'No recording in progress' };
    }

    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    try {
      const paths = saveRecording(outputDir, currentRecording, currentProject);

      // Add to project recordings
      if (currentProjectId) {
        addRecordingToProject(outputDir, currentProjectId, currentRecording);
      }

      console.log(`Saved recording: ${paths.recordingDir}`);

      const result = {
        success: true,
        recording: {
          id: currentRecording.id,
          title: currentRecording.title,
          actionCount: currentRecording.actions.length,
          screenshotCount: currentRecording.screenshots.length,
          projectId: currentProjectId,
          paths
        }
      };

      currentRecording = null;
      currentProjectId = null;
      currentProject = null;
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
      if (!['goto', 'screenshot', 'note', 'scroll'].includes(action.type)) {
        return; // Skip click/fill actions in screenshots-only mode
      }
    }

    currentRecording.actions.push(action);
    console.log(`Recorded: ${action.type} - ${action.selector || action.url || ''}`);

    // Notify renderer of the new action
    event.sender.send('action-recorded', action);
  });

  // ===== Screenshot Capture =====

  ipcMain.handle('capture-screenshot', async (event, { selector, note, fullPage = false, imageDataUrl, highlightOverlay, pageTitle }) => {
    if (!currentRecording) {
      return { success: false, error: 'No recording in progress' };
    }

    try {
      currentRecording.screenshotCounter++;
      const filename = `screenshot-${String(currentRecording.screenshotCounter).padStart(3, '0')}.png`;

      const settings = getSettingsStore();
      const outputDir = settings.get('outputDir');

      // Build correct path based on whether we have a project
      let baseDir = outputDir;
      if (currentProject) {
        baseDir = getProjectFolderPath(outputDir, currentProject);
      }
      const recordingDir = path.join(baseDir, currentRecording.id);
      const screenshotsDir = path.join(recordingDir, 'screenshots');

      // Convert data URL to buffer
      const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const filepath = saveScreenshot(screenshotsDir, filename, imageBuffer);

      // Bake highlight overlay onto saved PNG and backup original
      if (highlightOverlay) {
        try {
          const originalsDir = path.join(recordingDir, 'screenshots-original');
          fs.mkdirSync(originalsDir, { recursive: true });
          fs.copyFileSync(filepath, path.join(originalsDir, filename));
          const { renderAnnotations } = require('@doc-recorder/shared');
          await renderAnnotations(filepath, [{ type: 'elementHighlight', ...highlightOverlay }], { outputPath: filepath });
        } catch (err) {
          console.warn(`Failed to bake highlight overlay: ${err.message}`);
        }
      }

      const screenshotData = { filename, highlight: selector, note, fullPage, pageTitle };
      if (highlightOverlay) {
        screenshotData.highlightOverlay = highlightOverlay;
      }
      currentRecording.screenshots.push(screenshotData);
      const action = { type: 'screenshot', ...screenshotData };
      currentRecording.actions.push(action);

      // Notify renderer of the new action (for log panel)
      event.sender.send('action-recorded', action);

      const fullPageLabel = fullPage ? ' [full page]' : '';
      console.log(`Screenshot: ${filename}${fullPageLabel}${selector ? ` [${selector}]` : ''}${note ? ` - ${note}` : ''}`);

      return { success: true, filename, filepath };
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== History Management =====

  // Load recording now requires projectId
  ipcMain.handle('load-recording', (event, recordingId, projectId) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    if (projectId) {
      const project = getProject(outputDir, projectId);
      if (project) {
        return loadRecording(outputDir, recordingId, project);
      }
    }

    // Fallback for legacy recordings (no project)
    return loadRecording(outputDir, recordingId);
  });

  ipcMain.handle('delete-recording', (event, recordingId, projectId) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    try {
      if (projectId) {
        const project = getProject(outputDir, projectId);
        if (project) {
          deleteRecording(outputDir, recordingId, project);
          removeRecordingFromProject(outputDir, projectId, recordingId);
          return { success: true };
        }
      }

      // Fallback for legacy recordings
      deleteRecording(outputDir, recordingId);
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
      customCSS: settings.get('customCSS'),
      theme: settings.get('theme')
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
    if (newSettings.theme !== undefined) settings.set('theme', newSettings.theme);
    return { success: true };
  });

  // ===== Markdown Editor =====

  ipcMain.handle('get-recording-markdown', (event, recordingId, projectId) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    if (projectId) {
      const project = getProject(outputDir, projectId);
      if (project) {
        // Pass full project object so getProjectFolderPath can use the custom folder
        return loadRecordingMarkdown(outputDir, recordingId, project);
      }
    }

    // Fallback for legacy recordings
    return loadRecordingMarkdown(outputDir, recordingId);
  });

  ipcMain.handle('save-recording-markdown', (event, recordingId, content, projectId) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    if (projectId) {
      const project = getProject(outputDir, projectId);
      if (project) {
        return saveRecordingMarkdown(outputDir, recordingId, content, project);
      }
    }

    // Fallback for legacy recordings
    return saveRecordingMarkdown(outputDir, recordingId, content);
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

  ipcMain.handle('select-project-folder', async () => {
    const settings = getSettingsStore();
    const result = await dialog.showOpenDialog({
      defaultPath: settings.get('outputDir'),
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
  });

  // ===== Refetch =====

  ipcMain.handle('save-refetched-screenshot', async (event, { recordingId, filename, imageDataUrl, highlightOverlay, projectId }) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    let baseDir = outputDir;
    if (projectId) {
      const project = getProject(outputDir, projectId);
      if (project) {
        baseDir = getProjectFolderPath(outputDir, project);
      }
    }

    const recordingDir = path.join(baseDir, recordingId);
    const screenshotsDir = path.join(recordingDir, 'screenshots');

    try {
      // Convert data URL to buffer
      const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const filepath = saveScreenshot(screenshotsDir, filename, imageBuffer);

      // Bake highlight overlay onto saved PNG and backup original
      if (highlightOverlay) {
        try {
          const originalsDir = path.join(recordingDir, 'screenshots-original');
          fs.mkdirSync(originalsDir, { recursive: true });
          const originalPath = path.join(originalsDir, filename);
          if (!fs.existsSync(originalPath)) {
            fs.copyFileSync(filepath, originalPath);
          }
          const { renderAnnotations } = require('@doc-recorder/shared');
          await renderAnnotations(filepath, [{ type: 'elementHighlight', ...highlightOverlay }], { outputPath: filepath });
        } catch (err) {
          console.warn(`Failed to bake highlight overlay on refetch: ${err.message}`);
        }

        // Update actions.json with highlightOverlay
        try {
          const actionsPath = path.join(recordingDir, 'actions.json');
          if (fs.existsSync(actionsPath)) {
            const actionsData = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
            const actions = actionsData.actions || actionsData;
            const screenshotAction = actions.find(
              a => a.type === 'screenshot' && a.filename === filename
            );
            if (screenshotAction && !screenshotAction.highlightOverlay) {
              screenshotAction.highlightOverlay = highlightOverlay;
              fs.writeFileSync(actionsPath, JSON.stringify(actionsData, null, 2));
            }
          }
        } catch (err) {
          console.warn(`Failed to update actions.json with highlightOverlay: ${err.message}`);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to save refetched screenshot:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('regenerate-markdown', async (event, recordingId, projectId) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    let baseDir = outputDir;
    if (projectId) {
      const project = getProject(outputDir, projectId);
      if (project) {
        baseDir = getProjectFolderPath(outputDir, project);
      }
    }

    const recordingDir = path.join(baseDir, recordingId);
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

  // ===== Screenshot Editor =====

  ipcMain.handle('get-screenshot-path', (event, recordingId, filename, projectId) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    let baseDir = outputDir;
    if (projectId) {
      const project = getProject(outputDir, projectId);
      if (project) {
        baseDir = getProjectFolderPath(outputDir, project);
      }
    }

    const screenshotPath = path.join(baseDir, recordingId, 'screenshots', filename);
    const actionsPath = path.join(baseDir, recordingId, 'actions.json');
    const fs = require('fs');

    if (!fs.existsSync(screenshotPath)) {
      return { success: false, error: 'Screenshot not found' };
    }

    // Load existing edits from actions.json
    let blurRegions = [];
    let annotations = [];
    let highlightOverlay = null;
    try {
      if (fs.existsSync(actionsPath)) {
        const actionsData = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
        const actions = actionsData.actions || actionsData;
        const screenshotAction = actions.find(
          a => a.type === 'screenshot' && a.filename === filename
        );
        if (screenshotAction) {
          blurRegions = screenshotAction.blurRegions || [];
          annotations = screenshotAction.annotations || [];
          highlightOverlay = screenshotAction.highlightOverlay || null;
        }
      }
    } catch (err) {
      console.warn('Failed to load existing edits:', err.message);
    }

    return { success: true, path: screenshotPath, blurRegions, annotations, highlightOverlay };
  });

  ipcMain.handle('save-screenshot-edits', async (event, { recordingId, filename, blurRegions, annotations, highlightOverlay, projectId }) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    let baseDir = outputDir;
    if (projectId) {
      const project = getProject(outputDir, projectId);
      if (project) {
        baseDir = getProjectFolderPath(outputDir, project);
      }
    }

    const recordingDir = path.join(baseDir, recordingId);
    const screenshotsDir = path.join(recordingDir, 'screenshots');
    const originalsDir = path.join(recordingDir, 'screenshots-original');
    const screenshotPath = path.join(screenshotsDir, filename);
    const originalPath = path.join(originalsDir, filename);
    const actionsPath = path.join(recordingDir, 'actions.json');
    const fs = require('fs');

    try {
      // Load actions.json
      if (!fs.existsSync(actionsPath)) {
        return { success: false, error: 'actions.json not found' };
      }

      const actionsData = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
      const actions = actionsData.actions || actionsData;

      // Find the screenshot action
      const screenshotAction = actions.find(
        a => a.type === 'screenshot' && a.filename === filename
      );

      if (!screenshotAction) {
        return { success: false, error: 'Screenshot not found in actions' };
      }

      // Backup original on first edit (non-destructive editing)
      const hasAnyEdits = (blurRegions && blurRegions.length > 0) || (annotations && annotations.length > 0) || !!highlightOverlay;
      if (hasAnyEdits && !fs.existsSync(originalPath)) {
        fs.mkdirSync(originalsDir, { recursive: true });
        fs.copyFileSync(screenshotPath, originalPath);
        console.log(`Backed up original: ${filename}`);
      }

      // Update the action with blur regions and annotations
      if (blurRegions && blurRegions.length > 0) {
        screenshotAction.blurRegions = blurRegions;
        screenshotAction.hasEdits = true;
      } else {
        delete screenshotAction.blurRegions;
      }

      if (annotations && annotations.length > 0) {
        screenshotAction.annotations = annotations;
        screenshotAction.hasEdits = true;
      } else {
        delete screenshotAction.annotations;
      }

      if (highlightOverlay) {
        screenshotAction.highlightOverlay = highlightOverlay;
        screenshotAction.hasEdits = true;
      } else {
        delete screenshotAction.highlightOverlay;
      }

      // Update hasEdits flag
      if (!hasAnyEdits) {
        delete screenshotAction.hasEdits;
      }

      // Save updated actions.json
      fs.writeFileSync(actionsPath, JSON.stringify(actionsData, null, 2));

      // Restore original image when all edits are removed
      if (!hasAnyEdits && fs.existsSync(originalPath)) {
        fs.copyFileSync(originalPath, screenshotPath);
      }

      // Determine source image: use original if it exists, otherwise use screenshot
      const sourcePath = fs.existsSync(originalPath) ? originalPath : screenshotPath;

      // Apply blur regions using sharp (if any)
      if (blurRegions && blurRegions.length > 0) {
        try {
          const { applyBlurRegions } = require('@doc-recorder/shared');
          await applyBlurRegions(sourcePath, blurRegions, { outputPath: screenshotPath });
        } catch (blurError) {
          console.warn('Failed to apply blur regions (sharp may not be installed):', blurError.message);
          // Continue - the blur regions are saved in actions.json for later processing
        }
      }

      // Build combined annotations array: highlight overlay renders first (behind), then user annotations
      const allAnnotations = [];
      if (highlightOverlay) {
        allAnnotations.push({ type: 'elementHighlight', ...highlightOverlay });
      }
      if (annotations && annotations.length > 0) {
        allAnnotations.push(...annotations);
      }

      // Apply annotations using sharp (if any) - apply after blur
      if (allAnnotations.length > 0) {
        try {
          const { renderAnnotations } = require('@doc-recorder/shared');
          // If blur was applied, annotations go on top of the blurred image
          // If no blur, annotations are applied to the source (original or screenshot)
          const annoSource = (blurRegions && blurRegions.length > 0) ? screenshotPath : sourcePath;
          await renderAnnotations(annoSource, allAnnotations, { outputPath: screenshotPath });
        } catch (annoError) {
          console.warn('Failed to render annotations (sharp may not be installed):', annoError.message);
          // Continue - the annotations are saved in actions.json for later processing
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to save screenshot edits:', error);
      return { success: false, error: error.message };
    }
  });

  // Reset screenshot to original (remove all edits)
  ipcMain.handle('reset-screenshot-to-original', async (event, { recordingId, filename, projectId }) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    let baseDir = outputDir;
    if (projectId) {
      const project = getProject(outputDir, projectId);
      if (project) {
        baseDir = getProjectFolderPath(outputDir, project);
      }
    }

    const recordingDir = path.join(baseDir, recordingId);
    const screenshotsDir = path.join(recordingDir, 'screenshots');
    const originalsDir = path.join(recordingDir, 'screenshots-original');
    const screenshotPath = path.join(screenshotsDir, filename);
    const originalPath = path.join(originalsDir, filename);
    const actionsPath = path.join(recordingDir, 'actions.json');
    const fs = require('fs');

    try {
      // Load actions.json
      if (!fs.existsSync(actionsPath)) {
        return { success: false, error: 'actions.json not found' };
      }

      const actionsData = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
      const actions = actionsData.actions || actionsData;

      // Find the screenshot action
      const screenshotAction = actions.find(
        a => a.type === 'screenshot' && a.filename === filename
      );

      if (!screenshotAction) {
        return { success: false, error: 'Screenshot not found in actions' };
      }

      // Clear edits from actions.json
      delete screenshotAction.blurRegions;
      delete screenshotAction.annotations;
      delete screenshotAction.highlightOverlay;
      delete screenshotAction.hasEdits;

      // Save updated actions.json
      fs.writeFileSync(actionsPath, JSON.stringify(actionsData, null, 2));

      // Restore original image if it exists
      if (fs.existsSync(originalPath)) {
        fs.copyFileSync(originalPath, screenshotPath);
        console.log(`Restored original: ${filename}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to reset screenshot:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== Utility =====

  ipcMain.handle('open-recording-folder', async (event, recordingId, projectId) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    let baseDir = outputDir;
    if (projectId) {
      const project = getProject(outputDir, projectId);
      if (project) {
        baseDir = getProjectFolderPath(outputDir, project);
      }
    }

    const recordingDir = path.join(baseDir, recordingId);
    const { shell } = require('electron');
    await shell.openPath(recordingDir);
    return { success: true };
  });

  ipcMain.handle('open-project-folder', async (event, projectId) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');
    const project = getProject(outputDir, projectId);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    const projectDir = getProjectFolderPath(outputDir, project);
    const { shell } = require('electron');
    await shell.openPath(projectDir);
    return { success: true };
  });

  // ===== Bulk Refetch =====

  // This is a placeholder - the actual bulk refetch is orchestrated from the renderer
  // since it needs webview access. This just provides project recording list.
  ipcMain.handle('get-refetch-queue', async (event, projectId) => {
    const settings = getSettingsStore();
    const outputDir = settings.get('outputDir');

    const recordings = getProjectRecordings(outputDir, projectId);
    return recordings.map(r => ({
      id: r.id,
      title: r.title
    }));
  });
}

module.exports = { registerIpcHandlers };
