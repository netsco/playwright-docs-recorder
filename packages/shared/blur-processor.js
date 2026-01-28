/**
 * Region Blur/Redact Processor
 *
 * Post-processing tool to blur or redact sensitive areas in screenshots.
 * Supports storing blur regions in actions.json for regeneration.
 */

const fs = require('fs');
const path = require('path');

/**
 * Apply blur/redact regions to an image
 * @param {string} imagePath - Path to the image
 * @param {Object[]} regions - Array of blur/redact regions
 * @param {Object} options - Options
 * @returns {Promise<Buffer>} Processed image buffer
 */
async function applyBlurRegions(imagePath, regions, options = {}) {
  const { blurRadius = 10, outputPath = null } = options;

  // Try to use sharp
  const sharp = requireSharp();

  const imageBuffer = fs.readFileSync(imagePath);
  let image = sharp(imageBuffer);
  const metadata = await image.metadata();

  // Process each region
  const composites = [];

  for (const region of regions) {
    const { x, y, width, height, type = 'blur', color = '#000000' } = region;

    // Ensure coordinates are within bounds
    const safeX = Math.max(0, Math.min(x, metadata.width - 1));
    const safeY = Math.max(0, Math.min(y, metadata.height - 1));
    const safeWidth = Math.min(width, metadata.width - safeX);
    const safeHeight = Math.min(height, metadata.height - safeY);

    if (safeWidth <= 0 || safeHeight <= 0) continue;

    if (type === 'blur') {
      // Extract region, blur it, prepare for composite
      const blurredRegion = await sharp(imageBuffer)
        .extract({ left: safeX, top: safeY, width: safeWidth, height: safeHeight })
        .blur(blurRadius)
        .toBuffer();

      composites.push({
        input: blurredRegion,
        left: safeX,
        top: safeY,
      });
    } else if (type === 'redact') {
      // Create solid color rectangle
      const rgba = hexToRgba(color);
      const solidRect = await sharp({
        create: {
          width: safeWidth,
          height: safeHeight,
          channels: 4,
          background: rgba,
        },
      })
        .png()
        .toBuffer();

      composites.push({
        input: solidRect,
        left: safeX,
        top: safeY,
      });
    } else if (type === 'pixelate') {
      // Pixelate by downscaling and upscaling
      const pixelSize = region.pixelSize || 10;
      const downscaledWidth = Math.max(1, Math.floor(safeWidth / pixelSize));
      const downscaledHeight = Math.max(1, Math.floor(safeHeight / pixelSize));

      const pixelatedRegion = await sharp(imageBuffer)
        .extract({ left: safeX, top: safeY, width: safeWidth, height: safeHeight })
        .resize(downscaledWidth, downscaledHeight, { kernel: 'nearest' })
        .resize(safeWidth, safeHeight, { kernel: 'nearest' })
        .toBuffer();

      composites.push({
        input: pixelatedRegion,
        left: safeX,
        top: safeY,
      });
    }
  }

  // Apply all composites
  if (composites.length > 0) {
    image = sharp(imageBuffer).composite(composites);
  }

  const resultBuffer = await image.png().toBuffer();

  // Save if output path specified
  if (outputPath) {
    fs.writeFileSync(outputPath, resultBuffer);
  }

  return resultBuffer;
}

/**
 * Process a recording's screenshots with blur regions from actions.json
 * @param {string} recordingDir - Path to the recording directory
 * @param {Object} options - Options
 */
async function processRecordingBlurRegions(recordingDir, options = {}) {
  const actionsPath = path.join(recordingDir, 'actions.json');

  if (!fs.existsSync(actionsPath)) {
    throw new Error(`actions.json not found in ${recordingDir}`);
  }

  const data = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));
  const actions = data.actions || data;

  const screenshotsDir = path.join(recordingDir, 'screenshots');
  let processedCount = 0;

  for (const action of actions) {
    if (action.type === 'screenshot' && action.blurRegions && action.blurRegions.length > 0) {
      const imagePath = path.join(screenshotsDir, action.filename);

      if (fs.existsSync(imagePath)) {
        console.log(`Processing: ${action.filename}`);
        await applyBlurRegions(imagePath, action.blurRegions, {
          ...options,
          outputPath: imagePath, // Overwrite original
        });
        processedCount++;
      }
    }
  }

  return { processedCount };
}

/**
 * Add blur region to an action in actions.json
 * @param {string} actionsPath - Path to actions.json
 * @param {string} screenshotFilename - Filename of the screenshot
 * @param {Object} region - Blur region to add
 */
function addBlurRegion(actionsPath, screenshotFilename, region) {
  const data = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));
  const actions = data.actions || data;

  const screenshotAction = actions.find(
    a => a.type === 'screenshot' && a.filename === screenshotFilename
  );

  if (!screenshotAction) {
    throw new Error(`Screenshot ${screenshotFilename} not found in actions`);
  }

  if (!screenshotAction.blurRegions) {
    screenshotAction.blurRegions = [];
  }

  screenshotAction.blurRegions.push(region);

  fs.writeFileSync(actionsPath, JSON.stringify(data, null, 2));
}

/**
 * Remove blur region from an action in actions.json
 * @param {string} actionsPath - Path to actions.json
 * @param {string} screenshotFilename - Filename of the screenshot
 * @param {number} regionIndex - Index of the region to remove
 */
function removeBlurRegion(actionsPath, screenshotFilename, regionIndex) {
  const data = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));
  const actions = data.actions || data;

  const screenshotAction = actions.find(
    a => a.type === 'screenshot' && a.filename === screenshotFilename
  );

  if (!screenshotAction || !screenshotAction.blurRegions) {
    throw new Error(`Screenshot ${screenshotFilename} has no blur regions`);
  }

  if (regionIndex < 0 || regionIndex >= screenshotAction.blurRegions.length) {
    throw new Error(`Invalid region index: ${regionIndex}`);
  }

  screenshotAction.blurRegions.splice(regionIndex, 1);

  fs.writeFileSync(actionsPath, JSON.stringify(data, null, 2));
}

/**
 * Convert hex color to RGBA object
 */
function hexToRgba(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0, alpha: 1 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    alpha: 1,
  };
}

/**
 * Require sharp with helpful error message
 */
function requireSharp() {
  try {
    return require('sharp');
  } catch {
    throw new Error(
      'sharp is required for blur processing. Install it with: npm install sharp'
    );
  }
}

module.exports = {
  applyBlurRegions,
  processRecordingBlurRegions,
  addBlurRegion,
  removeBlurRegion,
};
