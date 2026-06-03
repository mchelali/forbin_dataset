// ─── State ────────────────────────────────────────────────────────────────────

let data = [];
let grouped = {};
let annsByImage = {};
let predictionSources = {};
let predictionsBySource = {};
let predictionImageMapsBySource = {};
let loadedPredictionCartonsBySource = {};
let tarIndexCache = {};
let objectUrls = [];
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
const searchEl = document.getElementById("search");
const wrapperEl = document.getElementById("img-wrapper");
const predictionControlsEl = document.getElementById("prediction-controls");
const downloadCartonEl = document.getElementById("download-carton");
const modeNoteEl = document.getElementById("mode-note");
const sampleModeLinkEl = document.getElementById("sample-mode-link");
const streamModeLinkEl = document.getElementById("stream-mode-link");

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
    if (!modeNoteEl) return;
    modeNoteEl.textContent = mode === "stream"
        ? "Full mode: images are extracted on demand from Hugging Face tar archives."
        : "Subset mode: fast browsing of the images included in GitHub.";
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
    const cartons = getDatasetMode() === "stream"
        ? streamCartons.map(entry => ({ name: entry.carton, count: entry.images }))
        : Object.keys(grouped).sort().map(carton => ({ name: carton, count: grouped[carton].length }));

    for (const { name: carton, count } of cartons) {
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
                item.textContent = `${carton} - loading...`;
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
        image._searchCache = buildSearchCache(image);
    }

    grouped[carton] = images;
    loadedStreamCartons[carton] = true;
}

async function loadActiveStreamPredictions(imageData = currentImageData) {
    if (getDatasetMode() !== "stream" || !imageData) return;
    const activeSources = Object.values(predictionSources).filter(source => source.active);
    for (const source of activeSources) {
        if (!source.streamByCarton) continue;
        await loadPredictionCarton(source, getCartonFromImage(imageData));
    }
}

function getActiveImageBaseUrl() {
    const mode = getDatasetMode();
    return mode === "full" ? CONFIG.fullDataset?.imageBaseUrl : CONFIG.imageBaseUrl;
}

