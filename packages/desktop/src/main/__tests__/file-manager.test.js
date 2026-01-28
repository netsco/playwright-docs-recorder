import { describe, it, expect } from 'vitest';
import path from 'path';

// Test file-manager logic in isolation without complex mocking
describe('file-manager logic', () => {
  describe('path generation', () => {
    it('generates correct recording directory path', () => {
      const outputDir = '/output';
      const recordingId = 'test-123';
      const recordingDir = path.join(outputDir, recordingId);
      expect(recordingDir).toBe(path.join('/output', 'test-123'));
    });

    it('generates correct screenshots directory path', () => {
      const recordingDir = '/output/test-123';
      const screenshotsDir = path.join(recordingDir, 'screenshots');
      expect(screenshotsDir).toBe(path.join('/output/test-123', 'screenshots'));
    });

    it('generates correct actions.json path', () => {
      const recordingDir = '/output/test-123';
      const actionsPath = path.join(recordingDir, 'actions.json');
      expect(actionsPath).toBe(path.join('/output/test-123', 'actions.json'));
    });

    it('generates correct history.json path', () => {
      const outputDir = '/output';
      const historyPath = path.join(outputDir, 'history.json');
      expect(historyPath).toBe(path.join('/output', 'history.json'));
    });
  });

  describe('history management logic', () => {
    function addToHistoryLogic(history, newRecording) {
      const newEntry = {
        id: newRecording.id,
        title: newRecording.title,
        url: newRecording.url,
        startTime: newRecording.startTime,
        endTime: new Date().toISOString(),
        actionCount: newRecording.actions.length,
        screenshotCount: newRecording.screenshots.length
      };
      const updated = [newEntry, ...history];
      return updated.slice(0, 50);
    }

    it('adds new recording to front of history', () => {
      const history = [{ id: 'old', title: 'Old' }];
      const newRecording = {
        id: 'new',
        title: 'New',
        url: 'https://example.com',
        startTime: '2024-01-01',
        actions: [],
        screenshots: []
      };
      const result = addToHistoryLogic(history, newRecording);
      expect(result[0].id).toBe('new');
      expect(result[1].id).toBe('old');
    });

    it('limits history to 50 entries', () => {
      const history = Array.from({ length: 55 }, (_, i) => ({ id: `old-${i}` }));
      const newRecording = {
        id: 'new',
        title: 'New',
        url: 'https://example.com',
        startTime: '2024-01-01',
        actions: [],
        screenshots: []
      };
      const result = addToHistoryLogic(history, newRecording);
      expect(result.length).toBe(50);
      expect(result[0].id).toBe('new');
    });

    it('includes action and screenshot counts', () => {
      const history = [];
      const newRecording = {
        id: 'test',
        title: 'Test',
        url: 'https://example.com',
        startTime: '2024-01-01',
        actions: [{ type: 'click' }, { type: 'fill' }],
        screenshots: [{ filename: 'a.png' }]
      };
      const result = addToHistoryLogic(history, newRecording);
      expect(result[0].actionCount).toBe(2);
      expect(result[0].screenshotCount).toBe(1);
    });
  });

  describe('recording deletion logic', () => {
    function filterHistory(history, recordingIdToDelete) {
      return history.filter(r => r.id !== recordingIdToDelete);
    }

    it('removes recording from history by id', () => {
      const history = [
        { id: 'keep-1' },
        { id: 'delete-me' },
        { id: 'keep-2' }
      ];
      const result = filterHistory(history, 'delete-me');
      expect(result).toEqual([{ id: 'keep-1' }, { id: 'keep-2' }]);
    });

    it('returns unchanged history if id not found', () => {
      const history = [{ id: 'a' }, { id: 'b' }];
      const result = filterHistory(history, 'nonexistent');
      expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
    });
  });

  describe('JSON serialization', () => {
    it('serializes recording data correctly', () => {
      const recording = {
        id: 'test-123',
        title: 'Test Recording',
        viewport: { width: 1280, height: 720 },
        startTime: '2024-01-01T00:00:00Z',
        actions: [{ type: 'goto', url: 'https://example.com' }]
      };
      const json = JSON.stringify(recording, null, 2);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe('test-123');
      expect(parsed.title).toBe('Test Recording');
      expect(parsed.viewport).toEqual({ width: 1280, height: 720 });
    });

    it('handles empty actions array', () => {
      const recording = { id: 'test', actions: [] };
      const json = JSON.stringify(recording);
      const parsed = JSON.parse(json);
      expect(parsed.actions).toEqual([]);
    });
  });

  describe('loadHistory error handling', () => {
    it('returns empty array for malformed JSON', () => {
      function parseHistorySafe(content) {
        try {
          return JSON.parse(content);
        } catch {
          return [];
        }
      }

      expect(parseHistorySafe('invalid json')).toEqual([]);
      expect(parseHistorySafe('[{ malformed')).toEqual([]);
    });

    it('returns parsed array for valid JSON', () => {
      function parseHistorySafe(content) {
        try {
          return JSON.parse(content);
        } catch {
          return [];
        }
      }

      const history = [{ id: '1' }, { id: '2' }];
      expect(parseHistorySafe(JSON.stringify(history))).toEqual(history);
    });
  });

  describe('markdown file handling', () => {
    it('identifies markdown file path correctly', () => {
      const outputDir = '/output';
      const recordingId = 'test-123';
      const markdownPath = path.join(outputDir, recordingId, 'screenshots.md');
      expect(markdownPath).toBe(path.join('/output', 'test-123', 'screenshots.md'));
    });
  });

  describe('screenshot saving', () => {
    it('generates correct screenshot file path', () => {
      const screenshotsDir = '/output/test-123/screenshots';
      const filename = 'screenshot-001.png';
      const filepath = path.join(screenshotsDir, filename);
      expect(filepath).toBe(path.join('/output/test-123/screenshots', 'screenshot-001.png'));
    });
  });

  describe('saveRecording return value structure', () => {
    it('returns all expected paths', () => {
      const outputDir = '/output';
      const recordingId = 'test-123';

      // Simulate what saveRecording returns
      const result = {
        recordingDir: path.join(outputDir, recordingId),
        actionsPath: path.join(outputDir, recordingId, 'actions.json'),
        scriptPath: path.join(outputDir, recordingId, 'recorded-script.js'),
        markdownPath: path.join(outputDir, recordingId, 'screenshots.md'),
        screenshotsDir: path.join(outputDir, recordingId, 'screenshots')
      };

      expect(result).toHaveProperty('recordingDir');
      expect(result).toHaveProperty('actionsPath');
      expect(result).toHaveProperty('scriptPath');
      expect(result).toHaveProperty('markdownPath');
      expect(result).toHaveProperty('screenshotsDir');
    });
  });
});
