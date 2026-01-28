const { ipcRenderer } = require('electron');

// Recording state
let isRecording = false;
let highlighted = null;
let isCtrlHeld = false;
let hoverHighlighted = null; // Temporary highlight during Ctrl+hover

// Listen for recording state changes from renderer
ipcRenderer.on('recording-started', () => {
  isRecording = true;
  console.log('[DocRecorder] Recording started');
});

ipcRenderer.on('recording-stopped', () => {
  isRecording = false;
  highlighted = null;
  hoverHighlighted = null;
  hideOverlay();
  console.log('[DocRecorder] Recording stopped');
});

ipcRenderer.on('clear-highlight', () => {
  highlighted = null;
  hoverHighlighted = null;
  hideOverlay();
  hideHoverOverlay();
  ipcRenderer.sendToHost('highlight-changed', null);
  console.log('[DocRecorder] Highlight cleared');
});

// Listen for screenshot requests from renderer
ipcRenderer.on('take-screenshot', (event, { withNote }) => {
  if (!isRecording) return;

  const selector = highlighted ? getSelector(highlighted) : null;

  if (withNote) {
    ipcRenderer.sendToHost('request-screenshot', { selector, withNote: true });
  } else {
    ipcRenderer.sendToHost('request-screenshot', { selector, note: null, withNote: false });
  }
});

// ===== Selector Generation =====

function getSelector(el) {
  if (!el || el === document.body) return null;

  // ID selector
  if (el.id && !el.id.startsWith('__')) return `#${el.id}`;

  // data-testid attribute
  if (el.dataset?.testid) return `[data-testid="${el.dataset.testid}"]`;

  // Role + aria-label for accessibility
  const role = el.getAttribute('role');
  const ariaLabel = el.getAttribute('aria-label');
  if (role && ariaLabel) return `[role="${role}"][aria-label="${ariaLabel}"]`;

  // Text content for interactive elements (Playwright text selector)
  if (['BUTTON', 'A', 'LABEL'].includes(el.tagName)) {
    const text = el.textContent?.trim().slice(0, 40);
    if (text && !text.includes('\n')) {
      return `${el.tagName.toLowerCase()}:text("${text}")`;
    }
  }

  // Unique class combination
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(' ').filter(c => c && !/^(hover|focus|active)/.test(c));
    if (classes.length) {
      const sel = el.tagName.toLowerCase() + '.' + classes.slice(0, 2).join('.');
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
  }

  // CSS path fallback
  const path = [];
  let cur = el;
  for (let i = 0; i < 4 && cur && cur !== document.body; i++) {
    let seg = cur.tagName.toLowerCase();
    if (cur.id && !cur.id.startsWith('__')) {
      path.unshift(`#${cur.id}`);
      break;
    }
    const sibs = Array.from(cur.parentElement?.children || []).filter(s => s.tagName === cur.tagName);
    if (sibs.length > 1) seg += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
    path.unshift(seg);
    cur = cur.parentElement;
  }
  return path.join(' > ');
}

// ===== UI Injection =====

function injectRecorderUI() {
  if (window.__docRecorderInjected) return;
  window.__docRecorderInjected = true;

  // Highlight overlay (permanent selection)
  const overlay = document.createElement('div');
  overlay.id = '__highlight-overlay';
  overlay.style.cssText = `
    position: fixed; pointer-events: none; z-index: 999999;
    border: 3px solid #ff5245; background: rgba(255,82,69,0.12);
    border-radius: 4px; box-shadow: 0 0 0 4px rgba(255,82,69,0.25);
    display: none; transition: all 0.08s ease-out;
  `;
  document.body.appendChild(overlay);

  // Hover overlay (temporary during Ctrl+hover)
  const hoverOverlay = document.createElement('div');
  hoverOverlay.id = '__hover-overlay';
  hoverOverlay.style.cssText = `
    position: fixed; pointer-events: none; z-index: 999998;
    border: 2px dashed #14b8a6; background: rgba(20,184,166,0.08);
    border-radius: 4px;
    display: none; transition: all 0.05s ease-out;
  `;
  document.body.appendChild(hoverOverlay);
}

// ===== Overlay Functions =====

