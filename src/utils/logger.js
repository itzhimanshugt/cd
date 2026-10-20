'use strict';
const fs = require('fs');
const path = require('path');
const storage = require('../storage');

const LEVELS = { TRACE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4 };
const LEVEL_NAMES = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
const CATEGORIES = [
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

class Logger {
    constructor() {
        this._entries = []; // ring buffer
        this._maxEntries = 500;
        this._minLevel = LEVELS.INFO;
        this._category = null;
        this._logDir = null;
        this._currentFile = null;
        this._currentSize = 0;
        this._maxFileSize = 5 * 1024 * 1024; // 5MB
        this._maxFiles = 5;
        this._parent = null;
    }

    _getLogDir() {
        if (!this._logDir) {
            this._logDir = path.join(storage.getConfigDir(), 'logs');
            if (!fs.existsSync(this._logDir)) {
                fs.mkdirSync(this._logDir, { recursive: true });
            }
        }
        return this._logDir;
    }

    setLevel(level) {
        if (typeof level === 'string') {
            this._minLevel = LEVELS[level.toUpperCase()] ?? LEVELS.INFO;
        } else {
            this._minLevel = level;
        }
    }

    getLevel() {
        const effectiveLevel = this._parent ? this._parent._minLevel : this._minLevel;
        return LEVEL_NAMES[effectiveLevel] || 'INFO';
    }

    child(category) {
        const child = new Logger();
        child._entries = this._entries; // share the ring buffer
        child._parent = this; // delegate level checks to parent
        child._category = category;
        child._logDir = this._logDir;
        return child;
    }

    _log(level, message, data) {
        const effectiveLevel = this._parent ? this._parent._minLevel : this._minLevel;
        if (level < effectiveLevel) return;
        const entry = {
            timestamp: Date.now(),
            level: LEVEL_NAMES[level],
            category: this._category || 'general',
            message,
            data: data || null,
        };
        this._entries.push(entry);
        if (this._entries.length > this._maxEntries) {
            this._entries.shift();
        }
        this._writeToFile(entry);
    }

    _writeToFile(entry) {
        try {
            const logDir = this._getLogDir();
            if (!this._currentFile) {
                this._rotateFiles(logDir);
                this._currentFile = path.join(logDir, 'app.log');
                this._currentSize = fs.existsSync(this._currentFile) ? fs.statSync(this._currentFile).size : 0;
            }
            if (this._currentSize >= this._maxFileSize) {
                this._rotateFiles(logDir);
                this._currentSize = 0;
            }
            const line = `[${new Date(entry.timestamp).toISOString()}] [${entry.level}] [${entry.category}] ${entry.message}${entry.data ? ' ' + JSON.stringify(entry.data) : ''}\n`;
            fs.appendFile(this._currentFile, line, err => {
                if (err) {
                    // Fail silently - logging should never crash the app
                }
            });
            this._currentSize += Buffer.byteLength(line);
        } catch (e) {
            // Fail silently - logging should never crash the app
        }
    }

    _rotateFiles(logDir) {
        try {
            for (let i = this._maxFiles - 1; i >= 1; i--) {
                const from = path.join(logDir, i === 1 ? 'app.log' : `app.${i - 1}.log`);
                const to = path.join(logDir, `app.${i}.log`);
                if (fs.existsSync(from)) {
                    fs.renameSync(from, to);
                }
            }
        } catch (e) {
            // Fail silently
        }
    }

    trace(message, data) {
        this._log(LEVELS.TRACE, message, data);
    }
    debug(message, data) {
        this._log(LEVELS.DEBUG, message, data);
    }
    info(message, data) {
        this._log(LEVELS.INFO, message, data);
    }
    warn(message, data) {
        this._log(LEVELS.WARN, message, data);
    }
    error(message, data) {
        this._log(LEVELS.ERROR, message, data);
    }

    getEntries(filters = {}) {
        let entries = [...this._entries];
        if (filters.level) {
            const minLevel = LEVELS[filters.level.toUpperCase()] ?? 0;
            entries = entries.filter(e => LEVELS[e.level] >= minLevel);
        }
        if (filters.category) {
            entries = entries.filter(e => e.category === filters.category);
        }
        if (filters.search) {
            const term = filters.search.toLowerCase();
            entries = entries.filter(e => e.message.toLowerCase().includes(term));
        }
        return entries;
    }

    clear() {
        this._entries.length = 0;
    }

    exportToFile() {
        const logDir = this._getLogDir();
        const exportPath = path.join(logDir, `export-${Date.now()}.json`);
        fs.writeFileSync(exportPath, JSON.stringify(this._entries, null, 2));
        return exportPath;
    }
}

// Singleton
const logger = new Logger();

module.exports = logger;
module.exports.Logger = Logger;
module.exports.LEVELS = LEVELS;
module.exports.LEVEL_NAMES = LEVEL_NAMES;
module.exports.CATEGORIES = CATEGORIES;
