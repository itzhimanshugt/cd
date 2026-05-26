'use strict';

const BaseBackend = require('./BaseBackend');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Windows UI Automation backend using PowerShell with Add-Type to invoke
 * UIAutomation ValuePattern.SetValue on the focused element.
 * Text is Base64-encoded for safe transmission.
 */
class UIAutomationBackend extends BaseBackend {
    constructor() {
        super();
        this._initialized = false;
    }

    getName() {
        return 'UIAutomation';
    }

    isAvailable() {
        return process.platform === 'win32';
    }

    supportsUnicode() {
        return true;
    }

    initialize() {
        this._initialized = true;
    }

    destroy() {
        this._initialized = false;
    }

    /**
     * Injects text using UIAutomation ValuePattern.SetValue on the focused element.
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text) return;

        const base64Text = Buffer.from(text, 'utf16le').toString('base64');

        const script = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$bytes = [Convert]::FromBase64String('${base64Text}')
$text = [System.Text.Encoding]::Unicode.GetString($bytes)

$auto = [System.Windows.Automation.AutomationElement]
$focused = $auto::FocusedElement
if ($focused -ne $null) {
    $valuePattern = $null
    try {
        $valuePattern = $focused.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    } catch {}
    if ($valuePattern -ne $null) {
        $valuePattern.SetValue($text)
    } else {
        # Fallback: try InsertionTextPattern or SendKeys
        Add-Type -AssemblyName System.Windows.Forms
        foreach ($c in $text.ToCharArray()) {
            $escaped = $c.ToString()
            if ('+^%~(){}[]'.Contains($c)) { $escaped = '{' + $c + '}' }
            [System.Windows.Forms.SendKeys]::SendWait($escaped)
            Start-Sleep -Milliseconds 5
        }
    }
}`;

        await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
            windowsHide: true,
            timeout: 30000,
        });
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
}

module.exports = UIAutomationBackend;
