'use strict';

const BaseBackend = require('./BaseBackend');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Lighter-weight user32 wrapper that compiles the C# type conditionally.
 * Uses PSTypeName check to skip Add-Type if the type already exists in the PowerShell session.
 *
 * NOTE: The PSTypeName check provides in-process deduplication only. Since each call to inject()
 * spawns a fresh powershell.exe process, the type is compiled every invocation in practice.
 * The check is retained for correctness if PowerShell session reuse is added in the future
 * (e.g., via a persistent background PowerShell process communicating over stdin/stdout).
 *
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
     * Injects text using a conditionally-compiled Add-Type SendInput wrapper.
     * The C# type is compiled once per PowerShell process via PSTypeName check.
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

        await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
            windowsHide: true,
            timeout: 30000,
        });
        this._typeCompiled = true;
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

module.exports = PowerShellAddTypeBackend;
