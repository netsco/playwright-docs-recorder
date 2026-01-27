# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Playwright Documentation Recorder - a tool that records browser interactions with on-demand screenshots and element highlighting, then generates rerunnable Playwright scripts with markdown documentation.

## Commands

```bash
# Install dependencies
npm install

# Start recording
node recorder.js <url> [output-dir] [viewport] [title]

# Examples
node recorder.js https://example.com ./my-docs
node recorder.js https://example.com ./my-docs 1920x1080
node recorder.js https://example.com ./my-docs 1280x720 "Getting Started Guide"

# Replay a recorded session
node doc-output/recorded-script.js

# Generate video from recorded actions (requires ffmpeg)
node generate-recording.js <actions.json> [options]

# Video examples
node generate-recording.js ./doc-output/actions.json
node generate-recording.js ./doc-output/actions.json -f gif -o ./my-recording
node generate-recording.js ./doc-output/actions.json --fps 4 --format webm
```

Default viewport is 1280x720. Title adds YAML front matter to generated markdown.

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

Single-file tool (`recorder.js`) containing the `DocRecorder` class:

- **Browser orchestration**: Launches Chromium via Playwright with configurable viewport, injects recording scripts into pages
- **Action recording**: Captures clicks, form inputs, and navigations via DOM event listeners
- **Selector generation**: Prioritizes: `#id` > `[data-testid]` > `[role][aria-label]` > text content > class combos > CSS path
- **Screenshot capture**: Via mouse (Ctrl+Click) or keyboard shortcuts, with highlight overlay and optional markdown notes
- **Script generation**: Outputs standalone Playwright script that replays actions, regenerates screenshots and markdown
- **Markdown generation**: Creates `screenshots.md` with YAML front matter (if title provided) and embedded screenshots

Communication between browser and Node via `page.exposeFunction()`:
- `__recordAction` - logs clicks/inputs
- `__takeScreenshot` - captures screenshot with optional note
- `__notifyHighlight` - tracks highlighted element

**In-browser UI elements** (auto-hidden during screenshots):
- Shortcuts legend panel (bottom-right)
- Note dialog with markdown toolbar (Bold, Italic, H1, H2, Lists, Code, Link)

## Output Structure

Recordings output to `doc-output/` (or custom dir):
- `recorded-script.js` - Rerunnable Playwright script
- `screenshots/` - Captured PNG screenshots
- `screenshots.md` - Markdown with front matter and embedded images
- `actions.json` - Action log with title, viewport, and actions array

## Video Generation

`generate-recording.js` replays `actions.json` in headless mode, capturing frames with highlight overlays, then encodes to video via ffmpeg.

- Replays goto, click, fill, screenshot actions
- Applies animated highlight overlays to targeted elements
- Renders note annotations as styled overlays (markdown supported)
- Filters out internal recorder UI actions automatically
- Supports Playwright text selectors (`:text("...")`)
- Falls back to keeping raw frames if ffmpeg unavailable

