import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type Heading = { level: string; text: string; note: string; concept: string };

function biblePath() {
  return path.join(process.cwd(), 'lib', 'data', 'content-bible.json');
}

function readBible() {
  return JSON.parse(fs.readFileSync(biblePath(), 'utf-8'));
}

function writeBible(bible: Record<string, unknown>) {
  fs.writeFileSync(biblePath(), JSON.stringify(bible, null, 2), 'utf-8');
}

function getCategoryKey(tab: string, bible: Record<string, unknown>): string {
  const map = (bible.google_sheet as Record<string, Record<string, string>>)?.tab_to_category_key ?? {};
  return map[tab] ?? 'general';
}

function addUnique(arr: string[], items: string[]): string[] {
  const set = new Set(arr);
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
  // On Vercel production, filesystem is read-only — skip gracefully
  if (process.env.VERCEL) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      message: 'Running on Vercel — content bible not updated. Pull latest code locally and it will be current.',
    });
  }

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

  const bible = readBible();
  const catKey = getCategoryKey(tab, bible);

  // 1. Add to article_registry
  const registry = bible.article_registry as Record<string, unknown>;
  const h2Concepts = headings.filter(h => h.level === 'H2' && h.concept).map(h => h.concept.trim().toLowerCase());
  const h3Concepts = headings.filter(h => h.level === 'H3' && h.concept).map(h => h.concept.trim().toLowerCase());

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

  // 2. Add H2 concepts to used_h2_concepts[catKey]
  const usedH2 = bible.used_h2_concepts as Record<string, string[]>;
  if (!usedH2[catKey]) usedH2[catKey] = [];
  addUnique(usedH2[catKey], h2Concepts);

  // 3. Add H3 concepts to used_h3_concepts[catKey]
  const usedH3 = bible.used_h3_concepts as Record<string, string[]>;
  if (!usedH3[catKey]) usedH3[catKey] = [];
  addUnique(usedH3[catKey], h3Concepts);

  writeBible(bible);

  return NextResponse.json({
    ok: true,
    slug,
    h2Added: h2Concepts.length,
    h3Added: h3Concepts.length,
  });
}
