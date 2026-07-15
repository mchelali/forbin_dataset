(function () {
  "use strict";

  const toggle = document.getElementById("toggle-map-panel");
  const panel = document.getElementById("map-sidebar");
  const conflictsButton = document.getElementById("toggleConflictsPanel");
  const conflictsContainer = document.getElementById("conflictsListContainer");

  toggle?.addEventListener("click", () => {
    const open = panel.classList.toggle("mobile-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  conflictsButton?.addEventListener("click", () => {
    window.requestAnimationFrame(() => {
      conflictsButton.setAttribute("aria-expanded", String(!conflictsContainer.classList.contains("hidden")));
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel?.classList.contains("mobile-open")) {
      panel.classList.remove("mobile-open");
      toggle?.setAttribute("aria-expanded", "false");
      toggle?.focus();
    }
  });
}());
