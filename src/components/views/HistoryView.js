import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class HistoryView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .unified-page {
                overflow-y: hidden;
            }

            .unified-wrap {
                height: 100%;
            }

            .search-wrap {
                position: relative;
                max-width: 280px;
            }

            .search-icon {
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                width: 14px;
                height: 14px;
                color: var(--text-muted);
                pointer-events: none;
            }

            .search-wrap .control {
                padding-left: 30px;
            }

            .list-shell {
                border: 1px solid var(--border);
                border-radius: var(--radius-md);
                background: var(--bg-surface);
                overflow: hidden;
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }

            .sessions-list {
                overflow-y: auto;
                flex: 1;
            }

            .session-card {
                width: 100%;
                border: none;
                border-bottom: 1px solid var(--border);
                background: transparent;
                text-align: left;
                padding: var(--space-sm) var(--space-md);
                cursor: pointer;
                transition: background var(--transition);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-sm);
            }

            .session-card:hover {
                background: var(--bg-hover);
            }

            .session-left {
                display: flex;
                flex-direction: column;
                gap: 2px;
                overflow: hidden;
            }

            .session-profile {
                color: var(--text-primary);
                font-size: var(--font-size-sm);
            }

            .session-date {
                color: var(--text-muted);
                font-size: var(--font-size-xs);
            }

            .session-preview {
                color: var(--text-muted);
                font-size: var(--font-size-xs);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 240px;
            }

            .session-profile-badge {
                display: inline-block;
                font-size: 10px;
                padding: 1px 6px;
                border-radius: 10px;
                background: var(--accent);
                color: var(--bg-app);
                font-weight: var(--font-weight-medium);
                white-space: nowrap;
            }

            .session-badge {
                color: var(--text-secondary);
                font-size: var(--font-size-xs);
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 2px 8px;
                white-space: nowrap;
            }

            .detail-top {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
            }

            .back-btn {
                border: none;
                background: none;
                color: var(--text-muted);
                padding: 0;
                font-size: var(--font-size-sm);
                cursor: pointer;
                display: flex;
                align-items: center;
            }

            .back-btn svg {
                cursor: pointer;
            }

            .back-btn:hover {
                color: var(--text-primary);
            }

            .detail-info {
                color: var(--text-secondary);
                font-size: var(--font-size-sm);
            }

            .tab-row {
                display: flex;
                gap: 6px;
            }

            .tab-btn {
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: transparent;
                color: var(--text-muted);
                padding: 6px 10px;
                cursor: pointer;
                font-size: var(--font-size-xs);
            }

            .tab-btn:hover {
                color: var(--text-secondary);
            }

            .tab-btn.active {
                color: var(--text-primary);
                border-color: var(--text-secondary);
            }

            .details-scroll {
                overflow-y: auto;
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
                gap: var(--space-sm);
                padding: var(--space-sm) 0;
            }

            .message-row {
                display: flex;
            }

            .message-row.user {
                justify-content: flex-end;
            }

            .message-row.ai,
            .message-row.screen {
                justify-content: flex-start;
            }

            .message {
                max-width: 75%;
                border-radius: 16px;
                padding: 8px 12px;
                word-break: break-word;
                user-select: text;
                cursor: text;
                font-size: var(--font-size-sm);
                line-height: 1.45;
            }

            .message-body {
                white-space: pre-wrap;
            }

            .message-meta {
                font-size: 10px;
                margin-top: 4px;
                opacity: 0.5;
            }

            .message-row.user .message {
                background: var(--accent);
                color: var(--bg-app);
                border-bottom-right-radius: 4px;
            }

            .message-row.user .message-meta {
                text-align: right;
            }

            .message-row.ai .message {
                background: var(--bg-elevated);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-bottom-left-radius: 4px;
            }

            .message-row.screen .message {
                background: var(--bg-elevated);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-bottom-left-radius: 4px;
            }

            .context-row {
                display: flex;
                align-items: flex-start;
                gap: var(--space-sm);
                padding: var(--space-sm);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
            }

            .context-key {
                width: 84px;
                color: var(--text-muted);
                font-size: var(--font-size-xs);
                text-transform: uppercase;
                letter-spacing: 0.4px;
                flex-shrink: 0;
            }

            .context-value {
                color: var(--text-primary);
                font-size: var(--font-size-sm);
                line-height: 1.45;
                white-space: pre-wrap;
                word-break: break-word;
                user-select: text;
                cursor: text;
            }

            .empty {
                color: var(--text-muted);
                font-size: var(--font-size-sm);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 120px;
                border: 1px dashed var(--border);
                border-radius: var(--radius-sm);
            }

            .list-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--space-sm) var(--space-md);
                border-bottom: 1px solid var(--border);
                background: var(--bg-elevated);
            }

            .list-header-left {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
            }

            .list-header-left label {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                cursor: pointer;
            }

            .bulk-actions {
                display: flex;
                gap: var(--space-sm);
            }

            .bulk-btn {
                font-size: var(--font-size-xs);
                padding: 4px 10px;
                border-radius: var(--radius-sm);
                border: 1px solid rgba(239,68,68,0.3);
                background: rgba(239,68,68,0.08);
                color: var(--danger, #EF4444);
                cursor: pointer;
                transition: background 0.15s;
            }

            .bulk-btn:hover {
                background: rgba(239,68,68,0.15);
            }

            .session-checkbox {
                width: 16px;
                height: 16px;
                cursor: pointer;
                accent-color: var(--accent);
                flex-shrink: 0;
            }

            .session-actions {
                display: flex;
                align-items: center;
                gap: 4px;
                opacity: 0;
                transition: opacity 0.15s;
            }

            .session-card:hover .session-actions {
                opacity: 1;
            }

            .session-action-btn {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: none;
                background: none;
                color: var(--text-muted);
                cursor: pointer;
                border-radius: var(--radius-sm);
                padding: 0;
            }

            .session-action-btn:hover {
                color: var(--text-primary);
                background: var(--bg-hover);
            }

            .session-action-btn.pinned {
                color: var(--accent);
            }

            .session-action-btn.delete:hover {
                color: var(--danger, #EF4444);
            }

            .pin-icon {
                width: 12px;
                height: 12px;
                color: var(--accent);
                margin-right: 4px;
            }

            .detail-actions {
                display: flex;
                gap: var(--space-sm);
                margin-top: var(--space-sm);
            }

            .action-btn {
                font-size: var(--font-size-xs);
                padding: 6px 12px;
                border-radius: var(--radius-sm);
                border: 1px solid var(--border);
                background: var(--bg-elevated);
                color: var(--text-primary);
                cursor: pointer;
                transition: background 0.15s, border-color 0.15s;
            }

            .action-btn:hover {
                background: var(--bg-hover);
                border-color: var(--text-muted);
            }

            .action-btn.primary {
                background: var(--accent);
                color: var(--bg-app);
                border-color: var(--accent);
            }

            .action-btn.primary:hover {
                opacity: 0.9;
            }

            .action-btn.danger {
                border-color: rgba(239,68,68,0.3);
                color: var(--danger, #EF4444);
            }

            .action-btn.danger:hover {
                background: rgba(239,68,68,0.1);
            }

            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--space-xl) var(--space-lg);
                text-align: center;
                flex: 1;
            }
            .empty-state-icon {
                font-size: 32px;
                margin-bottom: var(--space-md);
                opacity: 0.6;
            }
            .empty-state-title {
                font-size: var(--font-size-md);
                font-weight: var(--font-weight-semibold);
                color: var(--text-primary);
                margin-bottom: var(--space-xs);
            }
            .empty-state-text {
                font-size: var(--font-size-sm);
                color: var(--text-muted);
                max-width: 280px;
            }
        `,
    ];

    static properties = {
        sessions: { type: Array },
        selectedSession: { type: Object },
        selectedSessionId: { type: String },
        loading: { type: Boolean },
        activeTab: { type: String },
        searchQuery: { type: String },
        _selectedIds: { state: true },
        _selectAll: { state: true },
        _pinnedIds: { state: true },
        _renamingId: { state: true },
        _renameValue: { state: true },
    };

    constructor() {
        super();
        this.sessions = [];
        this.selectedSession = null;
        this.selectedSessionId = null;
        this.loading = true;
        this.activeTab = 'conversation';
        this.searchQuery = '';
        this._selectedIds = new Set();
        this._selectAll = false;
        this._pinnedIds = [];
        this._renamingId = null;
        this._renameValue = '';
        this._loadPinnedIds();
        this.loadSessions();
    }

    async _loadPinnedIds() {
        const prefs = await cheatingDaddy.storage.getPreferences();
        this._pinnedIds = prefs.pinnedSessions || [];
        this.requestUpdate();
    }

    async loadSessions() {
        try {
            this.loading = true;
            this.sessions = await cheatingDaddy.storage.getAllSessions();
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.sessions = [];
        } finally {
            this.loading = false;
            this.requestUpdate();
        }
    }

    async openSession(sessionId) {
        try {
            const session = await cheatingDaddy.storage.getSession(sessionId);
            if (session) {
                this.selectedSession = session;
                this.selectedSessionId = sessionId;
                this.activeTab = 'conversation';
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }
    }

    closeSession() {
        this.selectedSession = null;
        this.selectedSessionId = null;
        this.activeTab = 'conversation';
    }

    handleSearchInput(e) {
        this.searchQuery = e.target.value;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
            exam: 'Exam Assistant',
            debug: 'Debug / Code Review',
            custom: 'Custom',
        };
    }

    _getProfileLabel(session) {
        if (session.profile) {
            const names = this.getProfileNames();
            return names[session.profile] || session.profile;
        }
        return 'Session';
    }

    _getFirstMessagePreview(session) {
        const history = session.conversationHistory || [];
        for (const turn of history) {
            if (turn.transcription) {
                const text = turn.transcription.trim();
                return text.length > 60 ? text.substring(0, 60) + '...' : text;
            }
            if (turn.ai_response) {
                const text = turn.ai_response.trim();
                return text.length > 60 ? text.substring(0, 60) + '...' : text;
            }
        }
        return '';
    }

    getSessionPreview(session) {
        const parts = [];
        if (session.messageCount > 0) parts.push(`${session.messageCount} messages`);
        if (session.screenAnalysisCount > 0) parts.push(`${session.screenAnalysisCount} screen`);
        if (session.profile) {
            const profileNames = this.getProfileNames();
            parts.push(profileNames[session.profile] || session.profile);
        }
        return parts.length > 0 ? parts.join(' · ') : 'Empty session';
    }

    getFilteredSessions() {
        let filtered = this.sessions;
        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(session => {
                const preview = this.getSessionPreview(session).toLowerCase();
                const date = this.formatDate(session.createdAt).toLowerCase();
                return preview.includes(q) || date.includes(q);
            });
        }
        // Pinned sessions appear first, then rest sorted by date (existing order)
        const pinned = filtered.filter(s => this._pinnedIds.includes(s.sessionId));
        const unpinned = filtered.filter(s => !this._pinnedIds.includes(s.sessionId));
        return [...pinned, ...unpinned];
    }

    collectConversation(session) {
        const messages = [];
        const history = session.conversationHistory || [];
        history.forEach(turn => {
            if (turn.transcription) messages.push({ type: 'user', content: turn.transcription, timestamp: turn.timestamp });
            if (turn.ai_response) messages.push({ type: 'ai', content: turn.ai_response, timestamp: turn.timestamp });
        });
        // Include screen analysis responses
        const screenHistory = session.screenAnalysisHistory || [];
        screenHistory.forEach(entry => {
            if (entry.response) {
                messages.push({ type: 'ai', content: entry.response, timestamp: entry.timestamp });
            }
        });
        // Sort by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
        return messages;
    }

    _toggleSelectAll() {
        const filtered = this.getFilteredSessions();
        if (this._selectAll) {
            this._selectedIds = new Set();
            this._selectAll = false;
        } else {
            this._selectedIds = new Set(filtered.map(s => s.sessionId));
            this._selectAll = true;
        }
        this.requestUpdate();
    }

    _toggleSessionSelect(sessionId, e) {
        e.stopPropagation();
        const updated = new Set(this._selectedIds);
        if (updated.has(sessionId)) {
            updated.delete(sessionId);
        } else {
            updated.add(sessionId);
        }
        this._selectedIds = updated;
        this._selectAll = updated.size === this.getFilteredSessions().length;
        this.requestUpdate();
    }

    async _bulkDelete() {
        for (const id of this._selectedIds) {
            await cheatingDaddy.storage.deleteSession(id);
        }
        this._selectedIds = new Set();
        this._selectAll = false;
        await this.loadSessions();
    }

    _isPinned(sessionId) {
        return this._pinnedIds.includes(sessionId);
    }

    async _togglePin(sessionId, e) {
        e.stopPropagation();
        const idx = this._pinnedIds.indexOf(sessionId);
        if (idx >= 0) {
            this._pinnedIds = [...this._pinnedIds.slice(0, idx), ...this._pinnedIds.slice(idx + 1)];
        } else {
            this._pinnedIds = [...this._pinnedIds, sessionId];
        }
        await cheatingDaddy.storage.updatePreference('pinnedSessions', this._pinnedIds);
        this.requestUpdate();
    }

    async _deleteSession(sessionId, e) {
        if (e) e.stopPropagation();
        await cheatingDaddy.storage.deleteSession(sessionId);
        await this.loadSessions();
    }

    _continueSession() {
        if (this.selectedSessionId) {
            window.cheatingDaddy.events.dispatchEvent(
                new CustomEvent('continue-session', { detail: { sessionId: this.selectedSessionId } })
            );
        }
    }

    async _exportSession() {
        if (this.selectedSession) {
            try {
                await navigator.clipboard.writeText(JSON.stringify(this.selectedSession, null, 2));
            } catch (err) {
                console.error('Failed to copy session:', err);
            }
        }
    }

    async _deleteCurrentSession() {
        if (this.selectedSessionId) {
            await cheatingDaddy.storage.deleteSession(this.selectedSessionId);
            this.closeSession();
            await this.loadSessions();
        }
    }

    renderTabContent() {
        if (!this.selectedSession) return html`<div class="empty">Select a session.</div>`;

        if (this.activeTab === 'conversation') {
            const messages = this.collectConversation(this.selectedSession);
            if (!messages.length) return html`<div class="empty">No conversation data.</div>`;
            return messages.map(
                msg => html`
                    <div class="message-row ${msg.type}">
                        <div class="message">
                            <div class="message-body">${msg.content}</div>
                            <div class="message-meta">${this.formatTime(msg.timestamp)}</div>
                        </div>
                    </div>
                `
            );
        }

        if (this.activeTab === 'screen') {
            const screen = this.selectedSession.screenAnalysisHistory || [];
            if (!screen.length) return html`<div class="empty">No screen analysis data.</div>`;
            return screen.map(
                entry => html`
                    <div class="message-row screen">
                        <div class="message">
                            <div class="message-body">${entry.response || ''}</div>
                            <div class="message-meta">${this.formatTime(entry.timestamp)}</div>
                        </div>
                    </div>
                `
            );
        }

        const profile = this.selectedSession.profile;
        const prompt = this.selectedSession.customPrompt;
        if (!profile && !prompt) return html`<div class="empty">No context saved for this session.</div>`;

        return html`
            ${profile
                ? html`
                      <div class="context-row">
                          <span class="context-key">Profile</span>
                          <span class="context-value">${this.getProfileNames()[profile] || profile}</span>
                      </div>
                  `
                : ''}
            ${prompt
                ? html`
                      <div class="context-row">
                          <span class="context-key">Prompt</span>
                          <span class="context-value">${prompt}</span>
                      </div>
                  `
                : ''}
        `;
    }

    renderListView() {
        const filteredSessions = this.getFilteredSessions();
        return html`
            <div class="page-title">History</div>

            <div class="search-wrap">
                <svg
                    class="search-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input class="control" type="text" placeholder="Search sessions..." .value=${this.searchQuery} @input=${this.handleSearchInput} />
            </div>

            <section class="list-shell">
                <div class="list-header">
                    <div class="list-header-left">
                        <input
                            type="checkbox"
                            class="session-checkbox"
                            .checked=${this._selectAll}
                            @change=${() => this._toggleSelectAll()}
                        />
                        <label @click=${() => this._toggleSelectAll()}>Select All</label>
                    </div>
                    ${this._selectedIds.size > 0
                        ? html`
                              <div class="bulk-actions">
                                  <button class="bulk-btn" @click=${() => this._bulkDelete()}>
                                      Delete Selected (${this._selectedIds.size})
                                  </button>
                              </div>
                          `
                        : ''}
                </div>
                <div class="sessions-list">
                    ${this.loading ? html`<div class="empty" style="margin:var(--space-md);">Loading sessions...</div>` : ''}
                    ${!this.loading && this.sessions.length === 0 ? html`
                        <div class="empty-state">
                            <div class="empty-state-icon">📋</div>
                            <div class="empty-state-title">No sessions yet</div>
                            <div class="empty-state-text">Start a session to see your conversation history here.</div>
                        </div>
                    ` : ''}
                    ${!this.loading && this.sessions.length > 0 && filteredSessions.length === 0
                        ? html`<div class="empty" style="margin:var(--space-md);">No matching sessions.</div>`
                        : ''}
                    ${!this.loading
                        ? filteredSessions.map(
                              session => html`
                                  <button class="session-card" @click=${() => this.openSession(session.sessionId)}>
                                      <input
                                          type="checkbox"
                                          class="session-checkbox"
                                          .checked=${this._selectedIds.has(session.sessionId)}
                                          @click=${(e) => this._toggleSessionSelect(session.sessionId, e)}
                                          @change=${(e) => e.stopPropagation()}
                                      />
                                      <div class="session-left">
                                          <span class="session-profile">
                                              ${this._isPinned(session.sessionId)
                                                  ? html`<svg class="pin-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>`
                                                  : ''}
                                              ${session.profile
                                                  ? html`<span class="session-profile-badge">${this._getProfileLabel(session)}</span>`
                                                  : 'Session'}
                                          </span>
                                          <span class="session-date"
                                              >${this.formatDate(session.createdAt)} · ${this.formatTime(session.createdAt)}</span
                                          >
                                          ${this._getFirstMessagePreview(session)
                                              ? html`<span class="session-preview">${this._getFirstMessagePreview(session)}</span>`
                                              : ''}
                                      </div>
                                      <div class="session-actions">
                                          <button
                                              class="session-action-btn ${this._isPinned(session.sessionId) ? 'pinned' : ''}"
                                              @click=${(e) => this._togglePin(session.sessionId, e)}
                                              title="${this._isPinned(session.sessionId) ? 'Unpin' : 'Pin'}"
                                          >
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="${this._isPinned(session.sessionId) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                                              </svg>
                                          </button>
                                          <button
                                              class="session-action-btn delete"
                                              @click=${(e) => this._deleteSession(session.sessionId, e)}
                                              title="Delete"
                                          >
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                  <polyline points="3 6 5 6 21 6"/>
                                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                              </svg>
                                          </button>
                                      </div>
                                      ${session.messageCount > 0 ? html`<span class="session-badge">${session.messageCount}</span>` : ''}
                                  </button>
                              `
                          )
                        : ''}
                </div>
            </section>
        `;
    }

    renderDetailView() {
        const conversationCount = this.collectConversation(this.selectedSession).length;
        const screenCount = this.selectedSession?.screenAnalysisHistory?.length || 0;

        return html`
            <div class="page-title">Session Detail</div>
            <div class="detail-top">
                <button class="back-btn" @click=${this.closeSession}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <span class="detail-info"
                    >${this._getProfileLabel(this.selectedSession)} · ${this.formatDate(this.selectedSession.createdAt)} ·
                    ${this.formatTime(this.selectedSession.createdAt)}</span
                >
            </div>
            <div class="detail-actions">
                <button class="action-btn primary" @click=${() => this._continueSession()}>Continue Session</button>
                <button class="action-btn" @click=${() => this._exportSession()}>Export</button>
                <button class="action-btn danger" @click=${() => this._deleteCurrentSession()}>Delete</button>
            </div>
            <div class="tab-row">
                <button
                    class="tab-btn ${this.activeTab === 'conversation' ? 'active' : ''}"
                    @click=${() => {
                        this.activeTab = 'conversation';
                    }}
                >
                    Conversation (${conversationCount})
                </button>
                <button
                    class="tab-btn ${this.activeTab === 'screen' ? 'active' : ''}"
                    @click=${() => {
                        this.activeTab = 'screen';
                    }}
                >
                    Screen (${screenCount})
                </button>
                <button
                    class="tab-btn ${this.activeTab === 'context' ? 'active' : ''}"
                    @click=${() => {
                        this.activeTab = 'context';
                    }}
                >
                    Context
                </button>
            </div>
            <section class="details-scroll">${this.renderTabContent()}</section>
        `;
    }

    render() {
        return html`
            <div class="unified-page">
                <div class="unified-wrap">${this.selectedSession ? this.renderDetailView() : this.renderListView()}</div>
            </div>
        `;
    }
}

customElements.define('history-view', HistoryView);
