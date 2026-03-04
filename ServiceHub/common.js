// common.js — shared behavior (theme, language, nav active, global search, global reveal)

(function () {
  const root = document.documentElement;

  // ===== THEME =====
  const THEME_KEY = "servicehub_theme";
  const themeBtn = document.querySelector('[data-action="toggle-theme"]');

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    if (themeBtn) themeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const initial = saved || root.getAttribute("data-theme") || "light";
    applyTheme(initial);
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  // ===== LANGUAGE =====
  const LANG_KEY = "servicehub_lang";

  function getLang() {
    return localStorage.getItem(LANG_KEY) || root.getAttribute("data-lang") || "en";
  }

  window.SH_LANG = function(){ return getLang(); };

  window.SH_T = function (obj) {
    const lang = getLang();
    if (lang === "bm" && obj?.bm) return obj.bm;
    return obj?.en ?? "";
  };

  function applyLang(lang) {
    root.setAttribute("data-lang", lang);
    localStorage.setItem(LANG_KEY, lang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const en = el.getAttribute("data-en");
      const bm = el.getAttribute("data-bm");
      if (lang === "bm" && bm) el.textContent = bm;
      else if (en) el.textContent = en;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const en = el.getAttribute("data-en-placeholder");
      const bm = el.getAttribute("data-bm-placeholder");
      if (lang === "bm" && bm) el.setAttribute("placeholder", bm);
      else if (en) el.setAttribute("placeholder", en);
    });

    window.dispatchEvent(new CustomEvent("servicehub:langchange", { detail: { lang } }));
  }

  function initLang() {
    const saved = localStorage.getItem(LANG_KEY);
    const initial = saved || root.getAttribute("data-lang") || "en";
    applyLang(initial);
  }

  document.querySelectorAll("[data-action='lang-en']").forEach((btn) => {
    btn.addEventListener("click", () => applyLang("en"));
  });

  document.querySelectorAll("[data-action='lang-bm']").forEach((btn) => {
    btn.addEventListener("click", () => applyLang("bm"));
  });

  // ===== NAV ACTIVE =====
  function initNavActive() {
    const path = (location.pathname.split("/").pop() || "").toLowerCase();
    document.querySelectorAll("[data-nav]").forEach((a) => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (href && path === href) a.classList.add("active");
      else a.classList.remove("active");
    });
  }

  // ===== GLOBAL CATEGORY DROPDOWN =====
  function initGlobalCategory() {
    const sel = document.getElementById("globalCat");
    if (!sel) return;
    const cats = window.SERVICE_CATEGORIES || ["All categories"];
    sel.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join("");
  }

  // ✅ helper: base folder URL (supaya kekal dalam /ServiceHub/)
  function getBaseFolderUrl() {
    const href = location.href;
    return href.substring(0, href.lastIndexOf("/") + 1);
  }

  // ===== GLOBAL SEARCH SUBMIT =====
  function initGlobalSearch() {
    const form = document.querySelector("[data-search-form]");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const qInput = form.querySelector("input");
      const q = (qInput?.value || "").trim();
      const cat = (document.getElementById("globalCat")?.value || "").trim();

      const url = new URL("servicesPage.html", getBaseFolderUrl());
      if (q) url.searchParams.set("q", q);
      if (cat && cat !== "All categories") url.searchParams.set("cat", cat);

      localStorage.setItem("servicehub_last_services_url", url.toString());
      window.location.href = url.toString();
    });
  }

  // ===== GLOBAL SCROLL REVEAL =====
  let revealIO = null;

  function initReveal() {
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasIO = typeof IntersectionObserver !== "undefined";

    // If reduce motion OR no IO → do nothing (fail-safe: content stays visible)
    if (reduceMotion || !hasIO) return;

    // Enable reveal CSS rules (your common.css uses html.reveal-on .reveal ...)
    root.classList.add("reveal-on");

    const items = Array.from(document.querySelectorAll(".reveal"));
    if (!items.length) return;

    // cleanup old observer if rerun
    if (revealIO) revealIO.disconnect();

    revealIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          revealIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach((el) => {
      // if already visible, skip observing
      if (!el.classList.contains("is-visible")) revealIO.observe(el);
    });

    // paint pass: make above-fold stuff visible faster
    requestAnimationFrame(() => {
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9) el.classList.add("is-visible");
      });
    });
  }

  // ===== INIT =====
  initTheme();
  initLang();
  initNavActive();
  initGlobalCategory();
  initGlobalSearch();
  initReveal();

  // rerun reveal on language change (in case new nodes/sections appear)
  window.addEventListener("servicehub:langchange", () => {
    initReveal();
  });

  // back/forward cache support
  window.addEventListener("pageshow", () => {
    initReveal();
  });
})();