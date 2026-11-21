// Short-lived signed upload slots.
// The agent calls create_upload_slot → gets a curl command.
// The user runs the command on their machine → server receives binary, uploads to Sanity CDN.
// No storage needed: expiry + HMAC signature are embedded in the URL.

import { createHmac, randomBytes } from 'crypto';

function sign(slotId: string, expires: number): string {
  const secret = process.env.AGENT_API_KEY ?? '';
  return createHmac('sha256', secret).update(`${slotId}.${expires}`).digest('hex').slice(0, 32);
}

export function createSlotToken(expiresInMinutes = 15): { slotId: string; expires: number; sig: string } {
  const slotId = randomBytes(16).toString('hex');
  const expires = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;
  const sig = sign(slotId, expires);
  return { slotId, expires, sig };
}

export function validateSlotToken(slotId: string, expires: number, sig: string): { ok: boolean; reason?: string } {
  if (Math.floor(Date.now() / 1000) > expires) {
    return { ok: false, reason: 'Upload slot has expired — create a new one' };
  }
  const expected = sign(slotId, expires);
  if (sig !== expected) {
    return { ok: false, reason: 'Invalid slot signature' };
  }
  return { ok: true };
}
