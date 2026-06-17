import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORY_LABELS: Record<string, string> = {
  japandi: 'Japandi interior', coastal: 'Coastal interior',
  'modern-farmhouse': 'Modern Farmhouse interior', boho: 'Bohemian interior',
  scandinavian: 'Scandinavian interior', cottagecore: 'Cottagecore interior',
  'mid-century-modern': 'Mid-Century Modern interior', general: 'home interior',
  garden: 'outdoor/garden space', 'global-styles': 'Mexican Hacienda interior',
  seasonal: 'seasonal home interior', guides: 'home interior',
  bedroom: 'Japandi bedroom', 'living-room': 'Japandi living room',
  bathroom: 'Japandi bathroom', kitchen: 'Japandi kitchen',
  entryway: 'Japandi entryway', 'home-office': 'Japandi home office',
  style: 'Japandi interior', 'gift-guides': 'Japandi interior',
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLE VOCABULARY — furniture forms, materials, signature objects, forbidden elements
// Injected into every prompt so Claude knows WHAT to render, not just what colour
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_VOCABULARY: Record<string, string> = {

  japandi: `
JAPANDI STYLE VOCABULARY — what must appear, what must never appear
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FURNITURE FORMS (only these belong in Japandi images):
  Beds: platform bed with low solid-wood frame, no headboard or simple slatted headboard, sits 25–35cm off floor
  Sofas: low-profile linen or bouclé, no visible legs or thin solid oak legs, no rolled arms, no tufting
  Tables: solid oak or walnut with minimal joinery, stone or wood surface, no glass tops, no ornate legs
  Storage: handleless cabinetry, simple tab-pull only, flat-front drawer units, low floating shelves
  Seating: simple solid-wood chair with woven grass seat, no cushioned armchairs with ornate frames
  Lighting: washi paper pendant, simple ceramic lamp base, minimal floor lamp with linen shade

SURFACE MATERIALS (only these):
  Wood: solid oak, solid walnut, or solid pine — visible grain, no veneer-look, no MDF
  Textiles: undyed linen, raw cotton, waffle cotton, woven grass, unbleached hemp
  Ceramics: hand-thrown, unglazed or single-colour glaze, visible throwing marks
  Stone: river stone, poured concrete, honed limestone — no polished marble
  Metal: brushed brass only, matte black iron — no chrome, no polished steel

SIGNATURE OBJECTS (include 1–3 per image):
  Single large ceramic vase | dried pampas or branch in vase | woven grass tray
  Linen throw folded once | single candle in simple holder | small stack of books
  River stone or pebble arrangement | ceramic soap dish | wooden cutting board displayed
  Single trailing plant (pothos, monstera) or small ceramic plant pot

FORBIDDEN IN JAPANDI (never render these):
  ✗ Ornate furniture legs, carved wood frames, decorative moulding
  ✗ Patterned textiles of any kind — no florals, no stripes, no geometric prints
  ✗ Bright accent colours — no red, no orange, no vivid green, no yellow
  ✗ Glossy surfaces — no lacquered furniture, no high-gloss paint, no chrome
  ✗ Gallery walls, busy artwork, decorative plates
  ✗ Fresh flowers — dried or living plants only, never cut flowers in a vase
  ✗ Matching furniture suites — individual considered pieces only
  ✗ Overhead recessed spotlights — natural light and floor/table lamps only
`,

  coastal: `
COASTAL STYLE VOCABULARY — what must appear, what must never appear
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FURNITURE FORMS (only these belong in Coastal images):
  Beds: rattan or wicker headboard, whitewashed pine or oak frame, linen slipcovered upholstered
  Sofas: slipcovered linen or cotton, deep-seated, relaxed arms — not tight or formal
  Tables: whitewashed or bleached wood, natural rattan top, driftwood-finish legs
  Storage: open shelving whitewashed pine, wicker baskets on shelves, simple painted wood
  Seating: rattan armchair, wicker side chair, Adirondack-style painted wood
  Lighting: woven seagrass pendant, rattan shade, simple ceramic or driftwood base

SURFACE MATERIALS (only these):
  Wood: whitewashed pine, bleached oak, driftwood-finish — always looks sun-bleached or washed
  Textiles: linen, cotton canvas, chambray, gauze — loose weave, not heavy or stiff
  Wicker/Rattan: always present somewhere — baskets, trays, headboards, lighting
  Ceramics: sea glass colours (teal, aqua, sandy cream) or simple white
  Natural fibre: sisal rug, jute runner, seagrass mat

SIGNATURE OBJECTS (include 1–3 per image):
  Wicker basket or tray | glass jar with pebbles or sea glass | linen throw loosely draped
  Driftwood piece as art or styling object | whitewashed wooden frame | rattan mirror
  Sandy-toned ceramic vase | trailing plant in terracotta | sheer curtain billowing

FORBIDDEN IN COASTAL (never render these):
  ✗ Nautical clichés — no anchors, no ship wheels, no rope coils, no life rings
  ✗ Tropical prints — no palm leaf prints, no flamingos, no Hawaiian patterns
  ✗ Heavy dark carved furniture — no Victorian, no ornate mahogany
  ✗ Formal or stiff upholstery — no tight Chesterfields, no button-tufted formal pieces
  ✗ Chrome or polished metal fixtures
  ✗ Dark walls without pale furniture contrast (coastal rooms are always airy)
  ✗ Cluttered maximalist layering — coastal is relaxed and edited, not boho
`,

  'modern-farmhouse': `
MODERN FARMHOUSE STYLE VOCABULARY — what must appear, what must never appear
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FURNITURE FORMS (only these belong in Modern Farmhouse images):
  Beds: iron bed frame (black or aged metal), upholstered linen headboard, simple wood platform
  Sofas: linen or cotton slipcover, deep-seated, slightly oversized, relaxed and lived-in
  Tables: reclaimed wood top, trestle base or X-base, farmhouse dining table, butcher block
  Storage: open shelving with visible bracket, shaker-style cabinet, barn door sliding
  Seating: Windsor-style wood chair, simple spindle-back, metal stool with wood seat
  Lighting: industrial pendant (cage or dome), black iron chandelier, Edison bulb exposed

SURFACE MATERIALS (only these):
  Wood: reclaimed pine, distressed oak, weathered barn wood — always looks aged not new
  Walls: shiplap planks horizontal, board-and-batten vertical — plank lines always visible
  Metal: matte black iron exclusively — handles, legs, hardware, light fittings
  Textiles: drop cloth cotton, linen, grain sack stripe, buffalo check (used sparingly)
  Stone/Tile: subway tile, brick, butcher block counter, farmhouse apron sink

SIGNATURE OBJECTS (include 1–3 per image):
  Galvanized metal bin or tray | Mason jar as vase or storage | wooden cutting board
  Woven wire basket | simple cotton tea towel | iron hook row | shiplap wall visible
  Apron/farmhouse sink | open shelving with stacked white dishes | simple greenery in crock

FORBIDDEN IN MODERN FARMHOUSE (never render these):
  ✗ Ornate or Victorian-style furniture — no carved legs, no decorative moulding
  ✗ Glossy finishes — always matte paint, raw wood, matte hardware
  ✗ Polished chrome or brushed nickel — only matte black iron
  ✗ Modern minimalist elements — no handleless cabinetry, no floating vanity with no detail
  ✗ Tropical or exotic plants — only simple greenery, herbs, lavender
  ✗ Overly styled or precious — farmhouse rooms look used and comfortable
`,

  boho: `
BOHO STYLE VOCABULARY — what must appear, what must never appear
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FURNITURE FORMS (only these belong in Boho images):
  Beds: rattan or carved wood headboard, canopy frame with flowing fabric, low-profile
  Sofas: deep velvet or linen, multiple mixed throw cushions stacked, draped throw
  Tables: carved wood side table, mosaic tile top, vintage trunk as coffee table, raw wood slab
  Storage: open wooden shelving with layered objects, wicker storage trunk, rattan side table
  Seating: rattan egg chair or hanging chair, floor cushions, pouffe or ottoman
  Lighting: macramé pendant, Moroccan lantern, string of Edison lights, rattan shade

SURFACE MATERIALS (only these):
  Wood: carved solid wood, aged pine, dark mahogany, driftwood — always has personality
  Textiles: hand-woven, embroidered, block-print, kantha quilt, Moroccan wedding blanket
  Rugs: layered — kilim over jute, or Persian over sisal, always stacked or overlapping
  Rattan/Wicker: large presence — furniture, baskets, lampshades, mirrors
  Ceramics: hand-thrown, painted or textured, mismatched — never matching sets

SIGNATURE OBJECTS (must be present, always layered):
  Macramé wall hanging | trailing plant (pothos, monstera, string-of-pearls)
  Stack of layered rugs | mix of throw cushions in different textures
  Cluster of candles at different heights | woven basket collection | global textiles draped
  Vintage or artisan ceramic vessels grouped | rattan mirror | dried pampas or tropical leaves

FORBIDDEN IN BOHO (never render these):
  ✗ Sparse or empty rooms — boho always has visible abundance and layering
  ✗ Matching furniture sets — mix and mismatch is essential
  ✗ Flat-pack or modern minimalist pieces — no IKEA-style clean lines
  ✗ Bare walls — always art, macramé, or textiles on walls
  ✗ Cold or cool-only palettes — boho is always warm-anchored
  ✗ Overhead strip or recessed lighting — warm low lamps and candles only
`,

  scandinavian: `
SCANDINAVIAN STYLE VOCABULARY — what must appear, what must never appear
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FURNITURE FORMS (only these belong in Scandinavian images):
  Beds: simple solid birch or pine frame, clean rectangular headboard, no ornate detail
  Sofas: tight clean upholstery in neutral — no overstuffed, no rolled arms, simple legs
  Tables: round or rectangular pale birch/pine top, simple tapered legs, no ornate edge
  Storage: functional shelving, built-in white painted, simple shaker door
  Seating: clean-lined wooden dining chair, simple upholstered accent chair, no fussiness
  Lighting: simple pendant (globe, cone, or drum shade), bedside table lamp, always candles

SURFACE MATERIALS (only these):
  Wood: pale birch, light pine, light ash — always light-toned, natural grain
  Textiles: wool throw, sheepskin, cotton — simple, no heavy pattern (one graphic accent max)
  Ceramics: simple pale or grey, clean forms — no painted decoration
  Rugs: simple solid or ONE graphic pattern (stripes or geometric), never ornate floral

SIGNATURE OBJECTS (must be present):
  Lit candles (always) | simple ceramic vase with single branch or stems
  Wool throw folded neatly | one graphic cushion | pale wood tray with candles
  Simple plant (pothos, palm, or branch in clear vase) | clear glass hurricane lamp

FORBIDDEN IN SCANDINAVIAN (never render these):
  ✗ Ornate or heavily decorated furniture — no carved legs, no Victorian detail
  ✗ Dark heavy wood — no dark walnut, no mahogany, no teak (use light birch/pine)
  ✗ Multiple patterns — maximum ONE graphic textile element per image
  ✗ Cluttered surfaces — everything must look purposeful and ordered
  ✗ Bright accent colours — one muted accent only (dusty rose, ochre, sage, navy)
  ✗ No candles in evening/intimate shots — they must always be present
`,

  cottagecore: `
COTTAGECORE STYLE VOCABULARY — what must appear, what must never appear
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FURNITURE FORMS (only these belong in Cottagecore images):
  Beds: iron bed frame (white or black, scrollwork or simple spindle), upholstered in floral or linen
  Sofas: rolled-arm sofa with worn patina, loose slipcover, vintage-looking upholstery
  Tables: weathered farmhouse table, turned legs, painted or distressed finish
  Storage: open dresser with turned knobs, armoire with panelled door, painted hutch
  Seating: ladder-back or spindle-back wooden chair, upholstered in floral or stripe
  Lighting: ceramic table lamp with pleated shade, chandelier with candle-bulbs, wall sconce

SURFACE MATERIALS (only these):
  Wood: painted (white, sage, duck egg, butter yellow), distressed or aged — never raw modern
  Textiles: floral cotton or linen, eyelet/broderie anglaise, lace trim, ruffled edges, gingham
  Ceramics: vintage-style, blue-and-white china, hand-painted floral, mismatched pieces
  Walls: soft plaster paint, tongue-and-groove, faded wallpaper with floral or botanical

SIGNATURE OBJECTS (must be present, always botanical):
  Dried flower bunch | fresh wildflowers in jug or vintage vase | botanical print framed
  Vintage china displayed on shelf | lace-trimmed textiles | ceramic crockery stacked
  Garden herbs in pot on windowsill | beeswax candle | old book stack | wicker basket

FORBIDDEN IN COTTAGECORE (never render these):
  ✗ Modern minimalist furniture — no handleless cabinets, no flat-pack, no Scandi clean lines
  ✗ Bright saturated colours — everything must be faded, dusty, or muted
  ✗ Industrial elements — no exposed steel, no concrete, no Edison bulb pendants
  ✗ Bare or undecorated walls — always botanical prints, vintage plates, or framed florals
  ✗ Matching modern furniture sets — antique, vintage, or painted aged pieces only
  ✗ Any furniture that looks brand new — patina and age are essential
`,

  'mid-century-modern': `
MID-CENTURY MODERN STYLE VOCABULARY — what must appear, what must never appear
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FURNITURE FORMS (only these belong in MCM images):
  Beds: low platform with no headboard OR simple upholstered rectangular headboard, tapered legs
  Sofas: clean rectangular profile, tight upholstery, tapered solid wood legs, no skirt
  Tables: tulip pedestal, hairpin legs, or simple tapered-leg base — organic shapes preferred
  Storage: low horizontal credenza with tapered legs, flat-front drawer faces, walnut veneer
  Seating: shell chair (Eames-inspired), tulip chair, egg chair, fibreglass or moulded form
  Lighting: arc floor lamp with dome shade, globe pendant, cone pendant, Noguchi paper lamp

SURFACE MATERIALS (only these):
  Wood: walnut, teak, or rosewood — warm mid-tone, smooth grain, no distressing
  Upholstery: wool, boucle, leather — in mustard, olive, burnt orange, rust, teal, cream
  Rugs: circular or rectangular with graphic pattern — abstract or geometric, warm colours
  Metal: brushed brass, painted matte iron — clean forms, no ornate casting

SIGNATURE OBJECTS (must be present):
  Arc floor lamp with dome OR globe pendant visible | low credenza or sideboard
  One bold accent colour cushion or throw | tapered furniture legs always visible
  Abstract artwork or graphic print | ceramic in organic sculptural form

FORBIDDEN IN MID-CENTURY MODERN (never render these):
  ✗ Rustic or distressed finishes — MCM is always smooth, clean, purposeful
  ✗ Shiplap, board-and-batten, or farmhouse elements
  ✗ Ornate carved frames, Victorian details, or cottagecore elements
  ✗ Bright/saturated colours as dominant — bold accent only (one element)
  ✗ Chrome fixtures — brushed brass or matte iron only
  ✗ High furniture — MCM is always low-profile, horizontal emphasis
  ✗ Cluttered surfaces — clean and considered
`,

  general: `
ROOM IDEAS STYLE VOCABULARY — accessible aspirational rooms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Room Ideas articles are keyword-driven — the COLOUR is the hero, not a specific style.
Furniture should be accessible and recognisable, not avant-garde or style-specific.

FURNITURE FORMS (broadly accessible, aspirational but achievable):
  Beds: upholstered headboard (any shape), solid wood frame, simple platform
  Sofas: comfortable deep-seated, clean lines, not overly formal or overly casual
  Tables: natural wood top, simple base — nothing too styled either way
  Storage: simple painted or wood wardrobe, open shelf unit, painted dresser
  Seating: simple upholstered armchair, dining chair in wood or upholstered

SURFACE MATERIALS: natural oak, painted wood (any colour matching article keyword),
  linen or cotton upholstery, simple ceramics, basic rugs

CRITICAL RULE — WALL COLOUR FIRST:
  The article's target keyword colour MUST be the wall colour.
  "Sage green bedroom" = sage green walls. "Navy bedroom" = navy walls.
  Everything else in the room supports and flatters that wall colour.

SIGNATURE OBJECTS: simple plant, bedside lamp, framed artwork, simple rug, throw
FORBIDDEN: overly niche style elements — no Japandi ceramics, no boho layering,
  no MCM tapered legs unless the article is about that style
`,

  garden: `
GARDEN & OUTDOOR STYLE VOCABULARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTDOOR FURNITURE FORMS:
  Pool areas: sun loungers with linen or canvas cushion, side table, pergola or shade sail
  Patios: outdoor sectional or dining set, outdoor rug, string lights, lanterns
  Porches: rocking chair, porch swing, Adirondack chairs, hanging plants
  Garden seating: cast iron bench, teak bench, stone bench, wrought iron bistro

HARDSCAPE MATERIALS: travertine, limestone, timber decking (teak/cedar/pine),
  concrete, brick, slate, gravel, cobblestone — always looks natural not fake

PLANTING: always lush and alive — roses, lavender, ornamental grasses, box hedging,
  olive trees, bougainvillea, wisteria, tropical palms, ferns

LIGHTING: golden string lights, lanterns, solar stake lights, pool underwater lights,
  flame torches, fire pit flames — always warm-toned

FORBIDDEN: plastic furniture that looks cheap, artificial-looking plants,
  obviously synthetic turf, studio-lit outdoor shots (must feel like real weather)
`,

  'global-styles': `
MEXICAN HACIENDA STYLE VOCABULARY — what must appear
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARCHITECTURAL ELEMENTS (must appear in every image):
  Thick white plaster walls | rounded or pointed arches | exposed wooden ceiling beams
  Saltillo terracotta floor tiles | courtyard with central fountain | wrought iron window grille
  Talavera tile accent (blue-and-white painted ceramic) | hacienda arch doorway

FURNITURE FORMS:
  Heavy hand-carved pine or mesquite wood furniture | iron bed frame with scrollwork
  Leather-slung chair (equipale) | painted colonial chest | rough-hewn wood dining table
  Wrought iron chandelier or pendant | painted Talavera lamp base

SURFACE MATERIALS:
  Saltillo tile floor (terracotta square, handmade) | rough white plaster walls
  Hand-carved solid wood | Talavera hand-painted ceramic | hand-loomed textiles (serape)
  Wrought iron — gates, hardware, light fittings | terracotta pots

SIGNATURE OBJECTS (always present):
  Talavera pottery or tiles | terracotta pot with orange tree or flowering plant
  Serape or hand-loomed textile | wrought iron detail | carved wood element

FORBIDDEN: IKEA or modern flat furniture, minimalist interiors, concrete floors
  without tile, chrome fixtures, anything that looks mass-produced
`,

  seasonal: `
SEASONAL STYLE VOCABULARY — season-specific objects always required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
READ THE ARTICLE TITLE to identify the season, then apply the correct vocabulary:

FALL vocabulary (September–November):
  MUST INCLUDE: pumpkins (white and/or orange), dried pampas grass, dried corn wreaths,
    autumn leaves (amber/rust/gold), chunky wool throw in rust or amber,
    terracotta ceramic vessels, amber pillar candles, dried wheat sheaves,
    chrysanthemums (rust, burnt orange, deep red)
  FURNITURE: warm dark wood, cosy upholstered seating with layered throws
  FORBIDDEN: fresh spring flowers, summer brights, Christmas elements

CHRISTMAS + WINTER vocabulary (November–January):
  MUST INCLUDE: pine or fir tree branch/garland, red berry sprigs (holly, hawthorn),
    deep forest green velvet cushion or textile, white pillar or taper candles lit,
    warm amber firelight or fairy lights, plaid or tartan wool throw
  OPTIONAL: pinecones, cinnamon sticks, white narcissus, eucalyptus garland
  FORBIDDEN: Santa Claus, cartoon characters, bright commercial red as dominant,
    tropical plants, summer elements, halloween items
  NOTE: keep it editorial and atmospheric — Kinfolk Christmas, not catalogue

SPRING vocabulary (February–April):
  MUST INCLUDE: cherry blossom or tulip flowers, pale yellow or blush palette,
    white linen fresh and light, moss or greenery fresh, painted eggs or nests (Easter)
  FURNITURE: pale light wood, whitewashed or painted furniture
  FORBIDDEN: heavy dark furniture, autumn colours, Christmas elements
`,

  guides: `
STYLE GUIDES VOCABULARY — use the compared style's vocabulary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For each section image, apply the vocabulary of the style being described in that section.
If section discusses Japandi → apply Japandi vocabulary (platform bed, ceramic, linen)
If section discusses Coastal → apply Coastal vocabulary (rattan, whitewashed, linen)
The image must CLEARLY and INSTANTLY communicate which style it represents.
A reader who doesn't know either style should be able to identify it from the image alone.
`,
};

// ─────────────────────────────────────────────────────────────────────────────
// TONE CLASSIFICATION KEY (used in all banks below)
// WL=Warm-Light  WM=Warm-Mid  WD=Warm-Dark
// CL=Cool-Light  CM=Cool-Mid  CD=Cool-Dark
// NL=Neutral-Light  NM=Neutral-Mid  ND=Neutral-Dark
// ─────────────────────────────────────────────────────────────────────────────

const ASSEMBLY_RULES = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMBINATION ASSEMBLY RULES (apply to every image)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Each image needs THREE contrast types simultaneously:
  1. LIGHT/DARK contrast — light element must sit against a darker element
  2. WARM/COOL contrast — never all-warm or all-cool; always at least one of each
  3. MATTE/TEXTURE contrast — smooth surface + rough woven/rattan/plaster + polished wood grain

WALL → FURNITURE pairing rule:
  WL wall → pair with WM, WD, CM, or CD furniture (need depth)
  WM wall → pair with WL, WD, CL, or CD furniture (go lighter or darker)
  WD wall → pair with WL or CL furniture (need light contrast; wall minimum 15% luminosity)
  CL wall → pair with WM, WD, NM, or ND furniture (need warmth)
  CM wall → pair with WL, WD, or NL furniture
  CD wall → pair with WL or WM furniture (wall minimum 15% luminosity, fully legible)
  NL wall → pair with WM, WD, CM, or CD furniture
  NM wall → pair with WL, WD, CL, or CD furniture
  ND wall → pair with WL, CL, or NL furniture (wall minimum 15% luminosity)

CURTAIN rule:
  If wall+furniture are both warm → curtain must be cool or neutral
  If wall+furniture are both cool → curtain must be warm or neutral
  If wall is dark → curtain must be pale/light (glowing contrast)
  If wall is light → curtain can be any tone for drama

DARK ANCHOR rule:
  Every image needs one element darker than both wall and furniture
  (lamp base, picture frame, ceramic vessel, furniture leg, window trim)

DARK WALL EXPOSURE rule:
  Any WD/CD/ND wall must be rendered at minimum 15% luminosity
  Room must be fully legible — drama comes from contrast and light direction, never from underexposure
  A dark wall reads as charcoal/green/navy — never pitch black
`;

const ROTATION_BANKS = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROTATION BANKS — each image uses ONE from each bank, NO REPEATS WITHIN AN ARTICLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMERAS:
  Sony A7R V | Hasselblad X2D 100C | Nikon Z9 | Fujifilm GFX 100S | Phase One IQ4 | Leica SL3
  Canon EOS R5 | Pentax 645Z | Mamiya RZ67 | Leica M11 | Nikon D850 | Sony A1

LENSES:
  16mm f/2.8 | 20mm f/1.8 | 24mm f/1.4 | 28mm f/2 | 35mm f/1.4 | 40mm f/2
  50mm f/1.2 | 55mm f/1.8 | 85mm f/1.8 | 90mm f/2.8 macro | 100mm f/2.8 macro | 135mm f/2

CAMERA ANGLES & HEIGHT:
  floor-level 20cm shooting up | low angle 40cm | seated level 65cm | tabletop level 75cm
  eye-level 95cm | standing 120cm | high angle 145cm | elevated 165cm looking down
  doorway frame shot from corridor | window exterior looking in | ceiling corner looking down
  over-the-shoulder 110cm | under-shelf looking out | close macro 30cm from subject

TIMES OF DAY:
  5:30am pre-dawn blue | 6am blue dawn | 7am first light golden | 8am early morning soft
  9:30am mid-morning | 11am late morning | 12:30pm bright midday | 2pm early afternoon
  3:30pm strong afternoon | 5pm golden hour | 6pm warm dusk | 7pm blue dusk
  8pm evening lamp only | 9pm candlelight and lamp | 11pm deep night single lamp

LIGHT QUALITY & SOURCE:
  single window backlight diffused | strong directional side window | overcast even diffused
  warm arc lamp pooled light | candlelight only warm flicker | mixed lamp and candle
  golden raking sunlight across texture | cool north-window flat even | dappled filtered leaf-shadow
  firelight amber from one side | deep shadow with single highlight | uplighting from floor lamp
  morning bounce off light wall | three-point lamp setup | single bare bulb warm

COMPOSITIONS:
  rule of thirds subject left | rule of thirds subject right | golden spiral focal left
  centred strict symmetry | off-centre asymmetric balance | negative space dominant right
  negative space dominant top | leading lines from window to subject | strong diagonal left-right
  foreground bokeh sharp background | frame within frame doorway | flat lay from above
  wide establishing no focal point | tight single hero subject centred | two objects in dialogue
  layered depth foreground-mid-background | corner crop subject at edge | panoramic horizontal

SCENE TYPES:
  full room wide establishing shot | corner vignette sitting area | window seat with view
  floor-level looking up at furniture | doorway frame entering room | overhead flat lay surface
  styled shelf full width | bedside or side table vignette | morning routine surface items
  workspace desk surface | hallway entrance looking in | bathroom vanity close
  kitchen counter styling | dining table set detail | outdoor scene full | macro single object
  fireplace mantel full | bed styled from foot | sofa corner detail | staircase or landing
`;

const PROMPT_STRUCTURE = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO WRITE EACH PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For EVERY section image, write ALL of these elements comma-separated:

[HERO SUBJECT — specific object(s) from that article section, exact material + finish]
[WALL — colour name + hex code + surface texture (plaster grain / shiplap / smooth paint / rough render)]
[FURNITURE — wood/material name + hex code + piece type + leg style if relevant]
[CURTAINS — fabric weight (sheer/mid/heavy) + colour name + hex + contrast role described]
[DARK ANCHOR — specific element + hex code (lamp base, frame, ceramic, trim, hardware)]
[SCENE TYPE — from rotation bank, unused in this article]
[LIGHT SOURCE + DIRECTION — specific and physical]
[LIGHT QUALITY — from rotation bank]
[COLOUR TEMPERATURE — exact Kelvin]
[TIME OF DAY — from rotation bank, unused in this article]
[CAMERA BODY — from rotation bank, unused in this article]
[LENS — from rotation bank, unused in this article]
[APERTURE f/x.x + ISO xxxx]
[CAMERA ANGLE + HEIGHT — from rotation bank, unused in this article]
[COMPOSITION — from rotation bank, unused in this article]
[MOOD — one precise evocative phrase, never generic]
hyper-realistic RAW photograph, editorial quality, 8K resolution, photorealistic, no CGI, no people, no text, no watermarks

FEATURED HERO IMAGE (1200×800px landscape):
  Use the most visually dramatic wall colour from the bank (a dark or richly saturated option).
  Wide full-room shot showing wall colour + curtains + furniture simultaneously.
  Strong directional light — not flat even lighting.
  CRITICAL: Well-exposed and fully legible. Dark walls show their colour, never black.
  Append: "1200×800px landscape hero, wide editorial room shot, well-exposed, Kinfolk cover quality, hyper-realistic RAW photograph, 8K"
`;

// ─────────────────────────────────────────────────────────────────────────────
// PER-CATEGORY PALETTE BANKS
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE_BANKS: Record<string, string> = {

  japandi: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JAPANDI PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style character: muted, earthy, mineral. No bright colours. No patterns. No gloss.
Every image must feel like a slow breath out. Negative space is intentional.

WALL COLOUR BANK (52 options — pick ONE per image, NEVER REPEAT in same article)
Tag = tone class. Hex = exact render target.
[WL] Linen sand #EDE5D4 | [WL] Warm rice #F7F2EA | [WL] Pale ivory #F2EDE6
[WL] Alabaster #F0EBE2 | [WL] Warm chalk #EFE9DE | [WL] Antique white #EDE6D8
[WL] Soft parchment #E8DFD0 | [WL] Cream plaster #E4DAC8 | [WL] Warm muslin #E0D6C6
[WM] Warm sand #D8C8A8 | [WM] Bamboo dust #D4BEA0 | [WM] Wheaten #CDB890
[WM] Warm biscuit #C8B280 | [WM] Honey oat #C4AA78 | [WM] Warm straw #C0A470
[WM] Tawny linen #B89868 | [WM] Terracotta mist #C4906A | [WM] Dusty clay #BC8860
[WM] Warm clay #B88058 | [WM] Clay rose #C49078 | [WM] Warm adobe #B87858
[WD] Deep clay #A06040 | [WD] Burnt umber #8A5030 | [WD] Dark terracotta #9A5838
[WD] Rust plaster #8C4828 | [WD] Warm charcoal #3C3A36 | [WD] Sumi dark #302E2A
[WD] Espresso brown #2E2420 | [WD] Forest haze #768C6A | [WD] Dark olive #5A6840
[WD] Charred oak #3A3020 | [WD] Deep forest #4A5E40
[CL] Pale moss #D0D5BF | [CL] Morning fog #D2D6DC | [CL] Slate mist #C8CDD4
[CL] Cool rice #E8EBE4 | [CL] Stone white #DDE0D8 | [CL] Mist grey #D8DCE0
[CL] Pale ash #D4D8D0 | [CL] Cool cloud #D0D4CC
[CM] Stone blue #6D7E8E | [CM] Slate grey #7A8088 | [CM] Cool concrete #888C90
[CM] Mineral grey #8A8E92 | [CM] Pewter #909498 | [CM] Graphite mist #848890
[CD] Graphite #5C5A56 | [CD] Deep slate #4A4E52 | [CD] Charcoal blue #3E4448
[CD] Midnight forest #2A3828 | [CD] Ocean deep #2A3A48 | [CD] Ink grey #363630

FURNITURE COLOUR BANK (35 options — pair using assembly rules above)
[WL] Ash blonde oak #E8D5B4 — pale Scandi oak, warm | [WL] Blonde pine #E0CC9A — very light pine
[WL] Cream lacquer #EDE8DC — painted pale warm | [WL] Birch white #E4DAC8 — whitewashed birch
[WM] Honey oak #C8A876 — warm golden oak | [WM] Natural rattan #C4A870 — woven warm honey
[WM] Warm pine #D0A870 — warm mid pine | [WM] Teak light #B89868 — pale teak grain
[WM] Walnut light #B08060 — lighter walnut | [WM] Cedar natural #C09868
[NM] Greige lacquer #B8B0A4 — painted neutral | [NM] Warm putty #C0B8A8
[CM] Cool grey painted #9A9E9C — cool painted | [CM] Slate lacquer #7A8080
[WD] Walnut mid #9C7A52 — classic walnut | [WD] Dark pine #7A5838 — aged dark pine
[WD] Teak dark #6A5040 — rich dark teak | [WD] Aged oak #7A6048
[CD] Dark walnut #6B4E35 — deep rich walnut | [CD] Ebony stain #3C2A1A — very dark
[CD] Charcoal lacquer #4A4844 — painted dark | [CD] Ink black painted #2C2C2A
[CD] Dark rattan #5C4030 — deep woven | [CD] Smoked oak #4A3C2C
[WD] Burnt sienna shelf #8A4828 | [WD] Rust-painted #9C4A28 | [WD] Deep walnut #5C3820
[CM] Blue-grey painted #6A7880 | [CD] Forest painted #3A5030 | [WM] Warm maple #D4A878

CURTAIN BANK (30 options)
[WL-sheer] White cotton sheer #FAF8F4 — billowing, backlit | [WL-sheer] Warm linen sheer #F5EFE6
[WL-sheer] Ivory silk #F0E8D8 — soft sheen, warm | [WL-sheer] Pale muslin #F2EBE0
[WL-mid] Natural linen #E4D8C4 — mid-weight, raw texture | [WL-mid] Cream linen #E8DCC8
[WL-mid] Undyed cotton #DDD4C0 — raw warm | [WL-mid] Pale linen drop #D8CEBC
[WM-mid] Sand linen #D4C4A0 — warm mid | [WM-mid] Warm oat #CEC0A0
[WM-heavy] Jute natural #C4A878 — coarse texture warm | [WM-heavy] Warm canvas #D0BA98
[NM-mid] Stone linen #C0BEB4 — cool-neutral | [NM-heavy] Greige wool #B8B4A8
[CM-mid] Cool linen grey #B4B8BC | [CM-heavy] Slate blue linen #9A9EAA
[CL-sheer] Cool white #EEF0EC | [CL-mid] Pale sage #C8D0C4 | [CL-mid] Mist grey linen #C8CDD0
[WD-heavy] Warm charcoal #6A6660 — dark warm | [WD-heavy] Deep caramel #A08060
[WD-heavy] Rust linen #A04820 — dark warm accent | [WD-heavy] Deep clay #8A5838
[CD-heavy] Dark slate #4C5050 — heavy dark cool | [CD-heavy] Deep navy #2A3E60
[CD-heavy] Charcoal wool #3A3830 — very dark | [CD-heavy] Forest linen #3A5040
[WD-heavy] Deep terracotta #8A4828 | [WD-heavy] Dark ochre #8A7030 | [CD-heavy] Indigo #2A3A68

ACCENT / DARK ANCHOR BANK (20 options — must be darkest element in image)
Sumi charcoal ceramic #3C3A36 | Ink black frames #252320 | Matte black iron #2A2820
Dark walnut trim #3A2810 | Charcoal pottery #3A3430 | Deep slate vessel #2E3438
Dark rattan tray #4A3020 | Ebony lamp base #2C2420 | Smoked glass #3A3C3A
Dark bronze metal #4A3820 | Aged iron hook #2A2828 | Deep forest trim #2A3820
Sumi ink brush holder #2C2C28 | Dark ceramic canister #3A3028 | Charcoal linen basket #4A4440
Matte black tap #1C1C1C | Iron-black shelf bracket #2A2820 | Deep navy trim #1E2C3A
Dark wenge wood tray #2A1E14 | Cast iron object #2C2828

JAPANDI ABSOLUTE RULES:
✗ Never use patterns — solid tones only, no stripes, no prints
✗ Never use gloss finishes — everything matte, raw, or natural grain visible
✗ Never use bright or saturated colour — all tones muted, mineral, earthy
✗ Never use fresh flowers — dried botanicals, branches, moss only
✗ Never mix more than one wood family — pick oak OR walnut OR pine per image
✗ No chrome — brushed brass or matte black only for metal
✓ Negative space is intentional — surfaces should not be crowded
✓ Max 3 objects on any surface in the image
`,

  coastal: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COASTAL PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style character: ocean, sand, bleached wood, sea glass, salt air, linen.
Light should feel generous — coastal rooms always have good natural light.

WALL COLOUR BANK (52 options)
[WL] Whitewash warm #F4F1EB | [WL] Sea foam cream #F0EDE4 | [WL] Sandy white #EEE8DC
[WL] Bleached linen #ECDFD0 | [WL] Warm shore #E8DFD0 | [WL] Pale dune #E4D8C8
[WL] Warm beach #E0D4C0 | [WL] Shell white #EBE6DD | [WL] Washed cream #E6DFCF
[WM] Warm sand #E0D5C0 | [WM] Beach sand #D8CCBA | [WM] Desert sand #D4C8B0
[WM] Driftwood buff #D0C0A0 | [WM] Sun-bleached #CCBA98 | [WM] Sandy tan #C8B490
[WM] Warm shell #CCAC88 | [WM] Bleached wheat #C8AC80 | [WM] Coastal oat #C4A878
[WM] Blush sand #DCBCAA | [WM] Coral mist #D8B0A0 | [WM] Terracotta wash #D0A890
[CL] Cool white chalk #F2F4F0 | [CL] Sea spray #EBF0EC | [CL] Mist shore #E4ECEC
[CL] Cool linen #DCE4E0 | [CL] Pale aqua #D0E4E0 | [CL] Soft seafoam #C8DED8
[CL] Whisper blue #D4DDE8 | [CL] Pale coastal grey #D0D8DC
[CM] Sea glass #8BB8B0 | [CM] Faded turquoise #7AAAA8 | [CM] Muted teal #6A9E9C
[CM] Dusty seafoam #7AB0AC | [CM] Duck egg mid #88B0A8 | [CM] Coastal sage #8AAA98
[CM] Soft denim wash #8898A8 | [CM] Overcast coast #9AAAB4 | [CM] Coastal grey #A8B4BC
[CD] Deep sea glass #5A9898 | [CD] Ocean mid #4A8A8A | [CD] Teal coast #3A7878
[CD] Deep duck egg #4A8880 | [CD] Atlantic blue #3A6878 | [CD] Coastal navy #2E5266
[WD] Warm driftwood #8A7060 | [WD] Aged teak #7A6050 | [WD] Dark driftwood #6A5040
[CD] Deep coastal teal #2A6060 | [CD] Midnight ocean #1E3A4C | [CD] Harbour navy #2A3C52

FURNITURE COLOUR BANK (35 options)
[WL] Whitewashed pine #EDE8DF — bleached bone | [WL] Painted white wood #F0EBE2
[WL] Bleached rattan #E0D8C8 — sun-faded | [WL] Pale driftwood #D8CEBC
[WM] Natural rattan #C8B890 — warm honey wicker | [WM] Warm oak coastal #C8A878
[WM] Driftwood grey #B0A898 — bleached grey-brown | [WM] Bleached teak #B89870
[WM] Honey wicker #C4A870 — warm woven | [WM] Sun-bleached wood #C0B088
[NM] Coastal grey-white #D4D0C8 | [NM] Warm putty painted #C4BEB2
[CM] Aged blue-grey painted #8A9AA8 | [CM] Faded coastal teal #7A9898
[WD] Warm dark teak #6A5040 | [WD] Aged cedar #7A6050 | [WD] Weathered brown #6A5848
[CD] Deep ocean teak #3A5858 | [CD] Dark wicker #4A3828 | [CD] Navy painted #2A3E60
[CD] Deep harbour blue #2A4050 | [WD] Dark driftwood #5C4838 | [WD] Warm sienna wood #8A5838
[WM] Coral rattan #C09080 | [WM] Blush painted #D4A898 | [WL] Linen upholstered #E8DDD0
[CM] Seafoam painted #7AA8A0 | [CD] Dark coastal navy #2E4E68 | [WM] Sandy painted #D4C0A0
[WL] Cloud white painted #EEE8E0 | [CD] Midnight teak #2A3838 | [WM] Warm mahogany coast #A07050

CURTAIN BANK (30 options)
[WL-sheer] White linen sheer #FAF8F4 | [WL-sheer] Ivory sheer #F5F0E8 | [WL-sheer] Cream cotton #F2ECE0
[WL-mid] Natural drop cloth #E0D4BC | [WL-mid] Sandy linen #D8CCBA | [WL-mid] Warm canvas #D4C8AE
[WL-mid] Bleached cotton #E4DAC8 | [WM-mid] Warm sand linen #D0C0A0 | [WM-mid] Coastal oat #CCBA98
[CL-sheer] Cool white cotton #F0F4F2 | [CL-sheer] Sea mist sheer #EBF0F0 | [CL-mid] Soft aqua linen #C8DED8
[CM-mid] Duck egg curtain #A8C8C0 | [CM-heavy] Teal linen #6A9898 | [CM-heavy] Seafoam heavy #7AAAA4
[WM-heavy] Terracotta coastal #B8806A | [WM-heavy] Coral linen #C08878 | [WD-heavy] Deep rust #A04828
[CD-heavy] Deep teal panel #3A7070 | [CD-heavy] Navy coastal #2A4060 | [CD-heavy] Dark ocean #2A3848
[WL-mid] Gauzy white #EEE8DC | [CM-mid] Sage coastal #90A898 | [CL-mid] Pale blue sheer #C8D8E0
[WD-heavy] Driftwood linen #8A7260 | [NM-mid] Greige natural #B8B4AE | [WM-mid] Warm ecru #D4C4A8
[CD-heavy] Dark harbour blue #2A3A50 | [CM-mid] Coastal grey-blue #9AAAB4 | [WM-heavy] Sandy heavy #C8B898

ACCENT / DARK ANCHOR BANK
Dark wicker basket #4A3020 | Navy-black trim #1C2C3A | Deep ocean ceramic #2A4848
Aged iron hardware #2A2828 | Dark driftwood frame #4A3828 | Charcoal rope detail #3A3830
Deep teak tray #3A2A1A | Navy trim #1E2E48 | Dark rattan lamp #4A3420
Iron anchor hardware #2A2A28 | Black iron plant stand #2A2A28 | Deep ocean glass #2A4A48
Dark woven mat #3A2E22 | Iron black candle #2A2828 | Ebony driftwood art #2A2018

COASTAL ABSOLUTE RULES:
✗ No nautical clichés — no anchors, no rope coils, no ship wheels
✗ No tropical Hawaiian prints — no palm prints, no flamingos
✗ No all-white flat unlit image — always warm/cool contrast and dark anchor
✓ Natural light always generous and warm — sun has a role even in evening shots
✓ Texture: smooth painted wall + rough rattan/wicker + soft linen always present
`,

  'modern-farmhouse': `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODERN FARMHOUSE PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style character: shiplap/board-and-batten walls, warm wood, matte black iron, chalk paint.
Wall texture is critical — plank lines or visible brushwork always present.

WALL COLOUR BANK (52 options)
[WL] Bright shiplap white #F5F2EC | [WL] Warm farmhouse white #F2EFEA | [WL] Cream shiplap #EEE8DC
[WL] Cotton white #F0EDE6 | [WL] Cloud white board #EDE8DF | [WL] Milk white #EDEAE4
[WL] Antique white panel #E8E3DA | [WL] Linen white #E4DDD4 | [WL] Warm chalk #E0D9D0
[WM] Warm greige board #D8D0C4 | [WM] Parchment panel #D4CABC | [WM] Warm putty #D0C6B4
[WM] Cream board #CCC0A8 | [WM] Warm linen panel #C8BA9E | [WM] Biscuit shiplap #C4B494
[WM] Harvest wheat board #C0AC88 | [WM] Warm oat #BCAA80 | [WM] Sandy shiplap #B8A478
[WM] Sage farmhouse #94A888 | [WM] Muted sage board #8E9E82 | [WM] Dusty sage #8A9878
[WM] Soft sage green #90A47C | [WM] Farmhouse sage #869A74 | [WM] Kitchen sage #82966E
[CM] Blue-grey board #8A9AAC | [CM] Dusty blue panel #8898A8 | [CM] Slate shiplap #8496A4
[CM] Farmhouse blue #7E909E | [CM] Steel blue board #7A8C9A | [CM] Pewter panel #909498
[WD] Terracotta board #B87860 | [WD] Russet shiplap #A86848 | [WD] Deep terracotta #9C5E3A
[WD] Warm sienna board #A86040 | [WD] Dark rust panel #8C4830 | [WD] Spice shiplap #A06038
[CD] Charcoal board #3C3A36 | [CD] Dark board & batten #383430 | [CD] Soot grey shiplap #3A3630
[CD] Deep navy board #1E2E50 | [CD] Dark farm navy #2A3E58 | [CD] Slate dark panel #3A4048
[WD] Warm walnut panel #5C3A20 | [CD] Dark olive board #3A4228 | [WD] Deep brown plank #4A3020
[CD] Midnight farmhouse #2A2820 | [CM] Dark grey board #5A5C5E | [WD] Deep amber board #7A4820

FURNITURE COLOUR BANK (35 options)
[WL] Distressed white painted #F0EAE0 | [WL] Chalk white #EDE6DC | [WL] Cream painted shaker #E8E0D0
[WL] Antique white cabinet #E4DCD0 | [WL] Off-white farmhouse #E0D8C8 | [WM] Warm cream painted #D8CDB8
[WM] Reclaimed pine natural #D0A870 | [WM] Aged pine #C89860 | [WM] Warm honey pine #C8A068
[WM] Reclaimed oak #B89060 | [WM] Weathered barn wood #A88060 | [WM] Warm wheat wood #C0A070
[WM] Honey butcher block #C8A260 | [WM] Sage painted shaker #8A9878 | [WM] Duck egg painted #8EB0A8
[NM] Greige painted shaker #B8B0A4 | [WD] Aged walnut stain #7A5838 | [WD] Dark barn wood #6A4828
[WD] Reclaimed dark oak #7A6048 | [WD] Aged hickory #8A6848 | [CD] Matte black painted #2A2820
[CD] Iron-black cabinet #2A2828 | [CD] Dark navy painted #2A3E58 | [WD] Dark stained wood #5C3820
[CD] Charcoal painted #3C3830 | [WM] Warm maple #D4A878 | [WD] Espresso stain #4A2E14
[WM] Butter yellow painted #D8B850 | [CM] Dusty blue painted #8898A8 | [WD] Deep walnut #6B4E35
[CD] Black-brown painted #2E2820 | [WM] Terracotta painted #B87848 | [CM] Slate painted #6A7880

CURTAIN BANK (30 options)
[WL-sheer] White cotton sheer #F8F5F0 | [WL-mid] Drop cloth natural #E0D4B8 | [WL-mid] Muslin cream #DDD4C0
[WL-mid] Linen cream #E4DAC8 | [WM-mid] Warm ticking stripe linen #D4C4A0 | [WM-heavy] Natural canvas #D0BA98
[WM-mid] Warm oat linen #CEC0A0 | [WM-heavy] Warm hemp #C4B490 | [CM-mid] Dusty blue linen #9AAAB4
[CM-heavy] Blue-grey panel #8898A8 | [CL-sheer] Cool white cotton #F2F4F0 | [WD-heavy] Dark charcoal linen #4A4844
[CD-heavy] Deep navy panel #2A3E58 | [WD-heavy] Deep rust curtain #8A4828 | [WM-heavy] Terracotta heavy #B07848
[WD-heavy] Warm dark brown #6A4828 | [WM-mid] Sage linen farmhouse #8A9878 | [CM-mid] Grey-blue cotton #8898A8
[NM-mid] Greige natural #B8B4A8 | [WL-mid] Off-white drop cloth #DDD6C8 | [CD-heavy] Charcoal wool #3A3830
[WM-heavy] Burlap natural #B89A70 | [CL-mid] Soft pale blue #C8D4DC | [WD-heavy] Dark sienna #8A5030
[CD-heavy] Dark slate linen #4A5058 | [WM-mid] Warm wheat linen #CCBA98 | [WL-heavy] Cream cotton duck #E4D8C4
[WD-heavy] Dark olive panel #4A5030 | [WM-mid] Dusty rose cotton #D0A898 | [NM-heavy] Stone grey wool #A8A4A0

ACCENT / DARK ANCHOR BANK
Matte black iron hardware #2A2820 | Matte black pipe leg #2A2828 | Dark iron handle #2A2A24
Cast iron trivet #2A2820 | Black pipe shelf bracket #1C1C1C | Dark barn hinge #2A2424
Aged iron hook #2C2828 | Matte black lantern #282828 | Dark iron candle holder #2A2820
Wrought iron bin #2A2828 | Black metal basket #2A2A28 | Dark iron frame #2A2820
Charcoal ceramic vessel #3C3830 | Dark walnut tray #3C2810 | Deep wood crate #4A3020

MODERN FARMHOUSE ABSOLUTE RULES:
✓ Wall texture must be visible — shiplap planks, board-and-batten lines, or brushwork
✓ Matte black hardware (handles, pipes, hooks) always serves as dark anchor
✗ No glossy finishes — always matte paint, raw wood, or rough texture
✗ No ornate decorative elements — clean, functional forms only
✓ Wood must appear reclaimed, aged, or weathered — not fresh off-the-shelf
`,

  boho: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOHO PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style character: layered, rich, earthy, global, collected. Texture IS the design.
Every image must show visible layering — rugs, textiles, plants, stacked objects.

WALL COLOUR BANK (52 options)
[WL] Raw plaster warm #E8DCC8 | [WL] Warm bone white #EDE5D4 | [WL] Pale boho cream #EAE0CC
[WL] Warm muslin #E4D8C4 | [WL] Unbleached cotton #E0D4BC | [WL] Pale sand plaster #DDD4C0
[WM] Terracotta mist #D4B090 | [WM] Warm adobe #D0A888 | [WM] Clay plaster #CC9E80
[WM] Warm ochre pale #D4A860 | [WM] Dusty turmeric #CCA050 | [WM] Muted gold plaster #C89840
[WM] Rust plaster light #C8906A | [WM] Burnt orange mist #C08058 | [WM] Deep rust plaster #BC7848
[WM] Warm cinnamon #B07040 | [WM] Boho clay dark #A86838 | [WM] Spice plaster #A46030
[WD] Deep terracotta #9A5030 | [WD] Warm sienna #8A4828 | [WD] Rust dark plaster #884020
[WD] Deep ochre dark #7A5828 | [WD] Dark clay warm #6A4020 | [WD] Warm umber #5C3820
[WD] Forest boho #4A5A3A | [WD] Deep jungle #3A5030 | [WD] Moody olive #4A5228
[CD] Deep indigo #2A2C68 | [CD] Dark plum boho #3A2040 | [CD] Deep teal boho #1E4848
[CD] Midnight boho #2A2030 | [CD] Dark burgundy plaster #4A1828 | [CD] Deep wine #3A1420
[CM] Dusty sage boho #8A9878 | [CM] Muted olive mid #7A8860 | [CM] Cool plaster grey #9A9E98
[CL] Pale sage boho #C8D0C0 | [CL] Cool clay white #D8DDD8 | [WM] Warm teal plaster #6A9898
[WD] Deep golden brown #7A4820 | [CM] Earthy grey plaster #888480 | [WD] Warm mahogany #6A3820
[CD] Deep boho purple #3A1E48 | [WM] Smoked rose #C89090 | [WD] Dark amber brown #6A4428

FURNITURE COLOUR BANK (35 options)
[WL] Natural linen upholstered #E4D8C4 | [WL] Cream fabric sofa #E0D4BC | [WM] Natural rattan #C4A870
[WM] Honey wicker #C0A060 | [WM] Warm cane #BC9A58 | [WM] Natural seagrass #B89850
[WM] Raw jute woven #B89060 | [WM] Warm wood carved #C09060 | [WM] Aged warm pine #B88858
[WM] Carved teak #A87848 | [NM] Raw linen sofa #C8C0B0 | [WD] Dark carved walnut #6A4828
[WD] Ebony carved #4A2E14 | [WD] Deep mahogany carved #5C3020 | [WD] Dark teak boho #5A3820
[CD] Indigo painted #2A3A68 | [CD] Deep teal painted #1E4848 | [CD] Dark plum painted #3A1828
[WM] Rust-painted chest #9C4A28 | [WM] Olive painted #7A8A50 | [WM] Sage painted boho #7A9068
[WD] Dark forest painted #3A5028 | [WM] Terracotta painted #B87848 | [CM] Deep teal furniture #2A6868
[WD] Dark bourbon wood #5C3018 | [WM] Amber natural wood #C89050 | [WD] Deep burnt wood #6A3A18
[CD] Midnight painted #2A2030 | [CM] Deep olive painted #4A5828 | [WM] Warm saffron painted #C89038
[CD] Dark burgundy painted #4A1828 | [WD] Deep sienna painted #8A4020 | [WM] Boho brass painted #B89030

CURTAIN BANK (30 options)
[WL-sheer] White cotton sheer #F5F0E8 | [WL-mid] Cream macramé panel #E8DCC8 | [WM-mid] Natural jute panel #C4A870
[WM-mid] Warm kantha cotton #D0B888 | [WM-heavy] Batik warm linen #A88858 | [WM-heavy] Embroidered natural #C8B080
[WM-mid] Boho weave natural #CCAA78 | [CD-heavy] Indigo block print #2A3A68 | [CD-heavy] Deep navy cotton #2A2C68
[WD-heavy] Rust linen heavy #9C4828 | [WD-heavy] Deep terracotta #884020 | [WD-heavy] Burnt sienna #8A4420
[CM-mid] Sage woven panel #8A9878 | [CM-heavy] Olive cotton #6A7848 | [WD-heavy] Dark gold panel #8A7028
[CL-sheer] Cool white #F0F4F0 | [CD-heavy] Deep plum #3A1828 | [CD-heavy] Dark teal boho #1E4848
[WM-heavy] Ochre heavy #B89030 | [WM-heavy] Saffron panel #C09030 | [WD-heavy] Dark amber curtain #7A4820
[NM-mid] Raw cotton unbleached #CEBFA0 | [WM-mid] Warm orange-pink #C89070 | [CD-heavy] Midnight boho #282030
[WM-heavy] Turmeric heavy #A88030 | [WM-mid] Warm mocha #A07850 | [CL-mid] Pale sage cotton #C8D4C0
[CD-heavy] Deep wine curtain #4A1420 | [WM-heavy] Deep rust heavy #8A4020 | [CM-mid] Dusty teal panel #5A8888

ACCENT / DARK ANCHOR BANK
Dark carved wood frame #3A2010 | Deep wicker basket #4A3020 | Indigo ceramic #2A2A68
Dark terracotta vessel #6A2810 | Ebony carved object #2A1A08 | Deep patina brass #6A4820
Dark woven trunk #4A3020 | Iron-black candle #2A2820 | Deep rattan tray #4A3028
Smoked glass vase #2A3028 | Dark macramé knot dark #3A2A18 | Deep oak carved #3A2010
Vintage dark wood #3A2818 | Deep teal ceramic #1E4040 | Dark plum textile shadow #2A1020

BOHO ABSOLUTE RULES:
✓ Layering is essential — rug on rug, throw on throw, objects clustered
✓ At least one large plant always present (trailing, large-leafed, or climbing)
✓ Mismatched objects tell a collected story — ceramics, baskets, weavings
✗ Never show a sparse or empty room
✗ Never show matching furniture sets
`,

  scandinavian: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCANDINAVIAN PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style character: light, functional, ordered. Light is the central character.
Every image feels purposeful — every object earns its place.

WALL COLOUR BANK (52 options)
[WL] Nordic white pure #F8F6F2 | [WL] Scandi cream #F5F3EE | [WL] Warm white wall #F2F0EA
[WL] Off-white smooth #EFF0EC | [WL] Pale warm white #ECEAE4 | [WL] Cloud white #E8E8E2
[WL] Soft white #E6E4DE | [WL] Warm paper #E4E0D8 | [WL] Pale ivory Scandi #E0DCD4
[WM] Warm pale grey #D8D4CC | [WM] Scandi greige #D4CFC6 | [WM] Warm stone light #D0CAC0
[WM] Pale wheat Scandi #D4C8B0 | [WM] Light birch tone #D0C4A0 | [WM] Warm sand Scandi #CCBEA0
[CM] Cool pale grey #D8DCE0 | [CM] Nordic cool grey #D4D8DC | [CM] Slate pale #D0D4D8
[CM] Cool mist grey #CCCFD4 | [CM] Nordic stone #C8CCD0 | [CM] Cool linen grey #C4C8CC
[WM] Dusty rose Scandi #D4A8A0 | [WM] Blush Nordic #CCAA9E | [WM] Muted rose #C8A49A
[WM] Terracotta Nordic #C09068 | [WM] Warm ochre Scandi #C89838 | [WM] Dusty yellow Scandi #CCAA48
[CM] Sage Nordic #8A9E88 | [CM] Forest sage #849880 | [CM] Pale forest Scandi #8A9A80
[CD] Nordic navy #1E2E50 | [CD] Forest green Scandi #2A4028 | [CD] Deep Scandi grey #3A3E42
[CD] Dark Nordic slate #2E3238 | [CD] Graphite Nordic #3C3C3A | [CD] Deep Scandi green #2A3C28
[CD] Midnight Nordic #1C2028 | [CD] Dark Scandi navy #1A2440 | [WD] Warm charcoal Scandi #3C3830
[WD] Dark Nordic brown #4A3820 | [CM] Warm mid grey Scandi #909898 | [WD] Deep rust Nordic #8A4828
[CM] Dusty teal Scandi #6A8888 | [CD] Bottle green Scandi #2A4030 | [CM] Steel blue Nordic #7A8898

FURNITURE COLOUR BANK (35 options)
[WL] Pale birch blonde #E0CCA8 — very pale birch | [WL] Light ash wood #DCC898 | [WL] Blonde pine #E4D4A8
[WL] White painted Nordic #F0EAE0 | [WL] Light oak Scandi #DCCA90 | [WM] Warm birch mid #D4BC80
[WM] Natural pine mid #CEB880 | [WM] Warm ash #C8B070 | [WM] Nordic oak golden #C4A868
[WM] Light teak Nordic #C0A060 | [WM] Honey ash #BCA058 | [NM] Grey painted Nordic #B4B0A8
[NM] Putty painted Scandi #C0BAB0 | [CM] Cool grey painted #9EA0A0 | [CM] Slate blue painted #8898A8
[WD] Dark ash stain #7A6040 | [WD] Dark oak Scandi #706040 | [WD] Smoked oak #6A5838
[CD] Charcoal painted Scandi #3C3830 | [CD] Dark navy painted #2A3A58 | [CD] Graphite painted #3A3C3E
[CD] Dark forest painted #2A3C28 | [CD] Midnight painted Scandi #1C2028 | [WM] Terracotta painted Nordic #C09060
[WM] Dusty rose painted #C8A0A0 | [WM] Ochre painted Scandi #C09830 | [CM] Dusty teal painted #6A8880
[WD] Warm walnut Scandi #7A5838 | [WL] Very pale grey white #E8E4DC | [WM] Light pine natural #D8C898
[CD] Very dark navy Scandi #1A2440 | [WM] Soft olive painted #8A9060 | [WD] Deep brown Scandi #5A4028

CURTAIN BANK (30 options)
[WL-sheer] White cotton Nordic #F8F6F2 | [WL-sheer] Pale linen sheer #F5F0E8 | [WL-mid] Natural linen Nordic #E4DAC8
[WL-mid] Off-white cotton #E0D8CC | [WL-heavy] Cream wool #E4DED0 | [WM-heavy] Ochre wool #C09838
[WM-heavy] Terracotta Nordic heavy #B87848 | [CD-heavy] Deep navy Scandi #2A3A58 | [CD-heavy] Forest green heavy #2A3C28
[CM-mid] Grey-blue linen #9AAAB4 | [CM-heavy] Dusty teal heavy #6A8880 | [CL-mid] Cool pale grey #D0D4D8
[CL-sheer] Cool white sheer #F0F4F2 | [WD-heavy] Dark charcoal wool #3C3830 | [WD-heavy] Warm dark linen #5A4828
[NM-mid] Natural greige #C4BEB4 | [WM-mid] Dusty rose Scandi #C8A8A4 | [CM-mid] Slate linen #9898A0
[WL-mid] Crisp white cotton mid #EEE8E0 | [CD-heavy] Graphite heavy #3A3C3E | [WM-mid] Warm sand Scandi #D4C4A0
[CM-heavy] Muted blue-grey #8898A8 | [WM-mid] Pale ochre linen #CCBA80 | [CL-mid] Nordic pale aqua #C0CED4
[CD-heavy] Midnight Nordic #1C2028 | [WD-heavy] Deep burnt sienna #7A4020 | [WL-heavy] Heavy white linen #E8E2D8
[CM-mid] Sage Nordic linen #90A090 | [NM-heavy] Stone grey wool #A0A0A0 | [WM-mid] Blush cotton #D4ACA4

ACCENT / DARK ANCHOR BANK
Matte black frames #2C2C2A | Black candle holders #2A2828 | Charcoal ceramic #3A3830
Dark iron lamp #2A2820 | Black graphic vase #252320 | Dark slate vessel #2E3438
Smoked glass #3A3C3A | Matte black tray #2A2A28 | Dark charcoal pot #3A3830
Midnight blue ceramic #1E2840 | Dark graphite object #363636 | Black iron frame #1C1C1C

SCANDINAVIAN ABSOLUTE RULES:
✓ Candles always present in any evening/intimate shot
✓ At least one plant — pothos, monstera, or branch in simple vase
✓ One graphic element only — single cushion or rug
✗ No clutter — ordered and purposeful rooms only
✗ No ornate or decorative elements
`,

  cottagecore: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COTTAGECORE PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style character: romantic, botanical, antique patina. Flowers and aged objects essential.
Furniture must look inherited, painted, or found — never flat-pack new.

WALL COLOUR BANK (52 options)
[WL] Antique cream #F2E8D4 | [WL] Buttermilk #F0E4CC | [WL] Soft ivory cottage #EEE2CC
[WL] Warm white cottage #EAE0D0 | [WL] Pale parchment #E8DCCC | [WL] Cream plaster cottage #E4D8C4
[WL] Old lace #E0D4BC | [WL] Antique muslin #DDD0BC | [WL] Warm vintage white #DAD0C0
[WM] Butter yellow #E8D080 | [WM] Soft butter #E4CA70 | [WM] Warm custard #E0C464
[WM] Straw gold #D8BC5A | [WM] Vintage yellow #D4B658 | [WM] Harvest gold #CCB050
[WM] Blush warm #E8BCAC | [WM] Pale rose #E4B4A4 | [WM] Dusty rose wall #DCAC9A
[WM] Warm blush #D8A898 | [WM] Antique rose #D4A494 | [WM] Muted rose plaster #D0A090
[CM] Duck egg #8EB8B0 | [CM] Robin egg #88B4AC | [CM] Faded duck egg #82AEA6
[CM] Pale teal cottage #7CA8A0 | [CM] Muted aqua #76A29A | [CM] Faded sea green #709A92
[CM] Sage cottage #94A880 | [CM] Garden sage #8EA278 | [CM] Dusty sage #889C70
[CM] Cottage sage pale #AABB98 | [CM] Soft sage #A4B690 | [CM] Muted garden green #9CB088
[CM] Lavender cottage #A898B8 | [CM] Dusty lavender #A494B4 | [CM] Muted mauve #9E8EAC
[CM] Lilac cottage #B4A8C0 | [CM] Dusty lilac #B0A4BC | [CM] Faded violet #A89EB8
[WD] Dried rose #7A4858 | [WD] Deep blush dark #704050 | [CD] Dark hedge green #2A4030
[CD] Cottage midnight #2C2028 | [WD] Warm mossy dark #4A5A3A | [CD] Deep duck egg dark #2A5048
[WD] Terracotta cottage #A86848 | [WD] Dark amber cottage #7A4820 | [CD] Dark lavender deep #3A2C48

FURNITURE COLOUR BANK (35 options)
[WL] Aged white painted #F0EAE0 | [WL] Chalk white distressed #ECEAE0 | [WL] Antique cream painted #E8E0D0
[WL] Whitewashed cottage #E4DCCC | [WL] Faded white #E0D8C8 | [WM] Pale sage painted #A4B690
[WM] Sage green painted #8EA278 | [WM] Duck egg painted #8EB8B0 | [WM] Butter yellow painted #E0C464
[WM] Soft rose painted #D4A494 | [WM] Dusty pink painted #C8A098 | [WM] Lavender painted #B4A8C0
[WM] Aged pine natural #C8A068 | [WM] Antique oak #B89060 | [WM] Warm old pine #C09858
[WM] Reclaimed cottage wood #B89060 | [NM] Stone painted #B4B0A8 | [WD] Dark aged oak #6A5038
[WD] Victorian dark walnut #5C3828 | [WD] Aged mahogany #6A4030 | [WD] Dark antique pine #5A4028
[CD] Dark forest green painted #2A3C28 | [CD] Deep hedgerow painted #2A3820 | [WD] Dark rose painted #6A3848
[CD] Dark cottage navy #2A2E48 | [WD] Deep terracotta cottage #8A4828 | [WM] Old cream lace painted #DECBA8
[CM] Pale blue painted #8898B4 | [WM] Warm terracotta painted #B87850 | [CD] Dark midnight cottage #2A2030
[WM] Soft gold painted #C8A84A | [CM] Dusty teal cottage #6A8880 | [WD] Deep rose painted #7A3848

CURTAIN BANK (30 options)
[WL-sheer] White cotton eyelet #F8F2EC | [WL-sheer] Lace panel #F5F0E8 | [WL-mid] White floral cotton #F0EAE0
[WL-mid] Cream eyelet cottage #EEE4D4 | [WL-mid] Antique white cotton #E8DED0 | [WM-mid] Butter cotton cottage #E0C870
[WM-mid] Blush linen cottage #D8ACA0 | [WM-mid] Rose cotton #D4A898 | [WM-mid] Dusty pink cotton #CCA09A
[CM-mid] Duck egg linen #88B4AC | [CM-mid] Sage cotton cottage #8EA278 | [CM-light] Pale lavender sheer #C8C0D8
[CM-mid] Muted aqua linen #76A29A | [WM-heavy] Deep rose linen #B07878 | [WD-heavy] Dark cottage rose #7A3848
[CD-heavy] Dark hedge green curtain #2A3820 | [WD-heavy] Warm dark brown cottage #6A4028 | [WM-heavy] Terracotta floral #A86848
[WM-mid] Vintage floral cream #E0D0B0 | [CL-sheer] Pale blue sheer cottage #D4E0E8 | [NM-mid] Greige natural linen #C4BEAD
[WM-heavy] Ochre vintage #C4A840 | [CD-heavy] Deep navy cottage #2A2E48 | [WM-mid] Warm hemp natural #C4A878
[WL-mid] Gingham cream check #E8E0CC | [WM-mid] Pale gingham sage #C8D0B8 | [CM-heavy] Forest cottage heavy #2A4030
[WL-heavy] White embroidered heavy #E8E4DC | [WD-heavy] Dark plum cottage #4A1E38 | [CM-mid] Soft sage cotton #A4B690

ACCENT / DARK ANCHOR BANK
Dark iron bed frame #3A3030 | Aged iron hooks #2C2828 | Dark Victorian iron #2A2420
Antique dark walnut #3C2818 | Dark aged oak #3A2818 | Victorian ironwork black #1C1C1C
Old dark brass hardware #5C4020 | Aged copper patina #6A4820 | Dark wood carved frame #3A2018
Dark tarnished silver #4A4848 | Deep moss dark #2A3820 | Dark berry ceramic #3A1820

COTTAGECORE ABSOLUTE RULES:
✓ Flowers and botanicals always present — dried bunches, fresh garden flowers, botanical prints
✓ Aged, painted, or inherited furniture — never new-looking flat-pack
✓ At least one embroidered/lace/eyelet textile per image
✗ No modern minimalist elements — no handleless cabinetry, no concrete
✗ No bright saturated colours — everything muted, dusty, faded
`,

  'mid-century-modern': `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MID-CENTURY MODERN PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style character: tapered legs, organic forms, warm neutrals + bold accent.
Furniture silhouette is the hero — always show form clearly.

WALL COLOUR BANK (52 options)
[WL] Warm white MCM #F5F2EC | [WL] Cream MCM #F2EDE4 | [WL] Warm ivory MCM #EEE8DC
[WL] Soft warm white #ECE8E0 | [WL] Pale warm MCM #E8E4DC | [WL] MCM cream plaster #E4E0D8
[WM] Warm sand MCM #E0D4BC | [WM] MCM wheat #D8CAA8 | [WM] Golden sand #D4C498
[WM] Mustard pale #D4B840 | [WM] Pale mustard wall #D0B438 | [WM] Warm ochre light #CCAC34
[WM] Muted olive light #BACCA8 | [WM] Pale olive wall #B8C8A0 | [WM] Dusty olive #B4C498
[WM] Avocado pale #A8B880 | [WM] Muted avocado #A0B278 | [WM] Sage MCM #98AC70
[WM] Burnt orange mist #D4906A | [WM] Peach MCM #D09878 | [WM] Warm peach wall #CCA080
[WM] Warm terracotta MCM #C87850 | [WM] MCM rust light #C47040 | [WM] Deep rust MCM #BC6838
[CM] Dusty teal MCM #4A8A88 | [CM] MCM teal mid #3E8080 | [CM] Warm teal mid #3A7878
[CM] Cool aqua MCM #5A9898 | [CM] MCM sea blue #5A8A98 | [CM] Slate MCM #7A9098
[CM] Powder blue MCM #9AB0C0 | [CM] Dusty sky MCM #98ACC0 | [CM] Steel blue MCM #8898A8
[WD] Walnut panel dark #4A2E14 | [WD] Dark teak panel #3A2810 | [WD] Deep oak panel #4A3218
[CD] MCM charcoal #3C3A36 | [CD] Dark walnut panel #3A2A18 | [CD] Deep olive MCM #2A3820
[CD] Midnight MCM #2A2030 | [CD] Navy MCM dark #1E2E50 | [CD] Dark teal MCM panel #1E3838
[WD] Burnt sienna deep #9A4020 | [WD] Deep ochre dark #8A6820 | [CD] Graphite warm MCM #3A3830
[CM] Warm mid grey MCM #8A8880 | [WM] Warm blush MCM #D09898 | [WD] Deep rust dark #8A3820

FURNITURE COLOUR BANK (35 options)
[WM] Walnut mid #9C7A52 — tapered legs | [WM] Teak light #A87848 — MCM teak
[WD] Dark walnut #6B4E35 — rich walnut | [WD] Dark teak #6A4830 — deep teak
[WD] Ebony stain MCM #3C2A1A — very dark | [WL] Cream upholstered #F0E8D8 — tulip chair
[WL] White fibreglass shell #F5F2EC — Eames shell | [WM] Mustard velvet sofa #C8960A
[WM] Burnt orange upholstered #B85A20 | [WM] Olive fabric MCM #8A8848 | [WM] Teal upholstered #3A7878
[WM] Rust fabric MCM #9A3820 | [WM] Warm caramel leather #C08040 | [WM] Saddle leather #A87040
[CM] Cool grey fabric #909090 | [CM] Charcoal fabric MCM #4A4844 | [CM] Slate fabric #6A7078
[WD] Walnut credenza #8A6040 — flat-front long | [WD] Teak sideboard #7A5838 — low horizontal
[WM] Walnut hairpin table #9C7A52 | [WD] Dark walnut arc lamp #5C3820 | [WM] Warm brass metal #C8960A
[WD] Walnut plywood #7A6040 | [WM] Warm teak bench #A87848 | [CD] Iron-black arc lamp #2A2820
[WM] Saffron yellow chair #C89030 | [CM] Deep teal accent chair #2A6868 | [WD] Pecan stain #8A6040
[WM] Caramel tan leather #C09058 | [WD] Dark oak MCM #5C4028 | [WM] Warm honey wood #C8A060
[CD] Charcoal lacquer MCM #3C3830 | [WM] Pale blush upholstered #D4A8A0 | [CM] Steel blue chair #6A8898

CURTAIN BANK (30 options)
[WL-sheer] Warm white sheer #F8F5F0 | [WL-mid] Ivory linen MCM #EAE0CC | [WL-heavy] Cream heavy drape #E4DACC
[WM-heavy] Mustard wool drape #C8960A | [WM-heavy] Burnt orange panel #B85A20 | [WM-heavy] Rust heavy #A04820
[WM-heavy] Olive drape #8A8848 | [WM-mid] Warm teal mid #4A9090 | [CM-heavy] Deep teal MCM heavy #2A6868
[CM-heavy] Steel blue drape #6A8898 | [CM-mid] Dusty aqua #7AA0A8 | [CD-heavy] Deep navy MCM #1E2E50
[CD-heavy] Dark graphite MCM #3A3830 | [CD-heavy] Charcoal wool MCM #3C3A36 | [WD-heavy] Deep rust MCM #8A3820
[WM-mid] Pale mustard linen #D4C048 | [CM-mid] Muted powder blue #9AB0C0 | [WL-mid] Natural linen warm #E0D4C0
[NM-mid] Greige MCM linen #B8B4A8 | [WM-heavy] Dark ochre wool #9A7828 | [CD-heavy] Midnight MCM #1E2028
[WM-mid] Warm sand MCM #D4C4A0 | [CM-mid] Dusty teal mid #5A8888 | [WD-heavy] Deep teak panel #4A3218
[WL-heavy] Pale cream heavy #E8E0D0 | [WM-heavy] Saffron heavy #C08830 | [CD-heavy] Dark olive heavy #2A3820
[CM-heavy] Cool grey MCM heavy #7A8080 | [WD-heavy] Dark sienna drape #8A4820 | [WM-heavy] Warm gold drape #C0900A

ACCENT / DARK ANCHOR BANK
Dark walnut tapered leg #3A2010 | Iron-black arc lamp base #2A2820 | Dark teak frame #3A2810
Ebony hairpin leg #2A1C0A | Matte black lamp stem #1C1C1C | Dark walnut credenza edge #3C2818
Iron base tulip table dark #2A2820 | Charcoal globe shade #3A3830 | Dark walnut tray #3C2810
Ebony lacquer box #1C1C18 | Smoked glass vase #2A2C2A | Cast iron bookend #2A2828

MCM ABSOLUTE RULES:
✓ Tapered legs always visible on furniture — form is the statement
✗ No rustic or distressed finishes — smooth, polished, purposeful
✗ No patterns on walls — single graphic rug or one accent cushion only
✗ No chrome — brushed brass, walnut, or matte iron only
✓ Arc lamp or globe pendant in living/bedroom shots
✓ Low-profile furniture — never tall heavy armoires
`,

  general: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROOM IDEAS PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: The article keyword determines the dominant wall colour.
If the article is "sage green bedroom" → wall must be a sage green from this bank.
If the article is "navy bedroom" → wall must be a navy from this bank. Adapt accordingly.
Style is aspirational but accessible — beautiful rooms any reader could achieve.

WALL COLOUR BANK (60 options — covering all colour keywords)
── Sage & Green Tones ──
[CM] Dusty sage #8A9E7A | [CM] Grey-sage #8A9878 | [CM] Warm sage #94A87A | [CM] Cool sage #88A07A
[CM] Light sage #A4B890 | [CM] Pale sage #B4C8A4 | [WD] Forest green #3A5A3A | [CD] Deep forest #2E4830
[CD] Dark hunter green #2A4228 | [WD] Olive dark #5A6840
── Navy & Blue Tones ──
[CD] Deep navy #1E2E50 | [CD] Rich navy #1A2848 | [CD] Classic navy #22304A | [CM] Slate blue #7090A8
[CM] Dusty blue #7A92A8 | [CM] Mid denim #6A8098 | [CL] Pale blue #A8C0D0 | [CL] Sky blue #A0B8C8
── Blush & Pink Tones ──
[WM] Warm blush #E8C8BC | [WM] Dusty rose #D8A898 | [WM] Pale blush #F0D8D0 | [WM] Antique rose #D4A494
[WM] Muted pink #CCAA9E | [WM] Deep blush #C49080 | [WD] Dark dusty rose #8A4858
── Terracotta & Rust ──
[WM] Light terracotta #D4946A | [WM] Warm terracotta #C87850 | [WD] Deep terracotta #9A5838
[WD] Rich terracotta #A06040 | [WD] Rust red #8C4828 | [WD] Deep rust #8A3820
── Grey & Neutral ──
[WL] Warm white #F5F2EC | [NL] Pure white #F8F8F6 | [WM] Warm greige #C8C0B4 | [NM] Mid grey #B8B4B0
[NM] Warm grey #C0BAB0 | [WM] Greige light #D4CEC4 | [ND] Charcoal room #3C3A36 | [ND] Dark grey #404040
── Yellow & Ochre ──
[WM] Butter yellow #E8D080 | [WM] Warm yellow #E0C860 | [WM] Mustard pale #D0B040 | [WM] Deep ochre #C09030
── Purple & Lavender ──
[CM] Dusty mauve #A88898 | [CM] Muted purple #9A8AAA | [CM] Pale lavender #BEB4CC | [CD] Deep plum #3A1848
── White Variations ──
[WL] Crisp white #F8F5F0 | [WL] Warm white #F2EDE6 | [CL] Cool white #F0F4F4 | [WL] Off-white #ECE8E0
── Dark Dramatic ──
[CD] Black-charcoal #2A2828 | [CD] Dark teal #1E4848 | [WD] Dark brown #3C2418 | [CD] Midnight #1C1C28

FURNITURE COLOUR BANK (35 options — aspirational but accessible)
[WL] White painted #F0EAE0 | [WL] Cream painted #EDE5D4 | [WL] Light grey painted #E4E0D8
[WM] Natural oak #C8A870 — warm accessible | [WM] Light blonde wood #D8C490 | [WM] Warm pine #D0A870
[WM] Honey wood #C4A068 | [WM] Warm mid-oak #B89860 | [NM] Grey-brown painted #B0AAA0
[WM] Rattan natural #C4A870 | [WM] Warm cane #BC9A58 | [CM] Dusty blue painted #8898A8
[CM] Sage green painted #8A9878 | [WM] Terracotta painted #B87848 | [WM] Blush painted #D0A898
[WD] Dark walnut #6B4E35 | [WD] Dark oak #7A6040 | [WD] Warm dark wood #7A5838
[CD] Charcoal painted #3C3830 | [CD] Matte black #2A2820 | [CD] Dark navy painted #2A3E58
[WM] Warm maple #D4A878 | [WM] Natural wicker #C0A060 | [WD] Espresso brown #4A2E1A
[CM] Dark grey painted #5A5C5E | [WL] Very pale grey #E8E4DC | [WM] Warm amber wood #C89050
[CD] Midnight painted #1C2028 | [WD] Deep forest painted #3A5028 | [WM] Brass accent table #C89038
[NL] White upholstered #EEE8E0 | [WM] Grey-beige upholstered #D0C8BC | [CD] Deep teal painted #1E4848

CURTAIN BANK (30 options)
[WL-sheer] White sheer #FAF8F4 | [WL-mid] Linen natural #E4DAC8 | [WL-heavy] Cream heavy #E8E0D0
[WM-mid] Warm oat #D4C4A0 | [WM-heavy] Terracotta linen #B87848 | [CM-heavy] Deep navy #2A3E58
[CM-mid] Dusty blue #8898A8 | [CM-heavy] Sage green heavy #7A9068 | [WD-heavy] Dark charcoal #3C3830
[WD-heavy] Deep forest #2A4030 | [WM-mid] Blush linen #D4A8A0 | [CM-heavy] Teal heavy #2A6868
[WL-sheer] Cool white sheer #F2F4F2 | [CD-heavy] Midnight heavy #1C1C28 | [WM-heavy] Rust heavy #9A4828
[NM-mid] Greige natural #C0BCB4 | [WM-mid] Warm sand #D0C0A0 | [CD-heavy] Deep plum #3A1848
[WM-heavy] Deep ochre #9A7828 | [CM-mid] Slate blue #9AAAB4 | [WL-mid] Off-white cotton #E8E0D0
[WD-heavy] Dark sienna #8A4820 | [CM-mid] Pale aqua #A8C8D0 | [CD-heavy] Dark teal heavy #1E4040
[WM-mid] Dusty rose linen #C8A098 | [WM-heavy] Warm mustard #C09030 | [CL-mid] Light blue #B8D0DC
[WD-heavy] Dark warm brown #5A3820 | [CM-heavy] Deep slate #4A5060 | [WL-heavy] Pure white heavy #F0EBE4

ACCENT / DARK ANCHOR BANK
Matte black lamp #2A2820 | Dark walnut frame #3C2818 | Iron-black vase #2A2828
Charcoal ceramic #3A3830 | Dark wood tray #3C2810 | Matte black handle #1C1C1C
Dark greenery plant #2A3820 | Ebony frame art #2A2420 | Smoked glass #3A3C3A
Dark bronze accent #4A3820 | Black iron rod #2A2828 | Deep forest plant pot #2A3828
`,

  garden: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GARDEN & OUTDOOR PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT: These are EXTERIOR/OUTDOOR photography rules.
Sky, plants, water, stone, and natural light are the colour palette sources.
No artificial room lighting — natural light with golden hour emphasis.

HARDSCAPE / SURFACE BANK (25 options — the primary surface colour)
[WL] Travertine cream #D4C4A8 | [WL] Limestone pale #CCBCA0 | [WL] Pale concrete #C8C4BC
[WM] Warm sandstone #C4A878 | [WM] Honey sandstone #C0A060 | [WM] Warm terracotta paving #B87848
[WM] Old brick path #A86848 | [WM] Warm gravel #C0AC88 | [WM] Pale pea gravel #D0C4A4
[WM] Cedar timber deck #B89060 | [WM] Oiled teak deck #8A6040 | [WM] Warm pine deck #C09060
[NM] Cool grey concrete #9A9890 | [NM] Slate grey paving #8A8C8E | [NM] Dark porcelain #5A5C5E
[WD] Dark brick #7A4828 | [WD] Aged terracotta dark #7A4020 | [CD] Dark slate paving #3A4040
[CD] Black granite #2A2828 | [CD] Dark limestone wet #4A4840 | [WM] Gravel French grey #B0B0A4
[WL] White render wall #F2EDE6 | [WM] Stone wall warm #C0B098 | [CM] Cool stone wall #989C9C

SKY / BACKGROUND COLOUR BANK (20 options)
[CL] Pure blue summer #5A90C0 | [CL] Deep blue midday #4A80B0 | [CM] Steel grey overcast #8898A8
[WM] Golden hour warm sky #E8A040 | [WD] Amber sunset #C07820 | [CD] Deep blue dusk #2A3A60
[CL] Pale morning blue #8AB0C8 | [CM] Autumn blue #5A7898 | [WL] Bright noon white-blue #C8D8E8
[CD] Night sky deep #1A2038 | [WM] Rose sunset #D08070 | [WM] Warm dusk orange-pink #D09060
[CM] Storm grey #6A7078 | [CL] Spring pale blue #A4C0D0 | [WL] Hazy summer pale #D0DCEA
[CM] Overcast flat grey #9A9C9E | [WD] Deep sunset amber #B06820 | [CM] Late afternoon blue #6A8AAA

PLANTING COLOUR BANK (15 options)
Deep forest green foliage #2A4028 | Mid garden green #4A6A3A | Bright grass green #5A8040
Pale sage green #8AA878 | Dark hedge green #2A3820 | Bronze autumn maple #8A4820
Amber autumn leaf #B06820 | Lavender flower #8A78A8 | Rose pink bloom #C87888
Bougainvillea magenta #C03878 | White flower bloom #F0EAE4 | Yellow daisy bright #D4A820
Ornamental grass amber #B89840 | Dark bamboo #3A4820 | Tropical palm dark #2A4A28

WATER COLOUR BANK (8 options)
Turquoise pool #5AB0C0 | Bright clear blue #4A98B0 | Deep teal pool #2A8090
Dark serene pool #2A6878 | Infinity pool blue #3A90A0 | Still pond green-grey #4A6858
Koi pond deep #3A5848 | Natural stream #5A7858

OUTDOOR FURNITURE BANK (20 options)
[WL] White linen outdoor sofa #F0EAE0 | [WL] Cream outdoor cushion #E8E0D0 | [WL] White cast iron #EEE8E0
[WM] Natural teak outdoor #9A7848 | [WM] Oiled teak chair #8A6838 | [WM] Natural rattan outdoor #C4A870
[WM] Warm wicker sectional #B09060 | [NM] Grey wicker #9A9690 | [WD] Dark wicker outdoor #5A4030
[WD] Dark teak furniture #6A4830 | [CD] Dark iron bistro #2A2820 | [CD] Black iron outdoor #1E1E1E
[WM] Cedar Adirondack #B89060 | [WM] Natural cedar porch swing #C0A068 | [WM] Bamboo furniture #B89840
[CM] Dusty blue outdoor #8898A8 | [WM] Terracotta orange cushion #B87848 | [CD] Midnight wicker #2A2828

GARDEN ABSOLUTE RULES:
✓ Natural light always has a clear source — sun angle visible in shadows
✓ Plants must look full and alive — no sparse or drooping greenery
✓ Sky always present unless close-up detail shot
✗ No obvious staging — some organic wildness adds authenticity
✗ No people, no furniture too perfectly arranged
`,

  'global-styles': `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL STYLES / HACIENDA PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style character: Mexican hacienda, architectural, hand-crafted.
Architectural elements (arches, thick walls, Saltillo tile, beamed ceilings) must be visible.

WALL COLOUR BANK (45 options)
── Terracotta & Adobe ──
[WL] White rough plaster #F0E8D8 | [WL] Brilliant white hacienda #F2EEE6 | [WM] Warm cream adobe #EDE0C8
[WM] Adobe warm #E0CEAA | [WM] Pale terracotta wash #D8B898 | [WM] Warm buff adobe #D0B088
[WM] Light terracotta plaster #CC9A6A | [WM] Mid terracotta #C48A5A | [WM] True terracotta #BC7848
[WM] Deep terracotta #B06840 | [WD] Rich clay red #9A5030 | [WD] Adobe sienna #8A4020
[WD] Deep burnt sienna #7A3818 | [WD] Deep adobe red #702818 | [WD] Dark rust hacienda #682010
── Ochre & Gold ──
[WM] Light ochre #D4A840 | [WM] Warm ochre #CC9E30 | [WM] Turmeric ochre #C09020
[WM] Deep ochre #B08818 | [WD] Dark ochre #9A7010 | [WM] Saffron plaster #D0A020
── White & Pale ──
[CL] Hacienda white cool #F4F6F2 | [CL] Courtyard white #F2F4F0 | [WL] Sun-bleached white #F0EDE8
── Colour Walls ──
[CD] Deep cobalt blue #1E3A8A | [CD] Bright cobalt #2A4A9A | [CM] Mid cobalt #3A5AAA
[CM] Dusty blue hacienda #5A78A8 | [WD] Deep terracotta dark #6A3818 | [CD] Midnight hacienda #1A1E38
[WD] Rich adobe red #802818 | [CD] Deep hacienda navy #1A2840 | [CD] Hacienda black #1E1E18
[WM] Sage hacienda #8A9E78 | [CM] Deep sage hacienda #6A8460 | [WD] Moss hacienda #4A5A38
[WM] Warm rose hacienda #C89080 | [WD] Deep rose hacienda #804850 | [CM] Dusty teal hacienda #4A7878
[WD] Deep burgundy hacienda #5A1828 | [WM] Golden yellow #D4A830 | [CD] Dark forest hacienda #2A3818

ARCHITECTURAL ELEMENT BANK (these must appear in most images)
Saltillo tile floor warm #C48050 | Dark terracotta tile #8A4828 | Talavera blue-white tile #2A4A9A
Exposed dark wood beam #5C3820 | White plaster arch reveal #F2EDE0 | Wrought iron chandelier #2A2820
Ornate iron grille black #1E1E1E | Hand-carved wood door #4A2E14 | Stone threshold #9A9490
Hacienda fountain stone #A8A0908 | Terracotta urn #B87848 | Clay pot large #C08058

FURNITURE BANK (25 options)
[WD] Dark hand-carved pine #5C3820 | [WD] Heavy rough oak #6A4828 | [WD] Dark mesquite wood #4A2E14
[WD] Painted colonial dark #3A2010 | [WM] Warm honey pine natural #C89060 | [WM] Aged pine natural #B88850
[CD] Wrought iron black furniture #2A2820 | [CD] Iron bed frame #2A2828 | [CM] Cobalt painted #2A4A9A
[WM] Terracotta red painted #A05030 | [WM] Hacienda yellow #D0A020 | [WD] Deep mahogany carved #5A2E14
[WL] White painted colonial #F0EAE0 | [CM] Dusty teal hacienda #4A7878 | [WM] Adobe orange painted #B86030
[WD] Dark colonial walnut #4A2E10 | [WM] Warm cerulean painted #5A7AAA | [WD] Deep forest hacienda #3A5028

CURTAIN BANK (20 options)
[WL-mid] White cotton hacienda #F0EAE0 | [WL-sheer] Cream sheer hacienda #EAE0D0 | [WM-heavy] Terracotta cotton #A05030
[WM-heavy] Warm ochre heavy #B09020 | [CD-heavy] Deep cobalt heavy #1E3A8A | [WD-heavy] Deep burgundy #5A1828
[WM-mid] Warm orange-rust #B06030 | [CM-heavy] Deep teal hacienda #2A5858 | [WL-mid] Natural linen hacienda #E0D4BC
[WM-heavy] Saffron heavy #C09020 | [CD-heavy] Navy hacienda #1A2840 | [WD-heavy] Deep sienna #7A3818
[WM-mid] Warm rose hacienda #C49080 | [CL-sheer] White courtyard sheer #F4F6F2 | [WM-mid] Adobe yellow cotton #D0A820
[WD-heavy] Dark forest hacienda #2A4028 | [WM-heavy] Warm rust heavy #9A4820 | [CM-mid] Dusty teal mid #4A7878
[WM-mid] Hand-loomed natural #C8B888 | [WM-heavy] Serape-inspired ochre #B09028

ACCENT / DARK ANCHOR BANK
Wrought iron black #1E1E1E | Iron chandelier #2A2820 | Dark carved wood frame #3A1E0A
Hand-painted Talavera dark #1E3878 | Cast iron candle holder #2A2828 | Dark iron lantern #1E1E18
Burnished copper #6A3818 | Deep terracotta vessel dark #6A2810 | Old iron lock #2A2420

GLOBAL STYLES ABSOLUTE RULES:
✓ Architectural elements (arches, beams, Saltillo tile, wrought iron) always visible
✓ Hand-crafted quality — Talavera, carved wood, hand-thrown ceramics
✗ No IKEA or modern minimalist elements
✗ No stark modern architecture
`,

  seasonal: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEASONAL PALETTE BANKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Three sub-systems: FALL / CHRISTMAS+WINTER / SPRING
The season must be immediately recognisable. No generic rooms.
READ THE ARTICLE TITLE to determine which season sub-system to use.

── FALL PALETTE BANK ──
WALL COLOURS:
[WM] Warm cream fall #F0E4CC | [WM] Harvest butter #E8D080 | [WM] Warm amber plaster #D8A840
[WM] Pumpkin buff #D4A060 | [WM] Warm sienna light #CC9040 | [WM] Deep harvest gold #C08830
[WD] Rich amber #B07020 | [WD] Deep ochre fall #9A6018 | [WD] Burnt sienna #884020
[WD] Dark harvest brown #6A4020 | [CD] Deep forest fall #2A3820 | [WM] Warm terracotta fall #C47848
ACCENT/SEASONAL OBJECTS: terracotta pumpkins, dried pampas grass, rust-orange chrysanthemums,
dried corn, amber candles, chunky wool throw rust/orange, dried wheat sheaves, pinecones, dark walnut wood

── CHRISTMAS + WINTER PALETTE BANK ──
WALL COLOURS:
[WL] Christmas white #F5F2EC | [WL] Warm cream Xmas #F0EAE0 | [CD] Deep forest Christmas #2A4028
[CD] Dark holly green #223820 | [CD] Christmas bottle green #2A3C28 | [CD] Deep midnight Xmas #1A2028
[WM] Warm off-white Xmas #E8DFD0 | [CM] Dusty blue winter #8898B0 | [WD] Dark charcoal winter #3C3A36
[WD] Warm dark Christmas #3A2A20 | [CD] Deep burgundy Xmas #4A1828 | [CD] Midnight navy winter #1A2040
ACCENT/SEASONAL OBJECTS: pine branches, velvet stockings deep red/green, red berry sprigs,
white narcissus, gold pillar candles, tartan plaid wool, silver pine cones, white taper candles,
deep green garland with berries, NO Santa or cartoon elements, NO bright commercial red

── SPRING PALETTE BANK ──
WALL COLOURS:
[WL] Spring white #F8F6F0 | [WL] Pale spring cream #F4EEE2 | [WL] Warm spring white #F0EBE0
[WL] Pale yellow spring #F0E8C0 | [WM] Butter spring #EAE080 | [WM] Soft spring yellow #E4D870
[WM] Spring blush #F0D8D0 | [WM] Pale spring rose #E8C8C0 | [CL] Cool spring white #F2F6F4
[CL] Spring pale blue #D0E4EC | [CM] Spring sage #9AB48A | [CM] Pale garden sage #A8C298
ACCENT/SEASONAL OBJECTS: cherry blossom branches, tulips pale pink/white/yellow,
daffodils, moss table arrangements, painted eggs blush/mint, white linen fresh and light,
pale wicker, spring bulbs in terracotta, fresh greenery just unfurling

FURNITURE BANK (30 options — used across all seasons)
[WL] White painted #F0EAE0 | [WL] Cream painted #EDE5D4 | [WM] Natural oak warm #C8A870
[WM] Warm pine #D0A870 | [WM] Honey wood #C4A068 | [WD] Dark walnut #6B4E35
[WD] Dark oak #7A6040 | [WD] Deep warm wood #7A5838 | [CD] Charcoal painted #3C3830
[CD] Dark navy painted #2A3E58 | [WM] Rattan natural #C4A870 | [WM] Aged pine #B88858
[WM] Warm maple #D4A878 | [CD] Matte black #2A2820 | [WM] Warm chestnut #9A6838
[WD] Dark mahogany #5A3020 | [WM] Caramel wood #C09058 | [WL] Very pale grey #E8E4DC
[WD] Deep forest painted #3A5028 | [CD] Iron-black painted #2A2828 | [WM] Warm amber #C89050
[WD] Espresso dark #4A2E14 | [CM] Slate painted #6A7880 | [WM] Terracotta painted #B87848
[WM] Warm saddle leather #B09060 | [NM] Grey-brown natural #B0A898 | [WD] Dark teak #6A4830

CURTAIN BANK (25 options across seasons)
[WL-sheer] White sheer all seasons #FAF8F4 | [WL-mid] Cream linen #E4DAC8 | [WM-heavy] Rust fall heavy #9C4828
[WM-heavy] Amber fall wool #B07820 | [CD-heavy] Deep forest Xmas #2A3820 | [CD-heavy] Dark green velvet #1E3020
[WD-heavy] Burgundy velvet #4A1828 | [WM-heavy] Deep gold Xmas #9A7820 | [WL-mid] Spring white cotton #F0EAE0
[CM-mid] Spring sage linen #90B080 | [WM-mid] Spring blush #E0C0B4 | [WM-heavy] Ochre fall heavy #8A7020
[WM-mid] Warm harvest cotton #CEB878 | [CL-sheer] Spring pale blue sheer #D4E8F0 | [NM-mid] Greige natural #C0BCB4
[CD-heavy] Midnight winter #1A2028 | [WM-heavy] Deep amber drape #A07020 | [CM-mid] Winter grey #9AAAB4
[WL-heavy] Warm cream heavy fall #E4D8C4 | [WD-heavy] Dark fall brown #5A3820 | [WL-mid] Off-white spring #E8E0D0
[WM-mid] Pale ochre fall linen #CCB870 | [CM-heavy] Dusty blue winter #8898B0 | [WD-heavy] Deep rust fall #8A3820

ACCENT / DARK ANCHOR BANK
Dark iron candleholder #2A2820 | Ebony lantern base #1E1E18 | Dark walnut tray #3C2810
Charcoal ceramic vessel #3A3830 | Dark iron hook #2A2828 | Black iron pine holder #1C1C1C
Deep walnut frame #2A1E10 | Dark teak serving board #3A2810 | Iron-black candle snuffer #2A2828

SEASONAL ABSOLUTE RULES:
✗ No generic rooms — season must be immediately obvious from objects
✗ Christmas: no Santa, no cartoon elements, editorial and atmospheric only
✓ Fall: amber, rust, pumpkins, dried botanicals always present
✓ Christmas: deep greens, red berry, candles, velvet always present
✓ Spring: fresh botanicals, pale yellows, blossoms, light and airy always present
`,

  guides: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STYLE GUIDES — PALETTE SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style guides compare or explain aesthetics.
Pull from the relevant style's own palette banks for each section.

For "X vs Y" articles:
  → Sections explaining Style X: use Style X's wall bank + furniture bank
  → Sections explaining Style Y: use Style Y's wall bank + furniture bank
  → Hero image: blend both styles in one room or use a split composition

For "What is X style?" articles:
  → Use that style's full palette bank throughout

For "How to mix X and Y" articles:
  → Alternate between both styles' banks section by section

The image must CLEARLY communicate which style it represents to a first-time reader.
Never show a confused or ambiguous room — be deliberately clear.

Use these palette banks by pulling from the relevant category's bank:
  Japandi → japandi bank | Coastal → coastal bank | Boho → boho bank
  Scandinavian → scandinavian bank | Cottagecore → cottagecore bank
  MCM → mid-century-modern bank | Farmhouse → modern-farmhouse bank
  General → general bank
`,
};

