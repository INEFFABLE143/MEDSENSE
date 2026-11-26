# Med Sense

Medicine, made clear. An **educational** disease, symptom and medicine information website.
It does not diagnose disease or prescribe medication.

- **Backend:** Node.js + Express (`server.js`, `external.js`)
- **Frontend:** static pages in `public/`
- **Data:** your own JSON data (`public/data/`) **plus a live lookup of the U.S. FDA drug-label database (openFDA)**, so users can search medicines that are not in your own data.

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
    ├── scan.html        # Prescription scanner (typed text and PDF only)
    ├── css/             # brand.css, layout.css (sidebar menu + scrollbar)
    ├── js/              # theme.js, sidebar.js, suggest.js, fdacard.js
    ├── img/             # logos and icon
    └── data/            # diseases.json, medicines.json, ingredients.json
```

## Run locally

Requires **Node.js 18+**.

```bash
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
| POST | `/api/scan-text` | Body `{ lines: [...] }` (text lines from a prescription). Returns the medicines found and same-ingredient alternatives. |
| GET | `/api/alternatives/:name` | Match one medicine name and list same-ingredient alternatives (used when a scanned name is corrected). |
| POST | `/api/check` | Body `{ disease, medicine, symptoms, age }`. If the medicine is not in your data, the response (404) includes the FDA label in `external`. |
| GET | `/api/diseases`, `/api/medicines` | Name lists for autocomplete. |
| GET | `/api/diseases/:name`, `/api/medicines/:name` | One record (fuzzy matched). |
| GET | `/api/diseases-all`, `/api/medicines-all`, `/api/ingredients-all` | Full data used by the dashboard. |

## Prescription scanner

`scan.html` reads **typed or printed prescriptions only**: a PDF with selectable text (read in the browser with pdf.js),
a `.txt` file, or pasted text. Photos and handwriting are not supported, and scanned PDFs without a text layer are
rejected with a clear message. Only the extracted text lines are sent to `/api/scan-text`; nothing is stored and no API
key is needed. Alternatives always share the same active ingredient.

## Sidebar menu and scrolling

`js/sidebar.js` + `css/layout.css` add the sidebar menu (Diseases, Medicines, Ingredients, Compare, Saved, plus Scan,
Checker and Search) and the scroll helpers (wide scrollbar, progress bar, jump-to-top/bottom buttons) to every page.
New page? Add `<link rel="stylesheet" href="css/layout.css">` in `<head>` and `<script src="js/sidebar.js"></script>` as the first line inside `<body>`.

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
