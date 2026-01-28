/* global document */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Generates a polished screen recording from recorded actions
 * with baked-in highlights, annotations, and proper timing.
 *
 * Usage: node generate-recording.js <actions.json> [options]
 */

class RecordingGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './recording-output';
    this.frameRate = options.frameRate || 2; // frames per second for final video
    this.actionDelay = options.actionDelay || 1500; // ms between actions
    this.highlightDuration = options.highlightDuration || 1000;
    this.videoSize = options.videoSize || { width: 1280, height: 720 };
    this.format = options.format || 'mp4'; // mp4, gif, webm
    this.notePosition = options.notePosition || 'bottom'; // top, bottom
    this.frames = [];
    this.frameCounter = 0;
  }

  // Filter out internal recorder UI actions
  filterActions(actions) {
    return actions.filter(action => {
      if (!action.selector) return true;
      // Skip internal recorder UI selectors
      if (action.selector.includes('__prompt') ||
          action.selector.includes('__shortcuts') ||
          action.selector.includes('__highlight') ||
          action.selector.includes('__recording')) {
        return false;
      }
      return true;
    });
  }

  async generate(actionsFile) {
    const actionsPath = path.resolve(actionsFile);
    const baseDir = path.dirname(actionsPath);
    const data = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));

    // Handle both old format (array) and new format (object with actions array)
    const rawActions = Array.isArray(data) ? data : data.actions;
    const actions = this.filterActions(rawActions);
    const viewport = data.viewport || this.videoSize;

    // Setup output
    fs.mkdirSync(this.outputDir, { recursive: true });
    const framesDir = path.join(this.outputDir, 'frames');
    fs.mkdirSync(framesDir, { recursive: true });

    console.log(`Recording from ${actions.length} actions...`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: viewport
    });
    const page = await context.newPage();

    // Process each action
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      console.log(`  [${i + 1}/${actions.length}] ${action.type}: ${action.selector || action.url || action.filename || ''}`);

      try {
        await this.executeAction(page, action, framesDir, baseDir);
      } catch (err) {
        console.warn(`    Skipped: ${err.message}`);
      }
    }

    await browser.close();

    // Generate final video
    const outputFile = path.join(this.outputDir, `recording.${this.format}`);
    await this.generateVideo(framesDir, outputFile);

    // Cleanup frames
    if (this.format !== 'frames') {
      fs.rmSync(framesDir, { recursive: true, force: true });
    }

    console.log(`\nRecording saved: ${outputFile}`);
    return outputFile;
  }

  async executeAction(page, action, framesDir, _baseDir) {
    switch (action.type) {
      case 'goto':
        await page.goto(action.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
          page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        );
        await this.captureFrames(page, framesDir, 3); // Capture a few frames after navigation
        break;

      case 'click':
        // Highlight before click
        await this.highlightElement(page, action.selector);
        await this.captureFrames(page, framesDir, 2);

        // Perform click
        try {
          await page.locator(action.selector).click({ timeout: 5000 });
        } catch {
          // Try alternative selectors
          await page.click(action.selector, { timeout: 5000 }).catch(() => {});
        }
        await this.clearHighlights(page);
        await page.waitForLoadState('networkidle').catch(() => {});
        await this.captureFrames(page, framesDir, 2);
        break;

      case 'fill':
        await this.highlightElement(page, action.selector);
        await this.captureFrames(page, framesDir, 1);

        try {
          await page.locator(action.selector).fill(action.value, { timeout: 5000 });
        } catch {
          await page.fill(action.selector, action.value, { timeout: 5000 }).catch(() => {});
        }
        await this.captureFrames(page, framesDir, 2);
        await this.clearHighlights(page);
        break;

      case 'screenshot':
        // If there's a highlight associated, apply it
        if (action.highlight) {
          await this.highlightElement(page, action.highlight);
        }
        // Show note overlay if present
        if (action.note) {
          await this.showNote(page, action.note);
          await this.captureFrames(page, framesDir, 5); // Hold longer for notes
          await this.clearNote(page);
        } else {
          await this.captureFrames(page, framesDir, 3);
        }
        if (action.highlight) {
          await this.clearHighlights(page);
        }
        break;
    }
  }

  async highlightElement(page, selector) {
    await page.evaluate((sel) => {
      // Try multiple selector strategies
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
        // Create highlight overlay
        const rect = el.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.className = '__recording-highlight';
        overlay.style.cssText = `
          position: fixed;
          top: ${rect.top - 4}px;
          left: ${rect.left - 4}px;
          width: ${rect.width + 8}px;
          height: ${rect.height + 8}px;
          border: 3px solid #ff6b35;
          background: rgba(255, 107, 53, 0.15);
          border-radius: 4px;
          box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.3), 0 0 20px rgba(255, 107, 53, 0.4);
          pointer-events: none;
          z-index: 999999;
        `;
        document.body.appendChild(overlay);

        // Add pulse animation
        overlay.animate([
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.02)', opacity: 0.9 },
          { transform: 'scale(1)', opacity: 1 }
        ], { duration: 600, iterations: 2 });
      }
    }, selector);
  }

  async clearHighlights(page) {
    await page.evaluate(() => {
      document.querySelectorAll('.__recording-highlight').forEach(el => el.remove());
    });
  }

  async showNote(page, note) {
    const position = this.notePosition;
    await page.evaluate(({ noteText, position }) => {
      // Simple markdown-to-HTML conversion
      let html = noteText
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-family:monospace;">$1</code>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>');

      // Wrap consecutive <li> in <ul>
      html = html.replace(/(<li>.*?<\/li>(?:<br>)?)+/g, (match) => {
        return '<ul style="margin:8px 0;padding-left:20px;">' + match.replace(/<br>/g, '') + '</ul>';
      });

      const overlay = document.createElement('div');
      overlay.className = '__recording-note';
      overlay.innerHTML = html;
      const positionStyle = position === 'top'
        ? 'top: 24px; bottom: auto;'
        : 'bottom: 24px; top: auto;';
      overlay.style.cssText = `
        position: fixed;
        ${positionStyle}
        left: 50%;
        transform: translateX(-50%);
        max-width: 80%;
        background: rgba(0, 0, 0, 0.9);
        color: #fff;
        padding: 16px 24px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 16px;
        line-height: 1.5;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        z-index: 1000000;
        text-align: left;
      `;
      // Style headings
      overlay.querySelectorAll('h1, h2, h3').forEach(h => {
        h.style.cssText = 'margin: 0 0 8px 0; font-weight: 600;';
      });
      overlay.querySelectorAll('h1').forEach(h => h.style.fontSize = '20px');
      overlay.querySelectorAll('h2').forEach(h => h.style.fontSize = '18px');
      overlay.querySelectorAll('h3').forEach(h => h.style.fontSize = '16px');

      document.body.appendChild(overlay);
    }, { noteText: note, position });
  }

  async clearNote(page) {
    await page.evaluate(() => {
      document.querySelectorAll('.__recording-note').forEach(el => el.remove());
    });
  }

  async captureFrames(page, framesDir, count = 1) {
    for (let i = 0; i < count; i++) {
      this.frameCounter++;
      const framePath = path.join(framesDir, `frame-${String(this.frameCounter).padStart(5, '0')}.png`);
      await page.screenshot({ path: framePath });
      this.frames.push(framePath);
    }
  }

  async generateVideo(framesDir, outputFile) {
    const ext = path.extname(outputFile).slice(1);

    console.log(`\nEncoding ${this.frames.length} frames to ${ext}...`);

    return new Promise((resolve, reject) => {
      let args;

      if (ext === 'gif') {
        // Two-pass for better GIF quality
        args = [
          '-framerate', String(this.frameRate),
          '-i', path.join(framesDir, 'frame-%05d.png'),
          '-vf', `fps=${this.frameRate},scale=${this.videoSize.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer`,
          '-loop', '0',
          '-y', outputFile
        ];
      } else if (ext === 'webm') {
        args = [
          '-framerate', String(this.frameRate),
          '-i', path.join(framesDir, 'frame-%05d.png'),
          '-c:v', 'libvpx-vp9',
          '-crf', '30',
          '-b:v', '0',
          '-y', outputFile
        ];
      } else {
        // MP4 default
        args = [
          '-framerate', String(this.frameRate),
          '-i', path.join(framesDir, 'frame-%05d.png'),
          '-c:v', 'libx264',
          '-preset', 'slow',
          '-crf', '22',
          '-pix_fmt', 'yuv420p',
          '-y', outputFile
        ];
      }

      const ffmpeg = spawn('ffmpeg', args);

      ffmpeg.stderr.on('data', (data) => {
        // ffmpeg outputs to stderr
        const line = data.toString();
        if (line.includes('frame=')) {
          process.stdout.write(`\r   ${line.trim()}`);
        }
      });

      ffmpeg.on('close', (code) => {
        console.log('');
        if (code === 0) {
          resolve(outputFile);
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        if (err.code === 'ENOENT') {
          console.error('\nffmpeg not found. Install it:');
          console.error('   Ubuntu/Debian: sudo apt install ffmpeg');
          console.error('   Mac: brew install ffmpeg');
          console.error('   Windows: choco install ffmpeg');

          // Fallback: keep frames
          console.log(`\nFrames saved in: ${framesDir}`);
          resolve(framesDir);
        } else {
          reject(err);
        }
      });
    });
  }
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log(`
Usage: node generate-recording.js <actions.json> [options]

Options:
  --output, -o <dir>     Output directory (default: ./recording-output)
  --format, -f <fmt>     Output format: mp4, gif, webm (default: mp4)
  --fps <n>              Frame rate (default: 2)
  --width <n>            Video width (default: 1280)
  --height <n>           Video height (default: 720)
  --note-position <pos>  Note overlay position: top, bottom (default: bottom)
  --action-gifs          Generate per-action GIFs (click/fill animations)
  --gifs-only            Only generate action GIFs, skip video

Example:
  node generate-recording.js ./doc-output/actions.json -f gif -o ./my-recording
  node generate-recording.js ./doc-output/actions.json --action-gifs
  node generate-recording.js ./doc-output/actions.json --gifs-only
`);
  process.exit(0);
}

