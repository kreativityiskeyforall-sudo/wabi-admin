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
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

function getCategoryKey(tab: string, bible: Record<string, unknown>): string {
  const map = (bible.google_sheet as Record<string, Record<string, string>>)?.tab_to_category_key ?? {};
  return map[tab] ?? 'general';
}

// ── Per-category tone rules injected into outline prompt ──────────────────
const CATEGORY_TONE: Record<string, string> = {
  japandi: 'Tone: quiet, considered, unhurried. No hyperbole. Shorter sentences breathe better. Wabi-sabi philosophy may be referenced but never over-explained. Natural materials: linen, oak, walnut, clay, rattan. Neutral palette: warm whites, greige, charcoal, muted green.',
  living_room: 'Tone: quiet, considered, unhurried. Japandi living room — low furniture, natural materials, negative space.',
  bedroom: 'Tone: calm, restful, considered. Japandi bedroom — platform beds, linen bedding, minimal objects, no overhead lighting.',
  kitchen: 'Tone: quiet, functional. Japandi kitchen — handleless cabinetry, stone countertops, ceramic vessels, open shelving with few objects.',
  bathroom: 'Tone: calm, spa-like. Japandi bathroom — poured concrete, cedar, unglazed ceramic, waffle linen towels.',
  japandi_small_rooms: 'Tone: practical yet calm. Small Japandi spaces — low furniture, mirrors for depth, minimal objects, pale palette.',
  coastal: 'Tone: breezy, confident, unhurried. Beach house warmth. Rattan, whitewashed wood, linen, sea glass colours. Never nautical clichés.',
  modern_farmhouse: 'Tone: warm, practical, lived-in. Shiplap, reclaimed wood, matte black hardware, apron sinks. Never kitsch.',
  boho: 'Tone: free-spirited, layered, personal. Rattan, macramé, global textiles, trailing plants. Celebrate maximalism without chaos.',
  scandinavian: 'Tone: practical warmth. Light is the central character. Pale birch, candles, wool, geometric accents. Functional and beautiful.',
  cottagecore: 'Tone: romantic, gentle, botanical. Floral prints, antique patina, dried flowers, painted furniture. Grown-up romance — not childish.',
  mid_century_modern: 'Tone: confident, design-literate, retro-cool. Walnut, tapered legs, mustard/rust accents, arc lamps, tulip forms.',
  general: 'Tone: accessible, warm, practical. The colour is the hero — describe it precisely. Write for someone who loves their home, not a designer.',
  garden: 'Tone: aspirational but achievable. Visual-led — describe the scene before the product. Resort-quality inspiration.',
  global_styles: 'Tone: rich, warm, culturally respectful. Proper architectural terms: Saltillo tile, Talavera, hacienda arch, wrought iron.',
  seasonal: 'Tone: celebratory and season-specific. Fall = amber/harvest. Christmas = deep greens/candlelight. Spring = fresh/pale. Never generic.',
  guides: 'Tone: authoritative, educational, structured for skimmability. Clear comparisons, neutral between styles, help reader find their match.',
};

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
    .filter(([, v]) => (v as Record<string, string>).tab === category)
    .map(([, v]) => `- ${v.title}`)
    .join('\n') || 'None yet';

  const isListicle = ['ideas', 'decor', 'hacks', 'diy guide'].includes((contentType ?? '').toLowerCase());
  const categoryTone = CATEGORY_TONE[catKey] ?? CATEGORY_TONE['general'];

  const prompt = `You are the content writer for decoreixy.com, a home decor site covering 12 style categories (Japandi, Coastal, Modern Farmhouse, Boho, Scandinavian, Cottagecore, Mid-Century Modern, Room Ideas, Garden, Global Styles, Seasonal, Style Guides).

ARTICLE DETAILS:
Title: ${title}
Tab: ${category}
Content Type: ${contentType}
Unique Angle: ${uniqueAngle || 'Not specified'}
Competition: ${competition || 'Not specified'}
Priority: ${priority || 'Not specified'}
Cluster: ${cluster || 'Not specified'}

CATEGORY TONE FOR THIS ARTICLE:
${categoryTone}

CONTENT BIBLE — READ BEFORE GENERATING ANYTHING:

Already published articles in "${category}" (never duplicate these):
${publishedInCategory}

H2 concepts already used in "${catKey}" category — DO NOT REPEAT any of these, even with different wording:
${usedH2.length > 0 ? usedH2.map(c => `- ${c}`).join('\n') : '- None yet'}

H3 concepts already used in "${catKey}" category — DO NOT REPEAT any of these:
${usedH3.length > 0 ? usedH3.map(c => `- ${c}`).join('\n') : '- None yet'}

Tips already given in "${catKey}" category — DO NOT REPEAT:
${usedTips.length > 0 ? usedTips.map(t => `- ${t}`).join('\n') : '- None yet'}

INSTRUCTIONS:
1. Check if slug "${slug}" already exists in the registry → set articleAlreadyExists.
2. Generate H2 headings. If any planned concept matches the used H2 list above, REJECT it and use a completely different angle. List rejected concepts.
3. ${isListicle ? 'This is a listicle. Generate H3 sub-headings for each idea (one H3 per idea). Check each against the used H3 list. Reject duplicates.' : 'Not a listicle — no H3 headings needed unless the article structure genuinely requires sub-sections.'}
4. The Unique Angle is a HARD BOUNDARY — every H2 and H3 must stay inside it.
5. H2 differentiation test: ask "could this heading appear in any other article on this site?" If yes, make it more specific.
6. Each H2 must be clearly different from every other H2 in the same article — no overlap in scope.
7. SEO: put the primary keyword near the front of H2s where natural. H2s should be specific enough to match long-tail search intent.

WRITING STYLE RULES (apply to the article, not the outline — but headings should reflect this):
- Simple English. Short sentences — maximum 20 words each.
- Key insight in each section bolded (2–4 words max).
- New paragraph every 2–3 sentences.
- No banned phrases: "elevate your space", "transform your home", "stunning", "timeless elegance", "create a sanctuary", "embrace", "journey", "seamlessly", "perfect for", "look no further", "curated" (unless literal), "aesthetic" as standalone noun.

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
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const outline = JSON.parse(cleaned);

  return NextResponse.json(outline);
}
