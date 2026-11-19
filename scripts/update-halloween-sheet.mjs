// Script to update Halloween articles in the Google Sheet:
// 1. Change row 7 "Halloween Home Styling Ideas" cluster from → B to → G
// 2. Insert 5 new Halloween articles after article #24

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env vars from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  let val = trimmed.slice(eqIdx + 1);
  // Strip surrounding single quotes if present
  if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
  env[key] = val;
}

const SHEET_ID = env.GOOGLE_SHEETS_ID;
const TAB = 'Seasonal — Spring + Other';

const creds = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  // ── Step 1: Read the entire tab to find exact row numbers ──
  console.log(`Reading tab: ${TAB}...`);
  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A:K`,
  });
  const rows = readRes.data.values ?? [];

  console.log(`Total rows in tab: ${rows.length}`);

  let halloweenHomeStylingRow = -1; // row 7 → cluster change
  let article24Row = -1;            // row 24 → insert after this

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = row[0]?.toString().trim();
    const title = row[3]?.toString().trim() ?? '';

    if (rowNum === '7' && title.includes('Halloween Home Styling')) {
      halloweenHomeStylingRow = i + 1; // 1-indexed sheet row
      console.log(`Found article #7 "Halloween Home Styling Ideas" at sheet row ${halloweenHomeStylingRow}`);
      console.log(`  Current cluster: "${row[2]}"`);
    }
    if (rowNum === '24' && title.includes('Dark Halloween Aesthetic')) {
      article24Row = i + 1; // 1-indexed sheet row
      console.log(`Found article #24 "Dark Halloween Aesthetic" at sheet row ${article24Row}`);
    }
  }

  if (halloweenHomeStylingRow === -1) {
    console.error('ERROR: Could not find Halloween Home Styling Ideas (article #7)');
    process.exit(1);
  }
  if (article24Row === -1) {
    console.error('ERROR: Could not find Dark Halloween Aesthetic (article #24)');
    process.exit(1);
  }

  // ── Step 2: Update cluster for article #7 (column C = index 2) ──
  console.log(`\nUpdating cluster for article #7 from "→ B" to "→ G"...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!C${halloweenHomeStylingRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['→ G']] },
  });
  console.log(`✓ Cluster updated`);

  // ── Step 3: Insert 5 rows after article #24 ──
  // First get the spreadsheet to find the sheet ID (gid) for the tab
  console.log(`\nLooking up sheet ID for tab "${TAB}"...`);
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = spreadsheet.data.sheets?.find(
    s => s.properties?.title === TAB
  );
  if (!sheet) {
    console.error(`ERROR: Could not find sheet tab "${TAB}"`);
    process.exit(1);
  }
  const sheetId = sheet.properties?.sheetId;
  console.log(`  Sheet gid: ${sheetId}`);

  // Insert 5 blank rows after article24Row
  console.log(`\nInserting 5 blank rows after sheet row ${article24Row}...`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        insertDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: article24Row,     // 0-indexed: insert AFTER article24Row
            endIndex: article24Row + 5,
          },
          inheritFromBefore: true,
        },
      }],
    },
  });
  console.log(`✓ 5 rows inserted`);

  // ── Step 4: Write the 5 new Halloween article rows ──
  const newArticles = [
    [
      '25', 'Branch', '→ G',
      'Vintage Halloween Decor: 14 Hauntingly Beautiful Aged Designs That Feel Chic Not Cheesy',
      'Vintage Halloween Decor Ideas',
      'Ideas',
      'VINTAGE ONLY — antique props, aged finishes, muted orange/black, mercury glass, Victorian-inspired. NO orange plastic',
      '', '', '',
    ],
    [
      '26', 'Branch', '→ G',
      'Outdoor Halloween Decorations: 16 Front Yard and Garden Designs That Transform Your Whole Property',
      'Outdoor Halloween Decorations',
      'Ideas',
      'YARD + GARDEN + PATHWAY only (NOT porch/front door — row 21 covers that). Tombstones, fog, string lights, pathway lighting',
      '', '', '',
    ],
    [
      '27', 'Branch', '→ G',
      'DIY Halloween Decor: 13 Handmade Styling Ideas That Look Surprisingly Elevated',
      'DIY Halloween Decor Ideas',
      'Ideas',
      'HANDMADE pieces styled beautifully — NOT craft tutorials. Wire sculptures, fabric ghosts, painted pumpkins. NO step-by-step instructions',
      '', '', '',
    ],
    [
      '28', 'Branch', '→ G',
      'Halloween Indoor Decorations: 15 Room-by-Room Ideas for a Beautifully Haunted Interior',
      'Halloween Indoor Decoration Ideas',
      'Ideas',
      'INDOOR ROOMS — bedroom, living room, entryway, kitchen. Cozy-spooky balance. NOT general overview (MOTHER covers that)',
      '', '', '',
    ],
    [
      '29', 'Branch', '→ G',
      'Halloween Cauldron Decor: 12 Bewitching Ways to Style the Most Iconic Autumn Prop',
      'Halloween Cauldron Decor Ideas',
      'Ideas',
      'CAULDRON as styling centrepiece — fireplace, porch, table settings. Dry ice, dark florals, skulls, candles around it',
      '', '', '',
    ],
  ];

  const startRow = article24Row + 1; // First inserted row (1-indexed)
  console.log(`\nWriting 5 new articles starting at sheet row ${startRow}...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A${startRow}:J${startRow + 4}`,
    valueInputOption: 'RAW',
    requestBody: { values: newArticles },
  });
  console.log(`✓ 5 new Halloween articles written`);

  console.log('\n✅ All done! Changes made:');
  console.log('  1. Article #7 cluster changed: → B  →  → G');
  console.log('  2. 5 new Halloween articles added as rows 25–29 (cluster G)');
  console.log('  3. New Year\'s Eve + all following rows shifted down by 5');
}

main().catch(err => {
  console.error('Script failed:', err.message ?? err);
  process.exit(1);
});
