const { generateScript } = require('./script-generator');
const { generateMarkdown } = require('./markdown-generator');

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

module.exports = {
  generateScript,
  generateMarkdown,
  slugify
};
