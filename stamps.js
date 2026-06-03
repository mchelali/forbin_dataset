/**
 * stamps.js - 19th-century postal agencies
 * Displays SVG stamps by region/country on the MapLibre map.
 * Include AFTER map.js in index.html: <script src="stamps.js"></script>
 */

const AGENCIES_DATA_URL = "samples/agencies_data.json";

const STAMP_SHAPES = {
    circle: { w: 90, h: 90 },
    rectangle: { w: 110, h: 84 },
    octagon: { w: 96, h: 96 },
    lozenge: { w: 104, h: 80 },
    oval: { w: 104, h: 72 }
};

/* ─── SVG builders for each stamp shape ─────────────────────────── */
function buildStampSVG(agency, label, year, shape, color) {
    const encoded = encodeURIComponent(color);
    const svgNS = "http://www.w3.org/2000/svg";
    const { w, h } = STAMP_SHAPES[shape] || STAMP_SHAPES.circle;

    const svgParts = {
        circle: `
      <circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 3}" fill="none" stroke="${color}" stroke-width="2.2"/>
      <circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 10}" fill="none" stroke="${color}" stroke-width="0.9"/>
      <circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 16}" fill="none" stroke="${color}" stroke-width="0.6" stroke-dasharray="3,2"/>
      <text x="${w / 2}" y="${h / 2 - 11}" text-anchor="middle" font-size="7" font-family="Georgia,serif" font-weight="bold"
            fill="${color}" letter-spacing="1.5">${agency.toUpperCase()}</text>
      <text x="${w / 2}" y="${h / 2 + 2}" text-anchor="middle" font-size="8" font-family="Georgia,serif"
            fill="${color}" font-weight="bold">${label}</text>
      <text x="${w / 2}" y="${h / 2 + 15}" text-anchor="middle" font-size="7.5" font-family="Georgia,serif"
            fill="${color}">${year}</text>`,

        rectangle: `
      <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="4" fill="none" stroke="${color}" stroke-width="2.2"/>
      <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="2" fill="none" stroke="${color}" stroke-width="0.9"/>
      <text x="${w / 2}" y="28" text-anchor="middle" font-size="13" font-family="Georgia,serif" fill="${color}">♛</text>
      <text x="${w / 2}" y="42" text-anchor="middle" font-size="7.5" font-family="Georgia,serif" font-weight="bold"
            fill="${color}" letter-spacing="1">${agency.toUpperCase()}</text>
      <line x1="14" y1="48" x2="${w - 14}" y2="48" stroke="${color}" stroke-width="0.7" opacity="0.6"/>
      <text x="${w / 2}" y="58" text-anchor="middle" font-size="7" font-family="Georgia,serif"
            fill="${color}">${label}</text>
      <text x="${w / 2}" y="70" text-anchor="middle" font-size="7" font-family="Georgia,serif"
            fill="${color}">${year}</text>`,

        octagon: `
      <polygon points="${w / 2},4 ${w - 18},18 ${w - 4},${h / 2} ${w - 18},${h - 18} ${w / 2},${h - 4} 18,${h - 18} 4,${h / 2} 18,18"
               fill="none" stroke="${color}" stroke-width="2"/>
      <polygon points="${w / 2},12 ${w - 24},24 ${w - 12},${h / 2} ${w - 24},${h - 24} ${w / 2},${h - 12} 24,${h - 24} 12,${h / 2} 24,24"
               fill="none" stroke="${color}" stroke-width="0.8"/>
      <text x="${w / 2}" y="${h / 2 - 12}" text-anchor="middle" font-size="7.5" font-family="Georgia,serif"
            font-weight="bold" fill="${color}">${agency.toUpperCase()}</text>
      <text x="${w / 2}" y="${h / 2 + 3}" text-anchor="middle" font-size="12" font-family="Georgia,serif" fill="${color}">☽</text>
      <text x="${w / 2}" y="${h / 2 + 17}" text-anchor="middle" font-size="7" font-family="Georgia,serif"
            fill="${color}">${label}</text>
      <text x="${w / 2}" y="${h / 2 + 28}" text-anchor="middle" font-size="7" font-family="Georgia,serif"
            fill="${color}">${year}</text>`,

        lozenge: `
      <polygon points="${w / 2},4 ${w - 4},${h / 2} ${w / 2},${h - 4} 4,${h / 2}"
               fill="none" stroke="${color}" stroke-width="2"/>
      <polygon points="${w / 2},14 ${w - 14},${h / 2} ${w / 2},${h - 14} 14,${h / 2}"
               fill="none" stroke="${color}" stroke-width="0.8"/>
      <line x1="18" y1="${h / 2 - 8}" x2="${w - 18}" y2="${h / 2 - 8}" stroke="${color}" stroke-width="1.2" opacity="0.35"/>
      <line x1="12" y1="${h / 2}"   x2="${w - 12}" y2="${h / 2}"   stroke="${color}" stroke-width="1.2" opacity="0.35"/>
      <line x1="18" y1="${h / 2 + 8}" x2="${w - 18}" y2="${h / 2 + 8}" stroke="${color}" stroke-width="1.2" opacity="0.35"/>
      <text x="${w / 2}" y="${h / 2 - 14}" text-anchor="middle" font-size="7" font-family="Georgia,serif"
            font-weight="bold" fill="${color}">${agency.toUpperCase()}</text>
      <text x="${w / 2}" y="${h / 2 + 22}" text-anchor="middle" font-size="7" font-family="Georgia,serif"
            fill="${color}">${label} · ${year}</text>`,

        oval: `
      <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 3}" ry="${h / 2 - 3}" fill="none" stroke="${color}" stroke-width="2.2"/>
      <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 10}" ry="${h / 2 - 10}" fill="none" stroke="${color}" stroke-width="0.9"/>
      <text x="${w / 2}" y="${h / 2 - 8}" text-anchor="middle" font-size="7.5" font-family="Georgia,serif"
            font-weight="bold" fill="${color}" letter-spacing="1">${agency.toUpperCase()}</text>
      <line x1="20" y1="${h / 2}" x2="${w - 20}" y2="${h / 2}" stroke="${color}" stroke-width="0.7" opacity="0.4"/>
      <text x="${w / 2}" y="${h / 2 + 10}" text-anchor="middle" font-size="7.5" font-family="Georgia,serif"
            fill="${color}">${label}</text>
      <text x="${w / 2}" y="${h / 2 + 22}" text-anchor="middle" font-size="7" font-family="Georgia,serif"
            fill="${color}">${year}</text>`
    };

    const inner = svgParts[shape] || svgParts.circle;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
}

