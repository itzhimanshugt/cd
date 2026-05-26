import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AssistantView extends LitElement {
    static styles = css`
        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--bg-app);
        }

        * {
            font-family: var(--font);
            font-weight: var(--response-font-weight, 400);
            cursor: default;
        }

        /* ── Messages container ── */

        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: var(--space-md);
            scroll-behavior: smooth;
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
        }

        .messages-container::-webkit-scrollbar {
            width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
            background: transparent;
        }

        .messages-container::-webkit-scrollbar-thumb {
            background: var(--border-strong);
            border-radius: 3px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
            background: #444444;
        }

        /* ── Chat bubbles ── */

        .message-row {
            display: flex;
            flex-direction: column;
            max-width: 85%;
        }

        .message-row.ai {
            align-self: flex-start;
            align-items: flex-start;
        }

        .message-row.user {
            align-self: flex-end;
            align-items: flex-end;
        }

        .message-bubble {
            padding: var(--space-sm) var(--space-md);
            font-size: var(--response-font-size, 15px);
            line-height: var(--line-height);
            word-wrap: break-word;
            overflow-wrap: break-word;
            user-select: text;
            cursor: text;
        }

        .message-bubble * {
            user-select: text;
            cursor: text;
        }

        .message-bubble a {
            cursor: pointer;
        }

        .message-bubble.ai {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            border-bottom-left-radius: 4px;
            color: var(--text-primary);
        }

        .message-bubble.user {
            background: var(--accent);
            color: var(--bg-app);
            border-radius: 16px;
            border-bottom-right-radius: 4px;
        }

        .message-timestamp {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 4px;
            padding: 0 var(--space-sm);
        }

        /* ── Markdown inside bubbles ── */

        .message-bubble h1,
        .message-bubble h2,
        .message-bubble h3,
        .message-bubble h4,
        .message-bubble h5,
        .message-bubble h6 {
            margin: 0.8em 0 0.4em 0;
            font-weight: var(--font-weight-semibold);
        }

        .message-bubble.ai h1,
        .message-bubble.ai h2,
        .message-bubble.ai h3,
        .message-bubble.ai h4,
        .message-bubble.ai h5,
        .message-bubble.ai h6 {
            color: var(--text-primary);
        }

        .message-bubble h1 {
            font-size: 1.4em;
        }
        .message-bubble h2 {
            font-size: 1.25em;
        }
        .message-bubble h3 {
            font-size: 1.1em;
        }
        .message-bubble h4,
        .message-bubble h5,
        .message-bubble h6 {
            font-size: 1em;
        }

        .message-bubble p {
            margin: 0.5em 0;
        }

        .message-bubble p:first-child {
            margin-top: 0;
        }

        .message-bubble p:last-child {
            margin-bottom: 0;
        }

        .message-bubble ul,
        .message-bubble ol {
            margin: 0.5em 0;
            padding-left: 1.4em;
        }

        .message-bubble li {
            margin: 0.2em 0;
        }

        .message-bubble blockquote {
            margin: 0.6em 0;
            padding: 0.4em 0.8em;
            border-left: 2px solid var(--border-strong);
            background: var(--bg-elevated);
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }

        .message-bubble code {
            background: var(--bg-elevated);
            padding: 0.1em 0.35em;
            border-radius: var(--radius-sm);
            font-family: var(--font-mono);
            font-size: 0.85em;
        }

        .message-bubble.user code {
            background: rgba(0, 0, 0, 0.15);
        }

        .message-bubble pre {
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: var(--space-sm);
            overflow-x: auto;
            margin: 0.6em 0;
        }

        .message-bubble.user pre {
            background: rgba(0, 0, 0, 0.15);
            border-color: rgba(0, 0, 0, 0.2);
        }

        .message-bubble pre code {
            background: none;
            padding: 0;
        }

        .message-bubble a {
            color: var(--accent);
            text-decoration: underline;
            text-underline-offset: 2px;
        }

        .message-bubble.user a {
            color: inherit;
        }

        .message-bubble strong,
        .message-bubble b {
            font-weight: var(--font-weight-semibold);
        }

        .message-bubble hr {
            border: none;
            border-top: 1px solid var(--border);
            margin: 1em 0;
        }

        .message-bubble table {
            border-collapse: collapse;
            width: 100%;
            margin: 0.6em 0;
        }

        .message-bubble th,
        .message-bubble td {
            border: 1px solid var(--border);
            padding: var(--space-xs) var(--space-sm);
            text-align: left;
        }

        .message-bubble th {
            background: var(--bg-elevated);
            font-weight: var(--font-weight-semibold);
        }

        /* ── Listening placeholder ── */

        .listening-placeholder {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            font-size: var(--font-size-sm);
            padding: var(--space-lg);
        }

        /* ── Page indicator ── */

        .page-indicator {
            text-align: center;
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            padding: 4px 0;
            font-family: var(--font-mono);
        }

        /* ── Bottom input bar ── */

        .input-bar {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md);
            background: var(--bg-app);
        }

        .input-bar-inner {
            display: flex;
            align-items: center;
            flex: 1;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: 100px;
            padding: 0 var(--space-md);
            height: 32px;
            transition: border-color var(--transition);
        }

        .input-bar-inner:focus-within {
            border-color: var(--accent);
        }

        .input-bar-inner input {
            flex: 1;
            background: none;
            color: var(--text-primary);
            border: none;
            padding: 0;
            font-size: var(--font-size-sm);
            font-family: var(--font);
            height: 100%;
            outline: none;
        }

        .input-bar-inner input::placeholder {
            color: var(--text-muted);
        }

        .analyze-btn {
            position: relative;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            color: var(--text-primary);
            cursor: pointer;
            font-size: var(--font-size-xs);
            font-family: var(--font-mono);
            white-space: nowrap;
            padding: var(--space-xs) var(--space-md);
            border-radius: 100px;
            height: 32px;
            display: flex;
            align-items: center;
            gap: 4px;
            transition:
                border-color 0.4s ease,
                background var(--transition);
            flex-shrink: 0;
            overflow: hidden;
        }

        .analyze-btn:hover:not(.analyzing) {
            border-color: var(--accent);
            background: var(--bg-surface);
        }

        .analyze-btn.analyzing {
            cursor: default;
            border-color: transparent;
        }

        .analyze-btn-content {
            display: flex;
            align-items: center;
            gap: 4px;
            transition: opacity 0.4s ease;
            z-index: 1;
            position: relative;
        }

        .analyze-btn.analyzing .analyze-btn-content {
            opacity: 0;
        }

        .analyze-canvas {
            position: absolute;
            inset: -1px;
            width: calc(100% + 2px);
            height: calc(100% + 2px);
            pointer-events: none;
        }
    `;

    static properties = {
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedProfile: { type: String },
        onSendText: { type: Function },
        shouldAnimateResponse: { type: Boolean },
        isAnalyzing: { type: Boolean, state: true },
        _pages: { state: true },
        _currentPage: { state: true },
    };

    constructor() {
        super();
        this.responses = [];
        this.currentResponseIndex = -1;
        this.selectedProfile = 'interview';
        this.onSendText = () => {};
        this.isAnalyzing = false;
        this._animFrame = null;
        this._pages = [[]];
        this._currentPage = 0;
        this._lastResponseCount = 0;
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
            exam: 'Exam Assistant',
        };
    }

    renderMarkdown(content) {
        if (typeof window !== 'undefined' && window.marked) {
            try {
                window.marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false,
                });
                return window.marked.parse(content);
            } catch (error) {
                console.warn('Error parsing markdown:', error);
                return content;
            }
        }
        return content;
    }

    scrollResponseUp() {
        const container = this.shadowRoot.querySelector('.messages-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3;
            container.scrollTop = Math.max(0, container.scrollTop - scrollAmount);
        }
    }

    scrollResponseDown() {
        const container = this.shadowRoot.querySelector('.messages-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3;
            container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + scrollAmount);
        }
    }

    connectedCallback() {
        super.connectedCallback();

        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            this.handlePreviousResponse = () => {};
            this.handleNextResponse = () => {};
            this.handleScrollUp = () => this.scrollResponseUp();
            this.handleScrollDown = () => this.scrollResponseDown();

            ipcRenderer.on('navigate-previous-response', this.handlePreviousResponse);
            ipcRenderer.on('navigate-next-response', this.handleNextResponse);
            ipcRenderer.on('scroll-response-up', this.handleScrollUp);
            ipcRenderer.on('scroll-response-down', this.handleScrollDown);
        }

        // Keyboard shortcut for page navigation
        this._pageKeyHandler = e => {
            if (e.ctrlKey && e.shiftKey && e.key === 'ArrowRight') {
                e.preventDefault();
                // Create new page only if current page has messages
                if (this._pages[this._currentPage].length > 0) {
                    const updatedPages = [...this._pages];
                    updatedPages.push([]);
                    this._pages = updatedPages;
                    this._currentPage = this._pages.length - 1;
                    this.requestUpdate();
                    this._scrollToTop();
                }
            } else if (e.ctrlKey && e.shiftKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                if (this._currentPage > 0) {
                    this._currentPage = this._currentPage - 1;
                    this.requestUpdate();
                    this._scrollToTop();
                }
            }
        };
        window.addEventListener('keydown', this._pageKeyHandler);

        // Listen for analyze triggered via hotkey (so animation plays)
        if (window.cheatingDaddy && window.cheatingDaddy.events) {
            this._onAnalyzeTriggered = () => {
                if (!this.isAnalyzing) {
                    this.isAnalyzing = true;
                    this._responseCountWhenStarted = this.responses.length;
                    this.requestUpdate();
                }
            };
            window.cheatingDaddy.events.addEventListener('analyze-triggered', this._onAnalyzeTriggered);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._stopWaveformAnimation();

        if (this._pageKeyHandler) {
            window.removeEventListener('keydown', this._pageKeyHandler);
        }

        if (window.cheatingDaddy && window.cheatingDaddy.events && this._onAnalyzeTriggered) {
            window.cheatingDaddy.events.removeEventListener('analyze-triggered', this._onAnalyzeTriggered);
        }

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            if (this.handlePreviousResponse) ipcRenderer.removeListener('navigate-previous-response', this.handlePreviousResponse);
            if (this.handleNextResponse) ipcRenderer.removeListener('navigate-next-response', this.handleNextResponse);
            if (this.handleScrollUp) ipcRenderer.removeListener('scroll-response-up', this.handleScrollUp);
            if (this.handleScrollDown) ipcRenderer.removeListener('scroll-response-down', this.handleScrollDown);
        }
    }

    async handleSendText() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        if (textInput && textInput.value.trim()) {
            const message = textInput.value.trim();
            textInput.value = '';
            // Add user message to current page
            const updatedPages = [...this._pages];
            updatedPages[this._currentPage] = [...updatedPages[this._currentPage], { type: 'user', content: message, timestamp: Date.now() }];
            this._pages = updatedPages;
            this.requestUpdate();
            this._scrollToBottom();
            await this.onSendText(message);
        }
    }

    handleTextKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    async handleScreenAnswer() {
        if (this.isAnalyzing) return;
        if (window.captureManualScreenshot) {
            this.isAnalyzing = true;
            this._responseCountWhenStarted = this.responses.length;
            window.captureManualScreenshot();
        }
    }

    _startWaveformAnimation() {
        const canvas = this.shadowRoot.querySelector('.analyze-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const dangerColor = getComputedStyle(this).getPropertyValue('--danger').trim() || '#EF4444';
        const startTime = performance.now();
        const FADE_IN = 0.5;
        const PARTICLE_SPREAD = 4;
        const PARTICLE_COUNT = 250;

        const w = rect.width;
        const h = rect.height;
        const r = h / 2;
        const straightLen = w - 2 * r;
        const arcLen = Math.PI * r;
        const perimeter = 2 * straightLen + 2 * arcLen;

        const pointOnPerimeter = d => {
            d = ((d % perimeter) + perimeter) % perimeter;
            if (d < straightLen) {
                return { x: r + d, y: 0, nx: 0, ny: 1 };
            }
            d -= straightLen;
            if (d < arcLen) {
                const angle = -Math.PI / 2 + (d / arcLen) * Math.PI;
                return {
                    x: w - r + Math.cos(angle) * r,
                    y: r + Math.sin(angle) * r,
                    nx: -Math.cos(angle),
                    ny: -Math.sin(angle),
                };
            }
            d -= arcLen;
            if (d < straightLen) {
                return { x: w - r - d, y: h, nx: 0, ny: -1 };
            }
            d -= straightLen;
            const angle = Math.PI / 2 + (d / arcLen) * Math.PI;
            return {
                x: r + Math.cos(angle) * r,
                y: r + Math.sin(angle) * r,
                nx: -Math.cos(angle),
                ny: -Math.sin(angle),
            };
        };

        const seeds = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            seeds.push({ pos: Math.random(), drift: Math.random(), depthSeed: Math.random() });
        }

        const draw = now => {
            const elapsed = (now - startTime) / 1000;
            const fade = Math.min(1, elapsed / FADE_IN);

            ctx.clearRect(0, 0, w, h);

            ctx.fillStyle = dangerColor;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const s = seeds[i];
                const along = (s.pos + s.drift * elapsed * 0.03) * perimeter;
                const depth = s.depthSeed * PARTICLE_SPREAD;
                const density = 1 - depth / PARTICLE_SPREAD;

                if (Math.random() > density) continue;

                const p = pointOnPerimeter(along);
                const px = p.x + p.nx * depth;
                const py = p.y + p.ny * depth;
                const size = 0.8 + density * 0.6;

                ctx.globalAlpha = fade * density * 0.85;
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();
            }

            const midY = h / 2;
            const waves = [
                { freq: 3, amp: 0.35, speed: 2.5, opacity: 0.9, width: 1.8 },
                { freq: 5, amp: 0.2, speed: 3.5, opacity: 0.5, width: 1.2 },
                { freq: 7, amp: 0.12, speed: 5, opacity: 0.3, width: 0.8 },
            ];

            for (const wave of waves) {
                ctx.beginPath();
                ctx.strokeStyle = dangerColor;
                ctx.globalAlpha = wave.opacity * fade;
                ctx.lineWidth = wave.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                for (let x = 0; x <= w; x++) {
                    const norm = x / w;
                    const envelope = Math.sin(norm * Math.PI);
                    const y = midY + Math.sin(norm * Math.PI * 2 * wave.freq + elapsed * wave.speed) * (midY * wave.amp) * envelope;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
            this._animFrame = requestAnimationFrame(draw);
        };

        this._animFrame = requestAnimationFrame(draw);
    }

    _stopWaveformAnimation() {
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
        const canvas = this.shadowRoot.querySelector('.analyze-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    _scrollToBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.messages-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
    }

    _scrollToTop() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.messages-container');
            if (container) {
                container.scrollTop = 0;
            }
        }, 0);
    }

    _formatTimestamp(ts) {
        const d = new Date(ts);
        const h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (changedProperties.has('isAnalyzing')) {
            if (this.isAnalyzing) {
                this._startWaveformAnimation();
            } else {
                this._stopWaveformAnimation();
            }
        }

        if (changedProperties.has('responses')) {
            // Add new AI responses to the LAST page (not current page)
            if (this.responses.length > this._lastResponseCount) {
                const newResponses = this.responses.slice(this._lastResponseCount);
                const newMessages = newResponses.map(content => ({
                    type: 'ai',
                    content,
                    timestamp: Date.now(),
                }));
                const updatedPages = [...this._pages];
                // Always append to the LAST page, not current page
                const lastPageIdx = updatedPages.length - 1;
                updatedPages[lastPageIdx] = [...updatedPages[lastPageIdx], ...newMessages];
                this._pages = updatedPages;
                // Auto-navigate to last page
                this._currentPage = lastPageIdx;
                this._scrollToBottom();
            } else if (this.responses.length > 0 && this.responses.length === this._lastResponseCount) {
                // Update the last AI message on the LAST page (streaming update)
                const lastPageIdx = this._pages.length - 1;
                const currentMessages = this._pages[lastPageIdx];
                const lastAiIdx = this._findLastAiMessageIndex(currentMessages);
                if (lastAiIdx >= 0) {
                    const updatedMessages = [...currentMessages];
                    updatedMessages[lastAiIdx] = { ...updatedMessages[lastAiIdx], content: this.responses[this.responses.length - 1] };
                    const updatedPages = [...this._pages];
                    updatedPages[lastPageIdx] = updatedMessages;
                    this._pages = updatedPages;
                    this._currentPage = lastPageIdx;
                }
            }
            this._lastResponseCount = this.responses.length;

            if (this.isAnalyzing && this.responses.length > this._responseCountWhenStarted) {
                this.isAnalyzing = false;
            }
        }

        // Reset pages when responses are cleared (new session)
        if (changedProperties.has('responses') && this.responses.length === 0) {
            this._pages = [[]];
            this._currentPage = 0;
            this._lastResponseCount = 0;
        }
    }

    _findLastAiMessageIndex(messages) {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].type === 'ai') return i;
        }
        return -1;
    }

    render() {
        const profileNames = this.getProfileNames();
        const currentMessages = this._pages[this._currentPage] || [];
        const hasMessages = currentMessages.length > 0;

        return html`
            ${hasMessages
                ? html`
                      <div class="messages-container">
                          ${currentMessages.map(
                              msg => html`
                                  <div class="message-row ${msg.type}">
                                      <div class="message-bubble ${msg.type}" .innerHTML=${msg.type === 'ai' ? this.renderMarkdown(msg.content) : ''}>
                                          ${msg.type === 'user' ? msg.content : ''}
                                      </div>
                                      <div class="message-timestamp">${this._formatTimestamp(msg.timestamp)}</div>
                                  </div>
                              `
                          )}
                      </div>
                  `
                : html` <div class="listening-placeholder">Listening to your ${profileNames[this.selectedProfile] || 'session'}...</div> `}
            ${this._pages.length > 1 ? html` <div class="page-indicator">Page ${this._currentPage + 1} / ${this._pages.length}</div> ` : ''}

            <div class="input-bar">
                <div class="input-bar-inner">
                    <input type="text" id="textInput" placeholder="Follow up..." @keydown=${this.handleTextKeydown} />
                </div>
                <button class="analyze-btn ${this.isAnalyzing ? 'analyzing' : ''}" @click=${this.handleScreenAnswer}>
                    <canvas class="analyze-canvas"></canvas>
                    <span class="analyze-btn-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                            <path
                                fill="none"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 3v7h6l-8 11v-7H5z"
                            />
                        </svg>
                        Analyze Screen
                    </span>
                </button>
            </div>
        `;
    }
}

customElements.define('assistant-view', AssistantView);
