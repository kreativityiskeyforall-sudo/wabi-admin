import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import Anthropic from '@anthropic-ai/sdk';
import { isAgentRequest } from '@/lib/agentAuth';
import { randomKey } from '@/lib/markdownToPortableText';

export const maxDuration = 300;

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_NAME = 'decoreixy-admin';
const SERVER_VERSION = '1.0.0';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_queue',
    description: 'List all articles in the content queue from Google Sheets. Returns title, type, category, cluster, status, and rowNumber for each article.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_queue_item',
    description: 'Get a single article from the queue by its row ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The article ID (from list_queue results)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'validate_outline',
    description: 'Check proposed H2 headings against the content bible for duplicate concepts. Returns conflicts only. Does NOT rewrite or generate anything.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Google Sheet tab name (e.g. "Japandi — Bedroom")' },
        headings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              level: { type: 'string', description: 'H2 or H3' },
              text: { type: 'string' },
            },
            required: ['text'],
          },
        },
      },
      required: ['category', 'headings'],
    },
  },
  {
    name: 'generate_outline',
    description: 'Generate an SEO outline for an article. Automatically checks the content bible for duplicate concepts.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        contentType: { type: 'string', description: 'e.g. ideas, roundup, gift-guide' },
        category: { type: 'string', description: 'Google Sheet tab name' },
        cluster: { type: 'string' },
        uniqueAngle: { type: 'string' },
        competition: { type: 'string' },
        priority: { type: 'string' },
      },
      required: ['title', 'contentType', 'category'],
    },
  },
  {
    name: 'write_article',
    description: 'Generate full article markdown from an approved outline. Returns markdown ONLY — does not save anything. The agent reviews the markdown, then calls save_draft.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['editorial', 'product-review', 'roundup'] },
        title: { type: 'string' },
        headings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              level: { type: 'string' },
              text: { type: 'string' },
              note: { type: 'string' },
            },
            required: ['level', 'text'],
          },
        },
        wordCount: { type: 'number' },
        uniqueAngle: { type: 'string' },
        category: { type: 'string' },
        cluster: { type: 'string' },
        competition: { type: 'string' },
        priority: { type: 'string' },
        contentType: { type: 'string' },
        brief: { type: 'string', description: 'Full markdown brief to follow exactly (H2 structure, intro style, notes)' },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Exact phrases that must appear naturally at least once each',
        },
        productBrief: { type: 'object', description: 'Required for product-review type' },
      },
      required: ['type', 'title', 'headings'],
    },
  },
  {
    name: 'save_draft',
    description: 'Save a complete article as a Sanity draft. It will NEVER appear on decoreixy.com until a human publishes it from the Drafts for Review page. Returns the draft ID and a review link.\n\nType mapping (agent input → stored in Sanity): editorial→info | product-review→roundup | roundup→roundup. This is intentional — the website uses "info", "roundup", and "gift-guide" as its type values.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
        body: { type: 'string', description: 'Full article in Markdown format' },
        category: { type: 'string', description: 'Lowercase website category slug, e.g. japandi, coastal, seasonal' },
        type: { type: 'string', enum: ['editorial', 'product-review', 'roundup'] },
        cluster: { type: 'string' },
        isMother: { type: 'boolean' },
        featuredImageUrl: { type: 'string' },
        sectionImages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              headingText: { type: 'string' },
              imageUrl: { type: 'string' },
              altText: { type: 'string' },
            },
            required: ['headingText', 'imageUrl'],
          },
        },
        shopBlocks: { type: 'array', items: { type: 'object' } },
        productItems: { type: 'array', items: { type: 'object' } },
        rowNumber: { type: 'number', description: 'Sheet row number to mark as drafted' },
        sheetTab: { type: 'string', description: 'Sheet tab name for the queue item' },
      },
      required: ['title', 'slug', 'body', 'category'],
    },
  },
  {
    name: 'update_draft',
    description: 'Update fields on an existing draft (title, slug, category, body, shopBlocks, productItems).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Draft document ID, must start with "drafts."' },
        title: { type: 'string' },
        slug: { type: 'string' },
        body: { type: 'string' },
        category: { type: 'string' },
        type: { type: 'string' },
        shopBlocks: { type: 'array', items: { type: 'object' } },
        productItems: { type: 'array', items: { type: 'object' } },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_drafts',
    description: 'List all saved drafts waiting for human review.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_draft',
    description: 'Get a single draft by ID including body, images, and shop blocks.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Draft ID (with or without "drafts." prefix)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'upload_image',
    description: 'Upload an image to Sanity CDN. Returns the asset URL and ID. Provide either a public URL (preferred for large images) or base64 data.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Public image URL to fetch and upload server-side. Preferred for FLUX-generated or Amazon images.' },
        base64: { type: 'string', description: 'Base64-encoded image data. Use only for images under 3 MB.' },
        mediaType: { type: 'string', description: 'MIME type, e.g. image/jpeg, image/png' },
        filename: { type: 'string' },
      },
    },
  },
  {
    name: 'attach_image_to_draft',
    description: 'Attach an uploaded Sanity image to a draft as the featured image, or as a section image under a given H2 heading.',
    inputSchema: {
      type: 'object',
      properties: {
        draftId: { type: 'string', description: 'Draft document ID (must start with drafts.)' },
        assetId: { type: 'string', description: 'Sanity asset ID from upload_image (e.g. image-abc123-jpg)' },
        type: { type: 'string', enum: ['featured', 'section'] },
        headingText: { type: 'string', description: 'The H2 heading text to attach the section image under (required when type is section)' },
        altText: { type: 'string', description: 'Alt text for the image' },
      },
      required: ['draftId', 'assetId', 'type'],
    },
  },
  {
    name: 'set_shop_blocks',
    description: 'Save Amazon product cards to a draft after a specified H2 heading. Max 3 products per block. The Amazon affiliate tag (?tag=oppositeattra-20) is enforced automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        draftId: { type: 'string' },
        shopBlocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              afterHeading: { type: 'string', description: 'The H2 heading text this block appears after' },
              headingLevel: { type: 'string', enum: ['H2', 'H3'], default: 'H2' },
              products: {
                type: 'array',
                maxItems: 3,
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    amazonUrl: { type: 'string', description: 'Full Amazon product URL. Affiliate tag added automatically.' },
                    imageUrl: { type: 'string', description: 'Product image URL (Amazon CDN is fine)' },
                    price: { type: 'number', description: 'Current price in USD' },
                    highPrice: { type: 'number', description: 'Highest recent price (optional)' },
                    stars: { type: 'number', description: 'Amazon star rating' },
                    reviews: { type: 'number', description: 'Number of Amazon reviews' },
                    low: { type: 'number', description: '1-year low price (optional)' },
                    high: { type: 'number', description: '1-year high price (optional)' },
                    priceHistory: {
                      type: 'array',
                      items: { type: 'number' },
                      description: 'Weekly price history array, 16 entries oldest→newest (optional — omit if unavailable)',
                    },
                    badge: {
                      type: 'string',
                      enum: ['low', 'rising', 'pick', 'stable'],
                      description: 'Price indicator badge (optional, defaults to pick)',
                    },
                  },
                  required: ['name', 'amazonUrl', 'imageUrl', 'price', 'stars', 'reviews'],
                },
              },
            },
            required: ['afterHeading', 'products'],
          },
        },
      },
      required: ['draftId', 'shopBlocks'],
    },
  },
  {
    name: 'set_sheet_status',
    description: 'Update the status of a queue row. Only "drafted" is allowed — trying to set any other status returns a 403.',
    inputSchema: {
      type: 'object',
      properties: {
        tab: { type: 'string', description: 'Google Sheet tab name, e.g. "Japandi — Bedroom"' },
        rowNumber: { type: 'number' },
        slug: { type: 'string', description: 'Article slug (stored in sheet notes column)' },
        status: { type: 'string', enum: ['drafted'], description: 'Must be "drafted"' },
      },
      required: ['tab', 'rowNumber', 'status'],
    },
  },
  {
    name: 'get_site_articles',
    description: 'Get all published articles: title, full URL with trailing slash, and list of H2 headings. Use for overlap checking and finding internal link targets before writing.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_price_chart',
    description: 'Extract 1-year price history from a real Amazon price-chart screenshot using vision. Returns history array, low, high, badge — ready to plug directly into set_shop_blocks. If the image is not a price chart, blurry, missing axis labels, or cannot be read confidently, returns a clear error. NEVER guesses values.',
    inputSchema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'Public URL of the chart screenshot. Fetched server-side — stays within Vercel request limits even for large images.' },
        imageBase64: { type: 'string', description: 'Base64-encoded chart image. Use imageUrl instead for large images.' },
        mediaType: { type: 'string', description: 'MIME type of the image, e.g. image/png, image/jpeg. Required when using imageBase64.' },
        price: { type: 'number', description: 'Current price of the product from the Amazon product page.' },
        name: { type: 'string', description: 'Product name, used for context in the chart reading prompt.' },
      },
      required: ['price'],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'wabi-admin.vercel.app';
  return `${proto}://${host}`;
}

