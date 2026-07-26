require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

const SHEET_NAMES = (process.env.SHEET_NAMES || 'Sheet1,Sheet2')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const WRITE_SHEET = process.env.WRITE_SHEET || SHEET_NAMES[1] || 'Sheet2';
const DATA_RANGE = process.env.DATA_RANGE || 'A:O';

/* =========================================================
 * NEW Sheet2 schema columns (A → N)
 * A  Full Name
 * B  Batch/Session
 * C  Student ID
 * D  Phone / Whatsapp
 * E  Email
 * F  Facebook link
 * G  LinkedIn link (optional)
 * H  Current Address
 * I  Hometown
 * J  Blood Group
 * K  Current Position / Designation (Student | None | Type custom)
 * L  Company / Organization / University
 * M  Field of Work / Higher Studies
 * N  Previously Experienced Companies / Organizations (if any)
 * O  Skills / Areas of Expertise
 * ========================================================= */
const NEW_COL = {
  NAME: 0,
  BATCH: 1,
  STUDENT_ID: 2,
  PHONE: 3,
  EMAIL: 4,
  FACEBOOK: 5,
  LINKEDIN: 6,
  CURRENT_ADDR: 7,
  HOMETOWN: 8,
  BLOOD: 9,
  POSITION: 10,
  COMPANY: 11,
  FIELD: 12,
  PREV_EXP: 13,
  SKILLS: 14,
};

/* =========================================================
 * Legacy Sheet1 column mapping (A:O) — read-only source
 * A  Name            -> NAME
 * B  Batch           -> BATCH
 * C  Student ID      -> STUDENT_ID
 * D  Phone           -> PHONE
 * E  Email           -> EMAIL
 * F  Name BN         -> — (unused in UI)
 * G  Col G (FB)      -> FACEBOOK
 * H  Present Addr    -> CURRENT_ADDR
 * I  District        -> HOMETOWN (best mapping: district = home area)
 * J  Blood           -> BLOOD
 * K  Position        -> POSITION
 * L  Org / Univ      -> COMPANY
 * M  Field           -> FIELD
 * N  Previous Exp    -> PREV_EXP
 * O  Skills          -> SKILLS
 * ========================================================= */
const LEGACY_COL = {
  NAME: 0,
  BATCH: 1,
  STUDENT_ID: 2,
  PHONE: 3,
  EMAIL: 4,
  NAME_BN: 5,
  FACEBOOK: 6,
  CURRENT_ADDR: 7,
  DISTRICT: 8,
  BLOOD: 9,
  POSITION: 10,
  COMPANY: 11,
  FIELD: 12,
  PREV_EXP: 13,
  SKILLS: 14,
};

const normalizeRow = (row, source) => {
  const arr = Array(15).fill('');
  if (!row) return arr;
  if (source === 'sheet1') {
    arr[NEW_COL.NAME]         = String(row[LEGACY_COL.NAME] ?? '').trim();
    arr[NEW_COL.BATCH]        = String(row[LEGACY_COL.BATCH] ?? '').trim();
    arr[NEW_COL.STUDENT_ID]   = String(row[LEGACY_COL.STUDENT_ID] ?? '').trim();
    arr[NEW_COL.PHONE]        = String(row[LEGACY_COL.PHONE] ?? '').trim();
    arr[NEW_COL.EMAIL]        = String(row[LEGACY_COL.EMAIL] ?? '').trim();
    arr[NEW_COL.FACEBOOK]     = String(row[LEGACY_COL.FACEBOOK] ?? '').trim();
    arr[NEW_COL.CURRENT_ADDR] = String(row[LEGACY_COL.CURRENT_ADDR] ?? '').trim();
    arr[NEW_COL.HOMETOWN]     = String(row[LEGACY_COL.DISTRICT] ?? '').trim();
    arr[NEW_COL.BLOOD]        = String(row[LEGACY_COL.BLOOD] ?? '').trim();
    arr[NEW_COL.POSITION]     = String(row[LEGACY_COL.POSITION] ?? '').trim();
    arr[NEW_COL.COMPANY]      = String(row[LEGACY_COL.COMPANY] ?? '').trim();
    arr[NEW_COL.FIELD]        = String(row[LEGACY_COL.FIELD] ?? '').trim();
    arr[NEW_COL.PREV_EXP]     = String(row[LEGACY_COL.PREV_EXP] ?? '').trim();
    arr[NEW_COL.SKILLS]       = String(row[LEGACY_COL.SKILLS] ?? '').trim();
    arr[NEW_COL.LINKEDIN]     = ''; // legacy sheet has no LinkedIn column
  } else {
    arr[NEW_COL.NAME]         = String(row[NEW_COL.NAME] ?? '').trim();
    arr[NEW_COL.BATCH]        = String(row[NEW_COL.BATCH] ?? '').trim();
    arr[NEW_COL.STUDENT_ID]   = String(row[NEW_COL.STUDENT_ID] ?? '').trim();
    arr[NEW_COL.PHONE]        = String(row[NEW_COL.PHONE] ?? '').trim();
    arr[NEW_COL.EMAIL]        = String(row[NEW_COL.EMAIL] ?? '').trim();
    arr[NEW_COL.FACEBOOK]     = String(row[NEW_COL.FACEBOOK] ?? '').trim();
    arr[NEW_COL.LINKEDIN]     = String(row[NEW_COL.LINKEDIN] ?? '').trim();
    arr[NEW_COL.CURRENT_ADDR] = String(row[NEW_COL.CURRENT_ADDR] ?? '').trim();
    arr[NEW_COL.HOMETOWN]     = String(row[NEW_COL.HOMETOWN] ?? '').trim();
    arr[NEW_COL.BLOOD]        = String(row[NEW_COL.BLOOD] ?? '').trim();
    arr[NEW_COL.POSITION]     = String(row[NEW_COL.POSITION] ?? '').trim();
    arr[NEW_COL.COMPANY]      = String(row[NEW_COL.COMPANY] ?? '').trim();
    arr[NEW_COL.FIELD]        = String(row[NEW_COL.FIELD] ?? '').trim();
    arr[NEW_COL.PREV_EXP]     = String(row[NEW_COL.PREV_EXP] ?? '').trim();
    arr[NEW_COL.SKILLS]       = String(row[NEW_COL.SKILLS] ?? '').trim();
  }
  return arr;
};

