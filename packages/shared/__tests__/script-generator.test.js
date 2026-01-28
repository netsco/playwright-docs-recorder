import { describe, it, expect } from 'vitest';
import { generateScript } from '../script-generator.js';

describe('generateScript', () => {
  const baseRecording = {
    title: null,
    viewport: { width: 1280, height: 720 },
    actions: [],
    screenshots: []
  };

  describe('basic structure', () => {
    it('generates valid script with chromium import', () => {
      const script = generateScript(baseRecording);
      expect(script).toContain("const { chromium } = require('playwright')");
    });

    it('includes viewport dimensions from recording', () => {
      const script = generateScript({
        ...baseRecording,
        viewport: { width: 1920, height: 1080 }
      });
      expect(script).toContain('viewport: { width: 1920, height: 1080 }');
    });

    it('launches browser in non-headless mode', () => {
      const script = generateScript(baseRecording);
      expect(script).toContain('headless: false');
    });

    it('includes highlight helper function', () => {
      const script = generateScript(baseRecording);
      expect(script).toContain('async function highlight(page, selector)');
    });

    it('closes browser at the end', () => {
      const script = generateScript(baseRecording);
      expect(script).toContain('await browser.close()');
    });
  });

  describe('goto action', () => {
    it('generates page.goto call', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'goto', url: 'https://example.com' }]
      });
      expect(script).toContain("await page.goto('https://example.com')");
    });

    it('handles URLs with special characters', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'goto', url: 'https://example.com/path?q=test&a=1' }]
      });
      expect(script).toContain("await page.goto('https://example.com/path?q=test&a=1')");
    });
  });

  describe('click action', () => {
    it('generates locator click call', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'click', selector: '#submit-btn' }]
      });
      expect(script).toContain("await page.locator('#submit-btn').click()");
    });

    it('handles complex selectors', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'click', selector: '[data-testid="login-button"]' }]
      });
      expect(script).toContain('await page.locator(\'[data-testid="login-button"]\').click()');
    });
  });

  describe('fill action', () => {
    it('generates locator fill call', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'fill', selector: '#username', value: 'testuser' }]
      });
      expect(script).toContain("await page.locator('#username').fill('testuser')");
    });
  });

  describe('note action', () => {
    it('logs note to console', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'note', note: 'This is a test note' }]
      });
      expect(script).toContain('console.log');
      expect(script).toContain('This is a test note');
    });

    it('escapes backticks in notes', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'note', note: 'Code: `const x = 1`' }]
      });
      expect(script).toContain('\\`');
    });

    it('escapes backslashes in notes', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'note', note: 'Path: C:\\Users\\test' }]
      });
      expect(script).toContain('\\\\');
    });
  });

  describe('screenshot action', () => {
    it('generates screenshot call with filename', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'screenshot', filename: 'test.png' }],
        screenshots: [{ filename: 'test.png' }]
      });
      expect(script).toContain('await page.screenshot');
      expect(script).toContain('test.png');
    });

    it('applies highlight before screenshot when specified', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'screenshot', filename: 'test.png', highlight: '#btn' }],
        screenshots: [{ filename: 'test.png' }]
      });
      expect(script).toContain("await highlight(page, '#btn')");
    });

    it('logs note with screenshot', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [{ type: 'screenshot', filename: 'test.png', note: 'Click the button' }],
        screenshots: [{ filename: 'test.png' }]
      });
      expect(script).toContain('Click the button');
    });
  });

  describe('markdown generation', () => {
    it('includes title when provided', () => {
      const script = generateScript({
        ...baseRecording,
        title: 'My Guide'
      });
      expect(script).toContain('const title = "My Guide"');
    });

    it('uses null for title when not provided', () => {
      const script = generateScript(baseRecording);
      expect(script).toContain('const title = null');
    });

    it('includes separator configuration', () => {
      const script = generateScript({
        ...baseRecording,
        separator: '***'
      });
      expect(script).toContain('const separator = "***"');
    });

    it('uses null separator when separator is null', () => {
      const script = generateScript({
        ...baseRecording,
        separator: null
      });
      expect(script).toContain('const separator = null');
    });
  });

  describe('multiple actions', () => {
    it('generates all actions in order', () => {
      const script = generateScript({
        ...baseRecording,
        actions: [
          { type: 'goto', url: 'https://example.com' },
          { type: 'click', selector: '#login' },
          { type: 'fill', selector: '#username', value: 'test' },
          { type: 'screenshot', filename: 'step1.png' }
        ],
        screenshots: [{ filename: 'step1.png' }]
      });

      const gotoIndex = script.indexOf('page.goto');
      const clickIndex = script.indexOf('.click()');
      const fillIndex = script.indexOf('.fill(');
      const screenshotIndex = script.indexOf('page.screenshot');

      expect(gotoIndex).toBeLessThan(clickIndex);
      expect(clickIndex).toBeLessThan(fillIndex);
      expect(fillIndex).toBeLessThan(screenshotIndex);
    });
  });
});
