import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import path from 'node:path';
import { generateScript } from '../script-generator.js';

describe('generated replay string fidelity', () => {
  it('replays quotes, backslashes and multiline values without interpreting notes', async () => {
    const url = 'https://example.test/owner\'s-guide?q="quoted"';
    const selector = '[data-label="owner\'s choice"]';
    const value = 'An editor\'s "reviewed" task\r\nC:\\notes\\draft\n第二行';
    const note = 'Keep `code`, \\paths and ${notAVariable} literally.\nNext line.';
    const filename = 'owner\'s-step.png';
    const mdFilename = 'owner\'s-guide.md';
    const calls = [];
    const logs = [];
    const writes = [];
    const page = {
      goto: async value => calls.push(['goto', value]),
      locator: value => ({
        click: async () => calls.push(['click', value]),
        fill: async text => calls.push(['fill', value, text]),
        hover: async () => calls.push(['hover', value])
      }),
      evaluate: async (_callback, value) => calls.push(['highlight', value]),
      screenshot: async options => calls.push(['screenshot', options.path])
    };
    const browser = {
      newContext: async () => ({ newPage: async () => page }),
      close: async () => calls.push(['close'])
    };
    const recording = {
      title: 'Literal replay',
      viewport: { width: 1280, height: 720 },
      mdFilename,
      actions: [
        { type: 'goto', url },
        { type: 'click', selector },
        { type: 'fill', selector, value },
        { type: 'hover', selector },
        { type: 'note', note },
        { type: 'screenshot', filename, highlight: selector, note }
      ],
      screenshots: [{ filename, note }]
    };
    const script = new vm.Script(generateScript(recording));
    await script.runInNewContext({
      __dirname: '/recording',
      console: { log: text => logs.push(text) },
      require(name) {
        if (name === 'playwright') return { chromium: { launch: async () => browser } };
        if (name === 'fs') return { writeFileSync: (...args) => writes.push(args) };
        if (name === 'path') return path;
        throw new Error(`Unexpected module: ${name}`);
      }
    });
    expect(calls).toEqual([
      ['goto', url], ['click', selector], ['fill', selector, value],
      ['hover', selector], ['highlight', selector],
      ['screenshot', path.join('/recording', 'screenshots', filename)], ['close']
    ]);
    expect(logs.filter(text => text === note)).toHaveLength(2);
    expect(writes).toHaveLength(1);
    expect(writes[0][0]).toBe(path.join('/recording', mdFilename));
    expect(writes[0][1]).toContain(note);
  });
});
