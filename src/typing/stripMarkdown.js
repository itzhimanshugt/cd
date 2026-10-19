'use strict';

const FENCE = /```[^\n]*\n([\s\S]*?)```/g;

/**
 * Converts an AI markdown response into the plain text that should be typed.
 * - If the response has fenced code blocks, only the code inside them is typed
 *   (fences, language tags and any notes around the code are dropped).
 * - Otherwise bold markers, inline-code backticks and heading hashes are removed.
 * @param {string} text - Markdown response
 * @returns {string} Plain text to type
 */
function stripMarkdown(text) {
    const blocks = [...text.matchAll(FENCE)].map(m => m[1].replace(/\s+$/, ''));
    if (blocks.length > 0) {
        return blocks.join('\n\n');
    }

    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/`([^`\n]+)`/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .trim();
}

module.exports = stripMarkdown;
