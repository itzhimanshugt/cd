const { BrowserWindow, globalShortcut, ipcMain, screen, app } = require('electron');
const path = require('node:path');
const storage = require('../storage');
const screenshot = require('./screenshot');
const { HotkeyService } = require('../services/HotkeyService');

const hotkeyService = new HotkeyService();

let mouseEventsIgnored = false;
let _programmaticMove = false;

const KEYBINDS_VERSION = 8; // Bumped: add response mode cycle hotkey

const DEFAULT_MAIN_WINDOW_SIZE = { width: 1100, height: 800 };
const MIN_WINDOW_SIZE = { width: 400, height: 260 };

// Hard safety limits - these cannot be exceeded regardless of user settings.
// Prevents GPU crashes from oversized transparent windows on Windows.
const HARD_LIMITS = {
    scaleMax: 1.5,
    scaleMin: 0.2,
    zoomMax: 2.0,
    zoomMin: 0.3,
    // Minimum step values to prevent rapid-fire redraws
    scaleStepMin: 0.05,
    zoomStepMin: 0.05,
};

// ──────────────────────────────────────────────────────────────
// Default keybinds — full action set
// ──────────────────────────────────────────────────────────────

function getDefaultKeybinds() {
    const isMac = process.platform === 'darwin';
    return {
        // ── Window movement ──
        moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
        moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
        moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
        moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
        // ── Visibility ──
        toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
        toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
        // ── Scale (window size) ──
        scaleUp: isMac ? 'Cmd+Shift+=' : 'Ctrl+Shift+=',
        scaleDown: isMac ? 'Cmd+Shift+-' : 'Ctrl+Shift+-',
        // ── Zoom (content) ──
        zoomIn: isMac ? 'Cmd+=' : 'Ctrl+=',
        zoomOut: isMac ? 'Cmd+-' : 'Ctrl+-',
        zoomReset: isMac ? 'Cmd+0' : 'Ctrl+0',
        // ── Opacity ──
        fontOpacityUp: isMac ? 'Cmd+]' : 'Ctrl+]',
        fontOpacityDown: isMac ? 'Cmd+[' : 'Ctrl+[',
        bgOpacityUp: isMac ? 'Cmd+Shift+]' : 'Ctrl+Shift+]',
        bgOpacityDown: isMac ? 'Cmd+Shift+[' : 'Ctrl+Shift+[',
        // ── Session ──
        nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
        // Response navigation: Ctrl+Shift+Left / Ctrl+Shift+Right
        previousResponse: isMac ? 'Cmd+Shift+Left' : 'Ctrl+Shift+Left',
        nextResponse: isMac ? 'Cmd+Shift+Right' : 'Ctrl+Shift+Right',
        // Scroll: Ctrl+Shift+Up / Ctrl+Shift+Down
        scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
        scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        // ── Audio ──
        toggleVoice: isMac ? 'Cmd+Shift+L' : 'Ctrl+Shift+L',
        // ── Dev ──
        reloadApp: isMac ? 'Cmd+Shift+R' : 'Ctrl+Shift+R',
        devRefresh: isMac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E',
        // ── Global Controls ──
        themeToggle: isMac ? 'Cmd+Shift+T' : 'Ctrl+Shift+T',
        fontSizeUp: isMac ? 'Cmd+Shift+0' : 'Ctrl+Shift+0',
        fontSizeDown: isMac ? 'Cmd+Shift+9' : 'Ctrl+Shift+9',
        aiModeToggle: isMac ? 'Cmd+Shift+U' : 'Ctrl+Shift+U',
        responseModeToggle: isMac ? 'Cmd+Alt+R' : 'Ctrl+Alt+R',
        // ── Emergency ──
        emergencyQuit: isMac ? 'Cmd+Q' : 'Ctrl+Q',
        // ── Model Management ──
        debugToggle: 'Alt+D',
        cycleSolutionModel: isMac ? 'Cmd+Y' : 'Ctrl+Y',
        cycleExtractionModel: isMac ? "Cmd+'" : "Ctrl+'",
        // ── Typing ──
        holdToType: isMac ? 'Cmd+Shift+F' : 'Ctrl+Shift+F',
        abortTyping: isMac ? 'Cmd+Shift+X' : 'Ctrl+Shift+X',
        fullResponseType: isMac ? 'Cmd+Shift+G' : 'Ctrl+Shift+G',
        // ── Debug Screenshot ──
        debugScreenshot: 'Ctrl+Alt+S',
    };
}

