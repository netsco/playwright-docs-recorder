# @doc-recorder/desktop

## 0.12.2

### Patch Changes

- 51cf8de: Upgrade Vite 7→8 (rolldown) and @vitejs/plugin-react 5→6. The whole
  toolchain (vitest, @tailwindcss/vite, plugin-react) supports Vite 8, so
  the earlier hold is lifted; the root `overrides` is repointed to Vite 8
  to keep a single Vite version across the workspace and avoid a split
  install. Verified with a full signed build and a packed-binary boot.
- 3febc6e: Upgrade electron-store from v8 to v11. Since v9+ is ESM-only, the main
  process now loads it via a dynamic `import()` in an async
  `initSettingsStore()` (awaited during app startup) instead of a top-level
  `require()`. The electron-builder bundling list in `scripts/prebuild.js`
  was regenerated for the new conf v15 dependency tree. No user-facing
  behaviour change; verified with a full signed build and a packed-binary
  boot.
- fe31f19: Update dependencies: Electron 40→42, marked 17→18, lucide-react 0→1,
  electron-updater 6.8.3, sharp 0.34.5, Playwright 1.60, ESLint 10, and
  other dev tooling. The `scripts/prebuild.js` bundling list was updated for
  sharp 0.34's dropped `color` dependency. (`electron-store` and `vite` were
  bumped separately in this release — see the entries above.)

## 0.12.1

### Patch Changes

- Reduce renderer re-renders by splitting the app context into separate
  state and dispatch contexts, memoizing dirty-checks in the steps editor,
  and moving the screenshot editor's draw gesture to refs with a
  requestAnimationFrame-throttled redraw. Action-log and screenshot-preview
  lists now use stable keys, and the action log is capped at 500 entries to
  bound memory during long recordings.

## 0.12.0

### Minor Changes

- Add a zoom control (fit-to-window / percentage) to the recording view so
  large viewport resolutions are fully visible without changing the recorded
  resolution. The chosen zoom is persisted across sessions. Also remediated
  npm dependency advisories (electron and transitive deps) and added an About
  dialog with in-app update checking.

## 0.11.0

### Minor Changes

- Add steps editor for editing recorded steps with action replay, per-project auth state persistence, and various bug fixes including highlight saving, refetch reliability, and dialog overlay z-index.

## 0.10.0

### Minor Changes

- Custom titlebar with hamburger menu, sidebar toggle button, and native window controls overlay. Fixes editor panel width with frontmatter-only content and screenshot editor overlapping the titlebar.

## 0.9.4

### Patch Changes

- Fix shortcuts overlay showing on project listing page and recording viewport not using project defaults.

## 0.9.3

### Patch Changes

- Fix CI build step for Tailwind v4 Vite plugin migration.

## 0.9.0

### Minor Changes

- Add project import/export as ZIP archives, use page title as screenshot alt text in markdown, and improve light mode palette and modal label spacing.

### Patch Changes

- Updated dependencies
  - @doc-recorder/shared@0.6.1

## 0.8.0

### Minor Changes

- Migrate desktop renderer to React with shadcn/ui, add light/dark theme toggle, non-destructive highlight overlays for screenshots, unsaved changes guard in markdown editor, redesigned frontmatter preview card, hover action recording and replay, and refetch improvements.

### Patch Changes

- Updated dependencies
  - @doc-recorder/shared@0.6.0

## 0.7.0

### Minor Changes

- 219e977: Add hover action recording via Ctrl+Shift+H shortcut. Hover actions are stored in actions.json, replayed in generated scripts, and supported in video/GIF generation.

### Patch Changes

- Updated dependencies [219e977]
  - @doc-recorder/shared@0.5.0

## 0.6.0

### Minor Changes

- f421f8e: Add scroll action recording to capture and replay window scroll positions. Scroll events are debounced (150ms) and recorded in both CLI and desktop. Generated scripts replay scrolls, refetch restores scroll positions before screenshots, and video generation renders smooth scroll animations.

### Patch Changes

- Updated dependencies [f421f8e]
  - @doc-recorder/shared@0.4.0

## 0.5.2

### Patch Changes

- Fix electron-builder dependency bundling issues with prebuild and afterPack scripts

## 0.5.1

### Patch Changes

- Improve screenshot previews in sidebar

  - Clear screenshot previews from sidebar when recording stops
  - Display screenshots in a 2-column grid layout
  - Show full screenshots without distortion

## 0.5.0

### Minor Changes

- Improve refetch UX with progress modal and editor dirty checks

  - Fix webview dom-ready issue causing refetch failures
  - Add dirty check before navigating away from editor with unsaved changes
  - Add folder icon to project cards to open project folder
  - Update status text properly across all navigation states
  - Use progress modal for both single and bulk refetch operations
  - Show summary with success/failure counts when refetch completes
  - Display error list for failed recordings in bulk refetch

## 0.3.0

### Minor Changes

- Add custom CSS injection to hide cookie banners, popups, and other elements during recording.

  CLI: New `-c, --css` and `-cf, --css-file` options for inline CSS or file-based injection.
  Desktop: New "Inject custom CSS" checkbox toggle with textarea and "Load from file" button.

## 0.2.2

### Patch Changes

- Fix Windows CI build by using normal compression instead of maximum (avoids 7zip dependency)

## 0.2.1

### Patch Changes

- Fix CI build by making husky optional in prepare script

## 0.2.0

### Minor Changes

- 100a3e1: Add shared recorder UI templates and desktop app improvements

  - Shared: New recorder-ui.js with getLegendHTML/getLegendStyles/getKbdStyles
  - Shared: New refetch.js utility for screenshot regeneration
  - CLI: Updated to use shared recorder UI templates
  - Desktop: Add "+" new recording button (replaces sidebar toggle)
  - Desktop: Draggable shortcuts panel (constrained to viewport)
  - Desktop: Scrollable welcome panel
  - Desktop: Rename separator label to "Screenshot Separator"
  - Desktop: Fix markdown filename slugification
  - All packages: Set up changesets for versioning

### Patch Changes

- Updated dependencies [100a3e1]
  - @doc-recorder/shared@0.2.0
