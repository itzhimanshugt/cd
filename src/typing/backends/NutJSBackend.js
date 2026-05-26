'use strict';

const BaseBackend = require('./BaseBackend');

/**
 * Backend using @nut-tree/nut-js for native keyboard automation.
 * Optional dependency - marks itself unavailable if not installed.
 */
class NutJSBackend extends BaseBackend {
    constructor() {
        super();
        this._keyboard = null;
        this._available = false;
    }

    getName() {
        return 'NutJS';
    }

    isAvailable() {
        if (this._available) return true;

        try {
            require.resolve('@nut-tree/nut-js');
            return true;
        } catch (e) {
            return false;
        }
    }

    supportsRealtimeStreaming() {
        return true;
    }

    supportsKeyCombos() {
        return true;
    }

    supportsUnicode() {
        return true;
    }

    initialize() {
        try {
            const { keyboard } = require('@nut-tree/nut-js');
            this._keyboard = keyboard;
            this._available = true;
        } catch (e) {
            this._keyboard = null;
            this._available = false;
        }
    }

    destroy() {
        this._keyboard = null;
    }

    /**
     * Types text using nut.js keyboard.type().
     * @param {string} text - Text to type
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text || !this._keyboard) return;

        await this._keyboard.type(text);
    }

    /**
     * @param {number} keyCode - Virtual key code
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        if (!this._keyboard) return;

        await this._keyboard.pressKey(keyCode);
        await this._keyboard.releaseKey(keyCode);
    }
}

module.exports = NutJSBackend;
