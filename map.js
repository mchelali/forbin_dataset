const DATA_URLS = {
    places: "data/geodata/forbin_places_aggregated.geojson",
    documentIndex: "data/geodata/forbin_place_document_index.json",
    mentions: "data/geodata/forbin_place_mentions.geojson",
    summary: "data/geodata/forbin_geo_summary.json"
};

const MAP_SOURCE_ID = "forbin-places";
const MAP_LAYER_ID = "forbin-places-circles";
const MAP_LABEL_LAYER_ID = "forbin-places-labels";
const MAX_DOCUMENTS_IN_PANEL = 60;
const MAX_MENTIONS_IN_PANEL = 50;

const state = {
    places: null,
    filteredPlaces: null,
    placeById: new Map(),
    documentIndex: {},
    summary: {},
    mentionsByPlace: null,
    mentionsPromise: null,
    selectedPlaceId: "",
    showPlaces: true,
    showDefaultOnly: true,
    minDocumentCount: 1,
    minGeocodingScore: 0.74,
    sourceType: "",
    countryCode: "",
    validationStatus: ""
};

let map = null;
let mapReady = false;
let timelineDebounceTimer = null;
let searchDebounceTimer = null;

const dom = {};

window.addEventListener("DOMContentLoaded", () => {
    dom.loading = document.getElementById("map-loading");
    dom.stats = document.getElementById("mapStats");
    dom.rightPanel = document.getElementById("rightPanel");
    dom.rightTitle = document.getElementById("rightTitle");
    dom.rightContent = document.getElementById("rightContent");
    dom.mainLayout = document.querySelector(".main-layout");

    setupControls();
    setupTimeline();
    setupRightPanel();
    initMap();
});

async function loadJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
}

async function loadInitialData() {
    setLoadingMessage("Loading aggregated Forbin places…");
    const [places, documentIndex, summary] = await Promise.all([
        loadJson(DATA_URLS.places),
        loadJson(DATA_URLS.documentIndex),
        loadJson(DATA_URLS.summary)
    ]);

    state.places = places;
    state.documentIndex = documentIndex || {};
    state.summary = summary || {};
    state.placeById.clear();

    for (const feature of getFeatures(places)) {
        const placeId = getPlaceId(feature);
        if (placeId) state.placeById.set(placeId, feature);
    }

    populateCountryFilter();
    applyFilters();
    updateMapStats();
}

function initMap() {
    map = new maplibregl.Map({
        container: "map",
        style: "https://www.openhistoricalmap.org/map-styles/main/main.json",
        center: [12, 35],
        zoom: 2.2,
        attributionControl: true
    });

    window.forbinMap = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-left");

    map.on("load", async () => {
        try {
            await loadInitialData();
            addForbinLayer();
            addMapInteractions();
            updateLayerVisibility();
            fitToPlaces(state.filteredPlaces);
            applyHistoricalDate(getSliderYear());
            mapReady = true;
            setLoadingVisible(false);
        } catch (error) {
            setLoadingMessage(`Unable to load Forbin geographic data: ${error.message}`);
        }
    });

    map.on("styledata", () => {
        if (mapReady) applyHistoricalDate(getSliderYear());
    });

    map.on("error", event => {
        if (event?.error) console.warn("MapLibre:", event.error.message);
    });
}

function addForbinLayer() {
    if (!state.filteredPlaces || map.getSource(MAP_SOURCE_ID)) return;

    map.addSource(MAP_SOURCE_ID, {
        type: "geojson",
        data: state.filteredPlaces
    });

    map.addLayer({
        id: MAP_LAYER_ID,
        type: "circle",
        source: MAP_SOURCE_ID,
        paint: {
            "circle-radius": [
                "interpolate", ["linear"],
                ["sqrt", ["max", 1, ["to-number", ["get", "document_count"], 1]]],
                1, 4,
                10, 8,
                25, 15,
                45, 26
            ],
            "circle-color": getSourceColorExpression(),
            "circle-opacity": 0.7,
            "circle-stroke-color": "#2f261f",
            "circle-stroke-width": 1.1
        }
    });

    map.addLayer({
        id: MAP_LABEL_LAYER_ID,
        type: "symbol",
        source: MAP_SOURCE_ID,
        minzoom: 4,
        layout: {
            "text-field": ["coalesce", ["get", "canonical_name"], ""],
            "text-size": 11,
            "text-offset": [0, 1.25],
            "text-anchor": "top",
            "text-allow-overlap": false
        },
        paint: {
            "text-color": "#352a21",
            "text-halo-color": "#fffaf4",
            "text-halo-width": 1.2
        }
    });
}

