const DATA_URLS = {
    metadataCircles: "data/geodata/forbin_metadata_circles.geojson",
    ocrOverlay: "data/geodata/forbin_ocr_place_overlay.geojson",
    metadataSummary: "data/geodata/forbin_ocr_place_overlay_summary.json"
};

const LOCAL_IMAGE_BASE_URL = "samples/images/";
const SHAREDOCS_BASE_URL = "https://sharedocs.huma-num.fr/wl/";
const SHAREDOCS_PUBLIC_ID = "XOJp1buzC6FcbIL2K2qeIbj52WtPEaq4";
const MAX_CLUSTER_THUMBNAILS = 20;
const MAX_CLUSTER_DOCUMENT_LINKS = 30;
const MAX_PANEL_LIST_ITEMS = 18;

const state = {
    metadataCircles: null,
    ocrOverlay: null,
    summaries: {},
    selectedFeature: null,
    showMetadataCircles: true,
    showOcrOverlay: false,
    showConflicts: true,
    streamManifestCache: {},
    loadErrors: [],
    minGeoNamesScore: 0.0,
    minImageCount: 1,
    selectedMetadataKind: ""
};

let map = null;
let mapReady = false;
let searchDebounceTimer = null;
let timelineDebounceTimer = null;
let leftPanel = null;
let leftTitle = null;
let leftContent = null;
let mapLoading = null;

window.addEventListener("DOMContentLoaded", () => {
    leftPanel = document.getElementById("leftPanel");
    leftTitle = document.getElementById("leftTitle");
    leftContent = document.getElementById("leftContent");
    mapLoading = document.getElementById("map-loading");

    initMap();
    setupLayerControls();
    setupSearch();
    setupTimeline();
    setupLeftPanelClose();
    setupAdvancedFilters();
    setupConflictsExplorer();
});

async function loadJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function loadAvailableJson(key) {
    try {
        return await loadJson(DATA_URLS[key]);
    } catch (error) {
        state.loadErrors.push(`${DATA_URLS[key]} (${error.message})`);
        return null;
    }
}

async function loadForbinData() {
    setLoadingMessage("Loading Forbin data…");

    const [
        metadataCircles,
        ocrOverlay,
        metadataSummary
    ] = await Promise.all([
        loadAvailableJson("metadataCircles"),
        loadAvailableJson("ocrOverlay"),
        loadAvailableJson("metadataSummary")
    ]);

    state.metadataCircles = metadataCircles;
    state.ocrOverlay = ocrOverlay;
    state.summaries = {
        metadata: metadataSummary
    };

    updateMapStats();
    if (state.loadErrors.length) {
        setLoadingMessage(`Partial data: ${state.loadErrors.join(", ")}`);
    }
}

function initMap() {
    const API_STYLE = "https://www.openhistoricalmap.org/map-styles/main/main.json";

    map = new maplibregl.Map({
        container: "map",
        style: API_STYLE,
        center: [12, 35],
        zoom: 2.2,
        attributionControl: true
    });

    window.forbinMap = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-left");

    map.on("load", async () => {
        mapReady = true;
        await loadForbinData();
        populateMetadataKinds();
        addForbinSources();
        addMetadataCircleLayers();
        addOcrOverlayLayers();
        addMapInteractions();
        applyFilters();
        updateLayerVisibility();
        fitToAvailableData();
        applyForbinDateFilter(getSliderYear());
        setLoadingVisible(false);
    });

    map.on("styledata", () => {
        if (!mapReady) return;
        applyForbinDateFilter(getSliderYear());
    });
}

function addForbinSources() {
    if (state.metadataCircles && !map.getSource("metadata-circles")) {
        map.addSource("metadata-circles", {
            type: "geojson",
            data: state.metadataCircles
        });
    }

    if (state.ocrOverlay && !map.getSource("ocr-overlay")) {
        map.addSource("ocr-overlay", {
            type: "geojson",
            data: state.ocrOverlay
        });
    }

}

function addMetadataCircleLayers() {
    if (!map.getSource("metadata-circles") || map.getLayer("metadata-circles-fill")) return;

    map.addLayer({
        id: "metadata-circles-fill",
        type: "circle",
        source: "metadata-circles",
        paint: {
            "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                2, ["max", 4, ["*", ["sqrt", ["to-number", ["get", "image_count"], 0]], 1.2]],
                6, ["max", 8, ["*", ["sqrt", ["to-number", ["get", "image_count"], 0]], 2.0]],
                10, ["max", 14, ["*", ["sqrt", ["to-number", ["get", "image_count"], 0]], 3.0]]
            ],
            "circle-color": getMetadataCircleColorExpression(),
            "circle-opacity": 0.62,
            "circle-stroke-color": "#3d2010",
            "circle-stroke-width": 1.2
        }
    });

    map.addLayer({
        id: "metadata-circles-label",
        type: "symbol",
        source: "metadata-circles",
        minzoom: 3,
        layout: {
            "text-field": ["coalesce", ["get", "label"], ["get", "resolved_label"], ""],
            "text-size": 12,
            "text-offset": [0, 1.4],
            "text-anchor": "top"
        },
        paint: {
            "text-color": "#3d2010",
            "text-halo-color": "#fff9f2",
            "text-halo-width": 1.2
        }
    });
}

function addOcrOverlayLayers() {
    if (!map.getSource("ocr-overlay") || map.getLayer("ocr-overlay-points")) return;

    map.addLayer({
        id: "ocr-overlay-points",
        type: "circle",
        source: "ocr-overlay",
        paint: {
            "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                2, 3,
                7, 6,
                10, 9
            ],
            "circle-color": "#4b789b",
            "circle-opacity": 0.55,
            "circle-stroke-color": "#17364a",
            "circle-stroke-width": 1
        }
    });
}

function addMapInteractions() {
    addLayerClick("metadata-circles-fill", "metadata");
    addLayerClick("ocr-overlay-points", "ocr");

    ["metadata-circles-fill", "ocr-overlay-points"].forEach((layerId) => {
        if (!map.getLayer(layerId)) return;
        map.on("mouseenter", layerId, () => {
            map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
            map.getCanvas().style.cursor = "";
        });
    });
}

function addLayerClick(layerId, layerType) {
    if (!map.getLayer(layerId)) return;

    map.on("click", layerId, (event) => {
        const feature = event.features && event.features[0];
        if (!feature) return;

        state.selectedFeature = feature;
        state.selectedLayerType = layerType;
        clusterGalleryPage = 1;
        const coordinates = getFeatureCoordinates(feature);
        if (!coordinates) return;

        new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
            .setLngLat(coordinates)
            .setHTML(renderPopupHTML(feature.properties || {}, layerType))
            .addTo(map);

        if (layerType === "metadata") {
            clusterGalleryPage = 1;
            openLeftPanel(
                getFeatureTitle(feature),
                renderMetadataClusterDetails(feature.properties || {}),
                { resetGalleryPage: false }
            );
        } else {
            openLeftPanel(getFeatureTitle(feature), renderOcrPlaceDetails(feature.properties || {}));
        }
    });
}

function updateLayerVisibility() {
    setLayerVisibility("metadata-circles-fill", state.showMetadataCircles);
    setLayerVisibility("metadata-circles-label", state.showMetadataCircles);
    setLayerVisibility("ocr-overlay-points", state.showOcrOverlay);

    if (map && map.getLayer("metadata-circles-fill")) {
        map.setPaintProperty("metadata-circles-fill", "circle-color", getMetadataCircleColorExpression());
    }
}

