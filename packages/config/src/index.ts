import yaml from 'js-yaml';
import {
  RepositoryConfig,
  DEFAULT_REPOSITORY_CONFIG,
  ConfidenceLevel,
} from '@duplicate-hunter/core';

export const CONFIG_FILE_PATHS = [
  '.github/duplicate-hunter.yml',
  '.github/duplicate-hunter.yaml',
] as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  config: RepositoryConfig;
}

function parseConfidenceLevel(val: unknown, fallback: ConfidenceLevel): ConfidenceLevel {
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    if (lower === 'high' || lower === 'medium' || lower === 'low') {
      return lower;
    }
  }
  return fallback;
}

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val === 'number' && !isNaN(val)) {
    return Math.max(min, Math.min(max, val));
  }
  return fallback;
}

export function parseRepositoryConfig(yamlString?: string | null): RepositoryConfig {
  if (!yamlString || !yamlString.trim()) {
    return { ...DEFAULT_REPOSITORY_CONFIG };
  }

  let raw: Record<string, any>;
  try {
    const parsed = yaml.load(yamlString);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_REPOSITORY_CONFIG };
    }
    raw = parsed as Record<string, any>;
  } catch (err) {
    return { ...DEFAULT_REPOSITORY_CONFIG };
  }

  const base = DEFAULT_REPOSITORY_CONFIG;

  const config: RepositoryConfig = {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : base.enabled,
    issues: {
      enabled: typeof raw.issues?.enabled === 'boolean' ? raw.issues.enabled : base.issues.enabled,
      threshold: clampNumber(raw.issues?.threshold, 0.1, 1.0, base.issues.threshold),
      searchClosedIssues:
        typeof raw.issues?.searchClosedIssues === 'boolean'
          ? raw.issues.searchClosedIssues
          : base.issues.searchClosedIssues,
      maxLookbackIssues: clampNumber(
        raw.issues?.maxLookbackIssues,
        10,
        1000,
        base.issues.maxLookbackIssues
      ),
    },
    pullRequests: {
      enabled:
        typeof raw.pullRequests?.enabled === 'boolean'
          ? raw.pullRequests.enabled
          : base.pullRequests.enabled,
      threshold: clampNumber(raw.pullRequests?.threshold, 0.1, 1.0, base.pullRequests.threshold),
    },
    maxCandidates: clampNumber(raw.maxCandidates, 1, 10, base.maxCandidates),
    comment: {
      enabled:
        typeof raw.comment?.enabled === 'boolean' ? raw.comment.enabled : base.comment.enabled,
      minConfidence: parseConfidenceLevel(raw.comment?.minConfidence, base.comment.minConfidence),
      header:
        typeof raw.comment?.header === 'string' && raw.comment.header.trim()
          ? raw.comment.header.trim()
          : base.comment.header,
    },
    labels: {
      enabled: typeof raw.labels?.enabled === 'boolean' ? raw.labels.enabled : base.labels.enabled,
      label:
        typeof raw.labels?.label === 'string' && raw.labels.label.trim()
          ? raw.labels.label.trim()
          : base.labels.label,
      reviewLabel:
        typeof raw.labels?.reviewLabel === 'string' && raw.labels.reviewLabel.trim()
          ? raw.labels.reviewLabel.trim()
          : base.labels.reviewLabel,
    },
    checks: {
      enabled: typeof raw.checks?.enabled === 'boolean' ? raw.checks.enabled : base.checks.enabled,
      failureMode:
        raw.checks?.failureMode === 'failure' || raw.checks?.failureMode === 'success'
          ? raw.checks.failureMode
          : 'neutral',
    },
    confidenceWeights: {
      semantic: clampNumber(
        raw.confidenceWeights?.semantic,
        0,
        1,
        base.confidenceWeights.semantic
      ),
      error: clampNumber(raw.confidenceWeights?.error, 0, 1, base.confidenceWeights.error),
      component: clampNumber(
        raw.confidenceWeights?.component,
        0,
        1,
        base.confidenceWeights.component
      ),
      reproduction: clampNumber(
        raw.confidenceWeights?.reproduction,
        0,
        1,
        base.confidenceWeights.reproduction
      ),
      environment: clampNumber(
        raw.confidenceWeights?.environment,
        0,
        1,
        base.confidenceWeights.environment
      ),
      version: clampNumber(
        raw.confidenceWeights?.version,
        0,
        1,
        base.confidenceWeights.version
      ),
      label: clampNumber(raw.confidenceWeights?.label, 0, 1, base.confidenceWeights.label),
      referencedCode: clampNumber(
        raw.confidenceWeights?.referencedCode,
        0,
        1,
        base.confidenceWeights.referencedCode
      ),
    },
    ai: {
      provider:
        raw.ai?.provider === 'openai' || raw.ai?.provider === 'ollama'
          ? raw.ai.provider
          : 'local',
      model: typeof raw.ai?.model === 'string' ? raw.ai.model : undefined,
    },
    retentionDays: clampNumber(raw.retentionDays, 7, 365, base.retentionDays),
  };

  return config;
}

export function validateRepositoryConfig(yamlString?: string | null): ValidationResult {
  const errors: string[] = [];
  if (!yamlString || !yamlString.trim()) {
    return { valid: true, errors: [], config: { ...DEFAULT_REPOSITORY_CONFIG } };
  }

  try {
    const parsed = yaml.load(yamlString);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      errors.push('Configuration root must be a YAML mapping (object).');
    }
  } catch (err: any) {
    errors.push(`Invalid YAML syntax: ${err.message}`);
  }

  const config = parseRepositoryConfig(yamlString);
  return {
    valid: errors.length === 0,
    errors,
    config,
  };
}
