import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatDuplicateComment, parseCommentMetadata } from '@duplicate-hunter/github';
import { CandidateMatch, DEFAULT_REPOSITORY_CONFIG, IssueItem } from '@duplicate-hunter/core';

describe('GitHub Comment Formatting & Idempotency Metadata', () => {
  const triggerIssue: IssueItem = {
    number: 2481,
    title: 'Crash during large CSV import',
    body: 'Throws NullReferenceException on Windows 11',
    state: 'open',
    isPullRequest: false,
    author: 'bob',
    labels: ['bug'],
    url: 'https://github.com/org/repo/issues/2481',
    createdAt: '2026-09-02T10:00:00Z',
  };

  const candidate1: CandidateMatch = {
    candidate: {
      number: 1927,
      title: 'Crash during CSV import',
      body: 'Throws NullReferenceException on Windows 10',
      state: 'open',
      isPullRequest: false,
      author: 'alice',
      labels: ['bug'],
      url: 'https://github.com/org/repo/issues/1927',
      createdAt: '2026-09-01T10:00:00Z',
    },
    scoring: {
      semanticSimilarity: 0.88,
      errorSimilarity: 0.95,
      componentSimilarity: 0.9,
      environmentSimilarity: 0.5,
      versionSimilarity: 0.8,
      reproductionSimilarity: 0.7,
      labelSimilarity: 0.8,
      referencedCodeSimilarity: 0.6,
      overallScore: 0.89,
      confidence: 'high',
    },
    signals: {
      matchedErrors: ['NullReferenceException'],
      matchedExceptions: ['NullReferenceException'],
      matchedStackFrames: [],
      matchedComponents: ['csv import'],
      matchedEnvironments: [],
      matchedVersions: [],
      matchedReproductionSteps: [],
      matchedLabels: ['bug'],
      matchedReferencedCode: [],
      matchedIssueNumbers: [],
    },
    explanationPoints: [
      'Same CSV import operation',
      'Similar crash description',
      'Same `NullReferenceException`',
      'Same affected component',
    ],
    differenceSummary: 'The new issue reports Windows 11, while #1927 was reported on Windows 10.',
    isPR: false,
    isClosed: false,
  };

  it('should format comment strictly matching required developer-tool specification', () => {
    const commentMarkdown = formatDuplicateComment({
      triggerIssue,
      matches: [candidate1],
      config: DEFAULT_REPOSITORY_CONFIG,
    });

    assert.ok(commentMarkdown.includes('### 🕵️ Duplicate Hunter'));
    assert.ok(commentMarkdown.includes('#### #1927 — Crash during CSV import'));
    assert.ok(commentMarkdown.includes('**Confidence: High**'));
    assert.ok(commentMarkdown.includes('* ✓ Same CSV import operation'));
    assert.ok(commentMarkdown.includes('* ✓ Same `NullReferenceException`'));
    assert.ok(commentMarkdown.includes('### Difference'));
    assert.ok(commentMarkdown.includes('Windows 11, while #1927 was reported on Windows 10'));
    assert.ok(commentMarkdown.includes('⚠️ **This may be a duplicate. Please review before closing.**'));
    assert.ok(commentMarkdown.includes('[View #1927](https://github.com/org/repo/issues/1927)'));
  });

  it('should embed and parse hidden metadata for idempotency', () => {
    const commentMarkdown = formatDuplicateComment({
      triggerIssue,
      matches: [candidate1],
      config: DEFAULT_REPOSITORY_CONFIG,
    });

    const meta = parseCommentMetadata(commentMarkdown);
    assert.strictEqual(meta.isDuplicateHunterComment, true);
    assert.deepStrictEqual(meta.candidates, [1927]);
    assert.strictEqual(meta.topConfidence, 'high');
  });
});
