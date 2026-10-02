import { NextResponse } from 'next/server';
import { store } from '@duplicate-hunter/database';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const repositoryId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || 50);

    const detections = await store.listDetections({
      repositoryId: repositoryId === 'all' ? undefined : repositoryId,
      limit,
    });

    return NextResponse.json(detections);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
