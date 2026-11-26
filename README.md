
# Med Sense

Medicine, made clear. An **educational** disease, symptom and medicine information website.
It does not diagnose disease or prescribe medication.

- **Backend:** Node.js + Express (`server.js`, `external.js`)
- **Frontend:** static pages in `public/`
- **Data:** your own JSON data (`public/data/`) **plus a live lookup of the U.S. FDA drug-label database (openFDA)**, so users can search medicines that are not in your own data.
=======
# Med Sense — Full-Stack Version

A disease/symptom/medicine **educational** lookup tool. This package turns the original
single-file HTML/JS prototype into a proper client-server app:

- **Backend**: Node.js + Express, serving the disease and medicine data via a JSON API
  and doing the lookup/matching logic server-side (instead of exposing the whole
  database in client-side JavaScript).
- **Frontend**: the same UI, now calling the backend over `fetch()` instead of using
  hardcoded JS objects.

This is **not** a diagnostic or prescribing tool. It only returns pre-written reference
information from a small built-in database, exactly like the original.
>>>>>>> 5d76afdb82f3ce00b61571b22468256164601618

## Project structure

```
med-sense/
├── server.js            # Express app and API routes
├── external.js          # Live openFDA / RxNorm lookup (with cache and name aliases)
├── package.json
├── .env.example         # Optional settings
└── public/
    ├── index.html       # Dashboard (diseases, medicines, ingredients, compare, saved)
    ├── checker.html     # Medicine checker
    ├── search.html      # Search ALL medicines (own data + live FDA lookup)
    ├── css/brand.css
    ├── js/              # theme.js, suggest.js, fdacard.js
    ├── img/             # logos and icon
    └── data/            # diseases.json, medicines.json, ingredients.json
```

## Run locally
=======
medsense/
├── server.js              # Express app + API routes
├── package.json
└── public/
    ├── index.html          # Dashboard (home page)
    ├── checker.html        # Medicine checker
    ├── js/theme.js         # Light / dark theme toggle
    └── data/               # diseases.json + medicines.json
```

## Setup

Requires **Node.js 18+**.

```bash

=======
cd medsense
npm install
npm start
```


Open http://localhost:3000. For auto-restart while developing: `npm run dev`.

Optional: copy `.env.example` values into your host's environment settings. To raise the FDA lookup limit
from 1,000 to 120,000 requests/day, get a free key at https://open.fda.gov/apis/authentication/ and run:

```bash
OPENFDA_API_KEY=yourkey npm start
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lookup?q=name` | Search any medicine: returns your record (if any) and the live FDA label (if any). |
| GET | `/api/external/medicines/:name` | Live FDA lookup only. |
| POST | `/api/check` | Body `{ disease, medicine, symptoms, age }`. If the medicine is not in your data, the response (404) includes the FDA label in `external`. |
| GET | `/api/diseases`, `/api/medicines` | Name lists for autocomplete. |
| GET | `/api/diseases/:name`, `/api/medicines/:name` | One record (fuzzy matched). |
| GET | `/api/diseases-all`, `/api/medicines-all`, `/api/ingredients-all` | Full data used by the dashboard. |

## Live lookup notes

- Uses Node's built-in `fetch`; no extra packages. Results are cached in memory for 24 hours.
- Common Indian/international names are mapped to U.S. names in `external.js` (`ALIASES`), for example paracetamol to acetaminophen. Add your own there.
- It covers U.S. labels. Brands, strengths, approved uses and availability can differ in India, and Indian-only brands may not be found. Add those to `public/data/medicines.json`.
- Dosing text from FDA labels is deliberately not shown.

## Extending your own data

Add entries to `public/data/diseases.json` and `public/data/medicines.json`. No code changes needed.

## Deployment

The app needs the Node server (the checker and live lookup use `/api/...`), so deploy to a Node host such as Render or Railway:
build command `npm install`, start command `npm start`. Static-only hosting (GitHub Pages) will not work for the checker or search.

## Disclaimer

Educational information only. It does not diagnose disease or prescribe medication. Medicine information varies by
product, strength, country, age, weight, allergies, pregnancy, other conditions and other medicines. Always check the
package label and consult a doctor or pharmacist.

## License

MIT (see `LICENSE`). Data from openFDA is public domain (CC0).
=======
Then open **http://localhost:3000** in your browser.

For development with auto-restart on file changes:

```bash
npm run dev
```

(This uses `nodemon`, listed in devDependencies.)

## API Reference

| Method | Endpoint              | Description                                              |
|--------|------------------------|------------------------------------------------------------|
| GET    | `/api/diseases`        | Returns an array of all disease names (for autocomplete). |
| GET    | `/api/medicines`       | Returns an array of all medicine names (for autocomplete).|
| GET    | `/api/diseases/:name`  | Returns the full record for one disease (fuzzy-matched).  |
| GET    | `/api/medicines/:name` | Returns the full record for one medicine (fuzzy-matched). |
| POST   | `/api/check`           | Main lookup. Body: `{ disease, medicine, symptoms, age }`. Returns the combined result (patient info, disease info, whether the medicine is listed, full medicine details). |

### Example: `POST /api/check`

Request body:
```json
{
  "disease": "fever",
  "medicine": "dolo650",
  "symptoms": "body ache, mild fever",
  "age": 32
}
```

Success response (`200`):
```json
{
  "patient": { "age": 32, "symptoms": "body ache, mild fever" },
  "disease": { "name": "Fever", "category": "General", "commonSymptoms": "..." },
  "matched": true,
  "listedMedicines": [ { "name": "Paracetamol", "...": "..." }, ... ],
  "selectedMedicine": { "name": "Dolo 650", "...": "..." },
  "disclaimer": "Educational information only. ..."
}
```

Error responses use `400` (missing/invalid input) or `404` (disease/medicine not found),
with a JSON body like `{ "error": "..." }`.

## Notes on deployment

- The frontend and backend are served from the **same origin** by default (Express
  serves `public/` as static files, and the frontend calls relative `/api/...` URLs).
- If you ever split them (e.g. frontend on Vercel, backend on Render/Railway), set the
  `API_BASE` constant near the top of the `<script>` tag in `public/index.html` to your
  backend's full URL, and make sure CORS stays enabled server-side (it already is, via
  the `cors` package).
- To extend the database, just add entries to `public/data/diseases.json` and
  `public/data/medicines.json` — no code changes needed.

## Disclaimer

Same as the original project: this is educational information only. It does not
diagnose disease or prescribe medication, and medicine information can vary by
product, strength, country, age, weight, allergies, pregnancy, other conditions, and
other medicines. Always check the current package label and consult a doctor or
pharmacist.
"# MEDSENSE" 

## Hosting notes

- The dashboard (home page) also works as a static site (e.g. GitHub Pages: publish the `public/` folder); it reads `public/data/*.json` directly.
- The checker page needs the Node server (`/api/check`), so host the whole app on Render, Railway, etc.
- The theme (light/dark) follows the device setting and is remembered in the browser.

## Features
- Dashboard with category filters and multi-symptom search (e.g. "fever, cough" ranks diseases by how many words match).
- Save diseases and medicines (stored in the browser only) and see them under **Saved**.
- "Check a medicine for ..." opens the checker with the disease or medicine already filled in (`checker.html?disease=...&medicine=...`).

- **Ingredients** tab: every active ingredient with its class, mechanism of action and the medicines that contain it, plus typical excipients per dosage form (for study).
- **Compare** tab: up to 3 medicines side by side, with a warning when they share an active ingredient.
- **Warning signs** on every disease, and a **Print / Save as PDF** report to take to a doctor.