function getSourceColorExpression() {
    return [
        "case",
        ["all",
            [">", ["to-number", ["get", "metadata_count"], 0], 0],
            [">", ["to-number", ["get", "ocr_count"], 0], 0]
        ], "#76518f",
        [">", ["to-number", ["get", "ocr_count"], 0], 0], "#397aa2",
        "#9a6645"
    ];
}

function addMapInteractions() {
    map.on("mouseenter", MAP_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", MAP_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
    });
    map.on("click", MAP_LAYER_ID, event => {
        const mapFeature = event.features?.[0];
        if (!mapFeature) return;
        const placeId = String(mapFeature.properties?.place_id || mapFeature.properties?.geoname_id || mapFeature.id || "");
        const feature = state.placeById.get(placeId) || mapFeature;
        const coordinates = getFeatureCoordinates(feature);
        if (!coordinates) return;

        new maplibregl.Popup({ closeButton: true, maxWidth: "300px" })
            .setLngLat(coordinates)
            .setHTML(renderPlacePopup(feature.properties || {}))
            .addTo(map);

        openPlaceDetails(placeId);
    });
}

function renderPlacePopup(properties) {
    return `
        <div class="forbin-place-popup">
            <strong>${escapeHtml(properties.canonical_name || "Place")}</strong>
            <span>${escapeHtml([properties.admin_name_1, properties.country_name].filter(Boolean).join(", "))}</span>
            <span>${formatNumber(properties.document_count)} documents · ${formatNumber(properties.mention_count)} mentions</span>
            <small>${escapeHtml(formatSourceLabel(getPlaceSourceType(properties)))}</small>
        </div>
    `;
}

function setupControls() {
    const layerToggle = document.getElementById("toggleForbinPlaces");
    const defaultToggle = document.getElementById("showDefaultOnly");
    const minDocuments = document.getElementById("minDocumentCount");
    const minDocumentsValue = document.getElementById("minDocumentCountVal");
    const minScore = document.getElementById("minGeocodingScore");
    const minScoreValue = document.getElementById("minGeocodingScoreVal");
    const sourceFilter = document.getElementById("filterSourceType");
    const countryFilter = document.getElementById("filterCountry");
    const validationFilter = document.getElementById("filterValidation");
    const searchInput = document.getElementById("searchPlace");

    layerToggle?.addEventListener("change", () => {
        state.showPlaces = layerToggle.checked;
        updateLayerVisibility();
    });
    defaultToggle?.addEventListener("change", () => {
        state.showDefaultOnly = defaultToggle.checked;
        applyFilters();
    });
    minDocuments?.addEventListener("input", () => {
        state.minDocumentCount = Number(minDocuments.value) || 1;
        minDocumentsValue.textContent = formatNumber(state.minDocumentCount);
        applyFilters();
    });
    minScore?.addEventListener("input", () => {
        state.minGeocodingScore = Number(minScore.value) || 0;
        minScoreValue.textContent = state.minGeocodingScore.toFixed(2);
        if (state.selectedPlaceId) renderSelectedPlace();
    });
    sourceFilter?.addEventListener("change", () => {
        state.sourceType = sourceFilter.value;
        applyFilters();
        if (state.selectedPlaceId) renderSelectedPlace();
    });
    countryFilter?.addEventListener("change", () => {
        state.countryCode = countryFilter.value;
        applyFilters();
    });
    validationFilter?.addEventListener("change", () => {
        state.validationStatus = validationFilter.value;
        applyFilters();
    });
    searchInput?.addEventListener("input", () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => searchPlaces(searchInput.value), 180);
    });
}

function applyFilters() {
    if (!state.places) return;

    const features = getFeatures(state.places).filter(feature => {
        const properties = feature.properties || {};
        if (state.showDefaultOnly && properties.display_default === false) return false;
        if ((Number(properties.document_count) || 0) < state.minDocumentCount) return false;
        if (state.sourceType && getPlaceSourceType(properties) !== state.sourceType) return false;
        if (state.countryCode && properties.country_code !== state.countryCode) return false;
        if (state.validationStatus && properties.validation_status !== state.validationStatus) return false;
        return true;
    });

    state.filteredPlaces = { type: "FeatureCollection", features };
    map?.getSource(MAP_SOURCE_ID)?.setData(state.filteredPlaces);
    updateMapStats();
}

