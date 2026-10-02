import dotenv from 'dotenv';
import { createBotServer } from './server.js';

dotenv.config();

const port = Number(process.env.BOT_PORT || process.env.PORT || 3001);
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'development-secret';
const githubAppId = process.env.GITHUB_APP_ID;
const githubPrivateKey = process.env.GITHUB_PRIVATE_KEY;

const server = createBotServer({
  port,
  webhookSecret,
  githubAppId,
  githubPrivateKey,
});

server.listen(port, () => {
  console.log(`🤖 Duplicate Hunter GitHub App Service listening on http://localhost:${port}`);
  console.log(`📡 Webhook endpoint: http://localhost:${port}/api/webhook`);
  console.log(`🩺 Health check: http://localhost:${port}/health`);
});
