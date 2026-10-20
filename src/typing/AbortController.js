'use strict';

/**
 * Simple abort signal mechanism with callback registration.
 * Used by the InjectionScheduler to immediately halt injection.
 */
class AbortController {
    constructor() {
        this._aborted = false;
        this._callbacks = [];
    }

    /**
     * Triggers the abort signal and invokes all registered callbacks.
     */
    abort() {
        if (this._aborted) return;
        this._aborted = true;

        for (const cb of this._callbacks) {
            try {
                cb();
            } catch (e) {
                // Swallow callback errors to ensure all callbacks run
            }
        }
    }

    /**
     * Checks whether abort has been signalled.
     * @returns {boolean}
     */
    isAborted() {
        return this._aborted;
    }

    /**
     * Resets the abort state so the controller can be reused.
     */
    reset() {
        this._aborted = false;
        this._callbacks = [];
    }

    /**
     * Registers a callback to be invoked when abort is triggered.
     * If already aborted, the callback is invoked immediately.
     * @param {Function} callback
     */
    onAbort(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('onAbort() requires a function callback');
        }

        if (this._aborted) {
            callback();
            return;
        }

        this._callbacks.push(callback);
    }
}

module.exports = AbortController;
