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

function kacir(metin) {
  const div = document.createElement("div");
  div.textContent = metin == null ? "" : metin;
  return div.innerHTML;
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
let aktifRevizyonId = null;

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
      <div class="kart-baslik-satiri">
        <span class="kart-ikon">${ikonlar.klasor}</span>
        <h3>${kacir(proje.ad)}</h3>
      </div>
      <p>${kacir(proje.aciklama || "")}</p>
      <div class="kart-alt-bilgi">
        <span>${proje.kullanici_sayisi} kullanıcı</span>
        <span>${proje.revizyon_sayisi} revizyon</span>
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
  projeListesiGorunumu.classList.add("gizli");
  revizyonDetayGorunumu.classList.add("gizli");
  projeDetayGorunumu.classList.remove("gizli");

  document.getElementById("projeDetayBaslik").textContent = proje.ad;
  document.getElementById("projeDetayAciklama").textContent = proje.aciklama || "";

  await Promise.all([atananKullanicilariYukle(), atamaIcinKullanicilariYukle(), revizyonlariYukle()]);
}

document.getElementById("projeyeGeriDonButonu").addEventListener("click", () => {
  projeDetayGorunumu.classList.add("gizli");
  projeListesiGorunumu.classList.remove("gizli");
  aktifProjeId = null;
  projeleriYukle();
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
    const etiket = document.createElement("span");
    etiket.className = "etiket";
    etiket.textContent = `${k.ad_soyad} (${k.rol})`;
    kutu.appendChild(etiket);
  });
}

async function atamaIcinKullanicilariYukle() {
  const tumKullanicilar = await rpc("admin_kullanicilari_getir", { p_token: kullanici.oturum_token });
  const secim = document.getElementById("kullaniciAtaSecim");
  secim.innerHTML = "";
  tumKullanicilar
    .filter((k) => k.rol === "personel" || k.rol === "firma" || k.rol === "patron")
    .forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k.id;
      opt.textContent = `${k.ad_soyad} (${k.rol})`;
      secim.appendChild(opt);
    });
}

document.getElementById("kullaniciAtaButonu").addEventListener("click", async () => {
  const secim = document.getElementById("kullaniciAtaSecim");
  if (!secim.value) return;
  await rpc("proje_kullanici_ata", {
    p_token: kullanici.oturum_token,
    p_proje_id: aktifProjeId,
    p_kullanici_id: secim.value,
  });
  atananKullanicilariYukle();
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

    const tamamlayanlar = rev.tamamlayanlar || [];
    const tamamlayanlarHtml = tamamlayanlar
      .map(
        (t) =>
          `<span class="durum-etiket ${t.yapildi ? "yapildi" : "beklemede"}">${kacir(t.kullanici_adi)}: ${
            t.yapildi ? "Tamamladı" : "Bekliyor"
          }</span>`
      )
      .join("");

    kart.innerHTML = `
      <div class="kart-baslik-satiri">
        <span class="kart-ikon">${ikonlar.belge}</span>
        <h3>${kacir(rev.baslik)}</h3>
      </div>
      <p>${kacir(rev.aciklama || "")}</p>
      <div class="kart-alt-bilgi"><span>${rev.madde_sayisi} madde</span></div>
      ${tamamlayanlarHtml ? `<div class="durum-listesi">${tamamlayanlarHtml}</div>` : ""}
    `;
    kart.addEventListener("click", () => revizyonDetayinaGit(rev));
    liste.appendChild(kart);
  });
}

async function revizyonDetayinaGit(rev) {
  aktifRevizyonId = rev.id;
  projeDetayGorunumu.classList.add("gizli");
  revizyonDetayGorunumu.classList.remove("gizli");

  document.getElementById("revizyonDetayBaslik").textContent = rev.baslik;
  document.getElementById("revizyonDetayAciklama").textContent = rev.aciklama || "";

  await maddeleriYukle();
}

document.getElementById("revizyonaGeriDonButonu").addEventListener("click", () => {
  revizyonDetayGorunumu.classList.add("gizli");
  projeDetayGorunumu.classList.remove("gizli");
  aktifRevizyonId = null;
  revizyonlariYukle();
});

