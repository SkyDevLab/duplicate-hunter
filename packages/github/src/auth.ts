import jwt from 'jsonwebtoken';

export interface GitHubAppAuthConfig {
  appId: string;
  privateKey: string;
  baseUrl?: string;
}

export interface CachedToken {
  token: string;
  expiresAt: number; // timestamp in ms
}

export class GitHubAppAuth {
  private appId: string;
  private privateKey: string;
  private baseUrl: string;
  private tokenCache = new Map<number, CachedToken>();

  constructor(config: GitHubAppAuthConfig) {
    this.appId = config.appId;
    this.privateKey = config.privateKey;
    this.baseUrl = (config.baseUrl || 'https://api.github.com').replace(/\/+$/, '');
  }

  public createAppJwt(): string {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const payload = {
      iat: nowInSeconds - 60, // 60 seconds in the past to prevent clock drift
      exp: nowInSeconds + 9 * 60, // 9 minutes expiration (GitHub max is 10)
      iss: this.appId,
    };

    return jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });
  }

  public async getInstallationAccessToken(installationId: number): Promise<string> {
    const cached = this.tokenCache.get(installationId);
    const now = Date.now();

    // Re-use token if it has at least 2 minutes remaining
    if (cached && cached.expiresAt - now > 120_000) {
      return cached.token;
    }

    const appJwt = this.createAppJwt();
    const response = await fetch(
      `${this.baseUrl}/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Duplicate-Hunter-App',
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Failed to obtain installation access token for installation ${installationId}: ${response.status} ${errText}`
      );
    }

    const data = (await response.json()) as { token: string; expires_at: string };
    const expiresAt = new Date(data.expires_at).getTime();

    this.tokenCache.set(installationId, {
      token: data.token,
      expiresAt,
    });

    return data.token;
  }
}
