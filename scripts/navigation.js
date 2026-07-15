(function () {
  "use strict";

  const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const links = [
    ["index.html", "Home"],
    ["explorer.html?mode=stream", "Explore"],
    // ["map.html", "Map"],
    ["download.html", "Download"],
    ["index.html#documentation", "Documentation"],
    ["index.html#about", "About"]
  ];

  const activeFor = (href) => {
    const target = href.split("?")[0].split("#")[0];
    if (target !== page) return false;
    if (page !== "index.html") return true;
    return !href.includes("#");
  };

  document.querySelectorAll("[data-site-header]").forEach((header) => {
    const navLinks = links.map(([href, label]) => {
      const current = activeFor(href);
      return `<a href="${href}"${current ? ' class="active" aria-current="page"' : ""}>${label}</a>`;
    }).join("");

    header.innerHTML = `
      <div class="site-header-inner">
        <a class="site-brand" href="index.html" aria-label="Forbin Dataset home">
          <span>Forbin</span><small>Dataset</small>
        </a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">
          <span class="sr-only">Open navigation</span><span aria-hidden="true">Menu</span>
        </button>
        <nav id="site-navigation" class="site-navigation" aria-label="Main navigation">${navLinks}</nav>
      </div>`;

    const toggle = header.querySelector(".nav-toggle");
    const nav = header.querySelector(".site-navigation");
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("open", !open);
    });
  });

  document.querySelectorAll("[data-site-footer]").forEach((footer) => {
    footer.innerHTML = `
      <div class="site-footer-inner">
        <div><strong>Forbin Dataset</strong><span>Archives &amp; Vision Initiative · ANR HIGH VISION (ANR-23-CE38-0001)</span></div>
        <div><span>© 2026</span><a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="license noopener">CC BY-NC 4.0</a></div>
      </div>`;
  });
}());
