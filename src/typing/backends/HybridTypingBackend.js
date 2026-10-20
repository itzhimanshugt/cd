'use strict';

const BaseBackend = require('./BaseBackend');

/**
 * Hybrid backend that combines Win32SendInput for short text and Clipboard paste for long text.
 * Automatically switches between backends based on text length threshold.
 */
class HybridTypingBackend extends BaseBackend {
    /**
     * @param {object} [options]
     * @param {number} [options.threshold=50] - Character count below which SendInput is used
     */
    constructor(options = {}) {
        super();
        this._threshold = options.threshold ?? 50;
        this._sendInputBackend = null;
        this._clipboardBackend = null;
        this._initialized = false;
    }

    getName() {
        return 'HybridTyping';
    }

    isAvailable() {
        const Win32SendInputBackend = require('./Win32SendInputBackend');
        const ClipboardInjectionBackend = require('./ClipboardInjectionBackend');
        const si = new Win32SendInputBackend();
        const cb = new ClipboardInjectionBackend();
        return si.isAvailable() || cb.isAvailable();
    }

    supportsRealtimeStreaming() {
        return true;
    }

    supportsUnicode() {
        return true;
    }

    supportsChunking() {
        return true;
    }

    initialize() {
        const Win32SendInputBackend = require('./Win32SendInputBackend');
        const ClipboardInjectionBackend = require('./ClipboardInjectionBackend');

        this._sendInputBackend = new Win32SendInputBackend();
        this._sendInputBackend.initialize();

        this._clipboardBackend = new ClipboardInjectionBackend();
        this._clipboardBackend.initialize();

        this._initialized = true;
    }

    destroy() {
        if (this._sendInputBackend) {
            this._sendInputBackend.destroy();
            this._sendInputBackend = null;
        }
        if (this._clipboardBackend) {
            this._clipboardBackend.destroy();
            this._clipboardBackend = null;
        }
        this._initialized = false;
    }

    /**
     * Injects text using SendInput for short strings or Clipboard for long strings.
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text) return;

        if (text.length <= this._threshold && this._sendInputBackend) {
            await this._sendInputBackend.inject(text);
        } else if (this._clipboardBackend) {
            await this._clipboardBackend.inject(text);
        }
    }

    /**
     * @param {number} keyCode - Virtual key code
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        if (this._sendInputBackend) {
            await this._sendInputBackend.injectKey(keyCode);
        } else if (this._clipboardBackend) {
            await this._clipboardBackend.injectKey(keyCode);
        }
    }
}

module.exports = HybridTypingBackend;
