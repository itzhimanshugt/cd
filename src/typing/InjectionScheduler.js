'use strict';

const { EventEmitter } = require('events');

const GRANULARITY = {
    CHARACTER: 'character',
    WORD: 'word',
    SENTENCE: 'sentence',
    PARAGRAPH: 'paragraph',
};

const SENTENCE_ENDINGS = /[.!?]/;
const PARAGRAPH_ENDING = /\n\n/;

/**
 * Orchestrates the typing injection loop.
 * Pulls text from a TypingQueue, computes delay via HumanizationEngine,
 * and calls backend.inject() with the appropriate text chunk.
 */
class InjectionScheduler extends EventEmitter {
    /**
     * @param {object} options
     * @param {object} options.queue - TypingQueue instance
     * @param {object} options.engine - HumanizationEngine instance
     * @param {object} options.backend - Backend with inject(text) method
     * @param {object} [options.abortController] - AbortController instance
     * @param {string} [options.granularity] - Injection granularity mode
     */
    constructor({ queue, engine, backend, abortController = null, granularity = GRANULARITY.CHARACTER }) {
        super();
        this._queue = queue;
        this._engine = engine;
        this._backend = backend;
        this._abortController = abortController;
        this._granularity = granularity;
        this._timerId = null;
        this._running = false;
    }

    /**
     * Starts the injection loop.
     */
    start() {
        if (this._running) return;
        this._running = true;
        this._queue.start();
        this._engine.reset();
        this._scheduleNext();
    }

    /**
     * Stops the injection loop entirely.
     */
    stop() {
        this._running = false;
        this._clearTimer();
        this._queue.abort();
        this.emit('stopped');
    }

    /**
     * Pauses the injection loop (preserves position).
     */
    pause() {
        this._running = false;
        this._clearTimer();
        this._queue.pause();
        this.emit('paused');
    }

    /**
     * Resumes the injection loop from current position.
     */
    resume() {
        if (this._running) return;
        this._running = true;
        this._queue.resume();
        this._scheduleNext();
        this.emit('resumed');
    }

    /**
     * Skips to the next sentence boundary.
     */
    skipSentence() {
        const buffer = this._queue.getBuffer();
        if (!buffer) return;

        const pos = this._queue.getPosition();
        const remaining = buffer.text.slice(pos);
        const match = remaining.match(SENTENCE_ENDINGS);

        if (match) {
            const skipCount = match.index + 1;
            // Inject the skipped text all at once (fire-and-forget for skip)
            const skippedText = remaining.slice(0, skipCount);
            Promise.resolve(this._backend.inject(skippedText)).catch(() => {});
            this._queue.advance(skipCount);
        }
    }

    /**
     * Sets typing speed.
     * @param {number} wpm - Words per minute
     */
    setSpeed(wpm) {
        this._engine.setSpeed(wpm);
    }

    /**
     * Sets injection granularity.
     * @param {string} granularity - One of: character, word, sentence, paragraph
     */
    setGranularity(granularity) {
        this._granularity = granularity;
    }

    /**
     * @private
     */
    _scheduleNext() {
        if (!this._running) return;

        if (this._abortController && this._abortController.isAborted()) {
            this.stop();
            return;
        }

        const buffer = this._queue.getBuffer();
        if (!buffer) return;

        const pos = this._queue.getPosition();
        if (pos >= buffer.length) {
            this._running = false;
            this.emit('complete');
            return;
        }

        const chunk = this._getNextChunk(buffer, pos);
        const char = chunk[0] || '';
        const context = {
            prevChar: pos > 0 ? buffer.text[pos - 1] : '',
            position: pos,
            total: buffer.length,
        };

        const delay = this._engine.getNextDelay(char, context);

        this._timerId = setTimeout(async () => {
            if (!this._running) return;

            try {
                await this._backend.inject(chunk);
            } catch (e) {
                // Backend injection errors are non-fatal
            }
            this._queue.advance(chunk.length);
            this.emit('injected', { text: chunk, position: this._queue.getPosition() });
            this._scheduleNext();
        }, delay);
    }

    /**
     * Gets the next chunk to inject based on granularity.
     * @private
     * @param {object} buffer - The response buffer
     * @param {number} pos - Current position
     * @returns {string}
     */
    _getNextChunk(buffer, pos) {
        const remaining = buffer.text.slice(pos);

        switch (this._granularity) {
            case GRANULARITY.CHARACTER:
                return remaining[0] || '';

            case GRANULARITY.WORD: {
                const wordMatch = remaining.match(/^\S+\s?/);
                return wordMatch ? wordMatch[0] : remaining[0] || '';
            }

            case GRANULARITY.SENTENCE: {
                const sentenceMatch = remaining.match(/^[^.!?]*[.!?]\s?/);
                return sentenceMatch ? sentenceMatch[0] : remaining;
            }

            case GRANULARITY.PARAGRAPH: {
                const paraMatch = remaining.match(/^[^\n]*\n\n?/);
                return paraMatch ? paraMatch[0] : remaining;
            }

            default:
                return remaining[0] || '';
        }
    }

    /**
     * @private
     */
    _clearTimer() {
        if (this._timerId !== null) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
    }
}

InjectionScheduler.GRANULARITY = GRANULARITY;

module.exports = InjectionScheduler;
