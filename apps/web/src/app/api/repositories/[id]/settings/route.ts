import { NextResponse } from 'next/server';
import { store } from '@duplicate-hunter/database';
import { DEFAULT_REPOSITORY_CONFIG, RepositoryConfig } from '@duplicate-hunter/core';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const repositoryId = params.id;
    const repo = await store.getRepository(repositoryId);
    const config = repo?.config || DEFAULT_REPOSITORY_CONFIG;
    return NextResponse.json({ repository: repo, config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const repositoryId = params.id;
    const body = (await request.json()) as RepositoryConfig;

    const updated = await store.updateRepositoryConfig(repositoryId, body);
    if (!updated) {
      // Upsert mock repo if not existing
      const created = await store.upsertRepository({
        id: repositoryId,
        installationId: 'inst_local',
        githubRepoId: 1001,
        owner: 'user',
        name: repositoryId,
        fullName: `user/${repositoryId}`,
        isEnabled: true,
        config: body,
      });
      return NextResponse.json({ success: true, config: created.config });
    }

    return NextResponse.json({ success: true, config: updated.config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
