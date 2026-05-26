/**
 * Placeholder for future Rust/C++ native addons that will provide low-latency
 * input injection and window management. The typing BackendManager can check
 * NativeHelper.isAvailable() to prefer native over PowerShell.
 */

class NativeHelper {
    /**
     * Check if native module is compiled and available.
     * @returns {boolean} Always false until native addon is compiled.
     */
    static isAvailable() {
        return false;
    }

    /**
     * Send text input via native addon.
     * @param {string} text - Text to inject.
     * @throws {Error} Always throws until native addon is compiled.
     */
    static sendInput(text) {
        throw new Error('Native module not available - compile Rust/C++ addon for native input');
    }

    /**
     * Capture the current screen via native addon.
     * @throws {Error} Always throws until native addon is compiled.
     */
    static captureScreen() {
        throw new Error('Native module not available - compile Rust/C++ addon for native input');
    }

    /**
     * Get the currently active window info via native addon.
     * @throws {Error} Always throws until native addon is compiled.
     */
    static getActiveWindow() {
        throw new Error('Native module not available - compile Rust/C++ addon for native input');
    }
}

module.exports = { NativeHelper };
