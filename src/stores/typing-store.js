/**
 * Typing store - tracks the state of the typing/injection system.
 * Listens to IPC events from the main process for real-time updates.
 */
import { Store } from './Store.js';

const DEFAULT_TYPING_STATE = {
    state: 'idle',
    backend: 'win32-sendinput',
    speed: 80,
    progress: 0,
    queueLength: 0,
    currentText: '',
};

class TypingStore extends Store {
    constructor() {
        super(DEFAULT_TYPING_STATE);
        this.#bindIpcEvents();
    }

    #bindIpcEvents() {
        try {
            if (typeof window === 'undefined' || !window.require) {
                return;
            }
            const { ipcRenderer } = window.require('electron');

            ipcRenderer.on('typing-status-changed', (_event, data) => {
                if (data && typeof data === 'object') {
                    this.set(data);
                } else if (typeof data === 'string') {
                    this.set({ state: data });
                }
            });

            ipcRenderer.on('typing-progress-changed', (_event, data) => {
                if (data && typeof data === 'object') {
                    this.set(data);
                }
            });

            ipcRenderer.on('typing-started', (_event, data) => {
                this.set({
                    state: 'typing',
                    ...(data || {}),
                });
            });

            ipcRenderer.on('typing-paused', () => {
                this.set({ state: 'paused' });
            });

            ipcRenderer.on('typing-completed', () => {
                this.set({ state: 'idle', progress: 100, currentText: '' });
            });

            ipcRenderer.on('typing-aborted', () => {
                this.set({ state: 'idle', progress: 0, queueLength: 0, currentText: '' });
            });
        } catch (err) {
            console.error('[TypingStore] Failed to bind IPC events:', err);
        }
    }
}

export const typingStore = new TypingStore();
