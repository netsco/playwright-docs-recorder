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

    // Helper to highlight an element
    const highlight = async (selector) => {
      try {
        await page.evaluate((sel) => {
          // Handle Playwright text selectors
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
          if (el) {
            el.style.outline = '3px solid #ff6b35';
            el.style.outlineOffset = '2px';
          }
        }, selector);
      } catch {
        // Ignore highlight errors
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

        // Apply highlight if present
        if (action.highlight) {
          await highlight(action.highlight);
        }

        // Take screenshot
        const screenshotPath = path.join(screenshotsDir, action.filename);
        try {
          await page.screenshot({ path: screenshotPath, fullPage: action.fullPage || false });
          screenshotCount++;

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

          // Reapply annotations if present in the action
          if (action.annotations && action.annotations.length > 0) {
            const annotationRenderer = getAnnotationRenderer();
            if (annotationRenderer) {
              try {
                await annotationRenderer.renderAnnotations(screenshotPath, action.annotations, {
                  outputPath: screenshotPath
                });
                console.log(`  Applied ${action.annotations.length} annotation(s) to ${action.filename}`);
              } catch (err) {
                console.warn(`  Failed to apply annotations to ${action.filename}: ${err.message}`);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to take screenshot ${action.filename}: ${error.message}`);
        }

        // Clear highlight
        if (action.highlight) {
          await page.evaluate(() => {
            const highlighted = document.querySelector('[style*="outline: 3px solid"]');
            if (highlighted) {
              highlighted.style.outline = '';
              highlighted.style.outlineOffset = '';
            }
          });
        }
      }
      // Skip click, fill, and note actions
    }

    await browser.close();
    browser = null;

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
