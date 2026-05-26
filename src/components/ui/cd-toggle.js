import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CdToggle extends LitElement {
    static properties = {
        checked: { type: Boolean, reflect: true },
        label: { type: String },
        disabled: { type: Boolean },
    };

    static styles = css`
        :host {
            display: inline-flex;
            align-items: center;
            gap: var(--space-sm);
        }

        :host([disabled]) {
            opacity: 0.5;
            pointer-events: none;
        }

        .track {
            position: relative;
            width: 40px;
            height: 22px;
            border-radius: 11px;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            cursor: pointer;
            transition: background var(--transition);
        }

        :host([checked]) .track {
            background: var(--accent);
            border-color: var(--accent);
        }

        .dot {
            position: absolute;
            top: 3px;
            left: 3px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: white;
            transition: transform var(--transition);
        }

        :host([checked]) .dot {
            transform: translateX(18px);
        }

        .label {
            color: var(--text-primary);
            font-size: var(--font-size-sm);
            user-select: none;
            cursor: pointer;
        }
    `;

    constructor() {
        super();
        this.checked = false;
        this.label = '';
        this.disabled = false;
    }

    _handleClick() {
        if (this.disabled) return;
        this.checked = !this.checked;
        this.dispatchEvent(
            new CustomEvent('toggle-change', {
                detail: { checked: this.checked },
                bubbles: true,
                composed: true,
            })
        );
    }

    render() {
        return html`
            <div class="track" @click=${this._handleClick}>
                <div class="dot"></div>
            </div>
            ${this.label ? html`<span class="label" @click=${this._handleClick}>${this.label}</span>` : ''}
        `;
    }
}

customElements.define('cd-toggle', CdToggle);
