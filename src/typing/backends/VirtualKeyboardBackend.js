'use strict';

const BaseBackend = require('./BaseBackend');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Windows backend using PowerShell P/Invoke for keyboard input.
 * Uses SendInput with KEYEVENTF_UNICODE for text injection (full Unicode support)
 * and keybd_event for single virtual key codes (which are byte-range VK codes).
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
     * Injects text using SendInput with KEYEVENTF_UNICODE for full Unicode support.
     * This avoids the byte truncation issue of keybd_event for characters above U+00FF.
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
public class VKSendInputHelper {
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
    public const uint KEYEVENTF_UNICODE = 0x0004;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public static void SendUnicodeChar(char c) {
        INPUT[] inputs = new INPUT[2];
        inputs[0].type = 1;
        inputs[0].u.ki.wVk = 0;
        inputs[0].u.ki.wScan = (ushort)c;
        inputs[0].u.ki.dwFlags = KEYEVENTF_UNICODE;
        inputs[1].type = 1;
        inputs[1].u.ki.wVk = 0;
        inputs[1].u.ki.wScan = (ushort)c;
        inputs[1].u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
        SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@ -ErrorAction SilentlyContinue
$bytes = [Convert]::FromBase64String('${base64Text}')
$text = [System.Text.Encoding]::Unicode.GetString($bytes)
foreach ($c in $text.ToCharArray()) {
    [VKSendInputHelper]::SendUnicodeChar($c)
    Start-Sleep -Milliseconds ${this._interKeyDelay}
}`;

        await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
            windowsHide: true,
            timeout: 30000,
        });
    }

    /**
     * Sends a single virtual key code using keybd_event.
     * Only used for VK codes (byte range 0-255), not for Unicode text.
     * Validates keyCode is a finite integer in valid range before interpolation.
     * @param {number} keyCode - Virtual key code (0-255)
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        if (!Number.isFinite(keyCode) || keyCode < 0 || keyCode > 255) return;

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

        await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
            windowsHide: true,
            timeout: 10000,
        });
    }
}

module.exports = VirtualKeyboardBackend;
