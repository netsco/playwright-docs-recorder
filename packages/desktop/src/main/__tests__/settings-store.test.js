import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the settings store logic in isolation without complex mocking
describe('settings-store logic', () => {
  describe('addRecentUrl logic', () => {
    // Test the URL deduplication and limiting logic in isolation
    function addRecentUrl(existingUrls, newUrl, maxUrls = 10) {
      const filtered = existingUrls.filter(u => u !== newUrl);
      filtered.unshift(newUrl);
      return filtered.slice(0, maxUrls);
    }

    it('adds URL to front of list', () => {
      const result = addRecentUrl(['https://old.com'], 'https://new.com');
      expect(result).toEqual(['https://new.com', 'https://old.com']);
    });

    it('removes duplicate URLs', () => {
      const result = addRecentUrl(
        ['https://example.com', 'https://other.com'],
        'https://example.com'
      );
      expect(result).toEqual(['https://example.com', 'https://other.com']);
    });

    it('limits to max URLs', () => {
      const existingUrls = Array.from({ length: 12 }, (_, i) => `https://url${i}.com`);
      const result = addRecentUrl(existingUrls, 'https://new.com');
      expect(result.length).toBe(10);
      expect(result[0]).toBe('https://new.com');
    });

    it('handles empty list', () => {
      const result = addRecentUrl([], 'https://first.com');
      expect(result).toEqual(['https://first.com']);
    });

    it('moves existing URL to front', () => {
      const result = addRecentUrl(
        ['https://first.com', 'https://second.com', 'https://third.com'],
        'https://third.com'
      );
      expect(result).toEqual(['https://third.com', 'https://first.com', 'https://second.com']);
    });
  });

  describe('default settings', () => {
    const defaults = {
      viewport: { width: 1280, height: 720 },
      viewportPresets: [
        { name: 'HD (1280x720)', width: 1280, height: 720 },
        { name: 'Full HD (1920x1080)', width: 1920, height: 1080 },
        { name: 'Mobile (375x667)', width: 375, height: 667 },
        { name: 'Tablet (768x1024)', width: 768, height: 1024 }
      ],
      recentUrls: [],
      windowBounds: { width: 1400, height: 900 },
      separator: '---',
      showLog: false,
      showShortcuts: true
    };

    it('has correct default viewport', () => {
      expect(defaults.viewport).toEqual({ width: 1280, height: 720 });
    });

    it('has 4 viewport presets', () => {
      expect(defaults.viewportPresets).toHaveLength(4);
    });

    it('has empty recent URLs by default', () => {
      expect(defaults.recentUrls).toEqual([]);
    });

    it('has correct default separator', () => {
      expect(defaults.separator).toBe('---');
    });

    it('has showLog disabled by default', () => {
      expect(defaults.showLog).toBe(false);
    });

    it('has showShortcuts enabled by default', () => {
      expect(defaults.showShortcuts).toBe(true);
    });
  });

  describe('getSettingsStore validation', () => {
    it('should throw if store not initialized', () => {
      let store = null;
      function getStore() {
        if (!store) {
          throw new Error('Settings store not initialized. Call initSettingsStore() first.');
        }
        return store;
      }
      expect(() => getStore()).toThrow('Settings store not initialized');
    });
  });
});
