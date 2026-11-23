// Pipeline cache — server-side mirror of the localStorage data used by the article pipeline.
// When the agent creates/updates a draft via the MCP, it also writes here so the pipeline
// pages (/article/545/outline, /write, /images, /shop) can be opened without re-doing the work.
//
// Storage: one Sanity document per article, _id = "pipeline-{articleId}".
// The pipeline pages read this on first load if localStorage is empty.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
  requestTagPrefix: 'admin',
});

// GET /api/pipeline-cache?id=545
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const doc = await sanity.fetch(
    '*[_id == $docId][0]{ articleId, draftId, outline, article, images, shop }',
    { docId: `pipeline-${id}` },
  );

  return NextResponse.json(doc ?? {});
}

// POST /api/pipeline-cache
// Body: { articleId, draftId?, outline?, article?, images?, shop? }
// Performs a merge-update — only provided fields overwrite existing ones.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { articleId, draftId, outline, article, images, shop } = body as {
    articleId?: string;
    draftId?: string;
    outline?: Record<string, unknown>;
    article?: string;
    images?: Record<string, unknown>;
    shop?: Record<string, unknown>;
  };

  if (!articleId) return NextResponse.json({ error: 'articleId is required' }, { status: 400 });

  const docId = `pipeline-${articleId}`;

  // Build only the fields we actually want to update (don't clobber untouched stages)
  const patch: Record<string, unknown> = { articleId };
  if (draftId !== undefined) patch.draftId = draftId;
  if (outline !== undefined) patch.outline = outline;
  if (article !== undefined) patch.article = article;
  if (images !== undefined) patch.images = images;
  if (shop !== undefined) patch.shop = shop;

  // Single atomic call: create the doc with null defaults if it doesn't exist yet,
  // then overwrite only the fields that were provided. Eliminates the read-before-write.
  await sanity
    .transaction()
    .createIfNotExists({
      _id: docId,
      _type: 'pipelineCache',
      articleId,
      draftId: null,
      outline: null,
      article: null,
      images: null,
      shop: null,
    })
    .patch(docId, p => p.set(patch))
    .commit();

  return NextResponse.json({ ok: true, articleId });
}
