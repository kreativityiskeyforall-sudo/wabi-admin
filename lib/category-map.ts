export const TAB_TO_CATEGORY: Record<string, string> = {
  // ── Japandi ──
  'Living Room':              'japandi',
  'Bedroom':                  'japandi',
  'Kitchen':                  'japandi',
  'Bathroom':                 'japandi',
  'Japandi — Small Rooms':    'japandi',
  // ── Coastal ──
  'Coastal — Bedroom':        'coastal',
  'Coastal — Living Room':    'coastal',
  'Coastal — Kitchen':        'coastal',
  'Coastal — Bathroom':       'coastal',
  // ── Scandinavian ──
  'Scandinavian — Bathroom':      'scandinavian',
  'Scandinavian — Living Room':   'scandinavian',
  'Scandinavian — Kitchen':       'scandinavian',
  'Scandinavian — Bedroom':       'scandinavian',
  'Scandinavian — Hub':           'scandinavian',
  // ── Modern Farmhouse ──
  'Modern Farmhouse — Living Room': 'modern-farmhouse',
  'Modern Farmhouse — Bedroom':     'modern-farmhouse',
  'Modern Farmhouse — Kitchen':     'modern-farmhouse',
  'MF — Bathroom + Extras':         'modern-farmhouse',
  // ── Boho ──
  'Boho — Living Room':           'boho',
  'Boho — Bedroom':               'boho',
  'Boho — Kitchen + Bathroom':    'boho',
  // ── Cottagecore ──
  'Cottagecore — Living Room':    'cottagecore',
  'Cottagecore — Bedroom':        'cottagecore',
  'Cottagecore — Kitchen':        'cottagecore',
};

export function getWebsiteCategory(tab: string): string {
  return TAB_TO_CATEGORY[tab] ?? 'japandi';
}

export const WEBSITE_CATEGORIES = [
  { label: 'Japandi',           slug: 'japandi' },
  { label: 'Coastal',           slug: 'coastal' },
  { label: 'Scandinavian',      slug: 'scandinavian' },
  { label: 'Modern Farmhouse',  slug: 'modern-farmhouse' },
  { label: 'Boho',              slug: 'boho' },
  { label: 'Cottagecore',       slug: 'cottagecore' },
];
