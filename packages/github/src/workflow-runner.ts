import {
  CandidateMatch,
  DetectionResult,
  IssueItem,
  RepositoryConfig,
} from '@duplicate-hunter/core';
import { HybridAnalysisProvider } from '@duplicate-hunter/ai';
import { DuplicateHunterStore } from '@duplicate-hunter/database';
import { GitHubClient } from './github-client.js';
import { formatDuplicateComment, parseCommentMetadata } from './comment-formatter.js';

export interface WorkflowOptions {
  client?: GitHubClient;
  store: DuplicateHunterStore;
  analyzer?: HybridAnalysisProvider;
  mockMode?: boolean;
}

export interface WorkflowExecutionResult {
  skipped: boolean;
  reason?: string;
  triggerIssue: IssueItem;
  matches: CandidateMatch[];
  commentPosted: boolean;
  commentId?: number;
  labelApplied?: string;
  checkRunId?: number;
  commentBody?: string;
}

export class DuplicateHunterWorkflow {
  private client?: GitHubClient;
  private store: DuplicateHunterStore;
  private analyzer: HybridAnalysisProvider;

  constructor(options: WorkflowOptions) {
    this.client = options.client;
    this.store = options.store;
    this.analyzer = options.analyzer || new HybridAnalysisProvider();
  }

