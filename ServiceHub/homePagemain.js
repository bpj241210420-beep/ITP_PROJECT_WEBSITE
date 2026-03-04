// homePagemain.js
(function () {
  // Ensure reveal system ON (CSS uses html.reveal-on ...)
  document.documentElement.classList.add("reveal-on");

  // Always use /assets (server.js serves it in live)
  function asset(file) {
    return encodeURI(`/assets/${file}`);
  }

  // Background slideshow on #heroBgPhoto
  const bg = document.getElementById("heroBgPhoto");
  if (bg) {
    const candidates = [
      asset("previewone.jpg"),
      asset("previewthree.jpg"),
      asset("servicehubthree.avif"), // keep if exists
      asset("servicehubone.jpg"),
      asset("servicehubtwo.jpg"),
    ];

    // keep only images that really load
    const slides = [];
    let loaded = 0;

    function tryLoad(src) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ ok: true, src });
        img.onerror = () => resolve({ ok: false, src });
        img.src = src;
      });
    }

    (async () => {
      const results = await Promise.all(candidates.map(tryLoad));
      results.forEach((r) => {
        if (r.ok) slides.push(r.src);
      });

      // fallback if nothing loaded
      if (!slides.length) return;

      let idx = 0;
      const FADE_MS = 420;
      const INTERVAL_MS = 5200;

      function setBg(url) {
        bg.style.backgroundImage = `url("${url}")`;
      }

      function show(i) {
        bg.classList.add("is-fading");
        setTimeout(() => {
          setBg(slides[i]);
          requestAnimationFrame(() => bg.classList.remove("is-fading"));
        }, FADE_MS);
      }

      function next() {
        idx = (idx + 1) % slides.length;
        show(idx);
      }

      // start
      setBg(slides[0]);

      let timer = setInterval(next, INTERVAL_MS);

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          clearInterval(timer);
          timer = null;
        } else {
          if (!timer) timer = setInterval(next, INTERVAL_MS);
        }
      });
    })();
  }

  // Local reveal for this page (safe even if common.js already did it)
  const els = document.querySelectorAll(".reveal");
  if (els.length && "IntersectionObserver" in window) {
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
    els.forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
  }
})();