window.addEventListener("DOMContentLoaded", () => {
    const API_STYLE = "https://www.openhistoricalmap.org/map-styles/main/main.json";

    const map = new maplibregl.Map({
        container: "map",
        style: API_STYLE,
        center: [45, 35],
        zoom: 3,
        attributionControl: true
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-left");

    const stopsList = document.getElementById("stopsList");
    const slider = document.getElementById("dateSlider");
    const dateLabel = document.getElementById("dateLabel");
    const leftPanel = document.getElementById("leftPanel");
    const leftTitle = document.getElementById("leftTitle");
    const leftContent = document.getElementById("leftContent");
    const closeLeftPanelBtn = document.getElementById("closeLeftPanel");
    const mapLoading = document.getElementById("map-loading");


    let mapReady = false;
    let debounceTimer = null;

    function getYearLabel(year) {
        if (year < 0) return `${Math.abs(year)} BCE`;
        return `${year} CE`;
    }

    function setLoading(visible) {
        mapLoading.classList.toggle("hidden", !visible);
    }


    closeLeftPanelBtn.addEventListener("click", () => {
        leftPanel.classList.remove("active");
        map.easeTo({ padding: { left: 0 } });
    });

    function applyDateFilter(year) {
        try {
            const iso = year < 0
                ? `-${String(Math.abs(year)).padStart(4, '0')}-01-01`
                : `${String(year).padStart(4, '0')}-01-01`;
            map.filterByDate(iso);
        } catch (error) {
            console.warn("filterByDate unavailable:", error.message);
        }
    }


    function updateLabel(year) {
        dateLabel.textContent = getYearLabel(year);
    }

    function updateDate(year) {
        updateLabel(year);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (mapReady) applyDateFilter(year);
        }, 80);
    }

    map.on("load", () => {
        mapReady = true;
        setLoading(false);
        // hideBaseLabels();
        if (window.initStampLayer) window.initStampLayer(map);
    });

    map.on("styledata", () => {
        if (!mapReady) return;
        // hideBaseLabels();
        applyDateFilter(parseInt(slider.value, 10));
    });

    slider.addEventListener("input", () => updateDate(parseInt(slider.value, 10)));
    slider.addEventListener("change", () => updateDate(parseInt(slider.value, 10)));


});