async function callRoute(baseUrl: string, path: string, method: 'GET' | 'POST' | 'PATCH', agentKey: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    cache: 'no-store', // bypass Next.js data-fetch cache so list results are always live
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${agentKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

function enforceAffiliateTag(url: string): string {
  if (!url) return url;
  if (url.includes('tag=')) return url;
  return url + (url.includes('?') ? '&' : '?') + 'tag=oppositeattra-20';
}

function mcpText(text: string) {
  return { content: [{ type: 'text', text }] };
}

function jsonRpcResult(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } });
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

async function toolListQueue(baseUrl: string, agentKey: string): Promise<string> {
  const data = await callRoute(baseUrl, '/api/sheets', 'GET', agentKey);
  const articles = (data.articles ?? []) as Array<Record<string, unknown>>;
  const queued = articles.filter(a => a.status !== 'published' && a.status !== 'delete');
  if (queued.length === 0) return 'No articles in the queue.';
  return queued.map(a =>
    `ID: ${a.id} | "${a.title}" | type: ${a.type} | category: ${a.category} | cluster: ${a.cluster || 'none'} | status: ${a.status} | row: ${a.rowNumber}`,
  ).join('\n');
}

async function toolGetQueueItem(id: string, baseUrl: string, agentKey: string): Promise<string> {
  const data = await callRoute(baseUrl, '/api/sheets', 'GET', agentKey);
  const article = (data.articles ?? []).find((a: Record<string, unknown>) => String(a.id) === String(id));
  if (!article) return `No article found with ID: ${id}`;
  return JSON.stringify(article, null, 2);
}

