'use strict';

const { EventEmitter } = require('events');
const ResponseBuffer = require('./ResponseBuffer');
const TypingQueue = require('./TypingQueue');
const HumanizationEngine = require('./HumanizationEngine');
const InjectionScheduler = require('./InjectionScheduler');
const TypingAbortController = require('./AbortController');
const resolveBackend = require('./backends/resolveBackend');
const BackendManager = require('./BackendManager');

const STATES = {
    IDLE: 'idle',
    TYPING: 'typing',
    PAUSED: 'paused',
    ABORTED: 'aborted',
};

/**
 * Top-level typing orchestrator.
 * Composes ResponseBuffer, TypingQueue, InjectionScheduler, HumanizationEngine,
 * AbortController, and the active injection backend into a single manageable interface.
 */
class TypingManager extends EventEmitter {
    /**
     * @param {object} [config]
     * @param {string} [config.backend='Win32SendInput'] - Backend name to use
     * @param {number} [config.speed=80] - Typing speed in WPM
     * @param {string} [config.granularity='character'] - Injection granularity
     * @param {object} [config.backendOptions] - Options passed to the backend constructor
     */
    constructor(config = {}) {
        super();

        this._config = {
            backend: config.backend || 'Win32SendInput',
            speed: config.speed || 80,
            granularity: config.granularity || 'character',
            backendOptions: config.backendOptions || {},
        };

        this._state = STATES.IDLE;
        this._queue = new TypingQueue();
        this._engine = new HumanizationEngine({ baseWPM: this._config.speed });
        this._abortController = new TypingAbortController();
        this._backend = null;
        this._scheduler = null;
        this._lastResponse = null;

        this._backendManager = new BackendManager({ failoverChain: config.failoverChain });
        this._backendManager.initialize();

        this._backendManager.on('failover', data => this.emit('backend-failover', data));

        this._initBackend(this._config.backend);
        this._setupQueueListeners();
    }

    /**
     * Loads a response text for typing.
     * @param {string} text - The response text to type
     */
    loadResponse(text) {
        if (this._state === STATES.TYPING) {
            this.abort();
        }

        const buffer = ResponseBuffer.create(text);
        this._queue.load(buffer);
        this._lastResponse = text;
        this._abortController.reset();
        this._setState(STATES.IDLE);
        this.emit('status-changed', this.getStatus());
    }

    /**
     * Starts typing the loaded response.
     */
    start() {
        if (!this._queue.getBuffer()) {
            throw new Error('No response loaded. Call loadResponse() first.');
        }

        if (this._state === STATES.TYPING) return;

        this._abortController.reset();
        this._createScheduler();
        this._scheduler.start();
        this._setState(STATES.TYPING);
        this.emit('typing-started');
        this.emit('status-changed', this.getStatus());
    }

    /**
     * Pauses typing at the current position.
     */
    pause() {
        if (this._state !== STATES.TYPING) return;

        if (this._scheduler) {
            this._scheduler.pause();
        }
        this._setState(STATES.PAUSED);
        this.emit('typing-paused');
        this.emit('status-changed', this.getStatus());
    }

    /**
     * Resumes typing from the current position.
     */
    resume() {
        if (this._state !== STATES.PAUSED) return;

        if (this._scheduler) {
            this._scheduler.resume();
        }
        this._setState(STATES.TYPING);
        this.emit('typing-resumed');
        this.emit('status-changed', this.getStatus());
    }

    /**
     * Aborts typing entirely.
     */
    abort() {
        if (this._state === STATES.IDLE || this._state === STATES.ABORTED) return;

        this._abortController.abort();
        if (this._scheduler) {
            this._scheduler.stop();
        }
        this._setState(STATES.ABORTED);
        this.emit('typing-aborted');
        this.emit('status-changed', this.getStatus());
    }

    /**
     * Sets the active backend by name.
     * @param {string} name - Backend name (e.g. 'Win32SendInput', 'ClipboardInjection')
     */
    setBackend(name) {
        if (this._state === STATES.TYPING) {
            this.pause();
        }

        this._initBackend(name);
        this._config.backend = name;
        this.emit('status-changed', this.getStatus());
    }

