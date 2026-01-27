// Generated documentation script - re-run with: node recorded-script.js
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  async function highlight(page, selector) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) { el.style.outline = "3px solid #ff6b35"; el.style.outlineOffset = "2px"; }
    }, selector);
  }

  await page.goto('http://localhost/user/login');
  await page.goto('http://localhost/user/login');
  await page.goto('http://localhost/user/login');
  await page.goto('http://localhost/user/login');
  await page.goto('http://localhost/user/login');
  await page.locator('a.phpdebugbar-minimize-btn').click();
  await page.locator('a.phpdebugbar-close-btn').click();
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'screenshot-001.png') });

  await browser.close();
})();