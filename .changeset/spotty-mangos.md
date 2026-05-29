---
"@doc-recorder/desktop": patch
---

Update dependencies: Electron 40→42, marked 17→18, lucide-react 0→1,
electron-updater 6.8.3, sharp 0.34.5, Playwright 1.60, ESLint 10, and
other dev tooling.

Two packages are intentionally held back:
- `electron-store` stays at v8 because v9+ is ESM-only and the main
  process loads it via CommonJS `require`.
- `vite` is held at v7 (with a root `overrides` pinning a single version
  across the workspace) because the bumped tooling pulls a second vite 8
  copy, which breaks the desktop build's plugin resolution. A vite 8
  upgrade needs the whole vite/vitest toolchain moved together.

The prebuild bundling list was updated for sharp 0.34's dropped `color`
dependency and the relocated `mimic-fn`.
