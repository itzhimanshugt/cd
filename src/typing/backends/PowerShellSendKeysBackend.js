'use strict';

const BaseBackend = require('./BaseBackend');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Fallback Windows backend using PowerShell [System.Windows.Forms.SendKeys]::SendWait().
 * Simpler but less reliable than the SendInput backend.
 * Uses async execution and Base64-encoded text to prevent command injection.
 */
class PowerShellSendKeysBackend extends BaseBackend {
    /**
     * @param {object} [options]
     * @param {number} [options.startupDelay=50] - Delay before starting to send keys (ms)
     * @param {number} [options.keyPacing=5] - Delay between individual keystrokes (ms)
     */
    constructor(options = {}) {
        super();
        this._startupDelay = options.startupDelay ?? 50;
        this._keyPacing = options.keyPacing ?? 5;
        this._initialized = false;
    }

    getName() {
        return 'PowerShellSendKeys';
    }

    isAvailable() {
        return process.platform === 'win32';
    }

    supportsRealtimeStreaming() {
        return true;
    }

    supportsKeyCombos() {
        return true;
    }

    initialize() {
        this._initialized = true;
    }

    destroy() {
        this._initialized = false;
    }

    /**
     * Injects text using SendKeys. Text is Base64-encoded to prevent injection.
     * SendKeys special characters are escaped after decoding.
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text) return;

        // Encode text as Base64 for safe transmission to PowerShell
        const base64Text = Buffer.from(text, 'utf16le').toString('base64');

        const script = `
Add-Type -AssemblyName System.Windows.Forms
Start-Sleep -Milliseconds ${this._startupDelay}
$bytes = [Convert]::FromBase64String('${base64Text}')
$text = [System.Text.Encoding]::Unicode.GetString($bytes)
foreach ($c in $text.ToCharArray()) {
    $escaped = $c.ToString()
    if ('+^%~(){}[]'.Contains($c)) { $escaped = '{' + $c + '}' }
    [System.Windows.Forms.SendKeys]::SendWait($escaped)
    Start-Sleep -Milliseconds ${this._keyPacing}
}`;

        try {
            await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
                windowsHide: true,
                timeout: 30000,
            });
        } catch (e) {
            // Silently fail if PowerShell is unavailable
        }
    }

    /**
     * Injects a single key code using SendKeys notation.
     * @param {number} keyCode - Virtual key code
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        const char = String.fromCharCode(keyCode);
        if (char) {
            await this.inject(char);
        }
    }
}

module.exports = PowerShellSendKeysBackend;