/* ─── Marker creation ───────────────────────────────────────────── */
function createStampMarker(agencyDef, stop, mapInstance) {
    const shape = agencyDef.stampShape || "circle";
    const { w, h } = STAMP_SHAPES[shape] || STAMP_SHAPES.circle;
    const svgStr = buildStampSVG(
        agencyDef.name,
        stop.label,
        stop.year,
        shape,
        agencyDef.inkColor || agencyDef.color
    );

    const el = document.createElement("div");
    el.className = "stamp-marker";
    el.innerHTML = svgStr;
    el.style.cssText = `
    width: ${w}px; height: ${h}px;
    cursor: pointer;
    opacity: 0.85;
    transition: opacity 0.2s, transform 0.2s;
    filter: url(#stamp-ink);
  `;
    el.addEventListener("mouseenter", () => {
        el.style.opacity = "1";
        el.style.transform = "scale(1.12)";
        el.style.zIndex = "10";
    });
    el.addEventListener("mouseleave", () => {
        el.style.opacity = "0.85";
        el.style.transform = "scale(1)";
        el.style.zIndex = "";
    });

    const popup = new maplibregl.Popup({
        offset: [0, -h / 2],
        closeButton: false,
        className: "stamp-popup"
    }).setHTML(`
    <div class="stamp-popup-inner">
      <strong>${stop.name}</strong><br>
      <span class="stamp-popup-agency">${agencyDef.name}</span><br>
      <span class="stamp-popup-meta">${agencyDef.period} · ${agencyDef.country}</span>
    </div>
  `);

    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(stop.coords)
        .setPopup(popup)
        .addTo(mapInstance);

    el.addEventListener("click", () => marker.togglePopup());

    return marker;
}

/* ─── Ink SVG filter (injected once into the page) ──────────────── */
function injectInkFilter() {
    if (document.getElementById("stamp-ink-filter")) return;
    const svgFilter = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgFilter.id = "stamp-ink-filter";
    svgFilter.setAttribute("width", "0");
    svgFilter.setAttribute("height", "0");
    svgFilter.style.position = "absolute";
    svgFilter.innerHTML = `
    <defs>
      <filter id="stamp-ink" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5"
          xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>`;
    document.body.appendChild(svgFilter);
}

/* ─── CSS injection ─────────────────────────────────────────────── */
function injectStampStyles() {
    if (document.getElementById("stamp-styles")) return;
    const style = document.createElement("style");
    style.id = "stamp-styles";
    style.textContent = `
    .stamp-marker { user-select: none; }
    .maplibregl-popup.stamp-popup .maplibregl-popup-content {
      background: #f5ede0;
      border: 1px solid #a07850;
      border-radius: 4px;
      padding: 8px 12px;
      font-family: 'Crimson Text', Georgia, serif;
      color: #3d2010;
      box-shadow: 2px 3px 8px rgba(0,0,0,0.25);
      min-width: 160px;
    }
    .stamp-popup-inner strong { font-size: 13px; }
    .stamp-popup-agency { font-size: 11px; font-style: italic; opacity: 0.85; }
    .stamp-popup-meta   { font-size: 10px; opacity: 0.7; }
    .maplibregl-popup.stamp-popup .maplibregl-popup-tip { border-top-color: #a07850; }

    /* Sidebar stamp toggle items */
    .agency-item { padding: 8px 12px; cursor: pointer; border-bottom: 0.5px solid rgba(0,0,0,0.08); }
    .agency-item:hover { background: rgba(160,120,80,0.08); }
    .agency-row { display: flex; align-items: center; gap: 8px; }
    .agency-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .agency-name { font-family: 'Crimson Text', Georgia, serif; font-size: 13px; }
    .agency-country { font-size: 10px; opacity: 0.6; }
    .active-agency { background: rgba(160,120,80,0.12); }
  `;
    document.head.appendChild(style);
}

