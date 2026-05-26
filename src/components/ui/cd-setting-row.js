import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CdSettingRow extends LitElement {
    static properties = {
        label: { type: String },
        description: { type: String },
    };

    static styles = css`
        :host {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-md);
            padding: var(--space-sm) 0;
            border-bottom: 1px solid var(--border);
        }

        :host(:last-of-type) {
            border-bottom: none;
        }

        .info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .label {
            color: var(--text-primary);
            font-size: var(--font-size-sm);
        }

        .description {
            color: var(--text-secondary);
            font-size: var(--font-size-xs);
        }

        .control {
            flex-shrink: 0;
        }
    `;

    constructor() {
        super();
        this.label = '';
        this.description = '';
    }

    render() {
        return html`
            <div class="info">
                <span class="label">${this.label}</span>
                ${this.description ? html`<span class="description">${this.description}</span>` : ''}
            </div>
            <div class="control">
                <slot></slot>
            </div>
        `;
    }
}

customElements.define('cd-setting-row', CdSettingRow);
