'use strict';

const BaseBackend = require('./BaseBackend');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Primary Windows backend using user32.dll SendInput via PowerShell P/Invoke.
 * Sends characters as Unicode scan-code keystrokes.
 * Uses async execution to avoid blocking the Electron main thread.
 * Text is passed via Base64 encoding to prevent command injection.
 */
class Win32SendInputBackend extends BaseBackend {
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
        return 'Win32SendInput';
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
     * Injects text using SendInput Unicode keystrokes.
     * Text is passed via Base64-encoded command to avoid command injection.
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text) return;

        // Encode text as Base64 for safe transmission to PowerShell
        const base64Text = Buffer.from(text, 'utf16le').toString('base64');

        const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class SendInputHelper {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public int type;
        public INPUTUNION u;
    }
    [StructLayout(LayoutKind.Explicit)]
    public struct INPUTUNION {
        [FieldOffset(0)] public KEYBDINPUT ki;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }
    [DllImport("user32.dll", SetLastError=true)]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
    public static void SendChar(char c) {
        INPUT[] inputs = new INPUT[2];
        inputs[0].type = 1;
        inputs[0].u.ki.wVk = 0;
        inputs[0].u.ki.wScan = (ushort)c;
        inputs[0].u.ki.dwFlags = 0x0004;
        inputs[1].type = 1;
        inputs[1].u.ki.wVk = 0;
        inputs[1].u.ki.wScan = (ushort)c;
        inputs[1].u.ki.dwFlags = 0x0004 | 0x0002;
        SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@ -ErrorAction SilentlyContinue
$bytes = [Convert]::FromBase64String('${base64Text}')
$text = [System.Text.Encoding]::Unicode.GetString($bytes)
foreach ($c in $text.ToCharArray()) {
    [SendInputHelper]::SendChar($c)
    Start-Sleep -Milliseconds ${this._interKeyDelay}
}`;

        await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
            windowsHide: true,
            timeout: 30000,
        });
    }

    /**
     * Injects a single virtual key code.
     * @param {number} keyCode - Virtual key code
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        if (!Number.isFinite(keyCode) || keyCode < 0 || keyCode > 255) return;

        const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class KeyHelper {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public int type;
        public INPUTUNION u;
    }
    [StructLayout(LayoutKind.Explicit)]
    public struct INPUTUNION {
        [FieldOffset(0)] public KEYBDINPUT ki;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }
    [DllImport("user32.dll", SetLastError=true)]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
    public static void SendKey(ushort vk) {
        INPUT[] inputs = new INPUT[2];
        inputs[0].type = 1;
        inputs[0].u.ki.wVk = vk;
        inputs[0].u.ki.dwFlags = 0;
        inputs[1].type = 1;
        inputs[1].u.ki.wVk = vk;
        inputs[1].u.ki.dwFlags = 0x0002;
        SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@ -ErrorAction SilentlyContinue
[KeyHelper]::SendKey(${keyCode})`;

        await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
            windowsHide: true,
            timeout: 10000,
        });
    }
}

module.exports = Win32SendInputBackend;
