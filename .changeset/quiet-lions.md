---
"@doc-recorder/desktop": patch
---

Upgrade electron-store from v8 to v11. Since v9+ is ESM-only, the main
process now loads it via a dynamic `import()` in an async
`initSettingsStore()` (awaited during app startup) instead of a top-level
`require()`. The electron-builder bundling list in `scripts/prebuild.js`
was regenerated for the new conf v15 dependency tree. No user-facing
behaviour change; verified with a full signed build and a packed-binary
boot.
