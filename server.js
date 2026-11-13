const express = require("express");
const path = require("path");
const cors = require("cors");

const diseases = require("./public/data/diseases.json");
const medicines = require("./public/data/medicines.json");
const ingredients = require("./public/data/ingredients.json");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ============================================================
   HELPERS
============================================================ */

function normalize(text) {
  return String(text).toLowerCase().trim();
}

const MEDICINE_ALIASES = {
  "dolo650": "Dolo 650",
  "dolo 650": "Dolo 650",
  "dolo-650": "Dolo 650",
};

function findDiseaseKey(input) {
  const search = normalize(input);
  for (const key of Object.keys(diseases)) {
    if (normalize(key) === search) return key;
  }
  if (search.length < 3) return null;
  const keys = Object.keys(diseases);
  return keys.find((k) => normalize(k).startsWith(search)) ||
    keys.find((k) => normalize(k).includes(search)) ||
    keys.find((k) => normalize(k).length >= 3 && search.includes(normalize(k))) || null;
}

function findMedicineKey(input) {
  const search = normalize(input);
  if (MEDICINE_ALIASES[search] && medicines[MEDICINE_ALIASES[search]]) {
    return MEDICINE_ALIASES[search];
  }
  for (const key of Object.keys(medicines)) {
    if (normalize(key) === search) return key;
  }
  if (search.length < 3) return null;
  const keys = Object.keys(medicines);
  return keys.find((k) => normalize(k).startsWith(search)) ||
    keys.find((k) => normalize(k).includes(search)) ||
    keys.find((k) => normalize(k).length >= 3 && search.includes(normalize(k))) || null;
}

/* ============================================================
   SUGGESTION HELPERS
   Used when a disease or medicine is not found, so the user
   gets useful options from YOUR database instead of a dead end.
============================================================ */

const STOP_WORDS = new Set([
  "and", "the", "with", "for", "from", "have", "has", "disease",
  "problem", "issue", "condition", "symptom", "symptoms",
]);

// Classic Levenshtein distance (handles typos like "diarhea")
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  return 1 - editDistance(a, b) / Math.max(a.length, b.length);
}

// Medicines of a disease that actually exist in medicines.json
function listedMedicinesFor(diseaseKey) {
  return (diseases[diseaseKey].medicines || [])
    .filter((name) => medicines[name])
    .map((name) => ({ name, ...medicines[name] }));
}

// Diseases in which a given medicine is listed
function diseasesUsingMedicine(medicineKey) {
  return Object.keys(diseases).filter((d) =>
    (diseases[d].medicines || []).some((m) => normalize(m) === normalize(medicineKey))
  );
}

// "Did you mean ...?" for a mistyped / unknown medicine name.
// Also matches on active ingredient (e.g. "acetaminophen" -> Paracetamol).
function closestMedicineNames(input, limit = 5) {
  const s = normalize(input);
  if (s.length < 2) return [];

  return Object.keys(medicines)
    .map((name) => {
      const n = normalize(name);
      const m = medicines[name];
      let score = similarity(s, n);

      if (s.length >= 3 && (n.includes(s) || (n.length >= 3 && s.includes(n)))) score += 0.5;

      const haystack = normalize(`${m.ingredient || ""} ${(m.actives || []).join(" ")}`);
      if (s.length >= 3 && haystack.includes(s)) score += 0.5;

      return { name, score };
    })
    .filter((x) => x.score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.name);
}

// Similar diseases for an unknown disease name, also using the
// symptoms the user typed (e.g. "stomach pain" -> Stomach Cramps).
function suggestDiseases(input, extraText = "", limit = 4) {
  const s = normalize(input);
  const tokens = normalize(`${input} ${extraText}`)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  return Object.entries(diseases)
    .map(([name, d]) => {
      const n = normalize(name);
      const hay = `${n} ${normalize(d.symptoms || "")} ${normalize(d.category || "")}`;
      let score = 0;

      for (const t of tokens) {
        if (n.includes(t)) score += 3;
        else if (hay.includes(t)) score += 1;
      }

      const closeness = similarity(s, n);
      if (s.length >= 3 && closeness >= 0.6) score += closeness * 5;

      return { name, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ name }) => ({
      name,
      category: diseases[name].category,
      symptoms: diseases[name].symptoms,
      note: diseases[name].note || null,
      medicines: listedMedicinesFor(name).map((m) => ({
        name: m.name,
        form: m.form,
        purpose: m.purpose,
      })),
    }));
}

