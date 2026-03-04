// server.js
// ServiceHub AI backend (Ollama) + Static Hosting
// - Serves frontend from ./public (optional, see STATIC_DIR)
// - POST /api/chat  -> returns 1 short paragraph + 1 follow-up question (BM/EN)
// - GET  /api/health
//
// ✅ Works for:
// - Local: http://localhost:3000 (no Live Server needed)
// - Deploy: one host for frontend + backend
//
// NOTE: If you deploy to cloud but DON'T install Ollama there,
// /api/chat will fallback to directory-based replies (still works, but no LLM).

const express = require("express");
const cors = require("cors");
const path = require("path");

// ---------- CONFIG ----------
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Ollama default local server
const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "phi3:mini";

// Static frontend folder (put your HTML/CSS/JS in /public)
const STATIC_DIR = process.env.STATIC_DIR || "public";

// In production, set your domain in ALLOWED_ORIGINS (optional)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// ---------- FETCH (Node compatibility) ----------
let _fetch = global.fetch;
async function getFetch() {
  if (_fetch) return _fetch;

  // If running Node < 18 or fetch not available
  try {
    const mod = await import("node-fetch");
    _fetch = mod.default;
    return _fetch;
  } catch (e) {
    throw new Error(
      "fetch is not available. Use Node 18+ OR install node-fetch: npm i node-fetch"
    );
  }
}

// ---------- APP ----------
const app = express();

// ---------- CORS ----------
/**
 * ✅ Local dev:
 *   - allow localhost origins
 * ✅ Deploy:
 *   - if ALLOWED_ORIGINS provided, only allow those
 *   - else allow all (safe enough for demo, but you can restrict later)
 */
const defaultDevOrigins = new Set([
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (curl/postman) with no origin
      if (!origin) return cb(null, true);

      // if user set explicit allowlist in env
      if (ALLOWED_ORIGINS.length) {
        return cb(null, ALLOWED_ORIGINS.includes(origin));
      }

      // dev allowlist + allow same-origin deploy
      if (defaultDevOrigins.has(origin)) return cb(null, true);

      // If no allowlist provided, allow all (good for demo)
      return cb(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

// ---------- BASIC RATE LIMIT (simple, in-memory) ----------
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 15000); // 15s
const RATE_MAX = Number(process.env.RATE_MAX || 30); // 30 requests / window / IP
const _rate = new Map();

function rateLimit(req, res, next) {
  const ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown";

  const now = Date.now();
  const rec = _rate.get(ip) || { t: now, n: 0 };

  if (now - rec.t > RATE_WINDOW_MS) {
    rec.t = now;
    rec.n = 0;
  }

  rec.n += 1;
  _rate.set(ip, rec);

  if (rec.n > RATE_MAX) {
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }

  next();
}

// ---------- STATIC FRONTEND ----------
/**
 * Put all your static files in /public:
 * public/homePage.html, public/servicesPage.html, public/common.css, public/assets/...
 *
 * Then you can open:
 *   http://localhost:3000/homePage.html
 * or set a default homepage below.
 */
app.use(express.static(path.join(__dirname, STATIC_DIR)));

// Optional: default route to homePage.html (change if you want index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, STATIC_DIR, "homePage.html"));
});

// ---------- HELPERS ----------
function safeStr(x, max = 6000) {
  const s = String(x ?? "");
  return s.length > max ? s.slice(0, max) : s;
}

function pickLang(uiLang, userText) {
  const L = String(uiLang || "").toLowerCase();
  if (L === "bm" || L === "ms") return "bm";
  const t = String(userText || "").toLowerCase();
  const bmHint =
    /\b(apa|nak|cari|harga|murah|terbaik|ulasan|kawasan|dekat|sekitar|tolong|bagi|info|servis|dobi|kereta|sewa|mana)\b/.test(
      t
    );
  return bmHint ? "bm" : "en";
}

function buildDirectorySummary(local) {
  const detected = local?.detected || {};
  const matches = Array.isArray(local?.matches) ? local.matches : [];

  const lines = [];
  lines.push(
    `Detected: intent=${detected.intent || ""}, area=${detected.area || ""}, category=${
      detected.category || ""
    }, sort=${detected.sort || ""}`
  );
  lines.push(`Matches (${matches.length}):`);

  for (let i = 0; i < Math.min(matches.length, 5); i++) {
    const s = matches[i] || {};
    lines.push(
      `${i + 1}. ${safeStr(s.name, 140)} | ${safeStr(s.category, 60)} | ${safeStr(
        s.area,
        40
      )} | price=${safeStr(s.price, 40)}`
    );
  }

  return lines.join("\n");
}

function followupQuestion(lang, detected) {
  const sort = String(detected?.sort || "");
  const hasArea = Boolean(detected?.area);

  if (lang === "bm") {
    if (sort === "cheapest")
      return "Nak saya susun ikut paling murah saja, atau tambah pilihan lain juga?";
    if (sort === "best") return "Nak saya fokus yang paling tinggi ulasan, atau yang paling dekat?";
    if (!hasArea) return "Kawasan mana ya—Batu Pahat, Parit Raja, atau Sri Gading?";
    return "Nak yang murah, yang paling dekat, atau yang paling terbaik ulasan?";
  }

  if (sort === "cheapest")
    return "Want me to sort by cheapest only, or include a few other options too?";
  if (sort === "best") return "Do you want best-rated, or the closest options for your area?";
  if (!hasArea) return "Which area—Batu Pahat, Parit Raja, or Sri Gading?";
  return "Do you want the cheapest, the nearest, or the best-rated?";
}

