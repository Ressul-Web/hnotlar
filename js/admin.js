const kullanici = oturumGerekli("admin");

if (kullanici) {
  document.getElementById("girisYapanAdSoyad").textContent = kullanici.ad_soyad;
  document.getElementById("cikisButonu").addEventListener("click", cikisYap);
}

const genelHataMesaji = document.getElementById("genelHataMesaji");

function hataGoster(mesaj) {
  genelHataMesaji.textContent = mesaj;
  genelHataMesaji.classList.remove("gizli");
  setTimeout(() => genelHataMesaji.classList.add("gizli"), 4000);
}

function bildirimNoktasiHtml(bildirim) {
  return bildirim ? `<span class="bildirim-noktasi ${bildirim}"></span>` : "";
}

async function rpc(fonksiyonAdi, parametreler) {
  const { data, error } = await supabaseClient.rpc(fonksiyonAdi, parametreler);
  if (error) {
    hataGoster("Bir hata oluştu: " + error.message);
    throw error;
  }
  return data;
}

// ============================================================
// SEKME GECISLERI
// ============================================================
const tabButonlari = document.querySelectorAll(".tab-buton");
const tabPanelleri = document.querySelectorAll(".tab-panel");

tabButonlari.forEach((buton) => {
  buton.addEventListener("click", () => {
    tabButonlari.forEach((b) => b.classList.remove("aktif"));
    tabPanelleri.forEach((p) => p.classList.remove("aktif"));
    buton.classList.add("aktif");
    document.getElementById("tab-" + buton.dataset.tab).classList.add("aktif");
  });
});

// ============================================================
// PROJELER
// ============================================================
let aktifProjeId = null;
let aktifProje = null;
let aktifRevizyonId = null;
let aktifRevizyon = null;

const projeListesiGorunumu = document.getElementById("projeListesiGorunumu");
const projeDetayGorunumu = document.getElementById("projeDetayGorunumu");
const revizyonDetayGorunumu = document.getElementById("revizyonDetayGorunumu");

async function projeleriYukle() {
  const projeler = await rpc("admin_projeleri_getir", { p_token: kullanici.oturum_token });
  const liste = document.getElementById("projeListesi");
  liste.innerHTML = "";
  if (!projeler || projeler.length === 0) {
    liste.innerHTML = '<p class="bos-mesaj">Henüz proje yok.</p>';
    return;
  }
  projeler.forEach((proje) => {
    const kart = document.createElement("div");
    kart.className = "kart tiklanabilir";
    kart.innerHTML = `
      <div class="kart-sol">
        <span class="kart-ikon">${ikonlar.klasor}</span>
        <div class="kart-sol-metin">
          <h3>${kacir(proje.ad)}</h3>
          <p>${kacir(proje.aciklama || "")}</p>
        </div>
      </div>
      <div class="kart-sag">
        <div class="kart-alt-bilgi">
          <span>${proje.kullanici_sayisi} kullanıcı</span>
          <span>${proje.revizyon_sayisi} revizyon</span>
        </div>
        ${bildirimNoktasiHtml(proje.bildirim)}
      </div>
    `;
    kart.addEventListener("click", () => projeDetayinaGit(proje));
    liste.appendChild(kart);
  });
}

document.getElementById("yeniProjeAcButonu").addEventListener("click", () => {
  document.getElementById("yeniProjeFormu").classList.toggle("gizli");
});
document.getElementById("yeniProjeIptalButonu").addEventListener("click", () => {
  document.getElementById("yeniProjeFormu").classList.add("gizli");
});
document.getElementById("yeniProjeKaydetButonu").addEventListener("click", async () => {
  const ad = document.getElementById("yeniProjeAd").value.trim();
  const aciklama = document.getElementById("yeniProjeAciklama").value.trim();
  if (!ad) return hataGoster("Proje adı gerekli.");
  await rpc("proje_olustur", { p_token: kullanici.oturum_token, p_ad: ad, p_aciklama: aciklama || null });
  document.getElementById("yeniProjeAd").value = "";
  document.getElementById("yeniProjeAciklama").value = "";
  document.getElementById("yeniProjeFormu").classList.add("gizli");
  projeleriYukle();
});

