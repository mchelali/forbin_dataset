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
const PER_PAGE = 10;
const CONFIG = window.FORBIN_CONFIG ?? {};

// ─── DOM refs (resolved once) ─────────────────────────────────────────────────

const imgEl = document.getElementById("main-img");
const svgEl = document.getElementById("main-svg");
const gGroup = document.getElementById("svg-g-group");
const tooltip = document.getElementById("tooltip");
const galleryEl = document.getElementById("gallery");
const paginationEl = document.getElementById("pagination");
const cartonListEl = document.getElementById("carton-list");
const cartonSearchEl = document.getElementById("carton-search");
const searchEl = document.getElementById("search");
const wrapperEl = document.getElementById("img-wrapper");
const predictionControlsEl = document.getElementById("prediction-controls");
const downloadCartonEl = document.getElementById("download-carton");
const modeNoteEl = document.getElementById("mode-note");
const sampleModeLinkEl = document.getElementById("sample-mode-link");
const streamModeLinkEl = document.getElementById("stream-mode-link");
const viewerEmptyStateEl = document.getElementById("viewer-empty-state");

// ─── Zoom / Pan state ─────────────────────────────────────────────────────────

let zoomScale = 1;
let panX = 0, panY = 0;
let isPanning = false;
let startPanX = 0, startPanY = 0;
let minZoom = 0.1;
const MAX_ZOOM = 5;

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
}

function getDatasetMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") ?? CONFIG.mode ?? "sample";
}

function setModeUI() {
    const mode = getDatasetMode();
    sampleModeLinkEl?.classList.toggle("active", mode !== "stream");
    streamModeLinkEl?.classList.toggle("active", mode === "stream");
    if (modeNoteEl) modeNoteEl.textContent = "";
}

async function loadSampleDataset() {
    const response = await fetch(CONFIG.datasetUrl ?? "samples/subset.json");
    const coco = await response.json();
    prepareCocoDataset(coco);
    document.getElementById("total-count").textContent = data.length;
}

async function loadStreamIndex() {
    const response = await fetch(CONFIG.streamIndexUrl);
    const index = await response.json();
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

function prepareCocoDataset(coco) {
    data = coco.images ?? [];
    const anns = coco.annotations ?? [];

    // Index annotations by image_id once
    annsByImage = {};
    for (const a of anns) {
        (annsByImage[a.image_id] ??= []).push(a);
    }

    // Attach annotations and build search cache
    for (const d of data) {
        d.annotations = annsByImage[d.id] ?? [];
        d._searchCache = buildSearchCache(d);   // pre-computed search string
    }

    // Group by carton
    grouped = {};
    for (const d of data) {
        const carton = d.metadata?.Carton ?? "Unknown";
        (grouped[carton] ??= []).push(d);
    }
}

/** Pre-compute a lower-case searchable string per image (called once on load). */
function buildSearchCache(d) {
    const metaParts = Object.values(d.metadata ?? {}).join(" ");
    const textParts = d.annotations.map(a => a.text ?? "").join(" ");
    return (metaParts + " " + textParts).toLowerCase();
}

// ─── Zoom / Pan helpers ───────────────────────────────────────────────────────

function applyTransform() {
    wrapperEl.style.transformOrigin = "center center";
    wrapperEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;

    const strokeW = (2 / zoomScale) + "px";
    for (const poly of gGroup.querySelectorAll("polygon")) {
        poly.style.strokeWidth = strokeW;
    }
}

function handleWheel(e) {
    e.preventDefault();

    const delta = e.deltaY * -0.001;
    const newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, zoomScale + delta * zoomScale));
    if (newZoom === zoomScale) return;

    // With transformOrigin "center center" the wrapper's natural anchor is the
    // container center. We express the pointer offset FROM that center so the
    // math is consistent with how CSS applies the transform.
    const rect = svgEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Pointer relative to container center
    const ptrX = e.clientX - centerX;
    const ptrY = e.clientY - centerY;

    // The image-space point under the pointer must stay fixed:
    //   imagePoint = (ptr - pan) / oldZoom
    //   newPan = ptr - imagePoint * newZoom
    const ix = (ptrX - panX) / zoomScale;
    const iy = (ptrY - panY) / zoomScale;
    panX = ptrX - ix * newZoom;
    panY = ptrY - iy * newZoom;

    zoomScale = newZoom;
    applyTransform();
}

