/**
 * Lightweight reactive store - base class.
 * Pure ES module, no external dependencies.
 */
export class Store {
    #state;
    #subscribers = new Set();

    constructor(initialState = {}) {
        this.#state = { ...initialState };
    }

    /**
     * Get the current state (shallow copy).
     */
    get() {
        return { ...this.#state };
    }

    /**
     * Merge partial state into the current state and notify subscribers.
     * @param {object} partial - Key/value pairs to merge into state.
     */
    set(partial) {
        this.#state = { ...this.#state, ...partial };
        this.#notify();
    }

    /**
     * Subscribe to state changes.
     * @param {function} callback - Called with the new state on every change.
     * @returns {function} Unsubscribe function.
     */
    subscribe(callback) {
        this.#subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }

    /**
     * Remove a subscriber.
     * @param {function} callback - The previously subscribed callback.
     */
    unsubscribe(callback) {
        this.#subscribers.delete(callback);
    }

    /**
     * Notify all subscribers with the current state.
     */
    #notify() {
        const state = this.get();
        for (const cb of this.#subscribers) {
            try {
                cb(state);
            } catch (err) {
                console.error('[Store] Subscriber error:', err);
            }
        }
    }
}
