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
  };
  const roomType = categoryNames[category] ?? 'Japandi interior';

  const articleContext = articleMarkdown
    ? `\nFull article content for context (understand what each section is about before writing its prompt):\n---\n${articleMarkdown.slice(0, 6000)}\n---\n`
    : '';

  const prompt = `You are the world's leading expert at writing AI image generation prompts for FLUX (a hyper-realistic photographic AI model). You write prompts for a Japandi and wabi-sabi interior design blog called wabidecor.com.
${articleContext}
Article title: "${articleTitle}"
Room type: ${roomType}

TASK: Write one detailed image generation prompt for each section heading listed below. Then${includePins ? ' write prompts for 3 Pinterest pin layouts.' : '.'}

STRICT RULES FOR SECTION IMAGE PROMPTS:
1. Each prompt must describe a COMPLETELY DIFFERENT scene — different room zone, different objects, different composition
2. You MUST vary across ALL sections (track what you use and never repeat):
   - COLOR PALETTE: cycle through warm beige, cool sage, deep charcoal, soft terracotta, stone grey, creamy white, dusty blush
   - TIME OF DAY: dawn light, morning sun, midday overcast, golden hour, blue hour, candlelight/evening lamp
   - CAMERA ANGLE: wide room shot, eye-level, floor-level low angle, overhead flat lay, tight close-up detail, three-quarter room, doorway frame shot
   - SEASON: crisp winter morning, bright spring morning, warm summer afternoon, soft autumn golden hour
   - SETTING ZONE: beside the bed, by the window, wardrobe/storage area, reading corner, bathroom vanity, kitchen counter, living room shelf, entry way
3. Every prompt must contain:
   - Specific named objects (pale oak platform bed, matte black ceramic vase, handwoven jute rug, rattan pendant light, linen duvet, bamboo towel rack, etc.)
   - Exact lighting description (direction, quality, colour temperature)
   - Camera lens specification (35mm wide, 50mm natural, 85mm shallow DOF, 24mm environmental)
   - Wabi-sabi detail (slight imperfection, natural grain, worn texture, organic form)
   - End every prompt with: "Hasselblad H6D-400C medium format, f/2.8, hyper-realistic RAW photograph, Kinfolk magazine editorial quality, 8K, photorealistic, no CGI, no artificial look"
4. Prompts should be 2–3 sentences, around 60–80 words
5. READ THE ARTICLE CONTENT to understand what each section is about — reflect the actual idea in the visual scene

${includePins ? `
PINTEREST PIN PROMPTS — generate exactly 3 pins with these specific layouts:

PIN 1 — 4-PANEL COLLAGE LAYOUT:
Generate one 1000×1500px portrait image that looks like a professional Pinterest interior design collage. It must show four equal rectangular panels arranged in a 2×2 grid, separated by 3px clean white borders. Each panel should show a different Japandi ${roomType.toLowerCase()} scene. Write what goes in each panel. The overall image should read as one cohesive Pinterest pin. End with: "2×2 collage grid layout, clean white 3px borders, four distinct interior vignettes, professional Pinterest design pin, portrait 2:3 format, editorial photography composite"

PIN 2 — HERO + 2 BOTTOM PANELS:
Generate one 1000×1500px portrait image showing a three-panel editorial layout. Large hero panel fills the top 60% showing a full ${roomType.toLowerCase()} scene. Two equal square panels side by side fill the bottom 40%, each showing a close-up detail. The three panels connect with 3px white dividers. End with: "three-panel Pinterest editorial layout, large hero panel top, two equal detail panels bottom, 3px white dividers, portrait 2:3 format, editorial photography"

PIN 3 — COMPLETE SCENIC IMAGE WITH TEXT SPACE:
Generate one beautiful, complete ${roomType.toLowerCase()} scene. The bottom 25–30% of the image should be intentionally calm, simple and uncluttered (floor, plain wall, or softly out-of-focus surface) to leave clean space for text overlay. End with: "full scenic portrait image, intentionally calm and minimal bottom 25% for text overlay, hyper-realistic, Kinfolk editorial photography, portrait 2:3 format"
` : ''}

SECTION HEADINGS TO WRITE PROMPTS FOR:
${headings.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}

Return ONLY valid JSON in this exact format, no explanation:
{
  "sectionPrompts": ["prompt for heading 1", "prompt for heading 2", ...],
  "pinPrompts": [
    { "layout": "collage4", "textPosition": "center", "prompt": "..." },
    { "layout": "hero3panel", "textPosition": "center", "prompt": "..." },
    { "layout": "complete", "textPosition": "bottom", "prompt": "..." }
  ]
}
${!includePins ? '(omit pinPrompts from response if not needed)' : ''}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
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
