'use strict';

const BaseBackend = require('./BaseBackend');

/**
 * Backend for typing into Electron windows/webviews using
 * BrowserWindow.getFocusedWindow().webContents.insertText() and sendInputEvent().
 */
class ElectronWebContentsBackend extends BaseBackend {
    constructor() {
        super();
        this._BrowserWindow = null;
        this._initialized = false;
    }

    getName() {
        return 'ElectronWebContents';
    }

    isAvailable() {
        try {
            const { BrowserWindow } = require('electron');
            return !!BrowserWindow;
        } catch (e) {
            return false;
        }
    }

    supportsUnicode() {
        return true;
    }

    supportsRealtimeStreaming() {
        return true;
    }

    initialize() {
        try {
            const { BrowserWindow } = require('electron');
            this._BrowserWindow = BrowserWindow;
            this._initialized = true;
        } catch (e) {
            this._BrowserWindow = null;
            this._initialized = false;
        }
    }

    destroy() {
        this._BrowserWindow = null;
        this._initialized = false;
    }

    /**
     * Injects text using webContents.insertText() on the focused window.
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text || !this._BrowserWindow) return;

        try {
            const win = this._BrowserWindow.getFocusedWindow();
            if (win && win.webContents) {
                await win.webContents.insertText(text);
            }
        } catch (e) {
            // Electron webContents injection failed
        }
    }

    /**
     * Sends a key input event to the focused window's webContents.
     * @param {number} keyCode - Virtual key code
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        if (!this._BrowserWindow) return;

        try {
            const win = this._BrowserWindow.getFocusedWindow();
            if (win && win.webContents) {
                const char = String.fromCharCode(keyCode);
                win.webContents.sendInputEvent({
                    type: 'keyDown',
                    keyCode: char,
                });
                win.webContents.sendInputEvent({
                    type: 'char',
                    keyCode: char,
                });
                win.webContents.sendInputEvent({
                    type: 'keyUp',
                    keyCode: char,
                });
            }
        } catch (e) {
            // Best effort
        }
    }
}

module.exports = ElectronWebContentsBackend;
