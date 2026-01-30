# @doc-recorder/cli

## 0.4.0

### Minor Changes

- f421f8e: Add scroll action recording to capture and replay window scroll positions. Scroll events are debounced (150ms) and recorded in both CLI and desktop. Generated scripts replay scrolls, refetch restores scroll positions before screenshots, and video generation renders smooth scroll animations.

### Patch Changes

- Updated dependencies [f421f8e]
  - @doc-recorder/shared@0.4.0

## 0.3.0

### Minor Changes

- Add custom CSS injection to hide cookie banners, popups, and other elements during recording.

  CLI: New `-c, --css` and `-cf, --css-file` options for inline CSS or file-based injection.
  Desktop: New "Inject custom CSS" checkbox toggle with textarea and "Load from file" button.

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
