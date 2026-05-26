'use strict';

const crypto = require('crypto');

/**
 * Immutable response buffer that stores AI response text snapshots.
 * Prevents race conditions from streaming updates by freezing state at creation time.
 */
const ResponseBuffer = {
    /**
     * Creates a frozen buffer snapshot from the given text.
     * @param {string} text - The response text to store
     * @returns {Readonly<{id: string, text: string, timestamp: number, length: number}>}
     */
    create(text) {
        if (typeof text !== 'string') {
            throw new TypeError('ResponseBuffer.create() requires a string argument');
        }

        const buffer = {
            id: crypto.randomUUID(),
            text,
            timestamp: Date.now(),
            length: text.length,
        };

        return Object.freeze(buffer);
    },

    /**
     * Gets the remaining text from a buffer starting at the given position.
     * @param {object} buffer - A frozen buffer object
     * @param {number} position - Character index to start from
     * @returns {string}
     */
    getRemaining(buffer, position) {
        if (position < 0 || position > buffer.length) {
            throw new RangeError(`Position ${position} is out of bounds [0, ${buffer.length}]`);
        }
        return buffer.text.slice(position);
    },

    /**
     * Gets the character at the given position in the buffer.
     * @param {object} buffer - A frozen buffer object
     * @param {number} position - Character index
     * @returns {string|null} The character or null if at end
     */
    charAt(buffer, position) {
        if (position >= buffer.length) {
            return null;
        }
        return buffer.text[position];
    },
};

module.exports = ResponseBuffer;
