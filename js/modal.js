function kacir(metin) {
  const div = document.createElement("div");
  div.textContent = metin == null ? "" : metin;
  return div.innerHTML;
}

function medyaOnizlemeHtml(m) {
  const dosyaAdi = kacir((m.url || "").split("/").pop().split("?")[0]);
  const url = kacir(m.url);
  if (m.tip === "gorsel") return `<img src="${url}" class="madde-medya-gorsel" />`;
  if (m.tip === "video") return `<video src="${url}" controls class="madde-medya-video"></video>`;
  if (m.tip === "word") return `<a href="${url}" target="_blank" rel="noopener" class="madde-dosya-karti">${ikonlar.word} ${dosyaAdi || "Word belgesi"}</a>`;
  if (m.tip === "excel") return `<a href="${url}" target="_blank" rel="noopener" class="madde-dosya-karti">${ikonlar.excel} ${dosyaAdi || "Excel belgesi"}</a>`;
  if (m.tip === "pdf") return `<a href="${url}" target="_blank" rel="noopener" class="madde-dosya-karti">${ikonlar.pdf} ${dosyaAdi || "PDF belgesi"}</a>`;
  return `<a href="${url}" target="_blank" rel="noopener" class="madde-dosya-karti">${ikonlar.link} ${url}</a>`;
}

function modalAc(icerikHtml) {
  let overlay = document.getElementById("modalOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "modalOverlay";
    overlay.className = "modal-overlay";
    overlay.innerHTML = '<div class="modal-kutu"><button class="modal-kapat" aria-label="Kapat">&times;</button><div class="modal-icerik"></div></div>';
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) modalKapat();
    });
    overlay.querySelector(".modal-kapat").addEventListener("click", modalKapat);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") modalKapat();
    });
  }

  overlay.querySelector(".modal-icerik").innerHTML = icerikHtml;
  overlay.classList.add("acik");
  document.body.classList.add("modal-kilit");
  return overlay.querySelector(".modal-icerik");
}

function modalKapat() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) overlay.classList.remove("acik");
  document.body.classList.remove("modal-kilit");
}

function modalOnayAc(baslik, onayMetni, onayFn) {
  const icerik = modalAc(`
    <h2 class="modal-baslik">${baslik}</h2>
    <div class="modal-bolum" style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="ikincil-buton" id="onayIptalButonu">Vazgeç</button>
      <button class="birincil-buton tehlike-buton" id="onayEvetButonu">${onayMetni}</button>
    </div>
  `);
  icerik.querySelector("#onayIptalButonu").addEventListener("click", modalKapat);
  icerik.querySelector("#onayEvetButonu").addEventListener("click", async () => {
    modalKapat();
    await onayFn();
  });
}

const ikonlar = {
  geri: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  ekle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  tik: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  sohbet: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  klasor: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.1 3.9A2 2 0 0 0 7.42 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
  belge: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"/><path d="M14 2v6h6"/></svg>',
  gorsel: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>',
  video: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3"/></svg>',
  word: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"/><path d="M14 2v6h6"/><path d="M7 13l1.5 5L10 14l1.5 4L13 13"/></svg>',
  excel: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"/><path d="M14 2v6h6"/><path d="M8 13l4 6M12 13l-4 6"/></svg>',
  pdf: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"/><path d="M14 2v6h6"/><path d="M7 17v-4h1.5a1.5 1.5 0 0 1 0 3H7m5 1v-4h1.3a1.2 1.2 0 0 1 0 4H12v-2h1"/></svg>',
  link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8"/></svg>',
  cop: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
};

document.addEventListener("click", () => {
  document.querySelectorAll(".ozel-secim-liste.acik").forEach((l) => l.classList.remove("acik"));
});

const medyaTipiSecenekleri = [
  { deger: "", etiket: "Medya yok", ikon: "" },
  { deger: "gorsel", etiket: "Görsel", ikon: ikonlar.gorsel },
  { deger: "video", etiket: "Video", ikon: ikonlar.video },
  { deger: "word", etiket: "Word Belgesi", ikon: ikonlar.word },
  { deger: "excel", etiket: "Excel Belgesi", ikon: ikonlar.excel },
  { deger: "pdf", etiket: "PDF", ikon: ikonlar.pdf },
  { deger: "url", etiket: "URL / Bağlantı", ikon: ikonlar.link },
];

