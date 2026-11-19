// Shared logic for "Save as Draft for Review" button used in Write and Compose stages.
// Reads all available pipeline data from localStorage and calls save-draft or update-draft.

import { getWebsiteCategory } from '@/lib/category-map';
import type { SheetArticle } from '@/lib/sheets';

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

// Fetches JSON from a route and throws a human-readable error on non-2xx.
// If the server returns non-JSON (e.g. a 500 HTML page), surfaces that as an error.
async function apiFetch(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch {
    throw new Error(`${path} returned HTTP ${res.status} with non-JSON body: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`${path} HTTP ${res.status}: ${data.error ?? text.slice(0, 200)}`);
  }
  return data;
}

export async function saveDraftFromPipeline(
  id: string,
  article: SheetArticle | null,
): Promise<{ draftId: string; slug: string }> {
  const articleMarkdown = localStorage.getItem(`article-${id}`) ?? '';
  if (!articleMarkdown.trim()) throw new Error('No article text found — write the article first.');

  const outlineRaw = (() => { try { return JSON.parse(localStorage.getItem(`outline-${id}`) ?? '{}'); } catch { return {}; } })();
  const imagesRaw  = (() => { try { return JSON.parse(localStorage.getItem(`images-${id}`)  ?? '{}'); } catch { return {}; } })();
  const composeRaw = (() => { try { return JSON.parse(localStorage.getItem(`compose-${id}`) ?? '{}'); } catch { return {}; } })();
  const shopRaw    = (() => { try { return JSON.parse(localStorage.getItem(`shop-${id}`)    ?? '{}'); } catch { return {}; } })();
  const briefRaw   = (() => { try { return JSON.parse(localStorage.getItem(`brief-${id}`)   ?? '{}'); } catch { return {}; } })();

  const title = article?.title ?? outlineRaw.title ?? '';
  if (!title.trim()) throw new Error('Article has no title — cannot save as draft.');

  const slug = toSlug(title);
  const websiteCategory = outlineRaw.websiteCategory ?? getWebsiteCategory(article?.category ?? '');
  const type = article?.type ?? 'editorial';
  const cluster = (article?.cluster ?? '').replace(/^→\s*/, '').trim() || null;
  const featuredImageUrl: string = imagesRaw.featured?.url ?? '';

  const sectionImages: Array<{ headingText: string; imageUrl: string; altText: string }> =
    (composeRaw.sections ?? [])
      .filter((s: { imageUrl?: string }) => s.imageUrl)
      .map((s: { headingText: string; imageUrl: string; altText?: string }) => ({
        headingText: s.headingText,
        imageUrl: s.imageUrl,
        altText: s.altText ?? s.headingText,
      }));

  const shopBlocks = (shopRaw.blocks ?? [])
    .filter((b: { afterHeading?: string; products?: unknown[] }) => b.afterHeading && (b.products?.length ?? 0) > 0);

  const productItems = type === 'product-review'
    ? (briefRaw.products ?? []).map((p: Record<string, unknown>) => ({
        name: p.name ?? '',
        amazonUrl: p.amazonUrl ?? '',
        imageUrl: p.imageUrls ?? '',
        priceNow: p.priceNow ?? '',
        price1yrLow: p.price90Low ?? p.price1yrLow ?? '',
        price1yrHigh: p.price90High ?? p.price1yrHigh ?? '',
        stars: p.stars ?? '',
        reviewCount: p.reviewCount ?? '',
        priceHistory: p.priceHistory ?? [],
      }))
    : [];

  const payload = {
    title, slug, body: articleMarkdown,
    category: websiteCategory, type, cluster,
    featuredImageUrl: featuredImageUrl || undefined,
    sectionImages: sectionImages.length > 0 ? sectionImages : undefined,
    shopBlocks: shopBlocks.length > 0 ? shopBlocks : undefined,
    productItems: productItems.length > 0 ? productItems : undefined,
    rowNumber: article?.rowNumber,
    sheetTab: article?.category,
  };

  const existingDraftId = localStorage.getItem(`draft-id-${id}`);

  if (existingDraftId) {
    // Try to update the existing draft first
    const updateRes = await fetch('/api/update-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: existingDraftId, ...payload }),
    });

    if (updateRes.ok) {
      return { draftId: existingDraftId, slug };
    }

    // If the draft was deleted (404) or missing, fall through to create a new one.
    // Any other error (401, 500) → surface it.
    if (updateRes.status !== 404) {
      const text = await updateRes.text();
      let msg = `HTTP ${updateRes.status}`;
      try { msg = JSON.parse(text).error ?? msg; } catch { msg += `: ${text.slice(0, 150)}`; }
      throw new Error(`update-draft failed: ${msg}`);
    }

    // 404 — draft was deleted; clear the stale ID and create fresh
    localStorage.removeItem(`draft-id-${id}`);
  }

  // Create new draft
  const data = await apiFetch('/api/save-draft', payload);
  const draftId = String(data.id ?? '');
  const returnedSlug = String(data.slug ?? slug);

  if (!draftId.startsWith('drafts.')) {
    throw new Error(`save-draft returned unexpected id: "${draftId}"`);
  }

  try { localStorage.setItem(`draft-id-${id}`, draftId); } catch { /* quota */ }
  return { draftId, slug: returnedSlug };
}
