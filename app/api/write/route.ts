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

const STYLE_RULES = `
WRITING RULES — FOLLOW EXACTLY:
1. Sentences: 20 words maximum. Short, direct. No compound sentences joined with "and" or "but".
2. Bold: Use **bold** for the key 2–3 word phrase in each paragraph. Never bold a full sentence.
3. Paragraphs: 2–4 sentences each. White space is good.
4. Tone: warm, editorial, knowledgeable — like a trusted friend who knows interiors. Never sales-y.
5. Specificity: name materials (linen, oak, matte black), measurements, price ranges. Vague = bad.
6. UK English: colour, favour, grey, cosy, whilst, matte, centre.

BANNED WORDS AND PHRASES — never use any of these:
- "elevate your space" / "elevate your home"
- "transform your home" / "transform your space"
- "stunning" / "breathtaking" / "beautiful" (use specific: "clean-lined", "low-contrast", "textured")
- "timeless elegance" / "timeless beauty"
- "create a sanctuary" / "your sanctuary"
- "embrace" (the concept / the aesthetic / the style)
- "journey" (design journey, etc.)
- "dive into"
- "seamlessly"
- "perfect for"
- "look no further"
- "curated" unless referring to an actual curation process
- "aesthetic" as a standalone noun ("the aesthetic", "your aesthetic")
- Any phrase that could appear in a generic Pinterest caption

JAPANDI STYLE RULES:
- Japandi = Japanese wabi-sabi + Scandinavian hygge. Functional, quiet, imperfect.
- Natural materials: linen, cotton, oak, walnut, bamboo, clay, stone, rattan.
- Neutral palette: warm whites, soft greys, muted greens, warm beige, charcoal. Never bright or saturated.
- Less is more. Empty space is intentional.
- Every product mentioned must fit this aesthetic. If it does not, say so.
`.trim();

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

  if (type === 'editorial' || isListicle) {
    prompt = `You are the wabi. Content Agent writing for wabidecor.com, a Japandi home decor blog.

ARTICLE DETAILS:
Title: ${title}
${contextBlock}
Target words: ~${targetWords}
Content type: ${contentType ?? type}

OUTLINE (follow this structure exactly):
${headingBlock}

${STYLE_RULES}

STRUCTURE RULES:
- Open with a 2-paragraph introduction. No heading. Hook the reader with a specific scenario or observation.
- Follow the outline headings in order. Use ## for H2, ### for H3.
- Each H2 section: 2–4 paragraphs. Each paragraph: 2–4 sentences.
${isListicle ? '- For listicle items (H3): one focused paragraph per idea. Lead with what makes it work in a Japandi space.' : ''}
- Unique Angle is a hard boundary. Every heading, every paragraph must stay inside it. Do not drift.
- End with a short 2-sentence conclusion. No "Final Thoughts" heading — just a closing paragraph.

AFFILIATE LINKS:
- When you mention a specific product, format it: [product name](AFFILIATE_LINK_PLACEHOLDER) — leave the placeholder, the editor will add the real URL.
- Do not invent product names. Only mention products if you can describe them specifically (material, finish, price range).

Return ONLY the article in markdown. No preamble, no meta-commentary, no "Here is the article:".`;

  } else if (type === 'product-review') {
    const p = productBrief ?? {};
    prompt = `You are the wabi. Content Agent writing for wabidecor.com, a Japandi home decor blog.

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

${STYLE_RULES}

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
    prompt = `You are the wabi. Content Agent writing for wabidecor.com, a Japandi home decor blog.

ARTICLE DETAILS:
Title: ${title}
${contextBlock}
Target words: ~${targetWords}

PRODUCTS TO INCLUDE:
${products.map((p, i) => `${i + 1}. ${p.name} — £${p.currentPrice} — ${p.stars}★ — ${p.angle}`).join('\n')}

${STYLE_RULES}

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

  // Fetch published articles from Sanity to enable contextual internal linking
  let publishedArticles: Array<{ title: string; slug: string; category: string }> = [];
  try {
    publishedArticles = await sanity.fetch(
      `*[_type == "article" && defined(slug.current) && slug.current != $slug] { title, "slug": slug.current, category }`,
      { slug: (title ?? '').toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '') }
    );
  } catch { /* non-fatal — continue without links */ }

  if (publishedArticles.length > 0) {
    const linkList = publishedArticles
      .map(a => `- [${a.title}](https://wabidecor.com/${a.category}/${a.slug})`)
      .join('\n');
    prompt += `

INTERNAL LINKING — REQUIRED:
Embed 1–2 of these published articles as natural inline links within the article prose.
Pick only the most topically relevant ones. Format: [anchor text](full url).
Do NOT list them at the end — weave them naturally into a sentence mid-article.
Published articles available to link:
${linkList}

EXTERNAL LINK — REQUIRED:
Add exactly one external link to a reputable home decor or design authority site.
Link to the ROOT domain only — no invented paths or article slugs.
Approved URLs: https://www.dezeen.com/, https://www.architecturaldigest.com/, https://www.housebeautiful.com/, https://www.mydomaine.com/, https://www.apartmenttherapy.com/, https://www.elledecor.com/
Format: [descriptive anchor text](root url). Place naturally in the prose.`;
  }

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const article = message.content[0].type === 'text' ? message.content[0].text : '';

  return NextResponse.json({ article });
}
