"use strict";
/**
 * Normalizes issue and PR titles and descriptions to eliminate boilerplate,
 * markdown formatting artifacts, and template headings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STOP_WORDS = void 0;
exports.normalizeText = normalizeText;
exports.tokenize = tokenize;
function normalizeText(text) {
    if (!text)
        return '';
    let cleaned = text;
    // 1. Remove HTML comments <!-- ... -->
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, ' ');
    // 2. Remove markdown images ![alt](url) and badge links
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
    // 3. Remove URLs (keep domain/context if useful, but strip raw links)
    cleaned = cleaned.replace(/https?:\/\/[^\s)]+/g, ' ');
    // 4. Remove standard GitHub template section headers like "### Checklist", "### Describe the bug"
    cleaned = cleaned.replace(/#{1,6}\s*(describe the bug|what happened\??|reproduction|steps to reproduce|environment|checklist|additional context|screenshots?|expected behavior|actual behavior)\b/gi, ' ');
    // 5. Replace backticks around code with spaces for text comparison
    cleaned = cleaned.replace(/`{1,3}[a-zA-Z]*\n?([\s\S]*?)`{1,3}/g, ' $1 ');
    // 6. Normalize punctuation, whitespace, and case
    cleaned = cleaned
        .replace(/[^\w\s.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    return cleaned;
}
function tokenize(text) {
    const norm = normalizeText(text);
    if (!norm)
        return [];
    return norm
        .split(/\s+/)
        .filter((token) => token.length > 2 && !exports.STOP_WORDS.has(token));
}
exports.STOP_WORDS = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'were',
    'which', 'will', 'there', 'they', 'when', 'what', 'some', 'than',
    'them', 'their', 'only', 'also', 'into', 'just', 'more', 'about',
    'then', 'been', 'would', 'could', 'should', 'here', 'your', 'ours',
    'please', 'issue', 'bug', 'error', 'problem', 'help', 'cant', 'cannot',
    'trying', 'trying to', 'getting', 'happens', 'after', 'before'
]);
//# sourceMappingURL=normalizer.js.map