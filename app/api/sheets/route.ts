import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;

// Actual sheet tabs
const TABS = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'];

// Column indices (0-based):
// A=0 #  | B=1 Article Type | C=2 Cluster | D=3 Blog Post Title | E=4 Pinterest Pin Title | F=5 Type | G=6 Competition | H=7 Status | I=8 Notes

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  // Handle both quoted (single-quote wrapped) and raw JSON
  const cleaned = raw.startsWith("'") ? raw.slice(1, -1) : raw;
  const creds = JSON.parse(cleaned);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function mapType(sheetType: string): 'editorial' | 'product-review' | 'roundup' {
  const t = sheetType.toLowerCase();
  if (t === 'product') return 'product-review';
  if (t === 'roundup') return 'roundup';
  return 'editorial';
}

function mapStatus(sheetStatus: string): string {
  const s = sheetStatus.toLowerCase().trim();
  if (s === 'not written' || s === '' || s === 'queue') return 'queue';
  if (s === 'outline ready' || s === 'outline-ready') return 'outline-ready';
  if (s === 'writing' || s === 'in progress') return 'writing';
  if (s === 'images') return 'images';
  if (s === 'pinterest') return 'pinterest';
  if (s === 'published') return 'published';
  return 'queue';
}

export async function GET() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not set' }, { status: 500 });
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const allArticles = [];
  let globalId = 1;

  for (const tab of TABS) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${tab}!A:I`,
      });

      const rows = res.data.values ?? [];
      // Skip header row(s) — find first row where col A is a number
      for (const row of rows) {
        const rowNum = row[0]?.toString().trim();
        if (!rowNum || isNaN(Number(rowNum))) continue; // skip headers/blanks

        const title = row[3]?.toString().trim();
        if (!title) continue;

        const articleType = row[1]?.toString().trim() ?? '';
        const cluster = row[2]?.toString().trim() ?? '';
        const pinterestTitle = row[4]?.toString().trim() ?? '';
        const contentType = row[5]?.toString().trim() ?? 'editorial';
        const competition = row[6]?.toString().trim() ?? '';
        const status = mapStatus(row[7]?.toString().trim() ?? '');
        const notes = row[8]?.toString().trim() ?? '';

        allArticles.push({
          id: String(globalId++),
          title,
          type: mapType(contentType),
          category: tab,
          cluster,
          articleType, // MOTHER or Branch
          pinterestTitle,
          contentType,
          competition,
          status,
          notes,
          slug: '',
          publishedAt: '',
        });
      }
    } catch {
      // Tab might not exist yet — skip
    }
  }

  return NextResponse.json({ articles: allArticles });
}

// PATCH — update status in the sheet
export async function PATCH(req: NextRequest) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not set' }, { status: 500 });
  }

  const { tab, rowNumber, status, slug, publishedAt } = await req.json();

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const updates: { range: string; values: string[][] }[] = [];

  if (status) {
    updates.push({ range: `${tab}!H${rowNumber}`, values: [[status]] });
  }
  if (slug) {
    // Store slug in Notes column if no dedicated column
    updates.push({ range: `${tab}!I${rowNumber}`, values: [[`slug:${slug}${publishedAt ? ` | published:${publishedAt}` : ''}`]] });
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: updates },
    });
  }

  return NextResponse.json({ ok: true });
}
