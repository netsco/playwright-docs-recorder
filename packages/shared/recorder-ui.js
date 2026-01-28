/**
 * Shared recorder UI templates
 * Used by CLI recorder and screenshot generator to stay in sync
 */

/**
 * Get the legend innerHTML
 */
function getLegendHTML() {
  return `
    <div id="__legend-header" style="display:flex;justify-content:space-between;align-items:center;cursor:move;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:4px;">
      <span style="font-weight:bold;">Recorder</span>
      <button id="__btn-minimize" style="background:rgba(255,255,255,0.15);border:none;border-radius:3px;padding:2px 6px;color:#fff;cursor:pointer;font-size:12px;line-height:1;">−</button>
    </div>
    <div id="__legend-content">
      <div><kbd>Ctrl+Hover</kbd> Preview</div>
      <div><kbd>Ctrl+Click</kbd> Lock highlight</div>
      <div><kbd>Ctrl+Shift+S</kbd> Screenshot</div>
      <div><kbd>Ctrl+Shift+F</kbd> Full page</div>
      <div><kbd>Ctrl+Shift+K</kbd> + note</div>
      <div><kbd>Ctrl+Shift+X</kbd> Clear</div>
    </div>
    <div id="__legend-buttons" style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.3);padding-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
      <button id="__btn-screenshot" style="background:rgba(255,255,255,0.15);border:none;border-radius:4px;padding:4px 8px;color:#fff;cursor:pointer;font-size:12px;">📷</button>
      <button id="__btn-fullpage" style="background:rgba(255,255,255,0.15);border:none;border-radius:4px;padding:4px 8px;color:#fff;cursor:pointer;font-size:12px;">📄 Full</button>
      <button id="__btn-note" style="background:rgba(255,255,255,0.15);border:none;border-radius:4px;padding:4px 8px;color:#fff;cursor:pointer;font-size:12px;">📝 Note</button>
      <button id="__btn-clear" style="background:rgba(255,255,255,0.15);border:none;border-radius:4px;padding:4px 8px;color:#fff;cursor:pointer;font-size:12px;">✖ Clear</button>
    </div>
  `;
}

/**
 * Get the legend container styles
 */
function getLegendStyles() {
  return `
    position: fixed; z-index: 999998;
    background: rgba(0,0,0,0.85); color: #fff; padding: 12px 16px;
    border-radius: 8px; font-family: system-ui, sans-serif; font-size: 12px;
    line-height: 1.8; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    white-space: nowrap; min-width: 180px; user-select: none;
  `;
}

/**
 * Get the kbd element styles
 */
function getKbdStyles() {
  return `
    background: rgba(255,255,255,0.15); padding: 2px 5px; border-radius: 3px;
    font-family: inherit; margin-right: 6px;
  `;
}

module.exports = { getLegendHTML, getLegendStyles, getKbdStyles };
