import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

// Vercel serverless request body limit ~4.5 MB.
// Images sent as base64 must stay under ~3 MB binary after decode to fit safely.
// Images sent as a URL are fetched server-side — no body-size constraint.
const MAX_BASE64_BINARY_BYTES = 3 * 1024 * 1024; // 3 MB

async function compressIfNeeded(buf: Buffer, _mediaType: string): Promise<Buffer> {
  if (buf.length <= MAX_BASE64_BINARY_BYTES) return buf;
  // Try to compress with sharp if available (provided by Next.js image optimization)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as (input: Buffer) => { jpeg(opts: { quality: number }): { toBuffer(): Promise<Buffer> } };
    const compressed = await sharp(buf).jpeg({ quality: 82 }).toBuffer();
    return compressed.length < buf.length ? compressed : buf;
  } catch {
    return buf;
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';

  let buffer: Buffer;
  let filename = 'upload.jpg';
  let mimeType = 'image/jpeg';

  if (contentType.includes('multipart/form-data')) {
    // Existing multipart path (browser file picker)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    buffer = Buffer.from(await file.arrayBuffer());
    filename = file.name;
    mimeType = file.type || 'image/jpeg';

  } else if (contentType.includes('application/json')) {
    // Agent path: { url } or { base64, mediaType, filename }
    const body = await req.json();

    if (body.url) {
      // Fetch from public URL server-side (no body-size limit on outgoing fetch)
      const imgRes = await fetch(body.url);
      if (!imgRes.ok) {
        return NextResponse.json({ error: `Failed to fetch image URL: ${imgRes.status}` }, { status: 400 });
      }
      buffer = Buffer.from(await imgRes.arrayBuffer());
      mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
      filename = body.filename || body.url.split('/').pop()?.split('?')[0] || 'upload.jpg';

    } else if (body.base64) {
      buffer = Buffer.from(body.base64, 'base64');
      mimeType = body.mediaType || 'image/jpeg';
      filename = body.filename || 'upload.jpg';
      buffer = await compressIfNeeded(buffer, mimeType);

    } else {
      return NextResponse.json({ error: 'Provide either url or base64' }, { status: 400 });
    }

  } else {
    return NextResponse.json({ error: 'Unsupported content-type. Use multipart/form-data or application/json.' }, { status: 415 });
  }

  const asset = await sanity.assets.upload('image', buffer, {
    filename,
    contentType: mimeType,
  });

  return NextResponse.json({ url: asset.url, assetId: asset._id });
}
