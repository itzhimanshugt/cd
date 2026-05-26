const EventEmitter = require('events');

class SessionService extends EventEmitter {
    constructor() {
        super();
        this._session = null;
        this._active = false;
        this._provider = null;
        this._profile = null;
        this._startTime = null;
        this._connected = false;
    }

    start(params = {}) {
        this._active = true;
        this._provider = params.provider || null;
        this._profile = params.profile || null;
        this._startTime = Date.now();
        this._connected = true;
        this.emit('started', this.getStatus());
    }

    stop() {
        this._active = false;
        this._session = null;
        this._connected = false;
        const status = this.getStatus();
        this._startTime = null;
        this._provider = null;
        this._profile = null;
        this.emit('stopped', status);
    }

    isActive() {
        return this._active;
    }

    getStatus() {
        return {
            active: this._active,
            provider: this._provider,
            profile: this._profile,
            duration: this._startTime ? Date.now() - this._startTime : 0,
            connected: this._connected,
        };
    }

    setSession(sessionObj) {
        this._session = sessionObj;
    }

    getSession() {
        return this._session;
    }

    setConnected(connected) {
        this._connected = connected;
        if (!connected && this._active) {
            this.emit('reconnecting', this.getStatus());
        }
    }
}

module.exports = { SessionService };
