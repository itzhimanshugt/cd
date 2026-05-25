// src/utils/apiKeys.js
//
// Continuous Rotating Failover API Key Manager
//
// Architecture:
//   - All keys participate in rotation continuously (no permanent quarantine)
//   - Keys that recently failed get a temporary penalty (deprioritized, not disabled)
//   - Provider priority: Gemini first, Groq as automatic fallback
//   - Seamless mid-request failover: if a key fails, the SAME request retries on next key
//   - Cross-provider failover: Gemini pool exhausted → Groq pool activates automatically
//
// Key States (simplified):
//   'ready'    — available for immediate use
//   'failed'   — recently failed, still in rotation but deprioritized
//   'invalid'  — auth permanently broken (401/403), user must fix/replace
//
// Failed keys automatically return to normal priority after PENALTY_DECAY_MS.
// Invalid keys are still retried periodically (every INVALID_RETRY_MS) in case user fixed them externally.

const { BrowserWindow } = require('electron');
const storage = require('../storage');

let _revalidationInterval = null;

// ──────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────

const PENALTY_DECAY_MS = 60 * 1000; // 60s — failed keys regain normal priority after this
const INVALID_RETRY_MS = 5 * 60 * 1000; // 5min — invalid keys get retried periodically
const MAX_CONSECUTIVE_FAILURES = 3; // After N consecutive failures across ALL keys in a provider, stop cycling
const PROBE_TIMEOUT_MS = 10 * 1000; // 10s timeout per probe
const REVALIDATION_INTERVAL_MS = 3 * 60 * 1000; // 3min sweep for recovering failed keys

const _validating = new Set(); // Set<`${provider}:${id}`>

// Track rotation position per provider for round-robin
const _rotationIndex = { gemini: 0, groq: 0 };

