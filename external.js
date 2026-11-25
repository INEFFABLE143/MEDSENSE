"use strict";
/* Live medicine lookup beyond the built-in database.
   - openFDA drug labels (U.S. FDA, free): https://open.fda.gov/apis/drug/label/
   - RxNorm spelling suggestions (U.S. NLM, free) for "did you mean".
   Optional: set OPENFDA_API_KEY to raise the daily limit (1,000 -> 120,000 requests/day). */

const FDA = "https://api.fda.gov/drug/label.json";
const RX = "https://rxnav.nlm.nih.gov/REST";
const KEY = process.env.OPENFDA_API_KEY ? `api_key=${encodeURIComponent(process.env.OPENFDA_API_KEY)}&` : "";
const TTL = 24 * 60 * 60 * 1000;
const MAX_CACHE = 500;
const cache = new Map();

// Indian / international names -> the names the U.S. database uses.
const ALIASES = {
  paracetamol: "acetaminophen", dolo: "acetaminophen", crocin: "acetaminophen", calpol: "acetaminophen",
  salbutamol: "albuterol", adrenaline: "epinephrine", noradrenaline: "norepinephrine",
  frusemide: "furosemide", lignocaine: "lidocaine", rifampicin: "rifampin", pethidine: "meperidine",
  "glyceryl trinitrate": "nitroglycerin", disprin: "aspirin", pantop: "pantoprazole",
  "vitamin c": "ascorbic acid", "vitamin d": "cholecalciferol", "vitamin b12": "cyanocobalamin",
};

async function getJson(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
  let v = null;
  if (r.status !== 404) {
    if (!r.ok) throw new Error("Upstream error " + r.status);
    v = await r.json();
  }
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(url, { t: Date.now(), v });
  return v;
}

function cleanName(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/\b\d+(\.\d+)?\s*(mg|mcg|µg|g|ml|iu|%)?/g, " ") // strip strengths like "650" or "500 mg"
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(v, max = 1200) {
  if (!v) return null;
  const t = (Array.isArray(v) ? v.join(" ") : String(v)).replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, "") + "…" : t;
}

function shape(l) {
  const o = l.openfda || {};
  const t = String(l.effective_time || "");
  return {
    brandNames: (o.brand_name || []).slice(0, 5),
    genericNames: (o.generic_name || []).slice(0, 3),
    substances: (o.substance_name || []).slice(0, 6),
    manufacturer: (o.manufacturer_name || [])[0] || null,
    route: (o.route || []).slice(0, 3),
    labelDate: t.length === 8 ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6)}` : null,
    activeIngredient: pick(l.active_ingredient, 300),
    uses: pick(l.indications_and_usage || l.purpose, 1200),
    boxedWarning: pick(l.boxed_warning, 900),
    warnings: pick(l.warnings || l.warnings_and_cautions, 1500),
    doNotUse: pick(l.do_not_use, 600),
    stopUse: pick(l.stop_use, 600),
    contraindications: pick(l.contraindications, 900),
    adverseReactions: pick(l.adverse_reactions, 1200),
    interactions: pick(l.drug_interactions, 1200),
    pregnancy: pick(l.pregnancy || l.pregnancy_or_breast_feeding, 700),
    pediatric: pick(l.pediatric_use, 700),
  };
}

async function fetchLabel(term) {
  const fields = ["brand_name", "generic_name", "substance_name"];
  const q = fields.map((f) => `openfda.${f}:"${encodeURIComponent(term)}"`).join("+OR+");
  const j = await getJson(`${FDA}?${KEY}search=${q}&limit=5`);
  const results = (j && j.results) || [];
  if (!results.length) return null;
  return shape(results.find((r) => r.indications_and_usage || r.purpose) || results[0]);
}

async function spell(term) {
  try {
    const j = await getJson(`${RX}/spellingsuggestions.json?name=${encodeURIComponent(term)}`);
    const s = j && j.suggestionGroup && j.suggestionGroup.suggestionList && j.suggestionGroup.suggestionList.suggestion;
    return Array.isArray(s) ? s.slice(0, 5) : [];
  } catch (e) {
    return [];
  }
}

/* Never throws. Returns { found, query, searchedAs?, label?, suggestions?, unavailable? } */
async function lookup(name, extraTerms = []) {
  const base = cleanName(name);
  if (base.length < 3) return { found: false, query: name, suggestions: [] };
  const terms = [ALIASES[base], base, ...extraTerms.map((t) => { const c = cleanName(t); return ALIASES[c] || c; })]
    .filter((t, i, a) => t && t.length >= 3 && a.indexOf(t) === i);
  try {
    for (const term of terms) {
      const label = await fetchLabel(term);
      if (label) return { found: true, query: name, searchedAs: term, label };
    }
    return { found: false, query: name, suggestions: await spell(base) };
  } catch (e) {
    return { found: false, query: name, unavailable: true, suggestions: [] };
  }
}

module.exports = { lookup, cleanName };
