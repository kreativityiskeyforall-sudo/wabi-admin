// Signed upload slot for images the agent can't fetch (e.g. Google Flow behind auth).
//
// Flow:
//   1. Agent calls POST /api/upload-slot → gets a signed PUT URL and a ready-made curl command.
//   2. User runs the curl command (or fires a fetch() from a browser page) against the URL.
//   3. Server receives the binary image, compresses if needed, uploads to Sanity CDN.
//   4. Response: {"assetId":"image-...","url":"https://cdn.sanity.io/..."}
//   5. User tells the agent the assetId; agent uses attach_image_to_draft.
//
// The PUT URL contains a time-limited HMAC token — no database needed.
// CORS is allowed for chatgpt.com and flow.google.com so browser-side uploads work.

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

const CORS_ORIGINS = new Set(['https://chatgpt.com', 'https://flow.google.com']);

function getAllowedOrigin(req: NextRequest): string {
  const origin = req.headers.get('origin') ?? '';
  return CORS_ORIGINS.has(origin) ? origin : '';
}

function corsHeaders(origin: string): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// OPTIONS — CORS preflight from chatgpt.com / flow.google.com
export async function OPTIONS(req: NextRequest) {
  const origin = getAllowedOrigin(req);
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...(origin ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '3600',
      } : {}),
    },
  });
}

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
  const ext = mediaType.includes('png') ? 'png' : 'jpg';

  return NextResponse.json({
    uploadUrl,
    expiresAt,
    command: `curl -s -X PUT '${uploadUrl}' -H 'Content-Type: ${mediaType}' --data-binary @/path/to/image.${ext}`,
    note: `Replace /path/to/image.${ext} with the actual file path. Response: {"assetId":"...","url":"..."} — tell the agent the assetId.`,
  });
}

// PUT — receive binary image, validate token, upload to Sanity (no Bearer auth — HMAC token IS the auth)
export async function PUT(req: NextRequest) {
  const origin = getAllowedOrigin(req);
  const headers = corsHeaders(origin);

  const { searchParams } = new URL(req.url);
  const slotId = searchParams.get('slot') ?? '';
  const expires = parseInt(searchParams.get('exp') ?? '0', 10);
  const sig = searchParams.get('sig') ?? '';

  const validation = validateSlotToken(slotId, expires, sig);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 403, headers });
  }

  const contentType = req.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg';
  const arrayBuffer = await req.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer) as Buffer;

  if (buffer.length === 0) {
    return NextResponse.json(
      { error: 'Empty request body — make sure to use --data-binary with curl, or pass a Blob/File with fetch()' },
      { status: 400, headers },
    );
  }

  // Compress JPEG if over 3 MB (Vercel body limit is 4.5 MB, leave headroom)
  const MAX = 3 * 1024 * 1024;
  if (buffer.length > MAX && contentType === 'image/jpeg') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require('sharp') as (input: Buffer) => { jpeg(o: { quality: number }): { toBuffer(): Promise<Buffer> } };
      const compressed = await sharp(buffer).jpeg({ quality: 82 }).toBuffer() as Buffer;
      if (compressed.length < buffer.length) buffer = compressed;
    } catch { /* sharp unavailable, proceed */ }
  }

  const ext = contentType === 'image/png' ? 'png' : contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const filename = `upload-slot-${slotId.slice(0, 8)}.${ext}`;

  const asset = await sanity.assets.upload('image', buffer, { filename, contentType });
  return NextResponse.json({ assetId: asset._id, url: asset.url }, { headers });
}
