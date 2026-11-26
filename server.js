const express = require("express");
const path = require("path");
const cors = require("cors");

const diseases = require("./public/data/diseases.json");
const medicines = require("./public/data/medicines.json");
const ingredients = require("./public/data/ingredients.json");
const external = require("./external");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
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

// One search that covers EVERYTHING: your database first, then the live
// U.S. FDA drug-label database for any medicine you do not have locally.
app.get("/api/lookup", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.status(400).json({ error: "Type at least 2 characters." });
  const key = findMedicineKey(q);
  const local = key ? { name: key, ...medicines[key] } : null;
  const extra = local ? [local.actives && local.actives[0]].filter(Boolean) : [];
  const ext = await external.lookup(q, extra);
  res.json({
    query: q,
    local,
    localDidYouMean: local ? [] : closestMedicineNames(q),
    external: ext,
  });
});

app.get("/api/external/medicines/:name", async (req, res) => {
  const r = await external.lookup(req.params.name);
  res.status(r.unavailable ? 502 : 200).json(r);
});

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
app.post("/api/check", async (req, res) => {
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
      external: await external.lookup(medicine),
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

/* ============================================================
   PRESCRIPTION SCANNER (typed text and PDF only)
   The browser reads the PDF / text file / pasted text and sends the
   text lines here. We keep only the lines that look like medicines,
   match them against YOUR medicines.json and list alternatives that
   have the SAME active ingredient. No photos, no handwriting, no
   API key, nothing is stored.
============================================================ */

const activeKey = (m) => (m.actives || []).map(normalize).sort().join("|");

// Same active ingredient(s) only. Never suggests a different ingredient.
function alternativesFor(medicineKey) {
  const key = activeKey(medicines[medicineKey]);
  if (!key) return [];
  return Object.keys(medicines)
    .filter((n) => n !== medicineKey && activeKey(medicines[n]) === key)
    .map((n) => ({
      name: n,
      form: medicines[n].form,
      purpose: medicines[n].purpose,
      precautions: medicines[n].precautions,
    }));
}

// "Tab. Dolo 650 mg BD x 5 days" -> "dolo"  (drops forms, strengths, frequencies)
function cleanName(text) {
  return normalize(text)
    .replace(/^\W*rx\b[\s.:]*/, " ")
    .replace(/\b(tab|tabs|tablet|tablets|cap|caps|capsule|capsules|syp|syrup|susp|suspension|inj|injection|cream|gel|oint|ointment|drops|inhaler|sachet)\b\.?/g, " ")
    .replace(/\b\d+(\.\d+)?\s*(mg|mcg|µg|g|ml|iu|%)\b/g, " ")
    .replace(/[^a-z0-9 \-()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchMedicine(written, genericGuess) {
  const tries = [
    { text: written, via: "name" },
    { text: genericGuess, via: "ingredient" },
  ];
  for (const t of tries) {
    if (!t.text) continue;
    const raw = normalize(t.text);
    const cleaned = cleanName(t.text);
    // exact name or alias, with and without the strength (e.g. "Dolo 650")
    for (const cand of [raw, cleaned]) {
      if (!cand) continue;
      const exact =
        Object.keys(medicines).find((k) => normalize(k) === cand) ||
        (MEDICINE_ALIASES[cand] && medicines[MEDICINE_ALIASES[cand]] ? MEDICINE_ALIASES[cand] : null);
      if (exact) return { status: "matched", via: t.via, key: exact };
    }
    // a known medicine name written inside the text (e.g. "dolo 650" in "tab dolo 650 mg bd")
    const inside = Object.keys(medicines)
      .filter((k) => normalize(k).length >= 4)
      .filter((k) =>
        new RegExp(`(^|[^a-z0-9])${normalize(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`).test(raw)
      )
      .sort((a, b) => b.length - a.length)[0];
    if (inside) return { status: "matched", via: t.via, key: inside };
    // active-ingredient match (e.g. "acetaminophen" -> Paracetamol)
    if (cleaned.length >= 4) {
      const byIngredient = Object.keys(medicines).find((k) => {
        const hay = normalize(`${medicines[k].ingredient || ""} ${(medicines[k].actives || []).join(" ")}`);
        return hay.includes(cleaned);
      });
      if (byIngredient) return { status: "matched", via: "ingredient", key: byIngredient };
    }
  }
  // Not certain: only offer "did you mean", never auto-accept a fuzzy match
  const possible = closestMedicineNames(cleanName(written) || written || genericGuess || "", 3);
  return possible.length
    ? { status: "possible", via: "fuzzy", suggestions: possible }
    : { status: "not_found", via: null };
}

function describeMatch(m) {
  if (!m.key) return { status: m.status, suggestions: m.suggestions || [] };
  const rec = medicines[m.key];
  return {
    status: m.status,
    matchedVia: m.via, // "name" or "ingredient" (identified from the generic name)
    medicine: {
      name: m.key,
      form: rec.form,
      ingredient: rec.ingredient,
      purpose: rec.purpose,
      uses: rec.uses,
      precautions: rec.precautions,
      warning: rec.warning,
    },
    alternatives: alternativesFor(m.key),
  };
}

// Dosage hints as written: "1-0-1", "BD", "x 5 days", "after food" ...
const DOSAGE_PATTERNS = [
  /\b\d\s*-\s*\d\s*-\s*\d(?:\s*-\s*\d)?\b/,
  /\b(?:od|bd|bid|tds|tid|qid|qds|hs|sos|prn|stat)\b/i,
  /\b(?:once|twice|thrice)\s+(?:a\s+|per\s+)?(?:daily|day|week)\b/i,
  /\b(?:x|for)\s*\d+\s*(?:days?|weeks?|months?)\b/i,
  /\b(?:before|after|with)\s+(?:food|meals?|breakfast|lunch|dinner)\b/i,
];
function extractDosage(line) {
  return DOSAGE_PATTERNS.map((re) => (line.match(re) || [""])[0].trim()).filter(Boolean).join(", ");
}

const MED_LINE_START =
  /^\W*(?:rx\b\W*)?(\d+\s*[.)\-:]?\s*)?\W*(tab|tabs|tablet|cap|caps|capsule|syp|syrup|inj|susp|cream|oint|gel|drops|sachet|inhaler)\b/i;

function matchPrescriptionLines(lines) {
  const results = [];
  const seen = new Set();
  const pieces = lines
    .slice(0, 300)
    .flatMap((raw) => String(raw || "").slice(0, 300).split(";"))
    .map((l) => l.replace(/\s+/g, " ").trim());

  for (const line of pieces) {
    if (line.length < 3) continue;

    let m = matchMedicine(line, "");
    if (m.status !== "matched") {
      m = null;
      const tokens = normalize(line).split(/[^a-z]+/).filter((t) => t.length >= 5);
      for (const t of tokens) {
        const top = closestMedicineNames(t, 1)[0];
        if (top && similarity(t, normalize(top)) >= 0.75) {
          m = { status: "possible", via: "fuzzy", suggestions: [top] };
          break;
        }
      }
    }
    if (!m && !MED_LINE_START.test(line)) continue; // ignore doctor name, address, dates ...
    if (!m) m = { status: "not_found", via: null };

    const id = m.key || (m.suggestions && m.suggestions[0]) || normalize(line);
    if (seen.has(id)) continue;
    seen.add(id);
    results.push({
      written: line,
      genericName: "",
      strength: (line.match(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu)\b/i) || [""])[0],
      dosage: extractDosage(line),
      confidence: m.status === "matched" ? (m.via === "name" ? "high" : "medium") : "low",
      ...describeMatch(m),
    });
  }
  return results;
}

// POST /api/scan-text   body: { lines: ["Tab. Dolo 650 mg 1-0-1 x 5 days", ...] }
app.post("/api/scan-text", (req, res) => {
  const lines = req.body && req.body.lines;
  if (!Array.isArray(lines) || !lines.length) {
    return res.status(400).json({ error: "No text received. Paste your prescription or upload a PDF with selectable text." });
  }
  res.json({
    isPrescription: true,
    notes: "Read from typed text. Check every name against your prescription, because the text may contain mistakes.",
    results: matchPrescriptionLines(lines),
    disclaimer:
      "Educational information only. Check every name against your prescription. Alternatives share the same active ingredient only. Never switch medicines without asking your doctor or pharmacist.",
  });
});

// GET /api/alternatives/:name  (used when the user corrects a scanned name)
app.get("/api/alternatives/:name", (req, res) => {
  res.json(describeMatch(matchMedicine(req.params.name, "")));
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
