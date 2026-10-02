import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DuplicateHunterWorkflow } from '@duplicate-hunter/github';
import { DuplicateHunterStore } from '@duplicate-hunter/database';
import { IssueItem } from '@duplicate-hunter/core';
import path from 'node:path';
import fs from 'node:fs';

describe('End-to-End Workflow: Webhook → Analysis → Output → Idempotency', () => {
  const testDbPath = path.join(process.cwd(), '.data', 'workflow-test.json');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  const store = new DuplicateHunterStore(testDbPath);

  const workflow = new DuplicateHunterWorkflow({
    store,
  });

  const existingIssues: IssueItem[] = [
    {
      number: 1927,
      title: 'Crash during CSV import',
      body: 'Application crashes with NullReferenceException when parsing CSV files on Windows 10. Steps to reproduce: 1. Click CSV import 2. Select file 3. Crash',
      state: 'open',
      isPullRequest: false,
      author: 'alice',
      labels: ['bug'],
      url: 'https://github.com/my-org/my-repo/issues/1927',
      createdAt: '2026-09-01T10:00:00Z',
    },
    {
      number: 2144,
      title: 'Application crashes with large CSV files',
      body: 'CSV import large file handling causes application crash.',
      state: 'open',
      isPullRequest: false,
      author: 'charlie',
      labels: ['bug'],
      url: 'https://github.com/my-org/my-repo/issues/2144',
      createdAt: '2026-09-02T10:00:00Z',
    },
  ];

  it('should process issues.opened webhook and produce structured duplicate comment', async () => {
    const webhookPayload = {
      action: 'opened',
      repository: {
        id: 123456,
        name: 'my-repo',
        full_name: 'my-org/my-repo',
        owner: { login: 'my-org' },
      },
      issue: {
        number: 2481,
        title: 'Crash during large CSV import',
        body: 'When importing large CSV files, throws NullReferenceException on Windows 11.\nSteps to reproduce:\n1. Click CSV import\n2. Select file\n3. Crash',
        state: 'open',
        user: { login: 'bob' },
        labels: [{ name: 'bug' }],
        html_url: 'https://github.com/my-org/my-repo/issues/2481',
        created_at: '2026-09-03T10:00:00Z',
      },
      installation: { id: 78910 },
    };

    const result = await workflow.processIssueEvent(webhookPayload, existingIssues);

    assert.strictEqual(result.skipped, false);
    assert.ok(result.matches.length >= 1, 'Should find at least 1 related candidate');
    assert.strictEqual(result.matches[0].candidate.number, 1927);

    // Verify comment content
    const comment = result.commentBody || '';
    assert.ok(comment.includes('### 🕵️ Duplicate Hunter'));
    assert.ok(comment.includes('#1927 — Crash during CSV import'));
    assert.ok(comment.includes('Confidence: High'));
    assert.ok(comment.includes('Matching signals:'));
    assert.ok(comment.includes('NullReferenceException'));
    assert.ok(comment.includes('⚠️ **This may be a duplicate. Please review before closing.**'));

    // Verify database record
    const repo = await store.getRepositoryByOwnerAndName('my-org', 'my-repo');
    assert.ok(repo);
    const detections = await store.listDetections({ repositoryId: repo.id });
    assert.ok(detections.length >= 1);
    assert.strictEqual(detections[0].triggerIssueNumber, 2481);
    assert.strictEqual(detections[0].candidateIssueNumber, 1927);
  });
});
