// Component barrel. Note: components self-register via `customElements.define`
// when imported, so the app shell typically imports them directly. This file
// is kept as a convenience for any downstream tooling.

export { CheatingDaddyApp } from './app/CheatingDaddyApp.js';

// View components
export { MainView } from './views/MainView.js';
export { CustomizeView } from './views/CustomizeView.js';
export { HelpView } from './views/HelpView.js';
export { HistoryView } from './views/HistoryView.js';
export { AssistantView } from './views/AssistantView.js';
export { OnboardingView } from './views/OnboardingView.js';
export { AICustomizeView } from './views/AICustomizeView.js';
export { FeedbackView } from './views/FeedbackView.js';
