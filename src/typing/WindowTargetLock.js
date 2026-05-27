'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Captures the active foreground window when typing starts.
 * On Windows, uses PowerShell to call user32.dll GetForegroundWindow.
 * On non-Windows platforms, stubs that always return true for checkFocus.
 */
class WindowTargetLock {
    constructor() {
        this._locked = false;
        this._targetHandle = null;
        this._targetInfo = null;
    }

    /**
     * Captures the current foreground window as the typing target.
     * @returns {Promise<boolean>} Whether the lock was successfully acquired
     */
    async lock() {
        if (process.platform === 'win32') {
            try {
                const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FocusHelper {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
}
"@ -ErrorAction SilentlyContinue
$hwnd = [FocusHelper]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 256
[void][FocusHelper]::GetWindowText($hwnd, $sb, 256)
Write-Output "$hwnd|$($sb.ToString())"`;

                const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
                    windowsHide: true,
                    timeout: 5000,
                });

                const result = stdout.trim();
                const parts = result.split('|');
                this._targetHandle = parts[0] || null;
                this._targetInfo = {
                    handle: this._targetHandle,
                    title: parts.slice(1).join('|') || 'Unknown',
                    platform: 'win32',
                    capturedAt: Date.now(),
                };
                this._locked = true;
                return true;
            } catch (e) {
                // PowerShell failed - still mark as locked with null handle
                this._targetHandle = null;
                this._targetInfo = {
                    handle: null,
                    title: 'Unknown',
                    platform: 'win32',
                    capturedAt: Date.now(),
                    error: e.message,
                };
                this._locked = true;
                return true;
            }
        } else {
            // Non-Windows: stub that always succeeds
            this._targetHandle = null;
            this._targetInfo = {
                handle: null,
                title: 'Unknown',
                platform: process.platform,
                capturedAt: Date.now(),
            };
            this._locked = true;
            return true;
        }
    }

    /**
     * Checks whether the lock is currently active.
     * @returns {boolean}
     */
    isLocked() {
        return this._locked;
    }

    /**
     * Checks whether the current foreground window matches the locked target.
     * On non-Windows platforms, always returns true.
     * @returns {Promise<boolean>}
     */
    async checkFocus() {
        if (!this._locked) return false;

        if (process.platform !== 'win32' || !this._targetHandle) {
            // Non-Windows or no handle captured - always report focused
            return true;
        }

        try {
            const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FocusChecker {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
}
"@ -ErrorAction SilentlyContinue
$hwnd = [FocusChecker]::GetForegroundWindow()
Write-Output "$hwnd"`;

            const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
                windowsHide: true,
                timeout: 3000,
            });

            return stdout.trim() === this._targetHandle;
        } catch (e) {
            // If we cannot check, assume focused to avoid interrupting typing
            return true;
        }
    }

    /**
     * Brings the locked target window to the foreground.
     * On non-Windows platforms, this is a no-op success.
     * @returns {Promise<boolean>}
     */
    async activate() {
        if (!this._locked) return false;

        if (process.platform !== 'win32' || !this._targetHandle) {
            return true;
        }

        try {
            const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FocusActivator {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue
$hwnd = [IntPtr]::new(${this._targetHandle})
if ([FocusActivator]::IsIconic($hwnd)) {
    [void][FocusActivator]::ShowWindowAsync($hwnd, 9)
}
[void][FocusActivator]::SetForegroundWindow($hwnd)`;

            await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
                windowsHide: true,
                timeout: 3000,
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Gets information about the locked target window.
     * @returns {object|null}
     */
    getTargetInfo() {
        return this._targetInfo;
    }

    /**
     * Releases the window lock.
     */
    unlock() {
        this._locked = false;
        this._targetHandle = null;
        this._targetInfo = null;
    }
}

module.exports = WindowTargetLock;
