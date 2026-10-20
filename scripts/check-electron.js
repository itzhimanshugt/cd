#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const isWindows = os.platform() === 'win32';
const execName = isWindows ? 'electron.exe' : 'electron';

const pkgRoot = path.join(__dirname, '..');
const electronDir = path.join(pkgRoot, 'node_modules', 'electron');
const electronPkg = path.join(electronDir, 'package.json');
const pathTxt = path.join(electronDir, 'path.txt');
const distExec = path.join(electronDir, 'dist', execName);

function hasElectronBinary() {
    return fs.existsSync(pathTxt) && fs.existsSync(distExec);
}

function run(cmd, args) {
    const result = spawnSync(cmd, args, { stdio: 'inherit' });
    return result && result.status === 0;
}

function npmCmd() {
    return isWindows ? 'npm.cmd' : 'npm';
}

function runNpmRebuild() {
    console.log('-> Running `npm rebuild electron`');
    return run(npmCmd(), ['rebuild', 'electron', '--no-audit', '--no-fund']);
}

function runElectronInstallScript() {
    const installer = path.join(electronDir, 'install.js');
    if (!fs.existsSync(installer)) {
        return false;
    }

    console.log('-> Running electron/install.js');
    return run(process.execPath, [installer]);
}

function getElectronVersion() {
    try {
        return require(electronPkg).version;
    } catch {
        return null;
    }
}

function getCacheRoot() {
    if (process.env.ELECTRON_CACHE) return process.env.ELECTRON_CACHE;
    if (process.env.electron_config_cache) return process.env.electron_config_cache;

    if (isWindows) {
        return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'electron', 'Cache');
    }

    return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'electron', 'Cache');
}

function findCachedZip(version) {
    const cacheRoot = getCacheRoot();
    const expectedName = `electron-v${version}-${os.platform()}-${os.arch()}.zip`;

    function walk(dir) {
        if (!fs.existsSync(dir)) return null;

        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile() && entry.name === expectedName) return fullPath;
            if (entry.isDirectory()) {
                const nested = walk(fullPath);
                if (nested) return nested;
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

    if (isWindows) {
        const escapedZip = zipPath.replace(/'/g, "''");
        const escapedDest = distDir.replace(/'/g, "''");
        return run('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${escapedZip}' -DestinationPath '${escapedDest}' -Force`]);
    }

    return run('unzip', ['-oq', zipPath, '-d', distDir]);
}

function runCachedZipFallback() {
    const version = getElectronVersion();
    if (!version) return false;

    const zipPath = findCachedZip(version);
    if (!zipPath) return false;

    console.log(`-> Extracting cached zip: ${zipPath}`);
    const extracted = extractCachedZip(zipPath);
    if (!extracted) return false;

    fs.writeFileSync(pathTxt, execName);
    return hasElectronBinary();
}

if (hasElectronBinary()) {
    console.log('Electron binary present.');
    process.exit(0);
}

console.log('Electron binary missing - attempting automated repair.');

runNpmRebuild();
if (hasElectronBinary()) {
    console.log('Electron available after rebuild.');
    process.exit(0);
}

runElectronInstallScript();
if (hasElectronBinary()) {
    console.log('Electron repaired successfully.');
    process.exit(0);
}

runCachedZipFallback();
if (hasElectronBinary()) {
    console.log('Electron repaired from cached zip.');
    process.exit(0);
}

console.error('\nElectron repair failed. Diagnostics:');
console.error(' - node_modules/electron exists:', fs.existsSync(electronDir));
console.error(' - path.txt exists:', fs.existsSync(pathTxt));
console.error(' - dist executable exists:', fs.existsSync(distExec));
console.error('\nTry: npm rebuild electron --verbose');
process.exit(1);