async function toolValidateOutline(category: string, headings: Array<{ level?: string; text: string }>): Promise<string> {
  const bible = await sanity.fetch<{ json: string } | null>('*[_id == "content-bible"][0]{ json }');
  if (!bible?.json) return 'Content bible not found — cannot validate.';
  const data = JSON.parse(bible.json);

  const tabMap = (data.google_sheet as Record<string, Record<string, string>>)?.tab_to_category_key ?? {};
  const catKey = tabMap[category] ?? category.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const usedH2: string[] = (data.used_h2_concepts as Record<string, string[]>)?.[catKey] ?? [];
  const usedH3: string[] = (data.used_h3_concepts as Record<string, string[]>)?.[catKey] ?? [];

  function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
  }

  const conflicts: string[] = [];
  for (const h of headings) {
    const norm = normalize(h.text);
    const level = (h.level ?? 'H2').toUpperCase();
    const usedList = level === 'H3' ? usedH3 : usedH2;
    const match = usedList.find(u => normalize(u).slice(0, 30) === norm || norm.includes(normalize(u).slice(0, 20)));
    if (match) conflicts.push(`${level}: "${h.text}" — conflicts with existing concept: "${match}"`);
  }

  if (conflicts.length === 0) return `No conflicts found. All ${headings.length} headings are clear for category "${category}".`;
  return `Found ${conflicts.length} conflict(s):\n${conflicts.join('\n')}`;
}

