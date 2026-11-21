// Amazon Product Advertising API 5.0 client with AWS Signature V4.
// Required env vars: AMAZON_PAAPI_ACCESS_KEY, AMAZON_PAAPI_SECRET_KEY
// Optional: AMAZON_PAAPI_PARTNER_TAG (defaults to oppositeattra-20)

import { createHmac, createHash } from 'crypto';

const REGION = 'us-east-1';
const SERVICE = 'ProductAdvertisingAPI';
const HOST = 'webservices.amazon.com';
const PATH = '/paapi5/getitems';
const TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems';
const PARTNER_TAG = process.env.AMAZON_PAAPI_PARTNER_TAG ?? 'oppositeattra-20';

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}
function sha256hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}
function signingKey(secret: string, date: string): Buffer {
  return hmac(hmac(hmac(hmac('AWS4' + secret, date), REGION), SERVICE), 'aws4_request');
}

export interface PAAPIProduct {
  asin: string;
  name: string;
  price: number | null;
  stars: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
  amazonUrl: string;
}

export function extractASIN(urlOrAsin: string): string | null {
  const clean = urlOrAsin.trim();
  // Already a bare ASIN
  if (/^[A-Z0-9]{10}$/.test(clean)) return clean;
  // Amazon URL patterns: /dp/ASIN, /gp/product/ASIN, /product/ASIN
  const m = clean.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?#]|$)/);
  return m ? m[1] : null;
}

export async function lookupASIN(asin: string): Promise<PAAPIProduct> {
  const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY;
  const secretKey = process.env.AMAZON_PAAPI_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error(
      'AMAZON_PAAPI_ACCESS_KEY and AMAZON_PAAPI_SECRET_KEY are not set. ' +
      'Add them to Vercel env vars (Preview + Production). ' +
      'Get them from Amazon Associates → Tools → Product Advertising API.',
    );
  }

  const payload = JSON.stringify({
    ItemIds: [asin],
    Resources: [
      'ItemInfo.Title',
      'Offers.Listings.Price',
      'CustomerReviews.StarRating',
      'CustomerReviews.Count',
      'Images.Primary.Large',
    ],
    PartnerTag: PARTNER_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
  const dateStamp = amzDate.slice(0, 8);

  // Header names must be lowercase for canonical form, sorted alphabetically
  const headerMap: Record<string, string> = {
    'content-encoding': 'amz-1.0',
    'content-type': 'application/json; charset=utf-8',
    'host': HOST,
    'x-amz-date': amzDate,
    'x-amz-target': TARGET,
  };
  const sortedKeys = Object.keys(headerMap).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k}:${headerMap[k]}\n`).join('');
  const signedHeaders = sortedKeys.join(';');

  const canonicalRequest = [
    'POST', PATH, '',
    canonicalHeaders, signedHeaders,
    sha256hex(payload),
  ].join('\n');

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256hex(canonicalRequest)].join('\n');
  const signature = hmac(signingKey(secretKey, dateStamp), stringToSign).toString('hex');

  const res = await fetch(`https://${HOST}${PATH}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Encoding': 'amz-1.0',
      'Content-Type': 'application/json; charset=utf-8',
      'Host': HOST,
      'X-Amz-Date': amzDate,
      'X-Amz-Target': TARGET,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: payload,
  });

  const body = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    const errors = (body as { Errors?: Array<{ Message: string }> }).Errors;
    const msg = errors?.map(e => e.Message).join('; ') ?? JSON.stringify(body).slice(0, 200);
    throw new Error(`Amazon PA API HTTP ${res.status}: ${msg}`);
  }

  type PAItem = {
    ItemInfo?: { Title?: { DisplayValue?: string } };
    Offers?: { Listings?: Array<{ Price?: { Amount?: number } }> };
    CustomerReviews?: { StarRating?: { Value?: number }; Count?: number };
    Images?: { Primary?: { Large?: { URL?: string } } };
  };
  const item = (body as { ItemsResult?: { Items?: PAItem[] } }).ItemsResult?.Items?.[0];

  if (!item) {
    const errors = (body as { Errors?: Array<{ Message: string }> }).Errors;
    const msg = errors?.map(e => e.Message).join('; ') ?? 'Product not found';
    throw new Error(`ASIN ${asin}: ${msg}`);
  }

  const name = item.ItemInfo?.Title?.DisplayValue;
  if (!name) throw new Error(`Product found but title missing for ASIN ${asin}`);

  return {
    asin,
    name,
    price: item.Offers?.Listings?.[0]?.Price?.Amount ?? null,
    stars: item.CustomerReviews?.StarRating?.Value ?? null,
    reviewCount: item.CustomerReviews?.Count ?? null,
    imageUrl: item.Images?.Primary?.Large?.URL ?? null,
    amazonUrl: `https://www.amazon.com/dp/${asin}?tag=${PARTNER_TAG}`,
  };
}
