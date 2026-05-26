'use strict';

const backends = require('./index');

/**
 * Shared name-to-class resolution map for all injection backends.
 * Used by both BackendManager and TypingManager to avoid duplicate mappings.
 *
 * Supports PascalCase names, kebab-case names, and common aliases.
 *
 * @param {string} name - Backend name (PascalCase, kebab-case, or alias)
 * @returns {Function|null} The backend class constructor, or null if not found
 */
function resolveBackend(name) {
    const map = {
        Win32SendInput: backends.Win32SendInputBackend,
        'win32-sendinput': backends.Win32SendInputBackend,
        ClipboardInjection: backends.ClipboardInjectionBackend,
        clipboard: backends.ClipboardInjectionBackend,
        PowerShellSendKeys: backends.PowerShellSendKeysBackend,
        powershell: backends.PowerShellSendKeysBackend,
        RobotJS: backends.RobotJSBackend,
        robotjs: backends.RobotJSBackend,
        AutoHotkey: backends.AutoHotkeyBackend,
        autohotkey: backends.AutoHotkeyBackend,
        ahk: backends.AutoHotkeyBackend,
        NutJS: backends.NutJSBackend,
        nutjs: backends.NutJSBackend,
        nut: backends.NutJSBackend,
        UIAutomation: backends.UIAutomationBackend,
        'ui-automation': backends.UIAutomationBackend,
        uiautomation: backends.UIAutomationBackend,
        ElectronWebContents: backends.ElectronWebContentsBackend,
        'electron-webcontents': backends.ElectronWebContentsBackend,
        electron: backends.ElectronWebContentsBackend,
        VirtualKeyboard: backends.VirtualKeyboardBackend,
        'virtual-keyboard': backends.VirtualKeyboardBackend,
        vk: backends.VirtualKeyboardBackend,
        'keybd-event': backends.VirtualKeyboardBackend,
        BatchPaste: backends.BatchPasteBackend,
        'batch-paste': backends.BatchPasteBackend,
        batch: backends.BatchPasteBackend,
        HybridTyping: backends.HybridTypingBackend,
        'hybrid-typing': backends.HybridTypingBackend,
        hybrid: backends.HybridTypingBackend,
        PowerShellAddType: backends.PowerShellAddTypeBackend,
        'powershell-addtype': backends.PowerShellAddTypeBackend,
        'ps-addtype': backends.PowerShellAddTypeBackend,
    };
    return map[name] || null;
}

module.exports = resolveBackend;
