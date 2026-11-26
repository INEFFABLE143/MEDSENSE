# Med Sense

Medicine, made clear. An **educational** disease, symptom and medicine information website.
It does not diagnose disease or prescribe medication.

- **Backend:** Node.js + Express (`server.js`, `external.js`, `library.js`)
- **Frontend:** static pages in `public/`
- **Data:** your own JSON data (`public/data/`), the **Medicine Study Library**, **plus a live lookup of the U.S. FDA drug-label database (openFDA)**, so users can search medicines that are not in your own data.

## Project structure

```
med-sense/
├── server.js            # Express app and API routes
├── external.js          # Live openFDA / RxNorm lookup (with cache and name aliases)
├── library.js           # Merges the Medicine Study Library into the checker's medicine data
├── package.json
├── .env.example         # Optional settings
├── scripts/
│   ├── check-data.mjs          # Checks that the JSON data files agree with each other
│   ├── export-library-csv.mjs  # Rebuilds medicine-library.csv from the JSON
│   └── suggest-rxnorm.mjs      # Suggests RxNorm IDs (needs internet; review by hand)
└── public/
    ├── index.html            # Dashboard (diseases, medicines, ingredients, compare, saved)
    ├── checker.html          # Medicine checker
    ├── search.html           # Search ALL medicines (own data + live FDA lookup)
    ├── scan.html             # Prescription scanner (typed text and PDF only)
    ├── medicine-library.html # Medicine Study Library (searchable cards + CSV download)
    ├── css/                  # brand.css, layout.css (sidebar menu + scrollbar), medicine-library.css
    ├── js/                   # theme.js, sidebar.js, suggest.js, fdacard.js, medicine-library.js
    ├── img/                  # logos and icon
    └── data/                 # diseases.json, medicines.json, ingredients.json,
                              # medicine-library.json, medicine-library.csv
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

## npm scripts

| Command | What it does |
|---------|--------------|
| `npm start` | Starts the server. |
| `npm run dev` | Starts the server with auto-restart (nodemon). |
| `npm run check:data` | Checks the data files: every disease and ingredient points to a medicine that exists, every medicine has `actives`, library ids and names are unique, NLEM values are valid and RxCUIs are numbers. Exits with an error if something is wrong. Run it after editing any JSON file. |
| `npm run export:csv` | Rebuilds `public/data/medicine-library.csv` from `medicine-library.json`. |
| `npm run rxnorm:suggest` | Asks RxNav for RxNorm ID *suggestions* and writes `public/data/rxnorm-candidates.json`. Needs internet. Review every suggestion by hand. |

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lookup?q=name` | Search any medicine: returns your record (if any), its `library` info (if any) and the live FDA label (if any). |
| GET | `/api/external/medicines/:name` | Live FDA lookup only. |
| POST | `/api/scan-text` | Body `{ lines: [...] }` (text lines from a prescription). Returns the medicines found and same-ingredient alternatives. |
| GET | `/api/alternatives/:name` | Match one medicine name and list same-ingredient alternatives (used when a scanned name is corrected). |
| POST | `/api/check` | Body `{ disease, medicine, symptoms, age }`. The result includes `library` info for the selected medicine. If the medicine is not in your data, the response (404) includes the FDA label in `external`. |
| GET | `/api/diseases`, `/api/medicines` | Name lists for autocomplete. |
| GET | `/api/diseases/:name`, `/api/medicines/:name` | One record (fuzzy matched). |
| GET | `/api/diseases-all`, `/api/medicines-all`, `/api/ingredients-all` | Full data used by the dashboard. `/api/medicines-all` adds a `library` field to medicines that are in the study library. |

## Medicine Study Library

`public/medicine-library.html` shows study cards (therapeutic class, how the medicine works, NLEM 2022 status, RxNorm status)
with a search box and a CSV download. The data is in `public/data/medicine-library.json`.

**How it connects to the rest of the site**

- On startup, `library.js` merges the library into the checker's medicine data.
- Library medicines that already exist in `medicines.json` keep their full records. The library info is attached to them
  (names, aliases and identical active ingredients are matched, so "Acetaminophen" finds Paracetamol).
