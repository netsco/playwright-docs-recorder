/**
 * Generates a unique CSS/Playwright selector for an element.
 * Priority: #id > [data-testid] > [role][aria-label] > text content > class combo > CSS path
 *
 * @param {Element} el - DOM element to generate selector for
 * @returns {string|null} - Selector string or null if element is body/null
 */
function getSelector(el) {
  if (!el || el === document.body) return null;

  // ID selector
  if (el.id) return `#${el.id}`;

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
    if (cur.id) {
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

// Export for Node.js (will be used in script generation)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getSelector };
}
