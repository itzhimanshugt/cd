import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CdSlider extends LitElement {
    static properties = {
        value: { type: Number },
        min: { type: Number },
        max: { type: Number },
        step: { type: Number },
        label: { type: String },
        unit: { type: String },
        disabled: { type: Boolean },
    };

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: var(--space-xs);
        }

        :host([disabled]) {
            opacity: 0.5;
            pointer-events: none;
        }

        .slider-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-sm);
        }

        .slider-label {
            color: var(--text-primary);
            font-size: var(--font-size-sm);
        }

        .slider-value {
            font-family: var(--font-mono);
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 2px 8px;
        }

        .slider-input {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 4px;
            border-radius: 3px;
            background: var(--border-strong);
            outline: none;
            cursor: pointer;
            transition: background 0.15s;
        }

        .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--text-primary);
            border: none;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            cursor: pointer;
            transition: transform 0.15s ease;
        }

        .slider-input::-webkit-slider-thumb:hover {
            transform: scale(1.15);
        }

        .slider-input::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--text-primary);
            border: none;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            cursor: pointer;
        }
    `;

    constructor() {
        super();
        this.value = 0;
        this.min = 0;
        this.max = 100;
        this.step = 1;
        this.label = '';
        this.unit = '';
        this.disabled = false;
    }

    _handleInput(e) {
        this.value = Number(e.target.value);
        this.dispatchEvent(
            new CustomEvent('slider-input', {
                detail: { value: this.value },
                bubbles: true,
                composed: true,
            })
        );
    }

    _getTrackBackground() {
        const percent = ((this.value - this.min) / (this.max - this.min)) * 100;
        return `linear-gradient(to right, var(--accent) ${percent}%, var(--border-strong) ${percent}%)`;
    }

    render() {
        return html`
            <div class="slider-header">
                <span class="slider-label">${this.label}</span>
                <span class="slider-value">${this.value}${this.unit ? ` ${this.unit}` : ''}</span>
            </div>
            <input
                type="range"
                class="slider-input"
                .value=${String(this.value)}
                min=${this.min}
                max=${this.max}
                step=${this.step}
                ?disabled=${this.disabled}
                @input=${this._handleInput}
                style="background: ${this._getTrackBackground()}"
            />
        `;
    }
}

customElements.define('cd-slider', CdSlider);
