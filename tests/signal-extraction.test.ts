import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractSignalsFromIssue } from '@duplicate-hunter/similarity';
import { IssueItem } from '@duplicate-hunter/core';

describe('Signal Extraction', () => {
  const issueWithCrash: IssueItem = {
    number: 1927,
    title: 'Crash during CSV import',
    body: `
### Describe the bug
Application throws a NullReferenceException when parsing large CSV data files on Windows 10.
Version: v2.1.0

### Stack Trace
\`\`\`text
at CsvParser.ProcessFile (src/parser/csv.ts:42)
in System.NullReferenceException: Object reference not set to an instance of an object
\`\`\`

### Steps to reproduce
1. Open the application
2. Click on CSV import menu
3. Select a large CSV file (> 500MB)
4. Application crashes
`,
    state: 'open',
    isPullRequest: false,
    author: 'alice',
    labels: ['bug', 'csv-parser'],
    url: 'https://github.com/org/repo/issues/1927',
    createdAt: '2026-09-01T10:00:00Z',
  };

  it('should extract exceptions correctly', () => {
    const signals = extractSignalsFromIssue(issueWithCrash);
    assert.ok(
      signals.exceptions.some((e) => e.toLowerCase().includes('nullreferenceexception')),
      `Expected NullReferenceException, got: ${signals.exceptions.join(', ')}`
    );
  });

  it('should extract operating systems and versions', () => {
    const signals = extractSignalsFromIssue(issueWithCrash);
    assert.ok(
      signals.environments.some((env) => env.toLowerCase().includes('windows 10')),
      `Expected Windows 10, got: ${signals.environments.join(', ')}`
    );
    assert.ok(
      signals.versions.some((v) => v.includes('2.1.0')),
      `Expected v2.1.0, got: ${signals.versions.join(', ')}`
    );
  });

  it('should extract components and referenced files', () => {
    const signals = extractSignalsFromIssue(issueWithCrash);
    assert.ok(
      signals.components.some((c) => c.includes('csv import') || c.includes('csv parser')),
      `Expected CSV import/parser component, got: ${signals.components.join(', ')}`
    );
    assert.ok(
      signals.referencedCode.some((code) => code.includes('csv.ts')),
      `Expected csv.ts, got: ${signals.referencedCode.join(', ')}`
    );
  });

  it('should extract reproduction steps', () => {
    const signals = extractSignalsFromIssue(issueWithCrash);
    assert.ok(signals.reproductionSteps.length >= 3, `Expected at least 3 steps, got: ${signals.reproductionSteps.length}`);
    assert.ok(signals.reproductionSteps.some((step) => step.toLowerCase().includes('csv import')));
  });
});
