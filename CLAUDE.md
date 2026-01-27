# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Playwright Documentation Recorder - a tool that records browser interactions with on-demand screenshots and element highlighting, then generates rerunnable Playwright scripts.

## Commands

```bash
# Install dependencies
npm install

# Start recording (opens browser, records actions)
node recorder.js <url> [output-dir]

# Replay a recorded session
node doc-output/recorded-script.js
```

## Architecture

Single-file tool (`recorder.js`) containing the `DocRecorder` class:

- **Browser orchestration**: Launches Chromium via Playwright, injects recording scripts into pages
- **Action recording**: Captures clicks, form inputs, and navigations via DOM event listeners injected into the page
- **Selector generation**: Prioritizes selectors in order: `#id` > `[data-testid]` > `[role][aria-label]` > text content > unique class combos > CSS path
- **Screenshot capture**: On-demand via keyboard shortcuts, optionally with highlight overlay
- **Script generation**: Outputs a standalone Playwright script that replays all recorded actions

The recorder injects JavaScript into pages via `page.evaluate()` and communicates back to Node via `page.exposeFunction()` for `__recordAction`, `__takeScreenshot`, and `__notifyHighlight`.

## Output Structure

Recordings output to `doc-output/` (or custom dir):
- `recorded-script.js` - Rerunnable Playwright script
- `screenshots/` - Captured screenshots
- `actions.json` - Raw action log
