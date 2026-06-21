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

// Extract headings from Portable Text body
function extractHeadings(body: any[]): Array<{ text: string; level: 'H2' | 'H3' }> {
  if (!Array.isArray(body)) return [];
  return body
    .filter(b => b._type === 'block' && (b.style === 'h2' || b.style === 'h3'))
    .map(b => ({
      text: (b.children ?? []).map((c: any) => c.text ?? '').join('').trim(),
      level: b.style === 'h3' ? 'H3' : 'H2',
    }))
    .filter(h => h.text);
}

// GET — load article headings + existing shopBlocks from Sanity
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const doc = await sanity.fetch(
      `*[_id == $id || _id == "drafts." + $id][0]{
        title,
        "body": body[]{style, children[]{text}},
        "shopBlocks": shopBlocks[]{
          afterHeading, headingLevel,
          "products": products[]{
            name, amazonUrl, imageUrl, price, highPrice,
            stars, reviews, low, high, priceHistory, badge
          }
        }
      }`,
      { id: id.replace(/^drafts\./, '') }
    );

    if (!doc) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    return NextResponse.json({
      title: doc.title ?? '',
      headings: extractHeadings(doc.body ?? []),
      shopBlocks: doc.shopBlocks ?? [],
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fetch failed' }, { status: 500 });
  }
}

// POST — save shopBlocks to Sanity and publish
export async function POST(req: NextRequest) {
  const { id, shopBlocks } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const cleanId = id.replace(/^drafts\./, '');

  const mapped = Array.isArray(shopBlocks)
    ? shopBlocks
        .filter((b: any) => b.afterHeading && b.products?.length)
        .map((b: any) => ({
          _type: 'shopBlock',
          _key: key(),
          afterHeading: b.afterHeading,
          headingLevel: b.headingLevel ?? 'H2',
          products: (b.products ?? []).map((p: any) => ({
            _type: 'shopProduct',
            _key: key(),
            name: p.name ?? '',
            amazonUrl: p.amazonUrl ?? '',
            imageUrl: p.imageUrl ?? '',
            price: p.price ?? 0,
            highPrice: p.highPrice ?? null,
            stars: p.stars ?? 0,
            reviews: p.reviews ?? 0,
            low: p.low ?? p.price ?? 0,
            high: p.high ?? p.price ?? 0,
            priceHistory: Array.isArray(p.priceHistory) ? p.priceHistory : [],
            badge: p.badge ?? 'pick',
          })),
        }))
    : [];

  try {
    await sanity.patch(cleanId).set({ shopBlocks: mapped }).commit();
    await sanity.request({ uri: `/data/mutate/production`, method: 'POST', body: { mutations: [{ publish: { id: cleanId } }] } }).catch(() => {});
    return NextResponse.json({ ok: true, count: mapped.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Save failed' }, { status: 500 });
  }
}
