import { NextResponse } from 'next/server';
import { store } from '@duplicate-hunter/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get('repositoryId') || undefined;

    const stats = await store.getOverviewStats(repoId);
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
