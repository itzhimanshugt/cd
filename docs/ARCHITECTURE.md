# Architecture

## Project Overview

Cheating Daddy is an Electron desktop application that provides AI-powered assistance through screen capture, audio transcription, and automated typing. The frontend uses Lit web components with vanilla JavaScript. The application is packaged with Electron Forge.

- **Runtime:** Electron (main + renderer processes)
- **UI Framework:** Lit (web components, bundled as lit-core-2.7.4.min.js)
- **Language:** JavaScript (ES modules in renderer, CommonJS in main process)
- **Packaging:** Electron Forge

## Directory Structure

```
src/
├── components/
│   ├── app/           # Main app shell (CheatingDaddyApp)
│   ├── views/         # Page views (AutoTypeView, HotkeysView, AICustomizeView, etc.)
│   └── ui/            # Shared reusable UI components
├── services/          # Service layer (StorageService, HotkeyService, SessionService)
├── stores/            # Reactive state stores (session, typing, ui, settings)
├── utils/             # Utilities (window.js, renderer.js, gemini.js, etc.)
├── typing/            # Typing system (TypingManager, backends, BackendManager)
├── native/            # Native addon stubs (future Rust/C++ integration)
├── assets/            # Bundled libraries (Lit core)
└── index.js           # Main process entry point
docs/                  # Project documentation
```

## Architecture Patterns

### Stores (`src/stores/`)

Stores provide reactive state management using a subscribe/getState/setState pattern. All stores extend a common `Store` base class.

- **session-store** - Active session state (provider, status, responses)
- **typing-store** - Typing system state (speed, backend, queue progress)
- **ui-store** - UI state (sidebar visibility, active view, overlays)
- **settings-store** - Persistent user settings (synced via StorageService)

Usage:
```javascript
import { typingStore } from '../stores/typing-store.js';

// Read state
const state = typingStore.getState();

// Update state
typingStore.setState({ speed: 120 });

// Subscribe to changes
typingStore.subscribe((newState) => {
  // React to state changes
});
```

### Services (`src/services/`)

Services encapsulate business logic and side effects, keeping components thin.

- **StorageService** - In-memory cache with debounced flush to disk. Reduces I/O overhead for frequent setting changes.
- **HotkeyService** - Differential hotkey registration. Only re-registers bindings that actually changed, avoiding unnecessary IPC round-trips.
- **SessionService** - Manages AI session lifecycle (provider initialization, capture, streaming).

### Shared UI Components (`src/components/ui/`)

Reusable custom elements that encapsulate common UI patterns:

- `cd-toggle` - Toggle switch with label
- `cd-slider` - Range slider with value display
- `cd-select` - Dropdown select with options
- `cd-keybind-input` - Keyboard shortcut capture input
- `cd-setting-row` - Layout wrapper for settings (label + control)

All components fire standard custom events and accept configuration via properties/attributes.

## IPC Bridge Pattern

Communication between renderer and main process follows Electron's IPC model:

**Renderer to Main (request/response):**
```javascript
// Renderer
const result = await window.cheatingDaddy.invoke('channel-name', data);

// Main process
ipcMain.handle('channel-name', async (event, data) => {
  return result;
});
```

**Main to Renderer (push events):**
```javascript
// Main process
mainWindow.webContents.send('event-name', payload);

// Renderer
window.cheatingDaddy.on('event-name', (payload) => {
  // Handle event
});
```

## Session Lifecycle

1. **Provider Initialization** - User selects AI provider (Gemini, Local, Cloud). Provider client is configured with API keys and model settings.
2. **Capture Start** - Screen capture and/or audio capture begins. Frames and audio are streamed to the AI provider.
3. **Streaming Responses** - AI responses arrive as streaming tokens. Tokens are buffered into an immutable response snapshot.
4. **Typing Injection** - The response snapshot is queued for typing via the configured backend.
5. **Session Close** - Capture stops, provider connection is cleaned up, state is reset.

## Typing System

The typing system provides modular, backend-driven text injection with failover support.

### Components

- **TypingManager** - Orchestrates the typing pipeline: queue management, scheduling, humanization, and backend selection.
- **BackendManager** - Manages backend lifecycle, health tracking, and automatic failover.
- **Backends** (12 implementations):
  1. Win32 SendInput (native user32)
  2. PowerShell WScript.Shell SendKeys
  3. PowerShell Add-Type user32 wrapper
  4. Clipboard injection (chunked paste with preserve/restore)
  5. RobotJS
  6. AutoHotkey (dynamic script generation)
  7. nut.js
  8. Windows UI Automation (accessibility API)
  9. Electron WebContents injection
  10. Virtual Keyboard emulation
  11. Batch/Paste Burst (buffered chunk insertion)
  12. Hybrid (combines simulated typing, chunk pasting, sentence pacing)

### Hold-to-Type

The hold-to-type system allows users to hold a configured key to stream typing. Releasing the key pauses instantly; pressing again resumes from the exact position. Typing never restarts from the beginning.

### Backend Failover

If a backend fails, the system automatically falls back to the next configured backend in the chain:

```
SendInput -> Clipboard -> PowerShell -> AutoHotkey
```

Backend health and error counts are tracked to inform failover decisions.

## Event Bus

Cross-component communication uses a global event bus based on `EventTarget`:

```javascript
// Dispatch
window.cheatingDaddy.events.dispatchEvent(
  new CustomEvent('typing:status-changed', { detail: { status: 'paused' } })
);

// Listen
window.cheatingDaddy.events.addEventListener('typing:status-changed', (e) => {
  console.log(e.detail.status);
});
```

This decouples components from each other, allowing state synchronization without direct imports or tight coupling.

## Implementation Status

### Phase 1 (DONE)
Stores, Services, and Shared UI Components. Established the reactive state layer, service abstractions, and reusable component library.

### Phase 2 (DONE)
Performance optimizations: async storage cache with debounced flush, differential hotkey updates, event consolidation, and startup laziness (deferred initialization).

### Phase 3 (DONE)
UX polish: responsive hamburger sidebar, component migration to shared UI elements in AutoTypeView/HotkeysView, status pill overlay, and prompt preview with toast notifications.

### Phase 4 (PARTIAL)
Native stubs only. `src/native/NativeHelper.js` provides placeholder methods that throw until actual Rust/C++ addons are compiled. The BackendManager can check `NativeHelper.isAvailable()` to prefer native input injection over PowerShell.

### Future Work
- TypeScript migration
- React migration (undecided)
- Native Rust/C++ addons for low-latency input injection and window management
- Local transcription (on-device speech-to-text)
