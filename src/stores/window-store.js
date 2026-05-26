/**
 * Window store - window position/size/opacity state.
 * Hydrates from cheatingDaddy.storage on init, debounce-writes changes back.
 */
import { Store } from './Store.js';

const DEFAULT_WINDOW_STATE = {
    scale: 1.0,
    zoom: 1.0,
    opacity: 1.0,
    visible: true,
    moveStep: 60,
    x: null,
    y: null,
};

class WindowStore extends Store {
    #debounceTimer = null;

    constructor() {
        super(DEFAULT_WINDOW_STATE);
    }

    /**
     * Hydrate store from persisted window state via IPC.
     */
    async init() {
        try {
            if (typeof cheatingDaddy === 'undefined' || !cheatingDaddy.storage) {
                return;
            }
            const state = await cheatingDaddy.storage.getWindowState();
            if (state && typeof state === 'object') {
                super.set(state);
            }
        } catch (err) {
            console.error('[WindowStore] init failed:', err);
        }
    }

    /**
     * Override set() to persist window state with 200ms debounce.
     */
    set(partial) {
        super.set(partial);
        this.#persistState(partial);
    }

    #persistState(partial) {
        if (typeof cheatingDaddy === 'undefined' || !cheatingDaddy.storage) {
            return;
        }
        if (this.#debounceTimer) {
            clearTimeout(this.#debounceTimer);
        }
        this.#debounceTimer = setTimeout(() => {
            cheatingDaddy.storage.setWindowState(partial).catch(err => {
                console.error('[WindowStore] Failed to persist state:', err);
            });
            this.#debounceTimer = null;
        }, 200);
    }
}

export const windowStore = new WindowStore();

// Deferred auto-init
function tryInit() {
    if (typeof cheatingDaddy !== 'undefined' && cheatingDaddy.storage) {
        windowStore.init();
    } else if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            windowStore.init();
        });
    } else {
        setTimeout(() => windowStore.init(), 100);
    }
}

tryInit();
