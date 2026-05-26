const storage = require('../storage');

class StorageService {
    constructor() {
        this._cache = {};
        this._flushTimers = {};
    }

    async init() {
        // Load all domains into cache
        this._cache = {
            preferences: storage.getPreferences(),
            config: storage.getConfig(),
            windowState: storage.getWindowState(),
            keybinds: storage.getKeybinds(),
            typingSettings: storage.getTypingSettings(),
        };
    }

    get(key) {
        // key is a domain name: 'preferences', 'config', 'windowState', 'keybinds', 'typingSettings'
        return this._cache[key] ? { ...this._cache[key] } : undefined;
    }

    set(key, value) {
        // Merge into cache and schedule debounced flush
        this._cache[key] = { ...(this._cache[key] || {}), ...value };
        this._scheduleFlush(key);
    }

    getAll() {
        // Return full cache copy
        return JSON.parse(JSON.stringify(this._cache));
    }

    flush() {
        // Write all pending changes immediately
        for (const key of Object.keys(this._flushTimers)) {
            clearTimeout(this._flushTimers[key]);
            delete this._flushTimers[key];
            this._writeToDisk(key);
        }
    }

    _scheduleFlush(key) {
        if (this._flushTimers[key]) clearTimeout(this._flushTimers[key]);
        this._flushTimers[key] = setTimeout(() => {
            delete this._flushTimers[key];
            this._writeToDisk(key);
        }, 200);
    }

    _writeToDisk(key) {
        // Map cache key to storage.js setter
        switch (key) {
            case 'preferences':
                storage.setPreferences(this._cache.preferences);
                break;
            case 'config':
                storage.setConfig(this._cache.config);
                break;
            case 'windowState':
                storage.setWindowState(this._cache.windowState);
                break;
            case 'keybinds':
                storage.setKeybinds(this._cache.keybinds);
                break;
            case 'typingSettings':
                storage.setTypingSettings(this._cache.typingSettings);
                break;
        }
    }
}

module.exports = { StorageService };
