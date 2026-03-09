// servicesPagemain.js
// robust render + filter + open details + rating + URL sync
// category filter from homepage + clean browser history
// reveal animation restored
// polished empty-state
// pagination ready
// demo featured feedback rating supported
// fallback default rating added so cards never look empty

document.addEventListener("DOMContentLoaded", () => {

function LANG(){
return (window.SH_LANG && window.SH_LANG()) ||
document.documentElement.getAttribute("data-lang") ||
"en";
}

function T(obj){
if(window.SH_T) return window.SH_T(obj);
return (LANG()==="bm" && obj?.bm) ? obj.bm : obj?.en || "";
}

const elGrid=document.getElementById("grid");
const elCount=document.getElementById("count");
const paginationWrap=document.getElementById("paginationWrap");
const paginationEl=document.getElementById("pagination");

const q=document.getElementById("q");
const cat=document.getElementById("cat");
const area=document.getElementById("area");
const sort=document.getElementById("sort");

const apply=document.getElementById("apply");
const reset=document.getElementById("reset");

const data=Array.isArray(window.SERVICE_DATA) ? window.SERVICE_DATA : [];
const cats=Array.isArray(window.SERVICE_CATEGORIES) ? window.SERVICE_CATEGORIES : ["All categories"];
const demoReviewsMap = window.SERVICE_DEMO_REVIEWS || {};

const PER_PAGE = 9;
let currentPage = 1;
let io = null;

if(cat){
cat.innerHTML=cats.map(c=>`<option value="${c}">${c}</option>`).join("");
}

function normalize(s){
return (s||"").toLowerCase();
}

function escapeHtml(s){
return String(s || "")
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");
}

function assetBase(){
return "./assets/";
}

function resolveAsset(path){
const base=assetBase();
const p=String(path||"").replaceAll("\\","/").trim();

if(/^https?:\/\//i.test(p)) return p;

const file=p.split("/").filter(Boolean).pop() || "";
if(!file) return "";

return encodeURI(base+file);
}

function fallbackByCategory(category){
const base=assetBase();
const c=String(category||"").toLowerCase();

if(c.includes("laundry")) return encodeURI(base+"previewtwo.webp");
if(c.includes("food")) return encodeURI(base+"previewthree.jpg");

return encodeURI(base+"previewone.jpg");
}

const LAST_SERVICES_URL_KEY="servicehub_last_services_url";

function getPageFromUrl(){
const params = new URLSearchParams(location.search);
const raw = Number(params.get("page") || "1");
if (!Number.isFinite(raw) || raw < 1) return 1;
return Math.floor(raw);
}

function buildServicesUrlFromUI(pageOverride){
const params=new URLSearchParams();

const kw=(q?.value||"").trim();
const c=(cat?.value||"").trim();
const a=(area?.value||"").trim();
const s=(sort?.value||"").trim();
const p=Number(pageOverride || currentPage || 1);

if(kw) params.set("q",kw);
if(c && c!=="All categories") params.set("cat",c);
if(a) params.set("area",a);
if(s && s!=="name") params.set("sort",s);
if(p > 1) params.set("page", String(p));

const qs=params.toString();
return qs ? `servicesPage.html?${qs}` : "servicesPage.html";
}

function syncUrlFromUI(push, pageOverride){
const url=buildServicesUrlFromUI(pageOverride);
if(push) history.pushState({}, "", url);
else history.replaceState({}, "", url);
}

function applyQueryParamsToUI(){
const params=new URLSearchParams(location.search);

if(q) q.value=params.get("q") || "";
if(area) area.value=params.get("area") || "";

if(cat){
const val=params.get("cat") || "All categories";

const trySet=()=>{
const opts=Array.from(cat.options||[]);
const found=opts.find(o=>o.value===val || o.textContent===val);
cat.value=found ? found.value : "All categories";
};

setTimeout(trySet,50);
setTimeout(trySet,200);
setTimeout(trySet,500);
}

if(sort){
sort.value=params.get("sort") || "name";
}

currentPage = getPageFromUrl();
}

applyQueryParamsToUI();

function initReveal(){
const items=document.querySelectorAll(".reveal");
if(!items.length) return;

document.documentElement.classList.add("reveal-on");

if(!("IntersectionObserver" in window)){
items.forEach(el=>el.classList.add("is-visible"));
return;
}

if(io) io.disconnect();

io=new IntersectionObserver((entries)=>{
entries.forEach((e)=>{
if(e.isIntersecting){
e.target.classList.add("is-visible");
io.unobserve(e.target);
}
});
},{threshold:0.12});

items.forEach(el=>{
if(!el.classList.contains("is-visible")){
io.observe(el);
}
});
}

function loadUserReviewsFor(serviceId){
const KEY=`servicehub_reviews_${serviceId}`;
try{
return JSON.parse(localStorage.getItem(KEY)||"[]");
}catch{
return [];
}
}

function loadDemoReviewsFor(serviceId){
return Array.isArray(demoReviewsMap[serviceId]) ? demoReviewsMap[serviceId] : [];
}

function loadAllReviewsFor(serviceId){
return [...loadUserReviewsFor(serviceId), ...loadDemoReviewsFor(serviceId)];
}

/* ✅ NEW: fallback rating bila tak ada review langsung */
function getSeededDemoRating(serviceId){
const seedText = String(serviceId || "");
let seed = 0;

for(let i = 0; i < seedText.length; i++){
seed += seedText.charCodeAt(i) * (i + 1);
}

const avgOptions = [4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8];
const countOptions = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32];

const avg = avgOptions[seed % avgOptions.length];
const count = countOptions[seed % countOptions.length];

return { avg, count };
}

function getRatingStats(serviceId){
const list=loadAllReviewsFor(serviceId);
const count=list.length;

if(!count){
return getSeededDemoRating(serviceId);
}

const sum=list.reduce((acc,r)=>acc+(Number(r.stars)||0),0);
return {avg:sum/count,count};
}

function formatAvg(avg){
return (Math.round(avg*10)/10).toFixed(1);
}

function bindEmptyStateActions(){
const btn=document.getElementById("emptyResetBtn");
if(!btn) return;

btn.addEventListener("click",()=>{
if(q) q.value="";
if(cat) cat.value="All categories";
if(area) area.value="";
if(sort) sort.value="name";
currentPage = 1;

history.pushState({}, "", "servicesPage.html");
applyFilters({updateUrl:false,pushHistory:false});
});
}

function bindServiceCards(){
elGrid.querySelectorAll(".svc").forEach(cardEl=>{
cardEl.addEventListener("click",()=>{
const id=cardEl.getAttribute("data-id");
localStorage.setItem("servicehub_selected",id);
localStorage.setItem(LAST_SERVICES_URL_KEY,window.location.href);
location.href=`serviceDetailsPage.html?id=${encodeURIComponent(id)}`;
});
});
}

function getVisiblePageItems(totalPages, page){
const items = [];
const add = (value) => {
if (!items.includes(value)) items.push(value);
};

if (totalPages <= 7) {
for (let i = 1; i <= totalPages; i++) add(i);
return items;
}

add(1);

if (page > 3) items.push("...");
for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
if (page < totalPages - 2) items.push("...");

add(totalPages);

return items;
}

function renderPagination(totalItems){
if (!paginationWrap || !paginationEl) return;

const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));

if (totalItems <= PER_PAGE) {
paginationWrap.classList.remove("is-visible");
paginationEl.innerHTML = "";
return;
}

paginationWrap.classList.add("is-visible");

const visibleItems = getVisiblePageItems(totalPages, currentPage);

paginationEl.innerHTML = `
<button class="page-btn" type="button" data-page-action="prev" ${currentPage <= 1 ? "disabled" : ""}>
  ${escapeHtml(T({ en:"Prev", bm:"Sebelum" }))}
</button>

${visibleItems.map(item => {
if (item === "...") {
return `<span class="page-ellipsis">…</span>`;
}
return `
<button class="page-btn ${item === currentPage ? "is-active" : ""}" type="button" data-page="${item}">
  ${item}
</button>
`;
}).join("")}

<button class="page-btn" type="button" data-page-action="next" ${currentPage >= totalPages ? "disabled" : ""}>
  ${escapeHtml(T({ en:"Next", bm:"Seterusnya" }))}
</button>
`;

paginationEl.querySelectorAll("[data-page]").forEach(btn=>{
btn.addEventListener("click",()=>{
const nextPage = Number(btn.getAttribute("data-page"));
if (!nextPage || nextPage === currentPage) return;
currentPage = nextPage;
syncUrlFromUI(true, currentPage);
applyFilters({updateUrl:false,pushHistory:false});
window.scrollTo({ top: 0, behavior: "smooth" });
});
});

paginationEl.querySelectorAll("[data-page-action]").forEach(btn=>{
btn.addEventListener("click",()=>{
const action = btn.getAttribute("data-page-action");
if (action === "prev" && currentPage > 1) {
currentPage -= 1;
syncUrlFromUI(true, currentPage);
applyFilters({updateUrl:false,pushHistory:false});
window.scrollTo({ top: 0, behavior: "smooth" });
}
if (action === "next" && currentPage < totalPages) {
currentPage += 1;
syncUrlFromUI(true, currentPage);
applyFilters({updateUrl:false,pushHistory:false});
window.scrollTo({ top: 0, behavior: "smooth" });
}
});
});
}

