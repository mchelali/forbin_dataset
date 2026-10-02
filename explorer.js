// ─── State ────────────────────────────────────────────────────────────────────

let data = [];
let grouped = {};
let annsByImage = {};
let predictionSources = {};
let predictionsBySource = {};
let predictionImageMapsBySource = {};
let loadedPredictionCartonsBySource = {};
let streamCartons = [];
let streamCartonEntries = {};
let loadedStreamCartons = {};
let currentCarton = null;
let currentImageId = null;
let currentImageData = null;
let currentFace = "recto";
let currentPage = 1;
const PER_PAGE = 12;
const CONFIG = window.FORBIN_CONFIG ?? {};
const MANUAL_ANNOTATION_COLOR = "#238636";
const MONKEY_OCR_COLOR = "#d97706";
const PREDICTION_COLOR_PALETTE = ["#2d7dd2", "#8b5cf6", "#d1495b", "#008b8b", "#c2410c", "#7c3aed"];

// ─── DOM refs (resolved once) ─────────────────────────────────────────────────

const imgEl = document.getElementById("main-img");
const svgEl = document.getElementById("main-svg");
const gGroup = document.getElementById("svg-g-group");
const tooltip = document.getElementById("tooltip");
const galleryEl = document.getElementById("gallery");
const paginationEl = document.getElementById("pagination");
const cartonListEl = document.getElementById("carton-list");
const cartonSearchEl = document.getElementById("carton-search");
const cartonSortEl = document.getElementById("carton-sort");
const searchEl = document.getElementById("search");
const searchFieldEl = document.getElementById("search-field");
const metadataCountryEl = document.getElementById("metadata-country");
const metadataSubjectEl = document.getElementById("metadata-subject");
const filterHasOcrEl = document.getElementById("filter-has-ocr");
const filterHasAnnotationsEl = document.getElementById("filter-has-annotations");
const filterHasVersoEl = document.getElementById("filter-has-verso");
const metadataSearchStatusEl = document.getElementById("metadata-search-status");
const clearMetadataFiltersEl = document.getElementById("clear-metadata-filters");
const wrapperEl = document.getElementById("img-wrapper");
const predictionControlsEl = document.getElementById("prediction-controls");
const downloadCartonEl = document.getElementById("download-carton");
const modeNoteEl = document.getElementById("mode-note");
const sampleModeLinkEl = document.getElementById("sample-mode-link");
const streamModeLinkEl = document.getElementById("stream-mode-link");
const viewerEmptyStateEl = document.getElementById("viewer-empty-state");
const galleryTitleEl = document.getElementById("gallery-title");
const galleryViewEl = document.getElementById("gallery-view");
const visualizerEl = document.getElementById("visualizer");
const documentPanelEl = document.getElementById("document-panel");
const galleryFilterControls = [
    searchEl,
    searchFieldEl,
    metadataCountryEl,
    metadataSubjectEl,
    filterHasOcrEl,
    filterHasAnnotationsEl,
    filterHasVersoEl,
    clearMetadataFiltersEl
].filter(Boolean);

function setGalleryControlsEnabled(enabled) {
    galleryFilterControls.forEach(control => {
        control.disabled = !enabled;
    });
}

function updateGalleryHeading() {
    if (galleryTitleEl) galleryTitleEl.textContent = currentCarton || t("explorer.chooseBox");
}

function showGalleryView() {
    document.body.classList.add("explorer-gallery-mode");
    document.body.classList.remove("explorer-document-mode");
    galleryViewEl?.removeAttribute("aria-hidden");
    visualizerEl?.setAttribute("aria-hidden", "true");
    documentPanelEl?.setAttribute("aria-hidden", "true");
    documentPanelEl?.classList.remove("mobile-open");
    document.getElementById("archive-panel")?.classList.remove("mobile-open");
    document.getElementById("toggle-archive-panel")?.setAttribute("aria-expanded", "false");
    document.getElementById("toggle-metadata-panel")?.setAttribute("aria-expanded", "false");
    updateGalleryHeading();
    const breadcrumb = document.getElementById("archive-breadcrumb");
    if (breadcrumb) breadcrumb.textContent = currentCarton ? `${t("explorer.forbinCollection")} / ${currentCarton}` : t("explorer.forbinCollection");
}

function showDocumentView() {
    document.body.classList.remove("explorer-gallery-mode");
    document.body.classList.add("explorer-document-mode");
    galleryViewEl?.setAttribute("aria-hidden", "true");
    visualizerEl?.removeAttribute("aria-hidden");
    documentPanelEl?.removeAttribute("aria-hidden");
    document.getElementById("archive-panel")?.classList.remove("mobile-open");
    document.getElementById("toggle-archive-panel")?.setAttribute("aria-expanded", "false");
}

// ─── Zoom / Pan state ─────────────────────────────────────────────────────────

let zoomScale = 1;
let panX = 0, panY = 0;
let minZoom = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.4;

// Active pointers (mouse, pen or fingers) used for panning and pinch-zooming.
const activePointers = new Map();
let panStart = null;
let pinchStart = null;

// Incremented on every display request so that stale async work is ignored.
let displayRequestId = 0;

// Carton-level prediction payloads, shared by detection counts and overlays.
const cartonPredictionsCache = {};
const detectionCountsLoaded = {};

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadData() {
    setModeUI();
    if (getDatasetMode() === "stream") {
        await loadStreamIndex();
    } else {
        await loadSampleDataset();
    }
    setupPredictionControls();
    renderCartonList();
    await openExplorerFromUrlParams();
}

// Two modes only: the local sample subset, or the full collection streamed
// from Huma-Num Sharedocs. Any other value falls back to the sample.
function getDatasetMode() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") ?? CONFIG.mode;
    return mode === "stream" ? "stream" : "sample";
}

function setModeUI() {
    const mode = getDatasetMode();
    sampleModeLinkEl?.classList.toggle("active", mode !== "stream");
    streamModeLinkEl?.classList.toggle("active", mode === "stream");
    if (modeNoteEl) modeNoteEl.textContent = "";
}

async function loadSampleDataset() {
    const coco = await fetchJson(CONFIG.datasetUrl ?? "samples/subset.json");
    prepareCocoDataset(coco);
    document.getElementById("total-count").textContent = data.length;
}

async function loadStreamIndex() {
    const index = await fetchJson(CONFIG.streamIndexUrl);
    streamCartons = index.cartons ?? [];
    streamCartonEntries = {};
    loadedStreamCartons = {};
    data = [];
    grouped = {};
    annsByImage = {};

    for (const entry of streamCartons) {
        streamCartonEntries[entry.carton] = entry;
    }

    const totalImages = streamCartons.reduce((total, entry) => total + (entry.images ?? 0), 0);
    document.getElementById("total-count").textContent = totalImages;
}

// Values injected by older manifest builds when a field was missing.
const PLACEHOLDER_CLASS = "Streaming Hugging Face";
const PLACEHOLDER_COUNTRY = "Non renseigné";

function normalizeImageRecord(image) {
    const metadata = image.metadata;
    if (metadata?.Classe === PLACEHOLDER_CLASS) {
        delete metadata.Classe;
        if (metadata.Pays === PLACEHOLDER_COUNTRY) delete metadata.Pays;
    }
}

// Manual annotations may store their transcription in `texts` instead of `text`.
function normalizeAnnotationRecord(annotation) {
    if (hasText(annotation.text) || annotation.texts == null) return;
    annotation.text = Array.isArray(annotation.texts)
        ? annotation.texts.filter(hasText).join(" / ")
        : String(annotation.texts);
}

function prepareCocoDataset(coco) {
    data = coco.images ?? [];
    const anns = coco.annotations ?? [];

    // Index annotations by image_id once
    annsByImage = {};
    for (const a of anns) {
        normalizeAnnotationRecord(a);
        (annsByImage[a.image_id] ??= []).push(a);
    }

    // Attach annotations and build search cache
    for (const d of data) {
        normalizeImageRecord(d);
        d.annotations = annsByImage[d.id] ?? [];
        prepareSearchIndex(d);
    }

    // Group by carton
    grouped = {};
    for (const d of data) {
        const carton = d.metadata?.Carton ?? "Unknown";
        (grouped[carton] ??= []).push(d);
    }
}

