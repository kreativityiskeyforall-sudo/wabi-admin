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
  const { id, productItems } = await req.json();
  if (!id || !Array.isArray(productItems)) {
    return NextResponse.json({ error: 'id and productItems required' }, { status: 400 });
  }

  const cleanId = id.replace(/^drafts\./, '');

  const mapped = productItems.map((p: any) => ({
    _type: 'productItem',
    _key: key(),
    name: p.name ?? '',
    amazonUrl: p.amazonUrl ?? '',
    imageUrl: p.imageUrl ?? '',
    priceNow: p.priceNow ?? '',
    price1yrLow: p.price1yrLow ?? '',
    price1yrHigh: p.price1yrHigh ?? '',
    stars: p.stars ?? '',
    reviewCount: p.reviewCount ?? '',
    priceHistory: Array.isArray(p.priceHistory) ? p.priceHistory : [],
  }));

  try {
    // Check if article already has a featured image
    const existing = await sanity.fetch(`*[_id == $id][0]{ "hasFeatured": defined(featuredImage) }`, { id: cleanId });
    const patch = sanity.patch(cleanId).set({ productItems: mapped });

    // Upload first product image as featured image if none exists
    if (!existing?.hasFeatured && mapped[0]?.imageUrl) {
      try {
        const imgRes = await fetch(mapped[0].imageUrl);
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        const asset = await sanity.assets.upload('image', imgBuffer, {
          filename: `${cleanId}-featured.jpg`,
          contentType: imgRes.headers.get('content-type') ?? 'image/jpeg',
        });
        patch.set({ featuredImage: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } } });
      } catch { /* skip if image upload fails */ }
    }

    await patch.commit();
    await sanity.request({
      uri: `/data/mutate/production`,
      method: 'POST',
      body: { mutations: [{ publish: { id: cleanId } }] },
    }).catch(() => {});
    return NextResponse.json({ ok: true, count: mapped.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Save failed' }, { status: 500 });
  }
}
