// Amazon Creators API client — replaces PA-API 5.0 (retired May 15 2026).
// OAuth 2.0 client credentials (Login with Amazon). Credentials from:
//   Amazon Associates Central → Tools → Creators API
// Required env vars: AMAZON_CREATORS_CLIENT_ID, AMAZON_CREATORS_CLIENT_SECRET
// Optional: AMAZON_CREATORS_PARTNER_TAG (defaults to oppositeattra-20)
//
// NOTE: The Creators API does NOT return star ratings or review counts.
// Those fields will always be null.

const TOKEN_ENDPOINT = 'https://api.amazon.com/auth/o2/token';
const API_BASE = 'https://creatorsapi.amazon/catalog/v1';
const MARKETPLACE = 'www.amazon.com';
const PARTNER_TAG = process.env.AMAZON_CREATORS_PARTNER_TAG ?? 'oppositeattra-20';

const RESOURCES = [
  'images.primary.large',
  'itemInfo.title',
  'offersV2.listings.price',
];

// In-memory token cache — valid for the serverless instance lifetime (up to 1hr)
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const clientId = process.env.AMAZON_CREATORS_CLIENT_ID;
  const clientSecret = process.env.AMAZON_CREATORS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'AMAZON_CREATORS_CLIENT_ID and AMAZON_CREATORS_CLIENT_SECRET are not set. ' +
      'Get them from Amazon Associates Central → Tools → Creators API, ' +
      'then add both to Vercel env vars (Preview + Production).',
    );
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'creatorsapi::default',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 400 || res.status === 401) {
      throw new Error(
        `Amazon Creators API: credential rejected (HTTP ${res.status}). ` +
        'Check AMAZON_CREATORS_CLIENT_ID and AMAZON_CREATORS_CLIENT_SECRET in Vercel. ' +
        `Detail: ${text.slice(0, 200)}`,
      );
    }
    throw new Error(`Creators API token request failed HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

export interface CreatorsProduct {
  asin: string;
  name: string;
  price: number | null;
  stars: null; // Not provided by Creators API
  reviewCount: null; // Not provided by Creators API
  imageUrl: string | null;
  amazonUrl: string;
}

function mapItem(item: Record<string, unknown>, asin: string): CreatorsProduct {
  const title = (item.itemInfo as Record<string, unknown> | undefined)?.title as Record<string, unknown> | undefined;
  const name = (title?.displayValue as string | undefined) ?? null;

  const offersV2 = item.offersV2 as Record<string, unknown> | undefined;
  const listing = (offersV2?.listings as Array<Record<string, unknown>> | undefined)?.[0];
  const priceMoney = (listing?.price as Record<string, unknown> | undefined)?.money as Record<string, unknown> | undefined;
  const priceAmount = priceMoney?.amount as number | undefined;

  const primary = (item.images as Record<string, unknown> | undefined)?.primary as Record<string, unknown> | undefined;
  const imageUrl = (primary?.large as Record<string, unknown> | undefined)?.url as string | undefined;

  if (!name) throw new Error(`Product found but title missing for ASIN ${asin}`);

  return {
    asin,
    name,
    price: priceAmount ?? null,
    stars: null,
    reviewCount: null,
    imageUrl: imageUrl ?? null,
    amazonUrl: `https://www.amazon.com/dp/${asin}?tag=${PARTNER_TAG}`,
  };
}

function handleApiError(res: Response, body: Record<string, unknown>, context: string): never {
  const errors = body.errors as Array<{ message?: string; code?: string }> | undefined;
  const msg = errors?.map(e => e.message).join('; ') ?? JSON.stringify(body).slice(0, 300);

  // Account eligibility — 10 qualifying sales required for API access
  if (
    res.status === 403 ||
    msg.toLowerCase().includes('eligible') ||
    msg.toLowerCase().includes('qualifying') ||
    msg.toLowerCase().includes('not authorized')
  ) {
    throw new Error(
      `Amazon Creators API: account not eligible for API access. ` +
      'Your Associates account must have 10+ qualifying referred sales in the past 30 days. ' +
      `Detail: ${msg}`,
    );
  }

  throw new Error(`Amazon Creators API ${context} HTTP ${res.status}: ${msg}`);
}

export function extractASIN(urlOrAsin: string): string | null {
  const clean = urlOrAsin.trim();
  if (/^[A-Z0-9]{10}$/.test(clean)) return clean;
  const m = clean.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?#]|$)/);
  return m ? m[1] : null;
}

export async function lookupASIN(asin: string): Promise<CreatorsProduct> {
  const token = await getAccessToken();

  const res = await fetch(`${API_BASE}/getItems`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-marketplace': MARKETPLACE,
    },
    body: JSON.stringify({
      itemIds: [asin],
      itemIdType: 'ASIN',
      marketplace: MARKETPLACE,
      partnerTag: PARTNER_TAG,
      resources: RESOURCES,
    }),
  });

  const body = await res.json() as Record<string, unknown>;
  if (!res.ok) handleApiError(res, body, 'getItems');

  const items = (body.itemsResult as Record<string, unknown> | undefined)?.items as Array<Record<string, unknown>> | undefined;
  const item = items?.[0];

  if (!item) {
    const errors = (body.errors as Array<{ message?: string }> | undefined);
    const msg = errors?.map(e => e.message).join('; ') ?? 'Product not found';
    throw new Error(`ASIN ${asin}: ${msg}`);
  }

  return mapItem(item, asin);
}

export async function searchItems(keywords: string): Promise<CreatorsProduct[]> {
  const token = await getAccessToken();

  const res = await fetch(`${API_BASE}/searchItems`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-marketplace': MARKETPLACE,
    },
    body: JSON.stringify({
      keywords,
      searchIndex: 'All',
      itemCount: 5,
      marketplace: MARKETPLACE,
      partnerTag: PARTNER_TAG,
      resources: RESOURCES,
    }),
  });

  const body = await res.json() as Record<string, unknown>;
  if (!res.ok) handleApiError(res, body, 'searchItems');

  const items = (body.searchResult as Record<string, unknown> | undefined)?.items as Array<Record<string, unknown>> | undefined;
  if (!items || items.length === 0) return [];

  return items.map(item => mapItem(item, (item.asin as string) ?? ''));
}
