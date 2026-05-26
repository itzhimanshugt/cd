/**
 * Session store - runtime session state (not persisted).
 * Listens to IPC events for session lifecycle updates.
 */
import { Store } from './Store.js';

const DEFAULT_SESSION_STATE = {
    active: false,
    provider: 'byok',
    profile: 'interview',
    connected: false,
    duration: 0,
    sessionId: null,
    isInitializing: false,
};

class SessionStore extends Store {
    constructor() {
        super(DEFAULT_SESSION_STATE);
        this.#bindIpcEvents();
    }

    #bindIpcEvents() {
        try {
            if (typeof window === 'undefined' || !window.require) {
                return;
            }
            const { ipcRenderer } = window.require('electron');

            ipcRenderer.on('session-started', (_event, data) => {
                this.set({
                    active: true,
                    isInitializing: false,
                    sessionId: data?.sessionId || null,
                    provider: data?.provider || this.get().provider,
                    profile: data?.profile || this.get().profile,
                });
            });

            ipcRenderer.on('session-stopped', () => {
                this.set({
                    active: false,
                    connected: false,
                    duration: 0,
                    sessionId: null,
                    isInitializing: false,
                });
            });

            ipcRenderer.on('session-connected', () => {
                this.set({ connected: true });
            });

            ipcRenderer.on('session-disconnected', () => {
                this.set({ connected: false });
            });

            ipcRenderer.on('session-duration', (_event, duration) => {
                this.set({ duration });
            });
        } catch (err) {
            console.error('[SessionStore] Failed to bind IPC events:', err);
        }
    }
}

export const sessionStore = new SessionStore();
