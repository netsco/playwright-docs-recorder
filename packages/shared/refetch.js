/**
 * Refetch screenshots from a recording.
 * Replays goto and screenshot actions only, skipping click/fill.
 * Preserves and reapplies any blur regions or annotations from the original recording.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { generateMarkdown } = require('./markdown-generator');

// Lazy load blur processor and annotation renderer (require sharp)
function getBlurProcessor() {
  try {
    return require('./blur-processor');
  } catch {
    return null;
  }
}

function getAnnotationRenderer() {
  try {
    return require('./annotation-renderer');
  } catch {
    return null;
  }
}

/**
 * Refetch screenshots for a recording.
 *
 * @param {string} recordingDir - Path to the recording directory (contains actions.json)
 * @param {Object} options - Options
 * @param {boolean} options.headless - Run in headless mode (default: true)
 * @param {Function} options.onProgress - Progress callback (action, index, total)
 * @returns {Promise<Object>} - { success, screenshotCount, error }
 */
async function refetchScreenshots(recordingDir, options = {}) {
  const { headless = true, onProgress } = options;
  const actionsPath = path.join(recordingDir, 'actions.json');
  const screenshotsDir = path.join(recordingDir, 'screenshots');

  // Load actions.json
  if (!fs.existsSync(actionsPath)) {
    return { success: false, error: 'actions.json not found' };
  }

  let recording;
  try {
    recording = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
  } catch (error) {
    return { success: false, error: `Failed to parse actions.json: ${error.message}` };
  }

  const { viewport = { width: 1280, height: 720 }, actions = [] } = recording;

  // Ensure screenshots directory exists
  fs.mkdirSync(screenshotsDir, { recursive: true });

  let browser;
  let screenshotCount = 0;

  try {
    browser = await chromium.launch({ headless });
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    // Helper to get element bounding rect for highlight overlay
    const getHighlightRect = async (selector) => {
      try {
        return await page.evaluate((sel) => {
          let el;
          if (sel.includes(':text(')) {
            const match = sel.match(/:text\("([^"]+)"\)/);
            if (match) {
              const text = match[1];
              const tagMatch = sel.match(/^(\w+):/);
              const tag = tagMatch ? tagMatch[1] : '*';
              const elements = document.querySelectorAll(tag);
              el = Array.from(elements).find(e => e.textContent?.trim().includes(text));
            }
          } else {
            el = document.querySelector(sel);
          }
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return null;
          const cs = window.getComputedStyle(el);
          return {
            x: Math.round(rect.x - 3),
            y: Math.round(rect.y - 3),
            width: Math.round(rect.width + 6),
            height: Math.round(rect.height + 6),
            borderRadius: Math.round(parseFloat(cs.borderRadius) || 4)
          };
        }, selector);
      } catch {
        return null;
      }
    };

    // Process actions
    const totalActions = actions.filter(a => ['goto', 'screenshot', 'scroll'].includes(a.type)).length;
    let actionIndex = 0;

    for (const action of actions) {
      if (action.type === 'goto') {
        actionIndex++;
        if (onProgress) onProgress(action, actionIndex, totalActions);

        try {
          await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (error) {
          console.error(`Failed to navigate to ${action.url}: ${error.message}`);
        }
      } else if (action.type === 'scroll') {
        actionIndex++;
        if (onProgress) onProgress(action, actionIndex, totalActions);

        try {
          await page.evaluate(({ x, y }) => window.scrollTo(x, y), { x: action.x, y: action.y });
        } catch (error) {
          console.warn(`Failed to scroll: ${error.message}`);
        }
      } else if (action.type === 'screenshot') {
        actionIndex++;
        if (onProgress) onProgress(action, actionIndex, totalActions);

        // Resolve highlight element rect if present
        let highlightOverlay = action.highlightOverlay || null;
        if (action.highlight && !highlightOverlay) {
          highlightOverlay = await getHighlightRect(action.highlight);
        }

        // Take clean screenshot (no inline highlight styles)
        const screenshotPath = path.join(screenshotsDir, action.filename);
        try {
          await page.screenshot({ path: screenshotPath, fullPage: action.fullPage || false });
          screenshotCount++;

          // Backup original if we have any overlays to bake
          const hasOverlays = highlightOverlay ||
            (action.blurRegions && action.blurRegions.length > 0) ||
            (action.annotations && action.annotations.length > 0);

          if (hasOverlays) {
            const originalsDir = path.join(recordingDir, 'screenshots-original');
            fs.mkdirSync(originalsDir, { recursive: true });
            const originalPath = path.join(originalsDir, action.filename);
            if (!fs.existsSync(originalPath)) {
              fs.copyFileSync(screenshotPath, originalPath);
            }
          }

          // Reapply blur regions if present in the action
          if (action.blurRegions && action.blurRegions.length > 0) {
            const blurProcessor = getBlurProcessor();
            if (blurProcessor) {
              try {
                await blurProcessor.applyBlurRegions(screenshotPath, action.blurRegions, {
                  outputPath: screenshotPath
                });
                console.log(`  Applied ${action.blurRegions.length} blur region(s) to ${action.filename}`);
              } catch (err) {
                console.warn(`  Failed to apply blur regions to ${action.filename}: ${err.message}`);
              }
            }
          }

          // Build combined annotations: highlight overlay first, then user annotations
          const allAnnotations = [];
          if (highlightOverlay) {
            allAnnotations.push({ type: 'elementHighlight', ...highlightOverlay });
          }
          if (action.annotations && action.annotations.length > 0) {
            allAnnotations.push(...action.annotations);
          }

          // Reapply annotations if any
          if (allAnnotations.length > 0) {
            const annotationRenderer = getAnnotationRenderer();
            if (annotationRenderer) {
              try {
                await annotationRenderer.renderAnnotations(screenshotPath, allAnnotations, {
                  outputPath: screenshotPath
                });
                console.log(`  Applied ${allAnnotations.length} annotation(s) to ${action.filename}`);
              } catch (err) {
                console.warn(`  Failed to apply annotations to ${action.filename}: ${err.message}`);
              }
            }
          }

          // Update highlightOverlay in the action for persistence
          if (highlightOverlay && !action.highlightOverlay) {
            action.highlightOverlay = { ...highlightOverlay, selector: action.highlight };
          }
        } catch (error) {
          console.error(`Failed to take screenshot ${action.filename}: ${error.message}`);
        }
      }
      // Skip click, fill, and note actions
    }

    await browser.close();
    browser = null;

    // Save updated actions.json (may have new highlightOverlay data from resolved selectors)
    fs.writeFileSync(actionsPath, JSON.stringify(recording, null, 2));

    // Regenerate markdown
    const mdFilename = recording.mdFilename || 'screenshots.md';
    const markdownPath = path.join(recordingDir, mdFilename);
    const markdown = generateMarkdown({
      title: recording.title,
      screenshots: recording.screenshots || actions.filter(a => a.type === 'screenshot'),
      separator: recording.separator
    });
    fs.writeFileSync(markdownPath, markdown);

    return { success: true, screenshotCount };
  } catch (error) {
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
}

module.exports = { refetchScreenshots };
