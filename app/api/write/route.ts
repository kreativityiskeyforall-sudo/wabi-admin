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

// ── Universal writing rules ────────────────────────────────────────────────
const UNIVERSAL_RULES = `
WRITING RULES — FOLLOW EXACTLY:
1. Sentences: 20 words maximum. Short and direct. No compound sentences joined with "and" or "but".
2. Paragraphs: 2–3 sentences only. Start a new paragraph every 2–3 sentences. White space is essential.
3. Bold: Use **bold** on 1–2 complete sentences per section — the single most insightful, actionable, or memorable sentence. Bold the full sentence, not just a phrase. Never bold more than 2 sentences per section. Never bold headings or product names.
4. Simple English: write at a reading age of 14. No jargon without explanation. Anyone should understand it.
5. Specificity: always name the material, finish, measurement, or price range. Vague descriptions are useless.
6. UK English spelling: colour, favour, grey, cosy, whilst, matte, centre.
   PRICES: Always use $ USD. Never £. Write "$40–$90", not "£40–£90".
7. Never use --- or *** as section dividers. Use headings instead.
8. SEO — keyword usage:
   - Use the primary keyword naturally in the first 100 words.
   - Use it again 3–5 times total in the body. Never force it — only where it reads naturally.
   - Use related semantic terms (LSI keywords) throughout: variants, synonyms, related concepts.
   - Never keyword-stuff. One keyword per sentence maximum.
   - Use keywords in H2 headings where natural — not every H2, but 2–3 of them.
9. Entities and structured content:
   - Where listing products, use H3 for each item.
   - Where comparing options, use a simple comparison structure.
   - Include at least one FAQ section at the end with 2–3 questions using "## Frequently Asked Questions" heading.
   - FAQ questions should match real search queries people type (e.g. "What colours work in a japandi bedroom?")

BANNED WORDS AND PHRASES — never use any of these:
- "elevate your space" / "elevate your home" / "elevate"
- "transform your home" / "transform your space"
- "stunning" / "breathtaking" / "beautiful" — use specific descriptors instead
- "timeless elegance" / "timeless beauty" / "timeless"
- "create a sanctuary" / "your sanctuary"
- "embrace" (the concept / the aesthetic / the style)
- "journey" (design journey, style journey)
- "dive into" / "let's explore" / "look no further"
- "seamlessly" / "effortlessly" / "easily"
- "perfect for" / "ideal for"
- "curated" unless literally describing a curation process
- "aesthetic" used as a standalone noun
- "cozy" — use "cosy" (UK English)
- Any phrase that reads like a generic Pinterest caption
`.trim();

