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
  const emptyState = document.getElementById("viewer-empty-state");

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
    zoomScale = 1;
    panX = 0;
    panY = 0;
    if (typeof applyTransform === "function") applyTransform();
  });

  document.getElementById("fullscreen-view")?.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await visualizer.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      status.textContent = "Full-screen mode is not available in this browser.";
    }
  });

  copyButton?.addEventListener("click", async () => {
    const identifier = String(currentImageData?.metadata?.document_id ?? currentImageData?.id ?? "");
    if (!identifier) return;
    try {
      await navigator.clipboard.writeText(identifier);
      status.textContent = `Identifier copied: ${identifier}`;
    } catch (error) {
      status.textContent = `Identifier: ${identifier}`;
    }
  });

  function archivePath(identifier) {
    const parts = String(identifier || "").split("_").filter(Boolean);
    const carton = currentCarton && currentCarton !== "Unknown" ? currentCarton : "Box not specified";
    const documentLabel = parts.length ? parts[parts.length - 1] : identifier;
    return ["Forbin Collection", carton, documentLabel ? `Document ${documentLabel}` : "Document"];
  }

  function updateContext() {
    if (document.body.classList.contains("explorer-gallery-mode")) {
      breadcrumb.textContent = currentCarton ? `Forbin Collection / ${currentCarton}` : "Forbin Collection";
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
      mapLink.href = `map.html?${params.toString()}`;
      mapLink.classList.remove("is-disabled");
      mapLink.removeAttribute("aria-disabled");
    }
  }

  const contextObserver = new MutationObserver(updateContext);
  const metadataContent = document.getElementById("metadata-content");
  if (metadataContent) contextObserver.observe(metadataContent, { childList: true, subtree: true });

  image?.addEventListener("error", () => {
    emptyState?.classList.remove("hidden");
    emptyState.innerHTML = "<span>Image unavailable</span><small>The document is indexed, but its Sharedocs file could not be loaded.</small>";
  });

  image?.addEventListener("load", () => {
    emptyState?.classList.add("hidden");
    updateContext();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const message = String(event.reason?.message || event.reason || "Network error");
    status.textContent = `Some data could not be loaded: ${message}`;
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
