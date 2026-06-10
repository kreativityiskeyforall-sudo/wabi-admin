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

export async function PUT(req: NextRequest) {
  const { docId, links } = await req.json();

  if (!docId || !Array.isArray(links)) {
    return NextResponse.json({ error: 'Missing docId or links' }, { status: 400 });
  }

  const externalLinks = links.map((l: { label: string; url: string }) => ({
    _type: 'externalLinkEntry',
    _key: key(),
    label: l.label.trim(),
    url: l.url.trim(),
  }));

  if (externalLinks.length > 0) {
    await sanity.patch(docId).set({ externalLinks }).commit();
  } else {
    await sanity.patch(docId).unset(['externalLinks']).commit();
  }

  if (process.env.CLOUDFLARE_DEPLOY_HOOK) {
    await fetch(process.env.CLOUDFLARE_DEPLOY_HOOK, { method: 'POST' }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
