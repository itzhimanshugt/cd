'use strict';

const BaseBackend = require('./BaseBackend');

const CHUNK_MODES = {
    FULL: 'full',
    SENTENCE: 'sentence',
    PARAGRAPH: 'paragraph',
};

/**
 * Clipboard-based text injection backend.
 * Flow: save clipboard -> write text -> simulate Ctrl+V -> restore clipboard.
 * Works cross-platform wherever Electron's clipboard module is available.
 */
class ClipboardInjectionBackend extends BaseBackend {
    constructor() {
        super();
        this._clipboard = null;
        this._chunkMode = CHUNK_MODES.FULL;
        this._initialized = false;
    }

    getName() {
        return 'ClipboardInjection';
    }

    isAvailable() {
        try {
            const { clipboard } = require('electron');
            return !!clipboard;
        } catch (e) {
            return false;
        }
    }

    supportsUnicode() {
        return true;
    }

    supportsChunking() {
        return true;
    }

    initialize() {
        try {
            const { clipboard } = require('electron');
            this._clipboard = clipboard;
        } catch (e) {
            this._clipboard = null;
        }
        this._initialized = true;
    }

    destroy() {
        this._clipboard = null;
        this._initialized = false;
    }

    /**
     * Sets the chunk mode for multi-chunk injection.
     * @param {string} mode - One of: 'full', 'sentence', 'paragraph'
     */
    setChunkMode(mode) {
        if (!Object.values(CHUNK_MODES).includes(mode)) {
            throw new RangeError(`Invalid chunk mode: ${mode}. Must be one of: ${Object.values(CHUNK_MODES).join(', ')}`);
        }
        this._chunkMode = mode;
    }

    /**
     * Injects text via clipboard paste (Ctrl+V / Cmd+V).
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text || !this._clipboard) return;

        // Save current clipboard content
        let savedClipboard = '';
        try {
            savedClipboard = this._clipboard.readText();
        } catch (e) {
            // Clipboard may not be accessible
        }

        try {
            // Write text to clipboard
            this._clipboard.writeText(text);

            // Simulate paste keystroke
            await this._simulatePaste();
        } finally {
            // Restore clipboard after a delay to allow paste to complete.
            // 300ms provides a reasonable margin for slower target applications
            // to process the Ctrl+V event before the clipboard content changes.
            setTimeout(() => {
                try {
                    if (this._clipboard) {
                        this._clipboard.writeText(savedClipboard);
                    }
                } catch (e) {
                    // Best effort restore
                }
            }, 300);
        }
    }

    /**
     * Injects a chunk of text based on the current chunk mode.
     * @param {string} text - Text to inject as a chunk
     * @returns {Promise<void>}
     */
    async injectChunk(text) {
        await this.inject(text);
    }

    /**
     * Injects a single key code - not supported by clipboard backend.
     * Falls back to inject with the character representation.
     * @param {number} keyCode - Virtual key code
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        // Clipboard backend cannot send individual key codes
        // Convert to character if possible
        const char = String.fromCharCode(keyCode);
        if (char) {
            await this.inject(char);
        }
    }

    /**
     * Simulates a Ctrl+V (or Cmd+V on macOS) paste keystroke.
     * Uses async child_process on Windows or AppleScript on macOS.
     * @private
     * @returns {Promise<void>}
     */
    async _simulatePaste() {
        const { execFile } = require('child_process');
        const { promisify } = require('util');
        const execFileAsync = promisify(execFile);

        if (process.platform === 'win32') {
            const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("^v")`;
            await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
                windowsHide: true,
                timeout: 5000,
            });
        } else if (process.platform === 'darwin') {
            await execFileAsync('osascript', ['-e', 'tell application "System Events" to keystroke "v" using command down'], {
                timeout: 5000,
            });
        } else {
            // Linux: use xdotool if available
            await execFileAsync('xdotool', ['key', 'ctrl+v'], { timeout: 5000 });
        }
    }
}

ClipboardInjectionBackend.CHUNK_MODES = CHUNK_MODES;

module.exports = ClipboardInjectionBackend;
