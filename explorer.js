// ─── State ────────────────────────────────────────────────────────────────────

let data = [];
let grouped = {};
let annsByImage = {};
let currentCarton = null;
let currentImageId = null;
let currentPage = 1;
const PER_PAGE = 10;

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

// ─── Zoom / Pan state ─────────────────────────────────────────────────────────

let zoomScale = 1;
let panX = 0, panY = 0;
let isPanning = false;
let startPanX = 0, startPanY = 0;
let minZoom = 0.1;
const MAX_ZOOM = 5;

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadData() {
    const response = await fetch("samples/subset.json");
    const coco = await response.json();
    data = coco.images;
    const anns = coco.annotations;

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
        const carton = d.metadata?.Carton ?? "Inconnu";
        (grouped[carton] ??= []).push(d);
    }

    document.getElementById("total-count").textContent = data.length;
    renderCartonList();
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

    for (const carton of Object.keys(grouped).sort()) {
        const item = document.createElement("div");
        item.className = "carton-item" + (carton === currentCarton ? " active" : "");
        item.textContent = `${carton} (${grouped[carton].length})`;

        item.addEventListener("click", () => {
            cartonListEl.querySelector(".active")?.classList.remove("active");
            item.classList.add("active");
            searchEl.value = "";
            currentCarton = carton;
            currentPage = 1;
            renderGallery();
        });

        fragment.appendChild(item);
    }
    cartonListEl.appendChild(fragment);
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function getFilteredImages() {
    const term = searchEl.value.toLowerCase().trim();
    if (term === "") {
        return currentCarton ? grouped[currentCarton] : null;
    }
    return data.filter(d => d._searchCache.includes(term));
}

function renderGallery() {
    galleryEl.innerHTML = "";
    paginationEl.innerHTML = "";

    const filtered = getFilteredImages();

    if (!filtered) {
        galleryEl.innerHTML = `<p class="placeholder-text">Sélectionnez un carton ou recherchez une image.</p>`;
        return;
    }
    if (filtered.length === 0) {
        galleryEl.innerHTML = `<p class="placeholder-text">Aucun résultat trouvé pour votre recherche.</p>`;
        return;
    }

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    currentPage = Math.min(currentPage, totalPages);   // guard stale page
    const start = (currentPage - 1) * PER_PAGE;
    const pageItems = filtered.slice(start, start + PER_PAGE);

    const galleryFrag = document.createDocumentFragment();
    for (const d of pageItems) {
        const imgSrc = d.file_names.recto ? `samples/images/${d.file_names.recto}` : "";

        const item = document.createElement("div");
        item.className = "gallery-item" + (d.id === currentImageId ? " active" : "");
        item.innerHTML = `
            <img src="${imgSrc}" alt="Vignette" loading="lazy"/>
            <div class="item-info">
                <b>ID: ${d.id}</b>
                <span>Pays: ${d.metadata.Pays ?? "N/A"}</span>
                <span>Annots: ${d.annotations.length}</span>
            </div>`;

        item.addEventListener("click", () => {
            galleryEl.querySelector(".gallery-item.active")?.classList.remove("active");
            item.classList.add("active");
            currentImageId = d.id;
            displayImageInVisualizer(d, "recto");
        });

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

function displayImageInVisualizer(imageData, face) {
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

    imgEl.src = `samples/images/${imageData.file_names[face]}`;
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
        metaParts.push(`<b>${k}</b>: ${v}`);
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

    // Draw annotations for this face
    const faceLower = face.toLowerCase();
    const anns = (imageData.annotations ?? []).filter(
        a => (a.source_face ?? "").toLowerCase() === faceLower
    );

    const frag = document.createDocumentFragment();
    for (const ann of anns) {
        const segs = Array.isArray(ann.segmentation) ? ann.segmentation : [];
        for (const seg of segs) {
            if (!seg || seg.length < 4) continue;

            const pts = [];
            for (let i = 0; i < seg.length - 1; i += 2) {
                pts.push(`${seg[i]},${seg[i + 1]}`);
            }

            const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            poly.setAttribute("points", pts.join(" "));
            poly.style.cssText = "stroke:#d1a25c;stroke-width:2px;fill:rgba(209,162,92,0.25);";
            poly.dataset.text = ann.text || "(sans transcription)";

            poly.addEventListener("mouseenter", onPolygonEnter);
            poly.addEventListener("mouseleave", onPolygonLeave);

            frag.appendChild(poly);
        }
    }
    gGroup.appendChild(frag);
    applyTransform();  // sync stroke widths

    interactionEnabled = true;
    svgEl.style.cursor = "grab";
    wrapperEl.style.visibility = "visible";
    imgEl.style.visibility = "visible";
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