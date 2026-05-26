/**
 * UI store - ephemeral UI state (not persisted).
 * Manages current view, sidebar state, and toast notifications.
 */
import { Store } from './Store.js';

const DEFAULT_UI_STATE = {
    currentView: 'main',
    sidebarCollapsed: false,
    toasts: [],
};

class UiStore extends Store {
    constructor() {
        super(DEFAULT_UI_STATE);
    }

    /**
     * Add a toast notification.
     * @param {string} message - Toast message text.
     * @param {string} [type='info'] - Toast type (info, success, warning, error).
     * @param {number} [duration=3000] - Auto-dismiss duration in ms.
     */
    addToast(message, type = 'info', duration = 3000) {
        const toast = { id: Date.now(), message, type, duration };
        const current = this.get();
        this.set({ toasts: [...current.toasts, toast] });

        if (duration > 0) {
            setTimeout(() => this.removeToast(toast.id), duration);
        }

        return toast.id;
    }

    /**
     * Remove a toast by id.
     * @param {number} id - The toast id to remove.
     */
    removeToast(id) {
        const current = this.get();
        this.set({ toasts: current.toasts.filter(t => t.id !== id) });
    }
}

export const uiStore = new UiStore();
