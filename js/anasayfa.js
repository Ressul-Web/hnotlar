const kullanici = oturumGerekli();

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

let aktifProjeId = null;
let aktifRevizyonId = null;

const projeListesiGorunumu = document.getElementById("projeListesiGorunumu");
const revizyonListesiGorunumu = document.getElementById("revizyonListesiGorunumu");
const maddeListesiGorunumu = document.getElementById("maddeListesiGorunumu");

// ============================================================
// PROJELER
// ============================================================
async function projeleriYukle() {
  const projeler = await rpc("kullanici_projelerini_getir", { p_token: kullanici.oturum_token });
  const liste = document.getElementById("projeListesi");
  liste.innerHTML = "";
  if (!projeler || projeler.length === 0) {
    liste.innerHTML = '<p class="bos-mesaj">Sana atanmış bir proje yok.</p>';
    return;
  }
  projeler.forEach((proje) => {
    const kart = document.createElement("div");
    kart.className = "kart tiklanabilir";
    kart.innerHTML = `
      <h3>${kacir(proje.ad)}</h3>
      <p>${kacir(proje.aciklama || "")}</p>
      <div class="kart-alt-bilgi"><span>${proje.revizyon_sayisi} revizyon</span></div>
    `;
    kart.addEventListener("click", () => revizyonListesineGit(proje));
    liste.appendChild(kart);
  });
}

async function revizyonListesineGit(proje) {
  aktifProjeId = proje.id;
  projeListesiGorunumu.classList.add("gizli");
  maddeListesiGorunumu.classList.add("gizli");
  revizyonListesiGorunumu.classList.remove("gizli");

  document.getElementById("revizyonListesiBaslik").textContent = proje.ad;
  document.getElementById("revizyonListesiAciklama").textContent = proje.aciklama || "";

  await revizyonlariYukle();
}

document.getElementById("projeyeGeriDonButonu").addEventListener("click", () => {
  revizyonListesiGorunumu.classList.add("gizli");
  projeListesiGorunumu.classList.remove("gizli");
  aktifProjeId = null;
  projeleriYukle();
});

// ============================================================
// REVIZYONLAR
// ============================================================
async function revizyonlariYukle() {
  const revizyonlar = await rpc("kullanici_revizyonlari_getir", {
    p_token: kullanici.oturum_token,
    p_proje_id: aktifProjeId,
  });
  const liste = document.getElementById("revizyonListesi");
  liste.innerHTML = "";
  if (!revizyonlar || revizyonlar.length === 0) {
    liste.innerHTML = '<p class="bos-mesaj">Henüz revizyon gönderilmemiş.</p>';
    return;
  }
  revizyonlar.forEach((rev) => {
    const kart = document.createElement("div");
    kart.className = "kart tiklanabilir";
    kart.innerHTML = `
      <h3>${kacir(rev.baslik)}</h3>
      <p>${kacir(rev.aciklama || "")}</p>
      <div class="kart-alt-bilgi">
        <span>${rev.tamamlanan_madde_sayisi}/${rev.madde_sayisi} madde tamamlandı</span>
        ${
          rev.revizyon_tamamlandi
            ? '<span class="durum-etiket yapildi">Revizyon Tamamlandı</span>'
            : '<span class="durum-etiket beklemede">Devam Ediyor</span>'
        }
      </div>
    `;
    kart.addEventListener("click", () => maddeListesineGit(rev));
    liste.appendChild(kart);
  });
}

async function maddeListesineGit(rev) {
  aktifRevizyonId = rev.id;
  revizyonListesiGorunumu.classList.add("gizli");
  maddeListesiGorunumu.classList.remove("gizli");

  document.getElementById("maddeListesiBaslik").textContent = rev.baslik;
  document.getElementById("maddeListesiAciklama").textContent = rev.aciklama || "";
  revizyonTamamlandiButonuGuncelle(rev.revizyon_tamamlandi);

  await maddeleriYukle();
}

document.getElementById("revizyonaGeriDonButonu").addEventListener("click", () => {
  maddeListesiGorunumu.classList.add("gizli");
  revizyonListesiGorunumu.classList.remove("gizli");
  aktifRevizyonId = null;
  revizyonlariYukle();
});

let revizyonTamamlandiMi = false;

