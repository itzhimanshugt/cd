// Single source of truth for keybinds. Imported by main process modules
// (CommonJS via require) and by the renderer (which exposes it on
// `window.cheatingDaddy.defaultKeybinds` so Lit components can read it
// without their own platform-detection branches).

function isMac(platform) {
    if (platform === 'darwin') return true;
    if (typeof platform === 'string') return platform.toLowerCase().includes('mac');
    return false;
}

function getDefaultKeybinds(platform = (typeof process !== 'undefined' && process.platform) || '') {
    const mac = isMac(platform);
    return {
        moveUp: mac ? 'Alt+Up' : 'Ctrl+Up',
        moveDown: mac ? 'Alt+Down' : 'Ctrl+Down',
        moveLeft: mac ? 'Alt+Left' : 'Ctrl+Left',
        moveRight: mac ? 'Alt+Right' : 'Ctrl+Right',
        toggleVisibility: mac ? 'Cmd+\\' : 'Ctrl+\\',
        toggleClickThrough: mac ? 'Cmd+M' : 'Ctrl+M',
        nextStep: mac ? 'Cmd+Enter' : 'Ctrl+Enter',
        previousResponse: mac ? 'Cmd+[' : 'Ctrl+[',
        nextResponse: mac ? 'Cmd+]' : 'Ctrl+]',
        scrollUp: mac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
        scrollDown: mac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        emergencyErase: mac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E',
    };
}

const KEYBIND_ACTIONS = [
    { key: 'moveUp', name: 'Move Window Up', description: 'Move the app window up' },
    { key: 'moveDown', name: 'Move Window Down', description: 'Move the app window down' },
    { key: 'moveLeft', name: 'Move Window Left', description: 'Move the app window left' },
    { key: 'moveRight', name: 'Move Window Right', description: 'Move the app window right' },
    { key: 'toggleVisibility', name: 'Toggle Visibility', description: 'Show or hide the app window' },
    { key: 'toggleClickThrough', name: 'Toggle Click-through', description: 'Enable or disable click-through mode' },
    { key: 'nextStep', name: 'Ask Next Step', description: 'Take screenshot and ask for next step' },
    { key: 'previousResponse', name: 'Previous Response', description: 'Move to previous AI response' },
    { key: 'nextResponse', name: 'Next Response', description: 'Move to next AI response' },
    { key: 'scrollUp', name: 'Scroll Response Up', description: 'Scroll response content upward' },
    { key: 'scrollDown', name: 'Scroll Response Down', description: 'Scroll response content downward' },
];

module.exports = {
    getDefaultKeybinds,
    KEYBIND_ACTIONS,
    isMac,
};