function getImageUrl(fileName) {
    if (!fileName) return "";
    if (/^https?:\/\//i.test(fileName)) return fileName;
    return `${getActiveImageBaseUrl() ?? "samples/images/"}${fileName}`;
}

function getDefaultFace(imageData) {
    if (imageData?.file_names?.recto) return "recto";
    if (imageData?.file_names?.verso) return "verso";
    return Object.keys(imageData?.file_names ?? {})[0] ?? "recto";
}

function getTarNameForFile(fileName, imageData) {
    if (imageData?.remote_tar) return imageData.remote_tar;
    const carton = fileName?.split("/")?.[0];
    return carton ? `${carton}.tar` : null;
}

async function resolveImageSrc(fileName, imageData) {
    const directUrl = getImageUrl(fileName);
    if (!imageData?.remote_tar || !CONFIG.tarImageFallback?.enabled) return directUrl;

    const tarName = getTarNameForFile(fileName, imageData);
    if (!tarName) return directUrl;

    const blob = await extractFileFromTar(tarName, fileName);
    const objectUrl = URL.createObjectURL(blob);
    objectUrls.push(objectUrl);
    return objectUrl;
}

async function extractFileFromTar(tarName, fileName) {
    const entry = await findTarEntry(tarName, fileName);
    const bytes = await fetchTarRange(tarName, entry.start, entry.start + entry.size - 1);
    return new Blob([bytes], { type: getMimeType(fileName) });
}

async function findTarEntry(tarName, fileName) {
    const index = tarIndexCache[tarName] ??= {
        entries: {},
        scannedOffset: 0,
        done: false,
        lock: Promise.resolve()
    };

    const cachedEntry = findCachedTarEntry(index, fileName);
    if (cachedEntry) return cachedEntry;

    index.lock = index.lock.then(() => scanTarUntil(tarName, fileName, index));
    return index.lock;
}

function findCachedTarEntry(index, fileName) {
    return index.entries[fileName] ?? Object.entries(index.entries)
        .find(([entryName]) => entryName.endsWith(`/${fileName}`))?.[1];
}

async function scanTarUntil(tarName, fileName, index) {
    const alreadyCached = findCachedTarEntry(index, fileName);
    if (alreadyCached) return alreadyCached;

    while (!index.done) {
        const header = await fetchTarRange(tarName, index.scannedOffset, index.scannedOffset + 511);
        const name = readTarString(header, 0, 100);
        const prefix = readTarString(header, 345, 155);
        const fullName = prefix ? `${prefix}/${name}` : name;
        if (!name) {
            index.done = true;
            break;
        }

        const sizeOctal = readTarString(header, 124, 12).trim();
        const size = parseInt(sizeOctal || "0", 8);
        const entry = {
            name: fullName,
            start: index.scannedOffset + 512,
            size
        };
        index.entries[fullName] = entry;

        if (fullName === fileName || fullName.endsWith(`/${fileName}`)) {
            return entry;
        }

        index.scannedOffset = entry.start + Math.ceil(size / 512) * 512;
    }

    throw new Error(`Image not found in ${tarName}: ${fileName}`);
}

async function fetchTarRange(tarName, start, end) {
    const tarUrl = `${CONFIG.tarImageFallback.baseUrl}${tarName}?download=true`;
    const response = await fetch(tarUrl, {
        headers: {
            Range: `bytes=${start}-${end}`
        }
    });

    if (response.status !== 206) {
        throw new Error(`The server does not return a byte range for ${tarName}`);
    }

    return new Uint8Array(await response.arrayBuffer());
}

function readTarString(header, start, length) {
    let end = start;
    while (end < start + length && header[end] !== 0) end++;
    return new TextDecoder().decode(header.subarray(start, end));
}

function getMimeType(fileName) {
    if (fileName.toLowerCase().endsWith(".png")) return "image/png";
    if (fileName.toLowerCase().endsWith(".webp")) return "image/webp";
    return "image/jpeg";
}

function getCartonFromImage(imageData) {
    return imageData?.metadata?.Carton ?? imageData?.carton ?? "Unknown";
}

function translateMetadataKey(key) {
    const labels = {
        Carton: "Box",
        Conditionnement: "Side",
        Pays: "Country",
        Classe: "Class",
        Continent: "Continent",
        Type: "Type",
        Cluster: "Cluster",
        ClusterLabel: "Cluster Label"
    };
    return labels[key] ?? key;
}

function translateMetadataValue(value) {
    const labels = {
        recto: "front",
        verso: "back",
        Asie: "Asia",
        Europe: "Europe",
        Afrique: "Africa",
        Amerique: "America",
        "Amérique": "America",
        Geographique: "Geographic",
        "Géographique": "Geographic"
    };
    return labels[value] ?? value;
}

function updateDownloadLink(imageData = currentImageData) {
    const carton = currentCarton ?? getCartonFromImage(imageData);
    if (!downloadCartonEl || !carton) return;
    const baseUrl = CONFIG.downloadBaseUrl;
    if (!baseUrl || carton === "Unknown") {
        downloadCartonEl.hidden = true;
        return;
    }
    downloadCartonEl.hidden = false;
    downloadCartonEl.href = `${baseUrl}${carton}.tar?download=true`;
    downloadCartonEl.textContent = `Download ${carton}`;
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
        galleryEl.innerHTML = `<p class="placeholder-text">No results found for your search.</p>`;
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
        const imgSrc = d.remote_tar ? "" : getImageUrl(defaultFileName);

        const item = document.createElement("div");
        item.className = "gallery-item" + (d.id === currentImageId ? " active" : "");
        item.innerHTML = `
            <img src="${imgSrc}" alt="Thumbnail" loading="lazy"/>
            <div class="item-info">
                <b>ID: ${d.id}</b>
                <span>Country: ${translateMetadataValue(d.metadata.Pays) ?? "N/A"}</span>
                <span>Annotations: ${d.annotations.length}</span>
            </div>`;

        item.addEventListener("click", () => {
            galleryEl.querySelector(".gallery-item.active")?.classList.remove("active");
            item.classList.add("active");
            currentImageId = d.id;
            displayImageInVisualizer(d, defaultFace);
        });

        if (d.remote_tar && defaultFileName) {
            const thumb = item.querySelector("img");
            thumb.alt = "Loading from the Hugging Face tar archive...";
            thumb.classList.add("remote-thumb");
            resolveImageSrc(defaultFileName, d)
                .then(src => { thumb.src = src; })
                .catch(() => { thumb.alt = "Preview unavailable"; });
        }

        galleryFrag.appendChild(item);
    }
    galleryEl.appendChild(galleryFrag);

    // Pagination
    const pagFrag = document.createDocumentFragment();
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        if (i === currentPage) btn.classList.add("active");
        btn.addEventListener("click", () => { currentPage = i; renderGallery(); });
        pagFrag.appendChild(btn);
    }
    paginationEl.appendChild(pagFrag);
}