/* ============================================================
   API ROUTES
============================================================ */

// List all disease names (for the datalist / autocomplete)
app.get("/api/diseases", (req, res) => {
  res.json(Object.keys(diseases).sort());
});

// List all medicine names (for the datalist / autocomplete)
app.get("/api/medicines", (req, res) => {
  res.json(Object.keys(medicines).sort());
});

// Full lists (used by the dashboard)
app.get("/api/diseases-all", (req, res) => res.json(diseases));
app.get("/api/medicines-all", (req, res) => res.json(medicines));
app.get("/api/ingredients-all", (req, res) => res.json(ingredients));

// Full record for one disease
app.get("/api/diseases/:name", (req, res) => {
  const key = findDiseaseKey(req.params.name);
  if (!key) {
    return res.status(404).json({
      error: "Disease not found",
      query: req.params.name,
      suggestedDiseases: suggestDiseases(req.params.name),
    });
  }
  res.json({ name: key, ...diseases[key] });
});

// Full record for one medicine
app.get("/api/medicines/:name", (req, res) => {
  const key = findMedicineKey(req.params.name);
  if (!key) {
    return res.status(404).json({
      error: "Medicine not found",
      query: req.params.name,
      didYouMean: closestMedicineNames(req.params.name),
    });
  }
  res.json({ name: key, ...medicines[key] });
});

/**
 * POST /api/check
 * body: { disease, medicine, symptoms, age }
 * Mirrors the original front-end logic, but run server-side so the
 * database and matching rules aren't exposed/editable in client JS.
 *
 * Not-found responses (404) now carry suggestions:
 *  - field "medicine": { disease, didYouMean, suggestedMedicines }
 *  - field "disease":  { suggestedDiseases, medicineName, medicineUsedFor }
 */
app.post("/api/check", (req, res) => {
  const { disease, medicine, symptoms = "", age } = req.body || {};

  if (!disease || !String(disease).trim() || !medicine || !String(medicine).trim() || age === undefined || age === null || age === "") {
    return res.status(400).json({ error: "Please provide disease, medicine and age." });
  }

  const ageNum = Number(age);
  if (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
    return res.status(400).json({ error: "Please enter a valid age between 0 and 120." });
  }

  const diseaseKey = findDiseaseKey(disease);
  if (!diseaseKey) {
    // Disease unknown: offer similar diseases, and if the medicine IS
    // known, tell the user which diseases it is listed for.
    const knownMedicineKey = findMedicineKey(medicine);
    return res.status(404).json({
      error: `"${disease}" is not currently in the database.`,
      field: "disease",
      suggestedDiseases: suggestDiseases(disease, symptoms),
      medicineName: knownMedicineKey,
      medicineUsedFor: knownMedicineKey ? diseasesUsingMedicine(knownMedicineKey) : [],
    });
  }

  const medicineKey = findMedicineKey(medicine);
  if (!medicineKey) {
    // Medicine unknown: suggest the medicines in the database that are
    // listed for this disease (plus close spellings of what was typed).
    const dd = diseases[diseaseKey];
    return res.status(404).json({
      error: `"${medicine}" is not currently in the medicine database.`,
      field: "medicine",
      disease: {
        name: diseaseKey,
        category: dd.category,
        commonSymptoms: dd.symptoms,
        warningSigns: dd.warningSigns || [],
        note: dd.note || null,
      },
      didYouMean: closestMedicineNames(medicine),
      suggestedMedicines: listedMedicinesFor(diseaseKey),
    });
  }

  const diseaseData = diseases[diseaseKey];
  const medicineData = medicines[medicineKey];

  const matched = diseaseData.medicines.some((m) => normalize(m) === normalize(medicineKey));

  const listedMedicines = listedMedicinesFor(diseaseKey);

  res.json({
    patient: {
      age: ageNum,
      symptoms: symptoms.trim() || null,
    },
    disease: {
      name: diseaseKey,
      category: diseaseData.category,
      commonSymptoms: diseaseData.symptoms,
      warningSigns: diseaseData.warningSigns || [],
    },
    matched,
    listedMedicines,
    selectedMedicine: { name: medicineKey, ...medicineData },
    disclaimer:
      "Educational information only. This does not diagnose disease or prescribe medication. Always check the exact package label and consult a doctor or pharmacist.",
  });
});

// Fallback to the SPA for any non-API route
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

app.use((req, res) => {
  if (path.extname(req.path)) return res.status(404).send("Not found");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Med Sense server running at http://localhost:${PORT}`);
});
