/**
 * Generates markdown documentation from actions (screenshots and notes).
 *
 * @param {Object} recording - Recording data
 * @param {string|null} recording.title - Optional title for YAML front matter
 * @param {Array} recording.actions - Array of recorded actions
 * @returns {string} - Markdown content as string
 */
function generateMarkdown(recording) {
  const { title, actions } = recording;
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
      lines.push(`![${action.filename}](screenshots/${action.filename})`, '');
      lines.push('---', '');
    }
  }

  return lines.join('\n');
}

module.exports = { generateMarkdown };
