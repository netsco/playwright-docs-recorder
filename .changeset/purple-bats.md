---
"@doc-recorder/desktop": patch
---

Upgrade Vite 7→8 (rolldown) and @vitejs/plugin-react 5→6. The whole
toolchain (vitest, @tailwindcss/vite, plugin-react) supports Vite 8, so
the earlier hold is lifted; the root `overrides` is repointed to Vite 8
to keep a single Vite version across the workspace and avoid a split
install. Verified with a full signed build and a packed-binary boot.
