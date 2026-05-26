import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class DebugView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .debug-section {
                margin-bottom: var(--space-lg);
            }
            .debug-section h3 {
                font-size: var(--font-size-md);
                font-weight: var(--font-weight-semibold);
                color: var(--text-primary);
                margin-bottom: var(--space-sm);
            }
            .debug-section p {
                font-size: var(--font-size-sm);
                color: var(--text-muted);
                margin-bottom: var(--space-sm);
            }
            .btn-row {
                display: flex;
                gap: var(--space-sm);
                flex-wrap: wrap;
                margin-bottom: var(--space-sm);
            }
            .debug-btn {
                padding: 6px 12px;
                border-radius: var(--radius-md);
                border: 1px solid var(--border);
                background: var(--bg-elevated);
                color: var(--text-primary);
                font-size: var(--font-size-sm);
                cursor: pointer;
                transition:
                    background var(--transition),
                    border-color var(--transition);
            }
            .debug-btn:hover {
                background: var(--bg-hover);
                border-color: var(--border-strong);
            }
            .feedback {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                margin-top: var(--space-xs);
                min-height: 18px;
            }
            .feedback.success {
                color: #4caf50;
            }
            .feedback.error {
                color: #f44336;
            }

            /* Log Viewer */
            .log-controls {
                display: flex;
                gap: var(--space-sm);
                align-items: center;
                flex-wrap: wrap;
                margin-bottom: var(--space-sm);
            }
            .log-controls select,
            .log-controls input {
                padding: 4px 8px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border);
                background: var(--bg-elevated);
                color: var(--text-primary);
                font-size: var(--font-size-xs);
            }
            .log-controls input {
                flex: 1;
                min-width: 120px;
            }
            .log-viewer {
                max-height: 400px;
                overflow-y: auto;
                border: 1px solid var(--border);
                border-radius: var(--radius-md);
                background: var(--bg-surface);
                padding: var(--space-xs);
                font-family: var(--font-mono);
                font-size: 11px;
            }
            .log-entry {
                display: flex;
                gap: 6px;
                align-items: flex-start;
                padding: 2px 4px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            }
            .log-entry:last-child {
                border-bottom: none;
            }
            .log-time {
                color: var(--text-muted);
                white-space: nowrap;
                flex-shrink: 0;
            }
            .log-level {
                padding: 0 4px;
                border-radius: 3px;
                font-weight: 600;
                font-size: 10px;
                white-space: nowrap;
                flex-shrink: 0;
            }
            .log-level.TRACE {
                background: rgba(158, 158, 158, 0.2);
                color: #9e9e9e;
            }
            .log-level.DEBUG {
                background: rgba(33, 150, 243, 0.2);
                color: #2196f3;
            }
            .log-level.INFO {
                background: rgba(76, 175, 80, 0.2);
                color: #4caf50;
            }
            .log-level.WARN {
                background: rgba(255, 152, 0, 0.2);
                color: #ff9800;
            }
            .log-level.ERROR {
                background: rgba(244, 67, 54, 0.2);
                color: #f44336;
            }
            .log-category {
                background: rgba(128, 128, 128, 0.15);
                color: var(--text-muted);
                padding: 0 4px;
                border-radius: 3px;
                font-size: 10px;
                white-space: nowrap;
                flex-shrink: 0;
            }
            .log-message {
                color: var(--text-secondary);
                word-break: break-word;
            }
            .toggle-row {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
                font-size: var(--font-size-xs);
                color: var(--text-secondary);
            }
            .toggle-row input[type='checkbox'] {
                accent-color: var(--accent);
            }

            /* State Inspector */
            .state-section {
                margin-bottom: var(--space-sm);
            }
            .state-header {
                display: flex;
                align-items: center;
                gap: var(--space-xs);
                cursor: pointer;
                padding: 4px 8px;
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                font-size: var(--font-size-xs);
                color: var(--text-primary);
                font-weight: var(--font-weight-medium);
            }
            .state-header:hover {
                background: var(--bg-hover);
            }
            .state-body {
                padding: var(--space-xs) var(--space-sm);
                font-family: var(--font-mono);
                font-size: 11px;
                color: var(--text-secondary);
            }
            .state-kv {
                display: flex;
                gap: var(--space-sm);
                padding: 2px 0;
            }
            .state-key {
                color: var(--text-muted);
                min-width: 140px;
                flex-shrink: 0;
            }
            .state-value {
                color: var(--text-primary);
                word-break: break-all;
            }

            /* Performance */
            .perf-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-sm);
            }
            .perf-item {
                padding: var(--space-sm);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
                border: 1px solid var(--border);
            }
            .perf-label {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                margin-bottom: 2px;
            }
            .perf-value {
                font-size: var(--font-size-sm);
                color: var(--text-primary);
                font-family: var(--font-mono);
            }
        `,
    ];

    static properties = {
        _screenshotFeedback: { state: true },
        _logEntries: { state: true },
        _logLevel: { state: true },
        _logCategory: { state: true },
        _logSearch: { state: true },
        _logAutoRefresh: { state: true },
        _runtimeState: { state: true },
        _runtimeAutoRefresh: { state: true },
        _expandedSections: { state: true },
        _perfData: { state: true },
        _perfAutoRefresh: { state: true },
        _snapshotFeedback: { state: true },
    };

    constructor() {
        super();
        this._screenshotFeedback = '';
        this._logEntries = [];
        this._logLevel = 'ALL';
        this._logCategory = '';
        this._logSearch = '';
        this._logAutoRefresh = false;
        this._runtimeState = null;
        this._runtimeAutoRefresh = false;
        this._expandedSections = {};
        this._perfData = null;
        this._perfAutoRefresh = false;
        this._snapshotFeedback = '';
        this._logTimer = null;
        this._runtimeTimer = null;
        this._perfTimer = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this._loadLogs();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._clearTimers();
    }

    _clearTimers() {
        if (this._logTimer) {
            clearInterval(this._logTimer);
            this._logTimer = null;
        }
        if (this._runtimeTimer) {
            clearInterval(this._runtimeTimer);
            this._runtimeTimer = null;
        }
        if (this._perfTimer) {
            clearInterval(this._perfTimer);
            this._perfTimer = null;
        }
    }

    // Screenshot Section
    async _captureScreenshot() {
        const result = await window.cheatingDaddy.debug.captureScreenshot();
        if (result.success) {
            this._screenshotFeedback = `Saved: ${result.path.split(/[\\/]/).pop()}`;
        } else {
            this._screenshotFeedback = `Error: ${result.error}`;
        }
    }

    async _copyScreenshot() {
        const result = await window.cheatingDaddy.debug.copyScreenshot();
        if (result.success) {
            this._screenshotFeedback = 'Copied to clipboard';
        } else {
            this._screenshotFeedback = `Error: ${result.error}`;
        }
    }

    async _openScreenshots() {
        const result = await window.cheatingDaddy.debug.openScreenshots();
        if (!result.success) {
            this._screenshotFeedback = `Error: ${result.error}`;
        }
    }

    // Log Viewer
    async _loadLogs() {
        const filters = {};
        if (this._logLevel !== 'ALL') filters.level = this._logLevel;
        if (this._logCategory) filters.category = this._logCategory;
        if (this._logSearch) filters.search = this._logSearch;
        this._logEntries = await window.cheatingDaddy.debug.getLogs(filters);
    }

    _toggleLogAutoRefresh(e) {
        this._logAutoRefresh = e.target.checked;
        if (this._logAutoRefresh) {
            this._logTimer = setInterval(() => this._loadLogs(), 2000);
        } else if (this._logTimer) {
            clearInterval(this._logTimer);
            this._logTimer = null;
        }
    }

    async _clearLogs() {
        await window.cheatingDaddy.debug.clearLogs();
        this._logEntries = [];
    }

    async _exportLogs() {
        const result = await window.cheatingDaddy.debug.exportLogs();
        if (result.success) {
            this._screenshotFeedback = `Logs exported: ${result.path.split(/[\\/]/).pop()}`;
        }
    }

    _onLogLevelChange(e) {
        this._logLevel = e.target.value;
        this._loadLogs();
    }

    _onLogCategoryChange(e) {
        this._logCategory = e.target.value;
        this._loadLogs();
    }

    _onLogSearchInput(e) {
        this._logSearch = e.target.value;
        this._loadLogs();
    }

    // Runtime State
    async _loadRuntimeState() {
        this._runtimeState = await window.cheatingDaddy.debug.getRuntimeState();
    }

    _toggleRuntimeAutoRefresh(e) {
        this._runtimeAutoRefresh = e.target.checked;
        if (this._runtimeAutoRefresh) {
            this._runtimeTimer = setInterval(() => this._loadRuntimeState(), 2000);
        } else if (this._runtimeTimer) {
            clearInterval(this._runtimeTimer);
            this._runtimeTimer = null;
        }
    }

    _toggleSection(key) {
        this._expandedSections = {
            ...this._expandedSections,
            [key]: !this._expandedSections[key],
        };
    }

    // Performance
    async _loadPerformance() {
        this._perfData = await window.cheatingDaddy.debug.getPerformance();
    }

    _togglePerfAutoRefresh(e) {
        this._perfAutoRefresh = e.target.checked;
        if (this._perfAutoRefresh) {
            this._perfTimer = setInterval(() => this._loadPerformance(), 2000);
        } else if (this._perfTimer) {
            clearInterval(this._perfTimer);
            this._perfTimer = null;
        }
    }

    // Snapshot
    async _exportSnapshot() {
        const result = await window.cheatingDaddy.debug.exportSnapshot();
        if (result.success) {
            this._snapshotFeedback = `Exported: ${result.path.split(/[\\/]/).pop()}`;
        } else {
            this._snapshotFeedback = `Error: ${result.error}`;
        }
    }

    // Formatting helpers
    _formatTime(ts) {
        const d = new Date(ts);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        const ms = String(d.getMilliseconds()).padStart(3, '0');
        return `${h}:${m}:${s}.${ms}`;
    }

    _formatUptime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    _formatBytes(bytes) {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    _renderStateSection(key, label, data) {
        const expanded = this._expandedSections[key];
        return html`
            <div class="state-section">
                <div class="state-header" @click=${() => this._toggleSection(key)}>${expanded ? '▾' : '▸'} ${label}</div>
                ${expanded && data
                    ? html`
                          <div class="state-body">
                              ${Object.entries(data).map(
                                  ([k, v]) => html`
                                      <div class="state-kv">
                                          <span class="state-key">${k}</span>
                                          <span class="state-value">${typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                      </div>
                                  `
                              )}
                          </div>
                      `
                    : ''}
            </div>
        `;
    }

    render() {
        const categories = [
            'startup',
            'rendering',
            'movement',
            'opacity',
            'theme',
            'hotkeys',
            'typing',
            'providers',
            'session',
            'IPC',
            'storage',
            'capture',
            'performance',
        ];

        const displayedLogs = this._logEntries.slice(-100);

        return html`
            <div class="page-container">
                <div class="page-header">
                    <h2 class="page-title">Developer</h2>
                    <p class="page-subtitle">Debug tools, logging, screenshots, and runtime inspection</p>
                </div>

                <!-- Screenshot System -->
                <div class="debug-section">
                    <h3>Screenshot System</h3>
                    <p>Capture the app window to file or clipboard</p>
                    <div class="btn-row">
                        <button class="debug-btn" @click=${this._captureScreenshot}>Capture to File</button>
                        <button class="debug-btn" @click=${this._copyScreenshot}>Copy to Clipboard</button>
                        <button class="debug-btn" @click=${this._openScreenshots}>Open Folder</button>
                    </div>
                    <div class="feedback ${this._screenshotFeedback.startsWith('Error') ? 'error' : 'success'}">${this._screenshotFeedback}</div>
                </div>

                <!-- Log Viewer -->
                <div class="debug-section">
                    <h3>Log Viewer</h3>
                    <div class="log-controls">
                        <select @change=${this._onLogLevelChange}>
                            <option value="ALL" ?selected=${this._logLevel === 'ALL'}>ALL</option>
                            <option value="TRACE" ?selected=${this._logLevel === 'TRACE'}>TRACE</option>
                            <option value="DEBUG" ?selected=${this._logLevel === 'DEBUG'}>DEBUG</option>
                            <option value="INFO" ?selected=${this._logLevel === 'INFO'}>INFO</option>
                            <option value="WARN" ?selected=${this._logLevel === 'WARN'}>WARN</option>
                            <option value="ERROR" ?selected=${this._logLevel === 'ERROR'}>ERROR</option>
                        </select>
                        <select @change=${this._onLogCategoryChange}>
                            <option value="">All Categories</option>
                            ${categories.map(c => html`<option value=${c} ?selected=${this._logCategory === c}>${c}</option>`)}
                        </select>
                        <input type="text" placeholder="Search..." .value=${this._logSearch} @input=${this._onLogSearchInput} />
                        <label class="toggle-row">
                            <input type="checkbox" .checked=${this._logAutoRefresh} @change=${this._toggleLogAutoRefresh} />
                            Auto-refresh
                        </label>
                    </div>
                    <div class="btn-row">
                        <button class="debug-btn" @click=${this._loadLogs}>Refresh</button>
                        <button class="debug-btn" @click=${this._clearLogs}>Clear</button>
                        <button class="debug-btn" @click=${this._exportLogs}>Export</button>
                    </div>
                    <div class="log-viewer">
                        ${displayedLogs.length === 0
                            ? html`<div style="color: var(--text-muted); padding: 8px;">No log entries</div>`
                            : displayedLogs.map(
                                  entry => html`
                                      <div class="log-entry">
                                          <span class="log-time">${this._formatTime(entry.timestamp)}</span>
                                          <span class="log-level ${entry.level}">${entry.level}</span>
                                          <span class="log-category">${entry.category}</span>
                                          <span class="log-message">${entry.message}</span>
                                      </div>
                                  `
                              )}
                    </div>
                </div>

                <!-- Runtime State Inspector -->
                <div class="debug-section">
                    <h3>Runtime State Inspector</h3>
                    <div class="btn-row">
                        <button class="debug-btn" @click=${this._loadRuntimeState}>Load State</button>
                        <label class="toggle-row">
                            <input type="checkbox" .checked=${this._runtimeAutoRefresh} @change=${this._toggleRuntimeAutoRefresh} />
                            Auto-refresh
                        </label>
                    </div>
                    ${this._runtimeState
                        ? html`
                              ${this._renderStateSection('keybinds', 'Keybinds', this._runtimeState.keybinds)}
                              ${this._renderStateSection('preferences', 'Preferences', this._runtimeState.preferences)}
                              ${this._renderStateSection('windowState', 'Window State', this._runtimeState.windowState)}
                              ${this._renderStateSection('windowBounds', 'Window Bounds', this._runtimeState.windowBounds)}
                              ${this._renderStateSection('typingSettings', 'Typing Settings', this._runtimeState.typingSettings)}
                              ${this._renderStateSection('typingStatus', 'Typing Status', this._runtimeState.typingStatus)}
                              ${this._renderStateSection('memoryUsage', 'Memory Usage', this._runtimeState.memoryUsage)}
                          `
                        : html`<div class="feedback">Click "Load State" to inspect runtime state</div>`}
                </div>

                <!-- Performance Metrics -->
                <div class="debug-section">
                    <h3>Performance Metrics</h3>
                    <div class="btn-row">
                        <button class="debug-btn" @click=${this._loadPerformance}>Refresh</button>
                        <label class="toggle-row">
                            <input type="checkbox" .checked=${this._perfAutoRefresh} @change=${this._togglePerfAutoRefresh} />
                            Auto-refresh
                        </label>
                    </div>
                    ${this._perfData
                        ? html`
                              <div class="perf-grid">
                                  <div class="perf-item">
                                      <div class="perf-label">Uptime</div>
                                      <div class="perf-value">${this._formatUptime(this._perfData.uptime)}</div>
                                  </div>
                                  <div class="perf-item">
                                      <div class="perf-label">Heap Used</div>
                                      <div class="perf-value">${this._formatBytes(this._perfData.memoryUsage?.heapUsed || 0)}</div>
                                  </div>
                                  <div class="perf-item">
                                      <div class="perf-label">Heap Total</div>
                                      <div class="perf-value">${this._formatBytes(this._perfData.memoryUsage?.heapTotal || 0)}</div>
                                  </div>
                                  <div class="perf-item">
                                      <div class="perf-label">RSS</div>
                                      <div class="perf-value">${this._formatBytes(this._perfData.memoryUsage?.rss || 0)}</div>
                                  </div>
                                  <div class="perf-item">
                                      <div class="perf-label">CPU User</div>
                                      <div class="perf-value">${Math.round((this._perfData.cpuUsage?.user || 0) / 1000)} ms</div>
                                  </div>
                                  <div class="perf-item">
                                      <div class="perf-label">CPU System</div>
                                      <div class="perf-value">${Math.round((this._perfData.cpuUsage?.system || 0) / 1000)} ms</div>
                                  </div>
                                  <div class="perf-item">
                                      <div class="perf-label">Electron</div>
                                      <div class="perf-value">${this._perfData.versions?.electron || 'N/A'}</div>
                                  </div>
                                  <div class="perf-item">
                                      <div class="perf-label">Chrome</div>
                                      <div class="perf-value">${this._perfData.versions?.chrome || 'N/A'}</div>
                                  </div>
                                  <div class="perf-item">
                                      <div class="perf-label">Node</div>
                                      <div class="perf-value">${this._perfData.versions?.node || 'N/A'}</div>
                                  </div>
                                  <div class="perf-item">
                                      <div class="perf-label">PID</div>
                                      <div class="perf-value">${this._perfData.pid || 'N/A'}</div>
                                  </div>
                              </div>
                          `
                        : html`<div class="feedback">Click "Refresh" to load performance metrics</div>`}
                </div>

                <!-- Debug Snapshot Export -->
                <div class="debug-section">
                    <h3>Debug Snapshot Export</h3>
                    <p>Export all state, settings, and logs into a single JSON file for diagnostics</p>
                    <div class="btn-row">
                        <button class="debug-btn" @click=${this._exportSnapshot}>Export Snapshot</button>
                    </div>
                    <div class="feedback ${this._snapshotFeedback.startsWith('Error') ? 'error' : 'success'}">${this._snapshotFeedback}</div>
                </div>
            </div>
        `;
    }
}

customElements.define('debug-view', DebugView);
