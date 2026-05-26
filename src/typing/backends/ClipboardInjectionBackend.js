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
     */
    inject(text) {
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
            this._simulatePaste();
        } finally {
            // Restore clipboard after a short delay to allow paste to complete
            setTimeout(() => {
                try {
                    if (this._clipboard) {
                        this._clipboard.writeText(savedClipboard);
                    }
                } catch (e) {
                    // Best effort restore
                }
            }, 100);
        }
    }

    /**
     * Injects a chunk of text based on the current chunk mode.
     * @param {string} text - Text to inject as a chunk
     */
    injectChunk(text) {
        this.inject(text);
    }

    /**
     * Injects a single key code - not supported by clipboard backend.
     * Falls back to inject with the character representation.
     * @param {number} keyCode - Virtual key code
     */
    injectKey(keyCode) {
        // Clipboard backend cannot send individual key codes
        // Convert to character if possible
        const char = String.fromCharCode(keyCode);
        if (char) {
            this.inject(char);
        }
    }

    /**
     * Simulates a Ctrl+V (or Cmd+V on macOS) paste keystroke.
     * Uses PowerShell on Windows or AppleScript on macOS.
     * @private
     */
    _simulatePaste() {
        try {
            const { execSync } = require('child_process');

            if (process.platform === 'win32') {
                const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("^v")`;
                execSync(`powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`, {
                    windowsHide: true,
                    timeout: 5000,
                });
            } else if (process.platform === 'darwin') {
                execSync('osascript -e \'tell application "System Events" to keystroke "v" using command down\'', {
                    timeout: 5000,
                });
            } else {
                // Linux: use xdotool if available
                execSync('xdotool key ctrl+v', { timeout: 5000 });
            }
        } catch (e) {
            // Paste simulation failed - non-fatal
        }
    }
}

ClipboardInjectionBackend.CHUNK_MODES = CHUNK_MODES;

module.exports = ClipboardInjectionBackend;
