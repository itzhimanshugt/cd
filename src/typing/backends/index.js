'use strict';

const BaseBackend = require('./BaseBackend');
const Win32SendInputBackend = require('./Win32SendInputBackend');
const ClipboardInjectionBackend = require('./ClipboardInjectionBackend');
const PowerShellSendKeysBackend = require('./PowerShellSendKeysBackend');
const RobotJSBackend = require('./RobotJSBackend');
const AutoHotkeyBackend = require('./AutoHotkeyBackend');
const NutJSBackend = require('./NutJSBackend');
const UIAutomationBackend = require('./UIAutomationBackend');
const ElectronWebContentsBackend = require('./ElectronWebContentsBackend');
const VirtualKeyboardBackend = require('./VirtualKeyboardBackend');
const BatchPasteBackend = require('./BatchPasteBackend');
const HybridTypingBackend = require('./HybridTypingBackend');
const PowerShellAddTypeBackend = require('./PowerShellAddTypeBackend');

module.exports = {
    BaseBackend,
    Win32SendInputBackend,
    ClipboardInjectionBackend,
    PowerShellSendKeysBackend,
    RobotJSBackend,
    AutoHotkeyBackend,
    NutJSBackend,
    UIAutomationBackend,
    ElectronWebContentsBackend,
    VirtualKeyboardBackend,
    BatchPasteBackend,
    HybridTypingBackend,
    PowerShellAddTypeBackend,
};