/* ─── Sidebar UI builder ─────────────────────────────────────────── */
function buildAgencyUI(agencies, container, onToggle) {
    container.innerHTML = "";
    const titleEl = document.createElement("div");
    titleEl.className = "section-title";
    titleEl.textContent = "Agences & Tampons";
    container.insertAdjacentElement("beforebegin", titleEl);

    Object.keys(agencies).forEach(id => {
        const ag = agencies[id];
        const item = document.createElement("div");
        item.className = "agency-item";
        item.innerHTML = `
      <label class="agency-row" style="cursor:pointer;">
        <input type="checkbox" id="agchk-${id}" style="accent-color:${ag.color};">
        <span class="agency-dot" style="background:${ag.color};border:1.5px solid ${ag.color};"></span>
        <span>
          <div class="agency-name">${ag.name}</div>
          <div class="agency-country">${ag.country} · ${ag.period}</div>
        </span>
      </label>`;
        const chk = item.querySelector("input");
        chk.addEventListener("change", e => {
            item.classList.toggle("active-agency", e.target.checked);
            onToggle(id, e.target.checked);
        });
        container.appendChild(item);
    });
}

/* ─── Main StampLayer controller ────────────────────────────────── */
class StampLayer {
    constructor(mapInstance, sidebarContainerId) {
        this.map = mapInstance;
        this.agencies = {};
        this.activeMarkers = {}; // { agencyId: [marker, ...] }

        this.container = document.createElement("div");
        this.container.id = "agencyList";
        this.container.className = "traveler-list";

        const sidebar = document.querySelector(".sidebar");
        if (sidebar) sidebar.appendChild(this.container);

        injectInkFilter();
        injectStampStyles();
        this._load(sidebarContainerId);
    }

    async _load() {
        try {
            const resp = await fetch(AGENCIES_DATA_URL);
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            this.agencies = await resp.json();
            buildAgencyUI(this.agencies, this.container, (id, enabled) => {
                enabled ? this._show(id) : this._hide(id);
            });
        } catch (err) {
            console.error("Unable to load agencies_data.json:", err);
            this.container.innerHTML = "<p style='padding:8px;font-size:12px;'>Agency data not found.</p>";
        }
    }

    _show(id) {
        const ag = this.agencies[id];
        if (!ag) return;
        this._hide(id);
        const markers = ag.agencies.map(stop => createStampMarker(ag, stop, this.map));
        this.activeMarkers[id] = markers;
    }

    _hide(id) {
        (this.activeMarkers[id] || []).forEach(m => m.remove());
        delete this.activeMarkers[id];
    }

    hideAll() {
        Object.keys(this.activeMarkers).forEach(id => this._hide(id));
        document.querySelectorAll("[id^='agchk-']").forEach(chk => {
            chk.checked = false;
            chk.closest(".agency-item")?.classList.remove("active-agency");
        });
    }

    filterByYear(year) {
        Object.keys(this.activeMarkers).forEach(id => {
            const ag = this.agencies[id];
            if (!ag) return;
            this.activeMarkers[id].forEach((marker, i) => {
                const stop = ag.agencies[i];
                const el = marker.getElement();
                const visible = stop.year <= year;
                el.style.display = visible ? "" : "none";
            });
        });
    }
}

/* ─── Integration hook ──────────────────────────────────────────── */
// Wait for the map and existing app to be ready, then attach.
document.addEventListener("DOMContentLoaded", () => {
    // The map instance is created in map.js. We wait for the 'load' event
    // by patching into the slider's existing updateDate flow.
    const tryInit = setInterval(() => {
        const mapEl = document.getElementById("map");
        // maplibregl stores the map on the container element
        if (!mapEl || !window._stampLayerReady) {
            // The stamp layer is attached after maplibre fires 'load'
            // We hook into the slider to sync year filtering.
        }
    }, 300);

    // Safer: expose a global init function called from map.js on load
    window.initStampLayer = function (mapInstance) {
        clearInterval(tryInit);
        const stampLayer = new StampLayer(mapInstance);
        window.stampLayer = stampLayer;

        // Sync stamp visibility with the date slider
        const slider = document.getElementById("dateSlider");
        if (slider) {
            const syncYear = () => stampLayer.filterByYear(parseInt(slider.value, 10));
            slider.addEventListener("input", syncYear);
            slider.addEventListener("change", syncYear);
            syncYear(); // initial pass
        }
    };
});