function updateMapStats() {
    const stats = document.getElementById("mapStats");
    if (!stats) return;

    const metadataSummary = state.summaries.metadata || {};
    const metadataFeatures = getFeatures(state.metadataCircles);
    const ocrFeatures = getFeatures(state.ocrOverlay);

    const metadataCount = pickNumber(
        metadataSummary.num_metadata_clusters,
        metadataSummary.metadata_circles,
        metadataFeatures.length
    );
    const ocrCount = ocrFeatures.length;
    const conflictCount = pickNumber(
        metadataSummary.num_clusters_with_possible_conflict,
        metadataFeatures.filter((feature) => Boolean((feature.properties || {}).has_possible_metadata_ocr_conflict)).length
    );

    stats.innerHTML = `
        <strong>Mapped corpus</strong><br>
        Metadata clusters: ${formatNumber(metadataCount)}<br>
        OCR places: ${formatNumber(ocrCount)}<br>
        Possible conflicts: ${formatNumber(conflictCount)}
    `;
}

function fitToAvailableData() {
    const visibleCollections = [];
    if (state.showMetadataCircles && state.metadataCircles) visibleCollections.push(state.metadataCircles);
    if (state.showOcrOverlay && state.ocrOverlay) visibleCollections.push(state.ocrOverlay);
    if (!visibleCollections.length && state.metadataCircles) visibleCollections.push(state.metadataCircles);

    const bounds = getFeatureBounds(visibleCollections);
    if (!bounds) return;

    map.fitBounds(bounds, {
        padding: { top: 80, right: 80, bottom: 80, left: 420 },
        maxZoom: 5.5,
        duration: 700
    });
}

function renderPopupHTML(properties, layerType) {
    const cssClass = `${layerType}-popup`;
    const sourceLabel = layerType === "metadata"
        ? "archival metadata"
        : layerType === "ocr"
            ? "OCR spaCy"
            : properties.map_point_source || "image point";

    return `
        <div class="${cssClass}">
            <strong>${escapeHtml(properties.label || properties.resolved_label || "Place")}</strong>
            ${detailLine("Images", properties.image_count)}
            ${detailLine("Documents", properties.document_count)}
            ${detailLine("Score GeoNames", properties.geonames_score)}
            <br>Source: ${escapeHtml(sourceLabel)}
        </div>
    `;
}

function openLeftPanel(title, html, options = {}) {
    if (!leftPanel || !leftTitle || !leftContent) return;

    if (options.resetGalleryPage !== false) {
        clusterGalleryPage = 1;
    }

    setMapDetailMode(false);
    leftTitle.textContent = title || "Details";
    leftContent.innerHTML = html;
    leftPanel.classList.remove("hidden");
    leftPanel.classList.add("active");
    leftPanel.scrollTo({ top: 0, behavior: "smooth" });

    setupPanelImageFallbacks();
    setupPanelDocumentButtons();
    setupClusterGalleryPagination();
}

function renderMetadataClusterDetails(properties) {
    const conflict = Boolean(properties.has_possible_metadata_ocr_conflict);
    return `
        <div class="metadata-popup detail-panel-content">
            ${renderPanelIntro(properties, "metadata")}
            ${renderClusterImageGallery(properties)}
            <section class="detail-section detail-card">
                <h4>Archival metadata</h4>
                ${conflict ? `<span class="conflict-badge">Possible metadata / OCR conflict</span>` : ""}
                ${renderDetailGrid(properties, [
        ["Label", "label"],
        ["Resolved label", "resolved_label"],
        ["Metadata type", "metadata_kind"],
        ["Country", "country_name"],
        ["Admin 1", "admin1_name"],
        ["Feature code", "feature_code"],
        ["GeoNames ID", "geonames_id"],
        ["Score GeoNames", "geonames_score"],
        ["Conflict reason", "conflict_reason"]
    ])}
                ${coordsRow(state.selectedFeature)}
                ${renderChips("Types", properties.metadata_types, "metadata")}
                ${renderChips("Sources", properties.metadata_sources, "metadata")}
                ${renderGeoValidationBlock(properties)}
            </section>
        </div>
    `;
}

function renderOcrPlaceDetails(properties) {
    return `
        <div class="ocr-popup detail-panel-content">
            ${renderPanelIntro(properties, "ocr")}

            ${renderOcrImageGallery(properties)}

            <section class="detail-section detail-card">
                <h4>OCR-extracted place</h4>
                ${renderDetailGrid(properties, [
        ["Label", "label"],
        ["Resolved label", "resolved_label"],
        ["Images", "image_count"],
        ["Documents", "document_count"],
        ["Country", "country_name"],
        ["Admin 1", "admin1_name"],
        ["Feature code", "feature_code"],
        ["GeoNames ID", "geonames_id"],
        ["Score GeoNames", "geonames_score"]
    ])}
                ${coordsRow(state.selectedFeature)}
                ${renderChips("spaCy models", properties.spacy_models, "ocr")}
                ${renderChips("Labels spaCy", properties.spacy_labels, "ocr")}
                ${renderChips("Sources OCR", properties.sources, "ocr")}
                ${renderGeoValidationBlock(properties)}
            </section>

            ${renderOcrDocumentLinks(properties)}
        </div>
    `;
}

function renderOcrImageGallery(properties) {
    const allItems = buildClusterGalleryItems(properties);
    const total = allItems.length;

    if (!total) {
        return `
            <section class="detail-section detail-card">
                <h4>Related images</h4>
                <p class="detail-note">
                    No document or image file is available for this OCR feature.
                    Check that <code>forbin_ocr_place_overlay.geojson</code> contains
                    <code>document_ids</code>, <code>image_ids</code> or <code>sample_file_names</code>.
                </p>
            </section>
        `;
    }

    const pageSize = MAX_CLUSTER_THUMBNAILS;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(Math.max(clusterGalleryPage, 1), totalPages);
    clusterGalleryPage = currentPage;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const galleryItems = allItems.slice(startIndex, endIndex);

    const cards = galleryItems.map(({ fileEntry, documentId, imageId }, localIndex) => {
        const fileObject = normalizeFileEntry(fileEntry, documentId);
        const recto = fileObject.recto || fileObject.image || fileObject.file || "";
        const verso = fileObject.verso || "";

        const thumbnailPath = recto || verso;
        if (!thumbnailPath) return "";

        const thumbnailUrl = buildImageUrl(thumbnailPath, "thumbnail");
        const fallbackUrl = buildLocalImageUrl(thumbnailPath);
        const resolvedDocumentId = documentId || inferDocumentIdFromFilePath(thumbnailPath);
        const cardTitle = resolvedDocumentId || imageId || getBaseName(thumbnailPath);
        const cardSubtitle = imageId ? `Image ${imageId}` : `Image ${startIndex + localIndex + 1}`;

        return `
            <article class="cluster-thumb-card">
                <button
                    class="cluster-thumb-link cluster-image-button"
                    type="button"
                    data-document-id="${escapeHtml(resolvedDocumentId)}"
                    data-file-path="${escapeHtml(thumbnailPath)}"
                    title="Open the image and its metadata"
                    aria-label="Open the image and its metadata"
                >
                    <img
                        src="${escapeHtml(thumbnailUrl)}"
                        data-fallback-src="${escapeHtml(fallbackUrl)}"
                        alt="${escapeHtml(cardTitle)}"
                        loading="lazy"
                    >
                </button>
                <div class="cluster-thumb-meta">
                    <strong>${escapeHtml(cardTitle)}</strong>
                    <span>${escapeHtml(cardSubtitle)}</span>
                </div>
            </article>
        `;
    }).filter(Boolean).join("");

    return `
        <section class="detail-section cluster-gallery-section">
            <div class="cluster-gallery-header">
                <h4>Images related to the OCR place</h4>
                <span>${formatNumber(startIndex + 1)}–${formatNumber(endIndex)} / ${formatNumber(total)}</span>
            </div>

            <div class="cluster-thumb-grid">
                ${cards}
            </div>

            ${renderClusterGalleryPagination(currentPage, totalPages, total)}
        </section>
    `;
}

