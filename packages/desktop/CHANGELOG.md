# @doc-recorder/desktop

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
