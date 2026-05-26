if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
const { setupGeminiIpcHandlers, stopMacOSAudioCapture, sendToRenderer } = require('./utils/gemini');
const apiKeys = require('./utils/apiKeys');
const storage = require('./storage');
const { TypingManager, WindowTargetLock } = require('./typing');
const { StorageService } = require('./services/StorageService');

// Lazy-loaded modules
let _logger = null;
let _screenshot = null;
function getLogger() { if (!_logger) _logger = require('./utils/logger'); return _logger; }
function getScreenshot() { if (!_screenshot) _screenshot = require('./utils/screenshot'); return _screenshot; }

const geminiSessionRef = { current: null };
let mainWindow = null;
let typingManager = null;
let typingTargetLock = null;
let storageService = null;

// ── IPC Payload Validation ──
function validateString(val, maxLen = 10000) {
    return typeof val === 'string' && val.length <= maxLen;
}
function validateNumber(val, min = -Infinity, max = Infinity) {
    return typeof val === 'number' && !isNaN(val) && val >= min && val <= max;
}
function validateObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function createMainWindow() {
    mainWindow = createWindow(sendToRenderer, geminiSessionRef, typingManager);
    return mainWindow;
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(async () => {
        // === IMMEDIATE ===
        // Initialize storage (checks version, resets if needed)
        storage.initializeStorage();

        // Initialize StorageService cache
        storageService = new StorageService();
        storageService.init();

        // Trigger screen recording permission prompt on macOS if not already granted
        if (process.platform === 'darwin') {
            const { desktopCapturer } = require('electron');
            // Intentional: just triggers permission prompt
            desktopCapturer.getSources({ types: ['screen'] }).catch(() => {});
        }

        typingManager = new TypingManager();
        typingTargetLock = new WindowTargetLock();
        createMainWindow();

        // Forward typing events to renderer
        typingManager.on('status-changed', status => sendToRenderer('typing-status-changed', status));
        typingManager.on('progress-changed', progress => sendToRenderer('typing-progress-changed', progress));
        typingManager.on('typing-started', () => sendToRenderer('typing-started'));
        typingManager.on('typing-paused', () => sendToRenderer('typing-paused'));
        typingManager.on('typing-completed', () => sendToRenderer('typing-completed'));
        typingManager.on('typing-aborted', () => sendToRenderer('typing-aborted'));
        typingManager.on('injection-error', (detail) => sendToRenderer('typing-injection-error', detail));

        setupGeminiIpcHandlers(geminiSessionRef);
        setupStorageIpcHandlers();
        setupApiKeysIpcHandlers();
        setupGeneralIpcHandlers();
        setupTypingIpcHandlers();
        setupDebugIpcHandlers();

        // === DEFERRED (5s) ===
        // Pre-warm screen capture subsystem to avoid first-session freeze on Windows
        setTimeout(() => {
            const { desktopCapturer } = require('electron');
            desktopCapturer
                .getSources({ types: ['screen'] })
                .then(sources => {
                    console.log(`Screen capture pre-warmed: ${sources.length} source(s)`);
                })
                // Intentional: just triggers permission prompt
                .catch(() => {});
        }, 5000);

        // === DEFERRED (15s) ===
        // Defer validation to avoid competing with initial render and GPU setup
        setTimeout(() => {
            apiKeys.startBackgroundValidation();
        }, 15000);
    });

    app.on('window-all-closed', () => {
        stopMacOSAudioCapture();
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('before-quit', () => {
        try {
            if (storageService) storageService.flush();
            storage.flushAll();
        } catch (error) {
            console.error('Error flushing storage on quit:', error);
        }
        try {
            stopMacOSAudioCapture();
        } catch (error) {
            console.error('Error stopping audio on quit:', error);
        }
        try {
            apiKeys.stopBackgroundValidation();
        } catch (error) {
            console.error('Error stopping validation on quit:', error);
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
}

function setupStorageIpcHandlers() {
    // ============ CONFIG ============
    ipcMain.handle('storage:get-config', async () => {
        try {
            return { success: true, data: storage.getConfig() };
        } catch (error) {
            console.error('Error getting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-config', async (event, config) => {
        try {
            if (!validateObject(config)) return { success: false, error: 'Invalid input' };
            storage.setConfig(config);
            return { success: true };
        } catch (error) {
            console.error('Error setting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-config', async (event, key, value) => {
        try {
            storage.updateConfig(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CREDENTIALS ============
    ipcMain.handle('storage:get-credentials', async () => {
        try {
            return { success: true, data: storage.getCredentials() };
        } catch (error) {
            console.error('Error getting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-credentials', async (event, credentials) => {
        try {
            storage.setCredentials(credentials);
            return { success: true };
        } catch (error) {
            console.error('Error setting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-api-key', async () => {
        try {
            return { success: true, data: storage.getApiKey() };
        } catch (error) {
            console.error('Error getting API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-api-key', async (event, apiKey) => {
        try {
            storage.setApiKey(apiKey);
            return { success: true };
        } catch (error) {
            console.error('Error setting API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-groq-api-key', async () => {
        try {
            return { success: true, data: storage.getGroqApiKey() };
        } catch (error) {
            console.error('Error getting Groq API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-groq-api-key', async (event, groqApiKey) => {
        try {
            storage.setGroqApiKey(groqApiKey);
            return { success: true };
        } catch (error) {
            console.error('Error setting Groq API key:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ PREFERENCES ============
    ipcMain.handle('storage:get-preferences', async () => {
        try {
            return { success: true, data: storage.getPreferences() };
        } catch (error) {
            console.error('Error getting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-preferences', async (event, preferences) => {
        try {
            storage.setPreferences(preferences);
            return { success: true };
        } catch (error) {
            console.error('Error setting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-preference', async (event, key, value) => {
        try {
            if (!validateString(key)) return { success: false, error: 'Invalid input' };
            storage.updatePreference(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating preference:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ KEYBINDS ============
    ipcMain.handle('storage:get-keybinds', async () => {
        try {
            return { success: true, data: storage.getKeybinds() };
        } catch (error) {
            console.error('Error getting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-keybinds', async (event, keybinds) => {
        try {
            if (!validateObject(keybinds)) return { success: false, error: 'Invalid input' };
            storage.setKeybinds(keybinds);
            return { success: true };
        } catch (error) {
            console.error('Error setting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-window-state', async () => {
        try {
            return { success: true, data: storage.getWindowState() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-window-state', async (event, patch) => {
        try {
            storage.setWindowState(patch);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ============ HISTORY ============
    ipcMain.handle('storage:get-all-sessions', async () => {
        try {
            return { success: true, data: storage.getAllSessions() };
        } catch (error) {
            console.error('Error getting sessions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-session', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getSession(sessionId) };
        } catch (error) {
            console.error('Error getting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:save-session', async (event, sessionId, data) => {
        try {
            storage.saveSession(sessionId, data);
            return { success: true };
        } catch (error) {
            console.error('Error saving session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-session', async (event, sessionId) => {
        try {
            storage.deleteSession(sessionId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-all-sessions', async () => {
        try {
            storage.deleteAllSessions();
            return { success: true };
        } catch (error) {
            console.error('Error deleting all sessions:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ LIMITS ============
    ipcMain.handle('storage:get-today-limits', async () => {
        try {
            return { success: true, data: storage.getTodayLimits() };
        } catch (error) {
            console.error('Error getting today limits:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CLEAR ALL ============
    ipcMain.handle('storage:clear-all', async () => {
        try {
            storage.clearAllData();
            return { success: true };
        } catch (error) {
            console.error('Error clearing all data:', error);
            return { success: false, error: error.message };
        }
    });
}

function setupApiKeysIpcHandlers() {
    // List sanitized keys for a provider
    ipcMain.handle('api-keys:list', async (event, provider) => {
        try {
            return { success: true, data: apiKeys.listKeys(provider) };
        } catch (error) {
            console.error('Error listing API keys:', error);
            return { success: false, error: error.message };
        }
    });

    // List keys for all providers in one call
    ipcMain.handle('api-keys:list-all', async () => {
        try {
            const data = {};
            for (const provider of storage.API_KEY_PROVIDERS) {
                data[provider] = apiKeys.listKeys(provider);
            }
            return { success: true, data };
        } catch (error) {
            console.error('Error listing all API keys:', error);
            return { success: false, error: error.message };
        }
    });

    // Add a key to a provider pool; fire-and-forget validation is triggered internally
    ipcMain.handle('api-keys:add', async (event, provider, key, label) => {
        try {
            if (!validateString(provider) || !validateString(key) || !validateString(label || '')) return { success: false, error: 'Invalid input' };
            const result = await apiKeys.addKey(provider, key, label);
            if (!result.ok) {
                return { success: false, error: result.error };
            }
            return { success: true, data: result.entry };
        } catch (error) {
            console.error('Error adding API key:', error);
            return { success: false, error: error.message };
        }
    });

    // Remove a key from a provider pool
    ipcMain.handle('api-keys:remove', async (event, provider, id) => {
        try {
            const result = apiKeys.removeKey(provider, id);
            if (!result.ok) {
                return { success: false, error: result.error };
            }
            return { success: true };
        } catch (error) {
            console.error('Error removing API key:', error);
            return { success: false, error: error.message };
        }
    });

    // Manually revalidate a specific key
    ipcMain.handle('api-keys:revalidate', async (event, provider, id) => {
        try {
            const result = await apiKeys.revalidateKey(provider, id);
            return result.ok ? { success: true } : { success: false, error: result.error };
        } catch (error) {
            console.error('Error revalidating API key:', error);
            return { success: false, error: error.message };
        }
    });

    // Manually revalidate all keys for a provider
    ipcMain.handle('api-keys:revalidate-all', async (event, provider) => {
        try {
            const result = await apiKeys.revalidateAll(provider);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error revalidating all API keys:', error);
            return { success: false, error: error.message };
        }
    });

    // Update label for a key
    ipcMain.handle('api-keys:update-label', async (event, provider, id, label) => {
        try {
            const result = storage.updateProviderKey(provider, id, { label: (label || '').trim() });
            if (result.ok) apiKeys.broadcastUpdate(provider);
            return result.ok ? { success: true } : { success: false, error: result.error };
        } catch (error) {
            console.error('Error updating API key label:', error);
            return { success: false, error: error.message };
        }
    });
}

function setupGeneralIpcHandlers() {
    ipcMain.handle('get-app-version', async () => {
        return app.getVersion();
    });

    ipcMain.handle('get-gemini-models', async () => {
        return { success: true, data: storage.GEMINI_MODELS };
    });

    ipcMain.handle('quit-application', async event => {
        try {
            stopMacOSAudioCapture();
            app.quit();
            return { success: true };
        } catch (error) {
            console.error('Error quitting application:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('open-external', async (event, url) => {
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Error opening external URL:', error);
            return { success: false, error: error.message };
        }
    });

    // Debug logging from renderer
    ipcMain.on('log-message', (event, msg) => {
        console.log(msg);
    });
}

function setupTypingIpcHandlers() {
    ipcMain.handle('typing:load-response', async (event, text) => {
        try {
            typingManager.loadResponse(text);
            return { success: true };
        } catch (error) {
            console.error('Error loading typing response:', error);
            return { success: false, error: error.message };
        }
    });

    // Auto-load: called by the renderer when a new AI response arrives
    ipcMain.handle('typing:auto-load', async (event, text) => {
        try {
            typingManager.loadResponse(text);
            return { success: true };
        } catch (error) {
            console.error('Error auto-loading typing response:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:start', async () => {
        try {
            const settings = storage.getTypingSettings();
            if (typingTargetLock && (settings.targetLock || settings.autoRefocus)) {
                await typingTargetLock.lock();
            }
            if (typingTargetLock && settings.autoRefocus) {
                await typingTargetLock.activate();
            }
            typingManager.start();
            return { success: true };
        } catch (error) {
            console.error('Error starting typing:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:pause', async () => {
        try {
            typingManager.pause();
            return { success: true };
        } catch (error) {
            console.error('Error pausing typing:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:resume', async () => {
        try {
            const settings = storage.getTypingSettings();
            if (typingTargetLock && settings.autoRefocus) {
                await typingTargetLock.activate();
            }
            typingManager.resume();
            return { success: true };
        } catch (error) {
            console.error('Error resuming typing:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:abort', async () => {
        try {
            typingManager.abort();
            if (typingTargetLock) {
                typingTargetLock.unlock();
            }
            return { success: true };
        } catch (error) {
            console.error('Error aborting typing:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:set-speed', async (event, wpm) => {
        try {
            if (!validateNumber(wpm, 1, 1000)) return { success: false, error: 'Invalid input' };
            typingManager.setSpeed(wpm);
            return { success: true };
        } catch (error) {
            console.error('Error setting typing speed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:set-backend', async (event, name) => {
        try {
            if (!validateString(name)) return { success: false, error: 'Invalid input' };
            typingManager.setBackend(name);
            return { success: true };
        } catch (error) {
            console.error('Error setting typing backend:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:get-status', async () => {
        try {
            return { success: true, data: typingManager.getStatus() };
        } catch (error) {
            console.error('Error getting typing status:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:skip-sentence', async () => {
        try {
            typingManager.skipSentence();
            return { success: true };
        } catch (error) {
            console.error('Error skipping sentence:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:get-settings', async () => {
        try {
            return { success: true, data: storage.getTypingSettings() };
        } catch (error) {
            console.error('Error getting typing settings:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:set-settings', async (event, patch) => {
        try {
            if (!validateObject(patch)) return { success: false, error: 'Invalid input' };
            storage.setTypingSettings(patch);
            // Reconfigure typing manager with updated settings
            const settings = storage.getTypingSettings();
            if (patch.typingSpeed !== undefined) {
                typingManager.setSpeed(settings.typingSpeed);
            }
            if (patch.backend !== undefined) {
                typingManager.setBackend(settings.backend);
            }
            return { success: true };
        } catch (error) {
            console.error('Error setting typing settings:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('typing:test-backend', async (event, backendName) => {
        try {
            if (backendName) {
                typingManager.setBackend(backendName);
            }
            typingManager.loadResponse('Hello World - typing backend test');
            typingManager.start();
            return { success: true };
        } catch (error) {
            console.error('Error testing typing backend:', error);
            return { success: false, error: error.message };
        }
    });
}

function setupDebugIpcHandlers() {
    ipcMain.handle('debug:capture-screenshot', async () => {
        return getScreenshot().captureScreenshot(mainWindow);
    });

    ipcMain.handle('debug:copy-screenshot', async () => {
        return getScreenshot().copyScreenshotToClipboard(mainWindow);
    });

    ipcMain.handle('debug:capture-and-copy', async () => {
        const [saveResult, copyResult] = await Promise.all([
            getScreenshot().captureScreenshot(mainWindow),
            getScreenshot().copyScreenshotToClipboard(mainWindow),
        ]);
        return {
            success: saveResult.success || copyResult.success,
            saved: saveResult.success,
            copied: copyResult.success,
            path: saveResult.path || null,
            error: !saveResult.success && !copyResult.success ? 'Both operations failed' : null,
        };
    });

    ipcMain.handle('debug:open-screenshots', async () => {
        return getScreenshot().openScreenshotsFolder();
    });

    ipcMain.handle('debug:get-logs', async (event, filters) => {
        try {
            return { success: true, data: getLogger().getEntries(filters || {}) };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('debug:clear-logs', async () => {
        getLogger().clear();
        return { success: true };
    });

    ipcMain.handle('debug:export-logs', async () => {
        try {
            const filePath = getLogger().exportToFile();
            return { success: true, path: filePath };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('debug:set-log-level', async (event, level) => {
        getLogger().setLevel(level);
        return { success: true };
    });

    ipcMain.handle('debug:get-runtime-state', async () => {
        try {
            const keybinds = storage.getKeybinds();
            const prefs = storage.getPreferences();
            const winState = storage.getWindowState();
            const typingSettings = storage.getTypingSettings();
            const typingStatus = typingManager ? typingManager.getStatus() : { state: 'unavailable' };
            const bounds = mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null;
            return {
                success: true,
                data: {
                    keybinds,
                    preferences: prefs,
                    windowState: winState,
                    windowBounds: bounds,
                    typingSettings,
                    typingStatus,
                    memoryUsage: process.memoryUsage(),
                    platform: process.platform,
                    arch: process.arch,
                    pid: process.pid,
                },
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('debug:get-performance', async () => {
        try {
            return {
                success: true,
                data: {
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    cpuUsage: process.cpuUsage(),
                    versions: process.versions,
                    pid: process.pid,
                },
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('debug:export-snapshot', async () => {
        try {
            const fs = require('fs');
            const snapshot = {
                timestamp: Date.now(),
                platform: process.platform,
                arch: process.arch,
                versions: process.versions,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                config: storage.getConfig(),
                preferences: storage.getPreferences(),
                windowState: storage.getWindowState(),
                keybinds: storage.getKeybinds(),
                typingSettings: storage.getTypingSettings(),
                typingStatus: typingManager ? typingManager.getStatus() : null,
                logs: getLogger().getEntries(),
            };
            const dir = storage.getConfigDir();
            const filePath = path.join(dir, `debug-snapshot-${Date.now()}.json`);
            fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
            return { success: true, path: filePath };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });
}
