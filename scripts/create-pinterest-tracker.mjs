import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Parse .env.local manually (no dotenv needed)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
const envText = readFileSync(envPath, 'utf8');

// Extract GOOGLE_SERVICE_ACCOUNT_JSON — value may be single-quoted and span one line
const match = envText.match(/^GOOGLE_SERVICE_ACCOUNT_JSON='(.+)'$/m);
if (!match) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not found in .env.local');
const creds = JSON.parse(match[1]);
const SHARE_WITH = 'oppositesattractsofficial@gmail.com';

// hex string → {red,green,blue} fractions
const hex = (h) => ({
  red:   parseInt(h.slice(1,3),16)/255,
  green: parseInt(h.slice(3,5),16)/255,
  blue:  parseInt(h.slice(5,7),16)/255
});

// JS Date → Google Sheets serial number
const serial = (d) => (d - new Date('1899-12-30')) / 86400000;

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive  = google.drive({ version: 'v3', auth });

  // ── 1. Create spreadsheet ────────────────────────────────────────
  console.log('Creating spreadsheet...');
  const { data: ss } = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'Pinterest Pin Tracker — decoreixy' },
      sheets: [{ properties: { title: 'Pin Schedule', sheetId: 0 } }]
    }
  });
  const ssId  = ss.spreadsheetId;
  const ssUrl = ss.spreadsheetUrl;
  console.log('Created:', ssUrl);

  // ── Column layout ────────────────────────────────────────────────
  // Col idx: 0=Title, 1=URL
  //          2=P1Date, 3=P1Status, 4=P2Date, 5=P2Status,
  //          6=P3Date, 7=P3Status, 8=P4Date, 9=P4Status,
  //          10=P5Date, 11=P5Status
  const HEADERS   = ['Post Title','Post URL','Pin 1 Date','Pin 1 Status','Pin 2 Date','Pin 2 Status','Pin 3 Date','Pin 3 Status','Pin 4 Date','Pin 4 Status','Pin 5 Date','Pin 5 Status'];
  const DATE_COLS   = [2,4,6,8,10];
  const STATUS_COLS = [3,5,7,9,11];
  const COL_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const SID = 0;

  const requests = [];

  // ── 2a. Sheet name + freeze rows/cols ───────────────────────────
  requests.push({
    updateSheetProperties: {
      properties: { sheetId: SID, title: 'Pin Schedule', gridProperties: { frozenRowCount: 1, frozenColumnCount: 2 } },
      fields: 'title,gridProperties.frozenRowCount,gridProperties.frozenColumnCount'
    }
  });

  // ── 2b. Column widths ────────────────────────────────────────────
  const colWidth = (startIndex, endIndex, pixelSize) => ({
    updateDimensionProperties: {
      range: { sheetId: SID, dimension: 'COLUMNS', startIndex, endIndex },
      properties: { pixelSize },
      fields: 'pixelSize'
    }
  });
  requests.push(colWidth(0, 1, 260));  // Title
  requests.push(colWidth(1, 2, 300));  // URL
  DATE_COLS.forEach(c   => requests.push(colWidth(c, c+1, 125)));
  STATUS_COLS.forEach(c => requests.push(colWidth(c, c+1, 115)));

  // ── 2c. Header row height ────────────────────────────────────────
  requests.push({
    updateDimensionProperties: {
      range: { sheetId: SID, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 42 },
      fields: 'pixelSize'
    }
  });

  // ── 2d. Header values + styling ──────────────────────────────────
  requests.push({
    updateCells: {
      range: { sheetId: SID, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 12 },
      rows: [{
        values: HEADERS.map(h => ({
          userEnteredValue: { stringValue: h },
          userEnteredFormat: {
            backgroundColor: hex('#5a9e8a'),
            textFormat: { foregroundColor: hex('#ffffff'), bold: true, fontSize: 11 },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        }))
      }],
      fields: 'userEnteredValue,userEnteredFormat'
    }
  });

  // ── 2e. Status dropdowns: Scheduled / Published ──────────────────
  STATUS_COLS.forEach(c => {
    requests.push({
      setDataValidation: {
        range: { sheetId: SID, startRowIndex: 1, endRowIndex: 500, startColumnIndex: c, endColumnIndex: c+1 },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: [{ userEnteredValue: 'Scheduled' }, { userEnteredValue: 'Published' }]
          },
          showCustomUi: true,
          strict: true
        }
      }
    });
    requests.push({
      repeatCell: {
        range: { sheetId: SID, startRowIndex: 1, endRowIndex: 500, startColumnIndex: c, endColumnIndex: c+1 },
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat.horizontalAlignment'
      }
    });
  });

  // ── 2f. Date columns: calendar picker + "D MMM YYYY" format ─────
  DATE_COLS.forEach(c => {
    requests.push({
      setDataValidation: {
        range: { sheetId: SID, startRowIndex: 1, endRowIndex: 500, startColumnIndex: c, endColumnIndex: c+1 },
        rule: {
          condition: { type: 'DATE_IS_VALID' },
          showCustomUi: true,
          strict: false,
          inputMessage: 'Click the calendar icon to pick a date + month'
        }
      }
    });
    requests.push({
      repeatCell: {
        range: { sheetId: SID, startRowIndex: 1, endRowIndex: 500, startColumnIndex: c, endColumnIndex: c+1 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'DATE', pattern: 'D MMM YYYY' },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    });
  });

  // ── 2g. Conditional formatting (3 rules × 5 pins = 15 rules) ────
  //   ✅ GREEN  — Published
  //   🔴 RED    — Scheduled + date already passed  (overdue)
  //   🟡 YELLOW — Scheduled + date is today/future (upcoming)
  DATE_COLS.forEach((dc, i) => {
    const sc = STATUS_COLS[i];
    const dl = COL_LETTERS[dc];
    const sl = COL_LETTERS[sc];
    const range = [{ sheetId: SID, startRowIndex: 1, endRowIndex: 500, startColumnIndex: dc, endColumnIndex: sc+1 }];

    const cfRule = (formula, bg, fg) => ({
      addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: range,
          booleanRule: {
            condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: formula }] },
            format: { backgroundColor: hex(bg), textFormat: { foregroundColor: hex(fg) } }
          }
        }
      }
    });

    // Order matters: last added = highest priority (index 0 pushes others down)
    // So add lowest-priority first:
    requests.push(cfRule(
      `=AND($${sl}2="Scheduled",$${dl}2<>"",$${dl}2>=TODAY())`,
      '#ffeb9c', '#9c6500'   // 🟡 Upcoming
    ));
    requests.push(cfRule(
      `=AND($${sl}2="Scheduled",$${dl}2<>"",$${dl}2<TODAY())`,
      '#ffc7ce', '#9c0006'   // 🔴 Overdue
    ));
    requests.push(cfRule(
      `=AND($${sl}2="Published",$${dl}2<>"")`,
      '#c6efce', '#276221'   // ✅ Published
    ));
  });

  // ── 2h. Alternating row banding ──────────────────────────────────
  requests.push({
    addBanding: {
      bandedRange: {
        range: { sheetId: SID, startRowIndex: 0, endRowIndex: 500, startColumnIndex: 0, endColumnIndex: 12 },
        rowProperties: {
          headerColor:     hex('#5a9e8a'),
          firstBandColor:  hex('#ffffff'),
          secondBandColor: hex('#f5f5f5')
        }
      }
    }
  });

  // ── 2i. Sample row so user can see it working ────────────────────
  const now   = new Date();
  const past  = new Date(now); past.setDate(past.getDate() - 5);
  const soon  = new Date(now); soon.setDate(soon.getDate() + 4);
  const later = new Date(now); later.setDate(later.getDate() + 14);

  const dateCell = (d) => ({
    userEnteredValue: { numberValue: serial(d) },
    userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'D MMM YYYY' } }
  });
  const strCell = (s) => ({ userEnteredValue: { stringValue: s } });

  requests.push({
    updateCells: {
      range: { sheetId: SID, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 12 },
      rows: [{ values: [
        strCell('Coastal Bedroom Ideas: 20 Stunning Designs'),
        strCell('https://decoreixy.com/coastal/coastal-bedroom-ideas-stunning-designs-beach-inspired-space'),
        dateCell(past),  strCell('Published'),
        dateCell(now),   strCell('Published'),
        dateCell(soon),  strCell('Scheduled'),
        dateCell(later), strCell('Scheduled'),
        strCell(''),     strCell('')
      ] }],
      fields: 'userEnteredValue,userEnteredFormat.numberFormat'
    }
  });

  // ── 3. Apply all formatting ──────────────────────────────────────
  console.log(`Applying ${requests.length} formatting requests...`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ssId,
    requestBody: { requests }
  });
  console.log('Formatting done.');

  // ── 4. Share with decoreixy Gmail ───────────────────────────────
  console.log(`Sharing with ${SHARE_WITH}...`);
  await drive.permissions.create({
    fileId: ssId,
    requestBody: {
      type: 'user',
      role: 'writer',
      emailAddress: SHARE_WITH
    },
    sendNotificationEmail: false
  });
  console.log('Shared.');

  console.log('\n✅  DONE');
  console.log('Open your sheet here →', ssUrl);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