function handleMouseDown(e) {
    if (e.button !== 0) return;
    isPanning = true;
    svgEl.style.cursor = "grabbing";
    startPanX = e.clientX - panX;
    startPanY = e.clientY - panY;
}

function handleMouseMove(e) {
    if (!isPanning) return;
    panX = e.clientX - startPanX;
    panY = e.clientY - startPanY;
    applyTransform();
}

function handleMouseUp() {
    isPanning = false;
    svgEl.style.cursor = "grab";
}

// Single set of listeners attached permanently to svgEl.
// We gate them with a flag instead of add/remove on every image load.
let interactionEnabled = false;

svgEl.addEventListener("wheel", e => interactionEnabled && handleWheel(e), { passive: false });
svgEl.addEventListener("mousedown", e => interactionEnabled && handleMouseDown(e));
svgEl.addEventListener("mousemove", e => interactionEnabled && handleMouseMove(e));
svgEl.addEventListener("mouseup", () => interactionEnabled && handleMouseUp());

// ─── Carton list ──────────────────────────────────────────────────────────────

function renderCartonList() {
    cartonListEl.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const cartonTerm = cartonSearchEl?.value.toLowerCase().trim() ?? "";
    const cartons = getDatasetMode() === "stream"
        ? streamCartons.map(entry => ({
            name: entry.carton,
            count: entry.images,
            searchText: [
                entry.carton,
                ...(entry.countries ?? []).map(([label]) => label),
                ...(entry.classes ?? []).map(([label]) => label)
            ].join(" ").toLowerCase()
        }))
        : Object.keys(grouped).sort().map(carton => ({
            name: carton,
            count: grouped[carton].length,
            searchText: carton.toLowerCase()
        }));
    const visibleCartons = cartonTerm
        ? cartons.filter(({ searchText }) => searchText.includes(cartonTerm))
        : cartons;

    if (visibleCartons.length === 0) {
        cartonListEl.innerHTML = `<p class="placeholder-text compact">No boxes found.</p>`;
        return;
    }

    for (const { name: carton, count } of visibleCartons) {
        const item = document.createElement("div");
        item.className = "carton-item" + (carton === currentCarton ? " active" : "");
        item.textContent = `${carton} (${count})`;

        item.addEventListener("click", async () => {
            cartonListEl.querySelector(".active")?.classList.remove("active");
            item.classList.add("active");
            searchEl.value = "";
            currentCarton = carton;
            currentPage = 1;
            updateDownloadLink();
            if (getDatasetMode() === "stream") {
                item.textContent = `${carton} — chargement…`;
                await loadStreamCarton(carton);
                item.textContent = `${carton} (${count})`;
            }
            renderGallery();
        });

        fragment.appendChild(item);
    }
    cartonListEl.appendChild(fragment);
}

async function loadStreamCarton(carton) {
    if (loadedStreamCartons[carton]) return;
    const entry = streamCartonEntries[carton];
    if (!entry) return;

    const manifestUrl = `${CONFIG.streamManifestBaseUrl ?? ""}${entry.manifest}`;
    const response = await fetch(manifestUrl);
    const coco = await response.json();
    const images = coco.images ?? [];
    const annotations = coco.annotations ?? [];

    const annotationsByImage = {};
    for (const annotation of annotations) {
        (annotationsByImage[annotation.image_id] ??= []).push(annotation);
    }

    for (const image of images) {
        image.annotations = annotationsByImage[image.id] ?? [];
        image.detectedInstances = 0;
        image.detectedInstancesBySide = {};
        image._searchCache = buildSearchCache(image);
    }

    await loadStreamDetectionCounts(carton, images);
    grouped[carton] = images;
    loadedStreamCartons[carton] = true;
}

