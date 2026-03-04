// whatWeProvideMain.js
// - slow fade carousel (right side preview)
// - scroll reveal animation (FAIL-SAFE)

(function () {
  // --- Carousel (slow fade)
  const wrap = document.getElementById("provideCarousel");
  if (wrap) {
    const imgs = Array.from(wrap.querySelectorAll(".p-media-img"));
    let idx = 0;

    const show = (n) => {
      imgs.forEach((img, i) => img.classList.toggle("is-active", i === n));
    };

    // ✅ If no images, don't start interval (avoid NaN % 0)
    if (imgs.length > 0) {
      show(0);
      setInterval(() => {
        idx = (idx + 1) % imgs.length;
        show(idx);
      }, 4200);
    }
  }

  // --- Scroll reveal (safe)
  const els = Array.from(document.querySelectorAll(".reveal"));
  if (!els.length) return;

  // ✅ Only turn on "reveal hidden by default" when observer is available
  if (!("IntersectionObserver" in window)) {
    // fallback: show everything
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  // turn on reveal mode globally (CSS will hide until visible)
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