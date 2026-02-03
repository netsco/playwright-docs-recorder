/**
 * afterPack hook for electron-builder
 * Replaces the auto-detected node_modules with our production dependencies.
 *
 * With asar enabled: extracts the asar, replaces node_modules, repacks.
 * With asar disabled: replaces node_modules directly in the app directory.
 */

const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const { appOutDir, packager } = context;
  const platform = packager.platform.name;
  const useAsar = packager.config.asar !== false;

  // Determine the resources directory based on platform
  let resourcesDir;
  if (platform === 'mac') {
    const appName = packager.appInfo.productFilename;
    resourcesDir = path.join(appOutDir, `${appName}.app`, 'Contents', 'Resources');
  } else {
    resourcesDir = path.join(appOutDir, 'resources');
  }

  const sourceNodeModules = path.join(__dirname, '..', 'node_modules');

  console.log(`afterPack: Platform=${platform}, asar=${useAsar}, resourcesDir=${resourcesDir}`);

  if (useAsar) {
    await replaceInAsar(resourcesDir, sourceNodeModules);
  } else {
    replaceInAppDir(path.join(resourcesDir, 'app'), sourceNodeModules);
  }

  console.log('afterPack: Done');
};

async function replaceInAsar(resourcesDir, sourceNodeModules) {
  const asar = require('@electron/asar');
  const asarPath = path.join(resourcesDir, 'app.asar');
  const asarUnpackedDir = path.join(resourcesDir, 'app.asar.unpacked');
  const tempAppDir = path.join(resourcesDir, '_app_temp');

  if (!fs.existsSync(asarPath)) {
    console.log('afterPack: app.asar not found, skipping');
    return;
  }

  // Extract asar to temp directory
  console.log('  Extracting app.asar...');
  asar.extractAll(asarPath, tempAppDir);

  // Replace node_modules in extracted app
  const nodeModulesDir = path.join(tempAppDir, 'node_modules');
  if (fs.existsSync(nodeModulesDir)) {
    console.log('  Removing auto-detected node_modules...');
    fs.rmSync(nodeModulesDir, { recursive: true, force: true });
  }
  console.log('  Copying production dependencies...');
  copyRecursiveSync(sourceNodeModules, nodeModulesDir);

  // Remove old asar and unpacked directory
  fs.unlinkSync(asarPath);
  if (fs.existsSync(asarUnpackedDir)) {
    fs.rmSync(asarUnpackedDir, { recursive: true, force: true });
  }

  // Repack with native binaries unpacked
  console.log('  Repacking app.asar...');
  await asar.createPackageWithOptions(tempAppDir, asarPath, {
    unpack: '{*.node,*.dll,*.dylib,*.so}'
  });

  // Clean up temp directory
  fs.rmSync(tempAppDir, { recursive: true, force: true });
}

function replaceInAppDir(appDir, sourceNodeModules) {
  const nodeModulesDir = path.join(appDir, 'node_modules');

  console.log(`afterPack: appDir=${appDir}`);

  if (!fs.existsSync(appDir)) {
    console.log('afterPack: App directory not found, skipping');
    return;
  }

  console.log('afterPack: Replacing node_modules with production dependencies...');

  if (fs.existsSync(nodeModulesDir)) {
    console.log('  Removing auto-detected node_modules...');
    fs.rmSync(nodeModulesDir, { recursive: true, force: true });
  }

  console.log('  Copying production dependencies...');
  copyRecursiveSync(sourceNodeModules, nodeModulesDir);
}

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  Warning: ${src} not found`);
    return;
  }

  // Resolve symlinks so no symlinks end up in the output
  const lstat = fs.lstatSync(src);
  if (lstat.isSymbolicLink()) {
    src = fs.realpathSync(src);
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