async function toolGenerateOutline(params: Record<string, unknown>, baseUrl: string, agentKey: string): Promise<string> {
  const data = await callRoute(baseUrl, '/api/outline', 'POST', agentKey, params);
  // The outline route streams then ends with JSON — but via callRoute we get the full body
  // which may be mixed text+json. Extract the JSON object at the end.
  if (typeof data === 'object' && data !== null) return JSON.stringify(data, null, 2);
  return String(data);
}

async function toolWriteArticle(params: Record<string, unknown>, baseUrl: string, agentKey: string): Promise<string> {
  const data = await callRoute(baseUrl, '/api/write', 'POST', agentKey, params);
  return data.article ?? JSON.stringify(data);
}

async function toolSaveDraft(params: Record<string, unknown>, baseUrl: string, agentKey: string): Promise<string> {
  const data = await callRoute(baseUrl, '/api/save-draft', 'POST', agentKey, params);
  if (data.error) throw new Error(data.error);
  return `Draft saved. ID: ${data.id} | Slug: ${data.slug}\nReview at: ${baseUrl}/drafts/${encodeURIComponent(data.id)}`;
}

async function toolUpdateDraft(params: Record<string, unknown>, baseUrl: string, agentKey: string): Promise<string> {
  const data = await callRoute(baseUrl, '/api/update-draft', 'POST', agentKey, params);
  if (data.error) throw new Error(data.error);
  return `Draft updated. ID: ${params.id}`;
}

async function toolListDrafts(baseUrl: string, agentKey: string): Promise<string> {
  const data = await callRoute(baseUrl, '/api/drafts', 'GET', agentKey);
  const drafts = data.drafts ?? [];
  if (drafts.length === 0) return 'No drafts waiting for review.';
  return drafts.map((d: Record<string, unknown>) =>
    `ID: ${d._id} | "${d.title}" | ${d.category} | ${d.type} | updated: ${d._updatedAt}`,
  ).join('\n');
}

async function toolGetDraft(id: string, baseUrl: string, agentKey: string): Promise<string> {
  const draftId = id.startsWith('drafts.') ? id : `drafts.${id}`;
  const data = await callRoute(baseUrl, `/api/drafts/${encodeURIComponent(draftId)}`, 'GET', agentKey);
  if (data.error) throw new Error(data.error);
  // Return summary + first 2000 chars of body text
  const d = data.draft;
  const bodyPreview = Array.isArray(d.body)
    ? d.body.map((b: Record<string, unknown>) => {
        if (b._type === 'image') return `[Image: ${b.alt ?? ''}]`;
        const text = ((b.children as Array<{ text?: string }>) ?? []).map((c) => c.text ?? '').join('');
        return b.style === 'h2' ? `\n## ${text}` : b.style === 'h3' ? `\n### ${text}` : text;
      }).join('\n').slice(0, 2000)
    : '';
  return `Draft: "${d.title}"\nSlug: ${d.slug}\nCategory: ${d.category}\nType: ${d.type}\nShop blocks: ${(d.shopBlocks ?? []).length}\nProduct items: ${(d.productItems ?? []).length}\n\nBody preview:\n${bodyPreview}`;
}

