import { CandidateMatch, IssueItem, RepositoryConfig } from '@duplicate-hunter/core';

export interface EmbeddingProvider {
  readonly name: string;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

export interface AnalysisInput {
  triggerIssue: IssueItem;
  candidates: IssueItem[];
  config: RepositoryConfig;
}

export interface AnalysisResult {
  matches: CandidateMatch[];
  filteredCount: number;
}

export interface AnalysisProvider {
  readonly name: string;
  analyzeIssue(input: AnalysisInput): Promise<AnalysisResult>;
}