- Library medicines that are **not** in `medicines.json` are added with only what the library really has (ingredient, class and a
  warning that details are not added yet). Fields without data are left out and the pages hide them, so no medical text is invented.
  These medicines are not linked to any disease yet.
- The checker, the search page and the dashboard medicine page all show a "Medicine Study Library" box.

**Data status (important)**

- The library is **starter study material**. Every entry is currently `"unverified"` for NLEM 2022 and has no RxCUI.
- The site shows "Not verified yet" and "Not reviewed yet" until you update the data.
- Do not describe the library as a verified NLEM list until it has been checked against the official publication of the
  Ministry of Health and Family Welfare, India.

**How to add verified data**

1. Edit `public/data/medicine-library.json`. Set `nlem2022Membership` to `"listed"` or `"not_listed"`, and set
   `rxnorm` to `{ "rxcui": "1234", "status": "verified" }` (the RxCUI must be digits only).
2. Set `dataset.officialListVerified` to `true` only when the whole list has been checked.
3. Run `npm run check:data`, then `npm run export:csv` to refresh the CSV.

## Prescription scanner

`scan.html` reads **typed or printed prescriptions only**: a PDF with selectable text (read in the browser with pdf.js),
a `.txt` file, or pasted text. Photos and handwriting are not supported, and scanned PDFs without a text layer are
rejected with a clear message. Only the extracted text lines are sent to `/api/scan-text`; nothing is stored and no API
key is needed. Alternatives always share the same active ingredient.

## Sidebar menu and scrolling

`js/sidebar.js` + `css/layout.css` add the sidebar menu (Diseases, Medicines, Ingredients, Compare, Saved, plus Scan,
Checker, Search and the Medicine Study Library) and the scroll helpers (wide scrollbar, progress bar, jump-to-top/bottom buttons) to every page.
New page? Add `<link rel="stylesheet" href="css/layout.css">` in `<head>` and `<script src="js/sidebar.js"></script>` as the first line inside `<body>`.

## Live lookup notes

- Uses Node's built-in `fetch`; no extra packages. Results are cached in memory for 24 hours.
- Common Indian/international names are mapped to U.S. names in `external.js` (`ALIASES`), for example paracetamol to acetaminophen. Add your own there.
- It covers U.S. labels. Brands, strengths, approved uses and availability can differ in India, and Indian-only brands may not be found. Add those to `public/data/medicines.json`.
- Dosing text from FDA labels is deliberately not shown.

## Data sources

- `diseases.json`, `medicines.json`, `ingredients.json`: written for this project as educational summaries. They have not been reviewed
  by a doctor or pharmacist. Check them against the product label and a trusted reference before relying on them.
- `medicine-library.json`: starter study notes (see "Data status" above).
- Live FDA label text: openFDA (public domain, CC0). RxNorm spelling suggestions: U.S. National Library of Medicine.

## Extending your own data

Add entries to `public/data/diseases.json` and `public/data/medicines.json`. No code changes needed.
Every medicine needs an `actives` list (the scanner uses it to find same-ingredient alternatives).
Run `npm run check:data` afterwards to catch typos in names.

## Deployment

The app needs the Node server (the checker and live lookup use `/api/...`), so deploy to a Node host such as Render or Railway:
build command `npm install`, start command `npm start`. Static-only hosting (GitHub Pages) will not work for the checker or search.

## Known limitations

- NLEM 2022 membership and RxNorm IDs are not verified yet (see above).
- Library-only medicines have limited information and are not linked to diseases.
- FDA labels are U.S. labels; Indian-only brands may not be found.
- The scanner cannot read photos or handwriting.
- No user accounts; saved items live in the browser only.

## Disclaimer

Educational information only. It does not diagnose disease or prescribe medication. Medicine information varies by
product, strength, country, age, weight, allergies, pregnancy, other conditions and other medicines. Always check the
package label and consult a doctor or pharmacist.

## License

MIT (see `LICENSE`). Data from openFDA is public domain (CC0).
