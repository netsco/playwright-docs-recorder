import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/__tests__/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'packages/shared/**/*.js',
        'packages/cli/index.js',
        'packages/desktop/src/main/**/*.js'
      ],
      exclude: [
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/node_modules/**'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    reporters: ['verbose']
  }
});
