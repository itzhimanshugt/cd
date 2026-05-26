'use strict';

const BaseBackend = require('./BaseBackend');
const { execSync } = require('child_process');

/**
 * Primary Windows backend using user32.dll SendInput via PowerShell P/Invoke.
 * Sends individual characters as Unicode scan-code keystrokes.
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

    initialize() {
        this._initialized = true;
    }

    destroy() {
        this._initialized = false;
    }

    /**
     * Injects text one character at a time using SendInput Unicode keystrokes.
     * @param {string} text - Text to inject
     */
    inject(text) {
        if (!text) return;

        const escaped = text.replace(/'/g, "''").replace(/`/g, '``');

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
$text = '${escaped}'
foreach ($c in $text.ToCharArray()) {
    [SendInputHelper]::SendChar($c)
    Start-Sleep -Milliseconds ${this._interKeyDelay}
}`;

        try {
            execSync(`powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`, {
                windowsHide: true,
                timeout: 30000,
            });
        } catch (e) {
            // Silently fail if PowerShell is not available or script errors
        }
    }

    /**
     * Injects a single virtual key code.
     * @param {number} keyCode - Virtual key code
     */
    injectKey(keyCode) {
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

        try {
            execSync(`powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`, {
                windowsHide: true,
                timeout: 10000,
            });
        } catch (e) {
            // Silently fail
        }
    }
}

module.exports = Win32SendInputBackend;