function normalizeSearchText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

function joinSearchValues(...values) {
    return normalizeSearchText(values.flat(Infinity).filter(value => value !== null && value !== undefined).join(" "));
}

function prepareSearchIndex(image) {
    const metadata = image.metadata ?? {};
    const annotations = image.annotations ?? [];
    const fields = {
        identifier: joinSearchValues(
            image.id,
            Object.values(image.file_names ?? {}),
            metadata.Carton,
            metadata.document_id,
            metadata.Document,
            metadata.Identifiant,
            metadata.Cote
        ),
        title: joinSearchValues(metadata.Titre, metadata.Title),
        country: joinSearchValues(
            metadata.Pays,
            metadata["Pays / Région"],
            metadata["Pays / Region"],
            metadata.Continent,
            metadata["Sous-région"],
            metadata["Sous-region"]
        ),
        subject: joinSearchValues(
            metadata.Classe,
            metadata.ClusterLabel,
            metadata.Type,
            metadata.Conditionnement
        ),
        description: joinSearchValues(metadata.Commentaires, metadata.Description),
        ocr: joinSearchValues(annotations.map(annotation => annotation.text ?? ""))
    };
    fields.all = joinSearchValues(Object.values(metadata), Object.values(fields));
    image._searchFields = fields;
    image._searchCache = fields.all;
}

function parseSearchTerms(value) {
    const matches = String(value ?? "").match(/"[^"]+"|\S+/g) ?? [];
    return matches.map(term => normalizeSearchText(term.replace(/^"|"$/g, ""))).filter(Boolean);
}

function matchesAllTerms(haystack, terms) {
    return terms.every(term => haystack.includes(term));
}

// ─── Zoom / Pan helpers ───────────────────────────────────────────────────────

// The viewer box is never transformed, so its rect is a stable reference for
// the wrapper's transform origin (the wrapper fills it exactly).
function getViewerRect() {
    return wrapperEl.parentElement.getBoundingClientRect();
}

// Keep the zoomed image covering the viewer: no panning at "fit" scale, and
// never further than the extra size gained by zooming.
function clampPan() {
    const rect = getViewerRect();
    const maxX = Math.max(0, (rect.width * zoomScale - rect.width) / 2);
    const maxY = Math.max(0, (rect.height * zoomScale - rect.height) / 2);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
}

function applyTransform() {
    clampPan();
    wrapperEl.style.transformOrigin = "center center";
    wrapperEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
    // Polygons use vector-effect: non-scaling-stroke, which ignores the CSS
    // scale of the wrapper; compensate it so outlines stay ~2px on screen.
    gGroup.style.strokeWidth = `${2 / zoomScale}px`;
}

// Zoom to `newZoom` keeping the image point under (clientX, clientY) fixed.
function zoomAt(clientX, clientY, newZoom) {
    newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, newZoom));
    if (newZoom === zoomScale) return;

    const rect = getViewerRect();
    const ptrX = clientX - (rect.left + rect.width / 2);
    const ptrY = clientY - (rect.top + rect.height / 2);

    // imagePoint = (ptr - pan) / oldZoom ; newPan = ptr - imagePoint * newZoom
    const ix = (ptrX - panX) / zoomScale;
    const iy = (ptrY - panY) / zoomScale;
    panX = ptrX - ix * newZoom;
    panY = ptrY - iy * newZoom;

    zoomScale = newZoom;
    applyTransform();
}

function zoomBy(factor) {
    if (!interactionEnabled) return;
    const rect = getViewerRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, zoomScale * factor);
}

function resetView() {
    zoomScale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
}

function handleWheel(e) {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, zoomScale * Math.exp(-e.deltaY * 0.001));
}

function getPinchState() {
    const [a, b] = [...activePointers.values()];
    return {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
    };
}

function handlePointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    svgEl.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 1) {
        panStart = { x: e.clientX - panX, y: e.clientY - panY };
        svgEl.style.cursor = "grabbing";
    } else if (activePointers.size === 2) {
        panStart = null;
        pinchStart = { ...getPinchState(), zoom: zoomScale };
    }
}

function handlePointerMove(e) {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchStart && activePointers.size >= 2) {
        const pinch = getPinchState();
        zoomAt(pinch.x, pinch.y, pinchStart.zoom * pinch.distance / pinchStart.distance);
    } else if (panStart) {
        panX = e.clientX - panStart.x;
        panY = e.clientY - panStart.y;
        applyTransform();
    }
}

function handlePointerUp(e) {
    if (!activePointers.delete(e.pointerId)) return;
    if (activePointers.size < 2) pinchStart = null;
    if (activePointers.size === 1) {
        // Continue panning with the remaining finger.
        const [remaining] = activePointers.values();
        panStart = { x: remaining.x - panX, y: remaining.y - panY };
    } else if (activePointers.size === 0) {
        panStart = null;
        svgEl.style.cursor = interactionEnabled ? "grab" : "default";
    }
}

// Single set of listeners attached permanently to svgEl.
// We gate them with a flag instead of add/remove on every image load.
// Pointer capture keeps the drag alive when the pointer leaves the image.
let interactionEnabled = false;

svgEl.addEventListener("wheel", e => interactionEnabled && handleWheel(e), { passive: false });
svgEl.addEventListener("pointerdown", e => interactionEnabled && handlePointerDown(e));
svgEl.addEventListener("pointermove", handlePointerMove);
svgEl.addEventListener("pointerup", handlePointerUp);
svgEl.addEventListener("pointercancel", handlePointerUp);
window.addEventListener("resize", () => interactionEnabled && applyTransform());
document.addEventListener("fullscreenchange", () => interactionEnabled && applyTransform());

// ─── Carton list ──────────────────────────────────────────────────────────────

function renderCartonList() {
    cartonListEl.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const cartonTerms = parseSearchTerms(cartonSearchEl?.value);
    const cartons = getDatasetMode() === "stream"
        ? streamCartons.map(entry => ({
            name: entry.carton,
            count: entry.images,
            summary: [getMainFacetLabel(entry.countries), getMainFacetLabel(entry.classes)].filter(Boolean).join(" · "),
            searchText: [
                entry.carton,
                ...getFacetLabels(entry.countries),
                ...getFacetLabels(entry.classes)
            ].join(" ")
        }))
        : Object.keys(grouped).sort().map(carton => ({
            name: carton,
            count: grouped[carton].length,
            summary: [grouped[carton][0]?.metadata?.Pays, grouped[carton][0]?.metadata?.Classe].filter(Boolean).join(" · "),
            searchText: [
                carton,
                ...grouped[carton].flatMap(image => Object.values(image.metadata ?? {}))
            ].join(" ")
        }));
    const matchingCartons = cartonTerms.length
        ? cartons.filter(({ searchText }) => matchesAllTerms(normalizeSearchText(searchText), cartonTerms))
        : cartons;
    const visibleCartons = sortCartonEntries(matchingCartons, cartonSortEl?.value);

    if (visibleCartons.length === 0) {
        cartonListEl.innerHTML = `<p class="placeholder-text compact">${escapeHtml(t("explorer.noBox"))}</p>`;
        return;
    }

    for (const { name: carton, count, summary } of visibleCartons) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "carton-item" + (carton === currentCarton ? " active" : "");
        item.dataset.carton = carton;
        renderCartonItemContent(item, carton, count, summary);

        item.addEventListener("click", async () => {
            cartonListEl.querySelector(".active")?.classList.remove("active");
            item.classList.add("active");
            searchEl.value = "";
            currentCarton = carton;
            currentImageId = null;
            currentPage = 1;
            if (searchFieldEl) searchFieldEl.value = "all";
            if (metadataCountryEl) metadataCountryEl.value = "";
            if (metadataSubjectEl) metadataSubjectEl.value = "";
            if (filterHasOcrEl) filterHasOcrEl.checked = false;
            if (filterHasAnnotationsEl) filterHasAnnotationsEl.checked = false;
            if (filterHasVersoEl) filterHasVersoEl.checked = false;
            setGalleryControlsEnabled(true);
            showGalleryView();
            updateDownloadLink();
            if (getDatasetMode() === "stream") {
                item.disabled = true;
                item.classList.add("loading");
                if (metadataSearchStatusEl) metadataSearchStatusEl.textContent = t("explorer.loadingBox", { carton });
                try {
                    await loadStreamCarton(carton);
                } catch (error) {
                    if (metadataSearchStatusEl) metadataSearchStatusEl.textContent = t("explorer.boxError", { error: error.message });
                    return;
                } finally {
                    item.disabled = false;
                    item.classList.remove("loading");
                }
            }
            updateMetadataFilterOptions(grouped[carton] ?? []);
            renderGallery();
            if (getDatasetMode() !== "stream" && !detectionCountsLoaded[carton]) {
                await loadDetectionCounts(carton);
                if (currentCarton === carton && !document.body.classList.contains("explorer-document-mode")) renderGallery();
            }
        });

        fragment.appendChild(item);
    }
    cartonListEl.appendChild(fragment);
}

