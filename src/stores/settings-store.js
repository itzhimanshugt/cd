/**
 * Settings store - singleton for user preferences.
 * Hydrates from cheatingDaddy.storage on init, debounce-writes changes back.
 */
import { Store } from './Store.js';

const DEFAULT_SETTINGS = {
    customPrompt: '',
    providerMode: 'byok',
    responseMode: 'both',
    selectedProfile: 'interview',
    selectedLanguage: 'en-US',
    selectedScreenshotInterval: '5',
    selectedImageQuality: 'medium',
    advancedMode: false,
    audioMode: 'speaker_only',
    fontSize: 20,
    backgroundTransparency: 0.8,
    googleSearchEnabled: false,
    ollamaHost: 'http://127.0.0.1:11434',
    ollamaModel: 'llama3.1',
    whisperModel: 'Xenova/whisper-small',
    aiHearingEnabled: false,
    modelExtraction: 'gemini-2.5-flash',
    modelSolution: 'gemini-2.5-flash',
    modelDebugging: 'gemini-2.5-flash',
    debugModeEnabled: false,
    hotkeyToastsEnabled: true,
    fontWeight: 400,
};

class SettingsStore extends Store {
    #debounceTimers = {};

    constructor() {
        super(DEFAULT_SETTINGS);
    }

    /**
     * Hydrate store from persisted preferences via IPC.
     */
    async init() {
        try {
            if (typeof cheatingDaddy === 'undefined' || !cheatingDaddy.storage) {
                return;
            }
            const prefs = await cheatingDaddy.storage.getPreferences();
            if (prefs && typeof prefs === 'object') {
                super.set(prefs);
            }
        } catch (err) {
            console.error('[SettingsStore] init failed:', err);
        }
    }

    /**
     * Override set() to persist changed keys with 200ms debounce.
     */
    set(partial) {
        super.set(partial);
        this.#persistChanges(partial);
    }

    #persistChanges(partial) {
        if (typeof cheatingDaddy === 'undefined' || !cheatingDaddy.storage) {
            return;
        }
        for (const [key, value] of Object.entries(partial)) {
            if (this.#debounceTimers[key]) {
                clearTimeout(this.#debounceTimers[key]);
            }
            this.#debounceTimers[key] = setTimeout(() => {
                cheatingDaddy.storage.updatePreference(key, value).catch(err => {
                    console.error(`[SettingsStore] Failed to persist "${key}":`, err);
                });
                delete this.#debounceTimers[key];
            }, 200);
        }
    }
}

export const settingsStore = new SettingsStore();

// Deferred auto-init: try immediately, retry on DOMContentLoaded if not ready
function tryInit() {
    if (typeof cheatingDaddy !== 'undefined' && cheatingDaddy.storage) {
        settingsStore.init();
    } else if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            settingsStore.init();
        });
    } else {
        setTimeout(() => settingsStore.init(), 100);
    }
}

tryInit();
