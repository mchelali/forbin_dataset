(function () {
  "use strict";

  const archivePanel = document.getElementById("archive-panel");
  const documentPanel = document.getElementById("document-panel");
  const archiveToggle = document.getElementById("toggle-archive-panel");
  const metadataToggle = document.getElementById("toggle-metadata-panel");
  const previousButton = document.getElementById("previous-document");
  const nextButton = document.getElementById("next-document");
  const copyButton = document.getElementById("copy-document-id");
  const mapLink = document.getElementById("open-document-map");
  const breadcrumb = document.getElementById("archive-breadcrumb");
  const status = document.getElementById("document-action-status");
  const visualizer = document.getElementById("visualizer");
  const image = document.getElementById("main-img");

  function togglePanel(panel, button) {
    const open = panel.classList.toggle("mobile-open");
    button.setAttribute("aria-expanded", String(open));
  }

  archiveToggle?.addEventListener("click", () => togglePanel(archivePanel, archiveToggle));
  metadataToggle?.addEventListener("click", () => togglePanel(documentPanel, metadataToggle));

  function currentDocuments() {
    if (typeof getFilteredImages === "function") return getFilteredImages() || [];
    return [];
  }

  function documentIndex() {
    return currentDocuments().findIndex((item) => item === currentImageData || String(item.id) === String(currentImageData?.id));
  }

  async function openAt(offset) {
    const documents = currentDocuments();
    const target = documents[documentIndex() + offset];
    if (!target || typeof displayImageInVisualizer !== "function") return;
    currentImageId = target.id;
    await displayImageInVisualizer(target, getDefaultFace(target));
    updateContext();
  }

  previousButton?.addEventListener("click", () => openAt(-1));
  nextButton?.addEventListener("click", () => openAt(1));

  document.getElementById("reset-view")?.addEventListener("click", () => {
    if (typeof resetView === "function") resetView();
  });
  document.getElementById("zoom-in")?.addEventListener("click", () => zoomBy(ZOOM_STEP));
  document.getElementById("zoom-out")?.addEventListener("click", () => zoomBy(1 / ZOOM_STEP));

  document.getElementById("fullscreen-view")?.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await visualizer.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      status.textContent = t("explorer.fullscreenUnavailable");
    }
  });

  copyButton?.addEventListener("click", async () => {
    const identifier = String(currentImageData?.metadata?.document_id ?? currentImageData?.id ?? "");
    if (!identifier) return;
    try {
      await navigator.clipboard.writeText(identifier);
      status.textContent = t("explorer.idCopied", { id: identifier });
    } catch (error) {
      status.textContent = t("explorer.idShown", { id: identifier });
    }
  });

  function archivePath(identifier) {
    const parts = String(identifier || "").split("_").filter(Boolean);
    const carton = currentCarton && currentCarton !== "Unknown" ? currentCarton : t("explorer.boxNotSpecified");
    const documentLabel = parts.length ? parts[parts.length - 1] : identifier;
    return [t("explorer.forbinCollection"), carton, documentLabel ? t("explorer.documentLabel", { id: documentLabel }) : t("explorer.document")];
  }

  function updateContext() {
    if (document.body.classList.contains("explorer-gallery-mode")) {
      breadcrumb.textContent = currentCarton ? `${t("explorer.forbinCollection")} / ${currentCarton}` : t("explorer.forbinCollection");
      previousButton.disabled = true;
      nextButton.disabled = true;
      return;
    }
    const documents = currentDocuments();
    const index = documentIndex();
    const identifier = currentImageData?.metadata?.document_id ?? currentImageData?.id ?? "";
    const path = archivePath(identifier);
    breadcrumb.textContent = path.join(" / ");
    previousButton.disabled = index <= 0;
    nextButton.disabled = index < 0 || index >= documents.length - 1;
    copyButton.disabled = !identifier;
    if (identifier) {
      const params = new URLSearchParams({ document_id: String(identifier) });
      mapLink.href = I18N.localizeUrl(`map.html?${params.toString()}`);
      mapLink.classList.remove("is-disabled");
      mapLink.removeAttribute("aria-disabled");
    }
  }

  window.addEventListener("forbin:languagechange", updateContext);

  const contextObserver = new MutationObserver(updateContext);
  const metadataContent = document.getElementById("metadata-content");
  if (metadataContent) contextObserver.observe(metadataContent, { childList: true, subtree: true });

  // Loading and error states of the viewer are handled by explorer.js.
  image?.addEventListener("load", updateContext);

  window.addEventListener("unhandledrejection", (event) => {
    const message = String(event.reason?.message || event.reason || "Network error");
    status.textContent = t("explorer.dataError", { error: message });
  });

  // Viewer shortcuts: +/- zoom, 0 fit, ←/→ previous/next document.
  document.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("explorer-document-mode")) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest?.("input, select, textarea, [contenteditable='true']")) return;
    const actions = {
      "+": () => zoomBy(ZOOM_STEP),
      "=": () => zoomBy(ZOOM_STEP),
      "-": () => zoomBy(1 / ZOOM_STEP),
      "0": () => resetView(),
      ArrowLeft: () => openAt(-1),
      ArrowRight: () => openAt(1)
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    [
      [archivePanel, archiveToggle],
      [documentPanel, metadataToggle]
    ].forEach(([panel, button]) => {
      if (!panel?.classList.contains("mobile-open")) return;
      panel.classList.remove("mobile-open");
      button?.setAttribute("aria-expanded", "false");
    });
  });
}());
