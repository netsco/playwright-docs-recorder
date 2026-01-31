import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Plugin to copy marked.umd.js to dist
function copyMarkedPlugin() {
  return {
    name: 'copy-marked',
    closeBundle() {
      const src = path.resolve(__dirname, 'src/renderer/marked.umd.js');
      const dest = path.resolve(__dirname, 'src/renderer/dist/marked.umd.js');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyMarkedPlugin()],
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'src/renderer/dist'),
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
    },
  },
});
