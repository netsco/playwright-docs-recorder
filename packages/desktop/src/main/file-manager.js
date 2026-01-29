const fs = require('fs');
const path = require('path');
const { generateScript } = require('../shared/script-generator');
const { generateMarkdown } = require('../shared/markdown-generator');
const { slugify } = require('@doc-recorder/shared');
const { getProjectFolderPath } = require('./project-manager');

/**
 * Ensure a directory exists, creating it if necessary.
 * @param {string} dirPath - Directory path
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Save a recording to disk.
 * Creates: actions.json, recorded-script.js, screenshots.md
 *
 * @param {string} outputDir - Base output directory
 * @param {Object} recording - Recording data
 * @param {Object|string} [project] - Project object or name (for project-based storage)
 * @returns {Object} - Paths to saved files
 */
function saveRecording(outputDir, recording, project = null) {
  let baseDir = outputDir;
  if (project) {
    baseDir = getProjectFolderPath(outputDir, project);
  }
  const recordingDir = path.join(baseDir, recording.id);
  const screenshotsDir = path.join(recordingDir, 'screenshots');

  ensureDir(recordingDir);
  ensureDir(screenshotsDir);

  // Compute markdown filename from title (fallback to screenshots.md)
  const mdFilename = recording.title ? slugify(recording.title) + '.md' : 'screenshots.md';

  // Build actions.json data
  const actionsData = {
    id: recording.id,
    title: recording.title,
    viewport: recording.viewport,
    startTime: recording.startTime,
    endTime: new Date().toISOString(),
    actions: recording.actions,
    mdFilename
  };

  // Add settings override info if present
  if (recording.settingsOverride) {
    actionsData.settingsOverride = recording.settingsOverride;
  }
  if (recording.injectCSS !== undefined) {
    actionsData.injectCSS = recording.injectCSS;
  }
  if (recording.customCSS) {
    actionsData.customCSS = recording.customCSS;
  }

  // Save actions.json
  const actionsPath = path.join(recordingDir, 'actions.json');
  fs.writeFileSync(actionsPath, JSON.stringify(actionsData, null, 2));

  // Generate and save Playwright script
  const scriptPath = path.join(recordingDir, 'recorded-script.js');
  fs.writeFileSync(scriptPath, generateScript(recording));

  // Generate and save markdown
  const markdownPath = path.join(recordingDir, mdFilename);
  fs.writeFileSync(markdownPath, generateMarkdown(recording));

  return {
    recordingDir,
    actionsPath,
    scriptPath,
    markdownPath,
    screenshotsDir
  };
}

/**
 * Save a screenshot image.
 *
 * @param {string} screenshotsDir - Screenshots directory
 * @param {string} filename - Screenshot filename
 * @param {Buffer} imageBuffer - PNG image buffer
 * @returns {string} - Full path to saved file
 */
function saveScreenshot(screenshotsDir, filename, imageBuffer) {
  ensureDir(screenshotsDir);
  const filepath = path.join(screenshotsDir, filename);
  fs.writeFileSync(filepath, imageBuffer);
  return filepath;
}

/**
 * Load recording history from the history file.
 * @deprecated Use getProjectRecordings from project-manager.js instead
 * @param {string} outputDir - Base output directory
 * @returns {Array} - Array of recording metadata
 */
