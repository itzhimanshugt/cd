'use strict';

const BaseBackend = require('./BaseBackend');
const { spawn } = require('child_process');

// C# helper compiled once per PowerShell host.
// INPUTUNION includes MOUSEINPUT so Marshal.SizeOf(INPUT) matches the native
// struct (40 bytes on x64); with only KEYBDINPUT it is 32 and SendInput rejects every call.
// \n and \t are sent as real Enter/Tab keys because Unicode LF/TAB is ignored by most apps.
const HELPER_SOURCE = `
using System;
using System.Threading;
using System.Runtime.InteropServices;
public class SendInputHelper {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT { public int type; public INPUTUNION u; }
    [StructLayout(LayoutKind.Explicit)]
    public struct INPUTUNION {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [DllImport("user32.dll", SetLastError=true)]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    static void Send(ushort vk, ushort scan, uint flags) {
        INPUT[] inputs = new INPUT[2];
        inputs[0].type = 1;
        inputs[0].u.ki.wVk = vk;
        inputs[0].u.ki.wScan = scan;
        inputs[0].u.ki.dwFlags = flags;
        inputs[1].type = 1;
        inputs[1].u.ki.wVk = vk;
        inputs[1].u.ki.wScan = scan;
        inputs[1].u.ki.dwFlags = flags | 0x0002;
        if (SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT))) != 2) {
            throw new Exception("SendInput failed, error " + Marshal.GetLastWin32Error());
        }
    }

    public static void SendKey(ushort vk) { Send(vk, 0, 0); }

    static void Chord(ushort modifier, ushort vk) {
        INPUT[] inputs = new INPUT[4];
        ushort[] vks = { modifier, vk, vk, modifier };
        for (int i = 0; i < 4; i++) {
            inputs[i].type = 1;
            inputs[i].u.ki.wVk = vks[i];
            // Home is an extended key; key-up for the last two
            inputs[i].u.ki.dwFlags = (uint)((vks[i] == 0x24 ? 0x0001 : 0) | (i >= 2 ? 0x0002 : 0));
        }
        if (SendInput(4, inputs, Marshal.SizeOf(typeof(INPUT))) != 4) {
            throw new Exception("SendInput failed, error " + Marshal.GetLastWin32Error());
        }
    }

    // Last character typed; kept across calls because text arrives one chunk at a time.
    static char last = '\\0';

    public static void SendText(string text, int delay) {
        foreach (char c in text) {
            if (c == '\\r') continue;
            if (c == '\\n') {
                // A word just typed may have an autocomplete popup open, which would eat Enter.
                // A trailing space closes it (Escape is avoided: it exits browser fullscreen).
                if (char.IsLetterOrDigit(last) || last == '_') Send(0, (ushort)' ', 0x0004);
                Send(0x0D, 0, 0);
                // Select whatever indentation the editor auto-inserted so the next typed
                // character (our own indentation or code) replaces it instead of stacking on it.
                Chord(0x10, 0x24);
            }
            else if (c == '\\t') Send(0x09, 0, 0);
            else Send(0, (ushort)c, 0x0004);
            last = c;
            if (delay > 0) Thread.Sleep(delay);
        }
    }
}`;

// Reads one command per line from stdin: "T <base64 utf16le text>" or "K <vk>".
// Replies with "OK" or "ERR <message>" on stdout.
const HOST_SCRIPT = `
$ErrorActionPreference = 'Stop'
$src = [System.Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${Buffer.from(HELPER_SOURCE, 'utf16le').toString('base64')}'))
Add-Type -TypeDefinition $src
[Console]::Out.WriteLine('READY')
while ($null -ne ($line = [Console]::In.ReadLine())) {
    try {
        $parts = $line.Split(' ', 3)
        if ($parts[0] -eq 'T') {
            $text = [System.Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($parts[2]))
            [SendInputHelper]::SendText($text, [int]$parts[1])
        } elseif ($parts[0] -eq 'K') {
            [SendInputHelper]::SendKey([uint16]$parts[1])
        }
        [Console]::Out.WriteLine('OK')
    } catch {
        [Console]::Out.WriteLine('ERR ' + ($_.Exception.Message -replace '\\s+', ' '))
    }
}`;

/**
 * Primary Windows backend using user32.dll SendInput via PowerShell P/Invoke.
 * Sends characters as Unicode keystrokes (Enter/Tab as virtual keys).
 * Keeps one PowerShell host alive so the helper is compiled once instead of per keystroke.
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
        this._proc = null;
        this._ready = null;
        this._pending = [];
        this._stdoutBuf = '';
        this._chain = Promise.resolve();
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
        if (this._proc) {
            this._proc.kill();
            this._proc = null;
        }
    }

    /**
     * Injects text using SendInput Unicode keystrokes.
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text) return;
        const base64Text = Buffer.from(text, 'utf16le').toString('base64');
        const delay = Math.max(0, Math.floor(this._interKeyDelay));
        await this._send(`T ${delay} ${base64Text}`, 30000 + text.length * (delay + 5));
    }

    /**
     * Injects a single virtual key code.
     * @param {number} keyCode - Virtual key code
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        if (!Number.isFinite(keyCode) || keyCode < 0 || keyCode > 255) return;
        await this._send(`K ${Math.floor(keyCode)}`, 10000);
    }

    /**
     * Sends one command to the host process; commands run strictly in order.
     * @private
     */
    _send(command, timeoutMs) {
        const run = async () => {
            await this._ensureHost();
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error('Win32SendInput timed out'));
                    this.destroy();
                }, timeoutMs);
                this._pending.push({
                    resolve: () => {
                        clearTimeout(timer);
                        resolve();
                    },
                    reject: err => {
                        clearTimeout(timer);
                        reject(err);
                    },
                });
                this._proc.stdin.write(command + '\n');
            });
        };
        const result = this._chain.then(run, run);
        this._chain = result.catch(() => {});
        return result;
    }

    /**
     * Starts the PowerShell host if it is not running and waits for READY.
     * @private
     */
    _ensureHost() {
        if (this._proc && this._ready) return this._ready;

        const proc = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', HOST_SCRIPT], {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        this._proc = proc;
        this._stdoutBuf = '';
        let stderr = '';

        this._ready = new Promise((resolve, reject) => {
            const fail = err => {
                if (this._proc === proc) {
                    this._proc = null;
                    this._ready = null;
                }
                const pending = this._pending;
                this._pending = [];
                pending.forEach(p => p.reject(err));
                reject(err);
            };

            proc.stdout.setEncoding('utf8');
            proc.stdout.on('data', chunk => {
                this._stdoutBuf += chunk;
                let idx;
                while ((idx = this._stdoutBuf.indexOf('\n')) !== -1) {
                    const line = this._stdoutBuf.slice(0, idx).trim();
                    this._stdoutBuf = this._stdoutBuf.slice(idx + 1);
                    if (line === 'READY') {
                        resolve();
                    } else if (line === 'OK' || line.startsWith('ERR')) {
                        const p = this._pending.shift();
                        if (!p) continue;
                        if (line === 'OK') p.resolve();
                        else p.reject(new Error(line.slice(4) || 'SendInput failed'));
                    }
                }
            });
            proc.stderr.on('data', chunk => {
                stderr += chunk;
            });
            proc.on('error', fail);
            proc.on('exit', code => fail(new Error(`SendInput host exited (${code}) ${stderr.trim()}`.trim())));
        });

        return this._ready;
    }
}

module.exports = Win32SendInputBackend;