function sortCartonEntries(cartons, sortMode = "archive-asc") {
    const naturalCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
    const sorted = [...cartons];

    sorted.sort((left, right) => {
        if (sortMode === "archive-desc") return naturalCollator.compare(right.name, left.name);
        if (sortMode === "images-desc") return (right.count ?? 0) - (left.count ?? 0) || naturalCollator.compare(left.name, right.name);
        if (sortMode === "images-asc") return (left.count ?? 0) - (right.count ?? 0) || naturalCollator.compare(left.name, right.name);
        if (sortMode === "description-asc") return naturalCollator.compare(left.summary || left.name, right.summary || right.name);
        return naturalCollator.compare(left.name, right.name);
    });

    return sorted;
}

function getIndexFacetLabel(value) {
    const label = Array.isArray(value) ? value[0] : value;
    return String(label ?? "").replace(/\s+\d+$/, "").trim();
}

function getFacetLabels(facets) {
    return (facets ?? [])
        .map(getIndexFacetLabel)
        .filter(label => label && label !== PLACEHOLDER_CLASS && label !== PLACEHOLDER_COUNTRY);
}

function getMainFacetLabel(facets) {
    return getFacetLabels(facets)[0] ?? "";
}

function renderCartonItemContent(item, carton, count, summary) {
    item.replaceChildren();
    const heading = document.createElement("span");
    heading.className = "carton-item-heading";
    heading.textContent = carton;
    const total = document.createElement("span");
    total.className = "carton-item-count";
    total.textContent = t("explorer.imageCount", { count });
    item.append(heading, total);
    if (summary) {
        const description = document.createElement("span");
        description.className = "carton-item-summary";
        description.textContent = summary;
        item.appendChild(description);
    }
}

async function loadStreamCarton(carton) {
    if (loadedStreamCartons[carton]) return;
    const entry = streamCartonEntries[carton];
    if (!entry) return;

    const coco = await fetchJson(`${CONFIG.streamManifestBaseUrl ?? ""}${entry.manifest}`);
    const images = coco.images ?? [];
    const annotations = coco.annotations ?? [];

    const annotationsByImage = {};
    for (const annotation of annotations) {
        normalizeAnnotationRecord(annotation);
        (annotationsByImage[annotation.image_id] ??= []).push(annotation);
    }

    for (const image of images) {
        normalizeImageRecord(image);
        image.annotations = annotationsByImage[image.id] ?? [];
        prepareSearchIndex(image);
    }

    grouped[carton] = images;
    loadedStreamCartons[carton] = true;
    await loadDetectionCounts(carton);
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.json();
}

// Predictions are stored per carton under data/stream/predictions/. The same
// files serve the sample subset, whose images belong to streamed cartons.
function getCartonPredictions(carton) {
    if (!carton || carton === "Unknown") return Promise.resolve([]);
    cartonPredictionsCache[carton] ??= (async () => {
        const entry = streamCartonEntries[carton];
        const manifest = entry ? entry.predictions_manifest : `predictions/${carton}.json`;
        if (!manifest) return [];
        try {
            const payload = await fetchJson(`${CONFIG.streamManifestBaseUrl ?? ""}${manifest}`);
            return payload.predictions ?? [];
        } catch (error) {
            console.warn(`Unable to load predictions for ${carton}:`, error);
            return [];
        }
    })();
    return cartonPredictionsCache[carton];
}

async function loadDetectionCounts(carton) {
    if (detectionCountsLoaded[carton]) return;
    detectionCountsLoaded[carton] = true;
    const images = grouped[carton] ?? [];

    const imagesById = {};
    const imagesByFileName = {};
    for (const image of images) {
        image.detectedInstances = 0;
        image.detectedInstancesBySide = {};
        imagesById[image.id] = image;
        for (const [side, fileName] of Object.entries(image.file_names ?? {})) {
            imagesByFileName[fileName] = { image, side };
        }
    }

    for (const prediction of await getCartonPredictions(carton)) {
        const fileMatch = prediction.file_name ? imagesByFileName[prediction.file_name] : null;
        // Prefer file names: sample image ids differ from streamed ids.
        const image = fileMatch?.image ?? (getDatasetMode() === "stream" ? imagesById[prediction.image_id] : null);
        if (!image) continue;

        const side = prediction.side ?? prediction.source_face ?? fileMatch?.side ?? "unknown";
        image.detectedInstances = (image.detectedInstances ?? 0) + 1;
        image.detectedInstancesBySide ??= {};
        image.detectedInstancesBySide[side] = (image.detectedInstancesBySide[side] ?? 0) + 1;
    }
}

// Load every prediction source needed by an image. Never throws: predictions
// are an optional layer and must not prevent the image from being displayed.
async function loadPredictionsForImage(imageData) {
    const carton = getCartonFromImage(imageData);
    await Promise.all(Object.values(predictionSources).map(async source => {
        try {
            if (source.streamByCarton) await loadPredictionCarton(source, carton);
            else await loadPredictionSource(source);
        } catch (error) {
            console.warn(`Unable to load predictions from ${source.label}:`, error);
        }
    }));
}

function shouldUseSharedocs(imageData = null) {
    return Boolean(CONFIG.sharedocs?.enabled)
        && (getDatasetMode() === "stream" || imageData?.remote_source === "sharedocs");
}

