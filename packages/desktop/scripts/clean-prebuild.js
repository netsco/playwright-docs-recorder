#!/usr/bin/env node
/**
 * Removes the dependency snapshot that prebuild.js writes for electron-builder.
 *
 * prebuild.js copies production dependencies, including @doc-recorder/shared,
 * into packages/desktop/node_modules. Node resolves that folder before the
 * workspace root, so after a build, running the app from source would load
 * stale copies and ignore edits to packages/shared. Running this before
 * `dev`/`start` puts resolution back on the live workspace packages.
 *
 * Only acts when the generated lockfile from prebuild.js is present, so a
 * node_modules folder created by npm itself is never touched.
 */

const fs = require('fs');
const path = require('path');

const desktopDir = path.join(__dirname, '..');
const localNodeModules = path.join(desktopDir, 'node_modules');
const lockfilePath = path.join(desktopDir, 'package-lock.json');

function isPrebuildLockfile(file) {
  try {
    const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
    return lock.packages && Object.keys(lock.packages).length === 0;
  } catch {
    return false;
  }
}

if (fs.existsSync(lockfilePath) && isPrebuildLockfile(lockfilePath)) {
  fs.rmSync(localNodeModules, { recursive: true, force: true });
  fs.rmSync(lockfilePath, { force: true });
  console.log('Removed prebuild dependency snapshot; using workspace packages.');
}