document.getElementById("yeniMaddeAcButonu").addEventListener("click", () => {
  document.getElementById("yeniMaddeFormu").classList.toggle("gizli");
});
document.getElementById("yeniMaddeIptalButonu").addEventListener("click", () => {
  document.getElementById("yeniMaddeFormu").classList.add("gizli");
});
document.getElementById("yeniMaddeKaydetButonu").addEventListener("click", async () => {
  const baslik = document.getElementById("yeniMaddeBaslik").value.trim();
  const metin = document.getElementById("yeniMaddeMetin").value.trim();
  const medyaUrl = document.getElementById("yeniMaddeMedyaUrl").value.trim();
  const medyaTipi = document.getElementById("yeniMaddeMedyaTipi").value;
  if (!baslik) return hataGoster("Madde başlığı gerekli.");

  const maddeId = await rpc("madde_ekle", {
    p_token: kullanici.oturum_token,
    p_revizyon_id: aktifRevizyonId,
    p_baslik: baslik,
    p_metin: metin,
    p_sira: 0,
  });

  if (medyaUrl && medyaTipi) {
    await rpc("madde_medya_ekle", {
      p_token: kullanici.oturum_token,
      p_madde_id: maddeId,
      p_medya_url: medyaUrl,
      p_medya_tipi: medyaTipi,
      p_sira: 0,
    });
  }

  document.getElementById("yeniMaddeBaslik").value = "";
  document.getElementById("yeniMaddeMetin").value = "";
  document.getElementById("yeniMaddeMedyaUrl").value = "";
  document.getElementById("yeniMaddeMedyaTipi").value = "";
  document.getElementById("yeniMaddeFormu").classList.add("gizli");
  maddeleriYukle();
});

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
      </span>
    `;
    kart.addEventListener("click", () => maddeDetayModaliAc(madde));
    sarmalayici.appendChild(kart);
  });

  liste.appendChild(sarmalayici);
}

function maddeDetayModaliAc(madde) {
  let medyaHtml = "";
  (madde.medya || []).forEach((m) => {
    if (m.tip === "gorsel") {
      medyaHtml += `<img src="${kacir(m.url)}" class="madde-medya-gorsel" />`;
    } else if (m.tip === "video") {
      medyaHtml += `<video src="${kacir(m.url)}" controls class="madde-medya-video"></video>`;
    } else {
      medyaHtml += `<a href="${kacir(m.url)}" target="_blank" rel="noopener" class="madde-medya-link">Ek dosya</a>`;
    }
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

  modalAc(`
    <h2 class="modal-baslik">${kacir(madde.baslik || madde.metin)}</h2>
    ${
      madde.metin
        ? `<div class="modal-bolum"><p class="modal-metin">${kacir(madde.metin)}</p>${medyaHtml}</div>`
        : medyaHtml
        ? `<div class="modal-bolum">${medyaHtml}</div>`
        : ""
    }
    <div class="modal-bolum">
      <div class="modal-bolum-etiket">${ikonlar.tik} Kim tamamladı</div>
      ${durumHtml}
    </div>
    <div class="modal-bolum">
      <div class="modal-bolum-etiket">${ikonlar.sohbet} Yorumlar / geri bildirim</div>
      ${yorumHtml}
    </div>
  `);
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
document.getElementById("yeniKullaniciRol").addEventListener("change", (e) => {
  const firmaAdiAlani = document.getElementById("yeniKullaniciFirmaAdi");
  firmaAdiAlani.classList.toggle("gizli", e.target.value !== "firma");
  if (e.target.value !== "firma") firmaAdiAlani.value = "";
});
document.getElementById("yeniKullaniciKaydetButonu").addEventListener("click", async () => {
  const kullaniciAdi = document.getElementById("yeniKullaniciAdi").value.trim();
  const sifre = document.getElementById("yeniKullaniciSifre").value;
  const adSoyad = document.getElementById("yeniKullaniciAdSoyad").value.trim();
  const rol = document.getElementById("yeniKullaniciRol").value;
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
