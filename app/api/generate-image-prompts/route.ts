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

  const prompt = `You are the world's best AI image prompt writer for FLUX (a hyper-realistic photographic model). You write prompts for wabidecor.com, a Japandi and wabi-sabi interior design blog.
${articleContext}
Article: "${articleTitle}"
Room type: ${roomType}

TASK: Write one hyper-detailed image generation prompt per section heading. Every prompt MUST follow this exact structure — all 12 elements, in this order, separated by commas:

[1. SUBJECT] specific objects in the scene — name exact materials (undyed wool boucle throw, pale oak tray, matte stoneware bottle vase, hand-pinched terracotta cup, indigo sashiko cushion, etc.) — pulled directly from the article section content
[2. ENVIRONMENT/SETTING] exact room zone and surfaces (low oak coffee table in a minimal Japandi living room, beside a paper shoji screen, on a pale linen sofa, etc.)
[3. LIGHTING SOURCE + DIRECTION] where light comes from (soft north-facing window light raking across from the left, single pendant warm lamp above, diffused skylight from above, etc.)
[4. LIGHTING QUALITY + COLOUR TEMP] character of light (warm 3200K golden hour glow, cool 6500K overcast diffused, soft 4000K neutral morning, candlelight 2700K flickering warmth)
[5. TIME OF DAY] (early morning 7am, mid-morning 10am, golden hour 5pm, blue hour dusk, evening 8pm by lamp)
[6. CAMERA BODY] (Sony A7R V, Hasselblad X2D 100C, Nikon Z9, Fujifilm GFX 100S)
[7. LENS + FOCAL LENGTH] (35mm f/1.4 wide prime, 50mm f/1.2 standard prime, 85mm f/1.8 portrait prime, 24mm f/2.8 environmental wide)
[8. APERTURE + ISO] (f/1.8 ISO 200, f/2.8 ISO 400, f/4 ISO 100, f/1.4 ISO 160)
[9. CAMERA ANGLE + HEIGHT] (eye-level shot at 90cm height, low angle floor-level at 30cm looking up, overhead flat lay directly above, three-quarter angle at 120cm, doorway frame shot)
[10. COMPOSITION] (rule of thirds with subject left, centred symmetry, negative space dominant right, leading lines from window, foreground bokeh blur with sharp subject)
[11. MOOD] (serene and meditative, warm and intimate, clean and airy, quiet and contemplative, cosy and grounded)
[12. TECHNICAL FINISH] always end with: "hyper-realistic RAW photograph, Kinfolk magazine editorial quality, 8K resolution, photorealistic, no CGI, no artificial rendering, no illustration"

STRICT VARIATION RULES — track across ALL sections, never repeat:
- Each section must use a different TIME OF DAY
- Each section must use a different CAMERA ANGLE
- Each section must use a different LENS focal length
- Each section must use a different LIGHTING setup
- Each section must show a completely different room zone / setting
- Objects must match the SPECIFIC items described in the article section — do not invent generic furniture

JAPANDI AESTHETIC RULES:
- Natural materials only: linen, oak, walnut, bamboo, clay, stone, rattan, wool, cotton, ceramic
- Muted palette: warm whites, soft greys, warm beige, charcoal, muted sage, dusty terracotta
- Wabi-sabi imperfection: slight texture variation, natural grain visible, organic handmade forms
- Negative space is intentional — not every surface is filled
- No bright colours, no chrome, no glossy plastic, no flowers unless dried

${includePins ? `
PINTEREST PIN PROMPTS — exactly 3 pins:

PIN 1 — 4-PANEL COLLAGE: A single 1000×1500px portrait image designed as a Pinterest collage. Four equal panels in a 2×2 grid separated by 3px clean white dividers. Each panel shows a different ${roomType} vignette. Apply all 12 prompt elements to describe the overall composite. End with: "2×2 collage grid, 3px white dividers, four distinct Japandi vignettes, professional Pinterest pin, portrait 2:3 format, composite editorial photography"

PIN 2 — HERO + 2 PANELS: A single 1000×1500px portrait image. Large hero panel fills top 60% with a full ${roomType} scene. Two equal square panels side by side fill bottom 40%, each a close-up detail. 3px white dividers. End with: "three-panel Pinterest layout, large hero top, two detail panels bottom, 3px white dividers, portrait 2:3 format, editorial photography"

PIN 3 — FULL SCENE WITH TEXT SPACE: A complete scenic ${roomType} image. Bottom 25–30% is intentionally calm and uncluttered (bare floor, plain wall, soft bokeh surface) for text overlay. Apply all 12 prompt elements. End with: "full scenic portrait, intentionally minimal bottom 25% for text overlay, portrait 2:3 format, hyper-realistic, Kinfolk editorial photography"
` : ''}

FEATURED IMAGE PROMPT:
Also write one featured image prompt for the article as a whole. This is the hero/cover image — 1200×800px landscape format. It should represent the overall theme and mood of the entire article, showing a wide, beautiful ${roomType} scene. Apply all 12 prompt elements. The scene should be a complete room overview (not a close-up), landscape oriented, with generous negative space and editorial quality. End with: "1200×800px landscape orientation, wide hero shot, editorial cover photography, hyper-realistic RAW photograph, Kinfolk magazine quality, 8K"

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
