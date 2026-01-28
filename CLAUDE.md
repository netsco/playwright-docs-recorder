# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Playwright Documentation Recorder - an npm workspaces monorepo with CLI and desktop tools for recording browser interactions with on-demand screenshots and element highlighting. Generates rerunnable Playwright scripts with markdown documentation.

### Packages

| Package | Path | Description |
|---------|------|-------------|
| `@doc-recorder/cli` | `packages/cli/` | Command-line recorder tool |
| `@doc-recorder/desktop` | `packages/desktop/` | Electron desktop app with GUI |
| `@doc-recorder/shared` | `packages/shared/` | Shared utilities (script/markdown generation) |

## Commands

```bash
# Install all dependencies (workspaces)
npm install

# CLI - Start recording
npm run record <url> [options]
npm run record https://example.com -o ./my-docs -t "Guide"

# Desktop - Launch Electron app
npm run desktop

# Desktop - Build for distribution
npm run desktop:build

# Replay a recorded session
node doc-output/recorded-script.js

# Generate video from recorded actions (requires ffmpeg)
node generate-recording.js <actions.json> [options]
```

### CLI Options
| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | ./doc-output |
| `-v, --viewport <size>` | Viewport (WIDTHxHEIGHT) | 1280x720 |
| `-t, --title <title>` | Document title | none |
| `-s, --separator <sep>` | Screenshot separator | `---` |
| `--screenshots-only` | Skip recording clicks/fills | false |
| `--refetch <dir>` | Refetch screenshots from recording | - |

### Video Generation Options
| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | ./recording-output |
| `-f, --format <fmt>` | Format: mp4, gif, webm | mp4 |
| `--fps <n>` | Frame rate | 2 |
| `--width <n>` | Video width | 1280 |
| `--height <n>` | Video height | 720 |
| `--note-position <pos>` | Note overlay: top, bottom | bottom |

## Shortcuts

### Mouse
| Action | Result |
|--------|--------|
| `Ctrl+Click` | Highlight clicked element |

### Keyboard
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` | Take screenshot |
| `Ctrl+Shift+K` | Screenshot with note |
| `Ctrl+Shift+X` | Clear highlight |
| `Ctrl+C` | Stop and save |

## Architecture

### @doc-recorder/cli (`packages/cli/`)

`DocRecorder` class in `index.js`:

- **Browser orchestration**: Launches Chromium via Playwright with configurable viewport, injects recording scripts into pages
- **Action recording**: Captures clicks, form inputs, and navigations via DOM event listeners
- **Selector generation**: Prioritizes: `#id` > `[data-testid]` > `[role][aria-label]` > text content > class combos > CSS path
- **Screenshot capture**: Via keyboard shortcuts, with highlight overlay and optional markdown notes
- **Output generation**: Uses `@doc-recorder/shared` for script and markdown generation

Communication between browser and Node via `page.exposeFunction()`:
- `__recordAction` - logs clicks/inputs
- `__takeScreenshot` - captures screenshot with optional note
- `__notifyHighlight` - tracks highlighted element

**In-browser UI elements** (auto-hidden during screenshots):
- Shortcuts legend panel (bottom-right)
- Note dialog with markdown toolbar (Bold, Italic, H1, H2, Lists, Code, Link)

### @doc-recorder/desktop (`packages/desktop/`)

Electron app with IPC architecture:

```
src/
├── main/           # Main process
│   ├── main.js     # App entry, window creation
│   ├── ipc-handlers.js   # Recording control handlers
│   ├── file-manager.js   # Save/load recordings
│   └── settings-store.js # Persistent settings
├── renderer/       # Renderer process
│   ├── index.html  # Main UI
│   ├── renderer.js # UI logic, webview management
│   └── preload.js  # Context bridge
└── webview/        # Webview scripts
    └── webview-preload.js
```

- **Electron Store**: Persists window bounds, output directory, viewport, recent URLs
- **Webview**: Embeds recording target with injected preload scripts
- **Tailwind CSS**: Styling via `src/renderer/styles/`

Desktop-specific features:
- Viewport presets (HD, Full HD, Mobile, Tablet, Custom)
- Screenshots-only mode with credentials warning
- Refetch screenshots from existing recordings
- Draggable recorder panel (constrained to viewport)
- "+" button to start new recording (hidden during active recording)
- Built-in markdown editor with live preview

### @doc-recorder/shared (`packages/shared/`)

Shared utilities consumed by CLI and desktop:

- `generateScript(recording)` - Creates rerunnable Playwright script
- `generateMarkdown(recording)` - Creates markdown with optional YAML front matter
- `slugify(text)` - Converts titles to valid filenames
- `refetchScreenshots(dir, options)` - Replays goto/screenshot actions to regenerate images
- `getLegendHTML()`, `getLegendStyles()`, `getKbdStyles()` - Shared recorder UI templates

## Output Structure

Both CLI and desktop output to `doc-output/` (or custom dir):
- `recorded-script.js` - Rerunnable Playwright script
- `screenshots/` - Captured PNG screenshots
- `<title>.md` - Markdown with front matter (filename is slugified title, e.g., `getting-started.md`)
- `actions.json` - Action log with title, viewport, mdFilename, and actions array

## Video Generation

`generate-recording.js` replays `actions.json` in headless mode, capturing frames with highlight overlays, then encodes to video via ffmpeg.

- Replays goto, click, fill, screenshot actions
- Applies animated highlight overlays to targeted elements
- Renders note annotations as styled overlays (markdown supported)
- Filters out internal recorder UI actions automatically
- Supports Playwright text selectors (`:text("...")`)
- Falls back to keeping raw frames if ffmpeg unavailable