const STATS_FILE = path.join(__dirname, 'stats.json');

const readStats = () => {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const raw = fs.readFileSync(STATS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        visits: Number(parsed.visits) || 0,
        searches: Number(parsed.searches) || 0,
      };
    }
  } catch (e) {
    console.warn('⚠️  Could not read stats.json, starting fresh:', e.message);
  }
  return { visits: 0, searches: 0 };
};

const writeStats = (stats) => {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (e) {
    console.error('❌ Failed to write stats.json:', e.message);
  }
};

let stats = readStats();

app.use(cors());
app.use(express.json());

/* =========================================================
 * Security + Permissions Policy headers
 * Explicitly BLOCK every device / sensor permission so the
 * browser NEVER shows "Access other apps and services" prompts.
 * ========================================================= */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'battery=()',
      'bluetooth=()',
      'camera=()',
      'ch-ua=()',
      'ch-ua-arch=()',
      'ch-ua-bitness=()',
      'ch-ua-full-version=()',
      'ch-ua-full-version-list=()',
      'ch-ua-mobile=()',
      'ch-ua-model=()',
      'ch-ua-platform=()',
      'ch-ua-platform-version=()',
      'ch-ua-wow64=()',
      'compute-pressure=()',
      'cross-origin-isolated=()',
      'direct-sockets=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'focus-without-user-activation=()',
      'fullscreen=()',
      'gamepad=()',
      'geolocation=()',
      'gyroscope=()',
      'hid=()',
      'idle-detection=()',
      'interest-cohort=()',
      'join-ad-interest-group=()',
      'keyboard-map=()',
      'local-fonts=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'otp-credentials=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-create=()',
      'publickey-credentials-get=()',
      'run-ad-auction=()',
      'screen-wake-lock=()',
      'serial=()',
      'shared-autofill=()',
      'storage-access=()',
      'sync-script=()',
      'trust-token-redemption=()',
      'unload=()',
      'usb=()',
      'vertical-scroll=()',
      'web-share=()',
      'window-management=()',
      'xr-spatial-tracking=()',
    ].join(', ')
  );
  next();
});

/* =========================================================
 * Serve React static build in production.
 * build/ lives at the repo root, one level above server/.
 * ========================================================= */
const BUILD_DIR = path.join(__dirname, '..', 'build');
if (fs.existsSync(BUILD_DIR)) {
  console.log(`📦  Serving React static build from: ${BUILD_DIR}`);
  app.use(express.static(BUILD_DIR, { index: false, dotfiles: 'deny' }));
}

const KEY_FILE = path.join(__dirname, 'service-account-key.json');

/* =========================================================
 * Render-compatible service account loading.
 * If service-account-key.json is missing but the env var
 * GOOGLE_SERVICE_ACCOUNT_B64 is set (base64 of the JSON),
 * decode and write it to disk so the googleapis client can
 * read it. This lets users keep secrets in Render's env vars
 * instead of committing JSON files to git.
 * ========================================================= */
