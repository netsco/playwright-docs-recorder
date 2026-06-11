---
"@doc-recorder/desktop": minor
---

Add an Alt+Click "capture region" mode to the recorder. Hold **Alt** and click
an element to set it as the screenshot area; everything outside dims and the
screenshot is cropped to just that element. The region persists across
screenshots until cleared (Ctrl+Shift+X or the Clear button), and Alt+hover
previews the region before locking it.

Refetch is now region-aware on both the desktop webview path and the shared CLI
Playwright path: it re-resolves the selected element by selector, re-crops to
it (the CLI uses Playwright's native `clip`, so no `sharp` is required), and
replays scroll so below-the-fold regions resolve within the captured viewport.
Off-screen regions are clamped on all edges to avoid pulling in surrounding
pixels.