function updateLayerVisibility() {
    if (!map) return;
    const visibility = state.showPlaces ? "visible" : "none";
    if (map.getLayer(MAP_LAYER_ID)) map.setLayoutProperty(MAP_LAYER_ID, "visibility", visibility);
    if (map.getLayer(MAP_LABEL_LAYER_ID)) map.setLayoutProperty(MAP_LABEL_LAYER_ID, "visibility", visibility);
}

function populateCountryFilter() {
    const select = document.getElementById("filterCountry");
    if (!select) return;
    const countries = new Map();
    for (const feature of getFeatures(state.places)) {
        const properties = feature.properties || {};
        if (properties.country_code) countries.set(properties.country_code, properties.country_name || properties.country_code);
    }
    const options = [...countries.entries()].sort((left, right) => left[1].localeCompare(right[1], "en", { sensitivity: "base" }));
    select.innerHTML = '<option value="">All countries</option>';
    for (const [code, name] of options) {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = name;
        select.appendChild(option);
    }
}

function updateMapStats() {
    if (!dom.stats) return;
    const globalStats = state.summary?.statistics || {};
    const visibleCount = getFeatures(state.filteredPlaces).length;
    dom.stats.innerHTML = `
        <strong>Forbin geographic extraction</strong><br>
        Visible places: ${formatNumber(visibleCount)} / ${formatNumber(getFeatures(state.places).length)}<br>
        Resolved mentions: ${formatNumber(globalStats.entities_resolved)}<br>
        Ambiguous entities: ${formatNumber(globalStats.entities_ambiguous)}<br>
        Unresolved entities: ${formatNumber(globalStats.entities_unresolved)}
    `;
}

function openPlaceDetails(placeId) {
    const feature = state.placeById.get(String(placeId));
    if (!feature) return;
    state.selectedPlaceId = String(placeId);
    openRightPanel(feature.properties?.canonical_name || "Place details");
    renderSelectedPlace();
    loadMentionsForSelectedPlace(placeId);
}

function openRightPanel(title) {
    if (!dom.rightPanel || !dom.rightTitle) return;
    dom.rightTitle.textContent = title;
    dom.rightPanel.classList.remove("hidden");
    dom.rightPanel.classList.add("active");
    dom.rightPanel.setAttribute("aria-hidden", "false");
    dom.mainLayout?.classList.add("details-open");
    window.setTimeout(() => map?.resize(), 220);
}

function setupRightPanel() {
    document.getElementById("closeRightPanel")?.addEventListener("click", closeRightPanel);
}

function closeRightPanel() {
    state.selectedPlaceId = "";
    dom.rightPanel?.classList.remove("active");
    dom.rightPanel?.setAttribute("aria-hidden", "true");
    dom.mainLayout?.classList.remove("details-open");
    window.setTimeout(() => {
        dom.rightPanel?.classList.add("hidden");
        map?.resize();
    }, 200);
}

function renderSelectedPlace() {
    if (!dom.rightContent || !state.selectedPlaceId) return;
    const feature = state.placeById.get(state.selectedPlaceId);
    if (!feature) return;
    const properties = feature.properties || {};
    const documents = getDocumentsForPlace(state.selectedPlaceId, properties);
    const mentions = state.mentionsByPlace?.get(state.selectedPlaceId) || null;
    dom.rightTitle.textContent = properties.canonical_name || "Place details";
    dom.rightContent.innerHTML = renderPlaceDetails(properties, feature, documents, mentions);
}

