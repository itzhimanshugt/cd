'use strict';

const BaseBackend = require('./BaseBackend');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Windows backend using PowerShell P/Invoke of user32 keybd_event.
 * Alternative to SendInput - simpler API that works in some edge cases.
 * Text is Base64-encoded for safe transmission.
 */
class VirtualKeyboardBackend extends BaseBackend {
    /**
     * @param {object} [options]
     * @param {number} [options.interKeyDelay=10] - Delay between keystrokes in ms
     */
    constructor(options = {}) {
        super();
        this._interKeyDelay = options.interKeyDelay ?? 10;
        this._initialized = false;
    }

    getName() {
        return 'VirtualKeyboard';
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
     * Injects text using keybd_event with Unicode scan codes.
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text) return;

        const base64Text = Buffer.from(text, 'utf16le').toString('base64');

        const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class VKHelper {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public const uint KEYEVENTF_UNICODE = 0x0004;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public static void SendUnicodeChar(char c) {
        ushort scan = (ushort)c;
        keybd_event(0, (byte)(scan & 0xFF), KEYEVENTF_UNICODE, UIntPtr.Zero);
        keybd_event(0, (byte)(scan & 0xFF), KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, UIntPtr.Zero);
    }
}
"@ -ErrorAction SilentlyContinue
$bytes = [Convert]::FromBase64String('${base64Text}')
$text = [System.Text.Encoding]::Unicode.GetString($bytes)
foreach ($c in $text.ToCharArray()) {
    [VKHelper]::SendUnicodeChar($c)
    Start-Sleep -Milliseconds ${this._interKeyDelay}
}`;

        try {
            await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
                windowsHide: true,
                timeout: 30000,
            });
        } catch (e) {
            // VirtualKeyboard injection failed
        }
    }

    /**
     * @param {number} keyCode - Virtual key code
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class VKKeyHelper {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public const uint KEYEVENTF_KEYUP = 0x0002;
}
"@ -ErrorAction SilentlyContinue
[VKKeyHelper]::keybd_event(${keyCode}, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 10
[VKKeyHelper]::keybd_event(${keyCode}, 0, [VKKeyHelper]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)`;

        try {
            await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
                windowsHide: true,
                timeout: 10000,
            });
        } catch (e) {
            // Best effort
        }
    }
}

module.exports = VirtualKeyboardBackend;
