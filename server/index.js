require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

const SHEET_NAMES = (process.env.SHEET_NAMES || 'Sheet1')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULT_SHEET_FOR_WRITES = SHEET_NAMES[0] || 'Sheet1';
const DATA_RANGE = process.env.DATA_RANGE || 'A:D';

app.use(cors());
app.use(express.json());

const KEY_FILE = path.join(__dirname, 'service-account-key.json');
if (!fs.existsSync(KEY_FILE)) {
  console.error(
    '\n❌ Missing: server/service-account-key.json\n' +
      '   Download your Service Account JSON key from Google Cloud Console\n' +
      '   (IAM & Admin -> Service Accounts -> Manage Keys -> Add Key -> Create new key -> JSON)\n' +
      '   Save it as "service-account-key.json" inside the server/ folder.\n'
  );
  process.exit(1);
}

if (!SPREADSHEET_ID) {
  console.error(
    '\n❌ Missing GOOGLE_SPREADSHEET_ID in server/.env\n' +
      '   Copy the ID from your Google Sheet URL:\n' +
      '   https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit\n'
  );
  process.exit(1);
}

const sheetsClient = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
};

const extractRows = (response, skipHeader = true) => {
  const raw = response.data.values || [];
  return skipHeader ? raw.slice(1) : raw;
};

app.get('/alumni', async (req, res) => {
  try {
    const sheets = await sheetsClient();
    let allRows = [];

    for (const sheetName of SHEET_NAMES) {
      const range = `${sheetName}!${DATA_RANGE}`;
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range,
        });
        allRows = allRows.concat(extractRows(response, true));
      } catch (sheetErr) {
        console.warn(
          `⚠️  Could not read sheet "${sheetName}":`,
          sheetErr?.errors?.[0]?.message || sheetErr.message
        );
      }
    }

    allRows = allRows.filter((row) => row && row.length && (row[0] || '').toString().trim());

    const { q, batch, country, organization } = req.query;
    const needle = (q || '').trim().toLowerCase();

    const filtered = allRows.filter((row) => {
      const [name = '', b = '', c = '', o = ''] = row;
      const nameOk = !needle || name.toLowerCase().includes(needle);
      const batchOk = !batch || String(b).trim() === String(batch).trim();
      const countryOk = !country || String(c).trim() === String(country).trim();
      const orgOk = !organization || String(o).trim() === String(organization).trim();
      return nameOk && batchOk && countryOk && orgOk;
    });

    res.json(filtered);
  } catch (err) {
    console.error('GET /alumni error:', err.message);
    if (err?.errors) console.error('Google API errors:', JSON.stringify(err.errors, null, 2));
    res.status(500).json({ error: 'Failed to fetch alumni from Google Sheets' });
  }
});

app.post('/alumni', async (req, res) => {
  try {
    const { name, batch, country, organization } = req.body || {};
    if (!name || !batch || !country || !organization) {
      return res
        .status(400)
        .json({ error: 'All fields are required: name, batch, country, organization' });
    }

    const sheets = await sheetsClient();
    const range = `${DEFAULT_SHEET_FOR_WRITES}!${DATA_RANGE}`;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[String(name), String(batch), String(country), String(organization)]],
      },
    });

    res
      .status(201)
      .json({
        success: true,
        sheet: DEFAULT_SHEET_FOR_WRITES,
        row: [name, batch, country, organization],
      });
  } catch (err) {
    console.error('POST /alumni error:', err.message);
    if (err?.errors) console.error('Google API errors:', JSON.stringify(err.errors, null, 2));
    res.status(500).json({ error: 'Failed to add alumni to Google Sheets' });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    spreadsheet: SPREADSHEET_ID ? SPREADSHEET_ID.slice(0, 6) + '...' : 'not set',
    sheets: SHEET_NAMES,
  });
});

app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('✅  Alumni Backend is running');
  console.log(`    URL:             http://localhost:${PORT}`);
  console.log(`    Health check:    http://localhost:${PORT}/health`);
  console.log(`    Alumni API:      http://localhost:${PORT}/alumni`);
  console.log(`    Spreadsheet ID:  ${SPREADSHEET_ID || 'NOT SET (check .env)'}`);
  console.log(`    Sheet(s):        ${SHEET_NAMES.join(', ')}`);
  console.log(`    Data range:      ${DATA_RANGE}`);
  console.log('========================================\n');
  console.log('💡  Reminders:');
  console.log('    1. Place service-account-key.json in server/ folder');
  console.log('    2. Share your Google Sheet with the Service Account email');
  console.log('    3. Sheet columns A:D = Name | Batch | Country | Organization (Row 1 = headers)\n');
});
