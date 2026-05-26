class HotkeyService {
    constructor() {
        this._registry = new Map();
        this._globalShortcut = null;
    }

    init(globalShortcut) {
        this._globalShortcut = globalShortcut;
    }

    register(action, accelerator, handler) {
        if (!this._globalShortcut) return false;
        try {
            this._globalShortcut.register(accelerator, handler);
            this._registry.set(action, { accelerator, handler });
            return true;
        } catch (err) {
            console.error(`[HotkeyService] Failed to register "${action}" (${accelerator}):`, err.message);
            return false;
        }
    }

    unregister(action) {
        if (!this._globalShortcut) return false;
        const entry = this._registry.get(action);
        if (!entry) return false;
        try {
            this._globalShortcut.unregister(entry.accelerator);
        } catch (err) {
            console.error(`[HotkeyService] Failed to unregister "${action}":`, err.message);
        }
        this._registry.delete(action);
        return true;
    }

    updateBinding(action, newAccelerator, handler) {
        const entry = this._registry.get(action);
        if (entry && entry.accelerator === newAccelerator) {
            return true; // No change needed
        }
        if (entry) {
            this.unregister(action);
        }
        return this.register(action, newAccelerator, handler);
    }

    rebuildAll(keybinds, handlers) {
        // Full rebuild fallback - unregister everything, re-register
        for (const [action] of this._registry) {
            this.unregister(action);
        }
        for (const [action, accelerator] of Object.entries(keybinds)) {
            const handler = handlers[action];
            if (handler && accelerator) {
                this.register(action, accelerator, handler);
            }
        }
    }

    getRegistered() {
        const result = {};
        for (const [action, entry] of this._registry) {
            result[action] = entry.accelerator;
        }
        return result;
    }
}

module.exports = { HotkeyService };