function renderOcrDocumentLinks(properties) {
    const documentIds = normalizeArray(properties.document_ids)
        .map(normalizeSingleIdentifier)
        .filter(Boolean)
        .slice(0, MAX_CLUSTER_DOCUMENT_LINKS);

    if (!documentIds.length) return "";

    return `
        <section class="detail-section detail-card">
            <h4>Documents related to this OCR place</h4>
            <ul class="cluster-doc-list cluster-doc-links">
                ${documentIds.map((documentId) => `
                    <li>
                        <button
                            type="button"
                            class="cluster-doc-button cluster-doc-link"
                            data-document-id="${escapeHtml(documentId)}"
                        >
                            ${escapeHtml(documentId)}
                        </button>
                    </li>
                `).join("")}
            </ul>
        </section>
    `;
}

function setupLayerControls() {
    const metadataToggle = document.getElementById("toggleMetadataCircles");
    const ocrToggle = document.getElementById("toggleOcrOverlay");
    const conflictToggle = document.getElementById("toggleConflicts");

    if (metadataToggle) {
        metadataToggle.addEventListener("change", () => {
            state.showMetadataCircles = metadataToggle.checked;
            updateLayerVisibility();
        });
    }

    if (ocrToggle) {
        ocrToggle.addEventListener("change", () => {
            state.showOcrOverlay = ocrToggle.checked;
            updateLayerVisibility();
        });
    }

    if (conflictToggle) {
        conflictToggle.addEventListener("change", () => {
            state.showConflicts = conflictToggle.checked;
            updateLayerVisibility();
        });
    }
}

function setupSearch() {
    const input = document.getElementById("searchPlace");
    if (!input) return;

    input.addEventListener("input", () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const query = input.value.trim();
            if (query.length < 2) return;
            const results = searchFeatures(query);
            renderSearchResults(query, results);
        }, 140);
    });
}

function searchFeatures(query) {
    const collections = [
        { type: "metadata", collection: state.metadataCircles },
        { type: "ocr", collection: state.ocrOverlay }
    ];

    return collections.flatMap(({ type, collection }) => (
        getFeatures(collection)
            .filter((feature) => featureMatchesQuery(feature, query))
            .slice(0, 50)
            .map((feature) => ({ type, feature }))
    )).slice(0, 75);
}

function zoomToFeature(feature) {
    const coordinates = getFeatureCoordinates(feature);
    if (!coordinates || !map) return;

    map.easeTo({
        center: coordinates,
        zoom: Math.max(map.getZoom(), 7),
        duration: 650
    });
}

function featureMatchesQuery(feature, query) {
    const props = feature.properties || {};
    const haystack = [
        props.label,
        props.resolved_label,
        props.document_id,
        props.country_name,
        props.admin1_name,
        props.metadata_kind,
        props.feature_code,
        props.conflict_reason,
        props.image_id,
        props.cluster_id,
        ...normalizeArray(props.metadata_types),
        ...normalizeArray(props.metadata_sources),
        ...normalizeArray(props.ocr_places_summary),
        ...normalizeArray(props.spacy_labels),
        ...(Array.isArray(props.document_ids) ? props.document_ids.slice(0, 200) : []),
        ...(Array.isArray(props.image_ids) ? props.image_ids.slice(0, 200) : [])
    ].filter(Boolean).join(" ");

    const normalizedHaystack = normalizeMapSearchText(haystack);
    const terms = String(query ?? "").match(/"[^"]+"|\S+/g) ?? [];
    return terms
        .map(term => normalizeMapSearchText(term.replace(/^"|"$/g, "")))
        .filter(Boolean)
        .every(term => normalizedHaystack.includes(term));
}

function normalizeMapSearchText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

function applyForbinDateFilter(year) {
    try {
        if (map && typeof map.filterByDate === "function") {
            const iso = year < 0
                ? `-${String(Math.abs(year)).padStart(4, "0")}-01-01`
                : `${String(year).padStart(4, "0")}-01-01`;
            map.filterByDate(iso);
        }
    } catch (error) {
        console.warn("filterByDate unavailable:", error.message);
    }
}

function setupTimeline() {
    const slider = document.getElementById("dateSlider");
    const dateLabel = document.getElementById("dateLabel");
    if (!slider || !dateLabel) return;

    const updateDate = () => {
        const year = getSliderYear();
        dateLabel.textContent = getYearLabel(year);
        clearTimeout(timelineDebounceTimer);
        timelineDebounceTimer = setTimeout(() => {
            if (mapReady) applyForbinDateFilter(year);
        }, 80);
    };

    slider.addEventListener("input", updateDate);
    slider.addEventListener("change", updateDate);
    updateDate();

    const eraBtn = document.getElementById("btnEraForbin");
    if (eraBtn) {
        eraBtn.addEventListener("click", () => {
            slider.value = "1900"; // center of Victor Forbin's active period
            updateDate();
        });
    }
}

function setupLeftPanelClose() {
    const closeLeftPanelBtn = document.getElementById("closeLeftPanel");
    if (!closeLeftPanelBtn || !leftPanel) return;

    closeLeftPanelBtn.textContent = "x";
    closeLeftPanelBtn.setAttribute("aria-label", "Close details panel");

    closeLeftPanelBtn.addEventListener("click", () => {
        setMapDetailMode(false);
        leftPanel.classList.remove("active");
        window.setTimeout(() => leftPanel.classList.add("hidden"), 260);
    });
}

function renderSearchResults(query, results) {
    if (!results.length) {
        openLeftPanel("Search", `<p>No results for <strong>${escapeHtml(query)}</strong>.</p>`);
        return;
    }

    const rows = results.map(({ type, feature }, index) => {
        const props = feature.properties || {};
        const title = escapeHtml(props.label || props.resolved_label || props.document_id || props.image_id || "Result");
        const subtitle = escapeHtml(props.resolved_label || props.country_name || props.document_id || "");
        return `
            <button class="search-result" type="button" data-result-index="${index}">
                <span class="layer-chip ${type}">${escapeHtml(type)}</span>
                <strong>${title}</strong>
                ${subtitle ? `<small>${subtitle}</small>` : ""}
            </button>
        `;
    }).join("");

    openLeftPanel("Search", `
        <p>${formatNumber(results.length)} result(s) for <strong>${escapeHtml(query)}</strong>.</p>
        <div class="search-results">${rows}</div>
    `);

    leftContent.querySelectorAll("[data-result-index]").forEach((button) => {
        button.addEventListener("click", () => {
            const result = results[Number(button.dataset.resultIndex)];
            if (!result) return;
            zoomToFeature(result.feature);
            state.selectedFeature = result.feature;
            if (result.type === "metadata") {
                openLeftPanel(getFeatureTitle(result.feature), renderMetadataClusterDetails(result.feature.properties || {}));
            } else {
                openLeftPanel(getFeatureTitle(result.feature), renderOcrPlaceDetails(result.feature.properties || {}));
            }
        });
    });
}

