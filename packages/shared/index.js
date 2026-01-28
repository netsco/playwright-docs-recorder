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

// Lazy load gif-generator (also requires playwright)
let _gifGenerator;
function getGifGenerator() {
  if (!_gifGenerator) {
    _gifGenerator = require('./gif-generator');
  }
  return _gifGenerator;
}

// Lazy load blur-processor (requires sharp)
let _blurProcessor;
function getBlurProcessor() {
  if (!_blurProcessor) {
    _blurProcessor = require('./blur-processor');
  }
  return _blurProcessor;
}

// Lazy load annotation-renderer (requires sharp)
let _annotationRenderer;
function getAnnotationRenderer() {
  if (!_annotationRenderer) {
    _annotationRenderer = require('./annotation-renderer');
  }
  return _annotationRenderer;
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
  },
  // Lazy getter for gif generation
  get generateAllActionGifs() {
    return getGifGenerator().generateAllActionGifs;
  },
  get generateActionGif() {
    return getGifGenerator().generateActionGif;
  },
  // Lazy getter for blur processing (requires sharp)
  get applyBlurRegions() {
    return getBlurProcessor().applyBlurRegions;
  },
  get processRecordingBlurRegions() {
    return getBlurProcessor().processRecordingBlurRegions;
  },
  // Lazy getter for annotation rendering (requires sharp)
  get renderAnnotations() {
    return getAnnotationRenderer().renderAnnotations;
  },
  get processRecordingAnnotations() {
    return getAnnotationRenderer().processRecordingAnnotations;
  }
};
