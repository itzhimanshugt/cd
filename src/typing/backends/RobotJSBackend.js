'use strict';

const BaseBackend = require('./BaseBackend');

/**
 * Stub/legacy fallback backend using the robotjs native module.
 * Attempts to require('robotjs') at initialization; marks itself
 * unavailable if the module is not installed.
 */
class RobotJSBackend extends BaseBackend {
    constructor() {
        super();
        this._robot = null;
        this._available = false;
    }

    getName() {
        return 'RobotJS';
    }

    isAvailable() {
        if (this._available) return true;

        try {
            require.resolve('robotjs');
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

    initialize() {
        try {
            this._robot = require('robotjs');
            this._available = true;
        } catch (e) {
            this._robot = null;
            this._available = false;
        }
    }

    destroy() {
        this._robot = null;
    }

    /**
     * Types a string using robotjs typeString.
     * @param {string} text - Text to type
     */
    inject(text) {
        if (!text || !this._robot) return;

        try {
            this._robot.typeString(text);
        } catch (e) {
            // robotjs may fail on certain platforms or configurations
        }
    }

    /**
     * Sends a single key tap via robotjs.
     * @param {number} keyCode - Virtual key code (not directly supported, converts to char)
     */
    injectKey(keyCode) {
        if (!this._robot) return;

        try {
            const char = String.fromCharCode(keyCode).toLowerCase();
            this._robot.keyTap(char);
        } catch (e) {
            // Best effort
        }
    }
}

module.exports = RobotJSBackend;