async function projeDetayinaGit(proje) {
  aktifProjeId = proje.id;
  aktifProje = proje;
  projeListesiGorunumu.classList.add("gizli");
  revizyonDetayGorunumu.classList.add("gizli");
  projeDetayGorunumu.classList.remove("gizli");

  document.getElementById("projeDetayBaslik").textContent = proje.ad;
  document.getElementById("projeDetayAciklama").textContent = proje.aciklama || "";

  await Promise.all([atananKullanicilariYukle(), atamaIcinKullanicilariYukle(), revizyonlariYukle(), projeSohbetiniYukle()]);
  sohbetPollingBaslat();
}

document.getElementById("projeyeGeriDonButonu").addEventListener("click", () => {
  projeDetayGorunumu.classList.add("gizli");
  projeListesiGorunumu.classList.remove("gizli");
  aktifProjeId = null;
  sohbetPollingDurdur();
  projeleriYukle();
});

// ============================================================
// PROJE SOHBETI
// ============================================================
let sohbetPollingId = null;

function sohbetPollingBaslat() {
  sohbetPollingDurdur();
  sohbetPollingId = setInterval(projeSohbetiniYukle, 5000);
}

function sohbetPollingDurdur() {
  if (sohbetPollingId) {
    clearInterval(sohbetPollingId);
    sohbetPollingId = null;
  }
}

async function projeSohbetiniYukle() {
  const mesajlar = await rpc("proje_mesajlarini_getir", { p_token: kullanici.oturum_token, p_proje_id: aktifProjeId });
  const kutu = document.getElementById("projeSohbetMesajlari");
  const enAlttaMi = kutu.scrollTop + kutu.clientHeight >= kutu.scrollHeight - 20;

  kutu.innerHTML = "";
  if (!mesajlar || mesajlar.length === 0) {
    kutu.innerHTML = '<p class="bos-mesaj">Henüz mesaj yok.</p>';
    return;
  }
  mesajlar.forEach((m) => {
    const benMi = m.kullanici_id === kullanici.id;
    const baloncuk = document.createElement("div");
    baloncuk.className = `sohbet-baloncuk ${benMi ? "ben" : "diger"}`;
    baloncuk.innerHTML = `
      <span class="sohbet-gonderen">${benMi ? "Sen" : kacir(m.ad_soyad)}</span>
      <span class="sohbet-metin">${kacir(m.mesaj)}</span>
    `;
    kutu.appendChild(baloncuk);
  });

  if (enAlttaMi) kutu.scrollTop = kutu.scrollHeight;
}

document.getElementById("projeSohbetGonderButonu").addEventListener("click", async () => {
  const girisi = document.getElementById("projeSohbetGirisi");
  const mesaj = girisi.value.trim();
  if (!mesaj) return;
  girisi.value = "";
  await rpc("proje_mesaj_gonder", { p_token: kullanici.oturum_token, p_proje_id: aktifProjeId, p_mesaj: mesaj });
  await projeSohbetiniYukle();
  const kutu = document.getElementById("projeSohbetMesajlari");
  kutu.scrollTop = kutu.scrollHeight;
});

document.getElementById("projeSohbetGirisi").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("projeSohbetGonderButonu").click();
  }
});

