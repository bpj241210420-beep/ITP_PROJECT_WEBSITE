// homePagemain.js
(function () {
  document.documentElement.classList.add("reveal-on");

  function ASSET_BASE(){
    const p = String(location.pathname || "").replaceAll("\\", "/");
    return p.includes("/ServiceHub/") ? "../assets/" : "assets/";
  }
  function asset(file){
    return encodeURI(ASSET_BASE() + file);
  }

  // ✅ Background slideshow (replaces #heroSlide img)
  const bg = document.getElementById("heroBgPhoto");
  if (bg) {
    const slides = [
      asset("servicehubone.jpg"),
      asset("servicehubtwo.jpg"),
      asset("servicehubthree.avif")
    ];

    // preload
    slides.forEach((src) => { const i = new Image(); i.src = src; });

    let idx = 0;

    function setBg(url){
      bg.style.backgroundImage = `url("${url}")`;
    }

    function show(i) {
      bg.classList.add("is-fading");
      setTimeout(() => {
        setBg(slides[i]);
        // fade back in
        requestAnimationFrame(() => bg.classList.remove("is-fading"));
      }, 420);
    }

    function next() {
      idx = (idx + 1) % slides.length;
      show(idx);
    }

    // start
    setBg(slides[0]);

    let timer = setInterval(next, 5200);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearInterval(timer);
        timer = null;
      } else {
        if (!timer) timer = setInterval(next, 5200);
      }
    });
  }

  // reveal animations (unchanged)
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
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("is-visible"));
  }
})();