function renderPlaceDetails(properties, feature, documents, mentions) {
    const sourceType = getPlaceSourceType(properties);
    const validationStatus = properties.validation_status || "automatic";
    const coordinates = getFeatureCoordinates(feature);
    const labels = parsePairs(properties.top_raw_labels);
    const cartons = parsePairs(properties.top_cartons);
    const geonamesUrl = properties.geoname_id ? `https://www.geonames.org/${encodeURIComponent(properties.geoname_id)}` : "";

    return `
        <div class="place-detail-view">
            <div class="place-status-row">
                <span class="source-badge ${escapeHtml(sourceType)}">${escapeHtml(formatSourceLabel(sourceType))}</span>
                <span class="validation-badge ${escapeHtml(validationStatus)}">${escapeHtml(formatValidationStatus(validationStatus))}</span>
            </div>

            ${validationStatus === "automatic" ? `
                <div class="automatic-warning">
                    <strong>Automatic result — verification required</strong>
                    <p>This geocoding may be ambiguous and has not been contributed to OpenHistoricalMap.</p>
                </div>
            ` : ""}

            <section class="place-metrics" aria-label="Place statistics">
                ${metricCard(properties.document_count, "Documents")}
                ${metricCard(properties.mention_count, "Mentions")}
                ${metricCard(properties.metadata_count, "Metadata")}
                ${metricCard(properties.ocr_count, "OCR/NER")}
            </section>

            <section class="map-detail-section">
                <h3>Resolved place</h3>
                <dl class="map-detail-grid">
                    ${detailRow("Canonical name", properties.canonical_name)}
                    ${detailRow("Country", [properties.country_name, properties.country_code].filter(Boolean).join(" · "))}
                    ${detailRow("Administrative area", properties.admin_name_1)}
                    ${detailRow("GeoNames ID", properties.geoname_id)}
                    ${detailRow("Feature", [properties.feature_class, properties.feature_code].filter(Boolean).join(" / "))}
                    ${detailRow("Geometry precision", formatMachineLabel(properties.geometry_precision))}
                    ${detailRow("Coordinates", coordinates ? `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}` : "")}
                </dl>
                ${geonamesUrl ? `<a class="btn-geo-link" href="${geonamesUrl}" target="_blank" rel="noopener">Open in GeoNames</a>` : ""}
            </section>

            ${renderPairList("Source labels", labels)}
            ${renderPairList("Main archive boxes", cartons)}
            ${renderDocumentList(documents)}
            ${renderMentionSection(mentions)}
        </div>
    `;
}

function renderDocumentList(documents) {
    const visibleDocuments = documents.slice(0, MAX_DOCUMENTS_IN_PANEL);
    return `
        <section class="map-detail-section">
            <h3>Related documents <span>${formatNumber(documents.length)}</span></h3>
            ${visibleDocuments.length ? `
                <div class="linked-document-list">
                    ${visibleDocuments.map(documentId => `
                        <a href="${getExplorerUrl(documentId)}" target="_blank" rel="noopener">
                            <span>${escapeHtml(documentId)}</span><small>Open image and metadata</small>
                        </a>
                    `).join("")}
                </div>
                ${documents.length > visibleDocuments.length ? `<p class="detail-note">Showing the first ${visibleDocuments.length} documents.</p>` : ""}
            ` : '<p class="detail-note">No linked document is available in the index.</p>'}
        </section>
    `;
}

function renderMentionSection(mentions) {
    if (!mentions) {
        return `
            <section class="map-detail-section" id="place-mentions-section">
                <h3>Detailed mentions</h3>
                <p class="detail-note loading-note">Loading the detailed mention layer on demand…</p>
            </section>
        `;
    }

    const filtered = mentions.filter(mention => {
        const properties = mention.properties || {};
        if ((Number(properties.geocoding_score) || 0) < state.minGeocodingScore) return false;
        if (state.sourceType === "metadata" && properties.source_type !== "metadata") return false;
        if (state.sourceType === "ocr" && properties.source_type !== "monkeyocr_ner") return false;
        return true;
    });
    const visible = filtered.slice(0, MAX_MENTIONS_IN_PANEL);

    return `
        <section class="map-detail-section" id="place-mentions-section">
            <h3>Detailed mentions <span>${formatNumber(filtered.length)}</span></h3>
            <p class="detail-note">Minimum geocoding score: ${state.minGeocodingScore.toFixed(2)}</p>
            ${visible.length ? `<div class="mention-list">${visible.map(renderMention).join("")}</div>` : '<p class="detail-note">No mention matches the active source and score filters.</p>'}
            ${filtered.length > visible.length ? `<p class="detail-note">Showing the first ${visible.length} mentions.</p>` : ""}
        </section>
    `;
}

