/*
 * Forbin Dataset — minimal internationalisation engine.
 *
 * Translations live in i18n/translations.js (one entry per key, all languages
 * side by side). This script:
 *   - picks the language: ?lang= URL parameter, saved choice, browser language, English;
 *   - keeps one URL per language (English = bare URL, French = ?lang=fr) so that
 *     search engines index both versions (see the hreflang links in each page);
 *   - translates the DOM through data attributes:
 *       data-i18n="key"                  -> textContent
 *       data-i18n-html="key"             -> innerHTML (trusted dictionary markup only)
 *       data-i18n-attr="attr:key; ..."   -> attributes (placeholder, alt, aria-label, content…)
 *   - exposes t(key, params) for strings built in JavaScript.
 *
 * Load it in <head>, right after i18n/translations.js.
 */
(function () {
  "use strict";

  const SUPPORTED = ["en", "fr"];
  const DEFAULT_LANG = "en";
  const LOCALES = { en: "en-US", fr: "fr-FR" };
  const OG_LOCALES = { en: "en_US", fr: "fr_FR" };
  const STORAGE_KEY = "forbin-lang";
  const SITE_URL = "https://mchelali.github.io/forbin_dataset/";
  const dictionary = window.FORBIN_I18N || {};
  const reportedMissing = new Set();

  function readStoredLanguage() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (error) { return null; }
  }

  function storeLanguage(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (error) { /* private mode */ }
  }

  function detectLanguage() {
    const param = new URLSearchParams(window.location.search).get("lang");
    if (SUPPORTED.includes(param)) {
      storeLanguage(param);
      return param;
    }
    const stored = readStoredLanguage();
    if (SUPPORTED.includes(stored)) return stored;
    const browser = (navigator.languages || [navigator.language || ""])
      .map(value => String(value).slice(0, 2).toLowerCase());
    return browser.find(value => SUPPORTED.includes(value)) || DEFAULT_LANG;
  }

  let current = detectLanguage();

  // ─── Translation ──────────────────────────────────────────────────────────

  function formatNumber(value, options) {
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat(LOCALES[current], options).format(number) : String(value ?? "");
  }

  function lookup(key) {
    const entry = dictionary[key];
    if (!entry) return undefined;
    return entry[current] ?? entry[DEFAULT_LANG];
  }

  // t("key", { count: 3, name: "x" }) — plural entries are { one, other }.
  function t(key, params = {}) {
    let value = lookup(key);
    if (value === undefined) {
      if (!reportedMissing.has(key)) {
        reportedMissing.add(key);
        console.warn(`[i18n] Missing translation key: ${key}`);
      }
      return key;
    }
    if (typeof value === "object") {
      const category = new Intl.PluralRules(LOCALES[current]).select(Number(params.count) || 0);
      value = value[category] ?? value.other;
    }
    return String(value).replace(/\{(\w+)\}/g, (match, name) => {
      if (!(name in params)) return match;
      const param = params[name];
      return typeof param === "number" ? formatNumber(param) : String(param ?? "");
    });
  }

  // Translate a data value (e.g. a download theme) stored under "prefix:value".
  // Falls back to the value itself, which is already in English.
  function translateValue(prefix, value) {
    const entry = dictionary[`${prefix}:${value}`];
    return (entry && entry[current]) || value;
  }

  // ─── URLs ─────────────────────────────────────────────────────────────────

  function withLanguage(url, lang) {
    if (lang === DEFAULT_LANG) url.searchParams.delete("lang");
    else url.searchParams.set("lang", lang);
    return url;
  }

  // Add or remove ?lang= on an internal page link, keeping its relative form.
  function localizeUrl(href, lang = current) {
    if (!href || /^(#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return href;
    const path = href.split(/[?#]/)[0];
    if (!/(^|\/)[\w.-]*\.html$/i.test(path) && path !== "" && !path.endsWith("/")) return href;
    const url = withLanguage(new URL(href, window.location.href), lang);
    return `${path}${url.search}${url.hash}`;
  }

  function getPageFile() {
    return window.location.pathname.split("/").pop() || "index.html";
  }

  function getPublicUrl(lang) {
    const file = getPageFile();
    const url = new URL(file === "index.html" ? "" : file, SITE_URL);
    return withLanguage(url, lang).href;
  }

  function syncAddressBar() {
    const url = withLanguage(new URL(window.location.href), current);
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url.href);
  }

  function upsertHeadTag(selector, create) {
    let element = document.head.querySelector(selector);
    if (!element) {
      element = create();
      document.head.appendChild(element);
    }
    return element;
  }

  function updateHead() {
    document.documentElement.lang = current;
    const canonical = upsertHeadTag('link[rel="canonical"]', () => {
      const link = document.createElement("link");
      link.rel = "canonical";
      return link;
    });
    canonical.href = getPublicUrl(current);
    document.head.querySelector('meta[property="og:url"]')?.setAttribute("content", getPublicUrl(current));
    document.head.querySelector('meta[property="og:locale"]')?.setAttribute("content", OG_LOCALES[current]);
    document.head.querySelector('meta[property="og:locale:alternate"]')
      ?.setAttribute("content", OG_LOCALES[current === "fr" ? "en" : "fr"]);
  }

  // ─── DOM ──────────────────────────────────────────────────────────────────

  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(element => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-html]").forEach(element => {
      element.innerHTML = t(element.dataset.i18nHtml);
    });
    root.querySelectorAll("[data-i18n-attr]").forEach(element => {
      element.dataset.i18nAttr.split(";").forEach(pair => {
        const [attribute, key] = pair.split(":").map(part => part.trim());
        if (attribute && key) element.setAttribute(attribute, t(key));
      });
    });
    root.querySelectorAll("a[href]").forEach(link => {
      const href = link.getAttribute("href");
      const localized = localizeUrl(href);
      if (localized !== href) link.setAttribute("href", localized);
    });
    root.querySelectorAll("[data-set-lang]").forEach(button => {
      const active = button.dataset.setLang === current;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (root === document) {
      updateHead();
      document.documentElement.classList.remove("i18n-pending");
    }
  }

  function setLanguage(lang) {
    if (!SUPPORTED.includes(lang) || lang === current) return;
    current = lang;
    storeLanguage(lang);
    syncAddressBar();
    apply();
    window.dispatchEvent(new CustomEvent("forbin:languagechange", { detail: { lang } }));
  }

  document.addEventListener("click", event => {
    const button = event.target.closest?.("[data-set-lang]");
    if (!button) return;
    event.preventDefault();
    setLanguage(button.dataset.setLang);
  });

  // Hide the page until it is translated, to avoid a flash of English text.
  document.documentElement.lang = current;
  if (current !== DEFAULT_LANG) {
    document.documentElement.classList.add("i18n-pending");
    window.setTimeout(() => document.documentElement.classList.remove("i18n-pending"), 2500);
  }
  syncAddressBar();
  document.addEventListener("DOMContentLoaded", () => apply());

  window.I18N = {
    get lang() { return current; },
    get locale() { return LOCALES[current]; },
    supported: SUPPORTED.slice(),
    has: key => Object.prototype.hasOwnProperty.call(dictionary, key),
    t,
    translateValue,
    formatNumber,
    localizeUrl,
    apply,
    setLanguage
  };
  window.t = t;
}());
