// Rebuilds public/data/medicine-library.csv from medicine-library.json.
// Run after editing the JSON:  npm run export:csv
import { readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(new URL("../public/data/medicine-library.json", import.meta.url), "utf8"));
const columns = ["id", "genericName", "aliases", "therapeuticClass", "ingredients", "mechanismOfAction", "nlem2022Membership", "rxcui", "rxnormStatus"];
const cell = (v) => {
  const t = String(v ?? "");
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

const rows = (source.medicines ?? []).map((m) => [
  m.id,
  m.genericName,
  (m.aliases ?? []).join("; "),
  m.therapeuticClass ?? "",
  (m.ingredients ?? []).join("; "),
  m.mechanismOfAction ?? "",
  m.nlem2022Membership ?? "unverified",
  m.rxnorm?.rxcui ?? "",
  m.rxnorm?.status ?? "not_reviewed",
]);

const csv = [columns, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
await writeFile(new URL("../public/data/medicine-library.csv", import.meta.url), "\ufeff" + csv, "utf8");
console.log(`Wrote public/data/medicine-library.csv (${rows.length} rows)`);