function showOverlay(el) {
  const overlay = document.getElementById('__highlight-overlay');
  if (!overlay || !el) return;

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
  const overlay = document.getElementById('__highlight-overlay');
  if (overlay) overlay.style.display = 'none';
}

function showHoverOverlay(el) {
  const overlay = document.getElementById('__hover-overlay');
  if (!overlay || !el) return;

  const rect = el.getBoundingClientRect();
  Object.assign(overlay.style, {
    display: 'block',
    top: (rect.top - 2) + 'px',
    left: (rect.left - 2) + 'px',
    width: (rect.width + 4) + 'px',
    height: (rect.height + 4) + 'px'
  });
}

function hideHoverOverlay() {
  const overlay = document.getElementById('__hover-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ===== Event Handlers =====

function setupEventListeners() {
  // Track Ctrl key state
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Control' && isRecording) {
      isCtrlHeld = true;
      document.body.style.cursor = 'crosshair';
    }

    // Keyboard shortcuts (Ctrl+Shift+...)
    if (!e.ctrlKey || !e.shiftKey || !isRecording) return;

    const code = e.code;

    // S = Screenshot
    if (code === 'KeyS') {
      e.preventDefault();
      e.stopPropagation();
      const sel = highlighted ? getSelector(highlighted) : null;
      ipcRenderer.sendToHost('request-screenshot', { selector: sel, note: null, withNote: false });
    }

    // X = Clear highlight
    if (code === 'KeyX') {
      e.preventDefault();
      e.stopPropagation();
      highlighted = null;
      hideOverlay();
      ipcRenderer.sendToHost('highlight-changed', null);
    }

    // K = Screenshot with note
    if (code === 'KeyK') {
      e.preventDefault();
      e.stopPropagation();
      const sel = highlighted ? getSelector(highlighted) : null;
      ipcRenderer.sendToHost('request-screenshot', { selector: sel, withNote: true });
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Control') {
      isCtrlHeld = false;
      document.body.style.cursor = '';
      hideHoverOverlay();
      hoverHighlighted = null;
    }
  });

  // Ctrl+Hover to preview highlight
  document.addEventListener('mousemove', (e) => {
    if (!isRecording || !isCtrlHeld) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === hoverHighlighted) return;

    // Skip our overlay elements
    if (el.id?.startsWith('__')) return;

    hoverHighlighted = el;
    showHoverOverlay(el);
  });

  // Ctrl+Click = lock highlight
  document.addEventListener('click', (e) => {
    const el = e.target;
    const sel = getSelector(el);

    // Ctrl+Click = toggle permanent highlight
    if (e.ctrlKey && sel && !sel.includes('__') && isRecording) {
      e.preventDefault();
      e.stopPropagation();

      if (highlighted === el) {
        highlighted = null;
        hideOverlay();
        ipcRenderer.sendToHost('highlight-changed', null);
      } else {
        highlighted = el;
        showOverlay(el);
        hideHoverOverlay();
        ipcRenderer.sendToHost('highlight-changed', sel);
      }
      return;
    }

    // Normal click = record action
    if (isRecording && sel && !sel.includes('__')) {
      ipcRenderer.sendToHost('record-action', { type: 'click', selector: sel });
    }
  }, true);

  // Record input changes
  document.addEventListener('change', (e) => {
    if (!isRecording) return;

    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      const sel = getSelector(e.target);
      if (sel && !sel.includes('__')) {
        ipcRenderer.sendToHost('record-action', {
          type: 'fill',
          selector: sel,
          value: e.target.value
        });
      }
    }
  }, true);

  // Handle window blur (user left the page while holding Ctrl)
  window.addEventListener('blur', () => {
    isCtrlHeld = false;
    document.body.style.cursor = '';
    hideHoverOverlay();
    hoverHighlighted = null;
  });
}

// ===== Initialization =====

window.addEventListener('DOMContentLoaded', () => {
  injectRecorderUI();
  setupEventListeners();
  console.log('[DocRecorder] Webview preload initialized');
});

// Handle dynamic page changes (SPAs)
const observer = new MutationObserver(() => {
  if (!document.getElementById('__highlight-overlay')) {
    injectRecorderUI();
  }
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: false });
} else {
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: false });
  });
}