function revizyonTamamlandiButonuGuncelle(tamamlandi) {
  revizyonTamamlandiMi = tamamlandi;
  const buton = document.getElementById("revizyonTamamlaButonu");
  buton.textContent = tamamlandi ? "Tamamlandı İşaretini Kaldır" : "Revizyonu Tamamlandı İşaretle";
  buton.classList.toggle("ikincil-buton", tamamlandi);
  buton.classList.toggle("birincil-buton", !tamamlandi);
}

document.getElementById("revizyonTamamlaButonu").addEventListener("click", async () => {
  await rpc("revizyon_isaretle", {
    p_token: kullanici.oturum_token,
    p_revizyon_id: aktifRevizyonId,
    p_yapildi: !revizyonTamamlandiMi,
  });
  revizyonTamamlandiButonuGuncelle(!revizyonTamamlandiMi);
});

// ============================================================
// MADDELER
// ============================================================
async function maddeleriYukle() {
  const maddeler = await rpc("kullanici_maddeleri_getir", {
    p_token: kullanici.oturum_token,
    p_revizyon_id: aktifRevizyonId,
  });
  const liste = document.getElementById("maddeListesi");
  liste.innerHTML = "";
  if (!maddeler || maddeler.length === 0) {
    liste.innerHTML = '<p class="bos-mesaj">Bu revizyonda henüz madde yok.</p>';
    return;
  }
  maddeler.forEach((madde) => {
    liste.appendChild(maddeKutusuOlustur(madde));
  });
}

function maddeKutusuOlustur(madde) {
  const kutu = document.createElement("div");
  kutu.className = "madde-kutusu";
  kutu.dataset.maddeId = madde.id;

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

  const durum = madde.benim_durumum || { yapildi: false, aciklama: null };

  let yorumHtml = "";
  if (madde.yorumlar && madde.yorumlar.length > 0) {
    yorumHtml = madde.yorumlar
      .map((y) => `<div class="yorum-satiri"><strong>${kacir(y.kullanici_adi)}:</strong> ${kacir(y.yorum)}</div>`)
      .join("");
  }

  kutu.innerHTML = `
    <p class="madde-metin">${kacir(madde.metin)}</p>
    ${medyaHtml}
    <label class="durum-checkbox">
      <input type="checkbox" class="madde-yapildi-kutusu" ${durum.yapildi ? "checked" : ""} />
      Yaptım
    </label>
    <input type="text" class="madde-aciklama-girisi" placeholder="Açıklama (opsiyonel)" value="${kacir(durum.aciklama || "")}" />
    <div class="yorum-listesi">${yorumHtml}</div>
    <div class="yorum-ekle-satiri">
      <input type="text" class="yorum-girisi" placeholder="Anlaşılmayan bir şey mi var? Yorum yaz..." />
      <button class="ikincil-buton yorum-gonder-butonu">Gönder</button>
    </div>
  `;

  const yapildiKutusu = kutu.querySelector(".madde-yapildi-kutusu");
  const aciklamaGirisi = kutu.querySelector(".madde-aciklama-girisi");

  async function durumuKaydet() {
    await rpc("madde_isaretle", {
      p_token: kullanici.oturum_token,
      p_madde_id: madde.id,
      p_yapildi: yapildiKutusu.checked,
      p_aciklama: aciklamaGirisi.value.trim() || null,
    });
  }

  yapildiKutusu.addEventListener("change", durumuKaydet);
  aciklamaGirisi.addEventListener("blur", durumuKaydet);

  kutu.querySelector(".yorum-gonder-butonu").addEventListener("click", async () => {
    const yorumGirisi = kutu.querySelector(".yorum-girisi");
    const yorum = yorumGirisi.value.trim();
    if (!yorum) return;
    await rpc("madde_yorum_ekle", { p_token: kullanici.oturum_token, p_madde_id: madde.id, p_yorum: yorum });
    yorumGirisi.value = "";
    const guncelMadde = (
      await rpc("kullanici_maddeleri_getir", { p_token: kullanici.oturum_token, p_revizyon_id: aktifRevizyonId })
    ).find((m) => m.id === madde.id);
    kutu.replaceWith(maddeKutusuOlustur(guncelMadde));
  });

  return kutu;
}

// ============================================================
// BASLANGIC
// ============================================================
if (kullanici) {
  projeleriYukle();
}
