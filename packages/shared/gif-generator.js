/* global document */
/**
 * Per-Action GIF Generator
 *
 * Generates short animated GIFs showing before/during/after states
 * of click and fill actions for documentation.
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate an animated GIF for a single action
 * @param {Object} options
 * @param {Object} options.page - Playwright page object
 * @param {Object} options.action - The action to capture (click or fill)
 * @param {string} options.outputPath - Path to save the GIF
 * @param {Object} options.config - Configuration options
 * @returns {Promise<string>} Path to the generated GIF
 */
async function generateActionGif({ page, action, outputPath, config = {} }) {
  const {
    delay = 500,       // ms between frames
    width = null,      // default: use viewport
    height = null,
    highlightColor = '#ff6b35',
  } = config;

  // Capture before state
  const beforeFrame = await page.screenshot();

  // Apply highlight to target element
  await highlightElement(page, action.selector, highlightColor);

  // Capture highlight state
  const highlightFrame = await page.screenshot();

  // Perform action
  if (action.type === 'click') {
    try {
      await page.locator(action.selector).click({ timeout: 5000 });
    } catch {
      try {
        await page.click(action.selector, { timeout: 5000 });
      } catch {
        // Action failed, continue anyway
      }
    }
  } else if (action.type === 'hover') {
    try {
      await page.locator(action.selector).hover({ timeout: 5000 });
    } catch {
      try {
        await page.hover(action.selector, { timeout: 5000 });
      } catch {
        // Action failed, continue anyway
      }
    }
  } else if (action.type === 'fill') {
    try {
      await page.locator(action.selector).fill(action.value, { timeout: 5000 });
    } catch {
      try {
        await page.fill(action.selector, action.value, { timeout: 5000 });
      } catch {
        // Action failed, continue anyway
      }
    }
  }

  // Wait for any transitions
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(300);

  // Capture after state
  const afterFrame = await page.screenshot();

  // Clear highlight
  await clearHighlights(page);

  // Encode to GIF
  const gifPath = await encodeGif({
    frames: [beforeFrame, highlightFrame, afterFrame],
    outputPath,
    delay,
    width: width || page.viewportSize().width,
    height: height || page.viewportSize().height,
  });

  return gifPath;
}

/**
 * Highlight an element on the page
 */
async function highlightElement(page, selector, color = '#ff6b35') {
  await page.evaluate(({ sel, color }) => {
    let el = document.querySelector(sel);

    // Handle Playwright text selectors
    if (!el && sel.includes(':text(')) {
      const match = sel.match(/:text\("(.+)"\)/);
      if (match) {
        const text = match[1];
        const tag = sel.split(':')[0] || '*';
        const elements = document.querySelectorAll(tag);
        el = Array.from(elements).find(e => e.textContent?.includes(text));
      }
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.className = '__gif-highlight';
      overlay.style.cssText = `
        position: fixed;
        top: ${rect.top - 4}px;
        left: ${rect.left - 4}px;
        width: ${rect.width + 8}px;
        height: ${rect.height + 8}px;
        border: 3px solid ${color};
        background: ${color}22;
        border-radius: 4px;
        box-shadow: 0 0 0 4px ${color}44, 0 0 20px ${color}66;
        pointer-events: none;
        z-index: 999999;
      `;
      document.body.appendChild(overlay);
    }
  }, { sel: selector, color });
}

/**
 * Clear all highlight overlays
 */
async function clearHighlights(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.__gif-highlight').forEach(el => el.remove());
  });
}

/**
 * Encode PNG frames to GIF
 * Uses raw frame concatenation with basic GIF header if gif-encoder-2 not available
 */