async function toolUploadImage(params: Record<string, unknown>, baseUrl: string, agentKey: string): Promise<string> {
  const body: Record<string, unknown> = {};
  if (params.url) body.url = params.url;
  if (params.base64) { body.base64 = params.base64; body.mediaType = params.mediaType ?? 'image/jpeg'; }
  if (params.filename) body.filename = params.filename;

  const res = await fetch(`${baseUrl}/api/upload-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${agentKey}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? 'Upload failed');
  return `Uploaded. Asset ID: ${data.assetId}\nCDN URL: ${data.url}`;
}

async function toolAttachImageToDraft(params: Record<string, unknown>): Promise<string> {
  const { draftId, assetId, type, headingText, altText } = params as {
    draftId: string; assetId: string; type: 'featured' | 'section';
    headingText?: string; altText?: string;
  };

  if (!draftId.startsWith('drafts.')) throw new Error('draftId must start with "drafts."');

  const imageRef = { _type: 'image', asset: { _type: 'reference', _ref: assetId } };

  if (type === 'featured') {
    await sanity.patch(draftId).set({ featuredImage: imageRef }).commit();
    return `Featured image attached to draft ${draftId}`;
  }

  // Section image: insert after the matching heading in body
  if (!headingText) throw new Error('headingText is required for section images');

  const draft = await sanity.getDocument(draftId) as { body?: unknown[] } | null;
  if (!draft) throw new Error('Draft not found');

  const body = [...(draft.body ?? [])];
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = normalize(headingText);
  const idx = body.findIndex((b: unknown) => {
    const block = b as Record<string, unknown>;
    return (block.style === 'h2' || block.style === 'h3') &&
      (normalize(((block.children as Array<{ text?: string }>)?.[0]?.text) ?? '') === target);
  });

  if (idx === -1) throw new Error(`Heading "${headingText}" not found in draft body`);

  const imageBlock = {
    _type: 'image',
    _key: randomKey(),
    asset: { _type: 'reference', _ref: assetId },
    alt: altText ?? headingText,
  };

  body.splice(idx + 1, 0, imageBlock);
  await sanity.patch(draftId).set({ body }).commit();
  return `Section image attached after heading "${headingText}" in draft ${draftId}`;
}

async function toolSetShopBlocks(params: Record<string, unknown>): Promise<string> {
  const { draftId, shopBlocks } = params as { draftId: string; shopBlocks: Record<string, unknown>[] };

  if (!draftId.startsWith('drafts.')) throw new Error('draftId must start with "drafts."');
  if (!Array.isArray(shopBlocks)) throw new Error('shopBlocks must be an array');

  const sanitized = shopBlocks.map((block) => ({
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

  await sanity.patch(draftId).set({ shopBlocks: sanitized }).commit();
  const totalProducts = sanitized.reduce((n, b) => n + b.products.length, 0);
  return `Saved ${sanitized.length} shop block(s) with ${totalProducts} product(s) to draft ${draftId}`;
}

async function toolSetSheetStatus(params: Record<string, unknown>, baseUrl: string, agentKey: string): Promise<string> {
  const { tab, rowNumber, status, slug } = params as { tab: string; rowNumber: number; status: string; slug?: string };
  if (status !== 'drafted') throw new Error('Agent can only set status to "drafted"');
  const data = await callRoute(baseUrl, '/api/sheets', 'PATCH', agentKey, { tab, rowNumber, status, slug });
  if (data.error) throw new Error(data.error);
  return `Sheet row ${rowNumber} in tab "${tab}" marked as "${status}"`;
}

async function toolReadPriceChart(params: Record<string, unknown>): Promise<string> {
  const { imageUrl, imageBase64, mediaType, price, name } = params as {
    imageUrl?: string; imageBase64?: string; mediaType?: string; price: number; name?: string;
  };
  if (!imageUrl && !imageBase64) throw new Error('Provide imageUrl or imageBase64');
  if (!price) throw new Error('price (current price from the product page) is required');

  const currentPrice = Number(price);

  // Resolve image to base64
  let b64: string;
  let mime: string;
  if (imageUrl) {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Could not fetch image URL: HTTP ${res.status}`);
    // Cast to Buffer (no generic) so compression reassignment is type-safe
    let buf: Buffer = Buffer.from(await res.arrayBuffer()) as Buffer;
    // Compress if >3 MB to stay within Vercel limits
    const MAX = 3 * 1024 * 1024;
    if (buf.length > MAX) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharp = require('sharp') as (input: Buffer) => { jpeg(o: { quality: number }): { toBuffer(): Promise<Buffer> } };
        const compressed = await sharp(buf).jpeg({ quality: 82 }).toBuffer() as Buffer;
        if (compressed.length < buf.length) buf = compressed;
      } catch { /* sharp unavailable — proceed with original */ }
    }
    b64 = buf.toString('base64');
    mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  } else {
    b64 = String(imageBase64);
    mime = String(mediaType || 'image/png');
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mime as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
            data: b64,
          },
        },
        {
          type: 'text',
          text: `This is a 1-year Amazon price history chart for "${name || 'a product'}". The current price is ${currentPrice}.

FIRST — verify readability: If this image is NOT a price chart, is too blurry to read the Y-axis, is cropped so axis values are missing, or you cannot determine price values confidently, respond ONLY with this exact JSON (nothing else):
{"unreadable":true,"reason":"brief explanation"}

If you CAN read it:

STEP 1 — Read the Y-axis: Note the exact dollar values on the horizontal grid lines (e.g. $90, $110, $130). These are your reference points.

STEP 2 — Read the chart left to right: The chart is a step-function (flat lines with sudden drops/jumps). Trace every price level from left (oldest) to right (newest/today).

STEP 3 — Extract 20 price points: Sample 20 evenly-spaced points left to right. Estimate each price against Y-axis labels. BE PRECISE — halfway between $110 and $130 means $120.

CRITICAL RULES:
- "low" = the LOWEST price the line ever touches. Look for the deepest dip.
- "high" = the HIGHEST price the line ever reaches.
- The 20th (last) value MUST be exactly ${currentPrice}.
- Never invent values — read directly from the chart's Y-axis scale.
- Do NOT set low = current price unless it genuinely IS the lowest point on the whole chart.

Return ONLY this JSON (nothing else):
{"history":[v1,v2,...,v20],"low":<true minimum seen>,"high":<true maximum seen>}`,
        },
      ],
    }],
  });

  const rawText = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Chart reader returned an unrecognizable response');

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(jsonMatch[0]); } catch { throw new Error('Chart reader returned invalid JSON'); }

  if (parsed.unreadable) throw new Error(`Cannot read chart: ${parsed.reason || 'image is not a readable price chart — use a full-size screenshot with visible axis labels'}`);

  const history = parsed.history as number[];
  if (!Array.isArray(history) || history.length < 2) throw new Error('Chart returned insufficient data points');
  history[history.length - 1] = currentPrice;

  const histMin = Math.min(...history), histMax = Math.max(...history);
  const low = Math.min((parsed.low as number) ?? histMin, histMin);
  const high = Math.max((parsed.high as number) ?? histMax, histMax);

  const pct = (currentPrice - low) / (high - low || 1);
  let badge: 'low' | 'rising' | 'pick' = 'pick';
  if (pct <= 0.15) {
    badge = 'low';
  } else {
    const last4 = history.slice(-4);
    const secondHighest = [...history].sort((a, b) => b - a)[1] ?? high;
    if (last4.every(v => v >= secondHighest * 0.97)) badge = 'rising';
  }

  return JSON.stringify({ history, low, high, badge }, null, 2);
}

