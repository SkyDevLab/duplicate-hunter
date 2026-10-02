# GitHub App Registration & Setup Guide

This guide walks you through registering your Duplicate Hunter GitHub App on GitHub.

## 1. Register GitHub App on GitHub

1. Navigate to **GitHub Settings → Developer Settings → GitHub Apps → New GitHub App**.
2. **App name**: `Duplicate Hunter` (or your custom organization name).
3. **Homepage URL**: `https://your-domain.com` (or `http://localhost:3000`).
4. **Webhook URL**: `https://your-domain.com/api/webhook` (e.g. using `smee.io` or `ngrok` for local development).
5. **Webhook secret**: Generate a secure secret and set as `GITHUB_WEBHOOK_SECRET`.

## 2. Permissions

Configure least-privilege permissions:

| Permission | Access | Reason |
| :--- | :--- | :--- |
| **Issues** | Read & Write | Read recent issues; post duplicate detection explanation comments |
| **Pull Requests** | Read & Write | Detect duplicate PRs; suggest addressing PRs |
| **Checks** | Read & Write | Post Duplicate Hunter check summaries on pull requests |
| **Single File (.github/duplicate-hunter.yml)** | Read-only | Load repository configuration file |
| **Metadata** | Read-only | Basic repository metadata |

## 3. Subscribe to Events

Check the following webhook event subscriptions:
- `Issues`
- `Pull request`

## 4. Generate Private Key

1. Scroll to the bottom of your GitHub App settings page.
2. Click **Generate a private key**.
3. Download the `.pem` file and copy its content into the `GITHUB_PRIVATE_KEY` environment variable.
4. Note your **App ID** and set as `GITHUB_APP_ID`.

## 5. Install the App on a Repository

1. In the GitHub App settings, click **Install App** in the sidebar.
2. Select your account or organization.
3. Choose **Only select repositories** and pick your target repository.
4. Open a test issue with a crash description or stack trace to see Duplicate Hunter in action!
