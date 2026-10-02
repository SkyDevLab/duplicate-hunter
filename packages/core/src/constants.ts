import { RepositoryConfig, ScoringWeights } from './types.js';

export const DEFAULT_CONFIDENCE_WEIGHTS: ScoringWeights = {
  semantic: 0.35,
  error: 0.20,
  component: 0.15,
  reproduction: 0.10,
  environment: 0.08,
  version: 0.05,
  label: 0.04,
  referencedCode: 0.03,
};

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.82,
  MEDIUM: 0.65,
  LOW: 0.40,
} as const;

export const DEFAULT_REPOSITORY_CONFIG: RepositoryConfig = {
  enabled: true,
  issues: {
    enabled: true,
    threshold: 0.78,
    searchClosedIssues: true,
    maxLookbackIssues: 300,
  },
  pullRequests: {
    enabled: true,
    threshold: 0.80,
  },
  maxCandidates: 5,
  comment: {
    enabled: true,
    minConfidence: 'medium',
    header: '### 🕵️ Duplicate Hunter',
  },
  labels: {
    enabled: true,
    label: 'possible-duplicate',
    reviewLabel: 'duplicate-review',
  },
  checks: {
    enabled: true,
    failureMode: 'neutral',
  },
  confidenceWeights: DEFAULT_CONFIDENCE_WEIGHTS,
  ai: {
    provider: 'local',
  },
  retentionDays: 90,
};

export const BOT_COMMENT_IDENTIFIER = '<!-- duplicate-hunter:analysis-v1 -->';
export const BOT_NAME = 'Duplicate Hunter';
export const BOT_TAGLINE = 'Find the issue before you create the duplicate.';
