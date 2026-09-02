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
      <div class="kart-sol">
        <span class="kart-ikon">${ikonlar.klasor}</span>
        <div class="kart-sol-metin">
          <h3>${kacir(proje.ad)}</h3>
          <p>${kacir(proje.aciklama || "")}</p>
        </div>
      </div>
      <div class="kart-sag">
        <div class="kart-alt-bilgi">
          <span>${proje.revizyon_sayisi} revizyon</span>
          <span>${tarihSaatFormatla(proje.created_at)}</span>
        </div>
        ${sohbetBildirimHtml(proje.sohbet_bildirimi)}
        ${bildirimNoktasiHtml(proje.bildirim)}
      </div>
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

  sohbetOkumaCizgisi = undefined;
  sohbetIlkYukleme = false;
  await Promise.all([revizyonlariYukle(), projeSohbetiniYukle()]);
  sohbetPollingBaslat();
}

document.getElementById("projeyeGeriDonButonu").addEventListener("click", () => {
  revizyonListesiGorunumu.classList.add("gizli");
  projeListesiGorunumu.classList.remove("gizli");
  aktifProjeId = null;
  sohbetPollingDurdur();
  projeleriYukle();
});

// ============================================================
// PROJE SOHBETI
// ============================================================
let sohbetPollingId = null;
let sonMesajlar = [];
let sohbetOkumaCizgisi;
let sohbetIlkYukleme = false;

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
  if (sohbetOkumaCizgisi === undefined) {
    sohbetOkumaCizgisi = await rpc("proje_sohbet_son_gorulme_getir", {
      p_token: kullanici.oturum_token,
      p_proje_id: aktifProjeId,
    });
  }
  rpc("proje_mesaj_gorulme_isaretle", { p_token: kullanici.oturum_token, p_proje_id: aktifProjeId }).catch(() => {});
  sonMesajlar = await rpc("proje_mesajlarini_getir", { p_token: kullanici.oturum_token, p_proje_id: aktifProjeId });

  const kutu = document.getElementById("projeSohbetMesajlari");
  const enAlttaMi = kutu.scrollTop + kutu.clientHeight >= kutu.scrollHeight - 20;

  kutu.innerHTML = "";
  if (!sonMesajlar || sonMesajlar.length === 0) {
    kutu.innerHTML = '<p class="bos-mesaj">Henüz mesaj yok.</p>';
    return;
  }

  const cizgiZamani = sohbetOkumaCizgisi ? new Date(sohbetOkumaCizgisi).getTime() : null;
  let cizgiElementi = null;

  sonMesajlar.forEach((m) => {
    if (
      !cizgiElementi &&
      cizgiZamani !== null &&
      m.kullanici_id !== kullanici.id &&
      new Date(m.created_at).getTime() > cizgiZamani
    ) {
      cizgiElementi = document.createElement("div");
      cizgiElementi.className = "sohbet-okunmadi-cizgisi";
      cizgiElementi.innerHTML = "<span>Yeni mesajlar</span>";
      kutu.appendChild(cizgiElementi);
    }

    const benMi = m.kullanici_id === kullanici.id;
    const renk = benMi ? null : kullaniciRengiAl(m.kullanici_id);
    const baloncuk = document.createElement("div");
    baloncuk.className = `sohbet-baloncuk ${benMi ? "ben" : "diger"}`;
    baloncuk.innerHTML = `
      <span class="sohbet-gonderen" ${renk ? `style="color:${renk}"` : ""}>${benMi ? "Sen" : kacir(m.ad_soyad)}</span>
      <span class="sohbet-metin" ${renk ? `style="border-left:3px solid ${renk}"` : ""}>${kacir(m.mesaj)}</span>
      <span class="sohbet-zaman">${tarihSaatFormatla(m.created_at)}</span>
    `;
    kutu.appendChild(baloncuk);
  });

  if (!sohbetIlkYukleme) {
    sohbetIlkYukleme = true;
    if (cizgiElementi) {
      cizgiElementi.scrollIntoView({ block: "center" });
    } else {
      kutu.scrollTop = kutu.scrollHeight;
    }
  } else if (enAlttaMi) {
    kutu.scrollTop = kutu.scrollHeight;
  }
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
      <div class="kart-sol">
        <span class="kart-ikon">${ikonlar.belge}</span>
        <div class="kart-sol-metin">
          <h3>${kacir(rev.baslik)}</h3>
          <p>${kacir(rev.aciklama || "")}</p>
        </div>
      </div>
      <div class="kart-sag">
        <div class="kart-alt-bilgi">
          <span>${rev.tamamlanan_madde_sayisi}/${rev.madde_sayisi} madde tamamlandı</span>
          ${
            rev.revizyon_tamamlandi
              ? '<span class="durum-etiket yapildi">Revizyon Tamamlandı</span>'
              : '<span class="durum-etiket beklemede">Devam Ediyor</span>'
          }
          <span>${tarihSaatFormatla(rev.created_at)}</span>
        </div>
        ${bildirimNoktasiHtml(rev.bildirim)}
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
  buton.innerHTML = tamamlandi
    ? `${ikonlar.tik} Tamamlandı İşaretini Kaldır`
    : `${ikonlar.tik} Revizyonu Tamamlandı İşaretle`;
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

  const sarmalayici = document.createElement("div");
  sarmalayici.className = "madde-kart-listesi";

  maddeler.forEach((madde) => {
    const durum = madde.benim_durumum || { yapildi: false, aciklama: null };
    const kart = document.createElement("div");
    kart.className = "madde-kart";
    kart.innerHTML = `
      <span class="madde-kart-baslik">${kacir(madde.baslik || madde.metin)}</span>
      <span class="madde-kart-sag">
        ${
          madde.yorumlar && madde.yorumlar.length > 0
            ? `<span class="durum-etiket">${ikonlar.sohbet} ${madde.yorumlar.length}</span>`
            : ""
        }
        <span class="durum-etiket ${durum.yapildi ? "yapildi" : "beklemede"}">${durum.yapildi ? "Yapıldı" : "Bekliyor"}</span>
        <span class="sohbet-zaman">${tarihSaatFormatla(madde.created_at)}</span>
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
    medyaHtml += medyaOnizlemeHtml(m);
  });

  const durum = madde.benim_durumum || { yapildi: false, aciklama: null };

  let yorumHtml = '<p class="bos-mesaj">Henüz yorum yok.</p>';
  if (madde.yorumlar && madde.yorumlar.length > 0) {
    yorumHtml = madde.yorumlar
      .map(
        (y) =>
          `<div class="yorum-satiri"><strong>${kacir(y.kullanici_adi)}:</strong> ${kacir(y.yorum)} <span class="sohbet-zaman">${tarihSaatFormatla(
            y.tarih
          )}</span></div>`
      )
      .join("");
  }

  const icerik = modalAc(`
    <h2 class="modal-baslik">${kacir(madde.baslik || madde.metin)}</h2>
    ${madde.metin ? `<div class="modal-bolum"><p class="modal-metin">${kacir(madde.metin)}</p>${medyaHtml}</div>` : medyaHtml}

    <div class="modal-bolum">
      <div class="modal-bolum-etiket">Açıklama</div>
      <input type="text" class="madde-aciklama-girisi" placeholder="İstersen açıklama ekle (opsiyonel)" value="${kacir(
        durum.aciklama || ""
      )}" />
    </div>

    <div class="modal-bolum">
      <button class="birincil-buton yapildi-buton ${durum.yapildi ? "aktif" : ""}">
        ${ikonlar.tik} ${durum.yapildi ? "Yapıldı Olarak İşaretlendi" : "Yaptım"}
      </button>
    </div>

    <div class="modal-bolum">
      <div class="modal-bolum-etiket">${ikonlar.sohbet} Anlaşılmayan bir şey var mı?</div>
      <div class="yorum-listesi">${yorumHtml}</div>
      <div class="yorum-ekle-satiri">
        <input type="text" class="yorum-girisi" placeholder="Sorunu ya da geri bildirimini yaz..." />
        <button class="ikincil-buton yorum-gonder-butonu">Gönder</button>
      </div>
    </div>
  `);

  const aciklamaGirisi = icerik.querySelector(".madde-aciklama-girisi");
  const yapildiButonu = icerik.querySelector(".yapildi-buton");
  let yapildiMi = durum.yapildi;

  async function durumuKaydet() {
    await rpc("madde_isaretle", {
      p_token: kullanici.oturum_token,
      p_madde_id: madde.id,
      p_yapildi: yapildiMi,
      p_aciklama: aciklamaGirisi.value.trim() || null,
    });
  }

  aciklamaGirisi.addEventListener("blur", durumuKaydet);

  yapildiButonu.addEventListener("click", async () => {
    yapildiMi = !yapildiMi;
    yapildiButonu.classList.toggle("aktif", yapildiMi);
    yapildiButonu.innerHTML = `${ikonlar.tik} ${yapildiMi ? "Yapıldı Olarak İşaretlendi" : "Yaptım"}`;
    await durumuKaydet();
    await rpc("madde_gorulme_isaretle", { p_token: kullanici.oturum_token, p_madde_id: madde.id });
    maddeleriYukle();
    revizyonlariYukle();
  });

  icerik.querySelector(".yorum-gonder-butonu").addEventListener("click", async () => {
    const yorumGirisi = icerik.querySelector(".yorum-girisi");
    const yorum = yorumGirisi.value.trim();
    if (!yorum) return;
    await rpc("madde_yorum_ekle", { p_token: kullanici.oturum_token, p_madde_id: madde.id, p_yorum: yorum });
    await rpc("madde_gorulme_isaretle", { p_token: kullanici.oturum_token, p_madde_id: madde.id });
    yorumGirisi.value = "";
    const guncelMadde = (
      await rpc("kullanici_maddeleri_getir", { p_token: kullanici.oturum_token, p_revizyon_id: aktifRevizyonId })
    ).find((m) => m.id === madde.id);
    maddeleriYukle();
    maddeDetayModaliAc(guncelMadde);
  });
}

// ============================================================
// BASLANGIC
// ============================================================
if (kullanici) {
  projeleriYukle();
}
