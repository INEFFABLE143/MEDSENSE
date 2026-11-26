const root = document.querySelector("#medicine-library");

if (!root) {
  throw new Error('Add an element with id="medicine-library" to the page.');
}

const LEVEL_NAMES = { P: "Primary", S: "Secondary", T: "Tertiary" };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function startLibrary() {
  const response = await fetch("/data/medicine-library.json");
  if (!response.ok) {
    throw new Error(`Could not load medicine data (${response.status}).`);
  }

  const data = await response.json();
  const medicines = data.medicines ?? [];

  const notice = el("p", "medicine-library__notice", data.dataset?.disclaimer ?? "For educational use.");

  const search = document.createElement("input");
  search.type = "search";
  search.className = "medicine-library__search";
  search.placeholder = "Search medicines, ingredients, class or NLEM section";
  search.setAttribute("aria-label", "Search medicines");

  // Filters: NLEM section and healthcare level
  const sectionNames = [...new Set(medicines.flatMap((m) => (m.nlem?.listings ?? []).map((l) => l.sectionTitle)))].filter(Boolean);
  const sectionSelect = document.createElement("select");
  sectionSelect.className = "medicine-library__filter";
  sectionSelect.setAttribute("aria-label", "Filter by NLEM section");
  sectionSelect.append(new Option("All NLEM sections", ""));
  for (const name of sectionNames) sectionSelect.append(new Option(name, name));

  const levelSelect = document.createElement("select");
  levelSelect.className = "medicine-library__filter";
  levelSelect.setAttribute("aria-label", "Filter by healthcare level");
  levelSelect.append(new Option("All healthcare levels", ""));
  for (const [k, v] of Object.entries(LEVEL_NAMES)) levelSelect.append(new Option(`${v} care (${k})`, k));

  const filters = el("div", "medicine-library__filters");
  filters.append(search, sectionSelect, levelSelect);

  const status = document.createElement("p");
  status.setAttribute("role", "status");

  const list = el("div", "medicine-library__grid");

  root.replaceChildren(notice, filters, status, list);

  function render() {
    const term = search.value.trim().toLowerCase();
    const section = sectionSelect.value;
    const level = levelSelect.value;
    const filtered = medicines.filter((medicine) => {
      const listings = medicine.nlem?.listings ?? [];
      const searchable = [
        medicine.genericName,
        ...(medicine.aliases ?? []),
        ...(medicine.ingredients ?? []),
        medicine.therapeuticClass,
        ...listings.flatMap((l) => [l.sectionTitle, l.category]),
      ].join(" ").toLowerCase();

      if (!searchable.includes(term)) return false;
      if (section && !listings.some((l) => l.sectionTitle === section)) return false;
      if (level && !(medicine.nlem?.levels ?? []).includes(level)) return false;
      return true;
    });

    status.textContent = `${filtered.length} medicine${filtered.length === 1 ? "" : "s"}`;
    list.replaceChildren();

    for (const medicine of filtered) {
      const card = el("article", "medicine-library__card");

      const title = el("h2", "", medicine.genericName);
      const classification = el("p", "", medicine.therapeuticClass ?? "");
      const ingredients = el("p", "", `Ingredients: ${(medicine.ingredients ?? []).join(" + ")}`);

      const details = document.createElement("details");
      details.append(el("summary", "", "How it works"));
      details.append(el("p", "", medicine.mechanismOfAction ?? "No summary added yet."));

      card.append(title, classification, ingredients, details);

      const nlem = medicine.nlem;
      if (nlem) {
        const levels = el("p", "medicine-library__levels");
        for (const l of nlem.levels) {
          const badge = el("span", "medicine-library__badge", `${l} · ${LEVEL_NAMES[l] ?? l}`);
          levels.append(badge);
        }

        const forms = document.createElement("details");
        forms.append(el("summary", "", "NLEM dosage forms and strengths"));
        for (const listing of nlem.listings) {
          const block = el("div", "medicine-library__listing");
          block.append(el("p", "medicine-library__listing-head",
            `Section ${listing.nlemId} · ${listing.category || listing.sectionTitle} (${listing.level})`));
          const ul = document.createElement("ul");
          for (const f of listing.forms) ul.append(el("li", "", f));
          block.append(ul);
          if (listing.formsNeedReview) {
            block.append(el("p", "medicine-library__review",
              `Check this entry against gazette page ${listing.page}: the table is split across pages.`));
          }
          forms.append(block);
        }
        card.append(levels, forms);
      }

      card.append(
        el("p", "", `NLEM 2022 membership: ${medicine.nlem2022Membership ?? "unverified"}`),
        el("p", "", `RxNorm: ${medicine.rxnorm?.status ?? "not reviewed"}`),
      );
      list.append(card);
    }
  }

  search.addEventListener("input", render);
  sectionSelect.addEventListener("change", render);
  levelSelect.addEventListener("change", render);
  render();
}

startLibrary().catch((error) => {
  root.textContent = `Medicine library could not load: ${error.message}`;
});
