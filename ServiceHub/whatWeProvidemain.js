// whatWeProvideMain.js
console.log("✅ whatWeProvideMain.js LOADED vFIXED", new Date().toISOString());

(function () {
  // ---------- helpers ----------
  function assetUrl(file) {
    return encodeURI(`/assets/${file}`);
  }

  // ---------- CAROUSEL ----------
  const wrap = document.getElementById("provideCarousel");
  if (wrap) {
    // ✅ target only images in the frame
    const imgs = Array.from(wrap.querySelectorAll(".p-media-frame .p-media-img"));

    // set src from data-asset (absolute /assets)
    imgs.forEach((img) => {
      const file = (img.getAttribute("data-asset") || "").trim();
      if (!file) return;
      img.src = assetUrl(file);

      // optional: avoid lazy-loading delay in some browsers
      img.loading = "eager";
      img.decoding = "async";
    });

    // build list of images that actually load
    function canLoad(img) {
      return new Promise((resolve) => {
        if (!img.src) return resolve(false);

        // already loaded
        if (img.complete && img.naturalWidth > 0) return resolve(true);

        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
    }

    let goodImgs = [];
    let idx = 0;
    let timer = null;

    function show(n) {
      goodImgs.forEach((img, i) => img.classList.toggle("is-active", i === n));
    }

    function start() {
      const reduceMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const INTERVAL_MS = 4200;

      // show first
      idx = 0;
      show(0);

      // if only 1 or reduce motion => no autoplay
      if (reduceMotion || goodImgs.length <= 1) return;

      // clear old interval if any
      if (timer) clearInterval(timer);

      timer = setInterval(() => {
        idx = (idx + 1) % goodImgs.length;
        show(idx);
      }, INTERVAL_MS);

      // pause/resume on tab visibility
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          if (timer) clearInterval(timer);
          timer = null;
        } else {
          if (!timer) {
            timer = setInterval(() => {
              idx = (idx + 1) % goodImgs.length;
              show(idx);
            }, INTERVAL_MS);
          }
        }
      });
    }

    (async () => {
      if (!imgs.length) return;

      // wait for load check
      const results = await Promise.all(imgs.map((img) => canLoad(img)));
      goodImgs = imgs.filter((_, i) => results[i]);

      // if nothing loads, stop
      if (!goodImgs.length) {
        console.warn("⚠️ Carousel: no images loaded.");
        return;
      }

      // ✅ ensure first image is decoded (helps CSS transition not stuck)
      const first = goodImgs[0];
      try {
        if (first.decode) await first.decode();
      } catch {}

      start();
    })();
  }

  // ---------- REVEAL (SAFE) ----------
  const els = Array.from(document.querySelectorAll(".reveal"));
  if (!els.length) return;

  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  document.documentElement.classList.add("reveal-on");

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  els.forEach((el) => {
    if (!el.classList.contains("is-visible")) io.observe(el);
  });
})();