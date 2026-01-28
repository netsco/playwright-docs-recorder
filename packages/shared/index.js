const { generateScript } = require('./script-generator');
const { generateMarkdown } = require('./markdown-generator');
const { getLegendHTML, getLegendStyles, getKbdStyles } = require('./recorder-ui');

/**
 * Slugify a string for use as a filename
 * @param {string} text - Text to slugify
 * @returns {string} - Slugified text
 */
function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Lazy load refetchScreenshots to avoid requiring playwright at module load
// This allows the desktop app to use shared without playwright installed
let _refetchScreenshots;
function getRefetchScreenshots() {
  if (!_refetchScreenshots) {
    _refetchScreenshots = require('./refetch').refetchScreenshots;
  }
  return _refetchScreenshots;
}

module.exports = {
  generateScript,
  generateMarkdown,
  slugify,
  getLegendHTML,
  getLegendStyles,
  getKbdStyles,
  // Lazy getter for refetchScreenshots - only loads playwright when called
  get refetchScreenshots() {
    return getRefetchScreenshots();
  }
};