function getImageUrl(fileName, imageData = null) {
    if (!fileName) return "";
    if (/^https?:\/\//i.test(fileName)) return fileName;
    if (shouldUseSharedocs(imageData)) {
        return getSharedocsUrl(fileName, "download");
    }
    return `${CONFIG.imageBaseUrl ?? "samples/images/"}${fileName}`;
}

function getThumbnailUrl(fileName, imageData = null) {
    if (!fileName) return "";
    if (shouldUseSharedocs(imageData)) {
        return getSharedocsUrl(fileName, "thumbnail");
    }
    if (CONFIG.thumbnailBaseUrl && !/^https?:\/\//i.test(fileName)) {
        return `${CONFIG.thumbnailBaseUrl}${fileName}`;
    }
    return getImageUrl(fileName, imageData);
}

function getSharedocsUrl(fileName, variant = "download") {
    const params = new URLSearchParams({
        id: CONFIG.sharedocs.publicId,
        path: fileName,
        mode: "grid"
    });
    params.set(variant === "thumbnail" ? "thumbnail" : "download", "1");
    return `${CONFIG.sharedocs.baseUrl}?${params.toString()}`;
}

function getDefaultFace(imageData) {
    if (imageData?.file_names?.recto) return "recto";
    if (imageData?.file_names?.verso) return "verso";
    return Object.keys(imageData?.file_names ?? {})[0] ?? "recto";
}

function getCartonFromImage(imageData) {
    return imageData?.metadata?.Carton ?? imageData?.carton ?? "Unknown";
}

function updateDownloadLink(imageData = currentImageData) {
    const carton = currentCarton ?? getCartonFromImage(imageData);
    if (!downloadCartonEl || !carton) return;
    if (carton === "Unknown") {
        downloadCartonEl.hidden = true;
        return;
    }
    downloadCartonEl.hidden = false;
    if (getDatasetMode() === "stream" && CONFIG.sharedocs?.enabled) {
        const params = new URLSearchParams({
            id: CONFIG.sharedocs.publicId,
            path: carton,
            mode: "grid"
        });
        downloadCartonEl.href = `${CONFIG.sharedocs.baseUrl}?${params.toString()}`;
        downloadCartonEl.textContent = t("explorer.openOnSharedocs", { carton });
    } else {
        downloadCartonEl.href = "#";
        downloadCartonEl.textContent = carton;
    }
}

// ─── Metadata search and gallery ─────────────────────────────────────────────

function getMetadataFacetValues(images, keys) {
    const values = new Set();
    for (const image of images) {
        for (const key of keys) {
            const rawValue = image.metadata?.[key];
            const items = Array.isArray(rawValue) ? rawValue : [rawValue];
            for (const item of items) {
                const value = String(item ?? "").trim();
                if (value) values.add(value);
            }
        }
    }
    return [...values].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function populateMetadataSelect(select, values, emptyLabel) {
    if (!select) return;
    const previousValue = select.value;
    select.replaceChildren();
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = emptyLabel;
    select.appendChild(emptyOption);
    for (const value of values) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    }
    if (values.includes(previousValue)) select.value = previousValue;
}

function updateMetadataFilterOptions(images) {
    populateMetadataSelect(
        metadataCountryEl,
        getMetadataFacetValues(images, ["Pays", "Pays / Région", "Pays / Region", "Continent", "Sous-région", "Sous-region"]),
        t("explorer.allPlaces")
    );
    populateMetadataSelect(
        metadataSubjectEl,
        getMetadataFacetValues(images, ["Classe", "ClusterLabel"]),
        t("explorer.allSubjects")
    );
    if (metadataSearchStatusEl) {
        metadataSearchStatusEl.textContent = t("explorer.imagesInBox", { count: images.length });
    }
}

function imageMatchesMetadataFilters(image) {
    const fields = image._searchFields ?? {};
    const terms = parseSearchTerms(searchEl.value);
    const selectedField = searchFieldEl?.value ?? "all";
    const fieldText = fields[selectedField] ?? fields.all ?? "";
    if (terms.length && !matchesAllTerms(fieldText, terms)) return false;

    const country = normalizeSearchText(metadataCountryEl?.value);
    if (country && !fields.country?.includes(country)) return false;

    const subject = normalizeSearchText(metadataSubjectEl?.value);
    if (subject && !fields.subject?.includes(subject)) return false;

    if (filterHasOcrEl?.checked && !fields.ocr) return false;
    if (filterHasAnnotationsEl?.checked && !(image.annotations?.length > 0)) return false;
    if (filterHasVersoEl?.checked && !image.file_names?.verso) return false;
    return true;
}

function getFilteredImages() {
    const source = currentCarton
        ? grouped[currentCarton]
        : getDatasetMode() === "stream"
            ? null
            : data;
    return source ? source.filter(imageMatchesMetadataFilters) : null;
}

function renderGallery() {
    galleryEl.innerHTML = "";
    paginationEl.innerHTML = "";

    const filtered = getFilteredImages();

    if (!filtered) {
        if (metadataSearchStatusEl) metadataSearchStatusEl.textContent = t("explorer.selectBoxHint");
        galleryEl.innerHTML = `<p class="placeholder-text">${escapeHtml(t("explorer.selectBoxGallery"))}</p>`;
        return;
    }
    if (filtered.length === 0) {
        if (metadataSearchStatusEl) metadataSearchStatusEl.textContent = t("explorer.noMatch");
        galleryEl.innerHTML = `<p class="placeholder-text">${escapeHtml(t("explorer.noResults"))}</p>`;
        return;
    }

    if (metadataSearchStatusEl) {
        const total = currentCarton ? (grouped[currentCarton]?.length ?? filtered.length) : data.length;
        metadataSearchStatusEl.textContent = t("explorer.resultsSummary", { count: filtered.length, total });
    }

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    currentPage = Math.min(currentPage, totalPages);   // guard stale page
    const start = (currentPage - 1) * PER_PAGE;
    const pageItems = filtered.slice(start, start + PER_PAGE);

    const galleryFrag = document.createDocumentFragment();
    for (const d of pageItems) {
        const defaultFace = getDefaultFace(d);
        const defaultFileName = d.file_names[defaultFace];
        const imgSrc = getThumbnailUrl(defaultFileName, d);

        const item = document.createElement("button");
        item.type = "button";
        item.className = "gallery-item" + (d.id === currentImageId ? " active" : "");
        const title = d.metadata?.Titre ?? d.metadata?.Title ?? d.metadata?.Classe ?? t("explorer.untitled");
        const country = d.metadata?.Pays ?? t("explorer.notSpecified");
        item.innerHTML = `
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(t("explorer.thumbnailAlt", { id: d.id }))}" loading="lazy" decoding="async"/>
            <div class="item-info">
                <b>${escapeHtml(title)}</b>
                <span class="gallery-card-id">ID ${escapeHtml(d.id)}</span>
                <span class="gallery-card-place">${escapeHtml(country)}</span>
                <span class="gallery-card-stats">
                    <span>${escapeHtml(t("explorer.annotationsCount", { count: d.annotations?.length ?? 0 }))}</span>
                    <span>${escapeHtml(t("explorer.detectionsCount", { count: d.detectedInstances ?? 0 }))}</span>
                </span>
            </div>`;
        const thumbnail = item.querySelector("img");
        const fullImageSrc = getImageUrl(defaultFileName, d);
        thumbnail.addEventListener("error", () => {
            if (thumbnail.src !== new URL(fullImageSrc, document.baseURI).href) thumbnail.src = fullImageSrc;
        }, { once: true });

        item.addEventListener("click", () => {
            galleryEl.querySelector(".gallery-item.active")?.classList.remove("active");
            item.classList.add("active");
            currentImageId = d.id;
            displayImageInVisualizer(d, defaultFace);
        });

        galleryFrag.appendChild(item);
    }
    galleryEl.appendChild(galleryFrag);

    renderPagination(totalPages, filtered.length, start, pageItems.length);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function goToPage(page, totalPages) {
    currentPage = Math.max(1, Math.min(page, totalPages));
    renderGallery();
}

function createPageButton(label, page, totalPages, options = {}) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.className = "page-btn";
    if (options.active) btn.classList.add("active");
    if (options.compact) btn.classList.add("compact");
    btn.disabled = options.disabled ?? false;
    btn.addEventListener("click", () => goToPage(page, totalPages));
    return btn;
}

function appendPageNumber(fragment, page, totalPages) {
    fragment.appendChild(createPageButton(String(page), page, totalPages, {
        active: page === currentPage,
        compact: true
    }));
}

function appendEllipsis(fragment) {
    const ellipsis = document.createElement("span");
    ellipsis.className = "pagination-ellipsis";
    ellipsis.textContent = "...";
    fragment.appendChild(ellipsis);
}

function getPaginationWindow(totalPages) {
    const pages = new Set([1, totalPages]);
    const radius = window.innerWidth < 700 ? 1 : 2;
    for (let page = currentPage - radius; page <= currentPage + radius; page++) {
        if (page > 1 && page < totalPages) pages.add(page);
    }
    return [...pages].sort((a, b) => a - b);
}

function renderPagination(totalPages, totalItems, start, pageItemCount) {
    paginationEl.innerHTML = "";
    if (totalPages <= 1) {
        const summary = document.createElement("div");
        summary.className = "pagination-summary";
        summary.textContent = t("explorer.imageCount", { count: totalItems });
        paginationEl.appendChild(summary);
        return;
    }

    const summary = document.createElement("div");
    summary.className = "pagination-summary";
    summary.textContent = t("explorer.page.range", { start: start + 1, end: start + pageItemCount, total: totalItems });

    const controls = document.createElement("div");
    controls.className = "pagination-controls";
    const fragment = document.createDocumentFragment();

    fragment.appendChild(createPageButton(t("explorer.page.first"), 1, totalPages, {
        disabled: currentPage === 1
    }));
    fragment.appendChild(createPageButton(t("explorer.page.prev"), currentPage - 1, totalPages, {
        disabled: currentPage === 1
    }));

    let previousPage = 0;
    for (const page of getPaginationWindow(totalPages)) {
        if (previousPage && page - previousPage > 1) appendEllipsis(fragment);
        appendPageNumber(fragment, page, totalPages);
        previousPage = page;
    }

    fragment.appendChild(createPageButton(t("explorer.page.next"), currentPage + 1, totalPages, {
        disabled: currentPage === totalPages
    }));
    fragment.appendChild(createPageButton(t("explorer.page.last"), totalPages, totalPages, {
        disabled: currentPage === totalPages
    }));

    controls.appendChild(fragment);
    paginationEl.appendChild(summary);
    paginationEl.appendChild(controls);
}

// ─── Visualizer ───────────────────────────────────────────────────────────────

async function openExplorerFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const selection = {
        imageId: params.get("image_id"),
        documentId: params.get("document_id"),
        face: params.get("face"),
        file: params.get("file")
    };

    if (!selection.imageId && !selection.documentId && !selection.file) return;

    const imageData = await findImageFromExplorerSelection(selection);
    if (!imageData) {
        galleryEl.innerHTML = `<p class="placeholder-text">${escapeHtml(t("explorer.mapImageNotFound"))}</p>`;
        return;
    }

    const carton = getCartonFromImage(imageData);
    if (carton && carton !== "Unknown") {
        currentCarton = carton;
        markActiveCarton(carton);
        setGalleryControlsEnabled(true);
        updateGalleryHeading();
        updateMetadataFilterOptions(grouped[carton] ?? []);
        await loadDetectionCounts(carton);
    }

    const filtered = getFilteredImages() ?? [];
    const index = filtered.findIndex((image) => image === imageData || image.id === imageData.id);
    if (index >= 0) {
        currentPage = Math.floor(index / PER_PAGE) + 1;
    }

    currentImageId = imageData.id;
    renderGallery();
    galleryEl.querySelector(".gallery-item.active")?.scrollIntoView({ block: "nearest" });
    await displayImageInVisualizer(imageData, getSelectionFace(imageData, selection));
}

