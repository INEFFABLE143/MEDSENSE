const root = document.querySelector("#medicine-library");

if (!root) {
  throw new Error('Add an element with id="medicine-library" to the page.');
}

async function startLibrary() {
  const response = await fetch("/data/medicine-library.json");
  if (!response.ok) {
    throw new Error(`Could not load medicine data (${response.status}).`);
  }

  const data = await response.json();
  const medicines = data.medicines ?? [];

  const notice = document.createElement("p");
  notice.className = "medicine-library__notice";
  notice.textContent = data.dataset?.disclaimer ?? "For educational use.";

  const search = document.createElement("input");
  search.type = "search";
  search.className = "medicine-library__search";
  search.placeholder = "Search medicines, ingredients, or class";
  search.setAttribute("aria-label", "Search medicines");

  const status = document.createElement("p");
  status.setAttribute("role", "status");

  const list = document.createElement("div");
  list.className = "medicine-library__grid";

  root.replaceChildren(notice, search, status, list);

  function render() {
    const term = search.value.trim().toLowerCase();
    const filtered = medicines.filter((medicine) => {
      const searchable = [
        medicine.genericName,
        ...(medicine.aliases ?? []),
        ...(medicine.ingredients ?? []),
        medicine.therapeuticClass,
      ].join(" ").toLowerCase();

      return searchable.includes(term);
    });

    status.textContent = `${filtered.length} medicine${filtered.length === 1 ? "" : "s"}`;
    list.replaceChildren();

    for (const medicine of filtered) {
      const card = document.createElement("article");
      card.className = "medicine-library__card";

      const title = document.createElement("h2");
      title.textContent = medicine.genericName;

      const classification = document.createElement("p");
      classification.textContent = medicine.therapeuticClass ?? "";

      const ingredients = document.createElement("p");
      ingredients.textContent =
        `Ingredients: ${(medicine.ingredients ?? []).join(" + ")}`;

      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "How it works";
      const mechanism = document.createElement("p");
      mechanism.textContent = medicine.mechanismOfAction ?? "No summary added.";
      details.append(summary, mechanism);

      const nlem = document.createElement("p");
      nlem.textContent =
        `NLEM 2022 membership: ${medicine.nlem2022Membership ?? "unverified"}`;

      const rxnorm = document.createElement("p");
      rxnorm.textContent =
        `RxNorm: ${medicine.rxnorm?.status ?? "not reviewed"}`;

      card.append(title, classification, ingredients, details, nlem, rxnorm);
      list.append(card);
    }
  }

  search.addEventListener("input", render);
  render();
}

startLibrary().catch((error) => {
  root.textContent = `Medicine library could not load: ${error.message}`;
});