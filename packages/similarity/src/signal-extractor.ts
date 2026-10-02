import { ExtractedSignals, IssueItem } from '@duplicate-hunter/core';
import { normalizeText } from './normalizer.js';

// Common programming language exception patterns
const EXCEPTION_PATTERNS = [
  /\b([A-Z][a-zA-Z0-9_]*(?:Exception|Error|Fault|Failure|Crash|Panic))\b/g,
  /\b(NullReferenceException|NullPointerException|TypeError|ReferenceError|SyntaxError|RangeError|IndexOutOfRangeException|ArgumentNullException|KeyError|ValueError|AttributeError|ZeroDivisionError|ECONNREFUSED|ENOTFOUND|EACCES|ETIMEDOUT)\b/gi,
];

// Stack trace patterns across Node.js, Python, Go, Java, .NET
const STACK_TRACE_PATTERNS = [
  /at\s+([a-zA-Z0-9_$.<>]+\s+\([^)]+\))/g, // Node.js / V8
  /at\s+([a-zA-Z0-9_$.<>]+\s+\[as\s+[^\]]+\])/g,
  /File\s+"([^"]+)",\s+line\s+(\d+),\s+in\s+([a-zA-Z0-9_]+)/g, // Python
  /([a-zA-Z0-9_./-]+\.go:\d+)/g, // Go
  /\bat\s+([a-zA-Z0-9_$.]+\([a-zA-Z0-9_]+\.java:\d+\))/g, // Java
  /in\s+([a-zA-Z0-9_\\/.:]+:\s*line\s*\d+)/g, // .NET C#
];

// OS patterns
const OS_PATTERNS = [
  /\b(Windows\s*(?:11|10|8\.1|8|7|Server(?:\s*\d+)?))\b/gi,
  /\b(macOS(?:\s*(?:Sonoma|Ventura|Monterey|Big\s*Sur|Sequoia|\d+(?:\.\d+)*))?)\b/gi,
  /\b(Ubuntu(?:\s*\d{2}\.\d{2}(?:\.\d+)?)?)\b/gi,
  /\b(Debian(?:\s*\d+)?)\b/gi,
  /\b(Arch\s*Linux|Fedora|CentOS|RHEL|Alpine(?:\s*Linux)?)\b/gi,
  /\b(Linux\s*(?:x86_64|arm64|kernel\s*[\d.]+)?)\b/gi,
  /\b(iOS(?:\s*\d+(?:\.\d+)*)?)\b/gi,
  /\b(Android(?:\s*\d+(?:\.\d+)*)?)\b/gi,
];

// Version patterns
const VERSION_PATTERNS = [
  /\bv?(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9_.-]+)?)\b/g,
  /\bversion[:\s]+v?(\d+\.\d+(?:\.\d+)?)\b/gi,
];

// Code reference patterns (files and functions)
const CODE_FILE_PATTERNS = [
  /\b([a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx|py|go|rs|cs|java|c|cpp|h|json|yml|yaml|sql|sh|md))\b/gi,
  /\b([a-zA-Z0-9_]+(?:\(\)|\.prototype\.[a-zA-Z0-9_]+))\b/g,
];

