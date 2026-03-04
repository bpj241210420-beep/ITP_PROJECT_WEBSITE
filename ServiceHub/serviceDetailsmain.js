// serviceDetailsmain.js - service details + maps + reviews + delete (owner only) + i18n sync + reveal + REPORT SERVICE
// + ✅ BACK TO FILTERED SERVICES (uses saved services URL)
// + ✅ image fallback if missing/broken

document.addEventListener("DOMContentLoaded", () => {
  try {
    // ---- i18n helpers (read from common.js) ----
    function LANG(){
      return (window.SH_LANG && window.SH_LANG()) || document.documentElement.getAttribute("data-lang") || "en";
    }
    function T(obj){
      if (window.SH_T) return window.SH_T(obj);
      return (LANG() === "bm" && obj?.bm) ? obj.bm : (obj.en || "");
    }

    function escapeHtml(s){
      return String(s || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    // ✅ Back button returns to last filtered Services page
    (function () {
      const LAST_SERVICES_URL_KEY = "servicehub_last_services_url";

      const a =
        document.getElementById("backToServices") ||
        document.querySelector("a.back");

      if (!a) return;

      const saved = localStorage.getItem(LAST_SERVICES_URL_KEY) || "";
      if (saved && typeof saved === "string" && saved.includes("servicesPage.html")) {
        a.href = saved;
      } else {
        a.href = "servicesPage.html";
      }
    })();

    // ---- reveal init ----
    function initReveal(){
      const items = document.querySelectorAll(".reveal");
      if (!items.length) return;

      // fail-safe
      if (!("IntersectionObserver" in window)) {
        items.forEach(el => el.classList.add("is-visible"));
        return;
      }

      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12 });

      items.forEach(el => io.observe(el));
    }

    // Fill global category dropdown (safe)
    const cats = window.SERVICE_CATEGORIES || ["All categories"];
    const globalCat = document.getElementById("globalCat");
    if (globalCat && !globalCat.options.length) {
      globalCat.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    }

    const details = document.getElementById("details");
    const mapWrap = document.getElementById("mapWrap");
    const dirBtn = document.getElementById("dirBtn");

    if (!details || !mapWrap || !dirBtn) {
      console.error("Missing required elements: #details / #mapWrap / #dirBtn");
      return;
    }

    // Get service id
    const params = new URLSearchParams(location.search);
    const id = params.get("id") || localStorage.getItem("servicehub_selected") || "";
    const data = window.SERVICE_DATA || [];
    const service = data.find(x => x.id === id);

    // Reviews storage key
    const KEY = service ? `servicehub_reviews_${service.id}` : "";
    let selectedStars = 0;

    // ✅ OWNER ID (per device/browser)
    const OWNER_KEY = "servicehub_owner_id";
    function getOwnerId(){
      let oid = localStorage.getItem(OWNER_KEY);
      if (!oid) {
        oid = (crypto?.randomUUID?.() || ("oid_" + Math.random().toString(16).slice(2) + Date.now()));
        localStorage.setItem(OWNER_KEY, oid);
      }
      return oid;
    }
    const OWNER_ID = getOwnerId();

    function loadReviews() {
      try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
      catch { return []; }
    }
    function saveReviews(list) {
      localStorage.setItem(KEY, JSON.stringify(list));
    }

    function formatDate(ts){
      try {
        return new Date(ts).toLocaleString(LANG() === "bm" ? "ms-MY" : "en-US");
      } catch {
        return new Date(ts).toLocaleString();
      }
    }

    // Stars UI
    function renderStars() {
      const starsWrap = document.getElementById("stars");
      if (!starsWrap) return;

      starsWrap.innerHTML = "";
      for (let i = 1; i <= 5; i++) {
        const b = document.createElement("button");
        b.className = "star" + (i <= selectedStars ? " on" : "");
        b.type = "button";
        b.textContent = "★";
        b.setAttribute("aria-label", `${i} star`);
        b.addEventListener("click", () => {
          selectedStars = i;
          renderStars();
        });
        starsWrap.appendChild(b);
      }
    }

    function canDeleteReview(r){
      return r && r.ownerId && r.ownerId === OWNER_ID;
    }

    function renderReviews() {
      const reviewsEl = document.getElementById("reviews");
      if (!reviewsEl) return;
      if (!service) return;

      const list = loadReviews();

      if (!list.length) {
        reviewsEl.innerHTML = `<p class="muted">${T({
          en: "No reviews yet. Be the first!",
          bm: "Belum ada ulasan. Jadilah yang pertama!"
        })}</p>`;
        return;
      }

      reviewsEl.innerHTML = list.map((r, i) => {
        const ownerLine = r.ownerName
          ? `<div class="muted" style="font-size:12px; margin-top:4px;">${T({ en:"By", bm:"Oleh" })}: ${escapeHtml(r.ownerName)}</div>`
          : "";

        const deleteBtn = canDeleteReview(r)
          ? `<button class="delete-review" type="button" data-index="${i}">
               ${T({ en: "Delete", bm: "Padam" })}
             </button>`
          : "";

        const stars = Math.max(0, Math.min(5, Number(r.stars) || 0));

        return `
          <div class="review">
            <div class="review-top">
              <strong>
                ${"★".repeat(stars)}${"☆".repeat(5 - stars)} • ${escapeHtml(formatDate(r.time))}
              </strong>
              ${deleteBtn}
            </div>
            ${ownerLine}
            <p>${escapeHtml(r.text)}</p>
          </div>
        `;
      }).join("");

      reviewsEl.querySelectorAll(".delete-review").forEach(btn => {
        btn.addEventListener("click", () => {
          const index = Number(btn.getAttribute("data-index"));
          const list2 = loadReviews();
          const target = list2[index];

          if (!canDeleteReview(target)) {
            alert(T({
              en: "You can only delete reviews you posted on this device.",
              bm: "Anda hanya boleh padam ulasan yang anda post pada peranti ini."
            }));
            return;
          }

          const ok = confirm(T({
            en: "Delete this review?",
            bm: "Padam ulasan ini?"
          }));
          if (!ok) return;

          list2.splice(index, 1);
          saveReviews(list2);
          renderReviews();
        });
      });
    }

    // ✅ REPORT LINK (relative path)
    function buildReportHref(svc){
      const qs = new URLSearchParams();
      qs.set("type", "report");
      qs.set("serviceId", svc.id || "");
      qs.set("serviceName", svc.name || "");
      qs.set("serviceUrl", window.location.href);
      return `contactPage.html?${qs.toString()}`;
    }

    function safeWaDigits(wa){
      const digits = String(wa || "").replace(/\D/g, "");
      // wa.me expects digits only
      return digits;
    }

    function renderPage(){
      if (!service) {
        details.innerHTML = `
          <div style="padding:18px;">
            <h2>${T({ en: "Not found", bm: "Tidak dijumpai" })}</h2>
            <p>${T({
              en: "Service not found. Go back to Services.",
              bm: "Servis tidak dijumpai. Sila kembali ke halaman Servis."
            })}</p>
          </div>
        `;
        return;
      }

      const tagsHtml = (service.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
      const phone = service.phone || "—";
      const waDigits = safeWaDigits(service.whatsapp || "");

      details.innerHTML = `
        <div>
          <img
            class="dimg"
            src="${escapeHtml(service.image || "")}"
            alt="${escapeHtml(service.name || "")}"
            onerror="this.onerror=null;this.src='assets/directory.jpeg';"
          >
        </div>

        <div>
          <h2 class="dtitle">${escapeHtml(service.name)}</h2>

          <p class="dmeta">
            <strong>${escapeHtml(service.category)}</strong> • ${escapeHtml(service.area)}<br>${escapeHtml(service.address)}
          </p>

          <div class="tags">
            ${tagsHtml}
            <span class="tag">${escapeHtml(service.price || "RM")}</span>
            <span class="tag">${T({ en: "Verified (demo)", bm: "Disahkan (demo)" })}</span>
            <span class="tag">${T({ en: "Student Discount (demo)", bm: "Diskaun Pelajar (demo)" })}</span>
          </div>

          <p class="dmeta">${escapeHtml(service.description || "")}</p>

          <div class="actions">
            ${
              service.phone
                ? `<a class="btn" href="tel:${escapeHtml(service.phone)}">${T({ en:"Call", bm:"Telefon" })}</a>`
                : `<button class="btn" type="button" disabled>${T({ en:"Call", bm:"Telefon" })}</button>`
            }

            ${
              waDigits
                ? `<a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${waDigits}">WhatsApp</a>`
                : `<button class="btn wa" type="button" disabled>WhatsApp</button>`
            }

            <button class="btn" type="button" id="copyBtn" data-copy="${escapeHtml(service.phone || "")}">
              ${T({ en:"Copy phone", bm:"Salin nombor" })}
            </button>

            <button class="btn" type="button" id="printBtn">
              ${T({ en:"Print", bm:"Cetak" })}
            </button>

            <a class="btn danger" id="reportBtn" href="${escapeHtml(buildReportHref(service))}">
              ${T({ en:"Report", bm:"Lapor" })}
            </a>
          </div>

          <p class="dmeta"><strong>${T({ en:"Phone:", bm:"Telefon:" })}</strong> ${escapeHtml(phone)}</p>
        </div>
      `;

      // Copy phone
      document.getElementById("copyBtn")?.addEventListener("click", async (e) => {
        const num = e.currentTarget.getAttribute("data-copy") || "";
        if (!num) return alert(T({
          en: "No phone number saved yet for this provider.",
          bm: "Nombor telefon untuk penyedia ini belum disimpan."
        }));

        try {
          await navigator.clipboard.writeText(num);
          alert(T({ en: "Copied: ", bm: "Disalin: " }) + num);
        } catch {
          alert(T({ en: "Copy failed. Please copy manually: ", bm: "Gagal salin. Sila salin manual: " }) + num);
        }
      });

      // Print
      document.getElementById("printBtn")?.addEventListener("click", () => window.print());

      // Maps embed
      const qMaps = encodeURIComponent(service.mapsQuery || `${service.name} ${service.address}`);
      mapWrap.innerHTML = `
        <iframe
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=${qMaps}&output=embed">
        </iframe>
      `;
      dirBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${qMaps}`;

      // i18n for review UI
      const reviewText = document.getElementById("reviewText");
      const addReview = document.getElementById("addReview");
      const reviewName = document.getElementById("reviewName");
      if (reviewText) reviewText.setAttribute("placeholder", T({ en:"Write your review...", bm:"Tulis ulasan anda..." }));
      if (reviewName) reviewName.setAttribute("placeholder", T({ en:"Your name (for ownership)", bm:"Nama anda (untuk pemilik)" }));
      if (addReview) addReview.textContent = T({ en:"Add review", bm:"Tambah ulasan" });

      renderReviews();
    }

    // Add review handler
    const addReviewBtn = document.getElementById("addReview");
    const reviewTextEl = document.getElementById("reviewText");
    const reviewNameEl = document.getElementById("reviewName");

    addReviewBtn?.addEventListener("click", () => {
      if (!service) return;

      const text = (reviewTextEl?.value || "").trim();
      const ownerName = (reviewNameEl?.value || "").trim();

      if (!selectedStars) return alert(T({ en:"Please select stars first.", bm:"Sila pilih bintang dahulu." }));
      if (!text) return alert(T({ en:"Please write a review.", bm:"Sila tulis ulasan." }));

      if (reviewNameEl && !ownerName) {
        const ok = confirm(T({
          en: "No name entered. Post review anyway?",
          bm: "Nama belum diisi. Nak teruskan post?"
        }));
        if (!ok) return;
      }

      const list = loadReviews();
      list.unshift({
        stars: selectedStars,
        text,
        time: Date.now(),
        ownerId: OWNER_ID,
        ownerName: ownerName || ""
      });
      saveReviews(list);

      if (reviewTextEl) reviewTextEl.value = "";
      selectedStars = 0;
      renderStars();
      renderReviews();
    });

    // init
    renderStars();
    renderPage();
    initReveal();

    // language change sync
    window.addEventListener("servicehub:langchange", () => {
      renderPage();
    });

  } catch (err) {
    console.error("serviceDetailsmain.js crashed:", err);
  }
});