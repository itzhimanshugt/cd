'use strict';

const { EventEmitter } = require('events');

const STATES = {
    IDLE: 'idle',
    TYPING: 'typing',
    PAUSED: 'paused',
    ABORTED: 'aborted',
};

/**
 * State machine managing typing position within a ResponseBuffer.
 * States: idle -> typing -> paused/aborted
 * Emits events: stateChange, progress, complete, error
 */
class TypingQueue extends EventEmitter {
    constructor() {
        super();
        this._state = STATES.IDLE;
        this._buffer = null;
        this._currentPosition = 0;
    }

    /**
     * Loads a frozen buffer for typing.
     * @param {object} buffer - A frozen ResponseBuffer object
     */
    load(buffer) {
        if (!buffer || typeof buffer.text !== 'string' || !Object.isFrozen(buffer)) {
            throw new TypeError('TypingQueue.load() requires a frozen ResponseBuffer');
        }

        this._buffer = buffer;
        this._currentPosition = 0;
        this._setState(STATES.IDLE);
    }

    /**
     * Advances the position by count characters.
     * @param {number} count - Number of characters to advance
     */
    advance(count) {
        if (this._state !== STATES.TYPING) {
            return;
        }

        if (!this._buffer) {
            throw new Error('No buffer loaded');
        }

        this._currentPosition = Math.min(this._currentPosition + count, this._buffer.length);
        this.emit('progress', this.getProgress());

        if (this._currentPosition >= this._buffer.length) {
            this._setState(STATES.IDLE);
            this.emit('complete');
        }
    }

    /**
     * Transitions to typing state.
     */
    start() {
        if (this._state === STATES.ABORTED) {
            return;
        }
        if (!this._buffer) {
            throw new Error('No buffer loaded');
        }
        this._setState(STATES.TYPING);
    }

    /**
     * Pauses typing at current position (preserves position).
     */
    pause() {
        if (this._state === STATES.TYPING) {
            this._setState(STATES.PAUSED);
        }
    }

    /**
     * Resumes typing from current position.
     */
    resume() {
        if (this._state === STATES.PAUSED) {
            this._setState(STATES.TYPING);
        }
    }

    /**
     * Aborts typing entirely.
     */
    abort() {
        this._setState(STATES.ABORTED);
    }

    /**
     * Resets queue to idle state with position 0.
     */
    reset() {
        this._currentPosition = 0;
        this._buffer = null;
        this._setState(STATES.IDLE);
    }

    /**
     * Gets the current state.
     * @returns {string}
     */
    getState() {
        return this._state;
    }

    /**
     * Gets current position in the buffer.
     * @returns {number}
     */
    getPosition() {
        return this._currentPosition;
    }

    /**
     * Gets progress information.
     * @returns {{position: number, total: number, percentage: number}}
     */
    getProgress() {
        const total = this._buffer ? this._buffer.length : 0;
        return {
            position: this._currentPosition,
            total,
            percentage: total > 0 ? (this._currentPosition / total) * 100 : 0,
        };
    }

    /**
     * Gets the loaded buffer.
     * @returns {object|null}
     */
    getBuffer() {
        return this._buffer;
    }

    /**
     * @private
     */
    _setState(newState) {
        const oldState = this._state;
        this._state = newState;
        if (oldState !== newState) {
            this.emit('stateChange', { from: oldState, to: newState });
        }
    }
}

TypingQueue.STATES = STATES;

module.exports = TypingQueue;
