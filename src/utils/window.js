const { BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('node:path');
const storage = require('../storage');
const { getDefaultKeybinds } = require('./keybinds');

let mouseEventsIgnored = false;

const DEFAULT_MAIN_WINDOW_SIZE = { width: 1100, height: 800 };
const MIN_WINDOW_SIZE = { width: 700, height: 320 };
// How much of the window we always keep on-screen so the user can grab it back
const EDGE_GUARD = 80;

// Clamp [x, y] so the window never flies fully off-screen across all displays.
function clampToDisplays(targetX, targetY, winWidth, winHeight) {
    const displays = screen.getAllDisplays();
    // Find the display whose work area would contain the target's center.
    const cx = targetX + winWidth / 2;
    const cy = targetY + winHeight / 2;
    const home =
        displays.find(d => {
            const b = d.workArea;
            return cx >= b.x && cx <= b.x + b.width && cy >= b.y && cy <= b.y + b.height;
        }) ||
        screen.getDisplayNearestPoint({ x: cx, y: cy }) ||
        screen.getPrimaryDisplay();

    const b = home.workArea;
    const minX = b.x - winWidth + EDGE_GUARD;
    const maxX = b.x + b.width - EDGE_GUARD;
    const minY = b.y;
    const maxY = b.y + b.height - EDGE_GUARD;

    return [Math.max(minX, Math.min(maxX, targetX)), Math.max(minY, Math.min(maxY, targetY))];
}

function createWindow(sendToRenderer, geminiSessionRef) {
    const mainWindow = new BrowserWindow({
        width: DEFAULT_MAIN_WINDOW_SIZE.width,
        height: DEFAULT_MAIN_WINDOW_SIZE.height,
        minWidth: MIN_WINDOW_SIZE.width,
        minHeight: MIN_WINDOW_SIZE.height,
        resizable: true,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // TODO: change to true (would require a proper preload bridge)
            backgroundThrottling: false,
            enableBlinkFeatures: 'GetDisplayMedia',
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        backgroundColor: '#00000000',
    });

    const { session, desktopCapturer } = require('electron');
    session.defaultSession.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer
                .getSources({ types: ['screen'] })
                .then(sources => {
                    callback({ video: sources[0], audio: 'loopback' });
                })
                .catch(err => {
                    console.warn('desktopCapturer.getSources failed:', err);
                    callback({});
                });
        },
        { useSystemPicker: true }
    );

    mainWindow.setContentProtection(true);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (process.platform === 'win32') {
        try {
            mainWindow.setSkipTaskbar(true);
        } catch (error) {
            console.warn('Could not hide from taskbar:', error.message);
        }
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }

    if (process.platform === 'darwin') {
        try {
            mainWindow.setHiddenInMissionControl(true);
        } catch (error) {
            console.warn('Could not hide from Mission Control:', error.message);
        }
    }

    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    // Show window only when ready to prevent white flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // After window is created, initialize keybinds
    mainWindow.webContents.once('dom-ready', () => {
        setImmediate(() => {
            const defaultKeybinds = getDefaultKeybinds();
            const savedKeybinds = storage.getKeybinds();
            const keybinds = savedKeybinds ? { ...defaultKeybinds, ...savedKeybinds } : defaultKeybinds;
            updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
        });
    });

    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef);

    return mainWindow;
}

function moveBy(mainWindow, dx, dy) {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return;
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    const [nx, ny] = clampToDisplays(x + dx, y + dy, w, h);
    if (nx !== x || ny !== y) mainWindow.setPosition(nx, ny);
}

function updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef) {
    console.log('Updating global shortcuts with:', keybinds);

    globalShortcut.unregisterAll();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const moveIncrement = Math.max(40, Math.floor(Math.min(width, height) * 0.08));

    const tryRegister = (action, accelerator, handler) => {
        if (!accelerator) return;
        try {
            const ok = globalShortcut.register(accelerator, handler);
            if (!ok) console.warn(`Could not register ${action}: ${accelerator} (already in use?)`);
        } catch (error) {
            console.error(`Failed to register ${action} (${accelerator}):`, error);
        }
    };

    tryRegister('moveUp', keybinds.moveUp, () => moveBy(mainWindow, 0, -moveIncrement));
    tryRegister('moveDown', keybinds.moveDown, () => moveBy(mainWindow, 0, moveIncrement));
    tryRegister('moveLeft', keybinds.moveLeft, () => moveBy(mainWindow, -moveIncrement, 0));
    tryRegister('moveRight', keybinds.moveRight, () => moveBy(mainWindow, moveIncrement, 0));

    tryRegister('toggleVisibility', keybinds.toggleVisibility, () => {
        if (mainWindow.isDestroyed()) return;
        if (mainWindow.isVisible()) mainWindow.hide();
        else mainWindow.showInactive();
    });

    tryRegister('toggleClickThrough', keybinds.toggleClickThrough, () => {
        if (mainWindow.isDestroyed()) return;
        mouseEventsIgnored = !mouseEventsIgnored;
        if (mouseEventsIgnored) {
            mainWindow.setIgnoreMouseEvents(true, { forward: true });
        } else {
            mainWindow.setIgnoreMouseEvents(false);
        }
        mainWindow.webContents.send('click-through-toggled', mouseEventsIgnored);
    });

    tryRegister('nextStep', keybinds.nextStep, async () => {
        if (mainWindow.isDestroyed()) return;
        try {
            const isMac = process.platform === 'darwin';
            const shortcutKey = isMac ? 'cmd+enter' : 'ctrl+enter';
            mainWindow.webContents.executeJavaScript(`window.cheatingDaddy && cheatingDaddy.handleShortcut('${shortcutKey}');`);
        } catch (error) {
            console.error('Error handling next step shortcut:', error);
        }
    });

    tryRegister('previousResponse', keybinds.previousResponse, () => sendToRenderer('navigate-previous-response'));
    tryRegister('nextResponse', keybinds.nextResponse, () => sendToRenderer('navigate-next-response'));
    tryRegister('scrollUp', keybinds.scrollUp, () => sendToRenderer('scroll-response-up'));
    tryRegister('scrollDown', keybinds.scrollDown, () => sendToRenderer('scroll-response-down'));

    tryRegister('emergencyErase', keybinds.emergencyErase, () => {
        console.log('Emergency Erase triggered!');
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.hide();
        if (geminiSessionRef.current) {
            try {
                geminiSessionRef.current.close();
            } catch (_) {}
            geminiSessionRef.current = null;
        }
        sendToRenderer('clear-sensitive-data');
        setTimeout(() => {
            const { app } = require('electron');
            app.quit();
        }, 300);
    });
}

function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef) {
    // On macOS, the window can be re-created via `app.activate` after all
    // windows are closed. To avoid "Attempted to register a second handler"
    // crashes we remove any pre-existing handlers/listeners first.
    const HANDLE_CHANNELS = ['window-minimize', 'toggle-window-visibility', 'get-click-through-state'];
    const ON_CHANNELS = ['view-changed', 'update-keybinds'];
    HANDLE_CHANNELS.forEach(c => {
        try { ipcMain.removeHandler(c); } catch (_) {}
    });
    ON_CHANNELS.forEach(c => ipcMain.removeAllListeners(c));

    ipcMain.on('view-changed', (event, view) => {
        if (mainWindow.isDestroyed()) return;
        // Leaving assistant view always cancels click-through, so the user
        // never gets stuck in a UI where the rest of the app can't be clicked.
        if (view !== 'assistant' && mouseEventsIgnored) {
            mouseEventsIgnored = false;
            mainWindow.setIgnoreMouseEvents(false);
            mainWindow.webContents.send('click-through-toggled', false);
        } else if (view !== 'assistant') {
            mainWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcMain.handle('window-minimize', () => {
        if (!mainWindow.isDestroyed()) mainWindow.minimize();
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (mainWindow.isDestroyed()) return;
        updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
    });

    ipcMain.handle('toggle-window-visibility', async () => {
        try {
            if (mainWindow.isDestroyed()) return { success: false, error: 'Window has been destroyed' };
            if (mainWindow.isVisible()) mainWindow.hide();
            else mainWindow.showInactive();
            return { success: true };
        } catch (error) {
            console.error('Error toggling window visibility:', error);
            return { success: false, error: error.message };
        }
    });

    // Allow renderer to read the current click-through state on demand,
    // so it can re-sync after view-changes / hot-reloads.
    ipcMain.handle('get-click-through-state', () => mouseEventsIgnored);
}

module.exports = {
    createWindow,
    getDefaultKeybinds,
    updateGlobalShortcuts,
    setupWindowIpcHandlers,
};