  /**
   * Main webhook handler for issues.opened and issues.edited events.
   */
  async processIssueEvent(
    payload: any,
    overrideCandidates?: IssueItem[]
  ): Promise<WorkflowExecutionResult> {
    const action = payload.action;
    if (action !== 'opened' && action !== 'edited') {
      return {
        skipped: true,
        reason: `Unsupported action: ${action}. Only 'opened' and 'edited' are processed.`,
        triggerIssue: {
          number: payload.issue?.number || 0,
          title: payload.issue?.title || '',
          body: payload.issue?.body || '',
          state: 'open',
          isPullRequest: false,
          author: payload.issue?.user?.login || 'unknown',
          labels: [],
          url: payload.issue?.html_url || '',
          createdAt: payload.issue?.created_at || new Date().toISOString(),
        },
        matches: [],
        commentPosted: false,
      };
    }

    const repoOwner = payload.repository?.owner?.login || payload.repository?.owner?.name;
    const repoName = payload.repository?.name;
    const repoFullName = payload.repository?.full_name || `${repoOwner}/${repoName}`;
    const repoId = payload.repository?.id ? `repo_${payload.repository.id}` : 'repo_local';

    const rawIssue = payload.issue;
    const isPR = !!rawIssue.pull_request;
    const labels = (rawIssue.labels || [])
      .map((l: any) => (typeof l === 'string' ? l : l.name || ''))
      .filter(Boolean);

    const triggerIssue: IssueItem = {
      id: rawIssue.id,
      number: rawIssue.number,
      title: rawIssue.title,
      body: rawIssue.body || '',
      state: rawIssue.state === 'closed' ? 'closed' : 'open',
      isPullRequest: isPR,
      author: rawIssue.user?.login || 'anonymous',
      labels,
      url: rawIssue.html_url || `https://github.com/${repoFullName}/issues/${rawIssue.number}`,
      createdAt: rawIssue.created_at || new Date().toISOString(),
      updatedAt: rawIssue.updated_at,
    };

    // 1. Ensure repository is recorded
    await this.store.upsertRepository({
      id: repoId,
      installationId: String(payload.installation?.id || 'inst_default'),
      githubRepoId: payload.repository?.id || 1,
      owner: repoOwner || 'unknown',
      name: repoName || 'unknown',
      fullName: repoFullName,
      isEnabled: true,
    });

    // 2. Fetch repository config (.github/duplicate-hunter.yml)
    let config: RepositoryConfig;
    if (this.client) {
      config = await this.client.fetchRepositoryConfig(repoOwner, repoName);
    } else {
      const storedRepo = await this.store.getRepository(repoId);
      config = storedRepo?.config || (await import('@duplicate-hunter/core')).DEFAULT_REPOSITORY_CONFIG;
    }

    // Check if duplicate detection is enabled
    if (!config.enabled || (isPR ? !config.pullRequests.enabled : !config.issues.enabled)) {
      return {
        skipped: true,
        reason: 'Duplicate Hunter is disabled in configuration for this item type.',
        triggerIssue,
        matches: [],
        commentPosted: false,
      };
    }

    // 3. Index trigger issue in store
    await this.store.upsertIssue(repoId, triggerIssue);
    await this.store.incrementIssuesAnalyzed();

    // 4. Retrieve candidate issues
    let candidates: IssueItem[] = [];
    if (overrideCandidates && overrideCandidates.length > 0) {
      candidates = overrideCandidates;
    } else if (this.client) {
      candidates = await this.client.fetchRecentIssuesAndPRs(repoOwner, repoName, {
        includeClosed: config.issues.searchClosedIssues,
        maxCount: config.issues.maxLookbackIssues,
      });
    } else {
      candidates = await this.store.getRecentIssues(repoId, {
        includeClosed: config.issues.searchClosedIssues,
        limit: config.issues.maxLookbackIssues,
      });
    }

    // 5. Run AI analysis
    const analysis = await this.analyzer.analyzeIssue({
      triggerIssue,
      candidates,
      config,
    });

    const matches = analysis.matches;

    // Filter by minConfidence setting
    const eligibleMatches = matches.filter((m) => {
      if (config.comment.minConfidence === 'high') {
        return m.scoring.confidence === 'high';
      }
      if (config.comment.minConfidence === 'medium') {
        return m.scoring.confidence === 'high' || m.scoring.confidence === 'medium';
      }
      return true; // low accepts all
    });

    if (eligibleMatches.length === 0) {
      return {
        skipped: false,
        reason: 'No duplicate candidates passed the confidence threshold.',
        triggerIssue,
        matches: [],
        commentPosted: false,
      };
    }

    // 6. Record detections in database store for maintainer dashboard
    for (const match of eligibleMatches) {
      await this.store.saveDetection({
        repositoryId: repoId,
        triggerIssueNumber: triggerIssue.number,
        triggerIssueTitle: triggerIssue.title,
        candidateIssueNumber: match.candidate.number,
        candidateIssueTitle: match.candidate.title,
        isCandidatePR: match.isPR,
        confidence: match.scoring.confidence,
        score: match.scoring.overallScore,
        signals: match.signals,
        differenceSummary: match.differenceSummary,
      });
    }

    // 7. Format comment
    const commentMarkdown = formatDuplicateComment({
      triggerIssue,
      matches: eligibleMatches,
      config,
    });

    let commentPosted = false;
    let commentId: number | undefined;
    let labelApplied: string | undefined;
    let checkRunId: number | undefined;

    // 8. False positive check & GitHub API interactions
    if (this.client && config.comment.enabled) {
      const commentResult = await this.client.postOrUpdateComment(
        repoOwner,
        repoName,
        triggerIssue.number,
        commentMarkdown
      );
      commentPosted = true;
      commentId = commentResult.commentId;

      // Apply label if configured
      if (config.labels.enabled && config.labels.label) {
        await this.client.addLabels(repoOwner, repoName, triggerIssue.number, [config.labels.label]);
        labelApplied = config.labels.label;
      }

      // Check run for PRs
      if (isPR && config.checks.enabled && payload.pull_request?.head?.sha) {
        const headSha = payload.pull_request.head.sha;
        const highCount = eligibleMatches.filter((m) => m.scoring.confidence === 'high').length;
        const mediumCount = eligibleMatches.filter((m) => m.scoring.confidence === 'medium').length;

        const summary = [
          'Duplicate Hunter',
          '────────────────────────',
          'Potential related issues/PRs found',
          `High confidence: ${highCount}`,
          `Medium confidence: ${mediumCount}`,
          '',
          'Review recommended.',
        ].join('\n');

        const checkId = await this.client.createCheckRun(
          repoOwner,
          repoName,
          headSha,
          {
            name: 'Duplicate Hunter',
            title: 'Potential related issues/PRs detected',
            summary,
            text: commentMarkdown,
            conclusion: config.checks.failureMode || 'neutral',
          }
        );
        if (checkId) checkRunId = checkId;
      }
    }

    return {
      skipped: false,
      triggerIssue,
      matches: eligibleMatches,
      commentPosted,
      commentId,
      labelApplied,
      checkRunId,
      commentBody: commentMarkdown,
    };
  }
}
