import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CdSelect extends LitElement {
    static properties = {
        value: { type: String },
        options: { type: Array },
        label: { type: String },
        disabled: { type: Boolean },
    };

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
        }

        .select-label {
            color: var(--text-primary);
            font-size: var(--font-size-sm);
        }

        .select-control {
            background: var(--bg-elevated);
            color: var(--text-primary);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 6px 10px;
            font-size: var(--font-size-sm);
            outline: none;
            cursor: pointer;
            transition: border-color var(--transition);
        }

        .select-control:focus {
            border-color: var(--border-strong);
        }

        .select-control:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;

    constructor() {
        super();
        this.value = '';
        this.options = [];
        this.label = '';
        this.disabled = false;
    }

    _handleChange(e) {
        this.value = e.target.value;
        this.dispatchEvent(
            new CustomEvent('select-change', {
                detail: { value: this.value },
                bubbles: true,
                composed: true,
            })
        );
    }

    render() {
        return html`
            ${this.label ? html`<span class="select-label">${this.label}</span>` : ''}
            <select class="select-control" .value=${this.value} ?disabled=${this.disabled} @change=${this._handleChange}>
                ${this.options.map(
                    opt => html` <option value=${opt.value} ?selected=${opt.value === this.value}>${opt.label || opt.name || opt.value}</option> `
                )}
            </select>
        `;
    }
}

customElements.define('cd-select', CdSelect);
