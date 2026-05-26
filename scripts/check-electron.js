#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

function isWindows() {
  return os.platform() === 'win32';
}

const execName = isWindows() ? 'electron.exe' : 'electron';

const pkgRoot = path.join(__dirname, '..');
const electronDir = path.join(pkgRoot, 'node_modules', 'electron');
const electronPkg = path.join(electronDir, 'package.json');
const pathTxt = path.join(electronDir, 'path.txt');
const distExec = path.join(electronDir, 'dist', execName);

function ok() {
  return fs.existsSync(pathTxt) && fs.existsSync(distExec);
}

function getElectronVersion() {
  try {
    return require(electronPkg).version;
  } catch (error) {
    return null;
  }
}

function getCacheRoot() {
  if (process.env.ELECTRON_CACHE) {
    return process.env.ELECTRON_CACHE;
  }

  if (process.env.electron_config_cache) {
    return process.env.electron_config_cache;
  }

  if (isWindows()) {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'electron', 'Cache');
  }

  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'electron', 'Cache');
}

function findCachedZip(version) {
  const cacheRoot = getCacheRoot();
  const expectedName = 'electron-v' + version + '-' + os.platform() + '-' + os.arch() + '.zip';

  function walk(dir) {
    if (!fs.existsSync(dir)) {
      return null;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isFile() && entry.name === expectedName) {
        return fullPath;
      }

      if (entry.isDirectory()) {
        const nested = walk(fullPath);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  return walk(cacheRoot);
}

function extractCachedZip(zipPath) {
  const distDir = path.join(electronDir, 'dist');

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  if (isWindows()) {
    const command = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${distDir.replace(/'/g, "''")}' -Force`;
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { stdio: 'inherit' });
    return result.status === 0;
  }

  const unzip = spawnSync('unzip', ['-oq', zipPath, '-d', distDir], { stdio: 'inherit' });
  return unzip.status === 0;
}

if (ok()) {
  console.log('Electron binary present.');
  process.exit(0);
}

console.log('Electron binary missing — attempting automated repair.');

function runNpmRebuild() {
  console.log('-> Running `npm rebuild electron`');
  const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const res = spawnSync(cmd, ['rebuild', 'electron', '--no-audit', '--no-fund'], { stdio: 'inherit' });
  return res && res.status === 0;
}

function runElectronInstallScript() {
  const installer = path.join(electronDir, 'install.js');
  if (!fs.existsSync(installer)) {
    console.warn('Missing electron/install.js — cannot run installer.');
    return false;
  }

  console.log('-> Running electron/install.js to extract cached artifact');
  const res = spawnSync(process.execPath, [installer], { stdio: 'inherit' });
  return res && res.status === 0;
}

function runCachedZipFallback() {
  const version = getElectronVersion();
  if (!version) {
    console.warn('Unable to read electron version for cached zip fallback.');
    return false;
  }

  const zipPath = findCachedZip(version);
  if (!zipPath) {
    console.warn('No cached Electron zip found for version ' + version + '.');
    return false;
  }

  console.log('-> Extracting cached zip: ' + zipPath);
  const extracted = extractCachedZip(zipPath);
  if (!extracted) {
    return false;
  }

  fs.writeFileSync(pathTxt, execName);
  return ok();
}

(async function repair() {
  try {
    // 1) Try npm rebuild
    runNpmRebuild();

    if (ok()) {
      console.log('Electron available after rebuild.');
      process.exit(0);
    }

    // 2) Try running the electron package's install script directly
    runElectronInstallScript();

    if (ok()) {
      console.log('Electron repaired successfully.');
      process.exit(0);
    }

    // 3) Extract the cached zip directly if the package script did not finish
    runCachedZipFallback();

    if (ok()) {
      console.log('Electron repaired from cached zip.');
      process.exit(0);
    }

    // final diagnostics
    console.error('\nElectron repair failed. Diagnostics:');
    console.error(' - node_modules/electron exists:', fs.existsSync(electronDir));
    console.error(' - path.txt exists:', fs.existsSync(pathTxt));
    console.error(' - dist executable exists:', fs.existsSync(distExec));
    console.error('\nTry these manual steps:');
    console.error(' 1) Run `npm rebuild electron --verbose` to force lifecycle scripts.');
    console.error(' 2) If that fails, locate a cached electron zip under %LOCALAPPDATA%\\electron\\Cache and extract it to node_modules\\electron\\dist then create path.txt with:', execName);
    process.exit(1);
  } catch (err) {
    console.error('Unexpected error during repair:', err);
    process.exit(1);
  }
})();
