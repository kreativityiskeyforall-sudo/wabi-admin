import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import Anthropic from '@anthropic-ai/sdk';
import {
  markdownToPortableText, extractIntro, extractPullQuote,
  mapContentType, buildKicker, randomKey,
} from '@/lib/markdownToPortableText';

export const maxDuration = 300;

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

async function generateAltText(imageUrl: string, context: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return context;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return context;
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const b64 = buffer.toString('base64');
    const mediaType = (imgRes.headers.get('content-type') ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
          { type: 'text', text: `Write alt text for this home decor image. Context: "${context}". One sentence, under 120 characters, describing what is literally visible. No preamble.` },
        ],
      }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return text.slice(0, 125) || context;
  } catch {
    return context;
  }
}

async function uploadImageUrl(imageUrl: string, filename: string): Promise<string> {
  const imgRes = await fetch(imageUrl);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  const asset = await sanity.assets.upload('image', imgBuffer, { filename, contentType: 'image/jpeg' });
  return asset._id;
}

function enforceAffiliateTag(url: string): string {
  if (!url) return url;
  if (url.includes('tag=')) return url;
  return url + (url.includes('?') ? '&' : '?') + 'tag=oppositeattra-20';
}

export async function POST(req: NextRequest) {
  const {
    title, slug, body, category, type, cluster, isMother,
    featuredImageUrl, sectionImages, shopBlocks, productItems,
    rowNumber, sheetTab,
  } = await req.json();

  if (!title || !slug || !body) {
    return NextResponse.json({ error: 'title, slug, and body are required' }, { status: 400 });
  }

  // Check slug doesn't already exist as a live article
  const existing = await sanity.fetch<{ _id: string } | null>(
    `*[_type == "article" && slug.current == $slug && !(_id in path("drafts.**"))][0]{ _id }`,
    { slug },
  );
  if (existing) {
    return NextResponse.json({ error: `A published article with slug "${slug}" already exists. Choose a different slug.` }, { status: 409 });
  }

  const portableBody = markdownToPortableText(body);

  // Strip duplicate leading title
  if (portableBody.length > 0) {
    const first = portableBody[0];
    if ((first.style === 'h1' || first.style === 'h2') && first.children?.[0]) {
      const headingText = (first.children[0] as { text?: string }).text?.trim().toLowerCase() ?? '';
      const titleText = title.trim().toLowerCase();
      if (headingText === titleText || titleText.includes(headingText) || headingText.includes(titleText.slice(0, 30))) {
        portableBody.shift();
      }
    }
  }

  // Upload featured image
  let featuredImage = null;
  if (featuredImageUrl) {
    try {
      const assetId = await uploadImageUrl(featuredImageUrl, `${slug}-featured.jpg`);
      featuredImage = { _type: 'image', asset: { _type: 'reference', _ref: assetId } };
    } catch { /* non-fatal */ }
  }

  // Upload section images + generate alt text
  if (Array.isArray(sectionImages) && sectionImages.length > 0) {
    const altResults = await Promise.all(
      sectionImages.map((s: { imageUrl?: string; altText?: string; headingText?: string }) =>
        s.imageUrl
          ? generateAltText(s.imageUrl, s.altText || s.headingText || '')
          : Promise.resolve(s.altText ?? s.headingText ?? ''),
      ),
    );

    for (let si = 0; si < sectionImages.length; si++) {
      const section = sectionImages[si];
      if (!section.imageUrl) continue;
      try {
        const assetId = await uploadImageUrl(
          section.imageUrl,
          `${slug}-sec-${(section.headingText ?? '').slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`,
        );
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = normalize(section.headingText ?? '');
        const idx = portableBody.findIndex(b =>
          (b.style === 'h2' || b.style === 'h3') &&
          (b.children as { text?: string }[])?.[0]?.text === section.headingText ||
          normalize((b.children as { text?: string }[])?.[0]?.text ?? '') === target,
        );
        if (idx !== -1) {
          portableBody.splice(idx + 1, 0, {
            _type: 'image',
            _key: randomKey(),
            asset: { _type: 'reference', _ref: assetId },
            alt: altResults[si] || section.altText || section.headingText,
          } as unknown as typeof portableBody[0]);
        }
      } catch { /* skip */ }
    }
  }

  const intro = extractIntro(body);
  const pullQuote = extractPullQuote(body);
  const wordCount = body.split(/\s+/).length;
  const kicker = buildKicker(category ?? '', wordCount);

  const draftId = `drafts.${randomKey()}${randomKey()}`;

  const doc = {
    _id: draftId,
    _type: 'article',
    title,
    slug: { _type: 'slug', current: slug },
    body: portableBody,
    intro: intro || null,
    pullQuote: pullQuote || null,
    kicker,
    category: category ?? '',
    type: mapContentType(type ?? ''),
    articleType: 'editorial',
    cluster: cluster ?? null,
    isMother: isMother ?? false,
    featuredImage,
    publishedAt: new Date().toISOString(),
    productItems: Array.isArray(productItems) && productItems.length > 0
      ? productItems.map((p: Record<string, unknown>) => ({
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
        }))
      : [],
    shopBlocks: Array.isArray(shopBlocks) && shopBlocks.length > 0
      ? shopBlocks.map((block: Record<string, unknown>) => ({
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
        }))
      : [],
  };

  const created = await sanity.createOrReplace(doc);

  // Mark sheet row as "drafted" if caller provided row info
  if (rowNumber && sheetTab) {
    try {
      const origin = req.headers.get('origin') || req.headers.get('x-forwarded-proto')
        ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host') || req.headers.get('host')}`
        : 'https://wabi-admin.vercel.app';
      await fetch(`${origin}/api/sheets`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('authorization') ?? '',
        },
        body: JSON.stringify({ tab: sheetTab, rowNumber, status: 'drafted', slug }),
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ id: created._id, slug });
}
