import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Category display names ─────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  // new style slugs
  japandi: 'Japandi interior',
  coastal: 'Coastal interior',
  'modern-farmhouse': 'Modern Farmhouse interior',
  boho: 'Bohemian interior',
  scandinavian: 'Scandinavian interior',
  cottagecore: 'Cottagecore interior',
  'mid-century-modern': 'Mid-Century Modern interior',
  general: 'home interior',
  garden: 'outdoor/garden space',
  'global-styles': 'Mexican Hacienda interior',
  seasonal: 'seasonal home interior',
  guides: 'home interior',
  // legacy room slugs (kept for backwards compat)
  bedroom: 'Japandi bedroom',
  'living-room': 'Japandi living room',
  bathroom: 'Japandi bathroom',
  kitchen: 'Japandi kitchen',
  entryway: 'Japandi entryway',
  'home-office': 'Japandi home office',
  style: 'Japandi interior',
  'gift-guides': 'Japandi interior',
};

// ── Per-category colour combo systems ────────────────────────────────────────
const COLOUR_SYSTEMS: Record<string, string> = {

  // ─────────────────────────────────────────────────────────────────────────
  japandi: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE JAPANDI 60-30-10 COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every image MUST apply all 3 contrast types simultaneously:
  1. LIGHT vs DARK — pale wall always gets a dark anchor (furniture legs, frames, curtain panel)
  2. WARM vs COOL — never use only warm OR only cool tones. Always mix at least one of each.
  3. MATTE vs TEXTURE — smooth plaster wall + rough rattan or woven linen + polished wood grain

12 COLOUR COMBOS — assign ONE per section, NO REPEATS
Format: Wall (60%) · Furniture (30%) · Curtains · Dark anchor (10%)

COMBO A — CLASSIC WARM
  Wall: Linen sand #EDE5D4 — warm beige plaster
  Furniture: Walnut mid #9C7A52 — deeper warm wood
  Curtains: Stone grey #B8B4A8 — slightly cooler than wall
  Dark anchor: Sumi charcoal #3C3A36 — ceramic vessels, lamp base
  Light: Warm 3400K golden afternoon directional from left
  Mood: Warm and intimate, quietly classic

COMBO B — SAGE & OAK
  Wall: Pale moss #D0D5BF — barely-there cool sage green
  Furniture: Ash blonde oak #E8D5B4 — light warm Scandi oak
  Curtains: Natural linen sheer #F5EFE6 — pale warm, diffusing light
  Dark anchor: Matte black frames #2C2C2A
  Light: Cool 5500K overcast morning, even and diffused
  Mood: Clean and airy, cool and meditative

COMBO C — NEUTRAL LUXURY
  Wall: Warm rice #F7F2EA — softest warm base, visible plaster grain
  Furniture: Dark walnut #6B4E35 — deep grounding tone
  Curtains: Sage linen #A8B0A0 — muted cool green
  Dark anchor: Ink black trim and ceramic #252320
  Light: Soft 4000K neutral morning, gentle raking shadows
  Mood: Quiet luxury, serene and grounded

COMBO D — COOL & WARM BALANCE
  Wall: Slate mist #A0AABA — dusty blue-grey, calm and mineral
  Furniture: Honey oak #C8A876 — warm golden oak against cool wall
  Curtains: Natural linen sheer #F5EFE6 — pale warm, glowing
  Dark anchor: Sumi dark ceramic #3A3830
  Light: Warm 3800K evening lamp against cool-toned wall
  Mood: Cool wall, warm objects — the quiet tension that defines Japandi

COMBO E — DARK & LIGHT DRAMA
  Wall: Sumi charcoal #3C3A36 — deep warm charcoal, NOT black, minimum 15% luminosity
  Furniture: Ash blonde #E8D5B4 — very pale warm wood, maximum contrast
  Curtains: Sand sheer #D8CFC2 — pale warm linen, glowing
  Dark anchor: Ink black frames #252320
  Light: Single warm 2700K lamp, chiaroscuro — pooled amber light, room fully legible
  Mood: Cinematic drama, intimate night ritual

COMBO F — NATURE IMMERSED
  Wall: Forest haze #768C6A — deep meditative green, Japanese moss
  Furniture: Dark walnut #6B4E35 — warm deep wood grounds the cool green
  Curtains: Cream linen #F0EAE0 — pale warm, glowing against deep green wall
  Dark anchor: Matte black ceramics #566856
  Light: Golden 3500K afternoon, warm pools through cream curtains
  Mood: Nature immersed, forest cabin, warm and deeply calm

COMBO G — CLAY & COOL CONTRAST
  Wall: Terracotta mist #B8926A — muted warm clay, subtle earth tone
  Furniture: Dark walnut #6B4E35
  Curtains: Dark slate #4C5050 — heavy cool-toned curtain
  Dark anchor: Sumi dark curtain #3A3830 + matte black ceramic
  Light: Strong directional 4500K, long afternoon shadows
  Mood: Earthy and ancient, warm wall cool frame

COMBO H — GRAPHITE & WARMTH
  Wall: Graphite #5C5A56 — warm charcoal, minimum 20% luminosity
  Furniture: Ash blonde #E8D5B4 — pale warm wood, glowing
  Curtains: Mist white #DCDFD8 — slightly cool pale
  Dark anchor: Ink black frames #252320
  Light: Cool 6000K overcast daylight, pale curtains glowing against graphite
  Mood: Dark warmth, bold and sophisticated

COMBO I — BAMBOO DUST & TEAL ACCENT
  Wall: Bamboo dust #D8C4A8 — warm tan
  Furniture: Walnut mid #9C7A52
  Curtains: Dusty teal #8C9898 — muted cool teal accent in warm room
  Dark anchor: Matte black frames #2C2C2A
  Light: Warm 3600K mid-afternoon
  Mood: Warm room, cool accent surprise

COMBO J — STONE BLUE BEDROOM
  Wall: Stone blue #6D7E8E — serene, mineral calm
  Furniture: Honey oak #C8A876 — warm golden oak against cool blue
  Curtains: Warm ivory #EAE2D5 — pale warm panel
  Dark anchor: Deep ocean trim #4A5C6A + dark stoneware
  Light: Soft 4200K morning
  Mood: Bedroom serenity, cool and restful

COMBO K — CLAY VESSEL & SAGE CURTAIN
  Wall: Clay vessel #C9A882 — muted warm terracotta-beige
  Furniture: Charcoal slate sideboard #4A4845 — dark cool furniture
  Curtains: Sage linen #A8B0A0 — muted cool green
  Dark anchor: Matte black frames #2C2C2A + charcoal furniture
  Light: Neutral 4500K, clean and even
  Mood: Warm earth meets cool mineral

COMBO L — MORNING FOG & DARK WARMTH
  Wall: Morning fog #D2D6DC — cool airy pale grey-blue
  Furniture: Dark walnut #6B4E35 — warm deep wood against cool wall
  Curtains: Warm charcoal #6A6660 — heavy dark warm curtain
  Dark anchor: Warm charcoal curtains + dark walnut as paired anchors
  Light: Warm 2900K lamp, glowing gold against cool pale wall
  Mood: Cool and pale room made intimate by warm dark anchors

ABSOLUTE RULES:
✗ Never match wall + furniture + curtains in the same tone
✗ Never use bright or saturated colours — all tones muted, earthy, mineral
✗ Never use gloss finishes — everything matte, raw, natural
✗ Never mix more than one wood family per image
✗ Never use patterns — solid tones only
✗ Never use fresh flowers, chrome, glossy plastic, or branded items
✗ Dark walls (E, G, H, L) must show wall colour clearly — minimum 15% luminosity, never pitch black
✓ All 3 contrast types (light/dark + warm/cool + matte/texture) visible in every image
`,

  // ─────────────────────────────────────────────────────────────────────────
  coastal: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE COASTAL 60-30-10 COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Coastal palette draws from ocean, sand, bleached wood, sea glass, and linen.
Key contrast: warm sandy tones vs cool ocean blues. Natural light is always generous.

12 COLOUR COMBOS — assign ONE per section, NO REPEATS

COMBO A — CLASSIC WHITE COASTAL
  Wall: Whitewashed plank #F4F1EB — warm white with visible wood grain texture
  Furniture: Driftwood grey #B0A898 — bleached wood, sun-faded
  Curtains: Sheer white linen #FAF8F4 — billowing, backlit
  Dark anchor: Woven rattan dark #6B5B45 — basket weave, deep shadow
  Light: Bright 6500K coastal noon, diffused through sheer curtains
  Mood: Airy, sun-bleached, salt air Sunday morning

COMBO B — SEA GLASS BLUE
  Wall: Sea glass #8BB8B0 — muted teal-green, like worn glass on the shore
  Furniture: Whitewashed oak #EDE8DF — pale bleached wood, warm
  Curtains: Natural linen #D8CFBF — warm sand tone, contrasts cool wall
  Dark anchor: Deep ocean trim #3A6E6A — window frames, dark stripe
  Light: Soft 5000K morning, even coastal light
  Mood: Cool and refreshing, sea and salt breeze

COMBO C — SANDY NEUTRAL
  Wall: Warm sand #E0D5C0 — sun-warmed beach sand
  Furniture: Natural rattan #C4A878 — warm honey woven
  Curtains: Pale blue sheer #C8DCE8 — cool sky-blue, contrasts warm sand
  Dark anchor: Driftwood dark #5C4E3C — baskets, frames, table legs
  Light: Warm 4000K afternoon sun, long shadows
  Mood: Relaxed, barefoot, warm sand under feet

COMBO D — COASTAL GRANDMA BLUE
  Wall: Faded colonial blue #8BA4B8 — aged, slightly chalky
  Furniture: Aged cream #EDE4D4 — vintage painted furniture, warmly off-white
  Curtains: Ecru cotton #E8DBC8 — warm natural, aged look
  Dark anchor: Navy trim #2C4460 — window frames, painted legs
  Light: Warm 3800K afternoon, gentle and nostalgic
  Mood: Inherited, collected, grandmother's beach house warmth

COMBO E — DEEP OCEAN DRAMA
  Wall: Deep ocean #2E5266 — rich dark navy-teal, minimum 15% luminosity
  Furniture: Whitewashed pine #EDE8DF — pale wood, maximum contrast against dark wall
  Curtains: White linen sheer #F8F5F0 — glowing pale against dark wall
  Dark anchor: Navy-black trim #1C3A4A
  Light: Single warm lamp 2800K, creating glow against dark wall, fully legible
  Mood: Dramatic coastal night, warm lamplight in a dark harbour room

COMBO F — WARM CALIFORNIAN
  Wall: Warm ivory #F2EDE0 — California warm white, terracotta undertone
  Furniture: Natural oak #C8A87A — warm honey oak, California casual
  Curtains: Terracotta linen #C4886A — warm earthy contrast against cool ivory
  Dark anchor: Dark wicker #5C4030 — baskets and frames
  Light: Golden 3200K late afternoon California sun
  Mood: Warm, laid-back California coast

COMBO G — PINK COASTAL
  Wall: Blush sand #EDD5C4 — warm coral-tinged sand
  Furniture: Natural rattan #C4A878 — warm honey woven
  Curtains: Dusty rose linen #D4A898 — deeper warm pink, tonal
  Dark anchor: Driftwood dark #6B4A38 — strong contrast
  Light: Warm 3600K golden hour, soft glow
  Mood: Pink coastal warmth, terracotta and blush harmony

COMBO H — COASTAL GREY LINEN
  Wall: Coastal grey #B8BEC4 — cool pale grey, ocean morning mist
  Furniture: Natural whitewashed oak #EDE8DF — warm wood against cool wall
  Curtains: White cotton #F8F5F0 — crisp white, maximum brightness
  Dark anchor: Charcoal wicker #4A4A4A — dark baskets and frames
  Light: Cool 5500K overcast coastal morning
  Mood: Clean, quiet, overcast coastal Sunday

COMBO I — DUCK EGG & WARM WOOD
  Wall: Duck egg #A8C4C0 — soft blue-green, gentle and cool
  Furniture: Warm pine #D4A870 — warm honey pine against cool wall
  Curtains: Natural jute #C8B898 — warm sandy, slight rough texture
  Dark anchor: Dark teal trim #2A6260 + dark rattan
  Light: Warm 4000K morning, cool wall lit warmly
  Mood: Soft and serene, cool and warm in perfect balance

COMBO J — COASTAL COWGIRL
  Wall: Bleached denim #8A9AAC — faded denim blue-grey
  Furniture: Weathered blonde wood #DCCA98 — pale sun-bleached timber
  Curtains: Warm cream canvas #EAE0CC — sturdy, sun-faded
  Dark anchor: Suede dark brown #6B4830 — leather and suede accents
  Light: Strong directional 5000K, sun from one side, long shadows
  Mood: Western coast, bleached and worn, sun and wind

COMBO K — CORAL REEF SUNSET
  Wall: Warm white plaster #F5EFE6 — clean warm base
  Furniture: Coral-tinted rattan #C8906A — warm orange-pink woven
  Curtains: Deep sea teal #4A8080 — rich cool contrast against warm wall
  Dark anchor: Deep teal trim #2C5C5C
  Light: Warm 3400K sunset, golden glow through teal curtains
  Mood: Sunset on the reef, warm coral against cool sea

COMBO L — MIDNIGHT COASTAL
  Wall: Midnight navy #1E3A4C — deep coastal night, minimum 15% luminosity
  Furniture: Bleached white oak #F0EBE0 — pale, glowing against dark wall
  Curtains: Sand sheer #E0D4BC — warm glowing against deep navy
  Dark anchor: Navy-black #162A38 — trim and frames
  Light: Warm 2600K candlelight, amber pools on navy wall, fully legible
  Mood: Coastal cottage at night, candlelit and intimate

ABSOLUTE RULES FOR COASTAL:
✗ No tropical/Hawaiian elements — no palm prints, no flamingos
✗ No nautical clichés — no anchors, no rope unless genuinely styled
✗ No all-white flat images — always have warm+cool contrast and a dark anchor
✗ Never use deep saturated royal blue — coastal blue is always muted, sandy, or sea-glass toned
✓ Natural light should feel generous — sun always has a role even in evening shots
✓ Texture contrast: smooth painted wall + rough rattan/wicker + soft linen
`,

  // ─────────────────────────────────────────────────────────────────────────
  'modern-farmhouse': `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE MODERN FARMHOUSE 60-30-10 COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Palette draws from: white/cream shiplap, warm wood tones, matte black iron, galvanized metal, warm grey.
Key contrast: crisp whites vs warm wood vs matte black hardware.

12 COLOUR COMBOS — assign ONE per section, NO REPEATS

COMBO A — CLASSIC WHITE & SHIPLAP
  Wall: Crisp shiplap white #F5F2EC — warm white with visible wood plank texture
  Furniture: Warm pine #D4A870 — honey-toned reclaimed wood
  Curtains: Linen drop cloth #D8CEB8 — natural drop cloth style
  Dark anchor: Matte black iron #2A2A28 — hardware, pipe legs, frames
  Light: Warm 3800K morning, strong directional from window
  Mood: Fresh farmhouse morning, crisp and warm

COMBO B — WARM GREY SHIPLAP
  Wall: Greige shiplap #C8C0B4 — warm grey with plank texture visible
  Furniture: Reclaimed oak #B8956A — weathered warm oak
  Curtains: Cream cotton #EDE5D4 — warm cream against grey wall
  Dark anchor: Matte black trim #252320 — window frames, rod, hooks
  Light: Soft 4200K neutral morning
  Mood: Cosy farmhouse grey, warm and weathered

COMBO C — CREAM & DARK WALNUT
  Wall: Warm cream #F2EAD8 — buttery cream, slightly rough plaster finish
  Furniture: Dark walnut stain #5C3D22 — rich dark wood, maximum contrast
  Curtains: Charcoal linen #6A6460 — dark curtain creates drama
  Dark anchor: Matte black iron #2A2A28
  Light: Warm 3400K afternoon, golden through dark linen curtains
  Mood: Warm cream and dark wood, rich contrast farmhouse

COMBO D — SAGE FARMHOUSE
  Wall: Sage green #94A888 — muted farmhouse sage, slightly dusty
  Furniture: Cream painted #EDE5D4 — painted furniture, warm cream
  Curtains: Natural linen #D4C8AC — warm neutral against cool sage
  Dark anchor: Dark iron hardware #2A2A28
  Light: Cool 5000K morning, even light
  Mood: Garden-to-home sage farmhouse freshness

COMBO E — BOARD & BATTEN DRAMA
  Wall: Charcoal board & batten #3C3A36 — dark panelled wall, minimum 15% luminosity
  Furniture: Light pine #E8D4A8 — pale pine, maximum contrast
  Curtains: White cotton drop cloth #F5F2EC — glowing pale against dark wall
  Dark anchor: Wall itself serves as anchor + matte black hardware
  Light: Warm 2800K lamp, well-exposed, wall colour clearly visible
  Mood: Bold dark panelling, dramatic farmhouse statement

COMBO F — WARM TERRACOTTA FARMHOUSE
  Wall: Warm white plaster #F4EFE6 — clean warm base
  Furniture: Reclaimed pine #C8966A — warm rustic pine
  Curtains: Terracotta linen #B87858 — earthy warm contrast
  Dark anchor: Dark iron #2A2A28 + terracotta curtain as warm anchor
  Light: Golden 3200K late afternoon
  Mood: Warm farmhouse kitchen feel, earthy and lived-in

COMBO G — NAVY ACCENT WALL
  Wall: Farmhouse navy #2A3E50 — muted blue-grey navy, minimum 15% luminosity
  Furniture: Warm white painted #F0EAE0 — painted wood, warm
  Curtains: Cream linen #E8DEC8 — warm pale, glowing against navy
  Dark anchor: Navy-black trim #1C2C38
  Light: Warm 3600K evening lamp, well-lit room, legible
  Mood: Navy accent wall, classic farmhouse sophistication

COMBO H — BARNDOMINIUM INDUSTRIAL
  Wall: Exposed steel grey #7A7C7C — corrugated metal or concrete grey
  Furniture: Reclaimed dark wood #4A3828 — thick, heavy, industrial plank
  Curtains: Natural canvas #D4C4A8 — sturdy raw canvas drop
  Dark anchor: Matte black steel #2A2A28 — industrial pipe and hardware
  Light: Cool 6000K warehouse daylight, industrial scale
  Mood: Steel and wood, industrial farmhouse barn conversion

COMBO I — WARM LAUNDRY CREAM
  Wall: Shaker cream #EDE0C8 — warm cream shaker panelling
  Furniture: Aged white #F0EBE0 — slightly aged painted furniture
  Curtains: Sage cotton check #8A9878 — gingham-influenced muted sage
  Dark anchor: Warm dark wood shelf #4A3020
  Light: Warm 3800K utility room light, practical warmth
  Mood: Warm farmhouse utility room, practical and charming

COMBO J — DUSTY BLUE FARMHOUSE
  Wall: Dusty farmhouse blue #8A9AAC — soft chalky blue
  Furniture: Warm cream painted #EDE5D4 — painted shaker furniture
  Curtains: Warm white cotton #F2EEE6 — crisp cotton, warm toned
  Dark anchor: Matte black hardware #2A2A28
  Light: Cool 5200K overcast morning, even soft light
  Mood: Southern farmhouse blue, quiet and classic

COMBO K — WARM AUTUMN FARMHOUSE
  Wall: Warm wheat #D4B888 — harvest wheat, warm golden plaster
  Furniture: Dark oak stain #4A3020 — rich deep oak
  Curtains: Burnt sienna linen #A05C3A — warm deep rust curtain
  Dark anchor: Dark oak + iron hardware #2A2A28
  Light: Warm 3000K harvest afternoon, amber glow
  Mood: Autumn harvest farmhouse, warm and abundant

COMBO L — MOONLIT FARMHOUSE
  Wall: Soft chalk white #F0EDE6 — pale moonlit white
  Furniture: Dark iron-black painted #2A2A28 — very dark iron-painted furniture
  Curtains: White linen sheer #FAF8F4 — glowing pale
  Dark anchor: Dark furniture itself serves as anchor
  Light: Soft 2600K candlelight, moonlit and intimate
  Mood: Farmhouse at night, candlelit and romantic

ABSOLUTE RULES FOR MODERN FARMHOUSE:
✗ No bright colours — farmhouse palette is always muted, chalky, or earthy
✗ No glossy finishes — always matte paint, matte hardware, raw wood
✗ No ornate or decorative elements — clean lines, functional forms
✗ Shiplap/board-and-batten texture must be visible on walls where featured
✓ Matte black hardware is often the dark anchor — pipes, handles, frames
✓ Wood must look reclaimed or weathered, never fresh-off-the-shelf
`,

  // ─────────────────────────────────────────────────────────────────────────
  boho: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE BOHO 60-30-10 COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Boho palette: terracotta, ochre, rust, deep burgundy, forest green, cream, warm brown.
Key contrast: warm earthy tones vs deep jewel accents. Texture IS the design.
Every image must show layering — rugs, textiles, plants, objects.

12 COLOUR COMBOS — assign ONE per section, NO REPEATS

COMBO A — TERRACOTTA SOUL
  Wall: Warm terracotta plaster #B8724A — sun-baked clay, visible plaster texture
  Furniture: Dark walnut #5C3D22 — rich deep wood, earthy anchor
  Curtains: Cream macramé panel #E8DCC8 — handmade texture, warm
  Dark anchor: Deep burnt sienna ceramic #7A3A20 — vessels and objects
  Light: Warm 3200K afternoon, long shadows across textured wall
  Mood: Warm Moroccan afternoon, earthy and sensory

COMBO B — OCHRE WARMTH
  Wall: Turmeric ochre #C49A3C — deep warm golden-yellow, muted
  Furniture: Dark wood #5C3D22 — heavy dark wood grounds the warm yellow
  Curtains: Rust linen #A0522A — warm rust, deeper tone against ochre
  Dark anchor: Matte black iron hooks #2A2A28 + dark ceramic
  Light: Warm 3000K dusk, amber glow on golden walls
  Mood: Golden hour lived-in boho warmth

COMBO C — SAGE BOHO
  Wall: Dusty sage plaster #8A9878 — muted sage green, textured
  Furniture: Natural rattan #C4A870 — warm honey wicker
  Curtains: Cream macramé #E8DCC8 — handmade warm panel
  Dark anchor: Deep forest green ceramic #3A5040
  Light: Cool 5200K morning, even green-tinted light
  Mood: Garden boho, botanical and earthy

COMBO D — RUST & CREAM
  Wall: Off-white plaster #F0E8D8 — warm bone white, rough texture
  Furniture: Rust-painted #9C4A28 — deep rust-painted chest or dresser
  Curtains: Cream cotton kantha #E4D8C0 — patchy warm kantha texture
  Dark anchor: Dark walnut frame #4A2E1A
  Light: Warm 3600K mid-afternoon, casting texture shadows
  Mood: Curated boho, collected and personal

COMBO E — DEEP BURGUNDY DRAMA
  Wall: Deep wine plaster #6A2C3A — rich burgundy-red plaster, minimum 15% luminosity
  Furniture: Aged brass and dark wood #8A6A30 — warm metallic wood combo
  Curtains: Cream embroidered sheer #EDE0C8 — pale warm, glowing
  Dark anchor: Dark wine trim #4A1C2A
  Light: Warm 2800K lamp, amber glow against rich burgundy wall, fully legible
  Mood: Rich boho night, jewel-toned and intimate

COMBO F — NATURAL BEIGE LAYERED
  Wall: Raw plaster #D8C8A8 — unfinished warm plaster texture
  Furniture: Natural macramé and rattan #C4A870 — layered natural textures
  Curtains: Batik linen #A08858 — warm earthy printed linen panel
  Dark anchor: Dark wicker trunk #5C4030
  Light: Golden 3400K afternoon, filtered through batik curtain
  Mood: Natural and collected, sun-drenched nomad home

COMBO G — FOREST BOHO
  Wall: Deep forest green #3A5A3A — jungle green plaster, minimum 15% luminosity
  Furniture: Warm wood and rattan #C4A870 — honey wood contrast against dark green
  Curtains: Warm cream cotton #EDE4CC — pale warm against deep green
  Dark anchor: Dark forest trim #2A3E28
  Light: Dappled 4000K light, soft patches through curtain
  Mood: Jungle hideaway, lush and layered

COMBO H — INDIGO & WARM EARTH
  Wall: Warm cream plaster #F0E8D4 — warm base for rich textile contrast
  Furniture: Dark walnut carved #5C3D22 — carved dark wood, artisan feel
  Curtains: Indigo block-print #2A3A68 — deep cool blue-indigo, dramatic contrast
  Dark anchor: Dark indigo curtain itself as anchor + dark carved wood
  Light: Cool 5000K morning through indigo curtain casting blue-tinted shadow
  Mood: Indian artisan, indigo and warm earth together

COMBO I — WARM CLAY & OLIVE
  Wall: Warm clay #C49878 — earthy mid-tone warm clay
  Furniture: Olive painted #6A7040 — muted olive painted piece
  Curtains: Natural undyed linen #D8C8A0 — raw natural warmth
  Dark anchor: Dark ceramic charcoal #3A3028
  Light: Warm 3800K mid-afternoon, earthy and warm
  Mood: Desert boho, warm clay and olive abundance

COMBO J — DEEP TEAL JEWEL
  Wall: Warm white plaster #F0E8D8 — neutral base for jewel accent
  Furniture: Deep teal painted #2A6868 — jewel-toned painted furniture
  Curtains: Terracotta embroidered #B87848 — warm earthy contrast to cool teal
  Dark anchor: Deep teal furniture as cool anchor + dark rattan
  Light: Warm 3400K afternoon, warm light against cool furniture
  Mood: Jewel and earth, curated wanderer boho

COMBO K — SUNSET RUST
  Wall: Salmon blush #D8907A — warm peachy-salmon plaster
  Furniture: Natural rattan #C4A870 — warm honey woven
  Curtains: Deep rust linen #A04A28 — dark rust panel, strong contrast
  Dark anchor: Dark rust curtain + dark carved wood #5C3020
  Light: Golden 3000K sunset, amber glow through rust curtains
  Mood: Warm sunset room, glowing and sensory

COMBO L — MIDNIGHT BOHO
  Wall: Midnight plum #3A2A40 — deep warm purple-black, minimum 15% luminosity
  Furniture: Brass and warm wood #8A6A30 — warm metallic-wood glow
  Curtains: Gold embroidered sheer #D4A830 — glowing gold against dark wall
  Dark anchor: Deep plum trim #28182E
  Light: Warm 2600K candle and lamp, amber glow on dark plum wall, fully legible
  Mood: Midnight souk, richly layered and jewel-deep

ABSOLUTE RULES FOR BOHO:
✗ Never show a sparse or empty room — boho must have visible layering
✗ No matching sets — mismatched is authentic
✗ No flat or uniform walls — plaster texture, mural, or layered textiles behind
✓ Always include at least one plant (trailing or large leafy)
✓ Textile layering: rug on rug, throw on throw, cushion stacks
✓ Objects tell a story of travel and collection — ceramics, baskets, weavings
`,

  // ─────────────────────────────────────────────────────────────────────────
  scandinavian: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE SCANDINAVIAN 60-30-10 COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Palette: whites, pale greys, birch blonde, navy, forest green, warm neutrals.
Key contrast: light walls vs pale wood vs single strong accent colour.
Light is the hero — every image must feel like it has generous, quality light.

12 COLOUR COMBOS — assign ONE per section, NO REPEATS

COMBO A — PURE NORDIC WHITE
  Wall: Nordic white #F5F3EE — barely warm white, smooth plaster
  Furniture: Birch blonde #E0CCА8 — pale warm birch wood
  Curtains: White cotton sheer #F8F6F2 — crisp white, letting light through
  Dark anchor: Charcoal grey ceramic #4A4844 — vessels and frames
  Light: Cool 6000K overcast Nordic morning, even and bright
  Mood: Pure Nordic light, calm and ordered

COMBO B — PALE GREY & BIRCH
  Wall: Pale warm grey #D8D4CC — warm light grey plaster
  Furniture: Pale birch #DCC898 — very light birch, warm tone
  Curtains: White linen #F4F0E8 — warm white, soft texture
  Dark anchor: Matte black frames #2C2C2A + slim candle sticks
  Light: Soft 5000K morning, diffused through white linen
  Mood: Soft and functional, gentle Nordic morning

COMBO C — NAVY ACCENT SCANDI
  Wall: Bright white #F8F5F0 — crisp clean white
  Furniture: Pale pine #E0CC9A — warm pale pine
  Curtains: Deep navy linen #2A3E60 — strong cool accent against white
  Dark anchor: Navy curtain as anchor + dark painted chair leg #2A3E60
  Light: Cool 5500K morning, navy curtain casting cool shadow
  Mood: Classic Swedish blue-and-white, clean and graphic

COMBO D — WARM GREY & SHEEPSKIN
  Wall: Warm stone grey #C0BAB0 — warm mid grey
  Furniture: Pale oak #D8C090 — light warm oak
  Curtains: Cream wool #E8E0D0 — heavy cream wool drape, textured
  Dark anchor: Dark charcoal ceramic #3A3830 + black candle holders
  Light: Warm 3400K candle and lamp, intimate evening hygge
  Mood: Winter hygge, warm candlelit grey interior

COMBO E — FOREST GREEN SCANDI
  Wall: Nordic forest green #4A6A50 — deep meditative forest green, minimum 15% luminosity
  Furniture: Birch blonde #E0CCA8 — pale birch, maximum contrast against dark green
  Curtains: White cotton #F5F2EE — clean white, glowing against forest green
  Dark anchor: Dark green trim #2A4030
  Light: Warm 3800K lamp, golden light on forest green wall, fully legible
  Mood: Nordic forest cabin, warm birch against deep green

COMBO F — TERRACOTTA SCANDI
  Wall: Pale off-white #F2EEE6 — clean warm base
  Furniture: Light oak #D8C090 — warm pale oak
  Curtains: Terracotta linen #B87848 — warm earthy Scandi accent
  Dark anchor: Dark oak frame #5C4030 + dark ceramic
  Light: Warm 3600K afternoon, earthy warmth through terracotta curtain
  Mood: Danish autumn warmth, terracotta and oak

COMBO G — GRAPHITE SCANDI
  Wall: Warm graphite #585450 — dark warm grey, minimum 20% luminosity
  Furniture: Pale birch #DCC898 — pale wood glowing against dark wall
  Curtains: Light grey sheer #D0CCC6 — slightly cool pale panel
  Dark anchor: Dark graphite wall as anchor + black frames #252320
  Light: Cool 6000K overcast, pale curtains glowing, room legible
  Mood: Dark Scandi sophistication, pale wood against graphite

COMBO H — DUSTY ROSE SCANDI
  Wall: Dusty rose #D4A8A0 — muted Scandinavian pink, not sweet
  Furniture: Pale grey-white painted #E8E4DE — painted pale furniture
  Curtains: Dark grey linen #7A7670 — cool contrast against warm rose
  Dark anchor: Dark grey curtain + charcoal ceramics #4A4844
  Light: Cool 5000K morning, muted and clean
  Mood: Copenhagen café pink, sophisticated and muted

COMBO I — OCHRE ACCENT SCANDI
  Wall: Pale warm grey #D0CCC4 — neutral grey base
  Furniture: Pale birch #DCC898 — light warm birch
  Curtains: Ochre wool #B89030 — warm golden accent, rich contrast
  Dark anchor: Dark brown frame #4A3820 + ochre curtain warmth
  Light: Warm 3800K afternoon, golden glow through ochre curtains
  Mood: Nordic gold, warm and graphic

COMBO J — PALE SAGE SCANDI
  Wall: Pale sage white #DDE4D8 — barely-there cool sage, almost white
  Furniture: Warm birch #D8BC88 — slightly deeper birch
  Curtains: White cotton #F5F2EE — clean white
  Dark anchor: Matte black #2C2C2A frames and candle holders
  Light: Cool 5500K morning, fresh and clean
  Mood: Spring Nordic, clean and botanical

COMBO K — NAVY & WARM WHITE NIGHT
  Wall: Deep navy #1E2E48 — rich Nordic night navy, minimum 15% luminosity
  Furniture: Warm white painted #F0EAE0 — pale warm, glowing
  Curtains: Cream heavy linen #E4D8C4 — warm pale against deep navy
  Dark anchor: Deep navy trim #16202E
  Light: Warm 2800K lamp, cosy pooled light against navy wall, fully legible
  Mood: Nordic winter night, candles against deep navy

COMBO L — BIRCH & CHARCOAL
  Wall: Warm white #F5F2EC — clean base
  Furniture: Dark charcoal painted #3A3830 — dark contrast furniture
  Curtains: Natural linen #D8CEBC — warm natural texture
  Dark anchor: Dark furniture itself + black frames #252320
  Light: Soft 4500K neutral, practical and calm
  Mood: Modern Nordic contrast, dark furniture against light walls

ABSOLUTE RULES FOR SCANDINAVIAN:
✗ No clutter — Scandi rooms are ordered and purposeful
✗ No patterns except one graphic element (cushion or rug only)
✓ Candles must appear in any evening or intimate shot
✓ Light always has a source — window, lamp, or candle visible or implied
✓ One plant minimum — pothos, monstera, or tall branch in a simple vase
✓ Pale wood (birch, pine, oak) is the warmth source in any cool palette
`,

  // ─────────────────────────────────────────────────────────────────────────
  cottagecore: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE COTTAGECORE 60-30-10 COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Palette: sage green, blush, cream, butter yellow, dusty rose, moss, duck egg, antique white.
Key contrast: soft romantic pastels vs aged patina. Natural light is warm and dappled.
Every image must have botanical or floral elements and signs of age/patina.

12 COLOUR COMBOS — assign ONE per section, NO REPEATS

COMBO A — SAGE COTTAGE
  Wall: Sage green #8A9E7A — dusty garden sage, matte
  Furniture: Aged cream painted #EDE0C4 — painted furniture, slightly worn
  Curtains: White cotton eyelet #F5F0E8 — broderie anglaise, romantic
  Dark anchor: Dark iron #3A3030 — iron bed frames, handles
  Light: Warm 3800K golden morning, dappled through cotton curtain
  Mood: English cottage morning, sage garden and warm light

COMBO B — BLUSH & CREAM
  Wall: Warm cream #F2E8D4 — buttery antique cream
  Furniture: Dusty rose painted #C49090 — muted rose-painted furniture
  Curtains: White linen with lace #F8F2E8 — lace-trimmed panel
  Dark anchor: Dark walnut aged wood #5C3A28 — antique dark frames
  Light: Soft 4000K diffused morning, feminine and gentle
  Mood: Romantic cottage bedroom, blush and cream

COMBO C — DUCK EGG COTTAGE
  Wall: Duck egg blue #8EB8B0 — vintage robin's egg, chalky
  Furniture: Aged white painted #F0EAE0 — distressed painted wood
  Curtains: Cream cotton #E8DCC8 — warm cream against cool duck egg
  Dark anchor: Dark ironwork #3A3030 + dark aged wood handles
  Light: Cool 5000K morning, chalky cool and refreshing
  Mood: Vintage English kitchen or bathroom, duck egg blue and cream

COMBO D — BUTTER YELLOW
  Wall: Butter yellow #E8D080 — warm soft yellow, sunlit plaster
  Furniture: Aged sage green painted #7A9068 — antique painted green
  Curtains: White cotton check #F0EAE0 — gingham-inspired, warm white
  Dark anchor: Dark wood #4A3020 + iron
  Light: Warm 3600K afternoon sun, golden through cotton curtain
  Mood: Sunlit cottage kitchen, butter and sage

COMBO E — DARK COTTAGE ROMANCE
  Wall: Dried rose #7A4858 — deep muted pink-plum, minimum 15% luminosity
  Furniture: Aged cream painted #EDE0C4 — pale, glowing against dark
  Curtains: Cream embroidered #E8DCC8 — warm pale against dark wall
  Dark anchor: Deep rose trim #4A2838
  Light: Warm 2800K lamp, glowing against dark rose wall, fully legible
  Mood: Dark romantic cottage, candlelit and intimate

COMBO F — MOSS & STONE
  Wall: Limestone #D8D0B8 — cool pale stone, rough texture
  Furniture: Moss green painted #6A8458 — deep muted mossy green
  Curtains: Natural linen #D8C8A0 — warm earthy contrast
  Dark anchor: Dark iron #2A2820 + moss green furniture
  Light: Cool 5000K overcast, stone cottage atmosphere
  Mood: Stone and moss, aged English country home

COMBO G — LAVENDER COTTAGE
  Wall: Dusty lavender #A898B8 — muted purple-grey
  Furniture: Aged white painted #F0EAE0 — pale contrast
  Curtains: White cotton eyelet #F5F0E8 — romantic eyelet
  Dark anchor: Dark walnut #5C3A28 + lavender-grey accents
  Light: Soft 4200K morning, cool and romantic
  Mood: Lavender field cottage, gentle and romantic

COMBO H — TERRACOTTA COTTAGE
  Wall: Warm white plaster #F2EAD8 — clean warm base
  Furniture: Terracotta red painted #A05840 — earthy terracotta
  Curtains: Sage green linen #8A9878 — cool contrast against warm terracotta
  Dark anchor: Dark terracotta pottery #6A3020
  Light: Warm 3400K afternoon
  Mood: Mediterranean cottage, terracotta and herb garden

COMBO I — PALE ROSE COTTAGE
  Wall: Pale rose #E8CCC4 — barely-pink antique rose
  Furniture: Aged cream white #EDE0C8 — antique white painted
  Curtains: Deep rose linen #B07878 — deeper rose, tonal layers
  Dark anchor: Dark iron #3A3030 + dried flower arrangements
  Light: Warm 3800K golden afternoon, rosy and warm
  Mood: Faded rose cottage, antique and romantic

COMBO J — HARVEST COTTAGE
  Wall: Warm stone #C8B898 — aged warm stone colour
  Furniture: Dark aged oak #4A3020 — heavy old oak furniture
  Curtains: Warm cream cotton #EAE0C8 — plain aged cotton
  Dark anchor: Dark oak + iron hardware #2A2A28
  Light: Warm 3200K harvest afternoon, amber glow
  Mood: Harvest time, stone and ancient oak

COMBO K — SPRING BLOSSOM
  Wall: Pale blossom #F0E0D4 — barely-pink white, spring morning
  Furniture: Pale sage painted #A8B898 — soft sage painted piece
  Curtains: White lace #F8F2EC — lace panel, delicate
  Dark anchor: Deep green stem #3A5030 + dark iron
  Light: Cool 5500K spring morning, fresh and light
  Mood: Spring cottage, blossom and fresh morning light

COMBO L — MIDNIGHT COTTAGE
  Wall: Dark cottage green #2A4030 — deep hedge green, minimum 15% luminosity
  Furniture: Aged cream #EDE0C4 — pale contrast against dark green
  Curtains: Cream floral cotton #E8DCC0 — warm pale with subtle pattern
  Dark anchor: Dark green trim #1A2C20
  Light: Warm 2700K lamp and candle, fully legible cottage night
  Mood: Cottage at night, lit from within, warm and secret

ABSOLUTE RULES FOR COTTAGECORE:
✓ Flowers and botanicals must be present — dried bunches, vases, botanical prints
✓ Furniture must look aged, painted, or inherited — never new-looking flat-pack
✓ Texture: embroidered textiles, lace, eyelet, floral cotton — at least one per image
✗ No modern minimalist elements — no handleless cabinetry, no concrete
✗ No bright saturated colours — everything is muted, dusty, faded
`,

  // ─────────────────────────────────────────────────────────────────────────
  'mid-century-modern': `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE MID-CENTURY MODERN 60-30-10 COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Palette: walnut brown, mustard yellow, burnt orange, olive green, teal, rust, warm white, cream.
Key contrast: warm neutrals vs bold accent colour. Furniture silhouette is the hero.
Every image must show signature MCM forms: tapered legs, organic shapes, arc lamps.

12 COLOUR COMBOS — assign ONE per section, NO REPEATS

COMBO A — WARM WALNUT CLASSIC
  Wall: Warm white #F5F2EC — clean warm base
  Furniture: Walnut mid-brown #8A6040 — rich warm walnut, tapered legs
  Curtains: Mustard wool #C8960A — warm golden yellow accent
  Dark anchor: Dark walnut frame #4A2E14 + matte iron lamp
  Light: Warm 3600K afternoon, directional arc lamp light
  Mood: 1960s living room at its best, warm and considered

COMBO B — OLIVE TEAK
  Wall: Warm cream #F0EAD8 — warm off-white
  Furniture: Teak mid-brown #9A7050 — warm teak grain
  Curtains: Olive linen #7A8850 — muted olive, earthy contrast
  Dark anchor: Dark teak legs #4A3020 + olive curtain
  Light: Cool 5000K morning, clean and ordered
  Mood: Danish design at home, teak and olive calm

COMBO C — BURNT ORANGE DRAMA
  Wall: Pale warm cream #F2EDE4 — neutral warm base
  Furniture: Walnut #8A6040 — warm walnut credenza or sofa
  Curtains: Burnt orange wool #B85A20 — strong warm accent, bold
  Dark anchor: Dark walnut #4A2E14 + iron lamp base
  Light: Warm 3200K late afternoon through orange curtain, amber glow
  Mood: Mad Men confidence, burnt orange drama

COMBO D — COOL TEAL & WARM WOOD
  Wall: Warm white #F5F2EC
  Furniture: Walnut #8A6040 — warm walnut against cool teal accent
  Curtains: Teal wool #2A7080 — cool jewel-toned accent, strong contrast
  Dark anchor: Deep teal #1A4C58 + dark walnut legs
  Light: Neutral 4500K, clean graphic MCM clarity
  Mood: Mad Men cool, the perfect warm-cool MCM tension

COMBO E — DARK WALNUT PANEL
  Wall: Walnut wood-panel dark #3C2A1A — dark warm panelled wall, minimum 15% luminosity
  Furniture: Cream upholstered #F0E8D8 — pale cream sofa/chair, maximum contrast
  Curtains: Warm cream heavy #E8DCC8 — pale glowing against dark panel
  Dark anchor: Dark walnut panel + iron lamp arm #2A1A0A
  Light: Warm 2800K arc lamp, well-exposed, fully legible room
  Mood: Mad Men study, dark panels and pale furniture drama

COMBO F — MUSTARD LIVING ROOM
  Wall: Warm white #F5F2EC
  Furniture: Mustard velvet sofa #C8960A — bold mustard statement
  Curtains: Warm ivory linen #EAE0CC — pale contrast to bold mustard
  Dark anchor: Dark walnut legs #4A2E14 + iron frame
  Light: Warm 3800K afternoon sun, golden warmth on mustard
  Mood: 1967 living room, mustard and walnut confidence

COMBO G — RUST & CREAM
  Wall: Warm cream #F2EDE4
  Furniture: Deep rust upholstered #9A3820 — dark rust-red statement piece
  Curtains: Cream wool heavy #E8DCC8 — warm pale neutral
  Dark anchor: Walnut dark legs #4A2E14 + rust upholstery as warm anchor
  Light: Warm 3400K directional, strong MCM shadow play
  Mood: Earthy and bold, 1958 Danish power

COMBO H — OLIVE PANEL WALL
  Wall: Olive green #5A6840 — deep muted olive panelling, minimum 15% luminosity
  Furniture: Warm cream painted or upholstered #F0E8D8 — maximum contrast
  Curtains: Warm ivory #EAE0CC — pale warm, glowing against olive
  Dark anchor: Dark olive trim #3A4428
  Light: Warm 3600K lamp, well-exposed olive panel, fully legible
  Mood: Mid-century study in olive, sophisticated and grounded

COMBO I — TERRAZZO & TEAK
  Wall: Warm white #F5F2EC
  Furniture: Teak #9A7050 — warm teak forms
  Curtains: Pale geometric grey linen #C0BEB4 — subtle graphic quality
  Dark anchor: Terrazzo floor (speckled grey-warm) + dark teak legs #4A3020
  Light: Cool 5500K open-plan morning, crisp MCM clarity
  Mood: 1962 open-plan at its cleanest

COMBO J — CHARCOAL & WALNUT
  Wall: Warm charcoal #4A4640 — warm dark grey, minimum 20% luminosity
  Furniture: Walnut #8A6040 — warm wood against dark wall
  Curtains: Cream heavy linen #EAE0CC — pale warm contrast
  Dark anchor: Charcoal wall + dark walnut as dual anchors
  Light: Cool 5500K overcast, pale curtains bright against charcoal
  Mood: Confident dark MCM, walnut glowing against charcoal

COMBO K — BUBBLEGUM PINK MCM (60s Pop)
  Wall: Soft blush white #F0E4DC — barely-pink warm white
  Furniture: Pink upholstered tulip-form #D09090 — pastel pink organic form
  Curtains: Deep plum linen #6A3858 — rich contrast against pale pink
  Dark anchor: Dark plum trim + walnut legs #4A2E14
  Light: Cool 5000K bright, 1960s pop art clarity
  Mood: 1965 pop interior, playful and confident

COMBO L — LATE NIGHT MCM
  Wall: Deep burgundy-brown #3C1E1A — rich deep dark warm tone, minimum 15% luminosity
  Furniture: Cream and walnut #F0E8D8 / #8A6040 — pale cream upholstery, walnut frame
  Curtains: Gold heavy drape #B89030 — warm gold, glowing against dark
  Dark anchor: Dark burgundy trim #2A1210
  Light: Warm 2700K whisky-bar lamp, amber glow fully legible
  Mood: After-midnight MCM lounge, amber and dark luxury

ABSOLUTE RULES FOR MID-CENTURY MODERN:
✓ Furniture silhouettes must show tapered legs, organic forms, or tulip/egg shapes
✗ No rustic or distressed finishes — MCM is always smooth, polished, purposeful
✗ No patterns on walls — graphic rugs or single cushion pattern only
✗ No chrome (that's a different era) — brushed brass, walnut, and matte iron only
✓ Arc lamp or globe pendant must appear in living room/bedroom shots
✓ Low-profile furniture — never tall heavy armoires or ornate pieces
`,

  // ─────────────────────────────────────────────────────────────────────────
  general: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE ROOM IDEAS 60-30-10 COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Room Ideas articles are keyword-driven (sage green bedroom, navy bedroom, moody bedroom etc.).
The ARTICLE KEYWORD determines the primary wall/dominant colour.
Style is aspirational but accessible — not a specific aesthetic, just beautiful rooms.

12 COLOUR COMBOS — one per keyword group, assign NO REPEATS

COMBO A — SAGE GREEN BEDROOM
  Wall: Sage green #8A9E7A — dusty grey-green, like dried herbs
  Furniture: Natural oak #C8A870 — warm contrast against cool sage
  Curtains: Cream linen #E8DCC8 — warm pale contrast
  Dark anchor: Dark oak frame #5C3A20 + dark ceramic lamp
  Light: Warm 4000K morning, beautiful against sage walls
  Mood: The most sought-after bedroom colour, calm and warm

COMBO B — NAVY BEDROOM
  Wall: Deep navy #1E2E50 — rich muted navy, minimum 15% luminosity
  Furniture: Warm white or cream #F0EAE0 — pale contrast against navy
  Curtains: Warm white cotton #F5F2EE — glowing against dark
  Dark anchor: Navy trim #14203A
  Light: Warm 2800K lamp, fully legible navy walls, amber glow
  Mood: Classic deep navy bedroom, rich and confident

COMBO C — BLUSH BEDROOM
  Wall: Warm blush #E8CCC0 — muted warm rose-pink
  Furniture: Natural oak #C8A870 — warm wood, sun-warmed tone
  Curtains: White cotton #F5F0E8 — clean crisp contrast
  Dark anchor: Dark walnut frame #5C3A20 + dark greenery
  Light: Warm 3800K afternoon, golden on blush
  Mood: Warm and feminine without being sweet

COMBO D — GREY BEDROOM
  Wall: Warm greige #C0BAB0 — warm grey, not cool blue-grey
  Furniture: Warm white painted #EDE8DC — painted warm white
  Curtains: Dark charcoal linen #4A4844 — strong contrast
  Dark anchor: Dark charcoal curtain + frames #3A3830
  Light: Cool 5000K neutral morning
  Mood: Warm grey, classic and timeless

COMBO E — TERRACOTTA BEDROOM
  Wall: Warm terracotta #C47A50 — muted warm clay terracotta
  Furniture: Dark walnut #5C3820 — deep grounding contrast
  Curtains: Cream linen #E8D8C0 — pale warm against terracotta
  Dark anchor: Dark walnut + dark iron #2A2820
  Light: Warm 3200K afternoon, golden terracotta glow
  Mood: Warm earthy bedroom, terracotta and walnut richness

COMBO F — GREEN BEDROOM
  Wall: Forest green #3A5A3A — deep rich green, minimum 15% luminosity
  Furniture: Natural warm oak #C8A870 — warm wood against deep green
  Curtains: White cotton #F5F2EE — glowing against dark green
  Dark anchor: Dark green trim #2A3E2A
  Light: Warm 3600K lamp, well-exposed green walls
  Mood: Bold forest bedroom, deep green and warm wood

COMBO G — MOODY DARK BEDROOM
  Wall: Charcoal #3C3A36 — warm dark charcoal, minimum 15% luminosity
  Furniture: Pale cream linen upholstered #EDE8DC — maximum contrast
  Curtains: Warm sand sheer #D8CFC2 — pale glowing panel
  Dark anchor: Ink black frames #252320
  Light: Single warm 2700K lamp, pooled amber, fully legible
  Mood: Moody atmospheric bedroom, cinematic and intimate

COMBO H — YELLOW BEDROOM
  Wall: Butter yellow #E8D070 — warm muted golden yellow
  Furniture: Dark walnut #5C3820 — rich contrast
  Curtains: Deep forest green #3A5030 — strong cool contrast against warm yellow
  Dark anchor: Dark walnut + deep green #2A3820
  Light: Warm 3400K afternoon, golden and sunny
  Mood: Bold statement yellow, warm and confident

COMBO I — BLUE BEDROOM
  Wall: Dusty blue #7090A8 — muted cool blue, serene
  Furniture: Warm cream #EDE8DC — warm contrast against cool blue
  Curtains: Warm sand linen #D4C4A0 — warm earthy contrast
  Dark anchor: Dark navy trim #2A3A50 + dark ceramics
  Light: Cool 5000K morning, cool and serene
  Mood: Serene blue bedroom, cool and calm

COMBO J — WHITE BEDROOM
  Wall: Warm white #F5F2EC — not stark cool white — warm plaster tone
  Furniture: Natural oak #C8A870 — warm wood, the only warm element
  Curtains: White linen sheer #FAF7F2 — layered whites, subtle
  Dark anchor: Dark iron frame #2A2A28 + dark greenery
  Light: Cool 6000K flooded morning, maximum brightness
  Mood: Pure and airy white bedroom, warm wood grounding it

COMBO K — PURPLE BEDROOM
  Wall: Dusty mauve #A88898 — muted purple-pink, sophisticated
  Furniture: Pale grey-white #EDE8E0 — pale contrast
  Curtains: Deep plum linen #6A3858 — deeper tonal contrast
  Dark anchor: Deep plum curtain + dark frames #4A2848
  Light: Cool 5000K morning, elegant and subdued
  Mood: Sophisticated dusty mauve, elegant not childish

COMBO L — DARK LIVING ROOM / KITCHEN / BATHROOM
  Wall: Deep teal #1E4A4A — rich dark teal, minimum 15% luminosity
  Furniture: Warm cream or natural wood #EDE8DC / #C8A870 — pale warm contrast
  Curtains: Warm cream linen #E8D8C0 — glowing against dark teal
  Dark anchor: Dark teal trim #142E2E
  Light: Warm lamp 2800K, well-exposed, fully legible
  Mood: Bold dark room for any space, rich and confident

NOTE: For Room Ideas articles, the WALL COLOUR in the prompt must match the article keyword exactly. If the article is "sage green bedroom", the wall must be sage green. Adapt from these combos accordingly.
`,

  // ─────────────────────────────────────────────────────────────────────────
  garden: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE GARDEN & OUTDOOR COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Garden images are EXTERIOR/OUTDOOR photography — different rules apply.
Palette: natural stone, terracotta, lush green foliage, weathered wood, white/cream, deep water blue.
Light is the hero — golden hour and dusk shots are most impactful.

12 SCENE COMBOS — assign ONE per section, NO REPEATS

COMBO A — TRAVERTINE POOL
  Hardscape: Travertine natural stone deck #D4C4A8 — warm cream-beige stone
  Furniture: White linen sun loungers #F5F2EC
  Water: Turquoise pool #5AB0C0 — bright clear blue
  Accent: Potted terracotta olive trees #B87848
  Light: Warm 3200K golden afternoon, long shadows on travertine
  Mood: Mediterranean luxury, villa pool afternoon

COMBO B — TIMBER DECK PLUNGE
  Hardscape: Oiled teak deck #8A6040 — rich warm brown timber
  Furniture: Natural linen outdoor sofa #E8D8C0
  Water: Deep pool #2A6878 — darker serene blue
  Accent: Potted palms and ornamental grasses
  Light: Golden 3000K dusk, warm on timber deck
  Mood: Modern resort plunge pool at sunset

COMBO C — STONE PATIO
  Hardscape: Aged limestone paving #C0B498 — warm cool stone
  Furniture: Dark iron bistro set #3A3830
  Accent: Potted terracotta #B87848 + trailing wisteria purple
  Greenery: Tumbling roses and clipped box
  Light: Cool 5500K midday, soft shadows
  Mood: European courtyard, ancient stone and iron

COMBO D — COVERED OUTDOOR ROOM
  Structure: White render pergola #F2EEE6
  Furniture: Linen outdoor sectional #D8CEBC — natural colour
  Floor: Concrete screed #A8A4A0 — cool pale grey
  Accent: Deep green planting wall #3A5A3A + terracotta pots
  Light: Warm 3600K pendant in pergola, dusk light
  Mood: Indoor-outdoor room, covered and cool

COMBO E — ENGLISH COTTAGE GARDEN
  Structure: Stone wall #C0B498 + timber gate
  Planting: Pink roses tumbling #E89898 + lavender #8A88B8
  Path: Reclaimed brick #A86848 — warm terracotta brick
  Accent: Wooden bench, painted sage #7A9068
  Light: Warm 3800K golden morning, dappled through rose canopy
  Mood: English cottage garden peak, roses and warm light

COMBO F — FARMHOUSE PORCH
  Structure: White painted timber porch #F2EEE6
  Furniture: Cedar rocking chairs #B89060 + swing bench
  Accent: Hanging potted ferns + galvanized planters
  Floor: Painted porch grey #8A8880
  Light: Warm 3400K late afternoon, long golden shadows
  Mood: Southern farmhouse porch, rocking chairs and evening peace

COMBO G — JAPANESE GARDEN
  Hardscape: Raked gravel #D0C8B0 + moss #5A7050
  Structure: Bamboo fence #B8983A
  Water: Still koi pond #4A7848 — deep green-grey water
  Accent: Red maple #8A2820 + stone lantern
  Light: Cool 5000K overcast, soft diffused Zen light
  Mood: Japanese zen garden, raked gravel and perfect stillness

COMBO H — MODERN LANDSCAPING
  Hardscape: Black granite pavers #3A3830 — dark modern paving
  Planting: Ornamental grasses #8A9068 + box spheres #3A5030
  Structure: Corten steel feature #8A5820 — rusted orange steel
  Accent: White gravel #E0DCD0 + single specimen tree
  Light: Golden 3200K afternoon, long modern shadows
  Mood: Contemporary landscape, bold geometry and nature

COMBO I — TROPICAL RESORT
  Hardscape: White concrete #F0EDE6
  Planting: Large tropical palms #3A5A28 + birds of paradise
  Water: Infinity pool #3A9898 — teal infinity edge
  Furniture: Dark wicker sectional #4A3820 + cream cushions
  Light: Warm 3000K golden dusk, tropical glow
  Mood: Tropical resort, lush and luxurious

COMBO J — AUTUMN GARDEN
  Hardscape: Old brick path #A86848 — weathered warm brick
  Planting: Amber maple #C87820 + rust chrysanthemums #B04820
  Structure: Timber arch #8A6040 with climbing vine turning gold
  Accent: Stone urn with ornamental kale
  Light: Warm amber 3000K October afternoon
  Mood: Autumn abundance, warm amber and brick

COMBO K — WINTER EVENING GARDEN
  Hardscape: Grey stone #9A9490
  Structure: Bare tree silhouette + fairy lights #FFD060
  Planting: Evergreen box + white-berried holly
  Furniture: Empty cast iron bench with dusting of frost
  Light: Warm 2600K fairy lights against cold blue sky
  Mood: Winter garden at dusk, lights against bare branches

COMBO L — ENTERTAINING TERRACE
  Hardscape: Pale porcelain paving #D8D0C0
  Furniture: Teak dining table + white chairs #E8E4DC
  Lighting: String lights overhead warm #FFD060
  Accent: Olive tree in terracotta pot + candlesticks on table
  Light: Warm 2800K evening entertaining, golden and convivial
  Mood: Summer dinner party terrace, golden evening light

ABSOLUTE RULES FOR GARDEN:
✓ Natural light source must be clear — sun angle, time of day visible in shadows
✓ Plants must look alive and full — no sparse or drooping greenery
✗ No people or furniture arranged in an obviously staged way
✗ No overly tidy "showroom" gardens — some organic wildness adds authenticity
✓ Weather must feel real — not perfectly grey studio-lit
`,

  // ─────────────────────────────────────────────────────────────────────────
  'global-styles': `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE GLOBAL STYLES COLOUR SYSTEM (Mexican Hacienda + Barndominium)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Palette: terracotta, ochre, cobalt blue, white, deep red, hand-painted tile, wrought iron.
Architecture is the hero — arches, thick walls, Saltillo tile, beamed ceilings.

12 COLOUR COMBOS — assign ONE per section, NO REPEATS

COMBO A — CLASSIC HACIENDA
  Wall: Terracotta plaster #B8724A — sun-baked warm terracotta, rough texture
  Architecture: White arch reveal #F2EDE0 — white-painted arched doorway
  Floor: Saltillo tile warm #C48050 — handmade terracotta square tile
  Accent: Cobalt Talavera tile #2A4A9A — blue-painted accents
  Dark anchor: Wrought iron black #2A2820 — chandelier, grille
  Light: Warm 3200K afternoon Mexican sun, strong directional
  Mood: Classic hacienda afternoon, terracotta and cobalt

COMBO B — COBALT COURTYARD
  Wall: White rough plaster #F0E8D8 — white hacienda wall, sun-bright
  Architecture: Cobalt arch tile border #2A4A9A — deep blue Talavera border
  Floor: Saltillo tile #C48050
  Accent: Terracotta pots #B87848 + orange trees
  Dark anchor: Wrought iron gate #2A2820
  Light: Bright 6000K midday Mexican sun, harsh and warm
  Mood: White courtyard with cobalt, Spanish colonial noon

COMBO C — WARM OCHRE HACIENDA
  Wall: Deep ochre plaster #C49A3C — golden yellow-orange wall
  Architecture: Exposed dark wood beams #5C3820 — heavy timber ceiling
  Floor: Dark terracotta tile #8A4828
  Accent: Talavera blue-white plate display
  Dark anchor: Dark wood beams + wrought iron #2A2820
  Light: Warm 3000K interior afternoon, amber glow
  Mood: Ochre hacienda dining room, warm and authentic

COMBO D — WHITE & TERRACOTTA BRIGHT
  Wall: Brilliant white #F5F2EC — crisp white plaster
  Floor: Saltillo honey #C48050 — warm handmade tile
  Furniture: Rustic dark pine #5C3820 — heavy hand-hewn furniture
  Accent: Woven serape textile #C84820 — warm rust-red woven throw
  Light: Cool 6000K bright daylight, crisp white walls
  Mood: Bright hacienda white and warm tile floor

COMBO E — DEEP INDIGO MEXICAN
  Wall: Deep indigo plaster #2A2A68 — Mexican midnight blue, minimum 15% luminosity
  Architecture: White arch #F2EDE0 — white contrast arch
  Floor: Saltillo tile #C48050 — warm terracotta against dark
  Accent: Gold metalwork #C89820 — gilded mirror and candles
  Dark anchor: Indigo wall as anchor + wrought iron
  Light: Warm 2800K candle and lamp, well-exposed indigo, fully legible
  Mood: Oaxacan night, deep indigo and candlelight

COMBO F — HACIENDA GARDEN
  Structure: White plaster courtyard wall #F2EDE0
  Planting: Bougainvillea magenta #C03878 — vivid against white
  Floor: Terracotta tile path #C48050
  Accent: Talavera pot #2A4A9A + orange tree
  Dark anchor: Wrought iron chair #2A2820
  Light: Warm 3400K afternoon sun, bougainvillea in full sun
  Mood: Hacienda garden, magenta and white courtyard

COMBO G — RICH RED HACIENDA
  Wall: Deep adobe red #8A2820 — rich warm red clay, minimum 15% luminosity
  Architecture: White arch and window surround #F2EDE0
  Floor: Saltillo tile #C48050
  Accent: Cobalt blue Talavera #2A4A9A
  Dark anchor: Deep red wall + wrought iron #2A2820
  Light: Warm 3000K lamp, well-exposed red wall, fully legible
  Mood: Adobe red bedroom, warm and earthy night

COMBO H — SAGE HACIENDA
  Wall: Sage plaster #8A9E7A — cool sage Mexican interior
  Architecture: White exposed beams #F2EDE0
  Floor: Dark terracotta tile #8A4828
  Accent: Terracotta pots + woven natural textiles
  Dark anchor: Dark wood beams #4A2E14
  Light: Cool 5000K morning, sage and white fresh
  Mood: Refreshing sage hacienda morning

COMBO I — HACIENDA BEDROOM WARM
  Wall: Warm sand #D8C4A0 — sandy plaster bedroom wall
  Furniture: Dark carved pine #5C3820 — hand-carved Mexican pine bed
  Curtains: Deep red cotton #8A2820 — warm deep red cotton panel
  Dark anchor: Dark carved wood + wrought iron
  Light: Warm 3200K afternoon, sand and carved wood warmth
  Mood: Hacienda bedroom, hand-carved and warm

COMBO J — BARNDOMINIUM INDUSTRIAL
  Wall: Corrugated steel grey #7A7C7C — industrial barn metal siding
  Structure: Exposed steel truss #5A5A58 — overhead steel beams
  Floor: Polished concrete #9A9690 — smooth concrete
  Furniture: Reclaimed thick plank wood #6A4828 — heavy reclaimed timber
  Accent: Matte black industrial #2A2820 — pipes, fixtures
  Light: Cool 6500K industrial warehouse daylight
  Mood: Barndominium interior, steel and wood industrial farmhouse

COMBO K — HACIENDA TILE KITCHEN
  Wall: White tile #F0EDE6 — white subway or decorative tile
  Floor: Talavera patterned tile blue-white #2A4A9A — bold Mexican floor
  Furniture: Dark pine painted #5C3820 — heavy painted cabinetry
  Accent: Terracotta ceramic vessels #B87848
  Dark anchor: Dark painted cabinet #3A2A14 + wrought iron handle
  Light: Warm 3800K kitchen afternoon
  Mood: Talavera tile Mexican kitchen, colourful and authentic

COMBO L — HACIENDA SUNSET
  Wall: Deep sunset clay #C05A2A — rich clay at golden hour
  Architecture: White arch silhouette + climbing vine
  Floor: Terracotta tile #C48050
  Accent: Bougainvillea orange-pink shadow #D07040
  Dark anchor: Wrought iron silhouette #2A2820
  Light: 2800K extreme golden sunset, raking light across clay wall
  Mood: Hacienda courtyard at sunset, clay and golden light

ABSOLUTE RULES FOR GLOBAL STYLES:
✓ Architectural elements (arches, beams, Saltillo tile) must be visible
✓ Talavera patterns or wrought iron must appear in most images
✗ Never show modern minimalist interiors — this is hand-crafted and architectural
✗ No IKEA-type furniture in hacienda images
`,

  // ─────────────────────────────────────────────────────────────────────────
  seasonal: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE SEASONAL COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Seasonal images must be immediately recognisable as that season.
Three season sub-systems: FALL / CHRISTMAS+WINTER / SPRING

── FALL COMBOS (use for Fall articles) ──

COMBO A-F — HARVEST LIVING ROOM
  Wall: Warm amber #C89040 — warm golden fall plaster
  Furniture: Deep walnut #5C3820 — rich autumn wood
  Curtains: Rust linen #A04820 — deep rust, warm
  Accent: Dried pampas grass + terracotta pumpkins
  Light: Warm 3000K amber afternoon, harvest warmth
  Mood: Peak autumn living room, amber and rust

COMBO B-F — TERRACOTTA PORCH
  Structure: Warm timber porch #B89060
  Accent: White + orange pumpkins + dried corn wreaths
  Planting: Mums in galvanized pots #7A7870
  Sky: Deep blue autumn sky #2A3A60 — cool contrast
  Light: Golden 3200K October afternoon
  Mood: Farmhouse fall porch, harvest abundance

COMBO C-F — MOODY FALL BEDROOM
  Wall: Deep forest green #2A4030 — dark autumn green, minimum 15% luminosity
  Furniture: Warm chestnut wood #8A5830
  Curtains: Amber linen #C89040 — warm gold against dark green
  Accent: Dried botanicals, pumpkins, candles
  Light: Warm 2800K candlelight, cosy autumn night
  Mood: Cosy fall bedroom, dark green and amber candlelight

COMBO D-F — RUST DINING TABLESCAPE
  Table: Aged oak #8A6040 — dark warm wood
  Linen: Terracotta linen runner #B87848
  Accent: Small pumpkins + dried wheat + amber tapers
  Background: Warm cream wall #F0E8D4
  Light: Warm 2800K candlelight on table, warm autumn dinner
  Mood: Fall dinner table, harvest and candlelight

── CHRISTMAS + WINTER COMBOS (use for Christmas articles) ──

COMBO A-X — CLASSIC CHRISTMAS LIVING ROOM
  Wall: Warm white #F5F2EC
  Accent: Deep evergreen pine tree #2A4028 — decorated Christmas tree
  Textiles: Red berry velvet cushion #8A2020 + plaid throw
  Mantel: Eucalyptus garland + red pillar candles
  Light: Warm 2700K firelight + Christmas tree lights, amber glow
  Mood: Classic cosy Christmas, warm fire and evergreen

COMBO B-X — DARK CHRISTMAS DRAMA
  Wall: Deep forest green #2A4028 — dark Christmas green, minimum 15% luminosity
  Furniture: Walnut dark #5C3820
  Accent: Gold candlesticks #C8960A + white narcissus flowers
  Textiles: Cream velvet cushions + burgundy throw
  Light: Warm 2600K candles only, warm and intimate, fully legible
  Mood: Dark dramatic Christmas, forest green and gold

COMBO C-X — WHITE CHRISTMAS BEDROOM
  Wall: Crisp white #F5F2EC
  Textiles: White linen bedding + deep green velvet cushions #2A4028
  Accent: Wreath above headboard + pine branch on bedside
  Lighting: White fairy lights + warm candles
  Light: Warm 2700K candlelight and fairy lights
  Mood: Peaceful white Christmas bedroom

COMBO D-X — CHRISTMAS TABLE
  Table: Dark walnut dining table
  Linen: Deep green linen tablecloth + white china
  Accent: Red taper candles + eucalyptus centrepiece + red berry sprigs
  Light: Warm 2800K candle dinner setting
  Mood: Christmas dinner table, deep green and candlelight

── SPRING COMBOS (use for Spring articles) ──

COMBO A-S — SPRING BEDROOM REFRESH
  Wall: Pale yellow #F0E4B8 — warm buttery spring morning
  Furniture: White painted #F5F2EC
  Curtains: White sheer #FAF8F4 — billowing in spring breeze
  Accent: Cherry blossom branch in vase + pale tulips
  Light: Cool 6000K bright spring morning
  Mood: Spring morning, pale yellow and blossom

COMBO B-S — SPRING DINING TABLE
  Table: Light oak table
  Linen: Blush linen tablecloth #E8C8BC
  Accent: Tulips + moss + painted eggs
  Light: Cool 5500K spring brunch morning
  Mood: Spring Easter table, blush and fresh

ABSOLUTE RULES FOR SEASONAL:
✗ No Santa, cartoon elements, or commercial holiday clichés
✓ Christmas: editorial and atmospheric — think Kinfolk, not catalogue
✓ Fall: warm amber and rust — no neon orange
✓ Spring: pale and fresh — no loud primary colours
`,

  // ─────────────────────────────────────────────────────────────────────────
  guides: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE STYLE GUIDES COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style guides compare aesthetics. Images should show rooms that clearly represent the style being described.
For "X vs Y" articles: alternate between using each style's own colour system.
For "What is X style?" articles: use that style's own colour combos.

Pull from the relevant style's combo system based on the article content.
If comparing Japandi vs Scandinavian: use Japandi combos for Japandi sections, Scandi combos for Scandi sections.
If explaining "What is Coastal?": use Coastal combos throughout.

GUIDE-SPECIFIC RULES:
✓ Featured hero image: blend both styles if "vs" article — one half of room each aesthetic
✓ Section images: match the style being described in that section
✗ Never show a confused room that looks like neither style — be clear and distinct
✓ Image must immediately communicate which style it represents to a first-time reader
`,
};

// ── Rotation banks (shared across all categories) ────────────────────────────
const ROTATION_BANKS = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROTATION BANKS — assign a DIFFERENT one per section, NO REPEATS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMERAS:     Sony A7R V | Hasselblad X2D 100C | Nikon Z9 | Fujifilm GFX 100S | Phase One IQ4 | Leica SL3
LENSES:      24mm f/1.4 | 35mm f/1.4 | 50mm f/1.2 | 85mm f/1.8 | 100mm f/2.8 macro | 28mm f/2 | 40mm f/2
ANGLES:      floor-level 25cm looking up | eye-level 95cm | low angle 50cm | overhead flat lay | three-quarter 115cm | doorway frame shot | high angle 160cm looking down | seated level 65cm
TIMES:       6am blue dawn | 8am early morning | 10am mid-morning | 12pm bright midday | 3pm strong afternoon | 5pm golden hour | 6:30pm blue dusk | 8pm evening lamp | 10pm candlelight
COMPOSITIONS: rule of thirds subject left | golden spiral | centred symmetry | negative space dominant right | leading lines from window | foreground bokeh with sharp background | strong diagonal | minimal single subject centred | frame within frame
SCENE TYPES: tight macro close-up of subject | full room wide establishing shot | corner vignette | window seat or sill | floor-level looking up | doorway frame | overhead flat lay | styled shelf | bedside table | morning routine | workspace surface | hallway entrance
`;

// ── Prompt structure (shared) ─────────────────────────────────────────────────
const PROMPT_STRUCTURE = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT STRUCTURE — write ALL elements comma-separated for each section:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[HERO SUBJECT — specific object(s) from article section, exact material and finish]
[WALL — colour name, hex code, surface texture]
[FURNITURE — wood or material, hex code, piece type]
[CURTAINS — fabric weight, colour, hex, contrast role]
[DARK ANCHOR — specific element, hex]
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
Choose the most visually powerful unused Combo (prefer E, F, D, or L for drama).
Wide full-room shot — wall colour, curtains, AND furniture all visible simultaneously.
Strong directional light — not flat. Scene must feel immediately arresting.
CRITICAL: Well-exposed and fully legible. Dark walls must be visible as their colour — never underexposed to black.
End with: "1200×800px landscape hero, wide editorial shot, well-exposed, Kinfolk cover quality, hyper-realistic RAW photograph, 8K, photorealistic"
`;

export async function POST(req: NextRequest) {
  const { articleTitle, category, headings, articleMarkdown, includePins } = await req.json();

  if (!headings?.length) return NextResponse.json({ error: 'No headings provided' }, { status: 400 });

  const roomType = CATEGORY_LABELS[category] ?? 'home interior';
  const colourSystem = COLOUR_SYSTEMS[category] ?? COLOUR_SYSTEMS['japandi'];

  const articleContext = articleMarkdown
    ? `\nFull article content — READ THIS CAREFULLY before writing each prompt. Every prompt must reflect the specific objects and ideas described in that section:\n---\n${articleMarkdown.slice(0, 8000)}\n---\n`
    : '';

  const prompt = `You are the world's best AI image prompt writer for FLUX (a hyper-realistic photographic model). You write prompts for decoreixy.com, a home decor inspiration site covering 12 style categories.
${articleContext}
Article: "${articleTitle}"
Room/space type: ${roomType}

${colourSystem}

${ROTATION_BANKS}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNIVERSAL ABSOLUTE RULES (apply to ALL categories):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ Never repeat a Combo, camera, lens, angle, time of day, or scene type within the same article
✗ Never use bright saturated colours — all palettes are muted and editorial
✗ Never add people, faces, or body parts
✗ Never add text, watermarks, or logos
✓ Objects in each section prompt must come from the actual article section content — read it carefully
✓ Every image must be well-exposed and legible
✓ Mood and drama come from colour contrast and light direction — never from underexposure

${PROMPT_STRUCTURE}

${includePins ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PINTEREST PIN PROMPTS — exactly 3 pins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PIN 1 — 4-PANEL COLLAGE (1000×1500px portrait 2:3): Four equal panels in 2×2 grid, 3px white dividers. Each panel uses a DIFFERENT Combo — four completely different colour worlds of ${roomType}. End with: "2×2 collage grid, 3px white dividers, four distinct colour worlds, editorial Pinterest pin, portrait 2:3 format, hyper-realistic composite"

PIN 2 — HERO + 2 DETAIL PANELS (1000×1500px portrait 2:3): Large hero top 60% — full ${roomType} wide scene using a dramatic Combo. Two square detail panels bottom 40%, 3px dividers. End with: "three-panel Pinterest layout, hero top 60%, two detail panels bottom 40%, 3px white dividers, portrait 2:3, editorial"

PIN 3 — FULL SCENE WITH TEXT SPACE (1000×1500px portrait 2:3): Complete ${roomType} scene. Bottom 25–30% intentionally uncluttered for text overlay. Bold wall colour Combo. End with: "full scene portrait, clean minimal bottom 25% for text overlay, portrait 2:3, hyper-realistic Kinfolk editorial"
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
