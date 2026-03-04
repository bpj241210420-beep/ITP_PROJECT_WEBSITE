// chatWidget.js (FULL)
// - 1 perenggan pendek (conversational) + cards (compact)
// - auto BM/EN
// - detect category/area/sort (cheapest/best/nearest)
// - remember lastArea (localStorage)
// - send local directory context to backend (/api/chat) for Ollama paragraph

(function () {
  // -----------------------------
  // Language helpers
  // -----------------------------
  function SITE_LANG() {
    return (
      (window.SH_LANG && window.SH_LANG()) ||
      document.documentElement.getAttribute("data-lang") ||
      "en"
    );
  }

  function isBMText(s) {
    const t = String(s || "").toLowerCase();
    return /\b(apa|nak|cari|harga|murah|terbaik|ulasan|kawasan|dekat|sekitar|tolong|bagi|info|servis|dobi|kereta|sewa|pindah|lori|tuisyen|alat tulis|kedai|mana|berapa|boleh)\b/.test(
      t
    );
  }

  function UI_LANG_FOR(text) {
    return isBMText(text) ? "bm" : SITE_LANG();
  }

  function T(obj, lang) {
    const L = lang || SITE_LANG();
    return L === "bm" && obj?.bm ? obj.bm : obj?.en || "";
  }

  // -----------------------------
  // API base
  // -----------------------------
  // -----------------------------
// API base
// -----------------------------
const API_BASE =
  (window.SERVICEHUB_API_BASE && String(window.SERVICEHUB_API_BASE).trim()) ||
  ((location.hostname === "127.0.0.1" || location.hostname === "localhost") ? "http://localhost:3000" : "");

const CHAT_ENDPOINT = API_BASE + "/api/chat";
  // -----------------------------
  // UI inject
  // -----------------------------
  const fab = document.createElement("button");
  fab.className = "chat-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Open chat");
  fab.innerHTML = `<span class="chat-ic">☁️</span>`;

  const panel = document.createElement("div");
  panel.className = "chat-panel";
  panel.setAttribute("aria-hidden", "true");

  panel.innerHTML = `
    <div class="chat-head">
      <div class="chat-title"><span class="dot"></span> ServiceHub AI</div>
      <button class="chat-close" type="button">Close</button>
    </div>
    <div class="chat-body" id="chatBody"></div>
    <div class="chat-foot">
      <input class="chat-input" id="chatInput" type="text" placeholder="Ask anything…">
      <button class="chat-send" id="chatSend" type="button">Send</button>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  const bodyEl = panel.querySelector("#chatBody");
  const inputEl = panel.querySelector("#chatInput");
  const sendEl = panel.querySelector("#chatSend");
  const closeEl = panel.querySelector(".chat-close");

  function openPanel() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    inputEl.focus();
  }

  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  }

  // -----------------------------
  // Tiny state / memory
  // -----------------------------
  const MEM_KEY = "servicehub_chat_mem_v2";
  function loadMem() {
    try {
      return JSON.parse(localStorage.getItem(MEM_KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }
  function saveMem(mem) {
    try {
      localStorage.setItem(MEM_KEY, JSON.stringify(mem || {}));
    } catch (_) {}
  }
  const mem = loadMem(); // { lastArea: "Batu Pahat" , lastLang: "en" }

  // -----------------------------
  // Utils
  // -----------------------------
  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function includesAllTokens(hay, needle) {
    const h = norm(hay);
    const tokens = norm(needle).split(" ").filter(Boolean);
    if (!tokens.length) return false;
    return tokens.every((t) => h.includes(t));
  }

  // -----------------------------
  // Service data helpers
  // -----------------------------
  function getServices() {
    return Array.isArray(window.SERVICE_DATA) ? window.SERVICE_DATA : [];
  }

  function detectArea(text) {
    const t = String(text || "").toLowerCase();
    if (/\bparit raja\b/i.test(t)) return "Parit Raja";
    if (/\bsri gading\b/i.test(t)) return "Sri Gading";
    if (/\bbatu pahat\b/i.test(t)) return "Batu Pahat";
    return "";
  }

  function keywordToCategory(text) {
    const t = norm(text);
    const map = [
      { re: /\b(car|kereta|rental|sewa|transport|booking|bas|bus|coach|jpj)\b/, cat: "Car Booking / Transport" },
      { re: /\b(laundry|dobi|iron|ironing)\b/, cat: "Laundry & Ironing" },
      { re: /\b(print|printing|photocopy|stationery|alat tulis)\b/, cat: "Printing & Stationery" },
      { re: /\b(clean|cleaning|pembersihan)\b/, cat: "Cleaning Services" },
      { re: /\b(repair|bengkel|service|servis|tyre|tayar|plumber|paip|phone|telefon|laptop)\b/, cat: "Repair & Maintenance" },
      { re: /\b(tuition|tuisyen|class|kelas|tutor)\b/, cat: "Tutoring / Classes" },
      { re: /\b(delivery|runner|moving|pindah|lorry|lori|courier)\b/, cat: "Moving / Delivery" },
      { re: /\b(catering|bakery|kek|food|makanan|dessert)\b/, cat: "Food & Catering" },
    ];
    const hit = map.find((x) => x.re.test(t));
    return hit ? hit.cat : "";
  }

  function detectSort(text) {
    const t = norm(text);
    const wantsCheapest = /\b(cheapest|murah|lowest|budget|termurah)\b/.test(t);
    const wantsBestRated = /\b(best rated|best|terbaik|top rated|rating|ulasan)\b/.test(t);
    const wantsNearest = /\b(near|nearby|dekat|sekitar|paling dekat)\b/.test(t);
    return wantsCheapest ? "cheapest" : wantsBestRated ? "best" : wantsNearest ? "nearest" : "";
  }

  function parsePriceMin(priceStr) {
    const m = String(priceStr || "").replace(/,/g, "").match(/(\d+(\.\d+)?)/);
    return m ? Number(m[1]) : Infinity;
  }

  function avgRatingFromLocal(serviceId) {
    const keys = [
      `reviews:${serviceId}`,
      `servicehub_reviews:${serviceId}`,
      `reviews_${serviceId}`,
      `serviceReviews:${serviceId}`,
    ];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr) || !arr.length) return null;
        const nums = arr.map((x) => Number(x?.rating)).filter((n) => Number.isFinite(n));
        if (!nums.length) return null;
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      } catch (_) {}
    }
    return null;
  }

  function buildMapsUrl(service) {
    const q = service?.mapsQuery || service?.address || service?.name || "";
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  }
  function buildWaUrl(service) {
    const wa = String(service?.whatsapp || "").replace(/\D/g, "");
    if (!wa) return "";
    return "https://wa.me/" + wa;
  }
  function buildServicesRedirect(params) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.cat) sp.set("cat", params.cat);
    if (params.area) sp.set("area", params.area);
    if (params.sort) sp.set("sort", params.sort);
    return "servicesPage.html?" + sp.toString();
  }

  function findServiceByName(query) {
    const services = getServices();
    if (!services.length) return null;

    const qn = norm(query);
    let best = null;
    let bestScore = -1;

    for (const s of services) {
      const name = s?.name || "";
      const nn = norm(name);
      let score = 0;

      if (nn === qn) score += 100;
      if (nn.includes(qn) || qn.includes(nn)) score += 60;
      if (includesAllTokens(name, query)) score += 40;

      const words = nn.split(" ");
      if (words.some((w) => w.length >= 5 && qn.includes(w))) score += 10;

      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return bestScore >= 40 ? best : null;
  }

  function localSearch(userText) {
    const services = getServices();
    const detected = {
      lang: UI_LANG_FOR(userText),
      area: "",
      category: "",
      sort: "",
      intent: "search",
    };

    if (!services.length) return { matches: [], detected };

    detected.area = detectArea(userText) || mem.lastArea || "";
    detected.category = keywordToCategory(userText);
    detected.sort = detectSort(userText);

    // if asking info for a named service
    const named = findServiceByName(userText);
    if (named) {
      detected.intent = "info";
      return { matches: [named], detected };
    }

    let list = services.slice();

    // filter category if detected
    if (detected.category) {
      list = list.filter((x) => String(x.category || "") === detected.category);
    }

    // filter area if detected (or remembered)
    if (detected.area) {
      list = list.filter(
        (x) => String(x.area || "").toLowerCase() === String(detected.area).toLowerCase()
      );
    }

    // if user typed extra keywords, do a soft match
    const q = norm(userText);
    const weakQuery = !detected.category && !detectArea(userText) && q.length >= 3;

    if (weakQuery) {
      list = list.filter((x) => {
        const blob = [
          x.name,
          x.category,
          x.area,
          x.address,
          Array.isArray(x.tags) ? x.tags.join(" ") : "",
          x.description,
        ].join(" ");
        return includesAllTokens(blob, userText) || norm(blob).includes(q);
      });
    }

    // sort
    if (detected.sort === "cheapest") {
      list.sort((a, b) => parsePriceMin(a.price) - parsePriceMin(b.price));
    } else if (detected.sort === "best") {
      list.sort((a, b) => {
        const ra = avgRatingFromLocal(a.id) ?? -1;
        const rb = avgRatingFromLocal(b.id) ?? -1;
        return rb - ra;
      });
    } // nearest: we have no geo, so keep order

    const matches = list.slice(0, 4);
    return { matches, detected };
  }

  // -----------------------------
  // Rendering
  // -----------------------------
  function addMsg(role, htmlOrText, { asHtml } = {}) {
    const div = document.createElement("div");
    div.className = "msg " + (role === "user" ? "user" : "ai");

    if (role === "user" || !asHtml) div.textContent = String(htmlOrText || "");
    else div.innerHTML = String(htmlOrText || "");

    bodyEl.appendChild(div);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return div;
  }

  // ✅ CARD HTML (INI YANG KAU TANYA "mana ada card html")
  function cardHtml(service, lang, detected) {
    const wa = buildWaUrl(service);
    const map = buildMapsUrl(service);
    const open = buildServicesRedirect({
      q: service?.name || "",
      cat: service?.category || "",
      area: service?.area || "",
      sort: detected?.sort || "",
    });

    const phone = service?.phone ? service.phone : T({ en: "Not provided", bm: "Tiada nombor" }, lang);
    const price = service?.price ? String(service.price) : "";

    const img = service?.image
      ? `<img class="ai-card-img" src="${service.image}" alt="${escapeHtml(service?.name || "Service")}" loading="lazy">`
      : `<div class="ai-card-img" aria-hidden="true"></div>`;

    return `
      <div class="ai-card">
        <div class="ai-card-top">
          ${img}
          <div class="ai-card-main">
            <div class="ai-card-title">${escapeHtml(service?.name || "")}</div>

            <div class="ai-meta">
              ${service?.category ? `<div class="ai-chip">${escapeHtml(service.category)}</div>` : ""}
              ${service?.area ? `<div class="ai-chip">${escapeHtml(service.area)}</div>` : ""}
              ${price ? `<div class="ai-chip">${escapeHtml(price)}</div>` : ""}
            </div>

            ${service?.address ? `<div class="ai-card-addr">${escapeHtml(service.address)}</div>` : ""}

            <div class="ai-phone">
              <span class="ic">☎</span>
              <span>${escapeHtml(phone)}</span>
            </div>
          </div>
        </div>

        <div class="ai-actions">
          ${
            wa
              ? `<a class="ai-btn primary" href="${wa}" target="_blank" rel="noopener">💬 ${T({ en: "WhatsApp", bm: "WhatsApp" }, lang)}</a>`
              : `<div class="ai-btn primary" style="opacity:.55;pointer-events:none;">💬 ${T({ en: "WhatsApp", bm: "WhatsApp" }, lang)}</div>`
          }
          <a class="ai-btn" href="${map}" target="_blank" rel="noopener">📍 ${T({ en: "Map", bm: "Peta" }, lang)}</a>
          <a class="ai-btn link" href="${open}">➡ ${T({ en: "Open in Services", bm: "Buka di Services" }, lang)}</a>
        </div>
      </div>
    `;
  }

  function cardsBlockHtml(services, lang, detected) {
    const heading =
      detected.intent === "info"
        ? T({ en: "Here’s what I found:", bm: "Ini yang saya jumpa:" }, lang)
        : T({ en: "Here are some options:", bm: "Ini beberapa pilihan:" }, lang);

    const cards = (services || []).map((s) => cardHtml(s, lang, detected)).join("");

    return `
      <div class="ai-wrap">
        <div class="ai-heading">${escapeHtml(heading)}</div>
        <div class="ai-cards">${cards}</div>
      </div>
    `;
  }

  function injectCardStylesOnce() {
    if (document.getElementById("sh-ai-card-style-v2")) return;
    const style = document.createElement("style");
    style.id = "sh-ai-card-style-v2";
    style.textContent = `
      /* tighten AI bubble */
      .msg.ai{ padding: 8px 10px; }

      .ai-wrap{ display:flex; flex-direction:column; gap:8px; }
      .ai-heading{ font-weight: 950; margin: 2px 0 0; }
      .ai-cards{ display:flex; flex-direction:column; gap:10px; }

      .ai-card{
        border: 1px solid rgba(0,0,0,.08);
        background: rgba(255,255,255,.72);
        border-radius: 16px;
        padding: 10px;
        box-shadow: 0 8px 18px rgba(0,0,0,.06);
      }
      [data-theme="dark"] .ai-card{
        background: rgba(20,18,32,.38);
        border-color: rgba(255,255,255,.10);
      }

      .ai-card-top{ display:flex; gap:10px; align-items:flex-start; }
      .ai-card-img{
        width: 64px; min-width:64px; height:64px;
        border-radius: 14px; object-fit:cover;
        border: 1px solid rgba(0,0,0,.08);
        background: rgba(122,92,255,.12);
      }
      [data-theme="dark"] .ai-card-img{ border-color: rgba(255,255,255,.10); }

      .ai-card-main{ flex:1; min-width:0; }

      .ai-card-title{
        font-weight: 950; font-size: 14px; line-height: 1.2;
        margin: 0;
        display:-webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow:hidden;
      }

      .ai-meta{
        margin-top: 4px;
        display:flex; gap:6px; flex-wrap:wrap;
      }
      .ai-chip{
        font-size: 11px;
        padding: 5px 8px;
        border-radius: 999px;
        border: 1px solid rgba(0,0,0,.10);
        background: rgba(255,255,255,.55);
        color: var(--text);
        font-weight: 850;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      [data-theme="dark"] .ai-chip{
        background: rgba(255,255,255,.06);
        border-color: rgba(255,255,255,.12);
      }

      .ai-card-addr{
        margin-top: 6px;
        font-size: 12px; line-height: 1.3;
        opacity:.9;
        display:-webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow:hidden;
      }

      .ai-phone{
        margin-top: 6px;
        display:flex; gap:8px; align-items:center;
        font-weight: 900;
        font-size: 12.5px;
        opacity:.95;
      }
      .ai-phone .ic{ opacity:.85; }

      .ai-actions{
        margin-top: 8px;
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .ai-btn{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:7px;
        padding: 9px 10px;
        border-radius: 14px;
        border: 1px solid rgba(0,0,0,.10);
        background: rgba(255,255,255,.55);
        color: var(--text);
        font-weight: 950;
        text-decoration:none;
        transition: transform .12s ease, filter .12s ease;
        white-space:nowrap;
      }
      .ai-btn:hover{ transform: translateY(-1px); filter: brightness(1.03); }
      .ai-btn:active{ transform: translateY(0px) scale(.99); }

      [data-theme="dark"] .ai-btn{
        background: rgba(255,255,255,.06);
        border-color: rgba(255,255,255,.12);
      }

      .ai-btn.primary{
        border: 0;
        background: linear-gradient(135deg, var(--lav), var(--lav2));
        color: #fff;
      }

      .ai-btn.link{
        grid-column: span 2;
        background: transparent;
        border: 1px dashed rgba(0,0,0,.18);
        opacity: .9;
      }
      [data-theme="dark"] .ai-btn.link{
        border-color: rgba(255,255,255,.18);
      }
    `;
    document.head.appendChild(style);
  }

  // -----------------------------
  // Backend call (Ollama via server)
  // -----------------------------
  async function askBackend({ userText, uiLang, detected, matches }) {
    const payload = {
      userText,
      uiLang,
      memory: {
        lastArea: mem.lastArea || "",
      },
      local: {
        detected: {
          area: detected.area || "",
          category: detected.category || "",
          sort: detected.sort || "",
          intent: detected.intent || "search",
        },
        matches: (matches || []).map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          area: s.area,
          address: s.address,
          phone: s.phone,
          whatsapp: s.whatsapp,
          price: s.price,
          mapsQuery: s.mapsQuery,
        })),
      },
    };

    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return String(json?.reply || "");
  }

  function updateMemoryAfter(detected) {
    if (detected?.area) mem.lastArea = detected.area;
    if (detected?.lang) mem.lastLang = detected.lang;
    saveMem(mem);
  }

  function fallbackParagraph(lang, detected, matches) {
    const has = Array.isArray(matches) && matches.length > 0;

    if (detected.intent === "info") {
      return lang === "bm"
        ? "Baik — ini maklumat yang saya jumpa dalam direktori ServiceHub."
        : "Sure — here’s the info I found in the ServiceHub directory.";
    }

    if (has) {
      const hint =
        detected.sort === "cheapest"
          ? (lang === "bm" ? "Saya susun ikut yang termurah dulu." : "I sorted them from cheapest first.")
          : detected.sort === "best"
          ? (lang === "bm" ? "Saya susun ikut yang paling bagus dulu." : "I sorted them from best-rated first.")
          : detected.sort === "nearest"
          ? (lang === "bm" ? "Saya utamakan yang paling dekat (ikut area yang dipilih)." : "I prioritized nearby options (based on the chosen area).")
          : "";

      const follow = lang === "bm" ? "Nak yang murah, paling dekat, atau yang terbaik?" : "Do you want the cheapest, the nearest, or the best-rated?";
      return (lang === "bm"
        ? "Baik — ini beberapa cadangan servis yang saya jumpa."
        : "Sure — here are a few service options I found."
      ) + (hint ? " " + hint : "") + " " + follow;
    }

    return lang === "bm"
      ? "Saya tak jumpa yang tepat dalam direktori — cuba sebut kategori (contoh: dobi/kereta sewa/printing) dan area."
      : "I couldn’t find an exact match — try mentioning a category (laundry/car rental/printing) and an area.";
  }

  // -----------------------------
  // Send
  // -----------------------------
  injectCardStylesOnce();

  async function send() {
    const text = (inputEl.value || "").trim();
    if (!text) return;

    sendEl.disabled = true;

    const lang = UI_LANG_FOR(text);
    inputEl.value = "";
    addMsg("user", text);

    const typingEl = addMsg("assistant", T({ en: "Typing…", bm: "Sedang menaip…" }, lang));

    try {
      const { matches, detected } = localSearch(text);
      updateMemoryAfter(detected);

      // 1) Get 1 short paragraph from backend (Ollama) using local directory context
      let paragraph = "";
      try {
        paragraph = await askBackend({ userText: text, uiLang: lang, detected, matches });
      } catch (e) {
        paragraph = fallbackParagraph(lang, detected, matches);
      }

      typingEl.remove();

      // 2) Show paragraph (conversation)
      addMsg("assistant", paragraph);

      // 3) Show cards if any
      if (Array.isArray(matches) && matches.length > 0) {
        addMsg("assistant", cardsBlockHtml(matches, lang, detected), { asHtml: true });
      }

      // 4) If still no matches, give a quick hint
      if (!matches || matches.length === 0) {
        const tip =
          lang === "bm"
            ? "Tip: Cuba taip macam ni — “dobi murah batu pahat”, “kereta sewa best rated”, atau “printing parit raja”."
            : "Tip: Try — “cheap laundry batu pahat”, “best rated car rental”, or “printing parit raja”.";
        addMsg("assistant", tip);
      }
    } catch (err) {
      typingEl.remove();
      addMsg(
        "assistant",
        T(
          {
            en: "Couldn’t connect to the chat service right now. Make sure server.js is running on port 3000.",
            bm: "Tak dapat hubungi chat service sekarang. Pastikan server.js sedang berjalan pada port 3000.",
          },
          lang
        )
      );
      console.error(err);
    } finally {
      sendEl.disabled = false;
      inputEl.focus();
    }
  }

  // -----------------------------
  // Events
  // -----------------------------
  fab.addEventListener("click", () => {
    if (panel.classList.contains("open")) closePanel();
    else openPanel();
  });

  closeEl.addEventListener("click", closePanel);
  sendEl.addEventListener("click", send);

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
    if (e.key === "Escape") closePanel();
  });

  document.addEventListener("click", (e) => {
    const clickedInside = panel.contains(e.target) || fab.contains(e.target);
    if (!clickedInside && panel.classList.contains("open")) closePanel();
  });

  // i18n sync
  function syncLabels() {
    const lang = SITE_LANG();
    panel.querySelector(".chat-title").innerHTML = `<span class="dot"></span> ${escapeHtml(
      T({ en: "ServiceHub AI", bm: "AI ServiceHub" }, lang)
    )}`;
    closeEl.textContent = T({ en: "Close", bm: "Tutup" }, lang);
    inputEl.placeholder = T({ en: "Ask anything…", bm: "Tanya apa-apa…" }, lang);
    sendEl.textContent = T({ en: "Send", bm: "Hantar" }, lang);
  }
  syncLabels();
  window.addEventListener("servicehub:langchange", syncLabels);
})();