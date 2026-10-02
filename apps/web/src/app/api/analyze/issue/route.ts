import { NextResponse } from 'next/server';
import { HybridAnalysisProvider } from '@duplicate-hunter/ai';
import { DEFAULT_REPOSITORY_CONFIG, IssueItem, RepositoryConfig } from '@duplicate-hunter/core';
import { formatDuplicateComment } from '@duplicate-hunter/github';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const triggerIssue = body.trigger as IssueItem;
    const candidates = (body.candidates || []) as IssueItem[];
    const config = (body.config || DEFAULT_REPOSITORY_CONFIG) as RepositoryConfig;

    if (!triggerIssue || !triggerIssue.title) {
      return NextResponse.json({ error: 'trigger issue with title is required' }, { status: 400 });
    }

    const analyzer = new HybridAnalysisProvider();
    const result = await analyzer.analyzeIssue({
      triggerIssue,
      candidates,
      config,
    });

    const commentMarkdown = formatDuplicateComment({
      triggerIssue,
      matches: result.matches,
      config,
    });

    return NextResponse.json({
      matches: result.matches,
      filteredCount: result.filteredCount,
      commentMarkdown,
      shouldComment: result.matches.length > 0 && config.comment.enabled,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
