const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { generateScript } = require('../shared/script-generator');
const { generateMarkdown } = require('../shared/markdown-generator');

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
 * @returns {Object} - Paths to saved files
 */
function saveRecording(outputDir, recording) {
  const recordingDir = path.join(outputDir, recording.id);
  const screenshotsDir = path.join(recordingDir, 'screenshots');

  ensureDir(recordingDir);
  ensureDir(screenshotsDir);

  // Save actions.json
  const actionsPath = path.join(recordingDir, 'actions.json');
  fs.writeFileSync(actionsPath, JSON.stringify({
    id: recording.id,
    title: recording.title,
    viewport: recording.viewport,
    startTime: recording.startTime,
    endTime: new Date().toISOString(),
    actions: recording.actions
  }, null, 2));

  // Generate and save Playwright script
  const scriptPath = path.join(recordingDir, 'recorded-script.js');
  fs.writeFileSync(scriptPath, generateScript(recording));

  // Generate and save markdown
  const markdownPath = path.join(recordingDir, 'screenshots.md');
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
 *
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
 *
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
 *
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
 */
function deleteRecording(outputDir, recordingId) {
  const recordingDir = path.join(outputDir, recordingId);
  if (fs.existsSync(recordingDir)) {
    fs.rmSync(recordingDir, { recursive: true, force: true });
  }

  // Remove from history
  const history = loadHistory(outputDir);
  const filtered = history.filter(r => r.id !== recordingId);
  saveHistory(outputDir, filtered);
}

/**
 * Load a specific recording's actions.json
 *
 * @param {string} outputDir - Base output directory
 * @param {string} recordingId - Recording ID
 * @returns {Object|null} - Recording data or null if not found
 */
function loadRecording(outputDir, recordingId) {
  const actionsPath = path.join(outputDir, recordingId, 'actions.json');
  if (fs.existsSync(actionsPath)) {
    try {
      return JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

module.exports = {
  ensureDir,
  saveRecording,
  saveScreenshot,
  loadHistory,
  saveHistory,
  addToHistory,
  deleteRecording,
  loadRecording
};
