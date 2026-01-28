import { describe, it, expect } from 'vitest';
import { generateMarkdown } from '../markdown-generator.js';

describe('generateMarkdown', () => {
  describe('YAML front matter', () => {
    it('includes front matter when title is provided', () => {
      const md = generateMarkdown({
        title: 'My Guide',
        actions: [],
        separator: '---'
      });
      expect(md).toContain('---');
      expect(md).toContain('title: "My Guide"');
    });

    it('omits front matter when title is null', () => {
      const md = generateMarkdown({
        title: null,
        actions: [],
        separator: '---'
      });
      // Should not start with front matter
      expect(md).not.toMatch(/^---\ntitle:/);
    });

    it('omits front matter when title is undefined', () => {
      const md = generateMarkdown({
        actions: [],
        separator: '---'
      });
      expect(md).not.toMatch(/^---\ntitle:/);
    });
  });

  describe('screenshot actions', () => {
    it('embeds screenshot with markdown image syntax', () => {
      const md = generateMarkdown({
        title: null,
        actions: [{ type: 'screenshot', filename: 'test.png' }],
        separator: '---'
      });
      expect(md).toContain('![test.png](screenshots/test.png)');
    });

    it('includes note above screenshot when provided', () => {
      const md = generateMarkdown({
        title: null,
        actions: [{ type: 'screenshot', filename: 'test.png', note: 'Click the button' }],
        separator: '---'
      });
      expect(md).toContain('Click the button');
      // Note should appear before image
      const noteIndex = md.indexOf('Click the button');
      const imageIndex = md.indexOf('![test.png]');
      expect(noteIndex).toBeLessThan(imageIndex);
    });

    it('adds separator after screenshot', () => {
      const md = generateMarkdown({
        title: null,
        actions: [{ type: 'screenshot', filename: 'test.png' }],
        separator: '---'
      });
      const lines = md.split('\n');
      const imageLineIndex = lines.findIndex(l => l.includes('![test.png]'));
      // Separator should be within a few lines after image
      const hasSeperatorAfter = lines.slice(imageLineIndex + 1, imageLineIndex + 4).some(l => l === '---');
      expect(hasSeperatorAfter).toBe(true);
    });

    it('uses custom separator', () => {
      const md = generateMarkdown({
        title: null,
        actions: [{ type: 'screenshot', filename: 'test.png' }],
        separator: '***'
      });
      expect(md).toContain('***');
    });

    it('omits separator when separator is null', () => {
      const md = generateMarkdown({
        title: null,
        actions: [{ type: 'screenshot', filename: 'test.png' }],
        separator: null
      });
      expect(md).not.toContain('---');
    });
  });

  describe('note actions', () => {
    it('includes standalone notes', () => {
      const md = generateMarkdown({
        title: null,
        actions: [{ type: 'note', note: 'This is a standalone note' }],
        separator: '---'
      });
      expect(md).toContain('This is a standalone note');
    });

    it('preserves markdown formatting in notes', () => {
      const md = generateMarkdown({
        title: null,
        actions: [{ type: 'note', note: '**Bold** and _italic_' }],
        separator: '---'
      });
      expect(md).toContain('**Bold** and _italic_');
    });
  });

  describe('multiple actions', () => {
    it('processes all actions in order', () => {
      const md = generateMarkdown({
        title: 'Guide',
        actions: [
          { type: 'note', note: 'Introduction' },
          { type: 'screenshot', filename: 'step1.png', note: 'Step 1' },
          { type: 'screenshot', filename: 'step2.png', note: 'Step 2' }
        ],
        separator: '---'
      });

      const introIndex = md.indexOf('Introduction');
      const step1Index = md.indexOf('Step 1');
      const step2Index = md.indexOf('Step 2');

      expect(introIndex).toBeLessThan(step1Index);
      expect(step1Index).toBeLessThan(step2Index);
    });

    it('ignores non-note and non-screenshot actions', () => {
      const md = generateMarkdown({
        title: null,
        actions: [
          { type: 'goto', url: 'https://example.com' },
          { type: 'click', selector: '#btn' },
          { type: 'screenshot', filename: 'test.png' }
        ],
        separator: '---'
      });
      expect(md).not.toContain('example.com');
      expect(md).not.toContain('#btn');
      expect(md).toContain('![test.png]');
    });
  });

  describe('edge cases', () => {
    it('handles empty actions array', () => {
      const md = generateMarkdown({
        title: 'Empty Guide',
        actions: [],
        separator: '---'
      });
      expect(md).toContain('title: "Empty Guide"');
    });

    it('handles screenshot without note', () => {
      const md = generateMarkdown({
        title: null,
        actions: [{ type: 'screenshot', filename: 'test.png' }],
        separator: '---'
      });
      expect(md).toContain('![test.png](screenshots/test.png)');
    });

    it('uses default separator when not specified', () => {
      const md = generateMarkdown({
        title: null,
        actions: [{ type: 'screenshot', filename: 'test.png' }]
      });
      expect(md).toContain('---');
    });
  });
});