async function findImageFromExplorerSelection(selection) {
    if (getDatasetMode() === "stream") {
        const carton = getCartonFromSelection(selection);
        if (!carton) return null;
        await loadStreamCarton(carton);
        currentCarton = carton;
        return findImageInList(grouped[carton] ?? [], selection);
    }

    return findImageInList(data, selection);
}

function getCartonFromSelection(selection) {
    if (selection.file) {
        const firstSegment = String(selection.file).split("/")[0];
        if (firstSegment) return firstSegment;
    }

    if (selection.documentId) {
        const parts = String(selection.documentId).split("_");
        if (parts.length > 2) {
            return `${parts[0]}__${parts.slice(1, -1).join("_")}`;
        }
    }

    return "";
}

function findImageInList(images, selection) {
    if (!Array.isArray(images)) return null;

    return images.find((image) => {
        if (selection.file && imageHasFile(image, selection.file)) return true;
        if (selection.documentId && imageMatchesDocumentId(image, selection.documentId)) return true;
        if (selection.imageId && String(image.id) === String(selection.imageId)) return true;
        return false;
    }) ?? null;
}

function imageHasFile(image, filePath) {
    const target = normalizeIdentifier(filePath);
    return Object.values(image?.file_names ?? {}).some((fileName) => normalizeIdentifier(fileName) === target);
}

function imageMatchesDocumentId(image, documentId) {
    const target = normalizeIdentifier(documentId);
    const values = [
        image?.id,
        image?.metadata?.document_id,
        image?.metadata?.Document,
        image?.metadata?.Identifiant,
        image?.metadata?.Cote,
        ...Object.values(image?.file_names ?? {})
    ];

    return values.some((value) => normalizeIdentifier(value).includes(target));
}

function getSelectionFace(imageData, selection) {
    if (selection.face && imageData?.file_names?.[selection.face]) return selection.face;

    if (selection.file) {
        const target = normalizeIdentifier(selection.file);
        const match = Object.entries(imageData?.file_names ?? {})
            .find(([, fileName]) => normalizeIdentifier(fileName) === target);
        if (match) return match[0];
    }

    return getDefaultFace(imageData);
}

function markActiveCarton(carton) {
    cartonListEl?.querySelectorAll(".carton-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.carton === carton);
    });
}

