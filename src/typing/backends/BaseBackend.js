'use strict';

/**
 * Abstract base class defining the injection backend interface.
 * All backends must extend this class and override its methods.
 */
class BaseBackend {
    /**
     * Injects text into the active window.
     * @param {string} text - Text to type
     */
    inject(text) {
        throw new Error('Not implemented');
    }

    /**
     * Injects a single key event by keyCode.
     * @param {number} keyCode - Virtual key code to send
     */
    injectKey(keyCode) {
        throw new Error('Not implemented');
    }

    /**
     * Returns the human-readable name of this backend.
     * @returns {string}
     */
    getName() {
        throw new Error('Not implemented');
    }

    /**
     * Checks whether this backend is available on the current platform.
     * @returns {boolean}
     */
    isAvailable() {
        throw new Error('Not implemented');
    }

    /**
     * Initializes the backend (acquire resources, warm up processes, etc.).
     */
    initialize() {
        throw new Error('Not implemented');
    }

    /**
     * Destroys the backend and releases any held resources.
     */
    destroy() {
        throw new Error('Not implemented');
    }

    // --- Capability reporting (defaults; override in subclasses) ---

    /**
     * Whether this backend supports realtime character-by-character streaming.
     * @returns {boolean}
     */
    supportsRealtimeStreaming() {
        return false;
    }

    /**
     * Whether this backend supports sending key combinations (e.g. Ctrl+C).
     * @returns {boolean}
     */
    supportsKeyCombos() {
        return false;
    }

    /**
     * Whether this backend supports full Unicode text injection.
     * @returns {boolean}
     */
    supportsUnicode() {
        return false;
    }

    /**
     * Whether this backend supports chunked text injection.
     * @returns {boolean}
     */
    supportsChunking() {
        return false;
    }

    // --- Lifecycle (no-op defaults) ---

    /**
     * Pauses the current injection operation.
     */
    pause() {}

    /**
     * Resumes a paused injection operation.
     */
    resume() {}

    /**
     * Aborts the current injection operation.
     */
    abort() {}

    /**
     * Cleans up resources. Default calls destroy().
     */
    cleanup() {
        this.destroy();
    }

    // --- Unified naming alias ---

    /**
     * Unified alias for inject(). Subclasses should override inject().
     * @param {string} text - Text to type
     * @returns {*}
     */
    typeText(text) {
        return this.inject(text);
    }
}

module.exports = BaseBackend;