// ──────────────────────────────────────────────────────────────
// Window creation
// ──────────────────────────────────────────────────────────────

function createWindow(sendToRenderer, geminiSessionRef, typingManagerRef) {
    const winState = storage.getWindowState();
    const baseW = Math.round(DEFAULT_MAIN_WINDOW_SIZE.width * (winState.scale || 1.0));
    const baseH = Math.round(DEFAULT_MAIN_WINDOW_SIZE.height * (winState.scale || 1.0));

    const mainWindow = new BrowserWindow({
        width: Math.max(MIN_WINDOW_SIZE.width, baseW),
        height: Math.max(MIN_WINDOW_SIZE.height, baseH),
        x: winState.x ?? undefined,
        y: winState.y ?? undefined,
        minWidth: MIN_WINDOW_SIZE.width,
        minHeight: MIN_WINDOW_SIZE.height,
        // Keep sizing programmatic to avoid frameless edge-capture quirks on Windows.
        resizable: false,
        frame: false,
        transparent: true,
        // Native opacity stays at 1.0; transparency is CSS-driven via --bg-app rgba values.
        hasShadow: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
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
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                callback({ video: sources[0], audio: 'loopback' });
            });
        },
        { useSystemPicker: true }
    );

    mainWindow.setContentProtection(true);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (process.platform === 'win32') {
        try {
            mainWindow.setSkipTaskbar(true);
        } catch (_) {}
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
    if (process.platform === 'darwin') {
        try {
            mainWindow.setHiddenInMissionControl(true);
        } catch (_) {}
    }

    mainWindow.loadFile(path.join(__dirname, '../index.html'));
    mainWindow.webContents.setFrameRate(60);

    // Apply persisted zoom after DOM ready
    mainWindow.webContents.once('dom-ready', () => {
        const z = storage.getWindowState().zoom ?? 1.0;
        try {
            mainWindow.webContents.setZoomFactor(z);
        } catch (_) {}

        hotkeyService.init(globalShortcut);

        setTimeout(() => {
            const defaultKB = getDefaultKeybinds();
            const saved = storage.getKeybinds();
            let keybinds;
            // If saved keybinds exist but are from an older version, reset to defaults
            if (saved && saved._version === KEYBINDS_VERSION) {
                keybinds = { ...defaultKB, ...saved };
            } else {
                keybinds = { ...defaultKB, _version: KEYBINDS_VERSION };
                storage.setKeybinds(keybinds);
            }
            updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef, typingManagerRef);
        }, 100);
    });

    // Persist window position on user-initiated move (drag) only
    let _userMoveTimer = null;
    mainWindow.on('moved', () => {
        if (_programmaticMove) return;
        if (_userMoveTimer) clearTimeout(_userMoveTimer);
        _userMoveTimer = setTimeout(() => {
            if (!mainWindow.isDestroyed()) {
                const [x, y] = mainWindow.getPosition();
                storage.setWindowState({ x, y });
            }
        }, 250);
    });

    // Persist window size on resize (debounced)
    let _resizeTimer = null;
    mainWindow.on('resized', () => {
        if (_resizeTimer) clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => {
            if (!mainWindow.isDestroyed()) {
                const [w, h] = mainWindow.getSize();
                const scale = w / DEFAULT_MAIN_WINDOW_SIZE.width;
                storage.setWindowState({ scale });
            }
        }, 250);
    });

    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef, typingManagerRef);
    return mainWindow;
}

// ──────────────────────────────────────────────────────────────
// Hotkey registration
// ──────────────────────────────────────────────────────────────

function updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef, typingManagerRef) {
    const winState = () => storage.getWindowState();

    // Build handlers map for all actions
    const handlers = {};

    // ── Emergency Quit — always registered, no guards ──
    handlers.emergencyQuit = () => {
        try {
            if (!mainWindow.isDestroyed()) {
                mainWindow.setIgnoreMouseEvents(false);
            }
        } catch (_) {}
        try {
            storage.flushAll();
        } catch (_) {}
        try {
            const { stopMacOSAudioCapture } = require('./gemini');
            stopMacOSAudioCapture();
        } catch (_) {}
        app.exit(0);
    };

    // ── Movement ──
    if (winState().moveEnabled !== false) {
        handlers.moveUp = () => safeMove(mainWindow, 0, -Math.max(10, winState().moveStep));
        handlers.moveDown = () => safeMove(mainWindow, 0, +Math.max(10, winState().moveStep));
        handlers.moveLeft = () => safeMove(mainWindow, -Math.max(10, winState().moveStep), 0);
        handlers.moveRight = () => safeMove(mainWindow, +Math.max(10, winState().moveStep), 0);
    }

    // ── Visibility ──
    handlers.toggleVisibility = () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.showInactive();
        }
        storage.updateWindowState('visible', mainWindow.isVisible());
    };

    handlers.toggleClickThrough = () => {
        // Safety: if window is in a bad state, always disable
        if (mainWindow.isDestroyed()) return;
        mouseEventsIgnored = !mouseEventsIgnored;
        mainWindow.setIgnoreMouseEvents(mouseEventsIgnored, { forward: true });
        mainWindow.webContents.send('click-through-toggled', mouseEventsIgnored);
    };

    // ── Scale (window size — grows/shrinks from centre) ──
    if (winState().scaleEnabled !== false) {
        handlers.scaleUp = () => {
            const step = Math.max(HARD_LIMITS.scaleStepMin, winState().scaleStep ?? 0.1);
            applyScale(mainWindow, step, winState().scaleMax ?? 1.5);
        };
        handlers.scaleDown = () => {
            const step = Math.max(HARD_LIMITS.scaleStepMin, winState().scaleStep ?? 0.1);
            applyScale(mainWindow, -step, winState().scaleMin ?? 0.3);
        };
    }

    // ── Zoom (content) ──
    if (winState().zoomEnabled !== false) {
        handlers.zoomIn = () => {
            const step = Math.max(HARD_LIMITS.zoomStepMin, winState().zoomStep ?? 0.1);
            applyZoom(mainWindow, step, winState().zoomMax ?? 2.0);
        };
        handlers.zoomOut = () => {
            const step = Math.max(HARD_LIMITS.zoomStepMin, winState().zoomStep ?? 0.1);
            applyZoom(mainWindow, -step, winState().zoomMin ?? 0.5);
        };
        handlers.zoomReset = () => {
            mainWindow.webContents.setZoomFactor(1.0);
            storage.updateWindowState('zoom', 1.0);
            sendToRenderer('zoom-changed', 1.0);
        };
    }

    // ── Font Opacity (Ctrl+[ / Ctrl+]) ──
    handlers.fontOpacityUp = () => {
        sendToRenderer('font-opacity-change', 0.1);
    };
    handlers.fontOpacityDown = () => {
        sendToRenderer('font-opacity-change', -0.1);
    };

    // ── Background Opacity (Ctrl+Shift+[ / Ctrl+Shift+]) ──
    handlers.bgOpacityUp = () => {
        sendToRenderer('bg-opacity-change', 0.05);
    };
    handlers.bgOpacityDown = () => {
        sendToRenderer('bg-opacity-change', -0.05);
    };

    // ── Session ──
    if (winState().sessionEnabled !== false) {
        handlers.nextStep = () => {
            const isMac = process.platform === 'darwin';
            const key = isMac ? 'cmd+enter' : 'ctrl+enter';
            mainWindow.webContents.send('shortcut-triggered', key);
        };
        handlers.previousResponse = () => sendToRenderer('navigate-previous-response');
        handlers.nextResponse = () => sendToRenderer('navigate-next-response');
        handlers.scrollUp = () => sendToRenderer('scroll-response-up');
        handlers.scrollDown = () => sendToRenderer('scroll-response-down');
    }

    // ── Voice ──
    if (winState().voiceToggleEnabled !== false) {
        handlers.toggleVoice = () => {
            const enabled = !(winState().voiceEnabled ?? true);
            storage.updateWindowState('voiceEnabled', enabled);
            sendToRenderer('voice-toggled', enabled);
        };
    }

    // ── Dev / Reload ──
    if (winState().reloadEnabled !== false) {
        handlers.reloadApp = () => {
            mainWindow.webContents.reload();
        };
        handlers.devRefresh = () => {
            app.relaunch();
            app.exit(0);
        };
    }

    // ── Global Controls ──
    handlers.themeToggle = () => {
        sendToRenderer('theme-toggled');
    };

    handlers.fontSizeUp = () => {
        const prefs = storage.getPreferences();
        let fontSize = parseInt(prefs.fontSize, 10);
        if (isNaN(fontSize)) fontSize = 20;
        const newSize = Math.min(48, fontSize + 1);
        storage.updatePreference('fontSize', newSize);
        sendToRenderer('font-size-changed', newSize);
    };

    handlers.fontSizeDown = () => {
        const prefs = storage.getPreferences();
        let fontSize = parseInt(prefs.fontSize, 10);
        if (isNaN(fontSize)) fontSize = 20;
        const newSize = Math.max(8, fontSize - 1);
        storage.updatePreference('fontSize', newSize);
        sendToRenderer('font-size-changed', newSize);
    };

    handlers.aiModeToggle = () => {
        if (geminiSessionRef && geminiSessionRef.current) {
            sendToRenderer('ai-mode-toggle-blocked');
            return;
        }
        const prefs = storage.getPreferences();
        const current = prefs.providerMode || 'byok';
        const newMode = current === 'byok' ? 'local' : 'byok';
        storage.updatePreference('providerMode', newMode);
        sendToRenderer('ai-mode-toggled', newMode);
    };

    handlers.responseModeToggle = () => {
        const prefs = storage.getPreferences();
        const modes = ['both', 'gemini', 'groq'];
        const current = modes.includes(prefs.responseMode) ? prefs.responseMode : 'both';
        const next = modes[(modes.indexOf(current) + 1) % modes.length];
        storage.updatePreference('responseMode', next);
        sendToRenderer('response-mode-toggled', next);
    };

    // ── Model Management ──
    handlers.debugToggle = () => {
        const prefs = storage.getPreferences();
        const enabled = !prefs.debugModeEnabled;
        storage.updatePreference('debugModeEnabled', enabled);
        sendToRenderer('debug-mode-toggled', enabled);
    };

    handlers.cycleSolutionModel = () => {
        const prefs = storage.getPreferences();
        const models = storage.GEMINI_MODELS;
        const current = prefs.modelSolution || models[0].id;
        const idx = models.findIndex(m => m.id === current);
        const next = models[(idx + 1) % models.length].id;
        storage.updatePreference('modelSolution', next);
        sendToRenderer('model-changed', { task: 'solution', model: next });
    };

    handlers.cycleExtractionModel = () => {
        const prefs = storage.getPreferences();
        const models = storage.GEMINI_MODELS;
        const current = prefs.modelExtraction || models[0].id;
        const idx = models.findIndex(m => m.id === current);
        const next = models[(idx + 1) % models.length].id;
        storage.updatePreference('modelExtraction', next);
        sendToRenderer('model-changed', { task: 'extraction', model: next });
    };

    // ── Typing Controls ──
    if (typingManagerRef) {
        handlers.holdToType = () => {
            const status = typingManagerRef.getStatus();
            if (status.state === 'typing') {
                typingManagerRef.pause();
            } else if (status.state === 'paused') {
                typingManagerRef.resume();
            } else if (status.state === 'idle' || status.state === 'completed') {
                const lastResponse = typingManagerRef.getLastResponse();
                if (!lastResponse) {
                    sendToRenderer('typing-status-changed', typingManagerRef.getStatus());
                    return;
                }
                try {
                    typingManagerRef.start();
                } catch (e) {
                    // No response loaded
                }
            }
            sendToRenderer('typing-status-changed', typingManagerRef.getStatus());
        };
        handlers.abortTyping = () => {
            typingManagerRef.abort();
            sendToRenderer('typing-status-changed', typingManagerRef.getStatus());
        };
        handlers.fullResponseType = () => {
            const lastResponse = typingManagerRef.getLastResponse();
            if (!lastResponse) {
                sendToRenderer('typing-status-changed', typingManagerRef.getStatus());
                return;
            }
            typingManagerRef.loadResponse(lastResponse);
            typingManagerRef.start();
            sendToRenderer('typing-status-changed', typingManagerRef.getStatus());
        };
    }

    // ── Debug Screenshot (save + copy to clipboard) ──
    handlers.debugScreenshot = () => {
        Promise.all([screenshot.captureScreenshot(mainWindow), screenshot.copyScreenshotToClipboard(mainWindow)]).then(([saveResult, copyResult]) => {
            if (saveResult.success && copyResult.success) {
                sendToRenderer('debug-screenshot-captured', saveResult.path);
                sendToRenderer('toast', { message: 'Screenshot saved and copied to clipboard', type: 'success' });
            } else if (saveResult.success) {
                sendToRenderer('debug-screenshot-captured', saveResult.path);
                sendToRenderer('toast', { message: 'Screenshot saved (clipboard copy failed)', type: 'warning' });
            } else if (copyResult.success) {
                sendToRenderer('toast', { message: 'Screenshot copied to clipboard (file save failed)', type: 'warning' });
            } else {
                sendToRenderer('toast', { message: 'Screenshot capture failed', type: 'error' });
            }
        });
    };

    // Use differential updates via HotkeyService
    if (hotkeyService._registry.size === 0) {
        // First call: full rebuild
        hotkeyService.rebuildAll(keybinds, handlers);
    } else {
        // Subsequent calls: differential update
        for (const [action, accelerator] of Object.entries(keybinds)) {
            if (action.startsWith('_')) continue;
            if (!accelerator) continue;
            const handler = handlers[action];
            if (handler) {
                hotkeyService.updateBinding(action, accelerator, handler);
            }
        }
        // Unregister actions no longer in keybinds or without handlers
        for (const [action] of hotkeyService._registry) {
            if (!handlers[action]) {
                hotkeyService.unregister(action);
            }
        }
    }

    // Summary log: show which accelerators were registered (helps debug failures)
    try {
        const summary = {};
        for (const [k, v] of Object.entries(keybinds || {})) {
            if (k === '_version' || !v) continue;
            try {
                summary[k] = { accelerator: v, registered: globalShortcut.isRegistered(v) };
            } catch (e) {
                summary[k] = { accelerator: v, registered: false, error: e.message };
            }
        }
        console.log('Global shortcuts registration summary:', summary);
    } catch (e) {
        // non-fatal
    }
}

