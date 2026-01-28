#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { generateScript, generateMarkdown, slugify } = require('@doc-recorder/shared');

class DocRecorder {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './doc-output';
    this.scriptName = options.scriptName || 'recorded-script';
    this.viewport = options.viewport || { width: 1280, height: 720 };
    this.title = options.title;
    this.separator = options.separator;
    this.actions = [];
    this.screenshots = [];
    this.screenshotCounter = 0;
    this.highlightedSelector = null;
  }

  async start(url) {
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.mkdirSync(path.join(this.outputDir, 'screenshots'), { recursive: true });

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: this.viewport
    });
    const page = await context.newPage();

    this.browser = browser;
    this.page = page;

    // Expose functions to page
    await page.exposeFunction('__recordAction', (action) => {
      this.actions.push(action);
      console.log(`📝 ${action.type}: ${action.selector || action.url || ''}`);
    });

    await page.exposeFunction('__takeScreenshot', async (selector, note) => {
      await this.takeScreenshot(selector, note);
    });

    await page.exposeFunction('__notifyHighlight', (selector) => {
      this.highlightedSelector = selector;
      console.log(selector ? `🎯 Highlighted: ${selector}` : '🎯 Highlight cleared');
    });

    // Inject on every navigation
    page.on('load', async () => {
      await this.injectPageScript();
    });

    // Record navigations
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame() && frame.url() !== 'about:blank') {
        this.actions.push({ type: 'goto', url: frame.url() });
      }
    });

    // Navigate to URL
    if (url && url !== 'about:blank') {
      try {
        await page.goto(url);
      } catch (err) {
        await browser.close();
        if (err.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
          console.error(`\n❌ Could not resolve URL: ${url}`);
          console.error('   Check that the domain name is correct.\n');
        } else if (err.message.includes('net::ERR_CONNECTION_REFUSED')) {
          console.error(`\n❌ Connection refused: ${url}`);
          console.error('   The server may not be running.\n');
        } else if (err.message.includes('net::ERR_INVALID_URL') || err.message.includes('Invalid URL')) {
          console.error(`\n❌ Invalid URL: ${url}`);
          console.error('   Please provide a valid URL (e.g., https://example.com).\n');
        } else {
          console.error(`\n❌ Failed to navigate to: ${url}`);
          console.error(`   ${err.message}\n`);
        }
        process.exit(1);
      }
    }

    this.printHelp();
    process.on('SIGINT', () => this.stop());
  }

  async injectPageScript() {
    await this.page.evaluate(() => {
      // Skip if already injected
      if (window.__docRecorderInjected) return;
      window.__docRecorderInjected = true;

      // Highlight overlay
      const overlay = document.createElement('div');
      overlay.id = '__highlight-overlay';
      overlay.style.cssText = `
        position: fixed; pointer-events: none; z-index: 999999;
        border: 3px solid #ff6b35; background: rgba(255,107,53,0.15);
        border-radius: 4px; box-shadow: 0 0 0 4px rgba(255,107,53,0.3);
        display: none; transition: all 0.1s;
      `;
      document.body.appendChild(overlay);

      // Shortcuts legend
      const legend = document.createElement('div');
      legend.id = '__shortcuts-legend';
      legend.innerHTML = `
        <div id="__legend-header" style="display:flex;justify-content:space-between;align-items:center;cursor:move;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">
          <span style="font-weight:bold;">Recorder</span>
          <button id="__btn-minimize" style="background:rgba(255,255,255,0.15);border:none;border-radius:3px;padding:2px 6px;color:#fff;cursor:pointer;font-size:12px;line-height:1;">−</button>
        </div>
        <div id="__legend-content">
          <div><kbd>Ctrl+Hover</kbd> Preview</div>
          <div><kbd>Ctrl+Click</kbd> Lock highlight</div>
          <div><kbd>Ctrl+Shift+S</kbd> Screenshot</div>
          <div><kbd>Ctrl+Shift+K</kbd> + note</div>
          <div><kbd>Ctrl+Shift+X</kbd> Clear</div>
        </div>
        <div id="__legend-buttons" style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.3);padding-top:8px;display:flex;gap:6px;">
          <button id="__btn-screenshot" style="background:rgba(255,255,255,0.15);border:none;border-radius:4px;padding:4px 8px;color:#fff;cursor:pointer;font-size:12px;">📷</button>
          <button id="__btn-note" style="background:rgba(255,255,255,0.15);border:none;border-radius:4px;padding:4px 8px;color:#fff;cursor:pointer;font-size:12px;">📝 Note</button>
          <button id="__btn-clear" style="background:rgba(255,255,255,0.15);border:none;border-radius:4px;padding:4px 8px;color:#fff;cursor:pointer;font-size:12px;">✖ Clear</button>
        </div>
      `;
      legend.style.cssText = `
        position: fixed; z-index: 999998;
        background: rgba(0,0,0,0.85); color: #fff; padding: 12px 16px;
        border-radius: 8px; font-family: system-ui, sans-serif; font-size: 12px;
        line-height: 1.8; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        white-space: nowrap; min-width: 180px; user-select: none;
      `;
      // Position in bottom-right initially
      legend.style.right = '20px';
      legend.style.bottom = '20px';
      legend.querySelectorAll('kbd').forEach(kbd => {
        kbd.style.cssText = `
          background: rgba(255,255,255,0.15); padding: 2px 5px; border-radius: 3px;
          font-family: inherit; margin-right: 6px;
        `;
      });
      // Button hover effects
      legend.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.25)');
        btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(255,255,255,0.15)');
      });

      // Minimize toggle
      const legendContent = legend.querySelector('#__legend-content');
      const minimizeBtn = legend.querySelector('#__btn-minimize');
      const legendButtons = legend.querySelector('#__legend-buttons');
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isMinimized = legendContent.style.display === 'none';
        legendContent.style.display = isMinimized ? 'block' : 'none';
        legendButtons.style.borderTop = isMinimized ? '1px solid rgba(255,255,255,0.3)' : 'none';
        legendButtons.style.marginTop = isMinimized ? '8px' : '0';
        legendButtons.style.paddingTop = isMinimized ? '8px' : '0';
        minimizeBtn.textContent = isMinimized ? '−' : '+';
        // Constrain to viewport after expanding (panel is now taller)
        if (isMinimized) {
          setTimeout(() => {
            const rect = legend.getBoundingClientRect();
            if (rect.bottom > window.innerHeight || rect.right > window.innerWidth) {
              legend.style.left = Math.max(0, Math.min(window.innerWidth - rect.width, rect.left)) + 'px';
              legend.style.top = Math.max(0, Math.min(window.innerHeight - rect.height, rect.top)) + 'px';
              legend.style.right = 'auto';
              legend.style.bottom = 'auto';
            }
          }, 0);
        }
      });

      // Drag functionality
      const legendHeader = legend.querySelector('#__legend-header');
      let isDragging = false;
      let dragOffset = { x: 0, y: 0 };

      function constrainToViewport() {
        const rect = legend.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        legend.style.left = Math.max(0, Math.min(maxX, rect.left)) + 'px';
        legend.style.top = Math.max(0, Math.min(maxY, rect.top)) + 'px';
        legend.style.right = 'auto';
        legend.style.bottom = 'auto';
      }

      legendHeader.addEventListener('mousedown', (e) => {
        if (e.target === minimizeBtn) return;
        isDragging = true;
        // Convert to top/left positioning if still using bottom/right
        if (legend.style.right !== 'auto') {
          const rect = legend.getBoundingClientRect();
          legend.style.left = rect.left + 'px';
          legend.style.top = rect.top + 'px';
          legend.style.right = 'auto';
          legend.style.bottom = 'auto';
        }
        dragOffset.x = e.clientX - legend.offsetLeft;
        dragOffset.y = e.clientY - legend.offsetTop;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        const maxX = window.innerWidth - legend.offsetWidth;
        const maxY = window.innerHeight - legend.offsetHeight;
        legend.style.left = Math.max(0, Math.min(maxX, newX)) + 'px';
        legend.style.top = Math.max(0, Math.min(maxY, newY)) + 'px';
      });

      document.addEventListener('mouseup', () => isDragging = false);

      window.addEventListener('resize', () => {
        if (legend.style.right === 'auto') {
          constrainToViewport();
        }
      });

      document.body.appendChild(legend);

      // Custom prompt dialog (native prompt doesn't work in Playwright)
      const promptDialog = document.createElement('div');
      promptDialog.id = '__prompt-dialog';
      const toolbarBtnStyle = 'padding:4px 8px;margin-right:4px;cursor:pointer;border:1px solid #ccc;border-radius:3px;background:#f5f5f5;font-size:12px;font-family:inherit;';
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
        <textarea id="__prompt-input" placeholder="Enter your note..." style="width:100%;height:150px;padding:10px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;font-family:system-ui,sans-serif;resize:vertical;"></textarea>
        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#666;">Ctrl+Enter to save</span>
          <div>
            <button id="__prompt-cancel" style="padding:8px 20px;margin-right:8px;cursor:pointer;border-radius:4px;border:1px solid #ccc;">Cancel</button>
            <button id="__prompt-ok" style="padding:8px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">OK</button>
          </div>
        </div>
      `;
      promptDialog.style.cssText = `
        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #fff; padding: 24px; border-radius: 8px; z-index: 1000000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3); font-family: system-ui, sans-serif;
        min-width: 450px;
      `;
      document.body.appendChild(promptDialog);

      // Markdown toolbar helper
      function insertMarkdown(type) {
        const input = document.getElementById('__prompt-input');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        const selected = text.substring(start, end);

        let before = '', after = '', insert = '';

        switch (type) {
          case 'bold':
            before = '**'; after = '**';
            insert = selected || 'text';
            break;
          case 'italic':
            before = '*'; after = '*';
            insert = selected || 'text';
            break;
          case 'code':
            before = '`'; after = '`';
            insert = selected || 'code';
            break;
          case 'link':
            before = '['; after = '](url)';
            insert = selected || 'link text';
            break;
          case 'h1':
            before = '# '; after = '';
            insert = selected || 'Heading';
            break;
          case 'h2':
            before = '## '; after = '';
            insert = selected || 'Heading';
            break;
          case 'ul':
            before = '- '; after = '';
            insert = selected || 'item';
            break;
          case 'ol':
            before = '1. '; after = '';
            insert = selected || 'item';
            break;
        }

        const newText = text.substring(0, start) + before + insert + after + text.substring(end);
        input.value = newText;
        input.focus();
        input.selectionStart = start + before.length;
        input.selectionEnd = start + before.length + insert.length;
      }

      // Wire up toolbar buttons
      document.getElementById('__md-toolbar').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-md]');
        if (btn) {
          e.preventDefault();
          insertMarkdown(btn.dataset.md);
        }
      });

      // Backdrop
      const backdrop = document.createElement('div');
      backdrop.id = '__prompt-backdrop';
      backdrop.style.cssText = `
        display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 999999;
      `;
      document.body.appendChild(backdrop);

      function showPrompt() {
        return new Promise((resolve) => {
          const input = document.getElementById('__prompt-input');
          const okBtn = document.getElementById('__prompt-ok');
          const cancelBtn = document.getElementById('__prompt-cancel');

          input.value = '';
          promptDialog.style.display = 'block';
          backdrop.style.display = 'block';
          input.focus();

          function cleanup() {
            promptDialog.style.display = 'none';
            backdrop.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            input.removeEventListener('keydown', onKeydown);
          }

          function onOk() {
            cleanup();
            resolve(input.value || null);
          }

          function onCancel() {
            cleanup();
            resolve(null);
          }

          function onKeydown(e) {
            if (e.key === 'Enter' && e.ctrlKey) onOk();
            if (e.key === 'Escape') onCancel();
          }

          okBtn.addEventListener('click', onOk);
          cancelBtn.addEventListener('click', onCancel);
          input.addEventListener('keydown', onKeydown);
        });
      }

      let highlighted = null;
      let isPreviewMode = false;

      function getSelector(el) {
        if (!el || el === document.body) return null;
        if (el.id) return `#${el.id}`;
        if (el.dataset?.testid) return `[data-testid="${el.dataset.testid}"]`;

        // Role + name for accessibility
        const role = el.getAttribute('role');
        const ariaLabel = el.getAttribute('aria-label');
        if (role && ariaLabel) return `[role="${role}"][aria-label="${ariaLabel}"]`;

        // Text content for interactive elements
        if (['BUTTON', 'A', 'LABEL'].includes(el.tagName)) {
          const text = el.textContent?.trim().slice(0, 40);
          if (text && !text.includes('\n')) {
            const selector = `${el.tagName.toLowerCase()}:text("${text}")`;
            return selector;
          }
        }

        // Unique class combo
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c && !/^(hover|focus|active)/.test(c));
          if (classes.length) {
            const sel = el.tagName.toLowerCase() + '.' + classes.slice(0, 2).join('.');
            if (document.querySelectorAll(sel).length === 1) return sel;
          }
        }

        // CSS path
        const path = [];
        let cur = el;
        for (let i = 0; i < 4 && cur && cur !== document.body; i++) {
          let seg = cur.tagName.toLowerCase();
          if (cur.id) { path.unshift(`#${cur.id}`); break; }
          const sibs = Array.from(cur.parentElement?.children || []).filter(s => s.tagName === cur.tagName);
          if (sibs.length > 1) seg += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
          path.unshift(seg);
          cur = cur.parentElement;
        }
        return path.join(' > ');
      }

      function showOverlay(el) {
        const rect = el.getBoundingClientRect();
        Object.assign(overlay.style, {
          display: 'block',
          top: (rect.top - 3) + 'px',
          left: (rect.left - 3) + 'px',
          width: (rect.width + 6) + 'px',
          height: (rect.height + 6) + 'px'
        });
      }

      function hideOverlay() {
        overlay.style.display = 'none';
      }

      function clearHighlight() {
        highlighted = null;
        hideOverlay();
        window.__notifyHighlight(null);
      }

      // Button click handlers
      document.getElementById('__btn-screenshot').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sel = highlighted ? getSelector(highlighted) : null;
        await window.__takeScreenshot(sel, null);
        clearHighlight();
      });

      document.getElementById('__btn-note').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sel = highlighted ? getSelector(highlighted) : null;
        const note = await showPrompt();
        if (note !== null) {
          await window.__takeScreenshot(sel, note || null);
          clearHighlight();
        }
      });

      document.getElementById('__btn-clear').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearHighlight();
      });

      // Keyboard shortcuts
      document.addEventListener('keydown', async (e) => {
        if (!e.ctrlKey || !e.shiftKey) return;

        // Use e.code instead of e.key - Ctrl modifies e.key to control characters
        const code = e.code;

        // H = Toggle highlight on hovered element
        if (code === 'KeyH') {
          e.preventDefault();
          e.stopPropagation();
          const hovered = Array.from(document.querySelectorAll(':hover')).pop();
          if (!hovered) return;

          if (highlighted === hovered) {
            highlighted = null;
            hideOverlay();
            window.__notifyHighlight(null);
          } else {
            highlighted = hovered;
            showOverlay(hovered);
            window.__notifyHighlight(getSelector(hovered));
          }
        }

        // S = Screenshot (includes any visible highlight)
        if (code === 'KeyS') {
          e.preventDefault();
          e.stopPropagation();
          const sel = highlighted ? getSelector(highlighted) : null;
          window.__takeScreenshot(sel, null).then(() => clearHighlight());
        }

        // X = Clear highlight
        if (code === 'KeyX') {
          e.preventDefault();
          e.stopPropagation();
          clearHighlight();
        }

        // K = Screenshot with note
        if (code === 'KeyK') {
          e.preventDefault();
          e.stopPropagation();
          const sel = highlighted ? getSelector(highlighted) : null;
          showPrompt().then(note => {
            if (note !== null) {
              window.__takeScreenshot(sel, note || null).then(() => clearHighlight());
            }
          });
        }
      });

      // Record clicks and handle Ctrl+Click for highlight
      document.addEventListener('click', (e) => {
        const sel = getSelector(e.target);

        // Ctrl+Click = toggle highlight
        if (e.ctrlKey && sel && !sel.includes('__')) {
          e.preventDefault();
          e.stopPropagation();

          if (highlighted === e.target) {
            highlighted = null;
            hideOverlay();
            window.__notifyHighlight(null);
          } else {
            highlighted = e.target;
            showOverlay(e.target);
            window.__notifyHighlight(sel);
          }
          return;
        }

        // Normal click = record action
        if (sel && !sel.includes('__highlight')) {
          window.__recordAction({ type: 'click', selector: sel });
        }
      }, true);

      // Ctrl+hover preview highlight
      document.addEventListener('mousemove', (e) => {
        if (!e.ctrlKey) {
          // Ctrl released - clear preview if not locked
          if (isPreviewMode && !highlighted) {
            hideOverlay();
          }
          isPreviewMode = false;
          return;
        }

        // Ctrl held - show preview on hovered element
        isPreviewMode = true;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el && !el.id?.startsWith('__')) {
          showOverlay(el);
        }
      });

      // Handle Ctrl release to clear preview
      document.addEventListener('keyup', (e) => {
        if (e.key === 'Control' && isPreviewMode && !highlighted) {
          hideOverlay();
          isPreviewMode = false;
        }
      });

      // Record input changes
      document.addEventListener('change', (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
          window.__recordAction({
            type: 'fill',
            selector: getSelector(e.target),
            value: e.target.value
          });
        }
      }, true);
    });
  }

  async takeScreenshot(highlightSelector, note) {
    this.screenshotCounter++;
    const filename = `screenshot-${String(this.screenshotCounter).padStart(3, '0')}.png`;
    const filepath = path.join(this.outputDir, 'screenshots', filename);

    // Hide legend before screenshot
    await this.page.evaluate(() => {
      const legend = document.getElementById('__shortcuts-legend');
      if (legend) legend.style.display = 'none';
    });

    await this.page.screenshot({ path: filepath });

    // Show legend after screenshot
    await this.page.evaluate(() => {
      const legend = document.getElementById('__shortcuts-legend');
      if (legend) legend.style.display = 'block';
    });

    this.screenshots.push({ filename, highlight: highlightSelector, note });
    this.actions.push({ type: 'screenshot', filename, highlight: highlightSelector, note });

    console.log(`📸 ${filename}${highlightSelector ? ` [${highlightSelector}]` : ''}${note ? ` - ${note}` : ''}`);
  }

  async stop() {
    console.log('\n🛑 Saving...');

    const mdFilename = slugify(this.title) + '.md';
    const recording = {
      title: this.title,
      viewport: this.viewport,
      actions: this.actions,
      screenshots: this.screenshots,
      separator: this.separator,
      mdFilename
    };

    const scriptPath = path.join(this.outputDir, this.scriptName + '.js');
    fs.writeFileSync(scriptPath, generateScript(recording));

    fs.writeFileSync(
      path.join(this.outputDir, mdFilename),
      generateMarkdown(recording)
    );

    fs.writeFileSync(
      path.join(this.outputDir, 'actions.json'),
      JSON.stringify({
        title: this.title,
        viewport: this.viewport,
        separator: this.separator,
        actions: this.actions
      }, null, 2)
    );

    await this.browser?.close();

    console.log(`✅ Saved ${this.actions.length} actions, ${this.screenshots.length} screenshots`);
    console.log(`   Script: ${scriptPath}`);
    console.log(`   Markdown: ${mdFilename}`);
    console.log(`   Re-run: node ${scriptPath}`);
    process.exit(0);
  }

  printHelp() {
    console.log(`
┌─────────────────────────────────────────────┐
│  📸 Documentation Recorder                  │
├─────────────────────────────────────────────┤
│  Ctrl+Hover        Preview highlight        │
│  Ctrl+Click        Lock highlight           │
│  Ctrl+Shift+S      Take screenshot          │
│  Ctrl+Shift+K      Screenshot + note        │
│  Ctrl+Shift+X      Clear highlight          │
│  Ctrl+C            Stop & save script       │
└─────────────────────────────────────────────┘
`);
  }
}

