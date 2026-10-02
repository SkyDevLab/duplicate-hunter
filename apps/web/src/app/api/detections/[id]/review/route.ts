import { NextResponse } from 'next/server';
import { store } from '@duplicate-hunter/database';
import { MaintainerDecision } from '@duplicate-hunter/core';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const detectionId = params.id;
    const body = await request.json();
    const decision = body.decision as MaintainerDecision;
    const reviewer = body.reviewer || 'current_maintainer';
    const notes = body.notes;

    if (!['confirmed_duplicate', 'related', 'not_related', 'false_positive'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Must be confirmed_duplicate, related, not_related, or false_positive.' },
        { status: 400 }
      );
    }

    const result = await store.recordDecision(detectionId, reviewer, decision, notes);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
