export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type MaintainerDecision =
  | 'confirmed_duplicate'
  | 'related'
  | 'not_related'
  | 'false_positive';

export type DetectionStatus = 'pending' | 'reviewed' | 'confirmed' | 'dismissed';

export interface IssueItem {
  id?: string | number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  isPullRequest: boolean;
  author: string;
  labels: string[];
  url: string;
  createdAt: string;
  updatedAt?: string;
  closedAt?: string;
  fixedInRelease?: string;
  embedding?: number[];
}

export interface StructuredSignals {
  matchedErrors: string[];
  matchedExceptions: string[];
  matchedStackFrames: string[];
  matchedComponents: string[];
  matchedEnvironments: string[];
  matchedVersions: string[];
  matchedReproductionSteps: string[];
  matchedLabels: string[];
  matchedReferencedCode: string[];
  matchedIssueNumbers: string[];
}

export interface ExtractedSignals {
  title: string;
  normalizedText: string;
  errors: string[];
  exceptions: string[];
  stackFrames: string[];
  components: string[];
  environments: string[];
  versions: string[];
  reproductionSteps: string[];
  labels: string[];
  referencedCode: string[];
  referencedIssues: string[];
}

export interface ScoringWeights {
  semantic: number;
  error: number;
  component: number;
  environment: number;
  version: number;
  reproduction: number;
  label: number;
  referencedCode: number;
}

export interface ScoringBreakdown {
  semanticSimilarity: number;
  errorSimilarity: number;
  componentSimilarity: number;
  environmentSimilarity: number;
  versionSimilarity: number;
  reproductionSimilarity: number;
  labelSimilarity: number;
  referencedCodeSimilarity: number;
  overallScore: number;
  confidence: ConfidenceLevel;
}

export interface CandidateMatch {
  candidate: IssueItem;
  scoring: ScoringBreakdown;
  signals: StructuredSignals;
  explanationPoints: string[];
  differenceSummary?: string;
  isPR: boolean;
  isClosed: boolean;
  fixedInRelease?: string;
}

export interface DetectionResult {
  triggerIssue: IssueItem;
  candidates: CandidateMatch[];
  shouldComment: boolean;
  commentMarkdown?: string;
}

export interface RepositoryConfig {
  enabled: boolean;
  issues: {
    enabled: boolean;
    threshold: number;
    searchClosedIssues: boolean;
    maxLookbackIssues: number;
  };
  pullRequests: {
    enabled: boolean;
    threshold: number;
  };
  maxCandidates: number;
  comment: {
    enabled: boolean;
    minConfidence: ConfidenceLevel;
    header?: string;
  };
  labels: {
    enabled: boolean;
    label: string;
    reviewLabel?: string;
  };
  checks: {
    enabled: boolean;
    failureMode?: 'neutral' | 'failure' | 'success';
  };
  confidenceWeights: ScoringWeights;
  ai: {
    provider: 'local' | 'openai' | 'ollama';
    model?: string;
  };
  retentionDays: number;
}

export interface RepositoryOverviewStats {
  issuesAnalyzed: number;
  potentialDuplicates: number;
  confirmedDuplicates: number;
  falsePositives: number;
  issuesSaved: number;
}

export interface DetectionRecord {
  id: string;
  repositoryId: string;
  repositoryName: string;
  triggerIssueNumber: number;
  triggerIssueTitle: string;
  candidateIssueNumber: number;
  candidateIssueTitle: string;
  isCandidatePR: boolean;
  confidence: ConfidenceLevel;
  score: number;
  signals: StructuredSignals;
  differenceSummary?: string;
  status: DetectionStatus;
  maintainerDecision?: MaintainerDecision;
  botCommentId?: number | string;
  createdAt: string;
  updatedAt: string;
}
