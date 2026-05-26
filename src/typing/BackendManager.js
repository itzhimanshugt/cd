'use strict';

const { EventEmitter } = require('events');
const backends = require('./backends');

const DEFAULT_FAILOVER_CHAIN = [
    'win32-sendinput',
    'virtual-keyboard',
    'powershell-addtype',
    'clipboard',
    'powershell',
    'autohotkey',
    'batch-paste',
    'hybrid-typing',
    'nutjs',
    'robotjs',
    'ui-automation',
    'electron-webcontents',
];

/**
 * Manages all injection backend instances with failover support.
 * Tracks backend health and provides automatic failover when a backend fails.
 */
class BackendManager extends EventEmitter {
    /**
     * @param {object} [config]
     * @param {string[]} [config.failoverChain] - Ordered list of backend names (kebab-case)
     */
    constructor(config = {}) {
        super();

        this._failoverChain = config.failoverChain || [...DEFAULT_FAILOVER_CHAIN];
        this._backends = new Map();
        this._health = new Map();
        this._primary = this._failoverChain[0] || null;
    }

    /**
     * Instantiates all backends from the failover chain and marks availability.
     */
    initialize() {
        for (const name of this._failoverChain) {
            const BackendClass = this._resolveBackendClass(name);
            if (!BackendClass) continue;

            try {
                const instance = new BackendClass();
                instance.initialize();
                this._backends.set(name, instance);
            } catch (e) {
                // Backend failed to instantiate - still track it
            }

            this._health.set(name, {
                errorCount: 0,
                lastErrorTime: null,
                lastError: null,
            });
        }
    }

    /**
     * Returns a backend instance by name.
     * @param {string} name - Backend name (kebab-case)
     * @returns {object|null}
     */
    getBackend(name) {
        return this._backends.get(name) || null;
    }

    /**
     * Returns array of backend names where isAvailable() is true.
     * @returns {string[]}
     */
    getAvailableBackends() {
        const available = [];
        for (const [name, instance] of this._backends) {
            try {
                if (instance.isAvailable()) {
                    available.push(name);
                }
            } catch (e) {
                // Skip backends that error on availability check
            }
        }
        return available;
    }

    /**
     * Returns the current primary backend name.
     * @returns {string|null}
     */
    getPrimary() {
        return this._primary;
    }

    /**
     * Sets the primary backend.
     * @param {string} name - Backend name (kebab-case)
     */
    setPrimary(name) {
        this._primary = name;
    }

    /**
     * Sets a new failover chain order.
     * @param {string[]} chain - Ordered list of backend names
     */
    setFailoverChain(chain) {
        this._failoverChain = [...chain];
    }

    /**
     * Returns the current failover chain.
     * @returns {string[]}
     */
    getFailoverChain() {
        return [...this._failoverChain];
    }

    /**
     * Returns health stats for all backends.
     * @returns {object} Map of name -> { errorCount, lastErrorTime, available }
     */
    getHealth() {
        const result = {};
        for (const [name, health] of this._health) {
            const instance = this._backends.get(name);
            let available = false;
            try {
                available = instance ? instance.isAvailable() : false;
            } catch (e) {
                // isAvailable() threw - treat as unavailable
            }
            result[name] = {
                errorCount: health.errorCount,
                lastErrorTime: health.lastErrorTime,
                available,
            };
        }
        return result;
    }

    /**
     * Attempts injection on primary backend; on failure, iterates through
     * the failover chain trying each until one succeeds.
     * @param {string} text - Text to inject
     * @returns {Promise<{success: boolean, backend: string}>}
     */
    async tryInject(text) {
        // Try primary first
        if (this._primary) {
            const primaryInstance = this._backends.get(this._primary);
            if (primaryInstance) {
                try {
                    await primaryInstance.inject(text);
                    return { success: true, backend: this._primary };
                } catch (e) {
                    this._recordError(this._primary, e);
                    this.emit('backend-error', { backend: this._primary, error: e });
                }
            }
        }

        // Iterate through failover chain
        for (const name of this._failoverChain) {
            if (name === this._primary) continue;

            const instance = this._backends.get(name);
            if (!instance) continue;

            try {
                if (!instance.isAvailable()) continue;
            } catch (e) {
                continue;
            }

            try {
                await instance.inject(text);
                this.emit('failover', { from: this._primary, to: name, error: null });
                return { success: true, backend: name };
            } catch (e) {
                this._recordError(name, e);
                this.emit('backend-error', { backend: name, error: e });
            }
        }

        return { success: false, backend: 'none' };
    }

    /**
     * Records an error for a backend in the health map.
     * @private
     * @param {string} name - Backend name
     * @param {Error} error - The error that occurred
     */
    _recordError(name, error) {
        const health = this._health.get(name);
        if (health) {
            health.errorCount++;
            health.lastErrorTime = Date.now();
            health.lastError = error.message || String(error);
        }
    }

    /**
     * Resolves a backend class by name (supports multiple aliases).
     * @private
     * @param {string} name - Backend name (PascalCase or kebab-case)
     * @returns {Function|null}
     */
    _resolveBackendClass(name) {
        const map = {
            Win32SendInput: backends.Win32SendInputBackend,
            'win32-sendinput': backends.Win32SendInputBackend,
            ClipboardInjection: backends.ClipboardInjectionBackend,
            clipboard: backends.ClipboardInjectionBackend,
            PowerShellSendKeys: backends.PowerShellSendKeysBackend,
            powershell: backends.PowerShellSendKeysBackend,
            RobotJS: backends.RobotJSBackend,
            robotjs: backends.RobotJSBackend,
            AutoHotkey: backends.AutoHotkeyBackend,
            autohotkey: backends.AutoHotkeyBackend,
            ahk: backends.AutoHotkeyBackend,
            NutJS: backends.NutJSBackend,
            nutjs: backends.NutJSBackend,
            nut: backends.NutJSBackend,
            UIAutomation: backends.UIAutomationBackend,
            'ui-automation': backends.UIAutomationBackend,
            uiautomation: backends.UIAutomationBackend,
            ElectronWebContents: backends.ElectronWebContentsBackend,
            'electron-webcontents': backends.ElectronWebContentsBackend,
            electron: backends.ElectronWebContentsBackend,
            VirtualKeyboard: backends.VirtualKeyboardBackend,
            'virtual-keyboard': backends.VirtualKeyboardBackend,
            vk: backends.VirtualKeyboardBackend,
            'keybd-event': backends.VirtualKeyboardBackend,
            BatchPaste: backends.BatchPasteBackend,
            'batch-paste': backends.BatchPasteBackend,
            batch: backends.BatchPasteBackend,
            HybridTyping: backends.HybridTypingBackend,
            'hybrid-typing': backends.HybridTypingBackend,
            hybrid: backends.HybridTypingBackend,
            PowerShellAddType: backends.PowerShellAddTypeBackend,
            'powershell-addtype': backends.PowerShellAddTypeBackend,
            'ps-addtype': backends.PowerShellAddTypeBackend,
        };
        return map[name] || null;
    }

    /**
     * Destroys all instantiated backends.
     */
    destroy() {
        for (const [, instance] of this._backends) {
            try {
                instance.destroy();
            } catch (e) {
                // Cleanup errors are non-fatal
            }
        }
        this._backends.clear();
        this._health.clear();
    }
}

module.exports = BackendManager;
