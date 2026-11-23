import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
  requestTagPrefix: 'admin',
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!process.env.SANITY_TOKEN) {
    return NextResponse.json(
      { error: 'SANITY_TOKEN is not set — add it to this Vercel environment (Preview + Production)' },
      { status: 500 },
    );
  }

  const rawId = params.id;
  const draftId = rawId.startsWith('drafts.') ? rawId : `drafts.${rawId}`;
  const liveId = draftId.replace(/^drafts\./, '');

  const fetchOpts = { perspective: 'raw' as const };

  const [draft, liveCheck] = await Promise.all([
    sanity.fetch(
      `*[_id == $id][0]{
        _id, title, "slug": slug.current, category, type, cluster, isMother,
        kicker, intro, pullQuote, _createdAt, _updatedAt, pipelineArticleId,
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
      fetchOpts,
    ),
    sanity.fetch<{ _id: string } | null>(
      `*[_id == $id && !(_id in path("drafts.**"))][0]{ _id }`,
      { id: liveId },
    ),
  ]);

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  return NextResponse.json(
    { draft: { ...draft, hasPublishedVersion: !!liveCheck } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const rawId = params.id;
  const draftId = rawId.startsWith('drafts.') ? rawId : `drafts.${rawId}`;

  // Hard guard: regardless of how the ID was constructed, refuse if it doesn't start with "drafts."
  // This makes it structurally impossible to delete a live document through this route.
  if (!draftId.startsWith('drafts.')) {
    return NextResponse.json({ error: 'Refused: only draft documents (id starting with "drafts.") may be deleted.' }, { status: 400 });
  }

  await sanity.delete(draftId);
  return NextResponse.json({ ok: true });
}
