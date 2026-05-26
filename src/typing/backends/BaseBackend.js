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
}

module.exports = BaseBackend;
