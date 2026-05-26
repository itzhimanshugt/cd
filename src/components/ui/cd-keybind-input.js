import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CdKeybindInput extends LitElement {
    static properties = {
        value: { type: String },
        label: { type: String },
        placeholder: { type: String },
    };

    static styles = css`
        :host {
            display: inline-flex;
            flex-direction: column;
            gap: var(--space-xs);
        }

        .keybind-label {
            color: var(--text-primary);
            font-size: var(--font-size-sm);
        }

        .keybind-input {
            width: 140px;
            text-align: center;
            font-family: var(--font-mono);
            font-size: var(--font-size-xs);
            background: var(--bg-elevated);
            color: var(--text-primary);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 6px 10px;
            outline: none;
            cursor: pointer;
            transition: border-color var(--transition);
        }

        .keybind-input:focus {
            border-color: var(--accent);
        }
    `;

    constructor() {
        super();
        this.value = '';
        this.label = '';
        this.placeholder = 'Press key combo...';
    }

    _handleFocus(e) {
        e.target.value = '';
        e.target.placeholder = this.placeholder;
    }

    _handleBlur(e) {
        e.target.value = this.value;
        e.target.placeholder = '';
    }

    _handleKeydown(e) {
        e.preventDefault();
        e.stopPropagation();

        // Build modifiers
        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push('Cmd');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        // Get main key
        let mainKey = e.key;
        switch (e.code) {
            case 'ArrowUp':
                mainKey = 'Up';
                break;
            case 'ArrowDown':
                mainKey = 'Down';
                break;
            case 'ArrowLeft':
                mainKey = 'Left';
                break;
            case 'ArrowRight':
                mainKey = 'Right';
                break;
            case 'Enter':
                mainKey = 'Enter';
                break;
            case 'Space':
                mainKey = 'Space';
                break;
            case 'Backslash':
                mainKey = '\\';
                break;
            default:
                if (e.key.length === 1) mainKey = e.key.toUpperCase();
                break;
        }

        // Ignore lone modifier presses
        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;

        const keybind = [...modifiers, mainKey].join('+');
        this.value = keybind;

        this.dispatchEvent(
            new CustomEvent('keybind-change', {
                detail: { value: keybind },
                bubbles: true,
                composed: true,
            })
        );

        // Blur after capture
        e.target.blur();
    }

    _handleMousedown(e) {
        if (e.button >= 3) {
            e.preventDefault();
            e.stopPropagation();

            const buttonName = `Mouse${e.button + 1}`;
            this.value = buttonName;

            this.dispatchEvent(
                new CustomEvent('keybind-change', {
                    detail: { value: buttonName },
                    bubbles: true,
                    composed: true,
                })
            );

            e.target.blur();
        }
    }

    _handleContextmenu(e) {
        e.preventDefault();
    }

    render() {
        return html`
            ${this.label ? html`<span class="keybind-label">${this.label}</span>` : ''}
            <input
                class="keybind-input"
                type="text"
                readonly
                .value=${this.value}
                @focus=${this._handleFocus}
                @blur=${this._handleBlur}
                @keydown=${this._handleKeydown}
                @mousedown=${this._handleMousedown}
                @contextmenu=${this._handleContextmenu}
            />
        `;
    }
}

customElements.define('cd-keybind-input', CdKeybindInput);
