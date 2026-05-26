'use strict';

const BaseBackend = require('./BaseBackend');
const Win32SendInputBackend = require('./Win32SendInputBackend');
const ClipboardInjectionBackend = require('./ClipboardInjectionBackend');
const PowerShellSendKeysBackend = require('./PowerShellSendKeysBackend');
const RobotJSBackend = require('./RobotJSBackend');

module.exports = {
    BaseBackend,
    Win32SendInputBackend,
    ClipboardInjectionBackend,
    PowerShellSendKeysBackend,
    RobotJSBackend,
};