function getFeatureBounds(featureCollections) {
    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    featureCollections.forEach((collection) => {
        getFeatures(collection).forEach((feature) => {
            const coordinates = getFeatureCoordinates(feature);
            if (!coordinates) return;
            bounds.extend(coordinates);
            hasBounds = true;
        });
    });

    return hasBounds ? bounds : null;
}

function getFeatureCoordinates(feature) {
    if (!feature || !feature.geometry) return null;
    const { type, coordinates } = feature.geometry;

    if (type === "Point" && isValidLngLat(coordinates)) return coordinates;
    if (type === "MultiPoint" && Array.isArray(coordinates)) {
        return coordinates.find(isValidLngLat) || null;
    }
    return null;
}

function getMetadataCircleColorExpression() {
    if (!state.showConflicts) return "#a67c52";
    return [
        "case",
        ["boolean", ["get", "has_possible_metadata_ocr_conflict"], false],
        "#b54a3a",
        "#a67c52"
    ];
}

function setLayerVisibility(layerId, visible) {
    if (map && map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderDetailGrid(properties, fields) {
    const rows = fields
        .map(([label, key]) => {
            const value = properties[key];
            if (value === null || value === undefined || value === "") return "";
            return `
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(formatValue(value))}</dd>
            `;
        })
        .filter(Boolean)
        .join("");

    return rows ? `<dl class="detail-grid">${rows}</dl>` : "";
}

function renderChips(title, values, type) {
    const items = normalizeArray(values).slice(0, 16);
    if (!items.length) return "";
    return `
        <section class="detail-section">
            <h4>${escapeHtml(title)}</h4>
            <div class="chip-list">
                ${items.map((item) => `<span class="layer-chip ${escapeHtml(type)}">${escapeHtml(formatValue(item))}</span>`).join("")}
            </div>
        </section>
    `;
}

function renderPanelIntro(properties, layerType) {
    const label = properties.label || properties.resolved_label || properties.document_id || properties.image_id || "Selection";
    const subtitle = [
        properties.resolved_label && properties.resolved_label !== properties.label ? properties.resolved_label : "",
        properties.country_name,
        properties.admin1_name
    ].filter(Boolean).join(" - ");

    const stats = [
        ["Images", properties.image_count || properties.image_id],
        ["Documents", properties.document_count || properties.document_id],
        ["OCR", properties.ocr_place_count],
        ["GeoNames", properties.geonames_score]
    ].filter(([, value]) => value !== null && value !== undefined && value !== "");

    return `
        <section class="panel-hero ${escapeHtml(layerType)}">
            <div class="panel-hero-heading">
                <span class="layer-chip ${escapeHtml(layerType)}">${escapeHtml(getLayerLabel(layerType))}</span>
                <h3>${escapeHtml(label)}</h3>
                ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
            </div>
            ${stats.length ? `
                <div class="panel-kpis">
                    ${stats.map(([labelText, value]) => `
                        <div class="panel-kpi">
                            <strong>${escapeHtml(formatValue(value))}</strong>
                            <span>${escapeHtml(labelText)}</span>
                        </div>
                    `).join("")}
                </div>
            ` : ""}
        </section>
    `;
}

function getLayerLabel(layerType) {
    if (layerType === "metadata") return "Metadata";
    if (layerType === "ocr") return "OCR";
    return "Map";
}

function renderClusterImageGallery(properties) {
    const allItems = buildClusterGalleryItems(properties);
    const total = allItems.length;

    if (!total) return "";

    const pageSize = MAX_CLUSTER_THUMBNAILS;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(Math.max(clusterGalleryPage, 1), totalPages);
    clusterGalleryPage = currentPage;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const galleryItems = allItems.slice(startIndex, endIndex);

    const cards = galleryItems.map(({ fileEntry, documentId, imageId }, localIndex) => {
        const fileObject = normalizeFileEntry(fileEntry, documentId);
        const recto = fileObject.recto || fileObject.image || fileObject.file || "";
        const verso = fileObject.verso || "";

        const thumbnailPath = recto || verso;
        if (!thumbnailPath) return "";

        const thumbnailUrl = buildImageUrl(thumbnailPath, "thumbnail");
        const fallbackUrl = buildLocalImageUrl(thumbnailPath);
        const resolvedDocumentId = documentId || inferDocumentIdFromFilePath(thumbnailPath);
        const cardTitle = resolvedDocumentId || imageId || getBaseName(thumbnailPath);
        const cardSubtitle = imageId ? `Image ${imageId}` : `Image ${startIndex + localIndex + 1}`;

        return `
            <article class="cluster-thumb-card">
                <button
                    class="cluster-thumb-link cluster-image-button"
                    type="button"
                    data-document-id="${escapeHtml(resolvedDocumentId)}"
                    data-file-path="${escapeHtml(thumbnailPath)}"
                    title="Open the image and its metadata"
                    aria-label="Open the image and its metadata"
                >
                    <img
                        src="${escapeHtml(thumbnailUrl)}"
                        data-fallback-src="${escapeHtml(fallbackUrl)}"
                        alt="${escapeHtml(cardTitle)}"
                        loading="lazy"
                    >
                </button>
                <div class="cluster-thumb-meta">
                    <strong>${escapeHtml(cardTitle)}</strong>
                    <span>${escapeHtml(cardSubtitle)}</span>
                </div>
            </article>
        `;
    }).filter(Boolean).join("");

    return `
        <section class="detail-section cluster-gallery-section">
            <div class="cluster-gallery-header">
                <h4>Cluster images</h4>
                <span>${formatNumber(startIndex + 1)}–${formatNumber(endIndex)} / ${formatNumber(total)}</span>
            </div>

            <div class="cluster-thumb-grid">
                ${cards}
            </div>

            ${renderClusterGalleryPagination(currentPage, totalPages, total)}
        </section>
    `;
}

function renderClusterGalleryPagination(currentPage, totalPages, totalItems) {
    if (totalPages <= 1) return "";

    const pages = getPaginationPages(currentPage, totalPages);

    return `
        <nav class="cluster-gallery-pagination" aria-label="Cluster image pagination">
            <button
                type="button"
                class="cluster-page-btn"
                data-cluster-page="${currentPage - 1}"
                ${currentPage <= 1 ? "disabled" : ""}
            >
                ‹ Previous
            </button>

            <div class="cluster-page-numbers">
                ${pages.map((page) => {
        if (page === "...") {
            return `<span class="cluster-page-ellipsis">…</span>`;
        }

        return `
                        <button
                            type="button"
                            class="cluster-page-btn compact ${page === currentPage ? "active" : ""}"
                            data-cluster-page="${page}"
                            ${page === currentPage ? "aria-current=\"page\"" : ""}
                        >
                            ${page}
                        </button>
                    `;
    }).join("")}
            </div>

            <button
                type="button"
                class="cluster-page-btn"
                data-cluster-page="${currentPage + 1}"
                ${currentPage >= totalPages ? "disabled" : ""}
            >
                Next ›
            </button>
        </nav>
    `;
}

function getPaginationPages(currentPage, totalPages) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [1];

    if (currentPage > 4) {
        pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }

    if (currentPage < totalPages - 3) {
        pages.push("...");
    }

    pages.push(totalPages);

    return pages;
}

function setupClusterGalleryPagination() {
    if (!leftContent) return;

    leftContent.querySelectorAll("[data-cluster-page]").forEach((button) => {
        button.addEventListener("click", () => {
            const nextPage = Number(button.dataset.clusterPage);
            if (!Number.isFinite(nextPage) || nextPage < 1) return;

            clusterGalleryPage = nextPage;

            const properties = state.selectedFeature?.properties || {};
            const selectedType = getSelectedFeatureLayerType();

            if (selectedType === "ocr") {
                leftContent.innerHTML = renderOcrPlaceDetails(properties);
            } else {
                leftContent.innerHTML = renderMetadataClusterDetails(properties);
            }

            setupPanelImageFallbacks();
            setupPanelDocumentButtons();
            setupClusterGalleryPagination();

            const gallery = leftContent.querySelector(".cluster-gallery-section");
            if (gallery) {
                gallery.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });
}

function getSelectedFeatureLayerType() {
    return state.selectedLayerType || "metadata";
}

function buildClusterGalleryItems(properties) {
    const sampleFiles = normalizeArray(properties.sample_file_names);
    const documentIds = normalizeArray(properties.document_ids)
        .map(normalizeSingleIdentifier)
        .filter(Boolean);
    const imageIds = normalizeArray(properties.image_ids)
        .map(normalizeSingleIdentifier)
        .filter(Boolean);

    if (sampleFiles.length) {
        return sampleFiles.map((fileEntry, index) => {
            const fileObject = normalizeFileEntry(fileEntry);
            const primaryPath = getFileEntryPrimaryPath(fileObject);

            const documentId =
                normalizeSingleIdentifier(documentIds[index]) ||
                inferDocumentIdFromFilePath(primaryPath) ||
                "";

            return {
                fileEntry: fileObject,
                documentId,
                imageId: imageIds[index] || ""
            };
        }).filter(({ fileEntry }) => getFileEntryPrimaryPath(fileEntry));
    }

    return documentIds.map((documentId, index) => ({
        fileEntry: buildFileEntryFromDocumentId(documentId),
        documentId,
        imageId: imageIds[index] || ""
    })).filter(({ fileEntry }) => getFileEntryPrimaryPath(fileEntry));
}

function normalizeFileEntry(value, documentId = "") {
    if (!value && documentId) {
        return buildFileEntryFromDocumentId(documentId);
    }

    if (!value) return {};

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
            try {
                const parsed = JSON.parse(trimmed);

                if (Array.isArray(parsed)) {
                    return parsed.length ? normalizeFileEntry(parsed[0], documentId) : {};
                }

                return normalizeFileEntry(parsed, documentId);
            } catch (error) {
                // Si ce n'est pas du JSON valide, on continue normalement.
            }
        }

        if (looksLikeDocumentId(trimmed)) {
            return buildFileEntryFromDocumentId(trimmed);
        }

        return { image: trimmed };
    }

    if (typeof value === "object") {
        return value;
    }

    return {};
}

function buildFileEntryFromDocumentId(documentId) {
    const id = normalizeSingleIdentifier(documentId);
    const carton = getCartonFromDocumentId(id);
    const sequence = getDocumentSequence(id);
    if (!carton || !sequence) return {};

    return {
        recto: `${carton}/${carton}_${sequence}__0001.jpg`,
        verso: `${carton}/${carton}_${sequence}__0002.jpg`
    };
}

function getFileEntryPrimaryPath(fileEntry) {
    const fileObject = normalizeFileEntry(fileEntry);
    return fileObject.recto || fileObject.image || fileObject.file || fileObject.verso || "";
}

function looksLikeDocumentId(value) {
    return /^SHDGR_/.test(String(value || "")) && !/\.(jpe?g|png|webp|tif|tiff)$/i.test(String(value || ""));
}

function getDocumentSequence(documentId) {
    return String(documentId || "").split("_").filter(Boolean).pop() || "";
}

function buildImageUrl(filePath, variant = "download") {
    if (!filePath) return "";

    const path = String(filePath);
    if (/^https?:\/\//i.test(path) || path.startsWith("/") || path.startsWith("data:")) {
        return path;
    }

    return buildSharedocsUrl(path, variant);
}

function buildLocalImageUrl(filePath) {
    if (!filePath) return "";
    const path = String(filePath);
    if (/^https?:\/\//i.test(path) || path.startsWith("/") || path.startsWith("data:")) {
        return path;
    }
    if (path.startsWith(LOCAL_IMAGE_BASE_URL)) return path;
    return `${LOCAL_IMAGE_BASE_URL}${path}`;
}

function buildSharedocsUrl(filePath, variant = "download") {
    const params = new URLSearchParams({
        id: SHAREDOCS_PUBLIC_ID,
        path: filePath,
        mode: "grid"
    });
    params.set(variant === "thumbnail" ? "thumbnail" : "download", "1");
    return `${SHAREDOCS_BASE_URL}?${params.toString()}`;
}

function setupPanelImageFallbacks() {
    if (!leftContent) return;

    leftContent.querySelectorAll(".cluster-thumb-link img").forEach((image) => {
        image.addEventListener("error", () => {
            const fallbackSrc = image.dataset.fallbackSrc;
            if (fallbackSrc && image.src !== fallbackSrc && image.dataset.triedFallback !== "true") {
                image.dataset.triedFallback = "true";
                image.src = fallbackSrc;
                return;
            }
            image.closest(".cluster-thumb-card")?.classList.add("thumb-missing");
        });
    });
}

function setupPanelDocumentButtons() {
    if (!leftContent) return;

    leftContent.querySelectorAll(".cluster-doc-button").forEach((button) => {
        button.addEventListener("click", () => {
            const documentId = button.dataset.documentId;
            if (!documentId) return;
            openDocumentInPanel(documentId, state.selectedFeature?.properties || {});
        });
    });

    leftContent.querySelectorAll(".cluster-image-button").forEach((button) => {
        button.addEventListener("click", () => {
            openDocumentInPanel(
                button.dataset.documentId || "",
                state.selectedFeature?.properties || {},
                button.dataset.filePath || ""
            );
        });
    });
}

async function openDocumentInPanel(documentId, contextProperties = {}, filePath = "") {
    if (!leftPanel || !leftTitle || !leftContent) return;

    const resolvedDocumentId = documentId || inferDocumentIdFromFilePath(filePath) || "Document";
    setMapDetailMode(true);
    leftPanel.classList.remove("hidden");
    leftPanel.classList.add("active");
    leftTitle.textContent = resolvedDocumentId;
    leftContent.innerHTML = `
        <div class="document-panel-loading">
            Loading the image and stream metadata…
        </div>
    `;

    try {
        const imageData = await findStreamImageForDocument(resolvedDocumentId, filePath);
        if (!imageData) {
            leftContent.innerHTML = renderDocumentPanelShell(
                resolvedDocumentId,
                `<div class="document-panel-empty">No entry found in the manifests for <strong>${escapeHtml(resolvedDocumentId)}</strong>.</div>`,
                contextProperties
            );
            setupDocumentPanelActions(contextProperties);
            return;
        }

        const manifestDocumentId = inferDocumentIdFromImage(imageData) || resolvedDocumentId;
        const ocrMatches = findOcrMatchesForDocument(manifestDocumentId);
        leftTitle.textContent = manifestDocumentId;
        leftContent.innerHTML = renderDocumentPanelShell(
            manifestDocumentId,
            renderDocumentPanelContent(manifestDocumentId, imageData, contextProperties, ocrMatches),
            contextProperties
        );
        setupDocumentImageFallbacks(leftContent, manifestDocumentId, contextProperties);
        setupDocumentPanelActions(contextProperties);
    } catch (error) {
        leftContent.innerHTML = renderDocumentPanelShell(
            resolvedDocumentId,
            `<div class="document-panel-empty">Error while loading: ${escapeHtml(error.message)}</div>`,
            contextProperties
        );
        setupDocumentPanelActions(contextProperties);
    }
}

function renderDocumentPanelShell(documentId, contentHtml, contextProperties) {
    const explorerUrl = `explorer.html?mode=stream&document_id=${encodeURIComponent(documentId)}`;
    return `
        <div class="document-panel-view">
            <div class="document-panel-toolbar">
                <button type="button" class="document-back-button" data-back-to-cluster>
                    Back to cluster
                </button>
                <span>${escapeHtml(documentId)}</span>
                <a href="${explorerUrl}" target="_blank" class="small-action" style="text-decoration:none;font-weight:bold;margin-left:auto;margin-right:5px;">
                    🔎 Open in Explorer
                </a>
            </div>
            ${renderPanelIntro(contextProperties, "metadata")}
            ${contentHtml}
        </div>
    `;
}

function setupDocumentPanelActions(contextProperties) {
    if (!leftContent) return;

    leftContent.querySelector("[data-back-to-cluster]")?.addEventListener("click", () => {
        setMapDetailMode(false);
        openLeftPanel(
            getFeatureTitle(state.selectedFeature),
            renderMetadataClusterDetails(contextProperties),
            { resetGalleryPage: false }
        );
    });
}

function setMapDetailMode(active) {
    document.querySelector(".main-layout")?.classList.toggle("map-detail-mode", active);
    leftPanel?.classList.toggle("document-expanded", active);

    window.setTimeout(() => {
        if (map) map.resize();
    }, 260);
}

async function findStreamImageForDocument(documentId, filePath = "") {
    const carton = getCartonFromFilePath(filePath) || getCartonFromDocumentId(documentId);
    if (!carton) return null;

    const manifest = await loadStreamManifest(carton);
    return findImageInManifest(manifest, documentId, filePath);
}

async function loadStreamManifest(carton) {
    if (state.streamManifestCache[carton]) {
        return state.streamManifestCache[carton];
    }

    const url = `data/stream/cartons/${encodeURIComponent(carton)}.json`;
    const manifest = await loadJson(url);
    state.streamManifestCache[carton] = manifest;
    return manifest;
}

function findImageInManifest(manifest, documentId, filePath = "") {
    const images = Array.isArray(manifest?.images) ? manifest.images : [];
    const target = normalizeIdentifier(documentId);
    const fileTarget = normalizeIdentifier(filePath);
    return images.find((image) => {
        if (target && normalizeIdentifier(image.id) === target) return true;
        return Object.values(image.file_names || {}).some((fileName) => {
            const normalizedFile = normalizeIdentifier(fileName);
            return (fileTarget && normalizedFile === fileTarget) || (target && normalizedFile.includes(target));
        });
    }) || null;
}

function getCartonFromDocumentId(documentId) {
    const parts = String(documentId || "").split("_").filter(Boolean);
    if (parts.length < 6) return "";
    return `${parts[0]}__${parts.slice(1, -1).join("_")}`;
}

function getCartonFromFilePath(filePath) {
    return String(filePath || "").split("/")[0] || "";
}

function inferDocumentIdFromImage(imageData) {
    const firstFile = Object.values(imageData?.file_names || {})[0] || "";
    const base = getBaseName(firstFile).replace(/\.[^.]+$/, "");
    return base.replace(/__(0001|0002)$/i, "").replace(/__/g, "_");
}

function findOcrMatchesForDocument(documentId) {
    const target = normalizeIdentifier(documentId);
    return getFeatures(state.ocrOverlay)
        .filter((feature) => {
            const props = feature.properties || {};
            return normalizeArray(props.document_ids).some((id) => normalizeIdentifier(id) === target);
        })
        .slice(0, 12);
}

function renderDocumentFace(documentId, face, fileName) {
    const imageUrl = buildImageUrl(fileName, "download");
    const fallbackUrl = buildLocalImageUrl(fileName);
    const faceTitle = face ? `${face}` : "Image";

    return `
        <article class="document-face-card">
            <button
                type="button"
                class="document-face-trigger"
                data-document-id="${escapeHtml(documentId)}"
                data-file-path="${escapeHtml(fileName)}"
                aria-label="Open ${escapeHtml(faceTitle)}"
            >
                <div class="document-face-header">
                    <strong>${escapeHtml(faceTitle)}</strong>
                    <span>${escapeHtml(getBaseName(fileName))}</span>
                </div>
                <div class="document-face-image-link">
                    <img
                        src="${escapeHtml(imageUrl)}"
                        data-fallback-src="${escapeHtml(fallbackUrl)}"
                        alt="${escapeHtml(faceTitle)}"
                        loading="lazy"
                    >
                </div>
            </button>
        </article>
    `;
}

function renderDocumentPanelContent(documentId, imageData, contextProperties, ocrMatches) {
    const faceEntries = Object.entries(imageData.file_names || {});
    return `
        <div class="document-layout-grid">
            <section class="document-images-panel">
                <h3>Images</h3>
                <div class="document-face-grid">
                    ${faceEntries.map(([face, fileName]) => renderDocumentFace(documentId, face, fileName)).join("")}
                </div>
            </section>
            <section class="document-info-panel">
                ${renderDocumentMetadataBlock("Manifest metadata", imageData.metadata || {}, [
        "Carton",
        "Pays",
        "Pays / Region",
        "Sous-region",
        "Continent",
        "Classe",
        "Type",
        "ClusterLabel",
        "Source",
        "width_px",
        "height_px",
        "dpi"
    ])}
                ${renderDocumentGeoNamesBlock(contextProperties)}
                ${renderDocumentSpacyBlock(ocrMatches)}
                ${renderDocumentTechnicalBlock(documentId, imageData)}
            </section>
        </div>
    `;
}

function renderDocumentMetadataBlock(title, metadata, keys) {
    const rows = keys
        .map((key) => [key, metadata?.[key]])
        .filter(([, value]) => hasValue(value));

    if (!rows.length) return "";

    return `
        <section class="document-detail-card">
            <h3>${escapeHtml(title)}</h3>
            <dl class="document-detail-grid">
                ${rows.slice(0, 32).map(([key, value]) => `
                    <dt>${escapeHtml(formatMetadataKey(key))}</dt>
                    <dd>${escapeHtml(formatValue(value))}</dd>
                `).join("")}
            </dl>
        </section>
    `;
}

function renderDocumentGeoNamesBlock(properties) {
    const fields = [
        ["Map place", properties.label],
        ["Resolved label", properties.resolved_label],
        ["GeoNames country", properties.country_name],
        ["Admin 1", properties.admin1_name],
        ["Feature code", properties.feature_code],
        ["GeoNames ID", properties.geonames_id],
        ["Score GeoNames", properties.geonames_score],
        ["Metadata / OCR conflict", properties.conflict_reason]
    ].filter(([, value]) => hasValue(value));

    if (!fields.length) return "";

    return `
        <section class="document-detail-card">
            <h3>GeoNames enrichment</h3>
            <dl class="document-detail-grid">
                ${fields.map(([key, value]) => `
                    <dt>${escapeHtml(key)}</dt>
                    <dd>${escapeHtml(formatValue(value))}</dd>
                `).join("")}
            </dl>
        </section>
    `;
}

function renderDocumentSpacyBlock(ocrMatches) {
    if (!ocrMatches.length) {
        return `
            <section class="document-detail-card">
                <h3>spaCy / OCR enrichment</h3>
                <p class="detail-note">No OCR place is directly linked to this document in the loaded GeoJSON.</p>
            </section>
        `;
    }

    return `
        <section class="document-detail-card">
            <h3>spaCy / OCR enrichment</h3>
            <div class="document-ocr-list">
                ${ocrMatches.map((feature) => {
        const props = feature.properties || {};
        return `
                        <article>
                            <strong>${escapeHtml(props.label || props.resolved_label || "OCR place")}</strong>
                            <span>${escapeHtml([props.resolved_label, props.country_name, props.admin1_name].filter(Boolean).join(" - "))}</span>
                            <div class="chip-list">
                                ${normalizeArray(props.spacy_models).slice(0, 4).map((item) => `<span class="layer-chip ocr">${escapeHtml(item)}</span>`).join("")}
                                ${normalizeArray(props.spacy_labels).slice(0, 4).map((item) => `<span class="layer-chip ocr">${escapeHtml(item)}</span>`).join("")}
                                ${hasValue(props.geonames_score) ? `<span class="layer-chip metadata">GeoNames ${escapeHtml(formatValue(props.geonames_score))}</span>` : ""}
                            </div>
                        </article>
                    `;
    }).join("")}
            </div>
        </section>
    `;
}

function renderDocumentTechnicalBlock(documentId, imageData) {
    const explorerUrl = `explorer.html?mode=stream&document_id=${encodeURIComponent(documentId)}`;
    return `
        <section class="document-detail-card">
            <h3>Identifiers</h3>
            <dl class="document-detail-grid">
                <dt>Document</dt>
                <dd>${escapeHtml(documentId)}</dd>
                <dt>Stream image</dt>
                <dd>${escapeHtml(formatValue(imageData.id))}</dd>
                <dt>Remote source</dt>
                <dd>${escapeHtml(imageData.remote_source || "local")}</dd>
            </dl>
            <a href="${explorerUrl}" target="_blank" class="btn-open-explorer">
                <svg width="14" height="14" viewBox="0 0 24 24" style="margin-right:5px;vertical-align:middle;"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                Open in the Forbin Explorer
            </a>
        </section>
    `;
}

function setupDocumentImageFallbacks(container, documentId = "", contextProperties = {}) {
    container.querySelectorAll(".document-face-image-link img").forEach((image) => {
        image.addEventListener("error", () => {
            const fallbackSrc = image.dataset.fallbackSrc;
            if (fallbackSrc && image.src !== fallbackSrc && image.dataset.triedFallback !== "true") {
                image.dataset.triedFallback = "true";
                image.src = fallbackSrc;
                return;
            }
            image.closest(".document-face-card")?.classList.add("thumb-missing");
        });
    });

    container.querySelectorAll(".document-face-trigger").forEach((button) => {
        button.addEventListener("click", () => {
            const filePath = button.dataset.filePath || "";
            if (!filePath) return;
            openDocumentInPanel(documentId, contextProperties, filePath);
        });
    });
}

function hasValue(value) {
    return value !== null && value !== undefined && value !== "";
}

function formatMetadataKey(key) {
    const labels = {
        Carton: "Box",
        Pays: "Country",
        "Pays / Region": "Country / region",
        "Pays / Région": "Country / region",
        "Sous-region": "Subregion",
        "Sous-région": "Subregion",
        Classe: "Class"
    };
    return labels[key] || String(key).replace(/_/g, " ");
}

function normalizeIdentifier(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSingleIdentifier(value) {
    if (value === null || value === undefined) return "";

    if (Array.isArray(value)) {
        return value.length ? normalizeSingleIdentifier(value[0]) : "";
    }

    if (typeof value === "object") {
        return "";
    }

    const text = String(value).trim();

    if (
        (text.startsWith("[") && text.endsWith("]")) ||
        (text.startsWith("{") && text.endsWith("}"))
    ) {
        try {
            const parsed = JSON.parse(text);
            return normalizeSingleIdentifier(parsed);
        } catch (error) {
            return text;
        }
    }

    return text;
}

function inferDocumentIdFromFilePath(filePath) {
    if (!filePath) return "";

    const base = getBaseName(filePath).replace(/\.[^.]+$/, "");

    return base
        .replace(/__(0001|0002)$/i, "")
        .replace(/__+/g, "_");
}

function getBaseName(path) {
    return String(path || "").split("/").pop() || "";
}

function detailLine(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return `<br>${escapeHtml(label)} : ${escapeHtml(formatValue(value))}`;
}

function normalizeArray(value) {
    if (value === null || value === undefined || value === "") return [];

    if (Array.isArray(value)) {
        return value.flatMap((item) => normalizeArrayItem(item));
    }

    return normalizeArrayItem(value);
}

function normalizeArrayItem(value) {
    if (value === null || value === undefined || value === "") return [];

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (
            (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
            (trimmed.startsWith("{") && trimmed.endsWith("}"))
        ) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch (error) {
                return [value];
            }
        }

        return [value];
    }

    return [value];
}

function formatValue(value) {
    if (Array.isArray(value)) return value.map(formatValue).join(", ");
    if (typeof value === "object" && value !== null) {
        return Object.entries(value)
            .map(([key, item]) => `${key}: ${formatValue(item)}`)
            .join(" | ");
    }
    if (typeof value === "number") return formatNumber(value);
    return String(value);
}

function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return new Intl.NumberFormat("fr-FR").format(number);
}

function pickNumber(...values) {
    for (const value of values) {
        const number = Number(value);
        if (Number.isFinite(number)) return number;
    }
    return 0;
}

function getFeatures(collection) {
    return collection && Array.isArray(collection.features) ? collection.features : [];
}

function isValidLngLat(coordinates) {
    return Array.isArray(coordinates)
        && coordinates.length >= 2
        && Number.isFinite(Number(coordinates[0]))
        && Number.isFinite(Number(coordinates[1]));
}

function getFeatureTitle(feature) {
    const props = feature.properties || {};
    return String(props.label || props.resolved_label || props.document_id || props.image_id || "Details");
}

function getSliderYear() {
    const slider = document.getElementById("dateSlider");
    return slider ? parseInt(slider.value, 10) : 1900;
}

function getYearLabel(year) {
    if (year < 0) return `${Math.abs(year)} BCE`;
    return `${year}`;
}

function setLoadingVisible(visible) {
    if (mapLoading) mapLoading.classList.toggle("hidden", !visible);
}

function setLoadingMessage(message) {
    if (!mapLoading) return;
    mapLoading.innerHTML = `<span>${escapeHtml(message)}</span>`;
    setLoadingVisible(true);
}

// ─── Filter & Conflict Explorer Logic ─────────────────────────────────────────

function populateMetadataKinds() {
    const select = document.getElementById("filterMetadataKind");
    if (!select || !state.metadataCircles) return;

    const kinds = new Set();
    (state.metadataCircles.features || []).forEach(f => {
        if (f.properties && f.properties.metadata_kind) {
            kinds.add(f.properties.metadata_kind);
        }
    });

    select.innerHTML = '<option value="">All types</option>';

    Array.from(kinds).sort().forEach(kind => {
        const option = document.createElement("option");
        option.value = kind;
        option.textContent = kind.replace(/_/g, " ");
        select.appendChild(option);
    });
}

function setupAdvancedFilters() {
    const scoreSlider = document.getElementById("minGeoNamesScore");
    const scoreVal = document.getElementById("minGeoNamesScoreVal");
    const countSlider = document.getElementById("minImageCount");
    const countVal = document.getElementById("minImageCountVal");
    const kindSelect = document.getElementById("filterMetadataKind");

    if (scoreSlider && scoreVal) {
        scoreSlider.addEventListener("input", () => {
            const val = parseFloat(scoreSlider.value);
            scoreVal.textContent = val.toFixed(2);
            state.minGeoNamesScore = val;
            applyFilters();
        });
    }

    if (countSlider && countVal) {
        countSlider.addEventListener("input", () => {
            const val = parseInt(countSlider.value, 10);
            countVal.textContent = val;
            state.minImageCount = val;
            applyFilters();
        });
    }

    if (kindSelect) {
        kindSelect.addEventListener("change", () => {
            state.selectedMetadataKind = kindSelect.value;
            applyFilters();
        });
    }
}

function setupConflictsExplorer() {
    const toggleBtn = document.getElementById("toggleConflictsPanel");
    const container = document.getElementById("conflictsListContainer");

    if (toggleBtn && container) {
        toggleBtn.addEventListener("click", () => {
            const isHidden = container.classList.toggle("hidden");
            toggleBtn.classList.toggle("active", !isHidden);
        });
    }
}

function applyFilters() {
    if (!mapReady || !map) return;

    const filteredMetadata = {
        type: "FeatureCollection",
        features: (state.metadataCircles?.features || []).filter(feature => {
            const props = feature.properties || {};
            const score = parseFloat(props.geonames_score) || 0.0;
            const count = parseInt(props.image_count) || 0;
            const kind = props.metadata_kind || "";

            if (score < state.minGeoNamesScore) return false;
            if (count < state.minImageCount) return false;
            if (state.selectedMetadataKind && kind !== state.selectedMetadataKind) return false;

            return true;
        })
    };

    const filteredOcr = {
        type: "FeatureCollection",
        features: (state.ocrOverlay?.features || []).filter(feature => {
            const props = feature.properties || {};
            const score = parseFloat(props.geonames_score) || 0.0;
            const count = parseInt(props.image_count) || 0;

            if (score < state.minGeoNamesScore) return false;
            if (count < state.minImageCount) return false;

            return true;
        })
    };

    const srcMeta = map.getSource("metadata-circles");
    if (srcMeta) srcMeta.setData(filteredMetadata);

    const srcOcr = map.getSource("ocr-overlay");
    if (srcOcr) srcOcr.setData(filteredOcr);

    updateConflictsList();
}

function updateConflictsList() {
    const list = document.getElementById("conflictsList");
    const badge = document.getElementById("conflictBadgeCount");
    if (!list) return;

    const conflictFeatures = (state.metadataCircles?.features || []).filter(feature => {
        const props = feature.properties || {};
        const score = parseFloat(props.geonames_score) || 0.0;
        const count = parseInt(props.image_count) || 0;
        const kind = props.metadata_kind || "";

        if (score < state.minGeoNamesScore) return false;
        if (count < state.minImageCount) return false;
        if (state.selectedMetadataKind && kind !== state.selectedMetadataKind) return false;

        return Boolean(props.has_possible_metadata_ocr_conflict);
    });

    if (badge) {
        badge.textContent = conflictFeatures.length;
    }

    if (conflictFeatures.length === 0) {
        list.innerHTML = '<div style="padding:10px;font-size:0.84em;color:#7b6b56;font-style:italic;">No matching conflict</div>';
        return;
    }

    list.innerHTML = conflictFeatures.map((feature, idx) => {
        const props = feature.properties || {};
        const label = props.label || props.resolved_label || "Place";
        const reason = props.conflict_reason || "Metadata / OCR mismatch";
        const country = props.country_name || "";
        const count = props.image_count || 0;

        return `
            <button type="button" class="conflict-item" data-conflict-idx="${idx}">
                <strong>${escapeHtml(label)}</strong>
                <span class="conflict-meta">${escapeHtml(country)} • ${formatNumber(count)} images</span>
                <span class="conflict-desc">${escapeHtml(reason)}</span>
            </button>
        `;
    }).join("");

    list.querySelectorAll("[data-conflict-idx]").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.conflictIdx, 10);
            const feature = conflictFeatures[idx];
            if (!feature) return;

            zoomToFeature(feature);

            const coordinates = getFeatureCoordinates(feature);
            if (coordinates) {
                new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
                    .setLngLat(coordinates)
                    .setHTML(renderPopupHTML(feature.properties || {}, "metadata"))
                    .addTo(map);
            }

            state.selectedFeature = feature;
            state.selectedLayerType = "metadata";
            clusterGalleryPage = 1;
            openLeftPanel(
                getFeatureTitle(feature),
                renderMetadataClusterDetails(feature.properties || {})
            );
        });
    });
}

