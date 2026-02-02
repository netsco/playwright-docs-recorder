/**
 * Annotation Renderer
 *
 * Renders annotations (arrows, circles, rectangles, text) onto screenshots.
 * Supports storing annotations in actions.json for regeneration.
 */

const fs = require('fs');
const path = require('path');

/**
 * Render annotations onto an image
 * @param {string} imagePath - Path to the image
 * @param {Object[]} annotations - Array of annotations
 * @param {Object} options - Options
 * @returns {Promise<Buffer>} Processed image buffer
 */
async function renderAnnotations(imagePath, annotations, options = {}) {
  const { outputPath = null } = options;

  const sharp = requireSharp();

  const imageBuffer = fs.readFileSync(imagePath);
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  // Build SVG overlay
  const svg = createAnnotationSVG(annotations, metadata.width, metadata.height);
  const svgBuffer = Buffer.from(svg);

  // Composite SVG onto image
  const resultBuffer = await image
    .composite([{ input: svgBuffer, gravity: 'northwest' }])
    .png()
    .toBuffer();

  if (outputPath) {
    fs.writeFileSync(outputPath, resultBuffer);
  }

  return resultBuffer;
}

/**
 * Create SVG from annotations
 */
function createAnnotationSVG(annotations, width, height) {
  let elements = '';

  // Add marker definitions for arrows
  const defs = `
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
      </marker>
    </defs>
  `;

  for (const anno of annotations) {
    const color = anno.color || '#ff0000';
    const strokeWidth = anno.strokeWidth || anno.width || 3;

    switch (anno.type) {
      case 'arrow':
        elements += renderArrow(anno, color, strokeWidth);
        break;
      case 'circle':
        elements += renderCircle(anno, color, strokeWidth);
        break;
      case 'rectangle':
      case 'rect':
        elements += renderRectangle(anno, color, strokeWidth);
        break;
      case 'text':
        elements += renderText(anno, color);
        break;
      case 'callout':
        elements += renderCallout(anno, color);
        break;
      case 'highlight':
        elements += renderHighlight(anno, color);
        break;
      case 'elementHighlight':
        elements += renderElementHighlight(anno);
        break;
    }
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${defs}${elements}</svg>`;
}

/**
 * Render arrow annotation
 */
function renderArrow(anno, color, strokeWidth) {
  const { x1, y1, x2, y2 } = anno;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
    stroke="${color}" stroke-width="${strokeWidth}"
    marker-end="url(#arrowhead)" style="color:${color}" />`;
}

/**
 * Render circle annotation
 */
function renderCircle(anno, color, strokeWidth) {
  let cx, cy, rx, ry;
  if (anno.cx !== undefined) {
    cx = anno.cx;
    cy = anno.cy;
    rx = ry = anno.radius || 20;
  } else {
    // Editor format: { x, y, w, h } (top-left corner + dimensions)
    const w = anno.w || anno.width || 0;
    const h = anno.h || anno.height || 0;
    cx = Math.round(anno.x + w / 2);
    cy = Math.round(anno.y + h / 2);
    rx = Math.round(Math.abs(w) / 2);
    ry = Math.round(Math.abs(h) / 2);
  }
  const fill = anno.fill || 'none';
  const fillOpacity = anno.fillOpacity || 0.2;

  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
    stroke="${color}" stroke-width="${strokeWidth}"
    fill="${fill === 'none' ? 'none' : color}" fill-opacity="${fill === 'none' ? 0 : fillOpacity}" />`;
}

/**
 * Render rectangle annotation
 */
function renderRectangle(anno, color, strokeWidth) {
  const rawW = anno.width || anno.w || 0;
  const rawH = anno.height || anno.h || 0;
  const x = Math.round(rawW < 0 ? anno.x + rawW : anno.x);
  const y = Math.round(rawH < 0 ? anno.y + rawH : anno.y);
  const width = Math.round(Math.abs(rawW));
  const height = Math.round(Math.abs(rawH));
  const fill = anno.fill || 'none';
  const fillOpacity = anno.fillOpacity || 0.2;
  const rx = anno.borderRadius || 0;

  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}"
    stroke="${color}" stroke-width="${strokeWidth}"
    fill="${fill === 'none' ? 'none' : color}" fill-opacity="${fill === 'none' ? 0 : fillOpacity}" />`;
}

/**
 * Render text annotation
 */
function renderText(anno, color) {
  const { x, y, text } = anno;
  // Editor sends `width` as a stroke-width scale factor; convert to font size
  const fontSize = anno.fontSize || (anno.width ? Math.max(14, anno.width * 6) : 16);
  const fontFamily = anno.fontFamily || 'Arial, sans-serif';
  const fontWeight = anno.fontWeight || 'bold';

  // Add text shadow/outline for readability
  return `
    <text x="${x}" y="${y}"
      font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}"
      fill="${color}" stroke="white" stroke-width="3" paint-order="stroke fill">
      ${escapeXml(text)}
    </text>
  `;
}

/**
 * Render numbered callout/badge
 */
function renderCallout(anno, color) {
  const { x, y, number, text } = anno;
  const radius = anno.radius || 14;
  const fontSize = anno.fontSize || 14;

  let elements = `
    <circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" />
    <text x="${x}" y="${y}"
      font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
      fill="white" text-anchor="middle" dy="0.35em">
      ${number || ''}
    </text>
  `;

  // Add optional text label
  if (text) {
    const labelX = x + radius + 8;
    elements += `
      <text x="${labelX}" y="${y}"
        font-family="Arial, sans-serif" font-size="${fontSize}"
        fill="${color}" dy="0.35em" stroke="white" stroke-width="2" paint-order="stroke fill">
        ${escapeXml(text)}
      </text>
    `;
  }

  return elements;
}

/**
 * Render highlight (semi-transparent rectangle)
 */
function renderHighlight(anno, color) {
  const x = Math.round(anno.x);
  const y = Math.round(anno.y);
  const width = Math.round(anno.width || anno.w || 0);
  const height = Math.round(anno.height || anno.h || 0);
  const opacity = anno.opacity || 0.3;

  return `<rect x="${x}" y="${y}" width="${width}" height="${height}"
    fill="${color}" fill-opacity="${opacity}" stroke="none" />`;
}

/**
 * Render element highlight overlay (orange rounded rect with glow)
 */
function renderElementHighlight(anno) {
  const x = Math.round(anno.x);
  const y = Math.round(anno.y);
  const width = Math.round(anno.width || anno.w || 0);
  const height = Math.round(anno.height || anno.h || 0);
  const rx = anno.borderRadius || 4;

  // Outer glow
  let svg = `<rect x="${x - 4}" y="${y - 4}" width="${width + 8}" height="${height + 8}" rx="${rx + 2}"
    fill="none" stroke="rgba(255,107,53,0.3)" stroke-width="4" />`;
  // Inner highlight rect with border + fill
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}"
    stroke="#ff6b35" stroke-width="3" fill="rgba(255,107,53,0.15)" />`;

  return svg;
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Process a recording's screenshots with annotations from actions.json
 * @param {string} recordingDir - Path to the recording directory
 * @param {Object} options - Options
 */
async function processRecordingAnnotations(recordingDir, options = {}) {
  const actionsPath = path.join(recordingDir, 'actions.json');

  if (!fs.existsSync(actionsPath)) {
    throw new Error(`actions.json not found in ${recordingDir}`);
  }

  const data = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));
  const actions = data.actions || data;

  const screenshotsDir = path.join(recordingDir, 'screenshots');
  let processedCount = 0;

  for (const action of actions) {
    if (action.type === 'screenshot' && action.annotations && action.annotations.length > 0) {
      const imagePath = path.join(screenshotsDir, action.filename);

      if (fs.existsSync(imagePath)) {
        console.log(`Processing: ${action.filename}`);
        await renderAnnotations(imagePath, action.annotations, {
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
 * Add annotation to a screenshot in actions.json
 * @param {string} actionsPath - Path to actions.json
 * @param {string} screenshotFilename - Filename of the screenshot
 * @param {Object} annotation - Annotation to add
 */
function addAnnotation(actionsPath, screenshotFilename, annotation) {
  const data = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));
  const actions = data.actions || data;

  const screenshotAction = actions.find(
    a => a.type === 'screenshot' && a.filename === screenshotFilename
  );

  if (!screenshotAction) {
    throw new Error(`Screenshot ${screenshotFilename} not found in actions`);
  }

  if (!screenshotAction.annotations) {
    screenshotAction.annotations = [];
  }

  screenshotAction.annotations.push(annotation);

  fs.writeFileSync(actionsPath, JSON.stringify(data, null, 2));
}

/**
 * Remove annotation from a screenshot in actions.json
 * @param {string} actionsPath - Path to actions.json
 * @param {string} screenshotFilename - Filename of the screenshot
 * @param {number} annotationIndex - Index of the annotation to remove
 */
function removeAnnotation(actionsPath, screenshotFilename, annotationIndex) {
  const data = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));
  const actions = data.actions || data;

  const screenshotAction = actions.find(
    a => a.type === 'screenshot' && a.filename === screenshotFilename
  );

  if (!screenshotAction || !screenshotAction.annotations) {
    throw new Error(`Screenshot ${screenshotFilename} has no annotations`);
  }

  if (annotationIndex < 0 || annotationIndex >= screenshotAction.annotations.length) {
    throw new Error(`Invalid annotation index: ${annotationIndex}`);
  }

  screenshotAction.annotations.splice(annotationIndex, 1);

  fs.writeFileSync(actionsPath, JSON.stringify(data, null, 2));
}

/**
 * Require sharp with helpful error message
 */
function requireSharp() {
  try {
    return require('sharp');
  } catch {
    throw new Error(
      'sharp is required for annotation rendering. Install it with: npm install sharp'
    );
  }
}

module.exports = {
  renderAnnotations,
  processRecordingAnnotations,
  addAnnotation,
  removeAnnotation,
  createAnnotationSVG,
};