    /**
     * Sets typing speed.
     * @param {number} wpm - Words per minute
     */
    setSpeed(wpm) {
        this._config.speed = wpm;
        this._engine.setSpeed(wpm);
        if (this._scheduler) {
            this._scheduler.setSpeed(wpm);
        }
        this.emit('status-changed', this.getStatus());
    }

    /**
     * Returns current status information.
     * @returns {{state: string, progress: object, backend: string, speed: number, backendHealth: object, failoverChain: string[]}}
     */
    getStatus() {
        return {
            state: this._state,
            progress: this._queue.getProgress(),
            backend: this._backend ? this._backend.getName() : 'none',
            speed: this._config.speed,
            backendHealth: this._backendManager.getHealth(),
            failoverChain: this._backendManager.getFailoverChain(),
        };
    }

    /**
     * Skips to the next sentence boundary.
     */
    skipSentence() {
        if (this._scheduler && this._state === STATES.TYPING) {
            this._scheduler.skipSentence();
            this.emit('progress-changed', this._queue.getProgress());
        }
    }

    /**
     * Returns a list of available backends on this platform.
     * @returns {string[]} Names of available backends
     */
    getAvailableBackends() {
        return this._backendManager.getAvailableBackends();
    }

    /**
     * Gets the last loaded response text.
     * @returns {string|null}
     */
    getLastResponse() {
        return this._lastResponse;
    }

    /**
     * Returns health stats for all backends.
     * @returns {object}
     */
    getBackendHealth() {
        return this._backendManager.getHealth();
    }

    /**
     * Sets the failover chain order.
     * @param {string[]} chain - Ordered list of backend names
     */
    setFailoverChain(chain) {
        this._backendManager.setFailoverChain(chain);
    }

    /**
     * Initializes a backend by name.
     * @private
     * @param {string} name - Backend name
     */
    _initBackend(name) {
        if (this._backend) {
            try {
                this._backend.destroy();
            } catch (e) {
                // Cleanup errors are non-fatal
            }
        }

        // Try to get from BackendManager first
        const managed = this._backendManager.getBackend(name);
        if (managed) {
            this._backend = managed;
            return;
        }

        // Fallback: instantiate directly
        const BackendClass = this._resolveBackendClass(name);
        if (BackendClass) {
            this._backend = new BackendClass(this._config.backendOptions);
            try {
                this._backend.initialize();
            } catch (e) {
                // Initialization errors are non-fatal; backend may still work
            }
        } else {
            this._backend = null;
        }
    }

    /**
     * Resolves a backend class by name.
     * Delegates to the shared resolveBackend module.
     * @private
     * @param {string} name - Backend name
     * @returns {Function|null}
     */
    _resolveBackendClass(name) {
        return resolveBackend(name);
    }

    /**
     * Creates a new InjectionScheduler with current components.
     * @private
     */
    _createScheduler() {
        if (this._scheduler) {
            this._scheduler.removeAllListeners();
        }

        const actualBackend = this._backend || { inject() {} };
        const backendManager = this._backendManager;

        // Wrap backend with failover proxy
        const failoverBackend = {
            inject: async text => {
                try {
                    return await actualBackend.inject(text);
                } catch (e) {
                    // Primary failed, try failover chain
                    const result = await backendManager.tryInject(text);
                    if (!result.success) {
                        throw e;
                    }
                    return result;
                }
            },
        };

        this._scheduler = new InjectionScheduler({
            queue: this._queue,
            engine: this._engine,
            backend: failoverBackend,
            abortController: this._abortController,
            granularity: this._config.granularity,
        });

        this._scheduler.on('complete', () => {
            this._setState(STATES.IDLE);
            this.emit('typing-completed');
            this.emit('status-changed', this.getStatus());
        });

        this._scheduler.on('injected', ({ position }) => {
            this.emit('progress-changed', this._queue.getProgress());
        });
    }

    /**
     * Sets up event listeners on the TypingQueue.
     * @private
     */
    _setupQueueListeners() {
        this._queue.on('progress', progress => {
            this.emit('progress-changed', progress);
        });
    }

    /**
     * Sets internal state.
     * @private
     * @param {string} state
     */
    _setState(state) {
        this._state = state;
    }
}

TypingManager.STATES = STATES;

module.exports = TypingManager;
