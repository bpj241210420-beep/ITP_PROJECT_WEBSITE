// servicesPagemain.js - robust render + filter + open details + dynamic rating sort + i18n + reveal
// + ✅ SAVE FILTERED STATE so Details "Back" returns to filtered services
// + ✅ Sync filters into URL (so refresh/back keep state)
// + ✅ FIX IMAGE PATH (assets/ vs ../assets/) + fallback image

document.addEventListener("DOMContentLoaded", () => {
  // --- ServiceHub: autofill filters from URL / localStorage ---
// ✅ Apply filters from URL params
(function applyFromUrl(){
  const sp = new URLSearchParams(location.search);
  const q = sp.get("q") || "";
  const cat = sp.get("cat") || "";
  const area = sp.get("area") || "";
  const sort = sp.get("sort") || "";

  const qEl = document.getElementById("q");
  const catEl = document.getElementById("cat");
  const areaEl = document.getElementById("area");
  const sortEl = document.getElementById("sort");
  const applyBtn = document.getElementById("apply");

  if (qEl && q) qEl.value = q;
  if (areaEl && area) areaEl.value = area;

  // cat dropdown mungkin populate async → try few times
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (catEl && cat) {
      const opt = Array.from(catEl.options || []).find(o => (o.value || o.textContent) === cat);
      if (opt) catEl.value = opt.value;
    }
    if (sortEl && sort) sortEl.value = sort;

    if (applyBtn && (q || cat || area || sort || tries > 12)) {
      clearInterval(timer);
      applyBtn.click();
    }
  }, 120);
})();

(function () {
  function getParam(name) {
    return new URLSearchParams(location.search).get(name) || "";
  }

  const fromUrl = {
    q: getParam("q"),
    cat: getParam("cat"),
    area: getParam("area"),
    sort: getParam("sort"),
  };

  let fromStorage = {};
  try {
    fromStorage = JSON.parse(localStorage.getItem("sh_services_autofill") || "{}");
  } catch {}

  const payload = {
    q: fromUrl.q || fromStorage.q || "",
    cat: fromUrl.cat || fromStorage.cat || "",
    area: fromUrl.area || fromStorage.area || "",
    sort: fromUrl.sort || fromStorage.sort || "",
  };

  // Fill inputs if they exist
  const qEl = document.getElementById("q");
  const catEl = document.getElementById("cat");
  const areaEl = document.getElementById("area");
  const sortEl = document.getElementById("sort");

  if (qEl && payload.q) qEl.value = payload.q;
  if (areaEl && payload.area) areaEl.value = payload.area;
  if (sortEl && payload.sort) sortEl.value = payload.sort;

  // category select may not be populated yet; wait a bit
  if (catEl && payload.cat) {
    const trySet = () => {
      const opts = Array.from(catEl.options || []);
      const found = opts.find((o) => String(o.value) === payload.cat || String(o.textContent) === payload.cat);
      if (found) catEl.value = found.value;
    };
    setTimeout(trySet, 50);
    setTimeout(trySet, 250);
    setTimeout(trySet, 600);
  }

  // Auto apply if Apply button exists
  const applyBtn = document.getElementById("apply");
  if (applyBtn && (payload.q || payload.cat || payload.area || payload.sort)) {
    setTimeout(() => applyBtn.click(), 350);
  }
})();

