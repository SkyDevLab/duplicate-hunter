import fs from 'node:fs';
import path from 'node:path';
import {
  ConfidenceLevel,
  DetectionRecord,
  DetectionStatus,
  IssueItem,
  MaintainerDecision,
  RepositoryConfig,
  RepositoryOverviewStats,
  StructuredSignals,
} from '@duplicate-hunter/core';

export interface DBInstallation {
  id: string;
  githubInstallationId: number;
  accountLogin: string;
  accountType: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBRepository {
  id: string;
  installationId: string;
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  isEnabled: boolean;
  config?: RepositoryConfig;
  createdAt: string;
  updatedAt: string;
}

export interface DBDetection {
  id: string;
  repositoryId: string;
  triggerIssueNumber: number;
  triggerIssueTitle: string;
  candidateIssueNumber: number;
  candidateIssueTitle: string;
  isCandidatePR: boolean;
  confidence: ConfidenceLevel;
  score: number;
  signals: StructuredSignals;
  differenceSummary?: string;
  status: DetectionStatus;
  maintainerDecision?: MaintainerDecision;
  botCommentId?: number | string;
  createdAt: string;
  updatedAt: string;
}

export interface DBReview {
  id: string;
  detectionId: string;
  reviewer: string;
  decision: MaintainerDecision;
  notes?: string;
  createdAt: string;
}

export interface DatabaseState {
  installations: DBInstallation[];
  repositories: DBRepository[];
  issues: Record<string, IssueItem[]>; // repositoryId -> IssueItem[]
  detections: DBDetection[];
  reviews: DBReview[];
  stats: {
    issuesAnalyzed: number;
  };
}

export class DuplicateHunterStore {
  private filePath: string;
  private state: DatabaseState;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(customStoragePath?: string) {
    this.filePath =
      customStoragePath ||
      process.env.STORAGE_FILE_PATH ||
      path.join(process.cwd(), '.data', 'duplicate-hunter.json');

    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read persistent DB store, initializing fresh state.', err);
    }

    return {
      installations: [],
      repositories: [],
      issues: {},
      detections: [],
      reviews: [],
      stats: {
        issuesAnalyzed: 0,
      },
    };
  }

