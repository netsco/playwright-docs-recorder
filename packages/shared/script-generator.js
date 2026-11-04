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
        lines.push(`  await page.goto(${JSON.stringify(action.url)});`);
        break;
      case 'click':
        lines.push(`  await page.locator(${JSON.stringify(action.selector)}).click();`);
        break;
      case 'fill':
        lines.push(`  await page.locator(${JSON.stringify(action.selector)}).fill(${JSON.stringify(action.value ?? '')});`);
        break;
      case 'hover':
        lines.push(`  await page.locator(${JSON.stringify(action.selector)}).hover();`);
        break;
      case 'note':
        // Standalone note - just log it
        if (action.note) {
          lines.push('  console.log(\'\\n📝 Note:\');');
          lines.push(`  console.log(${JSON.stringify(action.note)});`);
        }
        break;
      case 'scroll':
        lines.push(`  await page.evaluate(() => window.scrollTo(${action.x}, ${action.y}));`);
        break;
      case 'screenshot':
        if (action.note) {
          lines.push(`  console.log(${JSON.stringify('\n📸 ' + action.filename)});`);
          lines.push(`  console.log(${JSON.stringify(action.note)});`);
        }
        if (action.highlight) {
          lines.push(`  await highlight(page, ${JSON.stringify(action.highlight)});`);
        }
        lines.push(`  await page.screenshot({ path: path.join(__dirname, 'screenshots', ${JSON.stringify(action.filename)}) });`);
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
  lines.push(`  fs.writeFileSync(path.join(__dirname, ${JSON.stringify(mdFilename)}), mdLines.join("\\n"));`);
  lines.push(`  console.log(${JSON.stringify('\n✅ Generated ' + mdFilename)});`);

  lines.push('', '  await browser.close();', '})();');
  return lines.join('\n');
}

module.exports = { generateScript };