function LANG(){
    return (window.SH_LANG && window.SH_LANG()) || document.documentElement.getAttribute("data-lang") || "en";
  }
  function T(obj){
    if (window.SH_T) return window.SH_T(obj);
    return (LANG() === "bm" && obj?.bm) ? obj.bm : (obj?.en || "");
  }

  const elGrid  = document.getElementById("grid");
  const elCount = document.getElementById("count");

  const q     = document.getElementById("q");
  const cat   = document.getElementById("cat");
  const area  = document.getElementById("area");
  const sort  = document.getElementById("sort");
  const apply = document.getElementById("apply");
  const reset = document.getElementById("reset");

  if (!elGrid) {
    console.error("[servicesPagemain] Missing #grid element in servicesPage.html");
    return;
  }

  const data = Array.isArray(window.SERVICE_DATA) ? window.SERVICE_DATA : [];
  const cats = Array.isArray(window.SERVICE_CATEGORIES) ? window.SERVICE_CATEGORIES : ["All categories"];

  if (cat) {
    cat.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join("");
  }

  function normalize(s){ return (s || "").toLowerCase(); }

  // ✅ detect base assets path (works in /ServiceHub/ folder)
  function assetBase(){
    const p = String(location.pathname || "").replaceAll("\\", "/");
    return p.includes("/ServiceHub/") ? "../assets/" : "assets/";
  }

  // ✅ convert "assets/xxx.jpg" -> correct base + filename only
  function resolveAsset(path){
    const base = assetBase();
    const p = String(path || "").replaceAll("\\", "/").trim();

    // if already absolute http(s)
    if (/^https?:\/\//i.test(p)) return p;

    // keep filename only (remove any folder like assets/)
    const file = p.split("/").filter(Boolean).pop() || "";
    if (!file) return "";

    return encodeURI(base + file);
  }

  // ✅ fallback image if missing
  function fallbackByCategory(category){
    const base = assetBase();
    const c = String(category || "").toLowerCase();
    if (c.includes("laundry")) return encodeURI(base + "previewtwo.webp");
    if (c.includes("food")) return encodeURI(base + "previewthree.jpg");
    return encodeURI(base + "previewone.jpg");
  }

  const LAST_SERVICES_URL_KEY = "servicehub_last_services_url";

  function buildServicesUrlFromUI(){
    if (!q || !cat || !area || !sort) return "servicesPage.html";

    const params = new URLSearchParams();
    const kw = (q.value || "").trim();
    const c  = (cat.value || "").trim();
    const a  = (area.value || "").trim();
    const s  = (sort.value || "").trim();

    if (kw) params.set("q", kw);
    if (c && c !== "All categories") params.set("cat", c);
    if (a) params.set("area", a);
    if (s && s !== "name") params.set("sort", s);

    const qs = params.toString();
    return qs ? `servicesPage.html?${qs}` : "servicesPage.html";
  }

  function syncUrlFromUI(push){
    const url = buildServicesUrlFromUI();
    if (push) history.pushState({}, "", url);
    else history.replaceState({}, "", url);
  }

  function applyQueryParamsToUI(){
    const params = new URLSearchParams(location.search);

    if (q && params.get("q")) q.value = params.get("q");
    if (cat && params.get("cat")) cat.value = params.get("cat");
    if (area && params.get("area")) area.value = params.get("area");

    if (sort && params.get("sort")) {
      const sv = String(params.get("sort") || "").toLowerCase();
      const allowed = ["name", "cat", "rating", "reviews"];
      if (allowed.includes(sv)) sort.value = (sv === "reviews") ? "rating" : sv;
    }
  }

  applyQueryParamsToUI();

  // reveal
  let io = null;
  function initReveal(){
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(el => el.classList.add("is-visible"));
      return;
    }

    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach(el => {
      if (!el.classList.contains("is-visible")) io.observe(el);
    });
  }

  // rating
  function loadReviewsFor(serviceId){
    const KEY = `servicehub_reviews_${serviceId}`;
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }

  function getRatingStats(serviceId){
    const list = loadReviewsFor(serviceId);
    const count = list.length;
    if (!count) return { avg: 0, count: 0 };
    const sum = list.reduce((acc, r) => acc + (Number(r.stars) || 0), 0);
    return { avg: sum / count, count };
  }

  function formatAvg(avg){
    return (Math.round(avg * 10) / 10).toFixed(1);
  }

  function render(list){
    if (!Array.isArray(window.SERVICE_DATA)) {
      elGrid.innerHTML = `
        <div class="card" style="padding:16px;">
          <div style="font-weight:900; margin-bottom:6px;">
            ${T({ en:"Data not loaded", bm:"Data tidak dimuat" })}
          </div>
          <div class="muted" style="line-height:1.6;">
            ${T({
              en:"servicesData.js not loaded or SERVICE_DATA not defined. Check file path/name in HTML and console errors.",
              bm:"servicesData.js tidak dimuat atau SERVICE_DATA tidak wujud. Semak path/nama file dalam HTML dan error di console."
            })}
          </div>
        </div>
      `;
      if (elCount) elCount.textContent = T({ en:"0 result(s)", bm:"0 hasil" });
      console.error("[servicesPagemain] SERVICE_DATA missing. Make sure <script defer src='servicesData.js'> loads without error.");
      return;
    }

    if (!data.length) {
      elGrid.innerHTML = `
        <div class="card" style="padding:16px;">
          <div style="font-weight:900; margin-bottom:6px;">
            ${T({ en:"No services found", bm:"Tiada servis" })}
          </div>
          <div class="muted" style="line-height:1.6;">
            ${T({
              en:"SERVICE_DATA is empty. Add services inside servicesData.js.",
              bm:"SERVICE_DATA kosong. Tambah senarai servis dalam servicesData.js."
            })}
          </div>
        </div>
      `;
      if (elCount) elCount.textContent = T({ en:"0 result(s)", bm:"0 hasil" });
      return;
    }

    if (!list.length){
      elGrid.innerHTML = `
        <div class="card" style="padding:16px;">
          <div style="font-weight:900; margin-bottom:6px;">
            ${T({ en:"No results found", bm:"Tiada hasil dijumpai" })}
          </div>
          <div class="muted" style="line-height:1.6;">
            ${T({
              en:"Try changing keyword, category, or area filter.",
              bm:"Cuba tukar kata kunci, kategori, atau penapis kawasan."
            })}
          </div>
        </div>
      `;
    } else {
      elGrid.innerHTML = list.map(s => {
        const rs = getRatingStats(s.id);

        const ratingTitle = rs.count
          ? T({
              en: `${formatAvg(rs.avg)} / 5 from ${rs.count} review(s)`,
              bm: `${formatAvg(rs.avg)} / 5 daripada ${rs.count} ulasan`
            })
          : T({ en: "No reviews yet", bm: "Belum ada ulasan" });

        const ratingHtml = `
          <span class="rating-pill" title="${ratingTitle}">
            <span class="star">★</span>
            <span class="val">${rs.count ? formatAvg(rs.avg) : "—"}</span>
            <span class="count">(${rs.count || 0})</span>
          </span>
        `;

        const imgSrc = resolveAsset(s.image) || fallbackByCategory(s.category);

        return `
          <article class="card svc reveal" data-id="${s.id}">
            <img class="svc-img"
                 src="${imgSrc}"
                 alt="${s.name}"
                 loading="lazy"
                 onerror="this.onerror=null;this.src='${fallbackByCategory(s.category)}';">
            <div class="svc-top">
              <div class="svc-title">${s.name}</div>
              ${ratingHtml}
            </div>

            <p class="svc-sub">
              <strong>${s.category}</strong> • ${s.area}<br/>
              ${s.address}
            </p>

            <div class="badges">
              ${(s.tags||[]).slice(0,3).map(t => `<span class="badge">${t}</span>`).join("")}
              <span class="badge">${s.price || "RM"}</span>
            </div>
          </article>
        `;
      }).join("");
    }

    if (elCount){
      elCount.textContent = T({
        en: `${list.length} result(s)`,
        bm: `${list.length} hasil`
      });
    }

    elGrid.querySelectorAll(".svc").forEach(cardEl => {
      cardEl.addEventListener("click", () => {
        const id = cardEl.getAttribute("data-id");
        localStorage.setItem("servicehub_selected", id);
        localStorage.setItem(LAST_SERVICES_URL_KEY, window.location.href);
        location.href = `serviceDetailsPage.html?id=${encodeURIComponent(id)}`;
      });
    });

    initReveal();
  }

  function applyFilters(opts = { updateUrl: false, pushHistory: false }){
    if (!q || !cat || !area || !sort) {
      console.warn("[servicesPagemain] Some filter controls missing. Rendering full list.");
      render(data.slice());
      return;
    }

    const kw = normalize(q.value);
    const c  = cat.value;
    const a  = normalize(area.value);

    const srtRaw = (sort.value || "").toLowerCase();
    const srt = (srtRaw === "reviews") ? "rating" : srtRaw;

    let list = data.slice();

    if (kw){
      list = list.filter(x => {
        const blob = normalize(`${x.name} ${x.category} ${x.area} ${x.address} ${x.description} ${(x.tags||[]).join(" ")}`);
        return blob.includes(kw);
      });
    }
    if (c && c !== "All categories"){
      list = list.filter(x => x.category === c);
    }
    if (a){
      list = list.filter(x => normalize(`${x.area} ${x.address}`).includes(a));
    }

    if (srt === "name"){
      list.sort((x,y) => x.name.localeCompare(y.name));
    } else if (srt === "cat"){
      list.sort((x,y) => x.category.localeCompare(y.category));
    } else if (srt === "rating"){
      list.sort((x,y) => {
        const rx = getRatingStats(x.id);
        const ry = getRatingStats(y.id);
        if (ry.avg !== rx.avg) return ry.avg - rx.avg;
        if (ry.count !== rx.count) return ry.count - rx.count;
        return x.name.localeCompare(y.name);
      });
    }

    if (opts.updateUrl) syncUrlFromUI(!!opts.pushHistory);
    render(list);
  }

  apply?.addEventListener("click", () => applyFilters({ updateUrl: true, pushHistory: true }));

  reset?.addEventListener("click", () => {
    if (q) q.value = "";
    if (cat) cat.value = "All categories";
    if (area) area.value = "";
    if (sort) sort.value = "name";
    history.pushState({}, "", "servicesPage.html");
    applyFilters({ updateUrl: false });
  });

  window.addEventListener("popstate", () => {
    applyQueryParamsToUI();
    applyFilters({ updateUrl: false });
  });

  window.addEventListener("focus", () => applyFilters({ updateUrl: false }));
  window.addEventListener("servicehub:langchange", () => applyFilters({ updateUrl: false }));

  applyFilters({ updateUrl: false });
});