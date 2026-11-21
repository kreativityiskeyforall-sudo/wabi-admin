import { NextRequest, NextResponse } from 'next/server';
import { lookupASIN, searchItems, extractASIN } from '@/lib/amazonCreatorsAPI';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { asin: rawAsin, url, keywords } = await req.json().catch(() => ({}));

  try {
    if (keywords) {
      const products = await searchItems(String(keywords));
      return NextResponse.json({ products });
    }

    const asin = rawAsin ? extractASIN(rawAsin) : url ? extractASIN(url) : null;
    if (!asin) {
      return NextResponse.json(
        { error: 'Provide asin (10-char ASIN), url (Amazon product URL), or keywords (search terms)' },
        { status: 400 },
      );
    }

    const product = await lookupASIN(asin);
    return NextResponse.json(product);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
