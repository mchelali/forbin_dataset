(function () {
  "use strict";

  const toggle = document.getElementById("toggle-map-panel");
  const panel = document.getElementById("map-sidebar");
  const detailPanel = document.getElementById("rightPanel");

  toggle?.addEventListener("click", () => {
    const open = panel.classList.toggle("mobile-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (detailPanel?.classList.contains("active") && typeof closeRightPanel === "function") {
      closeRightPanel();
      return;
    }
    if (panel?.classList.contains("mobile-open")) {
      panel.classList.remove("mobile-open");
      toggle?.setAttribute("aria-expanded", "false");
      toggle?.focus();
    }
  });
}());
