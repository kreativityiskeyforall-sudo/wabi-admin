// Signed upload slot for images the agent can't fetch (e.g. Google Flow behind auth).
//
// Flow:
//   1. Agent calls POST /api/upload-slot → gets a signed PUT URL and a ready-made curl command.
//   2. User runs the curl command on their machine (or agent runs it in the terminal).
//   3. Server receives the binary image, compresses if needed, uploads to Sanity CDN.
//   4. curl output: {"assetId":"image-...","url":"https://cdn.sanity.io/..."}
//   5. User tells the agent the assetId; agent uses attach_image_to_draft.
//
// The PUT URL contains a time-limited HMAC token — no database needed.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import { createSlotToken, validateSlotToken } from '@/lib/uploadSlot';

export const maxDuration = 60;

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

// POST — create a signed upload URL (requires Bearer auth)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const expiresInMinutes: number = typeof body.expiresInMinutes === 'number' ? Math.min(body.expiresInMinutes, 60) : 15;
  const mediaType: string = body.mediaType ?? 'image/jpeg';

  const token = createSlotToken(expiresInMinutes);
  const baseUrl = (() => {
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'wabi-admin.vercel.app';
    return `${proto}://${host}`;
  })();

  const uploadUrl = `${baseUrl}/api/upload-slot?slot=${token.slotId}&exp=${token.expires}&sig=${token.sig}`;
  const expiresAt = new Date(token.expires * 1000).toISOString();

  return NextResponse.json({
    uploadUrl,
    expiresAt,
    // Ready-to-run curl command — replace /path/to/image with the actual file path
    command: `curl -s -X PUT '${uploadUrl}' -H 'Content-Type: ${mediaType}' --data-binary @/path/to/image.jpg`,
    note: 'Replace /path/to/image.jpg with the actual file. Response will contain {"assetId":"...","url":"..."} — tell the agent the assetId.',
  });
}

// PUT — receive binary image, validate token, upload to Sanity (no Bearer auth — token IS the auth)
export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slotId = searchParams.get('slot') ?? '';
  const expires = parseInt(searchParams.get('exp') ?? '0', 10);
  const sig = searchParams.get('sig') ?? '';

  const validation = validateSlotToken(slotId, expires, sig);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 403 });
  }

  const contentType = req.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg';
  const arrayBuffer = await req.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer) as Buffer;

  if (buffer.length === 0) {
    return NextResponse.json({ error: 'Empty request body — make sure to use --data-binary with curl' }, { status: 400 });
  }

  // Compress if over 3 MB (Vercel body limit is 4.5 MB, leave headroom)
  const MAX = 3 * 1024 * 1024;
  if (buffer.length > MAX) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require('sharp') as (input: Buffer) => { jpeg(o: { quality: number }): { toBuffer(): Promise<Buffer> } };
      const compressed = await sharp(buffer).jpeg({ quality: 82 }).toBuffer() as Buffer;
      if (compressed.length < buffer.length) buffer = compressed;
    } catch { /* sharp unavailable, proceed */ }
  }

  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const filename = `upload-slot-${slotId.slice(0, 8)}.${ext}`;

  const asset = await sanity.assets.upload('image', buffer, { filename, contentType });
  return NextResponse.json({ assetId: asset._id, url: asset.url });
}