function renderMention(feature) {
    const properties = feature.properties || {};
    const faces = asArray(properties.source_faces).join(", ");
    const files = Object.values(properties.file_names || {}).map(getBaseName).join(" · ");
    return `
        <article class="mention-card">
            <div class="mention-card-heading">
                <strong>${escapeHtml(properties.raw_label || "Unlabelled mention")}</strong>
                <span>${escapeHtml(properties.source_type === "metadata" ? "Metadata" : "OCR/NER")}</span>
            </div>
            <p>${escapeHtml(properties.canonical_name || "Unresolved")} · ${escapeHtml(properties.country_name || "")}</p>
            <dl>
                ${detailRow("Document", properties.document_id)}
                ${detailRow("Spatial role", formatMachineLabel(properties.spatial_role))}
                ${detailRow("NER score", formatScore(properties.ner_score))}
                ${detailRow("Geocoding score", formatScore(properties.geocoding_score))}
                ${detailRow("Source face", faces)}
                ${detailRow("Files", files)}
            </dl>
            <a href="${getExplorerUrl(properties.document_id)}" target="_blank" rel="noopener">Open document</a>
        </article>
    `;
}

async function loadMentionsForSelectedPlace(placeId) {
    try {
        await ensureMentionsLoaded();
        if (state.selectedPlaceId === String(placeId)) renderSelectedPlace();
    } catch (error) {
        if (state.selectedPlaceId !== String(placeId) || !dom.rightContent) return;
        const section = dom.rightContent.querySelector("#place-mentions-section");
        if (section) section.innerHTML = `<h3>Detailed mentions</h3><p class="detail-note">Unable to load mentions: ${escapeHtml(error.message)}</p>`;
    }
}

async function ensureMentionsLoaded() {
    if (state.mentionsByPlace) return state.mentionsByPlace;
    if (state.mentionsPromise) return state.mentionsPromise;

    state.mentionsPromise = loadJson(DATA_URLS.mentions).then(collection => {
        const index = new Map();
        for (const feature of getFeatures(collection)) {
            const placeId = String(feature.properties?.geoname_id || "");
            if (!placeId) continue;
            if (!index.has(placeId)) index.set(placeId, []);
            index.get(placeId).push(feature);
        }
        state.mentionsByPlace = index;
        return index;
    }).finally(() => {
        state.mentionsPromise = null;
    });

    return state.mentionsPromise;
}

function searchPlaces(rawQuery) {
    const query = normalizeSearchText(rawQuery);
    if (!query) return;

    const results = [];
    for (const feature of getFeatures(state.places)) {
        const properties = feature.properties || {};
        const placeId = getPlaceId(feature);
        const documents = state.documentIndex[placeId] || [];
        const haystack = normalizeSearchText([
            properties.canonical_name,
            properties.country_name,
            properties.country_code,
            properties.admin_name_1,
            properties.geoname_id,
            ...parsePairs(properties.top_raw_labels).map(item => item[0])
        ].join(" "));
        const documentMatch = query.length >= 5 && documents.some(id => normalizeSearchText(id).includes(query));
        if (haystack.includes(query) || documentMatch) results.push(feature);
        if (results.length >= 30) break;
    }

    openSearchResults(rawQuery, results);
}

function openSearchResults(query, results) {
    openRightPanel("Search results");
    state.selectedPlaceId = "";
    dom.rightContent.innerHTML = `
        <div class="place-detail-view">
            <section class="map-detail-section">
                <h3>${formatNumber(results.length)} results for “${escapeHtml(query)}”</h3>
                ${results.length ? `
                    <div class="map-search-results">
                        ${results.map(feature => {
                            const properties = feature.properties || {};
                            return `<button type="button" data-place-id="${escapeHtml(getPlaceId(feature))}"><strong>${escapeHtml(properties.canonical_name || "Place")}</strong><span>${escapeHtml([properties.admin_name_1, properties.country_name].filter(Boolean).join(", "))}</span><small>${formatNumber(properties.document_count)} documents</small></button>`;
                        }).join("")}
                    </div>
                ` : '<p class="detail-note">No place or linked document matches this search.</p>'}
            </section>
        </div>
    `;

    dom.rightContent.querySelectorAll("[data-place-id]").forEach(button => {
        button.addEventListener("click", () => {
            const feature = state.placeById.get(button.dataset.placeId);
            const coordinates = getFeatureCoordinates(feature);
            if (coordinates) map.flyTo({ center: coordinates, zoom: Math.max(map.getZoom(), 6), duration: 650 });
            openPlaceDetails(button.dataset.placeId);
        });
    });
}

function setupTimeline() {
    const slider = document.getElementById("dateSlider");
    const label = document.getElementById("dateLabel");
    const eraButton = document.getElementById("btnEraForbin");
    if (!slider || !label) return;

    const update = () => {
        const year = getSliderYear();
        label.textContent = getYearLabel(year);
        clearTimeout(timelineDebounceTimer);
        timelineDebounceTimer = setTimeout(() => applyHistoricalDate(year), 80);
    };
    slider.addEventListener("input", update);
    slider.addEventListener("change", update);
    eraButton?.addEventListener("click", () => {
        slider.value = "1907";
        update();
    });
    update();
}