function renderEmptyState(){
const activeParts=[];

if((q?.value||"").trim()){
activeParts.push(
`${T({en:"keyword",bm:"kata kunci"})}: <strong>${escapeHtml((q.value||"").trim())}</strong>`
);
}

if((cat?.value||"").trim() && cat.value!=="All categories"){
activeParts.push(
`${T({en:"category",bm:"kategori"})}: <strong>${escapeHtml(cat.value)}</strong>`
);
}

if((area?.value||"").trim()){
activeParts.push(
`${T({en:"area",bm:"kawasan"})}: <strong>${escapeHtml((area.value||"").trim())}</strong>`
);
}

const activeText=activeParts.length
? activeParts.join(" • ")
: T({
en:"No filter is currently applied.",
bm:"Tiada penapis sedang digunakan."
});

elGrid.innerHTML=`
<div class="card empty-state reveal">
  <div class="empty-state-icon">🔎</div>
  <div class="empty-state-title">
    ${T({en:"No services found",bm:"Tiada servis dijumpai"})}
  </div>
  <p class="empty-state-text">
    ${T({
      en:"We could not find any services matching your current filters.",
      bm:"Kami tidak menemui sebarang servis yang sepadan dengan penapis semasa anda."
    })}
  </p>
  <div class="empty-state-meta">${activeText}</div>
  <div class="empty-state-tips">
    <span>${T({en:"Try removing one filter",bm:"Cuba buang satu penapis"})}</span>
    <span>${T({en:"Use a broader keyword",bm:"Gunakan kata kunci yang lebih umum"})}</span>
    <span>${T({en:"Check the selected area/category",bm:"Semak kawasan/kategori yang dipilih"})}</span>
  </div>
  <div class="empty-state-actions">
    <button class="search-btn" type="button" id="emptyResetBtn">
      ${T({en:"Reset filters",bm:"Reset penapis"})}
    </button>
  </div>
</div>
`;

if(elCount) elCount.textContent="0";
if (paginationWrap) paginationWrap.classList.remove("is-visible");
if (paginationEl) paginationEl.innerHTML = "";
bindEmptyStateActions();
initReveal();
}

