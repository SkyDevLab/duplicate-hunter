import { NextResponse } from 'next/server';
import { store } from '@duplicate-hunter/database';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const repositoryId = params.id;
    const result = await store.deleteRepositoryData(repositoryId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
