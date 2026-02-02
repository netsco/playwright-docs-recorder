#!/usr/bin/env node
/**
 * Prebuild script to copy production dependencies from root node_modules
 * to the desktop package's node_modules folder for electron-builder.
 *
 * This handles npm workspace hoisting and nested node_modules.
 */

const fs = require('fs');
const path = require('path');

const desktopDir = path.join(__dirname, '..');
const rootNodeModules = path.join(desktopDir, '..', '..', 'node_modules');
const localNodeModules = path.join(desktopDir, 'node_modules');

// Production dependencies - top-level packages only
// The script will automatically copy nested node_modules within each package
const dependencies = [
  // @doc-recorder/shared
  '@doc-recorder/shared',

  // adm-zip (project import/export)
  'adm-zip',

  // electron-store and direct dependencies
  'electron-store',
  'conf',
  'atomically',
  'dot-prop',
  'is-obj',
  'env-paths',
  'json-schema-typed',
  'debounce-fn',
  'mimic-fn',
  'onetime',
  'semver',
  'pkg-up',
  'find-up',
  'locate-path',
  'p-locate',
  'p-limit',
  'p-try',
  'path-exists',

  // ajv dependencies (multiple versions exist - copy all)
  'ajv',
  'ajv-formats',
  'uri-js',
  'punycode',
  'fast-deep-equal',
  'fast-json-stable-stringify',
  'json-schema-traverse',
  'require-from-string',
  'fast-uri',  // used by ajv 8.x

  // sharp (native image processing) and dependencies
  'sharp',
  '@img',
  'color',
  'color-string',
  'color-convert',
  'color-name',
  'detect-libc',
  'simple-swizzle',
  'is-arrayish',
];

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursiveSync(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  return true;
}

function removeRecursiveSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log('Setting up production dependencies for electron-builder...\n');

// Clean existing node_modules
if (fs.existsSync(localNodeModules)) {
  console.log('Cleaning existing node_modules...');
  removeRecursiveSync(localNodeModules);
}

fs.mkdirSync(localNodeModules, { recursive: true });

let copied = 0;
let missing = 0;

for (const dep of dependencies) {
  const src = path.join(rootNodeModules, dep);
  const dest = path.join(localNodeModules, dep);

  process.stdout.write(`  ${dep}... `);

  if (!fs.existsSync(src)) {
    console.log('NOT FOUND');
    missing++;
    continue;
  }

  // Copy the entire package including any nested node_modules
  copyRecursiveSync(src, dest);
  console.log('OK');
  copied++;
}

console.log(`\nDone: ${copied} packages copied, ${missing} not found`);

if (missing > 0) {
  console.log('\nWarning: Some dependencies were not found. Run "npm install" at the root first.');
}