function renderGeoValidationBlock(properties) {
    const geonamesId = properties.geonames_id;
    const coords = getFeatureCoordinates(state.selectedFeature);
    if (!geonamesId && !coords) return "";

    const links = [];
    if (geonamesId) {
        links.push(`
            <a href="https://www.geonames.org/${escapeHtml(geonamesId)}" target="_blank" class="btn-geo-link">
                🌐 GeoNames
            </a>
        `);
    }
    if (coords) {
        const lat = coords[1];
        const lng = coords[0];
        links.push(`
            <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=12/${lat}/${lng}" target="_blank" class="btn-geo-link">
                🗺️ OSM
            </a>
        `);
        links.push(`
            <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" class="btn-geo-link">
                📍 Google Maps
            </a>
        `);
    }

    return `
        <div class="geo-validation-section">
            <h5>Map validation</h5>
            <div class="geo-validation-links">
                ${links.join("")}
            </div>
        </div>
    `;
}

function coordsRow(feature) {
    const coords = getFeatureCoordinates(feature);
    if (!coords) return "";
    return `
        <dl class="detail-grid" style="margin-top: 0; border-top: 1px dashed rgba(0,0,0,0.08); padding-top: 8px;">
            <dt>Coordinates</dt>
            <dd>${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}</dd>
        </dl>
    `;
}
