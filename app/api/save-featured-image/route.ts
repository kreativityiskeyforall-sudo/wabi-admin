import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

export async function POST(req: NextRequest) {
  const { sanityId, imageUrl, slug }: { sanityId: string; imageUrl: string; slug: string } = await req.json();

  if (!sanityId || !imageUrl) {
    return NextResponse.json({ error: 'Missing sanityId or imageUrl' }, { status: 400 });
  }

  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to fetch image');
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const asset = await sanity.assets.upload('image', imgBuffer, {
      filename: `${slug ?? sanityId}-featured.jpg`,
      contentType: 'image/jpeg',
    });

    await sanity.patch(sanityId).set({
      featuredImage: {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
      },
    }).commit();

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Save failed' }, { status: 500 });
  }
}