async function encodeGif({ frames, outputPath, delay, width, height }) {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });

  try {
    // Try using gif-encoder-2 if available
    const GIFEncoder = require('gif-encoder-2');
    const { createCanvas, Image } = require('canvas');

    const encoder = new GIFEncoder(width, height);
    encoder.setDelay(delay);
    encoder.setRepeat(0); // Loop forever
    encoder.start();

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    for (const frameBuffer of frames) {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = frameBuffer;
      });
      ctx.drawImage(img, 0, 0, width, height);
      encoder.addFrame(ctx);
    }

    encoder.finish();
    const buffer = encoder.out.getData();
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  } catch {
    // Fallback: save frames as PNGs and try using ffmpeg
    console.log('gif-encoder-2 not available, falling back to ffmpeg...');

    const tempDir = path.join(dir, '.gif-frames-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });

    // Save frames
    for (let i = 0; i < frames.length; i++) {
      const framePath = path.join(tempDir, `frame-${String(i).padStart(3, '0')}.png`);
      fs.writeFileSync(framePath, frames[i]);
    }

    // Try ffmpeg
    const { spawn } = require('child_process');
    const fps = Math.round(1000 / delay);

    return new Promise((resolve, reject) => {
      const args = [
        '-framerate', String(fps),
        '-i', path.join(tempDir, 'frame-%03d.png'),
        '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer`,
        '-loop', '0',
        '-y', outputPath
      ];

      const ffmpeg = spawn('ffmpeg', args);

      ffmpeg.on('close', (code) => {
        // Cleanup temp frames
        fs.rmSync(tempDir, { recursive: true, force: true });

        if (code === 0) {
          resolve(outputPath);
        } else {
          // Keep frames as fallback
          console.warn(`ffmpeg failed, frames saved in ${tempDir}`);
          resolve(tempDir);
        }
      });

      ffmpeg.on('error', () => {
        // Cleanup temp frames on error
        fs.rmSync(tempDir, { recursive: true, force: true });
        reject(new Error('ffmpeg not available and gif-encoder-2 not installed'));
      });
    });
  }
}

/**
 * Generate GIFs for all click/fill actions in a recording
 * @param {Object} options
 * @param {string} options.actionsFile - Path to actions.json
 * @param {string} options.outputDir - Directory to save GIFs
 * @param {Object} options.config - Configuration options
 * @returns {Promise<Object[]>} Array of generated GIF info
 */
async function generateAllActionGifs({ actionsFile, outputDir, config = {} }) {
  const { chromium } = require('playwright');

  const actionsPath = path.resolve(actionsFile);
  const data = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));

  // Handle both old format (array) and new format (object with actions array)
  const rawActions = Array.isArray(data) ? data : data.actions;
  const viewport = data.viewport || { width: 1280, height: 720 };

  // Filter to actionable items (click, fill)
  const actionableTypes = ['click', 'fill', 'hover'];

  // Create output directory
  const gifsDir = path.join(outputDir, 'gifs');
  fs.mkdirSync(gifsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  const results = [];
  let gifCounter = 0;

  console.log(`Generating action GIFs from ${rawActions.length} actions...`);

  for (let i = 0; i < rawActions.length; i++) {
    const action = rawActions[i];

    // Handle navigation
    if (action.type === 'goto') {
      try {
        await page.goto(action.url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch {
        await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      }
      continue;
    }

    // Generate GIF for click/fill actions
    if (actionableTypes.includes(action.type) && action.selector) {
      gifCounter++;
      const filename = `action-${String(gifCounter).padStart(3, '0')}-${action.type}.gif`;
      const outputPath = path.join(gifsDir, filename);

      console.log(`  [${gifCounter}] ${action.type}: ${action.selector.slice(0, 50)}...`);

      try {
        await generateActionGif({
          page,
          action,
          outputPath,
          config,
        });

        results.push({
          index: i,
          type: action.type,
          selector: action.selector,
          gifFilename: filename,
          gifPath: outputPath,
        });
      } catch (err) {
        console.warn(`    Skipped: ${err.message}`);
      }
    }
  }

  await browser.close();

  console.log(`\nGenerated ${results.length} action GIFs in ${gifsDir}`);
  return results;
}

module.exports = {
  generateActionGif,
  generateAllActionGifs,
  highlightElement,
  clearHighlights,
  encodeGif,
};
