import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class AICustomizeView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .unified-page {
                height: 100%;
            }
            .unified-wrap {
                height: 100%;
            }
            section.surface {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            .form-grid {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            .form-group.vertical {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            textarea.control {
                flex: 1;
                resize: none;
                overflow-y: auto;
                min-height: 0;
            }
            .preview-section {
                margin-top: var(--space-md);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                overflow: hidden;
            }
            .preview-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: var(--bg-elevated);
                cursor: pointer;
                user-select: none;
            }
            .preview-header:hover {
                background: var(--bg-hover);
            }
            .preview-title {
                font-size: var(--font-size-sm);
                color: var(--text-secondary);
                font-weight: var(--font-weight-medium);
            }
            .preview-toggle {
                font-size: 10px;
                color: var(--text-muted);
            }
            .preview-body {
                padding: 10px 12px;
                border-top: 1px solid var(--border);
            }
            .preview-code {
                background: var(--bg-app);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 10px;
                font-family: var(--font-mono);
                font-size: 11px;
                color: var(--text-secondary);
                max-height: 200px;
                overflow-y: auto;
                white-space: pre-wrap;
                word-break: break-word;
            }
            .preview-actions {
                display: flex;
                justify-content: flex-end;
                margin-top: 8px;
            }
            .copy-btn {
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                padding: 4px 10px;
                font-size: var(--font-size-xs);
                cursor: pointer;
                transition:
                    background 0.2s,
                    color 0.2s;
            }
            .copy-btn:hover {
                background: var(--accent);
                color: var(--bg-app);
            }
        `,
    ];

    static properties = {
        selectedProfile: { type: String },
        onProfileChange: { type: Function },
        _context: { state: true },
        _showPreview: { state: true },
        _previewText: { state: true },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.onProfileChange = () => {};
        this._context = '';
        this._showPreview = false;
        this._previewText = '';
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const prefs = await cheatingDaddy.storage.getPreferences();
            this.selectedProfile = prefs.selectedProfile || this.selectedProfile;
            this._context = prefs.customPrompt || '';
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading AI customize storage:', error);
        }
    }

    _handleProfileChange(e) {
        this.onProfileChange(e.target.value);
    }

    async _saveContext(val) {
        this._context = val;
        await cheatingDaddy.storage.updatePreference('customPrompt', val);
    }

    _getProfileName(profile) {
        const names = {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
            exam: 'Exam Assistant',
            debug: 'Debug / Code Review',
        };
        return names[profile] || profile;
    }

    _getProfilePrompt(profile) {
        const prompts = {
            interview: 'You are an expert interview coach helping the user ace their job interview. Provide clear, concise answers.',
            sales: 'You are a sales strategy expert helping the user close deals effectively.',
            meeting: 'You are a business meeting assistant helping the user communicate clearly and professionally.',
            presentation: 'You are a presentation coach helping the user deliver impactful presentations.',
            negotiation: 'You are a negotiation expert helping the user achieve favorable outcomes.',
            exam: 'You are an exam assistant helping the user answer questions accurately and efficiently.',
            debug: 'You are a debugging assistant identifying bugs, logical flaws, and exact fixes in code.',
            custom: this._context.trim() || 'You are a helpful assistant. You follow the instructions provided in the custom prompt to guide your responses.',
        };
        return prompts[profile] || 'You are a helpful assistant.';
    }

    _getProfileDescription(profile) {
        const descriptions = {
            interview: 'Provides ready-to-speak answers for job interviews',
            sales: 'Helps close deals with persuasive responses',
            meeting: 'Clear, professional communication for meetings',
            presentation: 'Engaging talking points for presentations',
            negotiation: 'Strategic responses for deal-making',
            exam: 'Direct, efficient answers for tests',
            debug: 'Identifies bugs and suggests minimal code fixes',
            custom: 'Uses your saved custom prompt as the full system prompt',
        };
        return descriptions[profile] || '';
    }

    _togglePreview() {
        this._showPreview = !this._showPreview;
        if (this._showPreview) {
            if (this.selectedProfile === 'custom') {
                this._previewText = this._context.trim() || 'You are a helpful assistant.';
            } else {
                const profilePrompt = this._getProfilePrompt(this.selectedProfile);
                const customPart = this._context ? `\n\nCustom Instructions:\n${this._context}` : '';
                this._previewText = profilePrompt + customPart;
            }
        }
    }

    async _copyPreview() {
        try {
            await navigator.clipboard.writeText(this._previewText);
            if (window.cheatingDaddy && window.cheatingDaddy.showToast) {
                window.cheatingDaddy.showToast('Prompt copied to clipboard');
            }
        } catch (e) {
            console.error('Failed to copy prompt:', e);
        }
    }

    render() {
        const profiles = [
            { value: 'interview', label: 'Job Interview' },
            { value: 'sales', label: 'Sales Call' },
            { value: 'meeting', label: 'Business Meeting' },
            { value: 'presentation', label: 'Presentation' },
            { value: 'negotiation', label: 'Negotiation' },
            { value: 'exam', label: 'Exam Assistant' },
            { value: 'debug', label: 'Debug / Code Review' },
            { value: 'custom', label: 'Custom' },
        ];

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">AI Customization</div>
                    </div>

                    <section class="surface">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Profile</label>
                                <select class="control" .value=${this.selectedProfile} @change=${this._handleProfileChange}>
                                    ${profiles.map(profile => html`<option value=${profile.value}>${profile.label}</option>`)}
                                </select>
                                <div class="form-help">${this._getProfileDescription(this.selectedProfile)}</div>
                            </div>
                            <div class="form-group vertical">
                                <label class="form-label">${this.selectedProfile === 'custom' ? 'Custom Profile Prompt' : 'Custom Instructions'}</label>
                                <textarea
                                    class="control"
                                    placeholder=${this.selectedProfile === 'custom'
                                        ? 'Write the full custom profile prompt here...'
                                        : 'Resume details, role requirements, constraints...'}
                                    .value=${this._context}
                                    @input=${e => this._saveContext(e.target.value)}
                                ></textarea>
                                <div class="form-help">
                                    ${this.selectedProfile === 'custom'
                                        ? 'This text becomes your saved custom profile and is used as the full system prompt.'
                                        : 'Custom instructions persist across all sessions and are layered on top of your selected profile.'}
                                </div>
                            </div>
                        </div>

                        <div class="preview-section">
                            <div class="preview-header" @click=${this._togglePreview}>
                                <span class="preview-title">Preview System Prompt</span>
                                <span class="preview-toggle">${this._showPreview ? '▲ Hide' : '▼ Show'}</span>
                            </div>
                            ${this._showPreview
                                ? html`
                                      <div class="preview-body">
                                          <div class="preview-code">${this._previewText}</div>
                                          <div class="preview-actions">
                                              <button class="copy-btn" @click=${this._copyPreview}>Copy</button>
                                          </div>
                                      </div>
                                  `
                                : ''}
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('ai-customize-view', AICustomizeView);
