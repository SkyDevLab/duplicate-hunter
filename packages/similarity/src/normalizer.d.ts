/**
 * Normalizes issue and PR titles and descriptions to eliminate boilerplate,
 * markdown formatting artifacts, and template headings.
 */
export declare function normalizeText(text: string): string;
export declare function tokenize(text: string): string[];
export declare const STOP_WORDS: Set<string>;
//# sourceMappingURL=normalizer.d.ts.map