// ── Per-category style rules ──────────────────────────────────────────────
const CATEGORY_RULES: Record<string, string> = {
  japandi: `JAPANDI STYLE RULES:
Japandi = Japanese wabi-sabi (beauty in imperfection) + Scandinavian hygge (warmth, function).
Materials to name: undyed linen, cotton, solid oak, walnut, bamboo, clay, rattan, washi paper, unglazed ceramic.
Palette: warm greige, soft charcoal, clay, muted sage, pale rice white. Never bright or saturated colours.
Less is intentional. Negative space is design. Empty surfaces are a choice, not a failure.
Every product mentioned must genuinely fit this aesthetic. If it barely does, say so honestly.`,

  living_room: `JAPANDI LIVING ROOM RULES:
Focus: low-profile sofas, solid wood coffee tables, natural fibre rugs, washi paper pendants, singular plants.
Materials: linen, oak, walnut, rattan, clay, stone, woven grass.
Never mention: busy gallery walls, matching suite furniture, overhead spotlights, patterned textiles.`,

  bedroom: `JAPANDI BEDROOM RULES:
Focus: platform beds, undyed linen bedding, minimal bedside objects (max 2), paper or washi lighting, hidden storage.
Materials: oak, walnut, linen, cotton, washi, unglazed ceramic.
Never mention: ornate headboards, patterned bedding, bright accent colours, multiple plants.`,

  kitchen: `JAPANDI KITCHEN RULES:
Focus: handleless cabinetry, stone or wood countertops, open shelf with 3–5 objects, ceramic vessels, single pendant.
Materials: stone, solid wood, unglazed ceramic, matte hardware.
Never mention: cluttered countertops, patterned tiles, glossy cabinetry, stainless appliances as hero.`,

  bathroom: `JAPANDI BATHROOM RULES:
Focus: poured concrete or stone tile, cedar bath tray, unglazed soap dish, waffle linen towels, single plant.
Materials: concrete, stone, cedar, unglazed ceramic, linen.
Never mention: bright coloured accessories, chrome (use brushed brass or matte black), cluttered shelves.`,

  coastal: `COASTAL STYLE RULES:
Feel: breezy, relaxed, sun-bleached warmth. A good beach house weekend.
Materials to name: rattan, whitewashed wood, bleached oak, sea glass, linen, cotton canvas, wicker, sisal.
Colours: sandy whites, sea glass blues, dusty aqua, warm driftwood, bleached terracotta.
Never mention: anchors, ship wheels, rope coils, tropical prints, or anything "nautical cliché".`,

  modern_farmhouse: `MODERN FARMHOUSE RULES:
Feel: warm, practical, lived-in. A home that feels used and loved.
Materials: reclaimed pine, weathered oak, shiplap, matte black iron, drop cloth cotton, butcher block.
Always mention: shiplap or board-and-batten wall texture. Matte black is the accent metal — never chrome.
Never mention: ornate carved furniture, glossy finishes, overly precious styling.`,

  boho: `BOHO STYLE RULES:
Feel: layered, personal, collected over time. A room that tells a story.
Materials: rattan, macramé, hand-woven textiles, carved wood, kilim, kantha, terracotta, jute.
Colours: terracotta, ochre, rust, sage, cream, deep burgundy, indigo — always warm-anchored.
Always include: at least one plant, layered rugs, or mixed textiles — boho rooms are never sparse.
Never mention: matching furniture sets, minimalist styling, cold colour palettes.`,

  scandinavian: `SCANDINAVIAN STYLE RULES:
Feel: practical warmth. Every object earns its place. Light is everything.
Materials: pale birch, light pine, light ash, wool, sheepskin, cotton, simple ceramics.
Always mention candles in any evening or cosy context — they are non-negotiable in Scandi interiors.
Never mention: dark heavy wood, multiple patterns, cluttered surfaces, ornate detail.`,

  cottagecore: `COTTAGECORE STYLE RULES:
Feel: romantic, gentle, botanical. An afternoon in a flower garden. Grown-up romance.
Materials: painted or distressed wood, floral cotton, lace, eyelet, vintage ceramics, iron, aged oak.
Always include: flowers or botanicals (dried or fresh), painted furniture (never flat-pack-new-looking).
Never mention: modern minimalist elements, flat-pack furniture, industrial finishes, bright saturated colours.`,

  mid_century_modern: `MID-CENTURY MODERN RULES:
Feel: confident, design-literate, retro-cool without trying too hard.
Materials: walnut, teak, wool, boucle, leather — always smooth, never distressed.
Always mention: tapered legs, credenzas, arc lamps, or organic forms — the silhouette IS the style.
Eras to reference naturally: 1950s, 1960s, atomic age, post-war modernism.
Never mention: rustic or distressed finishes, chrome, Victorian detail, high-profile furniture.`,

  general: `ROOM IDEAS RULES:
The COLOUR is the hero. Describe it precisely — "sage green is a dusty grey-green, like dried herbs, not spring leaves."
Always include: at least 2 specific paint names (Sherwin-Williams, Benjamin Moore, Behr, or Farrow & Ball).
Accessible and practical — write for someone who loves their home, not a designer.
Include price context where possible ("under $100", "mid-range", "investment piece").`,

  garden: `GARDEN & OUTDOOR RULES:
Visual-first. Describe the scene before the product.
Inspire aspirationally: "Imagine stepping outside to..." or "On a warm evening, this..."
Always mention: weather durability for outdoor products ("all-weather wicker", "UV-resistant cushions").
Never mention: obviously fake or plastic furniture, artificial turf, technical plant-care advice.`,

  global_styles: `GLOBAL STYLES RULES:
Cultural respect first. Celebrate the aesthetic without reducing it to a trend.
Use proper terms: Saltillo tile, Talavera pottery, hacienda arch, serape, wrought iron, equipale chair.
Reference place authentically: "the sun-filled courtyard of a Mexican hacienda".
Never use: "exotic", "tribal", or language that reduces cultures to aesthetic props.`,

  seasonal: `SEASONAL RULES:
The season must be obvious from the first paragraph. Never generic.
Fall: name the objects — pumpkins, dried pampas, amber candles, rust throws. Describe the smell and light.
Christmas: deep greens, red berry, velvet, candlelight. Atmospheric and editorial, not commercial.
Spring: blossoms, pale yellow, fresh linen, morning light. Never winter or autumn colours.`,

  guides: `STYLE GUIDES RULES:
Structured for skimmability — headings that can be scanned.
Compare styles fairly and neutrally — never dismiss one in favour of another.
Include a comparison table or clear bullet-point differences section.
End with a "Which is right for you?" section that helps the reader decide.`,
};