const UNIVERSAL_RULES = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNIVERSAL RULES (apply to every image in every category)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ NEVER repeat the same wall colour within one article — each image gets a unique wall colour from the bank
✗ NEVER repeat the same camera, lens, angle, time of day, or composition within one article
✗ NEVER add people, faces, or body parts
✗ NEVER add text, watermarks, logos, or brand labels
✗ NEVER use bright saturated colours — all palettes are editorial and muted
✗ NEVER underexpose dark walls to black — minimum 15% luminosity, room always legible
✓ START each section prompt by stating: "Wall: [chosen colour name #hex tone-tag]" so no repeats occur
✓ Objects in each prompt must come from the actual article section content — read each section carefully
✓ Drama and mood come from COLOUR CONTRAST and LIGHT DIRECTION — never from darkness hiding the room
✓ Every image must be well-exposed, legible, and feel like a real editorial photograph
`;

export async function POST(req: NextRequest) {
  const { articleTitle, category, headings, articleMarkdown, includePins } = await req.json();

  if (!headings?.length) return NextResponse.json({ error: 'No headings provided' }, { status: 400 });

  const roomType = CATEGORY_LABELS[category] ?? 'home interior';
  const paletteBank = PALETTE_BANKS[category] ?? PALETTE_BANKS['japandi'];
  const styleVocab = STYLE_VOCABULARY[category] ?? STYLE_VOCABULARY['japandi'];

  const articleContext = articleMarkdown
    ? `\nFull article content — READ THIS CAREFULLY. Each section prompt must reflect the specific objects described in that section:\n---\n${articleMarkdown.slice(0, 8000)}\n---\n`
    : '';

  const prompt = `You are the world's best AI image prompt writer for FLUX (hyper-realistic photographic model).
