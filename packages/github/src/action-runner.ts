import fs from 'node:fs';
import { DuplicateHunterWorkflow } from './workflow-runner.js';
import { GitHubClient } from './github-client.js';
import { store } from '@duplicate-hunter/database';
import { HybridAnalysisProvider } from '@duplicate-hunter/ai';

export async function runGitHubAction() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    console.error('❌ GITHUB_EVENT_PATH not found. Are you running inside a GitHub Action?');
    process.exit(1);
  }

  const token =
    process.env.INPUT_GITHUB_TOKEN ||
    process.env['INPUT_GITHUB-TOKEN'] ||
    process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('❌ No GitHub token provided. Please provide github-token input or GITHUB_TOKEN environment variable.');
    process.exit(1);
  }

  const rawEvent = fs.readFileSync(eventPath, 'utf8');
  const payload = JSON.parse(rawEvent);

  console.log(`🔍 [Duplicate Hunter Action] Triggered by ${process.env.GITHUB_EVENT_NAME}.${payload.action}`);

  const client = new GitHubClient({ token });
  const workflow = new DuplicateHunterWorkflow({
    client,
    store,
    analyzer: new HybridAnalysisProvider(),
  });

  const result = await workflow.processIssueEvent(payload);

  if (result.skipped) {
    console.log(`⏩ [Duplicate Hunter Action] Skipped: ${result.reason}`);
    return;
  }

  console.log(`✅ [Duplicate Hunter Action] Finished evaluation. Found ${result.matches.length} matching candidate(s).`);
  if (result.commentPosted) {
    console.log(`💬 [Duplicate Hunter Action] Comment successfully posted to #${result.triggerIssue.number} (comment ID: ${result.commentId}).`);
  } else {
    console.log(`ℹ️ [Duplicate Hunter Action] No comment needed (candidates below threshold or already commented).`);
  }
}

if (process.env.GITHUB_ACTIONS === 'true') {
  runGitHubAction().catch((err) => {
    console.error('❌ [Duplicate Hunter Action] Fatal error:', err);
    process.exit(1);
  });
}