function getCategoryRules(category: string): string {
  // Map tab name to category key first
  const tabToKey: Record<string, string> = {
    'Japandi — Living Room': 'living_room', 'Japandi — Bedroom': 'bedroom',
    'Japandi — Kitchen': 'kitchen', 'Japandi — Bathroom': 'bathroom',
    'Japandi — Small Rooms': 'japandi',
    'Coastal — Bedroom': 'coastal', 'Coastal — Living Room': 'coastal',
    'Coastal — Kitchen': 'coastal', 'Coastal — Bathroom': 'coastal',
    'Coastal — Dining Room': 'coastal', 'Coastal — Outdoor + Porch': 'coastal',
    'Modern Farmhouse — Living Room': 'modern_farmhouse', 'Modern Farmhouse — Bedroom': 'modern_farmhouse',
    'Modern Farmhouse — Kitchen': 'modern_farmhouse', 'MF — Bathroom + Extras': 'modern_farmhouse',
    'MF — Outdoor + Porch': 'modern_farmhouse', 'MF — Laundry + Extras': 'modern_farmhouse',
    'Boho — Living Room': 'boho', 'Boho — Bedroom': 'boho',
    'Boho — Kitchen + Bathroom': 'boho', 'Boho — Dining + Entryway': 'boho', 'Boho — Outdoor + Extras': 'boho',
    'Cottagecore — Living Room': 'cottagecore', 'Cottagecore — Bedroom': 'cottagecore',
    'Cottagecore — Kitchen': 'cottagecore', 'Cottagecore — Bathroom': 'cottagecore',
    'Cottagecore — Dining + Garden': 'cottagecore',
    'Scandinavian — Bathroom': 'scandinavian', 'Scandinavian — Living Room': 'scandinavian',
    'Scandinavian — Kitchen': 'scandinavian', 'Scandinavian — Bedroom': 'scandinavian',
    'Scandinavian — Hub': 'scandinavian', 'Scandinavian — Dining + Extras': 'scandinavian',
    'MCM — Living Room': 'mid_century_modern', 'MCM — Bedroom': 'mid_century_modern',
    'MCM — Kitchen + Bathroom': 'mid_century_modern',
    'General — Bedroom (Color)': 'general', 'General — Bedroom (Styles)': 'general',
    'Bedroom — Demographics': 'general', 'General — Living Room': 'general',
    'General — Kitchen': 'general', 'General — Bathroom': 'general',
    'Garden — Pool + Hot Tub': 'garden', 'Garden — Landscaping': 'garden', 'Garden — Patio + Porch': 'garden',
    'Mexican + Hacienda': 'global_styles', 'Barndominium': 'modern_farmhouse',
    'Seasonal — Fall': 'seasonal', 'Seasonal — Christmas + Winter': 'seasonal', 'Seasonal — Spring + Other': 'seasonal',
    'Style Guides': 'guides',
  };
  const key = tabToKey[category] ?? category.toLowerCase().replace(/ /g, '_');
  return CATEGORY_RULES[key] ?? CATEGORY_RULES['general'];
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  const {
    type, title, headings, productBrief, wordCount,
    uniqueAngle, category, cluster, competition, priority, contentType,
  } = await req.json();

  const targetWords = wordCount ?? (type === 'product-review' ? 1400 : type === 'roundup' ? 1600 : 1800);
  const isListicle = ['ideas', 'decor', 'hacks', 'diy guide'].includes((contentType ?? type ?? '').toLowerCase());

  const headingBlock = (headings as { level: string; text: string; note: string }[])
    .map(h => `${h.level}: ${h.text}${h.note ? ` — [${h.note}]` : ''}`)
    .join('\n');

  const contextBlock = [
    `Category: ${category ?? 'Home Decor'}`,
    uniqueAngle ? `Unique Angle (HARD BOUNDARY — every section must stay inside this): ${uniqueAngle}` : '',
    cluster ? `Cluster: ${cluster}` : '',
    competition ? `Competition level: ${competition}` : '',
    priority ? `Priority: ${priority}` : '',
  ].filter(Boolean).join('\n');

  let prompt = '';

  const categoryRules = getCategoryRules(category ?? '');

  if (type === 'editorial' || isListicle) {
    prompt = `You are the content writer for decoreixy.com, a home decor site covering 12 style categories.

ARTICLE DETAILS:
Title: ${title}
${contextBlock}
Target words: ~${targetWords}
Content type: ${contentType ?? type}

OUTLINE (follow this structure exactly):
${headingBlock}

${UNIVERSAL_RULES}

${categoryRules}

STRUCTURE RULES:
- Open with a 2-paragraph introduction. No heading. Hook the reader with a specific scene or observation.
- Follow the outline headings in order. Use ## for H2, ### for H3.
- Each H2 section: 2–3 paragraphs. Each paragraph: 2–3 sentences maximum.
- New paragraph every 2–3 sentences — no long blocks of text.
${isListicle ? '- For listicle items (H3): one tight paragraph per idea. Lead with what makes it work visually.' : ''}
- Unique Angle is a hard boundary — every heading and paragraph stays inside it. Do not drift.
- End with ## Frequently Asked Questions — 2–3 questions that real people search for about this topic.
- After FAQ, one closing paragraph (no heading). 2 sentences maximum.
- Do NOT end with a summary of what you just said.

AFFILIATE LINKS:
- Format: [product name](AFFILIATE_LINK_PLACEHOLDER) — leave placeholder, editor adds real URL.
- Only mention products you can describe specifically: material, finish, approximate price. No invented names.
- Amazon affiliate tag reminder: ?tag=oppositeattra-20 (editor adds this)

Return ONLY the article in markdown. No preamble, no "Here is the article", no commentary.`;

  } else if (type === 'product-review') {
    const p = productBrief ?? {};
    prompt = `You are the content writer for decoreixy.com, a home decor site.

ARTICLE DETAILS:
Title: ${title}
${contextBlock}
Target words: ~${targetWords}

PRODUCT DATA:
Current price: ${p.currentPrice ?? 'N/A'}
90-day low: ${p.low90 ?? 'N/A'}
90-day high: ${p.high90 ?? 'N/A'}
Amazon stars: ${p.stars ?? 'N/A'} (${p.reviewCount ?? 'N/A'} reviews)
Editorial angle: ${p.angle ?? uniqueAngle ?? 'Not specified'}

${UNIVERSAL_RULES}

${categoryRules}

STRUCTURE:
## Overview
## Design & Aesthetic
## Build Quality & Materials
## Japandi Fit: Does It Work?
## Price & Value
## Pros & Cons
✓ [pro] (4–5 lines)
✕ [con] (2–3 lines)
## Our Verdict

RULES:
- Honest, balanced. Not promotional. Name specific flaws.
- Price & Value section: state if it is above or below its 90-day average — tell the reader if now is a good time to buy.
- Verdict: one clear recommendation sentence. "Buy if…" or "Wait if…".
- Use **bold** on the key finding in each section.

Return ONLY the article in markdown. No preamble.`;

  } else if (type === 'roundup') {
    const products = (productBrief?.products ?? []) as { name: string; currentPrice: string; stars: string; angle: string }[];
    prompt = `You are the content writer for decoreixy.com, a home decor site.

ARTICLE DETAILS:
Title: ${title}
${contextBlock}
Target words: ~${targetWords}

PRODUCTS TO INCLUDE:
${products.map((p, i) => `${i + 1}. ${p.name} — £${p.currentPrice} — ${p.stars}★ — ${p.angle}`).join('\n')}

${UNIVERSAL_RULES}

${categoryRules}

STRUCTURE:
- Introduction: 2 paragraphs, no heading. State the selection criteria briefly.
## How We Chose
## Our Picks (number each as ### 1. Product Name)
For each product: 1 focused paragraph. Cover material, Japandi fit, and value. Include price.
## Final Thoughts

RULES:
- Every product chosen must genuinely fit the Japandi aesthetic. If one barely fits, say so.
- Use **bold** on the standout feature of each pick.

Return ONLY the article in markdown. No preamble.`;
  }

  if (!prompt) {
    return NextResponse.json({ error: `Unknown article type: ${type}` }, { status: 400 });
  }

  // Fetch published articles + cluster links for contextual internal linking
  let publishedArticles: Array<{ title: string; slug: string; category: string; isMother?: boolean; cluster?: string }> = [];
  let motherArticle: { title: string; slug: string; category: string } | null = null;
  let siblingArticles: Array<{ title: string; slug: string; category: string }> = [];
  try {
    publishedArticles = await sanity.fetch(
      `*[_type == "article" && defined(slug.current) && slug.current != $slug] { title, "slug": slug.current, category, isMother, cluster }`,
      { slug: (title ?? '').toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '') }
    );
    if (cluster) {
      const sameCluster = publishedArticles.filter(a => a.cluster === cluster);
      motherArticle = sameCluster.find(a => a.isMother) ?? null;
      siblingArticles = sameCluster.filter(a => !a.isMother);
    }
  } catch { /* non-fatal — continue without links */ }

  if (publishedArticles.length > 0) {
    const motherBlock = motherArticle
      ? `CLUSTER MOTHER ARTICLE — MUST LINK TO THIS ONCE:
The master guide for this cluster is: [${motherArticle.title}](https://decoreixy.com/${motherArticle.category}/${motherArticle.slug})
Embed this link naturally in one sentence (e.g. "For the full room guide, [the ultimate Japandi living room guide](url) covers every element."). Do not list it — weave it into prose.\n\n`
      : '';

    const siblingBlock = siblingArticles.length > 0
      ? `CLUSTER SIBLING ARTICLES — LINK TO 1–2 WHERE RELEVANT:
These are other articles in the same content cluster. Pick 1–2 that are topically closest to a section in this article and link to them naturally mid-prose:
${siblingArticles.map(a => `- [${a.title}](https://decoreixy.com/${a.category}/${a.slug})`).join('\n')}\n\n`
      : '';

    const otherArticles = publishedArticles
      .filter(a => a.slug !== motherArticle?.slug && !siblingArticles.find(s => s.slug === a.slug))
      .slice(0, 3)
      .map(a => `- [${a.title}](https://decoreixy.com/${a.category}/${a.slug})`)
      .join('\n');

    const otherBlock = !siblingArticles.length && otherArticles
      ? `OTHER PUBLISHED ARTICLES — embed 1 where relevant:\n${otherArticles}\n\n`
      : '';

    prompt += `

INTERNAL LINKING — REQUIRED:
${motherBlock}${siblingBlock}${otherBlock}Format all links as: [anchor text](full url). Weave naturally into prose. Never list links at the end of the article.

EXTERNAL LINK — REQUIRED:
Add exactly one external link to a reputable home decor or design authority site.
Link to the ROOT domain only — no invented paths or article slugs.
Approved URLs: https://www.dezeen.com/, https://www.architecturaldigest.com/, https://www.housebeautiful.com/, https://www.mydomaine.com/, https://www.apartmenttherapy.com/, https://www.elledecor.com/
Format: [descriptive anchor text](root url). Place naturally in the prose.`;
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const article = message.content[0].type === 'text' ? message.content[0].text : '';

  return NextResponse.json({ article });
}
