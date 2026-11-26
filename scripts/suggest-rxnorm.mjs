import { readFile, writeFile } from "node:fs/promises";

const inputPath = new URL("../public/data/medicine-library.json", import.meta.url);
const outputPath = new URL("../public/data/rxnorm-candidates.json", import.meta.url);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const source = JSON.parse(await readFile(inputPath, "utf8"));
const results = [];

for (const medicine of source.medicines ?? []) {
  const term = medicine.genericName;
  const url = new URL("https://rxnav.nlm.nih.gov/REST/approximateTerm.json");
  url.searchParams.set("term", term);
  url.searchParams.set("maxEntries", "5");

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const candidates = (json.approximateGroup?.candidate ?? []).map((item) => ({
      rxcui: item.rxcui,
      name: item.name,
      score: item.score == null ? null : Number(item.score),
      rank: item.rank == null ? null : Number(item.rank),
      reviewRequired: true
    }));

    results.push({ id: medicine.id, searchTerm: term, candidates });
  } catch (error) {
    results.push({ id: medicine.id, searchTerm: term, error: error.message, candidates: [] });
  }

  await sleep(300);
}

await writeFile(
  outputPath,
  JSON.stringify({
    note: "RxNav approximate-term suggestions only. Manually verify ingredient, strength, and dosage form before assigning an RxCUI.",
    results
  }, null, 2) + "\n",
  "utf8"
);

console.log("Wrote public/data/rxnorm-candidates.json");