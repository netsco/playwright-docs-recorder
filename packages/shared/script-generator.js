/**
 * Generates a standalone Playwright script from recorded actions.
 *
 * @param {Object} recording - Recording data
 * @param {string|null} recording.title - Optional title for the recording
 * @param {Object} recording.viewport - Viewport dimensions {width, height}
 * @param {Array} recording.actions - Array of recorded actions
 * @param {Array} recording.screenshots - Array of screenshot metadata
 * @param {string|null} recording.separator - Separator between screenshots (default: '---')
 * @param {string} recording.mdFilename - Output markdown filename (default: 'screenshots.md')
 * @returns {string} - Complete Playwright script as string
 */
function generateScript(recording) {
  const { title, viewport, actions, screenshots, separator = '---', mdFilename = 'screenshots.md' } = recording;
  const titleJson = title ? JSON.stringify(title) : 'null';
  const screenshotsJson = JSON.stringify(screenshots);
  const separatorJson = separator ? JSON.stringify(separator) : 'null';

  const lines = [
    '// Generated documentation script - re-run with: node recorded-script.js',
    "const { chromium } = require('playwright');",
    "const fs = require('fs');",
    "const path = require('path');",
    '',
    '(async () => {',
    '  const browser = await chromium.launch({ headless: false });',
    `  const context = await browser.newContext({ viewport: { width: ${viewport.width}, height: ${viewport.height} } });`,
    '  const page = await context.newPage();',
    '',
    '  async function highlight(page, selector) {',
    '    await page.evaluate((sel) => {',
    '      const el = document.querySelector(sel);',
    '      if (el) { el.style.outline = "3px solid #ff6b35"; el.style.outlineOffset = "2px"; }',
    '    }, selector);',
    '  }',
    ''
  ];

  for (const action of actions) {
    switch (action.type) {
      case 'goto':
        lines.push(`  await page.goto('${action.url}');`);
        break;
      case 'click':
        lines.push(`  await page.locator('${action.selector}').click();`);
        break;
      case 'fill':
        lines.push(`  await page.locator('${action.selector}').fill('${action.value}');`);
        break;
      case 'note':
        // Standalone note - just log it
        if (action.note) {
          const escapedNote = action.note.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
          lines.push(`  console.log('\\n📝 Note:');`);
          lines.push(`  console.log(\`${escapedNote}\`);`);
        }
        break;
      case 'screenshot':
        if (action.note) {
          const escapedNote = action.note.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
          lines.push(`  console.log('\\n📸 ${action.filename}');`);
          lines.push(`  console.log(\`${escapedNote}\`);`);
        }
        if (action.highlight) {
          lines.push(`  await highlight(page, '${action.highlight}');`);
        }
        lines.push(`  await page.screenshot({ path: path.join(__dirname, 'screenshots', '${action.filename}') });`);
        break;
    }
  }

  // Add markdown generation
  lines.push('');
  lines.push('  // Generate markdown');
  lines.push(`  const title = ${titleJson};`);
  lines.push(`  const screenshots = ${screenshotsJson};`);
  lines.push(`  const separator = ${separatorJson};`);
  lines.push('  const mdLines = [];');
  lines.push('  if (title) { mdLines.push("---", `title: "${title}"`, "---", ""); }');
  lines.push('  for (const s of screenshots) {');
  lines.push('    if (s.note) { mdLines.push(s.note, ""); }');
  lines.push('    mdLines.push(`![${s.filename}](screenshots/${s.filename})`, "");');
  lines.push('    if (separator) { mdLines.push(separator, ""); }');
  lines.push('  }');
  lines.push(`  fs.writeFileSync(path.join(__dirname, "${mdFilename}"), mdLines.join("\\n"));`);
  lines.push(`  console.log("\\n✅ Generated ${mdFilename}");`);

  lines.push('', '  await browser.close();', '})();');
  return lines.join('\n');
}

module.exports = { generateScript };
