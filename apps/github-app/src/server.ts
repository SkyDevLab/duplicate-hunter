import http, { IncomingMessage, ServerResponse } from 'node:http';
import { verifyWebhookSignature, DuplicateHunterWorkflow, GitHubClient, GitHubAppAuth } from '@duplicate-hunter/github';
import { store } from '@duplicate-hunter/database';
import { HybridAnalysisProvider } from '@duplicate-hunter/ai';
import { IssueItem } from '@duplicate-hunter/core';

export interface ServerConfig {
  port: number;
  webhookSecret: string;
  githubAppId?: string;
  githubPrivateKey?: string;
}

export function createBotServer(config: ServerConfig) {
  let appAuth: GitHubAppAuth | null = null;
  if (config.githubAppId && config.githubPrivateKey) {
    appAuth = new GitHubAppAuth({
      appId: config.githubAppId,
      privateKey: config.githubPrivateKey,
    });
  }

  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers for local dashboard integration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // --- Health Check ---
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'duplicate-hunter-bot', timestamp: new Date().toISOString() }));
      return;
    }

    // --- GitHub Webhook ---
    if (url.pathname === '/api/webhook' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', async () => {
        const rawBody = Buffer.concat(chunks);
        const signature = req.headers['x-hub-signature-256'] as string | undefined;

        // Verify webhook signature
        if (config.webhookSecret) {
          const isValid = verifyWebhookSignature(rawBody, signature, config.webhookSecret);
          if (!isValid) {
            console.warn('[Webhook] Invalid signature received.');
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid webhook signature' }));
            return;
          }
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody.toString('utf8'));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
          return;
        }

        // Return 202 Accepted immediately so GitHub webhook does not time out (Section 14 MVP mode)
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Webhook received for asynchronous processing' }));

        // Asynchronous background workflow execution
        const eventName = req.headers['x-github-event'] as string;
        if (eventName === 'issues' || eventName === 'pull_request') {
          try {
            let client: GitHubClient | undefined;
            if (appAuth && payload.installation?.id) {
              const token = await appAuth.getInstallationAccessToken(payload.installation.id);
              client = new GitHubClient({ token });
            }

            const workflow = new DuplicateHunterWorkflow({
              client,
              store,
              analyzer: new HybridAnalysisProvider(),
            });

            console.log(`[Webhook] Processing ${eventName}.${payload.action} for ${payload.repository?.full_name}#${payload.issue?.number || payload.pull_request?.number}`);
            const result = await workflow.processIssueEvent(payload);
            console.log(`[Webhook] Process completed: ${result.skipped ? 'Skipped (' + result.reason + ')' : 'Found ' + result.matches.length + ' candidates, commented=' + result.commentPosted}`);
          } catch (err: any) {
            console.error('[Webhook] Error processing issue event:', err);
          }
        }
      });
      return;
    }

    // --- Direct Issue Analysis API (Section 19) ---
    if (url.pathname === '/api/analyze/issue' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const trigger: IssueItem = body.trigger;
          const candidates: IssueItem[] = body.candidates || [];
          const repositoryConfig = body.config;

          const analyzer = new HybridAnalysisProvider();
          const result = await analyzer.analyzeIssue({
            triggerIssue: trigger,
            candidates,
            config: repositoryConfig || (await import('@duplicate-hunter/core')).DEFAULT_REPOSITORY_CONFIG,
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Fallback 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return server;
}