// Issue/PR reference patterns
const ISSUE_REF_PATTERNS = [
  /(?:#|GH-|gh-)(\d+)\b/g,
  /(?:fixes|closes|resolves|refs?|see)\s+#(\d+)\b/gi,
];

// Known high-frequency component indicators
const KNOWN_COMPONENTS = [
  'csv import',
  'csv export',
  'csv parser',
  'csv',
  'parser',
  'import',
  'export',
  'authentication',
  'auth',
  'login',
  'oauth',
  'database',
  'migration',
  'webhook',
  'rest api',
  'graphql',
  'cli',
  'docker',
  'search',
  'cache',
  'redis',
  'notification',
  'websocket',
  'file upload',
  'memory leak',
  'crash',
  'deadlock',
  'timeout',
  'rendering',
  'navigation',
  'permissions',
  'rate limit',
  'markdown',
];

export function extractSignalsFromIssue(issue: IssueItem): ExtractedSignals {
  const combinedText = `${issue.title}\n\n${issue.body || ''}`;
  const normalized = normalizeText(combinedText);

  // 1. Errors & Exceptions
  const exceptionsSet = new Set<string>();
  for (const pattern of EXCEPTION_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      const ex = (match[1] || match[0]).trim();
      if (ex && ex.length > 3) {
        exceptionsSet.add(ex);
      }
    }
  }

  const errors: string[] = [];
  const lines = combinedText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^(?:error|fatal|panic|exception|traceback|assertion\s*failed)[:\s]/i.test(trimmed) ||
      /uncaught\s+exception/i.test(trimmed) ||
      /(?:null\s*pointer|null\s*reference|segmentation\s*fault|access\s*violation)/i.test(trimmed)
    ) {
      if (trimmed.length > 5 && trimmed.length < 250) {
        errors.push(trimmed);
      }
    }
  }

  // 2. Stack Frames
  const stackFramesSet = new Set<string>();
  for (const pattern of STACK_TRACE_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      const frame = (match[1] || match[0]).trim();
      if (frame) {
        stackFramesSet.add(frame);
      }
    }
  }

  // 3. Components
  const componentsSet = new Set<string>();
  const lowerText = combinedText.toLowerCase();

  // Check brackets tags e.g. [auth], [cli] in title
  const bracketMatches = issue.title.matchAll(/\[([a-zA-Z0-9_\-\s]+)\]/g);
  for (const match of bracketMatches) {
    const comp = match[1].trim().toLowerCase();
    if (comp.length > 2) componentsSet.add(comp);
  }

  for (const comp of KNOWN_COMPONENTS) {
    if (lowerText.includes(comp)) {
      componentsSet.add(comp);
    }
  }

  // 4. Environments & OS
  const environmentsSet = new Set<string>();
  for (const pattern of OS_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      const env = (match[1] || match[0]).trim();
      if (env) {
        environmentsSet.add(env);
      }
    }
  }

  // 5. Versions
  const versionsSet = new Set<string>();
  for (const pattern of VERSION_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      const ver = (match[1] || match[0]).trim();
      // filter out generic numbers like 1.0 if not formatted like semver
      if (/^\d+\.\d+(?:\.\d+)?/.test(ver)) {
        versionsSet.add(ver.startsWith('v') ? ver : `v${ver}`);
      }
    }
  }

  // 6. Reproduction Steps
  const reproSteps: string[] = [];
  let inReproSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/(?:steps\s*to\s*reproduce|how\s*to\s*reproduce|repro(?:\s*steps)?)/i.test(trimmed)) {
      inReproSection = true;
      continue;
    }
    if (inReproSection) {
      if (/^#{1,4}\s+[a-zA-Z]/.test(trimmed)) {
        // Exited section
        inReproSection = false;
        continue;
      }
      if (/^(?:\d+[.)]|-|\*)\s+(.+)/.test(trimmed)) {
        const step = trimmed.replace(/^(?:\d+[.)]|-|\*)\s+/, '');
        if (step.length > 5) {
          reproSteps.push(step);
        }
      }
    }
  }

  // If no explicit section, look for ordered lists
  if (reproSteps.length === 0) {
    for (const line of lines) {
      const match = line.trim().match(/^\d+\.\s+([A-Z].{8,})/);
      if (match) {
        reproSteps.push(match[1]);
      }
    }
  }

  // 7. Referenced Code & Files
  const codeSet = new Set<string>();
  for (const pattern of CODE_FILE_PATTERNS) {
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      const codeRef = (match[1] || match[0]).trim();
      if (codeRef && codeRef.length > 3) {
        codeSet.add(codeRef);
      }
    }
  }

  // 8. Referenced Issues
  const issueRefsSet = new Set<string>();
  for (const pattern of ISSUE_REF_PATTERNS) {
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      const num = match[1].trim();
      if (num && num !== String(issue.number)) {
        issueRefsSet.add(`#${num}`);
      }
    }
  }

  return {
    title: issue.title,
    normalizedText: normalized,
    errors,
    exceptions: Array.from(exceptionsSet),
    stackFrames: Array.from(stackFramesSet),
    components: Array.from(componentsSet),
    environments: Array.from(environmentsSet),
    versions: Array.from(versionsSet),
    reproductionSteps: reproSteps,
    labels: issue.labels || [],
    referencedCode: Array.from(codeSet),
    referencedIssues: Array.from(issueRefsSet),
  };
}