function buildSystemPrompt(lang) {
  if (lang === "bm") {
    return (
      "Anda ialah pembantu AI untuk laman ServiceHub (direktori servis tempatan). " +
      "Jawab dalam Bahasa Melayu yang mesra dan profesional. " +
      "Gunakan MAKLUMAT 'DIRECTORY' yang diberi sebagai sumber utama. " +
      "JANGAN cipta servis baru yang tiada dalam DIRECTORY. " +
      "Output MESTI: (1) satu perenggan pendek sahaja (maks 3 ayat), (2) satu soalan susulan ringkas pada baris baru. " +
      "Jangan guna senarai bernombor/bullets."
    );
  }

  return (
    "You are the AI assistant for the ServiceHub website (local services directory). " +
    "Reply in English, friendly and professional. " +
    "Use the provided DIRECTORY info as your primary source. " +
    "DO NOT invent services that are not in DIRECTORY. " +
    "Output MUST be: (1) one short paragraph only (max 3 sentences), (2) one short follow-up question on a new line. " +
    "No bullet points, no numbered lists."
  );
}

async function ollamaChat({ model, system, user }) {
  const fetch = await getFetch();

  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    options: {
      temperature: 0.6,
      top_p: 0.9,
      num_predict: 160,
    },
    stream: false,
  };

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error || json?.message || `Ollama HTTP ${res.status}`;
    throw new Error(msg);
  }

  const content = json?.message?.content ?? "";
  return String(content || "").trim();
}

function fallbackReply({ lang, local }) {
  const detected = local?.detected || {};
  const matches = Array.isArray(local?.matches) ? local.matches : [];
  const q = followupQuestion(lang, detected);

  if (lang === "bm") {
    if (matches.length) {
      const a = detected.area ? ` di ${detected.area}` : "";
      const c = detected.category ? ` untuk kategori ${detected.category}` : "";
      return `Baik—saya jumpa beberapa pilihan servis${a}${c}. Saya boleh bantu sempitkan pilihan ikut keutamaan anda.\n${q}`;
    }
    return `Baik—saya belum jumpa padanan yang jelas dalam direktori. Cuba bagi kategori atau kawasan supaya saya boleh cadangkan yang sesuai.\n${q}`;
  }

  if (matches.length) {
    const a = detected.area ? ` in ${detected.area}` : "";
    const c = detected.category ? ` for ${detected.category}` : "";
    return `Got it—I've found a few service options${a}${c}. I can narrow them down based on what matters to you.\n${q}`;
  }
  return `I couldn’t find a clear match in the directory yet. Try adding a category or area so I can recommend the right options.\n${q}`;
}

// ---------- ROUTES ----------
app.get("/api/health", async (req, res) => {
  try {
    const fetch = await getFetch();
    const r = await fetch(`${OLLAMA_BASE}/api/tags`);
    const ok = r.ok;
    res.json({
      ok: true,
      ollama: ok,
      model: OLLAMA_MODEL,
      ollama_base: OLLAMA_BASE,
    });
  } catch (e) {
    res.json({
      ok: true,
      ollama: false,
      model: OLLAMA_MODEL,
      ollama_base: OLLAMA_BASE,
      error: String(e?.message || e),
    });
  }
});

app.get("/api/chat", (req, res) => {
  res.status(200).send("OK. Use POST /api/chat with JSON body.");
});

/**
 * Expected POST body from chatWidget.js:
 * {
 *   userText: string,
 *   uiLang: "en" | "bm",
 *   memory: { lastArea?: string },
 *   local: {
 *     detected: { area, category, sort, intent },
 *     matches: [{ id, name, category, area, address, phone, whatsapp, price, mapsQuery }]
 *   }
 * }
 */
app.post("/api/chat", rateLimit, async (req, res) => {
  try {
    const userText = safeStr(req.body?.userText, 1200);
    const uiLang = req.body?.uiLang;
    const memory = req.body?.memory || {};
    const local = req.body?.local || {};
    const detected = local?.detected || {};

    const lang = pickLang(uiLang, userText);

    const directorySummary = buildDirectorySummary(local);
    const lastArea = safeStr(memory?.lastArea || "", 60);

    const system = buildSystemPrompt(lang);

    const user = [
      `USER QUESTION: ${userText}`,
      lastArea ? `MEMORY: lastArea=${lastArea}` : `MEMORY: (none)`,
      "DIRECTORY:",
      directorySummary,
      "",
      "INSTRUCTIONS:",
      "Use DIRECTORY matches to answer. If 0 matches, ask for category/area. Keep it short.",
    ].join("\n");

    let reply = "";
    try {
      reply = await ollamaChat({
        model: OLLAMA_MODEL,
        system,
        user,
      });
    } catch (e) {
      // fallback if Ollama is not reachable
      reply = fallbackReply({ lang, local });
    }

    // Ensure follow-up question line exists
    const q = followupQuestion(lang, detected);
    const trimmed = String(reply || "").trim();

    // If model output doesn't end with '?', append follow-up line
    if (!/\?\s*$/.test(trimmed)) {
      reply = (trimmed + "\n" + q).trim();
    } else {
      reply = trimmed;
    }

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err?.message || err);
    res.status(500).json({ error: err?.message || "Server error" });
  }
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Serving static from ./${STATIC_DIR}`);
  console.log(`✅ Using Ollama at ${OLLAMA_BASE} (model: ${OLLAMA_MODEL})`);
});