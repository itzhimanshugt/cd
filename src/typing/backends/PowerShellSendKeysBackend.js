'use strict';

const BaseBackend = require('./BaseBackend');
const { execSync } = require('child_process');

/**
 * Fallback Windows backend using PowerShell [System.Windows.Forms.SendKeys]::SendWait().
 * Simpler but less reliable than the SendInput backend.
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

    initialize() {
        this._initialized = true;
    }

    destroy() {
        this._initialized = false;
    }

    /**
     * Injects text using SendKeys. Escapes special SendKeys characters.
     * @param {string} text - Text to inject
     */
    inject(text) {
        if (!text) return;

        // Escape SendKeys special characters: +^%~(){}[]
        const escaped = this._escapeSendKeys(text);

        const script = `
Add-Type -AssemblyName System.Windows.Forms
Start-Sleep -Milliseconds ${this._startupDelay}
$text = '${escaped.replace(/'/g, "''")}'
foreach ($c in $text.ToCharArray()) {
    [System.Windows.Forms.SendKeys]::SendWait([string]$c)
    Start-Sleep -Milliseconds ${this._keyPacing}
}`;

        try {
            execSync(`powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`, {
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
     */
    injectKey(keyCode) {
        const char = String.fromCharCode(keyCode);
        if (char) {
            this.inject(char);
        }
    }

    /**
     * Escapes characters that have special meaning in SendKeys.
     * @private
     * @param {string} text - Raw text
     * @returns {string} Escaped text safe for SendKeys
     */
    _escapeSendKeys(text) {
        // SendKeys special chars: + ^ % ~ ( ) { } [ ]
        // They need to be wrapped in braces: {+} {^} {%} {~} {(} {)} {{} {}} {[} {]}
        return text.replace(/([+^%~(){}[\]])/g, '{$1}');
    }
}

module.exports = PowerShellSendKeysBackend;
