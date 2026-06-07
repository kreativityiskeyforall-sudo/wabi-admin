import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const TABS = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'];

export type SheetArticle = {
  id: string;
  title: string;
  type: 'editorial' | 'product-review' | 'roundup';
  category: string;
  cluster: string;
  articleType: string;
  pinterestTitle: string;
  contentType: string;
  competition: string;
  status: string;
  notes: string;
  slug: string;
  publishedAt: string;
  rowNumber: number; // 1-based row index in the sheet tab (for PATCH updates)
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
  if (!lower || lower === 'not written') return 'queue';
  if (lower === 'outline ready' || lower === 'outline-ready') return 'outline-ready';
  if (lower === 'writing' || lower === 'in progress') return 'writing';
  if (lower === 'images') return 'images';
  if (lower === 'pinterest') return 'pinterest';
  if (lower === 'published') return 'published';
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

  for (const tab of TABS) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${tab}!A:I`,
      });
      const rows = res.data.values ?? [];
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        if (!row[0] || isNaN(Number(row[0].toString().trim()))) continue;
        const title = row[3]?.toString().trim();
        if (!title) continue;
        allArticles.push({
          id: String(globalId++),
          title,
          type: mapType(row[5]?.toString().trim() ?? ''),
          category: tab,
          cluster: row[2]?.toString().trim() ?? '',
          articleType: row[1]?.toString().trim() ?? '',
          pinterestTitle: row[4]?.toString().trim() ?? '',
          contentType: row[5]?.toString().trim() ?? '',
          competition: row[6]?.toString().trim() ?? '',
          status: mapStatus(row[7]?.toString().trim() ?? ''),
          notes: row[8]?.toString().trim() ?? '',
          slug: '',
          publishedAt: '',
          rowNumber: rowIdx + 1, // 1-based sheet row number
        });
      }
    } catch { /* tab missing — skip */ }
  }

  return allArticles;
}
