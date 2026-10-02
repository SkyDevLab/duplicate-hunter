import { Octokit } from '@octokit/rest';
import { IssueItem, RepositoryConfig } from '@duplicate-hunter/core';
import { parseRepositoryConfig, CONFIG_FILE_PATHS } from '@duplicate-hunter/config';
import { parseCommentMetadata } from './comment-formatter.js';

export interface GitHubClientOptions {
  token: string;
  baseUrl?: string;
}

export class GitHubClient {
  public readonly octokit: Octokit;

  constructor(options: GitHubClientOptions) {
    this.octokit = new Octokit({
      auth: options.token,
      baseUrl: options.baseUrl,
    });
  }

  /**
   * Fetches .github/duplicate-hunter.yml or .yaml from the target repository.
   * If not found, falls back safely to default configuration.
   */
  async fetchRepositoryConfig(owner: string, repo: string): Promise<RepositoryConfig> {
    for (const configPath of CONFIG_FILE_PATHS) {
      try {
        const response = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path: configPath,
        });

        if ('content' in response.data && typeof response.data.content === 'string') {
          const yamlContent = Buffer.from(response.data.content, 'base64').toString('utf8');
          return parseRepositoryConfig(yamlContent);
        }
      } catch (err: any) {
        if (err.status !== 404) {
          console.warn(`Error reading config file ${configPath} in ${owner}/${repo}:`, err.message);
        }
      }
    }

    return parseRepositoryConfig(null);
  }

  /**
   * Fetches recent issues and pull requests with pagination up to maxLookback.
   */
  async fetchRecentIssuesAndPRs(
    owner: string,
    repo: string,
    options: {
      includeClosed: boolean;
      maxCount: number;
    }
  ): Promise<IssueItem[]> {
    const results: IssueItem[] = [];
    const perPage = 100;
    const states: Array<'open' | 'closed'> = options.includeClosed ? ['open', 'closed'] : ['open'];

    for (const state of states) {
      let page = 1;
      while (results.length < options.maxCount) {
        try {
          const response = await this.octokit.rest.issues.listForRepo({
            owner,
            repo,
            state,
            per_page: perPage,
            page,
            sort: 'updated',
            direction: 'desc',
          });

          if (!response.data || response.data.length === 0) {
            break;
          }

          for (const item of response.data) {
            const isPullRequest = !!item.pull_request;
            const labels = (item.labels || [])
              .map((l) => (typeof l === 'string' ? l : l.name || ''))
              .filter(Boolean);

            results.push({
              id: item.id,
              number: item.number,
              title: item.title,
              body: item.body || '',
              state: item.state === 'closed' ? 'closed' : 'open',
              isPullRequest,
              author: item.user?.login || 'unknown',
              labels,
              url: item.html_url,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
              closedAt: item.closed_at || undefined,
            });

            if (results.length >= options.maxCount) break;
          }

          if (response.data.length < perPage) break;
          page++;
        } catch (err: any) {
          console.error(`Error fetching issues for ${owner}/${repo} (state: ${state}):`, err.message);
          break;
        }
      }
    }

    return results;
  }

  /**
   * Checks whether Duplicate Hunter has already commented on the issue.
   */
  async findExistingDuplicateHunterComment(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<{ id: number; body: string; candidates: number[] } | null> {
    try {
      const response = await this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
        per_page: 50,
      });

      for (const comment of response.data) {
        const meta = parseCommentMetadata(comment.body);
        if (meta.isDuplicateHunterComment) {
          return {
            id: comment.id,
            body: comment.body || '',
            candidates: meta.candidates,
          };
        }
      }
      return null;
    } catch (err: any) {
      console.warn(`Error checking existing comments on ${owner}/${repo}#${issueNumber}:`, err.message);
      return null;
    }
  }

  /**
   * Posts a new comment or updates an existing one if already present.
   */
  async postOrUpdateComment(
    owner: string,
    repo: string,
    issueNumber: number,
    commentMarkdown: string
  ): Promise<{ commentId: number; updated: boolean }> {
    const existing = await this.findExistingDuplicateHunterComment(owner, repo, issueNumber);

    if (existing) {
      const existingMeta = parseCommentMetadata(existing.body);
      const newMeta = parseCommentMetadata(commentMarkdown);

      // Check if candidate list is identical to avoid redundant comment edits
      const sameCandidates =
        existingMeta.candidates.length === newMeta.candidates.length &&
        existingMeta.candidates.every((c) => newMeta.candidates.includes(c));

      if (sameCandidates) {
        return { commentId: existing.id, updated: false };
      }

      await this.octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body: commentMarkdown,
      });

      return { commentId: existing.id, updated: true };
    }

    const created = await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: commentMarkdown,
    });

    return { commentId: created.data.id, updated: false };
  }

  /**
   * Adds labels to an issue or pull request.
   */
  async addLabels(owner: string, repo: string, issueNumber: number, labels: string[]): Promise<void> {
    if (!labels || labels.length === 0) return;
    try {
      await this.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels,
      });
    } catch (err: any) {
      console.warn(`Failed to add labels [${labels.join(', ')}] to ${owner}/${repo}#${issueNumber}:`, err.message);
    }
  }

  /**
   * Creates a GitHub Check Run (Checks API).
   */
  async createCheckRun(
    owner: string,
    repo: string,
    headSha: string,
    checkData: {
      name: string;
      title: string;
      summary: string;
      text?: string;
      conclusion?: 'neutral' | 'success' | 'failure';
    }
  ): Promise<number | null> {
    try {
      const response = await this.octokit.rest.checks.create({
        owner,
        repo,
        name: checkData.name,
        head_sha: headSha,
        status: 'completed',
        conclusion: checkData.conclusion || 'neutral',
        output: {
          title: checkData.title,
          summary: checkData.summary,
          text: checkData.text,
        },
      });
      return response.data.id;
    } catch (err: any) {
      console.warn(`Failed to create check run on ${owner}/${repo}@${headSha}:`, err.message);
      return null;
    }
  }
}