async function loadStreamDetectionCounts(carton, images) {
    const entry = streamCartonEntries[carton];
    const manifest = entry?.predictions_manifest;
    if (!manifest) return;

    const imagesById = {};
    const imagesByFileName = {};
    for (const image of images) {
        imagesById[image.id] = image;
        for (const [side, fileName] of Object.entries(image.file_names ?? {})) {
            imagesByFileName[fileName] = { image, side };
        }
    }

    let payload;
    try {
        const response = await fetch(`${CONFIG.streamManifestBaseUrl ?? ""}${manifest}`);
        payload = await response.json();
    } catch (error) {
        console.warn(`Unable to load detection counts for ${carton}:`, error);
        return;
    }
    for (const prediction of payload.predictions ?? []) {
        const fileMatch = prediction.file_name ? imagesByFileName[prediction.file_name] : null;
        const image = imagesById[prediction.image_id] ?? fileMatch?.image;
        if (!image) continue;

        const side = prediction.side ?? prediction.source_face ?? fileMatch?.side ?? "unknown";
        image.detectedInstances = (image.detectedInstances ?? 0) + 1;
        image.detectedInstancesBySide ??= {};
        image.detectedInstancesBySide[side] = (image.detectedInstancesBySide[side] ?? 0) + 1;
    }
}

async function loadActiveStreamPredictions(imageData = currentImageData) {
    if (getDatasetMode() !== "stream" || !imageData) return;
    const activeSources = Object.values(predictionSources).filter(source => source.active);
    for (const source of activeSources) {
        if (!source.streamByCarton) continue;
        await loadPredictionCarton(source, getCartonFromImage(imageData));
    }
}

async function loadStreamPredictionTexts(imageData = currentImageData) {
    if (getDatasetMode() !== "stream" || !imageData) return;
    const sources = Object.values(predictionSources).filter(source => source.streamByCarton);
    for (const source of sources) {
        await loadPredictionCarton(source, getCartonFromImage(imageData));
    }
}

async function loadAutomaticPredictionSources() {
    const sources = Object.values(predictionSources).filter(source => source.active && !source.streamByCarton);
    for (const source of sources) {
        await loadPredictionSource(source);
    }
}

function getActiveImageBaseUrl() {
    const mode = getDatasetMode();
    return mode === "full" ? CONFIG.fullDataset?.imageBaseUrl : CONFIG.imageBaseUrl;
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
    return `${getActiveImageBaseUrl() ?? "samples/images/"}${fileName}`;
}