function normalizeIdentifier(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function setViewerState(state) {
    if (!viewerEmptyStateEl) return;
    viewerEmptyStateEl.classList.toggle("hidden", state === "ready");
    viewerEmptyStateEl.classList.toggle("is-loading", state === "loading");
    viewerEmptyStateEl.classList.toggle("is-error", state === "error");
    if (state === "loading") {
        viewerEmptyStateEl.innerHTML = `<span>${escapeHtml(t("explorer.loadingImage"))}</span>`;
    } else if (state === "error") {
        const detail = t(shouldUseSharedocs(currentImageData) ? "explorer.imageErrorSharedocs" : "explorer.imageErrorLocal");
        viewerEmptyStateEl.innerHTML = `<span>${escapeHtml(t("explorer.imageUnavailable"))}</span><small>${escapeHtml(detail)}</small>`;
    }
}

// Resolve with true once `imgEl` has loaded `url`, false if it failed.
function loadMainImage(url) {
    return new Promise(resolve => {
        const done = ok => {
            imgEl.removeEventListener("load", onLoad);
            imgEl.removeEventListener("error", onError);
            resolve(ok);
        };
        const onLoad = () => done(true);
        const onError = () => done(false);
        imgEl.addEventListener("load", onLoad);
        imgEl.addEventListener("error", onError);
        if (!url) {
            done(false);
            return;
        }
        imgEl.src = url;
        // Same URL as before (no new load event) or synchronously cached image.
        if (imgEl.complete) done(imgEl.naturalWidth > 0);
    });
}

async function displayImageInVisualizer(imageData, face) {
    const requestId = ++displayRequestId;
    const isStale = () => requestId !== displayRequestId;

    showDocumentView();
    currentImageData = imageData;
    currentFace = face;
    updateDownloadLink(imageData);

    // Disable interaction and reset the view while loading
    interactionEnabled = false;
    activePointers.clear();
    panStart = pinchStart = null;
    svgEl.style.cursor = "default";
    wrapperEl.style.transition = "none";
    zoomScale = 1; panX = 0; panY = 0;
    applyTransform();
    imgEl.style.visibility = "hidden";
    gGroup.replaceChildren();
    tooltip.style.display = "none";
    setViewerState("loading");

    imgEl.alt = t("explorer.imageAlt", { id: imageData.id, face: t(`explorer.face.${face}`) });
    renderFileHeader(imageData, face);
    renderMetadataPanel(imageData, face);

    // Image and predictions load in parallel; predictions never block the image.
    const predictionsReady = loadPredictionsForImage(imageData);
    const loaded = await loadMainImage(getImageUrl(imageData.file_names?.[face], imageData));
    if (isStale()) return;
    if (!loaded) {
        setViewerState("error");
        return;
    }

    const imageSize = { width: imgEl.naturalWidth, height: imgEl.naturalHeight };
    setupViewer();
    drawOverlays(imageData, face);
    renderMetadataPanel(imageData, face, imageSize);
    setViewerState("ready");

    await predictionsReady;
    if (isStale()) return;
    drawOverlays(imageData, face);
    renderMetadataPanel(imageData, face, imageSize);
}

function renderFileHeader(imageData, currentFace) {
    document.getElementById("visualizer-title").textContent = "";
    const details = document.getElementById("visualizer-details");
    details.replaceChildren();

    const fragment = document.createDocumentFragment();
    for (const face of ["recto", "verso"]) {
        const fileName = imageData.file_names?.[face];
        if (!fileName) continue;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "face-btn file-face-btn" + (face === currentFace ? " active" : "");
        btn.dataset.face = face;
        btn.textContent = `${face.toUpperCase()} - ${getBaseName(fileName)}`;
        btn.title = fileName;
        btn.addEventListener("click", () => displayImageInVisualizer(imageData, face));
        fragment.appendChild(btn);
    }
    details.appendChild(fragment);
}

function getBaseName(fileName) {
    return String(fileName ?? "").split("/").pop() || "N/A";
}

function renderMetadataPanel(imageData, face, imageSize = null) {
    const metadataContent = document.getElementById("metadata-content");
    const transcriptionContent = document.getElementById("transcription-content");
    const metadataFragment = document.createDocumentFragment();
    const transcriptionFragment = document.createDocumentFragment();

    appendTagSection(metadataFragment, t("explorer.dimensions", { face: t(`explorer.face.${face}`) }), getSizeTags(imageData.metadata ?? {}, imageSize));
    appendMetadataList(metadataFragment, getDublinCoreRows(imageData));

    const forbinAnnotationTexts = getTextItemsForFace(imageData.annotations ?? [], face)
        .filter(annotation => !isMonkeyOcrItem(annotation))
        .map(annotation => ({
            title: getAnnotationTitle(annotation),
            source: annotation.text_source ?? annotation.source ?? t("explorer.source.annotation"),
            text: annotation.text
        }));
    appendTextSection(transcriptionFragment, t("explorer.texts.annotations"), forbinAnnotationTexts);

    const textPredictionItems = getTextItemsForFace(imageData.annotations ?? [], face)
        .filter(isMonkeyOcrItem)
        .map(annotation => ({
            title: getTextPredictionTitle(annotation),
            source: t("explorer.source.textPrediction"),
            text: annotation.text
        }));
    appendTextSection(transcriptionFragment, t("explorer.texts.predictions"), textPredictionItems, "text-prediction");

    const predictionTexts = getPredictionsForFace(imageData, face)
        .filter(prediction => hasText(prediction.text))
        .map(prediction => ({
            title: getPredictionTitle(prediction),
            source: prediction.text_source ?? prediction.transcription_source ?? t("explorer.source.prediction"),
            text: prediction.text,
            matches: prediction.ocr_matches ?? []
        }));
    appendTextSection(transcriptionFragment, t("explorer.texts.stamps"), predictionTexts, "text-prediction");

    metadataContent.replaceChildren(metadataFragment);
    transcriptionContent.replaceChildren(transcriptionFragment);
}

function appendMetadataRow(dl, key, value) {
    const dt = document.createElement("dt");
    dt.textContent = formatMetadataLabel(key);
    const dd = document.createElement("dd");
    dd.className = "metadata-tags";
    for (const item of asMetadataTags(value)) {
        const tag = document.createElement("span");
        tag.className = "metadata-tag";
        tag.textContent = item;
        dd.appendChild(tag);
    }
    dl.appendChild(dt);
    dl.appendChild(dd);
}

function formatMetadataLabel(key) {
    // Dublin Core labels are translated; raw archival field names are shown as-is.
    const translationKey = `explorer.dc.${key}`;
    return I18N.has(translationKey) ? t(translationKey) : String(key).replace(/_/g, " ");
}

function appendMetadataList(fragment, rows) {
    const dl = document.createElement("dl");
    dl.className = "metadata-list";
    for (const [key, value] of rows) {
        appendMetadataRow(dl, key, value);
    }
    fragment.appendChild(dl);
}

function appendTagSection(fragment, title, tags) {
    if (!tags.length) return;
    const section = document.createElement("section");
    section.className = "metadata-tags-section";

    const heading = document.createElement("h4");
    heading.textContent = title;
    section.appendChild(heading);

    const tagList = document.createElement("div");
    tagList.className = "metadata-tags";
    for (const tag of dedupeValues(tags)) {
        const item = document.createElement("span");
        item.className = "metadata-tag";
        item.textContent = tag;
        tagList.appendChild(item);
    }
    section.appendChild(tagList);
    fragment.appendChild(section);
}

// The metadata sizes describe a single side (usually the verso), so the sizes
// are computed from the displayed file once it is loaded.
function getSizeTags(metadata, imageSize) {
    if (!imageSize?.width || !imageSize?.height) return [];
    const tags = [];
    const dpi = Number(metadata.dpi);
    appendSizeTag(tags, imageSize.width, imageSize.height, "px");
    if (dpi > 0) {
        appendSizeTag(tags, imageSize.width / dpi * 2.54, imageSize.height / dpi * 2.54, "cm");
        appendSizeTag(tags, imageSize.width / dpi, imageSize.height / dpi, "in");
        tags.push(`${formatMetadataValue(dpi)} dpi`);
    }
    return tags;
}

function appendSizeTag(tags, width, height, unit) {
    if (width == null || height == null) return;
    tags.push(`${formatMetadataValue(width)} x ${formatMetadataValue(height)} ${unit}`);
}

function getDublinCoreRows(imageData) {
    const metadata = imageData.metadata ?? {};
    const dc = new Map();

    addDcValue(dc, "identifier", imageData.id);
    addDcValue(dc, "identifier", metadata.Carton);
    addDcValue(dc, "title", metadata.Titre ?? metadata.Title);
    addDcValue(dc, "subject", metadata.Classe);
    addDcValue(dc, "description", metadata.Commentaires ?? metadata.Description);
    addDcValue(dc, "type", metadata.Type);
    addDcValue(dc, "type", metadata.Conditionnement);
    addDcValue(dc, "coverage", metadata.Pays);
    addDcValue(dc, "coverage", metadata["Pays / Region"] ?? metadata["Pays / Région"]);
    addDcValue(dc, "coverage", metadata.Continent);
    addDcValue(dc, "coverage", metadata["Sous-region"] ?? metadata["Sous-région"]);
    addDcValue(dc, "relation", metadata["Unique / Similaire"]);
    addDcValue(dc, "rights", metadata.Rights ?? metadata.License);
    addDcValue(dc, "date", metadata.Date ?? metadata.date);
    addDcValue(dc, "contributor", metadata.Contributor ?? metadata.contributor);

    const rows = [...dc.entries()];
    addRowIfPresent(rows, "Cluster", getClusterValue(metadata));
    for (const [key, value] of Object.entries(metadata)) {
        if (isKnownMetadataKey(key) || isSizeMetadataKey(key)) continue;
        addRowIfPresent(rows, key, value);
    }
    return rows;
}

function addDcValue(map, key, value) {
    if (!hasMetadataValue(value)) return;
    const normalized = formatMetadataValue(value);
    if (!normalized) return;
    const values = map.get(key) ?? [];
    if (!values.includes(normalized)) values.push(normalized);
    map.set(key, values);
}

function addRowIfPresent(rows, key, value) {
    if (!hasMetadataValue(value)) return;
    rows.push([key, asMetadataTags(value)]);
}

function getClusterValue(metadata) {
    if (!hasMetadataValue(metadata.ClusterLabel)) return metadata.Cluster;
    if (!hasMetadataValue(metadata.Cluster)) return metadata.ClusterLabel;
    return `${formatMetadataValue(metadata.Cluster)}: ${formatMetadataValue(metadata.ClusterLabel)}`;
}

function isKnownMetadataKey(key) {
    return new Set([
        "Carton", "Titre", "Title", "Classe", "Cluster", "ClusterLabel", "Commentaires", "Description",
        "Type", "Conditionnement", "Pays", "Pays / Region", "Pays / Région", "Pays / RÃ©gion",
        "Continent", "Sous-region", "Sous-région", "Sous-rÃ©gion", "Source", "Unique / Similaire",
        "Rights", "License", "Date", "date", "Contributor", "contributor"
    ]).has(key);
}

function isSizeMetadataKey(key) {
    return new Set(["dpi", "width_px", "height_px", "width_in", "height_in", "width_cm", "height_cm"]).has(key);
}

function asMetadataTags(value) {
    if (Array.isArray(value)) return dedupeValues(value.map(formatMetadataValue).filter(Boolean));
    if (value instanceof Set) return dedupeValues([...value].map(formatMetadataValue).filter(Boolean));
    const formatted = formatMetadataValue(value);
    return formatted ? [formatted] : [];
}

function dedupeValues(values) {
    return [...new Set(values.map(value => String(value ?? "").trim()).filter(Boolean))];
}

function hasMetadataValue(value) {
    return value != null && String(value).trim() !== "";
}

function formatMetadataValue(value) {
    if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
    if (Array.isArray(value)) return value.map(formatMetadataValue).filter(Boolean).join(", ");
    if (typeof value === "object" && value !== null) return JSON.stringify(value);
    return String(value ?? "").trim();
}

function appendTextSection(fragment, title, items, variant = "") {
    const section = document.createElement("section");
    section.className = `ocr-section ${variant}`.trim();

    const heading = document.createElement("h4");
    heading.textContent = t("explorer.texts.sectionCount", { title, count: items.length });
    section.appendChild(heading);

    if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "ocr-empty";
        empty.textContent = t("explorer.texts.empty");
        section.appendChild(empty);
        fragment.appendChild(section);
        return;
    }

    for (const item of items) {
        const article = document.createElement("article");
        article.className = "ocr-item";

        const itemHeader = document.createElement("div");
        itemHeader.className = "ocr-item-header";

        const itemTitle = document.createElement("strong");
        itemTitle.textContent = item.title;
        itemHeader.appendChild(itemTitle);

        if (item.source) {
            const source = document.createElement("span");
            source.textContent = item.source;
            itemHeader.appendChild(source);
        }

        const text = document.createElement("p");
        text.className = "ocr-text";
        text.textContent = normalizeText(item.text);

        article.appendChild(itemHeader);
        article.appendChild(text);

        if (item.matches?.length > 1) {
            const details = document.createElement("details");
            const summary = document.createElement("summary");
            summary.textContent = t("explorer.texts.ocrZones", { count: item.matches.length });
            details.appendChild(summary);
            for (const match of item.matches) {
                const matchText = document.createElement("p");
                matchText.className = "ocr-match";
                matchText.textContent = normalizeText(match.text);
                details.appendChild(matchText);
            }
            article.appendChild(details);
        }

        section.appendChild(article);
    }
    fragment.appendChild(section);
}

