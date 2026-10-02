import {
  AnalysisInput,
  AnalysisProvider,
  AnalysisResult,
  EmbeddingProvider,
} from '../interfaces.js';
import {
  CandidateMatch,
  IssueItem,
  RepositoryConfig,
} from '@duplicate-hunter/core';
import {
  compareSignals,
  extractSignalsFromIssue,
} from '@duplicate-hunter/similarity';
import { sanitizeIssueContent } from '../sanitizer.js';
import { LocalEmbeddingProvider } from './local-embedding.js';
import { OpenAIEmbeddingProvider } from './openai-provider.js';
import { OllamaEmbeddingProvider } from './ollama-provider.js';

export class HybridAnalysisProvider implements AnalysisProvider {
  public readonly name = 'hybrid-analyzer';
  private embeddingProvider: EmbeddingProvider;

  constructor(embeddingProvider?: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider || new LocalEmbeddingProvider();
  }

  public setProvider(provider: EmbeddingProvider) {
    this.embeddingProvider = provider;
  }

  public static createFromConfig(config: RepositoryConfig): HybridAnalysisProvider {
    let embeddingProvider: EmbeddingProvider;
    switch (config.ai.provider) {
      case 'openai':
        embeddingProvider = new OpenAIEmbeddingProvider({ model: config.ai.model });
        break;
      case 'ollama':
        embeddingProvider = new OllamaEmbeddingProvider({ model: config.ai.model });
        break;
      case 'local':
      default:
        embeddingProvider = new LocalEmbeddingProvider();
        break;
    }
    return new HybridAnalysisProvider(embeddingProvider);
  }

  async analyzeIssue(input: AnalysisInput): Promise<AnalysisResult> {
    const { triggerIssue, candidates, config } = input;

    if (!candidates || candidates.length === 0) {
      return { matches: [], filteredCount: 0 };
    }

    // 1. Sanitize trigger issue
    const sanitizedTrigger = sanitizeIssueContent(triggerIssue.title, triggerIssue.body);
    const safeTriggerIssue: IssueItem = {
      ...triggerIssue,
      title: sanitizedTrigger.sanitizedTitle,
      body: sanitizedTrigger.sanitizedBody,
    };

    // 2. Generate embedding for trigger issue if not already present
    let triggerEmbedding = safeTriggerIssue.embedding;
    if (!triggerEmbedding || triggerEmbedding.length === 0) {
      const textToEmbed = `${safeTriggerIssue.title}\n\n${safeTriggerIssue.body.slice(0, 2000)}`;
      triggerEmbedding = await this.embeddingProvider.generateEmbedding(textToEmbed);
    }

    const triggerSignals = extractSignalsFromIssue(safeTriggerIssue);

    // 3. Score all candidates in parallel or batch
    const evaluated: CandidateMatch[] = [];
    let filteredCount = 0;

    for (const candidate of candidates) {
      // Skip comparing an issue with itself
      if (candidate.number === triggerIssue.number) {
        continue;
      }

      // Check closed issues policy
      if (candidate.state === 'closed' && !config.issues.searchClosedIssues) {
        continue;
      }

      // Sanitize candidate text
      const sanitizedCandidate = sanitizeIssueContent(candidate.title, candidate.body);
      const safeCandidateIssue: IssueItem = {
        ...candidate,
        title: sanitizedCandidate.sanitizedTitle,
        body: sanitizedCandidate.sanitizedBody,
      };

      // Candidate embedding
      let candidateEmbedding = safeCandidateIssue.embedding;
      if (!candidateEmbedding || candidateEmbedding.length === 0) {
        const candidateText = `${safeCandidateIssue.title}\n\n${safeCandidateIssue.body.slice(0, 2000)}`;
        candidateEmbedding = await this.embeddingProvider.generateEmbedding(candidateText);
      }

      const candidateSignals = extractSignalsFromIssue(safeCandidateIssue);

      const comparison = compareSignals(
        triggerSignals,
        candidateSignals,
        triggerEmbedding,
        candidateEmbedding,
        config.confidenceWeights
      );

      // Determine threshold based on candidate type (PR vs Issue)
      const threshold = safeCandidateIssue.isPullRequest
        ? config.pullRequests.threshold
        : config.issues.threshold;

      if (comparison.breakdown.overallScore >= threshold) {
        evaluated.push({
          candidate: safeCandidateIssue,
          scoring: comparison.breakdown,
          signals: comparison.signals,
          explanationPoints: comparison.explanationPoints,
          differenceSummary: comparison.differenceSummary,
          isPR: safeCandidateIssue.isPullRequest,
          isClosed: safeCandidateIssue.state === 'closed',
          fixedInRelease: safeCandidateIssue.fixedInRelease,
        });
      } else {
        filteredCount++;
      }
    }

    // Sort by overall score descending
    evaluated.sort((a, b) => b.scoring.overallScore - a.scoring.overallScore);

    // Take top maxCandidates
    const topMatches = evaluated.slice(0, config.maxCandidates);

    return {
      matches: topMatches,
      filteredCount,
    };
  }
}
