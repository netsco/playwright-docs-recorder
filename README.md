# Playwright Documentation Recorder

Record browser actions with on-demand screenshots and element highlighting. Generates rerunnable scripts.

## Install

```bash
npm install
```

## Usage

```bash
node recorder.js <url> [output-dir]
```

Example:
```bash
node recorder.js https://example.com ./my-docs
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` | Toggle highlight on hovered element |
| `Ctrl+Shift+S` | Take screenshot |
| `Ctrl+Shift+C` | Take screenshot with current highlight |
| `Ctrl+C` | Stop recording and save script |

## Output

After recording, you get:
- `recorded-script.js` - Rerunnable Playwright script
- `screenshots/` - All captured screenshots
- `actions.json` - Raw action log

## Re-run

```bash
node doc-output/recorded-script.js
```

This re-executes all actions and regenerates screenshots (with highlights).

## How It Works

1. Records clicks, form inputs, and navigation automatically
2. Use `Ctrl+Shift+H` to highlight any element you hover over
3. Use `Ctrl+Shift+C` to capture screenshot with the highlight visible
4. Press `Ctrl+C` when done - generates a script that replays everything