async function toolGetSiteArticles(): Promise<string> {
  const articles = await sanity.fetch<Array<{
    title: string; slug: string; category: string; body: Array<{ style?: string; children?: Array<{ text?: string }> }>;
  }>>(
    `*[_type == "article" && !(_id in path("drafts.**"))] | order(_createdAt desc) {
      title, "slug": slug.current, category,
      "body": body[]{ style, "children": children[]{ text } }
    }`,
  );

  return articles.map(a => {
    const h2s = (a.body ?? [])
      .filter(b => b.style === 'h2')
      .map(b => (b.children ?? []).map(c => c.text ?? '').join(''))
      .filter(Boolean);
    const url = `https://decoreixy.com/${a.category}/${a.slug}/`;
    return `"${a.title}"\nURL: ${url}\nH2s: ${h2s.length > 0 ? h2s.join(' | ') : '(none)'}`;
  }).join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL CALL DISPATCH
// ─────────────────────────────────────────────────────────────────────────────

async function handleToolCall(id: unknown, params: { name: string; arguments?: Record<string, unknown> }, req: NextRequest): Promise<NextResponse> {
  const toolName = params.name;
  const args = params.arguments ?? {};
  const agentKey = process.env.AGENT_API_KEY!;
  const baseUrl = getBaseUrl(req);

  try {
    let resultText = '';

    switch (toolName) {
      case 'list_queue':       resultText = await toolListQueue(baseUrl, agentKey); break;
      case 'get_queue_item':   resultText = await toolGetQueueItem(String(args.id), baseUrl, agentKey); break;
      case 'validate_outline': resultText = await toolValidateOutline(String(args.category), (args.headings as Array<{ level?: string; text: string }>) ?? []); break;
      case 'generate_outline': resultText = await toolGenerateOutline(args, baseUrl, agentKey); break;
      case 'write_article':    resultText = await toolWriteArticle(args, baseUrl, agentKey); break;
      case 'save_draft':       resultText = await toolSaveDraft(args, baseUrl, agentKey); break;
      case 'update_draft':     resultText = await toolUpdateDraft(args, baseUrl, agentKey); break;
      case 'list_drafts':      resultText = await toolListDrafts(baseUrl, agentKey); break;
      case 'get_draft':        resultText = await toolGetDraft(String(args.id), baseUrl, agentKey); break;
      case 'upload_image':     resultText = await toolUploadImage(args, baseUrl, agentKey); break;
      case 'attach_image_to_draft': resultText = await toolAttachImageToDraft(args); break;
      case 'set_shop_blocks':  resultText = await toolSetShopBlocks(args); break;
      case 'set_sheet_status': resultText = await toolSetSheetStatus(args, baseUrl, agentKey); break;
      case 'get_site_articles':  resultText = await toolGetSiteArticles(); break;
      case 'read_price_chart':   resultText = await toolReadPriceChart(args); break;
      default:
        return jsonRpcError(id, -32601, `Unknown tool: ${toolName}`);
    }

    return jsonRpcResult(id, mcpText(resultText));

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonRpcResult(id, { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('authorization');
  if (!isAgentRequest(authHeader)) {
    return jsonRpcError(null, -32001, 'Unauthorized — provide Authorization: Bearer <AGENT_API_KEY>');
  }

  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return jsonRpcError(null, -32700, 'Parse error — invalid JSON');
  }

  const { id, method, params } = body;

  switch (method) {
    case 'initialize':
      return jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });

    case 'notifications/initialized':
      return new NextResponse(null, { status: 204 });

    case 'ping':
      return jsonRpcResult(id, {});

    case 'tools/list':
      return jsonRpcResult(id, { tools: TOOLS });

    case 'tools/call':
      return handleToolCall(id, params as { name: string; arguments?: Record<string, unknown> }, req);

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

// GET endpoint — required by some MCP clients to establish an SSE session
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!isAgentRequest(authHeader)) {
    // 403 not 401 — a 401 triggers claude.ai OAuth discovery ("Sign-in required")
    return new NextResponse('Invalid or missing Bearer token', { status: 403 });
  }
  // Return a minimal SSE stream that immediately closes (no server-push needed)
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('event: ping\ndata: {}\n\n'));
      controller.close();
    },
  });
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
