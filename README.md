# NITER EEE Alumni Directory

Web app to browse and register NITER EEE alumni. Data lives in **Google Sheets**; a small **Node/Express** API reads and writes it, and a **React** UI talks to that API.

## What’s in this repo

| Path | Role |
|------|------|
| `src/` | React frontend (Create React App) — search, list, add alumni |
| `server/` | Express backend — Google Sheets API, stats, health check |
| `public/` | Static HTML shell and icons |

**Flow:** Browser → `http://localhost:3000` → API `http://localhost:5000` → Google Sheet (`Sheet1` read + `Sheet2` write).

## Features

- Search alumni by name, batch, hometown/district, organization
- View directory cards with contact and profile details
- Add new alumni (15-field form) → appends a row to **Sheet2**
- Visit / search counters (`/stats`)
- Legacy **Sheet1** rows are normalized into the same 15-column shape for the UI

## Alumni fields (A–O)

| Col | Field |
|-----|--------|
| A | Full Name |
| B | Batch / Session |
| C | Student ID |
| D | Phone / WhatsApp |
| E | Email |
| F | Facebook link |
| G | LinkedIn link *(optional)* |
| H | Current Address |
| I | Hometown |
| J | Blood Group |
| K | Current Position / Designation |
| L | Company / Organization / University |
| M | Field of Work / Higher Studies |
| N | Previous experience |
| O | Skills / Areas of expertise |

If position is `Student` or `None`, company / field / previous experience / skills are cleared and not required.

## API

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/alumni` | List (optional `q`, `batch`, `district`, `organization`) |
| `POST` | `/alumni` | Create — JSON body with the 15 fields above |
| `GET` | `/health` | Server + sheet config check |
| `GET` | `/stats` | Visit & search counts |
| `POST` | `/stats/visit` | Increment visits |
| `POST` | `/stats/search` | Increment searches |

## Setup

### 1. Google Cloud / Sheet

1. Create a Google Cloud **service account** and download its JSON key.
2. Save it as `server/service-account-key.json` *(gitignored)*.
3. Share your Google Spreadsheet with the service account email (**Editor**).
4. Copy the spreadsheet ID from the sheet URL.

### 2. Backend env

Create `server/.env` *(gitignored)*:

```env
PORT=5000
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
SHEET_NAMES=Sheet1,Sheet2
WRITE_SHEET=Sheet2
DATA_RANGE=A:O
```

### 3. Install & run

```bash
# Frontend
npm install
npm start
# → http://localhost:3000

# Backend (separate terminal)
cd server
npm install
npm start
# → http://localhost:5000
```

Frontend API base is currently `http://localhost:5000` in `src/AlumniDirectory.jsx`. Change that (or use `REACT_APP_API_URL`) before deploying.

## Deploy (Render sketch)

1. **Web Service** from `server/` — start `npm start`; set env vars; put service-account JSON in an env var or secret file.
2. **Static Site** from repo root — build `npm install && npm run build`, publish `build`; set API URL to the backend.
3. Keep the Sheet shared with the service account.

## Scripts

**Root**

- `npm start` — React dev server
- `npm run build` — production build → `build/`
- `npm test` — tests

**`server/`**

- `npm start` — Express API

## Notes

- Do **not** commit `server/.env` or `server/service-account-key.json`.
- Prefer one project root; avoid nested duplicate `alumnisite/alumnisite` folders when pushing to GitHub.
