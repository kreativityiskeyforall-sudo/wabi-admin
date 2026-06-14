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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE JAPANDI 60-30-10 COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every image MUST apply all 3 contrast types simultaneously:
  1. LIGHT vs DARK — pale wall always gets a dark anchor (furniture legs, frames, curtain panel)
  2. WARM vs COOL — never use only warm OR only cool tones. Always mix at least one of each.
  3. MATTE vs TEXTURE — smooth plaster wall + rough rattan or woven linen + polished wood grain

The subject (vase, tray, lamp, etc.) is the HERO of the image. The wall colour, curtains, and furniture are the STAGE that makes the hero pop. Every element of the stage must contrast with the hero object so it stands out clearly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12 COLOUR COMBOS — assign ONE per section, NO REPEATS
Format: Wall (60%) · Furniture (30%) · Curtains · Dark anchor (10%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMBO A — CLASSIC WARM
  Wall 60%:      Linen sand #EDE5D4 — warm beige plaster, the most classic Japandi wall
  Furniture 30%: Walnut mid #9C7A52 — deeper warm wood, one step richer than wall
  Curtains:      Stone grey #B8B4A8 — mid-weight linen, slightly cooler than wall (warm/cool contrast)
  Dark anchor:   Sumi charcoal #3C3A36 — ceramic vessels, picture frames, lamp base
  Light:         Warm 3400K golden afternoon directional from left
  Mood:          Warm and intimate, quietly classic

COMBO B — SAGE & OAK
  Wall 60%:      Pale moss #D0D5BF — barely-there cool sage green, restful
  Furniture 30%: Ash blonde oak #E8D5B4 — light warm Scandi oak, warmer than wall (warm/cool)
  Curtains:      Natural linen sheer #F5EFE6 — pale warm, diffusing light softly
  Dark anchor:   Matte black frames #2C2C2A — window frames, art frames, lamp stems
  Light:         Cool 5500K overcast morning, even and diffused
  Mood:          Clean and airy, cool and meditative

COMBO C — NEUTRAL LUXURY
  Wall 60%:      Warm rice #F7F2EA — softest warm base, visible plaster grain texture
  Furniture 30%: Dark walnut #6B4E35 — deep grounding tone (maximum light/dark contrast)
  Curtains:      Sage linen #A8B0A0 — muted cool green, contrasts the warm wall (warm/cool)
  Dark anchor:   Ink black trim and ceramic #252320
  Light:         Soft 4000K neutral morning, gentle raking shadows
  Mood:          Quiet luxury, serene and grounded

COMBO D — COOL & WARM BALANCE
  Wall 60%:      Slate mist #A0AABA — dusty blue-grey, calm and mineral
  Furniture 30%: Honey oak #C8A876 — warm golden oak against cool wall (warm/cool tension)
  Curtains:      Natural linen sheer #F5EFE6 — pale warm, glowing against cool slate wall
  Dark anchor:   Sumi dark ceramic or trim #3A3830
  Light:         Warm 3800K evening lamp creating warm glow against cool-toned wall
  Mood:          Cool wall, warm objects — the quiet tension that defines Japandi

COMBO E — DARK & LIGHT DRAMA
  Wall 60%:      Sumi charcoal #3C3A36 — deep warm charcoal, slightly brown-toned, not cold
  Furniture 30%: Ash blonde #E8D5B4 — very pale warm wood, maximum contrast against dark wall
  Curtains:      Sand sheer #D8CFC2 — pale warm linen, glowing like light against charcoal
  Dark anchor:   Wall itself is the anchor — add ink black frames #252320
  Light:         Single warm 2700K lamp, chiaroscuro — pooled light against dark wall
  Mood:          Cinematic drama, intimate night ritual, high-contrast editorial

COMBO F — NATURE IMMERSED
  Wall 60%:      Forest haze #768C6A — deep meditative green, Japanese moss and cedar
  Furniture 30%: Dark walnut #6B4E35 — warm deep wood grounds the cool green
  Curtains:      Cream linen #F0EAE0 — pale warm, glowing against deep green wall
  Dark anchor:   Matte black ceramics or pine shadow accent #566856
  Light:         Golden 3500K afternoon, warm pools through cream curtains onto green wall
  Mood:          Nature immersed, forest cabin, warm and deeply calm

COMBO G — CLAY & COOL CONTRAST
  Wall 60%:      Terracotta mist #B8926A — muted warm clay, not bright — subtle earth tone
  Furniture 30%: Dark walnut #6B4E35 — deep grounding against warm clay wall
  Curtains:      Dark slate #4C5050 — heavy cool-toned curtain, strong contrast against warm clay
  Dark anchor:   Sumi dark curtain #3A3830 + matte black ceramic vessel
  Light:         Strong directional 4500K, long afternoon shadows across clay wall
  Mood:          Earthy and ancient, warm wall cool frame

COMBO H — GRAPHITE & WARMTH
  Wall 60%:      Graphite #5C5A56 — warm charcoal, not cold grey — slightly brown undertone
  Furniture 30%: Ash blonde #E8D5B4 — very pale warm wood, glowing against dark wall
  Curtains:      Mist white #DCDFD8 — slightly cool pale, contrast against warm graphite wall
  Dark anchor:   Ink black frames #252320 on windows and mirrors
  Light:         Cool 6000K overcast daylight, pale curtains glowing against dark wall
  Mood:          Dark warmth, bold and sophisticated

COMBO I — BAMBOO DUST & TEAL ACCENT
  Wall 60%:      Bamboo dust #D8C4A8 — warm tan, echoes natural bamboo and wood tones
  Furniture 30%: Walnut mid #9C7A52 — deeper warm wood, same family as wall
  Curtains:      Dusty teal #8C9898 — muted cool teal, the unexpected cool accent in warm room
  Dark anchor:   Matte black #2C2C2A frames and slim lamp
  Light:         Warm 3600K mid-afternoon, teal curtain casting subtle cool tint in shadow
  Mood:          Warm room, cool accent surprise — bamboo warmth with mineral edge

COMBO J — STONE BLUE BEDROOM
  Wall 60%:      Stone blue #6D7E8E — serene, perfect for bedrooms, mineral calm
  Furniture 30%: Honey oak #C8A876 — warm golden oak against cool blue wall (warm/cool)
  Curtains:      Warm ivory #EAE2D5 — pale warm panel, creating warmth against cool wall
  Dark anchor:   Deep ocean accent trim #4A5C6A + dark stoneware ceramics
  Light:         Soft 4200K morning, cool wall lit warmly by ivory curtains
  Mood:          Bedroom serenity, cool and restful with warm wood anchoring

COMBO K — CLAY VESSEL & SAGE CURTAIN
  Wall 60%:      Clay vessel #C9A882 — muted warm terracotta-beige, rich earth
  Furniture 30%: Charcoal slate lacquered sideboard #4A4845 — dark cool furniture against warm wall
  Curtains:      Sage linen #A8B0A0 — muted cool green, contrasting warm clay wall
  Dark anchor:   Matte black frames #2C2C2A + charcoal slate furniture together
  Light:         Neutral 4500K, clean and even, showing wall colour clearly
  Mood:          Warm earth meets cool mineral — a rich earthy Japandi balance

COMBO L — MORNING FOG & DARK WARMTH
  Wall 60%:      Morning fog #D2D6DC — cool airy pale grey-blue, Scandi-Japanese light
  Furniture 30%: Dark walnut #6B4E35 — warm deep wood against cool pale wall (warm/cool)
  Curtains:      Warm charcoal #6A6660 — heavy dark warm curtain, dramatic contrast
  Dark anchor:   Warm charcoal curtains + dark walnut furniture as paired anchors
  Light:         Warm 2900K lamp, glowing gold against cool pale wall
  Mood:          Cool and pale room made intimate by warm dark anchors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROTATION BANKS — assign a DIFFERENT one per section, NO REPEATS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CAMERAS:      Sony A7R V | Hasselblad X2D 100C | Nikon Z9 | Fujifilm GFX 100S | Phase One IQ4 | Leica SL3
LENSES:       24mm f/1.4 | 35mm f/1.4 | 50mm f/1.2 | 85mm f/1.8 | 100mm f/2.8 macro | 28mm f/2 | 40mm f/2
ANGLES:       floor-level 25cm looking up | eye-level 95cm | low angle 50cm | overhead flat lay | three-quarter 115cm | doorway frame shot | high angle 160cm looking down | seated level 65cm
TIMES:        6am blue dawn | 8am early morning | 10am mid-morning | 12pm bright midday | 3pm strong afternoon | 5pm golden hour | 6:30pm blue dusk | 8pm evening lamp | 10pm candlelight
COMPOSITIONS: rule of thirds subject left | golden spiral | centred symmetry | negative space dominant right | leading lines from window | foreground bokeh with sharp background | strong diagonal | minimal single subject centred | frame within frame
SCENE TYPES:  tight macro close-up of subject | full room wide establishing shot | corner vignette | window seat or sill | floor-level looking up | doorway frame | overhead flat lay | styled shelf | bedside table | morning routine | workspace surface | hallway entrance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULES — NEVER BREAK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ Never match wall + furniture + curtains in the same tone — no contrast = unfinished, flat image
✗ Never use bright or saturated colours — all tones are muted, earthy, mineral
✗ Never use gloss finishes — everything is matte, raw, natural
✗ Never mix more than one wood family per image — pick one and stay consistent
✗ Never use patterns — Japandi contrast is solid tones only, never print or stripe
✗ Never use fresh flowers (dried botanicals only), chrome, glossy plastic, or branded items
✗ Never repeat a Combo, camera, lens, angle, time of day, or scene type within the same article
✓ The article section's SUBJECT OBJECT is the hero — wall, curtains, furniture are the contrasting stage
✓ All 3 contrast types (light/dark + warm/cool + matte/texture) must be visible in every image
✓ Objects must come from the specific article section content — read it carefully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT STRUCTURE — write ALL elements comma-separated for each section:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[HERO SUBJECT — specific object(s) from article section, exact material and finish]
[WALL — colour name, hex code, surface texture e.g. "linen sand plaster wall #EDE5D4, visible fine grain"]
[FURNITURE — wood or material, hex code, piece type e.g. "walnut mid dresser #9C7A52, matte grain visible"]
[CURTAINS — fabric weight, colour, hex, how they contrast e.g. "stone grey mid-weight linen curtains #B8B4A8, cooler tone against warm wall, partial light"]
[DARK ANCHOR — specific element, hex e.g. "sumi charcoal ceramic lamp base #3C3A36 as dark anchor"]
[SCENE TYPE from rotation]
[LIGHTING — source, direction, quality]
[COLOUR TEMPERATURE — Kelvin value]
[TIME OF DAY from rotation]
[CAMERA BODY from rotation]
[LENS from rotation]
[APERTURE + ISO]
[CAMERA ANGLE + HEIGHT from rotation]
[COMPOSITION from rotation]
[MOOD — one vivid phrase]
hyper-realistic RAW photograph, Kinfolk magazine editorial quality, 8K resolution, photorealistic, no CGI, no artificial rendering, no illustration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEATURED HERO IMAGE — 1200×800px landscape
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Choose the most visually powerful unused Combo (prefer E, F, D, or L for drama and contrast).
Wide full-room shot — wall colour, curtains, AND furniture all visible simultaneously.
Strong directional light — not flat even lighting. Scene must feel immediately arresting.
End with: "1200×800px landscape hero, wide editorial shot, Kinfolk cover quality, hyper-realistic RAW photograph, 8K, photorealistic"

${includePins ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PINTEREST PIN PROMPTS — exactly 3 pins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PIN 1 — 4-PANEL COLLAGE (1000×1500px portrait 2:3): Four equal panels in 2×2 grid, 3px white dividers. Each panel uses a DIFFERENT Combo — four completely different colour worlds of ${roomType}. End with: "2×2 collage grid, 3px white dividers, four distinct Japandi colour worlds, editorial Pinterest pin, portrait 2:3 format, hyper-realistic composite"

PIN 2 — HERO + 2 DETAIL PANELS (1000×1500px portrait 2:3): Large hero top 60% — full ${roomType} wide scene using a dramatic Combo (E, F, or L). Two square detail panels bottom 40%, 3px dividers. End with: "three-panel Pinterest layout, hero top 60%, two detail panels bottom 40%, 3px white dividers, portrait 2:3, editorial"

PIN 3 — FULL SCENE WITH TEXT SPACE (1000×1500px portrait 2:3): Complete ${roomType} scene. Bottom 25–30% intentionally uncluttered — bare floor, plain wall, or soft bokeh — for text overlay. Bold wall colour Combo. End with: "full scene portrait, clean minimal bottom 25% for text overlay, portrait 2:3, hyper-realistic Kinfolk editorial"
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
