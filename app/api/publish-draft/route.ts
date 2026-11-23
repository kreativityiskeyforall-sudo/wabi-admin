import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import { isAgentRequest } from '@/lib/agentAuth';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
  requestTagPrefix: 'admin',
});

// Agents cannot call publish-draft — only the human review UI uses this
export async function POST(req: NextRequest) {
  if (isAgentRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Agents cannot publish drafts. This action requires human review.' }, { status: 403 });
  }

  const { draftId, sheetTab, rowNumber } = await req.json();

  if (!draftId || !draftId.startsWith('drafts.')) {
    return NextResponse.json({ error: 'draftId must start with "drafts."' }, { status: 400 });
  }

  // Fetch the full draft
  const draft = await sanity.getDocument(draftId) as Record<string, unknown> | null;
  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  const slug = (draft.slug as { current?: string })?.current;
  if (!slug) {
    return NextResponse.json({ error: 'Draft has no slug' }, { status: 400 });
  }

  // Check for existing published article with same slug
  const existing = await sanity.fetch<{ _id: string } | null>(
    `*[_type == "article" && slug.current == $slug && !(_id in path("drafts.**"))][0]{ _id }`,
    { slug },
  );
  if (existing) {
    return NextResponse.json({ error: `A published article with slug "${slug}" already exists.` }, { status: 409 });
  }

  // Promote draft to live: same ID minus "drafts." prefix
  const liveId = draftId.replace(/^drafts\./, '');
  const liveDoc: Record<string, unknown> = { ...draft, _id: liveId };
  delete liveDoc['_rev'];

  await sanity.createOrReplace(liveDoc as Parameters<typeof sanity.createOrReplace>[0]);
  // Remove the draft document
  await sanity.delete(draftId);

  // Auto-purge Cloudflare cache
  try {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (zoneId && token) {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ purge_everything: true }),
      });
    }
  } catch { /* non-fatal */ }

  // Update sheet status to published
  if (sheetTab && rowNumber) {
    try {
      const origin = req.headers.get('x-forwarded-proto')
        ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('x-forwarded-host') || req.headers.get('host')}`
        : 'https://wabi-admin.vercel.app';
      await fetch(`${origin}/api/sheets`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.get('cookie') ?? '',
        },
        body: JSON.stringify({
          tab: sheetTab,
          rowNumber,
          status: 'published',
          slug,
          publishedAt: new Date().toISOString(),
        }),
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ id: liveId, slug });
}
