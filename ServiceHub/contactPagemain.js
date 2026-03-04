// contactPagemain.js - i18n + copy + Web3Forms submit + prefill report + SAVE local reports + EXPORT CSV + SAVE PDF

(function () {
  const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

  // local storage key for reports saved in THIS browser
  const REPORTS_KEY = "servicehub_reports_v1";

  // ===== i18n helpers =====
  function LANG(){
    return (window.SH_LANG && window.SH_LANG()) || document.documentElement.getAttribute("data-lang") || "en";
  }
  function T(obj){
    if (window.SH_T) return window.SH_T(obj);
    return (LANG() === "bm" && obj.bm) ? obj.bm : (obj.en || "");
  }

  // ===== Fill global category dropdown =====
  function fillGlobalCategory(){
    const cats = window.SERVICE_CATEGORIES || ["All categories"];
    const globalCat = document.getElementById("globalCat");
    if (!globalCat) return;
    globalCat.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join("");
  }
  fillGlobalCategory();

  // ===== COPY BUTTONS =====
  function initCopyButtons(){
    document.querySelectorAll("[data-copy]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const text = btn.getAttribute("data-copy") || "";
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = T({ en: "Copied!", bm: "Disalin!" });
          setTimeout(() => {
            btn.textContent = T({ en: "Copy number", bm: "Salin nombor" });
          }, 1200);
        } catch {
          alert(T({ en: "Copy failed. Please copy manually: ", bm: "Gagal salin. Sila salin secara manual: " }) + text);
        }
      });
    });
  }
  initCopyButtons();

  // ===== CONTACT FORM (REAL SUBMIT) =====
  const form = document.getElementById("contactForm");
  const note = document.getElementById("formNote");
  const sendBtn = document.getElementById("sendBtn");

  // admin tools (optional; ok if not present)
  const exportBtn = document.getElementById("exportCsvBtn");
  const clearBtn = document.getElementById("clearReportsBtn");
  const exportNote = document.getElementById("exportNote");

  // PDF tools
  const savePdfBtn = document.getElementById("savePdfBtn");
  const pdfArea = document.getElementById("pdfArea");

  function setNote(msg, ok){
    if (!note) return;
    note.textContent = msg;
    note.style.color = ok ? "var(--text)" : "crimson";
  }

  function setExportNote(msg, ok){
    if (!exportNote) return;
    exportNote.textContent = msg;
    exportNote.style.color = ok ? "var(--muted)" : "crimson";
  }

  function setSending(isSending){
    if (!sendBtn) return;
    sendBtn.disabled = isSending;
    sendBtn.textContent = isSending
      ? T({ en: "Sending…", bm: "Menghantar…" })
      : T({ en: "Send", bm: "Hantar" });
  }

  function fillMetaFields(){
    const ua = document.getElementById("uaField");
    const ts = document.getElementById("tsField");
    const lang = document.getElementById("langField");
    const theme = document.getElementById("themeField");

    if (ua) ua.value = navigator.userAgent || "";
    if (ts) ts.value = new Date().toISOString();
    if (lang) lang.value = LANG();
    if (theme) theme.value = document.documentElement.getAttribute("data-theme") || "light";
  }

  // ===== Local reports store =====
  function loadReports(){
    try { return JSON.parse(localStorage.getItem(REPORTS_KEY) || "[]"); }
    catch { return []; }
  }
  function saveReports(list){
    localStorage.setItem(REPORTS_KEY, JSON.stringify(list));
  }

  function addLocalReport(entry){
    const list = loadReports();
    list.unshift(entry); // newest first
    saveReports(list);
  }

  function csvEscape(val){
    const s = String(val ?? "");
    const needs = /[",\n\r]/.test(s);
    const out = s.replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  }

  function makeCsv(rows){
    const header = [
      "timestamp",
      "name",
      "email",
      "issue",
      "message",
      "service_id",
      "service_name",
      "service_url",
      "page",
      "lang",
      "theme",
      "user_agent"
    ];

    const lines = [];
    lines.push(header.join(","));

    rows.forEach(r => {
      const line = header.map(k => csvEscape(r[k]));
      lines.push(line.join(","));
    });

    return lines.join("\n");
  }

  function downloadText(filename, text){
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  function updateExportCount(){
    const n = loadReports().length;
    setExportNote(
      T({
        en: `Stored in this browser only • ${n} report(s) saved`,
        bm: `Disimpan dalam browser ini sahaja • ${n} laporan disimpan`
      }),
      true
    );
  }

  exportBtn?.addEventListener("click", () => {
    const list = loadReports();
    if (!list.length){
      setExportNote(T({ en: "No local reports to export yet.", bm: "Tiada laporan local untuk diexport lagi." }), false);
      return;
    }
    const csv = makeCsv(list);
    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    downloadText(`servicehub-reports-${stamp}.csv`, csv);
    updateExportCount();
  });

  clearBtn?.addEventListener("click", () => {
    const list = loadReports();
    if (!list.length){
      setExportNote(T({ en: "Nothing to clear.", bm: "Tiada apa untuk dipadam." }), false);
      return;
    }
    const ok = confirm(T({
      en: "Clear ALL local reports in this browser? (Cannot undo)",
      bm: "Padam SEMUA laporan local dalam browser ini? (Tak boleh undo)"
    }));
    if (!ok) return;
    localStorage.removeItem(REPORTS_KEY);
    updateExportCount();
  });

  // ✅ Prefill when coming from service details page
  function prefillFromQuery(){
    if (!form) return;

    const params = new URLSearchParams(location.search);

    const type = (params.get("type") || "").toLowerCase();
    const serviceId = params.get("serviceId") || "";
    const serviceName = params.get("serviceName") || "";
    const serviceUrl = params.get("serviceUrl") || "";

    const idEl = document.getElementById("service_id");
    const nameEl = document.getElementById("service_name");
    const urlEl = document.getElementById("service_url");

    if (idEl) idEl.value = serviceId;
    if (nameEl) nameEl.value = serviceName;
    if (urlEl) urlEl.value = serviceUrl;

    if (type === "report" || serviceId) {
      const issueSelect = form.querySelector('[name="issue"]');
      const msg = form.querySelector('[name="message"]');

      if (issueSelect) issueSelect.value = "Report listing";

      if (msg && !msg.value.trim()) {
        msg.value =
          `Service reported:\n` +
          `- Name: ${serviceName}\n` +
          `- ID: ${serviceId}\n` +
          `- URL: ${serviceUrl}\n\n` +
          `Issue description:\n`;
      }

      setNote(
        T({
          en: "Reporting a specific service. Please describe the issue, then send.",
          bm: "Anda sedang melaporkan servis tertentu. Sila terangkan isu, kemudian hantar."
        }),
        true
      );
    }
  }

  // ===== Save report as PDF (Print -> Save as PDF) =====
  function safe(v){ return String(v ?? "").replace(/</g, "&lt;"); }

  function buildPdfHtml(){
    if (!form) return "";

    const name = form.querySelector('[name="name"]')?.value?.trim() || "";
    const email = form.querySelector('[name="email"]')?.value?.trim() || "";
    const issue = form.querySelector('[name="issue"]')?.value?.trim() || "";
    const message = form.querySelector('[name="message"]')?.value?.trim() || "";

    const service_id = (document.getElementById("service_id")?.value || "").trim();
    const service_name = (document.getElementById("service_name")?.value || "").trim();
    const service_url = (document.getElementById("service_url")?.value || "").trim();

    const ts = new Date().toLocaleString(LANG() === "bm" ? "ms-MY" : "en-US");

    return `
      <div class="pdf-sheet">
        <div class="pdf-head">
          <div class="pdf-brand">
            <div class="pdf-badge">S</div>
            <div>
              <div class="pdf-title">ServiceHub</div>
              <div class="pdf-sub">${safe(T({en:"Report / Contact", bm:"Laporan / Hubungi"}))}</div>
            </div>
          </div>
          <div class="pdf-meta">
            <div><strong>${safe(T({en:"Generated", bm:"Dijana"}))}:</strong> ${safe(ts)}</div>
            <div><strong>${safe(T({en:"Language", bm:"Bahasa"}))}:</strong> ${safe(LANG().toUpperCase())}</div>
          </div>
        </div>

        <hr class="pdf-hr"/>

        <div class="pdf-block">
          <div class="pdf-label">${safe(T({en:"Your name", bm:"Nama anda"}))}</div>
          <div class="pdf-value">${safe(name || "—")}</div>
        </div>

        <div class="pdf-block">
          <div class="pdf-label">${safe(T({en:"Email", bm:"Email"}))}</div>
          <div class="pdf-value">${safe(email || "—")}</div>
        </div>

        <div class="pdf-block">
          <div class="pdf-label">${safe(T({en:"Issue type", bm:"Jenis isu"}))}</div>
          <div class="pdf-value">${safe(issue || "—")}</div>
        </div>

        ${(service_id || service_name || service_url) ? `
          <div class="pdf-block">
            <div class="pdf-label">${safe(T({en:"Service info", bm:"Info servis"}))}</div>
            <div class="pdf-value">
              <div><strong>ID:</strong> ${safe(service_id || "—")}</div>
              <div><strong>${safe(T({en:"Name", bm:"Nama"}))}:</strong> ${safe(service_name || "—")}</div>
              <div><strong>URL:</strong> ${safe(service_url || "—")}</div>
            </div>
          </div>
        ` : ""}

        <div class="pdf-block">
          <div class="pdf-label">${safe(T({en:"Message", bm:"Mesej"}))}</div>
          <div class="pdf-value pdf-msg">${safe(message || "—").replace(/\n/g,"<br>")}</div>
        </div>

        <div class="pdf-foot">
          ${safe(T({
            en:"This PDF is generated from your browser (demo).",
            bm:"PDF ini dijana dari browser anda (demo)."
          }))}
        </div>
      </div>
    `;
  }

  function setPdfFilename(){
    const issue = form?.querySelector('[name="issue"]')?.value?.trim() || "report";
    const sid = (document.getElementById("service_id")?.value || "").trim();
    const stamp = new Date().toISOString().slice(0,10);
    document.title = sid ? `ServiceHub-${issue}-${sid}-${stamp}` : `ServiceHub-${issue}-${stamp}`;
  }

savePdfBtn?.addEventListener("click", () => {
  if (!form || !pdfArea) return;

  const name = form.querySelector('[name="name"]')?.value?.trim();
  const issue = form.querySelector('[name="issue"]')?.value?.trim();
  const message = form.querySelector('[name="message"]')?.value?.trim();

  if (!name || !issue || !message){
    setNote(T({
      en: "Fill required fields first (name, issue type, message) before saving PDF.",
      bm: "Sila lengkapkan ruangan wajib (nama, jenis isu, mesej) sebelum simpan PDF."
    }), false);
    return;
  }

  // render content first
  pdfArea.innerHTML = buildPdfHtml();

  const oldTitle = document.title;
  setPdfFilename();

  // ✅ wait a tick so DOM updates before print
  requestAnimationFrame(() => {
    setTimeout(() => {
      window.print();
      document.title = oldTitle;
    }, 60);
  });
});

  // init metadata + prefill + export count
  fillMetaFields();
  prefillFromQuery();
  updateExportCount();

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    fillMetaFields();

    const name = form.querySelector('[name="name"]')?.value?.trim();
    const email = form.querySelector('[name="email"]')?.value?.trim() || "";
    const issue = form.querySelector('[name="issue"]')?.value?.trim();
    const message = form.querySelector('[name="message"]')?.value?.trim();

    const service_id = (document.getElementById("service_id")?.value || "").trim();
    const service_name = (document.getElementById("service_name")?.value || "").trim();
    const service_url = (document.getElementById("service_url")?.value || "").trim();

    if (!name || !issue || !message){
      setNote(T({
        en: "Please complete required fields (name, issue type, message).",
        bm: "Sila lengkapkan ruangan wajib (nama, jenis isu, mesej)."
      }), false);
      return;
    }

    setSending(true);
    setNote("", true);

    try {
      const formData = new FormData(form);

      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        body: formData
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json && json.success) {
        // ✅ Save local copy for CSV export (only after success)
        addLocalReport({
          timestamp: new Date().toISOString(),
          name,
          email,
          issue,
          message,
          service_id,
          service_name,
          service_url,
          page: "contactPage.html",
          lang: LANG(),
          theme: document.documentElement.getAttribute("data-theme") || "light",
          user_agent: navigator.userAgent || ""
        });

        updateExportCount();

        setNote(T({
          en: "Thanks! Your message has been sent to admin.",
          bm: "Terima kasih! Mesej anda telah dihantar kepada admin."
        }), true);

        form.reset();
        fillMetaFields();
        prefillFromQuery(); // keep report context if any
      } else {
        const errMsg = (json && (json.message || json.error)) ? String(json.message || json.error) : "Unknown error";
        setNote(
          T({
            en: "Failed to send. Please try again. Error: ",
            bm: "Gagal dihantar. Sila cuba lagi. Ralat: "
          }) + errMsg,
          false
        );
      }
    } catch (err) {
      setNote(
        T({
          en: "Network error. Please check internet and try again.",
          bm: "Ralat rangkaian. Sila semak internet dan cuba lagi."
        }),
        false
      );
    } finally {
      setSending(false);
    }
  });

  // ===== Language change sync =====
  window.addEventListener("servicehub:langchange", () => {
    fillGlobalCategory();

    if (sendBtn && !sendBtn.disabled) {
      sendBtn.textContent = T({ en: "Send", bm: "Hantar" });
    }

    prefillFromQuery();
    updateExportCount();

    // rebuild PDF preview content language (optional)
    // (not necessary, will rebuild on click)
  });

})();