// ─── Visualizer ───────────────────────────────────────────────────────────────

async function displayImageInVisualizer(imageData, face) {
    currentImageData = imageData;
    currentFace = face;
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

    imgEl.alt = imageData.remote_tar ? "Loading from the Hugging Face tar archive..." : "Forbin image";
    try {
        imgEl.src = await resolveImageSrc(imageData.file_names[face], imageData);
        await loadActiveStreamPredictions(imageData);
    } catch (error) {
        document.getElementById("visualizer-details").innerHTML =
            `<b>Erreur de chargement</b> : ${error.message}`;
        return;
    }
    document.getElementById("visualizer-title").textContent = `Image ID: ${imageData.id}`;

    // Build face-switcher buttons without inline onclick / global lookups
    const faceBtns = ["recto", "verso"]
        .filter(f => imageData.file_names[f])
        .map(f => {
            const btn = document.createElement("button");
            btn.className = "face-btn" + (f === face ? " active" : "");
            btn.textContent = f.charAt(0).toUpperCase() + f.slice(1);
            btn.addEventListener("click", () => displayImageInVisualizer(imageData, f));
            return btn.outerHTML;   // we rebuild details innerHTML below
        })
        .join(" ");

    document.getElementById("visualizer-details").innerHTML =
        `Face: <b>${face.toUpperCase()}</b>. ${faceBtns}`;

    // Re-attach click listeners (outerHTML loses them — use a helper instead)
    rebindFaceButtons(imageData, face);

    // Metadata panel
    const metaParts = [`<b>Filename (${face})</b>: ${imageData.file_names[face] ?? "N/A"}`];
    for (const [k, v] of Object.entries(imageData.metadata ?? {})) {
        metaParts.push(`<b>${translateMetadataKey(k)}</b>: ${translateMetadataValue(v)}`);
    }
    const allTexts = imageData.annotations
        .map(a => a.text)
        .filter(t => t?.trim());
    if (allTexts.length) {
        metaParts.push(`<br><b>All Annotated Transcriptions:</b><br>${allTexts.join(" / ")}`);
    }
    document.getElementById("meta-content").innerHTML = metaParts.join("<br>");

    // Setup SVG once the image has loaded
    imgEl.onload = () => requestAnimationFrame(() => setupSVG(imageData, face));
    if (imgEl.complete && imgEl.naturalWidth !== 0) {
        requestAnimationFrame(() => setupSVG(imageData, face));
    }
}

/** Rebind face-button click events (since we used outerHTML to inject them). */
function rebindFaceButtons(imageData, currentFace) {
    for (const btn of document.querySelectorAll(".face-btn")) {
        const face = btn.textContent.toLowerCase();
        btn.addEventListener("click", () => displayImageInVisualizer(imageData, face));
    }
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
        appendAnnotationPolygons(frag, ann, {
            stroke: "#d1a25c",
            fill: "rgba(209,162,92,0.25)",
            label: ann.text || "(no transcription)"
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
        poly.dataset.text = style.label;
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
    if (!sources.length) {
        predictionControlsEl.hidden = true;
        return;
    }

    predictionControlsEl.hidden = false;
    const title = document.createElement("span");
    title.className = "prediction-title";
    title.textContent = "Model Layers";
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
            if (currentImageData) setupSVG(currentImageData, currentFace);
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

// ─── Init ─────────────────────────────────────────────────────────────────────

loadData();