function getTextItemsForFace(items, face) {
    const faceLower = face.toLowerCase();
    return items.filter(item => {
        const itemFace = (item.side ?? item.source_face ?? "").toLowerCase();
        return itemFace === faceLower && hasText(item.text);
    });
}

function getPredictionsForFace(imageData, face, sources = Object.values(predictionSources)) {
    const faceLower = face.toLowerCase();
    const faceFileName = imageData.file_names?.[face];
    const predictions = [];
    for (const source of sources) {
        predictions.push(...(predictionsBySource[source.id]?.[imageData.id] ?? []));
        if (faceFileName) {
            predictions.push(...(predictionsBySource[source.id]?.[faceFileName] ?? []));
        }
    }
    return predictions.filter(prediction => {
        const predictionFace = (prediction.side ?? prediction.source_face ?? "").toLowerCase();
        return !predictionFace || predictionFace === faceLower;
    });
}

function getAnnotationTitle(annotation) {
    return annotation.text_type
        ?? annotation.category_name
        ?? t("explorer.annotationTitle");
}

function getTextPredictionTitle(annotation) {
    return annotation.text_type
        ?? annotation.category_name
        ?? t("explorer.monkeyTitle");
}

function getPredictionTitle(prediction) {
    const score = Number(prediction.score);
    return Number.isFinite(score)
        ? t("explorer.stampTitle", { score: score.toFixed(2) })
        : t("explorer.stampTitleNoScore");
}

function hasText(value) {
    return Boolean(String(value ?? "").trim());
}

function normalizeText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isMonkeyOcrItem(item) {
    return item.source === "monkeyocr"
        || item.text_source === "monkeyocr"
        || item.transcription_source === "monkeyocr";
}

// Start with a fit-to-container view. The image (object-fit: contain) and the
// SVG (viewBox + xMidYMid meet) both fill the wrapper at 100%, so they stay
// aligned whatever the container size (resize, full screen, side panels).
function setupViewer() {
    svgEl.setAttribute("viewBox", `0 0 ${imgEl.naturalWidth} ${imgEl.naturalHeight}`);
    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
    resetView();
    interactionEnabled = true;
    svgEl.style.cursor = "grab";
    wrapperEl.style.visibility = "visible";
    imgEl.style.visibility = "visible";
}

function drawOverlays(imageData, face) {
    // Manual annotations are always green; every prediction model has its own color.
    const faceLower = face.toLowerCase();
    const anns = (imageData.annotations ?? []).filter(
        a => (a.source_face ?? a.side ?? "").toLowerCase() === faceLower
    );

    const frag = document.createDocumentFragment();
    for (const ann of anns) {
        const isTextPrediction = isMonkeyOcrItem(ann);
        appendAnnotationPolygons(frag, ann, {
            stroke: isTextPrediction ? MONKEY_OCR_COLOR : MANUAL_ANNOTATION_COLOR,
            fill: hexToRgba(isTextPrediction ? MONKEY_OCR_COLOR : MANUAL_ANNOTATION_COLOR, 0.22),
            label: t(isTextPrediction ? "explorer.overlay.monkey" : "explorer.overlay.manual")
        });
    }

    for (const source of Object.values(predictionSources)) {
        if (!source.active) continue;
        for (const prediction of getPredictionsForFace(imageData, face, [source])) {
            const score = Number(prediction.score);
            appendAnnotationPolygons(frag, prediction, {
                stroke: source.color,
                fill: hexToRgba(source.color, 0.18),
                label: `${getSourceLabel(source)} — ${t("explorer.overlay.score", { score: (Number.isFinite(score) ? score : 0).toFixed(2) })}`
            });
        }
    }
    gGroup.replaceChildren(frag);
}

function formatOverlayLabel(prefix, item) {
    const parts = [prefix];
    if (Number.isFinite(Number(item.score)) && !String(prefix).includes(" — ")) {
        parts.push(t("explorer.overlay.score", { score: Number(item.score).toFixed(2) }));
    }
    parts.push(hasText(item.text) ? normalizeText(item.text) : t("explorer.overlay.noText"));
    return parts.join(" - ");
}

function appendAnnotationPolygons(fragment, annotation, style) {
    const segmentations = normalizeSegmentations(annotation.segmentation);
    for (const seg of segmentations) {
        if (!seg || seg.length < 4) continue;

        const pts = [];
        for (let i = 0; i < seg.length - 1; i += 2) {
            pts.push(`${seg[i]},${seg[i + 1]}`);
        }

        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", pts.join(" "));
        poly.setAttribute("tabindex", "0");
        poly.setAttribute("role", "img");
        poly.setAttribute("aria-label", formatOverlayLabel(style.label, annotation));
        // stroke-width is inherited from gGroup (see applyTransform).
        poly.style.cssText = `stroke:${style.stroke};stroke-width:inherit;fill:${style.fill};`;
        poly.dataset.text = formatOverlayLabel(style.label, annotation);
        poly.addEventListener("mouseenter", onPolygonEnter);
        poly.addEventListener("mouseleave", onPolygonLeave);
        fragment.appendChild(poly);
    }
}

function normalizeSegmentations(segmentation) {
    if (!Array.isArray(segmentation)) return [];
    if (typeof segmentation[0] === "number") return [segmentation];
    return segmentation;
}

function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const bigint = parseInt(value.length === 3 ? value.split("").map(c => c + c).join("") : value, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
}

function getSourceLabel(source) {
    const key = `prediction.${source.id}`;
    return I18N.has(key) ? t(key) : source.label;
}

