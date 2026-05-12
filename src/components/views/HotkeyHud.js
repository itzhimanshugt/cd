import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

// Lightweight overlay that briefly shows the new value of a preference
// whenever it was changed via a hotkey (source === 'hotkey').
// It is deliberately decoupled from CustomizeView so it works on every
// view (main, assistant, onboarding, etc) without extra wiring.
export class HotkeyHud extends LitElement {
    static styles = css`
        :host {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            pointer-events: none;
        }

        .pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            background: var(--bg-elevated);
            color: var(--text-primary);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            font-family: var(--font-mono);
            font-size: var(--font-size-sm);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
            opacity: 0;
            transform: translateY(4px);
            transition:
                opacity 200ms ease,
                transform 200ms ease;
            white-space: nowrap;
        }

        .pill.show {
            opacity: 1;
            transform: translateY(0);
        }

        .label {
            color: var(--text-secondary);
        }

        .value {
            color: var(--text-primary);
            font-weight: var(--font-weight-semibold, 600);
        }
    `;

    static properties = {
        _visible: { state: true },
        _label: { state: true },
        _value: { state: true },
    };

    constructor() {
        super();
        this._visible = false;
        this._label = '';
        this._value = '';
        this._hideTimer = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this._onPrefsChanged = e => this._handlePrefsChanged(e);
        window.addEventListener('cheatingdaddy-prefs-changed', this._onPrefsChanged);
    }

    disconnectedCallback() {
        if (this._onPrefsChanged) {
            window.removeEventListener('cheatingdaddy-prefs-changed', this._onPrefsChanged);
        }
        if (this._hideTimer) {
            clearTimeout(this._hideTimer);
            this._hideTimer = null;
        }
        super.disconnectedCallback();
    }

    _isEnabled() {
        try {
            if (window.cheatingDaddy && cheatingDaddy.prefs && typeof cheatingDaddy.prefs.get === 'function') {
                const v = cheatingDaddy.prefs.get('hotkeyHudEnabled');
                // Default is enabled when the pref has not been stored yet.
                return v === undefined || v === null ? true : !!v;
            }
        } catch (_) {
            // ignore
        }
        return true;
    }

    _formatForKey(key, value) {
        switch (key) {
            case 'backgroundTransparency':
                return { label: 'Opacity', value: `${Math.round(Number(value) * 100)}%` };
            case 'fontSize':
                return { label: 'Font Size', value: `${value}px` };
            case 'fontWeight':
                return { label: 'Font Weight', value: String(value) };
            case 'uiScale':
                return { label: 'Scale', value: `${Math.round(Number(value) * 100)}%` };
            case 'theme': {
                const s = String(value || '');
                const cap = s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
                return { label: 'Theme', value: cap };
            }
            default:
                return null;
        }
    }

    _handlePrefsChanged(e) {
        if (!e || !e.detail) return;
        if (e.detail.source !== 'hotkey') return;
        if (!this._isEnabled()) return;

        const formatted = this._formatForKey(e.detail.key, e.detail.value);
        if (!formatted) return;

        this._label = formatted.label;
        this._value = formatted.value;
        this._visible = true;

        if (this._hideTimer) {
            clearTimeout(this._hideTimer);
        }
        this._hideTimer = setTimeout(() => {
            this._visible = false;
            this._hideTimer = null;
        }, 1200);
    }

    render() {
        return html`
            <div class="pill ${this._visible ? 'show' : ''}">
                <span class="label">${this._label}</span>
                <span class="value">${this._value}</span>
            </div>
        `;
    }
}

customElements.define('hotkey-hud', HotkeyHud);
