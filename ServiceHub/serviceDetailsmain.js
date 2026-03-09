// serviceDetailsmain.js
// service details + maps + i18n sync + REPORT SERVICE
// + BACK TO FILTERED SERVICES
// + fixed image path resolver + fallback image
// + Nearby Services Suggestion added
// + Featured feedback / default stars added
// + review form removed (display only featured reviews)

document.addEventListener("DOMContentLoaded", () => {
  try {
    function LANG() {
      return (window.SH_LANG && window.SH_LANG()) || document.documentElement.getAttribute("data-lang") || "en";
    }

    function T(obj) {
      if (window.SH_T) return window.SH_T(obj);
      return (LANG() === "bm" && obj?.bm) ? obj.bm : (obj.en || "");
    }

    function escapeHtml(s) {
      return String(s || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function assetBase() {
      return "./assets/";
    }

    function resolveAsset(path) {
      const p = String(path || "").replaceAll("\\", "/").trim();
      if (!p) return "";
      if (/^https?:\/\//i.test(p)) return p;

      const file = p.split("/").filter(Boolean).pop() || "";
      if (!file) return "";

      return encodeURI(assetBase() + file);
    }

    function fallbackByCategory(category) {
      const c = String(category || "").toLowerCase();

      if (c.includes("laundry")) return encodeURI(assetBase() + "previewtwo.webp");
      if (c.includes("food")) return encodeURI(assetBase() + "previewthree.jpg");
      if (c.includes("car")) return encodeURI(assetBase() + "directory.jpeg");

      return encodeURI(assetBase() + "previewone.jpg");
    }

    const demoReviewsMap = window.SERVICE_DEMO_REVIEWS || {};

    function buildFallbackDemoReviews(currentService) {
      if (!currentService) return [];

      const category = String(currentService.category || "").toLowerCase();
      const area = currentService.area || "Batu Pahat";
      const serviceName = currentService.name || "This service";

      const templates = {
        laundry: [
          {
            ownerName: "Aisyah",
            stars: 4,
            textEn: `Fast washing service and the place was clean. Convenient if you need a quick laundry option around ${area}.`,
            textBm: `Servis cucian cepat dan tempat pun bersih. Sesuai kalau perlukan pilihan dobi yang mudah sekitar ${area}.`
          },
          {
            ownerName: "Hakim",
            stars: 5,
            textEn: `${serviceName} is easy to use and the machines worked well. Good choice for students and busy users.`,
            textBm: `${serviceName} mudah digunakan dan mesinnya berfungsi dengan baik. Pilihan yang bagus untuk pelajar dan pengguna yang sibuk.`
          }
        ],
        food: [
          {
            ownerName: "Nadia",
            stars: 5,
            textEn: `The service was smooth and the order process was easy. A practical option for food-related needs in ${area}.`,
            textBm: `Servis berjalan lancar dan proses tempahan mudah. Pilihan yang praktikal untuk keperluan makanan di ${area}.`
          },
          {
            ownerName: "Firdaus",
            stars: 4,
            textEn: `Helpful service and clear communication. Suitable if you need a trusted food or catering option nearby.`,
            textBm: `Servis membantu dan komunikasi jelas. Sesuai kalau anda perlukan pilihan makanan atau katering yang dipercayai berdekatan.`
          }
        ],
        printing: [
          {
            ownerName: "Sabrina",
            stars: 4,
            textEn: `Good for quick document work and basic printing needs. Easy to find and convenient for students.`,
            textBm: `Bagus untuk urusan dokumen segera dan keperluan printing asas. Mudah dicari dan sesuai untuk pelajar.`
          },
          {
            ownerName: "Imran",
            stars: 5,
            textEn: `The service was reliable and the process felt straightforward. Great for urgent printing tasks around ${area}.`,
            textBm: `Servis ini boleh dipercayai dan prosesnya sangat mudah. Sangat sesuai untuk urusan printing segera sekitar ${area}.`
          }
        ],
        repair: [
          {
            ownerName: "Syafiq",
            stars: 4,
            textEn: `Helpful staff and clear explanation about the service. A useful repair option if you are nearby.`,
            textBm: `Staf membantu dan penerangan tentang servis juga jelas. Pilihan pembaikan yang berguna jika anda berada berdekatan.`
          },
          {
            ownerName: "Farah",
            stars: 5,
            textEn: `${serviceName} gave a professional impression and the service process was smooth.`,
            textBm: `${serviceName} memberi gambaran yang profesional dan proses servis berjalan lancar.`
          }
        ],
        transport: [
          {
            ownerName: "Amir",
            stars: 5,
            textEn: `Easy to contact and suitable for getting around ${area}. Convenient option when you need transport quickly.`,
            textBm: `Mudah dihubungi dan sesuai untuk bergerak sekitar ${area}. Pilihan yang mudah apabila anda perlukan pengangkutan dengan cepat.`
          },
          {
            ownerName: "Izzah",
            stars: 4,
            textEn: `The booking process felt simple and practical. A useful transport-related option for local users.`,
            textBm: `Proses tempahan terasa mudah dan praktikal. Pilihan berkaitan pengangkutan yang berguna untuk pengguna tempatan.`
          }
        ],
        cleaning: [
          {
            ownerName: "Dina",
            stars: 4,
            textEn: `Neat and practical service option. Useful if you need cleaning help around ${area}.`,
            textBm: `Pilihan servis yang kemas dan praktikal. Berguna jika anda perlukan bantuan pembersihan sekitar ${area}.`
          },
          {
            ownerName: "Azlan",
            stars: 5,
            textEn: `The service looks organized and suitable for regular household or workspace needs.`,
            textBm: `Servis ini nampak teratur dan sesuai untuk keperluan rumah atau ruang kerja secara berkala.`
          }
        ],
        tutoring: [
          {
            ownerName: "Huda",
            stars: 5,
            textEn: `A suitable option for students looking for extra learning support. Easy to consider for families nearby.`,
            textBm: `Pilihan yang sesuai untuk pelajar yang mencari sokongan pembelajaran tambahan. Mudah dipertimbangkan oleh keluarga berdekatan.`
          },
          {
            ownerName: "Daniel",
            stars: 4,
            textEn: `Good learning-related option with a clear focus. Practical for students in ${area}.`,
            textBm: `Pilihan berkaitan pembelajaran yang baik dengan fokus yang jelas. Praktikal untuk pelajar di ${area}.`
          }
        ],
        delivery: [
          {
            ownerName: "Aiman",
            stars: 4,
            textEn: `Useful for delivery needs and convenient for local users. Good if you need a quick service option.`,
            textBm: `Berguna untuk keperluan penghantaran dan memudahkan pengguna tempatan. Bagus jika anda perlukan servis yang cepat.`
          },
          {
            ownerName: "Balqis",
            stars: 5,
            textEn: `${serviceName} seems practical for local delivery or moving needs around ${area}.`,
            textBm: `${serviceName} nampak praktikal untuk keperluan penghantaran atau pindah barang sekitar ${area}.`
          }
        ],
        default: [
          {
            ownerName: "Customer A",
            stars: 4,
            textEn: `The service information is clear and the listing looks helpful for users around ${area}.`,
            textBm: `Maklumat servis ini jelas dan listing ini nampak membantu untuk pengguna sekitar ${area}.`
          },
          {
            ownerName: "Customer B",
            stars: 5,
            textEn: `${serviceName} looks like a practical local option with accessible contact details.`,
            textBm: `${serviceName} nampak seperti pilihan tempatan yang praktikal dengan maklumat hubungan yang mudah diakses.`
          }
        ]
      };

      let selected = templates.default;

      if (category.includes("laundry")) selected = templates.laundry;
      else if (category.includes("food")) selected = templates.food;
      else if (category.includes("printing")) selected = templates.printing;
      else if (category.includes("repair")) selected = templates.repair;
      else if (category.includes("transport") || category.includes("car")) selected = templates.transport;
      else if (category.includes("cleaning")) selected = templates.cleaning;
      else if (category.includes("tutoring")) selected = templates.tutoring;
      else if (category.includes("delivery") || category.includes("moving")) selected = templates.delivery;

      return selected.map((item, index) => ({
        ownerName: item.ownerName,
        stars: item.stars,
        text: LANG() === "bm" ? item.textBm : item.textEn,
        time: Date.now() - ((index + 1) * 86400000 * 3),
        isDemo: true
      }));
    }

    function getDemoReviews(serviceId, currentService) {
      if (Array.isArray(demoReviewsMap[serviceId]) && demoReviewsMap[serviceId].length) {
        return demoReviewsMap[serviceId].map((item, index) => ({
          ownerName: item.ownerName || item.name || `User ${index + 1}`,
          stars: Number(item.stars) || 4,
          text: item.text || "",
          time: item.time || (Date.now() - ((index + 1) * 86400000 * 2)),
          isDemo: true
        }));
      }

      return buildFallbackDemoReviews(currentService);
    }

    function getAllReviews(serviceId, currentService) {
      const demoReviews = getDemoReviews(serviceId, currentService);
      return demoReviews;
    }

    function getAverageStats(serviceId, currentService) {
      const all = getAllReviews(serviceId, currentService);
      const count = all.length;

      if (!count) {
        return { avg: 0, count: 0 };
      }

      const sum = all.reduce((acc, item) => acc + (Number(item.stars) || 0), 0);

      return {
        avg: sum / count,
        count
      };
    }

    function formatAvg(avg) {
      return (Math.round(avg * 10) / 10).toFixed(1);
    }

    function formatDate(ts) {
      try {
        return new Date(ts).toLocaleString(LANG() === "bm" ? "ms-MY" : "en-US");
      } catch {
        return new Date(ts).toLocaleString();
      }
    }

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

    function initReveal() {
      const items = document.querySelectorAll(".reveal");
      if (!items.length) return;

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

      items.forEach(el => {
        if (!el.classList.contains("is-visible")) {
          io.observe(el);
        }
      });
    }

    const cats = window.SERVICE_CATEGORIES || ["All categories"];
    const globalCat = document.getElementById("globalCat");
    if (globalCat && !globalCat.options.length) {
      globalCat.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    }

    const details = document.getElementById("details");
    const mapWrap = document.getElementById("mapWrap");
    const dirBtn = document.getElementById("dirBtn");
    const nearbyGrid = document.getElementById("nearbyGrid");
    const nearbySection = document.getElementById("nearbySection");
    const reviewsEl = document.getElementById("reviews");
    const featuredReviewSummary = document.getElementById("featuredReviewSummary");

    if (!details || !mapWrap || !dirBtn) {
      console.error("Missing required elements: #details / #mapWrap / #dirBtn");
      return;
    }

    const params = new URLSearchParams(location.search);
    const id = params.get("id") || localStorage.getItem("servicehub_selected") || "";
    const data = window.SERVICE_DATA || [];
    const service = data.find(x => x.id === id);

    function renderReviews() {
      if (!reviewsEl || !service) return;

      const featured = getAllReviews(service.id, service).slice(0, 2);
      const stats = getAverageStats(service.id, service);

      if (featuredReviewSummary) {
        if (stats.count) {
          featuredReviewSummary.innerHTML = `
            <span class="featured-rating-pill">★ ${escapeHtml(formatAvg(stats.avg))} / 5</span>
            <span class="featured-count-pill">${escapeHtml(String(stats.count))} ${escapeHtml(T({ en: "featured review(s)", bm: "ulasan terpilih" }))}</span>
          `;
        } else {
          featuredReviewSummary.innerHTML = "";
        }
      }

      if (!featured.length) {
        reviewsEl.innerHTML = `
          <div class="no-featured-review">
            ${T({
              en: "No featured reviews available right now.",
              bm: "Tiada ulasan terpilih buat masa ini."
            })}
          </div>
        `;
        return;
      }

      reviewsEl.innerHTML = featured.map((r) => {
        const stars = Math.max(0, Math.min(5, Number(r.stars) || 0));
        return `
          <div class="review">
            <div class="review-top">
              <div class="review-stars">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</div>
              <div class="review-date">${escapeHtml(formatDate(r.time))}</div>
            </div>
            <div class="review-author">${escapeHtml(T({ en: "By", bm: "Oleh" }))}: ${escapeHtml(r.ownerName || "Customer")}</div>
            <p>${escapeHtml(r.text || "")}</p>
          </div>
        `;
      }).join("");
    }

    function buildReportHref(svc) {
      const qs = new URLSearchParams();
      qs.set("type", "report");
      qs.set("serviceId", svc.id || "");
      qs.set("serviceName", svc.name || "");
      qs.set("serviceUrl", window.location.href);
      return `contactPage.html?${qs.toString()}`;
    }

    function safeWaDigits(wa) {
      return String(wa || "").replace(/\D/g, "");
    }

    function getNearbyServices(currentService) {
      if (!currentService || !Array.isArray(data)) return [];

      const sameCategory = data.filter(item =>
        item.id !== currentService.id &&
        item.category === currentService.category
      );

      const sameArea = data.filter(item =>
        item.id !== currentService.id &&
        item.area === currentService.area &&
        item.category !== currentService.category
      );

      const merged = [...sameCategory, ...sameArea];
      const unique = [];
      const seen = new Set();

      merged.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      });

      return unique.slice(0, 3);
    }

    function renderNearbyServices() {
      if (!nearbyGrid || !nearbySection || !service) return;

      const list = getNearbyServices(service);

      if (!list.length) {
        nearbyGrid.innerHTML = `
          <div class="nearby-empty">
            ${T({
              en: "No similar nearby services available right now.",
              bm: "Tiada servis serupa berdekatan buat masa ini."
            })}
          </div>
        `;
        return;
      }

      nearbyGrid.innerHTML = list.map((item) => {
        const imgSrc = resolveAsset(item.image) || fallbackByCategory(item.category);
        const fallbackSrc = fallbackByCategory(item.category);
        const firstTag = (item.tags && item.tags[0]) ? item.tags[0] : T({ en: "Service", bm: "Servis" });
        const stats = getAverageStats(item.id, item);

        const ratingChip = stats.count
          ? `<span class="nearby-chip">★ ${escapeHtml(formatAvg(stats.avg))}</span>`
          : "";

        return `
          <article class="nearby-card reveal" data-id="${escapeHtml(item.id)}">
            <img
              class="nearby-img"
              src="${escapeHtml(imgSrc)}"
              alt="${escapeHtml(item.name)}"
              loading="lazy"
              onerror="this.onerror=null;this.src='${escapeHtml(fallbackSrc)}';"
            >

            <div class="nearby-body">
              <h3 class="nearby-title">${escapeHtml(item.name)}</h3>
              <p class="nearby-meta">
                <strong>${escapeHtml(item.category)}</strong> • ${escapeHtml(item.area)}<br>
                ${escapeHtml(item.address)}
              </p>

              <div class="nearby-tags">
                <span class="nearby-chip">${escapeHtml(firstTag)}</span>
                <span class="nearby-chip">${escapeHtml(item.price || "RM")}</span>
                ${ratingChip}
              </div>
            </div>
          </article>
        `;
      }).join("");

      nearbyGrid.querySelectorAll(".nearby-card").forEach(card => {
        card.addEventListener("click", () => {
          const nextId = card.getAttribute("data-id");
          if (!nextId) return;

          localStorage.setItem("servicehub_selected", nextId);
          location.href = `./serviceDetailsPage.html?id=${encodeURIComponent(nextId)}`;
        });
      });
    }

    function renderPage() {
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

        if (nearbySection) {
          nearbySection.style.display = "none";
        }
        return;
      }

      const tagsHtml = (service.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
      const phone = service.phone || "—";
      const waDigits = safeWaDigits(service.whatsapp || "");
      const imageSrc = resolveAsset(service.image) || fallbackByCategory(service.category);
      const fallbackSrc = fallbackByCategory(service.category);
      const stats = getAverageStats(service.id, service);

      const ratingSummary = stats.count
        ? `
          <div class="tags" style="margin-top:0; margin-bottom:12px;">
            <span class="tag">★ ${escapeHtml(formatAvg(stats.avg))} / 5</span>
            <span class="tag">${escapeHtml(String(stats.count))} ${escapeHtml(T({ en: "featured review(s)", bm: "ulasan terpilih" }))}</span>
          </div>
        `
        : "";

      details.innerHTML = `
        <div>
          <img
            class="dimg"
            src="${escapeHtml(imageSrc)}"
            alt="${escapeHtml(service.name || "")}"
            onerror="this.onerror=null;this.src='${escapeHtml(fallbackSrc)}';"
          >
        </div>

        <div>
          <h2 class="dtitle">${escapeHtml(service.name)}</h2>

          <p class="dmeta">
            <strong>${escapeHtml(service.category)}</strong> • ${escapeHtml(service.area)}<br>${escapeHtml(service.address)}
          </p>

          ${ratingSummary}

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
                ? `<a class="btn" href="tel:${escapeHtml(service.phone)}">${T({ en: "Call", bm: "Telefon" })}</a>`
                : `<button class="btn" type="button" disabled>${T({ en: "Call", bm: "Telefon" })}</button>`
            }

            ${
              waDigits
                ? `<a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${waDigits}">WhatsApp</a>`
                : `<button class="btn wa" type="button" disabled>WhatsApp</button>`
            }

            <button class="btn" type="button" id="copyBtn" data-copy="${escapeHtml(service.phone || "")}">
              ${T({ en: "Copy phone", bm: "Salin nombor" })}
            </button>

            <button class="btn" type="button" id="printBtn">
              ${T({ en: "Print", bm: "Cetak" })}
            </button>

            <a class="btn danger" id="reportBtn" href="${escapeHtml(buildReportHref(service))}">
              ${T({ en: "Report", bm: "Lapor" })}
            </a>
          </div>

          <p class="dmeta"><strong>${T({ en: "Phone:", bm: "Telefon:" })}</strong> ${escapeHtml(phone)}</p>
        </div>
      `;

      document.getElementById("copyBtn")?.addEventListener("click", async (e) => {
        const num = e.currentTarget.getAttribute("data-copy") || "";
        if (!num) {
          alert(T({
            en: "No phone number saved yet for this provider.",
            bm: "Nombor telefon untuk penyedia ini belum disimpan."
          }));
          return;
        }

        try {
          await navigator.clipboard.writeText(num);
          alert(T({ en: "Copied: ", bm: "Disalin: " }) + num);
        } catch {
          alert(T({ en: "Copy failed. Please copy manually: ", bm: "Gagal salin. Sila salin manual: " }) + num);
        }
      });

      document.getElementById("printBtn")?.addEventListener("click", () => window.print());

      const qMaps = encodeURIComponent(service.mapsQuery || `${service.name} ${service.address}`);
      mapWrap.innerHTML = `
        <iframe
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=${qMaps}&output=embed">
        </iframe>
      `;
      dirBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${qMaps}`;

      renderReviews();
      renderNearbyServices();
    }

    renderPage();
    initReveal();

    window.addEventListener("servicehub:langchange", () => {
      renderPage();
      initReveal();
    });

  } catch (err) {
    console.error("serviceDetailsmain.js crashed:", err);
  }
});