function setupPredictionControls() {
    if (!predictionControlsEl) return;
    predictionControlsEl.innerHTML = "";
    predictionSources = {};

    const sources = CONFIG.predictionSources ?? [];
    predictionControlsEl.hidden = false;
    const title = document.createElement("span");
    title.className = "prediction-title";
    title.textContent = t("explorer.legend.title");
    predictionControlsEl.appendChild(title);

    appendOverlayLegendItem(t("explorer.legend.manual"), MANUAL_ANNOTATION_COLOR, "manual");
    appendOverlayLegendItem(t("explorer.legend.monkey"), MONKEY_OCR_COLOR, "prediction");

    const usedColors = new Set([MANUAL_ANNOTATION_COLOR.toLowerCase(), MONKEY_OCR_COLOR.toLowerCase()]);
    sources.forEach((source, index) => {
        const requestedColor = String(source.color || "").toLowerCase();
        const fallbackColor = PREDICTION_COLOR_PALETTE.find(color => !usedColors.has(color.toLowerCase()))
            || PREDICTION_COLOR_PALETTE[index % PREDICTION_COLOR_PALETTE.length];
        const color = requestedColor && !usedColors.has(requestedColor) ? source.color : fallbackColor;
        usedColors.add(color.toLowerCase());
        predictionSources[source.id] = { ...source, color, active: true };
        appendOverlayLegendItem(getSourceLabel(source), color, "prediction");
    });
}

function appendOverlayLegendItem(label, color, kind) {
    const item = document.createElement("span");
    item.className = "overlay-legend-item";
    item.dataset.overlayKind = kind;

    const swatch = document.createElement("span");
    swatch.className = "overlay-legend-swatch";
    swatch.style.setProperty("--layer-color", color);
    swatch.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = label;
    item.append(swatch, text);
    predictionControlsEl.appendChild(item);
}

async function loadPredictionSource(source) {
    if (predictionsBySource[source.id]) return;
    predictionsBySource[source.id] = {};
    predictionImageMapsBySource[source.id] = {};
    loadedPredictionCartonsBySource[source.id] = {};
    if (!source.url) return;

    if (source.imagesUrl) {
        const imagesPayload = await fetchJson(source.imagesUrl);
        const images = imagesPayload.images ?? [];
        for (const image of images) {
            if (image.id == null || !image.file_name) continue;
            predictionImageMapsBySource[source.id][image.id] = image.file_name;
        }
    }

    const predictions = await fetchJson(source.url);
    const items = Array.isArray(predictions) ? predictions : predictions.annotations ?? predictions.predictions ?? [];
    for (const item of items) {
        if (item.image_id == null) continue;
        const fileName = item.file_name ?? predictionImageMapsBySource[source.id][item.image_id];
        const key = source.matchBy === "file_name" && fileName ? fileName : item.image_id;
        (predictionsBySource[source.id][key] ??= []).push(item);
    }
}

async function loadPredictionCarton(source, carton) {
    if (!carton) return;
    predictionsBySource[source.id] ??= {};
    loadedPredictionCartonsBySource[source.id] ??= {};
    if (loadedPredictionCartonsBySource[source.id][carton]) return;

    const predictions = await getCartonPredictions(carton);
    if (loadedPredictionCartonsBySource[source.id][carton]) return;  // loaded concurrently
    for (const item of predictions) {
        const key = item.file_name ?? item.image_id;
        (predictionsBySource[source.id][key] ??= []).push(item);
    }
    loadedPredictionCartonsBySource[source.id][carton] = true;
}

// ─── Tooltip handlers (defined once, reused by all polygons) ─────────────────

function onPolygonEnter(e) {
    tooltip.textContent = e.currentTarget.dataset.text;
    tooltip.style.display = "block";
    positionTooltip(e);
    e.currentTarget.addEventListener("mousemove", positionTooltip);
}

function onPolygonLeave(e) {
    tooltip.style.display = "none";
    e.currentTarget.removeEventListener("mousemove", positionTooltip);
}

function positionTooltip(e) {
    const pad = 12;
    // The tooltip is position: fixed, so use viewport coordinates.
    let left = e.clientX + pad;
    let top = e.clientY + pad;
    const rect = tooltip.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - pad) left = e.clientX - rect.width - pad;
    if (top + rect.height > window.innerHeight - pad) top = e.clientY - rect.height - pad;
    tooltip.style.left = Math.max(pad, left) + "px";
    tooltip.style.top = Math.max(pad, top) + "px";
}

// ─── Search (debounced) ───────────────────────────────────────────────────────

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

const refreshMetadataResults = debounce(() => {
    currentPage = 1;
    renderGallery();
}, 180);

searchEl.addEventListener("input", refreshMetadataResults);

[searchFieldEl, metadataCountryEl, metadataSubjectEl, filterHasOcrEl, filterHasAnnotationsEl, filterHasVersoEl]
    .filter(Boolean)
    .forEach(element => element.addEventListener("change", () => {
        currentPage = 1;
        renderGallery();
    }));

clearMetadataFiltersEl?.addEventListener("click", () => {
    searchEl.value = "";
    if (searchFieldEl) searchFieldEl.value = "all";
    if (metadataCountryEl) metadataCountryEl.value = "";
    if (metadataSubjectEl) metadataSubjectEl.value = "";
    if (filterHasOcrEl) filterHasOcrEl.checked = false;
    if (filterHasAnnotationsEl) filterHasAnnotationsEl.checked = false;
    if (filterHasVersoEl) filterHasVersoEl.checked = false;
    currentPage = 1;
    renderGallery();
    searchEl.focus();
});

document.getElementById("back-to-gallery")?.addEventListener("click", () => {
    showGalleryView();
    galleryEl.querySelector(".gallery-item.active")?.focus({ preventScroll: true });
});

cartonSearchEl?.addEventListener("input", debounce(() => {
    renderCartonList();
}, 120));

cartonSortEl?.addEventListener("change", () => {
    renderCartonList();
    cartonListEl.querySelector(".carton-item.active")?.scrollIntoView({ block: "nearest" });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

// Re-render every string built in JavaScript when the language changes.
function refreshLanguage() {
    updateGalleryHeading();
    if (document.body.classList.contains("explorer-gallery-mode")) showGalleryView();
    setupPredictionControls();
    renderCartonList();
    if (currentCarton) updateMetadataFilterOptions(grouped[currentCarton] ?? []);
    if (currentCarton) renderGallery();
    else renderGalleryPlaceholder();
    updateDownloadLink();
    if (currentImageData) {
        const loaded = imgEl.complete && imgEl.naturalWidth > 0;
        const imageSize = loaded ? { width: imgEl.naturalWidth, height: imgEl.naturalHeight } : null;
        imgEl.alt = t("explorer.imageAlt", { id: currentImageData.id, face: t(`explorer.face.${currentFace}`) });
        renderFileHeader(currentImageData, currentFace);
        renderMetadataPanel(currentImageData, currentFace, imageSize);
        if (loaded) drawOverlays(currentImageData, currentFace);
        else if (!viewerEmptyStateEl?.classList.contains("hidden")) setViewerState(viewerEmptyStateEl.classList.contains("is-error") ? "error" : "loading");
    } else {
        renderEmptyDocumentState();
    }
}

function renderGalleryPlaceholder() {
    if (metadataSearchStatusEl) metadataSearchStatusEl.textContent = t("explorer.selectBoxHint");
    galleryEl.innerHTML = `<p class="placeholder-text">${escapeHtml(t("explorer.selectBoxGallery"))}</p>`;
    paginationEl.innerHTML = "";
}

function renderEmptyDocumentState() {
    document.getElementById("metadata-content").innerHTML = `<p class="empty-inline">${escapeHtml(t("explorer.noDocument"))}</p>`;
    document.getElementById("transcription-content").innerHTML = `<p class="empty-inline">${escapeHtml(t("explorer.textsPlaceholder"))}</p>`;
    if (viewerEmptyStateEl) {
        viewerEmptyStateEl.innerHTML = `<span>${escapeHtml(t("explorer.emptyViewer"))}</span><small>${escapeHtml(t("explorer.emptyViewerHint"))}</small>`;
    }
}

window.addEventListener("forbin:languagechange", refreshLanguage);

setGalleryControlsEnabled(false);
showGalleryView();
renderEmptyDocumentState();
renderGalleryPlaceholder();
loadData();
