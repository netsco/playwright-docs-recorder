const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class DocRecorder {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './doc-output';
    this.scriptName = options.scriptName || 'recorded-script';
    this.actions = [];
    this.screenshots = [];
    this.screenshotCounter = 0;
    this.highlightedSelector = null;
  }

  async start(url) {
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.mkdirSync(path.join(this.outputDir, 'screenshots'), { recursive: true });

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    this.browser = browser;
    this.page = page;

    // Expose functions to page
    await page.exposeFunction('__recordAction', (action) => {
      this.actions.push(action);
      console.log(`📝 ${action.type}: ${action.selector || action.url || ''}`);
    });

    await page.exposeFunction('__takeScreenshot', async (selector) => {
      await this.takeScreenshot(selector);
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
      await page.goto(url);
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

      let highlighted = null;

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

      // Keyboard shortcuts
      document.addEventListener('keydown', async (e) => {
        if (!e.ctrlKey || !e.shiftKey) return;

        const key = e.key.toUpperCase();
        
        // H = Toggle highlight on hovered element
        if (key === 'H') {
          e.preventDefault();
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
        
        // S = Screenshot (no highlight)
        if (key === 'S') {
          e.preventDefault();
          window.__takeScreenshot(null);
        }
        
        // C = Screenshot with current highlight
        if (key === 'C') {
          e.preventDefault();
          const sel = highlighted ? getSelector(highlighted) : null;
          window.__takeScreenshot(sel);
        }
      });

      // Record clicks
      document.addEventListener('click', (e) => {
        const sel = getSelector(e.target);
        if (sel && !sel.includes('__highlight')) {
          window.__recordAction({ type: 'click', selector: sel });
        }
      }, true);

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

  async takeScreenshot(highlightSelector) {
    this.screenshotCounter++;
    const filename = `screenshot-${String(this.screenshotCounter).padStart(3, '0')}.png`;
    const filepath = path.join(this.outputDir, 'screenshots', filename);
    
    await this.page.screenshot({ path: filepath });
    
    this.screenshots.push({ filename, highlight: highlightSelector });
    this.actions.push({ type: 'screenshot', filename, highlight: highlightSelector });
    
    console.log(`📸 ${filename}${highlightSelector ? ` [${highlightSelector}]` : ''}`);
  }

  generateScript() {
    const lines = [
      '// Generated documentation script - re-run with: node recorded-script.js',
      "const { chromium } = require('playwright');",
      "const path = require('path');",
      '',
      '(async () => {',
      '  const browser = await chromium.launch({ headless: false });',
      '  const page = await browser.newPage();',
      '',
      '  async function highlight(page, selector) {',
      '    await page.evaluate((sel) => {',
      '      const el = document.querySelector(sel);',
      '      if (el) { el.style.outline = "3px solid #ff6b35"; el.style.outlineOffset = "2px"; }',
      '    }, selector);',
      '  }',
      ''
    ];

    for (const action of this.actions) {
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
        case 'screenshot':
          if (action.highlight) {
            lines.push(`  await highlight(page, '${action.highlight}');`);
          }
          lines.push(`  await page.screenshot({ path: path.join(__dirname, 'screenshots', '${action.filename}') });`);
          break;
      }
    }

    lines.push('', '  await browser.close();', '})();');
    return lines.join('\n');
  }

  async stop() {
    console.log('\n🛑 Saving...');
    
    const scriptPath = path.join(this.outputDir, this.scriptName + '.js');
    fs.writeFileSync(scriptPath, this.generateScript());
    
    fs.writeFileSync(
      path.join(this.outputDir, 'actions.json'),
      JSON.stringify(this.actions, null, 2)
    );
    
    await this.browser?.close();
    
    console.log(`✅ Saved ${this.actions.length} actions, ${this.screenshots.length} screenshots`);
    console.log(`   Script: ${scriptPath}`);
    console.log(`   Re-run: node ${scriptPath}`);
    process.exit(0);
  }

  printHelp() {
    console.log(`
┌──────────────────────────────────────────┐
│  📸 Documentation Recorder               │
├──────────────────────────────────────────┤
│  Ctrl+Shift+H  Highlight hovered element │
│  Ctrl+Shift+S  Take screenshot           │
│  Ctrl+Shift+C  Screenshot + highlight    │
│  Ctrl+C        Stop & save script        │
└──────────────────────────────────────────┘
`);
  }
}

// Run
const url = process.argv[2];
const outputDir = process.argv[3] || './doc-output';

if (!url) {
  console.log('Usage: node recorder.js <url> [output-dir]');
  console.log('Example: node recorder.js https://example.com ./my-docs');
  process.exit(1);
}

new DocRecorder({ outputDir }).start(url);
