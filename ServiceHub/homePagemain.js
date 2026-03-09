(function () {
  document.documentElement.classList.add("reveal-on");

  function ASSET_BASE() {
    return "./assets/";
  }

  function asset(f) {
    return encodeURI(ASSET_BASE() + f);
  }

  function resolveAsset(path) {
    const p = String(path || "").replaceAll("\\", "/").trim();
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;

    const file = p.split("/").filter(Boolean).pop() || "";
    if (!file) return "";

    return asset(file);
  }

  function fallbackByCategory(category) {
    const c = String(category || "").toLowerCase();

    if (c.includes("laundry")) return asset("previewtwo.webp");
    if (c.includes("food")) return asset("previewthree.jpg");

    return asset("previewone.jpg");
  }

  function initReveal() {
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

      els.forEach((el) => {
        if (!el.classList.contains("is-visible")) {
          io.observe(el);
        }
      });
    } else {
      document
        .querySelectorAll(".reveal")
        .forEach((el) => el.classList.add("is-visible"));
    }
  }

  const bg = document.getElementById("heroBgPhoto");

  if (bg) {
    const slides = [
      asset("servicehubone.jpg"),
      asset("servicehubtwo.jpg"),
      asset("servicehubthree.avif")
    ];

    slides.forEach((s) => {
      const img = new Image();
      img.src = s;
    });

    let i = 0;

    function setBg(u) {
      bg.style.backgroundImage = `url("${u}")`;
    }

    function show(x) {
      bg.classList.add("is-fading");

      setTimeout(() => {
        setBg(slides[x]);
        requestAnimationFrame(() => {
          bg.classList.remove("is-fading");
        });
      }, 420);
    }

    setBg(slides[0]);

    setInterval(() => {
      i = (i + 1) % slides.length;
      show(i);
    }, 5200);
  }

  function renderFeaturedServices() {
    const grid = document.getElementById("featuredGrid");
    const data = Array.isArray(window.SERVICE_DATA) ? window.SERVICE_DATA : [];

    if (!grid || !data.length) return;

    const featured = data.slice(0, 3);

    grid.innerHTML = featured.map((s) => {
      const imgSrc = resolveAsset(s.image) || fallbackByCategory(s.category);

      return `
        <article class="featured-card reveal" data-id="${s.id}">
          <div class="featured-badge">Popular</div>

          <div class="featured-img-wrap">
            <img
              class="featured-img"
              src="${imgSrc}"
              alt="${s.name}"
              loading="lazy"
              onerror="this.onerror=null;this.src='${fallbackByCategory(s.category)}';"
            >
          </div>

          <div class="featured-body">
            <h3 class="featured-title">${s.name}</h3>
            <p class="featured-meta">${s.category} • ${s.area}</p>

            <div class="featured-tags">
              <span class="featured-chip">${(s.tags && s.tags[0]) ? s.tags[0] : "Service"}</span>
              <span class="featured-chip">${s.price || "RM"}</span>
            </div>
          </div>
        </article>
      `;
    }).join("");

    grid.querySelectorAll(".featured-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        if (!id) return;

        localStorage.setItem("servicehub_selected", id);
        location.href = `./serviceDetailsPage.html?id=${encodeURIComponent(id)}`;
      });
    });
  }

  renderFeaturedServices();
  initReveal();
})();