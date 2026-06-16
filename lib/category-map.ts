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
  // ── Coastal new ──
  'Coastal — Dining Room':        'coastal',
  'Coastal — Outdoor + Porch':    'coastal',
  // ── Scandinavian new ──
  'Scandinavian — Dining + Extras': 'scandinavian',
  // ── Modern Farmhouse new ──
  'MF — Outdoor + Porch':         'modern-farmhouse',
  'MF — Laundry + Extras':        'modern-farmhouse',
  // ── Boho ──
  'Boho — Living Room':           'boho',
  'Boho — Bedroom':               'boho',
  'Boho — Kitchen + Bathroom':    'boho',
  'Boho — Dining + Entryway':     'boho',
  'Boho — Outdoor + Extras':      'boho',
  // ── Cottagecore ──
  'Cottagecore — Living Room':    'cottagecore',
  'Cottagecore — Bedroom':        'cottagecore',
  'Cottagecore — Kitchen':        'cottagecore',
  'Cottagecore — Bathroom':       'cottagecore',
  'Cottagecore — Dining + Garden': 'cottagecore',
  // ── Mid-Century Modern ──
  'MCM — Living Room':            'mid-century-modern',
  'MCM — Bedroom':                'mid-century-modern',
  'MCM — Kitchen + Bathroom':     'mid-century-modern',
  // ── General Rooms ──
  'General — Bedroom (Color)':    'general',
  'General — Bedroom (Styles)':   'general',
  'Bedroom — Demographics':       'general',
  'General — Living Room':        'general',
  'General — Kitchen':            'general',
  'General — Bathroom':           'general',
  // ── Garden & Outdoor ──
  'Garden — Pool + Hot Tub':      'garden',
  'Garden — Landscaping':         'garden',
  'Garden — Patio + Porch':       'garden',
  // ── Global Styles ──
  'Mexican + Hacienda':           'global-styles',
  'Barndominium':                 'modern-farmhouse',
  // ── Seasonal ──
  'Seasonal — Fall':              'seasonal',
  'Seasonal — Christmas + Winter': 'seasonal',
  'Seasonal — Spring + Other':    'seasonal',
  // ── Guides ──
  'Style Guides':                 'guides',
};

export function getWebsiteCategory(tab: string): string {
  return TAB_TO_CATEGORY[tab] ?? 'japandi';
}

export const WEBSITE_CATEGORIES = [
  { label: 'Japandi',            slug: 'japandi' },
  { label: 'Coastal',            slug: 'coastal' },
  { label: 'Scandinavian',       slug: 'scandinavian' },
  { label: 'Modern Farmhouse',   slug: 'modern-farmhouse' },
  { label: 'Boho',               slug: 'boho' },
  { label: 'Cottagecore',        slug: 'cottagecore' },
  { label: 'Mid-Century Modern', slug: 'mid-century-modern' },
  { label: 'General',            slug: 'general' },
  { label: 'Garden',             slug: 'garden' },
  { label: 'Global Styles',      slug: 'global-styles' },
  { label: 'Seasonal',           slug: 'seasonal' },
  { label: 'Guides',             slug: 'guides' },
];