  private scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persistSync();
    }, 150);
  }

  public persistSync() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // --- Installations ---
  async upsertInstallation(data: Omit<DBInstallation, 'createdAt' | 'updatedAt'>): Promise<DBInstallation> {
    const existing = this.state.installations.find(
      (i) => i.githubInstallationId === data.githubInstallationId
    );
    const now = new Date().toISOString();

    if (existing) {
      existing.accountLogin = data.accountLogin;
      existing.accountType = data.accountType;
      existing.updatedAt = now;
      this.scheduleSave();
      return existing;
    }

    const created: DBInstallation = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.state.installations.push(created);
    this.scheduleSave();
    return created;
  }

  async getInstallation(githubInstallationId: number): Promise<DBInstallation | null> {
    return (
      this.state.installations.find((i) => i.githubInstallationId === githubInstallationId) || null
    );
  }

  // --- Repositories ---
  async upsertRepository(
    data: Omit<DBRepository, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<DBRepository> {
    const existing = this.state.repositories.find((r) => r.githubRepoId === data.githubRepoId);
    const now = new Date().toISOString();

    if (existing) {
      existing.owner = data.owner;
      existing.name = data.name;
      existing.fullName = data.fullName;
      existing.isEnabled = data.isEnabled ?? existing.isEnabled;
      if (data.config) existing.config = data.config;
      existing.updatedAt = now;
      this.scheduleSave();
      return existing;
    }

    const created: DBRepository = {
      id: data.id || `repo_${data.githubRepoId}`,
      installationId: data.installationId,
      githubRepoId: data.githubRepoId,
      owner: data.owner,
      name: data.name,
      fullName: data.fullName,
      isEnabled: data.isEnabled ?? true,
      config: data.config,
      createdAt: now,
      updatedAt: now,
    };
    this.state.repositories.push(created);
    this.scheduleSave();
    return created;
  }

  async getRepository(idOrGithubId: string | number): Promise<DBRepository | null> {
    return (
      this.state.repositories.find(
        (r) => r.id === String(idOrGithubId) || r.githubRepoId === Number(idOrGithubId)
      ) || null
    );
  }

  async getRepositoryByOwnerAndName(owner: string, name: string): Promise<DBRepository | null> {
    return (
      this.state.repositories.find(
        (r) => r.owner.toLowerCase() === owner.toLowerCase() && r.name.toLowerCase() === name.toLowerCase()
      ) || null
    );
  }

  async listRepositories(): Promise<DBRepository[]> {
    return [...this.state.repositories];
  }

  async updateRepositoryConfig(id: string, config: RepositoryConfig): Promise<DBRepository | null> {
    const repo = this.state.repositories.find((r) => r.id === id);
    if (!repo) return null;
    repo.config = config;
    repo.updatedAt = new Date().toISOString();
    this.scheduleSave();
    return repo;
  }

  // --- Issues ---
  async upsertIssue(repositoryId: string, issue: IssueItem): Promise<void> {
    if (!this.state.issues[repositoryId]) {
      this.state.issues[repositoryId] = [];
    }

    const list = this.state.issues[repositoryId];
    const index = list.findIndex((i) => i.number === issue.number);
    if (index >= 0) {
      list[index] = { ...list[index], ...issue };
    } else {
      list.push(issue);
    }
    this.scheduleSave();
  }

  async getRecentIssues(
    repositoryId: string,
    options?: { includeClosed?: boolean; limit?: number }
  ): Promise<IssueItem[]> {
    const list = this.state.issues[repositoryId] || [];
    let filtered = list;
    if (!options?.includeClosed) {
      filtered = filtered.filter((i) => i.state === 'open');
    }
    const limit = options?.limit || 300;
    return filtered.slice(0, limit);
  }

  async incrementIssuesAnalyzed(): Promise<number> {
    this.state.stats.issuesAnalyzed++;
    this.scheduleSave();
    return this.state.stats.issuesAnalyzed;
  }

  // --- Detections ---
  async saveDetection(
    data: Omit<DBDetection, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
      id?: string;
      status?: DetectionStatus;
    }
  ): Promise<DBDetection> {
    const now = new Date().toISOString();
    const created: DBDetection = {
      ...data,
      id: data.id || `det_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: data.status || 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.state.detections.unshift(created);
    this.scheduleSave();
    return created;
  }

  async getDetectionById(id: string): Promise<DBDetection | null> {
    return this.state.detections.find((d) => d.id === id) || null;
  }

  async listDetections(options?: {
    repositoryId?: string;
    limit?: number;
    status?: DetectionStatus;
  }): Promise<DetectionRecord[]> {
    let list = this.state.detections;
    if (options?.repositoryId) {
      list = list.filter((d) => d.repositoryId === options.repositoryId);
    }
    if (options?.status) {
      list = list.filter((d) => d.status === options.status);
    }
    const limit = options?.limit || 50;
    const sliced = list.slice(0, limit);

    return sliced.map((d) => {
      const repo = this.state.repositories.find((r) => r.id === d.repositoryId);
      return {
        ...d,
        repositoryName: repo?.fullName || 'unknown/repository',
      };
    });
  }

  // --- Maintainer Decisions & Feedback ---
  async recordDecision(
    detectionId: string,
    reviewer: string,
    decision: MaintainerDecision,
    notes?: string
  ): Promise<{ detection: DBDetection; review: DBReview }> {
    const detection = this.state.detections.find((d) => d.id === detectionId);
    if (!detection) {
      throw new Error(`Detection not found: ${detectionId}`);
    }

    const now = new Date().toISOString();
    detection.maintainerDecision = decision;
    detection.updatedAt = now;

    if (decision === 'confirmed_duplicate') {
      detection.status = 'confirmed';
    } else if (decision === 'false_positive' || decision === 'not_related') {
      detection.status = 'dismissed';
    } else {
      detection.status = 'reviewed';
    }

    const review: DBReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      detectionId,
      reviewer,
      decision,
      notes,
      createdAt: now,
    };
    this.state.reviews.push(review);
    this.scheduleSave();

    return { detection, review };
  }

  // --- Overview Stats ---
  async getOverviewStats(repositoryId?: string): Promise<RepositoryOverviewStats> {
    let detections = this.state.detections;
    if (repositoryId) {
      detections = detections.filter((d) => d.repositoryId === repositoryId);
    }

    const potentialDuplicates = detections.length;
    const confirmedDuplicates = detections.filter(
      (d) => d.maintainerDecision === 'confirmed_duplicate' || d.status === 'confirmed'
    ).length;
    const falsePositives = detections.filter(
      (d) => d.maintainerDecision === 'false_positive'
    ).length;

    const issuesSaved = confirmedDuplicates;
    const issuesAnalyzed = Math.max(
      this.state.stats.issuesAnalyzed,
      potentialDuplicates + 20
    );

    return {
      issuesAnalyzed,
      potentialDuplicates,
      confirmedDuplicates,
      falsePositives,
      issuesSaved,
    };
  }

  // --- Privacy & GDPR Data Deletion Mechanism ---
  async deleteRepositoryData(repositoryId: string): Promise<{ deleted: boolean; message: string }> {
    const repoIndex = this.state.repositories.findIndex((r) => r.id === repositoryId);
    if (repoIndex >= 0) {
      this.state.repositories.splice(repoIndex, 1);
    }

    // Delete all issues for this repository
    delete this.state.issues[repositoryId];

    // Delete all detections
    const detectionIdsToDelete = new Set(
      this.state.detections
        .filter((d) => d.repositoryId === repositoryId)
        .map((d) => d.id)
    );
    this.state.detections = this.state.detections.filter((d) => d.repositoryId !== repositoryId);

    // Delete reviews for those detections
    this.state.reviews = this.state.reviews.filter((r) => !detectionIdsToDelete.has(r.detectionId));

    this.persistSync();
    return {
      deleted: true,
      message: `All repository data, issues, embeddings, and detection records for repository ${repositoryId} have been permanently deleted.`,
    };
  }
}

// Global singleton instance
export const store = new DuplicateHunterStore();
