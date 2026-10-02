import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HybridAnalysisProvider } from '@duplicate-hunter/ai';
import { DEFAULT_REPOSITORY_CONFIG, IssueItem } from '@duplicate-hunter/core';

describe('Similarity Fixtures & Duplicate Detection', () => {
  const analyzer = new HybridAnalysisProvider();

  it('should detect High similarity between 2GB CSV crash and very large CSV crash', async () => {
    const triggerIssue: IssueItem = {
      number: 2481,
      title: 'Application crashes when importing a 2GB CSV',
      body: `When importing a 2GB CSV file, the application immediately crashes with NullReferenceException.
Steps to reproduce:
1. Open import modal
2. Select 2GB CSV file
3. Click process
Observed: Application crash on Windows 11`,
      state: 'open',
      isPullRequest: false,
      author: 'bob',
      labels: ['bug', 'crash'],
      url: 'https://github.com/org/repo/issues/2481',
      createdAt: '2026-09-02T10:00:00Z',
    };

    const candidateB: IssueItem = {
      number: 1927,
      title: 'CSV parser crashes when processing very large files',
      body: `The CSV parser crashes with NullReferenceException whenever processing very large files.
Steps to reproduce:
1. Open CSV import
2. Upload large file (> 1GB)
3. Application crashes with NullReferenceException on Windows 10`,
      state: 'open',
      isPullRequest: false,
      author: 'alice',
      labels: ['bug', 'crash'],
      url: 'https://github.com/org/repo/issues/1927',
      createdAt: '2026-09-01T10:00:00Z',
    };

    const result = await analyzer.analyzeIssue({
      triggerIssue,
      candidates: [candidateB],
      config: DEFAULT_REPOSITORY_CONFIG,
    });

    assert.strictEqual(result.matches.length, 1, 'Should match candidate 1927');
    const match = result.matches[0];
    assert.strictEqual(match.candidate.number, 1927);
    assert.ok(
      match.scoring.confidence === 'high' || match.scoring.overallScore >= 0.75,
      `Expected high confidence score, got score=${match.scoring.overallScore}, confidence=${match.scoring.confidence}`
    );
    assert.ok(match.explanationPoints.length >= 2, 'Should provide matching signal explanation points');
  });

  it('should detect Low similarity between CSV crash and CSV documentation', async () => {
    const triggerIssue: IssueItem = {
      number: 2500,
      title: 'CSV import crashes',
      body: 'Application crashes with fatal error when importing CSV.',
      state: 'open',
      isPullRequest: false,
      author: 'bob',
      labels: ['bug'],
      url: 'https://github.com/org/repo/issues/2500',
      createdAt: '2026-09-03T10:00:00Z',
    };

    const candidateDoc: IssueItem = {
      number: 2100,
      title: 'Improve CSV import documentation',
      body: 'We should update the README and add a markdown guide explaining how to format CSV headers properly.',
      state: 'open',
      isPullRequest: false,
      author: 'carol',
      labels: ['documentation'],
      url: 'https://github.com/org/repo/issues/2100',
      createdAt: '2026-09-01T10:00:00Z',
    };

    const result = await analyzer.analyzeIssue({
      triggerIssue,
      candidates: [candidateDoc],
      config: DEFAULT_REPOSITORY_CONFIG,
    });

    // Should NOT be matched as duplicate because score is below threshold (0.78)
    assert.strictEqual(result.matches.length, 0, 'Documentation issue should not match as a duplicate candidate');
    assert.strictEqual(result.filteredCount, 1, 'Should be filtered out');
  });
});
