import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import vm from 'vm';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { saveRecording, updateRecordingActions } = require('../file-manager.js');

const awkwardValue = 'An editor\'s "reviewed" intake\nC:\\notes\\draft\n第二行';
const awkwardNote = 'Keep `code` and ${notAVariable} literally.';

function readScript(recordingDir) {
  return fs.readFileSync(path.join(recordingDir, 'recorded-script.js'), 'utf8');
}

describe('desktop replay script generation', () => {
  let outputDir;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-recorder-script-'));
  });

  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('saveRecording writes a parseable script that keeps recorded strings intact', () => {
    const paths = saveRecording(outputDir, {
      id: 'rec-1',
      title: 'An editor\'s intake',
      viewport: { width: 1280, height: 720 },
      actions: [
        { type: 'goto', url: 'https://example.test/owner\'s-guide' },
        { type: 'fill', selector: '[data-label="owner\'s choice"]', value: awkwardValue },
        { type: 'screenshot', filename: 'step.png', note: awkwardNote }
      ],
      screenshots: [{ filename: 'step.png', note: awkwardNote }]
    });

    const script = readScript(paths.recordingDir);
    expect(() => new vm.Script(script)).not.toThrow();
    expect(script).toContain(`.fill(${JSON.stringify(awkwardValue)})`);
    expect(script).toContain(`console.log(${JSON.stringify(awkwardNote)})`);
  });

  it('saveRecording points the script at the slugified markdown file', () => {
    const paths = saveRecording(outputDir, {
      id: 'rec-2',
      title: 'Getting Started',
      viewport: { width: 1280, height: 720 },
      actions: [],
      screenshots: []
    });

    expect(path.basename(paths.markdownPath)).toBe('getting-started.md');
    expect(readScript(paths.recordingDir)).toContain('path.join(__dirname, "getting-started.md")');
  });

  it('updateRecordingActions regenerates the script with the stored markdown filename and separator', () => {
    const recordingDir = path.join(outputDir, 'rec-3');
    fs.mkdirSync(recordingDir);
    fs.writeFileSync(path.join(recordingDir, 'actions.json'), JSON.stringify({
      id: 'rec-3',
      title: 'Custom',
      viewport: { width: 1280, height: 720 },
      mdFilename: 'custom-guide.md',
      separator: '***',
      actions: []
    }));

    const result = updateRecordingActions(outputDir, 'rec-3', [
      { type: 'fill', selector: '#notes', value: awkwardValue },
      { type: 'screenshot', filename: 'step.png', note: awkwardNote }
    ]);

    expect(result).toEqual({ success: true });
    const script = readScript(recordingDir);
    expect(() => new vm.Script(script)).not.toThrow();
    expect(script).toContain('path.join(__dirname, "custom-guide.md")');
    expect(script).toContain('const separator = "***";');
    expect(script).toContain(`.fill(${JSON.stringify(awkwardValue)})`);
  });
});
