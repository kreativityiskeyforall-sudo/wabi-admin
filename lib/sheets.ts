import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;

export const CONTENT_TABS = [
  // ── Japandi ──
  'Japandi — Living Room',
  'Japandi — Bedroom',
  'Japandi — Kitchen',
  'Japandi — Bathroom',
  'Japandi — Small Rooms',
  // ── Coastal ──
  'Coastal — Bedroom',
  'Coastal — Living Room',
  'Coastal — Kitchen',
  'Coastal — Bathroom',
  // ── Coastal new ──
  'Coastal — Dining Room',
  'Coastal — Outdoor + Porch',
  // ── Scandinavian ──
  'Scandinavian — Bathroom',
  'Scandinavian — Living Room',
  'Scandinavian — Kitchen',
  'Scandinavian — Bedroom',
  'Scandinavian — Hub',
  'Scandinavian — Dining + Extras',
  // ── Modern Farmhouse ──
  'Modern Farmhouse — Living Room',
  'Modern Farmhouse — Bedroom',
  'Modern Farmhouse — Kitchen',
  'MF — Bathroom + Extras',
  'MF — Outdoor + Porch',
  'MF — Laundry + Extras',
  // ── Boho ──
  'Boho — Living Room',
  'Boho — Bedroom',
  'Boho — Kitchen + Bathroom',
  'Boho — Dining + Entryway',
  'Boho — Outdoor + Extras',
  // ── Cottagecore ──
  'Cottagecore — Living Room',
  'Cottagecore — Bedroom',
  'Cottagecore — Kitchen',
  'Cottagecore — Bathroom',
  'Cottagecore — Dining + Garden',
  // ── Mid-Century Modern ──
  'MCM — Living Room',
  'MCM — Bedroom',
  'MCM — Kitchen + Bathroom',
  // ── General Rooms ──
  'General — Bedroom (Color)',
  'General — Bedroom (Styles)',
  'Bedroom — Demographics',
  'General — Living Room',
  'General — Kitchen',
  'General — Bathroom',
  // ── Garden & Outdoor ──
  'Garden — Pool + Hot Tub',
  'Garden — Landscaping',
  'Garden — Patio + Porch',
  // ── Global Styles ──
  'Mexican + Hacienda',
  'Barndominium',
  // ── Seasonal ──
  'Seasonal — Fall',
  'Seasonal — Christmas + Winter',
  'Seasonal — Spring + Other',
  // ── Guides ──
  'Style Guides',
];

export type SheetArticle = {
  id: string;
  title: string;
  type: 'editorial' | 'product-review' | 'roundup';
  category: string;
  cluster: string;
  articleType: string;
  pinterestTitle: string;
  contentType: string;
  uniqueAngle: string;
  competition: string;
  status: string;
  priority: string;
  slug: string;
  publishedAt: string;
  rowNumber: number;
};

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  const cleaned = raw.startsWith("'") ? raw.slice(1, -1) : raw;
  const creds = JSON.parse(cleaned);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function mapType(t: string): 'editorial' | 'product-review' | 'roundup' {
  const lower = t.toLowerCase();
  if (lower === 'product') return 'product-review';
  if (lower === 'roundup') return 'roundup';
  return 'editorial';
}

function mapStatus(s: string): string {
  const lower = s.toLowerCase().trim();
  if (!lower || lower === 'not written' || lower === 'to do') return 'queue';
  if (lower === 'outline ready' || lower === 'outline-ready') return 'outline-ready';
  if (lower === 'writing' || lower === 'in progress') return 'writing';
  if (lower === 'images') return 'images';
  if (lower === 'pinterest') return 'pinterest';
  if (lower === 'published') return 'published';
  if (lower === 'delete') return 'delete';
  return 'queue';
}

export async function getArticleById(id: string): Promise<SheetArticle | null> {
  const all = await getArticlesFromSheets();
  return all.find(a => a.id === id) ?? null;
}

export async function getArticlesFromSheets(): Promise<SheetArticle[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return [];

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const allArticles: SheetArticle[] = [];
  let globalId = 1;

  for (const tab of CONTENT_TABS) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${tab}!A:J`,
      });
      const rows = res.data.values ?? [];
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        if (!row[0] || isNaN(Number(row[0].toString().trim()))) continue;
        const title = row[3]?.toString().trim();
        if (!title) continue;
        const status = mapStatus(row[8]?.toString().trim() ?? '');
        if (status === 'delete') continue;
        allArticles.push({
          id: String(globalId++),
          title,
          type: mapType(row[5]?.toString().trim() ?? ''),
          category: tab,
          cluster: row[2]?.toString().trim() ?? '',
          articleType: row[1]?.toString().trim() ?? '',
          pinterestTitle: row[4]?.toString().trim() ?? '',
          contentType: row[5]?.toString().trim() ?? '',
          uniqueAngle: row[6]?.toString().trim() ?? '',
          competition: row[7]?.toString().trim() ?? '',
          status,
          priority: row[9]?.toString().trim() ?? '',
          slug: '',
          publishedAt: '',
          rowNumber: rowIdx + 1,
        });
      }
    } catch { /* tab missing — skip */ }
  }

  return allArticles;
}
