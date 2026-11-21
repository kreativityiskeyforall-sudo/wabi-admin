import { NextRequest, NextResponse } from 'next/server';
import { lookupASIN, extractASIN } from '@/lib/amazonPAAPI';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { asin: rawAsin, url } = await req.json().catch(() => ({}));

  const asin = rawAsin ? extractASIN(rawAsin) : url ? extractASIN(url) : null;
  if (!asin) {
    return NextResponse.json(
      { error: 'Provide asin (10-char ASIN) or url (Amazon product URL)' },
      { status: 400 },
    );
  }

  try {
    const product = await lookupASIN(asin);
    return NextResponse.json(product);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