document.getElementById("projeDuzenleButonu").addEventListener("click", () => {
  const icerik = modalAc(`
    <h2 class="modal-baslik">Projeyi Düzenle</h2>
    <div class="modal-bolum" style="display:flex; flex-direction:column; gap:10px;">
      <input type="text" id="duzenleProjeAd" value="${kacir(aktifProje.ad)}" placeholder="Proje adı" />
      <textarea id="duzenleProjeAciklama" placeholder="Açıklama (opsiyonel)">${kacir(aktifProje.aciklama || "")}</textarea>
      <div class="form-buton-satiri">
        <button class="birincil-buton" id="duzenleProjeKaydetButonu">Kaydet</button>
        <button class="ikincil-buton" id="duzenleProjeIptalButonu">Vazgeç</button>
      </div>
    </div>
  `);
  icerik.querySelector("#duzenleProjeIptalButonu").addEventListener("click", modalKapat);
  icerik.querySelector("#duzenleProjeKaydetButonu").addEventListener("click", () => {
    const ad = icerik.querySelector("#duzenleProjeAd").value.trim();
    const aciklama = icerik.querySelector("#duzenleProjeAciklama").value.trim();
    if (!ad) return hataGoster("Proje adı gerekli.");
    modalOnayAc("Proje bilgilerini güncellemek istediğine emin misin?", "Kaydet", async () => {
      await rpc("proje_guncelle", { p_token: kullanici.oturum_token, p_proje_id: aktifProjeId, p_ad: ad, p_aciklama: aciklama || null });
      aktifProje.ad = ad;
      aktifProje.aciklama = aciklama;
      document.getElementById("projeDetayBaslik").textContent = ad;
      document.getElementById("projeDetayAciklama").textContent = aciklama || "";
    });
  });
});

document.getElementById("projeSilButonu").addEventListener("click", () => {
  modalOnayAc(
    `"${kacir(aktifProje.ad)}" projesini silmek istediğine emin misin? İçindeki tüm revizyonlar ve maddeler de silinecek.`,
    "Projeyi Sil",
    async () => {
      await rpc("proje_sil", { p_token: kullanici.oturum_token, p_proje_id: aktifProjeId });
      document.getElementById("projeyeGeriDonButonu").click();
    }
  );
});

