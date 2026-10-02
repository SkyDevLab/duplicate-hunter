# Deployment Guide for Duplicate Hunter

You can deploy Duplicate Hunter in multiple ways depending on your infrastructure requirements.

---

## Option 1: 100% Native on GitHub (Zero External Server)

Duplicate Hunter can run directly inside **GitHub Actions** using GitHub's built-in compute and `GITHUB_TOKEN`.
No external server, no VPS, no webhook URL, and no hosting costs are required.

### How it works:
1. When an issue or PR is opened, GitHub Actions launches automatically.
2. The Action analyzes existing issues using GitHub's API.
3. If duplicates or related issues are found above the threshold, Duplicate Hunter posts the structured comment and applies labels directly from the action.

### Setup (Takes 2 minutes):
1. Copy [`.github/duplicate-hunter.yml`](../.github/duplicate-hunter.yml) into your repository's `.github/` folder.
2. Add the workflow file `.github/workflows/duplicate-hunter.yml`:

```yaml
name: Duplicate Hunter

on:
  issues:
    types: [opened, edited]
  pull_request:
    types: [opened, edited]

permissions:
  issues: write
  pull-requests: write
  checks: write
  contents: read

jobs:
  detect-duplicates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - uses: ./
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## Option 2: Deploy as a Centralized GitHub App on Vercel (Free & Instant)

To provide a shared bot across multiple repositories with the modern maintainer dashboard:

1. **Deploy to Vercel:**
   - Push your repository to GitHub.
   - Import the repository on [Vercel](https://vercel.com).
   - Set Root Directory to `apps/web`.
   - Set environment variables:
     - `GITHUB_APP_ID`: Your GitHub App ID.
     - `GITHUB_PRIVATE_KEY`: Your GitHub App Private Key (`.pem` format).
     - `GITHUB_WEBHOOK_SECRET`: Your webhook secret.
     - `OPENAI_API_KEY`: *(Optional)* If using OpenAI embeddings.
2. **Configure GitHub App Webhook:**
   - Set Webhook URL to: `https://your-vercel-app.vercel.app/api/webhook`
   - Set Webhook Secret to match `GITHUB_WEBHOOK_SECRET`.
   - Install the GitHub App on your target repositories.

---

## Option 3: Deploy with Docker Compose (Self-Hosted / VPS / Cloud)

Run the full stack (PostgreSQL with `pgvector`, Next.js Dashboard, and GitHub App bot worker):

```bash
# 1. Clone repository
git clone https://github.com/your-org/duplicate-hunter.git
cd duplicate-hunter

# 2. Configure environment
cp .env.example .env

# 3. Launch full stack
docker compose up -d
```

### Endpoints:
- **Web Dashboard:** `http://localhost:3000`
- **Bot Webhook Service:** `http://localhost:3001/api/webhook`
- **Health Check:** `http://localhost:3001/health`

---

## Option 4: Publish to GitHub Container Registry (ghcr.io)

You can build and publish the container image to GitHub Packages (`ghcr.io`):

```bash
# Build image
docker build -t ghcr.io/your-username/duplicate-hunter:latest .

# Login to GitHub Container Registry
echo $CR_PAT | docker login ghcr.io -u your-username --password-stdin

# Push image
docker push ghcr.io/your-username/duplicate-hunter:latest
```
