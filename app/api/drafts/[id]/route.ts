import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const rawId = params.id;
  const draftId = rawId.startsWith('drafts.') ? rawId : `drafts.${rawId}`;
  const liveId = draftId.replace(/^drafts\./, '');

  const [draft, liveCheck] = await Promise.all([
    sanity.fetch(
      `*[_id == $id][0]{
        _id, title, "slug": slug.current, category, type, cluster, isMother,
        kicker, intro, pullQuote, _createdAt, _updatedAt,
        "featuredImageUrl": featuredImage.asset->url,
        "featuredImageRef": featuredImage.asset._ref,
        body[]{
          ...,
          _type == "image" => { ..., "assetUrl": asset->url, "assetRef": asset._ref }
        },
        "shopBlocks": shopBlocks[]{ afterHeading, headingLevel, "products": products[]{ name, amazonUrl, imageUrl, price, highPrice, stars, reviews, low, high, priceHistory, badge } },
        "productItems": productItems[]{ name, amazonUrl, imageUrl, priceNow, price1yrLow, price1yrHigh, stars, reviewCount, priceHistory }
      }`,
      { id: draftId },
    ),
    sanity.fetch<{ _id: string } | null>(
      `*[_id == $id && !(_id in path("drafts.**"))][0]{ _id }`,
      { id: liveId },
    ),
  ]);

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  return NextResponse.json({ draft: { ...draft, hasPublishedVersion: !!liveCheck } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const rawId = params.id;
  const draftId = rawId.startsWith('drafts.') ? rawId : `drafts.${rawId}`;

  await sanity.delete(draftId);
  return NextResponse.json({ ok: true });
}
