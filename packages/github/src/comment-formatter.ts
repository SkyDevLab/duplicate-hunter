import { CandidateMatch, IssueItem, RepositoryConfig } from '@duplicate-hunter/core';

export interface CommentFormatOptions {
  triggerIssue: IssueItem;
  matches: CandidateMatch[];
  config: RepositoryConfig;
}

export function formatDuplicateComment(options: CommentFormatOptions): string {
  const { matches, config } = options;

  if (!matches || matches.length === 0) {
    return '';
  }

  const header = config.comment.header || '### 🕵️ Duplicate Hunter';
  const matchCount = matches.length;
  const countLabel =
    matchCount === 1 ? '1 potentially related item' : `${matchCount} potentially related issues`;

  const sections: string[] = [];

  // 1. Header & Lead
  sections.push(`${header}\n\nI found **${countLabel}**.`);

  // 2. Candidate items
  for (const match of matches) {
    const candidate = match.candidate;
    const itemPrefix = candidate.isPullRequest ? 'PR #' : '#';
    const confidenceCapitalized =
      match.scoring.confidence.charAt(0).toUpperCase() + match.scoring.confidence.slice(1);

    const candidateLines: string[] = [];
    candidateLines.push(`#### ${itemPrefix}${candidate.number} — ${candidate.title}`);
    candidateLines.push(`\n**Confidence: ${confidenceCapitalized}**`);

    if (candidate.isPullRequest) {
      candidateLines.push(`\n> 💡 *This issue may already be addressed by PR #${candidate.number}.*`);
    } else if (candidate.state === 'closed') {
      const releaseInfo = candidate.fixedInRelease
        ? ` (resolved in \`${candidate.fixedInRelease}\`)`
        : '';
      candidateLines.push(`\n> ℹ️ *Historical closed issue${releaseInfo}.*`);
    }

    if (match.explanationPoints && match.explanationPoints.length > 0) {
      candidateLines.push('\nMatching signals:\n');
      for (const point of match.explanationPoints) {
        candidateLines.push(`* ✓ ${point}`);
      }
    }

    sections.push(candidateLines.join('\n'));
  }

  // 3. Difference Section (if any difference was detected)
  const differences = matches
    .map((m) => m.differenceSummary)
    .filter((d): d is string => !!d && d.trim().length > 0);

  if (differences.length > 0) {
    sections.push(`### Difference\n\n${differences.join('\n\n')}`);
  }

  // 4. Disclaimer & Maintainer Notice
  sections.push('⚠️ **This may be a duplicate. Please review before closing.**');

  // 5. Links
  const links = matches.map((m) => `[View #${m.candidate.number}](${m.candidate.url})`).join(' ');
  sections.push(links);

  // 6. Hidden Metadata for idempotency and bot comment tracking
  const candidateNumbers = matches.map((m) => m.candidate.number);
  const metadata = {
    v: 1,
    candidates: candidateNumbers,
    topConfidence: matches[0]?.scoring.confidence || 'low',
    scores: matches.map((m) => Math.round(m.scoring.overallScore * 100) / 100),
  };

  const hiddenMetadataTag = `<!-- duplicate-hunter:meta ${JSON.stringify(metadata)} -->`;
  sections.push(hiddenMetadataTag);

  return sections.join('\n\n');
}

export function parseCommentMetadata(body?: string | null): {
  isDuplicateHunterComment: boolean;
  candidates: number[];
  topConfidence?: string;
} {
  if (!body) {
    return { isDuplicateHunterComment: false, candidates: [] };
  }

  const match = body.match(/<!-- duplicate-hunter:meta\s+({[\s\S]*?})\s+-->/);
  if (!match) {
    const hasHeader = body.includes('### 🕵️ Duplicate Hunter');
    return { isDuplicateHunterComment: hasHeader, candidates: [] };
  }

  try {
    const parsed = JSON.parse(match[1]);
    return {
      isDuplicateHunterComment: true,
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
      topConfidence: parsed.topConfidence,
    };
  } catch {
    return { isDuplicateHunterComment: true, candidates: [] };
  }
}
