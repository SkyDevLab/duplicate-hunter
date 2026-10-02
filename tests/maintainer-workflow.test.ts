import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DuplicateHunterStore } from '@duplicate-hunter/database';
import fs from 'node:fs';
import path from 'node:path';

describe('Maintainer Review Workflow & Privacy Deletion', () => {
  const testStoragePath = path.join(process.cwd(), '.data', 'test-store.json');

  // Clean test file if exists
  if (fs.existsSync(testStoragePath)) {
    fs.unlinkSync(testStoragePath);
  }

  const testStore = new DuplicateHunterStore(testStoragePath);

  it('should record maintainer feedback decisions and update statistics', async () => {
    // 1. Create repo and detection
    const repo = await testStore.upsertRepository({
      installationId: 'inst_1',
      githubRepoId: 99999,
      owner: 'acme',
      name: 'widget',
      fullName: 'acme/widget',
      isEnabled: true,
    });

    const detection = await testStore.saveDetection({
      repositoryId: repo.id,
      triggerIssueNumber: 2481,
      triggerIssueTitle: 'Crash on CSV',
      candidateIssueNumber: 1927,
      candidateIssueTitle: 'Crash on large CSV',
      isCandidatePR: false,
      confidence: 'high',
      score: 0.88,
      signals: {
        matchedErrors: [],
        matchedExceptions: ['NullReferenceException'],
        matchedStackFrames: [],
        matchedComponents: ['csv import'],
        matchedEnvironments: [],
        matchedVersions: [],
        matchedReproductionSteps: [],
        matchedLabels: [],
        matchedReferencedCode: [],
        matchedIssueNumbers: [],
      },
    });

    assert.strictEqual(detection.status, 'pending');

    // 2. Maintainer confirms duplicate
    const reviewResult = await testStore.recordDecision(
      detection.id,
      'maintainer-jane',
      'confirmed_duplicate',
      'Verified: this is the exact same stack trace.'
    );

    assert.strictEqual(reviewResult.detection.status, 'confirmed');
    assert.strictEqual(reviewResult.detection.maintainerDecision, 'confirmed_duplicate');

    // 3. Check stats
    const stats = await testStore.getOverviewStats(repo.id);
    assert.strictEqual(stats.confirmedDuplicates, 1);
    assert.strictEqual(stats.issuesSaved, 1);
  });

  it('should support privacy data deletion permanently removing repository records', async () => {
    const repo = await testStore.getRepositoryByOwnerAndName('acme', 'widget');
    assert.ok(repo);

    const deletion = await testStore.deleteRepositoryData(repo.id);
    assert.strictEqual(deletion.deleted, true);

    const repoAfter = await testStore.getRepository(repo.id);
    assert.strictEqual(repoAfter, null);

    const detectionsAfter = await testStore.listDetections({ repositoryId: repo.id });
    assert.strictEqual(detectionsAfter.length, 0);
  });
});
