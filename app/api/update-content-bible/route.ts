import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

type Heading = { level: string; text: string; note: string; concept: string };

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

function getCategoryKey(tab: string, bible: Record<string, unknown>): string {
  const map = (bible.google_sheet as Record<string, Record<string, string>>)?.tab_to_category_key ?? {};
  return map[tab] ?? 'general';
}

function addUnique(arr: string[], items: string[]): string[] {
  const set = new Set(arr.map(s => s.toLowerCase()));
  for (const item of items) {
    const clean = item.trim().toLowerCase();
    if (clean && !set.has(clean)) {
      set.add(clean);
      arr.push(clean);
    }
  }
  return arr;
}

export async function POST(req: NextRequest) {
  const { slug, title, tab, cluster, uniqueAngle, rowNumber, headings, sanityId } = await req.json() as {
    slug: string;
    title: string;
    tab: string;
    cluster: string;
    uniqueAngle: string;
    rowNumber: number;
    headings: Heading[];
    sanityId: string;
  };

  if (!slug || !title || !tab) {
    return NextResponse.json({ error: 'slug, title, and tab are required' }, { status: 400 });
  }

  // Fetch current bible from Sanity
  const doc = await sanity.fetch<{ json: string }>('*[_id == "content-bible"][0]{ json }');
  if (!doc?.json) {
    return NextResponse.json({ error: 'Content bible not found in Sanity' }, { status: 500 });
  }

  const bible = JSON.parse(doc.json);
  const catKey = getCategoryKey(tab, bible);

  const h2Concepts = headings.filter(h => h.level === 'H2' && h.concept).map(h => h.concept.trim().toLowerCase());
  const h3Concepts = headings.filter(h => h.level === 'H3' && h.concept).map(h => h.concept.trim().toLowerCase());

  // 1. Add to article_registry
  const registry = bible.article_registry as Record<string, unknown>;
  registry[slug] = {
    title,
    sanity_id: sanityId ?? '',
    tab,
    row: rowNumber,
    status: 'published',
    cluster,
    unique_angle: uniqueAngle,
    h2_concepts_used: h2Concepts,
    h3_concepts_used: h3Concepts,
  };

  // 2. Append new H2 concepts
  const usedH2 = bible.used_h2_concepts as Record<string, string[]>;
  if (!usedH2[catKey]) usedH2[catKey] = [];
  addUnique(usedH2[catKey], h2Concepts);

  // 3. Append new H3 concepts
  const usedH3 = bible.used_h3_concepts as Record<string, string[]>;
  if (!usedH3[catKey]) usedH3[catKey] = [];
  addUnique(usedH3[catKey], h3Concepts);

  // Write updated bible back to Sanity
  await sanity.patch('content-bible').set({ json: JSON.stringify(bible) }).commit();

  return NextResponse.json({
    ok: true,
    slug,
    h2Added: h2Concepts.length,
    h3Added: h3Concepts.length,
  });
}
