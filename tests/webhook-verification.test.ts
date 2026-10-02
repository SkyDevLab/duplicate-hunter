import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from '@duplicate-hunter/github';

describe('Webhook Signature Verification', () => {
  const secret = 'super-secret-webhook-key-12345';
  const payload = JSON.stringify({ action: 'opened', issue: { number: 42, title: 'Bug report' } });

  it('should accept valid sha256 signature', () => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const validSignature = `sha256=${hmac.digest('hex')}`;

    const isValid = verifyWebhookSignature(payload, validSignature, secret);
    assert.strictEqual(isValid, true);
  });

  it('should reject tampered payload', () => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const validSignature = `sha256=${hmac.digest('hex')}`;

    const tamperedPayload = JSON.stringify({ action: 'opened', issue: { number: 42, title: 'Hacked' } });
    const isValid = verifyWebhookSignature(tamperedPayload, validSignature, secret);
    assert.strictEqual(isValid, false);
  });

  it('should reject invalid or wrong secret', () => {
    const hmac = crypto.createHmac('sha256', 'wrong-secret');
    hmac.update(payload);
    const signature = `sha256=${hmac.digest('hex')}`;

    const isValid = verifyWebhookSignature(payload, signature, secret);
    assert.strictEqual(isValid, false);
  });

  it('should reject missing or empty signature', () => {
    assert.strictEqual(verifyWebhookSignature(payload, undefined, secret), false);
    assert.strictEqual(verifyWebhookSignature(payload, '', secret), false);
    assert.strictEqual(verifyWebhookSignature(payload, 'invalid-format', secret), false);
  });
});
