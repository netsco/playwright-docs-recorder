/**
 * Generates markdown documentation from actions (screenshots and notes).
 *
 * @param {Object} recording - Recording data
 * @param {string|null} recording.title - Optional title for YAML front matter
 * @param {Array} recording.actions - Array of recorded actions
 * @param {string|null} recording.separator - Separator between screenshots (default: '---')
 * @returns {string} - Markdown content as string
 */
function generateMarkdown(recording) {
  const { title, actions, separator = '---' } = recording;
  const lines = [];

  // YAML front matter if title provided
  if (title) {
    lines.push('---', `title: "${title}"`, '---', '');
  }

  // Process actions - screenshots and standalone notes
  for (const action of actions) {
    if (action.type === 'note') {
      // Standalone note
      lines.push(action.note, '');
      lines.push('');
    } else if (action.type === 'screenshot') {
      // Screenshot with optional note
      if (action.note) {
        lines.push(action.note, '');
      }
      lines.push(`![${action.pageTitle || action.filename}](screenshots/${action.filename})`, '');
      if (separator) {
        lines.push(separator, '');
      }
    }
  }

  return lines.join('\n');
}

module.exports = { generateMarkdown };
