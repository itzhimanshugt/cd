'use strict';

const BaseBackend = require('./BaseBackend');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execFileAsync = promisify(execFile);

/**
 * Backend that dynamically generates AutoHotkey v2 scripts for text injection.
 * Writes a temp .ahk file to os.tmpdir(), executes via execFile.
 * Text is encoded as UTF-8 in the script file (not passed via command line).
 */
class AutoHotkeyBackend extends BaseBackend {
    constructor() {
        super();
        this._ahkPath = null;
        this._tempFiles = [];
        this._initialized = false;
    }

    getName() {
        return 'AutoHotkey';
    }

    isAvailable() {
        if (process.platform !== 'win32') return false;

        const commonPaths = [
            'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',
            'C:\\Program Files\\AutoHotkey\\AutoHotkey.exe',
            'C:\\Program Files (x86)\\AutoHotkey\\AutoHotkey.exe',
        ];

        for (const p of commonPaths) {
            try {
                fs.accessSync(p, fs.constants.X_OK);
                this._ahkPath = p;
                return true;
            } catch (e) {
                // Not found at this path
            }
        }

        // Check PATH via where command
        try {
            const { execFileSync } = require('child_process');
            // Suppress stdout/stderr from the where command to avoid noisy Windows messages
            const result = execFileSync('where', ['AutoHotkey.exe'], {
                windowsHide: true,
                timeout: 5000,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
            });
            const firstLine = result.trim().split('\n')[0].trim();
            if (firstLine) {
                this._ahkPath = firstLine;
                return true;
            }
        } catch (e) {
            // where command failed or AutoHotkey not found; silence is intentional
        }

        return false;
    }

    supportsUnicode() {
        return true;
    }

    supportsRealtimeStreaming() {
        return true;
    }

    initialize() {
        if (!this._ahkPath) {
            this.isAvailable();
        }
        this._initialized = true;
    }

    destroy() {
        this._cleanup();
        this._initialized = false;
    }

    cleanup() {
        this._cleanup();
        this.destroy();
    }

    /**
     * Escapes text for safe use in AHK v2 block Send syntax.
     * Handles braces, backticks, double quotes, backslashes, and newlines.
     * @private
     * @param {string} text
     * @returns {string}
     */
    _escapeAhkText(text) {
        // Escape backtick first (it is the escape character in AHK)
        let escaped = text.replace(/`/g, '``');
        // Escape braces (special key syntax in AHK)
        escaped = escaped.replace(/\{/g, '{{}');
        escaped = escaped.replace(/\}/g, '{}}');
        // Escape double quotes
        escaped = escaped.replace(/"/g, '""');
        // Escape backslashes (not strictly needed for SendText but for consistency)
        escaped = escaped.replace(/\\/g, '\\');
        // Convert newlines to AHK `n (backtick-n) sequences
        escaped = escaped.replace(/\r\n/g, '`n');
        escaped = escaped.replace(/\n/g, '`n');
        escaped = escaped.replace(/\r/g, '`n');
        return escaped;
    }

    /**
     * Injects text by generating an AHK v2 script and executing it.
     * Uses block Send syntax to handle multi-line text safely.
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text || !this._ahkPath) return;

        const escaped = this._escapeAhkText(text);

        const scriptContent = `#Requires AutoHotkey v2.0
#SingleInstance Force
SetKeyDelay 10, 10
SendText "${escaped}"
ExitApp`;

        const tempFile = path.join(os.tmpdir(), `cd_ahk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.ahk`);

        try {
            fs.writeFileSync(tempFile, scriptContent, 'utf8');
            this._tempFiles.push(tempFile);

            await execFileAsync(this._ahkPath, [tempFile], {
                windowsHide: true,
                timeout: 30000,
            });
        } finally {
            this._removeTempFile(tempFile);
        }
    }

    /**
     * @param {number} keyCode - Virtual key code
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        if (!Number.isFinite(keyCode) || keyCode < 0 || keyCode > 255) return;

        const char = String.fromCharCode(keyCode);
        if (char) {
            await this.inject(char);
        }
    }

    /** @private */
    _removeTempFile(filePath) {
        try {
            fs.unlinkSync(filePath);
            this._tempFiles = this._tempFiles.filter(f => f !== filePath);
        } catch (e) {
            // Best effort cleanup
        }
    }

    /** @private */
    _cleanup() {
        for (const f of this._tempFiles) {
            try {
                fs.unlinkSync(f);
            } catch (e) {
                // Best effort
            }
        }
        this._tempFiles = [];
    }
}

module.exports = AutoHotkeyBackend;
