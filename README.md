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

## Project structure

```
medsense/
├── server.js              # Express app + API routes
├── package.json
├── data/
│   ├── diseases.json       # disease -> category, common symptoms, associated OTC medicines
│   └── medicines.json      # medicine -> form, ingredient, uses, precautions, etc.
└── public/
    └── index.html          # frontend (fetches data from the API)
```

## Setup

Requires **Node.js 18+**.

```bash
cd medsense
npm install
npm start
```

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
- To extend the database, just add entries to `data/diseases.json` and
  `data/medicines.json` — no code changes needed.

## Disclaimer

Same as the original project: this is educational information only. It does not
diagnose disease or prescribe medication, and medicine information can vary by
product, strength, country, age, weight, allergies, pregnancy, other conditions, and
other medicines. Always check the current package label and consult a doctor or
pharmacist.
"# MEDSENSE" 