function applyHistoricalDate(year) {
    try {
        if (map && typeof map.filterByDate === "function") {
            const iso = year < 0
                ? `-${String(Math.abs(year)).padStart(4, "0")}-01-01`
                : `${String(year).padStart(4, "0")}-01-01`;
            map.filterByDate(iso);
        }
    } catch (error) {
        console.warn("OpenHistoricalMap date filtering is unavailable:", error.message);
    }
}

function fitToPlaces(collection) {
    const bounds = new maplibregl.LngLatBounds();
    let hasCoordinates = false;
    for (const feature of getFeatures(collection)) {
        const coordinates = getFeatureCoordinates(feature);
        if (!coordinates) continue;
        bounds.extend(coordinates);
        hasCoordinates = true;
    }
    if (hasCoordinates) {
        map.fitBounds(bounds, { padding: { top: 70, right: 70, bottom: 70, left: 360 }, maxZoom: 5.5, duration: 700 });
    }
}

function getDocumentsForPlace(placeId, properties = {}) {
    const indexed = state.documentIndex[String(placeId)];
    if (Array.isArray(indexed)) return [...new Set(indexed.map(String))];
    return [...new Set(asArray(properties.sample_document_ids).map(String))];
}

function getPlaceSourceType(properties) {
    const metadataCount = Number(properties.metadata_count) || 0;
    const ocrCount = Number(properties.ocr_count) || 0;
    if (metadataCount > 0 && ocrCount > 0) return "mixed";
    if (ocrCount > 0) return "ocr";
    return "metadata";
}

function formatSourceLabel(type) {
    if (type === "mixed") return "Metadata + OCR/NER";
    if (type === "ocr") return "OCR/NER only";
    return "Metadata only";
}

function formatValidationStatus(status) {
    return formatMachineLabel(status || "automatic");
}

function getPlaceId(feature) {
    return String(feature?.properties?.place_id || feature?.properties?.geoname_id || feature?.id || "");
}

function getFeatureCoordinates(feature) {
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);
    return Number.isFinite(longitude) && Number.isFinite(latitude) ? [longitude, latitude] : null;
}

function getFeatures(collection) {
    return Array.isArray(collection?.features) ? collection.features : [];
}

function parsePairs(value) {
    const parsed = parseStructuredValue(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => Array.isArray(item) ? item : [item, ""]);
}

function parseStructuredValue(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return value;
    try {
        return JSON.parse(trimmed);
    } catch (error) {
        return value;
    }
}

function asArray(value) {
    const parsed = parseStructuredValue(value);
    if (Array.isArray(parsed)) return parsed;
    return parsed === null || parsed === undefined || parsed === "" ? [] : [parsed];
}

function renderPairList(title, pairs) {
    if (!pairs.length) return "";
    return `
        <section class="map-detail-section">
            <h3>${escapeHtml(title)}</h3>
            <div class="frequency-list">
                ${pairs.slice(0, 12).map(([label, count]) => `<div><span>${escapeHtml(label)}</span><strong>${formatNumber(count)}</strong></div>`).join("")}
            </div>
        </section>
    `;
}

function metricCard(value, label) {
    return `<div><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function detailRow(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`;
}

function getExplorerUrl(documentId) {
    return `explorer.html?mode=stream&document_id=${encodeURIComponent(documentId || "")}`;
}

function getBaseName(path) {
    return String(path || "").split("/").pop();
}

function formatMachineLabel(value) {
    const text = String(value || "").replace(/_/g, " ").trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function formatScore(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(4) : "";
}

function normalizeSearchText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat("en-US").format(number) : "0";
}

function getSliderYear() {
    const slider = document.getElementById("dateSlider");
    return slider ? Number(slider.value) : 1900;
}

function getYearLabel(year) {
    return year < 0 ? `${Math.abs(year)} BCE` : String(year);
}

function setLoadingMessage(message) {
    if (!dom.loading) return;
    dom.loading.innerHTML = `<span>${escapeHtml(message)}</span>`;
    setLoadingVisible(true);
}

function setLoadingVisible(visible) {
    dom.loading?.classList.toggle("hidden", !visible);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