// Parse options
const actionsFile = args.find(a => !a.startsWith('-') && a.endsWith('.json'));
const getOpt = (flags) => {
  for (const flag of flags) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  }
  return null;
};
const hasFlag = (flag) => args.includes(flag);

const options = {
  outputDir: getOpt(['--output', '-o']) || './recording-output',
  format: getOpt(['--format', '-f']) || 'mp4',
  frameRate: parseInt(getOpt(['--fps'])) || 2,
  videoSize: {
    width: parseInt(getOpt(['--width'])) || 1280,
    height: parseInt(getOpt(['--height'])) || 720
  },
  notePosition: getOpt(['--note-position']) || 'bottom',
  actionGifs: hasFlag('--action-gifs'),
  gifsOnly: hasFlag('--gifs-only'),
};

if (!actionsFile) {
  console.error('Error: Please provide an actions.json file');
  process.exit(1);
}

async function main() {
  // Generate action GIFs if requested
  if (options.actionGifs || options.gifsOnly) {
    const { generateAllActionGifs } = require('@doc-recorder/shared');
    console.log('\n📽️  Generating per-action GIFs...\n');
    await generateAllActionGifs({
      actionsFile,
      outputDir: options.outputDir,
      config: {
        delay: Math.round(1000 / options.frameRate),
        width: options.videoSize.width,
        height: options.videoSize.height,
      },
    });
  }

  // Generate video unless --gifs-only
  if (!options.gifsOnly) {
    console.log('\n🎬  Generating video recording...\n');
    await new RecordingGenerator(options).generate(actionsFile);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