// ──────────────────────────────────────────────────────────────
// Timeout helper
// ──────────────────────────────────────────────────────────────

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Probe timeout after ${ms}ms: ${label}`)), ms)),
    ]);
}

// ──────────────────────────────────────────────────────────────
// Error classification
// ──────────────────────────────────────────────────────────────

function classifyError(err) {
    if (!err) return 'transient';
    const status = err.status || err.code || err.response?.status || err.cause?.status || null;
    const message = (err.message || err.toString() || '').toLowerCase();

    if (status === 401 || status === 403) return 'invalid';
    if (status === 429) return 'rate_limited';
    if (/\b401\b|\bunauthorized\b|\bapi[_ ]key[_ ]invalid\b|\binvalid api key\b|\bpermission_denied\b/.test(message)) return 'invalid';
    if (/\b429\b|\bquota\b|\brate[_ ]?limit\b|\bresource_exhausted\b|\bexhausted\b|\btoo many requests\b/.test(message)) return 'rate_limited';
    return 'transient';
}

async function classifyFetchResponse(response) {
    if (response.ok) return 'ok';
    if (response.status === 401 || response.status === 403) return 'invalid';
    if (response.status === 429) return 'rate_limited';
    if (response.status === 400) {
        try {
            const text = await response.clone().text();
            if (/quota|rate[_ ]?limit|exhausted/i.test(text)) return 'rate_limited';
        } catch (_) {}
    }
    return 'transient';
}

// ──────────────────────────────────────────────────────────────
// Key sorting: priority-based ordering
// ──────────────────────────────────────────────────────────────

function sortKeysByPriority(keys) {
    const now = Date.now();
    return [...keys].sort((a, b) => {
        const scoreA = _keyPriorityScore(a, now);
        const scoreB = _keyPriorityScore(b, now);
        return scoreA - scoreB;
    });
}

function _keyPriorityScore(entry, now) {
    if (entry.state === 'ready') return 0;
    if (entry.state === 'failed') {
        const elapsed = now - (entry.failedAt || 0);
        if (elapsed >= PENALTY_DECAY_MS) return 1;
        return 2;
    }
    if (entry.state === 'invalid') {
        const elapsed = now - (entry.lastCheckedAt || 0);
        if (elapsed >= INVALID_RETRY_MS) return 3;
        return 99;
    }
    return 0; // 'unknown' — treat as available
}

function getRotationCandidates(provider) {
    const allKeys = storage.listAllProviderKeysRaw(provider);
    if (allKeys.length === 0) return [];

    const now = Date.now();
    const usable = allKeys.filter(k => {
        if (k.state === 'invalid') {
            const elapsed = now - (k.lastCheckedAt || 0);
            return elapsed >= INVALID_RETRY_MS;
        }
        return true;
    });

    if (usable.length === 0) return allKeys;

    const sorted = sortKeysByPriority(usable);

    const readyKeys = sorted.filter(k => k.state === 'ready' || k.state === 'unknown');
    if (readyKeys.length > 1) {
        const idx = _rotationIndex[provider] % readyKeys.length;
        const rotated = [...readyKeys.slice(idx), ...readyKeys.slice(0, idx)];
        const nonReady = sorted.filter(k => k.state !== 'ready' && k.state !== 'unknown');
        return [...rotated, ...nonReady];
    }

    return sorted;
}

function advanceRotation(provider) {
    _rotationIndex[provider] = (_rotationIndex[provider] || 0) + 1;
}

// ──────────────────────────────────────────────────────────────
// Probes (validation)
// ──────────────────────────────────────────────────────────────

async function probeGroqKey(key) {
    try {
        const response = await withTimeout(
            fetch('https://api.groq.com/openai/v1/models', {
                method: 'GET',
                headers: { Authorization: `Bearer ${key}` },
            }),
            PROBE_TIMEOUT_MS,
            'groq:probe'
        );
        if (response.ok) return { state: 'ready', reason: null };
        const verdict = await classifyFetchResponse(response);
        if (verdict === 'invalid') return { state: 'invalid', reason: `HTTP ${response.status}` };
        if (verdict === 'rate_limited') return { state: 'failed', reason: `Rate limited (HTTP ${response.status})` };
        return { state: 'failed', reason: `HTTP ${response.status}` };
    } catch (err) {
        const msg = err.message || 'Network error';
        if (/timeout/i.test(msg) || /network/i.test(msg) || /fetch/i.test(msg)) {
            return { state: null, reason: msg };
        }
        return { state: 'failed', reason: msg };
    }
}

async function probeGeminiKey(key) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
        const response = await withTimeout(
            fetch(url, { method: 'GET' }),
            PROBE_TIMEOUT_MS,
            'gemini:probe'
        );
        if (response.ok) return { state: 'ready', reason: null };
        const verdict = await classifyFetchResponse(response);
        if (verdict === 'invalid') return { state: 'invalid', reason: `HTTP ${response.status}` };
        if (verdict === 'rate_limited') return { state: 'failed', reason: `Rate limited (HTTP ${response.status})` };
        return { state: 'failed', reason: `HTTP ${response.status}` };
    } catch (err) {
        const msg = err.message || 'Network error';
        if (/timeout/i.test(msg) || /network/i.test(msg) || /fetch/i.test(msg)) {
            return { state: null, reason: msg };
        }
        return { state: 'failed', reason: msg };
    }
}

async function probeKey(provider, key) {
    if (provider === 'gemini') return probeGeminiKey(key);
    if (provider === 'groq') return probeGroqKey(key);
    throw new Error(`Unknown provider: ${provider}`);
}

// ──────────────────────────────────────────────────────────────
// Broadcasting
// ──────────────────────────────────────────────────────────────

function broadcastUpdate(provider) {
    try {
        const windows = BrowserWindow.getAllWindows();
        const keys = storage.listProviderKeys(provider);
        for (const w of windows) {
            w.webContents.send('api-keys:updated', { provider, keys });
        }
    } catch (err) {
        console.error('Failed to broadcast api-keys:updated:', err.message);
    }
}

function broadcastFailover(fromProvider, fromEntry, toProvider, toEntry, reason) {
    try {
        const windows = BrowserWindow.getAllWindows();
        const fromLabel = fromEntry ? (fromEntry.label || _redactKey(fromEntry.key)) : 'Unknown';
        const toLabel = toEntry ? (toEntry.label || _redactKey(toEntry.key)) : 'Unknown';
        const payload = {
            from: { provider: fromProvider, label: fromLabel, id: fromEntry?.id },
            to: { provider: toProvider, label: toLabel, id: toEntry?.id },
            reason: reason || 'Key failed',
            crossProvider: fromProvider !== toProvider,
        };
        console.log(`[Failover] ${fromProvider}/"${fromLabel}" → ${toProvider}/"${toLabel}" (${reason})`);
        for (const w of windows) {
            w.webContents.send('api-keys:failover', payload);
        }
    } catch (err) {
        console.error('Failed to broadcast failover:', err.message);
    }
}

function broadcastAllFailed(providers, reason) {
    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = { providers, reason: reason || 'All API keys failed' };
        console.error(`All providers failed: ${providers.join(', ')}`);
        for (const w of windows) {
            w.webContents.send('api-keys:all-failed', payload);
        }
    } catch (err) {
        console.error('Failed to broadcast all-failed:', err.message);
    }
}

function _redactKey(key) {
    if (!key) return '';
    const s = String(key);
    if (s.length <= 8) return '•'.repeat(s.length);
    return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

// ──────────────────────────────────────────────────────────────
// Key state management
// ──────────────────────────────────────────────────────────────

function markKeyFailed(provider, id, reason) {
    const entry = storage.getProviderKeyRaw(provider, id);
    const label = entry?.label || _redactKey(entry?.key) || id;
    console.warn(`[ApiKeys] Key failed: ${provider}/"${label}" — ${reason}`);
    storage.updateProviderKey(provider, id, {
        state: 'failed',
        failedAt: Date.now(),
        lastCheckedAt: Date.now(),
        errorReason: reason,
    });
    broadcastUpdate(provider);
}

function markKeyInvalid(provider, id, reason) {
    const entry = storage.getProviderKeyRaw(provider, id);
    const label = entry?.label || _redactKey(entry?.key) || id;
    console.error(`[ApiKeys] Key invalid: ${provider}/"${label}" — ${reason}`);
    storage.updateProviderKey(provider, id, {
        state: 'invalid',
        lastCheckedAt: Date.now(),
        errorReason: reason,
    });
    broadcastUpdate(provider);
}

function markKeyReady(provider, id) {
    storage.updateProviderKey(provider, id, {
        state: 'ready',
        lastCheckedAt: Date.now(),
        errorReason: null,
        failedAt: null,
    });
    broadcastUpdate(provider);
}

// ──────────────────────────────────────────────────────────────
// Core rotation engine
// ──────────────────────────────────────────────────────────────

async function withSingleProviderRotation(provider, fn) {
    const candidates = getRotationCandidates(provider);
    if (candidates.length === 0) {
        const err = new Error(`No ${provider} API key available`);
        err.code = 'NO_READY_KEY';
        throw err;
    }

    let lastError = null;
    let previousEntry = null;
    let consecutiveFailures = 0;

    for (const entry of candidates) {
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) break;

        try {
            const result = await fn(entry.key, entry);
            if (entry.state !== 'ready') markKeyReady(provider, entry.id);
            if (previousEntry) {
                broadcastFailover(provider, previousEntry, provider, entry, lastError?.message || 'Key failed');
            }
            advanceRotation(provider);
            return result;
        } catch (err) {
            lastError = err;
            previousEntry = previousEntry || entry;
            const verdict = classifyError(err);
            if (verdict === 'invalid') {
                markKeyInvalid(provider, entry.id, err.message);
            } else {
                markKeyFailed(provider, entry.id, err.message);
            }
            consecutiveFailures++;
            continue;
        }
    }

    const err = new Error(`All ${provider} API keys failed`);
    err.code = 'ALL_KEYS_UNAVAILABLE';
    err.cause = lastError;
    throw err;
}

// Alias for backward compatibility
const withKeyRotation = withSingleProviderRotation;

// ──────────────────────────────────────────────────────────────
// Public operations
// ──────────────────────────────────────────────────────────────

function listKeys(provider) {
    return storage.listProviderKeys(provider);
}

async function addKey(provider, rawKey, label = '') {
    const result = storage.addProviderKey(provider, rawKey, label);
    if (!result.ok) return result;
    setImmediate(() => {
        revalidateKey(provider, result.id).catch(err => {
            console.warn('[ApiKeys] Initial validation failed:', err.message);
        });
    });
    broadcastUpdate(provider);
    return result;
}

function removeKey(provider, id) {
    _validating.delete(`${provider}:${id}`);
    const result = storage.removeProviderKey(provider, id);
    if (result.ok) broadcastUpdate(provider);
    return result;
}

async function revalidateKey(provider, id) {
    const lockKey = `${provider}:${id}`;
    if (_validating.has(lockKey)) return { ok: true, skipped: true };

    const raw = storage.getProviderKeyRaw(provider, id);
    if (!raw) return { ok: false, error: 'Key not found' };

    _validating.add(lockKey);
    try {
        const verdict = await probeKey(provider, raw.key);
        if (verdict.state === 'ready') {
            markKeyReady(provider, id);
        } else if (verdict.state === 'invalid') {
            markKeyInvalid(provider, id, verdict.reason);
        } else if (verdict.state === 'failed') {
            markKeyFailed(provider, id, verdict.reason);
        } else {
            storage.updateProviderKey(provider, id, {
                lastCheckedAt: Date.now(),
                errorReason: verdict.reason,
            });
        }
    } finally {
        _validating.delete(lockKey);
    }

    broadcastUpdate(provider);
    return { ok: true };
}

async function revalidateAll(provider) {
    const keys = storage.listAllProviderKeysRaw(provider);
    await Promise.allSettled(keys.map(k => revalidateKey(provider, k.id)));
    return { ok: true, count: keys.length };
}

async function revalidateAllProviders() {
    await Promise.allSettled(storage.API_KEY_PROVIDERS.map(p => revalidateAll(p)));
}

async function recoverKeys() {
    const now = Date.now();
    for (const provider of storage.API_KEY_PROVIDERS) {
        const keys = storage.listAllProviderKeysRaw(provider);
        for (const k of keys) {
            let shouldProbe = false;
            if (k.state === 'unknown') {
                shouldProbe = true;
            } else if (k.state === 'failed') {
                const elapsed = now - (k.failedAt || k.lastCheckedAt || 0);
                if (elapsed >= PENALTY_DECAY_MS) shouldProbe = true;
            } else if (k.state === 'invalid') {
                const elapsed = now - (k.lastCheckedAt || 0);
                if (elapsed >= INVALID_RETRY_MS) shouldProbe = true;
            }
            if (shouldProbe) {
                revalidateKey(provider, k.id).catch(() => {});
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────
// Response/error handlers
// ──────────────────────────────────────────────────────────────

function handleKeyFailure(provider, keyId, statusCode, errorText = '') {
    const entry = storage.getProviderKeyRaw(provider, keyId);
    const label = entry?.label || _redactKey(entry?.key) || keyId;
    let reason = `HTTP ${statusCode}`;
    if (errorText) reason += `: ${errorText.slice(0, 100)}`;

    if (statusCode === 401 || statusCode === 403) {
        markKeyInvalid(provider, keyId, reason);
        return { state: 'invalid', label, reason };
    }
    markKeyFailed(provider, keyId, reason);
    return { state: 'failed', label, reason };
}

async function handleResponseStatus(provider, keyId, response) {
    const verdict = await classifyFetchResponse(response);
    if (verdict === 'invalid') {
        markKeyInvalid(provider, keyId, `HTTP ${response.status}`);
    } else if (verdict === 'rate_limited') {
        markKeyFailed(provider, keyId, `Rate limited (HTTP ${response.status})`);
    }
    return verdict;
}

// ──────────────────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────────────────

function startBackgroundValidation() {
    setImmediate(() => {
        revalidateAllProviders().catch(err => {
            console.warn('[ApiKeys] Startup validation failed:', err.message);
        });
    });

    if (_revalidationInterval) clearInterval(_revalidationInterval);
    _revalidationInterval = setInterval(() => {
        recoverKeys().catch(err => {
            console.warn('[ApiKeys] Recovery sweep failed:', err.message);
        });
    }, REVALIDATION_INTERVAL_MS);
    _revalidationInterval.unref?.();
}

function stopBackgroundValidation() {
    if (_revalidationInterval) {
        clearInterval(_revalidationInterval);
        _revalidationInterval = null;
    }
}

module.exports = {
    listKeys,
    addKey,
    removeKey,
    revalidateKey,
    revalidateAll,
    revalidateAllProviders,
    withKeyRotation,
    withSingleProviderRotation,
    getRotationCandidates,
    markKeyFailed,
    markKeyInvalid,
    markKeyReady,
    classifyError,
    classifyFetchResponse,
    handleResponseStatus,
    handleKeyFailure,
    broadcastUpdate,
    broadcastFailover,
    broadcastAllFailed,
    recoverKeys,
    startBackgroundValidation,
    stopBackgroundValidation,
};
