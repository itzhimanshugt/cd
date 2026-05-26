'use strict';

const BaseBackend = require('./BaseBackend');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Lighter-weight user32 wrapper that compiles the C# type ONCE and caches it.
 * Uses a flag to skip Add-Type on subsequent calls by checking if the type already exists.
 * Text is Base64-encoded for safe transmission to PowerShell.
 */
class PowerShellAddTypeBackend extends BaseBackend {
    /**
     * @param {object} [options]
     * @param {number} [options.interKeyDelay=10] - Delay between keystrokes in ms
     */
    constructor(options = {}) {
        super();
        this._interKeyDelay = options.interKeyDelay ?? 10;
        this._typeCompiled = false;
        this._initialized = false;
    }

    getName() {
        return 'PowerShellAddType';
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
        this._typeCompiled = false;
    }

    destroy() {
        this._initialized = false;
        this._typeCompiled = false;
    }

    /**
     * Injects text using a cached Add-Type SendInput wrapper.
     * The C# type is compiled once and reused on subsequent calls.
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text) return;

        const base64Text = Buffer.from(text, 'utf16le').toString('base64');

        // Build script that conditionally compiles the type
        const typeDefinition = `
using System;
using System.Runtime.InteropServices;
public class CachedSendInput {
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
    public static void TypeChar(char c) {
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
}`;

        const script = `
if (-not ([System.Management.Automation.PSTypeName]'CachedSendInput').Type) {
    Add-Type -TypeDefinition @"
${typeDefinition}
"@
}
$bytes = [Convert]::FromBase64String('${base64Text}')
$text = [System.Text.Encoding]::Unicode.GetString($bytes)
foreach ($c in $text.ToCharArray()) {
    [CachedSendInput]::TypeChar($c)
    Start-Sleep -Milliseconds ${this._interKeyDelay}
}`;

        try {
            await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
                windowsHide: true,
                timeout: 30000,
            });
            this._typeCompiled = true;
        } catch (e) {
            // PowerShell AddType injection failed
        }
    }

    /**
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

module.exports = PowerShellAddTypeBackend;
