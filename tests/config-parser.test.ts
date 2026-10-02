import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseRepositoryConfig, validateRepositoryConfig } from '@duplicate-hunter/config';

describe('Repository Config Parser & Validator', () => {
  it('should parse valid .github/duplicate-hunter.yml config', () => {
    const yaml = `
enabled: true

issues:
  enabled: true
  threshold: 0.78
  searchClosedIssues: true
  maxLookbackIssues: 500

pullRequests:
  enabled: true
  threshold: 0.80

maxCandidates: 5

comment:
  enabled: true
  minConfidence: medium

labels:
  enabled: true
  label: possible-duplicate
`;

    const config = parseRepositoryConfig(yaml);
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.issues.threshold, 0.78);
    assert.strictEqual(config.issues.searchClosedIssues, true);
    assert.strictEqual(config.issues.maxLookbackIssues, 500);
    assert.strictEqual(config.pullRequests.threshold, 0.80);
    assert.strictEqual(config.maxCandidates, 5);
    assert.strictEqual(config.comment.minConfidence, 'medium');
    assert.strictEqual(config.labels.label, 'possible-duplicate');
  });

  it('should safely fall back to defaults on empty or invalid YAML', () => {
    const configNull = parseRepositoryConfig(null);
    assert.strictEqual(configNull.enabled, true);
    assert.strictEqual(configNull.issues.threshold, 0.78);
    assert.strictEqual(configNull.comment.minConfidence, 'medium');

    const configCorrupt = parseRepositoryConfig('invalid: [unclosed');
    assert.strictEqual(configCorrupt.enabled, true);
  });

  it('should clamp threshold values to safe range [0.1, 1.0]', () => {
    const yaml = `
issues:
  threshold: 99.9
pullRequests:
  threshold: -0.5
`;
    const config = parseRepositoryConfig(yaml);
    assert.strictEqual(config.issues.threshold, 1.0);
    assert.strictEqual(config.pullRequests.threshold, 0.1);
  });

  it('should report validation errors for malformed syntax', () => {
    const validation = validateRepositoryConfig('enabled: [unclosed array');
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors.length > 0);
  });
});