function renderPagedList(fullList){
const totalPages = Math.max(1, Math.ceil(fullList.length / PER_PAGE));

if (currentPage > totalPages) currentPage = totalPages;
if (currentPage < 1) currentPage = 1;

const start = (currentPage - 1) * PER_PAGE;
const end = start + PER_PAGE;
const pageList = fullList.slice(start, end);

elGrid.innerHTML=pageList.map(s=>{
const rs=getRatingStats(s.id);

const ratingTitle = T({
en:`${formatAvg(rs.avg)} / 5 from ${rs.count} review(s)`,
bm:`${formatAvg(rs.avg)} / 5 daripada ${rs.count} ulasan`
});

const ratingHtml=`
<span class="rating-pill" title="${escapeHtml(ratingTitle)}">
  <span class="star">★</span>
  <span class="val">${formatAvg(rs.avg)}</span>
  <span class="count">(${rs.count})</span>
</span>
`;

const imgSrc=resolveAsset(s.image) || fallbackByCategory(s.category);

return `
<article class="card svc reveal" data-id="${s.id}">
  <img
    class="svc-img"
    src="${imgSrc}"
    alt="${escapeHtml(s.name)}"
    loading="lazy"
    onerror="this.onerror=null;this.src='${fallbackByCategory(s.category)}';"
  >

  <div class="svc-top">
    <div class="svc-title">${escapeHtml(s.name)}</div>
    ${ratingHtml}
  </div>

  <p class="svc-sub">
    <strong>${escapeHtml(s.category)}</strong> • ${escapeHtml(s.area)}<br/>
    ${escapeHtml(s.address)}
  </p>

  <div class="badges">
    ${(s.tags||[]).slice(0,3).map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join("")}
    <span class="badge">${escapeHtml(s.price||"RM")}</span>
  </div>
</article>
`;
}).join("");

if(elCount){
const from = fullList.length ? start + 1 : 0;
const to = Math.min(end, fullList.length);
elCount.textContent = T({
en: `${fullList.length} result(s) • Showing ${from}–${to}`,
bm: `${fullList.length} hasil • Paparan ${from}–${to}`
});
}

bindServiceCards();
renderPagination(fullList.length);
initReveal();
}

