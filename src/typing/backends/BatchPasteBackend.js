'use strict';

const BaseBackend = require('./BaseBackend');

/**
 * Buffered chunk insertion backend.
 * Splits text into chunks based on splitMode and pastes each with a configurable delay.
 * Uses ClipboardInjectionBackend internally for paste operations.
 */
class BatchPasteBackend extends BaseBackend {
    /**
     * @param {object} [options]
     * @param {number} [options.chunkSize=100] - Max characters per chunk (for 'fixed' mode)
     * @param {number} [options.chunkDelay=50] - Delay between chunks in ms
     * @param {string} [options.splitMode='fixed'] - One of: 'fixed', 'sentence', 'paragraph'
     */
    constructor(options = {}) {
        super();
        this._chunkSize = options.chunkSize ?? 100;
        this._chunkDelay = options.chunkDelay ?? 50;
        this._splitMode = options.splitMode ?? 'fixed';
        this._clipboardBackend = null;
        this._initialized = false;
        this._aborted = false;
        this._paused = false;
    }

    getName() {
        return 'BatchPaste';
    }

    isAvailable() {
        const ClipboardInjectionBackend = require('./ClipboardInjectionBackend');
        const cb = new ClipboardInjectionBackend();
        return cb.isAvailable();
    }

    supportsChunking() {
        return true;
    }

    supportsUnicode() {
        return true;
    }

    initialize() {
        const ClipboardInjectionBackend = require('./ClipboardInjectionBackend');
        this._clipboardBackend = new ClipboardInjectionBackend();
        this._clipboardBackend.initialize();
        this._initialized = true;
        this._aborted = false;
    }

    destroy() {
        if (this._clipboardBackend) {
            this._clipboardBackend.destroy();
            this._clipboardBackend = null;
        }
        this._initialized = false;
    }

    pause() {
        this._paused = true;
    }

    resume() {
        this._paused = false;
    }

    abort() {
        this._aborted = true;
        this._paused = false;
    }

    /**
     * Injects text by splitting it into chunks and pasting each with a delay.
     * @param {string} text - Text to inject
     * @returns {Promise<void>}
     */
    async inject(text) {
        if (!text || !this._clipboardBackend) return;

        this._aborted = false;
        const chunks = this._splitText(text);

        for (const chunk of chunks) {
            if (this._aborted) break;

            while (this._paused) {
                if (this._aborted) return;
                await this._sleep(50);
            }

            await this._clipboardBackend.inject(chunk);

            if (this._chunkDelay > 0) {
                await this._sleep(this._chunkDelay);
            }
        }
    }

    /**
     * @param {number} keyCode - Virtual key code
     * @returns {Promise<void>}
     */
    async injectKey(keyCode) {
        if (!this._clipboardBackend) return;
        await this._clipboardBackend.injectKey(keyCode);
    }

    /**
     * Splits text into chunks based on the configured splitMode.
     * @private
     * @param {string} text
     * @returns {string[]}
     */
    _splitText(text) {
        switch (this._splitMode) {
            case 'sentence': {
                const sentences = text.match(/[^.!?]+[.!?]*\s*/g);
                return sentences || [text];
            }
            case 'paragraph': {
                const paragraphs = text.split(/\n\n+/);
                return paragraphs.filter(p => p.length > 0);
            }
            case 'fixed':
            default: {
                const chunks = [];
                for (let i = 0; i < text.length; i += this._chunkSize) {
                    chunks.push(text.slice(i, i + this._chunkSize));
                }
                return chunks;
            }
        }
    }

    /**
     * @private
     * @param {number} ms
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BatchPasteBackend;
