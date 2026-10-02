/**
 * Security: Untrusted Input Sanitizer & Prompt Injection Defense
 *
 * All GitHub issue and PR content is treated as untrusted user input.
 * This module neutralizes attempts to manipulate AI models, strip prompt delimiters,
 * or inject system control directives.
 */

const ADVERSARIAL_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(?:previous|prior)\s+(?:instructions|prompts|directions)/gi,
  /(?:system\s*prompt|system\s*override|developer\s*mode|dan\s*mode):?/gi,
  /<\|(?:im_start|im_end|system|user|assistant)\|>/gi,
  /\[\/?(?:INST|SYS)\]/gi,
  /```(?:system|admin|root)/gi,
  /you\s+must\s+(?:ignore|close|delete|comment|override)\b/gi,
  /act\s+as\s+(?:a\s+)?(?:bot\s+admin|root|github\s+admin)\b/gi,
];

export const MAX_SAFE_BODY_LENGTH = 16384; // 16 KB max per issue
export const MAX_SAFE_TITLE_LENGTH = 512;

export interface SanitizedIssueText {
  sanitizedTitle: string;
  sanitizedBody: string;
  injectionDetected: boolean;
  warnings: string[];
}

export function sanitizeIssueContent(title: string, body?: string | null): SanitizedIssueText {
  let safeTitle = (title || '').trim();
  let safeBody = (body || '').trim();
  const warnings: string[] = [];
  let injectionDetected = false;

  // 1. Length bounds to prevent algorithmic DoS
  if (safeTitle.length > MAX_SAFE_TITLE_LENGTH) {
    safeTitle = safeTitle.slice(0, MAX_SAFE_TITLE_LENGTH);
    warnings.push(`Title truncated to ${MAX_SAFE_TITLE_LENGTH} characters.`);
  }

  if (safeBody.length > MAX_SAFE_BODY_LENGTH) {
    safeBody = safeBody.slice(0, MAX_SAFE_BODY_LENGTH);
    warnings.push(`Body truncated to ${MAX_SAFE_BODY_LENGTH} characters.`);
  }

  // 2. Strip non-printable / control characters (except common formatting: \n, \r, \t)
  safeTitle = safeTitle.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  safeBody = safeBody.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Detect and neutralize prompt injection attempts
  const combined = `${safeTitle}\n${safeBody}`;
  for (const pattern of ADVERSARIAL_INJECTION_PATTERNS) {
    if (pattern.test(combined)) {
      injectionDetected = true;
      warnings.push(`Potential prompt injection pattern detected and neutralized: ${pattern.source}`);
      safeTitle = safeTitle.replace(pattern, '[REDACTED_COMMAND]');
      safeBody = safeBody.replace(pattern, '[REDACTED_COMMAND]');
    }
  }

  // 4. Neutralize XML/HTML injection tags that could confuse LLMs
  safeBody = safeBody.replace(/<\/?(?:system|instruction|guideline|prompt)[^>]*>/gi, '');

  return {
    sanitizedTitle: safeTitle,
    sanitizedBody: safeBody,
    injectionDetected,
    warnings,
  };
}
