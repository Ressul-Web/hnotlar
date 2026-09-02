function oturumGetir() {
  const raw = sessionStorage.getItem("hnotlar_kullanici");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function girisSayfasinaYonlendir() {
  window.location.href = "index.html";
}

function oturumGerekli(beklenenRol) {
  const kullanici = oturumGetir();
  if (!kullanici || !kullanici.oturum_token) {
    girisSayfasinaYonlendir();
    return null;
  }
  if (beklenenRol && kullanici.rol !== beklenenRol) {
    girisSayfasinaYonlendir();
    return null;
  }
  return kullanici;
}

async function cikisYap() {
  const kullanici = oturumGetir();
  if (kullanici && kullanici.oturum_token) {
    await supabaseClient.rpc("cikis_yap", { p_token: kullanici.oturum_token });
  }
  sessionStorage.removeItem("hnotlar_kullanici");
  girisSayfasinaYonlendir();
}
