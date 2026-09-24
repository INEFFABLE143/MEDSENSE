const express = require("express");
const path = require("path");
const cors = require("cors");

const diseases = require("./data/diseases.json");
const medicines = require("./data/medicines.json");

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
  for (const key of Object.keys(diseases)) {
    if (normalize(key).includes(search) || search.includes(normalize(key))) {
      return key;
    }
  }
  return null;
}

function findMedicineKey(input) {
  const search = normalize(input);
  if (MEDICINE_ALIASES[search] && medicines[MEDICINE_ALIASES[search]]) {
    return MEDICINE_ALIASES[search];
  }
  for (const key of Object.keys(medicines)) {
    if (normalize(key) === search) return key;
  }
  for (const key of Object.keys(medicines)) {
    if (normalize(key).includes(search) || search.includes(normalize(key))) {
      return key;
    }
  }
  return null;
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

// Full record for one disease
app.get("/api/diseases/:name", (req, res) => {
  const key = findDiseaseKey(req.params.name);
  if (!key) return res.status(404).json({ error: "Disease not found", query: req.params.name });
  res.json({ name: key, ...diseases[key] });
});

// Full record for one medicine
app.get("/api/medicines/:name", (req, res) => {
  const key = findMedicineKey(req.params.name);
  if (!key) return res.status(404).json({ error: "Medicine not found", query: req.params.name });
  res.json({ name: key, ...medicines[key] });
});

/**
 * POST /api/check
 * body: { disease, medicine, symptoms, age }
 * Mirrors the original front-end logic, but run server-side so the
 * database and matching rules aren't exposed/editable in client JS.
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
    return res.status(404).json({ error: `"${disease}" is not currently in the database.`, field: "disease" });
  }

  const medicineKey = findMedicineKey(medicine);
  if (!medicineKey) {
    return res.status(404).json({ error: `"${medicine}" is not currently in the medicine database.`, field: "medicine" });
  }

  const diseaseData = diseases[diseaseKey];
  const medicineData = medicines[medicineKey];

  const matched = diseaseData.medicines.some((m) => normalize(m) === normalize(medicineKey));

  const listedMedicines = diseaseData.medicines
    .filter((name) => medicines[name])
    .map((name) => ({ name, ...medicines[name] }));

  res.json({
    patient: {
      age: ageNum,
      symptoms: symptoms.trim() || null,
    },
    disease: {
      name: diseaseKey,
      category: diseaseData.category,
      commonSymptoms: diseaseData.symptoms,
    },
    matched,
    listedMedicines,
    selectedMedicine: { name: medicineKey, ...medicineData },
    disclaimer:
      "Educational information only. This does not diagnose disease or prescribe medication. Always check the exact package label and consult a doctor or pharmacist.",
  });
});

// Fallback to the SPA for any non-API route
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Med Sense server running at http://localhost:${PORT}`);
});
