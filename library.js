/* Med Sense: merges the Medicine Study Library into the checker's medicine data.
   - Library medicines that already exist in medicines.json keep their full records;
     the library info (class, mechanism, NLEM / RxNorm status) is attached to them.
   - Library medicines that are missing are added with ONLY the fields the library
     really has. Every other field says "Not added yet" so nothing is invented. */

const NOT_ADDED = "Not added yet. Check the package label and ask a doctor or pharmacist.";

function mergeLibrary(medicines, library, normalize) {
  const entries = (library && library.medicines) || [];
  const byKey = {};
  const aliases = {};
  const added = [];
  const actives = (m) => (m.actives || []).map(normalize).filter(Boolean).sort().join("|");

  for (const e of entries) {
    const names = [e.genericName, ...(e.aliases || [])].filter(Boolean);
    const ingredientKey = (e.ingredients || []).map(normalize).filter(Boolean).sort().join("|");
    const keys = Object.keys(medicines).filter((k) => !medicines[k].libraryOnly);

    // 1) same name or alias, 2) same active ingredients, 3) ingredient text names the medicine
    let hits = keys.filter((k) => names.some((n) => normalize(n) === normalize(k)));
    if (!hits.length && ingredientKey) hits = keys.filter((k) => actives(medicines[k]) === ingredientKey);
    if (!hits.length && normalize(e.genericName).length > 3) {
      hits = keys.filter((k) => normalize(medicines[k].ingredient || "").includes(normalize(e.genericName)));
    }

    const info = {
      genericName: e.genericName,
      therapeuticClass: e.therapeuticClass || null,
      mechanismOfAction: e.mechanismOfAction || null,
      nlem2022Membership: e.nlem2022Membership || "unverified",
      rxnorm: e.rxnorm || { rxcui: null, status: "not_reviewed" },
    };

    if (!hits.length) {
      const key = e.genericName;
      medicines[key] = {
        form: "Not added yet",
        ingredient: (e.ingredients || []).join(" + "),
        purpose: e.therapeuticClass || NOT_ADDED,
        uses: NOT_ADDED,
        age: NOT_ADDED,
        precautions: NOT_ADDED,
        sideEffects: NOT_ADDED,
        interactions: NOT_ADDED,
        food: NOT_ADDED,
        status: "Listed in the Medicine Study Library. Availability and prescription rules differ, so ask a pharmacist.",
        warning: "Details for this medicine have not been added yet. Do not use it based on this page; ask a doctor or pharmacist.",
        actives: e.ingredients || [],
        libraryOnly: true,
      };
      hits = [key];
      added.push(key);
    }

    for (const k of hits) byKey[k] = info;
    for (const a of names) {
      const n = normalize(a);
      if (!n || Object.keys(medicines).some((k) => normalize(k) === n) || aliases[n]) continue;
      aliases[n] = hits[0];
    }
  }
  return { byKey, aliases, added };
}

module.exports = { mergeLibrary };