// ──────────────────────────────────────────────────────────────
// Helpers — scale, zoom, opacity, move
// ──────────────────────────────────────────────────────────────

function safeMove(win, dx, dy) {
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    // Direct synchronous position update — the proven stable approach.
    // No deferred scheduling, no setBounds, no delta accumulation.
    // getPosition + setPosition is the simplest atomic path in Electron
    // and does NOT trigger resize/recomposite artifacts.
    const [currentX, currentY] = win.getPosition();
    _programmaticMove = true;
    win.setPosition(currentX + dx, currentY + dy);
    _programmaticMove = false;
}

/**
 * Scale the window uniformly from its centre.
 * delta: positive = grow, negative = shrink
 */
function applyScale(win, delta, limit) {
    const ws = storage.getWindowState();
    const current = ws.scale ?? 1.0;
    // Enforce hard limits
    const effectiveLimit = delta > 0 ? Math.min(limit, HARD_LIMITS.scaleMax) : Math.max(limit, HARD_LIMITS.scaleMin);
    const next = delta > 0 ? Math.min(current + Math.abs(delta), effectiveLimit) : Math.max(current - Math.abs(delta), effectiveLimit);
    if (next === current) return;

    const [cx, cy] = win.getPosition();
    const [cw, ch] = win.getSize();

    const nw = Math.round(DEFAULT_MAIN_WINDOW_SIZE.width * next);
    const nh = Math.round(DEFAULT_MAIN_WINDOW_SIZE.height * next);
    const nw2 = Math.max(MIN_WINDOW_SIZE.width, nw);
    const nh2 = Math.max(MIN_WINDOW_SIZE.height, nh);

    const nx = Math.round(cx + (cw - nw2) / 2);
    const ny = Math.round(cy + (ch - nh2) / 2);

    win.setBounds({ x: nx, y: ny, width: nw2, height: nh2 });
    storage.setWindowState({ scale: next, x: nx, y: ny });

    const { BrowserWindow: BW } = require('electron');
    const windows = BW.getAllWindows();
    for (const w of windows) w.webContents.send('scale-changed', next);
}

