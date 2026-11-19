// Shared logic for "Save as Draft for Review" button used in Write and Compose stages.
// Reads all available pipeline data from localStorage and calls save-draft or update-draft.

import { getWebsiteCategory } from '@/lib/category-map';
import type { SheetArticle } from '@/lib/sheets';

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

export async function saveDraftFromPipeline(
  id: string,
  article: SheetArticle | null,
): Promise<{ draftId: string; slug: string }> {
  // Read all pipeline data from localStorage
  const articleMarkdown = localStorage.getItem(`article-${id}`) ?? '';
  if (!articleMarkdown) throw new Error('No article text found — write the article first.');

  const outlineRaw = (() => { try { return JSON.parse(localStorage.getItem(`outline-${id}`) ?? '{}'); } catch { return {}; } })();
  const imagesRaw = (() => { try { return JSON.parse(localStorage.getItem(`images-${id}`) ?? '{}'); } catch { return {}; } })();
  const composeRaw = (() => { try { return JSON.parse(localStorage.getItem(`compose-${id}`) ?? '{}'); } catch { return {}; } })();
  const shopRaw = (() => { try { return JSON.parse(localStorage.getItem(`shop-${id}`) ?? '{}'); } catch { return {}; } })();
  const briefRaw = (() => { try { return JSON.parse(localStorage.getItem(`brief-${id}`) ?? '{}'); } catch { return {}; } })();

  const title = article?.title ?? outlineRaw.title ?? '';
  const slug = toSlug(title);
  const websiteCategory = outlineRaw.websiteCategory ?? getWebsiteCategory(article?.category ?? '');
  const type = article?.type ?? 'editorial';
  const cluster = (article?.cluster ?? '').replace(/^→\s*/, '').trim() || null;

  // Featured image: from images store
  const featuredImageUrl = imagesRaw.featured?.url ?? '';

  // Section images: from compose store (which carries imageUrl + altText)
  const sectionImages: Array<{ headingText: string; imageUrl: string; altText: string }> =
    (composeRaw.sections ?? [])
      .filter((s: { imageUrl?: string }) => s.imageUrl)
      .map((s: { headingText: string; imageUrl: string; altText?: string }) => ({
        headingText: s.headingText,
        imageUrl: s.imageUrl,
        altText: s.altText ?? s.headingText,
      }));

  // Shop blocks
  const shopBlocks = (shopRaw.blocks ?? [])
    .filter((b: { afterHeading?: string; products?: unknown[] }) => b.afterHeading && (b.products?.length ?? 0) > 0);

  // Product items (product-review articles)
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

  // Check if we already saved a draft for this article (update instead of create)
  const existingDraftId = localStorage.getItem(`draft-id-${id}`);

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

  if (existingDraftId) {
    // Update existing draft
    const res = await fetch('/api/update-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: existingDraftId, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Update failed');
    return { draftId: existingDraftId, slug };
  }

  // Create new draft
  const res = await fetch('/api/save-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Save failed');

  // Remember draft ID so future clicks update instead of create
  try { localStorage.setItem(`draft-id-${id}`, data.id); } catch { /* quota */ }

  return { draftId: data.id, slug: data.slug };
}
