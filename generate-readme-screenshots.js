/* global document */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { getLegendHTML, getLegendStyles, getKbdStyles } = require('./packages/shared');

/**
 * Generates screenshots for the README showing the recorder UI
 */
async function generateScreenshots() {
  const outputDir = './readme-assets';
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Load the local demo page
  const demoPath = path.resolve(__dirname, 'demo-page.html');
  await page.goto(`file://${demoPath}`);

  // Wait for fonts to load
  await page.waitForTimeout(500);

  // Get shared UI templates
  const legendHTML = getLegendHTML();
  const legendStyles = getLegendStyles();
  const kbdStyles = getKbdStyles();

  // Inject the recorder UI elements
  await page.evaluate(({ legendHTML, legendStyles, kbdStyles }) => {
    // 1. Shortcuts legend (from shared template)
    const legend = document.createElement('div');
    legend.id = '__shortcuts-legend';
    legend.innerHTML = legendHTML;
    legend.style.cssText = legendStyles;
    // Position in bottom-right
    legend.style.right = '20px';
    legend.style.bottom = '20px';
    legend.querySelectorAll('kbd').forEach(kbd => {
      kbd.style.cssText = kbdStyles;
    });
    document.body.appendChild(legend);
  }, { legendHTML, legendStyles, kbdStyles });

  // Screenshot 1: Recorder UI (shortcuts legend)
  console.log('1. Capturing recorder UI...');
  await page.screenshot({ path: path.join(outputDir, 'recorder-ui.png') });

  // Add highlight overlay to a metric card
  await page.evaluate(() => {
    const card = document.querySelector('.metric-card:nth-child(2)');
    if (card) {
      const rect = card.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.id = '__highlight-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: ${rect.top - 4}px;
        left: ${rect.left - 4}px;
        width: ${rect.width + 8}px;
        height: ${rect.height + 8}px;
        border: 3px solid #ff6b35;
        background: rgba(255, 107, 53, 0.15);
        border-radius: 12px;
        box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.3), 0 0 20px rgba(255, 107, 53, 0.4);
        pointer-events: none;
        z-index: 999999;
      `;
      document.body.appendChild(overlay);
    }
  });

  // Screenshot 2: Highlight example
  console.log('2. Capturing highlight example...');
  await page.screenshot({ path: path.join(outputDir, 'highlight-example.png') });

  // Now add the note dialog
  await page.evaluate(() => {
    const toolbarBtnStyle = 'padding:4px 8px;margin-right:4px;cursor:pointer;border:1px solid #ccc;border-radius:3px;background:#f5f5f5;font-size:12px;font-family:inherit;';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = '__prompt-backdrop';
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); z-index: 999999;
    `;
    document.body.appendChild(backdrop);

    // Dialog
    const promptDialog = document.createElement('div');
    promptDialog.id = '__prompt-dialog';
    promptDialog.innerHTML = `
      <div style="margin-bottom:12px;font-weight:bold;">Enter note for screenshot:</div>
      <div id="__md-toolbar" style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:2px;">
        <button type="button" data-md="bold" style="${toolbarBtnStyle}font-weight:bold;">B</button>
        <button type="button" data-md="italic" style="${toolbarBtnStyle}font-style:italic;">I</button>
        <button type="button" data-md="h1" style="${toolbarBtnStyle}">H1</button>
        <button type="button" data-md="h2" style="${toolbarBtnStyle}">H2</button>
        <button type="button" data-md="ul" style="${toolbarBtnStyle}">•</button>
        <button type="button" data-md="ol" style="${toolbarBtnStyle}">1.</button>
        <button type="button" data-md="code" style="${toolbarBtnStyle}font-family:monospace;">&lt;&gt;</button>
        <button type="button" data-md="link" style="${toolbarBtnStyle}">🔗</button>
      </div>
      <textarea id="__prompt-input" placeholder="Enter your note..." style="width:100%;height:150px;padding:10px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;font-family:system-ui,sans-serif;resize:vertical;">## Revenue Card

The **Revenue** metric shows total earnings for the current period.

- Click to view detailed breakdown
- Hover for trend tooltip</textarea>
      <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:#666;">Ctrl+Enter to save</span>
        <div>
          <button id="__prompt-cancel" style="padding:8px 20px;margin-right:8px;cursor:pointer;border-radius:4px;border:1px solid #ccc;">Cancel</button>
          <button id="__prompt-ok" style="padding:8px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">OK</button>
        </div>
      </div>
    `;
    promptDialog.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #fff; padding: 24px; border-radius: 8px; z-index: 1000000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); font-family: system-ui, sans-serif;
      min-width: 450px;
    `;
    document.body.appendChild(promptDialog);
  });

  // Screenshot 3: Note dialog
  console.log('3. Capturing note dialog...');
  await page.screenshot({ path: path.join(outputDir, 'note-dialog.png') });

  await browser.close();

  console.log(`\nScreenshots saved to ${outputDir}/`);
  console.log('  - recorder-ui.png');
  console.log('  - highlight-example.png');
  console.log('  - note-dialog.png');
}

generateScreenshots().catch(console.error);
