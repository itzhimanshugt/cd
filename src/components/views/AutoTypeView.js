import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class AutoTypeView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .slider-row {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
            }
            .slider-row input[type='range'] {
                flex: 1;
                accent-color: var(--accent);
            }
            .slider-value {
                min-width: 48px;
                text-align: right;
                font-size: var(--font-size-xs);
                color: var(--text-secondary);
                font-family: var(--font-mono);
            }
            .toggle-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 0;
            }
            .toggle-label {
                color: var(--text-secondary);
                font-size: var(--font-size-sm);
            }
            .toggle-switch {
                position: relative;
                width: 36px;
                height: 20px;
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                border-radius: 10px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .toggle-switch.active {
                background: var(--accent);
            }
            .toggle-switch::after {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: var(--text-primary);
                transition: transform 0.2s;
            }
            .toggle-switch.active::after {
                transform: translateX(16px);
            }
            .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                font-size: var(--font-size-xs);
                color: var(--text-secondary);
            }
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--text-muted);
            }
            .status-dot.idle {
                background: var(--text-muted);
            }
            .status-dot.typing {
                background: #4caf50;
            }
            .status-dot.paused {
                background: #ff9800;
            }
            .status-dot.aborted {
                background: #f44336;
            }
            .status-dot.completed {
                background: #2196f3;
            }
            .status-info {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-sm);
                margin-top: 8px;
            }
            .failover-list {
                list-style: none;
                padding: 0;
                margin: 8px 0 0 0;
            }
            .failover-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                margin-bottom: 4px;
                background: var(--bg-elevated);
            }
            .failover-item-number {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                min-width: 20px;
            }
            .failover-item-name {
                flex: 1;
                font-size: var(--font-size-sm);
                color: var(--text-primary);
            }
            .failover-btn {
                background: none;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                cursor: pointer;
                padding: 2px 6px;
                font-size: var(--font-size-xs);
                line-height: 1;
            }
            .failover-btn:hover {
                background: var(--bg-elevated);
                color: var(--text-primary);
            }
            .health-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-top: 8px;
            }
            .health-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
            }
            .health-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            .health-dot.available {
                background: #4caf50;
            }
            .health-dot.unavailable {
                background: #f44336;
            }
            .health-name {
                flex: 1;
                font-size: var(--font-size-xs);
                color: var(--text-primary);
            }
            .health-errors {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
            }
            .backend-option {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .availability-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                display: inline-block;
            }
            .availability-dot.available {
                background: #4caf50;
            }
            .availability-dot.unavailable {
                background: #9e9e9e;
            }
            .test-btn {
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                cursor: pointer;
                padding: 4px 10px;
                font-size: var(--font-size-xs);
                transition:
                    background 0.2s,
                    color 0.2s;
            }
            .test-btn:hover {
                background: var(--accent);
                color: var(--text-primary);
            }
            .keybind-input {
                width: 160px;
                background: var(--bg-elevated);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 6px 10px;
                font-size: var(--font-size-sm);
                font-family: var(--font-mono);
            }
            .keybind-input:focus {
                outline: none;
                border-color: var(--accent);
                box-shadow: 0 0 0 1px var(--accent);
            }
        `,
    ];

    static properties = {
        _settings: { state: true },
        _status: { state: true },
        _progress: { state: true },
        _backends: { state: true },
    };

    constructor() {
        super();
        this._settings = {};
        this._status = { state: 'idle' };
        this._progress = {};
        this._backends = [];
    }

    connectedCallback() {
        super.connectedCallback();
        this._loadSettings();
        this._loadStatus();
        this._statusListener = e => {
            this._status = e.detail;
            this.requestUpdate();
        };
        this._progressListener = e => {
            this._progress = e.detail;
            this.requestUpdate();
        };
        window.cheatingDaddy.events.addEventListener('typing-status-changed', this._statusListener);
        window.cheatingDaddy.events.addEventListener('typing-progress-changed', this._progressListener);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._statusListener) {
            window.cheatingDaddy.events.removeEventListener('typing-status-changed', this._statusListener);
        }
        if (this._progressListener) {
            window.cheatingDaddy.events.removeEventListener('typing-progress-changed', this._progressListener);
        }
    }

    async _loadSettings() {
        try {
            const result = await window.cheatingDaddy.typing.getSettings();
            this._settings = result.data || result;
        } catch (e) {
            console.error('Failed to load typing settings:', e);
        }
    }

    async _loadStatus() {
        try {
            const result = await window.cheatingDaddy.typing.getStatus();
            const data = result.data || result;
            this._status = data;
            if (data.backendHealth) {
                this._backends = Object.entries(data.backendHealth).map(([name, info]) => ({
                    name,
                    available: info.available,
                    errorCount: info.errorCount,
                }));
            }
        } catch (e) {
            // Status might not be available
        }
    }

    async _updateSetting(key, value) {
        this._settings = { ...this._settings, [key]: value };
        try {
            await window.cheatingDaddy.typing.setSettings({ [key]: value });
        } catch (e) {
            console.error('Failed to save typing setting:', e);
        }
    }

    _onBackendChange(e) {
        this._updateSetting('backend', e.target.value);
    }

    _onTestBackend() {
        try {
            window.cheatingDaddy.typing.testBackend(this._settings.backend || 'win32-sendinput');
        } catch (e) {
            console.error('Backend test failed:', e);
        }
    }

    _onSpeedChange(e) {
        this._updateSetting('typingSpeed', parseInt(e.target.value, 10));
    }

    _onStartupDelayChange(e) {
        this._updateSetting('startupDelay', parseInt(e.target.value, 10));
    }

    _onPunctuationDelayChange(e) {
        this._updateSetting('punctuationDelay', parseInt(e.target.value, 10));
    }

    _onSentenceDelayChange(e) {
        this._updateSetting('sentenceDelay', parseInt(e.target.value, 10));
    }

    _onBurstSizeChange(e) {
        this._updateSetting('burstSize', parseInt(e.target.value, 10));
    }

    _onJitterChange(e) {
        this._updateSetting('jitterRange', parseFloat(e.target.value));
    }

    _onGranularityChange(e) {
        this._updateSetting('granularity', e.target.value);
    }

    _toggleEnabled() {
        this._updateSetting('enabled', !this._settings.enabled);
    }

    _togglePasteMode() {
        this._updateSetting('pasteMode', !this._settings.pasteMode);
    }

    _toggleSentenceBySentence() {
        this._updateSetting('sentenceBySentence', !this._settings.sentenceBySentence);
    }

    _toggleTypoSimulation() {
        this._updateSetting('typoSimulation', !this._settings.typoSimulation);
    }

    _toggleBackspaceSimulation() {
        this._updateSetting('backspaceSimulation', !this._settings.backspaceSimulation);
    }

    _toggleAdaptiveSpeed() {
        this._updateSetting('adaptiveSpeed', !this._settings.adaptiveSpeed);
    }

    _toggleHoldToTypeMode() {
        this._updateSetting('holdToTypeMode', !this._settings.holdToTypeMode);
    }

    _toggleTargetLock() {
        this._updateSetting('targetLock', !this._settings.targetLock);
    }

    _toggleAutoRefocus() {
        this._updateSetting('autoRefocus', !this._settings.autoRefocus);
    }

    _toggleClipboardRestore() {
        this._updateSetting('clipboardRestore', !this._settings.clipboardRestore);
    }

    _onAutoFocusDelayChange(e) {
        this._updateSetting('autoFocusDelay', parseInt(e.target.value, 10));
    }

    _onHoldToTypeKeybindChange(e) {
        this._updateSetting('holdToTypeKeybind', e.target.value);
    }

    _onAbortKeybindChange(e) {
        this._updateSetting('abortKeybind', e.target.value);
    }

    _onFullResponseKeybindChange(e) {
        this._updateSetting('fullResponseKeybind', e.target.value);
    }

    _onMoveUp(index) {
        const chain = [...(this._settings.failoverChain || [])];
        if (index <= 0 || index >= chain.length) return;
        const temp = chain[index - 1];
        chain[index - 1] = chain[index];
        chain[index] = temp;
        this._updateSetting('failoverChain', chain);
    }

    _onMoveDown(index) {
        const chain = [...(this._settings.failoverChain || [])];
        if (index < 0 || index >= chain.length - 1) return;
        const temp = chain[index + 1];
        chain[index + 1] = chain[index];
        chain[index] = temp;
        this._updateSetting('failoverChain', chain);
    }

    _getBackendAvailability(backendName) {
        const b = this._backends.find(item => item.name === backendName);
        return b ? b.available : false;
    }

    render() {
        const s = this._settings;
        const statusState = this._status?.state || 'idle';
        const activeBackend = this._status?.activeBackend || s.backend || 'win32-sendinput';
        const queueTyped = this._progress?.typed || 0;
        const queueTotal = this._progress?.total || 0;
        const currentWpm = this._progress?.wpm || s.typingSpeed || 80;
        const failoverChain = s.failoverChain || [];

        const allBackends = [
            'win32-sendinput',
            'virtual-keyboard',
            'powershell-addtype',
            'clipboard',
            'powershell',
            'autohotkey',
            'batch-paste',
            'hybrid-typing',
            'nutjs',
            'robotjs',
            'ui-automation',
            'electron-webcontents',
        ];

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">Auto Type</div>
                        <div class="page-subtitle">Full control over the typing injection system, backends, and behavior</div>
                    </div>

                    <!-- Section 1: Live Status Panel -->
                    <div class="surface">
                        <div class="surface-title">Live Status</div>
                        <div class="status-info">
                            <span class="status-badge">
                                <span class="status-dot ${statusState}"></span>
                                ${statusState}
                            </span>
                            <span class="status-badge">Backend: ${activeBackend}</span>
                            <span class="status-badge">Queue: ${queueTyped}/${queueTotal}</span>
                            <span class="status-badge">WPM: ${currentWpm}</span>
                        </div>
                    </div>

                    <!-- Section 2: Backend Selection -->
                    <div class="surface">
                        <div class="surface-title">Backend Selection</div>
                        <div class="surface-subtitle">Select the keystroke injection method</div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Injection Backend</label>
                                <select class="control" .value=${s.backend || 'win32-sendinput'} @change=${this._onBackendChange}>
                                    ${allBackends.map(b => html`<option value=${b}>${b}</option>`)}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Availability</label>
                                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                    ${allBackends.map(
                                        b => html`
                                            <span class="backend-option">
                                                <span
                                                    class="availability-dot ${this._getBackendAvailability(b) ? 'available' : 'unavailable'}"
                                                ></span>
                                                <span style="font-size: var(--font-size-xs); color: var(--text-secondary);">${b}</span>
                                            </span>
                                        `
                                    )}
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Test Current Backend</label>
                                <button class="test-btn" @click=${this._onTestBackend}>Test</button>
                            </div>
                        </div>
                    </div>

                    <!-- Section 3: Fallback Chain -->
                    <div class="surface">
                        <div class="surface-title">Fallback Chain</div>
                        <div class="surface-subtitle">
                            Configure backend fallback order. If the primary backend fails, the system will try each in order.
                        </div>
                        <ol class="failover-list">
                            ${failoverChain.map(
                                (name, index) => html`
                                    <li class="failover-item">
                                        <span class="failover-item-number">${index + 1}.</span>
                                        <span class="failover-item-name">${name}</span>
                                        <button class="failover-btn" @click=${() => this._onMoveUp(index)} ?disabled=${index === 0}>&#9650;</button>
                                        <button
                                            class="failover-btn"
                                            @click=${() => this._onMoveDown(index)}
                                            ?disabled=${index === failoverChain.length - 1}
                                        >
                                            &#9660;
                                        </button>
                                    </li>
                                `
                            )}
                        </ol>
                    </div>

                    <!-- Section 4: Backend Health -->
                    <div class="surface">
                        <div class="surface-title">Backend Health</div>
                        <div class="surface-subtitle">Real-time availability and health of injection backends</div>
                        <div class="health-grid">
                            ${this._backends.map(
                                b => html`
                                    <div class="health-item">
                                        <span class="health-dot ${b.available ? 'available' : 'unavailable'}"></span>
                                        <span class="health-name">${b.name}</span>
                                        <span class="health-errors">${b.errorCount > 0 ? `${b.errorCount} errors` : ''}</span>
                                    </div>
                                `
                            )}
                        </div>
                    </div>

                    <!-- Section 5: Typing Speed & Timing -->
                    <div class="surface">
                        <div class="surface-title">Speed & Timing</div>
                        <div class="surface-subtitle">Adjust typing speed and timing parameters</div>
                        <div class="form-grid">
                            <div class="form-group vertical">
                                <label class="form-label">Typing Speed (WPM): ${s.typingSpeed || 80}</label>
                                <div class="slider-row">
                                    <input type="range" min="10" max="300" .value=${String(s.typingSpeed || 80)} @input=${this._onSpeedChange} />
                                    <span class="slider-value">${s.typingSpeed || 80}</span>
                                </div>
                            </div>
                            <div class="form-group vertical">
                                <label class="form-label">Startup Delay (ms): ${s.startupDelay || 200}</label>
                                <div class="slider-row">
                                    <input
                                        type="range"
                                        min="0"
                                        max="2000"
                                        step="50"
                                        .value=${String(s.startupDelay || 200)}
                                        @input=${this._onStartupDelayChange}
                                    />
                                    <span class="slider-value">${s.startupDelay || 200}</span>
                                </div>
                            </div>
                            <div class="form-group vertical">
                                <label class="form-label">Punctuation Delay (ms): ${s.punctuationDelay || 150}</label>
                                <div class="slider-row">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1000"
                                        step="10"
                                        .value=${String(s.punctuationDelay || 150)}
                                        @input=${this._onPunctuationDelayChange}
                                    />
                                    <span class="slider-value">${s.punctuationDelay || 150}</span>
                                </div>
                            </div>
                            <div class="form-group vertical">
                                <label class="form-label">Sentence Delay (ms): ${s.sentenceDelay || 300}</label>
                                <div class="slider-row">
                                    <input
                                        type="range"
                                        min="0"
                                        max="2000"
                                        step="10"
                                        .value=${String(s.sentenceDelay || 300)}
                                        @input=${this._onSentenceDelayChange}
                                    />
                                    <span class="slider-value">${s.sentenceDelay || 300}</span>
                                </div>
                            </div>
                            <div class="form-group vertical">
                                <label class="form-label">Chunk/Burst Size: ${s.burstSize || 3}</label>
                                <div class="slider-row">
                                    <input type="range" min="1" max="10" .value=${String(s.burstSize || 3)} @input=${this._onBurstSizeChange} />
                                    <span class="slider-value">${s.burstSize || 3}</span>
                                </div>
                            </div>
                            <div class="form-group vertical">
                                <label class="form-label">Jitter/Randomization: ${Math.round((s.jitterRange || 0.3) * 100)}%</label>
                                <div class="slider-row">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        .value=${String(s.jitterRange || 0.3)}
                                        @input=${this._onJitterChange}
                                    />
                                    <span class="slider-value">${Math.round((s.jitterRange || 0.3) * 100)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 6: Typing Mode -->
                    <div class="surface">
                        <div class="surface-title">Typing Mode</div>
                        <div class="surface-subtitle">Configure typing behavior, granularity, and simulation options</div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Granularity</label>
                                <select class="control" .value=${s.granularity || 'character'} @change=${this._onGranularityChange}>
                                    <option value="character">Character</option>
                                    <option value="word">Word</option>
                                    <option value="sentence">Sentence</option>
                                    <option value="paragraph">Paragraph</option>
                                </select>
                            </div>
                            <div class="toggle-row">
                                <span class="toggle-label">Enabled</span>
                                <div class="toggle-switch ${s.enabled ? 'active' : ''}" @click=${this._toggleEnabled}></div>
                            </div>
                            <div class="toggle-row">
                                <span class="toggle-label">Paste Mode</span>
                                <div class="toggle-switch ${s.pasteMode ? 'active' : ''}" @click=${this._togglePasteMode}></div>
                            </div>
                            <div class="toggle-row">
                                <span class="toggle-label">Sentence by Sentence</span>
                                <div class="toggle-switch ${s.sentenceBySentence ? 'active' : ''}" @click=${this._toggleSentenceBySentence}></div>
                            </div>
                            <div class="toggle-row">
                                <span class="toggle-label">Typo Simulation</span>
                                <div class="toggle-switch ${s.typoSimulation ? 'active' : ''}" @click=${this._toggleTypoSimulation}></div>
                            </div>
                            <div class="toggle-row">
                                <span class="toggle-label">Backspace Simulation</span>
                                <div class="toggle-switch ${s.backspaceSimulation ? 'active' : ''}" @click=${this._toggleBackspaceSimulation}></div>
                            </div>
                            <div class="toggle-row">
                                <span class="toggle-label">Adaptive Speed</span>
                                <div class="toggle-switch ${s.adaptiveSpeed ? 'active' : ''}" @click=${this._toggleAdaptiveSpeed}></div>
                            </div>
                            <div class="toggle-row">
                                <span class="toggle-label">Hold-to-Type Mode</span>
                                <div class="toggle-switch ${s.holdToTypeMode ? 'active' : ''}" @click=${this._toggleHoldToTypeMode}></div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 7: Keybinds -->
                    <div class="surface">
                        <div class="surface-title">Keybinds</div>
                        <div class="surface-subtitle">Configure keyboard shortcuts for typing control</div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Hold-to-Type Key</label>
                                <input
                                    class="keybind-input"
                                    type="text"
                                    .value=${s.holdToTypeKeybind || ''}
                                    @change=${this._onHoldToTypeKeybindChange}
                                    placeholder="e.g. RightControl"
                                />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Abort Key</label>
                                <input
                                    class="keybind-input"
                                    type="text"
                                    .value=${s.abortKeybind || ''}
                                    @change=${this._onAbortKeybindChange}
                                    placeholder="e.g. Escape"
                                />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Full Response Key</label>
                                <input
                                    class="keybind-input"
                                    type="text"
                                    .value=${s.fullResponseKeybind || ''}
                                    @change=${this._onFullResponseKeybindChange}
                                    placeholder="e.g. F9"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Section 8: Target/Focus -->
                    <div class="surface">
                        <div class="surface-title">Target / Focus Control</div>
                        <div class="surface-subtitle">Control focus behavior during typing injection</div>
                        <div class="form-grid">
                            <div class="toggle-row">
                                <span class="toggle-label">Target Lock</span>
                                <div class="toggle-switch ${s.targetLock ? 'active' : ''}" @click=${this._toggleTargetLock}></div>
                            </div>
                            <div class="toggle-row">
                                <span class="toggle-label">Auto-Refocus</span>
                                <div class="toggle-switch ${s.autoRefocus ? 'active' : ''}" @click=${this._toggleAutoRefocus}></div>
                            </div>
                            <div class="toggle-row">
                                <span class="toggle-label">Clipboard Restore</span>
                                <div class="toggle-switch ${s.clipboardRestore ? 'active' : ''}" @click=${this._toggleClipboardRestore}></div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Auto-Focus Delay (ms)</label>
                                <input
                                    class="control"
                                    type="number"
                                    min="0"
                                    max="5000"
                                    .value=${String(s.autoFocusDelay || 100)}
                                    @change=${this._onAutoFocusDelayChange}
                                    style="width: 120px;"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('auto-type-view', AutoTypeView);