async function atananKullanicilariYukle() {
  const kullanicilar = await rpc("admin_proje_kullanicilari_getir", {
    p_token: kullanici.oturum_token,
    p_proje_id: aktifProjeId,
  });
  const kutu = document.getElementById("atananKullanicilar");
  kutu.innerHTML = "";
  if (!kullanicilar || kullanicilar.length === 0) {
    kutu.innerHTML = '<p class="bos-mesaj">Henüz kimse atanmadı.</p>';
    return;
  }
  kullanicilar.forEach((k) => {
    const satir = document.createElement("div");
    satir.className = "atanan-satir";
    satir.innerHTML = `
      <span class="atanan-satir-sol">${kacir(k.ad_soyad)} <span class="atanan-rol-etiket">${kacir(k.rol)}</span></span>
      <button class="atanan-cikar-buton" title="Projeden çıkar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;
    satir.querySelector(".atanan-cikar-buton").addEventListener("click", async () => {
      await rpc("proje_kullanici_cikar", {
        p_token: kullanici.oturum_token,
        p_proje_id: aktifProjeId,
        p_kullanici_id: k.kullanici_id,
      });
      atananKullanicilariYukle();
      atamaIcinKullanicilariYukle();
    });
    kutu.appendChild(satir);
  });
}

const kullaniciAtaSecici = ozelSecimOlustur([{ deger: "", etiket: "Kullanıcı yok" }]);
document.getElementById("kullaniciAtaSecimAlani").appendChild(kullaniciAtaSecici.element);

async function atamaIcinKullanicilariYukle() {
  const tumKullanicilar = await rpc("admin_kullanicilari_getir", { p_token: kullanici.oturum_token });
  const atananlar = await rpc("admin_proje_kullanicilari_getir", { p_token: kullanici.oturum_token, p_proje_id: aktifProjeId });
  const atananIdler = new Set((atananlar || []).map((a) => a.kullanici_id));

  const secenekler = tumKullanicilar
    .filter((k) => (k.rol === "personel" || k.rol === "firma" || k.rol === "patron") && !atananIdler.has(k.id))
    .map((k) => ({ deger: k.id, etiket: `${k.ad_soyad} (${k.rol})` }));

  kullaniciAtaSecici.setSecenekler(secenekler.length > 0 ? secenekler : [{ deger: "", etiket: "Atanacak kimse yok" }]);
}

document.getElementById("kullaniciAtaButonu").addEventListener("click", async () => {
  const secilenId = kullaniciAtaSecici.getDeger();
  if (!secilenId) return;
  await rpc("proje_kullanici_ata", {
    p_token: kullanici.oturum_token,
    p_proje_id: aktifProjeId,
    p_kullanici_id: secilenId,
  });
  atananKullanicilariYukle();
  atamaIcinKullanicilariYukle();
});

document.getElementById("yeniRevizyonAcButonu").addEventListener("click", () => {
  document.getElementById("yeniRevizyonFormu").classList.toggle("gizli");
});
document.getElementById("yeniRevizyonIptalButonu").addEventListener("click", () => {
  document.getElementById("yeniRevizyonFormu").classList.add("gizli");
});
document.getElementById("yeniRevizyonKaydetButonu").addEventListener("click", async () => {
  const baslik = document.getElementById("yeniRevizyonBaslik").value.trim();
  const aciklama = document.getElementById("yeniRevizyonAciklama").value.trim();
  if (!baslik) return hataGoster("Revizyon başlığı gerekli.");
  await rpc("revizyon_olustur", {
    p_token: kullanici.oturum_token,
    p_proje_id: aktifProjeId,
    p_baslik: baslik,
    p_aciklama: aciklama || null,
  });
  document.getElementById("yeniRevizyonBaslik").value = "";
  document.getElementById("yeniRevizyonAciklama").value = "";
  document.getElementById("yeniRevizyonFormu").classList.add("gizli");
  revizyonlariYukle();
});

async function revizyonlariYukle() {
  const revizyonlar = await rpc("admin_revizyonlari_getir", {
    p_token: kullanici.oturum_token,
    p_proje_id: aktifProjeId,
  });
  const liste = document.getElementById("revizyonListesi");
  liste.innerHTML = "";
  if (!revizyonlar || revizyonlar.length === 0) {
    liste.innerHTML = '<p class="bos-mesaj">Henüz revizyon yok.</p>';
    return;
  }
  revizyonlar.forEach((rev) => {
    const kart = document.createElement("div");
    kart.className = "kart tiklanabilir";

    kart.innerHTML = `
      <div class="kart-sol">
        <span class="kart-ikon">${ikonlar.belge}</span>
        <div class="kart-sol-metin">
          <h3>${kacir(rev.baslik)}</h3>
          <p>${kacir(rev.aciklama || "")}</p>
        </div>
      </div>
      <div class="kart-sag">
        <div class="kart-alt-bilgi">
          <span>${rev.madde_sayisi} madde</span>
          <span>${rev.yayinda ? "Yayında" : "Taslak"}</span>
        </div>
        ${bildirimNoktasiHtml(rev.bildirim)}
      </div>
    `;
    kart.addEventListener("click", () => revizyonDetayinaGit(rev));
    liste.appendChild(kart);
  });
}

async function revizyonDetayinaGit(rev) {
  aktifRevizyonId = rev.id;
  aktifRevizyon = rev;
  projeDetayGorunumu.classList.add("gizli");
  revizyonDetayGorunumu.classList.remove("gizli");

  document.getElementById("revizyonDetayBaslik").textContent = rev.baslik;
  document.getElementById("revizyonDetayAciklama").textContent = rev.aciklama || "";
  document.getElementById("revizyonYayinAnahtari").checked = rev.yayinda;

  await maddeleriYukle();
}

document.getElementById("revizyonaGeriDonButonu").addEventListener("click", () => {
  revizyonDetayGorunumu.classList.add("gizli");
  projeDetayGorunumu.classList.remove("gizli");
  aktifRevizyonId = null;
  revizyonlariYukle();
});

document.getElementById("revizyonYayinAnahtari").addEventListener("change", async (e) => {
  await rpc("revizyon_yayinla", { p_token: kullanici.oturum_token, p_revizyon_id: aktifRevizyonId, p_yayinda: e.target.checked });
  aktifRevizyon.yayinda = e.target.checked;
});

document.getElementById("revizyonDuzenleButonu").addEventListener("click", () => {
  const icerik = modalAc(`
    <h2 class="modal-baslik">Revizyonu Düzenle</h2>
    <div class="modal-bolum" style="display:flex; flex-direction:column; gap:10px;">
      <input type="text" id="duzenleRevizyonBaslik" value="${kacir(aktifRevizyon.baslik)}" placeholder="Revizyon başlığı" />
      <textarea id="duzenleRevizyonAciklama" placeholder="Açıklama (opsiyonel)">${kacir(aktifRevizyon.aciklama || "")}</textarea>
      <div class="form-buton-satiri">
        <button class="birincil-buton" id="duzenleRevizyonKaydetButonu">Kaydet</button>
        <button class="ikincil-buton" id="duzenleRevizyonIptalButonu">Vazgeç</button>
      </div>
    </div>
  `);
  icerik.querySelector("#duzenleRevizyonIptalButonu").addEventListener("click", modalKapat);
  icerik.querySelector("#duzenleRevizyonKaydetButonu").addEventListener("click", () => {
    const baslik = icerik.querySelector("#duzenleRevizyonBaslik").value.trim();
    const aciklama = icerik.querySelector("#duzenleRevizyonAciklama").value.trim();
    if (!baslik) return hataGoster("Revizyon başlığı gerekli.");
    modalOnayAc("Revizyon bilgilerini güncellemek istediğine emin misin?", "Kaydet", async () => {
      await rpc("revizyon_guncelle", {
        p_token: kullanici.oturum_token,
        p_revizyon_id: aktifRevizyonId,
        p_baslik: baslik,
        p_aciklama: aciklama || null,
      });
      aktifRevizyon.baslik = baslik;
      aktifRevizyon.aciklama = aciklama;
      document.getElementById("revizyonDetayBaslik").textContent = baslik;
      document.getElementById("revizyonDetayAciklama").textContent = aciklama || "";
    });
  });
});

document.getElementById("revizyonSilButonu").addEventListener("click", () => {
  modalOnayAc(
    `"${kacir(aktifRevizyon.baslik)}" revizyonunu silmek istediğine emin misin? İçindeki tüm maddeler de silinecek.`,
    "Revizyonu Sil",
    async () => {
      await rpc("revizyon_sil", { p_token: kullanici.oturum_token, p_revizyon_id: aktifRevizyonId });
      document.getElementById("revizyonaGeriDonButonu").click();
    }
  );
});

const yeniMaddeMedyaSecici = medyaSeciciOlustur();
document.getElementById("yeniMaddeMedyaAlani").appendChild(yeniMaddeMedyaSecici.element);

document.getElementById("yeniMaddeAcButonu").addEventListener("click", () => {
  document.getElementById("yeniMaddeFormu").classList.toggle("gizli");
});
document.getElementById("yeniMaddeIptalButonu").addEventListener("click", () => {
  document.getElementById("yeniMaddeFormu").classList.add("gizli");
});
document.getElementById("yeniMaddeKaydetButonu").addEventListener("click", async () => {
  const baslik = document.getElementById("yeniMaddeBaslik").value.trim();
  const metin = document.getElementById("yeniMaddeMetin").value.trim();
  const medyaTipi = yeniMaddeMedyaSecici.getSeciliTipi();
  const medyaDosya = yeniMaddeMedyaSecici.getDosya();
  const medyaUrl = yeniMaddeMedyaSecici.getUrl();

  if (!baslik) return hataGoster("Madde başlığı gerekli.");

  const maddeId = await rpc("madde_ekle", {
    p_token: kullanici.oturum_token,
    p_revizyon_id: aktifRevizyonId,
    p_baslik: baslik,
    p_metin: metin,
    p_sira: 0,
  });

  await medyaKaydetVeEkle(maddeId, medyaTipi, medyaDosya, medyaUrl);

  document.getElementById("yeniMaddeBaslik").value = "";
  document.getElementById("yeniMaddeMetin").value = "";
  yeniMaddeMedyaSecici.sifirla();
  document.getElementById("yeniMaddeFormu").classList.add("gizli");
  maddeleriYukle();
});

async function medyaKaydetVeEkle(maddeId, medyaTipi, dosya, url) {
  if (!medyaTipi) return;

  let medyaUrl = url;
  if (medyaTipi !== "url") {
    if (!dosya) return;
    try {
      medyaUrl = await medyaYukleVeUrlAl(dosya);
    } catch (e) {
      hataGoster("Dosya yüklenemedi: " + e.message);
      return;
    }
  } else if (!url) {
    return;
  }

  await rpc("madde_medya_ekle", {
    p_token: kullanici.oturum_token,
    p_madde_id: maddeId,
    p_medya_url: medyaUrl,
    p_medya_tipi: medyaTipi,
    p_sira: 0,
  });
}

async function maddeleriYukle() {
  const maddeler = await rpc("admin_maddeleri_getir", {
    p_token: kullanici.oturum_token,
    p_revizyon_id: aktifRevizyonId,
  });
  const liste = document.getElementById("maddeListesi");
  liste.innerHTML = "";
  if (!maddeler || maddeler.length === 0) {
    liste.innerHTML = '<p class="bos-mesaj">Henüz madde yok.</p>';
    return;
  }

  const sarmalayici = document.createElement("div");
  sarmalayici.className = "madde-kart-listesi";

  maddeler.forEach((madde) => {
    const tamamlananSayisi = (madde.durumlar || []).filter((d) => d.yapildi).length;
    const toplamKullanici = (madde.durumlar || []).length;

    const kart = document.createElement("div");
    kart.className = "madde-kart";
    kart.innerHTML = `
      <span class="madde-kart-baslik">${kacir(madde.baslik || madde.metin)}</span>
      <span class="madde-kart-sag">
        ${
          toplamKullanici > 0
            ? `<span class="durum-etiket ${tamamlananSayisi === toplamKullanici ? "yapildi" : "beklemede"}">${tamamlananSayisi}/${toplamKullanici} tamamladı</span>`
            : '<span class="durum-etiket beklemede">Henüz işaretlenmedi</span>'
        }
        ${madde.yorumlar && madde.yorumlar.length > 0 ? `<span class="durum-etiket">${ikonlar.sohbet} ${madde.yorumlar.length}</span>` : ""}
        ${bildirimNoktasiHtml(madde.bildirim)}
      </span>
    `;
    kart.addEventListener("click", () => maddeDetayModaliAc(madde));
    sarmalayici.appendChild(kart);
  });

  liste.appendChild(sarmalayici);
}

function maddeDetayModaliAc(madde) {
  supabaseClient
    .rpc("madde_gorulme_isaretle", { p_token: kullanici.oturum_token, p_madde_id: madde.id })
    .then(() => maddeleriYukle())
    .catch(() => {});

  let medyaHtml = "";
  (madde.medya || []).forEach((m) => {
    medyaHtml += `<div class="medya-satiri" data-medya-id="${m.id}">${medyaOnizlemeHtml(m)}<button class="atanan-cikar-buton medya-sil-butonu" title="Medyayı kaldır"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>`;
  });

  let durumHtml = '<p class="bos-mesaj">Henüz kimse işaretlemedi.</p>';
  if (madde.durumlar && madde.durumlar.length > 0) {
    durumHtml = `<div class="durum-listesi">${madde.durumlar
      .map(
        (d) =>
          `<span class="durum-etiket ${d.yapildi ? "yapildi" : "beklemede"}">${kacir(d.kullanici_adi)}: ${
            d.yapildi ? "Yaptı" : "Bekliyor"
          }${d.aciklama ? " — " + kacir(d.aciklama) : ""}</span>`
      )
      .join("")}</div>`;
  }

  let yorumHtml = '<p class="bos-mesaj">Henüz yorum yok.</p>';
  if (madde.yorumlar && madde.yorumlar.length > 0) {
    yorumHtml = `<div class="yorum-listesi">${madde.yorumlar
      .map((y) => `<div class="yorum-satiri"><strong>${kacir(y.kullanici_adi)}:</strong> ${kacir(y.yorum)}</div>`)
      .join("")}</div>`;
  }

  const icerik = modalAc(`
    <div class="modal-bolum" style="display:flex; flex-direction:column; gap:10px;">
      <input type="text" id="duzenleMaddeBaslik" value="${kacir(madde.baslik || "")}" placeholder="Madde başlığı" />
      <textarea id="duzenleMaddeMetin" placeholder="Madde içeriği">${kacir(madde.metin || "")}</textarea>
    </div>
    <div class="modal-bolum">
      <div class="modal-bolum-etiket">Medya</div>
      <div id="maddeMedyaListesi">${medyaHtml}</div>
      <div id="maddeMedyaEkleAlani"></div>
      <button class="ikincil-buton" id="maddeMedyaEkleButonu" style="margin-top:8px;">${ikonlar.ekle} Medya Ekle</button>
    </div>
    <div class="modal-bolum form-buton-satiri">
      <button class="birincil-buton" id="maddeKaydetButonu">Kaydet</button>
      <button class="tehlike-metin-buton" id="maddeSilButonu">Maddeyi Sil</button>
    </div>
    <div class="modal-bolum">
      <div class="modal-bolum-etiket">${ikonlar.tik} Kim tamamladı</div>
      ${durumHtml}
    </div>
    <div class="modal-bolum">
      <div class="modal-bolum-etiket">${ikonlar.sohbet} Yorumlar / geri bildirim</div>
      ${yorumHtml}
      <div class="yorum-ekle-satiri">
        <input type="text" id="maddeYorumGirisi" placeholder="Yanıt yaz..." />
        <button class="ikincil-buton" id="maddeYorumGonderButonu">Gönder</button>
      </div>
    </div>
  `);

  icerik.querySelectorAll(".medya-sil-butonu").forEach((buton) => {
    buton.addEventListener("click", async () => {
      const satir = buton.closest(".medya-satiri");
      await rpc("madde_medya_sil", { p_token: kullanici.oturum_token, p_medya_id: satir.dataset.medyaId });
      satir.remove();
      maddeleriYukle();
    });
  });

  icerik.querySelector("#maddeMedyaEkleButonu").addEventListener("click", (e) => {
    const buton = e.currentTarget;
    const alan = icerik.querySelector("#maddeMedyaEkleAlani");
    if (alan.childElementCount > 0) {
      alan.innerHTML = "";
      return;
    }
    const secici = medyaSeciciOlustur();
    alan.appendChild(secici.element);
    const kaydetButonu = document.createElement("button");
    kaydetButonu.className = "birincil-buton";
    kaydetButonu.style.marginTop = "8px";
    kaydetButonu.textContent = "Kaydet";
    kaydetButonu.addEventListener("click", async () => {
      await medyaKaydetVeEkle(madde.id, secici.getSeciliTipi(), secici.getDosya(), secici.getUrl());
      modalKapat();
      maddeleriYukle();
    });
    alan.appendChild(kaydetButonu);
  });

  icerik.querySelector("#maddeKaydetButonu").addEventListener("click", () => {
    const baslik = icerik.querySelector("#duzenleMaddeBaslik").value.trim();
    const metin = icerik.querySelector("#duzenleMaddeMetin").value.trim();
    if (!baslik) return hataGoster("Madde başlığı gerekli.");
    modalOnayAc("Madde bilgilerini güncellemek istediğine emin misin?", "Kaydet", async () => {
      await rpc("madde_guncelle", { p_token: kullanici.oturum_token, p_madde_id: madde.id, p_baslik: baslik, p_metin: metin });
      maddeleriYukle();
    });
  });

  icerik.querySelector("#maddeSilButonu").addEventListener("click", () => {
    modalOnayAc(`"${kacir(madde.baslik || "")}" maddesini silmek istediğine emin misin?`, "Maddeyi Sil", async () => {
      await rpc("madde_sil", { p_token: kullanici.oturum_token, p_madde_id: madde.id });
      maddeleriYukle();
    });
  });

  icerik.querySelector("#maddeYorumGonderButonu").addEventListener("click", async () => {
    const girisi = icerik.querySelector("#maddeYorumGirisi");
    const yorum = girisi.value.trim();
    if (!yorum) return;
    await rpc("madde_yorum_ekle", { p_token: kullanici.oturum_token, p_madde_id: madde.id, p_yorum: yorum });
    const guncelMaddeler = await rpc("admin_maddeleri_getir", { p_token: kullanici.oturum_token, p_revizyon_id: aktifRevizyonId });
    const guncelMadde = guncelMaddeler.find((m) => m.id === madde.id);
    maddeleriYukle();
    maddeDetayModaliAc(guncelMadde);
  });
}

// ============================================================
// KULLANICILAR
// ============================================================
async function kullanicilariYukle() {
  const kullanicilar = await rpc("admin_kullanicilari_getir", { p_token: kullanici.oturum_token });
  const kutu = document.getElementById("kullaniciTablo");
  if (!kullanicilar || kullanicilar.length === 0) {
    kutu.innerHTML = '<p class="bos-mesaj">Henüz kullanıcı yok.</p>';
    return;
  }
  let html =
    "<table><thead><tr><th>Kullanıcı Adı</th><th>Ad Soyad</th><th>Rol</th><th>Firma</th><th>Açıklama</th></tr></thead><tbody>";
  kullanicilar.forEach((k) => {
    html += `<tr><td>${kacir(k.kullanici_adi)}</td><td>${kacir(k.ad_soyad)}</td><td>${kacir(k.rol)}</td><td>${kacir(
      k.firma_adi || "-"
    )}</td><td>${kacir(k.aciklama || "-")}</td></tr>`;
  });
  html += "</tbody></table>";
  kutu.innerHTML = html;
}

document.getElementById("yeniKullaniciAcButonu").addEventListener("click", () => {
  document.getElementById("yeniKullaniciFormu").classList.toggle("gizli");
});
document.getElementById("yeniKullaniciIptalButonu").addEventListener("click", () => {
  document.getElementById("yeniKullaniciFormu").classList.add("gizli");
});
const yeniKullaniciRolSecici = ozelSecimOlustur(
  [
    { deger: "personel", etiket: "Personel" },
    { deger: "firma", etiket: "Firma" },
    { deger: "patron", etiket: "Patron" },
    { deger: "admin", etiket: "Admin" },
  ],
  (deger) => {
    const firmaAdiAlani = document.getElementById("yeniKullaniciFirmaAdi");
    firmaAdiAlani.classList.toggle("gizli", deger !== "firma");
    if (deger !== "firma") firmaAdiAlani.value = "";
  }
);
document.getElementById("yeniKullaniciRolAlani").appendChild(yeniKullaniciRolSecici.element);

document.getElementById("yeniKullaniciKaydetButonu").addEventListener("click", async () => {
  const kullaniciAdi = document.getElementById("yeniKullaniciAdi").value.trim();
  const sifre = document.getElementById("yeniKullaniciSifre").value;
  const adSoyad = document.getElementById("yeniKullaniciAdSoyad").value.trim();
  const rol = yeniKullaniciRolSecici.getDeger();
  const firmaAdi = document.getElementById("yeniKullaniciFirmaAdi").value.trim();
  const aciklama = document.getElementById("yeniKullaniciAciklama").value.trim();

  if (!kullaniciAdi || !sifre || !adSoyad) return hataGoster("Tüm alanları doldur.");

  await rpc("kullanici_ekle", {
    p_token: kullanici.oturum_token,
    p_kullanici_adi: kullaniciAdi,
    p_sifre: sifre,
    p_ad_soyad: adSoyad,
    p_rol: rol,
    p_firma_adi: rol === "firma" && firmaAdi ? firmaAdi : null,
    p_aciklama: aciklama || null,
  });

  document.getElementById("yeniKullaniciAdi").value = "";
  document.getElementById("yeniKullaniciSifre").value = "";
  document.getElementById("yeniKullaniciAdSoyad").value = "";
  document.getElementById("yeniKullaniciFirmaAdi").value = "";
  document.getElementById("yeniKullaniciAciklama").value = "";
  document.getElementById("yeniKullaniciFormu").classList.add("gizli");
  kullanicilariYukle();
});

// ============================================================
// BASLANGIC
// ============================================================
if (kullanici) {
  projeleriYukle();
  kullanicilariYukle();
}
