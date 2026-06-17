import { NextRequest, NextResponse } from 'next/server';
import { getArticlesFromSheets, invalidateSheetsCache, CONTENT_TABS } from '@/lib/sheets';
import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  const cleaned = raw.startsWith("'") ? raw.slice(1, -1) : raw;
  const creds = JSON.parse(cleaned);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function GET() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not set' }, { status: 500 });
  }
  const articles = await getArticlesFromSheets();
  return NextResponse.json({ articles });
}

// PATCH — update status (and optionally slug/publishedAt) in the sheet
export async function PATCH(req: NextRequest) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not set' }, { status: 500 });
  }

  const { tab, rowNumber, status, slug, publishedAt } = await req.json();

  if (!CONTENT_TABS.includes(tab)) {
    return NextResponse.json({ error: `Unknown tab: ${tab}` }, { status: 400 });
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const updates: { range: string; values: string[][] }[] = [];

  // Column I (index 9, 1-based = column 9) = Status
  if (status) {
    updates.push({ range: `${tab}!I${rowNumber}`, values: [[status]] });
  }

  // Store slug + publishedAt in a notes column (after J) if provided
  if (slug) {
    const note = `slug:${slug}${publishedAt ? ` | published:${publishedAt}` : ''}`;
    updates.push({ range: `${tab}!K${rowNumber}`, values: [[note]] });
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: updates },
    });
  }

  invalidateSheetsCache();
  return NextResponse.json({ ok: true });
}
