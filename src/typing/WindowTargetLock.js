'use strict';

const { execSync } = require('child_process');

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
     * @returns {boolean} Whether the lock was successfully acquired
     */
    lock() {
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

                const result = execSync(`powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`, {
                    windowsHide: true,
                    timeout: 5000,
                    encoding: 'utf8',
                }).trim();

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
     * @returns {boolean}
     */
    checkFocus() {
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

            const result = execSync(`powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`, {
                windowsHide: true,
                timeout: 3000,
                encoding: 'utf8',
            }).trim();

            return result === this._targetHandle;
        } catch (e) {
            // If we cannot check, assume focused to avoid interrupting typing
            return true;
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
