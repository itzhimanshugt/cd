'use strict';
const { clipboard, nativeImage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const storage = require('../storage');

function getScreenshotsDir() {
    const dir = path.join(storage.getConfigDir(), 'screenshots');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getTimestampedFilename() {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `screenshot-${y}-${mo}-${d}-${h}${mi}${s}.png`;
}

async function captureScreenshot(mainWindow) {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return { success: false, error: 'No window available' };
    }
    try {
        const image = await mainWindow.webContents.capturePage();
        const pngBuffer = image.toPNG();
        const dir = getScreenshotsDir();
        const filename = getTimestampedFilename();
        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, pngBuffer);
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function copyScreenshotToClipboard(mainWindow) {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return { success: false, error: 'No window available' };
    }
    try {
        const image = await mainWindow.webContents.capturePage();
        clipboard.writeImage(image);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function openScreenshotsFolder() {
    try {
        const dir = getScreenshotsDir();
        await shell.openPath(dir);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    captureScreenshot,
    copyScreenshotToClipboard,
    openScreenshotsFolder,
    getScreenshotsDir,
};
