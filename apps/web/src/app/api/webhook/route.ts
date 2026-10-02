import { NextResponse } from 'next/server';
import { verifyWebhookSignature, DuplicateHunterWorkflow } from '@duplicate-hunter/github';
import { store } from '@duplicate-hunter/database';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const eventName = request.headers.get('x-github-event');
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'development-secret';

    const rawBody = await request.text();

    // Verify webhook HMAC SHA256 signature
    if (secret) {
      const isValid = verifyWebhookSignature(rawBody, signature, secret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    if (eventName === 'issues' || eventName === 'pull_request') {
      const workflow = new DuplicateHunterWorkflow({ store });

      // Run workflow asynchronously
      workflow.processIssueEvent(payload).catch((err) => {
        console.error('[Web Webhook] Error processing event in background:', err);
      });
    }

    return NextResponse.json(
      { message: 'Webhook received for asynchronous processing' },
      { status: 202 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
