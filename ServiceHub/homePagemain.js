// homePagemain.js
(function () {

  // enable reveal animations
  document.documentElement.classList.add("reveal-on");

  // detect correct assets path (local vs hosted)
  function ASSET_BASE() {
    const p = String(location.pathname || "").replaceAll("\\", "/");
    return p.includes("/ServiceHub/") ? "../assets/" : "assets/";
  }

  function asset(file) {
    return encodeURI(ASSET_BASE() + file);
  }

  // ============================
  // HOMEPAGE BACKGROUND SLIDESHOW
  // ============================
  const bg = document.getElementById("heroBgPhoto");

  if (bg) {

    const slides = [
      asset("servicehubone.jpg"),
      asset("servicehubtwo.jpg"),
      asset("servicehubthree.avif")
    ];

    slides.forEach(src => {
      const img = new Image();
      img.src = src;
    });

    let index = 0;
    const INTERVAL = 5200;
    const FADE = 420;

    function setBg(url) {
      bg.style.backgroundImage = `url("${url}")`;
    }

    function show(i) {
      bg.classList.add("is-fading");

      setTimeout(() => {
        setBg(slides[i]);
        requestAnimationFrame(() => {
          bg.classList.remove("is-fading");
        });
      }, FADE);
    }

    setBg(slides[0]);

    let timer = setInterval(() => {
      index = (index + 1) % slides.length;
      show(index);
    }, INTERVAL);

    document.addEventListener("visibilitychange", () => {

      if (document.hidden) {
        clearInterval(timer);
        timer = null;
      }

      else {
        if (!timer) {
          timer = setInterval(() => {
            index = (index + 1) % slides.length;
            show(index);
          }, INTERVAL);
        }
      }

    });

  }

  // ============================
  // PREVIEW SLIDESHOW (STUDENTS)
  // ============================
  const previewImg = document.getElementById("heroSlide");

  if (previewImg) {

    const previewSlides = [
      asset("previewone.jpg"),
      asset("previewtwo.webp"),
      asset("previewthree.jpg")
    ];

    previewSlides.forEach(src => {
      const img = new Image();
      img.src = src;
    });

    let i = 0;

    previewImg.src = previewSlides[0];

    setInterval(() => {
      i = (i + 1) % previewSlides.length;
      previewImg.src = previewSlides[i];
    }, 3500);

  }

  // ============================
  // REVEAL ANIMATION
  // ============================
  const els = document.querySelectorAll(".reveal");

  if (els.length && "IntersectionObserver" in window) {

    const io = new IntersectionObserver((entries) => {

      entries.forEach((e) => {

        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }

      });

    }, { threshold: 0.12 });

    els.forEach(el => io.observe(el));

  }

  else {

    document.querySelectorAll(".reveal")
      .forEach(el => el.classList.add("is-visible"));

  }

})();