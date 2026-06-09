import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@sanity/client';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

async function loadContentBible() {
  const doc = await sanity.fetch<{ json: string }>('*[_id == "content-bible"][0]{ json }');
  if (!doc?.json) throw new Error('Content bible not found in Sanity');
  return JSON.parse(doc.json);
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function getCategoryKey(tab: string, bible: Record<string, unknown>): string {
  const map = (bible.google_sheet as Record<string, Record<string, string>>)?.tab_to_category_key ?? {};
  return map[tab] ?? 'general';
}

export async function POST(req: NextRequest) {
  const { title, contentType, category, cluster, uniqueAngle, competition, priority } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  const bible = await loadContentBible();
  const catKey = getCategoryKey(category, bible);
  const slug = toSlug(title ?? '');

  const usedH2: string[] = (bible.used_h2_concepts as Record<string, string[]>)[catKey] ?? [];
  const usedH3: string[] = (bible.used_h3_concepts as Record<string, string[]>)[catKey] ?? [];
  const usedTips: string[] = (bible.used_tips as Record<string, string[]>)[catKey] ?? [];
  const registry = bible.article_registry as Record<string, { title: string; status: string }>;
  const articleExists = slug in registry;

  const publishedInCategory = Object.entries(registry)
    .filter(([, v]) => v.status === 'published' && (v as Record<string, string>).tab === category)
    .map(([, v]) => `- ${v.title}`)
    .join('\n') || 'None yet';

  const isListicle = ['ideas', 'decor', 'hacks', 'diy guide'].includes((contentType ?? '').toLowerCase());

  const prompt = `You are the content writer for wabi., a Japandi home decor affiliate blog at wabidecor.com.

ARTICLE DETAILS:
Title: ${title}
Tab: ${category}
Content Type: ${contentType}
Unique Angle: ${uniqueAngle || 'Not specified'}
Competition: ${competition || 'Not specified'}
Priority: ${priority || 'Not specified'}
Cluster: ${cluster || 'Not specified'}

CONTENT BIBLE — READ BEFORE GENERATING ANYTHING:

Already published articles in "${category}" (never duplicate these):
${publishedInCategory}

H2 concepts already used in "${category}" — DO NOT REPEAT any of these, even with different wording:
${usedH2.length > 0 ? usedH2.map(c => `- ${c}`).join('\n') : '- None yet'}

H3 concepts already used in "${category}" — DO NOT REPEAT any of these:
${usedH3.length > 0 ? usedH3.map(c => `- ${c}`).join('\n') : '- None yet'}

Tips already given in "${category}" — DO NOT REPEAT:
${usedTips.length > 0 ? usedTips.map(t => `- ${t}`).join('\n') : '- None yet'}

INSTRUCTIONS:
1. Check if slug "${slug}" already exists in the registry → set articleAlreadyExists.
2. Generate H2 headings. If any planned concept matches the used H2 list above, REJECT it and use a completely different angle. List rejected concepts.
3. ${isListicle ? 'This is a listicle. Generate H3 sub-headings for each idea (one H3 per idea). Check each against the used H3 list. Reject duplicates.' : 'This is not a listicle. No H3 headings needed.'}
4. The Unique Angle is a hard boundary — every H2 and H3 must stay inside it. If the angle says "MIRRORS ONLY" then every heading is about a mirror.
5. H2 differentiation test: ask "could this heading appear in any other article on this site?" If yes, make it more specific until the answer is no.
6. Honour writing style: short sentences (20 words max), plain English, no clichés like "elevate your space", "transform your home", "stunning", "timeless elegance".

Return ONLY this JSON with no markdown wrapping:
{
  "seoTitle": "50-60 chars, keyword near start",
  "metaDescription": "140-160 chars, compelling, includes keyword",
  "estimatedWords": 1800,
  "contentBibleCheck": {
    "articleAlreadyExists": ${articleExists},
    "rejectedH2Concepts": [],
    "rejectedH3Concepts": [],
    "cleanBill": true
  },
  "headings": [
    { "level": "H1", "text": "...", "note": "what this heading covers in one line", "concept": "short-concept-slug for content bible" },
    { "level": "H2", "text": "...", "note": "...", "concept": "..." },
    { "level": "H3", "text": "...", "note": "...", "concept": "..." }
  ]
}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const outline = JSON.parse(cleaned);

  return NextResponse.json(outline);
}
