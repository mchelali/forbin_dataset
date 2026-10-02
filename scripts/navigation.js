(function () {
  "use strict";

  const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const links = [
    ["index.html", "nav.home"],
    ["explorer.html?mode=stream", "nav.explore"],
    // ["map.html", "nav.map"],
    ["download.html", "nav.download"],
    ["index.html#documentation", "nav.documentation"],
    ["index.html#about", "nav.about"]
  ];

  const activeFor = (href) => {
    const target = href.split("?")[0].split("#")[0];
    if (target !== page) return false;
    if (page !== "index.html") return true;
    return !href.includes("#");
  };

  // Text is filled in by scripts/i18n.js through the data-i18n attributes.
  document.querySelectorAll("[data-site-header]").forEach((header) => {
    const navLinks = links.map(([href, key]) => {
      const current = activeFor(href);
      return `<a href="${href}" data-i18n="${key}"${current ? ' class="active" aria-current="page"' : ""}></a>`;
    }).join("");

    header.innerHTML = `
      <div class="site-header-inner">
        <a class="site-brand" href="index.html" data-i18n-attr="aria-label:nav.brand">
          <span>Forbin</span><small>Dataset</small>
        </a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">
          <span class="sr-only" data-i18n="nav.open"></span><span aria-hidden="true" data-i18n="nav.menu"></span>
        </button>
        <nav id="site-navigation" class="site-navigation" data-i18n-attr="aria-label:nav.main">${navLinks}</nav>
        <div class="language-switcher" role="group" data-i18n-attr="aria-label:nav.language">
          <button type="button" data-set-lang="en" lang="en" data-i18n-attr="title:nav.lang.en; aria-label:nav.lang.en">EN</button>
          <button type="button" data-set-lang="fr" lang="fr" data-i18n-attr="title:nav.lang.fr; aria-label:nav.lang.fr">FR</button>
        </div>
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
        <div><strong>Forbin Dataset</strong><span data-i18n="footer.credits"></span></div>
        <div><span>© 2026</span><a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="license noopener">CC BY-NC 4.0</a></div>
      </div>`;
  });
}());
