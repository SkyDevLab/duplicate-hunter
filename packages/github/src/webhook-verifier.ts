import crypto from 'node:crypto';

export function verifyWebhookSignature(
  rawPayload: string | Buffer,
  signatureHeader?: string | null,
  secret?: string | null
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const expectedSignatureHex = parts[1];
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawPayload);
  const calculatedHex = hmac.digest('hex');

  const expectedBuffer = Buffer.from(expectedSignatureHex, 'utf8');
  const calculatedBuffer = Buffer.from(calculatedHex, 'utf8');

  if (expectedBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
}
