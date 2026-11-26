// Checks that the JSON data files agree with each other. Run: npm run check:data
import { readFile } from "node:fs/promises";

const load = async (name) =>
  JSON.parse(await readFile(new URL(`../public/data/${name}`, import.meta.url), "utf8"));

const diseases = await load("diseases.json");
const medicines = await load("medicines.json");
const ingredients = await load("ingredients.json");
const library = await load("medicine-library.json");

const norm = (s) => String(s).toLowerCase().trim();
const medKeys = new Set(Object.keys(medicines).map(norm));
const errors = [];
const warnings = [];

for (const [d, v] of Object.entries(diseases)) {
  for (const m of v.medicines || []) if (!medKeys.has(norm(m))) errors.push(`Disease "${d}" lists unknown medicine "${m}"`);
  if (!(v.warningSigns || []).length) warnings.push(`Disease "${d}" has no warningSigns`);
}
for (const [i, v] of Object.entries(ingredients)) {
  for (const m of v.medicines || []) if (!medKeys.has(norm(m))) errors.push(`Ingredient "${i}" lists unknown medicine "${m}"`);
}
const used = new Set(Object.values(diseases).flatMap((d) => (d.medicines || []).map(norm)));
for (const [m, v] of Object.entries(medicines)) {
  if (!(v.actives || []).length) errors.push(`Medicine "${m}" has no "actives" (needed for alternatives)`);
  if (!used.has(norm(m))) warnings.push(`Medicine "${m}" is not listed under any disease`);
}

const NLEM = new Set(["unverified", "listed", "not_listed"]);
const ids = new Set();
const names = new Set();
for (const e of library.medicines || []) {
  if (!e.id || !e.genericName) errors.push(`Library entry missing id or genericName: ${JSON.stringify(e).slice(0, 60)}`);
  if (ids.has(e.id)) errors.push(`Library id repeated: ${e.id}`);
  ids.add(e.id);
  if (names.has(norm(e.genericName))) errors.push(`Library name repeated: ${e.genericName}`);
  names.add(norm(e.genericName));
  if (!(e.ingredients || []).length) errors.push(`Library entry "${e.genericName}" has no ingredients`);
  if (!NLEM.has(e.nlem2022Membership)) errors.push(`Library entry "${e.genericName}" has invalid nlem2022Membership "${e.nlem2022Membership}" (use ${[...NLEM].join(" / ")})`);
  const rx = e.rxnorm || {};
  if (rx.rxcui != null && !/^\d+$/.test(String(rx.rxcui))) errors.push(`Library entry "${e.genericName}" has a non-numeric rxcui "${rx.rxcui}"`);
}

console.log(`Checked ${Object.keys(diseases).length} diseases, ${Object.keys(medicines).length} medicines, ${Object.keys(ingredients).length} ingredients, ${(library.medicines || []).length} library entries.`);
for (const w of warnings) console.log("WARN  " + w);
for (const e of errors) console.log("ERROR " + e);
console.log(errors.length ? `\n${errors.length} error(s) found.` : "\nNo errors.");
process.exit(errors.length ? 1 : 0);
