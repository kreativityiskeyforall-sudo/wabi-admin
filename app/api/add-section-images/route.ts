import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

function key() { return Math.random().toString(36).slice(2, 10); }

export async function POST(req: NextRequest) {
  const { sanityId, sections }: {
    sanityId: string;
    sections: Array<{ headingText: string; imageUrl: string; altText: string }>;
  } = await req.json();

  if (!sanityId || !sections?.length) {
    return NextResponse.json({ error: 'Missing sanityId or sections' }, { status: 400 });
  }

  // Fetch current article body
  const article = await sanity.fetch(`*[_id == $id][0] { body }`, { id: sanityId });
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  const body: any[] = article.body ?? [];

  // Upload each image and insert after matching H2
  for (const section of sections) {
    if (!section.imageUrl) continue;
    try {
      const imgRes = await fetch(section.imageUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const asset = await sanity.assets.upload('image', imgBuffer, {
        filename: `${sanityId}-${section.headingText.slice(0, 20).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`,
        contentType: 'image/jpeg',
      });

      // Find the H2 matching this heading
      const idx = body.findIndex(
        b => b._type === 'block' && b.style === 'h2' &&
          b.children?.[0]?.text === section.headingText
      );

      if (idx !== -1) {
        // Remove any existing image immediately after this H2
        if (body[idx + 1]?._type === 'image') body.splice(idx + 1, 1);
        // Insert new image
        body.splice(idx + 1, 0, {
          _type: 'image',
          _key: key(),
          asset: { _type: 'reference', _ref: asset._id },
          alt: section.altText,
        });
      }
    } catch { /* skip failed uploads */ }
  }

  await sanity.patch(sanityId).set({ body }).commit();

  return NextResponse.json({ ok: true });
}