function applyZoom(win, delta, limit) {
    const ws = storage.getWindowState();
    const current = ws.zoom ?? 1.0;
    // Enforce hard limits
    const effectiveLimit = delta > 0 ? Math.min(limit, HARD_LIMITS.zoomMax) : Math.max(limit, HARD_LIMITS.zoomMin);
    const next =
        delta > 0
            ? Math.min(parseFloat((current + Math.abs(delta)).toFixed(2)), effectiveLimit)
            : Math.max(parseFloat((current - Math.abs(delta)).toFixed(2)), effectiveLimit);
    if (next === current) return;
    try {
        win.webContents.setZoomFactor(next);
    } catch (_) {}
    storage.updateWindowState('zoom', next);
    win.webContents.send('zoom-changed', next);
}

// ──────────────────────────────────────────────────────────────
// IPC handlers
// ──────────────────────────────────────────────────────────────

function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef, typingManagerRef) {
    ipcMain.on('view-changed', (event, view) => {
        if (!mainWindow.isDestroyed() && view !== 'assistant') {
            mainWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcMain.handle('window-minimize', () => {
        if (!mainWindow.isDestroyed()) mainWindow.minimize();
    });

    ipcMain.handle('toggle-window-visibility', () => {
        if (mainWindow.isDestroyed()) return { success: false };
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.showInactive();
        }
        return { success: true };
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (!mainWindow.isDestroyed()) {
            storage.setKeybinds(newKeybinds);
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef, typingManagerRef);
        }
    });

    // ── Window state getters/setters ──
    ipcMain.handle('window:get-state', () => storage.getWindowState());

    ipcMain.handle('window:set-state', (event, patch) => {
        storage.setWindowState(patch);
        _applyStatePatch(mainWindow, patch);
        return { success: true };
    });

    ipcMain.handle('window:update-keybinds', (event, keybinds) => {
        storage.setKeybinds(keybinds);
        updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef, typingManagerRef);
        return { success: true };
    });

    ipcMain.handle('window:reset-keybinds', () => {
        const defaults = getDefaultKeybinds();
        storage.setKeybinds(defaults);
        updateGlobalShortcuts(defaults, mainWindow, sendToRenderer, geminiSessionRef, typingManagerRef);
        return { success: true, keybinds: defaults };
    });

    ipcMain.handle('window:set-scale', (event, scale) => {
        const clamped = Math.max(HARD_LIMITS.scaleMin, Math.min(HARD_LIMITS.scaleMax, scale));
        const ws = storage.getWindowState();
        applyScale(mainWindow, clamped - (ws.scale ?? 1.0), HARD_LIMITS.scaleMax);
        return { success: true };
    });

    ipcMain.handle('window:set-zoom', (event, zoom) => {
        const clamped = Math.max(HARD_LIMITS.zoomMin, Math.min(HARD_LIMITS.zoomMax, zoom));
        try {
            mainWindow.webContents.setZoomFactor(clamped);
        } catch (_) {}
        storage.updateWindowState('zoom', clamped);
        mainWindow.webContents.send('zoom-changed', clamped);
        return { success: true };
    });

    ipcMain.handle('window:set-voice', (event, enabled) => {
        storage.updateWindowState('voiceEnabled', enabled);
        sendToRenderer('voice-toggled', enabled);
        return { success: true };
    });
}

