'use strict';

/**
 * Manages typing-related global keybinds.
 * Integrates with Electron's globalShortcut module for hotkey registration.
 * Uses try/catch around require('electron') since globalShortcut is only
 * available in the main process.
 */
class HotkeyController {
    constructor() {
        this._globalShortcut = null;
        this._registered = [];

        try {
            const { globalShortcut } = require('electron');
            this._globalShortcut = globalShortcut;
        } catch (e) {
            // Not running in Electron main process
            this._globalShortcut = null;
        }
    }

    /**
     * Registers a toggle-to-type keybind.
     * First press starts/resumes typing, next press pauses.
     * @param {string} keybind - Electron accelerator string (e.g. 'Ctrl+Shift+T')
     * @param {object} manager - TypingManager instance
     * @returns {boolean} Whether registration succeeded
     */
    registerHoldToType(keybind, manager) {
        if (!this._globalShortcut || !keybind) return false;

        try {
            const success = this._globalShortcut.register(keybind, () => {
                const status = manager.getStatus();
                if (status.state === 'typing') {
                    manager.pause();
                } else if (status.state === 'paused') {
                    manager.resume();
                } else if (status.state === 'idle') {
                    try {
                        manager.start();
                    } catch (e) {
                        // No response loaded
                    }
                }
            });

            if (success) {
                this._registered.push(keybind);
            }
            return success;
        } catch (e) {
            return false;
        }
    }

    /**
     * Registers an emergency abort keybind.
     * @param {string} keybind - Electron accelerator string
     * @param {object} manager - TypingManager instance
     * @returns {boolean} Whether registration succeeded
     */
    registerAbort(keybind, manager) {
        if (!this._globalShortcut || !keybind) return false;

        try {
            const success = this._globalShortcut.register(keybind, () => {
                manager.abort();
            });

            if (success) {
                this._registered.push(keybind);
            }
            return success;
        } catch (e) {
            return false;
        }
    }

    /**
     * Registers a keybind that loads the last response and starts typing.
     * @param {string} keybind - Electron accelerator string
     * @param {object} manager - TypingManager instance
     * @returns {boolean} Whether registration succeeded
     */
    registerFullResponse(keybind, manager) {
        if (!this._globalShortcut || !keybind) return false;

        try {
            const success = this._globalShortcut.register(keybind, () => {
                const lastResponse = manager.getLastResponse();
                if (lastResponse) {
                    manager.loadResponse(lastResponse);
                    manager.start();
                }
            });

            if (success) {
                this._registered.push(keybind);
            }
            return success;
        } catch (e) {
            return false;
        }
    }

    /**
     * Unregisters all keybinds managed by this controller.
     */
    unregisterAll() {
        if (!this._globalShortcut) return;

        for (const keybind of this._registered) {
            try {
                this._globalShortcut.unregister(keybind);
            } catch (e) {
                // Best effort cleanup
            }
        }

        this._registered = [];
    }

    /**
     * Returns the list of currently registered keybinds.
     * @returns {string[]}
     */
    getRegistered() {
        return [...this._registered];
    }
}

module.exports = HotkeyController;