const medyaTipiKabulEdilenler = {
  gorsel: "image/*",
  video: "video/*",
  word: ".doc,.docx",
  excel: ".xls,.xlsx",
  pdf: ".pdf",
};

/**
 * Ozel stilli, tiklanabilir medya tipi secici olusturur.
 * onSecim(deger) her secim degistiginde cagrilir.
 * Donen nesne: { element, getDeger(), sifirla() }
 */
function medyaTipiSeciciOlustur(onSecim) {
  const sarmalayici = document.createElement("div");
  sarmalayici.className = "ozel-secim";
  sarmalayici.innerHTML = `
    <button type="button" class="ozel-secim-buton">
      <span class="ozel-secim-etiket">Medya yok</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="ozel-secim-liste">
      ${medyaTipiSecenekleri
        .map((s) => `<div class="ozel-secim-secenek" data-deger="${s.deger}">${s.ikon} ${s.etiket}</div>`)
        .join("")}
    </div>
  `;

  let seciliDeger = "";
  const buton = sarmalayici.querySelector(".ozel-secim-buton");
  const etiket = sarmalayici.querySelector(".ozel-secim-etiket");
  const liste = sarmalayici.querySelector(".ozel-secim-liste");

  buton.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".ozel-secim-liste.acik").forEach((l) => {
      if (l !== liste) l.classList.remove("acik");
    });
    liste.classList.toggle("acik");
  });

  liste.querySelectorAll(".ozel-secim-secenek").forEach((secenek) => {
    secenek.addEventListener("click", () => {
      seciliDeger = secenek.dataset.deger;
      etiket.textContent = secenek.textContent.trim();
      liste.classList.remove("acik");
      onSecim(seciliDeger);
    });
  });

  return {
    element: sarmalayici,
    getDeger: () => seciliDeger,
    sifirla: () => {
      seciliDeger = "";
      etiket.textContent = "Medya yok";
    },
  };
}

/**
 * Bir "yeni madde" veya "medya ekle" formu icin dosya yukleme / URL alani.
 * Secilen medya tipine gore dosya secici veya URL kutusu gosterir.
 * Donen nesne: { element, getSeciliTipi(), medyaKaydet(supabaseClient, madde_medya_ekle_cagrisi) }
 */
function medyaSeciciOlustur() {
  const sarmalayici = document.createElement("div");
  sarmalayici.className = "medya-secici-sarmalayici";

  const dosyaGirisi = document.createElement("input");
  dosyaGirisi.type = "file";
  dosyaGirisi.className = "medya-dosya-girisi gizli";

  const urlGirisi = document.createElement("input");
  urlGirisi.type = "url";
  urlGirisi.className = "medya-url-girisi gizli";
  urlGirisi.placeholder = "https://...";

  const secici = medyaTipiSeciciOlustur((deger) => {
    dosyaGirisi.classList.add("gizli");
    urlGirisi.classList.add("gizli");
    dosyaGirisi.value = "";
    if (deger === "url") {
      urlGirisi.classList.remove("gizli");
    } else if (deger && medyaTipiKabulEdilenler[deger]) {
      dosyaGirisi.accept = medyaTipiKabulEdilenler[deger];
      dosyaGirisi.classList.remove("gizli");
    }
  });

  sarmalayici.appendChild(secici.element);
  sarmalayici.appendChild(dosyaGirisi);
  sarmalayici.appendChild(urlGirisi);

  return {
    element: sarmalayici,
    getSeciliTipi: () => secici.getDeger(),
    getDosya: () => dosyaGirisi.files[0] || null,
    getUrl: () => urlGirisi.value.trim(),
    sifirla: () => {
      secici.sifirla();
      dosyaGirisi.value = "";
      dosyaGirisi.classList.add("gizli");
      urlGirisi.value = "";
      urlGirisi.classList.add("gizli");
    },
  };
}

async function medyaYukleVeUrlAl(dosya) {
  const uzanti = dosya.name.split(".").pop();
  const yol = `${crypto.randomUUID()}.${uzanti}`;
  const { error } = await supabaseClient.storage.from("madde-dosyalari").upload(yol, dosya);
  if (error) throw error;
  const { data } = supabaseClient.storage.from("madde-dosyalari").getPublicUrl(yol);
  return data.publicUrl;
}