function applyFilters(opts={updateUrl:false,pushHistory:false,resetPage:false}){
const kw=normalize(q?.value);
const c=cat?.value;
const a=normalize(area?.value);
const srt=(sort?.value||"name").toLowerCase();

if (opts.resetPage) currentPage = 1;
if (!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;

let list=data.slice();

if(kw){
list=list.filter(x=>{
const blob=normalize(
`${x.name} ${x.category} ${x.area} ${x.address} ${x.description} ${(x.tags||[]).join(" ")}`
);
return blob.includes(kw);
});
}

if(c && c!=="All categories"){
list=list.filter(x=>x.category===c);
}

if(a){
list=list.filter(x=>normalize(`${x.area} ${x.address}`).includes(a));
}

if(srt==="name"){
list.sort((x,y)=>x.name.localeCompare(y.name));
}

if(srt==="cat"){
list.sort((x,y)=>x.category.localeCompare(y.category));
}

if(srt==="rating"){
list.sort((x,y)=>{
const rx=getRatingStats(x.id);
const ry=getRatingStats(y.id);

if(ry.avg!==rx.avg) return ry.avg-rx.avg;
if(ry.count!==rx.count) return ry.count-rx.count;

return x.name.localeCompare(y.name);
});
}

if(opts.updateUrl) syncUrlFromUI(!!opts.pushHistory, currentPage);

if(!list.length){
renderEmptyState();
return;
}

renderPagedList(list);
}

apply?.addEventListener("click",()=>{
currentPage = 1;
applyFilters({updateUrl:true,pushHistory:true,resetPage:false});
});

reset?.addEventListener("click",()=>{
if(q) q.value="";
if(cat) cat.value="All categories";
if(area) area.value="";
if(sort) sort.value="name";
currentPage = 1;

history.pushState({}, "", "servicesPage.html");
applyFilters({updateUrl:false,pushHistory:false});
});

window.addEventListener("popstate",()=>{
applyQueryParamsToUI();
setTimeout(()=>{
applyFilters({updateUrl:false,pushHistory:false});
},80);
});

window.addEventListener("focus",()=>{
applyFilters({updateUrl:false,pushHistory:false});
});

window.addEventListener("servicehub:langchange",()=>{
applyFilters({updateUrl:false,pushHistory:false});
});

setTimeout(()=>{
applyFilters({updateUrl:false,pushHistory:false});
},100);

});