function _applyStatePatch(win, patch) {
    if (patch.zoom !== undefined) {
        const clamped = Math.max(HARD_LIMITS.zoomMin, Math.min(HARD_LIMITS.zoomMax, patch.zoom));
        try {
            win.webContents.setZoomFactor(clamped);
        } catch (_) {}
    }
    if (patch.scale !== undefined) {
        const clamped = Math.max(HARD_LIMITS.scaleMin, Math.min(HARD_LIMITS.scaleMax, patch.scale));
        const nw = Math.max(MIN_WINDOW_SIZE.width, Math.round(DEFAULT_MAIN_WINDOW_SIZE.width * clamped));
        const nh = Math.max(MIN_WINDOW_SIZE.height, Math.round(DEFAULT_MAIN_WINDOW_SIZE.height * clamped));
        const [cx, cy] = win.getPosition();
        const [cw, ch] = win.getSize();
        const nx = Math.round(cx + (cw - nw) / 2);
        const ny = Math.round(cy + (ch - nh) / 2);
        win.setBounds({ x: nx, y: ny, width: nw, height: nh });
    }
}

module.exports = {
    createWindow,
    getDefaultKeybinds,
    updateGlobalShortcuts,
    setupWindowIpcHandlers,
    applyScale,
    applyZoom,
    HARD_LIMITS,
};
