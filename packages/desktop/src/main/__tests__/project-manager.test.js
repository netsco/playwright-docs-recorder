import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');
const { importProjectFromZip } = require('../project-manager.js');

function buildZip(zipPath, files) {
  const zip = new AdmZip();
  zip.addFile('__project-manifest.json', Buffer.from(JSON.stringify({ name: 'Test Project' })));
  for (const [name, content] of Object.entries(files)) {
    zip.addFile('placeholder', Buffer.from(content));
    // Set the raw entry name after adding, so names adm-zip might normalise
    // on add (e.g. "../") are written to the archive as-is.
    const entries = zip.getEntries();
    entries[entries.length - 1].entryName = name;
  }
  zip.writeZip(zipPath);
}

describe('importProjectFromZip', () => {
  let tmp;
  let outputDir;
  let zipPath;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-recorder-import-'));
    outputDir = path.join(tmp, 'output');
    fs.mkdirSync(outputDir);
    zipPath = path.join(tmp, 'project.zip');
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('extracts project files into a new project folder', () => {
    buildZip(zipPath, { 'recording-1/actions.json': '{}' });

    const project = importProjectFromZip(outputDir, zipPath);

    expect(project.name).toBe('Test Project');
    expect(fs.readFileSync(path.join(project.folder, 'recording-1/actions.json'), 'utf8')).toBe('{}');
  });

  it.each([
    ['parent traversal', '../escaped.txt'],
    ['nested parent traversal', 'recording-1/../../escaped.txt'],
    ['absolute path', '/tmp/doc-recorder-escaped.txt'],
  ])('rejects entries with %s and writes nothing', (_label, entryName) => {
    buildZip(zipPath, { 'safe.txt': 'ok', [entryName]: 'pwned' });

    expect(() => importProjectFromZip(outputDir, zipPath)).toThrow(/unsafe entry path/);
    expect(fs.existsSync(path.join(outputDir, 'escaped.txt'))).toBe(false);
    expect(fs.existsSync(path.join(tmp, 'escaped.txt'))).toBe(false);
    expect(fs.readdirSync(outputDir)).toEqual([]);
  });
});
