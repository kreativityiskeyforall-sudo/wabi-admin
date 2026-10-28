import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export const maxDuration = 30;

async function purgeCloudflare(): Promise<{ ok: boolean; error?: string }> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!zoneId || !token) {
    return { ok: false, error: 'CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not set' };
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ purge_everything: true }),
  });
  const data = await res.json() as { success: boolean; errors?: { message: string }[] };
  if (!data.success) {
    const msg = data.errors?.map(e => e.message).join(', ') ?? 'Cloudflare purge failed';
    console.error('[purge-cache] Cloudflare error:', msg);
    return { ok: false, error: msg };
  }
  console.log('[purge-cache] Cache purged successfully');
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;

  // Verify Sanity webhook signature if secret is configured
  if (secret) {
    const signature = req.headers.get('sanity-webhook-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    const body = await req.text();
    const [, ts, , sig] = signature.match(/t=(\d+),v1=([^,]+)/) ?? [];
    if (!ts || !sig) {
      return NextResponse.json({ error: 'Invalid signature format' }, { status: 401 });
    }
    const expected = createHmac('sha256', secret)
      .update(`${ts}.${body}`)
      .digest('hex');
    if (expected !== sig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  const result = await purgeCloudflare();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: 'Cloudflare cache purged' });
}
