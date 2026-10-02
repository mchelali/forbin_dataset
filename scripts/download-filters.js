(function () {
  "use strict";

  const table = document.getElementById("downloads-table");
  if (!table) return;

  const rows = Array.from(table.tBodies[0]?.rows || []);
  const search = document.getElementById("download-search");
  const category = document.getElementById("download-category");
  const counter = document.getElementById("download-result-count");
  const empty = document.getElementById("download-empty");

  // Categories are keyed by their English name; labels come from i18n/translations.js.
  const categoryRules = [
    ["France", /france|french|versailles|quai d'orçay|monaco/i],
    ["Africa", /africa|afrique|alger|morocco|tunisia|libya|egypt|sahara|sudan|ethiopia|somalia|mauritania/i],
    ["Asia", /asia|asie|india|inde|china|japan|korea|indochina|cambodia|ceylon|thailand|burma|singapore|indonesia|malaysia/i],
    ["Middle East", /iraq|irak|iran|persia|arabia|levant|palestine|persian gulf|turkey/i],
    ["Americas", /united states|usa|america|canada|chile|hawaii|alaska/i],
    ["Oceania", /australia|new zealand|oceania|papua|agonees/i],
    ["World Wars", /world war|eastern front|military|artillery|camouflage|peace treat|uniform/i],
    ["Aviation", /aviation|aircraft|aviator|aerostation|airship|bleriot/i],
    ["Science and inventions", /science|invention|inventor|health|glass eyes|agricultural equipment/i],
    ["Women", /women|woman/i],
    ["Fashion, cinema and sport", /fashion|cinema|sport|swimming|beach|musician/i],
    ["Europe", /britain|germany|italy|austria|belgium|switzerland|ireland|russia|yugoslavia|romania|greece|albania|poland|norway|netherlands|spain|portugal|sweden|finland|denmark|hungary|bulgaria|czechoslovakia|malta/i]
  ];

  function classify(theme) {
    if (!theme) return "Not specified";
    return categoryRules.find(([, pattern]) => pattern.test(theme))?.[0] || "Society and everyday life";
  }

  const normalizeSearchText = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  // The table is generated in English; keep the original theme on each row.
  const categories = new Set();
  rows.forEach((row) => {
    const theme = row.cells[1]?.textContent.trim() || "";
    row.dataset.theme = theme;
    row.dataset.category = classify(theme);
    row.dataset.archive = row.cells[0]?.textContent.trim() || "";
    categories.add(row.dataset.category);
    row.querySelector("a")?.setAttribute("rel", "noopener");
  });

  // Translate row labels and rebuild the search index (both languages are searchable).
  function renderRows() {
    rows.forEach((row) => {
      const theme = row.dataset.theme;
      const localizedTheme = theme ? I18N.translateValue("theme", theme) : t("category:Not specified");
      if (row.cells[1]) row.cells[1].textContent = localizedTheme;
      const link = row.querySelector("a");
      if (link) link.textContent = t("download.link");
      const categoryLabel = I18N.translateValue("category", row.dataset.category);
      row.dataset.search = normalizeSearchText([
        row.dataset.archive, theme, localizedTheme, row.dataset.category, categoryLabel
      ].join(" "));
    });
  }

  function renderCategoryOptions() {
    const selected = category.value;
    category.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = t("download.allCategories");
    category.appendChild(all);
    Array.from(categories)
      .map(value => ({ value, label: I18N.translateValue("category", value) }))
      .sort((a, b) => a.label.localeCompare(b.label, I18N.locale))
      .forEach(({ value, label }) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        category.appendChild(option);
      });
    category.value = selected;
  }

  function applyFilters() {
    const terms = normalizeSearchText(search.value).split(" ").filter(Boolean);
    const selectedCategory = category.value;
    let visible = 0;
    rows.forEach((row) => {
      const matches = (!terms.length || terms.every(term => row.dataset.search.includes(term)))
        && (!selectedCategory || row.dataset.category === selectedCategory);
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    counter.textContent = t("download.count", { count: visible, total: rows.length });
    empty.hidden = visible !== 0;
    table.hidden = visible === 0;
  }

  function render() {
    renderRows();
    renderCategoryOptions();
    applyFilters();
  }

  search.addEventListener("input", applyFilters);
  category.addEventListener("change", applyFilters);
  window.addEventListener("forbin:languagechange", render);

  document.querySelectorAll("[data-download-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const compact = button.dataset.downloadView === "compact";
      table.classList.toggle("compact-view", compact);
      document.querySelectorAll("[data-download-view]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
    });
  });

  render();
}());