// CLI
function prompt(question, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const suffix = defaultValue ? ` (${defaultValue})` : '';
  return new Promise(resolve => {
    rl.question(`${question}${suffix}: `, answer => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

function parseArgs() {
  const args = {
    url: null,
    output: './doc-output',
    viewport: '1280x720',
    title: null,
    separator: '---',
    noSeparator: false,
    nonInteractive: false
  };
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-o' || arg === '--output') args.output = argv[++i];
    else if (arg === '-v' || arg === '--viewport') args.viewport = argv[++i];
    else if (arg === '-t' || arg === '--title') args.title = argv[++i];
    else if (arg === '-s' || arg === '--separator') args.separator = argv[++i];
    else if (arg === '-ns' || arg === '--no-separator') args.noSeparator = true;
    else if (arg === '-n' || arg === '--non-interactive') args.nonInteractive = true;
    else if (arg === '-h' || arg === '--help') {
      console.log(`
📸 Documentation Recorder

Usage: node recorder.js <url> [options]

Options:
  -o, --output <dir>       Output directory (default: ./doc-output)
  -v, --viewport <WxH>     Viewport size (default: 1280x720)
  -t, --title <title>      Document title (required)
  -s, --separator <sep>    Separator between screenshots (default: ---)
  -ns, --no-separator      Disable separator between screenshots
  -n, --non-interactive    Skip prompts, use defaults for optional args
  -h, --help               Show this help message

Examples:
  node recorder.js https://example.com --title "Getting Started"
  node recorder.js https://example.com -t "My Guide" -o ./docs -v 1920x1080
  node recorder.js https://example.com -t "Guide" --no-separator
  node recorder.js https://example.com -t "Quick Doc" -n
`);
      process.exit(0);
    }
    else if (!arg.startsWith('-')) args.url = arg;
  }

  // --no-separator overrides --separator
  if (args.noSeparator) args.separator = null;

  return args;
}

async function main() {
  const args = parseArgs();

  if (args.nonInteractive) {
    // Non-interactive mode: require URL and title
    if (!args.url) {
      console.error('❌ URL is required');
      process.exit(1);
    }
    if (!args.title) {
      console.error('❌ --title is required in non-interactive mode');
      process.exit(1);
    }
  } else {
    // Interactive mode: prompt for missing values
    if (!args.url) {
      console.log('📸 Documentation Recorder\n');
      args.url = await prompt('URL to record');
      if (!args.url) {
        console.error('❌ URL is required');
        process.exit(1);
      }
    }

    if (!args.title) {
      args.title = await prompt('Document title');
      if (!args.title) {
        console.error('❌ Title is required');
        process.exit(1);
      }
    }

    // Prompt for optional values with defaults
    args.output = await prompt('Output directory', args.output);
    args.viewport = await prompt('Viewport (WxH)', args.viewport);
    args.separator = await prompt('Separator (--- or none)', args.separator);
  }

  const [width, height] = args.viewport.split('x').map(Number);
  const viewport = { width: width || 1280, height: height || 720 };

  new DocRecorder({
    outputDir: args.output,
    viewport,
    title: args.title,
    separator: args.separator
  }).start(args.url);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { DocRecorder, main };