function getThumbnailUrl(fileName, imageData = null) {
    if (!fileName) return "";
    if (shouldUseSharedocs(imageData)) {
        return getSharedocsUrl(fileName, "thumbnail");
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
        downloadCartonEl.textContent = `Open ${carton} on Sharedocs`;
    } else {
        downloadCartonEl.href = "#";
        downloadCartonEl.textContent = carton;
    }
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function getFilteredImages() {
    const term = searchEl.value.toLowerCase().trim();
    if (term === "") {
        return currentCarton ? grouped[currentCarton] : null;
    }
    if (getDatasetMode() === "stream") {
        return currentCarton ? (grouped[currentCarton] ?? []).filter(d => d._searchCache.includes(term)) : null;
    }
    return data.filter(d => d._searchCache.includes(term));
}

function renderGallery() {
    galleryEl.innerHTML = "";
    paginationEl.innerHTML = "";

    const filtered = getFilteredImages();

    if (!filtered) {
        galleryEl.innerHTML = `<p class="placeholder-text">Select a box or search for an image.</p>`;
        return;
    }
    if (filtered.length === 0) {
        galleryEl.innerHTML = `<p class="placeholder-text">No result found for your search.</p>`;
        return;
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

        const item = document.createElement("div");
        item.className = "gallery-item" + (d.id === currentImageId ? " active" : "");
        item.innerHTML = `
            <img src="${imgSrc}" alt="Thumbnail" loading="lazy"/>
            <div class="item-info">
                <b>ID: ${d.id}</b>
                <span>Country: ${d.metadata.Pays ?? "N/A"}</span><br>
                <span>Annotations: ${d.annotations.length}</span><br>
                <span>Detected instances: ${d.detectedInstances ?? 0}</span>
            </div>`;

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
        summary.textContent = `${totalItems} image${totalItems > 1 ? "s" : ""}`;
        paginationEl.appendChild(summary);
        return;
    }

    const summary = document.createElement("div");
    summary.className = "pagination-summary";
    summary.textContent = `${start + 1}-${start + pageItemCount} of ${totalItems} images`;

    const controls = document.createElement("div");
    controls.className = "pagination-controls";
    const fragment = document.createDocumentFragment();

    fragment.appendChild(createPageButton("First", 1, totalPages, {
        disabled: currentPage === 1
    }));
    fragment.appendChild(createPageButton("Prev", currentPage - 1, totalPages, {
        disabled: currentPage === 1
    }));

    let previousPage = 0;
    for (const page of getPaginationWindow(totalPages)) {
        if (previousPage && page - previousPage > 1) appendEllipsis(fragment);
        appendPageNumber(fragment, page, totalPages);
        previousPage = page;
    }

    fragment.appendChild(createPageButton("Next", currentPage + 1, totalPages, {
        disabled: currentPage === totalPages
    }));
    fragment.appendChild(createPageButton("Last", totalPages, totalPages, {
        disabled: currentPage === totalPages
    }));

    controls.appendChild(fragment);
    paginationEl.appendChild(summary);
    paginationEl.appendChild(controls);
}

// ─── Visualizer ───────────────────────────────────────────────────────────────

async function displayImageInVisualizer(imageData, face) {
    currentImageData = imageData;
    currentFace = face;
    viewerEmptyStateEl?.classList.add("hidden");
    updateDownloadLink(imageData);
    // Disable interaction while loading
    interactionEnabled = false;
    svgEl.style.cursor = "default";

    // Reset transform and prevent any transition during image loading
    zoomScale = 1; panX = 0; panY = 0;
    wrapperEl.style.transition = "none";
    wrapperEl.style.transform = `translate(0px, 0px) scale(1)`;
    imgEl.style.visibility = "hidden";

    gGroup.innerHTML = "";
    imgEl.onload = null;

    imgEl.alt = getDatasetMode() === "stream" ? "Image loaded from Huma-Num Sharedocs" : "Forbin image";
    try {
        imgEl.src = getImageUrl(imageData.file_names[face], imageData);
        await loadAutomaticPredictionSources();
        await loadActiveStreamPredictions(imageData);
        await loadStreamPredictionTexts(imageData);
    } catch (error) {
        document.getElementById("visualizer-details").innerHTML =
            `<b>Loading error</b>: ${error.message}`;
        return;
    }
    renderFileHeader(imageData, face);

    renderMetadataPanel(imageData, face);

    // Setup SVG once the image has loaded
    imgEl.onload = () => requestAnimationFrame(() => setupSVG(imageData, face));
    if (imgEl.complete && imgEl.naturalWidth !== 0) {
        requestAnimationFrame(() => setupSVG(imageData, face));
    }
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

function renderMetadataPanel(imageData, face) {
    const metadataContent = document.getElementById("metadata-content");
    const transcriptionContent = document.getElementById("transcription-content");
    const metadataFragment = document.createDocumentFragment();
    const transcriptionFragment = document.createDocumentFragment();

    appendTagSection(metadataFragment, "Size", getSizeTags(imageData.metadata ?? {}));
    appendMetadataList(metadataFragment, getDublinCoreRows(imageData));

    const forbinAnnotationTexts = getTextItemsForFace(imageData.annotations ?? [], face)
        .filter(annotation => !isMonkeyOcrItem(annotation))
        .map(annotation => ({
            title: getAnnotationTitle(annotation),
            source: annotation.text_source ?? annotation.source ?? "annotation",
            text: annotation.text
        }));
    appendTextSection(transcriptionFragment, "Annotations", forbinAnnotationTexts);

    const textPredictionItems = getTextItemsForFace(imageData.annotations ?? [], face)
        .filter(isMonkeyOcrItem)
        .map(annotation => ({
            title: getTextPredictionTitle(annotation),
            source: "text prediction",
            text: annotation.text
        }));
    appendTextSection(transcriptionFragment, "Text predictions", textPredictionItems, "text-prediction");

    const predictionTexts = getPredictionsForFace(imageData, face)
        .filter(prediction => hasText(prediction.text))
        .map(prediction => ({
            title: getPredictionTitle(prediction),
            source: prediction.text_source ?? prediction.transcription_source ?? "prediction",
            text: prediction.text,
            matches: prediction.ocr_matches ?? []
        }));
    appendTextSection(transcriptionFragment, "Predicted stamps with text predictions", predictionTexts, "text-prediction");

    metadataContent.replaceChildren(metadataFragment);
    transcriptionContent.replaceChildren(transcriptionFragment);
}

function appendMetadataRow(dl, key, value) {
    const dt = document.createElement("dt");
    dt.textContent = key;
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

function getSizeTags(metadata) {
    const tags = [];
    appendSizeTag(tags, metadata.width_px, metadata.height_px, "px");
    appendSizeTag(tags, metadata.width_cm, metadata.height_cm, "cm");
    appendSizeTag(tags, metadata.width_in, metadata.height_in, "in");
    if (metadata.dpi) tags.push(`${formatMetadataValue(metadata.dpi)} dpi`);
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
    heading.textContent = `${title} (${items.length})`;
    section.appendChild(heading);

    if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "ocr-empty";
        empty.textContent = "No text for this side.";
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
            summary.textContent = `${item.matches.length} OCR zones`;
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

function getPredictionsForFace(imageData, face) {
    const faceLower = face.toLowerCase();
    const faceFileName = imageData.file_names?.[face];
    const predictions = [];
    for (const source of Object.values(predictionSources)) {
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
        ?? "Annotation";
}

function getTextPredictionTitle(annotation) {
    return annotation.text_type
        ?? annotation.category_name
        ?? "MonkeyOCR text prediction";
}

function getPredictionTitle(prediction) {
    const score = Number(prediction.score);
    const scoreText = Number.isFinite(score) ? `score ${score.toFixed(2)}` : "prediction";
    return `Stamp ${scoreText}`;
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

function setupSVG(imageData, face) {
    gGroup.innerHTML = "";

    const natW = imgEl.naturalWidth;
    const natH = imgEl.naturalHeight;
    const containerW = wrapperEl.clientWidth;
    const containerH = wrapperEl.clientHeight;

    // Start with a fit-to-container view. The image and overlay already fill the
    // wrapper, so the initial scale should be 1 to avoid an undesired zoom-out.
    zoomScale = 1;
    minZoom = 1;
    panX = 0;
    panY = 0;

    svgEl.setAttribute("viewBox", `0 0 ${natW} ${natH}`);
    svgEl.style.width = containerW + "px";
    svgEl.style.height = containerH + "px";

    applyTransform();

    // Draw annotations and selected model predictions for this face
    const faceLower = face.toLowerCase();
    const anns = (imageData.annotations ?? []).filter(
        a => (a.source_face ?? "").toLowerCase() === faceLower
    );

    const frag = document.createDocumentFragment();
    for (const ann of anns) {
        const isTextPrediction = isMonkeyOcrItem(ann);
        appendAnnotationPolygons(frag, ann, {
            stroke: isTextPrediction ? "#c83f3f" : "#d1a25c",
            fill: isTextPrediction ? "rgba(200,63,63,0.20)" : "rgba(209,162,92,0.25)",
            label: isTextPrediction ? "MonkeyOCR text prediction" : "Annotation"
        });
    }

    for (const source of Object.values(predictionSources)) {
        if (!source.active) continue;
        const predictions = predictionsBySource[source.id]?.[imageData.id] ?? [];
        const faceFileName = imageData.file_names?.[face];
        const filePredictions = faceFileName ? predictionsBySource[source.id]?.[faceFileName] ?? [] : [];
        const allPredictions = predictions.concat(filePredictions);
        for (const prediction of allPredictions) {
            appendAnnotationPolygons(frag, prediction, {
                stroke: source.color,
                fill: hexToRgba(source.color, 0.18),
                label: `${source.label} — score ${(prediction.score ?? 0).toFixed(2)}`
            });
        }
    }
    gGroup.appendChild(frag);
    applyTransform();  // sync stroke widths

    interactionEnabled = true;
    svgEl.style.cursor = "grab";
    wrapperEl.style.visibility = "visible";
    imgEl.style.visibility = "visible";
}

function formatOverlayLabel(prefix, item) {
    const parts = [prefix];
    if (Number.isFinite(Number(item.score)) && !String(prefix).toLowerCase().includes("score")) {
        parts.push(`score ${Number(item.score).toFixed(2)}`);
    }
    parts.push(hasText(item.text) ? normalizeText(item.text) : "No transcription");
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
        poly.style.cssText = `stroke:${style.stroke};stroke-width:2px;fill:${style.fill};`;
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

function setupPredictionControls() {
    if (!predictionControlsEl) return;
    predictionControlsEl.innerHTML = "";
    predictionSources = {};

    const sources = CONFIG.predictionSources ?? [];
    for (const source of sources) {
        predictionSources[source.id] = { ...source, active: true };
    }
    predictionControlsEl.hidden = true;
    return;

    if (!sources.length) {
        predictionControlsEl.hidden = true;
        return;
    }

    predictionControlsEl.hidden = false;
    const title = document.createElement("span");
    title.className = "prediction-title";
    title.textContent = "Calques modèles";
    predictionControlsEl.appendChild(title);

    for (const source of sources) {
        predictionSources[source.id] = { ...source, active: Boolean(source.enabledByDefault) };
        const label = document.createElement("label");
        label.className = "prediction-toggle";
        label.innerHTML = `
            <input type="checkbox" ${source.enabledByDefault ? "checked" : ""}>
            <span style="--layer-color:${source.color}">${source.label}</span>
        `;
        const checkbox = label.querySelector("input");
        checkbox.addEventListener("change", async () => {
            predictionSources[source.id].active = checkbox.checked;
            if (checkbox.checked) {
                await loadPredictionSource(source);
                await loadActiveStreamPredictions();
            }
            if (currentImageData) {
                renderMetadataPanel(currentImageData, currentFace);
                setupSVG(currentImageData, currentFace);
            }
        });
        predictionControlsEl.appendChild(label);
    }
}

async function loadPredictionSource(source) {
    if (predictionsBySource[source.id]) return;
    predictionsBySource[source.id] = {};
    predictionImageMapsBySource[source.id] = {};
    loadedPredictionCartonsBySource[source.id] = {};
    if (!source.url) return;

    if (source.streamByCarton && getDatasetMode() === "stream") return;

    if (source.imagesUrl) {
        const imagesResponse = await fetch(source.imagesUrl);
        const imagesPayload = await imagesResponse.json();
        const images = imagesPayload.images ?? [];
        for (const image of images) {
            if (image.id == null || !image.file_name) continue;
            predictionImageMapsBySource[source.id][image.id] = image.file_name;
        }
    }

    const response = await fetch(source.url);
    const predictions = await response.json();
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

    const entry = streamCartonEntries[carton];
    const manifest = entry?.predictions_manifest;
    if (!manifest) {
        loadedPredictionCartonsBySource[source.id][carton] = true;
        return;
    }

    const response = await fetch(`${CONFIG.streamManifestBaseUrl ?? ""}${manifest}`);
    const payload = await response.json();
    for (const item of payload.predictions ?? []) {
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
    let left = e.pageX + pad;
    let top = e.pageY + pad;
    const rect = tooltip.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - pad) left = e.pageX - rect.width - pad;
    if (top + rect.height > window.innerHeight - pad) top = e.pageY - rect.height - pad;
    tooltip.style.left = Math.max(pad, left) + "px";
    tooltip.style.top = Math.max(pad, top) + "px";
}

// ─── Search (debounced) ───────────────────────────────────────────────────────

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

searchEl.addEventListener("input", debounce(() => {
    currentPage = 1;
    renderGallery();
}, 200));

cartonSearchEl?.addEventListener("input", debounce(() => {
    renderCartonList();
}, 120));

// ─── Init ─────────────────────────────────────────────────────────────────────

loadData();