if (!fs.existsSync(KEY_FILE) && process.env.GOOGLE_SERVICE_ACCOUNT_B64) {
  try {
    const raw = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
    JSON.parse(raw); // validate it's valid JSON before writing
    fs.writeFileSync(KEY_FILE, raw, 'utf8');
    console.log('🔐  Wrote service-account-key.json from GOOGLE_SERVICE_ACCOUNT_B64 env var.');
  } catch (e) {
    console.error('❌  Failed to decode GOOGLE_SERVICE_ACCOUNT_B64:', e.message);
  }
}

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

const SHEET2_HEADER = [
  'Full Name',
  'Batch/Session',
  'Student ID',
  'Phone number/Whatsapp',
  'Email address',
  'Facebook link',
  'LinkedIn link',
  'Current Address',
  'Hometown',
  'Blood Group',
  'Current Position/ Designation',
  'Company/ Organization/ University',
  'Field of Work/ Higher Studies',
  'Previously Experienced Companies/ Organizations (if any)',
  'Skills/ Areas of Experties',
];

const ensureSheets = async () => {
  const sheets = await sheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existing = new Set(
    (meta.data.sheets || []).map((s) => s.properties.title)
  );
  const needed = new Set([...SHEET_NAMES, WRITE_SHEET]);
  const toCreate = [...needed].filter((n) => !existing.has(n));

  for (const title of toCreate) {
    console.log(`🆕  Auto-creating missing sheet tab: "${title}"`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [
          {
            addSheet: {
              properties: { title, gridProperties: { rowCount: 1000, columnCount: 20 } },
            },
          },
        ],
      },
    });
    if (title.toLowerCase() !== 'sheet1') {
      console.log(`    → Writing header row (A:O) for "${title}"`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${title}!A1:O1`,
        valueInputOption: 'RAW',
        resource: { values: [SHEET2_HEADER] },
      });
    }
  }
  if (toCreate.length) console.log('✅  Sheet tabs ready.\n');
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
        const raw = extractRows(response, true);
        const source = sheetName.toLowerCase() === 'sheet1' ? 'sheet1' : 'sheet2';
        const normalized = raw
          .filter((row) => row && row.length && String(row[0] || '').trim())
          .map((row) => normalizeRow(row, source));
        allRows = allRows.concat(normalized);
      } catch (sheetErr) {
        console.warn(
          `⚠️  Could not read sheet "${sheetName}":`,
          sheetErr?.errors?.[0]?.message || sheetErr.message
        );
      }
    }

    allRows = allRows.filter((row) => row && row.length && row[NEW_COL.NAME]);

    const { q, batch, district, organization } = req.query;
    const needle = (q || '').trim().toLowerCase();

    const filtered = allRows.filter((row) => {
      const nameVal     = row[NEW_COL.NAME] || '';
      const batchVal    = row[NEW_COL.BATCH] || '';
      const districtVal = row[NEW_COL.HOMETOWN] || ''; // HOMETOWN = district for search UI
      const orgVal      = row[NEW_COL.COMPANY] || '';

      const nameOk = !needle || nameVal.toLowerCase().includes(needle);
      const batchOk = !batch || batchVal === String(batch).trim();
      const distOk = !district || districtVal === String(district).trim();
      const orgOk = !organization || orgVal === String(organization).trim();
      return nameOk && batchOk && distOk && orgOk;
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
    const payload = req.body || {};
    const {
      name,
      batch,
      studentId,
      phone,
      email,
      facebook,
      linkedin,
      currentAddress,
      hometown,
      bloodGroup,
      position,
      company,
      field,
      previousExperience,
      skills,
    } = payload;

    /* ---- Hide Company/Field/PrevExp/Skills when Student or None ---- */
    const pos = String(position || '').trim().toLowerCase();
    const isHidden = pos === 'student' || pos === 'none';

    const requiredChecks = {
      'Full Name': name,
      'Batch/Session': batch,
      'Student ID': studentId,
      'Phone number/Whatsapp': phone,
      'Email address': email,
      'Facebook link': facebook,
      'Current Address': currentAddress,
      'Hometown': hometown,
      'Blood Group': bloodGroup,
      'Current Position/ Designation': position,
    };
    if (!isHidden) {
      requiredChecks['Company/ Organization/ University'] = company;
      requiredChecks['Field of Work/ Higher Studies'] = field;
      requiredChecks['Previously Experienced Companies/ Organizations'] = previousExperience;
      requiredChecks['Skills/ Areas of Experties'] = skills;
    }
    const missing = Object.entries(requiredChecks)
      .filter(([, v]) => v === undefined || v === null || String(v).trim() === '')
      .map(([k]) => k);
    if (missing.length) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing,
      });
    }

    const _company      = isHidden ? '' : (company || '');
    const _field        = isHidden ? '' : (field || '');
    const _prevExp      = isHidden ? '' : (previousExperience || '');
    const _skills       = isHidden ? '' : (skills || '');

    const sheets = await sheetsClient();
    const range = `${WRITE_SHEET}!${DATA_RANGE}`;

    const row = Array(15).fill('');
    row[NEW_COL.NAME]         = String(name).trim();
    row[NEW_COL.BATCH]        = String(batch).trim();
    row[NEW_COL.STUDENT_ID]   = String(studentId).trim();
    row[NEW_COL.PHONE]        = String(phone).trim();
    row[NEW_COL.EMAIL]        = String(email).trim();
    row[NEW_COL.FACEBOOK]     = String(facebook).trim();
    row[NEW_COL.LINKEDIN]     = String(linkedin || '').trim();
    row[NEW_COL.CURRENT_ADDR] = String(currentAddress).trim();
    row[NEW_COL.HOMETOWN]     = String(hometown).trim();
    row[NEW_COL.BLOOD]        = String(bloodGroup).trim();
    row[NEW_COL.POSITION]     = String(position).trim();
    row[NEW_COL.COMPANY]      = String(_company).trim();
    row[NEW_COL.FIELD]        = String(_field).trim();
    row[NEW_COL.PREV_EXP]     = String(_prevExp).trim();
    row[NEW_COL.SKILLS]       = String(_skills).trim();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [row] },
    });

    res.status(201).json({
      success: true,
      sheet: WRITE_SHEET,
      row,
    });
  } catch (err) {
    console.error('POST /alumni error:', err.message);
    if (err?.errors) console.error('Google API errors:', JSON.stringify(err.errors, null, 2));
    res.status(500).json({ error: 'Failed to add alumni to Google Sheets' });
  }
});

app.get('/stats', (req, res) => {
  res.json({
    visits: stats.visits,
    searches: stats.searches,
    total: stats.visits + stats.searches,
  });
});

app.post('/stats/visit', (req, res) => {
  stats.visits += 1;
  writeStats(stats);
  res.json({
    visits: stats.visits,
    searches: stats.searches,
    total: stats.visits + stats.searches,
  });
});

app.post('/stats/search', (req, res) => {
  stats.searches += 1;
  writeStats(stats);
  res.json({
    visits: stats.visits,
    searches: stats.searches,
    total: stats.visits + stats.searches,
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    spreadsheet: SPREADSHEET_ID ? SPREADSHEET_ID.slice(0, 6) + '...' : 'not set',
    readSheets: SHEET_NAMES,
    writeSheet: WRITE_SHEET,
    dataRange: DATA_RANGE,
  });
});

/* =========================================================
 * SPA Fallback — serve React index.html for any non-API GET.
 * MUST be registered AFTER all /api routes and /health.
 * ========================================================= */
if (fs.existsSync(BUILD_DIR)) {
  const INDEX_HTML = path.join(BUILD_DIR, 'index.html');
  app.get('*', (req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith('/alumni') ||
      req.path.startsWith('/stats') ||
      req.path.startsWith('/health')
    ) {
      return next();
    }
    if (fs.existsSync(INDEX_HTML)) {
      res.sendFile(INDEX_HTML);
    } else {
      next();
    }
  });
}

(async () => {
  try {
    await ensureSheets();
  } catch (e) {
    console.warn('⚠️  ensureSheets() startup check had an issue:', e?.errors?.[0]?.message || e.message);
    console.warn('    Server will continue — sheet tabs can also be created manually in Google Sheets UI.\n');
  }

  app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('✅  Alumni Backend is running');
    console.log(`    URL:             http://localhost:${PORT}`);
    console.log(`    Health check:    http://localhost:${PORT}/health`);
    console.log(`    Alumni API:      http://localhost:${PORT}/alumni`);
    console.log(`    Spreadsheet ID:  ${SPREADSHEET_ID || 'NOT SET (check .env)'}`);
    console.log(`    Read sheets:     ${SHEET_NAMES.join(', ')}`);
    console.log(`    Write target:    ${WRITE_SHEET}`);
    console.log(`    Data range:      ${DATA_RANGE}`);
    console.log('========================================\n');
    console.log('💡  Reminders:');
    console.log('    1. Place service-account-key.json in server/ folder');
    console.log('    2. Share your Google Sheet with the Service Account email');
    console.log('    3. Sheet2 header row (A:O) = Name | Batch | StudentID | Phone | Email | Facebook | LinkedIn | CurrentAddr | Hometown | Blood | Position | Company | Field | PrevExp | Skills\n');
  });
})();
