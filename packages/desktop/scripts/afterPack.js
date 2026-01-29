/**
 * afterPack hook for electron-builder
 * Replaces the auto-detected node_modules with our production dependencies
 */

const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const appDir = path.join(context.appOutDir, 'resources', 'app');
  const nodeModulesDir = path.join(appDir, 'node_modules');
  const sourceNodeModules = path.join(__dirname, '..', 'node_modules');

  console.log('afterPack: Replacing node_modules with production dependencies...');

  // Remove the auto-detected node_modules
  if (fs.existsSync(nodeModulesDir)) {
    console.log('  Removing auto-detected node_modules...');
    fs.rmSync(nodeModulesDir, { recursive: true, force: true });
  }

  // Copy our production node_modules
  console.log('  Copying production dependencies...');
  copyRecursiveSync(sourceNodeModules, nodeModulesDir);

  console.log('afterPack: Done');
};

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  Warning: ${src} not found`);
    return;
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
}