function loadHistory(outputDir) {
  const historyPath = path.join(outputDir, 'history.json');
  if (fs.existsSync(historyPath)) {
    try {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Save recording history.
 * @deprecated Use project-manager.js for project-based storage
 * @param {string} outputDir - Base output directory
 * @param {Array} history - Array of recording metadata
 */
function saveHistory(outputDir, history) {
  ensureDir(outputDir);
  const historyPath = path.join(outputDir, 'history.json');
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

/**
 * Add a recording to history.
 * @deprecated Use addRecordingToProject from project-manager.js instead
 * @param {string} outputDir - Base output directory
 * @param {Object} recording - Recording metadata to add
 */
function addToHistory(outputDir, recording) {
  const history = loadHistory(outputDir);
  history.unshift({
    id: recording.id,
    title: recording.title,
    url: recording.url,
    startTime: recording.startTime,
    endTime: new Date().toISOString(),
    actionCount: recording.actions.length,
    screenshotCount: recording.screenshots.length
  });
  // Keep only last 50 recordings in history
  saveHistory(outputDir, history.slice(0, 50));
}

/**
 * Delete a recording.
 *
 * @param {string} outputDir - Base output directory
 * @param {string} recordingId - Recording ID to delete
 * @param {string} [projectName] - Project name (for project-based storage)
 */
function deleteRecording(outputDir, recordingId, projectName = null) {
  let baseDir = outputDir;
  if (projectName) {
    baseDir = getProjectFolderPath(outputDir, projectName);
  }
  const recordingDir = path.join(baseDir, recordingId);
  if (fs.existsSync(recordingDir)) {
    fs.rmSync(recordingDir, { recursive: true, force: true });
  }

  // Only update legacy history if no project (backwards compatibility)
  if (!projectName) {
    const history = loadHistory(outputDir);
    const filtered = history.filter(r => r.id !== recordingId);
    saveHistory(outputDir, filtered);
  }
}

/**
 * Load a specific recording's actions.json
 *
 * @param {string} outputDir - Base output directory
 * @param {string} recordingId - Recording ID
 * @param {string} [projectName] - Project name (for project-based storage)
 * @returns {Object|null} - Recording data or null if not found
 */
function loadRecording(outputDir, recordingId, projectName = null) {
  let baseDir = outputDir;
  if (projectName) {
    baseDir = getProjectFolderPath(outputDir, projectName);
  }
  const actionsPath = path.join(baseDir, recordingId, 'actions.json');
  if (fs.existsSync(actionsPath)) {
    try {
      return JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Load a recording's markdown file content.
 *
 * @param {string} outputDir - Base output directory
 * @param {string} recordingId - Recording ID
 * @param {string} [projectName] - Project name (for project-based storage)
 * @returns {Object} - { success, content, filePath, title } or { success: false, error }
 */
function loadRecordingMarkdown(outputDir, recordingId, projectName = null) {
  let baseDir = outputDir;
  if (projectName) {
    baseDir = getProjectFolderPath(outputDir, projectName);
  }
  const recordingDir = path.join(baseDir, recordingId);
  const actionsPath = path.join(recordingDir, 'actions.json');

  // Try to get mdFilename and title from actions.json
  let mdFilename = 'screenshots.md';
  let title = 'Untitled';
  if (fs.existsSync(actionsPath)) {
    try {
      const actions = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
      title = actions.title || 'Untitled';
      mdFilename = actions.mdFilename || 'screenshots.md';
    } catch {
      // Ignore parse errors
    }
  }

  const markdownPath = path.join(recordingDir, mdFilename);

  if (!fs.existsSync(markdownPath)) {
    return { success: false, error: 'Markdown file not found' };
  }

  try {
    const content = fs.readFileSync(markdownPath, 'utf8');
    return { success: true, content, filePath: markdownPath, recordingDir, title, mdFilename };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Save content to a recording's markdown file.
 *
 * @param {string} outputDir - Base output directory
 * @param {string} recordingId - Recording ID
 * @param {string} content - Markdown content to save
 * @param {string} [projectName] - Project name (for project-based storage)
 * @returns {Object} - { success: true } or { success: false, error }
 */
function saveRecordingMarkdown(outputDir, recordingId, content, projectName = null) {
  let baseDir = outputDir;
  if (projectName) {
    baseDir = getProjectFolderPath(outputDir, projectName);
  }
  const recordingDir = path.join(baseDir, recordingId);
  const actionsPath = path.join(recordingDir, 'actions.json');

  // Get mdFilename from actions.json (fallback to screenshots.md)
  let mdFilename = 'screenshots.md';
  if (fs.existsSync(actionsPath)) {
    try {
      const actions = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
      mdFilename = actions.mdFilename || 'screenshots.md';
    } catch {
      // Ignore parse errors
    }
  }

  const markdownPath = path.join(recordingDir, mdFilename);

  try {
    fs.writeFileSync(markdownPath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  ensureDir,
  saveRecording,
  saveScreenshot,
  loadHistory,
  saveHistory,
  addToHistory,
  deleteRecording,
  loadRecording,
  loadRecordingMarkdown,
  saveRecordingMarkdown
};
