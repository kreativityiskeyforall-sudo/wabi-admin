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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JAPANDI 60-30-10 COLOUR CONTRAST SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rule: 60% wall colour (dominant, most neutral), 30% furniture (one step deeper or warmer), 10% dark anchor (frames, curtain, ceramics — the contrast punch).
The tension between warm + cool + dark in each combo is what makes it visually exciting.

Assign ONE COMBO per section. NEVER REPEAT a combo in the same article. Each image must look completely different.

COMBO 1 — FOREST NIGHT
 Wall 60%: deep forest green (#2d4a3e) — rich, moody, nature-inspired
 Furniture 30%: pale ash wood shelving, cream boucle armchair — high contrast against dark wall
 Dark anchor 10%: matte black iron frames, black stoneware ceramics
 Curtains: heavy oatmeal cream linen floor-length panels — pale warmth against dark green
 Objects: dried pampas, pale sand ceramics, unbleached cotton, natural rope
 Light: warm amber lamp glow 2700K — pools of light against deep green darkness
 Mood: moody forest, intimate and sheltering

COMBO 2 — BURNT CLAY
 Wall 60%: warm terracotta / burnt sienna (#b5604a) — earthy, saturated, Moroccan-Japanese fusion
 Furniture 30%: dark wenge or blackened walnut — deep rich tone deepening the room
 Dark anchor 10%: matte black steel frames, deep charcoal cushion
 Curtains: heavy deep indigo linen panels — strong cool-warm contrast against the red-orange wall
 Objects: pale sand stoneware, natural rattan basket, unbleached linen throw
 Light: strong golden afternoon directional 4200K — casting long dramatic shadows
 Mood: earthy and ancient, desert-meets-Japan

COMBO 3 — INK NIGHT
 Wall 60%: near-black charcoal (#28261f) — cinematic, bold, night-ink inspired
 Furniture 30%: warm pale oak or light ash — maximum warm/dark contrast
 Dark anchor 10%: deep navy ceramic, black lacquer tray
 Curtains: heavy warm cream or ivory wool panels — glowing against black wall
 Objects: warm amber glass vessels, aged brass accents, pale clay bowl catching light
 Light: single warm lamp 2200K creating chiaroscuro, dramatic pooled light
 Mood: cinematic drama, intimate night ritual

COMBO 4 — SLATE BLUE MIST
 Wall 60%: cool grey-blue slate (#6a7f8f) — calm, mineral, Japanese sea-inspired
 Furniture 30%: warm medium walnut — warm/cool colour tension
 Dark anchor 10%: charcoal throw, near-black iron hardware
 Curtains: deep rust or burnt orange linen — strong warm contrast against cool blue-grey wall
 Objects: dark indigo stoneware, amber beeswax candle, natural stone tray
 Light: cool overcast 6000K with one warm lamp creating contrast
 Mood: quiet tension, cool and considered

COMBO 5 — DEEP TEAL OCEAN
 Wall 60%: deep teal (#1e5f6a) — bold, watery, Japanese ink wash
 Furniture 30%: weathered driftwood or pale bleached wood — contrast against deep teal
 Dark anchor 10%: very dark navy ceramic vessels, black iron curtain rail
 Curtains: warm raw linen or sand-coloured sheer panels — warm against cool deep teal
 Objects: aged white stoneware, natural rope, bleached wood board
 Light: late afternoon 4500K golden light catching the pale furniture
 Mood: coastal Japan, still and deep

COMBO 6 — OLIVE GROVE
 Wall 60%: warm muted olive (#6b7c57) — Italian farmhouse meets Japanese countryside
 Furniture 30%: dark chocolate walnut — deepens and grounds the olive
 Dark anchor 10%: matte black pendant lamp, charcoal linen cushion
 Curtains: deep rust or burnt orange heavy linen — warm earthy contrast against olive
 Objects: terracotta clay pots, amber glass, raw unglazed ceramics
 Light: warm 3500K afternoon sun raking from the side
 Mood: earthy harvest, warmly grounded

COMBO 7 — DUSTY PLASTER ROSE
 Wall 60%: warm dusty blush clay (#c4978a) — soft but saturated, wabi warmth
 Furniture 30%: very dark wenge or ebony stain — maximum contrast
 Dark anchor 10%: matte black iron hardware and frames
 Curtains: deep forest green or dark teal heavy linen panels — cool/warm tension against blush
 Objects: pale cream ceramics, natural linen, dried sage bundles
 Light: soft morning 4000K diffused — gentle shadows on textured plaster wall
 Mood: feminine wabi, warm and quietly bold

COMBO 8 — DEEP OCHRE GOLD
 Wall 60%: deep warm ochre gold (#b8861e) — bold Japanese autumn, saturated and rich
 Furniture 30%: very dark wenge or near-black ebony — maximum contrast
 Dark anchor 10%: matte black steel, deep charcoal heavy curtain
 Curtains: very dark charcoal or near-black heavyweight panels — dramatic frame
 Objects: pale whitewashed ceramics, natural linen, bleached wood objects
 Light: low winter afternoon 3000K, long shadows, golden glow on pale objects
 Mood: bold and graphic, autumn Japan

COMBO 9 — CHARCOAL WARM
 Wall 60%: warm dark charcoal (#383530) — slightly brown-toned, not cold
 Furniture 30%: pale birch or whitewashed pine — pale warmth against charcoal
 Dark anchor 10%: black matte ceramic, dark iron curtain rail
 Curtains: off-white or warm ivory heavyweight wool — glowing contrast against charcoal
 Objects: cream linen bundle, pale oak tray, dried botanicals, warm candle
 Light: warm 2800K lamp pooling against the dark wall
 Mood: cabin warmth, dark and cosy

COMBO 10 — SAGE MINERAL
 Wall 60%: soft mineral sage grey-green (#a8baa8) — calm, earthy, Scandinavian nature
 Furniture 30%: dark walnut or teak — grounding contrast
 Dark anchor 10%: charcoal heavy textiles, near-black stoneware
 Curtains: deep burgundy or terracotta rust linen — unexpected warm contrast against sage
 Objects: dark stoneware, amber beeswax candles, natural rattan
 Light: mid-morning 4500K with one warm accent lamp
 Mood: rich and warm, earthy sage world

COMBO 11 — STONE WHITE DRAMA
 Wall 60%: aged off-white plaster (#ede8df) — textured, not clean white — visible plaster grain
 Furniture 30%: very dark walnut or near-black wenge — maximum contrast
 Dark anchor 10%: ONE heavy deep indigo curtain panel as anchor, bare window opposite
 Curtains: single very dark indigo or charcoal panel — asymmetric, dramatic
 Objects: dark stoneware casting strong shadows, single candle
 Light: hard single-source side-light creating dramatic chiaroscuro shadows on plaster wall
 Mood: Japanese ink painting contrast, pure graphic beauty

COMBO 12 — DUSK MAUVE
 Wall 60%: muted dusty mauve grey-purple (#8a7a8e) — unexpected, sophisticated
 Furniture 30%: warm medium walnut — warm/cool tension
 Dark anchor 10%: deep forest green throw, near-black ceramic vessel
 Curtains: deep forest green heavy linen — strong contrast against mauve
 Objects: pale cream ceramics, natural rattan, warm amber candle glow
 Light: golden dusk 3200K — warm light making the mauve wall shift warmer
 Mood: quiet sophistication, twilight Japan

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROTATION BANKS — use a DIFFERENT one per section, no repeats:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WOOD SPECIES: pale birch | dark wenge | weathered driftwood | blackened oak | medium walnut | bamboo | reclaimed pine | dark mahogany | ash | teak | ebony | cedar

CAMERA BODIES: Sony A7R V | Hasselblad X2D 100C | Nikon Z9 | Fujifilm GFX 100S | Phase One IQ4 | Leica SL3

LENSES: 24mm f/1.4 prime | 35mm f/1.4 prime | 50mm f/1.2 standard | 85mm f/1.8 portrait | 100mm f/2.8 macro | 28mm f/2 wide | 40mm f/2 compact prime

CAMERA ANGLES: floor-level 25cm looking up | eye-level 95cm straight | low angle 50cm | overhead flat lay | three-quarter 115cm | doorway frame shot | high angle 160cm looking down | seated level 65cm

TIME OF DAY: 6am blue dawn | 8am early morning | 10am mid-morning | 12pm bright midday | 3pm strong afternoon | 5pm golden hour | 6:30pm blue dusk | 8pm evening lamp | 10pm candlelight

COMPOSITIONS: rule of thirds (subject left 1/3) | golden spiral | centred symmetry | negative space dominant right 2/3 | leading lines from window | foreground bokeh with sharp background | strong diagonal | single subject minimal centred | frame within frame (doorway or arch)

SCENE TYPES: tight macro close-up | full room wide establishing shot | corner vignette | window seat or sill | floor-level looking up | doorway frame | overhead flat lay | styled shelf | bedside table | morning routine scene | workspace surface | hallway or entryway

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK — write one prompt per section heading
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assign: COMBO → wood → camera → lens → angle → time → composition → scene (all different per section)

Each prompt uses this structure — all elements comma-separated:

[OBJECTS from article section content — specific materials and items]
[WALL COLOUR from assigned Combo — include the shade and tone]
[FURNITURE from Combo — wood species and style]
[CURTAINS from Combo — fabric, colour, and how they contrast the wall]
[DARK ANCHOR from Combo — name the specific dark element]
[SCENE TYPE from rotation bank]
[LIGHTING SOURCE + direction]
[COLOUR TEMPERATURE — specific Kelvin value matching the Combo mood]
[TIME OF DAY from rotation]
[CAMERA BODY from rotation]
[LENS from rotation]
[APERTURE + ISO]
[CAMERA ANGLE + HEIGHT from rotation]
[COMPOSITION from rotation]
[MOOD — one vivid phrase matching the Combo]
hyper-realistic RAW photograph, Kinfolk magazine editorial quality, 8K resolution, photorealistic, no CGI, no artificial rendering, no illustration

ABSOLUTE RULES — if any rule is broken the output is wrong:
✗ NEVER use the same wall colour combo twice in one article
✗ NEVER use the same wood species twice
✗ NEVER use the same time of day twice
✗ NEVER use the same camera angle twice
✗ NEVER use the same lens twice
✗ NEVER use the same scene type twice
✓ Objects in EVERY prompt must come from that specific article section's content
✓ Every image must feel like a completely different world — different colour, different light, different mood

JAPANDI PRINCIPLES — always present:
- Natural materials only: linen, clay, stone, rattan, wool, cotton, ceramic, glass, washi paper, aged leather
- Wabi-sabi beauty: visible wood grain, handmade asymmetry, organic texture, natural patina, imperfect glaze
- Intentional negative space — not every surface is filled, emptiness is designed
- No chrome, no glossy plastic, no bright primary colours, no fresh flowers, no branded items
- Contrast is QUIET — the tension between light and dark, warm and cool, rough and smooth

${includePins ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PINTEREST PIN PROMPTS — exactly 3 pins — each uses a different Combo:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PIN 1 — 4-PANEL COLLAGE (portrait 2:3, 1000×1500px): Four equal panels in a 2×2 grid separated by 3px white dividers. Each panel uses a DIFFERENT Combo — four completely different colour worlds of ${roomType}. Apply all prompt elements. End with: "2×2 collage grid, 3px white dividers, four distinct Japandi colour worlds, editorial Pinterest pin, portrait 2:3 format, hyper-realistic composite"

PIN 2 — HERO + 2 DETAIL PANELS (portrait 2:3, 1000×1500px): Large hero panel fills top 60% — full ${roomType} wide scene. Two square panels side by side fill bottom 40% — close-up details. Use a dramatic Combo (1, 3, 8, or 11) for max impact. 3px white dividers. End with: "three-panel Pinterest layout, large hero top, two detail panels bottom, 3px dividers, portrait 2:3, editorial photography"

PIN 3 — FULL SCENE WITH TEXT SPACE (portrait 2:3, 1000×1500px): Complete ${roomType} scene. Bottom 25–30% is intentionally calm and uncluttered (bare floor, plain wall, soft bokeh) for text overlay. Use a bold Combo with strong wall colour. End with: "full scene portrait, clean minimal bottom 25% for text overlay, portrait 2:3, hyper-realistic Kinfolk editorial"
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEATURED HERO IMAGE — 1200×800px landscape
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pick the most dramatic Combo available (prefer 2, 3, 6, 8, or 11). Wide full-room shot of ${roomType}. Strong directional dramatic lighting — not flat. Show wall colour, curtains AND furniture all visible. Immediately arresting, magazine cover quality.
End with: "1200×800px landscape hero, wide editorial shot, Kinfolk cover quality, hyper-realistic RAW photograph, 8K, photorealistic"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION HEADINGS:
${headings.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}

Return ONLY valid JSON:
{
  "featuredPrompt": "...",
  "sectionPrompts": ["...", "..."],
  "pinPrompts": [
    { "layout": "collage4", "textPosition": "center", "prompt": "..." },
    { "layout": "hero3panel", "textPosition": "center", "prompt": "..." },
    { "layout": "complete", "textPosition": "bottom", "prompt": "..." }
  ]
}
${!includePins ? '(omit pinPrompts from JSON)' : ''}`;

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
