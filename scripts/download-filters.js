(function () {
  "use strict";

  const table = document.getElementById("downloads-table");
  if (!table) return;

  const rows = Array.from(table.tBodies[0]?.rows || []);
  const search = document.getElementById("download-search");
  const category = document.getElementById("download-category");
  const counter = document.getElementById("download-result-count");
  const empty = document.getElementById("download-empty");

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
    return categoryRules.find(([, pattern]) => pattern.test(theme))?.[0] || "Society and everyday life";
  }

  const categories = new Set();
  const normalizeSearchText = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  rows.forEach((row) => {
    const theme = row.cells[1]?.textContent.trim() || "Not specified";
    const group = classify(theme);
    row.dataset.search = normalizeSearchText(row.textContent);
    row.dataset.category = group;
    categories.add(group);
    const link = row.querySelector("a");
    if (link) {
      link.textContent = "Download";
      link.setAttribute("rel", "noopener");
    }
  });

  Array.from(categories).sort((a, b) => a.localeCompare(b, "en")).forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    category.appendChild(option);
  });

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
    counter.textContent = `${visible} box${visible > 1 ? "es" : ""} out of ${rows.length}`;
    empty.hidden = visible !== 0;
    table.hidden = visible === 0;
  }

  search.addEventListener("input", applyFilters);
  category.addEventListener("change", applyFilters);

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

  applyFilters();
}());