You write prompts for decoreixy.com, a home decor inspiration site.
${articleContext}
Article: "${articleTitle}"
Space type: ${roomType}
Number of sections: ${headings.length}

${styleVocab}

${paletteBank}

${ASSEMBLY_RULES}

${ROTATION_BANKS}

${UNIVERSAL_RULES}

${PROMPT_STRUCTURE}

${includePins ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PINTEREST PIN PROMPTS — exactly 3 pins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PIN 1 — 4-PANEL COLLAGE (1000×1500px portrait 2:3):
Four equal panels in 2×2 grid, 3px white dividers.
Each panel uses a completely different wall colour from the bank — four distinct colour worlds of ${roomType}.
End with: "2×2 collage grid, 3px white dividers, four distinct colour worlds, editorial Pinterest pin, portrait 2:3 format, hyper-realistic composite"

PIN 2 — HERO + 2 DETAIL PANELS (1000×1500px portrait 2:3):
Large hero top 60% — wide full room scene using a dark dramatic wall colour.
Two square detail panels bottom 40%, 3px dividers.
End with: "three-panel Pinterest layout, hero top 60%, two detail panels bottom 40%, 3px white dividers, portrait 2:3, editorial"

PIN 3 — FULL SCENE WITH TEXT SPACE (1000×1500px portrait 2:3):
Complete scene. Bottom 25–30% intentionally uncluttered for text overlay.
End with: "full scene portrait, clean minimal bottom 25% for text overlay, portrait 2:3, hyper-realistic Kinfolk editorial"
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION HEADINGS (write one image prompt per heading):
${headings.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}

IMPORTANT: Before writing each section prompt, state "Wall: [name #hex]" to track which wall colours you have used. Never reuse a wall colour.

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
    model: 'claude-sonnet-4-6',
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
