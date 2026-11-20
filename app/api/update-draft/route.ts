import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import {
  markdownToPortableText, extractIntro, extractPullQuote,
  mapContentType, buildKicker, randomKey,
} from '@/lib/markdownToPortableText';
import { cleanArticleText } from '@/lib/cleanArticleText';

export const maxDuration = 60;

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

function enforceAffiliateTag(url: string): string {
  if (!url) return url;
  if (url.includes('tag=')) return url;
  return url + (url.includes('?') ? '&' : '?') + 'tag=oppositeattra-20';
}

export async function POST(req: NextRequest) {
  const { id, title, slug, body, category, type, shopBlocks, productItems } = await req.json();

  if (!id || !id.startsWith('drafts.')) {
    return NextResponse.json({ error: 'id must be a draft document ID starting with "drafts."' }, { status: 400 });
  }

  const patch = sanity.patch(id);
  const updates: Record<string, unknown> = {};

  if (title !== undefined) updates.title = title;
  if (slug !== undefined) updates.slug = { _type: 'slug', current: slug };
  if (category !== undefined) updates.category = category;
  if (type !== undefined) updates.type = mapContentType(type);

  if (body !== undefined) {
    const portableBody = markdownToPortableText(cleanArticleText(body));
    updates.body = portableBody;
    updates.intro = extractIntro(body) || null;
    updates.pullQuote = extractPullQuote(body) || null;
    updates.kicker = buildKicker(category ?? '', body.split(/\s+/).length);
  }

  if (Array.isArray(shopBlocks)) {
    updates.shopBlocks = shopBlocks.map((block: Record<string, unknown>) => ({
      _type: 'shopBlock',
      _key: randomKey(),
      afterHeading: block.afterHeading,
      headingLevel: block.headingLevel ?? 'H2',
      products: ((block.products ?? []) as Record<string, unknown>[]).slice(0, 3).map((p) => ({
        _type: 'shopProduct',
        _key: randomKey(),
        name: p.name ?? '',
        amazonUrl: enforceAffiliateTag(String(p.amazonUrl ?? '')),
        imageUrl: p.imageUrl ?? '',
        price: p.price ?? 0,
        highPrice: p.highPrice ?? null,
        stars: p.stars ?? 0,
        reviews: p.reviews ?? 0,
        low: p.low ?? null,
        high: p.high ?? null,
        priceHistory: Array.isArray(p.priceHistory) ? p.priceHistory : [],
        badge: p.badge ?? 'pick',
      })),
    }));
  }

  if (Array.isArray(productItems)) {
    updates.productItems = productItems.map((p: Record<string, unknown>) => ({
      _type: 'productItem',
      _key: randomKey(),
      name: p.name ?? '',
      amazonUrl: enforceAffiliateTag(String(p.amazonUrl ?? '')),
      imageUrl: p.imageUrl ?? '',
      priceNow: p.priceNow ?? '',
      price1yrLow: p.price1yrLow ?? p.price90Low ?? '',
      price1yrHigh: p.price1yrHigh ?? p.price90High ?? '',
      stars: p.stars ?? '',
      reviewCount: p.reviewCount ?? '',
      priceHistory: Array.isArray(p.priceHistory) ? p.priceHistory : [],
    }));
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  await patch.set(updates).commit();
  return NextResponse.json({ ok: true, id });
}
