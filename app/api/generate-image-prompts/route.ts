import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { articleTitle, category, headings, articleMarkdown, includePins } = await req.json();

  if (!headings?.length) return NextResponse.json({ error: 'No headings provided' }, { status: 400 });

  const categoryNames: Record<string, string> = {
    bedroom: 'Japandi bedroom',
    'living-room': 'Japandi living room',
    bathroom: 'Japandi bathroom',
    kitchen: 'Japandi kitchen',
    entryway: 'Japandi entryway',
    'home-office': 'Japandi home office',
    style: 'Japandi interior',
    guides: 'Japandi interior',
    'gift-guides': 'Japandi interior',
  };
  const roomType = categoryNames[category] ?? 'Japandi interior';

  const articleContext = articleMarkdown
    ? `\nFull article content — READ THIS CAREFULLY before writing each prompt. Every prompt must reflect the specific objects and ideas described in that section:\n---\n${articleMarkdown.slice(0, 8000)}\n---\n`
    : '';

  const prompt = `You are the world's best AI image prompt writer for FLUX (a hyper-realistic photographic model). You write prompts for decoreixy.com, a Japandi and wabi-sabi interior design blog.
${articleContext}
Article: "${articleTitle}"
Room type: ${roomType}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COLOUR STORY BANK — assign ONE per section, NO REPEATS across the article:

Story A — DARK FOREST: deep charcoal walls (#2a2a25), dark wenge or blackened oak furniture, warm amber candlelight pooling in shadows, dark moss green linen, black matte ceramic, aged brass pin details
Story B — WARM TERRACOTTA: deep clay-red/burnt sienna wall, raw terracotta pots, sand-coloured linen throw, dark walnut tray, earthy tones throughout, warm afternoon sun casting long shadows
Story C — COOL SLATE: cool grey-blue walls, pale birch wood, slate stone surfaces, indigo linen, cool 6500K overcast light, muted steel-blue ceramics, minimal white negative space
Story D — SAGE MOSS: muted sage green walls, pale ash wood, olive and sage textiles, warm cream accents, natural rattan, mid-morning diffused light, dusty green stoneware
Story E — WARM LINEN (use sparingly — only 1 section max): warm off-white/cream walls, pale oak, unbleached linen, warm morning light — traditional Japandi look
Story F — MIDNIGHT MOODY: near-black walls (very deep navy or charcoal), dark walnut, single warm lamp creating dramatic chiaroscuro, deep rust linen, moody and cinematic evening scene
Story G — BLEACHED COASTAL: sun-bleached driftwood, whitewashed plaster walls, cool sea-light, pale pebble tones, aged white ceramics, washed cotton, very airy and light
Story H — DEEP EARTHY: dark chocolate brown walls, medium walnut, raw clay ceramics in umber and brown, amber wool throws, deep ochre linen, rich warm afternoon light

You MUST use a different story for each section. Track and list which story you used (in a comment before each JSON prompt).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WOOD SPECIES BANK — rotate, never use same wood twice in a row:
pale birch | dark wenge | weathered driftwood | blackened oak | medium walnut | bamboo | reclaimed pine | dark mahogany | ash | teak

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCENE TYPE BANK — rotate, each section must use a different scene:
tight macro detail shot | full room wide shot | corner vignette | window seat or ledge | floor-level view looking up | doorway frame shot | flat lay overhead | shelf styled scene | bath/sink close-up | bedside table vignette | workspace surface | morning routine scene

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK: Write one hyper-detailed image generation prompt per section heading. Every prompt MUST follow this exact structure — all 12 elements, in this order, separated by commas:

[1. SUBJECT] specific objects in the scene — name exact materials pulled directly from the article section — use the COLOUR STORY assigned to this section for all colours and materials
[2. ENVIRONMENT/SETTING] exact room zone from SCENE TYPE BANK — must be different from every other section
[3. LIGHTING SOURCE + DIRECTION] where light comes from (soft north-facing window light raking from left, single pendant warm lamp above, diffused skylight, dramatic side-light through slatted blind, candlelight from below, etc.)
[4. LIGHTING QUALITY + COLOUR TEMP] character of light matching the COLOUR STORY (warm 2700K candlelight, cool 6500K overcast, golden 3200K afternoon, dramatic chiaroscuro, etc.)
[5. TIME OF DAY] (early morning 7am, mid-morning 10am, golden hour 5pm, blue hour dusk, evening 8pm by lamp, rainy afternoon)
[6. CAMERA BODY] (Sony A7R V, Hasselblad X2D 100C, Nikon Z9, Fujifilm GFX 100S, Phase One IQ4)
[7. LENS + FOCAL LENGTH] (35mm f/1.4 wide prime, 50mm f/1.2 standard prime, 85mm f/1.8 portrait, 24mm f/2.8 wide, 100mm f/2.8 macro, 28mm f/2 wide)
[8. APERTURE + ISO] (f/1.8 ISO 200, f/2.8 ISO 400, f/4 ISO 100, f/1.4 ISO 160, f/2 ISO 320)
[9. CAMERA ANGLE + HEIGHT] (eye-level 90cm, low angle floor-level 30cm looking up, overhead flat lay, three-quarter angle 120cm, doorway frame, high angle 150cm looking down)
[10. COMPOSITION] (rule of thirds subject left, centred symmetry, negative space dominant right, leading lines from window, foreground bokeh blur with sharp subject, diagonal composition)
[11. MOOD] must match COLOUR STORY (moody and cinematic, earthy and grounded, cool and airy, warm and intimate, dramatic and contemplative, bleached and serene, etc.)
[12. TECHNICAL FINISH] always end with: "hyper-realistic RAW photograph, Kinfolk magazine editorial quality, 8K resolution, photorealistic, no CGI, no artificial rendering, no illustration"

STRICT VARIATION RULES — MUST FOLLOW or the output is rejected:
- Assign a different COLOUR STORY to every section — list it
- Use a different WOOD SPECIES in every section — never repeat
- Each section uses a different SCENE TYPE
- Each section uses a different TIME OF DAY
- Each section uses a different CAMERA ANGLE
- Each section uses a different LENS focal length
- Objects must match the SPECIFIC content of each article section

JAPANDI AESTHETIC RULES:
- Natural materials only: linen, clay, stone, rattan, wool, cotton, ceramic, glass, paper, leather
- Wabi-sabi imperfection: visible grain, organic handmade texture, slight asymmetry, natural patina
- Negative space is intentional — surfaces are NOT fully filled
- No bright colours, no chrome, no glossy plastic, no fresh flowers (dried only), no branded items

${includePins ? `
PINTEREST PIN PROMPTS — exactly 3 pins:

PIN 1 — 4-PANEL COLLAGE: A single 1000×1500px portrait image designed as a Pinterest collage. Four equal panels in a 2×2 grid separated by 3px clean white dividers. Each panel shows a different ${roomType} vignette. Apply all 12 prompt elements to describe the overall composite. End with: "2×2 collage grid, 3px white dividers, four distinct Japandi vignettes, professional Pinterest pin, portrait 2:3 format, composite editorial photography"

PIN 2 — HERO + 2 PANELS: A single 1000×1500px portrait image. Large hero panel fills top 60% with a full ${roomType} scene. Two equal square panels side by side fill bottom 40%, each a close-up detail. 3px white dividers. End with: "three-panel Pinterest layout, large hero top, two detail panels bottom, 3px white dividers, portrait 2:3 format, editorial photography"

PIN 3 — FULL SCENE WITH TEXT SPACE: A complete scenic ${roomType} image. Bottom 25–30% is intentionally calm and uncluttered (bare floor, plain wall, soft bokeh surface) for text overlay. Apply all 12 prompt elements. End with: "full scenic portrait, intentionally minimal bottom 25% for text overlay, portrait 2:3 format, hyper-realistic, Kinfolk editorial photography"
` : ''}

FEATURED IMAGE PROMPT:
Also write one featured image prompt for the article as a whole. This is the hero/cover image — 1200×800px landscape format.
- Choose the most dramatic and visually striking COLOUR STORY from the bank (pick Story A, B, F, or H for maximum impact — dark, moody, or richly earthy)
- Wide full-room shot showing a beautiful ${roomType} scene
- Dramatic lighting: strong directional light creating atmosphere, not flat even light
- Apply all 12 prompt elements
- The scene should feel editorial, magazine-worthy, and immediately arresting — not plain or neutral
- End with: "1200×800px landscape orientation, wide hero shot, editorial cover photography, hyper-realistic RAW photograph, Kinfolk magazine quality, 8K"

SECTION HEADINGS:
${headings.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}

Return ONLY valid JSON, no explanation:
{
  "featuredPrompt": "full prompt for the featured hero image",
  "sectionPrompts": ["full prompt for heading 1", "full prompt for heading 2", ...],
  "pinPrompts": [
    { "layout": "collage4", "textPosition": "center", "prompt": "..." },
    { "layout": "hero3panel", "textPosition": "center", "prompt": "..." },
    { "layout": "complete", "textPosition": "bottom", "prompt": "..." }
  ]
}
${!includePins ? '(omit pinPrompts)' : ''}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';

  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Failed to parse Claude response', raw: text.slice(0, 500) }, { status: 500 });
  }
}
