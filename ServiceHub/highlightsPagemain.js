// highlightsPagemain.js - auto slide

(function () {
  const cats = window.SERVICE_CATEGORIES || ["All categories"];
  const globalCat = document.getElementById("globalCat");
  if (globalCat) globalCat.innerHTML = cats.map(c => `<option>${c}</option>`).join("");

  const track = document.getElementById("hiTrack");
  if (!track) return;

  const viewport = track.parentElement;
  const btnPrev = document.querySelector(".hi-left");
  const btnNext = document.querySelector(".hi-right");

  function scrollByCard(dir) {
    const card = track.querySelector(".hi-item");
    if (!card) return;
    const gap = 18;
    const step = card.getBoundingClientRect().width + gap;
    viewport.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  btnPrev?.addEventListener("click", () => scrollByCard(-1));
  btnNext?.addEventListener("click", () => scrollByCard(1));

  let autoTimer = setInterval(() => {
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    const nearEnd = viewport.scrollLeft >= maxScroll - 10;
    if (nearEnd) viewport.scrollTo({ left: 0, behavior: "smooth" });
    else scrollByCard(1);
  }, 2800);

  viewport.addEventListener("mouseenter", () => clearInterval(autoTimer));
  viewport.addEventListener("mouseleave", () => {
    autoTimer = setInterval(() => {
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      const nearEnd = viewport.scrollLeft >= maxScroll - 10;
      if (nearEnd) viewport.scrollTo({ left: 0, behavior: "smooth" });
      else scrollByCard(1);
    }, 2800);
  });
})();