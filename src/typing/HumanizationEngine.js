'use strict';

const DEFAULT_CONFIG = {
    baseWPM: 80,
    burstSize: 5,
    punctuationDelay: 150,
    sentenceDelay: 300,
    jitterRange: 0.3,
    startupDelay: 500,
};

const PUNCTUATION_CHARS = new Set([',', ';', ':', '-']);
const SENTENCE_END_CHARS = new Set(['.', '!', '?']);

/**
 * Computes inter-keystroke delays to simulate natural human typing.
 * Uses WPM-based timing with punctuation pauses, burst patterns, and jitter.
 */
class HumanizationEngine {
    /**
     * @param {object} [config] - Configuration overrides
     */
    constructor(config = {}) {
        this._config = { ...DEFAULT_CONFIG, ...config };
        this._burstCounter = 0;
        this._isStartup = true;
    }

    /**
     * Computes the delay before typing the next character.
     * @param {string} char - The character about to be typed
     * @param {object} context - Context info (prevChar, position, total)
     * @returns {number} Delay in milliseconds
     */
    getNextDelay(char, context = {}) {
        // Startup delay for the very first character
        if (this._isStartup) {
            this._isStartup = false;
            return this._config.startupDelay;
        }

        const baseDelay = this._getBaseDelay();
        let delay = baseDelay;

        // Punctuation pauses
        const prevChar = context.prevChar || '';
        if (SENTENCE_END_CHARS.has(prevChar)) {
            delay += this._config.sentenceDelay;
        } else if (PUNCTUATION_CHARS.has(prevChar)) {
            delay += this._config.punctuationDelay;
        }

        // Burst pattern - type faster in bursts then pause
        this._burstCounter++;
        if (this._burstCounter >= this._config.burstSize) {
            this._burstCounter = 0;
            delay += baseDelay * 0.5;
        }

        // Apply jitter
        delay = this._applyJitter(delay);

        return Math.max(1, Math.round(delay));
    }

    /**
     * Sets the typing speed.
     * @param {number} wpm - Words per minute
     */
    setSpeed(wpm) {
        if (wpm <= 0) {
            throw new RangeError('WPM must be positive');
        }
        this._config.baseWPM = wpm;
    }

    /**
     * Gets current configuration.
     * @returns {object}
     */
    getConfig() {
        return { ...this._config };
    }

    /**
     * Updates configuration with a partial patch.
     * @param {object} patch - Partial config to merge
     */
    updateConfig(patch) {
        Object.assign(this._config, patch);
    }

    /**
     * Resets internal state (burst counter, startup flag).
     */
    reset() {
        this._burstCounter = 0;
        this._isStartup = true;
    }

    /**
     * Computes base delay from WPM.
     * Average word is 5 chars, so chars per minute = WPM * 5.
     * @private
     * @returns {number} Base delay in ms per character
     */
    _getBaseDelay() {
        const charsPerMinute = this._config.baseWPM * 5;
        return 60000 / charsPerMinute;
    }

    /**
     * Applies random jitter to a delay value.
     * @private
     * @param {number} delay - Base delay
     * @returns {number} Jittered delay
     */
    _applyJitter(delay) {
        const range = this._config.jitterRange;
        const factor = 1 + (Math.random() * 2 - 1) * range;
        return delay * factor;
    }
}

module.exports = HumanizationEngine;
